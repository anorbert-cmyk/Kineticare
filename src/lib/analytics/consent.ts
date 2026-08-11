/**
 * Analytics-hozzájárulás (consent) — tiszta, DOM-független állapotgép.
 *
 * Ez az ALSÓ szint: a posthog.ts és a ConsentBanner is innen importál —
 * ez a modul viszont NEM importál a posthog.ts-ből (körmenti import TILOS),
 * így a tárolókulcs és az eseménynév EGYETLEN igazságforrása itt él.
 *
 * Állapotok:
 * - 'unknown'  — a látogató még nem döntött (a banner csak ekkor látszik,
 *               az analitika ilyenkor TILTOTT).
 * - 'granted'  — explicit hozzájárulás (opt-in; GDPR szerint csak ez
 *               engedélyezi a trackinget).
 * - 'denied'   — explicit elutasítás (a PostHog sosem inicializálódik).
 *
 * Minden függvény injektálható tárolóval/célral hívható → node-környezetben,
 * böngésző-API nélkül is egységtesztelhető. Tárolási hiba (pl. letiltott
 * sütik/tárhely) esetén a viselkedés konzervatív: olvasás 'unknown'-t ad,
 * írás false-szal tér viss — sosem engedélyezünk vakon.
 */

/** Analytics-hozzájárulás tároló-ablakkulcs (localStorage). */
export const CONSENT_STORAGE_KEY = 'kc_analytics_consent'

/** A consent-változást jelző window-esemény neve (a provider hallgat rá). */
export const CONSENT_EVENT = 'kc:analytics-consent'

/**
 * A consent-banner ÚJRANYITÁSÁT kérő window-esemény (GDPR visszavonási út):
 * a footer „Süti-beállítások" gombja szórja, a ConsentBanner erre nyílik újra
 * döntés UTÁN is. Tartalma nincs — a banner a tárolt állapotot olvassa.
 */
export const CONSENT_OPEN_EVENT = 'kc:analytics-consent-open'

/** A consent állapotgép lehetséges értékei. */
export type ConsentState = 'unknown' | 'granted' | 'denied'

export const CONSENT_GRANTED: ConsentState = 'granted'
export const CONSENT_DENIED: ConsentState = 'denied'
export const CONSENT_UNKNOWN: ConsentState = 'unknown'

/** A ConsentBanner által szórt esemény payloadja. */
export interface ConsentEventDetail {
  state: ConsentState
}

/** Olvasáshoz elég egy getItem-képes tároló (localStorage vagy mock). */
export type ConsentReader = Pick<Storage, 'getItem'>
/** Íráshoz setItem (+ 'unknown' állapotnál removeItem) kell. */
export type ConsentWriter = Pick<Storage, 'setItem' | 'removeItem'>
/** Eseményszóráshoz elég egy dispatchEvent-képes cél (window vagy mock). */
export type ConsentEventTarget = Pick<EventTarget, 'dispatchEvent'>

/** Tároló feloldása: injektált érték, kliens-oldali localStorage, vagy undefined (SSR/teszt). */
function resolveReader(storage?: ConsentReader): ConsentReader | undefined {
  if (storage) {
    return storage
  }
  return typeof window !== 'undefined' ? window.localStorage : undefined
}

function resolveWriter(storage?: ConsentWriter): ConsentWriter | undefined {
  if (storage) {
    return storage
  }
  return typeof window !== 'undefined' ? window.localStorage : undefined
}

/** Nyers string → ConsentState; bármi ismeretlen/sérült érték 'unknown'. */
export function parseConsentState(raw: string | null): ConsentState {
  if (raw === CONSENT_GRANTED) {
    return CONSENT_GRANTED
  }
  if (raw === CONSENT_DENIED) {
    return CONSENT_DENIED
  }
  return CONSENT_UNKNOWN
}

/**
 * A tárolt consent állapot beolvasása. Injektált tárolóval tesztelhető;
 * alapból a window.localStorage-ból olvas (szerveren/tárolóhiba esetén
 * 'unknown' — ilyenkor az analitika tiltva marad).
 */
export function readConsent(storage?: ConsentReader): ConsentState {
  const store = resolveReader(storage)
  if (!store) {
    return CONSENT_UNKNOWN
  }
  try {
    return parseConsentState(store.getItem(CONSENT_STORAGE_KEY))
  } catch {
    return CONSENT_UNKNOWN
  }
}

/**
 * A consent állapot tárolása. 'granted'/'denied' esetén a kulcs íródik,
 * 'unknown' esetén törlődik (visszaáll „még nem döntött" állapotba).
 * Visszatérés: sikerült-e az írás (tárolóhiba → false, de nem dob).
 */
export function writeConsent(state: ConsentState, storage?: ConsentWriter): boolean {
  const store = resolveWriter(storage)
  if (!store) {
    return false
  }
  try {
    if (state === CONSENT_UNKNOWN) {
      store.removeItem(CONSENT_STORAGE_KEY)
    } else {
      store.setItem(CONSENT_STORAGE_KEY, state)
    }
    return true
  } catch {
    return false
  }
}

/**
 * 'kc:analytics-consent' CustomEvent szórása — a PostHogProvider (és bármi
 * más érdekelt) erre reagál oldalfrissítés nélkül. Injektált céllal
 * node-ban is tesztelhető; cél nélkül (SSR) no-op, false-szal tér viss.
 */
export function dispatchConsentEvent(state: ConsentState, target?: ConsentEventTarget): boolean {
  const resolved =
    target ?? (typeof window !== 'undefined' ? (window as ConsentEventTarget) : undefined)
  if (!resolved || typeof CustomEvent === 'undefined') {
    return false
  }
  const event = new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, {
    detail: { state },
  })
  return resolved.dispatchEvent(event)
}

/** Eseményből kiolvasott állapot (a provider használja; hiányzó detail → újraolvasás helyett 'unknown'). */
export function consentStateFromEvent(event: Event): ConsentState {
  const detail = (event as CustomEvent<ConsentEventDetail>).detail
  if (detail && (detail.state === CONSENT_GRANTED || detail.state === CONSENT_DENIED)) {
    return detail.state
  }
  return CONSENT_UNKNOWN
}

/** Kényelmi egybefűzés: tárolás + eseményszórás egy lépésben. */
export function updateConsent(
  state: ConsentState,
  storage?: ConsentWriter,
  target?: ConsentEventTarget,
): boolean {
  const written = writeConsent(state, storage)
  dispatchConsentEvent(state, target)
  return written
}

/**
 * 'kc:analytics-consent-open' esemény szórása — a ConsentBanner újranyitását
 * kéri (a visszavonási/módosítási felület). Egyszerű Event (detail nélkül);
 * cél nélkül (SSR) no-op, false-szal tér vissza.
 */
export function dispatchConsentOpenEvent(target?: ConsentEventTarget): boolean {
  const resolved =
    target ?? (typeof window !== 'undefined' ? (window as ConsentEventTarget) : undefined)
  if (!resolved || typeof Event === 'undefined') {
    return false
  }
  return resolved.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
}

/**
 * A consent-banner láthatósági szabálya: 'unknown' állapotban VAGY explicit
 * újranyitásra (a footer „Süti-beállítások" gombja) látszik. `null` = a
 * tárolót még nem olvastuk (SSR/hidrálás) — ilyenkor csak az újranyitás
 * jelenítheti meg (az meg szintén csak kliens-oldali kattintásra igaz).
 */
export function consentBannerVisible(consent: ConsentState | null, reopened: boolean): boolean {
  return reopened || consent === CONSENT_UNKNOWN
}
