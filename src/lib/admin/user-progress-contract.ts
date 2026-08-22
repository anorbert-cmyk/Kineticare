import type { CourseStudentStatus } from './course-progress-stats'

/**
 * A Felhasználók-lista haladás-indikátorának SZERZŐDÉSE — egyetlen forrás
 * a szervernek és a böngészőnek.
 *
 * ═══ MIÉRT KÜLÖN, TISZTA MODUL ═══
 * A végpont (src/lib/admin/user-progress-handler.ts) és a lista-cella
 * betöltője (src/components/admin/user-progress-client.ts) MÁS futási
 * környezetben él, mégis ugyanazt az útvonalat, ugyanazt a paraméter-nevet és
 * ugyanazt a válasz-alakot kell ismernie. Ha a kettő külön írná le, egy
 * átnevezés némán elrontaná a listát (a cella nem hibázna, csak sosem mutatna
 * haladást). Ezért a szerződés itt, egy React- és DB-mentes modulban él —
 * ugyanaz az elv, amivel a mély link szerződése is egy helyen van
 * (src/lib/statistics/course-links.ts).
 *
 * ═══ MI NEM MEGY KI A VÁLASZBAN, ÉS MIÉRT ═══
 * Sem e-mail, sem név. A lista sora AMÚGY IS kiírja a nevet és az e-mailt
 * (a `name` és `email` oszlop), tehát a haladás-válaszban való megismétlésük
 * NEM adna semmi újat, viszont ugyanazt a személyes adatot még egy csatornán
 * kiengedné. A válasz ezért kizárólag azonosítót, százalékot és állapotot
 * hordoz. (A tulajdonos kikötése a statisztikára: „csak név, e-mail soha" —
 * itt még a nevet sem kell átküldeni.)
 */

/** A végpont útvonala. */
export const USER_PROGRESS_ENDPOINT = '/api/admin/user-progress'

/** A kért felhasználó-azonosítók query-paraméterének neve. */
export const USER_PROGRESS_USERS_PARAM = 'users'

/**
 * Egy kérésben legfeljebb ennyi felhasználó haladása kérhető le.
 *
 * A Payload lista-nézete alapból 10–100 sort mutat, de a `?limit=` kézzel
 * nagyobbra is állítható — a kliens ezért CSOMAGOKRA bontja a kérést, nem
 * hagyatkozik arra, hogy egy oldal sosem nagyobb ennél. A korlát így nem UX-
 * hiba forrása, hanem az egy kérésre eső adatbázis-munka felső határa.
 */
export const USER_PROGRESS_MAX_USERS = 100

/** Egy kurzus haladása EGY felhasználónál. */
export interface UserCourseProgressEntry {
  productId: number
  /** Kerekített százalék, 0–100 — a közös `summarizeCurriculum`-ból. */
  percent: number
  status: CourseStudentStatus
}

/** Egy felhasználó összes (hozzáférhető) kurzusának haladása. */
export interface UserProgressRow {
  userId: number
  courses: UserCourseProgressEntry[]
}

/** A `GET /api/admin/user-progress` sikeres válasza. */
export interface UserProgressResponse {
  users: UserProgressRow[]
}

/**
 * Az azonosító-lista kódolása a query-stringbe.
 *
 * Vesszővel elválasztott egészek. Szándékosan nem `users[]=1&users[]=2`:
 * a rövidebb alak több száz azonosítónál is bőven belefér az URL-hossz
 * gyakorlati korlátjába, és a szerver oldali értelmezése egyértelmű.
 */
export function buildUserProgressQuery(userIds: readonly number[]): string {
  const params = new URLSearchParams()
  params.set(USER_PROGRESS_USERS_PARAM, userIds.join(','))
  return `${USER_PROGRESS_ENDPOINT}?${params.toString()}`
}

/**
 * A query-paraméter értelmezése: pozitív egészek, duplikátum nélkül,
 * a beérkezési sorrendet megtartva.
 *
 * A query-string BÁRMI lehet (kézzel írt URL, hibás kliens), ezért az
 * értelmezés szigorú: ami nem pozitív egész, az kimarad. Ha a nyers érték
 * üres vagy egyetlen érvényes azonosítót sem tartalmaz, üres tömb jön vissza —
 * a hívó ebből dönt a 400-as válaszról.
 */
export function parseUserIdsParam(raw: string | null): number[] {
  if (raw === null) {
    return []
  }
  const ids: number[] = []
  const seen = new Set<number>()
  for (const part of raw.split(',')) {
    const trimmed = part.trim()
    if (trimmed.length === 0) {
      continue
    }
    const value = Number(trimmed)
    if (!Number.isInteger(value) || value <= 0 || seen.has(value)) {
      continue
    }
    seen.add(value)
    ids.push(value)
  }
  return ids
}
