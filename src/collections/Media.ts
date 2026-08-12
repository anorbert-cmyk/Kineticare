import type { CollectionConfig } from 'payload'

import { resolveMediaStaticDir } from '../lib/media-dir'

/** A feltöltési célkönyvtár a `PAYLOAD_MEDIA_DIR`-ből (env nélkül `undefined`). */
const mediaStaticDir = resolveMediaStaticDir()

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
 *  - mimeTypes: csak raszterképek (jpeg/png/webp/avif/gif). SVG kizárva: nem
 *    méretezhető sharp-pal és script-injekciós kockázatot hordoz.
 *  - Méretlimit: 10 MB. A limit a HTTP-rétegben él, és be van állítva: a
 *    payload.config `upload: { limits: { fileSize: 10 * 1024 * 1024 } }` —
 *    a túlméretes feltöltés elutasításra kerül (abortOnLimit), nem csonkolódik.
 *  - A focal point/crop szerkesztői felület és a kötelező alt megmarad.
 *
 * TÁROLÁS — a mai állapot (a korábbi „nyitott döntés" lezárva):
 *  - A fájlok a Payload local-storage adapterén mennek, a célkönyvtár a
 *    `PAYLOAD_MEDIA_DIR` környezeti változóból állítható (src/lib/media-dir.ts).
 *    Élesben ez a Railway-hez CSATOLT VOLUME mountpontja (`/app/media`), ami
 *    túléli a deployt. A változó nélkül minden marad a régiben: a Payload
 *    alapértelmezése (a collection slugja, azaz `<cwd>/media`).
 *  - Enélkül a konténer efemer lemezére írnánk, amit minden deploy üresen ad
 *    vissza: a DB-rekord megmarad, a fájl eltűnik, a `/api/media/file/...`
 *    HTTP 500-at ad — élesben pontosan ez történt.
 *  - Öv és nadrágtartó: az induláskori önjavítás (src/lib/media-restore.ts
 *    `ensureMediaFiles`) fájl-szinten ellenőriz, és a repóban meglévő
 *    forrásokból visszatölti a hiányzó képeket, a rekord id-jének megőrzésével.
 *  - KÉSŐBB (Cloudflare R2): a váltás egy storage-adapterrel történik — a
 *    `@payloadcms/storage-s3` (R2 S3-kompatibilis végponttal) a payload.config
 *    plugins-listájába kerül, `disableLocalStorage: true` mellett; ekkor a
 *    `staticDir` és az önjavítás okafogyottá válik.
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
    // A kulcs CSAK akkor kerül be, ha van env-érték: enélkül a Payload
    // szanitálása állítja be az alapértelmezést (a collection slugja), tehát a
    // mai fejlesztői viselkedés bitre azonos marad.
    ...(mediaStaticDir === undefined ? {} : { staticDir: mediaStaticDir }),
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
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
  },
}
