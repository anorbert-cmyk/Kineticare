import { describe, expect, it } from 'vitest'

import { LEGACY_MODULE_TITLE } from '../lib/curriculum/curriculum'
import { parseKapcsolok, videokLeckekke } from '../scripts/videok-modulba'
import type { Product } from '../payload-types'

/**
 * A videó→modul átemelő script TISZTA segédfüggvényei.
 *
 * A legfontosabb asszertálandó szabály: az AZONOSÍTÓ MEGŐRZÉSE. Enélkül a
 * `course-progress` sorok némán orphanné válnának, és MINDEN vásárló haladása
 * nullázódna — hibaüzenet nélkül. Ez a teszt az őre.
 */

function video(input: Partial<NonNullable<Product['videos']>[number]>): NonNullable<Product['videos']>[number] {
  return {
    id: null,
    title: null,
    streamAssetId: null,
    durationSec: null,
    status: null,
    ...input,
  }
}

describe('videokLeckekke — az azonosító megőrzése', () => {
  it('a lecke MEGTARTJA a videó-sor azonosítóját (ez a script lényege)', () => {
    const lessons = videokLeckekke([
      video({ id: '6a8023fc6542ba2307569974', title: 'Első', streamAssetId: 'g1', status: 'ready', durationSec: 60 }),
      video({ id: '6a8023fc6542ba2307569975', title: 'Második', streamAssetId: 'g2', status: 'ready' }),
    ])

    expect(lessons.map((l) => l.id)).toEqual([
      '6a8023fc6542ba2307569974',
      '6a8023fc6542ba2307569975',
    ])
  })

  it('minden lecke videó típusú, és átveszi a videó mezőit', () => {
    const [lesson] = videokLeckekke([
      video({ id: 'a1', title: 'Bemelegítés', streamAssetId: 'guid-1', durationSec: 213, status: 'ready' }),
    ])

    expect(lesson).toMatchObject({
      id: 'a1',
      title: 'Bemelegítés',
      kind: 'video',
      streamAssetId: 'guid-1',
      durationSec: 213,
      status: 'ready',
    })
  })

  it('cím nélküli videó sorszámozott tartaléknevet kap', () => {
    const lessons = videokLeckekke([video({ id: 'a1' }), video({ id: 'a2' })])
    expect(lessons.map((l) => l.title)).toEqual(['1. rész', '2. rész'])
  })

  it('hiányzó állapot esetén „processing" (a szigorúbb ág — nem lesz belőle véletlenül lejátszható)', () => {
    const [lesson] = videokLeckekke([video({ id: 'a1' })])
    expect(lesson.status).toBe('processing')
  })

  it('azonosító nélküli sor `undefined` id-t kap, hogy a Payload generáljon újat', () => {
    const [lesson] = videokLeckekke([video({ title: 'Nincs azonosítója' })])
    expect(lesson.id).toBeUndefined()
  })

  it('üres lista → üres eredmény', () => {
    expect(videokLeckekke([])).toEqual([])
  })
})

describe('parseKapcsolok', () => {
  it('kiolvassa az azonosítót, a skut és a modulcímet', () => {
    expect(parseKapcsolok(['--id=42', '--sku=ABC-1', '--cim=1. ALAPOK'])).toEqual({
      id: 42,
      sku: 'ABC-1',
      cim: '1. ALAPOK',
      alkalmaz: false,
    })
  })

  it('alapértelmezésben SZÁRAZ futás — az írás külön kapcsolót igényel', () => {
    expect(parseKapcsolok(['--id=1']).alkalmaz).toBe(false)
    expect(parseKapcsolok(['--id=1', '--alkalmaz']).alkalmaz).toBe(true)
  })

  it('a modulcím alapértelmezése a közös, régi-lista címke', () => {
    expect(parseKapcsolok(['--id=1']).cim).toBe(LEGACY_MODULE_TITLE)
  })

  it('nem numerikus és üres azonosítót elutasít', () => {
    expect(parseKapcsolok(['--id=abc']).id).toBeNull()
    expect(parseKapcsolok(['--id=']).id).toBeNull()
    expect(parseKapcsolok([]).id).toBeNull()
  })

  it('üres sku üresen nem számít megadottnak', () => {
    expect(parseKapcsolok(['--sku=   ']).sku).toBeNull()
  })
})
