import { ANALYTICS_EVENTS, captureAnalyticsEvent } from './posthog'

/**
 * A LEAD-funnel eseményei — típusos, egy helyen összefogott küldők.
 *
 * ═══ MIÉRT KÜLÖN MODUL ═══
 * A négy űrlap kliens-komponensének nem szabad tudnia, hogyan épül fel egy
 * PostHog-esemény: itt dől el az eseménynév, a tulajdonság-készlet és — ami a
 * legfontosabb — hogy MI NEM MEHET KI. A komponens csak annyit lát, hogy
 * „beküldés indul" / „a szerver visszaigazolta"; a szerződést ez a modul
 * őrzi, és ez tesztelhető is (src/__tests__/analytics/lead-esemenyek.test.tsx).
 * Ugyanaz a szerkezet és ugyanaz a no-op filozófia, mint a tanulási funnel
 * ./course-events.ts moduljában.
 *
 * ═══ MIÉRT KÉT ESEMÉNY, ÉS NEM EGY ═══
 * A `lead_submitted` a beküldés SZÁNDÉKA: a látogató elindította a beküldést,
 * a kérés kiment. A `lead_succeeded` a szerver VISSZAIGAZOLÁSA: a beküldés
 * megérkezett és elfogadásra került.
 *
 * A kettő KÜLÖNBSÉGE a néma beküldési hibák EGYETLEN külső jelzője. A
 * szerveroldali napló szerkezetéből adódóan csak azt látja, ami ODAÉRT: ha a
 * kérés a hálózaton, a kérés-korláton (5 kérés / 10 perc / IP), a
 * Turnstile-ellenőrzésen vagy egy 5xx-en bukik el, a szerver oldalán vagy
 * semmi, vagy egy nehezen a látogatóhoz kötött hibasor keletkezik. A
 * `lead_submitted` viszont a KLIENSTŐL indul, tehát akkor is megérkezik, ha a
 * beküldés maga sosem ért célba. Egyetlen esemény („sikeres feliratkozás")
 * mellett a hibás beküldések egyszerűen LÁTHATATLANOK lennének: a mérőszám
 * csendben csökkenne, és semmi nem mondaná meg, hogy ez kereslet-csökkenés
 * vagy meghibásodás.
 *
 * ═══ MIT SZÁMÍT BEKÜLDÉSNEK ═══
 * A `lead_submitted` a TÉNYLEGES beküldési kísérletre megy ki — vagyis a
 * kliensoldali validáció és a spam-kapuk (honeypot, Turnstile) UTÁN, közvetlenül
 * a hálózati hívás előtt. Ez szándékos:
 *  - a kitöltés közbeni mezőhibák nem beküldések, ezért a `submitted`/`succeeded`
 *    arányt nem szabad hígítaniuk (különben az arány a „hányan gépeltek el egy
 *    e-mail-címet" számmá válna, és pont a néma szerverhibát fedné el);
 *  - a honeypotba lépő BOT hálózati hívás nélkül, látszólagos sikerrel áll meg
 *    az űrlapban — ide el sem jut, tehát bot sosem fújja fel a tölcsért.
 *
 * ═══ ADATVÉDELEM ═══
 * A tulajdonságok KIZÁRÓLAG a forrás-címkét és — ahol értelmes — a kurzus
 * adatbázis-azonosítóját hordozzák. E-MAIL, NÉV, TELEFONSZÁM, ÜZENETSZÖVEG,
 * IP vagy bármely szabad szöveges bevitel SOHA: az esemény harmadik félhez
 * (PostHog) megy ki, a logger redact-listája pedig csak a NAPLÓRA véd. A modul
 * szűk típusai ezt szerkezetileg is kikényszerítik: a hívó nem tud tetszőleges
 * mezőt átadni, a forrás pedig zárt unió, nem szabad sztring.
 *
 * ═══ CONSENT ═══
 * A `captureAnalyticsEvent` no-op, amíg az analitika nincs bekapcsolva
 * (hozzájárulás + PostHog-kulcs), ezért ezek a hívók hozzájárulás nélkül
 * csendben nem csinálnak semmit. A hívó helyeken NEM kell külön consent-kaput
 * építeni.
 */

/** A lead-források ZÁRT készlete — a riportok ezekre a címkékre bontanak. */
export const LEAD_FORRASOK = [
  'kapcsolat',
  'idopontkeres',
  'hirlevel',
  'ingyenes-kurzus',
] as const

