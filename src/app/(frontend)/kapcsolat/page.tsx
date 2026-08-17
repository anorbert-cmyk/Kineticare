import type { Metadata } from 'next'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getAppointmentSectionContext } from '@/lib/appointment/section'
import { getPageBySlug } from '@/lib/cms'
import './kapcsolat.css'

export const metadata: Metadata = {
  title: 'Kapcsolat',
  description:
    'Kérj időpontot rendelői kezelésre üzenetben, vagy hívd közvetlenül a gyógytornászainkat. Rendelőink címe és elérhetőségei egy helyen.',
  openGraph: {
    title: 'Kapcsolat',
    description:
      'Kérj időpontot rendelői kezelésre üzenetben, vagy hívd közvetlenül a gyógytornászainkat. Rendelőink címe és elérhetőségei egy helyen.',
  },
}

/**
 * A /kapcsolat lap SZERKESZTHETŐ szekciósorának forrása.
 *
 * MIÉRT KELL: a /kapcsolat dedikált route (nem CMS-oldal), tehát a szekció-
 * rendszer eddig nem ért el ide — a szerkesztő semmit nem tudott a lapra tenni.
 * Az időpontkérő szekció viszont pont ide való, ezért a route beolvassa az
 * ilyen slugú CMS-oldal szekciósorát, és a `RenderBlocks`-szal rendereli.
 * A `[slug]` route-tal NEM ütközik: a konkrét útvonal mindig előbbre való a
 * dinamikusnál, tehát az oldal saját CMS-nézete sosem jelenik meg helyette.
 *
 * Ha nincs ilyen oldal (vagy üres a szekciósora), a lap PONTOSAN a mai
 * viselkedést hozza: cím, bevezető, üzenetküldő űrlap.
 */
const CONTACT_PAGE_SLUG = 'kapcsolat'

/**
 * /kapcsolat — a lap HÁROM, egymástól világosan elváló utat kínál, a
 * leggyorsabbtól a legáltalánosabbig:
 *
 *  1. IDŐPONTKÉRÉS rendelői kezelésre (szerkeszthető szekció a CMS-ből). Ez az
 *     üzleti cél-sorrendben előrébb áll (bevételt hozó szolgáltatás), ezért a
 *     lap tetején, a cím alatt kap helyet. A bal hasábja kiírja a rendelők
 *     címét, mindkét telefonszámot és az e-mail-címet, mobilon az űrlap FÖLÖTT
 *     — az NN/g kapcsolat-oldal irányelve szerint az űrlap csak a telefonszám
 *     MELLETT állhat, nem helyette
 *     (https://www.nngroup.com/articles/contact-us-pages/).
 *  2. SZAKEMBER-ELÉRHETŐSÉG (szintén CMS-szekció, 2026-08-16 óta): a két
 *     gyógytornász arca, titulusa, rövid bemutatkozása és kattintható
 *     telefonszáma. Az 1. pont telefonlistája két nevet ad; ez a szekció mondja
 *     meg, melyik szám kihez tartozik és ki mivel foglalkozik.
 *
 * AZ ÁLTALÁNOS ÜZENETKÜLDŐ ŰRLAP 2026-08-17 ÓTA NINCS ITT. A tulajdonos
 * döntése: a /kapcsolat lapon időpontot kell tudni kérni, az általános „Írj
 * nekünk üzenetet" doboz viszont fölösleges volt mellette. A GOV.UK „question
 * pages" elve szerint egy képernyőn egy feladat legyen a fókusz
 * (https://design-system.service.gov.uk/patterns/question-pages/) — két
 * párhuzamos, hasonló kinézetű űrlap éppen ezt rontotta el: a látogatónak
 * kellett kitalálnia, melyikbe írjon. A form-builder „Kapcsolat" űrlapja
 * MEGMARAD a rendszerben (az onInit gondoskodik róla), csak ezen a lapon nem
 * renderel — bármikor visszatehető.
 *
 * A sávritmus: a lapfej fehér, az időpontkérő szekció alapból világoskék, a
 * szakember-szekció fehér.
 */
export default async function KapcsolatPage() {
  const page = await getPageBySlug(CONTACT_PAGE_SLUG)
  const layout = page?.layout ?? []
  const appointment = await getAppointmentSectionContext(layout)

  return (
    <>
      {/*
       * A LAPFEJ UGYANABBAN A SZÉLES KONTÉNERBEN ÁLL, mint alatta minden más.
       *
       * Korábban `size="narrow"` (720 px) volt, miközben a lap összes szekciója
       * a széles (1120 px) konténert használja. Mérve (Chromium, az éles
       * markupon és CSS-en) a cím bal széle ennyivel csúszott el a tartalomtól:
       *   390 px:   0 px (mindkét konténer keskenyebb a képernyőnél)
       *   768 px:  24 px
       *  1280 px: 200 px
       *  1440 px: 200 px
       * Vagyis a hiba mobilon nem látszik, asztalon viszont a cím látványosan
       * beljebb kezdődött, mint az alatta lévő szekciók.
       *
       * MIÉRT SZÁMÍT. NN/g, „Why Does a Design Look Good?": „A column grid
       * provides vertical anchoring lines to which objects are aligned", és
       * „A design will look unprofessional and lack polish when visual elements
       * are used inconsistently or sporadically."
       * https://www.nngroup.com/articles/why-does-design-look-good/
       * A GOV.UK Design System ugyanezt szerkezetben mondja ki: a lap tartalmát
       * EGY szélesség-konténer fogja össze (`govuk-width-container`), a
       * hasábok ezen BELÜL szűkítenek.
       * https://design-system.service.gov.uk/styles/layout/
       *
       * A keskeny konténer sorhossz-korlátozásra való — itt viszont nincs
       * folyószöveg, csak egy cím, tehát semmit nem nyertünk vele, a rácsból
       * viszont kiesett. A `/kurzusok` lapfeje eleve a széles konténert
       * használja; ez a változás ahhoz igazít.
       */}
      <Section>
        <Container>
          <h1>Kapcsolat</h1>
        </Container>
      </Section>

      {layout.length > 0 ? (
        <RenderBlocks
          appointment={appointment}
          layout={layout}
          posts={[]}
          products={[]}
          testimonials={[]}
        />
      ) : null}

    </>
  )
}
