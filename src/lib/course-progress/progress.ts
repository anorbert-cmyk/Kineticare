import { playableStreamVideos, streamVideoRef, type StreamVideoLike } from '../stream/contract'

/**
 * Kurzus-haladás SZÁMÍTÁSA — tiszta, DB- és Next-függés nélküli modul, hogy
 * kimerítően egységtesztelhető legyen (src/__tests__/course-progress.test.ts).
 * A lejátszó-oldal, a kurzusaim-lista és a lejátszó-komponens KIZÁRÓLAG ezt
 * használja, így a felületen mindenhol ugyanaz a szám jelenik meg.
 *
 * SZABÁLYOK (az élesben előforduló szélsőséges esetek miatt):
 * - A haladás mindig a JELENLEGI videólistához mérődik. Ha egy megnézett videót
 *   időközben töröltek a kurzusból (ORPHAN ref), az sem a megnézett, sem az
 *   összes darabszámba nem számít bele — és nem is hibázik. Enélkül „8/7 videó
 *   megnézve" típusú, hibásnak látszó állapotok keletkeznének.
 * - A számláló alapja a LEJÁTSZHATÓ videók listája (`playableStreamVideos`) —
 *   ugyanaz a szűrés, amit a lejátszó epizódlistája mutat. A feldolgozás alatti
 *   videó nem nézhető meg, tehát nem is várható el a vevőtől.
 * - 0 videós kurzus: nincs osztás nullával, a százalék 0, a felirat pedig a
 *   „Még nincs videó" állapot.
 * - Duplikált haladás-sor (ha a unique compound index még nem futott le a
 *   migrációval) nem torzíthat: a refek Set-be kerülnek.
 */

/** Üres/whitespace ref sosem azonosít videót — a Set-be sem kerül be. */
function normalizeRef(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Megnézett-ref lista → deduplikált halmaz (üres/hibás elemek nélkül). */
export function toWatchedRefSet(refs: readonly (string | null | undefined)[]): Set<string> {
  const set = new Set<string>()
  for (const ref of refs) {
    const normalized = normalizeRef(ref)
    if (normalized !== null) {
      set.add(normalized)
    }
  }
  return set
}

/** A `course-progress` sor minimális alakja, amennyit a számítás ismer. */
export interface CourseProgressRowLike {
  /** relationship: nyers id (number) vagy populate-olt dokumentum. */
  product?: number | { id?: number | null } | null
  videoRef?: string | null
}

/** A relationship-érték numerikus azonosítója (nyers id vagy populate-olt doc). */
function relationshipId(value: CourseProgressRowLike['product']): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'object' && value !== null && typeof value.id === 'number') {
    return value.id
  }
  return null
}

/**
 * Haladás-sorok → productId → megnézett refek halmaza.
 * A dedupe itt történik meg (Set), a hiányos sorok pedig kimaradnak.
 */
export function watchedRefsByProduct(
  rows: readonly CourseProgressRowLike[],
): Map<number, Set<string>> {
  const byProduct = new Map<number, Set<string>>()
  for (const row of rows) {
    const productId = relationshipId(row.product)
    const ref = normalizeRef(row.videoRef)
    if (productId === null || ref === null) {
      continue
    }
    const existing = byProduct.get(productId)
    if (existing === undefined) {
      byProduct.set(productId, new Set([ref]))
    } else {
      existing.add(ref)
    }
  }
  return byProduct
}

export interface CourseProgressSummary {
  /** A kurzus LEJÁTSZHATÓ videóinak száma. */
  total: number
  /** Ebből hány van megnézettként jelölve (orphan ref nem számít bele). */
  watched: number
  /** Kerekített százalék, 0–100. 0 videó esetén 0 (nincs osztás nullával). */
  percent: number
  /** „3/7 videó megnézve" — a lejátszó fejlécébe; 0 videónál „Még nincs videó". */
  label: string
  /** „3/7 megnézve" — a kurzuslista visszafogott meta-sorába. */
  shortLabel: string
  /** Minden lejátszható videó meg van nézve (0 videós kurzusnál false). */
  complete: boolean
}

/** A 0 videós kurzus felirata — a lejátszóban és a listán is ugyanaz. */
export const NO_VIDEOS_LABEL = 'Még nincs videó'

/**
 * Egy kurzus haladás-összegzése a JELENLEGI videólistából és a megnézett
 * refekből. A `watchedRefs` bármilyen iterálható (tömb vagy Set) lehet.
 */
export function summarizeCourseProgress(
  videos: readonly StreamVideoLike[] | null | undefined,
  watchedRefs: Iterable<string | null | undefined>,
): CourseProgressSummary {
  const watchedSet = toWatchedRefSet([...watchedRefs])
  const playable = playableStreamVideos(videos)

  // A metszet a JELENLEGI videólistával: az orphan ref (törölt videó) kiesik.
  let watched = 0
  for (const video of playable) {
    const ref = streamVideoRef(video)
    if (ref !== null && watchedSet.has(ref)) {
      watched += 1
    }
  }

  const total = playable.length
  const percent = total === 0 ? 0 : Math.round((watched / total) * 100)
  return {
    total,
    watched,
    percent,
    label: total === 0 ? NO_VIDEOS_LABEL : `${watched}/${total} videó megnézve`,
    shortLabel: total === 0 ? NO_VIDEOS_LABEL : `${watched}/${total} megnézve`,
    complete: total > 0 && watched === total,
  }
}
