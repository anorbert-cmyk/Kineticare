import type { Metadata } from 'next'

import { HomeView } from '@/components/content/HomeView'
import { JsonLd } from '@/components/content/JsonLd'
import { getHomePage, getLatestPosts, getPublishedProducts } from '@/lib/cms'
import { organizationJsonLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomePage()
  return {
    title: home?.seoTitle ?? home?.title ?? 'Kineticare — Kézrehabilitációs online kurzusplatform',
    description:
      home?.seoDescription ??
      home?.excerpt ??
      'Kineticare — kézrehabilitációs online videókurzusok otthoni gyógytornászati programmal.',
  }
}

export default async function HomePage() {
  const [home, products, posts] = await Promise.all([
    getHomePage(),
    getPublishedProducts(),
    getLatestPosts(3),
  ])

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <HomeView home={home} products={products} posts={posts} />
    </>
  )
}
