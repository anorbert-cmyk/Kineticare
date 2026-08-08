import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import configPromise from '../payload.config'

/**
 * Smoke-teszt: a payload.config betöltődik, és a várt collection-slugok
 * (saját + ecommerce plugin) léteznek a végleges, szanitált konfigban.
 */
describe('payload.config', () => {
  it('tartalmazza a várt collection-slugokat', async () => {
    const config = await configPromise

    const slugs = (config.collections ?? []).map((collection) => collection.slug)

    const expectedSlugs = [
      // saját collectionök
      'users',
      'media',
      'pages',
      'posts',
      'menus',
      'categories',
      'testimonials',
      // ecommerce plugin collectionjei
      'products',
      'carts',
      'transactions',
      'orders',
    ]

    for (const slug of expectedSlugs) {
      expect(slugs).toContain(slug)
    }

    // Kikapcsolt plugin-felületek: nincs addresses és nincs variants-collection.
    expect(slugs).not.toContain('addresses')
    expect(slugs).not.toContain('variants')
    expect(slugs).not.toContain('variantTypes')
    expect(slugs).not.toContain('variantOptions')

    // T-019: a feltöltési méretkorlát globálisan 10 MB (bájtban).
    expect(config.upload?.limits?.fileSize).toBe(10485760)
  })

  /**
   * Magyar admin felület: a staff („a lányok") nem szakember, ezért az admin
   * alapnyelve magyar. A fallbackLanguage a döntő beállítás — a nem szerkesztett
   * kulcsok is ezen a nyelven jelennek meg —, az `en` pedig választható marad.
   * A teszt őrzi, hogy az i18n-blokk ne essen ki a configból.
   */
  it('az admin felület magyar (i18n fallback: hu, en választható)', async () => {
    const config = await configPromise

    expect(config.i18n.fallbackLanguage).toBe('hu')

    const supported = Object.keys(config.i18n.supportedLanguages ?? {})
    expect(supported).toContain('hu')
    expect(supported).toContain('en')
  })

  /** A böngészőfülön látszó cím-utótag (admin.meta) — szintén magyar felület. */
  it('az admin cím-utótagja be van állítva', async () => {
    const config = await configPromise

    expect(config.admin?.meta?.titleSuffix).toBe(' – Kineticare admin')
  })

  /**
   * A Railway privát hálózata elvágja a tétlen TCP-kapcsolatokat. Keepalive és
   * idle-timeout nélkül a `pg` a halott socketet használja újra, és a kérés a
   * TCP retransmission-timeoutig (~45 mp) áll, majd „Connection terminated
   * unexpectedly" hibával dől el — emiatt akadt el az admin user létrehozása.
   * Ez a teszt őrzi, hogy a pool-hangolás ne essen ki a konfigból.
   */
  it('a Postgres-pool tétlen-kapcsolat elleni beállításai a helyükön vannak', async () => {
    const config = await configPromise

    const adapter = (
      config.db as unknown as { init: (args: { payload: unknown }) => { poolOptions?: unknown } }
    ).init({ payload: {} })
    const poolOptions = adapter.poolOptions as Record<string, unknown>

    expect(poolOptions.keepAlive).toBe(true)
    expect(poolOptions.keepAliveInitialDelayMillis).toBe(10_000)
    expect(poolOptions.idleTimeoutMillis).toBe(30_000)
    expect(poolOptions.connectionTimeoutMillis).toBe(10_000)
    expect(poolOptions.statement_timeout).toBe(30_000)
    expect(poolOptions.query_timeout).toBe(30_000)
  })

  /**
   * A pool `error` eseményét le KELL kezelni: a Railway privát hálója elvágja a
   * tétlen TCP-kapcsolatokat, és a kezeletlen esemény `uncaughtException`-ként
   * viszi el a Next.js szerverfolyamatot (CLAUDE.md 7. üzemeltetési tanulság).
   * A regisztráció korábban az űrlap-seedelő mellékhatásaként futott — ez a
   * teszt őrzi, hogy önálló, az induláskori lánc ELSŐ lépése maradjon, és
   * akkor is megtörténjen, ha a seedelő elhasal (pl. migráció előtti DB).
   */
  it('induláskor regisztrálja a Postgres-pool error-handlerét', async () => {
    const config = await configPromise
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const on = vi.fn()
    const fakePayload = {
      db: { pool: { on } },
      // A seedelő első lépése — a hibája (best-effort ág) nem akadályozhatja meg
      // a handler regisztrációját.
      find: async () => {
        throw new Error('nincs adatbázis')
      },
    } as unknown as Payload

    try {
      await config.onInit?.(fakePayload)
    } finally {
      logSpy.mockRestore()
    }

    expect(on).toHaveBeenCalledWith('error', expect.any(Function))
  })
})
