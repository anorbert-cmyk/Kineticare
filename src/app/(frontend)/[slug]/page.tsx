import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PostView } from '@/components/content/PostView'
import { getPageBySlug } from '@/lib/cms'
import { buildPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return {}
  return buildPageMetadata(page)
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()
  return <PostView doc={page} />
}
