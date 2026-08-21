# Tudástár: a Kineticare hangja és a cikk-bevitel technikája

> **Mi ez?** Két dolog egy helyen, a Tudástár-cikkeket író ügynököknek.
> Az **1. rész** azt írja le, hogyan beszél a Kineticare és a két gyógytornász:
> nem ízlés szerint, hanem a repóban ténylegesen élő vevői szövegekből
> visszafejtve és megszámolva. A **2. rész** azt írja le, pontosan hogyan kerül
> egy cikk a rendszerbe: mezők, adatszerkezet, publikálás, buktatók, és egy
> másolható példa.
>
> **Készült:** 2026-08-21 · **Módszer:** a repó vevői szövegeinek és a
> `posts` adatútjának végigolvasása, plusz mérés (mondathossz, gondolatjel-
> sűrűség, szógyakoriság; a számoló parancsok a 1.4 és a 1.8 szakaszban).
> **Ez a dokumentum leltár és útmutató, kódot nem módosít.**
>
> **Kötelező háttér:** `docs/kulcsszavak.md` (mit írjunk),
> `docs/vevohang-es-hirdetesszoveg.md` (milyen szavakkal),
> `docs/seo-geo-llm.md` 2. fejezet (cikk-checklist),
> `docs/ui-sztenderdek.md` §3.1 (magyar mikroszöveg), `CLAUDE.md` (TILOS ZÓNÁK).

---

## 0. A három forrás, amiből a hang visszafejthető

| Forrás | Mit ad | Hol |
|---|---|---|
| A régi kineticare.hu visszaépített szövege | a kezdőlap, a `/szolgaltatasok` és a `/rolunk` teljes, betűhív szövege, a két termék teljes sales-leírása, 14 valós páciensvélemény | `src/scripts/restore-legacy-content.ts` |
| A kezdőlap szekció-szövegei | hero, hitel-csík, USP-k, „Így működik”, GYIK, záró CTA | `src/lib/home-seed.ts` |
| A két szakmai önéletrajz | végzettség, tanfolyamok, publikációk, konferenciák, médiamegjelenések | `src/scripts/restore-legacy-content.ts` (`ROLUNK_ONELETRAJZOK`, 838. sortól) |

A `docs/legacy/html/` mappa **nem** használható hangforrásnak: egyetlen fájl van
benne (`typ-kezrehab.html`, a köszönőoldal), és abban összesen két mondatnyi
vevői szöveg áll. A régi oldal szöveges anyaga már át van emelve a fenti két
TypeScript-forrásba, tehát ott kell olvasni.

---

# 1. rész: a Kineticare hangja

## 1.1 Ki beszél

Két ember, mindig **többes szám első személyben**: Kocsis Kata és Kiss Kata.
Sosem „a Kineticare csapata”, sosem személytelen intézmény. A bemutatkozás
saját szava:

> „Kiss Kata és Kocsis Kata vagyunk, gyógytornászok, manuálterapeuták és
> sportrehabilitációs trénerek, és évek óta elsősorban a kéz rehabilitációjával
> foglalkozunk.”

A cikkekben ez azt jelenti: a szerző a két gyógytornász, a szöveg „mi”-t mond
(„a praxisunkban azt látjuk”, „megmutatjuk”, „nem javasoljuk”), és a
`posts.author` mezőben is nevesített ember áll, nem a márka.

**Titulusok, betűhíven** (ezektől eltérni nem szabad):

- **Kocsis Kata**: gyógytornász, sportrehabilitációs tréner, gyógy- és sportmasszőr.
- **Kiss Kata**: gyógytornász, manuálterapeuta, sportrehabilitációs tréner.

## 1.2 Megszólítás: tegezés, mindig

A vevői szövegben **egyetlen magázó alak sincs** (mért: 0 találat az „Ön”
alakra a 275 vevői szövegdarabban). A tegezés végig E/2, és a szöveg
feltűnően sokat beszél a *te* kezedről: a „kezed” szó a leggyakoribb tartalmas
szó az egész mintában (26 előfordulás).

A gombok nyelvtani személye ettől külön szabály: a látogató saját, elkötelező
cselekvését kimondó gomb E/1 („Megveszem a kurzust”), a puszta navigáció E/2
(„Nézd meg a kurzusokat”), a magyarázó és útmutató szöveg mindig tegez.
Részletesen: `docs/ui-sztenderdek.md` §3.2, P-1 szabály.

## 1.3 Jellemző fordulatok

Ezek a szövegben ténylegesen szereplő, jellegadó alakok. Nyugodtan
újrahasznosíthatók, mert a márka saját hangjából valók.

**Az együttérzés nyitó formulái**

- „Tudjuk, milyen, amikor:”
- „Tudjuk, milyen kiszolgáltatott érzés az, amikor…”
- „Ha eleged van abból, hogy…”
- „Ha te is szeretnéd, hogy végre…”
- „…akkor a legjobb helyen vagy, és szívesen segítünk.”

**Az ígéret formulái** (mindig feltételes vagy segítő, sosem garanciális)

- „Mozgásterápiás módszerekkel tudunk abban segíteni, hogy…”
- „…hogy újra élvezhesd a munkát, a sportot és a hétköznapi teendőket.”
- „Van megoldás, ha tudod, merre indulj.”
- „A cél: egy olyan stabil, teherbíró kéz, ami hosszú távon bírja a strapát.”

**A szakmai önmeghatározás formulái**

- „A legújabb kutatásokat, külföldi guideline-okat és a saját gyakorlati
  tapasztalatainkat ötvözzük.”
- „Folyamatosan figyeljük a külföldi és hazai szakmai protokollokat.”
- „Nem hiszünk a gyors, felületes megoldásokban.”
- „Nem csak a tüneteket kezeljük. Megtaláljuk a probléma gyökerét.”

**A képek, amikkel a testről beszélnek**

- „a test egy csodálatos »szerkezet«: ha segítünk neki, képes rendbehozni magát”
- „a kezed nemcsak egy testrész: mindenhez szükséged van rá”
- „Ez a te összekötő kapcsod a világgal.”

**Amit önironikusan megengednek maguknak** (ritkán, de van, és ez teszi emberivé)

- „Úgy fogyasztjuk a kézrehabilitációval kapcsolatos legújabb szakmai anyagokat
  és technikákat, mint a legizgalmasabb sorozatot.”
- „hogyan segíthet a reggeli kávézás a vállad és a könyököd átmozgatásában?”

## 1.4 Mondathossz és bekezdéshossz: mért adat

Minta: a `src/scripts/restore-legacy-content.ts` és a `src/lib/home-seed.ts`
kódkommentek nélküli, vevőnek szóló szövegdarabjai. **275 szövegdarab,
4910 szó, 379 mondat.**

