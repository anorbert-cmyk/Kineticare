import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { PostView } from '@/components/content/PostView'
import { PreviewBar } from '@/components/preview/PreviewBar'
import { getPostBySlug, getRelatedPosts } from '@/lib/cms'
import { withDraftRobots } from '@/lib/preview/draft-metadata'
import { buildPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // Draft mode-ban a piszkozat metaadata jön — és a válasz sosem indexelhető.
  const { isEnabled: isDraft } = await draftMode()
  const post = await getPostBySlug(slug, { draft: isDraft })
  if (!post) return withDraftRobots({}, isDraft)
  return withDraftRobots(buildPageMetadata(post, `/blog/${slug}`), isDraft)
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  // Előnézet (draft mode): a publikálatlan verzió is látszik. A sütit kizárólag
  // a /next/preview route adhatja, oda pedig csak staff/owner jut be. A
  // kapcsolódó posztok listája marad published-szűrt: azok nyilvános tartalmak.
  const { isEnabled: isDraft } = await draftMode()
  const post = await getPostBySlug(slug, { draft: isDraft })
  if (!post) notFound()
  const related = await getRelatedPosts(post)

  // Az Article JSON-LD-t a PostView rendereli (szerző + og:image feloldással).
  return (
    <>
      {isDraft ? <PreviewBar path={`/blog/${slug}`} /> : null}
      <PostView post={post} related={related} showMeta />
    </>
  )
}
