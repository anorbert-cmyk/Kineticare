import { getPayload } from 'payload'

import config from '../payload.config'
import type { Category, Page, Post, Product } from '../payload-types'
import { logger } from './logger'

/**
 * Storefront CMS-adatforrás (server component oldali lekérdezések).
 *
 * Konvenciók (az src/lib/menus.ts mintáját követve):
 * - Payload local API, ELŐ adat (kliensoldali fetch nincs).
 * - overrideAccess: true + EXPLICIT `status: published` szűrő: a nyilvános
 *   read-politika (src/access/publishedOrAdmin.ts) ezt anonim olvasóra már
 *   kikényszerítené, de így a draft-tartalom kizárása a kód egyetlen,
 *   tesztelt útvonalán, determinisztikusan történik — a draft sosem
 *   jelenhet meg publikusan.
 * - draft: false: a draft-verziózás miatti piszkozat-tartalom sem szivároghat
 *   be (mindig a legutóbb publikált verzió jön).
 * - Hibatűrés: lekérdezési hiba (pl. build-időben nincs DB) esetén biztonságos
 *   üres érték + logger.warn — az oldal ettől még renderel.
 */

/** A publikáltsági where-feltétel — a draft/published viselkedés egységes forrása. */
export const PUBLISHED_WHERE = { status: { equals: 'published' } } as const

export const HOME_PAGE_SLUG = 'kezdolap'

async function safeQuery<T>(label: string, query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query()
  } catch (error) {
    logger.warn(`CMS-lekérdezés sikertelen (${label}) — üres értékkel renderelünk`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return fallback
  }
}

/** Kezdőlap-tartalom: a 'kezdolap' slugú published oldal (hero + bevezető forrása). */
export async function getHomePage(): Promise<Page | null> {
  return safeQuery(
    'kezdolap',
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { equals: HOME_PAGE_SLUG }, ...PUBLISHED_WHERE },
        limit: 1,
        depth: 1,
        draft: false,
        overrideAccess: true,
      })
      return docs[0] ?? null
    },
    null,
  )
}

/** CMS-oldal slug alapján (csak published; a draft 404-et ad a route-ban). */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  return safeQuery(
    `oldal:${slug}`,
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'pages',
        where: { slug: { equals: slug }, ...PUBLISHED_WHERE },
        limit: 1,
        depth: 1,
        draft: false,
        overrideAccess: true,
      })
      return docs[0] ?? null
    },
    null,
  )
}

/** Legfrissebb published posztok (publishedAt desc; publishedAt nélküliek a végén). */
export async function getLatestPosts(limit = 3): Promise<Post[]> {
  return safeQuery(
    'friss-posztok',
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'posts',
        where: PUBLISHED_WHERE,
        limit,
        sort: '-publishedAt',
        depth: 1,
        draft: false,
        overrideAccess: true,
      })
      return docs
    },
    [],
  )
}

/** Bloglista: published posztok, opcionális kategória-szűréssel. */
export async function getPosts(options: { categoryId?: number; limit?: number } = {}): Promise<Post[]> {
  const { categoryId, limit = 60 } = options
  return safeQuery(
    'poszt-lista',
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'posts',
        where:
          typeof categoryId === 'number'
            ? { ...PUBLISHED_WHERE, categories: { contains: categoryId } }
            : PUBLISHED_WHERE,
        limit,
        sort: '-publishedAt',
        depth: 1,
        draft: false,
        overrideAccess: true,
      })
      return docs
    },
    [],
  )
}

/** Poszt slug alapján — author/categories/relatedPosts populate-olva (depth 2). */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  return safeQuery(
    `poszt:${slug}`,
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'posts',
        where: { slug: { equals: slug }, ...PUBLISHED_WHERE },
        limit: 1,
        depth: 2,
        draft: false,
        overrideAccess: true,
      })
      return docs[0] ?? null
    },
    null,
  )
}

/** Tartalom-kategóriák (a blog kategória-szűrőjéhez és a kategória-oldalakhoz). */
export async function getContentCategories(): Promise<Category[]> {
  return safeQuery(
    'kategoriak',
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'categories',
        where: { type: { equals: 'content' } },
        limit: 100,
        sort: 'title',
        depth: 0,
        overrideAccess: true,
      })
      return docs
    },
    [],
  )
}

/** Kategória slug alapján (content-típusú; a kategória-oldal 404-jéhez). */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return safeQuery(
    `kategoria:${slug}`,
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'categories',
        where: { slug: { equals: slug }, type: { equals: 'content' } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      return docs[0] ?? null
    },
    null,
  )
}

/**
 * Kurzus-kiemelés a kezdőlaphoz: published termékek (cover/cím/ár kártyákhoz).
 * A products publikáltsága a saját `status` selectje (draft/published/archived);
 * az archived sosem kerül ki a storefrontra.
 */
export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  return safeQuery(
    'kurzus-kiemeles',
    async () => {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'products',
        where: PUBLISHED_WHERE,
        limit,
        sort: '-createdAt',
        depth: 1,
        draft: false,
        overrideAccess: true,
      })
      return docs
    },
    [],
  )
}
