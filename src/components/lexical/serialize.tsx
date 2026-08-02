import Image from 'next/image'
import Link from 'next/link'
import { createElement, Fragment, type ReactNode } from 'react'

import { mediaAlt, mediaDimensions, pickMediaUrl, type MediaLike } from '../content/media-url'
import { TEXT_FORMAT, type LexicalContent, type LexicalNode, type VideoEmbed } from './types'

/**
 * Lexical → React renderer (storefront).
 *
 * A szerkesztői tartalom (pages/posts content) a payload.config alap
 * lexicalEditor()-jával készül; a renderer az alapértelmezett csomópontokat
 * márkahű elemekre képezi:
 *
 *   paragraph                    → <p>; ha a bekezdés EGYETLEN linket tartalmaz,
 *                                  az CTA-gombként (kc-button) renderel
 *   heading (h1–h6)              → címsor; a h1 SEO-higiéniai okból h2-re
 *                                  lágyul (oldalanként egy h1 — a cím)
 *   list (bullet/number/check)   → <ul>/<ol>; a check-lista a gyakorlatlista
 *                                  (kc-richtext__exercise-list)
 *   listitem (beágyazott listával) → <li>, checked-állapot jelöléssel
 *   quote                        → <blockquote>
 *   horizontalrule               → <hr>
 *   link                         → belső next/link, külső <a target/rel>;
 *                                  YouTube/Vimeo-ra mutató önálló link
 *                                  videó-beágyazás (csak publikus előzetes!)
 *   upload (relationTo: media)   → <figure> + next/image (Media-méretek,
 *                                  alt KÖTELEZŐ — hiányában dekoratív + dev warn)
 *   text (formázás-bitmaszk)     → strong/em/s/u/code/sub/sup rétegek
 *
 * Ismeretlen csomópont-típus (pl. jövőbeli custom block): NEM hasal el —
 * fejlesztői módban console.warn, a renderelés a gyermek-csomópontokkal
 * folytatódik (ha vannak), egyébként a blokk kimarad.
 */

// ---------------------------------------------------------------------------
// Segédek
// ---------------------------------------------------------------------------

