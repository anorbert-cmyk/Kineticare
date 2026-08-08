import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * GYIK — gyakori kérdések (terv 2. blokk-katalógus, M8).
 *
 * A vásárlás előtti ellenérvek kezelése a lap alján. A Google felé menő
 * strukturált adat (FAQPage JSON-LD) UGYANEBBŐL a listából készül (terv 5.
 * pont), ezért:
 *  - a kérdés és a válasz SIMA SZÖVEG (nincs formázás, nincs link-beszúrás),
 *  - a látható szöveg és a strukturált adat így sosem tud szétcsúszni.
 *
 * Tartalmi óvatosság: műtét utáni helyzetben mindig a kezelőorvos/gyógytornász
 * jóváhagyása az irányadó — gyógyulási ígéretet a válaszok ne tegyenek.
 */
export const faq: Block = {
  slug: 'faq',
  interfaceName: 'BlockFaq',
  labels: {
    singular: 'GYIK (gyakori kérdések)',
    plural: 'GYIK szekciók',
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
        description: 'A kérdések fölötti cím (pl. „Gyakori kérdések").',
      },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Kérdés–válasz párok',
      minRows: 1,
      maxRows: 20,
      labels: { singular: 'Kérdés', plural: 'Kérdések' },
      admin: {
        description:
          'A látogatók tényleges kérdései, a válasszal együtt. Ezekből készül a Google-nek szóló strukturált adat is, ezért ide csak sima szöveg kerüljön — formázás és link nélkül.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          label: 'Kérdés',
          admin: {
            description:
              'Úgy fogalmazd, ahogy a látogató kérdezné (pl. „Műtét után is végezhetem a gyakorlatokat?").',
          },
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          label: 'Válasz',
          admin: {
            description:
              'Rövid, egyértelmű válasz 2–4 mondatban. Gyógyulást ne ígérj; műtét utáni kérdésnél utalj a kezelőorvos jóváhagyására.',
          },
        },
      ],
    },
    sectionSettings(),
  ],
}
