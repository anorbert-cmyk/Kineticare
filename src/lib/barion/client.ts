import { createLogger } from '../logger'
import { BarionApiError, type BarionError } from './types'

/**
 * Barion API-kliens mag: környezetfeloldás envből, induláskori assert,
 * timeoutos HTTP-hívások, strukturált hibakezelés és titokmentes naplózás.
 *
 * Környezetkapcsoló (tisztán envből):
 * - BARION_ENVIRONMENT: 'test' (alapértelmezés) | 'prod'
 * - BARION_API_URL: az AKTÍV környezet API alap-URL-je
 *   (test: https://api.test.barion.com, prod: https://api.barion.com)
 * - BARION_POSKEY_TEST / BARION_POSKEY_PROD: az aktív környezet POSKey-e
 * - BARION_PAYEE_EMAIL: a kereskedői (payee) e-mail-cím
 * - BARION_TIMEOUT_MS: HTTP-timeout felülírás (opcionális, default 15 000 ms)
 * - BARION_RECURRING_ENABLED: recurring-előkészítés feature-flag ('true')
 *
 * Induláskori assert: a getBarionConfig() hiányzó/hibás kötelező Barion-env
 * esetén azonnal, értelmes magyar hibaüzenettel dob — a modult betöltő
 * szerverfolyamat (route, hook) így induláskor el sem jut a forgalmazásig.
 * A kötelező Barion-envk az src/env.ts globális indulási assertjében is
 * szerepelnek, így az app ténylegesen nem indul el nélkülük.
 *
 * Titokvédelem: a POSKey POST-hívásoknál a JSON-bodyban, GET-hívásnál az
 * x-pos-key headerben utazik — sosem az URL-ben. A naplóba kizárólag
 * biztonságos mezők kerülnek (endpoint, státusz, durationMs, provider-hibakód);
 * kérés-/válasz-bodyt sosem naplózunk. A logger redact-listája a 'poskey'
 * kulcsot amúgy is maszkolja.
 */

export type BarionEnvironment = 'test' | 'prod'

export interface BarionClientConfig {
  environment: BarionEnvironment
  /** API alap-URL (pl. https://api.test.barion.com) — záró perjel nélkül. */
  apiUrl: string
  /** Az AKTÍV környezet POSKey-e. Soha ne naplózd! */
  posKey: string
  payeeEmail: string
  timeoutMs: number
  recurringEnabled: boolean
}

export const BARION_DEFAULT_TIMEOUT_MS = 15_000

const logger = createLogger({ module: 'barion' })

function readEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parseTimeoutMs(raw: string | undefined): number {
  if (raw === undefined) {
    return BARION_DEFAULT_TIMEOUT_MS
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : BARION_DEFAULT_TIMEOUT_MS
}

/**
 * Környezetfeloldás + induláskori assert egy lépésben. Hiányzó kötelező
 * Barion-env esetén magyar, a hiányzó kulcsokat felsoroló hibát dob.
 * Tiszta függvény: az env paraméterezhető (tesztelés), alapból process.env.
 */
export function getBarionConfig(env: NodeJS.ProcessEnv = process.env): BarionClientConfig {
  const rawEnvironment = readEnv(env, 'BARION_ENVIRONMENT') ?? 'test'
  if (rawEnvironment !== 'test' && rawEnvironment !== 'prod') {
    throw new Error(
      `Barion-konfigurációs hiba: a BARION_ENVIRONMENT értéke csak 'test' vagy 'prod' lehet, ` +
        `a megadott érték: '${rawEnvironment}'. Az alkalmazás így nem indulhat el — ` +
        'javítsd a környezeti változót (pl. .env fájl), majd indítsd újra.',
    )
  }
  const environment: BarionEnvironment = rawEnvironment

  const posKeyEnvName = environment === 'prod' ? 'BARION_POSKEY_PROD' : 'BARION_POSKEY_TEST'

  const missing: string[] = []
  const apiUrl = readEnv(env, 'BARION_API_URL')
  if (!apiUrl) {
    missing.push('BARION_API_URL')
  }
  const payeeEmail = readEnv(env, 'BARION_PAYEE_EMAIL')
  if (!payeeEmail) {
    missing.push('BARION_PAYEE_EMAIL')
  }
  const posKey = readEnv(env, posKeyEnvName)
  if (!posKey) {
    missing.push(posKeyEnvName)
  }

  if (missing.length > 0) {
    throw new Error(
      `Barion-konfigurációs hiba: hiányzó kötelező környezeti változó(k): ${missing.join(', ')}. ` +
        `Az alkalmazás nem indulhat el — állítsd be őket a környezetben (pl. helyben .env fájlban, ` +
        `a .env.example minta alapján), majd indítsd újra a szervert. ` +
        `(Aktív Barion-környezet: ${environment}.)`,
    )
  }

  let normalizedApiUrl: string
  try {
    const parsed = new URL(apiUrl as string)
    if (parsed.protocol !== 'https:') {
      throw new Error('not-https')
    }
    normalizedApiUrl = parsed.origin
  } catch {
    throw new Error(
      `Barion-konfigurációs hiba: a BARION_API_URL nem érvényes https URL ('${apiUrl}'). ` +
        'Test környezetben https://api.test.barion.com, élesben https://api.barion.com az elvárt érték.',
    )
  }

  return {
    environment,
    apiUrl: normalizedApiUrl,
    posKey: posKey as string,
    payeeEmail: payeeEmail as string,
    timeoutMs: parseTimeoutMs(readEnv(env, 'BARION_TIMEOUT_MS')),
    recurringEnabled: readEnv(env, 'BARION_RECURRING_ENABLED') === 'true',
  }
}

/** Válasz-body JSON-parse, egységes 'invalid_response' hibával. */
async function parseJsonBody(response: Response, endpoint: string): Promise<Record<string, unknown>> {
  const text = await response.text().catch(() => '')
  if (text.length === 0) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    throw new Error('not-an-object')
  } catch {
    throw new BarionApiError({
      message: `A Barion válasza nem értelmezhető JSON (${endpoint}).`,
      kind: 'invalid_response',
      endpoint,
      httpStatus: response.status,
    })
  }
}

