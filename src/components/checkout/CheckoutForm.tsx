'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PriceTag } from '@/components/ui/PriceTag'
import type { BillingFieldName } from '../../lib/checkout/billing'
import type { GuestFieldName } from '../../lib/checkout/guest'
import {
  BILLING_INPUT_NAME,
  GUEST_INPUT_NAME,
  WAIVER_LOSS_INPUT_ID,
  WAIVER_START_INPUT_ID,
  createCheckoutSubmitHandler,
  emptyGuestForm,
  prefillBillingForm,
  withBillingValue,
  withGuestValue,
  withoutBillingError,
  withoutGuestError,
  type BillingFieldErrors,
  type GuestFieldErrors,
} from '../../lib/checkout/form-submission'
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
 * AccountView — érintetlen). A FormData-s kiolvasás helyett azért ez a
 * választás, mert (a) a mezőnkénti, magyar hibaüzenet megjelenítéséhez amúgy
 * is state kell, és (b) így a beírt érték egyetlen forrásból (a state-ből) megy
 * a beküldésbe — nem fordulhat elő újra, hogy az űrlap megjelenít egy mezőt, a
 * submit pedig nem olvassa ki.
 *
 * A DÖNTÉSI MAG NEM ITT VAN: a beküldési törzs összeállítása, a validáció, az
 * összefoglaló üzenet és a fókuszcél az `src/lib/checkout/form-submission.ts`
 * tiszta függvényeiben él — azok node-környezetben, DOM nélkül tesztelhetők
 * (jsdom nincs telepítve, a `renderToStaticMarkup` pedig nem tud különbséget
 * tenni kontrollált és kontrollálatlan mező között).
 *
 * A `noValidate` szándékosan marad: a böngésző natív (nem magyar, nem
 * testre szabható) buborékai helyett a validáció a közös
 * `src/lib/checkout/billing.ts` modulból jön — UGYANAZ a szabály fut a
 * szerveren is, mert a kliens megkerülhető.
 */
export interface CheckoutFormProps {
  product: CheckoutProduct
  /**
   * A bejelentkezett vásárló profilja — VENDÉG-vásárlásnál `null`. Ilyenkor az
   * űrlap az azonosító mezőkkel (e-mail + név) indul, és a szerver ezekből
   * hozza létre (vagy találja meg) a fiókot a fizetés után.
   */
  user: CheckoutUser | null
  alreadyPurchased: boolean
}

/**
 * Navigálás a fizetési átjáróra. MODUL-szinten van, nem a komponensben: a
 * `window.location` írása a render-scope-ból a React-fordító
 * immutability-szabályába ütközik (a beküldés-kezelőt a render állítja össze).
 */
const redirectToGateway = (gatewayUrl: string): void => {
  window.location.href = gatewayUrl
}

/**
 * A beküldési hiba élő régiója — az űrlap tetején.
 *
 * MINDIG renderelődik (üresen is), nem csak hibakor: a dinamikusan BESZÚRT
 * aria-live régiót több képernyőolvasó megbízhatatlanul jelenti be, a már
 * meglévő régió tartalomváltozását viszont igen.
 *
 * A `data-visible` ezért NEM a létezést kapcsolja, csak a MEGJELENÉST: üres
 * állapotban a checkout.css a `.kc-visually-hidden` technikájával tünteti el a
 * dobozt (keret, háttér, magasság és a flex-rés is elmarad), miközben az elem
 * és vele az élő régió a DOM-ban marad. `display: none` TILOS rá — az
 * elnémítaná a bejelentést. Az attribútum azért az `error !== null` állapotból
 * jön és nem a CSS `:empty` szelektorából, mert így determinisztikus és a
 * markupon tesztelhető.
 *
 * KÜLÖN KOMPONENS, szándékosan: a hiba a `CheckoutForm` belső state-je, amit
 * DOM nélkül (jsdom nincs telepítve) nem lehet beállítani — így viszont
 * mindkét állapot renderelhető és asszertálható.
 */
