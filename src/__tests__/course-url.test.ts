import { describe, expect, it } from 'vitest'

import {
  COURSE_BASE_PATH,
  NUMERIC_SLUG_PREFIX,
  buildCourseSlug,
  canonicalCourseRedirect,
  courseHref,
  courseSlugSource,
  isNumberedVariantOf,
  nextFreeCourseSlug,
  parseCourseRouteParam,
  withSearchParams,
} from '../lib/course-url'

/**
 * Kurzus-URL (C3): slug-generálás és a régi, id-alapú címek átirányítása.
 *
 * Miért teszteljük ilyen aprólékosan:
 * (1) a slug a KERESŐ számára a kurzus címe — az ékezet-transzliteráció vagy a
 *     kebab-case elcsúszása csendben rontja el a webcímeket;
 * (2) a slug és a régi numerikus id UGYANAZON az útvonal-szegmensen osztozik,
 *     ezért a két névtér diszjunkt kell legyen (különben a 301 elvihet egy
 *     másik kurzusra, vagy körbe érhet);
 * (3) az átirányítási KÖR a legdrágább hiba: a látogató és a kereső is
 *     elérhetetlennek látja az oldalt.
 */

describe('slug-generálás magyar címből', () => {
  it('ékezetes betűket transzliterál, kisbetűsít és kötőjelez', () => {
    expect(buildCourseSlug('Kézrehabilitáció otthon')).toBe('kezrehabilitacio-otthon')
    expect(buildCourseSlug('Ínhüvelygyulladás — 8 hetes program')).toBe(
      'inhuvelygyulladas-8-hetes-program',
    )
  })

  it('a teljes magyar ékezetkészletet kezeli (az ő/ű is)', () => {
    expect(buildCourseSlug('áéíóöőúüű')).toBe('aeiooouuu')
    expect(buildCourseSlug('ÁÉÍÓÖŐÚÜŰ')).toBe('aeiooouuu')
    expect(buildCourseSlug('Őszi ÜDÜLŐ űrhajós')).toBe('oszi-udulo-urhajos')
  })

  it('az írásjeleket és a többszörös szóközt egyetlen kötőjellé vonja össze', () => {
    expect(buildCourseSlug('  Kéz  —  torna!  ')).toBe('kez-torna')
    expect(buildCourseSlug('SOS: Kézrelax (ingyenes)')).toBe('sos-kezrelax-ingyenes')
  })

  it('a csak számjegyes címet előtaggal védi meg az id-névtértől', () => {
    // Enélkül a „2026" című kurzus slugja elfedné a 2026-os id-jű kurzust.
    expect(buildCourseSlug('2026')).toBe(`${NUMERIC_SLUG_PREFIX}2026`)
    expect(buildCourseSlug('  12  ')).toBe(`${NUMERIC_SLUG_PREFIX}12`)
    // A számmal KEZDŐDŐ, de nem csak számjegyes cím érintetlen marad.
    expect(buildCourseSlug('10 gyakorlat csuklóra')).toBe('10-gyakorlat-csuklora')
  })

  it('értelmezhetetlen forrásból nincs slug', () => {
    expect(buildCourseSlug('###')).toBeNull()
    expect(buildCourseSlug('   ')).toBeNull()
    expect(buildCourseSlug('')).toBeNull()
    expect(buildCourseSlug(null)).toBeNull()
    expect(buildCourseSlug(undefined)).toBeNull()
  })
})

describe('a slug forrása: kurzuscím → azonosító', () => {
  it('a displayTitle-t részesíti előnyben', () => {
    expect(courseSlugSource({ displayTitle: 'Kéztorna otthon', sku: 'KURZUS-1' })).toBe(
      'Kéztorna otthon',
    )
  })

  it('displayTitle nélkül a sku a forrás', () => {
    expect(courseSlugSource({ displayTitle: null, sku: 'KURZUS-1' })).toBe('KURZUS-1')
    expect(courseSlugSource({ displayTitle: '   ', sku: 'KURZUS-1' })).toBe('KURZUS-1')
  })

  it('egyik sincs → nincs forrás (a kurzus slug nélkül marad)', () => {
    expect(courseSlugSource({ displayTitle: null, sku: null })).toBeNull()
    expect(courseSlugSource({})).toBeNull()
  })
})

describe('slug-ütközés: sorszámozott utótag', () => {
  it('szabad slugot változatlanul ad vissza', () => {
    expect(nextFreeCourseSlug('kez-torna', [])).toBe('kez-torna')
    expect(nextFreeCourseSlug('kez-torna', ['mas-kurzus'])).toBe('kez-torna')
  })

  it('foglalt slugnál -2, -3… sorszámot fűz a végére', () => {
    expect(nextFreeCourseSlug('kez-torna', ['kez-torna'])).toBe('kez-torna-2')
    expect(nextFreeCourseSlug('kez-torna', ['kez-torna', 'kez-torna-2'])).toBe('kez-torna-3')
  })

  it('a sorszámozásban keletkezett lyukat kitölti', () => {
    expect(nextFreeCourseSlug('kez-torna', ['kez-torna', 'kez-torna-3'])).toBe('kez-torna-2')
  })

  it('a slug-családba csak a pontos egyezés és a sorszámozott alak tartozik', () => {
    expect(isNumberedVariantOf('kez-torna', 'kez-torna')).toBe(true)
    expect(isNumberedVariantOf('kez-torna-2', 'kez-torna')).toBe(true)
    // A hasonló kezdetű, de MÁS kurzus nem foglalja a sorszámot.
    expect(isNumberedVariantOf('kez-torna-halado', 'kez-torna')).toBe(false)
    expect(isNumberedVariantOf('kez', 'kez-torna')).toBe(false)
  })
})

