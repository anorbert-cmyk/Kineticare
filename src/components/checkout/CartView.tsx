'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PriceTag } from '@/components/ui/PriceTag'
import {
  CART_FREE_LABEL,
  cartItemAvailability,
  cartItemNote,
  cartScopeNote,
  useCart,
  type CartItem,
} from '../../lib/cart'
import { COURSE_BASE_PATH, courseCtaHref, courseHref } from '../../lib/course-url'
import { checkoutHref } from '../../lib/courses'
import { ctaLabel } from '../../lib/cta-vocabulary'

/**
 * CartView — a kosár kliens-oldali megjelenítése (tételek, kivétel, végösszeg,
 * továbblépés).
 *
 * - A tételek a localStorage-cartból jönnek; a szerver-oldali initialItem a
 *   /kosar?termek={id} konvenciót fogadja (a kliens hozzáadja, duplikáció nélkül).
 * - A pénztár-link a termék-id-t is viszi (/penztar?termek={id}): a pénztár
 *   szerver-oldala a kosárhoz NEM fér hozzá (localStorage, M8), így a query az
 *   egyetlen csatorna.
 * - A végösszeg MEGJELENÍTÉSRE — a fizetendő összeg a checkout során a
 *   szerver (T-021) válaszából igazolódik vissza.
 * - Üres kosár: segítő szöveg + CTA a kurzusokra.
 *
 * ═══ TÉTELENKÉNTI CSELEKVÉS (2026-08-18) ═══
 * A felület KÉT SZINTEN beszél, és a kettő nem keveredik:
 *
 *  1. A TÉTEL SORA mindent elmond, ami csak arra a tételre igaz: az árát vagy
 *     az „Ingyenes" címkéjét, a magyarázatot, ha nem vásárolható, és a SAJÁT
 *     cselekvését. Az ingyenes tétel útja az igénylő űrlap (`courseCtaHref`),
 *     a nem vásárolhatóé a kivétel a kosárból. Minden sor kivehető.
 *  2. A SÁV a pénzről és a következő lépésről beszél: mennyit fizetsz most,
 *     miért annyit, és hova mész tovább.
 *
 * MIÉRT ÍGY: a 2026-08-17-i változatban egyetlen archivált tétel elvette az
 * EGÉSZ kosár fizetés-gombját. Baymard mérése szerint ha a látogatót csak
 * annyival intézik el, hogy a termék nem kapható, 30% azonnal máshol keresi
 * tovább (https://baymard.com/blog/handling-out-of-stock-products), és a
 * javaslat kifejezetten az, hogy a vásárlás maradjon nyitva. NN/g,
 * Error-Message Guidelines: „Display the error message close to the error's
 * source." és „Merely stating the problem is also not enough; offer some
 * potential remedies." (https://www.nngroup.com/articles/error-message-guidelines/)
 * — a magyarázat ezért a SORBAN áll, nem a sáv aljában.
 *
 * A sáv állapotai (`cartSummary`, src/lib/cart.ts):
 *  - `amount`  — van megvehető tétel → a pénztár útja (§3.2 #20). Ha a
 *                kosárban más is van, a sáv KIMONDJA, mire vonatkozik a
 *                fizetés (`cartScopeNote`);
 *  - `free`    — nincs megvehető, de van ingyenes tétel → a sávnak nincs
 *                gombja, mert az igénylés a tétel saját sorában áll;
 *  - `blocked` — EGYETLEN tétel sem vásárolható és nem is igényelhető → nincs
 *                végösszeg, és a sáv EGY alternatívát ad (kurzuslista).
 *
 * MIÉRT NEM LETILTOTT GOMB a blokkolt ág: GOV.UK Design System, Button —
 * „Disabled buttons have poor contrast and can confuse some users, so avoid
 * them if possible." és „Avoid using multiple default buttons on a single
 * page." (https://design-system.service.gov.uk/components/button/). Ugyanezt
 * mondja ki a kurzusoldal Á-3 szabálya, ahol a nem vásárolható terméknek
 * SZÁNDÉKOSAN nincs feliratú CTA-ja — a kosár nem mondhat mást ugyanarról a
 * termékről (WCAG 2.2 SC 3.2.4 Consistent Identification).
 *
 * EGY ELSŐDLEGES GOMB A LAPON: a sáv `primary` gombja (pénztár VAGY
 * kurzuslista, sosem mindkettő) mellett a sorok cselekvései `secondary` és
 * `ghost` súlyt kapnak — a §3.2 C-2 szabálya szerinti súlyokat, tehát a
 * súly-választás nem ízlés kérdése.
 *
 * ═══ A FELIRATOK ═══
 * Mind a §3.2 CTA-szótárból (`cta-vocabulary.ts`) olvasva, nem literálként —
 * így a G-UI1 őr védi őket. Ez zárja be a `docs/gomb-inventar.md`-ben
 * 2026-08-16 óta rögzített két hibát: a „Tovább a penztárhoz" ELGÉPELÉST (és a
 * §3.2-ben tiltott puszta „Tovább…" kezdést), valamint a „Törlés" feliratot
 * (Carbon: a *remove* ≠ *delete*, a kosárból kivett tétel nem semmisül meg).
 *
 * ═══ AZ ÁR FORMÁZÁSA ═══
 * A közös `formatPriceHuf` (a `cartSummary` hívja), nem `toLocaleString`: az
 * előbbi NEM TÖRHETŐ szóközzel tagol, tehát az ár nem eshet két sorba.
 */
