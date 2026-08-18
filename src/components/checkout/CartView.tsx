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
 * ═══ A HÁROM ÁR-ÁLLAPOT (2026-08-17) ═══
 * A sáv nem „gomb vagy nem gomb" kérdést tesz fel, hanem a `cartSummary`
 * állapotát követi (src/lib/cart.ts):
 *  - `amount`  — van fizetendő végösszeg → a pénztár útja (§3.2 #20);
 *  - `free`    — minden tétel ingyenes → a KURZUSOLDAL igénylő űrlapja
 *                (`courseCtaHref`), mert az ingyenes kurzus nem a pénztáron át
 *                jár, és a /penztar is oda küldi tovább a látogatót;
 *  - `blocked` — van archivált vagy hiányos konfigurációjú tétel → NINCS
 *                fizetés-gomb, helyette a tétel melletti magyarázó mondat és
 *                EGY alternatíva (kurzuslista).
 *
 * MIÉRT NEM LETILTOTT GOMB a blokkolt ág: GOV.UK Design System, Button —
 * „Disabled buttons have poor contrast and can confuse some users, so avoid
 * them if possible." és „Avoid using multiple default buttons on a single
 * page." (https://design-system.service.gov.uk/components/button/). Ugyanezt
 * mondja ki a kurzusoldal Á-3 szabálya, ahol a nem vásárolható terméknek
 * SZÁNDÉKOSAN nincs feliratú CTA-ja — a kosár nem mondhat mást ugyanarról a
 * termékről (WCAG 2.2 SC 3.2.4 Consistent Identification).
 *
 * MIÉRT VAN MÉGIS TOVÁBBLÉPÉS: Baymard mérése szerint ha a látogatót csak
 * annyival intézik el, hogy a termék nem kapható, 30% azonnal máshol keresi
 * tovább (https://baymard.com/blog/handling-out-of-stock-products); NN/g,
 * Error-Message Guidelines: „Merely stating the problem is also not enough;
 * offer some potential remedies."
 * (https://www.nngroup.com/articles/error-message-guidelines/).
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

/** Egy kosártétel sora — a saját ár-állapotával. */
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
          {/* A tétel neve REJTETT szövegként a gombon belül: több tételnél a
              puszta felirat nem egyedi (WCAG 2.2 SC 2.4.4), a `Button` pedig
              az `aria-label`-t nem adja tovább a DOM-nak. */}
          <Button onClick={onRemove} size="sm" variant="ghost">
            {ctaLabel('cart-remove-item')}
            <span className="kc-visually-hidden">: {item.sku}</span>
          </Button>
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
  // localStorage-os) — a link a CÉLTÉTEL id-jét viszi. A cél az első CSELEKVŐ
  // tétel, nem az első tétel: lásd a `cartSummary` indoklását.
  const target = summary.target

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
        {summary.kind === 'amount' ? (
          <p className="kc-cart__total-note">
            A fizetendő végösszeget a rendszer a fizetéskor, a szerveren újraszámolja.
          </p>
        ) : null}

        {summary.kind === 'blocked' ? (
          <Button href={COURSE_BASE_PATH}>{ctaLabel('course-list-open')}</Button>
        ) : null}

        {summary.kind === 'free' && target !== null ? (
          // Az ingyenes kurzus útja az igénylő űrlap a kurzusoldalon — ugyanaz
          // a cél, ahova az ingyenes termék /penztar-ja is továbbküld.
          // A súly a szótár szerinti `secondary` (C-2: ugyanaz a cselekvés =
          // ugyanaz a súly, akkor is, ha itt ez a sáv egyetlen cselekvése).
          <Button
            href={courseCtaHref({ id: target.productId, slug: target.slug })}
            variant="secondary"
          >
            {ctaLabel('free-course-claim')}
          </Button>
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
