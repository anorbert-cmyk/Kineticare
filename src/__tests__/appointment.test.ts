import { afterEach, describe, expect, it, vi } from 'vitest'

import { APPOINTMENT_CONSENT_LABEL } from '../lib/appointment/consent-text'
import { appointmentFormData, APPOINTMENT_FORM_TITLE } from '../lib/appointment/form'
import {
  APPOINTMENT_BLOCK_TYPE,
  EMPTY_APPOINTMENT_CONTEXT,
  layoutHasAppointmentBlock,
} from '../lib/appointment/context'
import {
  APPOINTMENT_ENDPOINT,
  APPOINTMENT_GENERIC_ERROR,
  buildAppointmentPayload,
  isTurnstileEnabled,
  submitAppointmentForm,
} from '../lib/appointment/submit'
import {
  APPOINTMENT_AVAILABILITY_FIELD,
  APPOINTMENT_AVAILABILITY_INVALID_ERROR,
  APPOINTMENT_CONSENT_ERROR,
  APPOINTMENT_CONSENT_FIELD,
  APPOINTMENT_EMAIL_FIELD,
  APPOINTMENT_EMAIL_FORMAT_ERROR,
  APPOINTMENT_NAME_FIELD,
  APPOINTMENT_NAME_REQUIRED_ERROR,
  APPOINTMENT_PHONE_FIELD,
  APPOINTMENT_PHONE_FORMAT_ERROR,
  APPOINTMENT_PHONE_REQUIRED_ERROR,
  APPOINTMENT_REASON_FIELD,
  APPOINTMENT_REASON_MAX_LENGTH,
  APPOINTMENT_REASON_TOO_LONG_ERROR,
  EMPTY_APPOINTMENT_VALUES,
  isAppointmentFormValid,
  validateAppointmentForm,
  validateAppointmentSubmissionData,
  type AppointmentFormValues,
} from '../lib/appointment/validation'
import { appointmentStaffEmail } from '../lib/email/templates/appointment'

/**
 * Időpontkérés — a tiszta modulok (validáció, beküldés, űrlap-adat, értesítő)
 * tesztjei. DOM nélkül futnak, a `fetch` mindig injektált vagy hangosan dobó
 * mock (CLAUDE.md 15. tanulság: tesztből valódi hálózati hívás nem mehet).
 *
 * A megjelenítés és az akadálymentességi szerződés külön fájlban:
 * src/__tests__/appointment-block.test.tsx.
 */

