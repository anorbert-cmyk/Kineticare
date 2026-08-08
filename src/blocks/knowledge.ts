import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * Tudástár-ajánló — a legfrissebb blogbejegyzések (terv 2. blokk-katalógus, M7).
 *
 * ADATVEZÉRELT blokk: a bejegyzéseket a Tartalom → Bejegyzések alatt írod, ide
 * a legfrissebb KÖZZÉTETT bejegyzések kerülnek ki automatikusan. Itt csak a
 * szekció felirata és a megjelenő darabszám állítható.
 */
export const knowledge: Block = {
  slug: 'knowledge',
  interfaceName: 'BlockKnowledge',
  labels: {
    singular: 'Tudástár-ajánló (automatikus)',
    plural: 'Tudástár-szekciók',
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
          'Nem kötelező. Ha üresen hagyod, a beépített cím marad („Legfrissebb a tudástárból").',
      },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 6,
      label: 'Hány bejegyzés jelenjen meg',
      admin: {
        description: '1 és 6 közötti szám. A kezdőlapon 3 a szokásos.',
        step: 1,
      },
    },
    sectionSettings(),
  ],
}
