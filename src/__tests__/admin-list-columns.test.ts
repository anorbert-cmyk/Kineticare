import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import configPromise from '../payload.config'

/**
 * VÉGREHAJTHATÓ ŐR: az admin listanézetek oszlopai létező mezőkre mutatnak.
 *
 * Élesben előfordult hiba: az `@payloadcms/plugin-ecommerce` a products
 * collectionre `admin.defaultColumns: ['prices']`-t állít be, DE nincs
 * `prices` nevű mező — a plugin `pricesField`-je egy NÉVTELEN `group` → `row`
 * alá teszi a `priceInHUFEnabled` és `priceInHUF` mezőket. A nem létező
 * oszlopnév miatt a Kurzusok listája NULLA adat-oszloppal rendelődött ki:
 * fejlécek nélkül, üres sorokkal, és — mivel az első oszlop a dokumentumra
 * mutató link — a kurzus MEGNYITHATATLAN és szerkeszthetetlen volt.
 *
 * A hiba némán jelentkezett: nem dob kivételt, nem ír logot, a lista
 * találatszáma („1-2 of 2") helyes maradt. Ezért kell rá őr.
 *
 * A teszt a VALÓDI, végleges payload.configon áll, tehát a plugin egy jövőbeli
 * verziófrissítése (vagy egy saját, elgépelt oszlopnév) is fennakad rajta.
 */

/**
 * Rekurzív mezőnév-gyűjtés. A listaoszlop-feloldás szempontjából a névtelen
 * `group`/`row`/`collapsible`/`tabs` konténerek ÁTLÁTSZÓAK: a bennük lévő
 * mezők neve közvetlenül használható oszlopnévként, ezért a bejárás mélységi.
 */
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

/**
 * A Payload által mindig kínált, mezőlistában NEM szereplő oszlopnevek.
 * (`_status` csak drafts-os collectionön, de a jelenléte sosem hiba.)
 */
const BUILT_IN_COLUMNS = new Set(['id', 'createdAt', 'updatedAt', '_status', 'deletedAt'])

function invalidColumns(collection: CollectionConfig): string[] {
  const declared = collection.admin?.defaultColumns
  if (!declared) {
    return []
  }
  const known = new Set([...collectFieldNames(collection.fields), ...BUILT_IN_COLUMNS])
  return declared.filter((column) => !known.has(column))
}

describe('admin listanézet-oszlopok őre', () => {
  it('MINDEN collection defaultColumns-a létező mezőre mutat', async () => {
    const config = await configPromise

    const offenders = (config.collections ?? [])
      .map((collection) => ({ slug: collection.slug, invalid: invalidColumns(collection) }))
      .filter((entry) => entry.invalid.length > 0)

    expect(offenders).toEqual([])
  })

  /**
   * Célzott regressziós eset: a products (Kurzusok) listája. Külön is
   * ellenőrizzük, mert itt jelentkezett a hiba, és mert a plugin
   * `...defaultCollection.admin` öröklésen keresztül bármikor visszahozhatná.
   */
  it('a products (Kurzusok) listája kap valódi oszlopokat, és NEM a plugin `prices` szellemoszlopát', async () => {
    const config = await configPromise

    const products = (config.collections ?? []).find(
      (collection) => collection.slug === 'products',
    )
    if (!products) {
      throw new Error("a végleges configban nincs 'products' collection")
    }

    const columns = products.admin?.defaultColumns ?? []

    expect(columns.length).toBeGreaterThan(0)
    expect(columns).not.toContain('prices')
    expect(invalidColumns(products)).toEqual([])
    // Az ELSŐ oszlop a dokumentumra mutató link — ezért kötelezően olyan mező,
    // ami minden során ki van töltve. A `sku` egyedi és kötelező; a
    // `displayTitle` a mező bevezetése előtti sorokon üres lehet, ezért nem ez
    // állhat elöl (különben üres linkszöveg = megnyithatatlan sor).
    expect(columns[0]).toBe('sku')
  })
})
