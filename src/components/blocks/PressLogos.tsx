import Link from 'next/link'

import type { BlockPressLogos } from '../../payload-types'
import { MediaImage } from '../content/MediaImage'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/press-logos.css'

/**
 * PressLogos — sajtó-logósor (szekció-rendszer terv 2. katalógus, 3.4).
 *
 * A landing `kc-press` sávjának portja: rövid felirat + a médiamegjelenések és
 * szakmai szervezetek logói egy sorban, a Médiatárból.
 *
 * Képleírás: alapesetben a Media dokumentum `alt`-ja jelenik meg (egy helyen
 * karbantartva); ha a szerkesztő a blokkban felülírta, az élvez elsőbbséget —
 * ilyenkor a MediaImage-nek átadott média-objektum `alt`-ja cserélődik le, hogy
 * a felülírás a `srcSet`/méret-logikát ne kerülje meg.
 *
 * A szekció landmarkjának nevét a felirat adja; felirat nélkül a szekció
 * névtelen marad (nem találunk ki hozzá szöveget).
 *
 * SÁV (board `--band`): a tükörben a `kc-press` teljes szélességű, de NEM
 * teljes képernyős — ezért full-bleed sáv természetes magassággal, nem tábla.
 */
export interface PressLogosProps {
  block: BlockPressLogos
}

export function PressLogos({ block }: PressLogosProps) {
  const logos = (block.logos ?? []).filter(
    (logo) => typeof logo.image === 'object' && logo.image !== null,
  )
  if (logos.length === 0) {
    return null
  }

  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const variant =
    settings?.hatter === 'tint' ? 'tint' : settings?.hatter === 'sotet' ? 'dark' : 'default'
  const headingId = `press-felirat-${block.id ?? 'fo'}`
  const heading = block.heading?.trim() ?? ''

  return (
    <Section
      aria-labelledby={heading.length > 0 ? headingId : undefined}
      className="kc-press kc-board kc-board--band"
      id={anchorId}
      variant={variant}
    >
      <div className="kc-board__inner">
        {heading.length > 0 ? (
          <p className="kc-press__label" id={headingId}>
            {heading}
          </p>
        ) : null}
        <ul className="kc-press__row">
          {logos.map((logo, index) => {
            const media = logo.image
            if (typeof media !== 'object' || media === null) {
              return null
            }
            const altOverride = logo.alt?.trim() ?? ''
            const image = (
              <MediaImage
                media={altOverride.length > 0 ? { ...media, alt: altOverride } : media}
                preferredSize="xs"
                sizes="160px"
              />
            )
            const url = logo.url?.trim() ?? ''
            const isExternal = /^https?:\/\//i.test(url)
            return (
              <li className="kc-press__item" key={logo.id ?? `logo-${index}`}>
                {url.length === 0 ? (
                  image
                ) : isExternal ? (
                  <a
                    className="kc-press__link"
                    href={url}
                    {...(logo.ujAblakban ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {image}
                  </a>
                ) : (
                  <Link
                    className="kc-press__link"
                    href={url}
                    {...(logo.ujAblakban ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {image}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}
