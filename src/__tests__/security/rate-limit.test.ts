import { describe, expect, it } from 'vitest'

import {
  classifyRateLimitedRoute,
  checkRequestRateLimit,
  payloadRestRateLimitResponse,
  rateLimitHeaders,
  resolveRateLimitIp,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_RULES,
  SlidingWindowRateLimiter,
  UNKNOWN_IP_KEY,
  withPayloadRestRateLimit,
  type RateLimitRule,
} from '../../lib/security/rate-limit'

/**
 * A2 — IP-alapú kérés-korlátozás egységtesztjei.
 *
 * Az idő MINDENHOL injektált órán mozog (`now`), így a csúszóablak viselkedése
 * valós várakozás nélkül, determinisztikusan ellenőrizhető.
 */

const MINUTE = 60_000
const TEN_MINUTES = 10 * MINUTE

/** Léptethető óra a csúszóablak teszteléséhez. */
function createClock(startAt = 1_700_000_000_000) {
  let current = startAt
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

function makeRequest(
  url: string,
  init: { method?: string; ip?: string; headers?: Record<string, string> } = {},
): Request {
  const headers = new Headers(init.headers ?? {})
  if (init.ip) {
    headers.set('x-forwarded-for', init.ip)
  }
  return new Request(url, { method: init.method ?? 'POST', headers })
}

describe('resolveRateLimitIp — IP-kinyerés proxy mögül', () => {
  it('több-IP-s x-forwarded-for lánc: az ELSŐ elem a kliens IP-je', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178',
    })
    expect(resolveRateLimitIp(headers)).toBe('203.0.113.7')
  })

  it('egyelemű lánc körüli whitespace-t levágja', () => {
    expect(resolveRateLimitIp(new Headers({ 'x-forwarded-for': '  198.51.100.5  ' }))).toBe(
      '198.51.100.5',
    )
  })

  it('hiányzó fejléc → közös „ismeretlen" vödör', () => {
    expect(resolveRateLimitIp(new Headers())).toBe(UNKNOWN_IP_KEY)
  })

  it('üres/csak whitespace fejléc → közös „ismeretlen" vödör', () => {
    expect(resolveRateLimitIp(new Headers({ 'x-forwarded-for': '   ' }))).toBe(UNKNOWN_IP_KEY)
  })

  it('undefined fejléc-objektum → közös „ismeretlen" vödör (nem dob)', () => {
    expect(resolveRateLimitIp(undefined)).toBe(UNKNOWN_IP_KEY)
  })

  it('a cf-connecting-ip erősebb az x-forwarded-for-nál (a Cloudflare felülírja)', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '10.0.0.1, 203.0.113.9',
    })
    expect(resolveRateLimitIp(headers)).toBe('203.0.113.9')
  })

  it('IPv6-cím kisbetűsítve, egységes kulcsként', () => {
    const headers = new Headers({ 'x-forwarded-for': '2001:DB8::CAFE' })
    expect(resolveRateLimitIp(headers)).toBe('2001:db8::cafe')
  })

  it('túlhosszú fejlécérték levágva (memória-visszaélés ellen)', () => {
    const headers = new Headers({ 'x-forwarded-for': 'a'.repeat(5000) })
    expect(resolveRateLimitIp(headers).length).toBeLessThanOrEqual(64)
  })
})

describe('classifyRateLimitedRoute — mit korlátozunk', () => {
  it('a védett POST-végpontok a saját osztályukba esnek', () => {
    expect(classifyRateLimitedRoute('POST', '/api/users')).toBe('registration')
    expect(classifyRateLimitedRoute('POST', '/api/users/forgot-password')).toBe('password-forgot')
    expect(classifyRateLimitedRoute('POST', '/api/users/reset-password')).toBe('password-reset')
    expect(classifyRateLimitedRoute('POST', '/api/checkout/start')).toBe('checkout-start')
    expect(classifyRateLimitedRoute('POST', '/api/form-submissions')).toBe('form-submission')
  })

  it('a Barion-callbacket SOSEM korlátozzuk (fizetési értesítés)', () => {
    expect(classifyRateLimitedRoute('POST', '/api/barion/callback')).toBeNull()
  })

  it('a healthcheck (GET /admin) nem korlátozott', () => {
    expect(classifyRateLimitedRoute('GET', '/admin')).toBeNull()
  })

  it('GET/HEAD/OPTIONS sosem korlátozott, még védett útvonalon sem', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(classifyRateLimitedRoute(method, '/api/users')).toBeNull()
    }
  })

  it('a belépést a Payload maxLoginAttempts védi — itt nem korlátozzuk', () => {
    expect(classifyRateLimitedRoute('POST', '/api/users/login')).toBeNull()
  })

  it('nem felsorolt Payload-végpont érintetlen (nincs prefix-egyezés)', () => {
    expect(classifyRateLimitedRoute('POST', '/api/users/logout')).toBeNull()
    expect(classifyRateLimitedRoute('POST', '/api/orders')).toBeNull()
    expect(classifyRateLimitedRoute('POST', '/api/stream-token')).toBeNull()
  })

  it('a záró perjel és a kisbetűsítés nem kerülő út', () => {
    expect(classifyRateLimitedRoute('POST', '/api/users/')).toBe('registration')
    expect(classifyRateLimitedRoute('post', '/API/Users')).toBe('registration')
    expect(classifyRateLimitedRoute('POST', '/api/form-submissions//')).toBe('form-submission')
  })
})

