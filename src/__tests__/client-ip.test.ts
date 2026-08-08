import { describe, expect, it } from 'vitest'

import { resolveClientIp } from '../lib/client-ip'

/**
 * A proxyzott kérésekből kinyert kliens-IP unit-tesztjei.
 *
 * A tét: az `x-forwarded-for` TELJES láncának naplózása félrevezető (a saját
 * infrastruktúránk IP-jei is bekerülnek, és ugyanaz a kliens kérésenként más
 * értékkel jelenik meg) — mindig az első, kliens-oldali elem kell, trimmelve.
 */

/** A `Headers` API-jának megfelelő, minimális fejléc-olvasó a fixtúrákhoz. */
const headersOf = (values: Record<string, string>): Headers => new Headers(values)

describe('resolveClientIp', () => {
  it('az x-forwarded-for lánc ELSŐ elemét adja vissza (nem a teljes láncot)', () => {
    const ip = resolveClientIp(
      headersOf({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }),
    )

    expect(ip).toBe('203.0.113.7')
  })

  it('a lánc elemei körüli whitespace-t levágja', () => {
    expect(resolveClientIp(headersOf({ 'x-forwarded-for': '  203.0.113.7 ,70.41.3.18' }))).toBe(
      '203.0.113.7',
    )
  })

  it('egyelemű láncot változatlanul ad vissza', () => {
    expect(resolveClientIp(headersOf({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('IPv6-címet is helyesen ad vissza (a kettőspont nem elválasztó)', () => {
    expect(resolveClientIp(headersOf({ 'x-forwarded-for': '2001:db8::1, 70.41.3.18' }))).toBe(
      '2001:db8::1',
    )
  })

  it('x-forwarded-for hiányában az x-real-ip fejlécre esik vissza', () => {
    expect(resolveClientIp(headersOf({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('az x-forwarded-for elsőbbséget élvez az x-real-ip előtt', () => {
    const ip = resolveClientIp(
      headersOf({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18', 'x-real-ip': '203.0.113.9' }),
    )

    expect(ip).toBe('203.0.113.7')
  })

  it('üres vagy csak whitespace-t tartalmazó x-forwarded-for esetén az x-real-ip jön', () => {
    expect(resolveClientIp(headersOf({ 'x-forwarded-for': '', 'x-real-ip': '203.0.113.9' }))).toBe(
      '203.0.113.9',
    )
    expect(
      resolveClientIp(headersOf({ 'x-forwarded-for': '   ', 'x-real-ip': '203.0.113.9' })),
    ).toBe('203.0.113.9')
  })

  it('csak vesszőkből álló láncnál sem ad vissza üres sztringet', () => {
    expect(resolveClientIp(headersOf({ 'x-forwarded-for': ' , , ' }))).toBeUndefined()
  })

  it('fejléc nélkül undefined (a hívó dönt a helyettesítő értékről)', () => {
    expect(resolveClientIp(headersOf({}))).toBeUndefined()
    expect(resolveClientIp(undefined)).toBeUndefined()
    expect(resolveClientIp(null)).toBeUndefined()
  })

  it('elviseli a `get` metódus nélküli objektumot is (hiányos req-mock)', () => {
    expect(resolveClientIp({})).toBeUndefined()
  })
})
