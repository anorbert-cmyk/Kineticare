/**
 * Közös XML-segéd a Számla Agent kérés-építőkhöz (invoice / storno / pdf).
 * Külön modulban él, hogy a lekérdező (pdf.ts) és a kiállító (invoice.ts)
 * között ne alakuljon ki körkörös import.
 */

/** XML-escape a dinamikus értékekhez. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * A Számla Agent dátummezőinek alakja: YYYY-MM-DD.
 *
 * A minta a 'en-CA' lokál dátumformátuma is egyben (lásd budapestDateString),
 * így a két segéd ugyanarra az alakra épül.
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Mai dátum Europe/Budapest zónában, YYYY-MM-DD.
 *
 * MIÉRT NEM `toISOString().slice(0, 10)`: az UTC-ből képzett dátum magyar idő
 * szerint 00:00 és 02:00 között még az ELŐZŐ napot adja (nyáron UTC+2, télen
 * UTC+1) — egy hó eleji hajnali vásárlás számlája így a megelőző hónapra,
 * vagyis MÁS ÁFA-IDŐSZAKRA szólna. A bizonylat kelt-dátuma a székhely szerinti
 * naptári nap, ezért a zóna-tudatos formázás kötelező.
 *
 * Az 'en-CA' lokál kimenete pontosan YYYY-MM-DD (a mezők explicit megadva,
 * hogy a lokál-adatbázis változása se mozdíthassa el az alakot).
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
 * YYYY-MM-DD alakú-e (a Számla Agent dátummezőinek kapuja).
 *
 * ALAK-ellenőrzés, nem naptári érvényesség: a cél egyrészt a Számla Agent
 * formátum-elvárása, másrészt — mivel a dátumok egy része szabad szöveges
 * DB-mezőből (orders.invoiceCompletionDate) érkezik — az XML-be jutó
 * vezérlőkarakterek (`<`, `>`, `&`, idézőjel) kizárása.
 */
export function isIsoDateString(value: string): boolean {
  return ISO_DATE_PATTERN.test(value)
}
