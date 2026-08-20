import type { CSSProperties } from 'react'

import { AUDIENCE_LABELS } from '../../lib/course-audience'
import {
  STATISTICS_ACCESS_DENIED_MESSAGE,
  formatHuf,
  formatMonthLabel,
  type CourseRevenueRow,
  type OrderFunnelCounts,
  type RevenueReport,
  type RevenueTotals,
} from '../../lib/statistics/revenue'
import { RevenueChart } from './RevenueChart'

/**
 * A Statisztika nézet tiszta megjelenítője — a lekérdezés és a jogosultság
 * a StatisticsView-ban marad, hogy a teszt DefaultTemplate nélkül futhasson.
 */

const pageStyle: CSSProperties = {
  padding: 'calc(var(--base) * 1.5)',
  maxWidth: '64rem',
}

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 'calc(var(--base) * 0.5)',
}

const leadStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  marginTop: 0,
  marginBottom: 'calc(var(--base) * 1.25)',
  maxWidth: '42rem',
}

const cardRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
  gap: 'calc(var(--base) * 0.75)',
  marginBottom: 'calc(var(--base) * 1.5)',
}

const cardStyle: CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  padding: 'calc(var(--base) * 0.75)',
}

const cardLabelStyle: CSSProperties = {
  margin: 0,
  color: 'var(--theme-elevation-650)',
  fontSize: '0.85rem',
}

const cardValueStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '1.25rem',
  fontWeight: 600,
}

const sectionStyle: CSSProperties = {
  marginBottom: 'calc(var(--base) * 1.75)',
}

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.95rem',
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid var(--theme-elevation-250)',
  padding: '0.5rem 0.75rem 0.5rem 0',
  color: 'var(--theme-elevation-650)',
  fontWeight: 600,
}

const tdStyle: CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-100)',
  padding: '0.5rem 0.75rem 0.5rem 0',
}

const numericStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

const thNumericStyle: CSSProperties = {
  ...thStyle,
  textAlign: 'right',
}

const noticeStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  margin: 0,
}

export function StatisticsAccessDenied() {
  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Statisztika</h1>
      <p>{STATISTICS_ACCESS_DENIED_MESSAGE}</p>
    </div>
  )
}

function TotalsCards({ totals }: { totals: RevenueTotals }) {
  return (
    <div style={cardRowStyle}>
      <div style={cardStyle}>
        <p style={cardLabelStyle}>Összes bevétel (12 hónap)</p>
        <p style={cardValueStyle}>{formatHuf(totals.totalHuf)}</p>
      </div>
      <div style={cardStyle}>
        <p style={cardLabelStyle}>{AUDIENCE_LABELS.laikus}</p>
        <p style={cardValueStyle}>{formatHuf(totals.laikusHuf)}</p>
      </div>
      <div style={cardStyle}>
        <p style={cardLabelStyle}>{AUDIENCE_LABELS.szakember}</p>
        <p style={cardValueStyle}>{formatHuf(totals.szakemberHuf)}</p>
      </div>
      <div style={cardStyle}>
        <p style={cardLabelStyle}>Fizetett rendelések</p>
        <p style={cardValueStyle}>{totals.orderCount.toLocaleString('hu-HU')}</p>
      </div>
    </div>
  )
}

function MonthlyTable({ rows }: { rows: RevenueReport['months'] }) {
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <caption style={{ textAlign: 'left', captionSide: 'top', paddingBottom: '0.5rem' }}>
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
              <th style={tdStyle} scope="row">
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
  )
}

function CourseTable({ rows }: { rows: readonly CourseRevenueRow[] }) {
  if (rows.length === 0) {
    return <p style={noticeStyle}>Ebben az időszakban még nincs fizetett kurzus-tétel.</p>
  }
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <caption style={{ textAlign: 'left', captionSide: 'top', paddingBottom: '0.5rem' }}>
          Bevétel kurzusonként
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

function FunnelSection({ funnel }: { funnel: OrderFunnelCounts }) {
  const needsAttention = funnel.created + funnel.paymentPending + funnel.paymentFailed
  return (
    <div>
      <div style={cardRowStyle}>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>Fizetve</p>
          <p style={cardValueStyle}>{funnel.paid.toLocaleString('hu-HU')}</p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>Folyamatban (leadva / várakozik)</p>
          <p style={cardValueStyle}>
            {(funnel.created + funnel.paymentPending).toLocaleString('hu-HU')}
          </p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>Sikertelen fizetés</p>
          <p style={cardValueStyle}>{funnel.paymentFailed.toLocaleString('hu-HU')}</p>
        </div>
        <div style={cardStyle}>
          <p style={cardLabelStyle}>Megszakítva</p>
          <p style={cardValueStyle}>{funnel.cancelled.toLocaleString('hu-HU')}</p>
        </div>
      </div>
      <p style={noticeStyle}>
        {needsAttention === 0
          ? 'Nincs nyitott vagy sikertelen fizetés, ami beavatkozást kérne.'
          : `${needsAttention.toLocaleString('hu-HU')} rendelés vár még befejezésre vagy újrakezdésre (leadva, fizetésre vár, vagy a kártya nem ment át). A visszatérített rendelések nem számítanak bevételnek.`}
      </p>
    </div>
  )
}

export function StatisticsUnavailable() {
  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Statisztika</h1>
      <p>A kimutatás most nem tölthető be. Próbáld újra később.</p>
    </div>
  )
}

export function StatisticsReport({ report }: { report: RevenueReport }) {
  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Statisztika</h1>
      <p style={leadStyle}>
        Havi bevétel a számla teljesítési dátuma szerint (ha nincs számla, a rendelés leadásának
        budapesti hónapja). Csak a kifizetett rendelések számítanak. Az otthoni és a szakmai ág
        tételenként válik szét, mert egy kosárban mindkettő lehet.
      </p>
      {report.truncated ? (
        <p style={{ ...noticeStyle, marginBottom: 'calc(var(--base) * 1)' }}>
          A lista a felső korlát miatt csonka. A kimutatás a beolvasott rendeléseket mutatja, nem a
          teljes archívumot.
        </p>
      ) : null}
      <TotalsCards totals={report.totals} />
      <section style={sectionStyle}>
        <h2>Havi bevétel</h2>
        <RevenueChart rows={report.months} />
        <MonthlyTable rows={report.months} />
      </section>
      <section style={sectionStyle}>
        <h2>Kurzusonként</h2>
        <CourseTable rows={report.courses} />
      </section>
      <section style={sectionStyle}>
        <h2>Ami beavatkozást kérhet</h2>
        <FunnelSection funnel={report.funnel} />
      </section>
      <section style={sectionStyle}>
        <h2>Kurzus-haladás</h2>
        <p style={noticeStyle}>
          A hallgatónkénti százalék, a lemorzsolódás és az „ki kezdte el” lista a kurzus
          szerkesztőlapján, a Tananyag alatt van: nyisd meg a kurzust a Webshop → Kurzusok listából.
        </p>
      </section>
    </div>
  )
}
