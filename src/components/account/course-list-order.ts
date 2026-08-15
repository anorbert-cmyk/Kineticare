import { toWatchedRefSet } from '../../lib/course-progress/progress'
import type { Curriculum, CurriculumLesson } from '../../lib/curriculum/curriculum'
import { NO_LESSONS_LABEL, summarizeCurriculum } from '../../lib/curriculum/progress'
import type { CourseCover } from '../../lib/courses'

/**
 * A „Kurzusaim" lista TISZTA logikája — állapotgép, sorrend, feliratok.
 *
 * ═══ MIÉRT KÜLÖN MODUL ═══
 * A belépés utáni első képernyő egyetlen kérdésre válaszol: „hol tartok, és hol
 * folytassam?". Az ehhez szükséges döntések (melyik kurzus melyik csoportba
 * esik, mi álljon a gombon, mennyi van hátra) MIND adat→adat leképezések. Ha
 * ezek a JSX-ben élnének, csak teljes React-rendereléssel lennének
 * ellenőrizhetők; itt viszont React, DB és Payload nélkül, kimerítően
 * egységtesztelhetők (src/__tests__/course-list-ui.test.ts). A `CourseList.tsx`
 * ezért SEMMIT nem számol: kész `CourseCardView` objektumokat rajzol ki.
 *
 * ═══ A HALADÁS FORRÁSA ═══
 * KIZÁRÓLAG a tananyag-modell (`buildCurriculum` + `summarizeCurriculum`). A
 * korábbi lista a nyers `products.videos` tömbből számolt „3/7 megnézve"-t; az
 * a szám a modulokra bontott kurzusoknál már nem egyezett volna a lejátszóéval.
 * Egy igazságforrás van, és az a `src/lib/curriculum/`.
 *
 * ═══ A CSOPORTOSÍTÁS INDOKA ═══
 * A vevő nem „kurzusokat" keres, hanem a FOLYTATÁST. Ezért:
 *   1. folyamatban lévő kurzusok elöl (itt a legnagyobb a visszatérési szándék),
 *   2. utána az el nem kezdettek (ezek a következő lépés),
 *   3. a befejezettek ÖSSZECSUKOTT szekcióban (értékesek — a teljesítmény
 *      látszik —, de nem tolják le a képernyőről a folyamatban lévőt),
 *   4. a lejárt hozzáférésűek legvégül, saját szekcióban (A1) — a hozzáférés
 *      lejárata nem hiba, nem is sürgetés: külön, empatikus üzenettel áll.
 * A csoportokon BELÜL a bejövő sorrend marad (a `users.purchases` sorrendje),
 * mert az stabil és kiszámítható; a rendezés SOSEM keveri össze a kártyákat két
 * oldalletöltés között.
 *
 * ═══ EGY KÁRTYA = EGY DÖNTÉS ═══
 * Minden kártyán PONTOSAN egy elsődleges gomb van, állapotfüggő felirattal.
 * Több, egyenrangú gomb (pl. „Folytatás" + „Áttekintés") a listában
 * döntéskényszert szülne; a kártya egésze ugyanoda visz, mint a gomb.
 */

/** A kártya állapota — ez határozza meg a csoportot ÉS a gombfeliratot. */
export type CourseCardStatus =
  /** Elkezdte, de még nem fejezte be. */
  | 'in-progress'
  /** Van hozzáférése, de még egy leckét sem jelölt késznek. */
  | 'not-started'
  /** Minden elindítható lecke kész. */
  | 'completed'
  /** A hozzáférés lejárt (A1) — a lejátszó nem indul el. */
  | 'expired'

/** Az összecsukható „Befejezett kurzusok" szekció címének töve. */
export const COMPLETED_GROUP_TITLE = 'Befejezett kurzusok'

/** A lejárt hozzáférésű kurzusok szekciócíme. */
export const EXPIRED_GROUP_TITLE = 'Lejárt hozzáférésű kurzusok'

