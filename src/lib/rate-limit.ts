import { resolveClientIp } from './audit'
import type { Logger } from './logger'

/**
 * In-memory rate-limiter (blackhat-review: callback-flood / Barion API DoS,
 * forgot-password e-mail-bombing, regisztráció-spam, checkout-flood ellen).
 *
 * Algoritmus: KULCSONKÉNTI CSÚSZÓABLAK (sliding window log) — minden kulcshoz
 * az ablakba eső kérés-időbélyegeket tároljuk; a kulcs akkor fogyaszthat, ha
 * az ablakban lévő találatok száma < max. A `retryAfterSec` a legrégebbi
 * ablakbeli találat kieséséig hátralévő idő (felfelé kerekítve, min. 1 mp).
 *
 * Tudás:
 * - tiszta, injektálható órával (`now`) — a mag determinisztikusan tesztelhető;
 * - periodikus takarítás (lejárt kulcsok törlése) — az időzítő `unref()`-elve
 *   van, így sosem tartja életben a folyamatot (teszt/CLI);
 * - memória-plafon (`maxKeys`): a kulcsok száma korlátos, túlfutáskor a
 *   legrégebben használt kulcs hullik ki (LRU-szerű, a Map beszúrási sorrendje
 *   + hozzáféréskori „végére mozgatás" miatt);
 * - `cleanupIntervalMs: 0` kikapcsolja az időzítőt (tesztek kézzel takarítanak).
 *
 * MEGJEGYZÉS SKÁLÁZÁSHOZ: a tároló folyamat-memóriában él — a jelenlegi
 * Railway single-instance deployban ez a helyes egyszerű megoldás. Több
 * példány (horizontal scale) esetén példányonként ÉRVÉNYESÜL a limit (a
 * tényleges plafon példányszám × max lesz), és az állapot újrainduláskor
 * elvész. Multi-instance bevezetésekor ezt a modult kell központi tárolóra
 * (pl. Redis/Upstash) cserélni — a hívási felület (consume/checkRateLimit)
 * ettől változatlan maradhat.
 */

export interface RateLimiterConfig {
  /** Ablak hossza ezredmásodpercben. */
  windowMs: number
  /** Engedélyezett kérések száma kulcsonként az ablakban. */
  max: number
  /** Kulcs-plafon (memória-védelem); túlfutáskor LRU-szerű eldobás. */
  maxKeys?: number
  /** Óra injektálva (teszteléshez); alapból Date.now. */
  now?: () => number
  /** Takarító-időzítő periódusa; 0 = nincs időzítő (teszt). */
  cleanupIntervalMs?: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Elutasításkor: hány mp múlva érdemes újrapróbálni (engedésnél 0). */
  retryAfterSec: number
}

export interface RateLimiter {
  /** Egy kérés elszámolása a kulcson. */
  consume(key: string): RateLimitResult
  /** Lejárt kulcsok/üres ablakok azonnali takarítása. */
  cleanup(): void
  /** A takarító-időzítő leállítása (teszt). */
  dispose(): void
  /** Aktív kulcsok száma (diagnosztika/teszt). */
  readonly size: number
}

const DEFAULT_MAX_KEYS = 10_000
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { windowMs, max } = config
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('rate-limiter: windowMs pozitív szám kell legyen')
  }
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error('rate-limiter: max pozitív egész kell legyen')
  }
  const maxKeys = config.maxKeys ?? DEFAULT_MAX_KEYS
  const now = config.now ?? (() => Date.now())

  // Kulcs → ablakba eső időbélyegek (növekvő sorrend). A Map beszúrási
  // sorrendje + a hozzáféréskori delete/set „végére mozgatás" adja az
  // LRU-sorrendet: az első kulcs a legrégebben használt.
  const buckets = new Map<string, number[]>()

  const prune = (timestamps: number[], nowMs: number): number[] => {
    const windowStart = nowMs - windowMs
    let firstValid = 0
    while (firstValid < timestamps.length && timestamps[firstValid]! <= windowStart) {
      firstValid += 1
    }
    return firstValid === 0 ? timestamps : timestamps.slice(firstValid)
  }

  let timer: ReturnType<typeof setInterval> | undefined

  const limiter: RateLimiter = {
    consume(key: string): RateLimitResult {
      const nowMs = now()
      const existing = buckets.get(key)
      const timestamps = existing ? prune(existing, nowMs) : []

      if (timestamps.length >= max) {
        const oldest = timestamps[0]!
        const retryAfterMs = Math.max(oldest + windowMs - nowMs, 0)
        // LRU-frissítés elutasításkor is (aktív kulcs ne hulljon ki).
        buckets.delete(key)
        buckets.set(key, timestamps)
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
      }

      timestamps.push(nowMs)
      if (existing === undefined && buckets.size >= maxKeys) {
        // Memória-plafon: a legrégebben használt kulcs eldobása. Az eldobott
        // kulcs ablaka „lenullázódik" — legrosszabb esetben egy floodforrás
        // pár extra kérést enged át, a memória viszont sosem nő korlátlanul.
        const oldestKey = buckets.keys().next().value
        if (oldestKey !== undefined) {
          buckets.delete(oldestKey)
        }
      }
      buckets.delete(key)
      buckets.set(key, timestamps)
      return { allowed: true, retryAfterSec: 0 }
    },

    cleanup(): void {
      const nowMs = now()
      for (const [key, timestamps] of buckets) {
        if (prune(timestamps, nowMs).length === 0) {
          buckets.delete(key)
        }
      }
    },

    dispose(): void {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    },

    get size(): number {
      return buckets.size
    },
  }

  const cleanupIntervalMs = config.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS
  if (cleanupIntervalMs > 0) {
    timer = setInterval(() => limiter.cleanup(), cleanupIntervalMs)
    // Ne tartsa életben a folyamatot (teszt, CLI, szerverleállás).
    timer.unref?.()
  }

  return limiter
}

