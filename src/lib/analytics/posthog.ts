import posthog from 'posthog-js'
import type { PostHogConfig } from 'posthog-js'

/**
 * PostHog-integráció — központi konfig és esemény-névregiszter.
 *
 * Elvek:
 * - EU-cloud az alapértelmezett host (GDPR): https://eu.i.posthog.com.
 * - A kliens a /ingest elsőfél-proxyt használja (next.config.ts rewrites) —
 *   így a hívások első félként mennek ki (ad-blocker-ellenállóbb, és a
 *   PostHog-sütik first-partyként működnek).
 * - CONSENT-FIRST: a PostHog CSAK a látogató analytics-hozzájárulása után
 *   inicializálódik (kc_analytics_consent=granted). A jövőbeli consent-
 *   banner ezt a kulcsot írja, és 'kc:analytics-consent' eseményt szór —
 *   a provider erre (is) figyel.
 * - Kulcs nélkül a teljes analitika kikapcsolt (no-op) — ugyanaz a filozófia,
 *   mint az e-mail/Számlázz.hu opcionális integrációknál.
 */

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
export const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com').replace(/\/+$/, '')

/** Elsőfél-proxy útvonal (a next.config.ts rewrites ezt a PostHog EU-hostra forgatja). */
export const POSTHOG_API_HOST = '/ingest'

/** Analytics-hozzájárulás tároló-ablakkulcs (a consent-banner ezt írja). */
export const CONSENT_STORAGE_KEY = 'kc_analytics_consent'
export const CONSENT_GRANTED = 'granted'
export const CONSENT_DENIED = 'denied'
/** A consent-banner által kibocsátott window-esemény (a provider hallgat rá). */
export const CONSENT_EVENT = 'kc:analytics-consent'

/** Üzleti esemény-nevek EGY helyen — a funnel-riportok ezekre épülnek. */
export const ANALYTICS_EVENTS = {
  courseViewed: 'course_viewed',
  checkoutStarted: 'checkout_started',
  purchaseConfirmed: 'purchase_confirmed',
} as const
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/** Van-e beállítva PostHog-kulcs (kulcs nélkül minden no-op). */
export function isPostHogConfigured(): boolean {
  return POSTHOG_KEY.trim().length > 0
}

/**
 * A látogató hozzájárult-e az analyticshez. Csak kliens-oldalon értelmes
 * (szerveren mindig false → SSR-ben sosem indul a tracking).
 */
export function hasAnalyticsConsent(storage?: Pick<Storage, 'getItem'>): boolean {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  if (!store) {
    return false
  }
  try {
    return store.getItem(CONSENT_STORAGE_KEY) === CONSENT_GRANTED
  } catch {
    return false
  }
}

/** A posthog.init opciói (tiszta függvény — egységtesztelhető). */
export function buildPostHogOptions(): Partial<PostHogConfig> {
  return {
    api_host: POSTHOG_API_HOST,
    ui_host: POSTHOG_HOST,
    // Csak azonosított felhasználókról készül person-profil (anonim forgalom
    // nem generál profilt — költség- és adatminimalizálás).
    person_profiles: 'identified_only',
    // A $pageview-t manuálisan küldi a PostHogPageView (App Router route-figyeléssel).
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  }
}

let initialized = false

/** PostHog inicializálása (idempotens; csak konfigurált + hozzájárulás esetén). */
export function initPostHog(): boolean {
  if (initialized) {
    return true
  }
  if (!isPostHogConfigured() || !hasAnalyticsConsent()) {
    return false
  }
  posthog.init(POSTHOG_KEY, buildPostHogOptions())
  initialized = true
  return true
}

/** Üzleti esemény rögzítése — no-op, ha az analitika ki van kapcsolva. */
export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (!initialized || typeof window === 'undefined') {
    return
  }
  posthog.capture(event, properties)
}

/** $pageview rögzítése a route-váltás figyelőből. */
export function capturePageView(url: string): void {
  if (!initialized || typeof window === 'undefined') {
    return
  }
  posthog.capture('$pageview', { $current_url: url })
}

/** Tesztelési segéd: az init-zárolt állapot visszaállítása. */
export function resetPostHogForTests(): void {
  initialized = false
}
