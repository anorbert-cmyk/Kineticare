import Link from 'next/link'

import type { BlockTeamMembers } from '../../payload-types'
import { sanitizeCmsUrl } from '../../lib/safe-url'
import { MediaImage } from '../content/MediaImage'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'

import '../../app/(frontend)/styles/blocks/team-members.css'

/**
 * TeamMembers — a két gyógytornász 50–50 arányú, egyenrangú bemutatása.
 *
 * A blokk szerződése és a mezők indoklása: `src/blocks/team-members.ts`.
 * Vizuális nyelv: a landing kártya-nyelve — Tenor Sans név, hajszálvonalas
 * elválasztók, lekerekítés nélküli képkeret, akcentus csak `accent-deep`
 * (`--kc-color-primary`) szövegszínként (a nyers `accent` a hűvös felületeken
 * 4,07:1, tehát AA alatt van — lásd tokens.css kontraszt-jegyzőkönyv).
 *
 * A rács `repeat(auto-fit, minmax(...))`: két taggal pontosan 50–50, egy taggal
 * teljes szélesség — a fix `repeat(2, 1fr)` egy tagnál üres hasábot hagyna
 * (belső-oldali kutatás B3.5). 900px alatt egymás alá tördel.
 *
 * A szakmai listák natív `details`/`summary`-vel csukódnak (a FaqBlock mintája):
 * kliens-oldali JS nélkül működnek, és a képernyőolvasó megkapja a nyitott/zárt
 * állapotot. FAQPage JSON-LD-t szándékosan NEM adnak ki — egy tanfolyam-lista
 * strukturált GYIK-ként hibás lenne (lásd a tartalom-leltár B5 megjegyzését).
 *
 * A darabszám a `summary`-ben a TÉNYLEGES sorokból számolódik, nem külön mezőből:
 * így sosem csúszhat el a listától, és a rejtés nem tünteti el a bizonyíték
 * mennyiségét (ux-belso-oldalak-kutatas.md 5.2).
 *
 * TELJESEN CMS-VEZÉRELT (tulajdonosi elfogadási feltétel). Minden LÁTHATÓ szöveg
 * és minden kép a blokk mezőiből jön: név, titulus, portré, bio, telefon, e-mail,
 * szakmai listák, hivatkozás, sőt a megjelenési SORREND is (a tömb sorrendje =
 * a kártyák sorrendje, az adminban fogd-és-vidd módszerrel átrendezhető). Kódban
 * NINCS marketingszöveg, nincs helykitöltő és nincs beégetett kép — a hiányzó
 * mező egyszerűen kimarad a kimenetből (a szerkesztő azt látja, amit beírt).
 * Az egyetlen kódbeli szó a képernyőolvasónak szóló `aria-label` kötőszava és a
 * dekoratív nyíl (`aria-hidden`) — egyik sem látható tartalom. A képleírás (alt)
 * a Médiatárból jön, nem innen. Ezt a szerződést teszt őrzi
 * (src/__tests__/team-members-block.test.ts).
 */
export interface TeamMembersProps {
  block: BlockTeamMembers
}

