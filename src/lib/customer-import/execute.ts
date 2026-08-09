/**
 * systeme.io → Kineticare vásárló-import: a terv VÉGREHAJTÁSA.
 *
 * IDEMPOTENS. Ez a modul minden művelet előtt ÚJRAOLVASSA a felhasználó
 * jelenlegi állapotát, és csak a ténylegesen hiányzó termékeket fűzi hozzá:
 *
 *  - meglévő felhasználónál a jelszót, a szerepkört és a meglévő purchases-
 *    bejegyzéseket SOHA nem érinti — kizárólag hozzáfűz (missing-only),
 *  - új felhasználónál a `role` marad az alapértelmezett (`customer`), a jelszó
 *    pedig kriptográfiailag véletlen és SOSEM kerül kiírásra vagy naplóba: a
 *    vevő az aktiválási linkkel (jelszó-visszaállítás) állít be sajátot.
 *
 * Ezért a megszakadt futás újraindítása biztonságos: a második kör a már
 * elvégzett sorokat `skip-complete`-ként hagyja ki.
 *
 * A purchases mező field-access-e `create: false` / `update: false` — a
 * vásárlás RENDSZER-írású mező. Ezért itt is `overrideAccess: true` megy,
 * pontosan úgy, ahogy a fizetésjóváhagyás (`grantPurchases`) és a
 * `src/scripts/grant-purchase.ts` teszi. A hozzáférés-szabályokhoz nem nyúlunk.
 *
 * A hibás sor NEM állítja meg a futást: bekerül a hibalistába, és a feldolgozás
 * a következő sorral folytatódik. A kilépési kódot a hívó (CLI) dönti el.
 */

import { randomInt } from 'node:crypto'

import type { Payload } from 'payload'

import { maskEmail } from '../email/mask'
import { validatePasswordStrength } from '../security/password-policy'
import type { Logger } from '../logger'
import { purchaseIdsOf, type ImportPlan, type PlanEntry } from './plan'

export type ExecutedAction = PlanEntry['action'] | 'failed'

/** Egy sor végrehajtásának eredménye — a CLI ezt írja ki soronként. */
export interface ExecutionOutcome {
  readonly email: string
  readonly action: ExecutedAction
  readonly userId?: number
  /** A ténylegesen beírt termékek SKU-i (idempotens no-op esetén üres). */
  readonly grantedSkus: readonly string[]
  /** Magyar hibaüzenet, ha az `action` = `failed`. */
  readonly error?: string
}

/** A záró MÉRLEG számai (a media-restore összesítőjének mintájára, magyarul). */
export interface ExecutionSummary {
  letrehozva: number
  bovitve: number
  kihagyva: number
  hibas: number
}

export interface ExecutionResult {
  readonly outcomes: readonly ExecutionOutcome[]
  readonly summary: ExecutionSummary
  /** Az ebben a futásban LÉTREHOZOTT felhasználók e-mailjei (aktiválási linkhez). */
  readonly createdEmails: readonly string[]
  /** Minden érintett (létrehozott vagy bővített) e-mail. */
  readonly touchedEmails: readonly string[]
}

export interface ExecuteOptions {
  readonly log?: Logger
  /** Soronkénti visszajelzés a CLI-nek (a lib maga nem ír a kimenetre). */
  readonly onOutcome?: (outcome: ExecutionOutcome) => void
}

/** A generált jelszó hossza — jóval a politika 12 karakteres minimuma felett. */
const GENERATED_PASSWORD_LENGTH = 32

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '-_.!?*+#'
const ALL = `${LOWER}${UPPER}${DIGITS}${SYMBOLS}`

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)]
}

/**
 * Kriptográfiailag véletlen kezdőjelszó (`node:crypto`).
 *
 * A jelszó SOSEM kerül kiírásra, naplóba vagy fájlba — kizárólag azért kell,
 * mert a Payload auth-collection jelszó nélkül nem hoz létre felhasználót. A
 * vevő az aktiválási linkkel állít be sajátot.
 *
 * A karakterosztályok garantáltan képviselve vannak, mert a Users collection
 * `enforcePasswordPolicy` hookja (kis- és nagybetű + szám + 12 karakter) a 2.
 * felhasználótól kezdve minden create-re lefut — véletlen sztringnél ez ritkán,
 * de elbukhatna.
 */
export function generateInitialPassword(email?: string): string {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const characters = [pick(LOWER), pick(LOWER), pick(UPPER), pick(UPPER), pick(DIGITS), pick(DIGITS)]
    while (characters.length < GENERATED_PASSWORD_LENGTH) {
      characters.push(pick(ALL))
    }
    // Fisher–Yates keverés kriptográfiai véletlennel, hogy a garantált
    // karakterosztályok ne mindig ugyanazon a pozíción álljanak.
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swap = randomInt(index + 1)
      const temporary = characters[index]
      characters[index] = characters[swap]
      characters[swap] = temporary
    }
    const password = characters.join('')
    if (validatePasswordStrength({ password, email }).length === 0) {
      return password
    }
  }
  // Elvi ág: 8 próbálkozás után is politikasértő jelszó gyakorlatilag
  // lehetetlen — de csendben gyenge jelszót SOSEM adunk vissza.
  throw new Error('Nem sikerült a jelszó-politikának megfelelő kezdőjelszót generálni.')
}

/** A felhasználó FRISS purchases-listája (a terv elavulhatott két futás közt). */
async function currentPurchaseIds(payload: Payload, userId: number): Promise<number[]> {
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
    overrideAccess: true,
  })
  return purchaseIdsOf(user.purchases)
}

