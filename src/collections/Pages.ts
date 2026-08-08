import type { CollectionConfig } from 'payload'

import { pageBlocks } from '../blocks'
import { slugField } from '../fields/slug'
import {
  clearPublishedAtBeforeDuplicate,
  draftStatusBeforeDuplicate,
  forceDraftVersionOnDuplicate,
} from '../lib/duplicate'
import { buildAdminPreviewUrl } from '../lib/preview/preview-target'
import { setPublishedAtOnFirstPublish, syncStatusFromDraftStatus } from '../lib/publish-status'

/**
 * Versions × status viszony (T-012 + a laikusbarát tartalomkezelés):
 *  - `versions.drafts` a Payload natív verziózása: a `_status` mező a technikai
 *    publikálási állapot (draft/published), piszkozat-mentésekkel + autosave-vel.
 *  - A custom `status` select ugyanazokat az értékeket használja (draft/published),
 *    így a két mező közös DB-enumja ütközésmentes. A szerkesztő EZT MÁR NEM LÁTJA
 *    (`admin.hidden`): a `syncStatusFromDraftStatus` hook tartja szinkronban a
 *    `_status`-szal, hogy a Piszkozat/Közzététel gomb legyen az egyetlen kapcsoló.
 *  - A nyilvános read-politika (src/access/publishedOrAdmin.ts), a storefront
 *    lekérdezései (`PUBLISHED_WHERE`, src/lib/cms.ts) és a sitemap továbbra is a
 *    custom `status` mezőre szűrnek — a szinkron miatt ez egyenértékű a `_status`-szal.
 *  - Duplikáláskor (beépített duplicate-folyamat) a slug a slugField
 *    beforeDuplicate hookjával '<eredeti>-masodpeldany' lesz, a status/publishedAt
 *    mezőhookok draftot + üres publishedAt-et, a forceDraftVersionOnDuplicate
 *    pedig a `_status`-t is draftra állítja (lásd src/lib/duplicate.ts).
 *
 * Szekció-rendszer (docs/szekcio-rendszer-terv.md): az opcionális `layout`
 * blokk-mező az oldal szerkeszthető szekció-listája (src/blocks). Szándékosan
 * OPCIONÁLIS — layout nélkül a kezdőlap a mai kód-szintű kompozíciót
 * (HomeView) rendereli, így a bevezetés semmit nem tör el, és a layout
 * kiürítése sem hagy üres oldalt. A verziózás/autosave a layoutra is érvényes:
 * a szerkesztő piszkozatban rendezhet át, és csak a Közzététellel élesít.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Oldal',
    plural: 'Oldalak',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Tartalom',
    defaultColumns: ['title', 'slug', '_status', 'publishedAt', 'updatedAt'],
    description:
      'Önálló aloldalak (pl. Rólunk, Szolgáltatások). A kezdőlap tartalma a „kezdolap" webcímű oldalon él.',
    preview: (doc) => buildAdminPreviewUrl('pages', doc?.slug),
  },
  versions: {
    drafts: {
      // Automatikus piszkozat-mentés: a szerkesztő munkája nem veszhet el, ha
      // bezárja a fület. Az alapértelmezett intervallum megfelelő.
      autosave: true,
    },
  },
  hooks: {
    beforeValidate: [forceDraftVersionOnDuplicate],
    // A sorrend számít: előbb a `status` szinkronizálódik a `_status`-ból,
    // utána dől el, hogy ez a mentés az első közzététel-e (publishedAt).
    beforeChange: [syncStatusFromDraftStatus, setPublishedAtOnFirstPublish],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Cím',
      admin: {
        description: 'Az oldal címe — ez jelenik meg a lap tetején és a böngészőfülön.',
      },
    },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Rövid bevezető',
      admin: {
        description: 'Pár mondatos összefoglaló; a Google találati listáján is ez jelenhet meg.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Tartalom',
      admin: {
        description: 'Az oldal szövege. A felső eszköztárral formázhatsz, listázhatsz, linkelhetsz.',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      label: 'Szekciók',
      labels: {
        singular: 'Szekció',
        plural: 'Szekciók',
      },
      blocks: pageBlocks,
      admin: {
        initCollapsed: true,
        description:
          'Az oldal „építőkockás" része. A lap alján lévő + gombbal veszel fel új szekciót; a sorok bal szélén lévő fogantyúval fogd-és-vidd módszerrel átrendezed őket; a szekción belüli Szekció-beállítások → Látható pipával pedig elrejtheted az egyiket úgy, hogy a tartalma megmarad. Ha üresen hagyod, az oldal a megszokott módon jelenik meg — semmi nem vész el.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Fejléckép',
      admin: {
        description: 'Az oldal tetején megjelenő nagy kép (nem kötelező).',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO-cím',
      admin: {
        description: 'Ha üresen hagyod, a Google a fenti címet használja.',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      label: 'SEO-leírás',
      admin: {
        description: 'A Google találati listáján megjelenő rövid leírás (kb. 150 karakter).',
      },
    },
    {
      name: 'ogImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Megosztási kép',
      admin: {
        description: 'Ez a kép jelenik meg, ha valaki Facebookon vagy Messengeren megosztja az oldalt.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Állapot',
      options: [
        { label: 'Piszkozat', value: 'draft' },
        { label: 'Közzétéve', value: 'published' },
      ],
      admin: {
        // Rejtett: a szerkesztő a natív Piszkozat/Közzététel gombokat használja,
        // ezt a mezőt a syncStatusFromDraftStatus hook tölti automatikusan.
        hidden: true,
      },
      hooks: {
        beforeDuplicate: [draftStatusBeforeDuplicate],
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Megjelenés dátuma',
      admin: {
        description: 'Az első közzétételkor magától kitöltődik. Csak akkor írd át, ha más dátumot akarsz mutatni.',
      },
      hooks: {
        beforeDuplicate: [clearPublishedAtBeforeDuplicate],
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Sorrend',
      admin: {
        description: 'A lista- és menürendezéshez használt sorszám (kisebb = előrébb).',
      },
    },
  ],
}
