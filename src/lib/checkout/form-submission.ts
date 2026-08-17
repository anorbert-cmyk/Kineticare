import type { CheckoutSubmitInput, CheckoutSubmitResult } from '../checkout-submit'
import {
  BILLING_FIELD_ORDER,
  billingErrorMap,
  billingSummaryMessage,
  toBillingPayload,
  validateBilling,
  type BillingFieldName,
} from './billing'
import {
  GUEST_FIELD_ORDER,
  guestErrorMap,
  guestSummaryMessage,
  validateGuest,
  type GuestFieldName,
} from './guest'

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

/** A vendég-azonosító mezők (e-mail + név) NYERS állapota. */
export type GuestFormValues = Record<GuestFieldName, string>

/** Mezőnév → megjelenítendő magyar hibaüzenet (vendég-mezők). */
export type GuestFieldErrors = Partial<Record<GuestFieldName, string>>

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

/**
 * A vendég-mezők input-nevei. SZÁNDÉKOSAN eltérnek a számlázási mezőktől: a
 * `guestName` a FIÓK neve (ide megy a levél megszólítása), a `billingName`
 * pedig a számlára kerülő — céges vásárlásnál cégnév — adat.
 */
export const GUEST_INPUT_NAME: Record<GuestFieldName, string> = {
  email: 'guestEmail',
  name: 'guestName',
}

export function guestInputId(field: GuestFieldName): string {
  return `kc-field-${GUEST_INPUT_NAME[field]}`
}

export const CHECKOUT_ALREADY_PURCHASED_ERROR =
  'Ezt a kurzust már megvetted — a Kurzusaim oldalon éred el.'
export const CHECKOUT_WAIVER_ERROR = 'A vásárláshoz mindkét hozzájárulást el kell fogadnod.'

/** Az elállási-nyilatkozat két jelölőnégyzetének elem-azonosítója. */
/**
 * A pénztár élő hibarégiójának azonosítója.
 *
 * MIÉRT KELL AZONOSÍTÓ EGY `role="alert"` DOBOZNAK: az élő régiót a
 * képernyőolvasó felolvassa, a LÁTÓ felhasználó viszont nem látja, ha a doboz a
 * képernyőn kívül van. Mérve: szerverhiba után a hibadoboz `top` értéke asztalon
 * −753 px, mobilon −1343 px, a `document.activeElement` pedig `BODY` maradt —
 * vagyis a felületen SEMMI nem jelezte a hibát, a gomb is visszaállt alapállásba.
 * A fókusz ide mozgatásával a böngésző a dobozt a képernyőre görgeti, és a
 * billentyűzetes olvasás is innen folytatódik.
 */
export const CHECKOUT_ERROR_REGION_ID = 'kc-checkout-hiba'

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

/**
 * A vendég-mezők előkitöltése. Bejelentkezve NINCS vendég-blokk (a szerver a
 * munkamenetből dolgozik), ezért az űrlap üres állapotból indul.
 */
export function emptyGuestForm(): GuestFormValues {
  return { email: '', name: '' }
}

/** Egy mező új értéke (a state-frissítés tiszta megfelelője). */
export function withGuestValue(
  values: GuestFormValues,
  field: GuestFieldName,
  value: string,
): GuestFormValues {
  return { ...values, [field]: value }
}

/** A vendég-mező hibájának TÖRLÉSE gépelés közben (a számlázási mezők mintája). */
export function withoutGuestError(
  errors: GuestFieldErrors,
  field: GuestFieldName,
): GuestFieldErrors {
  if (errors[field] === undefined) {
    return errors
  }
  const next = { ...errors }
  delete next[field]
  return next
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
  /**
   * VENDÉG-VÁSÁRLÁS: az azonosító mezők állapota. Bejelentkezett vásárlásnál
   * hiányzik (a vevőt a munkamenet azonosítja), és a törzsbe sem kerül bele.
   */
  guest?: GuestFormValues
}

