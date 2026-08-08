import type { ReactNode } from 'react'

/**
 * Badge — rövid státusz-/meta-jelölő (tabletta).
 *
 * Props:
 * - tone: 'neutral' (alap) | 'info' | 'success' | 'warning' | 'danger'
 *
 * Minden színpár számolt és AA felett (a badge kis, félkövér szöveg, tehát a
 * szigorúbb 4,5:1-es küszöb vonatkozik rá): neutral 13,53:1 · info 8,49:1 ·
 * success 6,35:1 · warning 5,38:1 · danger 5,72:1 — lásd ui.css.
 */
export interface BadgeProps {
  children: ReactNode
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  const classes = ['kc-badge', `kc-badge--${tone}`, className ?? ''].filter(Boolean).join(' ')
  return <span className={classes}>{children}</span>
}
