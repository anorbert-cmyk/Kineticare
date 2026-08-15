# Grafikai leltár — a régi kineticare.hu vizuális elemei

> **Mi ez?** A régi, még élő `kineticare.hu` (systeme.io-alapú oldal) GRAFIKAI és
> VIZUÁLIS rétegének leltára, összevetve a mostani Next.js/Payload storefronttal,
> plusz javaslat arra, mit érdemes áthozni.
> **Mi NEM ez?** Nem szövegleltár (az külön dokumentum), és nem végrehajtási terv:
> ez a doksi **egyetlen képet sem hozott át** a repóba, csak felmér és javasol.
> **Kötelező háttér:** `CLAUDE.md` (TILOS ZÓNÁK) és `docs/ertekesitesi-ux-skill.md`
> (tipográfiai skála, WCAG AA). Ahol egy régi elem ezekbe ütközne, azt jelöltem.
> **Alapszabály a javaslatokra:** a tulajdonos szerint a **kezdőlap kinézete jó**,
> ezért itt minden javaslat a **belső oldalakra és új szekciókra** vonatkozik.
> A kezdőlapot érintő megfigyelések külön, „csak észrevétel" jelöléssel szerepelnek.

Felvétel dátuma: 2026-08-15.

## 0. Módszertan és bejárt oldalak

| Forrás | URL | Státusz |
| --- | --- | --- |
| Régi kezdőlap | `https://www.kineticare.hu/` | ✅ 200, nyers HTML elemezve |
| Régi Szolgáltatások | `https://www.kineticare.hu/szolgaltatasok` | ✅ 200 |
| Régi Rólunk | `https://www.kineticare.hu/rolunk` | ✅ 200 |
| Régi Kapcsolat | `https://www.kineticare.hu/kapcsolat` | ✅ 200 |
| Régi Rendelői kezelések | `https://www.kineticare.hu/rendeloi-kezelesek` | ✅ 200 |
| Régi KézRehab (otthoni program) | `https://www.kineticare.hu/kezrehab` | ✅ 200 |
| Régi SOS KézRelax | `https://www.kineticare.hu/kezrelax` | ✅ 200 |
| Régi sitemap | `https://www.kineticare.hu/sitemap.xml` | ✅ 200 (sitemapindex: 1 blog + 3 funnel) |
| Éles új oldal | `https://kineticare-production.up.railway.app/` + `/rolunk`, `/szolgaltatasok`, `/kapcsolat`, `/sitemap.xml`, `/api/media` | ✅ 200 |

Mérési mód: nyers HTML-ből kiszedett `<img>`-lista, inline `style`/`rgba()` értékek,
`@font-face` URL-ek, `:hover` szabályok; a képek pixelméretét a régi oldalon
**nem** mértem (nem töltöttem le képet), a **saját** médiatárunk méreteit a
`/api/media` végpont adta. Ahol a méret így nem volt megállapítható, ott az áll:
**NEM ELLENŐRIZHETŐ**.

A régi oldal platformja **systeme.io** (statikus builder-kimenet, `sc-*`
styled-components osztálynevekkel). Ennek két következménye van: (a) nincs
tervezői forrásfájl a layoutokhoz, (b) a képek egy CDN-en
(`d1yei2z3i6k35z.cloudfront.net`) élnek, hash-elt fájlnévvel, **alt-szöveg nélkül**
(a régi oldal EGYETLEN képének sincs `alt` attribútuma — a11y-szempontból a
mostani oldalunk ebben már most jobb).

---

## 1. Vezetői összefoglaló — az 5 legértékesebb áthozandó elem

Az összevetés legfontosabb megállapítása: **a belső oldalaink vizuálisan üresek.**
Mérés az éles oldalon: `/rolunk` = **1 kép**, `/szolgaltatasok` = **1 kép**,
`/kapcsolat` = **0 kép**. Mindhárom oldal egyetlen `kc-page-hero` + egy hosszú
`kc-richtext` hasáb — a kezdőlapra megépített teljes blokk-katalógus (About,
Services, PressLogos, Testimonials, Usps, States) ott **egyáltalán nincs
használatban**. A régi oldalon ugyanez a három oldal 6 / 11 / 42 képet vitt.
A grafikai érték tehát nem hiányzik a márkából — csak nem jut el a belső oldalakig.

### 1. A két alapító párba állított portréi — MAGAS

A régi `/rolunk` már ma is **50–50 arányban, egymás mellett** hozza a két
gyógytornászt (`KocsisKatakozeli.png` és `KissKataelegans.png`, mindkettő 300px
megjelenítési szélességen). Nálunk mindkét fájl **már bent van a médiatárban**,
azonos, `800 × 1080`-as méretben — vagyis a tulajdonos által kért 50–50-es
bemutatkozó szekcióhoz a kép-alapanyag megvan. Részletek és a minőségi
fenntartások a 3. szakaszban; ott van egy **jobb, egy fotózásból származó
párosítás** is.

### 2. A 16 partnerlogó — MAGAS

