import Link from 'next/link'

import type { Post } from '../../payload-types'
import { estimateReadingMinutes } from '../../lib/reading-time'
import { articleJsonLd, breadcrumbJsonLd, resolveOgImageUrl } from '../../lib/seo'
import { Badge } from '../ui/Badge'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { JsonLd } from './JsonLd'
import { MediaImage } from './MediaImage'
import { formatPostDate, PostCard } from './PostCard'
import { PostAuthorBox } from './PostAuthorBox'
import { PostBody } from './PostBody'
import { PostCourseCta } from './PostCourseCta'
import { PostFaq, POST_FAQ_HEADING, POST_FAQ_HEADING_ID } from './PostFaq'
import { PostToc } from './PostToc'
import {
  authorPersonOf,
  bylineOf,
  courseCtaTargetOf,
  firstCategoryOf,
  postFaqItems,
  relatedHeading,
  reviewDatesOf,
  reviewerPersonOf,
  shouldShowToc,
} from './post-article'
import { headingsOf, plainTextOf, wordCountOf } from './post-outline'

import '../../app/(frontend)/styles/blocks/post-view.css'

/**
 * PostArticle — a Tudástár cikkoldalának karmestere.
 *
 * ═══ A SZAKASZ-SORREND, ÉS MIÉRT PONT EZ ═══
 *
 *   HERO (tint sáv, szűk konténer): kategória-címke · H1 · lead · byline-sor
 *   BORÍTÓ (csak ha van, széles konténer)
 *   TÖRZS (szűk konténer): tartalomjegyzék · szöveg (a záró „Források" H2-vel)
 *          · Gyakori kérdések · szerző- és lektor-blokk
 *   KURZUS-CTA (tint sáv, kompakt panel)
 *   KAPCSOLÓDÓ CIKKEK
 *
 * A sorrend két, látszólag ütköző NN/g-ajánlást old fel. A *Related Content
 * Boosts Pageviews, When Done Right*
 * (https://www.nngroup.com/articles/related-content-pageviews/) szerint „don't
 * let anything come between the article and related links", mert a nagy üres
 * felület és a hirdetés-szerű doboz HAMIS LAPVÉGET jelez; ugyanez a cikk
 * viszont azt is kimondja: „Always offer related content and or strong calls
 * to action at the end of articles." A feloldás: a CTA közvetlenül a cikk
 * után áll, KOMPAKT panelként, és utána AZONNAL jönnek a kapcsolódó cikkek —
 * a két blokk közti üres táv mérve 56 px (post-view.css), a küszöb 72 px
 * (docs/tudastar-ux-terv.md 5.8).
 *
 * A szerző-blokk a TÖRZS zárása (nem a lábléc): az NHS mérése szerint a fő
 * tartalomtól elszakított, lábléc-közeli ellenőrzés-dátumot a felhasználók
 * nem veszik észre (lásd PostAuthorBox).
 *
 * ═══ SZŰK KONTÉNER, NEM KÉT HASÁB ═══
 * A 720 px-es `narrow` konténer + a `--kc-measure` korlát mért sorhossza
 * 47,5–72,2 karakter 390–1920 px között, vagyis végig a 45–85-ös tűrésen
 * belül, 1024 px felett a cél-sávban (docs/tudastar-ux-terv.md 5.2). Kétharmad
 * plusz ragadós oldalsáv (GOV.UK-minta) NEM kell hozzá, és a ragadó elem a
 * meglévő ragadós fejléc mellett WCAG 2.2 **2.4.11** kockázat lenne.
 *
 * ═══ FÁJL-TULAJDON (a vezetőnek) ═══
 * Ez a komponens a `docs/tudastar-technikai-terv.md` 3.9 pontjának
 * `PostView`-terve, ÚJ fájlban. A meglévő `PostView.tsx` ebben a körben nem
 * az én fájlom (más csapat is dolgozik párhuzamosan), ezért nem írtam át:
 * a cikk-útvonal (`blog/[slug]/page.tsx`) erre a komponensre vált, a
 * `PostView` érintetlen marad. Szüret után a vezető döntése, hogy a régi
 * komponenst törli-e (ma már csak a `home-cms.test.ts` hivatkozik rá).
 */
export interface PostArticleProps {
  post: Post
  /** Kívülről betöltött kapcsolódó cikkek (getRelatedPosts); alap: a poszt saját mezője. */
  related?: Post[]
}

/** Csak közzétett, sluggal rendelkező cikk jelenhet meg kapcsolódóként; max 3. */
function displayableRelated(posts: readonly (number | Post)[] | null | undefined): Post[] {
  if (!Array.isArray(posts)) return []
  return posts
    .filter((item): item is Post => typeof item === 'object' && item !== null)
    .filter((item) => item.status === 'published' && typeof item.slug === 'string')
    .slice(0, 3)
}

