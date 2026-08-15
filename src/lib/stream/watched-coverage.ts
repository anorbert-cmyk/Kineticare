/**
 * MEGNÉZETT-ARÁNY SZÁMÍTÁS — tiszta, DOM- és hálózat-mentes modul.
 *
 * ═══ MIÉRT KELL ═══
 * A haladás-jelölés ma KÉZI: a vevőnek meg kell nyomnia a „Megjelölöm
 * megnézettnek" gombot. A tisztán kézi jelölés viszont elfelejtődik — a haladás
 * ALULMÉR, az admin-analitika pedig használhatatlanná válik (a „hány százalék
 * készült el" szám a valóság alatt marad). A másik véglet, a tisztán automatikus
 * jelölés („megnyitotta a leckét = kész") FELFÚJJA a számokat: aki csak
 * belekattint egy videóba, késznek látszik.
 *
 * Ezért HIBRID a megoldás: a lecke automatikusan késznek jelölődik, ha a néző a
 * videó TÉNYLEGES tartalmának legalább 90%-át megnézte — és emellett a kézi
 * felülbírálás (jelölés/visszavonás) végig megmarad. Ez a modul a hibrid
 * automatikus felének a MÉRŐESZKÖZE.
 *
 * ═══ MIÉRT NEM ELÉG A LEGNAGYOBB `currentTime` ═══
 * A kézenfekvő megoldás — „tartsuk nyilván a legnagyobb elért időpontot, és
 * osszuk el a hosszal" — TRIVIÁLISAN kijátszható és félrevezető: elég a
 * lejátszó csúszkáját a végére húzni, és a lecke 100%-osnak látszik anélkül,
 * hogy egyetlen másodpercet is megnéztek volna belőle. Ugyanez történik
 * véletlenül is: aki a videó közepén keres valamit és a végére ugrik, tévesen
 * késznek számítana.
 *
 * Ezért MEGNÉZETT INTERVALLUMOKAT tartunk nyilván (mely szakaszok futottak le
 * ténylegesen), és az arány az EGYEDI megnézett másodpercek összege osztva a
 * videó hosszával.
 *
 * ═══ A SZKIPPELÉS-ELLENES SZABÁLY ═══
 * A lejátszó `timeupdate` eseménye sűrűn (nagyjából negyedmásodpercenként)
 * érkezik, tehát NORMÁL lejátszás közben két egymást követő időpont KÖZEL van
 * egymáshoz. Egy tekerés viszont NAGY ugrást okoz. Ebből következik a szabály:
 *
 *   - ha az új időpont az előzőhöz képest legfeljebb `maxContinuityGapSec`
 *     (alapértelmezésben 2 másodperc) távolságra van — BÁRMELYIK irányban —,
 *     akkor folyamatos lejátszásnak számít, és a nyitott intervallum bővül;
 *   - ha ennél nagyobbat ugrik, az TEKERÉS: a nyitott intervallum lezárul, és
 *     az új időponttól ÚJ intervallum kezdődik. Az ÁTUGROTT szakasz így SOSEM
 *     kerül a megnézett másodpercek közé.
 *
 * A visszafelé irányuló kis ugrást is folyamatosnak vesszük: a lejátszók
 * időbélyege néha „remeg" (ugyanaz vagy pár tizeddel korábbi érték jön
 * kétszer), és emiatt nem szabad fölöslegesen darabolni az intervallumokat.
 * A 2 másodperces küszöb mellett a visszafelé „megnyert" néhány tized
 * másodperc mérési hibán belül van.
 *
 * ═══ ÖSSZEFÉSÜLÉS (merge) ═══
 * Az intervallumok minden lekérdezéskor összefésülődnek. Két oka van:
 *  1. az arány CSAK így pontos — az újranézett szakasz nem duplázhat
 *     (aki kétszer nézi meg ugyanazt a percet, nem lesz kétszer olyan kész);
 *  2. a halmaz nem nőhet korlátlanul: sok oda-vissza tekerés után az
 *     átfedő darabok egyetlen szakasszá olvadnak.
 *
 * ═══ HATÁRESETEK ═══
 * - Ismeretlen, nulla vagy értelmetlen hossz → az arány 0, és SOSEM jelez
 *   készet. Ismeretlen nevezővel egy százalék hazugság lenne.
 * - NaN / végtelen / negatív időpont → csendben eldobjuk (a lejátszóból jövő
 *   adatot sosem bízzuk meg).
 * - A hossznál nagyobb időpont → az intervallumok a hosszra vágódnak a
 *   számításkor, így az arány sosem lép 1 fölé.
 *
 * A modult a src/__tests__/watched-coverage.test.ts fedi.
 */

