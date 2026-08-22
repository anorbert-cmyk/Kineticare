import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  buildUserProgressRows,
  trimTruncatedUserProgress,
  type UserProgressSourceRow,
  type UserProgressUserInput,
} from '../lib/admin/user-course-progress'
import {
  createUserProgressHandler,
  USER_PROGRESS_PRODUCT_MAX,
  USER_PROGRESS_ROW_MAX,
} from '../lib/admin/user-progress-handler'
import {
  buildUserProgressQuery,
  parseUserIdsParam,
  USER_PROGRESS_ENDPOINT,
  USER_PROGRESS_MAX_USERS,
  type UserProgressResponse,
} from '../lib/admin/user-progress-contract'
import { buildCurriculum, type Curriculum } from '../lib/curriculum/curriculum'

/**
 * A Felhasználók-lista haladás-indikátora — a tiszta mag és a HTTP-végpont.
 *
 * A tesztek KIZÁRÓLAG tiszta függvényeket és injektált Payload-mockot hívnak:
 * valódi hálózati hívás sehonnan nem indulhat (a 15. üzemeltetési tanulság).
 *
 * A százalék-számítás maga a KÖZÖS `summarizeCurriculum` modulé — itt azt
 * ellenőrizzük, hogy a végpont helyesen csoportosít és invertál, kötegelve
 * kérdez, a szélsőséges eseteket (0 vásárlás, orphan ref, duplikált sor,
 * idegen kurzus sora) nem torzítja el, csonkolásnál pedig inkább kihagy egy
 * felhasználót, mint hogy hamis százalékot mutasson.
 */

const URL_BASE = 'https://kineticare.test'

/** Videó-lecke a tananyaghoz — `ready` státusz nélkül nem lenne elindítható. */
function lesson(id: string, title: string) {
  return { id, title, kind: 'video' as const, streamAssetId: `guid-${id}`, status: 'ready', durationSec: 60 }
}

/** Nyers termék-dokumentum a mockhoz: egy fejezet, négy elindítható leckével. */
function productDoc(id: number, refs: readonly string[]) {
  return {
    id,
    modules: [
      {
        title: '1. fejezet',
        lessons: refs.map((ref, index) => lesson(ref, `${String(index + 1)}. lecke`)),
      },
    ],
    videos: null,
  }
}

function curriculumOf(refs: readonly string[]): Curriculum {
  return buildCurriculum(
    productDoc(1, refs) as unknown as Parameters<typeof buildCurriculum>[0],
    true,
  )
}

/** Négy elindítható leckés próbakurzus (l1–l4). */
const NEGYLECKES = ['l1', 'l2', 'l3', 'l4'] as const
/** Másik, ugyancsak négyleckés kurzus (m1–m4) — a több kurzusos esetekhez. */
const MASIK_NEGYLECKES = ['m1', 'm2', 'm3', 'm4'] as const

function user(userId: number, productIds: number[]): UserProgressUserInput {
  return { userId, productIds }
}

function progressRow(userId: number, productId: number, videoRef: string): UserProgressSourceRow {
  return { userId, productId, videoRef }
}

