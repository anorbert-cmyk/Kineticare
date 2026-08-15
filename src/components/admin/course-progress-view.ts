import type {
  CourseStudentProgress,
  CourseStudentStatus,
} from '../../lib/admin/course-progress-stats'

/**
 * A kurzus-haladás admin panel TISZTA nézet-logikája.
 *
 * MIÉRT KÜLÖN FÁJL: a panel maga `'use client'` React-komponens, amelyet a
 * repóban nincs mivel renderelni tesztből (nincs React-testing-library, és a
 * Payload `useDocumentInfo` provider-környezetet igényel). A megjeleníthető
 * viselkedés — szűrés, keresés, rendezés, relatív idő, a kördiagram geometriája
 * — viszont mind tiszta függvény, így ide kiemelve KIMERÍTŐEN tesztelhető
 * (src/__tests__/admin-course-progress.test.ts), a komponens pedig csak
 * összeköti őket a DOM-mal.
 *
 * A modul semmilyen React- vagy DOM-függést nem használ.
 */

/** A szűrő értékkészlete: a három állapot + „mind". */
export type StudentStatusFilter = 'mind' | CourseStudentStatus

/** A táblázat rendezhető oszlopai. */
export type StudentSortKey = 'nev' | 'haladas' | 'aktivitas'

export type SortDirection = 'asc' | 'desc'

/** Az állapot-chip magyar felirata. */
export function statusLabel(status: CourseStudentStatus): string {
  switch (status) {
    case 'befejezte':
      return 'Befejezte'
    case 'folyamatban':
      return 'Folyamatban'
    default:
      return 'Nem kezdte el'
  }
}

/** A szűrő legördülő magyar feliratai — a komponens ebből építi az `option`-öket. */
export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: StudentStatusFilter; label: string }> = [
  { value: 'mind', label: 'Mind' },
  { value: 'nem-kezdte', label: 'Nem kezdte el' },
  { value: 'folyamatban', label: 'Folyamatban' },
  { value: 'befejezte', label: 'Befejezte' },
]

/**
 * Az állapot-chip színei a Payload SAJÁT téma-változóiból.
 *
 * Nyers hexa érték szándékosan nincs: az admin világos és sötét témában is
 * használható, a `--theme-*` változók pedig mindkettőben helyes kontrasztot
 * adnak. (A storefront `--kc-*` tokenjei ide nem valók — az admin más
 * stílusrendszer.)
 */
export function statusChipColors(status: CourseStudentStatus): {
  background: string
  color: string
} {
  switch (status) {
    case 'befejezte':
      return { background: 'var(--theme-success-100)', color: 'var(--theme-success-750)' }
    case 'folyamatban':
      return { background: 'var(--theme-elevation-100)', color: 'var(--theme-elevation-800)' }
    default:
      return { background: 'var(--theme-elevation-50)', color: 'var(--theme-elevation-650)' }
  }
}

/**
 * Relatív időpont MAGYARUL („3 napja").
 *
 * Miért nem `Intl.RelativeTimeFormat`: az „1 napja" helyett „tegnap"-ot, illetve
 * a napon belüli finomabb bontást kézzel akarjuk — és a magyar toldalékolás itt
 * elég egyszerű ahhoz, hogy a saját tábla átláthatóbb legyen, mint az Intl
 * egységválasztásának kiszámítása.
 *
 * @param iso a vizsgált időpont ISO-alakban (null/érvénytelen → null)
 * @param now a „most" (injektálható, hogy a teszt determinisztikus legyen)
 */
