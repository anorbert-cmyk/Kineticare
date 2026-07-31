import type { Payload, Where } from 'payload'

import { logger } from './logger'

/**
 * Webhook-idempotencia (T-014) — a fizetési/ügyfél-események sosem
 * dolgozódnak fel kétszer.
 *
 * A deduplikáció adatbázis-szintű: a webhook-events collection (provider,
 * externalId) összetett egyedi kulcsán ütközik a párhuzamos duplikátum.
 * Ez a modul a versenyhelyzet-biztos "létrehozás-vagy-meglévő" mintát és a
 * státuszgépet (received → processed / failed, attempts-számlálóval)
 * valósítja meg; a tényleges, provider-specifikus feldolgozást a hívó adja
 * át handlerként (Barion/Számlázz.hu sprintek), illetve a retry-job számára
 * a registerWebhookProcessor regisztráció szolgálja.
 */

export type WebhookProvider = 'barion' | 'stream' | 'szamlazz'

export type WebhookEventStatus = 'received' | 'processed' | 'failed'

export interface WebhookEventDoc {
  id: number | string
  provider: WebhookProvider
  externalId: string
  eventType?: string | null
  payload?: unknown
  status: WebhookEventStatus
  attempts?: number | null
  lastError?: string | null
  requestId?: string | null
  /** A sikeres/végleges feldolgozás időpontja (hiba esetén null — retryable). */
  processedAt?: string | null
  /** Az utolsó feldolgozás üzleti kimenetele (pl. paid/cancelled/pending_repoll/failed/rejected). */
  result?: string | null
  updatedAt?: string
  createdAt?: string
}

/**
 * Minimális, strukturálisan mockolható tárolófelület a webhook-events
 * collectionhöz. A payload-types.ts a konsolidációs migrációs loop végéig még
 * nem tartalmazza ezt a collectiont, ezért a valódi Payload-példányt egyetlen,
 * dokumentált határponton (webhookEventStore) adjuk át — a belső logika és a
 * tesztek típusosak maradnak.
 */
export interface WebhookEventStore {
  find: (args: {
    collection: 'webhook-events'
    where?: Where
    sort?: string
    limit?: number
    overrideAccess?: boolean
  }) => Promise<{ docs: WebhookEventDoc[]; totalDocs: number }>
  create: (args: {
    collection: 'webhook-events'
    data: Record<string, unknown>
    overrideAccess?: boolean
  }) => Promise<WebhookEventDoc>
  update: (args: {
    collection: 'webhook-events'
    id: number | string
    data: Record<string, unknown>
    overrideAccess?: boolean
  }) => Promise<WebhookEventDoc>
}

export function webhookEventStore(payload: Payload): WebhookEventStore {
  return payload as unknown as WebhookEventStore
}

/** Egy esemény maximális feldolgozási kísérletei (első + újrapróbálások). */
export const MAX_WEBHOOK_ATTEMPTS = 5

/** Exponenciális backoff alapja és plafonja a retry-jobhoz. */
export const WEBHOOK_RETRY_BASE_MS = 60_000
export const WEBHOOK_RETRY_CAP_MS = 3_600_000

export type WebhookHandler = (event: WebhookEventDoc) => Promise<unknown>

export interface ProcessWebhookParams {
  store: WebhookEventStore
  provider: WebhookProvider
  externalId: string
  eventType?: string
  /** A nyers webhook-body — az első érkezéskor tároljuk (hibakereséshez). */
  payloadData?: unknown
  requestId?: string
  handler: WebhookHandler
}

export type ProcessWebhookOutcome =
  | { kind: 'processed'; eventId: number | string; attempts: number; result: unknown }
  /** Már korábban sikeresen feldolgoztuk — no-op, a korábbi eredmény jelzése. */
  | { kind: 'already-processed'; eventId: number | string }
  /** Versenyhelyzet: egy párhuzamos worker hozta létre / dolgozza fel éppen. */
  | { kind: 'in-progress'; eventId?: number | string }
  | {
      kind: 'failed'
      eventId: number | string
      attempts: number
      retryable: boolean
      error: string
    }

/** Postgres unique-violation (23505) felismerése a hibaláncban (cause-okkal együtt). */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  const seen = new Set<unknown>()
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown }
    if (candidate.code === '23505') {
      return true
    }
    if (typeof candidate.message === 'string' && candidate.message.includes('duplicate key')) {
      return true
    }
    current = candidate.cause
  }
  return false
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function findByKey(store: WebhookEventStore, provider: WebhookProvider, externalId: string) {
  return store.find({
    collection: 'webhook-events',
    where: {
      and: [{ provider: { equals: provider } }, { externalId: { equals: externalId } }],
    },
    limit: 1,
    overrideAccess: true,
  })
}

