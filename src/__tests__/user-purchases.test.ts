import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { withAdvisoryLock } from '../lib/advisory-lock'
import { createLogger } from '../lib/logger'
import {
  updateUserPurchases,
  userPurchaseIds,
  userPurchasesLockKey,
  withUserPurchasesLock,
} from '../lib/user-purchases'

/**
 * K1 — elveszett `users.purchases` RMW.
 *
 * Két párhuzamos írás ugyanarra a vevőre, különböző termékkel: zár + záron
 * belüli újraolvasás nélkül a második szál az első `findByID` pillanatában
 * látott `[1]` listát írná vissza, és a másik termék elveszne.
 */

const originals = vi.hoisted(() => ({
  withAdvisoryLock: undefined as undefined | typeof withAdvisoryLock,
}))

vi.mock('../lib/advisory-lock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/advisory-lock')>()
  originals.withAdvisoryLock = actual.withAdvisoryLock
  return {
    ...actual,
    withAdvisoryLock: vi.fn(actual.withAdvisoryLock),
  }
})

vi.stubGlobal('fetch', () => {
  throw new Error('user-purchases teszt: valódi hálózati hívás TILOS')
})

afterEach(() => {
  const original = originals.withAdvisoryLock
  if (original) {
    vi.mocked(withAdvisoryLock).mockImplementation(original)
  }
})

/** Ugyanarra a lockKey-re FIFO-sor; különböző kulcsok párhuzamosan futhatnak. */
function installSerializingLock(): void {
  const queues = new Map<string, Promise<unknown>>()
  vi.mocked(withAdvisoryLock).mockImplementation(async (_payload, lockKey, fn) => {
    const previous = queues.get(lockKey) ?? Promise.resolve()
    const run = previous.then(
      () => fn(),
      () => fn(),
    )
    queues.set(
      lockKey,
      run.then(
        () => undefined,
        () => undefined,
      ),
    )
    return run
  })
}

function createUserStore(initial: number[] = [1]) {
  const user = { id: 7, purchases: [...initial] }
  const payload = {
    findByID: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection !== 'users') {
        throw new Error(`váratlan findByID: ${collection}`)
      }
      // Pillanatkép: ha ezt a záron KÍVÜL hívnánk, a versenytárs írása
      // után is a régi listát adnánk tovább.
      return { id: user.id, purchases: [...user.purchases] }
    }),
    update: vi.fn(async (args: { collection: string; data: { purchases?: number[] } }) => {
      if (args.collection === 'users' && args.data.purchases) {
        user.purchases = [...args.data.purchases]
      }
      return args.data
    }),
  }
  return { payload: payload as unknown as Payload, user }
}

describe('userPurchasesLockKey / userPurchaseIds', () => {
  it('a zárkulcs a vevő azonosítójára szabott', () => {
    expect(userPurchasesLockKey(7)).toBe('user-purchases:user:7')
    expect(userPurchasesLockKey('7')).toBe('user-purchases:user:7')
  })

  it('nyers id-t és populate-olt objektumot is id-listává alakít', () => {
    expect(userPurchaseIds({ purchases: [1, { id: 2 }, 3] })).toEqual([1, 2, 3])
    expect(userPurchaseIds({ purchases: null })).toEqual([])
    expect(userPurchaseIds(undefined)).toEqual([])
  })
})

describe('updateUserPurchases — elveszett RMW (K1)', () => {
  it('két átfedő írás ugyanarra a vevőre: a végállapot 1, 2 ÉS 3', async () => {
    installSerializingLock()
    const { payload, user } = createUserStore([1])
    const log = createLogger({ module: 'teszt-k1' })

    // Mindkét szál a záron kívül a `[1]` listát látná. A zár + újraolvasás
    // nélkül a második `[1, 3]`-at írna, és a 2-es termék elveszne.
    const [firstResult, secondResult] = await Promise.all([
      updateUserPurchases(payload, 7, (current) => [...current, 2], log),
      updateUserPurchases(payload, 7, (current) => [...current, 3], log),
    ])

    expect(user.purchases).toEqual(expect.arrayContaining([1, 2, 3]))
    expect(user.purchases).toHaveLength(3)
    expect(new Set(user.purchases)).toEqual(new Set([1, 2, 3]))
    expect(firstResult.wrote && secondResult.wrote).toBe(true)
    expect([firstResult.previous, secondResult.previous]).toContainEqual([1])
    expect(
      vi.mocked(withAdvisoryLock).mock.calls.every((call) => call[1] === 'user-purchases:user:7'),
    ).toBe(true)
  })

  it('azonos lista → nincs írás (idempotens no-op)', async () => {
    installSerializingLock()
    const { payload, user } = createUserStore([1, 2])

    const result = await updateUserPurchases(payload, 7, (current) => current)

    expect(result).toEqual({ previous: [1, 2], next: [1, 2], wrote: false })
    expect(user.purchases).toEqual([1, 2])
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('withUserPurchasesLock — drizzle nélküli (nem-production) skip', () => {
  it('drizzle nélküli mockon a védett szakasz lefut (meglévő advisory-lock skip)', async () => {
    const payload = { db: {} } as unknown as Payload
    const log = createLogger({ module: 'teszt-k1-skip' })

    const result = await withUserPurchasesLock(payload, 7, async () => 'lefutott', log)

    expect(result).toBe('lefutott')
  })

  it('updateUserPurchases drizzle nélkül is újraolvas és ír', async () => {
    const { payload, user } = createUserStore([1])

    const result = await updateUserPurchases(payload, 7, (current) => [...current, 4])

    expect(result.wrote).toBe(true)
    expect(user.purchases).toEqual([1, 4])
  })
})
