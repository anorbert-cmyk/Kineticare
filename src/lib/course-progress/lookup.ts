import type { Payload } from 'payload'

import type { CourseProgress } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import { watchedRefsByProduct } from './progress'

/**
 * A bejelentkezett felhasználó haladás-sorainak betöltése a rendereléshez
 * (kurzusaim-lista és lejátszó-oldal). A számítás tiszta magja a ./progress.ts;
 * ez a modul csak az adatot szállítja hozzá — a course-access-lookup.ts mintája.
 *
 * FAIL-OPEN: lekérdezési hiba esetén ÜRES térképpel tér vissza, strukturált
 * naplóbejegyzés mellett. A haladás jelzése kényelmi funkció — egy adatbázis-
 * akadás miatt a vevő ne veszítse el a lejátszót; ilyenkor egyszerűen „0/N
 * megnézve" látszik, és a következő oldalletöltés helyreteszi.
 */

/**
 * Egy oldalletöltésen ennyi haladás-sorral számolunk. Videónként egy sor
 * keletkezik, tehát ez több száz videónyi kurzusállományt is lefed.
 */
export const COURSE_PROGRESS_QUERY_LIMIT = 1000

export interface WatchedRefsInput {
  payload: Payload
  /** A vevő azonosítója — a lekérdezés kizárólag az ő sorait olvassa. */
  userId: number
  /** Szűkítés kurzusokra; üres/hiányzó lista esetén a felhasználó összes sora. */
  productIds?: readonly number[]
  logger?: Logger
}

/** productId → a megnézettként jelölt videó-refek halmaza (deduplikálva). */
export async function fetchWatchedRefs(input: WatchedRefsInput): Promise<Map<number, Set<string>>> {
  const log = input.logger ?? rootLogger
  const productIds = input.productIds ?? []
  try {
    const result = await input.payload.find({
      collection: 'course-progress',
      where:
        productIds.length > 0
          ? {
              and: [
                { user: { equals: input.userId } },
                { product: { in: [...productIds] } },
              ],
            }
          : { user: { equals: input.userId } },
      depth: 0,
      limit: COURSE_PROGRESS_QUERY_LIMIT,
      overrideAccess: true,
    })
    return watchedRefsByProduct(result.docs as CourseProgress[])
  } catch (error) {
    log.warn('kurzus-haladás: a haladás-sorok lekérdezése sikertelen', {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return new Map()
  }
}
