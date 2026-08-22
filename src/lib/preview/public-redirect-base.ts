/**
 * Az előnézet-átirányítás (belépés és kilépés) Location-bázisa.
 *
 * A proxy (Railway edge) mögött a `request.url` a konténer belső címét
 * (pl. http://localhost:8080) hordozza, ami élesben élhetetlen
 * Location-fejlécet adna. A publikus origin a `NEXT_PUBLIC_SERVER_URL`,
 * de csak akkor, ha érvényes abszolút http(s) URL — üres vagy hibás env
 * sosem dobhat 500-at, ilyenkor a kérés URL-je a vésztartalék.
 */
export function publicRedirectBase(requestUrl: string): string {
  const envOrigin = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/+$/, '')
  if (envOrigin === '') {
    return requestUrl
  }
  try {
    const parsed = new URL(envOrigin)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin
    }
  } catch {
    // érvénytelen env — a request.url marad a bázis
  }
  return requestUrl
}
