import { after } from 'next/server'
import type { Payload } from 'payload'
import type Stripe from 'stripe'

import {
  isUniqueViolation,
  processWebhook,
  webhookEventStore,
  type WebhookEventStore,
} from '../idempotency'
import { logger } from '../logger'
import { generateRequestId, getRequestId } from '../request-id'
import {
  constructWebhookEvent,
  getStripeConfig,
  type StripeClientConfig,
  type StripeGatewayClient,
} from '../stripe'
import { createStripeWebhookProcessor } from './process-webhook'

/**
 * POST /api/stripe/webhook route-handler factory — a barion-callback
 * route-handler tükreképe (T-022 mintájára).
 *
 * Sorrend (a Barion-elvekkel azonos: a webhook-payload ÖNMAGÁBAN NEM BIZONYÍTÉK):
 *
 *  1. NYERS body (request.text() — SOSEM request.json: az aláírás a nyers
 *     bájtokra vonatkozik, az újraszerializált JSON érvénytelenítené).
 *  2. ALÁÍRÁS-VERIFIKÁCIÓ (constructEvent, STRIPE_WEBHOOK_SECRET) — hibás
 *     aláírás → 400, és az esemény NEM kerül a webhook-events táblába:
 *     verifikálatlan kérés sosem nyithat feldolgozási sort.
 *  3. AZONNALI DEDUP: webhook-events (provider='stripe', externalId=event.id)
 *     — a (provider, externalId) UNIQUE-ütközés = már feldolgozva/feldolgozás
 *     alatt → 200, no-op.
 *  4. AZONNALI 200 — a tényleges feldolgozás ASZINKRON (a sessions.retrieve
 *     újra-lekérdezésre a handler SOSEM vár): next/server after() + a T-014
 *     webhook-retry job (a regisztráció a registerStripeWebhookProcessor).
 *
 * Kezelt eseménytípusok: checkout.session.completed és
 * checkout.session.async_payment_succeeded (mindkettő „érdemes újra-lekérdezni"
 * jelzés — a bizonyíték a processzorban, a sessions.retrieve válasza). Minden
 * más típus: 200 'ignored', dedup-sor nélkül (a Stripe-dashboardon ezeket a
 * típusokat kell bekötni; a többi esemény számunkra nem hordoz akciót).
 *
 * Kikapcsolt integráció (STRIPE_SECRET_KEY nélkül): 503 — a Stripe retry-
 * lépcsője újra kézbesít, a beállítás után a kézbesítés sikerül.
 */

/** Az eseménytípusok, amelyek a rendelés-állapotgépet mozgathatják. */
export const STRIPE_HANDLED_EVENT_TYPES = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
] as const

export interface StripeWebhookHandlerDeps {
  getPayload: () => Promise<Payload>
  /**
   * Az aszinkron ütemező injektálható (teszteléshez). Alapból next/server
   * `after()` — a válasz elküldése után fut, a kérés életciklusát meghosszabbítva.
   */
  schedule?: (task: () => Promise<void>) => void
  store?: WebhookEventStore
  /** Injektálható Stripe-függőségek (teszteléshez); alapból az envből oldódnak. */
  stripeClient?: StripeGatewayClient
  stripeConfig?: StripeClientConfig
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status })
}

/** A checkout session azonosítójának kinyerése a verifikált eseményből (hiányában null). */
function extractSessionId(event: Stripe.Event): string | null {
  // A handled típusoknál a data.object mindig Checkout Session — dokumentált
  // határponti cast (a Stripe Event.Data.Object uniója szándékosan tág).
  const object = event.data.object as Stripe.Checkout.Session
  return typeof object.id === 'string' && object.id.length > 0 ? object.id : null
}

