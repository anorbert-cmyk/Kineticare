/**
 * ŐR-TESZT: a `users.purchases` (Megvásárolt kurzusok) mező ÍRÁSI joga.
 *
 * MIT VÉD. A mező a kurzus-hozzáférés maga: aki írhatja, az ingyen ad magának
 * fizetős tartalmat. A tulajdonos kifejezett kérésére (2026-08-16) a mező az
 * adminból szerkeszthetővé vált — de KIZÁRÓLAG munkatársnak és tulajdonosnak.
 * A teszt mindkét irányt rögzíti:
 *
 *  - owner és staff ÍRHATJA (különben a kézi jóváírás/visszavonás lehetetlen),
 *  - customer SOHA — a SAJÁT rekordján sem, se admin felületen, se API-n,
 *  - látogató (nem bejelentkezett) SOHA — a nyilvános regisztráció így sem tud
 *    hozzáférést beküldeni.
 *
 * A teszt a VÉGLEGES payload.configon áll (nem a forrásfájl olvasásán), tehát
 * egy jövőbeli refaktor vagy plugin-override is fennakad rajta.
 *
 * MINDEN ADAT KITALÁLT.
 */

import type { CollectionConfig, Field, FieldAccess } from 'payload'
import { describe, expect, it } from 'vitest'

import { isStaffOrOwnerFieldAccess } from '../../access'
import configPromise from '../../payload.config'

type Role = 'owner' | 'staff' | 'customer'

const owner = { id: 1, role: 'owner' as Role }
const staff = { id: 2, role: 'staff' as Role }
const customer = { id: 3, role: 'customer' as Role }

/**
 * A field-access argumentuma. A `id`/`doc` szándékosan a KÉRÉST INDÍTÓ
 * felhasználó saját rekordjára mutat: így a „customer a saját fiókján" eset is
 * a valósághoz hűen áll elő.
 */
const fieldArgs = (
  user: { id: number; role: Role } | null,
): Parameters<FieldAccess>[0] =>
  ({
    req: { user },
    id: user?.id,
    doc: user === null ? undefined : { id: user.id, email: 'teszt@example.com', role: user.role },
    data: { purchases: [11] },
  }) as unknown as Parameters<FieldAccess>[0]

/**
 * A mező-szintű `access` a Payload `Field` uniójában nem minden ágon létezik
 * (pl. `ui` mezőn nincs), ezért a teszt — az access.test.ts mintájára — szűkíti
 * a típust. A szűkítés csak a TESZT kényelme; a futásidejű ellenőrzés a valódi
 * configon fut.
 */
type NamedTestField = Field & {
  name: string
  access?: {
    create?: FieldAccess
    read?: FieldAccess
    update?: FieldAccess
  }
}

function findField(collection: CollectionConfig, name: string): NamedTestField | undefined {
  return collection.fields.find((field) => 'name' in field && field.name === name) as
    | NamedTestField
    | undefined
}

async function purchasesField(): Promise<NamedTestField> {
  const config = await configPromise
  const users = (config.collections ?? []).find((collection) => collection.slug === 'users')
  expect(users, 'a users collection megvan a configban').toBeDefined()
  const field = findField(users as CollectionConfig, 'purchases')
  expect(field, 'a purchases mező megvan').toBeDefined()
  return field as NamedTestField
}

describe('users.purchases mezőszintű írási jog', () => {
  it('owner írhatja (create és update is)', async () => {
    const field = await purchasesField()
    expect(field.access?.create?.(fieldArgs(owner))).toBe(true)
    expect(field.access?.update?.(fieldArgs(owner))).toBe(true)
  })

  it('staff írhatja (kézi jóváírás, visszatérítés utáni visszavonás)', async () => {
    const field = await purchasesField()
    expect(field.access?.create?.(fieldArgs(staff))).toBe(true)
    expect(field.access?.update?.(fieldArgs(staff))).toBe(true)
  })

  it('a VEVŐ nem írhatja — a saját rekordján sem', async () => {
    const field = await purchasesField()
    expect(field.access?.create?.(fieldArgs(customer))).toBe(false)
    expect(field.access?.update?.(fieldArgs(customer))).toBe(false)
  })

  it('látogató (nincs bejelentkezve) nem írhatja — a nyilvános regisztráció sem', async () => {
    const field = await purchasesField()
    expect(field.access?.create?.(fieldArgs(null))).toBe(false)
    expect(field.access?.update?.(fieldArgs(null))).toBe(false)
  })

  it('pontosan a közös staff/owner field-access szabályt használja', async () => {
    const field = await purchasesField()
    expect(field.access?.create).toBe(isStaffOrOwnerFieldAccess)
    expect(field.access?.update).toBe(isStaffOrOwnerFieldAccess)
  })

  it('a lista oszlopai közt szerepel — a tulajdonos látja, ki mit vett meg', async () => {
    const config = await configPromise
    const users = (config.collections ?? []).find((collection) => collection.slug === 'users')
    expect(users?.admin?.defaultColumns).toContain('purchases')
  })
})
