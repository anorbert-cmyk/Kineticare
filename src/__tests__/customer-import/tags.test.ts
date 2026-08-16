/**
 * A systeme.io CÍMKE-ÉRTELMEZŐ (src/lib/customer-import/tags.ts).
 *
 * A szabályok, amiket a tesztek rögzítenek:
 *  - vásárlás-címke → hozzáférés,
 *  - visszatérítés-címke → a SAJÁT párját kiüti, a sor másik kurzusa marad,
 *  - érdeklődő (előjelentkező) címke → nincs hozzáférés, de nem is hiba,
 *  - ismeretlen címke → figyelmeztetés, a sor feldolgozása folytatódik,
 *  - üres cella → nincs semmi.
 *
 * MINDEN ADAT KITALÁLT — valódi vásárlói adat tesztfixtúrába sem kerülhet.
 */

import { describe, expect, it } from 'vitest'

import {
  buildTagRuleSet,
  classifyTags,
  splitTagCell,
  SYSTEME_TAG_RULES,
} from '../../lib/customer-import/tags'

const rules = buildTagRuleSet().ruleSet

describe('címke-cella felbontása', () => {
  it('vesszővel elválasztott címkéket bont fel, trimmel', () => {
    expect(splitTagCell('SOS KézRelax vásárló, Otthoni KézRehab vásárló')).toEqual([
      'SOS KézRelax vásárló',
      'Otthoni KézRehab vásárló',
    ])
  })

  it('üres cellára üres listát ad, és a duplikátumot kiszűri', () => {
    expect(splitTagCell('')).toEqual([])
    expect(splitTagCell('   ')).toEqual([])
    expect(splitTagCell('Előjelentkezők, előjelentkezők')).toEqual(['Előjelentkezők'])
  })

  it('a `|` és `;` elválasztót is elviseli (más exportok alakja)', () => {
    expect(splitTagCell('A címke|B címke;C címke')).toEqual(['A címke', 'B címke', 'C címke'])
  })
})

describe('címke-besorolás', () => {
  it('vásárlás-címkére hozzáférést ad', () => {
    const result = classifyTags(['SOS KézRelax vásárló'], rules)
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló'])
    expect(result.refundedCourseNames).toEqual([])
    expect(result.unknownTags).toEqual([])
  })

  it('több vásárlás-címkére mindkét hozzáférést megadja', () => {
    const result = classifyTags(
      ['SOS KézRelax vásárló', 'Otthoni KézRehab vásárló'],
      rules,
    )
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló', 'Otthoni KézRehab vásárló'])
  })

  it('a visszatérítés-címke KIÜTI a saját párját', () => {
    const result = classifyTags(
      ['Otthoni KézRehab vásárló', 'Visszatérítés Kézrehab'],
      rules,
    )
    expect(result.courseNames).toEqual([])
    expect(result.refundedCourseNames).toEqual(['Otthoni KézRehab vásárló'])
  })

  it('a visszatérítés csak a saját kurzusát üti ki — a másik hozzáférés megmarad', () => {
    const result = classifyTags(
      ['SOS KézRelax vásárló', 'Otthoni KézRehab vásárló', 'Visszatérítés Kézrehab'],
      rules,
    )
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló'])
    expect(result.refundedCourseNames).toEqual(['Otthoni KézRehab vásárló'])
  })

  it('a címkék SORRENDJE nem számít (a visszatérítés állhat elöl is)', () => {
    const result = classifyTags(
      ['Visszatérítés KézRelax', 'SOS KézRelax vásárló'],
      rules,
    )
    expect(result.courseNames).toEqual([])
    expect(result.refundedCourseNames).toEqual(['SOS KézRelax vásárló'])
  })

  it('az előjelentkező NEM vásárlás — hozzáférés nélkül, de hibátlanul', () => {
    const result = classifyTags(['Előjelentkezők'], rules)
    expect(result.courseNames).toEqual([])
    expect(result.ignoredTags).toEqual(['Előjelentkezők'])
    expect(result.unknownTags).toEqual([])
  })

  it('előjelentkező + vásárlás: a vásárlás jár', () => {
    const result = classifyTags(['Előjelentkezők', 'SOS KézRelax vásárló'], rules)
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló'])
    expect(result.ignoredTags).toEqual(['Előjelentkezők'])
  })

  it('ismeretlen címke: figyelmeztetés, a sor többi címkéje él tovább', () => {
    const result = classifyTags(['Hírlevél feliratkozó', 'SOS KézRelax vásárló'], rules)
    expect(result.unknownTags).toEqual(['Hírlevél feliratkozó'])
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló'])
  })

  it('üres címkelista: minden lista üres', () => {
    const result = classifyTags([], rules)
    expect(result).toEqual({
      courseNames: [],
      refundedCourseNames: [],
      ignoredTags: [],
      unmatchedRefundTags: [],
      unknownTags: [],
    })
  })

  it('párja nélküli visszatérítés-címke figyelmeztetésként jelenik meg', () => {
    const result = classifyTags(['Visszatérítés Kézrehab'], rules)
    expect(result.unmatchedRefundTags).toEqual(['Visszatérítés Kézrehab'])
    expect(result.courseNames).toEqual([])
  })

  it('a kis-/nagybetű és a fölös szóköz nem számít', () => {
    const result = classifyTags(['  sos   kézrelax   VÁSÁRLÓ '], rules)
    // A szabálytábla ÍRÁSMÓDJA megy tovább — így a --map pár egyértelmű.
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló'])
  })

  it('ugyanaz a címke kétszer csak egyszer ad hozzáférést', () => {
    const result = classifyTags(['SOS KézRelax vásárló', 'sos kézrelax vásárló'], rules)
    expect(result.courseNames).toEqual(['SOS KézRelax vásárló'])
  })
})

