/**
 * Címzett-maszkolás a naplózáshoz: a teljes e-mail-cím sosem kerül a logba.
 * Pl. "kiss.anna@example.com" → "k***@example.com".
 */
export function maskEmail(address: string): string {
  const atIndex = address.lastIndexOf('@')
  if (atIndex <= 0) {
    return '***'
  }
  const local = address.slice(0, atIndex)
  const domain = address.slice(atIndex + 1)
  return `${local.slice(0, 1)}***@${domain}`
}

/** "Név <email@cim.hu>" és puszta "email@cim.hu" formátum feldolgozása. */
export function parseFromAddress(raw: string | undefined): { name: string; address: string } {
  const fallback = { name: 'Kineticare', address: 'noreply@localhost' }
  if (!raw) {
    return fallback
  }
  const match = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(raw)
  if (match) {
    return { name: (match[1] ?? '').trim() || fallback.name, address: match[2].trim() }
  }
  const trimmed = raw.trim()
  if (trimmed.includes('@')) {
    return { name: fallback.name, address: trimmed }
  }
  return fallback
}

export function formatFromAddress(from: { name: string; address: string }): string {
  return `${from.name} <${from.address}>`
}
