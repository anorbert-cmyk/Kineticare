import { describe, expect, it, vi } from 'vitest'

import type { Logger } from '../lib/logger'
import {
  checkRateLimit,
  createRateLimiter,
  getNamedRateLimiter,
  ipRateLimitKey,
  RATE_LIMIT_MESSAGE,
  UNKNOWN_IP_BUCKET_KEY,
} from '../lib/rate-limit'

/**
 * Rate-limiter mag egységtesztek — injektált órával (now), időzítő nélkül
 * (cleanupIntervalMs: 0), így az ablakcsúszás, a retryAfter, a takarítás és a
 * memória-plafon determinisztikusan vizsgálható.
 */

/** Kézi óra: a teszt lépteti az időt. */
function createManualClock(start = 1_000_000) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

function createTestLimiter(overrides: Partial<Parameters<typeof createRateLimiter>[0]> = {}) {
  const clock = createManualClock()
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 3,
    cleanupIntervalMs: 0,
    now: clock.now,
    ...overrides,
  })
  return { limiter, clock }
}

function createFakeLogger() {
  const warn = vi.fn()
  const log: Logger = {
    debug: () => {},
    info: () => {},
    warn: (msg, context) => warn(msg, context),
    error: () => {},
    child: () => log,
  }
  return { log, warn }
}

describe('createRateLimiter — csúszóablak-mag', () => {
  it('a limit alatt enged, a max+1. kérést elutasítja', () => {
    const { limiter } = createTestLimiter()
    expect(limiter.consume('a')).toEqual({ allowed: true, retryAfterSec: 0 })
    expect(limiter.consume('a')).toEqual({ allowed: true, retryAfterSec: 0 })
    expect(limiter.consume('a')).toEqual({ allowed: true, retryAfterSec: 0 })

    const denied = limiter.consume('a')
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1)
  })

  it('kulcsonként független a számláló', () => {
    const { limiter } = createTestLimiter({ max: 1 })
    expect(limiter.consume('a').allowed).toBe(true)
    expect(limiter.consume('b').allowed).toBe(true)
    expect(limiter.consume('a').allowed).toBe(false)
    expect(limiter.consume('b').allowed).toBe(false)
  })

  it('az ablak csúszik: a legrégebbi találat kiesése után ismét enged', () => {
    const { limiter, clock } = createTestLimiter({ max: 2, windowMs: 60_000 })
    expect(limiter.consume('a').allowed).toBe(true) // t=0
    clock.advance(30_000)
    expect(limiter.consume('a').allowed).toBe(true) // t=30s
    expect(limiter.consume('a').allowed).toBe(false) // ablak: [0s, 30s]

    clock.advance(30_001) // t=60,001s → a 0s-es találat kiesett
    expect(limiter.consume('a').allowed).toBe(true)
  })

  it('retryAfterSec: a legrégebbi ablakbeli találat kieséséig hátralévő idő (felfelé kerekítve)', () => {
    const { limiter, clock } = createTestLimiter({ max: 1, windowMs: 60_000 })
    expect(limiter.consume('a').allowed).toBe(true) // t=0

    clock.advance(45_000) // t=45s → a találat t=60s-nél esik ki
    const denied = limiter.consume('a')
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfterSec).toBe(15)

    clock.advance(14_600) // t=59,6s → 0,4s van hátra → felfelé 1
    const almost = limiter.consume('a')
    expect(almost.allowed).toBe(false)
    expect(almost.retryAfterSec).toBe(1)
  })

  it('elutasítás NEM növeli a számlálót (a retryAfter nem húzódik ki)', () => {
    const { limiter, clock } = createTestLimiter({ max: 1, windowMs: 60_000 })
    expect(limiter.consume('a').allowed).toBe(true)
    const first = limiter.consume('a')
    const second = limiter.consume('a')
    expect(first.retryAfterSec).toBe(60)
    expect(second.retryAfterSec).toBe(60)

    clock.advance(60_001)
    expect(limiter.consume('a').allowed).toBe(true)
  })

  it('cleanup: a lejárt kulcsok törlődnek, az aktívak megmaradnak', () => {
    const { limiter, clock } = createTestLimiter({ windowMs: 60_000 })
    limiter.consume('regi')
    clock.advance(61_000)
    limiter.consume('friss')
    expect(limiter.size).toBe(2)

    limiter.cleanup()
    expect(limiter.size).toBe(1)
    // A „regi" kulcs ablaka lenullázódott → újra teljes kerettel indul.
    expect(limiter.consume('regi').allowed).toBe(true)
  })

  it('maxKeys plafon: a legrégebben használt kulcs hullik ki, a memória korlátos', () => {
    const { limiter, clock } = createTestLimiter({ max: 1, maxKeys: 2 })
    expect(limiter.consume('elso').allowed).toBe(true)
    clock.advance(1_000)
    expect(limiter.consume('masodik').allowed).toBe(true)
    clock.advance(1_000)
    // Frissítjük az „elso" kulcsot (LRU: így a „masodik" a legrégebbi) — de
    // elutasítódik, mert a kerete még tele van. Az elutasítás is LRU-frissít.
    expect(limiter.consume('elso').allowed).toBe(false)

    expect(limiter.consume('harmadik').allowed).toBe(true) // kiszorítja „masodik"-at
    expect(limiter.size).toBe(2)
    // „masodik" kihullott → ablaka lenullázódott, ismét enged.
    expect(limiter.consume('masodik').allowed).toBe(true)
  })

  it('konfig-validáció: hibás windowMs/max esetén dob', () => {
    expect(() => createRateLimiter({ windowMs: 0, max: 1, cleanupIntervalMs: 0 })).toThrow()
    expect(() => createRateLimiter({ windowMs: 1000, max: 0, cleanupIntervalMs: 0 })).toThrow()
    expect(() => createRateLimiter({ windowMs: 1000, max: 1.5, cleanupIntervalMs: 0 })).toThrow()
  })

  it('dispose: a takarító-időzítő leállítható', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, cleanupIntervalMs: 1_000 })
    expect(() => limiter.dispose()).not.toThrow()
    expect(() => limiter.dispose()).not.toThrow() // idempotens
  })
})

