import type { CollectionConfig, Plugin } from 'payload'

/**
 * Admin-oldalsáv csoport-sorrend.
 *
 * A Payload az oldalsáv csoportjait abban a sorrendben rajzolja ki, ahogyan az
 * adott csoport ELSŐ collectionje a `config.collections` tömbben szerepel
 * (@payloadcms/ui → groupNavItems). A plugin-collectionök (webshop, űrlapok) a
 * saját collectionjeink UTÁN kerülnek a tömbbe, ezért csoport-hozzárendelés
 * önmagában nem elég: a „Rendszer" fül (naplók, webhook-események) a webshop
 * elé csúszna, holott a szerkesztőnek ez a legritkábban kellő, legveszélyesebb
 * blokk — a lista aljára való.
 *
 * Ez a plugin ezért — a plugins-lánc VÉGÉN futva, amikor már minden collection
 * a helyén van — stabilan újrarendezi a tömböt a lenti csoport-sorrend szerint.
 * A csoporton belüli sorrend változatlan marad, és a collectionök tartalmához
 * (mezők, hookok, access) nem nyúl: kizárólag az admin megjelenítési sorrendjét
 * befolyásolja.
 */
export const ADMIN_GROUP_ORDER: readonly string[] = [
  'Tartalom',
  'Navigáció',
  'Webshop',
  'Űrlapok',
  'Felhasználók',
  'Rendszer',
]

/**
 * Egy collection helye a fenti sorrendben. Az ismeretlen (vagy csoport nélküli)
 * collection a felsoroltak ELÉ kerül, hogy egy jövőbeli, csoportozatlan
 * collection se szoruljon a „Rendszer" mögé.
 */
export const adminGroupRank = (collection: Pick<CollectionConfig, 'admin'>): number => {
  const group = collection.admin?.group
  if (typeof group !== 'string') {
    return -1
  }
  const index = ADMIN_GROUP_ORDER.indexOf(group)
  return index === -1 ? -1 : index
}

export const adminGroups: Plugin = (config) => ({
  ...config,
  collections: [...(config.collections ?? [])].sort(
    (a, b) => adminGroupRank(a) - adminGroupRank(b),
  ),
})

export default adminGroups
