import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { BarionApiError, fetchPaymentState, mapBarionPaymentStatus } from '../barion'
import {
  registerWebhookProcessor,
  webhookEventStore,
  type WebhookEventDoc,
  type WebhookEventStore,
  type WebhookHandler,
} from '../idempotency'
import { logger, type Logger } from '../logger'
import { onOrderPaid } from '../order-paid'
import { applyBarionStateTransition } from '../order-status/apply-barion-state'

/**
 * Barion-callback aszinkron feldolgozó (T-022, W4-02 refaktor).
 *
 * A Barion callback-POSTja gyakorlatilag csak a PaymentId-t hordozza — a
 * callback-payload ÖNMAGÁBAN NEM BIZONYÍTÉK. A jóváhagyás ezért KIZÁRÓLAG a
 * szerver-szerver fetchPaymentState (v4!) verifikációval történik; a státusz-
 * leképezés a tesztelt mapBarionPaymentStatus szerint.
 *
 * Az állapotgép-átmeneteket a KÖZÖS MAG (src/lib/order-status/apply-barion-state.ts)
 * végzi — ugyanazt használja az order-poll job is, így az elveszett callback
 * utánpollolása definíció szerint azonos szabályokkal zárul. A friss paid-
 * átmenet mellékhatásait (számla-job + visszaigazoló e-mail) az onOrderPaid
 * futtatja, szintén közös modulból.
 *
 * Hiba-szabály: a fetchPaymentState hibája (timeout/network/provider) vagy a
 * hiányzó rendelés THROW a handlerből → a processWebhook failed-re állítja
 * (lastError + attempts), a processedAt NEM állítódik — az esemény a
 * webhook-retry jobbal újrapróbálható marad, kimerülésnél owner-riasztás.
 */

export interface BarionCallbackProcessorDeps {
  payload: Payload
  /** Injektálható tár (teszteléshez); alapból a valódi Payload-adapter. */
  store?: WebhookEventStore
  logger?: Logger
}

/** A webhook-events.result select értékei (a collection sémával szinkronban). */
export type BarionCallbackResult =
  | 'paid'
  | 'cancelled'
  | 'pending_repoll'
  | 'rejected'
  | 'failed'

interface OrderLookupResult {
  order: Order
  /** true, ha a rendelés a barionPaymentId helyett az orderNumber (PaymentRequestId) alapján találódott. */
  foundByOrderNumber: boolean
}

