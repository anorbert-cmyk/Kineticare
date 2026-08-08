import type { Metadata } from 'next'
import { draftMode } from 'next/headers'

import { HomeView } from '@/components/content/HomeView'
import { PreviewBar } from '@/components/preview/PreviewBar'
import { getHomePage, getLatestPosts, getPublishedProducts, getTestimonials } from '@/lib/cms'
import { withDraftRobots } from '@/lib/preview/draft-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  // Draft mode-ban a piszkozat metaadata jön — és a válasz sosem indexelhető.
  const { isEnabled: isDraft } = await draftMode()
  const home = await getHomePage({ draft: isDraft })
  return withDraftRobots(
    {
      title: home?.seoTitle ?? home?.title ?? 'Kineticare — Kézrehabilitációs online kurzusplatform',
      description:
        home?.seoDescription ??
        home?.excerpt ??
        'Kineticare — kézrehabilitációs online videókurzusok otthoni gyógytornászati programmal.',
    },
    isDraft,
  )
}

export default async function HomePage() {
  // Előnézet (draft mode): a kezdőlap CMS-oldalának publikálatlan verziója is
  // látszik. A sütit kizárólag a /next/preview route adhatja, oda pedig csak
  // staff/owner jut be. A termék-, poszt- és vélemény-listák published-szűrtek
  // maradnak — a piszkozat-előnézet a kezdőlap SAJÁT tartalmára vonatkozik.
  const { isEnabled: isDraft } = await draftMode()
  const [home, products, posts, testimonials] = await Promise.all([
    getHomePage({ draft: isDraft }),
    getPublishedProducts(),
    getLatestPosts(3),
    getTestimonials(),
  ])

  // A kezdőlap strukturált adatát (Organization + FAQPage) a HomeView adja —
  // az a komponens, amelyik a látható tartalmat is rendereli, és amelyet a
  // fixture-tesztek fognak. Itt NEM ismételjük meg: a duplikált Organization
  // séma egy oldalon validációs figyelmeztetést okoz, és fölöslegesen kétszer
  // írja le ugyanazt az entitást a gépi olvasónak.
  return (
    <>
      {isDraft ? <PreviewBar path="/" /> : null}
      <HomeView home={home} posts={posts} products={products} testimonials={testimonials} />
    </>
  )
}
