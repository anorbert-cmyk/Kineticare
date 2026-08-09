import { beforeEach, describe, expect, it } from 'vitest'

import { optionalAnalyticsEnvVars, requiredEnvVars } from '../../env'
import {
  applyConsentToGoogleAnalytics,
  browserGaRuntime,
  disableGoogleAnalytics,
  enableGoogleAnalytics,
  GA_TAG_MANAGER_ORIGIN,
  gaDisableFlag,
  gaScriptUrl,
  isGoogleAnalyticsConfigured,
  isGoogleAnalyticsLoaded,
  normalizeGaMeasurementId,
  resetGoogleAnalyticsForTests,
  type GaGlobalScope,
  type GaRuntime,
} from '../../lib/analytics/ga4'

/**
 * GA4-integráció egységtesztek — node-környezetben, injektált
 * futtatókörnyezettel (memóriabeli globális névtér + betöltés-napló), valódi
 * böngésző-API és hálózat nélkül. A vizsgált szerződés: a gtag.js KIZÁRÓLAG
 * 'granted' consent után tölthet be, visszavonásra leáll, azonosító nélkül
 * pedig minden néma no-op.
 *
 * A tesztekben használt mérési azonosító kitalált, nyilvános formátumú
 * kliens-azonosító (a GA4 mérési id minden GA-t használó oldal HTML-jében
 * benne van) — NEM titok és nem tartozik semmilyen valós fiókhoz.
 */

const TEST_MEASUREMENT_ID = 'G-TESTONLY00'

interface TestRuntime {
  runtime: GaRuntime
  globals: GaGlobalScope
  /** A betöltésre kért script-URL-ek, hívási sorrendben. */
  loaded: string[]
  /** A dataLayerbe sorolt gtag-parancsok tömb-alakban (olvashatóság végett). */
  commands(): unknown[][]
  /** A dataLayer nyers elemei (az `arguments`-alak ellenőrzéséhez). */
  rawCommands(): unknown[]
}

function testRuntime(measurementId: string = TEST_MEASUREMENT_ID): TestRuntime {
  const globals: GaGlobalScope = {}
  const loaded: string[] = []
  const rawCommands = (): unknown[] =>
    Array.isArray(globals.dataLayer) ? (globals.dataLayer as unknown[]) : []
  return {
    runtime: {
      measurementId,
      globals,
      loadScript(src: string): void {
        loaded.push(src)
      },
    },
    globals,
    loaded,
    commands: () => rawCommands().map((entry) => Array.from(entry as ArrayLike<unknown>)),
    rawCommands,
  }
}

/** Egy adott gtag-parancs előfordulásai (pl. 'consent' + 'update'). */
function commandsMatching(all: unknown[][], ...prefix: unknown[]): unknown[][] {
  return all.filter((entry) => prefix.every((value, index) => entry[index] === value))
}

beforeEach(() => {
  resetGoogleAnalyticsForTests()
})

describe('normalizeGaMeasurementId', () => {
  it('érvényes azonosítót elfogad, a kisbetűset normalizálja', () => {
    expect(normalizeGaMeasurementId(TEST_MEASUREMENT_ID)).toBe(TEST_MEASUREMENT_ID)
    expect(normalizeGaMeasurementId(`  ${TEST_MEASUREMENT_ID}  `)).toBe(TEST_MEASUREMENT_ID)
    expect(normalizeGaMeasurementId(TEST_MEASUREMENT_ID.toLowerCase())).toBe(TEST_MEASUREMENT_ID)
  })

  it('hiányzó vagy üres értékre üres stringet ad (→ néma no-op)', () => {
    expect(normalizeGaMeasurementId(undefined)).toBe('')
    expect(normalizeGaMeasurementId('')).toBe('')
    expect(normalizeGaMeasurementId('   ')).toBe('')
  })

  it('formailag hibás vagy gyanús értéket elutasít (URL-/globális-név-injekció ellen)', () => {
    for (const invalid of [
      'UA-12345-1',
      'G-',
      'G-AB',
      'GTM-ABCDEF',
      'G-ABC123&id=G-MASIK',
      'G-ABC123?x=1',
      'G-ABC 123',
      'G-ABC/../evil',
      '<script>',
    ]) {
      expect(normalizeGaMeasurementId(invalid), invalid).toBe('')
    }
  })
})

