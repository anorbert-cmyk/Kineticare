export const TEXT_FORMAT = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
  subscript: 32,
  superscript: 64,
} as const

export interface LexicalNode {
  type: string
  text?: string
  format?: number
  tag?: string
  listType?: string
  checked?: boolean
  fields?: Record<string, unknown>
  relationTo?: string
  value?: unknown
  children?: LexicalNode[]
  [key: string]: unknown
}

export interface LexicalContent {
  root?: {
    children?: LexicalNode[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo'
  embedUrl: string
}
