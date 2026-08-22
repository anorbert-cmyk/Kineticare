import type { Payload, PayloadRequest } from 'payload'

import type { User } from '../payload-types'
import { logger as rootLogger, type Logger } from './logger'
import { updateUserPurchases } from './user-purchases'

/**
 * Ingyenes kurzusok AUTOMATIKUS hozzáférés-adása (M4) — transportfüggetlen
 * szolgáltatás, a grant-purchase.ts és az apply-barion-state.ts
 * grantPurchases-mintájára.
 *
 * MIÉRT KELL: az ingyenes termék CTA-ja („Ingyenes — azonnal eléred",
 * src/lib/courses.ts resolveCourseCta) a /kurzusaim oldalra visz, de a
 * users.purchases-be korábban KIZÁRÓLAG a fizetési főlánc írt — az ingyenes
 * kurzus így sosem jelent meg a vevőnél (CTA-zsákutca). Ez a szolgáltatás a
 * regisztrációt/bejelentkezést követően (a Users collection hookjaiból hívva)
 * beírja az ÖSSZES published, ingyenes terméket a purchases-be.
 *
 * „Ingyenes" definíció: KIZÁRÓLAG `priceInHUFEnabled === false` — az egyetlen
 * igazságforrás az `isFreeCourse` (src/lib/courses.ts), a lekérdezés annak
 * SQL-oldali párja (`equals: false`).
 *
 * A SZIGORÍTÁS OKA (2026-08-16-i átvizsgálás): a lekérdezés korábban
 * `not_equals: true` volt, ami a BEÁLLÍTATLAN (NULL) ár-pipát is ingyenesnek
 * vette. Egy publikált, de még be nem árazott kurzust így MINDEN belépő
 * felhasználó megkapott — miközben a storefront ugyanannak a terméknek
 * „Megveszem" gombot mutatott, és a jogosultság az ár utólagos beállítása után
 * is bent maradt. A beállítatlan ár-pipa nem ingyenes ajánlat, hanem javítandó
 * konfigurációs hiba (riasztás: `reportUnpricedPublishedCourses`). Ugyanígy
 * kimarad a BEpipált, de ÜRES árú termék is.
 *
 * Miért NEM a grantPurchase (src/lib/grant-purchase.ts) hívja termékenként:
 * annak a manuális, auditált admin-út a szerződése („manuális hozzáférés"
 * naplóüzenetek, e-mail+sku feloldás hívásonként). Az automatikus grantnek
 * félrevezető audit-naplója lenne, és minden bejelentkezésnél termékenként
 * két lekérdezéssel járna. Ez a szolgáltatás EGY products-lekérdezéssel és
 * LEGFELJEBB egy users-írással dolgozik, és csak tényleges grantnél naplóz.
 *
 * IDEMPOTENS: csak a hiányzó termékek kerülnek be (már meglévő → nincs írás,
 * nincs naplósor). Meglévő jogosultságot sosem vesz el.
 *
 * A users.purchases mező field-access szinten RENDSZER-ÍRÁSÚ — az írás itt is
 * `overrideAccess: true`-val, kizárólag szerver-oldalon történik, pontosan
 * úgy, mint a fizetésjóváhagyásnál. Az access-szabályt a modul NEM módosítja.
 */

/** Egy lekérdezéssel feldolgozott ingyenes termékek felső határa (bőven a kínálat felett). */
const FREE_PRODUCTS_QUERY_LIMIT = 100

export interface GrantFreeCoursesInput {
  payload: Payload
  /** A frissen regisztrált/bejelentkezett felhasználó (purchases-szel). */
  user: Pick<User, 'id' | 'purchases'>
  /**
   * A hívó kérése — KÖTELEZŐ hook-hívásnál: a beágyazott update csak így fut
   * a hívó tranzakciójában. Enélkül az afterChange(create)-ből a frissen
   * létrejött (még nem commitolt) userre „Nem található" dobás jön, az
   * afterLogin-ból pedig ön-blokkoló sorzár/deadlock (a login-tranzakció már
   * írta a sort) — a pentest igazolta élesben (2026-08-12).
   */
  req?: PayloadRequest
  logger?: Logger
}

export interface GrantFreeCoursesResult {
  /** A TÉNYLEGESEN beírt termék-id-k (üres, ha minden ingyenes termék megvolt). */
  grantedProductIds: number[]
  /** A published + ingyenes termékek száma a lekérdezésben. */
  freeProductCount: number
}

/**
 * A published + ingyenes termékek idempotens beírása a felhasználó
 * purchases-listájába. Nincs mit beírnia → tiszta no-op (írási és naplózási
 * mellékhatás nélkül), így minden bejelentkezésen futhat.
 */
export async function grantFreeCoursesToUser(
  input: GrantFreeCoursesInput,
): Promise<GrantFreeCoursesResult> {
  const { payload, user } = input
  const log = input.logger ?? rootLogger

  const freeProducts = await payload.find({
    collection: 'products',
    where: {
      and: [
        { status: { equals: 'published' } },
        // SZIGORÚ ingyenes-feltétel — az isFreeCourse (src/lib/courses.ts)
        // SQL-oldali párja. A `not_equals: true` alak a beállítatlan (NULL)
        // ár-pipát is beengedte; ez a hiba adta ki a be nem árazott kurzust
        // minden belépőnek (lásd a modul fejlécét).
        { priceInHUFEnabled: { equals: false } },
      ],
    },
    limit: FREE_PRODUCTS_QUERY_LIMIT,
    depth: 0,
    overrideAccess: true,
    // A where-alak a generált Where-típusnál szűkebben igazolt (a
    // start-checkout.ts duplavásárlás-ellenőrzésének mintájára).
  } as unknown as Parameters<Payload['find']>[0])

  const freeProductIds = freeProducts.docs.map((product) => product.id)

  // K1: a vevő-zár alatt ÚJRAOLVASOTT lista a forrás. Az input.user.purchases
  // a hook hívásakor elavult lehet (párhuzamos paid-grant / manuális grant).
  const result = await updateUserPurchases(
    payload,
    user.id,
    (current) => {
      const owned = new Set(current.map(String))
      const missing = freeProductIds.filter((productId) => !owned.has(String(productId)))
      return missing.length === 0 ? current : [...current, ...missing]
    },
    log,
    input.req,
  )

  const previousOwned = new Set(result.previous.map(String))
  const grantedProductIds = freeProductIds.filter(
    (productId) => !previousOwned.has(String(productId)),
  )

  if (result.wrote) {
    log.info('ingyenes kurzus-hozzáférések automatikusan beírva', {
      userId: user.id,
      grantedProductIds,
    })
  }

  return { grantedProductIds, freeProductCount: freeProducts.totalDocs }
}
