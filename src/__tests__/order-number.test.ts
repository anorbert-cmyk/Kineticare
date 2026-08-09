import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import {
  formatOrderNumber,
  generateOrderNumber,
  ORDER_NUMBER_PATTERN,
  parseOrderNumberSequence,
} from '../lib/order-number'
import configPromise from '../payload.config'

/**
 * T-017: rendelésszám-generátor tesztek.
 * Az egységtesztek env nélkül futnak; a DB-részek csak DATABASE_URI +
 * PAYLOAD_SECRET mellett (helyi validáció / jövőbeli CI), egyébként kihagyva.
 */

describe('orderNumber formátum (egység)', () => {
  it('KH-<év>-<6 jegyű> formátumot állít elő, nullákkal paddingelve', () => {
    expect(formatOrderNumber(2026, 123)).toBe('KH-2026-000123')
    expect(formatOrderNumber(2026, 1)).toBe('KH-2026-000001')
    expect(formatOrderNumber(2030, 999999)).toBe('KH-2030-999999')
  })

  it('a generált érték illeszkedik a ORDER_NUMBER_PATTERN-re', () => {
    expect(ORDER_NUMBER_PATTERN.test(formatOrderNumber(2026, 42))).toBe(true)
    expect(ORDER_NUMBER_PATTERN.test('KH-2026-123')).toBe(false)
    expect(ORDER_NUMBER_PATTERN.test('XX-2026-000123')).toBe(false)
  })

  it('parseOrderNumberSequence visszafejti a sorszámot, érvénytelenre null', () => {
    expect(parseOrderNumberSequence('KH-2026-000123')).toBe(123)
    expect(parseOrderNumberSequence('KH-2026-000001')).toBe(1)
    expect(parseOrderNumberSequence('nem-rendelésszám')).toBeNull()
    expect(parseOrderNumberSequence('KH-2026-123')).toBeNull()
  })

  it('format → parse round-trip', () => {
    expect(parseOrderNumberSequence(formatOrderNumber(2027, 654321))).toBe(654321)
  })
})

const hasDb = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)

describe.skipIf(!hasDb)('orderNumber generálás (DB)', () => {
  let payload: Payload
  const createdOrderIds: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: configPromise })
  })

  afterAll(async () => {
    for (const id of createdOrderIds) {
      await payload.delete({ collection: 'orders', id, overrideAccess: true })
    }
    await payload.db?.destroy?.()
  })

  const createOrder = async () => {
    const order = await payload.create({
      collection: 'orders',
      data: {},
      overrideAccess: true,
    })
    createdOrderIds.push(order.id)
    return order as unknown as { id: number; orderNumber?: string | null }
  }

  it('create-kor a hook tölti, formátuma és egyedisége adott', async () => {
    const first = await createOrder()
    const second = await createOrder()

    expect(first.orderNumber).toMatch(ORDER_NUMBER_PATTERN)
    expect(second.orderNumber).toMatch(ORDER_NUMBER_PATTERN)
    expect(second.orderNumber).not.toBe(first.orderNumber)

    // Ugyanabban az évben egymást követő sorszámok.
    const firstSeq = parseOrderNumberSequence(first.orderNumber as string)
    const secondSeq = parseOrderNumberSequence(second.orderNumber as string)
    expect(secondSeq).toBe((firstSeq as number) + 1)
  })

  it('a kliens által küldött orderNumber figyelmen kívül marad', async () => {
    const order = await payload.create({
      collection: 'orders',
      data: { orderNumber: 'KH-1999-999999' } as Record<string, unknown>,
      overrideAccess: true,
    })
    createdOrderIds.push(order.id)

    const cast = order as unknown as { orderNumber?: string | null }
    expect(cast.orderNumber).toMatch(ORDER_NUMBER_PATTERN)
    expect(cast.orderNumber).not.toBe('KH-1999-999999')
  })

  it('update-kor nem számolódik újra', async () => {
    const order = await createOrder()
    const original = order.orderNumber

    const updated = await payload.update({
      collection: 'orders',
      id: order.id,
      // A saját Barion-állapotgép enumjának érvényes értéke (a plugin gyári
      // 'completed' státusza nálunk nem létezik — az order-status modul enumja
      // a forrás-igazság).
      data: { status: 'paid' } as Record<string, unknown>,
      overrideAccess: true,
    })

    expect((updated as unknown as { orderNumber?: string | null }).orderNumber).toBe(original)
  })

  it('generateOrderNumber a meglévő legnagyobb sorszámból lép tovább', async () => {
    const order = await createOrder()
    const next = await generateOrderNumber(payload)

    expect(parseOrderNumberSequence(next)).toBe(
      (parseOrderNumberSequence(order.orderNumber as string) as number) + 1,
    )
  })
})
