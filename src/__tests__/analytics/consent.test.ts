import { describe, expect, it, vi } from 'vitest'

import {
  CONSENT_DENIED,
  CONSENT_EVENT,
  CONSENT_GRANTED,
  CONSENT_STORAGE_KEY,
  CONSENT_UNKNOWN,
  consentStateFromEvent,
  dispatchConsentEvent,
  parseConsentState,
  readConsent,
  updateConsent,
  writeConsent,
  type ConsentEventDetail,
  type ConsentReader,
  type ConsentWriter,
} from '../../lib/analytics/consent'

/**
 * Consent-állapotgép egységtesztek — node-környezetben, injektált
 * (Map-alapú) tárolóval és mockolt eseménycélral, böngésző-API nélkül.
 */

/** Map-alapú localStorage-mock (getItem/setItem/removeItem). */
function memoryStorage(initial?: Record<string, string>): ConsentReader & ConsentWriter {
  const map = new Map<string, string>(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) ?? null) : null),
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

describe('readConsent', () => {
  it("üres tároló → 'unknown' (a látogató még nem döntött)", () => {
    expect(readConsent(memoryStorage())).toBe('unknown')
  })

  it("tárolt 'granted'/'denied' értéket hűen ad vissza", () => {
    expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: 'granted' }))).toBe('granted')
    expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: 'denied' }))).toBe('denied')
  })

  it("ismeretlen/sérült tárolt érték → 'unknown' (sosem engedélyezünk vakon)", () => {
    expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: 'igen' }))).toBe('unknown')
    expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: '' }))).toBe('unknown')
    expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: 'GRANTED' }))).toBe('unknown')
  })

  it("tárolási hiba (letiltott tárhely) → 'unknown', nem dob", () => {
    const broken: ConsentReader = {
      getItem: () => {
        throw new Error('storage tiltva')
      },
    }
    expect(readConsent(broken)).toBe('unknown')
  })

  it("tároló nélkül (SSR-szimuláció) → 'unknown'", () => {
    // Node-környezetben nincs window → az alapértelmezett feloldás undefined.
    expect(readConsent()).toBe('unknown')
  })
})

describe('writeConsent / roundtrip', () => {
  it("'granted' írása és visszaolvasása roundtrip", () => {
    const storage = memoryStorage()
    expect(writeConsent(CONSENT_GRANTED, storage)).toBe(true)
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(readConsent(storage)).toBe('granted')
  })

  it("'denied' írása és visszaolvasása roundtrip", () => {
    const storage = memoryStorage()
    expect(writeConsent(CONSENT_DENIED, storage)).toBe(true)
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBe('denied')
    expect(readConsent(storage)).toBe('denied')
  })

  it("'unknown' írása TÖRLI a kulcsot (vissza nem-döntött állapotba)", () => {
    const storage = memoryStorage({ [CONSENT_STORAGE_KEY]: 'granted' })
    expect(writeConsent(CONSENT_UNKNOWN, storage)).toBe(true)
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    expect(readConsent(storage)).toBe('unknown')
  })

  it('írási hiba esetén false-szal tér viss, nem dob', () => {
    const broken: ConsentWriter = {
      setItem: () => {
        throw new Error('kvóta')
      },
      removeItem: () => {
        throw new Error('kvóta')
      },
    }
    expect(writeConsent(CONSENT_GRANTED, broken)).toBe(false)
  })
})

describe('parseConsentState', () => {
  it('csak a pontos literálok érvényesek', () => {
    expect(parseConsentState('granted')).toBe('granted')
    expect(parseConsentState('denied')).toBe('denied')
    expect(parseConsentState(null)).toBe('unknown')
    expect(parseConsentState('bármi-más')).toBe('unknown')
  })
})

describe('dispatchConsentEvent', () => {
  it("CustomEventet szór 'kc:analytics-consent' néven, detail.state-tel", () => {
    const dispatchEvent = vi.fn<(event: Event) => boolean>(() => true)
    const ok = dispatchConsentEvent('granted', { dispatchEvent })

    expect(ok).toBe(true)
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<ConsentEventDetail>
    expect(event.type).toBe(CONSENT_EVENT)
    expect(event.detail).toEqual({ state: 'granted' })
  })

  it('cél nélkül (SSR-szimuláció) no-op, false-szal tér viss', () => {
    // Node-környezetben nincs window → nincs alapértelmezett cél.
    expect(dispatchConsentEvent('granted')).toBe(false)
  })

  it('consentStateFromEvent a detail.state-t adja vissza, hiányában unknown-t', () => {
    const withDetail = new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, {
      detail: { state: 'denied' },
    })
    expect(consentStateFromEvent(withDetail)).toBe('denied')
    expect(consentStateFromEvent(new Event(CONSENT_EVENT))).toBe('unknown')
  })
})

describe('updateConsent (tárolás + esemény egyben)', () => {
  it('írja a tárolót ÉS kiszórja az eseményt', () => {
    const storage = memoryStorage()
    const dispatchEvent = vi.fn<(event: Event) => boolean>(() => true)

    expect(updateConsent('granted', storage, { dispatchEvent })).toBe(true)
    expect(readConsent(storage)).toBe('granted')
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<ConsentEventDetail>
    expect(event.type).toBe(CONSENT_EVENT)
    expect(event.detail.state).toBe('granted')
  })
})