| Mérés | Érték |
|---|---:|
| Átlagos mondathossz | **12,9 szó** |
| Medián mondathossz | 12 szó |
| Alsó és felső kvartilis | 8 és 17 szó |
| Leghosszabb mondat | 37 szó |
| A mondatok aránya, ami legfeljebb 15 szó | **68,3%** |
| A mondatok aránya, ami legfeljebb 20 szó | 85,0% |
| A mondatok aránya, ami 30 szónál hosszabb | 0,5% |
| Átlagos bekezdéshossz | 17,9 szó (medián 15) |

**Amit ez előír a cikkekre:** a mondat célértéke 12 szó körül, a kétharmada
maradjon 15 szó alatt, 30 szó fölé pedig gyakorlatilag ne menj. A bekezdés
rövid: egy vagy két mondat, ritkán három. Ez egybevág a
`docs/seo-geo-llm.md` 2.1 pontjával is („rövid bekezdések, 2–4 mondat, egy
gondolat”), mert az AI-kivonatolás bekezdésenként dolgozik.

Az újramérés parancsa (a repó gyökeréből futtatva) a doksi végén, a
`Függelék: a mérések` szakaszban áll.

## 1.5 Mit ígérnek, és mit NEM

Ez a legfontosabb szakasz, mert itt a két gyógytornász szakmai renoméja a tét.

**Amit kimondanak**

- Segítséget és módszert: „tudunk abban segíteni”, „megmutatjuk”, „megtanítunk”.
- Naprakészséget: külföldi guideline, protokoll, kutatás.
- Személyre szabást: „figyelembe vesszük a te szokásaidat, terhelésedet”.
- Tartósságot mint **célt**, nem mint garanciát: „arra törekszünk, hogy ne is
  térjen vissza”.
- Konkrét, ellenőrizhető mennyiséget: „4 modulnyi videóanyag”, „50+ videós
  gyakorlat”, „5 perces miniblokkok”, „napi 10–15 perc is elég”.

**Amit soha nem mondanak ki**

| Tiltás | Miért |
|---|---|
| Gyógyulási arány, gyógyulási idő, „meggyógyítjuk” | A mért vevőhang szerint pont ez ütött vissza a versenytársnál: *„Meggyőzött a honlapon a 80-20%-os gyógyulási információ. Nos ezt felejtsük el.”* (`docs/vevohang-es-hirdetesszoveg.md` 4. szakasz) |
| Diagnózis | A cikk nem orvosi vizsgálat. A meglévő szöveg is így fogalmaz: „milyen tünetek esetén fordulj szakemberhez (és melyikhez)”. |
| Kitalált statisztika | Élő eset a repóban: az „5000+ elégedett páciens” sehonnan nem volt igazolható, ezért „1000+”-ra javították (`src/scripts/apply-owner-content.ts`, 2. javítás). Az igazolható alak a régi oldalról: „több mint ezer embernek segítettünk már”. |
| Kitalált vélemény | `docs/seo-geo-llm.md`: a fiktív testimonial fogyasztóvédelmi okból tilos, és AI-láthatóságban is visszaüt. |
| Sürgetés, visszaszámláló, hamis kedvezmény | `docs/ui-sztenderdek.md`: dark pattern tilos. |

**A meglévő szöveg óvatossági fordulatai**, amiket a cikkekben is használni kell:

- „A kurzusok általános rehabilitációs programok. Műtét után mindig a
  kezelőorvosod vagy gyógytornászod jóváhagyásával kezdj bele.”
- „Nem kell, hogy fájjanak. […] éles fájdalom esetén hagyd abba, és kérj
  szakmai segítséget.”
- „(A kurzus nem helyettesíti a szakorvosi kontrollt.)”
- Egy egész „Nem javasoljuk a programot, ha…” szakasz, hat ellenjavallattal.
  Ez a szemlélet a cikkekbe is átemelendő: **mondd meg, mikor NE csinálja.**

**Kötelező lektorálási sáv.** A feladatkiírás szerint minden cikk tetejére
kerül, hogy a szöveg LEKTORÁLANDÓ VÁZLAT, és a két gyógytornász szakmai
jóváhagyása előtt nem publikálható. Technikailag ez azt jelenti, hogy a
cikk `status`/`_status` mezője **`draft`** marad (2.5 szakasz), a jelzést pedig
a cikk első bekezdése is kimondja.

## 1.6 Hogyan beszélnek a betegről

- **„Páciens”, nem „beteg”.** A mintában 9 előfordulás a `páciens` tövön, a
  „beteg” szó vevői szövegben nem szerepel.
- **A vevő szavaival.** A mért vevőhang szerint a magyar beteg „**kezelést**”
  keres (209 említés) és „**alkalmakban**” gondolkodik (91 említés), nem
  „terápiás protokollban” és nem „rehabilitációs programban”. A repó szövege
  ezt már követi: „50 perces alkalom”, „Az első alkalom minden esetben 50
  perces vizsgálatot foglal magába”.
- **A panasz a beteg szavaival, az ok a szakma szavaival.** A cím és a nyitás a
  helyzetet mondja ki („Zsibbad a kezed éjszaka?”), a törzs viszont pontos
  szakkifejezést használ, kifejtve („kéztőalagút-szindróma”).
- **Sosem hibáztat.** A szöveg a helyzetet ismeri el, nem a beteget okolja:
  „Egyre több kenőcsöt, borogatást és »csodaszert« halmozol fel, de a fájdalom
  újra és újra jelentkezik.”
- **Névvel és foglalkozással idéz.** Minden vélemény alatt ott a név és a
  foglalkozás: „– Kállai Dóra, biológus”, „– Konda Boglárka, vízilabdázó”.
  Új idézetet kitalálni tilos; a meglévő 14 valós vélemény a
  `testimonials` collectionben él.

## 1.7 Szakmai hitelesítő elemek: mi az, ami IGAZOLHATÓ

Ezek a repóban rögzített, ellenőrizhető állítások. Cikkben csak ezek
használhatók hitelesítőként, és pontosan ebben az alakban.

**Végzettség**

- Kocsis Kata: Pécsi Tudományegyetem Egészségtudományi Kar, Ápolás és
  Betegellátás alapképzési szak, gyógytornász szakirány; gyógy- és
  sportmasszőr (54-726-01).
- Kiss Kata: Semmelweis Egyetem Egészségtudományi Kar, Ápolás és Betegellátás
  alapképzési szak, gyógytornász szakirány; Holisztikus Medicina Alapítvány,
  Barvicsenko-féle manuálterapeuta képzés.

**Akkreditáció**

- „Bevezetés a kéz, a csukló- és könyökízület rehabilitációs lehetőségeibe”
  akkreditált tantermi képzés, a ProBody Stúdióval együttműködve.
  **12 kreditpont, SZTK-A-33553/2024.** Mindkét gyógytornász instruktor
  (2024, 2025, 2026, Budapest).

**Szakmai szervezetek**

