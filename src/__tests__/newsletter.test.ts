import { afterEach, describe, expect, it, vi } from 'vitest'

import { newsletterFormData, NEWSLETTER_FORM_TITLE } from '../lib/newsletter/form'
import {
  buildNewsletterPayload,
  FORM_SUBMISSIONS_ENDPOINT,
  isTurnstileEnabled,
  NEWSLETTER_GENERIC_ERROR,
  submitNewsletterForm,
} from '../lib/newsletter/submit'
import {
  EMPTY_NEWSLETTER_VALUES,
  isNewsletterFormValid,
  NEWSLETTER_CONSENT_ERROR,
  NEWSLETTER_CONSENT_FIELD,
  NEWSLETTER_EMAIL_FIELD,
  NEWSLETTER_EMAIL_MAX_LENGTH,
  validateNewsletterForm,
  validateNewsletterSubmissionData,
  type NewsletterFormValues,
} from '../lib/newsletter/validation'

/**
 * C9 — hírlevél-feliratkozás: tiszta validáció + beküldési szerződés.
 *
 * HÁLÓZAT: a modul `fetch`-e injektálható, és a globális `fetch`-et minden
 * teszt előtt hangosan dobó mockra cseréljük (CLAUDE.md 15. tanulság) — így
 * egy elfelejtett injektálás azonnal kiderül, és VALÓDI hívás nem mehet ki.
 */

vi.stubGlobal('fetch', () => {
  throw new Error('A tesztből SOSEM mehet ki valódi hálózati hívás.')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function validValues(overrides: Partial<NewsletterFormValues> = {}): NewsletterFormValues {
  return { email: 'anna@pelda.hu', consentNewsletter: true, ...overrides }
}

describe('validateNewsletterForm (kliens-oldali alak)', () => {
  it('hozzájárulás nélkül blokkolja a feliratkozást', () => {
    const errors = validateNewsletterForm(validValues({ consentNewsletter: false }))
    expect(errors.consentNewsletter).toBe(NEWSLETTER_CONSENT_ERROR)
    expect(isNewsletterFormValid(errors)).toBe(false)
  })

  it('üres űrlapra mindkét kötelező elemre magyar hibaüzenetet ad', () => {
    const errors = validateNewsletterForm(EMPTY_NEWSLETTER_VALUES)
    expect(errors.email).toBeDefined()
    expect(errors.consentNewsletter).toBeDefined()
    expect(isNewsletterFormValid(errors)).toBe(false)
  })

  it('csak whitespace-t tartalmazó címet üresnek vesz', () => {
    const errors = validateNewsletterForm(validValues({ email: '    ' }))
    expect(errors.email).toContain('Add meg')
  })

  it('formailag hibás e-mail-címet visszautasít', () => {
    for (const email of ['nem-email', 'hianyzik@tld', '@pelda.hu', 'szokoz @pelda.hu']) {
      expect(validateNewsletterForm(validValues({ email })).email).toBeDefined()
    }
  })

  it('a túl hosszú e-mail-címet visszautasítja', () => {
    const email = `${'a'.repeat(NEWSLETTER_EMAIL_MAX_LENGTH)}@pelda.hu`
    expect(validateNewsletterForm(validValues({ email })).email).toContain('túl hosszú')
  })

  it('érvényes címre és megadott hozzájárulásra nincs hiba', () => {
    expect(isNewsletterFormValid(validateNewsletterForm(validValues()))).toBe(true)
  })

  it('minden hibaüzenet magyar és tegező', () => {
    const errors = validateNewsletterForm(EMPTY_NEWSLETTER_VALUES)
    for (const message of Object.values(errors)) {
      expect(message).toMatch(/[áéíóöőúüű]/i)
    }
  })
})

describe('validateNewsletterSubmissionData (szerver-oldali alak)', () => {
  const rows = (email: string, consent: string) => [
    { field: NEWSLETTER_EMAIL_FIELD, value: email },
    { field: NEWSLETTER_CONSENT_FIELD, value: consent },
  ]

  it('érvényes sorokra üres hibalistát ad', () => {
    expect(validateNewsletterSubmissionData(rows('anna@pelda.hu', 'true'))).toEqual([])
  })

  it('hozzájárulás nélkül elutasít (közvetlen REST-hívás ellen)', () => {
    expect(validateNewsletterSubmissionData(rows('anna@pelda.hu', 'false'))).toContain(
      NEWSLETTER_CONSENT_ERROR,
    )
  })

  it('hiányzó consent-sorra is elutasít', () => {
    const errors = validateNewsletterSubmissionData([
      { field: NEWSLETTER_EMAIL_FIELD, value: 'anna@pelda.hu' },
    ])
    expect(errors).toContain(NEWSLETTER_CONSENT_ERROR)
  })

  it('nem-tömb és szemét bemenetre is hibát ad, nem dob', () => {
    for (const input of [undefined, null, 'szoveg', 42, {}, [null, 7, { field: 'email' }]]) {
      expect(validateNewsletterSubmissionData(input).length).toBeGreaterThan(0)
    }
  })

  it('a kliens- és a szerver-szabály ugyanazt mondja ugyanarra a bemenetre', () => {
    const clientErrors = validateNewsletterForm({ email: 'nem-email', consentNewsletter: false })
    const serverErrors = validateNewsletterSubmissionData(rows('nem-email', 'false'))
    expect(serverErrors).toEqual(
      expect.arrayContaining([clientErrors.email, clientErrors.consentNewsletter]),
    )
  })
})

describe('buildNewsletterPayload', () => {
  it('a szerződés szerinti két mezőt küldi (email, consentNewsletter)', () => {
    const payload = buildNewsletterPayload(validValues(), '7')
    expect(payload.form).toBe('7')
    expect(payload.submissionData).toEqual([
      { field: 'email', value: 'anna@pelda.hu' },
      { field: 'consentNewsletter', value: 'true' },
    ])
    expect(payload.turnstileToken).toBeUndefined()
  })

  it('trimmeli a címet, és a hozzájárulás hiányát „false" stringként viszi', () => {
    const payload = buildNewsletterPayload(
      validValues({ email: '  anna@pelda.hu ', consentNewsletter: false }),
      '7',
    )
    expect(payload.submissionData[0].value).toBe('anna@pelda.hu')
    expect(payload.submissionData[1].value).toBe('false')
  })

  it('turnstileToken csak akkor kerül a törzsbe, ha van token', () => {
    expect('turnstileToken' in buildNewsletterPayload(validValues(), '7', null)).toBe(false)
    expect(buildNewsletterPayload(validValues(), '7', 'cf-token').turnstileToken).toBe('cf-token')
  })
})

describe('submitNewsletterForm (mockolt API — valódi hálózat nélkül)', () => {
  it('siker-ág: a form-builder végpontra POST-ol JSON törzzsel', async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = []
    const mockFetch = async (input: string, init?: RequestInit) => {
      calls.push({ input, init })
      return new Response(JSON.stringify({ doc: { id: 3 } }), { status: 201 })
    }

    const result = await submitNewsletterForm(
      buildNewsletterPayload(validValues(), '7', 'cf-token'),
      mockFetch,
    )

    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].input).toBe(FORM_SUBMISSIONS_ENDPOINT)
    expect(calls[0].init?.method).toBe('POST')
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>
    expect(body.form).toBe('7')
    expect(body.turnstileToken).toBe('cf-token')
    expect((body.submissionData as Array<{ field: string }>).map((row) => row.field)).toEqual([
      'email',
      'consentNewsletter',
    ])
  })

  it('a szerver magyar hibaüzenetét szó szerint továbbadja (pl. consent-hiba, 400)', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ errors: [{ message: NEWSLETTER_CONSENT_ERROR }] }), {
        status: 400,
      })
    const result = await submitNewsletterForm(buildNewsletterPayload(validValues(), '7'), mockFetch)
    expect(result).toEqual({ ok: false, message: NEWSLETTER_CONSENT_ERROR })
  })

  it('nem JSON hibaválaszra (pl. 500-as proxy-oldal) általános magyar üzenet', async () => {
    const mockFetch = async () => new Response('Internal Server Error', { status: 500 })
    const result = await submitNewsletterForm(buildNewsletterPayload(validValues(), '7'), mockFetch)
    expect(result).toEqual({ ok: false, message: NEWSLETTER_GENERIC_ERROR })
  })

  it('hálózati hibára (a fetch dob) általános magyar üzenet, nem kivétel', async () => {
    const mockFetch = async () => {
      throw new Error('network down')
    }
    const result = await submitNewsletterForm(buildNewsletterPayload(validValues(), '7'), mockFetch)
    expect(result).toEqual({ ok: false, message: NEWSLETTER_GENERIC_ERROR })
  })
})

