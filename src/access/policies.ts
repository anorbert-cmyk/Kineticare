import type { CollectionConfig } from 'payload'

import { isStaffOrOwner } from './isStaffOrOwner'
import { publishedOrAdmin } from './publishedOrAdmin'

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
 *   staff+owner mindent olvas; create/update/delete staff+owner.
 * - menus/categories: nincs státusz-mezőjük, a frontend-navigáció miatt a read
 *   nyilvános; create/update/delete staff+owner.
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

export const collectionAccessPolicies: Record<string, CollectionConfig['access']> = {
  pages: {
    read: publishedOrAdmin,
    ...staffOrOwnerWrite,
  },
  posts: {
    read: publishedOrAdmin,
    ...staffOrOwnerWrite,
  },
  menus: {
    read: publicRead,
    ...staffOrOwnerWrite,
  },
  categories: {
    read: publicRead,
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
