import { describe, expect, it } from 'vitest'

import {
  createWatchTracker,
  DEFAULT_MAX_CONTINUITY_GAP_SEC,
  isWatchedComplete,
  mergeWatchIntervals,
  WATCHED_COMPLETION_RATIO,
  watchedRatio,
  watchedSecondsOf,
} from '../lib/stream/watched-coverage'

/**
 * A megnézett-arány számítás egységtesztje.
 *
 * A modul TISZTA (nincs DOM-ja, hálózata, ideje), ezért itt semmit nem kell
 * mockolni — és semmilyen hálózati hívás sem indulhat el.
 *
 * A tesztek a valódi lejátszó-viselkedést utánozzák: a `timeupdate` esemény
 * sűrűn, kis lépésekkel érkezik, a tekerés viszont NAGY ugrást okoz. Az
 * `emit` segéd ezt a sűrű mintavételt modellezi.
 */

/** Folyamatos lejátszás `from`-tól `to`-ig, `step` másodperces mintavétellel. */
function emit(record: (seconds: number) => void, from: number, to: number, step = 0.25): void {
  for (let seconds = from; seconds < to; seconds += step) {
    record(Number(seconds.toFixed(6)))
  }
  record(to)
}

describe('mergeWatchIntervals', () => {
  it('rendez és egyesíti az átfedő szakaszokat', () => {
    expect(
      mergeWatchIntervals([
        { start: 10, end: 20 },
        { start: 0, end: 5 },
        { start: 15, end: 30 },
      ]),
    ).toEqual([
      { start: 0, end: 5 },
      { start: 10, end: 30 },
    ])
  })

  it('az érintkező szakaszok (vég === kezdet) is egyesülnek', () => {
    expect(
      mergeWatchIntervals([
        { start: 0, end: 10 },
        { start: 10, end: 20 },
      ]),
    ).toEqual([{ start: 0, end: 20 }])
  })

  it('a teljesen tartalmazott szakasz nem rövidíti le a befoglalót', () => {
    expect(
      mergeWatchIntervals([
        { start: 0, end: 100 },
        { start: 10, end: 20 },
      ]),
    ).toEqual([{ start: 0, end: 100 }])
  })

  it('a hibás alakú szakaszokat (NaN, végtelen, fordított) eldobja', () => {
    expect(
      mergeWatchIntervals([
        { start: Number.NaN, end: 10 },
        { start: 0, end: Number.POSITIVE_INFINITY },
        { start: 30, end: 20 },
        { start: 1, end: 2 },
      ]),
    ).toEqual([{ start: 1, end: 2 }])
  })

  it('üres bemenet → üres kimenet', () => {
    expect(mergeWatchIntervals([])).toEqual([])
  })
})

describe('watchedSecondsOf / watchedRatio', () => {
  it('a hosszra vágja a túllógó szakaszt', () => {
    expect(watchedSecondsOf([{ start: 0, end: 500 }], 100)).toBe(100)
    expect(watchedRatio([{ start: 0, end: 500 }], 100)).toBe(1)
  })

  it('a negatív tartományba lógó szakasz csak a 0 fölötti részével számít', () => {
    expect(watchedSecondsOf([{ start: -50, end: 10 }], 100)).toBe(10)
  })

  it('ismeretlen / 0 / negatív / NaN hossz → 0 arány, sosem NaN', () => {
    const intervals = [{ start: 0, end: 100 }]
    for (const duration of [null, undefined, 0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(watchedSecondsOf(intervals, duration)).toBe(0)
      expect(watchedRatio(intervals, duration)).toBe(0)
    }
  })
})

describe('isWatchedComplete', () => {
  it('a küszöb pontos elérése kész', () => {
    expect(isWatchedComplete(0.9)).toBe(true)
  })

  it('lebegőpontos hajszálnyi hiány még kész (epszilon-tűrés)', () => {
    expect(isWatchedComplete(0.9 - 1e-12)).toBe(true)
  })

  it('valódi elmaradás nem kész', () => {
    expect(isWatchedComplete(0.89)).toBe(false)
  })

  it('0, negatív és NaN sosem kész', () => {
    expect(isWatchedComplete(0)).toBe(false)
    expect(isWatchedComplete(-1)).toBe(false)
    expect(isWatchedComplete(Number.NaN)).toBe(false)
  })
})

describe('createWatchTracker — lineáris nézés', () => {
  it('a teljes videó végignézése 100%, és kész', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 100)
    expect(tracker.coverage()).toBe(1)
    expect(tracker.watchedSeconds()).toBe(100)
    expect(tracker.isComplete()).toBe(true)
    expect(tracker.intervals()).toEqual([{ start: 0, end: 100 }])
  })

  it('a videó feléig nézve 50%, és NEM kész', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 50)
    expect(tracker.coverage()).toBeCloseTo(0.5, 10)
    expect(tracker.isComplete()).toBe(false)
  })

  it('pontosan a küszöbig nézve (90/100) már kész — 0,9 határeset', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 90)
    expect(tracker.coverage()).toBe(WATCHED_COMPLETION_RATIO)
    expect(tracker.isComplete()).toBe(true)
  })

  it('a küszöb alatt egy hajszállal (89,9/100) még nem kész', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 89.9)
    expect(tracker.isComplete()).toBe(false)
  })
})

