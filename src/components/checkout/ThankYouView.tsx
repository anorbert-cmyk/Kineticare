'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { captureAnalyticsEvent } from '@/lib/analytics/posthog'
import { checkoutHref } from '../../lib/courses'
import { pollOrderStatus } from '../../lib/order-status-poll'

/**
 * ThankYouView — a köszönőoldal kliens-oldali viselkedése.
 *
 * A rendelés-státuszt 2 mp-enként poll-ozza a GET /api/orders/[orderNumber]/status
 * végponton; a `paid` átmenet után siker-nézet, 2 perc után „feldolgozás
 * alatt" + e-mail-ígéret, `cancelled`/`payment_failed` esetén a
 * /sikertelen-nek megfelelő nézet.
 */
export interface ThankYouViewProps {
  orderNumber: string | null
}

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 120000 // 2 perc

type ViewState =
  | { kind: 'polling'; attempts: number }
  | { kind: 'paid' }
  | { kind: 'timeout' }
  /** productId: az „Újrapróbálom" link célához (a státuszválasz hozza). */
  | { kind: 'failed'; status: string; productId: number | null }
  | { kind: 'unauthorized' }
  | { kind: 'not-found' }

/**
 * ═══ MIÉRT NEM „Köszönjük a vásárlást!" ═══
 * A Barion EGYETLEN visszatérési címet ismer: a hivatalos leírás szerint a
 * `RedirectUrl` az a cím, ahova a fizető „after the payment is completed OR
 * CANCELED" kerül. Vagyis ide fut be a sikeres, a megszakított ÉS az
 * elutasított fizetés is. A vendég-vásárlónak pedig nincs munkamenete, tehát
 * az állapot-lekérdezés neki mindig 401 — ezen az ágon a lap SOSEM tudja,
 * mi történt.
 *
 * A folyamat-audit ezt négy állapoton mérte ki (valós fiókos és valós
 * VENDÉG `payment_failed`, valós `paid`, és egy KITALÁLT rendelésszám):
 * mind a négy ugyanazt a „Köszönjük a vásárlást! … Több teendőd nincs."
 * képernyőt kapta. Akinek a kártyáját elutasították, azt a rendszer
 * tájékoztatta, hogy vásárolt, és várjon egy e-mailt, ami sosem jön.
 *
 * Ez a szöveg ezért nem állít semmit a kimenetelről, csak azt mondja el, ami
 * IGAZ: belépés nélkül nem látjuk az állapotot, és mindkét lehetséges
 * kimenetelre megmondja a következő lépést. NN/g #1 (a rendszer állapotát
 * őszintén kell közölni) és a projekt „a felirat legyen igaz" szabálya.
 *
 * A fizetési állapotgéphez ez a javítás NEM nyúl (tilos zóna): kizárólag
 * ennek az ágnak a SZÖVEGE változik.
 */export function ThankYouUnauthorized({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="kc-thankyou" role="status">
      <h1>Nem látjuk, mi történt a fizetéssel</h1>
      <p>
        Ehhez a rendeléshez be kell lépned, különben nem tudjuk megmutatni, sikerült-e a
        fizetés.
      </p>
      <p>
        <strong>Ha sikerült:</strong> a visszaigazolót e-mailben küldjük. Ha vendégként
        vásároltál, a levélben egy jelszó-beállító link is lesz, azzal nyílik meg a fiókod a
        kurzussal.
      </p>
      <p>
        <strong>Ha megszakítottad vagy elutasították:</strong> a fizetés nem történt meg, és
        nyugodtan újrapróbálhatod.
      </p>
      <p className="kc-thankyou__order">
        Rendelésszám: <strong>{orderNumber}</strong>
      </p>
      <div className="kc-thankyou__actions">
        <Button href={`/belepes?returnUrl=${encodeURIComponent('/fizetes/koszonom?order=' + orderNumber)}`}>
          Belépés
        </Button>
        <Button href="/kurzusok" variant="secondary">
          Vissza a kurzusokhoz
        </Button>
      </div>
    </div>
  )
}