describe('SlidingWindowRateLimiter — csúszóablak', () => {
  const rule: RateLimitRule = { limit: 3, windowMs: TEN_MINUTES }

  it('a keretig enged, utána elutasít', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now })

    expect(limiter.check('a', rule).allowed).toBe(true)
    expect(limiter.check('a', rule).allowed).toBe(true)
    const third = limiter.check('a', rule)
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)

    const fourth = limiter.check('a', rule)
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSeconds).toBe(TEN_MINUTES / 1000)
  })

  it('a retryAfter a LEGRÉGEBBI találat kicsúszásáig hátralévő idő', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now })

    limiter.check('a', rule)
    clock.advance(4 * MINUTE)
    limiter.check('a', rule)
    limiter.check('a', rule)

    // Az első találat 4 perce volt → még 6 perc az ablakból.
    expect(limiter.check('a', rule).retryAfterSeconds).toBe(6 * 60)
  })

  it('az ablak elcsúszásával újra enged (részlegesen is)', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now })

    limiter.check('a', rule)
    clock.advance(MINUTE)
    limiter.check('a', rule)
    limiter.check('a', rule)
    expect(limiter.check('a', rule).allowed).toBe(false)

    // Az első találat kicsúszik → PONTOSAN egy hely szabadul fel.
    clock.advance(TEN_MINUTES - MINUTE + 1)
    expect(limiter.check('a', rule).allowed).toBe(true)
    expect(limiter.check('a', rule).allowed).toBe(false)
  })

  it('az elutasított kérés NEM tolja tovább az ablakot (nincs örök zárolás)', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now })

    limiter.check('a', rule)
    limiter.check('a', rule)
    limiter.check('a', rule)

    // A kliens az ablak alatt végig hiába dörömböl…
    for (let elapsed = 0; elapsed < TEN_MINUTES; elapsed += MINUTE) {
      expect(limiter.check('a', rule).allowed).toBe(false)
      clock.advance(MINUTE)
    }

    // …az eredeti ablak leteltével mégis felszabadul.
    clock.advance(1)
    expect(limiter.check('a', rule).allowed).toBe(true)
  })

  it('a kulcsok függetlenek (IP + útvonal-osztály)', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now })

    limiter.check('registration:1.1.1.1', rule)
    limiter.check('registration:1.1.1.1', rule)
    limiter.check('registration:1.1.1.1', rule)

    expect(limiter.check('registration:1.1.1.1', rule).allowed).toBe(false)
    expect(limiter.check('registration:2.2.2.2', rule).allowed).toBe(true)
    expect(limiter.check('checkout-start:1.1.1.1', rule).allowed).toBe(true)
  })
})

describe('SlidingWindowRateLimiter — memória-takarítás', () => {
  const rule: RateLimitRule = { limit: 3, windowMs: TEN_MINUTES }

  it('a lejárt bejegyzések eltűnnek (nem szivárog a memória)', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now, sweepIntervalMs: MINUTE })

    for (let index = 0; index < 500; index += 1) {
      limiter.check(`registration:10.0.0.${index}`, rule)
    }
    expect(limiter.trackedKeyCount).toBe(500)

    // Az ablak letelte után az első ellenőrzés söpör: minden régi kulcs eldobva.
    clock.advance(TEN_MINUTES + MINUTE)
    limiter.check('registration:198.51.100.1', rule)

    expect(limiter.trackedKeyCount).toBe(1)
  })

  it('a takarítás nem sűrűbb a sweepIntervalMs-nél, de a friss kulcsot megtartja', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now, sweepIntervalMs: MINUTE })

    limiter.check('registration:10.0.0.1', rule)
    clock.advance(30_000)
    limiter.check('registration:10.0.0.2', rule)

    expect(limiter.trackedKeyCount).toBe(2)
  })

  it('a kulcs-plafon IP-rotációs elárasztásnál is tartja a memóriát', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({
      now: clock.now,
      maxTrackedKeys: 50,
      sweepIntervalMs: MINUTE,
    })

    // 5000 hamisított IP EGY ablakon belül — a plafon fölé sosem megy.
    for (let index = 0; index < 5000; index += 1) {
      limiter.check(`registration:203.0.113.${index}`, rule)
    }

    expect(limiter.trackedKeyCount).toBeLessThanOrEqual(51)
  })

  it('a reset() üríti a számlálót', () => {
    const limiter = new SlidingWindowRateLimiter()
    limiter.check('a', rule)
    expect(limiter.trackedKeyCount).toBe(1)
    limiter.reset()
    expect(limiter.trackedKeyCount).toBe(0)
  })
})

