/**
 * A vásárló-import végrehajtója (src/lib/customer-import/execute.ts).
 *
 * A LEGFONTOSABB elvárás az IDEMPOTENCIA: ugyanaz a fájl kétszer lefuttatva a
 * második körben csupa kihagyás, és semmilyen meglévő adat (jelszó, szerepkör,
 * korábbi vásárlás) nem sérül. Ezen áll vagy bukik a megszakadt futás
 * újraindíthatósága.
 *
 * MINDEN ADAT KITALÁLT (example.com).
 */

import { describe, expect, it } from 'vitest'

import { executeImportPlan, generateInitialPassword } from '../../lib/customer-import/execute'
import { parseCustomerCsv } from '../../lib/customer-import/parse'
import { buildImportPlan, parseCourseMap } from '../../lib/customer-import/plan'
import { validatePasswordStrength } from '../../lib/security/password-policy'
import { createFakeDb, createFakePayload, type FakeDb } from './fake-payload'

const CSV = [
  'Email,Name,Courses',
  'uj.vasarlo@example.com,Új Vásárló,Kéz Rehab Alap|Kéz Rehab Halado',
  'reszben.meglevo@example.com,Részben Meglévő,Kéz Rehab Alap|Kéz Rehab Halado',
  'teljes.meglevo@example.com,Teljes Meglévő,Kéz Rehab Alap',
  '',
].join('\n')

const COURSE_MAP = parseCourseMap(['Kéz Rehab Alap=KEZ-ALAP', 'Kéz Rehab Halado=KEZ-HALADO'])

function seedDb(overrides: Partial<FakeDb> = {}): FakeDb {
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
        password: 'tulaj-jelszo-hash',
      },
      {
        id: 2,
        email: 'reszben.meglevo@example.com',
        name: 'Részben Meglévő',
        role: 'staff',
        purchases: [11],
        password: 'regi-jelszo-hash',
      },
      {
        id: 3,
        email: 'teljes.meglevo@example.com',
        name: 'Teljes Meglévő',
        role: 'customer',
        purchases: [11],
        password: 'masik-jelszo-hash',
      },
    ],
    ...overrides,
  })
}

/** Egy teljes kör: terv (friss DB-állapotból) + végrehajtás. */
async function runImport(db: FakeDb, csv = CSV) {
  const payload = createFakePayload(db)
  const plan = await buildImportPlan(payload, {
    rows: parseCustomerCsv(csv).rows,
    courseMap: COURSE_MAP,
  })
  return executeImportPlan(payload, plan)
}

describe('kezdőjelszó generálása', () => {
  it('megfelel a jelszó-politikának és minden hívásnál más', () => {
    const first = generateInitialPassword('pelda.vasarlo@example.com')
    const second = generateInitialPassword('pelda.vasarlo@example.com')
    expect(validatePasswordStrength({ password: first, email: 'pelda.vasarlo@example.com' })).toEqual(
      [],
    )
    expect(first).not.toBe(second)
    expect(first.length).toBeGreaterThanOrEqual(12)
  })
})

describe('végrehajtás', () => {
  it('létrehoz, bővít és kihagy — a mérleg számai stimmelnek', async () => {
    const db = seedDb()
    const result = await runImport(db)

    expect(result.summary).toEqual({ letrehozva: 1, bovitve: 1, kihagyva: 1, hibas: 0 })
    expect(result.createdEmails).toEqual(['uj.vasarlo@example.com'])
    expect(result.touchedEmails).toEqual([
      'reszben.meglevo@example.com',
      'uj.vasarlo@example.com',
    ])
  })

  it('az új felhasználó customer szerepkört és a kurzusait kapja', async () => {
    const db = seedDb()
    await runImport(db)
    const created = db.users.find((user) => user.email === 'uj.vasarlo@example.com')
    expect(created?.role).toBe('customer')
    expect(created?.name).toBe('Új Vásárló')
    expect(created?.purchases).toEqual([11, 12])
    // A generált jelszó nem üres, de sehol nem íródik ki — csak a létezését nézzük.
    expect(created?.password.length).toBeGreaterThan(0)
  })

  it('bővítésnél MEGŐRZI a meglévő vásárlásokat, és nem nyúl jelszóhoz/szerepkörhöz', async () => {
    const db = seedDb()
    await runImport(db)
    const user = db.users.find((entry) => entry.email === 'reszben.meglevo@example.com')
    expect(user?.purchases).toEqual([11, 12])
    expect(user?.password).toBe('regi-jelszo-hash')
    expect(user?.role).toBe('staff')
    expect(user?.name).toBe('Részben Meglévő')
  })

  it('a teljes hozzáférésű vevőnél EGYETLEN írás sem történik', async () => {
    const db = seedDb()
    await runImport(db)
    // 1 create (új vevő) + 1 update (bővítés) — a kihagyott sor nem ír.
    expect(db.calls.create).toBe(1)
    expect(db.calls.update).toBe(1)
  })
})

