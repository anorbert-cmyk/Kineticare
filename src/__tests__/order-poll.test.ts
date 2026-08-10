import { describe, expect, it } from 'vitest'

import { BarionApiError, type BarionPaymentStateResponse } from '../lib/barion'
import {
  INVOICE_PENDING_STALE_MS,
  isSystemicBarionFailure,
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
/**
 * A rendelés szerver-oldali végösszege. Az S2 összeg-assert miatt a
 * GetState-válasz Total/Currency mezőjének egyeznie kell ezzel, különben a
 * paid-átmenet elutasított.
 */
const ORDER_TOTAL_HUF = 19990

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
    currency: 'HUF',
    totalHufSnapshot: ORDER_TOTAL_HUF,
    items: [
      {
        product: 42,
        quantity: 1,
        titleSnapshot: 'DEMO-KEZREHAB-001',
        priceHufSnapshot: ORDER_TOTAL_HUF,
      },
    ],
    createdAt: isoHoursAgo(1),
    updatedAt: isoHoursAgo(1),
    ...overrides,
  } as unknown as Order
}

function getStateResponse(
  status: string,
  overrides: Partial<BarionPaymentStateResponse> = {},
): BarionPaymentStateResponse {
  return {
    PaymentId: PAYMENT_ID,
    PaymentRequestId: ORDER_NUMBER,
    Status: status as BarionPaymentStateResponse['Status'],
    Total: ORDER_TOTAL_HUF,
    Currency: 'HUF',
    Transactions: [],
    ...overrides,
  }
}

interface SetupOptions {
  pending?: Order[]
  paidResweep?: Order[]
  stateStatus?: string
  stateError?: Error
  /** A GetState-válasz felülírásai (pl. eltérő Total az összeg-assert teszteléséhez). */
  stateOverrides?: Partial<BarionPaymentStateResponse>
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
    return getStateResponse(options.stateStatus ?? 'Succeeded', options.stateOverrides)
  }

  const onPaid = async (order: Order): Promise<void> => {
    paidCalls.push(order.id)
  }
  const queueInvoice = async (orderId: number): Promise<boolean> => {
    queuedInvoices.push(orderId)
    return true
  }
  /**
   * Bekapcsolt Számlázz.hu-integráció. INJEKTÁLVA, nem envből: a resweep-ág
   * előfeltétele a `SZAMLAZZ_AGENT_KEY` megléte, a teszt viszont sosem függhet
   * valódi (vagy ál-) agent-kulcstól. A kikapcsolt ágnak külön tesztje van.
   */
  const invoicingEnabled = (): boolean => true

  return {
    payload: payload as never,
    fetchState,
    onPaid,
    queueInvoice,
    invoicingEnabled,
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

  /**
   * S2 összeg-assert: a poll-job UGYANAZT a magot futtatja, mint a callback,
   * tehát a Total-eltérés itt is elutasított paid-átmenetet jelent — a
   * „mentőháló" nem kerülheti meg az összeg-ellenőrzést.
   */
  it('Barion Succeeded, de eltérő Total → NINCS paid átmenet (failed), a státusz érintetlen', async () => {
    const order = createPendingOrder()
    const { payload, fetchState, onPaid, queueInvoice, user, paidCalls, orderUpdates } = setup({
      pending: [order],
      stateStatus: 'Succeeded',
      stateOverrides: { Total: 1 },
    })

    const summary = await pollPendingOrders({ payload, fetchState, onPaid, queueInvoice, now: NOW })

    expect(summary.transitionedPaid).toBe(0)
    expect(summary.failed).toBe(1)
    expect(order.status).toBe('payment_pending')
    expect(orderUpdates).toHaveLength(0)
    expect(user.purchases).toEqual([])
    expect(paidCalls).toHaveLength(0)
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
    const { payload, fetchState, onPaid, queueInvoice, invoicingEnabled, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled,
      now: NOW,
    })

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
    const { payload, fetchState, onPaid, queueInvoice, invoicingEnabled, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled,
      now: NOW,
    })

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
    const { payload, fetchState, onPaid, queueInvoice, invoicingEnabled, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled,
      now: NOW,
    })

    expect(queuedInvoices).toEqual([202])
  })

  /**
   * Kikapcsolt Számlázz.hu-integráció (nincs SZAMLAZZ_AGENT_KEY — élesben ez a
   * jelenlegi állapot). Az invoice-issue task ilyenkor garantáltan 'disabled'
   * kimenettel no-opol, az invoiceStatus tehát 'none' marad: resweep-gát nélkül
   * MINDEN ütemezett futás újra sorba állítaná ugyanazt a 10 rendelést, azaz
   * élesben 5 percenként 10 fölösleges job-sor + félrevezető info-log.
   */
  it('kikapcsolt Számlázz.hu-integráció → NINCS resweep (nem termel fölösleges jobokat)', async () => {
    const paidOrder = createPendingOrder({ id: 202, status: 'paid', invoiceStatus: 'none' })
    const { payload, fetchState, onPaid, queueInvoice, queuedInvoices } = setup({
      pending: [],
      paidResweep: [paidOrder],
    })

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })

    expect(queuedInvoices).toHaveLength(0)
    expect(summary.invoiceRequeued).toBe(0)
  })
})

