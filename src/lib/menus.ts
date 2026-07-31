import { getPayload } from 'payload'

import { logger } from './logger'
import { buildNavTree, type NavItem } from './menu-tree'
import config from '../payload.config'

/**
 * A fejléc-navigáció adatforrása (server component oldali lekérdezés).
 *
 * A Payload local API-t használja (a repó-konvenció szerint — lásd a
 * route-handlerek getPayload-mintáját), ELŐ adattal renderelve, kliensoldali
 * fetch nélkül.
 *
 * - depth: 1 → a ref (page/post/product) populate-olva jön, így a
 *   buildNavTree published- és slug-ellenőrzést tud végezni.
 * - overrideAccess: true → a szűrés (visible + published-cél) teljes egészében
 *   a tesztelt buildNavTree-ben történik; az anonim access-politika
 *   (visibleMenusOrAdmin) ezzel konzisztens, a kód egyetlen útvonala marad.
 * - Hibatűrés: ha a lekérdezés elhasal (pl. build-időben nincs adatbázis),
 *   a fejléc üres navigációval renderel — az oldal ettől még kiszolgálható.
 */
export async function getNavTree(): Promise<NavItem[]> {
  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'menus',
      depth: 1,
      limit: 200,
      sort: 'order',
      overrideAccess: true,
    })
    return buildNavTree(docs)
  } catch (error) {
    logger.warn('menüfa-lekérdezés sikertelen — üres navigációval renderelünk', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}
