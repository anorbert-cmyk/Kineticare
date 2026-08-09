import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi, type MockInstance } from 'vitest'

import { createBarionCallbackProcessor } from '../lib/barion-callback/process-callback'
import { createBarionCallbackHandler } from '../lib/barion-callback/route-handler'
import { processWebhook, type WebhookEventDoc, type WebhookEventStore } from '../lib/idempotency'
import type { Order, User } from '../payload-types'

/**
 * T-022 Barion-callback egységtesztek — mockolt fetch-csel (GetState), mockolt
 * Payload local API-val és állapottartó in-memory webhook-events tárhelylyel
 * (az idempotency.test.ts és checkout-start.test.ts mintáját követve).
 *
 * A tesztek a VALÓDI route-handlert + processWebhook státuszgépet + processzort
 * együtt futtatják; az aszinkron ütemező injektált (schedule-capture), így a
 * feldolgozás determinisztikusan, a HTTP-válasz után indítható.
 */

// DUMMY érték, egyértelműen jelölve — NEM valódi Barion POSKey.
const DUMMY_POS_KEY = 'DUMMY-POSKEY-NEM-VALODI-TITOK'

const PAYMENT_ID = '11111111-2222-3333-4444-555555555555'
const ORDER_NUMBER = 'KH-2026-000123'
/**
 * A rendelés szerver-oldali végösszege. Az S2 összeg-assert miatt a
 * GetState-válasz Total/Currency mezőjének EGYEZNIE kell ezzel — enélkül a
 * paid-átmenet elutasított.
 */
const ORDER_TOTAL_HUF = 19990

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const savedEnv: Record<string, string | undefined> = {}

beforeAll(() => {
  for (const key of ['BARION_API_URL', 'BARION_PAYEE_EMAIL', 'BARION_POSKEY_TEST']) {
    savedEnv[key] = process.env[key]
  }
  process.env.BARION_API_URL = 'https://api.test.barion.com'
  process.env.BARION_PAYEE_EMAIL = 'payee@example.test'
  process.env.BARION_POSKEY_TEST = DUMMY_POS_KEY
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
  vi.restoreAllMocks()
})

