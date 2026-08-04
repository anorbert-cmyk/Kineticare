import { describe, expect, it } from 'vitest'

import { formatPriceHuf } from '../lib/format-price'

// A tagoló- és elválasztószóköz nem-törhető (NBSP) — a forrásban mindig
// '\u00a0' escape-pel írjuk, mert a szerkesztőcsatornák szóközzé lapíthatják.
const NBSP = '\u00a0'

describe('formatPriceHuf', () => {
  it('ezres tagolás + „Ft" végződés (magyar szabvány)', () => {
    expect(formatPriceHuf(19990)).toBe(`19${NBSP}990${NBSP}Ft`)
    expect(formatPriceHuf(0)).toBe(`0${NBSP}Ft`)
    expect(formatPriceHuf(999)).toBe(`999${NBSP}Ft`)
    expect(formatPriceHuf(1000000)).toBe(`1${NBSP}000${NBSP}000${NBSP}Ft`)
  })

  it('a tagoló szóköz nem törhető (nbsp), így az ár egy sorban marad', () => {
    expect(formatPriceHuf(19990)).not.toContain(' ')
  })

  it('tört forintot egészre kerekít', () => {
    expect(formatPriceHuf(19990.4)).toBe(`19${NBSP}990${NBSP}Ft`)
  })

  it('nem-szám bemenetre hibát dob', () => {
    expect(() => formatPriceHuf(Number.NaN)).toThrow()
  })
})
