import { describe, expect, it, vi } from 'vitest'

import { queueCorrectiveInvoiceJob, queueStornoIssueJob } from '@/lib/szamlazz/queue'

function payloadWithoutQueue() {
  return {} as never
}

describe('szamlazz/queue — hiányzó jobs.queue (W6)', () => {
  it('queueStornoIssueJob riaszt és false-t ad, nem dob', async () => {
    const error = vi.fn()
    const ok = await queueStornoIssueJob(payloadWithoutQueue(), 101, {
      error,
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      child: () => ({ error }),
    } as never)
    expect(ok).toBe(false)
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('RIASZTÁS'),
      expect.objectContaining({ task: 'storno-issue', orderId: 101 }),
    )
  })

  it('queueCorrectiveInvoiceJob riaszt és false-t ad', async () => {
    const error = vi.fn()
    const ok = await queueCorrectiveInvoiceJob(payloadWithoutQueue(), 101, 2, {
      error,
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      child: () => ({ error }),
    } as never)
    expect(ok).toBe(false)
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('RIASZTÁS'),
      expect.objectContaining({ task: 'corrective-invoice-issue', orderId: 101, refundSeq: 2 }),
    )
  })
})
