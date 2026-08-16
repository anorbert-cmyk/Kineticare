import type { Product } from '../../../payload-types'
import { isPaidCourse } from '../../../lib/courses'
import { Container } from '../../ui/Container'
import { Section } from '../../ui/Section'
import { ProductCard } from '../ProductCard'

import '../../../app/(frontend)/styles/blocks/course-cards.css'

/**
 * CourseCards — a FIZETŐS kurzusok kiemelése a hitel-csík után
 * (audit M3/K1: az értékesítés motorja, kártyánként cím/előnyök/ÁR/CTA).
 *
 * CSAK FIZETŐS KÁRTYA KERÜL A RÁCSBA. 2026-08-15-ig az ingyenes lead-magnet is
 * itt állt egy „másodlagos" kártyán — a tulajdonossal közösen végzett
 * kezdőlap-audit viszont kimutatta, hogy ez DUPLIKÁCIÓ: ugyanaz az SOS-termék
 * jelent meg a rácsban ÉS közvetlenül alatta a saját, akcentes FreeSos sávban,
 * ráadásul a hero másodlagos CTA-ja (#ingyenes) is oda mutat. Az ingyenes
 * ajánlat így háromszor szerepelt az első négy szekcióban, ami pontosan a
 * K2-hiba (az UX-skill M4 pontja: „a lead-magnet nem uralhatja el az oldalt").
 * A lead-magnet helye a FreeSos szekció — a rács a fizetős ajánlaté.
 * Üres (fizetős) listánál a szekció elmarad, nincs törött üres blokk.
 *
 * NINCS „Összes kurzus megtekintése" hivatkozás (2026-08-16, IA-audit D1/#7).
 * Két mért ok:
 *  - a rács SOHA nincs csonkolva (a hívó minden fizetős kurzust átad), tehát az
 *    „összes" ígéret ugyanazt adta, ami már a képernyőn volt. „A link is a
 *    promise": a felirat azt ígérje, ami a kattintás után TÉNYLEGESEN történik
 *    (NN/g, Better Link Labels — „Sincere",
 *    https://www.nngroup.com/articles/better-link-labels/);
 *  - ez volt a HARMADIK, egymástól eltérő felirat ugyanarra a célra
 *    (`/kurzusok`) ugyanazon a lapon, ami WCAG 2.2 3.2.4 (Consistent
 *    Identification) sérülés,
 *    https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
 * A szekció CTA-ja innentől maga a kurzuskártya (a kártya EGÉSZE link,
 * docs/ui-sztenderdek.md §3.2 #11), a kurzuslistára pedig a hero és a záró
 * CTA-sáv visz, egyetlen, azonos felirattal.
 *
 * Megjelenés: a landing szekció-nyelve (kis felső felirat + serif cím) és a
 * „mini-buybox" kurzuskártya (ProductCard). A közös osztályok (`kc-eyebrow`,
 * `kc-section-title`, `kc-section-lead`) a content.css-ből jönnek, a
 * blokk-specifikus réteg a styles/blocks/course-cards.css-ben él.
 *
 * EGYETLEN KURZUSNÁL VÍZSZINTES, KIEMELT KÁRTYA (tulajdonosi visszajelzés,
 * 2026-08-16). A rács `auto-fit`-je egy kártyánál egy 26rem-es oszlopot rajzol
 * a szekció közepére, a maradék ~2/3 szélesség üresen marad — a szekció
 * „félkésznek" hat, pedig ez a lap ÉRTÉKESÍTÉSI motorja (UX-skill 1. pont, M3).
 * Ilyenkor a kártya a teljes szekció-szélességet megkapja, vízszintes
 * elrendezésben (borító balra, tartalom jobbra). KETTŐ VAGY TÖBB kártyánál
 * marad a rács: ott az összehasonlíthatóság a fontosabb (azonos mezőrend,
 * egymás melletti hasábok — docs/ux-belso-oldalak-kutatas.md B4.1).
 * A döntés kizárólag a DARABSZÁMON múlik, tartalmi feltétele nincs, így a
 * szerkesztő bármikor visszakapja a rácsot egy második kurzus közzétételével.
 *
 * SZÖVEGEK: mind CMS-ből felülírható (`courseCards` blokk: eyebrow, heading,
 * lead, ctaLabel). Az alábbi konstansok kizárólag fallbackek — a szekció
 * akkor sem marad felirat nélkül, ha a szerkesztő üresen hagyja a mezőket.
 */

