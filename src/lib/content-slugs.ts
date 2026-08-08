/**
 * Kitüntetett tartalom-slugok.
 *
 * Külön (függőségmentes) modulban élnek, mert a Payload-config oldala
 * (collections → admin.preview) és a storefront oldala (src/lib/cms.ts) is
 * hivatkozik rájuk — közös leaf-modul nélkül körkörös import keletkezne
 * (payload.config → collections → cms.ts → payload.config).
 */

/** A kezdőlapként szolgáló CMS-oldal slugja: a `/` útvonalon él, nem `/kezdolap`-on. */
export const HOME_PAGE_SLUG = 'kezdolap'
