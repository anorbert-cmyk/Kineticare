import type { ReactNode } from 'react'

/**
 * Card — tartalom-csoportosító felület a landing minimál nyelvén: fehér
 * (`--kc-color-surface-raised`) lap a szekció-háttér fölött, 1px hairline
 * kerettel, árnyék NÉLKÜL.
 *
 * Props:
 * - padded: belső margó (alap true)
 * - interactive: hover/focus-within kiemelés (akcent-keret + 2px emelés,
 *   pl. kattintható kurzuskártyához)
 * - as: a renderelt elem (alap 'div'; szemantikusan 'article'/'section' adható)
 */
export interface CardProps {
  children: ReactNode
  padded?: boolean
  interactive?: boolean
  as?: 'div' | 'article' | 'section'
  className?: string
}

export function Card({
  children,
  padded = true,
  interactive = false,
  as: Component = 'div',
  className,
}: CardProps) {
  const classes = [
    'kc-card',
    padded ? 'kc-card--padded' : '',
    interactive ? 'kc-card--interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return <Component className={classes}>{children}</Component>
}
