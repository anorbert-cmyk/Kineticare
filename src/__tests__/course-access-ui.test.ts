import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CourseList } from '../components/account/CourseList'
import { CoursePlayer } from '../components/account/CoursePlayer'
import { ACCESS_EXPIRED_TITLE, accessExpiredMessage } from '../lib/course-access'
import type { Product } from '../payload-types'

/**
 * A1 — a hozzáférés lejáratának MEGJELENÍTÉSE (kurzuslista + lejátszó).
 *
 * A szabály maga (és a lejárat számítása) az src/__tests__/course-access.test.ts
 * hatóköre; itt csak azt ellenőrizzük, hogy a kész, magyar szövegek és a
 * célhivatkozások a helyükre kerülnek.
 */

const PRODUCT = {
  id: 42,
  sku: 'Kézrehab alapkurzus',
  accessDurationDays: 365,
} as Product

const EXPIRED_MESSAGE = accessExpiredMessage(new Date('2027-03-04T12:00:00.000Z'))

describe('CourseList — lejárati dátum a kurzusaim listán', () => {
  it('látszik a lejárati dátum, ha van', () => {
    const html = renderToStaticMarkup(
      createElement(CourseList, {
        products: [PRODUCT],
        accessByProductId: {
          42: {
            hasAccess: true,
            expiryLabel: 'Hozzáférés eddig: 2027. 03. 04.',
            expiredMessage: null,
          },
        },
      }),
    )
    expect(html).toContain('Hozzáférés eddig: 2027. 03. 04.')
    expect(html).toContain('/kurzusaim/42')
    expect(html).toContain('Tovább a lejátszáshoz')
  })

  it('korlátlan hozzáférésnél nincs lejárati sor (a mai megjelenés marad)', () => {
    const html = renderToStaticMarkup(
      createElement(CourseList, { products: [PRODUCT], accessByProductId: {} }),
    )
    expect(html).not.toContain('Hozzáférés eddig')
    expect(html).toContain('Tovább a lejátszáshoz')
  })

  it('lejárt hozzáférésnél empatikus üzenet + a kurzus oldalára mutató link', () => {
    const html = renderToStaticMarkup(
      createElement(CourseList, {
        products: [PRODUCT],
        accessByProductId: {
          42: { hasAccess: false, expiryLabel: null, expiredMessage: EXPIRED_MESSAGE },
        },
      }),
    )
    expect(html).toContain(ACCESS_EXPIRED_TITLE)
    expect(html).toContain('2027. 03. 04.')
    expect(html).toContain('/kurzusok/42')
    expect(html).not.toContain('/kurzusaim/42')
  })
})

describe('CoursePlayer — lejárt hozzáférés', () => {
  it('lejárat esetén nem a „nem vetted meg" szöveget mutatja, és nem tölt be videót', () => {
    const html = renderToStaticMarkup(
      createElement(CoursePlayer, {
        product: { id: 42, title: 'Kézrehab alapkurzus', videos: [] },
        hasAccess: false,
        expiredMessage: EXPIRED_MESSAGE,
      }),
    )
    expect(html).toContain('Lejárt a hozzáférésed')
    expect(html).toContain('2027. 03. 04.')
    expect(html).not.toContain('megvásárlása szükséges')
    expect(html).not.toContain('<iframe')
  })

  it('vásárlás nélkül a korábbi üzenet marad (nem lejárat-specifikus)', () => {
    const html = renderToStaticMarkup(
      createElement(CoursePlayer, {
        product: { id: 42, title: 'Kézrehab alapkurzus', videos: [] },
        hasAccess: false,
      }),
    )
    expect(html).toContain('Nincs hozzáférésed ehhez a kurzushoz')
    expect(html).toContain('megvásárlása szükséges')
  })
})
