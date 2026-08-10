import type { CollectionConfig } from 'payload'

import { isStaffOrOwner } from './isStaffOrOwner'
import { visibleMenusOrAdmin } from './menus-visibility'
import { publishedOrAdmin } from './publishedOrAdmin'
import { visibleTestimonialsOrAdmin } from './testimonials-visibility'

/**
 * Collection-szintű access-politika a jogosultsági mátrix szerint.
 *
 * Bekötés: a saját collection-fájlok (Pages/Posts/Menus/Categories/Media) a
 * koordinátor fájl-scope-ján kívül esnek, ezért a politikát központilag,
 * az src/plugins/ecommerce.ts config-pipeline-ja applikálja
 * (applyCollectionAccessPolicies). A users collection politikája közvetlenül
 * az src/collections/Users.ts-ben él (az a fájl e ticket scope-jában van).
 *
 * Mátrix-leképezés:
 * - pages/posts: látogató/customer csak publishedet olvas (saját `status` mező!),
 *   staff+owner mindent olvas; create/update/delete staff+owner. A drafts miatt
 *   a verzió-végpontok (readVersions) is staff+owner — lásd staffOrOwnerVersions.
 * - menus (T-013): a read nyilvános, de nem-adminoknak csak a visible=true
 *   sorok látszanak (visibleMenusOrAdmin); create/update/delete staff+owner.
 * - categories: nincs státusz-mezője, a frontend-navigáció miatt a read
 *   nyilvános; create/update/delete staff+owner.
 * - testimonials: a menus mintájára — a read nyilvános, de nem-adminoknak csak
 *   a visible=true sorok látszanak (visibleTestimonialsOrAdmin);
 *   create/update/delete staff+owner.
 * - media: read nyilvános (a Media collectionben már így van), write staff+owner.
 */
export const publicRead: NonNullable<CollectionConfig['access']>['read'] = () => true

const staffOrOwnerWrite: Pick<
  NonNullable<CollectionConfig['access']>,
  'create' | 'update' | 'delete'
> = {
  create: isStaffOrOwner,
  update: isStaffOrOwner,
  delete: isStaffOrOwner,
}

/**
 * A VERZIÓ-VÉGPONTOK zárása a drafts-os collectionökön (S2/d kiterjesztés).
 *
 * A `GET /api/<slug>/versions` és `GET /api/<slug>/:id/versions/:vid` NEM az
 * `access.read`-en múlik, hanem az `access.readVersions`-ön
 * (payload/dist/collections/operations/findVersions.js, findVersionByID.js).
 * Hiányzó szabálynál a Payload `executeAccess`-e minden BEJELENTKEZETT
 * felhasználót átenged (`if (req.user) return true`,
 * payload/dist/auth/executeAccess.js) — a `publishedOrAdmin` read-szabály tehát
 * megkerülhető volt: egy regisztrált vevő a verzió-végponton kiolvashatta a még
 * NEM PUBLIKÁLT oldalak és bejegyzések teljes tartalmát.
 *
 * Csak a drafts-os collectionökre kell (pages, posts); a többinek nincs
 * verzió-végpontja. A products ugyanezt a zárat a plugin-override-ban kapja meg
 * (src/plugins/ecommerce.ts, productsCollectionOverride).
 *
 * Nem szűkíti a szerkesztői munkát: az admin verzió-nézete és a Next
 * draft-előnézet is staff/owner-ként, illetve `overrideAccess: true`-val fut.
 */
const staffOrOwnerVersions: Pick<NonNullable<CollectionConfig['access']>, 'readVersions'> = {
  readVersions: isStaffOrOwner,
}

export const collectionAccessPolicies: Record<string, CollectionConfig['access']> = {
  pages: {
    read: publishedOrAdmin,
    ...staffOrOwnerWrite,
    ...staffOrOwnerVersions,
  },
  posts: {
    read: publishedOrAdmin,
    ...staffOrOwnerWrite,
    ...staffOrOwnerVersions,
  },
  menus: {
    // T-013: centrális visible-szűrés — nem-admin csak a visible=true sorokat
    // olvassa; a Menus collection access.read-je ugyanez a függvény.
    read: visibleMenusOrAdmin,
    ...staffOrOwnerWrite,
  },
  categories: {
    read: publicRead,
    ...staffOrOwnerWrite,
  },
  testimonials: {
    // A nyilvános olvasó csak a látható véleményeket kapja; staff/owner mindent.
    read: visibleTestimonialsOrAdmin,
    ...staffOrOwnerWrite,
  },
  media: {
    // A read szándékosan nincs felülírva: a Media collectionben már public.
    ...staffOrOwnerWrite,
  },
}

type CollectionWithSlug = Pick<CollectionConfig, 'slug'> & {
  access?: CollectionConfig['access']
}

/**
 * A politikák merge-elése a config collectionjeire (meglévő access-megállapodások
 * megőrzésével — pl. a media public read-je marad).
 */
export const applyCollectionAccessPolicies = <T extends CollectionWithSlug>(
  collections: T[],
): T[] =>
  collections.map((collection) => {
    const policy = collectionAccessPolicies[collection.slug]
    if (!policy) {
      return collection
    }
    return {
      ...collection,
      access: {
        ...collection.access,
        ...policy,
      },
    }
  })
