import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

import { renderLexicalContent } from '../lexical/serialize'
import { headingsOf } from './post-outline'

/**
 * PostBody — a cikk törzse, HORGONYOZOTT címsorokkal.
 *
 * ═══ MIT CSINÁL, ÉS MIÉRT ÍGY ═══
 * A közös `RichText` burkolót használnánk, de a szerializáló ma nem ad `id`-t
 * a címsoroknak (`serialize.tsx` `renderHeading`), tehát a tartalomjegyzék
 * horgonyai nem léteznének. A szerializáló KÖZÖS fájl (a kurzus-leírásokat és
 * a jogi oldalakat is rendereli), és ebben a körben másik csomag tulajdona,
 * ezért a cikkoldal a saját, szűk hatókörű megoldását hozza: a szerializáló
 * kimenetét változatlanul kéri, majd a renderelt fában a címsor-elemekre
 * kiosztja a `post-outline.ts` által számolt horgonyokat.
 *
 * ═══ MIÉRT MEGBÍZHATÓ A SORREND SZERINTI PÁROSÍTÁS ═══
 * Két bejárás fut: a `headingsOf` a Lexical-dokumentumon, ez a modul a
 * renderelt React-fán. Mindkettő MÉLYSÉGI, dokumentum-sorrendű, és a
 * szerializáló a gyermekeket ugyanabban a sorrendben rendereli, ahogy a
 * JSON-ben állnak — a k-adik címsor-elem tehát a k-adik címsor-csomópont.
 * A h1 → h2 lágyítást mindkét oldal ismeri (a `normalizeTag` ezt tükrözi),
 * ezért nincs olyan címsor, amit az egyik lát és a másik nem.
 *
 * ═══ HA MEGÉRKEZIK AZ A-CSOMAG ═══
 * A `docs/tudastar-technikai-terv.md` 4.2–4.3 pontja a szerializálóba tervezi
 * ugyanezt (`renderLexicalContent(content, { headingIds })` +
 * `RichText headingAnchors`). Ha az megérkezik, ez a komponens egyetlen
 * `<RichText content={content} headingAnchors />` hívásra cserélhető: a
 * horgony-értékek azonosak (ugyanaz a `slugify`, ugyanaz az ütközés-feloldás),
 * tehát a webcímek nem törnek.
 */
export interface PostBodyProps {
  /** A cikk Lexical-tartalma (`post.content`). */
  content: unknown
  /** A törzs-doboz osztálya (a nyomtatási forrás-szabály ezen fog, lásd post-view.css). */
  className?: string
}

/** Azok az elemek, amelyek horgonyt kaphatnak (a serializer h1-et nem rendel). */
const HEADING_TAGS: ReadonlySet<string> = new Set(['h2', 'h3', 'h4', 'h5', 'h6'])

interface DecoratableProps {
  children?: ReactNode
  id?: string
}

/**
 * A renderelt fa bejárása: a címsor-elemek sorrendben megkapják a horgonyt.
 *
 * A `cursor` szándékosan mutálható objektum: a bejárás mélységi, és a
 * sorszámot minden ágnak ugyanaz a számláló adja (ez a dokumentum-sorrend).
 */
function withHeadingIds(
  node: ReactNode,
  ids: readonly string[],
  cursor: { next: number },
): ReactNode {
  if (Array.isArray(node)) {
    return node.map((child: ReactNode) => withHeadingIds(child, ids, cursor))
  }
  if (!isValidElement<DecoratableProps>(node)) {
    return node
  }
  const element: ReactElement<DecoratableProps> = node
  if (typeof element.type === 'string' && HEADING_TAGS.has(element.type)) {
    const id = ids[cursor.next]
    cursor.next += 1
    // Már meglévő id-t nem írunk felül: ha egyszer a szerializáló is ad
    // horgonyt (A-csomag), az övé az elsőbbség, és nem keletkezik két igazság.
    return typeof element.props.id === 'string' || id === undefined
      ? element
      : cloneElement(element, { id })
  }
  const { children } = element.props
  if (children === undefined) {
    return element
  }
  return cloneElement(element, undefined, withHeadingIds(children, ids, cursor))
}

export function PostBody({ content, className }: PostBodyProps) {
  const rendered = renderLexicalContent(content)
  if (rendered === null) {
    return null
  }
  const ids = headingsOf(content).map((heading) => heading.id)
  const classes = ['kc-richtext', className ?? ''].filter(Boolean).join(' ')
  return <div className={classes}>{withHeadingIds(rendered, ids, { next: 0 })}</div>
}
