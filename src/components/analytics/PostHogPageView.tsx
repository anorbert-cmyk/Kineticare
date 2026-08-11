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
 * A kimenő URL-t a capture-határ tisztítja (M9): a jelszó-visszaállító jegy
 * és bármely jövőbeli érzékeny query-paraméter kivágásra kerül, a kampány-
 * paraméterek megmaradnak — src/lib/analytics/page-url.ts.
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
