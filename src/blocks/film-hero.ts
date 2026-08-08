import type { Block } from 'payload'

import { linkFields } from './link-fields'
import { sectionSettings } from './section-settings'

/**
 * Film-hero (kéznyitás) — a kezdőlap nyitó szekciója (terv 2. blokk-katalógus, M1).
 *
 * A görgetéssel vezérelt kéznyitás-film (ScrollScrub) fölé kerülő szöveg. A
 * filmet MAGÁT nem itt lehet cserélni: a videó- és poszter-fájlok statikus
 * assetek (terv 3.3), cseréjük fejlesztői feladat. Itt a cím, a bevezető, a
 * címkék és a gombok szerkeszthetők.
 *
 * Háttér-választó szándékosan NINCS rajta: a szekció teljes szélességű filmsáv,
 * saját vizuális kezeléssel.
 */
export const filmHero: Block = {
  slug: 'filmHero',
  interfaceName: 'BlockFilmHero',
  labels: {
    singular: 'Film-hero (kéznyitás)',
    plural: 'Film-hero szekciók',
  },
  admin: {
    group: 'Kezdőlap (ajánlott sorrendben)',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Fő cím',
      admin: {
        description:
          'A lap legfontosabb mondata, ez a legnagyobb betűs szöveg az oldal tetején. Egy tömör állítás működik a legjobban.',
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      label: 'Bevezető szöveg',
      admin: {
        description: 'A cím alatti 1–3 mondat: kinek és miben segít a Kineticare.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Címkék',
      maxRows: 6,
      labels: { singular: 'Címke', plural: 'Címkék' },
      admin: {
        description:
          'Rövid szavak a hero alatt, amik megmutatják, mivel foglalkozunk (pl. Kéz, Csukló, Könyök, Váll). Nem kötelező.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Címke szövege',
          admin: { description: 'Egy-két szó, pl. „Csukló".' },
        },
      ],
    },
    {
      name: 'ctas',
      type: 'array',
      label: 'Gombok',
      maxRows: 2,
      labels: { singular: 'Gomb', plural: 'Gombok' },
      admin: {
        description:
          'Legfeljebb 2 gomb. Az ELSŐ a hangsúlyos (ez vigyen a kurzusokhoz), a második visszafogottabb. Ha üresen hagyod, nem jelenik meg gomb.',
        initCollapsed: true,
      },
      fields: linkFields({ labelRequired: true, urlRequired: true }),
    },
    sectionSettings({ background: false }),
  ],
}
