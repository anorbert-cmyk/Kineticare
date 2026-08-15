# Tartalom-leltár — régi kineticare.hu → új Kineticare-platform

> **Mi ez?** Tételes összevetés: mi van a jelenleg élő, régi `www.kineticare.hu`
> oldalon (systeme.io funnel-rendszer), mi van már meg az új platformon, és mi
> hiányzik. A tulajdonos ez alapján jelöli ki, mit hozunk át.
>
> **Készült:** 2026-08-15 · **Módszer:** a régi oldal mind a 25 sitemap-URL-jének
> bejárása + a repó (`src/blocks/`, `src/lib/home-seed.ts`,
> `src/scripts/restore-legacy-content.ts`) + az éles oldal
> (`kineticare-production.up.railway.app`) olvasása.
>
> **Kötelező háttér:** `docs/ertekesitesi-ux-skill.md` (M1–M8 hierarchia),
> `docs/szekcio-rendszer-terv.md` (blokk-katalógus), `CLAUDE.md` (TILOS ZÓNÁK).
> Ez a dokumentum **leltár, nem terv** — kódot nem módosít.

---

## 1. Vezetői összefoglaló

**A régi oldal mérete:** 25 URL a sitemapban, ebből

- **20 valós Kineticare-oldal** (5 fő oldal + 11 funnel-oldal + 3 jogi + 1 üres keresőoldal),
- **5 idegen spam-poszt** (ázsiai utazási cikkek) — SEO-szennyezés, **nem** hozzuk át
  (ezt a `docs/legacy/README.md` már rögzítette).

**Az átvétel állása:** a szöveges törzsanyag nagy része **már bent van**. A
`src/scripts/restore-legacy-content.ts` élesben lefutott: a `/rolunk` és a
`/szolgaltatasok` oldal teljes szövege, a két termék teljes sales-leírása és 14
valós vélemény már az adatbázisban van. A hiány tehát **nem a szövegben**, hanem
a **jogi oldalakban, a struktúrában és néhány konkrét adatban** van.

### A 3 legfontosabb hiány

| # | Hiány | Miért ez a legfontosabb |
|---|---|---|
| **1** | **A három jogi oldal (`/aszf`, `/adatvedelem`, `/impresszum`) élesben 404-et ad.** | A lábléc (`src/components/layout/Footer.tsx:27–29`), a pénztár-űrlap (`src/components/checkout/CheckoutForm.tsx:221`) és a süti-sáv (`src/components/analytics/ConsentBanner.tsx:166`) **mind ezekre linkel**. Webshop ÁSZF és adatkezelési tájékoztató nélkül jogszerűen nem üzemel. A régi oldalon mindhárom megvan — de a szövegük **nem másolható át változatlanul** (lásd 5. szakasz). |
| **2** | **A rendelői kezelések árlistája, a két budapesti helyszín és a lemondási szabályzat nem érhető el önálló, kereshető oldalon.** | A régin ez saját oldal volt (`/rendeloi-kezelesek`), nálunk csak a `/szolgaltatasok` rich-textjének közepén egy felsorolás. Hiányzik továbbá a **kiegészítő terápiák tételes leírása** (Dynamic Tape®, flossing, köpöly, fasciakés, hegkezelés, NRX®) és a **telefonos elérhetőség a Kapcsolat oldalon**. Ez a bizalmi és a kapcsolatfelvételi cél (UX-skill 1. pont, 2–3. prioritás) közvetlen vesztesége. |
| **3** | **A fizetős kurzus értékesítési elemei egyetlen rich-text tömbbé lapultak.** | A `/kurzusok/1` oldalon a teljes sales-szöveg egy `longDescription`-ben áll: **nincs bónusz-kártya, nincs garancia-blokk, nincs GYIK, és egyetlen vélemény sincs a kurzusoldalon** — miközben a régi `/kezrehab` oldalon 10 páciens-vélemény, 5 szakmai ajánló, 3 GYIK-kérdés és 3 vizuálisan kiemelt bónusz-kártya támogatta a döntést. A Products entitásnak nincs `layout` (blokk) mezője — ez architekturális döntést igényel (lásd 6. szakasz, Ny1). |

**Egyéb, gyorsan pótolható hiányok:** a Kapcsolat oldalról hiányzik a két telefonszám,
a két helyszín és a két közösségi média profil; a 15+ partner csak szövegként van meg
(logó nélkül); a tudástár/blog teljesen üres (0 poszt).

---

## 2. Oldalanként — régi tartalom → nálunk van-e → mi kell hozzá

### 2.1 `/` — kezdőlap

**Szerep:** értékesítés + bizalom (belépő).

**Szekciók sorrendben a régi oldalon:**

1. **Hero** — „Hatékony és biztonságos módszerek a kéz és a kar fájdalmai ellen" + bevezető
   (professzionális, mégis emberközeli terápiás megoldások, hogy dolgozhass, sportolhass,
   gondoskodhass). **Nincs gomb a heróban.**
2. **INGYENES SEGÍTSÉG: SOS Kézrelax villámkurzus** — ínhüvelygyulladás, kéztőalagút-szindróma,
   teniszkönyök; „drága eszközök nélkül". CTA: `KÉREM A VILLÁMKURZUST` → `/kezrelax`.
3. **Probléma-blokk** — „Szeretnél megszabadulni a fájdalomtól, de hiába próbáltál ki (szinte)
   mindent?" + 3 elemű „Tudjuk, milyen, amikor:" felsorolás.
4. **Üdvözlünk / bemutatkozás** — Kiss Kata és Kocsis Kata, gyógytornászok, manuálterapeuták,
   sportrehabilitációs trénerek.
5. **Vélemények — 7 db** (Garami Gábor, Kállai Dóra, Kunfalvi Lili, Bagdal Szilvia,
   Dr. Sitku Lili, Hámori Lili, Dr. Kárpáti Katalin).
6. **„Erre számíthatsz" — 3 ígéret** (tudományosan megalapozott módszerek / személyre szabott
   megoldás / tartós eredmény).
7. **Szolgáltatások — 3 sor**: Rendelői kezelések → `/rendeloi-kezelesek`; Otthoni program →
   `/kezrehab`; Szakmai képzések → `probodystudio.hu/kez-workshop/`.
8. **Lábléc** — `info@kineticare.hu`, 3 jogi link, „© 2025".

**Konkrét adatok:** 7 vélemény · 3 szolgáltatás · 3 ígéret · 2 alapító · 1 e-mail ·
**0 db ár sehol az oldalon** · 0 db logó.

**Nálunk:** **MEGVAN, sőt jobb.** A `src/lib/home-seed.ts` 14 szekciós alap-layoutja
(filmHero → credsStrip → courseCards → freeSos → pressLogos → welcome → usps → states →
services → about → howItWorks → testimonials → knowledge → faq) tartalmazza a régi
oldal **minden** szekcióját, betűhív szöveggel, plusz: hitel-csík, kurzuskártyák **árral**
(79 500 Ft), sajtólogó-sor (6 logó), három-állapot szekció, „Így működik" 3 lépés, GYIK (4 kérdés).

