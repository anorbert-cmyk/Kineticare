import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FunnelSection } from '../components/admin/statistics/FunnelSection'
import type { OrderFunnelCounts } from '../lib/statistics/revenue'

/**
 * A tölcsér-szekció visszatérítés-megjegyzése — őr-teszt.
 *
 * A 2026-08-21-i kódvizsgálat F9 (MEDIUM) találata: a szöveg azt állította,
 * hogy „a visszatérített rendelések nem számítanak bevételnek", holott a
 * RÉSZLEGES visszatérítés a rendelést `paid` státuszban hagyja
 * (src/lib/refund/refund-order.ts), tehát a teljes összegével benne marad a
 * bevételben. Egy hamis magyarázat rosszabb, mint a hiányzó: a munkatárs
 * eszerint egyeztetné a könyvelést.
 */

function funnel(overrides: Partial<OrderFunnelCounts> = {}): OrderFunnelCounts {
  return {
    paid: 10,
    created: 0,
    paymentPending: 0,
    paymentFailed: 0,
    cancelled: 0,
    refunded: 0,
    other: 0,
    total: 10,
    ...overrides,
  }
}

function render(counts: OrderFunnelCounts): string {
  return renderToStaticMarkup(createElement(FunnelSection, { funnel: counts }))
}

describe('FunnelSection — visszatérítés-megjegyzés', () => {
  it('nem állítja azt, hogy MINDEN visszatérített rendelés kiesik a bevételből', () => {
    const html = render(funnel({ created: 2 }))
    expect(html).not.toContain('A visszatérített rendelések nem számítanak bevételnek')
  })

  it('kimondja, hogy a részlegesen visszatérített rendelés benne marad a bevételben', () => {
    const html = render(funnel({ created: 2 }))
    expect(html).toContain('A teljesen visszatérített rendelés nem számít bevételnek')
    expect(html).toContain('A részlegesen visszatérített viszont fizetettnek marad')
    expect(html).toContain('a teljes összegével szerepel')
  })

  it('a megjegyzés akkor is látszik, ha nincs beavatkozást kérő rendelés', () => {
    // A bevétel értelmezéséhez kell, nem a teendőkhöz — korábban a mondat
    // csak a „van nyitott rendelés" ágon jelent meg.
    const html = render(funnel())
    expect(html).toContain('Nincs nyitott vagy sikertelen fizetés')
    expect(html).toContain('A részlegesen visszatérített viszont fizetettnek marad')
  })

  it('a beavatkozást kérő darabszám magyar ezres tagolással jelenik meg', () => {
    const html = render(funnel({ created: 1200, paymentPending: 34, paymentFailed: 6 }))
    expect(html).toContain((1240).toLocaleString('hu-HU'))
  })
})
