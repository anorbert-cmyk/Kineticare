import { Card } from '../ui/Card'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/barion-fizetes.css'

/**
 * BarionFizetesJelzes — a fizetési szolgáltató LÁTHATÓ megjelenítése.
 *
 * ═══ MIÉRT LÉTEZIK ═══
 *
 * 1. KÖTELEZETTSÉG. A Barion elfogadóhely-jóváhagyásának előfeltétele, hogy a
 *    logósor a webshop fő- ÉS fizetési oldalán szerepeljen. Szó szerint, a
 *    Barion ügyfélszolgálati oldaláról:
 *      „A Barion által elfogadott fizetési módok logói egyértelműen
 *       tájékoztatják a vásárlóidat a lehetőségeikről, ezért előfeltétele az
 *       elfogadóhely jóváhagyásának, hogy a logósort MÓDOSÍTÁS NÉLKÜL
 *       feltüntesd a webshopod fő- és fizetési oldalán."
 *      https://www.barion.com/hu/ugyfelszolgalat/elfogadohely/elfogadohely-letrehozasa-es-kezelese/miert-kell-az-elfogadott-fizetesi-modok-logoit-feltuntetnem-a-webshop-fooldalan-es-fizetesi-oldalain/
 *    A logósor a Barion hivatalos csomagjából jön, változtatás nélkül
 *    (public/assets/barion/README.md rögzíti a letöltés forrását és
 *    ellenőrzőösszegét). Saját rajz TILOS: idegen márka logóját közelítőleg
 *    újrarajzolni védjegysértés, és a jóváhagyást is megbuktatja.
 *
 * 2. VEVŐI HASZON, MÉRT KUTATÁSSAL.
 *    - Baymard Institute, „How Users Perceive Security During the Checkout
 *      Flow": a legutóbbi Checkout Usability vizsgálatban a válaszadók 19%-a
 *      hagyott ott egy pénztárat az elmúlt 3 hónapban, mert „didn't trust the
 *      site with their credit card information" (1026 fő, átlagos amerikai
 *      felnőtt internetező, 2025). Ugyanott: „Depending on the design, users
 *      perceive some parts of a page to be more secure than other parts of the
 *      same page", és az elhelyezésről: „placing 1-2 icons within the
 *      encapsulated area performs well to help the perceived reinforcement of
 *      the sensitive fields."
 *      https://baymard.com/blog/perceived-security-of-payment-form
 *      → Ezért van a jelzés a pénztárban a fizetőgomb KÖZVETLEN közelében,
 *        saját, elhatárolt kártyában, nem a lap tetején vagy a láblécben.
 *    - Nielsen Norman Group, „Trustworthiness in Web Design: 4 Credibility
 *      Factors" — Upfront Disclosure: „people appreciate when sites are upfront
 *      with all information that relates to the customer experience", és „When
 *      sites omitted basic information, they were almost immediately ruled out
 *      of consideration in favor of more upfront sites."
 *      https://www.nngroup.com/articles/trustworthy-design/
 *      → Ezért nem csak logó van itt, hanem az is le van írva, MI TÖRTÉNIK:
 *        elhagyod az oldalt, a kártyaadat a Barionhoz megy, utána visszatérsz.
 *
 * 3. A REPÓ SAJÁT SZTENDERDJE. `docs/ui-sztenderdek.md` §3.2, 2. sor: „A Barion
 *    megnevezése bizalmi elem, de nem a gombon: a szolgáltató neve és logója a
 *    gomb MELLÉ kerül (M-6 megengedi, nem kötelezi)." Ez a komponens pontosan
 *    ezt teszi: a gombfelirat érintetlen marad, a bizalmi jelzés a gomb mellé
 *    kerül. A szöveg ezért a gomb feliratát sem idézi (a felirat a §3.2
 *    szótárban `Megrendelem és fizetek`-re tart, a kódban ma még
 *    „Megrendelés és fizetés" — a jelzés egyik alaktól sem függhet).
 *
 * ═══ AKADÁLYMENTESSÉG ═══
 *  - WCAG 2.2 SC 1.1.1 (Non-text Content): a logósor INFORMATÍV (elfogadott
 *    fizetési módok), ezért beszédes `alt`-ot kap, nem üreset.
 *  - WCAG 2.2 SC 1.4.5 (Images of Text): „Logotypes (text that is part of a
 *    logo or brand name) are considered essential" — a márkajelek képként
 *    állhatnak. https://www.w3.org/TR/WCAG22/#images-of-text
 *  - WCAG 2.2 SC 1.4.11 (Non-text Contrast): „Logos are exempted from contrast
 *    requirements, under the assumption that they must comply with stricter
 *    color choices mandated by corporate identity or brand guidelines."
 *    https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
 *    A logósor nem interaktív (nem link, nem gomb), tehát az Understanding
 *    dokumentum „logos act as user interface components" fenntartása sem áll
 *    fenn. A KÖRÜLÖTTE lévő SZÖVEG viszont teljes 4.5:1-es mércével mérve van
 *    (a méréseket a styles/blocks/barion-fizetes.css fejléce sorolja).
 *  - WCAG 2.2 SC 2.5.8 (Target Size): a komponensben SZÁNDÉKOSAN nincs
 *    interaktív elem. A pénztárban a fizetés pillanatában egy kifelé mutató
 *    link elvinné a vevőt a vásárlásból (GOV.UK: egy oldal, egy elsődleges
 *    cselekvés), a kezdőlapon pedig fölösleges kilépőt nyitna. Így új
 *    érintőcél sem keletkezik, amit mérni kellene.
 *  - A `section` csak akkor kap landmark-nevet, ha van címsora, ezért a
 *    kezdőlapi változat `aria-labelledby`-jal a saját H2-jére mutat.
 *
 * ═══ IGAZMONDÁS ═══
 * Az INGYENES kurzus nem megy Barionon keresztül (a pénztár ilyenkor waiver
 * és fizetés nélkül nyitja a hozzáférést), ezért a hívó oldalon az ingyenes
 * ágon ezt a jelzést NEM szabad megjeleníteni. A CheckoutForm ezt betartja.
 */