/**
 * Rendszerszintű Barion-hiba: megszakító (circuit-breaker) ág.
 *
 * Élesben ez a valós kockázat: ha a BARION_POSKEY_* ál-értékre van állítva, az
 * induláskori ENV-assert ÁTENGEDI (csak a kulcs meglétét nézi), és a hiba
 * először itt jelentkezik — gát nélkül futásonként 25 hibás Barion-hívással és
 * 25 error-sorral. A megszakítás nem kapcsolja ki a funkciót: a következő
 * ütemezett futás újrapróbálja, és a kulcs javítása után azonnal működik.
 */
describe('order-poll — rendszerszintű Barion-hiba megszakítja a futást', () => {
  function pendingBatch(count: number): Order[] {
    return Array.from({ length: count }, (_, index) =>
      createPendingOrder({ id: 300 + index, orderNumber: `KH-2026-00${300 + index}` }),
    )
  }

  it('hitelesítési hiba (HTTP 401) → az ELSŐ rendelés után megáll, a többi skipped', async () => {
    const orders = pendingBatch(4)
    const { payload, onPaid, queueInvoice } = setup({ pending: orders })
    let calls = 0
    const fetchState = async (): Promise<BarionPaymentStateResponse> => {
      calls += 1
      throw new BarionApiError({
        message: 'Barion API hiba (HTTP 401, GET /v4/Payment/…/PaymentState).',
        kind: 'http',
        endpoint: 'GET /v4/Payment/{PaymentId}/PaymentState',
        httpStatus: 401,
      })
    }

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })

    expect(calls).toBe(1)
    expect(summary.scanned).toBe(4)
    expect(summary.failed).toBe(1)
    expect(summary.skipped).toBe(3)
  })

  it.each([
    ['timeout', new BarionApiError({ message: 'timeout', kind: 'timeout', endpoint: 'GET x' })],
    ['network', new BarionApiError({ message: 'network', kind: 'network', endpoint: 'GET x' })],
    [
      'HTTP 503',
      new BarionApiError({ message: '503', kind: 'http', endpoint: 'GET x', httpStatus: 503 }),
    ],
    [
      'provider AuthenticationFailed',
      new BarionApiError({
        message: 'auth',
        kind: 'provider',
        endpoint: 'GET x',
        httpStatus: 200,
        providerErrors: [
          { ErrorCode: 'AuthenticationFailed', Title: 'Hitelesítés', Description: '' },
        ],
      }),
    ],
  ])('%s → rendszerszintű, megszakít', async (_label, error) => {
    const orders = pendingBatch(3)
    const { payload, onPaid, queueInvoice } = setup({ pending: orders })
    let calls = 0
    const fetchState = async (): Promise<BarionPaymentStateResponse> => {
      calls += 1
      throw error
    }

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })

    expect(calls).toBe(1)
    expect(summary.skipped).toBe(2)
  })

  /**
   * A 404 EGY fizetésre vonatkozik (nincs ilyen PaymentId), nem az egész
   * integrációra — a többi rendelést tovább KELL pollolni, különben egyetlen
   * hibás rekord befagyasztaná az egész mentőhálót.
   */
  it('HTTP 404 (egy fizetés nem található) → NEM szakít meg, a többi rendelés lefut', async () => {
    const orders = pendingBatch(3)
    const { payload, onPaid, queueInvoice } = setup({ pending: orders })
    let calls = 0
    const fetchState = async (): Promise<BarionPaymentStateResponse> => {
      calls += 1
      throw new BarionApiError({
        message: '404',
        kind: 'http',
        endpoint: 'GET x',
        httpStatus: 404,
      })
    }

    const summary = await pollPendingOrders({
      payload,
      fetchState,
      onPaid,
      queueInvoice,
      invoicingEnabled: () => false,
      now: NOW,
    })

    expect(calls).toBe(3)
    expect(summary.failed).toBe(3)
    expect(summary.skipped).toBe(0)
  })

  it('a hibafajta-osztályozó nem BarionApiError-t nem minősít rendszerszintűnek', () => {
    expect(isSystemicBarionFailure(new Error('fetch failed'))).toBe(false)
    expect(isSystemicBarionFailure(undefined)).toBe(false)
    expect(
      isSystemicBarionFailure(
        new BarionApiError({ message: '404', kind: 'http', endpoint: 'GET x', httpStatus: 404 }),
      ),
    ).toBe(false)
  })
})
