import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import {
  getSzamlazzConfig,
  parseAgentResponse,
  type SzamlazzParsedSuccess,
} from './client'
import { escapeXml } from './invoice'
import { writeOrderInvoicingState, writeOrderInvoicingStateBestEffort } from './order-state'
import {
  SzamlazzApiError,
  type IssueStornoResult,
  type SzamlazzClientConfig,
} from './types'

/**
 * Stornó-számla kiállítás a Számlázz.hu Számla Agent DEDIKÁLT sztornó
 * interfészén (xmlszamlast / action-szamla_agent_st).
 *
 * Séma-tények (hivatalos XSD: https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd
 * és https://docs.szamlazz.hu/hu/agent/reversing_invoice/xml):
 * - A stornó NEM a sima számla-XML (xmlszamla) része — abban nincs stornó-tag
 *   (a helyesbitoszamla/helyesbitettSzamlaszam a helyesbítő, módosító okirat,
 *   az NEM stornó). A sztornózást külön XML-művelet szolgálja.
 * - A hivatkozás az eredeti számlára: <fejlec><szamlaszam> (KÖTELEZŐ) — ide
 *   az eredeti számla száma kerül (nálad: order.invoiceNumber).
 * - <fejlec><tipus>SS</tipus> (sztornó számla); <megjegyzes> a sztornózás oka.
 * - A stornó XML-ben NINCS tétel-/összegblokk: a Számlázz.hu az eredeti
 *   számlából generálja a negatív bizonylatot (ezért a computeLineAmounts
 *   itt nem kell — a tételmátrix az eredeti számlán rögzült).
 * - szamlaKulsoAzon = `${orderNumber}-STORNO` (idempotencia-horgony: ismételt
 *   beküldésre a Számlázz.hu nem állít ki újabb stornót).
 * - valaszVerzio=2: a válasz ugyanaz az xmlszamlavalasz, mint a számlakiállításnál
 *   (parseAgentResponse újrahasznosítható).
 *
 * Stornó-állapot a rendelésen (C4): az orders collection a stornoStatus
 * (none|pending|storned|failed), stornoNumber, stornoAttempts és
 * stornoLastError mezőket hordozza — a számla-státusz (invoiceStatus /
 * invoiceNumber) mintájára. Az issueStornoForOrder Payload-példány mellett
 * ezeket írja is; a retryable hibák újrapróbálását a storno-issue job végzi
 * (src/jobs/tasks/storno-issue.ts, az invoice-issue mintájára).
 */

export const STORNO_KULSO_AZON_SUFFIX = '-STORNO'

/**
 * Egy rendelés maximális stornó-kísérletei (első + újrapróbálások). A job-retry
 * és az esetleges újrasorbaállítás együtt sem futhat végtelenszer: a limit
 * felett a stornó 'failed' marad, és error-szintű owner-jelzés kerül a naplóba.
 */
export const MAX_STORNO_ATTEMPTS = 5

export interface BuildStornoXmlInput {
  agentKey: string
  /** Az eredeti (stornózandó) számla száma — <fejlec><szamlaszam>. */
  originalInvoiceNumber: string
  /** A rendelésszám — a szamlaKulsoAzon `${orderNumber}-STORNO` lesz. */
  orderNumber: string
  /** A stornó-számla kelte (YYYY-MM-DD) — kelt és teljesítés egységesen. */
  issueDate: string
  /** A sztornózás oka (a <megjegyzes> mezőbe; üres is lehet). */
  reason?: string
  /** A vevő e-mail-címe (a stornó-értesítő kiküldéséhez; üres is lehet). */
  buyerEmail?: string
}

/**
 * A teljes stornó-XML (xmlszamlast) a hivatalos tag-sorrendben.
 * A váz-tagok üresen is jelen vannak (a mezősorrend kötött, a mintának
 * megfelelően), a dinamikus értékek XML-escape-elve.
 */
