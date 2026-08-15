import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import { Fragment, type ReactNode } from 'react'
import { cache } from 'react'

import { TrackEvent } from '@/components/analytics/TrackEvent'
import { JsonLd } from '@/components/content/JsonLd'
import { CourseBuybox } from '@/components/courses/CourseBuybox'
import { CourseCtaBand } from '@/components/courses/CourseCtaBand'
import { CourseCurriculum } from '@/components/courses/CourseCurriculum'
import { CourseFaq } from '@/components/courses/CourseFaq'
import { CourseFitCheck } from '@/components/courses/CourseFitCheck'
import { CourseGuarantee } from '@/components/courses/CourseGuarantee'
import { CourseHowItWorks } from '@/components/courses/CourseHowItWorks'
import { CourseJumpNav, type CourseJumpTarget } from '@/components/courses/CourseJumpNav'
import { LexicalContent } from '@/components/courses/LexicalContent'
import { MobileBuyBar } from '@/components/courses/MobileBuyBar'
import { PreviewVideo, hasPreviewVideo } from '@/components/courses/PreviewVideo'
import { RelatedCourses } from '@/components/courses/RelatedCourses'
import { buildCourseSalesContent } from '@/components/courses/sales-content'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { resolveSingleCourseAccess } from '@/lib/course-access-lookup'
import { AUDIENCE_LABELS, normalizeAudience } from '@/lib/course-audience'
import {
  canonicalCourseRedirect,
  courseHref,
  parseCourseRouteParam,
  withSearchParams,
  type CourseSearchParams,
} from '@/lib/course-url'
import {
  courseCover,
  coursePriceBadgeKind,
  coursePriceHuf,
  courseTitle,
  hasUserPurchased,
  resolveCourseCta,
} from '@/lib/courses'
import { buildCurriculum } from '@/lib/curriculum/curriculum'
import { formatPriceHuf } from '@/lib/format-price'
import { logger } from '@/lib/logger'
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildProductMetadata,
  courseJsonLd,
  faqPageJsonLd,
} from '@/lib/seo'
import type { Product, User } from '@/payload-types'

import config from '../../../../payload.config'

/**
 * /kurzusok/[slug] — kurzus-oldal (az értékesítés motorja).
 *
 * ═══ ÚTVONAL-SZABÁLYOK (VÁLTOZATLAN) ═══
 * - A [slug] szegmens ELSŐDLEGESEN a kurzus emberi olvasású `slug`-ja (C3).
 *   A régi, numerikus id-s cím (és minden nem kanonikus alak, pl. nagybetűs
 *   változat) továbbra is kiszolgálandó, de TARTÓS átirányítást kap a
 *   kanonikus címre — így a régi linkek SEO-értéke átöröklődik. A szabályok
 *   (feloldás + körmentes átirányítás) az src/lib/course-url.ts-ben élnek.
 * - published → mindenki láthatja; archived → az oldal megtekinthető, de a
 *   CTA INAKTÍV + „Ez a kurzus jelenleg nem vásárolható" jelölés (nem
 *   listázódik, a meglévő vevő a „Tovább a kurzusaimhoz" linket kapja);
 *   draft/ismeretlen → 404.
 * - A „már megvetted" állapot a bejelentkezett user purchases-listájából
 *   (users.purchases, csak olvasás) dől el — LEJÁRT hozzáférésnél (A1,
 *   accessDurationDays) viszont újra a vásárlási CTA jelenik meg, különben a
 *   vevő zsákutcába futna („vásárold meg újra" ↔ „tovább a kurzusaimhoz").
 *
 * ═══ AZ OLDAL SZERKEZETE (értékesítő átalakítás) ═══
 * A kutatás (docs/ux-belso-oldalak-kutatas.md 4. és 5.1) négy P0-s hibát mért
 * a korábbi felépítésen, és ez a felépítés pontosan azokra válaszol:
 *
 *  1. KÉTHASÁBOS FEJ (GOV.UK „two-thirds and one-third", B3.2): balra a média
 *     és a teljes tartalom, jobbra a ragadós vásárlódoboz. A ragadás a TELJES
 *     lap mellett utazik, nem csak a fej magasságában — a rács sora a fő
 *     hasáb magasságát veszi fel, az oldalsó elem `align-self: start`-tal
 *     ebben a sorban csúszik (kurzusok.css).
 *  2. HORGONY-CHIPEK a fő szakaszokra (K11, B2.3) — csak a LÉTEZŐ szakaszokra.
 *  3. SZAKASZOK mértékre fogott (34rem ≈ 75 karakter) folyószöveggel (B1.1),
 *     párhuzamos tartalom rácsban (B3.1), GYIK harmonikában (B5.1) — de ár,
 *     garancia és tananyag SOSEM harmonikában (B5.2).
 *  4. ISMÉTELT CTA minden 2. szakasz után + mobil ragadós vásárlósáv (B6.1).
 *
 * ═══ TARTALOM-HATÁR ═══
 * Az oldal SEMMILYEN értékesítő szöveget nem hardcode-ol: minden megjelenő
 * mondat vagy termékmezőből jön (`salesHighlights`, `howItWorks`, `fitFor`,
 * `notFitFor`, `guaranteeTitle`/`guaranteeText`, `faq`, `longDescription`,
 * `modules`), vagy tényadatból képződik. A fallback-lánc egyetlen, tesztelt
 * helyen él: src/components/courses/sales-content.ts.
 *
 * ═══ MÉRÉS ═══
 * A PostHog értékesítési funnel VÁLTOZATLAN: a `course_viewed` továbbra is az
 * oldal megnyitásakor sül el (TrackEvent), a `checkout_started` a pénztáron —
 * az ismételt CTA-k ugyanarra a checkout-útvonalra visznek, ezért az
 * eseménylánc nem duplázódik (docs/ertekesitesi-ux-skill.md 5. pont).
 */

