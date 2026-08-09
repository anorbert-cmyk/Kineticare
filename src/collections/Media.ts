import type { CollectionConfig } from 'payload'

/**
 * Médiafeltöltés (T-019):
 *  - imageSizes: 320/640/1280/1920 px szélességű webméretek — a height szabad,
 *    így arányosan skáláz; `withoutEnlargement: true` miatt kisebb forrásképnél
 *    az eredeti jön létre (nincs minőséget rontó felnagyítás).
 *  - og: 1200×630-as Open Graph méret — center-crop stratégia (fit: cover,
 *    position: centre), mert az og:image fix arányt vár; kis forrásnál itt sem
 *    nagyítunk (withoutEnlargement), ilyenkor a frontend az eredeti képet használja.
 *  - formatOptions: a tárolt fájl webp (quality 80) — a sharp a feltöltéskor
 *    átkonvertálja; az imageSizes-ek a konvertált fájlból készülnek.
 *  - mimeTypes: raszterképek (jpeg/png/webp/avif/gif) + application/pdf.
 *    SVG továbbra is kizárva: nem méretezhető sharp-pal és script-injekciós
 *    kockázatot hordoz. A PDF kizárólag a számla-archiváláshoz kell
 *    (src/lib/szamlazz/pdf.ts): a Payload a PDF-et NEM dolgozza fel sharp-pal
 *    (a canResizeImage/imageSizes/formatOptions csak kép-mime-ekre fut), így a
 *    bináris érintetlenül tárolódik; az imageSizes-váz ezzel változatlan.
 *    Szerkesztői feltöltésre továbbra is a képek a szándékoltak — a PDF a
 *    rendszer által generált számlákat szolgálja.
 *  - Méretlimit: 10 MB. A limit a HTTP-rétegben él, ezért a payload.config
 *    `upload: { limits: { fileSize: 10 * 1024 * 1024 }, abortOnLimit: true }`
 *    beállítása szükséges hozzá — TODO a payload.config.ts-ben (jelen ticket
 *    file-scope-ján kívül), addig itt dokumentált elvárás.
 *  - A focal point/crop szerkesztői felület és a kötelező alt megmarad.
 *  - TODO (emberi döntés kell): távoli tárhely (R2/S3-adapter) — a payload.config
 *    plugins-listájába kerül majd a storage-adapter (pl. s3Storage), amely az
 *    `upload` objektumhoz kapcsolódik (disableLocalStorage: true mellett).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Kép',
    plural: 'Képek',
  },
  admin: {
    useAsTitle: 'alt',
    group: 'Tartalom',
    defaultColumns: ['alt', 'filename', 'mimeType', 'updatedAt'],
    description: 'Az oldalon használt képek. Feltöltés után bármelyik oldalról kiválaszthatók.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Képleírás (alt)',
      admin: {
        description:
          'A kép szöveges leírása — kötelező, a képernyőolvasók és a Google miatt. Írd le egy mondatban, mi látszik a képen.',
      },
    },
  ],
  upload: {
    formatOptions: {
      format: 'webp',
      options: { quality: 80 },
    },
    imageSizes: [
      { name: 'xs', width: 320, withoutEnlargement: true },
      { name: 'sm', width: 640, withoutEnlargement: true },
      { name: 'md', width: 1280, withoutEnlargement: true },
      { name: 'lg', width: 1920, withoutEnlargement: true },
      {
        name: 'og',
        width: 1200,
        height: 630,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf'],
  },
}
