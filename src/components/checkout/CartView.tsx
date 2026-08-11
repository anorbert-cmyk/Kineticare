'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PriceTag } from '@/components/ui/PriceTag'
import { useCart, type CartItem } from '../../lib/cart'
import { courseHref } from '../../lib/course-url'
import { CHECKOUT_PATH, checkoutHref } from '../../lib/courses'

/**
 * CartView — a kosár kliens-oldali megjelenítése (tételek, törlés, végösszeg,
 * tovább a penztárhoz).
 *
 * - A tételek a localStorage-cartból jönnek; a szerver-oldali initialItem a
 *   /kosar?termek={id} konvenciót fogadja (a kliens hozzáadja, duplikáció nélkül).
 * - A pénztár-link a termék-id-t is viszi (/penztar?termek={id}): a pénztár
 *   szerver-oldala a kosárhoz NEM fér hozzá (localStorage, M8), így a query az
 *   egyetlen csatorna. Egy termék = egy vásárlás — az első tétel kerül bele.
 * - A végösszeg MEGJELENÍTÉSRE — a fizetendő összeg a checkout során a
 *   szerver (T-021) válaszából igazolódik vissza.
 * - Üres kosár: segítő szöveg + CTA a kurzusokra.
 */
export interface CartViewProps {
  initialItem: CartItem | null
  isLoggedIn: boolean
}

export function CartView({ initialItem, isLoggedIn }: CartViewProps) {
  const { state, add, remove, totalHuf, isEmpty } = useCart()

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
        <Button href="/kurzusok">Nézd meg a kurzusainkat</Button>
      </div>
    )
  }

  // A pénztár szerver-oldala csak a ?termek= query-t látja (a kosár
  // localStorage-os) — a link az első tétel id-jét viszi.
  const checkoutPath =
    state.items.length > 0 ? checkoutHref(state.items[0].productId) : CHECKOUT_PATH

  return (
    <div className="kc-cart">
      <ul className="kc-cart__list" role="list">
        {state.items.map((item) => (
          <li key={item.productId} className="kc-cart__item">
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
                </div>
                <div className="kc-cart__price">
                  {item.isFree ? (
                    <span className="kc-cart__free">Ingyenes</span>
                  ) : item.priceHuf !== null ? (
                    <PriceTag priceHuf={item.priceHuf} />
                  ) : null}
                </div>
                <Button
                  aria-label={`Törlés: ${item.sku}`}
                  onClick={() => remove(item.productId)}
                  size="sm"
                  variant="ghost"
                >
                  Törlés
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <div className="kc-cart__summary">
        <p className="kc-cart__total">
          Végösszeg: <strong>{totalHuf === 0 && state.items.every((item) => item.isFree) ? 'Ingyenes' : `${totalHuf.toLocaleString('hu-HU')} Ft`}</strong>
        </p>
        <p className="kc-cart__total-note">
          A fizetendő végösszeget a rendszer a fizetéskor, a szerveren újraszámolja.
        </p>
        {isLoggedIn ? (
          <Button href={checkoutPath}>Tovább a penztárhoz</Button>
        ) : (
          <Button href={`/belepes?returnUrl=${encodeURIComponent(checkoutPath)}`}>
            Belépés a fizetéshez
          </Button>
        )}
      </div>
    </div>
  )
}
