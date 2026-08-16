import { getPayload } from 'payload'

import { logger } from '../logger'

import {
  EMPTY_APPOINTMENT_CONTEXT,
  layoutHasAppointmentBlock,
  type AppointmentSectionContext,
} from './context'
import { findAppointmentFormId } from './form'

/**
 * Az időpontkérő szekció szerver-oldali környezetének betöltése egy lap
 * szekciósorához.
 *
 * Lekérdezés-takarékosság: ha a lapon NINCS időpontkérő szekció, egyetlen kör
 * sem fut — az alapállapot megy vissza. Ugyanaz az elv, mint a `[slug]`
 * route-ban a termék-/poszt-/vélemény-lekérdezéseknél.
 *
 * Hibatűrő: a `findAppointmentFormId` sosem dob (warn-loggal `null`-t ad), így
 * egy hiányzó űrlap nem viszi el a lapot. A Turnstile site key szerver-oldalon
 * olvasott (nem `NEXT_PUBLIC_`), ugyanúgy, mint a /kapcsolat oldalon.
 *
 * A `payload.config` DINAMIKUSAN töltődik be, csak a tényleges lekérdezés
 * ágán. Statikus importtal minden lap (és minden ezt behúzó teszt) magával
 * vonná a teljes Payload-konfigurációt akkor is, ha a lapon nincs időpontkérő
 * szekció — ez fölösleges betöltési idő, cserébe semmiért.
 */
export async function getAppointmentSectionContext(
  layout: ReadonlyArray<{ blockType?: string | null }> | null | undefined,
): Promise<AppointmentSectionContext> {
  if (!layoutHasAppointmentBlock(layout)) {
    return EMPTY_APPOINTMENT_CONTEXT
  }
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? null
  try {
    const { default: config } = await import('../../payload.config')
    const payload = await getPayload({ config })
    return { formId: await findAppointmentFormId(payload), turnstileSiteKey }
  } catch (error) {
    logger.warn('az időpontkérő szekció környezete nem tölthető be — az űrlap letiltva renderel', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { formId: null, turnstileSiteKey }
  }
}
