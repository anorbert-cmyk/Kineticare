import type { Access, CollectionConfig, Field, FieldAccess } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  adminOrPublishedStatus,
  isAdmin,
  isAdminFieldAccess,
  isDocumentOwner,
  isOwner,
  isOwnerFieldAccess,
  isSelfOrAdmin,
  isStaffOrOwner,
  isStaffOrOwnerFieldAccess,
  publishedOrAdmin,
  streamAssetReadAccess,
} from '../access'
import { visibleMenusOrAdmin } from '../access/menus-visibility'
import { visibleTestimonialsOrAdmin } from '../access/testimonials-visibility'
import { orderIntegrityBeforeChange } from '../lib/order-integrity'
import configPromise from '../payload.config'

/**
 * T-011 access-függvény unit-tesztek: minden függvényhez pozitív + negatív eset
 * látogató / customer / staff / owner szerepkörökre.
 */

type Role = 'owner' | 'staff' | 'customer'

const owner = { id: 1, role: 'owner' as Role }
const staff = { id: 2, role: 'staff' as Role }
const customer = { id: 3, role: 'customer' as Role }

const accessArgs = (user: { id: number; role: Role } | null): Parameters<Access>[0] =>
  ({ req: { user } }) as unknown as Parameters<Access>[0]

const fieldAccessArgs = (user: { id: number; role: Role } | null): Parameters<FieldAccess>[0] =>
  ({ req: { user } }) as unknown as Parameters<FieldAccess>[0]

describe('isOwner / isOwnerFieldAccess', () => {
  it('ownernek true', () => {
    expect(isOwner(accessArgs(owner))).toBe(true)
    expect(isOwnerFieldAccess(fieldAccessArgs(owner))).toBe(true)
  })

  it.each([
    ['staff', staff],
    ['customer', customer],
  ])('%s szerepkörre false', (_label, user) => {
    expect(isOwner(accessArgs(user))).toBe(false)
    expect(isOwnerFieldAccess(fieldAccessArgs(user))).toBe(false)
  })

  it('látogatónak (nincs user) false', () => {
    expect(isOwner(accessArgs(null))).toBe(false)
    expect(isOwnerFieldAccess(fieldAccessArgs(null))).toBe(false)
  })
})

describe('isStaffOrOwner / isStaffOrOwnerFieldAccess', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s szerepkörre true', (_label, user) => {
    expect(isStaffOrOwner(accessArgs(user))).toBe(true)
    expect(isStaffOrOwnerFieldAccess(fieldAccessArgs(user))).toBe(true)
  })

  it('customerre false', () => {
    expect(isStaffOrOwner(accessArgs(customer))).toBe(false)
    expect(isStaffOrOwnerFieldAccess(fieldAccessArgs(customer))).toBe(false)
  })

  it('látogatónak false', () => {
    expect(isStaffOrOwner(accessArgs(null))).toBe(false)
    expect(isStaffOrOwnerFieldAccess(fieldAccessArgs(null))).toBe(false)
  })
})

/**
 * Sec-review: a products videos[].streamAssetId csak staff/owner-nek és a
 * terméket megvásárló customernek olvasható — anonim és nem-vevő customer
 * felé a mező rejtve marad.
 */
describe('streamAssetReadAccess (videos[].streamAssetId read)', () => {
  const productDoc = { id: 42 }

  const streamFieldArgs = (
    user: ({ id: number; role: Role; purchases?: unknown[] } | null),
    doc: unknown = productDoc,
  ): Parameters<FieldAccess>[0] =>
    ({ req: { user }, doc }) as unknown as Parameters<FieldAccess>[0]

  it.each([
    ['owner', { ...owner, purchases: [] }],
    ['staff', { ...staff, purchases: [] }],
  ])('%s szerepkör vásárlás nélkül is olvassa', (_label, user) => {
    expect(streamAssetReadAccess(streamFieldArgs(user))).toBe(true)
  })

  it('a vevő customer olvassa (purchases id-listaként)', () => {
    expect(
      streamAssetReadAccess(streamFieldArgs({ ...customer, purchases: [7, 42] })),
    ).toBe(true)
  })

  it('a vevő customer olvassa (purchases populate-olt objektumként)', () => {
    expect(
      streamAssetReadAccess(streamFieldArgs({ ...customer, purchases: [{ id: 42 }] })),
    ).toBe(true)
  })

  it('a nem-vevő customer NEM olvassa', () => {
    expect(streamAssetReadAccess(streamFieldArgs({ ...customer, purchases: [7] }))).toBe(false)
    expect(streamAssetReadAccess(streamFieldArgs({ ...customer, purchases: [] }))).toBe(false)
    expect(streamAssetReadAccess(streamFieldArgs(customer))).toBe(false)
  })

  it('anonim látogató NEM olvassa', () => {
    expect(streamAssetReadAccess(streamFieldArgs(null))).toBe(false)
  })

  it('hiányzó szülő-dokumentum esetén customer nem olvassa (fail-closed)', () => {
    expect(
      streamAssetReadAccess(streamFieldArgs({ ...customer, purchases: [42] }, null)),
    ).toBe(false)
  })
})

