import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RevenueChart } from '../components/admin/RevenueChart'
import { StatisticsReport } from '../components/admin/StatisticsReport'
import { shouldWrapAdminChrome } from '../lib/admin/custom-view-auth'
import {
  STATISTICS_ACCESS_DENIED_MESSAGE,
  aggregateCourseRevenue,
  aggregateMonthlyRevenue,
  aggregateOrderFunnel,
  buildRevenueReport,
  canAccessStatistics,
  formatHuf,
  orderMonthKey,
  type RevenueOrderInput,
} from '../lib/statistics/revenue'

/**
 * T-013 statisztika-aggregátor — tiszta adatok, nincs DB, nincs hálózat.
 *
 * A Payload custom view egyetlen védelme a szerepkör-kapu; azt is itt
 * ellenőrizzük (be nem jelentkezett / customer / staff).
 */

const NOW = new Date('2026-08-20T12:00:00Z')

function paid(
  overrides: Partial<RevenueOrderInput> & Pick<RevenueOrderInput, 'createdAt'>,
): RevenueOrderInput {
  return {
    status: 'paid',
    invoiceCompletionDate: null,
    totalHuf: null,
    items: [],
    ...overrides,
  }
}

describe('canAccessStatistics — a nézet egyetlen védelme', () => {
  it('be nem jelentkezett látogató (null) NEM fér hozzá', () => {
    expect(canAccessStatistics(null)).toBe(false)
    expect(canAccessStatistics(undefined)).toBe(false)
  })

  it('customer NEM fér hozzá', () => {
    expect(canAccessStatistics({ role: 'customer' })).toBe(false)
  })

  it('staff és owner hozzáfér', () => {
    expect(canAccessStatistics({ role: 'staff' })).toBe(true)
    expect(canAccessStatistics({ role: 'owner' })).toBe(true)
  })

  it('a magyar elutasító szöveg a nézetben él', () => {
    expect(STATISTICS_ACCESS_DENIED_MESSAGE).toBe('Ehhez a nézethez nincs jogosultságod.')
  })

  it('anoním látogatónál a DefaultTemplate kimarad, bejelentkezett usernél nem', () => {
    expect(shouldWrapAdminChrome(null)).toBe(false)
    expect(shouldWrapAdminChrome(undefined)).toBe(false)
    expect(shouldWrapAdminChrome({ role: 'customer' })).toBe(true)
    expect(shouldWrapAdminChrome({ role: 'staff' })).toBe(true)
  })
})

describe('orderMonthKey — invoiceCompletionDate, tartalék createdAt, Budapest', () => {
  it('2026-01-31T23:30:00Z a 2026-02 vödörbe esik (Budapest 00:30)', () => {
    expect(
      orderMonthKey({ createdAt: '2026-01-31T23:30:00.000Z', invoiceCompletionDate: null }),
    ).toBe('2026-02')
  })

  it('az invoiceCompletionDate felülírja a createdAt-et', () => {
    expect(
      orderMonthKey({
        createdAt: '2026-01-31T23:30:00.000Z',
        invoiceCompletionDate: '2026-01-15',
      }),
    ).toBe('2026-01')
  })

  it('hibás invoiceCompletionDate → createdAt tartalék', () => {
    expect(
      orderMonthKey({
        createdAt: '2026-03-10T10:00:00.000Z',
        invoiceCompletionDate: '2026/03/10',
      }),
    ).toBe('2026-03')
  })
})

