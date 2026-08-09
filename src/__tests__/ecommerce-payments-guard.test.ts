import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import configPromise from '../payload.config'

/**
 * A CLAUDE.md 2. TILOS ZÓNÁJÁNAK VÉGREHAJTHATÓ ŐRE.
 *
 * „Az `@payloadcms/plugin-ecommerce` `confirmOrder` függvénye TILOS." — a
 * plugin ismert beta-hibája, hogy a confirmOrder NEM ellenőrzi a fizetés
 * tényleges státuszát a szolgáltatónál, tehát HTTP-n keresztül hamis
 * jóváhagyást is elfogadna. A rendelés `paid`-re állítása kizárólag a saját,
 * Barion-callback-vezérelt állapotgép joga (src/lib/order-status/…).
 *
 * A tiltás két, EGYMÁSTÓL FÜGGETLEN fogása:
 *
 *  1. a plugin `payments.paymentMethods` tömbje ÜRES (src/plugins/ecommerce.ts):
 *     regisztrált fizetési mód nélkül a plugin létre sem hozza a
 *     `/payments/<mód>/initiate` és `/payments/<mód>/confirm-order` végpontokat;
 *  2. a `withoutPluginPaymentEndpoints` szűrő a config összeállítása UTÁN
 *     minden `/payments/*` végpontot eltávolít — akkor is, ha egy későbbi
 *     módosítás mégis felvenne egy fizetési módot.
 *
 * A teszt a VALÓDI, végleges payload.config-on állít — nem forráskód-mintát
 * keres —, így egy jövőbeli, jó szándékú átszervezés is fennakad rajta.
 */

/** Rekurzív mezőfa-bejárás (a plugin mezői group/row/tabs alá ágyazottak). */
function collectFieldNames(fields: Field[] | undefined): string[] {
  const names: string[] = []
  for (const field of fields ?? []) {
    if ('name' in field && typeof field.name === 'string') {
      names.push(field.name)
    }
    if ('fields' in field && Array.isArray(field.fields)) {
      names.push(...collectFieldNames(field.fields as Field[]))
    }
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        names.push(...collectFieldNames(tab.fields as Field[]))
      }
    }
  }
  return names
}

function findCollection(collections: CollectionConfig[], slug: string): CollectionConfig {
  const collection = collections.find((candidate) => candidate.slug === slug)
  if (!collection) {
    throw new Error(`a végleges configban nincs '${slug}' collection`)
  }
  return collection
}

describe('ecommerce payments-őr (CLAUDE.md 2. tilos zóna)', () => {
  it('a végleges configban NINCS egyetlen /payments/* végpont sem', async () => {
    const config = await configPromise

    const paths = (config.endpoints ?? []).map((endpoint) => String(endpoint.path))
    const paymentPaths = paths.filter((path) => path.startsWith('/payments/'))

    expect(paymentPaths).toEqual([])
  })

  it('a végleges configban NINCS confirm-order (vagy initiate) fizetési útvonal, útvonalnévtől függetlenül', async () => {
    const config = await configPromise

    const suspicious = (config.endpoints ?? [])
      .map((endpoint) => String(endpoint.path))
      .filter((path) => /confirm-order|payments/i.test(path))

    expect(suspicious).toEqual([])
  })

  /**
   * A `paymentMethods: []` MEGFIGYELHETŐ következménye: a plugin csak akkor
   * teszi a `paymentMethod` select-mezőt (és a fizetési módok admin-group
   * mezőit) a transactions collectionbe, ha van regisztrált fizetési mód.
   * A mező hiánya tehát bizonyíték arra, hogy a lista üres — és ez akkor is
   * kiüt, ha valaki a végpont-szűrőt kikerülve venne fel adaptert.
   */
  it('az ecommerce-plugin payments.paymentMethods üres (a transactions collection nem kap paymentMethod mezőt)', async () => {
    const config = await configPromise

    const transactions = findCollection(config.collections ?? [], 'transactions')
    const fieldNames = collectFieldNames(transactions.fields)

    expect(fieldNames).not.toContain('paymentMethod')
    // A saját Barion-adapter admin-groupja ('barion') sem szivároghat be —
    // a plugin azt is csak regisztrált fizetési móddal tenné a collectionbe.
    expect(fieldNames).not.toContain('barion')
  })

  /**
   * Az orders collection sem kaphat plugin-oldali fizetési-mód mezőt. Ez a
   * kontroll a fentitől független jelzés ugyanarra: a plugin fizetési
   * felülete nincs bekapcsolva.
   */
  it('az orders collection sem kap plugin-oldali paymentMethod mezőt', async () => {
    const config = await configPromise

    const orders = findCollection(config.collections ?? [], 'orders')
    const fieldNames = collectFieldNames(orders.fields)

    expect(fieldNames).not.toContain('paymentMethod')
    // A saját, Barion-callback-vezérelt állapotgép mezői viszont a helyükön
    // vannak — a rendelés-jóváhagyás útvonala kizárólag ez.
    expect(fieldNames).toContain('barionPaymentId')
    expect(fieldNames).toContain('orderNumber')
    expect(fieldNames).toContain('totalHufSnapshot')
  })
})
