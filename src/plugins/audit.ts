import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Plugin } from 'payload'

import { auditLogStore, resolveClientIp, writeAuditLog } from '../lib/audit'

/**
 * Audit plugin (T-015) — config-szintű hook-injekció.
 *
 * Szándékosan NEM a collection-fájlok szerkesztésével köti be az
 * audit-hookokat (azok más workerek scope-ja), hanem az src/plugins/ecommerce.ts
 * mintájára: a buildConfig plugins-láncában lefut, végigmegy a (már
 * bővített) config.collections listán, és a pages/posts/products/orders/users
 * collectionökhöz afterChange/afterDelete hookot fűz — a meglévő hookokat
 * megtartva.
 *
 * Auditált események:
 * - create / delete mind az öt collectionön,
 * - pages/posts: publish-átmenet (saját `status` mező → published — ezek nem
 *   használnak draft-verziózást),
 * - products: publish-átmenet (drafts `_status` mező → published),
 * - orders: refund-mezők (refundReason, refundedAt) változása,
 * - users: role-változás.
 *
 * Fontos: a plugins-láncban az ecommerce plugin UTÁN kell futnia, különben a
 * products/orders collectionök még nem léteznének az injekciókor.
 */

const AUDITED_SLUGS: ReadonlySet<string> = new Set([
  'pages',
  'posts',
  'products',
  'orders',
  'users',
])

/** Mely collection mely státusz-mezőn publikál (pages/posts: saját status; products: drafts _status). */
const PUBLISH_STATUS_FIELD: Readonly<Record<string, string>> = {
  pages: 'status',
  posts: 'status',
  products: '_status',
}

const ORDER_REFUND_FIELDS = ['refundReason', 'refundedAt'] as const

function fieldChanged(before: unknown, after: unknown, field: string): boolean {
  if (
    typeof before !== 'object' ||
    before === null ||
    typeof after !== 'object' ||
    after === null
  ) {
    return false
  }
  const beforeValue = (before as Record<string, unknown>)[field]
  const afterValue = (after as Record<string, unknown>)[field]
  return beforeValue !== afterValue
}

function fieldValue(doc: unknown, field: string): unknown {
  if (typeof doc !== 'object' || doc === null) {
    return undefined
  }
  return (doc as Record<string, unknown>)[field]
}

/** A vizsgált átmenetek eldöntése — tiszta függvény, külön tesztelhető. */
export function auditActionsForChange(
  collectionSlug: string,
  operation: 'create' | 'update' | string,
  doc: unknown,
  previousDoc: unknown,
): string[] {
  const actions: string[] = []
  if (operation === 'create') {
    actions.push('create')
  }
  if (operation === 'update') {
    const publishField = PUBLISH_STATUS_FIELD[collectionSlug]
    if (
      publishField &&
      fieldValue(doc, publishField) === 'published' &&
      fieldValue(previousDoc, publishField) !== 'published'
    ) {
      actions.push('publish')
    }
    if (
      collectionSlug === 'orders' &&
      ORDER_REFUND_FIELDS.some((field) => fieldChanged(previousDoc, doc, field))
    ) {
      actions.push('refund-update')
    }
    if (collectionSlug === 'users' && fieldValue(previousDoc, 'role') !== fieldValue(doc, 'role')) {
      actions.push('role-change')
    }
  }
  return actions
}

export const auditAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
  collection,
}) => {
  const actions = auditActionsForChange(collection.slug, operation, doc, previousDoc)
  if (actions.length === 0) {
    return doc
  }
  await writeAuditLog({
    store: auditLogStore(req.payload),
    actor: req.user?.id ?? null,
    action: actions.join(','),
    entityType: collection.slug,
    entityId: fieldValue(doc, 'id') as number | string | undefined,
    before: operation === 'update' ? previousDoc : undefined,
    after: doc,
    req,
    ipAddress: resolveClientIp(req.headers),
  })
  return doc
}

export const auditAfterDelete: CollectionAfterDeleteHook = async ({ doc, req, collection }) => {
  await writeAuditLog({
    store: auditLogStore(req.payload),
    actor: req.user?.id ?? null,
    action: 'delete',
    entityType: collection.slug,
    entityId: fieldValue(doc, 'id') as number | string | undefined,
    before: doc,
    req,
    ipAddress: resolveClientIp(req.headers),
  })
  return doc
}

export const audit: Plugin = (config) => ({
  ...config,
  collections: (config.collections ?? []).map((collection) => {
    if (!AUDITED_SLUGS.has(collection.slug)) {
      return collection
    }
    return {
      ...collection,
      hooks: {
        ...collection.hooks,
        afterChange: [...(collection.hooks?.afterChange ?? []), auditAfterChange],
        afterDelete: [...(collection.hooks?.afterDelete ?? []), auditAfterDelete],
      },
    }
  }),
})

export default audit
