import type { Block } from 'payload'

import { linkFields } from './link-fields'
import { sectionSettings } from './section-settings'

/**
 * Szolgáltatás-sorok — „Így tudunk segíteni" (terv 2. blokk-katalógus).
 *
 * Bal oldalon egy kép, jobb oldalon 1–5 számozott sor: rendelői kezelések,
 * otthoni program, szakmai képzések. Soronként saját link (belső vagy külső).
 */
export const services: Block = {
  slug: 'services',
  interfaceName: 'BlockServices',
  labels: {
    singular: 'Szolgáltatás-sorok',
    plural: 'Szolgáltatás-szekciók',
  },
  admin: {
    group: 'Kezdőlap (ajánlott sorrendben)',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Kis felső felirat',
      admin: {
        description: 'A cím fölötti apró szöveg (pl. „Szolgáltatásaink"). Nem kötelező.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description: 'A szekció nagybetűs címe (pl. „Így tudunk segíteni").',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Kép',
      admin: {
        description:
          'A sorok mellé kerülő kép (pl. terapeuta keze munka közben). Nem kötelező — kép nélkül a sorok teljes szélességben állnak.',
      },
    },
    {
      name: 'rows',
      type: 'array',
      label: 'Sorok',
      minRows: 1,
      maxRows: 5,
      labels: { singular: 'Sor', plural: 'Sorok' },
      admin: {
        description: 'Egy sor = egy szolgáltatás. Legfeljebb 5.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'number',
          type: 'text',
          label: 'Sorszám',
          admin: {
            description: 'Nem kötelező. Pl. „01". Ha üresen hagyod, a rendszer maga számoz.',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Cím',
          admin: { description: 'A szolgáltatás neve (pl. „Rendelői kezelések").' },
        },
        {
          name: 'body',
          type: 'textarea',
          required: true,
          label: 'Szöveg',
          admin: { description: '2–4 mondat arról, kinek és miben segít.' },
        },
        // A MEZŐSÚGÓ MAGA TANÍTOTTA A TILTOTT ALAKOT (2026-08-18-i javítás).
        // A korábbi példa szó szerint „Tovább a kezelésekre" volt — vagyis a
        // szerkesztő pontosan azt a puszta „Tovább…" kezdést kapta mintául,
        // amit a `docs/ui-sztenderdek.md` §3.1.4 M-7 tilt. A súgó ezért most
        // az igével kezdődő, célt megnevező alakot mutatja:
        // GOV.UK, Add links — „If your link takes the user to a page where they
        // can start a task, start your link with a verb", és „make it
        // descriptive and avoid generic text like 'click here' or 'more'".
        // https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/add-links/
        ...linkFields({
          labelDescription:
            'A sor végi hivatkozás szövege. Igével kezdd, és nevezd meg a célt (pl. „Nézd meg a kezeléseket"). A puszta „Tovább…" nem mondja meg, mi történik, ezért nem használható.',
        }),
      ],
    },
    sectionSettings(),
  ],
}
