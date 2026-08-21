import { describe, expect, it } from 'vitest'

import { absoluteUrl, articleJsonLd, blogJsonLd, breadcrumbJsonLd } from '../lib/seo'
import {
  POST_FAQ_MAX_ITEMS,
  postArticleJsonLd,
  postFaqItems,
  postFaqJsonLd,
  type ArticleSeoPost,
  type PostFaqSource,
} from '../lib/seo-cikk'
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

// ---------------------------------------------------------------------------
// Cikk-séma (src/lib/seo-cikk.ts) — Article + MedicalWebPage, szerző, lektor,
// ellenőrzési dátum, GYIK.
//
// Ez a réteg az egészségügyi (YMYL) tartalom miatt szigorúbb a fenti,
// általános Article-sémánál: szerzőt, lektort és ellenőrzési napot is közöl.
// A két gyógytornász szakmai renoméja a tét, ezért minden állítás, amit a
// séma tesz, a LÁTHATÓ tartalomból kell hogy jöjjön — és amit nem tudunk
// igazolni (lektor, ellenőrzés napja), azt a séma ki sem mondja.
// ---------------------------------------------------------------------------

const cikk = (overrides: Partial<ArticleSeoPost> = {}): ArticleSeoPost => ({
  title: 'Levették a gipszet a csuklómról, mit csináljak?',
  excerpt: 'Az első hét gyakorlatai és a leggyakoribb hibák.',
  publishedAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-12T09:30:00.000Z',
  ...overrides,
})

const KATA = { name: 'Kocsis Kata', credentials: 'gyógytornász, kézterapeuta' }
const LEKTOR = { name: 'Nagy Kata', credentials: 'gyógytornász' }

/** A cikk-séma egy adott kulcsa objektumként (a node-ok mind Record-ok). */
const node = (jsonLd: Record<string, unknown>, key: string): Record<string, unknown> =>
  jsonLd[key] as Record<string, unknown>

describe('Cikk-séma: kettős típus (Article + MedicalWebPage)', () => {
  it('EGY entitás, tömbös @type-tal, nem két külön node', () => {
    // Két node ugyanarról a lapról két entitásnak látszana a gépi olvasónak
    // (a kezdőlapi duplikált Organization hibája). A MedicalWebPage a WebPage
    // altípusa, ezért teszi érvényessé a lastReviewed/reviewedBy mezőt.
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/gipsz-utan' })

    expect(jsonLd['@type']).toEqual(['Article', 'MedicalWebPage'])
  })

  it('a @context a schema.org, hogy a node egyáltalán értelmezhető legyen', () => {
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/gipsz-utan' })
    expect(jsonLd['@context']).toBe('https://schema.org')
  })

  it('magyar nyelvet közöl (entitás-egyértelműsítés az AI-válaszokhoz)', () => {
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/gipsz-utan' })
    expect(jsonLd.inLanguage).toBe('hu-HU')
  })

  it('a headline KARAKTERRE a látható cím, csonkítás nélkül', () => {
    // A Google Article-dokumentációja nem szab karakterkorlátot, a séma és a
    // látható H1 eltérése viszont pont az, amiért elvetik a strukturált adatot.
    const hosszuCim =
      'Meddig tart a felépülés csuklótörés után, és mikor kezdhetem el újra a mindennapi mozdulatokat otthon?'
    const jsonLd = postArticleJsonLd({ post: cikk({ title: hosszuCim }), path: '/blog/x' })

    expect(jsonLd.headline).toBe(hosszuCim)
  })

  it('a description a látható bevezető; bevezető nélkül nincs üres mező', () => {
    const vanBevezeto = postArticleJsonLd({ post: cikk(), path: '/blog/gipsz-utan' })
    const nincsBevezeto = postArticleJsonLd({ post: cikk({ excerpt: null }), path: '/blog/x' })
    const uresBevezeto = postArticleJsonLd({ post: cikk({ excerpt: '   ' }), path: '/blog/x' })

    expect(vanBevezeto.description).toBe('Az első hét gyakorlatai és a leggyakoribb hibák.')
    expect('description' in nincsBevezeto).toBe(false)
    expect('description' in uresBevezeto).toBe(false)
  })

  it('a mainEntityOfPage a KAPOTT útvonal abszolút alakja', () => {
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/gipsz-utan' })
    expect(jsonLd.mainEntityOfPage).toBe(absoluteUrl('/blog/gipsz-utan'))
  })

  it('a kép tömbben, abszolút URL-lel megy ki; kép nélkül nincs image kulcs', () => {
    const kepes = postArticleJsonLd({
      post: cikk(),
      path: '/blog/x',
      imageUrl: absoluteUrl('/media/gipsz-og.jpg'),
    })
    const kepetlen = postArticleJsonLd({ post: cikk(), path: '/blog/x' })

    expect(kepes.image).toEqual([absoluteUrl('/media/gipsz-og.jpg')])
    expect('image' in kepetlen).toBe(false)
  })

  it('a kiadó minden cikken a Kineticare Organization, kanonikus gyökérrel', () => {
    const publisher = node(postArticleJsonLd({ post: cikk(), path: '/blog/x' }), 'publisher')

    expect(publisher['@type']).toBe('Organization')
    expect(publisher.name).toBe('Kineticare')
    expect(publisher.url).toBe(absoluteUrl('/'))
  })

  it('egyetlen kulcs sem hordoz undefined értéket (a JsonLd JSON.stringify-olja)', () => {
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/x' })
    const undefinedKulcsok = Object.entries(jsonLd)
      .filter(([, value]) => value === undefined)
      .map(([key]) => key)

    expect(undefinedKulcsok).toEqual([])
  })
})

