'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/Progress'
import { markVideoWatched } from '@/lib/course-progress/client'
import { mergePlayingSession } from '@/lib/course-player-refresh'
import { courseHref } from '@/lib/course-url'
import { findLessonByRef, type Curriculum } from '@/lib/curriculum/curriculum'
import { summarizeCurriculum } from '@/lib/curriculum/progress'
import { streamIframeSrc } from '@/lib/stream/contract'
import { fetchStreamToken } from '@/lib/stream-token-client'

import { CurriculumRail } from './player/CurriculumRail'
import { LessonBody } from './player/LessonBody'
import { PlayerActions } from './player/PlayerActions'
import { ArrowIcon, CloseIcon } from './player/icons'
import {
  completionAnnouncement,
  elativeSuffix,
  formatLessonDuration,
  initialOpenModuleIds,
  mergeModuleState,
  moduleStateKey,
  previousAction,
  primaryAction,
  readModuleState,
  shouldAutoMarkWatched,
  writeModuleState,
} from './player/navigation'

/**
 * COURSEPLAYER — a Kineticare kurzus-lejátszója.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * A FELÜLET
 * ═══════════════════════════════════════════════════════════════════════════
 * Kétpaneles LMS-elrendezés: balra a tananyag-rail (modul-akkordeon), jobbra a
 * színpad (videó / szöveges lecke / külső link) egy mindig elérhető, állapotfüggő
 * elsődleges akcióval. Mobilon a rail teljes képernyős, modális panelre vált —
 * a DOM-sorrend ott a fontossági sorrendet követi (fejléc → videó → cím →
 * akciósáv → tartalom), tehát a képernyőolvasó és a billentyűzet is a lényeggel
 * találkozik először.
 *
 * A bemenet a TANANYAG-MODELL (`src/lib/curriculum/curriculum.ts`), nem a nyers
 * videólista: a modulokra bontott és a régi, lapos kurzus ugyanazon a
 * felületen jelenik meg, mert a modell a különbséget már feloldotta.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AMI ÉLESBEN DRÁGÁN MEGTANULT, ÉS EZÉRT VÁLTOZATLAN
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. A TOKEN-FRISSÍTÉS NEM MOUNTOLJA ÚJRA AZ IFRAME-ET. A lejárat előtt 5
 *    perccel új jegy készül, de az iframe által TÉNYLEGESEN betöltött `src`
 *    (`loadedSrc`) csak explicit lecke-betöltéskor változik. A szabály tiszta,
 *    tesztelt függvényben él: `mergePlayingSession`
 *    (src/lib/course-player-refresh.ts). Enélkül a „lejátszás nem szakad meg"
 *    frissítés maga szakította meg a lejátszást (pozícióvesztés).
 * 2. GENERÁCIÓ-SZÁMLÁLÓ. Minden FELHASZNÁLÓI lecke-váltás növeli; a repülőben
 *    lévő token-kérés a saját generációját őrzi, és kései válasza eldobásra
 *    kerül. Így egy régi lecke nem tud visszakapcsolni az új fölé.
 * 3. A TOKEN-KÉRÉS A LECKE STABIL REFJÉT KÜLDI, SOSEM SORSZÁMOT. A sorszám a
 *    feldolgozás alatti videók kiszűrése miatt elcsúszik a szerver listájához
 *    képest — abból idegen (vagy hibás) videóra kiadott jegy lett.
 * 4. OPTIMISTA „MEGNÉZETT" JELÖLÉS, hibánál visszagördüléssel és magyar
 *    üzenettel. A visszavonás továbbra sincs hatókörben.
 * 5. `loadLessonRef` — a frissítő-időzítő MINDIG a legfrissebb betöltő-függvényt
 *    hívja. (A korábbi változat a saját deklarációja előtti konstanst zárta be,
 *    és örökre az elavult példányt tartotta.)
 * 6. A HOZZÁFÉRÉS-HIÁNY és a LEJÁRAT külön, kész magyar üzenettel
 *    (`expiredMessage`) jelenik meg.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÉLŐ BEJELENTÉS ÉS FÓKUSZ — MIÉRT NEM EGYSZERRE
 * ═══════════════════════════════════════════════════════════════════════════
 * Egyetlen, MINDIG a DOM-ban lévő `role="status"` régió létezik (a feltételesen
 * renderelt élő régiót a képernyőolvasó nem figyeli, mert a beillesztés
 * pillanatában még nincs mit figyelnie).
 *
 * Ugyanarra az eseményre viszont SOSEM megy egyszerre bejelentés ÉS fókuszmozgás:
 * a kettő egymásra beszélne, és a felhasználó egyiket sem hallaná végig. Ezért
 * - lecke-VÁLTÁSKOR csak a fókusz mozog (a lecke `<h1>`-ére) — a cím felolvasása
 *   maga a visszajelzés,
 * - jelölés NAVIGÁCIÓ NÉLKÜL (utolsó lecke) esetén csak bejelentés van,
 * - hibánál külön, látható `role="alert"` üzenet jelenik meg.
 */

