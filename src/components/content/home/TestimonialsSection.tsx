import type { Testimonial } from '../../../payload-types'
import { Card } from '../../ui/Card'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'

/**
 * TestimonialsSection — páciens-vélemények a kezdőlapon (audit M6/K4).
 *
 * A bizalmi blokk a TERMÉK UTÁN következik és tömör: legfeljebb 3 kiemelt
 * (`featured`) és látható (`visible`) vélemény, `order` szerint, és amelyiknél
 * a szerkesztő megadta, ott a RÖVID változat (`shortQuote`) jelenik meg — a
 * kezdőlap nem lehet három képernyőnyi idézet (K4-hiba).
 *
 * Tartalmi szabály: kizárólag valós, a CMS-ben rögzített visszajelzés kerülhet
 * ki. Ha nincs kiemelt vélemény, a szekció NEM renderelődik — üres állapotban
 * sincs helykitöltő vagy kitalált idézet.
 *
 * Nincs interaktív elem és nincs animáció: a fókuszkezelés és a
 * `prefers-reduced-motion` szempontjából a szekció semleges.
 *
 * Akadálymentesség: a szekció NEVÉT a saját címsora adja (`aria-labelledby` a
 * `section` elemen, nem a belső listán) — enélkül a landmark névtelen maradna.
 * A szerző nevét szándékosan `span` hordozza: a HTML `cite` eleme a MŰ címére
 * való, személynévre szabványsértő lenne.
 */

/** A kezdőlapon megjelenő vélemények felső korlátja (UX-skill M6: max 2–3). */
export const MAX_HOME_TESTIMONIALS = 3

/**
 * A kezdőlapra kerülő vélemények: kiemelt + látható, `order` szerint, max 3.
 *
 * A cms.ts `getTestimonials()` lekérdezése ugyanezt szűri — ez a védőháló (a
 * kártyakomponensek mintájára), hogy a szekció fixture-ből és éles adatból is
 * azonosan viselkedjen. A `limit` 1 és MAX_HOME_TESTIMONIALS közé szorítva
 * érvényesül — a kezdőlapi felső korlátot a blokk sem lépheti át.
 */
export function featuredTestimonials(
  testimonials: Testimonial[],
  limit: number = MAX_HOME_TESTIMONIALS,
): Testimonial[] {
  const clampedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_HOME_TESTIMONIALS)
  return testimonials
    .filter((testimonial) => testimonial.featured === true && testimonial.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, clampedLimit)
}

/** A megjelenő idézet: a rövid változat elsőbbséget élvez a teljes szöveg felett. */
export function testimonialQuoteText(testimonial: Testimonial): string {
  const short = testimonial.shortQuote?.trim() ?? ''
  return short.length > 0 ? short : testimonial.quote.trim()
}

export interface TestimonialsSectionProps {
  testimonials: Testimonial[]
  /** Kis felső felirat-felülírás a `testimonials` blokkból. */
  eyebrow?: string
  /** Cím-felülírás a blokkból — üresen a beépített cím marad. */
  heading?: string
  /** Megjelenő vélemények száma (1–3 közé szorítva). */
  maxItems?: number
  id?: string
  variant?: 'default' | 'tint' | 'dark'
  /**
   * A címsor egyedi id-je az `aria-labelledby`-hoz — akkor kell felülírni, ha
   * a blokk többször szerepel egy oldalon (különben duplikált id születne).
   */
  headingId?: string
}

export function TestimonialsSection({
  testimonials,
  eyebrow,
  heading,
  maxItems,
  id = 'velemenyek',
  variant = 'tint',
  headingId = 'velemenyek-cim',
}: TestimonialsSectionProps) {
  const items = featuredTestimonials(testimonials, maxItems ?? MAX_HOME_TESTIMONIALS)

  if (items.length === 0) {
    return null
  }

  const eyebrowText = eyebrow?.trim() || 'Vélemények'
  const title = heading?.trim() || 'Pácienseink mondták'

  return (
    <Section aria-labelledby={headingId} className="kc-testimonials" id={id} variant={variant}>
      <Container>
        <div className="kc-testimonials__head">
          <p className="kc-testimonials__eyebrow">{eyebrowText}</p>
          <h2 className="kc-section-title kc-testimonials__title" id={headingId}>
            {title}
          </h2>
        </div>
        <ul className="kc-testimonials__list">
          {items.map((testimonial) => {
            const role = testimonial.authorTitle?.trim() ?? ''
            return (
              <li className="kc-testimonials__item" key={testimonial.id}>
                <Card as="article" className="kc-testimonials__card">
                  <figure className="kc-testimonials__figure">
                    <span aria-hidden="true" className="kc-testimonials__mark">
                      „
                    </span>
                    <blockquote className="kc-testimonials__quote">
                      <p className="kc-testimonials__text">{testimonialQuoteText(testimonial)}</p>
                    </blockquote>
                    <figcaption className="kc-testimonials__attribution">
                      <span className="kc-testimonials__cite">{testimonial.authorName.trim()}</span>
                      {role.length > 0 ? <span className="kc-testimonials__role">{role}</span> : null}
                    </figcaption>
                  </figure>
                </Card>
              </li>
            )
          })}
        </ul>
      </Container>
    </Section>
  )
}
