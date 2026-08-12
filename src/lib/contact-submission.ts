/**
 * Kapcsolat-űrlap (T-016) — SZERVER-oldali validáció a form-submissions
 * beküldésekre.
 *
 * A nyilvános POST /api/form-submissions végpontot a form-builder plugin
 * szolgálja ki, és a plugin a `submissionData` sorokat ellenőrzés nélkül
 * tárolja (a mező-szintű validate-je mindig átenged —
 * node_modules/@payloadcms/plugin-form-builder/dist/collections/FormSubmissions/index.js).
 * A kliensoldali validáció (src/app/(frontend)/kapcsolat/_lib/validation.ts)
 * így önmagában nem védelem: közvetlen REST-hívással üres mezőjű vagy
 * adatkezelési hozzájárulás (consentPrivacy) NÉLKÜLI beküldés is mentődött.
 * Ez a modul a szerveroldali autoritás — ugyanazokat a szabályokat és
 * magyar hibaüzeneteket tartalmazza, mint a kliens, a beküldési
 * (`{ field, value }` sorok) alakra vetítve. A kliensoldali validáció
 * változatlanul marad a gyors visszajelzésért; a két réteg szabályait
 * egyszerre kell módosítani.
 *
 * A szerződés a „Kapcsolat" űrlapé: a rendszerben jelenleg ez az EGYETLEN
 * nyilvános űrlap (az onInit seedeli, src/payload.config.ts). Ha a jövőben
 * más sémájú nyilvános űrlap kerül be, ezt a szerződést űrlaponként kell
 * szétbontani.
 *
 * A függvény szándékosan tiszta (a password-policy.ts mintájára): nem függ
 * Payloadtól, adatbázistól vagy környezettől, így mock nélkül unit-tesztelhető.
 */

/** Üzenet-minimum — a kliensoldali validation.ts MESSAGE_MIN_LENGTH értékével azonos. */
export const CONTACT_MESSAGE_MIN_LENGTH = 10

/** A kliensoldali validation.ts EMAIL_PATTERN reguláris kifejezésével azonos. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A beküldés submissionData sorainak kötelező-mező- és consent-ellenőrzése.
 *
 * A bemenet szándékosan `unknown`: a nyilvános végponton bármi érkezhet,
 * a nem-string értékeket és a hiányzó sorokat egyaránt „üres"-ként kezeljük.
 * A consentPrivacy a kliens-szerződés szerint „true"/„false" STRINGKént
 * érkezik — kizárólag a „true" fogadható el.
 *
 * @returns magyar hibaüzenetek listája; üres tömb = érvényes beküldés.
 */
export function validateContactSubmissionData(submissionData: unknown): string[] {
  const entries: unknown[] = Array.isArray(submissionData) ? submissionData : []
  const fieldValue = (name: string): string => {
    const entry = entries.find(
      (raw) =>
        typeof raw === 'object' &&
        raw !== null &&
        (raw as Record<string, unknown>).field === name,
    )
    const value =
      typeof entry === 'object' && entry !== null
        ? (entry as Record<string, unknown>).value
        : undefined
    return typeof value === 'string' ? value.trim() : ''
  }

  const errors: string[] = []

  if (fieldValue('name').length === 0) {
    errors.push('Add meg a neved.')
  }

  const email = fieldValue('email')
  if (email.length === 0) {
    errors.push('Add meg az e-mail-címed.')
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('Érvényes e-mail-címet adj meg (pl. nev@pelda.hu).')
  }

  if (fieldValue('subject').length === 0) {
    errors.push('Add meg az üzenet tárgyát.')
  }

  const message = fieldValue('message')
  if (message.length === 0) {
    errors.push('Írd meg az üzeneted.')
  } else if (message.length < CONTACT_MESSAGE_MIN_LENGTH) {
    errors.push(`Az üzenet legyen legalább ${CONTACT_MESSAGE_MIN_LENGTH} karakter hosszú.`)
  }

  // Jogtiszta hozzájárulás: a szerveren is kötelező — különben közvetlen
  // REST-hívással mentődne consent nélküli személyes adat (GDPR-kockázat).
  if (fieldValue('consentPrivacy') !== 'true') {
    errors.push('Az adatkezelési hozzájárulás megadása kötelező.')
  }

  return errors
}
