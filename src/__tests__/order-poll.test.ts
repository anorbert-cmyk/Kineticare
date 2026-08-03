import { describe, expect, it } from 'vitest'

import type { BarionPaymentStateResponse } from '../lib/barion'
import {
  INVOICE_PENDING_STALE_MS,
  ORPHAN_ORDER_GRACE_MS,
  pollPendingOrders,
  STUCK_ORDER_WARN_MS,
} from '../lib/order-poll/service'
import type { Order } from '../payload-types'

/**
 * W4-02 order-poll szolgáltatás tesztjei — mockolt payload + injektált
 * GetState/onPaid/queueInvoice. A lényeg: az elveszett callback-mentés ugyanazt
 * az állapotgépet futtatja, mint a callback-processzor, és a mellékhatások
 * (onPaid, számla-resweep) is bekövetkeznek.
 */

const PAYMENT_ID = '11111111-2222-3333-4444-555555555555'
const ORDER_NUMBER = 'KH-2026-000123'
const NOW = Date.parse('2026-08-04T12:00:00Z')

function isoHoursAgo(hours: number): string {
  return new Date(NOW - hours * 3600_000).toISOString()
}

function createPendingOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 101,
    orderNumber: ORDER_NUMBER,
    status: 'payment_pending',
    barionPaymentId: PAYMENT_ID,
    customer: 7,
    customerEmail: 'anna@example.test',
    items: [{ product: 42, quantity: 1, titleSnapshot: 'DEMO-KEZREHAB-001', priceHufSnapshot: 19990 }],
    createdAt: isoHoursAgo(1),
    updatedAt: isoHoursAgo(1),
    ...overrides,
  } as unknown as Order
}

function getStateResponse(status: string): BarionPaymentStateResponse {
  return {
    PaymentId: PAYMENT_ID,
    PaymentRequestId: ORDER_NUMBER,
    Status: status as BarionPaymentStateResponse['Status'],
    Transactions: [],
  }
}

interface SetupOptions {
  pending?: Order[]
  paidResweep?: Order[]
  stateStatus?: string
  stateError?: Error
}

function setup(options: SetupOptions = {}) {
  const pending = options.pending ?? [createPendingOrder()]
  const paidResweep = options.paidResweep ?? []
  const user = { id: 7, email: 'anna@example.test', purchases: [] as number[] }
  const orderUpdates: Array<Record<string, unknown>> = []
  const queuedInvoices: number[] = []
  const paidCalls: number[] = []

  const payload = {
    find: async ({ where }: { collection: string; where?: unknown }) => {
      const json = JSON.stringify(where ?? {})
      if (json.includes('"paid"')) {
        return { docs: paidResweep, totalDocs: paidResweep.length }
      }
      return { docs: pending, totalDocs: pending.length }
    },
    findByID: async () => user,
    update: async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      if (collection === 'orders') {
        orderUpdates.push(data)
        for (const order of [...pending, ...paidResweep]) {
          Object.assign(order, data)
        }
      }
      if (collection === 'users') {
        Object.assign(user, data)
      }
      return data
    },
  }

  const fetchState = async (): Promise<BarionPaymentStateResponse> => {
    if (options.stateError) {
      throw options.stateError
    }
    return getStateResponse(options.stateStatus ?? 'Succeeded')
  }

  const onPaid = async (order: Order): Promise<void> => {
    paidCalls.push(order.id)
  }
  const queueInvoice = async (orderId: number): Promise<boolean> => {
    queuedInvoices.push(orderId)
    return true
  }

  return {
    payload: payload as never,
    fetchState,
    onPaid,
    queueInvoice,
    user,
    orderUpdates,
    queuedInvoices,
    paidCalls,
    pending,
  }
}