A régi `/rolunk` „Partnereink:" sávjában 16 szervezet logója fut. Nálunk ugyanez
a lista **puszta, vesszővel elválasztott mondattá** van lefokozva a rich-textben
(„Magyar Sportrehabilitációs Egyesület, ProBody Stúdió, Aurora Medical, …").
Ez a legolcsóbb nagy nyereség: a `PressLogos` blokk (`src/blocks/press-logos.ts`,
`src/components/blocks/PressLogos.tsx`) **teljesen CMS-vezérelt és általános** —
tetszőleges logósort renderel a Médiatárból. Nem kell hozzá új kód, csak
médiafeltöltés és egy blokk hozzáadása a `/rolunk` oldalhoz.

### 3. A kezelési technikák fotótára (`/rendeloi-kezelesek`) — MAGAS

A régi oldal legerősebb, máshol nem pótolható vizuális készlete: 10 db, egyenként
600px-en megjelenített fotó a saját eszközökről és technikákról (Dynamic Tape®,
kinezio tape, flossing, köpöly, fasciakés, eszközpark, hegkezelés, NRX®,
gyógytorna, manuálterápia). Ez **bizonyíték-jellegű képanyag** (a szakmai hitel
vizuális alátámasztása), és a mostani `/szolgaltatasok` oldalunk ugyanezeket a
technikákat **kizárólag szövegben** sorolja fel. Az egész `/rendeloi-kezelesek`
oldal hiányzik az új site-ról.

### 4. Az „egy fotózás" fehér-alapú képi nyelv — MAGAS (mint szabály, nem mint fájl)

A legjobb régi fotók egyetlen stúdiózásból származnak: **fehér kazettás ajtó
háttér, természetes, magas kulcsú (high-key) fény, fehér/krém ruházat, meleg
tónus, szűk-közepes kivágás, egy-két kellék** (fehér orchidea márvány posztamensen,
krém gimnasztikai labda, világoskék SMR-henger — ez utóbbi színe véletlenül épp a
márka kékje). Ide tartozik a `680a69d078306_Katakfeherbenhattal.png` (páros,
háttal-egymásnak), a `682a121babe80_IMG_7573.jpeg` (Kocsis Kata szólóban) és a
`682a13266f517_IMG_75732.jpeg` (Kiss Kata szólóban). Ez a képi nyelv illik a
mostani hűvös-világos `paper`/`tint` felületrendszerhez, és **fotó-briefként**
rögzítendő minden jövőbeli fotózáshoz.

### 5. A „kép ↔ szöveg" cikkcakk szekció-ritmus — KÖZEPES

A régi kezdőlap és `/szolgaltatasok` „Így tudunk neked segíteni" / „Válaszd ki…"
szekciója váltakozó oldalon hozza a képet és a szöveget (kép balra → szöveg
jobbra → szöveg balra → kép jobbra), minden blokk végén nyíllal jelölt
CTA-linkkel. Ez a legegyszerűbb eszköz arra, hogy a belső oldalak hosszú
szövegtömbjei ne egyetlen, végtelen hasábként olvassanak. Nálunk a `Services`
blokk (`src/blocks/services.ts`) egyetlen `image` mezőt + sorokat ismer, tehát
**nem** cikkcakk — ehhez vagy a `Services` bővítése, vagy egy új „media+szöveg"
blokk kellene.

---

## 2. Elem-táblázat

Jelmagyarázat a „Nálunk megvan?" oszlophoz:
**✅** = megvan és látszik · **⚠️** = a fájl megvan a repóban/médiatárban, de sehol nem jelenik meg · **❌** = nincs.

### 2.1 Fotók — alapítók és portrék

| Elem | Hol van a régi oldalon | Nálunk megvan? | Érték | Mi kell az áthozáshoz |
| --- | --- | --- | --- | --- |
| `67b3c6e9e315f_KocsisKatakozeli.png` — Kocsis Kata ülő, laptoppal, kézcsontváz-modellel, fehér vakolt fal | `/rolunk` alapítói sáv (300px) | ⚠️ médiatárban: `800×1080`, 38 KB webp; sehol nem jelenik meg | MAGAS | Új „alapítói páros" blokk (nincs ilyen blokkunk); lásd 3. szakasz a minőségi fenntartásokkal |
| `67c07def59ac2_KissKataelegans.png` — Kiss Kata álló, karba tett kéz, fehér zakó, kazettás ajtó | `/rolunk` alapítói sáv (300px) | ⚠️ médiatárban: `800×1080`, 29 KB webp; sehol nem jelenik meg | MAGAS | ugyanaz |
| `682a121babe80_IMG_7573.jpeg` — Kocsis Kata szóló, fehér garbó, orchidea, krém labda | `/rolunk` „Megérdemled a profi törődést" | ✅ ez az `/rolunk` hero-képünk (`1243×1500`) — **DE hibás alt-szöveggel** („Kiss Kata és Kocsis Kata munka közben", holott egyetlen személy van a képen) | MAGAS | Alt-javítás a Médiatárban (1 mező) |
| `682a13266f517_IMG_75732.jpeg` — **Kiss Kata szóló, ugyanabból a fotózásból** (fehér felső, krém labda, világoskék henger) | `/rolunk`, az előző mellett | ❌ nincs a repóban | **MAGAS — ez a legjobb 50–50-es pár** | Feltöltés a Médiatárba + magyar alt; lásd 3. szakasz |
| `680a69d078306_Katakfeherbenhattal.png` — a két alapító háttal egymásnak, fehérben | `/kezrehab` | ⚠️ médiatárban `940×788`; sehol nem jelenik meg | MAGAS | Kiváló „Rólunk" nyitókép a `/rolunk` oldal tetejére vagy az `About` blokk `photo` mezőjébe |
| `67b4bc17e0c78_katak-paravan.jpg` — a két alapító paravánnal, rendelői környezet | régi kezdőlap hero | ✅ médiatárban (`1080×960`) + a landing `brand/katak.jpg`-je | KÖZEPES | — (kezdőlap: nem nyúlunk hozzá) |
| `67c07b094d012_SYL_9113.jpeg` — kezelés közbeni felvétel | régi kezdőlap „Üdvözlünk!" | ✅ = `katak-team.jpg`, a kezdőlapunk `About` fotója (`1000×1500`) | KÖZEPES | — |
| `678fa5f84cd52_Katakeleganslaptoppal.jpeg` — laptop előtt, online program képe | régi kezdőlap + `/kezrelax` | ⚠️ médiatárban (`1000×1500`); sehol nem jelenik meg | KÖZEPES | Az „online kurzus" szekció illusztrációja lehetne a `/szolgaltatasok`-on |
| `6789141140ae8_CopyofSYL_9110.jpg` — „Amiben mások vagyunk" nagy kép (600px) | `/rolunk` | ❌ | ALACSONY | Csak akkor, ha a „Amiben mások vagyunk" hármas kap saját szekciót |
| `67c22648dbbf8_katakkapcsolat.png` — a Kapcsolat oldal képe (450px) | `/kapcsolat` | ❌ | KÖZEPES | A mostani `/kapcsolat` oldalunk **0 képes** — egyetlen emberi arc sokat javítana a konverzión |
| `68090369ddb17_SYL_9099-2.jpeg` — kéz-közeli, „…ez nem csak egy kéz" | `/rolunk` | ❌ | KÖZEPES | Kéz-közeli felvétel; a mostani kéz-vizuáljaink (`state-*`, `services-hands`) generált/landing-eredetűek |

