import { createLogger } from '../logger'
import { SzamlazzApiError, type SzamlazzAgentError, type SzamlazzClientConfig } from './types'

/**
 * Számlázz.hu Számla Agent kliensmag (T-024/W4-01): környezetfeloldás,
 * timeoutos HTTP-hívás, a valaszVerzio=2 XML-válasz és a szlahu_* fejlécek
 * értelmezése, strukturált hibakezelés és titokmentes naplózás.
 *
 * KÖTELEZŐEN OPCIONÁLIS: a SZAMLAZZ_AGENT_KEY hiánya NEM indulási hiba —
 * a számlázás ekkor kikapcsolt (enabled=false), a fizetési lánc ettől
 * változatlanul működik. (A Barion-klienstől eltérően itt nincs assert:
 * a számlázás üzletileg kiegészítő, nem a fizetés előfeltétele.)
 *
 * Titokvédelem: az agent-kulcs kizárólag az XML-bodyba kerül (sosem URL-be);
 * a naplóba sem kérés-, sem válasz-body nem kerül. A logger redact-listája az
 * 'apikey' kulcsot amúgy is maszkolja.
 */

export const SZAMLAZZ_DEFAULT_API_URL = 'https://www.szamlazz.hu/szamla'
export const SZAMLAZZ_DEFAULT_TIMEOUT_MS = 15_000
export const SZAMLAZZ_DEFAULT_INVOICE_PREFIX = 'KIN'

const logger = createLogger({ module: 'szamlazz' })

/** A Számlázz-konfig env-felülete (mind opcionális) — teszteléshez paraméterezhető. */
export interface SzamlazzEnv {
  SZAMLAZZ_AGENT_KEY?: string
  SZAMLAZZ_API_URL?: string
  SZAMLAZZ_INVOICE_PREFIX?: string
  SZAMLAZZ_TIMEOUT_MS?: string
  [key: string]: string | undefined
}

