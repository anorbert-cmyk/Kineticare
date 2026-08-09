/**
 * Közös XML-segéd a Számlázz.hu-modulokhoz. Külön fájlban él (nem az
 * invoice.ts-ben), hogy a transport-modulok (pdf.ts, dijbekero.ts) importálhassák
 * körkörös függőség nélkül.
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
