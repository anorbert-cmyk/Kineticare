import type { EmailAdapter } from 'payload'

import { parseFromAddress } from './mask'
import { sendMail } from './provider'
import type { SendResult } from './types'

/**
 * Payload EmailAdapter a saját provider-réteg fölé (T-018).
 *
 * Ezt adja a payload.config `email` mezője, így a Payload auth e-mail-funkciói
 * (forgot-password, verify) is a Resend/SMTP/noop provideren mennek ki —
 * konfiguráció nélkül (dev) sosem crashelnek.
 */
export const kineticareEmailAdapter: EmailAdapter<SendResult> = () => {
  const from = parseFromAddress(process.env.EMAIL_FROM)
  return {
    name: 'kineticare-provider',
    defaultFromAddress: from.address,
    defaultFromName: from.name,
    sendEmail: async (message) => {
      const to = Array.isArray(message.to) ? message.to : [message.to]
      return sendMail({
        to: to.filter((recipient): recipient is string => typeof recipient === 'string'),
        subject: message.subject,
        html: message.html,
        text: message.text ?? '',
      })
    },
  }
}
