import crypto from 'node:crypto'

import type { Payload } from 'payload'
import RealStripe from 'stripe'
import type Stripe from 'stripe'
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { processWebhook, type WebhookEventDoc, type WebhookEventStore } from '../lib/idempotency'
import { createStripeWebhookProcessor } from '../lib/stripe-webhook/process-webhook'
import { createStripeWebhookHandler } from '../lib/stripe-webhook/route-handler'
import type { StripeClientConfig, StripeGatewayClient } from '../lib/stripe'
import type { Order, User } from '../payload-types'

/**
 * Stripe-webhook egységtesztek — a barion-callback.test.ts tükreképe:
 * VALÓDI HMAC-aláírással aláírt webhook-fixture (a SDK valódi
 * webhooks.constructEvent-je verifikál — hálózat nélkül), mockolt
 * sessions.retrieve-vel, mockolt Payload local API-val és állapottartó
 * in-memory webhook-events tárhellyel.
 *
 * A tesztek a VALÓDI route-handlert + processWebhook státuszgépet +
 * processzort együtt futtatják; az aszinkron ütemező injektált
 * (schedule-capture), így a feldolgozás determinisztikusan indítható.
 */

// DUMMY értékek, egyértelműen jelölve — NEM valódi Stripe-titkok.
const DUMMY_SECRET_KEY = 'sk_test_DUMMY-NEM-VALODI-TITOK'
const DUMMY_WEBHOOK_SECRET = 'whsec_DUMMY-NEM-VALODI-TITOK'

const EVENT_ID = 'evt_1TestWebhookEvent0001'
const SESSION_ID = 'cs_test_a1b2c3d4e5f6a7b8'
const ORDER_NUMBER = 'KH-2026-000123'
/** A rendelés snapshot-végösszege — az amount_total-assert ezzel veti össze (FILLÉRBEN!). */
const TOTAL_HUF = 5000

const STRIPE_CONFIG: StripeClientConfig = {
  enabled: true,
  secretKey: DUMMY_SECRET_KEY,
  webhookSecret: DUMMY_WEBHOOK_SECRET,
}

/** Valódi Stripe-webhook-aláírás a fixture-bodyhoz (a SDK ezt verifikálja). */
function signPayload(rawBody: string, secret: string = DUMMY_WEBHOOK_SECRET): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

/** Aláírt webhook-fixture nyers bodyja (checkout.session.completed). */
function makeEventRawBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: EVENT_ID,
    object: 'event',
    api_version: '2026-07-29.dahlia',
    type: 'checkout.session.completed',
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: SESSION_ID,
        object: 'checkout.session',
        client_reference_id: ORDER_NUMBER,
      },
    },
    ...overrides,
  })
}

/** A sessions.retrieve (szerver-szerver bizonyíték) mockolt válasza. */
function retrieveSessionFixture(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: SESSION_ID,
    object: 'checkout.session',
    payment_status: 'paid',
    amount_total: TOTAL_HUF * 100, // FILLÉRBEN: 5000 Ft → 500000
    currency: 'huf',
    client_reference_id: ORDER_NUMBER,
    ...overrides,
  } as Stripe.Checkout.Session
}

/** Állapottartó in-memory webhook-events tárhely (unique-kényszerrel) — barion-callback.test.ts minta. */
function createWebhookStore(initial: WebhookEventDoc[] = []) {
  const docs = [...initial]
  let nextId = docs.length + 1

  const store: WebhookEventStore = {
    find: async ({ where }) => {
      const json = JSON.stringify(where ?? {})
      const provider = json.includes('"stripe"') ? 'stripe' : undefined
      const externalMatch = /"externalId":\{"equals":"([^"]+)"\}/.exec(json)
      const matched = docs.filter(
        (doc) =>
          (provider === undefined || doc.provider === provider) &&
          (!externalMatch || doc.externalId === externalMatch[1]),
      )
      return { docs: matched, totalDocs: matched.length }
    },
    create: async ({ data }) => {
      const duplicate = docs.some(
        (doc) => doc.provider === data.provider && doc.externalId === data.externalId,
      )
      if (duplicate) {
        const error = new Error(
          'duplicate key value violates unique constraint "webhook_events_provider_external_id"',
        ) as Error & { code: string }
        error.code = '23505'
        throw error
      }
      const doc: WebhookEventDoc = {
        id: nextId++,
        provider: data.provider as WebhookEventDoc['provider'],
        externalId: data.externalId as string,
        eventType: data.eventType as string | undefined,
        status: (data.status as WebhookEventDoc['status']) ?? 'received',
        attempts: (data.attempts as number) ?? 0,
        payload: data.payload,
        requestId: data.requestId as string | undefined,
      }
      docs.push(doc)
      return doc
    },
    update: async ({ id, data }) => {
      const doc = docs.find((candidate) => candidate.id === id)
      if (!doc) throw new Error(`nincs ilyen rekord: ${id}`)
      Object.assign(doc, data)
      return doc
    },
  }

  return { store, docs }
}