function extractProviderErrors(body: Record<string, unknown>): BarionError[] {
  const errors = body.Errors
  if (!Array.isArray(errors)) {
    return []
  }
  return errors
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      ErrorCode: typeof item.ErrorCode === 'string' ? item.ErrorCode : 'Unknown',
      Title: typeof item.Title === 'string' ? item.Title : '',
      Description: typeof item.Description === 'string' ? item.Description : '',
    }))
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('aborted'))
  )
}

interface BarionRequestOptions {
  method: 'GET' | 'POST'
  /** Szerveroldali útvonal az apiUrl-hez képest, pl. '/v2/Payment/Start'. */
  path: string
  /** POST-body a POSKey NÉLKÜL — azt a kliens injektálja bele. */
  body?: Record<string, unknown>
  config?: BarionClientConfig
}

/**
 * Közös, timeoutos Barion HTTP-hívás.
 *
 * - POSKey: POST esetén a body-ba, GET esetén az x-pos-key headerbe kerül
 *   (URL-be sosem — így proxy-/access-logban sem jelenhet meg).
 * - Minden hívás AbortSignal.timeout-tal fut (default 15 s, BARION_TIMEOUT_MS).
 * - A Barion hibaválaszait (akár HTTP 200 mellett is jöhet Errors tömbbel)
 *   strukturált BarionApiError-é alakítja, a provider-mezők megőrzésével.
 * - Naplózás titokmentesen: endpoint, method, httpStatus, durationMs,
 *   provider-hibakódok — body és POSKey sosem.
 */
async function barionRequest<TResponse>(options: BarionRequestOptions): Promise<TResponse> {
  const config = options.config ?? getBarionConfig()
  const endpoint = `${options.method} ${options.path}`
  const url = `${config.apiUrl}${options.path}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  let body: string | undefined
  if (options.method === 'POST') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify({ ...options.body, POSKey: config.posKey })
  } else {
    headers['x-pos-key'] = config.posKey
  }

  const startedAt = Date.now()
  let response: Response
  try {
    response = await fetch(url, {
      method: options.method,
      headers,
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    })
  } catch (error) {
    const durationMs = Date.now() - startedAt
    if (isAbortError(error)) {
      logger.error('Barion API hívás timeout', { endpoint, timeoutMs: config.timeoutMs, durationMs })
      throw new BarionApiError({
        message: `A Barion API nem válaszolt ${config.timeoutMs} ms-en belül (${endpoint}).`,
        kind: 'timeout',
        endpoint,
      })
    }
    logger.error('Barion API hálózati hiba', {
      endpoint,
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    throw new BarionApiError({
      message: `A Barion API elérhetetlen (${endpoint}): ${error instanceof Error ? error.message : String(error)}`,
      kind: 'network',
      endpoint,
    })
  }

  const durationMs = Date.now() - startedAt
  const parsed = await parseJsonBody(response, endpoint)
  const providerErrors = extractProviderErrors(parsed)

  if (!response.ok) {
    logger.error('Barion API HTTP-hiba', {
      endpoint,
      httpStatus: response.status,
      durationMs,
      providerErrorCodes: providerErrors.map((e) => e.ErrorCode),
    })
    throw new BarionApiError({
      message:
        providerErrors.length > 0
          ? `Barion API hiba (HTTP ${response.status}, ${endpoint}): ${providerErrors
              .map((e) => `${e.ErrorCode} — ${e.Title}`)
              .join('; ')}`
          : `Barion API hiba (HTTP ${response.status}, ${endpoint}).`,
      kind: 'http',
      endpoint,
      httpStatus: response.status,
      providerErrors,
    })
  }

  if (providerErrors.length > 0) {
    // A Barion bizonyos hibákat HTTP 200-zal, Errors tömbben jelez vissza.
    logger.error('Barion provider-hiba', {
      endpoint,
      durationMs,
      providerErrorCodes: providerErrors.map((e) => e.ErrorCode),
    })
    throw new BarionApiError({
      message: `Barion provider-hiba (${endpoint}): ${providerErrors
        .map((e) => `${e.ErrorCode} — ${e.Title}`)
        .join('; ')}`,
      kind: 'provider',
      endpoint,
      httpStatus: response.status,
      providerErrors,
    })
  }

  logger.debug('Barion API hívás kész', { endpoint, httpStatus: response.status, durationMs })
  return parsed as unknown as TResponse
}

/** POST-hívás a Barion API felé (a POSKey-t a body-ba injektálja). */
export function barionPost<TResponse>(
  path: string,
  body: Record<string, unknown>,
  config?: BarionClientConfig,
): Promise<TResponse> {
  return barionRequest<TResponse>({ method: 'POST', path, body, config })
}

/** GET-hívás a Barion API felé (a POSKey-t az x-pos-key headerbe teszi). */
export function barionGet<TResponse>(path: string, config?: BarionClientConfig): Promise<TResponse> {
  return barionRequest<TResponse>({ method: 'GET', path, config })
}