describe('ipRateLimitKey', () => {
  it('cf-connecting-ip elsőbbséget élvez', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
    })
    expect(ipRateLimitKey(headers)).toBe('ip:203.0.113.7')
  })

  it('x-forwarded-for első elemét használja', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })
    expect(ipRateLimitKey(headers)).toBe('ip:198.51.100.1')
  })

  it('feloldhatatlan IP → közös bucket-kulcs (nem megkerülhető null-IP-vel)', () => {
    expect(ipRateLimitKey(new Headers())).toBe(UNKNOWN_IP_BUCKET_KEY)
    expect(ipRateLimitKey(undefined)).toBe(UNKNOWN_IP_BUCKET_KEY)
  })
})

describe('checkRateLimit — route-szintű segéd', () => {
  it('limit alatt null-t ad (a kérés átmehet)', () => {
    const { limiter } = createTestLimiter({ max: 1 })
    const { log, warn } = createFakeLogger()
    expect(checkRateLimit({ limiter, key: 'k', log })).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('limit felett 429: magyar üzenet + Retry-After fejléc + warn napló', async () => {
    const { limiter } = createTestLimiter({ max: 1 })
    const { log, warn } = createFakeLogger()
    limiter.consume('k')

    const response = checkRateLimit({ limiter, key: 'k', log })
    expect(response).not.toBeNull()
    expect(response!.status).toBe(429)
    const retryAfter = response!.headers.get('Retry-After')
    expect(retryAfter).toBe('60')

    const body = (await response!.json()) as { error: string; retryAfterSec: number }
    expect(body.error).toBe(RATE_LIMIT_MESSAGE)
    expect(body.retryAfterSec).toBe(60)

    expect(warn).toHaveBeenCalledOnce()
    const [msg, context] = warn.mock.calls[0] as [string, Record<string, unknown>]
    expect(msg).toContain('429')
    expect(context).toMatchObject({ key: 'k', retryAfterSec: 60 })
  })

  it('route-specifikus magyar üzenet felülírja az alapértelmezettet', async () => {
    const { limiter } = createTestLimiter({ max: 1 })
    const { log } = createFakeLogger()
    limiter.consume('k')

    const response = checkRateLimit({ limiter, key: 'k', log, message: 'Egyedi üzenet.' })
    const body = (await response!.json()) as { error: string }
    expect(body.error).toBe('Egyedi üzenet.')
  })
})

describe('getNamedRateLimiter — megosztott singletonok', () => {
  it('azonos név → azonos példány (HMR-biztos registry)', () => {
    expect(getNamedRateLimiter('refund')).toBe(getNamedRateLimiter('refund'))
  })

  it('külön név → külön példány, a RATE_LIMITS konfiggal', () => {
    const barion = getNamedRateLimiter('barionCallback')
    const checkout = getNamedRateLimiter('checkoutStart')
    expect(barion).not.toBe(checkout)
  })
})
