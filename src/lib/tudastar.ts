import { courseHref } from './course-url'
import { coursePriceBadgeKind } from './courses'
import type { Category, Post, Product } from '../payload-types'

/**
 * Tudástár (blog) — tiszta segédfüggvények a listákhoz és a sitemaphoz.
 *
 * A modul SZÁNDÉKOSAN DB-független: a route-ok és a sitemap már lekérdezett
 * dokumentumokat adnak be, így a szabályok adatbázis nélkül tesztelhetők
 * (ugyanaz a minta, mint az src/lib/course-url.ts-nél).
 */

/** Egy kategória-hivatkozás lehet nyers id vagy populate-olt dokumentum. */
type CategoryRef = number | Category

/** A poszt kategória-hivatkozásai id-ként (a nyers és a populate-olt alak is). */
function categoryIdsOf(post: Pick<Post, 'categories'>): number[] {
  if (!Array.isArray(post.categories)) {
    return []
  }
  return post.categories
    .map((category: CategoryRef) => (typeof category === 'object' && category !== null ? category.id : category))
    .filter((id): id is number => typeof id === 'number')
}

/**
 * Azok a kategóriák, amelyekhez ténylegesen tartozik a megadott (published)
 * posztok közül legalább egy.
 *
 * MIÉRT KELL. Az üres kategória-oldal 200-as státusszal, de tartalom nélkül
 * válaszol; a Google ezt „soft 404"-ként kezeli, ha „the content suggests an
 * error for Google Search, an empty page or an error message"
 * (https://developers.google.com/search/docs/crawling-indexing/http-network-errors).
 * A sitemapbe pedig csak olyan cím való, amit tényleg látni akarunk a
 * találatok közt: „Include the URLs in your sitemap that you want to see in
 * Google's search results."
 * (https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
 *
 * A sorrend a bemeneti kategória-sorrendet követi (a CMS cím szerinti magyar
 * ábécé-rendezését), hogy a sitemap kimenete determinisztikus legyen.
 */
export function categoriesWithPosts<T extends Pick<Category, 'id' | 'slug'>>(
  categories: readonly T[],
  posts: readonly Pick<Post, 'categories'>[],
): T[] {
  const used = new Set<number>()
  for (const post of posts) {
    for (const id of categoryIdsOf(post)) {
      used.add(id)
    }
  }
  return categories.filter(
    (category) => used.has(category.id) && typeof category.slug === 'string' && category.slug.length > 0,
  )
}

/**
 * A TUDATOSAN ingyenes kurzus kanonikus útvonala, ha van ilyen published
 * termék; különben null.
 *
 * A „tudatosan ingyenes" definíciója a kód sajátja: `priceInHUFEnabled:
 * false` (courses.ts `coursePriceBadgeKind` → 'free'). A 'none' állapot
 * (ár-pipa BE, ár ÜRES) SZÁNDÉKOSAN nem számít ingyenesnek: az konfigurációs
 * hiba, és az ilyen termékre mutató „Elindítom ingyen" felirat hazugság
 * lenne. Ez ugyanaz a csapda, amit az IA-audit T1 pontja mért a kezdőlapon.
 */
export function freeCourseHref(
  products: readonly Pick<Product, 'id' | 'slug' | 'priceInHUF' | 'priceInHUFEnabled'>[],
): string | null {
  const free = products.find((product) => coursePriceBadgeKind(product) === 'free')
  return free ? courseHref(free) : null
}
