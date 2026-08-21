import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CourseEngagementSection } from '../components/admin/statistics/CourseEngagementSection'
import { StatisticsReport } from '../components/admin/StatisticsReport'
import { buildCurriculum, type Curriculum } from '../lib/curriculum/curriculum'
import {
  buildCourseEngagementReport,
  buildCourseEngagementRow,
  type CourseEngagementInput,
  type CourseEngagementReport,
} from '../lib/statistics/engagement'
import {
  ENGAGEMENT_ENROLLMENT_MAX,
  ENGAGEMENT_PROGRESS_MAX,
  queryCourseEngagement,
  type QueryCourseEngagementDeps,
} from '../lib/statistics/engagement-query'
import { buildRevenueReport } from '../lib/statistics/revenue'
import type { Product } from '../payload-types'

/**
 * Kurzus-hatás (eladás × haladás) tesztek — aggregátor, lekérdezés mockkal
 * és a szekció renderelése. Hálózat és adatbázis nincs: a Payload local API-t
 * a `find` dispatch-mock helyettesíti (repo-szabály: tesztből sosem megy ki
 * valódi hívás).
 */

/** Kétleckés (mindkettő elindítható) tananyag a régi videólistából. */
function ketLeckesTananyag(): Curriculum {
  return buildCurriculum(
    {
      modules: null,
      videos: [
        { id: 'v1', title: '1. lecke', streamAssetId: 'g1', status: 'ready', durationSec: 60 },
        { id: 'v2', title: '2. lecke', streamAssetId: 'g2', status: 'ready', durationSec: 60 },
      ],
    } as Pick<Product, 'modules' | 'videos'>,
    true,
  )
}

function enrollment(userId: number) {
  return { userId, email: '', name: null }
}

describe('buildCourseEngagementRow', () => {
  it('vegyes állapotokat a közös összesítő szerint számol', () => {
    // A: mindkét lecke kész (befejezte), B: egy lecke (folyamatban),
    // C: semmi (el sem kezdte).
    const row = buildCourseEngagementRow({
      productId: 7,
      title: 'Otthoni kéztorna',
      audience: 'laikus',
      curriculum: ketLeckesTananyag(),
      enrollments: [enrollment(1), enrollment(2), enrollment(3)],
      progressRows: [
        { userId: 1, videoRef: 'v1' },
        { userId: 1, videoRef: 'v2' },
        { userId: 2, videoRef: 'v1' },
      ],
    })
    expect(row.enrolled).toBe(3)
    expect(row.started).toBe(2)
    expect(row.completed).toBe(1)
    expect(row.notStarted).toBe(1)
    // (100 + 50 + 0) / 3 = 50
    expect(row.averagePercent).toBe(50)
    expect(row.completionRateOfEnrolled).toBe(33)
    expect(row.completionRateOfStarted).toBe(50)
  })

  it('0 hozzáférőnél minden számláló 0, nincs nullával osztás', () => {
    const row = buildCourseEngagementRow({
      productId: 1,
      title: 'Üres kurzus',
      audience: 'szakember',
      curriculum: ketLeckesTananyag(),
      enrollments: [],
      progressRows: [{ userId: 9, videoRef: 'v1' }],
    })
    expect(row).toMatchObject({
      enrolled: 0,
      started: 0,
      completed: 0,
      notStarted: 0,
      averagePercent: 0,
      completionRateOfEnrolled: 0,
      completionRateOfStarted: 0,
    })
  })

  it('ismeretlen audience a laikus ágra esik vissza', () => {
    const row = buildCourseEngagementRow({
      productId: 1,
      title: 'Kurzus',
      audience: null,
      curriculum: ketLeckesTananyag(),
      enrollments: [],
      progressRows: [],
    })
    expect(row.audience).toBe('laikus')
  })
})

