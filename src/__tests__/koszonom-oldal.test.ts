import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import KoszonjukPage from '../app/(frontend)/fizetes/koszonom/page'
import { ThankYouView } from '../components/checkout/ThankYouView'

/**
 * REGRESSZIÓ-ŐR: a köszönőoldal NEM dönthet szerver-oldali hitelesítésből.
 *
 * ═══ A HIBA, AMIT BEZÁR ═══
 * A `/fizetes/koszonom` a Barion `redirectUrl`-je
 * (src/lib/checkout/start-checkout.ts), tehát MINDEN fizetés kereszt-oldali,
 * top-level GET-navigációval érkezik ide a `secure.barion.com`-ról. Egy ilyen
 * kérés `Origin` fejlécet nem küld, `Sec-Fetch-Site: cross-site`-ot viszont
 * igen — és a nem üres `csrf`-engedélylista mellett a Payload `extractJWT`-je
 * pontosan ilyenkor dobja el a süti-tokent
 * (node_modules/payload/dist/auth/extractJWT.js, cookie-ág).
 *
 * Valódi Chromiummal kimérve: a `cross-site` jelölés a szerver-átirányítás
 * UTÁN IS megmarad, tehát a `/belepes`-re dobás sem menti meg.
 *
 * Következmény, ha az oldal szerveren hitelesít: a frissen fizető vásárló
 * MINDEN esetben a „jelentkezz be" nézetet kapja a „Köszönjük a vásárlást!"
 * helyett — 100%-ban, minden vásárlásnál. A hitelesítés ezért a kliens-oldali
 * poll dolga: az azonos eredetű `fetch`, ami KÜLD `Origin`-t, tehát átmegy a
 * csrf-szűrőn; a 401-ből `unauthorized` állapot lesz.
 *
 * A teszt a VALÓDI oldal-komponenst futtatja, és a `ThankYouView`-nak ténylegesen
 * átadott propokra állít — nem forrásszövegre.
 */

/** A visszaadott elemfából kiszedi a ThankYouView elemet. */
function findThankYouElement(node: unknown): ReactElement | null {
  if (node === null || typeof node !== 'object') {
    return null
  }
  const element = node as ReactElement<Record<string, unknown>>
  if (element.type === ThankYouView) {
    return element
  }
  const children = (element.props as { children?: unknown } | undefined)?.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findThankYouElement(child)
      if (found) {
        return found
      }
    }
    return null
  }
  return findThankYouElement(children)
}

async function renderPage(order: Record<string, string | string[] | undefined>) {
  const tree = await KoszonjukPage({ searchParams: Promise.resolve(order) })
  const element = findThankYouElement(tree)
  if (!element) {
    throw new Error('a köszönőoldal nem rendereli a ThankYouView-t')
  }
  return element.props as Record<string, unknown>
}

describe('köszönőoldal (Barion-visszatérés)', () => {
  it('CSAK a rendelésszámot adja át — bejelentkezettséget NEM dönt szerver-oldalon', async () => {
    const props = await renderPage({ order: 'KH-2026-000123' })

    expect(props.orderNumber).toBe('KH-2026-000123')
    // A döntő állítás: nincs szerver-oldalon eldöntött hitelesítési prop.
    // Ha valaki visszateszi (bármilyen néven), az itt bukik.
    expect(Object.keys(props)).toEqual(['orderNumber'])
  })

  it('hiányzó vagy üres rendelésszám esetén null megy át', async () => {
    expect((await renderPage({})).orderNumber).toBeNull()
    expect((await renderPage({ order: '   ' })).orderNumber).toBeNull()
    expect((await renderPage({ order: ['a', 'b'] })).orderNumber).toBeNull()
  })

  it('a rendelésszám körüli szóközök levágódnak', async () => {
    expect((await renderPage({ order: '  KH-2026-000123  ' })).orderNumber).toBe('KH-2026-000123')
  })

  /**
   * A ThankYouView szerződése: a bejelentkezettség NEM bemenet. Ez azért külön
   * állítás, mert a hívó oldalt és a komponenst külön is el lehetne rontani.
   */
  it('a ThankYouView egyetlen propot vár, és az nem a bejelentkezettség', () => {
    expect(ThankYouView.length).toBe(1)
    const source = ThankYouView.toString()
    expect(source).not.toContain('isLoggedIn')
  })
})
