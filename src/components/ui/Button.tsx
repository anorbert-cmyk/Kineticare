import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Button — a storefront elsődleges akcióeleme.
 *
 * Props:
 * - variant: 'primary' (navy töltött, alap) | 'secondary' (navy körvonal) | 'ghost' (sima szöveges)
 * - size: 'md' (alap) | 'sm'
 * - href: megadva linkként renderel (belső útvonalhoz next/link, külsőhöz <a>);
 *   nélküle <button>
 * - disabled: letiltott állapot (gombként valódi disabled; linkként aria-disabled
 *   + tabindex -1 + osztály, a href ilyenkor nem navigál)
 * - type: a <button> type-ja (alap 'button' — űrlapban 'submit'-re állítható)
 *
 * A fókusz-állapotot a globális :focus-visible szabály kezeli (lásd base.css).
 */

export interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  href?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  /** Csak <button>-rendernél értelmezett. */
  onClick?: () => void
  /** Külső href esetén új lapon nyitás (target="_blank" rel="noopener noreferrer"). */
  openInNewTab?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  disabled = false,
  type = 'button',
  className,
  onClick,
  openInNewTab = false,
}: ButtonProps) {
  const classes = [
    'kc-button',
    `kc-button--${variant}`,
    size === 'sm' ? 'kc-button--sm' : '',
    disabled ? 'kc-button--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if (href && !disabled) {
    if (/^https?:\/\//i.test(href)) {
      return (
        <a
          className={classes}
          href={href}
          {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    }
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    )
  }

  if (href && disabled) {
    return (
      <span className={classes} aria-disabled="true">
        {children}
      </span>
    )
  }

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  )
}