describe('buildCourseEngagementReport', () => {
  it('0 kurzusnál üres, nem csonkolt jelentést ad', () => {
    expect(buildCourseEngagementReport([])).toEqual({ courses: [], truncated: false, skipped: 0 })
  })

  it('a truncated jelzést továbbadja', () => {
    expect(buildCourseEngagementReport([], { truncated: true }).truncated).toBe(true)
  })

  it('a legtöbb hozzáférőt sorolja előre, holtversenyben magyar ábécé dönt', () => {
    const base: Omit<CourseEngagementInput, 'productId' | 'title' | 'enrollments'> = {
      audience: 'laikus',
      curriculum: ketLeckesTananyag(),
      progressRows: [],
    }
    const report = buildCourseEngagementReport([
      { ...base, productId: 1, title: 'Cékla', enrollments: [enrollment(1)] },
      { ...base, productId: 2, title: 'Árvácska', enrollments: [enrollment(1)] },
      {
        ...base,
        productId: 3,
        title: 'Nagy kurzus',
        enrollments: [enrollment(1), enrollment(2)],
      },
    ])
    expect(report.courses.map((c) => c.title)).toEqual(['Nagy kurzus', 'Árvácska', 'Cékla'])
  })
})

interface FindArgs {
  collection: string
  where?: Record<string, unknown>
  page?: number
  limit?: number
  select?: Record<string, unknown>
  overrideAccess?: boolean
}

/** Lapozó mock: a teljes doc-listából a kért lapot adja vissza. */
function pagedResult<T>(docs: T[], page: number, limit: number) {
  const start = (page - 1) * limit
  const pageDocs = docs.slice(start, start + limit)
  return { docs: pageDocs, totalDocs: docs.length, hasNextPage: start + limit < docs.length }
}

function createPayloadMock(data: {
  products: Record<string, unknown>[]
  usersByProduct: Record<number, { id: number }[]>
  progressByProduct: Record<number, { user: number; videoRef: string }[]>
}): { deps: QueryCourseEngagementDeps; calls: FindArgs[] } {
  const calls: FindArgs[] = []
  const find = (rawArgs: unknown) => {
    const args = rawArgs as FindArgs
    calls.push(args)
    const page = args.page ?? 1
    const limit = args.limit ?? 10
    if (args.collection === 'products') {
      return Promise.resolve(pagedResult(data.products, page, limit))
    }
    const whereEquals = (kulcs: string): number => {
      const feltetel = args.where?.[kulcs] as { equals?: unknown } | undefined
      return typeof feltetel?.equals === 'number' ? feltetel.equals : -1
    }
    if (args.collection === 'users') {
      return Promise.resolve(
        pagedResult(data.usersByProduct[whereEquals('purchases')] ?? [], page, limit),
      )
    }
    if (args.collection === 'course-progress') {
      return Promise.resolve(
        pagedResult(data.progressByProduct[whereEquals('product')] ?? [], page, limit),
      )
    }
    throw new Error(`váratlan collection: ${args.collection}`)
  }
  return { deps: { payload: { find } as unknown as QueryCourseEngagementDeps['payload'] }, calls }
}

