import Link from 'next/link'

import type { Category, Post } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { MediaImage } from './MediaImage'

import '../../app/(frontend)/styles/blocks/knowledge.css'

/**
 * PostCard — blogposzt-kártya (borító / kategória / cím / kivonat / dátum).
 * A /blog/<slug> útvonalra mutat; csak published poszttal renderel.
 *
 * Megjelenés: a landing kártya-nyelve (hajszálvonalas keret, serif cím, a
 * lábban hajszálvonal fölött a dátum). A stílust maga a kártya importálja, mert
 * a kezdőlapon KÍVÜL a /blog listán, a kategória-oldalon és a kapcsolódó
 * posztoknál is megjelenik — lásd styles/blocks/knowledge.css.
 *
 * ═══ MIÉRT CSAK A CÍM A LINK (2026-08-21-i átépítés) ═══
 * Korábban a TELJES kártya egyetlen `<a>` volt. Mérve
 * (docs/tudastar-a11y-meres.md 3.2) a link hozzáférhető neve három valódi
 * kapcsolódó kártyán 206 / 227 / 212 karakter lett, mert a név a
 * kategória-címke + cím + kivonat + dátum összeragadása; ráadásul mindhárom
 * név UGYANAZZAL a szóval kezdődött (a kategória nevével), tehát a
 * képernyőolvasó link-listájában megkülönböztethetetlenek voltak.
 *
 * A minta, amit most viszünk (Heydon Pickering, *Inclusive Components —
 * Cards*, https://inclusive-components.design/cards/, hozzáférés: 2026-08-21):
 * „the title/heading is the name of the article for which the card acts as a
 * teaser. It makes sense, then, to use its text as the primary link", és
 * „Each card has a heading of the same level … because they belong to a flat
 * list hierarchy". A teljes kártya kattinthatóságát a cím-link `::after`
 * pszeudoeleme adja vissza (`position: absolute; inset: 0`) — a szabály a
 * knowledge.css-ben áll, az indoklásával és a mellékhatásaival együtt.
 * A nagy célfelület haszna Fitts törvényéből jön: NN/g, *Cards:
 * UI-Component Definition* (2016-11-06,
 * https://www.nngroup.com/articles/cards-component/, hozzáférés: 2026-08-21):
 * a kártya „a linked, short representation of a conceptual unit", amelynél
 * „clicking or tapping *anywhere* on the card link to a details page".
 *
 * ═══ MIÉRT KONFIGURÁLHATÓ A CÍMSOR SZINTJE ═══
 * A kártya NÉGY felületen jelenik meg, és a fölötte álló címsor nem ugyanaz:
 * a kezdőlapi szekció és a cikkoldal kapcsolódó blokkja fölött h2 áll (ott a
 * kártya h3), a `/blog` lista és a kategória-oldal fölött viszont csak a lap
 * h1-e (ott a kártya h2). Fix h3 mellett a két lista-oldal h1 → h3 ugrást
 * kapna, ami a WCAG 2.2 1.3.1 (Info and Relationships) szerinti szerkezetet
 * rontja. Alapértelmezés: h3 — ez a gyakoribb eset, és ez felel meg a
 * `docs/tudastar-a11y-meres.md` 3.2 pontjának javaslatának.
 *
 * ═══ MIÉRT NINCS KIVONAT A `compact` VÁLTOZATON ═══
 * A hármas rácsban a kivonat mért sorhossza 24–38 karakter/sor
 * (docs/tudastar-a11y-meres.md 3.1), a repó Ü6 szabályának 45-ös alsó
 * tűréshatára alatt (docs/ui-sztenderdek.md). A kivonatot ezért nem elrejteni
 * kell — úgy a DOM-ban maradna, és a képernyőolvasó, illetve a keresőrobot
 * továbbra is végigolvasná —, hanem NEM ODATENNI. A kártya-definíció
 * (NN/g, fent) szerint a teaser-sávban a cím önmagában elég információ-szag.
 */
export interface PostCardProps {
  post: Pick<
    Post,
    'id' | 'title' | 'slug' | 'excerpt' | 'heroImage' | 'publishedAt' | 'categories' | 'status'
  >
  /**
   * `list` (alapértelmezés): a kivonattal együtt — a `/blog` lista és a
   * kategória-oldal kéthasábos rácsához. `compact`: kivonat NÉLKÜL — a hármas
   * rácsú kezdőlapi szekcióhoz és a kapcsolódó blokkhoz.
   */
  variant?: 'list' | 'compact'
  /** A kártyacím címsor-szintje. Alapértelmezés: 3 (h2 szekciócím alatt). */
  headingLevel?: 2 | 3
}

/** Magyar dátumformázás (pl. 2025. március 4.); érvénytelen/hiányzó dátumra null. */
export function formatPostDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long' }).format(date)
}

function categoryTitles(categories: Post['categories']): string[] {
  if (!Array.isArray(categories)) return []
  return categories
    .filter((cat): cat is Category => typeof cat === 'object' && cat !== null)
    .map((cat) => cat.title)
    .filter((title): title is string => typeof title === 'string' && title.length > 0)
}

export function PostCard({ post, variant = 'list', headingLevel = 3 }: PostCardProps) {
  if (post.status !== 'published' || !post.slug) {
    return null
  }

  const date = formatPostDate(post.publishedAt)
  const titles = categoryTitles(post.categories)
  const heroMedia = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null
  const Cim = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <Card as="article" className="kc-post-card" interactive padded={false}>
      {heroMedia ? (
        <div className="kc-post-card__cover">
          <MediaImage media={heroMedia} preferredSize="sm" sizes="(max-width: 720px) 100vw, 352px" />
        </div>
      ) : null}
      <div className="kc-post-card__body">
        {titles.length > 0 ? (
          <div className="kc-post-card__categories">
            {titles.map((title) => (
              <Badge key={title} tone="info">
                {title}
              </Badge>
            ))}
          </div>
        ) : null}
        {/* A kártya EGYETLEN linkje. A hozzáférhető neve pontosan a cikk címe
            (mérve: 42 / 51 / 40 karakter a három mintacímen, a terv 80-as
            felső határa alatt) — a kategória, a kivonat és a dátum
            SZÁNDÉKOSAN a linken kívül áll. */}
        <Cim className="kc-post-card__title">
          <Link className="kc-post-card__link" href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </Cim>
        {variant === 'list' && post.excerpt ? (
          <p className="kc-post-card__excerpt">{post.excerpt}</p>
        ) : null}
        <div className="kc-post-card__foot">
          {date ? (
            <span className="kc-post-card__date">
              <time dateTime={typeof post.publishedAt === 'string' ? post.publishedAt : undefined}>
                {date}
              </time>
            </span>
          ) : null}
          {/* A cím-link overlay-e az egész kártyát kattinthatóvá teszi, ezért a
              CTA dekoratív nyíl (aria-hidden) — beágyazott gomb vagy második
              link nem lehet a kártyán (az overlay elnyelné). */}
          <span aria-hidden="true" className="kc-post-card__arrow">
            →
          </span>
        </div>
      </div>
    </Card>
  )
}
