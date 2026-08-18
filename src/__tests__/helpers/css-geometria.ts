/**
 * KICSI, CÉLZOTT CSS-FELOLDÓ — a repó VALÓDI stíluslapjaiból számol geometriát.
 *
 * MIÉRT. A `reflow-hasabmeres.test.ts` őr nem tulajdonságokat néz („szerepel-e
 * a fájlban az `overflow-wrap` szó"), hanem MÉRI a kimenetet: mekkora hasáb áll
 * rendelkezésre, és mekkora helyet kér a leghosszabb tördelhetetlen szó. Ehhez
 * a CSS-ből ki kell olvasni az érvényes értékeket — a tokeneket, a `clamp()`-et
 * és a kaszkádot —, nem beégetni őket a tesztbe. Beégetett szám mellett a
 * szabály elmozdulhatna a CSS-ben úgy, hogy az őr nem veszi észre; ez pontosan
 * az a hibaosztály, ami miatt ez a fájl készült.
 *
 * MIT MODELLEZ. Annyi CSS-t, amennyi a folyószöveg-hasáb geometriájához kell:
 *   - `:root` egyéni tulajdonságok és a `var()` feloldása (rekurzívan),
 *   - `clamp(min, alap, max)` kiértékelése adott nézetablak-szélességen,
 *     benne a `rem`/`px`/`em`/`vw` és az összeadás,
 *   - kaszkád három szelektor-alakra: puszta elemnév (`h2`), osztály
 *     (`.kc-richtext`) és osztály + elemnév (`.kc-richtext h2`),
 *   - öröklődés: ha az elemre nincs deklaráció, a szülő értéke jön.
 *
 * MIT NEM MODELLEZ (és miért nem baj). Nincs média-lekérdezés-kiértékelés a
 * hívón kívül, nincs `:hover`/`:focus`, nincs `calc()` a `clamp()`-en kívül,
 * nincs kombinátor a leszármazotton kívül. A folyószöveg-hasáb ezek egyikét sem
 * használja — a modell által számolt geometriát pedig a hívó teszt egy
 * BÖNGÉSZŐS MÉRÉSHEZ hitelesíti (Chromium, 320/390 px), tehát ha a modell
 * eltérne a valóságtól, az a hitelesítésen bukna.
 */

import { readFileSync } from 'node:fs'

/** Egy CSS-szabály: a vesszős szelektorlista és a deklarációk. */
type Szabaly = {
  readonly szelektorok: readonly string[]
  readonly deklaraciok: ReadonlyMap<string, string>
}

/** Elem a modellben: az elemnév és a rá illeszkedő osztály (ha van). */
export type Elem = {
  /** Elemnév kisbetűvel, pl. `h2`, `p`, `li`. Üres a puszta osztály-gyökérnél. */
  readonly elemnev: string
  /** A szülő az öröklődési láncban (a `.kc-richtext` gyökér szülője null). */
  readonly szulo: Elem | null
  /** Az elemre illeszkedő osztály, pl. `.kc-richtext` (a gyökéren), különben null. */
  readonly osztaly: string | null
  /** A leszármazott-szelektor előtagja, pl. `.kc-richtext` a `.kc-richtext h2`-höz. */
  readonly ostagOsztaly: string | null
}

const KOMMENT = /\/\*[\s\S]*?\*\//g

/** Egy stíluslap szabályai, kommentek nélkül, forrás-sorrendben. */
export function szabalyok(css: string): readonly Szabaly[] {
  const tiszta = css.replace(KOMMENT, '')
  const eredmeny: Szabaly[] = []
  const minta = /([^{}@]+)\{([^{}]*)\}/g
  let talalat: RegExpExecArray | null
  while ((talalat = minta.exec(tiszta)) !== null) {
    const fej = talalat[1].trim()
    if (fej.length === 0) continue
    const deklaraciok = new Map<string, string>()
    for (const darab of talalat[2].split(';')) {
      const ketto = darab.indexOf(':')
      if (ketto < 0) continue
      const kulcs = darab.slice(0, ketto).trim()
      const ertek = darab.slice(ketto + 1).trim()
      if (kulcs.length > 0 && ertek.length > 0) deklaraciok.set(kulcs, ertek)
    }
    eredmeny.push({
      szelektorok: fej.split(',').map((s) => s.trim().replace(/\s+/g, ' ')),
      deklaraciok,
    })
  }
  return eredmeny
}

