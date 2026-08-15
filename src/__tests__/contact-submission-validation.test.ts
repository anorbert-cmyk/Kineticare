import { APIError, type CollectionBeforeValidateHook } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  CONTACT_MESSAGE_MIN_LENGTH,
  validateContactSubmissionData,
} from '../lib/contact-submission'
import configPromise from '../payload.config'

/**
 * K2: a kapcsolat-űrlap (T-016) SZERVER-oldali validációjának tesztjei.
 *
 * A form-builder plugin a submissionData sorokat ellenőrzés nélkül tárolja,
 * ezért a kötelező mezőket és a consentPrivacy hozzájárulást a saját
 * beforeValidate hookunk érvényesíti (src/payload.config.ts →
 * validateContactSubmission, a szabályok: src/lib/contact-submission.ts).
 * A tesztek DB és hálózat nélkül futnak: a validátor tiszta függvény, a
 * bekötést pedig a végleges configból kiszedett hook közvetlen hívásával
 * mérjük (a lánc Turnstile-tagja NEM fut — nincs külső hívás).
 */

/** Érvényes submissionData — a kliens buildSubmissionPayload kimenetének alakja. */
function validSubmissionData(
  overrides: Record<string, string> = {},
): Array<{ field: string; value: string }> {
  const values: Record<string, string> = {
    name: 'Kovács Anna',
    email: 'anna@pelda.hu',
    subject: 'Kérdés a kurzusról',
    message: 'Érdeklődnék a kézrehabilitációs program részleteiről.',
    consentPrivacy: 'true',
    ...overrides,
  }
  return Object.entries(values).map(([field, value]) => ({ field, value }))
}

describe('validateContactSubmissionData (tiszta validátor)', () => {
  it('érvényes beküldésre nincs hiba', () => {
    expect(validateContactSubmissionData(validSubmissionData())).toEqual([])
  })

  it('hiányzó/üres submissionData-ra minden kötelező mezőre magyar hibát ad', () => {
    for (const input of [undefined, null, [], 'nem-tömb']) {
      const errors = validateContactSubmissionData(input)
      expect(errors).toHaveLength(5)
      expect(errors.some((message) => message.includes('neved'))).toBe(true)
      expect(errors.some((message) => message.includes('e-mail'))).toBe(true)
      expect(errors.some((message) => message.includes('tárgy'))).toBe(true)
      expect(errors.some((message) => message.includes('üzeneted'))).toBe(true)
      expect(errors.some((message) => message.includes('hozzájárulás'))).toBe(true)
    }
  })

  it('csak whitespace-s kitöltést is hibának vesz', () => {
    const errors = validateContactSubmissionData(
      validSubmissionData({ name: '   ', subject: '  ', message: '      ' }),
    )
    expect(errors.some((message) => message.includes('neved'))).toBe(true)
    expect(errors.some((message) => message.includes('tárgy'))).toBe(true)
    expect(errors.some((message) => message.includes('üzeneted'))).toBe(true)
  })

  it('formailag hibás e-mail-címet visszautasít', () => {
    for (const email of ['nem-email', 'hianyzik@tld', '@pelda.hu', 'szokoz @pelda.hu']) {
      const errors = validateContactSubmissionData(validSubmissionData({ email }))
      expect(errors.some((message) => message.includes('Érvényes e-mail'))).toBe(true)
    }
  })

  it(`a ${CONTACT_MESSAGE_MIN_LENGTH} karakternél rövidebb üzenetet visszautasít`, () => {
    const errors = validateContactSubmissionData(validSubmissionData({ message: 'rövid' }))
    expect(errors.some((message) => message.includes(String(CONTACT_MESSAGE_MIN_LENGTH)))).toBe(
      true,
    )
  })

  it('a consentPrivacy kizárólag „true" stringként fogadható el', () => {
    for (const consentPrivacy of ['false', '', 'igen', '1']) {
      const errors = validateContactSubmissionData(validSubmissionData({ consentPrivacy }))
      expect(errors.some((message) => message.includes('hozzájárulás'))).toBe(true)
    }
    // A hiányzó consent-sor is elutasításra kerül.
    const withoutConsent = validSubmissionData().filter((entry) => entry.field !== 'consentPrivacy')
    expect(
      validateContactSubmissionData(withoutConsent).some((message) =>
        message.includes('hozzájárulás'),
      ),
    ).toBe(true)
  })

  it('a nem-string értékű sorokat üresnek kezeli (a nyilvános végponton bármi érkezhet)', () => {
    const errors = validateContactSubmissionData([{ field: 'name', value: 42 }])
    expect(errors.some((message) => message.includes('neved'))).toBe(true)
  })
})

