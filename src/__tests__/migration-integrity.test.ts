import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A CLAUDE.md 3. TILOS ZÓNÁJÁNAK VÉGREHAJTHATÓ ŐRE (G4 — migráció-integritás).
 *
 * A G3 (migration-immutability.test.ts) a MEGLEVŐ migrációk bitorlása ellen őr;
 * a G4 a migrációs KÖNYVTÁR szerkezeti épségét fogja — azt a belső konzisztenciát,
 * amely nélkül a Payload migrációs gépezete hibásan vagy összeomlással fut:
 *
 *  1. PÁR-TELJESSÉG: minden `YYYYMMDD_HHMMSS_<név>.ts` fájlhoz létezik az azonos
 *     nevű `.json` snapshot és fordítva — a `migrate:create` a legfrissebb .json
 *     snapshotból diffel, az éles futtatás a .ts-t importálja, az árva fájl
 *     mindkét irányban törést jelent;
 *  2. KÖNYVTÁR-WHITELIST: a könyvtárban csak datált .ts/.json párak, az index.ts,
 *     a .checksums.json manifest és a macOS-szemét (.DS_Store, explicit engedve)
 *     lehet. Bármi más BUKÁS — egy kóbor .ts-t a PROD éles futtatás
 *     MIGRÁCIÓKÉNT IMPORTÁLNA (readMigrationFiles: `.sort()`, az index.ts-t
 *     kihagyva minden .ts/.js-t dynamic-importál) → éles deploy-összeomlás;
 *  3. SORREND-EGÉSZSÉG: a `YYYYMMDD_HHMMSS` prefixek egyediek, és a datált .ts
 *     lista szigorúan monoton nő — az időrend-tartó fájlnév a migrációs lánc
 *     egyetlen sorrendi forrása (az éles futtatás név szerint rendez);
 *  4. SNAPSHOT-ÉRVÉNYESSÉG: minden nem-manifest .json parse-olható, és van
 *     `version` és `dialect` string kulcsa — a sérült/üres snapshot a
 *     `migrate:create`-et és a diffelést töri;
 *  5. INDEX↔KÖNYVTÁR EGYEZÉS: az index.ts dinamikus importja után a
 *     `migrations.map(m => m.name)` PONTOSAN a rendezett könyvtári
 *     .ts-basename-lista (tömb-egyezés) — a fejlesztői futtatás az index.ts-t
 *     olvassa, az éles a könyvtárat; ha a kettő szétcsúszik, a két környezet
 *     más láncot futtat.
 *
 * A teszt NEM futtat migrációt és nem nyúl adatbázishoz — pusztán a könyvtár
 * és az index.ts deklarált szerkezetét asszertálja.
 */

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url))

/** A datált migrációs fájl nevének alakja — a G3-őr és a generátor ugyanezt használja. */
const DATED_TS = /^\d{8}_\d{6}_[a-z0-9_]+\.ts$/
const DATED_JSON = /^\d{8}_\d{6}_[a-z0-9_]+\.json$/
/** A sorrendi kulcs: a fájlnév időbélyeg-prefixe. */
const PREFIX = /^(\d{8}_\d{6})/

/** A könyvtárban megengedett nem-datált nevek (a .DS_Store a macOS-szemét explicit engedélyezettje). */
const WHITELISTED_NAMES = new Set(['index.ts', '.checksums.json', '.DS_Store'])

function directoryNames(): string[] {
  return readdirSync(MIGRATIONS_DIR)
}

function datedTsNames(): string[] {
  return directoryNames().filter((name) => DATED_TS.test(name)).sort()
}

function datedJsonNames(): string[] {
  return directoryNames().filter((name) => DATED_JSON.test(name)).sort()
}

