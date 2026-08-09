# Videó-lejátszás készenléti állapota (Cloudflare Stream)

> **Miről szól ez a dokumentum?** Arról, hogy a kurzusvideók lejátszásából mi
> van már kész a rendszerben, mi hiányzik még az élesítéshez, és pontosan
> milyen lépések kellenek a szerkesztők (a „lányok") oldaláról, amikor egy
> videót fel kell tenni az oldalra. Nem kell hozzá programozói tudás — a
> technikai részleteket a végén, külön szakaszban gyűjtjük.
>
> Kapcsolódó: [hero-videó feltöltése](hero-video-feltoltes.md) (a kezdőlapi
> háttérvideó — az MÁS folyamat, és az már működik).

---

## 1. Egy percben: hol tartunk

| Terület | Állapot |
|---|---|
| Jogosultság-ellenőrzés (ki nézheti a videót) | ✅ Kész, tesztelt |
| Aláírt lejátszási token kiállítása | ✅ Kész, tesztelt |
| Lejátszó felület (kezdőlap, előzetes, kurzus) | ✅ Kész |
| Biztonsági fejléc (CSP) a Stream-hez | ✅ **Ezzel a változással javítva** |
| Cloudflare-fiók + kulcsok beállítása | ❌ Hiányzik |
| Videó feltöltése a rendszeren keresztül | ❌ Nincs — kézi másolás az adminba |
| Két kódhiba a lejátszási láncban | ❌ **Élesítés előtt javítandó** (lásd 4.3) |

Magyarul: a **nehéz része kész** (ki férhet hozzá, hogyan lesz belőle biztonságos,
lejáró link), a **bekötés** viszont még nincs meg — és a bekötés előtt két,
alább pontosan leírt hibát ki kell javítani, különben a vevő hibaüzenetet lát.

---

## 2. Hogyan működik ez az egész (laikus magyarázat)

A kurzusvideók **nem a mi szerverünkön** vannak, hanem a Cloudflare Stream nevű
videó-szolgáltatónál. Ez azért jó, mert a videó így mindenkinél gyorsan és a
sávszélességéhez igazodó minőségben indul el, telefonon is.

A videó ott egy **azonosítót** kap (egy hosszú betű-szám sorozat, pl.
`ea95132c15732412d22c1476fa83f0`). Az oldal ezt az azonosítót tárolja — nem
magát a videófájlt.

Amikor egy vásárló megnyitja a kurzust:

1. az oldal megkérdezi a saját szerverünket: „ez az ember megvette ezt a kurzust?";
2. ha igen, a szerver kiállít egy **időkorlátos belépőjegyet** (ez a „token"),
   ami csak arra az egy videóra és csak korlátozott ideig érvényes;
3. a lejátszó ezzel a jeggyel kéri le a videót a Cloudflare-től.

Így a videó linkje nem osztható meg: a jegy lejár, és máshoz nem jó.

---

## 3. Mi van már kész

### 3.1 Jogosultság-ellenőrzés és token-kiadás

- Végpont: `src/app/(frontend)/api/stream-token/route.ts`
- Üzleti szabályok: `src/lib/stream/issue-stream-token.ts`
- A jegy (JWT) előállítása: `src/lib/stream/token.ts`
- Tesztek: `src/__tests__/stream-token.test.ts`, `src/__tests__/stream-token-client.test.ts`

A szabályok, amiket már betart:

- **Csak bejelentkezve** (különben 401).
- **Csak vásárlás után**: a felhasználó `purchases` listájában szerepelnie kell
  a terméknek, különben 403.
- **Információ-minimalizálás**: a nem-vevő ugyanazt a 403-at kapja akkor is, ha
  a kurzus nem is létezik — így nem lehet „kitalálni", milyen kurzusaink vannak.
- **Státusz-szabály**: közzétett kurzus → mehet; archivált → a régi vevő tovább
  nézheti; piszkozat → senki.
- **A jegy élettartama**: a videó hossza + 10 perc türelem, de legfeljebb 24 óra.
- **Hiányzó aláírókulcs esetén** nem omlik össze az app: 503 + magyar üzenet
  („A videólejátszás ideiglenesen nem érhető el…") és naplóbejegyzés.

### 3.2 Lejátszó felületek

| Hol | Komponens | Videó típusa |
|---|---|---|
| Kezdőlap hero | `src/components/content/HeroVideo.tsx` | publikus marketing-videó |
| Kurzus adatlap | `src/components/courses/PreviewVideo.tsx` | publikus előzetes |
| „Kurzusaim" lejátszó | `src/components/account/CoursePlayer.tsx` | **védett**, jegyes |

A `CoursePlayer` epizódlistát is ad, és a jegy lejárta előtt 5 perccel magától
új jegyet kér, hogy a lejátszás ne szakadjon meg hosszú videó közben.

### 3.3 Admin-mezők (ide kerül az azonosító)

A kurzus (termék) szerkesztőjében:

| Mező az adminban | Mire való |
|---|---|
| **Bemutató videó azonosítója** | az ingyenes előzetes Stream-azonosítója |
| **Videók → Videó azonosítója** | a megvásárolt kurzus egy epizódjának azonosítója |
| **Videók → Hossz (másodperc)** | a jegy lejáratának számításához **kötelező** |
| **Videók → Videó állapota** | csak a **Kész** állapotú videó játszható le |

### 3.4 Biztonsági fejléc (CSP)

A böngészőnek szóló „honnan tölthet be az oldal bármit" szabály
(`src/lib/security/csp.ts`) mostantól helyesen engedi a Cloudflare Stream
hostját. A javítás előtti minta érvénytelen volt — részletek a 6. pontban.

---

## 4. Mi hiányzik az élesítéshez

### 4.1 Cloudflare-fiók és kulcsok

Kell egy Cloudflare-fiók, benne bekapcsolt **Stream** (fizetős: tárolás +
lejátszás alapon). Utána a következő környezeti változókat kell beállítani
(Railway → a szolgáltatás **Variables** fülén, lokálisan a `.env` fájlban):

| Változó | Mire kell | `.env.example`-ben |
|---|---|---|
| `CF_STREAM_ACCOUNT_ID` | a Cloudflare-fiók azonosítója (feltöltés API-ból) | ✅ már benne volt |
| `CF_STREAM_API_TOKEN` | Stream-jogú API-token — **titok**, sosem a böngészőbe | ✅ már benne volt |
| `CF_STREAM_SIGNING_KEY` | ezzel írjuk alá a belépőjegyet — **titok** | ✅ már benne volt |
| `CF_STREAM_SIGNING_KEY_ID` | kulcs-azonosító (`kid`), ha több kulcsot forgatunk | ✅ már benne volt (opcionális) |
| `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE` | a lejátszó aldomainje (`customer-<kód>…`) | ⚠️ **hiányzott — ezzel a változással felvéve, érték nélkül** |

> **Figyelem — ez sokakat megtréfál:** a `NEXT_PUBLIC_` kezdetű változók a
> **build** pillanatában égnek bele az oldalba. Ha utólag állítod be őket,
> **újra kell buildelni**, különben semmi nem változik. Ugyanez igaz a
> biztonsági fejlécre is: azt is a build süti be
> (`.next/routes-manifest.json`). Vö. CLAUDE.md — „a SUCCESS deploy nem
> jelenti, hogy az új kód fut".

A Cloudflare oldalán ezen felül be kell kapcsolni a videókra a **„Require
signed URLs"** beállítást — enélkül a videó a jegy nélkül is nézhető marad,
tehát a fizetőfal megkerülhető.

### 4.2 Feltöltési automatizmus — nincs, és egyelőre nem is kell

Ma nincs olyan gomb az adminban, ami feltöltené a videót a Cloudflare-be. A
videó feltöltése a Cloudflare felületén történik, az azonosítót pedig kézzel
kell bemásolni az adminba (lásd 5. pont). Ez kis darabszámnál teljesen
rendben van; a `CF_STREAM_ACCOUNT_ID` és a `CF_STREAM_API_TOKEN` már azért
szerepel a listában, hogy a későbbi automata feltöltés bekötése ne igényeljen
új titkokat.

Ebből következik, hogy a **Videó állapota** mezőt (Kész / Feldolgozás alatt)
egyelőre kézzel kell **Kész**-re állítani, miután a Cloudflare végzett a
feldolgozással — a mező súgója szerint „a rendszer állítja", de a feltöltő
automatizmus hiányában erre ma nincs, aki állítsa.

### 4.3 Két kódhiba a lejátszási láncban — élesítés előtt javítandó

Ezek ma nem látszanak (nincs élő videó), de a bekapcsolás első percében
előjönnének. **Szándékosan nem javítottuk itt**, mert ez a feladat a
felmérésről és a CSP-ről szólt — de mindkettő pontosan be van mérve:

**(a) A lejárati idő formátuma nem egyezik a két oldal között.**

- A szerver ISO-8601 **szöveget** ad vissza:
  `src/lib/stream/issue-stream-token.ts:214` → `expiresAt: "2026-08-09T12:34:56.000Z"`
- A kliens **számot** (Unix-másodperc) vár:
  `src/lib/stream-token-client.ts:42` → `typeof body.expiresAt !== 'number'`

Következmény: a kliens minden sikeres válaszra is hibára fut, és a vevő a
„A videó lejátszási joga most nem ellenőrizhető." üzenetet kapja — pedig
mindent megvett és minden rendben van. A meglévő tesztek ezt nem fogják meg,
mert a kliens-teszt számot ad vissza a mock-válaszban, a szerver-teszt pedig
szöveget vár — külön-külön mindkettő zöld.

**(b) Az epizód-választás nem jut el a szerverig.**

- A kliens `videoIndex` néven küldi: `src/lib/stream-token-client.ts:25`
- A szerver `videoId` néven olvassa: `src/lib/stream/route-handler.ts:43`

Következmény: bármelyik részre kattint a vevő, a szerver mindig az **első**
Kész videóra állítja ki a jegyet, a lejátszó viszont a kattintott rész
azonosítójával kéri le a videót — a Cloudflare ezt (helyesen) elutasítja.
Egyetlen epizódnál még véletlenül működne; a második résznél már nem.

Ehhez tartozik egy harmadik, kisebb eltérés is: a `CoursePlayer` a **szűrt**
(csak Kész állapotú) listában indexel, a szerver `selectVideo` függvénye
viszont a teljes listában — ha a javítás index-alapú marad, ezt is egyeztetni
kell. A legtisztább megoldás, ha a kliens is a `videoId`-t (azaz a
`streamAssetId`-t) küldi, mert azt a szerver már ma is kezeli.

---

## 5. A szerkesztői út — lépésről lépésre

> Ez a rész a tartalomkezelőknek szól. Programozás nincs benne.

### 5.1 Ingyenes előzetes videó feltevése egy kurzushoz

1. Jelentkezz be a **Cloudflare** felületére → bal oldalt **Stream** → **Videos**.
2. **Upload video** → válaszd ki a fájlt → várd meg, amíg a státusz **Ready**
   lesz (pár perc; hosszabb videónál több).
3. Kattints a videóra, és másold ki a **UID** mezőt (hosszú betű-szám sorozat).
4. Menj a Kineticare **adminba** → **Kurzusok** → a kurzus megnyitása.
5. A **Bemutató videó azonosítója** mezőbe illeszd be a UID-ot → **Mentés**.
6. Nézd meg a kurzus nyilvános oldalát: az előzetes megjelenik.
   - Ha nem jelenik meg: az előzetes csak akkor látszik, ha a
     `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE` be van állítva (4.1) — ez fejlesztői
     lépés, szólj a fejlesztőnek.

### 5.2 Megvásárolható kurzusvideó (epizód) feltevése

1. Töltsd fel a videót a Cloudflare-be (mint fent), és várd meg a **Ready**-t.
2. **Fontos:** a videó beállításainál kapcsold be a **Require signed URLs**-t —
   ez teszi fizetősen védetté. Enélkül a link bárkinek működne.
3. Másold ki a **UID**-ot és jegyezd fel a videó **hosszát másodpercben**
   (a Cloudflare kiírja; pl. 12:30 → 750).
4. Adminban a kurzusnál: **Videók** → **Add Videó**:
   - **Videó címe**: amit a vevő lát az epizódlistában (pl. „1. rész — Bemelegítés")
   - **Videó azonosítója**: a UID
   - **Hossz (másodperc)**: a kiszámolt szám — **enélkül nem indul a lejátszás**
   - **Videó állapota**: **Kész**
5. Mentés. A sorrend az epizódlistában a mezők sorrendje — húzással átrendezhető.

### 5.3 Amit NE csinálj

- **Ne tölts fel** olyan felvételt, amin páciens felismerhető, írásos
  hozzájárulás nélkül.
- **Ne írd át** a Videó azonosítóját meglévő, már vásárolt kurzusnál — a régi
  vevők lejátszása áll meg tőle.
- **Ne hagyd üresen** a hosszt: a jegy lejáratát abból számoljuk.
- **Ne tedd** a kurzusvideót publikusra (signed URL nélkül) — azzal a fizetőfal
  megkerülhetővé válik.

---

## 6. A CSP-javítás és a bizonyítéka

### 6.1 Mi volt a hiba

A Content-Security-Policy fejlécben ez a minta szerepelt három helyen
(`frame-src`, `img-src`, `media-src`):

```
https://customer-*.cloudflarestream.com
```

Ez **érvénytelen CSP-forrás**. A szabvány szerint a joker (`*`) csak a
legbaloldalibb, **teljes** címke helyén állhat: a `https://*.cloudflarestream.com`
jó, a `customer-*` viszont nem. A böngésző az ilyen forrást **némán eldobja** —
tehát a Stream hostja egyáltalán nem került a listára. Ez ma nem tűnt fel, mert
a Stream még nincs élesítve; bekapcsoláskor viszont azonnal fekete lejátszót
adott volna, konzolhibával.

### 6.2 Mi lett belőle

- Ha a `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE` be van állítva, a fejléc a
  **pontos** hostot engedi (`https://customer-<kód>.cloudflarestream.com`) —
  ez a lehető legszűkebb szabály.
- Ha nincs beállítva, a szabályos, egy címkés jokerre esik vissza
  (`https://*.cloudflarestream.com`), hogy az élesítés ne törjön el.
- A fiókkód csak alfanumerikus lehet; bármi más a jokeres ágra esik vissza —
  így egy elgépelt env-érték nem tud új direktívát csempészni a fejlécbe.

Emellett a `media-src` megkapta a `blob:` forrást is: enélkül a **kezdőlap
nyitó filmsávja** (ScrollScrub) nem indul el, mert az a klipet letölti, majd
`URL.createObjectURL()`-lel adja a videóelemnek. Ez nem a Stream-hez tartozik,
de ugyanaz a fejléc blokkolta.

### 6.3 A bizonyíték (valódi böngésző)

A viselkedést valódi Chromiumban, valódi `Content-Security-Policy`
válaszfejléccel kiszolgált oldalon mértük. A böngésző `securitypolicyviolation`
eseménye a döntő jel: ha a forrás nem került a listára, az esemény elsül.

| Eset | CSP a `*.cloudflarestream.com`-ra | Eredmény |
|---|---|---|
| A) régi minta (`customer-*`) | `frame-src` / `img-src` / `media-src` | **mindhárom megsértve**, egyetlen kérés sem indult el |
| B) új minta (`*.`) + `media-src blob:` | ugyanaz | **nulla megsértés**, mindhárom erőforrás betöltött |
| C) pontos host (`customer-abc123.…`) | ugyanaz | **nulla megsértés**, mindhárom erőforrás betöltött |
| D) új minta, de `blob:` nélkül | ugyanaz | a Stream átmegy, de a **filmsáv blob-videója blokkolva** |

