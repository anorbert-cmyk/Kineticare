import { NextRequest } from 'next/server'
import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Order, Product, User } from '../payload-types'
import { createCheckoutStartHandler } from '../lib/checkout/route-handler'
import {
  CheckoutError,
  paymentWindowToMs,
  startCheckout,
} from '../lib/checkout/start-checkout'
import {
  barionPaymentAdapter,
  withoutPluginPaymentEndpoints,
} from '../lib/payments/barion-adapter'
import { buyerFromOrder } from '../lib/szamlazz/invoice'
import { RATE_LIMIT_RULES, SlidingWindowRateLimiter } from '../lib/security/rate-limit'
import configPromise from '../payload.config'

/**
 * T-021 checkout-start + T-063 plugin-adapter-kontroll egységtesztek —
 * mockolt Payload local API-val és mockolt fetch-csel (valódi Barion-hívás
 * nélkül), az src/__tests__/barion.test.ts mintáját követve.
 */

// DUMMY érték, egyértelműen jelölve — NEM valódi Barion POSKey.
const DUMMY_POS_KEY = 'DUMMY-POSKEY-NEM-VALODI-TITOK'
const DUMMY_PAYMENT_ID = '11111111-2222-3333-4444-555555555555'

const ORDER_NUMBER = 'KH-2026-000123'
const GATEWAY_URL = `https://secure.test.barion.com/Pay?id=${DUMMY_PAYMENT_ID}`

const mockUser = {
  id: 7,
  email: 'vevo@example.test',
  name: 'Minta Mari',
  role: 'customer',
  billingName: 'Minta Mari',
  billingZip: '1011',
  billingCity: 'Budapest',
  billingStreet: 'Fő utca 1.',
  taxNumber: null,
} as unknown as User

const publishedProduct = {
  id: 42,
  sku: 'KURZUS-ALAP',
  status: 'published',
  priceInHUF: 5000,
  priceInHUFEnabled: true,
  shortDescription: 'Alap kurzus',
} as unknown as Product

const createdOrderDoc = {
  id: 101,
  orderNumber: ORDER_NUMBER,
  totalHufSnapshot: 5000,
  items: [
    {
      product: 42,
      quantity: 1,
      titleSnapshot: 'KURZUS-ALAP',
      priceHufSnapshot: 5000,
    },
  ],
} as unknown as Order

interface MockPayloadOptions {
  product?: Product | null
  /** A duplikáció-ellenőrző find-hívások válasza (a where alapján dönthet). */
  findOrders?: (where: unknown) => { docs: unknown[]; totalDocs: number }
  orderDoc?: Order
  authUser?: User | null
}

