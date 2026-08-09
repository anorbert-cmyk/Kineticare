import { NextRequest } from 'next/server'
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { createBarionCallbackHandler } from '../lib/barion-callback/route-handler'
import { createCheckoutStartHandler } from '../lib/checkout/route-handler'
import { createFormSubmissionRateLimitHook } from '../lib/form-submission-rate-limit'
import { createRateLimiter } from '../lib/rate-limit'
import { createRefundHandler } from '../lib/refund/route-handler'
import { createStreamTokenHandler } from '../lib/stream/route-handler'
import { createUsersAuthRateLimitHook } from '../lib/users-auth-rate-limit'
import type { WebhookEventDoc, WebhookEventStore } from '../lib/idempotency'

/**
 * Rate-limit route-/hook-szintű tesztek (blackhat-review lefedés):
 * 429 + Retry-After + magyar üzenet, ha a keret elfogyott; limit alatt a kérés
 * változatlanul átmegy. Minden teszt TESZT-SPECIFIKUS, alacsony limitű
 * limiter-példányt injektál — a megosztott singletonokat és a meglévő
 * handler-teszteket nem terheli.
 */

const VALID_PAYMENT_ID = '11111111-2222-3333-4444-555555555555'

function testLimiter(max: number) {
  return createRateLimiter({ windowMs: 60_000, max, cleanupIntervalMs: 0 })
}

