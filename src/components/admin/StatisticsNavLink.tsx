'use client'

import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'

import { hasStaffOrOwnerRole } from '../../access/roles'

/**
 * Statisztika-link a Payload oldalsávjába. A Payload a saját nézetet NEM
 * teszi be automatikusan a navigációba.
 *
 * A link elrejtése csak kozmetika: a védelem a szerver-oldali kapu a
 * StatisticsView-ban (`canAccessStatistics`). Be nem jelentkezett vagy
 * customer felhasználó a közvetlen URL-t is megkaphatja — ott a nézet
 * magyarul elutasít, adatot nem ad.
 */
export function StatisticsNavLink() {
  const { user } = useAuth<{ id: number | string; role?: string | null }>()
  if (!hasStaffOrOwnerRole(user)) {
    return null
  }

  return (
    <div style={{ marginTop: 'calc(var(--base) * 0.75)' }}>
      <Link className="nav__link" href="/admin/statisztika" prefetch={false}>
        Statisztika
      </Link>
    </div>
  )
}

export default StatisticsNavLink
