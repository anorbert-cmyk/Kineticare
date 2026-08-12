import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { grantFreeCoursesToUser } from '../lib/free-course-grant'
import type { Logger } from '../lib/logger'
import { Users } from '../collections/Users'

/**
 * M4 — az ingyenes kurzus automatikus purchases-beírása.
 *
 * ═══ A HIBA, AMIT BEZÁR ═══
 * Az ingyenes termék CTA-ja („Ingyenes — azonnal eléred") a /kurzusaim
 * oldalra vitt, de a purchases-be csak a FIZETÉSI folyamat írt — az ingyenes
 * kurzus sosem jelent meg a vevőnél (CTA-zsákutca). A grant most a
 * regisztráció (afterChange create) és a bejelentkezés (afterLogin) hookjaiból
 * fut, idempotensen.
 *
 * A mock a where-objektumot TÉNYLEGESEN kiértékeli a fixtúrákon — így az is
 * bukik, ha a lekérdezés feltételei ellazulnának (pl. fizetős termék is
 * bekerülne a grantbe).
 */

/** Csendes logger — a tesztfutás kimenete ne teljen meg naplósorokkal. */
function silentLogger(): Logger {
  const log: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => log,
  }
  return log
}

interface FixtureProduct {
  id: number
  status: string
  priceInHUFEnabled?: boolean | null
  priceInHUF?: number | null
}

const FREE_PUBLISHED: FixtureProduct = { id: 11, status: 'published', priceInHUFEnabled: false }
const FREE_PUBLISHED_UNSET: FixtureProduct = { id: 12, status: 'published', priceInHUFEnabled: null }
const PAID_PUBLISHED: FixtureProduct = {
  id: 21,
  status: 'published',
  priceInHUFEnabled: true,
  priceInHUF: 19900,
}
const FREE_ARCHIVED: FixtureProduct = { id: 31, status: 'archived', priceInHUFEnabled: false }
/** Hibásan konfigurált: ár-pipa BE, ár ÜRES — ez NEM ingyenes, hanem konfig-hiba. */
const MISCONFIGURED: FixtureProduct = {
  id: 41,
  status: 'published',
  priceInHUFEnabled: true,
  priceInHUF: null,
}

const ALL_PRODUCTS = [FREE_PUBLISHED, FREE_PUBLISHED_UNSET, PAID_PUBLISHED, FREE_ARCHIVED, MISCONFIGURED]

/** A szolgáltatás where-alakjának minimális kiértékelője (a valódi szűrés mása). */
function matchesWhere(product: FixtureProduct, where: unknown): boolean {
  const clauses = (where as { and?: Array<Record<string, Record<string, unknown>>> }).and ?? []
  for (const clause of clauses) {
    if (clause.status?.equals !== undefined && product.status !== clause.status.equals) {
      return false
    }
    if (
      clause.priceInHUFEnabled?.not_equals !== undefined &&
      product.priceInHUFEnabled === clause.priceInHUFEnabled.not_equals
    ) {
      return false
    }
  }
  return true
}

function createMockPayload(products: FixtureProduct[] = ALL_PRODUCTS) {
  const updates: Array<{ collection: string; id: number | string; data: Record<string, unknown> }> =
    []
  const payload = {
    find: vi.fn(async ({ collection, where }: { collection: string; where?: unknown }) => {
      if (collection !== 'products') {
        return { docs: [], totalDocs: 0 }
      }
      const docs = products.filter((product) => matchesWhere(product, where))
      return { docs, totalDocs: docs.length }
    }),
    update: vi.fn(
      async (args: { collection: string; id: number | string; data: Record<string, unknown> }) => {
        updates.push(args)
        return args.data
      },
    ),
  }
  return { payload: payload as unknown as Payload, updates }
}

