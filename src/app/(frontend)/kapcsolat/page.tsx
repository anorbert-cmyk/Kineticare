import type { Metadata } from 'next'
import { getPayload } from 'payload'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getAppointmentSectionContext } from '@/lib/appointment/section'
import { getPageBySlug } from '@/lib/cms'
import { logger } from '@/lib/logger'
import config from '@/payload.config'

import { ContactForm } from './_components/ContactForm'

import './kapcsolat.css'

export const metadata: Metadata = {
  title: 'Kapcsolat',
  description:
    'Vedd fel velünk a kapcsolatot: kérj időpontot rendelői kezelésre, vagy írj üzenetet a Kineticare csapatának.',
  openGraph: {
    title: 'Kapcsolat',
    description:
      'Vedd fel velünk a kapcsolatot: kérj időpontot rendelői kezelésre, vagy írj üzenetet a Kineticare csapatának.',
  },
}

const CONTACT_FORM_TITLE = 'Kapcsolat'

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
 * A T-016 „Kapcsolat" form-builder űrlap azonosítójának lekérdezése (a
 * beküldés a plugin POST /api/form-submissions végpontjára megy, a form id
 * kell hozzá). Hibatűrő: ha a lekérdezés elhasal (pl. nincs DB), az űrlap
 * letiltott állapotban, magyar magyarázattal renderel — a /kapcsolat oldal
 * ettől még kiszolgálható.
 */
async function getContactFormId(): Promise<string | null> {
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      // A forms collection a form-builder pluginből jön — a payload-types a
      // konsolidációs loop végéig még nem tartalmazza, ezért a slug itt
      // castolt (ugyanaz a minta, mint a payload.config.ts ensureContactForm
      // függvényében).
      collection: 'forms' as 'pages',
      where: { title: { equals: CONTACT_FORM_TITLE } },
      limit: 1,
      overrideAccess: true,
    })
    const doc = docs[0]
    if (!doc) {
      logger.warn('a „Kapcsolat" űrlap nem található — a kapcsolat-űrlap letiltva renderel')
      return null
    }
    return String(doc.id)
  } catch (error) {
    logger.warn('kapcsolat-űrlap lekérdezése sikertelen — letiltott űrlappal renderelünk', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * /kapcsolat — a lap két, egymástól világosan elváló feladatot kínál:
 *
 *  1. IDŐPONTKÉRÉS rendelői kezelésre (szerkeszthető szekció a CMS-ből). Ez az
 *     üzleti cél-sorrendben előrébb áll (bevételt hozó szolgáltatás), ezért a
 *     lap tetején, a cím alatt kap helyet.
 *  2. ÁLTALÁNOS ÜZENET a csapatnak (a meglévő T-016 űrlap), saját címsorral.
 *
 * A GOV.UK „question pages" elve szerint egy képernyőn egy feladat legyen a
 * fókusz (https://design-system.service.gov.uk/patterns/question-pages/); két
 * űrlapnál ez úgy tartható, hogy MINDKETTŐ saját, megnevezett szekcióban áll,
 * és a címsorból azonnal látszik, melyik mire való. Az üzenetküldő űrlap
 * bevezetője ezért a saját szekciójába költözött (korábban a lap-bevezető
 * volt): az így nem ígér mást, mint amit az alatta lévő űrlap tud.
 *
 * A sávritmus: a lapfej fehér, az időpontkérő szekció alapból világoskék, az
 * üzenetküldő rész újra fehér — a szomszédos szekciók így elválnak egymástól.
 */
export default async function KapcsolatPage() {
  const [formId, page] = await Promise.all([
    getContactFormId(),
    getPageBySlug(CONTACT_PAGE_SLUG),
  ])
  const layout = page?.layout ?? []
  // A site key szerver-oldalon olvasott (nem NEXT_PUBLIC): a widget csak akkor
  // jelenik meg, ha be van állítva — kulcs nélkül rejtve marad (T-016).
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? null
  const appointment = await getAppointmentSectionContext(layout)

  return (
    <>
      <Section>
        <Container size="narrow">
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

      <Section aria-labelledby="kc-contact-message-title">
        <Container size="narrow">
          <h2 id="kc-contact-message-title">Írj nekünk üzenetet</h2>
          <p className="kc-contact-intro">
            Kérdésed van a kurzusainkkal, a rendeléseddel vagy a rehabilitációs programmal
            kapcsolatban? Írd meg, és munkatársunk hamarosan válaszol a megadott e-mail-címre.
          </p>
          <ContactForm formId={formId} turnstileSiteKey={turnstileSiteKey} />
        </Container>
      </Section>
    </>
  )
}
