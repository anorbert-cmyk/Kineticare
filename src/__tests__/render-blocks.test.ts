import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { pageBlockSlugs } from '../blocks'
import { RenderBlocks } from '../components/blocks/RenderBlocks'
import { HomeView } from '../components/content/HomeView'
import { buildHomeLayout } from '../scripts/seed'
import type { Page, Post, Product, Testimonial } from '../payload-types'

/**
 * Szekció-rendszer render-tesztek (terv 5. pont, F3/F5) — fixture-adattal, DB
 * nélkül. Három szerződést rögzítenek:
 *  1. a HomeView elágazása: kitöltött `layout` → blokk-renderelés (a rögzített
 *     M1–M8 kezdőlap helyett), üres `layout` → a régi kezdőlap változatlanul;
 *  2. a RenderBlocks szabályai: visible=false kihagyás, anchorId → section id,
 *     háttér-leképezés, ismeretlen blokk néma kihagyása, adapter-felülírások;
 *  3. a seed alap-layoutja (buildHomeLayout) csak katalógusbeli blokkot használ,
 *     és egyben renderelhető — pontosan egy H1-gyel (UX-skill 4. pont).
 */

// ---------------------------------------------------------------------------
// Fixture factory-k (a home-cms.test.ts mintájára, a szükséges minimummal)
// ---------------------------------------------------------------------------

