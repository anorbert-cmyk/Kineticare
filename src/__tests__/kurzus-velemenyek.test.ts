import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  featuredTestimonials,
  MAX_HOME_TESTIMONIALS,
  TestimonialsSection,
} from '../components/content/home/TestimonialsSection'
import {
  buildCourseJumpTargets,
  CourseJumpNav,
  TESTIMONIALS_JUMP_TARGET,
  type CourseJumpTarget,
} from '../components/courses/CourseJumpNav'
import { RelatedCourses } from '../components/courses/RelatedCourses'
import type { Product, Testimonial } from '../payload-types'

/**
 * Vélemények a KURZUSOLDALON — a 2026-08-16-i kör őr-tesztjei (G-V1…G-V8).
 *
 * A kurzusoldal az egyetlen lap, ahol a vásárlási döntés megszületik, és
 * 2026-08-16-ig NULLA véleményt tartalmazott (élő HTML-ben mérve: kezdőlap 6
 * `kc-testimonials__card` jelölő, kurzusoldal 0). A szekció ezért bekerült — a
 * KEZDŐLAPPAL AZONOS komponenssel, azonos felirattal, azonos tint sávon.
 *
 * Amit ez a fájl rögzít, az mind kutatási szabály, jogi kényszer vagy
 * akadálymentességi követelmény:
 *  - a szekció helye: teljes értékesítő tartalom UTÁN, upsell ELŐTT
 *    (docs/ertekesitesi-ux-skill.md M6: „max 2–3, RÖVID, a termék UTÁN");
 *  - azonos komponens = azonos azonosítás (WCAG 2.2 SC 3.2.4), tehát a hívás
 *    NEM ír felül feliratot, sávot vagy darabszámot;
 *  - a horgony-chip a lista VÉGÉN áll (SC 3.2.3: az ismétlődő navigáció
 *    sorrendje kövesse a lapot) és csak létező szakaszra mutat (N-12);
 *  - a lapon EGYETLEN vásárlási cél marad (tulajdonosi döntés, 2026-08-16):
 *    a vélemény-szekció nem hordozhat checkout-útvonalat;
 *  - két tint sáv nem kerülhet egymás mellé (elveszne a szekcióhatár);
 *  - üres állapotban NINCS helykitöltő és nincs kitalált idézet — a
 *    Testimonials collection kikötése, és az Fttv. melléklet 34–35. pontja is
 *    (valótlan fogyasztói értékelés, illetve annak valótlan bemutatása).
 *
 * Se hálózat, se adatbázis: tiszta fájlolvasás + renderToStaticMarkup.
 */

// ---------------------------------------------------------------------------
// Fixture-ök
// ---------------------------------------------------------------------------

