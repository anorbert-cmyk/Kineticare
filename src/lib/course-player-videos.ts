import type { Product } from '../payload-types'

/**
 * A lejátszó epizódlistájának ÖSSZEÁLLÍTÁSA az RSC-payloadhoz (S2/b).
 *
 * ═══ MIÉRT KÜLÖN, TISZTA FÜGGVÉNY ═══
 * Ez a leképezés dönti el, hogy a Bunny-videó GUID (`streamAssetId`) kimegy-e a
 * böngészőnek. Amíg a szerver-komponens törzsében élt, NEM volt rá regresszió-őr:
 * a szigorítást visszaállítva a main szerinti alakra a teljes tesztcsomag zöld
 * maradt. Külön, exportált függvényként viszont mérhető — a szabályt az
 * src/__tests__/kurzusaim-player-videos.test.ts őrzi.
 *
 * ═══ A SZABÁLY ═══
 * A `streamAssetId` KIZÁRÓLAG élő hozzáféréssel (`hasAccess === true`) kerül a
 * kliens-payloadba. A sor többi mezője (id, cím, hossz, állapot) MINDIG megy:
 * a paywall-kártya és az epizódlista ezekből épül, ezek nem titkosak.
 *
 * ═══ MIÉRT ITT KELL ELHAGYNI ═══
 * A lejátszóoldal a terméket `overrideAccess: true`-val olvassa (a lejátszási
 * úthoz kell), ami a mezőszintű access-t (streamAssetReadAccess) rövidre zárja
 * — a Payload tehát NEM törli a mezőt. A nem-vevő így megkapná a GUID-ot az
 * RSC-payloadban (az a HTML-be sorosított propokban böngészőből olvasható),
 * pedig a lejátszó `hasAccess: false` esetén amúgy is korán visszatér a
 * paywall-kártyával, tehát nincs is rá szüksége.
 *
 * A `hasAccess` a LEJÁRATOT is magában foglalja (vásárlás ÉS érvényesség — lásd
 * a hívó oldalt), nem csak a vásárlás tényét.
 */
export interface PlayerVideo {
  id?: string
  title?: string
  streamAssetId?: string
  durationSec?: number
  status?: 'processing' | 'ready' | 'error'
}

export function toPlayerVideos(
  product: Pick<Product, 'videos'>,
  hasAccess: boolean,
): PlayerVideo[] {
  if (!Array.isArray(product.videos)) {
    return []
  }
  return product.videos.map((video) => ({
    id: video.id ?? undefined,
    title: video.title ?? undefined,
    streamAssetId: hasAccess ? (video.streamAssetId ?? undefined) : undefined,
    durationSec: video.durationSec ?? undefined,
    status: video.status ?? undefined,
  }))
}
