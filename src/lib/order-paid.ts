import type { Payload } from 'payload'

import type { Order } from '../payload-types'
import { isSzamlazzEnabled } from './szamlazz'
import { ORDER_MAINTENANCE_QUEUE } from '../jobs/queues'
import { INVITE_TOKEN_TTL_MS } from './customer-import/invite'
import { INVITE_TOKEN_TTL_DAYS } from './customer-import/send-invites'
import { sendMail, type SendResult } from './email'
import { maskEmail } from './email/mask'
import { orderConfirmationEmail, type OrderConfirmationAccount } from './email/templates/order'
import { logger as rootLogger, type Logger } from './logger'
import { buildPasswordResetUrl } from './password-reset-url'

/**
 * Friss paid-átmenet MELLÉKHATÁSAI (T-024/W4-01, W4-03) — a Barion-állapotgép
 * KIZÁRÓLAG transitionedToPaid=true esetén hívja (a callback-processzor és az
 * order-poll job egyaránt). Így az e-mail/számlázás definíció szerint egyszer
 * fut le egy rendeléshez; a duplikált paid-jelzés no-op marad.
 *
 * 1. invoice-issue job sorba állítása (Számlázz.hu — a tényleges kiállítás a
 *    jobban történik, saját retry-val; kikapcsolt integrációnál a job 'disabled'
 *    kimenetet ad, ezért a queue-hívás akkor is biztonságos, ha nincs kulcs).
 * 2. Vásárlás-visszaigazoló e-mail a vevőnek (best-effort) — vendég-vásárlásnál
 *    AKTIVÁLÓ levélként, a jelszó-beállító linkkel (lásd lentebb).
 *
 * A függvény SOSEM dob: mindkét mellékhatás best-effort — a fizetési főlánc
 * (paid + hozzáférés + a fiók feloldása) ettől függetlenül is konzisztens marad,
 * a hibák naplózva (a számlázás az order-poll resweep-jéből is utolérhető).
 *
 * AKTIVÁLÓ LINK (vendég-vásárlás). Ha a fiókhoz a vevő még nem választott
 * jelszót (most létrehozott vagy korábban rendszer által létrehozott fiók), a
 * levél tartalmazza a jelszó-beállító linket. A tokent NEM egy párhuzamos
 * rendszer adja, hanem a Payload SAJÁT jelszó-visszaállítója
 * (`payload.forgotPassword`, `disableEmail: true`) — ugyanaz a mechanizmus,
 * amit a vásárló-import aktiváló levele használ (src/lib/customer-import/invite.ts),
 * ugyanazzal a 30 napos élettartammal és ugyanazzal a fogadó oldallal.
 *
 * A LINK TITOK: sem a token, sem a teljes link SOHA nem kerül naplóba (a
 * címzett is csak maszkolva) — az invite.ts szabálya itt is érvényes.
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

/**
 * A rendeléshez feloldott fiók — az apply-barion-state magja adja át.
 * Szándékosan a MINIMÁLIS felület (nem a teljes OrderCustomerResolution),
 * hogy a mellékhatás-modul ne függjön az állapotgéptől.
 */
export interface OrderPaidAccount {
  /** true, ha a vevőnek még nincs saját jelszava → jelszó-beállító link jár neki. */
  passwordSetupPending: boolean
  /** true, ha a rendelés már a fiókhoz volt kötve (bejelentkezett vásárlás). */
  alreadyLinked: boolean
  /** A fiók e-mail-címe (a levél és az aktiváló link címzettje). */
  email: string | null
}

export interface OnOrderPaidDeps {
  payload: Payload
  order: Order
  logger?: Logger
  /** Injektálható küldő (teszteléshez); alapból a provider-réteg sendMail-je. */
  send?: (input: { to: string; subject: string; html: string; text: string }) => Promise<SendResult>
  /** Injektálható job-queue (teszteléshez); alapból a valódi queueInvoiceIssueJob. */
  queueInvoice?: (orderId: number) => Promise<boolean>
  /**
   * A rendeléshez feloldott fiók. Hiányában a levél a KORÁBBI (bejelentkezett)
   * alakjában megy ki — így a régi hívási helyek viselkedése változatlan.
   */
  account?: OrderPaidAccount
  /**
   * Injektálható aktiváló-link-készítő (teszteléshez); alapból a Payload
   * `forgotPassword` tokenjéből épült jelszó-beállító link. `null` = a link nem
   * készíthető el (ilyenkor a levél a belépésre irányít).
   */
  createActivationUrl?: (input: { email: string; serverUrl: string }) => Promise<string | null>
}