- Magyar Sportrehabilitációs Egyesület, Magyar Gyógytornász-Fizioterapeuták
  Társasága (MGYFT).

**Oktatói és konferencia-szerep**

- Magyar Kézsebész Társaság 29. kongresszusa, kézsebészeti skill tréning,
  instruktor (2023, Székesfehérvár).
- Akkreditált Oftex kurzus: „Ínvarratok és határterületek a kézsebészeti
  ellátásban”, instruktor (2023, Budapest).
- Magyar Sportrehabilitációs Konferencia (2025, Budapest), két önálló előadás.
- „A Semmelweis Egyetemen a jövő gyógytornászai az egyetemi képzésükön többek
  között a mi anyagunkból is tanulnak.”

**Publikáció** (Kocsis Kata, társszerzőkkel)

- Kocsis, K., Szalay, B., Békési, Á., Király, B. (2022). *Thoracalis
  gerincszakasz elváltozásai és az impingement szindróma összevetése a
  különböző korosztályokban játszó röplabdások körében.* Fizioterápia, 31(2),
  3–10.
- Kocsis, K., Ács, P., Boncz, I., Molics, B., Király, B. (2022). *Comparison
  between thoracic spine deformities and impingement syndrome among volleyball
  players in different age groups.* Value in Health Journal, POSB337.

**Kézterápiás továbbképzések**, amikre kézzel kapcsolatos cikknél érdemes
hivatkozni (mindkét gyógytornász elvégezte, 2024): Kate Thorn CHT (AHTA)
distalis radius törés, flexor- és extensor-ín sérülés, De Quervain kurzusai;
Loren Szmiga CHT carpal tunnel és trigger finger kurzusai; Daphne Xuan MPT
„Functional Anatomy of the Hand”.

**Médiamegjelenés** (a `/rolunk` oldalon 14 tétel; témalistának és
hivatkozásnak is jó): Nők Lapja, Nők Lapja Évszakok, Képmás, Szimpatika,
Házipatika, Egészség Kalauz, Karc FM, Secret Medical Podcast.

> **Figyelem.** A továbbképzés, a konferencia és a médiamegjelenés a SZERZŐ
> hitelességét igazolja, nem a klinikai állítást. Klinikai állítás mellé a
> feladatkiírás szerint külön, ellenőrizhető forrás kell (hivatalos irányelv,
> szakmai szervezet, lektorált közlemény), szerzővel, címmel, URL-lel és a
> hozzáférés dátumával.

## 1.8 Írásjelek és tipográfia: mért állapot és a szabály

A `docs/ui-sztenderdek.md` §3.1 szabálya: magyar szövegben **kvirtmínusz
(—, U+2014) nem használható**, a gondolatjel az en dash (–, U+2013), szóközök
között, és folyószövegben legfeljebb **1 gondolatjel 200 szavanként**
(= 5 db / 1000 szó).

**A mérés viszont azt mutatja, hogy a régi, örökölt szöveg ezt bőven túllépi:**

| Szövegtípus | Szó | Gondolatjel | Sűrűség | A korlát |
|---|---:|---:|---:|---:|
| Folyószöveg (`para(...)` bekezdések) | 1209 | 16 | **13,2 / 1000 szó** | 5,0 |
| Felsorolás-tételek (`bulletList`) | 776 | 20 | **25,8 / 1000 szó** | 5,0 |
| Teljes vevői minta | 4910 | 100 (87 en + 13 em) | 20,4 / 1000 szó | 5,0 |

**Következtetés a cikkíróknak: a hangot vedd át, a gondolatjel-szokást NE.**
A régi szöveg 2,6-szeresen (folyószöveg), illetve 5,2-szeresen (felsorolás)
lépi túl a saját sztenderdünket, és 13 helyen kvirtmínuszt is használ, ami
magyar szövegben egyszerűen hibás. Az új cikkekben:

- gondolatjel helyett **vessző** (közbevetés), **kettőspont** (magyarázat,
  felsorolás bevezetése), **pont** (két önálló állítás) vagy **zárójel**;
- felsorolás-tételben „címke – magyarázat” helyett **kettőspont**;
- kvirtmínusz (—) sehol;
- idézőjel a magyar alsó-felső pár: **„ ”** (a repó szövege ezt következetesen
  használja, 15 nyitó és 15 záró előfordulás a mintában);
- nagykötőjel (–, szóköz nélkül) marad a helyén: `2020–2024`, `napi 10–15 perc`,
  `csukló- és könyökízület`.

## 1.9 Cikk-checklist a hangra

Mielőtt egy cikk elmegy a vezetőhöz, ezek mindegyike igaz kell legyen.

- [ ] Tegező, E/2, végig. Magázás nulla.
- [ ] „Mi” a szerző, nevesítve; a szerző titulusa a betűhív alak (1.1).
- [ ] Átlagos mondathossz 15 szó alatt, a mondatok kétharmada 15 szó alatt.
- [ ] Bekezdés 1–3 mondat.
- [ ] Nincs gyógyulási arány, gyógyulási idő, diagnózis, garancia.
- [ ] Van „mikor NE csináld” és „mikor fordulj szakemberhez” szakasz.
- [ ] Minden klinikai állítás mellett forrás: szerző/kiadó, cím, URL, dátum.
- [ ] Nincs kitalált szám, nincs kitalált vélemény.
- [ ] Gondolatjel-sűrűség 5 / 1000 szó alatt, kvirtmínusz nulla.
- [ ] Idézőjel „ ” alakban.
- [ ] A vevő szavai szerepelnek: „kezelés”, „alkalom”, „fájdalom”, „gyakorlatok”.
- [ ] Kérdés-alapú alcímek, és az alcím alatti első mondat megadja a választ
      (`docs/seo-geo-llm.md` 2.1).
- [ ] A cikk tetején ott a lektorálandó-vázlat jelzés, és a rekord `draft`.

---

# 2. rész: hogyan kerül cikk a rendszerbe

## 2.1 Az adatút, végpontról végpontra

```
Payload admin (Tartalom → Blogbejegyzések)   VAGY   seed-script (payload.create)
                          │
                          ▼
              posts collection (PostgreSQL)
      src/collections/Posts.ts  ·  drafts + autosave
                          │
   beforeChange hookok:  syncStatusFromDraftStatus → setPublishedAtOnFirstPublish
                          │
                          ▼
              src/lib/cms.ts lekérdezései
   getPosts · getPostBySlug · getLatestPosts · getRelatedPosts
   (mind: where status=published, draft:false, overrideAccess:true)
                          │
        ┌─────────────────┼──────────────────────┬───────────────────┐
        ▼                 ▼                      ▼                   ▼
   /blog (lista)   /blog/[slug]        /blog/kategoria/[slug]    kezdőlap
   PostCard        PostView →                CategoryFilter      knowledge blokk
                   RichText → serialize.tsx                      (3 legfrissebb)
                          │
                          ▼
                    /sitemap.xml  (src/app/sitemap.ts)
```

