/**
 * Havi bevétel-aggregátor — tiszta, DB- és React-mentes mag (T-013).
 *
 * ═══ MIÉRT TISZTA FÜGGVÉNY ═══
 * A hónap-kulcs, az ág-bontás és a nullás hónapok kitöltése egységtesztelhető
 * marad hálózat és adatbázis nélkül. A Payload-lekérdezés
 * (`src/lib/statistics/query.ts`) csak a bemenetet állítja elő; a nézet csak
 * megjeleníti a kimenetet.
 *
 * ═══ SZABÁLYOK ═══
 * 1. Csak `status === 'paid'` számít bele. A `refunded` / `payment_failed` /
 *    `cancelled` kimarad. A `refunds` mezőt ez a modul nem is ismeri
 *    (owner-only olvasás, CLAUDE.md 4. zóna).
 * 2. Hónap-kulcs: `invoiceCompletionDate` (YYYY-MM-DD) elsőbbséggel, egyébként
 *    `createdAt` Europe/Budapest szerint. Nincs `paidAt` mező.
 * 3. Az ág-bontás TÉTEL-szintű: `priceHuf × quantity`, audience a
 *    `normalizeAudience()` szerint. NULL / ismeretlen → laikus.
 * 4. Tétel nélküli (régi/hibás) rendelés `totalHuf`-ja a laikus ágba megy,
 *    különben a havi összesen és az ágak összege elcsúszna.
 * 5. A hiányzó hónapok nullás sorként jelennek meg (az oszlopdiagram ne
 *    ugorja át őket).
 */

import { hasStaffOrOwnerRole, type RoleUser } from '../../access/roles'
import { normalizeAudience, type CourseAudience } from '../course-audience'
import { budapestMonthKey, isIsoDateString } from '../date/budapest'

export interface RevenueOrderItemInput {
  audience: unknown
  priceHuf: number
  quantity: number
  /** A tétel sku-snapshotja — a kurzusonkénti bontáshoz. */
  titleSnapshot?: string | null
}

export interface RevenueOrderInput {
  status: string
  createdAt: string
  invoiceCompletionDate?: string | null
  totalHuf: number | null
  items: RevenueOrderItemInput[]
}

export interface MonthlyRevenueRow {
  month: string
  laikusHuf: number
  szakemberHuf: number
  totalHuf: number
  orderCount: number
}

export interface CourseRevenueRow {
  sku: string
  audience: CourseAudience
  revenueHuf: number
  /** Hány fizetett rendelésben szerepelt ez a tétel. */
  orderCount: number
  itemCount: number
  /** Nulla forintos (ingyenes) tételsorok száma. */
  freeItemCount: number
}

export interface OrderFunnelCounts {
  created: number
  paymentPending: number
  paid: number
  paymentFailed: number
  cancelled: number
  refunded: number
  other: number
  total: number
}

export interface RevenueTotals {
  laikusHuf: number
  szakemberHuf: number
  totalHuf: number
  orderCount: number
}

export interface RevenueReport {
  months: MonthlyRevenueRow[]
  totals: RevenueTotals
  courses: CourseRevenueRow[]
  funnel: OrderFunnelCounts
  /** Igaz, ha a lekérdezés a felső korlát miatt csonkolt. */
  truncated: boolean
}

const DEFAULT_MONTHS = 12

/** A Payload 3.86 custom admin-nézet egyetlen védelme: staff vagy owner. */
export function canAccessStatistics(user: RoleUser | null | undefined): boolean {
  return hasStaffOrOwnerRole(user)
}

export const STATISTICS_ACCESS_DENIED_MESSAGE = 'Ehhez a nézethez nincs jogosultságod.'

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function monthKeyFromInvoiceDate(value: string): string | null {
  const trimmed = value.trim()
  if (!isIsoDateString(trimmed)) {
    return null
  }
  return trimmed.slice(0, 7)
}

function monthKeyFromCreatedAt(value: string): string | null {
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) {
    return null
  }
  return budapestMonthKey(new Date(ms))
}

/**
 * Egy rendelés hónap-kulcsa: számla teljesítési dátuma, tartalék a leadás
 * Budapest szerinti naptári hónapja.
 */
export function orderMonthKey(
  order: Pick<RevenueOrderInput, 'createdAt' | 'invoiceCompletionDate'>,
): string | null {
  const invoice = order.invoiceCompletionDate
  if (typeof invoice === 'string' && invoice.trim().length > 0) {
    const fromInvoice = monthKeyFromInvoiceDate(invoice)
    if (fromInvoice !== null) {
      return fromInvoice
    }
  }
  return monthKeyFromCreatedAt(order.createdAt)
}

