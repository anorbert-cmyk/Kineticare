import type { CSSProperties } from 'react'

import {
  formatHuf,
  formatMonthLabel,
  formatMonthShort,
  type MonthlyRevenueRow,
} from '../../lib/statistics/revenue'

/**
 * Havi bevétel oszlopdiagram — kézzel rajzolt SVG, nincs chart-könyvtár.
 *
 * ═══ AKADÁLYMENTESSÉG ═══
 * A számokat a táblázat hordozza (képernyőolvasó); az SVG `role="img"` +
 * `aria-label`. Minden szín CSS-változó — a márka-tokenek
 * (src/app/(payload)/custom.scss, `.kc-adminstat`) Payload-tartalékkal,
 * így a sötét téma is működik hardcode nélkül, és a márka-CSS nélkül a
 * diagram a Payload-kinézetre esik vissza.
 *
 * ═══ TERVEZÉSI DÖNTÉSEK ÉS FORRÁSAIK ═══
 * 1. JELMAGYARÁZAT SZÖVEGGEL ÉS MINTÁZATTAL. A két ágat nem csak szín
 *    különbözteti meg: a szakmai oszlop átlós csíkozást kap, a jelmagyarázat
 *    pedig szöveges („Otthoni", „Szakmai" — ugyanaz a szó, mint a táblázat
 *    fejlécében, WCAG 3.2.4 konzisztens azonosítás).
 *    - WCAG 2.2 SC 1.4.1 Use of Color (a szín nem lehet egyedüli hordozó):
 *      https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
 *    - IBM Carbon, Legends („Texture can be used instead of, or in addition
 *      to, color to make your chart accessible"):
 *      https://carbondesignsystem.com/data-visualization/legends/
 * 2. Y-TENGELY HÁROM TICKKEL (0, közép, max) ÉS KÉT VÉKONY RÁCSVONALLAL.
 *    Tengelyfelirat nélkül az érték nem becsülhető; háromnál több tick és
 *    sűrű rács viszont már zaj („chartjunk").
 *    - NN/g, Clutter-Free charts: https://www.nngroup.com/articles/clutter-charts/
 *    - IBM Carbon, Chart anatomy („Axes, ticks, and the grid should help the
 *      reader understand the proportions and scale"):
 *      https://carbondesignsystem.com/data-visualization/chart-anatomy/
 *    Az oszlopdiagram Y-tengelye nullától indul (Carbon, Axes and labels:
 *    https://carbondesignsystem.com/data-visualization/axes-and-labels/),
 *    a felső határ „szép" kerek értékre kerekített, hogy a tick olvasható
 *    magyar rövidítés legyen (pl. „80 e Ft").
 * 3. RÖVID X-TICKEK, ÉVSZÁM CSAK ÉVVÁLTÁSNÁL. A korábbi 12 teljes címke
 *    („2025. szeptember", fontSize 10) 320 és 768 px-en átfedett. A rövid
 *    magyar hónapnév („szept.") 12px-szel elforgatás nélkül elfér a 720-as
 *    viewBox 53 px-es oszlopsávjában; az évszám félkövér „landmark" címke
 *    az első oszlopon és minden januárnál (Carbon, Axes and labels:
 *    „Whenever data crosses into a new time cycle … semibold the label").
 * 4. NEM-SZÖVEGES KONTRASZT (tulajdonosi márka-döntés, 2026-08-20: a
 *    diagram-színek a márkapalettából jönnek). Otthoni = accent #3d78aa —
 *    az accent dekorációként megengedett (tokens.css 107–111. sor), a
 *    fehér diagram-háttéren számolva 4,70:1; Szakmai = ink #10243e +
 *    mintázat, fehéren 15,63:1; a szomszédos oszlopok egymáshoz képest
 *    3,32:1. Sötét témában: accent-quiet #9ec4df az emelt (#1a3757)
 *    háttéren 6,61:1, a fehér mintázott oszlop 12,15:1 — a szomszédos
 *    oszlopok 1,84:1-es színkontrasztját ott az átlós mintázat + körvonal
 *    pótolja (nem a szín az egyedüli hordozó, WCAG 1.4.1). A csíkozás
 *    hézaga a diagram-háttér tokenje, tehát a minta mindkét témában
 *    kontrasztos. A teljes számolt jegyzőkönyv: custom.scss fejkomment.
 *    - WCAG 2.2 SC 1.4.11 Non-text Contrast:
 *      https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
 * 5. REFLOW. A LAP 320 px-en sem görget vízszintesen. A 12 hónapos
 *    oszlopdiagram kétirányú adatábrázolás: a WCAG 1.4.10 kivételként
 *    megengedi, hogy a diagram a saját konténerében görögjön, ahelyett,
 *    hogy a viewBox-szöveg 5 px-re zsugorodna. Az SVG ezért `min-width:
 *    45rem` (a 720-as viewBox natív mérete), a wrapper `overflow-x: auto`.
 *    A jelmagyarázat HTML-ben van a diagram alatt, így a szövege keskeny
 *    viewporton sem zsugorodik.
 *    - WCAG 2.2 SC 1.4.10 Reflow (kivétel: 2D adatábra / G214):
 *      https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
 */

