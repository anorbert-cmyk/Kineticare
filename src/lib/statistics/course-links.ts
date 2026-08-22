import type { CourseStudentStatus } from '../admin/course-progress-stats'

/**
 * A kurzus-haladás panel MÉLY LINKJE — egyetlen helyen előállítva.
 *
 * ═══ MIÉRT VAN KÜLÖN MODUL ═══
 * A link két felület szerződése: a Statisztika oldal ÍRJA (a „Nem kezdte el"
 * szám maga a link), a kurzus szerkesztőlapjának Kurzus-haladás panelje
 * OLVASSA (a paraméter jelenlétében magától betölt, beállítja az
 * állapot-szűrőt, és a panelre görget). Ha a szerződés valaha változik,
 * ebben a fájlban kell javítani, nem szétszórt sablon-sztringekben.
 *
 * A szerződés alakja (vezetői döntés, 2026-08-21):
 *
 *   /admin/collections/products/<id>?haladas=nem-kezdte#kurzus-haladas
 *
 * - a paraméter neve `haladas`, értéke a HÁROM állapot valamelyike
 *   (`nem-kezdte` | `folyamatban` | `befejezte`) — ugyanaz a szókészlet, amit
 *   a panel szűrője és a közös összesítő használ (`CourseStudentStatus`,
 *   src/lib/admin/course-progress-stats.ts), tehát a két oldal nem tud
 *   szétcsúszni egy fordítótáblán;
 * - a horgony a panelre visz;
 * - paraméter nélkül a panel a mai viselkedését tartja, ismeretlen értéknél
 *   pedig úgy viselkedik, mintha nem lenne paraméter (a panel oldali
 *   viselkedést a panel ügynöke építi, ez a modul csak a linket adja).
 *
 * Miért ér ez háromról egy lépésre csökkenést: ma a munkatársnak a kurzus
 * lapjára kell mennie, meg kell nyomnia a „Haladás betöltése" gombot, majd
 * be kell állítania a szűrőt. A cselekvéshez vezető út rövidítése a
 * dashboard-tervezés alapkövetelménye (NN/g, Dashboard Design:
 * https://www.nngroup.com/articles/dashboards-preattentive/), a linkcél
 * kimondása pedig a WCAG 2.2 SC 2.4.4 Link Purpose ajánlása:
 * https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
 */

/** A haladás-szűrő URL-paraméterének NEVE. */
export const COURSE_PROGRESS_FILTER_PARAM = 'haladas'

/** A panelre mutató horgony azonosítója (a `#` nélkül). */
export const COURSE_PROGRESS_ANCHOR = 'kurzus-haladas'

/** A kurzus szerkesztőlapja, a haladás-panel horgonyával és szűrőjével. */
export function courseProgressHref(productId: number, status?: CourseStudentStatus): string {
  const base = `/admin/collections/products/${String(productId)}`
  const query =
    status === undefined ? '' : `?${COURSE_PROGRESS_FILTER_PARAM}=${encodeURIComponent(status)}`
  return `${base}${query}#${COURSE_PROGRESS_ANCHOR}`
}
