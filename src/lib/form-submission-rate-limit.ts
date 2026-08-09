import { APIError } from 'payload'

import { resolveClientIp } from './audit'
import { createLogger } from './logger'
import {
  getNamedRateLimiter,
  UNKNOWN_IP_BUCKET_KEY,
  type RateLimiter,
} from './rate-limit'

/**
 * Kapcsolat-űrlap (form-submissions create) per-IP rate-limitje — a
 * payload.config.ts form-hookjai KÖZÉ, a Turnstile-ellenőrzés ELÉ kerül
 * (olcsó, külső hívás nélküli flood-fal; a Turnstile-logikát nem érinti).
 *
 * APIError(429)-t dob, amit a Payload REST réteg 429-es válaszként ad vissza;
 * a beküldés ilyenkor NEM mentődik, és staff-értesítő sem megy ki.
 * Feloldhatatlan kliens-IP → közös bucket (lásd rate-limit.ts indoklását).
 */

const logger = createLogger({ module: 'form-submission-rate-limit' })

export const FORM_SUBMISSION_RATE_LIMIT_MESSAGE =
  'Túl sok beküldés érkezett. Kérjük, próbáld újra néhány perc múlva.'

export interface FormSubmissionRateLimitDeps {
  /** Limiter injektálható (teszt); alapból a megosztott formSubmission singleton. */
  limiter?: RateLimiter
}

/**
 * beforeValidate-hook factory. A hook a `data`-t változatlanul adja vissza,
 * hogy a lánc következő tagja (Turnstile) érintetlenül kapja meg.
 */
export function createFormSubmissionRateLimitHook(deps: FormSubmissionRateLimitDeps = {}) {
  const limiter = deps.limiter ?? getNamedRateLimiter('formSubmission')

  return async ({ data, req }: { data?: unknown; req?: { headers?: Headers } }): Promise<unknown> => {
    const ip = resolveClientIp(req?.headers)
    const key = ip ? `ip:${ip}` : UNKNOWN_IP_BUCKET_KEY
    const result = limiter.consume(key)
    if (!result.allowed) {
      logger.warn('form-submission rate-limit: beküldés visszautasítva (429)', {
        key,
        retryAfterSec: result.retryAfterSec,
      })
      throw new APIError(FORM_SUBMISSION_RATE_LIMIT_MESSAGE, 429)
    }
    return data
  }
}
