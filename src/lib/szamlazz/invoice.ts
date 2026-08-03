import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import { getSzamlazzConfig, postInvoiceXml, type SzamlazzParsedSuccess } from './client'
import {
  SzamlazzApiError,
  type IssueInvoiceResult,
  type SzamlazzClientConfig,
} from './types'

/**
 * Számla-XML építés és számlakiállítás a paid rendeléshez (T-024/W4-01).
 *
 * Szabályok (a hivatalos Számla Agent minta alapján):
 * - A mezők SORRENDJE KÖTÖTT; a mintában szereplő tag-eknek jelen kell lenniük
 *   (értékük üres is lehet) — ezért a builder a teljes vázat mindig kiírja.
 * - A Számlázz.hu NEM számol: minden tételösszeg (nettoErtek, afaErtek,
 *   bruttoErtek) és a nettoEgysegar kötelezően megadott; az Agent a tétel-
 *   matematikát validálja (57, 259–264 hibakódok).
 * - Bruttó áraink vannak (fogyasztói ár, HUF, 27% ÁFA):
 *     bruttoErtek  = round(bruttó egységár × mennyiség)
 *     nettoErtek   = round(bruttoErtek / 1,27)
 *     afaErtek     = bruttoErtek − nettoErtek     (így netto+afa=brutto PONTOSAN)
 *     nettoEgysegar = nettoErtek / mennyiség (2 tizedes; mennyiség=1 esetén
 *                   pontosan nettoErtek — nincs kerekítési eltérés)
 * - szamlaKulsoAzon = orderNumber (idempotencia-horgony: ismételt beküldésre
 *   a Számlázz.hu a korábbi számlát adja vissza, nem állít ki újat).
 * - A <vevo><azonosito> mezőt SOHA nem küldjük (a Számlázz.hu-dokumentáció
 *   figyelmeztet: más vevőhöz rögzített azonosító adatfrissítést/biztonsági
 *   problémát okozna).
 */

export const VAT_RATE_PERCENT = 27
const VAT_DIVISOR = 1 + VAT_RATE_PERCENT / 100

export interface InvoiceBuyerInput {
  nev: string
  irsz: string
  telepules: string
  cim: string
  email: string
  adoszam?: string
}

export interface InvoiceItemInput {
  megnevezes: string
  mennyiseg: number
  /** Bruttó egységár (HUF, egész). */
  bruttoEgysegar: number
}

export interface BuildInvoiceXmlInput {
  agentKey: string
  orderNumber: string
  invoicePrefix: string
  /** Kiállítás dátuma (YYYY-MM-DD) — kelt/teljesítés/fizetési határidő egységesen. */
  issueDate: string
  buyer: InvoiceBuyerInput
  items: InvoiceItemInput[]
}

/** XML-escape a dinamikus értékekhez. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface InvoiceLineAmounts {
  nettoEgysegar: string
  nettoErtek: number
  afaErtek: number
  bruttoErtek: number
}

/**
 * Tételösszegek 27% ÁFA-val, bruttóból visszaszámolva. A nettoEgysegar
 * stringként tér vissza (legfeljebb 2 tizedes, tizedesjel: pont).
 */
export function computeLineAmounts(item: InvoiceItemInput): InvoiceLineAmounts {
  if (!Number.isInteger(item.mennyiseg) || item.mennyiseg < 1) {
    throw new SzamlazzApiError({
      message: `Érvénytelen mennyiség a számlatételben (${item.mennyiseg}).`,
      kind: 'invalid_data',
      retryable: false,
    })
  }
  if (!Number.isFinite(item.bruttoEgysegar) || item.bruttoEgysegar < 0) {
    throw new SzamlazzApiError({
      message: `Érvénytelen bruttó egységár a számlatételben (${item.bruttoEgysegar}).`,
      kind: 'invalid_data',
      retryable: false,
    })
  }
  const bruttoErtek = Math.round(item.bruttoEgysegar * item.mennyiseg)
  const nettoErtek = Math.round(bruttoErtek / VAT_DIVISOR)
  const afaErtek = bruttoErtek - nettoErtek
  const nettoEgysegarNumber = nettoErtek / item.mennyiseg
  const nettoEgysegar =
    Math.round(nettoEgysegarNumber * 100) % 100 === 0
      ? String(Math.round(nettoEgysegarNumber))
      : (Math.round(nettoEgysegarNumber * 100) / 100).toFixed(2)
  return { nettoEgysegar, nettoErtek, afaErtek, bruttoErtek }
}

