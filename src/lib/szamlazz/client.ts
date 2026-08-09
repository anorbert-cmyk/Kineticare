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

/**
 * A hivatalos Agent-végpont — ZÁRÓ PERJELLEL (https://www.szamlazz.hu/szamla/).
 * A perjel nélküli alakra a szerver átirányíthat, és egy 301/302-es redirectet
 * a fetch GET-ként követne: a multipart törzs (benne az XML) elveszne, a hívás
 * pedig 53-as „Hiányzó XML fájl" hibába futna.
 */
export const SZAMLAZZ_DEFAULT_API_URL = 'https://www.szamlazz.hu/szamla/'
export const SZAMLAZZ_DEFAULT_TIMEOUT_MS = 15_000
export const SZAMLAZZ_DEFAULT_INVOICE_PREFIX = 'KIN'

/**
 * Hivatalos hibakód-osztályozás (docs.szamlazz.hu/agent/basics/error-handling):
 * - '1' — rendszerkarbantartás: az EGYETLEN explicit újrapróbálhatóként
 *   dokumentált kód (pár perc múlva). Minden más agent-kód végleges: auth/fiók
 *   (3, 135, 136, 164), kérésformátum (53, 57), e-számla-beállítás (54, 55),
 *   előtag (202), tétel-matematika (259–264) — ezekre az újraküldés ugyanazt
 *   a hibát adná, a max. 5 beküldés keretét pedig feleslegesen égetné.
 * - '71'/'152' — „Már létező rendelésszám": nem hiba, hanem idempotencia-
 *   találat (kind: 'duplicate') — a hívó a szamlaKulsoAzon-lekérdezéssel veszi
 *   át a meglévő bizonylat számát.
 */
export const SZAMLAZZ_RETRYABLE_AGENT_CODES: ReadonlySet<string> = new Set(['1'])
export const SZAMLAZZ_DUPLICATE_AGENT_CODES: ReadonlySet<string> = new Set(['71', '152'])

/** 71/152 — a Számlázz.hu duplikátum-jelzése (idempotencia-találat, nem hiba). */
export function isDuplicateOrderError(error: unknown): error is SzamlazzApiError {
  return error instanceof SzamlazzApiError && error.kind === 'duplicate'
}

const logger = createLogger({ module: 'szamlazz' })

/** A Számlázz-konfig env-felülete (mind opcionális) — teszteléshez paraméterezhető. */
export interface SzamlazzEnv {
  SZAMLAZZ_AGENT_KEY?: string
  SZAMLAZZ_API_URL?: string
  SZAMLAZZ_INVOICE_PREFIX?: string
  SZAMLAZZ_AFAKULCS?: string
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
    // Pontosan EGY záró perjel — perjel nélkül a POST egy redirecten GET-té
    // silányulhat (a multipart törzs elveszne), dupla perjel pedig zaj.
    normalizedApiUrl = parsed.origin + parsed.pathname.replace(/\/*$/, '/')
  } catch {
    throw new Error(
      `Számlázz.hu-konfigurációs hiba: a SZAMLAZZ_API_URL nem érvényes https URL ('${rawApiUrl}'). ` +
        `Az alapértelmezett érték: ${SZAMLAZZ_DEFAULT_API_URL}.`,
    )
  }

  const rawVatMode = readEnv(env, 'SZAMLAZZ_AFAKULCS') ?? '27'
  if (rawVatMode !== '27' && rawVatMode !== 'AAM') {
    // Hangos hiba: egy elgépelt áfakulcs minden számlát rossz kulccsal állítana
    // ki — azt nem szabad csendben az alapértelmezésre ejteni.
    throw new Error(
      `Számlázz.hu-konfigurációs hiba: a SZAMLAZZ_AFAKULCS értéke csak '27' vagy 'AAM' lehet ('${rawVatMode}'). ` +
        `Alanyi adómentes eladóként az 'AAM' a jogszerű; általános esetben hagyd üresen (alapértelmezés: 27).`,
    )
  }

  return {
    enabled: agentKey !== undefined,
    apiUrl: normalizedApiUrl,
    ...(agentKey ? { agentKey } : {}),
    invoicePrefix: readEnv(env, 'SZAMLAZZ_INVOICE_PREFIX') ?? SZAMLAZZ_DEFAULT_INVOICE_PREFIX,
    vatMode: rawVatMode,
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

/**
 * Agent-hiba a hibakódok hivatalos osztályozásával: 71/152 → 'duplicate'
 * (idempotencia-találat, a hívó lekérdezéssel oldja fel); '1' → retryable
 * (karbantartás); minden más végleges 'agent' hiba.
 */
function agentErrorFromCodes(message: string, agentErrors: SzamlazzAgentError[]): SzamlazzApiError {
  const codes = agentErrors.map((entry) => entry.code.trim())
  const duplicate = codes.some((code) => SZAMLAZZ_DUPLICATE_AGENT_CODES.has(code))
  const retryable = !duplicate && codes.some((code) => SZAMLAZZ_RETRYABLE_AGENT_CODES.has(code))
  return new SzamlazzApiError({
    message,
    kind: duplicate ? 'duplicate' : 'agent',
    agentErrors,
    retryable,
  })
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
    throw agentErrorFromCodes(`Számla Agent hiba (fejléc): ${headerCode} — ${headerError}`, [
      { code: headerCode, message: headerError as string },
    ])
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
    throw agentErrorFromCodes(
      `Számla Agent elutasította a számlakiállítást: ${
        agentErrors.map((error) => `${error.code} — ${error.message}`).join('; ') || 'ismeretlen hiba'
      }`,
      agentErrors,
    )
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