/** Állapottartó in-memory webhook-events tárhely (unique-kényszerrel) — idempotency.test.ts minta. */
function createWebhookStore(initial: WebhookEventDoc[] = []) {
  const docs = [...initial]
  let nextId = docs.length + 1

  const store: WebhookEventStore = {
    find: async ({ where }) => {
      const json = JSON.stringify(where ?? {})
      const provider = json.includes('"barion"') ? 'barion' : undefined
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
  barionPaymentId?: string | null
  customer?: number
  productIds?: number[]
  totalHufSnapshot?: number | null
}

function createOrder(fixture: OrderFixture = {}): Order {
  return {
    id: 101,
    orderNumber: ORDER_NUMBER,
    status: fixture.status ?? 'payment_pending',
    barionPaymentId: fixture.barionPaymentId === undefined ? PAYMENT_ID : fixture.barionPaymentId,
    customer: fixture.customer ?? 7,
    currency: 'HUF',
    totalHufSnapshot:
      fixture.totalHufSnapshot === undefined ? ORDER_TOTAL_HUF : fixture.totalHufSnapshot,
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
  const calls = {
    update: [] as Array<{ collection: string; id: number | string; data: Record<string, unknown> }>,
  }
  const payload = {
    find: vi.fn(async ({ where }: { collection: string; where?: unknown }) => {
      const json = JSON.stringify(where ?? {})
      if (!order) return { docs: [], totalDocs: 0 }
      if (json.includes('barionPaymentId')) {
        return order.barionPaymentId && json.includes(String(order.barionPaymentId))
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
  return { payload: payload as unknown as Payload, calls, order, user }
}

interface StateOverrides {
  paymentId?: string
  /** null = a mező teljesen hiányzik a válaszból (S2 összeg-assert bukása). */
  total?: number | null
  currency?: string | null
}

/** GetState-válasz a Bariontól (alapból a rendelés összegével/devizájával). */
function getStateResponse(status: string, overrides: StateOverrides = {}): Response {
  const { paymentId = PAYMENT_ID, total = ORDER_TOTAL_HUF, currency = 'HUF' } = overrides
  return new Response(
    JSON.stringify({
      PaymentId: paymentId,
      PaymentRequestId: ORDER_NUMBER,
      Status: status,
      ...(total === null ? {} : { Total: total }),
      ...(currency === null ? {} : { Currency: currency }),
      Transactions: [],
      Errors: [],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function barionProviderError(): Response {
  return new Response(
    JSON.stringify({
      Errors: [
        {
          ErrorCode: 'PaymentNotFound',
          Title: 'Payment not found',
          Description: 'There is no payment with this ID.',
        },
      ],
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
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

function makeRequest(body: unknown): Request {
  return new Request('https://shop.example.test/api/barion/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function setup(options: MockPayloadOptions = {}) {
  const { store, docs } = createWebhookStore()
  const { payload, calls, order, user } = createMockPayload(options)
  const capture = createScheduleCapture()
  const POST = createBarionCallbackHandler({
    getPayload: async () => payload,
    schedule: capture.schedule,
    store,
  })
  return { POST, store, docs, payload, calls, order, user, capture }
}

const logOutput = (spy: MockInstance<(...args: unknown[]) => void>): string =>
  spy.mock.calls.map((call) => call.map((arg) => String(arg)).join(' ')).join('\n')

describe('POST /api/barion/callback — bemenet-ellenőrzés', () => {
  it('hiányzó PaymentId → 400, naplózva', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs } = setup()

    const response = await POST(makeRequest({ Foo: 'bar' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false })
    expect(docs).toHaveLength(0)
    expect(logOutput(logSpy)).toContain('PaymentId')
  })

  it('üres PaymentId → 400', async () => {
    const { POST } = setup()
    const response = await POST(makeRequest({ PaymentId: '   ' }))
    expect(response.status).toBe(400)
  })

  it('nem JSON törzs → 400', async () => {
    const { POST } = setup()
    const response = await POST(makeRequest('ez nem json {'))
    expect(response.status).toBe(400)
  })

  /**
   * A végpont szándékosan kimarad a kérés-korlát alól (a fizetési értesítés
   * elvesztése pénzt jelent), tehát bárki korlátlanul hívhatja. Alak-ellenőrzés
   * nélkül minden hívás EGY webhook-events sort írna és EGY kimenő Barion
   * GetState-hívást indítana — ezért a nem GUID-alakú PaymentId már a
   * dedup-írás ELŐTT elakad.
   */
  it('szemét (nem GUID) PaymentId → 400, DB-írás és ütemezés NÉLKÜL', async () => {
    const { POST, docs, capture } = setup()

    for (const garbage of [
      'nem-egy-guid',
      '../../etc/passwd',
      '11111111-2222-3333-4444-55555555555',
      '11111111-2222-3333-4444-5555555555555',
      '11111111222233334444555555555555',
      '11111111-2222-3333-4444-55555555555g',
      '<script>alert(1)</script>',
    ]) {
      const response = await POST(makeRequest({ PaymentId: garbage }))
      expect(response.status, garbage).toBe(400)
    }

    expect(docs).toHaveLength(0)
    expect(capture.tasks).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a hossz-plafon a mintaillesztés előtt fog (nagy törzs sem jut a DB-ig)', async () => {
    const { POST, docs } = setup()

    const response = await POST(makeRequest({ PaymentId: 'a'.repeat(100_000) }))

    expect(response.status).toBe(400)
    expect(docs).toHaveLength(0)
  })

  it('érvényes GUID átmegy (kis- és nagybetűs hex is)', async () => {
    for (const validId of [PAYMENT_ID, '0A1B2C3D-4E5F-6789-ABCD-EF0123456789']) {
      const { POST, docs } = setup()

      const response = await POST(makeRequest({ PaymentId: validId }))

      expect(response.status, validId).toBe(200)
      expect(await response.json()).toEqual({ ok: true, status: 'accepted' })
      expect(docs).toHaveLength(1)
      expect(docs[0]?.externalId).toBe(validId)
    }
  })
})

describe('(h) aszinkron viselkedés — a 200 NEM vár a GetState-re', () => {
  it('a handler azonnal 200-zal válaszol, miközben a GetState még függőben van', async () => {
    const { POST, capture, docs } = setup()
    // A fetch SZÁNDÉKOSAN sosem resolve-olódik a válasz előtt.
    fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'accepted' })
    // A válasz pillanatában a GetState MÉG nem hívódott meg — a feldolgozás aszinkron.
    expect(fetchMock).not.toHaveBeenCalled()
    // A dedup-rekord viszont már létezik (azonnal rögzítve).
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ provider: 'barion', externalId: PAYMENT_ID, status: 'received' })
    // A nyers body nincs tárolva — csak a strukturált paymentId.
    expect(docs[0].payload).toEqual({ paymentId: PAYMENT_ID })

    // Az aszinkron task el van kapva; a teszt eldobja (a fetch sosem tér vissza).
    expect(capture.tasks).toHaveLength(1)
    capture.tasks.length = 0
  })
})

describe('(a) boldog út — paid', () => {
  it('GetState Succeeded → rendelés paid + purchases + processedAt/result', async () => {
    const { POST, docs, calls, order, user, capture } = setup()
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded'))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    // GetState a v4-es útvonalon, szerver-szerver.
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toBe(`https://api.test.barion.com/v4/Payment/${PAYMENT_ID}/PaymentState`)

    // Rendelés: payment_pending → paid (pontosan egy átmenet).
    const orderUpdates = calls.update.filter((call) => call.collection === 'orders')
    expect(orderUpdates).toHaveLength(1)
    expect(orderUpdates[0]?.data.status).toBe('paid')
    expect(order?.status).toBe('paid')

    // Purchases-jogosultság beírva (egy bejegyzés).
    const userUpdates = calls.update.filter((call) => call.collection === 'users')
    expect(userUpdates).toHaveLength(1)
    expect(userUpdates[0]?.data.purchases).toEqual([42])
    expect(user.purchases).toEqual([42])

    // Webhook-events: processed + processedAt + result='paid'.
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'paid', attempts: 1 })
    expect(typeof docs[0]?.processedAt).toBe('string')
  })
})

describe('(b) duplikált callback — EXACTLY ONCE', () => {
  it('második azonos PaymentId → 200 no-op; egy paid átmenet, egy purchases bejegyzés, egy GetState', async () => {
    const { POST, docs, calls, order, user, capture } = setup()
    fetchMock.mockResolvedValue(getStateResponse('Succeeded'))

    const first = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(first.status).toBe(200)
    await capture.runAll()

    const second = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ ok: true, status: 'duplicate' })
    await capture.runAll()

    // EGY GetState-hívás, EGY paid átmenet, EGY purchases-írás, EGY webhook-rekord.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(1)
    expect(calls.update.filter((call) => call.collection === 'users')).toHaveLength(1)
    expect(order?.status).toBe('paid')
    expect(user.purchases).toEqual([42])
    expect(docs).toHaveLength(1)
  })

  it('feldolgozás alatt érkező ismétlés (received) → 200, újabb ütemezés nélkül', async () => {
    const { POST, capture } = setup()
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))

    const first = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    const second = await POST(makeRequest({ PaymentId: PAYMENT_ID }))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ ok: true, status: 'received' })
    // Csak az első kézbesítés ütemezett feldolgozást.
    expect(capture.tasks).toHaveLength(1)
    capture.tasks.length = 0
  })

  it('már paid rendelésre érkező callback: átmenet no-op (NEM hiba), purchases idempotens', async () => {
    const { POST, calls, order, user, capture } = setup({
      order: createOrder({ status: 'paid' }),
      user: createUser([42]),
    })
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded'))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    // Nincs státusz-átmenet és nincs purchases-írás (már mindkettő megvan).
    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(0)
    expect(calls.update.filter((call) => call.collection === 'users')).toHaveLength(0)
    expect(order?.status).toBe('paid')
    expect(user.purchases).toEqual([42])
  })
})

describe('(c) cancelled — Canceled és Expired', () => {
  it.each([['Canceled'], ['Expired']])('%s → payment_pending rendelés cancelled lesz', async (barionStatus) => {
    const { POST, docs, order, capture } = setup()
    fetchMock.mockResolvedValueOnce(getStateResponse(barionStatus))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(order?.status).toBe('cancelled')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'cancelled' })
  })
})

describe('(d) függő státusz — Prepared/Started', () => {
  it.each([['Prepared'], ['Started']])('%s → a rendelés payment_pending marad, repoll-jelzéssel', async (barionStatus) => {
    const { POST, docs, order, calls, capture } = setup()
    fetchMock.mockResolvedValueOnce(getStateResponse(barionStatus))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    // Státusz VÁLTOZATLAN, purchases-beírás NINCS — a poll-job (külön ticket) dolgozza fel.
    expect(order?.status).toBe('payment_pending')
    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(0)
    expect(calls.update.filter((call) => call.collection === 'users')).toHaveLength(0)
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'pending_repoll' })
    expect(typeof docs[0]?.processedAt).toBe('string')
  })
})

