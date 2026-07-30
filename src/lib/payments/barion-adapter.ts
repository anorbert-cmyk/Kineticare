import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'
import type { Endpoint, GroupField } from 'payload'

import type { User } from '../../payload-types'
import { logger } from '../logger'
import { startCheckout } from '../checkout/start-checkout'

/**
 * T-063 — plugin-adapter-kontroll (Barion PaymentAdapter).
 *
 * A @payloadcms/plugin-ecommerce PaymentAdapter-felületére épülő saját
 * adapter, amely a TESZTELT src/lib/barion/startPayment kliensre épít (a
 * tényleges fizetésindítás a src/lib/checkout/start-checkout.ts
 * szolgáltatásban él — ugyanaz a kódút, mint a POST /api/checkout/start
 * végponté).
 *
 * Kritikus biztonsági szabályok:
 *
 * 1. `confirmOrder` SOHA NEM FUTHAT LE SIKERESEN. Ismert beta-hiba: a plugin
 *    confirmOrder-útvonala nem ellenőrzi a fizetés TÉNYLEGES státuszát a
 *    szolgáltatónál, így hamis jóváhagyást is elfogadna. A rendelés
 *    `paid`-re állítása KIZÁRÓLAG a saját Barion-callback-útvonal (T-022)
 *    joga — az a v4-es fizetésállapot-lekérdezéssel ellenőrzi a státuszt.
 *    Ezért az adapter confirmOrder-je szándékosan, mindig hibát dob
 *    (defense-in-depth), és a plugin által generált `/payments/*` végpontokat
 *    a withoutPluginPaymentEndpoints() szűrő is eltávolítja a configból.
 *
 * 2. Az adapter NINCS regisztrálva a plugin `paymentMethods` tömbjében (az
 *    üres marad, lásd src/plugins/ecommerce.ts), mert a plugin
 *    initiate/confirm végpontjai KOSÁR-szemantikát követelnek (cartID
 *    kötelező, tranzakció-létrehozás a plugin által), ami ütközik a
 *    kosármentes, egylépéses checkout-folyamatunkkal (POST
 *    /api/checkout/start: productId → rendelés snapshot-árakkal). Regisztráció
 *    nélkül a plugin egyáltalán nem hozza létre ezeket a végpontokat — a
 *    confirmOrder így nem is hívható HTTP-n keresztül. Ez a modul a
 *    plugin-felületen is használható, típusos adapter-implementáció marad,
 *    ha egy későbbi sprint mégis a plugin-útvonalakra kötne (a szűrő és a
 *    dobó confirmOrder ekkor is érvényben marad).
 */

const BARION_ADMIN_GROUP: GroupField = {
  name: 'barion',
  type: 'group',
  label: 'Barion',
  admin: {
    condition: (data) => data?.paymentMethod === 'barion',
  },
  fields: [
    {
      name: 'barionPaymentId',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'A Barion Payment/Start válaszban kapott PaymentId.',
      },
    },
  ],
}

/** Relationship-érték → dokumentum-id (number vagy populate-olt doc). */
function relationshipId(value: unknown): number | string | null {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') {
      return id
    }
  }
  return null
}

export const barionPaymentAdapter: PaymentAdapter = {
  name: 'barion',
  label: 'Barion bankkártyás fizetés',
  group: BARION_ADMIN_GROUP,
  initiatePayment: async ({ data, req }) => {
    if (!req.user) {
      throw new Error('A fizetés indításához bejelentkezés szükséges.')
    }
    // A plugin cart-alakú inputját a kosármentes checkout-szolgáltatásra képezzük:
    // az első cart-tétel a megvásárolandó kurzus (egy kurzus = egy rendelés).
    const items = Array.isArray(data.cart?.items) ? data.cart.items : []
    const firstItem = items[0] as { product?: unknown; quantity?: unknown } | undefined
    const productId = relationshipId(firstItem?.product)
    if (productId === null) {
      throw new Error('A kosár üres — nincs megvásárolható tétel a fizetés indításához.')
    }

    const result = await startCheckout({
      payload: req.payload,
      user: req.user as unknown as User,
      input: {
        productId: typeof productId === 'string' ? Number(productId) : productId,
        quantity: firstItem?.quantity ?? 1,
        consentWithdrawalWaiver:
          (data as Record<string, unknown>).consentWithdrawalWaiver === true,
      },
    })

    return {
      message: `Barion-fizetés elindítva (${result.orderNumber}) — irányítsd a vevőt a GatewayUrl-re.`,
      orderNumber: result.orderNumber,
      gatewayUrl: result.gatewayUrl,
    }
  },
  // LÁSD A FEJLÉC 1. PONTJÁT: ez a függvény szándékosan NEM hajtható végre —
  // a `paid` átmenet kizárólag a Barion-callback-útvonal (T-022) joga.
  confirmOrder: async (): Promise<never> => {
    throw new Error(
      'A fizetés jóváhagyása a plugin confirmOrder-útvonalán TILOS: a plugin ismert ' +
        'beta-hibája miatt a confirmOrder nem ellenőrzi a fizetés tényleges státuszát. ' +
        'A rendelés paid-re állítása kizárólag a saját Barion-callback-útvonalon történhet (T-022).',
    )
  },
}

/**
 * T-063 védelmi szűrő: eltávolítja a plugin által esetleg regisztrált
 * `/payments/*` végpontokat (initiate + confirm-order) a végleges configból.
 *
 * Így akkor sem hívható le a plugin confirmOrder-je, ha egy későbbi
 * módosítás mégis felvenné az adaptert a paymentMethods tömbbe — a fizetés
 * indításának egyetlen útvonala a saját POST /api/checkout/start marad.
 */
export function withoutPluginPaymentEndpoints(endpoints: Endpoint[] | undefined): Endpoint[] {
  const list = endpoints ?? []
  const kept = list.filter(
    (endpoint) => !(typeof endpoint.path === 'string' && endpoint.path.startsWith('/payments/')),
  )
  if (kept.length !== list.length) {
    const removed = list
      .filter((endpoint) => !kept.includes(endpoint))
      .map((endpoint) => endpoint.path)
    logger.warn('T-063: plugin payment-végpontok eltávolítva a configból (confirmOrder-tiltás)', {
      paths: removed,
    })
  }
  return kept
}