describe('Cikk-séma: szerző és lektor (E-E-A-T)', () => {
  it('a szerző Person, a NEVE csak név, a titulus a jobTitle-ben', () => {
    // Google Article structured data: „author.name — only specify the name of
    // the author. Don't add any other piece of information" — a titulushoz a
    // jobTitle tulajdonság való.
    const author = node(
      postArticleJsonLd({ post: cikk(), path: '/blog/x', author: KATA }),
      'author',
    )

    expect(author['@type']).toBe('Person')
    expect(author.name).toBe('Kocsis Kata')
    expect(author.jobTitle).toBe('gyógytornász, kézterapeuta')
  })

  it('a szerző url-je a látható szerző-blokk célja (/rolunk), abszolút alakban', () => {
    const author = node(
      postArticleJsonLd({ post: cikk(), path: '/blog/x', author: KATA }),
      'author',
    )
    expect(author.url).toBe(absoluteUrl('/rolunk'))
  })

  it('titulus nélküli szerzőnél nincs üres jobTitle', () => {
    const author = node(
      postArticleJsonLd({ post: cikk(), path: '/blog/x', author: { name: 'Kocsis Kata' } }),
      'author',
    )

    expect(author.name).toBe('Kocsis Kata')
    expect('jobTitle' in author).toBe(false)
  })

  it('a név és a titulus körüli szóközöket levágja', () => {
    const author = node(
      postArticleJsonLd({
        post: cikk(),
        path: '/blog/x',
        author: { name: '  Kocsis Kata  ', credentials: '  gyógytornász  ' },
      }),
      'author',
    )

    expect(author.name).toBe('Kocsis Kata')
    expect(author.jobTitle).toBe('gyógytornász')
  })

  it('SZERZŐ NÉLKÜL Organization-tartalék, nem márkanevű Person', () => {
    // A Kineticare nem személy: a Person{name:'Kineticare'} típushiba volt.
    const author = node(postArticleJsonLd({ post: cikk(), path: '/blog/x' }), 'author')

    expect(author['@type']).toBe('Organization')
    expect(author.name).toBe('Kineticare')
    expect(author.url).toBe(absoluteUrl('/'))
  })

  it('üres nevű szerzőnél is az Organization-tartalék lép be', () => {
    const author = node(
      postArticleJsonLd({ post: cikk(), path: '/blog/x', author: { name: '   ' } }),
      'author',
    )
    expect(author['@type']).toBe('Organization')
  })

  it('reviewedBy CSAK akkor, ha tényleg van lektor', () => {
    const lektorral = postArticleJsonLd({
      post: cikk(),
      path: '/blog/x',
      author: KATA,
      reviewer: LEKTOR,
    })
    const lektor = node(lektorral, 'reviewedBy')
    const lektortalan = postArticleJsonLd({ post: cikk(), path: '/blog/x', author: KATA })

    expect(lektor['@type']).toBe('Person')
    expect(lektor.name).toBe('Nagy Kata')
    expect(lektor.jobTitle).toBe('gyógytornász')
    expect('reviewedBy' in lektortalan).toBe(false)
  })
})