/* A diagram + jelmagyarázat közös kártyája: emelt felület, a keret
   hairline-strong, mert a görgethető adatterületet AZONOSÍTJA (tokens.css
   118–121. sor; fehéren 4,13:1 ≥ 3:1, WCAG 1.4.11) — Payload-tartalékkal,
   márka-CSS nélkül keret és háttér nélküli marad, mint eddig. */
const chartCardStyle: CSSProperties = {
  background: 'var(--kc-as-surface-raised, transparent)',
  border: '1px solid var(--kc-as-hairline-strong, transparent)',
  borderRadius: 'var(--kc-as-radius-md, 0)',
  marginBottom: 'var(--kc-as-space-4, calc(var(--base) * 0.5))',
  padding: 'var(--kc-as-space-4, 0)',
}

const chartScrollStyle: CSSProperties = {
  overflowX: 'auto',
  width: '100%',
}

const svgStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  minWidth: '45rem',
  maxWidth: '52rem',
  height: 'auto',
}

/**
 * A jelmagyarázat a diagram alatt (Carbon alapértelmezés: „The legends are
 * positioned at the bottom of a chart by default" —
 * https://carbondesignsystem.com/data-visualization/legends/).
 */
const legendStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--kc-as-space-3, calc(var(--base) * 0.75))',
  marginTop: 'var(--kc-as-space-2, calc(var(--base) * 0.25))',
  marginBottom: 0,
}

const legendItemStyle: CSSProperties = {
  alignItems: 'center',
  display: 'inline-flex',
  gap: '0.4rem',
}

interface RevenueChartProps {
  rows: readonly MonthlyRevenueRow[]
}

function chartLabel(rows: readonly MonthlyRevenueRow[]): string {
  const months = rows.map((row) => formatMonthLabel(row.month)).join(', ')
  return `Havi bevétel oszlopdiagram, otthoni és szakmai ág. Hónapok: ${months}.`
}

/**
 * A skála felső határa „szép" kerek érték (1 / 1,2 / 1,5 / 2 / 2,5 / 3 / 4 /
 * 5 / 6 / 8 × 10^n), hogy a középső tick is kerek szám legyen — a kerekítés
 * felfelé történik, tehát az oszlop sosem lóg ki a skálából.
 */
function niceCeil(value: number): number {
  if (value <= 0) {
    return 1
  }
  const exponent = Math.floor(Math.log10(value))
  const base = Math.pow(10, exponent)
  const mantissa = value / base
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  const step = steps.find((candidate) => mantissa <= candidate) ?? 10
  return step * base
}

/**
 * Rövid magyar tengelyfelirat: ezer forint felett „e Ft" rövidítéssel
 * (a bevett magyar pénzügyi alak, pl. „80 e Ft"), alatta teljes Ft.
 * A teljes formátumú érték a táblázatban és az oszlop tooltipjében él.
 */
