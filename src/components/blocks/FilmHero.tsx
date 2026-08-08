import type { BlockFilmHero } from '../../payload-types'
import { Button } from '../ui/Button'
import { ScrollScrub } from '../scroll-scrub/scroll-scrub'
import type { ScrollScrubScene, ScrollScrubTheme } from '../scroll-scrub/scroll-scrub'

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
 *   rendereli), mérete a display-lépcső (--kc-text-4xl) — annál nagyobb nem
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
 */
const FILM_THEME: ScrollScrubTheme = {
  accent: 'var(--kc-color-accent-deep)',
  background: 'var(--kc-color-white)',
  ink: 'var(--kc-color-navy-900)',
  muted: 'var(--kc-color-text-muted)',
}

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
      className="kc-film-hero"
      id={anchorId || undefined}
      scenes={[scene]}
      theme={FILM_THEME}
    />
  )
}
