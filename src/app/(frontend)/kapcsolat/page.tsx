import type { Metadata } from 'next'
import { getPayload } from 'payload'

import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { logger } from '@/lib/logger'
import config from '@/payload.config'

import { ContactForm } from './_components/ContactForm'

import './kapcsolat.css'

export const metadata: Metadata = {
  title: 'Kapcsolat',
  description:
    'Vedd fel velünk a kapcsolatot: írj üzenetet a Kineticare csapatának kérdéseddel, és hamarosan válaszolunk.',
  openGraph: {
    title: 'Kapcsolat',
    description:
      'Vedd fel velünk a kapcsolatot: írj üzenetet a Kineticare csapatának kérdéseddel, és hamarosan válaszolunk.',
  },
}

const CONTACT_FORM_TITLE = 'Kapcsolat'

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

export default async function KapcsolatPage() {
  const formId = await getContactFormId()
  // A site key szerver-oldalon olvasott (nem NEXT_PUBLIC): a widget csak akkor
  // jelenik meg, ha be van állítva — kulcs nélkül rejtve marad (T-016).
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? null

  return (
    <Section>
      <Container size="narrow">
        <h1>Kapcsolat</h1>
        <p className="kc-contact-intro">
          Kérdésed van a kurzusainkkal, a rendeléseddel vagy a rehabilitációs programmal
          kapcsolatban? Írj nekünk üzenetet — munkatársunk hamarosan válaszol.
        </p>
        <ContactForm formId={formId} turnstileSiteKey={turnstileSiteKey} />
      </Container>
    </Section>
  )
}
