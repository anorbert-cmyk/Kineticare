import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A CI-ŐRÖK META-ŐRE (guard-files-integrity) — a CLAUDE.md 2. és 3. tilos
 * zónájának végrehajtható őrei (G1–G4, a megosztott séma-motorjuk, a
 * fizetési/checkout őr és az incidens-regressziós őrök) CSAK AKKOR FUTNAK,
 * HA LÉTEZNEK.
 *
 * Két csendes halálmód ellen fog:
 *
 *  1. HIÁNYZÓ ŐRFÁJL: a vitest-include (`src/**\/*.test.ts`) egy törölt vagy
 *     átnevezett őrtesztet NÉMÁN ELNÉZ — nincs hibaüzenet, a sor zöld marad,
 *     miközben a tilos zóna őrizetlenné válik. Ezért az őrfájlok LÉTEZÉSE
 *     külön asszertálva van (a helpers/migration-schema.ts nem .test.ts, azt
 *     az include egyáltalán nem nézné — a hiánya a G1/G2 importjaként ugyan
 *     kirobbanna, de a fájltartalmi token-vizsgálat miatt itt is őrzött).
 *     (A 2026-08-10-i séma-drift incidens — 9 nap zöld CI éles leállás
 *     mellett — pontosan ilyen csendes vakfoltból nőtt ki.)
 *
 *  2. KIÜTETT ŐRFÁJL: egy `.skip`-változatú kihagyó, egy `.only`-változatú
 *     fókuszáló vagy egy környezet-elnéző segéd (amely adatbázis hiányában
 *     csendben átengedné a tesztet) látszólag zölden kiveheti az őrt a
 *     sorból. Ezért az őrfájlok szövegében SUBSTRING-szinten tiltott
 *     tokeneket keresünk — a kommentekben is, mert a kommentben lévő minta
 *     egy későbbi szerkesztésnél élővé válhat.
 *
 * A tiltott tokeneket e fájl összefűzött stringekből építi fel, hogy a meta-őr
 * SAJÁT MAGA se bukjon meg a szabályon — a tokenek itt sosem szerepelnek
 * egybefüggően.
 */

const TESTS_DIR = fileURLToPath(new URL('.', import.meta.url))

/** A tilos zónák végrehajtható őrei és a közös motorjuk — mindnek léteznie kell a tesztsorban. */
const GUARD_FILES = [
  // A séma↔kód és migráció-immutabilitás őrei (G1–G4) + ez a meta-őr:
  'schema-drift-guard.test.ts',
  'schema-config-sync.test.ts',
  'migration-immutability.test.ts',
  'migration-integrity.test.ts',
  'guard-files-integrity.test.ts',
  // A G1/G2 megosztott kanonizáló- és replay-motorja:
  'helpers/migration-schema.ts',
  // A CLAUDE.md 2. tilos zónájának (fizetés/checkout) végrehajtható őre:
  'ecommerce-payments-guard.test.ts',
  // A CLAUDE.md 1. tilos zónájának (titok) napló-oldali őre: jelszó-változó
  // nem interpolálható naplóhívásba (2026-08-16-i átvizsgálás — a seed és a
  // demó-seed a generált induló jelszót a naplóüzenet szövegébe illesztette,
  // amit a kulcsnév-alapú logger-redakció nem szűr).
  'security/seed-secret-logging.test.ts',
  // Incidens-regressziós őrök:
  'koszonom-oldal.test.ts',
  'payload-config.test.ts',
]

/**
 * Az őrfájlokban substring-szinten tiltott minták — ÖSSZEFŰZVE, hogy ez a fájl
 * se tartalmazza őket egybefüggően (a meta-őr saját magát is vizsgálja).
 */
const FORBIDDEN_TOKENS = [
  'des' + 'cribe.skip',
  'it' + '.skip',
  'test' + '.skip',
  'des' + 'cribe.only',
  'it' + '.only',
  'test' + '.only',
  'skip' + 'If',
  'isDatabase' + 'Available',
  'db' + '-available',
]

describe('meta-őr — az őrfájlok épsége (a vitest-include némán elnézné a hiányt)', () => {
  it('(1) minden őrfájl létezik az src/__tests__/ alatt', () => {
    const missing = GUARD_FILES.filter((name) => !existsSync(join(TESTS_DIR, name)))
    expect(
      missing,
      'hiányzó őrfájl(ok) — egy törölt/átnevezett őrtesztet a vitest-include némán elnéz, ' +
        'így a tilos zóna őrizetlenné válna. Állítsd vissza a fájlt, vagy ha szándékos a törlés, ' +
        'az csak tudatos, külön PR-ben, e meta-őr egyidejű frissítésével történhet.',
    ).toEqual([])
  })

  it('(2) az őrfájlok nem tartalmazzák a kihagyó/fókuszáló/elnéző tokeneket (kommentben sem)', () => {
    const violations: string[] = []
    for (const name of GUARD_FILES) {
      const path = join(TESTS_DIR, name)
      if (!existsSync(path)) {
        // A hiányt az (1)-es teszt buktatja — itt nincs mit beolvasni.
        continue
      }
      const content = readFileSync(path, 'utf8')
      for (const token of FORBIDDEN_TOKENS) {
        if (content.includes(token)) {
          violations.push(
            `${name}: tiltott token található a fájlban: '${token}' — egy őrteszt nem hagyható ki, ` +
              'nem szűkíthető fókuszra és nem engedhető el környezetfüggően',
          )
        }
      }
    }
    expect(violations).toEqual([])
  })
})
