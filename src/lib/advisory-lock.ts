import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'

import type { Logger } from './logger'

/**
 * Postgres advisory-lock segéd (security: pénzügyi race-conditionök).
 *
 * A `pg_advisory_xact_lock` egy tranzakció-hatókörű, kulcsra sorosító zár:
 * amíg egy folyamat tartja, minden más, UGYANARRA a kulcsra érkező zárkérés
 * várakozik — így a zár belsejében futó ellenőrzés+írás párhuzamos kérések
 * mellett is atomikus (check-then-act TOCTOU-védelem). A kulcsból a
 * `hashtextextended` determinisztikus 64 bites azonosítót képez.
 *
 * A drizzle-tranzakció itt KIZÁRÓLAG zár-tartomány: a benne futó `fn`
 * Payload-műveletei a saját kapcsolataikon, autocommitben írnak — a
 * tranzakció semmilyen DB-írást nem hordoz, csak a zárat tartja fenn `fn`
 * teljes futásáig (a lock pontosan ezért véd: a zár végéig más nem léphet be
 * ugyanazzal a kulccsal, és addigra `fn` írásai már commitálódtak).
 *
 * Visszaesés: ha az adapter nem postgres-drizzle (pl. egységteszt-fake), a
 * kritikus szakasz zár NÉLKÜL, warn-naplózással fut — éles környezetben a
 * postgres adapter mindig ad drizzle-példányt.
 */

/** A postgres adapter drizzle-példányának minimális szelete, amire a zárnak szüksége van. */
interface AdvisoryLockTx {
  execute: (query: unknown) => Promise<unknown>
}

interface AdvisoryLockDrizzle {
  transaction: <T>(fn: (tx: AdvisoryLockTx) => Promise<T>) => Promise<T>
}

function resolveDrizzle(payload: Payload): AdvisoryLockDrizzle | null {
  // A Payload db-felülete adapterfüggetlen (BaseDatabaseAdapter): a postgres
  // adapter `drizzle` példánya nem része a közös típusnak — indokolt
  // határponti típusáthidalás (a repo `as unknown as` mintája szerint).
  const db = payload.db as unknown as { drizzle?: unknown } | undefined
  const candidate = db?.drizzle
  if (
    candidate !== null &&
    typeof candidate === 'object' &&
    typeof (candidate as AdvisoryLockDrizzle).transaction === 'function'
  ) {
    return candidate as AdvisoryLockDrizzle
  }
  return null
}

/**
 * `fn` futtatása a `lockKey`-re kulcsolt Postgres advisory zár alatt.
 * Ugyanazzal a kulccsal párhuzamosan hívva a második a zár feloldásáig vár.
 */
export async function withAdvisoryLock<T>(
  payload: Payload,
  lockKey: string,
  fn: () => Promise<T>,
  log?: Logger,
): Promise<T> {
  const drizzle = resolveDrizzle(payload)
  if (!drizzle) {
    log?.warn(
      'advisory-lock: postgres drizzle-adapter nem érhető el — a kritikus szakasz zár NÉLKÜL fut (csak teszt/nem-postgres környezetben elfogadott)',
      { lockKey },
    )
    return fn()
  }
  return drizzle.transaction(async (tx) => {
    // Tranzakció-hatókörű zár: a callback (és vele `fn`) végén automatikusan
    // feloldódik — külön unlock-hívás (és annak elmaradása) nem lehetséges.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`)
    return fn()
  })
}
