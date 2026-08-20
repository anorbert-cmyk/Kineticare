import type { CourseEngagementReport } from '../../lib/statistics/engagement'
import { STATISTICS_ACCESS_DENIED_MESSAGE, type RevenueReport } from '../../lib/statistics/revenue'
import { CourseEngagementSection } from './statistics/CourseEngagementSection'
import { CourseRevenueTable } from './statistics/CourseRevenueTable'
import { FunnelSection } from './statistics/FunnelSection'
import { MonthlyRevenueSection } from './statistics/MonthlyRevenueSection'
import { headingStyle, leadStyle, noticeStyle, pageStyle, sectionStyle } from './statistics/styles'
import { TotalsCards } from './statistics/TotalsCards'

/**
 * A Statisztika nézet KOMPOZÍCIÓS GYÖKERE — a lekérdezés és a jogosultság a
 * StatisticsView-ban marad, hogy a teszt DefaultTemplate nélkül futhasson.
 *
 * A szekciók önálló komponensek a ./statistics mappában (styles.ts a közös
 * stílus-tokenekkel), így egy-egy szekció külön karbantartható és külön
 * tesztelhető; ez a fájl csak a sorrendet és az oldalszintű szövegeket adja.
 * A vizuális nyelv és a reszponzivitás indoklása (forrás-URL-ekkel):
 * ./statistics/styles.ts fejkommentje.
 */

export function StatisticsAccessDenied() {
  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Statisztika</h1>
      <p>{STATISTICS_ACCESS_DENIED_MESSAGE}</p>
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

/**
 * A teljes kimutatás. Az `engagement` hiánya (null/undefined) NEM dönti el az
 * oldalt: a bevételi szekciók változatlanul megjelennek, a Kurzus-hatás
 * helyén magyar magyarázat áll — a részleges adat is több, mint a semmi.
 */
export function StatisticsReport({
  report,
  engagement,
}: {
  report: RevenueReport
  engagement?: CourseEngagementReport | null
}) {
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
      <MonthlyRevenueSection rows={report.months} />
      <section style={sectionStyle}>
        <h2>Kurzusonként</h2>
        <CourseRevenueTable rows={report.courses} />
      </section>
      <FunnelSection funnel={report.funnel} />
      {/* A korábbi, link nélküli „Kurzus-haladás" záró szekciót ez a szekció
          váltja: a haladás-összesítő már itt, táblázatban látszik, a
          hallgatónkénti névsorhoz pedig soronkénti link visz a kurzus
          lapjára — a szöveges útbaigazítás a szekció alján él tovább. */}
      <CourseEngagementSection engagement={engagement} />
    </div>
  )
}