export interface CoursePlayerProduct {
  id: number
  /** A nyilvános kurzusoldalra mutató link slugja; hiányában a régi id-s cím. */
  slug?: string | null
  title: string
}

/**
 * A lejátszó felé BEFELÉ jövő haladás-jelentés alakja: melyik lecke, és
 * mekkora hányada ment le (0–1).
 */
export type LessonProgressReporter = (lessonRef: string, watchedRatio: number) => void

export interface CoursePlayerProps {
  product: CoursePlayerProduct
  /** A kurzus tananyaga — a SZERVER építi (`buildCurriculum`). */
  curriculum: Curriculum
  hasAccess: boolean
  /**
   * Lejárt hozzáférés esetén a kész, magyar üzenet (A1 — a szöveget a szerver
   * állítja elő az src/lib/course-access.ts-ből). null = nem lejárat miatt nincs
   * hozzáférés (pl. sosem vette meg).
   */
  expiredMessage?: string | null
  /**
   * A már késznek jelölt leckék STABIL refjei — a szerver-komponens tölti be a
   * course-progress collectionből. Az orphan ref (időközben törölt lecke) itt is
   * előfordulhat: a tananyag egyszerűen nem talál hozzá leckét.
   */
  watchedRefs?: readonly string[]
  /**
   * ═══ BEKÖTÉSI PONT AZ AUTOMATIKUS „MEGNÉZETT" JELÖLÉSHEZ ═══
   * A nézettség-alapú, automatikus jelölést a Bunny player.js kliens
   * (`src/lib/stream/playerjs-client.ts`, külön körben készül) fogja hajtani.
   * A lejátszó mountkor MEGHÍVJA ezt a feliratkozót, és átadja neki a saját
   * jelentés-visszahívását; a feliratkozó a leiratkozó függvényt adhatja vissza.
   *
   * Így a jövőbeli kliens EGYETLEN vékony burkolóval bekapcsolható, és a
   * jelölés útvonala UGYANAZ marad, mint a kézi gombé — a kettő nem tud
   * eltérni. A küszöb tiszta függvényben él: `shouldAutoMarkWatched`
   * (player/navigation.ts). A lejátszó SEMMIT nem importál a még el nem
   * készült kliensből.
   */
  bindLessonProgress?: (report: LessonProgressReporter) => (() => void) | void
}

/** A token-frissítés a lejárat előtt ennyivel korábban (másodperc). */
const TOKEN_REFRESH_BEFORE_EXPIRY_SEC = 300 // 5 perc

type PlayerState =
  | { kind: 'idle' }
  | { kind: 'loading'; lessonRef: string }
  | {
      kind: 'playing'
      lessonRef: string
      videoIndex: number
      token: string
      expiresAtEpochSec: number
      /** Az iframe által TÉNYLEGESEN betöltött embed-URL — token-frissítéskor NEM változik. */
      loadedSrc: string | null
    }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }

