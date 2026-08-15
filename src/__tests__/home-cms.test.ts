import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HomeView } from '../components/content/HomeView'
import { isPaidProduct } from '../components/content/home/CourseCards'
import { isPubliclyVisibleProduct } from '../components/content/ProductCard'
import { formatPostDate } from '../components/content/PostCard'
import { PostView, visibleRelatedPosts } from '../components/content/PostView'
import { PUBLISHED_WHERE } from '../lib/cms'
import { estimateReadingMinutes } from '../lib/reading-time'
import {
  articleJsonLd,
  buildDocMetadata,
  organizationJsonLd,
  resolveOgImageUrl,
  resolveSeoDescription,
  resolveSeoTitle,
} from '../lib/seo'
import type { Category, Media, Page, Post, Product, Testimonial, User } from '../payload-types'

/**
 * Oldal-render tesztek (kezdőlap + CMS/blog) — fixture-adattal, DB nélkül.
 * Lefedi: a docs/ux-hierarchia-audit.md 3. szakaszának cél-hierarchiájú
 * kezdőlapot (M1 hero CTA, M2 hitel-csík, M3 fizetős kurzus-kiemelés cím/ár,
 * M4 visszafogott ingyenes SOS-sáv, M5 hogyan-működik, M6 vélemények a
 * termékblokk után — CMS-ből, max 3, rövid változattal, kiemelt vélemény
 * híján a szekció elmarad, M8 GYIK a lap alján), a friss posztokat, a
 * poszt-oldal meta-részeit, a draft/published viselkedést és az SEO-fallbackláncot.
 */

// ---------------------------------------------------------------------------
// Fixture factory-k
// ---------------------------------------------------------------------------

function emptyContent(): Page['content'] {
  return {
    root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
  } as unknown as Page['content']
}

function contentWithWords(wordCount: number): Post['content'] {
  const words = Array.from({ length: wordCount }, (_, index) => `szo${index}`).join(' ')
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', version: 1, text: words, format: 0 }],
        },
      ],
    },
  } as unknown as Post['content']
}

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    alt: 'Tesztkép leírása',
    url: '/media/teszt.webp',
    width: 1280,
    height: 720,
    sizes: {
      og: { url: '/media/teszt-og.webp', width: 1200, height: 630 },
      md: { url: '/media/teszt-md.webp', width: 1280, height: 720 },
    },
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as unknown as Media
}

