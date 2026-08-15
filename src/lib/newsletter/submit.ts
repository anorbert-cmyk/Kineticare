import { extractPayloadErrorMessage } from '../payload-rest-error'

import {
  NEWSLETTER_CONSENT_FIELD,
  NEWSLETTER_EMAIL_FIELD,
  type NewsletterFormValues,
} from './validation'

/**
 * Hírlevél-feliratkozás (C9) — beküldés a form-builder végpontjára.
 *
 * API-szerződés — SZÁNDÉKOSAN AZONOS a kapcsolat-űrlapéval
 * (src/app/(frontend)/kapcsolat/_lib/submit.ts), mert ugyanazt a plugin-
 * végpontot hívja:
 * - Végpont: `POST /api/form-submissions` (a @payloadcms/plugin-form-builder
 *   nyilvános create-je — saját route NINCS, és nem is kell).
 * - Törzs: `{ form: <formId>, submissionData: [{ field, value }…],
 *            turnstileToken?: string }`.
 * - Mezők: `email`, `consentNewsletter` (a hozzájárulás „true" stringként).
 * - Spam-védelem: ha a szerveren a TURNSTILE_SECRET_KEY be van állítva, a
 *   `turnstileToken` KÖTELEZŐ (a hook minden form-submission create-re fut,
 *   tehát a hírlevélre is); ha nincs beállítva, a token elhagyható — a widget
 *   ilyenkor a kliensen sem jelenik meg (TURNSTILE_SITE_KEY nélkül).
 * - Kérés-korlát: a `/api/form-submissions` útvonal a `form-submission`
 *   osztályba esik (5 kérés / 10 perc / IP, src/lib/security/rate-limit.ts) —
 *   a kapcsolat-űrlappal KÖZÖS vödörben.
 *
 * A fetch injektálható, így a modul jsdom nélkül, node-környezetben is
 * tesztelhető (lásd src/__tests__/newsletter.test.ts).
 */

export interface NewsletterSubmissionEntry {
  field: string
  value: string
}

export interface NewsletterSubmissionPayload {
  form: string
  submissionData: NewsletterSubmissionEntry[]
  turnstileToken?: string
}

export type NewsletterSubmitResult = { ok: true } | { ok: false; message: string }

/** A form-builder plugin nyilvános beküldési végpontja. */
export const FORM_SUBMISSIONS_ENDPOINT = '/api/form-submissions'

/** Általános, felhasználóbarát hibaüzenet — a szerver-válasz felülírhatja. */
export const NEWSLETTER_GENERIC_ERROR =
  'A feliratkozás most nem sikerült. Próbáld újra néhány perc múlva.'

/** Sikerüzenet — a beküldés után az élő régióban (role="status") jelenik meg. */
export const NEWSLETTER_SUCCESS_MESSAGE =
  'Köszönjük, feliratkoztál! Hamarosan jelentkezünk az első hírlevéllel.'

/** Turnstile-kulcs mellett, még token nélküli állapotban ez az üzenet megy ki. */
export const NEWSLETTER_TURNSTILE_PENDING_ERROR =
  'Kérjük, várd meg a spam-ellenőrzés befejezését, majd küldd el újra.'

/**
 * Turnstile-widget láthatósága: CSAK beállított site key mellett renderelünk.
 * Kulcs nélkül a szerver sem ellenőriz, így a widget felesleges zaj lenne
 * (a kapcsolat-űrlap `isTurnstileEnabled`-jével azonos szabály).
 */
export function isTurnstileEnabled(siteKey: string | null | undefined): boolean {
  return typeof siteKey === 'string' && siteKey.trim().length > 0
}

export function buildNewsletterPayload(
  values: NewsletterFormValues,
  formId: string,
  turnstileToken?: string | null,
): NewsletterSubmissionPayload {
  const payload: NewsletterSubmissionPayload = {
    form: formId,
    submissionData: [
      { field: NEWSLETTER_EMAIL_FIELD, value: values.email.trim() },
      {
        field: NEWSLETTER_CONSENT_FIELD,
        value: values.consentNewsletter ? 'true' : 'false',
      },
    ],
  }
  if (typeof turnstileToken === 'string' && turnstileToken.length > 0) {
    payload.turnstileToken = turnstileToken
  }
  return payload
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export async function submitNewsletterForm(
  payload: NewsletterSubmissionPayload,
  fetchImpl: FetchLike = fetch,
): Promise<NewsletterSubmitResult> {
  try {
    const response = await fetchImpl(FORM_SUBMISSIONS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      return {
        ok: false,
        message: await extractPayloadErrorMessage(response, NEWSLETTER_GENERIC_ERROR),
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: NEWSLETTER_GENERIC_ERROR }
  }
}
