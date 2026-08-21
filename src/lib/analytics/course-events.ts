import { ANALYTICS_EVENTS, captureAnalyticsEvent } from './posthog'

/**
 * A TANULÁSI funnel eseményei — típusos, egy helyen összefogott küldők.
 *
 * ═══ MIÉRT KÜLÖN MODUL ═══
 * A lejátszó kliens-komponensének nem szabad tudnia, hogyan épül fel egy
 * PostHog-esemény: itt dől el az eseménynév, a tulajdonság-készlet és — ami a
 * legfontosabb — hogy MI NEM MEHET KI. A komponens csak annyit lát, hogy
 * „lecke elkészült"; a szerződést ez a modul őrzi, és ez tesztelhető is
 * (src/__tests__/analytics/course-events.test.ts).
 *
 * ═══ ADATVÉDELEM ═══
 * A tulajdonságok KIZÁRÓLAG technikai azonosítók és számok lehetnek:
 * kurzus-azonosító, kurzus-sku, lecke-ref (BSON ObjectID), lecketípus,
 * modul-sorszám, százalék. E-mail, név, IP vagy bármely személyes adat SOHA —
 * az esemény harmadik félhez (PostHog) megy ki. A modul szűk típusai ezt
 * szerkezetileg is kikényszerítik: a hívó nem tud tetszőleges mezőt átadni.
 *
 * ═══ CONSENT ═══
 * A `captureAnalyticsEvent` no-op, amíg az analitika nincs bekapcsolva
 * (hozzájárulás + PostHog-kulcs), ezért ezek a hívók hozzájárulás nélkül
 * csendben nem csinálnak semmit. A hívó helyeken NEM kell külön consent-kaput
 * építeni.
 *
 * ═══ IDEMPOTENCIA ═══
 * A `course_started` és a `course_completed` KURZUSONKÉNT EGYSZER küldendő. A
 * hívó felelőssége eldönteni, hogy az adott átmenet MOST történt-e (a
 * lejátszó a haladás-összegzés `started`/`complete` mezőinek VÁLTOZÁSÁRA
 * figyel, nem az állapotára) — enélkül minden oldalbetöltés újraküldené, és a
 * funnel használhatatlanná válna.
 */

/** Minden tanulási eseményen ott lévő kurzus-azonosítás. */
export interface CourseEventCourse {
  courseId: number
  courseSku?: string | null
}

export interface LessonEventInput extends CourseEventCourse {
  /** A lecke STABIL refje (BSON ObjectID vagy Bunny-GUID) — nem személyes adat. */
  lessonRef: string
  lessonKind: 'video' | 'szoveg' | 'link'
  /** 0-alapú modul-sorszám a tananyagban. */
  moduleIndex: number
  /** A kurzus haladása a jelölés UTÁN, egész százalékban. */
  percent: number
}

const courseProps = (input: CourseEventCourse): Record<string, unknown> => ({
  courseId: input.courseId,
  // A null/undefined sku ne kerüljön ki üres mezőként.
  ...(typeof input.courseSku === 'string' && input.courseSku.length > 0
    ? { courseSku: input.courseSku }
    : {}),
})

/**
 * A tanuló ELKEZDTE a kurzust — az első lecke elkészültekor, kurzusonként
 * EGYSZER. (Szándékosan nem a lejátszó megnyitásakor: a puszta megnyitás
 * felfújná a „start rate"-et, és eltérne az admin haladás-nézet
 * definíciójától, ahol az „elkezdte" = legalább egy kész lecke.)
 */
export function trackCourseStarted(input: CourseEventCourse): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.courseStarted, courseProps(input))
}

/** Egy lecke elkészült (kézzel jelölve vagy automatikusan, nézettség alapján). */
export function trackLessonCompleted(input: LessonEventInput): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.lessonCompleted, {
    ...courseProps(input),
    lessonRef: input.lessonRef,
    lessonKind: input.lessonKind,
    moduleIndex: input.moduleIndex,
    percent: input.percent,
  })
}

/** Egy modul MINDEN elindítható leckéje elkészült. */
export function trackModuleCompleted(
  input: CourseEventCourse & { moduleIndex: number; percent: number },
): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.moduleCompleted, {
    ...courseProps(input),
    moduleIndex: input.moduleIndex,
    percent: input.percent,
  })
}