// ---------------------------------------------------------------------------
// Megosztott (singleton) limiterek — Next dev HMR-biztos tárolással
// ---------------------------------------------------------------------------

/**
 * Végpontonkénti limitek, egy helyen dokumentálva.
 *
 * - barionCallback: 30/perc/IP — a Barion retry-lépcsője (2s…102s) bőven
 *   belefér; a callback-flood (webhook-events DB-növekedés) ellen véd.
 * - checkoutStart: 10/perc userenként ÉS IP-nként — a Barion Start-hívás
 *   költséges, a normál vásárló 1-2 indítást végez percenként.
 * - streamToken: 60/perc userenként — a lejátszó oldalbetöltésenként 1 tokent
 *   kér; a limit a tokenfarmolás ellen, nem a normál használat ellen szól.
 * - refund: 10/perc ownerenként — adminművelet, kézi tempó jóval ez alatt van.
 * - usersAuth: 5/10 perc IP-nként ÉS e-mail-címenként — a forgot-password
 *   e-mail-bombing és a regisztráció-spam ellen (Payload beépített REST
 *   végpontok, beforeOperation hookból).
 * - formSubmission: 5/10 perc IP-nként — kapcsolat-űrlap flood ellen
 *   (a Turnstile-ellenőrzésen FELÜL, azt megelőzve).
 */
export const RATE_LIMITS = {
  barionCallback: { windowMs: 60_000, max: 30 },
  checkoutStart: { windowMs: 60_000, max: 10 },
  streamToken: { windowMs: 60_000, max: 60 },
  refund: { windowMs: 60_000, max: 10 },
  usersAuth: { windowMs: 600_000, max: 5 },
  formSubmission: { windowMs: 600_000, max: 5 },
} as const

export type RateLimitName = keyof typeof RATE_LIMITS

/**
 * A limiterek NEM hozhatók létre kérésenként (az állapotuk elveszne), és Next
 * dev-ben a HMR miatt a modul-szintű `const` is újrapéldányosodhat. Ezért a
 * megosztott limiterek a `globalThis`-en cachelődnek: a HMR újratölti a
 * modult, de a registry (és benne a számlálók) túléli. A `getPayload`-os
 * szerver-singletonoknál is ez a bevett Next-minta.
 */
interface RateLimitGlobal {
  __kineticareRateLimiters?: Map<string, RateLimiter>
}

function rateLimiterRegistry(): Map<string, RateLimiter> {
  const globalStore = globalThis as RateLimitGlobal
  if (!globalStore.__kineticareRateLimiters) {
    globalStore.__kineticareRateLimiters = new Map()
  }
  return globalStore.__kineticareRateLimiters
}

/** Név szerinti megosztott limiter (HMR-biztos singleton). */
export function getNamedRateLimiter(name: RateLimitName): RateLimiter {
  const registry = rateLimiterRegistry()
  const existing = registry.get(name)
  if (existing) {
    return existing
  }
  const limiter = createRateLimiter(RATE_LIMITS[name])
  registry.set(name, limiter)
  return limiter
}

// ---------------------------------------------------------------------------
// Route-szintű segédek
// ---------------------------------------------------------------------------

/**
 * Közös bucket-kulcs, ha a kliens-IP NEM feloldható (nincs proxy-fejléc).
 * SZÁNDÉKOSAN NEM engedjük át limit nélkül az ilyen kérést — különben a
 * fejlécek elhallgatásával bárki megkerülhetné a korlátot. Ára: a proxy mögé
 * nem látszó kliensek (pl. helyi teszt) egy közös keretet osztanak meg.
 */
export const UNKNOWN_IP_BUCKET_KEY = 'ip:ismeretlen'

/** Per-IP bucket-kulcs a kérés fejléceiből (feloldhatatlan IP → közös bucket). */
export function ipRateLimitKey(headers: Headers | undefined): string {
  const ip = resolveClientIp(headers)
  return ip ? `ip:${ip}` : UNKNOWN_IP_BUCKET_KEY
}

export const RATE_LIMIT_MESSAGE = 'Túl sok kérés érkezett. Kérjük, próbáld újra később.'

export interface RateLimitCheckArgs {
  limiter: RateLimiter
  /** Bucket-kulcs (pl. ipRateLimitKey(headers) vagy `user:${user.id}`). */
  key: string
  /** requestId-vel kötött child logger (a 429-es esemény naplózásához). */
  log: Logger
  /** Opcionális route-specifikus magyar felhasználói üzenet. */
  message?: string
}

/**
 * Route-szintű ellenőrzés: `null`, ha a kérés átmehet; különben kész 429-es
 * Response (magyar üzenet + `Retry-After` fejléc), és `log.warn` naplózás.
 *
 * Több kulcs esetén (pl. per-user + per-IP) a hívó fűzze össze:
 * `checkRateLimit(userCheck) ?? checkRateLimit(ipCheck)` — az első elutasítás
 * nyer; a korábban elfogyasztott keret-részlet ilyenkor elveszik (dokumentált,
 * elfogadott kompromisszum a kettős számlálás egyszerűségéért).
 */
export function checkRateLimit(args: RateLimitCheckArgs): Response | null {
  const result = args.limiter.consume(args.key)
  if (result.allowed) {
    return null
  }
  args.log.warn('rate-limit: kérés visszautasítva (429)', {
    key: args.key,
    retryAfterSec: result.retryAfterSec,
  })
  return Response.json(
    { error: args.message ?? RATE_LIMIT_MESSAGE, retryAfterSec: result.retryAfterSec },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } },
  )
}