/**
 * Jelszó-beállító (aktiváló) link a Payload SAJÁT reset-tokenjéből.
 *
 * A hiba NEM végzetes: `null` esetén a levél a belépésre irányító változatban
 * megy ki (ott is szerepel az „Elfelejtett jelszó" út), a fizetési főlánc pedig
 * érintetlen. A naplóba SEM a token, SEM a link nem kerül.
 */
async function defaultActivationUrl(
  payload: Payload,
  input: { email: string; serverUrl: string },
  log: Logger,
): Promise<string | null> {
  try {
    // A visszatérési érték a Payload típusa szerint string, futásidőben viszont
    // ismeretlen e-mailnél `null` — ezért unknown + típusszűkítés (az
    // src/lib/customer-import/invite.ts mintája).
    const token: unknown = await payload.forgotPassword({
      collection: 'users',
      data: { email: input.email },
      disableEmail: true,
      expiration: INVITE_TOKEN_TTL_MS,
    })
    if (typeof token !== 'string' || token === '') {
      log.warn('aktiváló link nem készült el (a felhasználó nem található)', {
        cimzett: maskEmail(input.email),
      })
      return null
    }
    return buildPasswordResetUrl(input.serverUrl, token)
  } catch (error) {
    log.warn('aktiváló link készítése sikertelen (best-effort — a levél belépés-linkkel megy)', {
      cimzett: maskEmail(input.email),
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
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

    /**
     * A LEVÉL VÁLTOZATA a fiók állapotából:
     *  - nincs `account` (régi hívási hely) vagy bejelentkezett vásárlás
     *    működő fiókkal → változatlan levél (Kurzusaim CTA);
     *  - jelszó nélküli fiók → AKTIVÁLÓ levél a jelszó-beállító linkkel;
     *  - vendégként vásárolt, de MÁR VAN fiókja → belépésre irányító levél
     *    (jelszó-beállítót ilyenkor SZÁNDÉKOSAN nem küldünk).
     */
    const accountEmail = (deps.account?.email ?? '').trim() || recipient
    let account: OrderConfirmationAccount | undefined
    if (deps.account?.passwordSetupPending === true) {
      const createActivationUrl =
        deps.createActivationUrl ??
        ((activationInput: { email: string; serverUrl: string }) =>
          defaultActivationUrl(deps.payload, activationInput, log))
      const activationUrl = await createActivationUrl({ email: accountEmail, serverUrl })
      account =
        activationUrl === null
          ? { kind: 'login', loginUrl: `${serverUrl}/belepes`, email: accountEmail }
          : {
              kind: 'password-setup',
              activationUrl,
              expiresInDays: INVITE_TOKEN_TTL_DAYS,
              email: accountEmail,
            }
    } else if (deps.account && !deps.account.alreadyLinked) {
      account = { kind: 'login', loginUrl: `${serverUrl}/belepes`, email: accountEmail }
    }

    const template = orderConfirmationEmail({
      orderNumber: deps.order.orderNumber ?? `#${deps.order.id}`,
      buyerName: snapshotString(snapshot, 'name') || null,
      items,
      totalHuf,
      coursesUrl: `${serverUrl}/kurzusaim`,
      // SZÁNDÉKOSAN a nem dobó változat: a levél sorsa nem függhet attól, hogy
      // a SZÁMLÁZÁSI konfig hibátlan-e. A `getSzamlazzConfig()` dob például
      // hiányzó SZAMLAZZ_AFAKULCS mellett, és a dobás ITT az alábbi
      // best-effort catch-be esne — vagyis egy áfakulcs-beállítási hiba némán
      // elvinné a vásárló EGYETLEN visszajelzését a sikeres fizetésről.
      invoiceNote: isSzamlazzEnabled(),
      ...(account ? { account } : {}),
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
