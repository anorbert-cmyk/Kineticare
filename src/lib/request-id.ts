/**
 * Request ID segédek.
 *
 * A `src/middleware.ts` minden bejövő kéréshez request ID-t rendel: a meglévő
 * `x-request-id` headert tiszteletben tartja (ha formailag érvényes), egyébként
 * generál, és a response headerben is visszaadja.
 *
 * Route handlerben, server actionben vagy Payload-hookban a `getRequestId`
 * segéddel lehet kiolvasni a headerből, és a logger contextébe kötni:
 * a kapott azonosítót a `logger.child({ requestId })` hívással érdemes
 * rögzíteni, hogy az adott kérés összes naplósora ugyanazzal a request ID-vel
 * fusson (a pénzügyi webhookok debugolásához ez kötelező).
 */

export const REQUEST_ID_HEADER = 'x-request-id'

/** Konzervatív formai szűrő: betűk, számok, kötőjel, pont és alulvonás, max. 128 karakter. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/

export function isValidRequestId(value: string): boolean {
  return REQUEST_ID_PATTERN.test(value)
}

/**
 * Kriptográfiailag erős UUID, ha a runtime támogatja; különben egyedi,
 * nem-biztonsági fallback (a request ID nem titok, csak korrelációs azonosító).
 */
export function generateRequestId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

/** A bejövő headert veszi alapul, ha érvényes; egyébként újat generál. */
export function resolveRequestId(incomingHeader: string | null): string {
  if (incomingHeader && isValidRequestId(incomingHeader)) {
    return incomingHeader
  }
  return generateRequestId()
}

/**
 * Kiolvassa a request ID-t a (middleware által továbbított) fejlécekből.
 * Akkor ad vissza értéket, ha a middleware már beállította; egyébként undefined.
 */
export function getRequestId(headers: Headers): string | undefined {
  const value = headers.get(REQUEST_ID_HEADER)
  return value && isValidRequestId(value) ? value : undefined
}
