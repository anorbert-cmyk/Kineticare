import type { CSSProperties } from 'react'

/**
 * A Statisztika nézet KÖZÖS stílus-tokenjei — minden szekció-komponens
 * innen importál, hogy a nézet egyetlen vizuális nyelvet beszéljen.
 *
 * ═══ VIZUÁLIS NYELV (tulajdonosi döntés, 2026-08-20) ═══
 * A nézet a vevői oldal prémium márka-designnyelvét viseli — a tulajdonos
 * 2026-08-20-i explicit kérése, ami erre az oldalra felülírja a
 * docs/ui-sztenderdek.md §1.2 „az adminban a Payload design az elsődleges"
 * szabályát. A korábbi CourseProgressPanel-mintás Payload-kinézetet ezért a
 * márka-réteg váltja; a magyar mikroszöveg-szabályzat (ui-sztenderdek §3.1)
 * változatlanul kötelező.
 *
 * A márka-tokenek EGYETLEN igazságforrása a storefront tokens.css
 * (src/app/(frontend)/styles/tokens.css); az admin-oldali, scope-olt másuk a
 * src/app/(payload)/custom.scss `.kc-adminstat` blokkja, a kontraszt-
 * jegyzőkönyvvel együtt. Minden érték itt `var(--kc-as-…, var(--theme-…))`
 * alakú: ha a custom.scss nem töltődik be, a nézet a Payload-kinézetre esik
 * vissza, nem törik el. A nyelv elemei:
 *   - felületek: paper-föld + fehér, 1px hairline-keretes, 8px-radiusú
 *     emelt felület, ÁRNYÉK NÉLKÜL (tokens.css 113–121. és 215–222. sor),
 *   - vonalak: tábla-sorelválasztó = dekoratív hairline; ahol a keret
 *     AZONOSÍT (görgetőkonténer határa), ott hairline-strong (tokens.css
 *     118–121. sor; WCAG 2.2 SC 1.4.11 Non-text Contrast:
 *     https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html),
 *   - térköz: 4px-rács (tokens.css 198–207. sor),
 *   - számok: Nunito Sans 700 + tabular-nums (az ár-kiemelés súllyal
 *     történik, mérettel nem — tokens.css 168–169. sor).
 *
 * ═══ MÉRET-EGYSÉG: PX, NEM REM (2026-08-20-i élő audit) ═══
 * A Payload admin gyökér-betűmérete 13px (--base-body-size: 13 —
 * node_modules/@payloadcms/ui/dist/scss/app.scss), ezért az itteni rem-értékek
 * a tervezett 16px-es storefront-alap 13/16-ára zsugorodtak (mérve: törzs
 * 13px, tábla 12,4px, kártya-érték 19,5px). A px a márka-skála pontos
 * visszaadása; a rem az adminban a felhasználói beállítást sem követné,
 * mert a Payload fixen 13-ra állítja. Részletes indoklás forrásokkal:
 * custom.scss „Márka-tokenek" fejkomment.
 *
 * ═══ RESZPONZIVITÁS (változatlan) ═══
 * A kártyasor flex-wrap (flex: 1 1 128px), így 320 px-en 1-2 oszlopba törik
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
  background: 'var(--kc-as-bg, transparent)',
  borderRadius: 'var(--kc-as-radius-md, 0)',
  padding: 'var(--kc-as-space-6, calc(var(--base) * 1.5))',
  maxWidth: '1024px',
}

/* Eyebrow a h1 fölé — a landing prémium felvezető-sora: verzál CSS-ből
   (a DOM-szöveg mondatkezdő marad, ui-sztenderdek §3.1 M-4), 0.24em
   betűköz, ink-soft (tokens.css 195–196. sor; paperen 8,80:1). A 13px az
   S lépcső alsó határa (tokens.css 180. sor: 0.8125rem 16px-es alapon). */
export const eyebrowStyle: CSSProperties = {
  color: 'var(--kc-as-text-muted, var(--theme-elevation-650))',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: 'var(--kc-as-tracking-eyebrow, 0.24em)',
  marginTop: 0,
  marginBottom: 'var(--kc-as-space-2, 0.5rem)',
  textTransform: 'uppercase',
}

export const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 'var(--kc-as-space-2, calc(var(--base) * 0.5))',
}

/* 528px (55 × a 16px-es törzs ch-egysége) ≈ 72–74 karakter magyar szöveggel
   (élőben mérve, Range API-s soronkénti karakterszámlálással: 672px-en még
   89–95 karakter jött ki, mert a magyar szöveg keskeny betűi a ch-nál többet
   engednek egy sorba) — a 45–85 karakteres sávon belül (tervezési skill
   3. pont), és a Baymard 50–75-ös optimumában
   (https://baymard.com/blog/line-length-readability). */
export const leadStyle: CSSProperties = {
  color: 'var(--kc-as-text-muted, var(--theme-elevation-650))',
  marginTop: 0,
  marginBottom: 'var(--kc-as-space-5, calc(var(--base) * 1.25))',
  maxWidth: '528px',
}

export const cardRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--kc-as-space-3, calc(var(--base) * 0.5))',
  marginBottom: 'var(--kc-as-space-6, calc(var(--base) * 1.5))',
}

