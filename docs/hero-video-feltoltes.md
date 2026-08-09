# Hero-videó feltöltése a kezdőlapra (Bunny Stream)

> A kezdőlap fejlécében **animált, reszponzív háttérvideó** jelenhet meg
> (autoplay + muted + loop, poszter-fallback, prefers-reduced-motion-tisztelet).
> A videó a Bunny Stream **PUBLIKUS** libraryjében él — ez marketing-tartalom,
> NEM a védett (jegyes) kurzusvideó-folyamat része.
>
> **Mai állapot:** a kezdőlapon nincs hero-videó. A `HERO_VIDEO_STREAM_ID`
> értéke `null`, ezért a hero a CMS `heroImage` képére esik vissza. (A
> kezdőlapi nyitó **filmsáv** ettől független: az lokális fájlokból dolgozik,
> `public/media/film` — ahhoz ez az útmutató nem kell.)

## Előfeltétel

A publikus library azonosítója és a pull-zone hosztnév legyen beállítva a
Railway-en (`NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID`,
`NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST`), és a beállítás után **legyen egy
új build** — a `NEXT_PUBLIC_` változók a build pillanatában égnek bele az
oldalba. Részletek: `docs/video-stream-keszenlet.md` 4.1.

## Lépések (~5 perc)

1. **Videó előkészítése:** 10–30 mp-es, cselekvést mutató klip (pl. gyakorlat-
   bemutató a rendelőből). Javasolt: 1920×1080 vagy 1280×720, H.264, ≤50 MB,
   hang nélkül is érthető (úgyis muted).
2. **Feltöltés a Bunny Streambe:** Bunny dashboard → **Stream** → a
   **PUBLIKUS** library (amelyiken a token-hitelesítés KI van kapcsolva) →
   **Upload**. A feldolgozás pár perc.
   - ⚠️ Ha a védett libraryba töltöd fel, a hero-videó **nem fog elindulni**:
     ott minden lejátszás jegyet követel, a kezdőlap viszont nem kér jegyet.
3. **A GUID kimásolása:** a videó adatlapján a **Video GUID** mező.
4. **Beírás a kódba:** `src/lib/hero-video.ts` →
   `export const HERO_VIDEO_STREAM_ID: string | null = '<GUID>'`
   (a `null` helyére a GUID). Commit → deploy → a hero-videó él.
5. **(Opcionális) Poszter finomhangolás:** alapból a Bunny automatikus
   thumbnailje jelenik meg betöltés előtt és reduced-motion módban. Ha szebb
   kocka kell: a Bunny felületén állítsd be a thumbnailt, VAGY a HomeView-ban
   adj `posterUrl`-t a HeroVideo-nak.
6. **(Fejlesztői) Vezérlők elrejtése:** a Bunny lejátszójánál a kontrollok
   láthatósága **library-szintű Player-beállítás** (Stream → a library →
   Player), nem URL-paraméter. Háttérvideóhoz ott kell kikapcsolni őket.

## Biztonsági megjegyzés

- A hero-videó **publikus** (jegy nélküli iframe-beágyazás) — szándékosan:
  a marketing-videót bárki láthatja. A KURZUSvideók ettől függetlenül továbbra
  is jegy + `purchases`-jogosultság mögött maradnak, külön libraryben.
- Ne tölts fel olyan klipet, amin páciens felismerhető (vagy legyen rá írásos
  hozzájárulás).

## Teljesítmény

- A videó HLS-ben, adaptív bitrátával jön (a Bunny transzkódálja) — mobilon
  is folyamatos; a poszterkép azonnal megjelenik (nincs fehér vaku).
- prefers-reduced-motion esetén a videó **le sem töltődik** (csak a poszter).
- Ha a Bunny-konfiguráció hiányzik, a komponens nem rak ki törött képet vagy
  fekete dobozt: az érintett elem egyszerűen kimarad.
