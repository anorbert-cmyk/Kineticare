/**
 * CMS-ből érkező URL-ek allowlist-alapú tisztítása (sec-review).
 *
 * A szerkesztői felületen megadott href-ek (CTA-linkek, richText-linkek,
 * sajtólogó-URL-ek) ellenőrzés nélkül nem kerülhetnek href-attribútumba:
 * a `javascript:` és hasonló sémájú értékek XSS-vektort jelentenének.
 *
 * Engedélyezett:
 * - https: és http: abszolút URL,
 * - mailto: cím,
 * - gyökér-relatív útvonal ("/…") — a protokoll-relatív "//host" NEM az,
 * - lapon belüli horgony ("#…") — a hero/CTA navigáció használja.
 *
 * Minden más (javascript:, data:, vbscript:, hibás/üres bemenet) → null.
 * A null-t a hívó úgy kezeli, hogy a link NEM renderelődik href-ként
 * (a Button letiltott span-t renderel, a többi helyen a szöveg/kép marad).
 */
export function sanitizeCmsUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (trimmed.startsWith('#')) {
    // Lapon belüli horgony — sémát nem vihet be, de a vezérlőkarakteres
    // trükköket itt is zárjuk.
    if (/[\r\n\\]/.test(trimmed)) {
      return null
    }
    return trimmed
  }
  if (trimmed.startsWith('/')) {
    // A "//host" protokoll-relatív (külső oldalra visz), a backslash/vezérlő-
    // karakteres trükkök ("/\evil", sortörés) pedig parser-függőek — zárvák.
    if (trimmed.startsWith('//') || /[\r\n\\]/.test(trimmed)) {
      return null
    }
    return trimmed
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
    return trimmed
  }
  return null
}
