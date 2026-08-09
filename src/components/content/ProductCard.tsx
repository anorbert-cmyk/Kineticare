import Link from 'next/link'

import { courseHref } from '../../lib/course-url'
import { courseTitle } from '../../lib/courses'
import type { Product } from '../../payload-types'
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
}

/** Publikusan megjeleníthető-e a termék (draft/archived sosem). */
export function isPubliclyVisibleProduct(product: { status?: string | null }): boolean {
  return product.status === 'published'
}

export function ProductCard({ product }: ProductCardProps) {
  if (!isPubliclyVisibleProduct(product)) {
    return null
  }

  const title = courseTitle(product)
  const showPrice = product.priceInHUFEnabled === true && typeof product.priceInHUF === 'number'
  const coverMedia =
    product.coverImage && typeof product.coverImage === 'object' ? product.coverImage : null

  return (
    <Card as="article" className="kc-product-card" interactive padded={false}>
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
            {showPrice ? (
              <span className="kc-product-card__price">
                <PriceTag label="Ár:" priceHuf={product.priceInHUF as number} />
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
