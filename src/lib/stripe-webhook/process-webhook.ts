import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import {
  registerWebhookProcessor,
  webhookEventStore,
  type WebhookEventDoc,
  type WebhookEventStore,
  type WebhookHandler,
} from '../idempotency'
import { logger, type Logger } from '../logger'
import { onOrderPaid } from '../order-paid'
import { applyPaidTransition } from '../order-status/apply-barion-state'
import {
  retrieveCheckoutSession,
  StripeApiError,
  type StripeClientConfig,
  type StripeGatewayClient,
} from '../stripe'

/**
 * Stripe-webhook aszinkron feldolgozó — a barion-callback processzor
 * tükreképe (T-022/W4-02 minta).
 *
 * Barion-elv: a webhook-esemény (checkout.session.completed) ÖNMAGÁBAN NEM
 * BIZONYÍTÉK — a jóváhagyás KIZÁRÓLAG a szerver-szerver sessions.retrieve
 * újra-lekérdezéssel történik, majd:
 *  - payment_status === 'paid' ÉS
 *  - amount_total >= totalHufSnapshot * 100 (FILLÉRBEN! — a HUF terhelésnél
 *    kéttizedes a Stripe-ban, lásd src/lib/stripe/checkout-session.ts) ÉS
 *  - currency === 'huf'
 *  csak ezután fut a KÖZÖS állapotgép (applyPaidTransition) — ugyanaz, mint a
 *  Barion-ág Total-assertje. A friss paid-átmenet mellékhatásai (számla-job +
 *  visszaigazoló e-mail) szintén a KÖZÖS onOrderPaid-del futnak.
 *
 * A 'checkout.session.async_payment_succeeded' ugyanezen az úton fut (késleltetett
 * fizetési módok jóváhagyása). A payment_status !== 'paid' eset (pl. még függő
 * aszinkron fizetés) NEM hiba: az esemény 'pending_repoll' eredménnyel zárul,
 * a rendelés payment_pending marad — a Stripe további eseményt küld.
 *
 * Hiba-szabály (a Barion-processzorral azonos): a retrieve-hiba vagy a hiányzó
 * rendelés THROW → a processWebhook failed-re állítja, a processedAt NEM
 * állítódik — az esemény a webhook-retry jobbal újrapróbálható marad,
 * kimerülésnél owner-riasztás.
 */

export interface StripeWebhookProcessorDeps {
  payload: Payload
  /** Injektálható tár (teszteléshez); alapból a valódi Payload-adapter. */
  store?: WebhookEventStore
  logger?: Logger
  /** Injektálható Stripe-függőségek (teszteléshez); alapból az envből oldódnak. */
  stripeClient?: StripeGatewayClient
  stripeConfig?: StripeClientConfig
}

/** A webhook-events.result select értékei (a collection sémával szinkronban). */
export type StripeWebhookResult = 'paid' | 'pending_repoll' | 'rejected' | 'failed'

interface OrderLookupResult {
  order: Order
  /** true, ha a rendelés a stripeSessionId helyett az orderNumber (client_reference_id) alapján találódott. */
  foundByOrderNumber: boolean
}

