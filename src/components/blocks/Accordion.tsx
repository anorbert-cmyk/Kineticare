import type { BlockAccordion } from '../../payload-types'
import { RichText } from '../lexical/RichText'
import { hasLexicalContent } from '../lexical/serialize'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/accordion.css'

/**
 * Accordion — nyitható-csukható szekció (harmonika).
 *
 * A blokk szerződése és a mezők indoklása: `src/blocks/accordion.ts`.
 *
 * SZERKEZET: natív `details`/`summary` — kliens-oldali JS nélkül nyílik, és az
 * összecsukott/kinyitott állapotot maga közli a segédtechnológiával. Ugyanaz a
 * minta, amit a TeamMembers CV-lenyitója és a FaqBlock már használ; a vizuális
 * nyelvet (hajszálvonalas elválasztók, saját +/− jel, akcent-korlát) a
 * TeamMembers harmonikájából viszi tovább, hogy a /rolunk két nyitható része ne
 * legyen kétféle.
 *
 * FAQPage JSON-LD-t szándékosan NEM ad ki: egy szakmai önéletrajz strukturált
 * GYIK-ként hibás lenne (ugyanaz az indok, mint a TeamMembers CV-listájánál).
 *
 * A `tartalom` richText, ezért a lenyitott rész a közös `RichText` renderelőn
 * megy át — a szerkesztő alcímet, felsorolást és linket is használhat. Az üres
 * (vagy csak üres bekezdéseket tartalmazó) tétel kimarad: a `hasLexicalContent`
 * ugyanazt a „van-e tényleges tartalom" kérdést dönti el, mint a richText
 * blokknál a RenderBlocks.
 *
 * TELJESEN CMS-VEZÉRELT: minden látható szöveg a blokk mezőiből jön (kis felső
 * felirat, cím, bevezető, sor-cím, kivonat, tartalom). Kódban nincs
 * marketingszöveg és nincs helykitöltő — a hiányzó mező egyszerűen kimarad. Az
 * egyetlen kódbeli jel a CSS-ből rajzolt, dekoratív +/− (nem DOM-tartalom).
 */
export interface AccordionProps {
  block: BlockAccordion
}

export function Accordion({ block }: AccordionProps) {
  const items = (block.items ?? [])
    .map((item) => ({
      id: item.id,
      cim: item.cim?.trim() ?? '',
      osszefoglalo: item.osszefoglalo?.trim() ?? '',
      tartalom: item.tartalom,
    }))
    .filter((item) => item.cim.length > 0 && hasLexicalContent(item.tartalom))

  if (items.length === 0) {
    return null
  }

  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const variant =
    settings?.hatter === 'tint' ? 'tint' : settings?.hatter === 'sotet' ? 'dark' : 'default'
  const headingId = `accordion-cim-${block.id ?? 'fo'}`
  const eyebrow = block.eyebrow?.trim() ?? ''
  const title = block.title?.trim() ?? ''
  const lead = block.lead?.trim() ?? ''

  return (
    <Section
      aria-labelledby={title.length > 0 ? headingId : undefined}
      className="kc-accordion"
      id={anchorId}
      variant={variant}
    >
      <Container size="narrow">
        {eyebrow.length > 0 ? <p className="kc-accordion__eyebrow">{eyebrow}</p> : null}
        {title.length > 0 ? (
          <h2 className="kc-accordion__title" id={headingId}>
            {title}
          </h2>
        ) : null}
        {lead.length > 0 ? <p className="kc-accordion__lead">{lead}</p> : null}
        <div className="kc-accordion__list">
          {items.map((item, index) => (
            <details className="kc-accordion__item" key={item.id ?? `sor-${index}`}>
              {/* A kivonat a `summary`-n BELÜL van: csukott állapotban is
                  látszania kell (a rejtett tartalom mennyisége maga a bizalmi
                  jelzés), és a kattintható felület része marad. */}
              <summary className="kc-accordion__summary">
                <span className="kc-accordion__label">
                  <span className="kc-accordion__heading">{item.cim}</span>
                  {item.osszefoglalo.length > 0 ? (
                    <span className="kc-accordion__summary-note">{item.osszefoglalo}</span>
                  ) : null}
                </span>
              </summary>
              <div className="kc-accordion__panel">
                <RichText content={item.tartalom} />
              </div>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  )
}
