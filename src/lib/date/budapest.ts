/**
 * Europe/Budapest naptári dátum — a hónap- és nap-kulcsok EGYETLEN forrása.
 *
 * ═══ MIÉRT NEM `toISOString().slice(0, 10)` ═══
 * Az UTC-ből képzett dátum magyar idő szerint 00:00 és 02:00 között még az
 * ELŐZŐ napot adja (nyáron UTC+2, télen UTC+1). Hófordulón egy hajnali
 * vásárlás így a megelőző hónapba, vagyis MÁS ÁFA-IDŐSZAKRA esne — ez az F9
 * finding tanulsága, és a számlakelt (`src/lib/szamlazz/xml.ts`) ugyanebből
 * a függvényből dolgozik.
 *
 * Az 'en-CA' lokál kimenete pontosan YYYY-MM-DD (a mezők explicit megadva,
 * hogy a lokál-adatbázis változása se mozdíthassa el az alakot).
 */

/** A Számla Agent dátummezőinek és a statisztika-tartalék dátumának alakja. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * A megadott pillanat naptári napja Europe/Budapest zónában, YYYY-MM-DD.
 */
export function budapestDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * YYYY-MM-DD alakú-e (alak-ellenőrzés, nem naptári érvényesség).
 *
 * A cél egyrészt a Számla Agent formátum-elvárása, másrészt — mivel a dátumok
 * egy része szabad szöveges DB-mezőből (`orders.invoiceCompletionDate`)
 * érkezik — a vezérlőkarakterek (`<`, `>`, `&`, idézőjel) kizárása.
 */
export function isIsoDateString(value: string): boolean {
  return ISO_DATE_PATTERN.test(value)
}

/**
 * YYYY-MM hónap-kulcs Budapest szerint. Érvénytelen dátumnál `null`.
 */
export function budapestMonthKey(now: Date): string | null {
  const day = budapestDateString(now)
  return day.length >= 7 ? day.slice(0, 7) : null
}
