import { describe, expect, it, vi } from 'vitest'

import {
  mapOrderDocToRevenueInput,
  queryRevenueReport,
  readStatisticsPages,
  type StatisticsOrderDoc,
} from '../lib/statistics/query'

/**
 * A lekérdezés-leképezés: depth=1 audience, a refunds mező ki van zárva.
 * Mockolt Payload.find — nincs valódi DB.
 */

describe('mapOrderDocToRevenueInput', () => {
  it('a beágyazott product.audience-t tételenként átadja', () => {
    const mapped = mapOrderDocToRevenueInput({
      status: 'paid',
      createdAt: '2026-08-01T10:00:00.000Z',
      invoiceCompletionDate: '2026-08-01',
      totalHufSnapshot: 199500,
      items: [
        {
          product: { id: 1, audience: 'laikus' },
          quantity: 1,
          titleSnapshot: 'Otthoni',
          priceHufSnapshot: 79500,
        },
        {
          product: { id: 2, audience: 'szakember' },
          quantity: 1,
          titleSnapshot: 'Szakmai',
          priceHufSnapshot: 120000,
        },
      ],
    })
    expect(mapped.items[0]?.audience).toBe('laikus')
    expect(mapped.items[1]?.audience).toBe('szakember')
    expect(mapped.totalHuf).toBe(199500)
  })

  it('ha a product csak azonosító, az audience undefined (laikus fallback)', () => {
    const mapped = mapOrderDocToRevenueInput({
      status: 'paid',
      createdAt: '2026-08-01T10:00:00.000Z',
      items: [{ product: 12, quantity: 1, priceHufSnapshot: 1000, titleSnapshot: 'X' }],
    })
    expect(mapped.items[0]?.audience).toBeUndefined()
  })
})

describe('queryRevenueReport', () => {
  it('csak a kért mezőket kéri, a refunds kulcs nincs a selectben', async () => {
    const paidDoc: StatisticsOrderDoc = {
      status: 'paid',
      createdAt: '2026-08-10T10:00:00.000Z',
      totalHufSnapshot: 1000,
      items: [
        {
          product: { audience: 'laikus' },
          quantity: 1,
          priceHufSnapshot: 1000,
          titleSnapshot: 'Otthoni',
        },
      ],
    }
    const find = vi.fn(async (args: { collection: string; where?: unknown }) => {
      if (args.where) {
        return { docs: [paidDoc], hasNextPage: false, totalDocs: 1 }
      }
      return {
        docs: [{ status: 'paid' }, { status: 'payment_failed' }],
        hasNextPage: false,
        totalDocs: 2,
      }
    })

    const report = await queryRevenueReport({
      payload: { find } as never,
      now: new Date('2026-08-20T12:00:00Z'),
      months: 1,
    })

    expect(find).toHaveBeenCalled()
    for (const call of find.mock.calls) {
      const args = call[0] as { select?: Record<string, unknown>; depth?: number }
      expect(args.select).toBeDefined()
      expect(args.select).not.toHaveProperty('refunds')
      expect(args.select).not.toHaveProperty('customerSnapshot')
      expect(args.select).not.toHaveProperty('ipAddress')
    }
    const paidCall = find.mock.calls.find((call) => {
      const args = call[0] as { where?: unknown; depth?: number }
      return args.where !== undefined
    })
    expect((paidCall?.[0] as { depth?: number }).depth).toBe(1)
    expect(report.totals.totalHuf).toBe(1000)
    expect(report.funnel.paid).toBe(1)
    expect(report.funnel.paymentFailed).toBe(1)
  })

  it('szám-product és { id } stub audience-ét products.find pótolja, id is a selectben van', async () => {
    const paidDocs: StatisticsOrderDoc[] = [
      {
        status: 'paid',
        createdAt: '2026-08-10T10:00:00.000Z',
        items: [
          { product: 41, quantity: 1, priceHufSnapshot: 1000, titleSnapshot: 'Szám' },
          { product: { id: 42 }, quantity: 1, priceHufSnapshot: 2000, titleSnapshot: 'Stub' },
          {
            product: { id: 43, audience: null },
            quantity: 1,
            priceHufSnapshot: 3000,
            titleSnapshot: 'Explicit null',
          },
        ],
      },
    ]
    const find = vi.fn(async (args: { collection: string; where?: unknown }) => {
      if (args.collection === 'products') {
        return {
          docs: [
            { id: 41, audience: 'szakember' },
            { id: 42, audience: 'szakember' },
          ],
        }
      }
      if (args.where) {
        return { docs: paidDocs, hasNextPage: false, totalDocs: 1 }
      }
      return { docs: [{ status: 'paid' }], hasNextPage: false, totalDocs: 1 }
    })

    const report = await queryRevenueReport({
      payload: { find } as never,
      now: new Date('2026-08-20T12:00:00Z'),
      months: 1,
    })

    const productCall = find.mock.calls.find((call) => {
      const args = call[0] as { collection?: string }
      return args.collection === 'products'
    })
    expect(productCall).toBeDefined()
    const productArgs = productCall?.[0] as {
      select?: Record<string, unknown>
      where?: { id?: { in?: number[] } }
    }
    expect(productArgs.select).toEqual({ id: true, audience: true })
    expect(productArgs.where?.id?.in?.sort()).toEqual([41, 42])
    expect(report.totals.szakemberHuf).toBe(3000)
    expect(report.totals.laikusHuf).toBe(3000)
  })
})

describe('readStatisticsPages — csonkolás csak ha maradt sor', () => {
  it('pontosan a korlátnyi, teljes halmaz nem truncated', async () => {
    const result = await readStatisticsPages(
      async () => ({ docs: [{ id: 1 }, { id: 2 }], hasNextPage: false }),
      2,
      2,
    )
    expect(result.docs).toHaveLength(2)
    expect(result.truncated).toBe(false)
  })

  it('a korlátnál van következő lap → truncated', async () => {
    const result = await readStatisticsPages(
      async () => ({ docs: [{ id: 1 }, { id: 2 }], hasNextPage: true }),
      2,
      2,
    )
    expect(result.docs).toHaveLength(2)
    expect(result.truncated).toBe(true)
  })
})
