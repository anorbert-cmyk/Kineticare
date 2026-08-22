import { HOME_PAGE_SLUG } from '../content-slugs'
import { hasControlCharacter } from '../return-url'

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
 *
 * BIZTONSÁG (open redirect): a visszaadott útvonalból a route `Location` fejléc
 * lesz, ezért a slug CSAK egyetlen útvonal-szegmens lehet. Az elválasztót (`/`,
 * `\`), séma-jelölőt (`:`) vagy vezérlőkaraktert tartalmazó érték idegen
 * eredetre vinne (pl. a `//evil.example` slugból `//evil.example` protokoll-
 * relatív cím lenne), ezért az ilyen slug is null — a hívó route ilyenkor a
 * meglévő 400-as ágon utasítja el a kérést, és a draft mode be sem kapcsol.
 */
export const previewTargetPath = (collection: PreviewCollection, slug: unknown): string | null => {
  if (typeof slug !== 'string') {
    return null
  }
  const normalized = slug.trim()
  if (normalized.length === 0) {
    return null
  }
  if (/[/\\:]/.test(normalized) || hasControlCharacter(normalized)) {
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
 * Az átirányítás bázisa a PUBLIKUS origin: a proxy (Railway edge) mögött a
 * `request.url` a konténer belső címét (pl. `http://localhost:8080`) hordozza,
 * ami élhetetlen `Location` fejlécet adna. Az env csak akkor bázis, ha érvényes
 * abszolút http(s) URL — egyébként a kérés URL-je a vésztartalék (üres/hibás
 * env sosem dobhat 500-at).
 *
 * Közös a `/next/preview` és a `/next/exit-preview` handlerekben (W11).
 */
export const resolvePublicOrigin = (requestUrl: string): string => {
  const envOrigin = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/+$/, '')
  if (envOrigin !== '') {
    try {
      const parsed = new URL(envOrigin)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin
      }
    } catch {
      // Hibás env: a kérés URL-je a tartalék.
    }
  }
  try {
    return new URL(requestUrl).origin
  } catch {
    return 'http://localhost:3000'
  }
}

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
