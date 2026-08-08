/**
 * Kliens-IP kinyerése proxyzott kérés fejléceiből.
 *
 * Az `x-forwarded-for` a proxy-láncot vesszővel elválasztva sorolja fel
 * (`kliens, proxy1, proxy2`) — a kliens IP-je mindig az ELSŐ elem. A teljes lánc
 * naplózása félrevezető: a saját infrastruktúránk IP-jei is bekerülnek a naplóba,
 * és a bejegyzések IP szerinti összevetése (pl. brute-force-gyanú a sikertelen
 * belépéseknél) eltörik, mert ugyanaz a kliens kérésenként más-más lánc-értékkel
 * jelenik meg. Ezért mindig az első elem számít, trimmelve.
 *
 * Fallback az `x-real-ip` (egyetlen IP-t tartalmaz, láncot nem). Üres vagy csak
 * whitespace-t tartalmazó fejléc = hiányzó fejléc.
 */

/**
 * Minimális fejléc-olvasó. A DOM `Headers` illeszkedik rá; a `get` azért
 * opcionális, mert a Payload hook-argumentumában a fejléc-objektum megléte
 * futásidőben nem garantált (unit-tesztek egyszerűsített `req`-mockja).
 */
type HeaderReader = { get?: (name: string) => string | null | undefined }

/** Egy fejléc értéke, üres/whitespace-only értéket hiányzónak tekintve. */
function readHeader(headers: HeaderReader | undefined | null, name: string): string | undefined {
  const value = headers?.get?.(name)
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * A kérést indító kliens IP-címe, vagy `undefined`, ha egyik fejlécből sem
 * állapítható meg. A hívó dönti el, mit ír a hiányzó érték helyére.
 */
export function resolveClientIp(headers: HeaderReader | undefined | null): string | undefined {
  const forwarded = readHeader(headers, 'x-forwarded-for')
  if (forwarded !== undefined) {
    const clientHop = forwarded.split(',')[0]?.trim()
    if (clientHop !== undefined && clientHop.length > 0) {
      return clientHop
    }
  }
  return readHeader(headers, 'x-real-ip')
}
