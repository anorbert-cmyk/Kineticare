import type { CollectionConfig, Field, FieldAccess, Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { streamAssetReadAccess } from '../../access'
import { issueStreamToken, StreamTokenError } from '../../lib/stream/issue-stream-token'
import type { Product, User } from '../../payload-types'
import configPromise from '../../payload.config'

/**
 * A `videos[].streamAssetId` OLVASÁSI VÉDELME (S2/b).
 *
 * ═══ MIT VÉD ═══
 * A mező a védett Bunny-library videó-GUID-ja. A products olvasása nyilvános
 * (published termékek), tehát védelem nélkül a `GET /api/products` anonim
 * kérőnek is kiadja az összes kurzus összes videó-GUID-ját.
 *
 * ═══ MIT BIZONYÍT EZ A FÁJL ═══
 * 1. a szabály mind az ÖT esetre helyes: anonim / nem-vevő customer / vevő
 *    customer / staff / owner;
 * 2. a mező a VÉGLEGES, szanitált configban tényleg be van kötve, és a videó-sor
 *    többi almezője (cím, hossz, állapot) NEM kapott korlátozást;
 * 3. a LEJÁTSZÁS változatlanul működik: a stream-token szolgáltatás
 *    `overrideAccess: true`-val olvassa a terméket, ami a Payload
 *    mező-hookjában rövidre zárja az access-ellenőrzést;
 * 4. NEGATÍV KONTROLL: ha ugyanez az olvasás access-ellenőrzés ALÁ kerülne
 *    (overrideAccess nélkül, nem-vevő kontextusban), a mező eltűnne és a
 *    lejátszás elhasalna — vagyis a 3. pont nem véletlen, hanem a szigorítás
 *    biztonsági feltétele.
 *
 * Hálózati hívás sehol: a Payload local API-t ál-objektum adja (CLAUDE.md 15.).
 */

const DUMMY_TOKEN_KEY = 'DUMMY-BUNNY-TOKEN-AUTH-KEY-NEM-VALODI-TITOK'
const DUMMY_ASSET_ID = 'bunny-video-guid-abc123'
const PRODUCT_ID = 42

type Role = 'owner' | 'staff' | 'customer'

interface TestUser {
  id: number
  role: Role
  purchases?: (number | { id: number })[]
}

interface FieldArgsOverrides {
  /** A top-level dokumentum (array-almezőnél is ez jön `doc`-ként). */
  doc?: unknown
  /** A Payload külön is átadja a dokumentum kulcsát. */
  id?: unknown
}

const fieldArgs = (
  user: TestUser | null,
  overrides: FieldArgsOverrides = {},
): Parameters<FieldAccess>[0] =>
  ({
    doc: 'doc' in overrides ? overrides.doc : { id: PRODUCT_ID },
    id: 'id' in overrides ? overrides.id : PRODUCT_ID,
    req: { user },
  }) as unknown as Parameters<FieldAccess>[0]

describe('streamAssetReadAccess — a szerepkör-mátrix mind az öt esete', () => {
  it('owner olvassa (vásárlás nélkül is)', () => {
    expect(streamAssetReadAccess(fieldArgs({ id: 1, role: 'owner', purchases: [] }))).toBe(true)
  })

  it('staff olvassa (vásárlás nélkül is)', () => {
    expect(streamAssetReadAccess(fieldArgs({ id: 2, role: 'staff', purchases: [] }))).toBe(true)
  })

  it('a VEVŐ customer olvassa — nyers id-listával és populate-olt objektummal is', () => {
    expect(
      streamAssetReadAccess(fieldArgs({ id: 3, role: 'customer', purchases: [7, PRODUCT_ID] })),
    ).toBe(true)
    expect(
      streamAssetReadAccess(fieldArgs({ id: 3, role: 'customer', purchases: [{ id: PRODUCT_ID }] })),
    ).toBe(true)
  })

  it('a NEM-VEVŐ customer nem olvassa', () => {
    expect(streamAssetReadAccess(fieldArgs({ id: 3, role: 'customer', purchases: [7] }))).toBe(false)
    expect(streamAssetReadAccess(fieldArgs({ id: 3, role: 'customer', purchases: [] }))).toBe(false)
    expect(streamAssetReadAccess(fieldArgs({ id: 3, role: 'customer' }))).toBe(false)
  })

  it('anonim látogató SOHA nem olvassa', () => {
    expect(streamAssetReadAccess(fieldArgs(null))).toBe(false)
  })

  it('ismeretlen szülő-termék esetén FAIL-CLOSED (a vevő sem kapja meg)', () => {
    const buyer: TestUser = { id: 3, role: 'customer', purchases: [PRODUCT_ID] }
    expect(streamAssetReadAccess(fieldArgs(buyer, { doc: null, id: undefined }))).toBe(false)
    expect(streamAssetReadAccess(fieldArgs(buyer, { doc: {}, id: undefined }))).toBe(false)
  })

  it('a szülő-termék a doc-ból is feloldható, ha az id argumentum hiányzik', () => {
    const buyer: TestUser = { id: 3, role: 'customer', purchases: [PRODUCT_ID] }
    expect(streamAssetReadAccess(fieldArgs(buyer, { doc: { id: PRODUCT_ID }, id: undefined }))).toBe(
      true,
    )
    expect(streamAssetReadAccess(fieldArgs(buyer, { doc: { id: 999 }, id: undefined }))).toBe(false)
  })
})

/** Rekurzív mező-gyűjtő a group/row/tabs/array-struktúrákhoz. */
const flattenFields = (fields: Field[]): Field[] => {
  const result: Field[] = []
  for (const field of fields) {
    result.push(field)
    if ('fields' in field && Array.isArray(field.fields)) {
      result.push(...flattenFields(field.fields as Field[]))
    }
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        result.push(...flattenFields(tab.fields as Field[]))
      }
    }
  }
  return result
}

