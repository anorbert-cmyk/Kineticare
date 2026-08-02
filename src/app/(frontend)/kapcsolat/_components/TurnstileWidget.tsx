'use client'

import Script from 'next/script'
import { useCallback, useRef, useState } from 'react'

/**
 * TurnstileWidget — Cloudflare Turnstile spam-ellenőrző widget (T-016).
 *
 * Csak akkor kerül a DOM-ba, ha a TURNSTILE_SITE_KEY be van állítva (ezt a
 * szerver-oldali page dönti el, és a ContactForm csak ekkor rendereli ezt a
 * komponenst). Kulcs nélkül a spam-védelem a szerveren is inaktív — ilyenkor
 * a widget rejtve marad, a beküldés akadálytalan.
 *
 * Nulla extra függőség: a hivatalos api.js-t next/script-tel töltjük, és a
 * window.turnstile.render explicit módját használjuk (managed mód).
 */

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
      language?: string
    },
  ) => string
  reset: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export interface TurnstileWidgetProps {
  siteKey: string
  /** Sikeres ellenőrzéskor kapjuk a tokent (a beküldéshez). */
  onToken: (token: string | null) => void
}

export function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptFailed, setScriptFailed] = useState(false)

  const renderWidget = useCallback(() => {
    const container = containerRef.current
    if (!container || !window.turnstile || widgetIdRef.current !== null) {
      return
    }
    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: siteKey,
      callback: (token) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
      language: 'hu',
    })
  }, [siteKey, onToken])

  if (scriptFailed) {
    return (
      <p className="kc-contact-form__turnstile-error" role="alert">
        A spam-ellenőrzés betöltése nem sikerült. Frissítsd az oldalt, vagy próbáld később.
      </p>
    )
  }

  return (
    <>
      <Script
        onError={() => {
          setScriptFailed(true)
          onToken(null)
        }}
        onLoad={renderWidget}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div className="kc-contact-form__turnstile" ref={containerRef} />
    </>
  )
}