function createWebhookStore() {
  const docs: WebhookEventDoc[] = []
  let nextId = 1
  const store: WebhookEventStore = {
    find: async () => ({ docs: [], totalDocs: 0 }),
    create: async ({ data }) => {
      const doc: WebhookEventDoc = {
        id: nextId++,
        provider: data.provider as WebhookEventDoc['provider'],
        externalId: data.externalId as string,
        status: (data.status as WebhookEventDoc['status']) ?? 'received',
        attempts: (data.attempts as number) ?? 0,
        payload: data.payload,
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

function createScheduleCapture() {
  const tasks: Array<() => Promise<void>> = []
  return {
    tasks,
    schedule: (task: () => Promise<void>) => {
      tasks.push(task)
    },
  }
}

/** Payload-stub: csak annyi, amennyi az adott handlernek a 429/hibaágig kell. */
function stubPayload(overrides: Record<string, unknown> = {}): Payload {
  return {
    auth: async () => ({ user: null }),
    find: async () => ({ docs: [], totalDocs: 0 }),
    findByID: async () => null,
    create: async () => ({ id: 1 }),
    update: async () => ({}),
    ...overrides,
  } as unknown as Payload
}

function expectRateLimit429(body: unknown): void {
  const parsed = body as { error?: string; retryAfterSec?: number }
  expect(parsed.error).toBe('Túl sok kérés érkezett. Kérjük, próbáld újra később.')
  expect(typeof parsed.retryAfterSec).toBe('number')
  expect(parsed.retryAfterSec).toBeGreaterThanOrEqual(1)
}

describe('POST /api/barion/callback — rate-limit + PaymentId formátumvalidáció', () => {
  const makeRequest = (body: unknown, headers: Record<string, string> = {}): Request =>
    new Request('https://shop.example.test/api/barion/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })

  function setup(max: number) {
    const { store, docs } = createWebhookStore()
    const capture = createScheduleCapture()
    const POST = createBarionCallbackHandler({
      getPayload: async () => stubPayload(),
      schedule: capture.schedule,
      store,
      rateLimiter: testLimiter(max),
    })
    return { POST, docs, capture }
  }

  it('limit alatt átmegy (200 accepted), limit felett 429 + Retry-After + magyar üzenet', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { POST, docs } = setup(2)
    const headers = { 'x-forwarded-for': '203.0.113.9' }

    const first = await POST(makeRequest({ PaymentId: VALID_PAYMENT_ID }, headers))
    expect(first.status).toBe(200)
    const second = await POST(
      makeRequest({ PaymentId: '22222222-3333-4444-5555-666666666666' }, headers),
    )
    expect(second.status).toBe(200)

    const third = await POST(
      makeRequest({ PaymentId: '33333333-4444-5555-6666-777777777777' }, headers),
    )
    expect(third.status).toBe(429)
    expect(third.headers.get('Retry-After')).toBeTruthy()
    expectRateLimit429(await third.json())

    // A 429-es kérés NEM írt a webhook-events táblába.
    expect(docs).toHaveLength(2)
    // A visszautasítás naplózva (requestId-vel kötött child logger útján).
    const logs = logSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
    expect(logs).toContain('rate-limit')
    logSpy.mockRestore()
  })

  it('más IP-ről jövő kérés független keretet kap', async () => {
    const { POST } = setup(1)
    const first = await POST(
      makeRequest({ PaymentId: VALID_PAYMENT_ID }, { 'x-forwarded-for': '203.0.113.1' }),
    )
    expect(first.status).toBe(200)
    const otherIp = await POST(
      makeRequest({ PaymentId: '22222222-3333-4444-5555-666666666666' }, { 'x-forwarded-for': '203.0.113.2' }),
    )
    expect(otherIp.status).toBe(200)
  })

  it.each([
    ['nem-guid-azonosito'],
    ['11111111-2222-3333-4444-55555555555g'], // nem hex karakter
    ['11111111-2222-3333-4444-55555555555'], // túl rövid GUID
    ['a'.repeat(65)], // túl hosszú
  ])('érvénytelen PaymentId formátum (%s) → 400, a webhook-events írás ELŐTT', async (paymentId) => {
    const { POST, docs, capture } = setup(30)

    const response = await POST(makeRequest({ PaymentId: paymentId }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, error: 'Érvénytelen PaymentId formátum.' })
    expect(docs).toHaveLength(0)
    expect(capture.tasks).toHaveLength(0)
  })
})

describe('POST /api/checkout/start — rate-limit (per-user + per-IP)', () => {
  const makeRequest = (body: unknown, headers: Record<string, string> = {}): NextRequest =>
    new NextRequest('https://shop.example.test/api/checkout/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })

  function setup(max: number, userId: number) {
    const limiter = testLimiter(max)
    const payload = stubPayload({ auth: async () => ({ user: { id: userId } }) })
    const POST = createCheckoutStartHandler({
      getPayload: async () => payload,
      rateLimiter: limiter,
    })
    return { POST, limiter }
  }

  it('per-user: a limitet átlépő user 429-et kap — még más IP-ről sem', async () => {
    const { POST } = setup(1, 7)
    // Az első kérés átmegy a limiten (a nem-JSON törzs miatt 400 — bizonyítja,
    // hogy a kérés eljutott a body-parse-ig).
    const first = await POST(makeRequest('nem json', { 'x-forwarded-for': '203.0.113.1' }))
    expect(first.status).toBe(400)

    const second = await POST(
      makeRequest({ productId: 42 }, { 'x-forwarded-for': '203.0.113.2' }),
    )
    expect(second.status).toBe(429)
    expect(second.headers.get('Retry-After')).toBeTruthy()
    expectRateLimit429(await second.json())
  })

  it('per-IP: más user ugyanarról az IP-ről szintén 429 (közös IP-keret)', async () => {
    const { POST, limiter } = setup(1, 7)
    const first = await POST(makeRequest('nem json', { 'x-forwarded-for': '203.0.113.1' }))
    expect(first.status).toBe(400)

    // Más user, ugyanaz a limiter-példány: a per-user kulcsa üres, de az
    // IP-keret már foglalt → az IP-limit utasítja el.
    const payload8 = stubPayload({ auth: async () => ({ user: { id: 8 } }) })
    const POST8 = createCheckoutStartHandler({
      getPayload: async () => payload8,
      rateLimiter: limiter,
    })
    const second = await POST8(makeRequest({ productId: 42 }, { 'x-forwarded-for': '203.0.113.1' }))
    expect(second.status).toBe(429)
  })

  it('per-IP: más IP-ről jövő más user átmegy (a keretek függetlenek)', async () => {
    const { POST, limiter } = setup(1, 7)
    const first = await POST(makeRequest('nem json', { 'x-forwarded-for': '203.0.113.1' }))
    expect(first.status).toBe(400)

    const payload8 = stubPayload({ auth: async () => ({ user: { id: 8 } }) })
    const POST8 = createCheckoutStartHandler({
      getPayload: async () => payload8,
      rateLimiter: limiter,
    })
    const second = await POST8(makeRequest('nem json', { 'x-forwarded-for': '203.0.113.2' }))
    expect(second.status).toBe(400)
  })
})

describe('GET /api/stream-token — rate-limit (per-user)', () => {
  const makeRequest = (): NextRequest =>
    new NextRequest('https://shop.example.test/api/stream-token?productId=42', { method: 'GET' })

  it('a limitet átlépő user 429-et kap; limit alatt a paywall-válasz (403) változatlan', async () => {
    const nonBuyer = { id: 5, email: 'nemvevo@example.test', purchases: [] }
    const payload = stubPayload({ auth: async () => ({ user: nonBuyer }) })
    const GET = createStreamTokenHandler({
      getPayload: async () => payload,
      rateLimiter: testLimiter(1),
    })

    const first = await GET(makeRequest())
    // Átment a limiten → a paywall dönt (nem-vevő → 403).
    expect(first.status).toBe(403)

    const second = await GET(makeRequest())
    expect(second.status).toBe(429)
    expect(second.headers.get('Retry-After')).toBeTruthy()
    expectRateLimit429(await second.json())
  })
})

describe('POST /api/admin/orders/[orderNumber]/refund — rate-limit (per-owner)', () => {
  const makeRequest = (): Request =>
    new Request('https://shop.example.test/api/admin/orders/KH-2026-000777/refund', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
  const context = { params: Promise.resolve({ orderNumber: 'KH-2026-000777' }) }

  it('a limitet átlépő owner 429-et kap; limit alatt a 404-es üzleti válasz változatlan', async () => {
    const owner = { id: 1, role: 'owner' }
    const payload = stubPayload({ auth: async () => ({ user: owner }) })
    const POST = createRefundHandler({
      getPayload: async () => payload,
      rateLimiter: testLimiter(1),
    })

    const first = await POST(makeRequest(), context)
    // Átment a limiten → ismeretlen rendelés → 404 (Barion-hívás nélkül).
    expect(first.status).toBe(404)

    const second = await POST(makeRequest(), context)
    expect(second.status).toBe(429)
    expect(second.headers.get('Retry-After')).toBeTruthy()
    expectRateLimit429(await second.json())
  })

  it('a 401/403-as (jogosulatlan) kérések NEM fogyasztják az owner keretét', async () => {
    const payload = stubPayload({ auth: async () => ({ user: null }) })
    const POST = createRefundHandler({
      getPayload: async () => payload,
      rateLimiter: testLimiter(1),
    })

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await POST(makeRequest(), context)
      expect(response.status).toBe(401)
    }
  })
})

describe('users beforeOperation hook — forgot-password + regisztráció (Payload REST)', () => {
  function callHook(
    hook: ReturnType<typeof createUsersAuthRateLimitHook>,
    input: {
      operation: string
      email?: string
      ip?: string
      user?: unknown
    },
  ) {
    const headers = new Headers()
    if (input.ip) {
      headers.set('x-forwarded-for', input.ip)
    }
    return hook({
      args: { data: input.email === undefined ? {} : { email: input.email } },
      operation: input.operation,
      req: { headers, user: input.user ?? null },
    } as never)
  }

  it('forgotPassword: per-IP limit — a 3. azonos IP-s kérés 429 APIError-t dob', () => {
    const hook = createUsersAuthRateLimitHook({ limiter: testLimiter(2) })
    callHook(hook, { operation: 'forgotPassword', email: 'a@pelda.hu', ip: '203.0.113.1' })
    callHook(hook, { operation: 'forgotPassword', email: 'b@pelda.hu', ip: '203.0.113.1' })

    try {
      callHook(hook, { operation: 'forgotPassword', email: 'c@pelda.hu', ip: '203.0.113.1' })
      expect.unreachable('429-es APIError-t kellett volna dobnia')
    } catch (error) {
      expect(error).toMatchObject({
        status: 429,
        message: 'Túl sok kérés érkezett. Kérjük, próbáld újra később.',
      })
    }
  })

  it('forgotPassword: per-email limit — IP-rotálással sem bombázható egy címzett', () => {
    const hook = createUsersAuthRateLimitHook({ limiter: testLimiter(2) })
    callHook(hook, { operation: 'forgotPassword', email: 'Aldo@pelda.hu', ip: '203.0.113.1' })
    // A normalizálás miatt a kisbetűs/trimelt alak ugyanaz a kulcs.
    callHook(hook, { operation: 'forgotPassword', email: ' aldo@pelda.hu ', ip: '203.0.113.2' })

    expect(() =>
      callHook(hook, { operation: 'forgotPassword', email: 'aldo@pelda.hu', ip: '203.0.113.3' }),
    ).toThrowError(expect.objectContaining({ status: 429 }) as Error)
  })

  it('create (nyilvános regisztráció): szintén limitált', () => {
    const hook = createUsersAuthRateLimitHook({ limiter: testLimiter(1) })
    callHook(hook, { operation: 'create', email: 'uj@pelda.hu', ip: '203.0.113.1' })
    expect(() =>
      callHook(hook, { operation: 'create', email: 'masik@pelda.hu', ip: '203.0.113.1' }),
    ).toThrowError(expect.objectContaining({ status: 429 }) as Error)
  })

  it('bejelentkezett hívó (admin user-létrehozás) NEM limitált', () => {
    const hook = createUsersAuthRateLimitHook({ limiter: testLimiter(1) })
    const admin = { id: 1, role: 'owner' }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(() =>
        callHook(hook, { operation: 'create', email: `user${attempt}@pelda.hu`, user: admin }),
      ).not.toThrow()
    }
  })

  it('más műveletek (login, read, update) NEM limitáltak', () => {
    const hook = createUsersAuthRateLimitHook({ limiter: testLimiter(1) })
    for (const operation of ['login', 'read', 'update', 'resetPassword']) {
      expect(() => callHook(hook, { operation, ip: '203.0.113.1' })).not.toThrow()
      expect(() => callHook(hook, { operation, ip: '203.0.113.1' })).not.toThrow()
    }
  })

  it('feloldhatatlan IP → közös bucket (nem megkerülhető a fejlécek elhallgatásával)', () => {
    const hook = createUsersAuthRateLimitHook({ limiter: testLimiter(1) })
    callHook(hook, { operation: 'forgotPassword', email: 'a@pelda.hu' })
    expect(() => callHook(hook, { operation: 'forgotPassword', email: 'b@pelda.hu' })).toThrowError(
      expect.objectContaining({ status: 429 }) as Error,
    )
  })
})

describe('form-submissions beforeValidate hook — kapcsolat-űrlap per-IP limit', () => {
  it('limit alatt a data változatlanul áthalad (a Turnstile-lánc érintetlen)', async () => {
    const hook = createFormSubmissionRateLimitHook({ limiter: testLimiter(5) })
    const data = { form: '42', submissionData: [] }
    const result = await hook({ data, req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.1' }) } })
    expect(result).toBe(data)
  })

  it('limit felett 429 APIError, magyar üzenettel', async () => {
    const hook = createFormSubmissionRateLimitHook({ limiter: testLimiter(1) })
    const req = { headers: new Headers({ 'x-forwarded-for': '203.0.113.1' }) }
    await hook({ data: {}, req })

    try {
      await hook({ data: {}, req })
      expect.unreachable('429-es APIError-t kellett volna dobnia')
    } catch (error) {
      expect(error).toMatchObject({
        status: 429,
        message: 'Túl sok beküldés érkezett. Kérjük, próbáld újra néhány perc múlva.',
      })
    }
  })

  it('feloldhatatlan IP → közös bucket', async () => {
    const hook = createFormSubmissionRateLimitHook({ limiter: testLimiter(1) })
    await hook({ data: {}, req: { headers: new Headers() } })
    await expect(hook({ data: {}, req: { headers: new Headers() } })).rejects.toMatchObject({
      status: 429,
    })
  })
})
