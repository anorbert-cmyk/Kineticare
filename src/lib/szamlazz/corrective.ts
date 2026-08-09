import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import { getSzamlazzConfig, postInvoiceXml, type SzamlazzParsedSuccess } from './client'
import { buildInvoiceXml, buyerFromOrder } from './invoice'
import { writeOrderInvoicingState, writeOrderInvoicingStateBestEffort } from './order-state'
import {
  SzamlazzApiError,
  type IssueCorrectiveInvoiceResult,
  type SzamlazzClientConfig,
} from './types'

/**
 * Helyesbítő (módosító) számla RÉSZLEGES visszatérítéshez (C5).
 *
 * Miért nem stornó? A stornó az eredeti számla TELJES érvénytelenítése —
 * részleges visszatérítésnél a bizonylat helyes formája a helyesbítő
 * (módosító) számla, amely az eredetire hivatkozik, és csak a különbözetet
 * (a visszatérített összeget) hordozza negatív tételként. A teljes vs.
 * részleges döntést a refund összege hozza meg
 * (src/lib/refund/refund-order.ts).
 *
 * Séma-tények (https://docs.szamlazz.hu/hu/agent/basics/generate-invoice):
 * - a helyesbítő UGYANAZ az xmlszamla-művelet (action-xmlagentxmlfile), nem
 *   külön interfész (az a stornóé: xmlszamlast / action-szamla_agent_st);
 * - <fejlec><helyesbitoszamla>true</helyesbitoszamla> és
 *   <fejlec><helyesbitettSzamlaszam> = az EREDETI számla száma;
 * - a tételek a korrekciót hordozzák: negatív nettoEgysegar / nettoErtek /
 *   afaErtek / bruttoErtek (a Számlázz.hu nem számol, a tétel-matematikát
 *   validálja — ezért a computeLineAmounts abszolút értéken számol és utána
 *   előjelet vált, így a kerekítés pontosan tükrözi az eredeti tételt).
 *
 * Idempotencia — KÉT rétegben:
 * 1. Provider-oldal: szamlaKulsoAzon = `${orderNumber}-HELYESBITO-<refund-sorszám>`.
 *    Ugyanazzal a külső azonosítóval a Számlázz.hu nem állít ki újabb
 *    bizonylatot, hanem a meglévőt adja vissza — a job-újrapróbálás sem
 *    duplikálhat.
 * 2. Alkalmazás-oldal: a rendelés correctiveInvoiceSeq mezője azt tárolja,
 *    hányadik refund-bejegyzéshez készült el a legutóbbi helyesbítő. Ha ez
 *    PONTOSAN a kért sorszám (és van correctiveInvoiceNumber), a szolgáltatás
 *    hálózati hívás nélkül 'already-issued' no-opot ad. A rövidzár SZIGORÚAN
 *    egyezésre szűkített: a kiállítás nem feltétlenül sorrendi — ha egy
 *    korábbi seq job-újrapróbálása (retry-queue) AZUTÁN fut le, hogy egy
 *    későbbi seq inline már kiállt, a recordedSeq nagyobb a kértnél, de a
 *    korábbi refund bizonylata MÉG NEM készült el. Ilyenkor a kérés
 *    továbbmegy a Számlázz.hu-nak — a duplikációt a provider-oldali
 *    kulsoAzon-horgony (1. réteg) így is kizárja.
 */

export const CORRECTIVE_KULSO_AZON_INFIX = '-HELYESBITO-'

/** A helyesbítő idempotencia-horgonya (szamlaKulsoAzon) egy refund-sorszámhoz. */
export function correctiveKulsoAzon(orderNumber: string, refundSeq: number): string {
  return `${orderNumber}${CORRECTIVE_KULSO_AZON_INFIX}${refundSeq}`
}

export interface BuildCorrectiveInvoiceXmlInput {
  agentKey: string
  /** Az eredeti (helyesbítendő) számla száma. */
  originalInvoiceNumber: string
  orderNumber: string
  invoicePrefix: string
  /** A refunds-nyom 1-alapú sorszáma — az idempotencia-horgony része. */
  refundSeq: number
  /** A visszatérített (helyesbítendő) BRUTTÓ összeg, HUF — pozitív egész. */
  amountHuf: number
  /** Kiállítás dátuma (YYYY-MM-DD). */
  issueDate: string
  buyer: Parameters<typeof buildInvoiceXml>[0]['buyer']
  /** A visszatérítés indoka — a fejléc-megjegyzésbe kerül. */
  reason?: string | null
}

