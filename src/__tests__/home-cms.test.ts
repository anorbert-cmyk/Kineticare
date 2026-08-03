import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HomeView } from '../components/content/HomeView'
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
import type { Category, Media, Page, Post, Product, User } from '../payload-types'

/**
 * Oldal-render tesztek (kezdőlap + CMS/blog) — fixture-adattal, DB nélkül.
 * Lefedi: kurzus-kiemelés (cover/cím/ár), friss posztok, poszt-oldal meta-részei,
 * draft/published viselkedés és az SEO-fallbacklánc.
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

/** A HUF-formázás nem-törhető szóközöket (NBSP) használ — a tesztekben normalizáljuk. */
function normalizeNbsp(html: string): string {
  return html.replace(/ /g, ' ')
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

  it('kurzus-kiemelés: published termékből kártya (cím/ár), draft/archived kimarad', () => {
    const html = render(
      createElement(HomeView, {
        home: null,
        products: [
          product({ id: 1, sku: 'SOS Kézrelax' }),
          product({ id: 2, sku: 'Draft kurzus', status: 'draft' }),
          product({ id: 3, sku: 'Archivált kurzus', status: 'archived' }),
        ],
        posts: [],
      }),
    )
    expect(html).toContain('SOS Kézrelax')
    expect(normalizeNbsp(html)).toContain('19 990 Ft')
    expect(html).not.toContain('Draft kurzus')
    expect(html).not.toContain('Archivált kurzus')
    // A kártya a menü-konvenciójú kurzus-útvonalra mutat.
    expect(html).toContain('href="/kurzusok/1"')
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
