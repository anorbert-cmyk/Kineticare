# Videó-platform: döntés és Bunny-átállási terv

> **Státusz: DÖNTÉS MEGSZÜLETETT (2026-08-09) — marad a Bunny.net.**
> Ez a dokumentum két dolgot csinál: rögzíti a döntést és az indoklását
> (1–3. pont), majd megadja a Bunny-ra átállás **részletes implementációs
> tervét** (4–6. pont), hogy a következő fejlesztési kör ebből tudjon dolgozni.
>
> Kapcsolódó: [videó-lejátszás készenléti állapota](video-stream-keszenlet.md)
> (a mai, Cloudflare-re épült lánc leírása), [hero-videó
> feltöltése](hero-video-feltoltes.md), [feladatlista](feladatlista.md).

---

## 1. A döntés

**2026-08-09 — a Kineticare videó-platformja a Bunny.net (Bunny Stream) marad.
A Cloudflare Streamre NEM váltunk.**

Miért:

1. **A videók már a Bunnyn vannak, az előfizetés már fizetett.** Nincs
   migrációs munka, nincs átmeneti kettős futtatás, nincs új szolgáltatói
   szerződés és új USD-s bankkártya-terhelés.
2. **A költségplafonba kényelmesen befér.** A Bunny videó-tétele a három
   forgatókönyvben 3 800 – 14 000 Ft/év, azaz a teljes, ~127 000 Ft/éves
   plafon **3–11%-a**. A Cloudflare Stream ugyanezekre 24 700 – 75 900 Ft/év
   lenne (19–60%). Számok a 3. pontban.
3. **A megépült integráció nagy része szolgáltató-független.** A fizetőfal
   (ki nézheti meg, meddig), a token-végpont szerződése, a lejátszó
   állapotgépe és a token-frissítés mind marad — csak az aláírás-számítás és
   az URL-építés cserélődik. A becsült fejlesztői ráfordítás **8–14 óra**
   (5. pont), ami lényegesen kevesebb, mint amennyibe a Cloudflare-re
   költözés kerülne (videó-átfeltöltés + újratanítás + új fiók).
4. **Robusztusabb a nézettségi meglepetésre.** Ha a nézettség a becsült
   duplájára ugrik, a Bunny-számla ~28 000 Ft/év marad a nagy
   forgatókönyvben; a Cloudflare Streamé ~114 000 Ft/év lenne — az a teljes
   éves plafon 90%-a, egyetlen tételre.

