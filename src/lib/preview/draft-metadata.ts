import type { Metadata } from 'next'

/**
 * Draft-előnézet és SEO — a piszkozat sosem indexelhető.
 *
 * Az előnézet a nyilvános útvonalon (`/`, `/<slug>`, `/blog/<slug>`) jelenik meg,
 * csak draft mode sütivel. Ha egy ilyen választ mégis begyűjtene egy crawler vagy
 * egy megosztott URL, a publikálatlan tartalom nem kerülhet a keresőindexbe —
 * ezért az előnézeti válasz robots-meta mindig noindex/nofollow.
 */

/** A robots-meta az előnézeti (draft) válaszokhoz. */
export const DRAFT_ROBOTS: NonNullable<Metadata['robots']> = {
  index: false,
  follow: false,
}

/**
 * A generateMetadata eredményének kiegészítése az előnézeti robots-metával.
 * Nem-draft módban változatlanul adja vissza a kapott metaadatot.
 */
export function withDraftRobots(metadata: Metadata, isDraft: boolean): Metadata {
  return isDraft ? { ...metadata, robots: DRAFT_ROBOTS } : metadata
}
