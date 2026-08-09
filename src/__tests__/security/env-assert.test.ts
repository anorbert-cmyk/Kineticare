import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assertRequiredEnv, requiredEnvVars, turnstileEnvPair } from '../../env'

/**
 * Induláskori ENV-assert (src/env.ts) — a `register()` (src/instrumentation.ts)
 * ezt futtatja a szerver indulásakor.
 *
 * A HANGSÚLY a Turnstile-kulcspáron van: a `TURNSTILE_SECRET_KEY` hiánya ma
 * CSENDBEN kapcsolja ki a kapcsolat-űrlap spam-védelmét (a `verifyTurnstile`
 * kulcs nélkül korán visszatér, src/payload.config.ts). Élesben ezért a pár
 * KONZISZTENCIÁJA kötelező: fél-lábas konfiguráció (csak site key vagy csak
 * secret) megakasztja az indulást, teljes hiány viszont — amíg a Turnstile
 * nincs élesítve — warn-riasztással átengedett, hogy a deploy ne törjön el.
 * Fejlesztésben/tesztben minden változatlanul opcionális, hogy
 * Cloudflare-fiók nélkül is fusson a projekt.
 *
 * A környezetet a `vi.stubEnv` állítja (a `NODE_ENV` típusa csak írható így),
 * és az `afterEach` mindent visszaállít. A teszt SEHOL nem használ valódi
 * titkot: minden érték egyértelműen DUMMY.
 */

const DUMMY_ENV_VALUE = 'DUMMY-42'
const [SITE_KEY_ENV, SECRET_KEY_ENV] = turnstileEnvPair

beforeEach(() => {
  // Minden „minden környezetben kötelező" kulcs kitöltve — így a tesztek
  // kizárólag a vizsgált kulcs hiányán bukhatnak el.
  for (const key of requiredEnvVars) {
    vi.stubEnv(key, DUMMY_ENV_VALUE)
  }
  vi.stubEnv('BARION_ENVIRONMENT', undefined)
  vi.stubEnv('BARION_POSKEY_TEST', DUMMY_ENV_VALUE)
  vi.stubEnv('BARION_POSKEY_PROD', undefined)
  vi.stubEnv(SITE_KEY_ENV, undefined)
  vi.stubEnv(SECRET_KEY_ENV, undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('assertRequiredEnv — minden környezetben kötelező kulcsok', () => {
  it('hiánytalan környezetben nem dob', () => {
    vi.stubEnv('NODE_ENV', 'test')

    expect(() => assertRequiredEnv()).not.toThrow()
  })

  it('hiányzó alapkulcsot magyar üzenetben, néven nevezve jelez', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URI', undefined)

    expect(() => assertRequiredEnv()).toThrowError(/DATABASE_URI/)
    expect(() => assertRequiredEnv()).toThrowError(/nem indulhat el/)
  })
})

describe('assertRequiredEnv — Turnstile-kulcspár konzisztenciája', () => {
  it('a Turnstile-kulcsok nem alapkulcsok (fejlesztés Cloudflare-fiók nélkül is fut)', () => {
    expect(requiredEnvVars as readonly string[]).not.toContain(SITE_KEY_ENV)
    expect(requiredEnvVars as readonly string[]).not.toContain(SECRET_KEY_ENV)
  })

  it('NEM production: semmilyen kombináció nem akasztja meg az indulást', () => {
    for (const nodeEnv of ['development', 'test']) {
      vi.stubEnv('NODE_ENV', nodeEnv)

      vi.stubEnv(SITE_KEY_ENV, undefined)
      vi.stubEnv(SECRET_KEY_ENV, undefined)
      expect(() => assertRequiredEnv(), `${nodeEnv}: egyik sincs`).not.toThrow()

      vi.stubEnv(SITE_KEY_ENV, DUMMY_ENV_VALUE)
      expect(() => assertRequiredEnv(), `${nodeEnv}: csak site key`).not.toThrow()

      vi.stubEnv(SITE_KEY_ENV, undefined)
      vi.stubEnv(SECRET_KEY_ENV, DUMMY_ENV_VALUE)
      expect(() => assertRequiredEnv(), `${nodeEnv}: csak secret`).not.toThrow()
    }
  })

  it('PRODUCTION: csak site key (secret nélkül) → nem indul, néven nevezett magyar hibával', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(SITE_KEY_ENV, DUMMY_ENV_VALUE)

    expect(() => assertRequiredEnv()).toThrowError(/TURNSTILE_SITE_KEY/)
    expect(() => assertRequiredEnv()).toThrowError(/nem indulhat el/)
  })

  it('PRODUCTION: csak secret (site key nélkül) → nem indul', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(SECRET_KEY_ENV, DUMMY_ENV_VALUE)

    expect(() => assertRequiredEnv()).toThrowError(/TURNSTILE_SECRET_KEY/)
  })

  it('PRODUCTION: az üres/whitespace érték is hiánynak számít a párellenőrzésben', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(SITE_KEY_ENV, DUMMY_ENV_VALUE)
    vi.stubEnv(SECRET_KEY_ENV, '   ')

    expect(() => assertRequiredEnv()).toThrowError(/TURNSTILE_SITE_KEY/)
  })

  it('PRODUCTION: egyik kulcs sincs → elindul, de warn-riasztás megy a hívónak', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.fn()

    expect(() => assertRequiredEnv(warn)).not.toThrow()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toBe('turnstile_kikapcsolva')
  })

  it('PRODUCTION: egyik kulcs sincs és nincs warn-callback → akkor sem dob', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(() => assertRequiredEnv()).not.toThrow()
  })

  it('PRODUCTION: mindkét kulcs kitöltve → elindul, warn nélkül', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(SITE_KEY_ENV, DUMMY_ENV_VALUE)
    vi.stubEnv(SECRET_KEY_ENV, DUMMY_ENV_VALUE)
    const warn = vi.fn()

    expect(() => assertRequiredEnv(warn)).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it('NEM production: fél-lábas konfigurációnál warn sem megy (csak éles gondoskodás)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv(SITE_KEY_ENV, DUMMY_ENV_VALUE)
    const warn = vi.fn()

    expect(() => assertRequiredEnv(warn)).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('assertRequiredEnv — környezetfüggő Barion POSKey (változatlan viselkedés)', () => {
  it('teszt-környezetben a BARION_POSKEY_TEST kell', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('BARION_POSKEY_TEST', undefined)

    expect(() => assertRequiredEnv()).toThrowError(/BARION_POSKEY_TEST/)
  })

  it('BARION_ENVIRONMENT=prod esetén az éles kulcs kell', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('BARION_ENVIRONMENT', 'prod')

    expect(() => assertRequiredEnv()).toThrowError(/BARION_POSKEY_PROD/)
  })
})