export type CheckoutSubmissionPlan =
  /** A beküldés meg sem indulhat (már megvette / hiányzó nyilatkozat). */
  | { kind: 'blocked'; message: string; focusElementId: string | null }
  /** A megadott adatok hibásak — mezőhibák + összefoglaló + fókuszcél. */
  | {
      kind: 'invalid'
      message: string
      fieldErrors: BillingFieldErrors
      /** A vendég-mezők hibái (bejelentkezve mindig üres). */
      guestErrors: GuestFieldErrors
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
      focusElementId: CHECKOUT_ERROR_REGION_ID,
    }
  }
  if (context.waiverRequired && !(context.waiverStartAccepted && context.waiverLossAccepted)) {
    return {
      kind: 'blocked',
      message: CHECKOUT_WAIVER_ERROR,
      focusElementId: context.waiverStartAccepted ? WAIVER_LOSS_INPUT_ID : WAIVER_START_INPUT_ID,
    }
  }

  /**
   * A VENDÉG-MEZŐK ELŐBB: a beküldési űrlapon ezek állnak legelöl, és ha
   * hiányoznak, a szerver úgyis 400-zal utasítana el. A fókusz így az első
   * tényleg hibás mezőre kerül, nem a lejjebb lévő számlázási blokkra.
   */
  const guestResult = context.guest === undefined ? null : validateGuest(context.guest)
  const guestErrors = guestResult !== null && !guestResult.ok ? guestErrorMap(guestResult.errors) : {}

  const result = validateBilling(context.billing)
  const fieldErrors = result.ok ? {} : billingErrorMap(result.errors)

  if (guestResult !== null && !guestResult.ok) {
    const firstInvalid =
      GUEST_FIELD_ORDER.find((field) => guestErrors[field] !== undefined) ?? 'email'
    return {
      kind: 'invalid',
      // Ha a számlázási blokk is hibás, az összefoglaló a vendég-mezőkről szól:
      // a felhasználó a fókuszált (első) hibát javítja, a többi a mezőknél látszik.
      message: guestSummaryMessage(guestResult.errors),
      fieldErrors,
      guestErrors,
      focusElementId: guestInputId(firstInvalid),
    }
  }

  if (!result.ok) {
    const firstInvalid =
      BILLING_FIELD_ORDER.find((field) => fieldErrors[field] !== undefined) ?? 'name'
    return {
      kind: 'invalid',
      message: billingSummaryMessage(result.errors),
      fieldErrors,
      guestErrors: {},
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
      // A vendég-blokk KIZÁRÓLAG bejelentkezés nélkül megy ki (belépve a
      // szerver úgyis figyelmen kívül hagyná).
      ...(guestResult !== null && guestResult.ok ? { guest: guestResult.value } : {}),
    },
  }
}

/**
 * A beküldés MELLÉKHATÁSAI — a tiszta terv és a React-komponens közötti
 * huzalozás.
 *
 * MIÉRT KÜLÖN GYÁR: a `planCheckoutSubmission` maga kiválóan tesztelt, de a
 * review mutációval megmutatta, hogy a MAG ÉS A KOMPONENS KÖZTI kötés
 * továbbra is fedezetlen volt: a `handleSubmit`-et át lehetett írni úgy, hogy
 * megkerülje a tervet (és pontosan az eredeti hibát csinálja — üres
 * számlázási adatot küldjön), miközben a teljes suite zöld maradt. Éppen ezen
 * a ponton élt az eredeti hiba, ezért ezt is le kell fedni.
 *
 * A gyár DOM nélkül, hamis függőségekkel tesztelhető; a `CheckoutForm` már
 * csak állapotot tart és ezt a függvényt köti az `onSubmit`-re.
 */
export interface CheckoutSubmitHandlerDeps {
  /** A beküldés pillanatában érvényes űrlapállapot (a React-state olvasása). */
  readContext: () => CheckoutSubmissionContext
  setError: (message: string | null) => void
  setBillingErrors: (errors: BillingFieldErrors) => void
  /** A vendég-mezők hibáinak beállítása (bejelentkezve mindig üres map). */
  setGuestErrors: (errors: GuestFieldErrors) => void
  setSubmitting: (value: boolean) => void
  /** `null` esetén nincs fókuszálandó elem (a hívó ilyenkor ne csináljon semmit). */
  focusElement: (elementId: string | null) => void
  submit: (body: CheckoutSubmitInput) => Promise<CheckoutSubmitResult>
  /** Sikeres indítás után a fizetési átjáróra navigálás. */
  redirect: (gatewayUrl: string) => void
}

export function createCheckoutSubmitHandler(
  deps: CheckoutSubmitHandlerDeps,
): () => Promise<void> {
  return async () => {
    deps.setError(null)

    const plan = planCheckoutSubmission(deps.readContext())

    if (plan.kind === 'blocked') {
      deps.setError(plan.message)
      deps.focusElement(plan.focusElementId)
      return
    }
    if (plan.kind === 'invalid') {
      deps.setBillingErrors(plan.fieldErrors)
      deps.setGuestErrors(plan.guestErrors)
      deps.setError(plan.message)
      deps.focusElement(plan.focusElementId)
      return
    }

    deps.setBillingErrors({})
    deps.setGuestErrors({})
    deps.setSubmitting(true)
    // A `submit` saját hibakezelése miatt itt nem dobhat; a `finally` mégis
    // kell, hogy egy váratlan kivétel se hagyja a gombot „Feldolgozás…"-ban.
    try {
      const result = await deps.submit(plan.body)
      if (result.ok) {
        deps.redirect(result.gatewayUrl)
        return
      }
      // A hibaüzenet ONNAN kap fókuszt, ahol a felhasználó látja is: enélkül a
      // doboz a képernyőn kívül maradt, és a beküldés némán elhalt (B1).
      deps.setError(result.message)
      deps.focusElement(CHECKOUT_ERROR_REGION_ID)
    } finally {
      deps.setSubmitting(false)
    }
  }
}