> **UX-skill ütközés — a régi sorrendet TILOS átvenni.**
> A régi kezdőlapon az **ingyenes** SOS a 2. szekció (közvetlenül a hero után), a **fizetős**
> kurzus pedig csak a 7. szekcióban, **ár nélkül** bukkan fel. Ez pontosan a skill 6. pontjában
> tiltott **K2-hiba** (az ingyenes lead-magnet vizuális túlsúlya), és sérti az **M3**-at
> (ár mindig forintban, rejtett ár nincs). A régi oldal **7 véleménye** a **M6** szabályát
> sérti (max 2–3, rövid, a termék UTÁN). A mi seedelt sorrendünk ezt már helyesen kezeli —
> a leltár tehát itt **megerősítés, nem átvételi feladat**.

**Eltérés, amit érdemes megvizsgálni:** a régi hero **gomb nélküli**; a miénk 1+1 gombos
(M1 szerint helyes). Az éles kezdőlapon **4 vélemény** jelenik meg (3 seedelt + 1) — a
`maxItems: 3` mellett ez ellenőrzendő; a régin 7 volt.

---

### 2.2 `/szolgaltatasok` — szolgáltatások

**Szerep:** tájékoztatás + értékesítés-terelés.

**Szekciók:** „A kezed folyton dolgozik – segítünk, hogy közben ne fájjon" → „Fáj a kezed,
csuklód, könyököd vagy vállad?" → „Van megoldás – ha tudod, merre indulj" → „Válaszd ki,
hogyan segíthetünk neked a legjobban" (3 szolgáltatás) → „Ezért fogod imádni" (3 érv:
a kéz a specialitásunk / tartós eredmények / naprakész tudás) → 2 vélemény (élsportolók).

**Konkrét adatok:** akkreditált képzés **12 kreditpont, SZTK-A-33553/2024** · 3 CTA
(`/rendeloi-kezelesek`, `/kezrehab`, ProBody) · 2 vélemény.

**Nálunk:** **MEGVAN.** A `restore-legacy-content.ts` `szolgaltatasokContent()` betűhíven
átvette, sőt **kiegészítette**: benne van az árlista (18 000 / 10 000 Ft), a két helyszín,
a kiegészítő terápiák felsorolása, a kreditpont — ezek a régi `/szolgaltatasok` oldalon
**nem** voltak (a `/rendeloi-kezelesek` oldalról kerültek ide). Az éles oldal ezt vissza is adja.

**Ami hiányzik:** a tartalom **rich-textben** él, nem szekció-blokkokban → az árlista nem
kiemelt, a helyszínek nem kattinthatók (nincs `tel:`, nincs térkép), a 3 szolgáltatás nem
kártya. **Mi kell:** meglévő blokkok (`services`, `usps`, `testimonials`) + **2 új blokk**
(`priceList`, `locations`) — lásd 4. szakasz.

---

### 2.3 `/rolunk` — rólunk

**Szerep:** bizalom / szakmai hitel.

**Szekciók:** „A kéz a mindenünk" → „…ez nem »csak egy kéz«" → „Amikor már napi szinten
problémát okoz a fájdalom" (4 elemű vágy-lista) → „Megérdemled a profi törődést" (alapítói
történet) → **Kocsis Kata** (gyógytornász PTE, sportrehabilitációs tréner, gyógymasszőr,
**+36 30 169 2263**) → **Kiss Kata** (gyógytornász SE, Barvincsenko-manuálterapeuta,
sportrehabilitációs tréner, **+36 20 357 3493**) → 2 vélemény (Varró Barbara, Takács Mátyás)
→ „Amiben mások vagyunk" (3 érv) → „Miben segíthetünk?" (3 szolgáltatás) → **„Partnereink"
(16 partner)** → **teljes szakmai önéletrajzok**.

**Konkrét adatok:** Kocsis Kata: 2 tanulmány + **38 tanfolyam/továbbképzés** + **2 publikáció**
+ **7 konferencia-előadás** + **14 médiamegjelenés**. Kiss Kata: 2 tanulmány +
**31 tanfolyam** + **8 konferencia-előadás**. Tagságok: Magyar Sportrehabilitációs Egyesület,
Magyar Gyógytornász-Fizioterapeuták Társasága. Akkreditáció: 12 kreditpont, SZTK-A-33553/2024.
Partnerek (16): ProBody Stúdió, Aurora Medical, Dynamic Tape®, TUDATEST, PhysioWatch, WIBBI,
Halm Optika, dr. pharm. Kocsis Kristóf, Csillik Árpád, NISHI STUDIO pilates, BodyGPS,
Magic Smile, Be Fit With Ben, OrtoCare, Pille Fizioterápia, Magyar Sportrehabilitációs Egyesület.

**Nálunk:** **MEGVAN, teljes terjedelemben** (`rolunkContent()`, az éles oldal ~8–10 000 szó,
mindkét CV-vel, publikációkkal, médiamegjelenésekkel, telefonszámokkal).

**Ami CSONKA:**

- **A 16 partner csak szöveges felsorolás** — a régin **logóként** jelentek meg.
  → a meglévő `pressLogos` blokk **elég**, csak a logóképeket kell beszerezni és feltölteni.
- **A két alapító nincs külön, fotós kártyaként** (fotó + titulus + `tel:` link).
  → **ÚJ blokk kell:** `teamMembers`.
- **A ~70 tételes CV egyben, összecsukhatatlanul áll** — mobilon több képernyőnyi görgetés.
  → **ÚJ blokk kell:** `accordion` (a `faq` blokk erre **nem** használható: abból FAQPage
  JSON-LD generálódik, egy CV-lista oda nem való).

---

### 2.4 `/kapcsolat` — kapcsolat

**Szerep:** kapcsolatfelvétel.

**Szekciók:** „Miben tudunk segíteni?" → **„Helyszínek"** → **„Itt is üzenhetsz nekünk"** (űrlap).

**Konkrét adatok:** `info@kineticare.hu` · **+36-30-169-2263** · **1117 Budapest, Nádorliget u. 7/b**
· **1114 Budapest, Fadrusz utca 15.** · **Instagram: `kineticare_hu`** ·
**Facebook: `kineticareotthonikezrehab`** · válaszidő: **2 munkanapon belül** ·
űrlap: adatkezelési jelölőnégyzet + `ELKÜLDÖM`.

**Nálunk:** **CSONKA.** Van űrlap (név, e-mail, tárgy, üzenet, honeypot, adatkezelési
jelölőnégyzet) és `info@kineticare.hu`. **Hiányzik: mind a két telefonszám, mind a két
helyszín, mindkét közösségi média profil, a válaszidő-ígéret.**

→ **ÚJ blokkok kellenek:** `contactChannels` (e-mail, telefon `tel:`-lel, közösségi média,
válaszidő) és `locations` (cím + megjegyzés + opcionális térkép-hivatkozás).

---

### 2.5 `/rendeloi-kezelesek` — rendelői kezelések