export interface CartViewProps {
  initialItem: CartItem | null
  isLoggedIn: boolean
}

/**
 * Egy kosártétel sora — a saját ár-állapotával, magyarázatával és cselekvésével.
 *
 * A sor SOSEM mutat árat a nem vásárolható tételre: ez az első a négy rétegből,
 * ami megakadályozza, hogy a látogató azt higgye, azért is fizet.
 */
function CartRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const availability = cartItemAvailability(item)
  const note = cartItemNote(item)

  return (
    <li className="kc-cart__item">
      <Card padded>
        <div className="kc-cart__row">
          <div className="kc-cart__info">
            <Link
              className="kc-cart__title"
              href={courseHref({ id: item.productId, slug: item.slug })}
            >
              {item.sku}
            </Link>
            {item.shortDescription ? (
              <p className="kc-cart__description">{item.shortDescription}</p>
            ) : null}
            {/* A blokkoló ok a tétel MELLETT áll, nem a sáv aljában: NN/g
                szerint a hibaüzenet ott a leghasznosabb, ahol a probléma van. */}
            {note ? <p className="kc-cart__note">{note}</p> : null}
          </div>
          <div className="kc-cart__price">
            {availability === 'free' ? (
              <span className="kc-cart__free">{CART_FREE_LABEL}</span>
            ) : availability === 'paid' && item.priceHuf !== null ? (
              <PriceTag priceHuf={item.priceHuf} />
            ) : null}
          </div>
          {/* A tétel neve REJTETT szövegként a gombokon belül: több tételnél a
              puszta felirat nem egyedi (WCAG 2.2 SC 2.4.4), a `Button` pedig
              az `aria-label`-t nem adja tovább a DOM-nak. */}
          <div className="kc-cart__actions">
            {availability === 'free' ? (
              // Az ingyenes tétel NEM hiba: saját, működő útja van. Az igénylő
              // űrlap a kurzusoldalon áll — ugyanoda küld tovább az ingyenes
              // termék /penztar-ja is. A súly a szótár szerinti `secondary`
              // (§3.2 C-2), így a lap egyetlen elsődleges gombja a sávé marad.
              <Button
                href={courseCtaHref({ id: item.productId, slug: item.slug })}
                size="sm"
                variant="secondary"
              >
                {ctaLabel('free-course-claim')}
                <span className="kc-visually-hidden">: {item.sku}</span>
              </Button>
            ) : null}
            <Button onClick={onRemove} size="sm" variant="ghost">
              {ctaLabel('cart-remove-item')}
              <span className="kc-visually-hidden">: {item.sku}</span>
            </Button>
          </div>
        </div>
      </Card>
    </li>
  )
}