Fájlok:

- Collection: `src/collections/Posts.ts`
- Kategóriák: `src/collections/Categories.ts`
- Lekérdezések: `src/lib/cms.ts`
- Útvonalak: `src/app/(frontend)/blog/page.tsx`,
  `src/app/(frontend)/blog/[slug]/page.tsx`,
  `src/app/(frontend)/blog/kategoria/[slug]/page.tsx`
- Megjelenítés: `src/components/content/PostView.tsx`,
  `src/components/content/PostCard.tsx`,
  `src/components/lexical/RichText.tsx`, `src/components/lexical/serialize.tsx`
- SEO: `src/lib/seo.ts` (`buildPageMetadata`, `articleJsonLd`, `breadcrumbJsonLd`)
- Sitemap: `src/app/sitemap.ts`
- Jogosultság: `src/access/policies.ts` (`posts.read = publishedOrAdmin`)

## 2.2 A `posts` collection mezői

Forrás: `src/collections/Posts.ts` és a generált típus
(`src/payload-types.ts`, `export interface Post`).

| Mező | Típus | Kötelező | Mire való |
|---|---|:--:|---|
| `title` | text | **igen** | A cikk címe. Ez a `<h1>`, és ez megy a Google-be, ha nincs `seoTitle`. |
| `slug` | text, unique | **igen** | Webcím. `beforeValidate` hook a `title`-ből generálja, ha üres; ha megadod, akkor is átmegy a `slugify`-on (`src/lib/slugify.ts`: ékezet le, kisbetű, kötőjel). |
| `excerpt` | textarea | nem | Rövid ajánló. A `PostCard` kártyáján és a meta-leírásban is ez látszik, ha nincs `seoDescription`. |
| `content` | richText (Lexical) | **igen** | A cikk törzse. Adatszerkezet: 2.6. |
| `heroImage` | upload → `media` | nem | Borítókép. A `PostCard`-on `sm`, a cikkfejben `lg` méret. |
| `seoTitle` | text | nem | Ha üres, a `title` megy a `<title>`-be. |
| `seoDescription` | text | nem | Ha üres, az `excerpt`. Kb. 150 karakter. |
| `ogImage` | upload → `media` | nem | Megosztási kép. Ha üres, a `heroImage` og-mérete a tartalék. |
| `status` | select `draft`/`published` | **igen** (default `draft`) | A nyilvános szűrő mezője. **Az adminban rejtett**, hook tölti. Lásd 2.5. |
| `publishedAt` | date | nem | Az első közzétételkor hook tölti. A bloglista `-publishedAt` szerint rendez. |
| `order` | number | nem | Lista- és menürendezéshez. A bloglista ma nem használja. |
| `author` | relationship → `users` | nem | Alapból a bejelentkezett szerkesztő. A `PostView` a `name` mezőt írja ki, és az `Article` JSON-LD `author.name`-je is ez. |
| `categories` | relationship → `categories`, hasMany | nem | Több is lehet. A kategória-szűrés és a kapcsolódó cikkek is ezen mennek. |
| `relatedPosts` | relationship → `posts`, hasMany, **maxRows 3** | nem | Kézi ajánló a cikk alján. Ha nincs, a route a kategória alapján tölti (`getRelatedPosts`). |
| `_status` | Payload natív (drafts) | rendszer | A Piszkozat/Közzététel gomb mezője. Lásd 2.5. |

**Amiről a felület gondoskodik magától:** olvasási idő (a tartalom szavaiból
számolva, 200 szó/perc, `src/lib/reading-time.ts`), morzsa és `Article`
JSON-LD (`PostView`), kanonikus cím és Open Graph (`buildPageMetadata`).
Ezekhez nincs mező, és nem is kell.

## 2.3 Kategóriák

`src/collections/Categories.ts`. Mezők: `title` (kötelező), `slug`
(auto, unique), `type` (`content` = blogkategória, `product` = kurzuskategória),
`parent` (opcionális fölérendelt kategória).

**A `type: 'content'` kötelező a blog-kategóriáknál.** A
`getContentCategories()` és a `getCategoryBySlug()` is szűr rá; `type` nélküli
kategória nem jelenik meg a Tudástár szűrőjében, és a `/blog/kategoria/<slug>`
oldala 404-et ad.

Ma a repóban **egyetlen** content-kategória keletkezik seedből:
„Tudástár” (`tudastar`), a `src/scripts/seed.ts` 336–339. sora. A
`docs/kulcsszavak.md` 4. pontjának nyolc cikke ennél finomabb bontást
igényel; a kategóriákat tehát a cikkírás előtt kell eldönteni. A szerkesztői
útmutató tanácsa: „kevés, jól elkülönülő kategória hasznosabb, mint húsz,
amiből mindegyikben egy cikk van.”

Két viselkedés, amit tudni kell:

- **Üres kategória-oldal** `noindex, follow` jelzést kap, és nem kerül a
  sitemapbe (`src/lib/tudastar.ts` `categoriesWithPosts`). Az első cikk
  megjelenésekor magától visszavált. Vagyis kategóriát létrehozni cikk nélkül
  nem kártékony, csak addig láthatatlan.
- **A `?kategoria=` szűrés kanonikus címe** a dedikált
  `/blog/kategoria/<slug>` oldal, nem a `/blog?kategoria=…`.

## 2.4 A cikk publikálásának két útja

**A) Adminból, kézzel.** Lépésről lépésre leírva:
`docs/szerkesztoi-utmutato.md` 4. szakasz. Ez a lányok útja.

**B) Seed-scriptből.** Ez az ügynökök útja, ha egyszerre több cikk kerül be.
A repó három bevált mintája:

| Script | Kapu | Mit tanulunk belőle |
|---|---|---|
| `src/scripts/seed.ts` | `SEED_SCOPE`, éles-védelem | a legegyszerűbb „létezik-e már, ha nem, hozd létre” minta |
| `src/scripts/restore-legacy-content.ts` | `LEGACY_RESTORE_CONFIRM=igen` (alap: dry-run), `LEGACY_OVERWRITE` | próbafutás alapértelmezésként, összesítő napló, Lexical-építők |
| `src/scripts/apply-owner-content.ts` | `OWNER_CONTENT_CONFIRM=igen` | csak pontos egyezésnél ír, szerkesztői munkát sosem ír felül |

A közös szabályok, amiket egy cikk-seednek is tartania kell:

1. **Alapértelmezés a próbafutás.** Írni csak kifejezett környezeti változóval
   lehessen. Az éles adatbázison a felülírás visszavonhatatlan.
2. **Idempotencia `slug` alapján.** Létezőt ne duplikálj, és ne írj felül.
3. **`overrideAccess: true`** minden `payload.find` és `payload.create`
   hívásban (a script nincs bejelentkezve).