Ami **nem** része ennek a döntésnek, de gyakran összekeverik vele: a fizetés
szolgáltatója **Barion** (nem Stripe) — ez korábban eldőlt, és a kód már így
épült (`README.md` „Fizetési és számlázási lánc").

---

## 2. Kiinduló helyzet: mi épült meg Cloudflare Streamre

Fontos, hogy ez ne vesszen el a döntés mögött: a videó-lánc **nagy része kész
és tesztelt**, és a nagyobbik fele szolgáltató-független. A Cloudflare Stream
**soha nem lett élesítve** — nincs CF-fiók, nincsenek kulcsok, nincs ott
egyetlen videó sem (`docs/video-stream-keszenlet.md` 4.1). Nincs tehát mit
leállítani vagy visszabontani; a Bunny-ra állás **nem migráció, hanem
bekötés**.

| Réteg | Fájl | Bunny-nál mi lesz vele |
|---|---|---|
| Végpont-bekötés | `src/app/(frontend)/api/stream-token/route.ts` | **változatlan** |
| Route-handler (auth, hibaágak, naplózás) | `src/lib/stream/route-handler.ts` | **változatlan** |
| Fizetőfal-üzletlogika | `src/lib/stream/issue-stream-token.ts` | 1 lépés (token-kiállítás) cserélődik |
| Kliens–szerver szerződés | `src/lib/stream/contract.ts` | wire-formátum marad, URL-építés cserélődik |
| Token-kliens | `src/lib/stream-token-client.ts` | **változatlan** |
| Aláírás (JWT) | `src/lib/stream/token.ts` | **kicserélendő** (SHA256-hash) |
| Védett lejátszó | `src/components/account/CoursePlayer.tsx` | 1 hívás argumentumai változnak |
| Publikus előzetes | `src/components/courses/PreviewVideo.tsx` | embed-URL + ENV cserélendő |
| Hero-videó | `src/lib/hero-video.ts`, `src/components/content/HeroVideo.tsx` | embed- és poszter-URL cserélendő |
| CSP-fejléc | `src/lib/security/csp.ts` | domainek cserélendők |
| Admin-mezők | `src/plugins/ecommerce.ts` (`videos`, `previewVideoStreamId`) | mezőNÉV marad, leírás frissítendő |

Ami **szolgáltató-független** és ezért egy az egyben marad:

- Csak bejelentkezve (401), csak vásárlás után (403), a nem-vevő 403-a nem
  árulja el, hogy létezik-e a kurzus; `published` → mehet, `archived` → a régi
  vevő tovább nézi, `draft` → senki.
- Az időbeli hozzáférés-lejárat (`accessDurationDays`,
  `src/lib/course-access.ts`) és a magyar lejárat-üzenet.
- A jegy élettartama: videóhossz + 10 perc türelem, legfeljebb 24 óra.
- A `GET /api/stream-token?productId=…&videoId=…` → `200 { token, expiresAt }`
  szerződés, `expiresAt` ISO-8601 szöveg.
- A `CoursePlayer` epizódlistája, a lejárat előtt 5 perccel induló automatikus
  token-frissítés, és minden magyar hibaüzenet.

---

## 3. Költség-ellenőrzés: belefér-e a plafonba

### 3.1 Feltevések

Minden szám ezekből jön. Ha a Katáktól pontosabb adat érkezik (7. pont), a
táblát felül kell írni — a modell maga marad.

| Feltevés | Érték | Sáv / megjegyzés |
|---|---|---|
| Videótár (forrás) | **8 óra** = 480 perc | 5–10 óra |
| Tárolt méret | **~4 GB / forrásóra** | minden rendition (240p–1080p) + megőrzött eredeti |
| Vásárló / év | **50 / 200 / 500** | kicsi / közepes / nagy forgatókönyv |
| Átlagos nézés / vásárló | **6 óra** | a tár ~75%-a, újranézéssel; 4–10 óra a reális sáv |
| Kiszolgált átlagos bitráta | **~3 Mbit/s** (1080p, adaptív) | → **1 nézett óra ≈ 1,35 GB** |
| Kiszolgálási régió | Európa (Standard hálózat) | a magyar közönség miatt nem a Volume-tier |
| USD/HUF árfolyam | **316,09** | 2026-08-09-i jegyzés[^4] |

### 3.2 Egységárak

| Tétel | Bunny Stream | Cloudflare Stream |
|---|---|---|
| Tárolás | **0,01 USD / GB / hó** (elsődleges régió)[^1] | **5 USD / 1000 perc / hó**, előre fizetett 1000 perces lépcsőkben[^2] |
| Kiszolgálás | **0,010 USD / GB** (Európa és Észak-Amerika, Standard)[^1] | **1 USD / 1000 perc** (a sávszélesség benne van)[^2] |
| Kódolás (standard, ≤1080p) | ingyenes[^1] | ingyenes[^2] |
| Tokenes hozzáférés-védelem | ingyenes[^3] | ingyenes |
| Havi minimum | 1 USD[^1] | nincs kimondott minimum, de a tárolás 5 USD-s lépcsőkben vehető[^2] |
| DRM (ha valaha kellene) | MediaCage: 99 USD/hó alapdíj[^1] | nem reális ezen a szinten |

> **Ár-adatok forrása:** mindegyik szám **web-ellenőrzött**, a szolgáltatók
> hivatalos ár- és dokumentációs oldalairól, **2026-08-09-i lekérdezéssel**
> (lábjegyzetek). Közzététel vagy szerződéskötés előtt érdemes újranézni: a
> videó-árazás évente szokott mozdulni.

### 3.3 Éves költség a három forgatókönyvre

Bunny Stream (tárolás: 8 h × 4 GB = 32 GB → 3,84 USD/év; kiszolgálás:
nézett óra × 1,35 GB × 0,010 USD):

| Forgatókönyv | Nézett óra/év | Kiszolgált GB | Tárolás | Kiszolgálás | **Összesen** |
|---|---|---|---|---|---|
| Kicsi (50 vásárló) | 300 | 405 | 3,84 USD | 4,05 USD | **12 USD/év** ≈ **3 800 Ft** |
| Közepes (200) | 1 200 | 1 620 | 3,84 USD | 16,20 USD | **20 USD/év** ≈ **6 300 Ft** |
| Nagy (500) | 3 000 | 4 050 | 3,84 USD | 40,50 USD | **44 USD/év** ≈ **14 000 Ft** |

A kicsi forgatókönyv számított értéke 7,89 USD/év lenne, de a **12 USD/év
(1 USD/hó) számlázási minimum** a padló — ezért szerepel 12 USD.

Cloudflare Stream ugyanezekre, összehasonlításul (tárolás: 480 perc → egy
1000 perces lépcső = 5 USD/hó = 60 USD/év; kiszolgálás: nézett óra × 60 perc
× 0,001 USD):

| Forgatókönyv | Kiszolgált perc | Tárolás | Kiszolgálás | **Összesen** |
|---|---|---|---|---|
| Kicsi | 18 000 | 60 USD | 18 USD | **78 USD/év** ≈ **24 700 Ft** |
| Közepes | 72 000 | 60 USD | 72 USD | **132 USD/év** ≈ **41 700 Ft** |
| Nagy | 180 000 | 60 USD | 180 USD | **240 USD/év** ≈ **75 900 Ft** |

### 3.4 Belefér-e a ~127 000 Ft/éves plafonba

| Forgatókönyv | Bunny | a plafon %-a | Cloudflare Stream | a plafon %-a |
|---|---|---|---|---|
| Kicsi | ~3 800 Ft/év | **3%** | ~24 700 Ft/év | 19% |
| Közepes | ~6 300 Ft/év | **5%** | ~41 700 Ft/év | 33% |
| Nagy | ~14 000 Ft/év | **11%** | ~75 900 Ft/év | 60% |

**Igen, kényelmesen.** A videó a Bunnyn a legkisebb tétel a stackben — a
plafon 89–97%-a marad a domainre, a Railway-hosztolásra, a Barion tranzakciós
díjaira és a Számlázz.hu-ra.

**Érzékenység.** A modell leggyengébb pontja a „6 óra nézés/vásárló"
feltevés, mert azt ma senki nem tudja. Ha kétszer annyi:

| | Bunny (nagy, 12 óra/fő) | CF Stream (nagy, 12 óra/fő) |
|---|---|---|
| Éves költség | ~28 000 Ft (**22%**) | ~114 000 Ft (**90%**) |

A tárolás mindkettőnél elhanyagolható és lassan nő; a kockázat a
kiszolgálásban van. Bunnyn még a legrosszabb reális esetben is elfér.

---

## 4. A Bunny-átállás technikai terve

Ez a dokumentum súlypontja. A cél: a következő fejlesztési kör ebből tudjon
dolgozni, kutatás nélkül.

### 4.1 A lényegi különbség egy mondatban

A Cloudflare **aláírt JWT**-t vár, amiben a lejárat a tokenen BELÜL van; a
Bunny **SHA256-hash**-t vár, és a lejárat egy **külön query-paraméter**
(`expires`) — a kettőnek pontosan egyeznie kell, különben a Bunny elutasítja.

### 4.2 Token-számítás (`src/lib/stream/token.ts`)

A Bunny „Embed view token authentication" sémája:[^3]

```
token = SHA256_HEX( token_auth_key + video_guid + expires )
```

- `token_auth_key` — a **videó-library** token-hitelesítési kulcsa (titok,
  csak szerver-oldalon; a Bunny felületén Stream → a library → API/Security).
- `video_guid` — a videó GUID-ja (ez kerül a `products.videos[].streamAssetId`
  mezőbe).
- `expires` — **Unix epoch másodperc**, sztringként fűzve a hashelendő
  szöveghez.

A hash **hexadecimális, kisbetűs** alak. Nincs `kid`, nincs header, nincs
base64url — a mai `createHmac(...)` helyére `createHash('sha256')` kerül, és a
függvény visszaadja az `expires` értéket is, mert azt az URL-be is bele kell
tenni.

Ami **változatlan** marad ebben a fájlban: a TTL-szabály (videóhossz + 600 mp
türelem, legfeljebb 24 óra), a bemenet-validáció és az, hogy a függvény tiszta
és szinkron. A 24 órás plafon eredetileg a Cloudflare korlátja volt; **a mi
szabályunkként megtartandó** (rövid életű jegy = kevésbé megosztható link).

> **Ellenőrizendő élesítés előtt:** a séma két, egymástól független forrásból
> egyezik (Bunny dokumentáció + a hivatalos példa), de a `expires` sztringgé
> alakításának alakja (pl. van-e vezető nulla, ezredmásodperc) csak élő
> library-n igazolható. Első lépés a staging-en: egy tetszőleges videóra
> generált token tényleg lejátszható-e.

### 4.3 Embed-URL (`src/lib/stream/contract.ts` → `streamIframeSrc`)

Mai (Cloudflare) alak:

```
https://customer-<kód>.cloudflarestream.com/<uid>/iframe?token=<jwt>
```

Új (Bunny) alak:[^3]

```
https://iframe.mediadelivery.net/embed/<libraryId>/<guid>?token=<hex>&expires=<unix>
```

A függvény bemenete tehát:

| Mai bemenet | Új bemenet |
|---|---|
| `customerCode` | `libraryId` |
| `streamAssetId` (CF UID) | `streamAssetId` (Bunny GUID) |
| `token` | `token` |
| — | **`expiresAtEpochSec`** (új) |

**Ez a terv legszerencsésebb pontja:** az `expiresAtEpochSec` már ma is eljut
a klienshez. A szerver ISO-8601 szöveget küld (`expiresAt`), a
`parseStreamTokenResponseBody` a határon egyszer epoch másodperccé alakítja,
és a `CoursePlayer` `playing` állapota már **tárolja** is
(`state.expiresAtEpochSec`) a token-frissítéshez. Nem kell új mező a
wire-formátumba, nem kell új kérés, és a `stream-token-client.ts` sorra sem
kell hozzányúlni.

**Kritikus, hogy a szám oda-vissza pontosan egyezzen** a szerver által
hashelt értékkel. Ma egyezik — a szerver `new Date(exp * 1000).toISOString()`
alakot küld (egész másodperc, nulla ezredmásodperc-rész), a kliens
`Math.floor(Date.parse(...) / 1000)`-rel olvassa vissza. Ezt **regressziós
teszttel kell rögzíteni** (4.8), mert ha valaha ezredmásodperc kerül a
szerializálásba, minden lejátszás elhal, és a hibaüzenet nem fog rá utalni.
Ez a repóban egyszer már megtörtént (`docs/video-stream-keszenlet.md` 4.3).

Ami **változatlan** marad a szerződés-modulból: `STREAM_TOKEN_PATH`,
`STREAM_TOKEN_PRODUCT_PARAM`, `STREAM_TOKEN_VIDEO_PARAM`,
`StreamTokenResponseBody`, `StreamVideoLike`, `ParsedStreamToken`,
`streamVideoRef`, `isPlayableStreamVideo`, `playableStreamVideos`,
`buildStreamTokenRequestUrl`, `parseStreamTokenResponseBody`. Változik:
kizárólag a `streamIframeSrc`. A null-visszatérési viselkedést (hiányzó
konfig → `null` → magyar „nem érhető el" üzenet a néma, fekete iframe helyett)
**tartsuk meg**.

### 4.4 Publikus vs. védett videó — ezt előre el kell dönteni

A Cloudflare-nél a „Require signed URLs" **videónkénti** kapcsoló volt, ezért
a hero-videó és az előzetes gond nélkül maradhatott publikus a védett
kurzusvideók mellett. A Bunnyn a token-hitelesítés **library-szintű**: ha
bekapcsolod, *minden* embed-kérés tokent követel abban a libraryben — az
ingyenes előzetes és a kezdőlapi hero-videó is.[^3]

**Javasolt megoldás: két videó-library.**

| Library | Tartalom | Token-hitelesítés | Env |
|---|---|---|---|
| **Védett** | kurzus-epizódok (`products.videos[]`) | **BE** | `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID` + `BUNNY_STREAM_TOKEN_AUTH_KEY` |
| **Publikus** | hero-videó, kurzus-előzetesek | **KI** | `NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID` |

Minden library saját GUID-teret, saját token-kulcsot és saját pull-zone
hosztnevet (`vz-….b-cdn.net`) kap.

Az egy-library-s alternatíva (mindenre token) rosszabb: a kezdőlapi
hero-videóhoz szerver-oldali token-kérés kellene minden oldalbetöltésnél,
a token bekerülne a publikus HTML-be, és a lejáratkor a marketing-videó
némán elhalna.

> **Ellenőrizendő a Bunny felületén** (a Katáknál/üzemeltetésnél): tényleg
> library-szintű-e a kapcsoló, és a ma használt library-ben van-e már
> publikus és védett tartalom vegyesen.

### 4.5 CSP-domainek (`src/lib/security/csp.ts`)

| Direktíva | Mai (Cloudflare) forrás | Új (Bunny) forrás |
|---|---|---|
| `frame-src` | `https://iframe.cloudflarestream.com`, `customer-<kód>…` | `https://iframe.mediadelivery.net` |
| `img-src` | `https://videodelivery.net`, `customer-<kód>…` | a pull-zone hoszt: `https://vz-<azonosító>.b-cdn.net` |
| `media-src` | ugyanaz | ugyanaz + a meglévő `blob:` **marad** (a kezdőlap filmsávjához kell) |

> **FIGYELEM — ugyanaz a csapda, mint a `customer-*` volt.** A CSP
> host-forrásában a joker KIZÁRÓLAG a legbaloldalibb, TELJES címke helyén
> állhat. A **`https://vz-*.b-cdn.net` ÉRVÉNYTELEN**, a böngésző némán
> eldobja — pont az a hiba, amit a `docs/video-stream-keszenlet.md` 6.1
> pontja már egyszer megdokumentált. Vagy a **pontos hosztnevet** kell env-ből
> beépíteni, vagy a szabályos `https://*.b-cdn.net` jokert használni.

A mai `cloudflareStreamCustomerSource()` mintája jó — átnevezve és a
validáló regexet a hosztnév-alakra igazítva (`/^[a-z0-9-]+\.b-cdn\.net$/`)
megtartandó: ismert érték → pontos hoszt, hiányzó/gyanús érték → szabályos
joker. A szigorú szűrés itt is fejléc-injekció elleni védelem.

`connect-src 'self'` **marad**: az iframe-es lejátszásnál a videó-kérések az
iframe dokumentumából mennek, arra a beágyazott oldal saját CSP-je
vonatkozik. Ha valaha saját `<video>` + `hls.js` lejátszóra váltanánk, a
pull-zone hosztot a `connect-src`-be is fel kell venni — ez ma **nem** kell.

### 4.6 Környezeti változók

A `.env.example`-be **kizárólag a kulcsnevek kerülnek, érték nélkül** — az
értékeket ember viszi be a Railway Variables fülére. (CLAUDE.md tiltás #1: a
repóba titok soha, még placeholderként sem.)

| Kulcs | Mire | Titok? | `NEXT_PUBLIC_`? |
|---|---|---|---|
| `BUNNY_STREAM_TOKEN_AUTH_KEY` | a védett library token-kulcsa (hash-elés) | **IGEN** | nem — sosem mehet a böngészőbe |
| `BUNNY_STREAM_LIBRARY_API_KEY` | a védett library Stream API kulcsa (videólista az adminban) | **IGEN** | nem |
| `BUNNY_STREAM_PUBLIC_LIBRARY_API_KEY` | a publikus library Stream API kulcsa (előzetesek listája) | **IGEN** | nem |
| `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID` | a védett library numerikus id-ja | nem | igen — a kliens építi az embed-URL-t |
| `NEXT_PUBLIC_BUNNY_STREAM_PUBLIC_LIBRARY_ID` | a publikus library (hero, előzetes) | nem | igen |
| `NEXT_PUBLIC_BUNNY_STREAM_PULL_ZONE_HOST` | `vz-….b-cdn.net` — CSP + poszterképek | nem | igen |

A library id és a pull-zone hoszt amúgy is látszik minden embed-URL-ben —
nem titok, csak konfiguráció.

**Elavulnak** (a `.env.example`-ből és a Railway-ből is kivehetők):
`CF_STREAM_ACCOUNT_ID`, `CF_STREAM_API_TOKEN`, `CF_STREAM_SIGNING_KEY`,
`CF_STREAM_SIGNING_KEY_ID`, `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE`.

> **A `NEXT_PUBLIC_` változók a BUILD pillanatában égnek bele az oldalba.**
> Utólagos beállítás után **újra kell buildelni**, különben semmi nem
> változik. Ugyanez igaz a CSP-fejlécre is (a Next.js a `headers()`
> eredményét a `.next/routes-manifest.json`-be sütí). Vö. CLAUDE.md — „a
> SUCCESS deploy nem jelenti, hogy az új kód fut".

### 4.7 Admin-mezők: a név marad, a jelentés változik

A `products.videos[].streamAssetId` **mezőnevet NE nevezzük át.** Az átnevezés
séma-változás lenne, tehát generált migráció + adatmozgatás — a CLAUDE.md
tiltás #3 miatt kézzel amúgy sem írható, és semmilyen haszna nincs. A mező
ezentúl a **Bunny videó-GUID**-ot tárolja.

Amit frissíteni kell (`src/plugins/ecommerce.ts`), csak szövegek:

| Mező | Mai leírás | Új leírás |
|---|---|---|
| `videos[].streamAssetId` | „A Cloudflare Stream azonosítója. Feltöltéskor a rendszer tölti ki." | „A Bunny Stream videó GUID-ja — a Bunny felületén a videó adatlapján található. Kézzel másolandó be." |
| `videos[].status` | „…a rendszer állítja, ne írd át." | ma **kézzel** állítandó `Kész`-re, miután a Bunny végzett a feldolgozással (nincs feltöltő-automatizmus) |
| `previewVideoStreamId` | „Bemutató videó azonosítója" | a **publikus** library GUID-ja (4.4) |

A `durationSec` (hossz másodpercben) továbbra is **kötelező**: ebből
számoljuk a jegy lejáratát.

Az admin **Videótár** (`/admin/videok`) és a kurzuslap „Videók a Bunny tárból”
panelje a libraryből **listázza** a felvételeket; a GUID onnan másolható a
lecke mezőjébe. Feltöltés továbbra is a Bunny felületén történik, tus az
adminból nincs.

### 4.8 Tesztelési terv

| Teszt | Mit véd | Hol |
|---|---|---|
| **Ismert vektor** a hash-re | a `token_auth_key + guid + expires` fűzési sorrend és a hex-alak | `src/__tests__/stream-token.test.ts` |
| **Oda-vissza (round-trip)**: `exp` → `expiresAt` ISO → `expiresAtEpochSec` → ugyanaz az egész szám | a 4.3-ban leírt, néma és végzetes elcsúszás | `src/__tests__/stream-token-contract.test.ts` |
| `streamIframeSrc` alak-teszt | pontos URL, `token` **és** `expires` paraméter, URL-kódolás | contract-teszt |
| `streamIframeSrc` null-ágak | hiányzó `libraryId` / GUID / token → `null` → magyar üzenet, nem fekete iframe | contract-teszt |
| CSP: **nincs `vz-*`** | a 4.5-ben leírt joker-csapda visszatérése | `src/__tests__/security/csp.test.ts` |
| CSP: `iframe.mediadelivery.net` benne, `cloudflarestream.com` már nincs | elfelejtett domain-csere | ugyanott |
| A meglévő fizetőfal-tesztek | 401 / 403 / 404 / 409 / 503 ágak | `src/__tests__/stream-token.test.ts` — **változatlanul futniuk kell** |

> **Az ismert vektor kulcsa DUMMY érték legyen**, a tesztben kifejezetten
> megjelölve (pl. `DUMMY_TOKEN_KEY`), és a várt hash egy független
> implementációval (pl. `sha256sum`) előállítva, majd rögzítve. Éles kulcs
> vagy a szolgáltató dokumentációjából kimásolt kulcs **nem kerülhet** a
> repóba (CLAUDE.md tiltás #1).

### 4.9 Lépések sorrendje és becsült órák

| # | Lépés | Ki | Óra | Állapot |
|---|---|---|---|---|
| 0 | Bunny-oldali előkészítés: két library, token-hitelesítés bekapcsolása a védetten, kulcsok/id-k kiadása | üzemeltetés + Katák | 0,5–1 | ⬜ nyitva |
| 1 | `.env.example` bővítése (érték nélküli kulcsokkal) + Railway-változók beállítása | fejlesztő + maintainer | 0,5 | ✅ `.env.example` + `src/env.ts` kész; a Railway-változók beállítása maintainer-feladat |
| 2 | `src/lib/stream/token.ts` → SHA256-hash + `expires`; egységteszt ismert vektorral | fejlesztő | 1,5–2,5 | ✅ kész (ismert vektor DUMMY kulccsal, `sha256sum`-mal előállítva; a fűzési sorrendre negatív vektor is) |
| 3 | `contract.ts` → `streamIframeSrc` Bunny-alak + `expiresAtEpochSec` bemenet; contract- és round-trip-teszt | fejlesztő | 1–2 | ✅ kész (a round-trip a VALÓDI láncon a hash-egyezéssel is bizonyított) |
| 4 | `issue-stream-token.ts` 5. lépésének bekötése (új ENV-név, `expires` továbbadása) | fejlesztő | 0,5–1 | ✅ kész (`BUNNY_STREAM_TOKEN_AUTH_KEY`, változatlan 503-as magyar hibaút) |
| 5 | `CoursePlayer.tsx`, `PreviewVideo.tsx`, `hero-video.ts` + `HeroVideo.tsx` embed-csere | fejlesztő | 1–2 | ✅ kész — a hero MA nem fut Streamről (`HERO_VIDEO_STREAM_ID = null`, a kezdőlapi filmsáv lokális), a modul mégis át lett kötve, hogy ne maradjon a CSP által tiltott CF-URL a kódban |
| 6 | `csp.ts` domain-csere + a `vz-*` csapda tesztje | fejlesztő | 1–1,5 | ✅ kész |
| 7 | `ecommerce.ts` admin-leírások (mezőnév marad → **nincs migráció**) | fejlesztő | 0,5 | ✅ kész |
| 8 | Dokumentáció-átvezetés: `video-stream-keszenlet.md`, `hero-video-feltoltes.md`, `README.md`, `CLAUDE.md` | fejlesztő | 1–2 | ✅ kész (+ `e2e-staging-runbook.md`, `deploy-railway.md`, `feladatlista.md`) |
| 9 | Staging-E2E: próbavásárlás → lejátszás → epizódváltás → token-frissítés → nem-vevő 403 → token nélküli URL nem megy | fejlesztő + 1 Kata | 1,5–3 | ⬜ nyitva (a 0. lépés blokkolja) |
| 10 | A GUID-ok bevitele az adminba, kurzusonként | Katák | 0,5–2 | ⬜ nyitva |

**Összesen: fejlesztő 8–14 óra, emberi (Katák / üzemeltetés) 1,5–4 óra.**

A 2–7. lépés egyetlen, fókuszált PR-ban is elfér; a 0. lépés blokkolja a
9-est, de a 2–8. fejleszthető előtte, dummy env-értékekkel.

> **A 2–8. lépés elkészült, kulcsok nélkül.** A kód úgy épült, hogy a hiányzó
> env-értékek mellett minden gracefully degradálódik (a token-végpont 503 +
> magyar üzenet, az embed-URL `null` → magyar „nem érhető el", a CSP a
> szabályos `*.b-cdn.net` jokerre esik vissza), a kulcsok megérkezésekor pedig
> **kódváltozás nélkül, csak Railway-env-beállítással + újrabuilddel** élesedik.
> Ami hátra van: a 0., 9. és 10. lépés.

---

## 5. Amit a Katáktól / üzemeltetéstől kérünk az induláshoz

| # | Mi kell | Miért | Hova kerül |
|---|---|---|---|
| 1 | **A védett library numerikus id-ja** | az embed-URL-be | Railway env (`NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID`) |
| 2 | **A védett library token-hitelesítési kulcsa** | ezzel írjuk alá a jegyet | Railway env (`BUNNY_STREAM_TOKEN_AUTH_KEY`) — **titok, SOHA nem a repóba, nem e-mailben, nem chatben** |
| 3 | **A publikus library id-ja** (hero + előzetesek) | 4.4 szerinti kettéválasztás | Railway env |
| 4 | **A pull-zone hosztnév** (`vz-….b-cdn.net`) | CSP + poszterképek | Railway env |
| 5 | **Megerősítés, hogy a token-hitelesítés BE van kapcsolva** a védett libraryn | enélkül a fizetőfal megkerülhető: a videó link nélkül is nézhető | Bunny felület |
| 6 | **Videó-GUID-lista kurzus- és epizód-hozzárendeléssel** (cím, GUID, hossz másodpercben, sorrend) | ez megy az adminba | `/admin` → Kurzusok → Videók |
| 7 | **A videótár tényleges mérete** (GB és perc), a Bunny felületéről | a 3. pont becslése helyett valós szám | `docs/video-platform-dontes.md` 3.1 frissítése |
| 8 | **A mai Bunny-havidíj** (utolsó 2–3 havi számla) | a plafon-számítás valós alapra állítása | ugyanoda |
| 9 | Várható vásárlószám az első évre | melyik forgatókönyvben vagyunk | ugyanoda |

A 2. pont kezelése: a kulcsot **közvetlenül a Railway Variables felületén**
kell bevinni, vagy egy egyszer felhasználható titok-megosztón átadni. Ha
véletlenül mégis kikerülne (chat, e-mail, képernyőkép), a Bunny felületén
**azonnal újragenerálandó** — és mivel a régi jegyek attól kezdve
érvénytelenek, egy futó lejátszás megszakadhat (a `CoursePlayer` ilyenkor
magyar hibaüzenetet és „Újrapróbálom" gombot ad, nem fagy le).

---

## 6. Kockázatok és edge case-ek

| Kockázat | Mi történik | Mit teszünk |
|---|---|---|
| **Lejárt token lejátszás közben** | a Bunny elutasítja az embedet | a `CoursePlayer` a lejárat előtt **5 perccel** magától új jegyet kér; a jegy amúgy is videóhossz + 10 perc. Marad. |
| **A `expires` és a hash elcsúszik** (pl. ezredmásodperc kerül az ISO-szerializálásba) | *minden* lejátszás elhal, a hibaüzenet nem utal az okra | 4.8 round-trip regressziós teszt — kötelező |
| **Library-szintű token bekapcsolása kilövi a hero-videót és az előzeteseket** | a kezdőlap némán videó nélkül marad | 4.4 kétlibrarys felállás; a staging-ellenőrzés része legyen a kezdőlap is |
| **Elfelejtett CSP-domain vagy `vz-*` joker** | fekete lejátszó, csak a böngésző-konzolban látszik | 4.5 + CSP-teszt; élesítés után konzol-ellenőrzés kurzus- és kezdőlapon |
| **`NEXT_PUBLIC_` env beállítva, de nincs újrabuild** | „minden zöld", mégis a régi konfig fut | build-log ellenőrzése (CLAUDE.md deploy-tanulság #1) |
| **A Bunny árat emel** | a mai szinten még 3× áremelés is a plafon ~33%-a alatt marad (közepes forgatókönyv) | évente egy ár-ellenőrzés; a 3.1 feltevés-tábla frissítése |
| **Vendor lock-in** | mindkét szolgáltatónál valós: a GUID-ok, a player-embed és az aláírás-séma szolgáltató-specifikus | a fizetőfal, a szerződés-modul wire-formátuma és a lejátszó állapotgépe **nem** az — egy újabb váltás ugyanez a 8–14 óra lenne, nem több |
| **A videótár tízszereződik** (80 óra) | tárolás ~40 USD/év (~12 600 Ft) — továbbra is elhanyagolható; a kiszolgálás a nézettséggel nő, nem a tárral | nincs teendő; a modell lineáris marad |
| **Másolásvédelem** | **egyik szolgáltató sem másolásbiztos.** A token + lejárat a link-megosztást és a hotlinkelést állítja meg; a képernyőfelvételt semmi. A DRM (Bunny MediaCage: 99 USD/hó alapdíj[^1]) ezen a bevételi szinten nem éri meg. | ezt őszintén kommunikáljuk; a védelem a jogi és az árazási oldalon erősebb, mint a technikain |

---

## 7. Nyitott kérdések (ezek nélkül a 3. pont becslés marad)

1. **Pontos Bunny-csomag és havidíj** — a Bunny pay-as-you-go, de ha van
   mellette más termék (Storage, CDN pull zone, DNS), az is a videó-tételbe
   számít-e a plafon szempontjából?
2. **A videótár mérete GB-ban és percben** — a 8 óra / 32 GB feltevés helyett.
3. **Várható vásárlószám** az első 12 hónapra.
4. **Van-e ma is használt, publikus Bunny-videó** (pl. a systeme.io-s
   oldalakon), amit a kettéválasztásnál figyelembe kell venni?
5. **Library-szintű-e tényleg a token-kapcsoló** a mai Bunny-felületen (4.4).

---

[^1]: Bunny Stream árazás — tárolás 0,01 USD/GB/hó (elsődleges régió),
CDN-kiszolgálás Európa és Észak-Amerika 0,010 USD/GB, standard kódolás
ingyenes, MediaCage DRM 99 USD/hó alapdíj.
<https://bunny.net/docs/stream/pricing> és <https://bunny.net/pricing/stream/>
és <https://bunny.net/pricing/> — lekérve: **2026-08-09**.

[^2]: Cloudflare Stream árazás — „Storage is a prepaid pricing dimension
purchased in increments of $5 per 1,000 minutes stored"; „Delivery is a
post-paid, usage-based pricing dimension billed at $1 per 1,000 minutes
delivered"; „Bandwidth is already included in 'video delivered' with no
additional egress (traffic/bandwidth) fees".
<https://developers.cloudflare.com/stream/pricing/> — lekérve: **2026-08-09**.

[^3]: Bunny Stream „Embed view token authentication":
`SHA256_HEX(token_security_key + video_id + expiration)`, embed-URL
`https://iframe.mediadelivery.net/embed/<libraryId>/<guid>?token=…&expires=…`;
„Once enabled, every embed request to the iframe must include a valid token
and expires pair." <https://bunny.net/docs/stream/token-authentication/> —
lekérve: **2026-08-09**. A pull-zone hosztnév alakja
(`vz-….b-cdn.net`, Stream → API alatt) és a
`{pull_zone}/{video_id}/playlist.m3u8`, `…/thumbnail.jpg` URL-ek:
<https://bunny.net/docs/stream/storage-structure> — lekérve: **2026-08-09**.

[^4]: USD/HUF = 316,09 (EUR/HUF = 363,30) — <https://allampapirkalkulator.hu/arfolyam/usdhuf>,
lekérve: **2026-08-09**. A dokumentum minden forintértéke ezzel az
árfolyammal, ezresre kerekítve számol.
