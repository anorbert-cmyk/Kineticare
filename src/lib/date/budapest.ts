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
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Hónaphosszak (a február a szökőév-szabályból jön). */
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Proleptikus Gergely-naptár (ISO 8601) szökőév-szabálya. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28
  }
  return MONTH_LENGTHS[month - 1] ?? 0
}

/**
 * A megadott pillanat naptári napja Europe/Budapest zónában, YYYY-MM-DD.
 *
 * FIGYELEM: érvénytelen `Date`-re (`new Date('x')`) az `Intl` `RangeError`-t
 * dob — ez a szerződése, a hívók valós pillanattal hívják (a Számla Agent
 * kelt-dátuma az alapértelmezett `new Date()`-ből jön). Ahol a bemenet
 * bizonytalan, a `budapestMonthKey` a kapu: az `null`-t ad, nem dob.
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
 * Érvényes YYYY-MM-DD dátum-e — ALAK **és** NAPTÁR szerint.
 *
 * A cél egyrészt a Számla Agent formátum-elvárása, másrészt — mivel a dátumok
 * egy része szabad szöveges DB-mezőből (`orders.invoiceCompletionDate`)
 * érkezik — a vezérlőkarakterek (`<`, `>`, `&`, idézőjel) kizárása.
 *
 * ═══ MIÉRT NEM ELÉG AZ ALAK (F4, 2026-08-21-i vizsgálat) ═══
 * A puszta alak-ellenőrzésen a `'2026-13-45'` és a `'2026-02-30'` is átment.
 * Két helyen okozott kárt:
 *  1. Statisztika: a `'2026-13'` hónap-kulcshoz nincs vödör, ezért a rendelés
 *     a bevételből ÉS az `orderCount`-ból is kiesett (némán, nyom nélkül).
 *  2. Számlázás: egy naptárilag nem létező nap escape-elve is kiment volna a
 *     Számla Agent felé (`teljesitesDatum` / `keltDatum`), vagyis rossz —
 *     vagy a NAV felé visszautasított — bizonylat készült volna belőle.
 * A naptári ellenőrzés mindkét helyen SZIGORÍT: az érvényes dátumok
 * viselkedése változatlan (mérve: `src/__tests__/budapest-datum.test.ts` és a
 * szamlazz-tesztek), a naptárilag lehetetlen dátum viszont most már elbukik a
 * kapun — a statisztikában `createdAt`-tartalékra, a számlázásban végleges,
 * emberi adatjavítást kérő hibára fut.
 *
 * A szökőév-szabály proleptikus Gergely-naptár szerinti (ISO 8601): a 4-gyel
 * osztható év szökő, kivéve a 100-zal oszthatót, kivéve a 400-zal oszthatót.
 */
export function isIsoDateString(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)
  if (match === null) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) {
    return false
  }
  return day >= 1 && day <= daysInMonth(year, month)
}

/**
 * YYYY-MM hónap-kulcs Budapest szerint. Érvénytelen dátumnál `null`.
 *
 * Az érvénytelen `Date` kiszűrése NEM elhagyható: az `Intl.DateTimeFormat`
 * ilyenkor `RangeError`-t dob, és a hívó (`listMonthKeys`) ezt közvetlenül a
 * statisztika-nézet renderelése közben kapná meg — egy elrontott `now` így az
 * egész admin-nézetet 500-azná ahelyett, hogy üres ablakot adna.
 */
export function budapestMonthKey(now: Date): string | null {
  if (Number.isNaN(now.getTime())) {
    return null
  }
  const day = budapestDateString(now)
  return day.length >= 7 ? day.slice(0, 7) : null
}