describe('IDEMPOTENCIA — a megszakadt futás újraindítható', () => {
  it('a második kör csupa kihagyás, és nem ír semmit', async () => {
    const db = seedDb()
    await runImport(db)
    const writesAfterFirst = { create: db.calls.create, update: db.calls.update }

    const second = await runImport(db)

    expect(second.outcomes.every((outcome) => outcome.action === 'skip-complete')).toBe(true)
    expect(second.summary).toEqual({ letrehozva: 0, bovitve: 0, kihagyva: 3, hibas: 0 })
    expect(db.calls.create).toBe(writesAfterFirst.create)
    expect(db.calls.update).toBe(writesAfterFirst.update)
    expect(db.users).toHaveLength(4)
  })

  it('a harmadik kör sem duplikál vásárlást', async () => {
    const db = seedDb()
    await runImport(db)
    await runImport(db)
    await runImport(db)
    const created = db.users.find((user) => user.email === 'uj.vasarlo@example.com')
    expect(created?.purchases).toEqual([11, 12])
    expect(db.users.filter((user) => user.email === 'uj.vasarlo@example.com')).toHaveLength(1)
  })
})

describe('hibás sor kezelése', () => {
  it('a hibára futó sor a hibalistába kerül, a futás MEGY TOVÁBB', async () => {
    const db = seedDb({ failWritesFor: ['uj.vasarlo@example.com'] })
    const result = await runImport(db)

    expect(result.summary).toEqual({ letrehozva: 0, bovitve: 1, kihagyva: 1, hibas: 1 })
    const failed = result.outcomes.find((outcome) => outcome.action === 'failed')
    expect(failed?.email).toBe('uj.vasarlo@example.com')
    expect(failed?.error).toMatch(/adatbázis-hiba/)
    // A hibás sor UTÁN következő sorok is lefutottak.
    const user = db.users.find((entry) => entry.email === 'reszben.meglevo@example.com')
    expect(user?.purchases).toEqual([11, 12])
  })

  it('a hibás sor újrafuttatáskor pótolható', async () => {
    const db = seedDb({ failWritesFor: ['uj.vasarlo@example.com'] })
    await runImport(db)
    db.failWritesFor = []
    const second = await runImport(db)
    expect(second.summary.letrehozva).toBe(1)
    expect(db.users.find((user) => user.email === 'uj.vasarlo@example.com')?.purchases).toEqual([
      11, 12,
    ])
  })
})

describe('üres users kollekció elleni védelem', () => {
  it('nem indul el, ha az első felhasználó owner szerepkört kapna', async () => {
    const db = createFakeDb({ products: [{ id: 11, sku: 'KEZ-ALAP' }] })
    const payload = createFakePayload(db)
    const plan = await buildImportPlan(payload, {
      rows: parseCustomerCsv('Email,Name,Courses\nuj@example.com,Új,Kéz Rehab Alap\n').rows,
      courseMap: COURSE_MAP,
    })
    await expect(executeImportPlan(payload, plan)).rejects.toThrow(/owner/)
    expect(db.calls.create).toBe(0)
  })
})
