'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PriceTag } from '@/components/ui/PriceTag'
import {
  billingErrorMap,
  toBillingPayload,
  validateBilling,
  type BillingFieldName,
} from '../../lib/checkout/billing'
import { submitCheckout, type CheckoutUser, type CheckoutProduct } from '../../lib/checkout-submit'

/**
 * CheckoutForm — a /penztar űrlapja (a vásárlás befejezése).
 *
 * A jogszabály szerinti két waiver-checkbox (45/2014. (II. 26.) Korm. rend.
 * 29. § (1) m) SZÓ SZERINTI szövegekkel, NEM előre kipipálva — mindkettő
 * kötelező a submit-hoz (a fizetős termékekre; az ingyenes tétel nem igényli).
 * A fizetési gomb felirata KÖTÖTT: „Megrendelés és fizetés".
 *
 * SZÁMLÁZÁSI ADATOK — kontrollált mezők, szándékosan:
 * a `Field` alapból kontrollálatlan, de a natív input-attribútumokat átadja,
 * ezért `value` + `onChange` megadásával MAGÁNAK A KOMPONENSNEK a módosítása
 * nélkül válik kontrollálttá (a többi hívási helye — RegisterForm, LoginForm,
 * AccountView — érintetlen; sőt, azok is pontosan ezt a mintát követik). A
 * FormData-s kiolvasás helyett azért ez a választás, mert (a) a mezőnkénti,
 * magyar hibaüzenet megjelenítéséhez amúgy is state kell, és (b) így a beírt
 * érték egyetlen forrásból (a state-ből) megy a beküldésbe — nem fordulhat
 * elő újra, hogy az űrlap megjelenít egy mezőt, a submit pedig nem olvassa ki.
 *
 * A `noValidate` szándékosan marad: a böngésző natív (nem magyar, nem
 * testre szabható) buborékai helyett a validáció a közös
 * `src/lib/checkout/billing.ts` modulból jön — UGYANAZ a szabály fut a
 * szerveren is, mert a kliens megkerülhető.
 */
export interface CheckoutFormProps {
  product: CheckoutProduct
  user: CheckoutUser
  alreadyPurchased: boolean
}

interface BillingFormState {
  name: string
  zip: string
  city: string
  street: string
  taxNumber: string
}

const BILLING_INCOMPLETE_ERROR =
  'A számlázási adatok hiányosak — a számla kiállításához minden csillagozott mezőt ki kell tölteni.'

