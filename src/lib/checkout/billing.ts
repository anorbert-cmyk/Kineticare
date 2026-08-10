/**
 * Checkout — a számlázási adatok szerződése és validációja (KÖZÖS modul).
 *
 * A modul SZÁNDÉKOSAN függőségmentes (nincs benne payload-, next- vagy
 * react-import), mert két, egymástól független helyen fut le:
 *  - a /penztar űrlapján (kliens-bundle) — hogy a beküldés hiányos adattal el
 *    se induljon, magyar, mezőhöz kötött hibaüzenettel;
 *  - a POST /api/checkout/start szolgáltatásában — mert a kliens MEGKERÜLHETŐ,
 *    így a szabály a szerveren KÖTELEZŐEN újra lefut.
 *
 * MIÉRT KÖTELEZŐ: a számla (Számlázz.hu, `vevo` blokk) a rendelés
 * `customerSnapshot`-jából készül (src/lib/szamlazz/invoice.ts →
 * `buyerFromOrder`), és ott a `nev`/`irsz`/`telepules`/`cim` a Számla Agent
 * felé is kötelező mező. Ha ezek a snapshotból hiányoznak, a fizetés lemegy, a
 * kurzus kiadódik, a számlakiállítás viszont `invoiceStatus: 'failed'`-del,
 * DOBÁS NÉLKÜL zár — tehát nincs újrapróbálás, és a számla soha nem áll ki.
 * Ezt az utat itt, a rendelés létrejötte ELŐTT kell elzárni.
 *
 * Az ellenőrzés szándékosan MEGENGEDŐ (egyetlen valós magyar cím se essen ki):
 *  - irányítószám: pontosan 4 számjegy, 1000–9999 (a teljes magyar tartomány);
 *    a szóközök és az opcionális `H-` előtag megengedettek,
 *  - név/település/cím: nem üres, ésszerű alsó és felső hosszkorlát; formai
 *    megkötés (pl. házszám-kényszer, ékezet- vagy karakter-szűrés) NINCS,
 *  - adószám: OPCIONÁLIS; ha megadják, 11 számjegy (12345678-1-42 alakra
 *    normalizálva) — a hibás adószámot a Számla Agent utasítaná vissza, ami
 *    ismét kiállítatlan számlához vezetne.
 */

/** A pénztárból (vagy a profil-tartalékból) érkező, nyers számlázási adatok. */
export interface CheckoutBillingInput {
  name: string
  zip: string
  city: string
  street: string
  taxNumber?: string
}

/** A validált, normalizált számlázási adatok — ez kerül a rendelés snapshotjába. */
export interface NormalizedBilling {
  name: string
  zip: string
  city: string
  street: string
  /** Hiányzó vagy üres adószám esetén null (magánszemély vásárló). */
  taxNumber: string | null
}

export type BillingFieldName = 'name' | 'zip' | 'city' | 'street' | 'taxNumber'

/** Egy mezőhöz kötött, MAGYAR hibaüzenet (a Field `error` propjára illeszkedik). */
export interface BillingFieldError {
  field: BillingFieldName
  message: string
}

export type BillingValidationResult =
  | { ok: true; value: NormalizedBilling }
  | { ok: false; errors: BillingFieldError[] }

/** A szabad szöveges mezők hosszkorlátai (alsó = elgépelés-szűrő, felső = épesz-határ). */
export const BILLING_LIMITS = {
  name: { min: 2, max: 200 },
  city: { min: 2, max: 100 },
  street: { min: 3, max: 200 },
} as const

interface TextRule {
  /** A mezőnév — egyben a nyers input kulcsa is. */
  field: Extract<BillingFieldName, 'name' | 'city' | 'street'>
  min: number
  max: number
  /** Hiányzó vagy túl rövid érték üzenete. */
  missing: string
  /** Túl hosszú érték üzenete. */
  tooLong: string
}

const TEXT_RULES: readonly TextRule[] = [
  {
    field: 'name',
    min: BILLING_LIMITS.name.min,
    max: BILLING_LIMITS.name.max,
    missing: 'Add meg a számlázási nevet (legalább 2 karakter).',
    tooLong: `A számlázási név legfeljebb ${BILLING_LIMITS.name.max} karakter lehet.`,
  },
  {
    field: 'city',
    min: BILLING_LIMITS.city.min,
    max: BILLING_LIMITS.city.max,
    missing: 'Add meg a települést.',
    tooLong: `A település neve legfeljebb ${BILLING_LIMITS.city.max} karakter lehet.`,
  },
  {
    field: 'street',
    min: BILLING_LIMITS.street.min,
    max: BILLING_LIMITS.street.max,
    missing: 'Add meg az utcát és a házszámot.',
    tooLong: `A cím legfeljebb ${BILLING_LIMITS.street.max} karakter lehet.`,
  },
]