describe('(e) hamis/ismeretlen PaymentId', () => {
  it('GetState hibázik és rendelés sincs → riasztás + failed, a handler ettől 200-at adott', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, capture } = setup({ order: null })
    fetchMock.mockResolvedValueOnce(barionProviderError())

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    // A handler MÁR 200-at adott (a Barion retry-ja nem pörög feleslegesen).
    expect(response.status).toBe(200)

    await capture.runAll()

    // Rögzítve a webhook-events-ben, failed státusszal (processedAt NINCS — retryable marad),
    // és riasztás került a naplóba.
    expect(docs[0]).toMatchObject({ status: 'failed', result: 'failed' })
    expect(docs[0]?.processedAt ?? null).toBeNull()
    expect(docs[0]?.lastError).toBeTruthy()
    expect(logOutput(logSpy)).toContain('barion-callback')
  })
})

describe('(f) GetState-hiba — újrapróbálható', () => {
  it('hálózati hiba → failed + lastError, processedAt NULL; az újrapróbálás (retry-job) sikerül', async () => {
    const { POST, docs, order, capture, store, payload } = setup()
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(docs[0]).toMatchObject({ status: 'failed', result: 'failed', attempts: 1 })
    expect(docs[0]?.lastError).toBeTruthy()
    // A processedAt SZÁNDÉKOSAN NULL — az esemény újrapróbálható marad.
    expect(docs[0]?.processedAt ?? null).toBeNull()
    expect(order?.status).toBe('payment_pending')

    // Újrapróbálás (a webhook-retry job ugyanezt hívja): sikeres GetState mellett paid lesz.
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded'))
    const retry = await processWebhook({
      store,
      provider: 'barion',
      externalId: PAYMENT_ID,
      handler: createBarionCallbackProcessor({ payload, store }),
    })

    expect(retry.kind).toBe('processed')
    expect(order?.status).toBe('paid')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'paid', attempts: 2 })
    expect(typeof docs[0]?.processedAt).toBe('string')
  })
})

