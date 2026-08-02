import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/content/JsonLd'
import { PostView } from '@/components/content/PostView'
import { getPostBySlug, getRelatedPosts } from '@/lib/cms'
import { articleJsonLd, buildPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  return buildPageMetadata(post)
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  const related = await getRelatedPosts(post)

  return (
    <>
      <JsonLd data={articleJsonLd(post)} />
      <PostView doc={post} related={related} showMeta />
    </>
  )
}
