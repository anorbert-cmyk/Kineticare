import type { CSSProperties } from 'react'

/**
 * A kurzus-haladás panel KÖZÖS stílus-tokenjei.
 *
 * ═══ MIÉRT KÜLÖN FÁJL ═══
 * Ugyanaz az indok, mint a Statisztika nézetnél
 * (src/components/admin/statistics/styles.ts): a panel és a belőle kiemelt
 * tábla-komponensek egyetlen vizuális nyelvet beszéljenek, és a MÉRHETŐ
 * értékek (érintőcél-méret, görgetőkonténer, mérték) tesztből is olvashatók
 * legyenek. A modulnak nincs React-futásidejű függése (a `CSSProperties`
 * típus-import), ezért mérőszkriptből is betölthető.
 *
 * ═══ VIZUÁLIS NYELV ═══
 * A panel a Payload admin saját design-rendszerét viseli
 * (`docs/ui-sztenderdek.md` §1.2: „az adminban a Payload design az
 * elsődleges"). KIVÉTEL a két állapotszín: azok a `--kc-cp-*` márka-tokenről
 * jönnek, mert a Payload globális `--theme-error-500` / `--theme-warning-500`
 * MÉRVE megbukik a WCAG 2.2 SC 1.4.3-on. A tokenek, a színek eredete és a
 * teljes kontraszt-jegyzőkönyv: `course-progress-panel.css`.
 *
 * ═══ ÉRINTŐCÉL ═══
 * A rendezhető fejléc-gombok doboza korábban a SORMAGASSÁGRA esett vissza
 * (`padding: 0`, `background: none`, `border: none`), mérve ~19 px magasra:
 * a WCAG 2.2 SC 2.5.8 Target Size (Minimum) 24 × 24 CSS px-es küszöbe alatt
 * (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
 * A repó célértéke ennél szigorúbb, 44 × 44 CSS px
 * (`docs/ui-sztenderdek.md` §2.4; Apple HIG 44 × 44 pt, Material 48 dp).
 * A `max(44px, …)` alsó korlát azért kell, mert a Payload 1024 px alatt
 * 12 px-re viszi a gyökér-betűméretet, és a puszta rem-alak ott 40,6 px-et
 * adna; a cél-méret viszont CSS px-ben van kimondva. (Ugyanaz a minta, mint
 * a Statisztika nézet `rowLinkStyle`-jánál.)
 */

/** A cél-érintőméret: a repó 44 px-es célja, a Payload kisebb gyökerén is. */
export const TARGET_SIZE = 'max(44px, calc((44 / 13) * 1rem))'

export const panelStyle: CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  marginBottom: 'var(--base)',
  padding: 'calc(var(--base) * 0.75)',
}

/**
 * Csak képernyőolvasónak szóló tartalom (a Payload adminban nincs sr-only
 * segédosztály, ezért a szokásos clip-minta inline).
 */
export const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export const noteStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  margin: 0,
}

/**
 * Hibaüzenet (`role="alert"`). A szín a márka-tokenről jön, biztonságos
 * tartalékkal: réteg nélkül a Payload szövegszínét kapja, ami mindkét témán
 * bőven AA fölött van (jegyzőkönyv: course-progress-panel.css).
 */
export const errorStyle: CSSProperties = {
  color: 'var(--kc-cp-danger, var(--theme-text))',
  marginBottom: 0,
  marginTop: 'calc(var(--base) * 0.5)',
}

/** A csonkolás-figyelmeztetés (`role="status"`), ugyanezzel a tartalékkal. */
export const warningStyle: CSSProperties = {
  color: 'var(--kc-cp-warning, var(--theme-text))',
  marginBottom: 0,
  marginTop: 'calc(var(--base) * 0.5)',
}

export const rowStyle: CSSProperties = {
  marginTop: 'calc(var(--base) * 0.5)',
}

export const cardsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(var(--base) * 0.5)',
  marginTop: 'calc(var(--base) * 0.5)',
}

export const cardStyle: CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-100)',
  borderRadius: '4px',
  flex: '1 1 8rem',
  minWidth: '8rem',
  padding: 'calc(var(--base) * 0.5)',
}

export const cardValueStyle: CSSProperties = {
  display: 'block',
  fontSize: '1.5rem',
  fontWeight: 600,
  lineHeight: 1.2,
}

export const cardLabelStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  display: 'block',
}

/**
 * A tábla görgetőkonténere.
 *
 * `role="region"` + `tabIndex={0}` + `aria-labelledby` NÉLKÜL ez a doboz
 * billentyűzetről nem görgethető (WCAG 2.2 SC 2.1.1 Keyboard; axe-szabály:
 * scrollable-region-focusable —
 * https://dequeuniversity.com/rules/axe/4.12/scrollable-region-focusable).
 * A minta Adrian Roselli, Under-Engineered Responsive Tables:
 * https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html
 * A fókuszgyűrűt a Payload globális `:focus-visible` szabálya adja
 * (`--accessibility-outline`: 2px solid var(--theme-text)).
 */
