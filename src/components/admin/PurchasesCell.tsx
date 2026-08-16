'use client'

import { useEffect, useState } from 'react'

import { loadCourseTitles } from './course-titles-client'
import { formatPurchaseLabels } from './purchases-cell'

/**
 * A Felhasználók admin-lista „Megvásárolt kurzusok" oszlopának cellája.
 *
 * A tulajdonos első listakérdése: KI MIT VETT MEG. A gyári relationship-cella
 * a kurzusok `useAsTitle` mezőjével (`sku`) címkéz — ez technikai azonosító,
 * nem beszédes. Ez a cella a kurzus CÍMÉT írja ki (`displayTitle` → `sku` →
 * `Kurzus #id`), a címeket pedig a `loadCourseTitles` egyetlen, megosztott
 * kéréssel tölti be (oldalanként egy hálózati kör, akárhány sor van).
 *
 * A formázás a tiszta, egységtesztelt `purchases-cell.ts`-ben él; ez a
 * komponens csak renderel.
 */
export function PurchasesCell({ cellData }: { cellData?: unknown }) {
  const [titles, setTitles] = useState<ReadonlyMap<string, string>>(() => new Map())

  useEffect(() => {
    let active = true
    void loadCourseTitles().then((loaded) => {
      if (active) {
        setTitles(loaded)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const lines = formatPurchaseLabels(cellData, titles)
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {lines.map((line, index) => (
        // A kulcs a sorindex: két azonos című kurzus is előfordulhat.
        <li key={index} style={{ whiteSpace: 'nowrap' }}>
          {line}
        </li>
      ))}
    </ul>
  )
}

export default PurchasesCell
