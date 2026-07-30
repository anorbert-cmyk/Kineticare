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
} from '../access'
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

    for (const slug of ['menus', 'categories']) {
      const collection = bySlug.get(slug)
      expect(collection?.access?.create, slug).toBe(isStaffOrOwner)
      expect(collection?.access?.update, slug).toBe(isStaffOrOwner)
      expect(collection?.access?.delete, slug).toBe(isStaffOrOwner)
      // read: nyilvános (mindenkinek true)
      expect(collection?.access?.read?.(accessArgs(null)), slug).toBe(true)
    }

    const media = bySlug.get('media')
    // A public read megmarad, a write staff+owner.
    expect(media?.access?.read?.(accessArgs(null))).toBe(true)
    expect(media?.access?.create).toBe(isStaffOrOwner)
    expect(media?.access?.update).toBe(isStaffOrOwner)
    expect(media?.access?.delete).toBe(isStaffOrOwner)
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