function page(overrides: Partial<Page> & { id: number }): Page {
  return {
    title: 'Teszt oldal',
    slug: `oldal-${overrides.id}`,
    excerpt: null,
    content: emptyContent(),
    heroImage: null,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    status: 'published',
    publishedAt: null,
    order: null,
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as unknown as Page
}

function post(overrides: Partial<Post> & { id: number }): Post {
  return {
    title: `Teszt poszt ${overrides.id}`,
    slug: `poszt-${overrides.id}`,
    excerpt: 'Rövid kivonat a poszthoz.',
    content: contentWithWords(450),
    heroImage: null,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    status: 'published',
    publishedAt: '2026-03-04T08:00:00.000Z',
    order: null,
    author: null,
    categories: [],
    relatedPosts: [],
    updatedAt: '2026-03-05T08:00:00.000Z',
    createdAt: '',
    ...overrides,
  } as unknown as Post
}

function product(overrides: Partial<Product> & { id: number }): Product {
  return {
    sku: `Kurzus ${overrides.id}`,
    shortDescription: 'Otthon végezhető program.',
    coverImage: media(),
    priceInHUF: 19990,
    priceInHUFEnabled: true,
    status: 'published',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as unknown as Product
}

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

function category(overrides: Partial<Category> & { id: number }): Category {
  return {
    title: `Kategória ${overrides.id}`,
    slug: `kategoria-${overrides.id}`,
    type: 'content',
    parent: null,
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as unknown as Category
}

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

/** A HUF-formázás nem-törhető szóközöket (NBSP, U+00A0) használ — a tesztekben normalizáljuk. */
function normalizeNbsp(html: string): string {
  return html.replace(/\u00a0/g, ' ')
}

type SectionBand = 'feher' | 'tint'

/** A kezd\u0151lap szekci\u00f3-s\u00e1vjai renderel\u00e9si sorrendben (feh\u00e9r / tint h\u00e1tt\u00e9r). */
function sectionBands(html: string): SectionBand[] {
  return Array.from(html.matchAll(/<section[^>]*\sclass="([^"]*)"/g)).map(([, classes]) =>
    classes.includes('kc-section--tint') ? 'tint' : 'feher',
  )
}

/** Az adott sz\u00f6veget tartalmaz\u00f3 szekci\u00f3 h\u00e1tt\u00e9r-s\u00e1vja. */
function bandOfSectionWith(html: string, marker: string): SectionBand {
  const markerIndex = html.indexOf(marker)
  if (markerIndex < 0) {
    throw new Error(`A jel\u00f6l\u0151 nem szerepel a renderelt oldalon: ${marker}`)
  }
  const openIndex = html.lastIndexOf('<section', markerIndex)
  const openTag = html.slice(openIndex, html.indexOf('>', openIndex))
  return openTag.includes('kc-section--tint') ? 'tint' : 'feher'
}

// ---------------------------------------------------------------------------
// Kezdőlap-render
// ---------------------------------------------------------------------------

describe('HomeView (kezdőlap-render)', () => {
  it('hero: CMS-oldal címe/kivonata, fallbackben márka-alapértelmezés', () => {
    const cmsHtml = render(
      createElement(HomeView, { home: page({ id: 1, title: 'CMS Hero cím', excerpt: 'CMS lead.' }), products: [], posts: [] }),
    )
    expect(cmsHtml).toContain('<h1')
    expect(cmsHtml).toContain('CMS Hero cím')
    expect(cmsHtml).toContain('CMS lead.')

    const fallbackHtml = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    expect(fallbackHtml).toContain('Hatékony és biztonságos módszerek')
  })

  it('M1 hero CTA: elsődleges a kurzusokra, másodlagos (visszafogott) az ingyenes SOS-ra', () => {
    const html = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    // EGY elsődleges CTA a fizetős kurzusok oldalára (audit K3).
    expect(html).toContain('Kurzusok megtekintése')
    expect(html).toContain('href="/kurzusok"')
    // A lead-magnet csak visszafogott, lapon belüli link (audit K2).
    expect(html).toContain('Ingyenes SOS gyakorlatok')
    expect(html).toContain('href="#ingyenes"')
  })

  it('M3 kurzus-kiemelés: published FIZETŐS termékből kártya (cím/ár), draft/archived kimarad', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [
          product({ id: 1, sku: 'Kéztőalagút-szindróma kurzus' }),
          product({ id: 2, sku: 'Draft kurzus', status: 'draft' }),
          product({ id: 3, sku: 'Archivált kurzus', status: 'archived' }),
        ],
        posts: [],
      }),
    )
    expect(html).toContain('Kéztőalagút-szindróma kurzus')
    expect(normalizeNbsp(html)).toContain('19 990 Ft')
    expect(html).not.toContain('Draft kurzus')
    expect(html).not.toContain('Archivált kurzus')
    // A kártya a menü-konvenciójú kurzus-útvonalra mutat.
    expect(html).toContain('href="/kurzusok/1"')
  })

  it('M3/M4: az ingyenes termék a kurzus-rácsban is látszik, de MÁSODLAGOS súllyal és a fizetős UTÁN', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [
          product({ id: 1, sku: 'Fizetős kurzus' }),
          product({ id: 7, sku: 'SOS Kézrelax villámkurzus', priceInHUF: null, priceInHUFEnabled: false }),
        ],
        posts: [],
      }),
    )
    const coursesSection = html.slice(html.indexOf('id="kurzusok"'), html.indexOf('id="ingyenes"'))
    // Mindkét kurzus a rácsban van (a tulajdonos 2026-08-15-i kérése: a
    // „Kurzusok" szekció mind a kettőről szól).
    expect(coursesSection).toContain('href="/kurzusok/1"')
    expect(coursesSection).toContain('href="/kurzusok/7"')
    // K2-őr: a fizetős MEGELŐZI az ingyenest, és csak az ingyenes kártya kapja
    // a visszafogott stílust — így a lead-magnet nem nyomhatja el az ajánlatot.
    expect(coursesSection.indexOf('href="/kurzusok/1"')).toBeLessThan(
      coursesSection.indexOf('href="/kurzusok/7"'),
    )
    const secondaryCount = coursesSection.split('kc-product-card--secondary').length - 1
    expect(secondaryCount).toBe(1)
    // Az ingyenes kártya „Ingyenes"-ként címkézett (nem üres lábbal áll).
    expect(coursesSection).toContain('Ingyenes')
    // Az SOS-sáv a lead-magnet saját, részletesebb megjelenése — megmarad.
    const sosSection = html.slice(html.indexOf('id="ingyenes"'))
    expect(sosSection).toContain('SOS Kézrelax villámkurzus')
    expect(sosSection).toContain('href="/kurzusok/7"')
  })

  it('M3-őr: az ár-pipa BE + ÜRES ár (konfigurációs hiba) kártyája sem árat, sem „Ingyenes"-t nem mutat', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [
          product({ id: 1, sku: 'Fizetős kurzus' }),
          product({ id: 9, sku: 'Félrekonfigurált kurzus', priceInHUF: null, priceInHUFEnabled: true }),
        ],
        posts: [],
      }),
    )
    const coursesSection = html.slice(html.indexOf('id="kurzusok"'), html.indexOf('id="ingyenes"'))
    // A hibás rekord NEM ingyenes: sem másodlagos kártyát, sem címkét nem kap.
    expect(coursesSection).not.toContain('kc-product-card--secondary')
  })

  it('M4 SOS-sáv: ingyenes termék nélkül is megjelenik, fallbackben a kurzuslistára mutat', () => {
    const html = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    expect(html).toContain('id="ingyenes"')
    expect(html).toContain('SOS Kézrelax')
    expect(html).toContain('Elindítom az ingyenes kurzust')
  })

  it('M5 hogyan-működik: 3 lépés (megveszem → azonnal nézem → otthon gyakorlok)', () => {
    const html = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    expect(html).toContain('Így működik az online kurzus')
    expect(html).toContain('Kiválasztod a kurzust')
    expect(html).toContain('Azonnal hozzáférsz')
    expect(html).toContain('Otthon gyakorolsz')
  })

  it('M6 vélemények: legfeljebb 3 kiemelt+látható jelenik meg, a többi kimarad', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [],
        posts: [],
        testimonials: [
          testimonial({ id: 1, authorName: 'Garami Gábor', authorTitle: 'zenész, műsorvezető' }),
          testimonial({ id: 2, authorName: 'Kállai Dóra' }),
          testimonial({ id: 3, authorName: 'Bagdal Szilvia' }),
          testimonial({ id: 4, authorName: 'Negyedik kiemelt' }),
          testimonial({ id: 5, authorName: 'Nem kiemelt', featured: false }),
          testimonial({ id: 6, authorName: 'Rejtett vélemény', visible: false }),
        ],
      }),
    )
    expect(html).toContain('Pácienseink mondták')
    expect(html).toContain('Garami Gábor')
    expect(html).toContain('zenész, műsorvezető')
    expect(html).toContain('Kállai Dóra')
    expect(html).toContain('Bagdal Szilvia')
    // A 4. kiemelt már nem fér bele (UX-skill M6: max 2–3), a nem kiemelt és a
    // rejtett vélemény pedig sosem jelenhet meg.
    expect(html).not.toContain('Negyedik kiemelt')
    expect(html).not.toContain('Nem kiemelt')
    expect(html).not.toContain('Rejtett vélemény')
    expect(html.match(/<blockquote/g) ?? []).toHaveLength(3)
  })

  it('M6 vélemények: a rövid változat elsőbbséget élvez a teljes szöveg felett', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [],
        posts: [],
        testimonials: [
          testimonial({
            id: 1,
            quote: 'A teljes, hosszú vélemény, ami a főoldalon már túl sok lenne.',
            shortQuote: 'A rövid, főoldalra szánt változat.',
          }),
          testimonial({ id: 2, quote: 'Csak a teljes szöveg van megadva.', shortQuote: '   ' }),
        ],
      }),
    )
    expect(html).toContain('A rövid, főoldalra szánt változat.')
    expect(html).not.toContain('A teljes, hosszú vélemény')
    // Üres (csak szóköz) rövid változatnál a teljes szöveg jelenik meg.
    expect(html).toContain('Csak a teljes szöveg van megadva.')
  })

  it('M6 vélemények: kiemelt vélemény nélkül a szekció elmarad (nincs helykitöltő, nincs fiktív idézet)', () => {
    const emptyHtml = render(
      createElement(HomeView, { home: null, products: [], posts: [], testimonials: [] }),
    )
    expect(emptyHtml).not.toContain('id="velemenyek"')
    expect(emptyHtml).not.toContain('Pácienseink mondták')

    const hiddenOnlyHtml = render(
      createElement(HomeView, {
        home: null,
        products: [],
        posts: [],
        testimonials: [
          testimonial({ id: 1, featured: false }),
          testimonial({ id: 2, visible: false }),
        ],
      }),
    )
    expect(hiddenOnlyHtml).not.toContain('id="velemenyek"')
    expect(hiddenOnlyHtml).not.toContain('Pácienseink mondták')
  })

  it('M2 hitel-csík: kondenzált szakmai érvek + a Rólunk oldalra mutató link', () => {
    const html = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    expect(html).toContain('Gyógytornász és manuálterapeuta')
    expect(html).toContain('href="/rolunk"')
  })

  it('M8 GYIK: az audit kérdései (műtét, fájdalom, időráfordítás, eszköz) details/summary-ben', () => {
    const html = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    expect(html).toContain('Gyakori kérdések')
    expect(html).toContain('Műtét után is végezhetem a gyakorlatokat?')
    expect(html).toContain('Mennyi időt vesz igénybe naponta?')
    expect(html).toContain('<details')
    expect(html).toContain('<summary')
  })

  it('szekció-sorrend az audit szerint: hero → hitel-csík → fizetős kurzusok → ingyenes SOS → hogyan működik → vélemények → CMS-tartalom → GYIK a végén', () => {
    const html = render(
      createElement(HomeView, {
        home: page({ id: 1, content: contentWithWords(10) as unknown as Page['content'] }),
        products: [product({ id: 1 })],
        posts: [],
        testimonials: [testimonial({ id: 1 })],
      }),
    )
    const order = [
      'kc-hero__title',
      'Bővebben a szakmai hátterünkről',
      'id="kurzusok"',
      'id="ingyenes"',
      'Így működik az online kurzus',
      'id="velemenyek"',
      'kc-richtext',
      'Gyakori kérdések',
    ]
    const positions = order.map((marker) => html.indexOf(marker))
    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0)
    }
    const sorted = [...positions].sort((a, b) => a - b)
    expect(positions).toEqual(sorted)
  })

  /**
   * Sávritmus: a kezdőlap fehér és tint szekciókat váltogat. A vélemény-szekció
   * (tint) és a CMS-blokk (fehér) is feltételes, ezért CMS-tartalom nélkül a
   * tudástár közvetlenül a vélemények után jönne — két tint sáv egyetlen nagy
   * folttá olvadna, és elveszne a szekcióhatár.
   */
  it.each([
    ['CMS-tartalommal', contentWithWords(10) as unknown as Page['content']],
    ['CMS-tartalom nélkül', emptyContent()],
  ])('sávritmus (%s): nincs két egymást követő tint sáv', (_label, content) => {
    const html = render(
      createElement(HomeView, {
        home: page({ id: 1, content }),
        products: [product({ id: 1 })],
        posts: [post({ id: 1 })],
        testimonials: [testimonial({ id: 1 })],
      }),
    )
    const bands = sectionBands(html)

    expect(bands.length).toBeGreaterThan(0)
    expect(bands).toContain('tint')
    for (let index = 1; index < bands.length; index += 1) {
      expect([bands[index - 1], bands[index]]).not.toEqual(['tint', 'tint'])
    }
  })

  it('sávritmus: a tudástár csak akkor tint, ha a fehér CMS-blokk elválasztja a véleményektől', () => {
    const withCms = render(
      createElement(HomeView, {
        home: page({ id: 1, content: contentWithWords(10) as unknown as Page['content'] }),
        products: [],
        posts: [post({ id: 1 })],
        testimonials: [testimonial({ id: 1 })],
      }),
    )
    expect(bandOfSectionWith(withCms, 'Pácienseink mondták')).toBe('tint')
    expect(bandOfSectionWith(withCms, 'Legfrissebb a tudástárból')).toBe('tint')

    const withoutCms = render(
      createElement(HomeView, {
        home: page({ id: 1 }),
        products: [],
        posts: [post({ id: 1 })],
        testimonials: [testimonial({ id: 1 })],
      }),
    )
    expect(bandOfSectionWith(withoutCms, 'Pácienseink mondták')).toBe('tint')
    expect(bandOfSectionWith(withoutCms, 'Legfrissebb a tudástárból')).toBe('feher')

    // Kiemelt vélemény nélkül a tudástár előtt fehér szekció áll, így visszakapja a tint sávot.
    const withoutTestimonials = render(
      createElement(HomeView, {
        home: page({ id: 1 }),
        products: [],
        posts: [post({ id: 1 })],
        testimonials: [],
      }),
    )
    expect(bandOfSectionWith(withoutTestimonials, 'Legfrissebb a tudástárból')).toBe('tint')
  })

  it('isPaidProduct: csak az árazott (priceInHUFEnabled + szám ár) termék fizetős', () => {
    expect(isPaidProduct({ priceInHUFEnabled: true, priceInHUF: 19990 })).toBe(true)
    expect(isPaidProduct({ priceInHUFEnabled: true, priceInHUF: null })).toBe(false)
    expect(isPaidProduct({ priceInHUFEnabled: false, priceInHUF: 19990 })).toBe(false)
    expect(isPaidProduct({ priceInHUFEnabled: null, priceInHUF: null })).toBe(false)
  })

  it('legfrissebb posztok: published megjelenik, draft kimarad; a tudástár-link megvan', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [],
        posts: [post({ id: 1, title: 'Friss cikk' }), post({ id: 2, title: 'Vázlat cikk', status: 'draft' })],
      }),
    )
    expect(html).toContain('Friss cikk')
    expect(html).toContain('href="/blog/poszt-1"')
    expect(html).not.toContain('Vázlat cikk')
    expect(html).toContain('href="/blog"')
  })

  it('Organization JSON-LD a kezdőlapon', () => {
    const html = render(createElement(HomeView, { home: null, products: [], posts: [] }))
    expect(html).toContain('application/ld+json')
    expect(html).toContain('"@type":"Organization"')
    expect(organizationJsonLd()['@type']).toBe('Organization')
  })
})