export function CheckoutErrorRegion({ error }: { error: string | null }) {
  return (
    <div
      aria-live="assertive"
      className="kc-checkout-form__error"
      data-visible={error !== null ? 'true' : 'false'}
      role="alert"
    >
      {error}
    </div>
  )
}

export function CheckoutForm({ product, user, alreadyPurchased }: CheckoutFormProps) {
  const [waiverStart, setWaiverStart] = useState(false)
  const [waiverLoss, setWaiverLoss] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A profil mezői kizárólag ELŐKITÖLTÉSKÉNT szolgálnak: innentől a state az
  // igazság, és a beküldött (esetleg felülírt) érték kerül a rendelésre.
  const [billing, setBilling] = useState(() => prefillBillingForm(user ?? {}))
  const [billingErrors, setBillingErrors] = useState<BillingFieldErrors>({})
  // Vendég-vásárlás: az azonosító mezők. Bejelentkezve nincs ilyen állapot —
  // a törzsbe sem kerül `guest` blokk (a szerver a munkamenetből dolgozik).
  const isGuest = user === null
  const [guest, setGuest] = useState(emptyGuestForm)
  const [guestErrors, setGuestErrors] = useState<GuestFieldErrors>({})

  const requiresWaiver = !product.isFree
  const waiverComplete = !requiresWaiver || (waiverStart && waiverLoss)

  const updateBilling = (field: BillingFieldName, value: string): void => {
    setBilling((previous) => withBillingValue(previous, field, value))
    // A mező hibája gépeléskor eltűnik (az aria-invalid is), különben a
    // képernyőolvasó a már javított mezőt is végig érvénytelennek mondaná.
    setBillingErrors((previous) => withoutBillingError(previous, field))
  }

  const updateGuest = (field: GuestFieldName, value: string): void => {
    setGuest((previous) => withGuestValue(previous, field, value))
    setGuestErrors((previous) => withoutGuestError(previous, field))
  }

  /** A hibás mezőre visszük a fókuszt — a görgetést a böngésző intézi. */
  const focusElement = (elementId: string | null): void => {
    if (elementId === null || typeof document === 'undefined') {
      return
    }
    document.getElementById(elementId)?.focus()
  }

  /**
   * A beküldés MELLÉKHATÁS-lánca a `form-submission.ts` gyárában él, hogy a
   * mag és a komponens KÖZTI huzalozás is tesztelhető legyen — a review
   * mutációval megmutatta, hogy korábban ezt a pontot át lehetett írni úgy,
   * hogy az eredeti hiba visszatérjen, miközben a teljes suite zöld marad.
   * Itt már csak az aktuális állapot olvasása és a React-hookok bekötése van.
   */
  const runSubmit = createCheckoutSubmitHandler({
    readContext: () => ({
      productId: product.id,
      alreadyPurchased,
      waiverRequired: requiresWaiver,
      waiverStartAccepted: waiverStart,
      waiverLossAccepted: waiverLoss,
      billing,
      ...(isGuest ? { guest } : {}),
    }),
    setError,
    setBillingErrors,
    setGuestErrors,
    setSubmitting,
    focusElement,
    submit: submitCheckout,
    redirect: redirectToGateway,
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await runSubmit()
  }

  return (
    <form className="kc-checkout-form" noValidate onSubmit={handleSubmit}>
      {/*
        A hibadoboz az űrlap TETEJÉN van: korábban a hosszú elállási kártya
        UTÁN, a lap alján jelent meg, tehát mobilon a beküldés után a
        felhasználó semmit nem látott. A fókusz emellett az első hibás mezőre
        ugrik, így a hiba akkor is előkerül, ha a doboz a képernyőn kívül esne.
        Az élő régió szerződését (mindig a DOM-ban, üresen vizuálisan nyomtalan)
        a CheckoutErrorRegion fejkommentje írja le.
      */}
      <CheckoutErrorRegion error={error} />

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

      {isGuest ? (
        <Card className="kc-checkout-guest">
          <h2>Elérhetőséged</h2>
          <p className="kc-field__hint">
            A vásárláshoz nem kell regisztrálni. A fizetés után erre a címre küldjük a
            hozzáférést és egy linket, amivel jelszót állítasz be a fiókodhoz. Ha már van
            fiókod ezzel a címmel, a kurzus abban jelenik meg —{' '}
            <Link href="/belepes">be is jelentkezhetsz</Link>.
          </p>
          <Field
            autoComplete="email"
            error={guestErrors.email}
            inputMode="email"
            label="E-mail-cím"
            name={GUEST_INPUT_NAME.email}
            onChange={(event) => updateGuest('email', event.target.value)}
            required
            type="email"
            value={guest.email}
          />
          <Field
            autoComplete="name"
            error={guestErrors.name}
            hint="Ez a fiókod neve — a számlázási név ettől eltérhet (pl. cégnév)."
            label="Neved"
            name={GUEST_INPUT_NAME.name}
            onChange={(event) => updateGuest('name', event.target.value)}
            required
            value={guest.name}
          />
        </Card>
      ) : null}

      <Card className="kc-checkout-billing">
        <h2>Számlázási adatok</h2>
        <p className="kc-field__hint">
          {isGuest
            ? 'A számla ezekkel az adatokkal készül — a rendelésre az itt megadott adat kerül.'
            : 'A számla ezekkel az adatokkal készül. Ha a profilodban máshogy szerepelnek, itt felülírhatod őket — a rendelésre az itt megadott adat kerül.'}
        </p>
        <Field
          autoComplete="billing name"
          error={billingErrors.name}
          label="Név"
          name={BILLING_INPUT_NAME.name}
          onChange={(event) => updateBilling('name', event.target.value)}
          required
          value={billing.name}
        />
        <div className="kc-checkout-billing__grid">
          {/*
            `inputMode="numeric"` szándékosan NINCS: a mező külföldi
            irányítószámot is elfogad (pl. `SW1A 1AA`), a szám-billentyűzet
            pedig mobilon el sem érhetővé tenné a betűket.
          */}
          <Field
            autoComplete="billing postal-code"
            error={billingErrors.zip}
            label="Irányítószám"
            name={BILLING_INPUT_NAME.zip}
            onChange={(event) => updateBilling('zip', event.target.value)}
            required
            value={billing.zip}
          />
          <Field
            autoComplete="billing address-level2"
            error={billingErrors.city}
            label="Település"
            name={BILLING_INPUT_NAME.city}
            onChange={(event) => updateBilling('city', event.target.value)}
            required
            value={billing.city}
          />
        </div>
        <Field
          autoComplete="billing address-line1"
          error={billingErrors.street}
          label="Cím"
          name={BILLING_INPUT_NAME.street}
          onChange={(event) => updateBilling('street', event.target.value)}
          required
          value={billing.street}
        />
        {/*
          Az adószámra nincs szabványos autofill-token, és a böngésző
          amúgy is rossz mezőt (telefonszám, kártyaszám) kínálna fel.
        */}
        <Field
          autoComplete="off"
          error={billingErrors.taxNumber}
          hint="Csak céges vásárlás esetén."
          label="Adószám (céges vásárlásnál)"
          name={BILLING_INPUT_NAME.taxNumber}
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
              id={WAIVER_START_INPUT_ID}
              name="waiverStart"
              onChange={(event) => setWaiverStart(event.target.checked)}
              required
              type="checkbox"
            />
            <label htmlFor={WAIVER_START_INPUT_ID}>
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
              id={WAIVER_LOSS_INPUT_ID}
              name="waiverLoss"
              onChange={(event) => setWaiverLoss(event.target.checked)}
              required
              type="checkbox"
            />
            <label htmlFor={WAIVER_LOSS_INPUT_ID}>
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

      <div className="kc-checkout-form__actions">
        <Button disabled={submitting || alreadyPurchased || !waiverComplete} type="submit">
          {submitting ? 'Feldolgozás…' : product.isFree ? 'Hozzáférés megnyitása' : 'Megrendelés és fizetés'}
        </Button>
      </div>
    </form>
  )
}
