import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Button — a storefront elsődleges akcióeleme.
 *
 * A vizuális nyelv a kineticare.higgsfield.app landingé (a stílus az
 * `src/app/(frontend)/styles/ui.css`-ben él, minden szín szerep-tokenről):
 * - variant:
 *     'primary'   — akcent-mély kitöltés fehér szöveggel (5,45:1 — AA), alap
 *     'secondary' — 2px-es ink keret átlátszó háttéren, a hover invertál
 *                   (a landing `kc-sos-cta` nyelve); sötét sávon fehér keret
 *     'ghost'     — aláhúzott szöveglink-jelleg (a landing `kc-inline-link`)
 * - size: 'md' (alap) | 'sm' — az érintési célfelület mindkettőben ≥ 44px
 * - href: megadva linkként renderel (belső útvonalhoz next/link, külsőhöz <a>);
 *   nélküle <button>
 * - disabled: letiltott állapot (gombként valódi disabled; linkként aria-disabled
 *   + tabindex -1 + osztály, a href ilyenkor nem navigál)
 * - type: a <button> type-ja (alap 'button' — űrlapban 'submit'-re állítható)
 *
 * A fókusz-állapotot a globális :focus-visible szabály kezeli (lásd base.css);
 * sötét szekcióban a gyűrű fehérre vált (ui.css, .kc-section--dark).
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
  /**
   * Új lapon nyitás (target="_blank" + noopener) — belső és külső href-re is
   * érvényes: a CMS linkmezők „Új lapon nyíljon" kapcsolója ide fut be, és a
   * szerkesztő döntése akkor sem veszhet el némán, ha az útvonal belső.
   */
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
      <Link
        className={classes}
        href={href}
        {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
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