/** Egy megnézett szakasz másodpercben, a videó időtengelyén. */
export interface WatchInterval {
  readonly start: number
  readonly end: number
}

/**
 * A készre jelölés küszöbe: a videó 90%-a.
 *
 * A maradék 10% szándékos ráhagyás — a legtöbb leckevideó végén stáblista,
 * elköszönés vagy csend van, amit a néző jogosan hagy ki. Ha 100%-ot várnánk,
 * gyakorlatilag SOHA nem jelölődne készre semmi.
 */
export const WATCHED_COMPLETION_RATIO = 0.9

/**
 * Ekkora ugrásig számít folyamatosnak a lejátszás (másodperc). Efölött
 * tekerésnek minősül, és új intervallum kezdődik.
 */
export const DEFAULT_MAX_CONTINUITY_GAP_SEC = 2

/**
 * Lebegőpontos tűrés a küszöb-összehasonlításhoz.
 *
 * A 90% pontos elérése VALÓDI határeset (pl. 100 másodperces videóból pontosan
 * 90 megnézve), és a másodpercek összeadása közben felgyülemlő ábrázolási hiba
 * miatt az eredmény lehet 0.8999999999999999. Enélkül a tűrés nélkül a néző a
 * küszöb elérése után sem kapná meg a jelölést — pontosan azt a bizalmat
 * rombolva, amiért az automatika készült.
 */
const COMPLETION_EPSILON = 1e-9

/** Pozitív, véges hossz másodpercben; minden más (0, NaN, negatív, nem szám) → null. */
function normalizeDurationSec(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Intervallumok összefésülése: rendezés kezdet szerint, majd az érintkező vagy
 * átfedő szakaszok egyesítése.
 *
 * A hibás alakú elemeket (NaN, végtelen, fordított irányú szakasz) csendben
 * eldobja — a bemenet a lejátszóból származik, tehát nem megbízható.
 * A nulla hosszú (pont-) intervallumok BENNMARADNAK: az arányhoz 0-val
 * járulnak hozzá, de megőrzik a „hol járt a néző" információt.
 */
export function mergeWatchIntervals(intervals: readonly WatchInterval[]): WatchInterval[] {
  const usable = intervals.filter(
    (interval) =>
      Number.isFinite(interval.start) &&
      Number.isFinite(interval.end) &&
      interval.end >= interval.start,
  )
  const sorted = [...usable].sort((left, right) => left.start - right.start)

  const merged: WatchInterval[] = []
  for (const current of sorted) {
    const last = merged[merged.length - 1]
    if (last !== undefined && current.start <= last.end) {
      if (current.end > last.end) {
        merged[merged.length - 1] = { start: last.start, end: current.end }
      }
      continue
    }
    merged.push({ start: current.start, end: current.end })
  }
  return merged
}

/**
 * Az intervallumok által lefedett EGYEDI másodpercek száma, a `[0, durationSec]`
 * tartományra vágva. Ismeretlen hossznál 0.
 */
export function watchedSecondsOf(
  intervals: readonly WatchInterval[],
  durationSec: number | null | undefined,
): number {
  const duration = normalizeDurationSec(durationSec)
  if (duration === null) {
    return 0
  }
  let total = 0
  for (const interval of mergeWatchIntervals(intervals)) {
    const start = Math.min(Math.max(interval.start, 0), duration)
    const end = Math.min(Math.max(interval.end, 0), duration)
    if (end > start) {
      total += end - start
    }
  }
  return total
}

/**
 * A megnézett arány 0 és 1 között. Ismeretlen/0 hossznál 0 — sosem NaN, mert az
 * hívási helyenként másképp viselkedne (`NaN >= 0.9` hamis, de `NaN.toFixed()`
 * „NaN"-t ír a felületre).
 */
export function watchedRatio(
  intervals: readonly WatchInterval[],
  durationSec: number | null | undefined,
): number {
  const duration = normalizeDurationSec(durationSec)
  if (duration === null) {
    return 0
  }
  return Math.min(watchedSecondsOf(intervals, duration) / duration, 1)
}

/** Elérte-e az arány a küszöböt (lebegőpontos tűréssel). */
export function isWatchedComplete(
  ratio: number,
  completionRatio: number = WATCHED_COMPLETION_RATIO,
): boolean {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return false
  }
  return ratio + COMPLETION_EPSILON >= completionRatio
}

export interface WatchTrackerOptions {
  /** Ekkora ugrásig folyamatos a lejátszás. Alapértelmezés: 2 másodperc. */
  maxContinuityGapSec?: number
  /** A készre jelölés küszöbe 0 és 1 között. Alapértelmezés: 0,9. */
  completionRatio?: number
}

