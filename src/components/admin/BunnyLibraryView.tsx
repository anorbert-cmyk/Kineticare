import type { CSSProperties } from 'react'
import type { AdminViewServerProps } from 'payload'

import { hasStaffOrOwnerRole } from '../../access/roles'
import { AdminChrome } from './AdminChrome'
import { BunnyLibraryPanel } from './BunnyLibraryPanel'

/**
 * Admin Videótár nézet (`/admin/videok`).
 *
 * A feltöltés a Bunny felületén marad. Itt a library videói listázhatók, a
 * GUID a kurzus leckéjébe másolható. A Payload custom view nyilvános
 * admin-route, ezért a szerver-oldali szerepkör-kapu az egyetlen védelem.
 */

const pageStyle: CSSProperties = {
  padding: 'calc(var(--base) * 1.5)',
  maxWidth: '64rem',
}

const DENIED_MESSAGE = 'Ehhez a nézethez nincs jogosultságod.'

export function BunnyLibraryView(props: AdminViewServerProps) {
  const { req } = props.initPageResult
  if (!hasStaffOrOwnerRole(req.user)) {
    return (
      <AdminChrome props={props}>
        <div style={pageStyle}>
          <h1 style={{ marginTop: 0 }}>Videótár</h1>
          <p>{DENIED_MESSAGE}</p>
        </div>
      </AdminChrome>
    )
  }

  return (
    <AdminChrome props={props}>
      <div style={pageStyle}>
        <h1 style={{ marginTop: 0 }}>Videótár</h1>
        <p style={{ color: 'var(--theme-elevation-650)', maxWidth: '42rem' }}>
          A felvételek a Bunny Stream tárban élnek. Töltsd fel őket ott, majd ide behívva másold a
          videó azonosítóját a kurzus leckéjébe. A vevő és az ingyenes kurzus nézője a meglévő
          lejátszón látja a videót — innen nem indul feltöltés.
        </p>
        <BunnyLibraryPanel />
      </div>
    </AdminChrome>
  )
}

export default BunnyLibraryView
