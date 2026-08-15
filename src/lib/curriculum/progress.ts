import { toWatchedRefSet } from '../course-progress/progress'
import type { Curriculum, CurriculumLesson } from './curriculum'

/**
 * A tananyag HALADÁS-SZÁMÍTÁSA — tiszta, DB- és React-mentes modul.
 *
 * A lejátszó, a kurzusaim-lista és az admin haladás-nézete KIZÁRÓLAG ezt
 * használja, így a felületen és az adminban ugyanaz a szám jelenik meg.
 *
 * SZABÁLYOK (a régi src/lib/course-progress/progress.ts-ből átvéve, mert
 * mindegyik éles szélsőséges esetet fed):
 * - A haladás mindig a JELENLEGI tananyaghoz mérődik. Az időközben törölt
 *   leckére mutató (ORPHAN) haladás-sor sem a számlálóba, sem a nevezőbe nem
 *   számít bele — enélkül „8/7 lecke kész" típusú állapotok keletkeznének.
 * - A nevező az ELINDÍTHATÓ leckék száma: a feldolgozás alatti videót a vevő
 *   nem tudja megnézni, tehát nem is várható el tőle.
 * - Üres tananyag: nincs osztás nullával, a százalék 0.
 * - Duplikált haladás-sor nem torzíthat: a refek halmazba kerülnek.
 */

export interface ModuleProgress {
  /** A modul elindítható leckéinek száma. */
  total: number
  /** Ebből hány kész. */
  completed: number
  /** A modul minden elindítható leckéje kész (0 leckés modulnál false). */
  complete: boolean
}

export interface CurriculumProgress {
  /** Az elindítható leckék száma a teljes kurzuson. */
  total: number
  /** Ebből hány van késznek jelölve. */
  completed: number
  /** Kerekített százalék, 0–100. Üres tananyagnál 0. */
  percent: number
  /** „3/7 lecke kész" — a lejátszó fejlécébe; üres tananyagnál a `NO_LESSONS_LABEL`. */
  label: string
  /** „3/7 kész" — a kurzuskártya visszafogott meta-sorába. */
  shortLabel: string
  /** Minden elindítható lecke kész (üres tananyagnál false). */
  complete: boolean
  /** Elkezdte-e egyáltalán (legalább egy kész lecke). */
  started: boolean
  /** Modulonkénti bontás — a `curriculum.modules` sorrendjében. */
  byModule: ModuleProgress[]
  /**
   * A FOLYTATÁSHOZ ajánlott lecke: az első elindítható, még nem kész lecke a
   * megjelenítési sorrendben. Ha minden kész, az ELSŐ elindítható lecke
   * (újranézéshez); ha nincs elindítható lecke, `null`.
   */
  resumeLesson: CurriculumLesson | null
}

/** Üres tananyag felirata — mindenhol ugyanaz. */
export const NO_LESSONS_LABEL = 'Még nincs tananyag'

/**
 * Egy kurzus haladás-összegzése a JELENLEGI tananyagból és a kész leckék
 * refjeiből. A `watchedRefs` bármilyen iterálható (tömb vagy Set) lehet.
 */
export function summarizeCurriculum(
  curriculum: Curriculum,
  watchedRefs: Iterable<string | null | undefined>,
): CurriculumProgress {
  const watched = toWatchedRefSet([...watchedRefs])

  const byModule: ModuleProgress[] = []
  let total = 0
  let completed = 0
  let resumeLesson: CurriculumLesson | null = null
  let firstPlayable: CurriculumLesson | null = null

  for (const kurzusModul of curriculum.modules) {
    let moduleTotal = 0
    let moduleCompleted = 0
    for (const lesson of kurzusModul.lessons) {
      if (!lesson.playable) {
        continue
      }
      moduleTotal += 1
      if (firstPlayable === null) {
        firstPlayable = lesson
      }
      if (watched.has(lesson.ref)) {
        moduleCompleted += 1
      } else if (resumeLesson === null) {
        resumeLesson = lesson
      }
    }
    total += moduleTotal
    completed += moduleCompleted
    byModule.push({
      total: moduleTotal,
      completed: moduleCompleted,
      complete: moduleTotal > 0 && moduleCompleted === moduleTotal,
    })
  }

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return {
    total,
    completed,
    percent,
    label: total === 0 ? NO_LESSONS_LABEL : `${completed}/${total} lecke kész`,
    shortLabel: total === 0 ? NO_LESSONS_LABEL : `${completed}/${total} kész`,
    complete: total > 0 && completed === total,
    started: completed > 0,
    byModule,
    // Minden kész → az első leckére mutatunk vissza (újranézés), nem semmire.
    resumeLesson: resumeLesson ?? firstPlayable,
  }
}
