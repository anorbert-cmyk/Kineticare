/**
 * G2 — CONFIG↔SNAPSHOT ŐR: a payload.configból épülő drizzle-séma azonos-e
 * a legutolsó kiadott snapshot-tal.
 *
 * A TILOS ZÓNA, AMIT EZ AZ ŐR VÉGREHAJT: a collection/global/plugin-configok
 * séma-hatása NEM távolodhat el a legutolsó migrációs snapshot .json-tól.
 * A G1 őr (schema-drift-guard.test.ts) a migrációs LÁNCOT őrzi a snapshot
 * ellen; ez az őr a másik oldalt: ha valaki a configot úgy módosítja, hogy
 * ahhoz nem készül migráció (vagy a migráció másképp viselkedik, mint a
 * config), a következő deploy a Payload saját séma-összevetőjével
 * „kiszaladó" állapotot hozna létre. A két őr együtt zárja a kört:
 * config → (G2) → snapshot → (G1) → migrációs lánc.
 *
 * A MÓDSZER a Payload saját generátorának újrafuttatása — DB-KAPCSOLAT ÉS
 * HÁLÓZATI HÍVÁS NÉLKÜL:
 *
 *  - `getPayload({ disableDBConnect: true, disableOnInit: true })` — a
 *    payload/dist/index.js init-szekvenciája így a db.connect() és az onInit
 *    (webhook-regisztráció, seedelők) LEKAPCSOLVA fut: a drizzle-séma a
 *    db.init() ágban, tisztán memóriában épül fel (a kapuk az index.js
 *    disableDBConnect/disableOnInit feltételei — ezeket a G2 tudatosan
 *    zárja).
 *  - `config.telemetry = false` — a serverInit telemetria-esemény ezzel
 *    korán visszatér, fetch és fájlírás nélkül (payload/dist/utilities/
 *    telemetry/index.js `payload.config.telemetry !== false` kapu).
 *  - `config.typescript.autoGenerate = false` — a generate:types
 *    alprocesszus-spawn zárva (index.js autoGenerate kapu).
 *  - `PAYLOAD_DISABLE_DEPENDENCY_CHECKER=true` — a függőség-ellenőrző
 *    hálózati ága zárva.
 *
 * Az így előálló `payload.db.schema` a configból felépült drizzle-séma; a
 * `generateDrizzleJson` PONTOSAN az a hívás, amellyel a buildCreateMigration
 * a snapshot .json-okat is kiírja (@payloadcms/drizzle buildCreateMigration:
 * `generateDrizzleJson(this.schema)` → `JSON.stringify(…, null, 2)`). A két
 * oldal tehát azonos gyártósoron áll — a diff a kanonizálás (id/prevId/_meta
 * generálási zaj elhagyása) után őszinte: bármi megmaradó eltérés valódi
 * driftet jelent.
 *
 * A titok-megjegyzés: a getPayload üres `secret` esetén dobna (index.js
 * „missing secret key"), ezért ha a környezet nem ad értéket, a teszt egy
 * egyértelműen NEM éles, helyőrző teszt-titkot állít be — ez sosem hagyja
 * el a teszt-folyamatot, és semmilyen valódi titkot nem helyettesít.
 */

import { describe, expect, it } from 'vitest'
import { getPayload } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'

import configPromise from '../payload.config'
import {
  canonicalizeSnapshot,
  diffCanonical,
  latestSnapshotPath,
  readSnapshot,
} from './helpers/migration-schema'

describe('G2 — config↔snapshot őr (payload.config ↔ legutolsó snapshot)', () => {
  it(
    'a sanitize-ált configból épülő drizzle-séma megegyezik a legutolsó kanonizált snapshot-tal',
    { timeout: 60_000 },
    async () => {
      const config = await configPromise
      process.env.PAYLOAD_DISABLE_DEPENDENCY_CHECKER = 'true'
      config.telemetry = false
      config.typescript = { ...config.typescript, autoGenerate: false }
      if (!config.secret) {
        config.secret = 'g2-schema-guard-teszt-titok-helyorzo'
      }

      const payload = await getPayload({
        config,
        disableDBConnect: true,
        disableOnInit: true,
        key: 'schema-config-sync-guard',
      })

      // A payload.db a generikus adapter-típussal van deklarálva; a postgres
      // adapter futásidejű felülete (requireDrizzleKit, schema) a
      // PostgresAdapter típusán érhető el — indokolt cast a konkrét adapterre.
      const db = payload.db as unknown as PostgresAdapter
      const { generateDrizzleJson } = db.requireDrizzleKit()
      const after = await generateDrizzleJson(db.schema)

      const generatedSchema = canonicalizeSnapshot(after)
      const snapshotSchema = canonicalizeSnapshot(readSnapshot(latestSnapshotPath()))
      const diff = diffCanonical(generatedSchema, snapshotSchema)
      expect(
        diff,
        `a configból épülő drizzle-séma eltér a legutolsó snapshottól (${diff.length} eltérés):\n${diff.join('\n')}`,
      ).toEqual([])
    },
  )

  it('önkalibráció: a kanonizáló+diff egy enum-érték sorrendcserét hangosan jelez', () => {
    const snapshotSchema = canonicalizeSnapshot(readSnapshot(latestSnapshotPath()))
    const mutated = structuredClone(snapshotSchema)

    const enumName = Object.keys(mutated.enums)
      .sort()
      .find((name) => mutated.enums[name].length >= 2)
    expect(enumName, 'nincs legalább kétértékű enum az önkalibrációhoz').toBeDefined()
    const values = mutated.enums[enumName as string]
    const first = values[0]
    values[0] = values[1]
    values[1] = first

    const diff = diffCanonical(mutated, snapshotSchema)
    expect(
      diff.some((line) => line.includes(`eltérő enum-értékek (sorrendérzékeny): ${enumName}`)),
      `a diff-motor nem jelezte a(z) ${enumName} enum sorrendcseréjét: ${diff.join(' | ')}`,
    ).toBe(true)
  })
})
