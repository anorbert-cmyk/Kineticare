import { describe, expect, it } from 'vitest'

import { sanitizeReturnUrl } from '../lib/return-url'

describe('sanitizeReturnUrl (open-redirect védelem)', () => {
  it('érvényes gyökér-relatív útvonal átmegy', () => {
    expect(sanitizeReturnUrl('/kurzusaim', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl('/', '/kurzusaim')).toBe('/')
    expect(sanitizeReturnUrl('/penztar?termek=3', '/kurzusaim')).toBe('/penztar?termek=3')
    expect(sanitizeReturnUrl('  /kurzusaim/12  ', '/kurzusaim')).toBe('/kurzusaim/12')
  })

  it('protokoll-relatív és backslashelos alak → fallback', () => {
    expect(sanitizeReturnUrl('//evil.example', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl('/\\evil.example', '/kurzusaim')).toBe('/kurzusaim')
  })

  it('abszolút URL és egyéb nem gyökér-relatív érték → fallback', () => {
    expect(sanitizeReturnUrl('https://evil.example', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl('http://evil.example/kurzusaim', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl('evil.example', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl('javascript:alert(1)', '/kurzusaim')).toBe('/kurzusaim')
  })

  it('vezérlőkaraktert tartalmazó érték → fallback', () => {
    expect(sanitizeReturnUrl('/kurzusaim\nLocation: https://evil.example', '/kurzusaim')).toBe(
      '/kurzusaim',
    )
    expect(sanitizeReturnUrl('/kurzusaim\t', '/kurzusaim')).toBe('/kurzusaim')
  })

  it('üres és nem-string érték → fallback', () => {
    expect(sanitizeReturnUrl('', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl('   ', '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl(undefined, '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl(null, '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl(42, '/kurzusaim')).toBe('/kurzusaim')
    expect(sanitizeReturnUrl(['/kurzusaim'], '/kurzusaim')).toBe('/kurzusaim')
  })

  it('a fallback paraméterezhető', () => {
    expect(sanitizeReturnUrl('//evil.example', '/')).toBe('/')
    expect(sanitizeReturnUrl(undefined, '/fiok')).toBe('/fiok')
  })
})
