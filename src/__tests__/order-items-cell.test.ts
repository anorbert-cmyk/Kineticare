import { describe, expect, it } from 'vitest'

import { formatOrderItemsLines, ORDER_ITEMS_EMPTY_PLACEHOLDER } from '../components/admin/order-items-cell'

/**
 * A Rendelések lista „Tételek" oszlopának formázó-tesztjei (tiszta függvény).
 *
 * A cella a lista `cellData`-ját kapja: az orders `items` array-mezőjének
 * sorai, ahol a relationship NINCS feloldva (a `product` csak azonosító), és
 * a sorok szerkezete futásidőben nem garantált. A teszt rögzíti a megrendelői
 * igény sorformátumát (sku × db — tételár), a snapshot/product-azonosító
 * fallbacket, és azt, hogy egyetlen hibás sor sem omlaszthatja el a listát.
 */

// A formatPriceHuf nem-törhető szóközzel tagol (lásd format-price.test.ts).
const NBSP = '\u00a0'

describe('formatOrderItemsLines', () => {
  it('több tétel soronként jelenik meg (sku × db — tételár)', () => {
    const lines = formatOrderItemsLines([
      { product: 11, quantity: 1, titleSnapshot: 'keztorna-otthon', priceHufSnapshot: 19990 },
      { product: 12, quantity: 2, titleSnapshot: 'kezmutetes-utani-torna', priceHufSnapshot: 5000 },
    ])

    expect(lines).toEqual([
      `keztorna-otthon × 1 — 19${NBSP}990${NBSP}Ft`,
      `kezmutetes-utani-torna × 2 — 10${NBSP}000${NBSP}Ft`,
    ])
  })

  it('quantity > 1 esetén a tételár az ár × mennyiség', () => {
    const lines = formatOrderItemsLines([
      { product: 7, quantity: 3, titleSnapshot: 'kurzus-a', priceHufSnapshot: 2500 },
    ])

    // 7500 négyjegyű: a magyar CLDR-szabály csak ötjegytől tagol (lásd format-price.test.ts).
    expect(lines).toEqual([`kurzus-a × 3 — 7500${NBSP}Ft`])
  })

  it('hiányzó titleSnapshot esetén a termék-azonosító a fallback (#<id>)', () => {
    const lines = formatOrderItemsLines([{ product: 42, quantity: 1, priceHufSnapshot: 19990 }])

    expect(lines).toEqual([`#42 × 1 — 19${NBSP}990${NBSP}Ft`])
  })

  it('üres/csupa-szóköz titleSnapshot is a product-azonosítóra esik vissza', () => {
    const lines = formatOrderItemsLines([
      { product: 5, quantity: 1, titleSnapshot: '   ', priceHufSnapshot: 1000 },
    ])

    expect(lines).toEqual([`#5 × 1 — 1000${NBSP}Ft`])
  })

  it('feloldott (objektumos) product esetén is az azonosító látszik', () => {
    const lines = formatOrderItemsLines([
      { product: { id: 9, sku: 'keztorna-otthon' }, quantity: 1, priceHufSnapshot: 100 },
    ])

    expect(lines).toEqual([`#9 × 1 — 100${NBSP}Ft`])
  })

  it('hiányzó priceHufSnapshot esetén az ár helyén „—" áll, a tétel többi része látszik', () => {
    const lines = formatOrderItemsLines([{ product: 3, quantity: 2, titleSnapshot: 'kurzus-b' }])

    expect(lines).toEqual([`kurzus-b × 2 — ${ORDER_ITEMS_EMPTY_PLACEHOLDER}`])
  })

  it('hiányzó/hibás quantity esetén 1-gyel számol (a mező defaultja)', () => {
    const lines = formatOrderItemsLines([
      { product: 3, quantity: Number.NaN, titleSnapshot: 'kurzus-b', priceHufSnapshot: 1000 },
    ])

    expect(lines).toEqual([`kurzus-b × 1 — 1000${NBSP}Ft`])
  })

  it('üres tömb → egyetlen „—" sor', () => {
    expect(formatOrderItemsLines([])).toEqual([ORDER_ITEMS_EMPTY_PLACEHOLDER])
  })

  it('hiányzó/nem-tömb cellData → egyetlen „—" sor', () => {
    expect(formatOrderItemsLines(undefined)).toEqual([ORDER_ITEMS_EMPTY_PLACEHOLDER])
    expect(formatOrderItemsLines(null)).toEqual([ORDER_ITEMS_EMPTY_PLACEHOLDER])
    expect(formatOrderItemsLines('nem tömb')).toEqual([ORDER_ITEMS_EMPTY_PLACEHOLDER])
  })

  it('a nem-objektum sor némán „—" fallbacket kap, a többi sor érintetlen', () => {
    const lines = formatOrderItemsLines([
      'rossz sor',
      null,
      { product: 1, quantity: 1, titleSnapshot: 'kurzus-c', priceHufSnapshot: 500 },
    ])

    expect(lines).toEqual([
      ORDER_ITEMS_EMPTY_PLACEHOLDER,
      ORDER_ITEMS_EMPTY_PLACEHOLDER,
      `kurzus-c × 1 — 500${NBSP}Ft`,
    ])
  })
})
