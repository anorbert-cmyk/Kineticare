import { afterEach, describe, expect, it, vi } from 'vitest'

import { correctiveInvoiceIssueTask } from '../../jobs/tasks/corrective-invoice-issue'
import { stornoIssueTask } from '../../jobs/tasks/storno-issue'
import type { Order } from '../../payload-types'

/**
 * A stornó- és helyesbítő-jobok bekötése (C4/C5) — a taskok vékony rétegének
 * szerződése: input-validáció, kikapcsolt integráció, hiányzó rendelés és a
 * refund-nyom sorszám-feloldása. A hálózati ág a szolgáltatás-tesztekben fut
 * (szamlazz/storno.test.ts, szamlazz/corrective.test.ts).
 *
 * DUMMY érték, egyértelműen jelölve — NEM valódi Számla Agent kulcs.
 */
const DUMMY_AGENT_KEY = 'DUMMY-AGENT-KULCS-NEM-VALODI-TITOK'

interface TaskResult {
  output: Record<string, unknown>
}

/** A TaskConfig.handler string is lehet — a teszt a függvény-ágat futtatja. */
async function runTask(task: { handler: unknown }, args: unknown): Promise<TaskResult> {
  const { handler } = task
  if (typeof handler !== 'function') {
    throw new Error('a task handlere nem függvény')
  }
  return (handler as (a: unknown) => Promise<TaskResult>)(args)
}

function reqWith(order: Order | null) {
  const findByID = vi.fn(async () => order)
  return { req: { payload: { findByID } }, findByID }
}

function withAgentKey(): () => void {
  const previous = process.env.SZAMLAZZ_AGENT_KEY
  process.env.SZAMLAZZ_AGENT_KEY = DUMMY_AGENT_KEY
  return () => {
    if (previous === undefined) {
      delete process.env.SZAMLAZZ_AGENT_KEY
    } else {
      process.env.SZAMLAZZ_AGENT_KEY = previous
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storno-issue task', () => {
  it('a slug, a queue-beli retry-szám és az input-séma az invoice-issue mintáját követi', () => {
    expect(stornoIssueTask.slug).toBe('storno-issue')
    expect(stornoIssueTask.retries).toBe(3)
    expect(stornoIssueTask.inputSchema?.[0]).toMatchObject({ name: 'orderId', required: true })
  })

  it('érvénytelen orderId → dob (a job hibára fut, nem hallgat)', async () => {
    const { req } = reqWith(null)
    await expect(runTask(stornoIssueTask, { req, input: { orderId: 'x' } })).rejects.toThrow(
      'érvénytelen orderId',
    )
  })

  it('kikapcsolt integrációnál disabled — a rendeléshez sem nyúl', async () => {
    const previous = process.env.SZAMLAZZ_AGENT_KEY
    delete process.env.SZAMLAZZ_AGENT_KEY
    try {
      const { req, findByID } = reqWith(null)
      const result = await runTask(stornoIssueTask, { req, input: { orderId: 555 } })
      expect(result.output).toEqual({ outcome: 'disabled' })
      expect(findByID).not.toHaveBeenCalled()
    } finally {
      if (previous !== undefined) {
        process.env.SZAMLAZZ_AGENT_KEY = previous
      }
    }
  })

  it('ismeretlen rendelésnél failed, magyar indokkal', async () => {
    const restore = withAgentKey()
    try {
      const { req } = reqWith(null)
      const result = await runTask(stornoIssueTask, { req, input: { orderId: 555 } })
      expect(result.output).toEqual({ outcome: 'failed', reason: 'a rendelés nem található' })
    } finally {
      restore()
    }
  })
})

describe('corrective-invoice-issue task', () => {
  it('a slug, a retry-szám és az input-séma (orderId + refundSeq)', () => {
    expect(correctiveInvoiceIssueTask.slug).toBe('corrective-invoice-issue')
    expect(correctiveInvoiceIssueTask.retries).toBe(3)
    expect(correctiveInvoiceIssueTask.inputSchema).toMatchObject([
      { name: 'orderId', required: true },
      { name: 'refundSeq', required: true },
    ])
  })

  it('érvénytelen refundSeq → dob', async () => {
    const { req } = reqWith(null)
    await expect(
      runTask(correctiveInvoiceIssueTask, { req, input: { orderId: 555, refundSeq: 0 } }),
    ).rejects.toThrow('érvénytelen refundSeq')
  })

  it('ismeretlen sorszámú visszatérítésnél failed (nem állít ki bizonylatot)', async () => {
    const restore = withAgentKey()
    try {
      const order = { id: 555, orderNumber: 'KH-2026-000777', refunds: [] } as unknown as Order
      const { req } = reqWith(order)
      const result = await runTask(correctiveInvoiceIssueTask, {
        req,
        input: { orderId: 555, refundSeq: 3 },
      })
      expect(result.output).toEqual({
        outcome: 'failed',
        reason: 'ismeretlen visszatérítés-sorszám',
      })
    } finally {
      restore()
    }
  })
})