describe('gaScriptUrl / gaDisableFlag', () => {
  it('a gtag.js a googletagmanager hostról, a mérési azonosítóval töltődik', () => {
    expect(gaScriptUrl(TEST_MEASUREMENT_ID)).toBe(
      `${GA_TAG_MANAGER_ORIGIN}/gtag/js?id=${TEST_MEASUREMENT_ID}`,
    )
    expect(GA_TAG_MANAGER_ORIGIN).toBe('https://www.googletagmanager.com')
  })

  it('a leállító kapcsoló a Google által dokumentált `ga-disable-<ID>` név', () => {
    expect(gaDisableFlag(TEST_MEASUREMENT_ID)).toBe(`ga-disable-${TEST_MEASUREMENT_ID}`)
  })
})

describe('környezeti kulcs nélkül minden no-op', () => {
  it('a munkatérben nincs NEXT_PUBLIC_GA_MEASUREMENT_ID → nincs konfigurálva', () => {
    // A NEXT_PUBLIC_* env build-időben kerül a bundle-be; a tesztkörnyezetben üres.
    expect(isGoogleAnalyticsConfigured()).toBe(false)
  })

  it('szerveren (nincs window) nincs futtatókörnyezet → nem tölt be, nem dob', () => {
    expect(browserGaRuntime()).toBeUndefined()
    expect(enableGoogleAnalytics()).toBe(false)
    expect(() => disableGoogleAnalytics()).not.toThrow()
    expect(isGoogleAnalyticsLoaded()).toBe(false)
  })

  it('üres azonosítójú futtatókörnyezet: se script, se dataLayer, se kapcsoló', () => {
    const harness = testRuntime('')
    expect(enableGoogleAnalytics(harness.runtime)).toBe(false)
    disableGoogleAnalytics(harness.runtime)

    expect(harness.loaded).toEqual([])
    expect(harness.globals.dataLayer).toBeUndefined()
    expect(Object.keys(harness.globals)).toEqual([])
    expect(isGoogleAnalyticsLoaded()).toBe(false)
  })

  it('formailag hibás azonosító ugyanúgy no-op (nem tölt be félkész URL-t)', () => {
    const harness = testRuntime('UA-12345-1')
    expect(enableGoogleAnalytics(harness.runtime)).toBe(false)
    expect(harness.loaded).toEqual([])
    expect(isGoogleAnalyticsLoaded()).toBe(false)
  })
})

describe('consent-kapu: a gtag.js CSAK granted után tölt be', () => {
  it("'unknown' (még nem döntött): semmi nem történik", () => {
    const harness = testRuntime()
    applyConsentToGoogleAnalytics('unknown', harness.runtime)

    expect(harness.loaded).toEqual([])
    expect(harness.globals.dataLayer).toBeUndefined()
    // Kapcsolót sem állítunk: a látogató még nem utasított el.
    expect(Object.keys(harness.globals)).toEqual([])
  })

  it("'denied': nincs betöltés, és a leállító kapcsoló előre bekapcsol", () => {
    const harness = testRuntime()
    applyConsentToGoogleAnalytics('denied', harness.runtime)

    expect(harness.loaded).toEqual([])
    expect(isGoogleAnalyticsLoaded()).toBe(false)
    expect(harness.globals[gaDisableFlag(TEST_MEASUREMENT_ID)]).toBe(true)
    // Elutasító látogatónál nem hozunk létre dataLayert a semmiért.
    expect(harness.globals.dataLayer).toBeUndefined()
  })

  it("'granted': betölti a gtag.js-t, és feloldja a leállító kapcsolót", () => {
    const harness = testRuntime()
    applyConsentToGoogleAnalytics('granted', harness.runtime)

    expect(harness.loaded).toEqual([gaScriptUrl(TEST_MEASUREMENT_ID)])
    expect(isGoogleAnalyticsLoaded()).toBe(true)
    expect(harness.globals[gaDisableFlag(TEST_MEASUREMENT_ID)]).toBe(false)
  })

  it('ismételt granted nem tölt be másodszor (idempotens)', () => {
    const harness = testRuntime()
    applyConsentToGoogleAnalytics('granted', harness.runtime)
    applyConsentToGoogleAnalytics('granted', harness.runtime)

    expect(harness.loaded).toHaveLength(1)
    expect(commandsMatching(harness.commands(), 'config')).toHaveLength(1)
  })
})

