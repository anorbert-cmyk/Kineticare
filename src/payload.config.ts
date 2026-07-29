import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Menus } from './collections/Menus'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { ecommerce } from './plugins/ecommerce'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Pages, Posts, Menus, Categories],
  editor: lexicalEditor(),
  // A titok kötelező — az induláskori ENV-assert (src/env.ts + src/instrumentation.ts)
  // gondoskodik róla, hogy hiányában az app ne induljon el.
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    // ecommerce plugin pinned — frissítés csak changelog + staging-E2E után.
    // A részletes konfiguráció (HUF, customers=users, variants/addresses/guest cart
    // kikapcsolva, products/orders override-ok) az src/plugins/ecommerce.ts-ben él.
    ecommerce,
  ],
})
