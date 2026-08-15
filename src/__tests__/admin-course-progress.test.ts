import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  ariaSortValue,
  filterStudents,
  formatRelativeHungarian,
  ringGeometry,
  sortStudents,
  statusLabel,
} from '../components/admin/course-progress-view'
import {
  createCourseProgressHandler,
  ENROLLMENT_MAX,
  ENROLLMENT_PAGE_SIZE,
} from '../lib/admin/course-progress-handler'
import {
  buildCourseProgressStats,
  type CourseEnrollment,
  type CourseProgressStatRow,
  type CourseStudentProgress,
} from '../lib/admin/course-progress-stats'
import { buildCurriculum, type Curriculum } from '../lib/curriculum/curriculum'

/**
 * ADMIN kurzus-haladás — az összesítő mag, a HTTP-végpont és a nézet-logika.
 *
 * A tesztek KIZÁRÓLAG tiszta függvényeket és injektált Payload-mockot hívnak:
 * valódi hálózati hívás sehonnan nem indulhat (a 15. üzemeltetési tanulság).
 *
 * A százalék-számítás maga a KÖZÖS `summarizeCurriculum` modulé — itt azt
 * ellenőrizzük, hogy az admin-összesítés helyesen csoportosít, és a
 * szélsőséges eseteket (0 beiratkozott, 0 leckés kurzus, orphan ref, nem
 * beiratkozott felhasználó sorai, duplikált sor) sem torzítja el.
 */

/** Videó-lecke a tananyaghoz — `ready` státusz nélkül nem lenne elindítható. */
function lesson(id: string, title: string, status: 'ready' | 'processing' = 'ready') {
  return { id, title, kind: 'video' as const, streamAssetId: `guid-${id}`, status, durationSec: 60 }
}

/** Kétmodulos, 4 elindítható leckés próbakurzus. */
function demoCurriculum(): Curriculum {
  return buildCurriculum(
    {
      modules: [
        {
          title: '1. fejezet',
          lessons: [lesson('l1', 'Első lecke'), lesson('l2', 'Második lecke')],
        },
        {
          title: '2. fejezet',
          lessons: [lesson('l3', 'Harmadik lecke'), lesson('l4', 'Negyedik lecke')],
        },
      ],
      videos: null,
    } as unknown as Parameters<typeof buildCurriculum>[0],
    true,
  )
}

function enrollment(userId: number, name: string): CourseEnrollment {
  return { userId, email: `user${String(userId)}@example.test`, name }
}

function row(userId: number, videoRef: string, watchedAt?: string): CourseProgressStatRow {
  return { userId, videoRef, watchedAt: watchedAt ?? '2026-08-01T10:00:00.000Z' }
}