describe('createWatchTracker — szkippelés (előretekerés)', () => {
  it('az ÁTUGROTT szakasz nem számít megnézettnek', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 10)
    // Tekerés a 90. másodpercre — a 10–90 közti rész kimarad.
    emit(tracker.record, 90, 100)
    expect(tracker.watchedSeconds()).toBe(20)
    expect(tracker.coverage()).toBeCloseTo(0.2, 10)
    expect(tracker.isComplete()).toBe(false)
    expect(tracker.intervals()).toEqual([
      { start: 0, end: 10 },
      { start: 90, end: 100 },
    ])
  })

  it('a csúszka végére rántása NEM tesz készre (a kijátszás elleni fő védelem)', () => {
    const tracker = createWatchTracker(100)
    tracker.record(0)
    tracker.record(99.5)
    tracker.record(100)
    expect(tracker.coverage()).toBeCloseTo(0.005, 10)
    expect(tracker.isComplete()).toBe(false)
  })

  it('a küszöbnyi ugrás (2 mp) még folyamatos, a küszöb fölötti már tekerés', () => {
    const contiguous = createWatchTracker(100)
    contiguous.record(0)
    contiguous.record(DEFAULT_MAX_CONTINUITY_GAP_SEC)
    expect(contiguous.intervals()).toEqual([{ start: 0, end: DEFAULT_MAX_CONTINUITY_GAP_SEC }])

    const seeked = createWatchTracker(100)
    seeked.record(0)
    seeked.record(DEFAULT_MAX_CONTINUITY_GAP_SEC + 0.001)
    expect(seeked.intervals()).toEqual([
      { start: 0, end: 0 },
      { start: DEFAULT_MAX_CONTINUITY_GAP_SEC + 0.001, end: DEFAULT_MAX_CONTINUITY_GAP_SEC + 0.001 },
    ])
  })

  it('sok apró átugrás összeadódva sem tesz készre', () => {
    const tracker = createWatchTracker(100)
    // 10 db 5 másodperces szakasz megnézve, közöttük 5 mp átugorva → 50%.
    for (let block = 0; block < 10; block += 1) {
      emit(tracker.record, block * 10, block * 10 + 5)
    }
    expect(tracker.watchedSeconds()).toBeCloseTo(50, 6)
    expect(tracker.isComplete()).toBe(false)
  })

  it('a beállítható folytonossági küszöb érvényesül', () => {
    const tracker = createWatchTracker(100, { maxContinuityGapSec: 10 })
    tracker.record(0)
    tracker.record(8)
    expect(tracker.intervals()).toEqual([{ start: 0, end: 8 }])
  })
})

describe('createWatchTracker — oda-vissza tekerés és újranézés', () => {
  it('a visszatekerés utáni újranézés NEM duplázza az arányt', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 50)
    // Vissza a 0-ra és újra végig a feléig.
    emit(tracker.record, 0, 50)
    expect(tracker.watchedSeconds()).toBe(50)
    expect(tracker.coverage()).toBeCloseTo(0.5, 10)
    expect(tracker.intervals()).toEqual([{ start: 0, end: 50 }])
  })

  it('a visszatekerés utáni FOLYTATÁS a hiányzó részt is lefedi', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 60)
    emit(tracker.record, 30, 100)
    expect(tracker.watchedSeconds()).toBe(100)
    expect(tracker.isComplete()).toBe(true)
    expect(tracker.intervals()).toEqual([{ start: 0, end: 100 }])
  })

  it('az időbélyeg apró visszaremegése nem darabolja fel az intervallumot', () => {
    const tracker = createWatchTracker(100)
    tracker.record(10)
    tracker.record(10.5)
    tracker.record(10.25)
    tracker.record(11)
    expect(tracker.intervals()).toEqual([{ start: 10, end: 11 }])
  })

  it('nagy visszatekerés ÚJ intervallumot nyit, az arány nem nő tőle', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 80, 100)
    emit(tracker.record, 0, 20)
    expect(tracker.watchedSeconds()).toBe(40)
    expect(tracker.intervals()).toEqual([
      { start: 0, end: 20 },
      { start: 80, end: 100 },
    ])
  })
})

