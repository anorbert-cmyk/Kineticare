import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { CheckoutError, startCheckout } from '../../lib/checkout/start-checkout'
import {
  GUEST_EMAIL_INVALID_ERROR,
  GUEST_NAME_MISSING_ERROR,
  validateGuest,
} from '../../lib/checkout/guest'
import { planCheckoutSubmission } from '../../lib/checkout/form-submission'
import type { Order, Product, User } from '../../payload-types'

/**
 * VENDÉG-VÁSÁRLÁS a pénztárban (tulajdonosi döntés, 2026-08-15).
 *
 * A vásárláshoz nem kell előbb regisztrálni: e-mail + név elég. A rendelés
 * `customer` NÉLKÜL, de kitöltött `customerEmail`-lel jön létre; a fiók a
 * fizetés UTÁN dől el (lásd order-status/resolve-order-customer.test.ts).
 *
 * Amit ez a fájl bizonyít:
 *  1. a vendég-azonosító adatok validációja (tiszta mag),
 *  2. a pénztár beküldési tervében a `guest` blokk csak vendégként megy ki,
 *  3. a checkout-start vendég-ága: fiók nélküli rendelés, e-maillel,
 *  4. LÉTEZŐ e-maillel indított vendég-vásárlás nem hoz létre duplikátumot, és
 *     a már megvett kurzus 409-cel elakad MÉG A FIZETÉS ELŐTT,
 *  5. bejelentkezve a törzs `guest` mezője figyelmen kívül marad (nem lehet
 *     idegen e-mailre rendelni).
 *
 * A Barion-hívás mockolt fetch-en megy (valódi hálózati hívás nincs — CLAUDE.md
 * 15. tanulság), a Payload local API pedig injektált mock.
 */

// DUMMY érték, egyértelműen jelölve — NEM valódi Barion POSKey.
const DUMMY_POS_KEY = 'DUMMY-POSKEY-NEM-VALODI-TITOK'
const DUMMY_PAYMENT_ID = '11111111-2222-3333-4444-555555555555'
const ORDER_NUMBER = 'KH-2026-000123'
const GATEWAY_URL = `https://secure.test.barion.com/Pay?id=${DUMMY_PAYMENT_ID}`

const GUEST = { email: 'vendeg@example.test', name: 'Vendég Vevő' }

const BILLING = {
  name: 'Vendég Vevő',
  zip: '9700',
  city: 'Szombathely',
  street: 'Fő tér 2/A',
}

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
  items: [{ product: 42, quantity: 1, titleSnapshot: 'KURZUS-ALAP', priceHufSnapshot: 5000 }],
} as unknown as Order

interface MockOptions {
  /** Az e-mailhez tartozó MEGLÉVŐ fiók (vendég-ág) — alapból nincs. */
  existingUser?: User | null
  /** A rendelés-keresés válasza a where alapján (duplavásárlás-ellenőrzés). */
  findOrders?: (where: unknown) => { docs: unknown[]; totalDocs: number }
}

function createMockPayload(options: MockOptions = {}) {
  const calls = {
    create: [] as Array<Record<string, unknown>>,
    userWhere: [] as unknown[],
    orderWhere: [] as unknown[],
  }
  const payload = {
    findByID: vi.fn(async () => publishedProduct),
    find: vi.fn(async (args: { collection: string; where?: unknown }) => {
      if (args.collection === 'users') {
        calls.userWhere.push(args.where)
        const user = options.existingUser ?? null
        return { docs: user ? [user] : [], totalDocs: user ? 1 : 0 }
      }
      calls.orderWhere.push(args.where)
      return options.findOrders ? options.findOrders(args.where) : { docs: [], totalDocs: 0 }
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      calls.create.push(data)
      return { ...data, ...createdOrderDoc, id: 101 }
    }),
    update: vi.fn(async ({ id, data }: { id: number | string; data: Record<string, unknown> }) => ({
      id,
      ...data,
    })),
  }
  return { payload: payload as unknown as Payload, calls }
}

const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

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

