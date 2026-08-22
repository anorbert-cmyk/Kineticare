import { describe, expect, it, vi } from 'vitest'

import {
  isRetryDue,
  isUniqueViolation,
  MAX_WEBHOOK_ATTEMPTS,
  processWebhook,
  retryDelayMs,
  type WebhookEventDoc,
  type WebhookEventStore,
} from '../lib/idempotency'

/**
 * Állapottartó in-memory mock store — a (provider, externalId) egyedi kulcsot
 * is kikényszeríti (23505-ös hibával), így a dedup és a versenyhelyzet
 * valódisághűen tesztelhető DB nélkül.
 */
function createMockStore(initial: WebhookEventDoc[] = []) {
  const docs = [...initial]
  let nextId = docs.length + 1

  const store: WebhookEventStore = {
    find: async ({ where }) => {
      const and =
        where && typeof where === 'object' && 'and' in where && Array.isArray(where.and)
          ? (where.and as Array<Record<string, Record<string, string>>>)
          : []
      const provider = and.find((clause) => 'provider' in clause)?.provider?.equals
      const externalId = and.find((clause) => 'externalId' in clause)?.externalId?.equals
      const matched = docs.filter(
        (doc) =>
          (provider === undefined || doc.provider === provider) &&
          (externalId === undefined || doc.externalId === externalId),
      )
      return { docs: matched, totalDocs: matched.length }
    },
    create: async ({ data }) => {
      const duplicate = docs.some(
        (doc) => doc.provider === data.provider && doc.externalId === data.externalId,
      )
      if (duplicate) {
        const error = new Error(
          'duplicate key value violates unique constraint "webhook_events_provider_external_id"',
        ) as Error & { code: string }
        error.code = '23505'
        throw error
      }
      const doc: WebhookEventDoc = {
        id: nextId++,
        provider: data.provider as WebhookEventDoc['provider'],
        externalId: data.externalId as string,
        status: (data.status as WebhookEventDoc['status']) ?? 'received',
        attempts: (data.attempts as number) ?? 0,
        eventType: data.eventType as string | undefined,
        payload: data.payload,
        requestId: data.requestId as string | undefined,
      }
      docs.push(doc)
      return doc
    },
    update: async ({ id, data }) => {
      const doc = docs.find((candidate) => candidate.id === id)
      if (!doc) {
        throw new Error(`nincs ilyen rekord: ${id}`)
      }
      Object.assign(doc, data)
      return doc
    },
  }

  return { store, docs }
}

const baseParams = {
  provider: 'barion' as const,
  externalId: 'payment-123',
  eventType: 'payment.state',
}