describe('buildUserProgressRows — csoportosítás és inverzió', () => {
  const curriculums = new Map<number, Curriculum>([
    [10, curriculumOf(NEGYLECKES)],
    [20, curriculumOf(MASIK_NEGYLECKES)],
  ])

  it('két felhasználó két különböző kurzuson: mindenki a SAJÁT haladását kapja', () => {
    const rows = buildUserProgressRows({
      users: [user(1, [10]), user(2, [20])],
      rows: [
        progressRow(1, 10, 'l1'),
        progressRow(1, 10, 'l2'),
        progressRow(2, 20, 'm1'),
        progressRow(2, 20, 'm2'),
        progressRow(2, 20, 'm3'),
      ],
      curriculums,
    })

    expect(rows).toEqual([
      { userId: 1, courses: [{ productId: 10, percent: 50, status: 'folyamatban', lessonCount: 4 }] },
      { userId: 2, courses: [{ productId: 20, percent: 75, status: 'folyamatban', lessonCount: 4 }] },
    ])
  })

  it('a kurzusok NÖVEKVŐ azonosító-sorrendben állnak (determinisztikus válasz)', () => {
    const rows = buildUserProgressRows({
      // A `purchases` lista szándékosan fordított sorrendű.
      users: [user(1, [20, 10])],
      rows: [progressRow(1, 20, 'm1')],
      curriculums,
    })

    expect(rows[0].courses.map((entry) => entry.productId)).toEqual([10, 20])
    expect(rows[0].courses).toEqual([
      { productId: 10, percent: 0, status: 'nem-kezdte', lessonCount: 4 },
      { productId: 20, percent: 25, status: 'folyamatban', lessonCount: 4 },
    ])
  })

  it('0 vásárlású felhasználó: üres kurzus-lista, nem hiányzó sor', () => {
    const rows = buildUserProgressRows({
      users: [user(7, [])],
      rows: [],
      curriculums,
    })

    expect(rows).toEqual([{ userId: 7, courses: [] }])
  })

  it('ismeretlen (be nem olvasott) tananyagú kurzus kimarad — kitalált 0% helyett', () => {
    const rows = buildUserProgressRows({
      users: [user(1, [10, 999])],
      rows: [progressRow(1, 10, 'l1')],
      curriculums,
    })

    expect(rows[0].courses).toEqual([{ productId: 10, percent: 25, status: 'folyamatban', lessonCount: 4 }])
  })

  it('a duplikált felhasználó egyszer szerepel', () => {
    const rows = buildUserProgressRows({
      users: [user(1, [10]), user(1, [10, 20])],
      rows: [progressRow(1, 10, 'l1')],
      curriculums,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].courses).toEqual([{ productId: 10, percent: 25, status: 'folyamatban', lessonCount: 4 }])
  })

  it('olyan kurzus haladás-sora, amihez a felhasználó már nem fér hozzá: nem hoz elő sort', () => {
    const rows = buildUserProgressRows({
      users: [user(1, [10])],
      rows: [progressRow(1, 20, 'm1'), progressRow(1, 20, 'm2')],
      curriculums,
    })

    expect(rows).toEqual([
      { userId: 1, courses: [{ productId: 10, percent: 0, status: 'nem-kezdte', lessonCount: 4 }] },
    ])
  })

  it('minden lecke kész: 100% és „befejezte"', () => {
    const rows = buildUserProgressRows({
      users: [user(1, [10])],
      rows: NEGYLECKES.map((ref) => progressRow(1, 10, ref)),
      curriculums,
    })

    expect(rows[0].courses).toEqual([{ productId: 10, percent: 100, status: 'befejezte', lessonCount: 4 }])
  })
})

describe('trimTruncatedUserProgress — csonkolás felhasználó-határon', () => {
  it('csonkolás nélkül mindent változatlanul enged tovább', () => {
    const users = [user(1, [10]), user(2, [10])]
    const rows = [progressRow(1, 10, 'l1'), progressRow(2, 10, 'l1')]

    const result = trimTruncatedUserProgress({ users, rows, truncated: false })

    expect(result.users).toEqual(users)
    expect(result.rows).toEqual(rows)
    expect(result.omitted).toBe(0)
  })

  it('csonkolásnál az UTOLSÓ (félbevágott) felhasználó és a nála nagyobb azonosítójúak kimaradnak', () => {
    const result = trimTruncatedUserProgress({
      users: [user(1, [10]), user(2, [10]), user(3, [10])],
      rows: [
        progressRow(1, 10, 'l1'),
        progressRow(1, 10, 'l2'),
        // A 2. felhasználó sorai itt vágódtak félbe.
        progressRow(2, 10, 'l1'),
      ],
      truncated: true,
    })

    expect(result.users.map((entry) => entry.userId)).toEqual([1])
    expect(result.rows).toEqual([progressRow(1, 10, 'l1'), progressRow(1, 10, 'l2')])
    expect(result.omitted).toBe(2)
  })

  it('csonkolás ÉRTELMEZHETŐ sor nélkül: mindenki kimarad (nincs hova kiírni a figyelmeztetést)', () => {
    const result = trimTruncatedUserProgress({
      users: [user(1, [10]), user(2, [10])],
      rows: [],
      truncated: true,
    })

    expect(result.users).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.omitted).toBe(2)
  })

  it('a kihagyott felhasználó a válaszban SEM szerepel (nem 0%-kal)', () => {
    const trimmed = trimTruncatedUserProgress({
      users: [user(1, [10]), user(2, [10])],
      rows: [progressRow(1, 10, 'l1'), progressRow(2, 10, 'l1')],
      truncated: true,
    })
    const rows = buildUserProgressRows({
      users: trimmed.users,
      rows: trimmed.rows,
      curriculums: new Map([[10, curriculumOf(NEGYLECKES)]]),
    })

    expect(rows.map((entry) => entry.userId)).toEqual([1])
  })
})

