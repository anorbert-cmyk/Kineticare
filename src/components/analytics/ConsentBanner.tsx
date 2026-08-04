'use client'

import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'

import { readConsent, type ConsentState } from '@/lib/analytics/consent'
import { optInToAnalytics, optOutOfAnalytics } from '@/lib/analytics/posthog'

/**
 * ConsentBanner — GDPR-kompatibilis analytics-hozzájárulás sáv.
 *
 * - CSAK 'unknown' (még nem döntött) állapotban látható; döntés után
 *   végleg eltűnik (a tárolt consent a localStorage-ban él).
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
  backgroundColor: 'var(--kc-color-navy-900)',
  color: 'var(--kc-color-white)',
  padding: 'var(--kc-space-4) var(--kc-space-5)',
  boxShadow: '0 -2px 12px rgba(11, 36, 63, 0.35)',
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
  color: 'var(--kc-color-blue-200)',
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
  border: '2px solid var(--kc-color-white)',
  backgroundColor: 'var(--kc-color-white)',
  color: 'var(--kc-color-navy-900)',
}

const declineStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '2px solid var(--kc-color-blue-200)',
  backgroundColor: 'transparent',
  color: 'var(--kc-color-white)',
}

export function ConsentBanner() {
  // null = még nem olvastuk a tárolót (SSR + első kliens-render) → null render.
  const [consent, setConsent] = useState<ConsentState | null>(null)

  useEffect(() => {
    setConsent(readConsent())
  }, [])

  if (consent !== 'unknown') {
    return null
  }

  const onAccept = (): void => {
    optInToAnalytics()
    setConsent('granted')
  }

  const onDecline = (): void => {
    optOutOfAnalytics()
    setConsent('denied')
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