### 2.2 Fotók — kezelések, technikák, eszközök (`/rendeloi-kezelesek`)

Mind a 10 technika-fotó 600px-en jelenik meg a régi oldalon; forrás-PNG-k 250–340 KB
között. Intrinsic felbontás: **NEM ELLENŐRIZHETŐ**.

| Elem | Fájl | Nálunk megvan? | Érték | Mi kell |
| --- | --- | --- | --- | --- |
| Dynamic Tape® felhelyezés | `67be078803ff1_DynamicTape.png` (312 KB) | ❌ | MAGAS | Feltöltés + magyar alt |
| Kinezio tape | `67be1a035a94f_kinezio.png` (292 KB) | ❌ | MAGAS | ugyanaz |
| Flossing | `67be1a5b5ffaf_flossing.png` (299 KB) | ❌ | MAGAS | ugyanaz |
| Köpölyterápia | `67be1c2968e1c_kopoly.png` (256 KB) | ❌ | MAGAS | ugyanaz |
| Fasciakés | `67be1c50a50c6_kes.png` (253 KB) | ❌ | MAGAS | ugyanaz |
| Eszközpark | `67be1c9d65203_eszkozok.png` (288 KB) | ❌ | MAGAS | ugyanaz |
| Hegkezelés | `67be1cc9b9456_hegkezeles.png` (340 KB) | ❌ | MAGAS | ugyanaz |
| NRX® bandázs | `67be1cedd82fa_nrx.png` (334 KB) | ❌ | MAGAS | ugyanaz |
| Gyógytorna (kártyakép) | `67be09780ab63_gyogytorna.png` (271 KB) | ❌ | KÖZEPES | 3 szolgáltatás-kártya képei |
| Manuálterápia (kártyakép) | `67be0b041fe8a_manualterapia.png` (337 KB) | ❌ | KÖZEPES | ugyanaz |
| Manuálterápia nagy kép | `67be0bbe5bdcc_manual.png` (326 KB) | ❌ | KÖZEPES | Szekció-illusztráció |
| Rendelő / gyakorlat felvételek | `67bdd07549d0a_IMG_0197.JPG` (119 KB), `67be055410ef7_ladbagyakorlat.png` (583 KB), `67be005e660b9_feherruhabankeznyujtas.png` (315 KB), `67be00e31154a_kekbenkareslab.png` (289 KB) | ❌ | KÖZEPES | Szekció-illusztrációk |
| Rendelő tér | `67b3bd06f3936_Rendelo.png` | ✅ a `/szolgaltatasok` hero-képünk (`800×1080`) | — | — |
| Kezelések kollázs | `67b2668feae66_Kezeleskek.png` | ⚠️ médiatárban (`940×788`); sehol nem jelenik meg | KÖZEPES | A `/szolgaltatasok` „Rendelői kezelések" blokkjának képe |

### 2.3 Logók

**Kineticare saját logó — 2 változat:**

