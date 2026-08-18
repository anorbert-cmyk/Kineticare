import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

import { TrackEvent } from '@/components/analytics/TrackEvent'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { courseCtaHref } from '@/lib/course-url'
import { ctaLabel } from '@/lib/cta-vocabulary'
import {
  FREE_COURSE_ALREADY_GRANTED_TEXT,
  FREE_COURSE_NOT_CHECKOUT_TEXT,
} from '@/lib/free-course/ui-text'
import { logger } from '@/lib/logger'
import {
  MY_COURSES_PATH,
  UNAVAILABLE_COURSE_NOTE,
  coursePriceHuf,
  courseTitle,
  hasUserPurchased,
  isFreeCourse,
  isPaidCourse,
} from '@/lib/courses'
import type { Product, User } from '@/payload-types'

import config from '../../../payload.config'

export const metadata: Metadata = {
  title: 'Pénztár',
  description: 'A vásárlás befejezése: számlázási adatok és a digitális tartalom elállási joga.',
}

interface PenztarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return (user as User | null) ?? null
  } catch {
    return null
  }
}

async function getProductById(id: number): Promise<Product | null> {
  try {
    const payload = await getPayload({ config })
    return await payload.findByID({ collection: 'products', id, depth: 1, overrideAccess: true })
  } catch (error) {
    logger.warn('penztár: termék-lekérdezés sikertelen', { productId: id, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * /penztar — a vásárlás befejezése.
 *
 * - VENDÉG-VÁSÁRLÁS (tulajdonosi döntés, 2026-08-15): az oldal bejelentkezés
 *   NÉLKÜL is használható. Korábban az anonim látogatót
 *   /belepes?returnUrl=… -re irányítottuk; most az űrlap az azonosító
 *   mezőkkel (e-mail + név) jelenik meg, és a fiók a FIZETÉS UTÁN jön létre
 *   (vagy találódik meg az e-mail alapján). Bejelentkezve minden a régi: a
 *   profil előkitölti a mezőket, a rendelés a fiókhoz kötődik.
 * - A termék KIZÁRÓLAG a ?termek={id} query-ből jön. A kosár localStorage-os,
 *   kliens-oldali — a szerver-komponens a 'use client'-es readCart()-ot NEM
 *   hívhatja (korábbi kosár-fallback ág garantált render-hiba volt, M8); a
 *   /kosar oldalról a CartView teszi a termék-id-t a pénztár-linkbe.
 * - A két waiver-checkbox (a 45/2014. Korm. rend. 29. § (1) m) szövegei SZÓ
 *   SZERINT) csak a fizetős termékekre vonatkozik — az ingyenes tétel
 *   (priceInHUFEnabled: false) nem igényel waiver-t és nem megy a Barion
 *   checkouton keresztül.
 * - ARCHIVÁLT terméknél az űrlap helyett tájékoztató állapot jelenik meg (a
 *   beküldés úgyis 400-zal hasalna el).
 * - HIÁNYOS ÁR-KONFIGURÁCIÓNÁL (a HARMADIK ár-állapot) szintén: az indoklás és
 *   a források az `isPaidCourse` kapunál.
 * - INGYENES terméknél UGYANEZ a minta (2026-08-17): a pénztár nem az ő útja,
 *   ezért tájékoztató állapot megy ki, egyetlen továbblépéssel a kurzusoldal
 *   igénylő űrlapjára. Az indoklás és a források az `isFree` kapunál.
 * - A fizetési gomb felirata KÖTÖTT: „Megrendelés és fizetés".
 */
export default async function PenztarPage({ searchParams }: PenztarPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  const termekParam = params.termek
  const termekId =
    typeof termekParam === 'string' && /^\d+$/.test(termekParam.trim())
      ? Number(termekParam.trim())
      : null

  // A termék meghatározása: KIZÁRÓLAG a query (a kosár kliens-oldali; a
  // /kosar oldal CartView-je teszi a termék-id-t a pénztár-linkbe — M8).
  let product: Product | null = null
  if (termekId !== null) {
    product = await getProductById(termekId)
  }

  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    return (
      <Section>
        <Container size="narrow">
          <h1>Pénztár</h1>
          <div className="kc-cart-empty" role="status">
            <p>Nincs kiválasztott termék a fizetéshez.</p>
            {/* A felirat a §3.2 #10 szótári sora: ugyanaz a cselekvés (a
                kurzuslistára lépés) a lap MINDEN végállapotában ugyanazt a
                szót kapja (WCAG 2.2 SC 3.2.4). A korábbi „Válassz kurzust"
                a `docs/gomb-inventar.md` A/6 megállapítása szerint a nyolc
                párhuzamos felirat egyike volt. */}
            <Link className="kc-button kc-button--primary" href="/kurzusok">
              {ctaLabel('course-list-open')}
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  // Archivált terméknél az űrlap helyett tiszta tájékoztató állapot: a beküldés
  // úgyis 400-zal hasalna el („Ez a termék már nem megvásárolható (archivált)."),
  // a díszlet-űrlap pedig a néma hiba kínosabbik fajtája.
  if (product.status === 'archived') {
    return (
      <Section>
        <Container size="narrow">
          <h1>Pénztár</h1>
          <div className="kc-cart-empty" role="status">
            <p>Ez a kurzus jelenleg nem vásárolható meg.</p>
            <Link className="kc-button kc-button--primary" href="/kurzusok">
              {ctaLabel('course-list-open')}
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  // Vendégként nincs mit összevetni: a „már megvetted" állapotot a szerver a
  // fizetés indításakor (e-mail alapján) is ellenőrzi, 409-cel.
  const alreadyPurchased = user !== null && hasUserPurchased(user.purchases, product.id)
  const price = coursePriceHuf(product)
  const isFree = isFreeCourse(product)

  /**
   * ═══ INGYENES KURZUS: A PÉNZTÁR NEM AZ Ő ÚTJA (2026-08-17) ═══
   *
   * A HIBA, AMIT BEZÁR. A `/penztar?termek=<ingyenes-id>` eddig teljes értékű
   * űrlapot rendelt („Hozzáférés megnyitása" gombbal), a beküldés viszont a
   * `POST /api/checkout/start`-ra ment, ahol az ár-kapu garantáltan elutasítja:
   * `coursePriceHuf` az ingyenes terméken `null`, tehát „A termékhez nem
   * tartozik érvényes ár, így nem vásárolható meg." (start-checkout.ts). A lap
   * tehát egy működőnek LÁTSZÓ űrlapot mutatott, ami sosem járhatott sikerrel:
   * a vevő kitöltötte a számlázási adatait és elfogadta a nyilatkozatokat, hogy
   * a végén magyarázat nélküli hibát kapjon.
   *
   * MIÉRT ÁLLAPOT ÉS NEM ÁTIRÁNYÍTÁS. Ugyanaz az érv, amit a fenti archivált ág
   * kommentje kimond: „a díszlet-űrlap a néma hiba kínosabbik fajtája". A néma
   * átirányítás viszont az OKOT rejtené el — NN/g, Error-Message Guidelines:
   * „Concisely and precisely describe the issue" és „Offer constructive
   * advice. Merely stating the problem is also not enough; offer some potential
   * remedies." https://www.nngroup.com/articles/error-message-guidelines/
   * A lap másik két végállapota (nincs termék, archivált) szintén állapotot
   * mutat, nem irányít át — a harmadik sem térhet el ettől (WCAG 2.2 SC 3.2.4,
   * Consistent Identification).
   *
   * EGYETLEN TOVÁBBLÉPÉS. GOV.UK Design System, Button: „Avoid using multiple
   * default buttons on a single page. Having more than one main call to action
   * reduces their impact, and makes it harder for users to know what to do
   * next." https://design-system.service.gov.uk/components/button/
   *
   * HOVA VISZ. Az ingyenes kurzus VALÓDI útja a kurzusoldal vásárlódobozában
   * álló igénylő űrlap (`FreeCourseRequestForm`), aminek a horgonya a
   * `COURSE_CTA_ANCHOR`. Aki már megkapta, annak nincs mit igényelnie: őt a
   * Kurzusaim várja.
   *
   * A FELIRATOK a §3.2 CTA-szótárból jönnek (`cta-vocabulary.ts`), nem
   * literálként — így a G-UI1 őr védi őket: #3 `Elindítom ingyen` (E/1,
   * `secondary`) a másik dokumentumba vivő igénylés-belépőre, #9 `Nyisd meg a
   * kurzusaidat` (E/2, `secondary`) a meglévő hozzáférésre. Mindkét sor súlya
   * a szótárban `secondary` (C-2: ugyanaz a cselekvés = ugyanaz a súly); ezt
   * az őr-teszt méri, hogy a lap és a szótár ne csúszhasson szét.
   */
  if (isFree) {
    return (
      <Section>
        <Container size="narrow">
          <h1>Pénztár</h1>
          <div className="kc-cart-empty" role="status">
            <p>
              {alreadyPurchased
                ? FREE_COURSE_ALREADY_GRANTED_TEXT
                : FREE_COURSE_NOT_CHECKOUT_TEXT}
            </p>
            <Button
              href={alreadyPurchased ? MY_COURSES_PATH : courseCtaHref(product)}
              variant="secondary"
            >
              {ctaLabel(alreadyPurchased ? 'my-courses-open' : 'free-course-claim')}
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  /**
   * ═══ A HARMADIK ÁR-ÁLLAPOT: HIÁNYOS KONFIGURÁCIÓ (2026-08-17) ═══
   *
   * A HIBA, AMIT BEZÁR. A fenti ingyenes-kapu feltétele az `isFreeCourse`,
   * vagyis KIZÁRÓLAG a tudatosan kivett ár-pipa. Átcsúszott rajta minden olyan
   * PUBLIKÁLT termék, ahol az ár-pipa BE van kapcsolva, de az ár üres, 0 vagy
   * negatív, illetve ahol a pipa BEÁLLÍTATLAN (a szerkesztő hozzá sem nyúlt).
   * Ezek a termékek teljes értékű pénztár-űrlapot kaptak, vendég- és
   * számlázási mezőkkel, jogszabályi nyilatkozatokkal és fizetés-gombbal, DE
   * ÁR NÉLKÜL — a beküldést pedig a checkout ár-kapuja garantáltan elutasítja:
   * „A termékhez nem tartozik érvényes ár, így nem vásárolható meg."
   * (`assertPurchasable`, src/lib/checkout/start-checkout.ts). Ugyanaz a
   * díszlet-űrlap, amit az archivált ág kommentje már egyszer kimondott.
   *
   * A FELTÉTEL az `isPaidCourse` (ÉRVÉNYES ár), nem a `!isFreeCourse`. A
   * `courses.ts` fejkommentje szerint a „fizetős" és az „ingyenes" NEM egymás
   * tagadása: a harmadik halmaz a hiányos konfiguráció. A kurzusoldal
   * CTA-állapotgépe (`resolveCourseCta`) 2026-08-16 óta pontosan így dönt —
   * a pénztár most ugyanazt a HÁROM állapotot ismeri, tehát a két felület nem
   * mondhat mást ugyanarról a termékről (WCAG 2.2 SC 3.2.4 Consistent
   * Identification). A kapu ugyanazt a `coursePriceHuf`-ot hívja, mint a
   * checkout, tehát a kettő nem tud egymástól elsodródni.
   *
   * A SZÖVEG az `UNAVAILABLE_COURSE_NOTE`, vagyis szó szerint ugyanaz a mondat,
   * amit a látogató a kurzusoldalon is olvas ugyanerre az állapotra. NN/g,
   * Error-Message Guidelines: „Concisely and precisely describe the issue." és
   * „Merely stating the problem is also not enough; offer some potential
   * remedies." https://www.nngroup.com/articles/error-message-guidelines/
   *
   * EGYETLEN TOVÁBBLÉPÉS, szótári felirattal (§3.2 #10). GOV.UK Design System,
   * Button: „Avoid using multiple default buttons on a single page."
   * https://design-system.service.gov.uk/components/button/
   *
   * MIÉRT NINCS külön „már megvetted" ág (szemben az ingyenes kapuval): a lap
   * archivált ága sem különböztet, és ez az állapot SZERKESZTŐI HIBA, nem a
   * termék életciklusa — a meglévő vevőt a Kurzusaim a főmenüből is várja. Az
   * ingyenes ág azért tér el, mert ott a „már megkaptam" a NORMÁLIS eset.
   *
   * A staff külön RIASZTÁST kap ezekről a rekordokról
   * (`reportUnpricedPublishedCourses`, src/lib/courses.ts).
   */
  if (!isPaidCourse(product)) {
    return (
      <Section>
        <Container size="narrow">
          <h1>Pénztár</h1>
          <div className="kc-cart-empty" role="status">
            <p>{UNAVAILABLE_COURSE_NOTE}</p>
            <Link className="kc-button kc-button--primary" href="/kurzusok">
              {ctaLabel('course-list-open')}
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section>
      <Container size="narrow">
        {/* PostHog funnel-lépés: a pénztár megnyitása (no-op consent nélkül). */}
        <TrackEvent event="checkout_started" properties={{ courseId: product.id, courseSku: product.sku ?? undefined }} />
        <h1>Pénztár</h1>
        {alreadyPurchased ? (
          <div className="kc-cart-notice" role="status">
            <p>
              Ezt a kurzust már megvetted — a{' '}
              <Link href="/kurzusaim">Kurzusaim</Link> oldalon éred el.
            </p>
          </div>
        ) : null}
        <CheckoutForm
          product={{
            id: product.id,
            sku: courseTitle(product),
            priceHuf: price,
            isFree,
          }}
          user={
            user === null
              ? null
              : {
                  name: user.name,
                  email: user.email,
                  billingName: user.billingName,
                  billingZip: user.billingZip,
                  billingCity: user.billingCity,
                  billingStreet: user.billingStreet,
                  taxNumber: user.taxNumber,
                }
          }
          alreadyPurchased={alreadyPurchased}
        />
      </Container>
    </Section>
  )
}