/**
 * A helyesbítő számla XML-je: a normál számla-váz, `corrective` hivatkozással
 * és EGY negatív korrekciós tétellel a visszatérített összegre.
 */
export function buildCorrectiveInvoiceXml(input: BuildCorrectiveInvoiceXmlInput): string {
  const reasonSuffix = input.reason?.trim() ? ` — indok: ${input.reason.trim()}` : ''
  return buildInvoiceXml({
    agentKey: input.agentKey,
    orderNumber: input.orderNumber,
    invoicePrefix: input.invoicePrefix,
    issueDate: input.issueDate,
    buyer: input.buyer,
    items: [
      {
        megnevezes: `Helyesbítés — részleges visszatérítés (rendelés: ${input.orderNumber})`,
        mennyiseg: 1,
        bruttoEgysegar: -Math.abs(input.amountHuf),
      },
    ],
    corrective: {
      originalInvoiceNumber: input.originalInvoiceNumber,
      kulsoAzon: correctiveKulsoAzon(input.orderNumber, input.refundSeq),
    },
    megjegyzes:
      `Helyesbítő számla a(z) ${input.originalInvoiceNumber} számú számlához — ` +
      `részleges visszatérítés, rendelés: ${input.orderNumber}${reasonSuffix}`,
  })
}

// ---------------------------------------------------------------------------
// Helyesbítő kiállítás a rendeléshez
// ---------------------------------------------------------------------------

export interface IssueCorrectiveInvoiceDeps {
  /**
   * Payload-példány: megadva a helyesbítő állapota a RENDELÉSRE is felkerül
   * (correctiveInvoiceStatus / correctiveInvoiceNumber / correctiveInvoiceSeq).
   */
  payload?: Payload
  /**
   * A refunds-nyom 1-alapú sorszáma, amelyhez a helyesbítő tartozik. Ez az
   * idempotencia kulcsa (orderNumber + refund-azonosító).
   */
  refundSeq: number
  /** A visszatérített bruttó összeg HUF-ban (pozitív egész). */
  amountHuf: number
  /** A visszatérítés indoka — a fejléc-megjegyzésbe kerül. */
  reason?: string | null
  config?: SzamlazzClientConfig
  logger?: Logger
  /** Injektálható HTTP-hívó (teszteléshez); alapból a valódi postInvoiceXml. */
  postXml?: (xml: string, config: SzamlazzClientConfig) => Promise<SzamlazzParsedSuccess>
  /** A kelt-dátum felülírása (teszteléshez); alapból a mai dátum. */
  issueDate?: string
}

/**
 * Újrapróbálandó-e a helyesbítő kiállítás a kapott hiba alapján (a retry-döntés
 * egyetlen forrása — a hívó ez alapján állítja sorba a jobot).
 */
export function isRetryableCorrectiveError(error: unknown): boolean {
  return error instanceof SzamlazzApiError && error.retryable
}

/**
 * Helyesbítő számla kiállítása egy részleges visszatérítéshez — idempotens:
 * - ehhez a refund-sorszámhoz már van helyesbítő → 'already-issued' (no-op);
 * - Számlázz.hu kikapcsolva → 'disabled' (no-op, NEM hiba);
 * - hiányzó rendelésszám / eredeti számlaszám / vevőadat / érvénytelen összeg
 *   → 'failed' (NEM dob: emberi pótlás kell, az újrapróbálás nem segít);
 * - retryable provider/timeout-hiba → THROW (a corrective-invoice-issue job
 *   újrapróbálja; a szamlaKulsoAzon-horgony véd a duplikáció ellen).
 */
