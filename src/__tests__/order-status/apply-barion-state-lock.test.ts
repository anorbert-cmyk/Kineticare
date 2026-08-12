import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { BarionPaymentStateResponse } from '../../lib/barion'
import { createLogger } from '../../lib/logger'
import {
  applyBarionStateTransition,
  orderTransitionLockKey,
} from '../../lib/order-status/apply-barion-state'
import type { Order, User } from '../../payload-types'

/**
 * M5 — a paid-átmenet ATOMIKUSSÁGA (src/lib/order-status/apply-barion-state.ts).
 *
 * A check-then-act versenyhelyzet, amit a zár bezár: a Barion-callback és az
 * order-poll job PÁRHUZAMOSAN is átállíthatja ugyanazt a rendelést. Zár nélkül
 * mindkét szál a payment_pending kiindulást olvasta, így mindkettő
 * transitionedToPaid=true-t kapott, és az onOrderPaid-lánc (jogosultság-grant,
 * számla-queue, visszaigazoló e-mail) KÉTSZER futott.
 *
 * A tesztek a VALÓDI withAdvisoryLockot futtatják (nincs modul-mock): a
 * drizzle-példány szerkezeti utánzata FIFO-sorban sorosítja a tranzakciókat,
 * mint a Postgres advisory-zár. Így bizonyítjuk, hogy
 *  - a zár a rendelés-szintű `order-transition:order:<id>` kulccsal, a döntés
 *    ELŐTT kerül megszerzésre, és a kulcs KÖTÖTT paraméterként utazik,
 *  - a rendelés a záron BELÜL olvasódik újra (findByID a zár megszerzése után),
 *  - két párhuzamos paid-átmenetből PONTOSAN EGY transitionedToPaid=true,
 *  - a paid↔cancelled verseny a FRISS állapoton dől el (a visszaállítás-tiltás
 *    az elavult példányon is megmarad).
 */

const ORDER_TOTAL_HUF = 19990
const ORDER_ID = 101
const PRODUCT_ID = 42
const CUSTOMER_ID = 7

interface CapturedQuery {
  sql: string
  params: unknown[]
}

/**
 * Szerkezeti drizzle-mock, amely FIFO-lánccal SOROSÍTJA a tranzakciókat — így a
 * Promise.all-szal indított párhuzamos átmenetek úgy futnak, mintha a Postgres
 * advisory-zár sorba rendezné őket (advisory-lock.test.ts felülete + mutex).
 */
function createSerializingDrizzle(events: string[]) {
  const queries: CapturedQuery[] = []
  let chain: Promise<unknown> = Promise.resolve()
  const drizzle = {
    transaction: async <T>(
      run: (tx: { execute: (query: unknown) => Promise<unknown> }) => Promise<T>,
    ): Promise<T> => {
      const result = chain.then(() => {
        events.push('transaction-start')
        return run({
          execute: async (query: unknown) => {
            // A zárkulcs KÖTÖTT paraméterként érkezik — a kinyerés módja az
            // advisory-lock.test.ts-ból ismert (StringChunk vs. param chunk).
            const candidate = query as { queryChunks?: unknown[] }
            const chunks = Array.isArray(candidate.queryChunks) ? candidate.queryChunks : []
            const text: string[] = []
            const params: unknown[] = []
            for (const chunk of chunks) {
              const stringChunk =
                typeof chunk === 'object' && chunk !== null
                  ? (chunk as { value?: unknown }).value
                  : undefined
              if (Array.isArray(stringChunk)) {
                text.push(stringChunk.join(''))
              } else {
                params.push(chunk)
              }
            }
            queries.push({ sql: text.join(''), params })
            events.push('lock-acquired')
            return { rows: [] }
          },
        }).finally(() => {
          events.push('transaction-end')
        })
      })
      // A lánc hibatűrő: egy elbukó védett szakasz nem akasztja meg a sort.
      chain = result.catch(() => undefined)
      return result
    },
  }
  return { drizzle, queries }
}

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: ORDER_ID,
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

function createMockPayload(order: Order, events: string[]) {
  const user = { id: CUSTOMER_ID, email: 'vevo@example.test', purchases: [] as number[] } as
    unknown as User
  const { drizzle, queries } = createSerializingDrizzle(events)
  const updates: Array<{ collection: string; data: Record<string, unknown> }> = []
  const payload = {
    db: { drizzle },
    findByID: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'orders') {
        events.push('order-reread')
        return order
      }
      return user
    }),
    update: vi.fn(async (args: { collection: string; data: Record<string, unknown> }) => {
      updates.push({ collection: args.collection, data: args.data })
      if (args.collection === 'orders') {
        Object.assign(order, args.data)
      }
      if (args.collection === 'users') {
        Object.assign(user, args.data)
      }
      return args.data
    }),
  }
  return { payload: payload as unknown as Payload, queries, updates, user }
}