4. **Naplózás a `payload.logger`-rel vagy a `src/lib/logger.ts`-szel.**
   `console.log` tilos (`CLAUDE.md`).
5. **Indítás-kapu a fájl végén**, hogy a modul importálva mellékhatás nélkül
   töltődjön (`restore-legacy-content.ts` mintája):
   ```ts
   if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
     futtat().then(() => process.exit(0)).catch(() => process.exit(1))
   }
   ```
6. **`package.json` script + Railway job-fájl**, ha élesben is futnia kell.
   Minta: `railway.content-job.json`. A Railway-en a config-fájl mindig
   felülírja a dashboard beállítást, ezért dedikált fájl kell
   (`CLAUDE.md`, 2. üzemeltetési tanulság).

## 2.5 A publikálási csapda: `status` ÉS `_status`

Ez a leggyakoribb hiba, és némán rontja el a cikket.

A `posts` collectionnek **két** publikáltsági jelzése van:

- `_status`: a Payload natív drafts-mezője (a Piszkozat/Közzététel gomb),
- `status`: a saját select, amire a nyilvános szűrők futnak
  (`publishedOrAdmin` access, `PUBLISHED_WHERE` a `cms.ts`-ben, a sitemap,
  a `PostCard`, a `PostView` kapcsolódó listája).

A `syncStatusFromDraftStatus` beforeChange hook **mindig felülírja** a
`status`-t a `_status`-ból (`src/lib/publish-status.ts`):

```ts
data.status = resolveDraftStatus(data, originalDoc)  // data._status → originalDoc._status → 'draft'
```

**Következmény:** ha a seedben csak `status: 'published'`-öt adsz meg,
`_status` nélkül, a hook visszaírja `draft`-ra, és a cikk sehol nem látszik.
**Mindkettőt meg kell adni.** A `seed.ts` 392. sorának kommentje pontosan
ezt rögzíti.

A `setPublishedAtOnFirstPublish` hook az első közzétételkor tölti a
`publishedAt`-ot, meglévő értéket sosem ír felül. Ha a cikkeknek szánt,
determinisztikus dátumot akarsz, add meg kézzel.

**A Tudástár-cikkeknél a helyes állapot a `draft`**, amíg a két gyógytornász
nem lektorálta. Piszkozatként a cikk az adminban és a szerkesztői előnézetben
(`/next/preview`) látszik, a nyilvános oldalon nem.

## 2.6 A `content` mező: Lexical adatszerkezet

A szerkesztő a `payload.config.ts` alap `lexicalEditor()`-jával fut, plusz
`FixedToolbarFeature` (604–605. sor). A **default feature-készlet**
(`defaultEditorFeatures`) ezt tartalmazza: bold, italic, underline,
strikethrough, subscript, superscript, inline code, paragraph, heading, align,
indent, unordered list, ordered list, checklist, link, relationship,
blockquote, upload, horizontal rule, inline toolbar.

**Táblázat NINCS benne.** Sem a szerkesztőben, sem a serializerben. Ha
táblázatos adatot akarsz közölni, az felsorolás vagy alcím + bekezdés lesz.
Ez a `docs/seo-geo-llm.md` 2.1 pontjának („táblázatok HTML-ben, soha képként”)
gyakorlati korlátja, és kép mint táblázat továbbra is tilos.

**Amit a storefront-serializer (`src/components/lexical/serialize.tsx`)
ténylegesen kirajzol:**

| Lexical csomópont | HTML | Megjegyzés |
|---|---|---|
| `paragraph` | `<p>` | **Kivétel:** ha a bekezdés egyetlen „jelentős” gyermeke egy `link`, akkor **elsődleges gombot** renderel (`kc-button kc-button--primary`), vagy ha az URL YouTube/Vimeo, **videó-beágyazást**. |
| `heading` `tag: h2..h6` | `<h2>`…`<h6>` | A `h1` szándékosan `h2`-re lágyul (oldalanként egy h1: a cím). |
| `list` `listType: bullet` | `<ul>` | |
| `list` `listType: number` | `<ol>` | |
| `list` `listType: check` | `<ul class="kc-richtext__exercise-list">` | Ez a **gyakorlatlista** megjelenítője. Kézrehab-cikkeknél ez a natív forma egy gyakorlatsorra. |
| `listitem` | `<li>` | `checked: boolean` esetén állapot-osztályt kap. |
| `quote` | `<blockquote>` | |
| `horizontalrule` | `<hr>` | |
| `link` | belső `next/link` vagy külső `<a>` | Külső URL allowlist-szűrésen megy át (`src/lib/safe-url.ts`); tiltott sémánál a link szövege href nélkül marad. |
| `upload` (relationTo: media) | `<figure>` + `next/image` | Az `alt` a Media rekordból jön, ott kötelező. |
| `text` | `strong`/`em`/`s`/`u`/`code`/`sub`/`sup` | Bitmaszk: bold 1, italic 2, strikethrough 4, underline 8, code 16, subscript 32, superscript 64. |
| `relationship`, `block`, ismeretlen | semmi | Fejlesztői módban `console.warn`, a gyerekek renderelődnek. Nem hasal el. |

**Három csapda, ami cikknél tényleg elő fog jönni:**

1. **A magában álló link gombbá válik.** Egy forráshivatkozás, ami saját
   bekezdésben áll, nagy narancssárga elsődleges gombként fog megjelenni.
   Megoldás: a hivatkozás mondatba ágyazva (legyen szöveg előtte vagy utána),
   vagy felsorolás-tételen belül.
2. **YouTube- és Vimeo-link beágyazódik.** Ha egy önálló bekezdésben álló link
   YouTube/Vimeo címre mutat, iframe lesz belőle. Ez szándék szerint jó
   (nyilvános előzetes), de véletlenül meglepetés.
3. **A `bulletList` segéd csak sima szöveget vesz.** Linket tartalmazó
   felsorolás-tételhez saját `listitem`-et kell építeni (lásd lentebb).

## 2.7 A csomópont-építők: mi van készen, mi nincs

Helyük: `src/scripts/restore-legacy-content.ts`, 159–245. sor (a `richText` gyökér-építő a 236. soron). Az import
mellékhatás-mentes (indítás-kapu a fájl végén); pontosan így használja őket a
`src/lib/legal-content.ts` is.

**Exportált** (közvetlenül importálható):

```ts
import {
  richText,     // (children: BlockNode[]) => RichTextContent   – a gyökér
  para,         // (text: string) => BlockNode                  – <p>
  paragraph,    // (children: BlockNode[]) => BlockNode          – vegyes tartalmú <p>
  heading,      // (tag: 'h2' | 'h3', text: string) => BlockNode
  bulletList,   // (items: string[]) => BlockNode                – <ul>
  textNode,     // (text: string, format = 0) => BlockNode
  type BlockNode,
  type RichTextContent,
} from '../scripts/restore-legacy-content'
```

