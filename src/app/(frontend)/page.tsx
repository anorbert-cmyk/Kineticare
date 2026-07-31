import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

/**
 * Ideiglenes placeholder-route a keret-layout demonstrálásához.
 * A valódi kezdőlap-tartalom a következő hullám feladata — itt szándékosan
 * nincs üzleti tartalom.
 */
export default function HomePage() {
  return (
    <Section>
      <Container size="narrow">
        <p>Az oldal jelenleg épül.</p>
      </Container>
    </Section>
  )
}
