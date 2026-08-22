/**
 * Kapcsolat-űrlap — kliensoldali validáció (T-016 form-submissions szerződés).
 *
 * Tisztán függvényes, DOM- és keretrendszer-független modul: a React
 * komponens (ContactForm) és a vitest-tesztek (src/__tests__/contact.test.ts)
 * is ezt használják. A szerveroldali validáció a form-builder plugin és a
 * T-016 beforeValidate hook feladata marad — ez a réteg a gyors, magyar
 * nyelvű visszajelzésről szól.
 *
 * Mezők (a T-016 „Kapcsolat" űrlap sémája): name, email, subject, message,
 * consentPrivacy — mindegyik KÖTELEZŐ; a hozzájárulás sosem előpipálva.
 */

export interface ContactFormValues {
  name: string
  email: string
  subject: string
  message: string
  /** Adatkezelési hozzájárulás — KÖTELEZŐ, alapértelmezetten false. */
  consentPrivacy: boolean
}

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>

export const EMPTY_CONTACT_VALUES: ContactFormValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
  consentPrivacy: false,
}

/**
 * A lap tetején álló hibaösszegzés szövege (GOV.UK error summary).
 *
 * §2.7 / A/9: a korábbi „Kérjük, ellenőrizd a megjelölt mezőket…" udvariaskodott
 * ott, ahol a látogatónak nincs más választása, és nem mondta meg, MI a baj.
 * Az új mondat előbb a helyzetet írja le, utána a teendőt. SZÓ SZERINT azonos
 * az időpontkérő űrlapéval (`src/lib/appointment/validation.ts` `errorSummary`):
 * ugyanaz a helyzet = ugyanaz a szöveg (WCAG 2.2 SC 3.2.4).
 */
export const CONTACT_ERROR_SUMMARY =
  'Néhány mező kitöltése hiányzik vagy javításra vár. Nézd át a megjelölt mezőket, és küldd el újra.'

/** Egyszerű, szándékosan szigorú e-mail-ellenőrzés (RFC helyett UX-szint). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Üzenet-minimum, hogy a tartalom nélküli beküldések kiszűrődjenek. */
export const MESSAGE_MIN_LENGTH = 10

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {}

  if (values.name.trim().length === 0) {
    errors.name = 'Add meg a neved.'
  }

  if (values.email.trim().length === 0) {
    errors.email = 'Add meg az e-mail-címed.'
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Érvényes e-mail-címet adj meg (pl. nev@pelda.hu).'
  }

  if (values.subject.trim().length === 0) {
    errors.subject = 'Add meg az üzenet tárgyát.'
  }

  if (values.message.trim().length === 0) {
    errors.message = 'Írd meg az üzeneted.'
  } else if (values.message.trim().length < MESSAGE_MIN_LENGTH) {
    errors.message = `Az üzenet legyen legalább ${MESSAGE_MIN_LENGTH} karakter hosszú.`
  }

  // Jogtiszta hozzájárulás: nem előpipált, explicit checkbox — enélkül a
  // beküldés kliensoldalon blokkolva van.
  if (!values.consentPrivacy) {
    errors.consentPrivacy = 'Az adatkezelési hozzájárulás megadása kötelező.'
  }

  return errors
}

export function isContactFormValid(errors: ContactFormErrors): boolean {
  return Object.keys(errors).length === 0
}