**Szerep:** értékesítés (offline szolgáltatás) + tájékoztatás.

**Szekciók:** „Rendelői kezelések" → **„Árlista"** → **„Lemondási szabályzat"** →
**GYÓGYTORNA** → **MANUÁLTERÁPIA** → **KIEGÉSZÍTŐ TERÁPIÁK**.

**Konkrét adatok:**

| Tétel | Adat |
|---|---|
| Gyógytorna / manuálterápia, **50 perc** | **18 000 Ft** |
| Gyógytorna / manuálterápia, **20 perc** | **10 000 Ft** |
| Első alkalom | mindig 50 perces vizsgálatot tartalmaz |
| Fizetés | készpénz és átutalás |
| Lemondás | **24 órán belül a teljes díj fizetendő** |
| Kiegészítő terápiák | **7 db**, tételes leírással: Dynamic Tape®, Kinezio Tape, flossing, köpölyterápia, fasciakés (eszközös lágyrész-mobilizáció), hegkezelés, NRX® bandázs |

**Nálunk:** **CSONKA.** Az árak, a két helyszín, az első alkalom szabálya és a kiegészítő
terápiák **neve** átkerült a `/szolgaltatasok` rich-textjébe. **Hiányzik:**

- a **lemondási szabályzat** (24 óra) — sehol nincs meg,
- a **7 kiegészítő terápia tételes leírása** (mi az, mire jó) — csak felsorolásként van,
- az árlista **strukturált** megjelenítése (táblázat/kártya),
- a gyógytorna és manuálterápia **saját, részletes leírása** (mire jó, milyen panaszokra:
  derékfájás, porckorong, ízületi mozgásbeszűkülés, végtagzsibbadás, kisugárzó fájdalom,
  nyak- és vállpanaszok, szédülés, fejfájás, ínsérülések).

→ **ÚJ blokk kell:** `priceList` (a lemondási szabályzattal együtt). A terápia-leírásokhoz
a meglévő `usps` vagy `accordion` blokk elég.

---

### 2.6 `/rendeloi-kezelesek-regi` — elavult duplikátum

**Nálunk:** **NEM KELL.** Ugyanaz a tartalom, de **55 és 25 perces** alkalmakkal, ugyanazon
az áron (18 000 / 10 000 Ft) — az élő oldal 50/20 percet ír. **Elavult adat**, lásd 5. szakasz.
Egyetlen érték benne, ami máshol nincs: az „ingyenes nyaklazító videó" ajánlat — ez ma nem él.

---

### 2.7 `/kezrehab` — az Otthoni KézRehab Program értékesítő oldala

**Szerep:** ez a **fő értékesítő oldal** — a legfontosabb migrálandó anyag.

**Szekciók sorrendben (17 db):** Otthoni KézRehab Program → „Használd végre úgy a kezed,
mint régen" → „Sajog, zsibbad a kezed vagy a karod?" → „Amikor már a kávésbögrédet is alig
bírod felemelni" → „Emlékszel még, milyen volt normális életet élni?" → „Ezért alkottuk meg…"
→ „Kéz & kar? Tudjuk a megoldást." → „Ha most azon filózol, hogy…" → „Nem kell fájdalommal
élned!" → **„Mi vár a programban?" (I–IV. modul)** → „Tanulj meg gondoskodni a kezeidről" →
**„BÓNUSZ MINIKURZUSOK" (3 db)** → **„Szakemberajánló extra kedvezményekkel"** →
**„Ez a program tökéletes számodra, ha" (9 tétel)** → **„Nem javasoljuk a programot, ha" (6 tétel)**
→ **„Gyakran ismételt kérdések" (3 db)** → **„Igazából két választásod van (na jó, három)"**.

**Konkrét adatok:**

| Adat | Érték |
|---|---|
| Eredeti ár | **119 000 Ft** |
| Bevezető ár | **79 500 Ft** |
| Garancia | **30 napos kipróbálási garancia**, „kérdés nélkül" visszafizetés |
| Modulszám | **4** |
| Videószám | **50+** |
| Blokkhossz | **5 perces miniblokkok** |
| Bónusz 1 | Kinesio szalag minikurzus — **29 900 Ft** |
| Bónusz 2 | Ergonómiai minikurzus friss anyukáknak — **19 900 Ft** |
| Bónusz 3 | Így sportolj kézrehab alatt — **19 900 Ft** |
| Dream Team | szakemberajánló, **közel 100 000 Ft** értékű kuponokkal |
| Vélemény | **10 páciens** (M. Éva, Sz. Tímea, L. Márta, S. Sándor, D. Szilvia, K. Márta, N. Krisztina, P. Kata, T. Evelin, B. Anna) |
| Szakmai ajánló | **5 fő** (Szegedi Márton, Pályi Csaba, Kiss-Szabó Eszter, Szilágyi Attila, Varga Brigitta) |
| GYIK | **3 kérdés** |
| Fizetés | **Stripe** (bizalmi jelvényekkel) |
| Sürgetés | **nincs** visszaszámláló |
| Támogatás | Facebook-csoport + `info@kineticare.hu` |

**Nálunk:** **NAGYRÉSZT MEGVAN, de csonka formában.** A `kezrehabLongDescription()` a
`/kurzusok/1` oldalon visszaadja: 4 modul, „Ezt kapod" 10 tételes lista, 3 bónusz az
**értékükkel együtt**, a 9+6 tételes „kinek jó / kinek nem" lista, a 30 napos garancia,
és az árszöveg (119 000 → 79 500 Ft). Az ár mint termékadat: **79 500 Ft**, `MEGVESZEM` gombbal.

**Ami HIÁNYZIK a kurzusoldalról:**

| Hiányzó elem | Régin | Nálunk |
|---|---|---|
| **10 páciens-vélemény** | ✓ | ✗ (a Testimonials collectionben más 14 vélemény van, de a kurzusoldalon egy sem jelenik meg) |
| **5 szakmai ajánló** | ✓ | ✗ |
| **3 GYIK-kérdés a kurzusoldalon** | ✓ | ✗ (GYIK csak a kezdőlapon van, más kérdésekkel) |
| **Bónuszok vizuális kártyaként, értékkel** | ✓ | ✗ (folyó szövegben) |
| **Garancia kiemelt blokként** | ✓ | ✗ (folyó szövegben) |
| **Kinek jó / kinek nem, két oszlopban** | ✓ | ✗ (két egymás alatti felsorolás) |
| **Lecke-/modulszerkezet vizuálisan** | ✓ | ✗ |
| **Beszédes URL** | `/kezrehab` | `/kurzusok/1` — a slug nincs kitöltve élesben |

→ **Ez a 3. legfontosabb hiány.** Architekturális kérdés: a Products entitásnak nincs
blokk-alapú `layout` mezője, ezért a fenti elemek jelenleg csak rich-textként férnek el.
Lásd 6. szakasz, **Ny1**.

---

### 2.8 `/kezrehab-akcio` és `/oto-kezrehab-akcio` — akciós változatok

**Szerep:** értékesítés (kedvezményes funnel-ág).

