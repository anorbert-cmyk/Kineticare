'use client'

import { useEffect, useRef } from 'react'

import { createBunnyPlayerBridge } from '../../../lib/stream/playerjs-client'
import { loadBunnyPlayerJs, type PlayerJsLibraryPlayer } from '../../../lib/stream/playerjs-loader'
import { createWatchTracker } from '../../../lib/stream/watched-coverage'

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
 * 2. TARTALÉK: ha a könyvtár nem töltődik be (hálózati hiba, integritás-hiba,
 *    blokkoló böngésző-bővítmény), a saját, függőség nélküli postMessage-hidunk
 *    veszi át (./playerjs-client.ts). A protokoll-konstansaink bájtra egyeznek
 *    a Bunny által szállított fájléval (`VERSION: "0.0.11"`,
 *    `CONTEXT: "player.js"`), tehát ez egyenértékű út, nem vészmegoldás.
 * 3. VÉGSŐ TARTALÉK (kódot nem igényel): ha EGYIK sem szólal meg, a vevő a
 *    lejátszó elsődleges gombjával („Kész, tovább") jelöli késznek a leckét —
 *    pontosan úgy, ahogy a mai platformon. Élesben lemérve: a haladás így is
 *    rögzül, a kurzus végigvihető.
 * A két esemény-út SOSEM fut egyszerre: a tartalék csak akkor épül fel, ha a
 * hivatalos betöltés elbukott.
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
 */
export interface WatchTrackingInput {
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

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe === null || iframeSrc === null || lessonRef === null) {
      return
    }

    const tracker = createWatchTracker(durationSec)
    let eldobva = false
    let utoljaraJelentett = -1
    let tartalekHid: { dispose(): void } | null = null
    let hivatalosPlayer: PlayerJsLibraryPlayer | null = null

    /** Egy időpont rögzítése és — érdemi változásnál — jelentés a lejátszónak. */
    const rogzit = (seconds: number, duration: number | null): void => {
      if (eldobva) {
        return
      }
      tracker.setDuration(duration ?? durationSec)
      tracker.record(seconds)
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
        reportRef.current(lessonRef, tracker.coverage())
      }
    }

    /** A saját postMessage-híd felépítése — csak ha a hivatalos út elbukott. */
    const tartalekraValt = (): void => {
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

    void loadBunnyPlayerJs()
      .then((library) => {
        if (eldobva) {
          return
        }
        if (library === null) {
          tartalekraValt()
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
        } catch {
          // A könyvtár váratlan alakja sem viheti el a lejátszást.
          tartalekraValt()
        }
      })
      .catch(() => {
        tartalekraValt()
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
  }, [durationSec, iframeRef, iframeSrc, lessonRef])
}
