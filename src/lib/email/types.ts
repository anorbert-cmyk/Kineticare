/**
 * E-mail modul közös típusai (T-018).
 *
 * Provider-réteg: Resend (RESEND_API_KEY) VAGY SMTP (SMTP_HOST…) — env-alapú
 * választás; ha egyik sincs beállítva, noop-provider figyelmeztetéssel, és a
 * küldés sosem crashel (sosem dob hibát a hívó felé).
 */

export type EmailProviderName = 'resend' | 'smtp' | 'noop'

export interface MailAddress {
  name: string
  address: string
}

export interface MailMessage {
  to: string[]
  subject: string
  html: string
  text: string
}

export interface SendResult {
  ok: boolean
  provider: EmailProviderName
  /** Provider-oldali üzenet-azonosító (ha ad). */
  id?: string
  /** Hiba esetén: érdemes-e újrapróbálni (retry-barát hibajelzés). */
  retryable?: boolean
  error?: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/** Küldési hiba retry-jelzéssel — a sendMail ebből állítja elő a SendResultot. */
export class EmailSendError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = 'EmailSendError'
    this.retryable = retryable
  }
}
