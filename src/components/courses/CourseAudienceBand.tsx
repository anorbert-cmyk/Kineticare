import type { AudienceBand } from '../../lib/course-audience'
import type { Product } from '../../payload-types'

import { CourseCard } from './CourseCard'

/**
 * CourseAudienceBand — a /kurzusok lista egy célközönség-sávja („Otthoni
 * gyakorlóknak" / „Szakembereknek").
 *
 * - A sáv címsora h2 (az oldalon egyetlen h1 marad), a kártyák címei ezért
 *   h3-ak — a CourseCard erre való, meglévő headingLevel propjával.
 * - ÜRES sáv esetén a komponens NEM renderel semmit (se címet, se
 *   helykitöltőt): a nem létező kínálatnak nincs üres polca.
 * - A sáv stabil magyar horgonyt kap (`band.anchorId`), hogy a navigáció és a
 *   kezdőlapi CTA-k közvetlenül ide mutathassanak.
 */
export interface CourseAudienceBandProps {
  band: AudienceBand
  products: Product[]
}

export function CourseAudienceBand({ band, products }: CourseAudienceBandProps) {
  if (products.length === 0) {
    return null
  }
  const headingId = `${band.anchorId}-cim`
  return (
    <section aria-labelledby={headingId} className="kc-course-band" id={band.anchorId}>
      <h2 className="kc-course-band__title" id={headingId}>
        {band.title}
      </h2>
      <p className="kc-course-band__lead">{band.lead}</p>
      <ul className="kc-course-grid" role="list">
        {products.map((product) => (
          <li key={product.id}>
            <CourseCard headingLevel="h3" product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}
