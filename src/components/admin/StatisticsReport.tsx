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

const pageStyle: CSSProperties = {
  padding: 'calc(var(--base) * 1.5)',
  maxWidth: '64rem',
}

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 'calc(var(--base) * 0.5)',
}

/* 42rem ≈ 75 karakter magyar szöveggel — a 45–85 karakteres olvasható
   sorhossz-sávon belül (docs/ui-sztenderdek.md, tervezési skill 3. pont). */
const leadStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  marginTop: 0,
  marginBottom: 'calc(var(--base) * 1.25)',
  maxWidth: '42rem',
}

const cardRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(var(--base) * 0.5)',
  marginBottom: 'calc(var(--base) * 1.5)',
}

const cardStyle: CSSProperties = {
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
const cardValueStyle: CSSProperties = {
  display: 'block',
  fontSize: '1.5rem',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  lineHeight: 1.2,
}

const cardLabelStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  display: 'block',
}

const sectionStyle: CSSProperties = {
  marginBottom: 'calc(var(--base) * 1.75)',
}

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  width: '100%',
}

/* A minWidth garantálja, hogy az 5 oszlop sose préselődjön olvashatatlanra:
   keskeny viewporton a tableWrap görget, nem a lap (WCAG 1.4.10 / G225,
   ugyanaz a minta, mint a CourseProgressPanel 46rem-es táblája). */
const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: '36rem',
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

/**
 * Összesítő kártya — a CourseProgressPanel StatCard mintája (érték felül,
 * címke alul). A `valueColor` a figyelmet kérő értéknek szól (pl. sikertelen
 * fizetés): a szín KIEGÉSZÍTŐ jelzés, az információt maga a címke szövege
 * hordozza (WCAG 2.2 SC 1.4.1 Use of Color:
 * https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
 */
function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div style={cardStyle}>
      <span
        style={valueColor === undefined ? cardValueStyle : { ...cardValueStyle, color: valueColor }}
      >
        {value}
      </span>
      <span style={cardLabelStyle}>{label}</span>
    </div>
  )
}

function TotalsCards({ totals }: { totals: RevenueTotals }) {
  return (
    <div style={cardRowStyle}>
      <StatCard label="Összes bevétel (12 hónap)" value={formatHuf(totals.totalHuf)} />
      <StatCard label={AUDIENCE_LABELS.laikus} value={formatHuf(totals.laikusHuf)} />
      <StatCard label={AUDIENCE_LABELS.szakember} value={formatHuf(totals.szakemberHuf)} />
      <StatCard label="Fizetett rendelések" value={totals.orderCount.toLocaleString('hu-HU')} />
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
        <StatCard label="Fizetve" value={funnel.paid.toLocaleString('hu-HU')} />
        <StatCard
          label="Folyamatban (leadva / várakozik)"
          value={(funnel.created + funnel.paymentPending).toLocaleString('hu-HU')}
        />
        {/* A nullánál nagyobb sikertelen fizetés a Payload saját hibaszínét
            kapja (--theme-error-500 — ugyanaz a token, amit a
            CourseProgressPanel hibaüzenete használ), a jelentést a címke
            szövege hordozza, nem a szín (WCAG 1.4.1). */}
        <StatCard
          label="Sikertelen fizetés"
          value={funnel.paymentFailed.toLocaleString('hu-HU')}
          valueColor={funnel.paymentFailed > 0 ? 'var(--theme-error-500)' : undefined}
        />
        <StatCard label="Megszakítva" value={funnel.cancelled.toLocaleString('hu-HU')} />
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