/* Kártya = emelt felület: fehér + 1px hairline + 8px radius, árnyék nélkül
   (a landing kártya-nyelve, tokens.css 113–124. sor). A kártya kerete csak
   dekorál, nem azonosít — az információt a szöveg hordozza, ezért elég a
   halk hairline (tokens.css 118–121. sor). */
export const cardStyle: CSSProperties = {
  background: 'var(--kc-as-surface-raised, var(--theme-elevation-50))',
  border: '1px solid var(--kc-as-hairline, var(--theme-elevation-100))',
  borderRadius: 'var(--kc-as-radius-md, 4px)',
  flex: '1 1 128px',
  minWidth: '128px',
  padding: 'var(--kc-as-space-4, calc(var(--base) * 0.5))',
}

/* Érték FELÜL, nagyban — a szám a lényeg, a címke a kontextus (a dashboard
   kártyáin az adat vezet, a leírás követ; NN/g, Clutter-Free charts:
   https://www.nngroup.com/articles/clutter-charts/). A súly 700: a márka a
   kiemelt számot súllyal jelöli, nem mérettel (tokens.css 168–169. sor). */
export const cardValueStyle: CSSProperties = {
  display: 'block',
  fontSize: '24px',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  lineHeight: 1.2,
}

export const cardLabelStyle: CSSProperties = {
  color: 'var(--kc-as-text-muted, var(--theme-elevation-650))',
  display: 'block',
}

export const sectionStyle: CSSProperties = {
  marginBottom: 'var(--kc-as-space-7, calc(var(--base) * 1.75))',
}

/* Tábla-konténer = emelt felület ÉS görgetőkonténer egyben: a kerete
   azonosítja a (keskeny viewporton) görgethető adatterületet, ezért
   hairline-strong jár neki (tokens.css 118–121. sor: „ahol a keret
   azonosít… border-strong"; fehéren 4,13:1 ≥ 3:1, WCAG 1.4.11). */
export const tableWrapStyle: CSSProperties = {
  background: 'var(--kc-as-surface-raised, transparent)',
  border: '1px solid var(--kc-as-hairline-strong, transparent)',
  borderRadius: 'var(--kc-as-radius-md, 0)',
  overflowX: 'auto',
  padding: 'var(--kc-as-space-4, 0)',
  width: '100%',
}

/* A minWidth garantálja, hogy az oszlopok sose préselődjenek olvashatatlanra:
   keskeny viewporton a tableWrap görget, nem a lap (WCAG 1.4.10 / G225,
   ugyanaz a minta, mint a CourseProgressPanel táblája). A 15px admin-
   adaptáció a 16px-es törzs alá: az adatsűrű tábla egy fokkal kisebb, de a
   12,4px-es (mért) korábbi rendernél jóval olvashatóbb; kontrasztja mérve
   9,3:1 / 6,61:1 (jegyzőkönyv a custom.scss-ben). */
export const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: '576px',
  borderCollapse: 'collapse',
  fontSize: '15px',
}

export const captionStyle: CSSProperties = {
  color: 'var(--kc-as-text-muted, inherit)',
  textAlign: 'left',
  captionSide: 'top',
  paddingBottom: 'var(--kc-as-space-2, 0.5rem)',
}

/* A fejléc-sor alatti vonal a táblatest határát azonosítja → hairline-strong;
   a sorelválasztó csak dekorál → hairline (tokens.css 118–121. sor). */
export const thStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid var(--kc-as-hairline-strong, var(--theme-elevation-250))',
  padding:
    'var(--kc-as-space-2, 0.5rem) var(--kc-as-space-3, 0.75rem) var(--kc-as-space-2, 0.5rem) 0',
  color: 'var(--kc-as-text-muted, var(--theme-elevation-650))',
  fontWeight: 600,
}

export const tdStyle: CSSProperties = {
  borderBottom: '1px solid var(--kc-as-hairline, var(--theme-elevation-100))',
  padding:
    'var(--kc-as-space-2, 0.5rem) var(--kc-as-space-3, 0.75rem) var(--kc-as-space-2, 0.5rem) 0',
}

/* Sor-fejléc (<th scope="row">): a böngésző alapértelmezése középre igazítana
   és félkövérezne — explicit balra igazítás kell, hogy a cella a bal-igazított
   oszlopfejléce alá essen (WCAG 2.2 SC 1.3.1 Info and Relationships mellett a
   vizuális oszloprend is maradjon konzisztens; a kiemelés súllyal történik,
   mérettel nem — tokens.css 168–169. sor). */
export const rowHeaderStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
  textAlign: 'left',
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

/* A notice ugyanolyan folyószöveg, mint a lead, ezért ugyanaz a sorhossz-
   plafon jár neki (2026-08-20-i élő audit: maxWidth nélkül a tölcsér-notice
   sora 133, 672px-en még 91–95 karakterre nyúlt a 85-ös küszöb és a Baymard
   50–75-ös optimuma fölé — https://baymard.com/blog/line-length-readability;
   tervezési skill 3. pont: 45–85; az 528px mért indoklása a leadStyle-nál). */
export const noticeStyle: CSSProperties = {
  color: 'var(--kc-as-text-muted, var(--theme-elevation-650))',
  margin: 0,
  maxWidth: '528px',
}
