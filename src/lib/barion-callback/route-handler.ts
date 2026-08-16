import { after } from 'next/server'
import type { Payload } from 'payload'

import {
  isNonTerminalWebhookResult,
  isTerminallyProcessed,
  isUniqueViolation,
  processWebhook,
  webhookEventStore,
  type WebhookEventStore,
} from '../idempotency'
import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import { createBarionCallbackProcessor } from './process-callback'

/**
 * POST /api/barion/callback route-handler factory (T-022).
 *
 * A Barion 15 mp-en belül HTTP 200-at vár, különben a retry-lépcsője
 * (2s/6s/18s/54s/102s) újra és újra kézbesít — ezért a handler:
 *
 *  0. FELOLDJA a PaymentId-t: a Barion a QUERY STRINGBEN küldi
 *     (`CallbackUrl?paymentId=<guid>`), a POST-törzs ÜRES — ezért a query az
 *     elsődleges forrás, a JSON-törzs csak tartalék (üres/nem JSON törzs
 *     önmagában nem hiba).
 *  1. AZONNAL dedupol: a webhook-events-be (provider='barion',
 *     externalId=PaymentId) ír; a (provider, externalId) UNIQUE-ütközés =
 *     már feldolgozva/feldolgozás alatt → 200, no-op. Duplikátumot CSAK a
 *     VÉGLEGESEN lezárt eseményre mond: a függő (pending_repoll) kimenetel után
 *     a következő kézbesítés hozza a végleges státuszt, azt fel KELL dolgozni.
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
 * (lásd process-callback.ts). Ezért a HAMIS/ismeretlen (de ALAKILAG ÉRVÉNYES)
 * PaymentId is 200-at kap: az esemény a webhook-events-ben rögzül, a feldolgozó
 * riasztást naplóz, a Barion retry-ja pedig nem pörög feleslegesen egy sosem
 * sikerülő híváson.
 *
 * ALAK-ELLENŐRZÉS a DB-írás ELŐTT: a végpont szándékosan kimarad a kérés-korlát
 * alól (`classifyRateLimitedRoute` — a fizetési értesítés elvesztése pénzt
 * jelent), tehát bárki korlátlanul hívhatja. Fék nélkül minden hívás EGY új
 * webhook-events sort írna (a tábla korlátlanul nőne) és EGY kimenő Barion
 * GetState-hívást indítana. Ezért a PaymentId-nek GUID-alakúnak kell lennie:
 * ami nem az, az bizonyosan nem a Bariontól jön → 400, még a dedup-írás előtt.
 * Az alakilag helyes, de ismeretlen azonosító útja változatlan (200 + riasztás).
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
}

/**
 * A Barion PaymentId GUID (UUID) alakú — a Barion API-dokumentáció és a
 * gyakorlatban kapott értékek szerint is `8-4-4-4-12` hexadecimális csoport.
 * Kis- és nagybetűs hexet is elfogadunk (a Barion kisbetűset küld, de a
 * GUID-alak önmagában nem kis-nagybetű-érzékeny).
 */
const PAYMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Egy GUID pontosan ennyi karakter — a mintaillesztés előtti olcsó kapu. */
export const MAX_PAYMENT_ID_LENGTH = 36

/**
 * Egy nyers érték ALAK-ellenőrzése — hiányzó, üres, túl hosszú vagy nem
 * GUID-alakú érték esetén null.
 */
function normalizePaymentId(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }
  // Hosszkapu ELŐSZÖR: egy több megabájtos mezőre nem futtatunk mintaillesztést.
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_PAYMENT_ID_LENGTH) {
    return null
  }
  return PAYMENT_ID_PATTERN.test(trimmed) ? trimmed : null
}

/**
 * A PaymentId kinyerése a QUERY STRINGBŐL — ez az ÉLES csatorna.
 *
 * ═══ A HIBA, AMIT BEZÁR (B1) ═══
 * A Barion a callbacket `CallbackUrl?paymentId=<guid>` alakban, ÜRES POST-
 * törzzsel küldi. A korábbi kód `await request.json()`-nel indult, ami üres
 * törzsön DOB — így MINDEN valódi callback 400-at kapott, és a fizetés sosem
 * zárult le a callback-úton.
 */
