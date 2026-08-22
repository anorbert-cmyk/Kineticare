import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STATISTICS_ACCESS_DENIED_MESSAGE } from '../lib/statistics/revenue'

/**
 * ŐR — A NYILVÁNOS ADMIN-NÉZETEK KAPUJA A LEKÉRDEZÉSEK ELŐTT FUT.
 *
 * ═══ MIÉRT LÉTEZIK ═══
 * A Payload 3.86 a custom view-path-okat NYILVÁNOS admin-route-ként kezeli
 * (`isCustomAdminView`), ezért a Root view auth-átirányítása KIMARAD — ezt a
 * `StatisticsView.tsx` saját fejkommentje mondja ki. Be nem jelentkezett
 * látogató is eléri az URL-t; a komponensbe írt szerepkör-kapu az EGYETLEN
 * védelem. Mögötte hat `overrideAccess: true` lekérdezés fut az `orders`, a
 * `users`, a `products` és a `course-progress` collectionön
 * (src/lib/statistics/query.ts, src/lib/statistics/engagement-query.ts) —
 * vagyis a kapu adatvédelmi teherviselő, nem kényelmi elem.
 *
 * ═══ MIT NEM FEDETT EDDIG SEMMI (2026-08-20-i audit) ═══
 * A `canAccessStatistics` PREDIKÁTUMÁRA volt teszt (null/customer → false,
 * staff/owner → true), a KÖTÉSRE viszont egy sem: `grep -rn "StatisticsView"
 * src/__tests__/` nulla találatot adott. Ha valaki a lekérdezéseket a kapu
 * FÖLÉ mozgatja, minden meglévő teszt zöld marad, és a nézet bejelentkezés
 * nélkül kiadja a rendelés- és felhasználó-adatokat.
 *
 * Ez az őr ezért a SORRENDET méri: a tiltott ágon a lekérdezők HANGOSAN dobó
 * kémek (a 15. üzemeltetési tanulság mintája — ahol egy hívásnak nem szabad
 * futnia, oda dobó mock való), tehát a puszta meghívásuk elbuktatja a tesztet.
 *
 * A TILOS ZÓNA 4. pontja (access-szabályok emberi jóváhagyással) NEM sérül:
 * ez csak teszt, egyetlen `access` szabály és auth-hook sem változik.
 */

const revenueKem = vi.fn()
const engagementKem = vi.fn()
const bunnyPanelKem = vi.fn()

vi.mock('../components/admin/AdminChrome', () => ({
  AdminChrome: ({ children }: { children: ReactNode }) =>
    createElement('div', { 'data-keret': 'chrome' }, children),
  AdminViewFrame: ({ children }: { children: ReactNode }) =>
    createElement('div', { 'data-keret': 'frame' }, children),
}))

vi.mock('../lib/statistics/query', () => ({
  queryRevenueReport: (...args: unknown[]) => {
    revenueKem(...args)
    throw new Error('TILTOTT ÁGON FUTOTT: queryRevenueReport a szerepkör-kapu előtt/nélkül')
  },
}))

vi.mock('../lib/statistics/engagement-query', () => ({
  queryCourseEngagement: (...args: unknown[]) => {
    engagementKem(...args)
    throw new Error('TILTOTT ÁGON FUTOTT: queryCourseEngagement a szerepkör-kapu előtt/nélkül')
  },
}))

vi.mock('../components/admin/BunnyLibraryPanel', () => ({
  BunnyLibraryPanel: () => {
    bunnyPanelKem()
    return createElement('div', null, 'panel')
  },
}))

const { StatisticsView } = await import('../components/admin/StatisticsView')
const { BunnyLibraryView } = await import('../components/admin/BunnyLibraryView')

interface Szerep {
  role: string
}

/** A nézet minimális props-a; csak azt tartalmazza, amit a kapu olvas. */
function props(user: Szerep | null) {
  return {
    initPageResult: { req: { user, payload: {} } },
    params: {},
    searchParams: {},
  } as unknown as Parameters<typeof StatisticsView>[0]
}

const TILTOTT: Array<[string, Szerep | null]> = [
  ['bejelentkezés nélkül (null)', null],
  ['vevőként (customer)', { role: 'customer' }],
]

describe('Statisztika nézet: a kapu a lekérdezések ELŐTT zár', () => {
  beforeEach(() => {
    revenueKem.mockClear()
    engagementKem.mockClear()
  })

  for (const [nev, user] of TILTOTT) {
    it(`${nev} egyetlen lekérdezés sem indul, és elutasítás jön`, async () => {
      const elem = await StatisticsView(props(user))
      const html = renderToStaticMarkup(elem)

      expect(revenueKem, 'a bevétel-lekérdezés lefutott a tiltott ágon').not.toHaveBeenCalled()
      expect(engagementKem, 'a kurzus-hatás lekérdezés lefutott a tiltott ágon').not.toHaveBeenCalled()
      expect(html).toContain('data-keret="frame"')
      // A KONSTANSRA hivatkozunk, nem egy beírt szóra: a korábbi
      // `toContain('jogosultság')` némán elengedte volna a szöveg cseréjét,
      // ha az új mondatban véletlenül benne marad a szó.
      expect(html).toContain(STATISTICS_ACCESS_DENIED_MESSAGE)
    })
  }

  it('staff szerepkörrel viszont ELINDUL a lekérdezés (a kapu nem zár túl)', async () => {
    // A dobó kém itt is dob — épp ez bizonyítja, hogy a hívás megtörtént;
    // a nézet a saját try/catch-ében kezeli, és a „nem elérhető" képernyőt adja.
    const elem = await StatisticsView(props({ role: 'staff' }))
    renderToStaticMarkup(elem)
    expect(revenueKem, 'staffnál sem indult el a bevétel-lekérdezés').toHaveBeenCalledTimes(1)
  })
})

describe('Videótár nézet: ugyanaz a kapu-kötés', () => {
  beforeEach(() => {
    bunnyPanelKem.mockClear()
  })

  for (const [nev, user] of TILTOTT) {
    it(`${nev} a panel nem renderel`, () => {
      const html = renderToStaticMarkup(BunnyLibraryView(props(user)))
      expect(bunnyPanelKem, 'a Bunny-panel rendereltetett a tiltott ágon').not.toHaveBeenCalled()
      expect(html).toContain('A Videótárat csak munkatárs vagy tulajdonos nézheti meg.')
    })
  }

  it('staff szerepkörrel a panel renderel', () => {
    renderToStaticMarkup(BunnyLibraryView(props({ role: 'staff' })))
    expect(bunnyPanelKem).toHaveBeenCalledTimes(1)
  })
})
