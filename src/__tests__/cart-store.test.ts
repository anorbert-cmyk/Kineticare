import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { addToCart, cartStore, readCart, removeFromCart, writeCart, type CartItem } from '../lib/cart'

/**
 * A kosár külső store-ja (useSyncExternalStore-forrás).
 *
 * A LEGFONTOSABB itt őrzött szerződés a HIDRATÁLÁS: a szerver-pillanatkép
 * akkor is ÜRES kosarat ad, ha a localStorage-ban van tétel. Enélkül a
 * szerver-HTML és az első kliens-render eltérne (hidratációs hiba a
 * kosár-/fizetés-úton). A tárolt tartalom csak a hidratálás után jön be —
 * pontosan úgy, ahogy a korábbi „üres kezdőállapot + mount-effekt" megoldás.
 */

interface FakeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const globalWithWindow = globalThis as unknown as { window?: { localStorage: FakeStorage } }

function installFakeWindow(): void {
  const entries = new Map<string, string>()
  globalWithWindow.window = {
    localStorage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value)
      },
      removeItem: (key) => {
        entries.delete(key)
      },
    },
  }
}

const ITEM: CartItem = {
  productId: 42,
  sku: 'kez-rehab-alap',
  shortDescription: null,
  priceHuf: 19990,
  isFree: false,
}

describe('cartStore', () => {
  beforeEach(() => {
    installFakeWindow()
    // Tiszta tároló + érvénytelenített pillanatkép-gyorsítótár.
    writeCart({ items: [] })
  })

  afterEach(() => {
    delete globalWithWindow.window
  })

  it('a szerver-pillanatkép ÜRES marad akkor is, ha a tárolóban már van tétel', () => {
    addToCart(ITEM)
    expect(readCart().items).toHaveLength(1)

    expect(cartStore.getServerSnapshot()).toEqual({ items: [] })
    // Hivatkozás-stabil: a useSyncExternalStore különben végtelen ciklusba futna.
    expect(cartStore.getServerSnapshot()).toBe(cartStore.getServerSnapshot())
  })

  it('szerveren (window nélkül) is üres pillanatképet ad', () => {
    delete globalWithWindow.window
    expect(cartStore.getServerSnapshot()).toEqual({ items: [] })
  })

  it('a kliens-pillanatkép hivatkozás-stabil, amíg nincs írás', () => {
    const first = cartStore.getSnapshot()
    expect(cartStore.getSnapshot()).toBe(first)
  })

  it('írás után értesíti a feliratkozókat és új pillanatképet ad', () => {
    let notifications = 0
    const unsubscribe = cartStore.subscribe(() => {
      notifications += 1
    })

    const before = cartStore.getSnapshot()
    addToCart(ITEM)

    expect(notifications).toBe(1)
    const after = cartStore.getSnapshot()
    expect(after).not.toBe(before)
    expect(after.items).toHaveLength(1)

    unsubscribe()
    removeFromCart(ITEM.productId)
    expect(notifications).toBe(1)
    expect(cartStore.getSnapshot().items).toHaveLength(0)
  })
})