export function CheckoutForm({ product, user, alreadyPurchased }: CheckoutFormProps) {
  const [waiverStart, setWaiverStart] = useState(false)
  const [waiverLoss, setWaiverLoss] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A profil mezői kizárólag ELŐKITÖLTÉSKÉNT szolgálnak: innentől a state az
  // igazság, és a beküldött (esetleg felülírt) érték kerül a rendelésre.
  const [billing, setBilling] = useState<BillingFormState>({
    name: user.billingName ?? user.name ?? '',
    zip: user.billingZip ?? '',
    city: user.billingCity ?? '',
    street: user.billingStreet ?? '',
    taxNumber: user.taxNumber ?? '',
  })
  const [billingErrors, setBillingErrors] = useState<Partial<Record<BillingFieldName, string>>>({})

  const requiresWaiver = !product.isFree
  const waiverComplete = !requiresWaiver || (waiverStart && waiverLoss)

  const updateBilling = (field: keyof BillingFormState, value: string): void => {
    setBilling((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (alreadyPurchased) {
      setError('Ezt a kurzust már megvetted — a Kurzusaim oldalon éred el.')
      return
    }
    if (!waiverComplete) {
      setError('A vásárláshoz mindkét hozzájárulást el kell fogadnod.')
      return
    }

    const billingResult = validateBilling(billing)
    if (!billingResult.ok) {
      setBillingErrors(billingErrorMap(billingResult.errors))
      setError(BILLING_INCOMPLETE_ERROR)
      return
    }
    setBillingErrors({})

    setSubmitting(true)
    const result = await submitCheckout({
      productId: product.id,
      quantity: 1,
      consentWithdrawalWaiver: true,
      billing: toBillingPayload(billingResult.value),
    })
    setSubmitting(false)

    if (result.ok) {
      window.location.href = result.gatewayUrl
      return
    }
    setError(result.message)
  }

  return (
    <form className="kc-checkout-form" noValidate onSubmit={handleSubmit}>
      <Card className="kc-checkout-summary">
        <div className="kc-checkout-summary__row">
          <span>{product.sku}</span>
          {product.isFree ? (
            <span className="kc-checkout-summary__free">Ingyenes</span>
          ) : product.priceHuf !== null ? (
            <PriceTag priceHuf={product.priceHuf} />
          ) : null}
        </div>
      </Card>

      <Card className="kc-checkout-billing">
        <h2>Számlázási adatok</h2>
        <p className="kc-field__hint">
          A számla ezekkel az adatokkal készül. Ha a profilodban máshogy szerepelnek, itt
          felülírhatod őket — a rendelésre az itt megadott adat kerül.
        </p>
        <Field
          autoComplete="name"
          error={billingErrors.name}
          label="Név"
          name="billingName"
          onChange={(event) => updateBilling('name', event.target.value)}
          required
          value={billing.name}
        />
        <div className="kc-checkout-billing__grid">
          <Field
            autoComplete="postal-code"
            error={billingErrors.zip}
            inputMode="numeric"
            label="Irányítószám"
            name="billingZip"
            onChange={(event) => updateBilling('zip', event.target.value)}
            required
            value={billing.zip}
          />
          <Field
            autoComplete="address-level2"
            error={billingErrors.city}
            label="Település"
            name="billingCity"
            onChange={(event) => updateBilling('city', event.target.value)}
            required
            value={billing.city}
          />
        </div>
        <Field
          autoComplete="street-address"
          error={billingErrors.street}
          label="Cím"
          name="billingStreet"
          onChange={(event) => updateBilling('street', event.target.value)}
          required
          value={billing.street}
        />
        <Field
          error={billingErrors.taxNumber}
          hint="Csak céges vásárlás esetén."
          label="Adószám (céges vásárlásnál)"
          name="taxNumber"
          onChange={(event) => updateBilling('taxNumber', event.target.value)}
          value={billing.taxNumber}
        />
      </Card>

      {requiresWaiver ? (
        <Card className="kc-checkout-waiver">
          <h2>Elállási jog</h2>
          <p className="kc-checkout-waiver__lead">
            A digitális tartalom (a kurzusvideók) azonnali hozzáféréséről az alábbiakban
            nyilatkoznod kell. A 14 napos elállási jog szabályairól az{' '}
            <a href="/aszf" target="_blank" rel="noopener noreferrer">
              Általános szerződési feltételek
            </a>{' '}
            tájékoztat.
          </p>

          <div className="kc-checkout-waiver__item">
            <input
              aria-describedby="waiver-start-hint"
              checked={waiverStart}
              id="waiver-start"
              name="waiverStart"
              onChange={(event) => setWaiverStart(event.target.checked)}
              required
              type="checkbox"
            />
            <label htmlFor="waiver-start">
              Kifejezetten kérem, hogy a digitális tartalomhoz a hozzáférés azonnal megkezdődjön.
            </label>
          </div>
          <p className="kc-field__hint" id="waiver-start-hint">
            Ha nem járulsz hozzá az azonnali hozzáféréshez, a kurzust 14 nap elteltével éred el.
          </p>

          <div className="kc-checkout-waiver__item">
            <input
              aria-describedby="waiver-loss-hint"
              checked={waiverLoss}
              id="waiver-loss"
              name="waiverLoss"
              onChange={(event) => setWaiverLoss(event.target.checked)}
              required
              type="checkbox"
            />
            <label htmlFor="waiver-loss">
              Tudomásul veszem, hogy a teljesítés megkezdésével elveszítem a 14 napos elállási
              jogomat.
            </label>
          </div>
          <p className="kc-field__hint" id="waiver-loss-hint">
            A hozzájárulásodat a rendszer a rendelésen időbélyeggel rögzíti.
          </p>
        </Card>
      ) : (
        <Card className="kc-checkout-waiver kc-checkout-waiver--free">
          <p>
            Ez a kurzus ingyenes — a hozzáférés a regisztrációd után azonnal megnyílik, fizetés
            és elállási nyilatkozat nélkül.
          </p>
        </Card>
      )}

      {error ? (
        <div aria-live="assertive" className="kc-checkout-form__error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="kc-checkout-form__actions">
        <Button disabled={submitting || alreadyPurchased || !waiverComplete} type="submit">
          {submitting ? 'Feldolgozás…' : product.isFree ? 'Hozzáférés megnyitása' : 'Megrendelés és fizetés'}
        </Button>
      </div>
    </form>
  )
}
