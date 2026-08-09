import { describe, expect, it } from 'vitest'

import { sanitizeCmsUrl } from '../lib/safe-url'

/**
 * Sec-review: a CMS-ből érkező href-ek allowlist-szűrése — csak https/http/
 * mailto abszolút URL és gyökér-relatív útvonal renderelhető href-ként.
 */
describe('sanitizeCmsUrl', () => {
  it('https és http abszolút URL engedélyezett', () => {
    expect(sanitizeCmsUrl('https://kineticare.hu/kapcsolat')).toBe(
      'https://kineticare.hu/kapcsolat',
    )
    expect(sanitizeCmsUrl('http://localhost:3000/admin')).toBe('http://localhost:3000/admin')
  })

  it('mailto engedélyezett', () => {
    expect(sanitizeCmsUrl('mailto:hello@kineticare.hu')).toBe('mailto:hello@kineticare.hu')
  })

  it('gyökér-relatív útvonal engedélyezett (whitespace-t trimmel)', () => {
    expect(sanitizeCmsUrl('/kurzusok/12')).toBe('/kurzusok/12')
    expect(sanitizeCmsUrl('  /kapcsolat ')).toBe('/kapcsolat')
  })

  it('lapon belüli horgony engedélyezett (hero/CTA navigáció)', () => {
    expect(sanitizeCmsUrl('#ingyenes')).toBe('#ingyenes')
  })

  it.each([
    ['javascript:alert(1)', 'javascript:alert(1)'],
    ['data URI', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['protokoll-relatív', '//evil.example/phish'],
    ['backslash-trükk', '/\\evil.example'],
    ['sortöréses trükk', '/kapcsolat\njavascript:alert(1)'],
    ['relatív (nem gyökér) útvonal', 'kurzusok/12'],
    ['üres string', ''],
    ['csak whitespace', '   '],
    ['hibás URL', 'https://'],
  ])('tiltott/hibás bemenet null-t ad: %s', (_label, value) => {
    expect(sanitizeCmsUrl(value)).toBeNull()
  })

  it('null/undefined bemenetre null', () => {
    expect(sanitizeCmsUrl(null)).toBeNull()
    expect(sanitizeCmsUrl(undefined)).toBeNull()
  })
})
