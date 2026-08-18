import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AccountView } from '../components/account/AccountView'
import { ctaLabel } from '../lib/cta-vocabulary'
import type { Order, User } from '../payload-types'

/**
 * A fiók-oldal SZÁMLALINKJE — renderelés-oldali allowlist
 * (src/lib/szamlazz/invoice-url.ts).
 *
 * Íráskor a Számlázz.hu válasza már szűrve mentődik
 * (src/lib/szamlazz/invoice.ts), DE az `orders.invoicePdfUrl` az adminban
 * közönséges, szerkeszthető szövegmező (src/plugins/ecommerce.ts): nincs rajta
 * `readOnly` és nincs field-szintű access. Egy staff/owner kézzel bármit
 * beírhat, és az az érték a VÁSÁRLÓ fiókjában kerülne `href`-be — ezért a
 * vizsgálatnak a renderelés helyén is meg kell lennie.
 *
 * Minden tiltó esethez tartozik POZITÍV KONTROLL (megbízható címmel ugyanez a
 * komponens linket rendereli), különben a „nincs benne a rossz href" állítás
 * akkor is teljesülne, ha a komponens egyáltalán nem renderelne rendelést.
 */

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node))
}

function hrefValues(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1])
}

const USER = { id: 1, email: 'vevo@pelda.hu', name: 'Teszt Vevő' } as unknown as User

function orderWithInvoiceUrl(invoicePdfUrl: string | null): Order {
  return {
    id: 7,
    orderNumber: 'KIN-2026-0007',
    status: 'paid',
    totalHufSnapshot: 19900,
    createdAt: '2026-08-01T10:00:00.000Z',
    invoicePdfUrl,
  } as unknown as Order
}

function renderAccount(invoicePdfUrl: string | null): string {
  return render(
    createElement(AccountView, { user: USER, orders: [orderWithInvoiceUrl(invoicePdfUrl)] }),
  )
}

/**
 * A számlalink szövege — ennek megléte/hiánya a diszkrimináló jel.
 * A §3.2 #14 szótári sorából olvas (2026-08-18): a korábbi „Számla letöltése"
 * deverbális főnévi alak volt, pedig a letöltés a látogató gépén hoz létre
 * fájlt (P-1a → E/1).
 */
const INVOICE_LINK_LABEL = ctaLabel('invoice-download')

describe('AccountView — számlalink allowlist a renderelés helyén', () => {
  it('POZITÍV KONTROLL: megbízható szamlazz.hu cím linkként renderelődik', () => {
    const trusted = 'https://www.szamlazz.hu/szamla/vevoifiok?id=abc123'
    const html = renderAccount(trusted)

    expect(html).toContain(INVOICE_LINK_LABEL)
    expect(hrefValues(html)).toContain(trusted)
    // A külső cél új ablakban, noopener/noreferrer-rel nyílik.
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it.each([
    ['javascript séma', 'javascript:alert(1)'],
    ['idegen hoszt', 'https://tamado.example/szamla.pdf'],
    ['álcázott aldomain-végződés', 'https://szamlazz.hu.tamado.example/szamla.pdf'],
    ['http (nem https) szamlazz.hu', 'http://www.szamlazz.hu/szamla/vevoifiok?id=abc123'],
    ['data URI', 'data:application/pdf;base64,AAAA'],
    ['protokoll-relatív cím', '//tamado.example/szamla.pdf'],
    ['gyökér-relatív útvonal', '/szamla.pdf'],
    ['értelmezhetetlen szöveg', 'nem-egy-url'],
  ])('kézzel beírt, nem megbízható cím (%s) NEM lesz href', (_label, hostile) => {
    const html = renderAccount(hostile)

    // A rendelés maga renderelődik — a teszt tehát nem üres kimeneten „megy át".
    expect(html).toContain('KIN-2026-0007')
    // De a link nem: sem szövegként, sem href-ként.
    expect(html).not.toContain(INVOICE_LINK_LABEL)
    for (const href of hrefValues(html)) {
      expect(href).not.toBe(hostile)
      expect(href.toLowerCase()).not.toContain('javascript:')
      expect(href).not.toContain('tamado.example')
    }
    // A vásárló magyar nyelvű, nem hazug visszajelzést kap.
    expect(html).toContain('A számla letöltése átmenetileg nem érhető el')
  })

  it('cím nélküli, fizetett rendelésnél a „feldolgozás alatt" üzenet marad', () => {
    const html = renderAccount(null)

    expect(html).not.toContain(INVOICE_LINK_LABEL)
    expect(html).toContain('A számla feldolgozás alatt')
    expect(html).not.toContain('A számla letöltése átmenetileg nem érhető el')
  })
})