describe('kurzus kanonikus címe (courseHref)', () => {
  it('sluggal a slugos cím a kanonikus', () => {
    expect(courseHref({ id: 7, slug: 'kez-torna' })).toBe('/kurzusok/kez-torna')
  })

  it('slug nélkül (régi kurzus) marad az id-alapú cím', () => {
    expect(courseHref({ id: 7, slug: null })).toBe('/kurzusok/7')
    expect(courseHref({ id: 7 })).toBe('/kurzusok/7')
    expect(courseHref({ id: 7, slug: '   ' })).toBe('/kurzusok/7')
  })
})

describe('az útvonal-szegmens feloldása', () => {
  it('a csak számjegyes szegmens a régi, id-alapú cím', () => {
    expect(parseCourseRouteParam('7')).toEqual({ kind: 'id', id: 7 })
    // Vezető nullákkal is ugyanaz a kurzus (utána kanonikus címre irányul).
    expect(parseCourseRouteParam('007')).toEqual({ kind: 'id', id: 7 })
  })

  it('minden más szegmens slug — slug-alakra normalizálva', () => {
    expect(parseCourseRouteParam('kez-torna')).toEqual({ kind: 'slug', slug: 'kez-torna' })
    expect(parseCourseRouteParam('Kéz Torna')).toEqual({ kind: 'slug', slug: 'kez-torna' })
    expect(parseCourseRouteParam('KEZ--TORNA')).toEqual({ kind: 'slug', slug: 'kez-torna' })
  })

  it('értelmezhetetlen szegmens → null (a route 404-et ad)', () => {
    expect(parseCourseRouteParam('')).toBeNull()
    expect(parseCourseRouteParam('   ')).toBeNull()
    expect(parseCourseRouteParam('###')).toBeNull()
    expect(parseCourseRouteParam(undefined)).toBeNull()
  })
})

describe('301-es átirányítás a kanonikus címre (körmentesség)', () => {
  const product = { id: 7, slug: 'kez-torna' }

  it('a régi, id-alapú cím a slugos címre irányít', () => {
    expect(canonicalCourseRedirect('7', product)).toBe('/kurzusok/kez-torna')
    expect(canonicalCourseRedirect('007', product)).toBe('/kurzusok/kez-torna')
  })

  it('a nem kanonikus alak (nagybetű, ékezet) is a kanonikus címre irányít', () => {
    expect(canonicalCourseRedirect('Kéz-Torna', product)).toBe('/kurzusok/kez-torna')
  })

  it('a KANONIKUS cím már nem irányít — nincs átirányítási kör', () => {
    expect(canonicalCourseRedirect('kez-torna', product)).toBeNull()
  })

  it('slug nélküli kurzusnál az id-s cím a kanonikus — nem irányít', () => {
    // Enélkül a slug nélküli (régi) kurzus önmagára irányítana, végtelenszer.
    expect(canonicalCourseRedirect('7', { id: 7, slug: null })).toBeNull()
    expect(canonicalCourseRedirect('7', { id: 7 })).toBeNull()
  })

  it('az átirányítás célja SOSEM irányít tovább (egy lépés a maximum)', () => {
    const cases: Array<{ param: string; doc: { id: number; slug?: string | null } }> = [
      { param: '7', doc: product },
      { param: '007', doc: product },
      { param: 'Kéz-Torna', doc: product },
      { param: '7', doc: { id: 7, slug: null } },
      { param: 'kez-torna', doc: product },
      { param: '2026', doc: { id: 2026, slug: `${NUMERIC_SLUG_PREFIX}2026` } },
    ]
    for (const { param, doc } of cases) {
      const target = canonicalCourseRedirect(param, doc)
      if (target === null) {
        continue
      }
      const nextParam = target.slice(`${COURSE_BASE_PATH}/`.length)
      expect(canonicalCourseRedirect(nextParam, doc)).toBeNull()
    }
  })

  it('a generált slug sosem ütközik az id-névtérrel (a 301 nem visz más kurzusra)', () => {
    // A „2026" című kurzus slugja 'kurzus-2026', így a /kurzusok/2026 cím
    // egyértelműen a 2026-os ID-jú kurzusé marad.
    const slug = buildCourseSlug('2026')
    expect(slug).not.toMatch(/^\d+$/)
    expect(parseCourseRouteParam(slug ?? '')).toEqual({ kind: 'slug', slug })
  })
})

describe('withSearchParams — a query string túléli az átirányítást', () => {
  it('a bejövő UTM-paraméterek változatlanul a kanonikus címre kerülnek', () => {
    expect(
      withSearchParams('/kurzusok/kez-torna', {
        utm_source: 'newsletter',
        utm_campaign: 'osz',
      }),
    ).toBe('/kurzusok/kez-torna?utm_source=newsletter&utm_campaign=osz')
  })

  it('query nélkül a cél változatlan (nincs felesleges kérdőjel)', () => {
    expect(withSearchParams('/kurzusok/kez-torna', {})).toBe('/kurzusok/kez-torna')
  })

  it('ismétlődő kulcs (tömb-érték) minden előfordulása megmarad', () => {
    expect(withSearchParams('/kurzusok/kez-torna', { tag: ['a', 'b'] })).toBe(
      '/kurzusok/kez-torna?tag=a&tag=b',
    )
  })

  it('a hiányzó (undefined) érték kimarad, a különleges karakterek escape-elődnek', () => {
    expect(
      withSearchParams('/kurzusok/kez-torna', { ures: undefined, q: 'kéz & torna' }),
    ).toBe('/kurzusok/kez-torna?q=k%C3%A9z+%26+torna')
  })
})
