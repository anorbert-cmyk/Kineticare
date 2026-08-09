import type { FieldHook, TextField } from 'payload'

import {
  buildCourseSlug,
  courseSlugSource,
  isNumberedVariantOf,
  nextFreeCourseSlug,
} from '../lib/course-url'
import { logger } from '../lib/logger'

/**
 * A kurzus (products) webcím-mezője (C3).
 *
 * Miért nem a közös `slugField()` (src/fields/slug.ts):
 * - a products collectionnek nincs `title` mezője, a forrás a `displayTitle` →
 *   `sku` lánc;
 * - a mező NEM `required`: a bevezetés előtti sorokban NULL marad (a Payload a
 *   required mezőből NOT NULL oszlopot generálna, ami meglévő adat mellett
 *   megbukna). A slug nélküli kurzus a régi, id-alapú URL-en marad elérhető —
 *   a route ezt kiszolgálja;
 * - ütközésnél a slug SORSZÁMOZÓDIK (`-2`, `-3`…) ahelyett, hogy a mentés
 *   unique-hibára futna: a kurzusok neve gyakran hasonló, és a szerkesztőt nem
 *   szabad kézi webcím-ütköztetésre kényszeríteni.
 */

/** Szövegmező kiolvasása ismeretlen alakú hook-adatból (`any` nélkül). */
function readText(source: unknown, key: string): string | null {
  if (typeof source !== 'object' || source === null) {
    return null
  }
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/** A dokumentum azonosítója az eredeti (update előtti) dokumentumból; create-nél null. */
function readId(source: unknown): number | null {
  if (typeof source !== 'object' || source === null) {
    return null
  }
  const value = (source as Record<string, unknown>).id
  return typeof value === 'number' ? value : null
}

/**
 * A dokumentum címéből (displayTitle → sku) automatikusan adódó slug —
 * `data` (a mentendő adat) elsőbbséggel, hiányzó mezőnél az eredeti dokumentum.
 */
function autoSlugFrom(source: unknown, fallback: unknown): string | null {
  return buildCourseSlug(
    courseSlugSource({
      displayTitle: readText(source, 'displayTitle') ?? readText(fallback, 'displayTitle'),
      sku: readText(source, 'sku') ?? readText(fallback, 'sku'),
    }),
  )
}

/**
 * Slug-generálás és ütközés-feloldás.
 *
 * A szabályok sorrendje (a fenti a döntő):
 * 1. Változatlan slug → nincs teendő és nincs lekérdezés. A products collection
 *    AUTOSAVE-es piszkozatot használ, tehát a hook szerkesztés közben
 *    másodpercenként futhat.
 * 2. Kézzel átírt slug → az marad (slug-alakra normalizálva, ütközés esetén
 *    sorszámmal).
 * 3. Nincs még slug → a `displayTitle` → `sku` láncból generálódik.
 * 4. Van már slug, de a mentendő adatban nem érkezett (részleges API-frissítés)
 *    → marad. KÖZZÉTETT kurzus webcíme sosem változhat magától: az élő URL
 *    törne el alatta.
 * 5. Még közzé NEM tett kurzusnál a slug KÖVETI a címet, amíg automatikus
 *    (azaz a korábbi címből generált). Enélkül az autosave a félig begépelt
 *    címből fagyasztaná be a webcímet („ke" a „Kézrehabilitáció otthon"
 *    helyett) — kézzel írt slugot viszont sosem ír felül.
 */
const generateCourseSlug: FieldHook = async ({ data, originalDoc, req, value }) => {
  const typed = typeof value === 'string' ? value.trim() : ''
  const previous = readText(originalDoc, 'slug')?.trim() ?? ''

  if (typed.length > 0 && typed === previous) {
    return previous
  }

  let base: string | null
  if (typed.length > 0) {
    base = buildCourseSlug(typed)
  } else {
    const auto = autoSlugFrom(data, originalDoc)
    if (previous.length > 0) {
      const status = readText(data, 'status') ?? readText(originalDoc, 'status')
      const previousAuto = autoSlugFrom(originalDoc, null)
      const slugFollowsTitle =
        status !== 'published' &&
        previousAuto !== null &&
        isNumberedVariantOf(previous, previousAuto)
      // A cím változatlan (vagy a slugja ugyanaz) → felesleges lekérdezés nélkül marad.
      if (!slugFollowsTitle || auto === null || isNumberedVariantOf(previous, auto)) {
        return previous
      }
    }
    base = auto
  }

  if (base === null) {
    // Se cím, se azonosító: a kurzus slug nélkül marad (régi, id-alapú URL).
    return null
  }

  const currentId = readId(originalDoc)
  try {
    const existing = await req.payload.find({
      collection: 'products',
      depth: 0,
      limit: 1000,
      overrideAccess: true,
      select: { slug: true },
      // A kukába tett (soft-deleted) kurzus sora — és vele a slugja — a
      // táblában marad, tehát a unique indexet TOVÁBBRA IS foglalja. Ha
      // kihagynánk, a mentés a DB-nél bukna el unique-hibával.
      trash: true,
      where:
        currentId === null
          ? { slug: { contains: base } }
          : { and: [{ slug: { contains: base } }, { id: { not_equals: currentId } }] },
    })
    const taken = existing.docs
      .map((doc) => (typeof doc.slug === 'string' ? doc.slug : null))
      .filter((slug): slug is string => slug !== null && isNumberedVariantOf(slug, base))
    return nextFreeCourseSlug(base, taken)
  } catch (error) {
    // A foglaltság-lekérdezés hibája nem akaszthatja meg a mentést: a séma
    // unique indexe a kettőzés ellen így is véd.
    logger.warn('kurzus-slug foglaltság-ellenőrzés sikertelen — az alap slug marad', {
      slug: base,
      error: error instanceof Error ? error.message : String(error),
    })
    return base
  }
}

export const courseSlugField: TextField = {
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  label: 'Webcím (slug)',
  admin: {
    description:
      'A kurzus webcíme (pl. kezrehabilitacio-otthon). Magától kitöltődik a kurzus címéből, ékezetek nélkül, kötőjelekkel; ha a webcím már foglalt, sorszám kerül a végére. Csak akkor írd át, ha tudod, mit csinálsz — a régi webcím ilyenkor megszűnik működni.',
  },
  hooks: {
    beforeValidate: [generateCourseSlug],
  },
}