describe('createWatchTracker — határesetek', () => {
  it('ismeretlen hossz mellett sosem jelez készet', () => {
    const tracker = createWatchTracker(null)
    emit(tracker.record, 0, 100)
    expect(tracker.durationSec()).toBeNull()
    expect(tracker.coverage()).toBe(0)
    expect(tracker.watchedSeconds()).toBe(0)
    expect(tracker.isComplete()).toBe(false)
  })

  it('0, negatív és NaN hossz ugyanígy nem jelez készet', () => {
    for (const duration of [0, -100, Number.NaN]) {
      const tracker = createWatchTracker(duration)
      emit(tracker.record, 0, 100)
      expect(tracker.coverage()).toBe(0)
      expect(tracker.isComplete()).toBe(false)
    }
  })

  it('a hossz utólagos megadása visszamenőleg értelmet ad a rögzített szakaszoknak', () => {
    const tracker = createWatchTracker(null)
    emit(tracker.record, 0, 95)
    expect(tracker.isComplete()).toBe(false)
    tracker.setDuration(100)
    expect(tracker.durationSec()).toBe(100)
    expect(tracker.coverage()).toBeCloseTo(0.95, 10)
    expect(tracker.isComplete()).toBe(true)
  })

  it('a hossz visszavétele (null) újra letiltja a készre jelölést', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 100)
    expect(tracker.isComplete()).toBe(true)
    tracker.setDuration(null)
    expect(tracker.isComplete()).toBe(false)
  })

  it('NaN, végtelen és negatív időpontot csendben eldob', () => {
    const tracker = createWatchTracker(100)
    tracker.record(Number.NaN)
    tracker.record(Number.POSITIVE_INFINITY)
    tracker.record(-5)
    expect(tracker.intervals()).toEqual([])
    expect(tracker.coverage()).toBe(0)

    // A hibás értékek után az első ÉRVÉNYES időpont nyitja az intervallumot.
    tracker.record(10)
    expect(tracker.intervals()).toEqual([{ start: 10, end: 10 }])
  })

  it('a hibás időpont nem szakítja meg a folytonosságot', () => {
    const tracker = createWatchTracker(100)
    tracker.record(10)
    tracker.record(Number.NaN)
    tracker.record(10.5)
    expect(tracker.intervals()).toEqual([{ start: 10, end: 10.5 }])
  })

  it('a hossznál nagyobb időpont nem visz 1 fölé', () => {
    const tracker = createWatchTracker(10)
    emit(tracker.record, 0, 10)
    tracker.record(11)
    tracker.record(12)
    expect(tracker.coverage()).toBe(1)
    expect(tracker.watchedSeconds()).toBe(10)
  })

  it('egyetlen időpont rögzítése 0 hosszú szakasz, arány gyakorlatilag 0', () => {
    const tracker = createWatchTracker(100)
    tracker.record(42)
    expect(tracker.watchedSeconds()).toBe(0)
    expect(tracker.coverage()).toBe(0)
    expect(tracker.isComplete()).toBe(false)
  })

  it('reset() teljesen nulláz, a hosszt viszont megtartja', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 100)
    expect(tracker.isComplete()).toBe(true)
    tracker.reset()
    expect(tracker.intervals()).toEqual([])
    expect(tracker.coverage()).toBe(0)
    expect(tracker.isComplete()).toBe(false)
    expect(tracker.durationSec()).toBe(100)
  })

  it('az intervals() pillanatkép, a további rögzítés nem írja át', () => {
    const tracker = createWatchTracker(100)
    emit(tracker.record, 0, 10)
    const snapshot = tracker.intervals()
    emit(tracker.record, 10, 20)
    expect(snapshot).toEqual([{ start: 0, end: 10 }])
  })

  it('egyedi küszöb (pl. 0,5) érvényesül', () => {
    const tracker = createWatchTracker(100, { completionRatio: 0.5 })
    emit(tracker.record, 0, 50)
    expect(tracker.isComplete()).toBe(true)
  })
})
