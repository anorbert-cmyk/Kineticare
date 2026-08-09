import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { HOME_IMAGES } from '../lib/home-seed'
import { LEGACY_IMAGES } from '../lib/legacy-images'
import { MEDIA_DIR_ENV, resolveMediaStaticDir } from '../lib/media-dir'
import { buildMediaSourceIndex, mediaBaseName, missingMediaFiles } from '../lib/media-restore'
import type { Media } from '../payload-types'

/**
 * A deploykor elveszett képek önjavítása (src/lib/media-restore.ts) — a DB-t
 * nem igénylő, tiszta részek. A tényleges visszatöltést a funkcionális próba
 * fedi (üres feltöltési könyvtár + újrafuttatott seed).
 */

function mediaDoc(overrides: Partial<Media>): Media {
  return {
    id: 1,
    alt: 'Teszt kép',
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    ...overrides,
  }
}

describe('feltöltési könyvtár (PAYLOAD_MEDIA_DIR)', () => {
  /**
   * A legfontosabb elvárás: env nélkül SEMMI nem változik. Ilyenkor `undefined`
   * jön vissza, a `staticDir` kulcs be sem kerül az upload-blokkba, tehát a
   * Payload alapértelmezése (a collection slugja) marad érvényben.
   */
  it('üres vagy hiányzó env esetén undefined (marad a Payload alapértelmezése)', () => {
    expect(resolveMediaStaticDir(undefined)).toBeUndefined()
    expect(resolveMediaStaticDir('')).toBeUndefined()
    expect(resolveMediaStaticDir('   ')).toBeUndefined()
  })

  it('megadott értéket abszolút útvonalra normalizál', () => {
    expect(resolveMediaStaticDir('/app/media')).toBe('/app/media')
    expect(resolveMediaStaticDir('  /app/media  ')).toBe('/app/media')
    expect(path.isAbsolute(resolveMediaStaticDir('media') ?? '')).toBe(true)
  })

  it('a változó neve a dokumentált kulcs', () => {
    expect(MEDIA_DIR_ENV).toBe('PAYLOAD_MEDIA_DIR')
  })
})

describe('forrásindex (repóban élő képek)', () => {
  const index = buildMediaSourceIndex()

  /**
   * A helyreállítás CSAK akkor működik, ha minden listázott forrásfájl tényleg
   * ott van a repóban. Ha valaki átnevez vagy töröl egy assetet, ez a teszt
   * bukik — nem az éles deploy.
   */
  it('mindkét forráskészlet minden fájlja létezik a lemezen', () => {
    expect(index.size).toBe(HOME_IMAGES.length + LEGACY_IMAGES.length)
    for (const [baseName, filePath] of index) {
      expect(existsSync(filePath), `${baseName} → ${filePath}`).toBe(true)
    }
  })

  /**
   * A párosítás kulcsa a kiterjesztés nélküli alapnév, mert a Media collection
   * webp-re konvertál: a `sos-hands-board.jpg` forrásból `sos-hands-board.webp`
   * fájlnév lesz a DB-ben.
   */
  it('az alapnév alapján párosít (a webp-konverzió miatt)', () => {
    expect(mediaBaseName('sos-hands-board.webp')).toBe('sos-hands-board')
    expect(mediaBaseName('678fcfac079a8_Gyakorlat.webp')).toBe('678fcfac079a8_Gyakorlat')
    expect(index.get(mediaBaseName('sos-hands-board.webp'))).toMatch(/sos-hands-board\.jpg$/)
    expect(index.get(mediaBaseName('6884161138c15_puska.webp'))).toMatch(
      /6884161138c15_puska\.png$/,
    )
    // Saját, adminból feltöltött képhez nincs repó-forrás — ezt nem pótoljuk.
    expect(index.get('a-lanyok-sajat-kepe')).toBeUndefined()
  })
})

describe('hiányzó fájlok felderítése', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'kineticare-media-'))
  writeFileSync(path.join(dir, 'megvan.webp'), 'x')
  writeFileSync(path.join(dir, 'megvan-320.webp'), 'x')

  it('a meglévő fájlokra üres listát ad', () => {
    const doc = mediaDoc({
      filename: 'megvan.webp',
      sizes: { xs: { filename: 'megvan-320.webp' } },
    })
    expect(missingMediaFiles(dir, doc)).toEqual([])
  })

  it('a hiányzó fő fájlt és a hiányzó méret-variánst is jelzi', () => {
    const doc = mediaDoc({
      filename: 'nincs.webp',
      sizes: { xs: { filename: 'nincs-320.webp' } },
    })
    expect(missingMediaFiles(dir, doc)).toEqual(['nincs.webp', 'nincs-320.webp'])
  })

  /**
   * A `withoutEnlargement: true` miatt kis forrásképnél egy-egy méret-variáns
   * jogosan üres marad — üres `filename` nem számít hiányzó fájlnak.
   */
  it('a ki nem generált méret-variánst nem tekinti hiányzónak', () => {
    const doc = mediaDoc({
      filename: 'megvan.webp',
      sizes: {
        xs: { filename: 'megvan-320.webp' },
        lg: { filename: null },
        og: {},
      },
    })
    expect(missingMediaFiles(dir, doc)).toEqual([])
  })
})
