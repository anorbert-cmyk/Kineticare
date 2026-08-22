/**
 * A Felhasználók-lista haladás-betöltőjének egységtesztje
 * (src/components/admin/user-progress-client.ts).
 *
 * Amit a tesztek védenek:
 *  - egy lista-oldal EGY hálózati kör: akárhány cella kérdez, egyetlen kérés
 *    megy ki (a felület felőli N+1 elkerülése),
 *  - a végpont csomag-korlátja fölött a kérés CSOMAGOKRA bomlik, és a
 *    részeredmények összefésülődnek,
 *  - hiba esetén a cellák `null`-t kapnak, a gyorsítótár NEM mérgeződik meg,
 *    tehát a következő megnyitás újrapróbálja,
 *  - ugyanarra a felhasználóra nem indul második kör,
 *  - a gyorsítótár-bejegyzés 60 másodperc után ELÉVÜL: a munkatárs nem lát
 *    órákig régi százalékot, és a csonkolás miatt kihagyott felhasználó üres
 *    listája sem ragad be a munkamenet végéig.
 *
 * VALÓDI HÁLÓZATI HÍVÁS TILOS (CLAUDE.md, 15. üzemeltetési tanulság): a
 * `fetch` minden tesztben stubolt, és az `afterEach` visszaállítja. A modul
 * állapota (gyorsítótár, sorban álló azonosítók) modul-szintű, ezért minden
 * teszt FRISS modulpéldányt tölt be (`vi.resetModules()` + dinamikus import) —
 * ugyanaz a minta, mint az email.test.ts-ben.
 *
 * MINDEN ADAT KITALÁLT.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  USER_PROGRESS_ENDPOINT,
  USER_PROGRESS_MAX_USERS,
  USER_PROGRESS_USERS_PARAM,
  type UserProgressResponse,
} from '../lib/admin/user-progress-contract'

type ProgressModule = typeof import('../components/admin/user-progress-client')

/** Friss modulpéldány: a gyorsítótár és a sor tesztenként üresen indul. */
async function freshModule(): Promise<ProgressModule> {
  vi.resetModules()
  return import('../components/admin/user-progress-client')
}

/** A kérés URL-jéből visszaolvasott felhasználó-azonosítók. */
function requestedIds(call: unknown): number[] {
  const url = Array.isArray(call) ? call[0] : call
  if (typeof url !== 'string') {
    throw new Error('a fetch első paramétere nem szöveg')
  }
  const query = url.slice(url.indexOf('?'))
  const raw = new URLSearchParams(query).get(USER_PROGRESS_USERS_PARAM) ?? ''
  return raw
    .split(',')
    .filter((part) => part.length > 0)
    .map(Number)
}

/**
 * Sikeres válasz: minden kért felhasználó EGY kurzussal, amelynek a
 * `productId`-je a felhasználó azonosítója. Így a teszt látja, hogy melyik
 * sor melyik felhasználó eredményét kapta (a `percent` erre nem alkalmas: a
 * szerződés szerint 0–100 közé esik, és a betöltő oda is szorítja).
 */
