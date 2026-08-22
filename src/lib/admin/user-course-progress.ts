import type { Curriculum } from '../curriculum/curriculum'
import { trimTruncatedProgress } from '../statistics/progress-truncation'
import {
  buildCourseProgressStats,
  type CourseEnrollment,
  type CourseProgressStatRow,
} from './course-progress-stats'
import type { UserCourseProgressEntry, UserProgressRow } from './user-progress-contract'

/**
 * A Felhasználók-lista haladás-indikátorának MAGJA — tiszta, DB-, hálózat- és
 * React-mentes modul.
 *
 * ═══ MI A FELADATA ═══
 * A végpont (src/lib/admin/user-progress-handler.ts) három nyers listát olvas
 * be az adatbázisból (kért felhasználók a `purchases` listájukkal, a bennük
 * szereplő kurzusok tananyaga, és a hozzájuk tartozó haladás-sorok). Ez a modul
 * ebből a három listából állítja elő a szerződés szerinti választ:
 *  1. levágja a csonkolt haladás-listát (lásd lentebb),
 *  2. kurzusonként csoportosít, hogy a KÖZÖS összesítő hívható legyen,
 *  3. majd INVERTÁLJA az eredményt: kurzus × hallgató helyett felhasználó ×
 *     kurzus, ahogy a lista-cellának kell.
 *
 * ═══ MIÉRT NEM SZÁMOL SAJÁT SZÁZALÉKOT ═══
 * Egyetlen sornyi százalék-képlet sincs benne. A `percent` és a `status`
 * KIZÁRÓLAG a meglévő `buildCourseProgressStats`-ból jön
 * (src/lib/admin/course-progress-stats.ts), az pedig a vevői oldallal közös
 * `summarizeCurriculum`-ot hívja. Így a Felhasználók-lista, a Kurzus-haladás
 * panel és a vevő saját „Kurzusaim" oldala ugyanazt a számot mutatja — három
 * külön képlet három külön igazságot adna, és a munkatárs nem tudná, melyiknek
 * higgyen.
 *
 * Örökölt szabályok (a közös modulból, nem másoljuk le őket): a nevező az
 * ELINDÍTHATÓ leckék száma, az időközben törölt leckére mutató (orphan) sor
 * kiesik, a duplikált sor nem torzít, 0 leckés kurzusnál nincs nullával osztás.
 *
 * ═══ AMI VISZONT ITT DŐL EL ═══
 * - Egy kurzus akkor kerül a felhasználó válaszába, ha a `purchases` listáján
 *   RAJTA van ÉS a tananyagát be tudtuk olvasni. Aki egy kurzushoz már nem fér
 *   hozzá (visszatérítés után), annak a megmaradt haladás-sorai sem hoznak elő
 *   sort: a közös összesítő csak a beiratkozottak sorait veszi figyelembe.
 * - A `courses` tömb kurzus-azonosító szerint NÖVEKVŐ sorrendű. A lista-cella
 *   nem a válasz sorrendjében rajzol (a saját `purchases` listáját járja be),
 *   a determinisztikus sorrend viszont a tesztelhetőség és a diffelhetőség
 *   miatt kell — ugyanaz a bemenet ugyanazt a bájtsorozatot adja.
 * - A csonkolás-szabály (lásd a `trimTruncatedUserProgress` kommentjét).
 */

/** Egy kért felhasználó és a hozzáférhető kurzusainak azonosítói. */
export interface UserProgressUserInput {
  userId: number
  /** A `purchases` listából kiolvasott, EGYEDI kurzus-azonosítók. */
  productIds: readonly number[]
}

/** Egy `course-progress` sor annyi mezővel, amennyi ehhez a válaszhoz kell. */
export interface UserProgressSourceRow {
  userId: number
  productId: number
  videoRef: string
}

export interface TrimUserProgressInput {
  /** A kért, megtalált felhasználók. */
  users: readonly UserProgressUserInput[]
  /** A beolvasott haladás-sorok `['user','id']` sorrendben. */
  rows: readonly UserProgressSourceRow[]
  /** Elérte-e a haladás-lapozás a felső korlátot. */
  truncated: boolean
}

export interface TrimUserProgressResult {
  /** A megtartott felhasználók — csak akikről TELJES adatunk van. */
  users: UserProgressUserInput[]
  /** A megtartott haladás-sorok (az utolsó, félbevágott felhasználó nélkül). */
  rows: UserProgressSourceRow[]
  /** Hány felhasználó maradt ki a csonkolás miatt (naplózandó). */
  omitted: number
}

