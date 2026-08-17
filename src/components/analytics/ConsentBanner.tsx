'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { sendBarionConsent } from '@/lib/analytics/barion-consent'
import {
  CONSENT_DENIED,
  CONSENT_EVENT,
  CONSENT_GRANTED,
  CONSENT_OPEN_EVENT,
  CONSENT_UNKNOWN,
  consentBannerVisible,
  consentSnapshotStale,
  consentSnapshotState,
  consentStateFromEvent,
  readConsent,
  readConsentSnapshot,
  type ConsentSnapshot,
  type ConsentState,
} from '@/lib/analytics/consent'
import { optInToAnalytics, optOutOfAnalytics } from '@/lib/analytics/posthog'

import '../../app/(frontend)/styles/consent-banner.css'

/**
 * ConsentBanner — GDPR-kompatibilis analytics-hozzájárulás sáv.
 *
 * - 'unknown' (még nem döntött) állapotban látható, ÉS a footer
 *   „Süti-beállítások" gombjára ÚJRANYÍTHATÓ döntés után is (a GDPR-hez a
 *   hozzájárulás visszavonása ugyanolyan könnyű kell legyen, mint a megadása —
 *   a 'kc:analytics-consent-open' eseményre nyílik vissza).
 * - „Elfogadom" → opt_in (PostHog init + capture), „Elutasítom" → opt_out
 *   (a PostHog sosem inicializálódik) — oldalfrissítés nélkül.
 * - SSR/hidrálás-biztos: az első kliens-renderig null, így a szerver- és
 *   kliens-HTML nem tér el (a consent csak böngészőben olvasható).
 * - Visszafogott, a design-tokenekre épülő sötét sáv; nincs animáció
 *   (a prefers-reduced-motion így triviálisan tiszteletben tartva),
 *   mobilon a gombok a szöveg alá tördelnek (flex-wrap).
 *
 * ═══ AKADÁLYMENTESSÉG (2026-08-16, docs/gomb-kontraszt-audit.md B2 + B4) ═══
 * A stílus INLINE `style`-ból STÍLUSLAPRA költözött (styles/consent-banner.css),
 * mert az inline stílus nem tud `:focus-visible`-t leírni — pontosan ezért
 * maradt le a sávról a sötét felületek fókusz-felülírása, és kapott a két gomb
 * 2,87:1-es fókuszgyűrűt (1.4.11 + 2.4.7 bukás minden oldalon). A sáv a
 * lap egyetlen olyan sötét felülete volt, ami nem `.kc-section--dark`.
 *
 * ═══ IDŐSZAKOS ÚJRAKÉRDEZÉS (2026-08-17) ═══
 * A tárolt döntés LEJÁR (consent.ts · CONSENT_MAX_AGE_DAYS = 365 nap, az
 * indoklás forrásokkal ott áll), és a sáv ilyenkor magától visszatér — a
 * Barion hozzájáruláskezelési követelménye szerint a kezelőnek „minimum minden
 * 13. hónapban … meg kell jelennie az előzőleg mentett beállításokkal".
 * Ezért NEM üresen jön vissza: a szöveg megmondja, mi a jelenlegi beállítás
 * (a GOV.UK Design System süti-sáv mintájának megerősítő mondata ugyanezt
 * teszi: „You've accepted analytics cookies. You can change your cookie
 * settings at any time." — design-system.service.gov.uk/components/cookie-banner/).
 * A régi döntés a lejárat után is ÉRVÉNYBEN marad, amíg a látogató nem dönt
 * újra; a lejárat csak kérdez, nem von vissza.
 *
 * A mondat a MEGLÉVŐ bekezdésbe kerül, új CSS és új betűméret nélkül (a
 * kontraszt- és érintőcél-mérések így érvényben maradnak); a sáv magasabb
 * lesz tőle, de a 2.4.11-es eltolás MÉRT érték, tehát magától követi.
 *
 * ═══ BARION PIXEL HOZZÁJÁRULÁS-JELZÉS ═══
 * A döntés a Barion Pixelnek is kimegy (`bp('consent','grantConsent'|
 * 'rejectConsent')`) — a GoogleAnalytics.tsx mintájára: betöltéskor a TÁROLT
 * döntés, utána a 'kc:analytics-consent' esemény. Az ALAP pixelt ez NEM
 * érinti: az a csalásmegelőzés jogos érdekén hozzájárulás nélkül is fut, itt
 * csak a marketing célú FELHASZNÁLÁS engedélye/tiltása utazik.
 *
 * A sáv `position: fixed` a lap alján, ezért eltakarhatta a fókuszált elemet
 * (WCAG 2.2 SC 2.4.11 Focus Not Obscured, AA). Amíg látszik, a
 * dokumentumgyökér `kc-has-consent-banner` osztályt kap, és a MÉRT magasság a
 * `--kc-consent-offset` változóba kerül — ebből jön a `scroll-padding-bottom`
 * és a lap alsó térköze. Ugyanaz a minta, mint a `MobileBuyBar`
 * `kc-has-buybar`-ja, de MÉRÉSSEL, mert a sáv magassága a nézetablaktól és a
 * tördeléstől függ (mobilon 2–3 sor + két gomb).
 */

