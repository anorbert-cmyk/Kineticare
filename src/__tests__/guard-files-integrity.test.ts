import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A CI-ŐRÖK META-ŐRE (guard-files-integrity) — a CLAUDE.md 2. és 3. tilos
 * zónájának végrehajtható őrei (G1–G4) CSAK AKKOR FUTNAK, HA LÉTEZNEK.
 *
 * Két csendes halálmód ellen fog:
 *
 *  1. HIÁNYZÓ ŐRFÁJL: a vitest-include (`src/**\/*.test.ts`) egy törölt vagy
 *     átnevezett őrtesztet NÉMÁN ELNÉZ — nincs hibaüzenet, a sor zöld marad,
 *     miközben a tilos zóna őrizetlenné válik. Ezért az öt őrfájl LÉTEZÉSE
 *     külön asszertálva van. (A 2026-08-10-i séma-drift incidens — 9 nap zöld
 *     CI éles leállás mellett — pontosan ilyen csendes vakfoltból nőtt ki.)
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

/** A tilos zónák végrehajtható őrei — mindnek léteznie kell a tesztsorban. */
const GUARD_FILES = [
  'schema-drift-guard.test.ts',
  'schema-config-sync.test.ts',
  'migration-immutability.test.ts',
  'migration-integrity.test.ts',
  'guard-files-integrity.test.ts',
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
  it('(1) mind az öt őrfájl létezik az src/__tests__/ alatt', () => {
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
