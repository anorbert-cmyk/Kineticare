import Link from 'next/link'

import type { Page, Post, Product } from '../../payload-types'
import { organizationJsonLd } from '../../lib/seo'
import { HERO_VIDEO_STREAM_ID } from '../../lib/hero-video'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { HeroVideo } from './HeroVideo'
import { JsonLd } from './JsonLd'
import { MediaImage } from './MediaImage'
import { PostCard } from './PostCard'
import { isPubliclyVisibleProduct } from './ProductCard'
import { CourseCards, isPaidProduct } from './home/CourseCards'
import { CredentialsStrip } from './home/CredentialsStrip'
import { Faq } from './home/Faq'
import { FreeSos } from './home/FreeSos'
import { HeroCta } from './home/HeroCta'
import { HowItWorks } from './home/HowItWorks'
import { hasLexicalContent } from '../lexical/serialize'
import { RichText } from '../lexical/RichText'

/**
 * HomeView — a kezdőlap prezentációs komponense (tiszta, fixture-ből tesztelhető).
 *
 * A docs/ux-hierarchia-audit.md cél-hierarchiája szerinti sorrend (üzleti cél:
 * kurzus-értékesítés → bizalom → kapcsolat; a lead-magnet másodlagos):
 * 1. M1 Hero + EGY elsődleges CTA a fizetős kurzusokra (→ /kurzusok) +
 *    visszafogott másodlagos link az ingyenes SOS-ra (HeroCta). A hero média:
 *    ha a HERO_VIDEO_STREAM_ID be van állítva (src/lib/hero-video.ts), a Stream
 *    hero-videó jelenik meg, egyébként a CMS heroImage — a videóblokk érintetlen.
 * 2. M2 Fizetős kurzus-kártyák (cím/rövid leírás/ÁR/CTA) KÖZVETLENÜL a hero
 *    után (CourseCards) — üresen a szekció elmarad.
 * 3. M3 „Így működik az online kurzus" — 3 lépés, statikus (HowItWorks).
 * 4. M4 Szakmai hitel-csík a /rolunk linkkel (CredentialsStrip).
 * 5. M5 Vélemények — KIVÉVE: valódi, hitelesíthető idézetek hiányában a
 *    szekció egyelőre elmarad (fiktív vélemény nem kerülhet ki; a valós
 *    idézetek érkezésekor visszatehető).
 * 6. M6 Gyakori kérdések — ellenérv-kezelés, statikus (Faq).
 * 7. M7 Ingyenes SOS Kézrelax — lead-magnet VISSZAFOGOTT súllyal (FreeSos).
 * 8. A CMS-oldal richText-tartalma (ha van) — a staff által írt szekciók.
 * 9. Legfrissebb posztok — tudástár (SEO, hosszútáv) + „Összes bejegyzés".
 * A kapcsolat/footer (M8) a layoutban él, itt érintetlen.
 *
 * A draft tartalom ide el sem jut: a lekérdezések published-szűrtjei mellett a
 * kártyakomponensek is védőhálót tartanak.
 */
export interface HomeViewProps {
  home: Page | null
  products: Product[]
  posts: Post[]
}

function HeroSection({ home }: { home: Page | null }) {
  const title = home?.title?.trim() || 'Hatékony és biztonságos módszerek a kéz és a kar fájdalmai ellen'
  const lead =
    home?.excerpt?.trim() ||
    'Kézrehabilitációs online videókurzusok otthon végezhető gyógytornászati programmal — ínhüvelygyulladás, kéztőalagút-szindróma és teniszkönyök esetén.'
  const heroMedia = home?.heroImage && typeof home.heroImage === 'object' ? home.heroImage : null

  return (
    <Section className="kc-hero" variant="tint">
      <Container>
        <div className="kc-hero__grid">
          <div className="kc-hero__content">
            <h1 className="kc-hero__title">{title}</h1>
            <p className="kc-hero__lead">{lead}</p>
            <HeroCta />
          </div>
          {HERO_VIDEO_STREAM_ID !== null ? (
            <div className="kc-hero__media">
              <HeroVideo streamId={HERO_VIDEO_STREAM_ID} />
            </div>
          ) : heroMedia ? (
            <div className="kc-hero__media">
              <MediaImage media={heroMedia} preferredSize="md" priority sizes="(max-width: 900px) 100vw, 544px" />
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}

export function HomeView({ home, products, posts }: HomeViewProps) {
  const visibleProducts = products.filter(isPubliclyVisibleProduct)
  const paidProducts = visibleProducts.filter(isPaidProduct)
  const freeProduct = visibleProducts.find((product) => !isPaidProduct(product)) ?? null
  const visiblePosts = posts.filter((post) => post.status === 'published' && post.slug)

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <HeroSection home={home} />

      <CourseCards products={paidProducts} />

      <HowItWorks />

      <CredentialsStrip />

      <Faq />

      <FreeSos freeProduct={freeProduct} />

      {home?.content && hasLexicalContent(home.content) ? (
        <Section>
          <Container size="narrow">
            <RichText content={home.content} />
          </Container>
        </Section>
      ) : null}

      {visiblePosts.length > 0 ? (
        <Section variant="tint">
          <Container>
            <h2 className="kc-section-title">Legfrissebb a tudástárból</h2>
            <div className="kc-card-grid">
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <p className="kc-section-more">
              <Link className="kc-text-link" href="/blog">
                Összes bejegyzés a tudástárban
              </Link>
            </p>
          </Container>
        </Section>
      ) : null}
    </>
  )
}
