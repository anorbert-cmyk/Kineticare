/**
 * MIKROSZÖVEG-SZABÁLYOK — a `docs/ui-sztenderdek.md` §3.1 kódbeli alakja.
 *
 * MIÉRT KÜLÖN FÁJLBAN, ÉS MIÉRT NEM A `src/lib/cta-vocabulary.ts`-BEN
 * ------------------------------------------------------------------
 * Két őr méri ugyanezeket a szabályokat:
 *
 *   - `cta-vocabulary-guard.test.ts` (G-UI1) — a SZÓTÁRON,
 *   - `cta-a-termekben.test.ts` (G-UI2) — a TERMÉK élő feliratain.
 *
 * A listát tehát meg kell osztani, de NEM a védett modulba: ha a tiltott szavak
 * a `cta-vocabulary.ts`-ben élnének, a modul gyengítése (egy sor törlése)
 * ugyanazzal a mozdulattal gyengítené mindkét őrt is. Ez a fájl TESZT-oldali,
 * a `src/__tests__/` fa alatt: a termékkód nem függ tőle, tehát a szabályt csak
 * az őrökkel együtt, láthatóan lehet lazítani.
 *
 * A tiltott karaktereket a modul KÓDPONTBÓL építi, nem beleírva — így maga a
 * fájl sem bukik meg a saját szabályán, és a szabály nem másolható el véletlenül
 * egy vizuálisan hasonló karakterrel.
 */

/** U+2014 — kvirtmínusz (em dash). Magyar szövegben nem írásjel (ELTE, Szabadbölcsészet). */
export const EM_DASH = String.fromCharCode(0x2014)

/** U+2013 — nagykötőjel / gondolatjel. Gomb-, menü- és címkeszövegben tiltott (§3.1.2). */
export const EN_DASH = String.fromCharCode(0x2013)

/** U+2026 — a folyamatban-feliratok három pontja (nem három darab pont). */
export const ELLIPSIS = String.fromCharCode(0x2026)

/**
 * M-7 — a puszta, célt nem nevező feliratok. Kiegészítés nélkül egyik sem lehet
 * CTA: „a link ígéret" (NN/g), és a puszta „Tovább" nem mondja meg, mit ígér.
 *
 * A lista a §3.2 M-7 pontjából származik; a G-UI1 a szótárra, a G-UI2 a
 * termék élő feliratára alkalmazza.
 */
export const BARE_FORBIDDEN_LABELS: readonly string[] = [
  'tovább',
  'küldés',
  'ok',
  'mehet',
  'kattints ide',
  'bővebben',
  'részletek',
  'submit',
]

/** A felirat záró írásjeleitől megtisztított, kisbetűs alakja (a puszta-szó vizsgálathoz). */
export function pusztaAlak(felirat: string): string {
  return felirat.toLocaleLowerCase('hu').replace(/[.…!?]+$/u, '')
}
