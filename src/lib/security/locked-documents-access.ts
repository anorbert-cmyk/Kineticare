import type { SanitizedConfig } from 'payload'

import { isStaffOrOwner } from '../../access/isStaffOrOwner'

/**
 * A Payload által GENERÁLT `payload-locked-documents` collection lezárása.
 *
 * ═══ A HIBA, AMIT BEZÁR (forrásból ellenőrizve) ═══
 * A dokumentum-zárakat (szerkesztés alatt álló rekordok) a Payload egy belső
 * collectionben tartja, amit a szanitizálás hoz létre:
 *   payload/dist/config/sanitize.js → getLockedDocumentsCollection(config)
 *   payload/dist/locked-documents/config.js
 * A generátor a collectionhöz a `defaultAccess`-t rendeli
 * (`({ req: { user } }) => Boolean(user)`) — vagyis a collection TELJES CRUD-ja
 * (read/create/update/delete) BÁRMELY bejelentkezett felhasználónak — a
 * `customer` szerepkörnek is — nyitva állt a REST-felületen. Egy customer így
 * tetszőleges dokumentum-zárat hamisíthatott/frissíthetett/törölhetett: egy
 * szerkesztőnek megjelenő „a dokumentumot szerkeszti" zár elhitethető vagy
 * elvehető — szerkesztés-blokkoló zárhamisítás.
 *
 * ═══ MIÉRT NEM TÖRI EL A SAJÁT ZÁRKEZELÉST ═══
 * A Payload saját zár-olvasása/törlése a db-rétegen megy (ami az
 * access-ellenőrzés ALATT van):
 *   payload/dist/utilities/checkDocumentLockStatus.js → payload.db.find /
 *   payload.db.deleteMany
 * tehát a staff/owner szerkesztői élmény (zárjelzés, átvétel) változatlanul
 * működik; a zár csak a REST CRUD-felületet szűkíti.
 *
 * ═══ MIÉRT DOB, HA A COLLECTION NINCS MEG ═══
 * Ugyanaz az elv, mint a `payload-jobs-stats` zárnál (src/jobs/jobs-stats-access.ts):
 * egy Payload-frissítés slug-átnevezése némán hatástalanítaná a zárat — a
 * visszanyíló lyuk rosszabb, mint egy meg nem induló deploy.
 */
export const LOCKED_DOCUMENTS_COLLECTION_SLUG = 'payload-locked-documents'

export function restrictLockedDocumentsAccess(config: SanitizedConfig): SanitizedConfig {
  const lockedDocuments = config.collections.find(
    (collection) => collection.slug === LOCKED_DOCUMENTS_COLLECTION_SLUG,
  )

  if (!lockedDocuments) {
    throw new Error(
      `A(z) „${LOCKED_DOCUMENTS_COLLECTION_SLUG}" collection nincs a szanitált configban — ` +
        'a Payload feltehetően átnevezte vagy a lockolást alapértelmezését változtatta. ' +
        'A jogosultsági zár így NEM alkalmazható, és a zártábla bármely bejelentkezett ' +
        'felhasználó írhatná. Emberi felülvizsgálat szükséges ' +
        '(src/lib/security/locked-documents-access.ts).',
    )
  }

  // A zárszerkesztés szerkesztői művelet: staff/owner. A customer (és az anonim)
  // a REST-felületen ne lássa és ne írhassa a zárakat.
  lockedDocuments.access.read = isStaffOrOwner
  lockedDocuments.access.create = isStaffOrOwner
  lockedDocuments.access.update = isStaffOrOwner
  lockedDocuments.access.delete = isStaffOrOwner
  lockedDocuments.access.readVersions = isStaffOrOwner

  return config
}
