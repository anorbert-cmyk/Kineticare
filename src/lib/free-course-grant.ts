import type { Payload } from 'payload'

import type { User } from '../payload-types'
import { logger as rootLogger, type Logger } from './logger'

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
 * „Ingyenes" definíció: `priceInHUFEnabled` NEM true (false vagy hiányzó —
 * „ár nélküli"). A BEpipált, de ÜRES árú (hibásan konfigurált) termék NEM
 * ingyenes: azt a storefront sem címkézi „Ingyenes"-nek (coursePriceBadgeKind),
 * és a checkout sem engedi megvenni — ilyen terméket ez a grant sem ad ki.
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
  logger?: Logger
}

export interface GrantFreeCoursesResult {
  /** A TÉNYLEGESEN beírt termék-id-k (üres, ha minden ingyenes termék megvolt). */
  grantedProductIds: number[]
  /** A published + ingyenes termékek száma a lekérdezésben. */
  freeProductCount: number
}

/** A users.purchases bejegyzéseinek id-listája (nyers id vagy populate-olt dokumentum). */
function userPurchaseIds(user: Pick<User, 'purchases'>): number[] {
  const purchases = user.purchases ?? []
  return purchases.map((entry) => (typeof entry === 'object' ? entry.id : entry))
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
        // Ingyenes = az ár NINCS engedélyezve (false vagy hiányzó mező). A
        // bepipált, de áratlan (hibásan konfigurált) termék kimarad — az nem
        // ingyenes ajánlat, hanem javítandó konfigurációs hiba.
        { priceInHUFEnabled: { not_equals: true } },
      ],
    },
    limit: FREE_PRODUCTS_QUERY_LIMIT,
    depth: 0,
    overrideAccess: true,
    // A where-alak a generált Where-típusnál szűkebben igazolt (a
    // start-checkout.ts duplavásárlás-ellenőrzésének mintájára).
  } as unknown as Parameters<Payload['find']>[0])

  const owned = new Set(userPurchaseIds(user).map(String))
  const missing = freeProducts.docs
    .map((product) => product.id)
    .filter((productId) => !owned.has(String(productId)))

  if (missing.length === 0) {
    return { grantedProductIds: [], freeProductCount: freeProducts.totalDocs }
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { purchases: [...userPurchaseIds(user), ...missing] },
    overrideAccess: true,
  })

  log.info('ingyenes kurzus-hozzáférések automatikusan beírva', {
    userId: user.id,
    grantedProductIds: missing,
  })

  return { grantedProductIds: missing, freeProductCount: freeProducts.totalDocs }
}
