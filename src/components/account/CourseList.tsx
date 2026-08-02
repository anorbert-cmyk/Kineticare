import Link from 'next/link'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { courseCover, courseTitle } from '../../lib/courses'
import type { Product } from '../../payload-types'

/**
 * CourseList — a megvett kurzusok kártyalistája (a kurzusaim oldalon).
 */
export interface CourseListProps {
  products: Product[]
}

export function CourseList({ products }: CourseListProps) {
  if (products.length === 0) {
    return (
      <div className="kc-cart-empty" role="status">
        <p>Még nincs kurzusod.</p>
        <Button href="/kurzusok">Nézd meg a kurzusainkat</Button>
      </div>
    )
  }

  return (
    <ul className="kc-course-grid" role="list">
      {products.map((product) => {
        const cover = courseCover(product)
        return (
          <li key={product.id}>
            <Card as="article" className="kc-course-card" interactive padded={false}>
              <Link className="kc-course-card__media" href={`/kurzusaim/${product.id}`} tabIndex={-1}>
                {cover ? (
                  <img
                    alt={cover.alt}
                    decoding="async"
                    height={cover.height ?? undefined}
                    loading="lazy"
                    src={cover.url}
                    width={cover.width ?? undefined}
                  />
                ) : (
                  <span aria-hidden="true" className="kc-course-card__media-placeholder" />
                )}
              </Link>
              <div className="kc-course-card__body">
                <h2 className="kc-course-card__title">
                  <Link href={`/kurzusaim/${product.id}`}>{courseTitle(product)}</Link>
                </h2>
                {product.shortDescription ? (
                  <p className="kc-course-card__excerpt">{product.shortDescription}</p>
                ) : null}
                <Button href={`/kurzusaim/${product.id}`} size="sm">
                  Tovább a lejátszáshoz
                </Button>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
