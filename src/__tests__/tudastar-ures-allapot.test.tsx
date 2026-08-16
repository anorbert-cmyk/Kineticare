import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PostsEmptyState } from '../components/content/PostsEmptyState'
import { freeCourseHref } from '../lib/tudastar'

/**
 * ŐR — a Tudástár ÜRES ÁLLAPOTA nem lehet zsákutca.
 *
 * Mit véd. A `/blog` mérve nulla tartalmi linket adott, miközben a „Tudástár"
 * a négy főmenüpont egyike (docs/informacios-architektura.md Z2). Ez a hiba
 * NÉMA: az oldal 200-zal válaszol, semmi nem hibázik, a látogató mégis
 * megáll. Csak végrehajtható szabály tudja megakadályozni, hogy egy későbbi
 * egyszerűsítés visszaállítsa az „egy szürke mondat" állapotot.
 *
 * Követelmények (NN/g empty state + IBM Carbon anatómia):
 *  1. van cím és magyarázó szöveg (mi kerül ide),
 *  2. van LEGALÁBB egy továbbvezető út, és az valódi célra visz,
 *  3. a felirat a §3.2 CTA-szótár szava, gondolatjel nélkül,
 *  4. hamis ígéret nincs: ingyenes út csak akkor, ha van ingyenes kurzus.
 *
 * A tesztkörnyezet `node` (nincs jsdom), ezért a SZERVER-RENDERELT kimenetet
 * mérjük — pontosan azt, amit a JS nélküli látogató és a keresőrobot lát.
 */

const render = (element: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(element)

/** A kimenet `href` értékei. */
function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!)
}

/** A kimenet látható szövege (címkék nélkül, entitás-feloldással). */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('Tudástár üres állapota — a teljes lista üres', () => {
  const html = render(createElement(PostsEmptyState, { variant: 'tudastar' }))

  it('megmondja, mi kerül ide (magyarázó szöveg, nem csak egy tagadás)', () => {
    const content = text(html)
    expect(content).toContain('Hamarosan érkeznek az első cikkek')
    expect(content).toContain('A Tudástárba kézrehabilitációs cikkek kerülnek')
    // Az NN/g „teachable moment": a szöveg érdemben hosszabb egy mondatnál.
    expect(content.length).toBeGreaterThan(120)
  })

  it('továbbvisz a valódi célokra: kurzuslista ÉS kapcsolat', () => {
    const links = hrefs(html)
    expect(links).toContain('/kurzusok')
    expect(links).toContain('/kapcsolat')
    // Zsákutca-tilalom (skill 5. pont): legalább két kimenő út.
    expect(new Set(links).size).toBeGreaterThanOrEqual(2)
  })

  it('a szótári feliratot használja, gondolatjel nélkül', () => {
    const content = text(html)
    // docs/ui-sztenderdek.md §3.2, 10. sor — az üres állapotokat nevesíti.
    expect(content).toContain('Nézd meg a kurzusokat')
    // Magyar mikroszöveg §3.1.1: kvirtmínusz (U+2014) sehol.
    expect(html).not.toContain('—')
    // Töltelék gondolatjel (U+2013 szóközök közt) sincs.
    expect(html).not.toMatch(/ – /)
  })

  it('címsorral nevezi meg magát (a szekciónak van hozzáférhető neve)', () => {
    expect(html).toMatch(/<h2[^>]*id="tudastar-ures-cim"/)
    expect(html).toMatch(/aria-labelledby="tudastar-ures-cim"/)
  })

  it('ingyenes kurzus nélkül NEM ígér ingyenes indulást', () => {
    expect(text(html)).not.toContain('Elindítom ingyen')
  })

  it('ingyenes kurzussal a szótári „Elindítom ingyen" felirat jelenik meg', () => {
    const withFree = render(
      createElement(PostsEmptyState, {
        variant: 'tudastar',
        freeCourseHref: '/kurzusok/sos-kezrelax-villamkurzus',
      }),
    )
    expect(text(withFree)).toContain('Elindítom ingyen')
    expect(hrefs(withFree)).toContain('/kurzusok/sos-kezrelax-villamkurzus')
  })
})

