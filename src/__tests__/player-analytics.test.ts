import { describe, expect, it } from 'vitest'

import { eventsForLessonCompletion } from '../components/account/player/analytics'
import { buildCurriculum } from '../lib/curriculum/curriculum'
import { summarizeCurriculum } from '../lib/curriculum/progress'
import type { Product } from '../payload-types'

/**
 * A tanulási funnel mérföldkő-döntései.
 *
 * A LEGFONTOSABB, amit itt őrzünk: az „elkezdte" és a „befejezte" az
 * ÁTMENETRE szól, nem az állapotra. Ha az állapotra szólna, minden
 * oldalbetöltés újraküldené a `course_completed`-et, és a funnel
 * használhatatlanná válna.
 */

type ModuleRow = NonNullable<Product['modules']>[number]
type LessonRow = NonNullable<ModuleRow['lessons']>[number]

function lecke(id: string): LessonRow {
  return {
    id,
    title: id,
    kind: 'video',
    status: 'ready',
    streamAssetId: `guid-${id}`,
  } as LessonRow
}

/** Két modul: [l1, l2] és [l3]. */
const TANANYAG = buildCurriculum(
  {
    modules: [
      { id: 'm1', title: '1. modul', summary: null, lessons: [lecke('l1'), lecke('l2')] },
      { id: 'm2', title: '2. modul', summary: null, lessons: [lecke('l3')] },
    ] as NonNullable<Product['modules']>,
    videos: null,
  },
  true,
)

/** A `before`/`after` pár előállítása: mi volt kész, és mi lett kész most. */
function atmenet(elozoleg: string[], most: string) {
  return {
    before: summarizeCurriculum(TANANYAG, elozoleg),
    after: summarizeCurriculum(TANANYAG, [...elozoleg, most]),
  }
}

describe('eventsForLessonCompletion — kurzus elkezdése', () => {
  it('az ELSŐ kész lecke elkezdésnek számít', () => {
    const events = eventsForLessonCompletion({ ...atmenet([], 'l1'), moduleIndex: 0 })
    expect(events.courseStarted).toBe(true)
  })

  it('a MÁSODIK lecke már NEM számít elkezdésnek (nem küldjük újra)', () => {
    const events = eventsForLessonCompletion({ ...atmenet(['l1'], 'l2'), moduleIndex: 0 })
    expect(events.courseStarted).toBe(false)
  })
})

describe('eventsForLessonCompletion — modul befejezése', () => {
  it('a modul UTOLSÓ leckéje zárja a modult', () => {
    const events = eventsForLessonCompletion({ ...atmenet(['l1'], 'l2'), moduleIndex: 0 })
    expect(events.completedModuleIndex).toBe(0)
  })

  it('a modul KÖZBÜLSŐ leckéje nem zárja a modult', () => {
    const events = eventsForLessonCompletion({ ...atmenet([], 'l1'), moduleIndex: 0 })
    expect(events.completedModuleIndex).toBeNull()
  })

  it('a MÁSIK modul leckéje az első modult nem zárja le', () => {
    const events = eventsForLessonCompletion({ ...atmenet([], 'l3'), moduleIndex: 1 })
    expect(events.completedModuleIndex).toBe(1)
  })

  it('a MÁR kész modul nem jelződik újra', () => {
    // Az 1. modul már kész volt; most a 2. modul leckéje készül el.
    const events = eventsForLessonCompletion({
      ...atmenet(['l1', 'l2'], 'l3'),
      moduleIndex: 1,
    })
    expect(events.completedModuleIndex).toBe(1)

    // Ugyanez a modulindexszel az ELSŐ (már kész) modulra kérdezve: nincs jelzés.
    const ismetelt = eventsForLessonCompletion({
      ...atmenet(['l1', 'l2'], 'l3'),
      moduleIndex: 0,
    })
    expect(ismetelt.completedModuleIndex).toBeNull()
  })

  it('ismeretlen modulindex esetén nincs modul-esemény', () => {
    const events = eventsForLessonCompletion({ ...atmenet(['l1'], 'l2'), moduleIndex: null })
    expect(events.completedModuleIndex).toBeNull()
  })
})

describe('eventsForLessonCompletion — kurzus befejezése', () => {
  it('az UTOLSÓ lecke zárja a kurzust', () => {
    const events = eventsForLessonCompletion({
      ...atmenet(['l1', 'l2'], 'l3'),
      moduleIndex: 1,
    })
    expect(events.courseCompleted).toBe(true)
    expect(events.completedModuleIndex).toBe(1)
    expect(events.courseStarted).toBe(false)
  })

  it('a nem utolsó lecke nem zárja a kurzust', () => {
    expect(
      eventsForLessonCompletion({ ...atmenet(['l1'], 'l2'), moduleIndex: 0 }).courseCompleted,
    ).toBe(false)
  })

  it('a MÁR befejezett kurzus nem jelződik újra (ez az idempotencia lényege)', () => {
    const kesz = summarizeCurriculum(TANANYAG, ['l1', 'l2', 'l3'])
    const events = eventsForLessonCompletion({
      before: kesz,
      after: kesz,
      moduleIndex: 1,
    })
    expect(events.courseCompleted).toBe(false)
    expect(events.courseStarted).toBe(false)
    expect(events.completedModuleIndex).toBeNull()
  })
})

describe('eventsForLessonCompletion — egyleckés kurzus', () => {
  it('egyetlen lecke egyszerre indítja és fejezi be a kurzust', () => {
    const egy = buildCurriculum(
      {
        modules: [
          { id: 'm1', title: 'Egyetlen', summary: null, lessons: [lecke('x1')] },
        ] as NonNullable<Product['modules']>,
        videos: null,
      },
      true,
    )
    const events = eventsForLessonCompletion({
      before: summarizeCurriculum(egy, []),
      after: summarizeCurriculum(egy, ['x1']),
      moduleIndex: 0,
    })
    expect(events).toEqual({
      courseStarted: true,
      completedModuleIndex: 0,
      courseCompleted: true,
    })
  })
})
