'use client'

import { useEffect, useRef } from 'react'

import { trackVideoMilestone, trackVideoStarted } from '../../../lib/analytics/course-events'
import { createBunnyPlayerBridge } from '../../../lib/stream/playerjs-client'
import { loadBunnyPlayerJs, type PlayerJsLibraryPlayer } from '../../../lib/stream/playerjs-loader'
import { createWatchTracker } from '../../../lib/stream/watched-coverage'

import {
  createVideoDepthTracker,
  type VideoDepthEvents,
  type VideoDepthTracker,
} from './analytics'

/**
 * AUTOMATIKUS „megnézett" jelölés a Bunny-lejátszó tényleges nézettsége alapján.
 *
 * ═══ MIÉRT KELL ═══
 * A kézi „megjelölöm megnézettnek" gomb elfelejtődik: a haladás alulmér, és az
 * admin haladás-nézet (és a leckénkénti lemorzsolódás) használhatatlanná válik.
 * A tisztán automatikus, MEGNYITÁS-alapú jelölés viszont felfújja a számokat.
 * Ezért HIBRID a megoldás: a lecke akkor jelölődik késznek magától, ha a videó
 * legalább 90%-a TÉNYLEGESEN lement — a kézi gomb mellette végig megmarad.
 *
 * ═══ KÉT ÚT, HÁROM RÉTEG ═══
 * 1. ELSŐDLEGES: a Bunny HIVATALOS player.js könyvtára (./playerjs-loader.ts),
 *    rögzített verzióról, integritás-hash-sel. Ez a Bunny által dokumentált út.
 * 2. TARTALÉK: a saját, függőség nélküli postMessage-hidunk
 *    (./playerjs-client.ts). A protokoll-konstansaink bájtra egyeznek a Bunny
 *    által szállított fájléval (`VERSION: "0.0.11"`, `CONTEXT: "player.js"`),
 *    tehát ez egyenértékű út, nem vészmegoldás.
 * 3. VÉGSŐ TARTALÉK (kódot nem igényel): ha EGYIK sem szólal meg, a vevő a
 *    lejátszó elsődleges gombjával („Kész, tovább") jelöli késznek a leckét —
 *    pontosan úgy, ahogy a mai platformon. Élesben lemérve: a haladás így is
 *    rögzül, a kurzus végigvihető.
 *
 * ═══ MIÉRT A TARTALÉK INDUL ELŐSZÖR ═══
 * A tartalék híd AZONNAL, a hivatalos könyvtár betöltése KÖZBEN felépül. A code
 * review mérte a rést: ha a híd csak a betöltés lezárása után épülne, a
 * betöltés (legfeljebb 8 mp-es időkorlát) alatt SENKI nem hallgatná a
 * lejátszót, és a videó első másodpercei kimaradnának a mérésből — rövid
 * leckénél ez a 90%-os küszöböt is elviheti. A hivatalos könyvtár megérkezése
 * után a tartalék LEBOMLIK, és a hivatalos veszi át; a rövid váltásból nem
 * veszik esemény, mert a követő intervallum-alapú és idempotens. A két út így
 * sem fut tartósan együtt: mindig pontosan egy hallgat.
 *
 * ═══ MIÉRT NEM SZÁMÍT A SZKIPPELÉS ═══
 * A követő MEGNÉZETT INTERVALLUMOKAT tart nyilván, nem a legnagyobb elért
 * időpontot: aki a videó végére teker, néhány másodpercnyi nézettséget kap, nem
 * 100%-ot (src/lib/stream/watched-coverage.ts).
 *
 * ═══ ÉLETCIKLUS ═══
 * Az `iframeSrc` minden EXPLICIT lecke-betöltésnél változik (a token-frissítés
 * SZÁNDÉKOSAN nem cseréli — az újramount pozícióvesztéssel járna), ezért a
 * követő ehhez a kulcshoz kötődik: lecke-váltáskor a régi feliratkozás
 * megszűnik, és ÚJ, nullázott követő indul. Így az előző lecke nézettsége nem
 * szivároghat át a következőre.
 *
 * A DÖNTÉST és a szerverhívást nem ez a modul hozza: a `report` visszahíváson
 * jelentünk a lejátszónak, ott dől el a küszöb (`shouldAutoMarkWatched`) és ott
 * fut a jelölés — UGYANAZ az út, amit a kézi gomb hív.
 *
 * ═══ VIDEÓ-MÉLYSÉG (video_started / video_milestone) ═══
 * UGYANEZEKRE a lejátszó-eseményekre épül a tölcsér mélység-mérése is —
 * szándékosan nem külön, párhuzamos követővel: egy második figyelő külön
 * feliratkozást, külön életciklust és eltérő igazságot jelentene ugyanarról a
 * videóról. A DÖNTÉS (mi az új esemény, mi ment már ki) tiszta modulban él
 * (./analytics.ts — `createVideoDepthTracker`), itt csak a huzalozás van.
 *
 * A RETESZ LECKÉNKÉNT él és a KOMPONENS ÉLETTARTAMÁIG kitart (lentebb:
 * `melysegRef`), nem az effekt lefutásáig. Így a leckére VISSZATÉRÉS
 * (A → B → A) sem küldi újra sem az indulást, sem a már elért mérföldköveket.
 *
 * A mérés SOSEM ronthatja el a lejátszást: minden küldés `try/catch`-ben fut.
 * Naplózni innen nem tudunk (a `src/lib/logger.ts` a szerver stdoutjára ír) —
 * ugyanaz a csendes elv, mint a player.js-híd `onError`-jánál.
 */
