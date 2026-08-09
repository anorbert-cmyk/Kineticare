import type Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import {
  constructWebhookEvent,
  createCheckoutSession,
  getStripeClient,
  getStripeConfig,
  hufToFiller,
  retrieveCheckoutSession,
  StripeApiError,
  STRIPE_API_VERSION,
  type StripeClientConfig,
  type StripeGatewayClient,
} from '../lib/stripe'

/**
 * Stripe lib egységtesztek — INJEKTÁLT fake klienssel (a stripe SDK sosem
 * példányosul valódi hálózattal), a barion.test.ts mintáját követve.
 */

// DUMMY értékek, egyértelműen jelölve — NEM valódi Stripe-kulcsok.
const DUMMY_SECRET_KEY = 'sk_test_DUMMY-NEM-VALODI-TITOK'
const DUMMY_WEBHOOK_SECRET = 'whsec_DUMMY-NEM-VALODI-TITOK'

const ORDER_NUMBER = 'KH-2026-000123'
const SESSION_ID = 'cs_test_a1b2c3d4e5f6'
const SESSION_URL = 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6'

const ENABLED_CONFIG: StripeClientConfig = {
  enabled: true,
  secretKey: DUMMY_SECRET_KEY,
  webhookSecret: DUMMY_WEBHOOK_SECRET,
}

interface CreateCall {
  params: Stripe.Checkout.SessionCreateParams
  options?: { idempotencyKey?: string }
}

interface FakeClientOptions {
  createResult?: Stripe.Checkout.Session
  createError?: unknown
  retrieveResult?: Stripe.Checkout.Session
  retrieveError?: unknown
  constructEventResult?: Stripe.Event
  constructEventError?: unknown
}

/** Fake StripeGatewayClient — a hívások rögzítésével, valódi SDK/hálózat nélkül. */
function createFakeStripeClient(options: FakeClientOptions = {}) {
  const calls = { create: [] as CreateCall[], retrieve: [] as string[] }
  const session =
    options.createResult ??
    ({ id: SESSION_ID, url: SESSION_URL, object: 'checkout.session' } as Stripe.Checkout.Session)
  const client: StripeGatewayClient = {
    checkout: {
      sessions: {
        create: async (params, opts) => {
          calls.create.push({ params, ...(opts ? { options: opts } : {}) })
          if (options.createError) {
            throw options.createError
          }
          return session
        },
        retrieve: async (id) => {
          calls.retrieve.push(id)
          if (options.retrieveError) {
            throw options.retrieveError
          }
          return (options.retrieveResult ?? session) as Stripe.Checkout.Session
        },
      },
    },
    webhooks: {
      constructEvent: () => {
        if (options.constructEventError) {
          throw options.constructEventError
        }
        return (
          options.constructEventResult ??
          ({ id: 'evt_1', object: 'event', type: 'checkout.session.completed' } as Stripe.Event)
        )
      },
    },
  }
  return { client, calls }
}

describe('getStripeConfig — opcionális-enabled env-feloldás (Számlázz.hu-minta)', () => {
  it('STRIPE_SECRET_KEY nélkül enabled=false (NEM hiba — a Barion marad az alapértelmezett)', () => {
    const config = getStripeConfig({})
    expect(config.enabled).toBe(false)
    expect(config.secretKey).toBeUndefined()
    expect(config.webhookSecret).toBeUndefined()
  })

  it('megadott kulcsokkal enabled=true, a webhook-secret is feloldódik', () => {
    const config = getStripeConfig({
      STRIPE_SECRET_KEY: `  ${DUMMY_SECRET_KEY}  `,
      STRIPE_WEBHOOK_SECRET: DUMMY_WEBHOOK_SECRET,
    })
    expect(config).toEqual({
      enabled: true,
      secretKey: DUMMY_SECRET_KEY,
      webhookSecret: DUMMY_WEBHOOK_SECRET,
    })
  })

  it('csak whitespace-os kulcs = hiányzó kulcs (enabled=false)', () => {
    expect(getStripeConfig({ STRIPE_SECRET_KEY: '   ' }).enabled).toBe(false)
  })
})