**Tartalom:** a `/kezrehab` oldal **azonos szövege**, egyetlen eltéréssel: az ár
**119 000 Ft → 39 700 Ft** (kb. 66% kedvezmény). Visszaszámláló, készlethiány-üzenet
vagy határidő **egyiken sincs**. Az `/oto-` előtag ellenére **nem** klasszikus one-time-offer
upsell: ugyanaz a fő ajánlat, „Sikeres fizetés / Sikeres feliratkozás" fejléccel — feltehetően
a `/hamarosan` feliratkozók vagy a `/kezrelax` leadek utáni oldal.

**Nálunk:** **NEM KELL ÁTHOZNI** — és a 39 700 Ft-os ár **elavult**, lásd 5. szakasz.
Ha kedvezményes ág kell, azt a Barion-alapú webshop kuponnal / külön termékkel oldja meg,
nem duplikált landing oldallal.

---

### 2.9 `/kezrehab-penztar` és `/kezrehab-akcio-penztar` — pénztár

**Tartalom:** országválasztó, számlázási adatok, kártyaadat-mező, ÁSZF + adatvédelmi
jelölőnégyzet, mellette a termék tartalmának összefoglalója és 2 vélemény („Sándor", „Anna"),
valamint az orvosi kikötés („a kurzus nem helyettesíti a szakorvosi kontrollt").
**Order bump / upsell jelölőnégyzet nincs.**

**Nálunk:** **MEGVAN, saját megoldással** (`/penztar`, `/kosar`, Barion). A régi pénztár
tartalmi eleme, ami **hiányozhat**: a pénztár melletti **rövid termék-összefoglaló és
a 2 megerősítő vélemény** (klasszikus kosárelhagyás-csökkentő). Ez opcionális, S méretű.

> **FIGYELEM:** a régi pénztár **Stripe**-alapú. A tartalmi átvétel során a fizetési
> szolgáltatóra utaló minden szöveg és bizalmi jelvény cserélendő — lásd 5. szakasz.

---

### 2.10 `/typ-kezrehab` és `/typ-kezrehab-akcio` — köszönőoldalak

**Tartalom:** „Nagyon örülünk, hogy te is csatlakoztál az Otthoni KézRehab Programhoz" ·
a hozzáférési adatok e-mailben érkeznek · támogatás: `info@kineticare.hu` · **nincs upsell**.

**Nálunk:** **MEGVAN** (`/fizetes/koszonom`). A régi oldal szövege elavult a folyamat
szempontjából: nálunk a vevő **azonnal** hozzáfér a `/kurzusaim` alatt, nem e-mailben kapott
belépőt kap. **A régi szöveget ezért nem szabad átmásolni.**

---

### 2.11 `/kezrelax` — SOS KézRelax, ingyenes lead-magnet landing

**Szerep:** lead-magnet (a tölcsér teteje).

**Szekciók:** „SOS Kézrelax kedvezmény" → „Fáj a kezed, és nem múlik?" →
„SOS Kézrelax villámkurzus" (**8 témás** felsorolás) → „100% boldogság garancia" →
„A VIDEÓK MELLÉ MEGKAPOD EZT IS" (letölthető „puska" PDF) → 4 vélemény →
„Kérdések, amik talán felmerültek benned" (**4 GYIK**).

**Konkrét adatok:** **ár nincs** (ingyenes, e-mailes opt-in) · 8 téma · letölthető PDF-„puska"
fotókkal · hozzáférés „hivatalosan minimum egy évig" · „több mint ezer embernek segítettünk" ·
CTA-k: `KÉREM A VILLÁMKURZUST` / `KÉREM A HOZZÁFÉRÉST` / `KÉREM A PROGRAMOT` — **űrlapra**,
nem pénztárra.

**Nálunk:** **MEGVAN, de más mechanikával.** A `kezrelaxLongDescription()` a teljes szöveget
átvette (8 téma, puska, 100% boldogság garancia, 3 vélemény, 4 GYIK) — de **0 Ft-os termékként**
a webshopban (`/kurzusok/2`), nem e-mailes opt-in űrlapként.

**Funkcionális eltérés, amit a vezetőnek el kell dönteni (Ny2):** a régi modellben az
ingyenes anyag **e-mail-címért** cserébe járt (listaépítés), nálunk regisztráció + 0 Ft-os
rendelés kell hozzá. A listaépítés szempontjából ez **erősebb** (valódi fiók), a konverzió
szempontjából **magasabb súrlódás**. Ha a lead-magnet modell kell, **ÚJ blokk** szükséges:
`leadMagnetForm`.

> **UX-skill megjegyzés:** az M4 szerint az ingyenes ajánlat **másodlagos súllyal**, a fizetős
> UTÁN áll. A jelenlegi seed ezt betartja. A régi oldal **önálló, teljes értékű landingje**
> az ingyenesnek — ha ilyet készítünk, a kezdőlapról **nem** kaphat elsődleges CTA-t.

---

### 2.12 `/hamarosan` és `/typ-hamarosan` — értesítés-feliratkozás

**Tartalom:** „HAMAROSAN JÖN…!" — hamarosan induló tanfolyamok, korai feliratkozóknak
**a nagyközönségnek nem hirdetett kedvezmény**. Űrlap: e-mail + hozzájárulási jelölőnégyzet.
CTA: `KÉREM AZ ÉRTESÍTÉST`. Köszönőoldal: „Otthoni Fájdalomcsökkentő Programok értesítőjére"
iratkozott fel.

**Nálunk:** **RÉSZBEN.** Van hírlevél-feliratkozás (`Feliratkozom`, `src/lib/newsletter/`),
de **nincs termék-specifikus „hamarosan / értesíts, ha elindul" mechanizmus**, és nincs
„coming soon" oldal.

→ Ha kell: **ÚJ blokk** `comingSoon` (cím, szöveg, feliratkozó-űrlap, opcionális terméknév),
vagy egyszerűbben: a meglévő `ctaBanner` + hírlevél-űrlap. **S–M** méret.

> **UX-skill figyelmeztetés:** a „csak a feliratkozóknak, nem hirdetjük a nagyközönségnek"
> megfogalmazás a **mesterséges exkluzivitás** határán van. Nem tiltott dark pattern
> (nincs visszaszámláló, nincs hamis készlethiány), de csak akkor másolható, ha **igaz** —
> azaz a kedvezmény tényleg csak a listára megy ki.

---

### 2.13 `/impresszum`, `/adatvedelem`, `/aszf` — jogi oldalak

**Impresszum (régi):** KINETICARE Korlátolt Felelősségű Társaság · 8360 Keszthely,
Kacsóh Pongrác utca 1. 2a. ép. · **adószám: 32697865-1-20** ·
**cégjegyzékszám: 20-09-079468** · Zalaegerszegi Törvényszék Cégbírósága ·
e-mail: `egeszsegmozgastamogatas@gmail.com` / `info@kineticare.hu` ·
tárhely: **Tárhely.Eu Kft.**, 1144 Budapest, Ormánság utca 4. X. em. 241.,
+36 1 789-2-789, `support@tarhely.eu`.