function listMonthKeys(now: Date, months: number): string[] {
  const current = budapestMonthKey(now)
  if (current === null || months <= 0) {
    return []
  }
  const keys: string[] = []
  const [yearPart, monthPart] = current.split('-')
  let year = Number(yearPart)
  let month = Number(monthPart)
  for (let i = 0; i < months; i += 1) {
    keys.push(`${String(year)}-${String(month).padStart(2, '0')}`)
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return keys.reverse()
}

function emptyRow(month: string): MonthlyRevenueRow {
  return { month, laikusHuf: 0, szakemberHuf: 0, totalHuf: 0, orderCount: 0 }
}

function itemRevenue(item: RevenueOrderItemInput): number {
  const price = finiteNumber(item.priceHuf) ?? 0
  const quantity = finiteNumber(item.quantity)
  const count = quantity !== null && quantity > 0 ? quantity : 0
  return price * count
}

export function aggregateMonthlyRevenue(
  orders: readonly RevenueOrderInput[],
  options?: { months?: number; now?: Date },
): MonthlyRevenueRow[] {
  const months = options?.months ?? DEFAULT_MONTHS
  const now = options?.now ?? new Date()
  const windowKeys = listMonthKeys(now, months)
  const byMonth = new Map<string, MonthlyRevenueRow>()
  for (const key of windowKeys) {
    byMonth.set(key, emptyRow(key))
  }

  for (const order of orders) {
    if (order.status !== 'paid') {
      continue
    }
    const month = orderMonthKey(order)
    if (month === null) {
      continue
    }
    const row = byMonth.get(month)
    if (row === undefined) {
      continue
    }

    row.orderCount += 1

    if (!Array.isArray(order.items) || order.items.length === 0) {
      // Tétel nélküli régi/hibás sor: a rendelés-összeg a laikus ágba megy,
      // különben a havi totalHuf és az ágak összege nem stimmelne.
      const fallback = finiteNumber(order.totalHuf) ?? 0
      row.laikusHuf += fallback
      row.totalHuf += fallback
      continue
    }

    for (const item of order.items) {
      const amount = itemRevenue(item)
      const audience = normalizeAudience(item.audience)
      if (audience === 'szakember') {
        row.szakemberHuf += amount
      } else {
        row.laikusHuf += amount
      }
      row.totalHuf += amount
    }
  }

  return windowKeys.map((key) => byMonth.get(key) ?? emptyRow(key))
}

export function sumRevenueTotals(rows: readonly MonthlyRevenueRow[]): RevenueTotals {
  const totals: RevenueTotals = { laikusHuf: 0, szakemberHuf: 0, totalHuf: 0, orderCount: 0 }
  for (const row of rows) {
    totals.laikusHuf += row.laikusHuf
    totals.szakemberHuf += row.szakemberHuf
    totals.totalHuf += row.totalHuf
    totals.orderCount += row.orderCount
  }
  return totals
}

export function aggregateCourseRevenue(orders: readonly RevenueOrderInput[]): CourseRevenueRow[] {
  const bySku = new Map<string, CourseRevenueRow & { orderIds: Set<number> }>()
  let orderIndex = 0

  for (const order of orders) {
    orderIndex += 1
    if (order.status !== 'paid' || !Array.isArray(order.items)) {
      continue
    }
    const seenInOrder = new Set<string>()
    for (const item of order.items) {
      const skuRaw = typeof item.titleSnapshot === 'string' ? item.titleSnapshot.trim() : ''
      const sku = skuRaw.length > 0 ? skuRaw : '(nincs azonosító)'
      let row = bySku.get(sku)
      if (row === undefined) {
        row = {
          sku,
          audience: normalizeAudience(item.audience),
          revenueHuf: 0,
          orderCount: 0,
          itemCount: 0,
          freeItemCount: 0,
          orderIds: new Set<number>(),
        }
        bySku.set(sku, row)
      }
      const amount = itemRevenue(item)
      row.revenueHuf += amount
      row.itemCount += 1
      if (amount === 0) {
        row.freeItemCount += 1
      }
      if (!seenInOrder.has(sku)) {
        seenInOrder.add(sku)
        row.orderIds.add(orderIndex)
      }
    }
  }

  return [...bySku.values()]
    .map((row) => ({
      sku: row.sku,
      audience: row.audience,
      revenueHuf: row.revenueHuf,
      orderCount: row.orderIds.size,
      itemCount: row.itemCount,
      freeItemCount: row.freeItemCount,
    }))
    .sort((a, b) => b.revenueHuf - a.revenueHuf || a.sku.localeCompare(b.sku, 'hu'))
}

export function emptyFunnel(): OrderFunnelCounts {
  return {
    created: 0,
    paymentPending: 0,
    paid: 0,
    paymentFailed: 0,
    cancelled: 0,
    refunded: 0,
    other: 0,
    total: 0,
  }
}

export function aggregateOrderFunnel(statuses: readonly string[]): OrderFunnelCounts {
  const funnel = emptyFunnel()
  for (const status of statuses) {
    funnel.total += 1
    switch (status) {
      case 'created':
        funnel.created += 1
        break
      case 'payment_pending':
        funnel.paymentPending += 1
        break
      case 'paid':
        funnel.paid += 1
        break
      case 'payment_failed':
        funnel.paymentFailed += 1
        break
      case 'cancelled':
        funnel.cancelled += 1
        break
      case 'refunded':
        funnel.refunded += 1
        break
      default:
        funnel.other += 1
        break
    }
  }
  return funnel
}

export function formatHuf(value: number): string {
  return `${value.toLocaleString('hu-HU')} Ft`
}

export function formatMonthLabel(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey
  }
  return new Date(year, month - 1, 1).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
  })
}

export function buildRevenueReport(
  orders: readonly RevenueOrderInput[],
  statuses: readonly string[],
  options?: { months?: number; now?: Date; truncated?: boolean },
): RevenueReport {
  const months = aggregateMonthlyRevenue(orders, options)
  return {
    months,
    totals: sumRevenueTotals(months),
    courses: aggregateCourseRevenue(orders),
    funnel: aggregateOrderFunnel(statuses),
    truncated: options?.truncated === true,
  }
}
