'use client'

import { useEffect } from 'react'

import { captureAnalyticsEvent, type AnalyticsEventName } from '@/lib/analytics/posthog'

/**
 * TrackEvent — mount-idejű üzleti esemény (funnel-lépések).
 *
 * Szerver-komponens oldalakba ágyazható (kliens-komponensként renderel):
 * a mount = az esemény bekövetkezése (pl. a kurzus-oldal megnyitása =
 * course_viewed; a pénztár megnyitása = checkout_started). No-op, ha az
 * analitika nincs konfigurálva vagy nincs hozzájárulás.
 */
export interface TrackEventProps {
  event: AnalyticsEventName
  properties?: Record<string, unknown>
}

export function TrackEvent({ event, properties }: TrackEventProps): null {
  useEffect(() => {
    captureAnalyticsEvent(event, properties)
    // A properties szándékosan NEM függőség: a mount-egyszeri küldés a cél,
    // a properties-változás nem küld új eseményt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])
  return null
}
