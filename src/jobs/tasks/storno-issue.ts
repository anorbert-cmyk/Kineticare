import type { TaskConfig } from 'payload'

import type { Order } from '../../payload-types'
import { getSzamlazzConfig, issueStornoForOrder } from '../../lib/szamlazz'
import { logger } from '../../lib/logger'

/**
 * storno-issue task (C4): egy rendelés stornó-számlájának kiállítása a
 * Számlázz.hu dedikált sztornó interfészén.
 *
 * NEM automatikus újrapróbálás. A refund-folyamat a stornót inline,
 * best-effort próbálja. Ha az inline POST már elindult, és timeout/hálózat
 * miatt elszakad, az állapot bizonytalan (F3): a vak retry dupla stornót
 * okozhat. Ezért a refund NEM állítja sorba ezt a taskot. A task csak
 * KÉZI / explicit újrasorbaállításra való — miután ember megerősítette a
 * Számlázz.hu-fiókban, hogy NINCS stornó (és a rendelés stornoAttempts-jét
 * szükség szerint visszaállította).
 *
 * Ha a taskot mégis egy már próbált rendelésre futtatják (stornoAttempts > 0,
 * nincs stornoNumber), az issueStornoForOrder F3-on RIASZTÁS-sal megáll, és
 * SOHA nem POSTol újra. Ez a biztonsági őr a dupla stornó ellen.
 *
 * Retry-szabály: a task 3× próbálkozhat (Payload job-retry), de ez csak a
 * kézi, tiszta állapotú újrafuttatásra vonatkozik. Üzleti hibánál (nincs
 * eredeti számlaszám, agent-elutasítás, kimerült kísérletszám, F3
 * bizonytalan állapot) 'failed' kimenetet ad, és a job lezárul.
 */

interface StornoIssueJobIO {
  input: { orderId: number }
  output: {
    outcome: string
    stornoNumber?: string
    reason?: string
  }
}

export const stornoIssueTask: TaskConfig<StornoIssueJobIO> = {
  slug: 'storno-issue',
  retries: 3,
  inputSchema: [{ name: 'orderId', type: 'number', required: true }],
  outputSchema: [
    { name: 'outcome', type: 'text', required: true },
    { name: 'stornoNumber', type: 'text' },
    { name: 'reason', type: 'text' },
  ],
  handler: async ({ req, input }) => {
    const orderId = (input as { orderId?: unknown }).orderId
    if (typeof orderId !== 'number' || !Number.isInteger(orderId) || orderId <= 0) {
      throw new Error(`storno-issue: érvénytelen orderId input (${String(orderId)})`)
    }

    // Kikapcsolt integrációnál a task azonnal, hiba nélkül lezárul.
    if (!getSzamlazzConfig().enabled) {
      logger.debug('storno-issue: a Számlázz.hu-integráció kikapcsolva (nincs agent-kulcs) — no-op')
      return { output: { outcome: 'disabled' } }
    }

    const order = (await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
    })) as Order | null
    if (!order) {
      logger.warn('storno-issue: a rendelés nem található — stornó kihagyva', { orderId })
      return { output: { outcome: 'failed', reason: 'a rendelés nem található' } }
    }

    const result = await issueStornoForOrder(order, { payload: req.payload })
    return {
      output: {
        outcome: result.outcome,
        ...(result.stornoNumber ? { stornoNumber: result.stornoNumber } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
      },
    }
  },
}
