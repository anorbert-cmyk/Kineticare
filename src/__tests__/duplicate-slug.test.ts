import { describe, expect, it } from 'vitest'

import { nextDuplicateSlug, stripDuplicateSuffix } from '../lib/duplicate'

describe('stripDuplicateSuffix', () => {
  it('levágja a -masodpeldany és -masodpeldany-N végződést', () => {
    expect(stripDuplicateSuffix('rolunk-masodpeldany')).toBe('rolunk')
    expect(stripDuplicateSuffix('rolunk-masodpeldany-3')).toBe('rolunk')
  })

  it('más slugot nem bánt', () => {
    expect(stripDuplicateSuffix('rolunk')).toBe('rolunk')
    expect(stripDuplicateSuffix('masodpeldany-utca')).toBe('masodpeldany-utca')
    expect(stripDuplicateSuffix('bolt-masodpeldanyke')).toBe('bolt-masodpeldanyke')
  })
})

describe('nextDuplicateSlug', () => {
  it('első duplikátum: <eredeti>-masodpeldany', () => {
    expect(nextDuplicateSlug('rolunk', ['rolunk'])).toBe('rolunk-masodpeldany')
  })

  it('foglalt esetén sorszámoz: -2, -3…', () => {
    expect(nextDuplicateSlug('rolunk', ['rolunk', 'rolunk-masodpeldany'])).toBe(
      'rolunk-masodpeldany-2',
    )
    expect(
      nextDuplicateSlug('rolunk', ['rolunk', 'rolunk-masodpeldany', 'rolunk-masodpeldany-2']),
    ).toBe('rolunk-masodpeldany-3')
  })

  it('duplikátum duplikálása az eredeti gyökeret használja', () => {
    expect(nextDuplicateSlug('rolunk-masodpeldany', ['rolunk', 'rolunk-masodpeldany'])).toBe(
      'rolunk-masodpeldany-2',
    )
    expect(nextDuplicateSlug('rolunk-masodpeldany-2', ['rolunk', 'rolunk-masodpeldany'])).toBe(
      'rolunk-masodpeldany-2',
    )
  })

  it('lyukas sorszámsorban az első szabad értéket adja', () => {
    expect(nextDuplicateSlug('rolunk', ['rolunk', 'rolunk-masodpeldany-2'])).toBe(
      'rolunk-masodpeldany',
    )
  })

  it('más collection-slugra emlékeztető, de nem egyező neveket figyelmen kívül hagy', () => {
    expect(nextDuplicateSlug('rolunk', ['rolunk-extra', 'masodpeldany'])).toBe('rolunk-masodpeldany')
  })
})
