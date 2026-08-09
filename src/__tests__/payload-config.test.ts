import { describe, expect, it } from 'vitest'

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
   * Sec-review guard: explicit serverURL + cors/csrf allowlist. Tesztkörnyezetben
   * a NEXT_PUBLIC_SERVER_URL nincs beállítva → a dev-fallback (localhost) él.
   */
  it('explicit serverURL, a cors/csrf ugyanarra az originre állítva', async () => {
    const config = await configPromise

    expect(config.serverURL).toBe('http://localhost:3000')
    expect(config.cors).toEqual([config.serverURL])
    // A sanitize lépés a serverURL-t a csrf-listához is fűzi — a lényeg, hogy
    // kizárólag a deploy-origin szerepeljen benne.
    expect(new Set(config.csrf)).toEqual(new Set([config.serverURL]))
  })

  /**
   * Sec-review guard: a frontend nem használ GraphQL-t — a végpont ki van
   * kapcsolva (támadási felület-csökkentés), a route-fájl törölve.
   */
  it('a GraphQL végpont le van tiltva', async () => {
    const config = await configPromise

    expect(config.graphQL?.disable).toBe(true)
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
})
