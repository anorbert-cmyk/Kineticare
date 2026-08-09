import { after } from 'next/server'
import type { Payload } from 'payload'

import {
  isUniqueViolation,
  processWebhook,
  webhookEventStore,
  type WebhookEventStore,
} from '../idempotency'
import { logger } from '../logger'
import {
  checkRateLimit,
  getNamedRateLimiter,
  ipRateLimitKey,
  type RateLimiter,
} from '../rate-limit'
import { generateRequestId, getRequestId } from '../request-id'
import { createBarionCallbackProcessor } from './process-callback'

/**
 * POST /api/barion/callback route-handler factory (T-022).
 *
 * A Barion 15 mp-en belül HTTP 200-at vár, különben a retry-lépcsője
 * (2s/6s/18s/54s/102s) újra és újra kézbesít — ezért a handler:
 *
 *  0. RATE-LIMIT (per-IP, 30/perc — a retry-lépcső bőven belefér) és PaymentId
 *     FORMÁTUMvalidáció (Barion GUID-minta + max-hossz) fut MINDEN más előtt:
 *     a callback-flood és a szemét-PaymentId így a webhook-events táblát sem
 *     éri el (blackhat-review: DB-növekedés a hamis callbackoktól).
 *  1. AZONNAL dedupol: a webhook-events-be (provider='barion',
 *     externalId=PaymentId) ír; a (provider, externalId) UNIQUE-ütközés =
 *     már feldolgozva/feldolgozás alatt → 200, no-op.
 *  2. AZONNAL 200-at válaszol — a verifikáció és az állapot-átmenet ASZINKRON
 *     (a handler SOSEM blokkol a GetState-híváson).
 *
 * Az aszinkron feldolgozás két, egymást kiegészítő csatornán fut:
 *  - next/server `after()`: a válasz elküldése UTÁN, ugyanabban a
 *    kérés-életciklusban azonnal lefuttatja a feldolgozást (a Barion a 200-at
 *    már megkapta);
 *  - a T-014 webhook-retry Payload-job (ENABLE_JOB_WORKERS, percenkénti cron):
 *    a 'received'-ben ragadt (pl. process-crash) és 'failed' (GetState-hiba)
 *    eseményeket exponenciális backoff-fal újrafuttatja, MAX_WEBHOOK_ATTEMPTS
 *    után owner-riasztással. A regisztráció a registerBarionWebhookProcessor.
 *
 * Biztonsági elv: a callback-payload önmagában NEM bizonyíték — a jóváhagyás
 * kizárólag a szerver-szerver fetchPaymentState (v4) verifikációval történik
 * (lásd process-callback.ts). Ezért a HAMIS/ismeretlen PaymentId is 200-at
 * kap: az esemény a webhook-events-ben rögzül, a feldolgozó riasztást naplóz,
 * a Barion retry-ja pedig nem pörög feleslegesen egy sosem sikerülő híváson.
 *
 * A nyers callback-bodyt szándékosan NEM tároljuk/naplózzuk — a Barion
 * callback-payloadja a PaymentId-n kívül nem hordoz releváns adatot; a
 * naplózás strukturált, redaktált mezőket használ (PaymentId, státusz,
 * orderNumber, requestId).
 */

export interface BarionCallbackHandlerDeps {
  getPayload: () => Promise<Payload>
  /**
   * Az aszinkron ütemező injektálható (teszteléshez). Alapból next/server
   * `after()` — a válasz elküldése után fut, a kérés életciklusát meghosszabbítva.
   */
  schedule?: (task: () => Promise<void>) => void
  store?: WebhookEventStore
  /** Per-IP rate-limiter injektálható (teszt); alapból a megosztott barionCallback singleton. */
  rateLimiter?: RateLimiter
}

/** A PaymentId kinyerése — hiányzó/üres esetén null (a hívó 400-zal válaszol). */
function extractPaymentId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  // A Barion callback 'PaymentId' kulccsal küld; a kisbetűs alakot is elfogadjuk.
  const raw =
    (body as Record<string, unknown>).PaymentId ?? (body as Record<string, unknown>).paymentId
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * PaymentId FORMÁTUMvalidáció (blackhat-review): a Barion v3/v4 PaymentId
 * GUID — bármi más (túl hosszú, nem GUID karakterek) biztosan hamisítvány,
 * és MÉG a webhook-events írás ELŐTT 400-zal elutasítjuk, hogy a flood ne
 * növeszthesse a táblát szemét-rekordokkal. A max-hossz védőháló: ha a
 * Barion valaha nem-GUID azonosítót vezetne be, a hosszkorlát akkor is
 * megfogja a túlméretezett payloadot.
 */
const BARION_PAYMENT_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const BARION_PAYMENT_ID_MAX_LENGTH = 64

