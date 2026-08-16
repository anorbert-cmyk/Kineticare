import { describe, expect, it } from 'vitest'

import { absoluteUrl, articleJsonLd, blogJsonLd, breadcrumbJsonLd } from '../lib/seo'
import type { Post } from '../payload-types'

/**
 * ŐR — a Tudástár strukturált adata ÉRVÉNYES és a látható tartalommal
 * KONZISZTENS.
 *
 * Miért teszteljük. A strukturált adat legdrágább hibája az, amikor a séma
 * TÖBBET állít, mint amit a lap mutat: a kereső ilyenkor elveti az egészet,
 * és semmilyen hibaüzenet nem jelzi. A `docs/seo-geo-llm.md` alapszabálya
 * ezért: „a séma minden mezője a LÁTHATÓ tartalomból jön".
 *
 * A GEO-oldali cél ugyanez: az AI-válaszok szövegdarabokat idéznek, tehát a
 * gépi leírásnak pontosan azt kell mondania, ami a lapon áll.
 */

const post = (overrides: Partial<Post> = {}): Post =>
  ({
    id: 11,
    title: 'Levették a gipszet a csuklómról, mit csináljak?',
    slug: 'gipsz-utan',
    excerpt: 'Az első hét gyakorlatai és a leggyakoribb hibák.',
    publishedAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-12T08:00:00.000Z',
    ...overrides,
  }) as unknown as Post

describe('Blog (lista) JSON-LD', () => {
  it('a Tudástárat írja le, magyar nyelvvel és kanonikus URL-lel', () => {
    const jsonLd = blogJsonLd({ name: 'Tudástár', description: 'Cikkek.', path: '/blog', posts: [] })

    expect(jsonLd['@type']).toBe('Blog')
    expect(jsonLd.name).toBe('Tudástár')
    expect(jsonLd.inLanguage).toBe('hu-HU')
    expect(jsonLd.url).toBe(absoluteUrl('/blog'))
  })

  it('ÜRES listánál nem hirdet egyetlen cikket sem', () => {
    // Nulla elemű gyűjtemény meghirdetése pontosan az az eltérés a látható
    // tartalomtól, ami miatt a keresők elvetik a strukturált adatot.
    const jsonLd = blogJsonLd({ name: 'Tudástár', path: '/blog', posts: [] })
    expect(jsonLd.blogPost).toBeUndefined()
  })

  it('a felsorolt cikkek PONTOSAN a megjelenítettek, kanonikus címükkel', () => {
    const jsonLd = blogJsonLd({ name: 'Tudástár', path: '/blog', posts: [post()] })
    const entries = jsonLd.blogPost as Array<Record<string, unknown>>

    expect(entries).toHaveLength(1)
    expect(entries[0]!['@type']).toBe('BlogPosting')
    expect(entries[0]!.headline).toBe('Levették a gipszet a csuklómról, mit csináljak?')
    expect(entries[0]!.url).toBe(absoluteUrl('/blog/gipsz-utan'))
    expect(entries[0]!.datePublished).toBe('2026-08-10T08:00:00.000Z')
  })

  it('slug nélküli poszt nem kerül a listába (értelmezhetetlen URL lenne)', () => {
    const jsonLd = blogJsonLd({
      name: 'Tudástár',
      path: '/blog',
      posts: [post({ slug: '' } as Partial<Post>)],
    })
    expect(jsonLd.blogPost).toBeUndefined()
  })

  it('kategória-oldalon a saját címét és útvonalát viseli', () => {
    const jsonLd = blogJsonLd({
      name: 'Kézrehabilitáció',
      path: '/blog/kategoria/kezrehabilitacio',
      posts: [post()],
    })
    expect(jsonLd.url).toBe(absoluteUrl('/blog/kategoria/kezrehabilitacio'))
  })
})

describe('Article JSON-LD (bejegyzés-oldal)', () => {
  it('a látható címmel, bevezetővel és dátumokkal egyezik', () => {
    const jsonLd = articleJsonLd({ post: post(), path: '/blog/gipsz-utan', authorName: 'Kata' })

    expect(jsonLd['@type']).toBe('Article')
    expect(jsonLd.headline).toBe(post().title)
    expect(jsonLd.description).toBe(post().excerpt)
    expect(jsonLd.datePublished).toBe('2026-08-10T08:00:00.000Z')
    expect(jsonLd.dateModified).toBe('2026-08-12T08:00:00.000Z')
    expect((jsonLd.author as Record<string, unknown>).name).toBe('Kata')
    expect(jsonLd.mainEntityOfPage).toBe(absoluteUrl('/blog/gipsz-utan'))
  })

  it('magyar nyelvet közöl (entitás-egyértelműsítés az AI-válaszokhoz)', () => {
    expect(articleJsonLd({ post: post(), path: '/blog/gipsz-utan' }).inLanguage).toBe('hu-HU')
  })

  it('szerző nélkül a kiadó neve áll a szerző helyén (nem üres mező)', () => {
    const jsonLd = articleJsonLd({ post: post(), path: '/blog/gipsz-utan' })
    expect((jsonLd.author as Record<string, unknown>).name).toBe('Kineticare')
  })

  it('hiányzó bevezetőnél nincs üres description', () => {
    const jsonLd = articleJsonLd({ post: post({ excerpt: null }), path: '/blog/gipsz-utan' })
    expect(jsonLd.description).toBeUndefined()
  })
})

describe('BreadcrumbList a Tudástárban', () => {
  it('a kategória-oldal morzsája a bevett, kétszintű alak (Tudástár → lap)', () => {
    // Ugyanaz a séma, mint a bejegyzés- és a kurzusoldalon: a szekció
    // gyökere, majd az aktuális lap.
    const items = breadcrumbJsonLd([
      { name: 'Tudástár', path: '/blog' },
      { name: 'Kézrehabilitáció', path: '/blog/kategoria/kezrehabilitacio' },
    ]).itemListElement as Array<Record<string, unknown>>

    expect(items).toHaveLength(2)
    expect(items[0]!.position).toBe(1)
    expect(items[0]!.item).toBe(absoluteUrl('/blog'))
    expect(items[1]!.item).toBe(absoluteUrl('/blog/kategoria/kezrehabilitacio'))
  })
})