async function executeEntry(
  payload: Payload,
  entry: PlanEntry,
  log: Logger | undefined,
): Promise<ExecutionOutcome> {
  if (entry.action === 'skip-complete') {
    return { email: entry.email, action: 'skip-complete', userId: entry.userId, grantedSkus: [] }
  }

  if (entry.action === 'create-user') {
    // A meglévő felhasználót SOSEM írjuk felül: ha időközben (párhuzamos futás,
    // közben regisztráló vevő) létrejött, átváltunk hozzáfűzésre.
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: entry.email } },
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      const user = existing.docs[0]
      return appendPurchases(payload, { ...entry, userId: user.id }, log)
    }

    const created = await payload.create({
      collection: 'users',
      data: {
        email: entry.email,
        name: entry.name,
        // Pontosan a collection alapértelmezése (Users.role `defaultValue:
        // 'customer'`) — azért szerepel kiírva, mert a generált create-adattípus
        // kötelezőnek jelöli a mezőt. Az import SOHA nem hoz létre staff/owner
        // fiókot; a szerepkör-emelés emberi döntés az adminban.
        role: 'customer',
        // A jelszó véletlen és eldobható — a vevő az aktiválási linkkel állít
        // be sajátot.
        password: generateInitialPassword(entry.email),
        ...(entry.missingProducts.length > 0
          ? { purchases: entry.missingProducts.map((product) => product.id) }
          : {}),
      },
      overrideAccess: true,
    })
    log?.info('vásárló-import: felhasználó létrehozva', {
      // Maszkolt cím: a teljes e-mail-cím nem kerülhet naplóba (a logger
      // `email` kulcsú mezőt eleve redaktál) — a sor a userId-vel azonosítható.
      cimzett: maskEmail(entry.email),
      userId: created.id,
      grantedProductIds: entry.missingProducts.map((product) => product.id),
    })
    return {
      email: entry.email,
      action: 'create-user',
      userId: created.id,
      grantedSkus: entry.missingProducts.map((product) => product.sku),
    }
  }

  return appendPurchases(payload, entry, log)
}

/** Hiányzó termékek hozzáfűzése — a meglévő lista MEGŐRZÉSÉVEL (missing-only). */
async function appendPurchases(
  payload: Payload,
  entry: PlanEntry,
  log: Logger | undefined,
): Promise<ExecutionOutcome> {
  const userId = entry.userId
  if (userId === undefined) {
    throw new Error('Hiányzó felhasználó-azonosító a hozzáfűzéshez.')
  }
  const owned = await currentPurchaseIds(payload, userId)
  const ownedKeys = new Set(owned.map(String))
  const missing = entry.missingProducts.filter((product) => !ownedKeys.has(String(product.id)))

  if (missing.length === 0) {
    // Idempotens no-op: a másodszori futás ide fut be.
    return { email: entry.email, action: 'skip-complete', userId, grantedSkus: [] }
  }

  await payload.update({
    collection: 'users',
    id: userId,
    data: { purchases: [...owned, ...missing.map((product) => product.id)] },
    overrideAccess: true,
  })
  log?.info('vásárló-import: kurzus-hozzáférés hozzáfűzve', {
    cimzett: maskEmail(entry.email),
    userId,
    grantedProductIds: missing.map((product) => product.id),
  })
  return {
    email: entry.email,
    action: 'append-purchases',
    userId,
    grantedSkus: missing.map((product) => product.sku),
  }
}

/**
 * A terv végrehajtása soronként.
 *
 * ÜRES users-kollekcióra nem indul el: az első felhasználó a
 * `promoteFirstUserToOwner` hook miatt OWNER szerepkört kapna — vásárlói
 * importból owner-fiók sosem születhet.
 */
export async function executeImportPlan(
  payload: Payload,
  plan: ImportPlan,
  options: ExecuteOptions = {},
): Promise<ExecutionResult> {
  if (plan.emptyUserCollection && plan.summary.create > 0) {
    throw new Error(
      'A users kollekció üres: az első létrehozott felhasználó tulajdonosi (owner) szerepkört kapna. ' +
        'Hozd létre előbb az admin-felhasználót, és csak utána futtasd a vásárló-importot.',
    )
  }

  const outcomes: ExecutionOutcome[] = []
  const summary: ExecutionSummary = { letrehozva: 0, bovitve: 0, kihagyva: 0, hibas: 0 }
  const createdEmails: string[] = []
  const touchedEmails: string[] = []

  for (const entry of plan.entries) {
    let outcome: ExecutionOutcome
    try {
      outcome = await executeEntry(payload, entry, options.log)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      outcome = { email: entry.email, action: 'failed', grantedSkus: [], error: message }
      options.log?.error('vásárló-import: a sor feldolgozása sikertelen', {
        cimzett: maskEmail(entry.email),
        error: message,
      })
    }

    switch (outcome.action) {
      case 'create-user':
        summary.letrehozva += 1
        createdEmails.push(outcome.email)
        touchedEmails.push(outcome.email)
        break
      case 'append-purchases':
        summary.bovitve += 1
        touchedEmails.push(outcome.email)
        break
      case 'skip-complete':
        summary.kihagyva += 1
        break
      default:
        summary.hibas += 1
        break
    }

    outcomes.push(outcome)
    options.onOutcome?.(outcome)
  }

  return { outcomes, summary, createdEmails, touchedEmails }
}
