import { ctaLabel } from '../../lib/cta-vocabulary'

/**
 * FreeCourseFormLink — ISMÉTELT belépő az ingyenes kurzus igénylő űrlapjához,
 * a hosszú kurzusoldal tartalmának végén.
 *
 * ═══ MIÉRT LÉTEZIK ═══
 * Az igénylő űrlap a lap TETEJÉN, a vásárlódobozban áll (`FreeCourseRequestForm`).
 * 1024 px felett a doboz RAGADÓS, tehát az olvasás közben végig ott marad;
 * 1024 px ALATT viszont a doboz kigörgül a képből, és a `free` ágon ragadós
 * alsó vásárlósáv sincs (az egy `href`-alapú link, űrlap-beküldést nem tud
 * elvégezni). A végigolvasó látogatónak így ma nincs visszaútja.
 *
 * ═══ A KUTATÁS, AMI EZT A FORMÁT ADJA ═══
 *  - NN/g, The Same Link Twice on the Same Page: a duplikált hivatkozásnak ÁRA
 *    van (a látogató azon gondolkodik, ugyanoda visz-e a kettő), és
 *    „Duplicating links is usually not necessary if your pages are 2–3 screens
 *    long" — DE: „In cases when the page is extremely long, such as when the
 *    same long-form content is presented on mobile devices, having links at the
 *    bottom of pages can be a time-saver", és hosszú lapon a ragadós megoldás a
 *    jobb, AHOL VAN (https://www.nngroup.com/articles/duplicate-links/).
 *    Ebből következik a pontos hatókör: a másolat KIZÁRÓLAG ott jelenik meg,
 *    ahol ragadós doboz nincs, tehát 1024 px alatt (kurzusok.css).
 *  - NN/g, Scrolling and Attention: „Keep major CTAs above the fold"; a nézési
 *    idő 42%-a a felső 20%-ra esik
 *    (https://www.nngroup.com/articles/scrolling-and-attention/). Az elsődleges
 *    hely tehát marad a doboz — ez itt MÁSODLAGOS súlyú (a §3.2 #27 `secondary`
 *    változata), nem egy második elsődleges gomb (K-3).
 *  - A régi `www.kineticare.hu` `/kezrelax` landingje ugyanezt a belépőt
 *    NÉGYSZER ismételte (`KÉREM A VILLÁMKURZUST` 4×, mérve:
 *    `docs/regi-oldal-osszehasonlitas.md` 3.1). Mi egyszer ismételjük.
 *
 * ═══ FELIRAT ═══
 * A §3.2 **#27** jóváhagyott sora (`Kérd az ingyenes kurzust`, E/2), a
 * `cta-vocabulary.ts`-ből olvasva — nem literál, tehát a G-UI1 őr védi. Ez
 * NAVIGÁCIÓ, ezért E/2 és `secondary`; a VÁLLALÁS továbbra is a #26 gomb
 * („Kérem a kurzust", E/1) az űrlapon.
 *
 * ═══ MIÉRT PUSZTA `<a>`, ÉS NEM A Button KOMPONENS ═══
 * A lap minden lapon belüli horgonya nyers `<a href="#…">` (horgony-chipek,
 * a vásárlódoboz másodlagos linkje). A `Button` belső útvonalnál `next/link`-et
 * renderel, ami ugyanennek a lapnak a hash-ére szoftver-navigációt indítana —
 * a horgony-viselkedés (AnchorScroll, `scroll-margin-top`) így minden ugrásnál
 * BITRE ugyanaz marad. A gomb-osztályok viszont a közös nyelvből jönnek.
 */

/**
 * Az igénylő űrlap horgonya elé írt magyarázat. Tegező.
 *
 * MIÉRT NEM SOROLJA FEL A MEZŐKET (vezetői javítás, 2026-08-17): a korábbi
 * szöveg azt írta, hogy „a neved és az e-mail-címed kell hozzá" — az űrlapnak
 * viszont HÁROM kötelező eleme van: név, e-mail-cím ÉS az adatkezelési
 * jelölőnégyzet (`FreeCourseRequestForm`, mindhárom `required`, a
 * jelölőnégyzet címkéje maga is „(kötelező)"-t ír ki). A kettőt említő mondat
 * tehát ALULMONDTA a tényleges ráfordítást, ami az NN/g szerint pont az a
 * ráfordítás-ígéret, amit a felület nem tarthat be. A felsorolás helyett a
 * mondat most azt mondja, ami minden mezőre igaz és ellenőrizhető: rövid, és
 * fizetni nem kell. A pontos mezőlistát az űrlap maga mutatja meg.
 */
export const FREE_COURSE_FORM_LINK_TEXT =
  'Az igénylő űrlap a lap tetején van. Rövid, és fizetned nem kell érte.'

export interface FreeCourseFormLinkProps {
  /** Az igénylő űrlap horgonya a lapon (a vásárlódoboz CTA-blokkjának id-je). */
  formId: string
}

export function FreeCourseFormLink({ formId }: FreeCourseFormLinkProps) {
  return (
    <div className="kc-course-recall">
      <p className="kc-course-recall__text">{FREE_COURSE_FORM_LINK_TEXT}</p>
      <a className="kc-button kc-button--secondary kc-course-recall__cta" href={`#${formId}`}>
        {ctaLabel('free-course-request-link')}
      </a>
    </div>
  )
}
