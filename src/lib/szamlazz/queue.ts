import type { Payload } from 'payload'

import { ORDER_MAINTENANCE_QUEUE } from '../../jobs/queues'
import type { Logger } from '../logger'

/**
 * A Számlázz.hu-jobok sorba állítása (C4/C5).
 *
 * A refund-folyamat szinkron, owner-vezérelt HTTP-művelet: a stornó/helyesbítő
 * kiállítása ott inline, best-effort fut. Ha az inline kísérlet ÚJRAPRÓBÁLHATÓ
 * hibába fut (timeout/hálózat/5xx/szlahu_down), a bizonylat nem veszhet el —
 * ezek a segédek állítják sorba a megfelelő taskot az order-maintenance
 * queue-ban (a queueInvoiceIssueJob mintájára, src/lib/order-paid.ts).
 *
 * A sorba állítás maga is best-effort: hibája SOHA nem billentheti ki a már
 * sikeres visszatérítést — a függvények false-szal térnek vissza és naplóznak.
 */

type JobsQueueLike = {
  queue?: (args: {
    task: string
    input?: Record<string, unknown>
    queue?: string
  }) => Promise<unknown>
}

async function queueOrderMaintenanceTask(
  payload: Payload,
  task: string,
  input: Record<string, unknown>,
  log?: Logger,
): Promise<boolean> {
  try {
    // A TypedJobs-generálás a konsolidációs migrációs loopig nem ismeri az új
    // taskokat — a runtime jobs.queue létezik, ezért strukturálisan castolunk.
    const jobs = (payload as unknown as { jobs?: JobsQueueLike }).jobs
    if (typeof jobs?.queue !== 'function') {
      return false
    }
    await jobs.queue({ task, input, queue: ORDER_MAINTENANCE_QUEUE })
    log?.info('számlázási job sorba állítva', { task, ...input })
    return true
  } catch (error) {
    log?.warn('számlázási job sorba állítása sikertelen (best-effort)', {
      task,
      ...input,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/** A stornó-kiállítás újrapróbálása egy rendelésre (teljes visszatérítés). */
export function queueStornoIssueJob(
  payload: Payload,
  orderId: number,
  log?: Logger,
): Promise<boolean> {
  return queueOrderMaintenanceTask(payload, 'storno-issue', { orderId }, log)
}

/**
 * A helyesbítő számla kiállításának újrapróbálása egy részleges
 * visszatérítéshez (a refunds-nyom 1-alapú sorszámával — ez az idempotencia
 * kulcsa, az összeg a nyomból olvasható vissza).
 */
export function queueCorrectiveInvoiceJob(
  payload: Payload,
  orderId: number,
  refundSeq: number,
  log?: Logger,
): Promise<boolean> {
  return queueOrderMaintenanceTask(payload, 'corrective-invoice-issue', { orderId, refundSeq }, log)
}
