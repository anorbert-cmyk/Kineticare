'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'

import {
  browserSnapshotStorage,
  rememberCheckoutSnapshot,
  trackAddPaymentInfo,
  trackInitiateCheckout,
  trackInitiatePurchase,
  type BarionCourseInput,
  type BarionSnapshotStorage,
} from '@/lib/analytics/barion-events'
import { BarionFizetesJelzes } from '@/components/checkout/BarionFizetesJelzes'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { PriceTag } from '@/components/ui/PriceTag'
import type { BillingFieldName } from '../../lib/checkout/billing'
import type { GuestFieldName } from '../../lib/checkout/guest'
import { CTA_PROGRESS_LABELS, ctaLabel } from '../../lib/cta-vocabulary'
import {
  BILLING_INPUT_NAME,
  CHECKOUT_TERMS_HEADING,
  CHECKOUT_TERMS_HINT,
  CHECKOUT_TERMS_LABEL,
  GUEST_INPUT_NAME,
  TERMS_ASZF_PATH,
  TERMS_HINT_ID,
  TERMS_INPUT_ID,
  TERMS_NEW_TAB_HINT,
  TERMS_PRIVACY_PATH,
  WAIVER_LOSS_INPUT_ID,
  WAIVER_START_INPUT_ID,
  createCheckoutSubmitHandler,
  CHECKOUT_ERROR_REGION_ID,
  emptyGuestForm,
  prefillBillingForm,
  withBillingValue,
  withGuestValue,
  withoutBillingError,
  withoutGuestError,
  type BillingFieldErrors,
  type GuestFieldErrors,
} from '../../lib/checkout/form-submission'
import {
  submitCheckout,
  type CheckoutProduct,
  type CheckoutSubmitInput,
  type CheckoutSubmitResult,
  type CheckoutUser,
} from '../../lib/checkout-submit'

/**
 * A beküldést gátló feltétel magyarázatának elem-azonosítója. A gomb
 * `aria-describedby`-ja erre mutat, amíg van akadály.
 */
export const CHECKOUT_BLOCK_HINT_ID = 'kc-checkout-block-hint'

/**
 * CheckoutForm — a /penztar űrlapja (a vásárlás befejezése).
 *
 * A jogszabály szerinti két waiver-checkbox (45/2014. (II. 26.) Korm. rend.
 * 29. § (1) m) SZÓ SZERINTI szövegekkel, NEM előre kipipálva — mindkettő
 * kötelező a submit-hoz (a fizetős termékekre; az ingyenes tétel nem igényli).
 * A fizetési gomb felirata KÖTÖTT: „Megrendelés és fizetés".
 *
 * A HARMADIK jelölőnégyzet az ÁSZF-ELFOGADÁS (egy négyzet, két hivatkozással),
 * ami az ÁSZF 22. bekezdése szerint MAGA A SZERZŐDÉSKÖTÉS mozzanata — ez
 * MINDEN terméken kötelező, az ingyenesen is. A szövegek, útvonalak és a
 * döntés indoklása a form-submission.ts CHECKOUT_TERMS_* konstansainál.
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
 * A pénztár terméke → a Barion Pixel tétel-leírása.
 *
 * Az ár hiánya KÉT külön eset. Ingyenes kurzusnál a 0 a valós érték (a
 * `revenue: 0` legitim adat). Fizetős kurzusnál a hiányzó ár konfigurációs
 * hiba: ilyenkor `NaN` megy tovább, amit a `barion-events` érvénytelennek lát,
 * és az eseményt EL SEM KÜLDI. Kitalált (pl. 0 forintos) ár helyett a csend a
 * helyes válasz — az hamis bevételi adatot rögzítene.
 */
export function checkoutBarionCourse(product: CheckoutProduct): BarionCourseInput {
  return {
    id: product.id,
    name: product.sku,
    priceHuf: product.priceHuf ?? (product.isFree ? 0 : Number.NaN),
    quantity: 1,
  }
}

