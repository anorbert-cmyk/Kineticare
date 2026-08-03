# Hero-videó feltöltése a kezdőlapra (Cloudflare Stream)

> A kezdőlap fejlécében **animált, reszponzív háttérvideó** jelenik meg
> (autoplay + muted + loop, poszter-fallback, prefers-reduced-motion-tisztelet).
> A videó a Cloudflare Streamben él, PUBLIKUSKÉNT — ez marketing-tartalom,
> NEM a védett (signed URL-es) kurzusvideó-folyamat része.

## Lépések (~5 perc)

1. **Videó előkészítése:** 10–30 mp-es, cselekvést mutató klip (pl. gyakorlat-
   bemutató a rendelőből). Javasolt: 1920×1080 vagy 1280×720, H.264, ≤50 MB,
   hang nélkül is érthető (úgyis muted).
2. **Feltöltés a Cloudflare Streambe:** Cloudflare dashboard → Stream →
   **Upload** → a fájl kiválasztása. A feldolgozás pár perc.
3. **Az azonosító (UID) kimásolása:** a videó sorában a **UID** mező
   (32 karakteres azonosító).
4. **Beírás a kódba:** `src/lib/hero-video.ts` →
   `export const HERO_VIDEO_STREAM_ID: string | null = '<UID>'`
   (a `null` helyére az UID). Commit → deploy → a hero-videó él.
5. **(Opcionális) Poszter finomhangolás:** alapból a videó 0. másodperces
   kockája jelenik meg betöltés előtt és reduced-motion módban. Ha szebb
   kocka kell: a Stream felületén állítsd be a thumbnail-időpontot, VAGY a
   HomeView-ban adj `posterUrl`-t a HeroVideo-nak.

## Biztonsági megjegyzés

- A hero-videó **publikus** (aláírás nélküli iframe-beágyazás) — szándékosan:
  a marketing-videót bárki láthatja. A KURZUSvideók ettől függetlenül továbbra
  is signed URL + purchases-jogosultság mögött maradnak.
- Ne tölts fel olyan klipl, amin páciens felismerhető (vagy legyen rá írásos
  hozzájárulás).

## Teljesítmény

- A videó HLS-ben, adaptív bitrátával jön (a Stream transzkódálja) — mobilon
  is folyamatos; a poszterkép azonnal megjelenik (nincs fehér vaku).
- prefers-reduced-motion esetén a videó **le sem töltődik** (csak a poszter).