/** Az aktív (folyamatban + el nem kezdett) csoport — csak képernyőolvasónak. */
export const CURRENT_GROUP_TITLE = 'Folyamatban lévő és új kurzusaid'

/** Üres állapot — barátságos, nem szemrehányó. */
export const EMPTY_TITLE = 'Itt jelennek meg a kurzusaid'
export const EMPTY_BODY =
  'Még nincs elérhető kurzusod. Nézd meg a kínálatunkat — a megvásárolt kurzus azonnal itt nyílik meg.'
export const EMPTY_CTA_LABEL = 'Kurzusok megnézése'
export const EMPTY_CTA_HREF = '/kurzusok'

/**
 * A gombfeliratok. Kiemelve, hogy a teszt és a felület UGYANARRA hivatkozzon —
 * egy elgépelt felirat így nem csúszhat át némán.
 */
export const CTA_LABELS = {
  start: 'Kezdés',
  /** A folytatás felirata a lecke címével egészül ki: „Folytatás: <lecke>". */
  resumePrefix: 'Folytatás',
  rewatch: 'Újranézés',
  expired: 'A kurzus megtekintése',
  /** Tananyag nélküli kurzus: nincs mit „kezdeni", de a kurzus megnyitható. */
  open: 'A kurzus megnyitása',
} as const

/** A kártya kirajzolásához szükséges, MÁR KÉSZ (szerializálható) adatok. */
export interface CourseCardView {
  productId: number
  title: string
  /** A kártya és a gomb közös célja (lejátszó vagy — lejártnál — kurzusoldal). */
  href: string
  cover: CourseCover | null
  status: CourseCardStatus
  /** 0–100; tananyag nélküli kurzusnál 0. */
  percent: number
  completedLessons: number
  totalLessons: number
  /** Rajzolható-e haladás (kör + sáv): van tananyag ÉS él a hozzáférés. */
  showProgress: boolean
  /** A ProgressBar `aria-valuetext`-je — „12/18 lecke kész". */
  progressValueText: string
  /** Mikro-meta: „12/18 lecke · kb. 42 perc van hátra". */
  metaLine: string
  /** A gomb LÁTHATÓ felirata. */
  ctaLabel: string
  /**
   * A gomb akadálymentes nevének kiegészítése (vizuálisan rejtett): a kurzus
   * neve. Több kártya áll egymás mellett, és a „Folytatás: …" önmagában nem
   * mondja meg, MELYIK kurzusról van szó.
   */
  ctaContext: string
  /** „Hozzáférés eddig: 2027. 03. 04." — null, ha nincs ismert lejárat. */
  expiryLabel: string | null
  /** Empatikus üzenet lejárt hozzáférésnél — null, ha él a hozzáférés. */
  expiredMessage: string | null
}

/**
 * Hátralévő idő MÁSODPERCBEN: az elindítható, még NEM kész leckék `durationSec`
 * mezőinek összege.
 *
 * SZÁNDÉKOSAN közelítő. A CMS-ben a hossz opcionális mező, ezért előfordul,
 * hogy csak a leckék egy részén van kitöltve — ilyenkor a részösszeget adjuk, és
 * a felirat „kb." előtaggal jelzi a becslést. Ha EGYETLEN hátralévő leckén sincs
 * hossz, `null` a válasz, és a mikro-meta időszakasza elmarad: kitalált számot
 * nem írunk ki.
 */
export function remainingSeconds(
  lessons: readonly Pick<CurriculumLesson, 'ref' | 'playable' | 'durationSec'>[],
  watchedRefs: Iterable<string | null | undefined>,
): number | null {
  const watched = toWatchedRefSet([...watchedRefs])
  let total = 0
  for (const lesson of lessons) {
    if (!lesson.playable || watched.has(lesson.ref)) {
      continue
    }
    if (typeof lesson.durationSec === 'number' && Number.isFinite(lesson.durationSec)) {
      total += Math.max(0, lesson.durationSec)
    }
  }
  return total > 0 ? total : null
}

