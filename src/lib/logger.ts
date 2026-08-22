/**
 * Könnyűsúlyú, nulla extra függőségű strukturált logger.
 *
 * Egy JSON-sort ír a stdoutra eseményenként, hogy a logaggregátorok gépileg
 * feldolgozhassák. Mezők: ts, level, msg, requestId (ha a child loggerhez
 * kötöttük), context (eseményenkénti strukturált adat).
 *
 * A LOG_LEVEL környezeti változó szabályozza a minimális szintet
 * (debug | info | warn | error). Alapértelmezés: production-ben "info",
 * egyébként "debug".
 *
 * A redact-lista minden környezetben érvényes: az itt felsorolt kulcsnevek
 * értéke sosem kerül a naplóba, hanem "[REDACTED]" jelöléssel helyettesül,
 * így production-ben sem szivároghat ki érzékeny adat.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  readonly [key: string]: unknown
}

export interface Logger {
  debug(msg: string, context?: LogContext): void
  info(msg: string, context?: LogContext): void
  warn(msg: string, context?: LogContext): void
  error(msg: string, context?: LogContext): void
  /** Új logger ugyanazzal a beállítással, fixen kötött mezőkkel (pl. requestId). */
  child(bindings: LogContext): Logger
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const REDACTED_VALUE = '[REDACTED]'

/**
 * Kulcsnevek (kis-nagybetű érzéketlen egyezés), amelyek értéke sosem naplózható.
 * Barion/Számlázz.hu/kártyás integrációk miatt a lista szándékosan bőv.
 *
 * Az `email` személyes adat (GDPR), ezért szintén a listán van: a napló
 * aggregátorba és mentésekbe kerül, a címzett-lista pedig egy kiszivárgott
 * naplóból közvetlenül támadható (célzott adathalászat, fiók-létezés
 * megerősítése). Ahol a cím az üzemeltetéshez tényleg kell, ott MASZKOLVA és
 * MÁS kulcsnéven megy (`maskEmail` → pl. `cimzett`, `identifier`) — így a
 * naplóban a domain és az első betű látszik, a teljes cím nem.
 */
const REDACTED_KEYS: ReadonlySet<string> = new Set(
  [
    'email',
    'password',
    'jelszo',
    'passphrase',
    'token',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'idtoken',
    'id_token',
    'secret',
    'payloadsecret',
    'payload_secret',
    'poskey',
    'apikey',
    'api_key',
    'agentkey',
    'agent_key',
    'szamlaagentkulcs',
    'cardnumber',
    'card_number',
    'cardexpiry',
    'card_expiry',
    'cvv',
    'cvc',
    'pin',
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'session',
    'sessions',
    'sessionid',
    'session_id',
    'resetpasswordtoken',
    'activationurl',
    'privatekey',
    'private_key',
    'accesskey',
    'access_key',
    'libraryapikey',
    'library_api_key',
  ].map((key) => key.toLowerCase()),
)

function envValue(key: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined
  }
  return process.env[key]
}

function parseLogLevel(raw: string | undefined): LogLevel | undefined {
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw
  }
  return undefined
}

function resolveMinLevel(): LogLevel {
  const fromEnv = parseLogLevel(envValue('LOG_LEVEL'))
  if (fromEnv) {
    return fromEnv
  }
  return envValue('NODE_ENV') === 'production' ? 'info' : 'debug'
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Mélységkorlátos, körkörösség-biztos redakció: a listázott kulcsok értékét
 * helyettesíti, a többit változatlan struktúrában hagyja.
 */
function redactValue(value: unknown, seen: ReadonlySet<object>, depth: number): unknown {
  if (depth > 6) {
    return '[TRUNCATED]'
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen, depth + 1))
  }
  if (!isPlainRecord(value)) {
    return value
  }
  if (seen.has(value)) {
    return '[CIRCULAR]'
  }
  const nextSeen = new Set(seen)
  nextSeen.add(value)
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    output[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? REDACTED_VALUE
      : redactValue(item, nextSeen, depth + 1)
  }
  return output
}

function serialize(entry: Record<string, unknown>): string {
  try {
    return JSON.stringify(entry)
  } catch {
    // Végső fallback, ha bármilyen szerializálási hiba mégis előfordulna.
    return JSON.stringify({
      ts: entry.ts,
      level: entry.level,
      msg: 'A naplóbejegyzés nem szerializálható.',
    })
  }
}

class StructuredLogger implements Logger {
  private readonly minLevel: LogLevel
  private readonly bindings: LogContext

  constructor(minLevel: LogLevel, bindings: LogContext) {
    this.minLevel = minLevel
    this.bindings = bindings
  }

  child(bindings: LogContext): Logger {
    return new StructuredLogger(this.minLevel, { ...this.bindings, ...bindings })
  }

  debug(msg: string, context?: LogContext): void {
    this.write('debug', msg, context)
  }

  info(msg: string, context?: LogContext): void {
    this.write('info', msg, context)
  }

  warn(msg: string, context?: LogContext): void {
    this.write('warn', msg, context)
  }

  error(msg: string, context?: LogContext): void {
    this.write('error', msg, context)
  }

  private write(level: LogLevel, msg: string, context?: LogContext): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) {
      return
    }
    const redactedBindings = redactValue(this.bindings, new Set(), 0)
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...(isPlainRecord(redactedBindings) ? redactedBindings : {}),
    }
    if (context && Object.keys(context).length > 0) {
      entry.context = redactValue(context, new Set(), 0)
    }
    console.log(serialize(entry))
  }
}

/** Új logger példány, opcionális fixen kötött mezőkkel (pl. { requestId }). */
export function createLogger(bindings: LogContext = {}): Logger {
  return new StructuredLogger(resolveMinLevel(), bindings)
}

/** Alapértelmezett, kötetlen logger. */
export const logger = createLogger()