interface CoursePageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<CourseSearchParams>
}

/**
 * Kérés-idejű dedupe: a generateMetadata és a page ugyanazt a lekérdezést
 * osztja meg. A szegmens slugként VAGY régi, numerikus id-ként oldódik fel
 * (parseCourseRouteParam) — a kettő névtere diszjunkt, lásd course-url.ts.
 */
const getCourseByRouteParam = cache(async (param: string): Promise<Product | null> => {
  const parsed = parseCourseRouteParam(param)
  if (parsed === null) {
    return null
  }
  try {
    const payload = await getPayload({ config })
    // depth: 2 — a relatedProducts és a borítóképek populate-olva jönnek.
    if (parsed.kind === 'id') {
      return await payload.findByID({
        collection: 'products',
        id: parsed.id,
        depth: 2,
        overrideAccess: true,
      })
    }
    const { docs } = await payload.find({
      collection: 'products',
      where: { slug: { equals: parsed.slug } },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    })
    return docs[0] ?? null
  } catch (error) {
    logger.warn('kurzus-lekérdezés sikertelen — 404-cel renderelünk', {
      courseParam: param,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
})

/** A bejelentkezett felhasználó (anonim látogatónál null) — csak olvasás. */
async function getCurrentUser(): Promise<User | null> {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return (user as User | null) ?? null
  } catch {
    return null
  }
}

/**
 * Él-e MÉG a vevő hozzáférése (A1). Lekérdezési hiba esetén true — a CTA
 * ilyenkor a mai, „már megvetted" viselkedést mutatja; a tényleges lejátszást
 * a stream-token végpont amúgy is újra ellenőrzi.
 */
async function hasLiveAccess(userId: number, product: Product): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const access = await resolveSingleCourseAccess({ payload, userId, product, logger })
    return access.hasAccess
  } catch (error) {
    logger.warn('kurzus-oldal: hozzáférés-állapot számítása sikertelen', {
      userId,
      productId: product.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return true
  }
}

function categoryTitle(product: Product): string | null {
  const category = typeof product.category === 'object' ? product.category : null
  return category && typeof category.title === 'string' && category.title.length > 0
    ? category.title
    : null
}

function relatedProductsOf(product: Product): Product[] {
  if (!Array.isArray(product.relatedProducts)) {
    return []
  }
  return product.relatedProducts.filter(
    (entry): entry is Product => typeof entry === 'object' && entry !== null,
  )
}

/** A vásárlódoboz horgonya — a mobil ragadós sáv EZT figyeli. */
const BUYBOX_ID = 'kurzus-vasarlas'

/**
 * A megjelenő szakaszok leírója. A `carriesCta` azt jelenti, hogy a szakasz
 * MAGA hordoz vásárlási gombot (ilyen a garancia-sáv) — ilyenkor közvetlenül
 * utána nem kell újabb CTA-sáv.
 */
interface PageSection {
  target: CourseJumpTarget | null
  node: ReactNode
  carriesCta: boolean
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getCourseByRouteParam(slug)
  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    return { title: 'A kurzus nem található' }
  }
  // Ugyanaz a fallback-lánc és canonical, mint a poszt- és az oldal-útvonalon
  // (src/lib/seo.ts): seoTitle → kurzusnév, seoDescription → rövid leírás,
  // ogImage → borítókép. Párhuzamos meta-logika itt nincs. A canonical MINDIG
  // a kanonikus (slugos) cím, akkor is, ha épp a régi id-s URL-t szolgáljuk ki.
  return buildProductMetadata(product, courseHref(product))
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { slug } = await params
  const product = await getCourseByRouteParam(slug)
  // Draft (és minden nem published/archived) termék nyilvánosan nem érhető el.
  if (!product || (product.status !== 'published' && product.status !== 'archived')) {
    notFound()
  }

  // Régi, id-alapú (vagy nem kanonikus alakú) cím → TARTÓS átirányítás.
  // SZÁNDÉKOSAN a 404-ellenőrzés UTÁN: draft termék slugja így sem szivárog ki.
  // A cél mindig maga a kanonikus cím, amely önmagára már nem irányít → nincs
  // átirányítási kör (course-url.ts canonicalCourseRedirect).
  // Státuszkód: a Next App Router tartós átirányítása 308 (Permanent Redirect).
  // A keresők ezt a 301-gyel azonosan kezelik (a link-érték átöröklődik), és a
  // 308 a 301-gyel ellentétben a metódust sem írja át — DB-vezérelt cél mellett
  // ez az egyetlen elérhető tartós átirányítás (a next.config redirects() csak
  // statikus szabályt tud).
  // A bejövő query string (pl. UTM-paraméterek) változatlanul továbbmegy a
  // kanonikus címre — a kampány-attribúció nem veszhet el az átirányításon.
  const canonicalPath = canonicalCourseRedirect(slug, product)
  if (canonicalPath !== null) {
    permanentRedirect(withSearchParams(canonicalPath, (await searchParams) ?? {}))
  }

  const user = await getCurrentUser()
  // Lejárt hozzáférés = a CTA szempontjából „még nem vevő": újra megvásárolható.
  const purchased =
    user !== null &&
    hasUserPurchased(user.purchases, product.id) &&
    (await hasLiveAccess(user.id, product))

  const title = courseTitle(product)
  const cover = courseCover(product)
  const price = coursePriceHuf(product)
  // Az ár-címke fajtája: 'price' → PriceTag; 'free' (tudatosan ingyenes) →
  // „Ingyenes"; 'none' (ár-pipa BE, ár ÜRES — konfig-hiba) → NINCS címke
  // (az „Ingyenes" a „Megveszem" mellett megtévesztő lenne — courses.ts
  // coursePriceBadgeKind).
  const priceBadge = coursePriceBadgeKind(product)
  const category = categoryTitle(product)
  // Kétirányú kurzusstruktúra: visszafogott jelzés arról, melyik ághoz tartozik
  // a kurzus (audience nélküli, régi soroknál a laikus fallback látszik).
  const audienceLabel = AUDIENCE_LABELS[normalizeAudience(product.audience)]
  const showPreview = hasPreviewVideo(product.previewVideoStreamId)
  // A strukturált adat és a morzsamenü ugyanazt a KANONIKUS címet használja,
  // mint a canonical meta — különben a gépi olvasó két URL-t látna egy oldalra.
  const path = courseHref(product)

  // A tananyag NYILVÁNOS nézete: hozzáférés nélkül épül, ezért a fizetős
  // tartalom hordozói (Bunny-GUID, lecke-szöveg, melléklet, külső link) bele
  // sem kerülnek a modellbe (S2/b — curriculum.ts).
  const curriculum = buildCurriculum(product, false)
  const sales = buildCourseSalesContent(product, {
    moduleCount: curriculum.modules.filter((module) => module.lessons.length > 0).length,
    lessonCount: curriculum.lessons.length,
    accessDurationDays:
      typeof product.accessDurationDays === 'number' ? product.accessDurationDays : null,
    free: priceBadge === 'free',
    hasPreview: showPreview,
  })

  // A CTA állapotgépe (courses.ts) — a checkout-útvonal és az árlogika
  // VÁLTOZATLAN. Az ismételt sávok csak a ténylegesen vásárolható állapotban
  // jelennek meg: „már megvetted" vagy „nem vásárolható" mellett egyetlen
  // (a vásárlódobozbeli) jelzés marad, ismétlés nélkül.
  const cta = resolveCourseCta(product, purchased)
  const showRepeatCta = cta.kind === 'buy' || cta.kind === 'free'
  const priceLabel =
    priceBadge === 'price' && price !== null
      ? formatPriceHuf(price)
      : priceBadge === 'free'
        ? 'Ingyenes'
        : null
  const guaranteeLabel = sales.guarantee === null ? null : sales.guarantee.title

  const ctaBand = (
    <CourseCtaBand
      courseTitle={title}
      guaranteeLabel={guaranteeLabel}
      hasPurchased={purchased}
      priceBadge={priceBadge}
      priceHuf={price}
      product={product}
    />
  )

  // ── A szakaszok, dokumentum-sorrendben ────────────────────────────────────
  const sections: PageSection[] = []

  if (sales.body !== null) {
    sections.push({
      target: { id: 'mi-ez', label: 'Mi ez?' },
      carriesCta: false,
      node: (
        <section aria-labelledby="mi-ez-cim" className="kc-course-section" id="mi-ez">
          <h2 className="kc-course-section__title" id="mi-ez-cim">
            A kurzusról
          </h2>
          <LexicalContent className="kc-course-prose" content={sales.body} />
        </section>
      ),
    })
  }

  if (sales.steps.length > 0) {
    sections.push({
      target: { id: 'hogyan-mukodik', label: 'Hogyan működik?' },
      carriesCta: false,
      node: (
        <CourseHowItWorks
          heading="Hogyan működik?"
          headingId="hogyan-mukodik-cim"
          steps={sales.steps}
        />
      ),
    })
  }

  const curriculumModules = curriculum.modules.filter((module) => module.lessons.length > 0)
  if (curriculumModules.length > 0) {
    sections.push({
      target: { id: 'tananyag', label: 'Tananyag' },
      carriesCta: false,
      node: (
        <CourseCurriculum
          heading="Tananyag"
          headingId="tananyag-cim"
          modules={curriculumModules}
        />
      ),
    })
  }

  if (sales.fitFor.length > 0 || sales.notFitFor.length > 0) {
    sections.push({
      target: { id: 'kinek-valo', label: 'Kinek való?' },
      carriesCta: false,
      node: (
        <CourseFitCheck
          fitFor={sales.fitFor}
          fitTitle="Neked való, ha…"
          heading="Kinek való — és kinek nem?"
          headingId="kinek-valo-cim"
          notFitFor={sales.notFitFor}
          notFitTitle="Nem javasoljuk, ha…"
        />
      ),
    })
  }

  if (sales.guarantee !== null) {
    sections.push({
      target: { id: 'garancia', label: 'Garancia' },
      // A garancia a döntést támogató FŐ érv — a kutatás szerint épp utána
      // kell gombnak következnie, ezért a sáv maga hordozza a CTA-t (B6.1).
      carriesCta: showRepeatCta,
      node: (
        <CourseGuarantee guarantee={sales.guarantee} headingId="garancia-cim">
          {showRepeatCta ? ctaBand : null}
        </CourseGuarantee>
      ),
    })
  }

  if (sales.faq.length > 0) {
    sections.push({
      target: { id: 'gyik', label: 'GYIK' },
      carriesCta: false,
      node: <CourseFaq heading="Gyakori kérdések" headingId="gyik-cim" items={sales.faq} />,
    })
  }

  // Ismételt CTA: minden 2. szakasz után, és a lap végén. A saját CTA-t
  // hordozó szakasz (garancia) nullázza a számlálót, hogy ne kerüljön két
  // vásárlási sáv egymás mellé.
  const rendered: ReactNode[] = []
  let sinceCta = 0
  for (const [index, section] of sections.entries()) {
    rendered.push(<Fragment key={`szakasz-${index}`}>{section.node}</Fragment>)
    if (section.carriesCta) {
      sinceCta = 0
      continue
    }
    sinceCta += 1
    const isLast = index === sections.length - 1
    // A KÖVETKEZŐ szakasz saját gombja elé nem kerül újabb sáv: két vásárlási
    // sáv egymás után már nem ismétlés, hanem zaj.
    const nextCarriesCta = sections[index + 1]?.carriesCta === true
    if (showRepeatCta && sinceCta >= 2 && !isLast && !nextCarriesCta) {
      rendered.push(<Fragment key={`cta-${index}`}>{ctaBand}</Fragment>)
      sinceCta = 0
    }
  }
  if (showRepeatCta && sinceCta > 0 && sections.length > 0) {
    rendered.push(<Fragment key="cta-zaro">{ctaBand}</Fragment>)
  }

  const jumpTargets = sections
    .map((section) => section.target)
    .filter((target): target is CourseJumpTarget => target !== null)
  // A vásárlódoboz másodlagos, alacsonyabb súlyú útja: a legfontosabb
  // döntési szakaszra visz (kinek való → tananyag → az első létező szakasz).
  const secondaryTarget =
    jumpTargets.find((target) => target.id === 'kinek-valo') ??
    jumpTargets.find((target) => target.id === 'tananyag') ??
    jumpTargets[0] ??
    null

  return (
    <>
      {/* PostHog funnel-lépés: a kurzus-oldal megnyitása (no-op consent nélkül). */}
      <TrackEvent event="course_viewed" properties={{ courseId: product.id, courseSku: product.sku ?? undefined }} />
      {/* Strukturált adat: Course + Product (egy entitás, kettős @type) és a
          hozzá tartozó Offer. Minden mezője a LÁTHATÓ tartalomból jön — a név a
          H1, a leírás a hero lead, a kép a buybox borítóképe, az ár pedig a
          kiírt PriceTag forrása (priceInHUF), tehát árváltozásnál automatikusan
          követi és nem tud elavulni. */}
      <JsonLd
        data={courseJsonLd({
          product,
          name: title,
          path,
          priceHuf: price,
          ...(cover ? { imageUrl: absoluteUrl(cover.url) } : {}),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Kurzusok', path: '/kurzusok' },
          { name: title, path },
        ])}
      />
      {/* A FAQPage strukturált adat UGYANABBÓL a listából készül, mint a
          látható harmonika — a kettő így sosem tud szétcsúszni (ez a
          leggyakoribb ok, amiért a keresők elvetik a rich resultot). */}
      {sales.faq.length > 0 ? <JsonLd data={faqPageJsonLd(sales.faq)} /> : null}

      <Section>
        <Container>
          <nav aria-label="Morzsamenü" className="kc-course-breadcrumb">
            <ol role="list">
              <li>
                <Link href="/kurzusok">Kurzusok</Link>
              </li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>

          <div className="kc-course-layout">
            {/* DOM-sorrend: a vásárlódoboz ELÖL. Mobilon így a cím, az ár és a
                gomb a lap tetején van (a nézési idő 42%-a a felső 20%-ra esik),
                desktopon pedig a rács teszi a jobb hasábba — a fókusz-út
                végigjárva értelmes marad (B7.4). */}
            <div className="kc-course-layout__aside">
              <CourseBuybox
                audienceLabel={audienceLabel}
                categoryLabel={category}
                guaranteeLabel={guaranteeLabel}
                hasPurchased={purchased}
                highlights={sales.highlights}
                id={BUYBOX_ID}
                lead={product.shortDescription ?? null}
                priceBadge={priceBadge}
                priceHuf={price}
                product={product}
                secondaryHref={secondaryTarget === null ? null : `#${secondaryTarget.id}`}
                secondaryLabel={secondaryTarget === null ? null : secondaryTarget.label}
                title={title}
              />
            </div>

            <div className="kc-course-layout__main">
              {showPreview ? (
                <figure className="kc-course-media">
                  <PreviewVideo
                    streamId={product.previewVideoStreamId}
                    title={`${title} — előzetes`}
                  />
                  <figcaption className="kc-course-media__caption">Ingyenes előzetes</figcaption>
                </figure>
              ) : cover ? (
                <figure className="kc-course-media">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a Payload media méretei kézileg vannak bekötve (width/height a CMS-ből) */}
                  <img
                    alt={cover.alt}
                    className="kc-course-media__image"
                    decoding="async"
                    height={cover.height ?? undefined}
                    src={cover.url}
                    width={cover.width ?? undefined}
                  />
                </figure>
              ) : null}

              <CourseJumpNav targets={jumpTargets} />

              {rendered}
            </div>
          </div>
        </Container>
      </Section>

      {/* Mobil ragadós vásárlósáv: csak akkor, ha tényleg van mit indítani, és
          csak akkor látszik, ha a fő vásárlódoboz már kigörgött a képből. JS
          nélkül rejtve marad (MobileBuyBar). */}
      {showRepeatCta && cta.href !== null ? (
        <MobileBuyBar
          anchorId={BUYBOX_ID}
          courseTitle={title}
          href={cta.href}
          label={cta.label}
          priceLabel={priceLabel}
        />
      ) : null}

      <RelatedCourses products={relatedProductsOf(product)} />
    </>
  )
}