export function CartView({ initialItem, isLoggedIn }: CartViewProps) {
  const { state, add, remove, summary, isEmpty } = useCart()

  useEffect(() => {
    if (initialItem) {
      add(initialItem)
    }
    // Az `add` a useCartból stabil (useCallback) — az effekt KLIENS-NAVIGÁCIÓNÁL
    // is újrafut: /kosar?termek=A → /kosar?termek=B váltásnál B is bekerül.
  }, [initialItem, add])

  if (isEmpty && !initialItem) {
    return (
      <div className="kc-cart-empty" role="status">
        <p>A kosarad jelenleg üres.</p>
        <Button href={COURSE_BASE_PATH}>{ctaLabel('course-list-open')}</Button>
      </div>
    )
  }

  // A pénztár szerver-oldala csak a ?termek= query-t látja (a kosár
  // localStorage-os) — a link a CÉLTÉTEL id-jét viszi. A cél az első MEGVEHETŐ
  // tétel, nem az első tétel: lásd a `cartSummary` indoklását.
  const target = summary.target
  // Mire vonatkozik a fizetés? Csak akkor mondjuk ki, ha a kosárban a fizetett
  // tételen kívül más is van — különben fölösleges zaj lenne.
  const scopeNote = cartScopeNote(summary)

  return (
    <div className="kc-cart">
      <ul className="kc-cart__list" role="list">
        {state.items.map((item) => (
          <CartRow item={item} key={item.productId} onRemove={() => remove(item.productId)} />
        ))}
      </ul>

      <div className="kc-cart__summary">
        {summary.totalLabel === null ? null : (
          <p className="kc-cart__total">
            Végösszeg: <strong>{summary.totalLabel}</strong>
          </p>
        )}
        {/* A fizetés HATÓKÖRE közvetlenül a végösszeg alatt: a látogató itt
            tudja meg, hogy a kosárban maradó többi tételért most nem fizet. */}
        {scopeNote ? <p className="kc-cart__scope">{scopeNote}</p> : null}
        {summary.kind === 'amount' ? (
          <p className="kc-cart__total-note">
            A fizetendő végösszeget a rendszer a fizetéskor, a szerveren újraszámolja.
          </p>
        ) : null}

        {/* Alternatíva CSAK akkor, ha a kosárban semmi nem vihető tovább:
            Baymard szerint a puszta tiltás mellől 30% máshol keres tovább. Ha
            van fizetés-út, ez a gomb kimarad, mert két elsődleges gomb egy
            lapon gyengíti egymást (GOV.UK, Button). */}
        {summary.kind === 'blocked' ? (
          <Button href={COURSE_BASE_PATH}>{ctaLabel('course-list-open')}</Button>
        ) : null}

        {summary.kind === 'amount' && target !== null ? (
          isLoggedIn ? (
            <Button href={checkoutHref(target.productId)}>{ctaLabel('cart-to-checkout')}</Button>
          ) : (
            // B6 (docs/gomb-inventar.md): a kosár bejelentkezésre kényszerít,
            // miközben a /penztar 2026-08-15 óta vendég-vásárlást is enged. A
            // feloldás az informacios-architektura.md 8. fejezetének javítási
            // terve szerint halad, NEM innen — ez az ág addig változatlan.
            <Button href={`/belepes?returnUrl=${encodeURIComponent(checkoutHref(target.productId))}`}>
              Belépés a fizetéshez
            </Button>
          )
        ) : null}
      </div>
    </div>
  )
}