function okResponse(call: unknown): Response {
  const body: UserProgressResponse = {
    users: requestedIds(call).map((userId) => ({
      userId,
      courses: [{ productId: userId, percent: 45, status: 'folyamatban', lessonCount: 8 }],
    })),
  }
  return new Response(JSON.stringify(body), { status: 200 })
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('kötegelés', () => {
  it('öt cella EGYETLEN kérést indít, mind az öt azonosítóval', async () => {
    const mockFetch = vi.fn((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    // A cellák egymástól függetlenül, ugyanabban a hullámban mountolnak.
    const results = await Promise.all([1, 2, 3, 4, 5].map((id) => loadUserProgress(id)))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(requestedIds(mockFetch.mock.calls[0])).toEqual([1, 2, 3, 4, 5])
    expect(results.map((entries) => entries?.[0]?.productId)).toEqual([1, 2, 3, 4, 5])
  })

  it('a szerződés útvonalára és paraméterére kérdez, hitelesítő sütivel', async () => {
    const mockFetch = vi.fn((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    await loadUserProgress(7)

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url.startsWith(`${USER_PROGRESS_ENDPOINT}?`)).toBe(true)
    expect(init.credentials).toBe('include')
    expect(init.headers).toEqual({ Accept: 'application/json' })
    // Időtúllépés-őr: enélkül egy válasz nélkül lógó kérés örökre nyitva marad.
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('ugyanaz a felhasználó KÉTSZER kérve sem indít második kört', async () => {
    const mockFetch = vi.fn((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    // Egy hullámban kétszer (két cella ugyanarra a sorra): egy ígéret.
    const [first, second] = await Promise.all([loadUserProgress(3), loadUserProgress(3)])
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)

    // Későbbi újrarenderelés: a gyorsítótárból szolgálunk ki.
    const third = await loadUserProgress(3)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(third).toEqual(first)
  })

  it('hibás azonosítóra nem indul kérés', async () => {
    const mockFetch = vi.fn(() => {
      throw new Error('erre az ágra NEM mehet ki kérés')
    })
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    expect(await loadUserProgress(0)).toBeNull()
    expect(await loadUserProgress(-1)).toBeNull()
    expect(await loadUserProgress(Number.NaN)).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('csomagokra bontás', () => {
  it('a korlát FÖLÖTT több csomag megy ki, és az eredmények összefésülődnek', async () => {
    const mockFetch = vi.fn((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    // A Payload lista `?limit=`-je kézzel nagyobbra állítható a korlátnál.
    const total = USER_PROGRESS_MAX_USERS + 50
    const ids = Array.from({ length: total }, (_unused, index) => index + 1)
    const results = await Promise.all(ids.map((id) => loadUserProgress(id)))

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const chunks = mockFetch.mock.calls.map((call) => requestedIds(call))
    expect(chunks[0]).toHaveLength(USER_PROGRESS_MAX_USERS)
    expect(chunks[1]).toHaveLength(50)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(USER_PROGRESS_MAX_USERS)
    }
    // Az összefésülés: MINDEN azonosító a SAJÁT eredményét kapta vissza.
    expect(results).toHaveLength(total)
    expect(results.map((entries) => entries?.[0]?.productId)).toEqual(ids)
  })

  it('egy bukó csomag nem viszi magával a másikat', async () => {
    const mockFetch = vi.fn((...call: unknown[]) => {
      const ids = requestedIds(call)
      // A MÁSODIK csomag (az 50 fős) hasal el.
      return ids.length === USER_PROGRESS_MAX_USERS
        ? Promise.resolve(okResponse(call))
        : Promise.resolve(new Response('{}', { status: 500 }))
    })
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    const ids = Array.from(
      { length: USER_PROGRESS_MAX_USERS + 50 },
      (_unused, index) => index + 1,
    )
    const results = await Promise.all(ids.map((id) => loadUserProgress(id)))

    expect(results[0]?.[0]?.productId).toBe(1)
    expect(results[USER_PROGRESS_MAX_USERS]).toBeNull()
  })
})

describe('hibatűrés', () => {
  it('nem-ok státusz → null, és a gyorsítótár NEM mérgeződik meg', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockImplementation((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    expect(await loadUserProgress(4)).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // A következő megnyitás ÚJRAPRÓBÁL — a hibás kör nem ragadt be.
    expect((await loadUserProgress(4))?.[0]?.productId).toBe(4)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('401 (lejárt admin-munkamenet) → null, hibaképernyő nélkül', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    const { loadUserProgress } = await freshModule()
    expect(await loadUserProgress(4)).toBeNull()
  })

  it('értelmezhetetlen JSON → null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nem json', { status: 200 })),
    )
    const { loadUserProgress } = await freshModule()
    expect(await loadUserProgress(4)).toBeNull()
  })

  it('ismeretlen válasz-ALAK → null (a users nem tömb)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ users: 'nem tömb' }), { status: 200 })),
    )
    const { loadUserProgress } = await freshModule()
    expect(await loadUserProgress(4)).toBeNull()
  })

  it('hálózati hiba és időtúllépés → null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { loadUserProgress } = await freshModule()
    expect(await loadUserProgress(4)).toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'TimeoutError')))
    const { loadUserProgress: loadAfterTimeout } = await freshModule()
    expect(await loadAfterTimeout(4)).toBeNull()
  })

  it('ÉRVÉNYES válasz, de a felhasználó hiányzik belőle → üres lista, nem null', async () => {
    // Ez NEM hiba: a szerver érvényesen válaszolt, csak ennek a
    // felhasználónak nincs haladása. Gyorsítótárazható, tehát nem kérdezünk rá újra.
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ users: [] }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    expect(await loadUserProgress(4)).toEqual([])
    expect(await loadUserProgress(4)).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

/*
 * A GYORSÍTÓTÁR LEJÁRATA.
 *
 * Két MÉRT hibát old meg egyszerre. (1) A modul-szintű gyorsítótár sosem
 * évült el, tehát a munkatárs a fül nyitva tartásáig — órákig — a
 * betöltéskori százalékot látta. (2) A csonkolás miatt kihagyott felhasználó
 * ÜRES tömbként került be, és ott is ragadt: az a sor a munkamenet végéig
 * haladás nélkül maradt.
 *
 * A tesztek HAMIS IDŐZÍTŐVEL mérnek — valódi várakozás nincs bennük.
 */
describe('gyorsítótár lejárata', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  /** A betöltő a következő makrotaszkban küld: hamis időzítőnél pörgetni kell. */
  async function loadWithTimers(
    load: (userId: number) => Promise<unknown>,
    userId: number,
  ): Promise<unknown> {
    const pending = load(userId)
    await vi.advanceTimersByTimeAsync(0)
    return pending
  }

  it('a lejárat ELŐTT nincs új kérés, UTÁNA van', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    await loadWithTimers(loadUserProgress, 4)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // 59 mp: a bejegyzés még friss (egy lista-munkamenet oldalankénti dupla
    // kérése így továbbra is EGY hálózati kör marad).
    vi.advanceTimersByTime(59_000)
    await loadWithTimers(loadUserProgress, 4)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // 60 mp fölött a bejegyzés lejárt: friss adatot kérünk.
    vi.advanceTimersByTime(2_000)
    await loadWithTimers(loadUserProgress, 4)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('a KIHAGYOTT felhasználó üres listája sem ragad be örökre', async () => {
    vi.useFakeTimers()
    // Előbb a csonkolás miatt kimaradt felhasználó (üres válasz), majd egy
    // teljes válasz — a lejárat után ennek kell megérkeznie.
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      .mockImplementation((...call: unknown[]) => Promise.resolve(okResponse(call)))
    vi.stubGlobal('fetch', mockFetch)
    const { loadUserProgress } = await freshModule()

    expect(await loadWithTimers(loadUserProgress, 4)).toEqual([])

    vi.advanceTimersByTime(61_000)
    expect(await loadWithTimers(loadUserProgress, 4)).toEqual([
      { productId: 4, percent: 45, status: 'folyamatban', lessonCount: 8 },
    ])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('válasz értelmezése', () => {
  it('hibás ELEM kimarad, a többi megmarad', async () => {
    const { readUserProgressRows } = await freshModule()
    const rows = readUserProgressRows({
      users: [
        null,
        { courses: [] },
        { userId: 'nem szám', courses: [] },
        {
          userId: 4,
          courses: [
            { productId: 11, percent: 45, status: 'folyamatban', lessonCount: 8 },
            { productId: 12, percent: 45, status: 'ismeretlen', lessonCount: 8 },
            // Hiányzó leckeszám: a bejegyzés érvénytelen, mert enélkül a
            // „nincs tananyag" állapot nem különböztethető meg a valódi 0%-tól.
            { productId: 13, percent: 45, status: 'folyamatban' },
            null,
            { percent: 10, status: 'folyamatban', lessonCount: 8 },
          ],
        },
      ],
    })
    expect(rows?.get(4)).toEqual([
      { productId: 11, percent: 45, status: 'folyamatban', lessonCount: 8 },
    ])
    expect(rows?.size).toBe(1)
  })

  it('hiányzó vagy hibás courses mező → üres lista, nem hiba', async () => {
    const { readUserProgressRows } = await freshModule()
    expect(readUserProgressRows({ users: [{ userId: 4 }] })?.get(4)).toEqual([])
    expect(readUserProgressRows({ users: [{ userId: 4, courses: 'x' }] })?.get(4)).toEqual([])
  })

  it('értelmezhetetlen ALAK → null', async () => {
    const { readUserProgressRows } = await freshModule()
    expect(readUserProgressRows(null)).toBeNull()
    expect(readUserProgressRows('szöveg')).toBeNull()
    expect(readUserProgressRows({})).toBeNull()
    expect(readUserProgressRows({ users: 42 })).toBeNull()
  })
})