function page(overrides: Partial<Page> & { id: number }): Page {
  return {
    title: 'Teszt oldal',
    slug: `oldal-${overrides.id}`,
    excerpt: null,
    content: null,
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
    excerpt: 'Rövid kivonat.',
    content: null,
    heroImage: null,
    status: 'published',
    publishedAt: '2026-03-04T08:00:00.000Z',
    author: null,
    categories: [],
    relatedPosts: [],
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as unknown as Post
}

function product(overrides: Partial<Product> & { id: number }): Product {
  return {
    sku: `Kurzus ${overrides.id}`,
    shortDescription: 'Otthon végezhető program.',
    coverImage: null,
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

type Layout = NonNullable<Page['layout']>

/** Blokk-fixture-ök összefűzése layout-tömbbé (a generált unió-típusra szűkítve). */
function layoutOf(...blocks: Record<string, unknown>[]): Layout {
  return blocks as unknown as Layout
}

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

function renderBlocks(
  layout: Layout,
  data: { products?: Product[]; posts?: Post[]; testimonials?: Testimonial[] } = {},
): string {
  return render(
    createElement(RenderBlocks, {
      layout,
      products: data.products ?? [],
      posts: data.posts ?? [],
      testimonials: data.testimonials ?? [],
    }),
  )
}

// ---------------------------------------------------------------------------
// 1. HomeView elágazás
// ---------------------------------------------------------------------------

describe('HomeView layout-elágazás', () => {
  const welcomeLayout = layoutOf({
    blockType: 'welcome',
    id: 'w1',
    title: 'Szekciós üdvözlő cím',
    sectionSettings: { visible: true },
  })

  it('kitöltött layoutnál a szekciósor renderel, a rögzített kezdőlap nem', () => {
    const html = render(
      createElement(HomeView, {
        home: page({ id: 1, layout: welcomeLayout }),
        products: [product({ id: 1 })],
        posts: [post({ id: 1 })],
      }),
    )
    expect(html).toContain('Szekciós üdvözlő cím')
    // A rögzített kezdőlap jelölői nem jelenhetnek meg: statikus hitel-csík,
    // statikus GYIK-cím, kurzuskártya-szekció.
    expect(html).not.toContain('Gyógytornász és manuálterapeuta szakmai háttér')
    expect(html).not.toContain('Gyakran ismételt kérdések')
    expect(html).not.toContain('Így tudunk neked segíteni')
  })

  it('kitöltött layoutnál a statikus FAQPage JSON-LD nem duplikálódik', () => {
    const html = render(
      createElement(HomeView, { home: page({ id: 1, layout: welcomeLayout }), products: [], posts: [] }),
    )
    // Az Organization séma oldalszintű és marad; FAQPage csak faq blokkból jöhet.
    expect(html).toContain('"@type":"Organization"')
    expect(html).not.toContain('"@type":"FAQPage"')
  })

  it('üres layoutnál a rögzített M1–M8 kezdőlap változatlanul renderel', () => {
    const html = render(
      createElement(HomeView, {
        home: page({ id: 1, layout: [] as unknown as Page['layout'] }),
        products: [product({ id: 1 })],
        posts: [],
      }),
    )
    expect(html).toContain('Gyógytornász és manuálterapeuta szakmai háttér')
    expect(html).toContain('Így tudunk neked segíteni')
    expect(html).toContain('"@type":"FAQPage"')
  })
})

// ---------------------------------------------------------------------------
// 2. RenderBlocks szabályok és adapterek
// ---------------------------------------------------------------------------

describe('RenderBlocks', () => {
  it('visible=false blokk kimarad, a látható marad', () => {
    const html = renderBlocks(
      layoutOf(
        { blockType: 'welcome', id: 'w1', title: 'Látható cím', sectionSettings: { visible: true } },
        { blockType: 'welcome', id: 'w2', title: 'Rejtett cím', sectionSettings: { visible: false } },
      ),
    )
    expect(html).toContain('Látható cím')
    expect(html).not.toContain('Rejtett cím')
  })

  it('anchorId a szekció id-je, a hatter a háttérsáv', () => {
    const html = renderBlocks(
      layoutOf({
        blockType: 'credsStrip',
        id: 'c1',
        items: [{ id: 'i1', text: 'Egyedi hitel-tétel' }],
        link: { felirat: 'Rólunk', url: '/rolunk' },
        sectionSettings: { visible: true, anchorId: 'hitel', hatter: 'tint' },
      }),
    )
    expect(html).toContain('Egyedi hitel-tétel')
    expect(html).toContain('id="hitel"')
    expect(html).toContain('kc-section--tint')
  })

  it('ismeretlen blokktípus némán kimarad (előre-kompatibilitás)', () => {
    const html = renderBlocks(
      layoutOf(
        { blockType: 'jovobeli-blokk', id: 'x1', title: 'Nem létező' },
        { blockType: 'welcome', id: 'w1', title: 'Létező cím', sectionSettings: {} },
      ),
    )
    expect(html).not.toContain('Nem létező')
    expect(html).toContain('Létező cím')
  })

  it('courseCards: cím-felülírás + a kurzuskártyák a published fizetős termékből', () => {
    const html = renderBlocks(
      layoutOf({
        blockType: 'courseCards',
        id: 'cc1',
        heading: 'Saját kurzuscím',
        sectionSettings: {},
      }),
      { products: [product({ id: 1, sku: 'Kéztorna alapok' })] },
    )
    expect(html).toContain('Saját kurzuscím')
    expect(html).toContain('Kéztorna alapok')
    // Az alap-horgony megmarad (a sticky nav /#kurzusok linkje erre épül).
    expect(html).toContain('id="kurzusok"')
  })

  it('howItWorks: a blokk lépései felülírják a beépítetteket', () => {
    const html = renderBlocks(
      layoutOf({
        blockType: 'howItWorks',
        id: 'h1',
        title: 'Saját folyamatcím',
        steps: [
          { id: 's1', title: 'Első lépés blokkból', text: 'Leírás egy.' },
          { id: 's2', title: 'Második lépés blokkból', text: 'Leírás kettő.' },
        ],
        sectionSettings: {},
      }),
    )
    expect(html).toContain('Saját folyamatcím')
    expect(html).toContain('Első lépés blokkból')
    expect(html).not.toContain('Kiválasztod a kurzust')
  })

  it('testimonials: eyebrow/cím-felülírás + maxItems korlát érvényesül', () => {
    const html = renderBlocks(
      layoutOf({
        blockType: 'testimonials',
        id: 't1',
        eyebrow: 'Visszajelzések',
        heading: 'Ők mondták',
        maxItems: 1,
        sectionSettings: {},
      }),
      { testimonials: [testimonial({ id: 1 }), testimonial({ id: 2 })] },
    )
    expect(html).toContain('Visszajelzések')
    expect(html).toContain('Ők mondták')
    expect(html).toContain('Teljes vélemény 1.')
    expect(html).not.toContain('Teljes vélemény 2.')
  })

  it('knowledge: limit levágja a posztlistát', () => {
    const html = renderBlocks(
      layoutOf({ blockType: 'knowledge', id: 'k1', limit: 1, sectionSettings: {} }),
      { posts: [post({ id: 1 }), post({ id: 2 })] },
    )
    expect(html).toContain('Teszt poszt 1')
    expect(html).not.toContain('Teszt poszt 2')
  })

  it('freeSos: blokk-cím + gomb-felülírás; termék híján is renderel', () => {
    const html = renderBlocks(
      layoutOf({
        blockType: 'freeSos',
        id: 'f1',
        title: 'Ingyenes villámkurzus sáv',
        body: 'Rövid szöveg a sávban.',
        cta: { felirat: 'Kérem az ingyenes anyagot', url: '/kurzusok' },
        sectionSettings: {},
      }),
    )
    expect(html).toContain('Ingyenes villámkurzus sáv')
    expect(html).toContain('Kérem az ingyenes anyagot')
  })
})

// ---------------------------------------------------------------------------
// 3. A seed alap-layoutjának szerződése
// ---------------------------------------------------------------------------

describe('buildHomeLayout (seed alap-layout)', () => {
  it('csak katalógusbeli blokktípust használ', () => {
    const layout = buildHomeLayout()
    expect(layout.length).toBeGreaterThan(0)
    for (const block of layout) {
      expect(pageBlockSlugs).toContain(block.blockType)
    }
  })

  it('a filmHero az első blokk — a kezdőlap a filmsávval nyit', () => {
    expect(buildHomeLayout()[0]?.blockType).toBe('filmHero')
  })

  it('média nélkül is renderelhető, pontosan egy H1-gyel (UX-skill 4. pont)', () => {
    const html = renderBlocks(buildHomeLayout(), {
      products: [product({ id: 1 })],
      posts: [post({ id: 1 })],
      testimonials: [testimonial({ id: 1 })],
    })
    const h1Count = (html.match(/<h1[\s>]/g) ?? []).length
    expect(h1Count).toBe(1)
    // A faq blokk a saját tételeiből adja a FAQPage JSON-LD-t.
    expect(html).toContain('"@type":"FAQPage"')
  })
})
