import { EmailSendError, type MailMessage } from './types'

/**
 * Resend provider — extra dependency nélkül, a Resend HTTP API-ján (fetch).
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Retry-szabály: 429 és 5xx (illetve hálózati hiba/timeout) újrapróbálható,
 * a többi 4xx végleges hiba.
 */
const RESEND_API_URL = 'https://api.resend.com/emails'
const RESEND_TIMEOUT_MS = 10_000

interface ResendSuccessBody {
  id?: string
}

export async function sendViaResend(
  apiKey: string,
  from: string,
  message: MailMessage,
): Promise<{ id?: string }> {
  let response: Response
  try {
    response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    })
  } catch (error) {
    // Hálózati hiba / timeout — mindig újrapróbálható.
    throw new EmailSendError(
      `Resend API elérhetetlen: ${error instanceof Error ? error.message : String(error)}`,
      true,
    )
  }

  if (response.ok) {
    const body = (await response.json().catch(() => ({}))) as ResendSuccessBody
    return { id: body.id }
  }

  const retryable = response.status === 429 || response.status >= 500
  const bodyText = await response.text().catch(() => '')
  throw new EmailSendError(
    `Resend API hiba (HTTP ${response.status}): ${bodyText.slice(0, 200)}`,
    retryable,
  )
}
