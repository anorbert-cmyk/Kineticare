/**
 * ŐR-TESZT: a rendelés bizonylat-mezőinek ÍRÁSI joga (K5).
 *
 * MIT VÉD. Az `admin.readOnly` csak a Payload admin UI-t zárja. Staff
 * `PATCH /api/orders/:id` ettől még `invoiceStatus: 'issued'`-re állíthatná
 * a mezőt, és az invoice-issue job örökre no-opolna. A mezők
 * `update: () => false` — a rendszer `overrideAccess: true`-val ír.
 *
 * Merge előtt emberi review (zóna 4). MINDEN ADAT KITALÁLT.
 */

import type { CollectionConfig, Field, FieldAccess } from 'payload'
import { describe, expect, it } from 'vitest'

import configPromise from '../../payload.config'

type Role = 'owner' | 'staff' | 'customer'

const owner = { id: 1, role: 'owner' as Role }
const staff = { id: 2, role: 'staff' as Role }
const customer = { id: 3, role: 'customer' as Role }

const fieldArgs = (user: { id: number; role: Role } | null): Parameters<FieldAccess>[0] =>
  ({
    req: { user },
    id: 101,
    doc: { id: 101, invoiceStatus: 'none' },
    data: { invoiceStatus: 'issued' },
  }) as unknown as Parameters<FieldAccess>[0]

type NamedTestField = Field & {
  name: string
  access?: {
    create?: FieldAccess
    read?: FieldAccess
    update?: FieldAccess
  }
}

function findNamed(fields: Field[], name: string): NamedTestField | undefined {
  for (const field of fields) {
    if ('name' in field && field.name === name) {
      return field as NamedTestField
    }
    if ('fields' in field && Array.isArray(field.fields)) {
      const nested = findNamed(field.fields as Field[], name)
      if (nested) {
        return nested
      }
    }
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        const nested = findNamed(tab.fields as Field[], name)
        if (nested) {
          return nested
        }
      }
    }
  }
  return undefined
}

async function orderField(name: string): Promise<NamedTestField> {
  const config = await configPromise
  const orders = (config.collections ?? []).find((collection) => collection.slug === 'orders')
  expect(orders, 'az orders collection megvan a configban').toBeDefined()
  const field = findNamed((orders as CollectionConfig).fields, name)
  expect(field, `a ${name} mező megvan`).toBeDefined()
  return field as NamedTestField
}

const SYSTEM_MANAGED_FIELDS = [
  'invoiceNumber',
  'invoicePdfUrl',
  'invoiceStatus',
  'invoiceAttempts',
  'invoiceLastError',
  'invoiceCompletionDate',
  'stornoStatus',
  'stornoNumber',
  'stornoAttempts',
  'stornoLastError',
  'correctiveInvoiceStatus',
  'correctiveInvoiceNumber',
  'correctiveInvoiceSeq',
  'correctiveInvoiceAttempts',
  'correctiveInvoiceLastError',
  'correctiveInvoiceAttemptsSeq',
] as const

describe('orders bizonylat-mezők írási joga (K5)', () => {
  it.each(SYSTEM_MANAGED_FIELDS)(
    '%s: staff/owner/customer/látogató se create se update',
    async (name) => {
      const field = await orderField(name)
      for (const user of [owner, staff, customer, null]) {
        expect(field.access?.create?.(fieldArgs(user))).toBe(false)
        expect(field.access?.update?.(fieldArgs(user))).toBe(false)
      }
    },
  )
})
