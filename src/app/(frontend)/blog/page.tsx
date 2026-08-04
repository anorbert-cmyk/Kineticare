import type { Metadata } from 'next'

import { PostCard } from '@/components/content/PostCard'
import { CategoryFilter } from '@/components/content/CategoryFilter'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getContentCategories, getPosts } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tudástár',
  description: 'Kézrehabilitációs cikkek, gyakorlatok és szakmai tudástár a Kineticare-től.',
  alternates: { canonical: '/blog' },
}

type Props = { searchParams: Promise<{ kategoria?: string }> }

export default async function BlogPage({ searchParams }: Props) {
  const { kategoria } = await searchParams
  const [posts, categories] = await Promise.all([
    getPosts({ categorySlug: kategoria }),
    getContentCategories(),
  ])

  return (
    <Section>
      <Container>
        <h1>Tudástár</h1>
        <CategoryFilter categories={categories} activeSlug={kategoria} />
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