describe('getStripeClient — kikapcsolt konfigurációval not_configured hibát dob', () => {
  it('enabled=false → StripeApiError(not_configured), magyar üzenettel', () => {
    expect(() => getStripeClient({ enabled: false })).toThrowError(StripeApiError)
    try {
      getStripeClient({ enabled: false })
    } catch (error) {
      expect((error as StripeApiError).kind).toBe('not_configured')
      expect((error as StripeApiError).message).toContain('STRIPE_SECRET_KEY')
    }
  })

  it('enabled konfigurációval SDK-példány jön létre (hálózati hívás nélkül), pinelt API-verzióval', () => {
    const client = getStripeClient(ENABLED_CONFIG)
    expect(typeof client.checkout.sessions.create).toBe('function')
    // A lib explicit pineli az API-verziót a telepített csomag verziójára.
    expect(STRIPE_API_VERSION).toBe('2026-07-29.dahlia')
  })
})

describe('hufToFiller — a HUF a Stripe-ban NEM zero-decimal (terhelésnél kéttizedes)', () => {
  it('5000 Ft → 500000 fillér', () => {
    expect(hufToFiller(5000)).toBe(500_000)
    expect(hufToFiller(1)).toBe(100)
  })
})

describe('createCheckoutSession — a Barion startPayment tükreképe', () => {
  const params = {
    orderNumber: ORDER_NUMBER,
    successUrl: 'https://shop.example.test/fizetes/koszonom',
    cancelUrl: 'https://shop.example.test/sikertelen',
    customerEmail: 'vevo@example.test',
    items: [{ name: 'KURZUS-ALAP', quantity: 2, unitPriceHuf: 2500 }],
  }

  it('mode:payment, HUF FILLÉRBEN (unit_amount = Ft × 100), idempotencyKey = client_reference_id = orderNumber', async () => {
    const { client, calls } = createFakeStripeClient()

    const result = await createCheckoutSession(params, { client, config: ENABLED_CONFIG })

    expect(result).toEqual({ sessionId: SESSION_ID, url: SESSION_URL })
    expect(calls.create).toHaveLength(1)
    const { params: sent, options } = calls.create[0]!
    expect(sent.mode).toBe('payment')
    expect(sent.client_reference_id).toBe(ORDER_NUMBER)
    expect(sent.success_url).toBe('https://shop.example.test/fizetes/koszonom')
    expect(sent.cancel_url).toBe('https://shop.example.test/sikertelen')
    expect(sent.customer_email).toBe('vevo@example.test')
    expect(sent.locale).toBe('hu')
    const lineItems = sent.line_items as Array<{
      quantity: number
      price_data: { currency: string; unit_amount: number; product_data: { name: string } }
    }>
    expect(lineItems).toHaveLength(1)
    expect(lineItems[0]?.price_data.currency).toBe('huf')
    // 2500 Ft → 250000 fillér (a HUF terhelésnél kéttizedes a Stripe-ban!).
    expect(lineItems[0]?.price_data.unit_amount).toBe(250_000)
    expect(lineItems[0]?.quantity).toBe(2)
    // Stripe-oldali idempotencia: az orderNumber az idempotencyKey.
    expect(options?.idempotencyKey).toBe(ORDER_NUMBER)
  })

  it('hiányzó session.url → StripeApiError(invalid_response)', async () => {
    const { client } = createFakeStripeClient({
      createResult: { id: SESSION_ID, url: null } as Stripe.Checkout.Session,
    })

    const promise = createCheckoutSession(params, { client, config: ENABLED_CONFIG })
    await expect(promise).rejects.toBeInstanceOf(StripeApiError)
    await expect(promise).rejects.toMatchObject({ kind: 'invalid_response' })
  })

  it('üres tétellista → hiba (a Stripe line_items nem lehet üres)', async () => {
    const { client } = createFakeStripeClient()
    await expect(
      createCheckoutSession({ ...params, items: [] }, { client, config: ENABLED_CONFIG }),
    ).rejects.toBeInstanceOf(StripeApiError)
  })

  it('SDK-hiba fordítása: StripeInvalidRequestError → StripeApiError(provider), a kód megőrződik', async () => {
    const sdkError = Object.assign(new Error('No such product'), {
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      statusCode: 400,
    })
    const { client } = createFakeStripeClient({ createError: sdkError })

    const promise = createCheckoutSession(params, { client, config: ENABLED_CONFIG })
    await expect(promise).rejects.toBeInstanceOf(StripeApiError)
    await expect(promise).rejects.toMatchObject({
      kind: 'provider',
      stripeErrorType: 'StripeInvalidRequestError',
      stripeErrorCode: 'resource_missing',
      httpStatus: 400,
    })
  })

  it('kapcsolathiba → StripeApiError(network)', async () => {
    const sdkError = Object.assign(new Error('connection reset'), { type: 'StripeConnectionError' })
    const { client } = createFakeStripeClient({ createError: sdkError })

    await expect(
      createCheckoutSession(params, { client, config: ENABLED_CONFIG }),
    ).rejects.toMatchObject({ kind: 'network' })
  })

  it('kikapcsolt konfiguráció (kliens-injekció nélkül) → not_configured', async () => {
    await expect(
      createCheckoutSession(params, { config: { enabled: false } }),
    ).rejects.toMatchObject({ kind: 'not_configured' })
  })
})

