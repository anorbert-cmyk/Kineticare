import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CheckoutForm } from '../components/checkout/CheckoutForm'
import {
  billingErrorMap,
  toBillingPayload,
  validateBilling,
  type BillingFieldName,
} from '../lib/checkout/billing'

/**
 * B — a pénztár számlázási adatainak KÖZÖS validációja.
 *
 * Ugyanez a modul fut a /penztar űrlapján és a POST /api/checkout/start
 * szolgáltatásában is (a kliens megkerülhető). A szabály célja, hogy a
 * `customerSnapshot`-ból soha ne hiányozzanak a Számla Agent kötelező
 * vevőmezői (nev/irsz/telepules/cim) — enélkül a fizetés lemenne, a számla
 * viszont soha nem állna ki.
 *
 * A tesztek külön figyelnek arra, hogy az ellenőrzés NE legyen túlbuzgó:
 * valós magyar címek (rövid településnév, ékezet, törtszám, emeletjelölés)
 * mind átmennek.
 */

const VALID = {
  name: 'Minta Mari',
  zip: '1011',
  city: 'Budapest',
  street: 'Fő utca 1.',
}

function errorFields(input: unknown): BillingFieldName[] {
  const result = validateBilling(input)
  return result.ok ? [] : result.errors.map((item) => item.field)
}

describe('validateBilling — elfogadott, VALÓS magyar címek', () => {
  it.each([
    ['budapesti alapeset', VALID],
    ['kétbetűs településnév', { ...VALID, zip: '7381', city: 'Ág', street: 'Kossuth utca 3.' }],
    ['törtszámos házszám', { ...VALID, street: 'Fő tér 2/A' }],
    ['emelet-ajtó jelölés', { ...VALID, street: 'Váci út 12. 3. em. 5.' }],
    ['helyrajzi szám', { ...VALID, street: 'Külterület hrsz. 0123/4' }],
    ['házszám nélküli cím', { ...VALID, street: 'Petőfi utca' }],
    ['9-cel kezdődő irányítószám', { ...VALID, zip: '9985', city: 'Felsőszölnök' }],
    ['hosszú, ékezetes név', { ...VALID, name: 'Dr. Kovácsné Szőke Zsuzsanna' }],
  ])('átmegy: %s', (_label, input) => {
    expect(validateBilling(input).ok).toBe(true)
  })

  it('normalizál: körbevágás és a többszörös szóközök összevonása', () => {
    const result = validateBilling({
      name: '  Minta   Mari ',
      zip: ' 1011 ',
      city: ' Budapest ',
      street: 'Fő  utca   1.',
    })
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Minta Mari',
        zip: '1011',
        city: 'Budapest',
        street: 'Fő utca 1.',
        taxNumber: null,
      },
    })
  })

  it('az irányítószám H- előtaggal és szóközzel is elfogadott', () => {
    const result = validateBilling({ ...VALID, zip: 'H-1011' })
    expect(result.ok && result.value.zip).toBe('1011')
    const spaced = validateBilling({ ...VALID, zip: '10 11' })
    expect(spaced.ok && spaced.value.zip).toBe('1011')
  })
})

describe('validateBilling — elutasított, hiányos adatok', () => {
  it('teljesen üres bemenet: mind a négy kötelező mező hibás', () => {
    expect(errorFields({})).toEqual(['name', 'city', 'street', 'zip'])
  })

  it('nem objektum bemenet (null, tömb, string) sem omlik el', () => {
    expect(errorFields(null)).toHaveLength(4)
    expect(errorFields('szöveg')).toHaveLength(4)
    expect(errorFields([VALID])).toHaveLength(4)
  })

  it('csak szóközből álló mező is hiányzónak számít', () => {
    expect(errorFields({ ...VALID, city: '   ' })).toEqual(['city'])
    expect(errorFields({ ...VALID, name: '\n\t ' })).toEqual(['name'])
  })

  it.each([
    ['üres', ''],
    ['háromjegyű', '101'],
    ['ötjegyű', '10112'],
    ['nullával kezdődő', '0111'],
    ['betűs', '10A1'],
  ])('irányítószám elutasítva: %s', (_label, zip) => {
    expect(errorFields({ ...VALID, zip })).toEqual(['zip'])
  })

  it('a túl hosszú érték is elutasított (épesz-határ)', () => {
    expect(errorFields({ ...VALID, city: 'a'.repeat(101) })).toEqual(['city'])
    expect(errorFields({ ...VALID, name: 'a'.repeat(201) })).toEqual(['name'])
    expect(errorFields({ ...VALID, street: 'a'.repeat(201) })).toEqual(['street'])
  })

  it('minden hibaüzenet MAGYAR, mezőhöz kötve', () => {
    const result = validateBilling({})
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    const map = billingErrorMap(result.errors)
    expect(map.name).toBe('Add meg a számlázási nevet (legalább 2 karakter).')
    expect(map.zip).toBe('Az irányítószám négyjegyű szám (például 1011).')
    expect(map.city).toBe('Add meg a települést.')
    expect(map.street).toBe('Add meg az utcát és a házszámot.')
  })
})