vi.stubGlobal('fetch', () => {
  throw new Error('A tesztből SOSEM mehet ki valódi hálózati hívás.')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Érvényes alapérték; a tesztek ezt rontják el egy-egy mezőn. */
const ERVENYES: AppointmentFormValues = {
  name: 'Teszt Elek',
  phone: '+36 30 123 4567',
  email: '',
  reason: '',
  availability: [],
  consentHealth: true,
}

// ---------------------------------------------------------------------------
// Kliensoldali validáció
// ---------------------------------------------------------------------------

describe('validateAppointmentForm — a KÖTELEZŐ mezők köre', () => {
  it('a legkevesebb kötelező adat: név, telefon és hozzájárulás', () => {
    expect(isAppointmentFormValid(validateAppointmentForm(ERVENYES))).toBe(true)
  })

  it('üres űrlapon PONTOSAN három hiba jön: név, telefon, hozzájárulás', () => {
    const errors = validateAppointmentForm(EMPTY_APPOINTMENT_VALUES)
    expect(Object.keys(errors).sort()).toEqual(['consentHealth', 'name', 'phone'])
    expect(errors.name).toBe(APPOINTMENT_NAME_REQUIRED_ERROR)
    expect(errors.phone).toBe(APPOINTMENT_PHONE_REQUIRED_ERROR)
    expect(errors.consentHealth).toBe(APPOINTMENT_CONSENT_ERROR)
  })

  it('az e-mail-cím, a panasz és az időpont-sáv NEM kötelező', () => {
    const errors = validateAppointmentForm({
      ...ERVENYES,
      email: '',
      reason: '',
      availability: [],
    })
    expect(errors.email).toBeUndefined()
    expect(errors.reason).toBeUndefined()
    expect(errors.availability).toBeUndefined()
  })

  it('a hozzájárulás hiánya blokkol (GDPR 9. cikk (2) a): kifejezett hozzájárulás)', () => {
    const errors = validateAppointmentForm({ ...ERVENYES, consentHealth: false })
    expect(errors.consentHealth).toBe(APPOINTMENT_CONSENT_ERROR)
    expect(isAppointmentFormValid(errors)).toBe(false)
  })
})

describe('validateAppointmentForm — mezőnkénti szabályok', () => {
  it.each([
    ['tagolt magyar mobilszám', '+36 30 123 4567'],
    ['tagolatlan', '06301234567'],
    ['zárójeles, kötőjeles', '(06) 30/123-4567'],
  ])('elfogadja a telefonszámot: %s', (_cimke, phone) => {
    expect(validateAppointmentForm({ ...ERVENYES, phone }).phone).toBeUndefined()
  })

  it.each([
    ['túl kevés számjegy', '12345'],
    ['csak szöveg', 'hívj fel'],
    ['túl sok számjegy (E.164 felett)', '+3630123456789012'],
  ])('elutasítja a telefonszámot: %s', (_cimke, phone) => {
    expect(validateAppointmentForm({ ...ERVENYES, phone }).phone).toBe(
      APPOINTMENT_PHONE_FORMAT_ERROR,
    )
  })

  it('a megadott e-mail-címet formailag ellenőrzi, az üreset átengedi', () => {
    expect(validateAppointmentForm({ ...ERVENYES, email: 'nem-email' }).email).toBe(
      APPOINTMENT_EMAIL_FORMAT_ERROR,
    )
    expect(validateAppointmentForm({ ...ERVENYES, email: 'a@b.hu' }).email).toBeUndefined()
    expect(validateAppointmentForm({ ...ERVENYES, email: '   ' }).email).toBeUndefined()
  })

  it('a panasz-leírás felső hossza korlátozott (adattakarékosság)', () => {
    const hatarOn = 'a'.repeat(APPOINTMENT_REASON_MAX_LENGTH)
    expect(validateAppointmentForm({ ...ERVENYES, reason: hatarOn }).reason).toBeUndefined()
    expect(
      validateAppointmentForm({ ...ERVENYES, reason: `${hatarOn}b` }).reason,
    ).toBe(APPOINTMENT_REASON_TOO_LONG_ERROR)
  })

  it('az időpont-sávok darabszáma és soronkénti hossza korlátozott', () => {
    expect(
      validateAppointmentForm({ ...ERVENYES, availability: ['a', 'b', 'c', 'd', 'e', 'f'] })
        .availability,
    ).toBeUndefined()
    expect(
      validateAppointmentForm({ ...ERVENYES, availability: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })
        .availability,
    ).toBe(APPOINTMENT_AVAILABILITY_INVALID_ERROR)
    expect(
      validateAppointmentForm({ ...ERVENYES, availability: ['x'.repeat(61)] }).availability,
    ).toBe(APPOINTMENT_AVAILABILITY_INVALID_ERROR)
  })

  it('a hibaüzenetek megmondják, mit tegyen a látogató (NN/g hibaüzenet-szabály)', () => {
    // Nem stílus-kérdés: a „Kötelező mező" típusú üzenet nem visz előrébb.
    expect(APPOINTMENT_NAME_REQUIRED_ERROR).toContain('Add meg')
    expect(APPOINTMENT_PHONE_REQUIRED_ERROR).toContain('Add meg')
    expect(APPOINTMENT_PHONE_FORMAT_ERROR).toContain('Ellenőrizd')
    expect(APPOINTMENT_EMAIL_FORMAT_ERROR).toContain('vagy hagyd üresen')
  })
})

// ---------------------------------------------------------------------------
// Szerveroldali validáció (a nyilvános végpont autoritása)
// ---------------------------------------------------------------------------

describe('validateAppointmentSubmissionData — a szerver ugyanazt kéri', () => {
  const sorok = (values: Record<string, string>) =>
    Object.entries(values).map(([field, value]) => ({ field, value }))

  it('érvényes beküldésre üres hibalistát ad', () => {
    expect(
      validateAppointmentSubmissionData(
        sorok({
          [APPOINTMENT_NAME_FIELD]: 'Teszt Elek',
          [APPOINTMENT_PHONE_FIELD]: '+36 30 123 4567',
          [APPOINTMENT_CONSENT_FIELD]: 'true',
        }),
      ),
    ).toEqual([])
  })

  it('hozzájárulás NÉLKÜL elutasít (közvetlen REST-hívás ellen)', () => {
    expect(
      validateAppointmentSubmissionData(
        sorok({
          [APPOINTMENT_NAME_FIELD]: 'Teszt Elek',
          [APPOINTMENT_PHONE_FIELD]: '+36 30 123 4567',
          [APPOINTMENT_CONSENT_FIELD]: 'false',
        }),
      ),
    ).toContain(APPOINTMENT_CONSENT_ERROR)
  })

  it('teljesen üres törzsre a három kötelező hibát adja', () => {
    expect(validateAppointmentSubmissionData(undefined)).toEqual([
      APPOINTMENT_NAME_REQUIRED_ERROR,
      APPOINTMENT_PHONE_REQUIRED_ERROR,
      APPOINTMENT_CONSENT_ERROR,
    ])
  })

  it('a vesszővel összefűzött időpont-sávokat visszabontva ellenőrzi', () => {
    const alap = {
      [APPOINTMENT_NAME_FIELD]: 'Teszt Elek',
      [APPOINTMENT_PHONE_FIELD]: '+36 30 123 4567',
      [APPOINTMENT_CONSENT_FIELD]: 'true',
    }
    expect(
      validateAppointmentSubmissionData(
        sorok({ ...alap, [APPOINTMENT_AVAILABILITY_FIELD]: 'Délelőtt, Délután' }),
      ),
    ).toEqual([])
    expect(
      validateAppointmentSubmissionData(
        sorok({ ...alap, [APPOINTMENT_AVAILABILITY_FIELD]: 'a, b, c, d, e, f, g' }),
      ),
    ).toContain(APPOINTMENT_AVAILABILITY_INVALID_ERROR)
  })

  it('a túl hosszú panasz-leírást a szerver is elutasítja', () => {
    expect(
      validateAppointmentSubmissionData(
        sorok({
          [APPOINTMENT_NAME_FIELD]: 'Teszt Elek',
          [APPOINTMENT_PHONE_FIELD]: '+36 30 123 4567',
          [APPOINTMENT_REASON_FIELD]: 'a'.repeat(APPOINTMENT_REASON_MAX_LENGTH + 1),
          [APPOINTMENT_CONSENT_FIELD]: 'true',
        }),
      ),
    ).toContain(APPOINTMENT_REASON_TOO_LONG_ERROR)
  })

  it('nem-tömb és nem-string értékekre sem dob (a végponton bármi érkezhet)', () => {
    expect(() => validateAppointmentSubmissionData('nem tömb')).not.toThrow()
    expect(() => validateAppointmentSubmissionData([{ field: 'name', value: 42 }])).not.toThrow()
    expect(validateAppointmentSubmissionData([null, 3, { nincs: 'mező' }]).length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Beküldés
// ---------------------------------------------------------------------------

describe('buildAppointmentPayload', () => {
  it('a MEGLÉVŐ form-submissions szerződést építi (nincs párhuzamos út)', () => {
    const payload = buildAppointmentPayload(
      {
        name: '  Teszt Elek ',
        phone: ' +36 30 123 4567 ',
        email: ' a@b.hu ',
        reason: '  fáj a csuklóm ',
        availability: ['Délelőtt', ' Délután ', '   '],
        consentHealth: true,
      },
      '42',
    )
    expect(payload.form).toBe('42')
    expect(payload.submissionData).toEqual([
      { field: 'name', value: 'Teszt Elek' },
      { field: 'phone', value: '+36 30 123 4567' },
      { field: 'email', value: 'a@b.hu' },
      { field: 'reason', value: 'fáj a csuklóm' },
      { field: 'availability', value: 'Délelőtt, Délután' },
      { field: 'consentHealth', value: 'true' },
    ])
    expect(payload.turnstileToken).toBeUndefined()
  })

  it('a hozzájárulás „false"-ként megy fel, ha nincs bepipálva', () => {
    const payload = buildAppointmentPayload({ ...ERVENYES, consentHealth: false }, '1')
    expect(payload.submissionData).toContainEqual({ field: 'consentHealth', value: 'false' })
  })

  it('a Turnstile-tokent csak akkor teszi be, ha van', () => {
    expect(buildAppointmentPayload(ERVENYES, '1', 'tok').turnstileToken).toBe('tok')
    expect(buildAppointmentPayload(ERVENYES, '1', '').turnstileToken).toBeUndefined()
    expect(buildAppointmentPayload(ERVENYES, '1', null).turnstileToken).toBeUndefined()
  })
})

describe('submitAppointmentForm (mockolt API)', () => {
  it('a plugin nyilvános végpontjára POST-ol JSON-nel', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchMock = async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(null, { status: 201 })
    }
    const result = await submitAppointmentForm(buildAppointmentPayload(ERVENYES, '42'), fetchMock)

    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(APPOINTMENT_ENDPOINT)
    expect(calls[0].init?.method).toBe('POST')
  })

  it('a szerver MAGYAR hibaüzenetét mutatja tovább (pl. Turnstile-hiba)', async () => {
    // A fixtúra a VALÓDI szerződés (`src/payload.config.ts` form-builder hook):
    // a korábbi „A spam-ellenőrzés (Turnstile) sikertelen." szöveget az A/9 kör
    // már átírta, tehát ez a mock elavult mondatot mért.
    const szerverUzenet =
      'A spam-ellenőrzés nem sikerült. Frissítsd az oldalt, és küldd el újra az űrlapot.'
    const fetchMock = async () =>
      new Response(JSON.stringify({ errors: [{ message: szerverUzenet }] }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    const result = await submitAppointmentForm(buildAppointmentPayload(ERVENYES, '42'), fetchMock)
    expect(result).toEqual({ ok: false, message: szerverUzenet })
  })

  it('hálózati hibánál általános, magyar üzenetet ad (nem dob)', async () => {
    const fetchMock = async () => {
      throw new Error('network down')
    }
    const result = await submitAppointmentForm(buildAppointmentPayload(ERVENYES, '42'), fetchMock)
    expect(result).toEqual({ ok: false, message: APPOINTMENT_GENERIC_ERROR })
    // A hibaüzenet felkínálja a MÁSIK utat is (a lap ne legyen zsákutca).
    expect(APPOINTMENT_GENERIC_ERROR).toContain('telefonon')
  })
})

describe('isTurnstileEnabled', () => {
  it('csak nem üres site key mellett engedi a widgetet', () => {
    expect(isTurnstileEnabled('0xKULCS')).toBe(true)
    expect(isTurnstileEnabled('   ')).toBe(false)
    expect(isTurnstileEnabled(null)).toBe(false)
    expect(isTurnstileEnabled(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// A form-builder űrlap ADATA
// ---------------------------------------------------------------------------

describe('appointmentFormData (a form-builder űrlap ADATA)', () => {
  const data = appointmentFormData()

  it('a címe a szerződés része (ebből azonosítja a szerver a sémát)', () => {
    expect(data.title).toBe(APPOINTMENT_FORM_TITLE)
    expect(APPOINTMENT_FORM_TITLE).toBe('Időpontkérés')
  })

  it('a mezőnevek megegyeznek a kliens beküldési szerződésével', () => {
    const fields = data.fields as Array<Record<string, unknown>>
    expect(fields.map((field) => field.name)).toEqual([
      APPOINTMENT_NAME_FIELD,
      APPOINTMENT_PHONE_FIELD,
      APPOINTMENT_EMAIL_FIELD,
      APPOINTMENT_REASON_FIELD,
      APPOINTMENT_AVAILABILITY_FIELD,
      APPOINTMENT_CONSENT_FIELD,
    ])
  })

  it('csak a név, a telefon és a hozzájárulás kötelező', () => {
    const fields = data.fields as Array<Record<string, unknown>>
    const kotelezo = fields.filter((field) => field.required === true).map((field) => field.name)
    expect(kotelezo).toEqual([
      APPOINTMENT_NAME_FIELD,
      APPOINTMENT_PHONE_FIELD,
      APPOINTMENT_CONSENT_FIELD,
    ])
  })

  it('a hozzájárulás admin-felirata a JOGI szöveg (link nélküli változat)', () => {
    const fields = data.fields as Array<Record<string, unknown>>
    const consent = fields.find((field) => field.name === APPOINTMENT_CONSENT_FIELD)
    expect(consent?.label).toBe(APPOINTMENT_CONSENT_LABEL)
    expect(APPOINTMENT_CONSENT_LABEL).toContain('egészségügyi adatokat')
  })

  it('a plugin NEM küld automatikus levelet (a stáb-értesítő a saját hookban van)', () => {
    expect(data.emails).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Szekció-környezet (lekérdezés-takarékosság)
// ---------------------------------------------------------------------------

describe('layoutHasAppointmentBlock', () => {
  it('csak akkor igaz, ha tényleg van időpontkérő szekció a lapon', () => {
    expect(layoutHasAppointmentBlock([{ blockType: 'faq' }, { blockType: 'accordion' }])).toBe(false)
    expect(layoutHasAppointmentBlock([{ blockType: APPOINTMENT_BLOCK_TYPE }])).toBe(true)
    expect(layoutHasAppointmentBlock(null)).toBe(false)
    expect(layoutHasAppointmentBlock(undefined)).toBe(false)
    expect(layoutHasAppointmentBlock([])).toBe(false)
  })

  it('az alapállapot űrlap és spam-ellenőrzés nélküli', () => {
    expect(EMPTY_APPOINTMENT_CONTEXT).toEqual({ formId: null, turnstileSiteKey: null })
  })
})

// ---------------------------------------------------------------------------
// Stáb-értesítő
// ---------------------------------------------------------------------------

describe('appointmentStaffEmail', () => {
  it('a tárgyban a NÉV és a TELEFONSZÁM áll (a munkafolyamat a visszahívás)', () => {
    const mail = appointmentStaffEmail({
      name: 'Teszt Elek',
      phone: '+36 30 123 4567',
      email: '',
      availability: 'Hétköznap délelőtt',
      reason: '',
      submittedAt: '2026. 08. 16. 10:00',
    })
    expect(mail.subject).toBe('Új időpontkérés: Teszt Elek (+36 30 123 4567)')
    expect(mail.html).toContain('+36 30 123 4567')
    expect(mail.text).toContain('Mikor alkalmas: Hétköznap délelőtt')
  })

  it('az üres mezők kimaradnak (nem megy ki üres „E-mail:" fejléc)', () => {
    const mail = appointmentStaffEmail({
      name: 'Teszt Elek',
      phone: '+36 30 123 4567',
      email: '   ',
      availability: '',
      reason: '',
      submittedAt: '2026. 08. 16. 10:00',
    })
    expect(mail.text).not.toContain('E-mail:')
    expect(mail.text).not.toContain('Mikor alkalmas:')
    expect(mail.text).not.toContain('Mire kér időpontot')
  })

  it('a panasz-leírás HTML-je escape-elt (a beküldés nyilvános végpontról jön)', () => {
    const mail = appointmentStaffEmail({
      name: 'Teszt Elek',
      phone: '+36 30 123 4567',
      email: 'a@b.hu',
      availability: '',
      reason: '<img src=x onerror=alert(1)>',
      submittedAt: '2026. 08. 16. 10:00',
    })
    expect(mail.html).not.toContain('<img src=x')
    expect(mail.html).toContain('&lt;img')
  })
})
