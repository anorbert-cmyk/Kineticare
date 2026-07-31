import type { ReactNode } from 'react'

/**
 * Badge — rövid státusz-/meta-jelölő (tabletta).
 *
 * Props:
 * - tone: 'neutral' (alap) | 'info' | 'success' | 'warning' | 'danger'
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
