/**
 * A CSONKOLT progress-lista biztonságos levágása.
 *
 * ═══ MIÉRT LÉTEZIK EZ A MODUL ═══
 *
 * A haladás-riportok két listát olvasnak külön lapozással: KI fér hozzá a
 * kurzushoz (enrollments), és MELYIK leckét nézte meg (progress). Mindkettőnek
 * saját felső korlátja van, hogy egy nagy kurzus ne olvasson be korlátlan sort.
 *
 * A csapda: ha a PROGRESS-lista éri el a plafont, az azon túli diákok sorai
 * hiányoznak — de a diák maga BENNE MARAD az enrollment-listában. Az
 * összesítő ilyenkor azt látja, hogy nincs egyetlen megnézett leckéje sem,
 * és „nem kezdte el”-nek számolja. Vagyis egy KÉSZ diák úgy jelenik meg,
 * mintha hozzá sem kezdett volna.
 *
 * Ez nem kozmetikai hiba: a „nem kezdte el” oszlop a utánkövetés célja. Rossz
 * érték mellett a staff olyan diákokat keresne meg, akik régen végeztek.
 * A torzítás iránya ráadásul ELLENTÉTES a csonkolás-figyelmeztetés
 * ígéretével: a `truncated` alsó becslést sugall, itt viszont a „nem kezdte
 * el” FÖLFELÉ, az átlagszázalék LEFELÉ torzul.
 *
 * ═══ A MEGOLDÁS ═══
 *
 * Mindkét lekérdezés `['user', 'id']` szerint rendez, tehát a csonkolt lista
 * VÉGÉN álló felhasználó az, akinek a sorai félbevágódtak. Róla csak alulmért
 * — vagyis hamis — százalékot tudnánk mutatni, ezért:
 *
 *   1. eldobjuk az utolsó felhasználó ÖSSZES sorát (nem tudjuk, hány hiányzik),
 *   2. és kihagyjuk az enrollment-listából mindenkit, akinek az azonosítója
 *      ettől nagyobb vagy egyenlő — róluk semmilyen adatunk nincs.
 *
 * Így a riport KEVESEBB diákot mutat, de amit mutat, az IGAZ.
 * „Inkább hiányozzon egy sor, mint hogy rossz szám kerüljön elé.”
 *
 * Ez a szabály korábban csak a kurzuslap kezelőjében élt
 * (`src/lib/admin/course-progress-handler.ts`); a Statisztika oldal
 * Kurzus-hatás táblája kimaradt belőle. A 2026-08-21-i kódvizsgálat F1 (HIGH)
 * találata pontosan ez volt, mért reprodukcióval: 800 beiratkozott diák, mind
 * a 20 leckével készen, 16 000 progress-sor a 10 000-es plafon ellen →
 * a riport 300 diákot „nem kezdte el”-nek, az átlagot 63%-nak mutatta.
 * A modul azért közös, hogy a szabály egyetlen helyen éljen, és a két felület
 * ne tudjon szétcsúszni.
 */

/** Bármi, amit egy felhasználóhoz kötünk (a levágás csak az azonosítót nézi). */
export interface UserScopedRow {
  userId: number
}

export interface TrimTruncatedProgressInput<P extends UserScopedRow, E extends UserScopedRow> {
  /** A (esetleg csonkolt) progress-sorok, `['user','id']` sorrendben. */
  progressRows: P[]
  /** A TELJES enrollment-lista ugyanerre a kurzusra. */
  enrollments: E[]
  /** Elérte-e a progress-lapozás a felső korlátot. */
  truncated: boolean
}

export interface TrimTruncatedProgressResult<P extends UserScopedRow, E extends UserScopedRow> {
  /** A megtartott progress-sorok (az utolsó, félbevágott user nélkül). */
  progressRows: P[]
  /** A megtartott beiratkozások (csak akikről teljes adatunk van). */
  enrollments: E[]
  /** Hány diák maradt ki a csonkolás miatt — a felületnek jelentendő. */
  omitted: number
}

/**
 * Levágja a csonkolt progress-listát az utolsó TELJES felhasználóig, és
 * ugyanerre szűkíti az enrollment-listát.
 *
 * Csonkolás nélkül (`truncated: false`) mindkét lista változatlanul jön
 * vissza, `omitted: 0` mellett — a hívó tehát feltétel nélkül átengedheti
 * rajta az adatot.
 */
export function trimTruncatedProgress<P extends UserScopedRow, E extends UserScopedRow>(
  input: TrimTruncatedProgressInput<P, E>,
): TrimTruncatedProgressResult<P, E> {
  if (!input.truncated || input.progressRows.length === 0) {
    return { progressRows: input.progressRows, enrollments: input.enrollments, omitted: 0 }
  }

  const progressRows = [...input.progressRows]
  const hianyosTolUserId = progressRows[progressRows.length - 1].userId
  while (
    progressRows.length > 0 &&
    progressRows[progressRows.length - 1].userId === hianyosTolUserId
  ) {
    progressRows.pop()
  }

  const enrollments = input.enrollments.filter((entry) => entry.userId < hianyosTolUserId)
  return { progressRows, enrollments, omitted: input.enrollments.length - enrollments.length }
}