function warnUnknownNode(node: LexicalNode): void {
  if (process.env.NODE_ENV !== 'production') {
    // Fejlesztői figyelmeztetés — production-ben néma fallback.
    console.warn(`[lexical] Ismeretlen csomópont-típus: "${node.type}" — fallback render.`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function childrenOf(node: LexicalNode): LexicalNode[] {
  return Array.isArray(node.children) ? node.children : []
}

/** A bekezdés "jelentős" gyermekei (üres szöveg/sortörés nem számít). */
function significantChildren(node: LexicalNode): LexicalNode[] {
  return childrenOf(node).filter((child) => {
    if (child.type === 'linebreak') return false
    if (child.type === 'text') {
      return typeof child.text === 'string' && child.text.trim().length > 0
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Link- és videó-felismerés
// ---------------------------------------------------------------------------

interface LinkFields {
  url: string
  newTab: boolean
  /** Belső (Payload-dokumentumra mutató) link célja, ha feloldható. */
  internalHref: string | null
}

/** Belső link href-feloldása a menü URL-konvencióval (lásd src/lib/menu-tree.ts). */
function resolveInternalHref(doc: unknown): string | null {
  if (!isRecord(doc) || typeof doc.value !== 'object' || doc.value === null) {
    return null
  }
  const relationTo = typeof doc.relationTo === 'string' ? doc.relationTo : null
  const value = doc.value as Record<string, unknown>
  const slug = typeof value.slug === 'string' ? value.slug : null
  switch (relationTo) {
    case 'pages':
      return slug ? `/${slug}` : null
    case 'posts':
      return slug ? `/blog/${slug}` : null
    case 'products':
      return typeof value.id === 'number' ? `/kurzusok/${value.id}` : null
    default:
      return null
  }
}

function linkFields(node: LexicalNode): LinkFields | null {
  const fields = isRecord(node.fields) ? node.fields : null
  if (!fields) return null
  const linkType = fields.linkType
  const url = typeof fields.url === 'string' ? fields.url.trim() : ''
  const internalHref = linkType === 'internal' ? resolveInternalHref(fields.doc) : null
  if (!url && !internalHref) return null
  return {
    url: internalHref ?? url,
    newTab: fields.newTab === true,
    internalHref,
  }
}

/**
 * Publikus videó-előzetes felismerése. Csak nyilvános YouTube/Vimeo URL
 * ágyazható be — a kurzusvideók (stream-tokenes, W3) ide NEM kerülhetnek;
 * minden más URL sima link marad.
 */
export function detectVideoEmbed(url: string): VideoEmbed | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0]
    return id ? { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id
        ? { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` }
        : null
    }
    const embedMatch = parsed.pathname.match(/^\/embed\/([^/?#]+)/)
    if (embedMatch) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${embedMatch[1]}`,
      }
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?#]+)/)
    if (shortsMatch) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`,
      }
    }
    return null
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0]
    return id && /^\d+$/.test(id)
      ? { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` }
      : null
  }
  return null
}

// ---------------------------------------------------------------------------
// Csomópont-renderelők
// ---------------------------------------------------------------------------

function renderText(node: LexicalNode, key: string): ReactNode {
  const text = typeof node.text === 'string' ? node.text : ''
  const format = typeof node.format === 'number' ? node.format : 0

  let content: ReactNode = text
  if (format & TEXT_FORMAT.code) content = createElement('code', null, content)
  if (format & TEXT_FORMAT.bold) content = createElement('strong', null, content)
  if (format & TEXT_FORMAT.italic) content = createElement('em', null, content)
  if (format & TEXT_FORMAT.strikethrough) content = createElement('s', null, content)
  if (format & TEXT_FORMAT.underline) content = createElement('u', null, content)
  if (format & TEXT_FORMAT.subscript) content = createElement('sub', null, content)
  if (format & TEXT_FORMAT.superscript) content = createElement('sup', null, content)

  return createElement(Fragment, { key }, content)
}

function renderChildren(node: LexicalNode, keyPrefix: string): ReactNode[] {
  return childrenOf(node).map((child, index) => renderNode(child, `${keyPrefix}-${index}`))
}

function renderLink(node: LexicalNode, key: string): ReactNode {
  const fields = linkFields(node)
  if (!fields) {
    // Hiányos link-cél: a szövegét rendereljük link nélkül (graceful).
    warnUnknownNode({ ...node, type: 'link(hianyzo-cel)' })
    return createElement(Fragment, { key }, renderChildren(node, key))
  }
  const children = renderChildren(node, key)
  if (fields.internalHref) {
    return createElement(Link, { key, href: fields.internalHref }, children)
  }
  const external = /^https?:\/\//i.test(fields.url)
  return createElement(
    'a',
    {
      key,
      href: fields.url,
      ...(external && fields.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    },
    children,
  )
}

/** CTA: önálló bekezdésben álló link gombként (a storefront elsődleges akcióstílusa). */
function renderCta(linkNode: LexicalNode, key: string): ReactNode {
  const fields = linkFields(linkNode)
  if (!fields) return renderLink(linkNode, key)
  const label = renderChildren(linkNode, key)
  return createElement(
    'p',
    { key, className: 'kc-richtext__cta' },
    createElement(
      fields.internalHref ? Link : 'a',
      {
        className: 'kc-button kc-button--primary',
        href: fields.url,
        ...(fields.internalHref
          ? {}
          : /^https?:\/\//i.test(fields.url) && fields.newTab
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {}),
      },
      label,
    ),
  )
}

function renderVideoEmbed(embed: VideoEmbed, title: string, key: string): ReactNode {
  return createElement(
    'div',
    { key, className: 'kc-richtext__video' },
    createElement('iframe', {
      src: embed.embedUrl,
      title,
      loading: 'lazy',
      allow:
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowFullScreen: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  )
}

function renderParagraph(node: LexicalNode, key: string): ReactNode {
  const significant = significantChildren(node)

  // CTA-felismerés: a bekezdés egyetlen jelentős eleme link.
  if (significant.length === 1 && significant[0].type === 'link') {
    const fields = linkFields(significant[0])
    if (fields) {
      const embed = detectVideoEmbed(fields.url)
      if (embed) {
        // Publikus videó-előzetes: a link szövege (vagy a szolgáltató neve) a cím.
        const labelText = extractPlainText(significant[0]).trim()
        return renderVideoEmbed(embed, labelText || 'Beágyazott videó', key)
      }
      return renderCta(significant[0], key)
    }
  }

  return createElement('p', { key }, renderChildren(node, key))
}

function renderHeading(node: LexicalNode, key: string): ReactNode {
  const tag = typeof node.tag === 'string' ? node.tag : 'h2'
  // SEO-higiénia: a tartalmi h1 → h2 (oldalanként egy h1, a dokumentumcím).
  const effectiveTag = tag === 'h1' ? 'h2' : /^h[2-6]$/.test(tag) ? tag : 'h2'
  return createElement(effectiveTag, { key }, renderChildren(node, key))
}

function renderList(node: LexicalNode, key: string): ReactNode {
  const listType = typeof node.listType === 'string' ? node.listType : 'bullet'
  const children = renderChildren(node, key)
  if (listType === 'number') {
    return createElement('ol', { key }, children)
  }
  if (listType === 'check') {
    return createElement('ul', { key, className: 'kc-richtext__exercise-list' }, children)
  }
  return createElement('ul', { key }, children)
}

function renderListItem(node: LexicalNode, key: string): ReactNode {
  const checked = node.checked === true ? true : node.checked === false ? false : undefined
  if (checked === undefined) {
    return createElement('li', { key }, renderChildren(node, key))
  }
  return createElement(
    'li',
    { key, className: checked ? 'is-checked' : 'is-unchecked', 'data-checked': checked },
    renderChildren(node, key),
  )
}

function renderQuote(node: LexicalNode, key: string): ReactNode {
  return createElement('blockquote', { key }, renderChildren(node, key))
}

function renderUpload(node: LexicalNode, key: string): ReactNode {
  const media = (isRecord(node.value) ? node.value : null) as MediaLike | null
  if (!media) {
    warnUnknownNode({ ...node, type: 'upload(hianyzo-media)' })
    return null
  }
  const src = pickMediaUrl(media)
  if (!src) {
    warnUnknownNode({ ...node, type: 'upload(nincs-url)' })
    return null
  }
  const alt = mediaAlt(media)
  const { width, height } = mediaDimensions(media)
  const caption =
    isRecord(media) && typeof (media as Record<string, unknown>).caption === 'string'
      ? ((media as Record<string, unknown>).caption as string)
      : null

  return createElement(
    'figure',
    { key, className: 'kc-richtext__figure' },
    createElement(Image, {
      src,
      alt,
      width,
      height,
      sizes: '(max-width: 720px) 100vw, 720px',
      className: 'kc-richtext__image',
    }),
    caption ? createElement('figcaption', { className: 'kc-richtext__figcaption' }, caption) : null,
  )
}

function renderNode(node: LexicalNode, key: string): ReactNode {
  switch (node.type) {
    case 'text':
      return renderText(node, key)
    case 'paragraph':
      return renderParagraph(node, key)
    case 'heading':
      return renderHeading(node, key)
    case 'list':
      return renderList(node, key)
    case 'listitem':
      return renderListItem(node, key)
    case 'quote':
      return renderQuote(node, key)
    case 'horizontalrule':
      return createElement('hr', { key })
    case 'linebreak':
      return createElement('br', { key })
    case 'link':
      return renderLink(node, key)
    case 'upload':
      return renderUpload(node, key)
    default: {
      warnUnknownNode(node)
      const children = childrenOf(node)
      if (children.length > 0) {
        return createElement(Fragment, { key }, renderChildren(node, key))
      }
      return null
    }
  }
}

function extractPlainText(node: LexicalNode): string {
  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : ''
  }
  return childrenOf(node)
    .map((child) => extractPlainText(child))
    .join('')
}

/**
 * A richText-tartalom bejárása. Üres/hibás bemenetre null (a RichText-burkoló
 * ebből semmit sem renderel).
 */
export function renderLexicalContent(content: unknown): ReactNode {
  if (!isRecord(content)) return null
  const root = isRecord(content.root) ? content.root : null
  const children = root && Array.isArray(root.children) ? (root.children as LexicalNode[]) : []
  if (children.length === 0) return null
  return children.map((child, index) => renderNode(child as LexicalNode, `n-${index}`))
}
