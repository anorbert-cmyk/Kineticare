'use client'

import { useEffect, useState } from 'react'

import { formatPriceHuf } from '../../lib/format-price'

/**
 * Kosár-oldali állapot (egy termék = egy vásárlás a jelenlegi modellben — a
 * több-termékes kosár a jövőbeli bővítés; a konvenció itt is dokumentálva).
 */
export interface CartItem {
  productId: number
  sku: string
  shortDescription: string | null
  priceHuf: number | null
  /** priceInHUFEnabled === false esetén ingyenes. */
  isFree: boolean
}

export interface CartState {
  items: CartItem[]
}

const CART_STORAGE_KEY = 'kineticare-cart-v1'

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
  const [state, setState] = useState<CartState>({ items: [] })

  useEffect(() => {
    setState(readCart())
  }, [])

  return {
    state,
    add: (item) => setState(addToCart(item)),
    remove: (productId) => setState(removeFromCart(productId)),
    totalHuf: cartTotalHuf(state),
    isEmpty: cartIsEmpty(state),
  }
}
