import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPageBySlug } from '@/lib/cms'

import { pageBlockSlugs } from '../blocks'
import { validateAnchorId } from '../blocks/section-settings'
import { RenderBlocks } from '../components/blocks/RenderBlocks'
import { minimalRichText } from '../lib/home-seed'
import { buildRolunkLayout, buildSzolgaltatasokLayout } from '../scripts/restore-legacy-content'
import type { Page } from '../payload-types'

/**
 * BELSŐ OLDALAK SZEKCIÓSORA — a P3-hiba őre és a blokkosítás szerződése.
 *
 * ═══ A HIBA, AMIT BEZÁR ═══
 * A `Pages.layout` (Szekciók) blokk-mező 16 blokktípussal létezik, az admin
 * súgója „az oldal építőkockás részének" nevezi — a `[slug]` route viszont
 * SOHA nem rendereltte (docs/ux-belso-oldalak-kutatas.md, P3). A staff
 * összerakhatott egy szekciósort, elmenthette, és semmi nem jelent meg belőle:
 * néma tartalomvesztés. Ez a teszt a javítás mindkét ágát rögzíti.
 *
 * ═══ A MÁSODIK SZERZŐDÉS ═══
 * A /rolunk és a /szolgaltatasok alap-szekciósorát a legacy-visszaépítő script
 * tölti fel EGYSZER (`buildRolunkLayout`, `buildSzolgaltatasokLayout`). Mivel a
 * route a szekciósort a rich-text HELYETT rendereli, a blokkosítás nem
 * veszíthet el tartalmat — a teszt a kritikus tényadatokat (telefonszámok,
 * árak, helyszínek, önéletrajzok) a RENDERELT kimeneten keresi.
 *
 * A tartalom egyébként a CMS-é: a feltöltés után minden szöveg, sorrend és
 * láthatóság az adminban szerkeszthető — a kód csak renderel.
 */

vi.mock('next/headers', () => ({
  draftMode: vi.fn(async () => ({ isEnabled: false })),
}))

vi.mock('@/lib/cms', () => ({
  getPageBySlug: vi.fn(),
  getPublishedProducts: vi.fn(async () => []),
  getLatestPosts: vi.fn(async () => []),
  getTestimonials: vi.fn(async () => []),
}))

const getPageBySlugMock = vi.mocked(getPageBySlug)

/** Csak a rich-text ágon jelenhet meg — a keresése így egyértelmű bizonyíték. */
const RICHTEXT_JELOLO = 'Ez a szabad szöveges oldaltartalom.'

