import { describe, expect, it } from 'vitest'

import {
  ARCHIVED_COURSE_NOTE,
  CHECKOUT_PATH,
  MY_COURSES_PATH,
  checkoutHref,
  collectCourseCategories,
  coursePriceHuf,
  coursePriceLabel,
  courseTitle,
  filterCoursesByCategory,
  hasUserPurchased,
  parseCourseIdParam,
  resolveCategoryFilter,
  resolveCourseCta,
} from '../lib/courses'
import type { Category, Product } from '../payload-types'

const NBSP = ' '

/** Minimális kategória-fixture (a products.category populate-olt alakja). */
function category(id: number, slug: string, title: string): Category {
  return { id, slug, title } as Category
}

const otthoni = category(1, 'otthoni', 'Otthoni gyakorlóprogram')
const szakmai = category(2, 'szakmai', 'Szakmai továbbképzés')

function product(
  id: number,
  cat: Category | number,
  overrides: Partial<Product> = {},
): Pick<Product, 'id' | 'category' | 'status' | 'sku' | 'priceInHUF' | 'priceInHUFEnabled'> {
  return {
    id,
    category: cat,
    status: 'published',
    sku: `KURZUS-${id}`,
    priceInHUFEnabled: true,
    priceInHUF: 19990,
    ...overrides,
  }
}

describe('kurzuslista kategória-szűrés', () => {
  const products = [
    product(1, otthoni),
    product(2, szakmai),
    product(3, otthoni),
    product(4, 99), // nem populate-olt (nyers id) — védekező ág
  ]

  it('szűrés nélkül (null) minden terméket visszaad', () => {
    expect(filterCoursesByCategory(products, null)).toHaveLength(4)
  })

  it('otthoni szűrés csak az otthoni kategóriájúakat adja', () => {
    const result = filterCoursesByCategory(products, 'otthoni')
    expect(result.map((p) => p.id)).toEqual([1, 3])
  })

  it('szakmai szűrés a szakmai kategóriát adja', () => {
    const result = filterCoursesByCategory(products, 'szakmai')
    expect(result.map((p) => p.id)).toEqual([2])
  })

  it('a nem populate-olt kategória slug-szűrésnél kiesik', () => {
    const result = filterCoursesByCategory(products, 'otthoni')
    expect(result.some((p) => p.id === 4)).toBe(false)
  })

  it('a szűrő-chipek a listában ténylegesen előforduló kategóriák, magyar ábécé-sorrendben', () => {
    const categories = collectCourseCategories(products)
    expect(categories.map((c) => c.slug)).toEqual(['otthoni', 'szakmai'])
    // a nyers id-s (nem populate-olt) kategória nem kerül chipnek
    expect(categories.some((c) => c.id === 99)).toBe(false)
  })

  it('a query-param csak ismert kategória-slug lehet, egyébként szűretlen (null)', () => {
    const categories = collectCourseCategories(products)
    expect(resolveCategoryFilter('otthoni', categories)).toBe('otthoni')
    expect(resolveCategoryFilter('nemletezo', categories)).toBeNull()
    expect(resolveCategoryFilter('', categories)).toBeNull()
    expect(resolveCategoryFilter(undefined, categories)).toBeNull()
    expect(resolveCategoryFilter(['szakmai', 'otthoni'], categories)).toBe('szakmai')
  })
})

describe('archived kurzus CTA-ja', () => {
  it('archived + nem vevő: a CTA inaktív, href nélkül, „nem vásárolható" jelöléssel', () => {
    const cta = resolveCourseCta({ id: 7, status: 'archived', priceInHUFEnabled: true }, false)
    expect(cta.kind).toBe('archived')
    expect(cta.disabled).toBe(true)
    expect(cta.href).toBeNull()
    expect(cta.note).toBe(ARCHIVED_COURSE_NOTE)
    expect(cta.note).toBe('Ez a kurzus jelenleg nem vásárolható.')
  })

  it('archived + vevő: a meglévő vevő tovább nézi — „Tovább a kurzusaimhoz" link', () => {
    const cta = resolveCourseCta({ id: 7, status: 'archived', priceInHUFEnabled: true }, true)
    expect(cta.kind).toBe('purchased')
    expect(cta.disabled).toBe(false)
    expect(cta.href).toBe(MY_COURSES_PATH)
    expect(cta.label).toBe('Tovább a kurzusaimhoz')
  })

  it('draft + nem vevő: inaktív védekező ág (a nyilvános route amúgy 404)', () => {
    const cta = resolveCourseCta({ id: 7, status: 'draft', priceInHUFEnabled: true }, false)
    expect(cta.kind).toBe('unavailable')
    expect(cta.disabled).toBe(true)
    expect(cta.href).toBeNull()
  })
})

