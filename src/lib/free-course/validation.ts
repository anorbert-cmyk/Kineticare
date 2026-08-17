/**
 * Ingyenes kurzus igénylése — VALIDÁCIÓ, két alakra ugyanazokkal a szabályokkal.
 *
 * A modul szándékosan tiszta (DOM-, Payload- és környezet-független), a
 * hírlevél-űrlap `src/lib/newsletter/validation.ts` mintájára: a KLIENS- és a
 * SZERVER-oldali szabály EGY fájlban él, mert a kettő csak együtt módosítható,
 * és az űrlap mindössze három mezős.
 *
 * Mezők:
 *  - `name` — KÖTELEZŐ (a levél megszólítása és a fiók neve ebből lesz);
 *  - `email` — KÖTELEZŐ, formailag ellenőrzött (ide megy a belépő link);
 *  - `consentPrivacy` — KÖTELEZŐ, SOSEM előpipált adatkezelési hozzájárulás.
 *
 * EGÉSZSÉGÜGYI ADAT NINCS. A kurzus rehabilitációs tartalom, de az igényléshez
 * SEMMILYEN egészségi állapotra vonatkozó adatot nem kérünk (GDPR 9. cikk
 * szerinti különleges adat) — a hozzájárulás ezért az általános adatkezelési
 * tájékoztatóra mutat, nem külön egészségügyi nyilatkozatra. (Az időpontkérő
 * űrlap ezzel szemben panasz-mezőt is kezel, ott ezért van külön
 * `consentHealth`; a kettőt nem szabad összemosni.)
 *
 * A mezőnév `consentPrivacy` — SZÁNDÉKOSAN azonos a kapcsolat-űrlapéval
 * (`src/lib/contact-submission.ts`), mert ugyanaz a cél: a megadott
 * kapcsolattartási adat kezelése a kért szolgáltatás teljesítéséhez.
 */

export interface FreeCourseFormValues {
  name: string
  email: string
  /** Adatkezelési hozzájárulás — KÖTELEZŐ, alapértelmezetten false. */
  consentPrivacy: boolean
}

export type FreeCourseFormErrors = Partial<Record<keyof FreeCourseFormValues, string>>

export const EMPTY_FREE_COURSE_VALUES: FreeCourseFormValues = {
  name: '',
  email: '',
  consentPrivacy: false,
}

/**
 * Ugyanaz a szándékosan szigorú, UX-szintű minta, mint a kapcsolat- és a
 * hírlevél-űrlapon — a három űrlap ne mondjon mást ugyanarra a címre.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** RFC 5321 szerinti maximális e-mail-hossz — felső korlát a szemétadat ellen. */
export const FREE_COURSE_EMAIL_MAX_LENGTH = 254

/**
 * A név felső korlátja. A users.name szabad szöveg; a korlát a szemétadat és a
 * levél-megszólítás szétesése ellen véd (a leghosszabb magyar névsor is bőven
 * elfér benne).
 */
export const FREE_COURSE_NAME_MAX_LENGTH = 120

export const FREE_COURSE_NAME_REQUIRED_ERROR = 'Add meg a neved.'
export const FREE_COURSE_NAME_TOO_LONG_ERROR = 'Ez a név túl hosszú.'
export const FREE_COURSE_EMAIL_REQUIRED_ERROR = 'Add meg az e-mail-címed.'
export const FREE_COURSE_EMAIL_FORMAT_ERROR = 'Érvényes e-mail-címet adj meg (pl. nev@pelda.hu).'
export const FREE_COURSE_EMAIL_TOO_LONG_ERROR = 'Ez az e-mail-cím túl hosszú.'
/**
 * A hozzájárulás hibaüzenete. GOV.UK hibaüzenet-szabály (§2.7): mondja meg,
 * MIT KELL TENNI, ne csak azt, hogy „kötelező". A „Kérjük" SZÁNDÉKOSAN nincs
 * benne: a GOV.UK szerint a „please" választást sugall ott, ahol nincs
 * választás (§2.7, A/9). A hírlevél-űrlap mai üzenete ezt a szabályt sérti
 * („A feliratkozáshoz kérjük a hozzájárulásod…") — az javítása külön kör.
 */
export const FREE_COURSE_CONSENT_ERROR = 'Pipáld be az adatkezelési hozzájárulást.'

