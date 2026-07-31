# Legacy-asset kiszolgálási minta

A `docs/legacy` a régi kineticare.hu **vizuális/tartalmi referenciája** — a
legacy assetek (képek, fontok) jelenleg **nincsenek a repóban** (a README
szerint ~111 fájl / ~20 MB), ezért a keretrendszer egyetlen legacy binárist
sem másol.

**Kötött szabály:** CDN-link és a régi domainre mutató hotlink TILOS.
A legacy HTML-ekben szereplő külső URL-eket (cloudfront, fonts, régi domain)
NE másold át.

## A minta (amikor legacy kép kell egy oldalra)

1. Másold a képet ide: `public/assets/legacy/<eredeti-fájlnév>`
   (git-be kerül, a `/assets/legacy/<név>` útvonalon szolgálja a Next).
2. Hivatkozd `next/image`-mel, **kötelező alt**-tal:

```tsx
import Image from 'next/image'

<Image
  src="/assets/legacy/pelda-kep.png"
  alt="Rövid, magyar leírás a kép tartalmáról" // dekoratív képnél: alt=""
  width={640}
  height={420}
/>
```

- Dekoratív kép: `alt=""` (a képernyőolvasó kihagyja); tartalmi kép: érdemi,
  magyar alt-szöveg.
- Nagy/lassan változó képnél érdemes `sizes` attribútumot is megadni.
- Alternatíva (dinamikus tartalom): a **Media collection** (alt mező kötelező
  a sémában) — CMS-újdonságoknál ezt használd, a statikus public-másolás a
  legacy migrációs asseteké.