describe('ingyenes kurzus (free kind)', () => {
  it('published + ingyenes (priceInHUFEnabled: false) + nem vevő: „Ingyenes — azonnal eléred", nem checkout', () => {
    const cta = resolveCourseCta({ id: 10, status: 'published', priceInHUFEnabled: false }, false)
    expect(cta.kind).toBe('free')
    expect(cta.label).toBe('Ingyenes — azonnal eléred')
    expect(cta.href).toBe(MY_COURSES_PATH)
    expect(cta.href).not.toContain(CHECKOUT_PATH)
    expect(cta.disabled).toBe(false)
  })

  it('published + ingyenes + vevő: a purchased ág él (a meglévő vevő is a kurzusaimra megy)', () => {
    const cta = resolveCourseCta({ id: 10, status: 'published', priceInHUFEnabled: false }, true)
    expect(cta.kind).toBe('purchased')
  })

  it('published + fizetős + nem vevő: a buy ág él változatlanul (checkout)', () => {
    const cta = resolveCourseCta({ id: 10, status: 'published', priceInHUFEnabled: true }, false)
    expect(cta.kind).toBe('buy')
    expect(cta.href).toContain(CHECKOUT_PATH)
  })
})

describe('„már megvetted" ág', () => {
  it('nyers id-ket és populate-olt termékeket egyaránt felismer', () => {
    expect(hasUserPurchased([1, 2, 3], 2)).toBe(true)
    expect(hasUserPurchased([{ id: 5 }], 5)).toBe(true)
    expect(hasUserPurchased([{ id: 5 }], 6)).toBe(false)
    expect(hasUserPurchased([], 1)).toBe(false)
    expect(hasUserPurchased(null, 1)).toBe(false)
    expect(hasUserPurchased(undefined, 1)).toBe(false)
  })

  it('vevőnél a CTA a kurzusaimra mutat (checkout helyett), bármilyen státusznál', () => {
    for (const status of ['published', 'archived', 'draft'] as const) {
      const cta = resolveCourseCta({ id: 3, status, priceInHUFEnabled: true }, true)
      expect(cta.kind).toBe('purchased')
      expect(cta.href).toBe(MY_COURSES_PATH)
      expect(cta.disabled).toBe(false)
    }
  })

  it('published + nem vevő: „Megveszem" a checkout-flowba visz (termek query-param)', () => {
    const cta = resolveCourseCta({ id: 42, status: 'published', priceInHUFEnabled: true }, false)
    expect(cta.kind).toBe('buy')
    expect(cta.label).toBe('Megveszem')
    expect(cta.href).toBe(`${CHECKOUT_PATH}?termek=42`)
    expect(cta.href).toBe(checkoutHref(42))
  })
})

describe('ár-formázás (Ft, ezres tagolás)', () => {
  it('bruttó egész forint, ezres tagolással, nem-törhető szóközzel', () => {
    expect(coursePriceLabel({ priceInHUFEnabled: true, priceInHUF: 19990 })).toBe(
      `19${NBSP}990${NBSP}Ft`,
    )
    expect(coursePriceLabel({ priceInHUFEnabled: true, priceInHUF: 1290000 })).toBe(
      `1${NBSP}290${NBSP}000${NBSP}Ft`,
    )
  })

  it('ár nélküli/letiltott árú termékre null (a kártya ilyenkor nem mutat árat)', () => {
    expect(coursePriceLabel({ priceInHUFEnabled: false, priceInHUF: 19990 })).toBeNull()
    expect(coursePriceLabel({ priceInHUFEnabled: true, priceInHUF: null })).toBeNull()
    expect(coursePriceHuf({ priceInHUFEnabled: true, priceInHUF: 19990 })).toBe(19990)
  })
})

describe('kurzus URL- és címkezelés', () => {
  it('a [slug] szegmens a numerikus product id; minden más 404', () => {
    expect(parseCourseIdParam('7')).toBe(7)
    expect(parseCourseIdParam(' 12 ')).toBe(12)
    expect(parseCourseIdParam('abc')).toBeNull()
    expect(parseCourseIdParam('7x')).toBeNull()
    expect(parseCourseIdParam('-3')).toBeNull()
    expect(parseCourseIdParam('0')).toBeNull()
    expect(parseCourseIdParam('')).toBeNull()
    expect(parseCourseIdParam(undefined)).toBeNull()
  })

  it('a kurzus display-neve a sku; hiányában azonosítós fallback', () => {
    expect(courseTitle({ id: 1, sku: 'Kézrehabilitáció otthon' })).toBe('Kézrehabilitáció otthon')
    expect(courseTitle({ id: 9, sku: '  ' })).toBe('Kurzus #9')
    expect(courseTitle({ id: 9, sku: null })).toBe('Kurzus #9')
  })
})
