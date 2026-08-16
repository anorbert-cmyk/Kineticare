import Link from 'next/link'

import { courseHref } from '../../lib/course-url'
import { AUDIENCE_LABELS, normalizeAudience } from '../../lib/course-audience'
import { coursePriceBadgeKind, courseTitle } from '../../lib/courses'
import type { Product } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { PriceTag } from '../ui/PriceTag'
import { MediaImage } from './MediaImage'

import '../../app/(frontend)/styles/blocks/course-cards.css'

/**
 * ProductCard — a kezdőlapi kurzus-kiemelés kártyája („mini-buybox").
 *
 * SZERKEZET (a vezető 2026-08-15-i design-briefje szerint, egészségügyi
 * termék-landingek buybox-mintájára, DE a saját tokenjeinkkel — idegen színt
 * és betűt nem veszünk át):
 *
 *   borító → célközönség-címke → cím → rövid leírás →
 *   pipás előny-sorok (max 3, CMS) → hozzáférés-meta (a kurzus adataiból) →
 *   ár (PriceTag) → elsődleges CTA-gomb
 *
 * MINDEN SZÖVEG A CMS-BŐL JÖN. A cím a `displayTitle` → `sku` lánc, a leírás a
 * `shortDescription`, az előny-sorok a `cardHighlights` tömb, az ár a
 * `priceInHUF`, a hozzáférés-sor az `accessDurationDays`, a célközönség az
 * `audience`. A komponensben marketingszöveg nincs; a gombfelirat is kívülről
 * (blokk-mezőből) érkezik, a `DEFAULT_CTA_LABEL` csak fallback.
 *
 * A kártya a kurzus KANONIKUS címére mutat (courseHref: slug, ennek hiányában
 * a régi id-s út — ugyanaz a konvenció, mint a menüben, lásd
 * src/lib/menu-tree.ts). Csak published termék kerülhet a kártyára — a szűrés a
 * lekérdezésben (src/lib/cms.ts PUBLISHED_WHERE) történik, itt védőhálóként
 * újra ellenőrizzük.
 *
 * AKADÁLYMENTESSÉG: a kártya EGÉSZE egyetlen link, ezért benne beágyazott
 * gomb/link nem lehet — a CTA `aria-hidden` dekoráció (a korábbi nyíl-CTA
 * mintája), a pipa-ikonok szintén. A link akadálymentes neve így a cím, a
 * leírás, az előnyök és az ár marad; a gombfelirat nem duplázza meg.
 * Kontraszt: minden szöveg `text`/`text-muted` fehér kártyán (15,63:1 ill.
 * 9,30:1), a CTA fehér az `accent-deep`-en (5,45:1) — lásd course-cards.css.
 *
 * KIEMELT (VÍZSZINTES) VÁLTOZAT — `featured` prop. A MEZŐK ÉS A SORRENDJÜK
 * VÁLTOZATLANOK, csak az elrendezés fordul el: 900 px felett a borító balra,
 * a tartalom (cím, előnysorok, ár, CTA) jobbra kerül, és a kártya a szekció
 * teljes szélességét kitölti. Ez az egyetlen fizetős kurzus esete (a rács
 * ilyenkor egyetlen, középen árválkodó kártyát mutatna — lásd CourseCards).
 * A változat kizárólag CSS-módosító osztály: se új szöveg, se elhagyott mező,
 * se másik akadálymentességi minta nem tartozik hozzá.
 */

/** A CTA-gomb beépített felirata — a blokk `ctaLabel` mezője felülírja. */
export const DEFAULT_CTA_LABEL = 'Megnézem a programot'

export interface ProductCardProps {
  // A megjelenített név a displayTitle → sku lánc (courseTitle), az URL pedig a
  // slug → id lánc (courseHref) — lásd src/plugins/ecommerce.ts.
  product: Pick<
    Product,
    | 'id'
    | 'slug'
    | 'sku'
    | 'displayTitle'
    | 'shortDescription'
    | 'cardHighlights'
    | 'coverImage'
    | 'priceInHUF'
    | 'priceInHUFEnabled'
    | 'accessDurationDays'
    | 'audience'
    | 'status'
  >
  /**
   * A dekoratív CTA-gomb felirata (a `courseCards` blokk `ctaLabel` mezőjéből).
   * Üresen a `DEFAULT_CTA_LABEL` marad.
   */
  ctaLabel?: string
  /**
   * Kiemelt, VÍZSZINTES elrendezés (borító balra, tartalom jobbra) 900 px
   * felett. A tartalmi mezőkre nincs hatása — lásd a fejkommentet.
   */
  featured?: boolean
}

/** Publikusan megjeleníthető-e a termék (draft/archived sosem). */
export function isPubliclyVisibleProduct(product: { status?: string | null }): boolean {
  return product.status === 'published'
}

/**
 * A kártyán megjelenő előny-sorok a `cardHighlights` tömbből: trimmelve, üres
 * sorok nélkül, legfeljebb 3 (a mező `maxRows`-ával azonos plafon — a felület
 * akkor sem törik el, ha egy régi rekordban több sor maradt).
 */