describe('order-poll — elveszett callback-mentés', () => {
  it('Barion Succeeded + payment_pending rendelés → paid átmenet + purchases + onPaid mellékhatás', async () => {
    const order = createPendingOrder()
    const { payload, fetchState, onPaid, queueInvoice, user, paidCalls } = setup({
      pending: [order],
      stateStatus: 'Succeeded',
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.scanned).toBe(1)
    expect(summary.transitionedPaid).toBe(1)
    expect(order.status).toBe('paid')
    expect(user.purchases).toEqual([42])
    expect(paidCalls).toEqual([101])
  })

  it.each([['Canceled'], ['Expired']])('Barion %s → a rendelés cancelled lesz', async (status) => {
    const order = createPendingOrder()
    const { payload, fetchState, onPaid, queueInvoice, paidCalls } = setup({
      pending: [order],
      stateStatus: status,
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.cancelled).toBe(1)
    expect(summary.transitionedPaid).toBe(0)
    expect(paidCalls).toHaveLength(0)
    expect(order.status).toBe('cancelled')
  })

  it.each([['Prepared'], ['Started']])('Barion %s → a rendelés payment_pending marad', async (status) => {
    const { payload, fetchState, onPaid, queueInvoice, orderUpdates } = setup({
      stateStatus: status,
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.stillPending).toBe(1)
    expect(orderUpdates).toHaveLength(0)
  })

  it('GetState-hiba → a rendelés kimarad (failed), a státusz érintetlen', async () => {
    const { payload, fetchState, onPaid, queueInvoice, orderUpdates } = setup({
      stateError: new Error('fetch failed'),
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.failed).toBe(1)
    expect(orderUpdates).toHaveLength(0)
  })
})

describe('order-poll — árva rendelés (barionPaymentId nélkül)', () => {
  it('2 óránál fiatalabb árva → kihagyva (a vevő még játszhat)', async () => {
    const orphan = createPendingOrder({ barionPaymentId: null, createdAt: isoHoursAgo(0.5) })
    const { payload, fetchState, onPaid, queueInvoice, orderUpdates } = setup({ pending: [orphan] })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.skipped).toBe(1)
    expect(summary.orphaned).toBe(0)
    expect(orderUpdates).toHaveLength(0)
  })

  it('ORPHAN_GRACE-nél régebbi árva → cancelled (a Barionban úgysem létezik fizetés)', async () => {
    const orphan = createPendingOrder({
      barionPaymentId: null,
      createdAt: new Date(NOW - ORPHAN_ORDER_GRACE_MS - 60_000).toISOString(),
    })
    const { payload, fetchState, onPaid, queueInvoice } = setup({ pending: [orphan] })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.orphaned).toBe(1)
    expect(orphan.status).toBe('cancelled')
  })

  it('24 óránál régebbi függő rendelés → stillPending + owner-riasztás (státusz marad)', async () => {
    const stuck = createPendingOrder({ createdAt: new Date(NOW - STUCK_ORDER_WARN_MS - 60_000).toISOString() })
    const { payload, fetchState, onPaid, queueInvoice } = setup({
      pending: [stuck],
      stateStatus: 'Prepared',
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.stillPending).toBe(1)
    expect(stuck.status).toBe('payment_pending')
  })
})

describe('order-poll — számla-resweep', () => {
  it("paid + invoiceStatus 'none' → újra sorba állítja az invoice-issue jobot", async () => {
    const paidOrder = createPendingOrder({ id: 202, status: 'paid', invoiceStatus: 'none' })
    const { payload, fetchState, onPaid, queueInvoice, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(queuedInvoices).toEqual([202])
    expect(summary.invoiceRequeued).toBe(1)
  })

  it("friss 'pending' számla → NINCS resweep (valószínűleg dolgozik rajta egy worker)", async () => {
    const paidOrder = createPendingOrder({
      id: 202,
      status: 'paid',
      invoiceStatus: 'pending',
      updatedAt: new Date(NOW - 60_000).toISOString(),
    })
    const { payload, fetchState, onPaid, queueInvoice, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(queuedInvoices).toHaveLength(0)
    expect(summary.invoiceRequeued).toBe(0)
  })

  it("régi (10+ perces) 'pending' számla → resweep (a worker elhalt közben)", async () => {
    const paidOrder = createPendingOrder({
      id: 202,
      status: 'paid',
      invoiceStatus: 'pending',
      updatedAt: new Date(NOW - INVOICE_PENDING_STALE_MS - 60_000).toISOString(),
    })
    const { payload, fetchState, onPaid, queueInvoice, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(queuedInvoices).toEqual([202])
  })
})
