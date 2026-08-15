'use client'

import { Button, useAuth, useDocumentInfo } from '@payloadcms/ui'
import { useState, type CSSProperties, type JSX } from 'react'

import { hasStaffOrOwnerRole } from '../../access/roles'
import type {
  CourseLessonDropOff,
  CourseProgressTotals,
  CourseStudentProgress,
  CourseStudentStatus,
} from '../../lib/admin/course-progress-stats'
import {
  ariaSortValue,
  filterStudents,
  formatRelativeHungarian,
  ringGeometry,
  sortStudents,
  statusChipColors,
  statusLabel,
  STATUS_FILTER_OPTIONS,
  type SortDirection,
  type StudentSortKey,
  type StudentStatusFilter,
} from './course-progress-view'

/**
 * „Kurzus-haladás" panel a kurzus (products) szerkesztőnézetében
 * (`type: 'ui'` mező).
 *
 * ═══ MIT OLD MEG ═══
 * A megrendelői igény szó szerint: „fontos, hogy a lányok láthassák, ki
 * indította el a kurzust, ki még nem, és milyen százalékban van elkészült.
 * Ehhez egy apró indikátor, például egy kis kördiagram, vagy hasonló megoldás
 * elegendő." A panel ezt adja: négy összesítő kártya, majd hallgatónkénti
 * táblázat kis kördiagrammal, szűrővel és keresővel.
 *
 * ═══ KIZÁRÓLAG FELÜLET ═══
 * Semmit nem számol: az összes szám a GET /api/admin/course-progress
 * végponttól jön, amely a KÖZÖS `summarizeCurriculum` modullal dolgozik —
 * ugyanazzal, amit a vevő lejátszója is használ. Így az admin és a vevő
 * garantáltan ugyanazt a százalékot látja. A tiszta nézet-logika (szűrés,
 * rendezés, relatív idő, ring-geometria) a `course-progress-view.ts`-ben él és
 * tesztelt; itt csak a DOM-ra kötés marad.
 *
 * ═══ MIÉRT GOMBRA TÖLT, NEM MOUNTKOR ═══
 * Két ok: (1) a kurzus szerkesztőoldala ne lassuljon egy összesítő
 * lekérdezéssel, amit nem mindig néznek meg; (2) a repó `react-hooks`
 * beállítása a mountkori effektben történő állapotírást hibaként kezeli
 * (lásd eslint.config.mjs) — az interakcióra induló betöltés ettől is mentes.
 *
 * ═══ AKADÁLYMENTESSÉG ═══
 * A kördiagram DEKORATÍV (`aria-hidden`): az információt a mellette álló
 * „12/18 · 67%" szöveg hordozza. A rendezhető oszlopfejlécek `aria-sort`-tal
 * jelzik az aktuális rendezést, a hiba és a siker `role="alert"` /
 * `role="status"` élő régió.
 */

const REQUEST_TIMEOUT_MS = 30_000

const GENERIC_ERROR = 'A kurzus-haladás most nem tölthető be. Kérjük, próbáld újra később.'
const NETWORK_ERROR = 'Nem sikerült elérni a szervert. Ellenőrizd a kapcsolatot, és próbáld újra.'
const EMPTY_STATE = 'Ehhez a kurzushoz még senki nem kapott hozzáférést.'
const NO_MATCH = 'A szűrésnek egyetlen hallgató sem felel meg.'

/** A végpont válasza — a panel által használt mezőkre szűkítve. */
interface CourseProgressData {
  students: CourseStudentProgress[]
  totals: CourseProgressTotals
  lessons: CourseLessonDropOff[]
  notice: string | null
}

