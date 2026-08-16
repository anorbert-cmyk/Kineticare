/**
 * E-mail modul (T-018) — nyilvános belépési pont.
 */
export { sendMail, resolveEmailProvider } from './provider'
export type { ResolvedEmailProvider } from './provider'
export { maskEmail, parseFromAddress, formatFromAddress } from './mask'
export { kineticareEmailAdapter } from './adapter'
export { usersAuthEmails } from './users-auth'
export { renderLayout, escapeHtml } from './templates/layout'
export { welcomeEmail, resetPasswordEmail, verifyEmail, contactStaffEmail } from './templates/auth'
export { appointmentStaffEmail } from './templates/appointment'
export { orderConfirmationEmail, type OrderConfirmationItem } from './templates/order'
export { EmailSendError } from './types'
export type { EmailProviderName, EmailTemplate, MailMessage, SendResult } from './types'
