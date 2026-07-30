import { describe, expect, it } from 'vitest'

import { maskEmail, parseFromAddress } from '../lib/email/mask'
import { resolveEmailProvider, sendMail } from '../lib/email/provider'
import {
  contactStaffEmail,
  resetPasswordEmail,
  verifyEmail,
  welcomeEmail,
} from '../lib/email/templates/auth'
import { escapeHtml, renderLayout } from '../lib/email/templates/layout'

describe('resolveEmailProvider', () => {
  it('RESEND_API_KEY elsőbbséget élvez', () => {
    const provider = resolveEmailProvider({
      RESEND_API_KEY: 're_xxx',
      SMTP_HOST: 'smtp.example.com',
    })
    expect(provider.name).toBe('resend')
  })

  it('SMTP_HOST esetén smtp, port-fallback 587', () => {
    const provider = resolveEmailProvider({ SMTP_HOST: 'smtp.example.com' })
    expect(provider).toMatchObject({ name: 'smtp', smtp: { host: 'smtp.example.com', port: 587 } })
  })

  it('env nélkül noop-provider (sosem crashel)', () => {
    expect(resolveEmailProvider({}).name).toBe('noop')
  })
})

describe('sendMail noop-providerrel', () => {
  it('e-mail env-k nélkül is sikeres (noop), nem dob hibát', async () => {
    const result = await sendMail({
      to: 'valaki@example.com',
      subject: 'Teszt',
      html: '<p>Szia</p>',
      text: 'Szia',
    })
    expect(result).toMatchObject({ ok: true, provider: 'noop' })
  })

  it('üres címzettlista esetén ok:false, retryable:false, szintén hiba nélkül', async () => {
    const result = await sendMail({ to: [], subject: 'T', html: '', text: '' })
    expect(result).toMatchObject({ ok: false, retryable: false })
  })
})

describe('maskEmail / parseFromAddress', () => {
  it('a címzett maszkolva kerülne a logba', () => {
    expect(maskEmail('kiss.anna@example.com')).toBe('k***@example.com')
    expect(maskEmail('a@b.hu')).toBe('a***@b.hu')
    expect(maskEmail('nincs-kukac')).toBe('***')
  })

  it('"Név <cím>" és puszta cím formátumot is felold', () => {
    expect(parseFromAddress('Kineticare <hello@kineticare.hu>')).toEqual({
      name: 'Kineticare',
      address: 'hello@kineticare.hu',
    })
    expect(parseFromAddress('hello@kineticare.hu')).toEqual({
      name: 'Kineticare',
      address: 'hello@kineticare.hu',
    })
    expect(parseFromAddress(undefined)).toEqual({
      name: 'Kineticare',
      address: 'noreply@localhost',
    })
  })
})

describe('e-mail sablonok (magyar, HTML + plain-text)', () => {
  it('welcome: magyar tárgy, névvel, CTA-val, text-változattal', () => {
    const email = welcomeEmail({ name: 'Kiss Anna', loginUrl: 'https://pelda.hu/belepes' })
    expect(email.subject).toBe('Üdvözöl a Kineticare!')
    expect(email.html).toContain('Kedves Kiss Anna!')
    expect(email.html).toContain('https://pelda.hu/belepes')
    expect(email.text).toContain('Kedves Kiss Anna!')
    expect(email.text).toContain('https://pelda.hu/belepes')
  })

  it('reset: visszaállító linkkel, figyelmeztetéssel', () => {
    const email = resetPasswordEmail({
      name: null,
      resetUrl: 'https://pelda.hu/admin/reset/tok123',
    })
    expect(email.subject).toBe('Jelszó visszaállítása')
    expect(email.html).toContain('https://pelda.hu/admin/reset/tok123')
    expect(email.html).toContain('Ha nem te kérted')
    expect(email.text).toContain('tok123')
  })

  it('verify: megerősítő linkkel', () => {
    const email = verifyEmail({ verifyUrl: 'https://pelda.hu/admin/verify/abc' })
    expect(email.subject).toBe('Erősítsd meg az e-mail-címed')
    expect(email.html).toContain('https://pelda.hu/admin/verify/abc')
  })

  it('contact-staff: beküldő adataival, HTML-escape-elt üzenettel', () => {
    const email = contactStaffEmail({
      name: 'Teszt Elek',
      email: 'teszt@example.com',
      message: '<script>alert(1)</script>\nÜdv, érdeklődnék.',
      submittedAt: '2026-07-30 12:00',
    })
    expect(email.subject).toBe('Új kapcsolatfelvétel: Teszt Elek')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.text).toContain('teszt@example.com')
  })

  it('a váz mindig ad plain-text változatot és automatikus-üzenet láblécet', () => {
    const layout = renderLayout({ heading: 'Cím', paragraphsHtml: ['x'], paragraphsText: ['x'] })
    expect(layout.text).toContain('automatikus üzenet')
    expect(escapeHtml('<b>"i"</b>')).toBe('&lt;b&gt;&quot;i&quot;&lt;/b&gt;')
  })
})