interface FindArgs {
  collection: string
  where?: unknown
  page?: number
  limit?: number
  depth?: number
  sort?: string | string[]
  select?: Record<string, unknown>
}

interface MockUserDoc {
  id: number
  purchases: number[]
  name?: string
  email?: string
}

interface MockProgressDoc {
  user: number
  product: number
  videoRef: string
}

interface MockOptions {
  authUser?: { id: number; role: string } | null
  users?: MockUserDoc[]
  products?: Array<ReturnType<typeof productDoc>>
  progress?: MockProgressDoc[]
}

/** A `where` fából kiolvassa a keresett mező `in` értékeit (az `and` ágat is bejárja). */
function whereIn(where: unknown, field: string): number[] | null {
  if (typeof where !== 'object' || where === null) {
    return null
  }
  const record = where as Record<string, unknown>
  if (Array.isArray(record.and)) {
    for (const entry of record.and) {
      const found = whereIn(entry, field)
      if (found !== null) {
        return found
      }
    }
    return null
  }
  const clause = record[field]
  if (typeof clause === 'object' && clause !== null) {
    const values = (clause as Record<string, unknown>).in
    if (Array.isArray(values)) {
      return values.filter((value): value is number => typeof value === 'number')
    }
  }
  return null
}

function createMockPayload(options: MockOptions = {}) {
  const users = options.users ?? [
    { id: 1, purchases: [20, 10] },
    { id: 2, purchases: [20] },
  ]
  const products = options.products ?? [
    productDoc(10, NEGYLECKES),
    productDoc(20, MASIK_NEGYLECKES),
  ]
  const progress = options.progress ?? [
    { user: 1, product: 10, videoRef: 'l1' },
    { user: 1, product: 10, videoRef: 'l2' },
    { user: 1, product: 20, videoRef: 'm1' },
    { user: 2, product: 20, videoRef: 'm1' },
  ]
  const calls: FindArgs[] = []

  const page = <T,>(docs: T[], pageNumber = 1, limit = 10) => {
    const start = (pageNumber - 1) * limit
    const slice = docs.slice(start, start + limit)
    return { docs: slice, totalDocs: docs.length, hasNextPage: start + slice.length < docs.length }
  }

  /** A mock TISZTELETBEN TARTJA a `['user','id']` rendezést — a csonkolási teszt lényege. */
  const sortolt = (rows: MockProgressDoc[], sort: string | string[] | undefined) => {
    const mezok = Array.isArray(sort) ? sort : sort === undefined ? [] : [sort]
    if (!mezok.includes('user')) {
      return rows
    }
    return rows
      .map((entry, index) => ({ entry, index }))
      .sort((left, right) =>
        left.entry.user === right.entry.user
          ? left.index - right.index
          : left.entry.user - right.entry.user,
      )
      .map(({ entry }) => entry)
  }

  const payload = {
    auth: vi.fn(async () => ({
      user: options.authUser === undefined ? { id: 1, role: 'owner' } : options.authUser,
    })),
    find: vi.fn(async (args: FindArgs) => {
      calls.push(args)
      if (args.collection === 'users') {
        const ids = whereIn(args.where, 'id')
        const matching = ids === null ? users : users.filter((doc) => ids.includes(doc.id))
        return page(matching, args.page, args.limit)
      }
      if (args.collection === 'products') {
        const ids = whereIn(args.where, 'id')
        const matching = ids === null ? products : products.filter((doc) => ids.includes(doc.id))
        return page(matching, args.page, args.limit)
      }
      if (args.collection === 'course-progress') {
        const userIds = whereIn(args.where, 'user')
        const productIds = whereIn(args.where, 'product')
        const matching = progress.filter(
          (row) =>
            (userIds === null || userIds.includes(row.user)) &&
            (productIds === null || productIds.includes(row.product)),
        )
        return page(sortolt(matching, args.sort), args.page, args.limit)
      }
      return { docs: [], totalDocs: 0, hasNextPage: false }
    }),
  }

  return { payload: payload as unknown as Payload, calls }
}