describe('Cikk-séma: dátumok (a módosítás NEM ellenőrzés)', () => {
  it('a datePublished és a dateModified időzónástul, változatlanul megy ki', () => {
    // A Google Article-dokumentációja ISO 8601-et kér, és kifejezetten ajánlja
    // az időzóna közlését; a schema.org szerint mindkettő Date ÉS DateTime.
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/x' })

    expect(jsonLd.datePublished).toBe('2026-08-10T08:00:00.000Z')
    expect(jsonLd.dateModified).toBe('2026-08-12T09:30:00.000Z')
  })

  it('hiányzó dátumnál nincs üres kulcs', () => {
    const jsonLd = postArticleJsonLd({
      post: cikk({ publishedAt: null, updatedAt: null }),
      path: '/blog/x',
    })

    expect('datePublished' in jsonLd).toBe(false)
    expect('dateModified' in jsonLd).toBe(false)
  })

  it('a lastReviewed NAPRA pontos (a schema.org szerint Date, nem DateTime)', () => {
    const jsonLd = postArticleJsonLd({
      post: cikk(),
      path: '/blog/x',
      lastReviewed: '2026-08-18T14:25:00.000Z',
    })

    expect(jsonLd.lastReviewed).toBe('2026-08-18')
  })

  it('a már napra pontos érték változatlanul megy át', () => {
    const jsonLd = postArticleJsonLd({ post: cikk(), path: '/blog/x', lastReviewed: '2026-08-18' })
    expect(jsonLd.lastReviewed).toBe('2026-08-18')
  })

  it('ELLENŐRZÉS NÉLKÜL nincs lastReviewed (dátumot kitalálni tilos)', () => {
    const nincs = postArticleJsonLd({ post: cikk(), path: '/blog/x' })
    const ures = postArticleJsonLd({ post: cikk(), path: '/blog/x', lastReviewed: '   ' })
    const nullas = postArticleJsonLd({ post: cikk(), path: '/blog/x', lastReviewed: null })
    const ertelmetlen = postArticleJsonLd({
      post: cikk(),
      path: '/blog/x',
      lastReviewed: 'tavaly ősszel',
    })

    expect('lastReviewed' in nincs).toBe(false)
    expect('lastReviewed' in ures).toBe(false)
    expect('lastReviewed' in nullas).toBe(false)
    expect('lastReviewed' in ertelmetlen).toBe(false)
  })

  it('a dokumentum-módosítás és a szakmai ellenőrzés KÜLÖN mezőben él', () => {
    // Egy vessző-javítás nem szakmai ellenőrzés: a két dátum nem keverhető.
    const jsonLd = postArticleJsonLd({
      post: cikk({ updatedAt: '2026-08-20T11:00:00.000Z' }),
      path: '/blog/x',
      lastReviewed: '2026-06-02T00:00:00.000Z',
    })

    expect(jsonLd.dateModified).toBe('2026-08-20T11:00:00.000Z')
    expect(jsonLd.lastReviewed).toBe('2026-06-02')
  })

  it('a lektor és az ellenőrzési nap FÜGGETLENÜL is kimehet', () => {
    const csakLektor = postArticleJsonLd({ post: cikk(), path: '/blog/x', reviewer: LEKTOR })
    const csakDatum = postArticleJsonLd({
      post: cikk(),
      path: '/blog/x',
      lastReviewed: '2026-06-02',
    })

    expect('reviewedBy' in csakLektor).toBe(true)
    expect('lastReviewed' in csakLektor).toBe(false)
    expect('reviewedBy' in csakDatum).toBe(false)
    expect(csakDatum.lastReviewed).toBe('2026-06-02')
  })
})

describe('Cikk-séma: amit TUDATOSAN nem állít', () => {
  it('nincs kitalált klinikai vagy értékelési adat a node-ban', () => {
    // A gépi formában kódolt klinikai állítás ugyanúgy állítás: az orvosi
    // tartalom-szabály (minden állításhoz forrás) a sémára is áll. Az
    // értékelés-mezőket a fogyasztóvédelem és a Google irányelve is tiltja
    // valós adat nélkül.
    const jsonLd = postArticleJsonLd({
      post: cikk(),
      path: '/blog/x',
      author: KATA,
      reviewer: LEKTOR,
      lastReviewed: '2026-08-18',
      imageUrl: absoluteUrl('/media/x.jpg'),
    })

    for (const tiltott of [
      'about',
      'citation',
      'aggregateRating',
      'review',
      'speakable',
      'medicalAudience',
      'medicalSpecialty',
    ]) {
      expect(tiltott in jsonLd).toBe(false)
    }
  })
})