describe('Consent Mode parancs-sorrend', () => {
  it('az ELSŐ parancs a `consent default` minden tárolóra denied', () => {
    const harness = testRuntime()
    enableGoogleAnalytics(harness.runtime)

    const [first] = harness.commands()
    expect(first[0]).toBe('consent')
    expect(first[1]).toBe('default')
    expect(first[2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    })
  })

  it('a default UTÁN jön a js-időbélyeg, az update granted, majd a config', () => {
    const harness = testRuntime()
    enableGoogleAnalytics(harness.runtime)
    const commands = harness.commands()

    expect(commands.map((entry) => entry[0])).toEqual(['consent', 'js', 'consent', 'config'])
    expect(commands[1][1]).toBeInstanceOf(Date)
    expect(commands[2]).toEqual(['consent', 'update', { analytics_storage: 'granted' }])
    expect(commands[3]).toEqual(['config', TEST_MEASUREMENT_ID])
  })

  it('a parancsok `arguments`-alakban kerülnek a dataLayerbe (tömbként a Google nem ismeri fel)', () => {
    const harness = testRuntime()
    enableGoogleAnalytics(harness.runtime)

    for (const entry of harness.rawCommands()) {
      expect(Array.isArray(entry)).toBe(false)
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]')
    }
  })

  it('a globális gtag() ugyanabba a sorba ír (konzolos ellenőrzéshez)', () => {
    const harness = testRuntime()
    enableGoogleAnalytics(harness.runtime)

    const gtag = harness.globals.gtag
    expect(typeof gtag).toBe('function')
    ;(gtag as (...args: unknown[]) => void)('event', 'proba')

    expect(harness.commands().at(-1)).toEqual(['event', 'proba'])
  })
})

describe('visszavonás (revoke) és újra-engedélyezés', () => {
  it('granted → denied: a mérés leáll (kapcsoló + Consent Mode denied)', () => {
    const harness = testRuntime()
    applyConsentToGoogleAnalytics('granted', harness.runtime)
    applyConsentToGoogleAnalytics('denied', harness.runtime)

    expect(harness.globals[gaDisableFlag(TEST_MEASUREMENT_ID)]).toBe(true)
    expect(harness.commands().at(-1)).toEqual([
      'consent',
      'update',
      { analytics_storage: 'denied' },
    ])
    // A script nem töltődik be újra, és nem is „vonható vissza" a betöltés.
    expect(harness.loaded).toHaveLength(1)
  })

  it('denied → granted újra: a kapcsoló feloldódik, de nincs második betöltés', () => {
    const harness = testRuntime()
    applyConsentToGoogleAnalytics('granted', harness.runtime)
    applyConsentToGoogleAnalytics('denied', harness.runtime)
    applyConsentToGoogleAnalytics('granted', harness.runtime)

    expect(harness.globals[gaDisableFlag(TEST_MEASUREMENT_ID)]).toBe(false)
    expect(harness.commands().at(-1)).toEqual([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ])
    expect(harness.loaded).toHaveLength(1)
    expect(commandsMatching(harness.commands(), 'config')).toHaveLength(1)
  })
})

describe('env-regiszter', () => {
  it('a GA4-azonosító OPCIONÁLIS: nem kötelező induláskori kulcs', () => {
    expect(optionalAnalyticsEnvVars).toContain('NEXT_PUBLIC_GA_MEASUREMENT_ID')
    for (const key of optionalAnalyticsEnvVars) {
      expect(requiredEnvVars, key).not.toContain(key)
    }
  })
})