/** A dokumentumgyökér jelölése, amíg a sáv látszik (scroll-padding + térköz). */
const ROOT_CLASS = 'kc-has-consent-banner'
/** A sáv mért magassága — a stíluslap ebből számol (lásd consent-banner.css). */
const OFFSET_VAR = '--kc-consent-offset'

/**
 * A tárolt consent KÜLSŐ store-ként. A `kc:analytics-consent` esemény az
 * egyetlen írás-jelzés (az optIn/optOut szórja) — erre iratkozunk fel.
 */
function subscribeToConsent(onStoreChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onStoreChange)
  return () => window.removeEventListener(CONSENT_EVENT, onStoreChange)
}

/**
 * Kliens-pillanatkép: primitív string (`"<állapot>:<frissesség>"`), tehát
 * hivatkozás-stabil (nem ciklizál). A frissesség az újrakérdezési küszöbhöz
 * mért kor — ettől tér vissza a sáv magától.
 */
function getConsentSnapshot(): ConsentSnapshot {
  return readConsentSnapshot()
}

/**
 * Szerver- ÉS hidratálási pillanatkép: `null` = „még nem olvastuk a tárolót".
 * Ez tartja meg pontosan a korábbi viselkedést: a szerver és az első
 * kliens-render egyaránt semmit sem renderel, a tárolt érték csak a
 * hidratálás UTÁN kerül be — így a szerver- és kliens-HTML nem térhet el.
 */
function getServerConsentSnapshot(): ConsentSnapshot | null {
  return null
}

/**
 * A visszatérő sáv első mondata: mi a JELENLEGI beállítás, és miért kérdezünk
 * újra. Magázó hang, mert a sáv többi mondata is az (WCAG 3.2.4 — ugyanaz a
 * dolog ugyanúgy szólal meg); gondolatjel nélküli, natív magyar mondatok.
 * Döntés nélkül ('unknown') nincs mit mutatni — ilyenkor null.
 *
 * Azért EXPORTÁLT, mert így a szöveg viselkedése valódi teszttel őrizhető
 * (a repó tesztkörnyezete node, a sáv interakciója nem játszható le).
 */
export function jelenlegiBeallitasSzovege(
  consent: ConsentState | null,
  lejart: boolean,
): string | null {
  if (consent !== CONSENT_GRANTED && consent !== CONSENT_DENIED) {
    return null
  }
  const beallitas =
    consent === CONSENT_GRANTED ? 'elfogadta az analitikát' : 'elutasította az analitikát'
  if (lejart) {
    return `Jelenlegi beállítása: ${beallitas}. Évente egyszer rákérdezünk, hogy ez továbbra is így legyen.`
  }
  return `Jelenlegi beállítása: ${beallitas}. Alább módosíthatja.`
}

