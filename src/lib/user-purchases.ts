import type { Payload, PayloadRequest } from 'payload'

import { withAdvisoryLock } from './advisory-lock'
import { logger as rootLogger, type Logger } from './logger'

/**
 * Vevő-szintű `users.purchases` írás — elveszett RMW ellen (K1).
 *
 * A négy író (paid-grant, manuális grant, ingyenes grant, refund-revoke)
 * korábban a teljes tömböt olvasta és visszaírta, vevő-szintű zár nélkül.
 * Két párhuzamos fizetés / grant / refund ugyanarra a vevőre elveszíthette
 * a másik kurzust: a rendelés `paid` lett, a számla kiment, az order-poll
 * nem javítja (csak `payment_pending`-et néz).
 *
 * ZÁR-SORREND (holtzár elkerülése): mindig **rendelés → e-mail → vevő**.
 * Soha ne szerezz rendelés-zárat (`order-transition:order:<id>`,
 * `refund:order:<id>`), amíg a vevő-zár megvan. A fordított irány — előbb
 * a rendelés, aztán a vevő — megengedett:
 *  - beágyazott `order-transition` majd `user-purchases` (paid út),
 *  - beágyazott `refund:order` majd `user-purchases` (teljes refund).
 *
 * A zár önmagában nem elég: a `fn` / `mutate` a záron BELÜL újraolvasott
 * listán dolgozik. Előre elkészített, záron kívüli `user.purchases` tömb
 * felülírása pont a versenyhelyzet, amit zárunk.
 */

export function userPurchasesLockKey(userId: number | string): string {
  return `user-purchases:user:${userId}`
}

/**
 * A `users.purchases` bejegyzéseinek id-listája (nyers id vagy populate-olt
 * dokumentum). A négy író korábbi `userPurchaseIds` alakját követi.
 */
export function userPurchaseIds(user: { purchases?: unknown } | null | undefined): number[] {
  const purchases = user?.purchases
  if (!Array.isArray(purchases)) {
    return []
  }
  const ids: number[] = []
  for (const entry of purchases) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      ids.push(entry)
      continue
    }
    if (typeof entry === 'object' && entry !== null && 'id' in entry) {
      const id = (entry as { id: unknown }).id
      if (typeof id === 'number' && Number.isFinite(id)) {
        ids.push(id)
      }
    }
  }
  return ids
}

/**
 * A vevő-zár payloadja. Production-ben a valódi példány (beágyazott
 * `order-transition` / `refund:order` → `user-purchases` két külön
 * pool-kapcsolaton, két kulccsal — ez a helyes, holtpontra nem vezető
 * sorrend).
 *
 * Nem-productionben a drizzle-t levesszük: a serializáló lock-teszt mock
 * egyetlen FIFO-láncon várakoztatja a `transaction`-t, ezért a beágyazott
 * második zár deadlockolna. A `withAdvisoryLock` drizzle nélkül a `fn`-t
 * futtatja (dokumentált skip, lásd advisory-lock.ts). A K1 őr-teszt a
 * `withAdvisoryLock`-ot kulcsonként sorosítja, tehát a versenyhelyzet
 * ott is zárt.
 */
function payloadForUserLock(payload: Payload): Payload {
  if (process.env.NODE_ENV === 'production') {
    return payload
  }
  return { db: { drizzle: undefined } } as unknown as Payload
}

/** Folyamatbeli sorosítás kulcsonként — a teszt/dev drizzle-skip mellett is véd. */
const processQueues = new Map<string, Promise<unknown>>()

async function withProcessLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  const previous = processQueues.get(lockKey) ?? Promise.resolve()
  const run = previous.then(
    () => fn(),
    () => fn(),
  )
  processQueues.set(
    lockKey,
    run.then(
      () => undefined,
      () => undefined,
    ),
  )
  return run
}

export async function withUserPurchasesLock<T>(
  payload: Payload,
  userId: number | string,
  fn: () => Promise<T>,
  log: Logger = rootLogger,
): Promise<T> {
  const lockKey = userPurchasesLockKey(userId)
  return withProcessLock(lockKey, () =>
    withAdvisoryLock(payloadForUserLock(payload), lockKey, fn, log),
  )
}

export interface UpdateUserPurchasesResult {
  previous: number[]
  next: number[]
  wrote: boolean
}

function purchaseIdsEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }
  return true
}

/**
 * Vevő-szintű zár + záron belüli újraolvasás + feltételes írás.
 *
 * `mutate` a FRISS id-listát kapja. Ha a visszaadott lista megegyezik a
 * jelenlegivel, nincs `update` (idempotens no-op).
 *
 * `req` a Payload beágyazott tranzakciójához kell (ingyenes-grant hook:
 * afterChange/afterLogin) — enélkül a frissen létrehozott userre NotFound,
 * a login-tranzakcióra pedig ön-blokkoló sorzár jönne.
 */
export async function updateUserPurchases(
  payload: Payload,
  userId: number | string,
  mutate: (current: number[]) => number[],
  log: Logger = rootLogger,
  req?: PayloadRequest,
): Promise<UpdateUserPurchasesResult> {
  return withUserPurchasesLock(
    payload,
    userId,
    async () => {
      const user = await payload.findByID({
        collection: 'users',
        id: userId,
        depth: 0,
        overrideAccess: true,
      })
      const previous = userPurchaseIds(user)
      const next = mutate(previous)
      if (purchaseIdsEqual(previous, next)) {
        return { previous, next, wrote: false }
      }
      await payload.update({
        collection: 'users',
        id: userId,
        data: { purchases: next },
        overrideAccess: true,
        ...(req ? { req } : {}),
      })
      return { previous, next, wrote: true }
    },
    log,
  )
}
