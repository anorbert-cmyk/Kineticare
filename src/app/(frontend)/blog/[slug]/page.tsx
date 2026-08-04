import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PostView } from '@/components/content/PostView'
import { getPostBySlug, getRelatedPosts } from '@/lib/cms'
import { buildPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  return buildPageMetadata(post, `/blog/${slug}`)
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  const related = await getRelatedPosts(post)

  // Az Article JSON-LD-t a PostView rendereli (szerző + og:image feloldással).
  return <PostView post={post} related={related} showMeta />
}
