import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RichText } from '../components/lexical/RichText'
import { JOGI_OLDALAK, jogiOldalTartalom } from '../lib/legal-content'
import { betuMetrika, szoSzelessegPx, type BetuMetrika } from './helpers/font-metrics'
import {
  elsoHossz,
  hosszPx,
  oroklottErtek,
  sajatErtek,
  sajatErtekTobbNeven,
  stilusLap,
  stilusLapNezetablakra,
  szabalyok,
  tokenek,
  varFeloldas,
  type Elem,
} from './helpers/css-geometria'

/**
 * ŐR — WCAG 2.2, 1.4.10 REFLOW (AA) ÉS A SORHOSSZ, MÉRVE.
 *
 * ═══ MIÉRT SZÜLETETT ═══
 * A `vizualis-regresszio-orok.test.ts` korábbi „1.4.10 Reflow" blokkja azt
 * nézte, hogy a `.kc-richtext blockquote` szabályban SZEREPEL-E az
 * `overflow-wrap` szó. Ez tulajdonság-ellenőrzés, nem mérés — és pontosan úgy
 * bukott el, ahogy az ilyen őrök szoktak: a szabály a bekezdéseken ott volt,
 * a CÍMSOROKON nem, az őr mégis zöld maradt egy bizonyítottan túlcsorduló
 * lapon. Mérve (Chromium 141, headless, `/aszf` a repó saját CSS-ével):
 * 320 px-es nézetablakban a dokumentum 348 px széles volt, mert a
 * „Felelősségkorlátozás" h2 324 px-t kért egy 272 px-es hasábban.
 * A hiba nem visszatért, hanem ÁTKÖLTÖZÖTT `<p>`-ből `<h2>`-be.
 *
 * ═══ MIT CSINÁL EZ AZ ŐR ═══
 * A KIMENETET méri, nem a forrásszöveget: a valódi lap-tartalomból
 * (`src/lib/legal-source/*.txt` → Lexical → `RichText`) és a valódi CSS-ből
 * (`tokens.css`, `base.css`, `ui.css`, `content.css`) zárt alakban kiszámolja
 *
 *   - mekkora hasáb áll rendelkezésre az egyes folyószöveg-elemeknek,
 *   - mekkora helyet kér a leghosszabb TÖRDELHETETLEN szó a saját, valódi
 *     betűjével (a `public/fonts/*.woff2` `hmtx`/`HVAR` tábláiból mérve),
 *   - és ebből mekkora lesz a DOKUMENTUM szélessége 320 és 390 px-en.
 *
 * Ha egy elemtípusra a CSS nem ad végszükség-tördelést (`overflow-wrap` /
 * `word-break`), a leghosszabb szó a teljes szélességét kéri — és az őr bukik.
 *
 * ═══ MIÉRT SZÁMOLÁS ÉS NEM BÖNGÉSZŐ ═══
 * A repónak nincs (és e munka keretében nem is kaphat) playwright-függősége,
 * a CI-ban pedig nincs böngésző. Egy böngészős teszt tehát vagy elbukna, vagy
 * — sokkal rosszabb — NÉMÁN KIMARADNA; épp az a hibaosztály, ami ellen ez a
 * fájl készült. A zárt alakú számítás determinisztikus, függőség nélküli, és
 * ellenőrizhető: a modellt egy TÉNYLEGES böngészős mérés hitelesíti (lásd a
 * „kalibráció" blokkot), amelynek számai forráskommentben állnak.
 *
 * ═══ MI KERÜLT BELE 2026-08-18-ÁN ═══
 * A fájl eredetileg csak a jogi lapok RICHTEXTJÉT mérte. A 4. szakasz a
 * folyószövegen KÍVÜLI címsor-osztályokra terjeszti ki (szekció-, oldal-,
 * hero-, kártya- és kosárcímek): ott az L lépcső 320 px-en 32 px, a hasáb
 * 272 px, és ebbe 16 magyar karakter fér — a CMS-ből jövő összetett szó ezt
 * rutinszerűen átlépi. A 4. szakasz a repó SAJÁT szövegkorpuszából veszi a
 * mérendő szavakat, és külön méri a legrosszabb elvi esetet is.
 *
 * ═══ PONTOSSÁG ═══
 * A szó-szélesség a glif-előretolások (advance width) összege, kerning nélkül.
 * A kerning NEGATÍV irányba visz, ezért a számolt érték FELSŐ becslés: a
 * böngészős méréshez képest 0,5–1,5%-kal szélesebb (mérve, lásd a kalibrációs
 * blokk tábláját). Az őr így a biztonságos oldalon téved — nem tud némán
 * átengedni egy valóban túlcsorduló lapot.
 *
 * ═══ FORRÁSOK ═══
 * - WCAG 2.2, 1.4.10 Reflow (AA), https://www.w3.org/TR/WCAG22/#reflow
 * - C33: Allowing for Reflow with Long URLs and Strings of Text,
 *   https://www.w3.org/WAI/WCAG22/Techniques/css/C33
 * - WCAG 2.2, 1.4.8 Visual Presentation (AAA) — 80 karakteres sorhossz-plafon,
 *   https://www.w3.org/TR/WCAG22/#visual-presentation
 * - CSS Text Module Level 3, 5.5 `overflow-wrap`,
 *   https://www.w3.org/TR/css-text-3/#overflow-wrap-property
 * - docs/ux-belso-oldalak-kutatas.md 0. és B1. fejezet (a mért betű-metrika és
 *   a mérték-token levezetése)
 */

const REPO = fileURLToPath(new URL('..', import.meta.url))
const GYOKER = fileURLToPath(new URL('../..', import.meta.url))

/** A `(frontend)` stíluslapok a `styles.css` @import-sorrendjében, geometria-relevánsan. */
const LAP = stilusLap([
  `${REPO}app/(frontend)/styles/tokens.css`,
  `${REPO}app/(frontend)/styles/base.css`,
  `${REPO}app/(frontend)/styles/ui.css`,
  `${REPO}app/(frontend)/styles/content.css`,
])
const TOKENEK = tokenek(LAP)

/** A gyökér betűmérete: a böngésző alapértelmezése, a repó nem írja felül. */
const GYOKER_BETUMERET = 16

// ---------------------------------------------------------------------------
// Betű-metrika a valódi metszetekből
// ---------------------------------------------------------------------------

const NUNITO = [
  `${GYOKER}public/fonts/nunito-sans-var-latin.woff2`,
  `${GYOKER}public/fonts/nunito-sans-var-latin-ext.woff2`,
]
const TENOR = [
  `${GYOKER}public/fonts/tenor-sans-400-latin.woff2`,
  `${GYOKER}public/fonts/tenor-sans-400-latin-ext.woff2`,
]

const metrikaGyorsitotar = new Map<string, BetuMetrika>()

/** A CSS `font-family` + `font-weight` párhoz tartozó valódi metszet metrikája. */
function metrika(csalad: string, suly: number): BetuMetrika {
  const kulcs = `${csalad}|${suly}`
  const meglevo = metrikaGyorsitotar.get(kulcs)
  if (meglevo) return meglevo
  const fajlok = csalad === 'Tenor Sans' ? TENOR : csalad === 'Nunito Sans' ? NUNITO : null
  if (fajlok === null) {
    throw new Error(
      `ismeretlen betűcsalád a folyószövegben: „${csalad}" — az őr nem tud mérni. ` +
        'Vegyél fel hozzá metszetet a public/fonts alá, és bővítsd ezt a leképezést.',
    )
  }
  const uj = betuMetrika(fajlok, suly)
  metrikaGyorsitotar.set(kulcs, uj)
  return uj
}

// ---------------------------------------------------------------------------
// A lapok tartalma → elemtípusonkénti szövegek
// ---------------------------------------------------------------------------

/** A folyószövegben mérendő blokk-elemek. */
const MERT_ELEMEK = ['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'] as const
type MertElem = (typeof MERT_ELEMEK)[number]

