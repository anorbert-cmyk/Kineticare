import type { Metadata } from 'next'
import { draftMode } from 'next/headers'

import { BarionPageView } from '@/components/analytics/BarionPageView'
import { HomeView } from '@/components/content/HomeView'
import { KNOWLEDGE_POSTS_FETCH_LIMIT } from '@/components/content/home/KnowledgeSection'
import { PreviewBar } from '@/components/preview/PreviewBar'
import { BARION_PAGE_VIEW } from '@/lib/analytics/barion-events'
import { getAppointmentSectionContext } from '@/lib/appointment/section'
import { getHomePage, getLatestPosts, getPublishedProducts, getTestimonials } from '@/lib/cms'
import { withDraftRobots } from '@/lib/preview/draft-metadata'
import { buildStaticPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  // Draft mode-ban a piszkozat metaadata jön — és a válasz sosem indexelhető.
  const { isEnabled: isDraft } = await draftMode()
  const home = await getHomePage({ draft: isDraft })
  const title =
    home?.seoTitle ?? home?.title ?? 'Kineticare — Kézrehabilitációs online kurzusplatform'
  const description =
    home?.seoDescription ??
    home?.excerpt ??
    'Kineticare — kézrehabilitációs online videókurzusok otthoni gyógytornászati programmal.'
  // A kezdőlapnak a keret-layout OG-je adná a címet, de `og:url` nélkül. A
  // közös segédlet a kanonikus címet is kiírja, és ugyanazt a szerkezetet adja,
  // mint a többi nyilvános oldal.
  return withDraftRobots(buildStaticPageMetadata({ title, description, path: '/' }), isDraft)
}

export default async function HomePage() {
  // Előnézet (draft mode): a kezdőlap CMS-oldalának publikálatlan verziója is
  // látszik. A sütit kizárólag a /next/preview route adhatja, oda pedig csak
  // staff/owner jut be. A termék-, poszt- és vélemény-listák published-szűrtek
  // maradnak — a piszkozat-előnézet a kezdőlap SAJÁT tartalmára vonatkozik.
  const { isEnabled: isDraft } = await draftMode()
  // A posztokból a knowledge blokk felső limitjéig (6) kérünk, hogy a
  // szekciósor bármely beállítása egyetlen párhuzamos lekérdezésből kijöjjön;
  // a rögzített kezdőlap továbbra is 3-at mutat (KnowledgeSection limit).
  const [home, products, posts, testimonials] = await Promise.all([
    getHomePage({ draft: isDraft }),
    getPublishedProducts(),
    getLatestPosts(KNOWLEDGE_POSTS_FETCH_LIMIT),
    getTestimonials(),
  ])

  // A kezdőlap strukturált adatát (Organization + FAQPage) a HomeView adja —
  // az a komponens, amelyik a látható tartalmat is rendereli, és amelyet a
  // fixture-tesztek fognak. Itt NEM ismételjük meg: a duplikált Organization
  // séma egy oldalon validációs figyelmeztetést okoz, és fölöslegesen kétszer
  // írja le ugyanazt az entitást a gépi olvasónak.
  // Az időpontkérő szekció űrlapjához kell a form-azonosító és a Turnstile site
  // key. A lekérdezés csak akkor fut, ha a kezdőlapi szekciósorban tényleg van
  // ilyen blokk (a helper maga dönti el).
  const appointment = await getAppointmentSectionContext(home?.layout)

  return (
    <>
      {isDraft ? <PreviewBar path="/" /> : null}
      {/* Barion Pixel `contentView` (contentType: 'Page'). A termékoldal SAJÁT
          Product-ágú eseményt küld (CourseBarionView) — a kettő sosem fut
          ugyanazon az oldalon, ezért nincs duplikált megtekintés. */}
      <BarionPageView
        list={BARION_PAGE_VIEW.home.list}
        pageId={BARION_PAGE_VIEW.home.id}
        pageName={BARION_PAGE_VIEW.home.name}
      />
      <HomeView
        appointment={appointment}
        home={home}
        posts={posts}
        products={products}
        testimonials={testimonials}
      />
    </>
  )
}