**Adatvédelem (régi):** adatkezelő adatai (a fenti cím, `+36301692263`) ·
adatfeldolgozók **név szerint nincsenek megnevezve**, csak kategóriákkal (tárhely- és
IT-szolgáltató, könyvelés, számlázó, hírlevél-kiküldő) · 4 sütikategória
(feltétlenül szükséges / funkcionális / teljesítmény / célzó) · **dátum: 2025.05.05.**

**ÁSZF (régi):** eladó: KINETICARE Kft., `egeszsegmozgastamogatas@gmail.com`, `+36203573493` ·
**fizetés: STRIPE** (szó szerint megnevezve) · digitális tartalom: egyszeri fizetés,
**garantáltan 3 hónap** hozzáférés, utána a szolgáltató belátása szerint korlátozható ·
**elállás/visszatérítés: NINCS** — a vásárló kifejezetten hozzájárul a teljesítés
megkezdéséhez és lemond az elállási jogáról · panasz: 10 napon belül bejelentés,
30 napos válaszhatáridő, békéltető testület / fogyasztóvédelmi hatóság / EU ODR ·
**dátum: 2025.05.05.**

**Nálunk:** **HIÁNYZIK — mindhárom oldal 404-et ad élesben.** Ez a **legfontosabb hiány**.

→ **Mi kell:** három CMS `Pages` bejegyzés (`impresszum`, `adatvedelem`, `aszf`), a meglévő
`richText` blokkal — **új blokk-típus NEM kell**. A szöveget viszont **nem a régiről kell
másolni**, hanem újraírni (Stripe→Barion, elállási szabályok, Számlázz.hu, Bunny Stream,
Resend, hozzáférési idő), és **emberi jóváhagyás kötelező**. Lásd 5. szakasz.
A `docs/feladatlista.md` B5 tétele ezt már részben rögzíti (adatvédelem), az ÁSZF és az
impresszum viszont nincs benne.

---

### 2.14 `/search` — üres keresőoldal

Systeme.io-sablon maradványa, Kineticare-tartalom nincs rajta. **NEM KELL.**

---

### 2.15 Spam blogposztok (5 URL)

`/best-places-to-visit-in-asia`, `/best-time-to-visit-asia`,
`/mehtab-bagh-itmad-ud-daula-taj-mahal`, `/top-places-in-china`, `/kathmandu-nepal`.

Idegen, ázsiai utazási tartalom — a `docs/legacy/README.md` szerint SEO-szennyezés.
**NEM KELL ÁTHOZNI, és 301-átirányítás sem kell rájuk.**

---

### 2.16 Tudástár / blog — az új oldal saját hiánya

A régi oldalon **nincs valódi blog** (csak a fenti 5 spam-poszt). A mi oldalunkon viszont
**van** `/blog` útvonal, `knowledge` blokk a kezdőlapon és „Tudástár" kategória — de
**0 közzétett poszt**: az éles `/blog` azt írja, „Ebben a kategóriában még nincs cikk".

→ Ez **nem migrációs hiány, hanem új tartalmi feladat**. Nyersanyag bőven van: a `/rolunk`
oldal **14 médiamegjelenése** (Nők Lapja, Képmás, Házipatika, Szimpatika, Karc FM,
Secret Medical Podcast) témalistának és hivatkozásnak is jó.
Az UX-skill **M7** szerint a tudástár **másodlagos**, sosem előzi meg a termékblokkot.

---

## 3. Összesítő táblázat

Jelölések: **MEGVAN** = tartalmilag és formailag rendben · **CSONKA** = a szöveg megvan,
de hiányos vagy nem megfelelő formában · **HIÁNYZIK** = nincs nálunk.
Méret: **S** ≈ tartalmi feltöltés, **M** ≈ 1 blokk + feltöltés, **L** ≈ több blokk / architektúra.