/**
 * A csonkolt haladás-lista biztonságos levágása — felhasználó-határon.
 *
 * ═══ MIÉRT A KÖZÖS `trimTruncatedProgress` VÉGZI ═══
 * A szabály szó szerint ugyanaz, mint a kurzus-haladás panelen és a
 * Statisztika Kurzus-hatás tábláján: a haladás-sorok `['user','id']` szerint
 * rendezve jönnek, tehát a felső korlát a LISTA VÉGÉN álló felhasználó sorait
 * vághatja félbe. Róla csak alulmért — vagyis HAMIS — százalékot tudnánk
 * mutatni, ezért az ő sorait eldobjuk, és őt magát (meg minden nála nagyobb
 * azonosítójút) kihagyjuk a válaszból.
 *
 * A közös modul (src/lib/statistics/progress-truncation.ts) fejkommentje
 * kurzusonkénti használatról beszél, a MŰVELETE viszont csak a `userId`-t
 * nézi (`UserScopedRow`), és pontosan ezt a levágást végzi. Itt a lista több
 * kurzus sorait hordozza, DE a rendezés elsődleges kulcsa ugyanúgy a
 * felhasználó: egy felhasználó összes kurzusának sorai összefüggő blokkban
 * állnak, tehát a csonkolás továbbra is felhasználó-határon vág. Ezért a
 * szabályt NEM írjuk le újra — az a hiba, amit a közös modul megelőz (két
 * felület kétféle levágása), pont az újraírásból keletkezne.
 *
 * ═══ EGY DOLGOT VISZONT HOZZÁTESZ ═══
 * Ha a lapozás csonkolt, de EGYETLEN értelmezhető sort sem kaptunk, nincs
 * mihez viszonyítani a határt: nem tudjuk, kinek hiányzik adata. A közös
 * modul ilyenkor mindent változatlanul enged tovább (a kurzus-panelen ez a
 * `meta`/`notice` miatt látható marad), a lista-cellának viszont NINCS hova
 * kiírnia a figyelmeztetést — egy néma 0% pedig kész vevőt mutatna
 * kezdőnek. Ezért itt ez az ág mindenkit kihagy: inkább nincs adat, mint rossz.
 */
export function trimTruncatedUserProgress(input: TrimUserProgressInput): TrimUserProgressResult {
  const users = [...input.users]
  const rows = [...input.rows]

  if (input.truncated && rows.length === 0) {
    return { users: [], rows: [], omitted: users.length }
  }

  const teljes = trimTruncatedProgress({
    progressRows: rows,
    enrollments: users,
    truncated: input.truncated,
  })
  return { users: teljes.enrollments, rows: teljes.progressRows, omitted: teljes.omitted }
}

export interface BuildUserProgressRowsInput {
  /** A felhasználók a csonkolás-szabály UTÁN. */
  users: readonly UserProgressUserInput[]
  /** A haladás-sorok a csonkolás-szabály UTÁN. */
  rows: readonly UserProgressSourceRow[]
  /**
   * Kurzus-azonosító → tananyag. Ami nincs benne (időközben törölt kurzus,
   * be nem olvasott tananyag), arról NEM adunk számot: a cella ott „nincs
   * adat"-ot mutat, ami igaz — szemben egy kitalált 0%-kal.
   */
  curriculums: ReadonlyMap<number, Curriculum>
}

/**
 * Felhasználónkénti haladás-sorok a szerződés szerinti alakban.
 *
 * A függvény TISZTA: ugyanarra a bemenetre mindig ugyanaz a kimenet, nincs
 * óra-, DB- vagy hálózat-függése.
 */
