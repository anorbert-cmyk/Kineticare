import type { Category, Media, Product } from '../payload-types'

import { formatPriceHuf } from './format-price'

/**
 * Kurzus-storefront üzleti logika — tiszta, DB- és Next-függés nélküli
 * függvények, hogy a courses.test.ts egységtesztelje őket. A kurzus-oldalak
 * (src/app/(frontend)/kurzusok/**) ezeket használják.
 *
 * Mező-konvenciók (products collection, src/plugins/ecommerce.ts):
 * - A megjelenő név a `displayTitle` → `sku` lánc (courseTitle); az URL a
 *   `slug`, ennek hiányában a numerikus `id`. Az URL-építés és a slug-szabályok
 *   EGY helyen élnek: src/lib/course-url.ts (courseHref).
 * - Ár: `priceInHUF` (bruttó egész forint), csak `priceInHUFEnabled` mellett
 *   értelmezett.
 * - Státusz: saját `status` select (draft/published/archived) — NEM a drafts
 *   `_status`. A storefronton published listázódik; archived nem vehető és
 *   nem listázódik, de a meglévő vevő tovább nézi.
 */

/**
 * A checkout (pénztár) útvonala — a végső checkout-flow a W3-hullámban dől
 * el; addig is ide visz a „Megveszem" CTA, a terméket a `termek`
 * query-param hordozza. TODO(W3): a végleges útvonalra igazítani.
 */
export const CHECKOUT_PATH = '/penztar'

/**
 * A „kurzusaim" (vevői kurzuslista) útvonala — a védett lejátszó- és
 * fiókfelület a W3-hullám feladata. TODO(W3): a végleges útvonalra igazítani.
 */
export const MY_COURSES_PATH = '/kurzusaim'

/** Archived termék CTA-mellékjelölése (üzleti szöveg — NE változzon hangyászaton). */
export const ARCHIVED_COURSE_NOTE = 'Ez a kurzus jelenleg nem vásárolható.'

/** A kurzuslista kategória-szűrőjének query-param neve (/kurzusok?kategoria=<slug>). */
export const CATEGORY_QUERY_PARAM = 'kategoria'

/** Checkout-link a termékhez (a pénztár a numerikus id-t kapja query-paraméterben). */
export function checkoutHref(productId: number): string {
  return `${CHECKOUT_PATH}?termek=${productId}`
}

/**
 * „Már megvetted" ellenőrzés: a users.purchases relationship eleme lehet
 * nyers id (number) vagy populate-olt Product-dokumentum (a lekérdezés
 * depth-jétől függ). Ugyanaz a szemantika, mint a stream-token paywallé.
 */
export function hasUserPurchased(
  purchases: { id: number }[] | (number | { id: number })[] | null | undefined,
  productId: number,
): boolean {
  if (!Array.isArray(purchases)) {
    return false
  }
  return purchases.some((entry) => {
    if (typeof entry === 'number') {
      return entry === productId
    }
    return typeof entry === 'object' && entry !== null && entry.id === productId
  })
}

export type CourseCtaKind = 'buy' | 'purchased' | 'archived' | 'unavailable' | 'free'

export interface CourseCtaState {
  kind: CourseCtaKind
  /** A gomb felirata (buy/archived: „Megveszem"; purchased: „Tovább a kurzusaimhoz"; free: „Ingyenes — azonnal eléred"). */
  label: string
  /** Link-cél; letiltott (archived/unavailable) állapotban null. */
  href: string | null
  disabled: boolean
  /** Archived jelölés szövege — csak archived kind mellett értelmezett. */
  note: string | null
}

/**
 * A kurzus-oldal CTA-állapotgépe:
 * - bejelentkezett vevő (purchases tartalmazza) → „Tovább a kurzusaimhoz"
 *   link — archived terméknél is (a meglévő vevő tovább nézi);
 * - archived + nem vevő → a CTA INAKTÍV + ARCHIVED_COURSE_NOTE jelölés;
 * - published + nem vevő:
 *   - ingyenes (priceInHUFEnabled: false) → „Ingyenes — azonnal eléred"
 *     (regisztráció után purchases-be kerül, NEM a Barion-checkouton keresztül);
 *   - fizetős → „Megveszem" → checkout;
 * - minden más (draft/ismeretlen) → inaktív (a nyilvános oldal egyébként
 *   404-et ad draft termékre; ez a védekező ág).
 */
export function resolveCourseCta(
  product: Pick<Product, 'id' | 'status' | 'priceInHUFEnabled'>,
  purchased: boolean,
): CourseCtaState {
  if (purchased) {
    return {
      kind: 'purchased',
      label: 'Tovább a kurzusaimhoz',
      href: MY_COURSES_PATH,
      disabled: false,
      note: null,
    }
  }
  if (product.status === 'archived') {
    return {
      kind: 'archived',
      label: 'Megveszem',
      href: null,
      disabled: true,
      note: ARCHIVED_COURSE_NOTE,
    }
  }
  if (product.status === 'published') {
    // Ingyenes kurzus (priceInHUFEnabled: false): regisztráció után azonnal
    // elérhető, NEM a Barion-checkouton keresztül — a purchases-be a
    // regisztráció/hozzáférés-adás flow írja (W3 5D scope).
    if (product.priceInHUFEnabled === false) {
      return {
        kind: 'free',
        label: 'Ingyenes — azonnal eléred',
        href: MY_COURSES_PATH,
        disabled: false,
        note: null,
      }
    }
    return {
      kind: 'buy',
      label: 'Megveszem',
      href: checkoutHref(product.id),
      disabled: false,
      note: null,
    }
  }
  return {
    kind: 'unavailable',
    label: 'Megveszem',
    href: null,
    disabled: true,
    note: null,
  }
}

