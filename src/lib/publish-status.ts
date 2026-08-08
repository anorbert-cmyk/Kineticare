import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Publikálási állapot — a kettős státusz feloldása (Pages + Posts).
 *
 * A collectionöknek KÉT publikáltsági jelzésük van:
 *  - a Payload natív drafts-verziózásának `_status` mezője (Piszkozat/Közzététel
 *    gombok az adminban),
 *  - és a saját `status` select, amelyre a nyilvános read-politika
 *    (src/access/publishedOrAdmin.ts), a storefront-lekérdezések
 *    (`PUBLISHED_WHERE` az src/lib/cms.ts-ben) és a sitemap szűr.
 *
 * A szerkesztőnek ebből csak EGY dolgot szabad látnia: a natív
 * Piszkozat/Közzététel gombokat. A saját `status` mező ezért az adminban rejtett
 * (`admin.hidden`), az értékét pedig a `syncStatusFromDraftStatus` hook tartja
 * szinkronban a `_status`-szal — így egyik szűrő sem törhet el, és nem fordulhat
 * elő, hogy a szerkesztő „közzétett" egy oldalt, ami mégsem látszik.
 *
 * FONTOS: ez a két hook KIZÁRÓLAG a pages/posts collectionökre van bekötve.
 * A products saját `status` enumja (draft/published/archived, src/plugins/
 * ecommerce.ts) érintetlen marad — arra ez a szinkron nem is lenne értelmes.
 */

/** A két collection publikáltsági értékkészlete (a `_status` és a `status` közös enumja). */
export type PublishStatus = 'draft' | 'published'

const isPublishStatus = (value: unknown): value is PublishStatus =>
  value === 'draft' || value === 'published'

/**
 * A mentés után érvényes `_status` kiszámítása.
 *
 * A Payload a kérésből (`draft=true`) vagy a beküldött adatból tölti a
 * `data._status`-t még a collection beforeChange hookok ELŐTT; ha egyik sincs
 * (pl. részleges local API update), a dokumentum korábbi állapota marad
 * érvényben. Create-nél az alapértelmezés — a `_status` mező defaultValue-ja
 * szerint — a piszkozat.
 */
export const resolveDraftStatus = (
  data: { _status?: unknown } | null | undefined,
  originalDoc?: { _status?: unknown } | null,
): PublishStatus => {
  if (isPublishStatus(data?._status)) {
    return data._status
  }
  if (isPublishStatus(originalDoc?._status)) {
    return originalDoc._status
  }
  return 'draft'
}

/**
 * A saját `status` mező szinkronizálása a natív `_status`-ból.
 * `_status === 'published'` → `status = 'published'`, minden más esetben 'draft'.
 */
export const syncStatusFromDraftStatus: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) {
    return data
  }
  data.status = resolveDraftStatus(data, originalDoc)
  return data
}

/** Üresnek számít a null, az undefined és a csak whitespace-ből álló szöveg. */
const isEmptyDate = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)

/**
 * `publishedAt` automatika: az ELSŐ közzétételkor (a `_status` publishedre vált,
 * és még nincs érték) a mező a mentés időpontját kapja. Meglévő értéket sosem ír
 * felül — a szerkesztő kézzel megadott dátuma megmarad, és az újbóli közzététel
 * sem tolja előre a megjelenés dátumát.
 *
 * A `now` paraméter csak a tesztelhetőség miatt injektálható.
 */
export const applyPublishedAtDefault = (
  data: { _status?: unknown; publishedAt?: unknown },
  originalDoc?: { _status?: unknown; publishedAt?: unknown } | null,
  now: Date = new Date(),
): void => {
  if (resolveDraftStatus(data, originalDoc) !== 'published') {
    return
  }
  // Részleges update-nél a publishedAt nincs benne a payloadban — ilyenkor a
  // dokumentum meglévő értéke az irányadó.
  const current = data.publishedAt !== undefined ? data.publishedAt : originalDoc?.publishedAt
  if (!isEmptyDate(current)) {
    return
  }
  data.publishedAt = now.toISOString()
}

/** A fenti automatika collection beforeChange hookként (pages + posts). */
export const setPublishedAtOnFirstPublish: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) {
    return data
  }
  applyPublishedAtDefault(data, originalDoc)
  return data
}
