import type { Page, Post, Product, Testimonial } from '../../payload-types'
import { RichText } from '../lexical/RichText'
import { hasLexicalContent } from '../lexical/serialize'
import { CourseCards, isPaidProduct } from '../content/home/CourseCards'
import { CredentialsStrip } from '../content/home/CredentialsStrip'
import { FreeSos } from '../content/home/FreeSos'
import { HowItWorks } from '../content/home/HowItWorks'
import { KnowledgeSection } from '../content/home/KnowledgeSection'
import { TestimonialsSection } from '../content/home/TestimonialsSection'
import { isPubliclyVisibleProduct } from '../content/ProductCard'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { About } from './About'
import { Accordion } from './Accordion'
import { CtaBanner } from './CtaBanner'
import { FaqBlock } from './FaqBlock'
import { FilmHero } from './FilmHero'
import { PressLogos } from './PressLogos'
import { Services } from './Services'
import { States } from './States'
import { TeamMembers } from './TeamMembers'
import { Usps } from './Usps'
import { Welcome } from './Welcome'

/**
 * RenderBlocks — a szekció-rendszer renderelője (terv 5. pont, F3).
 *
 * A Pages `layout` mezőjének blokkjait rendereli a szerkesztő által beállított
 * sorrendben. Két blokkfajtát köt össze egyetlen listában:
 *  - az új, Higgsfield-kinézetű blokkok (FilmHero, Welcome, Usps, States,
 *    Services, About, PressLogos, TeamMembers, FaqBlock, Accordion, CtaBanner)
 *    a teljes blokkot kapják és maguk kezelik a szekció-beállításaikat,
 *  - az adatvezérelt / örökölt szekciók (credsStrip, courseCards, freeSos,
 *    howItWorks, testimonials, knowledge, richText) a meglévő kezdőlapi
 *    komponensekre képződnek le — a blokk mezői opcionális felülírásként
 *    érkeznek, így a rögzített kezdőlap (üres layout) viselkedése változatlan.
 *
 * Közös szabályok:
 *  - `sectionSettings.visible === false` → a blokk kimarad (elrejtés törlés
 *    helyett — a szerkesztő bármikor visszakapcsolhatja),
 *  - `sectionSettings.anchorId` → a szekció `id`-je (lapon belüli ugrás),
 *  - `sectionSettings.hatter` → háttérsáv (feher → default, tint, sotet → dark),
 *  - ismeretlen blokktípus némán kimarad (előre-kompatibilitás: régebbi kód
 *    újabb tartalommal találkozva nem törhet el).
 *
 * A FAQPage JSON-LD-t a FaqBlock maga adja a saját tételeiből — itt nem
 * duplikáljuk (a látható szövegtől eltérő strukturált adatot a keresők
 * elvetik). Az Organization JSON-LD oldalszintű, a HomeView adja.
 */

type LayoutBlock = NonNullable<Page['layout']>[number]

/** A szekció-beállítások közös leképezése az örökölt komponensek propjaira. */
function sectionProps(block: LayoutBlock): {
  id: string | undefined
  variant: 'default' | 'tint' | 'dark' | undefined
} {
  const settings = block.sectionSettings
  const anchorId = settings?.anchorId?.trim() || undefined
  const hatter = settings && 'hatter' in settings ? settings.hatter : undefined
  const variant =
    hatter === 'tint' ? 'tint' : hatter === 'sotet' ? 'dark' : hatter === 'feher' ? 'default' : undefined
  return { id: anchorId, variant }
}

/** LinkGroup (felirat/url/ujAblakban) → egyszerű link-objektum; hiányos linknél undefined. */
function linkFrom(
  link: { felirat?: string | null; url?: string | null; ujAblakban?: boolean | null } | undefined | null,
): { label: string; href: string; newTab: boolean } | undefined {
  const label = link?.felirat?.trim() ?? ''
  const href = link?.url?.trim() ?? ''
  if (label.length === 0 || href.length === 0) {
    return undefined
  }
  return { label, href, newTab: link?.ujAblakban === true }
}

export interface RenderBlocksProps {
  layout: NonNullable<Page['layout']>
  /** Published termékek — a courseCards (fizetős) és a freeSos (ingyenes) blokk adata. */
  products: Product[]
  /** Legfrissebb posztok a knowledge blokkhoz (lásd KNOWLEDGE_POSTS_FETCH_LIMIT). */
  posts: Post[]
  /** Vélemények a testimonials blokkhoz. */
  testimonials: Testimonial[]
}

