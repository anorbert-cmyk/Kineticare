'use client'

import { useEffect, useRef } from 'react'

import { createBunnyPlayerBridge } from '../../../lib/stream/playerjs-client'
import { createWatchTracker } from '../../../lib/stream/watched-coverage'
import { logger } from '../../../lib/logger'

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
 * ═══ MIÉRT NEM A BUNNY SCRIPTJE ═══
 * A hivatalos player.js scriptet a CSP `script-src` direktívája nem engedi
 * betölteni (src/lib/security/csp.ts), és a CSP lazítása biztonsági regresszió
 * lenne. Ezért a protokollt saját, függőség nélküli postMessage-kliens beszéli
 * (src/lib/stream/playerjs-client.ts), szigorú origin-ellenőrzéssel.
 *
 * ═══ MIÉRT NEM SZÁMÍT A SZKIPPELÉS ═══
 * A követő MEGNÉZETT INTERVALLUMOKAT tart nyilván, nem a legnagyobb elért
 * időpontot: aki a videó végére teker, 2 másodpercnyi nézettséget kap, nem
 * 100%-ot (src/lib/stream/watched-coverage.ts).
 *
 * ═══ ÉLETCIKLUS ═══
 * Az `iframeSrc` minden EXPLICIT lecke-betöltésnél változik (a token-frissítés
 * SZÁNDÉKOSAN nem cseréli — az újramount pozícióvesztéssel járna), ezért a híd
 * és a követő is ehhez a kulcshoz kötődik: lecke-váltáskor a régi híd
 * leiratkozik, és ÚJ, nullázott követő indul. Így az előző lecke nézettsége
 * nem szivároghat át a következőre.
 *
 * A jelentés a `report` visszahíváson megy vissza a lejátszóba; a küszöb-döntést
 * és a tényleges szerverhívást ott, EGY helyen hozza meg a
 * `shouldAutoMarkWatched` + `markWatched` páros — az automatikus és a kézi
 * jelölés így definíció szerint ugyanazt az utat járja.
 */
export interface WatchTrackingInput {
  /** Az iframe elem — a híd ennek a contentWindow-jára küld üzenetet. */
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  /** Az iframe által BETÖLTÖTT embed-URL; változása = új lecke indult. */
  iframeSrc: string | null
  /** A JELENLEG lejátszott lecke stabil refje. */
  lessonRef: string | null
  /** A lecke CMS-ben rögzített hossza (a Bunny is küld hosszt — az pontosabb). */
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
    let utoljaraJelentett = -1

    const bridge = createBunnyPlayerBridge({
      iframe,
      onTimeUpdate: ({ seconds, duration }) => {
        // A lejátszótól kapott hossz pontosabb, mint a CMS-ben rögzített:
        // az utóbbi elgépelhető, és a jegy élettartamát is az hajtja.
        tracker.setDuration(duration ?? durationSec)
        tracker.record(seconds)
        const arany = tracker.coverage()
        // Csak ÉRDEMI változásnál jelentünk (1 százalékpont): a `timeupdate`
        // másodpercenként többször is érkezhet, a lejátszó állapotát pedig nem
        // akarjuk fölöslegesen újraszámoltatni.
        if (arany - utoljaraJelentett >= 0.01 || arany >= 1) {
          utoljaraJelentett = arany
          reportRef.current(lessonRef, arany)
        }
      },
      onEnded: () => {
        // A videó végigfutott: a lefedettség ilyenkor is a MÉRT érték marad
        // (aki átugrott szakaszokat, nem kap 100%-ot) — de a jelentés
        // mindenképp megtörténik, hogy a küszöb elérése ne múljon egy
        // elmaradt utolsó `timeupdate`-en.
        reportRef.current(lessonRef, tracker.coverage())
      },
      onError: (error) => {
        logger.debug('lejátszó: player.js üzenet feldolgozása sikertelen', {
          error: error instanceof Error ? error.message : String(error),
        })
      },
    })

    return () => {
      bridge.dispose()
      tracker.reset()
    }
    // Az `iframeSrc` a lecke-váltás kulcsa: a token-frissítés NEM változtatja,
    // az explicit betöltés igen — pontosan ekkor kell új követő.
  }, [durationSec, iframeRef, iframeSrc, lessonRef])
}