function isValidPaymentIdFormat(paymentId: string): boolean {
  return paymentId.length <= BARION_PAYMENT_ID_MAX_LENGTH && BARION_PAYMENT_ID_PATTERN.test(paymentId)
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status })
}

export function createBarionCallbackHandler(deps: BarionCallbackHandlerDeps) {
  const schedule = deps.schedule ?? ((task: () => Promise<void>) => after(task))
  const rateLimiter = deps.rateLimiter ?? getNamedRateLimiter('barionCallback')

  return async function POST(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'barion-callback' })

    // 0. RATE-LIMIT (per-IP) — a legolcsóbb flood-fal, még a body-parse ELŐTT.
    //    A Barion retry-lépcsője (2s…102s) bőven a 30/perc limit alatt marad.
    const limited = checkRateLimit({ limiter: rateLimiter, key: ipRateLimitKey(request.headers), log })
    if (limited) {
      return limited
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      log.warn('barion-callback: nem JSON törzs — 400')
      return jsonResponse({ ok: false, error: 'A kérés törzse nem értelmezhető JSON.' }, 400)
    }

    const paymentId = extractPaymentId(body)
    if (!paymentId) {
      log.warn('barion-callback: hiányzó vagy üres PaymentId — 400')
      return jsonResponse({ ok: false, error: 'Hiányzó vagy üres PaymentId.' }, 400)
    }
    if (!isValidPaymentIdFormat(paymentId)) {
      // Formátumhiba → 400, MÉG a webhook-events írás ELŐTT (lásd a validátor
      // fejléckommentjét). A Barion sosem küld nem-GUID PaymentId-t, így a
      // valódi kézbesítéseket ez nem érinti.
      log.warn('barion-callback: érvénytelen PaymentId formátum — 400')
      return jsonResponse({ ok: false, error: 'Érvénytelen PaymentId formátum.' }, 400)
    }
    const eventLog = log.child({ paymentId })

    const payload = await deps.getPayload()
    const store = deps.store ?? webhookEventStore(payload)

    const runProcessing = async (): Promise<void> => {
      const outcome = await processWebhook({
        store,
        provider: 'barion',
        externalId: paymentId,
        requestId,
        handler: createBarionCallbackProcessor({ payload, store }),
      })
      if (outcome.kind === 'failed') {
        eventLog.warn('barion-callback: aszinkron feldolgozás sikertelen (retry-job folytatja)', {
          attempts: outcome.attempts,
          retryable: outcome.retryable,
          error: outcome.error,
        })
      }
    }

    // 1. AZONNALI DEDUP — a feldolgozást NEM várjuk meg.
    try {
      const existing = await store.find({
        collection: 'webhook-events',
        where: {
          and: [{ provider: { equals: 'barion' } }, { externalId: { equals: paymentId } }],
        },
        limit: 1,
        overrideAccess: true,
      })
      const record = existing.docs[0]

      if (record && record.status === 'processed') {
        // Már sikeresen feldolgozva → no-op (dupla kézbesítés).
        eventLog.info('barion-callback: duplikált kézbesítés — már feldolgozva, no-op 200')
        return jsonResponse({ ok: true, status: 'duplicate' })
      }

      if (record) {
        // 'received' = feldolgozás már ütemezve/fut (vagy a retry-job viszi);
        // 'failed' = a Barion retry-lépcső újra kézbesítette → azonnali újrapróbálás.
        if (record.status === 'failed') {
          schedule(runProcessing)
        }
        return jsonResponse({ ok: true, status: 'received' })
      }

      try {
        await store.create({
          collection: 'webhook-events',
          data: {
            provider: 'barion',
            externalId: paymentId,
            status: 'received',
            attempts: 0,
            // Csak a kinyert, strukturált mező — a nyers bodyt nem tároljuk.
            payload: { paymentId },
            requestId,
          },
          overrideAccess: true,
        })
      } catch (createError) {
        if (isUniqueViolation(createError)) {
          // Verseny: párhuzamos kézbesítés már rögzítette → no-op 200.
          eventLog.info('barion-callback: versenyhelyzet a dedup-írásnál — no-op 200')
          return jsonResponse({ ok: true, status: 'duplicate' })
        }
        throw createError
      }

      // 2. AZONNALI 200 — a feldolgozás aszinkron (a GetState-re NEM várunk).
      schedule(runProcessing)
      return jsonResponse({ ok: true, status: 'accepted' })
    } catch (error) {
      // Infrastrukturális hiba (DB elérhetetlen): 500, hogy a Barion retry-lépcsője
      // újra kézbesítse — az esemény ilyenkor még NEM rögzült.
      eventLog.error('barion-callback: technikai hiba a dedup során', {
        error: error instanceof Error ? error.message : String(error),
      })
      return jsonResponse(
        { ok: false, error: 'A webhook feldolgozása ideiglenesen nem érhető el.' },
        500,
      )
    }
  }
}

export { registerBarionWebhookProcessor } from './process-callback'
