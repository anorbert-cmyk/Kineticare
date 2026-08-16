/**
 * Telefonszám → `tel:` href.
 *
 * A megjelenített szám tagolt marad („+36 30 169 2263"), a hívás-link viszont
 * csak a `+` előjelet és a számjegyeket viheti.
 *
 * A séma itt KÓDBÓL épül (nem szerkesztői szabad szövegből), ezért nem megy át a
 * `sanitizeCmsUrl` allowlistján — az a `tel:`-t tudatosan tiltja a szabadon
 * gépelhető webcím-mezőkben. Az összeállítás azért biztonságos, mert a
 * bemenetből MINDEN más karakter kiesik: injektálható rész nem marad benne.
 *
 * MIÉRT KÖZÖS MODUL: két szekció is telefonszámot jelenít meg CMS-mezőből (a
 * szakértő-kártya és az időpontkérő szekció). Két külön másolat csendben
 * szétcsúszhatna, és a `tel:`-összeállítás biztonsági kérdés — ezért egy
 * forrásból jön (a `TeamMembers` a visszafelé-kompatibilitás miatt tovább
 * exportálja).
 */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 0) {
    return null
  }
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`
}
