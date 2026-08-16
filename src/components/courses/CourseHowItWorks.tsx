import type { SalesStep } from './sales-content'

/**
 * CourseHowItWorks — „Hogyan működik?" lépéssor.
 *
 * Ellenérv-csökkentő szakasz (UX-skill M5): a látogató legnagyobb kételye
 * digitális terméknél az, hogy MIKOR és HOGYAN jut hozzá. A lépések
 * párhuzamos, egyenrangú tartalmak, ezért rácsba valók (B3.1) — nem
 * folyószövegbe és nem harmonikába.
 *
 * A szövegek a `howItWorks` termékmezőből jönnek; ha a szerkesztő üresen
 * hagyja, a sales-content tényadat-tartaléka tölti (fizetés → azonnali
 * hozzáférés → a hozzáférés hossza).
 */
export interface CourseHowItWorksProps {
  steps: SalesStep[]
  headingId: string
  heading: string
}

export function CourseHowItWorks({ steps, headingId, heading }: CourseHowItWorksProps) {
  if (steps.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={headingId} className="kc-course-section" id="hogyan-mukodik">
      <h2 className="kc-course-section__title" id={headingId}>
        {heading}
      </h2>
      <ol className="kc-course-steps" role="list">
        {steps.map((step, index) => (
          <li className="kc-course-step" key={`${index}-${step.title}`}>
            <p aria-hidden="true" className="kc-course-step__index">
              {index + 1}
            </p>
            <h3 className="kc-course-step__title">{step.title}</h3>
            {step.text ? <p className="kc-course-step__text">{step.text}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
