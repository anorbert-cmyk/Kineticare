import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CheckoutSubmitInput, CheckoutSubmitResult } from '../lib/checkout-submit'
import {
  BILLING_TAX_NUMBER_ERROR,
  BILLING_TAX_NUMBER_EU_ERROR,
  validateBilling,
} from '../lib/checkout/billing'
import {
  CHECKOUT_WAIVER_ERROR,
  billingInputId,
  createCheckoutSubmitHandler,
  type BillingFieldErrors,
  type CheckoutSubmissionContext,
} from '../lib/checkout/form-submission'

/**
 * A MAG ÉS A KOMPONENS KÖZTI HUZALOZÁS ŐRE.
 *
 * A `planCheckoutSubmission` maga jól tesztelt volt, a review viszont
 * mutációval megmutatta, hogy ez NEM elég: a `CheckoutForm.handleSubmit`-et át
 * lehetett írni úgy, hogy megkerülje a tervet és pontosan az EREDETI hibát
 * csinálja (üres számlázási adatot küldjön) — és a teljes suite zöld maradt.
 * Az eredeti hiba éppen ezen a ponton élt: az űrlap megjelenítette a mezőket,
 * a beküldés viszont nem az állapotukból épült.
 *
 * Ezért a mellékhatás-lánc külön gyárban van (`createCheckoutSubmitHandler`),
 * és itt DOM nélkül, hamis függőségekkel ellenőrizzük, hogy a beküldött törzs a
 * MÓDOSÍTOTT állapotból származik, és hogy a hibaágak tényleg megjelenítik a
 * hibát, törlik/beállítják a mezőhibákat és fókuszálnak.
 *
 * Valódi hálózati hívás itt nem futhat: a `submit` mindig injektált mock.
 */

/** Hangosan dobó őr — ha bármi mégis a globális fetch-hez nyúlna (CLAUDE.md 15.). */
vi.stubGlobal('fetch', () => {
  throw new Error('TESZT: valódi hálózati hívás nem futhat')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('fetch', () => {
    throw new Error('TESZT: valódi hálózati hívás nem futhat')
  })
})

const TELJES_BILLING = {
  name: 'Példa Kft.',
  zip: '9700',
  city: 'Szombathely',
  street: 'Fő tér 2/A',
  taxNumber: '',
}

interface Naplo {
  errors: (string | null)[]
  fieldErrors: BillingFieldErrors[]
  submitting: boolean[]
  focused: (string | null)[]
  kuldott: CheckoutSubmitInput[]
  atiranyitva: string[]
}

function felepit(
  context: CheckoutSubmissionContext,
  eredmeny: CheckoutSubmitResult = { ok: true, orderNumber: 'KH-2026-000001', gatewayUrl: 'https://fizetes.example/1' },
): { futtat: () => Promise<void>; naplo: Naplo } {
  const naplo: Naplo = {
    errors: [],
    fieldErrors: [],
    submitting: [],
    focused: [],
    kuldott: [],
    atiranyitva: [],
  }
  const futtat = createCheckoutSubmitHandler({
    readContext: () => context,
    setError: (message) => naplo.errors.push(message),
    setBillingErrors: (errors) => naplo.fieldErrors.push(errors),
    setSubmitting: (value) => naplo.submitting.push(value),
    focusElement: (elementId) => naplo.focused.push(elementId),
    submit: async (body) => {
      naplo.kuldott.push(body)
      return eredmeny
    },
    redirect: (url) => naplo.atiranyitva.push(url),
  })
  return { futtat, naplo }
}

function alapContext(billing = TELJES_BILLING): CheckoutSubmissionContext {
  return {
    productId: 42,
    alreadyPurchased: false,
    waiverRequired: true,
    waiverStartAccepted: true,
    waiverLossAccepted: true,
    billing,
  }
}

describe('checkout beküldés-huzalozás', () => {
  it('a beküldött törzs a MÓDOSÍTOTT állapotból épül, nem az előkitöltésből', async () => {
    // Ez az a viselkedés, aminek a hiánya volt az eredeti hiba: a profilból
    // előkitöltött mezőt a vevő átírja, és a rendelésre az ÁTÍRT érték kerül.
    const modositott = { ...TELJES_BILLING, name: 'Átírt Név Kft.', city: 'Sopron' }
    const { futtat, naplo } = felepit(alapContext(modositott))

    await futtat()

    expect(naplo.kuldott).toHaveLength(1)
    expect(naplo.kuldott[0].billing).toMatchObject({ name: 'Átírt Név Kft.', city: 'Sopron' })
    expect(naplo.kuldott[0].productId).toBe(42)
    expect(naplo.atiranyitva).toEqual(['https://fizetes.example/1'])
  })

  it('hiányos számlázási adatnál NEM küld semmit, mezőhibát és fókuszt ad', async () => {
    const hianyos = { ...TELJES_BILLING, zip: '', city: '' }
    const { futtat, naplo } = felepit(alapContext(hianyos))

    await futtat()

    expect(naplo.kuldott).toEqual([])
    expect(naplo.atiranyitva).toEqual([])
    expect(naplo.fieldErrors).toHaveLength(1)
    expect(Object.keys(naplo.fieldErrors[0]).sort()).toEqual(['city', 'zip'])
    // A fókusz a MEZŐSORREND szerinti ELSŐ hibás mezőre megy.
    expect(naplo.focused).toEqual([billingInputId('zip')])
    expect(naplo.submitting).toEqual([])
  })

  it('hiányzó elállási nyilatkozatnál blokkol, és a hiányzó jelölőnégyzetre fókuszál', async () => {
    const { futtat, naplo } = felepit({ ...alapContext(), waiverLossAccepted: false })

    await futtat()

    expect(naplo.kuldott).toEqual([])
    expect(naplo.errors).toContain(CHECKOUT_WAIVER_ERROR)
    expect(naplo.focused).toHaveLength(1)
  })

  it('sikeres beküldés törli a korábbi mezőhibákat és visszaengedi a gombot', async () => {
    const { futtat, naplo } = felepit(alapContext())

    await futtat()

    expect(naplo.fieldErrors).toEqual([{}])
    expect(naplo.submitting).toEqual([true, false])
  })

  it('szerverhiba esetén megjeleníti az üzenetet és NEM irányít át', async () => {
    const { futtat, naplo } = felepit(alapContext(), {
      ok: false,
      message: 'A fizetés indítása nem sikerült.',
    })

    await futtat()

    expect(naplo.atiranyitva).toEqual([])
    expect(naplo.errors).toContain('A fizetés indítása nem sikerült.')
    expect(naplo.submitting).toEqual([true, false])
  })
})

describe('adószám-súgószöveg önellenőrzése', () => {
  /**
   * A súgószöveg és a szabály nem csúszhat szét: a review kimérte, hogy a
   * korábbi példa (`12345678-1-42`) magán a validátoron BUKOTT, tehát a vevő
   * betűre követte az utasítást, és egy másik hibát kapott.
   */
  it('minden adószám-üzenetben szereplő PÉLDA átmegy a validáción', () => {
    const uzenetek = [BILLING_TAX_NUMBER_ERROR, BILLING_TAX_NUMBER_EU_ERROR]
    const peldak = uzenetek.flatMap((uzenet) => uzenet.match(/\d{8}-\d-\d{2}/g) ?? [])

    expect(peldak.length).toBeGreaterThan(0)
    for (const pelda of peldak) {
      const eredmeny = validateBilling({ ...TELJES_BILLING, taxNumber: pelda })
      expect({ pelda, ok: eredmeny.ok }).toEqual({ pelda, ok: true })
    }
  })
})