describe('grantFreeCoursesToUser — mit ír be és mit nem', () => {
  it('a published + ingyenes termékek a purchases-be kerülnek (ár nélküli = ingyenes)', async () => {
    const { payload, updates } = createMockPayload()

    const result = await grantFreeCoursesToUser({
      payload,
      user: { id: 7, purchases: [] },
      logger: silentLogger(),
    })

    expect(result.grantedProductIds).toEqual([FREE_PUBLISHED.id, FREE_PUBLISHED_UNSET.id])
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({
      collection: 'users',
      id: 7,
      data: { purchases: [FREE_PUBLISHED.id, FREE_PUBLISHED_UNSET.id] },
    })
  })

  it('fizetős, archivált és hibásan konfigurált (ár-pipa BE, ár ÜRES) termék NEM kerül be', async () => {
    const { payload } = createMockPayload()

    const result = await grantFreeCoursesToUser({
      payload,
      user: { id: 7, purchases: [] },
      logger: silentLogger(),
    })

    expect(result.grantedProductIds).not.toContain(PAID_PUBLISHED.id)
    expect(result.grantedProductIds).not.toContain(FREE_ARCHIVED.id)
    expect(result.grantedProductIds).not.toContain(MISCONFIGURED.id)
  })

  it('idempotens: a már meglévő ingyenes termék mellett NEM ír (no-op, naplósor nélkül)', async () => {
    const { payload, updates } = createMockPayload()
    const log = silentLogger()

    const result = await grantFreeCoursesToUser({
      payload,
      user: { id: 7, purchases: [FREE_PUBLISHED.id, FREE_PUBLISHED_UNSET.id, PAID_PUBLISHED.id] },
      logger: log,
    })

    expect(result.grantedProductIds).toEqual([])
    expect(updates).toHaveLength(0)
    expect(log.info).not.toHaveBeenCalled()
  })

  it('a meglévő purchases sosem csökken — csak a hiányzó fűződik hozzá', async () => {
    const { payload, updates } = createMockPayload([FREE_PUBLISHED])

    await grantFreeCoursesToUser({
      payload,
      user: { id: 7, purchases: [PAID_PUBLISHED.id] },
      logger: silentLogger(),
    })

    expect(updates[0].data.purchases).toEqual([PAID_PUBLISHED.id, FREE_PUBLISHED.id])
  })

  it('nincs published ingyenes termék → nincs írás', async () => {
    const { payload, updates } = createMockPayload([PAID_PUBLISHED, FREE_ARCHIVED])

    const result = await grantFreeCoursesToUser({
      payload,
      user: { id: 7, purchases: [] },
      logger: silentLogger(),
    })

    expect(result.grantedProductIds).toEqual([])
    expect(updates).toHaveLength(0)
  })
})

/**
 * A Users-collection hook-bekötés: a grant a regisztráció (afterChange create)
 * és a bejelentkezés (afterLogin) eseményére fut, más műveletre nem — és a
 * grant hibája sosem törheti az auth-folyamatot (best-effort).
 */
describe('Users hookok — a free-grant bekötése (M4)', () => {
  function hookReq(payload: Payload) {
    return { payload } as unknown as Parameters<
      NonNullable<NonNullable<typeof Users.hooks>['afterLogin']>[number]
    >[0]['req']
  }

  it('regisztráció (afterChange create): a grant lefut', async () => {
    const { payload, updates } = createMockPayload([FREE_PUBLISHED])
    const afterChange = Users.hooks?.afterChange?.[0]
    expect(afterChange).toBeDefined()

    await afterChange!({
      doc: { id: 7, purchases: [] },
      operation: 'create',
      req: hookReq(payload),
    } as never)

    expect(updates).toHaveLength(1)
    expect(updates[0].data.purchases).toEqual([FREE_PUBLISHED.id])
  })

  it('update-műveletre (afterChange update) NEM fut — a grant saját írása sem váltja ki', async () => {
    const { payload, updates } = createMockPayload([FREE_PUBLISHED])
    const afterChange = Users.hooks?.afterChange?.[0]

    await afterChange!({
      doc: { id: 7, purchases: [] },
      operation: 'update',
      req: hookReq(payload),
    } as never)

    expect(updates).toHaveLength(0)
  })

  it('bejelentkezés (afterLogin): a grant lefut', async () => {
    const { payload, updates } = createMockPayload([FREE_PUBLISHED])
    const afterLogin = Users.hooks?.afterLogin?.[0]
    expect(afterLogin).toBeDefined()

    await afterLogin!({ req: hookReq(payload), user: { id: 7, purchases: [] } } as never)

    expect(updates).toHaveLength(1)
    expect(updates[0].data.purchases).toEqual([FREE_PUBLISHED.id])
  })

  it('best-effort: a grant DB-hibája NEM törheti a bejelentkezést (csak naplóz)', async () => {
    const brokenPayload = {
      find: vi.fn(async () => {
        throw new Error('connection lost')
      }),
      update: vi.fn(),
    } as unknown as Payload
    const afterLogin = Users.hooks?.afterLogin?.[0]

    // Nem dob — a bejelentkezés így is sikeres marad.
    await expect(
      afterLogin!({ req: hookReq(brokenPayload), user: { id: 7, purchases: [] } } as never),
    ).resolves.toBeDefined()
  })
})