/** A kurzus MINDEN elindítható leckéje elkészült — kurzusonként EGYSZER. */
export function trackCourseCompleted(
  input: CourseEventCourse & { lessonCount: number },
): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.courseCompleted, {
    ...courseProps(input),
    lessonCount: input.lessonCount,
  })
}

/**
 * ═══ VIDEÓ-MÉLYSÉG ════════════════════════════════════════════════════════
 *
 * MIÉRT KELL A `lesson_completed` MELLÉ. A `lesson_completed` csak a lecke
 * VÉGÉT jelzi, tehát a tölcsér a „megnyitotta" és a „befejezte" közt egyetlen
 * nagy, átláthatatlan lépés. A lemorzsolódás viszont épp itt történik: a
 * kérdés az, hogy MEDDIG jutottak el a videóban. A négy mérföldkő ezt a
 * szakaszt bontja mérhető lépésekre.
 *
 * MIT MÉR PONTOSAN: a LEJÁTSZÓFEJ elért MÉLYSÉGÉT (pozíció / hossz) — nem a
 * ténylegesen megnézett másodperceket. A kettő szándékosan KÜLÖNBÖZIK, és
 * kiegészíti egymást:
 *  - a mélység a „meddig jutott el" kérdésre válaszol (tölcsér, lemorzsolódás);
 *  - a szkippelés-ellenes LEFEDETTSÉG (src/lib/stream/watched-coverage.ts) a
 *    „tényleg megnézte-e" kérdésre — ez hajtja az automatikus készre jelölést
 *    és rajta keresztül a `lesson_completed`-et.
 * Ha a mélységet is lefedettségre alapoznánk, a 100%-os mérföldkő gyakorlatilag
 * SOSEM teljesülne (a videók végén stáblista, elköszönés van — a készre
 * jelölés is ezért 90%-nál húzza a határt), tehát a tölcsér utolsó lépése
 * tartósan nulla maradna.
 *
 * A KÜSZÖBÖK és a „mérföldkövenként EGYSZER" szabály a bevett sztenderdet
 * követi: a GOV.UK GA4 videó-követője a 25/50/75%-ot és a videó végét méri, és
 * „ezek az események videónként és oldalanként CSAK EGYSZER tüzelnek" — a
 * visszatekerés tehát nem küldi újra őket
 * (https://docs.publishing.service.gov.uk/repos/govuk_publishing_components/analytics-ga4/trackers/ga4-video-tracker.html).
 * A GA4 saját `video_progress` eseménye ugyanezt a `video_percent` alapú,
 * mérföldkövenként egyszeri sémát használja. A RETESZ maga nem itt, hanem a
 * hívó oldalán, tiszta és tesztelhető formában él
 * (src/components/account/player/analytics.ts — `createVideoDepthTracker`).
 */

/** A mért videó-mélységek százalékban. A riportok pontosan ezekre bontanak. */
export const VIDEO_MILESTONE_PERCENTS = [25, 50, 75, 100] as const

/** Egy mérföldkő százaléka. Szűk unió: tetszőleges számot a típus nem enged át. */
export type VideoMilestonePercent = (typeof VIDEO_MILESTONE_PERCENTS)[number]

/** A videó-események közös azonosítása: melyik kurzus melyik leckéje. */
export interface VideoEventInput extends CourseEventCourse {
  /** A lecke STABIL refje (BSON ObjectID vagy Bunny-GUID) — nem személyes adat. */
  lessonRef: string
}

/**
 * A lecke videója TÉNYLEGESEN elindult — leckénként EGYSZER.
 *
 * Nem a lecke megnyitása: a megnyitás felfújná a számot (aki csak
 * belekattint, elindítottnak látszana), és a mérföldkövek nevezője hamis
 * lenne. Az indulás bizonyítéka a lejátszótól érkező, ELŐREHALADÓ pozíció.
 */
export function trackVideoStarted(input: VideoEventInput): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.videoStarted, {
    ...courseProps(input),
    lessonRef: input.lessonRef,
  })
}

/** Egy videó-mélység mérföldkő — leckénként és mérföldkövenként EGYSZER. */
export function trackVideoMilestone(
  input: VideoEventInput & { percent: VideoMilestonePercent },
): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.videoMilestone, {
    ...courseProps(input),
    lessonRef: input.lessonRef,
    percent: input.percent,
  })
}