/** A követéssel BURKOLT beküldés injektálható függőségei (teszthez). */
export interface TrackedSubmitDeps {
  submit: (body: CheckoutSubmitInput) => Promise<CheckoutSubmitResult>
  storage: () => BarionSnapshotStorage | null
  addPaymentInfo: (course: BarionCourseInput) => boolean
  initiatePurchase: (course: BarionCourseInput, orderNumber: string | null) => boolean
  remember: (
    storage: BarionSnapshotStorage | null,
    orderNumber: string,
    course: BarionCourseInput,
  ) => boolean
}

/**
 * A beküldés Barion-követéssel BURKOLT változata.
 *
 * KÜLÖN, EXPORTÁLT GYÁR, szándékosan: a `form-submission.ts` fejkommentje
 * rögzíti a tanulságot — a MAG és a KOMPONENS KÖZTI huzalozás az a pont, amit
 * mutációval el lehet rontani úgy, hogy a teljes suite zöld marad. Ha ez a
 * burkoló a `deps`-objektumba beágyazott névtelen függvény lenne, a
 * „valóban kimegy-e az `addPaymentInfo` és az `initiatePurchase`" kérdésre
 * DOM nélkül nem lehetne állítást írni (jsdom nincs telepítve).
 *
 * A követés BURKOL, nem helyettesít: a `submitCheckout` eredménye
 * változatlanul megy tovább, és egyetlen Pixel-hívás sem dobhat (a
 * `barion-events` `sendBarionEvent`-je elnyeli a hibát) — a vásárlás így
 * akkor is végigmegy, ha a mérés elszáll. Az átirányítás útvonala
 * (`redirect`) érintetlen.
 *
 * MIÉRT ITT MEGY KI AZ `initiatePurchase`: a rendelésszám CSAK a szerver
 * válaszából derül ki, a `createCheckoutSubmitHandler` pedig az `ok`
 * eredményre feltétel nélkül, azonnal meghívja a `redirect`-et — ez tehát
 * pontosan az a pillanat, amikor a vevőt a Barion Smart Gateway-re küldjük.
 * (Refben átadni a rendelésszámot nem lehet: a `deps` objektum a
 * render-scope-ban készül, ref olvasása onnan a React-fordító szabályába
 * ütközik.)
 *
 * Ugyanitt tesszük el a kosár PILLANATKÉPÉT: a köszönőoldal a visszatérés
 * után már nem tudná, mit vettek (a státusz-végpont csak a státuszt és a
 * termék-id-t adja), a `purchase` eseménynek viszont KÖTELEZŐ a `contents`,
 * a `revenue` és a `currency`.
 */
export function trackedSubmitCheckout(
  product: CheckoutProduct,
  deps: TrackedSubmitDeps = {
    submit: submitCheckout,
    storage: browserSnapshotStorage,
    addPaymentInfo: trackAddPaymentInfo,
    initiatePurchase: trackInitiatePurchase,
    remember: rememberCheckoutSnapshot,
  },
): (body: CheckoutSubmitInput) => Promise<CheckoutSubmitResult> {
  return async (body) => {
    const course = checkoutBarionCourse(product)
    deps.addPaymentInfo(course)
    const result = await deps.submit(body)
    if (result.ok) {
      deps.remember(deps.storage(), result.orderNumber, course)
      deps.initiatePurchase(course, result.orderNumber)
    }
    return result
  }
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
      id={CHECKOUT_ERROR_REGION_ID}
      role="alert"
      // A `-1` azért kell, hogy a beküldés-kezelő PROGRAMBÓL ide tudja vinni a
      // fókuszt (a Tab-sorrendbe így sem kerül be). Enélkül a `focus()` no-op.
      tabIndex={-1}
    >
      {error}
    </div>
  )
}