function page(overrides: Partial<Page> = {}): Page {
  return {
    id: 1,
    title: 'A kéz a mindenünk',
    slug: 'rolunk',
    excerpt: 'Rövid bevezető.',
    content: minimalRichText(RICHTEXT_JELOLO),
    layout: null,
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

async function renderCmsPage(doc: Page): Promise<string> {
  getPageBySlugMock.mockResolvedValue(doc)
  // A vi.mock-hoistelés miatt az oldalt dinamikusan importáljuk.
  const { default: CmsPage } = await import('../app/(frontend)/[slug]/page')
  const node = (await CmsPage({
    params: Promise.resolve({ slug: doc.slug ?? 'rolunk' }),
  })) as ReactNode
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

function renderLayout(layout: NonNullable<Page['layout']>): string {
  return renderToStaticMarkup(
    createElement(RenderBlocks, { layout, posts: [], products: [], testimonials: [] }),
  )
}

/** Nyitó h1-tagek száma (a `<h1 ` és a `<h1>` alak is). */
function h1Count(markup: string): number {
  return (markup.match(/<h1[\s>]/g) ?? []).length
}

beforeEach(() => {
  getPageBySlugMock.mockReset()
})

describe('CMS-oldal renderelése (P3)', () => {
  it('szekciósor nélkül a rich-text tartalmat rendereli (mai viselkedés)', async () => {
    const markup = await renderCmsPage(page())

    expect(markup).toContain(RICHTEXT_JELOLO)
    expect(markup).toContain('kc-richtext')
    expect(markup).toContain('A kéz a mindenünk')
  })

  it('szekciósorral a BLOKKOKAT rendereli — a szekciók nem vesznek el némán', async () => {
    const markup = await renderCmsPage(page({ layout: buildRolunkLayout() }))

    // A blokkokból származó szekciók megjelennek…
    expect(markup).toContain('kc-about')
    expect(markup).toContain('kc-usps')
    expect(markup).toContain('kc-services')
    expect(markup).toContain('kc-cta-banner')
    // …a rich-text ág pedig NEM fut le (a kezdőlap mintája: vagy-vagy).
    expect(markup).not.toContain(RICHTEXT_JELOLO)
  })

  it('a hero címe marad az oldal EGYETLEN h1-e szekciósorral is', async () => {
    const uresLayout = await renderCmsPage(page())
    const blokkos = await renderCmsPage(page({ layout: buildRolunkLayout() }))

    expect(h1Count(uresLayout)).toBe(1)
    expect(h1Count(blokkos)).toBe(1)
  })

  it('film-hero blokk esetén a szöveges hero kimarad (a filmsáv adja a h1-et)', async () => {
    const markup = await renderCmsPage(
      page({
        excerpt: 'Ez a bevezető csak a szöveges heróban jelenne meg.',
        layout: [
          { blockType: 'filmHero', title: 'Filmes címsor', sectionSettings: { visible: true } },
        ],
      }),
    )

    expect(markup).not.toContain('kc-page-hero__title')
    expect(markup).not.toContain('Ez a bevezető csak a szöveges heróban jelenne meg.')
    expect(h1Count(markup)).toBe(1)
  })
})

describe('/rolunk alap-szekciósora', () => {
  const layout = buildRolunkLayout()

  it('csak a katalógusban létező blokktípusokat használja', () => {
    for (const block of layout) {
      expect(pageBlockSlugs).toContain(block.blockType)
    }
  })

  it('érvényes horgony-azonosítókat ad (ékezet és # nélkül)', () => {
    for (const block of layout) {
      const anchor = block.sectionSettings?.anchorId
      if (anchor !== undefined && anchor !== null && anchor !== '') {
        expect(validateAnchorId(anchor)).toBe(true)
      }
    }
  })

  it('NEM veszíti el a rich-text változat kulcsadatait (telefonszám, partnerek, CV)', () => {
    const markup = renderLayout(layout)

    expect(markup).toContain('+36 30 169 2263')
    expect(markup).toContain('+36 20 357 3493')
    expect(markup).toContain('Partnereink')
    expect(markup).toContain('Kocsis Kata — szakmai önéletrajz')
    expect(markup).toContain('Kiss Kata — szakmai önéletrajz')
    // A bizonyíték MENNYISÉGE a bizalmi jelzés — a CV-tételek nincsenek rövidítve
    // (a harmonika CSUKVA is a DOM-ban tartja őket, csak a böngésző rejti el).
    expect(markup).toContain('Svédmasszázs (2015) – OKTÁV Továbbképző Központ')
  })

  it('a telefonszámok és a partnerek NEM kerülnek lenyitó mögé (GOV.UK-szabály)', () => {
    // A kapcsolatfelvételi adat és a referencia-sor rövid: a nyitott, szabad
    // szöveges blokkban kell maradnia, nem a harmonikában.
    const nyitott = layout.filter((block) => block.blockType === 'richText')
    const nyitottSzoveg = renderToStaticMarkup(
      createElement(RenderBlocks, {
        layout: nyitott,
        posts: [],
        products: [],
        testimonials: [],
      }),
    )
    expect(nyitottSzoveg).toContain('+36 30 169 2263')
    expect(nyitottSzoveg).toContain('+36 20 357 3493')
    expect(nyitottSzoveg).toContain('Partnereink')
    expect(nyitottSzoveg).not.toContain('<details')
  })

  it('egyetlen elsődleges CTA-gombot tartalmaz, a fizetős kurzusra (B6.5)', () => {
    const markup = renderLayout(layout)

    expect((markup.match(/kc-button--primary/g) ?? []).length).toBe(1)
    expect(markup).toContain('Megnézem a kurzusokat')
  })

  it('nem visz saját h1-et (a lap h1-e a hero címe marad)', () => {
    expect(h1Count(renderLayout(layout))).toBe(0)
  })

  it('sajtó-logósor csak akkor kerül be, ha van feltöltött logó', () => {
    expect(layout.some((block) => block.blockType === 'pressLogos')).toBe(false)
    const logokkal = buildRolunkLayout({ sajtoLogok: [11, 12] })
    expect(logokkal.some((block) => block.blockType === 'pressLogos')).toBe(true)
  })
})

/**
 * RÉSZLETES SZAKMAI HÁTTÉR — harmonikában (tulajdonosi kérés, 2026-08-16).
 *
 * ═══ MI VÁLTOZOTT ═══
 * A két teljes szakmai önéletrajz korábban EGY szabad szöveges blokkban, folyó
 * szövegként állt: több képernyőnyi görgetés a lap alsó felében. Most az új
 * `accordion` blokk viszi, tételenként (szakemberenként) csukható sorban.
 *
 * A SZERZŐDÉS, AMIT EZ A LEÍRÁS ŐRIZ:
 *  - a tartalom nem vész el (a CV-tételek a DOM-ban maradnak),
 *  - a fejléc DARABSZÁMA a TÉNYLEGES tartalomból számolódik (nem kézzel beírt
 *    szám, ami elcsúszhatna a listától — a teamMembers CV-harmonikájának
 *    mintája),
 *  - a rövid, kapcsolatfelvételi tartalom NEM kerül lenyitó mögé.
 */
describe('/rolunk — a részletes szakmai háttér harmonikája', () => {
  const layout = buildRolunkLayout()
  const accordionBlock = layout.find((block) => block.blockType === 'accordion')

  /** Egy lexical richText tömbben: az adott h3 címsort KÖVETŐ lista tételszáma. */
  function listaTetelszam(tartalom: unknown, listaCim: string): number {
    const children = (tartalom as { root?: { children?: unknown[] } } | null)?.root?.children ?? []
    const cimIndex = children.findIndex((node) => {
      const tipus = (node as { type?: string }).type
      const szoveg = ((node as { children?: { text?: string }[] }).children ?? [])
        .map((child) => child.text ?? '')
        .join('')
      return tipus === 'heading' && szoveg === listaCim
    })
    if (cimIndex === -1) {
      throw new Error(`Nincs ilyen lista az önéletrajzban: ${listaCim}`)
    }
    const lista = children[cimIndex + 1] as { type?: string; children?: unknown[] }
    expect(lista.type, `a(z) „${listaCim}" címsort nem lista követi`).toBe('list')
    return (lista.children ?? []).length
  }

  it('a szekciósorban ott van az accordion blokk, a „szakmai-hatter" horgonnyal', () => {
    expect(accordionBlock, 'nincs accordion blokk a /rolunk szekciósorában').toBeDefined()
    expect(accordionBlock?.sectionSettings?.anchorId).toBe('szakmai-hatter')
    // Az új blokktípus a katalógus része (különben az adminban sem lenne).
    expect(pageBlockSlugs).toContain('accordion')
  })

  it('szakemberenként egy nyitható sor, beszélő címmel', () => {
    if (accordionBlock?.blockType !== 'accordion') {
      throw new Error('A harmonika-blokk hiányzik a szekciósorból.')
    }
    const cimek = (accordionBlock.items ?? []).map((item) => item.cim)
    expect(cimek).toEqual(['Kocsis Kata — szakmai önéletrajz', 'Kiss Kata — szakmai önéletrajz'])
  })

  it('a fejléc darabszáma a TARTALOMBÓL számolódik, nem kézzel beírt szám', () => {
    if (accordionBlock?.blockType !== 'accordion') {
      throw new Error('A harmonika-blokk hiányzik a szekciósorból.')
    }
    const [kocsis, kiss] = accordionBlock.items ?? []

    // A számot a tényleges listákból vezetjük le — ha valaki bővíti a CV-t, a
    // kivonatnak vele kell nőnie (kézzel beírt számnál ez elcsúszna).
    const kocsisTanfolyam = listaTetelszam(kocsis.tartalom, 'Tanfolyamok, továbbképzések, konferenciák')
    const kocsisKonferencia = listaTetelszam(kocsis.tartalom, 'Konferenciák, előadások')
    const kocsisMedia = listaTetelszam(kocsis.tartalom, 'Média-megjelenések')
    expect(kocsisTanfolyam).toBeGreaterThan(10)
    expect(kocsis.osszefoglalo).toContain(`${kocsisTanfolyam} tanfolyam`)
    expect(kocsis.osszefoglalo).toContain(`${kocsisKonferencia} konferencia`)
    expect(kocsis.osszefoglalo).toContain(`${kocsisMedia} médiamegjelenés`)

    const kissTanfolyam = listaTetelszam(kiss.tartalom, 'Tanfolyamok, továbbképzések, konferenciák')
    const kissKonferencia = listaTetelszam(kiss.tartalom, 'Konferenciák, előadások')
    expect(kiss.osszefoglalo).toBe(
      `${kissTanfolyam} tanfolyam · ${kissKonferencia} konferencia`,
    )
  })

  it('natív details/summary-vel renderelődik, alapból ZÁRVA', () => {
    const markup = renderLayout(layout)

    expect(markup).toContain('<details class="kc-accordion__item">')
    expect(markup).toContain('<summary class="kc-accordion__summary">')
    // Nyitott állapotot egyik sor sem visz — a látogató nyitja ki.
    expect(markup).not.toContain('<details class="kc-accordion__item" open')
    // A harmonika NEM ad ki FAQPage strukturált adatot (egy CV nem GYIK).
    expect(markup).not.toContain('FAQPage')
  })
})

describe('/szolgaltatasok alap-szekciósora', () => {
  const layout = buildSzolgaltatasokLayout()

  it('csak a katalógusban létező blokktípusokat használja', () => {
    for (const block of layout) {
      expect(pageBlockSlugs).toContain(block.blockType)
    }
  })

  it('a lap teteje ÜDVÖZLŐ blokk, a régi bevezető szövegével (redesign, 2026-08-16)', () => {
    // A folyó szöveges bevezető helyére tagolt üdvözlő blokk került; a SZÖVEG
    // betűhíven ugyanaz maradt — a renderelt kimeneten keresve.
    expect(layout[0].blockType).toBe('welcome')
    const markup = renderLayout(layout)

    expect(markup).toContain('Fáj a kezed, csuklód, könyököd vagy vállad?')
    expect(markup).toContain('Van megoldás – ha tudod, merre indulj')
    expect(markup).toContain('a test egy csodálatos „szerkezet”')
    expect(markup).toContain('akár a műtét is elkerülhető')
    expect(markup).toContain('mennyire tud hátráltatni a munkában vagy a sportban')
    expect(markup).toContain('a hosszú távú regenerációban')
  })

  it('a három szolgáltatási ág EGY szekcióban, azonos mezőrenddel áll (5.3, B4.1)', () => {
    const services = layout.find((block) => block.blockType === 'services')
    expect(services).toBeDefined()
    if (services?.blockType !== 'services') {
      throw new Error('A szolgáltatás-szekció hiányzik a szekciósorból.')
    }
    expect(services.rows).toHaveLength(3)
    for (const row of services.rows ?? []) {
      expect(row.title.trim().length).toBeGreaterThan(0)
      expect((row.body ?? '').trim().length).toBeGreaterThan(0)
      expect((row.felirat ?? '').trim().length).toBeGreaterThan(0)
      expect((row.url ?? '').trim().length).toBeGreaterThan(0)
    }
  })

  it('megőrzi az árakat, a helyszíneket és az akkreditációs adatot', () => {
    const markup = renderLayout(layout)

    expect(markup).toContain('18 000 Ft')
    expect(markup).toContain('10 000 Ft')
    expect(markup).toContain('Nádorliget u. 7/b')
    expect(markup).toContain('Fadrusz utca 15.')
    expect(markup).toContain('SZTK-A-33553/2024')
    // A kiegészítő terápiák felsorolása is megmarad (nem csak a rövid sor-szöveg).
    expect(markup).toContain('Manuálterápia')
  })

  it('egyetlen elsődleges CTA-gomb: az időpontkérés szöveglink marad (B6.5)', () => {
    const markup = renderLayout(layout)

    expect((markup.match(/kc-button--primary/g) ?? []).length).toBe(1)
    expect(markup).toContain('Megnézem a kurzusokat')
    expect(markup).toContain('időpontot kérek')
  })

  it('nem visz saját h1-et (a lap h1-e a hero címe marad)', () => {
    expect(h1Count(renderLayout(layout))).toBe(0)
  })
})