/**
 * Numerikus kurzus-azonosító egy URL-szegmensből; bármi más → null.
 *
 * Két helyen kell: a védett lejátszó-útvonalon (/kurzusaim/[id]) és a
 * nyilvános kurzus-URL feloldásában (src/lib/course-url.ts), ahol a régi,
 * id-alapú címeket ismerjük fel — azok innen kapják a 301-es átirányítást a
 * slugos címre.
 */
export function parseCourseIdParam(slug: string | undefined): number | null {
  if (typeof slug !== 'string') {
    return null
  }
  const trimmed = slug.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const id = Number(trimmed)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * A kurzus megjelenített neve.
 *
 * Lánc: `displayTitle` (C3 — a látogatónak szóló cím) → `sku` (a régi, kettős
 * szerepű azonosító-név) → azonosítós fallback. A `displayTitle` opcionális,
 * ezért a szűkebb (csak `sku`-t hordozó) hívók változatlanul működnek.
 */
export function courseTitle(
  product: Pick<Product, 'id' | 'sku'> & { displayTitle?: string | null },
): string {
  const displayTitle = typeof product.displayTitle === 'string' ? product.displayTitle.trim() : ''
  if (displayTitle.length > 0) {
    return displayTitle
  }
  const sku = typeof product.sku === 'string' ? product.sku.trim() : ''
  return sku.length > 0 ? sku : `Kurzus #${product.id}`
}

/** A termék ára egész forintban; null, ha az ár nincs engedélyezve/kitöltve. */
export function coursePriceHuf(
  product: Pick<Product, 'priceInHUF' | 'priceInHUFEnabled'>,
): number | null {
  if (product.priceInHUFEnabled !== true) {
    return null
  }
  return typeof product.priceInHUF === 'number' && Number.isFinite(product.priceInHUF)
    ? product.priceInHUF
    : null
}

/** Ár-megjelenítés a kártyákon/részleteken — az 5A formatPriceHuf közös formázója. */
export function coursePriceLabel(
  product: Pick<Product, 'priceInHUF' | 'priceInHUFEnabled'>,
): string | null {
  const price = coursePriceHuf(product)
  return price === null ? null : formatPriceHuf(price)
}

export interface CourseCategoryOption {
  id: number
  slug: string
  title: string
}

/** A relationship-mező populate-olt értéke (objektum) vagy nyers id lehet. */
function populatedCategory(category: Product['category']): Category | null {
  return typeof category === 'object' && category !== null ? category : null
}

/**
 * A megjelenített kurzusok tényleges kategóriái (szűrő-chipek forrása).
 * Csak a listában ténylegesen előforduló, slug-gal rendelkező kategóriák —
 * így a szűrő sosem vezet biztosan üres eredményre. Cím szerinti magyar
 * ábécé-sorrend.
 */
export function collectCourseCategories(
  products: Pick<Product, 'category'>[],
): CourseCategoryOption[] {
  const byId = new Map<number, CourseCategoryOption>()
  for (const product of products) {
    const category = populatedCategory(product.category)
    if (!category || typeof category.slug !== 'string' || category.slug.trim().length === 0) {
      continue
    }
    if (!byId.has(category.id)) {
      byId.set(category.id, {
        id: category.id,
        slug: category.slug,
        title: category.title,
      })
    }
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title, 'hu'))
}

/**
 * Kategória-szűrés a kurzuslistán. `null` slug = nincs szűrés (összes).
 * A nem populate-olt (nyers id) kategóriájú termék slug-szűrésnél kiesik —
 * a lista-lekérdezés depth:1-gyel populate-ol, ez a védekező ág.
 */
export function filterCoursesByCategory<T extends Pick<Product, 'category'>>(
  products: T[],
  categorySlug: string | null,
): T[] {
  if (categorySlug === null) {
    return products
  }
  return products.filter((product) => {
    const category = populatedCategory(product.category)
    return category !== null && category.slug === categorySlug
  })
}

/**
 * A ?kategoria= query-param normalizálása: csak a megjelenített kategóriák
 * valamelyike fogadható el; ismeretlen/üres érték → null (szűretlen lista),
 * így egy elgépelt link sem mutat látszólag „üres boltot".
 */
export function resolveCategoryFilter(
  raw: string | string[] | undefined,
  categories: CourseCategoryOption[],
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') {
    return null
  }
  const slug = value.trim()
  return categories.some((category) => category.slug === slug) ? slug : null
}

export interface CourseCover {
  url: string
  alt: string
  width: number | null
  height: number | null
}

/**
 * A kártya borítóképe: a media `sm` (640px) méretét részesíti előnyben,
 * arra hajazva, hogy a kártyarácson ez a tipikus megjelenítési méret;
 * hiányában az eredeti. Csak populate-olt, url-es képpel tér vissza.
 */
export function courseCover(product: Pick<Product, 'coverImage'>): CourseCover | null {
  const media: Media | null =
    typeof product.coverImage === 'object' && product.coverImage !== null
      ? product.coverImage
      : null
  if (!media) {
    return null
  }
  const sm = media.sizes?.sm
  const url = typeof sm?.url === 'string' && sm.url.length > 0 ? sm.url : media.url
  if (typeof url !== 'string' || url.length === 0) {
    return null
  }
  const width = url === sm?.url ? (sm?.width ?? null) : (media.width ?? null)
  const height = url === sm?.url ? (sm?.height ?? null) : (media.height ?? null)
  return { url, alt: media.alt, width, height }
}