function createMockPayload(options: MockPayloadOptions = {}) {
  const calls = {
    create: [] as Array<Record<string, unknown>>,
    update: [] as Array<{ id: number | string; data: Record<string, unknown> }>,
    find: [] as unknown[],
  }
  const payload = {
    auth: vi.fn(async () => ({ user: options.authUser === undefined ? mockUser : options.authUser })),
    findByID: vi.fn(async () => {
      if (options.product === null) {
        throw new Error('Not Found')
      }
      return options.product ?? publishedProduct
    }),
    find: vi.fn(async (args: { where?: unknown }) => {
      calls.find.push(args.where)
      return options.findOrders
        ? options.findOrders(args.where)
        : { docs: [], totalDocs: 0 }
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      calls.create.push(data)
      // A valódi rendszerben az orderIntegrity-beforeChange hook írja felül
      // (snapshot, orderNumber) — a mock a hook-OUTPUTOT adja vissza.
      return { ...data, ...(options.orderDoc ?? createdOrderDoc), id: 101 }
    }),
    update: vi.fn(
      async ({ id, data }: { id: number | string; data: Record<string, unknown> }) => {
        calls.update.push({ id, data })
        return { id, ...data }
      },
    ),
  }
  return { payload: payload as unknown as Payload, calls }
}

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function barionStartSuccess(): Response {
  return new Response(
    JSON.stringify({
      PaymentId: DUMMY_PAYMENT_ID,
      PaymentRequestId: ORDER_NUMBER,
      Status: 'Prepared',
      GatewayUrl: GATEWAY_URL,
      Transactions: [{ TransactionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }],
      Errors: [],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function lastBarionRequestBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit]
  return JSON.parse(String(call[1].body ?? '{}')) as Record<string, unknown>
}

const savedEnv: Record<string, string | undefined> = {}

beforeAll(() => {
  for (const key of [
    'BARION_API_URL',
    'BARION_PAYEE_EMAIL',
    'BARION_POSKEY_TEST',
    'NEXT_PUBLIC_SERVER_URL',
  ]) {
    savedEnv[key] = process.env[key]
  }
  process.env.BARION_API_URL = 'https://api.test.barion.com'
  process.env.BARION_PAYEE_EMAIL = 'payee@example.test'
  process.env.BARION_POSKEY_TEST = DUMMY_POS_KEY
  process.env.NEXT_PUBLIC_SERVER_URL = 'https://shop.example.test'
})

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

afterEach(() => {
  fetchMock.mockReset()
})

/**
 * A `happyInput` SZÁNDÉKOSAN nem hordoz `billing`-et: így a profil-tartalék
 * ága marad lefedve (mockUser teljes számlázási profillal). A pénztárból
 * érkező, felülíró adat külön describe-ban.
 */
const happyInput = { productId: 42, consentWithdrawalWaiver: true }

/** A pénztárban BEÍRT, a profiltól eltérő számlázási adatok. */
const CHECKOUT_BILLING = {
  name: 'Példa Kft.',
  zip: '9700',
  city: 'Szombathely',
  street: 'Fő tér 2/A',
  taxNumber: '12345678142',
}

describe('startCheckout — boldog út', () => {
  it('rendelés payment_pending + snapshot-árral, Barion Start a libből, válasz { orderNumber, gatewayUrl }', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()

    const result = await startCheckout({ payload, user: mockUser, input: happyInput })

    expect(result).toEqual({ orderNumber: ORDER_NUMBER, gatewayUrl: GATEWAY_URL })

    // A rendelés payment_pending státusszal és waiver-timestamppel jön létre;
    // a kliens ára/snapshotja SOHA nem szerepel a create-adatban.
    const createData = calls.create[0] as Record<string, unknown>
    expect(createData.status).toBe('payment_pending')
    expect(createData.currency).toBe('HUF')
    expect(createData.customer).toBe(7)
    expect(createData.items).toEqual([{ product: 42, quantity: 1 }])
    expect(createData.consentWithdrawalWaiver).toBe(true)
    expect(typeof createData.consentWithdrawalWaiverAt).toBe('string')
    expect(createData.customerSnapshot).toMatchObject({ id: 7, email: 'vevo@example.test' })
    expect(createData).not.toHaveProperty('amount')
    expect(createData).not.toHaveProperty('totalHufSnapshot')
    expect(createData).not.toHaveProperty('orderNumber')

    // A Barion Start: PaymentRequestId = orderNumber, Total = SZERVER snapshot-ár.
    const body = lastBarionRequestBody()
    expect(body.PaymentRequestId).toBe(ORDER_NUMBER)
    expect(body.PaymentType).toBe('Immediate')
    expect(body.GuestCheckOut).toBe(true)
    expect(body.CallbackUrl).toBe('https://shop.example.test/api/barion/callback')
    const transactions = body.Transactions as Array<Record<string, unknown>>
    expect(transactions[0]?.POSTransactionId).toBe(`${ORDER_NUMBER}-1`)
    expect(transactions[0]?.Total).toBe(5000)
    const items = transactions[0]?.Items as Array<Record<string, unknown>>
    expect(items[0]).toMatchObject({ UnitPrice: 5000, ItemTotal: 5000, SKU: 'KURZUS-ALAP' })

    // A PaymentId és a PaymentRequestId a rendelésre mentődik.
    expect(calls.update[0]).toMatchObject({
      id: 101,
      data: { barionPaymentId: DUMMY_PAYMENT_ID, barionPaymentRequestId: ORDER_NUMBER },
    })
    // A rendelés státusza NEM változik paid-re (az a callback-útvonal joga).
    expect(
      calls.update.every((call) => (call.data as { status?: string }).status !== 'paid'),
    ).toBe(true)
  })

  it('a kliens által küldött EGYEZŐ ár elfogadható, de a végösszeg továbbra is szerver-oldali', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()

    const result = await startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, priceHuf: 5000 },
    })

    expect(result.orderNumber).toBe(ORDER_NUMBER)
    // A create-adat továbbra sem tartalmaz kliens-árat.
    expect(calls.create[0]).not.toHaveProperty('amount')
    const transactions = lastBarionRequestBody().Transactions as Array<Record<string, unknown>>
    expect(transactions[0]?.Total).toBe(5000)
  })
})