/** A szerver magyar hibaüzenete a válasz-törzsből ({ error: string }). */
function readServerError(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const error = (body as Record<string, unknown>).error
  return typeof error === 'string' && error.trim().length > 0 ? error : null
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function readStatus(value: unknown): CourseStudentStatus {
  return value === 'befejezte' || value === 'folyamatban' ? value : 'nem-kezdte'
}

/**
 * A válasz szűkítése a panel modelljére.
 *
 * A `fetch` `unknown`-t ad, a `any` pedig tilos — ezért minden mező
 * típusszűkítve olvasódik. Hiányzó mező sosem dob: a panel inkább 0-t mutat,
 * mint hogy fehér képernyőre fusson egy váratlan válasz-alaktól.
 */
function readCourseProgress(body: unknown): CourseProgressData | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const record = body as Record<string, unknown>
  const rawStudents = Array.isArray(record.students) ? record.students : null
  const rawTotals = typeof record.totals === 'object' && record.totals !== null ? record.totals : null
  if (rawStudents === null || rawTotals === null) {
    return null
  }
  const totalsRecord = rawTotals as Record<string, unknown>

  const students: CourseStudentProgress[] = []
  for (const entry of rawStudents) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }
    const student = entry as Record<string, unknown>
    students.push({
      userId: readNumber(student.userId),
      name: readText(student.name),
      email: readText(student.email) ?? '—',
      completed: readNumber(student.completed),
      total: readNumber(student.total),
      percent: readNumber(student.percent),
      status: readStatus(student.status),
      lastActivityAt: readText(student.lastActivityAt),
      currentLessonTitle: readText(student.currentLessonTitle),
      enrolledAt: readText(student.enrolledAt),
    })
  }

  const lessons: CourseLessonDropOff[] = []
  if (Array.isArray(record.lessons)) {
    for (const entry of record.lessons) {
      if (typeof entry !== 'object' || entry === null) {
        continue
      }
      const lesson = entry as Record<string, unknown>
      lessons.push({
        lessonRef: readText(lesson.lessonRef) ?? '',
        title: readText(lesson.title) ?? 'Névtelen lecke',
        moduleTitle: readText(lesson.moduleTitle) ?? '',
        completedCount: readNumber(lesson.completedCount),
        dropOffFromPrevious: readNumber(lesson.dropOffFromPrevious),
      })
    }
  }

  return {
    students,
    totals: {
      enrolled: readNumber(totalsRecord.enrolled),
      started: readNumber(totalsRecord.started),
      completed: readNumber(totalsRecord.completed),
      notStarted: readNumber(totalsRecord.notStarted),
      averagePercent: readNumber(totalsRecord.averagePercent),
      completionRateOfEnrolled: readNumber(totalsRecord.completionRateOfEnrolled),
      completionRateOfStarted: readNumber(totalsRecord.completionRateOfStarted),
    },
    lessons,
    notice: readText(record.notice),
  }
}

const panelStyle: CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  marginBottom: 'var(--base)',
  padding: 'calc(var(--base) * 0.75)',
}

const noteStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  margin: 0,
}

const rowStyle: CSSProperties = {
  marginTop: 'calc(var(--base) * 0.5)',
}

const cardsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(var(--base) * 0.5)',
  marginTop: 'calc(var(--base) * 0.5)',
}

const cardStyle: CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-100)',
  borderRadius: '4px',
  flex: '1 1 8rem',
  minWidth: '8rem',
  padding: 'calc(var(--base) * 0.5)',
}

const cardValueStyle: CSSProperties = {
  display: 'block',
  fontSize: '1.5rem',
  fontWeight: 600,
  lineHeight: 1.2,
}

const cardLabelStyle: CSSProperties = {
  color: 'var(--theme-elevation-650)',
  display: 'block',
}

const tableWrapStyle: CSSProperties = {
  marginTop: 'calc(var(--base) * 0.5)',
  overflowX: 'auto',
}

const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  minWidth: '46rem',
  width: '100%',
}

const cellStyle: CSSProperties = {
  borderBottom: '1px solid var(--theme-elevation-100)',
  padding: 'calc(var(--base) * 0.35) calc(var(--base) * 0.4)',
  textAlign: 'left',
  verticalAlign: 'middle',
}

const headCellStyle: CSSProperties = {
  ...cellStyle,
  borderBottom: '1px solid var(--theme-elevation-150)',
  color: 'var(--theme-elevation-650)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const sortButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',
  padding: 0,
}