interface OrderFixture {
  status?: Order['status']
  stripeSessionId?: string | null
  customer?: number
  productIds?: number[]
}

function createOrder(fixture: OrderFixture = {}): Order {
  return {
    id: 101,
    orderNumber: ORDER_NUMBER,
    status: fixture.status ?? 'payment_pending',
    totalHufSnapshot: TOTAL_HUF,
    currency: 'HUF',
    paymentProvider: 'stripe',
    stripeSessionId: fixture.stripeSessionId === undefined ? SESSION_ID : fixture.stripeSessionId,
    customer: fixture.customer ?? 7,
    customerEmail: 'vevo@example.test',
    items: (fixture.productIds ?? [42]).map((productId) => ({
      product: productId,
      quantity: 1,
    })),
  } as unknown as Order
}

function createUser(purchases: number[] = []): User {
  return { id: 7, email: 'vevo@example.test', purchases } as unknown as User
}

interface MockPayloadOptions {
  order?: Order | null
  user?: User
}

function createMockPayload(options: MockPayloadOptions = {}) {
  const order = options.order === undefined ? createOrder() : options.order
  const user = options.user ?? createUser()
  const jobsQueue = vi.fn(async () => ({}))
  const calls = {
    update: [] as Array<{ collection: string; id: number | string; data: Record<string, unknown> }>,
  }
  const payload = {
    // A jobs.queue felület az onOrderPaid számla-job sorba állításához (T-024 minta).
    jobs: { queue: jobsQueue },
    find: vi.fn(async ({ where }: { collection: string; where?: unknown }) => {
      const json = JSON.stringify(where ?? {})
      if (!order) return { docs: [], totalDocs: 0 }
      if (json.includes('stripeSessionId')) {
        return order.stripeSessionId && json.includes(String(order.stripeSessionId))
          ? { docs: [order], totalDocs: 1 }
          : { docs: [], totalDocs: 0 }
      }
      if (json.includes('orderNumber')) {
        return order.orderNumber && json.includes(String(order.orderNumber))
          ? { docs: [order], totalDocs: 1 }
          : { docs: [], totalDocs: 0 }
      }
      return { docs: [], totalDocs: 0 }
    }),
    findByID: vi.fn(async () => user),
    update: vi.fn(
      async (args: { collection: string; id: number | string; data: Record<string, unknown> }) => {
        calls.update.push(args)
        if (args.collection === 'orders' && order) {
          Object.assign(order, args.data)
        }
        if (args.collection === 'users') {
          Object.assign(user, args.data)
        }
        return args.data
      },
    ),
  }
  return { payload: payload as unknown as Payload, calls, order, user, jobsQueue }
}

/** Injektált aszinkron-ütemező: a taskot elkapja, a teszt indítja kézzel. */
function createScheduleCapture() {
  const tasks: Array<() => Promise<void>> = []
  return {
    tasks,
    schedule: (task: () => Promise<void>) => {
      tasks.push(task)
    },
    runAll: async () => {
      for (const task of tasks.splice(0)) {
        await task()
      }
    },
  }
}

interface SetupOptions extends MockPayloadOptions {
  retrieveResult?: Stripe.Checkout.Session
  retrieveError?: unknown
  /** Felülírható konfig (pl. kikapcsolt integráció teszteléséhez). */
  stripeConfig?: StripeClientConfig
}

