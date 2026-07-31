import { formatPriceHuf } from '../../lib/format-price'

/**
 * PriceTag — HUF ár-címke (ezres tagolás, „Ft").
 * A formázás a src/lib/format-price.ts formatPriceHuf-ja (19 990 Ft).
 *
 * Props:
 * - priceHuf: az összeg egész forintban (pl. a products priceInHUF értéke)
 * - size: 'md' (alap) | 'sm'
 * - label: opcionális, képernyőolvasó-barát prefixum (pl. „Ár:")
 */
export interface PriceTagProps {
  priceHuf: number
  size?: 'md' | 'sm'
  label?: string
  className?: string
}

export function PriceTag({ priceHuf, size = 'md', label, className }: PriceTagProps) {
  const formatted = formatPriceHuf(priceHuf)
  const classes = ['kc-price-tag', size === 'sm' ? 'kc-price-tag--sm' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <span aria-label={label ? `${label} ${formatted}` : undefined} className={classes}>
      {label ? (
        <span aria-hidden="true" className="kc-visually-hidden">
          {label}{' '}
        </span>
      ) : null}
      {formatted}
    </span>
  )
}