describe('startCheckout — számlázási adatok (B)', () => {
  it('a PÉNZTÁRBAN megadott adat FELÜLÍRJA a profilból jövő előkitöltést', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()

    await startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, billing: CHECKOUT_BILLING },
    })

    const snapshot = (calls.create[0] as Record<string, unknown>).customerSnapshot as Record<
      string,
      unknown
    >
    // A rendelésre a pénztárban beírt adat kerül — NEM a mockUser profilja
    // (Minta Mari / 1011 / Budapest / Fő utca 1.).
    expect(snapshot).toMatchObject({
      billingName: 'Példa Kft.',
      billingZip: '9700',
      billingCity: 'Szombathely',
      billingStreet: 'Fő tér 2/A',
      // Az adószám a hivatalos 12345678-1-42 alakra normalizálva megy tovább.
      taxNumber: '12345678-1-42',
      billingSource: 'checkout',
    })
    expect(snapshot.billingName).not.toBe(mockUser.billingName)
    // A számla ebből a snapshotból készül: a kötelező vevőmezők megvannak.
    expect(buyerFromOrder({ customerSnapshot: snapshot } as unknown as Order)).toMatchObject({
      nev: 'Példa Kft.',
      irsz: '9700',
      telepules: 'Szombathely',
      cim: 'Fő tér 2/A',
      adoszam: '12345678-1-42',
    })
  })

  it('billing nélkül a PROFIL a tartalék (billingSource: profile)', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()

    await startCheckout({ payload, user: mockUser, input: happyInput })

    expect((calls.create[0] as Record<string, unknown>).customerSnapshot).toMatchObject({
      billingName: 'Minta Mari',
      billingZip: '1011',
      billingCity: 'Budapest',
      billingStreet: 'Fő utca 1.',
      taxNumber: null,
      billingSource: 'profile',
    })
  })

  it('HIÁNYOS pénztári adat → 400, rendelés NEM jön létre, Barion NEM hívódik', async () => {
    const { payload, calls } = createMockPayload()

    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, billing: { ...CHECKOUT_BILLING, city: '   ' } },
    })

    await expect(promise).rejects.toBeInstanceOf(CheckoutError)
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/Add meg a települést/)
    expect(calls.create).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a részleges billing NEM egészül ki a profilból (kevert rekord tilos)', async () => {
    const { payload, calls } = createMockPayload()

    // A profilban minden megvan, a kérésben csak a név — a hiányzó mezőket a
    // szolgáltatás NEM pótolja, hanem elutasítja a kérést.
    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, billing: { name: 'Példa Kft.' } },
    })

    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/irányítószám/)
    expect(calls.create).toHaveLength(0)
  })

  it('érvénytelen irányítószám → 400 (négyjegyű szám kell)', async () => {
    const { payload, calls } = createMockPayload()

    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, billing: { ...CHECKOUT_BILLING, zip: '97' } },
    })

    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/négyjegyű/)
    expect(calls.create).toHaveLength(0)
  })

  it('A HIBA GYÖKERE: hiányos PROFIL + billing nélküli kérés → 400 (nem jön létre számlázhatatlan rendelés)', async () => {
    const { payload, calls } = createMockPayload()
    const userWithoutBilling = {
      ...(mockUser as unknown as Record<string, unknown>),
      billingName: null,
      billingZip: null,
      billingCity: null,
      billingStreet: null,
    } as unknown as User

    const promise = startCheckout({ payload, user: userWithoutBilling, input: happyInput })

    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/számlázási adatok szükségesek/)
    // Korábban itt LÉTREJÖTT a rendelés, a fizetés lement, és a számla soha
    // nem állt ki (buyerFromOrder → null → invoiceStatus 'failed', retry nélkül).
    expect(calls.create).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hibás adószám → 400 (a Számla Agent visszautasítaná)', async () => {
    const { payload, calls } = createMockPayload()

    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, billing: { ...CHECKOUT_BILLING, taxNumber: 'HU12345678' } },
    })

    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/adószám/)
    expect(calls.create).toHaveLength(0)
  })
})

