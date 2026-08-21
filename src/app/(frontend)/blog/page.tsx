import type { Metadata } from 'next'

import { BarionPageView } from '@/components/analytics/BarionPageView'
import { CategoryFilter } from '@/components/content/CategoryFilter'
import { JsonLd } from '@/components/content/JsonLd'
import { PostCard } from '@/components/content/PostCard'
import { PostsEmptyState } from '@/components/content/PostsEmptyState'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { shouldShowCategoryFilter } from '@/components/content/post-list'
import { BARION_PAGE_VIEW } from '@/lib/analytics/barion-events'
import { getCategoryBySlug, getContentCategories, getPosts, getPublishedProducts } from '@/lib/cms'
import { blogJsonLd } from '@/lib/seo'
import { categoriesWithPosts, freeCourseHref } from '@/lib/tudastar'

import '../styles/blocks/tudastar-lista.css'

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
 * ═══ ELRENDEZÉS: KÉTHASÁBOS RÁCS ═══
 * A lista `.kc-card-grid--posts` módosítót kap. A közös hármas rácsban a
 * kártya kivonatának mért sorhossza 28,8–37,4 karakter/sor minden asztali
 * szélességen — a 45-ös alsó tűréshatár (WCAG 2.2 1.4.8 és a repó Ü6
 * szabálya) ott nem teljesül. A levezetés: docs/tudastar-ux-terv.md 2.2, a
 * szabály maga styles/blocks/tudastar-lista.css.
 *
 * 2026-08-21, JAVÍTÁS. A módosító 2026-08-21-ig NEM azt csinálta, amit ez a
 * komment állított: a `repeat(auto-fit, minmax(min(100%, 26rem), 34rem))`
 * szabály böngészőben MINDEN szélességen EGY hasábot adott (mérve Chromium
 * 141-ben 320-tól 2560 px-ig), mert az auto-repeat ismétlésszáma a
 * HATÁROZOTT felső trackkel számol (CSS Grid 1, §7.2.3.1). A javított
 * szabállyal a böngészőben mért állapot:
 *
 *   320 · 390 · 592 · 640 · 768 · 904 px → 1 hasáb
 *   968 · 1024 · 1120 · 1280 · 1440 · 1920 · 2560 px → 2 hasáb
 *
 * és a kivonat sorhosszának mediánja 592 px-től felfelé 64 · 63 · 62 · 48 ·
 * 51 · 59 · 57 · 58 karakter/sor — végig a 45–85-ös tűrésen belül. Hat
 * cikknél a lap 1440 px-en 4 024 → 2 210 px.
 *
 * ═══ A SZŰRŐ MEGJELENÉSI KÜSZÖBE ═══
 * A chip-sor csak akkor jelenik meg, ha legalább három kategóriának van
 * cikke, VAGY legalább öt cikk van (B4.3) — enélkül a szűrő nem ad döntést,
 * csak zajt. A SZŰRT nézetben viszont MINDIG kint van: onnan az „Összes"
 * chip a visszaút, enélkül a lap zsákutca lenne.
 *
 * ═══ EYEBROW SZÁNDÉKOSAN NINCS ═══
 * A felvezető sor (`kc-eyebrow`) a lap típusát mondja ki a H1 fölött. Itt
 * ugyanazt a szót mondaná, mint a H1 („Tudástár"), tehát információt nem
 * hordozna. A kategória-oldalon van eyebrow, mert ott MÁST mond, mint a H1.
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

  // A küszöböt a SZŰRETLEN listán mérjük — szűrt nézetben a `posts` már csak
  // az adott téma cikkeit tartalmazza, abból a szűrő hasznossága nem
  // állapítható meg. Szűrt nézetben ezért a sor mindig kint van: az „Összes"
  // chip a visszaút, és zsákutcába nem küldünk senkit. Extra lekérdezés
  // nincs: szűretlen nézetben a `posts` maga a teljes lista.
  const showFilter =
    filtered ||
    shouldShowCategoryFilter(categoriesWithPosts(categories, posts).length, posts.length)

  return (
    <Section>
      {/* Barion Pixel `contentView` (contentType: 'Page'). A `list` kimarad: a
          bp.js kötött listájában nincs a Tudástárra illő érték, és a 'Misc'
          nem mond többet a hiányzó mezőnél. */}
      <BarionPageView
        pageId={BARION_PAGE_VIEW.knowledgeBase.id}
        pageName={BARION_PAGE_VIEW.knowledgeBase.name}
      />
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
        <div className="kc-tudastar-intro">
          <h1 className="kc-page-hero__title">Tudástár</h1>
          {/* A lead ugyanaz a mondat, ami a meta-leírásban áll: a látogató és
              a találati lista ugyanazt az ígéretet kapja (egy igazságforrás). */}
          <p className="kc-page-hero__lead">{LEAD}</p>
        </div>
        {showFilter ? <CategoryFilter categories={categories} activeSlug={kategoria} /> : null}
        {posts.length === 0 ? (
          <PostsEmptyState freeCourseHref={freeHref} variant={variant} />
        ) : (
          <div className="kc-card-grid kc-card-grid--posts">
            {posts.map((post) => (
              /* A lap egyetlen fölérendelt címsora a H1, tehát a kártyacím H2
                 — fix H3 mellett H1 → H3 ugrás keletkezne (WCAG 2.2 1.3.1).
                 A `list` változat (alapértelmezés) hozza a kivonatot: a
                 sorhossz mediánja mérve 48–64 karakter/sor 592 px felett. */
              <PostCard key={post.id} post={post} headingLevel={2} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  )
}
