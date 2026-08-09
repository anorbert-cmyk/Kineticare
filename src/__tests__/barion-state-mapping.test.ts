import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import type { BarionPaymentStateResponse, BarionPaymentStatus } from '../lib/barion/types'
import { mapBarionPaymentStatus, type OrderPaymentState } from '../lib/barion/state'
import { applyBarionStateTransition } from '../lib/order-status/apply-barion-state'
import { createLogger } from '../lib/logger'
import type { Order } from '../payload-types'

/**
 * M-07 — a Barion fizetésállapotok TELJES készletének leképezése.
 *
 * A korábbi implementáció csak öt ágat kezelt, minden mást (köztük a VÉGLEGES
 * `Failed` státuszt) csendes defaulttal payment_pending-re képezett. A `Failed`
 * fizetés így örökre függő maradt: az order-poll 5 percenként újrapollolta, 24
 * óra után csak riasztott, lezárni pedig sosem tudta (a lejárat-alapú lezárás
 * csak a barionPaymentId NÉLKÜLI, árva rendelésekre fut).
 *
 * A teszt egyszerre őrzi a leképezést és azt, hogy a javítás NEM töri az
 * állapotgép invariánsait (paid rendelést semmilyen jelzés nem billenthet ki).
 */

const logOutput = (spy: MockInstance<(...args: unknown[]) => void>): string =>
  spy.mock.calls.map((call) => call.map((arg) => String(arg)).join(' ')).join('\n')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mapBarionPaymentStatus — teljes státuszkészlet (M-07)', () => {
  /**
   * A types.ts BarionPaymentStatus uniója. A tömb típusa kikényszeríti, hogy ha
   * a Barion-típus bővül, ez a lista is bővüljön — nem maradhat lefedetlen ág.
   */
  const ALL_STATUSES: Record<BarionPaymentStatus, OrderPaymentState> = {
    Succeeded: 'paid',
    Canceled: 'cancelled',
    Expired: 'cancelled',
    Failed: 'cancelled',
    Prepared: 'payment_pending',
    Started: 'payment_pending',
    InProgress: 'payment_pending',
    Waiting: 'payment_pending',
    Reserved: 'payment_pending',
    Authorized: 'payment_pending',
    PartiallySucceeded: 'payment_pending',
  }

  it.each(Object.entries(ALL_STATUSES))('%s → %s', (status, expected) => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(mapBarionPaymentStatus(status)).toBe(expected)
  })

  it('a Failed VÉGÁLLAPOT (cancelled), nem függő — különben a rendelés örökre payment_pending maradna', () => {
    expect(mapBarionPaymentStatus('Failed')).toBe('cancelled')
    expect(mapBarionPaymentStatus('Failed')).not.toBe('payment_pending')
  })

  it('paid-et KIZÁRÓLAG a Succeeded ad (konzervatív alapelv)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const paidStatuses = Object.entries(ALL_STATUSES).filter(([, mapped]) => mapped === 'paid')
    expect(paidStatuses).toEqual([['Succeeded', 'paid']])
    expect(mapBarionPaymentStatus('ValamiUjStatusz')).not.toBe('paid')
  })
})

describe('mapBarionPaymentStatus — figyelmeztetett ágak (nincs csendes default)', () => {
  it('ismeretlen/jövőbeli státusz: payment_pending + figyelmeztetés a naplóban', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(mapBarionPaymentStatus('ValamiUjStatusz')).toBe('payment_pending')

    const logs = logOutput(logSpy)
    expect(logs).toContain('ismeretlen')
    expect(logs).toContain('ValamiUjStatusz')
  })

  it('PartiallySucceeded: payment_pending + figyelmeztetés (részben teljesült fizetés sosem paid)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(mapBarionPaymentStatus('PartiallySucceeded')).toBe('payment_pending')

    expect(logOutput(logSpy)).toContain('részben teljesült')
  })

  it('Reserved/Authorized: payment_pending + figyelmeztetés (Immediate fizetésnél nem fordulhatna elő)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(mapBarionPaymentStatus('Reserved')).toBe('payment_pending')
    expect(mapBarionPaymentStatus('Authorized')).toBe('payment_pending')

    expect(logOutput(logSpy)).toContain('foglalásos')
  })

  it('a normális, átmeneti állapotok NEM zajosítják a naplót', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    for (const status of ['Prepared', 'Started', 'InProgress', 'Waiting', 'Succeeded', 'Failed']) {
      mapBarionPaymentStatus(status)
    }

    expect(logSpy).not.toHaveBeenCalled()
  })
})

describe('állapotgép-invariánsok a javított leképezéssel', () => {
  const log = createLogger({ module: 'teszt' })

  function createOrder(status: Order['status']): Order {
    return {
      id: 555,
      orderNumber: 'KH-2026-000777',
      status,
      customer: 7,
      items: [{ product: 42, quantity: 1 }],
    } as unknown as Order
  }

  /**
   * Nyers GetState-válasz az átmenet-hívásokhoz. A vizsgált ágak nem
   * paid-átmenetek, így az összeg-assert nem fut — a Total/Currency csak a
   * kötelező alakot adja (a rendelés-fixtúrával konzisztens értékekkel).
   */
  function createState(status: BarionPaymentStatus): BarionPaymentStateResponse {
    return {
      PaymentId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeffff0000',
      Status: status,
      Total: 19900,
      Currency: 'HUF',
      Transactions: [],
    }
  }

  function mockPayload() {
    const updates: Array<{ collection: string; data: Record<string, unknown> }> = []
    const payload = {
      update: vi.fn(async (args: { collection: string; data: Record<string, unknown> }) => {
        updates.push(args)
        return args.data
      }),
      findByID: vi.fn(async () => ({ id: 7, purchases: [42] })),
    }
    return { payload: payload as unknown as Payload, updates }
  }

  it('Failed → cancelled: a függő rendelés LEZÁRUL (a beragadás megszűnik)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { payload, updates } = mockPayload()

    const transition = await applyBarionStateTransition({
      payload,
      order: createOrder('payment_pending'),
      mapped: mapBarionPaymentStatus('Failed'),
      state: createState('Failed'),
      log,
    })

    expect(transition.action).toBe('cancelled')
    expect(updates).toHaveLength(1)
    expect(updates[0]?.data.status).toBe('cancelled')
  })

  it('paid rendelést a Failed sem billentheti ki (állapotgép-védelem marad)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { payload, updates } = mockPayload()

    const transition = await applyBarionStateTransition({
      payload,
      order: createOrder('paid'),
      mapped: mapBarionPaymentStatus('Failed'),
      state: createState('Failed'),
      log,
    })

    expect(transition.action).toBe('rejected')
    expect(transition.reason).toBe('paid-cancel-rejected')
    expect(updates).toHaveLength(0)
  })

  it('PartiallySucceeded → pending: a rendelés NEM lesz paid és nem is zárul le', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const { payload, updates } = mockPayload()

    const transition = await applyBarionStateTransition({
      payload,
      order: createOrder('payment_pending'),
      mapped: mapBarionPaymentStatus('PartiallySucceeded'),
      state: createState('PartiallySucceeded'),
      log,
    })

    expect(transition.action).toBe('pending')
    expect(updates).toHaveLength(0)
  })
})
