import type { FieldAccess } from 'payload'

/**
 * Rendszer-írású mező: a REST és az admin UI senkinek sem írhatja
 * (owner/staff sem). A jobok és a local API `overrideAccess: true`-val
 * továbbra is írnak.
 *
 * K5 (2026-08-22): az `admin.readOnly` nem API-védelem. Staff PATCH
 * `invoiceStatus: 'issued'` némán elnyomta a számla-jobot. Tilos zóna 4:
 * merge előtt emberi review.
 */
export const denyFieldWrite: FieldAccess = () => false