export function PostArticle({ post, related: relatedProp }: PostArticleProps) {
  const author = authorPersonOf(post)
  const reviewer = reviewerPersonOf(post)
  const { reviewedAt, nextReviewAt } = reviewDatesOf(post)
  const category = firstCategoryOf(post)
  const date = formatPostDate(post.publishedAt)
  // A becslés a SIMA SZÖVEGBŐL számol, nem a nyers Lexical-fából: a fa
  // bejárása a mezők értékeit (`ltr`, `paragraph`, `normal`) is szónak
  // számolná, csomópontonként 2–3 fantomszóval (technikai terv D5).
  const readingMinutes = estimateReadingMinutes(plainTextOf(post.content))
  const faqItems = postFaqItems(post)
  const related = displayableRelated(relatedProp ?? post.relatedPosts)
  const heroMedia = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null

  // Tartalomjegyzék: a törzs H2-i, és ha van GYIK, annak a címsora a lista
  // VÉGÉN — az nem a Lexical-tartalomban él, ezért a bejáró nem látja. A
  // küszöb viszont csak a TARTALMI H2-ket számolja.
  const contentHeadings = headingsOf(post.content).filter((heading) => heading.tag === 'h2')
  const tocItems = [
    ...contentHeadings.map((heading) => ({ id: heading.id, text: heading.text })),
    ...(faqItems.length > 0 ? [{ id: POST_FAQ_HEADING_ID, text: POST_FAQ_HEADING }] : []),
  ]
  const showToc = shouldShowToc(wordCountOf(post.content), contentHeadings.length)

  const ctaClasses = ['kc-post-cta', related.length > 0 ? 'kc-post-cta--elotte-kapcsolodo' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <article>
      <JsonLd
        data={articleJsonLd({
          post,
          path: `/blog/${post.slug}`,
          ...(author !== null ? { authorName: author.name } : {}),
          imageUrl: resolveOgImageUrl(post),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Tudástár', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      <Section className="kc-page-hero" variant="tint">
        <Container size="narrow">
          {/* PONTOSAN egy kategória-címke (docs/tudastar-ux-terv.md 5.3): a
              következetesség ugyanaz a Baymard-elv, mint a kártyákon, és a
              címke a kategória-oldalra vezető visszaút is. */}
          {category !== null && typeof category.slug === 'string' ? (
            <p className="kc-post-hero__categories">
              <Link href={`/blog/kategoria/${category.slug}`}>
                <Badge tone="info">{category.title}</Badge>
              </Link>
            </p>
          ) : null}
          <h1 className="kc-page-hero__title">{post.title}</h1>
          {post.excerpt ? <p className="kc-page-hero__lead">{post.excerpt}</p> : null}
          <p className="kc-post-meta">
            {author !== null ? (
              <span className="kc-post-meta__author">{bylineOf(author.name, author.credentials)}</span>
            ) : null}
            {date !== null ? (
              <time dateTime={typeof post.publishedAt === 'string' ? post.publishedAt : undefined}>
                {date}
              </time>
            ) : null}
            {/* A „kb." kimondja, hogy BECSLÉS: a 200 szó/perc a legjobb
                elérhető közelítés (Brysbaert 2019, 238 szó/perc angol
                nem-fikcióra), magyarra validált érték nincs. */}
            <span>kb. {readingMinutes} perc olvasás</span>
          </p>
        </Container>
      </Section>

      {heroMedia ? (
        <Section flush>
          <Container>
            <div className="kc-page-hero__media">
              <MediaImage
                media={heroMedia}
                preferredSize="lg"
                priority
                sizes="(max-width: 1120px) 100vw, 1120px"
              />
            </div>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container size="narrow">
          <div className="kc-post-body">
            {showToc ? <PostToc items={tocItems} /> : null}
            <PostBody content={post.content} />
            <PostFaq items={faqItems} />
            <PostAuthorBox
              author={author}
              nextReviewAt={nextReviewAt}
              reviewedAt={reviewedAt}
              reviewer={reviewer}
            />
          </div>
        </Container>
      </Section>

      <Section className={ctaClasses} variant="tint">
        <Container size="narrow">
          <PostCourseCta course={courseCtaTargetOf(post)} />
        </Container>
      </Section>

      {related.length > 0 ? (
        <Section className="kc-post-related">
          <Container>
            <h2 className="kc-section-title">{relatedHeading(post, related)}</h2>
            <div className="kc-card-grid">
              {related.map((relatedPost) => (
                <PostCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </article>
  )
}
