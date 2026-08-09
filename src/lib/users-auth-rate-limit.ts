import { APIError, type CollectionBeforeOperationHook } from 'payload'

import { resolveClientIp } from './audit'
import { createLogger } from './logger'
import {
  getNamedRateLimiter,
  RATE_LIMIT_MESSAGE,
  UNKNOWN_IP_BUCKET_KEY,
  type RateLimiter,
} from './rate-limit'

/**
 * A Payload BEÉPÍTETT users REST végpontjainak (POST /api/users/forgot-password,
 * POST /api/users — nyilvános regisztráció) rate-limitje (blackhat-review:
 * forgot-password e-mail-bombing, regisztráció-spam).
 *
 * A legkevésbé invazív bekötés a collection `beforeOperation` hookja: a
 * 'forgotPassword' és a 'create' műveletre fut le, MÉG a token-generálás /
 * e-mail-küldés / DB-írás előtt; APIError(429)-t dob, amit a Payload REST
 * réteg 429-es válaszként szolgál ki. Külön route-felülírás vagy middleware
 * nem kell hozzá.
 *
 * Kulcsok (közös usersAuth limiter-példányon, prefixszel):
 * - `ip:<kliens-ip>` — flood egy IP-ről (feloldhatatlan IP → közös bucket,
 *   lásd rate-limit.ts UNKNOWN_IP_BUCKET_KEY indoklását);
 * - `email:<normalizált cím>` — EGY címzett bombázása ellen (a per-IP limit
 *   IP-rotálással kikerülhető, a per-email nem).
 *
 * Bejelentkezett hívóra (req.user) NEM alkalmazzuk: az admin UI-ból indított
 * user-létrehozás legitim tömeges művelet lehet — a védelem a NYILVÁNOS,
 * anonim hívások ellen irányul. Local API-hívások (pl. seed script) anonimok,
 * de alacsony darabszámuk bőven a limit alatt marad.
 */

const logger = createLogger({ module: 'users-auth-rate-limit' })

export interface UsersAuthRateLimitDeps {
  /** Limiter injektálható (teszt); alapból a megosztott usersAuth singleton. */
  limiter?: RateLimiter
}

/** A művelet args-ából az e-mail-cím kinyerése (normalizálva), ha van. */
function extractEmail(args: unknown): string | undefined {
  const data = (args as { data?: unknown } | undefined)?.data
  if (typeof data !== 'object' || data === null) {
    return undefined
  }
  const email = (data as Record<string, unknown>).email
  if (typeof email !== 'string') {
    return undefined
  }
  const normalized = email.trim().toLowerCase()
  return normalized.length > 0 ? normalized : undefined
}

function deny(operation: string, key: string, retryAfterSec: number): never {
  logger.warn('users-auth rate-limit: kérés visszautasítva (429)', {
    operation,
    key,
    retryAfterSec,
  })
  throw new APIError(RATE_LIMIT_MESSAGE, 429)
}

export function createUsersAuthRateLimitHook(
  deps: UsersAuthRateLimitDeps = {},
): CollectionBeforeOperationHook {
  const limiter = deps.limiter ?? getNamedRateLimiter('usersAuth')

  return ({ args, operation, req }) => {
    if (operation !== 'forgotPassword' && operation !== 'create') {
      return
    }
    // Autentikált hívó (admin user-létrehozás) korlát nélkül — lásd fejléc.
    if (req.user) {
      return
    }

    const ip = resolveClientIp(req.headers)
    const ipResult = limiter.consume(ip ? `ip:${ip}` : UNKNOWN_IP_BUCKET_KEY)
    if (!ipResult.allowed) {
      deny(operation, ip ? `ip:${ip}` : UNKNOWN_IP_BUCKET_KEY, ipResult.retryAfterSec)
    }

    const email = extractEmail(args)
    if (email) {
      const emailResult = limiter.consume(`email:${email}`)
      if (!emailResult.allowed) {
        deny(operation, `email:${email}`, emailResult.retryAfterSec)
      }
    }
  }
}
