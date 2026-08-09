import type { Payload } from 'payload'

import type { Logger } from '../logger'

/**
 * A számlázási állapotmezők írása a rendelésre (számla / stornó / helyesbítő).
 *
 * A mezőket KIZÁRÓLAG a rendszer írja (overrideAccess: true) — az admin
 * felületen readOnly-k. A hívó szolgáltatások (invoice.ts, storno.ts,
 * corrective.ts) ezen az egy ponton nyúlnak az orders collectionhöz, így az
 * írás módja (és a hibatűrése) egy helyen dokumentált.
 */
export async function writeOrderInvoicingState(
  payload: Payload,
  orderId: number,
  data: Record<string, unknown>,
): Promise<void> {
  await payload.update({
    collection: 'orders',
    id: orderId,
    data,
    overrideAccess: true,
  })
}

/**
 * Best-effort állapotírás: a hibaágakban (ahol már úgyis hibát kezelünk) az
 * állapotmentés bukása nem nyelheti el az eredeti hibát — csak naplózzuk.
 */
export async function writeOrderInvoicingStateBestEffort(
  payload: Payload,
  orderId: number,
  data: Record<string, unknown>,
  log?: Logger,
): Promise<void> {
  try {
    await writeOrderInvoicingState(payload, orderId, data)
  } catch (error) {
    log?.warn('a számlázási állapot mentése nem sikerült (best-effort)', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
