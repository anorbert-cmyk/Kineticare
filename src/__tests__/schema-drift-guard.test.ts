/**
 * G1 — SÉMA-DRIFT ŐR: a migrációs lánc újrajátszása a legutolsó snapshot ellen.
 *
 * A TILOS ZÓNA, AMIT EZ AZ ŐR VÉGREHAJT: a src/migrations alatti migrációs
 * lánc (a valós, élesben is lefutó up() SQL-ek) és a legutolsó drizzle-
 * snapshot .json SOsem csúszhat szét. A snapshotot a Payload
 * buildCreateMigration-je írja ki az utolsó migráció generálásakor; ha a két
 * oldal eltér, akkor vagy egy migráció kézzel, ellenőrizetlenül módosult, vagy
 * a snapshot nem az éppen érvényes végállapotot írja le — mindkettő
 * visszafordíthatatlan sémahibához vezet a következő `payload migrate` alkalmával.
 *
 * A MÓDSZER — VALÓDI ADATBÁZIS NÉLKÜL. A teszt a 13 datált migrációs modult
 * dinamikusan importálja, és mindegyik up()/down() függvényt ÁL-adapterrel
 * futtatja le: a `db.execute` a drizzle-sql objektumot kifogja (a
 * queryChunks StringChunk-darabjai duck-type-ellenőrzéssel — NEM
 * instanceof-alapúan, mert az osztály az újraexportok miatt
 * példány-azonossága veszélyes), a `payload` és `req` minden
 * tulajdonság-hozzáférésre kivételt dob. Így a migrációk pontosan ugyanazt az
 * SQL-t adják át a replaynek, amit élesben a Postgres kapna — egyetlen
 * lekérdezés sem megy ki, a teszt bármilyen környezetben, DB és hálózat
 * nélkül fut.
 *
 * HANGOS BUKÁS ELVE (az ORCHESTRÁTOR elvárása): interpolált/nem statikus
 * SQL, ismeretlen statement-alak, vagy olyan statement-család, amelyhez
 * nincs replay-kezelő → kivétel, tehát piros teszt. Semmit nem nyel el, semmit
 * nem enged át figyelmeztetéssel — a séma-drift pontosan a csendes helyeken
 * szokott észrevétlen maradni.
 *
 * A REPLAY-SORREND tartalmi: a payload éles migráció-olvasása
 * (payload/dist/database/migrations/readMigrationFiles.js) könyvtár-scan +
 * .sort() sorrendben játssza le a migrációkat — a teszt ugyanezt a
 * lexikografikus sorrendet követi (listDatedMigrationTs).
 */

import { describe, expect, it } from 'vitest'

import {
  canonicalizeSnapshot,
  captureMigrationStatements,
  classifyStatement,
  createEmptyCanonicalSchema,
  diffCanonical,
  latestSnapshotPath,
  listDatedMigrationTs,
  readSnapshot,
  replayStatement,
} from './helpers/migration-schema'

describe('G1 — séma-drift őr (migrációs lánc ↔ legutolsó snapshot)', () => {
  it('minden migráció up()-ja tisztán statikus SQL, és migrációnként legalább 1 statementet tartalmaz', async () => {
    const files = listDatedMigrationTs()
    expect(files.length, 'a migrations könyvtárban nincs egyetlen datált migráció sem').toBeGreaterThan(0)

    for (const fileName of files) {
      // A capture maga dob, ha az sql template interpolált (nem StringChunk
      // darab) vagy tartalmatlan — itt az statement-szám a maradék kontroll.
      const statements = await captureMigrationStatements(fileName, 'up')
      expect(
        statements.length,
        `${fileName}: az up()-nak legalább 1 SQL-statementet kell kiadnia`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it(
    'az összes up() újrajátszott végsémája megegyezik a legutolsó kanonizált snapshot-tal',
    { timeout: 60_000 },
    async () => {
      const files = listDatedMigrationTs()
      expect(files.length).toBeGreaterThan(0)

      const replaySchema = createEmptyCanonicalSchema()
      let statementCount = 0
      for (const fileName of files) {
        const statements = await captureMigrationStatements(fileName, 'up')
        for (const statement of statements) {
          replayStatement(replaySchema, statement, `${fileName} up()`)
          statementCount += 1
        }
      }
      expect(statementCount, 'a replay egyetlen statementet sem dolgozott fel').toBeGreaterThan(0)

      const snapshotSchema = canonicalizeSnapshot(readSnapshot(latestSnapshotPath()))
      const diff = diffCanonical(replaySchema, snapshotSchema)
      expect(
        diff,
        `a migrációs lánc replay-végsémája eltér a legutolsó snapshottól (${diff.length} eltérés):\n${diff.join('\n')}`,
      ).toEqual([])
    },
  )

  it('minden down() tisztán statikus, ismert statement-alakú (csak parse, replay nélkül)', async () => {
    const files = listDatedMigrationTs()
    expect(files.length).toBeGreaterThan(0)

    for (const fileName of files) {
      const statements = await captureMigrationStatements(fileName, 'down')
      expect(
        statements.length,
        `${fileName}: a down()-nak legalább 1 SQL-statementet kell kiadnia`,
      ).toBeGreaterThanOrEqual(1)
      for (const statement of statements) {
        const kind = classifyStatement(statement)
        expect(
          kind,
          `${fileName} down(): ismeretlen statement-alak — a séma-őr csak whitelistelt családokat enged: ${statement.slice(0, 140)}`,
        ).not.toBeNull()
      }
    }
  })

  it('önkalibráció: a diff-motor egy elhagyott oszlopot hangosan jelez', () => {
    const snapshotSchema = canonicalizeSnapshot(readSnapshot(latestSnapshotPath()))
    const mutated = structuredClone(snapshotSchema)

    const tableName = Object.keys(mutated.tables).sort()[0]
    const columnName = Object.keys(mutated.tables[tableName].columns).sort()[0]
    delete mutated.tables[tableName].columns[columnName]

    const diff = diffCanonical(mutated, snapshotSchema)
    expect(
      diff.some((line) => line.includes(`hiányzó oszlop: ${tableName}.${columnName}`)),
      `a diff-motor nem jelezte az elhagyott ${tableName}.${columnName} oszlopot: ${diff.join(' | ')}`,
    ).toBe(true)
  })
})