describe('queryCourseEngagement', () => {
  const videos = [
    { id: 'v1', title: '1. lecke', streamAssetId: 'g1', status: 'ready' },
    { id: 'v2', title: '2. lecke', streamAssetId: 'g2', status: 'ready' },
  ]

  it('kurzusonként összerakja a hatás-sorokat a mockolt Payloadból', async () => {
    const { deps, calls } = createPayloadMock({
      products: [
        { id: 1, displayTitle: 'Otthoni kéztorna', sku: 'otthoni', audience: 'laikus', videos },
        { id: 2, sku: 'szakmai-alap', audience: 'szakember', videos },
      ],
      usersByProduct: {
        1: [{ id: 10 }, { id: 11 }],
        2: [{ id: 10 }],
      },
      progressByProduct: {
        1: [
          { user: 10, videoRef: 'v1' },
          { user: 10, videoRef: 'v2' },
        ],
        2: [],
      },
    })

    const report = await queryCourseEngagement(deps)
    expect(report.truncated).toBe(false)
    expect(report.courses).toHaveLength(2)

    const otthoni = report.courses.find((c) => c.productId === 1)
    expect(otthoni).toMatchObject({
      title: 'Otthoni kéztorna',
      audience: 'laikus',
      enrolled: 2,
      started: 1,
      completed: 1,
      notStarted: 1,
      averagePercent: 50,
    })
    // displayTitle nélkül az sku a név (a course-progress handler sorrendje).
    const szakmai = report.courses.find((c) => c.productId === 2)
    expect(szakmai).toMatchObject({ title: 'szakmai-alap', audience: 'szakember', enrolled: 1 })

    // Minden lekérdezés a szerepkör-kapu utáni szerződéssel fut.
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every((call) => call.overrideAccess === true)).toBe(true)
    // Érzékeny vevő-mező nincs kiválasztva: a users-select üres (csak id).
    const usersCall = calls.find((call) => call.collection === 'users')
    expect(usersCall?.select).toEqual({})
  })

  it('0 kurzusnál üres jelentést ad, users-lekérdezés nélkül', async () => {
    const { deps, calls } = createPayloadMock({
      products: [],
      usersByProduct: {},
      progressByProduct: {},
    })
    const report = await queryCourseEngagement(deps)
    expect(report).toEqual({ courses: [], truncated: false, skipped: 0 })
    expect(calls.filter((call) => call.collection === 'users')).toHaveLength(0)
  })

  it('a felső korlát elérésekor csonkolást jelez', async () => {
    // A plafonnál eggyel több hozzáférő: a lapozásnak korlátoznia kell,
    // és a jelentésnek ki kell mondania a csonkolást.
    const sokUser = Array.from({ length: ENGAGEMENT_ENROLLMENT_MAX + 1 }, (_, i) => ({
      id: i + 1,
    }))
    const { deps } = createPayloadMock({
      products: [{ id: 1, sku: 'nagy', audience: 'laikus', videos }],
      usersByProduct: { 1: sokUser },
      progressByProduct: { 1: [] },
    })
    const report = await queryCourseEngagement(deps)
    expect(report.truncated).toBe(true)
    expect(report.courses[0]?.enrolled).toBe(ENGAGEMENT_ENROLLMENT_MAX)
  })

  it('csonkolt haladásnál a kimaradó diákok NEM „nem kezdte el"-ként jelennek meg', async () => {
    // A 2026-08-21-i kódvizsgálat HIGH (F1) találata, mért reprodukcióval:
    // 800 beiratkozott, MINDENKI mind a 20 leckével készen → 16 000 haladás-sor
    // a 10 000-es plafon ellen. A levágás nélkül a riport 300 KÉSZ diákot
    // „nem kezdte el"-nek mutatott, az átlagot pedig 63%-nak (a valóság 100%).
    // A torzítás iránya ellentétes a `truncated` jelzés ígéretével — ezért nem
    // elég a figyelmeztetés, a sornak magának kell igazat mondania.
    const huszLecke = Array.from({ length: 20 }, (_, i) => ({
      id: `v${String(i + 1)}`,
      title: `${String(i + 1)}. lecke`,
      streamAssetId: `g${String(i + 1)}`,
      status: 'ready',
    }))
    const diakok = Array.from({ length: 800 }, (_, i) => ({ id: i + 1 }))
    const sorok = diakok.flatMap((diak) =>
      huszLecke.map((lecke) => ({ user: diak.id, videoRef: lecke.id })),
    )
    expect(sorok.length).toBe(16_000)
    expect(sorok.length).toBeGreaterThan(ENGAGEMENT_PROGRESS_MAX)

    const { deps } = createPayloadMock({
      products: [{ id: 1, sku: 'nagy', audience: 'laikus', videos: huszLecke }],
      usersByProduct: { 1: diakok },
      progressByProduct: { 1: sorok },
    })
    const report = await queryCourseEngagement(deps)
    const sor = report.courses[0]

    expect(report.truncated).toBe(true)
    // A 10 000. sor pont az 500. diák utolsó leckéje. Őt is eldobjuk: a
    // plafonon nem tudhatjuk, hogy a sorai nem vágódtak-e félbe.
    expect(sor?.enrolled).toBe(499)
    expect(sor?.started).toBe(499)
    expect(sor?.completed).toBe(499)
    // EZ a tétel: kész diák sosem eshet a „nem kezdte el" oszlopba.
    expect(sor?.notStarted).toBe(0)
    expect(sor?.averagePercent).toBe(100)
    // A hibás (levágás nélküli) értékek, hogy a mutáció itt hangosan bukjon.
    expect(sor?.notStarted).not.toBe(300)
    expect(sor?.averagePercent).not.toBe(63)
  })

  it('egy kurzus hibája nem viszi el a többi kurzus sorát, és a kimaradás látszik', async () => {
    // F7 (2026-08-21): a ciklusban nem volt kurzusonkénti hibakezelés, tehát
    // egyetlen rossz termék az EGÉSZ Kurzus-hatás szekciót elvitte.
    const videos = [{ id: 'v1', title: '1. lecke', streamAssetId: 'g1', status: 'ready' }]
    const calls: FindArgs[] = []
    const find = (rawArgs: unknown) => {
      const args = rawArgs as FindArgs
      calls.push(args)
      const page = args.page ?? 1
      const limit = args.limit ?? 10
      if (args.collection === 'products') {
        return Promise.resolve(
          pagedResult(
            [
              { id: 1, sku: 'ep', audience: 'laikus', videos },
              { id: 2, sku: 'romlott', audience: 'laikus', videos },
            ],
            page,
            limit,
          ),
        )
      }
      const feltetel = args.where?.[args.collection === 'users' ? 'purchases' : 'product'] as
        | { equals?: unknown }
        | undefined
      if (feltetel?.equals === 2) {
        return Promise.reject(new Error('adatbázis-hiba a 2. kurzusnál'))
      }
      if (args.collection === 'users') {
        return Promise.resolve(pagedResult([{ id: 10 }], page, limit))
      }
      return Promise.resolve(pagedResult([{ user: 10, videoRef: 'v1' }], page, limit))
    }

    const report = await queryCourseEngagement({
      payload: { find } as unknown as QueryCourseEngagementDeps['payload'],
    })

    // Az ép kurzus sora megvan…
    expect(report.courses).toHaveLength(1)
    expect(report.courses[0]).toMatchObject({ productId: 1, enrolled: 1, completed: 1 })
    // …a hibás kurzus pedig nem tűnik el némán.
    expect(report.skipped).toBe(1)
  })

  it('a plafonok a kurzus-haladás handler plafonjainak a fele', () => {
    expect(ENGAGEMENT_ENROLLMENT_MAX).toBe(1000)
    expect(ENGAGEMENT_PROGRESS_MAX).toBe(10_000)
  })
})

