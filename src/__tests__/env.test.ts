import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assertRequiredEnv, requiredEnvVars } from '../env'

/**
 * ENV-assert tesztek — a TURNSTILE_SECRET_KEY production-kötelezősége
 * (a blackhat-review lezárása: élesben nem indulhat az app spam-védelem
 * nélkül; dev-ben/stagingen továbbra is opcionális).
 */

const ALL_KEYS = [
  ...requiredEnvVars,
  'BARION_POSKEY_TEST',
  'BARION_POSKEY_PROD',
  'BARION_ENVIRONMENT',
  'TURNSTILE_SECRET_KEY',
] as const

const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ALL_KEYS) {
    savedEnv[key] = process.env[key]
  }
  // Teljes, érvényes alapállapot: minden kötelező kulcs beállítva.
  for (const key of requiredEnvVars) {
    process.env[key] = 'teszt-ertek'
  }
  process.env.BARION_POSKEY_TEST = 'teszt-poskey'
  delete process.env.BARION_ENVIRONMENT
})

afterEach(() => {
  for (const key of ALL_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
  // A NODE_ENV-et a vi.stubEnv állítja (a process.env.NODE_ENV TS-ben read-only).
  vi.unstubAllEnvs()
})

describe('assertRequiredEnv — TURNSTILE_SECRET_KEY környezetfüggő kötelezősége', () => {
  it('production-ben hiányzó TURNSTILE_SECRET_KEY → indulási hiba (a kulcs nevével)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.TURNSTILE_SECRET_KEY

    expect(() => assertRequiredEnv()).toThrowError(/TURNSTILE_SECRET_KEY/)
  })

  it('production-ben üres TURNSTILE_SECRET_KEY → indulási hiba', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.TURNSTILE_SECRET_KEY = '   '

    expect(() => assertRequiredEnv()).toThrowError(/TURNSTILE_SECRET_KEY/)
  })

  it('production-ben beállított TURNSTILE_SECRET_KEY → az assert átmegy', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.TURNSTILE_SECRET_KEY = 'teszt-turnstile-secret'

    expect(() => assertRequiredEnv()).not.toThrow()
  })

  it('nem-production környezetben (dev/teszt) a TURNSTILE_SECRET_KEY opcionális marad', () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.TURNSTILE_SECRET_KEY
    expect(() => assertRequiredEnv()).not.toThrow()

    vi.stubEnv('NODE_ENV', 'test')
    expect(() => assertRequiredEnv()).not.toThrow()
  })

  it('a meglévő kötelező kulcsok ellenőrzése változatlan (hiányzó DATABASE_URI → hiba)', () => {
    vi.stubEnv('NODE_ENV', 'test')
    delete process.env.DATABASE_URI

    expect(() => assertRequiredEnv()).toThrowError(/DATABASE_URI/)
  })
})