describe('aggregateMonthlyRevenue', () => {
  it('NULL audience a laikus ágba esik', () => {
    const rows = aggregateMonthlyRevenue(
      [
        paid({
          createdAt: '2026-08-01T10:00:00.000Z',
          items: [{ audience: null, priceHuf: 1000, quantity: 1 }],
        }),
      ],
      { months: 1, now: NOW },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.laikusHuf).toBe(1000)
    expect(rows[0]?.szakemberHuf).toBe(0)
    expect(rows[0]?.totalHuf).toBe(1000)
  })

  it('vegyes rendelés tételenként hasad szét', () => {
    const rows = aggregateMonthlyRevenue(
      [
        paid({
          createdAt: '2026-08-02T10:00:00.000Z',
          items: [
            { audience: 'laikus', priceHuf: 79500, quantity: 1 },
            { audience: 'szakember', priceHuf: 120000, quantity: 1 },
          ],
        }),
      ],
      { months: 1, now: NOW },
    )
    expect(rows[0]?.laikusHuf).toBe(79500)
    expect(rows[0]?.szakemberHuf).toBe(120000)
    expect(rows[0]?.totalHuf).toBe(199500)
    expect(rows[0]?.orderCount).toBe(1)
  })

  it('quantity > 1 → priceHuf × quantity', () => {
    const rows = aggregateMonthlyRevenue(
      [
        paid({
          createdAt: '2026-08-03T10:00:00.000Z',
          items: [{ audience: 'laikus', priceHuf: 1000, quantity: 3 }],
        }),
      ],
      { months: 1, now: NOW },
    )
    expect(rows[0]?.totalHuf).toBe(3000)
  })

  it('nem-paid státusz kimarad (refunded, payment_failed, cancelled)', () => {
    const rows = aggregateMonthlyRevenue(
      [
        paid({
          status: 'refunded',
          createdAt: '2026-08-04T10:00:00.000Z',
          items: [{ audience: 'laikus', priceHuf: 5000, quantity: 1 }],
        }),
        paid({
          status: 'payment_failed',
          createdAt: '2026-08-04T11:00:00.000Z',
          items: [{ audience: 'laikus', priceHuf: 5000, quantity: 1 }],
        }),
        paid({
          status: 'cancelled',
          createdAt: '2026-08-04T12:00:00.000Z',
          items: [{ audience: 'laikus', priceHuf: 5000, quantity: 1 }],
        }),
      ],
      { months: 1, now: NOW },
    )
    expect(rows[0]?.totalHuf).toBe(0)
    expect(rows[0]?.orderCount).toBe(0)
  })

  it('üres hónap nullás sorként jelenik meg, nem hiányzik', () => {
    const rows = aggregateMonthlyRevenue([], { months: 12, now: NOW })
    expect(rows).toHaveLength(12)
    expect(rows[0]?.month).toBe('2025-09')
    expect(rows[11]?.month).toBe('2026-08')
    for (const row of rows) {
      expect(row.laikusHuf + row.szakemberHuf).toBe(row.totalHuf)
      expect(row.totalHuf).toBe(0)
      expect(row.orderCount).toBe(0)
    }
  })

  it('minden során laikusHuf + szakemberHuf === totalHuf', () => {
    const rows = aggregateMonthlyRevenue(
      [
        paid({
          createdAt: '2026-07-15T10:00:00.000Z',
          items: [
            { audience: 'laikus', priceHuf: 10, quantity: 2 },
            { audience: 'szakember', priceHuf: 7, quantity: 1 },
          ],
        }),
        paid({
          createdAt: '2026-08-01T10:00:00.000Z',
          totalHuf: 50,
          items: [],
        }),
      ],
      { months: 3, now: NOW },
    )
    for (const row of rows) {
      expect(row.laikusHuf + row.szakemberHuf).toBe(row.totalHuf)
    }
    const august = rows.find((row) => row.month === '2026-08')
    expect(august?.laikusHuf).toBe(50)
  })
})

describe('kurzus-bontás és tölcsér', () => {
  it('kurzusonként összegzi a bevételt, az ingyenes tételt külön számolja', () => {
    const rows = aggregateCourseRevenue([
      paid({
        createdAt: '2026-08-01T10:00:00.000Z',
        items: [
          { audience: 'laikus', priceHuf: 79500, quantity: 1, titleSnapshot: 'Otthoni' },
          { audience: 'laikus', priceHuf: 0, quantity: 1, titleSnapshot: 'SOS ingyenes' },
        ],
      }),
    ])
    expect(rows[0]?.sku).toBe('Otthoni')
    expect(rows[0]?.revenueHuf).toBe(79500)
    expect(rows.find((row) => row.sku === 'SOS ingyenes')?.freeItemCount).toBe(1)
  })

  it('a tölcsér a státuszokat számolja, a refunded-et is, de az nem bevétel', () => {
    const funnel = aggregateOrderFunnel(['paid', 'paid', 'payment_failed', 'refunded', 'created'])
    expect(funnel.paid).toBe(2)
    expect(funnel.paymentFailed).toBe(1)
    expect(funnel.refunded).toBe(1)
    expect(funnel.created).toBe(1)
    expect(funnel.total).toBe(5)
  })

  it('a kurzus-tábla ugyanarra a 12 hónapra vonatkozik, a tölcsér a teljes állományt számolja', () => {
    const report = buildRevenueReport(
      [
        paid({
          createdAt: '2024-01-10T10:00:00.000Z',
          items: [
            { audience: 'laikus', priceHuf: 10000, quantity: 1, titleSnapshot: 'Régi kurzus' },
          ],
        }),
        paid({
          createdAt: '2026-08-01T10:00:00.000Z',
          items: [
            { audience: 'laikus', priceHuf: 5000, quantity: 1, titleSnapshot: 'Friss kurzus' },
          ],
        }),
      ],
      ['paid', 'paid', 'payment_failed'],
      { months: 12, now: NOW },
    )
    expect(report.courses.map((row) => row.sku)).toEqual(['Friss kurzus'])
    expect(report.totals.totalHuf).toBe(5000)
    expect(report.funnel.paid).toBe(2)
    expect(report.funnel.paymentFailed).toBe(1)
  })
})

describe('StatisticsReport + RevenueChart — a számok a táblázatban is ott vannak', () => {
  it('a jelentés kiírja a havi összegeket magyar ezres tagolással', () => {
    const report = buildRevenueReport(
      [
        paid({
          createdAt: '2026-08-01T10:00:00.000Z',
          items: [{ audience: 'laikus', priceHuf: 79500, quantity: 1, titleSnapshot: 'Otthoni' }],
        }),
      ],
      ['paid', 'payment_failed'],
      { months: 1, now: NOW },
    )
    const html = renderToStaticMarkup(createElement(StatisticsReport, { report }))
    expect(html).toContain('Statisztika')
    expect(html).toContain(formatHuf(79500))
    expect(html).toContain('Otthoni')
    expect(html).toContain('Sikertelen fizetés')
    expect(html).toContain('ugyanabban a 12 hónapban')
  })

  it('az SVG oszlopdiagram role=img és aria-label mellett a táblázat is megjelenik', () => {
    const rows = aggregateMonthlyRevenue([], { months: 1, now: NOW })
    const svg = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label=')
    expect(svg).toContain('<rect')
  })
})
