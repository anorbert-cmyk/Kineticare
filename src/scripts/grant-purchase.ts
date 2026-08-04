/**
 * Manuális vásárlás-hozzáadás (kurzus-hozzáférés adása) — adminisztrátori script.
 *
 * Mikor kell: elhibázott fizetés utáni jóváírás, ajándék kurzus, migrációs
 * esetek — amikor a vevőnek a normál checkout-folyamaton kívül, kézzel kell
 * hozzáférést adni egy termékhez. Közvetlen adatbázis-írás helyett ez a
 * script a Payload LOCAL API-t használja (ugyanaz a users.purchases-beírás,
 * mint amit a fizetésjóváhagyás csinál — lásd
 * src/lib/order-status/apply-barion-state.ts grantPurchases).
 *
 * Futtatás (a config a .env-ből tölti a DATABASE_URI-t / PAYLOAD_SECRET-et):
 *   npx tsx src/scripts/grant-purchase.ts --email=<vevő-email> --product=<sku-vagy-id> [--reason=<indoklás>]
 *
 * IDEMPOTENS: ha a vevő már rendelkezik a termékkel, a script „már megvan"
 * üzenettel, 0-s kilépési kóddal leáll (NEM hiba), és nem módosít semmit.
 *
 * Kilépési kódok:
 *   0 — siker (hozzáférés beírva VAGY már megvolt)
 *   1 — hiba (hiányzó/hibás argumentum, ismeretlen felhasználó vagy termék,
 *       adatbázis-hiba)
 *
 * A script NEM hoz létre felhasználót és NEM rendelést — kizárólag a
 * users.purchases mezőt egészíti ki (missing-only), overrideAccess-szel.
 */

import { getPayload } from 'payload'

import { createLogger } from '../lib/logger'
import config from '../payload.config'
import type { User } from '../payload-types'

const log = createLogger({ script: 'grant-purchase' })

interface CliArgs {
  email: string
  product: string
  reason?: string
}

function printUsage(): void {
  console.error(
    [
      'Használat:',
      '  npx tsx src/scripts/grant-purchase.ts --email=<vevő-email> --product=<sku-vagy-id> [--reason=<indoklás>]',
      '',
      'Argumentumok:',
      '  --email    (kötelező) A vevő regisztrált e-mail-címe (users kollekció).',
      '  --product  (kötelező) A termék sku-ja VAGY numerikus adatbázis-id-je (products kollekció).',
      '  --reason   (opcionális) Indoklás — bekerül a strukturált naplóba.',
      '',
      'Példa:',
      '  npx tsx src/scripts/grant-purchase.ts --email=vevo@example.hu --product=DEMO-KEZREHAB-001 --reason="elhibázott fizetés jóváírása"',
    ].join('\n'),
  )
}

/** process.argv-alapú arg-parse — külső arg-parser csomag nélkül. */
function parseArgs(argv: string[]): CliArgs | null {
  const parsed: Partial<Record<'email' | 'product' | 'reason', string>> = {}

  for (const raw of argv) {
    const match = /^--([a-z]+)=(.*)$/.exec(raw)
    if (!match) {
      console.error(`Hiba: érvénytelen argumentum: "${raw}" (a forma: --kulcs=érték).`)
      return null
    }
    const [, key, value] = match
    if (key !== 'email' && key !== 'product' && key !== 'reason') {
      console.error(`Hiba: ismeretlen argumentum: "--${key}".`)
      return null
    }
    if (value.trim().length === 0) {
      console.error(`Hiba: a "--${key}" argumentum értéke nem lehet üres.`)
      return null
    }
    parsed[key] = value
  }

  if (!parsed.email || !parsed.product) {
    console.error('Hiba: a --email és a --product argumentum kötelező.')
    return null
  }

  return {
    email: parsed.email,
    product: parsed.product,
    ...(parsed.reason !== undefined ? { reason: parsed.reason } : {}),
  }
}

/** A users.purchases bejegyzéseinek id-listája (depth: 0 mellett nyers id-k). */
function userPurchaseIds(user: User): number[] {
  const purchases = user.purchases ?? []
  return purchases.map((entry) => (typeof entry === 'object' ? entry.id : entry))
}

async function grantPurchase(args: CliArgs): Promise<void> {
  const payload = await getPayload({ config })

  // --- Felhasználó feloldása email alapján (NEM hozunk létre újat) ---------
  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: args.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (users.docs.length === 0) {
    throw new Error(
      `Nincs ilyen felhasználó: ${args.email}. A script nem hoz létre felhasználót — előbb regisztráltasd a vevőt.`,
    )
  }
  const user = users.docs[0]

  // --- Termék feloldása sku VAGY numerikus id alapján -----------------------
  // (A products kollekcióban nincs külön slug mező — az egyedi üzleti kulcs a sku.)
  const productRef = args.product
  const isNumericId = /^\d+$/.test(productRef)
  const products = await payload.find({
    collection: 'products',
    where: isNumericId
      ? { id: { equals: Number(productRef) } }
      : { sku: { equals: productRef } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (products.docs.length === 0) {
    throw new Error(
      isNumericId
        ? `Nincs ilyen termék (id: ${productRef}). Ellenőrizd az azonosítót az admin felületen.`
        : `Nincs ilyen termék (sku: ${productRef}). Ellenőrizd a sku-t az admin felületen.`,
    )
  }
  const product = products.docs[0]

  // --- IDEMPOTENS ellenőrzés: már megvan? (no-op, NEM hiba) -----------------
  const owned = new Set(userPurchaseIds(user).map(String))
  if (owned.has(String(product.id))) {
    log.info('manuális hozzáférés: a termék már a vevőnél van — no-op', {
      email: args.email,
      userId: user.id,
      productId: product.id,
      sku: product.sku,
      ...(args.reason !== undefined ? { reason: args.reason } : {}),
    })
    console.log(
      `Már megvan: ${args.email} már rendelkezik a(z) "${product.sku ?? product.id}" termékkel — nincs teendő.`,
    )
    return
  }

  // --- Hozzáférés rögzítése (missing-only, a grantPurchases mintájára) ------
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { purchases: [...userPurchaseIds(user), product.id] },
    overrideAccess: true,
  })

  log.info('manuális hozzáférés rögzítve', {
    email: args.email,
    userId: user.id,
    productId: product.id,
    sku: product.sku,
    ...(args.reason !== undefined ? { reason: args.reason } : {}),
  })
  console.log(
    `Kész: ${args.email} hozzáférést kapott a(z) "${product.sku ?? product.id}" termékhez (felhasználó #${user.id}, termék #${product.id}).`,
  )
}

const args = parseArgs(process.argv.slice(2))
if (!args) {
  printUsage()
  process.exit(1)
}

grantPurchase(args)
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    log.error('manuális hozzáférés sikertelen', { error: message })
    console.error(`Hiba: ${message}`)
    process.exit(1)
  })
