import type { ReactNode } from 'react'

/**
 * Container — tartalom-szélesség korlátozása (legacy szélességek).
 *
 * Props:
 * - size: 'wide' (alap, 1120px) | 'narrow' (720px, szöveg-heavy oldalakhoz)
 */
export interface ContainerProps {
  children: ReactNode
  size?: 'wide' | 'narrow'
  className?: string
}

export function Container({ children, size = 'wide', className }: ContainerProps) {
  const classes = ['kc-container', size === 'narrow' ? 'kc-container--narrow' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return <div className={classes}>{children}</div>
}
