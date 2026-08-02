import type { Product } from '../../payload-types'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { CourseCard } from './CourseCard'

/**
 * RelatedCourses — kapcsolódó kurzusok (upsell) sáv a kurzus-oldal alján.
 * Csak a published kapcsolódó termékek jelennek meg (draft/archived upsell
 * nem kerülhet a storefrontra); ha nincs ilyen, a sáv rejtve marad.
 */
export interface RelatedCoursesProps {
  products: Product[]
}

export function RelatedCourses({ products }: RelatedCoursesProps) {
  const published = products.filter((product) => product.status === 'published')
  if (published.length === 0) {
    return null
  }

  return (
    <Section variant="tint">
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