describe('CourseEngagementSection', () => {
  const mintaReport: CourseEngagementReport = {
    courses: [
      {
        productId: 42,
        title: 'Otthoni kéztorna',
        audience: 'laikus',
        enrolled: 12,
        started: 8,
        completed: 3,
        notStarted: 4,
        averagePercent: 47,
        completionRateOfEnrolled: 25,
        completionRateOfStarted: 38,
      },
    ],
    truncated: false,
    skipped: 0,
  }

  it('kirajzolja a fejléceket, a számokat és a kurzuslap-linket', () => {
    const html = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: mintaReport }),
    )
    expect(html).toContain('Kurzus-hatás')
    // Az oszlopnevek SZÓRÓL SZÓRA a Kurzus-haladás panel címkéi
    // („Beiratkozott", „Nem kezdte el") — egy fogalom egy szó (WCAG 3.2.4;
    // 2026-08-20-i audit: korábban „Hozzáfér" és „El sem kezdte" állt itt).
    for (const fejlec of [
      'Kurzus',
      'Ág',
      'Beiratkozott',
      'Elkezdte',
      'Befejezte',
      'Nem kezdte el',
      'Átlagos haladás',
    ]) {
      expect(html).toContain(fejlec)
    }
    expect(html).not.toContain('Hozzáfér')
    expect(html).not.toContain('El sem kezdte')
    expect(html).toContain('Otthoni kéztorna')
    expect(html).toContain('47%')
    expect(html).toContain('href="/admin/collections/products/42"')
    expect(html).toContain('Névsor és szűrés a kurzus lapján')
    // A „ki az konkrétan" útbaigazítás magyarul, a kurzuslapra mutatva.
    expect(html).toContain('állapot szerint szűrhetsz')
  })

  it('a hibára kimaradt kurzusokat kimondja, egyes és többes számban is', () => {
    const egy = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: { ...mintaReport, skipped: 1 } }),
    )
    expect(egy).toContain('Egy kurzus adata technikai hiba miatt kimaradt')

    const tobb = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: { ...mintaReport, skipped: 3 } }),
    )
    expect(tobb).toContain('3 kurzus adata technikai hiba miatt kimaradt')

    // Ha nincs kimaradás, a mondat sem jelenik meg.
    const nulla = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: mintaReport }),
    )
    expect(nulla).not.toContain('technikai hiba miatt kimaradt')
  })

  it('a görgethető tábla-régió billentyűzetről fókuszálható és nevesített (WCAG 2.1.1, 4.1.2)', () => {
    // axe: scrollable-region-focusable; minta: Adrian Roselli,
    // https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html
    const html = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: mintaReport }),
    )
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-labelledby="kc-stat-kurzushatas-cim"')
    expect(html).toContain('id="kc-stat-kurzushatas-cim"')
  })

  it('a nullánál nagyobb „Nem kezdte el" érték kiemelést kap, a 0 nem', () => {
    const html = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: mintaReport }),
    )
    expect(html).toContain('--theme-error-500')

    const mindenkiElkezdte: CourseEngagementReport = {
      ...mintaReport,
      courses: [{ ...mintaReport.courses[0], notStarted: 0, started: 12 }],
    }
    const html0 = renderToStaticMarkup(
      createElement(CourseEngagementSection, { engagement: mindenkiElkezdte }),
    )
    expect(html0).not.toContain('--theme-error-500')
  })

  it('hiányzó adatnál magyar magyarázatot mutat, nem táblát', () => {
    const html = renderToStaticMarkup(createElement(CourseEngagementSection, { engagement: null }))
    expect(html).toContain('Kurzus-hatás')
    expect(html).toContain('nem tölthetők be')
    expect(html).not.toContain('<table')
  })

  it('üres kurzuslistánál ezt magyarul mondja ki', () => {
    const html = renderToStaticMarkup(
      createElement(CourseEngagementSection, {
        engagement: { courses: [], truncated: false, skipped: 0 },
      }),
    )
    expect(html).toContain('Még nincs kurzus')
  })

  it('csonkolt adatnál kimondja, hogy a számok alsó becslések', () => {
    const html = renderToStaticMarkup(
      createElement(CourseEngagementSection, {
        engagement: { ...mintaReport, truncated: true },
      }),
    )
    expect(html).toContain('alsó becslések')
  })
})