**NEM exportált** (a fájlon belül privát): `link`, `cta`, `quote`.
**Nincs egyáltalán:** számozott lista, checklist (gyakorlatlista), `h4`+,
`horizontalrule`, `upload` építő.

Ezeket a cikk-seed vagy saját helyi segédekkel építi meg, vagy a vezető
dönt arról, hogy a `restore-legacy-content.ts`-ből exportáljuk-e őket
(nyitott kérdés, lásd a záró szakaszt). A hiányzó csomópontok pontos alakja,
hogy ne kelljen visszafejteni:

```ts
/** Link (a `fields.linkType: 'custom'` a szabadon megadott külső/belső webcím). */
const link = (url: string, label: string, newTab = false): BlockNode => ({
  type: 'link',
  fields: { linkType: 'custom', url, newTab },
  children: [textNode(label)],
  direction: null, format: '', indent: 0, version: 1,
})

/** Idézet. */
const quote = (text: string): BlockNode => ({
  type: 'quote',
  children: [para(text)],
  direction: null, format: '', indent: 0, version: 1,
})

/** Számozott lista. */
const numberedList = (items: string[]): BlockNode => ({
  type: 'list', listType: 'number', tag: 'ol', start: 1,
  children: items.map((item, index) => ({
    type: 'listitem', value: index + 1, children: [textNode(item)],
    direction: null, format: '', indent: 0, version: 1,
  })),
  direction: null, format: '', indent: 0, version: 1,
})

/** Gyakorlatlista (a serializer `kc-richtext__exercise-list` osztályt ad rá). */
const exerciseList = (items: string[]): BlockNode => ({
  type: 'list', listType: 'check', tag: 'ul', start: 1,
  children: items.map((item, index) => ({
    type: 'listitem', value: index + 1, checked: false,
    children: [textNode(item)],
    direction: null, format: '', indent: 0, version: 1,
  })),
  direction: null, format: '', indent: 0, version: 1,
})

/** Felsorolás-tétel VEGYES tartalommal (pl. forrás-link a tétel végén). */
const listItem = (children: BlockNode[], index: number): BlockNode => ({
  type: 'listitem', value: index + 1, children,
  direction: null, format: '', indent: 0, version: 1,
})

/** Vízszintes elválasztó. */
const hr = (): BlockNode => ({ type: 'horizontalrule', version: 1 })
```

Félkövér szöveg a bitmaszkkal: `textNode('fontos', 1)`. Dőlt: `textNode('x', 2)`.
Félkövér + dőlt: `textNode('x', 3)`.

## 2.8 SEO-mezők a `posts`-on

**Van SEO-mező**, három: `seoTitle`, `seoDescription`, `ogImage`. Pontosan
ugyanezek a nevek élnek a `pages` és a `products` collectionben is
(`docs/seo-geo-llm.md` 1. fejezet).

A tartaléklánc (`src/lib/seo.ts`):

- `title`: `seoTitle` → `title`
- `description`: `seoDescription` → `excerpt` → a keret-layout alap-leírása
- `og:image`: `ogImage` (og-méret) → `ogImage` (eredeti) → `heroImage`
  (og-méret) → `heroImage` (eredeti) → nincs og:image
- canonical: `/blog/<slug>`

Ami automatikusan generálódik, tehát nem kell mező hozzá:

- **`Article` JSON-LD** minden cikkoldalon: `headline`, `description`
  (az `excerpt`-ből), `inLanguage: 'hu-HU'`, `mainEntityOfPage`,
  `datePublished`, `dateModified`, `image`, `author.name` (a `posts.author`
  felhasználó neve, ennek hiányában „Kineticare”), `publisher`.
- **`BreadcrumbList`**: Tudástár → a cikk címe.
- **`Blog` + `BlogPosting`** a `/blog` listaoldalon, csak a ténylegesen
  megjelenített cikkekből.
- **Sitemap-sor**: minden published cikk `/blog/<slug>` címen, `updatedAt`
  lastModified értékkel.

**Amit a mezőknek kell hozniuk, és amit a szerzőnek kell kitöltenie:**
a `seoDescription` kb. 150 karakter, az `excerpt` pedig önmagában is megálló
1–3 mondat, mert az megy a kártyára, a `description`-be és a `BlogPosting`
sémába egyaránt. A `docs/kulcsszavak.md` szerinti elsődleges kifejezés a
`title`-ben és az `excerpt` első mondatában is legyen ott.

## 2.9 KONKRÉT, MÁSOLHATÓ PÉLDA: egy Post seed-objektum

Ez a példa a `docs/kulcsszavak.md` 4. pontjának 1. cikkét vázolja (a „kéz
zsibbadás” kifejezésre, ami a legnagyobb mért forgalmi potenciállal bír:
450 keresés, 2200 forgalmi potenciál). **A klinikai tartalom itt szándékosan
csonka és helykitöltő**: a valódi cikk minden állítása mellé forrás kell.
A szerkezet, a mezőnevek és a Lexical-alak viszont pontosak.

