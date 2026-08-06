import type { Metadata } from 'next'

import { HomeView } from '@/components/content/HomeView'
import { getHomePage, getLatestPosts, getPublishedProducts } from '@/lib/cms'

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

  // A kezdőlap strukturált adatát (Organization + FAQPage) a HomeView adja —
  // az a komponens, amelyik a látható tartalmat is rendereli, és amelyet a
  // fixture-tesztek fognak. Itt NEM ismételjük meg: a duplikált Organization
  // séma egy oldalon validációs figyelmeztetést okoz, és fölöslegesen kétszer
  // írja le ugyanazt az entitást a gépi olvasónak.
  return <HomeView home={home} products={products} posts={posts} />
}