/**
 * Emberi időtartam-felirat: „kb. 42 perc", „kb. 1 óra 5 perc", „kb. 2 óra".
 *
 * Percre kerekít (a másodperc-pontosság itt zaj), és legalább 1 percet mond —
 * a „kb. 0 perc" félrevezető lenne. Nulla vagy hiányzó bemenetnél `null`, hogy a
 * hívó a teljes szakaszt elhagyhassa.
 */
export function formatRemainingLabel(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return null
  }
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) {
    return `kb. ${minutes} perc`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `kb. ${hours} óra` : `kb. ${hours} óra ${rest} perc`
}

/**
 * A kártya mikro-metája — annyi információ, amennyi EGY pillantás alatt
 * feldolgozható:
 * - lejárt hozzáférésnél a haladás nem releváns, csak a kurzus mérete;
 * - tananyag nélküli kurzusnál a `NO_LESSONS_LABEL` (nincs „0/0 lecke");
 * - egyébként „kész/összes lecke", és — ha kiszámítható — a hátralévő idő.
 */
export function courseMetaLine(input: {
  status: CourseCardStatus
  completedLessons: number
  totalLessons: number
  remainingSec: number | null
}): string {
  if (input.totalLessons === 0) {
    return NO_LESSONS_LABEL
  }
  if (input.status === 'expired') {
    return `${input.totalLessons} lecke`
  }
  const lessons = `${input.completedLessons}/${input.totalLessons} lecke`
  const remaining = formatRemainingLabel(input.remainingSec)
  return remaining === null ? lessons : `${lessons} · ${remaining} van hátra`
}

/**
 * A gomb felirata — az állapotgép LÁTHATÓ kimenete.
 *
 * A „Folytatás" a KONKRÉT leckét nevezi meg (a `resumeLesson`-ből), mert a
 * vevőt nem az érdekli, hogy „van hol folytatni", hanem hogy MI következik.
 * Lecke-cím hiányában a puszta „Folytatás" marad — kitalált címet nem írunk.
 */
export function courseCtaLabel(input: {
  status: CourseCardStatus
  totalLessons: number
  resumeLessonTitle: string | null
}): string {
  switch (input.status) {
    case 'expired':
      return CTA_LABELS.expired
    case 'completed':
      return CTA_LABELS.rewatch
    case 'in-progress': {
      const title = input.resumeLessonTitle?.trim()
      return title ? `${CTA_LABELS.resumePrefix}: ${title}` : CTA_LABELS.resumePrefix
    }
    default:
      return input.totalLessons === 0 ? CTA_LABELS.open : CTA_LABELS.start
  }
}

/**
 * A kártya állapota. A lejárat MINDENT felülír: lejárt hozzáféréssel a
 * „Folytatás" hazugság lenne (a lejátszó 403-at ad), ezért ez az ág áll elöl.
 */
export function resolveCourseCardStatus(input: {
  hasAccess: boolean
  started: boolean
  complete: boolean
}): CourseCardStatus {
  if (!input.hasAccess) {
    return 'expired'
  }
  if (input.complete) {
    return 'completed'
  }
  return input.started ? 'in-progress' : 'not-started'
}

/** A kártya-nézet felépítéséhez szükséges nyers bemenet (a szerver-oldalról). */
export interface CourseCardInput {
  productId: number
  title: string
  href: string
  cover: CourseCover | null
  /** A tananyag-modell (`buildCurriculum`) kimenete. */
  curriculum: Curriculum
  /** A késznek jelölt leckék refjei (fetchWatchedRefs). */
  watchedRefs: Iterable<string | null | undefined>
  /** Él-e a hozzáférés (A1). Hiányzó hozzáférés-állapot = korlátlan → true. */
  hasAccess: boolean
  expiryLabel: string | null
  expiredMessage: string | null
}