export function RenderBlocks({ layout, products, posts, testimonials }: RenderBlocksProps) {
  const visibleProducts = products.filter(isPubliclyVisibleProduct)
  // A courseCards rácsba KIZÁRÓLAG fizetős termék kerül; az ingyenes
  // lead-magnet helye a freeSos blokk (kezdőlap-audit, 2026-08-15: a kettős
  // megjelenés duplikáció volt — lásd CourseCards fejléce).
  // A freeSos blokk egyetlen lead-magnetre van tervezve, viselkedése változatlan.
  const paidProducts = visibleProducts.filter(isPaidProduct)
  const freeProduct = visibleProducts.find((product) => !isPaidProduct(product)) ?? null

  // Az adatvezérelt szekciók beépített alap-horgonya (kurzusok, ingyenes,
  // velemenyek) csak a típus ELSŐ példányán érvényesülhet: ha a szerkesztő
  // ugyanabból a blokkból többet tesz a lapra anchorId nélkül, a további
  // példányok nem kaphatják ugyanazt a DOM-id-t (érvénytelen HTML lenne, és a
  // /#horgony linkek mindig az elsőre ugranának).
  const seenTypes = new Set<string>()

  return (
    <>
      {layout.map((block, index) => {
        if (block.sectionSettings?.visible === false) {
          return null
        }
        const isRepeat = seenTypes.has(block.blockType)
        seenTypes.add(block.blockType)
        const key = block.id ?? `${block.blockType}-${index}`
        return (
          <BlockSwitch
            key={key}
            {...{ block, isRepeat, paidProducts, freeProduct, posts, testimonials }}
          />
        )
      })}
    </>
  )
}

function BlockSwitch({
  block,
  isRepeat,
  paidProducts,
  freeProduct,
  posts,
  testimonials,
}: {
  block: LayoutBlock
  /** A típus ismételt példánya-e a lapon — az alap-horgony csak az elsőé. */
  isRepeat: boolean
  paidProducts: Product[]
  freeProduct: Product | null
  posts: Post[]
  testimonials: Testimonial[]
}) {
  switch (block.blockType) {
    case 'filmHero':
      return <FilmHero block={block} />
    case 'welcome':
      return <Welcome block={block} />
    case 'usps':
      return <Usps block={block} />
    case 'states':
      return <States block={block} />
    case 'services':
      return <Services block={block} />
    case 'about':
      return <About block={block} />
    case 'pressLogos':
      return <PressLogos block={block} />
    case 'teamMembers':
      return <TeamMembers block={block} />
    case 'faq':
      return <FaqBlock block={block} />
    case 'accordion':
      return <Accordion block={block} />
    case 'ctaBanner':
      return <CtaBanner block={block} />
    case 'credsStrip': {
      const { id, variant } = sectionProps(block)
      const items = (block.items ?? [])
        .map((item) => item.text?.trim() ?? '')
        .filter((text) => text.length > 0)
      // Üres link a blokkban = a szerkesztő nem kért linket (nincs beépített pótlás).
      return (
        <CredentialsStrip
          id={id}
          items={items.length > 0 ? items : undefined}
          link={linkFrom(block.link) ?? null}
          variant={variant}
        />
      )
    }
    case 'courseCards': {
      const { id, variant } = sectionProps(block)
      return (
        <CourseCards
          ctaLabel={block.ctaLabel ?? undefined}
          eyebrow={block.eyebrow ?? undefined}
          heading={block.heading ?? undefined}
          id={id ?? (isRepeat ? `kurzusok-${block.id ?? 'ismetelt'}` : undefined)}
          lead={block.lead ?? undefined}
          products={paidProducts}
          variant={variant}
        />
      )
    }
    case 'freeSos': {
      const { id, variant } = sectionProps(block)
      const backgroundImage =
        block.backgroundImage && typeof block.backgroundImage === 'object'
          ? block.backgroundImage
          : null
      return (
        <FreeSos
          backgroundImage={backgroundImage}
          body={block.body ?? undefined}
          cta={linkFrom(block.cta)}
          freeProduct={freeProduct}
          id={id ?? (isRepeat ? `ingyenes-${block.id ?? 'ismetelt'}` : undefined)}
          title={block.title}
          variant={variant}
        />
      )
    }
    case 'howItWorks': {
      const { id, variant } = sectionProps(block)
      const steps = (block.steps ?? [])
        .map((step) => ({ title: step.title?.trim() ?? '', text: step.text?.trim() ?? '' }))
        .filter((step) => step.title.length > 0 && step.text.length > 0)
      return (
        <HowItWorks
          id={id}
          steps={steps.length > 0 ? steps : undefined}
          title={block.title ?? undefined}
          variant={variant}
        />
      )
    }
    case 'testimonials': {
      const { id, variant } = sectionProps(block)
      return (
        <TestimonialsSection
          eyebrow={block.eyebrow ?? undefined}
          heading={block.heading ?? undefined}
          headingId={`velemenyek-cim-${block.id ?? 'fo'}`}
          id={id ?? (isRepeat ? `velemenyek-${block.id ?? 'ismetelt'}` : undefined)}
          maxItems={block.maxItems ?? undefined}
          testimonials={testimonials}
          variant={variant}
        />
      )
    }
    case 'knowledge': {
      const { id, variant } = sectionProps(block)
      return (
        <KnowledgeSection
          heading={block.heading ?? undefined}
          id={id}
          limit={block.limit ?? undefined}
          posts={posts}
          variant={variant}
        />
      )
    }
    case 'richText': {
      const { id, variant } = sectionProps(block)
      if (!hasLexicalContent(block.content)) {
        return null
      }
      return (
        <Section id={id} variant={variant}>
          <Container size="narrow">
            <RichText content={block.content} />
          </Container>
        </Section>
      )
    }
    default:
      return null
  }
}
