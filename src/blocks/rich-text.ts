import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * Szabad szöveg — Lexical szerkesztős szekció (terv 2. blokk-katalógus).
 *
 * Az a blokk, amivel bármi elmondható, amire nincs saját szekció-típus: hosszabb
 * magyarázat, tájékoztató, akciós közlemény. A felső eszköztárral formázható,
 * listázható, linkelhető.
 */
export const richText: Block = {
  slug: 'richText',
  interfaceName: 'BlockRichText',
  labels: {
    singular: 'Szabad szöveg',
    plural: 'Szabad szöveg szekciók',
  },
  admin: {
    group: 'Bárhol használható',
  },
  fields: [
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Tartalom',
      admin: {
        description:
          'Szabadon szerkeszthető szöveg. A felső eszköztárral formázhatsz, listát és linket szúrhatsz be.',
      },
    },
    sectionSettings(),
  ],
}