export interface WatchTrackingInput {
  /**
   * A kurzus adatbázis-azonosítója a videó-mélység eseményekhez. `null`, ha
   * ismeretlen — ilyenkor mérföldkő NEM megy ki (azonosító nélkül a riport
   * nem köthető kurzushoz). Személyes adat nem kerül az eseményekbe.
   */
  courseId: number | null
  /** Az iframe elem — erre iratkozik fel a hivatalos könyvtár és a tartalék híd is. */
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  /** Az iframe által BETÖLTÖTT embed-URL; változása = új lecke indult. */
  iframeSrc: string | null
  /** A JELENLEG lejátszott lecke stabil refje. */
  lessonRef: string | null
  /** A lecke CMS-ben rögzített hossza (a lejátszótól kapott hossz pontosabb). */
  durationSec: number | null
  /** Jelentés a lejátszónak: hányad része ment le a leckének (0–1). */
  report: (lessonRef: string, watchedRatio: number) => void
}

export function useWatchTracking({
  courseId,
  durationSec,
  iframeRef,
  iframeSrc,
  lessonRef,
  report,
}: WatchTrackingInput): void {
  // A jelentő MINDIG a legfrissebb változatra mutat, hogy az effekt ne
  // iratkozzon fel újra minden renderben (a lejátszó pozíciója így nem ugrik).
  const reportRef = useRef(report)
  useEffect(() => {
    reportRef.current = report
  }, [report])

  /**
   * Lecke → mélység-követő (a RETESZ tárolója). Azért ref és azért LECKÉNKÉNT,
   * mert a reteszt nem az effekt lefutásához, hanem a leckéhez kell kötni: az
   * effekt lecke-váltáskor és `iframeSrc`-változáskor újraindul, a már
   * elküldött mérföldköveket viszont ilyenkor sem szabad újraküldeni.
   */
  const melysegRef = useRef(new Map<string, VideoDepthTracker>())

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe === null || iframeSrc === null || lessonRef === null) {
      return
    }

    const tracker = createWatchTracker(durationSec)
    // Leckénként EGY követő: a meglévő retesz megmarad, új leckéhez új követő.
    const melyseg = melysegRef.current.get(lessonRef) ?? createVideoDepthTracker()
    melysegRef.current.set(lessonRef, melyseg)
    let eldobva = false
    let utoljaraJelentett = -1
    let tartalekHid: { dispose(): void } | null = null
    let hivatalosPlayer: PlayerJsLibraryPlayer | null = null

    /**
     * A mélység-események KIKÜLDÉSE. A követő már csak az ÚJ (még nem küldött)
     * eseményeket adja vissza, itt tehát nincs több szűrés — csak a védőháló,
     * hogy a mérés hibája ne érje el a nézőt.
     */
    const melysegetKuld = (events: VideoDepthEvents): void => {
      if (courseId === null) {
        return
      }
      try {
        if (events.started) {
          trackVideoStarted({ courseId, lessonRef })
        }
        for (const percent of events.milestones) {
          trackVideoMilestone({ courseId, lessonRef, percent })
        }
      } catch {
        // A mérés hibája nem akaszthatja meg a lejátszást.
      }
    }

    /** Egy időpont rögzítése és — érdemi változásnál — jelentés a lejátszónak. */
    const rogzit = (seconds: number, duration: number | null): void => {
      if (eldobva) {
        return
      }
      // A MÉLYSÉG a lejátszófej pozíciójából számol, a lefedettségtől
      // függetlenül (a kettő szándékosan más mérőszám — ./analytics.ts).
      melysegetKuld(melyseg.position({ seconds, duration: duration ?? durationSec }))
      tracker.setDuration(duration ?? durationSec)
      // A falióra-időbélyeg a tekerés-védelem második rétege: a valós időnél
      // gyorsabb média-előrehaladás tekerésnek számít, a megtanult küszöbtől
      // függetlenül (watched-coverage.ts, falióra-szabály).
      tracker.record(
        seconds,
        typeof performance === 'undefined' ? undefined : performance.now(),
      )
      const arany = tracker.coverage()
      // A `timeupdate` másodpercenként többször is érkezhet; csak 1
      // százalékpontonként (és a 100%-nál) terheljük a lejátszó állapotát.
      if (arany - utoljaraJelentett >= 0.01 || arany >= 1) {
        utoljaraJelentett = arany
        reportRef.current(lessonRef, arany)
      }
    }

    /** A videó vége: a MÉRT arányt jelentjük (a szkippelt rész nem számít bele). */
    const vegetErt = (): void => {
      if (!eldobva) {
        melysegetKuld(melyseg.ended())
        reportRef.current(lessonRef, tracker.coverage())
      }
    }

    /** A saját postMessage-híd felépítése — ha még nincs. */
    const tartalekotEpit = (): void => {
      if (eldobva || tartalekHid !== null) {
        return
      }
      tartalekHid = createBunnyPlayerBridge({
        iframe,
        onTimeUpdate: ({ seconds, duration }) => rogzit(seconds, duration),
        onEnded: vegetErt,
        // Csendes: egy hibás üzenet nem akaszthatja meg a lejátszást.
        onError: () => {},
      })
    }

    // A tartalék AZONNAL hallgat — a hivatalos könyvtár betöltése alatt (max
    // 8 mp) sem veszhet el nézettség (lásd a fejkomment indoklását).
    tartalekotEpit()

    void loadBunnyPlayerJs()
      .then((library) => {
        if (eldobva || library === null) {
          return
        }
        try {
          const player = new library.Player(iframe)
          player.on('timeupdate', (data) => {
            const seconds = typeof data.seconds === 'number' ? data.seconds : Number.NaN
            const duration = typeof data.duration === 'number' ? data.duration : null
            rogzit(seconds, duration)
          })
          player.on('ended', vegetErt)
          hivatalosPlayer = player
          // A hivatalos út él: a tartalék lebomlik, hogy sose fusson kettő.
          tartalekHid?.dispose()
          tartalekHid = null
        } catch {
          // A könyvtár váratlan alakja sem viheti el a lejátszást — a tartalék
          // híd már fut, nincs teendő.
        }
      })
      .catch(() => {
        // A tartalék híd már fut — a betöltési hiba nem igényel váltást.
      })

    return () => {
      eldobva = true
      tartalekHid?.dispose()
      // A player.js `off`-ja opcionális a könyvtár verziójától függően; ha
      // nincs, az `eldobva` kapu akkor is elnémítja a kései eseményeket.
      try {
        hivatalosPlayer?.off?.('timeupdate')
        hivatalosPlayer?.off?.('ended')
      } catch {
        // A leiratkozás hibája nem érdekes: a kapu már zárva.
      }
      tracker.reset()
    }
    // Az `iframeSrc` a lecke-váltás kulcsa: a token-frissítés NEM változtatja,
    // az explicit betöltés igen — pontosan ekkor kell új követő.
  }, [courseId, durationSec, iframeRef, iframeSrc, lessonRef])
}
