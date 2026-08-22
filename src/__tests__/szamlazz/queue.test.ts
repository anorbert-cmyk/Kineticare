import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LogContext, Logger } from '../../lib/logger'
import { queueCorrectiveInvoiceJob, queueStornoIssueJob } from '../../lib/szamlazz/queue'

/**
 * W6 — a hiányzó `payload.jobs.queue` NEM lehet néma.
 *
 * A `queueOrderMaintenanceTask` a jobs.queue meglétét strukturálisan
 * (`as unknown as`) ellenőrzi. Ha a függvény hiányzik, korábban `false`-szal
 * lépett ki egyetlen naplósor nélkül. A queueInvoiceIssueJob (P2) már
 * error-szintű RIASZTÁST ír ilyenkor — ezt a mintát kell követnie a
 * stornó / helyesbítő sorbaállításnak is.
 */

interface CapturedLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  msg: string
  context?: LogContext
}

function createCapturingLogger(entries: CapturedLogEntry[] = []): {
  log: Logger
  entries: CapturedLogEntry[]
} {
  const write =
    (level: CapturedLogEntry['level']) =>
    (msg: string, context?: LogContext): void => {
      entries.push(context === undefined ? { level, msg } : { level, msg, context })
    }
  const log: Logger = {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
    child: () => log,
  }
  return { log, entries }
}

describe('számlázási job-sor — a hiányzó jobs.queue RIASZTÁST ad, nem csendet', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('payload.jobs nélkül: false + error-szintű RIASZTÁS a task nevével és az orderId-val', async () => {
    const { log, entries } = createCapturingLogger()

    const queued = await queueStornoIssueJob({} as unknown as Payload, 101, log)

    expect(queued).toBe(false)
    const alerts = entries.filter((entry) => entry.level === 'error')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].msg).toContain('RIASZTÁS')
    expect(alerts[0].context).toMatchObject({ task: 'storno-issue', orderId: 101 })
  })

  it('helyesbítő: a RIASZTÁS a refundSeq-et is viszi', async () => {
    const { log, entries } = createCapturingLogger()

    const queued = await queueCorrectiveInvoiceJob({} as unknown as Payload, 202, 3, log)

    expect(queued).toBe(false)
    const alerts = entries.filter((entry) => entry.level === 'error')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].msg).toContain('RIASZTÁS')
    expect(alerts[0].context).toMatchObject({
      task: 'corrective-invoice-issue',
      orderId: 202,
      refundSeq: 3,
    })
  })

  it('a `jobs.queue` NEM függvény — szintén RIASZTÁS', async () => {
    const { log, entries } = createCapturingLogger()

    const queued = await queueStornoIssueJob(
      { jobs: { queue: 'ez nem függvény' } } as unknown as Payload,
      303,
      log,
    )

    expect(queued).toBe(false)
    expect(entries.filter((entry) => entry.level === 'error')).toHaveLength(1)
  })

  it('működő job-sor mellett NINCS riasztás (negatív kontroll)', async () => {
    const { log, entries } = createCapturingLogger()
    const queue = vi.fn(async () => ({ id: 1 }))

    const queued = await queueCorrectiveInvoiceJob(
      { jobs: { queue } } as unknown as Payload,
      404,
      1,
      log,
    )

    expect(queued).toBe(true)
    expect(queue).toHaveBeenCalledTimes(1)
    expect(entries.filter((entry) => entry.level === 'error')).toHaveLength(0)
  })
})
