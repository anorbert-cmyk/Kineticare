'use client'

import { useEffect } from 'react'

import { trackPageView, type BarionList } from '@/lib/analytics/barion-events'

/**
 * BarionPageView — a NEM termék oldalak Barion Pixel `contentView` eseménye.
 *
 * ═══ MIÉRT KELL A TERMÉKOLDALON KÍVÜL IS ═══
 * A `contentView` a Barion egyetlen „itt jár a látogató” jelzése. Ha csak a
 * kurzus-oldalak küldik, a Barion a forgalom többségét (kezdőlap, kurzuslista,
 * Tudástár) egyáltalán nem látja — a csalásmegelőző pontozás és a tölcsér
 * eleje egyszerre marad vak.
 *
 * ═══ MIÉRT KÜLÖN KOMPONENS, ÉS MIÉRT NEM A LAYOUTBAN ═══
 * A kurzus-oldal `contentView`-ját a `components/courses/CourseBarionView.tsx`
 * küldi, `contentType: 'Product'` ágon, a kötelező ár-mezőkkel. Ha ez a
 * komponens a `(frontend)` layoutba kerülne, MINDEN oldalon futna — a
 * termékoldalon is —, és ott két `contentView` menne ki ugyanarra az
 * oldalletöltésre: egy Product és egy Page. A Barion mindkettőt elfogadná, a
 * riport pedig némán duplázna. Ezért a bekötés OLDALANKÉNT, kézzel történik,
 * és a kurzus-oldal (`/kurzusok/[slug]`) SZÁNDÉKOSAN kimarad belőle. Ezt
 * őr-teszt tartja fenn (src/__tests__/barion-signup-es-oldalnezet.test.ts).
 *
 * ═══ SZERZŐDÉS ═══
 * A törzs összeállítása és a kulcs-készlet a
 * `src/lib/analytics/barion-events.ts` modulban él (a hívási alak forrása is
 * ott van dokumentálva). Ez a komponens csak a mountot köti az eseményhez.
 *
 * KLIENS-KOMPONENS, mert a Pixel `window.bp`-t hív; a beágyazó oldalak
 * szerver-komponensek maradnak (a `TrackEvent` és a `CourseBarionView`
 * mintája).
 *
 * A küldés SOSEM dob: a `barion-events` `sendBarionEvent` kapuja elnyeli a
 * pixel hibáit, a `bp` burkoló pedig no-op, ha a Pixel nincs betöltve.
 */
export interface BarionPageViewProps {
  /** Rövid, útvonaltól független azonosító (pl. `'kezdolap'`). */
  pageId: string
  /** A magyar, emberi oldalnév (pl. `'Kezdőlap'`). */
  pageName: string
  /** Csak akkor, ha a bp.js kötött listájából van ráillő érték. */
  list?: BarionList
}

export function BarionPageView({ pageId, pageName, list }: BarionPageViewProps): null {
  useEffect(() => {
    trackPageView({
      id: pageId,
      name: pageName,
      ...(list !== undefined ? { list } : {}),
    })
    // Mount-egyszeri küldés: útvonalváltásnál a komponens újra mountol (új
    // oldal = új megtekintés), ugyanazon az oldalon maradva viszont nem.
  }, [pageId, pageName, list])
  return null
}
