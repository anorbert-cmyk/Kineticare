'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { formatPriceHuf } from './format-price'

/**
 * Kosár-oldali állapot (egy termék = egy vásárlás a jelenlegi modellben — a
 * több-termékes kosár a jövőbeli bővítés; a konvenció itt is dokumentálva).
 */
export interface CartItem {
  productId: number
  sku: string
  /**
   * A kurzus webcíme a kosárban lévő tétel linkjéhez. OPCIONÁLIS: a mező
   * bevezetése ELŐTT eltárolt (localStorage-ban élő) kosarakban nincs benne —
   * ilyenkor a link a régi, id-alapú címre megy, amit a kurzus-route
   * átirányít a kanonikus címre.
   */
  slug?: string | null
  shortDescription: string | null
  priceHuf: number | null
  /** priceInHUFEnabled === false esetén ingyenes. */
  isFree: boolean
}

export interface CartState {
  items: CartItem[]
}

const CART_STORAGE_KEY = 'kineticare-cart-v1'

/**
 * A SZERVER- és a HIDRATÁLÁSI pillanatkép: mindig üres kosár, hivatkozás-stabil.
 * A localStorage csak böngészőben létezik, ezért a szerver-HTML és az első
 * kliens-render is üres kosárral készül — a tárolt tartalom csak a hidratálás
 * UTÁN kerül be. (Ez a korábbi „useState({items:[]}) + useEffect(setState)"
 * megoldás pontos megfelelője, csak effekt nélkül.)
 */
const EMPTY_CART: CartState = { items: [] }

type CartListener = () => void

const cartListeners = new Set<CartListener>()

/** A localStorage-ból olvasott, gyorsítótárazott pillanatkép (hivatkozás-stabilitás). */
let cachedCart: CartState = EMPTY_CART
let cachedCartIsValid = false

/** Írás után: a gyorsítótár érvénytelen + minden feliratkozó értesül. */
function notifyCartChanged(): void {
  cachedCartIsValid = false
  for (const listener of cartListeners) {
    listener()
  }
}

function subscribeToCart(onStoreChange: CartListener): () => void {
  cartListeners.add(onStoreChange)
  return () => {
    cartListeners.delete(onStoreChange)
  }
}

/**
 * Kliens-pillanatkép. A `useSyncExternalStore` elvárja, hogy változatlan
 * tároló mellett UGYANAZT a hivatkozást adja vissza — a `readCart()` minden
 * híváskor új objektumot gyárt, ezért gyorsítótárazzuk, és csak írás után
 * (notifyCartChanged) olvassuk újra.
 */
function getCartSnapshot(): CartState {
  if (!cachedCartIsValid) {
    cachedCart = readCart()
    cachedCartIsValid = true
  }
  return cachedCart
}

function getServerCartSnapshot(): CartState {
  return EMPTY_CART
}

/**
 * A `useCart` mögötti külső store — exportálva, hogy a hidratálási szerződés
 * („a szerver-pillanatkép akkor is üres, ha a tárolóban van tétel") tesztelhető
 * legyen. Komponensben közvetlenül ne használd: erre való a `useCart`.
 */
export const cartStore = {
  subscribe: subscribeToCart,
  getSnapshot: getCartSnapshot,
  getServerSnapshot: getServerCartSnapshot,
}

/** A kosár perzisztencia a localStorage-ban (kliens-oldali minimális — a szerver mindig újraszámolja az árat). */
export function readCart(): CartState {
  if (typeof window === 'undefined') {
    return { items: [] }
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) {
      return { items: [] }
    }
    const parsed = JSON.parse(raw) as CartState
    return Array.isArray(parsed.items) ? parsed : { items: [] }
  } catch {
    return { items: [] }
  }
}

export function writeCart(state: CartState): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  notifyCartChanged()
}

export function addToCart(item: CartItem): CartState {
  const state = readCart()
  if (state.items.some((existing) => existing.productId === item.productId)) {
    return state // duplikáció nélkül — a checkout-start is blokkolja a duplavásárlást
  }
  const next = { items: [...state.items, item] }
  writeCart(next)
  return next
}

export function removeFromCart(productId: number): CartState {
  const state = readCart()
  const next = { items: state.items.filter((item) => item.productId !== productId) }
  writeCart(next)
  return next
}

export function cartTotalHuf(state: CartState): number {
  return state.items.reduce((sum, item) => sum + (item.isFree ? 0 : (item.priceHuf ?? 0)), 0)
}

export function cartIsEmpty(state: CartState): boolean {
  return state.items.length === 0
}

/** A kosár végösszege MEGJELENÍTÉSRE — a fizetendő összeg MINDIG a szerver (T-021) válaszából igazolódik vissza. */
export function cartTotalLabel(state: CartState): string {
  return formatPriceHuf(cartTotalHuf(state))
}

/** Hook a kosárállapothoz (kliens-komponensekhez). */
export function useCart(): {
  state: CartState
  add: (item: CartItem) => void
  remove: (productId: number) => void
  totalHuf: number
  isEmpty: boolean
} {
  const state = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  )

  // Az írás (addToCart/removeFromCart → writeCart) maga értesíti a store-t,
  // így nem kell külön setState — a hook a store pillanatképét követi. A
  // callbackok STABILAK (useCallback, üres deps: a modul-szintű függvényekre
  // hivatkoznak), hogy a fogyasztók effekt-függőséglistába tehetők legyenek
  // (a CartView initialItem-effektje így fut le kliens-navigációnál is).
  const add = useCallback((item: CartItem) => {
    addToCart(item)
  }, [])
  const remove = useCallback((productId: number) => {
    removeFromCart(productId)
  }, [])

  return {
    state,
    add,
    remove,
    totalHuf: cartTotalHuf(state),
    isEmpty: cartIsEmpty(state),
  }
}
