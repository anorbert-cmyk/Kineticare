import posthog from 'posthog-js'
import type { PostHogConfig } from 'posthog-js'

import {
  CONSENT_EVENT,
  CONSENT_GRANTED,
  CONSENT_STORAGE_KEY,
  dispatchConsentEvent,
  readConsent,
  writeConsent,
  type ConsentReader,
  type ConsentState,
} from './consent'
import { sanitizeAnalyticsUrl } from './page-url'

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

/**
 * A consent-tárolókulcs, az állapot-konstansok és az eseménynév EGYETLEN
 * igazságforrása a ./consent modul (körmenti import elkerülésével) — innen
 * re-exportáljuk a visszafelé kompatibilitásért.
 */
export { CONSENT_EVENT, CONSENT_GRANTED, CONSENT_STORAGE_KEY }
export { CONSENT_DENIED } from './consent'

/**
 * Üzleti esemény-nevek EGY helyen — a funnel-riportok ezekre épülnek.
 *
 * KÉT funnel él egymás után:
 *  1. ÉRTÉKESÍTÉSI: $pageview(/) → course_viewed → checkout_started →
 *     purchase_confirmed  (docs/ertekesitesi-ux-skill.md 5. pont)
 *  2. TANULÁSI (a vásárlás UTÁN): course_started → lesson_completed* →
 *     module_completed* → course_completed
 * A második azért kell, mert a megrendelői kérdés („hányan kezdték el, hányan
 * fejezték be") két, egymástól független forrásból is megválaszolható: az
 * adatbázisból (admin haladás-nézet, pontos, de csak pillanatkép) és a
 * PostHogból (időbeli lefutás, lemorzsolódás, kohorszok). A kettő ugyanazokat
 * a fogalmakat használja, hogy a számok összevethetők legyenek.
 *
 * SZEMÉLYES ADAT NEM MEHET az esemény-tulajdonságokba (a logger redact-listája
 * a naplóra véd, a PostHog-hívásra nem): kurzus- és lecke-azonosító igen,
 * e-mail, név, IP SOHA.
 */
export const ANALYTICS_EVENTS = {
  courseViewed: 'course_viewed',
  checkoutStarted: 'checkout_started',
  purchaseConfirmed: 'purchase_confirmed',
  courseStarted: 'course_started',
  lessonCompleted: 'lesson_completed',
  moduleCompleted: 'module_completed',
  courseCompleted: 'course_completed',
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
export function hasAnalyticsConsent(storage?: ConsentReader): boolean {
  // Egyetlen igazságforrás: a consent.ts állapotgépe (nincs párhuzamos logika).
  return readConsent(storage) === CONSENT_GRANTED
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

/** Inicializálva van-e a PostHog-kliens (a provider és a tesztek használják). */
export function isPostHogInitialized(): boolean {
  return initialized
}

/**
 * A capture tényleges BEkapcsolása 'granted' consent mellett: ha még nem
 * futott init, most lefut; ha már igen (korábbi opt-out után), csak a
 * posthog opt_in_capturing kapcsol vissza. NEM ír consentet és NEM szór
 * eseményt — ezt a provider consent-figyelője hívja.
 */
export function enableAnalyticsCapture(): boolean {
  if (initialized) {
    posthog.opt_in_capturing()
    return true
  }
  return initPostHog()
}

/**
 * A capture KIkapcsolása 'denied' consent mellett (opt_out_capturing — a
 * már inicializált kliens is abbahagyja a rögzítést). Az újra-initet az
 * initPostHog consent-kapuja tiltja, amíg a tárolt állapot 'denied'.
 */
export function disableAnalyticsCapture(): void {
  if (initialized) {
    posthog.opt_out_capturing()
  }
}

/**
 * Látogatói hozzájárulás (banner „Elfogadom"): consent tárolása +
 * 'kc:analytics-consent' esemény + capture bekapcsolása. A consent akkor is
 * tárolódik, ha a PostHog nincs konfigurálva (a döntés megmarad).
 */
export function optInToAnalytics(): void {
  writeConsent('granted')
  dispatchConsentEvent('granted')
  if (isPostHogConfigured()) {
    enableAnalyticsCapture()
  }
}

/**
 * Látogatói elutasítás (banner „Elutasítom"): consent tárolása + esemény +
 * capture kikapcsolása. 'denied' állapotban a PostHog SOHA nem init újra.
 */
export function optOutOfAnalytics(): void {
  writeConsent('denied')
  dispatchConsentEvent('denied')
  disableAnalyticsCapture()
}

/** A tárolt consent állapot lekérdezése (a banner láthatóságához). */
export function getAnalyticsConsentState(): ConsentState {
  return readConsent()
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

/**
 * A $pageview esemény payloadja (tiszta — egységtesztelhető). A kimenő URL a
 * capture-határon MINDIG megtisztított: a jelszó-visszaállító jegy (és bármely
 * jövőbeli érzékeny query-paraméter) sosem mehet harmadik félhez (M9 —
 * ./page-url.ts); a kampány-paraméterek (utm_*) megmaradnak.
 */
export function buildPageViewProperties(url: string): { $current_url: string } {
  return { $current_url: sanitizeAnalyticsUrl(url) }
}

/** $pageview rögzítése a route-váltás figyelőből. */
export function capturePageView(url: string): void {
  if (!initialized || typeof window === 'undefined') {
    return
  }
  posthog.capture('$pageview', buildPageViewProperties(url))
}

/** Tesztelési segéd: az init-zárolt állapot visszaállítása. */
export function resetPostHogForTests(): void {
  initialized = false
}
