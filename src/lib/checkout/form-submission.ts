import type { CheckoutSubmitInput } from '../checkout-submit'
import {
  BILLING_FIELD_ORDER,
  billingErrorMap,
  billingSummaryMessage,
  toBillingPayload,
  validateBilling,
  type BillingFieldName,
} from './billing'

/**
 * A pénztár űrlapjának TISZTA döntési magja.
 *
 * MIÉRT KÜLÖN MODUL: a `vitest` `environment: 'node'`, jsdom/happy-dom nincs
 * telepítve (és nem is veszünk fel újat), a `renderToStaticMarkup` pedig a
 * `defaultValue`-t is `value=` attribútumként rendereli — vagyis a kimenetből
 * NEM lehet megkülönböztetni a kontrollált mezőt a kontrollálatlantól. Az a
 * hiba viszont, ami miatt ez a kör indult, éppen az volt, hogy a beküldött
 * törzs NEM a mezők (módosított) állapotából épült. Ez a modul azt a lépést
 * emeli ki, ahol ez eldől — így valódi, diszkrimináló teszt írható rá, a
 * `CheckoutForm` pedig csak állapotot tart és eseményt köt.
 *
 * A modul függőségmentes (nincs react-, next- vagy payload-import).
 */

/** A pénztár számlázási mezőinek NYERS (még nem validált) állapota. */
export type BillingFormValues = Record<BillingFieldName, string>

/** Mezőnév → megjelenítendő magyar hibaüzenet. */
export type BillingFieldErrors = Partial<Record<BillingFieldName, string>>

/** A profilból előkitölthető mezők (a `CheckoutUser` érintett része). */
export interface BillingProfile {
  name?: string | null
  billingName?: string | null
  billingZip?: string | null
  billingCity?: string | null
  billingStreet?: string | null
  taxNumber?: string | null
}

/**
 * A validációs mezőnév → a HTML input `name` attribútuma. Egyetlen forrás:
 * a `CheckoutForm` ebből adja a `name` propokat, a fókuszálandó elem
 * azonosítója pedig ugyanebből képződik — így a kettő nem tud elcsúszni.
 */
export const BILLING_INPUT_NAME: Record<BillingFieldName, string> = {
  name: 'billingName',
  zip: 'billingZip',
  city: 'billingCity',
  street: 'billingStreet',
  taxNumber: 'taxNumber',
}

/** A `Field` id-konvenciója (`kc-field-<name>`) szerinti elem-azonosító. */
export function billingInputId(field: BillingFieldName): string {
  return `kc-field-${BILLING_INPUT_NAME[field]}`
}

export const CHECKOUT_ALREADY_PURCHASED_ERROR =
  'Ezt a kurzust már megvetted — a Kurzusaim oldalon éred el.'
export const CHECKOUT_WAIVER_ERROR = 'A vásárláshoz mindkét hozzájárulást el kell fogadnod.'

/** Az elállási-nyilatkozat két jelölőnégyzetének elem-azonosítója. */
export const WAIVER_START_INPUT_ID = 'waiver-start'
export const WAIVER_LOSS_INPUT_ID = 'waiver-loss'

/**
 * A profil KIZÁRÓLAG előkitöltés: innentől a form-állapot az igazság, és a
 * beküldésbe a (esetleg felülírt) állapot megy — nem a profil.
 */
export function prefillBillingForm(profile: BillingProfile): BillingFormValues {
  return {
    // A `buyerFromOrder` is a billingName → name sorrendet követi (invoice.ts).
    name: profile.billingName ?? profile.name ?? '',
    zip: profile.billingZip ?? '',
    city: profile.billingCity ?? '',
    street: profile.billingStreet ?? '',
    taxNumber: profile.taxNumber ?? '',
  }
}

/** Egy mező új értéke (a state-frissítés tiszta megfelelője). */
export function withBillingValue(
  values: BillingFormValues,
  field: BillingFieldName,
  value: string,
): BillingFormValues {
  return { ...values, [field]: value }
}

/**
 * A mező hibájának TÖRLÉSE gépelés közben.
 *
 * Enélkül az `aria-invalid` a javítás után is igaz maradt, tehát a
 * képernyőolvasó a már helyes mezőt is végig érvénytelennek mondta.
 */
export function withoutBillingError(
  errors: BillingFieldErrors,
  field: BillingFieldName,
): BillingFieldErrors {
  if (errors[field] === undefined) {
    return errors
  }
  const next = { ...errors }
  delete next[field]
  return next
}

/** A beküldés pillanatában érvényes teljes űrlapállapot. */
export interface CheckoutSubmissionContext {
  productId: number
  quantity?: number
  alreadyPurchased: boolean
  /** Fizetős termék → a két elállási nyilatkozat kötelező. */
  waiverRequired: boolean
  waiverStartAccepted: boolean
  waiverLossAccepted: boolean
  billing: BillingFormValues
}

export type CheckoutSubmissionPlan =
  /** A beküldés meg sem indulhat (már megvette / hiányzó nyilatkozat). */
  | { kind: 'blocked'; message: string; focusElementId: string | null }
  /** A számlázási adatok hibásak — mezőhibák + összefoglaló + fókuszcél. */
  | {
      kind: 'invalid'
      message: string
      fieldErrors: BillingFieldErrors
      focusElementId: string
    }
  /** Mehet: ez a törzs megy ki a POST /api/checkout/start végpontra. */
  | { kind: 'send'; body: CheckoutSubmitInput }

/**
 * Az űrlapállapotból a beküldési terv. A `send` ág törzse a MEZŐK AKTUÁLIS
 * állapotából épül (normalizálva) — a profil-előkitöltésnek itt már nyoma
 * sincs, tehát a felülírt érték kerül a rendelésre és a számlára.
 */
export function planCheckoutSubmission(
  context: CheckoutSubmissionContext,
): CheckoutSubmissionPlan {
  if (context.alreadyPurchased) {
    return {
      kind: 'blocked',
      message: CHECKOUT_ALREADY_PURCHASED_ERROR,
      focusElementId: null,
    }
  }
  if (context.waiverRequired && !(context.waiverStartAccepted && context.waiverLossAccepted)) {
    return {
      kind: 'blocked',
      message: CHECKOUT_WAIVER_ERROR,
      focusElementId: context.waiverStartAccepted ? WAIVER_LOSS_INPUT_ID : WAIVER_START_INPUT_ID,
    }
  }

  const result = validateBilling(context.billing)
  if (!result.ok) {
    const fieldErrors = billingErrorMap(result.errors)
    const firstInvalid =
      BILLING_FIELD_ORDER.find((field) => fieldErrors[field] !== undefined) ?? 'name'
    return {
      kind: 'invalid',
      message: billingSummaryMessage(result.errors),
      fieldErrors,
      focusElementId: billingInputId(firstInvalid),
    }
  }

  return {
    kind: 'send',
    body: {
      productId: context.productId,
      quantity: context.quantity ?? 1,
      consentWithdrawalWaiver: true,
      billing: toBillingPayload(result.value),
    },
  }
}
