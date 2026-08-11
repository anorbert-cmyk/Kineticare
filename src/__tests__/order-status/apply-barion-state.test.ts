import type { Payload } from 'payload'
import { describe, expect, it, vi, type MockInstance } from 'vitest'

import type { BarionPaymentStateResponse } from '../../lib/barion'
import { createLogger } from '../../lib/logger'
import {
  applyBarionStateTransition,
  assertPaymentAmountMatches,
} from '../../lib/order-status/apply-barion-state'
import type { Order, User } from '../../payload-types'

/**
 * S2 — ÖSSZEG-ASSERT az állapotgép KÖZÖS MAGJÁN.
 *
 * A Barion `Succeeded` státusz csak annyit jelent, hogy „valamilyen fizetés
 * sikerült"; azt nem, hogy MENNYI és MILYEN devizában. A PaymentId nem titok
 * (a vevő látja a saját redirect-URL-jében), a callback-payload pedig önmagában
 * nem bizonyíték — ezért a paid-átmenet előtt a GetState Total/Currency mezőjét
 * a rendelés SZERVER-OLDALI snapshotjához (totalHufSnapshot + currency) mérjük.
 *
 * A négy vizsgált eset: egyezés → paid; Total-eltérés → rejected;
 * Currency-eltérés → rejected; hiányzó érték → rejected (konzervatív).
 */

const ORDER_TOTAL_HUF = 19990
const PRODUCT_ID = 42
const CUSTOMER_ID = 7

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 101,
    orderNumber: 'KH-2026-000123',
    status: 'payment_pending',
    customer: CUSTOMER_ID,
    currency: 'HUF',
    totalHufSnapshot: ORDER_TOTAL_HUF,
    items: [{ product: PRODUCT_ID, quantity: 1 }],
    ...overrides,
  } as unknown as Order
}

function createState(overrides: Partial<BarionPaymentStateResponse> = {}): BarionPaymentStateResponse {
  return {
    PaymentId: '11111111-2222-3333-4444-555555555555',
    PaymentRequestId: 'KH-2026-000123',
    Status: 'Succeeded',
    Total: ORDER_TOTAL_HUF,
    Currency: 'HUF',
    Transactions: [],
    ...overrides,
  }
}

function createMockPayload(order: Order) {
  const user = { id: CUSTOMER_ID, email: 'vevo@example.test', purchases: [] as number[] } as
    unknown as User
  const updates: Array<{ collection: string; data: Record<string, unknown> }> = []
  const payload = {
    // Az M5 zár a záron belül findByID-val OLVASSA ÚJRA a rendelést — a mock
    // ezért collection-tudatos: 'orders'-re a teszt rendelése, 'users'-re a vevő.
    findByID: vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'orders' ? order : user,
    ),
    update: vi.fn(async (args: { collection: string; data: Record<string, unknown> }) => {
      updates.push({ collection: args.collection, data: args.data })
      if (args.collection === 'users') {
        Object.assign(user, args.data)
      }
      if (args.collection === 'orders') {
        Object.assign(order, args.data)
      }
      return args.data
    }),
  }
  return { payload: payload as unknown as Payload, updates, user }
}

const logOutput = (spy: MockInstance<(...args: unknown[]) => void>): string =>
  spy.mock.calls.map((call) => call.map((arg) => String(arg)).join(' ')).join('\n')

describe('assertPaymentAmountMatches — a tiszta összeg-ellenőrző', () => {
  it('egyezés (azonos Total és Currency) → ok', () => {
    expect(assertPaymentAmountMatches(createOrder(), createState())).toMatchObject({ ok: true })
  })

  it('kisebb Total → total-differs', () => {
    expect(assertPaymentAmountMatches(createOrder(), createState({ Total: 1 }))).toMatchObject({
      ok: false,
      detail: 'total-differs',
      expectedTotal: ORDER_TOTAL_HUF,
      actualTotal: 1,
    })
  })

  it('eltérő deviza → currency-differs (az összeg-egyezés önmagában NEM elég)', () => {
    expect(assertPaymentAmountMatches(createOrder(), createState({ Currency: 'EUR' }))).toMatchObject(
      { ok: false, detail: 'currency-differs' },
    )
  })

  it('a deviza összehasonlítása kis-nagybetű- és szóköz-tűrő', () => {
    expect(assertPaymentAmountMatches(createOrder(), createState({ Currency: ' huf ' }))).toMatchObject(
      { ok: true },
    )
  })

  it.each([
    ['hiányzó Total a válaszban', { Total: undefined }, 'state-total-missing'],
    ['hiányzó Currency a válaszban', { Currency: undefined }, 'state-currency-missing'],
  ])('%s → konzervatív bukás (%s)', (_label, overrides, detail) => {
    expect(
      assertPaymentAmountMatches(createOrder(), createState(overrides as Partial<BarionPaymentStateResponse>)),
    ).toMatchObject({ ok: false, detail })
  })

  it.each([
    ['hiányzó totalHufSnapshot', { totalHufSnapshot: null }, 'order-total-missing'],
    ['hiányzó currency', { currency: null }, 'order-currency-missing'],
  ])('a rendelés oldalán %s → konzervatív bukás (%s)', (_label, overrides, detail) => {
    expect(
      assertPaymentAmountMatches(createOrder(overrides as Partial<Order>), createState()),
    ).toMatchObject({ ok: false, detail })
  })
})