export function createStripeWebhookHandler(deps: StripeWebhookHandlerDeps) {
  const schedule = deps.schedule ?? ((task: () => Promise<void>) => after(task))

  return async function POST(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers) ?? generateRequestId()
    const log = logger.child({ requestId, route: 'stripe-webhook' })

    // 0. Kikapcsolt integráció → 503 (a Stripe retry-ja később sikerülhet).
    const stripeConfig = deps.stripeConfig ?? getStripeConfig()
    if (!stripeConfig.enabled) {
      log.warn('stripe-webhook: hívás kikapcsolt Stripe-integrációra (STRIPE_SECRET_KEY hiányzik) — 503')
      return jsonResponse(
        { ok: false, error: 'A Stripe-integráció nincs beállítva.' },
        503,
      )
    }

    // 1. NYERS body + aláírás-fejléc — a JSON-parse NEM használható az aláírás miatt.
    const rawBody = await request.text()
    const signatureHeader = request.headers.get('stripe-signature')
    if (!signatureHeader) {
      log.warn('stripe-webhook: hiányzó stripe-signature fejléc — 400')
      return jsonResponse({ ok: false, error: 'Hiányzó webhook-aláírás.' }, 400)
    }

    // 2. ALÁÍRÁS-VERIFIKÁCIÓ — hiba esetén 400, webhook-events sor NÉLKÜL.
    let event: Stripe.Event
    try {
      event = constructWebhookEvent(rawBody, signatureHeader, {
        ...(deps.stripeClient ? { client: deps.stripeClient } : {}),
        config: stripeConfig,
      })
    } catch (error) {
      log.warn('stripe-webhook: aláírás-ellenőrzés sikertelen — 400', {
        error: error instanceof Error ? error.message : String(error),
      })
      return jsonResponse({ ok: false, error: 'Érvénytelen webhook-aláírás.' }, 400)
    }
    const eventLog = log.child({ stripeEventId: event.id, eventType: event.type })

    // Csak a checkout-session események hordoznak akciót — a többi 200 ignored.
    if (!(STRIPE_HANDLED_EVENT_TYPES as readonly string[]).includes(event.type)) {
      eventLog.debug('stripe-webhook: nem kezelt eseménytípus — 200 ignored')
      return jsonResponse({ ok: true, status: 'ignored' })
    }

    const sessionId = extractSessionId(event)
    if (!sessionId) {
      eventLog.warn('stripe-webhook: a verifikált eseményből hiányzik a session-azonosító — 400')
      return jsonResponse({ ok: false, error: 'Hiányzó session-azonosító az eseményben.' }, 400)
    }

    const payload = await deps.getPayload()
    const store = deps.store ?? webhookEventStore(payload)

    const runProcessing = async (): Promise<void> => {
      const outcome = await processWebhook({
        store,
        provider: 'stripe',
        externalId: event.id,
        requestId,
        handler: createStripeWebhookProcessor({
          payload,
          store,
          ...(deps.stripeClient ? { stripeClient: deps.stripeClient } : {}),
          stripeConfig,
        }),
      })
      if (outcome.kind === 'failed') {
        eventLog.warn('stripe-webhook: aszinkron feldolgozás sikertelen (retry-job folytatja)', {
          attempts: outcome.attempts,
          retryable: outcome.retryable,
          error: outcome.error,
        })
      }
    }

    // 3. AZONNALI DEDUP — a feldolgozást NEM várjuk meg.
    try {
      const existing = await store.find({
        collection: 'webhook-events',
        where: {
          and: [{ provider: { equals: 'stripe' } }, { externalId: { equals: event.id } }],
        },
        limit: 1,
        overrideAccess: true,
      })
      const record = existing.docs[0]

      if (record && record.status === 'processed') {
        eventLog.info('stripe-webhook: duplikált kézbesítés — már feldolgozva, no-op 200')
        return jsonResponse({ ok: true, status: 'duplicate' })
      }

      if (record) {
        // 'received' = feldolgozás már ütemezve/fut (vagy a retry-job viszi);
        // 'failed' = a Stripe újra kézbesítette → azonnali újrapróbálás.
        if (record.status === 'failed') {
          schedule(runProcessing)
        }
        return jsonResponse({ ok: true, status: 'received' })
      }

      try {
        await store.create({
          collection: 'webhook-events',
          data: {
            provider: 'stripe',
            externalId: event.id,
            eventType: event.type,
            status: 'received',
            attempts: 0,
            // Csak a kinyert, strukturált mezők — a nyers esemény-bodyt (PII!) nem tároljuk.
            // (A 'sessionId' mezőnév a logger redact-listája miatt itt 'checkoutSessionId'.)
            payload: { eventType: event.type, checkoutSessionId: sessionId },
            requestId,
          },
          overrideAccess: true,
        })
      } catch (createError) {
        if (isUniqueViolation(createError)) {
          eventLog.info('stripe-webhook: versenyhelyzet a dedup-írásnál — no-op 200')
          return jsonResponse({ ok: true, status: 'duplicate' })
        }
        throw createError
      }

      // 4. AZONNALI 200 — a feldolgozás aszinkron (a sessions.retrieve-re NEM várunk).
      schedule(runProcessing)
      return jsonResponse({ ok: true, status: 'accepted' })
    } catch (error) {
      // Infrastrukturális hiba (DB elérhetetlen): 500, hogy a Stripe retry-lépcsője
      // újra kézbesítse — az esemény ilyenkor még NEM rögzült.
      eventLog.error('stripe-webhook: technikai hiba a dedup során', {
        error: error instanceof Error ? error.message : String(error),
      })
      return jsonResponse(
        { ok: false, error: 'A webhook feldolgozása ideiglenesen nem érhető el.' },
        500,
      )
    }
  }
}

export { registerStripeWebhookProcessor } from './process-webhook'
