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

/**
 * F2/F3 őrök (2026-08-21-i vizsgálat) — mockolt Payload.find, nincs hálózat.
 *
 * A mock RÖGZÍTI a find-argumentumokat: a lapozott lekérdezések rendezése és
 * a hiányos item-snapshotok kezelése így mérhető, nem hiedelem.
 */

interface RecordedFindArgs {
  collection?: string
  where?: unknown
  page?: number
  limit?: number
  sort?: unknown
  select?: Record<string, unknown>
  depth?: number
}

function makePayloadMock(orderDocs: StatisticsOrderDoc[], statuses: string[] = ['paid']) {
  const calls: RecordedFindArgs[] = []
  const find = vi.fn(async (args: RecordedFindArgs) => {
    calls.push(args)
    if (args.collection === 'products') {
      return { docs: [], hasNextPage: false, totalDocs: 0 }
    }
    if (args.where !== undefined) {
      return { docs: orderDocs, hasNextPage: false, totalDocs: orderDocs.length }
    }
    return {
      docs: statuses.map((status) => ({ status })),
      hasNextPage: false,
      totalDocs: statuses.length,
    }
  })
  return { find, calls }
}

/** A lapozott (page-es) hívások rendezési útvonalai. */
function sortPathsOf(args: RecordedFindArgs): string[] {
  if (typeof args.sort === 'string') {
    return [args.sort]
  }
  if (Array.isArray(args.sort)) {
    return args.sort.filter((entry): entry is string => typeof entry === 'string')
  }
  return []
}

describe('F2 — a lapozott order-lekérdezéseknek determinisztikus rendezésük van', () => {
  it('MINDEN lapozott statisztika-lekérdezésen van sort, egyedi tiebreakerrel', async () => {
    const { find, calls } = makePayloadMock([
      {
        status: 'paid',
        createdAt: '2026-08-10T10:00:00.000Z',
        totalHufSnapshot: 1000,
        items: [{ product: { audience: 'laikus' }, quantity: 1, priceHufSnapshot: 1000 }],
      },
    ])

    await queryRevenueReport({
      payload: { find } as never,
      now: new Date('2026-08-20T12:00:00Z'),
      months: 1,
    })

    // A lapozott hívás ismertetőjegye a `page` — a products-hydratáció
    // `pagination: false`-szal, zárt id-halmazra megy, azt nem lapozzuk.
    const paged = calls.filter((args) => typeof args.page === 'number')
    expect(paged).toHaveLength(2)
    for (const args of paged) {
      const paths = sortPathsOf(args)
      expect(
        paths.length,
        `sort nélküli lapozott lekérdezés (${String(args.collection)}) — a lapok határán sor duplázódhat vagy kieshet`,
      ).toBeGreaterThan(0)
      const tiebreaker = paths[paths.length - 1]?.replace(/^-/, '')
      expect(
        tiebreaker,
        `a rendezés utolsó kulcsa nem egyedi (${paths.join(', ')}) — azonos createdAt-nál nincs holtverseny-döntő`,
      ).toBe('id')
    }
  })

  it('a fizetett és a tölcsér-lekérdezés UGYANAZZAL a rendezéssel megy (a friss sorok maradnak csonkolásnál)', async () => {
    const { find, calls } = makePayloadMock([])
    await queryRevenueReport({
      payload: { find } as never,
      now: new Date('2026-08-20T12:00:00Z'),
      months: 1,
    })
    const paged = calls.filter((args) => typeof args.page === 'number')
    for (const args of paged) {
      expect(sortPathsOf(args)).toEqual(['-createdAt', 'id'])
    }
  })
})