const paidInput = (
  payload: Payload,
  order: Order,
): Parameters<typeof applyBarionStateTransition>[0] => ({
  payload,
  order,
  mapped: 'paid',
  state: createState(),
  log: createLogger(),
})

describe('M5 — rendelés-szintű advisory-zár a paid/cancelled átmeneten', () => {
  it('a zár a rendelésre szabott kulccsal, a döntés ELŐTT jön létre, és a rendelés a záron BELÜL olvasódik újra', async () => {
    const events: string[] = []
    const order = createOrder()
    const { payload, queries } = createMockPayload(order, events)

    await applyBarionStateTransition(paidInput(payload, order))

    // A kulcs a meglévő konvenciót követi (`<scope>:order:<id>`, mint a refund).
    expect(orderTransitionLockKey(ORDER_ID)).toBe(`order-transition:order:${ORDER_ID}`)
    expect(queries).toHaveLength(1)
    expect(queries[0]?.sql).toContain('pg_advisory_xact_lock')
    expect(queries[0]?.params).toEqual([`order-transition:order:${ORDER_ID}`])
    // Sorrend: zár megszerzése → FRISS újraolvasás → tranzakció vége.
    expect(events).toEqual(['transaction-start', 'lock-acquired', 'order-reread', 'transaction-end'])
  })

  it('két PÁRHUZAMOS paid-átmenetből PONTOSAN EGY transitionedToPaid=true (az onOrderPaid egyszer futhat)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const events: string[] = []
    const order = createOrder()
    const { payload, updates, user } = createMockPayload(order, events)

    const [first, second] = await Promise.all([
      applyBarionStateTransition(paidInput(payload, order)),
      applyBarionStateTransition(paidInput(payload, order)),
    ])

    const transitions = [first, second]
    expect(transitions.every((result) => result.action === 'paid')).toBe(true)
    // A lényeg: a friss paid-átmenet — és vele az onOrderPaid trigger — egyszeri.
    expect(transitions.filter((result) => result.transitionedToPaid === true)).toHaveLength(1)
    expect(transitions.filter((result) => result.duplicate === true)).toHaveLength(1)
    // Egyetlen paid státusz-írás és egyetlen purchases-beírás történt.
    expect(
      updates.filter(
        (entry) => entry.collection === 'orders' && entry.data.status === 'paid',
      ),
    ).toHaveLength(1)
    expect(updates.filter((entry) => entry.collection === 'users')).toHaveLength(1)
    expect(order.status).toBe('paid')
    expect(user.purchases).toEqual([PRODUCT_ID])
  })

  it('paid↔cancelled verseny: a cancelled jelzés a FRISS (már paid) állapoton akad el — nincs visszaállítás', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const events: string[] = []
    const order = createOrder()
    const { payload, updates } = createMockPayload(order, events)

    // A „callback" paid-re állít, miközben a „poll" még az ELAVULT
    // payment_pending példánnyal futtatja a cancelled átmenetet.
    const staleOrder = createOrder()
    const [paidResult, cancelResult] = await Promise.all([
      applyBarionStateTransition(paidInput(payload, order)),
      applyBarionStateTransition({
        payload,
        order: staleOrder,
        mapped: 'cancelled',
        state: createState({ Status: 'Canceled' }),
        log: createLogger(),
      }),
    ])

    expect(paidResult.action).toBe('paid')
    // A cancelled ág a záron belüli friss olvasáson paid-et lát → állapotgép-védelem.
    expect(cancelResult).toEqual({ action: 'rejected', reason: 'paid-cancel-rejected' })
    expect(order.status).toBe('paid')
    expect(
      updates.filter(
        (entry) => entry.collection === 'orders' && entry.data.status === 'cancelled',
      ),
    ).toHaveLength(0)
  })

  it('a payment_pending ág NEM foglal zárat (nincs írás — nincs mit sorosítani)', async () => {
    const events: string[] = []
    const order = createOrder()
    const { payload, queries } = createMockPayload(order, events)

    const result = await applyBarionStateTransition({
      payload,
      order,
      mapped: 'payment_pending',
      state: createState({ Status: 'Started' }),
      log: createLogger(),
    })

    expect(result).toEqual({ action: 'pending' })
    expect(queries).toHaveLength(0)
    expect(events).toHaveLength(0)
  })
})