| Tartalom | Régi oldalon | Nálunk | Állapot | Mi kell hozzá | Méret |
|---|---|---|---|---|---|
| Hero (cím + bevezető) | `/` | `filmHero` blokk, seedelve | **MEGVAN** | — | — |
| Hitel-csík (szakmai háttér) | nincs | `credsStrip` blokk | **MEGVAN** (többlet) | — | — |
| Kurzuskártyák **árral** | nincs (ár sehol) | `courseCards` + Products | **MEGVAN** (többlet) | — | — |
| Ingyenes SOS-sáv a kezdőlapon | `/` 2. szekció | `freeSos` blokk (M4-pozícióban) | **MEGVAN** | — | — |
| Sajtólogó-sor | nincs a kezdőlapon | `pressLogos`, 6 logó | **MEGVAN** (többlet) | — | — |
| Probléma-blokk („Tudjuk, milyen…") | `/` | `welcome` blokk | **MEGVAN** | — | — |
| „Erre számíthatsz" 3 ígéret | `/` | `usps` blokk | **MEGVAN** | — | — |
| Szolgáltatás-sorok (3 db) | `/`, `/szolgaltatasok` | `services` blokk | **MEGVAN** | — | — |
| Bemutatkozás + statisztikák | `/`, `/rolunk` | `about` blokk | **MEGVAN** | — | — |
| „Így működik" 3 lépés | nincs | `howItWorks` blokk | **MEGVAN** (többlet) | — | — |
| Vélemények (14 valós) | 7 + 2 + 2 + 10 + 4 | Testimonials collection, 14 db | **MEGVAN** | — | — |
| GYIK a kezdőlapon | nincs | `faq` blokk, 4 kérdés | **MEGVAN** (többlet) | — | — |
| **ÁSZF oldal** | `/aszf` | **404** | **HIÁNYZIK** | `Pages` + `richText`; szöveg **újraírandó** (Barion) + emberi jóváhagyás | **M** |
| **Adatvédelmi tájékoztató** | `/adatvedelem` | **404** | **HIÁNYZIK** | `Pages` + `richText`; adatfeldolgozók név szerint (Barion, Számlázz.hu, Bunny, Resend, Railway, PostHog) | **M** |
| **Impresszum** | `/impresszum` | **404** | **HIÁNYZIK** | `Pages` + `richText`; cégadatok megvannak, tárhely **változott** (Railway) | **S** |
| **Rendelői árlista (18 000 / 10 000 Ft)** | `/rendeloi-kezelesek` | rich-textben elrejtve | **CSONKA** | **ÚJ blokk:** `priceList` | **M** |
| **Lemondási szabályzat (24 óra)** | `/rendeloi-kezelesek` | nincs | **HIÁNYZIK** | a `priceList` blokk lábjegyzet-mezője | **S** |
| **Két budapesti helyszín** | `/kapcsolat`, `/rendeloi-kezelesek` | rich-textben, nem kattintható | **CSONKA** | **ÚJ blokk:** `locations` | **M** |
| **Telefonszámok (2 db)** | `/rolunk`, `/kapcsolat` | csak a `/rolunk` szövegében | **CSONKA** | **ÚJ blokk:** `contactChannels` (`tel:` link) | **M** |
| **Közösségi média (IG, FB)** | `/kapcsolat` | **nincs sehol** | **HIÁNYZIK** | `contactChannels` blokk | **S** |
| **Válaszidő-ígéret (2 munkanap)** | `/kapcsolat` | nincs | **HIÁNYZIK** | `contactChannels` blokk | **S** |
| **7 kiegészítő terápia leírása** | `/rendeloi-kezelesek` | csak felsorolás | **CSONKA** | `accordion` vagy `usps` blokk | **S** |
| Gyógytorna / manuálterápia leírás | `/rendeloi-kezelesek` | rövidítve | **CSONKA** | `richText` bővítés | **S** |
| Alapítói életrajzok (2×) | `/rolunk` | teljes terjedelemben | **MEGVAN** | — | — |
| **Alapítói kártyák (fotó + tel.)** | `/rolunk` | nincs | **HIÁNYZIK** | **ÚJ blokk:** `teamMembers` | **M** |
| **CV összecsukható formában** | `/rolunk` | egyben, hosszan | **CSONKA** | **ÚJ blokk:** `accordion` | **M** |
| **16 partner logóként** | `/rolunk` | csak szöveg | **CSONKA** | meglévő `pressLogos` + logóképek | **S** |
| Akkreditáció (12 kredit, SZTK-A-33553/2024) | `/szolgaltatasok`, `/rolunk` | rich-textben | **MEGVAN** | — | — |
| Kurzus-leírás (4 modul, 50+ videó) | `/kezrehab` | `longDescription` | **MEGVAN** | — | — |
| **Bónuszok kártyaként (3×, értékkel)** | `/kezrehab` | folyó szövegben | **CSONKA** | **ÚJ blokk:** `bonusCards` + Products-layout | **L** |
| **30 napos garancia kiemelt blokként** | `/kezrehab` | folyó szövegben | **CSONKA** | **ÚJ blokk:** `guarantee` | **M** |
| **„Kinek jó / kinek nem" két oszlopban** | `/kezrehab` | két lista egymás alatt | **CSONKA** | **ÚJ blokk:** `fitCheck` | **M** |
| **Modul-szerkezet vizuálisan** | `/kezrehab` | folyó szövegben | **CSONKA** | **ÚJ blokk:** `curriculum` | **M** |
| **Vélemények a kurzusoldalon** | 10 + 5 ajánló | **egy sem** | **HIÁNYZIK** | Products-layout + `testimonials` blokk | **L** |
| **GYIK a kurzusoldalon** | 3 kérdés | nincs | **HIÁNYZIK** | Products-layout + `faq` blokk | **L** |
| **Beszédes kurzus-URL** | `/kezrehab` | `/kurzusok/1` | **CSONKA** | a `slug` mező feltöltése élesben | **S** |
| Ingyenes SOS teljes leírása | `/kezrelax` | `longDescription` | **MEGVAN** | — | — |
| **Lead-magnet e-mailes opt-in** | `/kezrelax` | 0 Ft-os termék | **CSONKA** (más mechanika) | **ÚJ blokk:** `leadMagnetForm` — **döntés kell** (Ny2) | **L** |
| **„Hamarosan" értesítő oldal** | `/hamarosan` | nincs | **HIÁNYZIK** | `comingSoon` blokk vagy `ctaBanner` + hírlevél | **M** |
| Köszönőoldal vásárlás után | `/typ-kezrehab` | `/fizetes/koszonom` | **MEGVAN** | régi szöveg **nem** másolható (más folyamat) | — |
| Pénztár | `/kezrehab-penztar` | `/penztar` (Barion) | **MEGVAN** | opc.: termék-összefoglaló + 2 vélemény a pénztár mellé | **S** |
| **Tudástár / blog cikkek** | nincs (csak spam) | 0 poszt | **HIÁNYZIK** | új tartalom; nyersanyag: 14 médiamegjelenés | **L** |
| Akciós landingek (39 700 Ft) | `/kezrehab-akcio`, `/oto-…` | nincs | **NEM KELL** | elavult ár — lásd 5. szakasz | — |
| Régi rendelői oldal (55/25 perc) | `/rendeloi-kezelesek-regi` | nincs | **NEM KELL** | elavult adat | — |
| Keresőoldal | `/search` | nincs | **NEM KELL** | üres sablon | — |
| Spam blogposztok (5 db) | sitemap | nincs | **NEM KELL** | SEO-szennyezés, 301 sem kell | — |

---

## 4. Javasolt ÚJ CMS-blokk-típusok (mezőlistával)

A meglévő 16 blokk (`src/blocks/index.ts`) a kezdőlapot lefedi. A hiányzó tartalmakhoz
**9 új blokk-típus** javasolt. Mindegyik a meglévő mintát követi: magyar `labels`,
laikusnak írt `admin.description`, `sectionSettings()` a mezőlista végén,
linkeknél a `linkFields` / `linkGroup` segédlet.

### B1. `priceList` — Árlista

**Hová:** `/szolgaltatasok`, jövőbeli `/rendeloi-kezelesek`.

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | pl. „Árlista – gyógytorna / manuálterápia" |
| `lead` | textarea | nem kötelező bevezető |
| `items` | array (max 10) | a tételek |
| `items.name` | text, kötelező | pl. „Gyógytorna / manuálterápia" |
| `items.duration` | text | pl. „50 perc" |
| `items.price` | text, kötelező | **szöveg, nem szám** — „18 000 Ft"; a webshop árától elkülönül |
| `items.includes` | textarea | mit tartalmaz az ár |
| `items.highlighted` | checkbox | egy tétel kiemelhető |
| `footnotes` | array (max 4) | „Az első alkalom mindig 50 perces vizsgálat", „készpénz és átutalás" |
| `cancellationPolicy` | group: `title` + `text` | **a 24 órás lemondási szabály helye** |

> **Miért szöveg az ár?** Ez **offline szolgáltatás** ára, nem webshop-termék — a Products
> árától (Barion, forintban, számlázás) szigorúan el kell válnia, nehogy összekeveredjen.

### B2. `locations` — Helyszínek

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | pl. „Helyszíneink" |
| `items` | array (max 5) | |
| `items.name` | text | pl. „Nádorliget rendelő" |
| `items.address` | textarea, kötelező | „1117 Budapest, Nádorliget u. 7/b" |
| `items.note` | textarea | megközelítés, parkolás |
| `items.mapUrl` | text | **link**, nem beágyazott térkép (CSP: külső host tiltva) |
| `items.image` | upload → media | nem kötelező fotó |

### B3. `contactChannels` — Kapcsolati csatornák

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | |
| `responseTime` | text | „Az üzenetekre 2 munkanapon belül válaszolunk." |
| `emails` | array (max 3): `label` + `address` | `mailto:` link |
| `phones` | array (max 4): `name` + `number` + `note` | **`tel:` link**; pl. „Kocsis Kata · +36 30 169 2263" |
| `socials` | array (max 6): `platform` (select: Instagram/Facebook/YouTube/TikTok/LinkedIn/egyéb) + `handle` + `url` | |

### B4. `teamMembers` — Szakértő-kártyák

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | pl. „Kik vagyunk?" |
| `members` | array (max 4) | |
| `members.photo` | upload → media | |
| `members.name` | text, kötelező | |
| `members.role` | text | „Gyógytornász, manuálterapeuta, sportrehabilitációs tréner" |
| `members.bio` | textarea | 2–4 mondat |
| `members.phone` | text | `tel:` link |
| `members.email` | text | |
| `members.link` | linkGroup | „Bővebben a szakmai hátterről" → a CV-horgonyra |

### B5. `accordion` — Összecsukható lista

**Hová:** a két hosszú szakmai önéletrajz, a 7 kiegészítő terápia leírása.

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | |
| `items` | array (max 30) | |
| `items.heading` | text, kötelező | |
| `items.body` | richText | itt kell a formázás (felsorolások, évszámok) |
| `items.openByDefault` | checkbox | |

> **Miért nem a `faq` blokk?** Abból **FAQPage JSON-LD** generálódik (`src/blocks/faq.ts`
> fejkomment) — egy 38 tételes tanfolyamlista strukturált adatként hibás lenne.
> Az `accordion` **nem** ad ki JSON-LD-t.

### B6. `guarantee` — Garancia-blokk

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text, kötelező | „30 napos kipróbálási garancia" |
| `days` | number | a napok száma (megjelenítéshez) |
| `body` | textarea, kötelező | |
| `icon` | upload → media | pecsét/jelvény |
| `smallPrint` | textarea | **az ÁSZF-fel egyező kikötések** |

> **Kötelező összhang:** a garancia szövege **nem mondhat ellent az ÁSZF-nek**. A régi
> oldalon pontosan ez a hiba állt fenn (lásd 5. szakasz, E2) — az új ÁSZF megírásakor a
> 30 napos garanciát **bele kell írni**, különben a blokkot nem szabad használni.

### B7. `bonusCards` — Bónusz-kártyák

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | „Bónusz minikurzusok" |
| `lead` | textarea | |
| `cards` | array (max 6) | |
| `cards.number` | text | „01" — üresen a rendszer számoz |
| `cards.title` | text, kötelező | |
| `cards.body` | textarea, kötelező | |
| `cards.value` | text | „29 900 Ft" |
| `cards.valueNote` | text | „most ajándék" |
| `cards.image` | upload → media | |

> **Fogyasztóvédelmi figyelmeztetés a mező leírásába:** az „értéke X Ft" állítás csak akkor
> írható ki, ha a bónusz **külön is megvásárolható ezen az áron**. Ha soha nem árulták külön,
> az összeg **megtévesztő ár-összehasonlítás**.

### B8. `fitCheck` — „Kinek jó / kinek nem"

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | |
| `fit` | group: `title` + `items` (array, max 12, `text`) | pipa-lista |
| `notFit` | group: `title` + `items` (array, max 12, `text`) | x-lista |
| `disclaimer` | textarea | „a kurzus nem helyettesíti a szakorvosi kontrollt" |

### B9. `curriculum` — Modulok / tananyag-szerkezet

| Mező | Típus | Megjegyzés |
|---|---|---|
| `title` | text | „Mi vár a programban?" |
| `lead` | textarea | |
| `modules` | array (max 12) | |
| `modules.label` | text | „I. modul" |
| `modules.title` | text, kötelező | „Az alapok" |
| `modules.items` | array (max 10, `text`) | a modul tartalma |
| `modules.meta` | text | „5 videó · 25 perc" |
| `summary` | array (max 15, `text`) | „Ezt kapod" összefoglaló lista |

### Feltételes, döntés után: `leadMagnetForm` és `comingSoon`

Csak akkor kell megépíteni, ha a vezető úgy dönt, hogy az ingyenes anyag e-mailes
opt-innal (is) elérhető legyen (Ny2), illetve ha kell „hamarosan" értesítő oldal.
Mezők: `title`, `body`, `bulletList`, `deliverable` (mit kap), `consentText`,
`successMessage`, `submitLabel`, opcionálisan `productRef`.

---

## 5. ELAVULT tartalom — amit TILOS átmásolni

> Ezek mind a jelenleg **élő** régi oldalon állnak. Ha bármelyik változatlanul átkerül,
> az jogi, fogyasztóvédelmi vagy üzemeltetési hibát okoz.

| # | Elavult elem | Hol | Miért tilos |
|---|---|---|---|
| **E1** | **Stripe** mint fizetési szolgáltató | `/aszf` (szó szerint: „a STRIPE fizetési felületén"), `/kezrehab` bizalmi jelvények, mindkét pénztároldal | Nálunk **Barion**. Minden Stripe-hivatkozást, logót és jelvényt cserélni kell. |
| **E2** | **Az ÁSZF kimondja: „nincs visszatérítés", a sales-oldal viszont 30 napos, „kérdés nélküli" garanciát ígér** | `/aszf` vs `/kezrehab` | **Önmagának ellentmondó** — ma is fogyasztóvédelmi kockázat. Az új ÁSZF-be a garanciát **bele kell írni**, vagy a garanciát le kell venni a marketingből. Nem lehet a kettőt külön-külön átmásolni. |
| **E3** | **„3 hónapig garantált hozzáférés" (ÁSZF) vs „hivatalosan minimum egy évig" (`/kezrelax`)** | `/aszf` vs `/kezrelax` | Két különböző hozzáférési idő ugyanarról. Nálunk az `accessDurationDays` a mérvadó — **azt** kell kiírni, egységesen. |
| **E4** | **39 700 Ft-os akciós ár** | `/kezrehab-akcio`, `/oto-kezrehab-akcio`, `/kezrehab-akcio-penztar` | A mi termékadatunk **79 500 Ft**. A 39 700 Ft-os oldalak élnek és indexeltek — ha átmásoljuk, két különböző ár lesz élesben ugyanarra a termékre. |
| **E5** | **„Eredeti ár: 119 000 Ft" áthúzott ár** | `/kezrehab`, `/kezrehab-akcio`, és a mi `kezrehabLongDescription()`-ünkben is | Áthúzott ár csak akkor tüntethető fel, ha a termék **valóban kapható volt ennyiért**. Az Omnibus-szabály szerint a hivatkozási ár a **megelőző 30 nap legalacsonyabb ára**. **Ez a szöveg már bent van nálunk** — ellenőrizni és szükség esetén törölni kell. |
| **E6** | **„közel 100 000 Ft értékű kedvezménykuponok" (Dream Team)** + a 3 bónusz feltüntetett értéke (29 900 / 19 900 / 19 900 Ft) | `/kezrehab`, nálunk a `longDescription`-ben | Csak akkor tartható, ha a kuponok **élnek** és a bónuszok **külön is megvásárolhatók** ezen az áron. Ellenőrzendő. |
| **E7** | **`egeszsegmozgastamogatas@gmail.com`** | `/impresszum`, `/aszf` | Gmail-cím hivatalos kapcsolattartóként. Az új jogi oldalakra a márkás cím (`info@kineticare.hu`) való. |
| **E8** | **Tárhely: Tárhely.Eu Kft.** | `/impresszum` | Nálunk **Railway** a szolgáltató. Az impresszum tárhely-szakasza **teljesen újraírandó**. |
| **E9** | **„© 2025 Kineticare"** | minden régi oldal lábléce | Elavult évszám. |
| **E10** | **55 és 25 perces kezelési alkalmak** | `/rendeloi-kezelesek-regi` | Az élő oldal **50 és 20 percet** ír, azonos áron. A `-regi` oldal adata elavult. |
| **E11** | **„a hozzáférési adatok e-mailben érkeznek"** | `/typ-kezrehab`, `/typ-kezrehab-akcio` | Nálunk a vevő **azonnal** hozzáfér a `/kurzusaim` alatt. A régi szöveg félrevezetné a vásárlót. |
| **E12** | **Adatvédelmi tájékoztató, ami nem nevezi meg az adatfeldolgozókat** | `/adatvedelem` (2025.05.05.) | Csak kategóriákat sorol fel. Az új tájékoztatóban **név szerint** kell szerepelnie: Barion, Számlázz.hu, Bunny Stream, Resend, Railway, PostHog. |
| **E13** | **Systeme.io funnel-mechanika** (`typ-*`, `*-penztar`, `/search`, duplikált akciós landingek) | 8 URL | A saját webshop ezt kiváltja. A funnel-oldalak duplikált tartalma **SEO-kannibalizáció** lenne. |
| **E14** | **5 idegen spam blogposzt** | sitemap | SEO-szennyezés. Sem átvétel, sem 301 nem kell. |
| **E15** | **A régi kezdőlap szekció-sorrendje** (ingyenes a 2. helyen, fizetős ár nélkül a 7.-en, 7 vélemény) | `/` | **Sérti az UX-skillt:** K2-hiba (M4), rejtett ár (M3), túl sok vélemény (M6). Csak a szövegeket vesszük át, a sorrendet **nem**. |
| **E16** | **„több mint ezer embernek segítettünk" vs „5000+ elégedett páciens"** | `/kezrelax` vs a mi `about` blokkunk | A két szám nincs összhangban. Az `about` blokk fejkommentje kimondja: **kitalált statisztika fogyasztóvédelmi kockázat**. Tisztázandó, melyik igaz. |
| **E17** | **SZTK-A-33553/2024 akkreditációs szám** | `/szolgaltatasok`, `/rolunk` | 2024-es akkreditáció. Ellenőrizni kell, **2026-ban is érvényes-e** — lejárt akkreditációra hivatkozni nem szabad. |

---

## 6. Nyitott kérdések a vezetőnek

| # | Kérdés |
|---|---|
| **Ny1** | **A Products entitás kapjon-e blokk-alapú `layout` mezőt?** A kurzusoldal értékesítési elemei (vélemények, GYIK, bónusz-kártyák, garancia, „kinek jó/nem", modulok) csak így hozhatók át rendesen. Az alternatíva: a `longDescription` rich-textje marad, és a hiányzó elemek fixen, kódból renderelődnek a kurzusoldalon. Ez **architekturális döntés**, ezért nem az ügynöké. |
| **Ny2** | **Maradjon-e az ingyenes SOS KézRelax 0 Ft-os webshop-termék, vagy legyen (újra) e-mailes lead-magnet?** A régi modell alacsonyabb súrlódású listaépítés, a mostani erősebb (valódi fiók, mérhető funnel). Ez határozza meg, kell-e `leadMagnetForm` blokk. |
| **Ny3** | **A 30 napos garancia marad?** Ha igen, az új ÁSZF-be bele kell írni (a régi kifejezetten tagadja). Ha nem, a `longDescription`-ből is törölni kell — ma benne van. |
| **Ny4** | **A 119 000 Ft „eredeti ár" valós?** Ha a program soha nem volt kapható ennyiért, az áthúzott ár kikerül a szövegből. |
| **Ny5** | **A „Dream Team" partnerkuponok (~100 000 Ft) élnek még?** Ha nem, a mondat törlendő. |
| **Ny6** | **Az akkreditáció (SZTK-A-33553/2024, 12 kredit) érvényes 2026-ban?** |
| **Ny7** | **„5000+ elégedett páciens" vagy „több mint ezer ember"?** Melyik a valós, alátámasztható szám? |
| **Ny8** | **Kell-e „hamarosan / értesíts, ha elindul" funkció** az új kurzusokhoz? |
| **Ny9** | **Kell-e 301-átirányítási térkép** a régi URL-ekről (`/kezrehab` → `/kurzusok/otthoni-kezrehab-program`, `/kezrelax` → a szabad kurzusra, `/rendeloi-kezelesek` → `/szolgaltatasok`)? A domain átállításakor ez SEO-értéket ment. |

---

## 7. NEM ELLENŐRIZHETŐ / bizonytalan pontok

Az alábbiakat **nem tudtam megbízhatóan megállapítani** — a leltárban ezért nem szerepelnek
tényként:

1. **A régi pénztároldalak tényleges ára és fizetési felülete.** A `/kezrehab-penztar` és
   `/kezrehab-akcio-penztar` fizetési szakasza JavaScriptből töltődik, a lekért HTML-ben
   sem ár, sem fizetési szolgáltató nem látszik. A **Stripe** megnevezés az ÁSZF-ből
   származik (szó szerinti idézet) — ez megbízható, de a pénztár aktuális beállítása nem.
2. **Az SOS KézRelax pontos videószáma.** A `/kezrelax` oldal **8 témát** sorol fel, a mi
   termékleírásunk viszont „a 3 legjobb gyakorlatunkat" említi. A tényleges videószám a
   zárt anyagon belül van, kívülről nem látható.
3. **A régi oldal képanyaga.** A `docs/legacy/README.md` szerint ~111 kép (~20 MB) tartozik
   a régi oldalhoz, de **ezek nincsenek a repóban** (csak a `typ-kezrehab.html` maradt bent).
   Nem tudtam ellenőrizni, mely képek kerültek át a Média collectionbe és melyek hiányoznak.
   A partnerlogók (16 db) átvételéhez ezek kellenek.
4. **A ProBody-workshop oldal tartalma** (`probodystudio.hu/kez-workshop/`) — partneroldal,
   nem a `kineticare.hu` része, ezért nem jártam be. Az akkreditált képzés részletei
   (időpont, ár, helyszín) ott élnek.
5. **A `/kezrelax` opt-in űrlap mezői.** A gombok űrlapra visznek, de a mezőlista
   JavaScriptből épül — csak a jelölőnégyzet szövege és a gombfeliratok voltak kiolvashatók.
6. **Miért jelenik meg 4 vélemény az éles kezdőlapon**, amikor a `testimonials` blokk
   `maxItems` mezője max. 3-at enged, és a seed 3-at hoz létre. Lehet mérési hiba a
   lekérésben, de érdemes szemrevételezni.
