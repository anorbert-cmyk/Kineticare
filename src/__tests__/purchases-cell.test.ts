/**
 * A Felhasználók admin-lista „Megvásárolt kurzusok" oszlopának és a
 * felhasználó lapján lévő áttekintő panelnek a TISZTA formázó segédei
 * (src/components/admin/purchases-cell.ts).
 *
 * Amit a tesztek védenek:
 *  - a hozzáférés a kurzus CÍMÉVEL jelenik meg, nem a puszta azonosítóval,
 *  - a cím-lánc (displayTitle → sku → „Kurzus #id") EGYEZIK a storefront
 *    `courseTitle` láncával — a két hely nem csúszhat szét,
 *  - hibás/hiányos adat esetén sem omlik el a lista (a cella minden során
 *    valami értelmes marad).
 *
 * MINDEN ADAT KITALÁLT.
 */

import { describe, expect, it } from 'vitest'

import {
  formatCourseLabel,
  formatPurchaseLabels,
  PURCHASES_EMPTY_PLACEHOLDER,
  readProductTitles,
  readPurchaseIds,
} from '../components/admin/purchases-cell'
import { courseTitle } from '../lib/courses'

const titles = new Map<string, string>([
  ['11', 'Otthoni KézRehab Program'],
  ['12', 'SOS Kézrelax villámkurzus'],
])

describe('kurzus-címke', () => {
  it('a kurzus címét használja, ha van', () => {
    expect(formatCourseLabel({ id: 11, sku: 'KEZ-ALAP', displayTitle: 'Otthoni KézRehab' })).toBe(
      'Otthoni KézRehab',
    )
  })

  it('cím híján a sku-t, annak híján az azonosítót írja ki', () => {
    expect(formatCourseLabel({ id: 11, sku: 'KEZ-ALAP' })).toBe('KEZ-ALAP')
    expect(formatCourseLabel({ id: 11, sku: '   ', displayTitle: '  ' })).toBe('Kurzus #11')
    expect(formatCourseLabel({ id: 11 })).toBe('Kurzus #11')
  })

  it('AZONOS a storefront courseTitle láncával (nem csúszhatnak szét)', () => {
    const cases = [
      { id: 11, sku: 'KEZ-ALAP', displayTitle: 'Otthoni KézRehab' },
      { id: 12, sku: 'KEZ-HALADO', displayTitle: '' },
      { id: 13, sku: '', displayTitle: '' },
    ]
    for (const product of cases) {
      expect(formatCourseLabel(product)).toBe(courseTitle(product))
    }
  })
})

describe('hozzáférés-azonosítók olvasása', () => {
  it('nyers azonosítókat olvas (lista-nézet)', () => {
    expect(readPurchaseIds([11, '12'])).toEqual(['11', '12'])
  })

  it('feloldott dokumentumot is olvas (szerkesztő-nézet)', () => {
    expect(readPurchaseIds([{ id: 11, sku: 'KEZ-ALAP' }])).toEqual(['11'])
  })

  it('polimorf kapcsolat-alakot is olvas', () => {
    expect(readPurchaseIds([{ relationTo: 'products', value: 11 }])).toEqual(['11'])
    expect(readPurchaseIds([{ relationTo: 'products', value: { id: 12 } }])).toEqual(['12'])
  })

  it('nem tömb vagy hibás elem esetén nem dob', () => {
    expect(readPurchaseIds(undefined)).toEqual([])
    expect(readPurchaseIds(null)).toEqual([])
    expect(readPurchaseIds('11')).toEqual([])
    expect(readPurchaseIds([null, {}, { id: {} }, 11])).toEqual(['11'])
  })
})

describe('termék-válasz feldolgozása', () => {
  it('azonosító → cím térképet ad', () => {
    const map = readProductTitles({
      docs: [
        { id: 11, sku: 'KEZ-ALAP', displayTitle: 'Otthoni KézRehab Program' },
        { id: 12, sku: 'SOS' },
      ],
    })
    expect(map.get('11')).toBe('Otthoni KézRehab Program')
    expect(map.get('12')).toBe('SOS')
  })

  it('hibás választ üres térképpel nyel el', () => {
    expect(readProductTitles(null).size).toBe(0)
    expect(readProductTitles({ docs: 'nem tömb' }).size).toBe(0)
    expect(readProductTitles({ docs: [null, { sku: 'nincs id' }] }).size).toBe(0)
  })
})

describe('cella-sorok', () => {
  it('a kurzusok címét írja ki, sorrendtartóan', () => {
    expect(formatPurchaseLabels([11, 12], titles)).toEqual([
      'Otthoni KézRehab Program',
      'SOS Kézrelax villámkurzus',
    ])
  })

  it('üres hozzáférés-listára egyetlen helyőrzőt ad', () => {
    expect(formatPurchaseLabels([], titles)).toEqual([PURCHASES_EMPTY_PLACEHOLDER])
    expect(formatPurchaseLabels(undefined, titles)).toEqual([PURCHASES_EMPTY_PLACEHOLDER])
  })

  it('be nem töltött cím esetén az azonosító látszik (a sor sosem tűnik el)', () => {
    expect(formatPurchaseLabels([11, 99], titles)).toEqual([
      'Otthoni KézRehab Program',
      'Kurzus #99',
    ])
    expect(formatPurchaseLabels([11], new Map())).toEqual(['Kurzus #11'])
  })
})
