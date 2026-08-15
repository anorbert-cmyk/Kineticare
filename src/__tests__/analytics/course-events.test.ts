import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A tanulási funnel eseményei — a SZERZŐDÉS tesztje.
 *
 * A legfontosabb, amit itt őrzünk: az eseményekbe SZEMÉLYES ADAT nem
 * kerülhet (harmadik félhez, a PostHogba mennek ki), és az eseménynevek nem
 * csúszhatnak el — a funnel-riportok pontosan ezekre a sztringekre épülnek.
 */

const captureAnalyticsEvent = vi.fn()

vi.mock('../../lib/analytics/posthog', async () => {
  const tenyleges = await vi.importActual<typeof import('../../lib/analytics/posthog')>(
    '../../lib/analytics/posthog',
  )
  return {
    ...tenyleges,
    captureAnalyticsEvent: (...args: unknown[]) => captureAnalyticsEvent(...args),
  }
})

const {
  trackCourseCompleted,
  trackCourseStarted,
  trackLessonCompleted,
  trackModuleCompleted,
} = await import('../../lib/analytics/course-events')
const { ANALYTICS_EVENTS } = await import('../../lib/analytics/posthog')

beforeEach(() => {
  captureAnalyticsEvent.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A legutóbbi hívás [eseménynév, tulajdonságok] párja. */
function utolsoHivas(): [string, Record<string, unknown>] {
  const call = captureAnalyticsEvent.mock.calls.at(-1)
  expect(call).toBeDefined()
  return call as [string, Record<string, unknown>]
}

describe('a tanulási funnel eseménynevei', () => {
  it('a négy tanulási esemény neve rögzített (a riportok ezekre épülnek)', () => {
    expect(ANALYTICS_EVENTS.courseStarted).toBe('course_started')
    expect(ANALYTICS_EVENTS.lessonCompleted).toBe('lesson_completed')
    expect(ANALYTICS_EVENTS.moduleCompleted).toBe('module_completed')
    expect(ANALYTICS_EVENTS.courseCompleted).toBe('course_completed')
  })

  it('az értékesítési funnel eseményei érintetlenek maradtak', () => {
    expect(ANALYTICS_EVENTS.courseViewed).toBe('course_viewed')
    expect(ANALYTICS_EVENTS.checkoutStarted).toBe('checkout_started')
    expect(ANALYTICS_EVENTS.purchaseConfirmed).toBe('purchase_confirmed')
  })
})

describe('trackCourseStarted', () => {
  it('a kurzus azonosítóját és skuját küldi', () => {
    trackCourseStarted({ courseId: 42, courseSku: 'KEZREHAB-001' })

    expect(utolsoHivas()).toEqual(['course_started', { courseId: 42, courseSku: 'KEZREHAB-001' }])
  })

  it('hiányzó sku esetén a mező ki sem kerül (nem üres sztringként)', () => {
    trackCourseStarted({ courseId: 42, courseSku: null })
    expect(utolsoHivas()[1]).toEqual({ courseId: 42 })

    trackCourseStarted({ courseId: 42 })
    expect(utolsoHivas()[1]).toEqual({ courseId: 42 })

    trackCourseStarted({ courseId: 42, courseSku: '' })
    expect(utolsoHivas()[1]).toEqual({ courseId: 42 })
  })
})

describe('trackLessonCompleted', () => {
  it('a lecke technikai adatait és a haladást küldi', () => {
    trackLessonCompleted({
      courseId: 7,
      courseSku: 'ABC',
      lessonRef: '6a8023fc6542ba2307569974',
      lessonKind: 'video',
      moduleIndex: 2,
      percent: 45,
    })

    expect(utolsoHivas()).toEqual([
      'lesson_completed',
      {
        courseId: 7,
        courseSku: 'ABC',
        lessonRef: '6a8023fc6542ba2307569974',
        lessonKind: 'video',
        moduleIndex: 2,
        percent: 45,
      },
    ])
  })
})

describe('trackModuleCompleted és trackCourseCompleted', () => {
  it('a modul-esemény a modul sorszámát és a kurzus-százalékot küldi', () => {
    trackModuleCompleted({ courseId: 7, moduleIndex: 1, percent: 60 })
    expect(utolsoHivas()).toEqual(['module_completed', { courseId: 7, moduleIndex: 1, percent: 60 }])
  })

  it('a kurzus-befejezés a leckeszámot küldi', () => {
    trackCourseCompleted({ courseId: 7, courseSku: 'ABC', lessonCount: 18 })
    expect(utolsoHivas()).toEqual([
      'course_completed',
      { courseId: 7, courseSku: 'ABC', lessonCount: 18 },
    ])
  })
})

describe('adatvédelem — személyes adat nem szivároghat ki', () => {
  it('EGYETLEN esemény tulajdonságai sem tartalmaznak e-mailt, nevet vagy IP-t', () => {
    trackCourseStarted({ courseId: 1, courseSku: 'A' })
    trackLessonCompleted({
      courseId: 1,
      courseSku: 'A',
      lessonRef: 'ref',
      lessonKind: 'szoveg',
      moduleIndex: 0,
      percent: 10,
    })
    trackModuleCompleted({ courseId: 1, moduleIndex: 0, percent: 10 })
    trackCourseCompleted({ courseId: 1, lessonCount: 3 })

    const tiltottKulcsok = ['email', 'name', 'nev', 'ip', 'ipAddress', 'userId', 'user']
    for (const [, properties] of captureAnalyticsEvent.mock.calls as [string, Record<string, unknown>][]) {
      for (const kulcs of Object.keys(properties)) {
        expect(tiltottKulcsok).not.toContain(kulcs)
      }
      // Semmilyen érték nem nézhet ki e-mail-címnek.
      for (const ertek of Object.values(properties)) {
        if (typeof ertek === 'string') {
          expect(ertek).not.toMatch(/@/)
        }
      }
    }
  })
})
