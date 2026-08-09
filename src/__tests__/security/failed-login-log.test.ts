import { AuthenticationError, APIError, LockedAuth } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Users } from '../../collections/Users'

/**
 * A sikertelen bejelentkezés naplózása (afterError hook).
 *
 * A hook VISELKEDÉSE — mikor és mit naplóz — a szerződés: csak a `/login`
 * útvonal auth-hibáira szólal meg, jelszót sosem ír ki. A naplózott IP-nek a
 * kliens címének kell lennie: az `x-forwarded-for` teljes láncának naplózása
 * félrevezető, mert a saját proxy-rétegünk IP-jei is bekerülnek, és ugyanaz a
 * kliens kérésenként más értékkel jelenik meg — így a brute-force-gyanús
 * bejegyzések IP szerinti összevetése eltörik.
 */

type FailedLoginArgs = {
  error: Error
  req: {
    url?: string
    data?: Record<string, unknown>
    headers?: Headers
  }
}

const logFailedLogin = (Users.hooks?.afterError ?? [])[0] as unknown as (
  args: FailedLoginArgs,
) => void

/** A logger egy JSON-sort ír a console.log-ra — a teszt ezt olvassa vissza. */
let logSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  logSpy.mockRestore()
})

/** Az utolsó naplósor `context` objektuma, vagy undefined, ha nem volt naplózás. */
function loggedContext(): Record<string, unknown> | undefined {
  const lastCall = logSpy.mock.calls.at(-1)
  if (!lastCall) {
    return undefined
  }
  const entry = JSON.parse(String(lastCall[0])) as { context?: Record<string, unknown> }
  return entry.context
}

const loginRequest = (headers: Record<string, string>): FailedLoginArgs['req'] => ({
  url: 'https://kineticare.hu/api/users/login',
  data: { email: 'valaki@kineticare.test', password: 'titkos-jelszo' },
  headers: new Headers(headers),
})

describe('logFailedLogin — a naplózott IP', () => {
  it('az x-forwarded-for lánc első (kliens-) elemét naplózza, nem a teljes láncot', () => {
    logFailedLogin({
      error: new AuthenticationError(),
      req: loginRequest({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }),
    })

    expect(loggedContext()?.ip).toBe('203.0.113.7')
  })

  it('x-forwarded-for hiányában az x-real-ip fejlécre esik vissza', () => {
    logFailedLogin({
      error: new AuthenticationError(),
      req: loginRequest({ 'x-real-ip': '203.0.113.9' }),
    })

    expect(loggedContext()?.ip).toBe('203.0.113.9')
  })

  it('IP-fejléc nélkül „ismeretlen"', () => {
    logFailedLogin({ error: new AuthenticationError(), req: loginRequest({}) })

    expect(loggedContext()?.ip).toBe('ismeretlen')
  })
})

describe('logFailedLogin — változatlan hook-viselkedés', () => {
  it('hibás jelszónál naplóz, az indokkal — az e-mail REDAKTÁLVA', () => {
    logFailedLogin({
      error: new AuthenticationError(),
      req: loginRequest({ 'x-forwarded-for': '203.0.113.7' }),
    })

    expect(loggedContext()).toMatchObject({
      ip: '203.0.113.7',
      reason: 'hibás jelszó',
    })
  })

  /**
   * A hook ugyanúgy átadja az `email` mezőt a loggernek, mint eddig — a
   * kimenetből viszont a logger redact-listája (src/lib/logger.ts) veszi ki:
   * az e-mail-cím személyes adat, naplóaggregátorba és mentésekbe nem
   * kerülhet. A hook maga (auth-hook, CLAUDE.md 4. tilos zóna) ÉRINTETLEN.
   */
  it('a teljes e-mail-cím sosem kerül a naplóba (a logger redaktálja)', () => {
    logFailedLogin({
      error: new AuthenticationError(),
      req: loginRequest({ 'x-forwarded-for': '203.0.113.7' }),
    })

    expect(loggedContext()?.email).toBe('[REDACTED]')
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('valaki@kineticare.test')
  })

  it('zárolt fióknál a „zárolt fiók" indokot naplózza', () => {
    logFailedLogin({
      error: new LockedAuth(),
      req: loginRequest({ 'x-forwarded-for': '203.0.113.7' }),
    })

    expect(loggedContext()?.reason).toBe('zárolt fiók')
  })

  it('a jelszó sosem kerül a naplóba', () => {
    logFailedLogin({
      error: new AuthenticationError(),
      req: loginRequest({ 'x-forwarded-for': '203.0.113.7' }),
    })

    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('titkos-jelszo')
  })

  it('nem /login útvonalon hallgat', () => {
    logFailedLogin({
      error: new AuthenticationError(),
      req: { ...loginRequest({ 'x-forwarded-for': '203.0.113.7' }), url: '/api/users/me' },
    })

    expect(logSpy).not.toHaveBeenCalled()
  })

  it('nem auth-jellegű hibára hallgat', () => {
    logFailedLogin({
      error: new APIError('valami más hiba', 500),
      req: loginRequest({ 'x-forwarded-for': '203.0.113.7' }),
    })

    expect(logSpy).not.toHaveBeenCalled()
  })
})