export function ConsentBanner() {
  // null = még nem olvastuk a tárolót (SSR + első kliens-render) → null render.
  const snapshot = useSyncExternalStore<ConsentSnapshot | null>(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  )
  const storedConsent: ConsentState | null =
    snapshot === null ? null : consentSnapshotState(snapshot)
  // Lejárt-e a tárolt döntés (kötelező időszakos újrakérdezés).
  const stale = snapshot !== null && consentSnapshotStale(snapshot)
  // A gombnyomás helyi döntése akkor is elrejti a sávot, ha a tárolóba írás
  // nem sikerült (letiltott localStorage) — a korábbi setConsent pontosan így
  // viselkedett, ezért marad meg külön állapotként.
  const [decision, setDecision] = useState<ConsentState | null>(null)
  // A footer „Süti-beállítások" gombjára történő újranyitás (GDPR visszavonási
  // út): döntés után is újra látható a sáv, amíg a látogató újra nem dönt.
  const [reopened, setReopened] = useState(false)
  const consent = decision ?? storedConsent
  const bannerRef = useRef<HTMLDivElement>(null)
  // A lejárat CSAK addig nyitja a sávot, amíg a látogató most nem döntött:
  // egy friss gombnyomás után a sávnak akkor is el kell tűnnie, ha a tárolóba
  // írás nem sikerült (letiltott localStorage → a pillanatkép lejárt marad).
  const visible = consentBannerVisible(consent, reopened, decision === null && stale)

  /**
   * A sáv TÉNYLEGES magasságának mérése (2.4.11). Fix érték itt nem elég: a
   * sáv 1–3 sorosra tördel a nézetablaktól, a betűmérettől és a fordítás
   * hosszától függően. A ResizeObserver az ablakméret-váltást és a
   * betűméret-változást is lekezeli; ha a böngésző nem ismeri, egyetlen
   * kezdeti mérés marad (a `scroll-padding` így is jobb, mint a semmi).
   */
  useEffect(() => {
    const root = document.documentElement
    const banner = bannerRef.current
    if (!visible || banner === null) {
      root.classList.remove(ROOT_CLASS)
      root.style.removeProperty(OFFSET_VAR)
      return
    }
    const measure = (): void => {
      root.style.setProperty(OFFSET_VAR, `${Math.ceil(banner.getBoundingClientRect().height)}px`)
    }
    root.classList.add(ROOT_CLASS)
    measure()
    if (typeof ResizeObserver !== 'function') {
      return () => {
        root.classList.remove(ROOT_CLASS)
        root.style.removeProperty(OFFSET_VAR)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(banner)
    return () => {
      observer.disconnect()
      root.classList.remove(ROOT_CLASS)
      root.style.removeProperty(OFFSET_VAR)
    }
  }, [visible])

  /**
   * A Barion Pixel FELHASZNÁLÁSI hozzájárulásának jelzése — a
   * GoogleAnalytics.tsx mintája: betöltéskor a TÁROLT döntés megy ki, utána a
   * 'kc:analytics-consent' esemény kapcsol át (elfogadás, elutasítás és a
   * későbbi módosítás egyaránt ezen az egy úton fut). Döntés nélkül
   * ('unknown') semmi nem megy ki, azonosító nélkül szintén semmi.
   * A lemondó függvény a pixel megjelenésére váró újrapróbálkozást állítja le.
   */
  useEffect(() => {
    let cancelBarionConsent = sendBarionConsent(readConsent())
    const onConsent = (event: Event): void => {
      const state = consentStateFromEvent(event)
      cancelBarionConsent()
      cancelBarionConsent = sendBarionConsent(state === CONSENT_UNKNOWN ? readConsent() : state)
    }
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent)
      cancelBarionConsent()
    }
  }, [])

  useEffect(() => {
    const onOpen = (): void => {
      // A korábbi helyi döntés-jelölést is töröljük, hogy a TÁROLT állapot
      // látszódjon kiindulásként, és a sáv biztosan megjelenjen.
      setDecision(null)
      setReopened(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  if (!visible) {
    return null
  }

  // A visszatérő sávon a KORÁBBI beállítás is látszik (Barion-követelmény:
  // „az előzőleg mentett beállításokkal"); első látogatáskor ez null.
  const jelenlegiBeallitas = jelenlegiBeallitasSzovege(consent, stale)

  const onAccept = (): void => {
    optInToAnalytics()
    setDecision('granted')
    setReopened(false)
  }

  const onDecline = (): void => {
    optOutOfAnalytics()
    setDecision('denied')
    setReopened(false)
  }

  return (
    <div aria-label="Süti-hozzájárulás" className="kc-consent-banner" ref={bannerRef} role="region">
      <div className="kc-consent-banner__inner">
        <p className="kc-consent-banner__text">
          {jelenlegiBeallitas === null ? null : `${jelenlegiBeallitas} `}
          Sütiket használunk a felhasználói élmény javításához és a látogatottsági statisztikák
          készítéséhez. Az analitika csak a hozzájárulásával kapcsol be. Részletek az{' '}
          <Link href="/adatvedelem">adatvédelmi tájékoztatóban</Link>.
        </p>
        <div className="kc-consent-banner__actions">
          <button
            className="kc-consent-banner__button kc-consent-banner__button--accept"
            onClick={onAccept}
            type="button"
          >
            Elfogadom
          </button>
          <button
            className="kc-consent-banner__button kc-consent-banner__button--decline"
            onClick={onDecline}
            type="button"
          >
            Elutasítom
          </button>
        </div>
      </div>
    </div>
  )
}
