import { parseCourseIdParam } from './courses'
import { slugify } from './slugify'

/**
 * Kurzus-URL: slug-generálás és útvonal-feloldás (C3).
 *
 * A kurzusoldal EGYETLEN dinamikus szegmenst használ (/kurzusok/[slug]),
 * amely kétféle értéket fogad:
 * - a kurzus `slug`-ja — ez a KANONIKUS, emberi olvasású webcím;
 * - a numerikus product id — a slug bevezetése ELŐTTI, régi URL-ek (kimenő
 *   linkek és SEO-érték), amelyeket a route tartósan a kanonikus címre irányít.
 *
 * Mivel a két névtér ugyanazon a szegmensen osztozik, DISZJUNKTNAK kell
 * lenniük: ezért a csak számjegyekből álló slug elé `kurzus-` előtag kerül
 * (lásd NUMERIC_SLUG_PREFIX). Enélkül egy „2026" című kurzus slugja elfedhetné
 * a 2026-os id-jű kurzust, és az átirányítás is körbe érhetne.
 *
 * A modul szándékosan TISZTA (DB- és Next-független), hogy a
 * course-url.test.ts a teljes szabályrendszert adatbázis nélkül ellenőrizze —
 * különösen az átirányítás körmentességét.
 */

/** A kurzusoldalak útvonal-gyökere. */
export const COURSE_BASE_PATH = '/kurzusok'

/** A csak számjegyes slugok elé kerülő előtag (lásd a modul fejlécét). */
export const NUMERIC_SLUG_PREFIX = 'kurzus-'

export interface CourseSlugSource {
  displayTitle?: string | null
  sku?: string | null
}

/**
 * A slug forrásszövege: a kurzus címe (`displayTitle`), hiányában a `sku`
 * (a kurzus neve/azonosítója). Egyik sincs → null: a kurzus slug nélkül marad,
 * és a régi, id-alapú URL-en érhető el.
 */