/** Kis, DEKORATÍV kördiagram — az információt a mellette álló szám hordozza. */
function ProgressRing({ percent }: { percent: number }): JSX.Element {
  const { radius, circumference, dash, gap } = ringGeometry(percent)
  const size = 30
  const center = size / 2
  return (
    <svg aria-hidden="true" focusable="false" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
      <circle
        cx={center}
        cy={center}
        fill="none"
        r={radius}
        stroke="var(--theme-elevation-150)"
        strokeWidth={3}
      />
      <circle
        cx={center}
        cy={center}
        fill="none"
        r={radius}
        stroke={percent >= 100 ? 'var(--theme-success-500)' : 'var(--theme-elevation-800)'}
        strokeDasharray={`${String(dash)} ${String(gap)}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
        strokeWidth={3}
        // A 0%-os ív ne látszódjon pontnak a lekerekített végződés miatt.
        style={{ opacity: dash === 0 ? 0 : 1 }}
      />
    </svg>
  )
}

/** Egy összesítő kártya a felső sorban. */
function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={cardStyle}>
      <span style={cardValueStyle}>{value}</span>
      <span style={cardLabelStyle}>{label}</span>
    </div>
  )
}

export function CourseProgressPanel() {
  const { id, isInitializing } = useDocumentInfo()
  const { user } = useAuth<{ id: number | string; role?: string | null }>()

  const [data, setData] = useState<CourseProgressData | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('mind')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<StudentSortKey>('haladas')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const productId = typeof id === 'number' || typeof id === 'string' ? String(id) : null

  // Sima függvény (nem useCallback): a React Compiler maga memoizál — a kézi
  // memoizáció itt csak a `preserve-manual-memoization` szabályba ütközne
  // (ugyanaz az indoklás, mint a RefundPanel-ben).
  const loadProgress = async (): Promise<void> => {
    if (productId === null) {
      return
    }
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(
        `/api/admin/course-progress?productId=${encodeURIComponent(productId)}`,
        {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      )
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok) {
        setErrorMessage(readServerError(body) ?? GENERIC_ERROR)
        return
      }
      const parsed = readCourseProgress(body)
      if (parsed === null) {
        setErrorMessage(GENERIC_ERROR)
        return
      }
      setData(parsed)
    } catch {
      // Hálózati hiba vagy időtúllépés — a művelet újrapróbálható marad.
      setErrorMessage(NETWORK_ERROR)
    } finally {
      setLoading(false)
    }
  }

  /** Ugyanarra az oszlopra kattintva megfordul az irány. */
  const toggleSort = (key: StudentSortKey): void => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  if (isInitializing) {
    return (
      <div className="field-type" style={panelStyle}>
        <h4 style={{ marginTop: 0 }}>Kurzus-haladás</h4>
        <p style={noteStyle}>Betöltés…</p>
      </div>
    )
  }

  if (!hasStaffOrOwnerRole(user)) {
    return (
      <div className="field-type" style={panelStyle}>
        <h4 style={{ marginTop: 0 }}>Kurzus-haladás</h4>
        <p style={noteStyle}>A kurzus-haladást csak munkatárs vagy tulajdonos nézheti meg.</p>
      </div>
    )
  }

  if (productId === null) {
    return (
      <div className="field-type" style={panelStyle}>
        <h4 style={{ marginTop: 0 }}>Kurzus-haladás</h4>
        <p style={noteStyle}>
          Előbb mentsd a kurzust — haladást csak meglévő kurzushoz tudunk mutatni.
        </p>
      </div>
    )
  }

  const visibleStudents =
    data === null
      ? []
      : sortStudents(
          filterStudents(data.students, { status: statusFilter, query }),
          sortKey,
          sortDirection,
        )

  return (
    <div className="field-type" style={panelStyle}>
      <h4 style={{ marginTop: 0 }}>Kurzus-haladás</h4>
      <p style={noteStyle}>
        Ki kapott hozzáférést, ki kezdte el, és hol tart. A százalék ugyanabból a számításból
        jön, amit a vevő is lát a lejátszóban.
      </p>

      <div style={rowStyle}>
        <Button
          buttonStyle="secondary"
          disabled={loading}
          onClick={() => {
            void loadProgress()
          }}
          size="medium"
        >
          {loading
            ? 'Haladás betöltése…'
            : data === null
              ? 'Haladás betöltése'
              : 'Frissítés'}
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" style={{ color: 'var(--theme-error-500)', marginBottom: 0 }}>
          {errorMessage}
        </p>
      ) : null}

      {data === null ? null : (
        <>
          {data.notice ? (
            <p role="status" style={{ color: 'var(--theme-warning-500)', marginBottom: 0 }}>
              {data.notice}
            </p>
          ) : null}

          <div style={cardsStyle}>
            <StatCard label="Beiratkozott" value={String(data.totals.enrolled)} />
            <StatCard label="Elkezdte" value={String(data.totals.started)} />
            <StatCard label="Befejezte" value={String(data.totals.completed)} />
            <StatCard label="Átlagos haladás" value={`${String(data.totals.averagePercent)}%`} />
          </div>

          {data.totals.enrolled === 0 ? (
            <p style={{ ...noteStyle, marginTop: 'calc(var(--base) * 0.5)' }}>{EMPTY_STATE}</p>
          ) : (
            <>
              <div
                style={{
                  ...rowStyle,
                  alignItems: 'flex-end',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(var(--base) * 0.5)',
                }}
              >
                <div>
                  <label htmlFor="kineticare-progress-status" style={{ display: 'block' }}>
                    Állapot
                  </label>
                  <select
                    id="kineticare-progress-status"
                    onChange={(event) => setStatusFilter(event.target.value as StudentStatusFilter)}
                    value={statusFilter}
                  >
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="kineticare-progress-search" style={{ display: 'block' }}>
                    Keresés (név vagy e-mail)
                  </label>
                  <input
                    id="kineticare-progress-search"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Pl. Kovács vagy kovacs@"
                    type="search"
                    value={query}
                  />
                </div>
              </div>

              <div style={tableWrapStyle}>
                <table aria-label="A kurzushoz hozzáférő hallgatók haladása" style={tableStyle}>
                  <thead>
                    <tr>
                      <th
                        aria-sort={ariaSortValue('nev', sortKey, sortDirection)}
                        scope="col"
                        style={headCellStyle}
                      >
                        <button
                          onClick={() => toggleSort('nev')}
                          style={sortButtonStyle}
                          type="button"
                        >
                          Név
                        </button>
                      </th>
                      <th scope="col" style={headCellStyle}>
                        E-mail
                      </th>
                      <th scope="col" style={headCellStyle}>
                        Állapot
                      </th>
                      <th
                        aria-sort={ariaSortValue('haladas', sortKey, sortDirection)}
                        scope="col"
                        style={headCellStyle}
                      >
                        <button
                          onClick={() => toggleSort('haladas')}
                          style={sortButtonStyle}
                          type="button"
                        >
                          Haladás
                        </button>
                      </th>
                      <th
                        aria-sort={ariaSortValue('aktivitas', sortKey, sortDirection)}
                        scope="col"
                        style={headCellStyle}
                      >
                        <button
                          onClick={() => toggleSort('aktivitas')}
                          style={sortButtonStyle}
                          type="button"
                        >
                          Utolsó aktivitás
                        </button>
                      </th>
                      <th scope="col" style={headCellStyle}>
                        Aktuális lecke
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => {
                      const chip = statusChipColors(student.status)
                      const relative = formatRelativeHungarian(student.lastActivityAt)
                      return (
                        <tr key={student.userId}>
                          <td style={cellStyle}>{student.name ?? '—'}</td>
                          <td style={cellStyle}>{student.email}</td>
                          <td style={cellStyle}>
                            <span
                              style={{
                                background: chip.background,
                                borderRadius: '999px',
                                color: chip.color,
                                display: 'inline-block',
                                padding: '0.1rem 0.5rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {statusLabel(student.status)}
                            </span>
                          </td>
                          <td style={cellStyle}>
                            <span
                              style={{
                                alignItems: 'center',
                                display: 'inline-flex',
                                gap: '0.4rem',
                              }}
                            >
                              <ProgressRing percent={student.percent} />
                              <span style={{ whiteSpace: 'nowrap' }}>
                                {`${String(student.completed)}/${String(student.total)} · ${String(student.percent)}%`}
                              </span>
                            </span>
                          </td>
                          <td style={cellStyle}>
                            {relative === null ? (
                              '—'
                            ) : (
                              <time dateTime={student.lastActivityAt ?? undefined}>{relative}</time>
                            )}
                          </td>
                          <td style={cellStyle}>{student.currentLessonTitle ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {visibleStudents.length === 0 ? <p style={noteStyle}>{NO_MATCH}</p> : null}

              {data.lessons.length > 0 ? (
                <details style={rowStyle}>
                  <summary>Leckénkénti lemorzsolódás</summary>
                  <div style={tableWrapStyle}>
                    <table
                      aria-label="Leckénkénti elvégzettség és lemorzsolódás"
                      style={tableStyle}
                    >
                      <thead>
                        <tr>
                          <th scope="col" style={headCellStyle}>
                            Fejezet
                          </th>
                          <th scope="col" style={headCellStyle}>
                            Lecke
                          </th>
                          <th scope="col" style={headCellStyle}>
                            Elvégezte
                          </th>
                          <th scope="col" style={headCellStyle}>
                            Lemorzsolódás
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lessons.map((lesson) => (
                          <tr key={lesson.lessonRef}>
                            <td style={cellStyle}>{lesson.moduleTitle}</td>
                            <td style={cellStyle}>{lesson.title}</td>
                            <td style={cellStyle}>
                              {`${String(lesson.completedCount)}/${String(data.totals.enrolled)}`}
                            </td>
                            <td style={cellStyle}>
                              {lesson.dropOffFromPrevious === 0
                                ? '—'
                                : `−${String(lesson.dropOffFromPrevious)} fő`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default CourseProgressPanel
