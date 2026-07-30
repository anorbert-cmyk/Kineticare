import type { Payload } from 'payload'

import { logger } from './logger'
import { getRequestId } from './request-id'

/**
 * Audit-log író segéd (T-015).
 *
 * Szabályok:
 * - Best-effort: SOSEM dob hibát a hívó felé — ha az írás elhasal (DB-hiba,
 *   séma-eltérés), az üzleti művelet attól még sikeres marad, a hiba
 *   logger.warn-nel naplózódik.
 * - A requestId-t a PayloadRequest fejléceiből veszi (a requestId-middleware
 *   állítja be), így az audit-sor korrelál a többi naplósorral.
 * - A before/after tartalomból a nyilvánvalóan érzékeny mezőket (jelszó-hash,
 *   token, só) tárolás előtt eltávolítja — a naplóredakcióval azonos kulcslista.
 */

export interface AuditLogDoc {
  id: number | string
}

/** Lásd a WebhookEventStore indoklását — a payload-types a migrációs loop végéig még nem ismeri ezt a collectiont. */
export interface AuditLogStore {
  create: (args: {
    collection: 'audit-logs'
    data: Record<string, unknown>
    overrideAccess?: boolean
  }) => Promise<AuditLogDoc>
}

export function auditLogStore(payload: Payload): AuditLogStore {
  return payload as unknown as AuditLogStore
}

/** A logger redact-listájával konzisztens, sosem tárolható mezőnevek. */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'password',
  'hash',
  'salt',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'poskey',
  'authorization',
  'session',
  'loginattempts',
])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Mélységkorlátos másolat az érzékeny kulcsok nélkül (körkörösség-biztos). */
export function stripSensitiveFields(
  value: unknown,
  seen: ReadonlySet<object> = new Set(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveFields(item, seen))
  }
  if (!isPlainRecord(value)) {
    return value
  }
  if (seen.has(value)) {
    return null
  }
  const nextSeen = new Set(seen)
  nextSeen.add(value)
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue
    }
    output[key] = stripSensitiveFields(item, nextSeen)
  }
  return output
}

export interface WriteAuditLogArgs {
  store: AuditLogStore
  actor?: number | string | null
  action: string
  entityType?: string
  entityId?: number | string | null
  before?: unknown
  after?: unknown
  /** PayloadRequest vagy bármi, aminek Headers-féle fejlécei vannak. */
  req?: { headers?: Headers } | null
  ipAddress?: string | null
}

/**
 * Audit-bejegyzés írása. Visszatérési érték: sikerült-e az írás — a hívó
 * dönthet úgy, hogy naplózza, de hibát sosem kap vissza.
 */
export async function writeAuditLog(args: WriteAuditLogArgs): Promise<boolean> {
  const { store, req } = args
  try {
    const requestId = req?.headers ? getRequestId(req.headers) : undefined
    await store.create({
      collection: 'audit-logs',
      data: {
        action: args.action,
        ...(args.actor !== undefined && args.actor !== null ? { actor: args.actor } : {}),
        ...(args.entityType ? { entityType: args.entityType } : {}),
        ...(args.entityId !== undefined && args.entityId !== null
          ? { entityId: String(args.entityId) }
          : {}),
        ...(args.before !== undefined ? { before: stripSensitiveFields(args.before) } : {}),
        ...(args.after !== undefined ? { after: stripSensitiveFields(args.after) } : {}),
        ...(requestId ? { requestId } : {}),
        ...(args.ipAddress ? { ipAddress: args.ipAddress } : {}),
      },
      overrideAccess: true,
    })
    return true
  } catch (error) {
    logger.warn('audit-bejegyzés írása sikertelen (best-effort)', {
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/** Kliens-IP kinyerése proxyzott környezetből (Cloudflare → x-forwarded-for). */
export function resolveClientIp(headers: Headers | undefined): string | undefined {
  if (!headers) {
    return undefined
  }
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp
  }
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || undefined
  }
  return undefined
}