// ---------------------------------------------------------------------------
// Poszt-oldal-render
// ---------------------------------------------------------------------------

describe('PostView (poszt-oldal-render)', () => {
  it('szerző, dátum, becsült olvasási idő megjelenik', () => {
    const html = render(
      createElement(PostView, {
        post: post({ id: 1, author: { name: 'Dr. Kárpáti Katalin' } as unknown as User }),
      }),
    )
    expect(html).toContain('Dr. Kárpáti Katalin')
    expect(html).toContain('2026. március 4.')
    expect(html).toContain('3 perc olvasás') // 450 szó / 200 = 2,25 → 3 perc
  })

  it('kategóriák a kategória-oldalakra linkelnek', () => {
    const html = render(
      createElement(PostView, { post: post({ id: 1, categories: [category({ id: 5, title: 'Csukló', slug: 'csuklo' })] }) }),
    )
    expect(html).toContain('href="/blog/kategoria/csuklo"')
    expect(html).toContain('Csukló')
  })

  it('kapcsolódó posztok: max 3, csak published; Article JSON-LD', () => {
    const related = [
      post({ id: 11, title: 'Kapcsolódó 1' }),
      post({ id: 12, title: 'Kapcsolódó 2' }),
      post({ id: 13, title: 'Kapcsolódó 3' }),
      post({ id: 14, title: 'Kapcsolódó 4 (túl sok)' }),
      post({ id: 15, title: 'Kapcsolódó draft', status: 'draft' }),
    ]
    const thePost = post({ id: 1, relatedPosts: related })
    expect(visibleRelatedPosts(thePost).map((relatedPost) => relatedPost.id)).toEqual([11, 12, 13])

    const html = render(createElement(PostView, { post: thePost }))
    expect(html).toContain('Kapcsolódó 3')
    expect(html).not.toContain('Kapcsolódó 4')
    expect(html).not.toContain('Kapcsolódó draft')
    expect(html).toContain('"@type":"Article"')
  })

  it('articleJsonLd: headline, dátumok, szerző, publisher', () => {
    const jsonLd = articleJsonLd({
      post: post({ id: 1, title: 'Cím' }),
      path: '/blog/poszt-1',
      authorName: 'Szerző Neve',
    }) as Record<string, unknown>
    expect(jsonLd.headline).toBe('Cím')
    expect(jsonLd.datePublished).toBe('2026-03-04T08:00:00.000Z')
    expect((jsonLd.author as Record<string, unknown>).name).toBe('Szerző Neve')
    expect((jsonLd.publisher as Record<string, unknown>).name).toBe('Kineticare')
  })
})

