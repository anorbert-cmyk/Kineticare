import { buildExitPreviewHref } from '@/lib/preview/exit-preview'
import { Container } from '@/components/ui/Container'

/**
 * PreviewBar — vékony jelzősáv a piszkozat-előnézethez.
 *
 * Akkor jelenik meg egy tartalmi oldal tetején, ha a szerkesztő a
 * `/next/preview` route-tal bekapcsolta a Next draft mode-ot (oda csak
 * staff/owner jut be). Kettős szerepe van:
 * 1. jelzi, hogy a látott tartalom NEM a nyilvános változat,
 * 2. egy kattintással kiléptet az előnézetből, ugyanarra az oldalra
 *    (`/next/exit-preview`, a visszatérési útvonallal).
 *
 * A kilépés szándékosan sima `<a>` (nem next/link): teljes oldalbetöltés kell,
 * hogy a route által törölt draft-mode süti után a szerver friss, nyilvános
 * választ adjon — a kliensoldali navigáció a gyorsítótárazott előnézeti
 * választ hozná vissza.
 *
 * Stílus: styles/content.css `kc-preview-bar*` blokk, kizárólag tokenekből;
 * animáció nincs (prefers-reduced-motion triviálisan teljesül).
 */
export interface PreviewBarProps {
  /** Az aktuális oldal útvonala — kilépés után ide tér vissza a szerkesztő. */
  path: string
}

export function PreviewBar({ path }: PreviewBarProps) {
  return (
    <div className="kc-preview-bar">
      <Container className="kc-preview-bar__inner">
        <p className="kc-preview-bar__text">
          <strong>Előnézet:</strong> a piszkozatot látod — ez a változat még nem nyilvános.
        </p>
        <a className="kc-preview-bar__exit" href={buildExitPreviewHref(path)}>
          Kilépés az előnézetből
        </a>
      </Container>
    </div>
  )
}