describe('F3 — hiányos item-snapshot nem nyelheti el a bevételt', () => {
  const NOW = new Date('2026-08-20T12:00:00Z')

  it('1. eset: items megvan, priceHufSnapshot NULL, totalHufSnapshot 79500 → 79 500 Ft, nem 0', async () => {
    const { find } = makePayloadMock([
      {
        status: 'paid',
        createdAt: '2026-08-10T10:00:00.000Z',
        totalHufSnapshot: 79500,
        items: [
          {
            product: { id: 1, audience: 'laikus' },
            quantity: 1,
            titleSnapshot: 'Otthoni',
            priceHufSnapshot: null,
          },
        ],
      },
    ])
    const report = await queryRevenueReport({ payload: { find } as never, now: NOW, months: 1 })
    expect(report.totals.totalHuf).toBe(79500)
    expect(report.totals.orderCount).toBe(1)
    expect(report.totals.laikusHuf + report.totals.szakemberHuf).toBe(report.totals.totalHuf)
    // A kurzus-bontásban SZÁNDÉKOSAN nem keletkezik kitalált 79 500 Ft-os sor:
    // a rendelés-szintű összeg nem tudja, melyik kurzusra jutott.
    expect(report.courses.find((row) => row.sku === 'Otthoni')?.revenueHuf).toBe(0)
  })

  it('2. eset: ugyanaz a rendelés items: []-lel UGYANAZT a számot adja (a tartalék nem inverz)', async () => {
    const kozos = {
      status: 'paid',
      createdAt: '2026-08-10T10:00:00.000Z',
      totalHufSnapshot: 79500,
    } as const
    const { find: findItemekkel } = makePayloadMock([
      {
        ...kozos,
        items: [
          {
            product: { id: 1, audience: 'laikus' },
            quantity: 1,
            titleSnapshot: 'Otthoni',
            priceHufSnapshot: null,
          },
        ],
      },
    ])
    const { find: findItemNelkul } = makePayloadMock([{ ...kozos, items: [] }])

    const itemekkel = await queryRevenueReport({
      payload: { find: findItemekkel } as never,
      now: NOW,
      months: 1,
    })
    const itemNelkul = await queryRevenueReport({
      payload: { find: findItemNelkul } as never,
      now: NOW,
      months: 1,
    })

    expect(itemekkel.totals.totalHuf).toBe(79500)
    expect(itemNelkul.totals.totalHuf).toBe(79500)
    expect(itemekkel.totals.totalHuf).toBe(itemNelkul.totals.totalHuf)
    expect(itemekkel.totals.orderCount).toBe(itemNelkul.totals.orderCount)
  })

  it('3. eset: van ár, nincs quantity → a pénztár szabálya szerint 1 db', async () => {
    const { find } = makePayloadMock([
      {
        status: 'paid',
        createdAt: '2026-08-10T10:00:00.000Z',
        totalHufSnapshot: 79500,
        items: [
          {
            product: { id: 1, audience: 'laikus' },
            titleSnapshot: 'Otthoni',
            priceHufSnapshot: 79500,
          },
        ],
      },
    ])
    const report = await queryRevenueReport({ payload: { find } as never, now: NOW, months: 1 })
    expect(report.totals.totalHuf).toBe(79500)
    // Itt a TÉTELBŐL jön a szám, tehát a kurzus-bontás is megkapja.
    expect(report.courses.find((row) => row.sku === 'Otthoni')?.revenueHuf).toBe(79500)
  })

  it('a mapper a hiányzó / nem pozitív mennyiséget 1-nek veszi (order-integrity szabály)', () => {
    const mapped = mapOrderDocToRevenueInput({
      status: 'paid',
      createdAt: '2026-08-10T10:00:00.000Z',
      items: [
        { product: { audience: 'laikus' }, priceHufSnapshot: 1000, titleSnapshot: 'nincs qty' },
        {
          product: { audience: 'laikus' },
          quantity: null,
          priceHufSnapshot: 1000,
          titleSnapshot: 'null qty',
        },
        {
          product: { audience: 'laikus' },
          quantity: 0,
          priceHufSnapshot: 1000,
          titleSnapshot: 'nulla qty',
        },
        {
          product: { audience: 'laikus' },
          quantity: -3,
          priceHufSnapshot: 1000,
          titleSnapshot: 'negatív qty',
        },
        {
          product: { audience: 'laikus' },
          quantity: 3,
          priceHufSnapshot: 1000,
          titleSnapshot: 'három',
        },
      ],
    })
    expect(mapped.items.map((item) => item.quantity)).toEqual([1, 1, 1, 1, 3])
  })

  it('ŐR: pozitív totalHufSnapshot mellett SOHA nem lehet orderCount > 0 és totalHuf === 0', async () => {
    const esetek: StatisticsOrderDoc[][] = [
      // NULL ár + meglévő tétel
      [
        {
          status: 'paid',
          createdAt: '2026-08-10T10:00:00.000Z',
          totalHufSnapshot: 79500,
          items: [{ product: { audience: 'laikus' }, quantity: 1, priceHufSnapshot: null }],
        },
      ],
      // tétel nélkül
      [
        {
          status: 'paid',
          createdAt: '2026-08-11T10:00:00.000Z',
          totalHufSnapshot: 120000,
          items: [],
        },
      ],
      // hiányzó quantity ÉS hiányzó ár
      [
        {
          status: 'paid',
          createdAt: '2026-08-12T10:00:00.000Z',
          totalHufSnapshot: 45000,
          items: [{ product: { audience: 'szakember' }, titleSnapshot: 'Szakmai' }],
        },
      ],
      // naptárilag érvénytelen számla-dátum (F4) — a createdAt hónapjába esik
      [
        {
          status: 'paid',
          createdAt: '2026-08-13T10:00:00.000Z',
          invoiceCompletionDate: '2026-13-45',
          totalHufSnapshot: 30000,
          items: [{ product: { audience: 'laikus' }, quantity: 1, priceHufSnapshot: 30000 }],
        },
      ],
    ]

    for (const docs of esetek) {
      const { find } = makePayloadMock(docs)
      const report = await queryRevenueReport({ payload: { find } as never, now: NOW, months: 1 })
      const snapshotOsszeg = docs.reduce((sum, doc) => sum + (doc.totalHufSnapshot ?? 0), 0)
      expect(report.totals.orderCount, JSON.stringify(docs)).toBe(1)
      expect(
        report.totals.totalHuf,
        `pozitív snapshot (${snapshotOsszeg} Ft) mellett 0 Ft-os riport: ${JSON.stringify(docs)}`,
      ).toBe(snapshotOsszeg)
    }
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