/** A hivatalos logósor a `public/` alatt (a README rögzíti a forrást). */
export const BARION_LOGOSOR_SRC = '/assets/barion/barion-smart-banner-light.svg'

/** A csomagból származó, EREDETI rajzméret — az arány ebből jön (567 : 108). */
export const BARION_LOGOSOR_SZELESSEG = 567
export const BARION_LOGOSOR_MAGASSAG = 108

/**
 * Az `alt` a képen látható fizetési módokat sorolja fel, mert ez az információ
 * maga (WCAG 2.2 SC 1.1.1). A sorrend a logósorét követi.
 */
export const BARION_LOGOSOR_ALT =
  'Elfogadott fizetési módok: Barion, Mastercard, VISA, Apple Pay, Google Pay'

/** A címsor mindkét helyen AZONOS (WCAG 2.2 SC 3.2.4, konzisztens azonosítás). */
export const BARION_CIM = 'Biztonságos fizetés'

/** A kezdőlapi szekció címsorának azonosítója (a landmark neve). */
export const BARION_KEZDOLAP_CIM_ID = 'kc-barion-fizetes-cim'

/**
 * A kezdőlapi szöveg. Az MNB-engedélyszám a repó saját, tulajdonos által
 * jóváhagyott ÁSZF-szövegéből származik (`src/lib/legal-source/aszf.txt`),
 * hogy a vevői felület és a szerződés ne mondjon két különbözőt.
 */
export const BARION_KEZDOLAP_SZOVEG =
  'A kurzusokat bankkártyával fizeted ki, a Barion biztonságos fizetőoldalán. ' +
  'A kártyaadataidat a Kineticare nem látja és nem tárolja. ' +
  'A szolgáltatást nyújtó Barion Payment Zrt. a Magyar Nemzeti Bank felügyelete ' +
  'alatt álló intézmény, engedélyének száma: H-EN-I-1064/2013.'

/**
 * A pénztári szöveg. Azt mondja meg, MI TÖRTÉNIK a kattintás után (NN/g
 * Upfront Disclosure), és nem idézi a gomb feliratát (lásd a fejkomment 3.
 * pontját).
 */
export const BARION_PENZTAR_SZOVEG =
  'A fizetés a Barion biztonságos oldalán zajlik: a gombra kattintva odaviszünk, ' +
  'és a kártyaadataidat ott adod meg. Hozzánk nem jutnak el, és nem is tároljuk ' +
  'őket. A fizetés végén automatikusan visszatérsz a Kineticare oldalára.'

