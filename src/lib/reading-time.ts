/**
 * Becsült olvasási idő (perc) Lexical richText-tartalomból.
 *
 * A posts sémában nincs readingTime mező, ezért a poszt-oldalon a tartalomból
 * számoljuk: 200 szó/perc átlagos magyar olvasási sebesség, felfelé kerekítve,
 * minimum 1 perc (üres/hibás tartalomra is 1 — a megjelenítés így sosem üres).
 * A bejárás generikus (bármilyen Lexical-szerkezetre működik), külső
 * függőség nélkül.
 */
const WORDS_PER_MINUTE = 200

export function estimateReadingMinutes(content: unknown): number {
  const words = countWords(content)
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

function countWords(node: unknown): number {
  if (typeof node === 'string') {
    return node.trim().split(/\s+/).filter(Boolean).length
  }
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, child) => sum + countWords(child), 0)
  }
  if (node !== null && typeof node === 'object') {
    return Object.values(node as Record<string, unknown>).reduce<number>(
      (sum, value) => sum + countWords(value),
      0,
    )
  }
  return 0
}
