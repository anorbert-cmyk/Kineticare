/**
 * Auth-kliens — a Payload auth REST végpontjaihoz (bejelentkezés,
 * regisztráció, jelszó-reset, profil).
 *
 * API-szerződés (Payload REST, /api/users):
 * - POST /api/users/login { email, password } → { user, token } (süti is jön);
 * - POST /api/users { email, password, name, billingName?, ... } → { doc } (regisztráció);
 * - POST /api/users/forgot-password { email } → 200 (ne szivárogjon, létezik-e
 *   a cím; rate-limit esetén 429 — a kliens ezt szándékosan ugyanúgy kezeli);
 * - POST /api/users/reset-password { token, password } → { user };
 * - GET /api/users/me → { user } (a session-ből).
 *
 * A kliens a fetch injektálhatóságával tesztelhető (lásd a teszteket).
 */

export interface AuthResult<T = undefined> {
  ok: boolean
  message?: string
  data?: T
}

export const GENERIC_AUTH_ERROR =
  'A művelet most nem sikerült. Próbáld újra néhány perc múlva, vagy írj nekünk a kapcsolatfelvételnél.'

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { errors?: Array<{ message?: string }>; message?: string }
    const first = body.errors?.find((entry) => typeof entry.message === 'string')
    if (first?.message) {
      return first.message
    }
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message
    }
  } catch {
    // Nem JSON-válasz.
  }
  return fallback
}

export async function loginUser(
  input: { email: string; password: string },
  fetchImpl: typeof fetch = fetch,
): Promise<AuthResult> {
  try {
    const response = await fetchImpl('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    })
    if (!response.ok) {
      const message = response.status === 401
        ? 'Hibás e-mail-cím vagy jelszó.'
        : await parseErrorMessage(response, GENERIC_AUTH_ERROR)
      return { ok: false, message }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: GENERIC_AUTH_ERROR }
  }
}

export interface RegisterInput {
  email: string
  password: string
  name: string
  billingName?: string
  billingZip?: string
  billingCity?: string
  billingStreet?: string
  taxNumber?: string
}

export async function registerUser(
  input: RegisterInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthResult> {
  try {
    const response = await fetchImpl('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    })
    if (!response.ok) {
      const message = response.status === 409 || response.status === 400
        ? 'Ez az e-mail-cím már foglalt, vagy a jelszó nem felel meg a követelményeknek (min. 12 karakter).'
        : await parseErrorMessage(response, GENERIC_AUTH_ERROR)
      return { ok: false, message }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: GENERIC_AUTH_ERROR }
  }
}

export async function forgotPassword(
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthResult> {
  try {
    await fetchImpl('/api/users/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    })
    // A Payload 200-at ad (ne szivárogjon, létezik-e a cím); rate-limitnél 429
    // jöhet — a kliens ezt is megerősítő üzenettel kezeli (a throttling-állapot
    // sem árul el semmit a címzett fiókjáról).
    return { ok: true }
  } catch {
    return { ok: false, message: GENERIC_AUTH_ERROR }
  }
}

export async function resetPassword(
  input: { token: string; password: string },
  fetchImpl: typeof fetch = fetch,
): Promise<AuthResult> {
  try {
    const response = await fetchImpl('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    })
    if (!response.ok) {
      const message = response.status === 400
        ? 'A jelszó-visszaállító link lejárt vagy érvénytelen. Kérj újat.'
        : await parseErrorMessage(response, GENERIC_AUTH_ERROR)
      return { ok: false, message }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: GENERIC_AUTH_ERROR }
  }
}
