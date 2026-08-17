import type { BlockFilmHero } from '../../payload-types'
import { Button } from '../ui/Button'
import { ScrollScrub } from '../scroll-scrub/scroll-scrub'
import type {
  ScrollScrubCaption,
  ScrollScrubScene,
  ScrollScrubTheme,
} from '../scroll-scrub/scroll-scrub'

import '../../app/(frontend)/styles/blocks/film-hero.css'

/**
 * FilmHero — a kezdőlap nyitó filmsávja (szekció-rendszer terv 2. és 3.3, M1).
 *
 * A `filmHero` blokk CMS-tartalmát (cím, bevezető, címkék, 0–2 gomb) a
 * görgetéssel vezérelt kéznyitás-film fölé rendereli. A film maga STATIKUS
 * asset (public/media/film/), nem Media-collection elem: a cseréje fejlesztői
 * feladat, ezért az útvonalak itt, egy helyen élnek — a ScrollScrub maga
 * általános, minden asset-útvonalat propból kap.
 *
 * A komponens SZERVER-kompatibilis: a böngésző-API-kat használó rész a
 * ScrollScrub 'use client' szigetében fut, ide csak adat és kész JSX kerül
 * (a gombokat szerveroldalon rendereljük, és `actions` propként adjuk át).
 *
 * UX-korlátok (docs/ertekesitesi-ux-skill.md):
 * - A cím az oldal EGYETLEN H1-e (a ScrollScrub az első jelenet címét h1-ként
 *   rendereli), mérete a három-méretes skála L (cím) lépcsője — annál nagyobb nem
 *   lehet (4. pont).
 * - M1: legfeljebb 2 gomb; az ELSŐ a hangsúlyos, fizetős irányba mutató CTA,
 *   a második visszafogott. A sorrendet a szerkesztő adja a blokkban.
 * - A gombok érintési célfelülete ≥ 44×44 px, fókuszgyűrűvel — a méreteket a
 *   styles/blocks/film-hero.css rögzíti.
 *
 * A `sectionSettings.visible` szűrése NEM itt történik: a blokk-renderelő
 * (RenderBlocks, F3) hagyja ki a rejtett szekciókat.
 *
 * ISMERT KORLÁT: a ScrollScrub a sáv geometriáját mountkor és resize-ra méri.
 * A blokk a lap ELEJÉRE való (a seed és az admin-sorrend is így ajánlja); ha a
 * szerkesztő mélyebbre húzza, a felette lévő, később betöltő képek eltolhatják
 * a mért görgetési sávot az első resize-ig.
 */

/** A statikus film négy assetje (terv 3.3 — desktop + mobil klip és poszter). */
const FILM_CLIP = '/media/film/scene-02.mp4'
const FILM_CLIP_MOBILE = '/media/film/scene-02-mobile.mp4'
const FILM_POSTER = '/media/film/scene-02-poster.png'
const FILM_POSTER_MOBILE = '/media/film/scene-02-mobile-poster.png'

/**
 * A film scrub-hossza viewport-magasságban (~460dvh) és a középső, terapeutás
 * szakasz lassítása — a landingen bevált értékek (terv 3.3).
 */
const FILM_SCROLL = 4.6
const FILM_LINGER = 0.16

/**
 * A filmsáv színei a fő site tokenjeiről. Az akcent a `accent-deep`: a
 * folyamatjelzőn kívül a fókuszgyűrűt is ez adja, ott pedig 3:1 feletti
 * kontraszt kell (a világosabb `accent` fehéren/tinten AA alatt lenne normál
 * szövegre — lásd a tokens.css kontraszt-jegyzetét).
 *
 * A `muted` szándékosan NEM a halvány `text-muted`, hanem a teljes erejű `ink`:
 * a bevezető szöveg FILMKOCKÁN áll, ahol a hierarchiát a méret adja, nem a
 * halványítás. A film legsötétebb foltján (rgb(1,0,0)) a `text-muted` a
 * stage-lejtő 64%-os fátylával is csak 3,4:1 lenne — AA-bukás; az `ink`
 * ugyanott 6,0:1. Lásd a kontraszt-levezetést a film-hero.css fejlécében.
 */
const FILM_THEME: ScrollScrubTheme = {
  accent: 'var(--kc-color-accent-deep)',
  background: 'var(--kc-color-white)',
  ink: 'var(--kc-color-navy-900)',
  muted: 'var(--kc-color-navy-900)',
}

