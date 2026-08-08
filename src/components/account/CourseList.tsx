import Link from 'next/link'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { CourseAccessView } from '../../lib/course-access'
import { courseCover, courseTitle } from '../../lib/courses'
import type { Product } from '../../payload-types'

/**
 * CourseList — a megvett kurzusok kártyalistája (a kurzusaim oldalon).
 *
 * A hozzáférés időbeli érvényessége (A1) a szerveren dől el
 * (src/lib/course-access.ts); ide már kész, magyar szövegek érkeznek:
 * - él a hozzáférés + van lejárat → „Hozzáférés eddig: 2027. 03. 04.";
 * - lejárt hozzáférés → empatikus üzenet + a kurzus oldalára mutató link
 *   (a lejátszó ilyenkor nem indul el, a stream-token 403-at ad).
 */
export interface CourseListProps {
  products: Product[]
  /** productId → hozzáférés-állapot; hiányzó bejegyzés = korlátlan hozzáférés. */
  accessByProductId?: Record<number, CourseAccessView>
}

export function CourseList({ accessByProductId, products }: CourseListProps) {
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
        const access = accessByProductId?.[product.id]
        const expired = access?.hasAccess === false
        const target = expired ? `/kurzusok/${product.id}` : `/kurzusaim/${product.id}`
        return (
          <li key={product.id}>
            <Card as="article" className="kc-course-card" interactive padded={false}>
              <Link className="kc-course-card__media" href={target} tabIndex={-1}>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a Payload media méretei kézileg vannak bekötve (width/height a CMS-ből)
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
                  <Link href={target}>{courseTitle(product)}</Link>
                </h2>
                {product.shortDescription ? (
                  <p className="kc-course-card__excerpt">{product.shortDescription}</p>
                ) : null}
                {expired ? (
                  <p className="kc-course-access kc-course-access--expired">
                    {access?.expiredMessage}
                  </p>
                ) : access?.expiryLabel ? (
                  <p className="kc-course-access">{access.expiryLabel}</p>
                ) : null}
                <Button href={target} size="sm">
                  {expired ? 'A kurzus megtekintése' : 'Tovább a lejátszáshoz'}
                </Button>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