function setup(options: SetupOptions = {}) {
  const { store, docs } = createWebhookStore()
  const { payload, calls, order, user, jobsQueue } = createMockPayload(options)
  const capture = createScheduleCapture()
  const stripeConfig = options.stripeConfig ?? STRIPE_CONFIG

  // A sessions.hívások mockolva; az aláírás-verifikáció a VALÓDI SDK-t használja
  // (tisztán kriptográfiai művelet, hálózat nélkül) — így a fixture valóban aláírt.
  const realStripe = new RealStripe(DUMMY_SECRET_KEY)
  const retrieve = vi.fn(async (): Promise<Stripe.Checkout.Session> => {
    if (options.retrieveError) {
      throw options.retrieveError
    }
    return options.retrieveResult ?? retrieveSessionFixture()
  })
  const stripeClient: StripeGatewayClient = {
    checkout: {
      sessions: {
        create: async () => {
          throw new Error('a webhook-tesztekben session-létrehozás nem történik')
        },
        retrieve,
      },
    },
    webhooks: {
      constructEvent: realStripe.webhooks.constructEvent.bind(realStripe.webhooks),
    },
  }

  const POST = createStripeWebhookHandler({
    getPayload: async () => payload,
    schedule: capture.schedule,
    store,
    stripeClient,
    stripeConfig,
  })
  return { POST, store, docs, payload, calls, order, user, capture, retrieve, stripeClient, jobsQueue }
}

function makeSignedRequest(rawBody: string = makeEventRawBody(), signature?: string): Request {
  return new Request('https://shop.example.test/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature ?? signPayload(rawBody),
    },
    body: rawBody,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const logOutput = (spy: MockInstance<(...args: unknown[]) => void>): string =>
  spy.mock.calls.map((call) => call.map((arg) => String(arg)).join(' ')).join('\n')

describe('POST /api/stripe/webhook — aláírás- és bemenet-ellenőrzés', () => {
  it('hiányzó stripe-signature fejléc → 400, webhook-events sor NÉLKÜL', async () => {
    const { POST, docs } = setup()
    const rawBody = makeEventRawBody()
    const request = new Request('https://shop.example.test/api/stripe/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: rawBody,
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false })
    expect(docs).toHaveLength(0)
  })

  it('hibás aláírás → 400, és NEM íródik webhook-events sor (a valódi SDK verifikációja utasítja el)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, retrieve } = setup()
    const rawBody = makeEventRawBody()

    const response = await POST(makeSignedRequest(rawBody, 't=1,v1=HAMISITOTT-ALAIRAS'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false })
    // A verifikálatlan esemény sosem kerül a feldolgozási láncba.
    expect(docs).toHaveLength(0)
    expect(retrieve).not.toHaveBeenCalled()
    expect(logOutput(logSpy)).toContain('stripe-webhook')
  })

  it('módosított body érvényes fejléccel → 400 (az aláírás a nyers bájtokra szól)', async () => {
    const { POST, docs } = setup()
    const rawBody = makeEventRawBody()
    const signature = signPayload(rawBody)

    const response = await POST(makeSignedRequest(`${rawBody} `, signature))

    expect(response.status).toBe(400)
    expect(docs).toHaveLength(0)
  })

  it('nem kezelt eseménytípus → 200 ignored, dedup-sor nélkül', async () => {
    const { POST, docs, retrieve } = setup()
    const rawBody = makeEventRawBody({ type: 'payment_intent.created' })

    const response = await POST(makeSignedRequest(rawBody))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'ignored' })
    expect(docs).toHaveLength(0)
    expect(retrieve).not.toHaveBeenCalled()
  })

  it('kikapcsolt Stripe-konfiguráció → 503 (a Stripe retry-ja később sikerülhet)', async () => {
    const { POST, docs } = setup({ stripeConfig: { enabled: false } })
    const rawBody = makeEventRawBody()

    const response = await POST(makeSignedRequest(rawBody))

    expect(response.status).toBe(503)
    expect(docs).toHaveLength(0)
  })
})

describe('(h) aszinkron viselkedés — a 200 NEM vár a sessions.retrieve-re', () => {
  it('a handler azonnal 200-zal válaszol, miközben a retrieve még függőben van', async () => {
    const { POST, capture, docs, retrieve } = setup()
    // A retrieve SZÁNDÉKOSAN sosem resolve-olódik a válasz előtt.
    retrieve.mockImplementation(() => new Promise<Stripe.Checkout.Session>(() => {}))

    const response = await POST(makeSignedRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'accepted' })
    // A válasz pillanatában a retrieve MÉG nem hívódott meg — a feldolgozás aszinkron.
    expect(retrieve).not.toHaveBeenCalled()
    // A dedup-rekord viszont már létezik (azonnal rögzítve), a nyers body NINCS tárolva.
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ provider: 'stripe', externalId: EVENT_ID, status: 'received' })
    expect(docs[0]?.payload).toEqual({
      eventType: 'checkout.session.completed',
      checkoutSessionId: SESSION_ID,
    })

    expect(capture.tasks).toHaveLength(1)
    capture.tasks.length = 0
  })
})

