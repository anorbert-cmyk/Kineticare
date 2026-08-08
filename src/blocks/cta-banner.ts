import type { Block } from 'payload'

import { linkGroup } from './link-fields'
import { sectionSettings } from './section-settings'

/**
 * CTA-sáv — figyelemfelhívó sáv egyetlen gombbal (terv 2. blokk-katalógus).
 *
 * Bárhová beszúrható „lezárás": egy mondat és egy gomb. Óvatosan használd —
 * több CTA-sáv egy oldalon gyengíti egymást (értékesítési UX-skill: egy oldalon
 * EGY elsődleges cselekvés legyen hangsúlyos).
 */
export const ctaBanner: Block = {
  slug: 'ctaBanner',
  interfaceName: 'BlockCtaBanner',
  labels: {
    singular: 'CTA-sáv (gombos kiemelés)',
    plural: 'CTA-sávok',
  },
  admin: {
    group: 'Bárhol használható',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Cím',
      admin: {
        description: 'Egy rövid, cselekvésre hívó mondat.',
      },
    },
    {
      name: 'text',
      type: 'textarea',
      label: 'Szöveg',
      admin: {
        description: 'Nem kötelező. Egy-két mondat a cím alá.',
      },
    },
    linkGroup({
      name: 'cta',
      label: 'Gomb',
      description: 'A sáv gombja. Felirat és cím nélkül a sáv gomb nélkül jelenik meg.',
    }),
    sectionSettings({ defaultBackground: 'tint' }),
  ],
}