describe('retrieveCheckoutSession — szerver-szerver verifikáció (a GetState megfelelője)', () => {
  it('átadja a sessionId-t és visszaadja a sessiont', async () => {
    const { client, calls } = createFakeStripeClient({
      retrieveResult: {
        id: SESSION_ID,
        payment_status: 'paid',
        amount_total: 500_000,
        currency: 'huf',
      } as Stripe.Checkout.Session,
    })

    const session = await retrieveCheckoutSession(SESSION_ID, { client, config: ENABLED_CONFIG })

    expect(calls.retrieve).toEqual([SESSION_ID])
    expect(session.payment_status).toBe('paid')
    expect(session.amount_total).toBe(500_000)
  })

  it('SDK-hiba fordítása retrieve-nél is (resource_missing → provider)', async () => {
    const sdkError = Object.assign(new Error('No such checkout session'), {
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      statusCode: 404,
    })
    const { client } = createFakeStripeClient({ retrieveError: sdkError })

    await expect(
      retrieveCheckoutSession(SESSION_ID, { client, config: ENABLED_CONFIG }),
    ).rejects.toMatchObject({ kind: 'provider', stripeErrorCode: 'resource_missing' })
  })
})

describe('constructWebhookEvent — aláírás-verifikáció', () => {
  const RAW_BODY = '{"id":"evt_1","object":"event"}'
  const SIGNATURE = 't=123,v1=abc'

  it('hiányzó webhook-secret → StripeApiError(signature), a kliens NEM hívódik', () => {
    const { client } = createFakeStripeClient()
    expect(() =>
      constructWebhookEvent(RAW_BODY, SIGNATURE, { client, config: { enabled: true } }),
    ).toThrowError(/STRIPE_WEBHOOK_SECRET/)
  })

  it('érvényes aláírás → a verifikált esemény', () => {
    const event = {
      id: 'evt_1',
      object: 'event',
      type: 'checkout.session.completed',
    } as Stripe.Event
    const { client } = createFakeStripeClient({ constructEventResult: event })

    const result = constructWebhookEvent(RAW_BODY, SIGNATURE, { client, config: ENABLED_CONFIG })
    expect(result.id).toBe('evt_1')
  })

  it('érvénytelen aláírás (SDK dob) → StripeApiError(signature)', () => {
    const { client } = createFakeStripeClient({
      constructEventError: new Error('No signatures found matching the expected signature'),
    })

    try {
      constructWebhookEvent(RAW_BODY, SIGNATURE, { client, config: ENABLED_CONFIG })
      expect.unreachable('az érvénytelen aláírásnak hibát kell dobnia')
    } catch (error) {
      expect(error).toBeInstanceOf(StripeApiError)
      expect((error as StripeApiError).kind).toBe('signature')
    }
  })
})