```ts
// src/scripts/seed-tudastar.ts  (vázlat)
import { pathToFileURL } from 'node:url'
import { getPayload, type Payload } from 'payload'

import {
  bulletList,
  heading,
  para,
  paragraph,
  richText,
  textNode,
  type BlockNode,
} from './restore-legacy-content'
import config from '../payload.config'

// --- helyi építők, amik a legacy-scriptből nem exportáltak (lásd 2.7) -------

const link = (url: string, label: string, newTab = true): BlockNode => ({
  type: 'link',
  fields: { linkType: 'custom', url, newTab },
  children: [textNode(label)],
  direction: null,
  format: '',
  indent: 0,
  version: 1,
})

/**
 * Forrás-sor: SZÁNDÉKOSAN mondatba ágyazva. Ha a link egyedül állna a
 * bekezdésben, a serializer elsődleges GOMBOT renderelne belőle
 * (src/components/lexical/serialize.tsx, renderParagraph → renderCta).
 */
const forras = (leiras: string, url: string, cimke: string, datum: string): BlockNode =>
  paragraph([
    textNode(`${leiras} `),
    link(url, cimke),
    textNode(` (hozzáférés: ${datum})`),
  ])

// --- a cikk ----------------------------------------------------------------

const CIKK = {
  title: 'Miért zsibbad a kezem?',
  slug: 'miert-zsibbad-a-kezem',
  excerpt:
    'A kézzsibbadás mögött legtöbbször idegi eredetű ok áll. Végigvesszük, mit ' +
    'jelentenek a különböző mintázatok, mit tehetsz otthon, és mikor érdemes ' +
    'szakemberhez fordulni.',
  seoTitle: 'Kéz zsibbadás: okok, otthoni teendők, mikor fordulj orvoshoz',
  seoDescription:
    'Miért zsibbad a kezed? Gyógytornászok összefoglalója a leggyakoribb ' +
    'okokról, az otthon végezhető gyakorlatokról és a figyelmeztető jelekről.',
  // A megjelenés dátuma determinisztikus: a hook csak ÜRES mezőt tölt ki.
  publishedAt: '2026-09-01T08:00:00.000Z',
  content: richText([
    // A lektorálási sáv MINDEN cikk első bekezdése, amíg a jóváhagyás nincs meg.
    para(
      'Ez a szöveg lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása ' +
        'előtt nem publikálható.',
    ),

    para(
      'A kézzsibbadás önmagában nem betegség, hanem tünet: azt jelzi, hogy egy ' +
        'ideg valahol nyomás vagy feszülés alatt van.',
    ),
    para(
      'A praxisunkban a leggyakrabban azzal érkeznek, hogy éjszaka ébrednek ' +
        'zsibbadó kézre, és reggelre elmúlik. Ennek a mintázatnak külön jelentése van.',
    ),

    heading('h2', 'Melyik ujjad zsibbad?'),
    para(
      'A zsibbadás helye megmutatja, melyik ideg érintett. Ez az első kérdés, ' +
        'amit a vizsgálaton is felteszünk.',
    ),
    bulletList([
      'Hüvelyk, mutató, középső ujj: leggyakrabban a csuklóban futó középideg érintett.',
      'Kisujj és gyűrűsujj kisujj felőli fele: a könyök felől érkező singideg.',
      'Az egész kéz, karral együtt: érdemes a nyaki gerincet is megnézni.',
    ]),
    // Klinikai állítás → forrás. A forrás mondatba ágyazva, nem önálló linkként.
    forras(
      'A kéztőalagút-szindróma tüneteiről és vizsgálatáról:',
      'https://pelda.hu/iranyelv',
      'a hivatalos szakmai irányelv',
      '2026-09-01',
    ),

    heading('h2', 'Mit tehetsz otthon?'),
    para(
      'Az alábbi gyakorlatok célja a terhelés csökkentése és az ideg szabad ' +
        'mozgásának visszaadása. Napi néhány perc is elég.',
    ),
    bulletList([
      'Csuklókímélő tartás gépeléskor: az alkar támasztva, a csukló egyenesen.',
      'Óránként egy rövid szünet, amiben kinyitod és ellazítod a kezed.',
      'Este a fájó terület melegítése, ha az enyhülést hoz.',
    ]),

    heading('h2', 'Mikor NE otthon próbálkozz?'),
    para('Ezekben az esetekben a gyakorlatok helyett szakemberhez fordulj:'),
    bulletList([
      'Ha az érzéskiesés állandósult, tehát már nem múlik el.',
      'Ha gyengül a szorítóerőd, vagy a tenyereden izomtömeg-vesztés látszik.',
      'Ha a zsibbadás sérülés vagy műtét után indult.',
    ]),
    para(
      'Ez a cikk nem helyettesíti a szakorvosi vizsgálatot, és nem alkalmas ' +
        'diagnózis felállítására.',
    ),

    heading('h2', 'Ha rendszerezett programot keresel'),
    // Belső hivatkozás mondatba ágyazva, hogy ne gombbá váljon.
    paragraph([
      textNode('A vezetett, otthon végezhető gyakorlatsort az '),
      link('/kurzusok', 'kurzusaink között', false),
      textNode(' találod meg.'),
    ]),
  ]),
} as const

async function seedTudastar(): Promise<void> {
  const payload = await getPayload({ config })

  // 1) Kategória (type: 'content' KÖTELEZŐ, különben nem látszik a Tudástárban).
  const kategoriaSlug = 'kez-es-csuklo'
  const meglevoKategoria = await payload.find({
    collection: 'categories',
    where: { slug: { equals: kategoriaSlug } },
    limit: 1,
    overrideAccess: true,
  })
  const kategoriaId =
    meglevoKategoria.docs[0]?.id ??
    (
      await payload.create({
        collection: 'categories',
        data: { title: 'Kéz és csukló', slug: kategoriaSlug, type: 'content' },
        overrideAccess: true,
      })
    ).id

  // 2) Szerző: nevesített gyógytornász, nem a márka (az Article JSON-LD is ezt viszi).
  const szerzo = await payload.find({
    collection: 'users',
    where: { name: { equals: 'Kiss Kata' } },
    limit: 1,
    overrideAccess: true,
  })
  const szerzoId = szerzo.docs[0]?.id

  // 3) Idempotencia SLUG alapján: létezőt nem duplikálunk és nem írunk felül.
  const meglevo = await payload.find({
    collection: 'posts',
    where: { slug: { equals: CIKK.slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (meglevo.docs.length > 0) {
    payload.logger.info(`Tudástár: a cikk már létezik (${CIKK.slug}), kihagyva.`)
    return
  }

  await payload.create({
    collection: 'posts',
    data: {
      title: CIKK.title,
      slug: CIKK.slug,
      excerpt: CIKK.excerpt,
      content: CIKK.content,
      seoTitle: CIKK.seoTitle,
      seoDescription: CIKK.seoDescription,
      publishedAt: CIKK.publishedAt,
      categories: [kategoriaId],
      ...(szerzoId !== undefined ? { author: szerzoId } : {}),

      // ═══ A PUBLIKÁLÁSI CSAPDA (lásd 2.5) ═══
      // A `status` mezőt a syncStatusFromDraftStatus hook MINDIG a `_status`-ból
      // írja felül. Ezért a kettőt EGYÜTT kell megadni; `_status` nélkül a
      // rekord piszkozat maradna, akkor is, ha a `status: 'published'` ott áll.
      //
      // A Tudástár-cikkek LEKTORÁLANDÓ VÁZLATKÉNT kerülnek be: mindkettő
      // 'draft'. A közzététel a két gyógytornász jóváhagyása UTÁN, az adminban
      // történik (Közzététel gomb), vagy itt, mindkét mező 'published'-re
      // állításával.
      status: 'draft',
      _status: 'draft',
    },
    overrideAccess: true,
  })
  payload.logger.info(`Tudástár: cikk létrehozva piszkozatként (${CIKK.slug}).`)
}

// Indítás-kapu: a modul importálva mellékhatás nélkül töltődik be.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedTudastar()
    .then(() => process.exit(0))
    .catch((error) => {
      // A hibát a Payload loggere írja ki; console.log tilos (CLAUDE.md).
      process.exitCode = 1
      throw error
    })
}
```

**Ami a példában szándékos, és nem díszítés:**