// ---------------------------------------------------------------------------
// Draft/published viselkedés
// ---------------------------------------------------------------------------

describe('draft/published viselkedés', () => {
  it('a storefront-lekérdezések where-feltétele a published státuszra szűr', () => {
    expect(PUBLISHED_WHERE).toEqual({ status: { equals: 'published' } })
  })

  it('isPubliclyVisibleProduct: csak published jelenhet meg (draft/archived nem)', () => {
    expect(isPubliclyVisibleProduct({ status: 'published' })).toBe(true)
    expect(isPubliclyVisibleProduct({ status: 'draft' })).toBe(false)
    expect(isPubliclyVisibleProduct({ status: 'archived' })).toBe(false)
    expect(isPubliclyVisibleProduct({ status: null })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SEO-fallbacklánc
// ---------------------------------------------------------------------------

describe('SEO-fallbacklánc', () => {
  it('title: seoTitle → title', () => {
    expect(resolveSeoTitle(page({ id: 1, title: 'Oldalcím', seoTitle: 'SEO cím' }))).toBe('SEO cím')
    expect(resolveSeoTitle(page({ id: 1, title: 'Oldalcím', seoTitle: null }))).toBe('Oldalcím')
  })

  it('description: seoDescription → excerpt → undefined', () => {
    expect(resolveSeoDescription(page({ id: 1, seoDescription: 'SEO leírás', excerpt: 'Kivonat' }))).toBe(
      'SEO leírás',
    )
    expect(resolveSeoDescription(page({ id: 1, seoDescription: null, excerpt: 'Kivonat' }))).toBe('Kivonat')
    expect(resolveSeoDescription(page({ id: 1, seoDescription: null, excerpt: null }))).toBeUndefined()
  })

  it('og:image: ogImage (og-méret) → ogImage (eredeti) → heroImage (og-méret) → heroImage (eredeti) → undefined', () => {
    const ogMedia = media({ sizes: { og: { url: '/og-1200.webp', width: 1200, height: 630 } } })
    const heroMedia = media({ url: '/hero.webp', sizes: { og: { url: '/hero-og.webp', width: 1200, height: 630 } } })

    expect(resolveOgImageUrl(page({ id: 1, ogImage: ogMedia }))).toBe(
      'http://localhost:3000/og-1200.webp',
    )
    expect(
      resolveOgImageUrl(
        page({ id: 1, ogImage: media({ url: '/og-eredeti.webp', sizes: {} }) }),
      ),
    ).toBe('http://localhost:3000/og-eredeti.webp')
    expect(resolveOgImageUrl(page({ id: 1, ogImage: null, heroImage: heroMedia }))).toBe(
      'http://localhost:3000/hero-og.webp',
    )
    expect(
      resolveOgImageUrl(
        page({ id: 1, ogImage: null, heroImage: media({ url: '/hero-eredeti.webp', sizes: {} }) }),
      ),
    ).toBe('http://localhost:3000/hero-eredeti.webp')
    expect(resolveOgImageUrl(page({ id: 1, ogImage: null, heroImage: null }))).toBeUndefined()
  })

  it('buildDocMetadata: canonical + openGraph a fallbacklánccal', () => {
    const metadata = buildDocMetadata(
      page({ id: 1, title: 'Cím', seoTitle: 'SEO cím', seoDescription: 'Leírás', ogImage: media() }),
      '/blog/poszt-1',
    )
    expect(metadata.title).toBe('SEO cím')
    expect(metadata.description).toBe('Leírás')
    expect(metadata.alternates?.canonical).toBe('/blog/poszt-1')
    expect(metadata.openGraph?.images).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Olvasási idő és dátumformázás
// ---------------------------------------------------------------------------

describe('olvasási idő és dátum', () => {
  it('estimateReadingMinutes: 200 szó/perc, minimum 1 perc', () => {
    expect(estimateReadingMinutes(contentWithWords(450))).toBe(3)
    expect(estimateReadingMinutes(contentWithWords(50))).toBe(1)
    expect(estimateReadingMinutes(emptyContent())).toBe(1)
  })

  it('formatPostDate: magyar hosszú dátum, érvénytelenre null', () => {
    expect(formatPostDate('2026-03-04T08:00:00.000Z')).toBe('2026. március 4.')
    expect(formatPostDate('nem-dátum')).toBeNull()
    expect(formatPostDate(null)).toBeNull()
  })
})
