import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { logger as rootLogger, type Logger } from '../logger'
import {
  getSzamlazzConfig,
  isDuplicateOrderError,
  postInvoiceXml,
  type SzamlazzParsedSuccess,
} from './client'
import { buildInvoiceXml, buyerFromOrder } from './invoice'
import { queryInvoiceByKulsoAzon, type InvoiceLookupResult } from './pdf'
import { writeOrderInvoicingState, writeOrderInvoicingStateBestEffort } from './order-state'
import {
  SzamlazzApiError,
  type IssueCorrectiveInvoiceResult,
  type SzamlazzClientConfig,
  type SzamlazzVatMode,
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

/**
 * A14: a helyesbítő-beküldések perzisztens plafonja (Számlázz.hu-szabály:
 * ugyanaz a kérés legfeljebb ötször, utána emberi beavatkozás).
 */
export const MAX_CORRECTIVE_ATTEMPTS = 5

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
  /**
   * Az EREDETI számla teljesítési dátuma (YYYY-MM-DD) — a helyesbítő ezt
   * ismétli meg (NAV-szabály: a hónap nem térhet el). Elhagyva = issueDate.
   */
  teljesitesDatum?: string
  /** Áfakulcs — az eredeti számláéval egyezően ('27' | 'AAM'). */
  vatMode?: SzamlazzVatMode
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
    ...(input.teljesitesDatum ? { teljesitesDatum: input.teljesitesDatum } : {}),
    ...(input.vatMode ? { vatMode: input.vatMode } : {}),
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
  /**
   * Injektálható bizonylat-lekérdező (teszteléshez); alapból a valódi
   * queryInvoiceByKulsoAzon — a retry-előtti ellenőrzéshez és a 71/152-es
   * duplikátum-jelzés feloldásához.
   */
  queryByKulsoAzon?: (
    kulsoAzon: string,
    config: SzamlazzClientConfig,
  ) => Promise<InvoiceLookupResult | null>
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

  // A14: perzisztens kísérlet-plafon a helyesbítő-beküldésekre is.
  const previousAttempts = order.correctiveInvoiceAttempts ?? 0
  if (previousAttempts >= MAX_CORRECTIVE_ATTEMPTS) {
    const reason = `a helyesbítő-kiállítási kísérletek száma kimerült (${previousAttempts}/${MAX_CORRECTIVE_ATTEMPTS})`
    log.error(
      'RIASZTÁS: a helyesbítő-kiállítás beküldései kimerültek — emberi beavatkozás kell (Számlázz.hu-szabály: max. 5 beküldés)',
      { attempts: previousAttempts, lastError: order.correctiveInvoiceLastError ?? null },
    )
    await saveStateBestEffort({
      correctiveInvoiceStatus: 'failed',
      correctiveInvoiceLastError: reason,
    })
    return { outcome: 'failed', reason }
  }
  const attempts = previousAttempts + 1

  const issueDate = deps.issueDate ?? new Date().toISOString().slice(0, 10)
  // B4 (NAV-dátumszabály): a helyesbítő teljesítési dátuma az EREDETI számláét
  // ismétli. A dátum a kiálláskor rögzül a rendelésen (invoiceCompletionDate);
  // régi, a mező bevezetése előtti számláknál figyelmeztetéssel a kiállítás
  // napjára esünk vissza — hónapforduló környékén ez kézi ellenőrzést kíván.
  const originalCompletionDate = order.invoiceCompletionDate?.trim()
  if (!originalCompletionDate) {
    log.warn(
      'az eredeti számla teljesítési dátuma nincs rögzítve (invoiceCompletionDate) — a helyesbítő a kiállítás napját használja; hónapfordulónál kézi ellenőrzés javasolt',
    )
  }
  const xml = buildCorrectiveInvoiceXml({
    agentKey: config.agentKey as string,
    originalInvoiceNumber,
    orderNumber: order.orderNumber,
    invoicePrefix: config.invoicePrefix,
    refundSeq: deps.refundSeq,
    amountHuf: deps.amountHuf,
    issueDate,
    ...(originalCompletionDate ? { teljesitesDatum: originalCompletionDate } : {}),
    vatMode: config.vatMode,
    buyer,
    ...(deps.reason ? { reason: deps.reason } : {}),
  })

  await saveState({ correctiveInvoiceStatus: 'pending', correctiveInvoiceAttempts: attempts })

  const kulsoAzon = correctiveKulsoAzon(order.orderNumber, deps.refundSeq)
  const lookup = deps.queryByKulsoAzon ?? queryInvoiceByKulsoAzon
  /** A meglévő helyesbítő átvétele (lekérdezés-találat vagy 71/152-feloldás). */
  const adoptExisting = async (
    szamlaszam: string,
    via: string,
  ): Promise<IssueCorrectiveInvoiceResult> => {
    await saveState(
      deps.refundSeq >= recordedSeq
        ? {
            correctiveInvoiceStatus: 'issued',
            correctiveInvoiceNumber: szamlaszam,
            correctiveInvoiceSeq: deps.refundSeq,
            correctiveInvoiceLastError: null,
          }
        : { correctiveInvoiceStatus: 'issued', correctiveInvoiceLastError: null },
    )
    log.info('a helyesbítő már korábban kiállt — a meglévő bizonylat átvéve', {
      correctiveInvoiceNumber: szamlaszam,
      via,
      attempts,
    })
    return { outcome: 'issued', correctiveInvoiceNumber: szamlaszam }
  }

  try {
    // A12: újrapróbáláskor a beküldés megismétlése ELŐTT lekérdezés — a
    // „kérés elment, válasz elveszett" esetben a bizonylat már létezhet.
    if (previousAttempts > 0) {
      const found = await lookup(kulsoAzon, config)
      if (found) {
        return await adoptExisting(found.szamlaszam, 'retry-elotti lekerdezes')
      }
    }

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
            correctiveInvoiceLastError: null,
          }
        : { correctiveInvoiceStatus: 'issued', correctiveInvoiceLastError: null },
    )
    log.info('helyesbítő számla kiállítva', {
      correctiveInvoiceNumber: result.szamlaszam,
      originalInvoiceNumber,
      amountHuf: deps.amountHuf,
      szamlaKulsoAzon: kulsoAzon,
      attempts,
      persisted: payload !== undefined,
    })
    return { outcome: 'issued', correctiveInvoiceNumber: result.szamlaszam }
  } catch (error) {
    // 71/152 — duplikátum-jelzés: a meglévő helyesbítő átvétele lekérdezéssel.
    if (isDuplicateOrderError(error)) {
      log.info(
        'a Számlázz.hu duplikátum-jelzést adott (71/152) — a meglévő helyesbítő lekérdezése',
        { agentErrorCodes: error.agentErrors.map((entry) => entry.code) },
      )
      try {
        const found = await lookup(kulsoAzon, config)
        if (found) {
          return await adoptExisting(found.szamlaszam, 'duplikatum-feloldas')
        }
        const reason =
          'a Számlázz.hu duplikátumot jelzett (71/152), de a szamlaKulsoAzon-lekérdezés nem talál bizonylatot — kézi egyeztetés szükséges'
        log.error(`RIASZTÁS: ${reason}`)
        await saveStateBestEffort({
          correctiveInvoiceStatus: 'failed',
          correctiveInvoiceLastError: reason,
        })
        return { outcome: 'failed', reason }
      } catch (lookupError) {
        error = lookupError
      }
    }
    const message = error instanceof Error ? error.message : String(error)
    await saveStateBestEffort({
      correctiveInvoiceStatus: 'failed',
      correctiveInvoiceLastError: message,
    })
    if (error instanceof SzamlazzApiError) {
      log.warn('helyesbítő számla kiállítás sikertelen', {
        kind: error.kind,
        retryable: error.retryable,
        attempts,
        agentErrorCodes: error.agentErrors.map((entry) => entry.code),
        error: error.message,
      })
      if (error.retryable) {
        // A corrective-invoice-issue job újrapróbálja — a kulsoAzon-horgony
        // miatt a duplikáció Számlázz.hu-oldalon sem jöhet létre, a beküldések
        // számát pedig a correctiveInvoiceAttempts plafon fogja.
        throw error
      }
      return { outcome: 'failed', reason: error.message }
    }
    log.error('helyesbítő számla kiállítás váratlan hibával állt le', {
      attempts,
      error: message,
    })
    throw error
  }
}