describe('Cikk-GYIK: a séma és a látható lista KÖZÖS forrása', () => {
  const nyers = (): PostFaqSource[] => [
    {
      question: 'Mikor kezdhetem el a gyakorlatokat?',
      answer: 'A kezelőorvosod jóváhagyása után.',
    },
    { question: 'Fájhat a torna?', answer: 'Enyhe húzó érzés lehet, éles fájdalom nem.' },
  ]

  it('trimmel, és a sorrendet megtartja', () => {
    const items = postFaqItems([
      { question: '  Mikor kezdhetem el a gyakorlatokat?  ', answer: '  A jóváhagyás után.  ' },
      { question: 'Fájhat a torna?', answer: 'Enyhe húzó érzés lehet.' },
    ])

    expect(items).toEqual([
      { question: 'Mikor kezdhetem el a gyakorlatokat?', answer: 'A jóváhagyás után.' },
      { question: 'Fájhat a torna?', answer: 'Enyhe húzó érzés lehet.' },
    ])
  })

  it('a hiányos tétel MINDKETTŐBŐL kimarad (kérdés vagy válasz nélkül)', () => {
    const items = postFaqItems([
      { question: 'Van kérdés, nincs válasz?', answer: '' },
      { question: '   ', answer: 'Van válasz, nincs kérdés.' },
      { question: 'Ez a teljes tétel?', answer: 'Igen.' },
      { question: 'Csak kérdés' },
      { answer: 'Csak válasz' },
      { question: null, answer: null },
    ])

    expect(items).toEqual([{ question: 'Ez a teljes tétel?', answer: 'Igen.' }])
  })

  it('a plafon 6 tétel (a posts.faq maxRows-ával azonos szám)', () => {
    // Külön kimondva, mert a többi eset a konstanshoz méri magát: ha a szám
    // elcsúszik, a séma és a CMS-korlát szétválik, és a lint L11 szabálya
    // (2-6 tétel) is más plafonhoz mérne.
    expect(POST_FAQ_MAX_ITEMS).toBe(6)
  })

  it(`legfeljebb ${POST_FAQ_MAX_ITEMS} tétel jelenik meg, az elsők`, () => {
    // A maxRows csak az admin-szerkesztőt fogja meg; a seed, az import és a
    // REST-API nem futtatja. A plafon a renderelésre is kell.
    const sok = Array.from({ length: 9 }, (_unused, index) => ({
      question: `Kérdés ${index + 1}?`,
      answer: `Válasz ${index + 1}.`,
    }))
    const items = postFaqItems(sok)

    expect(items).toHaveLength(POST_FAQ_MAX_ITEMS)
    expect(items[0]!.question).toBe('Kérdés 1?')
    expect(items[POST_FAQ_MAX_ITEMS - 1]!.question).toBe(`Kérdés ${POST_FAQ_MAX_ITEMS}?`)
  })

  it('üres, null és undefined mezőnél üres lista (nem hiba)', () => {
    expect(postFaqItems([])).toEqual([])
    expect(postFaqItems(null)).toEqual([])
    expect(postFaqItems(undefined)).toEqual([])
  })

  it('NINCS FAQPage node, ha nincs érvényes tétel', () => {
    // Nulla elemű GYIK meghirdetése pont az az eltérés a látható tartalomtól,
    // ami miatt a keresők elvetik a strukturált adatot.
    expect(postFaqJsonLd([])).toBeUndefined()
    expect(postFaqJsonLd(postFaqItems([{ question: 'Csonka?', answer: '  ' }]))).toBeUndefined()
  })

  it('a FAQPage node a szokott alak, magyar nyelvvel', () => {
    const jsonLd = postFaqJsonLd(postFaqItems(nyers()))!

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('FAQPage')
    expect(jsonLd.inLanguage).toBe('hu-HU')
  })

  it('a mainEntity PONTOSAN a megjelenített tételeket viszi, sorrendben', () => {
    const items = postFaqItems(nyers())
    const mainEntity = postFaqJsonLd(items)!.mainEntity as Array<Record<string, unknown>>

    expect(mainEntity).toHaveLength(items.length)
    expect(mainEntity.map((entry) => entry.name)).toEqual(items.map((item) => item.question))
    expect(mainEntity[0]!['@type']).toBe('Question')
    expect(node(mainEntity[0]!, 'acceptedAnswer')['@type']).toBe('Answer')
  })

  it('a válasz CSONKOLATLANUL kerül a sémába (a csonkolt válasz félreidézhető)', () => {
    const hosszuValasz =
      `A gipsz levétele után az első hét célja a duzzanat csökkentése és a csukló óvatos mozgásba hozása. ${'Ismételd naponta többször, mindig fájdalomhatáron belül. '.repeat(6)}`.trim()
    const items = postFaqItems([{ question: 'Mit csináljak az első héten?', answer: hosszuValasz }])
    const mainEntity = postFaqJsonLd(items)!.mainEntity as Array<Record<string, unknown>>

    expect(hosszuValasz.length).toBeGreaterThan(400)
    expect(node(mainEntity[0]!, 'acceptedAnswer').text).toBe(hosszuValasz)
  })
})