describe('Tudástár üres állapota — csak a szűrt téma üres', () => {
  const html = render(createElement(PostsEmptyState, { variant: 'kategoria' }))

  it('a szűrt nézetre szabott mondatot mondja (nem a hub magyarázatát)', () => {
    const content = text(html)
    expect(content).toContain('Ebben a témában még nincs cikk')
    expect(content).not.toContain('Hamarosan érkeznek az első cikkek')
  })

  it('visszavisz a teljes Tudástárba (mintázatos „Vissza a <hova>" felirat)', () => {
    expect(text(html)).toContain('Vissza a Tudástárba')
    expect(hrefs(html)).toContain('/blog')
  })

  it('a szűrt nézetben sincs ingyenes-ígéret, de a kurzusút megmarad', () => {
    expect(text(html)).not.toContain('Elindítom ingyen')
    expect(hrefs(html)).toContain('/kurzusok')
  })
})

describe('ingyenes kurzus feloldása (hamis ígéret ellen)', () => {
  it('csak a TUDATOSAN ingyenes termék számít ingyenesnek', () => {
    expect(
      freeCourseHref([{ id: 2, slug: 'sos-kezrelax', priceInHUF: null, priceInHUFEnabled: false }]),
    ).toBe('/kurzusok/sos-kezrelax')
  })

  it('a konfigurációs hiba (ár-pipa BE, ár ÜRES) NEM ingyenes', () => {
    // Ez az élesben mért állapot volt (IA-audit T1/3. pont): erre „Elindítom
    // ingyen" feliratot tenni hazugság lenne.
    expect(
      freeCourseHref([{ id: 2, slug: 'sos-kezrelax', priceInHUF: null, priceInHUFEnabled: true }]),
    ).toBeNull()
  })

  it('fizetős kurzus nem ad ingyenes utat', () => {
    expect(
      freeCourseHref([{ id: 1, slug: 'otthoni', priceInHUF: 79500, priceInHUFEnabled: true }]),
    ).toBeNull()
  })
})

describe('üres-állapot stíluslap — mérhető korlátok', () => {
  const forras = readFileSync(
    fileURLToPath(new URL('../app/(frontend)/styles/blocks/empty-state.css', import.meta.url)),
    'utf8',
  )
  // A kommentekben szabad deklarációkról BESZÉLNI (a fájl indoklásai
  // hivatkoznak rájuk); a szabályokat a kód betűjén mérjük.
  const css = forras.replace(/\/\*[\s\S]*?\*\//g, '')

  it('nem vezet be új betűméretet (a tipográfiai skála zárt)', () => {
    expect(css).not.toMatch(/[^-]font-size:/)
  })

  it('a szövegmérték a 45–85 karakteres sávon belül marad (--kc-measure)', () => {
    // 34rem = 544px ≈ 75 karakter (tokens.css mérés-jegyzőkönyv).
    expect(css).toContain('max-width: var(--kc-measure)')
  })

  it('a gombsor tördel — 320px-en nincs vízszintes görgetés (WCAG 1.4.10)', () => {
    expect(css).toMatch(/\.kc-empty-panel__actions\s*\{[^}]*flex-wrap:\s*wrap/s)
  })

  it('a panelnek nincs fix szélessége (csak `width: 100%` + max-width)', () => {
    // A `max-width`/`min-width` deklarációk kizárva: azok nem rögzítenek méretet.
    const bareWidths = [...css.matchAll(/(?:^|[^-\w])width:\s*([^;]+);/g)].map((match) =>
      match[1]!.trim(),
    )
    expect(bareWidths).toEqual(['100%'])
  })
})
