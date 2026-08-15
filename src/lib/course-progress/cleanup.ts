import type { CollectionBeforeDeleteHook } from 'payload'

import { logger } from '../logger'

/**
 * A haladás-sorok takarítása a felhasználó vagy a kurzus törlésekor.
 *
 * ═══ MIÉRT KELL — MÉRT HIBA, NEM ELMÉLETI ═══
 * A `course-progress.user` és `.product` mezője `required: true`, tehát az
 * oszlop NOT NULL. A Payload postgres-adaptere viszont a relationship idegen
 * kulcsokat `ON DELETE SET NULL`-lal hozza létre. A kettő KIZÁRJA egymást: egy
 * olyan felhasználó törlésekor, akinek van haladás-sora, a Postgres a NULL-ra
 * írásnál elhasal, és az EGÉSZ törlés visszagördül.
 *
 * Helyben, valós Payload+Postgres ellen kipróbálva: a `payload.delete` hibával
 * állt le („Failed query: delete from users…"), és a felhasználó a törlés után
 * is létezett. Ez GDPR-törlési kérésnél blokkoló hiba — a vevőt nem lehet
 * törölni —, és a hiba nyers adatbázis-üzenetként csapódik ki az adminban.
 * Az új kurzus-haladás panel épp azt teszi valószínűbbé, hogy valaki innen
 * indul el törölni.
 *
 * ═══ MIÉRT HOOK, ÉS NEM MIGRÁCIÓ ═══
 * A helyes adatbázis-szintű megoldás az `ON DELETE CASCADE` volna, de a
 * relationship idegen kulcs viselkedését a Payload nem teszi konfigurálhatóvá,
 * a migrációk pedig kizárólag generálhatók (CLAUDE.md 3. tilos zóna) — kézzel
 * írt `ALTER TABLE … ON DELETE CASCADE` tilos. Ez a hook ugyanazt éri el a
 * Payload eszközeivel: a szülő törlése ELŐTT takarít.
 *
 * ═══ MIÉRT NEM ADATVESZTÉS ═══
 * A haladás-sor önmagában értelmetlen a felhasználója nélkül: kizárólag azt
 * rögzíti, hogy EGY felhasználó egy videót megnézett. A felhasználó törlésével
 * a sor amúgy is elárvulna (és GDPR-szempontból törlendő is). Ugyanez áll a
 * kurzusra: a törölt kurzushoz tartozó haladásnak nincs mit jelentenie.
 *
 * A hook SOSEM akasztja meg a törlést: ha a takarítás bármiért elbukik, azt
 * naplózzuk, és a törlés a maga útján fut tovább (ott derül ki a valódi hiba).
 */

/** A törlő hook egy adott kapcsoló-mezőre (`user` vagy `product`). */
export function deleteCourseProgressOnParentDelete(
  field: 'user' | 'product',
): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    try {
      const eredmeny = await req.payload.delete({
        collection: 'course-progress',
        where: { [field]: { equals: id } },
        req,
      })
      const torolt = Array.isArray(eredmeny.docs) ? eredmeny.docs.length : 0
      if (torolt > 0) {
        logger.info('course-progress: a szülő törlésekor takarítottunk', {
          field,
          parentId: String(id),
          deleted: torolt,
        })
      }
    } catch (error) {
      // A takarítás hibája nem akaszthatja meg a törlést: a valódi hibát a
      // törlés maga fogja jelenteni, ez a napló csak a diagnózishoz kell.
      logger.error('course-progress: a szülő törlésekor a takarítás megbukott', {
        field,
        parentId: String(id),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