describe('form-submissions beforeValidate bekötés a végleges configban (K2)', () => {
  /** A végleges configból kiszedett beforeValidate-lánc ELSŐ tagja. */
  async function wiredValidator(): Promise<CollectionBeforeValidateHook> {
    const config = await configPromise
    const submissions = (config.collections ?? []).find((c) => c.slug === 'form-submissions')
    expect(submissions).toBeDefined()
    const chain = submissions?.hooks?.beforeValidate ?? []
    // A mező-/consent-ellenőrzés + a Turnstile-ellenőrzés — ebben a sorrendben.
    expect(chain.length).toBeGreaterThanOrEqual(2)
    return chain[0]
  }

  const hookArgs = (data: unknown, operation: 'create' | 'update') =>
    ({ data, operation }) as unknown as Parameters<CollectionBeforeValidateHook>[0]

  it('create: érvénytelen beküldésre APIError (400), magyar üzenettel', async () => {
    const hook = await wiredValidator()
    const data = { form: '1', submissionData: validSubmissionData({ consentPrivacy: 'false' }) }

    const callHook = async () => hook(hookArgs(data, 'create'))
    const error = await callHook().then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(APIError)
    expect((error as APIError).status).toBe(400)
    expect((error as APIError).message).toContain('hozzájárulás')
  })

  it('create: üres beküldésre az összes mezőhiba egy üzenetben érkezik', async () => {
    const hook = await wiredValidator()
    const callHook = async () => hook(hookArgs({ form: '1' }, 'create'))
    const error = await callHook().then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(APIError)
    const message = (error as APIError).message
    expect(message).toContain('neved')
    expect(message).toContain('e-mail')
    expect(message).toContain('tárgy')
    expect(message).toContain('üzeneted')
    expect(message).toContain('hozzájárulás')
  })

  it('create: érvényes beküldés változatlanul átmegy', async () => {
    const hook = await wiredValidator()
    const data = { form: '1', submissionData: validSubmissionData() }
    const result = await hook(hookArgs(data, 'create'))
    expect(result).toBe(data)
  })

  it('update: nem fut a szerződés-ellenőrzés (a staff részleges módosítása ne bukjon el)', async () => {
    const hook = await wiredValidator()
    const data = { form: '1' }
    const result = await hook(hookArgs(data, 'update'))
    expect(result).toBe(data)
  })

  // --- C9: ŰRLAPONKÉNTI szerződés-választás --------------------------------
  //
  // Ugyanaz a hooklánc szolgálja ki a „Kapcsolat" és a lábléc „Hírlevél"
  // űrlapját, de a beküldés sémája más. A besorolás az űrlap CÍMÉBŐL jön (a
  // `data.form` azonosítón át), NEM a beküldött mezők alakjából — így a kliens
  // nem választhatja meg magának a lazább szabályt.
  //
  // Adatbázis nincs: a `req.payload.findByID` injektált csonk, ami a
  // form-lekérdezésre a címet adja vissza. Hálózat egyetlen ágon sem indul.

  /** Hook-argumentum injektált Payload-csonkkal (form-cím + context). */
  const hookArgsWithForm = (
    data: unknown,
    formTitle: string | Error,
    context: Record<string, unknown> = {},
  ) =>
    ({
      data,
      operation: 'create',
      req: {
        context,
        payload: {
          findByID: async () => {
            if (formTitle instanceof Error) {
              throw formTitle
            }
            return { id: 2, title: formTitle }
          },
        },
      },
    }) as unknown as Parameters<CollectionBeforeValidateHook>[0]

  const newsletterData = (consent = 'true') => ({
    form: '2',
    submissionData: [
      { field: 'email', value: 'anna@pelda.hu' },
      { field: 'consentNewsletter', value: consent },
    ],
  })

  it('„Hírlevél" űrlap: a hírlevél-szerződés fut (nem kér nevet/tárgyat/üzenetet)', async () => {
    const hook = await wiredValidator()
    const data = newsletterData()
    const result = await hook(hookArgsWithForm(data, 'Hírlevél'))
    expect(result).toBe(data)
  })

  it('„Hírlevél" űrlap: hozzájárulás nélkül APIError (400), magyar üzenettel', async () => {
    const hook = await wiredValidator()
    const error = await hook(hookArgsWithForm(newsletterData('false'), 'Hírlevél')).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(APIError)
    expect((error as APIError).status).toBe(400)
    expect((error as APIError).message).toContain('hozzájárulás')
  })

  it('a besorolás a req.context-be kerül (ebből tudja az afterChange, hogy ne küldjön staff-értesítőt)', async () => {
    const hook = await wiredValidator()
    const context: Record<string, unknown> = {}
    await hook(hookArgsWithForm(newsletterData(), 'Hírlevél', context))
    expect(context.kineticareFormKind).toBe('newsletter')

    const contactContext: Record<string, unknown> = {}
    await hook(
      hookArgsWithForm(
        { form: '1', submissionData: validSubmissionData() },
        'Kapcsolat',
        contactContext,
      ),
    )
    expect(contactContext.kineticareFormKind).toBe('contact')
  })

  it('ismeretlen/feloldhatatlan űrlapnál a SZIGORÚBB kapcsolat-szerződés fut', async () => {
    const hook = await wiredValidator()
    // A form-lekérdezés hibája (pl. törölt űrlap) nem lazíthat a szabályokon.
    const error = await hook(
      hookArgsWithForm(newsletterData(), new Error('nincs ilyen űrlap')),
    ).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(APIError)
    expect((error as APIError).message).toContain('neved')
  })
})
