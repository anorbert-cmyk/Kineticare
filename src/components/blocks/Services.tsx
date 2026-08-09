import Link from 'next/link'

import type { BlockServices } from '../../payload-types'
import { sanitizeCmsUrl } from '../../lib/safe-url'
import { MediaImage } from '../content/MediaImage'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/services.css'

/**
 * Services — szolgáltatás-sorok, „Így tudunk segíteni" (terv 2. katalógus, 3.4).
 *
 * A landing `kc-services` szekciójának portja: bal oldalon kis felirat, cím és
 * egy Media-kép, jobb oldalon 1–5 számozott sor (szám, cím, szöveg, opcionális
 * hivatkozás). Kép nélkül a sorok teljes szélességben állnak.
 *
 * A sor-hivatkozás a szabad `url` mezőből jön: belső útvonalra (/…) next/link,
 * külsőre sima `a` — a Button komponens mintája szerint. Új lapon nyíló linknél
 * a `rel="noopener noreferrer"` kötelező. A link akadálymentes neve a sor címét
 * is tartalmazza, mert az ismétlődő „Tovább…" feliratok önmagukban nem
 * megkülönböztethetők a linklistában.
 */
export interface ServicesProps {
  block: BlockServices
}

export function Services({ block }: ServicesProps) {
  const rows = (block.rows ?? []).filter((row) => (row.title?.trim() ?? '').length > 0)
  if (rows.length === 0) {
    return null
  }

  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const variant =
    settings?.hatter === 'tint' ? 'tint' : settings?.hatter === 'sotet' ? 'dark' : 'default'
  const headingId = `services-cim-${block.id ?? 'fo'}`
  const eyebrow = block.eyebrow?.trim() ?? ''
  const title = block.title?.trim() ?? ''
  const media = typeof block.image === 'object' && block.image !== null ? block.image : null

  return (
    <Section
      aria-labelledby={title.length > 0 ? headingId : undefined}
      className="kc-services"
      id={anchorId}
      variant={variant}
    >
      <Container>
        <div className="kc-services__grid">
          {eyebrow.length > 0 || title.length > 0 || media ? (
            <div className="kc-services__lead">
              {eyebrow.length > 0 ? <p className="kc-services__eyebrow">{eyebrow}</p> : null}
              {title.length > 0 ? (
                <h2 className="kc-services__title" id={headingId}>
                  {title}
                </h2>
              ) : null}
              {media ? (
                <span className="kc-services__media">
                  <MediaImage
                    media={media}
                    preferredSize="md"
                    sizes="(max-width: 900px) 100vw, 528px"
                  />
                </span>
              ) : null}
            </div>
          ) : null}
          <ol className="kc-services__list">
            {rows.map((row, index) => {
              // Sorszám nélkül a rendszer számoz (01, 02…).
              const number = row.number?.trim() || String(index + 1).padStart(2, '0')
              const rowTitle = row.title.trim()
              const body = row.body?.trim() ?? ''
              // CMS-URL allowlist (sec-review): tiltott séma (pl. javascript:)
              // esetén a sor link NÉLKÜL renderelődik.
              const url = sanitizeCmsUrl(row.url) ?? ''
              const label = row.felirat?.trim() ?? ''
              const hasLink = url.length > 0 && label.length > 0
              const isExternal = /^https?:\/\//i.test(url)
              const linkContent = (
                <>
                  {label} <span aria-hidden="true">→</span>
                </>
              )
              return (
                <li className="kc-services__row" key={row.id ?? `sor-${index}`}>
                  <p aria-hidden="true" className="kc-services__num">
                    {number}
                  </p>
                  <div className="kc-services__body">
                    <h3 className="kc-services__row-title">{rowTitle}</h3>
                    {body.length > 0 ? <p className="kc-services__text">{body}</p> : null}
                    {hasLink ? (
                      isExternal ? (
                        <a
                          aria-label={`${rowTitle}: ${label}`}
                          className="kc-services__link"
                          href={url}
                          {...(row.ujAblakban
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          {linkContent}
                        </a>
                      ) : (
                        <Link
                          aria-label={`${rowTitle}: ${label}`}
                          className="kc-services__link"
                          href={url}
                          {...(row.ujAblakban
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          {linkContent}
                        </Link>
                      )
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </Container>
    </Section>
  )
}
