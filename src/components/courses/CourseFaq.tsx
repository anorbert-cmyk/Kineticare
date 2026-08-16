import type { SalesFaqItem } from './sales-content'

/**
 * CourseFaq — GYIK a kurzusoldal alján, natív `details`/`summary` harmonikában.
 *
 * Miért harmonika ÉPP itt: a látogatónak nem kell MINDEN válasz, csak a
 * sajátja, és a tételek önállóak — ez az NN/g és a GOV.UK szerint a
 * harmonika érvényes esete (docs/ux-belso-oldalak-kutatas.md B5.1). A natív
 * `details` JS nélkül is nyitható, és a képernyőolvasó is megkapja az
 * állapotot (B7.5) — ugyanaz a minta, mint a kezdőlapi FaqBlock.
 *
 * A fejlécben DARABSZÁM áll (B5.3): a rejtés önmagában eltüntetné, mennyi
 * kérdésre válaszolunk.
 *
 * FONTOS KORLÁT: harmonikába SOSEM kerül ár, garancia vagy a tananyag
 * szerkezete (B5.2) — azok a lapon nyitva állnak.
 */
export interface CourseFaqProps {
  items: SalesFaqItem[]
  headingId: string
  heading: string
}

export function CourseFaq({ items, headingId, heading }: CourseFaqProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={headingId} className="kc-course-section" id="gyik">
      <h2 className="kc-course-section__title" id={headingId}>
        {heading} <span className="kc-course-section__count">({items.length})</span>
      </h2>
      <div className="kc-course-faq">
        {items.map((item, index) => (
          <details className="kc-course-faq__item" key={`gyik-${index}`}>
            <summary className="kc-course-faq__question">{item.question}</summary>
            <p className="kc-course-faq__answer">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