type NamedTestField = Field & { name: string; access?: { read?: FieldAccess } }

describe('a bekötés a VÉGLEGES, szanitált configban', () => {
  const findProductField = async (name: string): Promise<NamedTestField | undefined> => {
    const config = await configPromise
    const products = (config.collections ?? []).find((c) => c.slug === 'products') as
      | CollectionConfig
      | undefined
    expect(products, 'a products collection létezik').toBeDefined()
    return flattenFields(products?.fields ?? []).find(
      (field) => 'name' in field && field.name === name,
    ) as NamedTestField | undefined
  }

  it('a videos[].streamAssetId read-access a streamAssetReadAccess', async () => {
    const field = await findProductField('streamAssetId')

    expect(field).toBeDefined()
    expect(field?.access?.read).toBe(streamAssetReadAccess)
  })

  it('a videó-sor többi almezője NYILVÁNOS marad (a kurzusoldal epizódlistája)', async () => {
    for (const name of ['title', 'durationSec']) {
      const field = await findProductField(name)
      expect(field, name).toBeDefined()
      expect(field?.access?.read, name).toBeUndefined()
    }
    // Az ingyenes előzetes a PUBLIKUS libraryből jön — az szándékosan nyitott.
    const preview = await findProductField('previewVideoStreamId')
    expect(preview).toBeDefined()
    expect(preview?.access?.read).toBeUndefined()
  })
})

/**
 * A LEJÁTSZÁSI ÚT — a Payload mező-hookjának hű utánzatával.
 *
 * A Payload az afterRead-ben így dönt (payload/dist/fields/hooks/afterRead/
 * promise.js):
 *   const canReadField = overrideAccess ? true : await field.access.read({...})
 *   if (!canReadField) { delete siblingDoc[field.name] }
 * Ezt a két sort képezi le az alábbi `applyFieldAccess`: a mezőt TÖRLI, ha az
 * olvasás tiltott — pontosan úgy, ahogy az éles kód tenné.
 */
const buyerUser = {
  id: 7,
  email: 'vevo@example.test',
  role: 'customer',
  purchases: [PRODUCT_ID],
} as unknown as User

function makeProduct(): Product {
  return {
    id: PRODUCT_ID,
    sku: 'KURZUS-ALAP',
    status: 'published',
    accessDurationDays: null,
    videos: [
      {
        id: 'sor-1',
        title: '1. lecke',
        streamAssetId: DUMMY_ASSET_ID,
        durationSec: 1800,
        status: 'ready',
      },
    ],
  } as unknown as Product
}

interface FieldAccessReq {
  user: TestUser | null
}

/** A Payload mező-hookjának hű utánzata a `videos[].streamAssetId` mezőre. */
function applyFieldAccess(product: Product, overrideAccess: boolean, req: FieldAccessReq): Product {
  const videos = (product.videos ?? []).map((video) => {
    const canRead = overrideAccess
      ? true
      : streamAssetReadAccess({
          doc: product,
          id: product.id,
          req,
        } as unknown as Parameters<FieldAccess>[0])
    const copy: Record<string, unknown> = { ...video }
    if (!canRead) {
      // Ugyanaz a művelet, amit a Payload végez: `delete siblingDoc[field.name]`.
      delete copy.streamAssetId
    }
    return copy
  })
  return { ...product, videos } as Product
}

