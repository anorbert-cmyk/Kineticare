import type { CSSProperties } from 'react'

import type { Product } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { PriceTag } from '../ui/PriceTag'
import { CourseCta } from './CourseCta'

/**
 * CourseBuybox — a kurzusoldal vásárlódoboza (a lap egyetlen elsődleges célja).
 *
 * A tartalma és a SORRENDJE a kutatás szerint áll össze
 * (docs/ux-belso-oldalak-kutatas.md 5.1): meta-jelölők → H1 → egymondatos
 * lead → 3 pipás előny → ÁR a gomb KÖZVETLEN közelében (B6.2) → elsődleges
 * CTA → másodlagos, nem versengő szöveglink (B6.5) → garancia-sor (B6.3).
 *
 * A doboz `id`-t kap: erre figyel a mobil ragadós vásárlósáv
 * (MobileBuyBar) IntersectionObserverrel — a sáv csak akkor jelenik meg,
 * amikor ez a doboz már nem látszik.
 */
export interface CourseBuyboxProps {
  id: string
  title: string
  lead: string | null
  categoryLabel: string | null
  audienceLabel: string
  /** A courses.ts coursePriceBadgeKind döntése — az árlogika KANONIKUS forrása. */
  priceBadge: 'price' | 'free' | 'none'
  priceHuf: number | null
  highlights: string[]
  guaranteeLabel: string | null
  /** Másodlagos, alacsonyabb súlyú horgony (pl. „Kinek való?"). */
  secondaryHref: string | null
  secondaryLabel: string | null
  product: Pick<Product, 'id' | 'status' | 'priceInHUFEnabled'>
  hasPurchased: boolean
}

export function CourseBuybox({
  id,
  title,
  lead,
  categoryLabel,
  audienceLabel,
  priceBadge,
  priceHuf,
  highlights,
  guaranteeLabel,
  secondaryHref,
  secondaryLabel,
  product,
  hasPurchased,
}: CourseBuyboxProps) {
  return (
    <div className="kc-card kc-card--padded kc-course-buybox" id={id}>
      <p className="kc-course-buybox__meta">
        {categoryLabel ? <Badge tone="info">{categoryLabel}</Badge> : null}
        <Badge tone="neutral">{audienceLabel}</Badge>
      </p>
      <h1 className="kc-course-buybox__title">{title}</h1>
      {lead ? <p className="kc-course-buybox__lead">{lead}</p> : null}

      {highlights.length > 0 ? (
        <ul className="kc-course-checklist" role="list">
          {highlights.map((item, index) => (
            <li
              className="kc-course-checklist__item"
              key={`${index}-${item}`}
              style={{ '--kc-course-stagger': index } as CSSProperties}
            >
              <span aria-hidden="true" className="kc-course-checklist__mark">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {priceBadge === 'price' && priceHuf !== null ? (
        <p className="kc-course-buybox__price">
          <PriceTag label="Ár:" priceHuf={priceHuf} />
          <span className="kc-course-buybox__price-note">egyszeri díj, további költség nincs</span>
        </p>
      ) : priceBadge === 'free' ? (
        <p className="kc-course-buybox__price kc-course-buybox__price--free">Ingyenes</p>
      ) : null}

      <CourseCta hasPurchased={hasPurchased} product={product} />

      {secondaryHref && secondaryLabel ? (
        <p className="kc-course-buybox__secondary">
          <a className="kc-course-textlink" href={secondaryHref}>
            {secondaryLabel}
          </a>
        </p>
      ) : null}

      {guaranteeLabel ? (
        <p className="kc-course-buybox__trust">
          <span aria-hidden="true" className="kc-course-buybox__trust-mark">
            ●
          </span>
          {guaranteeLabel}
        </p>
      ) : null}
    </div>
  )
}