/** Hol áll a jelzés: a kezdőlap alján vagy a pénztárban, a fizetőgomb fölött. */
export type BarionJelzesHely = 'kezdolap' | 'penztar'

export interface BarionFizetesJelzesProps {
  hely: BarionJelzesHely
}

/**
 * A logósor képe. Külön függvény, hogy a két elrendezés BITRE ugyanazt a képet
 * és ugyanazt az `alt`-ot vigye — a jóváhagyás szempontjából a két oldalon
 * ugyanannak kell látszania.
 *
 * A `width`/`height` az EREDETI rajzméret: enélkül a böngésző a betöltésig nem
 * ismeri az arányt, és a kép beugrása elmozdítaná a fizetőgombot (elrendezés-
 * ugrás közvetlenül a kattintás előtt). A tényleges méretezés a CSS-é, arányosan.
 *
 * `loading="lazy"` NINCS a pénztári ágon: a kép a fizetőgomb mellett áll, tehát
 * a döntés pillanatában látszania kell.
 */
function BarionLogosor() {
  // Sima `<img>` és nem `next/image`: a hivatalos SVG-t változtatás nélkül,
  // újrakódolás nélkül kell kiszolgálni (Barion: „módosítás nélkül"), és a
  // next/image raszter-pipeline-ja SVG-re amúgy sem optimalizál. A repó más
  // helyein is ez a minta (HeroVideo poszter, CourseCard).
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a hivatalos SVG-t változtatás és újrakódolás nélkül kell kiszolgálni (Barion: „módosítás nélkül"), a next/image raszter-pipeline-ja SVG-re amúgy sem optimalizál
    <img
      alt={BARION_LOGOSOR_ALT}
      className="kc-barion__logosor"
      height={BARION_LOGOSOR_MAGASSAG}
      src={BARION_LOGOSOR_SRC}
      width={BARION_LOGOSOR_SZELESSEG}
    />
  )
}

export function BarionFizetesJelzes({ hely }: BarionFizetesJelzesProps) {
  if (hely === 'penztar') {
    // A pénztárban a jelzés a form KÁRTYA-nyelvét viszi (mint a számlázási és
    // az elállási blokk), és közvetlenül a fizetőgomb fölött áll — Baymard:
    // „placing 1-2 icons within the encapsulated area".
    // A címsor OSZTÁLY NÉLKÜLI h2: a `.kc-card > h2:not([class])` közös szabály
    // (styles/ui.css) adja neki a kártyacím-tipográfiát, ugyanazt, amit a
    // „Számlázási adatok" és az „Elállási jog" kap.
    return (
      <Card className="kc-barion kc-barion--penztar">
        <h2>{BARION_CIM}</h2>
        <BarionLogosor />
        <p className="kc-barion__szoveg">{BARION_PENZTAR_SZOVEG}</p>
      </Card>
    )
  }

  // Kezdőlap: halk bizalmi csík a lábléc fölött, a hitel-csík (CredentialsStrip)
  // bevált nyelvén — `flush` szekció felső hajszálvonallal. Azért `flush` és nem
  // sáv-háttér, mert a kezdőlap utolsó szekciója mindkét ágon (rögzített M1–M8
  // és CMS-szekciósor) más-más lehet: egy fix tint-háttér ott két tint sávot
  // olvasztana egybe. A hajszálvonal bármelyik előzmény után elhatárol.
  // A címsor az `.kc-eyebrow` felvezető-nyelvét viszi: a szintet nem méret,
  // hanem verzál + betűköz + akcent-szín jelöli (tokens.css három-méretes
  // skála). A verzál CSS-transzformáció, a DOM-szöveg mondatkezdő nagybetűs
  // marad (docs/ui-sztenderdek.md M-4).
  return (
    <Section
      aria-labelledby={BARION_KEZDOLAP_CIM_ID}
      className="kc-barion kc-barion--kezdolap"
      flush
    >
      <Container>
        <div className="kc-barion__inner">
          <h2 className="kc-eyebrow kc-barion__cim" id={BARION_KEZDOLAP_CIM_ID}>
            {BARION_CIM}
          </h2>
          <BarionLogosor />
          <p className="kc-barion__szoveg">{BARION_KEZDOLAP_SZOVEG}</p>
        </div>
      </Container>
    </Section>
  )
}
