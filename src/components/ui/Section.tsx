import type { ReactNode } from 'react'

/**
 * Section — oldal-szekció egységes vertikális ritmussal és háttér-változatokkal.
 *
 * Props:
 * - variant: 'default' (fehér) | 'tint' (legacy világoskék sáv) | 'dark' (navy)
 * - flush: vertikális padding elhagyása (saját ritmusú szekciókhoz)
 * - as: alap 'section'; 'div' adható, ha nem önálló szekció
 */
export interface SectionProps {
  children: ReactNode
  variant?: 'default' | 'tint' | 'dark'
  flush?: boolean
  as?: 'section' | 'div'
  className?: string
  /** Horgony-cél (pl. a skip-link main-tartalma vagy #kapcsolat). */
  id?: string
  /**
   * A szekciót megnevező címsor id-je. A `section` elem csak akkor kap
   * landmark-szerepet a képernyőolvasóban, ha van neve — ezért a saját
   * címsorral rendelkező szekciók ezt a szekció-elemre teszik (nem a belső
   * listára).
   */
  'aria-labelledby'?: string
}

export function Section({
  children,
  variant = 'default',
  flush = false,
  as: Component = 'section',
  className,
  id,
  'aria-labelledby': ariaLabelledBy,
}: SectionProps) {
  const classes = [
    'kc-section',
    variant !== 'default' ? `kc-section--${variant}` : '',
    flush ? 'kc-section--flush' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Component aria-labelledby={ariaLabelledBy} className={classes} id={id}>
      {children}
    </Component>
  )
}