export interface WatchTracker {
  /** Egy `timeupdate` időpont rögzítése. Érvénytelen értéket csendben eldob. */
  record(seconds: number): void
  /**
   * A videó hosszának (utólagos) beállítása. A lejátszó gyakran csak a `ready`
   * vagy az első `timeupdate` esemény után tudja a hosszt, ezért a követő
   * hossz nélkül is elindítható.
   */
  setDuration(durationSec: number | null | undefined): void
  /** Az ismert hossz, vagy null. */
  durationSec(): number | null
  /** A megnézett szakaszok összefésült, csak olvasható pillanatképe. */
  intervals(): WatchInterval[]
  /** A megnézett EGYEDI másodpercek száma (a hosszra vágva). */
  watchedSeconds(): number
  /** A megnézett arány 0 és 1 között; ismeretlen hossznál 0. */
  coverage(): number
  /** Elérte-e a küszöböt. Ismeretlen hossznál MINDIG false. */
  isComplete(): boolean
  /** Teljes nullázás (pl. leckeváltásnál, hogy az előző lecke ne szivárogjon át). */
  reset(): void
}

interface MutableInterval {
  start: number
  end: number
}

/**
 * Megnézett-arány követő egyetlen videóhoz.
 *
 * Használat: minden `timeupdate` eseménynél `record(seconds)`, majd
 * `isComplete()` — igaz esetén indulhat a szerver felé a készre jelölés.
 * A követő determinisztikus: nincs benne idő- vagy véletlen-függés, kizárólag
 * a kapott időpontok sorozata számít, ezért maradéktalanul tesztelhető.
 *
 * @param durationSec a videó hossza, ha már ismert
 */
export function createWatchTracker(
  durationSec?: number | null,
  options?: WatchTrackerOptions,
): WatchTracker {
  const maxGap =
    typeof options?.maxContinuityGapSec === 'number' &&
    Number.isFinite(options.maxContinuityGapSec) &&
    options.maxContinuityGapSec >= 0
      ? options.maxContinuityGapSec
      : DEFAULT_MAX_CONTINUITY_GAP_SEC
  const completionRatio =
    typeof options?.completionRatio === 'number' &&
    Number.isFinite(options.completionRatio) &&
    options.completionRatio > 0
      ? options.completionRatio
      : WATCHED_COMPLETION_RATIO

  let duration = normalizeDurationSec(durationSec)
  /** A már LEZÁRT szakaszok (tekerés zárja le őket). */
  let closed: MutableInterval[] = []
  /** A most bővülő szakasz — null, amíg egyetlen érvényes időpont sem érkezett. */
  let open: MutableInterval | null = null
  /** A legutóbb rögzített időpont — a folytonosság EHHEZ mérődik, nem az intervallum végéhez. */
  let cursor: number | null = null

  const snapshot = (): WatchInterval[] =>
    open === null ? [...closed] : [...closed, { start: open.start, end: open.end }]

  return {
    record(seconds: number): void {
      // A lejátszóból jövő érték nem megbízható: NaN, végtelen és negatív
      // időpont sosem kerülhet be (negatív `currentTime` nem létezik).
      if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
        return
      }

      if (open === null || cursor === null) {
        open = { start: seconds, end: seconds }
        cursor = seconds
        return
      }

      const gap = seconds - cursor
      if (Math.abs(gap) <= maxGap) {
        // Folyamatos lejátszás (vagy a lejátszó időbélyegének remegése).
        if (seconds > open.end) {
          open.end = seconds
        }
        if (seconds < open.start) {
          open.start = seconds
        }
      } else {
        // TEKERÉS: a nyitott szakasz lezárul, az átugrott rész NEM számít bele.
        closed.push(open)
        open = { start: seconds, end: seconds }
      }
      cursor = seconds
    },

    setDuration(value: number | null | undefined): void {
      duration = normalizeDurationSec(value)
    },

    durationSec(): number | null {
      return duration
    },

    intervals(): WatchInterval[] {
      return mergeWatchIntervals(snapshot())
    },

    watchedSeconds(): number {
      return watchedSecondsOf(snapshot(), duration)
    },

    coverage(): number {
      return watchedRatio(snapshot(), duration)
    },

    isComplete(): boolean {
      if (duration === null) {
        return false
      }
      return isWatchedComplete(watchedRatio(snapshot(), duration), completionRatio)
    },

    reset(): void {
      closed = []
      open = null
      cursor = null
    },
  }
}
