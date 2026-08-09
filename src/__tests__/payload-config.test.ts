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
   * C1/A2 biztonsági zárás: a GraphQL API-nak KIKAPCSOLVA kell maradnia. A
   * beépített resetPasswordUser/forgotPasswordUser mutációk a
   * resetPasswordOperation-ön át megkerülnék a szerveroldali jelszó-politikát
   * (src/lib/security/reset-password-route.ts) és az IP-alapú kérés-korlátot.
   * Visszakapcsolás előtt ezekre őrt kell építeni.
   */
  it('a GraphQL API le van tiltva (jelszó-politika + rate-limit megkerülhetetlensége)', async () => {
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
   * Az e-mail-adapter E-MAIL-KULCS NÉLKÜL is inicializálható.
   *
   * Ez a teszt maga a bizonyíték: a tesztkörnyezetben nincs RESEND_API_KEY és
   * nincs SMTP_HOST sem, mégis betöltődik a config és felépül az adapter. A
   * provider ilyenkor `noop`-ra esik (egyszeri figyelmeztetéssel), tehát a
   * boot, a tesztek és a CI e-mail-konfiguráció nélkül is működik.
   */
  it('az e-mail-adapter e-mail-kulcs nélkül is felépül (a boot nem bukik el)', async () => {
    const config = await configPromise

    expect(process.env.RESEND_API_KEY).toBeUndefined()
    expect(typeof config.email).toBe('function')

    const adapter = (
      config.email as unknown as (args: { payload: unknown }) => {
        name: string
        sendEmail: unknown
      }
    )({ payload: {} })
    expect(adapter.name).toBe('kineticare-provider')
    expect(typeof adapter.sendEmail).toBe('function')
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
   * C13 — a 2026-08-06-i sorzár-incidens: egy nyitva maradt, TÉTLEN tranzakció
   * zárolta a `users` sort, és minden írás/bejelentkezés befagyott (olvasás
   * közben gyors maradt). A statement_timeout ezen nem segít, mert az a futó
   * lekérdezést öli meg — itt viszont éppen nem futott lekérdezés. Az
   * `idle_in_transaction_session_timeout` a kapcsolat startup-paramétereként
   * megy át a Postgresnek, így DB-oldali ALTER SYSTEM nélkül is minden
   * pool-kapcsolatra érvényes. Ez a teszt őrzi, hogy ne essen ki a configból.
   */
  it('a pool kapcsolat-szinten kikényszeríti az idle_in_transaction_session_timeout-ot', async () => {
    const config = await configPromise

    const adapter = (
      config.db as unknown as { init: (args: { payload: unknown }) => { poolOptions?: unknown } }
    ).init({ payload: {} })
    const poolOptions = adapter.poolOptions as Record<string, unknown>

    expect(poolOptions.idle_in_transaction_session_timeout).toBe(60_000)
    // A tétlen tranzakcióra szabott korlát a futó lekérdezésé fölött van, hogy
    // a normál (aktív) hosszú műveletekbe — migráció, seed — ne szóljon bele.
    expect(poolOptions.idle_in_transaction_session_timeout).toBeGreaterThan(
      poolOptions.statement_timeout as number,
    )
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
