import '../../app/(frontend)/styles/blocks/post-view.css'

/**
 * PostToc — „Ezen az oldalon" tartalomjegyzék a cikk törzsének elején.
 *
 * ═══ MIÉRT VAN, ÉS MIÉRT PONT ÍGY ═══
 * NN/g, *In-Page Links for Content Navigation*
 * (https://www.nngroup.com/articles/in-page-links-content-navigation/): a
 * mintát 11 résztvevőből 9 ismerte és használta; a felirat legyen
 * egyértelmű („Table of Contents" vagy „On This Page"), mert „in-page links,
 * when not formatted with intention, can still surprise users". Magyarul ez
 * az „Ezen az oldalon" (docs/tudastar-ux-terv.md 7.3).
 *
 * ═══ SZERKEZET ═══
 * - `<nav>` saját címsorral megnevezve (`aria-labelledby`) — WCAG 2.2 1.3.1
 *   (Info and Relationships) és 2.4.6 (Headings and Labels);
 * - **számozott** lista (`<ol>`), mert a cikk szakaszainak sorrendje számít;
 * - CSAK a H2 szint (a H3-akkal kétszintű, zsúfolt lista lenne);
 * - a linkek 44 px magas érintőcélt kapnak (post-view.css) — a WCAG 2.2
 *   **2.5.8** 24 px-es AA-küszöbe fölött, a repó 44 px-es (2.5.5 AAA)
 *   gyakorlatán.
 *
 * ═══ NEM RAGADÓS ═══
 * A jegyzék a lead alatt, a szűk konténerben áll, nem oldalsó ragadós sávban:
 * a ragadó elem a meglévő ragadós fejléc és süti-sáv mellett a WCAG 2.2
 * **2.4.11** (Focus Not Obscured) kockázata, és a fenti kutatás sem ezt a
 * formát vizsgálta (docs/tudastar-ux-terv.md 5.4, 8. fejezet).
 *
 * ═══ GÖRGETÉS ÉS FÓKUSZ ═══
 * Nincs saját JS: a globálisan mountolt `AnchorScroll`
 * (`src/components/motion/AnchorScroll.tsx`) intézi, hogy a hosszú ugrás ne
 * animálódjon, és hogy a fókusz a cél szakaszcímre kerüljön (GOV.UK
 * skip-link `setFocus` mintája) — WCAG 2.2 2.4.3 (Focus Order).
 */
export interface PostTocProps {
  /** A cikk H2-szakaszai dokumentum-sorrendben (post-outline.ts). */
  items: ReadonlyArray<{ id: string; text: string }>
}

/** A jegyzék saját címsorának horgonya; foglalt id (post-outline.ts). */
const TOC_HEADING_ID = 'tudastar-toc-cim'

export function PostToc({ items }: PostTocProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <nav aria-labelledby={TOC_HEADING_ID} className="kc-post-toc">
      <h2 className="kc-post-toc__title" id={TOC_HEADING_ID}>
        Ezen az oldalon
      </h2>
      <ol className="kc-post-toc__list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