| Elem | Miért |
|---|---|
| `status` **és** `_status` együtt | A hook különben visszaírja `draft`-ra. 2.5. |
| `status: 'draft'` | A cikk lektorálandó vázlat, jóváhagyás előtt nem publikus. |
| `publishedAt` kézzel | A hook csak üres mezőt tölt, tehát a dátum determinisztikus marad. |
| `type: 'content'` a kategórián | Enélkül a cikk nem jelenik meg a Tudástár szűrőjében. |
| Idempotencia `slug`-ra | Kétszeri futás nem duplikál és nem ír felül. |
| `overrideAccess: true` mindenhol | A script nincs bejelentkezve. |
| Forrás- és belső link `paragraph([...])`-ban | Egyedül álló link **gombbá** válna. 2.6. |
| A lektorálási sáv az első bekezdés | A feladatkiírás 4. pontja. |
| „Mikor NE otthon próbálkozz?” szakasz | A meglévő termékleírás szemlélete: az ellenjavallat kimondása. 1.5. |
| Nevesített szerző | E-E-A-T és az `Article` JSON-LD `author.name`-je. |

## 2.10 Ellenőrzés: honnan tudod, hogy tényleg bekerült

1. **Admin:** Tartalom → Blogbejegyzések, a cikk ott van, az állapota
   Piszkozat.
2. **Előnézet:** a rekord jobb felső előnézet-ikonja (draft mode); a
   `/blog/<slug>` publikusan még 404, ez így helyes.
3. **Közzététel után:** `/blog` listán kártya, `/blog/<slug>` oldal,
   `/blog/kategoria/<kategória-slug>` listán is szerepel, és a
   `/sitemap.xml` tartalmazza a `/blog/<slug>` sort.
4. **Strukturált adat:** az oldal forrásában két `application/ld+json` blokk
   (`Article` és `BreadcrumbList`).
5. **Kezdőlap:** a 3 legfrissebb published cikk megjelenik a `knowledge`
   szekcióban.
6. **Renderelés:** ha a fejlesztői konzolon
   `[lexical] Ismeretlen csomópont-típus: …` figyelmeztetést látsz, a
   tartalomban olyan csomópont van, amit a serializer nem rajzol ki (2.6).

## 2.11 Tilalmak, amik a cikkírásra is vonatkoznak

`CLAUDE.md` TILOS ZÓNÁK és a feladatkiírás alapján:

- `any` típus tilos; `unknown` + típusszűkítés a megoldás.
- Titok, `.env*` fájl, kulcs, token sehol.
- Migrációt kézzel írni vagy módosítani tilos. **A cikk-bevitel nem igényel
  migrációt:** a `posts` és a `categories` séma kész.
- `confirmOrder` tilos.
- `console.log` tilos; a napló a `src/lib/logger.ts` vagy a `payload.logger`.
- Személyes adat sehova. A cikkekben szereplő páciensvélemény csak a meglévő,
  valós, már közölt 14 vélemény lehet.
- Csak a rád bízott fájlokhoz nyúlj; párhuzamosan más csapatok dolgoznak.

---

## Nyitott kérdések a vezetőnek

1. **Exportáljuk-e a hiányzó Lexical-építőket?** A `link`, `quote`,
   számozott lista, gyakorlatlista (`listType: 'check'`) és a vegyes tartalmú
   `listitem` ma nincs közös helyen. Két út van: (a) a
   `src/scripts/restore-legacy-content.ts`-ből exportáljuk őket is, ahogy a
   `legal-content.ts` a mostani ötöst használja, vagy (b) a cikk-seed saját
   helyi segédeket visz. Az (a) tisztább, de idegen fájlt módosít, ezért
   vezetői döntés kell. A példa most a (b) utat mutatja.
2. **Milyen kategória-bontás legyen?** Ma egyetlen content-kategória van
   („Tudástár”). A `docs/kulcsszavak.md` nyolc cikke legalább három-négy
   témakört indokolna (kéz és csukló, könyök és alkar, váll, műtét és
   gipsz után). A bontást a cikkírás ELŐTT kell eldönteni, mert a slug
   utólagos átírása töri a webcímet.
3. **Ki legyen a `posts.author`?** Az `Article` JSON-LD `author.name`-je
   ebből jön, és E-E-A-T szempontból ez a legerősebb jel. Ehhez a két
   gyógytornásznak `users` rekord kell, kitöltött `name` mezővel. Van ilyen
   élesben? Ha nincs, a szerző „Kineticare”-re esik vissza, ami gyengébb.
4. **Legyen-e szerzői bio-blokk a cikk alján?** A `docs/seo-geo-llm.md` 2.3
   pontja kéri („szerzői bio minden cikknél: név, végzettség, szakterület,
   praxis-évek”), de a `posts` sémában nincs rá mező, és a `PostView` sem
   rendereli. Ma a szerző neve az egyetlen jel. Ez felületi munka, tehát a
   `.claude/skills/termektervezes` skill hatálya alá tartozik.
5. **Kell-e táblázat?** A default Lexical-készletben nincs `TableFeature`, és
   a serializer sem rajzol táblázatot. Ha a cikkekhez táblázat kell (pl.
   „melyik ujj, melyik ideg”), az feature-bővítés és serializer-munka.

---

## Függelék: a mérések

A doksi számai újramérhetők, a repó gyökeréből:

```bash
# Mondathossz, bekezdéshossz, szógyakoriság a vevői szövegekre
python3 - <<'PY'
import re, statistics
def strings_from(path):
    src = open(path, encoding='utf-8').read()
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)      # blokk-kommentek ki
    src = re.sub(r'^\s*//.*$', '', src, flags=re.M)      # sor-kommentek ki
    out = []
    for m in re.finditer(r"'((?:[^'\\]|\\.)*)'", src):
        s = m.group(1).replace("\\'", "'")
        if len(s) >= 40 and re.search(r'[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]', s) and not s.startswith('http'):
            out.append(s)
    return out

files = ['src/scripts/restore-legacy-content.ts', 'src/lib/home-seed.ts']
uniq, seen = [], set()
for f in files:
    for t in strings_from(f):
        if t not in seen:
            seen.add(t); uniq.append(t)

sent = [len(s.split()) for t in uniq
        for s in re.split(r'(?<=[.!?…])\s+', t) if len(s.split()) >= 3]
print('szövegdarab:', len(uniq), 'szó:', sum(len(t.split()) for t in uniq), 'mondat:', len(sent))
print('átlag mondathossz:', round(statistics.mean(sent), 1), 'medián:', statistics.median(sent))
print('<=15 szó:', round(100 * sum(1 for w in sent if w <= 15) / len(sent), 1), '%')
em = sum(t.count('—') for t in uniq); en = sum(t.count('–') for t in uniq)
print('em dash:', em, 'en dash:', en,
      '→', round(1000 * (em + en) / sum(len(t.split()) for t in uniq), 1), 'db / 1000 szó')
PY
```

Mért eredmény 2026-08-21-én: 275 szövegdarab, 4910 szó, 379 mondat;
átlagos mondathossz 12,9 szó, medián 12; a mondatok 68,3%-a 15 szó alatt;
13 kvirtmínusz és 87 en dash, azaz 20,4 gondolatjel 1000 szavanként.
