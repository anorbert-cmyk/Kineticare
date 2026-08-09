import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import {
  getSzamlazzConfig,
  isDuplicateOrderError,
  postInvoiceXml,
  type SzamlazzParsedSuccess,
} from './client'
import { queryInvoiceByKulsoAzon, type InvoiceLookupResult } from './pdf'
import { writeOrderInvoicingState } from './order-state'
import {
  SzamlazzApiError,
  type IssueInvoiceResult,
  type SzamlazzClientConfig,
  type SzamlazzVatMode,
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
 * - HELYESBÍTŐ (módosító) számla: ugyanez a művelet, `corrective` megadásával —
 *   ilyenkor <helyesbitoszamla>true</helyesbitoszamla>, a
 *   <helyesbitettSzamlaszam> az eredeti számla száma, a tételek negatív
 *   korrekciót hordoznak, a horgony pedig a helyesbítő saját kulsoAzon-ja
 *   (lásd corrective.ts — részleges visszatérítés bizonylata).
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

/**
 * Helyesbítő (módosító) számla hivatkozása — a részleges visszatérítés
 * bizonylata (C5). A Számla Agent ugyanazt az xmlszamla-műveletet használja,
 * két különbséggel: <helyesbitoszamla>true</helyesbitoszamla> és
 * <helyesbitettSzamlaszam> = az EREDETI számla száma. A tételek a korrekciót
 * (negatív bruttó értéket) hordozzák.
 */
export interface CorrectiveInvoiceRef {
  /** Az eredeti (helyesbítendő) számla száma — <helyesbitettSzamlaszam>. */
  originalInvoiceNumber: string
  /**
   * A helyesbítő saját idempotencia-horgonya (<szamlaKulsoAzon>). KÖTELEZŐEN
   * eltér az eredeti számla horgonyától (ami az orderNumber), különben a
   * Számlázz.hu a meglévő számlát adná vissza új bizonylat helyett.
   */
  kulsoAzon: string
}

export interface BuildInvoiceXmlInput {
  agentKey: string
  orderNumber: string
  invoicePrefix: string
  /** Kiállítás dátuma (YYYY-MM-DD) — kelt és fizetési határidő. */
  issueDate: string
  /**
   * Teljesítési dátum (YYYY-MM-DD); elhagyva = issueDate. Helyesbítőnél az
   * EREDETI számla teljesítési dátuma megy ide (NAV-szabály: a helyesbítő
   * teljesítési dátumának naptári hónapja nem térhet el az eredetiétől).
   */
  teljesitesDatum?: string
  buyer: InvoiceBuyerInput
  items: InvoiceItemInput[]
  /** Áfakulcs: '27' (alapértelmezés) vagy 'AAM' (alanyi adómentes). */
  vatMode?: SzamlazzVatMode
  /** Helyesbítő számla esetén az eredeti számla hivatkozása + saját horgony. */
  corrective?: CorrectiveInvoiceRef
  /** A fejléc-megjegyzés felülírása (alapból a rendelésre utaló szöveg). */
  megjegyzes?: string
}

import { escapeXml } from './xml'

export { escapeXml }

export interface InvoiceLineAmounts {
  nettoEgysegar: string
  nettoErtek: number
  afaErtek: number
  bruttoErtek: number
}

export interface ComputeLineAmountsOptions {
  /**
   * Negatív bruttó egységár engedélyezése — kizárólag helyesbítő (módosító)
   * számla korrekciós tételéhez. A számítás ilyenkor az abszolút értéken fut,
   * és a négy összeg előjelet vált; így a korrekciós tétel kerekítése PONTOSAN
   * tükrözi az eredeti számla tételét (teljes összegű helyesbítés nullázódik).
   */
  allowNegative?: boolean
  /** Áfakulcs: '27' (alapértelmezés) vagy 'AAM' (alanyi adómentes). */
  vatMode?: SzamlazzVatMode
}

/**
 * Tételösszegek bruttóból visszaszámolva — EGYSÉGÁR-ALAPÚ számítással.
 *
 * A Számlázz.hu tételenként ellenőrzi az egyenleteket (259–264 hibakódok):
 *   nettoEgysegar × mennyiseg = nettoErtek
 *   nettoErtek + afaErtek = bruttoErtek
 * Ezért ELŐSZÖR az egy darabra eső összegeket kerekítjük (nettoUnit =
 * round(bruttoUnit / 1,27)), és a tétel-összegek ezek PONTOS többszörösei —
 * így az első egyenlet mennyiség > 1 esetén is fillérre teljesül. (A korábbi
 * tétel-szintű kerekítés qty=3-nál pl. 33,33 × 3 = 99,99 ≠ 100 eltérést adott
 * volna.) A nettoEgysegar így mindig egész forint, stringként.
 *
 * AAM (alanyi adómentes) módban: nettoErtek = bruttoErtek, afaErtek = 0 —
 * belföldön AAM-eladóként kizárólag ez a kulcs jogszerű (a 0% és a TAM nem).
 */
export function computeLineAmounts(
  item: InvoiceItemInput,
  options: ComputeLineAmountsOptions = {},
): InvoiceLineAmounts {
  if (!Number.isInteger(item.mennyiseg) || item.mennyiseg < 1) {
    throw new SzamlazzApiError({
      message: `Érvénytelen mennyiség a számlatételben (${item.mennyiseg}).`,
      kind: 'invalid_data',
      retryable: false,
    })
  }
  const negativeAllowed = options.allowNegative === true
  if (
    !Number.isFinite(item.bruttoEgysegar) ||
    (!negativeAllowed && item.bruttoEgysegar < 0)
  ) {
    throw new SzamlazzApiError({
      message: `Érvénytelen bruttó egységár a számlatételben (${item.bruttoEgysegar}).`,
      kind: 'invalid_data',
      retryable: false,
    })
  }
  const vatMode = options.vatMode ?? '27'
  const negative = item.bruttoEgysegar < 0
  const bruttoUnit = Math.round(Math.abs(item.bruttoEgysegar))
  const nettoUnit = vatMode === 'AAM' ? bruttoUnit : Math.round(bruttoUnit / VAT_DIVISOR)
  const afaUnit = bruttoUnit - nettoUnit
  const sign = negative ? -1 : 1
  return {
    nettoEgysegar: String(sign * nettoUnit),
    nettoErtek: sign * nettoUnit * item.mennyiseg,
    afaErtek: sign * afaUnit * item.mennyiseg,
    bruttoErtek: sign * bruttoUnit * item.mennyiseg,
  }
}

/** A teljes számla-XML (xmlszamla) a hivatalos tag-sorrendben. */
export function buildInvoiceXml(input: BuildInvoiceXmlInput): string {
  const esc = escapeXml
  const corrective = input.corrective
  const vatMode = input.vatMode ?? '27'
  const teljesitesDatum = input.teljesitesDatum ?? input.issueDate
  const itemsXml = input.items
    .map((item) => {
      const amounts = computeLineAmounts(item, {
        allowNegative: corrective !== undefined,
        vatMode,
      })
      return [
        '    <tetel>',
        `      <megnevezes>${esc(item.megnevezes)}</megnevezes>`,
        `      <mennyiseg>${item.mennyiseg}</mennyiseg>`,
        '      <mennyisegiEgyseg>db</mennyisegiEgyseg>',
        `      <nettoEgysegar>${amounts.nettoEgysegar}</nettoEgysegar>`,
        `      <afakulcs>${vatMode}</afakulcs>`,
        `      <nettoErtek>${amounts.nettoErtek}</nettoErtek>`,
        `      <afaErtek>${amounts.afaErtek}</afaErtek>`,
        `      <bruttoErtek>${amounts.bruttoErtek}</bruttoErtek>`,
        '      <megjegyzes></megjegyzes>',
        '    </tetel>',
      ].join('\n')
    })
    .join('\n')

  const sendEmail = input.buyer.email.trim().length > 0
  const megjegyzes =
    input.megjegyzes ??
    `Kineticare online kurzus — rendelés: ${input.orderNumber} (Barion, bankkártya)`
  const kulsoAzon = corrective ? corrective.kulsoAzon : input.orderNumber

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
  <beallitasok>
    <szamlaagentkulcs>${esc(input.agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>false</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
    <szamlaKulsoAzon>${esc(kulsoAzon)}</szamlaKulsoAzon>
  </beallitasok>
  <fejlec>
    <keltDatum>${input.issueDate}</keltDatum>
    <teljesitesDatum>${teljesitesDatum}</teljesitesDatum>
    <fizetesiHataridoDatum>${input.issueDate}</fizetesiHataridoDatum>
    <fizmod>Barion</fizmod>
    <penznem>HUF</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    <megjegyzes>${esc(megjegyzes)}</megjegyzes>
    <arfolyamBank></arfolyamBank>
    <arfolyam></arfolyam>
    <rendelesSzam>${esc(input.orderNumber)}</rendelesSzam>
    <dijbekeroSzamlaszam></dijbekeroSzamlaszam>
    <elolegszamla>false</elolegszamla>
    <vegszamla>false</vegszamla>
    <helyesbitoszamla>${corrective ? 'true' : 'false'}</helyesbitoszamla>
    <helyesbitettSzamlaszam>${corrective ? esc(corrective.originalInvoiceNumber) : ''}</helyesbitettSzamlaszam>
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

/**
 * A számla-PDF/vevői fiók URL megbízható hosztjai. A Számlázz.hu a
 * `<vevoifiokurl>` mezőt szabad szövegként adja vissza — az érték a rendelés
 * `invoicePdfUrl` mezőjébe kerül, amit a fiók-oldal KATTINTHATÓ linkként jelenít
 * meg (src/components/account/AccountView.tsx). Ellenőrzés nélkül egy hibás
 * vagy manipulált válasz tetszőleges címre (akár `javascript:`-re) vinné a
 * vásárlót a saját rendelés-oldaláról.
 */
const TRUSTED_INVOICE_URL_HOST = 'szamlazz.hu'

/** Naplóbarát hoszt-részlet: a teljes URL sosem kerül naplóba. */
function safeUrlHost(value: string): string {
  try {
    return new URL(value).host || 'ismeretlen'
  } catch {
    return 'értelmezhetetlen-url'
  }
}

/**
 * Megbízható-e a számlához kapott URL: KIZÁRÓLAG `https` séma, és a hoszt a
 * `szamlazz.hu` vagy annak aldomainje.
 *
 * A hoszt-egyezés nem puszta végződés-vizsgálat, hanem pontos illeszkedés vagy
 * `.`-tal elválasztott aldomain — különben a `szamlazz.hu.tamado.example` is
 * átmenne.
 */
export function isTrustedInvoicePdfUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') {
    return false
  }
  const host = parsed.hostname.toLowerCase()
  return host === TRUSTED_INVOICE_URL_HOST || host.endsWith(`.${TRUSTED_INVOICE_URL_HOST}`)
}

/**
 * A Számlázz.hu hivatalos szabálya: ugyanaz a kérés legfeljebb ÖTSZÖR küldhető
 * be, utána emberi beavatkozás kell (az automatikus retry-loop a szolgáltatásból
 * való kitiltáshoz vezethet). A számláló a rendelésen perzisztens
 * (invoiceAttempts), így a job-retryk és az újrasorbaállítások együttese sem
 * lépheti túl.
 */
export const MAX_INVOICE_ATTEMPTS = 5

export interface IssueInvoiceForOrderDeps {
  payload: Payload
  orderId: number
  config?: SzamlazzClientConfig
  logger?: Logger
  /** Injektálható HTTP-hívó (teszteléshez); alapból a valódi postInvoiceXml. */
  postXml?: (xml: string, config: SzamlazzClientConfig) => Promise<SzamlazzParsedSuccess>
  /**
   * Injektálható bizonylat-lekérdező (teszteléshez); alapból a valódi
   * queryInvoiceByKulsoAzon. Két helyen fut: (1) újrapróbálás ELŐTT — a
   * „kérés elment, válasz elveszett" eset feloldására; (2) 71/152-es
   * duplikátum-jelzés után — a meglévő számla számának átvételére.
   */
  queryByKulsoAzon?: (
    kulsoAzon: string,
    config: SzamlazzClientConfig,
  ) => Promise<InvoiceLookupResult | null>
  /** A kelt-dátum felülírása (teszteléshez); alapból a mai dátum. */
  issueDate?: string
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
    await writeOrderInvoicingState(deps.payload, deps.orderId, { invoiceStatus: 'failed' })
    return { outcome: 'failed', reason: 'hiányzó rendelésszám' }
  }

  const buyer = buyerFromOrder(order)
  if (!buyer) {
    orderLog.warn(
      'hiányos vevő-számlázási adatok (név/irsz/település/cím) — számla NEM állítható ki, emberi pótlás szükséges',
    )
    await writeOrderInvoicingState(deps.payload, deps.orderId, { invoiceStatus: 'failed' })
    return { outcome: 'failed', reason: 'hiányos vevő-számlázási adatok' }
  }

  const items = itemsFromOrder(order)
  if (!items) {
    orderLog.error('RIASZTÁS: a rendelés-tételekből hiányzik az ár-snapshot — számla nem állítható ki')
    await writeOrderInvoicingState(deps.payload, deps.orderId, { invoiceStatus: 'failed' })
    return { outcome: 'failed', reason: 'hiányzó tétel ár-snapshot' }
  }

  // A14: perzisztens kísérlet-plafon — a Számlázz.hu felé ugyanaz a kérés
  // legfeljebb ötször mehet ki, utána emberi beavatkozás kell.
  const previousAttempts = order.invoiceAttempts ?? 0
  if (previousAttempts >= MAX_INVOICE_ATTEMPTS) {
    const reason = `a számlakiállítási kísérletek száma kimerült (${previousAttempts}/${MAX_INVOICE_ATTEMPTS})`
    orderLog.error(
      'RIASZTÁS: a számlakiállítás beküldései kimerültek — emberi beavatkozás kell (Számlázz.hu-szabály: max. 5 beküldés)',
      { attempts: previousAttempts, lastError: order.invoiceLastError ?? null },
    )
    await writeOrderInvoicingState(deps.payload, deps.orderId, {
      invoiceStatus: 'failed',
      invoiceLastError: reason,
    })
    return { outcome: 'failed', reason }
  }
  const attempts = previousAttempts + 1

  const issueDate = deps.issueDate ?? new Date().toISOString().slice(0, 10)
  const xml = buildInvoiceXml({
    agentKey: config.agentKey as string,
    orderNumber: order.orderNumber,
    invoicePrefix: config.invoicePrefix,
    issueDate,
    buyer,
    items,
    vatMode: config.vatMode,
  })

  await writeOrderInvoicingState(deps.payload, deps.orderId, {
    invoiceStatus: 'pending',
    invoiceAttempts: attempts,
  })

  const lookup = deps.queryByKulsoAzon ?? queryInvoiceByKulsoAzon
  /** A meglévő bizonylat átvétele (lekérdezés-találat vagy 71/152-feloldás). */
  const adoptExisting = async (szamlaszam: string, via: string): Promise<IssueInvoiceResult> => {
    await writeOrderInvoicingState(deps.payload, deps.orderId, {
      invoiceStatus: 'issued',
      invoiceNumber: szamlaszam,
      invoiceLastError: null,
      // A teljesítési dátumot nem ismerjük (a bizonylat egy KORÁBBI kísérletben
      // állt ki) — üresen marad; a helyesbítő ilyenkor figyelmeztetéssel a saját
      // kiállítási napjára esik vissza.
    })
    orderLog.info('a számla már korábban kiállt — a meglévő bizonylat átvéve', {
      invoiceNumber: szamlaszam,
      via,
      attempts,
    })
    return { outcome: 'issued', invoiceNumber: szamlaszam }
  }

  try {
    // A12: újrapróbáláskor („kérés elment, válasz elveszett" gyanú) a beküldés
    // MEGISMÉTLÉSE ELŐTT kötelező a szamlaKulsoAzon-alapú lekérdezés. A
    // lekérdezés hibája szándékosan propagál: bizonytalan állapotban nem
    // szabad vakon újra beküldeni.
    if (previousAttempts > 0) {
      const found = await lookup(order.orderNumber, config)
      if (found) {
        return await adoptExisting(found.szamlaszam, 'retry-elotti lekerdezes')
      }
    }

    const postXml = deps.postXml ?? postInvoiceXml
    const result = await postXml(xml, config)
    // A vevői fiók URL-jét CSAK allowlist után mentjük — a link a vásárló
    // fiók-oldalán kattintható. Nem megfelelő URL: nem mentjük (a számla maga
    // ettől még kiállt), és riasztunk, mert ilyet a Számlázz.hu nem küldhet.
    const trustedPdfUrl =
      result.vevoifiokUrl && isTrustedInvoicePdfUrl(result.vevoifiokUrl)
        ? result.vevoifiokUrl
        : undefined
    if (result.vevoifiokUrl && !trustedPdfUrl) {
      orderLog.warn(
        'a Számlázz.hu nem megbízható vevői fiók URL-t adott vissza — a link NEM kerül mentésre',
        // A teljes URL-t szándékosan nem naplózzuk (query-string tokent hordozhat).
        { urlHost: safeUrlHost(result.vevoifiokUrl) },
      )
    }
    await writeOrderInvoicingState(deps.payload, deps.orderId, {
      invoiceStatus: 'issued',
      invoiceNumber: result.szamlaszam,
      // A helyesbítő dátumszabályához (B4): az itt küldött teljesítési dátum rögzül.
      invoiceCompletionDate: issueDate,
      invoiceLastError: null,
      ...(trustedPdfUrl ? { invoicePdfUrl: trustedPdfUrl } : {}),
    })
    orderLog.info('számla kiállítva', { invoiceNumber: result.szamlaszam, attempts })
    return { outcome: 'issued', invoiceNumber: result.szamlaszam }
  } catch (error) {
    // 71/152 — „Már létező rendelésszám": nem hiba, hanem idempotencia-találat.
    // A meglévő bizonylat számát lekérdezéssel vesszük át.
    if (isDuplicateOrderError(error)) {
      orderLog.info(
        'a Számlázz.hu duplikátum-jelzést adott (71/152) — a meglévő számla lekérdezése',
        { agentErrorCodes: error.agentErrors.map((entry) => entry.code) },
      )
      try {
        const found = await lookup(order.orderNumber, config)
        if (found) {
          return await adoptExisting(found.szamlaszam, 'duplikatum-feloldas')
        }
        const reason =
          'a Számlázz.hu duplikátumot jelzett (71/152), de a szamlaKulsoAzon-lekérdezés nem talál bizonylatot — kézi egyeztetés szükséges'
        orderLog.error(`RIASZTÁS: ${reason}`)
        await writeOrderInvoicingState(deps.payload, deps.orderId, {
          invoiceStatus: 'failed',
          invoiceLastError: reason,
        }).catch(() => undefined)
        return { outcome: 'failed', reason }
      } catch (lookupError) {
        error = lookupError
      }
    }
    const message = error instanceof Error ? error.message : String(error)
    await writeOrderInvoicingState(deps.payload, deps.orderId, {
      invoiceStatus: 'failed',
      invoiceLastError: message,
    }).catch(() => undefined)
    if (error instanceof SzamlazzApiError) {
      orderLog.warn('számlakiállítás sikertelen', {
        kind: error.kind,
        retryable: error.retryable,
        attempts,
        agentErrorCodes: error.agentErrors.map((entry) => entry.code),
        error: error.message,
      })
      if (error.retryable) {
        // A job-retry újrapróbálja — a szamlaKulsoAzon véd a duplikáció ellen,
        // az invoiceAttempts plafon pedig a beküldések számát korlátozza.
        throw error
      }
      return { outcome: 'failed', reason: error.message }
    }
    orderLog.error('számlakiállítás váratlan hibával állt le', { attempts, error: message })
    throw error
  }
}