/** A státuszgép közös magja: attempts++ → handler → processed/failed. */
async function attemptProcessing(
  store: WebhookEventStore,
  record: WebhookEventDoc,
  handler: WebhookHandler,
): Promise<ProcessWebhookOutcome> {
  const attempts = (record.attempts ?? 0) + 1
  try {
    const result = await handler(record)
    await store.update({
      collection: 'webhook-events',
      id: record.id,
      data: { status: 'processed', attempts, lastError: null },
      overrideAccess: true,
    })
    return { kind: 'processed', eventId: record.id, attempts, result }
  } catch (error) {
    const message = errorMessage(error)
    // A státuszfrissítés best-effort: ha ez is elhasal, a rekord received/failed
    // marad, és a retry-job később újra elviszi.
    await store
      .update({
        collection: 'webhook-events',
        id: record.id,
        data: { status: 'failed', attempts, lastError: message },
        overrideAccess: true,
      })
      .catch(() => undefined)
    return {
      kind: 'failed',
      eventId: record.id,
      attempts,
      retryable: attempts < MAX_WEBHOOK_ATTEMPTS,
      error: message,
    }
  }
}

/**
 * Idempotens webhook-feldolgozás.
 *
 * - Ha az esemény már `processed`: no-op, `already-processed` jelzéssel.
 * - Ha `received`/`failed`: attempts++ és újrapróbálás.
 * - Ha még nincs rekord: létrehozás `received` státusszal; a (provider,
 *   externalId) unique-violation elkapása azt jelenti, hogy egy párhuzamos
 *   worker már feldolgozta / éppen feldolgozza (`in-progress`).
 */
export async function processWebhook({
  store,
  provider,
  externalId,
  eventType,
  payloadData,
  requestId,
  handler,
}: ProcessWebhookParams): Promise<ProcessWebhookOutcome> {
  const existing = await findByKey(store, provider, externalId)
  const record = existing.docs[0]

  if (record) {
    if (record.status === 'processed') {
      logger.info('webhook-esemény már feldolgozva — duplikátum eldobva', {
        provider,
        externalId,
        eventId: record.id,
      })
      return { kind: 'already-processed', eventId: record.id }
    }
    return attemptProcessing(store, record, handler)
  }

  let created: WebhookEventDoc
  try {
    created = await store.create({
      collection: 'webhook-events',
      data: {
        provider,
        externalId,
        status: 'received',
        attempts: 0,
        ...(eventType ? { eventType } : {}),
        ...(payloadData !== undefined ? { payload: payloadData } : {}),
        ...(requestId ? { requestId } : {}),
      },
      overrideAccess: true,
    })
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error
    }
    // Versenyhelyzet: a unique kulcs másoknak már megvan — az esemény
    // feldolgozva vagy feldolgozás alatt áll, itt semmilyen handler nem futhat.
    const raced = await findByKey(store, provider, externalId)
    const racedRecord = raced.docs[0]
    logger.info('webhook-esemény versenyhelyzetben létrejött — feldolgozás kihagyva', {
      provider,
      externalId,
      eventId: racedRecord?.id,
    })
    return { kind: 'in-progress', eventId: racedRecord?.id }
  }

  return attemptProcessing(store, created, handler)
}

// ---------------------------------------------------------------------------
// Feldolgozó-regisztráció a retry-job számára
// ---------------------------------------------------------------------------

const processors = new Map<WebhookProvider, WebhookHandler>()

/**
 * Provider-specifikus feldolgozó regisztrációja (a Barion/Számlázz.hu/Stream
 * webhook-route import idején hívja). A webhook-retry job csak regisztrált
 * feldolgozójú eseményeket futtat újra.
 */
export function registerWebhookProcessor(provider: WebhookProvider, handler: WebhookHandler): void {
  processors.set(provider, handler)
}

export function getWebhookProcessor(provider: WebhookProvider): WebhookHandler | undefined {
  return processors.get(provider)
}

/** Várakozási idő a következő kísérletig (exponenciális, plafonozott). */
export function retryDelayMs(attempts: number): number {
  const exponent = Math.max(attempts - 1, 0)
  return Math.min(WEBHOOK_RETRY_BASE_MS * 2 ** exponent, WEBHOOK_RETRY_CAP_MS)
}

/** A retry-job szűrése: elégséges idő telt-e el az utolsó kísérlet óta. */
export function isRetryDue(event: WebhookEventDoc, nowMs: number): boolean {
  const attempts = event.attempts ?? 0
  if (!event.updatedAt) {
    return true
  }
  const lastAttemptMs = Date.parse(event.updatedAt)
  if (Number.isNaN(lastAttemptMs)) {
    return true
  }
  return nowMs - lastAttemptMs >= retryDelayMs(Math.max(attempts, 1))
}