describe('startCheckout — szerver-oldali ár-kikényszerítés', () => {
  it('eltérő kliens-ár → 400, rendelés NEM jön létre, Barion NEM hívódik', async () => {
    const { payload, calls } = createMockPayload()

    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { ...happyInput, priceHuf: 1 },
    })

    await expect(promise).rejects.toBeInstanceOf(CheckoutError)
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/eltér a termék aktuális árától/)
    expect(calls.create).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('startCheckout — duplavásárlás-blokk', () => {
  const whereMentions = (where: unknown, needle: string): boolean =>
    JSON.stringify(where ?? {}).includes(needle)

  it('meglévő paid rendelés → 409, magyar üzenettel', async () => {
    const { payload, calls } = createMockPayload({
      findOrders: (where) =>
        whereMentions(where, '"paid"')
          ? { docs: [{ id: 55, status: 'paid' }], totalDocs: 1 }
          : { docs: [], totalDocs: 0 },
    })

    const promise = startCheckout({ payload, user: mockUser, input: happyInput })
    await expect(promise).rejects.toMatchObject({ status: 409 })
    await expect(promise).rejects.toThrowError(/már megvásároltad/)
    expect(calls.create).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aktív (nem lejárt) payment_pending → 409', async () => {
    const { payload, calls } = createMockPayload({
      findOrders: (where) =>
        whereMentions(where, 'payment_pending')
          ? { docs: [{ id: 56, status: 'payment_pending' }], totalDocs: 1 }
          : { docs: [], totalDocs: 0 },
    })

    const promise = startCheckout({ payload, user: mockUser, input: happyInput })
    await expect(promise).rejects.toMatchObject({ status: 409 })
    await expect(promise).rejects.toThrowError(/folyamatban van egy fizetés/)
    expect(calls.create).toHaveLength(0)
  })

  it('lejárt payment_pending NEM blokkol: a lekérdezés a fizetési ablakra szűkül', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()

    await startCheckout({ payload, user: mockUser, input: happyInput })

    // A payment_pending lekérdezés createdAt-cutoffot tartalmaz (a lejártakat kizárja).
    const pendingQuery = calls.find.find(
      (where) => whereMentions(where, 'payment_pending'),
    ) as { and?: Array<Record<string, unknown>> }
    expect(pendingQuery).toBeDefined()
    const createdAtClause = pendingQuery.and?.find((clause) => 'createdAt' in clause) as
      | { createdAt: { greaterThan: string } }
      | undefined
    expect(createdAtClause).toBeDefined()
    const cutoffMs = Date.parse(createdAtClause!.createdAt.greaterThan)
    expect(Date.now() - cutoffMs).toBeGreaterThanOrEqual(paymentWindowToMs() - 5000)
    expect(Date.now() - cutoffMs).toBeLessThanOrEqual(paymentWindowToMs() + 5000)
  })
})

describe('startCheckout — termék- és inputellenőrzés', () => {
  it('archived termék → 400, magyar üzenettel', async () => {
    const { payload, calls } = createMockPayload({
      product: { ...publishedProduct, status: 'archived' } as Product,
    })
    const promise = startCheckout({ payload, user: mockUser, input: happyInput })
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/archivált/)
    expect(calls.create).toHaveLength(0)
  })

  it('draft termék → 400', async () => {
    const { payload } = createMockPayload({
      product: { ...publishedProduct, status: 'draft' } as Product,
    })
    const promise = startCheckout({ payload, user: mockUser, input: happyInput })
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/jelenleg nem megvásárolható/)
  })

  it('nem létező termék → 404', async () => {
    const { payload } = createMockPayload({ product: null })
    const promise = startCheckout({ payload, user: mockUser, input: happyInput })
    await expect(promise).rejects.toMatchObject({ status: 404 })
    await expect(promise).rejects.toThrowError(/nem található/)
  })

  it('hiányzó waiver → 400 (a mező rögzítése kötelező)', async () => {
    const { payload, calls } = createMockPayload()
    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { productId: 42, consentWithdrawalWaiver: false },
    })
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/elállási jog/)
    expect(calls.create).toHaveLength(0)
  })

  it('érvénytelen productId → 400', async () => {
    const { payload } = createMockPayload()
    const promise = startCheckout({
      payload,
      user: mockUser,
      input: { productId: 'abc', consentWithdrawalWaiver: true },
    })
    await expect(promise).rejects.toMatchObject({ status: 400 })
    await expect(promise).rejects.toThrowError(/termékazonosító/)
  })
})