/** Egy lead forrása. Szűk unió: szabad sztringet a típus nem enged át. */
export type LeadForras = (typeof LEAD_FORRASOK)[number]

/**
 * A forrás-címkén FELÜL küldhető, nem személyes adatok.
 *
 * Ma egyetlen mező van: az ingyenes kurzus igénylésénél a kért kurzus
 * adatbázis-azonosítója (szám, a saját rendszerünkön kívül semmit nem jelent).
 * A típus szándékosan szűk — új mezőt csak ide, kimondott indoklással.
 */
export interface LeadEventExtra {
  courseId?: number
}

/** Az esemény tulajdonságai — EGY helyen, hogy a két esemény ne csúszhasson el. */
function leadProps(forras: LeadForras, extra?: LeadEventExtra): Record<string, unknown> {
  return {
    leadSource: forras,
    // A hiányzó/érvénytelen azonosító ki sem kerül (nem null-ként, nem NaN-ként).
    ...(typeof extra?.courseId === 'number' && Number.isFinite(extra.courseId)
      ? { courseId: extra.courseId }
      : {}),
  }
}

/**
 * A látogató ELINDÍTOTTA a beküldést (a kérés kiment).
 *
 * Nem jelenti, hogy a beküldés meg is érkezett — azt a `trackLeadSucceeded`
 * mondja meg. A kettő különbsége a mérőszám (lásd a modul fejlécét).
 */
export function trackLeadSubmitted(forras: LeadForras, extra?: LeadEventExtra): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.leadSubmitted, leadProps(forras, extra))
}

/** A szerver VISSZAIGAZOLTA a beküldést (a lead ténylegesen létrejött). */
export function trackLeadSucceeded(forras: LeadForras, extra?: LeadEventExtra): void {
  captureAnalyticsEvent(ANALYTICS_EVENTS.leadSucceeded, leadProps(forras, extra))
}

/**
 * A két küldő egy objektumban — kizárólag azért, hogy a négy űrlap beküldő
 * burka INJEKTÁLHATÓ legyen, és a tesztek kémeket adhassanak be valódi
 * PostHog-hívás (és jsdom) nélkül. A repóban ez a bevált minta
 * (`TrackedRegisterDeps`, `TrackedNewsletterDeps`).
 */
export interface LeadTrackers {
  submitted: (forras: LeadForras, extra?: LeadEventExtra) => void
  succeeded: (forras: LeadForras, extra?: LeadEventExtra) => void
}

/** Az éles küldők — ezt kapja minden űrlap, ha nem injektálnak mást. */
export const LEAD_TRACKERS: LeadTrackers = {
  submitted: trackLeadSubmitted,
  succeeded: trackLeadSucceeded,
}

export interface LeadTrackingOptions {
  extra?: LeadEventExtra
  trackers?: LeadTrackers
}

/**
 * Egy űrlap-beküldés lead-mérésbe csomagolva.
 *
 * A `submitted` a hívás ELŐTT, a `succeeded` CSAK sikeres szerverválasz után
 * megy ki — a sorrend maga a szerződés, ezért él egy helyen, és nem négy
 * komponensben szétmásolva.
 *
 * MIÉRT `try/catch` MINDKÉT KÜLDŐN: a mérés hibája NEM ronthatja el a
 * beküldést. Ha a PostHog-kliens bármely okból dob (blokkoló kiegészítő,
 * hibás konfiguráció), a látogató ebből semmit nem érzékelhet — ugyanaz az
 * elv, amit a `trackedRegister` alkalmaz a Barion-eseménynél
 * (src/components/auth/RegisterForm.tsx).
 *
 * A `submit` hibáját NEM nyeljük el: az az űrlap dolga (magyar hibaüzenet,
 * megmaradó űrlap-állapot).
 */
export async function withLeadTracking<T extends { ok: boolean }>(
  forras: LeadForras,
  submit: () => Promise<T>,
  options: LeadTrackingOptions = {},
): Promise<T> {
  const trackers = options.trackers ?? LEAD_TRACKERS

  try {
    trackers.submitted(forras, options.extra)
  } catch {
    // A mérés hibája nem érheti el a felhasználót.
  }

  const result = await submit()

  if (result.ok) {
    try {
      trackers.succeeded(forras, options.extra)
    } catch {
      // A mérés hibája nem érheti el a felhasználót.
    }
  }

  return result
}
