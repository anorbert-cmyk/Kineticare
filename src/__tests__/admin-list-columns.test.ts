import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import configPromise from '../payload.config'

/**
 * VÉGREHAJTHATÓ ŐR: az admin listanézetek oszlopai és keresője működőképesek.
 *
 * Két, élesben előfordult hibaosztályt zár le. Mindkettő NÉMA volt: nem dobtak
 * kivételt a konfig összeállításakor, nem írtak logot, és a lista
 * találatszáma is helyes maradt — csak a felület vált használhatatlanná.
 *
 * 1. SZELLEMOSZLOP. Az `@payloadcms/plugin-ecommerce` a products collectionre
 *    `admin.defaultColumns: ['prices']`-t állít be, de nincs `prices` nevű
 *    mező — a plugin `pricesField`-je egy NÉVTELEN `group` → `row` alá teszi a
 *    `priceInHUFEnabled` és `priceInHUF` mezőket. A nem létező oszlopnév miatt
 *    a Kurzusok listája NULLA adat-oszloppal rendelődött ki, és mivel az első
 *    oszlop a dokumentumra mutató link, a kurzus MEGNYITHATATLAN volt.
 *
 * 2. TÍPUSHIBÁS KERESÉS. A lista keresőmezője `ILIKE`-ot tesz a keresett
 *    mezőkre. A plugin `useAsTitle: 'createdAt'`-ja miatt ez egy `timestamptz`
 *    oszlopra futott, amire Postgresben nincs ilyen operátor — a Rendelések és
 *    a Kosarak listáján a keresés hibára futott:
 *      `operator does not exist: timestamp with time zone ~~* unknown`
 *    Ugyanez igaz az enum-oszlopokra (select mezők) is; kimérve:
 *      `operator does not exist: enum_products_product_status ~~* unknown`
 *
 * A teszt a VALÓDI, végleges payload.configon áll, tehát a plugin egy jövőbeli
 * verziófrissítése (vagy egy saját elgépelés) is fennakad rajta.
 */

interface CollectedNames {
  /** Oszlopnévként ténylegesen hivatkozható, felső szintű mezőnevek. */
  usable: Map<string, Field>
  /** Létezik, de `admin.disableListColumn: true` — oszlopnak NEM használható. */
  disabled: Set<string>
}

/**
 * A listaoszlop-feloldás szempontjából ÁTLÁTSZÓ konténerek: a névtelen
 * `row`/`collapsible`/`group` és a névtelen tab — a bennük lévő mezők neve
 * közvetlenül használható oszlopnévként.
 *
 * NEM átlátszó, ezért a gyerekeibe nem szabad belenézni:
 * - `array` és `blocks` (a Payload nem hoistolja a sorok mezőit),
 * - NEVES `group` és NEVES tab (a gyerek elérési útja `szulo.gyerek`, nem
 *   a puszta név) — a nevük ilyenkor is felkerül a listára, mert maga a
 *   csoport hivatkozható.
 *
 * Ez a megkülönböztetés nem kozmetika: enélkül a `videos[].status` neve
 * elfedné a felső szintű `status` eltűnését, és a teszt átengedné.
 */
function collectColumnNames(
  fields: Field[] | undefined,
  acc: CollectedNames = { usable: new Map(), disabled: new Set() },
): CollectedNames {
  for (const field of fields ?? []) {
    const named = 'name' in field && typeof field.name === 'string' ? field : null

    if (named) {
      const admin = (named as { admin?: { disableListColumn?: boolean } }).admin
      if (admin?.disableListColumn === true) {
        acc.disabled.add(named.name as string)
      } else {
        acc.usable.set(named.name as string, field)
      }
      // Neves konténer: a gyerekei csak `nev.gyerek` alakban hivatkozhatók.
      continue
    }

    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        // Neves tab: a gyerekei `tabnev.gyerek` alakúak — nem járjuk be.
        if ('name' in tab && typeof tab.name === 'string') {
          continue
        }
        collectColumnNames(tab.fields as Field[], acc)
      }
      continue
    }

    if ('fields' in field && Array.isArray(field.fields)) {
      collectColumnNames(field.fields as Field[], acc)
    }
  }
  return acc
}