describe('checkRequestRateLimit — kérés-szintű döntés', () => {
  it('a kereten belül null (szabad az út)', () => {
    const limiter = new SlidingWindowRateLimiter()
    const request = makeRequest('https://kineticare.test/api/users', { ip: '203.0.113.1' })
    expect(checkRequestRateLimit(request, { limiter })).toBeNull()
  })

  it('a keret túllépésekor 429-döntés magyar üzenettel és Retry-After-rel', () => {
    const clock = createClock()
    const limiter = new SlidingWindowRateLimiter({ now: clock.now })
    const request = () =>
      makeRequest('https://kineticare.test/api/users', { ip: '203.0.113.2' })

    for (let index = 0; index < RATE_LIMIT_RULES.registration.limit; index += 1) {
      expect(checkRequestRateLimit(request(), { limiter })).toBeNull()
    }

    const rejection = checkRequestRateLimit(request(), { limiter })
    expect(rejection).not.toBeNull()
    expect(rejection?.routeClass).toBe('registration')
    expect(rejection?.message).toBe(RATE_LIMIT_MESSAGE)
    expect(rejection?.message).toContain('Túl sok próbálkozás')
    expect(rejection?.retryAfterSeconds).toBeGreaterThan(0)
    expect(rateLimitHeaders(rejection!)).toEqual({
      'Retry-After': String(rejection!.retryAfterSeconds),
    })
  })

  it('a különböző IP-k nem fogyasztják egymás keretét', () => {
    const limiter = new SlidingWindowRateLimiter()

    for (let index = 0; index < RATE_LIMIT_RULES.registration.limit; index += 1) {
      checkRequestRateLimit(
        makeRequest('https://kineticare.test/api/users', { ip: '203.0.113.3' }),
        { limiter },
      )
    }

    expect(
      checkRequestRateLimit(
        makeRequest('https://kineticare.test/api/users', { ip: '203.0.113.3' }),
        { limiter },
      ),
    ).not.toBeNull()
    expect(
      checkRequestRateLimit(
        makeRequest('https://kineticare.test/api/users', { ip: '203.0.113.4' }),
        { limiter },
      ),
    ).toBeNull()
  })

  it('a védett osztályok külön keretet fogyasztanak ugyanarról az IP-ről', () => {
    const limiter = new SlidingWindowRateLimiter()
    const ip = '203.0.113.5'

    for (let index = 0; index < RATE_LIMIT_RULES['password-forgot'].limit; index += 1) {
      expect(
        checkRequestRateLimit(
          makeRequest('https://kineticare.test/api/users/forgot-password', { ip }),
          { limiter },
        ),
      ).toBeNull()
    }
    expect(
      checkRequestRateLimit(
        makeRequest('https://kineticare.test/api/users/forgot-password', { ip }),
        { limiter },
      ),
    ).not.toBeNull()

    // A regisztráció kerete ettől érintetlen.
    expect(
      checkRequestRateLimit(makeRequest('https://kineticare.test/api/users', { ip }), { limiter }),
    ).toBeNull()
  })

  it('a Barion-callback korlátlanul hívható (a fizetési értesítés sosem eshet ki)', () => {
    const limiter = new SlidingWindowRateLimiter()
    for (let index = 0; index < 200; index += 1) {
      const rejection = checkRequestRateLimit(
        makeRequest('https://kineticare.test/api/barion/callback', { ip: '203.0.113.6' }),
        { limiter },
      )
      expect(rejection).toBeNull()
    }
    expect(limiter.trackedKeyCount).toBe(0)
  })

  it('a GET-eket nem korlátozzuk (healthcheck, olvasás)', () => {
    const limiter = new SlidingWindowRateLimiter()
    for (let index = 0; index < 100; index += 1) {
      expect(
        checkRequestRateLimit(
          makeRequest('https://kineticare.test/admin', { method: 'GET', ip: '203.0.113.8' }),
          { limiter },
        ),
      ).toBeNull()
      expect(
        checkRequestRateLimit(
          makeRequest('https://kineticare.test/api/users', { method: 'GET', ip: '203.0.113.8' }),
          { limiter },
        ),
      ).toBeNull()
    }
    expect(limiter.trackedKeyCount).toBe(0)
  })

  it('IP-fejléc nélkül is korlátoz (közös vödör), nem dob hibát', () => {
    const limiter = new SlidingWindowRateLimiter()
    const request = () => makeRequest('https://kineticare.test/api/users')

    for (let index = 0; index < RATE_LIMIT_RULES.registration.limit; index += 1) {
      expect(checkRequestRateLimit(request(), { limiter })).toBeNull()
    }
    expect(checkRequestRateLimit(request(), { limiter })).not.toBeNull()
  })

  it('a szabályok felülírhatók (hangolhatóság)', () => {
    const limiter = new SlidingWindowRateLimiter()
    const rules = { ...RATE_LIMIT_RULES, registration: { limit: 1, windowMs: TEN_MINUTES } }
    const request = () => makeRequest('https://kineticare.test/api/users', { ip: '203.0.113.10' })

    expect(checkRequestRateLimit(request(), { limiter, rules })).toBeNull()
    expect(checkRequestRateLimit(request(), { limiter, rules })).not.toBeNull()
  })
})

