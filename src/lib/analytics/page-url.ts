/**
 * Analytics felé KIMENŐ oldal-URL megtisztítása (M9).
 *
 * ═══ MIÉRT KELL ═══
 * A jelszó-visszaállító link a visszaállító JEGYET query-paraméterben hordozza
 * (/jelszo-visszaallitas?token=…, src/lib/password-reset-url.ts). A pageview-
 * capture korábban a TELJES URL-t továbbította — a jegy így harmadik fél
 * (PostHog/GA4) naplóiba került volna, ahol hozzáférhető és visszaélhető
 * (a jegy a fiók átvételére is elég). Egyetlen esemény sem küldheti ki.
 *
 * ═══ MIT ŐRIZ MEG ═══
 * SZELEKTÍVEN maszkol: csak a felsorolt, jegyet hordozó paraméterek kerülnek
 * ki — a kampány-paraméterek (utm_*) MARADNAK, mert a kampány-attribúció
 * üzleti követelmény (a kurzus-átirányítás is azért őrzi a query-t, lásd
 * course-url.ts). A hash-részlet mindig lemarad (mérési értéke nincs, jegyet
 * viszont hordozhatna).
 *
 * Relatív (`/kurzusok?x=1`) és abszolút URL-re egyaránt működik — szándékosan
 * NEM a URL/URLSearchParams API-t használja, hogy bázis-URL nélkül, relatív
 * alakra is biztonságos legyen.
 */

/** A kimenő URL-ből MINDIG eltávolítandó query-paraméterek (kis-nagybetűtől függetlenül). */
const SENSITIVE_QUERY_PARAMS: readonly string[] = ['token']

/**
 * Az URL megtisztítva: érzékeny query-paraméterek kivágva, hash lemarad,
 * minden más (útvonal, utm_*, stb.) érintetlen.
 */
export function sanitizeAnalyticsUrl(url: string): string {
  if (typeof url !== 'string' || url.length === 0) {
    return ''
  }
  const hashIndex = url.indexOf('#')
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const queryIndex = withoutHash.indexOf('?')
  if (queryIndex === -1) {
    return withoutHash
  }
  const path = withoutHash.slice(0, queryIndex)
  const rawQuery = withoutHash.slice(queryIndex + 1)
  const kept = rawQuery.split('&').filter((pair) => {
    if (pair.length === 0) {
      return false
    }
    const rawKey = pair.split('=')[0]
    let key = rawKey
    try {
      key = decodeURIComponent(rawKey)
    } catch {
      // Sérült kódolású kulcs: nyersen marad — a lista akkor is kiszűri, ha kell.
    }
    return !SENSITIVE_QUERY_PARAMS.includes(key.toLowerCase())
  })
  return kept.length > 0 ? `${path}?${kept.join('&')}` : path
}
