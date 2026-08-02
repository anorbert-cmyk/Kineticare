import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PostCard } from '@/components/content/PostCard'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getCategoryBySlug, getPosts } from '@/lib/cms'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: `${category.title} — Tudástár`,
    alternates: { canonical: `/blog/kategoria/${slug}` },
  }
}

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()
  const posts = await getPosts({ categorySlug: slug })

  return (
    <Section>
      <Container>
        <h1>{category.title}</h1>
        {posts.length === 0 ? (
          <p className="kc-empty">Ebben a kategóriában még nincs cikk.</p>
        ) : (
          <div className="kc-card-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  )
}