/** A teljes számla-XML (xmlszamla) a hivatalos tag-sorrendben. */
export function buildInvoiceXml(input: BuildInvoiceXmlInput): string {
  const esc = escapeXml
  const itemsXml = input.items
    .map((item) => {
      const amounts = computeLineAmounts(item)
      return [
        '    <tetel>',
        `      <megnevezes>${esc(item.megnevezes)}</megnevezes>`,
        `      <mennyiseg>${item.mennyiseg}</mennyiseg>`,
        '      <mennyisegiEgyseg>db</mennyisegiEgyseg>',
        `      <nettoEgysegar>${amounts.nettoEgysegar}</nettoEgysegar>`,
        `      <afakulcs>${VAT_RATE_PERCENT}</afakulcs>`,
        `      <nettoErtek>${amounts.nettoErtek}</nettoErtek>`,
        `      <afaErtek>${amounts.afaErtek}</afaErtek>`,
        `      <bruttoErtek>${amounts.bruttoErtek}</bruttoErtek>`,
        '      <megjegyzes></megjegyzes>',
        '    </tetel>',
      ].join('\n')
    })
    .join('\n')

  const sendEmail = input.buyer.email.trim().length > 0
  const megjegyzes = `Kineticare online kurzus — rendelés: ${input.orderNumber} (Barion, bankkártya)`

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
  <beallitasok>
    <szamlaagentkulcs>${esc(input.agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>false</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
    <szamlaKulsoAzon>${esc(input.orderNumber)}</szamlaKulsoAzon>
  </beallitasok>
  <fejlec>
    <keltDatum>${input.issueDate}</keltDatum>
    <teljesitesDatum>${input.issueDate}</teljesitesDatum>
    <fizetesiHataridoDatum>${input.issueDate}</fizetesiHataridoDatum>
    <fizmod>bankkártya</fizmod>
    <penznem>HUF</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    <megjegyzes>${esc(megjegyzes)}</megjegyzes>
    <arfolyamBank></arfolyamBank>
    <arfolyam></arfolyam>
    <rendelesSzam>${esc(input.orderNumber)}</rendelesSzam>
    <dijbekeroSzamlaszam></dijbekeroSzamlaszam>
    <elolegszamla>false</elolegszamla>
    <vegszamla>false</vegszamla>
    <helyesbitoszamla>false</helyesbitoszamla>
    <helyesbitettSzamlaszam></helyesbitettSzamlaszam>
    <dijbekero>false</dijbekero>
    <szamlaszamElotag>${esc(input.invoicePrefix)}</szamlaszamElotag>
  </fejlec>
  <elado>
    <bank></bank>
    <bankszamlaszam></bankszamlaszam>
    <emailReplyto></emailReplyto>
    <emailTargy></emailTargy>
    <emailSzoveg></emailSzoveg>
  </elado>
  <vevo>
    <nev>${esc(input.buyer.nev)}</nev>
    <irsz>${esc(input.buyer.irsz)}</irsz>
    <telepules>${esc(input.buyer.telepules)}</telepules>
    <cim>${esc(input.buyer.cim)}</cim>
    <email>${esc(input.buyer.email)}</email>
    <sendEmail>${sendEmail}</sendEmail>
    <adoszam>${esc(input.buyer.adoszam ?? '')}</adoszam>
    <postazasiNev></postazasiNev>
    <postazasiIrsz></postazasiIrsz>
    <postazasiTelepules></postazasiTelepules>
    <postazasiCim></postazasiCim>
    <azonosito></azonosito>
    <telefonszam></telefonszam>
    <megjegyzes></megjegyzes>
  </vevo>
  <fuvarlevel>
    <uticel></uticel>
    <futarSzolgalat></futarSzolgalat>
  </fuvarlevel>
  <tetelek>
${itemsXml}
  </tetelek>
</xmlszamla>`
}

// ---------------------------------------------------------------------------
// Számlakiállítás a rendeléshez
// ---------------------------------------------------------------------------

interface CustomerSnapshotShape {
  name?: unknown
  email?: unknown
  billingName?: unknown
  billingZip?: unknown
  billingCity?: unknown
  billingStreet?: unknown
  taxNumber?: unknown
}

function snapshotString(snapshot: CustomerSnapshotShape, key: keyof CustomerSnapshotShape): string {
  const value = snapshot[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** A vevőadatok kinyerése a rendelés customerSnapshot-jából. Hiány esetén null. */
export function buyerFromOrder(order: Order): InvoiceBuyerInput | null {
  const snapshot =
    typeof order.customerSnapshot === 'object' && order.customerSnapshot !== null
      ? (order.customerSnapshot as CustomerSnapshotShape)
      : {}
  const nev = snapshotString(snapshot, 'billingName') || snapshotString(snapshot, 'name')
  const irsz = snapshotString(snapshot, 'billingZip')
  const telepules = snapshotString(snapshot, 'billingCity')
  const cim = snapshotString(snapshot, 'billingStreet')
  const email = snapshotString(snapshot, 'email') || (order.customerEmail ?? '').trim()
  if (!nev || !irsz || !telepules || !cim) {
    return null
  }
  const adoszam = snapshotString(snapshot, 'taxNumber')
  return { nev, irsz, telepules, cim, email, ...(adoszam ? { adoszam } : {}) }
}

/** A rendelés-tételek számlatétel-leképezése a snapshot-mezőkből. Hiány esetén null. */
export function itemsFromOrder(order: Order): InvoiceItemInput[] | null {
  const items = order.items ?? []
  if (items.length === 0) {
    return null
  }
  const mapped: InvoiceItemInput[] = []
  for (const item of items) {
    const quantity = item.quantity ?? 1
    const price = item.priceHufSnapshot
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      return null
    }
    mapped.push({
      megnevezes: item.titleSnapshot?.trim() || 'Kineticare online kurzus',
      mennyiseg: quantity,
      bruttoEgysegar: price,
    })
  }
  return mapped
}

export interface IssueInvoiceForOrderDeps {
  payload: Payload
  orderId: number
  config?: SzamlazzClientConfig
  logger?: Logger
  /** Injektálható HTTP-hívó (teszteléshez); alapból a valódi postInvoiceXml. */
  postXml?: (xml: string, config: SzamlazzClientConfig) => Promise<SzamlazzParsedSuccess>
  /** A kelt-dátum felülírása (teszteléshez); alapból a mai dátum. */
  issueDate?: string
}

async function setInvoiceStatus(
  payload: Payload,
  orderId: number,
  data: Record<string, unknown>,
): Promise<void> {
  await payload.update({
    collection: 'orders',
    id: orderId,
    data,
    overrideAccess: true,
  })
}

/**
 * Számla kiállítása egy paid rendeléshez — idempotens:
 * - issued/invoiceNumber már megvan → 'already-issued' (no-op);
 * - Számlázz.hu kikapcsolva (nincs agent-kulcs) → 'disabled' (no-op);
 * - hiányzó vevő-/tételadat → invoiceStatus 'failed' + 'failed' (NEM dob,
 *   a job nem újrapróbálja — emberi adatpótlás kell);
 * - retryable provider/timeout-hiba → invoiceStatus 'failed' + THROW
 *   (a Payload job újrapróbálja; a szamlaKulsoAzon miatt a duplikáció
 *   Számlázz.hu-oldalon sem jöhet létre).
 */
export async function issueInvoiceForOrder(
  deps: IssueInvoiceForOrderDeps,
): Promise<IssueInvoiceResult> {
  const log = (deps.logger ?? rootLogger).child({ module: 'szamlazz-invoice', orderId: deps.orderId })
  const config = deps.config ?? getSzamlazzConfig()

  if (!config.enabled) {
    log.debug('számlázás kikapcsolva (SZAMLAZZ_AGENT_KEY nincs beállítva) — kihagyva')
    return { outcome: 'disabled' }
  }

  const order = (await deps.payload.findByID({
    collection: 'orders',
    id: deps.orderId,
    depth: 0,
    overrideAccess: true,
  })) as Order | null
  if (!order) {
    log.warn('a rendelés nem található — számlakiállítás kihagyva')
    return { outcome: 'failed', reason: 'a rendelés nem található' }
  }
  const orderLog = log.child({ orderNumber: order.orderNumber ?? null })

  if (order.invoiceStatus === 'issued' || order.invoiceNumber) {
    orderLog.info('a rendeléshez már kiállították a számlát — idempotens no-op', {
      invoiceNumber: order.invoiceNumber ?? null,
    })
    return { outcome: 'already-issued', ...(order.invoiceNumber ? { invoiceNumber: order.invoiceNumber } : {}) }
  }

  if (!order.orderNumber) {
    orderLog.error('RIASZTÁS: a rendelés rendelésszám nélkül fut — számla nem állítható ki')
    await setInvoiceStatus(deps.payload, deps.orderId, { invoiceStatus: 'failed' })
    return { outcome: 'failed', reason: 'hiányzó rendelésszám' }
  }

  const buyer = buyerFromOrder(order)
  if (!buyer) {
    orderLog.warn(
      'hiányos vevő-számlázási adatok (név/irsz/település/cím) — számla NEM állítható ki, emberi pótlás szükséges',
    )
    await setInvoiceStatus(deps.payload, deps.orderId, { invoiceStatus: 'failed' })
    return { outcome: 'failed', reason: 'hiányos vevő-számlázási adatok' }
  }

  const items = itemsFromOrder(order)
  if (!items) {
    orderLog.error('RIASZTÁS: a rendelés-tételekből hiányzik az ár-snapshot — számla nem állítható ki')
    await setInvoiceStatus(deps.payload, deps.orderId, { invoiceStatus: 'failed' })
    return { outcome: 'failed', reason: 'hiányzó tétel ár-snapshot' }
  }

  const issueDate = deps.issueDate ?? new Date().toISOString().slice(0, 10)
  const xml = buildInvoiceXml({
    agentKey: config.agentKey as string,
    orderNumber: order.orderNumber,
    invoicePrefix: config.invoicePrefix,
    issueDate,
    buyer,
    items,
  })

  await setInvoiceStatus(deps.payload, deps.orderId, { invoiceStatus: 'pending' })

  try {
    const postXml = deps.postXml ?? postInvoiceXml
    const result = await postXml(xml, config)
    await setInvoiceStatus(deps.payload, deps.orderId, {
      invoiceStatus: 'issued',
      invoiceNumber: result.szamlaszam,
      ...(result.vevoifiokUrl ? { invoicePdfUrl: result.vevoifiokUrl } : {}),
    })
    orderLog.info('számla kiállítva', { invoiceNumber: result.szamlaszam })
    return { outcome: 'issued', invoiceNumber: result.szamlaszam }
  } catch (error) {
    await setInvoiceStatus(deps.payload, deps.orderId, { invoiceStatus: 'failed' }).catch(() => undefined)
    if (error instanceof SzamlazzApiError) {
      orderLog.warn('számlakiállítás sikertelen', {
        kind: error.kind,
        retryable: error.retryable,
        agentErrorCodes: error.agentErrors.map((entry) => entry.code),
        error: error.message,
      })
      if (error.retryable) {
        // A job-retry újrapróbálja — a szamlaKulsoAzon véd a duplikáció ellen.
        throw error
      }
      return { outcome: 'failed', reason: error.message }
    }
    orderLog.error('számlakiállítás váratlan hibával állt le', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
