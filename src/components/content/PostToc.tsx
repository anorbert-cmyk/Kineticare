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
 * ═══ ELŐNÉZET + KINYITHATÓ FOLYTATÁS (2026-08-21) ═══
 * MÉRT PROBLÉMA. A 14 tételes jegyzék 320 px-en **823,7 px** magas volt, a
 * 800 px-es nézetablak **103%-a**: a cikk első törzs-szakasza (ma a vörös
 * zászló szakasz) a 2,05. képernyőre csúszott. Az NN/g *Scrolling and
 * Attention* mérése szerint a nézési idő 57%-a az ELSŐ képernyőre esik, a
 * másodikra már csak 17% (https://www.nngroup.com/articles/scrolling-and-attention/),
 * tehát a mai elrendezésben a jegyzék elvitte az 57%-ot.
 *
 * KÉT MEGOLDÁST MÉRTEM LE, ugyanazon a lapon, minden mást változatlanul
 * hagyva (Chromium 141, a valódi 14 szakaszos cikk, a repó betűivel):
 *
 *   A) TELJES HARMONIKA: az egész jegyzék egyetlen `details`-ben, zárva.
 *   B) ELŐNÉZET: az első hat tétel mindig látszik, a többi `details` mögött.
 *
 *   ┌────────────────────────┬──────────┬──────────┬──────────┐
 *   │                        │ MAI      │ A)       │ B)       │
 *   ├────────────────────────┼──────────┼──────────┼──────────┤
 *   │ jegyzék 320×800        │ 823,7 px │ 102,0 px │ 440,4 px │
 *   │                        │ (103,0%) │ (12,8%)  │ (55,0%)  │
 *   │ jegyzék 390×844        │ 751,0    │ 102,0    │ 422,1    │
 *   │ jegyzék 768×1024       │ 694,2    │ 102,0    │ 394,2    │
 *   │ jegyzék 1440×900       │ 695,6    │ 102,0    │ 395,6    │
 *   │ 1. törzs-H2 @320       │ 2,05 kép.│ 1,15 kép.│ 1,57 kép.│
 *   │ 1. törzs-H2 @390       │ 1,85     │ 1,08     │ 1,46     │
 *   │ 1. jegyzék-link @390   │ y=827,5  │ REJTVE   │ y=827,5  │
 *   │ 1. jegyzék-link @768   │ y=956,4  │ REJTVE   │ y=956,4  │
 *   └────────────────────────┴──────────┴──────────┴──────────┘
 *
 * A VÁLASZTÁS: B, három okból.
 *
 * 1. A jegyzék ELSŐ tétele a „mikor hívj mentőt" szakaszra mutat, és ez a
 *    riadt látogató egyetlen gyors útja — a séta ezt kifejezetten a
 *    „nem szabad elrontani" listára tette (docs/tudastar-felhasznaloi-seta.md
 *    7.4 és 11.). A B változatban ennek a linknek a helye BITRE ugyanaz
 *    marad, mint ma (y=827,5 @390, y=956,4 @768); az A változatban a zárt
 *    harmonika mögé kerül, tehát nyitás nélkül nem is látszik.
 * 2. A GOV.UK *Details* komponens szabálya kimondja: „Do not use the details
 *    component to hide information that the majority of your users will
 *    need" (https://design-system.service.gov.uk/components/details/), és
 *    ugyanez a lap méri, hogy egyes felhasználók el sem merik nyitni, mert
 *    azt hiszik, elnavigálja őket. Az NN/g *Accordions on Mobile* ugyanezt a
 *    kettősséget írja le: a harmonika rövidíti a lapot, de „can also cause
 *    disorientation" (https://www.nngroup.com/articles/mobile-accordions/).
 *    A jegyzék FARKA az, amire a többség nem azonnal kíváncsi; a jegyzék
 *    ELEJE nem az.
 * 3. A `details` nyitottsága HTML-attribútum, nem CSS: JS nélkül nem lehet
 *    „mobilon zárva, asztalon nyitva". Az A változat ezért asztali nézetben
 *    is bezárná a jegyzéket, ahol a hely megvan rá.
 *
 * AMIT B CSINÁL. A jegyzék ELSŐ HAT tétele mindig látszik, a többi egy natív
 * `details`/`summary` mögé kerül, a `.kc-faq` már meglévő nyelvén (ugyanaz a
 * `+`/`−` jel, ugyanaz a 44 px-es nyitó, ugyanaz a natív elem — WCAG 2.2
 * **3.2.4**, Consistent Identification). A hatos küszöb az NHS
 * felsorolás-szabálya: „Limit your list to no more than 6 items"
 * (https://service-manual.nhs.uk/content/formatting) — ugyanaz a szám, amit a
 * `postFaqItems` is visz. A `summary` felirata megnevezi, mennyi van mögötte
 * („További 8 szakasz"), tehát a lap szerkezetének képe („mental model") nem
 * vész el, csak a lista farka kerül egy koppintásnyira.
 *
 * A számozás a `start` attribútummal folytatódik, tehát a nyitott listában
 * 7-tel kezdődik a folytatás: a sorrend információ. A nyitó doboza minden
 * mért nézetablakon 44,0 px magas.
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

/**
 * Hány tétel látszik nyitás nélkül. NHS: „Limit your list to no more than 6
 * items" (https://service-manual.nhs.uk/content/formatting) — ugyanaz a
 * korlát, ami a GYIK-tételek maximumát is adja (post-article.ts).
 */
export const TOC_ELONEZET_TETEL = 6

export function PostToc({ items }: PostTocProps) {
  if (items.length === 0) {
    return null
  }
  // Egyetlen tételért nem nyitunk harmonikát: hét tételnél a „További 1
  // szakasz" nyitó ugyanannyi helyet kér, mint maga a tétel.
  const elonezet = items.length <= TOC_ELONEZET_TETEL + 1 ? items.length : TOC_ELONEZET_TETEL
  const lathato = items.slice(0, elonezet)
  const tovabbi = items.slice(elonezet)
  return (
    <nav aria-labelledby={TOC_HEADING_ID} className="kc-post-toc">
      <h2 className="kc-post-toc__title" id={TOC_HEADING_ID}>
        Ezen az oldalon
      </h2>
      <ol className="kc-post-toc__list">
        {lathato.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ol>
      {tovabbi.length > 0 ? (
        <details className="kc-post-toc__tobbi">
          {/* A felirat MEGNEVEZI, mi van mögötte (GOV.UK Details: a nyitó
              mondja meg, mit tár fel), és a darabszámmal a lap szerkezetének
              képe akkor is megvan, ha a látogató nem nyitja ki. */}
          <summary className="kc-post-toc__nyito">További {tovabbi.length} szakasz</summary>
          {/* A `start` folytatja a számozást: a sorrend információ. */}
          <ol className="kc-post-toc__list" start={elonezet + 1}>
            {tovabbi.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </nav>
  )
}
