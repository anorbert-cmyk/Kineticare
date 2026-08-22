'use client'

import { useEffect, useState } from 'react'

import type { UserCourseProgressEntry } from '../../lib/admin/user-progress-contract'
import { loadCourseTitles } from './course-titles-client'
import { formatPurchaseRows, readRowUserId } from './purchases-cell'
import { loadUserProgress } from './user-progress-client'

/**
 * A Felhasználók admin-lista „Megvásárolt kurzusok" oszlopának cellája.
 *
 * A tulajdonos első listakérdése: KI MIT VETT MEG. A gyári relationship-cella
 * a kurzusok `useAsTitle` mezőjével (`sku`) címkéz — ez technikai azonosító,
 * nem beszédes. Ez a cella a kurzus CÍMÉT írja ki (`displayTitle` → `sku` →
 * `Kurzus #id`), a címeket pedig a `loadCourseTitles` egyetlen, megosztott
 * kéréssel tölti be (oldalanként egy hálózati kör, akárhány sor van).
 *
 * A második kérdés: HOL TART. A vezetői döntés
 * (`docs/statisztika-audit-2026-08-21.md` §2) szerint ehhez NEM jön új oszlop,
 * hanem ez a sor bővül kurzusonként:
 *
 *   Otthoni KézRehab Program · 45% · folyamatban
 *
 * A haladást a `loadUserProgress` tölti be, szintén oldalanként egyetlen
 * kérésben (a cellák azonosítói egy csomagba gyűlnek).
 *
 * ═══ HÁROM TERVEZÉSI DÖNTÉS, INDOKKAL ═══
 *
 * 1. AZ ÁLLAPOT SZÓVAL SZEREPEL, nem színnel vagy ikonnal. WCAG 2.2
 *    SC 1.4.1 (Use of Color): az információ nem múlhat kizárólag színen
 *    (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). A szót
 *    a Kurzus-haladás panel szótárából vesszük (`inlineStatusLabel` →
 *    `statusLabel`), hogy a két felület ugyanarra az állapotra ugyanazt a
 *    szót használja (WCAG 2.2 SC 3.2.4, Consistent Identification).
 *
 * 2. SEM SZÍN, SEM CHIP nem kerül a sorba: a szöveg a lista saját színét
 *    örökli. Így az admin világos és sötét témájában sincs kontraszt-
 *    kockázat (a MAI panelben épp ilyen bukás mérve: `--theme-error-500`
 *    fehéren 4,13:1, a küszöb 4,5:1 — `docs/statisztika-audit-2026-08-21.md`
 *    §0.4), és a lista sűrűjébe sem kerül új vizuális zaj. NN/g, Data Tables:
 *    a tábla akkor olvasható, ha a sorok „szkennelhetők" maradnak
 *    (https://www.nngroup.com/articles/data-tables/).
 *
 * 3. BETÖLTÉS KÖZBEN nincs pörgő és nincs helyfoglaló. A sor a haladás
 *    megérkezéséig pontosan a mai alakját mutatja (csak a cím), utána a
 *    szöveg kiegészül. Soronkénti pörgő 100 sornál 100 mozgó elemet
 *    jelentene, a helyfoglaló pedig elrendezés-ugrást okozna — mindkettő
 *    többet ártana, mint amennyit a néhány száz milliszekundum jelzése ér.
 */
export function PurchasesCell({ cellData, rowData }: { cellData?: unknown; rowData?: unknown }) {
  const [titles, setTitles] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [progress, setProgress] = useState<readonly UserCourseProgressEntry[] | null>(null)

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

  // A Payload a Cell-nek a sor TELJES dokumentumát is átadja `rowData`-ként
  // (mérve: @payloadcms/ui 3.88.0, buildColumnState/renderCell.js). A típusa
  // ott `Record<string, any>`, ezért itt `unknown`-ként vesszük át, és
  // típusszűkítéssel olvassuk ki — hiányzó azonosítónál nincs kérés, a cella
  // pedig a haladás nélküli alakjában marad.
  const userId = readRowUserId(rowData)

  useEffect(() => {
    if (userId === null) {
      return
    }
    let active = true
    void loadUserProgress(userId).then((loaded) => {
      if (active) {
        setProgress(loaded)
      }
    })
    return () => {
      active = false
    }
  }, [userId])

  const rows = formatPurchaseRows(cellData, titles, progress)
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((row, index) => (
        // A kulcs a sorindex: két azonos című kurzus is előfordulhat.
        <li key={index} style={{ whiteSpace: 'nowrap' }}>
          {row.text}
        </li>
      ))}
    </ul>
  )
}

export default PurchasesCell