/** Több stíluslap egy kaszkáddá fűzve (a `styles.css` @import-sorrendjében). */
export function stilusLap(fajlok: readonly string[]): readonly Szabaly[] {
  return fajlok.flatMap((fajl) => szabalyok(readFileSync(fajl, 'utf8')))
}

/** A `:root` alatt deklarált egyéni tulajdonságok (`--kc-*`). */
export function tokenek(lap: readonly Szabaly[]): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const szabaly of lap) {
    if (!szabaly.szelektorok.includes(':root')) continue
    for (const [kulcs, ertek] of szabaly.deklaraciok) {
      if (kulcs.startsWith('--')) map.set(kulcs, ertek)
    }
  }
  return map
}

/** `var(--x)` és `var(--x, tartalék)` rekurzív behelyettesítése. */
export function varFeloldas(ertek: string, map: ReadonlyMap<string, string>, melyseg = 0): string {
  if (melyseg > 12) throw new Error(`körkörös var()-hivatkozás: ${ertek}`)
  if (!ertek.includes('var(')) return ertek
  const kezd = ertek.indexOf('var(')
  let szint = 0
  let veg = kezd + 3
  for (; veg < ertek.length; veg++) {
    if (ertek[veg] === '(') szint++
    else if (ertek[veg] === ')') {
      szint--
      if (szint === 0) break
    }
  }
  const belso = ertek.slice(kezd + 4, veg)
  const vesszo = belso.indexOf(',')
  const nev = (vesszo < 0 ? belso : belso.slice(0, vesszo)).trim()
  const tartalek = vesszo < 0 ? null : belso.slice(vesszo + 1).trim()
  const hivatkozott = map.get(nev) ?? tartalek
  if (hivatkozott === null || hivatkozott === undefined) {
    throw new Error(`ismeretlen egyéni tulajdonság: ${nev}`)
  }
  return varFeloldas(
    ertek.slice(0, kezd) + hivatkozott + ertek.slice(veg + 1),
    map,
    melyseg + 1,
  )
}

/** Hossz-kifejezés pixelben: `px`, `rem`, `em`, `vw`, összeadás és `clamp()`. */
export function hosszPx(
  kifejezes: string,
  nezetablakPx: number,
  szuloBetumeretPx: number,
  gyokerBetumeretPx = 16,
): number {
  const szoveg = kifejezes.trim()
  if (szoveg === 'normal' || szoveg === '0') return 0
  if (szoveg.startsWith('clamp(')) {
    const reszek = felsoSzintuVesszok(szoveg.slice(6, -1))
    if (reszek.length !== 3) throw new Error(`hibás clamp(): ${szoveg}`)
    const [also, alap, felso] = reszek.map((r) =>
      hosszPx(r, nezetablakPx, szuloBetumeretPx, gyokerBetumeretPx),
    )
    return Math.min(Math.max(alap, also), felso)
  }
  if (szoveg.startsWith('min(') || szoveg.startsWith('max(')) {
    const reszek = felsoSzintuVesszok(szoveg.slice(4, -1)).map((r) =>
      hosszPx(r, nezetablakPx, szuloBetumeretPx, gyokerBetumeretPx),
    )
    return szoveg.startsWith('min(') ? Math.min(...reszek) : Math.max(...reszek)
  }
  // Egyszerű összeg (`0.955rem + 0.2vw`) — a CSS a clamp() közepén ezt használja.
  let osszeg = 0
  for (const tag of szoveg.split('+')) {
    const t = tag.trim()
    const m = /^(-?\d*\.?\d+)(px|rem|em|vw|vh|%)?$/.exec(t)
    if (!m) throw new Error(`nem értelmezhető hossz: „${t}" (${kifejezes})`)
    const szam = Number(m[1])
    switch (m[2]) {
      case undefined:
        osszeg += szam === 0 ? 0 : szam
        break
      case 'px':
        osszeg += szam
        break
      case 'rem':
        osszeg += szam * gyokerBetumeretPx
        break
      case 'em':
        osszeg += szam * szuloBetumeretPx
        break
      case 'vw':
        osszeg += (szam / 100) * nezetablakPx
        break
      default:
        throw new Error(`nem támogatott egység: ${m[2]}`)
    }
  }
  return osszeg
}