describe('isAdmin / isAdminFieldAccess (plugin-bekötés: staff+owner)', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s szerepkörre true', (_label, user) => {
    expect(isAdmin(accessArgs(user))).toBe(true)
    expect(isAdminFieldAccess(fieldAccessArgs(user))).toBe(true)
  })

  it('customerre és látogatóra false', () => {
    expect(isAdmin(accessArgs(customer))).toBe(false)
    expect(isAdminFieldAccess(fieldAccessArgs(customer))).toBe(false)
    expect(isAdmin(accessArgs(null))).toBe(false)
    expect(isAdminFieldAccess(fieldAccessArgs(null))).toBe(false)
  })
})

describe('isSelfOrAdmin (users read/update)', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s minden rekordot ér (true)', (_label, user) => {
    expect(isSelfOrAdmin(accessArgs(user))).toBe(true)
  })

  it('customer csak a saját rekordját éri (id-kényszer)', () => {
    expect(isSelfOrAdmin(accessArgs(customer))).toEqual({ id: { equals: customer.id } })
  })

  it('látogatónak false', () => {
    expect(isSelfOrAdmin(accessArgs(null))).toBe(false)
  })
})

describe('publishedOrAdmin (pages/posts read, saját status mező)', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s draftot is olvas (true)', (_label, user) => {
    expect(publishedOrAdmin(accessArgs(user))).toBe(true)
  })

  it('customer csak publishedet olvas (status-kényszer)', () => {
    expect(publishedOrAdmin(accessArgs(customer))).toEqual({ status: { equals: 'published' } })
  })

  it('látogató is csak publishedet olvas', () => {
    expect(publishedOrAdmin(accessArgs(null))).toEqual({ status: { equals: 'published' } })
  })
})

describe('adminOrPublishedStatus (products read, drafts _status mező)', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s draftot is olvas (true)', (_label, user) => {
    expect(adminOrPublishedStatus(accessArgs(user))).toBe(true)
  })

  it('customer és látogató csak published draft-verziót olvas', () => {
    expect(adminOrPublishedStatus(accessArgs(customer))).toEqual({
      _status: { equals: 'published' },
    })
    expect(adminOrPublishedStatus(accessArgs(null))).toEqual({ _status: { equals: 'published' } })
  })
})

describe('visibleTestimonialsOrAdmin (testimonials read, a menus mintájára)', () => {
  it.each([
    ['owner', owner],
    ['staff', staff],
  ])('%s a levett véleményeket is olvassa (true)', (_label, user) => {
    expect(visibleTestimonialsOrAdmin(accessArgs(user))).toBe(true)
  })

  it('customer csak a látható véleményeket olvassa (visible-kényszer)', () => {
    expect(visibleTestimonialsOrAdmin(accessArgs(customer))).toEqual({
      visible: { equals: true },
    })
  })

  it('látogató is csak a látható véleményeket olvassa', () => {
    expect(visibleTestimonialsOrAdmin(accessArgs(null))).toEqual({ visible: { equals: true } })
  })
})

describe('isDocumentOwner (orders/carts customer-kényszer)', () => {
  it('bejelentkezett user a saját customer-dokumentumait kapja', () => {
    expect(isDocumentOwner(accessArgs(customer))).toEqual({
      customer: { equals: customer.id },
    })
  })

  it('látogatónak false', () => {
    expect(isDocumentOwner(accessArgs(null))).toBe(false)
  })
})

/** Rekurzív mező-gyűjtő a group/row/tabs-struktúrákhoz (a plugin mezőfája ilyen). */
const flattenFields = (fields: Field[]): Field[] => {
  const result: Field[] = []
  for (const field of fields) {
    result.push(field)
    if ('fields' in field && Array.isArray(field.fields)) {
      result.push(...flattenFields(field.fields as Field[]))
    }
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        result.push(...flattenFields(tab.fields as Field[]))
      }
    }
  }
  return result
}

type NamedTestField = Field & {
  name: string
  access?: {
    create?: FieldAccess
    read?: FieldAccess
    update?: FieldAccess
    delete?: FieldAccess
  }
  unique?: boolean
}

const findField = (collection: CollectionConfig, name: string): NamedTestField | undefined =>
  flattenFields(collection.fields).find((field) => 'name' in field && field.name === name) as
    | NamedTestField
    | undefined

