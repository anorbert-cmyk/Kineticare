'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'

import {
  CONSENT_EVENT,
  CONSENT_OPEN_EVENT,
  consentBannerVisible,
  readConsent,
  type ConsentState,
} from '@/lib/analytics/consent'
import { optInToAnalytics, optOutOfAnalytics } from '@/lib/analytics/posthog'

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
 */

const bannerStyle: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000, // a legmagasabb meglévő réteg (100) fölött
  backgroundColor: 'var(--kc-color-surface-dark)',
  color: 'var(--kc-color-on-dark)',
  padding: 'var(--kc-space-4) var(--kc-space-5)',
  boxShadow: '0 -2px 12px rgba(16, 36, 62, 0.35)',
}

const innerStyle: CSSProperties = {
  maxWidth: '1120px', // --kc-content-wide
  margin: '0 auto',
  display: 'flex',
  flexWrap: 'wrap', // mobilon a gombok a szöveg alá kerülnek
  alignItems: 'center',
  gap: 'var(--kc-space-3) var(--kc-space-5)',
}

const textStyle: CSSProperties = {
  flex: '1 1 32rem',
  margin: 0,
  fontSize: 'var(--kc-text-sm)',
  lineHeight: 'var(--kc-leading-body)',
}

const linkStyle: CSSProperties = {
  color: 'var(--kc-color-on-dark-muted)',
  textDecoration: 'underline',
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--kc-space-3)',
}

const buttonBaseStyle: CSSProperties = {
  font: 'inherit',
  fontWeight: 700, // --kc-font-weight-bold
  padding: 'var(--kc-space-2) var(--kc-space-5)',
  borderRadius: 'var(--kc-radius-md)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const acceptStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '2px solid var(--kc-color-on-dark)',
  backgroundColor: 'var(--kc-color-on-dark)',
  color: 'var(--kc-color-surface-dark)',
}

const declineStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '2px solid var(--kc-color-on-dark)',
  backgroundColor: 'transparent',
  color: 'var(--kc-color-on-dark)',
}

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

  if (!consentBannerVisible(consent, reopened)) {
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
    <div role="region" aria-label="Süti-hozzájárulás" style={bannerStyle}>
      <div style={innerStyle}>
        <p style={textStyle}>
          Sütiket használunk a felhasználói élmény javításához és a látogatottsági statisztikák
          készítéséhez. Az analitika csak a hozzájárulásával kapcsol be. Részletek az{' '}
          <Link href="/adatvedelem" style={linkStyle}>
            adatvédelmi tájékoztatóban
          </Link>
          .
        </p>
        <div style={actionsStyle}>
          <button type="button" onClick={onAccept} style={acceptStyle}>
            Elfogadom
          </button>
          <button type="button" onClick={onDecline} style={declineStyle}>
            Elutasítom
          </button>
        </div>
      </div>
    </div>
  )
}
