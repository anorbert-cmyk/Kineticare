'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { capturePageView } from '@/lib/analytics/posthog'

/**
 * PostHogPageView — $pageview küldés App Router route-váltásokra.
 *
 * Az init capture_pageview:false-szel fut (a SPA-navigációt a Next router
 * kezeli, a posthog-js History-patche önmagában nem érzékeli megbízhatóan),
 * ezért itt, a pathname+searchParams figyelésével küldjük manuálisan.
 * A useSearchParams miatt a szülőben <Suspense>-be kerül (Next build-szabály).
 */
export function PostHogPageView(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) {
      return
    }
    const query = searchParams?.toString()
    capturePageView(query ? `${pathname}?${query}` : pathname)
  }, [pathname, searchParams])

  return null
}
