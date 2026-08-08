import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * Kurzuskártyák — a fizetős kurzusok kiemelése (terv 2. blokk-katalógus, M3).
 *
 * ADATVEZÉRELT blokk: a kártyák tartalmát NEM itt írod. A kurzusok igazságforrása
 * a Webshop → Kurzusok: amit ott létrehozol és közzéteszel, az automatikusan
 * megjelenik ebben a szekcióban (ár, borító, rövid leírás onnan jön). Így a
 * kezdőlap sosem tud „elszakadni" a valós kínálattól (terv 2. pont zárása).
 *
 * Ezért itt CSAK megjelenítési mezők vannak: a szekció felirata és bevezetője.
 * Ha nincs közzétett fizetős kurzus, a szekció egyszerűen elmarad.
 */
export const courseCards: Block = {
  slug: 'courseCards',
  interfaceName: 'BlockCourseCards',
  labels: {
    singular: 'Kurzuskártyák (automatikus)',
    plural: 'Kurzuskártya-szekciók',
  },
  admin: {
    group: 'Kezdőlap (ajánlott sorrendben)',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description:
          'Nem kötelező. Ha üresen hagyod, a beépített cím marad („Így tudunk neked segíteni").',
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      label: 'Bevezető szöveg',
      admin: {
        description: 'A cím alatti 1–2 mondat a kártyák előtt. Nem kötelező.',
      },
    },
    sectionSettings(),
  ],
}