describe('szabálytábla kiegészítése a CLI-ből', () => {
  it('--ignore-tag: az addig ismeretlen címke nem-vásárlássá válik', () => {
    const { ruleSet, errors } = buildTagRuleSet({ ignoreTags: ['Hírlevél feliratkozó'] })
    expect(errors).toEqual([])
    const result = classifyTags(['Hírlevél feliratkozó'], ruleSet)
    expect(result.unknownTags).toEqual([])
    expect(result.ignoredTags).toEqual(['Hírlevél feliratkozó'])
  })

  it('--refund-tag: új visszatérítés-pár is kiüti a vásárlást', () => {
    const { ruleSet, errors } = buildTagRuleSet({
      refundPairs: ['Sztornó KézRelax=SOS KézRelax vásárló'],
    })
    expect(errors).toEqual([])
    const result = classifyTags(['SOS KézRelax vásárló', 'Sztornó KézRelax'], ruleSet)
    expect(result.courseNames).toEqual([])
    expect(result.refundedCourseNames).toEqual(['SOS KézRelax vásárló'])
  })

  it('hibás kiegészítés magyar hibaüzenetet ad, a beépített tábla marad érvényes', () => {
    const { ruleSet, errors } = buildTagRuleSet({
      ignoreTags: ['  '],
      refundPairs: ['nincs benne egyenlőségjel'],
    })
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('--ignore-tag')
    expect(errors[1]).toContain('--refund-tag')
    expect(classifyTags(['SOS KézRelax vásárló'], ruleSet).courseNames).toEqual([
      'SOS KézRelax vásárló',
    ])
  })
})

describe('beépített szabálytábla', () => {
  it('minden visszatérítés-szabály LÉTEZŐ vásárlás-címkére hivatkozik', () => {
    const purchaseTags = new Set(
      SYSTEME_TAG_RULES.filter((rule) => rule.kind === 'purchase').map((rule) =>
        rule.tag.toLowerCase(),
      ),
    )
    for (const rule of SYSTEME_TAG_RULES) {
      if (rule.kind !== 'refund') {
        continue
      }
      expect(rule.cancels, `${rule.tag} párja hiányzik`).toBeDefined()
      expect(purchaseTags.has((rule.cancels ?? '').toLowerCase())).toBe(true)
    }
  })

  it('nincs két azonos címke a táblában', () => {
    const keys = SYSTEME_TAG_RULES.map((rule) => rule.tag.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
  })
})
