import { sql, type SQL } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

import { logger as rootLogger, type Logger } from './logger'

/**
 * Postgres advisory-zár (S2) — a „check-then-act" versenyhelyzetek KÖZÖS MAGJA.
 *
 * MIÉRT: több pénzügyi folyamatunk ellenőriz-majd-ír mintát követ (checkout:
 * duplavásárlás-vizsgálat → rendelés-létrehozás; refund: már visszatérített-e →
 * Barion-refund). Zár nélkül két párhuzamos kérés MINDKETTŐ ellenőrzése átmegy,
 * mielőtt bármelyik írna — ez TOCTOU-rés, aminek az ára dupla rendelés, illetve
 * dupla visszatérítés.
 *
 * HOGYAN: `pg_advisory_xact_lock(hashtextextended($1, 0))` a drizzle-példány egy
 * tranzakcióján. Az „xact" változat kulcsfontosságú: a zárat a Postgres a
 * tranzakció végén (commit VAGY rollback, sőt kapcsolatbontás esetén is)
 * automatikusan elengedi — kézi unlock nincs, tehát elszálló kód sem hagyhat
 * hátra örökre beragadt zárat. A kulcsot maga a Postgres hasheli bigintre
 * (`hashtextextended`), így a hívó tetszőleges, beszédes szöveges kulcsot adhat.
 *
 * FONTOS SZEMANTIKA: a `fn` NEM a zár tranzakciójában fut. A zár-tranzakció egy
 * külön pool-kapcsolatot tart nyitva, a `fn` belsejében futó Payload-műveletek
 * pedig a saját kapcsolataikon dolgoznak. Ez a kölcsönös kizáráshoz elég (egy
 * időben egy kulcs egy tulajdonos), de NEM ad atomi visszagörgetést: ha a `fn`
 * félúton hibázik, a már megtörtént írásai megmaradnak.
 *
 * ÜZEMELTETÉSI KORLÁT: a zár-tranzakció a `fn` teljes futása alatt TÉTLEN
 * („idle in transaction"). A pool `idle_in_transaction_session_timeout`-ja 60 mp
 * (src/payload.config.ts), ezért a védett szakasznak rövidnek kell lennie —
 * külső hálózati hívás (pl. Barion Payment/Start) SOSEM kerülhet a záron belülre.
 * A zárra várakozásra a `statement_timeout` (30 mp) vonatkozik, tehát a
 * beragadás nem végtelen: időtúllépéssel hibázik.
 */

/** A zár-tranzakció minimális, szerkezeti felülete (a drizzle-példányból). */
interface AdvisoryLockTransaction {
  execute(query: SQL): Promise<unknown>
}

interface AdvisoryLockDrizzle {
  transaction<T>(run: (tx: AdvisoryLockTransaction) => Promise<T>): Promise<T>
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * A Payload postgres-adapterének drizzle-példánya (`payload.db.drizzle`).
 * A `db` mezője adapter-függő, ezért szerkezetileg ellenőrizzük, és csak akkor
 * fogadjuk el, ha valóban van `transaction` metódusa.
 */
function resolveDrizzle(payload: Payload): AdvisoryLockDrizzle | null {
  const db = payload.db as unknown as { drizzle?: unknown } | undefined
  const candidate = db?.drizzle
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { transaction?: unknown }).transaction === 'function'
  ) {
    return candidate as unknown as AdvisoryLockDrizzle
  }
  return null
}

/**
 * A `fn` futtatása a `lockKey`-hez tartozó Postgres advisory-zár alatt.
 *
 * A zár PROCESSZEK KÖZÖTT is véd (ellentétben egy folyamaton belüli mutexszel),
 * tehát több Next.js-példány mellett is soros marad a védett szakasz.
 *
 * Ha a drizzle-példány nem oldható fel:
 * - PRODUCTION-ben ez néma zár-vesztés lenne (a hívó azt hinné, védve van),
 *   ezért riasztást naplózunk és DOBUNK — inkább látható hiba, mint csendben
 *   elveszített kölcsönös kizárás egy pénzügyi útvonalon;
 * - nem-production (teszt/mock) környezetben a `fn` zár nélkül fut, egy
 *   figyelmeztetéssel. Ez szándékos és dokumentált: a mockolt Payload-példányok
 *   nem hordoznak drizzle-t, és a lokális/CI-tesztfutást nem akarjuk emiatt
 *   valódi adatbázishoz kötni.
 */
export async function withAdvisoryLock<T>(
  payload: Payload,
  lockKey: string,
  fn: () => Promise<T>,
  log: Logger = rootLogger,
): Promise<T> {
  const lockLog = log.child({ module: 'advisory-lock', lockKey })
  const drizzle = resolveDrizzle(payload)

  if (!drizzle) {
    if (isProduction()) {
      lockLog.error(
        'RIASZTÁS: az adatbázis-zár nem szerezhető meg (nincs drizzle-példány) — a védett szakasz zár nélkül NEM futhat',
      )
      throw new Error(
        `Az adatbázis-zár nem szerezhető meg (${lockKey}) — a művelet biztonságosan nem folytatható.`,
      )
    }
    lockLog.warn(
      'advisory-zár kihagyva: a Payload-példányon nincs drizzle (nem-production környezet — teszt/mock)',
    )
    return fn()
  }

  return drizzle.transaction(async (tx) => {
    // A kulcs KÖTÖTT paraméterként megy át ($1) — string-összefűzés nincs,
    // tehát a lockKey tartalma nem befolyásolhatja a lekérdezés szerkezetét.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}::text, 0))`)
    return fn()
  })
}
