import type { Payload } from 'payload'

import type { Order } from '../payload-types'
import { getSzamlazzConfig } from './szamlazz'
import { ORDER_MAINTENANCE_QUEUE } from '../jobs/queues'
import { sendMail, type SendResult } from './email'
import { orderConfirmationEmail } from './email/templates/order'
import { logger as rootLogger, type Logger } from './logger'

/**
 * Friss paid-átmenet MELLÉKHATÁSAI (T-024/W4-01, W4-03) — a Barion-állapotgép
 * KIZÁRÓLAG transitionedToPaid=true esetén hívja (a callback-processzor és az
 * order-poll job egyaránt). Így az e-mail/számlázás definíció szerint egyszer
 * fut le egy rendeléshez; a duplikált paid-jelzés no-op marad.
 *
 * 1. invoice-issue job sorba állítása (Számlázz.hu — a tényleges kiállítás a
 *    jobban történik, saját retry-val; kikapcsolt integrációnál a job 'disabled'
 *    kimenetet ad, ezért a queue-hívás akkor is biztonságos, ha nincs kulcs).
 * 2. Vásárlás-visszaigazoló e-mail a vevőnek (best-effort).
 *
 * A függvény SOSEM dob: mindkét mellékhatás best-effort — a fizetési főlánc
 * (paid + purchases) ettől függetlenül is konzisztens marad, a hibák naplózva
 * (a számlázás az order-poll resweep-jéből is utolérhető).
 */

type JobsQueueLike = {
  queue?: (args: {
    task: string
    input?: Record<string, unknown>
    queue?: string
  }) => Promise<unknown>
}

/**
 * Az invoice-issue job sorba állítása. A payload-types a konsolidációs loopig
 * még nem ismeri az új taskot — a TypedJobs-generálás frissüléséig a hívás
 * strukturálisan castolt (a runtime jobs.queue létezik).
 */
export async function queueInvoiceIssueJob(
  payload: Payload,
  orderId: number,
  log?: Logger,
): Promise<boolean> {
  try {
    const jobs = (payload as unknown as { jobs?: JobsQueueLike }).jobs
    if (typeof jobs?.queue !== 'function') {
      return false
    }
    await jobs.queue({ task: 'invoice-issue', input: { orderId }, queue: ORDER_MAINTENANCE_QUEUE })
    log?.info('számlakiállítási job sorba állítva', { orderId })
    return true
  } catch (error) {
    log?.warn('számlakiállítási job sorba állítása sikertelen (best-effort)', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

interface CustomerSnapshotShape {
  name?: unknown
  email?: unknown
}

function snapshotString(snapshot: CustomerSnapshotShape, key: keyof CustomerSnapshotShape): string {
  const value = snapshot[key]
  return typeof value === 'string' ? value.trim() : ''
}

export interface OnOrderPaidDeps {
  payload: Payload
  order: Order
  logger?: Logger
  /** Injektálható küldő (teszteléshez); alapból a provider-réteg sendMail-je. */
  send?: (input: { to: string; subject: string; html: string; text: string }) => Promise<SendResult>
  /** Injektálható job-queue (teszteléshez); alapból a valódi queueInvoiceIssueJob. */
  queueInvoice?: (orderId: number) => Promise<boolean>
}

/** A friss paid-átmenet mellékhatásai — sosem dob, minden hiba naplózva. */
export async function onOrderPaid(deps: OnOrderPaidDeps): Promise<void> {
  const log = (deps.logger ?? rootLogger).child({
    module: 'order-paid',
    orderId: deps.order.id,
    orderNumber: deps.order.orderNumber ?? null,
  })

  try {
    const queueInvoice =
      deps.queueInvoice ?? ((orderId: number) => queueInvoiceIssueJob(deps.payload, orderId, log))
    await queueInvoice(deps.order.id)
  } catch (error) {
    // A függvény sosem dob: a queue-hiba naplózva, az e-mail ettől megy,
    // a számla a következő order-poll resweepből is utolérhető.
    log.warn('számla-job sorba állítása kivétellel állt le (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const snapshot =
      typeof deps.order.customerSnapshot === 'object' && deps.order.customerSnapshot !== null
        ? (deps.order.customerSnapshot as CustomerSnapshotShape)
        : {}
    const recipient = (deps.order.customerEmail ?? '').trim() || snapshotString(snapshot, 'email')
    if (!recipient) {
      log.warn('visszaigazoló e-mail kihagyva: nincs címzett a rendelésen')
      return
    }

    const items = (deps.order.items ?? []).map((item) => {
      const quantity = item.quantity ?? 1
      const unit = item.priceHufSnapshot ?? 0
      return {
        title: item.titleSnapshot?.trim() || 'Kineticare online kurzus',
        quantity,
        totalHuf: unit * quantity,
      }
    })
    const totalHuf =
      typeof deps.order.totalHufSnapshot === 'number'
        ? deps.order.totalHufSnapshot
        : items.reduce((sum, item) => sum + item.totalHuf, 0)

    const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/+$/, '')
    const template = orderConfirmationEmail({
      orderNumber: deps.order.orderNumber ?? `#${deps.order.id}`,
      buyerName: snapshotString(snapshot, 'name') || null,
      items,
      totalHuf,
      coursesUrl: `${serverUrl}/kurzusaim`,
      invoiceNote: getSzamlazzConfig().enabled,
    })

    const send = deps.send ?? sendMail
    const result = await send({ to: recipient, ...template })
    if (!result.ok) {
      log.warn('visszaigazoló e-mail küldése sikertelen (best-effort)', {
        retryable: result.retryable,
        error: result.error,
      })
    }
  } catch (error) {
    log.warn('visszaigazoló e-mail feldolgozása sikertelen (best-effort)', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
