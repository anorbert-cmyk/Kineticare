/**
 * A vásárló-import közös, KÖRKÖRÖS FÜGGŐSÉG NÉLKÜLI normalizáló segédei.
 *
 * Külön modulban élnek, mert a parser (`parse.ts`) és a címke-értelmező
 * (`tags.ts`) egyaránt használja őket, és a két modul egymásra hivatkozik —
 * a közös alap így nem hoz létre import-kört.
 */

/**
 * Az UTF-8 BOM kódpontja szövegként — a fájl elejéről levágandó. Szándékosan
 * escape-elt alakban (a nyers karakter láthatatlan lenne a forrásban).
 */
export const UTF8_BOM = '\uFEFF'

/** Egyeztetési kulcs fejléchez, kurzusnévhez és címkéhez: trim + kisbetű + szóköz-normalizálás. */
export function normalizeKey(value: string): string {
  return value.replace(UTF8_BOM, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Szóköz-normalizálás a megjelenő értékekhez (az írásmód megmarad). */
export function collapseWhitespace(value: string): string {
  return value.replace(UTF8_BOM, '').trim().replace(/\s+/g, ' ')
}
