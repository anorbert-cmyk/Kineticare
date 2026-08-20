import { AUDIENCE_LABELS } from '../../../lib/course-audience'
import { formatHuf, type CourseRevenueRow } from '../../../lib/statistics/revenue'
import {
  captionStyle,
  noticeStyle,
  numericStyle,
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
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <caption style={captionStyle}>Bevétel kurzusonként, ugyanabban a 12 hónapban</caption>
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
              <th style={tdStyle} scope="row">
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
