import {
  formatHuf,
  formatMonthLabel,
  type MonthlyRevenueRow,
} from '../../../lib/statistics/revenue'
import { RevenueChart } from '../RevenueChart'
import {
  captionStyle,
  numericStyle,
  rowHeaderStyle,
  sectionStyle,
  tableStyle,
  tableWrapStyle,
  thNumericStyle,
  thStyle,
} from './styles'

/**
 * „Havi bevétel" szekció: oszlopdiagram + havi táblázat. A kettő UGYANAZT az
 * adatot mutatja — a diagram a trendhez, a táblázat a pontos értékekhez és a
 * képernyőolvasónak (a diagram `role="img"`, a számok itt olvashatók fel).
 */
export function MonthlyRevenueSection({ rows }: { rows: readonly MonthlyRevenueRow[] }) {
  return (
    <section style={sectionStyle}>
      <h2>Havi bevétel</h2>
      <RevenueChart rows={rows} />
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <caption style={captionStyle}>
            Havi bevétel otthoni és szakmai bontásban, forintban
          </caption>
          <thead>
            <tr>
              <th style={thStyle} scope="col">
                Hónap
              </th>
              <th style={thNumericStyle} scope="col">
                Otthoni
              </th>
              <th style={thNumericStyle} scope="col">
                Szakmai
              </th>
              <th style={thNumericStyle} scope="col">
                Összesen
              </th>
              <th style={thNumericStyle} scope="col">
                Rendelések
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <th style={rowHeaderStyle} scope="row">
                  {formatMonthLabel(row.month)}
                </th>
                <td style={numericStyle}>{formatHuf(row.laikusHuf)}</td>
                <td style={numericStyle}>{formatHuf(row.szakemberHuf)}</td>
                <td style={numericStyle}>{formatHuf(row.totalHuf)}</td>
                <td style={numericStyle}>{row.orderCount.toLocaleString('hu-HU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
