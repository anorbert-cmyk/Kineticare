import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { refundOrder } from '../lib/refund/refund-order'
import type { IssueCorrectiveInvoiceDeps } from '../lib/szamlazz/corrective'
import type { IssueStornoForOrderDeps } from '../lib/szamlazz/storno'
import { SzamlazzApiError } from '../lib/szamlazz/types'
import type { Order, User } from '../payload-types'

/**
 * A visszatérítés BIZONYLAT-DÖNTÉSE (C4/C5): teljes refundnál stornó,
 * részlegesnél helyesbítő (módosító) számla — és az újrapróbálható
 * Számlázz.hu-hibák job-ba terelése.
 *
 * A Barion-oldal mockolt fetch-csel fut (a refund.test.ts mintája), a
 * Számlázz.hu-hívók injektálva — így a teszt kizárólag a döntési logikát és a
 * retry-bekötést vizsgálja.
 *
 * DUMMY érték, egyértelműen jelölve — NEM valódi Barion POSKey.
 */
const DUMMY_POS_KEY = 'DUMMY-POSKEY-NEM-VALODI-TITOK'

const PAYMENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const TRANSACTION_ID = 'tx-1111-2222'
const ORDER_NUMBER = 'KH-2026-000777'
const TOTAL_HUF = 20000

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const savedEnv: Record<string, string | undefined> = {}

beforeAll(() => {
  for (const key of ['BARION_API_URL', 'BARION_PAYEE_EMAIL', 'BARION_POSKEY_TEST']) {
    savedEnv[key] = process.env[key]
  }
  process.env.BARION_API_URL = 'https://api.test.barion.com'
  process.env.BARION_PAYEE_EMAIL = 'payee@example.test'
  process.env.BARION_POSKEY_TEST = DUMMY_POS_KEY
})

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

afterEach(() => {
  fetchMock.mockReset()
  vi.restoreAllMocks()
})

const ACTOR = { id: 1, role: 'owner' } as unknown as User

function createOrder(overrides: Record<string, unknown> = {}): Order {
  return {
    id: 555,
    orderNumber: ORDER_NUMBER,
    status: 'paid',
    totalHufSnapshot: TOTAL_HUF,
    amount: TOTAL_HUF,
    barionPaymentId: PAYMENT_ID,
    invoiceNumber: 'KIN-2026-7',
    invoiceStatus: 'issued',
    customer: 7,
    items: [{ product: 42, quantity: 1 }],
    ...overrides,
  } as unknown as Order
}

function createMockPayload(order: Order) {
  const queued: Array<{ task: string; input?: Record<string, unknown>; queue?: string }> = []
  const payload = {
    find: vi.fn(async ({ where }: { collection: string; where?: unknown }) => {
      const json = JSON.stringify(where ?? {})
      if (json.includes('not_equals')) {
        return { docs: [], totalDocs: 0 }
      }
      return { docs: [order], totalDocs: 1 }
    }),
    findByID: vi.fn(async () => ({ id: 7, purchases: [] }) as unknown as User),
    update: vi.fn(async (args: { collection: string; data: Record<string, unknown> }) => {
      if (args.collection === 'orders') {
        Object.assign(order, args.data)
      }
      return args.data
    }),
    create: vi.fn(async (args: { data: Record<string, unknown> }) => args.data),
    jobs: {
      queue: vi.fn(
        async (args: { task: string; input?: Record<string, unknown>; queue?: string }) => {
          queued.push(args)
          return { id: 1 }
        },
      ),
    },
  }
  return { payload: payload as unknown as Payload, queued, order }
}

