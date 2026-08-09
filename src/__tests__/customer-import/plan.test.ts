/**
 * A vásárló-import terv-készítője (src/lib/customer-import/plan.ts).
 *
 * A terv OLVASÁS-ONLY, ezért a `--dry-run` ugyanezt mutatja meg, amit az éles
 * futás végrehajtana — a tesztek ezt a három döntést fedik le (új fiók /
 * bővítés / kihagyás), plusz a nem leképezett kurzusnevek kezelését.
 *
 * MINDEN ADAT KITALÁLT (example.com).
 */

import { describe, expect, it } from 'vitest'

import { parseCustomerCsv } from '../../lib/customer-import/parse'
import { buildImportPlan, parseCourseMap, purchaseIdsOf } from '../../lib/customer-import/plan'
import { createFakeDb, createFakePayload, type FakeDb } from './fake-payload'

const CSV = [
  'Email,Name,Courses',
  'uj.vasarlo@example.com,Új Vásárló,Kéz Rehab Alap|Kéz Rehab Halado',
  'reszben.meglevo@example.com,Részben Meglévő,Kéz Rehab Alap|Kéz Rehab Halado',
  'teljes.meglevo@example.com,Teljes Meglévő,Kéz Rehab Alap',
  '',
].join('\n')

const MAP = ['Kéz Rehab Alap=KEZ-ALAP', 'Kéz Rehab Halado=KEZ-HALADO']

function seedDb(): FakeDb {
  return createFakeDb({
    products: [
      { id: 11, sku: 'KEZ-ALAP' },
      { id: 12, sku: 'KEZ-HALADO' },
    ],
    users: [
      {
        id: 1,
        email: 'tulaj@example.com',
        name: 'Tulajdonos',
        role: 'owner',
        purchases: [],
        password: 'x',
      },
      {
        id: 2,
        email: 'reszben.meglevo@example.com',
        name: 'Részben Meglévő',
        role: 'customer',
        purchases: [11],
        password: 'x',
      },
      {
        id: 3,
        email: 'teljes.meglevo@example.com',
        name: 'Teljes Meglévő',
        role: 'customer',
        purchases: [11],
        password: 'x',
      },
    ],
  })
}

describe('--map feldolgozása', () => {
  it('kurzusnév=SKU párokat olvas, az első = mentén vág', () => {
    const result = parseCourseMap(['Kéz Rehab Alap=KEZ-ALAP', 'A=B=C'])
    expect(result.bySku.get('kéz rehab alap')).toBe('KEZ-ALAP')
    expect(result.bySku.get('a')).toBe('B=C')
    expect(result.errors).toEqual([])
  })

  it('hibás és ellentmondó párokra magyar hibaüzenetet ad', () => {
    expect(parseCourseMap(['nincs-egyenlosegjel']).errors[0]).toMatch(/Hibás --map/)
    expect(parseCourseMap(['=KEZ-ALAP']).errors[0]).toMatch(/sem lehet üres/)
    expect(parseCourseMap(['A=X', 'A=Y']).errors[0]).toMatch(/Ellentmondó --map/)
  })

  it('a kurzusnév egyeztetése kis/nagybetű- és szóköz-érzéketlen', () => {
    const result = parseCourseMap(['  Kéz   Rehab Alap =KEZ-ALAP'])
    expect(result.bySku.get('kéz rehab alap')).toBe('KEZ-ALAP')
  })
})

describe('purchases id-kinyerés', () => {
  it('nyers id-t és populate-olt objektumot is elfogad', () => {
    expect(purchaseIdsOf([11, { id: 12 }, null, 'x', {}])).toEqual([11, 12])
    expect(purchaseIdsOf(undefined)).toEqual([])
  })
})