async function findOrderForSession(
  payload: Payload,
  sessionId: string,
  clientReferenceId: string | null,
): Promise<OrderLookupResult | null> {
  const bySessionId = await payload.find({
    collection: 'orders',
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const direct = bySessionId.docs[0] as Order | undefined
  if (direct) {
    return { order: direct, foundByOrderNumber: false }
  }

  // Fallback: a checkout a stripeSessionId mentése ELŐTT állhatott meg — a
  // retrieve-válasz (Stripe által hitelesített!) client_reference_id-je az
  // orderNumber, azzal is megkeressük, és a hiányzó stripeSessionId-t pótoljuk.
  if (clientReferenceId) {
    const byOrderNumber = await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: clientReferenceId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const byNumber = byOrderNumber.docs[0] as Order | undefined
    if (byNumber) {
      return { order: byNumber, foundByOrderNumber: true }
    }
  }
  return null
}

/** A checkoutSessionId kinyerése a webhook-events payloadjából (a route-handler írja). */
function sessionIdFromEventPayload(payloadData: unknown): string | null {
  if (typeof payloadData !== 'object' || payloadData === null || Array.isArray(payloadData)) {
    return null
  }
  const raw = (payloadData as Record<string, unknown>).checkoutSessionId
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

/** Az esemény végleges lezárása: processedAt + result beírása. */
async function closeEvent(
  store: WebhookEventStore,
  event: WebhookEventDoc,
  result: StripeWebhookResult,
): Promise<void> {
  await store.update({
    collection: 'webhook-events',
    id: event.id,
    data: { processedAt: new Date().toISOString(), result },
    overrideAccess: true,
  })
}

/**
 * A Stripe webhook-feldolgozó factory-ja — a visszaadott WebhookHandler a
 * processWebhook státuszgépébe és a webhook-retry jobba is beköthető.
 */
export function createStripeWebhookProcessor(deps: StripeWebhookProcessorDeps): WebhookHandler {
  const store = deps.store ?? webhookEventStore(deps.payload)
  const log = (deps.logger ?? logger).child({ module: 'stripe-webhook' })

  return async function processStripeWebhookEvent(event: WebhookEventDoc): Promise<unknown> {
    const eventLog = log.child({ stripeEventId: event.externalId, eventId: event.id })

    try {
      const sessionId = sessionIdFromEventPayload(event.payload)
      if (!sessionId) {
        // Adatinkonzisztencia a saját dedup-sorunkban — nem újrapróbálható.
        eventLog.error('RIASZTÁS: a webhook-esemény payloadjából hiányzik a checkoutSessionId')
        throw new Error('a Stripe webhook-esemény payloadja nem tartalmaz checkoutSessionId-t')
      }
      const sessionLog = eventLog.child({ checkoutSessionId: sessionId })

      // 1. Szerver-szerver verifikáció (sessions.retrieve) — az EGYETLEN bizonyíték.
      const session = await retrieveCheckoutSession(sessionId, {
        ...(deps.stripeClient ? { client: deps.stripeClient } : {}),
        ...(deps.stripeConfig ? { config: deps.stripeConfig } : {}),
      })
      sessionLog.info('stripe-webhook: checkout session verifikálva', {
        paymentStatus: session.payment_status,
        currency: session.currency ?? null,
        amountTotal: session.amount_total ?? null,
      })

      // 2. Rendelés-azonosítás (stripeSessionId, fallback: client_reference_id = orderNumber).
      const found = await findOrderForSession(
        deps.payload,
        sessionId,
        session.client_reference_id ?? null,
      )
      if (!found) {
        // NEM csendes elnyelés: riasztás + throw → failed (újrapróbálható,
        // kimerülésnél a retry-job owner-riasztást logol).
        sessionLog.error(
          'RIASZTÁS: a Stripe-fizetéshez nem található rendelés (ismeretlen vagy árva checkout session)',
          { clientReferenceId: session.client_reference_id ?? null },
        )
        throw new Error(`a Stripe-fizetéshez (${sessionId}) nem tartozik rendelés az adatbázisban`)
      }
      const { order } = found
      if (found.foundByOrderNumber) {
        sessionLog.warn(
          'stripe-webhook: a rendelés orderNumber alapján találódott — stripeSessionId pótolva',
          { orderId: order.id, orderNumber: order.orderNumber },
        )
        await deps.payload.update({
          collection: 'orders',
          id: order.id,
          data: { stripeSessionId: sessionId },
          overrideAccess: true,
        })
      }
      const orderLog = sessionLog.child({ orderId: order.id, orderNumber: order.orderNumber })

      // 3. payment_status !== 'paid' → még függő (pl. aszinkron fizetési mód):
      //    a rendelés payment_pending marad, az esemény pending_repoll-ként zárul.
      if (session.payment_status !== 'paid') {
        orderLog.info('stripe-webhook: a fizetés még nem paid — a rendelés payment_pending marad', {
          paymentStatus: session.payment_status,
        })
        await closeEvent(store, event, 'pending_repoll')
        return { status: 'payment_pending', orderId: order.id, orderNumber: order.orderNumber }
      }

      // 4. Állapotgép-átmenet a KÖZÖS MAGGAL — a paid-assert itt is érvényes:
      //    amount_total (FILLÉR!) >= totalHufSnapshot * 100 ÉS currency 'huf'.
      //    A mag forintban várja a bizonyítékot: amount_total / 100.
      const transition = await applyPaidTransition({
        payload: deps.payload,
        order,
        verifiedTotalHuf:
          typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
        verifiedCurrency:
          typeof session.currency === 'string' ? session.currency.toUpperCase() : null,
        verificationSource: 'Stripe sessions.retrieve',
        log: orderLog,
      })

      // 5. Friss paid-átmenet mellékhatásai (számla-job + visszaigazoló e-mail) —
      //    Stripe-rendelésre is ugyanaz a KÖZÖS onOrderPaid fut, mint Barionnál.
      if (transition.transitionedToPaid) {
        await onOrderPaid({ payload: deps.payload, order, logger: orderLog })
      }

      // 6. Esemény-lezárás az akcióhoz rendelt result-tal.
      if (transition.action === 'rejected') {
        await closeEvent(store, event, 'rejected')
        return { status: 'rejected', reason: transition.reason, orderId: order.id }
      }

      await closeEvent(store, event, 'paid')
      return {
        status: 'paid',
        duplicate: transition.duplicate === true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        purchasesGranted: transition.purchasesGranted,
      }
    } catch (error) {
      // Hibaág: a result='failed' best-effort jelölés (a státuszt/lastErrort a
      // processWebhook állítja); a processedAt SZÁNDÉKOSAN NULL marad — az
      // esemény a webhook-retry jobbal újrapróbálható.
      await store
        .update({
          collection: 'webhook-events',
          id: event.id,
          data: { result: 'failed' },
          overrideAccess: true,
        })
        .catch(() => undefined)
      if (error instanceof StripeApiError) {
        if (error.stripeErrorCode === 'resource_missing' || error.httpStatus === 404) {
          // Ismeretlen/árva session: a Stripe szerint nincs ilyen — riasztás.
          eventLog.error(
            'RIASZTÁS: ismeretlen checkout session — a retrieve hibát ad (lehetséges árva esemény)',
            { kind: error.kind, httpStatus: error.httpStatus ?? null, error: error.message },
          )
        } else {
          eventLog.warn('stripe-webhook: retrieve-hiba (újrapróbálható)', {
            kind: error.kind,
            httpStatus: error.httpStatus ?? null,
            error: error.message,
          })
        }
      } else {
        eventLog.error('stripe-webhook: feldolgozási hiba (újrapróbálható)', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      throw error
    }
  }
}

/**
 * A feldolgozó regisztrálása a webhook-retry jobhoz (T-014 registerWebhookProcessor).
 * A webhook-route import idején hívja — így a sikertelen (failed) eseményeket a
 * percenkénti retry-job a regisztrált handlerrel, exponenciális backoff-fal
 * futtatja újra, MAX_WEBHOOK_ATTEMPTS után owner-riasztással.
 */
export function registerStripeWebhookProcessor(getPayload: () => Promise<Payload>): void {
  registerWebhookProcessor('stripe', async (event) => {
    const payload = await getPayload()
    return createStripeWebhookProcessor({ payload })(event)
  })
}
