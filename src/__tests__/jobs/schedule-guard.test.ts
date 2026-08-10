import type { PayloadRequest, Where } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  createStaleAwareBeforeSchedule,
  STALE_SCHEDULED_JOB_MS,
} from '../../jobs/schedule-guard'
import { ORDER_MAINTENANCE_QUEUE } from '../../jobs/queues'
import type { LogContext, Logger } from '../../lib/logger'

/**
 * A beragadás-tűrő ütemezés-őr EGYSÉGTESZTJE — a DÖNTÉS mellett a RIASZTÁST is
 * méri. (A Payload valódi ütemezőjével összekötött viselkedést a
 * handle-schedules.test.ts bizonyítja; itt a naplózás és a küszöb a tárgy, mert
 * élesben egy beragadt job kizárólag ebből a naplósorból derül ki.)
 */

interface LogEntry {
  level: 'debug' | 'error' | 'info' | 'warn'
  msg: string
  context?: LogContext
}

function createRecordingLogger(entries: LogEntry[]): Logger {
  const logger: Logger = {
    debug: (msg, context) => entries.push({ level: 'debug', msg, context }),
    info: (msg, context) => entries.push({ level: 'info', msg, context }),
    warn: (msg, context) => entries.push({ level: 'warn', msg, context }),
    error: (msg, context) => entries.push({ level: 'error', msg, context }),
    child: () => logger,
  }
  return logger
}

const NOW = Date.parse('2026-08-10T12:00:00Z')
const TASK_SLUG = 'order-poll'

interface Scenario {
  /** A számolások eredménye: [„fut vagy futtatható", „ebből beragadt"]. */
  counts: [number, number]
  staleAfterMs?: number
  countThrows?: boolean
}

function isStaleCountQuery(where: Where): boolean {
  const conditions = Array.isArray(where.and) ? where.and : []
  return conditions.some((condition) => 'processing' in condition)
}

async function run(scenario: Scenario) {
  const entries: LogEntry[] = []
  const seenWheres: Where[] = []

  const req = {
    payload: {
      db: {
        count: async ({ where }: { where: Where }) => {
          if (scenario.countThrows) {
            throw new Error('kapcsolat megszakadt')
          }
          seenWheres.push(where)
          const [blocking, stale] = scenario.counts
          return { totalDocs: isStaleCountQuery(where) ? stale : blocking }
        },
      },
    },
  } as unknown as PayloadRequest

  const waitUntil = new Date(NOW + 60_000)
  const beforeSchedule = createStaleAwareBeforeSchedule({
    taskSlug: TASK_SLUG,
    logger: createRecordingLogger(entries),
    now: () => NOW,
    ...(scenario.staleAfterMs === undefined ? {} : { staleAfterMs: scenario.staleAfterMs }),
  })

  const result = await beforeSchedule({
    defaultBeforeSchedule: async () => ({ shouldSchedule: false }),
    jobStats: null as never,
    queueable: {
      scheduleConfig: { cron: '*/5 * * * *', queue: ORDER_MAINTENANCE_QUEUE },
      waitUntil,
    } as never,
    req,
  })

  return { entries, result, seenWheres, waitUntil }
}

describe('schedule-guard — döntés', () => {
  it('nincs kintlévő job → ütemez, és továbbadja a waitUntil-t', async () => {
    const { result, waitUntil, entries } = await run({ counts: [0, 0] })

    expect(result.shouldSchedule).toBe(true)
    expect(result.waitUntil).toBe(waitUntil)
    // Nincs mit jelenteni: normál eset, néma.
    expect(entries).toHaveLength(0)
  })

  it('ÉLŐ job → nem ütemez (duplikátum-védelem), riasztás nélkül', async () => {
    const { result, entries } = await run({ counts: [1, 0] })

    expect(result.shouldSchedule).toBe(false)
    expect(entries).toHaveLength(0)
  })

  it('csak BERAGADT job → ütemez, és RIASZTÁS-t naplóz', async () => {
    const { result, entries } = await run({ counts: [1, 1] })

    expect(result.shouldSchedule).toBe(true)
    expect(entries).toHaveLength(1)
    expect(entries[0].level).toBe('error')
    expect(entries[0].msg).toContain('RIASZTÁS')
    expect(entries[0].msg).toContain('beragadt job')
    expect(entries[0].context).toMatchObject({
      queue: ORDER_MAINTENANCE_QUEUE,
      stuckJobs: 1,
    })
  })

  it('beragadt ÉS élő job → nem ütemez, de figyelmeztet a beragadtra', async () => {
    const { result, entries } = await run({ counts: [2, 1] })

    expect(result.shouldSchedule).toBe(false)
    expect(entries).toHaveLength(1)
    expect(entries[0].level).toBe('warn')
    expect(entries[0].context).toMatchObject({ stuckJobs: 1, runnableOrActiveJobs: 2 })
  })

  /**
   * Hibás számolásnál ZÁRT irányba tévedünk: inkább kimarad egy kör, mint hogy
   * duplikátum keletkezzen. A következő cron-tick újrapróbálja — de a hibáról
   * szólni kell, különben ez is néma leállás lenne.
   */
  it('a számolás hibája → nem ütemez, és hangosan szól', async () => {
    const { result, entries } = await run({ counts: [0, 0], countThrows: true })

    expect(result.shouldSchedule).toBe(false)
    expect(entries).toHaveLength(1)
    expect(entries[0].level).toBe('error')
    expect(entries[0].msg).toContain('RIASZTÁS')
  })
})

describe('schedule-guard — a lekérdezések alakja', () => {
  it('a beragadás-küszöb a MOST mínusz staleAfterMs időpontra szűr', async () => {
    const staleAfterMs = 7 * 60 * 1000
    const { seenWheres } = await run({ counts: [1, 0], staleAfterMs })

    const staleQuery = seenWheres.find(isStaleCountQuery)
    expect(staleQuery).toBeDefined()
    expect(staleQuery?.and).toContainEqual({
      updatedAt: { less_than: new Date(NOW - staleAfterMs).toISOString() },
    })
    expect(staleQuery?.and).toContainEqual({ processing: { equals: true } })
  })

  it('alapértelmezésben a 15 perces küszöb érvényes', async () => {
    const { seenWheres } = await run({ counts: [1, 0] })

    expect(seenWheres.find(isStaleCountQuery)?.and).toContainEqual({
      updatedAt: { less_than: new Date(NOW - STALE_SCHEDULED_JOB_MS).toISOString() },
    })
  })

  it('mindkét számolás a queue-ra ÉS a task slugjára szűkít', async () => {
    const { seenWheres } = await run({ counts: [1, 1] })

    expect(seenWheres).toHaveLength(2)
    for (const where of seenWheres) {
      expect(where.and).toContainEqual({ queue: { equals: ORDER_MAINTENANCE_QUEUE } })
      expect(where.and).toContainEqual({ taskSlug: { equals: TASK_SLUG } })
      expect(where.and).toContainEqual({ completedAt: { exists: false } })
      expect(where.and).toContainEqual({ error: { exists: false } })
    }
  })
})
