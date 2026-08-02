import Link from 'next/link'

import type { Product } from '../../payload-types'
import { Card } from '../ui/Card'
import { PriceTag } from '../ui/PriceTag'
import { MediaImage } from './MediaImage'

/**
 * ProductCard — kurzus-kiemelés kártyája (cover / cím / ár).
 *
 * A kártya a /kurzusok/<id> útvonalra mutat (a menü URL-konvencióval egyezően,
 * lásd src/lib/menu-tree.ts); a kurzus-oldal a következő hullám (5C) feladata.
 * Csak published termék kerülhet a kártyára — a szűrés a lekérdezésben
 * (src/lib/cms.ts PUBLISHED_WHERE) történik, itt védőhálóként újra ellenőrizzük.
 */
export interface ProductCardProps {
  // A plugin products collectionében NINCS title mező — a megjelenített név az sku
  // (a collection useAsTitle-ja is az, lásd src/plugins/ecommerce.ts).
  product: Pick<
    Product,
    'id' | 'sku' | 'shortDescription' | 'coverImage' | 'priceInHUF' | 'priceInHUFEnabled' | 'status'
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

  const title = product.sku?.trim() || 'Kurzus'
  const showPrice = product.priceInHUFEnabled === true && typeof product.priceInHUF === 'number'
  const coverMedia =
    product.coverImage && typeof product.coverImage === 'object' ? product.coverImage : null

  return (
    <Card as="article" className="kc-product-card" interactive padded={false}>
      <Link className="kc-product-card__link" href={`/kurzusok/${product.id}`}>
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
          {showPrice ? (
            <span className="kc-product-card__price">
              <PriceTag label="Ár:" priceHuf={product.priceInHUF as number} />
            </span>
          ) : null}
        </span>
      </Link>
    </Card>
  )
}
