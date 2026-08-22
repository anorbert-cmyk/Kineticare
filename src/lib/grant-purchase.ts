import type { Payload } from 'payload'

import { auditLogStore, writeAuditLog } from './audit'
import { maskEmail } from './email/mask'
import { logger, type Logger } from './logger'
import { updateUserPurchases } from './user-purchases'

/**
 * Manuális kurzus-hozzáférés adása (grant) — transportfüggetlen szolgáltatás.
 *
 * Ugyanaz a users.purchases-beírás, amit a fizetésjóváhagyás végez (lásd
 * src/lib/order-status/apply-barion-state.ts grantPurchases): a Payload LOCAL
 * API-n, `overrideAccess: true`-val. Erre azért van szükség, mert a
 * users.purchases mező field-access szinten RENDSZER-ÍRÁSÚ
 * (create/update: () => false, src/collections/Users.ts) — a mezőt sem az
 * admin felület, sem a REST API nem írhatja közvetlenül. Az access-szabályt a
 * modul NEM módosítja, csak szerver-oldalon, ellenőrzött úton kerüli meg,
 * pontosan úgy, ahogy a CLI-script eddig is tette.
 *
 * Hívói:
 *  - src/scripts/grant-purchase.ts (CLI, vékony wrapper — a viselkedése
 *    változatlan),
 *  - src/lib/grant-purchase-route.ts (POST /api/admin/grant-purchase, staff
 *    vagy owner jogosultsággal).
 *
 * IDEMPOTENS: ha a vevőnél már megvan a termék, a hívás `already-had`
 * eredménnyel tér vissza és NEM ír az adatbázisba. Csak a hiányzó terméket
 * fűzi a listához — meglévő jogosultságot sosem vesz el.
 *
 * A modul soha nem dob üzleti hibát: az ismeretlen felhasználó/termék is
 * strukturált eredmény (a hívó képezi HTTP-státuszra, illetve CLI-üzenetre).
 * Technikai hiba (DB) természetesen kibillen.
 */

export type GrantPurchaseStatus = 'granted' | 'already-had' | 'user-not-found' | 'product-not-found'

/** A termék-hivatkozás feloldásának módja — a hívó hibaüzenetéhez. */
export type ProductRefKind = 'id' | 'sku'

/** A műveletet végző admin (audit actor). CLI-ből nincs bejelentkezett user. */
export interface GrantPurchaseActor {
  id: number | string
  email?: string | null
}

export interface GrantPurchaseOptions {
  payload: Payload
  /** A vevő regisztrált e-mail-címe (users kollekció). */
  email: string
  /** A termék sku-ja VAGY numerikus adatbázis-id-je (products kollekció). */
  productIdOrSku: string
  /** Indoklás — a strukturált audit-naplóba kerül. */
  reason?: string
  grantedBy?: GrantPurchaseActor | null
  logger?: Logger
}

export interface GrantPurchaseResult {
  status: GrantPurchaseStatus
  email: string
  /** A kérésben kapott, nyers termék-hivatkozás. */
  productRef: string
  productRefKind: ProductRefKind
  userId?: number
  productId?: number
  /** A termék megjelenő neve (sku), ha feloldható volt. */
  productLabel?: string
}

/** Numerikus adatbázis-id vagy sku? (A products kollekcióban nincs slug — az üzleti kulcs a sku.) */
export function resolveProductRefKind(productIdOrSku: string): ProductRefKind {
  return /^\d+$/.test(productIdOrSku) ? 'id' : 'sku'
}