describe('validateBilling — adószám (opcionális)', () => {
  it('hiányzó vagy üres adószám → null (magánszemély), nem hiba', () => {
    expect(validateBilling(VALID)).toMatchObject({ ok: true, value: { taxNumber: null } })
    expect(validateBilling({ ...VALID, taxNumber: '' })).toMatchObject({
      ok: true,
      value: { taxNumber: null },
    })
    expect(validateBilling({ ...VALID, taxNumber: '   ' })).toMatchObject({
      ok: true,
      value: { taxNumber: null },
    })
  })

  it.each([
    ['tagolt', '12345678-1-42'],
    ['tagolatlan', '12345678142'],
    ['szóközös', '12345678 1 42'],
  ])('a 11 számjegy elfogadott és a hivatalos alakra normalizált: %s', (_label, taxNumber) => {
    const result = validateBilling({ ...VALID, taxNumber })
    expect(result.ok && result.value.taxNumber).toBe('12345678-1-42')
  })

  it.each([
    ['EU-előtagos', 'HU12345678'],
    ['túl rövid', '1234567'],
    ['túl hosszú', '123456781421'],
    ['betűs', '1234567814A'],
  ])('elutasított adószám: %s', (_label, taxNumber) => {
    expect(errorFields({ ...VALID, taxNumber })).toEqual(['taxNumber'])
  })
})

describe('toBillingPayload — a hálózati törzs alakja', () => {
  it('a null adószám KIMARAD a törzsből', () => {
    const result = validateBilling(VALID)
    expect(result.ok && toBillingPayload(result.value)).toEqual({
      name: 'Minta Mari',
      zip: '1011',
      city: 'Budapest',
      street: 'Fő utca 1.',
    })
  })

  it('a megadott adószám bekerül', () => {
    const result = validateBilling({ ...VALID, taxNumber: '12345678142' })
    expect(result.ok && toBillingPayload(result.value)).toMatchObject({
      taxNumber: '12345678-1-42',
    })
  })
})

describe('CheckoutForm — a profil csak ELŐKITÖLTÉS', () => {
  const product = { id: 42, sku: 'Kézrehab alapkurzus', priceHuf: 24900, isFree: false }

  it('a profil mezői kontrollált értékként (value) jelennek meg — a submit ugyanezt a state-et olvassa', () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutForm, {
        product,
        user: {
          name: 'Minta Mari',
          email: 'vevo@example.test',
          billingName: 'Példa Kft.',
          billingZip: '9700',
          billingCity: 'Szombathely',
          billingStreet: 'Fő tér 2/A',
          taxNumber: '12345678-1-42',
        },
        alreadyPurchased: false,
      }),
    )

    expect(html).toContain('value="Példa Kft."')
    expect(html).toContain('value="9700"')
    expect(html).toContain('value="Szombathely"')
    expect(html).toContain('value="Fő tér 2/A"')
    expect(html).toContain('value="12345678-1-42"')
    // A korábbi hiba nyoma: a defaultValue-s, kiolvasatlan mezők helyett
    // kontrollált inputok vannak.
    expect(html).not.toContain('defaultValue')
  })

  it('üres profilnál a számlázási név a felhasználó nevére esik vissza', () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutForm, {
        product,
        user: { name: 'Minta Mari', email: 'vevo@example.test' },
        alreadyPurchased: false,
      }),
    )
    expect(html).toContain('value="Minta Mari"')
  })
})
