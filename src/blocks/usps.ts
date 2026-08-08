import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * „Erre számíthatsz" kártyák (terv 2. blokk-katalógus).
 *
 * 1–4 számozott kártya, kártyánként egy állítással és két bekezdéssel: mit ígér
 * a Kineticare, és miért igaz ez. A kártyák sorszámozását a megjelenítés adja —
 * itt csak a szövegek sorrendje számít.
 */
export const usps: Block = {
  slug: 'usps',
  interfaceName: 'BlockUsps',
  labels: {
    singular: '„Erre számíthatsz" kártyák',
    plural: '„Erre számíthatsz" szekciók',
  },
  admin: {
    group: 'Kezdőlap (ajánlott sorrendben)',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description: 'A kártyák fölötti cím (pl. „Erre számíthatsz velünk").',
      },
    },
    {
      name: 'cards',
      type: 'array',
      label: 'Kártyák',
      minRows: 1,
      maxRows: 4,
      labels: { singular: 'Kártya', plural: 'Kártyák' },
      admin: {
        description: 'Legfeljebb 4 kártya. Sorrendjük fogd-és-vidd módszerrel átrendezhető.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Kártya címe',
          admin: { description: 'Egy tömör állítás, nem szlogen.' },
        },
        {
          name: 'body',
          type: 'textarea',
          required: true,
          label: 'Első bekezdés',
          admin: { description: 'Mit jelent ez a gyakorlatban.' },
        },
        {
          name: 'extra',
          type: 'textarea',
          label: 'Második bekezdés',
          admin: { description: 'Nem kötelező — a részletek, példák helye.' },
        },
      ],
    },
    sectionSettings(),
  ],
}