function testimonial(overrides: Partial<Testimonial> & { id: number }): Testimonial {
  return {
    quote: `Teljes vélemény ${overrides.id}.`,
    shortQuote: null,
    authorName: `Szerző ${overrides.id}`,
    authorTitle: null,
    featured: true,
    order: overrides.id,
    visible: true,
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as unknown as Testimonial
}

const THREE_TESTIMONIALS: Testimonial[] = [
  testimonial({ id: 1 }),
  testimonial({ id: 2 }),
  testimonial({ id: 3 }),
]

function relatedProduct(id: number): Product {
  return {
    id,
    title: `Kapcsolódó kurzus ${id}`,
    slug: `kapcsolodo-kurzus-${id}`,
    status: 'published',
    priceInHUF: 19990,
    priceInHUFEnabled: true,
    updatedAt: '',
    createdAt: '',
  } as unknown as Product
}

const COURSE_PAGE_SOURCE = readFileSync(
  fileURLToPath(new URL('../app/(frontend)/kurzusok/[slug]/page.tsx', import.meta.url)),
  'utf8',
)

function renderTestimonials(items: Testimonial[]): string {
  return renderToStaticMarkup(createElement(TestimonialsSection, { testimonials: items }))
}

const A: CourseJumpTarget = { id: 'mi-ez', label: 'Mi ez?' }
const B: CourseJumpTarget = { id: 'tananyag', label: 'Tananyag' }

// ---------------------------------------------------------------------------
// G-V1 — a szekció a helyén van
// ---------------------------------------------------------------------------

describe('G-V1 — a vélemény-szekció helye a kurzusoldalon', () => {
  it('a vásárlódoboz UTÁN és a kapcsolódó kurzusok ELŐTT renderelődik', () => {
    const buybox = COURSE_PAGE_SOURCE.indexOf('<CourseBuybox')
    const velemenyek = COURSE_PAGE_SOURCE.indexOf('<TestimonialsSection')
    const kapcsolodo = COURSE_PAGE_SOURCE.indexOf('<RelatedCourses')

    expect(buybox).toBeGreaterThan(-1)
    expect(velemenyek).toBeGreaterThan(-1)
    expect(kapcsolodo).toBeGreaterThan(-1)
    // M6: a bizonyíték a termék UTÁN jön, az upsell (kilépési út) pedig utána.
    expect(buybox).toBeLessThan(velemenyek)
    expect(velemenyek).toBeLessThan(kapcsolodo)
  })

  it('a szekció a Container/Section LEZÁRÁSA UTÁN áll (teljes szélességű tábla)', () => {
    // A TestimonialsSection gyökere `kc-board--edge`, tehát nem szorítható a
    // kurzusoldal 1120 px-es, kéthasábos rácsának ~600 px-es fő oszlopába.
    const zaras = COURSE_PAGE_SOURCE.indexOf('</Section>')
    expect(zaras).toBeGreaterThan(-1)
    expect(COURSE_PAGE_SOURCE.indexOf('<TestimonialsSection')).toBeGreaterThan(zaras)
  })
})

// ---------------------------------------------------------------------------
// G-V2 — adatot kap, és a kezdőlapi alapértékeken áll
// ---------------------------------------------------------------------------

describe('G-V2 — a szekció adatot kap, és nem tér el a kezdőlapi megjelenéstől', () => {
  it('a lap lekérdezi a véleményeket a cms.ts-ből', () => {
    expect(COURSE_PAGE_SOURCE).toContain('getTestimonials')
    expect(COURSE_PAGE_SOURCE).toContain("from '@/lib/cms'")
  })

  it('a hívás EGYETLEN propot sem ír felül a testimonials-on kívül (WCAG 3.2.4)', () => {
    const hivas = COURSE_PAGE_SOURCE.slice(
      COURSE_PAGE_SOURCE.indexOf('<TestimonialsSection'),
      COURSE_PAGE_SOURCE.indexOf('/>', COURSE_PAGE_SOURCE.indexOf('<TestimonialsSection')),
    )
    expect(hivas).toContain('testimonials=')
    for (const prop of ['eyebrow', 'heading', 'variant', 'id=', 'headingId', 'maxItems']) {
      expect(hivas).not.toContain(prop)
    }
  })

  it('a kezdőlapi felirat jelenik meg, gondolatjel nélkül', () => {
    const html = renderTestimonials(THREE_TESTIMONIALS)
    expect(html).toContain('Vélemények')
    expect(html).toContain('Pácienseink mondták')
    expect(html).toContain('id="velemenyek"')
    // Töltelék gondolatjel a vevői feliratban TILOS (docs/ui-sztenderdek.md §3.1.2).
    expect(html).not.toContain('—')
    expect(html).not.toContain('–')
  })
})

// ---------------------------------------------------------------------------
// G-V3 — sáv-ritmus: két tint sáv nem kerülhet egymás mellé
// ---------------------------------------------------------------------------

describe('G-V3 — sáv-ritmus', () => {
  it('a vélemény-szekció prop nélkül tint sávot ad', () => {
    expect(renderTestimonials(THREE_TESTIMONIALS)).toContain('kc-section--tint')
  })

  it('a kapcsolódó kurzusok ALAPÉRTELMEZETT sávja továbbra is tint (mai viselkedés)', () => {
    const html = renderToStaticMarkup(
      createElement(RelatedCourses, { products: [relatedProduct(1)] }),
    )
    expect(html).toContain('kc-section--tint')
  })

  it('a kapcsolódó kurzusok default sávra válthatók', () => {
    const html = renderToStaticMarkup(
      createElement(RelatedCourses, { products: [relatedProduct(1)], variant: 'default' }),
    )
    expect(html).not.toContain('kc-section--tint')
  })

  it('a lap feltételesen vált: vélemény mellett a kapcsolódó sáv NEM tint', () => {
    expect(COURSE_PAGE_SOURCE).toContain("testimonialsVisible ? 'default' : 'tint'")
  })
})

// ---------------------------------------------------------------------------
// G-V4 — a lapon EGYETLEN vásárlási cél marad
// ---------------------------------------------------------------------------

describe('G-V4 — a vélemény-szekció nem hordoz vásárlási célt', () => {
  it('nincs benne checkout-útvonal, gomb vagy CTA-osztály', () => {
    const html = renderTestimonials(THREE_TESTIMONIALS)
    expect(html).not.toContain('/penztar')
    expect(html).not.toContain('kc-button')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('kc-course-cta')
  })
})

// ---------------------------------------------------------------------------
// G-V5 — horgony-chip: felirat, hely, feltételesség
// ---------------------------------------------------------------------------

describe('G-V5 — a vélemény horgony-chipje', () => {
  it('vélemény nélkül NEM kerül a listába (N-12: nincs üresre vivő horgony)', () => {
    expect(buildCourseJumpTargets([A, B], false)).toEqual([A, B])
  })

  it('vélemény mellett a lista LEGVÉGÉRE kerül (WCAG 2.2 SC 3.2.3)', () => {
    const targets = buildCourseJumpTargets([A, B], true)
    expect(targets).toHaveLength(3)
    expect(targets.at(-1)).toEqual(TESTIMONIALS_JUMP_TARGET)
  })

  it('a felirat a szekció felvezető sorával egyezik, gondolatjel nélkül', () => {
    expect(TESTIMONIALS_JUMP_TARGET.label).toBe('Vélemények')
    expect(TESTIMONIALS_JUMP_TARGET.id).toBe('velemenyek')
    expect(TESTIMONIALS_JUMP_TARGET.label).not.toContain('—')
    expect(TESTIMONIALS_JUMP_TARGET.label).not.toContain('–')
  })

  it('egyetlen célnál a chip-sáv elmarad (két elem között nincs mit navigálni)', () => {
    const targets = buildCourseJumpTargets([], true)
    expect(targets).toHaveLength(1)
    expect(renderToStaticMarkup(createElement(CourseJumpNav, { targets }))).toBe('')
  })

  it('a lap a közös építőt használja, nem saját másolatot', () => {
    expect(COURSE_PAGE_SOURCE).toContain('buildCourseJumpTargets(')
  })
})

// ---------------------------------------------------------------------------
// G-V6 — a buybox másodlagos linkje NEM a véleményekre visz
// ---------------------------------------------------------------------------

describe('G-V6 — a vásárlódoboz másodlagos útja', () => {
  it('a tartalom-célokból számol, a vélemény-cél hozzáfűzése ELŐTT', () => {
    const kezdet = COURSE_PAGE_SOURCE.indexOf('const secondaryTarget =')
    expect(kezdet).toBeGreaterThan(-1)
    const blokk = COURSE_PAGE_SOURCE.slice(kezdet, COURSE_PAGE_SOURCE.indexOf('null', kezdet) + 4)
    // A vélemény bizonyíték, nem döntési szakasz: szakasz nélküli terméknél a
    // doboz másodlagos linkje NEM mutathat rá.
    expect(blokk).toContain('contentTargets')
    expect(blokk).not.toContain('jumpTargets')
    // A jumpTargets a secondaryTarget UTÁN áll össze — a sorrend a garancia.
    expect(COURSE_PAGE_SOURCE.indexOf('const jumpTargets =')).toBeGreaterThan(kezdet)
  })
})

// ---------------------------------------------------------------------------
// G-V7 — üres állapot: nyomtalan eltűnés
// ---------------------------------------------------------------------------

describe('G-V7 — üres állapot', () => {
  const esetek: Array<[string, Testimonial[]]> = [
    ['nincs egyetlen vélemény sem', []],
    ['egyik sem kiemelt', [testimonial({ id: 1, featured: false })]],
    ['a kiemelt vélemény rejtett', [testimonial({ id: 1, visible: false })]],
  ]

  for (const [nev, items] of esetek) {
    it(`${nev}: a szekció nyomtalanul elmarad`, () => {
      const html = renderTestimonials(items)
      expect(html).toBe('')
      expect(html).not.toContain('id="velemenyek"')
      // Ugyanez a szűrés vezérli a chipet és a sáv-ritmust is.
      expect(featuredTestimonials(items)).toHaveLength(0)
    })
  }

  it('helykitöltő vagy „hamarosan" felirat nem kerül a lapra', () => {
    expect(COURSE_PAGE_SOURCE).not.toContain('hamarosan')
    expect(COURSE_PAGE_SOURCE).not.toContain('Még nincs vélemény')
  })
})

// ---------------------------------------------------------------------------
// G-V8 — a megosztott réteg érintetlen (regressziós zár)
// ---------------------------------------------------------------------------

describe('G-V8 — a megosztott vélemény-réteg nem csúszhat el némán', () => {
  it('a felső korlát 3 marad (M6), nagyobb limit sem lépheti át', () => {
    expect(MAX_HOME_TESTIMONIALS).toBe(3)
    const sok = [1, 2, 3, 4, 5].map((id) => testimonial({ id }))
    expect(featuredTestimonials(sok, 10)).toHaveLength(3)
  })

  it('a tábla-megjelenés (kc-board--edge) marad a kezdőlapival azonos', () => {
    const html = renderTestimonials(THREE_TESTIMONIALS)
    expect(html).toContain('kc-board--edge')
    expect(html).toContain('kc-testimonials__card')
  })
})
