import { hasControlCharacter } from './preview/preview-target'

/**
 * Felhasználótól érkező visszatérési útvonal (returnUrl) ellenőrzése.
 *
 * CSAK azonos eredetű, gyökérből induló relatív útvonal engedélyezett: a
 * `//host` és a `/\host` alak a böngészőben külső címre mutatna (open
 * redirect), az abszolút URL pedig eleve idegen eredet. Minden gyanús
 * értékre a megadott fallbackre esünk vissza — a navigáció így sosem visz
 * ki idegen oldalra.
 */
export function sanitizeReturnUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const trimmed = value.trim()
  if (trimmed.length === 0 || hasControlCharacter(trimmed)) {
    return fallback
  }
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback
  }
  return trimmed
}
