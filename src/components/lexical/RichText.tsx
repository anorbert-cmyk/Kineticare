import type { ReactNode } from 'react'

import { renderLexicalContent } from './serialize'

/**
 * RichText — Payload Lexical richText-tartalom storefront-renderelése.
 *
 * Vékony burkoló a serialize.tsx bejárója köré: egységes kc-richtext
 * konténer-osztályt ad (a tartalom-tipográfia a styles/content.css-ben él),
 * és üres/hibás bemenetre semmit sem renderel.
 */
export interface RichTextProps {
  content: unknown
  className?: string
}

export function RichText({ content, className }: RichTextProps): ReactNode {
  const rendered = renderLexicalContent(content)
  if (rendered === null) {
    return null
  }
  const classes = ['kc-richtext', className ?? ''].filter(Boolean).join(' ')
  return <div className={classes}>{rendered}</div>
}