/** A lecke-betöltő szignatúrája (a token-frissítés önhivatkozásához kell). */
type LoadLesson = (lessonRef: string, isRefresh?: boolean) => Promise<void>

/**
 * A `localStorage` biztonságos elérése. Privát módban maga a PROPERTY-olvasás
 * dobhat `SecurityError`-t, ezért a try nem a művelet, hanem a hozzáférés köré
 * kell hogy kerüljön.
 */
function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * A kezdetben nyitott lecke: a FOLYTATÁSHOZ ajánlott (első még nem kész)
 * lecke. Determinisztikus — a szerver- és a kliens-oldali első render azonos,
 * tehát nincs hidratálási eltérés.
 */
function initialLessonRef(curriculum: Curriculum, watchedRefs: readonly string[]): string | null {
  return summarizeCurriculum(curriculum, watchedRefs).resumeLesson?.ref ?? null
}

export function CoursePlayer({
  bindLessonProgress,
  curriculum,
  expiredMessage = null,
  hasAccess,
  product,
  watchedRefs,
}: CoursePlayerProps) {
  const initialRefs = useMemo(() => watchedRefs ?? [], [watchedRefs])

  const [state, setState] = useState<PlayerState>({ kind: 'idle' })
  const [activeRef, setActiveRef] = useState<string | null>(() =>
    initialLessonRef(curriculum, initialRefs),
  )
  /**
   * A kész leckék KLIENS-oldali állapota. A kezdőérték a szerverről jön; az
   * optimista jelölés ezt bővíti, hiba esetén pedig visszavesz belőle. Minden
   * változásnál ÚJ Set készül — a meglévő állapotot sosem mutáljuk.
   */
  const [watched, setWatched] = useState<ReadonlySet<string>>(() => new Set(initialRefs))
  /** Épp mentés alatt lévő refek — a gomb ilyenkor letiltva, dupla kattintás ellen. */
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set<string>())
  /** A legutóbbi sikertelen jelölés magyar üzenete (látható `role="alert"`). */
  const [markError, setMarkError] = useState<string | null>(null)
  /** Az élő régió szövege — csak ott íródik, ahol NINCS egyidejű fókuszmozgás. */
  const [announcement, setAnnouncement] = useState('')
  const [openModuleIds, setOpenModuleIds] = useState<ReadonlySet<string>>(
    () => new Set(initialOpenModuleIds(curriculum, initialLessonRef(curriculum, initialRefs))),
  )
  /** Mobilon a tananyag-panel nyitva van-e. Asztali nézetben mindig false. */
  const [railOpen, setRailOpen] = useState(false)

  const refreshTimerRef = useRef<number | null>(null)
  /**
   * Betöltés-generáció: minden FELHASZNÁLÓI lecke-váltás (nem-refresh hívás)
   * növeli. A repülőben lévő token-kérés a saját generációját őrzi; ha a válasz
   * megérkezésekor a számláló már eltér, a válasz KÉSÉS — eldobjuk (se
   * állapotváltás, se új időzítő).
   */
  const loadGenerationRef = useRef(0)
  /** A frissítő-időzítő MINDIG a legfrissebb betöltő-függvényt hívja. */
  const loadLessonRef = useRef<LoadLesson | null>(null)
  /** A lecke címe — váltáskor ide megy a fókusz. */
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  /**
   * A legutóbb FÓKUSZÁLT lecke refje. Nem egyszerű „első render" jelző: a
   * React fejlesztői módban (StrictMode) kétszer futtatja az effekteket, és egy
   * eldobható logikai jelző a második futáskor már ellopná a fókuszt az oldal
   * betöltésekor. Az utolsó fókuszált ref TÁROLÁSA idempotens.
   */
  const focusedLessonRef = useRef<string | null>(initialLessonRef(curriculum, initialRefs))
  /** A mobil panelt megnyitó gomb — záráskor IDE tér vissza a fókusz. */
  const railToggleRef = useRef<HTMLButtonElement | null>(null)
  const railPanelRef = useRef<HTMLDivElement | null>(null)

  const storageKey = useMemo(() => moduleStateKey(product.id), [product.id])
  const idPrefix = useMemo(() => `kc-player-${product.id}`, [product.id])
  const railTitleId = `${idPrefix}-tananyag-cim`

  const progress = useMemo(
    () => summarizeCurriculum(curriculum, watched),
    [curriculum, watched],
  )
  const activeLesson = useMemo(
    () => (activeRef === null ? null : findLessonByRef(curriculum, activeRef)),
    [curriculum, activeRef],
  )
  const primary = useMemo(
    () => primaryAction(curriculum, activeRef, watched),
    [curriculum, activeRef, watched],
  )
  const previous = useMemo(() => previousAction(curriculum, activeRef), [curriculum, activeRef])

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  /**
   * Optimista jelölés: a pipa azonnal látszik, a szerverhívás hibája esetén
   * visszagördül, és látható, magyar `role="alert"` üzenet jelenik meg.
   *
   * @param announce mondja-e el az élő régió a sikert. NAVIGÁCIÓVAL járó
   *   jelölésnél `false`: ott a fókusz az új lecke címére ugrik, és a kettő
   *   egymásra beszélne.
   */
  const markWatched = useCallback(
    async (lessonRef: string, announce: boolean) => {
      if (watched.has(lessonRef) || pending.has(lessonRef)) {
        return
      }
      setMarkError(null)
      setPending((current) => new Set(current).add(lessonRef))
      // FUNKCIONÁLIS frissítés: két, egymást átfedő jelölés (pl. az automatikus
      // és a kézi) így nem írja felül egymás eredményét.
      setWatched((current) => new Set(current).add(lessonRef))

      const result = await markVideoWatched({ productId: product.id, videoRef: lessonRef })

      setPending((current) => {
        const next = new Set(current)
        next.delete(lessonRef)
        return next
      })

      if (result.kind !== 'ok') {
        setWatched((current) => {
          const next = new Set(current)
          next.delete(lessonRef)
          return next
        })
        setMarkError(result.message)
        return
      }

      if (announce) {
        const lesson = findLessonByRef(curriculum, lessonRef)
        const summary = summarizeCurriculum(curriculum, new Set(watched).add(lessonRef))
        setAnnouncement(
          completionAnnouncement({
            lessonTitle: lesson?.title ?? 'A lecke',
            completed: summary.completed,
            total: summary.total,
          }),
        )
      }
    },
    [curriculum, pending, product.id, watched],
  )

  /**
   * A haladás-jelentés feldolgozása (a `bindLessonProgress` bekötési pont
   * túloldala). A döntés küszöbe tiszta függvényben él
   * (`shouldAutoMarkWatched`), a jelölés pedig UGYANAZ az útvonal, amit a gomb
   * hív — így az automatikus és a kézi jelölés nem tud eltérni egymástól.
   *
   * Bejelentés NÉLKÜL fut: a videó vége nem felhasználói kérés, a hangos
   * közbeszólás ott zavaró lenne (a pipa a railben látható visszajelzés).
   */
  const reportLessonProgress = useCallback<LessonProgressReporter>(
    (lessonRef, watchedRatio) => {
      if (shouldAutoMarkWatched(watchedRatio, watched.has(lessonRef))) {
        void markWatched(lessonRef, false)
      }
    },
    [markWatched, watched],
  )
  /**
   * A jelentés-visszahívás STABIL példánya: a feliratkozó (a jövőbeli player.js
   * kliens) egyszer kapja meg, és nem kell újra-feliratkoznia minden
   * állapotváltozásnál — a ref mindig a legfrissebb feldolgozóra mutat.
   */
  const reportRef = useRef<LessonProgressReporter>(reportLessonProgress)
  useEffect(() => {
    reportRef.current = reportLessonProgress
  }, [reportLessonProgress])

  const stableReport = useCallback<LessonProgressReporter>((lessonRef, watchedRatio) => {
    reportRef.current(lessonRef, watchedRatio)
  }, [])

  useEffect(() => {
    if (bindLessonProgress === undefined) {
      return
    }
    return bindLessonProgress(stableReport) ?? undefined
  }, [bindLessonProgress, stableReport])

  const loadLesson = useCallback<LoadLesson>(
    async (lessonRef, isRefresh = false) => {
      if (!hasAccess) {
        setState({ kind: 'forbidden' })
        return
      }
      const lesson = findLessonByRef(curriculum, lessonRef)
      if (lesson === null || !lesson.playable) {
        setState({ kind: 'error', message: 'Ez a lecke jelenleg nem érhető el.' })
        return
      }

      if (!isRefresh) {
        // Felhasználói váltás: az ELŐZŐ lecke frissítő-időzítője itt hal meg — egy
        // sikertelen váltás után sem kapcsolhat vissza a régi lecke. A
        // generáció-növelés a már REPÜLŐBEN lévő kérések válaszát is érvényteleníti.
        loadGenerationRef.current += 1
        clearRefreshTimer()
        setActiveRef(lessonRef)
        setMarkError(null)
      }

      // Szöveges lecke és külső link: NINCS jegykiadás és NINCS iframe. A
      // jegykérés videó-azonosító nélkül hibát adna, a felület pedig fölöslegesen
      // mutatna „nem érhető el" üzenetet egy tökéletesen olvasható leckén.
      if (lesson.kind !== 'video') {
        if (!isRefresh) {
          setState({ kind: 'idle' })
        }
        return
      }

      if (!isRefresh) {
        setState({ kind: 'loading', lessonRef })
      }
      const generation = loadGenerationRef.current

      // A STABIL ref megy ki, sosem sorszám (lásd a komponens fejlécét, 3. pont).
      const result = await fetchStreamToken({ productId: product.id, videoId: lesson.ref })

      if (generation !== loadGenerationRef.current) {
        // Kései válasz: a felhasználó időközben másik leckét nyitott.
        return
      }

      if (result.kind === 'forbidden') {
        setState({ kind: 'forbidden' })
        return
      }
      if (result.kind === 'unavailable') {
        setState({ kind: 'unavailable' })
        return
      }
      if (result.kind === 'error') {
        setState({ kind: 'error', message: result.message })
        return
      }

      clearRefreshTimer()
      const expiresAtEpochSec = result.expiresAtEpochSec
      const nowSec = Math.floor(Date.now() / 1000)
      const refreshInSec = Math.max(
        30,
        expiresAtEpochSec - nowSec - TOKEN_REFRESH_BEFORE_EXPIRY_SEC,
      )
      refreshTimerRef.current = window.setTimeout(() => {
        void loadLessonRef.current?.(lessonRef, true)
      }, refreshInSec * 1000)

      const nextSrc = streamIframeSrc({
        libraryId: process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID,
        streamAssetId: lesson.streamAssetId,
        token: result.token,
        expiresAtEpochSec,
      })
      // A token-frissítés NEM cseréli az iframe src-jét (nincs újramount, nincs
      // pozícióvesztés) — a szabály a tiszta, tesztelt segédfüggvényé.
      setState((current) => ({
        kind: 'playing',
        lessonRef,
        ...mergePlayingSession(
          current.kind === 'playing' && current.lessonRef === lessonRef ? current : null,
          {
            videoIndex: lesson.flatIndex,
            token: result.token,
            expiresAtEpochSec,
            src: nextSrc,
          },
          isRefresh,
        ),
      }))
    },
    [clearRefreshTimer, curriculum, hasAccess, product.id],
  )

  // A ref mindig a legutóbbi renderben létrejött loadLesson-t tartja.
  useEffect(() => {
    loadLessonRef.current = loadLesson
  }, [loadLesson])

  // Mountkori automatikus indítás. A react-hooks/set-state-in-effect ezt a
  // hívást megjelöli (a `loadLesson` tranzitíven setState-et hív) — a szabály
  // erre a fájlra warn-ra van állítva az eslint.config.mjs-ben, indoklással.
  useEffect(() => {
    if (hasAccess && activeRef !== null && state.kind === 'idle') {
      void loadLesson(activeRef)
    }
    return clearRefreshTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess])

  // A megőrzött modul-nyitottság csak a HIDRATÁLÁS UTÁN kerül be: a
  // localStorage a szerveren nem létezik, így a kezdőállapotba építve
  // hidratálási eltérést okozna.
  useEffect(() => {
    const stored = readModuleState(safeLocalStorage(), storageKey)
    if (stored === null) {
      return
    }
    setOpenModuleIds(new Set(mergeModuleState(curriculum, stored, activeRef)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  /**
   * Lecke-váltáskor a fókusz a lecke címére ugrik. Az ELSŐ renderen nem: az
   * oldal betöltése nem lecke-váltás, és a fókusz elrablása ott a
   * billentyűzetes és a képernyőolvasós navigációt is elrontaná.
   */
  useEffect(() => {
    if (focusedLessonRef.current === activeRef) {
      return
    }
    focusedLessonRef.current = activeRef
    headingRef.current?.focus()
  }, [activeRef])

  // A mobil panel nyitva: a fókusz a panelre kerül, és a háttér nem görög.
  useEffect(() => {
    if (!railOpen) {
      return
    }
    railPanelRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [railOpen])

  // Asztali szélességre váltva a modális panelnek nincs értelme: a rail ott
  // amúgy is látszik, a `role="dialog"` viszont ott maradna a DOM-ban.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia('(min-width: 1024px)')
    const handleChange = () => {
      if (query.matches) {
        setRailOpen(false)
      }
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const closeRail = useCallback(() => {
    setRailOpen(false)
    railToggleRef.current?.focus()
  }, [])

  const handleToggleModule = useCallback(
    (moduleId: string) => {
      const next = new Set(openModuleIds)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      setOpenModuleIds(next)
      writeModuleState(safeLocalStorage(), storageKey, next)
    },
    [openModuleIds, storageKey],
  )

  const handleSelectLesson = useCallback(
    (lessonRef: string) => {
      // Mobilon a választás zárja a panelt; a fókusz NEM a megnyitó gombra tér
      // vissza, hanem a lecke címére (azt a váltás-effekt intézi).
      setRailOpen(false)
      void loadLesson(lessonRef)
    },
    [loadLesson],
  )

  const handlePrimary = useCallback(() => {
    if (primary === null || primary.disabled) {
      return
    }
    const currentRef = activeRef
    if (primary.marksWatched && currentRef !== null) {
      // Bejelentés CSAK akkor, ha nem lépünk tovább (lásd a fejléc utolsó blokkját).
      void markWatched(currentRef, primary.targetRef === null)
    }
    if (primary.targetRef !== null) {
      void loadLesson(primary.targetRef)
    }
  }, [activeRef, loadLesson, markWatched, primary])

  /** Fókusz-csapda + Escape a modális tananyag-panelen. */
  const handleRailKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!railOpen) {
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRail()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      const panel = railPanelRef.current
      if (panel === null) {
        return
      }
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [closeRail, railOpen],
  )

  if (!hasAccess) {
    return (
      <Card className="kc-player-gate">
        <h1 className="kc-player-gate__title">
          {expiredMessage === null
            ? 'Nincs hozzáférésed ehhez a kurzushoz'
            : 'Lejárt a hozzáférésed'}
        </h1>
        <p>
          {expiredMessage ??
            'A videók megtekintéséhez a kurzus megvásárlása szükséges. Ha már megvetted, jelentkezz be azzal a fiókkal, amellyel vásároltad.'}
        </p>
        <Button href={courseHref(product)}>A kurzus megtekintése</Button>
      </Card>
    )
  }

  if (progress.total === 0) {
    return (
      <Card className="kc-player-gate">
        <h1 className="kc-player-gate__title">{product.title}</h1>
        <p>A tananyag feltöltése és feldolgozása folyamatban van — nézz vissza hamarosan.</p>
        <Button href="/kurzusaim" variant="secondary">
          Vissza a kurzusaimhoz
        </Button>
      </Card>
    )
  }

  const progressValueText = `${progress.completed} lecke kész a ${progress.total}-${elativeSuffix(progress.total)}`
  // Az iframe src-je a BETÖLTÉSKORI embed-URL (`loadedSrc`): a token-frissítés a
  // tárolt jegyet újítja, de az src-t NEM — így a lejátszó nem mountol újra, a
  // pozíció megmarad.
  const playingSrc =
    state.kind === 'playing' && state.lessonRef === activeRef ? state.loadedSrc : null
  const isVideoLesson = activeLesson?.kind === 'video'
  const activeDuration = formatLessonDuration(activeLesson?.durationSec ?? null)
  const busy = activeRef !== null && pending.has(activeRef)

  return (
    <div className="kc-player">
      {/* ── STICKY KURZUS-FEJLÉC ─────────────────────────────────────────────
          Nem rejtőzik el görgetéskor (a rejtőzködő fejléc a visszatéréskor
          „elveszett" érzést kelt), explicit háttérszínt visel, és a magassága
          CSS-változó: a rail sticky-topja és a fókusz scroll-margója EBBŐL
          származik (WCAG 2.2 2.4.11 — a sticky sáv nem takarhatja el a
          fókuszált elemet). */}
      <header className="kc-player__header">
        <div className="kc-player__header-row">
          <Link className="kc-player__back" href="/kurzusaim">
            <ArrowIcon direction="vissza" />
            <span>Kurzusaim</span>
          </Link>
          <p className="kc-player__course-title">{product.title}</p>
          <button
            aria-haspopup="dialog"
            className="kc-player__rail-toggle"
            onClick={() => setRailOpen(true)}
            ref={railToggleRef}
            type="button"
          >
            Tananyag
            <span aria-hidden="true"> · {progress.completed}/{progress.total}</span>
            <span className="kc-sr-only">, {progressValueText}</span>
          </button>
          <p className="kc-player__progress-text">
            <span aria-hidden="true">
              {progress.label} · {progress.percent}%
            </span>
            <span className="kc-sr-only">{progressValueText}</span>
          </p>
        </div>
        <ProgressBar
          className="kc-player__progress-bar"
          percent={progress.percent}
          size="sm"
          valueText={progressValueText}
        />
      </header>

      <div className="kc-player__layout">
        {/* ── SZÍNPAD ───────────────────────────────────────────────────────
            A DOM-sorrend a mobil fontossági sorrend: videó → cím → akciósáv →
            tartalom. Asztali nézetben ugyanez a sorrend marad (a rail CSS-sel
            kerül balra), tehát a fókusz-sorrend és a vizuális sorrend nem
            válik szét (WCAG 1.3.2). */}
        <div className="kc-player__stage">
          {progress.complete ? (
            <p className="kc-player__done-banner">
              <span>
                Elvégezted a kurzust — {progress.total} lecke kész. Bármikor visszatérhetsz
                bármelyik leckéhez.
              </span>
              <Link href="/kurzusaim">Vissza a kurzusaimhoz</Link>
            </p>
          ) : null}

          {isVideoLesson ? (
            <div className="kc-player__media">
              {state.kind === 'loading' ? (
                <p className="kc-player__media-note">A videó betöltése…</p>
              ) : null}
              {playingSrc !== null && activeLesson !== null ? (
                <iframe
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="kc-player__frame"
                  key={playingSrc}
                  src={playingSrc}
                  title={`${product.title} — ${activeLesson.title}`}
                />
              ) : null}
              {state.kind === 'forbidden' ? (
                <p className="kc-player__media-error" role="alert">
                  Nincs hozzáférésed ehhez a videóhoz.
                </p>
              ) : null}
              {/* A hiányzó library-id (playingSrc === null) ugyanide fut be:
                  érvényes jegy mellett is némán törött iframe jönne belőle. */}
              {state.kind === 'unavailable' ||
              (state.kind === 'playing' && state.loadedSrc === null) ? (
                <p className="kc-player__media-error" role="alert">
                  A videólejátszás ideiglenesen nem érhető el. Próbáld később.
                </p>
              ) : null}
              {state.kind === 'error' ? (
                <p className="kc-player__media-error" role="alert">
                  {state.message}
                  {activeRef === null ? null : (
                    <Button onClick={() => void loadLesson(activeRef)} size="sm" variant="secondary">
                      Újrapróbálom
                    </Button>
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="kc-player__lesson-head">
            <h1 className="kc-player__lesson-title" ref={headingRef} tabIndex={-1}>
              {activeLesson?.title ?? product.title}
            </h1>
            <p className="kc-player__lesson-meta">
              {activeLesson === null
                ? null
                : `${activeLesson.moduleIndex + 1}. modul · ${activeLesson.indexInModule + 1}. lecke`}
              {activeDuration === null ? null : ` · ${activeDuration}`}
            </p>
            {activeLesson?.summary ? (
              <p className="kc-player__lesson-summary">{activeLesson.summary}</p>
            ) : null}
          </div>

          <PlayerActions
            busy={busy}
            onPrevious={(lessonRef) => void loadLesson(lessonRef)}
            onPrimary={handlePrimary}
            previous={previous}
            primary={primary}
          />

          {markError === null ? null : (
            <p className="kc-player__mark-error" role="alert">
              {markError}
            </p>
          )}

          {activeLesson === null ? null : <LessonBody lesson={activeLesson} />}
        </div>

        {/* ── TANANYAG-RAIL ────────────────────────────────────────────────
            Egyetlen példány: asztali nézetben oldalsáv, mobilon (a `railOpen`
            állapottal) teljes képernyős, modális panel. A `role="dialog"` CSAK
            nyitott állapotban kerül rá — asztali nézetben a `railOpen` sosem
            igaz, mert a megnyitó gomb ott nincs megjelenítve. */}
        {railOpen ? (
          <div aria-hidden="true" className="kc-player__scrim" onClick={closeRail} />
        ) : null}
        <div
          className={[
            'kc-player__rail-panel',
            railOpen ? 'kc-player__rail-panel--open' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          onKeyDown={handleRailKeyDown}
          ref={railPanelRef}
          {...(railOpen
            ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': railTitleId, tabIndex: -1 }
            : {})}
        >
          <div className="kc-player__rail-head">
            <h2 className="kc-player__rail-title" id={railTitleId}>
              Tananyag
            </h2>
            <button className="kc-player__rail-close" onClick={closeRail} type="button">
              <CloseIcon />
              <span className="kc-sr-only">Tananyag bezárása</span>
            </button>
          </div>
          <CurriculumRail
            activeRef={activeRef}
            curriculum={curriculum}
            idPrefix={idPrefix}
            onSelectLesson={handleSelectLesson}
            onToggleModule={handleToggleModule}
            openModuleIds={openModuleIds}
            progress={progress}
            watched={watched}
          />
        </div>
      </div>

      {/* EGYETLEN, MINDIG jelen lévő élő régió — feltételes rendereléssel a
          képernyőolvasó nem venné észre a szöveg megjelenését. */}
      <div aria-live="polite" className="kc-sr-only" role="status">
        {announcement}
      </div>
    </div>
  )
}
