import { resolveCourseCta } from '../../lib/courses'
import type { Product } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

/**
 * CourseCta — a kurzus-oldal vásárlási akciója (az értékesítés motorja).
 *
 * Állapotgép (src/lib/courses.ts resolveCourseCta, egységtesztelve):
 * - published + nem vevő → „Megveszem" → /penztar?termek={id} (a végső
 *   checkout-útvonal a W3-ban dől el — lásd CHECKOUT_PATH komment);
 * - bejelentkezett vevő („már megvetted", users.purchases) → „Tovább a
 *   kurzusaimhoz" link — archived terméknél is (a meglévő vevő tovább nézi);
 * - archived + nem vevő → a CTA INAKTÍV + „Ez a kurzus jelenleg nem
 *   vásárolható" jelölés.
 */
export interface CourseCtaProps {
  product: Pick<Product, 'id' | 'status'>
  /** Bejelentkezett felhasználó purchases-listája alapján (csak olvasás). */
  hasPurchased: boolean
}

export function CourseCta({ product, hasPurchased }: CourseCtaProps) {
  const cta = resolveCourseCta(product, hasPurchased)

  return (
    <div className="kc-course-cta">
      <Button
        disabled={cta.disabled}
        href={cta.href ?? undefined}
        variant={cta.kind === 'purchased' ? 'secondary' : 'primary'}
      >
        {cta.label}
      </Button>
      {cta.kind === 'archived' && cta.note ? (
        <p className="kc-course-cta__note">
          <Badge tone="warning">{cta.note}</Badge>
        </p>
      ) : null}
      {cta.kind === 'purchased' ? (
        <p className="kc-course-cta__note kc-course-cta__note--owned">
          Már megvetted ezt a kurzust.
        </p>
      ) : null}
    </div>
  )
}