export const tableWrapStyle: CSSProperties = {
  marginTop: 'calc(var(--base) * 0.5)',
  overflowX: 'auto',
}

export const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  minWidth: '46rem',
  width: '100%',
}

export const cellStyle: CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-100)',
  padding: 'calc(var(--base) * 0.35) calc(var(--base) * 0.4)',
  textAlign: 'left',
  verticalAlign: 'middle',
}

/**
 * Sor-fejléc (`<th scope="row">`): a böngésző alapértelmezése középre igazít
 * és félkövérez. A bal igazítás explicit, hogy a cella az oszlopfejléce alá
 * essen; a félkövér marad, mert a sor AZONOSÍTÓJA (WCAG 2.2 SC 1.3.1 Info
 * and Relationships: https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html).
 */
export const rowHeaderStyle: CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
}

export const headCellStyle: CSSProperties = {
  ...cellStyle,
  borderBottom: '1px solid var(--theme-elevation-150)',
  color: 'var(--theme-elevation-650)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

/**
 * A rendezhető oszlop fejléc-cellája. A függőleges belső térköz 0, mert a
 * MAGASSÁGOT a benne álló gomb 44 px-es érintőcélja adja: enélkül a fejlécsor
 * 44 + 2 × 7 px-re nőne anélkül, hogy a cél nagyobb lenne.
 */
export const sortHeadCellStyle: CSSProperties = {
  ...headCellStyle,
  paddingBottom: 0,
  paddingTop: 0,
}

/**
 * A rendezhető fejléc gombja. A doboz MÉRHETŐEN legalább 44 × 44 CSS px
 * (WCAG 2.2 SC 2.5.8 minimuma 24 × 24; a repó célja 44 × 44,
 * `docs/ui-sztenderdek.md` §2.4).
 */
export const sortButtonStyle: CSSProperties = {
  alignItems: 'center',
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  font: 'inherit',
  gap: '0.35em',
  justifyContent: 'flex-start',
  minHeight: TARGET_SIZE,
  minWidth: TARGET_SIZE,
  padding: 0,
  textAlign: 'left',
}

/**
 * A LÁTHATÓ rendezés-jelölés (nyíl). Eddig csak `aria-sort` volt: a látó
 * felhasználó nem tudta, hogy a fejléc egyáltalán rendezhető, és azt sem,
 * melyik szerint áll a lista. NN/g, Data Tables: a rendezhető oszlopot
 * jelölni kell, és az aktuális rendezésnek látszania kell
 * (https://www.nngroup.com/articles/data-tables/). Ugyanezt írja elő a
 * GOV.UK Design System rendezhető táblája is
 * (https://design-system.service.gov.uk/components/table/).
 * A jel `aria-hidden`: a képernyőolvasónak az `aria-sort` mondja meg
 * ugyanezt, kétszer felolvasni zaj lenne.
 *
 * Az inaktív jel halványabb, de NEM alacsony kontrasztú: a szín a
 * `--theme-elevation-650` (világosban 7,23:1, sötétben 10,45:1 a lap
 * hátterén, SZÁMOLVA), tehát a nem-szöveges 3:1-es küszöb (WCAG 2.2 SC
 * 1.4.11) és a szöveges 4,5:1 is teljesül. Az információt a `.4` átlátszóság
 * NEM hordozza egyedül: a jel ALAKJA is más (kettős nyíl vs. egy nyíl).
 */
export const sortGlyphStyle: CSSProperties = {
  fontSize: '0.85em',
  lineHeight: 1,
}

export const sortGlyphInactiveStyle: CSSProperties = {
  ...sortGlyphStyle,
  color: 'var(--theme-elevation-650)',
}

/** Az állapot-chip a hallgató-táblában. */
export const chipStyle: CSSProperties = {
  borderRadius: '999px',
  display: 'inline-block',
  padding: '0.1rem 0.5rem',
  whiteSpace: 'nowrap',
}

/** A haladás-cella: kördiagram + szám, egy sorban. */
export const progressCellStyle: CSSProperties = {
  alignItems: 'center',
  display: 'inline-flex',
  gap: '0.4rem',
}

/**
 * A szűrősor. `flex-wrap`, hogy 320 px-en egymás alá törjön: így a LAP nem
 * görget vízszintesen (WCAG 2.2 SC 1.4.10 Reflow, C31 technika —
 * https://www.w3.org/WAI/WCAG22/Techniques/css/C31).
 */
export const filterRowStyle: CSSProperties = {
  ...rowStyle,
  alignItems: 'flex-end',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(var(--base) * 0.5)',
}

/**
 * A szűrő és a kereső mezője. `maxWidth: 100%`, hogy 320 px-en se lógjon ki a
 * panelből (a böngésző alapértelmezett `<input type="search">` szélessége
 * ~170 px, a `<select>`-é a leghosszabb opcióhoz igazodik).
 */
export const filterFieldStyle: CSSProperties = {
  maxWidth: '100%',
}
