import type { CSSProperties } from 'react'

/**
 * CourseFitCheck — „Kinek való / kinek nem" EGYMÁS MELLETT.
 *
 * Miért két hasáb: ez a kettő definíció szerint összehasonlítandó pár —
 * egymás alatt a látogatónak fejben kell összevetnie őket (az NN/g
 * kártya-kutatásában mért „oda-vissza járó tekintet" problémája). A „kinek
 * NEM való" nyílt kimondása egyben a hitelesség 2. tényezője (upfront
 * disclosure) — docs/ux-belso-oldalak-kutatas.md 5.1, B3.1, K12.
 *
 * Ha csak az egyik lista van kitöltve, a szakasz egy hasábban jelenik meg —
 * üres „nincs adat" doboz nem kerül ki.
 */
export interface CourseFitCheckProps {
  fitFor: string[]
  notFitFor: string[]
  headingId: string
  heading: string
  /** A pozitív, illetve a negatív oszlop címe. */
  fitTitle: string
  notFitTitle: string
}

export function CourseFitCheck({
  fitFor,
  notFitFor,
  headingId,
  heading,
  fitTitle,
  notFitTitle,
}: CourseFitCheckProps) {
  if (fitFor.length === 0 && notFitFor.length === 0) {
    return null
  }
  const columns = fitFor.length > 0 && notFitFor.length > 0 ? 2 : 1

  return (
    <section aria-labelledby={headingId} className="kc-course-section" id="kinek-valo">
      <h2 className="kc-course-section__title" id={headingId}>
        {heading}
      </h2>
      <div className="kc-course-fit" data-columns={columns}>
        {fitFor.length > 0 ? (
          <div className="kc-course-fit__column kc-course-fit__column--yes">
            <h3 className="kc-course-fit__title">{fitTitle}</h3>
            <ul className="kc-course-checklist" role="list">
              {fitFor.map((item, index) => (
                <li
                  className="kc-course-checklist__item"
                  key={`fit-${index}`}
                  style={{ '--kc-course-stagger': index } as CSSProperties}
                >
                  <span aria-hidden="true" className="kc-course-checklist__mark">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {notFitFor.length > 0 ? (
          <div className="kc-course-fit__column kc-course-fit__column--no">
            <h3 className="kc-course-fit__title">{notFitTitle}</h3>
            <ul className="kc-course-checklist kc-course-checklist--no" role="list">
              {notFitFor.map((item, index) => (
                <li
                  className="kc-course-checklist__item"
                  key={`notfit-${index}`}
                  style={{ '--kc-course-stagger': index } as CSSProperties}
                >
                  <span aria-hidden="true" className="kc-course-checklist__mark">
                    ✕
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