/**
 * A Payload által mindig kínált, a mezőlistában nem szereplő oszlopnevek.
 * A `_status` csak drafts-os, a `deletedAt` csak trash-es collectionön létezik,
 * de a jelenlétük a defaultColumns-ban egyik esetben sem okoz üres listát.
 */
const BUILT_IN_COLUMNS = new Set(['id', 'createdAt', 'updatedAt', '_status', 'deletedAt'])

/**
 * Kimérve működő keresési mezőtípusok (a lista `ILIKE`-ot tesz rájuk).
 * A `number` (numeric oszlop) is átmegy, a `date` és a `select` NEM.
 */
const SEARCHABLE_FIELD_TYPES = new Set(['text', 'email', 'textarea', 'code', 'number'])

function invalidColumns(collection: CollectionConfig): string[] {
  const declared = collection.admin?.defaultColumns
  if (!declared) {
    return []
  }
  const { usable, disabled } = collectColumnNames(collection.fields)
  return declared.filter(
    (column) => disabled.has(column) || !(usable.has(column) || BUILT_IN_COLUMNS.has(column)),
  )
}

/** A lista keresője ezekre a mezőkre tesz ILIKE-ot. */
function effectiveSearchFields(collection: CollectionConfig): string[] {
  const declared = collection.admin?.listSearchableFields
  if (declared && declared.length > 0) {
    return declared
  }
  return [collection.admin?.useAsTitle ?? 'id']
}

function unsearchableFields(collection: CollectionConfig): string[] {
  const { usable } = collectColumnNames(collection.fields)
  return effectiveSearchFields(collection).filter((name) => {
    // Az `id`-ra a Payload külön, típushelyes keresést épít.
    if (name === 'id') {
      return false
    }
    const field = usable.get(name)
    // Nem létező mező: a keresés némán nem talál semmit — szintén hiba.
    if (!field) {
      return true
    }
    return !SEARCHABLE_FIELD_TYPES.has(field.type)
  })
}

describe('admin listanézet-őr', () => {
  it('MINDEN collection defaultColumns-a létező, oszlopként használható mezőre mutat', async () => {
    const config = await configPromise

    const offenders = (config.collections ?? [])
      .map((collection) => ({ slug: collection.slug, invalid: invalidColumns(collection) }))
      .filter((entry) => entry.invalid.length > 0)

    expect(offenders).toEqual([])
  })

  it('MINDEN collection listakeresője típushelyes mezőn fut (nincs ILIKE dátumon/enumon)', async () => {
    const config = await configPromise

    const offenders = (config.collections ?? [])
      .map((collection) => ({ slug: collection.slug, unsearchable: unsearchableFields(collection) }))
      .filter((entry) => entry.unsearchable.length > 0)

    expect(offenders).toEqual([])
  })

  /**
   * Célzott regressziós esetek. Külön is ellenőrizzük őket, mert itt
   * jelentkeztek a hibák, és mert a plugin a `...defaultCollection.admin`
   * öröklésen keresztül bármikor visszahozhatja mindkettőt.
   */
  it('a products (Kurzusok) listája nem a plugin `prices` szellemoszlopát kapja', async () => {
    const config = await configPromise
    const products = (config.collections ?? []).find((c) => c.slug === 'products')
    if (!products) {
      throw new Error("a végleges configban nincs 'products' collection")
    }

    expect(products.admin?.defaultColumns ?? []).not.toContain('prices')
    expect((products.admin?.defaultColumns ?? []).length).toBeGreaterThan(0)
    expect(invalidColumns(products)).toEqual([])
  })

  it('az orders és a carts keresője NEM a createdAt-re fut (Postgres ILIKE-hiba)', async () => {
    const config = await configPromise

    for (const slug of ['orders', 'carts']) {
      const collection = (config.collections ?? []).find((c) => c.slug === slug)
      if (!collection) {
        throw new Error(`a végleges configban nincs '${slug}' collection`)
      }
      expect({ slug, search: effectiveSearchFields(collection) }).not.toEqual({
        slug,
        search: ['createdAt'],
      })
      expect({ slug, gond: unsearchableFields(collection) }).toEqual({ slug, gond: [] })
    }
  })
})