function tickLabelHuf(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} e Ft`
  }
  return `${value.toLocaleString('hu-HU')} Ft`
}

export function RevenueChart({ rows }: RevenueChartProps) {
  const width = 720
  const height = 300
  const padLeft = 72
  const padRight = 12
  const padTop = 16
  const padBottom = 48
  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom
  const baselineY = padTop + plotHeight
  const maxValue = rows.reduce((max, row) => Math.max(max, row.laikusHuf, row.szakemberHuf), 0)
  const scaleMax = niceCeil(maxValue)
  // Adat nélkül csak a nullás tick jelenik meg — „0,5 Ft" jellegű, félrevezető
  // köztes felirat nem kerül üres diagramra.
  const tickValues = maxValue > 0 ? [0, scaleMax / 2, scaleMax] : [0]
  const groupWidth = rows.length > 0 ? plotWidth / rows.length : plotWidth
  // Két oszlop ≈ a sáv 72%-a: a csoportok között marad lélegzet, de a vékony
  // „tűoszlop" (0,32) helyett olvasható tömeg marad (Carbon grouped bar).
  const barWidth = Math.max(6, groupWidth * 0.36)
  const barGap = Math.max(2, groupWidth * 0.04)

  return (
    <div style={chartCardStyle}>
      <div style={chartScrollStyle}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={chartLabel(rows)}
          style={svgStyle}
        >
          <title>{chartLabel(rows)}</title>
          <defs>
            {/* Átlós csíkozás a szakmai ágnak — a hézag a téma háttérszíne,
              így világos és sötét témában is kontrasztos marad (WCAG 1.4.1:
              a szín mellett a mintázat is megkülönböztet). */}
            <pattern
              id="ker-stat-szakmai-minta"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect
                width="4"
                height="4"
                fill="var(--kc-as-diagram-szakmai, var(--theme-elevation-800))"
              />
              <rect width="1.5" height="4" fill="var(--kc-as-surface-raised, var(--theme-bg))" />
            </pattern>
          </defs>
          {tickValues.map((value) => {
            const y = baselineY - (value / scaleMax) * plotHeight
            return (
              <g key={value}>
                {value > 0 ? (
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotWidth}
                    y2={y}
                    stroke="var(--kc-as-hairline, var(--theme-elevation-150))"
                    strokeWidth="1"
                  />
                ) : null}
                <text
                  x={padLeft - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--kc-as-text-muted, var(--theme-elevation-650))"
                  fontSize="12"
                >
                  {tickLabelHuf(value)}
                </text>
              </g>
            )
          })}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={baselineY}
            stroke="var(--kc-as-hairline-strong, var(--theme-elevation-400))"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={baselineY}
            x2={padLeft + plotWidth}
            y2={baselineY}
            stroke="var(--kc-as-hairline-strong, var(--theme-elevation-400))"
            strokeWidth="1"
          />
          {rows.map((row, index) => {
            const groupX = padLeft + index * groupWidth
            const laikusHeight = (row.laikusHuf / scaleMax) * plotHeight
            const szakemberHeight = (row.szakemberHuf / scaleMax) * plotHeight
            const laikusX = groupX + groupWidth * 0.1
            const szakemberX = laikusX + barWidth + barGap
            const label = formatMonthLabel(row.month)
            const tickX = groupX + groupWidth / 2
            // Évszám csak ott, ahol tényleg informál: az első oszlopnál és
            // évváltásnál (Carbon „landmark label", félkövérrel).
            const showYear = index === 0 || row.month.endsWith('-01')
            return (
              <g key={row.month}>
                {laikusHeight > 0 ? (
                  <rect
                    x={laikusX}
                    y={baselineY - laikusHeight}
                    width={barWidth}
                    height={laikusHeight}
                    fill="var(--kc-as-diagram-otthoni, var(--theme-success-500))"
                  >
                    <title>{`${label}, otthoni: ${formatHuf(row.laikusHuf)}`}</title>
                  </rect>
                ) : null}
                {szakemberHeight > 0 ? (
                  <rect
                    x={szakemberX}
                    y={baselineY - szakemberHeight}
                    width={barWidth}
                    height={szakemberHeight}
                    fill="url(#ker-stat-szakmai-minta)"
                    stroke="var(--kc-as-diagram-szakmai, var(--theme-elevation-800))"
                    strokeWidth="1"
                  >
                    <title>{`${label}, szakmai: ${formatHuf(row.szakemberHuf)}`}</title>
                  </rect>
                ) : null}
                <text
                  x={tickX}
                  y={baselineY + 18}
                  textAnchor="middle"
                  fill="var(--kc-as-text-muted, var(--theme-elevation-650))"
                  fontSize="12"
                >
                  {formatMonthShort(row.month)}
                </text>
                {showYear ? (
                  <text
                    x={tickX}
                    y={baselineY + 34}
                    textAnchor="middle"
                    fill="var(--kc-as-text, var(--theme-elevation-800))"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {row.month.slice(0, 4)}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={legendStyle}>
        <span style={legendItemStyle}>
          <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
            <rect
              width="14"
              height="14"
              rx="2"
              fill="var(--kc-as-diagram-otthoni, var(--theme-success-500))"
            />
          </svg>
          Otthoni
        </span>
        <span style={legendItemStyle}>
          {/* Saját, kicsinyített mintázat-definíció: a jelmagyarázat így a
              diagram-SVG nélkül is önállóan helyes marad. */}
          <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
            <defs>
              <pattern
                id="ker-stat-szakmai-jel"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect
                  width="4"
                  height="4"
                  fill="var(--kc-as-diagram-szakmai, var(--theme-elevation-800))"
                />
                <rect width="1.5" height="4" fill="var(--kc-as-surface-raised, var(--theme-bg))" />
              </pattern>
            </defs>
            <rect
              width="13"
              height="13"
              x="0.5"
              y="0.5"
              rx="2"
              fill="url(#ker-stat-szakmai-jel)"
              stroke="var(--kc-as-diagram-szakmai, var(--theme-elevation-800))"
              strokeWidth="1"
            />
          </svg>
          Szakmai
        </span>
      </div>
    </div>
  )
}
