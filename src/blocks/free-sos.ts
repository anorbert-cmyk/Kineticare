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
      description:
        'A sáv gombja. A „Hová vigyen" mezőt hagyd üresen: a gomb magától az ingyenes kurzus oldalára visz, és ha éppen nincs ingyenes kurzus, a kurzuslistára, a listához illő felirattal. Csak akkor írj be címet, ha egy MÁSIK kurzus oldalára akarod vinni (pl. /kurzusok/sos-kezrelax-villamkurzus); a puszta /kurzusok cím nem érvényesül, mert azon a listán nem indul el az ingyenes kurzus.',
      urlDescription:
        'Hagyd üresen: a rendszer az ingyenes kurzus oldalára visz. Ha másik kurzusra akarod vinni, annak a kurzusnak a címét írd be (pl. /kurzusok/sos-kezrelax-villamkurzus).',
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