/** A Barion-kliens env-je (a checkout-start.test.ts mintája szerint mentve/visszaállítva). */
const savedEnv: Record<string, string | undefined> = {}
const ENV_KEYS = [
  'BARION_API_URL',
  'BARION_PAYEE_EMAIL',
  'BARION_POSKEY_TEST',
  'NEXT_PUBLIC_SERVER_URL',
]
beforeAll(() => {
  for (const key of ENV_KEYS) {
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

// ---------------------------------------------------------------------------
// 1. A vendég-azonosító adatok validációja (tiszta mag)
// ---------------------------------------------------------------------------

describe('validateGuest — a vendég azonosító adatai', () => {
  it('érvényes adat → kisbetűsített e-mail és normalizált név', () => {
    expect(validateGuest({ email: '  Vendeg.Vevo@Example.TEST ', name: '  Vendég   Vevő ' })).toEqual({
      ok: true,
      value: { email: 'vendeg.vevo@example.test', name: 'Vendég Vevő' },
    })
  })

  it('hiányzó mezők → mindkettőre mezőhöz kötött, magyar hiba, e-mail-lel az élen', () => {
    const result = validateGuest({})
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors.map((error) => error.field)).toEqual(['email', 'name'])
    expect(result.errors[1].message).toBe(GUEST_NAME_MISSING_ERROR)
  })

  it('alakilag hibás cím → invalid (a Payload users-create is elutasítaná)', () => {
    for (const email of ['nem-email', 'a@b', 'ket..pont@example.test', 'szokoz a@example.test']) {
      const result = validateGuest({ email, name: 'Teszt Elek' })
      expect(result.ok, `elfogadott hibás cím: ${email}`).toBe(false)
      if (!result.ok) {
        expect(result.errors[0].message).toBe(GUEST_EMAIL_INVALID_ERROR)
      }
    }
  })

  it('LÁTHATATLAN karakterekből álló „név" nem megy át (zero-width szűrés)', () => {
    const result = validateGuest({ email: 'a@example.test', name: '​​​' })
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. A pénztár beküldési terve
// ---------------------------------------------------------------------------

describe('planCheckoutSubmission — a vendég-blokk a törzsben', () => {
  const baseContext = {
    productId: 42,
    alreadyPurchased: false,
    waiverRequired: true,
    waiverStartAccepted: true,
    waiverLossAccepted: true,
    // Az ÁSZF-elfogadás minden ágon kötelező; a saját tesztjei a
    // penztar-aszf-elfogadas.test.tsx-ben.
    termsAccepted: true,
    billing: { ...BILLING, taxNumber: '' },
  }

  it('vendégként a `guest` blokk KIMEGY a törzsben (normalizálva)', () => {
    const plan = planCheckoutSubmission({
      ...baseContext,
      guest: { email: ' Vendeg@Example.TEST ', name: 'Vendég Vevő' },
    })
    expect(plan.kind).toBe('send')
    if (plan.kind !== 'send') {
      return
    }
    expect(plan.body.guest).toEqual({ email: 'vendeg@example.test', name: 'Vendég Vevő' })
  })

  it('bejelentkezve (nincs guest-állapot) a törzsben SINCS `guest` mező', () => {
    const plan = planCheckoutSubmission(baseContext)
    expect(plan.kind).toBe('send')
    if (plan.kind !== 'send') {
      return
    }
    expect(plan.body.guest).toBeUndefined()
  })

  it('hiányzó vendég-adatnál a beküldés meg sem indul, és a fókusz az e-mail mezőn áll', () => {
    const plan = planCheckoutSubmission({ ...baseContext, guest: { email: '', name: '' } })
    expect(plan.kind).toBe('invalid')
    if (plan.kind !== 'invalid') {
      return
    }
    expect(plan.focusElementId).toBe('kc-field-guestEmail')
    expect(plan.guestErrors.email).toBeDefined()
    expect(plan.guestErrors.name).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 3-5. A checkout-start vendég-ága
// ---------------------------------------------------------------------------

describe('startCheckout — vendég-vásárlás', () => {
  it('ÚJ e-maillel: fiók nélküli rendelés jön létre, a snapshot id-je null', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()

    const result = await startCheckout({
      payload,
      input: {
        productId: 42,
        consentWithdrawalWaiver: true,
        consentTerms: true,
        billing: BILLING,
        guest: GUEST,
      },
    })

    expect(result).toEqual({ orderNumber: ORDER_NUMBER, gatewayUrl: GATEWAY_URL })
    const created = calls.create[0]
    expect(created.customer).toBeUndefined()
    expect(created.customerEmail).toBe(GUEST.email)
    expect(created.customerSnapshot).toMatchObject({
      id: null,
      email: GUEST.email,
      name: GUEST.name,
      billingCity: 'Szombathely',
    })
  })

  it('hiányzó vendég-adat → 400 (a rendelés létre sem jön, a Barion nem hívódik)', async () => {
    const { payload, calls } = createMockPayload()

    await expect(
      startCheckout({
        payload,
        input: { productId: 42, consentWithdrawalWaiver: true, consentTerms: true, billing: BILLING },
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(calls.create).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('LÉTEZŐ e-mail + már megvett kurzus → 409 MÉG A FIZETÉS ELŐTT (nem dupla vásárlás)', async () => {
    // A vevőnek van fiókja (kijelentkezve vásárol) — a duplavásárlás-ellenőrzés
    // az e-mailhez tartozó fiók rendeléseit is nézi. Enélkül a dupla fizetést
    // csak a paid-átmenet K5-őre fogná meg, ott viszont már levonták a pénzt.
    const { payload, calls } = createMockPayload({
      existingUser: { id: 7, email: GUEST.email } as unknown as User,
      findOrders: (where) =>
        JSON.stringify(where ?? {}).includes('"paid"')
          ? { docs: [{ id: 55 }], totalDocs: 1 }
          : { docs: [], totalDocs: 0 },
    })

    await expect(
      startCheckout({
        payload,
        input: {
          productId: 42,
          consentWithdrawalWaiver: true,
        consentTerms: true,
          billing: BILLING,
          guest: GUEST,
        },
      }),
    ).rejects.toBeInstanceOf(CheckoutError)
    expect(calls.create).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
    // A fiók azonosítójával ÉS az e-maillel is keresett (a fiókhoz még nem
    // kötött, vendég-rendeléseket csak az utóbbi találná meg).
    const asText = JSON.stringify(calls.orderWhere)
    expect(asText).toContain('"customer"')
  })

  it('LÉTEZŐ e-maillel, még meg nem vett kurzusra: a rendelés TOVÁBBRA IS fiók nélkül jön létre', async () => {
    // A fiókhoz kötés a fizetés utánra tartozik: bejelentkezés nélkül senki
    // nem írhat idegen fiók nevében rendelést a fiókba.
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload({
      existingUser: { id: 7, email: GUEST.email, name: 'Régi Név' } as unknown as User,
    })

    await startCheckout({
      payload,
      input: { productId: 42, consentWithdrawalWaiver: true, consentTerms: true, billing: BILLING, guest: GUEST },
    })

    const created = calls.create[0]
    expect(created.customer).toBeUndefined()
    expect(created.customerEmail).toBe(GUEST.email)
  })

  it('BEJELENTKEZVE a törzs `guest` mezője figyelmen kívül marad (nem lehet idegen címre rendelni)', async () => {
    fetchMock.mockResolvedValueOnce(barionStartSuccess())
    const { payload, calls } = createMockPayload()
    const sessionUser = {
      id: 7,
      email: 'sajat@example.test',
      name: 'Saját Vevő',
    } as unknown as User

    await startCheckout({
      payload,
      user: sessionUser,
      input: {
        productId: 42,
        consentWithdrawalWaiver: true,
        consentTerms: true,
        billing: BILLING,
        guest: { email: 'idegen@example.test', name: 'Idegen' },
      },
    })

    const created = calls.create[0]
    expect(created.customer).toBe(7)
    expect(created.customerEmail).toBe('sajat@example.test')
    expect(created.customerSnapshot).toMatchObject({ id: 7, email: 'sajat@example.test' })
  })
})
