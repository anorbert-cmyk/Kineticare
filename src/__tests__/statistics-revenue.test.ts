import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
  formatMonthShort,
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

  it('a gyökér a kc-adminstat márka-scope-ot viseli, eyebrow-sorral (tulajdonosi döntés, 2026-08-20)', () => {
    const report = buildRevenueReport([], [], { months: 1, now: NOW })
    const html = renderToStaticMarkup(createElement(StatisticsReport, { report }))
    // A custom.scss márka-rétege ezen a classon keresztül hat — nélküle a
    // nézet a Payload-kinézetre esne vissza, ezért a jelenléte szerkezeti
    // követelmény.
    expect(html).toContain('class="kc-adminstat"')
    // A h1 fölötti eyebrow a landing felvezető-nyelve; a DOM-szöveg
    // mondatkezdő, a verzált a CSS adja (ui-sztenderdek §3.1 M-4).
    expect(html).toContain('Kimutatások')
    // Az inline stílusok a márka-tokenre hivatkoznak, Payload-tartalékkal.
    expect(html).toContain('--kc-as-')
    expect(html).toContain('--theme-')
  })

  it('az SVG oszlopdiagram role=img és aria-label mellett a táblázat is megjelenik', () => {
    const rows = aggregateMonthlyRevenue([], { months: 1, now: NOW })
    const svg = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label=')
    expect(svg).toContain('<rect')
  })
})

describe('formatMonthShort — rövid magyar hónap-tick a diagramhoz', () => {
  it('rövid magyar hónapnevet ad', () => {
    expect(formatMonthShort('2025-09')).toBe('szept.')
    expect(formatMonthShort('2026-01')).toBe('jan.')
    expect(formatMonthShort('2026-08')).toBe('aug.')
  })

  it('értelmezhetetlen kulcsnál magát a kulcsot adja vissza', () => {
    expect(formatMonthShort('nem-honap')).toBe('nem-honap')
    expect(formatMonthShort('2026-13')).toBe('2026-13')
  })
})

describe('RevenueChart — jelmagyarázat, rövid tickek, Y-tengely', () => {
  it('a jelmagyarázat szöveggel nevezi meg a két ágat (WCAG 1.4.1)', () => {
    const rows = aggregateMonthlyRevenue([], { months: 12, now: NOW })
    const html = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(html).toContain('Otthoni')
    expect(html).toContain('Szakmai')
  })

  it('az X-tengely tickje rövid hónap, évszám az első oszlopon és januárnál', () => {
    const rows = aggregateMonthlyRevenue([], { months: 12, now: NOW })
    const html = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(html).toContain('>szept.<')
    expect(html).toContain('>jan.<')
    // Évszám „landmark" felirat: az ablak eleje (2025) és az évváltás (2026).
    expect(html).toContain('>2025<')
    expect(html).toContain('>2026<')
    // A hosszú hónapcímke csak az aria-labelben él, tickként nem jelenik meg.
    expect(html).not.toContain('>2025. szeptember<')
  })

  it('az Y-tengelyen legalább 3 tick van magyar Ft-formátummal', () => {
    const rows = aggregateMonthlyRevenue(
      [
        paid({
          createdAt: '2026-08-01T10:00:00.000Z',
          items: [
            { audience: 'laikus', priceHuf: 79500, quantity: 1 },
            { audience: 'szakember', priceHuf: 120000, quantity: 1 },
          ],
        }),
      ],
      { months: 12, now: NOW },
    )
    const html = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(html).toContain('>0 Ft<')
    expect(html).toContain('>60 e Ft<')
    expect(html).toContain('>120 e Ft<')
  })

  it('a role=img és az aria-label a jelmagyarázattal együtt is megmarad', () => {
    const rows = aggregateMonthlyRevenue([], { months: 12, now: NOW })
    const html = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label=')
    expect(html).toContain('<rect')
  })

  it('a diagram saját konténerében görög, a viewBox-szöveg nem zsugorodik 320 px-re', () => {
    const rows = aggregateMonthlyRevenue([], { months: 12, now: NOW })
    const html = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(html).toContain('overflow-x:auto')
    // px, nem rem: a Payload admin 13px-es gyökere a 45rem-et 585px-re
    // zsugorította, és a tick a mért 11,27px-re esett a tervezett 12 alá
    // (2026-08-20-i élő audit; a 720 a viewBox natív szélessége).
    expect(html).toContain('min-width:720px')
  })

  it('a diagram görgetője billentyűzetről fókuszálható és nevesített (WCAG 2.1.1, 4.1.2)', () => {
    // axe: scrollable-region-focusable —
    // https://dequeuniversity.com/rules/axe/4.12/scrollable-region-focusable
    const rows = aggregateMonthlyRevenue([], { months: 12, now: NOW })
    const html = renderToStaticMarkup(createElement(RevenueChart, { rows }))
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-label="Havi bevétel oszlopdiagram"')
  })
})

describe('kc-adminstat márka-CSS őrök — fókusz, link-állapotok, méret-egység', () => {
  const brandCss = readFileSync(
    join(process.cwd(), 'src', 'app', '(payload)', 'custom.scss'),
    'utf8',
  )

  it('a linknek explicit aláhúzása van (WCAG 1.4.1: a link színe a törzsével azonos)', () => {
    // A link ink-színű, tehát az aláhúzás az egyetlen nem-szín jelzés —
    // GOV.UK: https://design-system.service.gov.uk/styles/links/
    const linkRule = brandCss.match(/\.kc-adminstat a \{[^}]*\}/)?.[0]
    expect(linkRule).toBeDefined()
    expect(linkRule).toContain('text-decoration: underline')
  })

  it('a fókuszgyűrű a linkre ÉS a görgethető régiókra is definiált (WCAG 2.4.7)', () => {
    // Az inline stílus nem tud :focus-visible-t, ezért ennek a custom.scss-ben
    // KELL élnie; a régió-szelektor az axe scrollable-region-focusable
    // szabályhoz felvett tabindexes wrappereket fedi (2026-08-20-i audit).
    expect(brandCss).toContain('.kc-adminstat a:focus-visible')
    expect(brandCss).toContain(".kc-adminstat [role='region'][tabindex]:focus-visible")
    const focusRule = brandCss.match(/:focus-visible \{[^}]*\}/)?.[0]
    expect(focusRule).toContain('outline: 2px solid var(--kc-as-focus)')
  })

  it('a link active állapota definiált (termektervezes skill 4. pont: hét állapot)', () => {
    expect(brandCss).toContain('.kc-adminstat a:active')
  })

  it('a scope-olt méret-tokenek px-alapúak (a Payload 13px-es gyökere miatt)', () => {
    // 2026-08-20-i élő audit: a rem-értékek a 16px-es storefront-alap
    // 13/16-ára zsugorodtak (törzs 13px, radius 6,5px). A tokenek px-ben
    // rögzítettek; rem-alapú méret-token nem térhet vissza.
    // A kommentek magyarázó rem-hivatkozásai nem számítanak, csak az érték.
    const tokenLines = brandCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => /^\s*--kc-as-(space|radius|font-cim)/.test(line))
    expect(tokenLines.length).toBeGreaterThanOrEqual(9)
    for (const line of tokenLines) {
      expect(line, `rem-alapú méret-token: ${line.trim()}`).not.toMatch(/[\d.]rem/)
    }
    expect(brandCss).toContain('font-size: 16px')
  })
})