/** Egy kurzus kész, kirajzolható kártya-nézete. */
export function buildCourseCardView(input: CourseCardInput): CourseCardView {
  // A deklarált típus EGYSZER bejárható iterátort is megenged, a függvény
  // viszont kétszer olvassa (haladás + hátralévő idő) — a code review mérte,
  // hogy generátor-bemenetnél a második bejárás üres, és a hátralévő idő
  // hamisan a teljes kurzuszhosszra ugrik. Ezért PONTOSAN EGYSZER járjuk be.
  const watchedRefs = [...input.watchedRefs]
  const progress = summarizeCurriculum(input.curriculum, watchedRefs)
  const status = resolveCourseCardStatus({
    hasAccess: input.hasAccess,
    started: progress.started,
    complete: progress.complete,
  })
  const remainingSec =
    status === 'expired' ? null : remainingSeconds(input.curriculum.lessons, watchedRefs)

  return {
    productId: input.productId,
    title: input.title,
    href: input.href,
    cover: input.cover,
    status,
    percent: progress.percent,
    completedLessons: progress.completed,
    totalLessons: progress.total,
    showProgress: status !== 'expired' && progress.total > 0,
    progressValueText: progress.label,
    metaLine: courseMetaLine({
      status,
      completedLessons: progress.completed,
      totalLessons: progress.total,
      remainingSec,
    }),
    ctaLabel: courseCtaLabel({
      status,
      totalLessons: progress.total,
      resumeLessonTitle: progress.resumeLesson?.title ?? null,
    }),
    ctaContext: input.title,
    expiryLabel: input.expiryLabel,
    expiredMessage: input.expiredMessage,
  }
}

/** A lista három megjelenítési csoportja. */
export interface CourseCardGroups {
  /** Folyamatban lévők, UTÁNUK az el nem kezdettek — egyetlen rácsban. */
  current: CourseCardView[]
  /** Befejezettek — összecsukott szekcióban. */
  completed: CourseCardView[]
  /** Lejárt hozzáférésűek — a lap alján, saját szekcióban. */
  expired: CourseCardView[]
}

/**
 * Csoportosítás + rendezés. A csoportokon belül a BEJÖVŐ sorrend marad
 * (stabil): az aktív csoportban előbb minden folyamatban lévő, utána minden el
 * nem kezdett kártya, mindkét szakaszon belül érintetlen sorrendben.
 */
export function groupCourseCards(cards: readonly CourseCardView[]): CourseCardGroups {
  const inProgress: CourseCardView[] = []
  const notStarted: CourseCardView[] = []
  const completed: CourseCardView[] = []
  const expired: CourseCardView[] = []

  for (const card of cards) {
    switch (card.status) {
      case 'in-progress':
        inProgress.push(card)
        break
      case 'not-started':
        notStarted.push(card)
        break
      case 'completed':
        completed.push(card)
        break
      default:
        expired.push(card)
        break
    }
  }

  return { current: [...inProgress, ...notStarted], completed, expired }
}

/**
 * Az oldal-fejléc összefoglaló sora: „3 kurzus · 1 folyamatban · 1 befejezve".
 *
 * EGYETLEN kurzusnál `null` — ott az összegzés nem mond semmit, amit a kártya
 * ne mondana el, és csak zajt adna a fejléchez. A nulla darabszámú szakaszok
 * kimaradnak (nem írunk ki „0 befejezve"-t).
 */
export function courseListSummary(cards: readonly CourseCardView[]): string | null {
  if (cards.length <= 1) {
    return null
  }
  const count = (status: CourseCardStatus): number =>
    cards.filter((card) => card.status === status).length

  const parts = [`${cards.length} kurzus`]
  const inProgress = count('in-progress')
  if (inProgress > 0) {
    parts.push(`${inProgress} folyamatban`)
  }
  const completed = count('completed')
  if (completed > 0) {
    parts.push(`${completed} befejezve`)
  }
  const expired = count('expired')
  if (expired > 0) {
    parts.push(`${expired} lejárt`)
  }
  return parts.join(' · ')
}