A regressziót a `src/__tests__/security/csp.test.ts` őrzi a CI-ban: külön
teszt tiltja a `customer-*` alak visszatérését, és ellenőrzi a `blob:`,
`worker-src`, `connect-src`, `object-src`, `base-uri`, `form-action`,
`frame-ancestors` direktívákat.

### 6.4 A teljes, javított fejléc (fiókkód nélküli, alapértelmezett eset)

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;
frame-src 'self' https://iframe.cloudflarestream.com https://*.cloudflarestream.com
          https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com;
img-src 'self' data: https://videodelivery.net https://*.cloudflarestream.com;
media-src 'self' blob: https://videodelivery.net https://*.cloudflarestream.com;
connect-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self'
```

Miért van benne `'unsafe-inline'` (és miért nincs `'unsafe-eval'`):

- **`script-src 'unsafe-inline'` — kényszer.** A Next.js App Router minden
  oldalra inline bootstrap-scriptet ír (`self.__next_f.push(...)`, a
  szerver-komponensek adatfolyama), és a Payload admin is inline scripttel adja
  át a kezdőállapotot. Kiváltani csak kérésenkénti `nonce` + `'strict-dynamic'`
  párossal lehet, amit a middleware-nek kell generálnia **és** a Payload
  adminnak is át kell vennie. Ez külön, mérendő feladat.
- **`style-src 'unsafe-inline'` — kényszer.** A React `style={{…}}` attribútumai
  (HeroVideo, ScrollScrub) és a Payload admin `<style>` blokkjai. Később
  szűkíthető `style-src-elem` + `style-src-attr` bontással.
- **`'unsafe-eval'` nincs, és nem is kell** — sem a Turnstile, sem a Stream
  beágyazás nem használ `eval`-t. (Megjegyzés: `npm run dev` alatt a HMR
  igényelhet `eval`-t; a fejlesztői élményt ez érintheti, az éles működést nem.)
- **`connect-src 'self'` elég:** a PostHog a saját domainünk `/ingest`
  proxyján megy (`next.config.ts` rewrites), a Barion pedig **nem** hálózati
  hívás a böngészőből, hanem teljes oldalas átirányítás — azt a CSP nem
  korlátozza. A Barion API-t kizárólag a szerver hívja. **A fizetés tehát nem
  törik el.**
- Kikerült a `script-src`-ből a `cloudflarestream.com`: a Stream kizárólag
  iframe-ként van beágyazva, az iframe-en belüli scriptekre a beágyazott
  dokumentum saját szabálya vonatkozik.

---

## 7. Ha később saját (nem Stream) videóra váltanánk

Reális alternatíva, ha a Stream költsége vagy a szolgáltatófüggés zavaró. Amit
tudni érdemes, mielőtt bárki belevág:

**Mi maradna változatlan**

- A fizetőfal logikája: „megvette-e" ellenőrzés, a 403-as
  információ-minimalizálás, a státusz-szabályok
  (`src/lib/stream/issue-stream-token.ts`) — ez szolgáltató-független.
- Az admin-mezők szerkezete (azonosító, hossz, állapot) — csak az azonosító
  jelentése változna (Stream-UID helyett pl. fájlnév vagy objektumkulcs).

**Mit kellene újraírni**

| Terület | Teendő |
|---|---|
| Jegy-kiállítás | A `src/lib/stream/token.ts` Cloudflare-specifikus JWT-t gyárt (`sub` = videó-UID). Saját tárolónál jellemzően aláírt URL-t vagy rövid életű süti-jegyet adnánk. |
| Lejátszó | Az iframe-beágyazás helyett saját `<video>` elem kellene HLS-sel (pl. `hls.js`) — plusz függőség, plusz karbantartás. |
| Átkódolás | A Stream ma automatikusan több minőségben kódol. Saját megoldásnál ezt nekünk kellene futtatni (ffmpeg), különben mobilon akadna a lejátszás. |
| Kiszolgálás | CDN nélkül a videó a saját szerverünk sávszélességét eszi. Railway-en ez gyorsan drága és lassú lesz — reálisan objektumtároló (pl. R2/S3) + CDN kell. |
| CSP | A `frame-src`/`img-src`/`media-src` Stream-hostjai helyére az új tároló hoszt kerülne (`src/lib/security/csp.ts`). A `media-src blob:` maradna, mert a filmsávnak amúgy is kell. |
| Meglévő videók | A már feltöltött Stream-videókat le kell tölteni és átköltöztetni; a régi UID-ok az adminban érvénytelenné válnak. |

**Rövid ajánlás:** amíg a kurzusok száma kicsi és a nézettség kiszámítható, a
Stream olcsóbb és lényegesen kevesebb üzemeltetést igényel. A váltásnak akkor
van értelme, ha a havi Stream-számla tartósan meghaladja egy tároló + CDN +
fejlesztői karbantartás együttes költségét — ezt előbb mérjük, ne becsüljük.

---

## 8. Ellenőrzőlista élesítés előtt

- [ ] Cloudflare-fiók, Stream bekapcsolva, számlázás rendben.
- [ ] `CF_STREAM_ACCOUNT_ID`, `CF_STREAM_API_TOKEN`, `CF_STREAM_SIGNING_KEY`
      beállítva (Railway Variables), `CF_STREAM_SIGNING_KEY_ID` ha kell.
- [ ] `NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE` beállítva **és utána újrabuildelve**.
- [ ] A 4.3 pont két hibája javítva, teszttel lefedve.
- [ ] A kurzusvideókon a Cloudflare **Require signed URLs** bekapcsolva.
- [ ] Próbavásárlás a staging-en: vétel → „Kurzusaim" → a videó elindul.
- [ ] Ellenőrzés, hogy **nem** vevőként a lejátszó 403-at ad, és a videó URL-je
      önmagában (jegy nélkül) nem játszható le.
- [ ] Böngésző-konzol: nincs CSP-hiba a kurzus- és a kezdőlapon.