describe('processWebhook', () => {
  it('első alkalommal lefuttatja a handlert és processed-re állítja a rekordot', async () => {
    const { store, docs } = createMockStore()
    const handler = vi.fn(async () => ({ ok: true }))

    const outcome = await processWebhook({ store, ...baseParams, handler })

    expect(outcome).toMatchObject({ kind: 'processed', attempts: 1, result: { ok: true } })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(docs[0]).toMatchObject({ status: 'processed', attempts: 1 })
  })

  it('második alkalommal NO-OP: a handler nem fut újra, already-processed jelzéssel tér vissza', async () => {
    const { store, docs } = createMockStore()
    const handler = vi.fn(async () => ({ ok: true }))

    const first = await processWebhook({ store, ...baseParams, handler })
    const second = await processWebhook({ store, ...baseParams, handler })
    const third = await processWebhook({ store, ...baseParams, handler })

    // A kétszeres feldolgozás kizárva: a handler pontosan egyszer futott.
    expect(first.kind).toBe('processed')
    expect(second.kind).toBe('already-processed')
    expect(third.kind).toBe('already-processed')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(docs).toHaveLength(1)
    expect(docs[0].attempts).toBe(1)
  })

  it('W13: pending_repoll a MAX kísérletnél failed, nem néma siker', async () => {
    const pending: WebhookEventDoc = {
      id: 11,
      provider: 'barion',
      externalId: 'payment-pending-repoll',
      status: 'received',
      attempts: MAX_WEBHOOK_ATTEMPTS - 1,
      result: 'pending_repoll',
    }
    const { store, docs } = createMockStore([pending])
    const handler = vi.fn(async () => ({ webhookNonTerminal: true, status: 'payment_pending' }))

    const outcome = await processWebhook({
      store,
      provider: 'barion',
      externalId: 'payment-pending-repoll',
      handler,
    })

    expect(outcome).toMatchObject({
      kind: 'failed',
      attempts: MAX_WEBHOOK_ATTEMPTS,
      retryable: false,
    })
    expect(docs[0]).toMatchObject({
      status: 'failed',
      attempts: MAX_WEBHOOK_ATTEMPTS,
      lastError: expect.stringContaining('pending_repoll'),
    })
  })

  it('failed esemény újrapróbálható: attempts nő, siker esetén processed lesz', async () => {
    const { store, docs } = createMockStore()
    const failing = vi.fn(async () => {
      throw new Error('Barion API timeout')
    })

    const failed = await processWebhook({ store, ...baseParams, handler: failing })
    expect(failed).toMatchObject({ kind: 'failed', attempts: 1, retryable: true })
    expect(docs[0]).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Barion API timeout',
    })

    const succeeding = vi.fn(async () => 'kész')
    const retried = await processWebhook({ store, ...baseParams, handler: succeeding })
    expect(retried).toMatchObject({ kind: 'processed', attempts: 2 })
    expect(succeeding).toHaveBeenCalledTimes(1)
    expect(docs[0]).toMatchObject({ status: 'processed', attempts: 2, lastError: null })
  })

  it('MAX_WEBHOOK_ATTEMPTS után nem retryable', async () => {
    const exhausted: WebhookEventDoc = {
      id: 9,
      provider: 'barion',
      externalId: 'payment-exhausted',
      status: 'failed',
      attempts: MAX_WEBHOOK_ATTEMPTS,
    }
    const { store } = createMockStore([exhausted])
    const failing = vi.fn(async () => {
      throw new Error('még mindig rossz')
    })

    const outcome = await processWebhook({
      store,
      provider: 'barion',
      externalId: 'payment-exhausted',
      handler: failing,
    })

    expect(outcome).toMatchObject({
      kind: 'failed',
      attempts: MAX_WEBHOOK_ATTEMPTS + 1,
      retryable: false,
    })
  })

  it('versenyhelyzet: a create unique-violationja in-progress jelzés, a handler nem fut', async () => {
    const { store, docs } = createMockStore()

    // A find még nem látja a rekordot, de a create már unique-violationbe ütközik:
    // mintha egy párhuzamos worker pont most hozta volna létre (az újra-olvasás
    // már látja is a párhuzamos worker rekordját).
    const originalFind = store.find
    let findCalls = 0
    store.find = async (args) => {
      findCalls += 1
      if (findCalls === 1) {
        return { docs: [], totalDocs: 0 }
      }
      return originalFind(args)
    }
    store.create = async () => {
      docs.push({
        id: 1,
        provider: 'barion',
        externalId: 'payment-race',
        status: 'received',
        attempts: 0,
      })
      const error = new Error('duplicate key value violates unique constraint') as Error & {
        code: string
      }
      error.code = '23505'
      throw error
    }

    const handler = vi.fn(async () => undefined)
    const outcome = await processWebhook({
      store,
      provider: 'barion',
      externalId: 'payment-race',
      handler,
    })

    expect(outcome).toMatchObject({ kind: 'in-progress', eventId: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('nem-unique hiba a create-ben propagálódik (nem idempotencia-ügy)', async () => {
    const { store } = createMockStore()
    store.create = async () => {
      throw new Error('kapcsolat megszakadt')
    }

    await expect(
      processWebhook({ store, ...baseParams, handler: async () => undefined }),
    ).rejects.toThrow('kapcsolat megszakadt')
  })
})

describe('isUniqueViolation', () => {
  it('23505-ös kódot és cause-láncot is felismer', () => {
    expect(isUniqueViolation(Object.assign(new Error('x'), { code: '23505' }))).toBe(true)
    expect(
      isUniqueViolation(
        Object.assign(new Error('drizzle hiba'), {
          cause: Object.assign(new Error('duplicate key value violates unique constraint'), {}),
        }),
      ),
    ).toBe(true)
    expect(isUniqueViolation(new Error('egyéb hiba'))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})

describe('retry backoff', () => {
  it('exponenciális, plafonozott késleltetés', () => {
    expect(retryDelayMs(1)).toBe(60_000)
    expect(retryDelayMs(2)).toBe(120_000)
    expect(retryDelayMs(3)).toBe(240_000)
    expect(retryDelayMs(100)).toBe(3_600_000)
  })

  it('isRetryDue a várakozási idő letelte után engedi az újrapróbálást', () => {
    const now = Date.parse('2026-07-30T12:00:00Z')
    const recent: WebhookEventDoc = {
      id: 1,
      provider: 'barion',
      externalId: 'x',
      status: 'failed',
      attempts: 2,
      updatedAt: '2026-07-30T11:59:00Z', // 1 perce — 2. kísérletnél még 2 perc kell
    }
    const old: WebhookEventDoc = { ...recent, updatedAt: '2026-07-30T11:55:00Z' }
    expect(isRetryDue(recent, now)).toBe(false)
    expect(isRetryDue(old, now)).toBe(true)
  })
})
