import type { Payload } from 'payload'

/**
 * Rendelésszám-generátor (T-017).
 *
 * Formátum: KH-<év>-<6 jegyű, éven belül futó sorszám>, pl. KH-2026-000123.
 * A generálás mindig szerver-oldalon történik (az orders create-hookja hívja),
 * a kliens sosem adhatja meg; update-kor újraszámolás nincs.
 *
 * Egyediség: az orders.orderNumber mező unique indexe a végső garancia;
 * a sorszám az adott év legnagyobb meglévő értékéből +1-gyel képződik.
 */

export const ORDER_NUMBER_PATTERN = /^KH-(\d{4})-(\d{6})$/

export const formatOrderNumber = (year: number, sequence: number): string =>
  `KH-${year}-${String(sequence).padStart(6, '0')}`

/** A rendelésszámból a sorszám visszafejtése; érvénytelen formátumnál null. */
export const parseOrderNumberSequence = (orderNumber: string): number | null => {
  const match = ORDER_NUMBER_PATTERN.exec(orderNumber)
  return match ? Number.parseInt(match[2], 10) : null
}

/**
 * A következő rendelésszám lekérése az adott évre.
 * A `where`/`sort` lazán típusozott: az orderNumber mező a payload-types
 * koordinátor-féle újragenerálásáig nincs benne a generált típusokban.
 */
export const generateOrderNumber = async (payload: Payload, now = new Date()): Promise<string> => {
  const year = now.getFullYear()

  const latest = await payload.find({
    collection: 'orders',
    where: {
      orderNumber: { like: `KH-${year}-` },
    },
    sort: '-orderNumber',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as unknown as Parameters<Payload['find']>[0])

  const lastOrderNumber = (latest.docs[0] as unknown as { orderNumber?: string } | undefined)
    ?.orderNumber
  const lastSequence = lastOrderNumber ? (parseOrderNumberSequence(lastOrderNumber) ?? 0) : 0

  return formatOrderNumber(year, lastSequence + 1)
}