describe('(g) paid → cancelled visszaállítás TILOS (állapotgép-védelem)', () => {
  it('paid rendelésre Canceled callback → státusz marad paid, riasztás a naplóba, result=rejected', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, order, capture } = setup({ order: createOrder({ status: 'paid' }) })
    fetchMock.mockResolvedValueOnce(getStateResponse('Canceled'))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    // A visszaállítás NEM történt meg; az esemény lezárva (rejected), nem újrapróbálandó.
    expect(order?.status).toBe('paid')
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'rejected' })
    expect(logOutput(logSpy)).toContain('RIASZT')
    expect(logOutput(logSpy)).toContain('paid')
  })
})

describe('hiányzó rendelés — GetState rendben, de nincs order', () => {
  it('riasztás + failed (NEM csendes elnyelés), a handler ettől 200-at adott', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, capture } = setup({ order: null })
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded'))

    const response = await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    expect(response.status).toBe(200)
    await capture.runAll()

    expect(docs[0]).toMatchObject({ status: 'failed', result: 'failed' })
    expect(docs[0]?.lastError).toContain('nem tartozik rendelés')
    const logs = logOutput(logSpy)
    expect(logs).toContain('RIASZT')
    expect(logs).toContain(ORDER_NUMBER)
  })
})

describe('orderNumber-fallback és titokvédelem', () => {
  it('hiányzó barionPaymentId esetén a PaymentRequestId (orderNumber) alapján azonosít és pótol', async () => {
    const { POST, calls, order, capture } = setup({
      order: createOrder({ barionPaymentId: null }),
    })
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded'))

    await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    await capture.runAll()

    // A rendelés paid lett, és a barionPaymentId pótlódott.
    expect(order?.status).toBe('paid')
    expect(order?.barionPaymentId).toBe(PAYMENT_ID)
    expect(calls.update.some((call) => call.data.barionPaymentId === PAYMENT_ID)).toBe(true)
  })

  /**
   * S2 — a fallback-párosítás a LEGGYENGÉBB bizonyíték: nem a barionPaymentId
   * kötötte a fizetést a rendeléshez. Ha az összeg nem stimmel, SEMMIT nem
   * írunk a rendelésre (a barionPaymentId-t sem), és az esemény rejected.
   */
  it('orderNumber-fallback + eltérő Total → semmilyen írás, rejected + riasztás', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, calls, order, capture } = setup({
      order: createOrder({ barionPaymentId: null }),
    })
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded', { total: 1 }))

    await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    await capture.runAll()

    expect(order?.status).toBe('payment_pending')
    expect(order?.barionPaymentId ?? null).toBeNull()
    expect(calls.update).toHaveLength(0)
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'rejected' })
    const logs = logOutput(logSpy)
    expect(logs).toContain('RIASZT')
    expect(logs).toContain('orderNumber-alapú párosítás')
  })

  /**
   * S2 — az elsődleges (barionPaymentId szerinti) ágon is kötelező az
   * összeg-egyezés: a Barion Succeeded önmagában NEM elég bizonyíték.
   */
  it('eltérő Total az elsődleges ágon → a rendelés NEM lesz paid, rejected', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs, calls, order, capture } = setup()
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded', { total: 990 }))

    await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    await capture.runAll()

    expect(order?.status).toBe('payment_pending')
    expect(calls.update.filter((call) => call.collection === 'orders')).toHaveLength(0)
    expect(calls.update.filter((call) => call.collection === 'users')).toHaveLength(0)
    expect(docs[0]).toMatchObject({ status: 'processed', result: 'rejected' })
    expect(logOutput(logSpy)).toContain('RIASZT')
  })

  it('a naplóban sosem szerepel a POSKey', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, capture } = setup()
    fetchMock.mockResolvedValueOnce(getStateResponse('Succeeded'))

    await POST(makeRequest({ PaymentId: PAYMENT_ID }))
    await capture.runAll()

    expect(logOutput(logSpy)).not.toContain(DUMMY_POS_KEY)
  })
})
