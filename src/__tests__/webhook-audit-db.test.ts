import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import configPromise from '../payload.config'
import { processWebhook, webhookEventStore } from '../lib/idempotency'
import { isDatabaseAvailable } from './helpers/db-available'

/**
 * DB-s integrációs tesztek (T-014/T-015).
 *
 * Feltétel: a DATABASE_URI-n TÉNYLEGESEN elérhető Postgres (TCP-próba —
 * a CI álértékű DATABASE_URI-jánál az env-alapú kapcsoló hamis pozitívot
 * adna, és a getPayload-kísérlet kezeletlen rejectiont hagyna a pg poolból)
 * ÉS a webhook_events / audit_logs táblák léteznek (a konszolidáló migrációs
 * loop hozza létre őket — addig a tesztek szépészedve kihagyódnak, lásd a
 * probe-logikát).
 */
const hasDb = await isDatabaseAvailable()

describe.skipIf(!hasDb)('webhook + audit (DB)', () => {
  let payload: Payload
  let tablesReady = false

  beforeAll(async () => {
    try {
      payload = await getPayload({ config: configPromise })
      await webhookEventStore(payload).find({ collection: 'webhook-events', limit: 1 })
      await payload.find({ collection: 'audit-logs' as 'users', limit: 1, overrideAccess: true })
      tablesReady = true
    } catch {
      // Nincs elérhető DB, vagy a konszolidáló migráció még nem futott —
      // a tesztek kihagyódnak (lásd a fájl fejlécét).
      tablesReady = false
      await payload?.db?.destroy?.().catch(() => undefined)
    }
  }, 120_000)

  afterAll(async () => {
    await payload?.db?.destroy?.()
  })

  it('(provider, externalId) unique constraint + dedup: a handler csak egyszer fut', async (ctx) => {
    if (!tablesReady) {
      ctx.skip()
      return
    }
    const store = webhookEventStore(payload)
    const externalId = `test-dedup-${Date.now()}`
    let handlerCalls = 0

    const first = await processWebhook({
      store,
      provider: 'barion',
      externalId,
      handler: async () => {
        handlerCalls += 1
        return 'ok'
      },
    })
    const second = await processWebhook({
      store,
      provider: 'barion',
      externalId,
      handler: async () => {
        handlerCalls += 1
        return 'ok'
      },
    })

    expect(first.kind).toBe('processed')
    expect(second.kind).toBe('already-processed')
    expect(handlerCalls).toBe(1)

    // A DB-unique is kikényszeríti: közvetlen create duplikátummal hibát dob.
    await expect(
      store.create({
        collection: 'webhook-events',
        data: { provider: 'barion', externalId, status: 'received' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  }, 60_000)

  it('users role-change → audit-bejegyzés before/after-rel (injekciós hook)', async (ctx) => {
    if (!tablesReady) {
      ctx.skip()
      return
    }
    const suffix = Date.now()
    const subject = await payload.create({
      collection: 'users',
      data: {
        email: `audit-test-${suffix}@example.com`,
        password: `Teszt-${suffix}!`,
        name: 'Audit Teszt',
        role: 'customer',
      },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'users',
      id: subject.id,
      data: { role: 'staff' },
      overrideAccess: true,
    })

    const logs = await payload.find({
      collection: 'audit-logs' as 'users',
      where: {
        and: [
          { action: { equals: 'role-change' } },
          { entityType: { equals: 'users' } },
          { entityId: { equals: String(subject.id) } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    expect(logs.totalDocs).toBe(1)
    const entry = logs.docs[0] as unknown as {
      before?: { role?: string }
      after?: { role?: string }
    }
    expect(entry.before?.role).toBe('customer')
    expect(entry.after?.role).toBe('staff')

    // Cleanup (overrideAccess-szel a rendszer-only access ellenére is megy).
    await payload.delete({ collection: 'users', id: subject.id, overrideAccess: true })
    await payload.delete({
      collection: 'audit-logs' as 'users',
      id: logs.docs[0].id,
      overrideAccess: true,
    })
  }, 60_000)
})