export function CheckoutForm({ product, user, alreadyPurchased }: CheckoutFormProps) {
  const [waiverStart, setWaiverStart] = useState(false)
  const [waiverLoss, setWaiverLoss] = useState(false)
  /**
   * ÁSZF-elfogadás. A kezdőérték KÖTELEZŐEN `false`: az előre bepipált
   * elfogadás jogilag érvénytelen és sötét minta (GOV.UK Design System,
   * Checkboxes: „Do not pre-select checkbox options…"; NN/g: a jogi
   * jelölőnégyzet alapból üres). A hivatkozásokat a
   * `form-submission.ts` CHECKOUT_TERMS_* konstansainak fejkommentje sorolja.
   */
  const [termsAccepted, setTermsAccepted] = useState(false)
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

  /**
   * ═══ BARION PIXEL — a tölcsér középső szakasza ═══
   * A pénztár MEGNYITÁSA az `initiateCheckout` (1. lépés). A `contentView` a
   * kurzusoldalon, a `purchase` a köszönőoldalon megy ki; a köztes két lépés
   * (`addPaymentInfo`, `initiatePurchase`) itt, a beküldési láncba fűzve — a
   * `createCheckoutSubmitHandler` viselkedésének módosítása NÉLKÜL: a követés
   * a `submit` függvényt BURKOLJA, nem írja át, és az átirányítás útvonala
   * (`redirect`) érintetlen marad.
   */
  useEffect(() => {
    trackInitiateCheckout(
      checkoutBarionCourse({
        id: product.id,
        sku: product.sku,
        priceHuf: product.priceHuf,
        isFree: product.isFree,
      }),
    )
  }, [product.id, product.sku, product.priceHuf, product.isFree])

  const requiresWaiver = !product.isFree
  const waiverComplete = !requiresWaiver || (waiverStart && waiverLoss)
  /**
   * MI HIÁNYZIK MÉG a beküldéshez — a gomb MELLETT kiírva, magyarul. A gomb
   * nem tiltódik le tőle (lásd a beküldő-gomb melletti kommentet): ez az
   * `aria-describedby` célja, hogy a billentyűzetes és a képernyőolvasós
   * látogató a gombra érve azonnal megtudja, mi az akadály.
   */
  const blockReason: string | null = alreadyPurchased
    ? 'Ezt a kurzust már megvetted, ezért új rendelés nem indítható. A kurzusaid között éred el.'
    : !waiverComplete
      ? 'A fizetéshez pipáld ki mindkét nyilatkozatot az „Elállási jog” résznél.'
      : // Az akadályok sorrendje az ŰRLAP sorrendjét követi (waiver, majd
        // ÁSZF), hogy a magyarázat mindig a legelső hiányra mutasson — ez
        // ugyanaz a sorrend, amit a `planCheckoutSubmission` fókuszcélja visz.
        !termsAccepted
        ? `A vásárláshoz pipáld ki a nyilatkozatot a „${CHECKOUT_TERMS_HEADING}” résznél.`
        : null

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
      termsAccepted,
      billing,
      ...(isGuest ? { guest } : {}),
    }),
    setError,
    setBillingErrors,
    setGuestErrors,
    setSubmitting,
    focusElement,
    submit: trackedSubmitCheckout(product),
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
            hint="Ez a fiókod neve, a számlázási név ettől eltérhet (pl. cégnév)."
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
            ? 'A számla ezekkel az adatokkal készül, a rendelésre az itt megadott adat kerül.'
            : 'A számla ezekkel az adatokkal készül. Ha a profilodban máshogy szerepelnek, itt felülírhatod őket. A rendelésre az itt megadott adat kerül.'}
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
        /*
          ═══ VÉDEKEZŐ ÁG, NEM MŰKÖDŐ FUNKCIÓ (2026-08-17) ═══
          Ez az ág ma ELÉRHETETLEN: a `/penztar` LAP-SZINTŰ kapuja ingyenes
          terméknél (`isFreeCourse`) az űrlap helyett tájékoztató állapotot
          rendel, tehát `CheckoutForm` `isFree: true` proppal élesben nem
          renderelődik. Őre: `src/__tests__/penztar-ingyenes-kapu.test.tsx`.

          MIÉRT MARAD BENNE MÉGIS: a `product.isFree` prop, a
          `priceHuf: number | null` típus és a rá épülő tesztek kivezetése külön,
          nagyobb refaktor. Amíg az le nem fut, ez az ág VÉDEKEZÉS (ha valaki a
          kaput megkerülve rendereli a komponenst, ne fizetős felületet lásson),
          nem pedig egy támogatott út: az ingyenes kurzus valódi igénylése a
          kurzusoldal `FreeCourseRequestForm`-ján keresztül történik.
          A beküldése ezért sem működne: a `POST /api/checkout/start` ár-kapuja
          az ingyenes terméket garantáltan elutasítja.
        */
        <Card className="kc-checkout-waiver kc-checkout-waiver--free">
          <p>
            Ez a kurzus ingyenes — a hozzáférés a regisztrációd után azonnal megnyílik, fizetés
            és elállási nyilatkozat nélkül.
          </p>
        </Card>
      )}

      {/*
        ═══ SZERZŐDÉSI FELTÉTELEK — EGY jelölőnégyzet, KÉT hivatkozással ═══

        MIÉRT ITT ÁLL: az ÁSZF 22. bekezdése maga adja meg a sorrendet — a
        Vásárló „megadja személyes adatait, bejelöli az … jelölőnégyzetet,
        majd megnyomja a »VÁSÁRLÁS« gombot". A blokk ezért az adatmezők UTÁN,
        a beküldőgomb ELŐTT áll; ez egyben az utolsó dolog, amit a vevő a
        döntés előtt elolvas.

        MIÉRT AZ INGYENES ÁGON IS: a szerződés ingyenes hozzáférésnél is
        létrejön, és az ÁSZF felhasználási korlátja az ismeretterjesztő videóra
        is vonatkozik. Elágazás nélkül, egységesen — WCAG 2.2 SC 3.2.4.

        ÚJ LAPON NYÍLÓ LINKEK: a pénztár űrlapállapota kliens-oldali React-state,
        a saját lapon való elnavigálás tehát elvesztené a beírt számlázási
        adatokat. Az `új lapon nyílik` a link SZÖVEGÉNEK része (vizuálisan
        rejtve), hogy a képernyőolvasó is előre jelezze — WCAG 2.2 SC 3.2.5,
        G201 technika.

        A jelölőnégyzet a felirat BAL oldalán áll (GOV.UK Design System,
        Checkboxes: „Always position checkboxes to the left of their labels."),
        és a `label for` miatt maga a felirat is kattintható (NN/g:
        „clickable labels").
      */}
      <Card className="kc-checkout-terms">
        <h2>{CHECKOUT_TERMS_HEADING}</h2>
        <div className="kc-checkout-terms__row">
          <input
            aria-describedby={TERMS_HINT_ID}
            checked={termsAccepted}
            className="kc-checkout-terms__checkbox"
            id={TERMS_INPUT_ID}
            name="consentTerms"
            onChange={(event) => setTermsAccepted(event.target.checked)}
            required
            type="checkbox"
          />
          <label className="kc-checkout-terms__label" htmlFor={TERMS_INPUT_ID}>
            {CHECKOUT_TERMS_LABEL.before}
            <a href={TERMS_ASZF_PATH} rel="noopener noreferrer" target="_blank">
              {CHECKOUT_TERMS_LABEL.aszfLabel}
              <span className="kc-visually-hidden">{TERMS_NEW_TAB_HINT}</span>
            </a>
            {CHECKOUT_TERMS_LABEL.between}
            <a href={TERMS_PRIVACY_PATH} rel="noopener noreferrer" target="_blank">
              {CHECKOUT_TERMS_LABEL.privacyLabel}
              <span className="kc-visually-hidden">{TERMS_NEW_TAB_HINT}</span>
            </a>
            {CHECKOUT_TERMS_LABEL.after}
          </label>
        </div>
        <p className="kc-field__hint" id={TERMS_HINT_ID}>
          {CHECKOUT_TERMS_HINT}
        </p>
      </Card>

      {/*
        FIZETÉSI SZOLGÁLTATÓ — a hivatalos Barion logósor és a folyamat
        leírása, KÖZVETLENÜL a fizetőgomb fölött.

        Miért itt: ez az utolsó dolog, amit a vevő a kattintás előtt elolvas, és
        itt derül ki neki, hogy elhagyja az oldalt. Baymard („placing 1-2 icons
        within the encapsulated area performs well…") és NN/g Upfront Disclosure
        — a hivatkozások és az idézetek a BarionFizetesJelzes fejkommentjében.
        Egyben a Barion elfogadóhely-jóváhagyás kötelező tétele a fizetési
        oldalon.

        INGYENES terméknél NEM jelenik meg: ott nincs fizetés, nem megy Barion
        felé semmi, és a jelzés hazugság lenne (docs/ui-sztenderdek.md: „a
        felirat legyen igaz").
      */}
      {product.isFree ? null : <BarionFizetesJelzes hely="penztar" />}

      {/*
        A FIZETŐGOMB LETILTÁSA — mit tiltunk le és mit nem (2026-08-16-i
        akadálymentességi kör, docs/gomb-kontraszt-audit.md B8).

        KORÁBBAN: `disabled={submitting || alreadyPurchased || !waiverComplete}`.
        A natív `disabled` KIESIK A TAB-SORRENDBŐL, ezért a billentyűzetes vevő
        addig, amíg nem pipálta ki a két elállási nyilatkozatot, a fizetőgombig
        el sem jutott — és semmi nem mondta meg neki, miért nem működik. A
        felirat ráadásul `opacity: .5` mellett 2,12:1 volt, tehát a „Megrendelés
        és fizetés" gyakorlatilag olvashatatlan.

        MOST: a gomb csak a BEKÜLDÉS IDEJÉRE tiltódik le (dupla küldés elleni
        védelem — docs/ui-sztenderdek.md §2.6 L-1; a szerveroldali idempotencia
        emellett is megvan, L-2). A kipipálatlan nyilatkozat és a már megvett
        kurzus NEM tiltás, hanem VALIDÁCIÓ: a `planCheckoutSubmission`
        `blocked` ága magyar hibaüzenetet ad az élő régióba (role="alert"), és a
        fókuszt az első hiányzó jelölőnégyzetre viszi. Ez a GOV.UK gomb-
        útmutatójának ajánlása (a letiltott gomb nem közli, mi a teendő):
        https://design-system.service.gov.uk/components/button/
        A hiányzó feltételt a gomb MELLETT álló magyarázat is kimondja, és az
        `aria-describedby` a gombhoz köti (W3C ARIA APG, button-minta):
        https://www.w3.org/WAI/ARIA/apg/patterns/button/
      */}
      <div className="kc-checkout-form__actions">
        <Button
          describedBy={blockReason === null ? undefined : CHECKOUT_BLOCK_HINT_ID}
          disabled={submitting}
          type="submit"
        >
          {/* A FELIRATOK A SZÓTÁRBÓL (2026-08-18). A fizetős ág a §3.2 #2
              („Megrendelem és fizetek") — a korábbi „Megrendelés és fizetés"
              deverbális főnévi alak volt (M-1), pedig ez a visszavonhatatlan
              lépés (P-1a → E/1).

              Az INGYENES ág a §3.2 #26 („Kérem a kurzust") sorát kapja, NEM
              külön szótári sort: a látogató szemszögéből ugyanaz a cselekvés,
              mint a kurzusoldal igénylő űrlapjának beküldése — űrlapot küld be,
              és hozzáférést kap. Külön felirat („Hozzáférés megnyitása") ugyanarra
              a funkcióra a WCAG 2.2 · 3.2.4-et sértené, ráadásul deverbális
              főnévi alak volt. (Ez az ág egyébként VÉDEKEZŐ: a lap-szintű kapu
              ingyenes terméken az űrlap helyett tájékoztató állapotot rendel.) */}
          {submitting
            ? CTA_PROGRESS_LABELS.processing
            : product.isFree
              ? ctaLabel('free-course-request')
              : ctaLabel('checkout-submit')}
        </Button>
        {blockReason === null ? null : (
          <p className="kc-checkout-form__block-hint" id={CHECKOUT_BLOCK_HINT_ID}>
            {blockReason}
          </p>
        )}
      </div>
    </form>
  )
}
