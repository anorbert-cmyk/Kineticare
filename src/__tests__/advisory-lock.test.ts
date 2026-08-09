import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { withAdvisoryLock } from '../lib/advisory-lock'
import { createLogger } from '../lib/logger'

/**
 * S2 — Postgres advisory-zár (src/lib/advisory-lock.ts).
 *
 * A tesztek a drizzle-példányt szerkezetileg utánozzák (tranzakció + execute),
 * és azt igazolják, hogy
 *  - a zár a `fn` ELŐTT kerül megszerzésre, a tranzakción belül,
 *  - a kulcs KÖTÖTT paraméterként megy át (nincs string-összefűzés),
 *  - a `fn` hibája a tranzakción keresztül propagál (a zárat a Postgres a
 *    rollbacknél elengedi — kézi unlock nincs),
 *  - drizzle nélkül production-ben DOB (nem fut némán, zár nélkül),
 *    nem-production környezetben viszont zár nélkül lefut.
 */

interface CapturedQuery {
  sql: string
  params: unknown[]
}

/** Szerkezeti drizzle-mock: a valódi példány `transaction` + `execute` felülete. */
function createDrizzleMock() {
  const queries: CapturedQuery[] = []
  const order: string[] = []
  const drizzle = {
    transaction: async <T>(run: (tx: { execute: (query: unknown) => Promise<unknown> }) => Promise<T>): Promise<T> => {
      order.push('transaction-start')
      try {
        return await run({
          execute: async (query: unknown) => {
            const candidate = query as { queryChunks?: unknown[] }
            // A drizzle `sql` template SQL-objektumot ad: a szöveges darabok
            // (StringChunk, `value` = string-tömb) és a kötött paraméterek
            // KÜLÖN élnek a queryChunks-ban — pont ezt akarjuk igazolni.
            const chunks = Array.isArray(candidate.queryChunks) ? candidate.queryChunks : []
            const text: string[] = []
            const params: unknown[] = []
            for (const chunk of chunks) {
              const stringChunk =
                typeof chunk === 'object' && chunk !== null
                  ? (chunk as { value?: unknown }).value
                  : undefined
              if (Array.isArray(stringChunk)) {
                text.push(stringChunk.join(''))
              } else {
                params.push(chunk)
              }
            }
            queries.push({ sql: text.join(''), params })
            order.push('lock-acquired')
            return { rows: [] }
          },
        })
      } finally {
        order.push('transaction-end')
      }
    },
  }
  const payload = { db: { drizzle } } as unknown as Payload
  return { payload, queries, order }
}

const logOutput = (spy: MockInstance<(...args: unknown[]) => void>): string =>
  spy.mock.calls.map((call) => call.map((arg) => String(arg)).join(' ')).join('\n')

afterEach(() => {
  // A NODE_ENV a Next.js típusaiban csak olvasható, ezért a vitest env-stubja
  // (nem közvetlen értékadás) állítja — a unstub visszaadja az eredetit.
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('withAdvisoryLock — drizzle-példánnyal', () => {
  it('a zárat a fn ELŐTT szerzi meg, tranzakción belül, és a fn értékét adja vissza', async () => {
    const { payload, order } = createDrizzleMock()

    const result = await withAdvisoryLock(
      payload,
      'checkout:7:42',
      async () => {
        order.push('fn')
        return 'kesz'
      },
      createLogger(),
    )

    expect(result).toBe('kesz')
    expect(order).toEqual(['transaction-start', 'lock-acquired', 'fn', 'transaction-end'])
  })

  it('pg_advisory_xact_lock + hashtextextended, a kulcs KÖTÖTT paraméterként', async () => {
    const { payload, queries } = createDrizzleMock()

    await withAdvisoryLock(payload, 'checkout:7:42', async () => undefined, createLogger())

    expect(queries).toHaveLength(1)
    const [query] = queries
    expect(query.sql).toContain('pg_advisory_xact_lock')
    expect(query.sql).toContain('hashtextextended')
    // A kulcs NEM része a lekérdezés szövegének — paraméterként utazik.
    expect(query.sql).not.toContain('checkout:7:42')
    expect(query.params).toEqual(['checkout:7:42'])
  })

  it('a fn hibája propagál (a zár a rollbackkel magától elengedődik)', async () => {
    const { payload, order } = createDrizzleMock()

    await expect(
      withAdvisoryLock(
        payload,
        'checkout:7:42',
        async () => {
          throw new Error('üzleti hiba a védett szakaszban')
        },
        createLogger(),
      ),
    ).rejects.toThrowError(/üzleti hiba a védett szakaszban/)

    expect(order).toEqual(['transaction-start', 'lock-acquired', 'transaction-end'])
  })
})

describe('withAdvisoryLock — drizzle nélkül', () => {
  const payloadWithoutDrizzle = { db: {} } as unknown as Payload

  it('PRODUCTION-ben riaszt és DOB (néma, zár nélküli futás TILOS)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    const fn = vi.fn(async () => 'nem futhat')

    await expect(
      withAdvisoryLock(payloadWithoutDrizzle, 'checkout:7:42', fn, createLogger()),
    ).rejects.toThrowError(/nem szerezhető meg/)

    expect(fn).not.toHaveBeenCalled()
    expect(logOutput(logSpy)).toContain('RIASZT')
  })

  it('nem-production környezetben a fn zár nélkül lefut, figyelmeztetéssel', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'test')

    const result = await withAdvisoryLock(
      payloadWithoutDrizzle,
      'checkout:7:42',
      async () => 'lefutott',
      createLogger(),
    )

    expect(result).toBe('lefutott')
    expect(logOutput(logSpy)).toContain('advisory-zár kihagyva')
  })
})
