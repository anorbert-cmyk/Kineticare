import type { TaskConfig } from 'payload'

import { getSzamlazzConfig, issueInvoiceForOrder } from '../../lib/szamlazz'
import { logger } from '../../lib/logger'

/**
 * invoice-issue task (T-024/W4-01): egy rendelés számlájának kiállítása a
 * Számlázz.hu Számla Agenttel. A friss paid-átmenet (callback vagy order-poll)
 * állítja sorba; az order-poll resweep-je a kimaradtakat pótolja.
 *
 * Retry-szabály: a task 3× próbálkozhat (Payload job-retry). A szolgáltatás
 * csak retryable provider/timeout-hibánál dob — üzleti hibánál (hiányos vevő-
 * adatok, agent-elutasítás) 'failed' kimenetet ad, és a job lezárul.
 * A szamlaKulsoAzon (orderNumber) miatt az újrapróbálás sem állíthat ki
 * dupla számlát; a szolgáltatás emellett issued/invoiceNumber esetén no-op.
 */

interface InvoiceIssueJobIO {
  input: { orderId: number }
  output: {
    outcome: string
    invoiceNumber?: string
    reason?: string
  }
}

export const invoiceIssueTask: TaskConfig<InvoiceIssueJobIO> = {
  slug: 'invoice-issue',
  retries: 3,
  inputSchema: [{ name: 'orderId', type: 'number', required: true }],
  outputSchema: [
    { name: 'outcome', type: 'text', required: true },
    { name: 'invoiceNumber', type: 'text' },
    { name: 'reason', type: 'text' },
  ],
  handler: async ({ req, input }) => {
    const orderId = (input as { orderId?: unknown }).orderId
    if (typeof orderId !== 'number' || !Number.isInteger(orderId) || orderId <= 0) {
      throw new Error(`invoice-issue: érvénytelen orderId input (${String(orderId)})`)
    }

    // Kikapcsolt integrációnál a task azonnal, hiba nélkül lezárul.
    if (!getSzamlazzConfig().enabled) {
      logger.debug('invoice-issue: a Számlázz.hu-integráció kikapcsolva (nincs agent-kulcs) — no-op')
      return { output: { outcome: 'disabled' } }
    }

    const result = await issueInvoiceForOrder({ payload: req.payload, orderId })
    return {
      output: {
        outcome: result.outcome,
        ...(result.invoiceNumber ? { invoiceNumber: result.invoiceNumber } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
      },
    }
  },
}
