import Link from 'next/link'

import { courseHref } from '../../lib/course-url'
import { coursePriceBadgeKind, courseTitle } from '../../lib/courses'
import type { Product } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { PriceTag } from '../ui/PriceTag'
import { MediaImage } from './MediaImage'

import '../../app/(frontend)/styles/blocks/course-cards.css'

/**
 * ProductCard — kurzus-kiemelés kártyája (cover / cím / ár).
 *
 * A kártya a kurzus KANONIKUS címére mutat (courseHref: slug, ennek hiányában
 * a régi id-s út — ugyanaz a konvenció, mint a menüben, lásd
 * src/lib/menu-tree.ts). Csak published termék kerülhet a kártyára — a szűrés a
 * lekérdezésben (src/lib/cms.ts PUBLISHED_WHERE) történik, itt védőhálóként
 * újra ellenőrizzük.
 *
 * Megjelenés: a landing kártya-nyelve (hajszálvonalas keret, serif cím, a
 * lábban hajszálvonal fölött az ár). A stílust maga a kártya importálja, mert
 * a kezdőlapon KÍVÜL a /kurzusok listán is megjelenik — lásd
 * styles/blocks/course-cards.css.
 */
export interface ProductCardProps {
  // A megjelenített név a displayTitle → sku lánc (courseTitle), az URL pedig a
  // slug → id lánc (courseHref) — lásd src/plugins/ecommerce.ts.
  product: Pick<
    Product,
    | 'id'
    | 'slug'
    | 'sku'
    | 'displayTitle'
    | 'shortDescription'
    | 'coverImage'
    | 'priceInHUF'
    | 'priceInHUFEnabled'
    | 'status'
  >
  /**
   * Vizuális súly. A `secondary` a lead-magnet (ingyenes) kártyáé: ugyanaz a
   * szerkezet, visszafogottabb keret és háttér — az UX-skill M4/K2 pontja
   * szerint az ingyenes ajánlat NEM nyomhatja el a fizetőst, de ugyanabban a
   * blokkban helye van (docs/ertekesitesi-ux-skill.md).
   */
  tone?: 'primary' | 'secondary'
}

/** Publikusan megjeleníthető-e a termék (draft/archived sosem). */
export function isPubliclyVisibleProduct(product: { status?: string | null }): boolean {
  return product.status === 'published'
}

export function ProductCard({ product, tone = 'primary' }: ProductCardProps) {
  if (!isPubliclyVisibleProduct(product)) {
    return null
  }

  const title = courseTitle(product)
  // Egy igazságforrás a kurzusoldallal: a 'none' eset (ár-pipa BE, de az ár
  // ÜRES) szándékosan SEM árat, SEM „Ingyenes"-t nem mutat — az konfigurációs
  // hiba, és a címke a kártyán is megtévesztő lenne (lásd courses.ts).
  const priceBadge = coursePriceBadgeKind(product)
  const coverMedia =
    product.coverImage && typeof product.coverImage === 'object' ? product.coverImage : null
  const className =
    tone === 'secondary' ? 'kc-product-card kc-product-card--secondary' : 'kc-product-card'

  return (
    <Card as="article" className={className} interactive padded={false}>
      <Link className="kc-product-card__link" href={courseHref(product)}>
        {coverMedia ? (
          <span className="kc-product-card__cover">
            <MediaImage media={coverMedia} preferredSize="sm" sizes="(max-width: 720px) 100vw, 352px" />
          </span>
        ) : null}
        <span className="kc-product-card__body">
          <span className="kc-product-card__title">{title}</span>
          {product.shortDescription ? (
            <span className="kc-product-card__description">{product.shortDescription}</span>
          ) : null}
          <span className="kc-product-card__foot">
            {priceBadge === 'price' ? (
              <span className="kc-product-card__price">
                <PriceTag label="Ár:" priceHuf={product.priceInHUF as number} />
              </span>
            ) : null}
            {priceBadge === 'free' ? (
              <span className="kc-product-card__price">
                <Badge tone="success">Ingyenes</Badge>
              </span>
            ) : null}
            {/* A kártya EGÉSZE a kurzus-oldalra vivő link, ezért a CTA dekoratív
                nyíl (aria-hidden) — beágyazott gomb/link nem lehet benne. */}
            <span aria-hidden="true" className="kc-product-card__arrow">
              →
            </span>
          </span>
        </span>
      </Link>
    </Card>
  )
}