describe('G4 — migráció-integritás (CLAUDE.md 3. tilos zóna)', () => {
  it('(1) minden datált .ts-hez létezik az azonos nevű .json és fordítva (pár-teljesség)', () => {
    const names = directoryNames()
    const violations: string[] = []
    for (const name of names.filter((candidate) => DATED_TS.test(candidate))) {
      if (!names.includes(name.replace(/\.ts$/, '.json'))) {
        violations.push(`${name}: hiányzik a .json snapshot-pár — a migrate:create enélkül nem tud diffelni`)
      }
    }
    for (const name of names.filter((candidate) => DATED_JSON.test(candidate))) {
      if (!names.includes(name.replace(/\.json$/, '.ts'))) {
        violations.push(`${name}: hiányzik a .ts pár — az éles futtatási láncból kimaradna`)
      }
    }
    expect(violations).toEqual([])
  })

  it('(2) a könyvtár whitelist-tiszta: csak datált párak, index.ts, manifest és .DS_Store', () => {
    const violations = directoryNames()
      .filter((name) => !DATED_TS.test(name) && !DATED_JSON.test(name) && !WHITELISTED_NAMES.has(name))
      .map(
        (name) =>
          `${name}: nem engedélyezett fájl a src/migrations/ alatt — egy kóbor .ts-t a PROD éles futtatás ` +
          'MIGRÁCIÓKÉNT IMPORTÁLNA (readMigrationFiles: az index.ts-t kihagyva minden .ts-t dynamic-importál) ' +
          '→ éles deploy-összeomlás. Távolítsd el a fájlt.',
      )
    expect(violations).toEqual([])
  })

  it('(3) a YYYYMMDD_HHMMSS prefixek egyediek, és a datált .ts lista szigorúan monoton nő', () => {
    const tsNames = datedTsNames()
    const prefixes = tsNames.map((name) => {
      const match = PREFIX.exec(name)
      if (!match) {
        throw new Error(`a(z) ${name} nem datált nevű — a (2)-es whitelist-teszt ezt már buktatta volna`)
      }
      return match[1]
    })

    const duplicatePrefixes = prefixes.filter((prefix, index) => prefixes.indexOf(prefix) !== index)
    expect(
      [...new Set(duplicatePrefixes)],
      'két migráció ugyanazzal az időbélyeg-prefixszel: a sorrend nem egyértelmű',
    ).toEqual([])

    const notMonotonic: string[] = []
    for (let index = 1; index < tsNames.length; index += 1) {
      if (!(tsNames[index - 1] < tsNames[index])) {
        notMonotonic.push(`${tsNames[index - 1]} !< ${tsNames[index]}`)
      }
    }
    expect(notMonotonic, 'a rendezett migrációs lista nem szigorúan monoton nő').toEqual([])
  })

  it('(4) minden nem-manifest .json parse-olható, és van version + dialect string kulcsa', () => {
    const violations: string[] = []
    for (const name of datedJsonNames()) {
      let parsed: unknown
      try {
        parsed = JSON.parse(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))
      } catch {
        violations.push(`${name}: nem érvényes JSON — a migrate:create ezen elhasalna`)
        continue
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        violations.push(`${name}: a snapshot nem objektum`)
        continue
      }
      const snapshot = parsed as { version?: unknown; dialect?: unknown }
      if (typeof snapshot.version !== 'string') {
        violations.push(`${name}: hiányzó vagy nem string 'version' kulcs`)
      }
      if (typeof snapshot.dialect !== 'string') {
        violations.push(`${name}: hiányzó vagy nem string 'dialect' kulcs`)
      }
    }
    expect(violations).toEqual([])
  })

  it('(5) az index.ts migrations-tömbje PONTOSAN a rendezett könyvtári .ts-basename-lista', async () => {
    const expected = datedTsNames().map((name) => name.replace(/\.ts$/, ''))
    expect(expected.length).toBeGreaterThan(0)

    const indexPath = join(MIGRATIONS_DIR, 'index.ts')
    expect(existsSync(indexPath), 'hiányzik az src/migrations/index.ts').toBe(true)

    // Dinamikus import: a VALÓDI index.ts deklarált sorrendjét veti össze a
    // könyvtárral — nem forráskód-mintát, így egy átszervezés is fennakad rajta.
    const indexModule = await import('../migrations/index')
    const declared = indexModule.migrations.map((migration) => migration.name)
    expect(
      declared,
      'az index.ts migrations-sorrendje eltér a könyvtári rendezett listától — ' +
        'a fejlesztői és az éles futtatás más láncot futtatna; ' +
        'az index.ts-t a Payload migrációs eszköze írja, új migráció után ellenőrizd',
    ).toEqual(expected)
  })
})
