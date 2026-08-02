'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PriceTag } from '@/components/ui/PriceTag'
import { submitCheckout, type CheckoutUser, type CheckoutProduct } from '../../lib/checkout-submit'

/**
 * CheckoutForm — a /penztar űrlapja (a vásárlás befejezése).
 *
 * A jogszabály szerinti két waiver-checkbox (45/2014. (II. 26.) Korm. rend.
 * 29. § (1) m) SZÓ SZERINTI szövegekkel, NEM előre kipipálva — mindkettő
 * kötelező a submit-hoz (a fizetős termékekre; az ingyenes tétel nem igényli).
 * A fizetési gomb felirata KÖTÖTT: „Megrendelés és fizetés".
 */
export interface CheckoutFormProps {
  product: CheckoutProduct
  user: CheckoutUser
  alreadyPurchased: boolean
}

export function CheckoutForm({ product, user, alreadyPurchased }: CheckoutFormProps) {
  const [waiverStart, setWaiverStart] = useState(false)
  const [waiverLoss, setWaiverLoss] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiresWaiver = !product.isFree
  const waiverComplete = !requiresWaiver || (waiverStart && waiverLoss)

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

    setSubmitting(true)
    const result = await submitCheckout({
      productId: product.id,
      quantity: 1,
      consentWithdrawalWaiver: true,
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
        <Field
          label="Név"
          name="billingName"
          required
          defaultValue={user.billingName ?? user.name ?? ''}
        />
        <div className="kc-checkout-billing__grid">
          <Field
            label="Irányítószám"
            name="billingZip"
            required
            defaultValue={user.billingZip ?? ''}
          />
          <Field
            label="Település"
            name="billingCity"
            required
            defaultValue={user.billingCity ?? ''}
          />
        </div>
        <Field
          label="Cím"
          name="billingStreet"
          required
          defaultValue={user.billingStreet ?? ''}
        />
        <Field
          hint="Csak céges vásárlás esetén."
          label="Adószám (céges vásárlásnál)"
          name="taxNumber"
          defaultValue={user.taxNumber ?? ''}
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
