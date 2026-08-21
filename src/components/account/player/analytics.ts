import {
  VIDEO_MILESTONE_PERCENTS,
  type VideoMilestonePercent,
} from '../../../lib/analytics/course-events'
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

/**
 * ═══ VIDEÓ-MÉLYSÉG: A RETESZ ══════════════════════════════════════════════
 *
 * A `video_started` leckénként EGYSZER, a `video_milestone` pedig leckénként
 * ÉS mérföldkövenként EGYSZER küldhető. Enélkül a tölcsér HAMIS képet ad: a
 * lejátszó `timeupdate` eseménye másodpercenként többször érkezik, tehát a
 * „25% fölött vagyunk" feltétel MINDEN eseménynél igaz maradna, és egyetlen
 * néző több tucat mérföldkő-eseményt termelne. Ugyanez a baj a
 * VISSZATEKERÉSNÉL: aki visszaugrik a videó elejére és újra előrehalad, a
 * küszöböket ÚJRA átlépi — retesz nélkül minden átlépés új eseményt szórna.
 *
 * A megoldás ugyanaz a minta, amit ez a modul már az `eventsForLessonCompletion`
 * mellett követ: a döntés tiszta, mellékhatás nélküli JS-ben él (DOM, React és
 * PostHog nélkül kimerítően tesztelhető), és CSAK A VÁLTOZÁSOKAT adja vissza —
 * a már elküldött mérföldköveket a követő nyilvántartja, és többé nem adja ki.
 * A GOV.UK GA4 videó-követője szó szerint ugyanezt teszi: méréskor „rögzíti,
 * hogy ez az esemény többé nem tüzelhet"
 * (https://docs.publishing.service.gov.uk/repos/govuk_publishing_components/analytics-ga4/trackers/ga4-video-tracker.html).
 *
 * MIT MÉR: a lejátszófej MÉLYSÉGÉT (pozíció / hossz). A ténylegesen megnézett
 * másodperceket a szkippelés-ellenes lefedettség-számláló méri
 * (src/lib/stream/watched-coverage.ts) — az hajtja a készre jelölést. A két
 * mérőszám szándékosan különbözik; az indoklás a
 * src/lib/analytics/course-events.ts videó-szakaszában áll.
 *
 * ÉLETCIKLUS: egy követő EGY leckéhez tartozik. A lejátszó leckénként tart
 * belőle egyet (useWatchTracking), így az előző lecke reteszei nem
 * szivárognak át a következőre, és a leckére VISSZATÉRÉS sem küld újra.
 */

/** Amit egy lejátszó-esemény KIVÁLTOTT — üres mezők = nincs teendő. */
export interface VideoDepthEvents {
  /** MOST bizonyosodott be, hogy a videó ténylegesen elindult. */
  started: boolean
  /** A MOST elért, még el nem küldött mérföldkövek, növekvő sorrendben. */
  milestones: VideoMilestonePercent[]
}

export interface VideoDepthTracker {
  /**
   * Új lejátszási pozíció a lejátszótól.
   *
   * @param seconds a lejátszófej pozíciója másodpercben
   * @param duration a videó hossza (a lejátszótól vagy a CMS-ből); `null`, ha
   *   ismeretlen — ilyenkor mérföldkő NEM számolható (a nevező hiányzik), az
   *   indulás viszont igen.
   */
  position(input: { seconds: number; duration: number | null }): VideoDepthEvents
  /** A videó végigfutott: a mélység 100%, a hátralévő mérföldkövek kimennek. */
  ended(): VideoDepthEvents
}

/** Nincs teendő — közös, mindig ÚJ tömböt adó válasz (a hívó nem írhat bele). */
function nincsEsemeny(): VideoDepthEvents {
  return { started: false, milestones: [] }
}

/** Használható-e a lejátszótól jött szám (a külső adatot sosem bízzuk meg). */
function ervenyesSzam(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function createVideoDepthTracker(): VideoDepthTracker {
  /** A RETESZ: ide kerül minden már KIADOTT mérföldkő. */
  const kiadott = new Set<VideoMilestonePercent>()
  /** A RETESZ az indulásra. */
  let elindult = false

  /** A mélységig elért, még ki nem adott mérföldkövek — és a retesz zárása. */
  const merfoldkovek = (percent: number): VideoMilestonePercent[] => {
    const ujak: VideoMilestonePercent[] = []
    for (const merfoldko of VIDEO_MILESTONE_PERCENTS) {
      if (percent >= merfoldko && !kiadott.has(merfoldko)) {
        kiadott.add(merfoldko)
        ujak.push(merfoldko)
      }
    }
    return ujak
  }

  return {
    position({ duration, seconds }) {
      if (!ervenyesSzam(seconds) || seconds < 0) {
        return nincsEsemeny()
      }
      // Az INDULÁS bizonyítéka az előrehaladó pozíció: a 0. másodperc még a
      // betöltött, de el nem indított lejátszó állapota is lehet.
      const start = !elindult && seconds > 0
      if (start) {
        elindult = true
      }
      if (!ervenyesSzam(duration) || duration <= 0) {
        // Ismeretlen hossz mellett a százalék hazugság lenne (ugyanaz az elv,
        // mint a lefedettség-számlálóban): mérföldkő nélkül térünk vissza.
        return { started: start, milestones: [] }
      }
      return { started: start, milestones: merfoldkovek((seconds / duration) * 100) }
    },

    ended() {
      // A `started` itt is latch-elődik: mérföldkő nem mehet ki a tölcsér
      // ELSŐ lépése nélkül, különben a lefutás értelmezhetetlen lenne.
      const start = !elindult
      elindult = true
      return { started: start, milestones: merfoldkovek(100) }
    },
  }
}