describe('(a) boldog út — paid', () => {
  it('retrieve paid + amount/currency assert → rendelés paid + purchases + számla-job (onOrderPaid)', async () => {
    const { POST, docs, calls, order, user, capture, retrieve, jobsQueue } = setup()

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    // Szerver-szerver verifikáció: a sessions.retrieve a bizonyíték (a payload NEM az).
    expect(retrieve).toHaveBeenCalledTimes(1)
    expect(retrieve).toHaveBeenCalledWith(SESSION_ID)

    // Rendelés: payment_pending → paid (pontosan egy átmenet).
    const orderUpdates = calls.update.filter((call) => call.collection === 'orders')
    expect(orderUpdates).toHaveLength(1)
    expect(orderUpdates[0]?.data.status).toBe('paid')
    expect(order?.status).toBe('paid')

    // Purchases-jogosultság beírva.
    const userUpdates = calls.update.filter((call) => call.collection === 'users')
    expect(userUpdates).toHaveLength(1)
    expect(userUpdates[0]?.data.purchases).toEqual([42])
    expect(user.purchases).toEqual([42])

    // onOrderPaid mellékhatás: a számla-job Stripe-rendelésre is sorba áll (KÖZÖS út).
    expect(jobsQueue).toHaveBeenCalledTimes(1)
    expect(jobsQueue).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'invoice-issue', input: { orderId: 101 } }),
    )

    // Webhook-events: processed + processedAt + result='paid'.
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'paid', attempts: 1 })
    expect(typeof docs[0]?.processedAt).toBe('string')
  })
})

describe('(b) duplikált webhook — EXACTLY ONCE', () => {
  it('második azonos event.id → 200 no-op; egy retrieve, egy paid átmenet, egy purchases, egy számla-job', async () => {
    const { POST, docs, calls, order, user, capture, retrieve, jobsQueue } = setup()

    const first = await POST(makeSignedRequest())
    expect(first.status).toBe(200)
    await capture.runAll()

    const second = await POST(makeSignedRequest())
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ ok: true, status: 'duplicate' })
    await capture.runAll()

    expect(retrieve).toHaveBeenCalledTimes(1)
    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(1)
    expect(calls.update.filter((call) => call.collection === 'users')).toHaveLength(1)
    expect(jobsQueue).toHaveBeenCalledTimes(1)
    expect(order?.status).toBe('paid')
    expect(user.purchases).toEqual([42])
    expect(docs).toHaveLength(1)
  })

  it('feldolgozás alatt érkező ismétlés (received) → 200, újabb ütemezés nélkül', async () => {
    const { POST, capture, retrieve } = setup()
    retrieve.mockImplementation(() => new Promise<Stripe.Checkout.Session>(() => {}))

    const first = await POST(makeSignedRequest())
    const second = await POST(makeSignedRequest())

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ ok: true, status: 'received' })
    expect(capture.tasks).toHaveLength(1)
    capture.tasks.length = 0
  })

  it('már paid rendelésre érkező webhook: átmenet no-op (NEM hiba), mellékhatás nem fut újra', async () => {
    const { POST, calls, order, user, capture, jobsQueue } = setup({
      order: createOrder({ status: 'paid' }),
      user: createUser([42]),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(0)
    expect(calls.update.filter((call) => call.collection === 'users')).toHaveLength(0)
    expect(jobsQueue).not.toHaveBeenCalled()
    expect(order?.status).toBe('paid')
    expect(user.purchases).toEqual([42])
  })
})

describe('(c) amount/currency-assert a paid-átmenet előtt (FILLÉRBEN)', () => {
  it('paid, de amount_total < totalHufSnapshot × 100 → NINCS paid-átmenet: rejected + RIASZTÁS', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, calls, order, user, capture, jobsQueue } = setup({
      retrieveResult: retrieveSessionFixture({ amount_total: TOTAL_HUF * 100 - 1 }),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(order?.status).toBe('payment_pending')
    expect(
      calls.update.filter((call) => (call.data as { status?: string }).status === 'paid'),
    ).toHaveLength(0)
    expect(user.purchases).toEqual([])
    expect(jobsQueue).not.toHaveBeenCalled()
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'rejected' })
    expect(logOutput(logSpy)).toContain('RIASZT')
    expect(logOutput(logSpy)).toContain('paid-átmenet MEGTAGADVA')
  })

  it('paid, de eltérő currency (eur) → NINCS paid-átmenet: rejected + RIASZTÁS', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, order, capture } = setup({
      retrieveResult: retrieveSessionFixture({ currency: 'eur' }),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(order?.status).toBe('payment_pending')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'rejected' })
    expect(logOutput(logSpy)).toContain('RIASZT')
  })

  it('paid, de hiányzó amount_total (nem ellenőrizhető) → NINCS paid-átmenet', async () => {
    const { POST, docs, order, capture } = setup({
      retrieveResult: retrieveSessionFixture({ amount_total: null }),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(order?.status).toBe('payment_pending')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'rejected' })
  })
})

