import type { CurriculumProgress } from '../../../lib/curriculum/progress'

/**
 * A tanulási funnel esemény-DÖNTÉSEI — tiszta, mellékhatás nélküli modul.
 *
 * ═══ MIÉRT KÜLÖN ═══
 * Az „elkezdte" és a „befejezte" eseményt kurzusonként PONTOSAN EGYSZER szabad
 * elküldeni. A gyakori hiba az, hogy a felület az ÁLLAPOTRA figyel („kész-e a
 * kurzus?") az ÁTMENET helyett („most lett kész?") — ilyenkor minden
 * oldalbetöltés újraküldi az eseményt, és a funnel használhatatlanná válik.
 * Ez a modul ezért két haladás-pillanatképet vet össze (a jelölés ELŐTT és
 * UTÁN), és csak a VÁLTOZÁSOKAT adja vissza. A szabály így DOM és PostHog
 * nélkül, kimerítően tesztelhető.
 *
 * A tényleges küldés az src/lib/analytics/course-events.ts hívóin megy, amelyek
 * hozzájárulás nélkül csendben no-opok.
 */
export interface LessonCompletionEvents {
  /** Ez volt a kurzus ELSŐ kész leckéje. */
  courseStarted: boolean
  /** Ezzel a leckével lett kész egy modul — a modul 0-alapú sorszáma. */
  completedModuleIndex: number | null
  /** Ezzel a leckével lett kész a TELJES kurzus. */
  courseCompleted: boolean
}

/**
 * Melyik mérföldkő-eseményeket váltotta ki egy lecke elkészülte.
 *
 * @param before a haladás a jelölés ELŐTT
 * @param after  a haladás a jelölés UTÁN
 * @param moduleIndex a most elkészült lecke moduljának 0-alapú sorszáma
 */
export function eventsForLessonCompletion(input: {
  before: CurriculumProgress
  after: CurriculumProgress
  moduleIndex: number | null
}): LessonCompletionEvents {
  const { after, before, moduleIndex } = input

  const modulLettKesz =
    moduleIndex !== null &&
    before.byModule[moduleIndex]?.complete === false &&
    after.byModule[moduleIndex]?.complete === true

  return {
    courseStarted: !before.started && after.started,
    completedModuleIndex: modulLettKesz ? moduleIndex : null,
    courseCompleted: !before.complete && after.complete,
  }
}
