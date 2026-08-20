'use client'

import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'

import { hasStaffOrOwnerRole } from '../../access/roles'

/**
 * Videótár-link a Payload oldalsávjába. A feltöltés a Bunny felületén
 * marad; itt a library videóit lehet listázni és a GUID-ot kimásolni.
 *
 * A védelem a szerver-oldali kapu (`BunnyLibraryView` + a listázó végpont).
 */
export function BunnyLibraryNavLink() {
  const { user } = useAuth<{ id: number | string; role?: string | null }>()
  if (!hasStaffOrOwnerRole(user)) {
    return null
  }

  return (
    <div style={{ marginTop: 'calc(var(--base) * 0.25)' }}>
      <Link className="nav__link" href="/admin/videok" prefetch={false}>
        Videótár
      </Link>
    </div>
  )
}

export default BunnyLibraryNavLink