export function formatRelativeHungarian(iso: string | null, now: Date = new Date()): string | null {
  if (typeof iso !== 'string' || iso.trim().length === 0) {
    return null
  }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return null
  }
  const diffMs = now.getTime() - then
  // Jövőbeli időpont (óracsúszás a szerver és a böngésző között) — nem
  // állítunk valótlant, csak annyit, hogy épp most történt.
  if (diffMs < 60_000) {
    return 'az imént'
  }
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) {
    return `${String(minutes)} perce`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${String(hours)} órája`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return 'tegnap'
  }
  if (days < 7) {
    return `${String(days)} napja`
  }
  if (days < 30) {
    return `${String(Math.floor(days / 7))} hete`
  }
  if (days < 365) {
    return `${String(Math.floor(days / 30))} hónapja`
  }
  return `${String(Math.floor(days / 365))} éve`
}

/** Kis- és nagybetű, valamint ékezet szerint elnéző összehasonlítási alak. */
function searchable(value: string | null): string {
  return (value ?? '')
    .toLocaleLowerCase('hu-HU')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/**
 * Szűrés állapot szerint ÉS keresés névre/e-mailre.
 *
 * A keresés ékezet-érzéketlen: a „Kovacs" beírás a „Kovács Anna" sort is
 * megtalálja — az ügyintéző gyorsan gépel, és nem az ő dolga eltalálni az
 * ékezeteket.
 */
export function filterStudents(
  students: readonly CourseStudentProgress[],
  options: { status: StudentStatusFilter; query: string },
): CourseStudentProgress[] {
  const needle = searchable(options.query)
  return students.filter((student) => {
    if (options.status !== 'mind' && student.status !== options.status) {
      return false
    }
    if (needle.length === 0) {
      return true
    }
    return (
      searchable(student.name).includes(needle) || searchable(student.email).includes(needle)
    )
  })
}

/** Rendezéskor a hiányzó időpont mindig a lista végére kerül. */
function activityMs(student: CourseStudentProgress): number {
  if (student.lastActivityAt === null) {
    return Number.NEGATIVE_INFINITY
  }
  const ms = new Date(student.lastActivityAt).getTime()
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms
}

/**
 * Rendezés — mindig ÚJ tömböt ad vissza (a bemenet nem módosul).
 *
 * A haladás SZÁM szerint rendez (nem a „12/18" szöveg szerint), ez a
 * megrendelői igény lényege: egy kattintással látszódjon, ki áll a leghátrébb.
 * Azonos százaléknál a név dönt, hogy a sorrend determinisztikus legyen —
 * különben minden újrarendezés összekeverné az egyenlő sorokat.
 */
export function sortStudents(
  students: readonly CourseStudentProgress[],
  key: StudentSortKey,
  direction: SortDirection,
): CourseStudentProgress[] {
  const sign = direction === 'asc' ? 1 : -1
  const byName = (a: CourseStudentProgress, b: CourseStudentProgress): number =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, 'hu-HU')

  return [...students].sort((a, b) => {
    if (key === 'nev') {
      return sign * byName(a, b)
    }
    if (key === 'aktivitas') {
      const diff = activityMs(a) - activityMs(b)
      return diff === 0 ? byName(a, b) : sign * diff
    }
    const diff = a.percent - b.percent
    return diff === 0 ? byName(a, b) : sign * diff
  })
}

/** Az oszlopfejléc `aria-sort` értéke — képernyőolvasónak is látszik a rendezés. */
export function ariaSortValue(
  column: StudentSortKey,
  activeKey: StudentSortKey,
  direction: SortDirection,
): 'ascending' | 'descending' | 'none' {
  if (column !== activeKey) {
    return 'none'
  }
  return direction === 'asc' ? 'ascending' : 'descending'
}

/** A kis kördiagram (ring) geometriája. */
export interface RingGeometry {
  /** A kör sugara a viewBox-ban. */
  radius: number
  /** A teljes kerület — a `stroke-dasharray` alapja. */
  circumference: number
  /** A kitöltött ív hossza (0 ≤ x ≤ kerület). */
  dash: number
  /** A hátralévő ív hossza. */
  gap: number
}

/**
 * A dekoratív kördiagram ívhosszai a százalékból.
 *
 * A százalékot 0–100 közé szorítjuk: hibás bemenetből sem rajzolhat a böngésző
 * negatív vagy túlfutó ívet. A ring `aria-hidden`, az információt a mellette
 * álló szám hordozza — a WCAG szerint a színnel/formával közölt adatnak mindig
 * kell szöveges párja.
 */
export function ringGeometry(percent: number, radius = 12): RingGeometry {
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const circumference = 2 * Math.PI * radius
  const dash = (circumference * safe) / 100
  return { radius, circumference, dash, gap: circumference - dash }
}