interface PlaybackPayloadOptions {
  /** Ha false: az ál-local-API FIGYELMEN KÍVÜL hagyja az overrideAccess-t (negatív kontroll). */
  honourOverrideAccess?: boolean
  req?: FieldAccessReq
}

function createPlaybackPayload(options: PlaybackPayloadOptions = {}) {
  const honour = options.honourOverrideAccess !== false
  const req: FieldAccessReq = options.req ?? { user: null }
  const findByID = vi.fn(async (args: { overrideAccess?: boolean }) =>
    applyFieldAccess(makeProduct(), honour ? args.overrideAccess === true : false, req),
  )
  const payload = {
    findByID,
    find: vi.fn(async () => ({ docs: [] })),
  }
  return { payload: payload as unknown as Payload, findByID }
}

const savedTokenKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY

beforeAll(() => {
  process.env.BUNNY_STREAM_TOKEN_AUTH_KEY = DUMMY_TOKEN_KEY
})

afterAll(() => {
  if (savedTokenKey === undefined) {
    delete process.env.BUNNY_STREAM_TOKEN_AUTH_KEY
  } else {
    process.env.BUNNY_STREAM_TOKEN_AUTH_KEY = savedTokenKey
  }
})

describe('a lejátszás (stream-token út) a szigorítás után is működik', () => {
  it('a stream-token szolgáltatás overrideAccess: true-val olvassa a terméket', async () => {
    const { payload, findByID } = createPlaybackPayload()

    await issueStreamToken({ payload, user: buyerUser, productId: PRODUCT_ID })

    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'products', overrideAccess: true }),
    )
  })

  it('a vevő jegyet kap — a streamAssetId végigmegy a láncon', async () => {
    const { payload } = createPlaybackPayload()

    const result = await issueStreamToken({ payload, user: buyerUser, productId: PRODUCT_ID })

    expect(result.token).toMatch(/^[0-9a-f]{64}$/)
    expect(typeof result.expiresAt).toBe('string')
  })

  /**
   * NEGATÍV KONTROLL — ez bizonyítja, hogy a fenti eredmény nem véletlen.
   * Ha ugyanezt a termék-olvasást access-ellenőrzés alá tennénk (overrideAccess
   * nélkül, anonim kontextusban), a Payload TÖRÖLNÉ a streamAssetId-t, és a
   * szolgáltatás 503-mal állna le. A lejátszás tehát pontosan az
   * `overrideAccess: true` miatt marad ép — ez a szigorítás feltétele.
   */
  it('overrideAccess NÉLKÜL a mező eltűnne, és a jegykiadás elhasalna (503)', async () => {
    const { payload } = createPlaybackPayload({ honourOverrideAccess: false })

    await expect(
      issueStreamToken({ payload, user: buyerUser, productId: PRODUCT_ID }),
    ).rejects.toBeInstanceOf(StreamTokenError)

    await expect(
      issueStreamToken({ payload, user: buyerUser, productId: PRODUCT_ID }),
    ).rejects.toMatchObject({ status: 503 })
  })
})

describe('a nyilvános REST-olvasás (overrideAccess nélkül) mit ad vissza', () => {
  const readAs = (user: TestUser | null): Product =>
    applyFieldAccess(makeProduct(), false, { user })

  it('anonim és nem-vevő customer NEM kapja meg a streamAssetId-t', () => {
    for (const user of [null, { id: 8, role: 'customer' as Role, purchases: [] }]) {
      const product = readAs(user)
      expect(product.videos?.[0]?.streamAssetId).toBeUndefined()
      // A cím és a hossz megmarad — a kurzusoldal epizódlistája nem sérül.
      expect(product.videos?.[0]?.title).toBe('1. lecke')
      expect(product.videos?.[0]?.durationSec).toBe(1800)
    }
  })

  it('a vevő, a staff és az owner megkapja', () => {
    for (const user of [
      { id: 7, role: 'customer' as Role, purchases: [PRODUCT_ID] },
      { id: 2, role: 'staff' as Role },
      { id: 1, role: 'owner' as Role },
    ]) {
      expect(readAs(user).videos?.[0]?.streamAssetId).toBe(DUMMY_ASSET_ID)
    }
  })
})