export async function issueCorrectiveInvoiceForOrder(
  order: Order,
  deps: IssueCorrectiveInvoiceDeps,
): Promise<IssueCorrectiveInvoiceResult> {
  const log = (deps.logger ?? rootLogger).child({
    module: 'szamlazz-corrective',
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    refundSeq: deps.refundSeq,
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
  const fail = async (reason: string): Promise<IssueCorrectiveInvoiceResult> => {
    await saveStateBestEffort({ correctiveInvoiceStatus: 'failed' })
    return { outcome: 'failed', reason }
  }

  if (!config.enabled) {
    log.debug('számlázás kikapcsolva (SZAMLAZZ_AGENT_KEY nincs beállítva) — helyesbítő kihagyva')
    return { outcome: 'disabled' }
  }

  if (!Number.isInteger(deps.refundSeq) || deps.refundSeq < 1) {
    log.error('érvénytelen refund-sorszám — helyesbítő nem állítható ki', {
      refundSeq: deps.refundSeq,
    })
    return { outcome: 'failed', reason: 'érvénytelen refund-sorszám' }
  }

  // Idempotencia (alkalmazás-oldal): ehhez a refund-bejegyzéshez már készült
  // helyesbítő? KIZÁRÓLAG pontos seq-egyezésnél no-op: recordedSeq > refundSeq
  // esetén egy KORÁBBI refund elmaradt bizonylatának újrapróbálása fut (a
  // retry-queue megtöri a sorrendi kiállítást), ezért a kérést TOVÁBB kell
  // engedni — a duplikáció ellen a provider-oldali kulsoAzon-horgony véd.
  const recordedNumber = order.correctiveInvoiceNumber?.trim()
  const recordedSeq = order.correctiveInvoiceSeq ?? 0
  if (recordedNumber && recordedSeq === deps.refundSeq) {
    log.info('ehhez a visszatérítéshez már készült helyesbítő számla — idempotens no-op', {
      correctiveInvoiceNumber: recordedNumber,
      recordedSeq,
    })
    return { outcome: 'already-issued', correctiveInvoiceNumber: recordedNumber }
  }

  if (!order.orderNumber) {
    log.error('RIASZTÁS: a rendelés rendelésszám nélkül fut — helyesbítő nem állítható ki')
    return fail('hiányzó rendelésszám')
  }

  const originalInvoiceNumber = order.invoiceNumber?.trim()
  if (!originalInvoiceNumber) {
    log.warn(
      'a rendeléshez nem tartozik kiállított számla (invoiceNumber) — helyesbítő NEM állítható ki',
    )
    return fail('hiányzó eredeti számlaszám (invoiceNumber)')
  }

  if (!Number.isInteger(deps.amountHuf) || deps.amountHuf <= 0) {
    log.error('érvénytelen helyesbítendő összeg — helyesbítő nem állítható ki', {
      amountHuf: deps.amountHuf,
    })
    return fail('érvénytelen helyesbítendő összeg')
  }

  const buyer = buyerFromOrder(order)
  if (!buyer) {
    log.warn(
      'hiányos vevő-számlázási adatok (név/irsz/település/cím) — helyesbítő NEM állítható ki, emberi pótlás szükséges',
    )
    return fail('hiányos vevő-számlázási adatok')
  }

  const issueDate = deps.issueDate ?? new Date().toISOString().slice(0, 10)
  const xml = buildCorrectiveInvoiceXml({
    agentKey: config.agentKey as string,
    originalInvoiceNumber,
    orderNumber: order.orderNumber,
    invoicePrefix: config.invoicePrefix,
    refundSeq: deps.refundSeq,
    amountHuf: deps.amountHuf,
    issueDate,
    buyer,
    ...(deps.reason ? { reason: deps.reason } : {}),
  })

  await saveState({ correctiveInvoiceStatus: 'pending' })

  try {
    const postXml = deps.postXml ?? postInvoiceXml
    const result = await postXml(xml, config)
    // Ha egy KORÁBBI seq elmaradt bizonylata készült el utólag (retry), a
    // rendelésen rögzített legutóbbi szám/sorszám nem íródhat vissza egy
    // régebbire — ilyenkor csak a státusz áll vissza 'issued'-ra.
    await saveState(
      deps.refundSeq >= recordedSeq
        ? {
            correctiveInvoiceStatus: 'issued',
            correctiveInvoiceNumber: result.szamlaszam,
            correctiveInvoiceSeq: deps.refundSeq,
          }
        : { correctiveInvoiceStatus: 'issued' },
    )
    log.info('helyesbítő számla kiállítva', {
      correctiveInvoiceNumber: result.szamlaszam,
      originalInvoiceNumber,
      amountHuf: deps.amountHuf,
      szamlaKulsoAzon: correctiveKulsoAzon(order.orderNumber, deps.refundSeq),
      persisted: payload !== undefined,
    })
    return { outcome: 'issued', correctiveInvoiceNumber: result.szamlaszam }
  } catch (error) {
    await saveStateBestEffort({ correctiveInvoiceStatus: 'failed' })
    if (error instanceof SzamlazzApiError) {
      log.warn('helyesbítő számla kiállítás sikertelen', {
        kind: error.kind,
        retryable: error.retryable,
        agentErrorCodes: error.agentErrors.map((entry) => entry.code),
        error: error.message,
      })
      if (error.retryable) {
        // A corrective-invoice-issue job újrapróbálja — a kulsoAzon-horgony
        // miatt a duplikáció Számlázz.hu-oldalon sem jöhet létre.
        throw error
      }
      return { outcome: 'failed', reason: error.message }
    }
    log.error('helyesbítő számla kiállítás váratlan hibával állt le', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