/** Vesszős lista bontása a legfelső zárójel-szinten. */
function felsoSzintuVesszok(szoveg: string): string[] {
  const eredmeny: string[] = []
  let szint = 0
  let utolso = 0
  for (let i = 0; i < szoveg.length; i++) {
    const k = szoveg[i]
    if (k === '(') szint++
    else if (k === ')') szint--
    else if (k === ',' && szint === 0) {
      eredmeny.push(szoveg.slice(utolso, i))
      utolso = i + 1
    }
  }
  eredmeny.push(szoveg.slice(utolso))
  return eredmeny.map((r) => r.trim())
}

/** Egy szelektor illeszkedik-e az elemre, és ha igen, milyen fajsúllyal. */
function fajsuly(szelektor: string, elem: Elem): readonly [number, number, number] | null {
  if (elem.osztaly !== null && szelektor === elem.osztaly) return [0, 1, 0]
  if (elem.elemnev.length === 0) return null
  if (szelektor === elem.elemnev) return [0, 0, 1]
  if (elem.ostagOsztaly !== null && szelektor === `${elem.ostagOsztaly} ${elem.elemnev}`) {
    return [0, 1, 1]
  }
  return null
}

const nagyobb = (a: readonly [number, number, number], b: readonly [number, number, number]) =>
  a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2]

/**
 * Az elemre KÖZVETLENÜL érvényes deklaráció (kaszkád: fajsúly, majd sorrend).
 * Öröklődést nem néz — arra a `oroklottErtek` való.
 */
export function sajatErtekSullyal(
  lap: readonly Szabaly[],
  elem: Elem,
  tulajdonsag: string,
): { readonly suly: readonly [number, number, number]; readonly ertek: string } | null {
  let nyertes: { suly: readonly [number, number, number]; ertek: string } | null = null
  for (const szabaly of lap) {
    const ertek = szabaly.deklaraciok.get(tulajdonsag)
    if (ertek === undefined) continue
    for (const szelektor of szabaly.szelektorok) {
      const suly = fajsuly(szelektor, elem)
      if (suly === null) continue
      if (nyertes === null || nagyobb(suly, nyertes.suly)) nyertes = { suly, ertek }
    }
  }
  return nyertes
}

export function sajatErtek(
  lap: readonly Szabaly[],
  elem: Elem,
  tulajdonsag: string,
): string | null {
  return sajatErtekSullyal(lap, elem, tulajdonsag)?.ertek ?? null
}

/**
 * Ugyanaz a tulajdonság több írásmódban (`padding-left` és
 * `padding-inline-start`): a kaszkádban a NAGYOBB fajsúlyú deklaráció nyer,
 * egyenlőségnél a később írt. A folyószöveg-lista épp ilyen: a base.css
 * `ul, ol`-ra `padding-inline-start`-ot ír, a content.css `.kc-richtext ul`-ra
 * `padding-left`-et — a mért 240 px-es listaelem-hasáb (320 px-es nézetablak)
 * az utóbbit igazolja.
 */
export function sajatErtekTobbNeven(
  lap: readonly Szabaly[],
  elem: Elem,
  tulajdonsagok: readonly string[],
): string | null {
  let nyertes: { suly: readonly [number, number, number]; ertek: string } | null = null
  for (const tulajdonsag of tulajdonsagok) {
    const jelolt = sajatErtekSullyal(lap, elem, tulajdonsag)
    if (jelolt === null) continue
    if (nyertes === null || nagyobb(jelolt.suly, nyertes.suly)) nyertes = jelolt
  }
  return nyertes?.ertek ?? null
}

/** Öröklődő tulajdonság érvényes értéke: saját deklaráció, különben a szülőé. */
export function oroklottErtek(
  lap: readonly Szabaly[],
  elem: Elem,
  tulajdonsag: string,
  kezdoErtek: string,
): string {
  const sajat = sajatErtek(lap, elem, tulajdonsag)
  if (sajat !== null) return sajat
  if (elem.szulo === null) return kezdoErtek
  return oroklottErtek(lap, elem.szulo, tulajdonsag, kezdoErtek)
}