function handlerFor(options: MockOptions = {}) {
  const { payload, calls } = createMockPayload(options)
  return { handler: createUserProgressHandler({ getPayload: async () => payload }), calls }
}

function getRequest(query = '?users=1,2'): Request {
  return new Request(`${URL_BASE}${USER_PROGRESS_ENDPOINT}${query}`, { method: 'GET' })
}

describe('GET /api/admin/user-progress — jogosultság és validálás', () => {
  it('401, ha nincs bejelentkezett felhasználó', async () => {
    const { handler, calls } = handlerFor({ authUser: null })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toContain('bejelentkezés')
    // A jogosulatlan kérés EGYETLEN adatbázis-olvasást sem indít.
    expect(calls).toHaveLength(0)
  })

  it('403 customer szerepkörrel', async () => {
    const { handler, calls } = handlerFor({ authUser: { id: 9, role: 'customer' } })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(403)
    expect(body.error).toContain('jogosultság')
    expect(calls).toHaveLength(0)
  })

  it('staff szerepkörrel kiszolgál', async () => {
    const { handler } = handlerFor({ authUser: { id: 5, role: 'staff' } })

    const response = await handler(getRequest())

    expect(response.status).toBe(200)
  })

  it('400 üres vagy értelmezhetetlen azonosító-listánál', async () => {
    const { handler } = handlerFor()

    for (const query of ['', '?users=', '?users=abc', '?users=0,-3,1.5', '?felhasznalok=1']) {
      const response = await handler(getRequest(query))
      const body = (await response.json()) as { error: string }

      expect(response.status).toBe(400)
      // A SZÁNDÉKOT mérjük, nem a megfogalmazást (lásd a párját az
      // admin-course-progress.test.ts-ben): melyik adat hiányzik, és mi a
      // teendő. A két szó EGYÜTT, ebben a sorrendben kell — a korábbi, külön
      // `toContain` páros egy „a kurzus azonosítója… felhasználó…" alakú,
      // ROSSZ MEZŐT megnevező üzenetet is átengedett volna.
      expect(body.error).toMatch(/felhasználó\w* azonosító/i)
      expect(body.error).toMatch(/Nyisd|Frissítsd|próbáld/i)
    }
  })

  it('400 a korlát fölött, és az üzenet KIMONDJA a korlátot', async () => {
    const tulSok = Array.from({ length: USER_PROGRESS_MAX_USERS + 1 }, (_, index) => index + 1)
    const { handler, calls } = handlerFor()

    const response = await handler(getRequest(`?users=${tulSok.join(',')}`))
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toContain(String(USER_PROGRESS_MAX_USERS))
    expect(calls).toHaveLength(0)
  })

  it('a korláttal PONTOSAN egyező kérés még kiszolgálódik', async () => {
    const eppannyi = Array.from({ length: USER_PROGRESS_MAX_USERS }, (_, index) => index + 1)
    const { handler } = handlerFor()

    const response = await handler(getRequest(`?users=${eppannyi.join(',')}`))

    expect(response.status).toBe(200)
  })

  it('400, ha a kért felhasználókhoz TÚL SOK különböző kurzus tartozik', async () => {
    // A kurzus-halmaz a `purchases` listákból gyűlik, tehát a mérete NEM
    // következik a felhasználó-korlátból: ellenőrzés nélkül korlátlan
    // azonosító-lista menne két `in` kifejezésbe.
    const sokKurzus = Array.from(
      { length: USER_PROGRESS_PRODUCT_MAX + 1 },
      (_unused, index) => index + 1,
    )
    const { handler, calls } = handlerFor({ users: [{ id: 1, purchases: sokKurzus }] })

    const response = await handler(getRequest('?users=1'))
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    // Az üzenet KIMONDJA a korlátot: enélkül a hívó nem tudná, mit tegyen.
    expect(body.error).toContain(String(USER_PROGRESS_PRODUCT_MAX))
    // A tananyag- és haladás-lekérdezés EL SEM INDUL (csak a users-olvasás fut le).
    expect(calls.map((call) => call.collection)).toEqual(['users'])
  })

  it('a kurzus-korláttal PONTOSAN egyező kérés még kiszolgálódik', async () => {
    const eppannyi = Array.from(
      { length: USER_PROGRESS_PRODUCT_MAX },
      (_unused, index) => index + 1,
    )
    const { handler } = handlerFor({ users: [{ id: 1, purchases: eppannyi }] })

    expect((await handler(getRequest('?users=1'))).status).toBe(200)
  })

  it('az int4-tartományon KÍVÜLI azonosító kimarad az értelmezésből', async () => {
    // A `users.id` Postgres `integer`: a `9e18` egész ugyan, de a lekérdezés
    // tartomány-hibával dőlne el tőle, vagyis egy kézzel írt URL 500-ast adna.
    expect(parseUserIdsParam('9e18')).toEqual([])
    expect(parseUserIdsParam('2147483648')).toEqual([])
    expect(parseUserIdsParam(String(Number.MAX_SAFE_INTEGER + 2))).toEqual([])
    // A határ maga ÉRVÉNYES, és a hétköznapi azonosítók változatlanul azok.
    expect(parseUserIdsParam('2147483647')).toEqual([2_147_483_647])
    expect(parseUserIdsParam('1,2,3')).toEqual([1, 2, 3])

    // Végponton: a tartományon kívüli azonosító 400-at ad, nem 500-at.
    const { handler, calls } = handlerFor()
    expect((await handler(getRequest('?users=9e18'))).status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('MINDEN ág no-store fejlécet ad (200, 401, 403, 400, 500)', async () => {
    // A 200-as ág konkrét vevők haladását hordozza; a tiltó ágak azért kapják
    // meg, hogy egy 401/403 válasz ne ragadhasson be a bejelentkezés utánra.
    const { handler } = handlerFor()
    expect((await handler(getRequest())).headers.get('Cache-Control')).toBe('no-store')
    expect((await handler(getRequest('?users=abc'))).headers.get('Cache-Control')).toBe('no-store')

    const anon = handlerFor({ authUser: null })
    expect((await anon.handler(getRequest())).headers.get('Cache-Control')).toBe('no-store')

    const customer = handlerFor({ authUser: { id: 9, role: 'customer' } })
    expect((await customer.handler(getRequest())).headers.get('Cache-Control')).toBe('no-store')

    const hibas = createUserProgressHandler({
      getPayload: async () => {
        throw new Error('adatbázis nem elérhető')
      },
    })
    expect((await hibas(getRequest())).headers.get('Cache-Control')).toBe('no-store')
  })

  it('500 váratlan technikai hibánál (magyar üzenet)', async () => {
    const handler = createUserProgressHandler({
      getPayload: async () => {
        throw new Error('adatbázis nem elérhető')
      },
    })

    const response = await handler(getRequest())
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(500)
    // §2.7: a hibaüzenet a helyzetet és a teendőt mondja (nem „Váratlan hiba…").
    expect(body.error).toContain('A kurzus-haladás most nem kérdezhető le')
  })
})

describe('GET /api/admin/user-progress — 200 válasz', () => {
  it('a KÖZÖS számítás szerinti százalékot és állapotot adja, kurzus szerint rendezve', async () => {
    const { handler } = handlerFor()

    const response = await handler(getRequest())
    const body = (await response.json()) as UserProgressResponse

    expect(response.status).toBe(200)
    expect(body).toEqual({
      users: [
        {
          userId: 1,
          courses: [
            { productId: 10, percent: 50, status: 'folyamatban', lessonCount: 4 },
            { productId: 20, percent: 25, status: 'folyamatban', lessonCount: 4 },
          ],
        },
        { userId: 2, courses: [{ productId: 20, percent: 25, status: 'folyamatban', lessonCount: 4 }] },
      ],
    })
  })

  it('KÖTEGELVE kérdez: felhasználónként NEM indít külön lekérdezést', async () => {
    const sokUser = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      purchases: [10],
    }))
    const { handler, calls } = handlerFor({ users: sokUser, progress: [] })

    const response = await handler(getRequest(`?users=${sokUser.map((doc) => doc.id).join(',')}`))
    const body = (await response.json()) as UserProgressResponse

    expect(response.status).toBe(200)
    expect(body.users).toHaveLength(40)
    // Egy users-, egy products- és egy course-progress-lekérdezés, semmi több.
    expect(calls.filter((call) => call.collection === 'users')).toHaveLength(1)
    expect(calls.filter((call) => call.collection === 'products')).toHaveLength(1)
    expect(calls.filter((call) => call.collection === 'course-progress')).toHaveLength(1)
    // Mindegyik `in` kifejezéssel és EXPLICIT limittel megy (a gyári 10 csonkolna).
    expect(whereIn(calls[0].where, 'id')).toHaveLength(40)
    expect(whereIn(calls[2].where, 'user')).toHaveLength(40)
    expect(whereIn(calls[2].where, 'product')).toEqual([10])
    expect(calls.every((call) => typeof call.limit === 'number')).toBe(true)
    expect(calls.every((call) => call.depth === 0)).toBe(true)
  })

  it('a haladás-sorokat FELHASZNÁLÓ szerint rendezve olvassa (a csonkolás így user-határon vág)', async () => {
    const { handler, calls } = handlerFor()

    await handler(getRequest())

    const progressCall = calls.find((call) => call.collection === 'course-progress')
    expect(progressCall?.sort).toEqual(['user', 'id'])
  })

  it('0 vásárlású felhasználónál nincs fölösleges lekérdezés, a sor mégis benne van', async () => {
    const { handler, calls } = handlerFor({
      users: [{ id: 3, purchases: [] }],
      progress: [],
    })

    const response = await handler(getRequest('?users=3'))
    const body = (await response.json()) as UserProgressResponse

    expect(body).toEqual({ users: [{ userId: 3, courses: [] }] })
    // Üres `in` feltételt SOSEM küldünk: kurzus híján a másik két olvasás elmarad.
    expect(calls.map((call) => call.collection)).toEqual(['users'])
  })

  it('nem létező felhasználó-azonosító egyszerűen kimarad (nincs kitalált 0%)', async () => {
    const { handler } = handlerFor()

    const response = await handler(getRequest('?users=1,4242'))
    const body = (await response.json()) as UserProgressResponse

    expect(body.users.map((entry) => entry.userId)).toEqual([1])
  })

  it('orphan (időközben törölt leckére mutató) sor nem növeli a százalékot', async () => {
    const { handler } = handlerFor({
      users: [{ id: 1, purchases: [10] }],
      progress: [
        { user: 1, product: 10, videoRef: 'l1' },
        { user: 1, product: 10, videoRef: 'mar-nincs-ilyen-lecke' },
      ],
    })

    const response = await handler(getRequest('?users=1'))
    const body = (await response.json()) as UserProgressResponse

    expect(body.users[0].courses).toEqual([
      { productId: 10, percent: 25, status: 'folyamatban', lessonCount: 4 },
    ])
  })

  it('duplikált haladás-sor nem torzít', async () => {
    const { handler } = handlerFor({
      users: [{ id: 1, purchases: [10] }],
      progress: [
        { user: 1, product: 10, videoRef: 'l1' },
        { user: 1, product: 10, videoRef: 'l1' },
        { user: 1, product: 10, videoRef: 'l2' },
      ],
    })

    const response = await handler(getRequest('?users=1'))
    const body = (await response.json()) as UserProgressResponse

    expect(body.users[0].courses).toEqual([
      { productId: 10, percent: 50, status: 'folyamatban', lessonCount: 4 },
    ])
  })

  it('törölt kurzusra mutató vásárlás: az adott kurzus kimarad, a többi megmarad', async () => {
    const { handler } = handlerFor({
      users: [{ id: 1, purchases: [10, 777] }],
      progress: [{ user: 1, product: 10, videoRef: 'l1' }],
    })

    const response = await handler(getRequest('?users=1'))
    const body = (await response.json()) as UserProgressResponse

    expect(body.users[0].courses).toEqual([
      { productId: 10, percent: 25, status: 'folyamatban', lessonCount: 4 },
    ])
  })

  it('CSONKOLÁSNÁL a félbevágott felhasználó KIMARAD — hamis, alulmért százalék helyett', async () => {
    // Az 1. és a 2. felhasználó sorai együtt PONTOSAN kitöltik a plafont, a
    // 3.-é már nem fér be: a beolvasott ablak a 2. felhasználó közepén ér véget.
    const felePlafon = USER_PROGRESS_ROW_MAX / 2
    const toltelek = (userId: number, from: number, count: number): MockProgressDoc[] =>
      Array.from({ length: count }, (_, index) => ({
        user: userId,
        product: 10,
        // Orphan refek: a százalékot nem mozdítják, csak a sorszámot töltik.
        videoRef: `toltelek-${String(userId)}-${String(from + index)}`,
      }))

    const progress: MockProgressDoc[] = [
      { user: 1, product: 10, videoRef: 'l1' },
      { user: 1, product: 10, videoRef: 'l2' },
      ...toltelek(1, 0, felePlafon - 2),
      ...toltelek(2, 0, felePlafon),
      { user: 3, product: 10, videoRef: 'l1' },
    ]
    const { handler } = handlerFor({
      users: [
        { id: 1, purchases: [10] },
        { id: 2, purchases: [10] },
        { id: 3, purchases: [10] },
      ],
      progress,
    })

    const response = await handler(getRequest('?users=1,2,3'))
    const body = (await response.json()) as UserProgressResponse

    expect(response.status).toBe(200)
    // Csak az 1. felhasználó adata TELJES — a 2. félbevágott, a 3. sorai be sem
    // jöttek, ezért mindkettő kimarad.
    expect(body.users).toEqual([
      { userId: 1, courses: [{ productId: 10, percent: 50, status: 'folyamatban', lessonCount: 4 }] },
    ])
  })
})