export function ThankYouView({ orderNumber }: ThankYouViewProps) {
  const [state, setState] = useState<ViewState>({ kind: 'polling', attempts: 0 })

  useEffect(() => {
    // A hiányzó rendelésszám a PROPBÓL következik (szerver-oldalról érkezik,
    // tehát a szerver- és a kliens-render azonos): ezt a nézetet renderben
    // döntjük el, nem állapotba írjuk. Az effekt ilyenkor nem poll-oz.
    //
    // A BEJELENTKEZETTSÉGET viszont NEM propból tudjuk: ez az oldal mindig
    // kereszt-oldali navigációval nyílik (Barion-visszairányítás), ahol a
    // csrf-engedélylista miatt a szerver nem látja a süti-tokent. A poll
    // azonos eredetű `fetch`, az KÜLD `Origin`-t — a 401 → `unauthorized`
    // állapot dönti el, hogy tényleg nincs-e bejelentkezve. Részletes
    // indoklás: src/app/(frontend)/fizetes/koszonom/page.tsx fejléce.
    if (!orderNumber) {
      return
    }

    let cancelled = false
    let attempts = 0
    const startedAt = Date.now()

    const tick = async (): Promise<void> => {
      if (cancelled) {
        return
      }
      attempts += 1
      const result = await pollOrderStatus(orderNumber)
      if (cancelled) {
        return
      }

      if (result.kind === 'status') {
        const status = result.status
        if (status === 'paid') {
          setState({ kind: 'paid' })
          // PostHog funnel-záró esemény (no-op consent nélkül).
          captureAnalyticsEvent('purchase_confirmed', { orderNumber })
          return
        }
        if (status === 'cancelled' || status === 'payment_failed') {
          setState({ kind: 'failed', status, productId: result.productId })
          return
        }
      } else if (result.kind === 'not-found') {
        setState({ kind: 'not-found' })
        return
      } else if (result.kind === 'unauthorized') {
        setState({ kind: 'unauthorized' })
        return
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setState({ kind: 'timeout' })
        return
      }
      setState({ kind: 'polling', attempts })
      window.setTimeout(tick, POLL_INTERVAL_MS)
    }

    void tick()
    return () => {
      cancelled = true
    }
  }, [orderNumber])

  // Propokból közvetlenül következő nézetek (állapot nélkül).
  if (!orderNumber) {
    return (
      <div className="kc-thankyou" role="status">
        <h1>Köszönjük!</h1>
        <p>Hiányzik a rendelésszám a hivatkozásból. A rendelésedet a Kurzusaim oldalon találod.</p>
        <Button href="/kurzusaim">Kurzusaim</Button>
      </div>
    )
  }

  if (state.kind === 'paid') {
    return (
      <div aria-live="polite" className="kc-thankyou kc-thankyou--paid" role="status">
        <h1>Köszönjük a vásárlást!</h1>
        <p>
          A fizetésed sikeresen megérkezett. A kurzust a{' '}
          <Link href="/kurzusaim">Kurzusaim</Link> oldalon éred el.
        </p>
        <p className="kc-thankyou__order">
          Rendelésszám: <strong>{orderNumber}</strong>
        </p>
        <div className="kc-thankyou__actions">
          <Button href="/kurzusaim">Tovább a kurzusaimhoz</Button>
          <Button href="/" variant="secondary">Vissza a kezdőlapra</Button>
        </div>
      </div>
    )
  }

  if (state.kind === 'timeout') {
    return (
      <div aria-live="polite" className="kc-thankyou kc-thankyou--timeout" role="status">
        <h1>A fizetésed feldolgozása folyamatban</h1>
        <p>
          A bank még dolgozik a fizetésed jóváhagyásán. Ez általában néhány percet vesz igénybe —
          amint megérkezik a visszaigazolás, <strong>e-mailben értesítünk</strong>, és a kurzus
          megjelenik a Kurzusaim oldalon.
        </p>
        <p className="kc-thankyou__order">
          Rendelésszám: <strong>{orderNumber}</strong>
        </p>
        <div className="kc-thankyou__actions">
          <Button href="/kurzusaim">Nézd meg a kurzusaimat</Button>
          <Button href="/" variant="secondary">Vissza a kezdőlapra</Button>
        </div>
      </div>
    )
  }

  if (state.kind === 'failed') {
    // Az Újrapróbálom a TERMÉKRE mutat (a /penztar numerikus termék-id-t vár) —
    // korábban a rendelésszám került a termék-paraméterbe, ami a pénztár
    // „nincs kiválasztott termék" ágára vezetett (zsákutca). Ha a termék-id
    // nem feloldható, a kurzuslista a biztonságos cél.
    const retryHref =
      state.productId !== null ? checkoutHref(state.productId) : '/kurzusok'
    return (
      <div aria-live="assertive" className="kc-thankyou kc-thankyou--failed" role="alert">
        <h1>A fizetés nem sikerült</h1>
        <p>
          A fizetésedet a bank elutasította vagy megszakította. Semmi sem került levonásra —
          újrapróbálhatod bármikor.
        </p>
        <div className="kc-thankyou__actions">
          <Button href={retryHref}>Újrapróbálom</Button>
          <Button href="/kapcsolat" variant="secondary">Segítséget kérek</Button>
        </div>
      </div>
    )
  }

  // 401 — nincs (érvényes) munkamenet. Ez KÉT esetet fed le:
  //  - VENDÉG-VÁSÁRLÁS: a vevő bejelentkezés nélkül fizetett, a fiókja most
  //    készül. Neki nincs mit tennie, és belépni sem tud még — ezért a szöveg
  //    elsőként az e-mailre irányít (ott érkezik a jelszó-beállító link), a
  //    belépés csak másodlagos ajánlat;
  //  - lejárt munkamenet egy meglévő fióknál: neki a belépés a helyes út.
  // A korábbi, feltétel nélküli „jelentkezz be" a vendégnek zsákutca volt.
  if (state.kind === 'unauthorized') {
    return <ThankYouUnauthorized orderNumber={orderNumber} />
  }

  if (state.kind === 'not-found') {
    return (
      <div className="kc-thankyou" role="status">
        <h1>A rendelés nem található</h1>
        <p>
          A megadott rendelésszámmal ({orderNumber}) nem találunk rendelést a fiókodban. Ha a
          fizetésedet elindítottad, a banki visszaigazolás még úton lehet — nézz vissza pár perc
          múlva a Kurzusaim oldalra, vagy írj nekünk.
        </p>
        <div className="kc-thankyou__actions">
          <Button href="/kurzusaim">Kurzusaim</Button>
          <Button href="/kapcsolat" variant="secondary">Kapcsolat</Button>
        </div>
      </div>
    )
  }

  return (
    <div aria-live="polite" className="kc-thankyou kc-thankyou--polling" role="status">
      <h1>Köszönjük — feldolgozzuk a fizetésedet</h1>
      <p>
        A bank visszaigazolására várunk… Ez általában néhány másodperc. Ne zárd be az oldalt.
      </p>
      <p className="kc-thankyou__spinner" aria-hidden="true">⏳</p>
    </div>
  )
}
