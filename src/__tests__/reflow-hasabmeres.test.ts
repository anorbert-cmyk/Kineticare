import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { RichText } from '../components/lexical/RichText'
import { JOGI_OLDALAK, jogiOldalTartalom } from '../lib/legal-content'
import { betuMetrika, szoSzelessegPx, type BetuMetrika } from './helpers/font-metrics'
import {
  hosszPx,
  oroklottErtek,
  sajatErtek,
  sajatErtekTobbNeven,
  stilusLap,
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
