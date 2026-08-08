import type { BlockCtaBanner } from '../../payload-types'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/cta-banner.css'

/**
 * CtaBanner — CTA-sáv egyetlen gombbal (szekció-rendszer terv 2. katalógus).
 *
 * Cím + rövid szöveg + egy gomb. A gomb a közös Button primitívet használja
 * (egységes fókusz-, méret- és állapotkezelés); felirat vagy webcím hiányában a
 * sáv gomb nélkül jelenik meg — kitalált CTA-t nem teszünk ki.
 *
 * Értékesítési UX-skill: a sáv NEM sürget és nem tartalmaz dark patternt, a
 * gomb szövege a szerkesztőé. Több CTA-sáv egy oldalon gyengíti egymást — erre
 * a blokk admin-leírása figyelmeztet.
 */
export interface CtaBannerProps {
  block: BlockCtaBanner
}

export function CtaBanner({ block }: CtaBannerProps) {
  const title = block.title?.trim() ?? ''
  if (title.length === 0) {
    return null
  }

  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const variant =
    settings?.hatter === 'tint' ? 'tint' : settings?.hatter === 'sotet' ? 'dark' : 'default'
  const headingId = `cta-cim-${block.id ?? 'fo'}`

  const text = block.text?.trim() ?? ''
  const ctaLabel = block.cta?.felirat?.trim() ?? ''
  const ctaUrl = block.cta?.url?.trim() ?? ''
  const hasCta = ctaLabel.length > 0 && ctaUrl.length > 0

  return (
    <Section aria-labelledby={headingId} className="kc-cta-banner" id={anchorId} variant={variant}>
      <Container>
        <div className="kc-cta-banner__inner">
          <div className="kc-cta-banner__copy">
            <h2 className="kc-cta-banner__title" id={headingId}>
              {title}
            </h2>
            {text.length > 0 ? <p className="kc-cta-banner__text">{text}</p> : null}
          </div>
          {hasCta ? (
            <div className="kc-cta-banner__action">
              <Button href={ctaUrl} openInNewTab={block.cta?.ujAblakban === true}>
                {ctaLabel}
              </Button>
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
