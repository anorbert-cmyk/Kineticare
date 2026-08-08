import type { Block } from 'payload'

import { linkGroup } from './link-fields'
import { sectionSettings } from './section-settings'

/**
 * Ingyenes SOS-sáv — az ingyenes villámkurzus ajánlása (terv 2. blokk-katalógus, M4).
 *
 * Az értékesítési audit szerint az ingyenes anyag a tölcsér TETEJE, nem a
 * csúcsa: a fizetős kurzusok UTÁN, visszafogottabb súllyal jelenik meg, hogy ne
 * vigye el a figyelmet a vásárlástól.
 */
export const freeSos: Block = {
  slug: 'freeSos',
  interfaceName: 'BlockFreeSos',
  labels: {
    singular: 'Ingyenes SOS-sáv',
    plural: 'Ingyenes SOS-sávok',
  },
  admin: {
    group: 'Kezdőlap (ajánlott sorrendben)',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Cím',
      admin: {
        description: 'A sáv címe (pl. „SOS KézRelax villámkurzus").',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Szöveg',
      admin: {
        description: 'Pár mondat arról, mit kap a látogató az ingyenes anyagban.',
      },
    },
    linkGroup({
      name: 'cta',
      label: 'Gomb',
      description: 'A sáv gombja — ez visz az ingyenes kurzushoz.',
    }),
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Háttérkép',
      admin: {
        description:
          'Nem kötelező. Halvány, nem zavaró kép a sáv mögé — a szöveg olvashatósága a fontosabb.',
      },
    },
    sectionSettings({ defaultBackground: 'tint' }),
  ],
}
