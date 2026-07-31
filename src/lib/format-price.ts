/**
 * HUF ár-formázás — az ár-címke (PriceTag) és minden storefront-ármegjelenítés
 * közös segédfüggvénye.
 *
 * Szabály: egész forint, ezres tagolás szóközzel (magyar szabvány), „Ft" végződés.
 * Pl. 19990 → "19 990 Ft". A tagoló- és elválasztószóköz NEM törhető (nbsp),
 * hogy az ár egy sorban maradjon.
 */
export function formatPriceHuf(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatPriceHuf: érvénytelen összeg (${value}).`)
  }
  const rounded = Math.round(value)
  const formatted = new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded)
  // Az Intl a hu-HU locale-ban NBSP-t használ — biztosítjuk, hogy a tagolás és
  // a pénznem-elválasztás mindenképp nem-törhető szóköz legyen.
  return formatted.replace(/ /g, ' ')
}
