import type { Payload } from 'payload'

import { withAdvisoryLock } from './advisory-lock'
import { logger as rootLogger, type Logger } from './logger'

/**
 * User-szintű advisory-zár a `users.purchases` read-modify-write íróinak.
 *
 * MIÉRT: a rendelés-szintű zár (`order-transition:order:<id>`,
 * `refund:order:<id>`) CSAK egy rendelést sorosít. Két párhuzamos paid-callback
 * KÜLÖNBÖZŐ rendeléseken, UGYANARRA a vevőre mindkettő beolvassa a purchases
 * tömböt, majd a későbbi írás felülírja a korábbit — elveszett jogosultság
 * (lost update). A négy író (grantPurchases, grantPurchase, grantFreeCoursesToUser,
 * revokePurchases) ezért EZEN a kulcson osztozik.
 *
 * ZÁR-SORREND (deadlock elkerülése, KÖTELEZŐ): ha más zárral nestelt, mindig
 * **order → email → user**. Soha ne szerezzük meg a user-zárat a rendelés-zár
 * ELŐTT. A paid-ág már tartja az `order-transition:order:<id>`-t (vendégnél
 * közben az `order-customer:<email>`-t is felvette és elengedte) — a user-zár
 * BEÁGYAZÁSA ezekbe rendben van.
 *
 * TARTOMÁNY: a `fn` CSAK a user újraolvasása + a purchases írás legyen.
 * Külső HTTP (Barion) TILOS a záron belül. A plusz nestelt zár egy újabb
 * tétlen pool-kapcsolatot foglal (W3) — ezt a helyességért elfogadjuk, a
 * `pool.max`-ot NEM emeljük.
 *
 * A `fn`-ben KÖTELEZŐ a user `findByID` újraolvasása: a zár előtt olvasott
 * snapshotot TILOS visszaírni.
 */

/** Egy vevő purchases-RMW-jének advisory-zár kulcsa. */
export function userPurchasesLockKey(userId: number | string): string {
  return `purchases:user:${userId}`
}

/**
 * A `fn` futtatása a vevő purchases-zára alatt (`purchases:user:<userId>`).
 *
 * A zár a `withAdvisoryLock` közös magjára épül — processzek között is véd.
 */
export async function withUserPurchasesLock<T>(
  payload: Payload,
  userId: number | string,
  fn: () => Promise<T>,
  log: Logger = rootLogger,
): Promise<T> {
  return withAdvisoryLock(payload, userPurchasesLockKey(userId), fn, log)
}