describe('terv-készítés', () => {
  it('a három döntést helyesen osztja ki', async () => {
    const db = seedDb()
    const parsed = parseCustomerCsv(CSV)
    const plan = await buildImportPlan(createFakePayload(db), {
      rows: parsed.rows,
      courseMap: parseCourseMap(MAP),
    })

    expect(plan.summary).toEqual({ create: 1, append: 1, skip: 1 })
    const byEmail = new Map(plan.entries.map((entry) => [entry.email, entry]))
    expect(byEmail.get('uj.vasarlo@example.com')?.action).toBe('create-user')
    expect(byEmail.get('reszben.meglevo@example.com')?.action).toBe('append-purchases')
    expect(byEmail.get('teljes.meglevo@example.com')?.action).toBe('skip-complete')
  })

  it('bővítésnél CSAK a hiányzó terméket tervezi be', async () => {
    const plan = await buildImportPlan(createFakePayload(seedDb()), {
      rows: parseCustomerCsv(CSV).rows,
      courseMap: parseCourseMap(MAP),
    })
    const entry = plan.entries.find((item) => item.email === 'reszben.meglevo@example.com')
    expect(entry?.missingProducts.map((product) => product.sku)).toEqual(['KEZ-HALADO'])
    expect(entry?.userId).toBe(2)
  })

  it('a terv NEM ír az adatbázisba', async () => {
    const db = seedDb()
    await buildImportPlan(createFakePayload(db), {
      rows: parseCustomerCsv(CSV).rows,
      courseMap: parseCourseMap(MAP),
    })
    expect(db.calls.create).toBe(0)
    expect(db.calls.update).toBe(0)
    expect(db.users).toHaveLength(3)
  })

  it('determinisztikus: a bemenet sorrendjétől függetlenül ugyanaz a terv', async () => {
    const forward = await buildImportPlan(createFakePayload(seedDb()), {
      rows: parseCustomerCsv(CSV).rows,
      courseMap: parseCourseMap(MAP),
    })
    const reversed = await buildImportPlan(createFakePayload(seedDb()), {
      rows: [...parseCustomerCsv(CSV).rows].reverse(),
      courseMap: parseCourseMap([...MAP].reverse()),
    })
    expect(reversed.entries).toEqual(forward.entries)
    expect(forward.entries.map((entry) => entry.email)).toEqual([
      'reszben.meglevo@example.com',
      'teljes.meglevo@example.com',
      'uj.vasarlo@example.com',
    ])
  })
})

describe('nem leképezett kurzusnév', () => {
  const csv = [
    'Email,Name,Courses',
    'uj.vasarlo@example.com,Új Vásárló,Kéz Rehab Alap|Ismeretlen Kurzus',
    'masik.uj@example.com,Másik Új,Ismeretlen Kurzus',
    '',
  ].join('\n')

  it('SOHA nem marad ki csendben: sor- és futás-szinten is megjelenik', async () => {
    const plan = await buildImportPlan(createFakePayload(seedDb()), {
      rows: parseCustomerCsv(csv).rows,
      courseMap: parseCourseMap(['Kéz Rehab Alap=KEZ-ALAP']),
    })
    expect(plan.unknownCourseNames).toEqual(['Ismeretlen Kurzus'])
    const entry = plan.entries.find((item) => item.email === 'uj.vasarlo@example.com')
    expect(entry?.unknownCourseNames).toEqual(['Ismeretlen Kurzus'])
    expect(entry?.missingProducts.map((product) => product.sku)).toEqual(['KEZ-ALAP'])
  })

  it('a nem létező SKU-t külön jelenti (elgépelt --map)', async () => {
    const plan = await buildImportPlan(createFakePayload(seedDb()), {
      rows: parseCustomerCsv(csv).rows,
      courseMap: parseCourseMap(['Kéz Rehab Alap=NINCS-ILYEN-SKU']),
    })
    expect(plan.unknownSkus).toEqual(['NINCS-ILYEN-SKU'])
    // A hiányzó termék nem tűnik el: nem leképezett kurzusnévként jelenik meg.
    expect(plan.unknownCourseNames).toEqual(['Ismeretlen Kurzus', 'Kéz Rehab Alap'])
  })
})

describe('üres users kollekció', () => {
  it('jelzi, hogy az első felhasználó owner szerepkört kapna', async () => {
    const db = createFakeDb({ products: [{ id: 11, sku: 'KEZ-ALAP' }] })
    const plan = await buildImportPlan(createFakePayload(db), {
      rows: parseCustomerCsv('Email,Name,Courses\nuj@example.com,Új,Kéz Rehab Alap\n').rows,
      courseMap: parseCourseMap(['Kéz Rehab Alap=KEZ-ALAP']),
    })
    expect(plan.emptyUserCollection).toBe(true)
    expect(plan.summary.create).toBe(1)
  })
})
