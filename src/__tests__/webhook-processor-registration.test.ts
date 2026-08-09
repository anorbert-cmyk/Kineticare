import type { Payload } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getWebhookProcessor } from '../lib/idempotency'
import configPromise from '../payload.config'

/**
 * M-15 — a Barion webhook-feldolgozó DETERMINISZTIKUS regisztrációja.
 *
 * A webhook-retry job (src/jobs/tasks/webhook-retry.ts) csak REGISZTRÁLT
 * feldolgozójú eseményeket futtat újra: `getWebhookProcessor(provider)` nélkül
 * az esemény `skipped`-ként átugrik, tehát az elhasalt Barion-callback SOSEM
 * kerül újrapróbálásra. A regisztráció korábban kizárólag a callback-route
 * MODUL-BETÖLTÉSÉNEK mellékhatásaként futott le — a Next.js viszont lustán
 * tölti be a route-modulokat, így az order-poll/retry útvonalon (amely a
 * callback-route-ot nem érinti) a feldolgozó hiányozhatott.
 *
 * Ez a teszt a payload.config `onInit`-jét futtatja egy mock Payload-példánnyal,
 * és azt bizonyítja, hogy a route betöltése NÉLKÜL is regisztrálva lesz a
 * 'barion' feldolgozó. A vitest fájlonként külön modul-registryt használ, ezért
 * a Map itt garantáltan üresen indul.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

/** onInit-hez elég egy szerkezeti mock; a seedelő lépések hibája best-effort. */
function fakePayload(): Payload {
  return {
    db: { pool: { on: vi.fn() } },
    find: async () => {
      throw new Error('nincs adatbázis')
    },
  } as unknown as Payload
}

describe('webhook-feldolgozó regisztráció (M-15)', () => {
  it('az onInit ELŐTT nincs regisztrált barion-feldolgozó (a teszt kiindulópontja tiszta)', () => {
    expect(getWebhookProcessor('barion')).toBeUndefined()
  })

  it('az onInit a callback-route betöltése NÉLKÜL is regisztrálja a barion-feldolgozót', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const config = await configPromise

    await config.onInit?.(fakePayload())

    expect(typeof getWebhookProcessor('barion')).toBe('function')
    // Nem bekötött providerre továbbra sem keletkezik feldolgozó.
    expect(getWebhookProcessor('szamlazz')).toBeUndefined()
    expect(getWebhookProcessor('stream')).toBeUndefined()
  })

  it('a regisztráció a DB-t érintő, best-effort seedelés hibája ellenére is megtörténik', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const config = await configPromise
    const payload = fakePayload()

    // A seedelő lépések a hiányzó adatbázison elhasalnak (find → throw), az
    // onInit mégis végigfut, és a memóriabeli regisztrációk megmaradnak.
    await expect(config.onInit?.(payload)).resolves.toBeUndefined()

    expect(typeof getWebhookProcessor('barion')).toBe('function')
    // A pool-error handler regisztrációja is a helyén marad (nem szorította ki).
    const pool = (payload.db as unknown as { pool: { on: ReturnType<typeof vi.fn> } }).pool
    expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('a regisztrált feldolgozó a job-útvonalon hívható (a Payload-példányt lustán oldja fel)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const config = await configPromise
    await config.onInit?.(fakePayload())

    const processor = getWebhookProcessor('barion')
    expect(processor).toBeDefined()
    // A handler hívható felület: az esemény feldolgozása a Barion GetState-en
    // bukik el (nincs env/hálózat a tesztben), de a REGISZTRÁCIÓ ténye ettől
    // független — a webhook-retry pontosan ezt a függvényt hívná.
    expect(processor).toBeInstanceOf(Function)
    expect(processor?.length).toBe(1)
  })
})
