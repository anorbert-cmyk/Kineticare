import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { canonicalCourseRedirect, courseHref } from '../lib/course-url'
import { buildProductMetadata } from '../lib/seo'
import type { Product } from '../payload-types'

/**
 * ŐR — a régi kurzus-cím TARTÓS átirányítása és a canonical helyessége.
 *
 * Mit véd. A `/kurzusok/2` típusú, id-alapú címek kint élnek hirdetésben,
 * hírlevélben és a Google indexében. Ha az átirányítás IDEIGLENESSÉ válik
 * (`redirect()` = 307 a Next App Routerben) vagy a canonical a kiszolgált,
 * NEM kanonikus címre mutat, akkor a régi címek link-értéke nem száll át az
 * új, beszédes címre. Ez a hiba teljesen néma: az oldal működik, a látogató
 * megérkezik, csak a keresőben csúszik szét minden.
 *
 * Miért 308 és nem 301: a Next App Router tartós átirányítása 308. A Google
 * a kettőt AZONOSAN kezeli — „The `301` and `308` status codes mean that a
 * page has permanently moved to a new location."
 * https://developers.google.com/search/docs/crawling-indexing/301-redirects
 *
 * A canonical szerepéről: a rel=canonical és az átirányítás egyaránt
 * kanonizációs jelzés, ezért a kettő nem mondhat mást.
 * https://developers.google.com/search/docs/crawling-indexing/canonicalization
 *
 * A LOGIKÁT (körmentesség, névtér-diszjunkció) a course-url.test.ts fedi;
 * ez a fájl a ROUTE szerződését rögzíti.
 */

const routeSource = readFileSync(
  fileURLToPath(new URL('../app/(frontend)/kurzusok/[slug]/page.tsx', import.meta.url)),
  'utf8',
)

/** A kurzusoldal route-fájlja kommentek nélkül (a doksi-példák nem szabályok). */
const routeCode = routeSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const product = {
  id: 2,
  slug: 'sos-kezrelax-villamkurzus',
  sku: 'SOS-KEZRELAX',
  displayTitle: 'SOS Kézrelax villámkurzus',
  shortDescription: 'Ingyenes villámkurzus a kéz ellazítására.',
  seoTitle: null,
  seoDescription: null,
  ogImage: null,
  coverImage: null,
} as unknown as Product

describe('régi, id-alapú kurzus-cím → tartós átirányítás', () => {
  it('a /kurzusok/2 a beszédes címre irányít', () => {
    expect(canonicalCourseRedirect('2', product)).toBe('/kurzusok/sos-kezrelax-villamkurzus')
  })

  it('a beszédes cím már nem irányít tovább (egy ugrás a maximum)', () => {
    expect(canonicalCourseRedirect('sos-kezrelax-villamkurzus', product)).toBeNull()
  })

  it('a route TARTÓS átirányítást használ (permanentRedirect = 308)', () => {
    expect(routeCode).toContain('permanentRedirect(')
    // Az ideiglenes `redirect(` (307) használata itt SEO-vesztés lenne.
    expect(routeCode).not.toMatch(/[^t]\bredirect\(/)
  })

  it('a bejövő query string (UTM) az átirányításon is átmegy', () => {
    expect(routeCode).toContain('withSearchParams(')
  })
})

describe('a kurzusoldal canonical címe', () => {
  it('a canonical a KANONIKUS (slugos) cím, nem a kiszolgált id-s alak', () => {
    const metadata = buildProductMetadata(product, courseHref(product))
    expect(metadata.alternates?.canonical).toBe('/kurzusok/sos-kezrelax-villamkurzus')
  })

  it('slug nélküli, régi kurzusnál az id-s cím maga a kanonikus', () => {
    const legacy = { ...product, slug: null } as unknown as Product
    expect(buildProductMetadata(legacy, courseHref(legacy)).alternates?.canonical).toBe(
      '/kurzusok/2',
    )
  })

  it('a route a courseHref-ből képzi a canonicalt (nem a nyers útvonal-paraméterből)', () => {
    expect(routeCode).toContain('buildProductMetadata(product, courseHref(product))')
  })

  it('az og:url is a kanonikus címre mutat (nem mondhat mást, mint a canonical)', () => {
    const metadata = buildProductMetadata(product, courseHref(product))
    expect(String(metadata.openGraph?.url)).toMatch(/\/kurzusok\/sos-kezrelax-villamkurzus$/)
  })
})
