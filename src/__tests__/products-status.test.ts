import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import configPromise from '../payload.config'
import { isDatabaseAvailable } from './helpers/db-available'

/**
 * Regressziós teszt a products `status` enum-ütközésre: a custom `status`
 * mező (draft/published/archived) és a drafts `_status` mező korábban ugyanazt
 * az adatbázis-enumot kapta, így az 'archived' érték Postgres-enumhibára futott.
 *
 * DB-függő: csak akkor fut, ha a DATABASE_URI-n TÉNYLEGESEN elérhető Postgres
 * fut (helyi validáció / jövőbeli CI adatbázissal). Egyébként kihagyva — az
 * env-alapú kapcsoló a CI álértékű DATABASE_URI-jánál hamis pozitívot adna
 * (lásd src/__tests__/helpers/db-available.ts).
 */
const hasDb = await isDatabaseAvailable()

describe.skipIf(!hasDb)('products status: archived (DB)', () => {
  let payload: Payload
  let categoryId: number
  const createdProductIds: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: configPromise })

    const slug = 'test-products-status-archived'
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    categoryId =
      existing.docs[0]?.id ??
      (
        await payload.create({
          collection: 'categories',
          data: { title: 'Teszt kategória (status archived)', slug, type: 'product' },
          overrideAccess: true,
        })
      ).id
  })

  afterAll(async () => {
    for (const id of createdProductIds) {
      await payload.delete({ collection: 'products', id, overrideAccess: true })
    }
    await payload.db?.destroy?.()
  })

  it('status: archived írás és olvasás működik (enumhiba nélkül)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        sku: `TEST-ARCHIVED-${Date.now()}`,
        category: categoryId,
        status: 'archived',
      },
      overrideAccess: true,
    })
    createdProductIds.push(product.id)

    expect(product.status).toBe('archived')

    const readBack = await payload.findByID({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
    expect(readBack.status).toBe('archived')
  })

  it('status draft → archived → published átmenetek is működnek', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        sku: `TEST-TRANSITION-${Date.now()}`,
        category: categoryId,
        status: 'draft',
      },
      overrideAccess: true,
    })
    createdProductIds.push(product.id)

    const archived = await payload.update({
      collection: 'products',
      id: product.id,
      data: { status: 'archived' },
      overrideAccess: true,
    })
    expect(archived.status).toBe('archived')

    const published = await payload.update({
      collection: 'products',
      id: product.id,
      data: { status: 'published' },
      overrideAccess: true,
    })
    expect(published.status).toBe('published')
  })
})
