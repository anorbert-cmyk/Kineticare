import { HOME_PAGE_SLUG } from '../content-slugs'

/**
 * Piszkozat-előnézet (draft preview) — útvonal- és URL-számítás.
 *
 * Tiszta, függőségmentes segédek: a Payload-config oldala (collections
 * `admin.preview`) és a Next route-handler (`/next/preview`) ugyanezt a
 * leképezést használja, így az admin „Előnézet" gombja és a route sosem
 * kerülhet ellentmondásba.
 */

/** Az előnézetet támogató collectionök (a pages és a posts használ draftokat). */
export const PREVIEW_COLLECTIONS = ['pages', 'posts'] as const
export type PreviewCollection = (typeof PREVIEW_COLLECTIONS)[number]

/** Az előnézetet bekapcsoló route útvonala. */
export const PREVIEW_PATH = '/next/preview'
/** Az előnézetből kilépő route útvonala (a bekötés a B2 csomag feladata). */
export const EXIT_PREVIEW_PATH = '/next/exit-preview'

export const isPreviewCollection = (value: unknown): value is PreviewCollection =>
  typeof value === 'string' && (PREVIEW_COLLECTIONS as readonly string[]).includes(value)

/**
 * A dokumentum NYILVÁNOS útvonala:
 * - poszt → `/blog/<slug>`
 * - kezdőlap-oldal → `/`
 * - egyéb oldal → `/<slug>`
 *
 * Üres/hiányzó slug esetén null (ilyen dokumentumra nincs értelmezhető előnézet).
 */
export const previewTargetPath = (collection: PreviewCollection, slug: unknown): string | null => {
  if (typeof slug !== 'string') {
    return null
  }
  const normalized = slug.trim()
  if (normalized.length === 0) {
    return null
  }
  if (collection === 'posts') {
    return `/blog/${normalized}`
  }
  return normalized === HOME_PAGE_SLUG ? '/' : `/${normalized}`
}

/** A szerver gyökér-URL-je (a storefront és az admin ugyanazt a változót használja). */
const serverUrl = (): string =>
  (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

/**
 * Az admin „Előnézet" gombjának URL-je. A slug query-paraméterként utazik, hogy
 * a route a publikálatlan (draft) dokumentumot is meg tudja keresni.
 * Slug nélküli (még el nem mentett) dokumentumnál null — ilyenkor a Payload
 * nem jeleníti meg a gombot.
 */
export const buildAdminPreviewUrl = (
  collection: PreviewCollection,
  slug: unknown,
): string | null => {
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    return null
  }
  const params = new URLSearchParams({ collection, slug: slug.trim() })
  return `${serverUrl()}${PREVIEW_PATH}?${params.toString()}`
}
