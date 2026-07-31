import type { Payload } from 'payload'

import type { Order, User } from '../../payload-types'
import { BarionApiError, fetchPaymentState, mapBarionPaymentStatus } from '../barion'
import {
  registerWebhookProcessor,
  webhookEventStore,
  type WebhookEventDoc,
  type WebhookEventStore,
  type WebhookHandler,
} from '../idempotency'
import { logger, type Logger } from '../logger'

/**
 * Barion-callback aszinkron feldolgozó (T-022).
 *
 * A Barion callback-POSTja gyakorlatilag csak a PaymentId-t hordozza — a
 * callback-payload ÖNMAGÁBAN NEM BIZONYÍTÉK. A jóváhagyás ezért KIZÁRÓLAG a
 * szerver-szerver fetchPaymentState (v4!) verifikációval történik; a státusz-
 * leképezés a tesztelt mapBarionPaymentStatus szerint.
 *
 * Átmenet-szabályok (mind idempotens):
 * - paid: order payment_pending/created → paid (már paid → no-op, NEM hiba),
 *   purchases-beírás a users-re (már megvan → no-op). Más kiinduló státuszból
 *   (cancelled/refunded/payment_failed) TILOS — naplózott riasztás.
 * - cancelled: payment_pending → cancelled; paid felé TILOS visszaállítani
 *   (állapotgép-védelem, riasztás); más kiindulóból figyelmeztetés, marad.
 * - payment_pending: státusz marad; result='pending_repoll' jelzi, hogy a
 *   rendelés újrapollolásra vár (a poll-job külön ticket).
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

function orderProductIds(order: Order): number[] {
  const items = order.items ?? []
  const ids: number[] = []
  for (const item of items) {
    if (item.product === null || item.product === undefined) {
      continue
    }
    ids.push(typeof item.product === 'object' ? item.product.id : item.product)
  }
  return ids
}

function userPurchaseIds(user: User): number[] {
  const purchases = user.purchases ?? []
  return purchases.map((entry) => (typeof entry === 'object' ? entry.id : entry))
}

/**
 * A purchases-jogosultság idempotens beírása: csak a hiányzó termékek kerülnek
 * hozzá (már meglévő → no-op). Így a dupla callback és az újrapróbálás sem
 * hozhat létre dupla jogosultságot; részleges korábbi hiba esetén pedig
 * kijavítja a hiányt.
 */
async function grantPurchases(
  payload: Payload,
  order: Order,
  log: Logger,
): Promise<{ granted: number; alreadyOwned: number }> {
  const customerRef = order.customer
  const customerId =
    typeof customerRef === 'object' && customerRef !== null ? customerRef.id : customerRef
  if (customerId === null || customerId === undefined) {
    // Rendelés vevő nélkül nem létezhet a checkout-folyamatban — ez adatinkonzisztencia.
    throw new Error('a rendeléshez nem tartozik vevő (customer) — jogosultság nem írható be')
  }

  const user = (await payload.findByID({
    collection: 'users',
    id: customerId,
    depth: 0,
    overrideAccess: true,
  })) as User

  const owned = new Set(userPurchaseIds(user).map(String))
  const missing = orderProductIds(order).filter((productId) => !owned.has(String(productId)))

  if (missing.length > 0) {
    await payload.update({
      collection: 'users',
      id: customerId,
      data: { purchases: [...userPurchaseIds(user), ...missing] },
      overrideAccess: true,
    })
    log.info('barion-callback: purchases-jogosultság beírva', {
      userId: customerId,
      grantedProductIds: missing,
    })
  }

  return { granted: missing.length, alreadyOwned: orderProductIds(order).length - missing.length }
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

      // 3. Állapotgép-átmenetek.
      if (mapped === 'payment_pending') {
        if (order.status !== 'payment_pending' && order.status !== 'created') {
          orderLog.warn(
            'barion-callback: függő fizetésjelzés nem függő rendelésre — állapot változatlan',
            {
              orderStatus: order.status,
            },
          )
        }
        // Státusz marad; a poll-job (külön ticket) ütemezzi az újrapollolást.
        await closeEvent(store, event, 'pending_repoll')
        return { status: 'payment_pending', orderId: order.id, orderNumber: order.orderNumber }
      }

      if (mapped === 'cancelled') {
        if (order.status === 'payment_pending') {
          await deps.payload.update({
            collection: 'orders',
            id: order.id,
            data: { status: 'cancelled' },
            overrideAccess: true,
          })
          orderLog.info('barion-callback: rendelés lemondva (Barion-státusz alapján)')
          await closeEvent(store, event, 'cancelled')
          return { status: 'cancelled', orderId: order.id, orderNumber: order.orderNumber }
        }
        if (order.status === 'cancelled') {
          orderLog.info('barion-callback: a rendelés már lemondott — duplikátum no-op')
          await closeEvent(store, event, 'cancelled')
          return { status: 'cancelled', duplicate: true, orderId: order.id }
        }
        if (order.status === 'paid') {
          // ÁLLAPOTGÉP-VÉDELEM: paid rendelést SOSEM állítunk vissza cancelledre.
          orderLog.error(
            'RIASZTÁS: paid rendelésre cancelled Barion-callback érkezett — visszaállítás TILOS, állapot marad paid',
            { barionStatus: state.Status },
          )
          await closeEvent(store, event, 'rejected')
          return { status: 'rejected', reason: 'paid-cancel-rejected', orderId: order.id }
        }
        orderLog.warn(
          'barion-callback: cancelled jelzés nem lemondható kiinduló státuszból — állapot marad',
          {
            orderStatus: order.status,
          },
        )
        await closeEvent(store, event, 'rejected')
        return { status: 'rejected', reason: 'cancel-not-allowed', orderId: order.id }
      }

      // mapped === 'paid'
      if (
        order.status === 'cancelled' ||
        order.status === 'refunded' ||
        order.status === 'payment_failed'
      ) {
        orderLog.error(
          'RIASZTÁS: paid jelzés nem engedélyezett kiinduló státuszból — állapot változatlan, manuális ellenőrzés szükséges',
          { orderStatus: order.status, barionStatus: state.Status },
        )
        await closeEvent(store, event, 'rejected')
        return { status: 'rejected', reason: 'paid-not-allowed', orderId: order.id }
      }

      const alreadyPaid = order.status === 'paid'
      if (!alreadyPaid) {
        if (order.status === 'created') {
          orderLog.warn(
            'barion-callback: created státuszú rendelés ugrik paid-re (payment_pending átugorva)',
          )
        }
        await deps.payload.update({
          collection: 'orders',
          id: order.id,
          data: { status: 'paid' },
          overrideAccess: true,
        })
        orderLog.info('barion-callback: rendelés paid-re állítva (Barion v4 verifikációval)')
      } else {
        orderLog.info(
          'barion-callback: a rendelés már paid — átmenet no-op, jogosultság-ellenőrzés fut',
        )
      }

      // Purchases-beírás mindig idempotens (már paid rendelésnél is kijavítja az esetleges hiányt).
      const grant = await grantPurchases(deps.payload, order, orderLog)
      await closeEvent(store, event, 'paid')
      return {
        status: 'paid',
        duplicate: alreadyPaid,
        orderId: order.id,
        orderNumber: order.orderNumber,
        purchasesGranted: grant.granted,
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
