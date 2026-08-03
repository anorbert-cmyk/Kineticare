'use client'

import { useEffect, type ReactNode } from 'react'

import {
  CONSENT_EVENT,
  initPostHog,
  isPostHogConfigured,
  hasAnalyticsConsent,
} from '@/lib/analytics/posthog'

/**
 * PostHogProvider — a PostHog kliensoldali inicializálásának kapuja.
 *
 * - Kulcs nélkül: tiszta pass-through (az analitika kikapcsolt, a felület
 *   ettől függetlenül működik).
 * - CONSENT-FIRST: csak analytics-hozzájárulás esetén init; a consent-banner
 *   'kc:analytics-consent' eseményére később is bekapcsol (oldalfrissítés
 *   nélkül).
 * - Az oldalletöltést nem blokkolja (a posthog-js a bundle része, az init
 *   useEffect-ben, a festés után fut).
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isPostHogConfigured()) {
      return
    }
    initPostHog()

    const onConsent = (): void => {
      if (hasAnalyticsConsent()) {
        initPostHog()
      }
    }
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  return <>{children}</>
}
