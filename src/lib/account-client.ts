/**
 * Account-kliens — a felhasználói profil frissítése (adataim mentése).
 *
 * API-szerződés: PATCH /api/users/me (Payload auth) — a saját rekord
 * frissítése (a role és a purchases mezők a mezőszintű access miatt nem
 * módosíthatók, a kliens ezeket nem is küldi).
 */

export interface ProfileUpdateInput {
  name?: string
  billingName?: string
  billingZip?: string
  billingCity?: string
  billingStreet?: string
  taxNumber?: string
}

export interface UpdateResult {
  ok: boolean
  message?: string
}

export const GENERIC_UPDATE_ERROR =
  'A mentés most nem sikerült. Próbáld újra néhány perc múlva.'

export async function updateProfile(
  input: ProfileUpdateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<UpdateResult> {
  try {
    const response = await fetchImpl('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    })
    if (!response.ok) {
      return { ok: false, message: GENERIC_UPDATE_ERROR }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: GENERIC_UPDATE_ERROR }
  }
}