export function cardHighlightTexts(
  product: Pick<Product, 'cardHighlights'>,
  limit = 3,
): string[] {
  if (!Array.isArray(product.cardHighlights)) {
    return []
  }
  const texts: string[] = []
  for (const row of product.cardHighlights) {
    const text = typeof row?.text === 'string' ? row.text.trim() : ''
    if (text.length > 0) {
      texts.push(text)
    }
    if (texts.length === limit) {
      break
    }
  }
  return texts
}

/**
 * A hozzáférés hosszának kártya-felirata az `accessDurationDays` mezőből.
 *
 * SZÁNDÉKOSAN CSAK a pozitív, véges napszámot írjuk ki. Üres mezőnél a
 * rendszer szerint a hozzáférés nem jár le (a mező súgója és a
 * resolveCourseAccess is így értelmezi), de a „korlátlan/örökös hozzáférés"
 * ÍGÉRETÉT a kártya nem teheti meg helyettünk: a régi oldal épp ezen a ponton
 * mondott háromfélét („örökké" / „minimum egy évig" / ÁSZF: „három hónapra
 * garantált", lásd docs/regi-oldal-valaszok.md 4. táblázat 3. sora). Ki nem
 * töltött mezőnél tehát a sor egyszerűen elmarad — állítás helyett csend.
 */
export function accessDurationLabel(
  product: Pick<Product, 'accessDurationDays'>,
): string | null {
  const days = product.accessDurationDays
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) {
    return null
  }
  return `${Math.floor(days)} napos hozzáférés`
}

/** Pipa-ikon az előny-sorokhoz — dekoráció, ezért aria-hidden. */
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="kc-product-card__tick"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      <path d="M4.5 12.5 10 18 19.5 6.5" />
    </svg>
  )
}

export function ProductCard({ product, ctaLabel, featured = false }: ProductCardProps) {
  if (!isPubliclyVisibleProduct(product)) {
    return null
  }

  const title = courseTitle(product)
  // Egy igazságforrás a kurzusoldallal: a 'none' eset (ár-pipa BE, de az ár
  // ÜRES) szándékosan SEM árat, SEM „Ingyenes"-t nem mutat — az konfigurációs
  // hiba, és a címke a kártyán is megtévesztő lenne (lásd courses.ts).
  const priceBadge = coursePriceBadgeKind(product)
  const coverMedia =
    product.coverImage && typeof product.coverImage === 'object' ? product.coverImage : null
  const highlights = cardHighlightTexts(product)
  const accessLabel = accessDurationLabel(product)
  const audienceLabel = AUDIENCE_LABELS[normalizeAudience(product.audience)]
  const cta = ctaLabel?.trim() || DEFAULT_CTA_LABEL

  return (
    <Card
      as="article"
      className={`kc-product-card${featured ? ' kc-product-card--featured' : ''}`}
      interactive
      padded={false}
    >
      <Link className="kc-product-card__link" href={courseHref(product)}>
        {coverMedia ? (
          <span className="kc-product-card__cover">
            {/* A kiemelt kártya borítója a szekció fél szélességét kapja, ezért
                nagyobb forrásból (md) és nagyobb `sizes`-szal renderel. */}
            <MediaImage
              media={coverMedia}
              preferredSize={featured ? 'md' : 'sm'}
              sizes={
                featured ? '(max-width: 900px) 100vw, 520px' : '(max-width: 720px) 100vw, 352px'
              }
            />
          </span>
        ) : null}
        <span className="kc-product-card__body">
          <span className="kc-product-card__audience">
            <Badge tone="neutral">{audienceLabel}</Badge>
          </span>
          <span className="kc-product-card__title">{title}</span>
          {highlights.length > 0 ? (
            <span className="kc-product-card__highlights">
              {highlights.map((highlight) => (
                <span className="kc-product-card__highlight" key={highlight}>
                  <CheckIcon />
                  <span className="kc-product-card__highlight-text">{highlight}</span>
                </span>
              ))}
            </span>
          ) : null}
          {product.shortDescription ? (
            <span className="kc-product-card__description">{product.shortDescription}</span>
          ) : null}
          <span className="kc-product-card__foot">
            <span className="kc-product-card__pricing">
              {priceBadge === 'price' ? (
                <span className="kc-product-card__price">
                  <PriceTag label="Ár:" priceHuf={product.priceInHUF as number} />
                </span>
              ) : null}
              {priceBadge === 'free' ? (
                <span className="kc-product-card__price">
                  <Badge tone="success">Ingyenes</Badge>
                </span>
              ) : null}
              {accessLabel ? (
                <span className="kc-product-card__access">{accessLabel}</span>
              ) : null}
            </span>
            {/* A kártya EGÉSZE a kurzus-oldalra vivő link, ezért a CTA dekoratív
                felirat (aria-hidden) — beágyazott gomb/link nem lehet benne. */}
            <span aria-hidden="true" className="kc-product-card__cta">
              {cta} <span className="kc-product-card__cta-arrow">→</span>
            </span>
          </span>
        </span>
      </Link>
    </Card>
  )
}
