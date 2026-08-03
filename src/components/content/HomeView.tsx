import Link from 'next/link'

import type { Page, Post, Product } from '../../payload-types'
import { organizationJsonLd } from '../../lib/seo'
import { HERO_VIDEO_STREAM_ID } from '../../lib/hero-video'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { HeroVideo } from './HeroVideo'
import { JsonLd } from './JsonLd'
import { MediaImage } from './MediaImage'
import { PostCard } from './PostCard'
import { ProductCard, isPubliclyVisibleProduct } from './ProductCard'
import { hasLexicalContent } from '../lexical/serialize'
import { RichText } from '../lexical/RichText'

/**
 * HomeView — a kezdőlap prezentációs komponense (tiszta, fixture-ből tesztelhető).
 *
 * Struktúra (a legacy kezdőlap szellemében: hero → segítség/kurzus → bizalom/tudástár):
 * 1. Hero — a 'kezdolap' slugú CMS-oldalból (cím/kivonat/heroImage), fallbackben
 *    márka-alapértelmezés; CTA a kurzus-kiemelésre és a tudástárra. A hero média:
 *    ha a HERO_VIDEO_STREAM_ID be van állítva (src/lib/hero-video.ts), a Stream
 *    hero-videó jelenik meg, egyébként a CMS heroImage.
 * 2. Kurzus-kiemelés — published termékek kártyái (cover/cím/ár); üresen a
 *    szekció elmarad (nincs törött üres blokk).
 * 3. Legfrissebb posztok — a published tudástár-posztok kártyái + „Összes bejegyzés".
 * 4. A CMS-oldal richText-tartalma (ha van) a hero után — a staff által írt
 *    szekciók a Lexical-rendererrel.
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
            <div className="kc-hero__actions">
              <Button href="#kurzusok">Megnézem a kurzusokat</Button>
              <Button href="/blog" variant="secondary">
                Tudástár
              </Button>
            </div>
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
  const visiblePosts = posts.filter((post) => post.status === 'published' && post.slug)

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <HeroSection home={home} />

      {home?.content && hasLexicalContent(home.content) ? (
        <Section>
          <Container size="narrow">
            <RichText content={home.content} />
          </Container>
        </Section>
      ) : null}

      {visibleProducts.length > 0 ? (
        <Section id="kurzusok" variant="default">
          <Container>
            <h2 className="kc-section-title">Így tudunk neked segíteni</h2>
            <p className="kc-section-lead">
              Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni
              felépülésen.
            </p>
            <div className="kc-card-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
