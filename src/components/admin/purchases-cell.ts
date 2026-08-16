/**
 * A „Megvásárolt kurzusok" admin-megjelenítés TISZTA (mellékhatásmentes)
 * segédfüggvényei — a Felhasználók lista-oszlopához és a felhasználó lapján
 * lévő áttekintő panelhez.
 *
 * Külön modulban él a kliens-komponensektől, hogy egységtesztelhető legyen (a
 * @payloadcms/ui-s komponensek node-környezetű tesztben nem tölthetők be — az
 * order-items-cell.ts mintája).
 *
 * MIÉRT KELL EGYÁLTALÁN: a Payload gyári relationship-cellája a kapcsolt
 * collection `useAsTitle` mezőjével címkéz, ami a kurzusoknál szándékosan a
 * `sku` (technikai azonosító). A tulajdonosnak viszont a KURZUS CÍME mond
 * valamit — ezért a cella a `displayTitle` → `sku` → `Kurzus #id` láncot
 * használja, pontosan úgy, ahogy a storefront `courseTitle` (src/lib/courses.ts).
 * A két lánc egyezését teszt rögzíti (purchases-cell.test.ts), hogy ne
 * csússzanak szét.
 */

/** Üres/hiányzó hozzáférés-lista helyőrzője. */
export const PURCHASES_EMPTY_PLACEHOLDER = '—'

/** A kurzus-címkéhez szükséges minimális termék-alak. */
export interface PurchaseProductLike {
  id: number | string
  sku?: unknown
  displayTitle?: unknown
}

/**
 * Egy kurzus megjelenő neve: `displayTitle` → `sku` → `Kurzus #id`.
 * (A storefront `courseTitle` láncával azonos.)
 */
export function formatCourseLabel(product: PurchaseProductLike): string {
  const displayTitle = typeof product.displayTitle === 'string' ? product.displayTitle.trim() : ''
  if (displayTitle.length > 0) {
    return displayTitle
  }
  const sku = typeof product.sku === 'string' ? product.sku.trim() : ''
  return sku.length > 0 ? sku : `Kurzus #${product.id}`
}

/**
 * A hozzáférés-lista azonosítói.
 *
 * A bemenet futásidőben többféle: a lista-nézet nyers azonosítókat ad
 * (`[11, 12]`), a szerkesztő-nézet feloldott dokumentumokat is adhat
 * (`[{ id: 11, … }]`), polimorf kapcsolatnál pedig `{ relationTo, value }`
 * alakot. Mindhármat elviseli, ismeretlen elemet némán kihagy — egy hibás
 * elem nem omlaszthatja el a listát.
 */
export function readPurchaseIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const ids: string[] = []
  for (const entry of value) {
    if (typeof entry === 'number' || typeof entry === 'string') {
      const id = String(entry).trim()
      if (id !== '') {
        ids.push(id)
      }
      continue
    }
    if (typeof entry !== 'object' || entry === null) {
      continue
    }
    const record = entry as Record<string, unknown>
    const candidate = 'value' in record ? record.value : record.id
    if (typeof candidate === 'number' || typeof candidate === 'string') {
      const id = String(candidate).trim()
      if (id !== '') {
        ids.push(id)
      }
      continue
    }
    if (typeof candidate === 'object' && candidate !== null) {
      const nested = (candidate as Record<string, unknown>).id
      if (typeof nested === 'number' || typeof nested === 'string') {
        ids.push(String(nested))
      }
    }
  }
  return ids
}

/**
 * A termék-lekérdezés (`GET /api/products`) válaszából azonosító → cím térkép.
 * Hibás vagy hiányos elemet kihagy.
 */
export function readProductTitles(body: unknown): Map<string, string> {
  const titles = new Map<string, string>()
  if (typeof body !== 'object' || body === null) {
    return titles
  }
  const docs = (body as Record<string, unknown>).docs
  if (!Array.isArray(docs)) {
    return titles
  }
  for (const doc of docs) {
    if (typeof doc !== 'object' || doc === null) {
      continue
    }
    const record = doc as Record<string, unknown>
    const id = record.id
    if (typeof id !== 'number' && typeof id !== 'string') {
      continue
    }
    titles.set(String(id), formatCourseLabel({ id, sku: record.sku, displayTitle: record.displayTitle }))
  }
  return titles
}

/**
 * A megjelenítendő sorok.
 *
 * - üres lista → egyetlen „—",
 * - ismert azonosító → a kurzus címe,
 * - még be nem töltött (vagy törölt) kurzus → `Kurzus #<id>`, hogy a sor
 *   akkor is azonosítható maradjon, ha a cím nem érhető el.
 */
export function formatPurchaseLabels(
  value: unknown,
  titles: ReadonlyMap<string, string>,
): string[] {
  const ids = readPurchaseIds(value)
  if (ids.length === 0) {
    return [PURCHASES_EMPTY_PLACEHOLDER]
  }
  return ids.map((id) => titles.get(id) ?? `Kurzus #${id}`)
}