describe('buildCourseProgressStats — összesítés', () => {
  it('0 beiratkozott: minden összesítő 0, nincs nullával osztás', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [],
      progressRows: [],
    })

    expect(stats.students).toEqual([])
    expect(stats.totals).toEqual({
      enrolled: 0,
      started: 0,
      completed: 0,
      notStarted: 0,
      averagePercent: 0,
      completionRateOfEnrolled: 0,
      completionRateOfStarted: 0,
    })
    // A lemorzsolódás-sorok a TANANYAGBÓL jönnek, tehát léteznek beiratkozott nélkül is.
    expect(stats.lessons).toHaveLength(4)
    expect(stats.lessons.every((entry) => entry.completedCount === 0)).toBe(true)
  })

  it('0 leckés kurzus: 0% és „nem-kezdte", nincs hiba', () => {
    const stats = buildCourseProgressStats({
      curriculum: buildCurriculum({ modules: null, videos: null }, true),
      enrollments: [enrollment(1, 'Kovács Anna')],
      progressRows: [row(1, 'barmi')],
    })

    expect(stats.lessons).toEqual([])
    expect(stats.students[0]).toMatchObject({
      completed: 0,
      total: 0,
      percent: 0,
      status: 'nem-kezdte',
      currentLessonTitle: null,
    })
    expect(stats.totals.averagePercent).toBe(0)
    expect(stats.totals.completionRateOfEnrolled).toBe(0)
  })

  it('senki nem kezdte el: started 0, notStarted = enrolled', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A'), enrollment(2, 'B')],
      progressRows: [],
    })

    expect(stats.totals).toMatchObject({ enrolled: 2, started: 0, completed: 0, notStarted: 2 })
    expect(stats.students.map((student) => student.status)).toEqual(['nem-kezdte', 'nem-kezdte'])
    expect(stats.students[0].currentLessonTitle).toBe('Első lecke')
  })

  it('mindenki befejezte: 100%, és nincs „aktuális lecke"', () => {
    const refs = ['l1', 'l2', 'l3', 'l4']
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A'), enrollment(2, 'B')],
      progressRows: [1, 2].flatMap((userId) => refs.map((ref) => row(userId, ref))),
    })

    expect(stats.totals).toMatchObject({
      enrolled: 2,
      started: 2,
      completed: 2,
      notStarted: 0,
      averagePercent: 100,
      completionRateOfEnrolled: 100,
      completionRateOfStarted: 100,
    })
    expect(stats.students.every((student) => student.status === 'befejezte')).toBe(true)
    expect(stats.students.every((student) => student.currentLessonTitle === null)).toBe(true)
  })

  it('vegyes állapotok: átlag és arányok a definíció szerint', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A'), enrollment(2, 'B'), enrollment(3, 'C'), enrollment(4, 'D')],
      progressRows: [
        // 1: mind a 4 → 100% (befejezte)
        row(1, 'l1'),
        row(1, 'l2'),
        row(1, 'l3'),
        row(1, 'l4'),
        // 2: 2 lecke → 50% (folyamatban)
        row(2, 'l1'),
        row(2, 'l2'),
        // 3: 1 lecke → 25% (folyamatban)
        row(3, 'l1'),
        // 4: semmi → 0% (nem kezdte)
      ],
    })

    expect(stats.totals.enrolled).toBe(4)
    expect(stats.totals.started).toBe(3)
    expect(stats.totals.completed).toBe(1)
    expect(stats.totals.notStarted).toBe(1)
    // (100 + 50 + 25 + 0) / 4 = 43,75 → 44
    expect(stats.totals.averagePercent).toBe(44)
    // 1/4 = 25%, 1/3 = 33%
    expect(stats.totals.completionRateOfEnrolled).toBe(25)
    expect(stats.totals.completionRateOfStarted).toBe(33)
    expect(stats.students[1]).toMatchObject({ percent: 50, currentLessonTitle: 'Harmadik lecke' })
  })

  it('orphan ref (törölt leckére mutató sor) nem számít bele', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A')],
      progressRows: [row(1, 'l1'), row(1, 'torolt-lecke'), row(1, '   ')],
    })

    expect(stats.students[0]).toMatchObject({ completed: 1, total: 4, percent: 25 })
    // Az orphan sor a lemorzsolódásban sem jelenik meg új sorként.
    expect(stats.lessons.map((entry) => entry.lessonRef)).toEqual(['l1', 'l2', 'l3', 'l4'])
  })

  it('nem beiratkozott felhasználó haladás-sorai teljesen kimaradnak', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A')],
      progressRows: [row(1, 'l1'), row(99, 'l1'), row(99, 'l2'), row(99, 'l3'), row(99, 'l4')],
    })

    expect(stats.students).toHaveLength(1)
    expect(stats.totals).toMatchObject({ enrolled: 1, started: 1, completed: 0 })
    // A 99-es sorai nem duzzasztják fel az első lecke elvégzettségét.
    expect(stats.lessons[0].completedCount).toBe(1)
  })

  it('duplikált haladás-sor nem torzít', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A')],
      progressRows: [row(1, 'l1'), row(1, 'l1'), row(1, 'l1')],
    })

    expect(stats.students[0]).toMatchObject({ completed: 1, percent: 25 })
    expect(stats.lessons[0].completedCount).toBe(1)
  })

  it('duplikált beiratkozás (ugyanaz a userId kétszer) egyszer jelenik meg', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A'), enrollment(1, 'A ismét')],
      progressRows: [row(1, 'l1')],
    })

    expect(stats.students).toHaveLength(1)
    expect(stats.totals.enrolled).toBe(1)
    expect(stats.lessons[0].completedCount).toBe(1)
  })

  it('a feldolgozás alatti videó nem kerül a nevezőbe és a lemorzsolódásba sem', () => {
    const curriculum = buildCurriculum(
      {
        modules: [
          {
            title: 'F',
            lessons: [lesson('l1', 'Kész lecke'), lesson('l2', 'Készülő lecke', 'processing')],
          },
        ],
        videos: null,
      } as unknown as Parameters<typeof buildCurriculum>[0],
      true,
    )
    const stats = buildCourseProgressStats({
      curriculum,
      enrollments: [enrollment(1, 'A')],
      progressRows: [row(1, 'l1')],
    })

    expect(stats.students[0]).toMatchObject({ completed: 1, total: 1, percent: 100, status: 'befejezte' })
    expect(stats.lessons).toHaveLength(1)
  })

  it('lastActivityAt a legkésőbbi SZÁMÍTÓ megjelölés; az orphan sor nem viszi előre', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A')],
      progressRows: [
        row(1, 'l1', '2026-08-01T08:00:00.000Z'),
        row(1, 'l2', '2026-08-03T08:00:00.000Z'),
        row(1, 'torolt', '2026-08-30T08:00:00.000Z'),
        { userId: 1, videoRef: 'l3', watchedAt: 'nem-datum' },
      ],
    })

    expect(stats.students[0].lastActivityAt).toBe('2026-08-03T08:00:00.000Z')
  })

  it('lemorzsolódás: leckénkénti elvégzettség és a veszteség az előzőhöz képest', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A'), enrollment(2, 'B'), enrollment(3, 'C')],
      progressRows: [
        row(1, 'l1'),
        row(2, 'l1'),
        row(3, 'l1'),
        row(1, 'l2'),
        row(2, 'l2'),
        row(1, 'l3'),
        // l4-et senki
      ],
    })

    expect(
      stats.lessons.map((entry) => [entry.title, entry.completedCount, entry.dropOffFromPrevious]),
    ).toEqual([
      ['Első lecke', 3, 0],
      ['Második lecke', 2, 1],
      ['Harmadik lecke', 1, 1],
      ['Negyedik lecke', 0, 1],
    ])
    expect(stats.lessons[0].moduleTitle).toBe('1. fejezet')
    expect(stats.lessons[3].moduleTitle).toBe('2. fejezet')
  })

  it('átugrott lecke: a „visszaugró" darabszám nem ad negatív lemorzsolódást', () => {
    const stats = buildCourseProgressStats({
      curriculum: demoCurriculum(),
      enrollments: [enrollment(1, 'A'), enrollment(2, 'B')],
      // Az l2-t senki, az l3-at mindenki — a 2. lecke „gödör" a tölcsérben.
      progressRows: [row(1, 'l1'), row(2, 'l1'), row(1, 'l3'), row(2, 'l3')],
    })

    expect(stats.lessons.map((entry) => entry.dropOffFromPrevious)).toEqual([0, 2, 0, 2])
    expect(stats.lessons[2].completedCount).toBe(2)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
 * A HTTP-végpont — injektált Payload-mockkal, valódi hálózat nélkül.
 * ═══════════════════════════════════════════════════════════════════════════ */

const URL_BASE = 'http://localhost:3000/api/admin/course-progress'

interface MockOptions {
  authUser?: { id: number; role: string } | null
  productExists?: boolean
  users?: Array<{ id: number; email: string; name?: string | null }>
  progress?: Array<{ user: number; videoRef: string; watchedAt: string }>
}

/**
 * Lapozást is kiszolgáló Payload-mock: a `find` a `page`/`limit` szerint szeletel,
 * és `hasNextPage`-et is ad — így a handler lapozó ciklusa VALÓDIAN fut le.
 */
function createMockPayload(options: MockOptions = {}) {
  const users = options.users ?? [
    { id: 1, email: 'anna@example.test', name: 'Kovács Anna' },
    { id: 2, email: 'bela@example.test', name: 'Nagy Béla' },
  ]
  const progress = options.progress ?? [
    { user: 1, videoRef: 'l1', watchedAt: '2026-08-10T08:00:00.000Z' },
    { user: 1, videoRef: 'l2', watchedAt: '2026-08-11T08:00:00.000Z' },
  ]
  const product = {
    id: 42,
    displayTitle: 'Kéztorna otthon',
    sku: 'DEMO-001',
    modules: [
      {
        title: '1. fejezet',
        lessons: [lesson('l1', 'Első lecke'), lesson('l2', 'Második lecke')],
      },
      { title: '2. fejezet', lessons: [lesson('l3', 'Harmadik lecke'), lesson('l4', 'Negyedik lecke')] },
    ],
    videos: null,
  }

  const calls: Array<{ collection: string; page?: number; limit?: number }> = []

  const page = <T,>(rows: T[], pageNumber = 1, limit = 10) => {
    const start = (pageNumber - 1) * limit
    const docs = rows.slice(start, start + limit)
    return {
      docs,
      totalDocs: rows.length,
      hasNextPage: start + docs.length < rows.length,
    }
  }

  const payload = {
    auth: vi.fn(async () => ({
      user:
        options.authUser === undefined ? { id: 1, role: 'owner' } : options.authUser,
    })),
    find: vi.fn(async (args: { collection: string; page?: number; limit?: number }) => {
      calls.push({ collection: args.collection, page: args.page, limit: args.limit })
      if (args.collection === 'products') {
        return (options.productExists ?? true)
          ? { docs: [product], totalDocs: 1, hasNextPage: false }
          : { docs: [], totalDocs: 0, hasNextPage: false }
      }
      if (args.collection === 'users') {
        return page(users, args.page, args.limit)
      }
      if (args.collection === 'course-progress') {
        return page(progress, args.page, args.limit)
      }
      return { docs: [], totalDocs: 0, hasNextPage: false }
    }),
  }

  return { payload: payload as unknown as Payload, calls }
}

function handlerFor(options: MockOptions = {}) {
  const { payload, calls } = createMockPayload(options)
  return { handler: createCourseProgressHandler({ getPayload: async () => payload }), calls }
}

function getRequest(query = '?productId=42'): Request {
  return new Request(`${URL_BASE}${query}`, { method: 'GET' })
}

describe('GET /api/admin/course-progress — jogosultság és validálás', () => {
  it('401, ha nincs bejelentkezett felhasználó', async () => {
    const { handler } = handlerFor({ authUser: null })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toContain('bejelentkezés')
  })

  it('403 customer szerepkörrel', async () => {
    const { handler } = handlerFor({ authUser: { id: 9, role: 'customer' } })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(403)
    expect(body.error).toContain('jogosultság')
  })

  it('400 hiányzó productId esetén', async () => {
    const { handler } = handlerFor()

    const response = await handler(getRequest(''))
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toContain('kurzus-azonosító')
  })

  it('400 nem szám vagy nem pozitív productId esetén', async () => {
    const { handler } = handlerFor()

    for (const query of ['?productId=abc', '?productId=0', '?productId=-3', '?productId=1.5']) {
      const response = await handler(getRequest(query))
      expect(response.status).toBe(400)
    }
  })

  it('404 ismeretlen kurzusnál', async () => {
    const { handler } = handlerFor({ productExists: false })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(404)
    expect(body.error).toContain('Nincs ilyen kurzus')
  })

  it('500 váratlan technikai hibánál (magyar üzenet)', async () => {
    const handler = createCourseProgressHandler({
      getPayload: async () => {
        throw new Error('adatbázis nem elérhető')
      },
    })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(500)
    expect(body.error).toContain('Váratlan hiba')
  })
})

describe('GET /api/admin/course-progress — 200 válasz', () => {
  it('staff szerepkörrel is kiszolgál, és a KÖZÖS számítás szerinti százalékot adja', async () => {
    const { handler } = handlerFor({ authUser: { id: 5, role: 'staff' } })

    const response = await handler(getRequest())
    const body = (await response.json()) as {
      product: { id: number; title: string }
      totals: { enrolled: number; started: number; completed: number; averagePercent: number }
      students: CourseStudentProgress[]
      lessons: Array<{ lessonRef: string; completedCount: number }>
      meta: { totalLessons: number; enrollments: { returned: number; truncated: boolean } }
      notice: string | null
    }

    expect(response.status).toBe(200)
    expect(body.product).toEqual({ id: 42, title: 'Kéztorna otthon' })
    expect(body.meta.totalLessons).toBe(4)
    expect(body.totals).toMatchObject({ enrolled: 2, started: 1, completed: 0, averagePercent: 25 })
    expect(body.students[0]).toMatchObject({
      userId: 1,
      name: 'Kovács Anna',
      completed: 2,
      total: 4,
      percent: 50,
      status: 'folyamatban',
      currentLessonTitle: 'Harmadik lecke',
      lastActivityAt: '2026-08-11T08:00:00.000Z',
    })
    expect(body.students[1]).toMatchObject({ userId: 2, percent: 0, status: 'nem-kezdte' })
    expect(body.lessons).toHaveLength(4)
    expect(body.meta.enrollments).toEqual({ returned: 2, total: 2, truncated: false })
    expect(body.notice).toBeNull()
  })

  it('nulla beiratkozottnál üres lista, hibátlan összesítéssel', async () => {
    const { handler } = handlerFor({ users: [], progress: [] })

    const response = await handler(getRequest())
    const body = (await response.json()) as {
      students: unknown[]
      totals: { enrolled: number }
    }

    expect(response.status).toBe(200)
    expect(body.students).toEqual([])
    expect(body.totals.enrolled).toBe(0)
  })

  it('a beiratkozottakat LAPOZVA olvassa be — a 10-es alapértelmezett limit nem csonkol', async () => {
    const manyUsers = Array.from({ length: ENROLLMENT_PAGE_SIZE + 25 }, (_, index) => ({
      id: index + 1,
      email: `u${String(index + 1)}@example.test`,
      name: `Hallgató ${String(index + 1)}`,
    }))
    const { handler, calls } = handlerFor({ users: manyUsers, progress: [] })

    const response = await handler(getRequest())
    const body = (await response.json()) as {
      totals: { enrolled: number }
      meta: { enrollments: { returned: number; truncated: boolean } }
    }

    expect(body.totals.enrolled).toBe(manyUsers.length)
    expect(body.meta.enrollments).toEqual({
      returned: manyUsers.length,
      total: manyUsers.length,
      truncated: false,
    })
    // Explicit limit MINDEN lekérdezésen — sosem az alapértelmezett 10.
    expect(calls.filter((call) => call.collection === 'users')).toHaveLength(2)
    expect(calls.every((call) => call.collection === 'products' || call.limit !== undefined)).toBe(true)
  })

  it('a felső korlát fölött CSONKOL, és ezt ki is mondja (nem hallgatja el)', async () => {
    const manyUsers = Array.from({ length: ENROLLMENT_MAX + 5 }, (_, index) => ({
      id: index + 1,
      email: `u${String(index + 1)}@example.test`,
      name: null,
    }))
    const { handler } = handlerFor({ users: manyUsers, progress: [] })

    const response = await handler(getRequest())
    const body = (await response.json()) as {
      totals: { enrolled: number }
      meta: { enrollments: { returned: number; total: number; truncated: boolean } }
      notice: string | null
    }

    expect(body.totals.enrolled).toBe(ENROLLMENT_MAX)
    expect(body.meta.enrollments).toEqual({
      returned: ENROLLMENT_MAX,
      total: manyUsers.length,
      truncated: true,
    })
    expect(body.notice).toContain('csonkolt')
  })

  it('pontosan a korláttal egyező létszám NEM számít csonkoltnak', async () => {
    const exactUsers = Array.from({ length: ENROLLMENT_MAX }, (_, index) => ({
      id: index + 1,
      email: `u${String(index + 1)}@example.test`,
      name: null,
    }))
    const { handler } = handlerFor({ users: exactUsers, progress: [] })

    const response = await handler(getRequest())
    const body = (await response.json()) as {
      meta: { enrollments: { truncated: boolean } }
      notice: string | null
    }

    expect(body.meta.enrollments.truncated).toBe(false)
    expect(body.notice).toBeNull()
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
 * A panel tiszta nézet-logikája.
 * ═══════════════════════════════════════════════════════════════════════════ */

function student(
  overrides: Partial<CourseStudentProgress> & Pick<CourseStudentProgress, 'userId'>,
): CourseStudentProgress {
  return {
    name: null,
    email: `u${String(overrides.userId)}@example.test`,
    completed: 0,
    total: 4,
    percent: 0,
    status: 'nem-kezdte',
    lastActivityAt: null,
    currentLessonTitle: null,
    enrolledAt: null,
    ...overrides,
  }
}

describe('course-progress-view — szűrés, keresés, rendezés', () => {
  const students = [
    student({ userId: 1, name: 'Kovács Anna', percent: 50, status: 'folyamatban', lastActivityAt: '2026-08-10T08:00:00.000Z' }),
    student({ userId: 2, name: 'Nagy Béla', percent: 100, status: 'befejezte', lastActivityAt: '2026-08-12T08:00:00.000Z' }),
    student({ userId: 3, name: 'Szabó Csilla', percent: 0, status: 'nem-kezdte' }),
  ]

  it('állapot-szűrő', () => {
    expect(filterStudents(students, { status: 'befejezte', query: '' }).map((s) => s.userId)).toEqual([2])
    expect(filterStudents(students, { status: 'mind', query: '' })).toHaveLength(3)
  })

  it('keresés névre és e-mailre, ékezet-érzéketlenül', () => {
    expect(filterStudents(students, { status: 'mind', query: 'kovacs' }).map((s) => s.userId)).toEqual([1])
    expect(filterStudents(students, { status: 'mind', query: 'SZABÓ' }).map((s) => s.userId)).toEqual([3])
    expect(filterStudents(students, { status: 'mind', query: 'u2@' }).map((s) => s.userId)).toEqual([2])
    expect(filterStudents(students, { status: 'mind', query: 'nincs ilyen' })).toEqual([])
  })

  it('a szűrő és a kereső együtt is dolgozik', () => {
    expect(
      filterStudents(students, { status: 'folyamatban', query: 'nagy' }),
    ).toEqual([])
  })

  it('haladás szerinti rendezés SZÁM szerint, mindkét irányban', () => {
    expect(sortStudents(students, 'haladas', 'asc').map((s) => s.percent)).toEqual([0, 50, 100])
    expect(sortStudents(students, 'haladas', 'desc').map((s) => s.percent)).toEqual([100, 50, 0])
  })

  it('a rendezés nem módosítja a bemeneti tömböt', () => {
    const before = students.map((s) => s.userId)
    sortStudents(students, 'haladas', 'desc')
    expect(students.map((s) => s.userId)).toEqual(before)
  })

  it('azonos százaléknál a név dönt (determinisztikus sorrend)', () => {
    const tie = [
      student({ userId: 10, name: 'Zsolt', percent: 25 }),
      student({ userId: 11, name: 'Anna', percent: 25 }),
    ]
    expect(sortStudents(tie, 'haladas', 'asc').map((s) => s.name)).toEqual(['Anna', 'Zsolt'])
  })

  it('aktivitás szerinti rendezés: a soha nem aktív hallgató növekvő sorrendben elöl', () => {
    expect(sortStudents(students, 'aktivitas', 'asc').map((s) => s.userId)).toEqual([3, 1, 2])
    expect(sortStudents(students, 'aktivitas', 'desc').map((s) => s.userId)).toEqual([2, 1, 3])
  })

  it('aria-sort csak az aktív oszlopon', () => {
    expect(ariaSortValue('haladas', 'haladas', 'asc')).toBe('ascending')
    expect(ariaSortValue('haladas', 'haladas', 'desc')).toBe('descending')
    expect(ariaSortValue('nev', 'haladas', 'asc')).toBe('none')
  })

  it('magyar állapot-feliratok', () => {
    expect(statusLabel('nem-kezdte')).toBe('Nem kezdte el')
    expect(statusLabel('folyamatban')).toBe('Folyamatban')
    expect(statusLabel('befejezte')).toBe('Befejezte')
  })
})

describe('course-progress-view — relatív idő és ring-geometria', () => {
  const now = new Date('2026-08-15T12:00:00.000Z')

  it('magyar relatív időpontok', () => {
    expect(formatRelativeHungarian('2026-08-15T11:59:30.000Z', now)).toBe('az imént')
    expect(formatRelativeHungarian('2026-08-15T11:30:00.000Z', now)).toBe('30 perce')
    expect(formatRelativeHungarian('2026-08-15T08:00:00.000Z', now)).toBe('4 órája')
    expect(formatRelativeHungarian('2026-08-14T10:00:00.000Z', now)).toBe('tegnap')
    expect(formatRelativeHungarian('2026-08-12T12:00:00.000Z', now)).toBe('3 napja')
    expect(formatRelativeHungarian('2026-08-01T12:00:00.000Z', now)).toBe('2 hete')
    expect(formatRelativeHungarian('2026-06-01T12:00:00.000Z', now)).toBe('2 hónapja')
    expect(formatRelativeHungarian('2024-06-01T12:00:00.000Z', now)).toBe('2 éve')
  })

  it('hiányzó vagy értelmezhetetlen időpont → null; jövőbeli → „az imént"', () => {
    expect(formatRelativeHungarian(null, now)).toBeNull()
    expect(formatRelativeHungarian('', now)).toBeNull()
    expect(formatRelativeHungarian('nem-datum', now)).toBeNull()
    expect(formatRelativeHungarian('2026-09-01T12:00:00.000Z', now)).toBe('az imént')
  })

  it('a ring ívhossza a százalékkal arányos, és a hibás érték sem fut túl', () => {
    const full = ringGeometry(100)
    expect(full.dash).toBeCloseTo(full.circumference)
    expect(full.gap).toBeCloseTo(0)

    const half = ringGeometry(50)
    expect(half.dash).toBeCloseTo(half.circumference / 2)

    expect(ringGeometry(0).dash).toBe(0)
    expect(ringGeometry(-10).dash).toBe(0)
    expect(ringGeometry(500).dash).toBeCloseTo(ringGeometry(100).circumference)
    expect(ringGeometry(Number.NaN).dash).toBe(0)
  })
})
