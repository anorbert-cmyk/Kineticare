import type { Metadata } from 'next'

import { NotFoundView } from '@/components/error/NotFoundView'

/**
 * A `(frontend)` route-group „nem található" határa: ide fut minden SAJÁT
 * route-unk `notFound()` hívása (`/[slug]`, `/kurzusok/[slug]`, `/blog/[slug]`,
 * `/blog/kategoria/[slug]`). A fejlécet és a láblécet a `(frontend)` layout
 * adja, ezért itt csak a törzs áll.
 *
 * MÉRT KORLÁT (Next.js 16.3.0, 2026-08-16, reprodukálva üres, minimál appban
 * is): a `notFound()` által kiváltott 404 KEZDŐ HTML-je a szerveren üres
 * marad — a Next `<html id="__next_error__">` vázat küld, és a tényleges
 * tartalmat a kliens rendereli az RSC-adatból. Ez nem ennek a fájlnak a hibája
 * és nem konfigurációs hiba: a React hibahatárai (itt:
 * `HTTPAccessFallbackBoundary`) szerver-oldali renderelés közben nem futnak le.
 * A státuszkód helyesen 404, és a Next `noindex` meta-taget tesz a válaszba:
 * https://nextjs.org/docs/app/api-reference/file-conventions/loading#status-codes
 *
 * Ezért a NEM ILLESZKEDŐ URL-eket (`/egy/ket/harom`) nem erre a határra bízzuk,
 * hanem a `src/app/global-not-found.tsx`-re, ami a szerveren teljes,
 * JS nélkül is olvasható HTML-t ad. A két lap SZÖVEGE közös
 * (`src/components/error/not-found-content.ts`).
 */
export const metadata: Metadata = {
  // A látható szövegben nincs „404" (GOV.UK: a szakzsargon kerülendő), a
  // böngészőfülön viszont a rövid, azonosító cím a hasznos (WCAG 2.2 · 2.4.2
  // Page Titled): https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html
  title: 'Ez az oldal nem található',
}

export default function NotFound() {
  return <NotFoundView />
}
