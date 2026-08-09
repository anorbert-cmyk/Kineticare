import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLogger } from '../../lib/logger'

/**
 * A logger redakciós szerződése (src/lib/logger.ts).
 *
 * A napló aggregátorba és mentésekbe kerül, ezért az érzékeny mezők értéke ott
 * SOSEM jelenhet meg. Az `email` azért került a listára, mert személyes adat
 * (GDPR): egy kiszivárgott naplóból a címzett-lista közvetlenül támadható
 * (célzott adathalászat, fiók-létezés megerősítése). Ahol a cím az
 * üzemeltetéshez tényleg kell, ott MASZKOLVA és más kulcsnéven megy
 * (`maskEmail` → pl. `cimzett`).
 */

let logSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  logSpy.mockRestore()
})

/** Az utolsó naplósor teljes JSON-je. */
function lastEntry(): Record<string, unknown> {
  const lastCall = logSpy.mock.calls.at(-1)
  return JSON.parse(String(lastCall?.[0])) as Record<string, unknown>
}

function lastContext(): Record<string, unknown> {
  return (lastEntry().context ?? {}) as Record<string, unknown>
}

describe('logger — az e-mail-cím redakciója', () => {
  it('a context `email` mezője [REDACTED]', () => {
    createLogger().info('teszt', { email: 'kiss.anna@example.com', userId: 7 })

    expect(lastContext()).toEqual({ email: '[REDACTED]', userId: 7 })
  })

  it('kis-nagybetűtől függetlenül fog (Email, EMAIL)', () => {
    createLogger().warn('teszt', { Email: 'kiss.anna@example.com' })
    expect(lastContext().Email).toBe('[REDACTED]')

    createLogger().warn('teszt', { EMAIL: 'kiss.anna@example.com' })
    expect(lastContext().EMAIL).toBe('[REDACTED]')
  })

  it('a beágyazott és tömbben lévő `email` is redaktálódik', () => {
    createLogger().error('teszt', {
      buyer: { nev: 'Kiss Anna', email: 'kiss.anna@example.com' },
      recipients: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
    })

    const context = lastContext()
    expect(JSON.stringify(context)).not.toContain('example.com')
    expect(context).toMatchObject({
      buyer: { nev: 'Kiss Anna', email: '[REDACTED]' },
      recipients: [{ email: '[REDACTED]' }, { email: '[REDACTED]' }],
    })
  })

  it('a child-loggerhez kötött mező is redaktálódik', () => {
    createLogger().child({ email: 'kiss.anna@example.com', requestId: 'req-1' }).info('teszt')

    const entry = lastEntry()
    expect(entry.email).toBe('[REDACTED]')
    expect(entry.requestId).toBe('req-1')
  })

  it('a MASZKOLT cím más kulcsnéven átmegy (üzemeltetéshez használható marad)', () => {
    createLogger().info('teszt', { cimzett: 'k***@example.com' })

    expect(lastContext().cimzett).toBe('k***@example.com')
  })

  it('a korábbi érzékeny kulcsok változatlanul redaktáltak', () => {
    // Egyértelműen DUMMY, rövid értékek — a teszt állítása az, hogy a KULCS
    // alapján redaktálunk, tehát az érték tartalma közömbös (CLAUDE.md #1).
    createLogger().info('teszt', {
      password: 'DUMMY-42',
      token: 'DUMMY-42',
      poskey: 'DUMMY-42',
      authorization: 'DUMMY-42',
    })

    expect(lastContext()).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      poskey: '[REDACTED]',
      authorization: '[REDACTED]',
    })
  })
})
