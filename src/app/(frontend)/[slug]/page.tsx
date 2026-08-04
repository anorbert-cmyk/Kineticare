import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MediaImage } from '@/components/content/MediaImage'
import { hasLexicalContent } from '@/components/lexical/serialize'
import { RichText } from '@/components/lexical/RichText'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getPageBySlug } from '@/lib/cms'
import { buildPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return {}
  return buildPageMetadata(page, `/${slug}`)
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()
  const heroMedia = page.heroImage && typeof page.heroImage === 'object' ? page.heroImage : null

  return (
    <article>
      <Section className="kc-page-hero" variant="tint">
        <Container size="narrow">
          <h1 className="kc-page-hero__title">{page.title}</h1>
          {page.excerpt ? <p className="kc-page-hero__lead">{page.excerpt}</p> : null}
        </Container>
      </Section>
      {heroMedia ? (
        <Section flush>
          <Container>
            <div className="kc-page-hero__media">
              <MediaImage media={heroMedia} preferredSize="lg" priority sizes="(max-width: 1120px) 100vw, 1120px" />
            </div>
          </Container>
        </Section>
      ) : null}
      {hasLexicalContent(page.content) ? (
        <Section>
          <Container size="narrow">
            <RichText content={page.content} />
          </Container>
        </Section>
      ) : null}
    </article>
  )
}
