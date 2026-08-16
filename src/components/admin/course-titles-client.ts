'use client'

import { readProductTitles } from './purchases-cell'

/**
 * A kurzus-címek EGYSZERI betöltése az admin felületen (kliens-oldal).
 *
 * MIÉRT KELL: a „Megvásárolt kurzusok" cella a felhasználó-lista MINDEN
 * sorában megjelenik, és a hozzáférés-lista csak azonosítókat hordoz — a
 * kurzus címéhez a termékeket egyszer le kell kérni. A modul-szintű ígéret
 * miatt egy oldalbetöltésre PONTOSAN EGY kérés indul, akárhány cella
 * használja (ugyanaz az elv, amivel a Payload gyári relationship-cellája is
 * egyetlen körbe gyűjti a kapcsolt dokumentumokat).
 *
 * HIBATŰRÉS: ha a lekérdezés elhasal, a térkép üres marad — a cella ilyenkor
 * `Kurzus #<id>` alakot ír ki, tehát a lista sosem törik el. A gyorsítótár
 * hiba esetén ürül, így a következő megnyitás újrapróbálja.
 */

const REQUEST_TIMEOUT_MS = 20_000

/** Csak a címképzéshez kellő mezők — a válasz így kicsi marad. */
const PRODUCTS_QUERY =
  '/api/products?limit=200&depth=0&sort=sku&select[sku]=true&select[displayTitle]=true'

let pending: Promise<ReadonlyMap<string, string>> | null = null

async function fetchCourseTitles(): Promise<ReadonlyMap<string, string>> {
  try {
    const response = await fetch(PRODUCTS_QUERY, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      pending = null
      return new Map<string, string>()
    }
    const body: unknown = await response.json()
    return readProductTitles(body)
  } catch {
    // Hálózati hiba vagy időtúllépés: a gyorsítótár ürül, a következő
    // megnyitás újrapróbálja. A felület a nyers azonosítót mutatja addig.
    pending = null
    return new Map<string, string>()
  }
}

/** Azonosító → kurzuscím térkép (oldalbetöltésenként egyetlen kérésből). */
export function loadCourseTitles(): Promise<ReadonlyMap<string, string>> {
  pending ??= fetchCourseTitles()
  return pending
}
