import type { Metadata } from 'next'

import { CategoryFilter } from '@/components/content/CategoryFilter'
import { JsonLd } from '@/components/content/JsonLd'
import { PostCard } from '@/components/content/PostCard'
import { PostsEmptyState } from '@/components/content/PostsEmptyState'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getCategoryBySlug, getContentCategories, getPosts, getPublishedProducts } from '@/lib/cms'
import { blogJsonLd } from '@/lib/seo'
import { freeCourseHref } from '@/lib/tudastar'

/**
 * /blog — a Tudástár listája.
 *
 * ═══ ÜRES ÁLLAPOT ═══
 * Nulla cikknél NEM egy szürke mondat marad a lapon, hanem a `PostsEmptyState`
 * panel: megmondja, mi kerül ide, és továbbvisz a valódi célokra (kurzuslista,
 * ingyenes kurzus, kapcsolat). Az indoklás és a kutatási források a
 * komponens fejlécében állnak.
 *
 * A korábbi szöveg („Ebben a kategóriában még nincs cikk.") ráadásul a
 * SZŰRETLEN listán is a kategóriáról beszélt — ezt az IA-audit N7 pontja
 * mérte ki. A két állapot innentől külön mondatot kap.
 *
 * ═══ KANONIKUS CÍM ═══
 * A `?kategoria=<slug>` szűrés ugyanazt a tartalmat adja, mint a dedikált
 * `/blog/kategoria/<slug>` oldal. Ilyenkor a canonical a DEDIKÁLT címre
 * mutat: a Google szerint „If you have the same content accessible under
 * different URLs, choose the URL you prefer", és a rel=canonical pontosan
 * ennek a preferenciának a jelzése
 * (https://developers.google.com/search/docs/crawling-indexing/canonicalization).
 * Ismeretlen kategóriánál (nincs ilyen slug) a canonical a szűretlen `/blog`.
 *
 * ═══ STRUKTURÁLT ADAT ═══
 * `Blog` + `BreadcrumbList`. A `Blog` node `blogPost` listája CSAK a ténylegesen
 * megjelenített cikkekből épül — üres listánál a mező kimarad, mert a
 * strukturált adatnak a LÁTHATÓ tartalommal kell egyeznie (docs/seo-geo-llm.md
 * 1. fejezet, „A séma minden mezője a látható tartalomból jön").
 */

export const dynamic = 'force-dynamic'

const LEAD =
  'Kézrehabilitációs cikkek, gyakorlatok és szakmai tudástár a Kineticare-től.'

type Props = { searchParams: Promise<{ kategoria?: string }> }

/** A `?kategoria=` szűrés kanonikus címe a dedikált kategória-oldal. */
async function canonicalPathFor(kategoria: string | undefined): Promise<string> {
  if (typeof kategoria !== 'string' || kategoria.length === 0) {
    return '/blog'
  }
  const category = await getCategoryBySlug(kategoria)
  return category ? `/blog/kategoria/${category.slug}` : '/blog'
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { kategoria } = await searchParams
  return {
    title: 'Tudástár',
    description: LEAD,
    alternates: { canonical: await canonicalPathFor(kategoria) },
  }
}

export default async function BlogPage({ searchParams }: Props) {
  const { kategoria } = await searchParams
  const [posts, categories] = await Promise.all([
    getPosts({ categorySlug: kategoria }),
    getContentCategories(),
  ])

  const filtered = typeof kategoria === 'string' && kategoria.length > 0
  // Szűrt, üres nézetnél megnézzük, van-e EGYÁLTALÁN cikk. Ha nincs, a
  // „Vissza a Tudástárba" út egy ugyanilyen üres lapra vinne, tehát a
  // magyarázó (hub) állapotot mutatjuk helyette: zsákutcába nem küldünk
  // senkit (skill 5. pont).
  const hasAnyPost =
    posts.length > 0 || (filtered ? (await getPosts({ limit: 1 })).length > 0 : false)
  const variant = filtered && hasAnyPost ? 'kategoria' : 'tudastar'
  // Az ingyenes kurzus útját CSAK a magyarázó üres állapothoz kérdezzük le:
  // tele listán egyetlen fölösleges kör sem fut.
  const freeHref =
    posts.length === 0 && variant === 'tudastar'
      ? freeCourseHref(await getPublishedProducts(50))
      : null

  return (
    <Section>
      <Container>
        {/* A gyűjtemény-séma csak a KANONIKUS (szűretlen) címen jelenik meg:
            a `?kategoria=` nézet canonicalja a dedikált kategória-oldalra
            mutat, és ott az a lap viseli a saját sémáját. Így ugyanaz a
            gyűjtemény nem íródik le kétszer, két URL-lel. */}
        {filtered ? null : (
          <JsonLd
            data={blogJsonLd({
              name: 'Tudástár',
              description: LEAD,
              path: '/blog',
              posts,
            })}
          />
        )}
        {/* BreadcrumbList SZÁNDÉKOSAN nincs: a Tudástár maga a szekció
            gyökere, és egy egyelemű morzsa nem hordoz információt. A
            mélyebb lapok (kategória, bejegyzés) viszont kapnak morzsát, a
            kurzusoldalak bevett, kétszintű alakjában (Tudástár → lap). */}
        <h1>Tudástár</h1>
        <CategoryFilter categories={categories} activeSlug={kategoria} />
        {posts.length === 0 ? (
          <PostsEmptyState freeCourseHref={freeHref} variant={variant} />
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