/**
 * Azok a címkék, amelyek megjelenhetnek a renderelt folyószövegben, de nem
 * hordoznak önálló szöveg-hasábot (szerkezet vagy soron belüli jelölés).
 * Bármi más HANGOSAN bukik: az őr nem hagyhat ki némán egy új elemtípust.
 */
const SZERKEZETI_CIMKEK = new Set([
  'div', 'section', 'article', 'ul', 'ol', 'figure', 'figcaption', 'img', 'picture',
  'a', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span', 'br', 'hr', 'code',
  'iframe', 'html', 'head', 'body', 'meta', 'title', 'style', 'h1',
])

const ENTITASOK: readonly (readonly [RegExp, string])[] = [
  [/&quot;/g, '"'],
  [/&#(?:39|x27);/g, "'"],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
]

const szoveggeAlakit = (html: string): string =>
  ENTITASOK.reduce((s, [minta, csere]) => s.replace(minta, csere), html.replace(/<[^>]*>/g, ' '))

/**
 * Egy szövegdarab leghosszabb TÖRDELHETETLEN futama.
 *
 * Csak a szóközfélék számítanak törési lehetőségnek. A `/`, a `-` és a `.`
 * után az UAX #14 szerint a böngésző IS törhet, de nem garantáltan és nem
 * minden motoron egyformán — ha ezeket törési pontnak vennénk, az őr
 * ALÁBECSÜLNÉ a kockázatot. A nem törhető szóköz (U+00A0) szándékosan NEM
 * elválasztó. Ez a pesszimista olvasat a helyes: felső becslést adunk.
 */
function leghosszabbFutam(szoveg: string, meres: (szo: string) => number): {
  readonly szo: string
  readonly szelesseg: number
} {
  let legjobb = { szo: '', szelesseg: 0 }
  for (const futam of szoveg.split(/[\t\n\r\f\v \u1680\u2000-\u200A\u2028\u2029\u205F\u3000]+/)) {
    if (futam.length === 0) continue
    const szelesseg = meres(futam)
    if (szelesseg > legjobb.szelesseg) legjobb = { szo: futam, szelesseg }
  }
  return legjobb
}

/** Egy jogi oldal renderelt HTML-je (hálózat nélkül, a repó forrásfájljaiból). */
function lapHtml(slug: string): string {
  const oldal = JOGI_OLDALAK.find((o) => o.slug === slug)
  if (!oldal) throw new Error(`nincs ilyen jogi oldal: ${slug}`)
  return renderToStaticMarkup(createElement(RichText, { content: jogiOldalTartalom(oldal) }))
}

/** Elemtípusonként a lapon előforduló szövegek. */
function elemSzovegek(html: string): ReadonlyMap<MertElem, readonly string[]> {
  const eredmeny = new Map<MertElem, string[]>()
  for (const cimke of MERT_ELEMEK) {
    const minta = new RegExp(`<${cimke}\\b[^>]*>([\\s\\S]*?)</${cimke}>`, 'g')
    const darabok: string[] = []
    let talalat: RegExpExecArray | null
    while ((talalat = minta.exec(html)) !== null) darabok.push(szoveggeAlakit(talalat[1]))
    if (darabok.length > 0) eredmeny.set(cimke, darabok)
  }
  return eredmeny
}

// ---------------------------------------------------------------------------
// Geometria: a hasáb és az elem-igény a valódi CSS-ből
// ---------------------------------------------------------------------------

const BODY: Elem = { elemnev: 'body', szulo: null, osztaly: null, ostagOsztaly: null }
const RICHTEXT: Elem = {
  elemnev: '',
  szulo: BODY,
  osztaly: '.kc-richtext',
  ostagOsztaly: null,
}
const LISTA: Elem = {
  elemnev: 'ul',
  szulo: RICHTEXT,
  osztaly: null,
  ostagOsztaly: '.kc-richtext',
}

/**
 * Egy folyószöveg-elem doboza az öröklődési láncával. A listaelem szülője a
 * `ul` (nem közvetlenül a `.kc-richtext`), különben az öröklődő tulajdonságok
 * — épp az `overflow-wrap` — rossz ágon jönnének.
 */
const elemDoboz = (cimke: string): Elem => ({
  elemnev: cimke,
  szulo: cimke === 'li' ? LISTA : RICHTEXT,
  osztaly: null,
  ostagOsztaly: '.kc-richtext',
})

/** Egy CSS-érték feloldva és pixelre váltva. */
const px = (kifejezes: string, nezetablak: number, szuloBetumeret: number): number =>
  hosszPx(varFeloldas(kifejezes, TOKENEK), nezetablak, szuloBetumeret, GYOKER_BETUMERET)

/** A `.kc-container` (szűk vagy széles) tartalom-hasábja adott nézetablakon. */
function konteneriHasab(nezetablak: number, szuk: boolean): { belso: number; margo: number } {
  const konteneri: Elem = {
    elemnev: '',
    szulo: BODY,
    osztaly: szuk ? '.kc-container--narrow' : '.kc-container',
    ostagOsztaly: null,
  }
  const margoKifejezes = sajatErtek(LAP, { ...konteneri, osztaly: '.kc-container' }, 'padding-inline')
  const maxKifejezes = sajatErtek(LAP, konteneri, 'max-width')
  if (margoKifejezes === null || maxKifejezes === null) {
    throw new Error('a .kc-container geometriája nem olvasható ki a CSS-ből')
  }
  const margo = px(margoKifejezes, nezetablak, GYOKER_BETUMERET)
  const max = px(maxKifejezes, nezetablak, GYOKER_BETUMERET)
  // box-sizing: border-box (base.css `*`), tehát a margó a szélességen BELÜL van.
  return { belso: Math.min(nezetablak, max) - 2 * margo, margo }
}

type ElemGeometria = {
  readonly hasab: number
  readonly behuzas: number
  readonly betumeret: number
  readonly csalad: string
  readonly suly: number
  readonly betuKozEm: number
  readonly torheto: boolean
}

/** Egy folyószöveg-elem érvényes geometriája a valódi CSS-ből. */
function elemGeometria(
  cimke: MertElem,
  nezetablak: number,
  konteneriBelso: number,
): ElemGeometria {
  const elem = elemDoboz(cimke)

  const betumeretKifejezes = oroklottErtek(LAP, elem, 'font-size', '1rem')
  const betumeret = px(betumeretKifejezes, nezetablak, GYOKER_BETUMERET)

  const csalad = varFeloldas(oroklottErtek(LAP, elem, 'font-family', 'sans-serif'), TOKENEK)
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')

  const sulySzoveg = varFeloldas(oroklottErtek(LAP, elem, 'font-weight', '400'), TOKENEK).trim()
  const suly = sulySzoveg === 'bold' ? 700 : sulySzoveg === 'normal' ? 400 : Number(sulySzoveg)
  if (!Number.isFinite(suly)) throw new Error(`nem értelmezhető font-weight: ${sulySzoveg}`)

  // A `letter-spacing` em-je az elem SAJÁT betűméretére vonatkozik.
  const betuKoz = px(oroklottErtek(LAP, elem, 'letter-spacing', 'normal'), nezetablak, betumeret)

  const tordeles = varFeloldas(oroklottErtek(LAP, elem, 'overflow-wrap', 'normal'), TOKENEK).trim()
  const szoTores = varFeloldas(oroklottErtek(LAP, elem, 'word-break', 'normal'), TOKENEK).trim()
  const torheto =
    tordeles === 'break-word' ||
    tordeles === 'anywhere' ||
    szoTores === 'break-all' ||
    szoTores === 'break-word'

  // A lista behúzása a SZÜLŐ `ul`/`ol` bal belső térköze.
  let behuzas = 0
  if (cimke === 'li') {
    const belsoTerkoz = sajatErtekTobbNeven(LAP, LISTA, ['padding-left', 'padding-inline-start'])
    behuzas = belsoTerkoz === null ? 0 : px(belsoTerkoz, nezetablak, betumeret)
  }

  // A mérték-korlát (`max-width`) a szülő listán is ott van, ezért az `li`-nél
  // is a korlátozott hasábból indulunk.
  const mertekElem: Elem = cimke === 'li' ? LISTA : elem
  const mertekKifejezes = sajatErtek(LAP, mertekElem, 'max-width')
  const merteket = mertekKifejezes === null ? Infinity : px(mertekKifejezes, nezetablak, betumeret)

  return {
    hasab: Math.min(konteneriBelso, merteket) - behuzas,
    behuzas,
    betumeret,
    csalad,
    suly,
    betuKozEm: betumeret === 0 ? 0 : betuKoz / betumeret,
    torheto,
  }
}

type LapMeres = {
  readonly dokumentum: number
  readonly nezetablak: number
  readonly sorok: readonly {
    readonly cimke: MertElem
    readonly szo: string
    readonly szoSzelesseg: number
    readonly hasab: number
    readonly igenyelt: number
    readonly torheto: boolean
  }[]
}

/** Egy jogi lap dokumentum-szélessége adott nézetablakon, zárt alakban. */
function lapMeres(slug: string, nezetablak: number): LapMeres {
  const html = lapHtml(slug)
  ismeretlenCimkeElleneor(html)
  const { belso, margo } = konteneriHasab(nezetablak, true)
  const szovegek = elemSzovegek(html)
  const sorok: LapMeres['sorok'] = [...szovegek].map(([cimke, darabok]) => {
    const g = elemGeometria(cimke, nezetablak, belso)
    const m = metrika(g.csalad, g.suly)
    const meres = (szo: string) => szoSzelessegPx(m, szo, g.betumeret, g.betuKozEm)
    let legjobb = { szo: '', szelesseg: 0 }
    for (const darab of darabok) {
      const jelolt = leghosszabbFutam(darab, meres)
      if (jelolt.szelesseg > legjobb.szelesseg) legjobb = jelolt
    }
    // A `break-word` a saját sorában sem férő szót TÖRI, tehát az elem legfeljebb
    // a hasábját kéri; tördelés nélkül a teljes szó szélességét.
    const igenyelt = g.behuzas + (g.torheto ? Math.min(legjobb.szelesseg, g.hasab) : legjobb.szelesseg)
    return {
      cimke,
      szo: legjobb.szo,
      szoSzelesseg: legjobb.szelesseg,
      hasab: g.hasab,
      igenyelt,
      torheto: g.torheto,
    }
  })
  const legszelesebb = Math.max(belso, ...sorok.map((s) => s.igenyelt))
  return { dokumentum: Math.max(nezetablak, margo + legszelesebb), nezetablak, sorok }
}

/** Néma kihagyás ellen: minden renderelt címke ismert legyen. */
function ismeretlenCimkeElleneor(html: string): void {
  const ismert = new Set<string>([...MERT_ELEMEK, ...SZERKEZETI_CIMKEK])
  const talaltak = new Set<string>()
  for (const talalat of html.matchAll(/<([a-z][a-z0-9]*)\b/g)) talaltak.add(talalat[1])
  const ismeretlen = [...talaltak].filter((c) => !ismert.has(c))
  expect(
    ismeretlen,
    `ismeretlen elemtípus a folyószövegben (${ismeretlen.join(', ')}): az őr nem mérné meg. ` +
      'Vedd fel a MERT_ELEMEK vagy a SZERKEZETI_CIMKEK közé.',
  ).toEqual([])
}

// ---------------------------------------------------------------------------
// 1. Reflow — 320 és 390 px
// ---------------------------------------------------------------------------

/**
 * A két kötelező nézetablak. A 320 px a WCAG 1.4.10 normatív küszöbe
 * („320 CSS pixels" — 400% nagyítás 1280 px-es kiinduláson); a 390 px a
 * legelterjedtebb mai mobil logikai szélesség (iPhone 12–16 osztály), amelyen
 * a lapot ténylegesen olvassák.
 */
const NEZETABLAKOK = [320, 390] as const

describe('WCAG 1.4.10 Reflow — a jogi lapok 320 és 390 px-en nem csordulnak túl', () => {
  for (const oldal of JOGI_OLDALAK) {
    for (const nezetablak of NEZETABLAKOK) {
      it(`/${oldal.slug} @${nezetablak}px: a dokumentum nem szélesebb a nézetablaknál`, () => {
        const meres = lapMeres(oldal.slug, nezetablak)
        const reszletek = meres.sorok
          .map(
            (s) =>
              `${s.cimke}: „${s.szo}" ${s.szoSzelesseg.toFixed(1)}px, hasáb ${s.hasab.toFixed(1)}px, ` +
              `igény ${s.igenyelt.toFixed(1)}px, tördelhető: ${s.torheto ? 'igen' : 'NEM'}`,
          )
          .join('\n  ')
        expect(
          meres.dokumentum,
          `/${oldal.slug} @${nezetablak}px vízszintesen görgethető lett ` +
            `(dokumentum ${meres.dokumentum.toFixed(1)}px).\n  ${reszletek}`,
        ).toBeLessThanOrEqual(nezetablak)
      })
    }
  }

  it('minden folyószöveg-elemtípus kap végszükség-tördelést (C33)', () => {
    // Nem a fájlban keresett szöveg, hanem a KASZKÁDBÓL feloldott érvényes
    // érték — így az öröklődés (a `.kc-richtext` gyökerére írt szabály) is
    // számít, és egy elemtípus sem maradhat ki csendben.
    const { belso } = konteneriHasab(320, true)
    const nemTorheto = MERT_ELEMEK.filter(
      (cimke) => !elemGeometria(cimke, 320, belso).torheto,
    )
    expect(
      nemTorheto,
      `ezek a folyószöveg-elemek nem törik a túl hosszú szót: ${nemTorheto.join(', ')} — ` +
        'WCAG 2.2, 1.4.10 Reflow, C33 technika.',
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 2. Kalibráció — a modellt böngészős mérés hitelesíti
// ---------------------------------------------------------------------------

describe('kalibráció — a számolt geometria a böngészős méréshez van hitelesítve', () => {
  /**
   * MÉRÉS: Chromium 141 (headless, `--hide-scrollbars`), a repó saját CSS-e és
   * a `src/lib/legal-source/aszf.txt` tartalma, 2026-08-17. A lapot a
   * `Emulation.setDeviceMetricsOverride` állította 320, illetve 390 px-re,
   * az értékek a `getComputedStyle` és a `clientWidth` kimenetei.
   *
   * | nézetablak | elem | mért hasáb | mért betűméret | mért betűköz |
   * |---|---|---|---|---|
   * | 320 | p  | 272 px | 16 px    | 0 px      |
   * | 320 | h2 | 272 px | 32 px    | 0,32 px   |
   * | 320 | h3 | 272 px | 16 px    | 0,16 px   |
   * | 320 | li | 240 px | 16 px    | 0 px      |
   * | 390 | p  | 342 px | 16,06 px | 0 px      |
   * | 390 | h2 | 342 px | 32,55 px | 0,3255 px |
   *
   * Ha ez a blokk elbukik, a modell és a valóság elvált egymástól: ELŐBB
   * mérj újra böngészővel, és csak utána írd át a számokat.
   */
  const VART: readonly {
    nezetablak: number
    cimke: MertElem
    hasab: number
    betumeret: number
    betuKoz: number
  }[] = [
    { nezetablak: 320, cimke: 'p', hasab: 272, betumeret: 16, betuKoz: 0 },
    { nezetablak: 320, cimke: 'h2', hasab: 272, betumeret: 32, betuKoz: 0.32 },
    { nezetablak: 320, cimke: 'h3', hasab: 272, betumeret: 16, betuKoz: 0.16 },
    { nezetablak: 320, cimke: 'li', hasab: 240, betumeret: 16, betuKoz: 0 },
    { nezetablak: 390, cimke: 'p', hasab: 342, betumeret: 16.06, betuKoz: 0 },
    { nezetablak: 390, cimke: 'h2', hasab: 342, betumeret: 32.55, betuKoz: 0.3255 },
  ]

  it.each(VART)(
    '@$nezetablak px, $cimke: a számolt hasáb és betűméret egyezik a mérttel',
    ({ nezetablak, cimke, hasab, betumeret, betuKoz }) => {
      const { belso } = konteneriHasab(nezetablak, true)
      const g = elemGeometria(cimke, nezetablak, belso)
      expect(g.hasab).toBeCloseTo(hasab, 1)
      expect(g.betumeret).toBeCloseTo(betumeret, 1)
      expect(g.betuKozEm * g.betumeret).toBeCloseTo(betuKoz, 2)
    },
  )

  /**
   * MÉRÉS (ugyanaz a futás): egy `<span>`-be tett szó `getBoundingClientRect`
   * szélessége, `letter-spacing: 0` mellett, a betöltött metszettel.
   *
   * | szó | betű | méret | mért | számolt | eltérés |
   * |---|---|---|---|---|---|
   * | Felelősségkorlátozás | Tenor Sans 400  | 32 px | 318,031 px | 318,016 px | −0,005 % |
   * | Felelősségkorlátozás | Nunito Sans 400 | 16 px | 150,516 px | 151,326 px | +0,54 % |
   * | Felelősségkorlátozás | Nunito Sans 700 | 16 px | 156,328 px | 157,136 px | +0,52 % |
   *
   * A maradék eltérés a KERNING (GPOS), amit a modell szándékosan nem számol:
   * negatív irányba visz, tehát a számolt szélesség felső becslés marad.
   */
  const SZO_MERES: readonly {
    szo: string
    csalad: string
    suly: number
    meret: number
    mert: number
  }[] = [
    { szo: 'Felelősségkorlátozás', csalad: 'Tenor Sans', suly: 400, meret: 32, mert: 318.031 },
    { szo: 'Felelősségkorlátozás', csalad: 'Nunito Sans', suly: 400, meret: 16, mert: 150.516 },
    { szo: 'Felelősségkorlátozás', csalad: 'Nunito Sans', suly: 700, meret: 16, mert: 156.328 },
  ]

  it.each(SZO_MERES)(
    '„$szo" $csalad $suly @$meret px: a számolt szélesség felső becslés, 2%-on belül',
    ({ szo, csalad, suly, meret, mert }) => {
      const szamolt = szoSzelessegPx(metrika(csalad, suly), szo, meret)
      expect(szamolt, 'a számolt szélesség nem lehet KISEBB a mértnél').toBeGreaterThanOrEqual(
        mert - 0.05,
      )
      expect(szamolt / mert).toBeLessThan(1.02)
    },
  )

  it('a /aszf 320 px-es dokumentum-szélessége a mért 320 px-et adja vissza', () => {
    // A javítás ELŐTT ugyanez a mérés 348 px-et adott (Chromium), a modell
    // 348,4 px-et számolt — a két szám 0,1%-on belül volt.
    expect(lapMeres('aszf', 320).dokumentum).toBeCloseTo(320, 0)
  })
})

// ---------------------------------------------------------------------------
// 3. Sorhossz — a mérték a legszélesebb konténerben is fog
// ---------------------------------------------------------------------------

describe('sorhossz — a mérték-korlát a folyószövegen, mérve', () => {
  /**
   * A `--kc-measure` azért TOKEN és nem elemre írt érték, mert a `.kc-richtext`
   * szűk (720 px) és széles (1120 px) konténerbe is kerül; a korlát nélkül a
   * széles konténerben mért sorhossz 148 karakter volt
   * (docs/ux-belso-oldalak-kutatas.md B1.1). Az őr ezért a SZÉLES konténerrel
   * számol: ott dől el, hogy a korlát valóban a szövegen van-e.
   *
   * A karakterszélesség nem becslés: a lap SAJÁT szövegének betűiből, a valódi
   * metszet előretolásaiból átlagolódik. A repó korábbi, fontTools/hmtx
   * mérése ugyanezen a betűn 0,4542 em-et adott (tokens.css „Mérték" szakasz,
   * n = 5 981 karakter) — az őr ezt is ellenőrzi, hogy a két mérés ne
   * csússzon szét.
   */
  const NEZETABLAK = 1440
  const FELSO_HATAR = 85
  const ALSO_HATAR = 45

  const atlagosKarakterEm = (): number => {
    const m = metrika('Nunito Sans', 400)
    let osszeg = 0
    let darab = 0
    for (const oldal of JOGI_OLDALAK) {
      const szovegek = elemSzovegek(lapHtml(oldal.slug))
      for (const darabok of [...(szovegek.get('p') ?? []), ...(szovegek.get('li') ?? [])]) {
        for (const karakter of darabok) {
          const e = m.eloretolas.get(karakter.codePointAt(0) ?? 0)
          if (e === undefined) continue
          osszeg += e
          darab += 1
        }
      }
    }
    expect(darab, 'nem volt mérhető szöveg a sorhossz-átlaghoz').toBeGreaterThan(5000)
    return osszeg / darab
  }

  it('a mért átlagos karakterszélesség a repó dokumentált 0,4542 em-jét adja', () => {
    expect(atlagosKarakterEm()).toBeCloseTo(0.4542, 2)
  })

  it('a bekezdés sorhossza a széles konténerben is 45–85 karakter', () => {
    const { belso } = konteneriHasab(NEZETABLAK, false)
    const g = elemGeometria('p', NEZETABLAK, belso)
    const karakterek = g.hasab / (atlagosKarakterEm() * g.betumeret)
    expect(
      karakterek,
      `a bekezdés sorhossza ${karakterek.toFixed(1)} karakter (hasáb ${g.hasab.toFixed(0)}px, ` +
        `betűméret ${g.betumeret.toFixed(1)}px) — a mérték-korlát nem fog.`,
    ).toBeLessThanOrEqual(FELSO_HATAR)
    expect(karakterek).toBeGreaterThanOrEqual(ALSO_HATAR)
  })
})

// ---------------------------------------------------------------------------
// 4. Címsorok a folyószövegen KÍVÜL — a lap-szintű tördelés, mérve
// ---------------------------------------------------------------------------

/**
 * ═══ MIÉRT KELLETT KITERJESZTENI ═══
 * A fenti blokkok a `.kc-richtext` folyószövegét mérik. A CMS-ből szerkesztett
 * SZEKCIÓ- és OLDALCÍMEK viszont a richtexten KÍVÜL állnak, és ott a kockázat
 * mérve NAGYOBB: az L lépcső 320 px-en 32 px, a hasáb 272 px, ebbe a Tenor
 * Sans 400 metszetén, 0,01em betűközzel 16 magyar karakter fér (16,90 px/
 * karakter — a `public/fonts` metszet `hmtx` táblájából mérve, a repó saját
 * szókorpuszának betűgyakoriságával). A magyar összetett szó ezt rutinszerűen
 * átlépi: a repó SAJÁT szövegében a „tárhelyszolgáltatójának"
 * (src/lib/legal-content.ts) 357 px-t kér.
 *
 * ═══ MIT MÉR EZ A BLOKK ═══
 *   - a repó SAJÁT szövegkorpuszából (nem kitalált szavakból) veszi a
 *     leghosszabb magyar szót: `src/lib/**` string-literáljai, a seedek
 *     (`src/lib/home-seed.ts`, `src/scripts/*seed*.ts`) és a
 *     `src/lib/legal-source/*.txt`;
 *   - minden érintett címsor-osztályra a VALÓDI CSS-ből oldja fel a
 *     tipográfiát (betűméret, család, súly, betűköz) és a hasábot, a
 *     `@media`-kat az adott nézetablakra kiértékelve;
 *   - és megnézi, elfér-e a szó, illetve — ha nem fér — TÖRIK-E;
 *   - külön méri a legrosszabb ELVI esetet is, mert a CMS-ből bármi jöhet.
 *
 * ═══ AMIT NEM MODELLEZ ═══
 * A rács- és flex-sávok min-content alapú automatikus minimum méretét
 * (CSS Grid 1, 6.6). Ott nem a szöveg csordul túl, hanem a SÁV nyílik szét, és
 * ezt a `break-word` szándékosan nem orvosolja (CSS Text 3, 5.5). A repóban ma
 * egyetlen ilyen hely van; a „NYITOTT kérdés" blokk nevesíti, a számok
 * böngészős mérésből valók.
 *
 * ═══ FORRÁSOK ═══
 * - WCAG 2.2, 1.4.10 Reflow (AA), https://www.w3.org/TR/WCAG22/#reflow
 * - C33 technika, https://www.w3.org/WAI/WCAG22/Techniques/css/C33
 * - CSS Text 3, 5.5 `overflow-wrap`,
 *   https://www.w3.org/TR/css-text-3/#overflow-wrap-property
 * - CSS Grid 1, 6.6 „Automatic Minimum Size of Grid Items",
 *   https://www.w3.org/TR/css-grid-1/#min-size-auto
 * - CSS Values 4, 5.1.1 `ch` egység, https://www.w3.org/TR/css-values-4/#ch
 */

/** A blokk-stíluslapok komponensenként importálódnak, nem a styles.css-ből. */
const BLOKK_MAPPA = `${REPO}app/(frontend)/styles/blocks/`

/**
 * A TELJES vevői kaszkád. A blokk-mappát KIOLVASSA, nem felsorolja: egy új
 * blokk-stíluslap így magától bekerül a mérésbe, nem marad ki csendben.
 */
const TELJES_LAP_FAJLOK: readonly string[] = [
  `${REPO}app/(frontend)/styles/tokens.css`,
  `${REPO}app/(frontend)/styles/base.css`,
  `${REPO}app/(frontend)/styles/ui.css`,
  `${REPO}app/(frontend)/styles/layout.css`,
  `${REPO}app/(frontend)/styles/content.css`,
  `${REPO}app/(frontend)/checkout.css`,
  `${REPO}app/(frontend)/player.css`,
  ...readdirSync(BLOKK_MAPPA)
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => `${BLOKK_MAPPA}${f}`),
]

const teljesLapGyorsitotar = new Map<number, ReturnType<typeof stilusLapNezetablakra>>()

/** A teljes kaszkád adott nézetablakra kiértékelt `@media`-kkal. */
function teljesLap(nezetablak: number): ReturnType<typeof stilusLapNezetablakra> {
  const meglevo = teljesLapGyorsitotar.get(nezetablak)
  if (meglevo) return meglevo
  const uj = stilusLapNezetablakra(TELJES_LAP_FAJLOK, nezetablak)
  teljesLapGyorsitotar.set(nezetablak, uj)
  return uj
}

// ---------------------------------------------------------------------------
// 4.1 Korpusz — a valóban előforduló leghosszabb magyar szavak
// ---------------------------------------------------------------------------

const MAGYAR_BETU = 'A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű'
const MAGYAR_SZO = new RegExp(`[${MAGYAR_BETU}]{8,}`, 'g')

/** Kódazonosító (camelCase) és ékezet nélküli — tehát nem magyar — szó kizárása. */
const kodAzonosito = (szo: string): boolean =>
  /[a-záéíóöőúüű][A-ZÁÉÍÓÖŐÚÜŰ]/.test(szo) || !/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(szo)

function fajlokRekurzivan(dir: string, szuro: (p: string) => boolean, ki: string[] = []): string[] {
  for (const be of readdirSync(dir)) {
    const p = join(dir, be)
    if (statSync(p).isDirectory()) fajlokRekurzivan(p, szuro, ki)
    else if (szuro(p)) ki.push(p)
  }
  return ki
}

/** String-literálok egy TS-forrásból — a kód azonosítói így kimaradnak. */
function stringLiteralok(forras: string): string[] {
  const ki: string[] = []
  for (const t of forras.matchAll(/'([^'\\\n]{4,})'|"([^"\\\n]{4,})"|`([^`\\]{4,})`/g)) {
    ki.push(t[1] ?? t[2] ?? t[3] ?? '')
  }
  return ki
}

type KorpuszSzo = { readonly szo: string; readonly hol: string }

/**
 * A vevőnek MEGJELENŐ magyar szövegek szavai a repó saját forrásaiból.
 * Nem kitalált szavak: ami itt van, azt a seed vagy a szolgáltatás tényleg
 * kiírja — és ugyanebből a szókincsből gépel a szerkesztő is a CMS-be.
 */
function korpusz(): readonly KorpuszSzo[] {
  const honnan = new Map<string, string>()
  const felvesz = (szoveg: string, hol: string): void => {
    for (const t of szoveg.matchAll(MAGYAR_SZO)) {
      const szo = t[0]
      if (kodAzonosito(szo)) continue
      if (!honnan.has(szo)) honnan.set(szo, hol)
    }
  }
  const tsFajlok = [
    ...fajlokRekurzivan(`${REPO}lib`, (p) => p.endsWith('.ts')),
    ...fajlokRekurzivan(`${REPO}scripts`, (p) => p.endsWith('.ts') && /seed/.test(p)),
  ]
  for (const fajl of tsFajlok) {
    const rovid = fajl.slice(GYOKER.length)
    for (const l of stringLiteralok(readFileSync(fajl, 'utf8'))) felvesz(l, rovid)
  }
  for (const fajl of fajlokRekurzivan(`${REPO}lib/legal-source`, (p) => p.endsWith('.txt'))) {
    felvesz(readFileSync(fajl, 'utf8'), fajl.slice(GYOKER.length))
  }
  return [...honnan].map(([szo, hol]) => ({ szo, hol }))
}

const KORPUSZ = korpusz()

/**
 * A legrosszabb ELVI eset. A címeket szerkesztő írja, tehát a mérték nem a mai
 * leghosszabb szó lehet: ez egy szabályos, de a szótári alakoknál hosszabb
 * magyar összetétel. Ha erre is fér a lap, a CMS nem tudja eltörni.
 */
const ELVI_SZO = 'kézrehabilitációsprogramunkkalfoglalkozásvezetőknek'

// ---------------------------------------------------------------------------
// 4.2 A címsor-osztályok geometriája a valódi CSS-ből
// ---------------------------------------------------------------------------

type Konteneri = 'szuk' | 'szeles' | 'teljes'

type CimsorOsztaly = {
  /** Az osztály, ahogy a CSS-ben áll. */
  readonly osztaly: string
  /** Az elemnév, ahogy a markup használja (a base.css h1–h6 szabályai miatt kell). */
  readonly elemnev: string
  /** A leszármazott-szelektor előtagja, ha a CSS így címzi (pl. `.kc-product-card`). */
  readonly ostag: string | null
  /** Melyik konténerben áll. */
  readonly konteneri: Konteneri
  /** A hasábot szűkítő belső térközök: szelektor + tulajdonság, a CSS-ből olvasva. */
  readonly beljebb: readonly { readonly osztaly: string; readonly tulajdonsag: string }[]
  /** MÉRT (Chromium 141, headless) doboz-szélesség 320, illetve 390 px-en. */
  readonly mert: readonly [number, number]
  /** Egy sorba vágott, ellipszissel csonkolt címsor — nem tud túlcsordulni. */
  readonly csonkolt?: true
  /** A doboza rács-sávból nyílik szét: a modell ezt nem látja (lásd 4.5). */
  readonly racsSzivargas?: true
}

/**
 * A vevői felület címsor-osztályai a folyószövegen kívül. A lista a
 * 2026-08-18-i felmérésé: ezek azok, amelyeknek NEM volt saját
 * végszükség-tördelésük (a `welcome.css`, `services.css`, `team-members.css`,
 * `accordion.css` és `course-cards.css` osztályainak van).
 *
 * A `mert` oszlop nem elvárás, hanem HITELESÍTÉS: a böngésző ezt a
 * doboz-szélességet adta ugyanezen a markupon (a mérés paraméterei a 4.6
 * kalibrációs blokkban). Ha a modell elválik tőle, a kalibráció bukik.
 */
const CIMSOR_OSZTALYOK: readonly CimsorOsztaly[] = [
  {
    osztaly: '.kc-page-hero__title',
    elemnev: 'h1',
    ostag: null,
    konteneri: 'szuk',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-section-title',
    elemnev: 'h2',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-hero__title',
    elemnev: 'h1',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [356.969, 363.063],
    racsSzivargas: true,
  },
  {
    osztaly: '.kc-cta-banner__title',
    elemnev: 'h2',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-faq__title',
    elemnev: 'h2',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-about__title',
    elemnev: 'h2',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-states__title',
    elemnev: 'h2',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-usps__title',
    elemnev: 'h2',
    ostag: null,
    konteneri: 'szeles',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-error-page__title',
    elemnev: 'h1',
    ostag: null,
    konteneri: 'szuk',
    beljebb: [],
    mert: [272, 342],
  },
  {
    // A kosártétel címe LINK (soron belüli elem): a doboza a SZÖVEGÉHEZ
    // igazodik, ezért a hasábját a testvér `.kc-cart__description` mutatja.
    osztaly: '.kc-cart__title',
    elemnev: 'a',
    ostag: null,
    konteneri: 'szuk',
    beljebb: [],
    mert: [272, 342],
  },
  {
    osztaly: '.kc-product-card__title',
    elemnev: 'h3',
    ostag: '.kc-product-card',
    konteneri: 'szeles',
    beljebb: [
      { osztaly: '.kc-product-card__body', tulajdonsag: 'padding' },
      { osztaly: '.kc-card', tulajdonsag: 'border' },
    ],
    mert: [222, 292],
  },
  {
    osztaly: '.kc-post-card__title',
    elemnev: 'h3',
    ostag: '.kc-post-card',
    konteneri: 'szeles',
    beljebb: [
      { osztaly: '.kc-post-card__body', tulajdonsag: 'padding' },
      { osztaly: '.kc-card', tulajdonsag: 'border' },
    ],
    mert: [222, 292],
  },
  {
    osztaly: '.kc-player__course-title',
    elemnev: 'h1',
    ostag: null,
    konteneri: 'teljes',
    beljebb: [],
    mert: [320, 390],
    csonkolt: true,
  },
]

const CIMSOR_BODY: Elem = { elemnev: 'body', szulo: null, osztaly: null, ostagOsztaly: null }

/** Egy címsor-osztály eleme az öröklődési láncával. */
const cimsorElem = (c: CimsorOsztaly): Elem => ({
  elemnev: c.elemnev,
  szulo: CIMSOR_BODY,
  osztaly: c.osztaly,
  ostagOsztaly: c.ostag,
})

/** A `ch` egység alapja: a „0" glif előretolása a saját betűn, pixelben. */
function chPx(m: BetuMetrika, betumeretPx: number): number {
  const nulla = m.eloretolas.get(0x30)
  if (nulla === undefined) throw new Error('a metszetből hiányzik a „0" — a ch nem oldható fel')
  return nulla * betumeretPx
}

type CimsorGeometria = {
  readonly hasab: number
  readonly betumeret: number
  readonly csalad: string
  readonly suly: number
  readonly betuKozEm: number
  readonly torheto: boolean
}

/** Egy címsor-osztály érvényes geometriája a valódi CSS-ből. */
function cimsorGeometria(c: CimsorOsztaly, nezetablak: number): CimsorGeometria {
  const lap = teljesLap(nezetablak)
  const elem = cimsorElem(c)
  const ertek = (tulajdonsag: string, kezdo: string): string =>
    varFeloldas(oroklottErtek(lap, elem, tulajdonsag, kezdo), TOKENEK).trim()

  const betumeret = hosszPx(
    ertek('font-size', '1rem'),
    nezetablak,
    GYOKER_BETUMERET,
    GYOKER_BETUMERET,
  )
  const csalad = ertek('font-family', 'sans-serif')
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
  const sulySzoveg = ertek('font-weight', '400')
  const suly = sulySzoveg === 'bold' ? 700 : sulySzoveg === 'normal' ? 400 : Number(sulySzoveg)
  if (!Number.isFinite(suly)) throw new Error(`nem értelmezhető font-weight: ${sulySzoveg}`)

  const ch = chPx(metrika(csalad, suly), betumeret)
  const betuKoz = hosszPx(
    ertek('letter-spacing', 'normal'),
    nezetablak,
    betumeret,
    GYOKER_BETUMERET,
    ch,
  )

  const tordeles = ertek('overflow-wrap', 'normal')
  const szoTores = ertek('word-break', 'normal')
  const feherKoz = ertek('white-space', 'normal')
  const torheto =
    feherKoz !== 'nowrap' &&
    feherKoz !== 'pre' &&
    (tordeles === 'break-word' ||
      tordeles === 'anywhere' ||
      szoTores === 'break-all' ||
      szoTores === 'break-word')

  const konteneriBelso =
    c.konteneri === 'teljes' ? nezetablak : konteneriHasab(nezetablak, c.konteneri === 'szuk').belso

  let beljebb = 0
  for (const b of c.beljebb) {
    const burkolo: Elem = { elemnev: '', szulo: null, osztaly: b.osztaly, ostagOsztaly: null }
    const nyers = sajatErtek(lap, burkolo, b.tulajdonsag)
    if (nyers === null) {
      throw new Error(`nincs ${b.tulajdonsag} a(z) ${b.osztaly} szabályban — a hasáb nem mérhető`)
    }
    const hossz = elsoHossz(varFeloldas(nyers, TOKENEK))
    if (hossz === null) throw new Error(`nem hossz: ${b.osztaly} { ${b.tulajdonsag}: ${nyers} }`)
    // Kétoldalt: bal + jobb belső térköz, illetve bal + jobb keret.
    beljebb += 2 * hosszPx(hossz, nezetablak, betumeret, GYOKER_BETUMERET, ch)
  }

  const mertekKifejezes = sajatErtek(lap, elem, 'max-width')
  const merteket =
    mertekKifejezes === null
      ? Infinity
      : hosszPx(varFeloldas(mertekKifejezes, TOKENEK), nezetablak, betumeret, GYOKER_BETUMERET, ch)

  return {
    hasab: Math.min(konteneriBelso - beljebb, merteket),
    betumeret,
    csalad,
    suly,
    betuKozEm: betumeret === 0 ? 0 : betuKoz / betumeret,
    torheto,
  }
}

/** A korpusz leghosszabb szava adott tipográfián. */
function legszelesebbKorpuszSzo(g: CimsorGeometria): {
  readonly szo: string
  readonly hol: string
  readonly szelesseg: number
} {
  const m = metrika(g.csalad, g.suly)
  let legjobb = { szo: '', hol: '', szelesseg: 0 }
  for (const k of KORPUSZ) {
    let szelesseg: number
    try {
      szelesseg = szoSzelessegPx(m, k.szo, g.betumeret, g.betuKozEm)
    } catch {
      // A metszetből hiányzó karakter (nem magyar szöveg) — nem mérhető, kihagyjuk.
      continue
    }
    if (szelesseg > legjobb.szelesseg) legjobb = { szo: k.szo, hol: k.hol, szelesseg }
  }
  return legjobb
}

/** Az elem tényleges helyigénye: tördeléssel legfeljebb a hasáb. */
const igenyeltPx = (c: CimsorOsztaly, g: CimsorGeometria, szoSzelesseg: number): number =>
  c.csonkolt === true || g.torheto ? Math.min(szoSzelesseg, g.hasab) : szoSzelesseg

// ---------------------------------------------------------------------------
// 4.3 A mérés
// ---------------------------------------------------------------------------

describe('WCAG 1.4.10 Reflow — a CÍMSOR-osztályok 320 és 390 px-en', () => {
  it('a korpusz a repó saját szövegeiből áll, és van benne mérhető magyar szó', () => {
    expect(
      KORPUSZ.length,
      'kiürült a szókorpusz — a szövegforrások elmozdultak, az őr vakon mérne',
    ).toBeGreaterThan(1000)
    const g = cimsorGeometria(CIMSOR_OSZTALYOK[1], 320)
    const legjobb = legszelesebbKorpuszSzo(g)
    expect(legjobb.szelesseg, 'nem volt mérhető szó a korpuszban').toBeGreaterThan(0)
  })

  for (const c of CIMSOR_OSZTALYOK) {
    for (const nezetablak of NEZETABLAKOK) {
      it(`${c.osztaly} @${nezetablak}px: a leghosszabb VALÓDI magyar szó nem csordul túl`, () => {
        const g = cimsorGeometria(c, nezetablak)
        const legjobb = legszelesebbKorpuszSzo(g)
        expect(
          igenyeltPx(c, g, legjobb.szelesseg),
          `${c.osztaly} @${nezetablak}px: a „${legjobb.szo}" (${legjobb.hol}) ` +
            `${legjobb.szelesseg.toFixed(1)}px-t kér a ${g.hasab.toFixed(1)}px-es hasábban, ` +
            `és az elem NEM töri (${g.betumeret.toFixed(2)}px ${g.csalad} ${g.suly}, ` +
            `betűköz ${(g.betuKozEm * g.betumeret).toFixed(3)}px). ` +
            'WCAG 2.2, 1.4.10 Reflow — C33: végszükség-tördelés kell.',
        ).toBeLessThanOrEqual(g.hasab)
      })

      it(`${c.osztaly} @${nezetablak}px: a legrosszabb ELVI (CMS-ből jövő) szó sem csordul túl`, () => {
        const g = cimsorGeometria(c, nezetablak)
        const szelesseg = szoSzelessegPx(
          metrika(g.csalad, g.suly),
          ELVI_SZO,
          g.betumeret,
          g.betuKozEm,
        )
        expect(
          igenyeltPx(c, g, szelesseg),
          `${c.osztaly} @${nezetablak}px: egy CMS-ből jövő, ${[...ELVI_SZO].length} betűs szó ` +
            `${szelesseg.toFixed(1)}px-t kér a ${g.hasab.toFixed(1)}px-es hasábban, és az elem ` +
            'NEM töri. Ezeket a címeket szerkesztő írja: kódbeli védelem nélkül bármikor ' +
            'eltörhetik a lapot mobilon.',
        ).toBeLessThanOrEqual(g.hasab)
      })
    }
  }

  it('320 px-en 20-nál kevesebb magyar karakter fér az L lépcsős címsorba (mérve)', () => {
    const g = cimsorGeometria(CIMSOR_OSZTALYOK[1], 320)
    const m = metrika(g.csalad, g.suly)
    let osszeg = 0
    let darab = 0
    for (const k of KORPUSZ) {
      for (const karakter of k.szo) {
        const e = m.eloretolas.get(karakter.codePointAt(0) ?? 0)
        if (e === undefined) continue
        osszeg += e + g.betuKozEm
        darab += 1
      }
    }
    const karakterPx = (osszeg / darab) * g.betumeret
    expect(g.betumeret).toBeCloseTo(32, 2)
    expect(g.hasab).toBeCloseTo(272, 1)
    // 2026-08-18-i mérés: 16,90 px/karakter → 16 karakter fér a 272 px-es
    // hasábba. A sáv azért tág, mert a betűgyakoriság a korpusszal együtt
    // lassan mozog; a lényeg, hogy egy magyar összetett szó NE férjen be.
    expect(karakterPx).toBeGreaterThan(15)
    expect(karakterPx).toBeLessThan(19)
    expect(Math.floor(g.hasab / karakterPx)).toBeLessThan(20)
  })
})

// ---------------------------------------------------------------------------
// 4.4 Elavulás ellen: a szabály a lap GYÖKERÉN áll, és senki nem vonja vissza
// ---------------------------------------------------------------------------

/**
 * A címsor-osztályok FELSOROLÁSA elavul — ma 30-nál több szelektor viszi az L
 * lépcsőt, és holnap lesz egy újabb. Ez a blokk ezért nem listát ellenőriz,
 * hanem a KASZKÁDOT: a tördelés a gyökéren áll, és egyetlen L lépcsős szabály
 * sem vonja vissza. Így egy új szekció-címsor nem maradhat ki csendben.
 */
describe('elavulás ellen — a végszükség-tördelés a lap gyökerén áll', () => {
  const NEM_TOREDO = new Set(['normal', 'initial', 'revert', 'unset'])

  it('a lap gyökere (body) végszükség-tördelést ad, öröklődve', () => {
    const akarmi: Elem = { elemnev: 'div', szulo: CIMSOR_BODY, osztaly: null, ostagOsztaly: null }
    const tordeles = varFeloldas(
      oroklottErtek(teljesLap(320), akarmi, 'overflow-wrap', 'normal'),
      TOKENEK,
    ).trim()
    expect(
      tordeles,
      'a lapon nincs gyökér-szintű végszükség-tördelés: minden osztálynak külön kellene ' +
        'kérnie, és az első CMS-ből jövő hosszú szó eltöri a lapot 320 px-en ' +
        '(WCAG 2.2, 1.4.10 Reflow, C33 technika).',
    ).toBe('break-word')
  })

  it('egyetlen L lépcsős szabály sem VONJA VISSZA a lap-szintű tördelést', () => {
    const visszavonok: string[] = []
    const fajlok = [
      ...fajlokRekurzivan(`${REPO}app/(frontend)`, (p) => p.endsWith('.css')),
      ...fajlokRekurzivan(`${REPO}components`, (p) => p.endsWith('.css')),
    ]
    for (const fajl of fajlok) {
      for (const szabaly of szabalyok(readFileSync(fajl, 'utf8'))) {
        if (szabaly.deklaraciok.get('font-size') !== 'var(--kc-font-l)') continue
        const hol = `${fajl.slice(GYOKER.length)}: ${szabaly.szelektorok.join(', ')}`
        const tordeles = szabaly.deklaraciok.get('overflow-wrap')
        if (tordeles !== undefined && NEM_TOREDO.has(tordeles)) {
          visszavonok.push(`${hol} — overflow-wrap: ${tordeles}`)
        }
        // A `nowrap` csak akkor rendben, ha a doboz VÁG (ellipszis + hidden).
        if (szabaly.deklaraciok.get('white-space') === 'nowrap') {
          const vag =
            szabaly.deklaraciok.get('overflow') === 'hidden' &&
            szabaly.deklaraciok.get('text-overflow') === 'ellipsis'
          if (!vag) visszavonok.push(`${hol} — white-space: nowrap, vágás nélkül`)
        }
      }
    }
    expect(
      visszavonok,
      'ezek az L lépcsős szabályok kikapcsolják a tördelést, vágás nélkül:\n  ' +
        visszavonok.join('\n  '),
    ).toEqual([])
  })

  it('minden mért címsor-osztály törik (vagy dokumentáltan vág)', () => {
    const nemTorheto = CIMSOR_OSZTALYOK.filter(
      (c) => c.csonkolt !== true && !cimsorGeometria(c, 320).torheto,
    ).map((c) => c.osztaly)
    expect(
      nemTorheto,
      `ezek a címsorok nem törik a túl hosszú szót: ${nemTorheto.join(', ')} — ` +
        'WCAG 2.2, 1.4.10 Reflow, C33 technika.',
    ).toEqual([])
  })

  it('a csonkolt címsor tényleg VÁG (nowrap + hidden + ellipszis + 0 minimum)', () => {
    const lap = teljesLap(320)
    for (const c of CIMSOR_OSZTALYOK.filter((x) => x.csonkolt === true)) {
      const elem = cimsorElem(c)
      expect(sajatErtek(lap, elem, 'white-space'), c.osztaly).toBe('nowrap')
      expect(sajatErtek(lap, elem, 'overflow'), c.osztaly).toBe('hidden')
      expect(sajatErtek(lap, elem, 'text-overflow'), c.osztaly).toBe('ellipsis')
      // Flex-elemként a saját sávját is el kell tudnia engedni, különben nem a
      // szöveg vágódik, hanem a SÁV nyílik szét (CSS Grid 1, 6.6).
      expect(
        sajatErtekTobbNeven(lap, elem, ['min-width', 'min-inline-size']),
        `${c.osztaly}: a csonkolás csak akkor fog, ha a flex-elem minimuma 0`,
      ).toBe('0')
    }
  })
})

// ---------------------------------------------------------------------------
// 4.5 NYITOTT kérdés — a rács-sáv szétnyílása
// ---------------------------------------------------------------------------

/**
 * MÉRVE (Chromium 141, headless, `--hide-scrollbars`, 320 px, a repó saját
 * CSS-ével és a `HomeView` hero-markupjával, a „tárhelyszolgáltatójának"
 * szóval, 2026-08-18):
 *
 * | változat | `.kc-hero__title` doboza | dokumentum |
 * |---|---|---|
 * | mai CSS                                | 356,97 px | 381 px |
 * | `body { overflow-wrap: break-word }`   | 356,97 px | 381 px |
 * | + `.kc-hero__content { min-width: 0 }` | 272 px    | 320 px |
 *
 * MIÉRT. A `.kc-hero__grid` 900 px alatt EGY automatikus rács-sáv, a sáv alsó
 * mérete pedig a rács-elem AUTOMATIKUS MINIMUM MÉRETE (CSS Grid 1, 6.6) —
 * vagyis a tartalom min-content szélessége. A `break-word` a min-content
 * méretet SZÁNDÉKOSAN nem csökkenti (CSS Text 3, 5.5), ezért nem a szöveg
 * csordul ki a dobozból: maga a DOBOZ lesz szélesebb a konténernél. Ezt a
 * számoló modell nem látja, ezért áll itt böngészős mérésként.
 *
 * A javítás egysoros és mérve hatásos (`min-width: 0` a rács-elemen), de a
 * `content.css`-be tartozik, amit ez a kör nem szerkeszthetett — a tulajdonos
 * döntésére vár. Amíg a szabály nincs ott, ez a blokk NEVESÍTVE tartja a
 * kivételt; ha valaki beteszi, a teszt megszólal, és akkor ezt a blokkot és a
 * `racsSzivargas` jelölőt törölni kell.
 */
describe('NYITOTT — a hero rács-sávja szétnyílik (a vezető döntésére vár)', () => {
  const RACS = '.kc-hero__grid'
  const RACS_ELEM = '.kc-hero__content'

  it('pontosan EGY címsor-osztály van a rács-szivárgás kivétellistáján', () => {
    const kivetelek = CIMSOR_OSZTALYOK.filter((c) => c.racsSzivargas === true).map((c) => c.osztaly)
    expect(
      kivetelek,
      'a lista csak csökkenhet: új sor csak akkor kerülhet ide, ha a vezető jóváhagyta.',
    ).toEqual(['.kc-hero__title'])
  })

  it('a hero rács-eleme MA nem engedi el a saját sávját (a kivétel él)', () => {
    const elem: Elem = { elemnev: '', szulo: null, osztaly: RACS_ELEM, ostagOsztaly: null }
    expect(
      sajatErtekTobbNeven(teljesLap(320), elem, ['min-width', 'min-inline-size']),
      `JÓ HÍR, ha ez bukik: valaki betette a ${RACS_ELEM} { min-width: 0 } szabályt. ` +
        'Ekkor töröld ezt a describe-blokkot és a .kc-hero__title racsSzivargas jelölőjét — ' +
        'a lap-szintű tördelés innentől ott is fog.',
    ).toBeNull()
  })

  it('a hero rácsa auto sávot használ (ezért szivárog a min-content)', () => {
    const racs: Elem = { elemnev: '', szulo: null, osztaly: RACS, ostagOsztaly: null }
    const lap = teljesLap(320)
    expect(sajatErtek(lap, racs, 'display')).toBe('grid')
    const savok = sajatErtek(lap, racs, 'grid-template-columns')
    expect(
      savok === null || !savok.includes('minmax(0'),
      'ha a hero rácsa `minmax(0, …)` sávot kapott, a szivárgás megszűnt — töröld a kivételt.',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4.6 Kalibráció — a címsor-modellt is böngészős mérés hitelesíti
// ---------------------------------------------------------------------------

describe('kalibráció — a címsor-hasábok egyeznek a böngészős méréssel', () => {
  /**
   * MÉRÉS: Chromium 141 (headless, `--hide-scrollbars`), a repó saját CSS-e
   * (styles.css + a blokk-lapok) és a valódi burkoló-markup, 2026-08-18. A
   * lapot az `Emulation.setDeviceMetricsOverride` állította 320, illetve
   * 390 px-re; az értékek a `getBoundingClientRect().width` kimenetei.
   *
   * Az egyetlen eltérő sor a `.kc-hero__title`: ott a böngésző a rács-sávból
   * kinyílt, 356,97 px-es dobozt mérte, a modell a konténer 272 px-ét adja —
   * a különbség PONTOSAN a 4.5 blokkban leírt min-content szivárgás.
   */
  for (const c of CIMSOR_OSZTALYOK) {
    for (const [i, nezetablak] of NEZETABLAKOK.entries()) {
      it(`${c.osztaly} @${nezetablak}px: a számolt hasáb a mért dobozt adja`, () => {
        const g = cimsorGeometria(c, nezetablak)
        if (c.racsSzivargas === true) {
          // A modell a konténer-hasábot adja; a mért doboz ennél SZÉLESEBB.
          expect(g.hasab).toBeLessThan(c.mert[i])
          expect(g.hasab).toBeCloseTo(nezetablak === 320 ? 272 : 342, 1)
          return
        }
        expect(g.hasab).toBeCloseTo(c.mert[i], 1)
      })
    }
  }

  /**
   * MÉRÉS (ugyanaz a futás): a „tárhelyszolgáltatójának" szó a
   * `.kc-section-title`-ben, 320 px-es nézetablakban.
   *
   * | állapot | doboz | tartalom (scrollWidth) | dokumentum |
   * |---|---|---|---|
   * | mai CSS | 272 px | 357 px | 381 px |
   * | javítás után | 272 px | 272 px | 320 px |
   *
   * A modell ugyanerre a szóra 357,0 px-et számol — a kerninget elhagyva,
   * tehát felső becslésként.
   */
  it('„tárhelyszolgáltatójának" a szekció-címsorban: a számolt 357 px a mérttel egyezik', () => {
    const g = cimsorGeometria(CIMSOR_OSZTALYOK[1], 320)
    const szamolt = szoSzelessegPx(metrika(g.csalad, g.suly), 'tárhelyszolgáltatójának', g.betumeret, g.betuKozEm)
    expect(szamolt).toBeGreaterThanOrEqual(356.5)
    expect(szamolt).toBeLessThanOrEqual(357.5)
    expect(g.hasab).toBeCloseTo(272, 1)
  })
})
