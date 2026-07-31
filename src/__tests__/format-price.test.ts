import { describe, expect, it } from 'vitest'

import { formatPriceHuf } from '../lib/format-price'

describe('formatPriceHuf', () => {
  it('ezres tagolás + „Ft" végződés (magyar szabvány)', () => {
    expect(formatPriceHuf(19990)).toBe('19 990 Ft')
    expect(formatPriceHuf(0)).toBe('0 Ft')
    expect(formatPriceHuf(999)).toBe('999 Ft')
    expect(formatPriceHuf(1000000)).toBe('1 000 000 Ft')
  })

  it('a tagoló szóköz nem törhető (nbsp), így az ár egy sorban marad', () => {
    expect(formatPriceHuf(19990)).not.toContain(' ')
  })

  it('tört forintot egészre kerekít', () => {
    expect(formatPriceHuf(19990.4)).toBe('19 990 Ft')
  })

  it('nem-szám bemenetre hibát dob', () => {
    expect(() => formatPriceHuf(Number.NaN)).toThrow()
  })
})