describe('collection access bekötés a végleges configban', () => {
  it('pages/posts/menus/categories/media a mátrix szerint bekötve', async () => {
    const config = await configPromise
    const bySlug = new Map<string, CollectionConfig>(
      (config.collections ?? []).map((c) => [c.slug, c]),
    )

    for (const slug of ['pages', 'posts']) {
      const collection = bySlug.get(slug)
      expect(collection?.access?.read, slug).toBe(publishedOrAdmin)
      expect(collection?.access?.create, slug).toBe(isStaffOrOwner)
      expect(collection?.access?.update, slug).toBe(isStaffOrOwner)
      expect(collection?.access?.delete, slug).toBe(isStaffOrOwner)
    }

    const categories = bySlug.get('categories')
    expect(categories?.access?.create).toBe(isStaffOrOwner)
    expect(categories?.access?.update).toBe(isStaffOrOwner)
    expect(categories?.access?.delete).toBe(isStaffOrOwner)
    // categories read: nyilvános (mindenkinek true)
    expect(categories?.access?.read?.(accessArgs(null))).toBe(true)

    // menus (T-013): a read nyilvános, de nem-admin csak a visible=true sorokat
    // kapja (where-kényszer); staff/owner mindent lát. A centrális politika és a
    // Menus collection ugyanazt a visibleMenusOrAdmin függvényt használja.
    const menus = bySlug.get('menus')
    expect(menus?.access?.create).toBe(isStaffOrOwner)
    expect(menus?.access?.update).toBe(isStaffOrOwner)
    expect(menus?.access?.delete).toBe(isStaffOrOwner)
    expect(menus?.access?.read).toBe(visibleMenusOrAdmin)
    expect(menus?.access?.read?.(accessArgs(null))).toEqual({ visible: { equals: true } })
    expect(menus?.access?.read?.(accessArgs(customer))).toEqual({ visible: { equals: true } })
    expect(menus?.access?.read?.(accessArgs(staff))).toBe(true)
    expect(menus?.access?.read?.(accessArgs(owner))).toBe(true)

    const media = bySlug.get('media')
    // A public read megmarad, a write staff+owner.
    expect(media?.access?.read?.(accessArgs(null))).toBe(true)
    expect(media?.access?.create).toBe(isStaffOrOwner)
    expect(media?.access?.update).toBe(isStaffOrOwner)
    expect(media?.access?.delete).toBe(isStaffOrOwner)
  })

  /**
   * A Testimonials collection-fájl maga NEM tartalmaz access-blokkot: a
   * politikát a centrális pipeline (applyCollectionAccessPolicies) applikálja rá.
   * Ez a teszt azt őrzi, hogy a bekötés a VÉGLEGES configban tényleg megtörténik
   * — különben a collection default (staff-only admin) szabályokkal maradna, és
   * a kezdőlap vélemény-szekciója nem kapna adatot a nyilvános olvasáson.
   */
  it('testimonials: a read látható-vagy-admin, az írás staff+owner', async () => {
    const config = await configPromise
    const testimonials = (config.collections ?? []).find((c) => c.slug === 'testimonials')

    expect(testimonials).toBeDefined()
    expect(testimonials?.access?.read).toBe(visibleTestimonialsOrAdmin)
    expect(testimonials?.access?.create).toBe(isStaffOrOwner)
    expect(testimonials?.access?.update).toBe(isStaffOrOwner)
    expect(testimonials?.access?.delete).toBe(isStaffOrOwner)

    // Mátrix-sor: látogató és customer csak a visible=true sorokat kapja,
    // staff/owner mindent (az adminban a levett vélemény is szerkeszthető).
    expect(testimonials?.access?.read?.(accessArgs(null))).toEqual({ visible: { equals: true } })
    expect(testimonials?.access?.read?.(accessArgs(customer))).toEqual({
      visible: { equals: true },
    })
    expect(testimonials?.access?.read?.(accessArgs(staff))).toBe(true)
    expect(testimonials?.access?.read?.(accessArgs(owner))).toBe(true)
  })

  it('users: saját rekord + owner-only delete, nyitott regisztráció', async () => {
    const config = await configPromise
    const users = (config.collections ?? []).find((c) => c.slug === 'users')

    expect(users?.access?.read).toBe(isSelfOrAdmin)
    expect(users?.access?.update).toBe(isSelfOrAdmin)
    expect(users?.access?.delete).toBe(isOwner)
    expect(users?.access?.admin).toBe(isStaffOrOwner)
    // A create nyitott (regisztráció) — látogató is hozhat létre fiókot.
    expect(users?.access?.create?.(accessArgs(null))).toBe(true)

    // A role mező továbbra is owner-only (jogemelés-gátlás).
    const roleField = findField(users as CollectionConfig, 'role')
    expect(roleField?.access?.create).toBe(isOwnerFieldAccess)
    expect(roleField?.access?.update).toBe(isOwnerFieldAccess)

    // A purchases mezőt továbbra sem írhatja senki az API-n keresztül.
    const purchasesField = findField(users as CollectionConfig, 'purchases')
    expect(purchasesField?.access?.create?.(fieldAccessArgs(owner))).toBe(false)
    expect(purchasesField?.access?.update?.(fieldAccessArgs(owner))).toBe(false)
  })

  it('products: ár-mezők és status owner-only írásúak', async () => {
    const config = await configPromise
    const products = (config.collections ?? []).find((c) => c.slug === 'products') as
      | CollectionConfig
      | undefined
    expect(products).toBeDefined()

    for (const name of ['priceInHUF', 'priceInHUFEnabled']) {
      const field = findField(products as CollectionConfig, name)
      expect(field, name).toBeDefined()
      expect(field?.access?.create, name).toBe(isOwnerFieldAccess)
      expect(field?.access?.update, name).toBe(isOwnerFieldAccess)
    }

    // A status a videos[].status miatt nem egyedi név — a top-level mezőt vizsgáljuk.
    const statusField = (products as CollectionConfig).fields.find(
      (field) => 'name' in field && field.name === 'status',
    ) as NamedTestField | undefined
    expect(statusField).toBeDefined()
    expect(statusField?.access?.create).toBe(isOwnerFieldAccess)
    expect(statusField?.access?.update).toBe(isOwnerFieldAccess)
  })

  it('products: a videos[].streamAssetId read-access staff/owner + vevő-only', async () => {
    const config = await configPromise
    const products = (config.collections ?? []).find((c) => c.slug === 'products') as
      | CollectionConfig
      | undefined
    expect(products).toBeDefined()

    const field = findField(products as CollectionConfig, 'streamAssetId')
    expect(field).toBeDefined()
    expect(field?.access?.read).toBe(streamAssetReadAccess)

    // A videos többi almezője (cím, hossz, állapot) nyilvános marad — a
    // kurzusoldal-epizódlista miatt nincs rajtuk read-access.
    for (const name of ['title', 'durationSec', 'status']) {
      const subField = findField(products as CollectionConfig, name)
      expect(subField, name).toBeDefined()
    }
    const preview = findField(products as CollectionConfig, 'previewVideoStreamId')
    expect(preview).toBeDefined()
    expect(preview?.access?.read).toBeUndefined()
  })

  it('orders: pénzügyi/személyes mezők read owner-only, refund update owner-only', async () => {
    const config = await configPromise
    const orders = (config.collections ?? []).find((c) => c.slug === 'orders') as
      | CollectionConfig
      | undefined
    expect(orders).toBeDefined()

    for (const name of ['customerSnapshot', 'ipAddress', 'invoiceNumber', 'barionPaymentId']) {
      const field = findField(orders as CollectionConfig, name)
      expect(field, name).toBeDefined()
      expect(field?.access?.read, name).toBe(isOwnerFieldAccess)
    }

    for (const name of ['refundedAt', 'refundReason']) {
      const field = findField(orders as CollectionConfig, name)
      expect(field, name).toBeDefined()
      expect(field?.access?.update, name).toBe(isOwnerFieldAccess)
    }
  })

  it('orders: orderNumber + snapshot-mezők bekötve, integritási hook create-kor fut', async () => {
    const config = await configPromise
    const orders = (config.collections ?? []).find((c) => c.slug === 'orders') as
      | CollectionConfig
      | undefined
    expect(orders).toBeDefined()

    const orderNumber = findField(orders as CollectionConfig, 'orderNumber')
    expect(orderNumber).toBeDefined()
    expect(orderNumber?.unique).toBe(true)
    // A kliens nem írhatja (sem create, sem update).
    expect(orderNumber?.access?.create?.(fieldAccessArgs(owner))).toBe(false)
    expect(orderNumber?.access?.update?.(fieldAccessArgs(owner))).toBe(false)

    for (const name of ['totalHufSnapshot', 'titleSnapshot', 'priceHufSnapshot']) {
      const field = findField(orders as CollectionConfig, name)
      expect(field, name).toBeDefined()
      expect(field?.access?.create?.(fieldAccessArgs(owner)), name).toBe(false)
      expect(field?.access?.update?.(fieldAccessArgs(owner)), name).toBe(false)
    }

    expect(orders?.hooks?.beforeChange).toContain(orderIntegrityBeforeChange)
  })
})