export function buildUserProgressRows(input: BuildUserProgressRowsInput): UserProgressRow[] {
  // 1) A felhasználók DEDUPLIKÁLVA, a bemeneti (kérési) sorrendet megtartva.
  //    Ugyanaz a felhasználó kétszer nem kerülhet a válaszba, akkor sem, ha a
  //    lapozás vagy a hívó kétszer adta át.
  const uniqueUsers: UserProgressUserInput[] = []
  const entriesByUser = new Map<number, UserCourseProgressEntry[]>()
  for (const user of input.users) {
    if (!Number.isFinite(user.userId) || entriesByUser.has(user.userId)) {
      continue
    }
    uniqueUsers.push(user)
    entriesByUser.set(user.userId, [])
  }

  // 2) Kurzusonkénti beiratkozás-listák. „Beiratkozott" itt is a közös
  //    definíció: akinek a `purchases` listáján rajta van a kurzus. Csak
  //    olyan kurzust veszünk elő, amelynek a tananyagát ismerjük.
  const enrollmentsByProduct = new Map<number, CourseEnrollment[]>()
  for (const user of uniqueUsers) {
    const seen = new Set<number>()
    for (const productId of user.productIds) {
      if (!Number.isFinite(productId) || seen.has(productId)) {
        continue
      }
      seen.add(productId)
      if (!input.curriculums.has(productId)) {
        continue
      }
      const list = enrollmentsByProduct.get(productId)
      // Az `email` üres sztring, a `name` null: a közös összesítő szerződése
      // kéri a mezőket, de ez a válasz SEM e-mailt, SEM nevet nem hordoz
      // (a lista sora amúgy is kiírja mindkettőt) — így személyes adat be sem
      // kerül ebbe az ágba.
      const enrollment: CourseEnrollment = { userId: user.userId, email: '', name: null }
      if (list === undefined) {
        enrollmentsByProduct.set(productId, [enrollment])
      } else {
        list.push(enrollment)
      }
    }
  }

  // 3) Haladás-sorok kurzusonként. A nem kért (vagy a csonkolásnál kihagyott)
  //    felhasználó sorait el sem tesszük: a közös összesítő is eldobná őket,
  //    de így memóriát sem foglalnak.
  const rowsByProduct = new Map<number, CourseProgressStatRow[]>()
  for (const row of input.rows) {
    if (!entriesByUser.has(row.userId) || !enrollmentsByProduct.has(row.productId)) {
      continue
    }
    const list = rowsByProduct.get(row.productId)
    // A `watchedAt` szándékosan hiányzik: a válasz csak százalékot és állapotot
    // hordoz, az utolsó aktivitás a kurzus szerkesztőlapjának a dolga.
    const statRow: CourseProgressStatRow = { userId: row.userId, videoRef: row.videoRef }
    if (list === undefined) {
      rowsByProduct.set(row.productId, [statRow])
    } else {
      list.push(statRow)
    }
  }

  // 4) Kurzusonként a KÖZÖS összesítő, majd inverzió felhasználóra. A kurzusok
  //    NÖVEKVŐ azonosító-sorrendben futnak, ezért a felhasználónkénti tömb is
  //    ebben a sorrendben áll össze — külön rendezés nélkül, determinisztikusan.
  const productIds = [...enrollmentsByProduct.keys()].sort((left, right) => left - right)
  for (const productId of productIds) {
    const curriculum = input.curriculums.get(productId)
    const enrollments = enrollmentsByProduct.get(productId)
    if (curriculum === undefined || enrollments === undefined) {
      continue
    }
    const stats = buildCourseProgressStats({
      curriculum,
      enrollments,
      progressRows: rowsByProduct.get(productId) ?? [],
    })
    // A nevező a KÖZÖS szabály szerint az ELINDÍTHATÓ leckék száma (ugyanaz a
    // `playable` szűrés, amit a `summarizeCurriculum` használ). A 0-t nem
    // nyeljük le: a cella ebből tudja megkülönböztetni a „még nincs tananyag"
    // esetet a valódi 0%-tól (user-progress-contract.ts, `lessonCount`).
    const lessonCount = curriculum.lessons.filter((lesson) => lesson.playable).length
    for (const student of stats.students) {
      entriesByUser.get(student.userId)?.push({
        productId,
        percent: student.percent,
        status: student.status,
        lessonCount,
      })
    }
  }

  // 5) A válasz sorai. A 0 vásárlású felhasználó ÜRES `courses` tömbbel
  //    szerepel: róla is van érvényes adatunk („nincs kurzusa"), és a cella
  //    így meg tudja különböztetni a betöltés alatti állapottól. Akiről
  //    NINCS adatunk (nem létező azonosító, csonkolás miatt kihagyott
  //    felhasználó), az be sem kerül a listába.
  return uniqueUsers.map((user) => ({
    userId: user.userId,
    courses: entriesByUser.get(user.userId) ?? [],
  }))
}