export const BILLING_ZIP_ERROR = 'Az irányítószám négyjegyű szám (például 1011).'
export const BILLING_TAX_NUMBER_ERROR =
  'Az adószám 11 számjegyből áll (például 12345678-1-42). Magánszemélyként hagyd üresen.'

/** Magyar irányítószám: 1000–9999, azaz négy számjegy nem nullás kezdéssel. */
const ZIP_PATTERN = /^[1-9]\d{3}$/
/** Magyar adószám a kötőjelek elhagyása után: 11 számjegy. */
const TAX_NUMBER_PATTERN = /^\d{11}$/

/** Szöveg-normalizálás: körbevágás + a belső szóköz-sorozatok egy szóközre. */
function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

/**
 * Adószám-normalizálás: a szóközök és kötőjelek elhagyása után 11 számjegy,
 * majd a hivatalos `12345678-1-42` tagolás visszaállítása.
 * Üres bemenet → null (magánszemély), érvénytelen bemenet → undefined (hiba).
 */
function normalizeTaxNumber(value: unknown): string | null | undefined {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (raw.length === 0) {
    return null
  }
  const compact = raw.replace(/[\s-]/g, '')
  if (!TAX_NUMBER_PATTERN.test(compact)) {
    return undefined
  }
  return `${compact.slice(0, 8)}-${compact.slice(8, 9)}-${compact.slice(9)}`
}

/**
 * Irányítószám-normalizálás: szóközök és az opcionális `H-` országelőtag
 * elhagyása. Érvénytelen bemenet → null.
 */
function normalizeZip(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim() : ''
  const compact = raw.replace(/\s/g, '').replace(/^[Hh]-?/, '')
  return ZIP_PATTERN.test(compact) ? compact : null
}

/**
 * A számlázási adatok ellenőrzése és normalizálása. A bemenet szándékosan
 * `unknown`: a szerver oldalon tetszőleges JSON-törzs érkezhet.
 */
export function validateBilling(input: unknown): BillingValidationResult {
  const source: Record<string, unknown> =
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {}

  const errors: BillingFieldError[] = []
  const text: Record<'name' | 'city' | 'street', string> = { name: '', city: '', street: '' }

  for (const rule of TEXT_RULES) {
    const value = normalizeText(source[rule.field])
    if (value.length < rule.min) {
      errors.push({ field: rule.field, message: rule.missing })
      continue
    }
    if (value.length > rule.max) {
      errors.push({ field: rule.field, message: rule.tooLong })
      continue
    }
    text[rule.field] = value
  }

  const zip = normalizeZip(source.zip)
  if (zip === null) {
    errors.push({ field: 'zip', message: BILLING_ZIP_ERROR })
  }

  const taxNumber = normalizeTaxNumber(source.taxNumber)
  if (taxNumber === undefined) {
    errors.push({ field: 'taxNumber', message: BILLING_TAX_NUMBER_ERROR })
  }

  if (errors.length > 0 || zip === null || taxNumber === undefined) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: { name: text.name, zip, city: text.city, street: text.street, taxNumber },
  }
}

/**
 * A normalizált adatok visszaképzése a hálózati törzs alakjára: az üres
 * (null) adószám KIMARAD, hogy a szerver felé se menjen ki üres mező.
 */
export function toBillingPayload(value: NormalizedBilling): CheckoutBillingInput {
  return {
    name: value.name,
    zip: value.zip,
    city: value.city,
    street: value.street,
    ...(value.taxNumber ? { taxNumber: value.taxNumber } : {}),
  }
}

/** A mezőhöz kötött hibák leképezése mezőnév → üzenet térképre (a Field-ekhez). */
export function billingErrorMap(
  errors: readonly BillingFieldError[],
): Partial<Record<BillingFieldName, string>> {
  const map: Partial<Record<BillingFieldName, string>> = {}
  for (const item of errors) {
    if (map[item.field] === undefined) {
      map[item.field] = item.message
    }
  }
  return map
}
