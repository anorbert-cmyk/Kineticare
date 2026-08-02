export function estimateReadingTimeMinutes(content: unknown): number {
  const words = countWords(content)
  if (words === 0) return 1
  return Math.max(1, Math.round(words / 200))
}

function countWords(node: unknown): number {
  if (typeof node === 'string') {
    return node.trim().split(/\s+/).filter(Boolean).length
  }
  if (Array.isArray(node)) {
    return node.reduce((sum, child) => sum + countWords(child), 0)
  }
  if (node !== null && typeof node === 'object') {
    return Object.values(node as Record<string, unknown>).reduce(
      (sum, value) => sum + countWords(value),
      0,
    )
  }
  return 0
}