function readEnv(env: SzamlazzEnv, key: string): string | undefined {
  const value = env[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parseTimeoutMs(raw: string | undefined): number {
  if (raw === undefined) {
    return SZAMLAZZ_DEFAULT_TIMEOUT_MS
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : SZAMLAZZ_DEFAULT_TIMEOUT_MS
}

/**
 * Környezetfeloldás. SZAMLAZZ_AGENT_KEY nélkül enabled=false (kikapcsolt
 * számlázás). Érvénytelen SZAMLAZZ_API_URL esetén dob — az elgépelt végpont
 * ne csendben működjön. Tiszta függvény (teszteléshez env-paraméteres).
 */
export function getSzamlazzConfig(env: SzamlazzEnv = process.env): SzamlazzClientConfig {
  const agentKey = readEnv(env, 'SZAMLAZZ_AGENT_KEY')
  const rawApiUrl = readEnv(env, 'SZAMLAZZ_API_URL') ?? SZAMLAZZ_DEFAULT_API_URL

  let normalizedApiUrl: string
  try {
    const parsed = new URL(rawApiUrl)
    if (parsed.protocol !== 'https:') {
      throw new Error('not-https')
    }
    normalizedApiUrl = parsed.origin + parsed.pathname.replace(/\/+$/, '')
  } catch {
    throw new Error(
      `Számlázz.hu-konfigurációs hiba: a SZAMLAZZ_API_URL nem érvényes https URL ('${rawApiUrl}'). ` +
        `Az alapértelmezett érték: ${SZAMLAZZ_DEFAULT_API_URL}.`,
    )
  }

  return {
    enabled: agentKey !== undefined,
    apiUrl: normalizedApiUrl,
    ...(agentKey ? { agentKey } : {}),
    invoicePrefix: readEnv(env, 'SZAMLAZZ_INVOICE_PREFIX') ?? SZAMLAZZ_DEFAULT_INVOICE_PREFIX,
    timeoutMs: parseTimeoutMs(readEnv(env, 'SZAMLAZZ_TIMEOUT_MS')),
  }
}

// ---------------------------------------------------------------------------
// Válasz-értelmezés (valaszVerzio=2 XML + szlahu_* fejlécek)
// ---------------------------------------------------------------------------

/** Egy XML-tag értékének kinyerése (első előfordulás). */
function tagValue(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)
  return match?.[1]?.trim()
}

/** Összes hibakod/hibauzenet pár kinyerése — <hiba>-blokkonként vagy laposan. */
function extractAgentErrors(xml: string): SzamlazzAgentError[] {
  const errors: SzamlazzAgentError[] = []
  const hibaBlocks = xml.match(/<hiba>[\s\S]*?<\/hiba>/g)
  if (hibaBlocks && hibaBlocks.length > 0) {
    for (const block of hibaBlocks) {
      errors.push({
        code: tagValue(block, 'hibakod') ?? 'Ismeretlen',
        message: tagValue(block, 'hibauzenet') ?? '',
      })
    }
    return errors
  }
  // Lapos forma: közvetlen <hibakod>/<hibauzenet> a gyökérben.
  const flatCode = tagValue(xml, 'hibakod')
  if (flatCode !== undefined) {
    errors.push({ code: flatCode, message: tagValue(xml, 'hibauzenet') ?? '' })
  }
  return errors
}

function isTruthyHeader(value: string | null): boolean {
  return value !== null && value !== '' && value !== '0' && value.toLowerCase() !== 'false'
}

export interface SzamlazzParsedSuccess {
  szamlaszam: string
  /** Vevői fiók URL (ha a Számlázz.hu adja) — a rendelés invoicePdfUrl mezőjéhez. */
  vevoifiokUrl?: string
}

/**
 * A Számla Agent válasz értelmezése. Siker esetén a számlaszám (és a vevői
 * fiók URL, ha adott); minden hibaág strukturált SzamlazzApiError.
 *
 * Sorrend: szlahu_down (karbantartás, retryable) → szlahu_error fejléc →
 * XML <sikeres>false</sikeres> → <sikeres>true</sikeres> → egyéb: invalid_response.
 */
export function parseAgentResponse(body: string, headers: Headers): SzamlazzParsedSuccess {
  if (isTruthyHeader(headers.get('szlahu_down'))) {
    throw new SzamlazzApiError({
      message: 'A Számlázz.hu karbantartás miatt átmenetileg nem elérhető (szlahu_down).',
      kind: 'http',
      retryable: true,
    })
  }

  const headerError = headers.get('szlahu_error')
  if (isTruthyHeader(headerError)) {
    const headerCode = headers.get('szlahu_error_code') ?? 'Ismeretlen'
    throw new SzamlazzApiError({
      message: `Számla Agent hiba (fejléc): ${headerCode} — ${headerError}`,
      kind: 'agent',
      agentErrors: [{ code: headerCode, message: headerError as string }],
      retryable: false,
    })
  }

  const sikeres = tagValue(body, 'sikeres')
  if (sikeres === 'true') {
    const szamlaszam = tagValue(body, 'szamlaszam')
    if (!szamlaszam) {
      throw new SzamlazzApiError({
        message: 'A Számlázz.hu sikerválasza nem tartalmaz számlaszámot.',
        kind: 'invalid_response',
        retryable: false,
      })
    }
    const vevoifiokUrl = tagValue(body, 'vevoifiokurl')
    return { szamlaszam, ...(vevoifiokUrl ? { vevoifiokUrl } : {}) }
  }
  if (sikeres === 'false') {
    const agentErrors = extractAgentErrors(body)
    throw new SzamlazzApiError({
      message: `Számla Agent elutasította a számlakiállítást: ${
        agentErrors.map((error) => `${error.code} — ${error.message}`).join('; ') || 'ismeretlen hiba'
      }`,
      kind: 'agent',
      agentErrors,
      retryable: false,
    })
  }

  throw new SzamlazzApiError({
    message: 'A Számlázz.hu válasza nem értelmezhető (nincs <sikeres> elem).',
    kind: 'invalid_response',
    retryable: false,
  })
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
 * Számla-Agent hívás: a kész számla-XML POST-olása az
 * 'action-xmlagentxmlfile' multipart-mezőben. Az agent-kulcs az XML-ben
 * (bodyban) utazik — sosem az URL-ben. Naplózás titokmentesen.
 */
export async function postInvoiceXml(
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

  const endpoint = 'POST /szamla (action-xmlagentxmlfile)'
  const form = new FormData()
  form.append('action-xmlagentxmlfile', new Blob([xml], { type: 'text/xml' }), 'szamla.xml')

  const startedAt = Date.now()
  let response: Response
  try {
    response = await fetch(resolved.apiUrl, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(resolved.timeoutMs),
    })
  } catch (error) {
    const durationMs = Date.now() - startedAt
    if (isAbortError(error)) {
      logger.error('Számlázz.hu hívás timeout', {
        endpoint,
        timeoutMs: resolved.timeoutMs,
        durationMs,
      })
      throw new SzamlazzApiError({
        message: `A Számlázz.hu nem válaszolt ${resolved.timeoutMs} ms-en belül.`,
        kind: 'timeout',
        retryable: true,
      })
    }
    logger.error('Számlázz.hu hálózati hiba', {
      endpoint,
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    throw new SzamlazzApiError({
      message: `A Számlázz.hu elérhetetlen: ${error instanceof Error ? error.message : String(error)}`,
      kind: 'network',
      retryable: true,
    })
  }

  const durationMs = Date.now() - startedAt
  if (!response.ok) {
    logger.error('Számlázz.hu HTTP-hiba', { endpoint, httpStatus: response.status, durationMs })
    throw new SzamlazzApiError({
      message: `Számlázz.hu HTTP-hiba (${response.status}).`,
      kind: 'http',
      httpStatus: response.status,
      retryable: response.status >= 500,
    })
  }

  const body = await response.text()
  const result = parseAgentResponse(body, response.headers)
  logger.info('Számlázz.hu számla kiállítva', {
    endpoint,
    durationMs,
    szamlaszam: result.szamlaszam,
  })
  return result
}