function paymentIdFromQuery(request: Request): string | null {
  let params: URLSearchParams
  try {
    params = new URL(request.url).searchParams
  } catch {
    return null
  }
  // A Barion kisbetűs 'paymentId'-t küld; a nagybetűs alakot is elfogadjuk.
  return normalizePaymentId(params.get('paymentId') ?? params.get('PaymentId'))
}

/**
 * A PaymentId kinyerése a JSON-TÖRZSBŐL — TARTALÉK csatorna (a Barion mai
 * viselkedése szerint nem ez az élő út, de egy JSON-törzses kézbesítés is
 * feldolgozható marad).
 */
function extractPaymentId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const raw =
    (body as Record<string, unknown>).PaymentId ?? (body as Record<string, unknown>).paymentId
  return normalizePaymentId(raw)
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status })
}

export function createBarionCallbackHandler(deps: BarionCallbackHandlerDeps) {
  const schedule = deps.schedule ?? ((task: () => Promise<void>) => after(task))

  return async function POST(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'barion-callback' })

    // 0. A PaymentId FELOLDÁSA: elsődlegesen a query string (ez az éles Barion-
    //    csatorna), tartalékként a JSON-törzs. Az ÜRES vagy nem JSON törzs
    //    önmagában NEM hiba — a Barion pont ilyet küld.
    let paymentIdSource: 'query' | 'body' = 'query'
    let paymentId = paymentIdFromQuery(request)
    if (!paymentId) {
      paymentIdSource = 'body'
      const body: unknown = await request.json().catch(() => null)
      paymentId = extractPaymentId(body)
    }
    if (!paymentId) {
      // A nyers értéket NEM naplózzuk (tetszőleges, kívülről jött szöveg).
      log.warn('barion-callback: hiányzó vagy nem GUID-alakú PaymentId — 400')
      return jsonResponse({ ok: false, error: 'Hiányzó vagy érvénytelen PaymentId.' }, 400)
    }
    const eventLog = log.child({ paymentId })
    // Az éles próbavásárlásnál EZ a sor bizonyítja, hogy a callback megérkezett
    // és melyik csatornán hozta az azonosítót.
    eventLog.info('barion-callback: PaymentId feloldva', { source: paymentIdSource })

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
        if (!outcome.retryable) {
          // Ez volt az utolsó megengedett kísérlet: a webhook-retry MÁR NEM
          // viszi tovább — az owner-riasztás itt, a kimerülés pillanatában megy.
          eventLog.error(
            'webhook-esemény újrapróbálásai kimerültek — owner beavatkozás szükséges',
            {
              attempts: outcome.attempts,
              error: outcome.error,
            },
          )
        } else {
          eventLog.warn('barion-callback: aszinkron feldolgozás sikertelen (retry-job folytatja)', {
            attempts: outcome.attempts,
            retryable: outcome.retryable,
            error: outcome.error,
          })
        }
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

      if (record && isTerminallyProcessed(record)) {
        // Már VÉGLEGESEN feldolgozva → no-op (dupla kézbesítés).
        eventLog.info('barion-callback: duplikált kézbesítés — már feldolgozva, no-op 200')
        return jsonResponse({ ok: true, status: 'duplicate' })
      }

      if (record) {
        // 'received' + még nincs eredmény = a feldolgozás ütemezve/fut;
        // 'failed' = a Barion retry-lépcső újra kézbesítette → azonnali újrapróbálás;
        // nem terminális eredmény (pending_repoll) = a fizetés korábban még függő
        // volt, EZ a kézbesítés hozza a végleges státuszt → újra feldolgozzuk (B4).
        if (record.status === 'failed' || isNonTerminalWebhookResult(record.result)) {
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