function getStateResponse(): Response {
  return new Response(
    JSON.stringify({
      PaymentId: PAYMENT_ID,
      Status: 'Succeeded',
      Total: TOTAL_HUF,
      Transactions: [
        {
          TransactionId: TRANSACTION_ID,
          Total: TOTAL_HUF,
          Status: 'Succeeded',
          TransactionType: 'CardPayment',
        },
      ],
      Errors: [],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function refundResponse(amount: number, status = 'Refunded'): Response {
  return new Response(
    JSON.stringify({
      PaymentId: PAYMENT_ID,
      RefundedTransactions: [
        { TransactionId: TRANSACTION_ID, AmountToRefund: amount, Status: status },
      ],
      Errors: [],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

interface SpyCalls {
  storno: Array<IssueStornoForOrderDeps & { orderId: number }>
  corrective: Array<IssueCorrectiveInvoiceDeps & { orderId: number }>
}

function createSzamlazzSpies(
  behaviour: { stornoError?: unknown; correctiveError?: unknown } = {},
) {
  const calls: SpyCalls = { storno: [], corrective: [] }
  return {
    calls,
    issueStorno: async (order: Order, deps: IssueStornoForOrderDeps) => {
      calls.storno.push({ orderId: order.id, ...deps })
      if (behaviour.stornoError) {
        throw behaviour.stornoError
      }
      return { outcome: 'storned' as const, stornoNumber: 'KIN-2026-8' }
    },
    issueCorrective: async (order: Order, deps: IssueCorrectiveInvoiceDeps) => {
      calls.corrective.push({ orderId: order.id, ...deps })
      if (behaviour.correctiveError) {
        throw behaviour.correctiveError
      }
      return { outcome: 'issued' as const, correctiveInvoiceNumber: 'KIN-2026-9' }
    },
  }
}

describe('teljes vs. részleges visszatérítés — bizonylat-döntés', () => {
  it('TELJES refund → stornó készül, helyesbítő NEM', async () => {
    const { payload, order } = createMockPayload(createOrder())
    const spies = createSzamlazzSpies()
    fetchMock.mockResolvedValueOnce(getStateResponse()).mockResolvedValueOnce(refundResponse(TOTAL_HUF))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: { reason: 'Elállás' },
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.type).toBe('full')
    expect(spies.calls.corrective).toHaveLength(0)
    expect(spies.calls.storno).toHaveLength(1)
    expect(spies.calls.storno[0]).toMatchObject({ orderId: order.id, reason: 'Elállás' })
    // A szolgáltatás megkapja a Payload-példányt, hogy az állapotot rögzíthesse.
    expect(spies.calls.storno[0]?.payload).toBe(payload)
  })

  it('RÉSZLEGES refund → helyesbítő számla készül (a visszatérített összegre), stornó NEM', async () => {
    const { payload } = createMockPayload(createOrder())
    const spies = createSzamlazzSpies()
    fetchMock
      .mockResolvedValueOnce(getStateResponse())
      .mockResolvedValueOnce(refundResponse(5000, 'PartiallyRefunded'))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: { amountHuf: 5000, reason: 'Kedvezmény utólag' },
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.type).toBe('partial')
    expect(spies.calls.storno).toHaveLength(0)
    expect(spies.calls.corrective).toHaveLength(1)
    expect(spies.calls.corrective[0]).toMatchObject({
      amountHuf: 5000,
      refundSeq: 1,
      reason: 'Kedvezmény utólag',
    })
  })

  it('a MÁSODIK részrefund a következő sorszámot kapja (idempotencia-kulcs)', async () => {
    const existing = {
      transactionId: TRANSACTION_ID,
      amountHuf: 5000,
      status: 'PartiallyRefunded',
      refundedAt: '2026-08-01T10:00:00.000Z',
      type: 'partial',
    }
    const { payload } = createMockPayload(createOrder({ refunds: [existing] }))
    const spies = createSzamlazzSpies()
    fetchMock.mockResolvedValueOnce(refundResponse(3000, 'PartiallyRefunded'))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: { amountHuf: 3000 },
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.type).toBe('partial')
    expect(spies.calls.corrective[0]).toMatchObject({ refundSeq: 2, amountHuf: 3000 })
  })

  it('a maradékot lezáró refund TELJES ugyan, de a bizonylata HELYESBÍTŐ (nem stornó)', async () => {
    // A korábbi részrefundhoz már helyesbítő számla készült — az eredeti
    // számla teljes stornója a részösszeget MÁSODSZOR is jóváírná. A záró
    // refund bizonylata ezért újabb helyesbítő, a most visszatérített
    // összegre; a rendelés-státusz (refunded) ettől független.
    const existing = {
      transactionId: TRANSACTION_ID,
      amountHuf: 5000,
      status: 'PartiallyRefunded',
      refundedAt: '2026-08-01T10:00:00.000Z',
      type: 'partial',
    }
    const { payload } = createMockPayload(createOrder({ refunds: [existing] }))
    const spies = createSzamlazzSpies()
    fetchMock.mockResolvedValueOnce(refundResponse(TOTAL_HUF - 5000))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: {},
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.type).toBe('full')
    expect(result.orderStatus).toBe('refunded')
    expect(spies.calls.storno).toHaveLength(0)
    expect(spies.calls.corrective).toHaveLength(1)
    expect(spies.calls.corrective[0]).toMatchObject({
      refundSeq: 2,
      amountHuf: TOTAL_HUF - 5000,
    })
  })

  it('ELSŐ refundként teljes összeg → továbbra is stornó (nincs korábbi helyesbítő)', async () => {
    const { payload } = createMockPayload(createOrder())
    const spies = createSzamlazzSpies()
    fetchMock.mockResolvedValueOnce(getStateResponse()).mockResolvedValueOnce(refundResponse(TOTAL_HUF))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: {},
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.type).toBe('full')
    expect(spies.calls.storno).toHaveLength(1)
    expect(spies.calls.corrective).toHaveLength(0)
  })
})

describe('újrapróbálható Számlázz.hu-hiba → job sorba állítása', () => {
  const retryableError = new SzamlazzApiError({
    message: 'A Számlázz.hu nem válaszolt 15000 ms-en belül.',
    kind: 'timeout',
    retryable: true,
  })
  const permanentError = new SzamlazzApiError({
    message: 'Számla Agent elutasította a kiállítást',
    kind: 'agent',
    retryable: false,
  })

  it('stornó-timeout → storno-issue job sorba kerül, a refund eredménye VÁLTOZATLAN', async () => {
    const { payload, queued } = createMockPayload(createOrder())
    const spies = createSzamlazzSpies({ stornoError: retryableError })
    fetchMock.mockResolvedValueOnce(getStateResponse()).mockResolvedValueOnce(refundResponse(TOTAL_HUF))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: {},
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.orderStatus).toBe('refunded')
    expect(queued).toEqual([
      { task: 'storno-issue', input: { orderId: 555 }, queue: 'order-maintenance' },
    ])
  })

  it('helyesbítő-timeout → corrective-invoice-issue job sorba kerül a refund-sorszámmal', async () => {
    const { payload, queued } = createMockPayload(createOrder())
    const spies = createSzamlazzSpies({ correctiveError: retryableError })
    fetchMock
      .mockResolvedValueOnce(getStateResponse())
      .mockResolvedValueOnce(refundResponse(5000, 'PartiallyRefunded'))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: { amountHuf: 5000 },
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.type).toBe('partial')
    expect(queued).toEqual([
      {
        task: 'corrective-invoice-issue',
        input: { orderId: 555, refundSeq: 1 },
        queue: 'order-maintenance',
      },
    ])
  })

  it('NEM újrapróbálható hibánál nincs job (emberi beavatkozás kell)', async () => {
    const { payload, queued } = createMockPayload(createOrder())
    const spies = createSzamlazzSpies({ stornoError: permanentError })
    fetchMock.mockResolvedValueOnce(getStateResponse()).mockResolvedValueOnce(refundResponse(TOTAL_HUF))

    const result = await refundOrder({
      payload,
      orderNumber: ORDER_NUMBER,
      input: {},
      actor: ACTOR,
      issueStorno: spies.issueStorno,
      issueCorrective: spies.issueCorrective,
    })

    expect(result.orderStatus).toBe('refunded')
    expect(queued).toHaveLength(0)
  })
})
