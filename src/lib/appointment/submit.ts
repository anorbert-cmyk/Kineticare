import { extractPayloadErrorMessage } from '../payload-rest-error'

import {
  APPOINTMENT_AVAILABILITY_FIELD,
  APPOINTMENT_AVAILABILITY_SEPARATOR,
  APPOINTMENT_CONSENT_FIELD,
  APPOINTMENT_EMAIL_FIELD,
  APPOINTMENT_NAME_FIELD,
  APPOINTMENT_PHONE_FIELD,
  APPOINTMENT_REASON_FIELD,
  type AppointmentFormValues,
} from './validation'

/**
 * Időpontkérés — beküldés a form-builder végpontjára.
 *
 * API-szerződés — SZÁNDÉKOSAN AZONOS a kapcsolat- és a hírlevél-űrlapéval,
 * mert ugyanazt a plugin-végpontot hívja (párhuzamos beküldési út NINCS):
 * - Végpont: `POST /api/form-submissions` (a @payloadcms/plugin-form-builder
 *   nyilvános create-je).
 * - Törzs: `{ form: <formId>, submissionData: [{ field, value }…],
 *            turnstileToken?: string }`.
 * - Spam-védelem: beállított TURNSTILE_SECRET_KEY mellett a `turnstileToken`
 *   KÖTELEZŐ (a hook minden form-submission create-re fut); kulcs nélkül a
 *   widget a kliensen sem jelenik meg.
 * - Kérés-korlát: a `/api/form-submissions` a `form-submission` osztályba esik
 *   (5 kérés / 10 perc / IP, src/lib/security/rate-limit.ts) — a másik két
 *   űrlappal KÖZÖS vödörben.
 *
 * Az `availability` több bejelölt sávot hordozhat, a form-builder mező viszont
 * egyetlen szöveg: a feliratokat vesszővel fűzzük össze, és a szerver ugyanezen
 * az elválasztón bontja vissza (`APPOINTMENT_AVAILABILITY_SEPARATOR`).
 *
 * A fetch injektálható, így a modul jsdom nélkül, node-környezetben is
 * tesztelhető (CLAUDE.md 15. tanulság: tesztből valódi hálózati hívás nem mehet).
 */

export interface AppointmentSubmissionEntry {
  field: string
  value: string
}

export interface AppointmentSubmissionPayload {
  form: string
  submissionData: AppointmentSubmissionEntry[]
  turnstileToken?: string
}

export type AppointmentSubmitResult = { ok: true } | { ok: false; message: string }

/** A form-builder plugin nyilvános beküldési végpontja. */
export const APPOINTMENT_ENDPOINT = '/api/form-submissions'

/** Általános, felhasználóbarát hibaüzenet — a szerver-válasz felülírhatja. */
export const APPOINTMENT_GENERIC_ERROR =
  'Az időpontkérés küldése most nem sikerült. Próbáld újra néhány perc múlva, vagy hívj minket telefonon.'

/** Turnstile-kulcs mellett, még token nélküli állapotban ez az üzenet megy ki. */
export const APPOINTMENT_TURNSTILE_PENDING_ERROR =
  'Kérjük, várd meg a spam-ellenőrzés befejezését, majd küldd el újra.'

/** Az űrlap nem elérhető (nincs mögötte beküldési cím) — a telefonos út marad. */
export const APPOINTMENT_UNAVAILABLE_ERROR =
  'Az űrlap most nem érhető el. Kérjük, hívj minket telefonon, és egyeztetjük az időpontot.'

/**
 * Turnstile-widget láthatósága: CSAK beállított site key mellett renderelünk
 * (a másik két űrlap `isTurnstileEnabled`-jével azonos szabály).
 */
export function isTurnstileEnabled(siteKey: string | null | undefined): boolean {
  return typeof siteKey === 'string' && siteKey.trim().length > 0
}

export function buildAppointmentPayload(
  values: AppointmentFormValues,
  formId: string,
  turnstileToken?: string | null,
): AppointmentSubmissionPayload {
  const payload: AppointmentSubmissionPayload = {
    form: formId,
    submissionData: [
      { field: APPOINTMENT_NAME_FIELD, value: values.name.trim() },
      { field: APPOINTMENT_PHONE_FIELD, value: values.phone.trim() },
      { field: APPOINTMENT_EMAIL_FIELD, value: values.email.trim() },
      { field: APPOINTMENT_REASON_FIELD, value: values.reason.trim() },
      {
        field: APPOINTMENT_AVAILABILITY_FIELD,
        value: values.availability
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .join(APPOINTMENT_AVAILABILITY_SEPARATOR),
      },
      { field: APPOINTMENT_CONSENT_FIELD, value: values.consentHealth ? 'true' : 'false' },
    ],
  }
  if (typeof turnstileToken === 'string' && turnstileToken.length > 0) {
    payload.turnstileToken = turnstileToken
  }
  return payload
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export async function submitAppointmentForm(
  payload: AppointmentSubmissionPayload,
  fetchImpl: FetchLike = fetch,
): Promise<AppointmentSubmitResult> {
  try {
    const response = await fetchImpl(APPOINTMENT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      return {
        ok: false,
        message: await extractPayloadErrorMessage(response, APPOINTMENT_GENERIC_ERROR),
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: APPOINTMENT_GENERIC_ERROR }
  }
}