/** Felvezető sor — a `courseCards` blokk `eyebrow` mezője írja felül. */
export const DEFAULT_EYEBROW = 'Kurzusok'

/**
 * Szekciócím-fallback.
 *
 * SZÁNDÉKOSAN NEM „Így tudunk neked segíteni": az élő kezdőlapon az a cím
 * ütközött a Szolgáltatások szekció „Így tudunk segíteni" címével — két,
 * majdnem betűre azonos H2 ugyanazon a lapon (kezdőlap-audit, 2026-08-15).
 * A csere emellett a szekció DOLGÁT mondja ki: ez a blokk nem segítséget
 * ígér, hanem a megvásárolható kínálatot sorolja fel (UX-skill 1. pont: ami
 * pénzt hoz, az világos névvel, árral és CTA-val áll ki).
 */
export const DEFAULT_HEADING = 'Kurzusaink'

/** Bevezető-fallback — a blokk `lead` mezője írja felül. */
export const DEFAULT_LEAD =
  'Online kézrehabilitációs kurzusaink lépésről lépésre vezetnek végig az otthoni felépülésen.'

/**
 * Kiemelt (vízszintes) kártyát kap-e a szekció ennyi kurzusnál.
 *
 * A küszöb szándékosan EGY: kettőtől már van mit összehasonlítani, és a rács
 * két hasábja tölti a szekció szélességét. Külön exportált, hogy a szabályt
 * teszt közvetlenül rögzíthesse.
 */
export function usesFeaturedCard(productCount: number): boolean {
  return productCount === 1
}

/**
 * Fizetős-e a termék — az ÁR-MEGJELENÍTÉS szabályával azonos feltétel, egyetlen
 * forrásból (`isPaidCourse`, src/lib/courses.ts). A viselkedés változatlan
 * (érvényes ár = fizetős); a közös forrás azt zárja ki, hogy a kezdőlap és a
 * kurzusoldal ítélete szétcsússzon.
 *
 * FIGYELEM: a `!isPaidProduct` NEM jelent „ingyenes"-t — a hiányosan
 * konfigurált termék egyik halmazba sem tartozik. Ingyenességre az
 * `isFreeCourse` a helyes kérdés.
 */
export function isPaidProduct(product: {
  priceInHUFEnabled?: boolean | null
  priceInHUF?: number | null
}): boolean {
  return isPaidCourse(product as Pick<Product, 'priceInHUF' | 'priceInHUFEnabled'>)
}

export interface CourseCardsProps {
  /** A fizetős kurzusok — a rács kizárólag ezeket jeleníti meg. */
  products: Product[]
  /** Felvezető-felülírás a `courseCards` blokkból — üresen a beépített marad. */
  eyebrow?: string
  /** Cím-felülírás a `courseCards` blokkból — üresen a beépített cím marad. */
  heading?: string
  /** Bevezető-felülírás a blokkból — üresen a beépített szöveg marad. */
  lead?: string
  /** A kártyák dekoratív CTA-gombjának felirata a blokkból. */
  ctaLabel?: string
  /**
   * Horgony. Alapból „kurzusok" — a sticky nav /#kurzusok linkje erre épül,
   * ezért az alapérték felülírásakor a navigáció célját is ellenőrizni kell.
   */
  id?: string
  variant?: 'default' | 'tint' | 'dark'
}

export function CourseCards({
  products,
  eyebrow,
  heading,
  lead,
  ctaLabel,
  id = 'kurzusok',
  variant = 'default',
}: CourseCardsProps) {
  if (products.length === 0) {
    return null
  }

  const eyebrowText = eyebrow?.trim() || DEFAULT_EYEBROW
  const title = heading?.trim() || DEFAULT_HEADING
  const leadText = lead?.trim() || DEFAULT_LEAD
  const featured = usesFeaturedCard(products.length)

  return (
    <Section className="kc-course-cards" id={id} variant={variant}>
      <Container>
        <div className="kc-course-cards__head">
          <p className="kc-eyebrow">{eyebrowText}</p>
          <h2 className="kc-section-title">{title}</h2>
          <p className="kc-section-lead">{leadText}</p>
        </div>
        <div
          className={featured ? 'kc-course-cards__featured' : 'kc-card-grid kc-card-grid--courses'}
        >
          {products.map((product) => (
            <ProductCard
              ctaLabel={ctaLabel}
              featured={featured}
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </Container>
    </Section>
  )
}
