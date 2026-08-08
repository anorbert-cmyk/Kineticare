import type { BlockAbout } from '../../payload-types'
import { MediaImage } from '../content/MediaImage'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/about.css'

/**
 * About — „Rólunk + statisztikák" (szekció-rendszer terv 2. katalógus, 3.4).
 *
 * A landing `kc-about` szekciójának portja: bemutatkozó bekezdések, egy keretes
 * kiemelt blokk, csapatfotó (Media) és a számok listája.
 *
 * A számokat a szerkesztő írja (VALÓS adatok — kitalált statisztika
 * fogyasztóvédelmi kockázat, lásd a blokk admin-leírását), ezért kódban sem
 * mintaérték, sem helykitöltő nincs: üres lista esetén a szám-oszlop elmarad.
 *
 * A `dl` szerkezete `dt` = mit jelent, `dd` = az érték; vizuálisan az érték van
 * fölül (CSS `column-reverse`), a forrás-sorrend viszont a szemantikát követi.
 */
export interface AboutProps {
  block: BlockAbout
}

export function About({ block }: AboutProps) {
  const paragraphs = (block.paragraphs ?? []).filter((item) => (item.text?.trim() ?? '').length > 0)
  const stats = (block.stats ?? []).filter(
    (item) => (item.value?.trim() ?? '').length > 0 && (item.label?.trim() ?? '').length > 0,
  )
  const photo = typeof block.photo === 'object' && block.photo !== null ? block.photo : null
  const title = block.title?.trim() ?? ''
  const featureLabel = block.feature?.label?.trim() ?? ''
  const featureNote = block.feature?.note?.trim() ?? ''
  const hasFeature = featureLabel.length > 0 || featureNote.length > 0

  // Cím, szöveg, kép és számok nélkül nincs mit mutatni — a szekció kimarad.
  if (
    title.length === 0 &&
    paragraphs.length === 0 &&
    stats.length === 0 &&
    !photo &&
    !hasFeature
  ) {
    return null
  }

  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const variant =
    settings?.hatter === 'tint' ? 'tint' : settings?.hatter === 'sotet' ? 'dark' : 'default'
  const headingId = `about-cim-${block.id ?? 'fo'}`
  const eyebrow = block.eyebrow?.trim() ?? ''

  return (
    <Section
      aria-labelledby={title.length > 0 ? headingId : undefined}
      className="kc-about"
      id={anchorId}
      variant={variant}
    >
      <Container>
        <div className="kc-about__grid">
          <div className="kc-about__copy">
            {eyebrow.length > 0 ? <p className="kc-about__eyebrow">{eyebrow}</p> : null}
            {title.length > 0 ? (
              <h2 className="kc-about__title" id={headingId}>
                {title}
              </h2>
            ) : null}
            {paragraphs.map((item, index) => {
              const text = item.text.trim()
              return (
                <p className="kc-about__text" key={item.id ?? `bekezdes-${index}`}>
                  {item.emphasized ? <strong>{text}</strong> : text}
                </p>
              )
            })}
            {hasFeature ? (
              <div className="kc-about__feature">
                {featureLabel.length > 0 ? (
                  <p className="kc-about__feature-label">{featureLabel}</p>
                ) : null}
                {featureNote.length > 0 ? (
                  <p className="kc-about__feature-note">{featureNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          {photo || stats.length > 0 ? (
            <div className="kc-about__side">
              {photo ? (
                <figure className="kc-about__figure">
                  <MediaImage
                    media={photo}
                    preferredSize="md"
                    sizes="(max-width: 900px) 100vw, 480px"
                  />
                </figure>
              ) : null}
              {stats.length > 0 ? (
                <dl className="kc-about__stats">
                  {stats.map((item, index) => (
                    <div className="kc-about__stat" key={item.id ?? `szam-${index}`}>
                      <dt className="kc-about__stat-label">{item.label.trim()}</dt>
                      <dd className="kc-about__stat-value">{item.value.trim()}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