describe('StatisticsReport + kurzus-hatás integráció', () => {
  const revenueReport = buildRevenueReport([], [], { now: new Date('2026-08-15T12:00:00Z') })

  it('engagement nélkül is renderel: bevétel + magyar magyarázat a szekcióban', () => {
    const html = renderToStaticMarkup(
      createElement(StatisticsReport, { report: revenueReport, engagement: null }),
    )
    expect(html).toContain('Statisztika')
    expect(html).toContain('Havi bevétel')
    expect(html).toContain('Kurzus-hatás')
    expect(html).toContain('nem tölthetők be')
  })

  it('engagement adattal a kurzus-hatás tábla is megjelenik', () => {
    const html = renderToStaticMarkup(
      createElement(StatisticsReport, {
        report: revenueReport,
        engagement: {
          courses: [
            {
              productId: 1,
              title: 'Otthoni kéztorna',
              audience: 'laikus',
              enrolled: 5,
              started: 2,
              completed: 1,
              notStarted: 3,
              averagePercent: 30,
              completionRateOfEnrolled: 20,
              completionRateOfStarted: 50,
            },
          ],
          truncated: false,
          skipped: 0,
        },
      }),
    )
    expect(html).toContain('Nem kezdte el')
    expect(html).toContain('href="/admin/collections/products/1"')
  })
})