/**
 * Telefonszám → `tel:` href. A megjelenített szám tagolt marad („+36 30 169
 * 2263"), a hívás-link viszont csak a `+` előjelet és a számjegyeket viheti.
 *
 * A séma itt KÓDBÓL épül (nem szerkesztői szabad szövegből), ezért nem megy át a
 * `sanitizeCmsUrl` allowlistján — az a `tel:`-t tudatosan tiltja a szabadon
 * gépelhető webcím-mezőkben. Az összeállítás azért biztonságos, mert a
 * bemenetből MINDEN más karakter kiesik: injektálható rész nem marad benne.
 */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 0) {
    return null
  }
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`
}

/** Egy szakmai lista sorai: soronként egy tétel, az üres sorok kimaradnak. */
export function cvItemLines(items: string): string[] {
  return items
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function TeamMembers({ block }: TeamMembersProps) {
  const members = (block.members ?? []).filter((member) => (member.name?.trim() ?? '').length > 0)
  if (members.length === 0) {
    return null
  }

  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const variant =
    settings?.hatter === 'tint' ? 'tint' : settings?.hatter === 'sotet' ? 'dark' : 'default'
  const headingId = `team-cim-${block.id ?? 'fo'}`
  const eyebrow = block.eyebrow?.trim() ?? ''
  const title = block.title?.trim() ?? ''
  const lead = block.lead?.trim() ?? ''

  return (
    <Section
      aria-labelledby={title.length > 0 ? headingId : undefined}
      className="kc-team"
      id={anchorId}
      variant={variant}
    >
      <Container>
        {eyebrow.length > 0 ? <p className="kc-team__eyebrow">{eyebrow}</p> : null}
        {title.length > 0 ? (
          <h2 className="kc-team__title" id={headingId}>
            {title}
          </h2>
        ) : null}
        {lead.length > 0 ? <p className="kc-team__lead">{lead}</p> : null}
        <ul className="kc-team__grid">
          {members.map((member, index) => (
            <li className="kc-team__item" key={member.id ?? `tag-${index}`}>
              {/* Cím nélküli szekcióban a nevek lépnek a h2 helyére: a h1 → h3
                  ugrás címsor-szintet hagyna ki (WCAG 1.3.1 gyakorlata). */}
              <TeamMemberCard
                blockId={block.id}
                index={index}
                member={member}
                nameLevel={title.length > 0 ? 'h3' : 'h2'}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}

type Member = NonNullable<BlockTeamMembers['members']>[number]

function TeamMemberCard({
  blockId,
  index,
  member,
  nameLevel,
}: {
  blockId?: string | null
  index: number
  member: Member
  nameLevel: 'h2' | 'h3'
}) {
  const NameHeading = nameLevel
  const name = member.name.trim()
  const role = member.role?.trim() ?? ''
  const bio = member.bio?.trim() ?? ''
  const photo = typeof member.photo === 'object' && member.photo !== null ? member.photo : null
  const phone = member.phone?.trim() ?? ''
  const phoneHref = phone.length > 0 ? telHref(phone) : null
  const email = member.email?.trim() ?? ''
  // A mailto: az allowlist engedélyezett sémája — a szerkesztő elgépelt vagy
  // szándékosan más sémájú értékét ugyanaz a szűrő ejti, mint a CTA-kat.
  const emailHref = email.length > 0 ? sanitizeCmsUrl(`mailto:${email}`) : null
  const cvSections = (member.cvSections ?? [])
    .map((section) => ({
      id: section.id,
      heading: section.heading?.trim() ?? '',
      lines: cvItemLines(section.items ?? ''),
    }))
    .filter((section) => section.heading.length > 0 && section.lines.length > 0)

  // CMS-webcím allowlist-szűrése: tiltott sémánál a kártya link NÉLKÜL renderel.
  const linkUrl = sanitizeCmsUrl(member.link?.url) ?? ''
  const linkLabel = member.link?.felirat?.trim() ?? ''
  const hasLink = linkUrl.length > 0 && linkLabel.length > 0
  const isExternalLink = /^https?:\/\//i.test(linkUrl)
  const newTab = member.link?.ujAblakban === true
  const linkProps = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  const linkContent = (
    <>
      {linkLabel} <span aria-hidden="true">→</span>
    </>
  )

  return (
    <article className="kc-team__card">
      {photo ? (
        <figure className="kc-team__figure">
          {/* Két hasáb az 1120px-es konténerben → hasábonként ~540px; mobilon a
              kártya a teljes szélességet viszi. */}
          <MediaImage media={photo} preferredSize="md" sizes="(max-width: 899px) 100vw, 540px" />
        </figure>
      ) : null}
      <div className="kc-team__body">
        <NameHeading className="kc-team__name">{name}</NameHeading>
        {role.length > 0 ? <p className="kc-team__role">{role}</p> : null}
        {bio.length > 0 ? <p className="kc-team__bio">{bio}</p> : null}
        {phoneHref || emailHref ? (
          <ul className="kc-team__contact">
            {phoneHref ? (
              <li className="kc-team__contact-item">
                {/* A puszta szám nem megkülönböztethető a linklistában, ezért a
                    hozzáférhető név a szakember nevét is tartalmazza. */}
                <a aria-label={`${name} telefonszáma: ${phone}`} href={phoneHref}>
                  {phone}
                </a>
              </li>
            ) : null}
            {emailHref ? (
              <li className="kc-team__contact-item">
                <a aria-label={`${name} e-mail-címe: ${email}`} href={emailHref}>
                  {email}
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}
        {cvSections.length > 0 ? (
          <div className="kc-team__cv">
            {/* A nyitott/zárt állapotot a natív details közli; a darabszám a
                rejtett tartalom MENNYISÉGÉT tartja láthatóan (bizalmi jelzés). */}
            {cvSections.map((section, sectionIndex) => (
              <details className="kc-team__cv-section" key={section.id ?? `lista-${sectionIndex}`}>
                <summary className="kc-team__cv-summary">
                  <span className="kc-team__cv-heading">{section.heading}</span>
                  <span className="kc-team__cv-count">{section.lines.length}</span>
                </summary>
                <ul className="kc-team__cv-list">
                  {section.lines.map((line, lineIndex) => (
                    <li
                      className="kc-team__cv-entry"
                      key={`${blockId ?? 'blokk'}-${index}-${sectionIndex}-${lineIndex}`}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        ) : null}
        {hasLink ? (
          isExternalLink ? (
            <a
              aria-label={`${name}: ${linkLabel}`}
              className="kc-team__link"
              href={linkUrl}
              {...linkProps}
            >
              {linkContent}
            </a>
          ) : (
            <Link
              aria-label={`${name}: ${linkLabel}`}
              className="kc-team__link"
              href={linkUrl}
              {...linkProps}
            >
              {linkContent}
            </Link>
          )
        ) : null}
      </div>
    </article>
  )
}
