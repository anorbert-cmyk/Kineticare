/**
 * URL-barát slug generálása magyar ékezetes szövegből.
 *
 * Az ő/ű betűk Unicode NFD-alakban nem bomlanak alapbetű + jelölőre,
 * ezért az ékezetes karaktereket először explicit táblázattal cseréljük,
 * a maradék kombináló jelölőket pedig NFD-normalizálás után távolítjuk el.
 */

const HUNGARIAN_DIACRITICS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ö: 'o',
  ő: 'o',
  ú: 'u',
  ü: 'u',
  ű: 'u',
}

export function slugify(value: string): string {
  const withoutDiacritics = value
    .toLowerCase()
    .split('')
    .map((char) => HUNGARIAN_DIACRITICS[char] ?? char)
    .join('')

  return withoutDiacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}
