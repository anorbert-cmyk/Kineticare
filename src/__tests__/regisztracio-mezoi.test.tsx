import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RegisterForm } from '../components/auth/RegisterForm'
import { CheckoutForm } from '../components/checkout/CheckoutForm'
import { BILLING_INPUT_NAME } from '../lib/checkout/form-submission'

/**
 * ŐR — A REGISZTRÁCIÓ HÁROM MEZŐJE.
 *
 * ═══ MIÉRT LÉTEZIK ═══
 * A tulajdonos 2026-08-17-i döntése: a regisztrációból kikerült az
 * összecsukható „Számlázási adatok (opcionális)" blokk, mert a számlázási
 * adatot ott kérjük, ahol számla készül belőle — a fizetés során.
 *
 * Egy ilyen tétel visszacsúszása NÉMA: a lap fut, minden más teszt zöld, csak a
 * regisztráció lesz megint hosszabb, mint amennyit kérni szabad. Ezért kap
 * végrehajtható őrt.
 *
 * ═══ A HIVATKOZOTT SZABÁLYOK ═══
 * GOV.UK Service Manual, „Ask users for information": „Only ask for information
 * you need… Every question you ask makes it harder for users to complete the
 * service."
 * https://www.gov.uk/service-manual/design/collecting-personal-information
 * NN/g, „Website Forms Usability: Top 10 Recommendations": „Keep it short.
 * Eliminate unnecessary fields."
 * https://www.nngroup.com/articles/web-form-design/
 * Baymard Institute, checkout-kutatás: az elhagyás vezető okai közt a „too long
 * / complicated" folyamat.
 * https://baymard.com/blog/checkout-flow-average-form-fields
 * WCAG 2.2 · 3.3.7 Redundant Entry — a mezők NEM tűntek el a rendszerből: a
 * fiók „Adataim" lapján elmenthetők, és onnan a pénztár előtölti őket.
 *
 * ═══ MIT RÖGZÍT (cáfolható állítások) ═══
 *  1. A regisztrációs markup PONTOSAN három beviteli mezőt tartalmaz.
 *  2. Egyetlen számlázási mezőnév és „számlázás" szó sincs benne.
 *  3. Nincs benne összecsukható (`<details>`) blokk.
 *  4. A számlázási mezők a PÉNZTÁRBAN és a FIÓKBAN továbbra is ott vannak —
 *     tehát ez eltávolítás, nem elvesztés.
 *  5. Az `.kc-auth-form__billing` CSS-szabályok is elmentek (nem maradt holt
 *     stílus, és nem maradt elárvult célfelület-kivétel a gomb-kontraszt őrben).
 */

const MARKUP = renderToStaticMarkup(createElement(RegisterForm, { returnUrl: '/fiok' }))

const REPO = fileURLToPath(new URL('..', import.meta.url))
const olvas = (relativUt: string): string => readFileSync(`${REPO}${relativUt}`, 'utf8')

/** A fejléc-komment maga is leírja a kivett mezőket — enélkül az őr vakon zöld. */
const kommentNelkul = (forras: string): string =>
  forras.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * A számlázási mezőnevek KIÍRVA, nem a kód konstansából származtatva: ha valaki
 * átnevezi a konstanst, az őr ne ürüljön ki némán. A két alak egyezését külön
 * állítás méri (lásd „a mezőnév-lista együtt mozog a pénztárral").
 */
const SZAMLAZASI_MEZOK = [
  'billingName',
  'billingZip',
  'billingCity',
  'billingStreet',
  'taxNumber',
] as const

describe('Regisztráció: három mező, több nincs', () => {
  it('pontosan három beviteli mező van a markupban', () => {
    const mezok = MARKUP.match(/<input\b[^>]*>/g) ?? []
    expect(
      mezok.map((m) => /name="([^"]+)"/.exec(m)?.[1] ?? '(névtelen)').sort(),
    ).toEqual(['email', 'name', 'password'])
  })

  it('egyetlen számlázási mező sincs a regisztrációban', () => {
    for (const mezo of SZAMLAZASI_MEZOK) {
      expect(MARKUP, `a(z) ${mezo} mező visszakerült a regisztrációba`).not.toContain(mezo)
    }
  })

  it('a „számlázás" szó sem jelenik meg a regisztrációs felületen', () => {
    expect(MARKUP.toLowerCase()).not.toContain('számláz')
  })

  it('nincs összecsukható blokk, amiben elrejtve visszajöhetne', () => {
    expect(MARKUP).not.toContain('<details')
    expect(MARKUP).not.toContain('<summary')
  })
})

describe('A számlázási mezők NEM tűntek el a rendszerből', () => {
  it('a pénztár továbbra is bekéri őket (ott készül belőlük számla)', () => {
    // A pénztár a saját, rövidebb mezőneveit használja (billing.ts:
    // BILLING_FIELD_ORDER), ezért itt a KIRENDERELT űrlapot nézzük, nem a
    // forrásszöveget: az számít, hogy a vevő elé kerülnek-e.
    const penztar = renderToStaticMarkup(
      createElement(CheckoutForm, {
        product: { id: 1, sku: 'Teszt kurzus', priceHuf: 19990, isFree: false },
        user: null,
        alreadyPurchased: false,
      }),
    )
    const nevek = new Set(
      (penztar.match(/<input\b[^>]*>/g) ?? []).map((m) => /name="([^"]+)"/.exec(m)?.[1] ?? ''),
    )
    for (const mezo of SZAMLAZASI_MEZOK) {
      expect(nevek, `a pénztárból hiányzik a(z) ${mezo} számlázási mező`).toContain(mezo)
    }
  })

  it('a mezőnév-lista együtt mozog a pénztárral (nem avul el némán)', () => {
    expect([...SZAMLAZASI_MEZOK].sort()).toEqual(Object.values(BILLING_INPUT_NAME).sort())
  })

  it('a fiók „Adataim" lapján elmenthetők (onnan tölt elő a pénztár)', () => {
    const fiok = kommentNelkul(olvas('components/account/AccountView.tsx'))
    for (const mezo of SZAMLAZASI_MEZOK) {
      expect(fiok, `a fiók-profilból hiányzik a(z) ${mezo} mező`).toContain(mezo)
    }
  })

  it('az API-szerződés változatlan: a RegisterInput ISMERI a mezőket', () => {
    // A felület nem kérdezi, de a végpont továbbra is elfogadja — így egy
    // későbbi import vagy admin-folyamat nem törik el.
    const kliens = kommentNelkul(olvas('lib/auth-client.ts'))
    expect(kliens).toContain('billingName')
  })
})

describe('A stílus is elment, nem csak a markup', () => {
  it('nincs több `.kc-auth-form__billing` szabály az auth.css-ben', () => {
    const css = olvas('app/(frontend)/auth.css').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(css).not.toContain('.kc-auth-form__billing')
  })
})