describe('withPayloadRestRateLimit — Payload REST POST beburkolása', () => {
  const rules = { ...RATE_LIMIT_RULES, 'form-submission': { limit: 2, windowMs: TEN_MINUTES } }

  /** A Payload REST-handlerek szignatúrája (@payloadcms/next/routes). */
  type PayloadRestArgs = { params: Promise<{ slug?: string[] }> }
  type PayloadRestHandler = (request: Request, args: PayloadRestArgs) => Promise<Response>

  it('a kereten belül a becsomagolt handler fut, változatlan argumentumokkal', async () => {
    const limiter = new SlidingWindowRateLimiter()
    const seen: unknown[] = []
    const handler = withPayloadRestRateLimit(
      async (request: Request, args: PayloadRestArgs) => {
        seen.push(await args.params)
        return Response.json({ ok: true, method: request.method }, { status: 201 })
      },
      { limiter, rules },
    )

    const response = await handler(
      makeRequest('https://kineticare.test/api/form-submissions', { ip: '203.0.113.11' }),
      { params: Promise.resolve({ slug: ['form-submissions'] }) },
    )

    expect(response.status).toBe(201)
    expect(seen).toEqual([{ slug: ['form-submissions'] }])
  })

  it('a keret felett 429 — a becsomagolt handler EL SEM INDUL', async () => {
    const limiter = new SlidingWindowRateLimiter()
    let calls = 0
    const inner: PayloadRestHandler = async () => {
      calls += 1
      return Response.json({ ok: true }, { status: 201 })
    }
    const handler = withPayloadRestRateLimit(inner, { limiter, rules })
    const send = () =>
      handler(
        makeRequest('https://kineticare.test/api/form-submissions', { ip: '203.0.113.12' }),
        { params: Promise.resolve({ slug: ['form-submissions'] }) },
      )

    expect((await send()).status).toBe(201)
    expect((await send()).status).toBe(201)

    const throttled = await send()
    expect(throttled.status).toBe(429)
    expect(calls).toBe(2)
    expect(Number(throttled.headers.get('Retry-After'))).toBeGreaterThan(0)

    // Payload-alakú hibatörzs — ezt olvassa ki az auth-client és a kapcsolat-űrlap.
    const body = (await throttled.json()) as { errors: Array<{ message: string }> }
    expect(body.errors[0]?.message).toBe(RATE_LIMIT_MESSAGE)
  })

  it('a nem korlátozott POST-ok érintetlenül haladnak át', async () => {
    const limiter = new SlidingWindowRateLimiter()
    const inner: PayloadRestHandler = async () => Response.json({ ok: true }, { status: 200 })
    const handler = withPayloadRestRateLimit(inner, { limiter, rules })

    for (let index = 0; index < 50; index += 1) {
      const response = await handler(
        makeRequest('https://kineticare.test/api/users/login', { ip: '203.0.113.13' }),
        { params: Promise.resolve({ slug: ['users', 'login'] }) },
      )
      expect(response.status).toBe(200)
    }
  })
})

describe('payloadRestRateLimitResponse — a 429 válasz alakja', () => {
  it('429, magyar üzenet, Retry-After fejléc', async () => {
    const response = payloadRestRateLimitResponse({
      routeClass: 'registration',
      message: RATE_LIMIT_MESSAGE,
      retryAfterSeconds: 120,
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('120')
    expect(await response.json()).toEqual({ errors: [{ message: RATE_LIMIT_MESSAGE }] })
  })
})
