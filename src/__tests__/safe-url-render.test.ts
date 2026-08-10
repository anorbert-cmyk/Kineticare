import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RenderBlocks } from '../components/blocks/RenderBlocks'
import { PressLogos } from '../components/blocks/PressLogos'
import { LexicalContent } from '../components/courses/LexicalContent'
import { DesktopNav } from '../components/layout/DesktopNav'
import { renderLexicalContent } from '../components/lexical/serialize'
import { buildNavTree } from '../lib/menu-tree'
import type { BlockPressLogos, Menu, Page, Product } from '../payload-types'

/**
 * Bekötés-tesztek: a CMS-ből érkező, TILTOTT sémájú webcím a VALÓDI
 * komponenseken keresztül sem jelenhet meg href-ként (src/lib/safe-url.ts).
 *
 * A `safe-url.test.ts` a szűrő szerződését rögzíti; ez a fájl azt, hogy a
 * szűrő ott van, ahol CMS-adat href-be kerül. Mindegyik esethez tartozik
 * POZITÍV KONTROLL is (ártalmatlan URL-lel ugyanaz a komponens hivatkozást
 * renderel) — enélkül az „nincs benne a javascript:" állítás akkor is
 * teljesülne, ha a komponens egyáltalán nem renderelne semmit.
 */

/** A tesztekben használt támadó-érték; sehol nem szabad href-ként megjelennie. */
const HOSTILE_URL = 'javascript:alert(1)'

/** Protokoll-relatív cím: idegen eredetre visz, tehát ez sem renderelhető. */
const PROTOCOL_RELATIVE_URL = '//idegen.example/phish'

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

/**
 * A kimenet egyetlen href-je sem hivatkozhat a támadó-értékre.
 *
 * A vizsgálat a HREF-ATTRIBÚTUMOKRA szűkít, nem a nyers szövegre: a
 * `javascript:alert(1)` látható SZÖVEGKÉNT ártalmatlan (a React escape-eli),
 * a tiltás a navigációs célra szól.
 */
function hrefValues(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1])
}

function expectNoHostileHref(html: string): void {
  for (const href of hrefValues(html)) {
    expect(href.toLowerCase()).not.toContain('javascript:')
    expect(href).not.toContain('idegen.example')
  }
}

type Layout = NonNullable<Page['layout']>

function layoutOf(...blocks: Record<string, unknown>[]): Layout {
  return blocks as unknown as Layout
}

function renderBlocks(layout: Layout): string {
  return render(
    createElement(RenderBlocks, { layout, products: [], posts: [], testimonials: [] }),
  )
}

// ---------------------------------------------------------------------------
// Szekció-blokkok (Button, CredentialsStrip, Services, PressLogos)
// ---------------------------------------------------------------------------

describe('ctaBanner → Button', () => {
  const block = (url: string) => ({
    blockType: 'ctaBanner',
    id: 'cta1',
    title: 'Kezdd el a felépülést',
    cta: { felirat: 'Irány a kurzus', url },
    sectionSettings: {},
  })

  it('tiltott sémájú CTA: a felirat megmarad, de nem lesz belőle hivatkozás', () => {
    const html = renderBlocks(layoutOf(block(HOSTILE_URL)))

    expect(html).toContain('Irány a kurzus')
    expectNoHostileHref(html)
    // Letiltott állapotban renderel — a gomb nem tűnik aktívnak.
    expect(html).toContain('aria-disabled="true"')
  })

  it('POZITÍV KONTROLL: ártalmatlan cél hivatkozásként renderel', () => {
    const html = renderBlocks(layoutOf(block('/kurzusok')))

    expect(hrefValues(html)).toContain('/kurzusok')
  })
})

describe('credsStrip → CredentialsStrip', () => {
  const block = (url: string) => ({
    blockType: 'credsStrip',
    id: 'creds1',
    items: [{ id: 'i1', text: 'Szakmai egyesületi tagság' }],
    link: { felirat: 'Bővebben rólunk', url },
    sectionSettings: {},
  })

  it('tiltott sémájú link: a hitel-tételek megmaradnak, a link kimarad', () => {
    const html = renderBlocks(layoutOf(block(HOSTILE_URL)))

    expect(html).toContain('Szakmai egyesületi tagság')
    expect(html).not.toContain('Bővebben rólunk')
    expectNoHostileHref(html)
  })

  it('protokoll-relatív cím sem renderelődik (idegen eredet)', () => {
    const html = renderBlocks(layoutOf(block(PROTOCOL_RELATIVE_URL)))

    expect(html).toContain('Szakmai egyesületi tagság')
    expectNoHostileHref(html)
  })

  it('POZITÍV KONTROLL: ártalmatlan cél hivatkozásként renderel', () => {
    const html = renderBlocks(layoutOf(block('/rolunk')))

    expect(hrefValues(html)).toContain('/rolunk')
    expect(html).toContain('Bővebben rólunk')
  })
})

describe('services → Services sor-hivatkozás', () => {
  const block = (url: string) => ({
    blockType: 'services',
    id: 'srv1',
    title: 'Így tudunk segíteni',
    rows: [
      {
        id: 'r1',
        title: 'Kézsérülés utáni felépülés',
        body: 'Otthon végezhető program.',
        felirat: 'Tovább',
        url,
      },
    ],
    sectionSettings: {},
  })

  it('tiltott sémájú sor-hivatkozás: a sor szövege marad, link nélkül', () => {
    const html = renderBlocks(layoutOf(block(HOSTILE_URL)))

    expect(html).toContain('Kézsérülés utáni felépülés')
    expect(html).not.toContain('Tovább')
    expectNoHostileHref(html)
  })

  it('POZITÍV KONTROLL: ártalmatlan cél hivatkozásként renderel', () => {
    const html = renderBlocks(layoutOf(block('https://kineticare.hu/kurzusok')))

    expect(hrefValues(html)).toContain('https://kineticare.hu/kurzusok')
  })
})

