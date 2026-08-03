/**
 * Számlázz.hu Számla Agent — típusok és a strukturált hibaosztály (T-024/W4-01).
 *
 * A Számla Agent XML-protokollja (https://docs.szamlazz.hu/hu/agent):
 * - POST https://www.szamlazz.hu/szamla/ , multipart/form-data, az XML az
 *   'action-xmlagentxmlfile' mezőben utazik (fájlként, szöveges XML).
 * - A válasz valaszVerzio=2 mellett XML (xmlszamlavalasz): <sikeres>,
 *   <szamlaszam>, hiba esetén <hibakod>/<hibauzenet>. Egyes hibák csak a
 *   szlahu_* HTTP-válaszfejlécekből derülnek ki (pl. szlahu_down).
 * - A <szamlaKulsoAzon> a harmadik fél rendszerének azonosítója — mi az
 *   orderNumber-t küldjük (idempotencia-horgony: ugyanazzal a kulccsal a
 *   Számlázz.hu nem állít ki újabb számlát, hanem a meglévőt adja vissza).
 */

export type SzamlazzErrorKind =
  | 'timeout'
  | 'network'
  | 'http'
  | 'agent'
  | 'invalid_response'
  | 'invalid_data'

/** Számla Agent hibaobjektum (hibakod + hibauzenet pár). */
export interface SzamlazzAgentError {
  code: string
  message: string
}

export class SzamlazzApiError extends Error {
  readonly kind: SzamlazzErrorKind
  readonly httpStatus?: number
  readonly agentErrors: SzamlazzAgentError[]
  /** Újrapróbálható-e (a job-retry e szerint dönt). */
  readonly retryable: boolean

  constructor(args: {
    message: string
    kind: SzamlazzErrorKind
    httpStatus?: number
    agentErrors?: SzamlazzAgentError[]
    retryable: boolean
  }) {
    super(args.message)
    this.name = 'SzamlazzApiError'
    this.kind = args.kind
    this.httpStatus = args.httpStatus
    this.agentErrors = args.agentErrors ?? []
    this.retryable = args.retryable
  }
}

export interface SzamlazzClientConfig {
  /** false, ha SZAMLAZZ_AGENT_KEY nincs beállítva — ilyenkor a számlázás ki van kapcsolva (nem hiba). */
  enabled: boolean
  /** Számla Agent végpont (default: https://www.szamlazz.hu/szamla) — záró perjel nélkül. */
  apiUrl: string
  /** Számla Agent kulcs — SOHA ne naplózd! (enabled=false esetén undefined). */
  agentKey?: string
  /** Számlaszám-előtag (a Számlázz.hu felületen beállított Előtagok egyike). */
  invoicePrefix: string
  timeoutMs: number
}

/** A számlakiállítás kimenetele a job és a naplózás számára. */
export type IssueInvoiceOutcome = 'issued' | 'already-issued' | 'disabled' | 'failed'

export interface IssueInvoiceResult {
  outcome: IssueInvoiceOutcome
  invoiceNumber?: string
  /** failed kimenetelnél az ok (emberi olvasásra). */
  reason?: string
}