/**
 * A vászon a képernyőre TŰZÖTT szakasza a teljes scrub arányában.
 *
 * A színpad `position: sticky` és egy képernyőnyi magas, a görgetési sáv pedig
 * FILM_SCROLL képernyőnyi — a vászon tehát addig áll a képernyőn, amíg a sáv
 * alja el nem éri a képernyő alját: (FILM_SCROLL - 1) / FILM_SCROLL ≈ 0,78.
 * A film utolsó ~22%-a már KIFELÉ görögve játszik le (ez a tükör viselkedése
 * is), ezért feliratot oda tenni értelmetlen lenne: sosem látnánk állva.
 */
const PINNED = (FILM_SCROLL - 1) / FILM_SCROLL

/**
 * A 2. és 3. „állás" sávja. A megrendelő „~50%" és „~90%" kérése a LÁTHATÓ
 * (tűzött) szakaszra értendő, ezért a PINNED-del skálázunk — különben a záró
 * felirat akkor úszna be, amikor a film már félig kigörgött a képből.
 *
 * A záró felirat `to: 1` értéke szándékos: nincs kifutó ága (lásd
 * captionOpacity), így a film végéig kint marad, és nem villan el a vászon
 * távozása közben.
 */
const CAPTION_MID = { from: 0.44 * PINNED, to: 0.62 * PINNED } as const
const CAPTION_END = { from: 0.84 * PINNED, to: 1 } as const

/**
 * A 2. és 3. állás SZÖVEGE — kódban rögzített érték.
 *
 * Mindkét állás CÍMBŐL és a cím alatti LEÍRÁSBÓL áll, ugyanúgy, ahogy az 1.
 * állás szekciója (cím + bevezető). Gomb nincs alattuk: a filmsáv ott már a
 * lap többi szekciója felé ad át, a két hero-CTA pedig az 1. állásban áll.
 *
 * A filmsáv feliratai szándékosan NEM CMS-mezők: a blokk sémája nem bővült,
 * migráció sem kell hozzá. Az 1. állás szövege ezzel szemben CMS-tartalom: a
 * blokk `title` / `lead` / `tags` / `ctas` mezőiből jön.
 *
 * Tartsd rövidnek: a cím egy tömör mondat, a leírás legfeljebb két rövid
 * mondat (~120 karakter) — a néző görgetés közben olvassa. Üres címnél az
 * adott állás egyszerűen nem jelenik meg; üres leírásnál csak a cím látszik.
 *
 * ═══ MIÉRT VAN LEÍRÁS IS (2026-08-17, tulajdonosi kérés) ═══
 * A puszta cím „üres": a néző megáll rajta, és nincs mit olvasnia tovább. Az
 * NN/g eyetracking-kutatásának rétegtorta-mintája szerint a tekintet a
 * címeken ugrál, és a törzsszöveget akkor olvassa el, amikor egy cím érdekli
 * („The Layer-Cake Pattern of Scanning Content on the Web",
 * https://www.nngroup.com/articles/layer-cake-pattern-scanning/). Cím alatti
 * szöveg nélkül ez a lépés nem tud megtörténni.
 *
 * ═══ MIÉRT EZ A KÉT CÍM (2026-08-16, tulajdonosi kérésre írva) ═══
 * A filmsáv a logó és a terápia közös ívét rajzolja ki: ZÁRT → NYÍLÓ →
 * NYITOTT (lásd a kezdőlap „Három állapot" szekcióját). A három felirat ezt az
 * ívet követi: az 1. állás a problémát mondja ki (CMS-ből), a 2. a
 * változás folyamatát, a 3. a látogatóra bízza a döntést.
 *
 * A 2. állás szövege szándékosan a „Három állapot" NYÍLÓ kártyájának nyelvét
 * ismétli („Minden alkalommal egy mozdulattal több lesz") — ugyanaz a gondolat
 * ugyanazokkal a szavakkal, két helyen.
 *
 * A korábbi, ideiglenes „A terápia működik" felirat helyett azért nem
 * hatásosságot állítunk, mert ez egészségügyi kontextus: egy fenntartás nélküli
 * eredmény-ígéret a vásárlási döntés mellett megtévesztő benyomást kelt, és
 * ugyanaz a kifogás állna rá, ami miatt a kurzusoldali vélemény-szekciót is
 * megállítottuk. A haladás LEÍRÁSA igaz állítás; a gyógyulás ÍGÉRETE nem
 * lenne az. Ezért írja le a 2. leírás a GYAKORLÁST (mit csinálsz), nem az
 * eredményt (mi lesz tőle).
 *
 * A leírások állításai a lap saját, már jóváhagyott szövegeiből jönnek, nem
 * újak: „naponta néhány perc is elég a haladáshoz" és „a gyakorlatok lépésről
 * lépésre vezetnek" (howItWorks szekció), „Ha előbb kipróbálnád" (freeSos
 * szekció), a 3. leírásban felsorolt két irány pedig a lentebbi Szolgáltatások
 * szekció 01. és 02. sora („Rendelői kezelések", „Otthoni program").
 *
 * Mikroszöveg-szabályok (docs/ui-sztenderdek.md §3.1): natív magyar, töltelék
 * gondolatjel nélkül, felkiáltójel nélkül, a záró felirat tegez — a §3.2 P-1b
 * szerint ez nem CTA, hanem a néző felé forduló mondat.
 */