describe('isTurnstileEnabled (a lábléc widgetje környezetfüggő)', () => {
  it('site key nélkül a widget rejtve marad', () => {
    for (const key of [null, undefined, '', '   ']) {
      expect(isTurnstileEnabled(key)).toBe(false)
    }
  })

  it('beállított site key mellett megjelenhet', () => {
    expect(isTurnstileEnabled('0x4AAAAAA...')).toBe(true)
  })
})

describe('newsletterFormData (a form-builder űrlap ADATA)', () => {
  it('a seed a „Hírlevél" űrlapot e-mail + kötelező hozzájárulás mezővel hozza létre', () => {
    const data = newsletterFormData()
    expect(data.title).toBe(NEWSLETTER_FORM_TITLE)
    const fields = data.fields as Array<Record<string, unknown>>
    expect(fields).toHaveLength(2)
    expect(fields[0]).toMatchObject({
      blockType: 'email',
      name: NEWSLETTER_EMAIL_FIELD,
      required: true,
    })
    expect(fields[1]).toMatchObject({
      blockType: 'checkbox',
      name: NEWSLETTER_CONSENT_FIELD,
      required: true,
    })
  })

  it('a hozzájárulás-felirat az adminban is a teljes jogi szöveg (visszavonhatósággal)', () => {
    const fields = newsletterFormData().fields as Array<Record<string, unknown>>
    expect(String(fields[1].label)).toContain('hírlevelet küldjön')
    expect(String(fields[1].label)).toContain('bármikor visszavonható')
  })

  it('beküldéskor NEM küld automatikus e-mailt (nincs dupla opt-in bekötve)', () => {
    expect(newsletterFormData().emails).toEqual([])
  })
})
