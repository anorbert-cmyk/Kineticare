import { AUDIENCE_LABELS } from '../../../lib/course-audience'
import { formatHuf, type CourseRevenueRow } from '../../../lib/statistics/revenue'
import {
  captionStyle,
  noticeStyle,
  numericStyle,
  rowHeaderStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thNumericStyle,
  thStyle,
} from './styles'

/** Bevétel kurzusonként — a 12 hónapos ablakon belüli fizetett tételekből. */
export function CourseRevenueTable({ rows }: { rows: readonly CourseRevenueRow[] }) {
  if (rows.length === 0) {
    return <p style={noticeStyle}>Ebben az időszakban még nincs fizetett kurzus-tétel.</p>
  }
  return (
    /* role="region" + aria-labelledby + tabIndex: a keskeny viewporton
       görgethető tábla billentyűzetről is görgethető legyen (WCAG 2.1.1;
       axe: scrollable-region-focusable; minta: Adrian Roselli,
       Under-Engineered Responsive Tables —
       https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html). */
    <div
      style={tableWrapStyle}
      role="region"
      aria-labelledby="kc-stat-kurzus-bevetel-cim"
      tabIndex={0}
    >
      <table style={tableStyle}>
        <caption style={captionStyle} id="kc-stat-kurzus-bevetel-cim">
          Bevétel kurzusonként, ugyanabban a 12 hónapban
        </caption>
        <thead>
          <tr>
            <th style={thStyle} scope="col">
              Kurzus
            </th>
            <th style={thStyle} scope="col">
              Ág
            </th>
            <th style={thNumericStyle} scope="col">
              Bevétel
            </th>
            <th style={thNumericStyle} scope="col">
              Rendelések
            </th>
            <th style={thNumericStyle} scope="col">
              Ingyenes tétel
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sku}>
              <th style={rowHeaderStyle} scope="row">
                {row.sku}
              </th>
              <td style={tdStyle}>{AUDIENCE_LABELS[row.audience]}</td>
              <td style={numericStyle}>{formatHuf(row.revenueHuf)}</td>
              <td style={numericStyle}>{row.orderCount.toLocaleString('hu-HU')}</td>
              <td style={numericStyle}>{row.freeItemCount.toLocaleString('hu-HU')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
