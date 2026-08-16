'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import {
  CONSENT_EVENT,
  CONSENT_OPEN_EVENT,
  consentBannerVisible,
  readConsent,
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

/** Kliens-pillanatkép: primitív string, tehát hivatkozás-stabil (nem ciklizál). */
function getConsentSnapshot(): ConsentState {
  return readConsent()
}

/**
 * Szerver- ÉS hidratálási pillanatkép: `null` = „még nem olvastuk a tárolót".
 * Ez tartja meg pontosan a korábbi viselkedést: a szerver és az első
 * kliens-render egyaránt semmit sem renderel, a tárolt érték csak a
 * hidratálás UTÁN kerül be — így a szerver- és kliens-HTML nem térhet el.
 */
function getServerConsentSnapshot(): ConsentState | null {
  return null
}

export function ConsentBanner() {
  // null = még nem olvastuk a tárolót (SSR + első kliens-render) → null render.
  const storedConsent = useSyncExternalStore<ConsentState | null>(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  )
  // A gombnyomás helyi döntése akkor is elrejti a sávot, ha a tárolóba írás
  // nem sikerült (letiltott localStorage) — a korábbi setConsent pontosan így
  // viselkedett, ezért marad meg külön állapotként.
  const [decision, setDecision] = useState<ConsentState | null>(null)
  // A footer „Süti-beállítások" gombjára történő újranyitás (GDPR visszavonási
  // út): döntés után is újra látható a sáv, amíg a látogató újra nem dönt.
  const [reopened, setReopened] = useState(false)
  const consent = decision ?? storedConsent
  const bannerRef = useRef<HTMLDivElement>(null)
  const visible = consentBannerVisible(consent, reopened)

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