export function courseSlugSource(source: CourseSlugSource): string | null {
  for (const value of [source.displayTitle, source.sku]) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

/**
 * Slug-alak egy szabad szövegből: magyar ékezet-transzliteráció + kebab-case
 * (src/lib/slugify.ts), majd a csak számjegyes eredmény elé az előtag.
 * Üres eredmény (pl. csak írásjelekből álló cím) → null.
 */
export function buildCourseSlug(source: string | null | undefined): string | null {
  if (typeof source !== 'string') {
    return null
  }
  const slug = slugify(source)
  if (slug.length === 0) {
    return null
  }
  return /^\d+$/.test(slug) ? `${NUMERIC_SLUG_PREFIX}${slug}` : slug
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A `base` slug „családja": maga a base, illetve a sorszámozott `base-2`, `base-3`… alakok. */
export function isNumberedVariantOf(slug: string, base: string): boolean {
  return slug === base || new RegExp(`^${escapeRegExp(base)}-\\d+$`).test(slug)
}

/**
 * A következő SZABAD slug: `base`, ütközés esetén `base-2`, `base-3`…
 *
 * @param base       a kívánt slug
 * @param takenSlugs a MÁS kurzusok által már foglalt slugok
 */
export function nextFreeCourseSlug(base: string, takenSlugs: Iterable<string>): string {
  const taken = new Set(takenSlugs)
  if (!taken.has(base)) {
    return base
  }
  let index = 2
  while (taken.has(`${base}-${index}`)) {
    index += 1
  }
  return `${base}-${index}`
}

/** Egy kurzus URL-hez szükséges mezői (a teljes Product is beleillik). */
export interface CourseUrlDoc {
  id: number
  slug?: string | null
}

/** A kurzus KANONIKUS útvonala: a slug, ha van; különben a régi, id-alapú URL. */
export function courseHref(product: CourseUrlDoc): string {
  const slug = typeof product.slug === 'string' ? product.slug.trim() : ''
  return `${COURSE_BASE_PATH}/${slug.length > 0 ? slug : product.id}`
}

/**
 * A kurzusoldal CSELEKVŐ elemének (vásárlógomb, illetve ingyenes kurzusnál az
 * igénylő űrlap) horgonya.
 *
 * MIÉRT ITT ÉL: a horgonyra MÁS oldalról is mutatni kell — az ingyenes termék
 * `/penztar`-ja innen küldi tovább a látogatót az igénylő űrlaphoz. A
 * kurzusoldal saját `CTA_ID` konstansa modul-szintű marad (a `page.tsx` nem
 * megosztható modul), ezért a két érték BITRE EGYEZÉSÉT őr-teszt méri
 * (`src/__tests__/penztar-ingyenes-kapu.test.tsx`) — a néma elcsúszás
 * ugyanis csak élesben, egy nem működő horgonyugrásban látszana meg.
 */
export const COURSE_CTA_ANCHOR = 'kurzus-vasarlas-gomb'

/**
 * A kurzus kanonikus címe a CSELEKVŐ elemre mutató horgonnyal.
 *
 * SZÁNDÉKOSAN a `courseHref`-re épül, nem külön útvonal-képzésre: a slugos és
 * a régi, id-alapú alak közti választás így egyetlen helyen dől el.
 */
export function courseCtaHref(product: CourseUrlDoc): string {
  return `${courseHref(product)}#${COURSE_CTA_ANCHOR}`
}

export type CourseRouteParam = { kind: 'id'; id: number } | { kind: 'slug'; slug: string }

/**
 * A /kurzusok/[slug] szegmens feloldása:
 * - csak számjegy → régi, id-alapú URL (a route ilyenkor átirányít);
 * - egyébként slug-alakra normalizálva, hogy a nagybetűs/ékezetes változat is
 *   megtalálja a kurzust — utána a route a kanonikus címre irányít;
 * - értelmezhetetlen (üres vagy csak írásjel) → null, azaz 404.
 */
export function parseCourseRouteParam(raw: string | undefined): CourseRouteParam | null {
  if (typeof raw !== 'string') {
    return null
  }
  const id = parseCourseIdParam(raw)
  if (id !== null) {
    return { kind: 'id', id }
  }
  // Itt SZÁNDÉKOSAN a nyers slugify fut (nem a buildCourseSlug): a számjegyes
  // eset már fentebb id-ként dőlt el, a `kurzus-` előtag itt elrontaná a
  // tárolt sluggal való egyezést.
  const slug = slugify(raw)
  return slug.length > 0 ? { kind: 'slug', slug } : null
}

/**
 * Kell-e tartós átirányítás a kanonikus címre? A visszaadott út SOSEM az éppen
 * kiszolgált URL, a cél pedig maga a kanonikus cím — így az átirányítás
 * legfeljebb egy lépés, és nem futhat körbe.
 */
export function canonicalCourseRedirect(rawParam: string, product: CourseUrlDoc): string | null {
  const canonical = courseHref(product)
  return canonical === `${COURSE_BASE_PATH}/${rawParam}` ? null : canonical
}

/** A Next App Router `searchParams` alakja (page-propként, feloldás után). */
export type CourseSearchParams = Record<string, string | string[] | undefined>

/**
 * A bejövő query string VÁLTOZATLAN továbbfűzése az átirányítási célra.
 *
 * A régi (id-s vagy nem kanonikus) kurzus-URL-ek 308-as átirányítása enélkül
 * eldobná a query-t — a kint élő, UTM-paraméteres linkek (hírlevél, hirdetés)
 * kampány-attribúciója veszne el a kanonikus oldalon (PostHog/GA4). Az
 * ismétlődő kulcsok (tömb-érték) sorrendhelyesen megmaradnak.
 */
export function withSearchParams(path: string, searchParams: CourseSearchParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      query.append(key, value)
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry)
      }
    }
  }
  const qs = query.toString()
  return qs.length > 0 ? `${path}?${qs}` : path
}