| Elem | Leírás (mért) | Nálunk megvan? | Érték | Mi kell |
| --- | --- | --- | --- | --- |
| `6790f4bfde577_kckeklogog.png` — **világos háttérre** | `500 × 96`. Három egymás alá csúsztatott hullám-vonás + „KINETICARE" vékony szeriffes verzálban. Egyetlen szín: **`#72B2E2`** (mért domináns pixelérték) | ✅ médiatárban `logo-kineticare.webp` (`500×96`) | MAGAS | — de lásd lent: a fejlécünk NEM ezt használja |
| `678915cb3f277_F1HN.png` — **sötét háttérre** | Fehér/majdnem fehér változat átlátszó alapon (fehér háttéren megjelenítve teljesen eltűnik — ez erősíti meg, hogy sötét-háttér-variáns). A régi lábléc navy sávján fut, 70px-en. Canva-forrás („Névtelen terv - F1HN", 2024, Kiss Kata) | ❌ | KÖZEPES | Csak akkor kell, ha logót teszünk `kc-section--dark` sávra vagy sötét láblécre |

> **Csak észrevétel (kezdőlapot is érinti, ezért NEM javaslat):** a mostani fejléc
> és lábléc a márkanevet **puszta szövegként** hozza (`kc-site-header__brand`:
> „Kineti" + kiemelt „care"), a hullám-motívumos valódi logót sehol nem jeleníti
> meg — pedig a `logo-kineticare.webp` bent van a médiatárban. Ez márkaazonossági
> rés, de a fejléc globális chrome, tehát a kezdőlapra is kihatna. **Vezetői
> döntés kérdése**, én magamtól nem javaslom.

**Partnerlogók (`/rolunk`, 16 db, 46–100px-en megjelenítve).** Nálunk **egyik sincs
meg**; a lista puszta szöveggé van fokozva a `/rolunk` rich-textben.

| # | Szervezet | Fájl | Byte | Megjegyzés |
| --- | --- | --- | --- | --- |
| 1 | Magyar Sportrehabilitációs Egyesület | `67c9a1738798c_IMG_0523.png` | 54 KB | |
| 2 | ProBody Stúdió | `67c9a253f3048_IMG_4351.png` | 4 KB | |
| 3 | Aurora Medical | `67c9a3563259b_image_12365029111.jpeg` | 32 KB | JPEG — nincs átlátszóság |
| 4 | Dynamic Tape® | `67c9a3c085d56_correct-protect-performLOGO-1.png` | 278 KB | 52px-en megjelenítve — durván túlméretezett |
| 5 | TUDATEST | `67c9a3ffb7385_474381039_…_n.jpeg` | 18 KB | **Facebook-CDN névminta** — valószínűleg közösségi profilképről mentve |
| 6 | PhysioWatch | `67c9a4e51c11f_IMG_0515.jpeg` | 32 KB | `IMG_` név → fotó/képernyőkép, nem logófájl |
| 7 | WIBBI | `67c9a4f8047fa_Wibbi_Primary-FullColour.png` | 8 KB | Rendes márka-fájlnév, 100px-en fut |
| 8 | Halm Optika | `67c9a51a50b07_logo.png` | 8 KB | |
| 9 | dr. pharm. Kocsis Kristóf | `67c9a545075cc_IMG_0736.png` | 289 KB | `IMG_` név, 52px-en |
| 10 | Csillik Árpád | `67c9a5b48c0f4_CSH06417copy.jpeg` | 101 KB | Fotó-fájlnév, „copy" utótag |
| 11 | NISHI STUDIO pilates | `67c9a5c5b81f0_bezs_bg_logo.png` | 12 KB | Fájlnév szerint **bézs háttérrel beégetve** |
| 12 | BodyGPS | `67c9a6134bfb5_BodyGPS_Logo.png` | 257 KB | |
| 13 | Magic Smile | `67c9a664bbb0c_Jucilogo-5.png` | 59 KB | |
| 14 | Be Fit With Ben | `69ed225bc16561.91850354_befitwithben2.jpeg` | 4 KB | Nagyon kicsi fájl → alacsony felbontás |
| 15 | OrtoCare | `693f1a9ddd2f8_d80bcbe2-…-14ba4d0cc300.jpeg` | 20 KB | 46px-en |
| 16 | Pille Fizioterápia | `69ed1ddd3fd109.77981488_pille.logo02.png` | 86 KB | |

**Sajtó- / szakmai logók (régi kezdőlap hitelcsík, 6 db):** Nők Lapja, Karc FM,
Házipatika, Képmás, iSport, MGYFT. **✅ Mind a hat már át van hozva** és él a
kezdőlapunkon (`press-noklapja` … `press-mgyft`, mind `350×200`, ill. az MGYFT
`289×145`). Ez a leltár egyetlen olyan tétele, ahol nincs teendő.

### 2.4 Ikonok, piktogramok, illusztrációk

| Elem | Régi oldalon | Nálunk | Érték | Megjegyzés |
| --- | --- | --- | --- | --- |
| Egységes ikonkészlet | **NINCS.** Az egyetlen ikon a Font Awesome `fas fa-arrow-right` a 3 szolgáltatás-CTA végén | Beágyazott, dekoratív SVG-k (pl. `About` `FeatureIcon`) | ALACSONY | **Nincs mit áthozni** — a régi oldal ikonkészlete egy CDN-ről húzott Font Awesome, saját ikonnyelv nélkül. Ez inkább lehetőség: saját, vonalas ikonnyelv építése szabad terület |
| Anatómiai ábra, folyamatábra, „így működik" grafika | **NINCS** egyetlen aloldalon sem | `HowItWorks` (3 lépés, szöveges) | — | A régi oldal semmilyen anatómiai rajzot vagy diagramot nem használ. Az egyetlen anatómiai utalás egy **fizikai kézcsontváz-modell** a Kocsis Kata-portré hátterében — ez érdekes márka-kellék, de nem grafikai eszköz |
| `6790dd85a38ec_wave.svg` — hullám-elválasztó | Szekcióhatárokon, `/`, `/szolgaltatasok`, `/rolunk`, `/rendeloi-kezelesek`, `/kezrehab`, `/kezrelax` | ❌ | **NEM AJÁNLOTT** | 1440×320-as viewBox, kitöltés `#EBF7FF` — a **nyugdíjazott** legacy tint-szín. Lásd 5. szakasz |
| Termék-packshotok (`belepotermekpackshot1.png`, `Programpackshot.png`) | Minden oldal alján, CTA-sávban | ✅ mindkettő a médiatárban (`1080×880`, `1080×750`); a Programpackshot a kezdőlapon él | MAGAS | — |
| „Garancia" pecsét (`678fad3c173fa_Garancia1.png`, `678fa82d2b2ec_Garancia.png`) | `/kezrehab`, `/kezrelax` | ❌ | **ALACSONY / kockázatos** | Lásd 5. szakasz |
| Fizetési biztonság logósor (`6789103b8af48_secure-CC-logok2.png`) | `/kezrehab` | ❌ | ALACSONY | Barionos checkoutunk saját logóit használjuk; a régi kép egy összeragasztott kártya-logó bitmap |
| Vélemény-portrék (kerek kivágás) | Kezdőlap + `/rolunk` + `/szolgaltatasok`, `border-radius:200px`, 180–200px | ❌ **A `Testimonials` collectionünkben nincs is kép mező** | KÖZEPES | Lásd 6. szakasz (kép-jogi kockázat) |

### 2.5 Elrendezési motívumok és mozgás

| Motívum | Régi oldal | Nálunk | Érték |
| --- | --- | --- | --- |
| Cikkcakk kép↔szöveg szekciók | Kezdőlap „Így tudunk neked segíteni", `/szolgaltatasok` „Válaszd ki…", `/rendeloi-kezelesek` végig | ❌ (a `Services` blokk 1 képet ismer) | **KÖZEPES–MAGAS** |
| Teljes szélességű képsáv | Hero (`katak-paravan.jpg`, 530px-en, nem full-bleed) | ✅ `kc-board`, `kc-board--edge`, `kc-board--band` — nálunk **erősebb** | — |
| Kártya | Alig: `border-radius` 0 vagy 5px, `box-shadow: none` | ✅ `Card`, hajszálvonalas nyelv | — |
| Átfedés, aszimmetria | **NINCS** — a régi oldal szigorúan sorokba/hasábokba rendezett | ✅ nálunk a board-rendszer aszimmetrikusabb | — |
| Árnyék | `boxShadow: none` mindenhol | ✅ nálunk is árnyék nélküli, hajszálvonalas | — **egybevág** |
| Nagy, halvány kék sorszámok („1. 2. 3.") 90px-en | Kezdőlap „Erre számíthatsz velünk", `/rolunk` „Amiben mások vagyunk", `/szolgaltatasok` „Ezért fogod imádni" | Részben: `Usps` `kc-usp-num` | KÖZEPES — de kontraszt-figyelmeztetéssel, lásd 4.3 |
| Hover: CTA-link `translateX(5px)` + jobbra nyíl | 3 szolgáltatás-CTA | ❌ | **KÖZEPES — olcsó, elegáns mikro-animáció** |
| Hover: nav-link aláhúzás | Fejléc | ✅ | — |
| Mobil-fiók animáció | `transform .5s cubic-bezier(.77,.2,.05,1)` | ✅ saját fiókunk van | — |
| Görgetéses megjelenés (scroll-reveal), parallax | **NINCS** (nem találtam AOS/WOW/ScrollReveal nyomot) | ✅ nálunk van `scroll-scrub` | — |
| Videó-háttér | **NINCS** a régi oldalon | ✅ `FilmHero` + `scene-02.mp4` | — |

---

## 3. A két alapító portréi — külön szakasz

A tulajdonos kérése: **dedikált, 50–50 arányban egymás mellett álló bemutatkozó
rész a két gyógytornászról.** Az alábbi a teljes rendelkezésre álló készlet.

### 3.1 Ami MOST a repóban van (A változat)

| | Kocsis Kata | Kiss Kata |
| --- | --- | --- |
| Fájl | `67b3c6e9e315f_KocsisKatakozeli.png` | `67c07def59ac2_KissKataelegans.png` |
| Hol | `src/scripts/legacy-content/kepek/`, ill. médiatár | ugyanott |
| Méret (médiatár, webp) | **800 × 1080** (20:27 ≈ 3:4), 38 KB | **800 × 1080**, 29 KB |
| Póz | **Ülő**, deréktól felfelé, a laptop takarja az alsó harmadot | **Álló**, karba tett kéz, combközépig látszik |
| Háttér | Fehér, **texturált vakolt fal**, balra márvány posztamensen **anatómiai kézcsontváz-modell** + könyvek | Fehér, **kazettás faajtó** |
| Ruházat | Sötétkék blézer / fehér felső | **Krém-fehér blézer / sötétkék felső** (fordított — egymást szépen kiegészítik) |
| Fény | Balról érkező, lágy, **hűvösebb**, szürkésebb tónus | **Melegebb**, krémesebb tónus |
| Fejméret a kereten belül | Nagy (közeli) | Kisebb (távolabb áll) |

**Ítélet:** a méret és a képarány **tökéletesen egyezik** (800×1080 mindkettő), tehát
egy 50–50-es rácsban technikailag hézagmentesen ülnek. **Vizuálisan viszont nem
igazi pár:** eltér a póz (ülő vs. álló), a háttér (vakolat vs. ajtó), a
színhőmérséklet és — a legfeltűnőbb — a **fejméret**. Egymás mellett a néző azt
látja, hogy az egyik közelebb van, mint a másik.

**Egy további, kifejezetten javítandó hiba:** a Kocsis Kata-portré **vízszintesen
tükrözve** van. Az Apple-logó a laptop tetején és a háttérben lévő könyv címe is
visszafelé olvasható. Kis méretben (300px) ez nem tűnt fel a régi oldalon; egy
50–50-es, nagy szekcióban **látható hiba lesz**. Javítható újratükrözéssel, de
akkor a fény iránya is átfordul, és még kevésbé fog párba állni a másik képpel.

### 3.2 Ami JOBB — az „egy fotózás" páros (B változat, ajánlott)

| | Kocsis Kata | Kiss Kata |
| --- | --- | --- |
| Fájl | `682a121babe80_IMG_7573.jpeg` | `682a13266f517_IMG_75732.jpeg` |
| Hol | ✅ **már a médiatárunkban** (`1243 × 1500`, 59 KB webp) | ❌ **nincs meg** — csak a régi CDN-en (106 KB JPEG); intrinsic felbontás **NEM ELLENŐRIZHETŐ** |
| Póz | Ülő, krém puffon, fehér garbó | Ülő, krém gimnasztikai labdára könyökölve, fehér felső |
| Háttér | **Ugyanaz a fehér kazettás ajtó**, balra orchidea márvány posztamensen | **Ugyanaz a fehér kazettás ajtó**, jobbra világoskék SMR-henger |
| Fény, tónus | Meleg, magas kulcsú | **Azonos** |
| Kompozíció | Mindkettő ugyanabból a fotózásból, azonos beállítással, tükrözött kellék-elhelyezéssel (bal ↔ jobb) — **egymás felé néznek** |

**Ítélet: ez a valódi 50–50-es pár.** Ugyanaz a fotózás, ugyanaz a fény, ugyanaz a
háttér, ugyanaz a póz-logika, és a kellékek elrendezése tükörszimmetrikus, ami
pont egy kéthasábos szekcióra van kitalálva. Ráadásul ugyanebből a szériából
származik a `680a69d078306_Katakfeherbenhattal.png` páros felvétel is — vagyis egy
teljes, koherens „alapítói" készlet áll rendelkezésre.

### 3.3 Mi kell egy 50–50-es bemutatkozó szekcióhoz

1. **Egy hiányzó fájl:** `682a13266f517_IMG_75732.jpeg` feltöltése a Médiatárba,
   magyar `alt`-tal (pl. „Kiss Kata gyógytornász, a Kineticare alapítója").
2. **Egy alt-javítás:** `682a121babe80_IMG_7573` jelenlegi alt-ja tévesen két
   személyt említ, holott egy van a képen.
3. **Egy új blokk** — nincs olyan blokkunk, ami két személyt egyenrangúan hozna.
   A `About` blokk (`src/blocks/about.ts`) egyetlen `photo` mezőt ismer, a
   `Services` egyetlen `image`-t. Kellene egy `alapitok` blokk:
   `array` (max 2 elem) × { `photo` upload, `name` text, `role` text,
   `phone` text, `bio` textarea/richText, opcionális `link` }, `section-settings`-szel.
   A rendered rács `1fr 1fr`, 900px alatt egymás alá tördelve.
4. **Egységes kivágás:** mindkét kép ugyanarra a képarányra vágva (`3:4` vagy
   `4:5`), **azonos fejmérettel** — a rácsot a kivágás, nem a CSS `object-fit`
   oldja meg, különben az eltérő fejméret marad.
5. **Tipográfia:** a nevek a `--kc-text-board-*` vagy a törzs-skála lépcsőiről
   (`docs/ertekesitesi-ux-skill.md` 4. pont); egyedi px/rem érték tilos.
6. **Kontraszt:** a néven/beosztáson `--kc-color-text` és `--kc-color-text-muted`
   (mindkettő AA/AAA a `paper`, `white` és `tint` felületen a `tokens.css`
   jegyzőkönyve szerint). **Az `--kc-color-accent` (`#3d78aa`) ide nem jöhet
   szövegszínként** (a hűvös felületeken 4,07–4,70:1, tehát nem éri el a 4,5:1-et);
   ha kék kell, `--kc-color-accent-deep`.
7. **Telefonszámok:** a régi oldal `+36301692263` / `+36203573493` formában, a
   miénk már tagoltan („+36 30 169 2263") — maradjon a tagolt.

**Nyitott kérdés a vezetőnek:** melyik változat menjen? Az én ajánlásom a **B
(egy fotózás)**, mert egyetlen hiányzó fájl feltöltésével valódi, professzionális
párost ad. Az A változat előnye, hogy mindkét fájl már bent van, de a tükrözési
hiba és a fejméret-eltérés miatt retust igényelne.

---

## 4. Színek és tipográfia — régi vs. mostani

### 4.1 Színek

Az értékek a régi oldal nyers HTML-jéből származó `rgba()` inline értékek
(a systeme.io mindent inline `rgba`-ban ír), illetve a logó PNG-jéből mért
domináns pixelérték.

| Szerep | Régi oldal | Mostani token | Eltérés / teendő |
| --- | --- | --- | --- |
| Törzsszöveg és címsor | `rgba(28,35,45)` = **`#1c232d`** — hűvös, majdnem fekete. Fehéren **15,81:1** | `--kc-color-ink` **`#10243e`** — fehéren 15,63:1 | **Gyakorlatilag azonos** olvashatóság; a miénk kékesebb, karakteresebb. **Nincs teendő** |
| Elsődleges gomb háttér | `rgba(45,90,137)` = **`#2d5a89`**, fehér felirattal → **7,16:1** | `--kc-color-primary` = `accent-deep` **`#2f6e9f`** (5,45:1), hover `accent-deeper` **`#275c87`** (7,08:1) | **Meglepően közeli**: a régi gombszín gyakorlatilag a mi hover-lépcsőnk. Nincs teendő |
| Hűvös sáv-háttér | `rgba(235,247,255)` = **`#ebf7ff`** | `--kc-color-surface-tint` **`#e6f0f8`** | A `#ebf7ff` a `tokens.css`-ben **kivezetett** (`--kc-color-blue-100`, „új kódban NE használd"). **Marad a mostani** |
| Márka-sötét | `rgba(11,36,63)` = **`#0b243f`** (lábléc-sáv) | `--kc-color-navy-900` — szintén kivezetve; a sötét sáv ma `--kc-color-ink` `#10243e` | **Marad a mostani** |
| Dekoratív világoskék (nagy sorszámok) | `rgba(150,208,250)` = **`#96d0fa`** — fehéren **1,65:1** | `--kc-color-accent-quiet` **`#9ec4df`** — `paper`-en **1,74:1** | **Ugyanaz a szerep, ugyanaz a nagyságrend.** Mindkettő KIZÁRÓLAG dekoratív |
| Logó-kék | **`#72B2E2`** (mért) — fehéren **2,29:1** | Nincs ilyen tokenünk | **Ne legyen tokenné.** Logotípiaként WCAG-mentes (1.4.3 / 1.4.11), de szövegre vagy UI-határra **soha** nem használható |
| Mobilmenü háttér | `rgba(238,233,230)` = `#eee9e6` (meleg bézs) | `--kc-color-surface-raised` fehér | **Ne hozzuk át** — kilóg a hűvös palettából |
| Mobilmenü aktív elem | `rgba(244,139,12)` = **`#f48b0c`** narancs | — | **Ne hozzuk át** — lásd 5. szakasz |

**Összegzés:** a mostani paletta a régi oldal színrendszerének **tisztított,
AA-ra méretezett** változata; a szövegszín, a gombszín és a dekoratív kék
szerepe egy az egyben megfelel egymásnak. **Közelítésre nincs szükség** — a
régiből egyetlen szín sem visz olyan információt, ami nálunk hiányozna. Az
egyetlen tényleges hiány a **fehér logó-variáns** (`F1HN.png`), és az sem szín,
hanem eszköz.

### 4.2 Tipográfia

| | Régi oldal | Mostani |
| --- | --- | --- |
| Címsor-család | **Tenor Sans** 400 (`d3syewzhvzylbl.cloudfront.net/fonts/google-fonts/tenorsans/regular.woff2`) | **Tenor Sans** 400 (`--kc-font-heading`, self-hosted `public/fonts/tenor-sans-400-latin{,-ext}.woff2`) |
| Törzs-család | **Nunito Sans** 400 / 600 / 700 (3 statikus woff2) | **Nunito Sans** variable 400–700 (`--kc-font-body`, self-hosted, latin + latin-ext) |
| Betűvastagságok | 400 / 600 / 700 | 400 / 600 / 700 (`--kc-font-weight-*`) |
| Sortáv (törzs) | `line-height: 30px` ≈ **1,67** | `--kc-leading-body: 1.67` |
| Címsor-betűköz | **Negatív**: `-1px`, `-1,2px`, `-1,64px`, `-2px`, `-2,64px`, `-3px` (méretfüggően, kb. **−0,02…−0,035em**) | **Pozitív**: `letter-spacing: 0.01em` a `base.css`-ben |
| Nagy címsorok | akár 90px-es display-méretek | `--kc-text-4xl` felső korlát a heroban; `--kc-text-board-*` a tábla-szekciókban |

**A betűcsalád tehát MÁR AZONOS** — a régi oldal Tenor Sans + Nunito Sans párosa
pontosan az, amit a `tokens.css` visel. Ez erős megerősítés: a márka tipográfiai
identitása hiánytalanul átment.

**Az egyetlen valós eltérés a címsorok betűköze.** A régi oldal a Tenor Sanst
következetesen **negatív trackinggel** szedi, mi **enyhén pozitívval**. Nagy
méretben (2–4 rem felett) a negatív tracking tömörebb, magabiztosabb címsort ad —
ez a régi arculat egyik felismerhető jegye.

**Javaslat (szűken):** a **belső oldalak és az új szekciók** címsoraira érdemes
egy `--kc-tracking-display: -0.02em` tokent bevezetni, és **csak** a
`--kc-text-3xl` fölötti lépcsőkön alkalmazni. **Nem** javaslom a `base.css`
globális `letter-spacing: 0.01em` átírását, mert az azonnal átrendezné a
kezdőlap tábla-címsorait is. A token bevezetése a skála-szabályba fér
(`docs/ertekesitesi-ux-skill.md` 4. pont a *méretekre* szól; a tracking a
„look & feel" körébe esik, ami a skill szerint nem változik a skálára igazítástól).

### 4.3 Kontraszt-figyelmeztetés a nagy sorszámokhoz

A régi oldal a „1. / 2. / 3." sorszámokat 90px-en, `#96d0fa` színnel szedi —
fehéren **1,65:1**. Nálunk a `Usps` blokk `kc-usp-num`-ja ugyanezt a szerepet
tölti be. **Ha a sorszám jelentést hordoz** (lépés-sorrend), akkor a szín önmagában
nem elég: az információt a szövegnek vagy egy `sr-only` feliratnak kell vinnie,
a nagy szám pedig `aria-hidden` dekoráció marad. Ez a mostani `About`
`FeatureIcon` mintáját követné, ami már helyesen `aria-hidden`.

---

## 5. Amit NEM szabad áthozni

| Elem | Miért ne |
| --- | --- |
| **`wave.svg` hullám-elválasztó** | (a) Kitöltése `#EBF7FF` — a `tokens.css`-ben **kifejezetten kivezetett** legacy tint (`--kc-color-blue-100`, „új kódban NE használd"); (b) a mostani vizuális nyelv **hajszálvonal-alapú, árnyék és dísz nélküli** (lásd `tokens.css` árnyék-szekció), a dekoratív hullám-átmenet ezzel frontálisan ütközik; (c) 2019–2021-es builder-esztétika, ma elavultan olvas |
| **`#f48b0c` narancs (mobilmenü aktív elem)** | Egyetlen helyen, a mobil oldalmenüben felbukkanó árva szín, aminek a paletta többi részéhez semmi köze. Off-brand |
| **`#eee9e6` meleg bézs (mobilmenü háttér)** | Meleg greige a hűvös-kék palettában; a `paper` (`#f6f9fc`) és a `tint` (`#e6f0f8`) mellett piszkosnak hat |
| **`#0b243f` navy + `#ebf7ff` tint-sáv páros** | A `tokens.css` fejléce szó szerint rögzíti, hogy ez a legacy kinézet **megszűnt**. Visszahozni visszalépés |
| **A partnerlogók 4 fotó-eredetű darabja** — Aurora Medical (`image_123650…jpeg`), TUDATEST (`474381039_…_n.jpeg`, Facebook-CDN névminta), PhysioWatch (`IMG_0515.jpeg`), Csillik Árpád (`CSH06417copy.jpeg`) | Ezek **nem logófájlok**, hanem fotók/képernyőmentések: nincs átlátszóság, beégetett háttér, ismeretlen felbontás. Egy hajszálvonalas, letisztult logósávban láthatóan rontanák a képet. Helyettük **a partnertől kell bekérni** a hivatalos SVG/PNG-t |
| **NISHI STUDIO `bezs_bg_logo.png`** | A fájlnév maga mondja: **bézs háttér beégetve**. A `paper`/`white` felületünkön téglalapként fog kilátszani |
| **„Garancia" pecsét-grafikák** (`Garancia.png`, `Garancia1.png`) | Kétszeresen kockázatos: (a) vizuálisan ez a klasszikus „money-back badge" infobizniszes formanyelv, ami a szakmai-egészségügyi pozicionálással ütközik; (b) **jogilag** konkrét garancia-ígéretet jelenít meg grafikaként — ilyet csak akkor szabad kitenni, ha az ÁSZF pontosan ezt a feltételrendszert tartalmazza. Ez emberi/jogi döntés, nem grafikai |
| **`secure-CC-logok2.png` kártya-logó bitmap** | Összeragasztott bitmap idegen fizetési márkák logóival; a mi checkoutunk Barion-alapú, és a Barion saját, engedélyezett logóhasználati készletét kell vinnie |
| **A régi oldal alt-szöveg nélküli kép-kezelése** | A régi oldal **egyetlen képének sincs `alt` attribútuma**. A mi Media collectionünk kötelező magyar `alt`-ot ír elő (`legacy-images.ts`) — ez az egyik pont, ahol az új oldal egyértelműen jobb, és nem szabad fellazítani |
| **A régi oldal 90px-es címsorai** | A `docs/ertekesitesi-ux-skill.md` 4. pontja szerint a hero-címsor felső korlátja `--kc-text-4xl` (max 3,3rem ≈ 53px). A régi 90px-es display-méretek a skálán kívül esnek |
| **A régi fejléc logó-méretezése (200px)** | Csak észrevétel: ha valaha logóra váltana a fejléc, a méretezést a `--kc-header-height` (4,5rem) és a 44×44px-es érintési célfelület szabályához kell igazítani, nem a régi 200px-hez |

---

## 6. Kockázatok

### 6.1 Kép-jogok — a legsúlyosabb tétel

- **Partnerlogók (16 db):** idegen szervezetek védjegyei. Az, hogy a régi oldalon
  kint vannak, **nem** bizonyíték az engedélyre. Áthozás előtt tisztázandó, hogy
  a partnerek hozzájárultak-e a logóhasználathoz, és van-e élő együttműködés
  (a lista tartalmaz **magánszemélyeket is** — „dr. pharm. Kocsis Kristóf",
  „Csillik Árpád" —, ahol a személyiségi jog is felmerül). A `Dynamic Tape®` és a
  `WIBBI` bejegyzett védjegy, saját márkakönyvvel.
- **Vélemény-portrék:** a régi oldal 8 páciens/ügyfél arcképét hozza (Garami Gábor,
  Kállai Dóra, Kunfalvi Lili, Bagdal Szilvia, Konda Boglárka, Tarba Patrícia,
  Varró Barbara, Takács Mátyás). Egészségügyi kontextusban egy páciens arcképe
  **különleges adatra utaló** információt hordoz — írásos hozzájárulás nélkül nem
  publikálható. Ha nincs meg a hozzájárulás, a vélemények maradjanak szövegesek
  (ahogy ma vannak).
- **Fotós szerzői jog:** a `SYL_*` és `CSH*` fájlnév-minta professzionális
  fotós-számozásra utal. A felhasználási jog terjedelme (weben korlátlan? új
  platformon is?) **NEM ELLENŐRIZHETŐ** a repóból — a tulajdonosnál kell rákérdezni.
- Megnyugtató ellenpont: az `src/scripts/legacy-content/kepek/` 16 fájlja már ma is
  a repóban van és élesben szolgál ki, tehát ezekre a gyakorlat szerint van jog.

### 6.2 Forrásfájl hiánya

- **Nincs egyetlen vektoros forrás sem.** A Kineticare-logó két változata is
  raszter PNG (`500×96`, ill. az `F1HN.png` egy **Canva-terv exportja** — a
  metaadat szerint „Névtelen terv - F1HN", 2024). Nincs SVG, nincs `.ai`/`.fig`.
  Nagy méretű megjelenítésnél (retina fejléc, nyomdai anyag, favicon-készlet)
  ez korlát lesz. **Javaslat:** a logó SVG-re rajzolása külön, egyszeri feladat —
  a hullám-motívum három ívből áll, jól újrarajzolható.
- A layoutokhoz nincs tervezői forrás: a systeme.io kimenete csak HTML.
- A partnerlogók közül a fentebb megjelölt 4 esetében **eleve nincs logó-forrásfájl**,
  csak fotó.

### 6.3 Felbontás

- **Amit tudunk:** a saját médiatárunk minden képének pontos mérete
  (lásd 2. és 3. szakasz). A legkisebb kritikus tétel: a két alapítói portré
  `800 × 1080` — egy 50–50-es szekcióban desktopon (~560px-es hasáb) **elég**,
  full-bleed táblán (`kc-board`) már **nem**.
- **Amit nem tudunk:** a régi CDN-en lévő, még át nem hozott képek intrinsic
  felbontása — **NEM ELLENŐRIZHETŐ** (nem töltöttem le képet). A byte-méret csak
  proxy: a technika-fotók 250–583 KB-os PNG-k, ami 600px-es megjelenítéshez bőven
  elég, de nem garancia.
- **Kicsi fájlok, óvatosan:** `befitwithben2.jpeg` 3,7 KB és `IMG_4351.png` 3,9 KB —
  ezek biztosan nagyon alacsony felbontásúak, egy 52px-es logósorban is határeset.

### 6.4 Méret és teljesítmény

- **Ez a legkevésbé aggasztó terület.** A `Media` collection (`src/collections/Media.ts`)
  feltöltéskor **webp-re konvertál** és méret-variánsokat generál; mérhető
  eredmény: a `403 KB` PNG-ből `38 KB` webp lett (`KocsisKatakozeli`), a `370 KB`-ból
  `29 KB` (`KissKataelegans`). A régi PNG-k pazarlása tehát a feltöltésen elolvad.
- Figyelni kell viszont a **darabszámra**: a 10 technika-fotó + 16 partnerlogó =
  26 új médiaelem. Ha mind egy oldalra kerül (`/rendeloi-kezelesek`), a logósor
  `loading="lazy"`-ja és a Next `<Image>` `sizes` beállítása kötelező — a
  `PressLogos` ezt már ma jól csinálja.
- **Ellenpont a saját oldalunkon:** a jelenlegi landing-assetek jóval nehezebbek,
  mint bármi a régiről (`sos-art.png` 3,07 MB, `services-hands.png` 1,28 MB,
  `state-*.png` ~0,9 MB/db, `scene-02.mp4` 10,6 MB). A régi képek áthozása ehhez
  képest elhanyagolható terhelés.

### 6.5 Munkafolyamati kockázat

- **Nincs blokkunk kétszemélyes bemutatkozásra** — ez ténylegesen új kód
  (blokk-definíció + komponens + CSS + teszt), nem CMS-munka. Ez az egyetlen tétel
  a leltárban, ami fejlesztést igényel; minden más feltöltés + tartalom-összeállítás.
- **A `Testimonials` collectionnek nincs kép mezője** — ha a vélemény-portrék
  kellenek, az séma-változás, tehát **migrációs lánc** kell hozzá
  (`npx payload migrate:create` + `migrate`; a kézi migráció-írás TILOS ZÓNA,
  a dev séma-push ki van kapcsolva — `CLAUDE.md` 22a).
- **Ütközés-veszély:** a `/rolunk` és `/szolgaltatasok` tartalma ma CMS-ben él
  (rich-text). Ha a szöveges leltárt végző ügynök ugyanezeket az oldalakat
  szerkeszti, a blokkosításnak vele egyeztetve kell történnie — különben a rich-text
  átírása és a blokkokra bontás egymást írja felül (`CLAUDE.md` 16. tanulság:
  fan-outnál tiszta fájl-/tartalom-tulajdonlás).

---

## 7. Nyitott kérdések a vezetőnek

1. **Alapítói portrék: A vagy B változat?** (3.1 vs. 3.2) — ajánlásom a B, ehhez
   egyetlen fájl (`682a13266f517_IMG_75732.jpeg`) feltöltése kell.
2. **Kép-jogok:** van írásos hozzájárulás a 16 partnertől a logóhasználatra, és a
   8 vélemény-portréhoz az érintettektől? Enélkül a 2. és a 6.1 pont javaslatai
   nem hajthatók végre.
3. **Fotós felhasználási jog:** a `SYL_*` sorozatra milyen jogot vásároltak?
4. **Fejléc-logó:** legyen-e a szöveges „Kineti**care**" wordmark helyett a valódi
   hullám-motívumos logó? Ez a kezdőlapot is érinti, ezért nem javaslom magamtól.
5. **Címsor-tracking:** bevezethetek-e egy `--kc-tracking-display: -0.02em` tokent
   csak a `--kc-text-3xl` fölötti lépcsőkre és csak új szekciókra, vagy a
   kezdőlappal való vizuális egység miatt maradjon a mostani `+0.01em`?
6. **Létrejöjjön-e a `/rendeloi-kezelesek` oldal?** Az egész technika-fotótár
   (2.2) csak akkor talál helyet, ha ez az oldal visszakerül — ma nincs meg az új
   site-on, és a `/szolgaltatasok` csak szövegben említi ezeket a terápiákat.
