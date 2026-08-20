import type { AdminViewServerProps } from 'payload'

import { logger } from '../../lib/logger'
import { queryRevenueReport } from '../../lib/statistics/query'
import { canAccessStatistics, type RevenueReport } from '../../lib/statistics/revenue'
import { AdminChrome, AdminViewFrame } from './AdminChrome'
import { StatisticsAccessDenied, StatisticsReport, StatisticsUnavailable } from './StatisticsReport'

/**
 * Admin Statisztika nézet (`/admin/statisztika`) — T-013.
 *
 * ═══ VÉDELEM ═══
 * A Payload 3.86 a custom view-path-okat nyilvános admin-route-ként kezeli
 * (`isCustomAdminView`), ezért a Root view auth-átirányítása KIMARAD. A kapu
 * NEM opcionális: be nem jelentkezett látogató is eléri az URL-t. A
 * `canAccessStatistics` (staff/owner, `null` → false) az egyetlen védelem.
 *
 * ═══ ADAT ═══
 * A havi bevétel a fizetett rendelések tétel-szintű ág-bontása. A demó-seed
 * szándékosan szétosztott `paid` rendeléseket hoz létre, hogy ez a nézet
 * kitöltve jelenjen meg a demó-környezetben; élesben a valódi fizetések
 * ugyaninnen jönnek.
 */
export async function StatisticsView(props: AdminViewServerProps) {
  const { req } = props.initPageResult
  if (!canAccessStatistics(req.user)) {
    return (
      <AdminViewFrame props={props}>
        <StatisticsAccessDenied />
      </AdminViewFrame>
    )
  }

  let report: RevenueReport
  try {
    report = await queryRevenueReport({ payload: req.payload })
  } catch (error) {
    logger.error('statisztika-nézet: a lekérdezés nem sikerült', {
      error: error instanceof Error ? error.message : String(error),
    })
    return (
      <AdminChrome props={props}>
        <StatisticsUnavailable />
      </AdminChrome>
    )
  }

  return (
    <AdminChrome props={props}>
      <StatisticsReport report={report} />
    </AdminChrome>
  )
}

export default StatisticsView