async function findOrderForPayment(
  payload: Payload,
  paymentId: string,
  paymentRequestId: string | undefined,
): Promise<OrderLookupResult | null> {
  const byPaymentId = await payload.find({
    collection: 'orders',
    where: { barionPaymentId: { equals: paymentId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const direct = byPaymentId.docs[0] as Order | undefined
  if (direct) {
    return { order: direct, foundByOrderNumber: false }
  }

  // Fallback: a checkout a barionPaymentId mentése ELŐTT állhatott meg — a
  // GetState-válasz (Barion által hitelesített!) PaymentRequestId-je az
  // orderNumber, azzal is megkeressük, és a hiányzó barionPaymentId-t pótoljuk.
  if (paymentRequestId) {
    const byOrderNumber = await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: paymentRequestId } },
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

/** Az esemény végleges lezárása: processedAt + result beírása. */
async function closeEvent(
  store: WebhookEventStore,
  event: WebhookEventDoc,
  result: BarionCallbackResult,
): Promise<void> {
  await store.update({
    collection: 'webhook-events',
    id: event.id,
    data: { processedAt: new Date().toISOString(), result },
    overrideAccess: true,
  })
}

/**
 * A Barion callback-feldolgozó factory-ja — a visszaadott WebhookHandler a
 * processWebhook státuszgépébe és a webhook-retry jobba is beköthető.
 */
export function createBarionCallbackProcessor(deps: BarionCallbackProcessorDeps): WebhookHandler {
  const store = deps.store ?? webhookEventStore(deps.payload)
  const log = (deps.logger ?? logger).child({ module: 'barion-callback' })

  return async function processBarionCallbackEvent(event: WebhookEventDoc): Promise<unknown> {
    const paymentId = event.externalId
    const eventLog = log.child({ paymentId, eventId: event.id })

    try {
      // 1. Szerver-szerver verifikáció (v4) — az EGYETLEN bizonyíték.
      const state = await fetchPaymentState(paymentId)
      const mapped = mapBarionPaymentStatus(state.Status)
      eventLog.info('barion-callback: fizetésállapot verifikálva', {
        barionStatus: state.Status,
        mappedStatus: mapped,
      })

      // 2. Rendelés-azonosítás (barionPaymentId, fallback: PaymentRequestId = orderNumber).
      const found = await findOrderForPayment(deps.payload, paymentId, state.PaymentRequestId)
      if (!found) {
        // NEM csendes elnyelés: riasztás a naplóba + throw → failed (újrapróbálható,
        // kimerülésnél a retry-job owner-riasztást logol).
        eventLog.error(
          'RIASZTÁS: a Barion-fizetéshez nem található rendelés (ismeretlen vagy árva PaymentId)',
          {
            paymentRequestId: state.PaymentRequestId ?? null,
            barionStatus: state.Status,
          },
        )
        throw new Error(`a Barion-fizetéshez (${paymentId}) nem tartozik rendelés az adatbázisban`)
      }
      const { order } = found
      if (found.foundByOrderNumber) {
        eventLog.warn(
          'barion-callback: a rendelés orderNumber alapján találódott — barionPaymentId pótolva',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
        )
        await deps.payload.update({
          collection: 'orders',
          id: order.id,
          data: { barionPaymentId: paymentId },
          overrideAccess: true,
        })
      }
      const orderLog = eventLog.child({ orderId: order.id, orderNumber: order.orderNumber })

      // 3. Állapotgép-átmenet a KÖZÖS MAGGAL (a poll-job is ezt futtatja).
      const transition = await applyBarionStateTransition({
        payload: deps.payload,
        order,
        mapped,
        log: orderLog,
      })

      // 4. Friss paid-átmenet mellékhatásai (számla-job + visszaigazoló e-mail).
      //    Az onOrderPaid sosem dob — a callback-feldolgozás ettől nem bukhat el.
      if (transition.transitionedToPaid) {
        await onOrderPaid({ payload: deps.payload, order, logger: orderLog })
      }

      // 5. Esemény-lezárás az akcióhoz rendelt result-tal.
      if (transition.action === 'pending') {
        await closeEvent(store, event, 'pending_repoll')
        return { status: 'payment_pending', orderId: order.id, orderNumber: order.orderNumber }
      }
      if (transition.action === 'cancelled') {
        await closeEvent(store, event, 'cancelled')
        return {
          status: 'cancelled',
          ...(transition.duplicate ? { duplicate: true } : {}),
          orderId: order.id,
          orderNumber: order.orderNumber,
        }
      }
      if (transition.action === 'rejected') {
        await closeEvent(store, event, 'rejected')
        return { status: 'rejected', reason: transition.reason, orderId: order.id }
      }

      // transition.action === 'paid'
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
      if (error instanceof BarionApiError) {
        if (error.kind === 'provider' || error.httpStatus === 404) {
          // Ismeretlen/árva PaymentId: a Barion szerint nincs ilyen fizetés — riasztás.
          eventLog.error(
            'RIASZTÁS: ismeretlen vagy hamis PaymentId — a GetState hibát ad (lehetséges árva/ásított callback)',
            {
              kind: error.kind,
              httpStatus: error.httpStatus ?? null,
              error: error.message,
            },
          )
        } else {
          eventLog.warn('barion-callback: GetState-hiba (újrapróbálható)', {
            kind: error.kind,
            httpStatus: error.httpStatus ?? null,
            error: error.message,
          })
        }
      } else {
        eventLog.error('barion-callback: feldolgozási hiba (újrapróbálható)', {
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
export function registerBarionWebhookProcessor(getPayload: () => Promise<Payload>): void {
  registerWebhookProcessor('barion', async (event) => {
    const payload = await getPayload()
    return createBarionCallbackProcessor({ payload })(event)
  })
}
