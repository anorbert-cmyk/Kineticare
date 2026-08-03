import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { fetchPaymentState, mapBarionPaymentStatus, type BarionPaymentStateResponse } from '../barion'
import { logger as rootLogger, type Logger } from '../logger'
import { onOrderPaid, queueInvoiceIssueJob } from '../order-paid'
import { applyBarionStateTransition } from '../order-status/apply-barion-state'

/**
 * order-poll szolgáltatás (W4-02) — a payment_pending-ben ragadt rendelések
 * utánpollolása a Barion v4 GetState-tel. Ez a "második védővonal": ha egy
 * callback elveszik (hálózati hiba, deploy, Barion-késés), a fizetés akkor is
 * lezárul — a v4 válasz a végső igazság, a callback csak gyorsító.
 */

export const ORDER_POLL_BATCH_SIZE = 25
// Az árva-rendelés lejárata 24 óra: a Barion PaymentWindow (30 perc) és a
// banki késleltetések mellett a 2 órás türelem túl szűk volt — a 2 óra UTÁN
// befejeződő fizetés a 'paid-not-allowed' állapotgép-védelembe ütközött
// (pénz felvéve, kurzus nem). A 24 óra a késői banki feldolgozás is belefér.
export const ORPHAN_ORDER_GRACE_MS = 24 * 60 * 60 * 1000 // 24 óra
export const STUCK_ORDER_WARN_MS = 24 * 60 * 60 * 1000 // 24 óra
export const INVOICE_RESWEEP_BATCH_SIZE = 10
export const INVOICE_PENDING_STALE_MS = 10 * 60 * 1000 // 10 perc

export interface OrderPollSummary {
  scanned: number
  transitionedPaid: number
  cancelled: number
  stillPending: number
  skipped: number
  failed: number
  orphaned: number
  invoiceRequeued: number
}

export interface OrderPollDeps {
  payload: Payload
  logger?: Logger
  /** Injektálható (teszteléshez); alapból a valódi fetchPaymentState. */
  fetchState?: (paymentId: string) => Promise<BarionPaymentStateResponse>
  /** Injektálható (teszteléshez); alapból a valódi onOrderPaid. */
  onPaid?: (order: Order) => Promise<void>
  /** Injektálható (teszteléshez); alapból a valódi queueInvoiceIssueJob-hívás. */
  queueInvoice?: (orderId: number) => Promise<boolean>
  now?: number
}

async function resweepInvoices(deps: OrderPollDeps, log: Logger, summary: OrderPollSummary): Promise<void> {
  const now = deps.now ?? Date.now()
  const candidates = await deps.payload.find({
    collection: 'orders',
    where: {
      and: [{ status: { equals: 'paid' } }, { invoiceStatus: { in: ['none', 'pending'] } }],
    },
    sort: 'updatedAt',
    limit: INVOICE_RESWEEP_BATCH_SIZE,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])

  const queueInvoice =
    deps.queueInvoice ?? ((orderId: number) => queueInvoiceIssueJob(deps.payload, orderId, log))

  for (const order of candidates.docs as Order[]) {
    if (order.invoiceStatus === 'pending') {
      const updatedAtMs = Date.parse(order.updatedAt ?? '')
      if (Number.isFinite(updatedAtMs) && now - updatedAtMs < INVOICE_PENDING_STALE_MS) {
        continue // friss pending — valószínűleg most dolgozik rajta egy worker
      }
    }
    const queued = await queueInvoice(order.id)
    if (queued) {
      summary.invoiceRequeued += 1
    }
  }
}

/** A poll-job egy futása. A visszaadott summary a job-output (és a napló). */
export async function pollPendingOrders(deps: OrderPollDeps): Promise<OrderPollSummary> {
  const log = (deps.logger ?? rootLogger).child({ module: 'order-poll' })
  const now = deps.now ?? Date.now()
  const fetchState = deps.fetchState ?? fetchPaymentState
  const onPaid = deps.onPaid ?? ((order: Order) => onOrderPaid({ payload: deps.payload, order, logger: log }))

  const summary: OrderPollSummary = {
    scanned: 0,
    transitionedPaid: 0,
    cancelled: 0,
    stillPending: 0,
    skipped: 0,
    failed: 0,
    orphaned: 0,
    invoiceRequeued: 0,
  }

  const pending = await deps.payload.find({
    collection: 'orders',
    where: { status: { equals: 'payment_pending' } },
    sort: 'createdAt',
    limit: ORDER_POLL_BATCH_SIZE,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])

  summary.scanned = pending.docs.length

  for (const order of pending.docs as Order[]) {
    const orderLog = log.child({ orderId: order.id, orderNumber: order.orderNumber ?? null })

    if (!order.barionPaymentId) {
      // Árva rendelés: a Barion Payment/Start sosem jött létre (a checkout a
      // rendelés létrehozása után, a paymentId mentése előtt állt le).
      const createdAtMs = Date.parse(order.createdAt ?? '')
      if (Number.isFinite(createdAtMs) && now - createdAtMs >= ORPHAN_ORDER_GRACE_MS) {
        await deps.payload.update({
          collection: 'orders',
          id: order.id,
          data: { status: 'cancelled' },
          overrideAccess: true,
        })
        summary.orphaned += 1
        orderLog.warn(
          'árva rendelés (barionPaymentId nélkül) lejárt — cancelled; a vevő újrakezdheti a vásárlást',
          { ageMs: now - createdAtMs },
        )
      } else {
        summary.skipped += 1
      }
      continue
    }

    let state: BarionPaymentStateResponse
    try {
      state = await fetchState(order.barionPaymentId)
    } catch (error) {
      summary.failed += 1
      orderLog.warn('order-poll: GetState-hiba (a következő futás újrapollolja)', {
        error: error instanceof Error ? error.message : String(error),
      })
      continue
    }

    const mapped = mapBarionPaymentStatus(state.Status)
    if (mapped === 'payment_pending') {
      summary.stillPending += 1
      const createdAtMs = Date.parse(order.createdAt ?? '')
      if (Number.isFinite(createdAtMs) && now - createdAtMs >= STUCK_ORDER_WARN_MS) {
        orderLog.error(
          'RIASZTÁS: a rendelés 24 órája payment_pending — manuális ellenőrzés szükséges (Barion-státusz még mindig függő)',
          { barionStatus: state.Status, ageMs: now - createdAtMs },
        )
      }
      continue
    }

    const transition = await applyBarionStateTransition({
      payload: deps.payload,
      order,
      mapped,
      log: orderLog,
    })

    if (transition.transitionedToPaid) {
      await onPaid(order)
      summary.transitionedPaid += 1
      orderLog.info('order-poll: elveszett callback pótolva — a rendelés paid (utánpollolással zárult)')
    } else if (transition.action === 'paid') {
      summary.transitionedPaid += 1
    } else if (transition.action === 'cancelled') {
      summary.cancelled += 1
      orderLog.info('order-poll: a fizetés lejárt/megszakadt — a rendelés cancelled')
    } else if (transition.action === 'rejected') {
      summary.failed += 1
      orderLog.warn('order-poll: az átmenet visszautasítva (állapotgép-védelem)', {
        reason: transition.reason ?? null,
      })
    }
  }

  await resweepInvoices(deps, log, summary)

  log.info('order-poll futás kész', { ...summary })
  return summary
}
