'use client'

import { useEffect } from 'react'

import { trackContentView, type BarionCourseInput } from '@/lib/analytics/barion-events'

/**
 * CourseBarionView — a kurzus-oldal Barion Pixel `contentView` eseménye.
 *
 * A kurzusoldal a Barion tölcsérének TERMÉKOLDALA, ezért az esemény
 * `contentType: 'Product'` ágon megy ki, a hozzá tartozó KÖTELEZŐ mezőkkel
 * (unitPrice, unit, currency, quantity) — a `list: 'ProductPage'` pedig
 * megmondja a Barionnak, honnan indult a látogatás. A törzs összeállítása és
 * a mezők szerződése a `src/lib/analytics/barion-events.ts` modulban él
 * (ott a hívási alak forrása is dokumentálva van); ez a komponens csak a
 * mount-eseményt köti hozzá.
 *
 * KLIENS-KOMPONENS, mert a Pixel `window.bp`-t hív. A kurzusoldal
 * szerver-komponens, ezért — a PostHog `TrackEvent` mintájára — az esemény egy
 * beágyazott, semmit sem renderelő kliens-komponensbe kerül.
 *
 * A hiányos árú (konfigurációs hibás) terméknél az esemény MAGÁTÓL kimarad: a
 * builder `null`-t ad, és csonka esemény nem megy ki. A követés emellett sosem
 * dobhat — a hívás a `barion-events` `sendBarionEvent` kapuján megy át.
 */
export interface CourseBarionViewProps {
  course: BarionCourseInput
}

export function CourseBarionView({ course }: CourseBarionViewProps): null {
  const { id, name, priceHuf, category, imageUrl } = course
  useEffect(() => {
    trackContentView(
      {
        id,
        name,
        priceHuf,
        quantity: 1,
        ...(category !== undefined && category !== null ? { category } : {}),
        ...(imageUrl !== undefined && imageUrl !== null ? { imageUrl } : {}),
      },
      { list: 'ProductPage' },
    )
    // A mount-egyszeri küldés a cél: útvonalváltásnál a komponens újra mountol,
    // ugyanazon az oldalon maradva viszont nem küldünk újabb megtekintést.
  }, [id, name, priceHuf, category, imageUrl])
  return null
}
