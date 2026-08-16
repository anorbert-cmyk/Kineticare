import type { Product } from '../../payload-types'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { CourseCard } from './CourseCard'

/**
 * RelatedCourses — kapcsolódó kurzusok (upsell) sáv a kurzus-oldal alján.
 * Csak a published kapcsolódó termékek jelennek meg (draft/archived upsell
 * nem kerülhet a storefrontra); ha nincs ilyen, a sáv rejtve marad.
 *
 * SÁV-RITMUS: a háttér alapból `tint` (a mai viselkedés), de a hívó
 * felülírhatja. Ok: a kurzusoldalon a vélemény-szekció is `tint`, és FELTÉTELES
 * — vélemény mellett két tint sáv kerülne egymás mellé, amelyek egyetlen nagy
 * folttá olvadnának, elveszítve a szekcióhatárt. Ugyanezt a feltételes
 * sáv-számítást csinálja a kezdőlap is (HomeView.tsx, `previousBandIsTint`) —
 * ez tehát a repó saját, bevált mintája, nem új találmány.
 */
export interface RelatedCoursesProps {
  products: Product[]
  /** Háttérsáv. Alapérték `tint`; a hívó `default`-ra vált, ha az előző sáv tint. */
  variant?: 'default' | 'tint'
}

export function RelatedCourses({ products, variant = 'tint' }: RelatedCoursesProps) {
  const published = products.filter((product) => product.status === 'published')
  if (published.length === 0) {
    return null
  }

  return (
    <Section variant={variant}>
      <Container>
        <h2 className="kc-course-related__title">Kapcsolódó kurzusok</h2>
        <ul className="kc-course-grid" role="list">
          {published.map((product) => (
            <li key={product.id}>
              <CourseCard headingLevel="h3" product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
