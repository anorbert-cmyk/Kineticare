import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * Kurzuskártyák — a fizetős kurzusok kiemelése (terv 2. blokk-katalógus, M3).
 *
 * ADATVEZÉRELT blokk: a kártyák tartalmát NEM itt írod. A kurzusok igazságforrása
 * a Webshop → Kurzusok: amit ott létrehozol és közzéteszel, az automatikusan
 * megjelenik ebben a szekcióban (ár, borító, rövid leírás, kiemelt előnyök
 * onnan jönnek). Így a kezdőlap sosem tud „elszakadni" a valós kínálattól
 * (terv 2. pont zárása).
 *
 * Ezért itt CSAK megjelenítési mezők vannak: a szekció feliratai és a kártyák
 * gombfelirata. A tulajdonosi kikötés (2026-08-15) szerint a kártyán és a
 * szekcióban MINDEN szöveg adminból szerkeszthető — a kódban maradó szövegek
 * kizárólag fallbackek. Ha nincs közzétett fizetős kurzus, a szekció elmarad.
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
      name: 'eyebrow',
      type: 'text',
      label: 'Felvezető sor',
      admin: {
        description:
          'A cím fölötti rövid, nagybetűs felirat. Nem kötelező — üresen a beépített felirat marad („Kurzusok").',
      },
    },
    {
      name: 'heading',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description: 'Nem kötelező. Ha üresen hagyod, a beépített cím marad („Kurzusaink").',
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
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'Gombfelirat a kártyákon',
      admin: {
        description:
          'A kurzuskártyák alján megjelenő gomb felirata. Nem kötelező — üresen a beépített felirat marad („Megnézem a programot”). A gomb dekoratív: maga a KÁRTYA a link.',
      },
    },
    sectionSettings(),
  ],
}