describe('(d) még nem paid fizetés — függő ág', () => {
  it('payment_status=unpaid → a rendelés payment_pending marad, az esemény pending_repoll', async () => {
    const { POST, docs, calls, order, capture } = setup({
      retrieveResult: retrieveSessionFixture({ payment_status: 'unpaid' }),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(order?.status).toBe('payment_pending')
    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(0)
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'pending_repoll' })
  })

  it('checkout.session.async_payment_succeeded ugyanazon az úton paid-re zárul', async () => {
    const { POST, docs, order, capture } = setup()
    const rawBody = makeEventRawBody({ type: 'checkout.session.async_payment_succeeded' })

    const response = await POST(makeSignedRequest(rawBody))
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(order?.status).toBe('paid')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'paid' })
  })
})

describe('(e) ismeretlen/árva fizetés', () => {
  it('a retrieve resource_missing-et ad → riasztás + failed (processedAt NULL marad)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, capture } = setup({
      retrieveError: Object.assign(new Error('No such checkout session'), {
        type: 'StripeInvalidRequestError',
        code: 'resource_missing',
        statusCode: 404,
      }),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(docs[0]).toMatchObject({ status: 'failed', result: 'failed' })
    expect(docs[0]?.processedAt ?? null).toBeNull()
    expect(logOutput(logSpy)).toContain('RIASZT')
  })

  it('a retrieve rendben, de nincs rendelés → riasztás + failed (NEM csendes elnyelés)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, capture } = setup({ order: null })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(docs[0]).toMatchObject({ status: 'failed', result: 'failed' })
    expect(docs[0]?.lastError).toContain('nem tartozik rendelés')
    expect(logOutput(logSpy)).toContain('RIASZT')
  })
})

describe('(f) retrieve-hiba — újrapróbálható', () => {
  it('hálózati hiba → failed + lastError, processedAt NULL; a retry-job újrafuttatása sikerül', async () => {
    const { POST, docs, order, capture, store, payload } = setup({
      retrieveError: Object.assign(new Error('connection reset'), { type: 'StripeConnectionError' }),
    })

    const response = await POST(makeSignedRequest())
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(docs[0]).toMatchObject({ status: 'failed', result: 'failed', attempts: 1 })
    expect(docs[0]?.processedAt ?? null).toBeNull()
    expect(order?.status).toBe('payment_pending')

    // Újrapróbálás (a webhook-retry job ugyanezt hívja): egészséges retrieve mellett paid lesz.
    const healthyStripe = new RealStripe(DUMMY_SECRET_KEY)
    const healthyClient: StripeGatewayClient = {
      checkout: {
        sessions: {
          create: async () => {
            throw new Error('n/a')
          },
          retrieve: async () => retrieveSessionFixture(),
        },
      },
      webhooks: { constructEvent: healthyStripe.webhooks.constructEvent.bind(healthyStripe.webhooks) },
    }
    const retry = await processWebhook({
      store,
      provider: 'stripe',
      externalId: EVENT_ID,
      handler: createStripeWebhookProcessor({
        payload,
        store,
        stripeClient: healthyClient,
        stripeConfig: STRIPE_CONFIG,
      }),
    })

    expect(retry.kind).toBe('processed')
    expect(order?.status).toBe('paid')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'paid', attempts: 2 })
    expect(typeof docs[0]?.processedAt).toBe('string')
  })
})

describe('orderNumber-fallback (client_reference_id)', () => {
  it('hiányzó stripeSessionId esetén a client_reference_id (orderNumber) alapján azonosít és pótol', async () => {
    const { POST, calls, order, capture } = setup({
      order: createOrder({ stripeSessionId: null }),
    })

    await POST(makeSignedRequest())
    await capture.runAll()

    expect(order?.status).toBe('paid')
    expect(order?.stripeSessionId).toBe(SESSION_ID)
    expect(calls.update.some((call) => call.data.stripeSessionId === SESSION_ID)).toBe(true)
  })
})