describe('applyBarionStateTransition — paid-átmenet összeg-assert', () => {
  it('(1) EGYEZÉS → paid: státusz-írás + purchases-jogosultság + transitionedToPaid', async () => {
    const order = createOrder()
    const { payload, updates, user } = createMockPayload(order)

    const result = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'paid',
      state: createState(),
      log: createLogger(),
    })

    expect(result).toMatchObject({ action: 'paid', transitionedToPaid: true, purchasesGranted: 1 })
    expect(updates.filter((entry) => entry.collection === 'orders')).toEqual([
      { collection: 'orders', data: { status: 'paid' } },
    ])
    expect(user.purchases).toEqual([PRODUCT_ID])
  })

  it('(2) TOTAL-ELTÉRÉS → rejected/total-mismatch: se státusz, se jogosultság, riasztás', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const order = createOrder()
    const { payload, updates, user } = createMockPayload(order)

    const result = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'paid',
      state: createState({ Total: 1 }),
      log: createLogger(),
    })

    expect(result).toEqual({ action: 'rejected', reason: 'total-mismatch' })
    expect(updates).toHaveLength(0)
    expect(user.purchases).toEqual([])
    const logs = logOutput(logSpy)
    expect(logs).toContain('RIASZT')
    expect(logs).toContain('total-differs')
    logSpy.mockRestore()
  })

  it('(3) CURRENCY-ELTÉRÉS → rejected/total-mismatch (azonos szám, más deviza)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const order = createOrder()
    const { payload, updates, user } = createMockPayload(order)

    const result = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'paid',
      state: createState({ Currency: 'EUR' }),
      log: createLogger(),
    })

    expect(result).toEqual({ action: 'rejected', reason: 'total-mismatch' })
    expect(updates).toHaveLength(0)
    expect(user.purchases).toEqual([])
    expect(logOutput(logSpy)).toContain('currency-differs')
    logSpy.mockRestore()
  })

  it('(4) HIÁNYZÓ Total/Currency → rejected/total-mismatch (konzervatív elutasítás)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const order = createOrder()
    const { payload, updates, user } = createMockPayload(order)

    const result = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'paid',
      state: createState({ Total: undefined, Currency: undefined }),
      log: createLogger(),
    })

    expect(result).toEqual({ action: 'rejected', reason: 'total-mismatch' })
    expect(updates).toHaveLength(0)
    expect(user.purchases).toEqual([])
    expect(logOutput(logSpy)).toContain('RIASZT')
    logSpy.mockRestore()
  })

  it('MÁR paid rendelés + eltérő Total → a jogosultság-kijavítás sem fut le', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const order = createOrder({ status: 'paid' })
    const { payload, updates, user } = createMockPayload(order)

    const result = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'paid',
      state: createState({ Total: 1 }),
      log: createLogger(),
    })

    expect(result).toEqual({ action: 'rejected', reason: 'total-mismatch' })
    expect(updates).toHaveLength(0)
    expect(user.purchases).toEqual([])
    logSpy.mockRestore()
  })

  it('a cancelled és a pending ág NEM függ az összegtől (csak a paid-átmenet védett)', async () => {
    const order = createOrder()
    const { payload, updates } = createMockPayload(order)

    const pending = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'payment_pending',
      state: createState({ Total: undefined, Currency: undefined, Status: 'Started' }),
      log: createLogger(),
    })
    expect(pending).toEqual({ action: 'pending' })

    const cancelled = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'cancelled',
      state: createState({ Total: undefined, Currency: undefined, Status: 'Canceled' }),
      log: createLogger(),
    })
    expect(cancelled).toEqual({ action: 'cancelled' })
    expect(updates).toEqual([{ collection: 'orders', data: { status: 'cancelled' } }])
  })
})