describe('pressLogos → PressLogos logó-link', () => {
  const block = (url: string): BlockPressLogos =>
    ({
      blockType: 'pressLogos',
      id: 'press1',
      heading: 'Ismerhetsz minket innen',
      logos: [
        {
          id: 'l1',
          image: { url: '/media/logo.png', alt: 'Példa Magazin logó', width: 160, height: 60 },
          url,
        },
      ],
      sectionSettings: {},
    }) as unknown as BlockPressLogos

  it('tiltott sémájú logó-link: a logó képe marad, hivatkozás nélkül', () => {
    const html = render(createElement(PressLogos, { block: block(HOSTILE_URL) }))

    expect(html).toContain('Példa Magazin logó')
    expect(hrefValues(html)).toHaveLength(0)
    expectNoHostileHref(html)
  })

  it('POZITÍV KONTROLL: ártalmatlan cél hivatkozásként renderel', () => {
    const html = render(createElement(PressLogos, { block: block('https://pelda.hu/cikk') }))

    expect(hrefValues(html)).toContain('https://pelda.hu/cikk')
  })
})

// ---------------------------------------------------------------------------
// RichText-renderelők (storefront + kurzus-oldal)
// ---------------------------------------------------------------------------

/** Egyetlen linket tartalmazó Lexical-dokumentum (a Payload alap-alakja). */
function lexicalDocWithLink(url: string): unknown {
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
          direction: 'ltr',
          format: '',
          indent: 0,
          children: [
            { type: 'text', version: 1, text: 'Kattints ide', format: 0 },
            {
              type: 'link',
              version: 3,
              direction: 'ltr',
              format: '',
              indent: 0,
              fields: { linkType: 'custom', url, newTab: false },
              children: [{ type: 'text', version: 1, text: 'a linkre', format: 0 }],
            },
          ],
        },
      ],
    },
  }
}

describe('lexical/serialize (storefront richText)', () => {
  it('tiltott sémájú link: a szöveg megmarad, href nélkül', () => {
    const html = render(renderLexicalContent(lexicalDocWithLink(HOSTILE_URL)) as ReactNode)

    expect(html).toContain('a linkre')
    expectNoHostileHref(html)
  })

  it('POZITÍV KONTROLL: ártalmatlan cél hivatkozásként renderel', () => {
    const html = render(renderLexicalContent(lexicalDocWithLink('/blog/kezfajdalom')) as ReactNode)

    expect(hrefValues(html)).toContain('/blog/kezfajdalom')
  })
})

describe('courses/LexicalContent (kurzus-leírás richText)', () => {
  type LexicalDoc = NonNullable<Product['longDescription']>

  const content = (url: string): LexicalDoc => lexicalDocWithLink(url) as LexicalDoc

  it('tiltott sémájú link: a szöveg megmarad, href nélkül', () => {
    const html = render(createElement(LexicalContent, { content: content(HOSTILE_URL) }))

    expect(html).toContain('a linkre')
    expectNoHostileHref(html)
  })

  /**
   * A korábbi, helyi `safeHref` prefix-mintája (`/^(https?:\/\/|\/|#|mailto:)/`)
   * ezt ÁTENGEDTE: a `//idegen.example` gyökér-relatívnak látszik, a böngésző
   * viszont protokoll-relatív, idegen eredetű címként értelmezi.
   */
  it('protokoll-relatív cím sem renderelődik (a korábbi szűrő rése)', () => {
    const html = render(createElement(LexicalContent, { content: content(PROTOCOL_RELATIVE_URL) }))

    expect(html).toContain('a linkre')
    expectNoHostileHref(html)
  })

  it('POZITÍV KONTROLL: ártalmatlan cél hivatkozásként renderel', () => {
    const html = render(createElement(LexicalContent, { content: content('/kurzusok/12') }))

    expect(hrefValues(html)).toContain('/kurzusok/12')
  })
})

// ---------------------------------------------------------------------------
// Navigáció („Külső link" típusú menüpont)
// ---------------------------------------------------------------------------

describe('menüpont → DesktopNav', () => {
  function urlMenu(url: string): Menu {
    return {
      id: 1,
      label: 'Külső menüpont',
      type: 'url',
      url,
      ref: null,
      parent: null,
      order: 1,
      visible: true,
      openInNewTab: false,
      updatedAt: '',
      createdAt: '',
    } as unknown as Menu
  }

  it('tiltott sémájú menüpont teljesen kimarad a navigációból', () => {
    const items = buildNavTree([urlMenu(HOSTILE_URL)])

    expect(items).toHaveLength(0)
    const html = render(createElement(DesktopNav, { items }))
    expect(html).toBe('')
  })

  it('protokoll-relatív menüpont sem kerül a navigációba', () => {
    expect(buildNavTree([urlMenu(PROTOCOL_RELATIVE_URL)])).toHaveLength(0)
  })

  it('POZITÍV KONTROLL: ártalmatlan menüpont hivatkozásként renderel', () => {
    const items = buildNavTree([urlMenu('https://pelda.hu/rolunk')])

    expect(items).toHaveLength(1)
    const html = render(createElement(DesktopNav, { items }))
    expect(hrefValues(html)).toContain('https://pelda.hu/rolunk')
  })
})