describe('startCheckout — Barion-hibaág', () => {
  it('Barion Start-hiba esetén a rendelés payment_failed lesz és 502 jelzés megy vissza', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Errors: [{ ErrorCode: 'AuthenticationFailed', Title: 'auth failed', Description: 'x' }],
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { payload, calls } = createMockPayload()

    const promise = startCheckout({ payload, user: mockUser, input: happyInput })
    await expect(promise).rejects.toBeInstanceOf(CheckoutError)
    await expect(promise).rejects.toMatchObject({ status: 502 })
    await expect(promise).rejects.toThrowError(/fizetés indítása jelenleg nem sikerült/)

    expect(calls.update[0]).toMatchObject({ id: 101, data: { status: 'payment_failed' } })
  })
})

describe('POST /api/checkout/start route-handler', () => {
  const makeRequest = (body: unknown, ip = '203.0.113.20'): NextRequest =>
    new NextRequest('https://shop.example.test/api/checkout/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })

  /**
   * A handler A2 óta IP-alapú kérés-korlátozón megy át. Minden teszt SAJÁT,
   * üres számlálót kap, hogy a tesztek se egymást, se a közös (folyamaton
   * belüli) számlálót ne befolyásolják.
   */
  const makeHandler = (getPayload: () => Promise<Payload>) =>
    createCheckoutStartHandler({
      getPayload,
      rateLimit: { limiter: new SlidingWindowRateLimiter() },
    })

  it('bejelentkezés nélkül → 401, magyar üzenettel', async () => {
    const { payload } = createMockPayload({ authUser: null })
    const POST = makeHandler(async () => payload)

    const response = await POST(makeRequest(happyInput))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'A fizetés indításához bejelentkezés szükséges.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('bejelentkezett vevő → 200 { orderNumber, gatewayUrl }', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload } = createMockPayload()
    const POST = makeHandler(async () => payload)

    const response = await POST(makeRequest(happyInput))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ orderNumber: ORDER_NUMBER, gatewayUrl: GATEWAY_URL })
  })

  it('üzleti hiba (pl. duplavásárlás) → a CheckoutError státusza és magyar üzenete', async () => {
    const { payload } = createMockPayload({
      findOrders: (where) =>
        JSON.stringify(where ?? {}).includes('"paid"')
          ? { docs: [{ id: 55 }], totalDocs: 1 }
          : { docs: [], totalDocs: 0 },
    })
    const POST = makeHandler(async () => payload)

    const response = await POST(makeRequest(happyInput))

    expect(response.status).toBe(409)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('már megvásároltad')
  })

  it('a KLIENS MEGKERÜLHETŐ: hiányos számlázási adattal küldött kérés → 400, magyar üzenettel', async () => {
    const { payload } = createMockPayload()
    const POST = makeHandler(async () => payload)

    const response = await POST(
      makeRequest({ ...happyInput, billing: { ...CHECKOUT_BILLING, street: '' } }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('Add meg az utcát és a házszámot.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('teljes számlázási adattal → 200, és a snapshotba a KÉRÉSBEN küldött adat kerül', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()
    const POST = makeHandler(async () => payload)

    const response = await POST(makeRequest({ ...happyInput, billing: CHECKOUT_BILLING }))

    expect(response.status).toBe(200)
    expect((calls.create[0] as Record<string, unknown>).customerSnapshot).toMatchObject({
      billingCity: 'Szombathely',
      billingSource: 'checkout',
    })
  })

  it('nem-JSON törzs → 400', async () => {
    const { payload } = createMockPayload()
    const POST = makeHandler(async () => payload)

    const response = await POST(makeRequest('ez nem json {'))

    expect(response.status).toBe(400)
    expect((await response.json()) as { error: string }).toHaveProperty('error')
  })

  it('váratlan technikai hiba → 500, általános magyar üzenettel (a részletek csak a naplóba)', async () => {
    const POST = makeHandler(async () => {
      throw new Error('DB-kapcsolat megszakadt')
    })

    const response = await POST(makeRequest(happyInput))

    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('Váratlan hiba')
    expect(body.error).not.toContain('DB-kapcsolat')
  })

  it('A2 — az IP-nkénti keret felett 429, magyar üzenettel; Payload és Barion NEM hívódik', async () => {
    const limiter = new SlidingWindowRateLimiter()
    let payloadLoads = 0
    const { payload } = createMockPayload()
    const POST = createCheckoutStartHandler({
      getPayload: async () => {
        payloadLoads += 1
        return payload
      },
      rateLimit: { limiter },
    })

    const allowed = RATE_LIMIT_RULES['checkout-start'].limit
    for (let index = 0; index < allowed; index += 1) {
      fetchMock.mockResolvedValueOnce(barionStartSuccess())
      expect((await POST(makeRequest(happyInput, '203.0.113.30'))).status).toBe(200)
    }

    const throttled = await POST(makeRequest(happyInput, '203.0.113.30'))

    expect(throttled.status).toBe(429)
    expect(Number(throttled.headers.get('Retry-After'))).toBeGreaterThan(0)
    const body = (await throttled.json()) as { error: string }
    expect(body.error).toContain('Túl sok próbálkozás')
    // A korlát a DRÁGA lépések előtt fog: nincs újabb Payload-betöltés és Barion-hívás.
    expect(payloadLoads).toBe(allowed)
    expect(fetchMock).toHaveBeenCalledTimes(allowed)

    // Másik IP kerete érintetlen.
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    expect((await POST(makeRequest(happyInput, '203.0.113.31'))).status).toBe(200)
  })
})

describe('T-063 — plugin-adapter-kontroll', () => {
  it('a végleges config NEM tartalmaz plugin /payments/* végpontot (confirmOrder-útvonal nem létezik)', async () => {
    const config = await configPromise
    const paths = (config.endpoints ?? []).map((endpoint) => endpoint.path)
    const paymentPaths = paths.filter((path) => path.startsWith('/payments/'))
    expect(paymentPaths).toEqual([])
  })

  it('az adapter confirmOrder-je SOHA nem fut le sikeresen (paid csak a Barion-callback-útvonalon)', async () => {
    const update = vi.fn()
    const fakeReq = {
      payload: { update },
      user: mockUser,
    }

    await expect(
      barionPaymentAdapter.confirmOrder({ data: { paymentID: 'x' }, req: fakeReq as never }),
    ).rejects.toThrowError(/confirmOrder nem ellenőrzi a fizetés tényleges státuszát/)

    // Bizonyíték: semmilyen rendelés-módosítás (paid-re állítás) nem történt.
    expect(update).not.toHaveBeenCalled()
  })

  it('a withoutPluginPaymentEndpoints szűrő eltávolítja a plugin payment-végpontjait', () => {
    const endpoints = [
      { path: '/payments/barion/initiate', method: 'post', handler: vi.fn() },
      { path: '/payments/barion/confirm-order', method: 'post', handler: vi.fn() },
      { path: '/egyeb', method: 'get', handler: vi.fn() },
    ] as never[]

    const kept = withoutPluginPaymentEndpoints(endpoints)

    expect(kept.map((endpoint) => endpoint.path)).toEqual(['/egyeb'])
  })

  it('az adapter initiatePayment-je a checkout-szolgáltatásra épül (startPayment a libből)', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload } = createMockPayload()
    const req = { payload, user: mockUser }

    const result = (await barionPaymentAdapter.initiatePayment({
      data: {
        cart: { items: [{ product: 42, quantity: 1 }] },
        currency: 'HUF',
        consentWithdrawalWaiver: true,
      } as never,
      req: req as never,
      transactionsSlug: 'transactions',
    })) as { message: string; orderNumber: string; gatewayUrl: string }

    expect(result.orderNumber).toBe(ORDER_NUMBER)
    expect(result.gatewayUrl).toBe(GATEWAY_URL)
    expect(lastBarionRequestBody().PaymentRequestId).toBe(ORDER_NUMBER)
  })

  it('az adapter név/címke bekötve (barion)', () => {
    expect(barionPaymentAdapter.name).toBe('barion')
    expect(barionPaymentAdapter.label).toContain('Barion')
  })
})