const CAPTION_MID_TEXT = 'Minden alkalommal egy mozdulattal több'
const CAPTION_MID_BODY =
  'Napi néhány perc otthon, a saját tempódban. A gyakorlatok lépésről lépésre épülnek egymásra, ahogy a kéz bírja.'
const CAPTION_END_TEXT = 'A következő mozdulat a tiéd'
const CAPTION_END_BODY =
  'Lentebb megtalálod a kurzusokat és a rendelői kezeléseket. Ha előbb kipróbálnád, ott vannak az ingyenes SOS gyakorlatok.'

/** A fejezet-navigáció felirata — egyetlen jelenetnél nem is jelenik meg. */
const FILM_LABEL = 'A kéz nyílása'

export interface FilmHeroProps {
  block: BlockFilmHero
}

export function FilmHero({ block }: FilmHeroProps) {
  const title = block.title?.trim()
  if (!title) {
    return null
  }

  const tags = (block.tags ?? [])
    .map((tag) => tag.label?.trim() ?? '')
    .filter((label) => label.length > 0)

  const ctas = (block.ctas ?? [])
    .filter((cta) => Boolean(cta.felirat?.trim()) && Boolean(cta.url?.trim()))
    .slice(0, 2)

  const actions =
    ctas.length > 0
      ? ctas.map((cta, index) => (
          <Button
            className={`kc-film-hero__cta${index === 0 ? '' : ' kc-film-hero__cta--quiet'}`}
            href={cta.url.trim()}
            key={cta.id ?? `${cta.url}-${index}`}
            openInNewTab={cta.ujAblakban ?? false}
            variant={index === 0 ? 'primary' : 'secondary'}
          >
            {cta.felirat.trim()}
          </Button>
        ))
      : null

  const anchorId = block.sectionSettings?.anchorId?.trim()

  // Üres szövegnél NEM renderelünk helykitöltőt: az adott állás egyszerűen
  // kimarad. (A szövegek kódban élnek — lásd CAPTION_*_TEXT.)
  const captions: ScrollScrubCaption[] = []
  const midText = CAPTION_MID_TEXT.trim()
  if (midText) {
    captions.push({
      align: 'right',
      body: CAPTION_MID_BODY.trim() || undefined,
      id: 'film-scrub-kozep',
      text: midText,
      ...CAPTION_MID,
    })
  }
  const endText = CAPTION_END_TEXT.trim()
  if (endText) {
    captions.push({
      align: 'center',
      body: CAPTION_END_BODY.trim() || undefined,
      id: 'film-scrub-vege',
      text: endText,
      ...CAPTION_END,
    })
  }

  const scene: ScrollScrubScene = {
    actions,
    align: 'left',
    body: block.lead?.trim() ?? '',
    clip: FILM_CLIP,
    id: 'film-hero',
    label: FILM_LABEL,
    linger: FILM_LINGER,
    mobileClip: FILM_CLIP_MOBILE,
    mobilePoster: FILM_POSTER_MOBILE,
    poster: FILM_POSTER,
    scroll: FILM_SCROLL,
    tags,
    title,
  }

  return (
    <ScrollScrub
      captions={captions}
      className="kc-film-hero"
      id={anchorId || undefined}
      scenes={[scene]}
      theme={FILM_THEME}
    />
  )
}
