import { describe, expect, it } from 'vitest'

import { buildMessage, dotStuff, encodeWord } from '../lib/email/smtp'

/**
 * A kézzel írt SMTP-kliens TISZTA szeleteinek tesztjei (socket nélkül).
 *
 * A socketes munkamenet (connect/STARTTLS/AUTH/DATA) hálózat nélkül nem
 * fedezhető egységteszttel — az e2e-staging-runbook feladata. Itt az
 * üzenet-összeállítás és a karakterkódolás a tárgy: a magyar ékezetes
 * tárgy és a DATA-blokk dot-stuffingja a tipikus néma hibaforrás.
 */

describe('encodeWord', () => {
  it('ASCII-t változatlanul hagy', () => {
    expect(encodeWord('Kineticare')).toBe('Kineticare')
  })

  it('nem-ASCII-t RFC 2047 encoded-wordre alakít', () => {
    const encoded = encodeWord('Köszönjük a vásárlást!')
    expect(encoded.startsWith('=?UTF-8?B?')).toBe(true)
    expect(encoded.endsWith('?=')).toBe(true)
    // A base64-rész visszafejtve az eredeti szöveg:
    const base64 = encoded.slice('=?UTF-8?B?'.length, -2)
    expect(Buffer.from(base64, 'base64').toString('utf8')).toBe('Köszönjük a vásárlást!')
  })
})

describe('dotStuff', () => {
  it('a sor-eleji pontot megduplázza (SMTP DATA-lezárás védelme)', () => {
    expect(dotStuff('elso sor\r\n.masodik')).toBe('elso sor\r\n..masodik')
    expect(dotStuff('nincs benne pont')).toBe('nincs benne pont')
  })
})

describe('buildMessage', () => {
  const config = {
    host: 'smtp.example.test',
    port: 587,
    user: 'u',
    pass: 'DUMMY-NEM-VALODI-TITOK',
    from: 'Kineticare Értesítő',
    fromAddress: 'noreply@example.test',
  }

  it('multipart/alternative üzenetet épít base64 text+html résszel', () => {
    const raw = buildMessage(config, {
      to: ['a@example.test', 'b@example.test'],
      subject: 'Rendelés visszaigazolása',
      text: 'Szöveges változat',
      html: '<p>HTML változat</p>',
    })

    expect(raw).toContain('From: =?UTF-8?B?')
    expect(raw).toContain('To: a@example.test, b@example.test')
    expect(raw).toContain('MIME-Version: 1.0')
    expect(raw).toContain('multipart/alternative; boundary=')
    expect(raw).toContain(Buffer.from('Szöveges változat', 'utf8').toString('base64'))
    expect(raw).toContain(Buffer.from('<p>HTML változat</p>', 'utf8').toString('base64'))
    // CRLF-sorvégek mindenhol (SMTP-követelmény): a \r\n-párokat eltávolítva
    // nem maradhat magányos \r vagy \n:
    expect(raw.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/)
  })

  it('a jelszó NEM kerül az üzenetbe', () => {
    const raw = buildMessage(config, {
      to: ['a@example.test'],
      subject: 'Teszt',
      text: 'törzs',
      html: '<b>törzs</b>',
    })
    expect(raw).not.toContain('DUMMY-NEM-VALODI-TITOK')
    expect(raw).not.toContain(config.pass)
  })
})
