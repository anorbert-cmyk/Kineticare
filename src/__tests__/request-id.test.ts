import { describe, expect, it } from 'vitest'

import {
  generateRequestId,
  getRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
  resolveRequestId,
} from '../lib/request-id'

/**
 * Request-ID segédek tesztjei — a pénzügyi webhookok napló-korrelációjának
 * alapja. A formai szűrő konzervatív: a kliens által küldött fejlécérték csak
 * akkor kerül vissza a naplóba/válaszba, ha a mintán átmegy (log-injekció zár).
 */

describe('isValidRequestId', () => {
  it('elfogadja a konzervatív alakokat', () => {
    expect(isValidRequestId('a')).toBe(true)
    expect(isValidRequestId('req-01_AB.cd-EF')).toBe(true)
    expect(isValidRequestId(crypto.randomUUID())).toBe(true)
    expect(isValidRequestId('x'.repeat(128))).toBe(true)
  })

  it('elutasítja az üreset, a hosszút és a nem-nyomtathatót', () => {
    expect(isValidRequestId('')).toBe(false)
    expect(isValidRequestId('x'.repeat(129))).toBe(false)
    expect(isValidRequestId('rossz szóközzel')).toBe(false)
    expect(isValidRequestId('sor\ntöréssel')).toBe(false)
    expect(isValidRequestId('per/jel')).toBe(false)
  })
})

describe('generateRequestId', () => {
  it('érvényes formátumot ad és egyedi', () => {
    const first = generateRequestId()
    const second = generateRequestId()
    expect(isValidRequestId(first)).toBe(true)
    expect(isValidRequestId(second)).toBe(true)
    expect(first).not.toBe(second)
  })
})

describe('resolveRequestId', () => {
  it('a formailag érvényes bejövő azonosítót megtartja', () => {
    expect(resolveRequestId('meglevo-123')).toBe('meglevo-123')
  })

  it('hiányzó vagy érvénytelen bejövőnél újat generál', () => {
    expect(isValidRequestId(resolveRequestId(null))).toBe(true)
    const regenerated = resolveRequestId('nem érvényes érték')
    expect(regenerated).not.toBe('nem érvényes érték')
    expect(isValidRequestId(regenerated)).toBe(true)
  })
})

describe('getRequestId', () => {
  it('a middleware által beállított érvényes fejlécet adja vissza', () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: 'jo-azonosito' })
    expect(getRequestId(headers)).toBe('jo-azonosito')
  })

  it('hiányzó vagy érvénytelen fejléc esetén undefined', () => {
    expect(getRequestId(new Headers())).toBeUndefined()
    expect(getRequestId(new Headers({ [REQUEST_ID_HEADER]: 'hibás érték' }))).toBeUndefined()
  })
})
