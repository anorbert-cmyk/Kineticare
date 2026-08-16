import type { Payload } from 'payload'

import { logger } from '../logger'

import { APPOINTMENT_CONSENT_LABEL } from './consent-text'
import {
  APPOINTMENT_AVAILABILITY_FIELD,
  APPOINTMENT_CONSENT_FIELD,
  APPOINTMENT_EMAIL_FIELD,
  APPOINTMENT_NAME_FIELD,
  APPOINTMENT_PHONE_FIELD,
  APPOINTMENT_REASON_FIELD,
} from './validation'

/**
 * Az „Időpontkérés" form-builder űrlap — ADAT, nem séma.
 *
 * A @payloadcms/plugin-form-builder űrlapjai a `forms` collection SORAI: az új
 * űrlap tehát adatbázis-TARTALOM, nincs hozzá séma-változás és nincs migráció
 * (CLAUDE.md 3. tilos zóna). Ugyanaz a minta, mint a „Kapcsolat"
 * (`ensureContactForm`) és a „Hírlevél" (`ensureNewsletterForm`) űrlapé.
 *
 * A mezőket a szerkesztő az adminban átszabhatja; a beküldést viszont a
 * frontend-kliens állítja össze (`src/lib/appointment/submit.ts`), ezért a
 * MEZŐNEVEK a szerződés része — átnevezésük a kliens- és a szerver-validációt
 * is érinti (`src/lib/appointment/validation.ts`).
 *
 * A `forms` collection a pluginből jön, és a `src/payload-types.ts` nem
 * tartalmazza, ezért a slug itt is castolt — ugyanaz a dokumentált minta, mint
 * a másik két űrlapnál.
 */

export const APPOINTMENT_FORM_TITLE = 'Időpontkérés'

const APPOINTMENT_CONFIRMATION =
  'Köszönjük, megkaptuk az időpontkérésed. Két munkanapon belül telefonon keresünk, és egyeztetjük a pontos időpontot.'

/**
 * Egybekezdéses Lexical-törzs a visszaigazoló üzenethez. Szándékosan HELYI
 * (a hírlevél-modul ugyanezt teszi): ezt a modult szerver-komponens és seed is
 * importálja, oda a home-seed `node:fs`-es függősége feleslegesen kerülne be.
 */
function confirmationRichText(text: string): Record<string, unknown> {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: 'ltr',
          format: '',
          indent: 0,
          children: [
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
            },
          ],
        },
      ],
    },
  }
}

export function appointmentFormData(): Record<string, unknown> {
  return {
    title: APPOINTMENT_FORM_TITLE,
    submitButtonLabel: 'Időpontot kérek',
    confirmationType: 'message',
    confirmationMessage: confirmationRichText(APPOINTMENT_CONFIRMATION),
    fields: [
      { blockType: 'text', name: APPOINTMENT_NAME_FIELD, label: 'Név', required: true },
      { blockType: 'text', name: APPOINTMENT_PHONE_FIELD, label: 'Telefonszám', required: true },
      // A többi mező NEM kötelező: a GOV.UK „only ask for what you need"
      // szabálya és a GDPR adattakarékosság (5. cikk (1) c)) szerint az
      // egészségügyi adatot tartalmazó mező sosem lehet kötelező.
      { blockType: 'email', name: APPOINTMENT_EMAIL_FIELD, label: 'E-mail cím', required: false },
      {
        blockType: 'textarea',
        name: APPOINTMENT_REASON_FIELD,
        label: 'Mire kérsz időpontot?',
        required: false,
      },
      {
        blockType: 'text',
        name: APPOINTMENT_AVAILABILITY_FIELD,
        label: 'Mikor alkalmas?',
        required: false,
      },
      {
        blockType: 'checkbox',
        name: APPOINTMENT_CONSENT_FIELD,
        label: APPOINTMENT_CONSENT_LABEL,
        required: true,
      },
    ],
    // Beküldéskor a plugin NEM küld levelet: a stáb-értesítőt a saját
    // afterChange hook adja (src/payload.config.ts), így a címzettlista egyetlen
    // helyen, a CONTACT_STAFF_EMAILS env-ben él.
    emails: [],
  }
}

/**
 * Idempotens létrehozás: ha már van „Időpontkérés" című űrlap, NEM nyúlunk
 * hozzá (a szerkesztő átszabhatta a mezőket vagy a szövegeket).
 */
export async function ensureAppointmentForm(payload: Payload): Promise<void> {
  const existing = await payload.find({
    collection: 'forms' as 'pages',
    where: { title: { equals: APPOINTMENT_FORM_TITLE } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) {
    payload.logger.info('Seed: az „Időpontkérés" űrlap már létezik, kihagyva.')
    return
  }
  await payload.create({
    collection: 'forms' as 'pages',
    data: appointmentFormData() as never,
    overrideAccess: true,
  })
  payload.logger.info('Seed: „Időpontkérés" űrlap létrehozva.')
}

/**
 * Az „Időpontkérés" űrlap azonosítója a szekció űrlapjához (a beküldés a plugin
 * végpontjára megy, ahhoz kell a form id).
 *
 * Hibatűrő: ha az űrlap hiányzik (nem futott seed) vagy a lekérdezés elhasal,
 * `null`-t ad — a szekció ilyenkor a rendelő elérhetőségeit MUTATJA, csak az
 * űrlap renderel letiltva, magyar magyarázattal. A hiba nem néma: warn-log
 * készül róla (ugyanaz a minta, mint a `findNewsletterFormId`-nál).
 */
export async function findAppointmentFormId(payload: Payload): Promise<string | null> {
  try {
    const { docs } = await payload.find({
      collection: 'forms' as 'pages',
      where: { title: { equals: APPOINTMENT_FORM_TITLE } },
      limit: 1,
      overrideAccess: true,
    })
    const doc = docs[0]
    if (!doc) {
      logger.warn('az „Időpontkérés" űrlap nem található — a szekció űrlapja letiltva renderel')
      return null
    }
    return String(doc.id)
  } catch (error) {
    logger.warn('időpontkérés-űrlap lekérdezése sikertelen — a szekció űrlapja letiltva renderel', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