/** A név ellenőrzése; `null` = rendben. */
function nameError(rawName: string): string | null {
  const name = rawName.trim()
  if (name.length === 0) {
    return FREE_COURSE_NAME_REQUIRED_ERROR
  }
  if (name.length > FREE_COURSE_NAME_MAX_LENGTH) {
    return FREE_COURSE_NAME_TOO_LONG_ERROR
  }
  return null
}

/** Az e-mail-cím ellenőrzése; `null` = rendben. */
function emailError(rawEmail: string): string | null {
  const email = rawEmail.trim()
  if (email.length === 0) {
    return FREE_COURSE_EMAIL_REQUIRED_ERROR
  }
  if (email.length > FREE_COURSE_EMAIL_MAX_LENGTH) {
    return FREE_COURSE_EMAIL_TOO_LONG_ERROR
  }
  if (!EMAIL_PATTERN.test(email)) {
    return FREE_COURSE_EMAIL_FORMAT_ERROR
  }
  return null
}

/** KLIENS-oldali alak: az űrlap állapota → mezőnkénti magyar hibaüzenet. */
export function validateFreeCourseForm(values: FreeCourseFormValues): FreeCourseFormErrors {
  const errors: FreeCourseFormErrors = {}

  const name = nameError(values.name)
  if (name) {
    errors.name = name
  }

  const email = emailError(values.email)
  if (email) {
    errors.email = email
  }

  // Jogtiszta hozzájárulás: nem előpipált, explicit checkbox — enélkül a
  // beküldés kliensoldalon blokkolva van (a szerveren is, lásd lentebb).
  if (!values.consentPrivacy) {
    errors.consentPrivacy = FREE_COURSE_CONSENT_ERROR
  }

  return errors
}

export function isFreeCourseFormValid(errors: FreeCourseFormErrors): boolean {
  return Object.keys(errors).length === 0
}

/** A beküldés SZERVER-oldali, normalizált alakja (a szolgáltatás ezt kapja). */
export interface FreeCourseRequestBody {
  productId: number
  name: string
  email: string
  consentPrivacy: boolean
  /** Cloudflare Turnstile token; hiányozhat, ha a szerveren nincs secret. */
  turnstileToken: string | null
  /** Honeypot mező — emberi látogató sosem tölti ki. */
  honeypot: string
}

export type FreeCourseBodyResult =
  | { ok: true; body: FreeCourseRequestBody }
  | { ok: false; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * SZERVER-oldali alak: a nyers kérés-törzs (`unknown`) → normalizált beküldés
 * VAGY magyar hibaüzenetek listája.
 *
 * Miért kell a kliens mellé: a végpont NYILVÁNOS, közvetlen HTTP-hívással
 * bármi érkezhet. Kliens nélkül hozzájárulás NÉLKÜL keletkezne fiók és
 * hozzáférés (GDPR-kockázat), és a hiányzó/rossz e-mail-címre sem kellene
 * ügyelni. A bemenet ezért szándékosan `unknown`.
 *
 * A `consentPrivacy` itt LOGIKAI érték (a saját JSON-végpontunk szerződése),
 * nem „true" string — az a form-builder plugin `submissionData` alakjának a
 * kényszere volt, ide nem öröklődik.
 */
export function parseFreeCourseRequestBody(raw: unknown): FreeCourseBodyResult {
  const record = isRecord(raw) ? raw : {}
  const errors: string[] = []

  const productIdRaw = record.productId
  const productId =
    typeof productIdRaw === 'number'
      ? productIdRaw
      : typeof productIdRaw === 'string' && /^\d+$/.test(productIdRaw.trim())
        ? Number(productIdRaw.trim())
        : Number.NaN
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    errors.push('Hiányzik a kurzus azonosítója.')
  }

  const name = readString(record.name)
  const email = readString(record.email)
  const values: FreeCourseFormValues = {
    name,
    email,
    consentPrivacy: record.consentPrivacy === true,
  }
  const fieldErrors = validateFreeCourseForm(values)
  for (const message of [fieldErrors.name, fieldErrors.email, fieldErrors.consentPrivacy]) {
    if (message) {
      errors.push(message)
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    body: {
      productId,
      name,
      // A cím kisbetűsítve tárolódik a keresésekhez: a Payload e-mail-mezője
      // is így normalizál, tehát különben a „Nev@Pelda.hu" alakra új fiók
      // keletkezne a meglévő mellé.
      email: email.toLowerCase(),
      consentPrivacy: true,
      turnstileToken: typeof record.turnstileToken === 'string' ? record.turnstileToken : null,
      honeypot: readString(record.website),
    },
  }
}