export async function grantPurchase(options: GrantPurchaseOptions): Promise<GrantPurchaseResult> {
  const { payload, email, productIdOrSku } = options
  const log = options.logger ?? logger
  const productRefKind = resolveProductRefKind(productIdOrSku)

  // Audit-alap: KI (grantedBy id + maszkolt cím), KINEK (maszkolt cím), MIT
  // (productRef), MIÉRT (reason) — az eredmény minden ágon rákerül.
  //
  // A címek MASZKOLVA (`maskEmail`) és `cimzett` néven kerülnek a naplóba: a
  // teljes e-mail-cím személyes adat, a logger `email` kulcsú mezőt eleve
  // redaktál (src/lib/logger.ts). A maszkolt alak a sor beazonosításához elég,
  // a rendszer belső azonosítója (userId) pedig a naplóban külön is szerepel.
  const audit = {
    cimzett: maskEmail(email),
    productRef: productIdOrSku,
    productRefKind,
    grantedBy: options.grantedBy
      ? {
          id: options.grantedBy.id,
          cimzett: options.grantedBy.email ? maskEmail(options.grantedBy.email) : null,
        }
      : null,
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
  }

  // --- Felhasználó feloldása email alapján (NEM hozunk létre újat) -----------
  // W9: a Payload az e-mailt kisbetűsen tárolja; a CLI/admin vegyes
  // írásmódja enélkül hamis „nincs ilyen user" találatot adna.
  const normalizedEmail = email.trim().toLowerCase()
  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: normalizedEmail } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (users.docs.length === 0) {
    log.warn('manuális hozzáférés: ismeretlen felhasználó', { ...audit, result: 'user-not-found' })
    return { status: 'user-not-found', email, productRef: productIdOrSku, productRefKind }
  }
  const user = users.docs[0]

  // --- Termék feloldása sku VAGY numerikus id alapján ------------------------
  const products = await payload.find({
    collection: 'products',
    where:
      productRefKind === 'id'
        ? { id: { equals: Number(productIdOrSku) } }
        : { sku: { equals: productIdOrSku } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (products.docs.length === 0) {
    log.warn('manuális hozzáférés: ismeretlen termék', {
      ...audit,
      userId: user.id,
      result: 'product-not-found',
    })
    return {
      status: 'product-not-found',
      email,
      productRef: productIdOrSku,
      productRefKind,
      userId: user.id,
    }
  }
  const product = products.docs[0]
  const productLabel = product.sku ?? String(product.id)

  // --- IDEMPOTENS ellenőrzés + írás a vevő-zár alatt (K1) -------------------
  // A záron kívüli already-had ellenőrzés két párhuzamos grantnél mindkettőnek
  // „még nincs" választ adna, és a második a stale listát írná vissza.
  const result = await updateUserPurchases(
    payload,
    user.id,
    (current) => {
      const owned = new Set(current.map(String))
      return owned.has(String(product.id)) ? current : [...current, product.id]
    },
    log,
  )

  if (!result.wrote) {
    log.info('manuális hozzáférés: a termék már a vevőnél van — no-op', {
      ...audit,
      userId: user.id,
      productId: product.id,
      sku: product.sku,
      result: 'already-had',
    })
    return {
      status: 'already-had',
      email,
      productRef: productIdOrSku,
      productRefKind,
      userId: user.id,
      productId: product.id,
      productLabel,
    }
  }

  log.info('manuális hozzáférés rögzítve', {
    ...audit,
    userId: user.id,
    productId: product.id,
    sku: product.sku,
    result: 'granted',
  })

  // A strukturált napló mellett az audit-logs collectionbe is kerüljön — a
  // manuális hozzáférés-adas az admin-felületen is nyomon követhető legyen.
  // A writeAuditLog best-effort (sosem dob a hívó felé).
  await writeAuditLog({
    store: auditLogStore(payload),
    actor: options.grantedBy?.id ?? null,
    action: 'grant-purchase',
    entityType: 'users',
    entityId: user.id,
    after: { productId: product.id, sku: product.sku, reason: options.reason ?? null },
  })

  return {
    status: 'granted',
    email,
    productRef: productIdOrSku,
    productRefKind,
    userId: user.id,
    productId: product.id,
    productLabel,
  }
}
