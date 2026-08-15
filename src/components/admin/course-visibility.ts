/**
 * A kurzus LÁTHATÓSÁGÁNAK üzenete a szerkesztőnek — tiszta, React-mentes logika.
 *
 * ═══ MIT OLD MEG (a legsúlyosabb admin UX-hiba) ═══
 * Az admin UX-audit végigjátszotta egy új kurzus felvitelét, és NÉMA
 * adatvesztéssel egyenértékű csapdát talált: a lapon KÉT különböző dolgot
 * hívnak „Állapot"-nak, és a feltűnőbbik hazudik.
 *  - A lap TETEJÉN a Payload dokumentum-státusza áll („Állapot: Közzétett",
 *    `_status`) — ezt írja ki a rendszer a „Módosítások közzététele" gomb után.
 *  - A bolt viszont KIZÁRÓLAG a `products.status` mezőt nézi (src/lib/courses.ts).
 * Mérve: a normál folyamattal felvitt kurzusnál `_status=published`, DE
 * `status=NULL`, és a kurzus NEM jelent meg a /kurzusok oldalon. Semmi nem
 * figyelmeztetett. Tetézi, hogy a `status` mezőt csak TULAJDONOS állíthatja,
 * tehát a munkatárs észre sem veszi a hibát, és javítani sem tudja.
 *
 * A javítás három rétegű: (1) a mező alapértéke `draft`, tehát nem marad
 * jelöletlen, (2) a mező neve egyértelmű („Megjelenés a weboldalon") és a
 * közzététel-gomb mellé, az oldalsávba került, (3) EZ a figyelmeztetés a lap
 * tetején, amely kimondja, ha a kurzus nem látszik — és azt is, mi a teendő.
 *
 * A modult a src/__tests__/course-visibility.test.ts fedi.
 */

/** A `products.status` értékei, ahogy a mező deklarálja. */
export type CourseVisibilityStatus = 'draft' | 'published' | 'archived'

export interface CourseVisibilityNotice {
  /** `figyelmeztetes` = a kurzus NEM látszik; `rendben` = látszik. */
  kind: 'figyelmeztetes' | 'rendben'
  title: string
  /** A teendő — szerepkör-függő, mert a mezőt csak tulajdonos állíthatja. */
  body: string
}

/** A nyers mezőérték szűkítése; minden ismeretlen érték „nincs beállítva". */
export function normalizeVisibility(value: unknown): CourseVisibilityStatus | null {
  return value === 'draft' || value === 'published' || value === 'archived' ? value : null
}

/**
 * A megjelenítendő üzenet.
 *
 * @param status a `products.status` nyers értéke
 * @param canEdit állíthatja-e a bejelentkezett felhasználó a mezőt (owner)
 */
export function courseVisibilityNotice(status: unknown, canEdit: boolean): CourseVisibilityNotice {
  const ertek = normalizeVisibility(status)

  if (ertek === 'published') {
    return {
      kind: 'rendben',
      title: 'Ez a kurzus LÁTSZIK a weboldalon.',
      body: 'A vásárlók a közzétett változatot látják. Ha módosítasz, a „Módosítások közzététele” gombbal élesítheted.',
    }
  }

  // A teendő attól függ, hogy a szerkesztő maga tudja-e megoldani.
  const teendo = canEdit
    ? 'Az oldalsávban állítsd a „Megjelenés a weboldalon” mezőt „Közzétéve”-re.'
    : 'Ezt csak a tulajdonos tudja átállítani — kérd meg, hogy az oldalsávban állítsa a „Megjelenés a weboldalon” mezőt „Közzétéve”-re.'

  if (ertek === 'archived') {
    return {
      kind: 'figyelmeztetes',
      title: 'Ez a kurzus ARCHIVÁLT — nem látszik a weboldalon.',
      body: teendo,
    }
  }

  if (ertek === 'draft') {
    return {
      kind: 'figyelmeztetes',
      title: 'Ez a kurzus MÉG NEM látszik a weboldalon.',
      body: `Piszkozat állapotban van. ${teendo}`,
    }
  }

  return {
    kind: 'figyelmeztetes',
    title: 'Ez a kurzus MÉG NEM látszik a weboldalon.',
    body: `A „Megjelenés a weboldalon” mező nincs kitöltve. Figyelem: a lap tetején lévő „Állapot: Közzétett” a szerkesztői változatra vonatkozik, NEM a weboldali megjelenésre. ${teendo}`,
  }
}