describe('GET /api/admin/user-progress — személyes adat SEHOL nem szivárog', () => {
  /** A teljes objektumfa kulcsai és sztring-értékei. */
  function walk(value: unknown, keys: string[], strings: string[]): void {
    if (typeof value === 'string') {
      strings.push(value)
      return
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        walk(entry, keys, strings)
      }
      return
    }
    if (typeof value === 'object' && value !== null) {
      for (const [key, entry] of Object.entries(value)) {
        keys.push(key)
        walk(entry, keys, strings)
      }
    }
  }

  it('a szerializált válaszban nincs `email`/`name` kulcs, sem e-mail alakú érték', async () => {
    // A mock SZÁNDÉKOSAN visszaad nevet és e-mailt is: ha a végpont bármikor
    // szélesebb mezőkészletet olvasna be, ez az őr azonnal megfogná.
    const { handler } = handlerFor({
      users: [
        { id: 1, purchases: [10], name: 'Kovács Anna', email: 'anna@example.test' },
        { id: 2, purchases: [20], name: 'Nagy Béla', email: 'bela@example.test' },
      ],
    })

    const response = await handler(getRequest())
    const body: unknown = await response.json()

    const keys: string[] = []
    const strings: string[] = []
    walk(body, keys, strings)

    expect(keys.length).toBeGreaterThan(0)
    expect(keys.filter((key) => /^(email|name)$/i.test(key))).toEqual([])
    expect(strings.filter((value) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value))).toEqual([])
    expect(strings.filter((value) => value.includes('Kovács') || value.includes('Nagy'))).toEqual([])
  })

  it('a felhasználó-lekérdezés KIZÁRÓLAG a hozzáférés-listát kéri ki', async () => {
    const { handler, calls } = handlerFor()

    await handler(getRequest())

    const userCall = calls.find((call) => call.collection === 'users')
    expect(userCall?.select).toEqual({ purchases: true })
    const progressCall = calls.find((call) => call.collection === 'course-progress')
    expect(progressCall?.select).toEqual({ user: true, product: true, videoRef: true })
  })
})

describe('szerződés — a kliens és a szerver ugyanazt az URL-t érti', () => {
  it('a kliens által épített query-t a szerver változatlanul értelmezi', async () => {
    const query = buildUserProgressQuery([1, 2])
    expect(query.startsWith(USER_PROGRESS_ENDPOINT)).toBe(true)
    expect(parseUserIdsParam(new URL(`${URL_BASE}${query}`).searchParams.get('users'))).toEqual([
      1, 2,
    ])

    const { handler } = handlerFor()
    const response = await handler(new Request(`${URL_BASE}${query}`, { method: 'GET' }))
    const body = (await response.json()) as UserProgressResponse

    expect(response.status).toBe(200)
    expect(body.users.map((entry) => entry.userId)).toEqual([1, 2])
  })
})
