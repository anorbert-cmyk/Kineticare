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
 * A kelt-dátum és az alak-kapu a közös `src/lib/date/budapest.ts` modulból
 * jön (a statisztika-aggregátor is EZT használja, hogy a hónapforduló
 * Budapest szerint essen). A szamlazz-tesztek változatlanul innen importálnak.
 */
export { budapestDateString, isIsoDateString } from '../date/budapest'
