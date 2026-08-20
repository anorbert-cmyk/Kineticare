import type { CSSProperties } from 'react'

import { formatHuf, formatMonthLabel, type MonthlyRevenueRow } from '../../lib/statistics/revenue'

/**
 * Havi bevétel oszlopdiagram — kézzel rajzolt SVG, nincs chart-könyvtár.
 *
 * A számokat a táblázat hordozza (képernyőolvasó); az SVG `role="img"` +
 * `aria-label`. A színek Payload admin CSS-változók, hogy sötét témában is
 * olvasható maradjanak.
 */

const svgStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: '52rem',
  height: 'auto',
}

interface RevenueChartProps {
  rows: readonly MonthlyRevenueRow[]
}

function chartLabel(rows: readonly MonthlyRevenueRow[]): string {
  const months = rows.map((row) => formatMonthLabel(row.month)).join(', ')
  return `Havi bevétel oszlopdiagram, otthoni és szakmai ág. Hónapok: ${months}.`
}

export function RevenueChart({ rows }: RevenueChartProps) {
  const width = 720
  const height = 280
  const padLeft = 48
  const padRight = 16
  const padTop = 16
  const padBottom = 56
  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom
  const maxValue = rows.reduce((max, row) => Math.max(max, row.laikusHuf, row.szakemberHuf), 0)
  const scaleMax = maxValue > 0 ? maxValue : 1
  const groupWidth = rows.length > 0 ? plotWidth / rows.length : plotWidth
  const barWidth = Math.max(4, groupWidth * 0.32)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={chartLabel(rows)}
      style={svgStyle}
    >
      <title>{chartLabel(rows)}</title>
      <line
        x1={padLeft}
        y1={padTop}
        x2={padLeft}
        y2={padTop + plotHeight}
        stroke="var(--theme-elevation-400)"
        strokeWidth="1"
      />
      <line
        x1={padLeft}
        y1={padTop + plotHeight}
        x2={padLeft + plotWidth}
        y2={padTop + plotHeight}
        stroke="var(--theme-elevation-400)"
        strokeWidth="1"
      />
      {rows.map((row, index) => {
        const groupX = padLeft + index * groupWidth
        const laikusHeight = (row.laikusHuf / scaleMax) * plotHeight
        const szakemberHeight = (row.szakemberHuf / scaleMax) * plotHeight
        const laikusX = groupX + groupWidth * 0.14
        const szakemberX = laikusX + barWidth + groupWidth * 0.06
        const label = formatMonthLabel(row.month)
        return (
          <g key={row.month}>
            <rect
              x={laikusX}
              y={padTop + plotHeight - laikusHeight}
              width={barWidth}
              height={laikusHeight}
              fill="var(--theme-success-500)"
            >
              <title>{`${label}, otthoni: ${formatHuf(row.laikusHuf)}`}</title>
            </rect>
            <rect
              x={szakemberX}
              y={padTop + plotHeight - szakemberHeight}
              width={barWidth}
              height={szakemberHeight}
              fill="var(--theme-elevation-800)"
            >
              <title>{`${label}, szakmai: ${formatHuf(row.szakemberHuf)}`}</title>
            </rect>
            <text
              x={groupX + groupWidth / 2}
              y={height - 28}
              textAnchor="middle"
              fill="var(--theme-elevation-800)"
              fontSize="10"
            >
              {label.replace(/\s+/g, ' ')}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
