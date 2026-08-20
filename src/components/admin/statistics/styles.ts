import type { CSSProperties } from 'react'

/**
 * A Statisztika nézet KÖZÖS stílus-tokenjei — minden szekció-komponens
 * innen importál, hogy a nézet egyetlen vizuális nyelvet beszéljen.
 *
 * ═══ VIZUÁLIS NYELV ═══
 * A kártya- és táblastílus az admin etalonját, a CourseProgressPanel-t
 * követi (elevation-50 háttér, elevation-100 keret, érték felül 1.5rem/600,
 * címke alatta elevation-650) — új vizuális nyelvet nem vezetünk be, mert az
 * azonos minta azonos jelentést hordoz (WCAG 2.2 SC 3.2.4 Consistent
 * Identification: https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html).
 *
 * ═══ RESZPONZIVITÁS ═══
 * A kártyasor flex-wrap (flex: 1 1 8rem), így 320 px-en 1-2 oszlopba törik
 * media query nélkül; a táblák saját görgetőkonténerben (width: 100%,
 * overflowX: auto) csúsznak, tehát maga a LAP sosem görget vízszintesen.
 * - WCAG 2.2 SC 1.4.10 Reflow (320 px, nincs kétirányú görgetés a lapon):
 *   https://www.w3.org/WAI/WCAG22/Understanding/reflow.html — a G225
 *   technika kifejezetten megengedi, hogy egy szekció (itt: adattábla)
 *   a saját konténerében görögjön vízszintesen.
 * - C31 technika (flexbox reflow):
 *   https://www.w3.org/WAI/WCAG22/Techniques/css/C31
 */

export const pageStyle: CSSProperties = {
  padding: 'calc(var(--base) * 1.5)',
  maxWidth: '64rem',
}

export const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 'calc(var(--base) * 0.5)',
}

/* 42rem ≈ 75 karakter magyar szöveggel — a 45–85 karakteres olvasható
   sorhossz-sávon belül (docs/ui-sztenderdek.md, tervezési skill 3. pont). */
export const leadStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  marginTop: 0,
  marginBottom: 'calc(var(--base) * 1.25)',
  maxWidth: '42rem',
}

export const cardRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(var(--base) * 0.5)',
  marginBottom: 'calc(var(--base) * 1.5)',
}

export const cardStyle: CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-100)',
  borderRadius: '4px',
  flex: '1 1 8rem',
  minWidth: '8rem',
  padding: 'calc(var(--base) * 0.5)',
}

/* Érték FELÜL, nagyban — a szám a lényeg, a címke a kontextus (a dashboard
   kártyáin az adat vezet, a leírás követ; NN/g, Clutter-Free charts:
   https://www.nngroup.com/articles/clutter-charts/). */
export const cardValueStyle: CSSProperties = {
  display: 'block',
  fontSize: '1.5rem',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  lineHeight: 1.2,
}

export const cardLabelStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  display: 'block',
}

export const sectionStyle: CSSProperties = {
  marginBottom: 'calc(var(--base) * 1.75)',
}

export const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  width: '100%',
}

/* A minWidth garantálja, hogy az oszlopok sose préselődjenek olvashatatlanra:
   keskeny viewporton a tableWrap görget, nem a lap (WCAG 1.4.10 / G225,
   ugyanaz a minta, mint a CourseProgressPanel 46rem-es táblája). */
export const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: '36rem',
  borderCollapse: 'collapse',
  fontSize: '0.95rem',
}

export const captionStyle: CSSProperties = {
  textAlign: 'left',
  captionSide: 'top',
  paddingBottom: '0.5rem',
}

export const thStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid var(--theme-elevation-250)',
  padding: '0.5rem 0.75rem 0.5rem 0',
  color: 'var(--theme-elevation-650)',
  fontWeight: 600,
}

export const tdStyle: CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-100)',
  padding: '0.5rem 0.75rem 0.5rem 0',
}

export const numericStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

export const thNumericStyle: CSSProperties = {
  ...thStyle,
  textAlign: 'right',
}

export const noticeStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  margin: 0,
}
