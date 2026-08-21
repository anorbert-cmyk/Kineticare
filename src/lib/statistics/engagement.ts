import type { CourseEnrollment, CourseProgressStatRow } from '../admin/course-progress-stats'
import { buildCourseProgressStats } from '../admin/course-progress-stats'
import { normalizeAudience, type CourseAudience } from '../course-audience'
import type { Curriculum } from '../curriculum/curriculum'

/**
 * Kurzus-hatás aggregátor — eladás × haladás, kurzusonként (tiszta modul).
 *
 * ═══ MIÉRT NEM SZÁMOL SAJÁT SZÁMOKAT ═══
 * A kurzusonkénti sorok KIZÁRÓLAG a meglévő `buildCourseProgressStats`
 * `totals` blokkjából jönnek (src/lib/admin/course-progress-stats.ts) —
 * ugyanabból a számításból, amit a kurzus szerkesztőlapjának Kurzus-haladás
 * panelje mutat, és amelynek százaléka a vevő lejátszójával közös
 * (`summarizeCurriculum`). Ha itt saját képlet lenne, a statisztika és a
 * kurzuslap elcsúszhatna egymástól — ez a repo kőbe vésett elve, a
 * course-progress-stats fejkommentje mondja ki. Ez a modul csak leképez
 * és rendez.
 */

/** Egy kurzus hatás-sora a Statisztika nézet táblájában. */
export interface CourseEngagementRow {
  productId: number
  /** A kurzus emberi neve (displayTitle, ennek hiányában sku, végül #id). */
  title: string
  audience: CourseAudience
  /** Hányan férnek hozzá (users.purchases). */
  enrolled: number
  /** Közülük hányan kezdték el (legalább 1 kész lecke). */
  started: number
  /** Közülük hányan fejezték be. */
  completed: number
  /** Akik megvették (hozzáférnek), de egy leckét sem jelöltek késznek. */
  notStarted: number
  /** A hozzáférők százalékainak átlaga, egészre kerekítve (0–100). */
  averagePercent: number
  /** Befejezők aránya a hozzáférőkhöz mérve (0–100). */
  completionRateOfEnrolled: number
  /** Befejezők aránya az elkezdőkhöz mérve (0–100). */
  completionRateOfStarted: number
}

export interface CourseEngagementReport {
  courses: CourseEngagementRow[]
  /** Igaz, ha bármely lekérdezés a felső korlát miatt csonkolt. */
  truncated: boolean
  /**
   * Hány kurzus maradt ki technikai hiba miatt.
   *
   * A lekérdező kurzusonként kap hibát (rossz tananyag-szerkezet, egy
   * megbicsakló adatbázis-hívás), és a hibás kurzust ÁTUGORJA, hogy a
   * többiről szóló jelentés megmaradjon. A hiányzó sort viszont nem
   * hallgatjuk el: ez a szám vezeti ki a felületre.
   */
  skipped: number
}

/** Egy kurzus nyers bemenete — a lekérdező (engagement-query) állítja elő. */
export interface CourseEngagementInput {
  productId: number
  title: string
  audience: unknown
  curriculum: Curriculum
  enrollments: readonly CourseEnrollment[]
  progressRows: readonly CourseProgressStatRow[]
}

/** Egy kurzus hatás-sora a KÖZÖS összesítőből. */
export function buildCourseEngagementRow(input: CourseEngagementInput): CourseEngagementRow {
  const stats = buildCourseProgressStats({
    curriculum: input.curriculum,
    enrollments: input.enrollments,
    progressRows: input.progressRows,
  })
  return {
    productId: input.productId,
    title: input.title,
    audience: normalizeAudience(input.audience),
    enrolled: stats.totals.enrolled,
    started: stats.totals.started,
    completed: stats.totals.completed,
    notStarted: stats.totals.notStarted,
    averagePercent: stats.totals.averagePercent,
    completionRateOfEnrolled: stats.totals.completionRateOfEnrolled,
    completionRateOfStarted: stats.totals.completionRateOfStarted,
  }
}

/**
 * A teljes jelentés. A sorrend: legtöbb hozzáférő elöl (a bevétel-tábla
 * „legnagyobb elöl" mintája), azonos létszámnál magyar ábécé szerint —
 * determinisztikus, tesztelhető rendezés.
 */
export function buildCourseEngagementReport(
  inputs: readonly CourseEngagementInput[],
  options?: { truncated?: boolean; skipped?: number },
): CourseEngagementReport {
  const courses = inputs
    .map(buildCourseEngagementRow)
    .sort((a, b) => b.enrolled - a.enrolled || a.title.localeCompare(b.title, 'hu'))
  const skipped = typeof options?.skipped === 'number' && options.skipped > 0 ? options.skipped : 0
  return { courses, truncated: options?.truncated === true, skipped }
}