export function buildStornoXml(input: BuildStornoXmlInput): string {
  const esc = escapeXml
  const megjegyzes = input.reason?.trim()
    ? esc(input.reason.trim())
    : esc(`Visszatérítés (refund) — rendelés: ${input.orderNumber}`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlast xmlns="http://www.szamlazz.hu/xmlszamlast" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlast https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd">
  <beallitasok>
    <szamlaagentkulcs>${esc(input.agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>false</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
    <szamlaKulsoAzon>${esc(input.orderNumber)}${STORNO_KULSO_AZON_SUFFIX}</szamlaKulsoAzon>
  </beallitasok>
  <fejlec>
    <szamlaszam>${esc(input.originalInvoiceNumber)}</szamlaszam>
    <keltDatum>${input.issueDate}</keltDatum>
    <teljesitesDatum>${input.issueDate}</teljesitesDatum>
    <megjegyzes>${megjegyzes}</megjegyzes>
    <tipus>SS</tipus>
  </fejlec>
  <elado>
    <emailReplyto></emailReplyto>
    <emailTargy></emailTargy>
    <emailSzoveg></emailSzoveg>
  </elado>
  <vevo>
    <email>${esc(input.buyerEmail ?? '')}</email>
  </vevo>
</xmlszamlast>`
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('aborted'))
  )
}

/**
 * A stornó-XML POST-olása az 'action-szamla_agent_st' multipart-mezőben.
 * A postInvoiceXml stornó-változata: az agent-kulcs az XML-ben (bodyban)
 * utazik, a napló titokmentes, a hibaágak megegyeznek (timeout/network/http/
 * agent/invalid_response — a parseAgentResponse-t újrahasznosítja).
 */
export async function postStornoXml(
  xml: string,
  config?: SzamlazzClientConfig,
): Promise<SzamlazzParsedSuccess> {
  const resolved = config ?? getSzamlazzConfig()
  if (!resolved.enabled || !resolved.agentKey) {
    throw new SzamlazzApiError({
      message: 'A Számlázz.hu-integráció nincs beállítva (SZAMLAZZ_AGENT_KEY hiányzik).',
      kind: 'invalid_data',
      retryable: false,
    })
  }

  const endpoint = 'POST /szamla (action-szamla_agent_st)'
  const form = new FormData()
  form.append('action-szamla_agent_st', new Blob([xml], { type: 'text/xml' }), 'szamlast.xml')

  const startedAt = Date.now()
  let response: Response
  try {
    response = await fetch(resolved.apiUrl, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(resolved.timeoutMs),
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new SzamlazzApiError({
        message: `A Számlázz.hu nem válaszolt ${resolved.timeoutMs} ms-en belül.`,
        kind: 'timeout',
        retryable: true,
      })
    }
    throw new SzamlazzApiError({
      message: `A Számlázz.hu elérhetetlen: ${error instanceof Error ? error.message : String(error)}`,
      kind: 'network',
      retryable: true,
    })
  }

  const durationMs = Date.now() - startedAt
  if (!response.ok) {
    throw new SzamlazzApiError({
      message: `Számlázz.hu HTTP-hiba (${response.status}).`,
      kind: 'http',
      httpStatus: response.status,
      retryable: response.status >= 500,
    })
  }

  const body = await response.text()
  const result = parseAgentResponse(body, response.headers)
  const log = rootLogger.child({ module: 'szamlazz-storno' })
  log.info('Számlázz.hu stornó-számla kiállítva', {
    endpoint,
    durationMs,
    szamlaszam: result.szamlaszam,
  })
  return result
}

// ---------------------------------------------------------------------------
// Stornó-kiállítás a rendeléshez
// ---------------------------------------------------------------------------

export interface IssueStornoForOrderDeps {
  /**
   * Payload-példány: megadva a stornó állapota a RENDELÉSRE is felkerül
   * (stornoStatus/stornoNumber/stornoAttempts/stornoLastError). Elhagyva a
   * szolgáltatás csak a hálózati műveletet végzi és naplóz — a dupla stornó
   * ellen ilyenkor is a szamlaKulsoAzon-horgony véd.
   */
  payload?: Payload
  config?: SzamlazzClientConfig
  logger?: Logger
  /** Injektálható HTTP-hívó (teszteléshez); alapból a valódi postStornoXml. */
  postXml?: (xml: string, config: SzamlazzClientConfig) => Promise<SzamlazzParsedSuccess>
  /** A kelt-dátum felülírása (teszteléshez); alapból a mai dátum. */
  issueDate?: string
  /** A stornó indoka (pl. a refund reason) — a <megjegyzes> mezőbe kerül. */
  reason?: string | null
}

/**
 * Újrapróbálandó-e a stornó a kapott hiba alapján. Ez a retry-döntés egyetlen
 * forrása: a hívó (refund-bekötés) ez alapján állítja sorba a storno-issue
 * jobot, a job pedig a dobott hibától kap Payload-szintű újrapróbálást.
 */
export function isRetryableStornoError(error: unknown): boolean {
  return error instanceof SzamlazzApiError && error.retryable
}

/** A vevő e-mail-címe a customerSnapshot-ból, fallback a customerEmail. */
function buyerEmailFromOrder(order: Order): string {
  const snapshot =
    typeof order.customerSnapshot === 'object' &&
    order.customerSnapshot !== null &&
    !Array.isArray(order.customerSnapshot)
      ? (order.customerSnapshot as Record<string, unknown>)
      : {}
  const snapshotEmail = typeof snapshot.email === 'string' ? snapshot.email.trim() : ''
  return snapshotEmail || (order.customerEmail ?? '').trim()
}

/**
 * Stornó-számla kiállítása egy rendeléshez — idempotens:
 * - a rendelésen már rögzítve van stornó (stornoNumber vagy
 *   stornoStatus='storned') → 'already-storned' (no-op);
 * - Számlázz.hu kikapcsolva (nincs agent-kulcs) → 'disabled' (no-op, NEM hiba);
 * - hiányzó eredeti számlaszám / rendelésszám → 'failed' + stornoStatus
 *   'failed' (NEM dob — emberi beavatkozás kell, az újrapróbálás nem segít);
 * - kimerült kísérletszám (MAX_STORNO_ATTEMPTS) → 'failed' hálózati hívás
 *   NÉLKÜL, error-szintű owner-jelzéssel;
 * - retryable provider/timeout-hiba → stornoStatus 'failed' + THROW (a
 *   storno-issue job újrapróbálja; a szamlaKulsoAzon-horgony miatt a
 *   duplikáció Számlázz.hu-oldalon sem jöhet létre).
 *
 * A `deps.payload` megadásakor minden állapotátmenet a rendelésre is felkerül
 * (pending → storned | failed, attempts-számlálóval és utolsó hibaüzenettel).
 */
export async function issueStornoForOrder(
  order: Order,
  deps: IssueStornoForOrderDeps = {},
): Promise<IssueStornoResult> {
  const log = (deps.logger ?? rootLogger).child({
    module: 'szamlazz-storno',
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
  })
  const config = deps.config ?? getSzamlazzConfig()
  const payload = deps.payload
  const saveState = async (data: Record<string, unknown>): Promise<void> => {
    if (payload) {
      await writeOrderInvoicingState(payload, order.id, data)
    }
  }
  const saveStateBestEffort = async (data: Record<string, unknown>): Promise<void> => {
    if (payload) {
      await writeOrderInvoicingStateBestEffort(payload, order.id, data, log)
    }
  }

  if (!config.enabled) {
    log.debug('számlázás kikapcsolva (SZAMLAZZ_AGENT_KEY nincs beállítva) — stornó kihagyva')
    return { outcome: 'disabled' }
  }

  // Idempotencia (alkalmazás-oldal): a rendelésen rögzített stornó.
  const recordedStornoNumber = order.stornoNumber?.trim()
  if (recordedStornoNumber || order.stornoStatus === 'storned') {
    log.info('a rendeléshez már rögzítve van stornó-számla — idempotens no-op', {
      stornoNumber: recordedStornoNumber ?? null,
    })
    return {
      outcome: 'already-storned',
      ...(recordedStornoNumber ? { stornoNumber: recordedStornoNumber } : {}),
    }
  }

  if (!order.orderNumber) {
    log.error('RIASZTÁS: a rendelés rendelésszám nélkül fut — stornó nem állítható ki')
    await saveStateBestEffort({ stornoStatus: 'failed', stornoLastError: 'hiányzó rendelésszám' })
    return { outcome: 'failed', reason: 'hiányzó rendelésszám' }
  }

  const originalInvoiceNumber = order.invoiceNumber?.trim()
  if (!originalInvoiceNumber) {
    // Nem retryable: számla nélkül nincs mit stornózni — emberi pótlás kell.
    const reason = 'hiányzó eredeti számlaszám (invoiceNumber)'
    log.warn(
      'a rendeléshez nem tartozik kiállított számla (invoiceNumber) — stornó NEM állítható ki',
    )
    await saveStateBestEffort({ stornoStatus: 'failed', stornoLastError: reason })
    return { outcome: 'failed', reason }
  }

  const previousAttempts = order.stornoAttempts ?? 0
  if (previousAttempts >= MAX_STORNO_ATTEMPTS) {
    const reason = `a stornó-kísérletek száma kimerült (${previousAttempts}/${MAX_STORNO_ATTEMPTS})`
    log.error('RIASZTÁS: a stornó-kiállítás újrapróbálásai kimerültek — emberi beavatkozás kell', {
      attempts: previousAttempts,
      lastError: order.stornoLastError ?? null,
    })
    await saveStateBestEffort({ stornoStatus: 'failed', stornoLastError: reason })
    return { outcome: 'failed', reason }
  }
  const attempts = previousAttempts + 1

  const issueDate = deps.issueDate ?? new Date().toISOString().slice(0, 10)
  const buyerEmail = buyerEmailFromOrder(order)
  const xml = buildStornoXml({
    agentKey: config.agentKey as string,
    originalInvoiceNumber,
    orderNumber: order.orderNumber,
    issueDate,
    ...(deps.reason ? { reason: deps.reason } : {}),
    ...(buyerEmail ? { buyerEmail } : {}),
  })

  await saveState({ stornoStatus: 'pending', stornoAttempts: attempts })

  try {
    const postXml = deps.postXml ?? postStornoXml
    const result = await postXml(xml, config)
    await saveState({
      stornoStatus: 'storned',
      stornoNumber: result.szamlaszam,
      stornoAttempts: attempts,
      stornoLastError: null,
    })
    log.info('stornó-számla kiállítva', {
      stornoNumber: result.szamlaszam,
      originalInvoiceNumber,
      attempts,
      szamlaKulsoAzon: `${order.orderNumber}${STORNO_KULSO_AZON_SUFFIX}`,
      persisted: payload !== undefined,
    })
    return { outcome: 'storned', stornoNumber: result.szamlaszam }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await saveStateBestEffort({
      stornoStatus: 'failed',
      stornoAttempts: attempts,
      stornoLastError: message,
    })
    if (error instanceof SzamlazzApiError) {
      log.warn('stornó-számla kiállítás sikertelen', {
        kind: error.kind,
        retryable: error.retryable,
        attempts,
        agentErrorCodes: error.agentErrors.map((entry) => entry.code),
        error: error.message,
      })
      if (error.retryable) {
        // A hívó (refund-bekötés) a storno-issue jobot állítja sorba, a job
        // pedig a dobott hibától kap Payload-szintű újrapróbálást —
        // a szamlaKulsoAzon véd a duplikáció ellen.
        throw error
      }
      return { outcome: 'failed', reason: error.message }
    }
    log.error('stornó-számla kiállítás váratlan hibával állt le', { attempts, error: message })
    throw error
  }
}
