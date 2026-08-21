# Tudástár — tartalmi mesterterv (cikk-kiírások)

> **Mi ez?** A Tudástár cikkeinek teljes terve: hány cikk készül, melyek, milyen
> sorrendben, és cikkenként pontos kiírás a cikkíró ügynököknek. A terv KIZÁRÓLAG
> mért adatra és a már ellenőrzött forrásbázisra épül.
>
> **Készült:** 2026-08-21 (az „A" orchestrátor terve).
> **Bemenetek:** `docs/kulcsszavak.md` · `docs/monid-adatok-teljes.md` ·
> `docs/kampanyterv-mert-adatokbol.md` · `docs/vevohang-es-hirdetesszoveg.md` ·
> `docs/seo-geo-llm.md` · `docs/orvosi-forrasbazis.md` ·
> `docs/tudastar-hangnem-es-technika.md` · `docs/tudastar-ux-terv.md`.
>
> **A legfontosabb szabály változatlan:** minden klinikai állítás mellé
> ellenőrizhető forrás kell; amit nem lehet forrásolni, azt nem írjuk le.
> Minden cikk LEKTORÁLANDÓ VÁZLAT (`draft`), amíg a két gyógytornász jóvá nem
> hagyta.

---

## 0. Hogyan használd ezt a tervet

- **Cikkíró ügynökként:** a 5. szakasz a minden cikkre közös kiírás, a 6. szakasz
  a te cikked egyedi kiírása. A kettő EGYÜTT a feladatod. Ha a kettő bármiben
  ütközni látszik, a 6. szakasz (egyedi kiírás) nyer, és a jelentésedben jelezd.
- **Vezetőként:** a 4. szakasz a sorrend, a 9. szakasz az ütemezés és az
  ellenőrzés, a 10. szakasz a döntést igénylő nyitott pontok.
- Klinikai állítás forrása KIZÁRÓLAG a `docs/orvosi-forrasbazis.md` lehet, az
  ottani azonosítókkal (CTS1…CTS10, ZS1…ZS6, TK1…TK6, PU1…PU6, DQ1…DQ5,
  CST1…CST9, CSF1…CSF3, V1…V7, VZ1…VZ7). Ha egy állításhoz nincs azonosító,
  az állítás nem kerülhet a cikkbe.

---

## 1. Döntés: hány cikk, és miért ennyi

### 1.1 Nem kulcsszavanként, hanem klaszterenként

A mérés egybehangzóan azt mutatja, hogy EGY jó cikk sok tucat rokon kifejezésre
rangsorol, tehát a kulcsszavankénti külön cikk pazarlás és kannibalizáció:

| Mért oldal | Hány kulcsszóra rangsorol | Forrás |
|---|---:|---|
| neurologiaikozpont.hu /kezzsibbadas | **155** | `docs/monid-adatok-teljes.md` 4.2 |
| medocklinika.hu kézzsibbadás-cikk | **143** | uo. 4.3 |
| gyogytornaszom.hu kézzsibbadás-cikk | **79** | uo. 4.1 |
| mozgasklinika.hu cikkei (a feladatkiírás mérése) | 30–162 | feladatkiírás |

Ezért a mért kulcsszavakat **klaszterekbe** rendeztem (2. szakasz), és
klaszterenként egy cikk készül. Egy klaszter = egy keresési szándék; két
kifejezés akkor kerül külön cikkbe, ha a Google is külön szándékot lát bennük
(pl. a `vállfájdalom` tünet-kereső, a `befagyott váll torna` gyakorlat-kereső).

### 1.2 A forrásbázis mint kapu

A kiírás alapszabálya, hogy forrás nélkül nincs állítás. Ezért a cikkszám nem
csak kereslet-, hanem **forrás-kérdés** is. A `docs/orvosi-forrasbazis.md` ma
kilenc témát fed le ellenőrzött forrásokkal; a mérésben talált további három
nagy lehetőségre (ínhüvelygyulladás, Dupuytren, hüvelykujj-fájdalom) **nincs
még forrás**, és a forrásbázis 12.3 pontja kimondja: előbb a forrás, aztán a
cikk.

### 1.3 A döntés: 12 cikk, két hullámban

- **1. hullám: 9 cikk, azonnal írható.** Mindegyikhez teljes forrásfedés van a
  forrásbázisban. Ezek együtt kb. **18 000 havi keresést** fednek le a mért,
  volumennel bíró klaszter-kifejezésekkel (a részletek a 4. szakasz
  táblázatában; az autocomplete-alakoknak nincs volumen-adatuk, azok ezen
  felül jönnek).
- **2. hullám: 3 cikk, forráskutatás UTÁN.** Ínhüvelygyulladás (a téma második
  legnagyobb kifejezése, 2 200 keresés!), Dupuytren-kontraktúra (600 + 200),
  hüvelykujj-fájdalom (kb. 1 150 a rokon alakokkal). Ezekhez először a
  forrásbázist kell bővíteni (7. szakasz, F1 kiírás), csak utána indulhat
  cikkíró.

**Amire tudatosan NEM készül cikk** (indoklás a 8. szakaszban): „lelki okai"
keresések, stroke/bénulás/gyerek kéztorna, termék-kulcsszavak (rögzítő, krém,
pánt), BNO-kód és „angolul" keresések, `gyógytornász továbbképzés`, lábfej.

---

## 2. Pillér–klaszter szerkezet

### 2.1 Az elv

A `docs/seo-geo-llm.md` 2.5 pontja tartalmi hubot kér. A mért volumen nem egy
általános pillérben él („otthoni gyógytorna": 10 keresés/hó), hanem a
**tünetekben** — ezért a pillérek tünet-oldalak, nem téma-oldalak:

- **P1 pillér — „Miért zsibbad a kezem?"** A legnagyobb mért hozamú célpont
  (450 keresés, **2 200 forgalmi potenciál**). A zsibbadás-klaszter hubja:
  innen ágazik a kéztőalagút-cikk (a leggyakoribb ok) és a többi ok.
- **P2 pillér — „Csukló- és kézfájdalom".** A fájdalom-klaszter hubja: az NHS
  tünet→ok táblája (CSF1) természetes elosztó a pattanó ujj, a De Quervain, a
  kéztőalagút és a törés-cikk felé. Kereskedelmileg a legértékesebb klaszter
  (kézfájdalom CPC $10, alkar fájdalom CPC $9).

A többi cikk a két pillér köré és a termék belépőjéhez rendezett tag-cikk.
A váll–könyök vonal (teniszkönyök, vállfájdalom, befagyott váll) kisebb, zárt
al-klaszter, saját belső linkeléssel.

### 2.2 A belső link-térkép (cikkek közti élek)

```
                    ┌────────────────────────────┐
                    │  KURZUS: Otthoni KézRehab  │ ← minden kéz-csukló-könyök
                    │  /kurzusok/otthoni-        │   cikk CTA-panelje
                    │  kezrehab-program          │
                    └────────────▲───────────────┘
                                 │
   P1 Miért zsibbad a kezem? ────┼──── P2 Csukló- és kézfájdalom
      │        │                 │            │     │      │
      ▼        ▼                 │            ▼     ▼      ▼
   Kéztőalagút ◄─────────────────┼──── Pattanó ujj  De Quervain
      │                          │            │
      ▼                          │            ▼
   Csuklótörés után (gipsz le) ──┘     (2. hullám: ínhüvely-,
                                        Dupuytren-, hüvelykujj-cikk)

   Váll–könyök al-klaszter:  Teniszkönyök ─→ P2 és kurzus
                             Vállfájdalom ◄──► Befagyott váll
                             (váll-CTA: időpontkérés, NEM a kézkurzus)
```

A pontos, cikkenkénti linklista a 6. szakasz kiírásaiban van; a szabály:
**minden törzsbeli link mondatba ágyazva** (a magában álló link gombbá válik,
`docs/tudastar-hangnem-es-technika.md` 2.6).

### 2.3 Miért nem készül külön „mega-pillér" oldal

Egy „Kézrehabilitáció otthon: teljes útmutató" típusú oldalra nincs mért
kereslet (`otthoni gyógytorna` 10, `kéztorna` 100, `online gyógytorna` 0
keresés). A pillér-szerep a két tünet-hubé; a „teljes rendszer" szerepét maga
a kurzusoldal tölti be. Ha fél év múlva a Search Console mást mutat, a döntés
újranyitható (`docs/kulcsszavak.md` 6.).

---

## 3. Kategória-döntés (a cikkírás ELŐTT rögzítendő)

A `docs/tudastar-hangnem-es-technika.md` nyitott kérdése volt; itt a döntés,
mert a slug utólagos átírása webcímet tör.

**Három kategória** (kevés, jól elkülönülő — `docs/szerkesztoi-utmutato.md` 5.):

| Kategória neve | Slug | 1. hullám cikkei | 2. hullám |
|---|---|---|---|
| Kéz és csukló | `kez-es-csuklo` | C1, C2, C4, C5, C9 | C10, C11, C12 |
| Váll és könyök | `vall-es-konyok` | C3, C7, C8 | — |
| Törés és műtét után | `tores-es-mutet-utan` | C6 | később bővül |

- Minden cikk PONTOSAN EGY kategóriát kap (a kártya egy címkét mutat,
  `docs/tudastar-ux-terv.md` 3.2).
- A kategóriát az első odaérő cikk-seed hozza létre idempotensen,
  `type: 'content'` mezővel (enélkül nem látszik — hangnem-doksi 2.3).
- A seedből ma létező „Tudástár" (`tudastar`) kategóriát NEM bántjuk; cikk nem
  kerül bele, üresen `noindex`, nem árt. A törlése szerkesztői döntés
  (10. szakasz).
- A „Váll és könyök" indoklása: a kettő együtt adja ki a lányok akkreditált
  képzésének címében is szereplő felső végtagi láncot, és így az 1. hullámban
  is 3 cikkes, élő kategória (a szűrő-küszöbhöz lásd `docs/tudastar-ux-terv.md`
  4.3).

---

## 4. Prioritási sorrend — megtérülés szerint

A sorrend a mért volumen, a nehézség (KD), a kereskedelmi érték (CPC, termék-
közelség) együttese. Ez egyben az írási és a determinisztikus `publishedAt`
sorrend is.

| # | Cikk | Elsődleges kifejezés | Keresés/hó | KD | A klaszter kb. összvolumene | Miért ez a helye |
|---|---|---|---:|---:|---:|---|
| C1 | Miért zsibbad a kezem? (P1 pillér) | kéz zsibbadás | 450 | 17 | ~2 500 | 2 200 forgalmi potenciál, a legnagyobb egyedi hozam |
| C2 | Kéztőalagút-szindróma | kéztőalagút szindróma | 1 200 | 5 | ~1 600 | Termék-legközelibb állapot; a SERP-en műtéti fal, konzervatív válasz nincs |
| C3 | Teniszkönyök | teniszkönyök | 3 500 | 13 | ~5 800 | A legnagyobb nyers volumen; a súlypont a mért `kezelése otthon` (400, KD 4) |
| C4 | Pattanó ujj | pattanó ujj | 800 | 0 | ~1 500 | Nulla verseny (a top 3 oldalnak összesen 3 backlinkje van — mért) |
| C5 | Csukló- és kézfájdalom (P2 pillér) | csukló fájdalom | 800 | 0 | ~1 350 | Hub + a legdrágább kattintású kifejezések (kereskedelmi érték) |
| C6 | Csuklótörés után | csuklótörés utáni gyógytorna | 100 | 0 | ~400 | Kis volumen, de PONTOSAN a termék belépője; a legmagasabb konverziós szándék |
| C7 | Befagyott váll | befagyott váll | 800 | 0 | ~1 400 | Üres terep + a legerősebb magyar forrás (BM-irányelv 002327) |
| C8 | Vállfájdalom | vállfájdalom | 1 600 | 20 | ~3 600 | Nagy volumen, de a lista legnehezebb kifejezése — később érik be |
| C9 | De Quervain (anyacsukló) | de quervain | 60 | 0 | ~510 | Kicsi, de nulla verseny + a legerősebb E-E-A-T bizonyíték (célzott továbbképzés) |

2. hullám (forráskutatás után, 7. szakasz): C10 ínhüvelygyulladás (~3 450),
C11 Dupuytren (~800), C12 hüvelykujj-fájdalom (~1 150).

`publishedAt` (determinisztikus, a hook csak üres mezőt tölt): C1 =
`2026-09-01T08:00:00.000Z`, C2 = 09-02, C3 = 09-03, … C9 = 09-09, mind
08:00:00 UTC. (A cikkek ettől még `draft`-ok; a dátum a lektorálás utáni
listarendezéshez kell.)

---

## 5. Közös kiírás — MINDEN cikkre érvényes

### 5.1 A vezérszög

**„Mit tehetsz, mielőtt műtétre kerül a sor."** A mért SERP-eken
(kéztőalagút, pattanó ujj) műtéti ajánlatok állnak; aki keres, gyakran épp a
műtét előtti lehetőségeit kutatja (`docs/kampanyterv-mert-adatokbol.md` 5.,
`docs/monid-adatok-teljes.md` 5.2). Ezért ahol a témában létezik konzervatív
út, a cikk súlypontja ez — DE két kötelező korláttal:

1. **A cikk nem műtét-ellenes.** Ahol a forrás kimondja, hogy a késlekedés árt
   (pl. AAOS a kéztőalagútról: kezeletlenül romolhat, tartós károsodásig —
   CTS9), azt ugyanolyan súllyal írjuk le.
2. **Nem ígérünk műtét-elkerülést.** A megfogalmazás mindig: „ezt lehet
   kipróbálni, mielőtt műtétre kerülne a sor", és mellette a forrásolt
   valóság (mit mond a bizonyíték, mennyire, meddig).

### 5.2 Kötelező cikkszerkezet (ebben a sorrendben)

1. **Lektorálási sáv** — az első bekezdés szó szerint: „Ez a szöveg
   lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása előtt nem
   publikálható."
2. **Nyitás** — a helyzet elismerése a beteg szavaival (CEP-elv,
   `docs/seo-geo-llm.md` 2.4), 2–3 rövid bekezdés. Az elsődleges kifejezés az
   első bekezdésben szerepel.
3. **Kérdés-alapú H2-k** a 6. szakasz szerinti vázból. Minden H2 alatt az ELSŐ
   mondat a teljes válasz, utána a kifejtés (GEO-szabály).
4. **„Mikor fordulj azonnal orvoshoz?"** — vörös zászló szakasz, kötelező
   minden cikkben, a forrásbázis 1. szakaszából, a témára szűkítve.
5. **„Mikor NE végezd a gyakorlatokat?"** — minden cikkben, ahol gyakorlati
   teendő szerepel (a meglévő termékleírás ellenjavallat-szemlélete).
6. **Kurzus-híd (CTA)** — az 5.5 szerint.
7. **Forrásjegyzék** — felsorolás; minden tétel: kiadó/szerző · cím · év ·
   link · hozzáférés dátuma; lektorált közleménynél PubMed-link (a kiadói
   oldalak bot-szűrése miatt — forrásbázis 12.2). A linkek tételen belül,
   sosem magukban álló bekezdésben.
8. **Záró disclaimer** — szó szerint a forrásbázis 13. szakaszából: „A cikk
   általános tájékoztatás, nem helyettesíti a szakorvosi vizsgálatot és a
   személyre szabott kezelést. Ha bizonytalan vagy, vagy a tünetek romlanak,
   fordulj orvoshoz."

### 5.3 Nyelv és hangnem (mérhető)

Normatív forrás: `docs/tudastar-hangnem-es-technika.md` 1. rész, TELJES
egészében, kiemelten:

- Tegező E/2, a szerző „mi" (a két gyógytornász), nevesítve.
- Mondathossz-cél 12 szó körül; átlag 15 alatt; a mondatok kétharmada 15 szó
  alatt (a hangnem-doksi függelékének parancsával MÉRENDŐ).
- Gondolatjel legfeljebb 5 / 1000 szó; kvirtmínusz (—) NULLA; idézőjel „ ".
- A vevő szavai: „kezelés", „alkalom", „gyakorlatok", „fájdalom"
  (`docs/vevohang-es-hirdetesszoveg.md` 2.).
- A panasz a beteg szavaival, az ok a szakma szavaival, kifejtve.
- Tilos: gyógyulási ígéret, saját gyógyulási arány/idő, diagnózis, kitalált
  szám, kitalált vélemény, sürgetés. A forrásolt lefolyás-adat (pl. a
  befagyott váll 59%-a az irányelv szerint) NEM a mi ígéretünk — mindig
  pontos attribúcióval szerepel.
- Számok szó szerint, a bizonytalanság kimondva (forrásbázis 0.2 és 0.3 —
  a bizonyítékerősség fordítókulcsát használd).

### 5.4 Terjedelem (irányszám, nem korlát)

A terjedelmet a H2-váz adja: minden H2 alatt önmagában is idézhető, teljes
válasz kell. Irányszám: tag-cikk 1 100–1 800 szó, pillér 1 400–2 200 szó
(5–10 perc olvasási idő a felület 200 szó/perces számításával). Ha egy H2-höz
nincs forrásolható tartalom, a H2 marad ki, nem a szabály.

### 5.5 CTA-k és a kurzus-híd

- **Kéz-, csukló-, könyök-témájú cikkek** (C1–C6, C9, később C10–C12): a
  cikkzáró CTA célja az **Otthoni KézRehab Program**
  (`/kurzusok/otthoni-kezrehab-program`). A program leírása szerint csukló-,
  ujj-, alkar- és könyökpanaszokra készült, tehát a híd őszinte. A törzsben
  EGY szöveglink-súlyú említés mehet az ingyenes SOS Kézrelax villámkurzusra
  (`/kurzusok/sos-kezrelax-villamkurzus`), jellemzően a „mit tehetsz otthon"
  szakaszban.
- **Váll-témájú cikkek** (C7, C8): a kurzus vállra NEM tesz ígéretet, ezért a
  CTA a **személyes vizsgálat/időpontkérés** (`/kapcsolat`). Kurzus-ígéret
  vállra TILOS.
- A CTA-szöveg híd-logikája a mért vevőhangból: a cikk ingyen segít, a kurzus
  a rendszerezett, vezetett folytatás — a „több hónapnyi, hiábavaló otthoni
  kezelés" ellenszere a vezetett program
  (`docs/vevohang-es-hirdetesszoveg.md` 3.).
- Gomb-feliratot a cikkíró NEM talál ki: a CTA linkje mondatba ágyazott
  szöveglink; ha a felület később panelt rajzol belőle, a felirat a
  `docs/ui-sztenderdek.md` §3.2 szótárából jön (#28 „Nyisd meg a
  kurzusoldalt", #10 „Nézd meg a kurzusokat").

### 5.6 SEO-mezők

- `title` = a kiírásban megadott H1. `seoTitle` = a kiírásban megadott alak.
- `excerpt`: 1–3 mondat, az elsődleges kifejezés az első mondatban; önállóan
  megálló szöveg (kártyára és meta-leírásba is megy).
- `seoDescription`: legfeljebb kb. 150 karakter, az elsődleges kifejezéssel.
- `slug`: a kiírásban rögzített alak, kézzel megadva (nem generáltatjuk).
- `heroImage`, `ogImage`: ÜRESEN marad (nincs jóváhagyott képanyag; a
  tartalék-viselkedést a felület adja — `docs/tudastar-ux-terv.md` K1).

### 5.7 Technikai bevitel

Normatív forrás: `docs/tudastar-hangnem-es-technika.md` 2. rész, kiemelten:

- **Fájl-tulajdonlás:** minden cikk KÜLÖN modul:
  `src/scripts/tudastar-cikkek/<slug>.ts`, amely a 2.9 minta szerinti
  `CIKK`-objektumot (title, slug, excerpt, seoTitle, seoDescription,
  publishedAt, kategória-slug + kategória-cím, szerző-név, relatedPosts
  slug-lista, content) exportálja. Egy cikkíró ügynök CSAK a saját moduljához
  nyúl. A közös futtatót (`src/scripts/seed-tudastar.ts`, `package.json`
  script, kategória- és szerző-feloldás, relatedPosts-kötés második
  menetben) a vezető által kijelölt integrátor írja, MIUTÁN a cikk-modulok
  készen vannak.
- Lexical-építők: a `restore-legacy-content.ts` exportált öt építője + a
  hangnem-doksi 2.7 pontjában megadott helyi kiegészítők (link, számozott
  lista, gyakorlatlista, vegyes listitem, hr) a cikk-modulban helyben. (Az
  esetleges közös helyre emelés a vezető döntése — hangnem-doksi nyitott
  kérdés 1.)
- Link SOHA nem áll magában bekezdésben (gombbá válna); YouTube-linket ne
  tegyél a szövegbe (beágyazódna).
- Táblázat NINCS a szerkesztőben: minden táblázatos tartalom felsorolás vagy
  alcím + bekezdés.
- Állapot: `status: 'draft'` ÉS `_status: 'draft'` EGYÜTT. `publishedAt` a
  4. szakasz szerinti determinisztikus dátum.
- Szerző: `author`-ként a kiírásban megadott nevű `users` rekordot kell
  keresni; ha nincs, a mező kimarad, és a jelentés jelzi (10. szakasz N1).
- Idempotencia slug alapján; `overrideAccess: true`; napló `payload.logger`;
  `any` tilos; `console.log` tilos; migráció nem kell és TILOS.

### 5.8 Elfogadási feltételek (minden cikkre)

A cikkíró a jelentésében tételesen igazolja:

1. A hangnem-doksi 1.9 checklistjének MINDEN pontja teljesül (a mondathossz
   és a gondolatjel-sűrűség MÉRVE, a függelék parancsával, a számok a
   jelentésben).
2. Minden klinikai állítás mellett ott a forrás-azonosító, és a szám szó
   szerint egyezik a forrásbázissal (szúrópróba helyett teljes öntesztet
   végezz: menj végig állításról állításra).
3. A kötelező szerkezeti elemek (5.2 1–8.) mind megvannak.
4. A tiltások (5.3, és a cikk egyedi tilalmai a 6. szakaszból) egyike sem
   sérül.
5. `npm run typecheck` és `npm run lint` zöld; a modul importálva
   mellékhatás-mentes.
6. A kiírt H2-váz minden pontja lefedve (vagy a kihagyás indokolva a
   jelentésben).
7. A jelentés szerkezete: mit csináltál · fájllista · hogyan ellenőrizted ·
   mért számok · nyitott kérdések.

---

## 6. Cikk-kiírások egyenként (1. hullám)

> A H2-k pontos, kérdés-alakú címek — az autocomplete-ből és a mért „Mások ezt
> is kérdezik" dobozokból jönnek (`docs/monid-adatok-teljes.md` 3.,
> `docs/kampanyterv-mert-adatokbol.md` 4.). A H2 alatti leírás megmondja, MIT
> és MELYIK forrásból kell megírni. A cikkíró a H2-k sorrendjén belül
> finomíthat a fogalmazáson, de kérdés-jelleget, első-mondat-válasz szabályt
> és forrás-kötést nem írhat felül.

### C1 — Miért zsibbad a kezem? (P1 pillér)

- **H1:** Miért zsibbad a kezem?
- **seoTitle:** Kéz zsibbadás: okok, éjszakai zsibbadás, teendők otthon
- **Slug:** `miert-zsibbad-a-kezem` · **Kategória:** Kéz és csukló ·
  **publishedAt:** 2026-09-01
- **Szerző:** Kiss Kata · **relatedPosts:** C2, C5, C6
- **Célkulcsszó:** kéz zsibbadás (450/hó, KD 17, forgalmi potenciál 2 200)
- **Klaszter:** kéz zsibbadás okai (250, KD 0) · jobb kéz zsibbadás (600, 17) ·
  bal kéz zsibbadás (500, 9) · bal kéz zsibbadás okai (450, 12) · jobb kéz
  zsibbadás okai (100, 18) · kéz zsibbadás éjszaka / alvás közben / reggel
  (autocomplete) · ujj zsibbadás + 14 alakja (autocomplete) · kéz fájdalom
  zsibbadás (autocomplete)

**H2-váz:**

1. **Mit jelent, ha zsibbad a kezed?** (mért PAA-kérdés) Első mondat: a
   zsibbadás tünet, nem betegség — azt jelzi, hogy egy ideg nyomás vagy
   irritáció alatt van, vagy más eltérés áll a háttérben (ZS1 alapján,
   óvatosan). Az NHS figyelmeztetése kimondva: ne diagnosztizáld magad (ZS1).
2. **Melyik ujjad zsibbad? A mintázat sokat elárul** — a hüvelyk–mutató–középső
   ujj zsibbadása leggyakrabban a csuklónál futó középideghez (kéztőalagút)
   köthető (CTS1, CTS9); a kisujj-oldal a könyöknél becsípődő singidegre utal
   (ZS5); az egész kar tünete nyaki eredetű is lehet (ZS3). Itt belső link a
   C2-re (kéztőalagút) mondatba ágyazva.
3. **Miért zsibbad a kezed éjszaka?** (mért PAA-kérdés) Első mondat: az
   éjszaka erősödő zsibbadás a kéztőalagút-szindróma jellegzetes mintázata
   (CTS1: a tünetek éjjel a legerősebbek; CTS9: felébreszt, a kéz rázogatása
   enyhíti). → C2 link.
4. **Számít, hogy a bal vagy a jobb kezed zsibbad?** (együtt 1 100+ mért
   keresés a bal/jobb alakokra) Első mondat: önmagában az oldal ritkán mondja
   meg az okot — a felsorolt okok bármelyik kézen jelentkezhetnek (ZS1
   listájából levezetve, ok-lista oldalfüggetlen). A kivétel kimondva: a
   HIRTELEN kezdődő, egyoldali zsibbadás arclelógással, karerőtlenséggel vagy
   beszédzavarral stroke-jel, azonnal 112 (VZ1). Szív-utalást írni TILOS
   (nincs rá forrás a bázisban).
5. **Mi okozhat még zsibbadást?** Az NHS-lista a beteg nyelvén: cukorbetegség,
   Raynaud (ha az ujjak színt váltanak), egyes gyógyszerek, becsípődött ideg a
   nyakban/hátban, sérülés utáni idegkárosodás, túlzott alkohol (ZS1). A
   cubitalis alagútnál az éjszakai sín bizonyítéka „nagyon alacsony" — ha
   szóba kerül, csak a bizonytalanság kimondásával (ZS6).
6. **Mit lehet tenni kézzsibbadás ellen otthon?** (mért PAA-kérdés) Első
   mondat: az első lépés a terhelés csökkentése és a csukló kímélő tartása; a
   kéztőalagút-eredetű zsibbadásnál az éjszakai csuklósín az, amire bizonyíték
   van (CTS3: rövid távon nagyobb eséllyel hoz általános javulást, mint a
   semmi — NNT 2, alacsony bizonyosság; olcsó, tartós ártalma nincs).
   Idegsiklató gyakorlatok: kiegészítőként, korlátozott bizonyítékkal (CTS10).
   Itt az SOS Kézrelax szöveglink-említés.
7. **Mikor fordulj azonnal orvoshoz?** Vörös zászlók: stroke-jelek (VZ1, a
   24 órán belül elmúlt tünet is sürgős!), sérülés utáni zsibbadás (VZ3),
   megszűnt érzés a kézen (VZ2).
8. **Mikor kell kivizsgálás, ha nem sürgős?** Bármilyen tartósan megmaradó
   bizsergés vagy érzéskiesés orvosi kivizsgálást igényel (VZ2/ZS1);
   cukorbetegség mellett a kézpanasz komolyabb lehet (VZ2).

- **Kurzus-híd:** a zsibbadás-panaszok egy részénél a csukló tehermentesítése
  és a fokozatos, vezetett gyakorlás segíthet a tünetek kezelésében — ez a
  kurzus terepe; műtéti döntést nem vált ki. → Otthoni KézRehab.
- **Egyedi tilalmak:** „lelki okai" tartalom TILOS (mért kereslet ide vonzana,
  de forrásolhatatlan — `docs/monid-adatok-teljes.md` 7.1). Diagnózis-fa
  („ha ez, akkor biztosan az") tilos: a cikk lehetőségeket sorol, nem
  diagnosztizál. Az „egérkéz" szó oksági állításként tilos (CTS2-konszenzus).

### C2 — Kéztőalagút-szindróma

- **H1:** Kéztőalagút-szindróma: mit tehetsz, mielőtt műtétre kerül a sor?
- **seoTitle:** Kéztőalagút-szindróma: tünetek és nem műtéti lehetőségek
- **Slug:** `keztoalagut-szindroma` · **Kategória:** Kéz és csukló ·
  **publishedAt:** 2026-09-02
- **Szerző:** Kocsis Kata · **relatedPosts:** C1, C9, C6
- **Célkulcsszó:** kéztőalagút szindróma (1 200/hó, KD 5, potenciál 1 000)
- **Klaszter:** tünetei (90, 12) · kezelése (150, 12) · kezelése házilag
  (autocomplete) · torna (70, KD 0, CPC $8!) · mitől alakul ki · hol fáj ·
  mi az · terhesség alatt (autocomplete) · műtét után (autocomplete) ·
  csuklórögzítő (100, 12 — csak az NHS-sín-kontextusban, termékajánlás nélkül)

**H2-váz:**

1. **Mi a kéztőalagút-szindróma, és mitől alakul ki?** A csuklóban futó
   középideg nyomás alá kerül, mert az alagút beszűkül vagy a környező szövet
   megduzzad (CTS1, CTS9); az esetek nagy részében több tényező együtt áll a
   háttérben (CTS9).
2. **Hol fáj, és mik a tünetei?** (autocomplete: „hol fáj") Zsibbadás és
   bizsergés főleg a hüvelyk-, mutató-, középső és gyűrűsujjban; éjjel a
   legerősebb; jellemző az ügyetlenség, a tárgyak elejtése (CTS1, CTS9).
3. **Ki kapja meg gyakrabban?** Rizikófaktorok névvel: túlsúly, terhesség,
   ismétlődő csuklóhajlítás/erős markolás, ízületi gyulladás, cukorbetegség,
   családi halmozódás, korábbi csuklósérülés (CTS1); alkati adottság,
   pajzsmirigyzavar, rheumatoid arthritis (CTS9). Terhességnél külön mondat:
   az NHS szerint ilyenkor néha néhány hónap alatt magától rendeződik (CTS1).
4. **Tényleg a sok gépelés okozza?** Első mondat: a szakértői munkacsoport
   szerint a sok billentyűzethasználat és a kéztőalagút-szindróma között
   nincs igazolt összefüggés (CTS2, konszenzus — a fordítókulcs szerint
   „a szakmai munkacsoport véleménye szerint"). Ez a szakasz tudatos
   tévhit-oszlatás, jól idézhető chunk.
5. **Mit tehetsz, mielőtt műtétre kerül a sor?** A cikk súlypontja.
   a) Éjszakai sín: az NHS első lépése; akár 6 hét, mire javulni kezd (CTS1);
   a Cochrane szerint rövid távon nagyobb eséllyel hoz általános javulást,
   mint a kezelés-nélkül (NNT 2, alacsony bizonyosság), a tüneti skálán a
   különbség a klinikailag érdemi küszöb alatt marad — és a szerzők kimondják:
   olcsó, tartós ártalma nincs, pont annak való, aki még nem szeretne műtétet
   vagy injekciót (CTS3, az idézet magyarra fordítva, forrásmegjelöléssel).
   b) Injekció: 3 hónapon belül valószínűleg javít, a hatás 6 hónapig
   kimutatható, de nem gyógyít — az AAOS szerint hosszú távú javulást nem hoz
   (CTS4, CTS2); a sín–injekció összehasonlításban 24 hónapnál már nincs
   különbség (CTS7, CTS8).
   c) Idegsiklató gyakorlatok: az AAOS a lehetőségek közt sorolja; az
   áttekintés szerint önmagában korlátozott a bizonyíték, kiegészítőként
   gyorsíthatja a funkció visszatérését (CTS9, CTS10).
   d) ŐSZINTESÉG-BLOKK (kötelező, a forrásbázis 11.2/a döntése szerint): az
   AAOS 2024 szerint a konzervatív módszerek között nincs jelentős különbség,
   és a gyakorlatozás, a masszázs, a manuálterápia a hosszú távú, beteg által
   jelentett eredményt nem javítja (CTS2). Ezért a keretezés: a rendezett,
   vezetett program a tünetek kezelésére és az időszak átvészelésére való,
   nem gyógyulási ígéret.
6. **Meddig tart, míg javul?** A forrásbázis 10. táblázatának CTS-sorai szó
   szerint: sín akár 6 hét; injekció-hatás 3–6 hónap; terhességi eset néha
   magától; műtét utáni idők külön a 8. H2-ben.
7. **Mikor kell mégis orvoshoz, és mikor merül fel a műtét?** Romló vagy nem
   múló tünetek (CTS1); állandósult érzéskiesés, gyengülő szorítóerő,
   izomsorvadás; az AAOS szerint kezeletlenül idővel romolhat, akár tartós
   károsodásig (CTS9). A műtét kontra konzervatív bizonyíték őszintén: hosszú
   távon a műtét valószínűleg gyakrabban hoz javulást, de a tünetekben és a
   funkcióban klinikailag érdemi többletet valószínűleg nem ad (CTS6).
   A döntés orvosi; a cikk nem beszél le és nem beszél rá.
8. **Mi a helyzet a műtét után?** (autocomplete: „műtét után") Rövid szakasz:
   megszokott tevékenységek kb. egy hónap; szorító- és csippentőerő 2–3
   hónap; súlyos idegkárosodás után 6–12 hónap; teljes felépülés akár egy év
   (CTS1, CTS9 — a 10. táblázat sora). A fokozatos, vezetett gyakorlás
   ilyenkor is számít → C6 link (törés-cikk elvei) és kurzus-híd.

- **Kurzus-híd:** Otthoni KézRehab; a szövegben az 5.d őszinteség-blokk UTÁN,
  vele összhangban.
- **Egyedi tilalmak:** „a torna meggyógyítja" tilos (forrásbázis 11.1);
  csuklórögzítő/krém termékajánlás tilos; a CTS-6 diagnosztikai pontrendszer
  említhető mint „a diagnózis orvosi eszköze" (CTS2), de öndiagnózis-eszközként
  tilos leírni.

### C3 — Teniszkönyök

- **H1:** Teniszkönyök: mit tehetsz otthon, és mit kerülj?
- **seoTitle:** Teniszkönyök kezelése otthon: gyakorlatok, időtáv, tévhitek
- **Slug:** `teniszkonyok` · **Kategória:** Váll és könyök ·
  **publishedAt:** 2026-09-03
- **Szerző:** Kocsis Kata · **relatedPosts:** üresen (a kategória-fallback
  adja a váll-cikkeket)
- **Célkulcsszó:** teniszkönyök (3 500/hó, KD 13)
- **Klaszter:** teniszkönyök kezelése (800, 21) · kezelése otthon (400, 4 —
  a cikk SÚLYPONTJA, `docs/monid-adatok-teljes.md` 6.) · tünetei (350, 0) ·
  könyökfájdalom (700, 0) · teniszkönyök gyógytorna (autocomplete + fizetett
  kw 210) · mitől alakul ki · hol fáj · házi gyógymód · kezelése házilag
  (autocomplete)

**H2-váz:**

1. **Mi a teniszkönyök, és mitől alakul ki?** Első mondat: a teniszkönyök a
   könyök külső oldalán tapadó ínszövet túlterheléses elváltozása — a mai
   szakirodalom nem gyulladásnak, hanem tendinopathiának tartja (TK2: az
   ínszövet elfajulása, mikroszakadásai). Kiket érint: 35–54 év között a
   leggyakoribb, és nem csak sportolókat — festők, szerelők, szakácsok,
   gépelők (TK1, TK2).
2. **Honnan tudod, hogy a könyökfájdalmad teniszkönyök?** (a `könyökfájdalom`
   700 keresés célzása) A teniszkönyök jellegzetes helye és tünetei a
   TK1/TK2 leírásából. FIGYELEM: a golfkönyök-összevetést CSAK akkor írd
   meg, ha a TK2 (AAOS OrthoInfo) oldalán a belső oldali forma szó szerint
   szerepel; ha nem találod ott, a szakasz vége ennyi: ha a fájdalom máshol
   jelentkezik, más ok is állhat mögötte, ezt szakember tudja megítélni.
3. **Mennyi idő alatt gyógyul a teniszkönyök?** (mért PAA-kérdés) Első
   mondat: általában pihenéssel magától elmúlik, de néha egy évnél tovább is
   eltarthat (TK1). Számokkal: 52 hétnél a gyógytornás csoport 91%-a, a
   „várunk és figyelünk" csoport 83%-a, az injekciós csoport 69%-a számolt be
   sikeres kimenetelről (TK3); a nem műtéti kezelés a betegek kb. 80–95%-ánál
   sikeres (TK2). Ez a cikk legidézhetőbb chunkja — a számok szó szerint,
   forrással.
4. **Mit érdemes tudni a szteroidinjekcióról?** Rövid távon látványos, hosszú
   távon rosszabb: 6 hétnél az injekció a legjobb, de a sikeres esetek nagy
   részénél visszaesés jött, és egy évnél már a gyógytorna és a várakozás is
   jobb eredményt adott (TK3, TK4 — a Bisset-vizsgálatban 65-ből 47
   visszaesés). A hangnem tárgyilagos: nem lebeszélünk, a kezelőorvossal kell
   megbeszélni.
5. **Mit tehetsz otthon?** (a súlypont: `teniszkönyök kezelése otthon`)
   NHS-lista a beteg nyelvén: a rontó tevékenységek átmeneti kerülése vagy
   csökkentése; meleg vagy hideg borogatás törölközőben, legfeljebb 20 perc,
   2–3 óránként; egyszerű hajlító-nyújtó gyakorlatok; patikai alkarpánt vagy
   rögzítő (TK1). A gyakorlatok bizonyítéka őszintén: a gyakorlatozás jobb a
   passzív kezeléseknél, de a hatás kicsi (TK5); az excentrikus gyakorlat
   kiegészítésként javítja a fájdalmat és az erőt (TK6). Itt az SOS Kézrelax
   szöveglink (a villámkurzus a könyök-területet is érinti).
6. **Mikor menj gyógytornászhoz vagy orvoshoz?** Ha 6 hét otthoni kezelés
   után sincs javulás, gyógytorna; ha 6–12 hónap kezelés eredménytelen, a
   műtét kérdése merül fel — orvosi döntés (TK1). Vörös zászlók: sérülés
   utáni alakváltozás, zsibbadás, láz (VZ2, VZ3 releváns sorai).
7. **Mit kerülj, amíg fáj?** A tüneteket rontó fogás- és csuklómozdulatok
   listája a TK1 alapján; „mikor NE gyakorolj" blokk (éles fájdalom = állj
   meg, kérj segítséget — a meglévő termékszöveg óvatossági fordulata).

- **Kurzus-híd:** Otthoni KézRehab (a program a könyököt kifejezetten fedi).
- **Egyedi tilalmak:** a „gyulladás" szót okként ne használd (a forrás
  tendinopathiát mond — a köznyelvi név attól még leírható); pánt/tape
  termékajánlás márkanévvel tilos; gyógyulási időt a 3. H2 forrásolt számain
  túl ne ígérj.

### C4 — Pattanó ujj

- **H1:** Pattanó ujj: miért akad be az ujjad, és mit tehetsz otthon?
- **seoTitle:** Pattanó ujj: okai, kezelése házilag, és mikor kell orvos
- **Slug:** `pattano-ujj` · **Kategória:** Kéz és csukló ·
  **publishedAt:** 2026-09-04
- **Szerző:** Kiss Kata · **relatedPosts:** C5, C9, C2
- **Célkulcsszó:** pattanó ujj (800/hó Ahrefs, 1 900 Semrush; KD 0)
- **Klaszter:** kezelése házilag (350, 0) · szindróma (150, 0) · műtét utáni
  gyógyulási idő (150, 0) · gyógytorna videó (150) · kéztorna pattanó ujjra
  (autocomplete) · hüvelykujj érintettség (a hüvelyk-alakok részben ide, a
  De Quervain-átfedést a C9 viszi)

**H2-váz:**

1. **Mi történik az ujjadban, amikor „pattan"?** Az ujj hajlítóínja és az
   A1-gyűrű egyensúlya borul fel: az ín megvastagszik vagy csomót képez, és
   nem csúszik át simán — ez adja az akadást és a pattanást (PU2).
2. **Miért reggel a legrosszabb?** A merevség és az akadás reggel, illetve
   mozdulatlanság után a legerősebb, napközben óvatos használat mellett
   javulhat (PU2) — a vevő pontosan ezt éli meg, a nyitó CEP erre épülhet.
3. **Kinél gyakori?** A lakosság kb. 2%-át érinti; leggyakrabban a gyűrűs- és
   a hüvelykujjat; gyakoribb 40–60 közötti nőknél, cukorbetegeknél és
   rheumatoid arthritisben (PU2, PU1).
4. **Elmúlhat magától?** Első mondat: igen, az NHS szerint a pattanó ujj néha
   kezelés nélkül is rendbe jön (PU1). Utána a de: ha akadályozza a
   mindennapokat vagy nem javul, kell a kivizsgálás (PU1).
5. **Mit tehetsz otthon, és mit mond a kutatás a sínről?** A sínezés a
   kutatások szerint rövid távon következetesen csökkenti a fájdalmat és az
   akadást — akár 97%-os sikerarányról is beszámoltak, az injekcióhoz
   hasonló mértékben, annak mellékhatás-kockázata nélkül (PU6, a „rövid táv"
   kimondásával); az ajánlás egyetlen ízület rögzítése 6–10 hétre (PU3);
   randomizált vizsgálatban a sín önmagában ajánlott kezdő kezelésként, a
   sín+injekció kombináció nem adott többletet (PU4). A sín kiválasztása és
   beállítása szakember dolga — a cikk nem ír fel eszközt.
6. **Sín, injekció vagy műtét: mi mennyire válik be?** A konzervatív út
   összesen 68,9%-nál hozott megszűnést vagy javulást; enyhébb fokozatnál kb.
   75%, előrehaladottnál 60%, és az utóbbiak gyakrabban jutottak műtétre
   (PU5). Cukorbetegeknél az injekció kisebb eséllyel hat, és megemelheti a
   vércukrot (PU2). A döntés orvosi.
7. **Mikor fordulj azonnal orvoshoz?** VÖRÖS ZÁSZLÓ kiemelten: ha az ujj
   duzzadt, félig behajlítva áll, nyújtásra nagyon fáj és az ínhüvely mentén
   nyomásérzékeny, az gennyes ínhüvelygyulladás lehet — a kéz egyik
   legsúlyosabb fertőzése, azonnali orvosi ellátást igényel (VZ5, VZ6).
8. **Mi a helyzet a műtét után?** (150 keresés a gyógyulási időre) A seb
   néhány hét alatt gyógyul, a duzzanat és merevség 4–6 hónap alatt múlik, a
   teljes felépülés érzete átlagosan 6 hónap (PU2). A kéz fokozatos
   visszaterhelése ilyenkor is vezetett gyakorlást kíván → kurzus-híd.

- **Videó-jegyzet a vezetőnek:** a `pattanó ujj gyógytorna videó` (150
  keresés) és a SERP-en álló YouTube-találat miatt ehhez a cikkhez érdemes
  ELSŐKÉNT saját videót készíteni, ha a lányok forgatnak. A cikk szövege ettől
  független, videó nélkül is teljes; YouTube-linket a cikkbe NE tegyél (2.6
  beágyazás-csapda + még nincs saját videó).
- **Egyedi tilalmak:** „lelki okai" tartalom tilos; a 97%-os szám csak a
  rövid táv és a forrás kimondásával; fokozat-önbesorolásra buzdítás tilos.

### C5 — Csukló- és kézfájdalom (P2 pillér)

- **H1:** Csukló- és kézfájdalom: mi okozhatja, és mit tehetsz?
- **seoTitle:** Csukló fájdalom és kézfájdalom: okok, teendők otthon
- **Slug:** `csuklo-es-kezfajdalom` · **Kategória:** Kéz és csukló ·
  **publishedAt:** 2026-09-05
- **Szerző:** Kiss Kata · **relatedPosts:** C2, C4, C6
- **Célkulcsszó:** csukló fájdalom (800/hó, KD 0 — külön írva!)
- **Klaszter:** csuklófájdalom (150, 0 — egybeírt alak, mindkettő kell,
  `docs/monid-adatok-teljes.md` 1.5) · kézfájdalom (150, 0, CPC $10) · alkar
  fájdalom (250, 0, CPC $9) · kéz csukló fájdalom · kéz és csukló fájdalom ·
  kéz alkar fájdalom · csuklófájdalom kezelése · csuklófájdalom milyen orvos +
  kéz fájdalom milyen orvos (autocomplete!) · hirtelen csuklófájdalom ·
  csuklófájdalom terhesség alatt (autocomplete)

**H2-váz:**

1. **Mi okozhat csukló- és kézfájdalmat?** A pillér-funkció magja: az NHS
   tünet→lehetséges ok táblája FELSOROLÁSKÉNT újraírva (táblázat nincs a
   szerkesztőben!): sérülés utáni éles fájdalom + pattanó hang → törés
   gyanúja; fájdalom + duzzanat + véraláfutás → rándulás; tartós fájdalom a
   hüvelykujj tövénél → De Quervain vagy artrózis; éjjel erősödő zsibbadás →
   kéztőalagút; sima tapintású csomó → ganglion (CSF1). MINDEN tételből belső
   link a részletes cikkre mondatba ágyazva (C6, C9, C2, C4). Kimondva: a
   lista tájékozódásra való, nem öndiagnózisra (VZ2: „ne próbáld magad
   diagnosztizálni").
2. **Sérülés után fáj? Ezt figyeld** — rándulás kontra törés jelei; mikor
   kell aznap ellátás: erős fájdalom, hányinger, reccsenő hang a sérüléskor,
   mozgathatatlan csukló, alak- vagy színváltozás, érzéskiesés (VZ2, VZ3).
3. **Sokat gépelsz, emelsz, hangszeren játszol? A terheléses fájdalom** —
   az NHS a fájdalmat okozó tevékenység csökkentését ajánlja (gépelés, rezgő
   szerszám, hangszer) (CSF1). Az árnyalás kötelező: a terhelés a TÜNETEKET
   ronthatja, de például a sok billentyűzethasználat és a kéztőalagút-
   szindróma OKSÁGI kapcsolata nem igazolt (CSF3). Alkar-fájdalomra külön
   bekezdés (a 250 keresés + $9 CPC miatt): az alkarra sugárzó terheléses
   fájdalomnál ugyanezek az elvek érvényesek, könyök-eredetnél → C3 link.
4. **Mit tehetsz otthon az első napokban?** NHS-lista: pihentetés; jég
   törölközőben legfeljebb 20 perc, 2–3 óránként; a kéz és csukló finom
   mozgatása; sín éjszakára patikából; ékszer le, ha duzzad (CSF1). És a
   „mit NE" blokk szó szerint forrásolva: az első 2–3 napban ne melegítsd,
   ne emelj nehezet, ne szoríts erősen (CSF1).
5. **Milyen orvoshoz fordulj, és mikor?** (szó szerinti autocomplete-kérdés)
   Első lépésként a gyógyszerész is tud segíteni fájdalomcsillapító és sín
   ügyében, és abban, kell-e orvos (CSF1); ha a fájdalom két hét otthoni
   kezelés után sem javul, orvoshoz kell fordulni (VZ2); zsibbadásnál,
   bizsergésnél szintén (VZ2). Magyar ellátási utat (beutalórend) NE
   részletezz — nincs rá forrás; a „háziorvos, aki továbbirányít" általános
   megfogalmazás elég.
6. **Mikor menj azonnal?** A vörös zászló lista: erős fájdalom ájulásérzéssel
   vagy lázzal; deformitás; megszűnt érzés; nagyon fájdalmas, forró, piros
   duzzanat (VZ2); a duzzadt, behajlítva tartott, nyújtásra fájó ujj (VZ5,
   VZ6).
7. **Két hét után sem jobb? Így tovább** — a két hetes NHS-küszöb kimondása
   újra, a gyógytornász szerepe, és a kurzus-híd: ha a kivizsgálás nem talál
   sürgős okot, a fokozatos, vezetett gyakorlás a következő lépés.

- **Kurzus-híd:** Otthoni KézRehab + törzsben SOS-link a 4. H2-nél.
- **Egyedi tilalmak:** öndiagnózis-fa tilos; gyógyszernév-ajánlás a
  forrásban szereplő általánosságon túl (paracetamol/ibuprofén gél említése
  az NHS-tanács részeként megengedett, adagolási tanács TILOS).

### C6 — Levették a gipszet: csuklótörés után

- **H1:** Levették a gipszet a csuklódról: mi jön most?
- **seoTitle:** Csuklótörés utáni gyógytorna: mikor kezdd, meddig tart
- **Slug:** `csuklotores-utani-gyogytorna` · **Kategória:** Törés és műtét
  után · **publishedAt:** 2026-09-06
- **Szerző:** Kocsis Kata · **relatedPosts:** C1, C5, C2 (kézzel kötelező —
  a kategóriában egyedül áll, fallback nem adna semmit)
- **Célkulcsszó:** csuklótörés utáni gyógytorna (100/hó, KD 0)
- **Klaszter:** csukló orsócsont törés gyógyulási ideje (300, 0, CPC $10) ·
  csuklótörés gyógyulási ideje (autocomplete) · csuklótörés utáni gyógytorna
  gyakorlatok (autocomplete) · csuklótörés után mikor lehet dolgozni
  (autocomplete) · kéztorna törés után + kéztorna csuklótörés után
  (autocomplete) · csuklótörés gipsz (autocomplete)

**H2-váz:**

1. **Mikor veszik le a gipszet, és mi történik utána?** Ha nem kellett műtét,
   a gipsz jellemzően 4–6 héttel a törés után jön le, és ekkor indul a
   gyógytorna (CST2). A leggyakoribb csuklótörés az orsócsont (radius)
   távolabbi végének törése — a kifejezés kimondva a `orsócsont törés`
   keresések miatt (CST2, CST3 tárgya).
2. **Meddig tart a gyógyulás csuklótörés után?** (a 300 kereséses kérdés)
   Idővonal, minden szám a 10. táblázatból szó szerint: felépülés kb. 6–8 hét
   (CST1); a legtöbb törés kb. 3 hónap alatt gyógyul annyira, hogy a csukló
   mindenre használható; a teljes felépülés akár egy év; a merevség a
   gipszlevétel utáni 1–2 hónapban javul a legtöbbet, és legalább két évig
   tovább javul (CST2). Ez a cikk legidézhetőbb chunkja.
3. **Mikor lehet újra sportolni és dolgozni?** Sport: könnyű mozgás (úszás,
   alsótest) a gipszlevétel után 1–2 hónappal, megterhelő sport a sérülés
   után 3–6 hónappal (CST2). A munkára KONKRÉT számot ne írj — nincs forrás;
   az elv: a munkaterheléstől függ, a kezelőorvossal kell egyeztetni (a NICE
   tájékoztatási elve: a szokásos tevékenységekhez visszatérés ideje a
   kötelező betegtájékoztatás része — CST5).
4. **Miért kell az ujjaidat AZONNAL mozgatni?** A gipsz vagy a műtét után
   azonnal mozgatni kell az ujjakat; ha a fájdalom vagy duzzanat miatt 24
   órán belül nem megy a teljes ujjmozgás, szólni kell az orvosnak (CST2).
   Emelés: a kéz lehetőleg könyök fölött, éjszaka párnán (CST1).
5. **Otthoni gyakorlás vagy felügyelt gyógytorna?** A termék-kérdés, ŐSZINTÉN:
   az AAOS–ASSH irányelv szerint a bizonyíték nem következetes, és nem mutat
   különbséget az otthoni gyakorlatprogram és a felügyelt terápia eredményei
   között distalis radius törés után (CST3, „Limited" erősség kimondva);
   a Cochrane-áttekintés is bizonytalan bizonyítékot talált (CST4). A NICE a
   beteg aktív részvételét nevezi kulcsnak (CST5). A keretezés: nem az a
   kérdés, hogy otthon vagy rendelőben — hanem hogy rendszeresen, jó
   sorrendben, fokozatosan történik-e. (A mért vevőhang mondata ide illik:
   sokan próbálkoznak otthon program nélkül, és azért buknak el.)
6. **Mire figyelj a gipsz alatt és a levétel után? (vörös zászlók)** Gipsz
   alatt: erősödő fájdalom, zsibbadó vagy elszíneződő ujjak, kilazult vagy
   szorító gipsz, váladék, rossz szag → azonnal ellátás (VZ3). A levétel
   után: ha a fájdalom sokkal erősebb és tartósabb, mint amit a sérülés
   indokolna, a bőr extrém érzékennyé válik, a terület duzzad, színe vagy
   hőmérséklete ingadozik, orvoshoz kell fordulni (CST9 — CRPS-leírás).
   SZÁZALÉKOT a CRPS-ről írni TILOS (CST6/CST7 szórása miatt — forrásbázis
   7. és 11.1).
7. **Hogyan épül fel egy értelmes otthoni program?** Elvek, nem konkrét
   gyakorlatsor: fokozatosság, rendszeresség, fájdalomhatár (éles fájdalomnál
   állj meg és kérj segítséget — a meglévő termékszöveg fordulata), türelem a
   merevséggel (a 2. H2 időtávjaira visszautalva, de önállóan érthetően).
   Zsibbadás a gipsz után → C1 link. Majd kurzus-híd: a program pontosan ezt
   a vezetett, sorrendbe rakott gyakorlást adja; műtét vagy törés után mindig
   a kezelőorvos jóváhagyásával kezdd (a meglévő óvatossági fordulat szó
   szerint).

- **Kurzus-híd:** Otthoni KézRehab — ez a legmagasabb konverziós szándékú
  cikk, a híd itt a legtermészetesebb.
- **Egyedi tilalmak:** CRPS-százalék TILOS; munkába-visszatérés konkrét ideje
  TILOS; a „csontgyógyulás gyorsítása" típusú állítás (C-vitamin stb.) TILOS
  (CST8: nincs elég bizonyíték egységes megelőzési protokollhoz).

### C7 — Befagyott váll

- **H1:** Befagyott váll: meddig tart, és mit tehetsz ellene?
- **seoTitle:** Befagyott váll: tünetek, stádiumok, torna otthon
- **Slug:** `befagyott-vall` · **Kategória:** Váll és könyök ·
  **publishedAt:** 2026-09-07
- **Szerző:** Kiss Kata · **relatedPosts:** üresen (kategória-fallback)
- **Célkulcsszó:** befagyott váll (800/hó, KD 0)
- **Klaszter:** befagyott váll torna (350, 0) · befagyott váll szindróma
  (250, 0) · torna gyakorlatok · gyógytorna · kezelése otthon · tünetei ·
  mitől alakul ki (autocomplete)

**H2-váz** (a gerinc a magyar BM-irányelv — V1; ez a legerősebb magyar
forrásunk, minden számot pontosan onnan):

1. **Mi a befagyott váll, és mitől alakul ki?** Az ízületi tok elváltozása
   (adhesiv capsulitis); a lakosság 2–5,3%-át érinti, életkori csúcs 40–60
   év; cukorbetegeknél a gyakoriság 39%; az érintettek több mint 80%-ánál
   kimutatható társbetegség (V1 — a számok betűhíven).
2. **Milyen szakaszai vannak?** A három stádium hónap-sávokkal, felsorolásként:
   I. 2–9. hónap (éles fájdalom a mozgáspálya végén, alvászavar), II. 4–12.
   hónap (a „fagyás", több irányban szűkülő mozgás), III. 12–42. hónap (a
   mozgás jelentős beszűkülése) (V1).
3. **Meddig tart, és meggyógyul?** Első mondat: az irányelv szerint a tünetek
   a kezdettől átlagosan 1–3 évig tartanak. A lefolyás-adatok PONTOS
   attribúcióval: az irányelv szerint az érintettek 59%-a maradéktalanul
   meggyógyul, 35%-nál enyhe-mérsékelt tünetekkel zajlik, 6% számol be súlyos
   tünetekről; kiújulás nem jellemző, az ellenoldalon 6–17%-ban jelenhet meg
   5 éven belül (V1). Ez NEM a mi ígéretünk — a mondat alanya mindig az
   irányelv.
4. **Mit mond a magyar szakmai irányelv a kezelésről?** Az ellátás első
   vonala a fizioterápia, illetve fizioterápia + kortikoszteroid injekció
   (korai stádiumban „A" szintű evidencia); a betegoktatás erős ajánlás
   (LE: 1b), és az irányelv kifejezetten kimondja az OTTHON, rendszeresen
   végzett mobilizáló és erősítő gyakorlatok jelentőségét (Ajánlás12,
   Ajánlás16) (V1). Ez a szakasz a Kineticare-pozíció legerősebb forrásolt
   magja — pontosan, túlzás nélkül.
5. **Mit tehetsz otthon?** A betegoktatási elvek a beteg nyelvén: a váll
   kímélete ≠ mozdulatlanság; az NHS szerint maradj aktív, finoman mozgasd,
   és ne hagyd abba teljesen a váll használatát, mert az hátráltatja a
   gyógyulást (V2); a gyakorlat személyre szabása gyógytornász dolga (V1
   Ajánlás15: egyéni kezelés ajánlott).
6. **Mi van, ha a torna nem elég?** A második vonal megnevezve, döntés
   nélkül: hidrodilatáció, artroszkópos release, altatásban végzett
   bemozgatás — mind orvosi döntés (V1).
7. **Mikor fordulj orvoshoz? (vörös zászlók)** Az irányelv nevesített vörös
   zászlói: daganat gyanúja, ízületi fertőzés, nem helyretett ficam, akut
   trauma képalkotó nélkül, polyarthritis; súlyos neurológiai tünet esetén
   azonnal (V1 Ajánlás9). Plusz az NHS váll-jelei: hirtelen nagyon erős
   fájdalom, mozdíthatatlan kar, alakváltozás, láz (VZ4).

- **CTA:** NEM a kézkurzus! Időpontkérés/személyes vizsgálat a `/kapcsolat`
  oldalra, mondatba ágyazva. A kurzust vállra ajánlani TILOS.
- **Egyedi tilalmak:** a lefolyás-számok mindig az irányelvre attribuálva;
  cukorbeteg-adat tájékoztatás, nem ijesztgetés; speciális önteszteket
  ajánlani tilos (V1 Ajánlás7: megbízható speciális teszt nem ismert).

### C8 — Vállfájdalom

- **H1:** Vállfájdalom: mikor elég a torna, és mikor kell orvos?
- **seoTitle:** Vállfájdalom okai: mit tehetsz otthon, mikor menj orvoshoz
- **Slug:** `vallfajdalom` · **Kategória:** Váll és könyök ·
  **publishedAt:** 2026-09-08
- **Szerző:** Kocsis Kata · **relatedPosts:** üresen (kategória-fallback)
- **Célkulcsszó:** vállfájdalom (1 600/hó, KD 20)
- **Klaszter:** váll fájdalom (600, 17 — külön írt alak is kell!) ·
  vállfájdalom okai (450, 12) · baloldali vállfájdalom (400, 9) · bal váll
  fájdalom (300, 8) · jobb váll fájdalom (250, 8) · rotátorköpeny-témák (a
  versenytárs mért 548 látogatós oldala)

**H2-váz:**

1. **Mi okozhat vállfájdalmat?** Első mondat + kontextus-adat: a válltáji
   fájdalom a harmadik leggyakoribb mozgásszervi fájdalom a derék- és a
   térdfájdalom után (V1 bevezetője). A gyakori okok a beteg nyelvén:
   túlterhelés, a rotátorköpeny (a vállat mozgató ín-izom rendszer)
   elváltozásai, befagyott váll (→ C7 link), sérülés (V2, V3 tárgyköre).
2. **Számít, hogy a bal vagy a jobb vállad fáj?** (együtt ~950 mért keresés)
   Önmagában az oldal ritkán mondja meg az okot — a felsorolt okok bármelyik
   vállon jelentkezhetnek (V2 ok-listája oldalfüggetlen). Szív-eredetre
   utaló állítást írni TILOS (nincs a forrásbázisban); a vörös zászló
   szakasz általános sürgősségi jelei fedik a veszélyes eseteket.
3. **Mit tehetsz otthon az első hetekben?** NHS: jellemzően 2 hét kell, mire
   a javulás elindul; maradj aktív, finoman mozgasd; 6–8 héten át végzett
   vállgyakorlatok segítenek, hogy a fájdalom ne térjen vissza; a váll teljes
   pihentetése hátráltatja a gyógyulást (V2 — a számok szó szerint).
4. **Mikor elég a torna? Mit mond a kutatás?** Őszinte bizonyíték-kép: egy
   31 Cochrane-áttekintést összegző munka szerint az erősítő gyakorlatok
   (manuálterápiával vagy anélkül) a legnagyobb terápiás erejű beavatkozás
   közép- és hosszú távon (V6); ugyanakkor a rotátorköpeny-betegség
   gyakorlat-bizonyítéka összességében gyenge minőségű, a mért különbség
   kicsi (V3 — a bizonytalanság kimondva). A műtétről: a CSAW-vizsgálatban a
   szubakromiális dekompresszió nem adott jobb eredményt a látszatműtétnél —
   és a résztvevők ELŐTTE mind végigcsináltak egy nem műtéti programot
   gyakorlatterápiával (V5 — a részlet fontos: előbb a konzervatív út).
5. **Meddig tarthat a vállfájdalom?** A felépülés 6 hónapig vagy tovább is
   eltarthat (V2); ha a válladat egyre több irányban nem tudod mozdítani, a
   befagyott váll külön kórkép, saját lefolyással → C7 link.
6. **Mikor fordulj orvoshoz?** Két hét otthoni kezelés után sem javuló vagy
   romló fájdalom (VZ4); azonnal: hirtelen nagyon erős fájdalom,
   mozdíthatatlan kar, alakváltozás, nem múló zsibbadás, forró vagy hideg
   tapintat, láz (VZ4); az irányelv vörös zászlói (V1 Ajánlás9).

- **CTA:** időpontkérés a `/kapcsolat` oldalra (mint C7). Kurzus-ígéret
  vállra TILOS.
- **Egyedi tilalmak:** „lelki okai" tartalom tilos (350 mért keresés ide
  vonzana — nem szolgáljuk ki, `docs/monid-adatok-teljes.md` 7.1);
  rotátorköpeny-szakadás diagnosztizálási tippek tilosak.

### C9 — De Quervain-szindróma (anyacsukló)

- **H1:** De Quervain-szindróma: amikor a csukló a hüvelykujj felől fáj
- **seoTitle:** De Quervain-szindróma (anyacsukló): tünetek, okok, kezelés
- **Slug:** `de-quervain-szindroma` · **Kategória:** Kéz és csukló ·
  **publishedAt:** 2026-09-09
- **Szerző:** Kiss Kata · **relatedPosts:** C2, C4, C5
- **Célkulcsszó:** de quervain (60/hó, KD 0)
- **Klaszter:** hüvelykujj ínhüvelygyulladás (300, 9) · ínhüvelygyulladás
  hüvelykujj kezelése (150, 12) · csukló ínhüvelygyulladás (250, 13 —
  részben; a általános ínhüvely-cikk a 2. hullámban jön) · anyacsukló
  (köznyelvi alak, volumen nélkül)

**H2-váz:**

1. **Mi a De Quervain-szindróma?** A hüvelykujjat mozgató két ín a csukló
   hüvelyk felőli oldalán megvastagodott ínhüvelyben szorul, a súrlódás fáj
   (DQ1). A köznyelvben ez az egyik leggyakoribb „ínhüvelygyulladás" a kézen
   — a kifejezés kimondása a hüvelykujj-ínhüvely keresések miatt kell.
2. **Miért hívják anyacsuklónak?** A forrásolt háttér, pontosan a forrásbázis
   6. szakaszának megengedett alakjában: a panasz gyakran szülés után
   jelentkezik — akiknél szülés után alakul ki, gyakran 4–6 héten belül
   veszik észre —, és a szakirodalom összefüggésbe hozza a terhességgel és a
   szülés utáni időszakkal (DQ1). ENNÉL TÖBBET NEM (pl. emelgetési technika
   okolása tilos).
3. **Kinél gyakori, és mik a tünetei?** 40-es, 50-es éveikben járók, nők
   gyakrabban; rheumatoid arthritisben hajlamosabbak; fájdalom a csukló
   hüvelyk felőli oldalán, fogásnál, csavarásnál, emelésnél (DQ1).
4. **Hogyan vizsgálja a szakember?** A Finkelstein-teszt LEÍRVA (hüvelykujj a
   tenyérbe, ujjak ráfognak, csukló a kisujj felé dől), és kimondva: ez
   szakember vizsgálati fogása, öndiagnózisra nem való; képalkotó általában
   nem kell (DQ1).
5. **Mit tehetsz otthon?** A fájdalmat kiváltó mozdulatok átmeneti kerülése;
   levehető sín, amely a csuklót egyenesen, a hüvelykujjat kényelmes
   helyzetben tartja, különösen éjszakára; jegelés 15 percig, 4–6 óránként,
   sosem közvetlenül a bőrre (DQ1).
6. **Mit mond a kutatás a kezelésekről?** A bizonytalanság ŐSZINTE kimondása
   — három összesítés részben mást mond: a 2016-os szerint a sín+injekció
   együtt eredményesebb, mint bármelyik önmagában (DQ2); a 2025-ös hálózati
   metaanalízis szerint a teljes idejű sínviselés + injekció végzett az élen,
   de a bizonyosság alacsony (DQ3); a 2024-es szerint rövid távon a sín
   önmagában nem különbözött szignifikánsan a placebótól (DQ4). A cikk nem
   választ oldalt — ez a lektoráló gyógytornászok döntése lesz (a kiírás ezt
   a mondatot a lektorálási sávba is beteszi: „a 6. szakasz olvasatát a
   lektorálás dönti el").
7. **Mikor fordulj orvoshoz?** Ha 6 hét konzervatív kezelés nem hoz javulást,
   vagy a panasz súlyos (DQ1); a csuklófájdalom általános vörös zászlói
   (VZ2).

- **Kurzus-híd:** Otthoni KézRehab.
- **E-E-A-T jegyzet a szerzői bióhoz (nem a törzsbe!):** mindkét gyógytornász
  elvégezte Kate Thorn CHT De Quervain-kurzusát (2024) — ez a szerző
  hitelességét igazolja, klinikai állítás mellé továbbra is a fenti források
  kellenek (`docs/tudastar-hangnem-es-technika.md` 1.7 figyelmeztetése).
- **Egyedi tilalmak:** a szoptatás/emelés okolása tilos (nincs forrás); a
  három metaanalízis közti választás tilos (lektorálói döntés).

---

## 7. A 2. hullám — előbb forrás, aztán cikk

### F1 kiírás — forráskutató ügynök (a 2. hullám KAPUJA)

**Cél:** a `docs/orvosi-forrasbazis.md` bővítése három új szakasszal,
PONTOSAN az 1. fázis módszertanával (minden URL HTTP-letöltéssel igazolva,
lektorált közleménynél PMID + DOI a PubMed E-utilities-ből, hozzáférési
dátum, magyar összefoglaló arról, mit állít a forrás; a NICE CKS és az
elérhetetlen domainek tilalma marad).

1. **Ínhüvelygyulladás a kézen és csuklón** (flexor/extensor tendinopathia,
   nem-fertőzéses tenosynovitis): elsőnek az NHS tendonitis-oldala és az AAOS
   OrthoInfo releváns oldalai; lektorált áttekintés a konzervatív kezelésről;
   a gennyes forma vörös zászlói már megvannak (VZ5, VZ6). A lábfej NEM téma.
2. **Dupuytren-kontraktúra**: NHS és AAOS OrthoInfo alapleírás; áttekintés
   arról, MIT tud és mit NEM tud a konzervatív út (ha a bizonyíték az, hogy a
   torna nem állítja meg a zsugorodást, akkor a cikk fő üzenete az őszinte
   tájékoztatás és a jó időben orvoshoz irányítás lesz — ehhez is forrás
   kell). A befagyott váll irányelve társbetegségként említi (V1) — ez a
   kapocs megvan.
3. **Hüvelykujj-fájdalom** — a hiányzó ok: a hüvelyktő (CMC) artrózisa
   („rizartrózis"): NHS/AAOS OrthoInfo leírás + konzervatív kezelés
   bizonyítéka. A De Quervain (DQ1–DQ5) és a pattanó hüvelyk (PU1–PU6)
   forrásai megvannak.

**Elfogadás:** minden új tétel a forrásbázis formátumában, azonosítóval
(IH1…, DU1…, HU1…); elérhetőségi napló frissítve; a 10. („Mennyi idő alatt
gyógyul") táblázat bővítve, AHOL a forrás időt mond; nyitott kérdések
szakasz frissítve.

### C10 — Ínhüvelygyulladás a kézen és a csuklón (F1 után)

- **H1 (javaslat):** Ínhüvelygyulladás a kézen és a csuklón: mit tehetsz?
- **Slug:** `inhuvelygyulladas` · **Kategória:** Kéz és csukló
- **Célkulcsszó:** ínhüvelygyulladás (2 200/hó, KD 18 — a téma második
  legnagyobb kifejezése!). Klaszter: tünetei (300, 5) · kezelése (300, 17) ·
  gyógyulási ideje (150, 10) · rögzítő sín (200, 0) · csukló
  ínhüvelygyulladás (250, 13).
- **Váz-irány:** mi az ínhüvely és mitől gyullad be; hol jelentkezik a kézen
  (→ C9 a hüvelyknél, → C4 a pattanó ujjnál — a két kész cikk linkelése
  kötelező); mit tehetsz otthon; vörös zászló KIEMELTEN a gennyes forma
  (VZ5, VZ6 — már forrásolt!); mikor orvos. A cím és a nyitás mondja ki,
  hogy a cikk a kézről és a csuklóról szól (a `lábfej ínhüvelygyulladás`
  keresőit nem szolgáljuk ki). VÉGLEGES H2-váz csak az F1 leszállítása után
  írható ki — addig cikkíró NEM indul.

### C11 — Dupuytren-kontraktúra (F1 után)

- **Slug:** `dupuytren-kontraktura` · **Kategória:** Kéz és csukló
- **Célkulcsszó:** dupuytren kontraktúra (600, 0) + dupuytren (200, 0).
- **Váz-irány:** mi ez (tenyéri kötőszövet zsugorodása), lefolyás, mikor kell
  kézsebész, mit tud és mit nem tud a gyógytorna — KIZÁRÓLAG az F1-ben
  gyűjtött források szerint; ha a bizonyíték sovány, a cikk rövid és őszinte
  lesz, vagy elmarad (a vezető dönt az F1 eredménye alapján).

### C12 — Hüvelykujj-fájdalom (F1 után)

- **Slug:** `huvelykujj-fajdalom` · **Kategória:** Kéz és csukló
- **Célkulcsszó:** hüvelykujj fájdalom (200, 0) + hüvelykujj (800, 0) + bal
  hüvelykujj fájdalom (150, 0) + jobb kéz hüvelykujj fájdalom (autocomplete).
- **Váz-irány:** mini-elosztó cikk a hüvelyk tövének fájdalmára: De Quervain
  (→ C9), pattanó hüvelyk (→ C4), CMC-artrózis (új forrásból), zsibbadó
  hüvelyk (→ C1/C2); otthoni teendők; vörös zászlók.

---

## 8. Amire tudatosan NEM készül cikk

| Keresés | Mért volumen | Miért nem |
|---|---:|---|
| „… lelki okai" (váll 350, pattanó ujj 300, bal kéz 200) | ~850 | Gyógytornász névvel forrásolhatatlan állítások kellenének; a túlígérés a mért vevőhang szerint visszaüt. Tulajdonosi + szakmai döntésig tilos (`docs/monid-adatok-teljes.md` 7.1). |
| kéztorna stroke után · bénult kéztorna · kéztorna gyerekeknek | autocomplete | A kurzus profilján kívül; ígéretet tenni rájuk tilos (uo. 7.2). Ha a lányok szakmailag vállalják, külön kör. |
| rögzítő, krém, pánt, gyógyszer (pl. `kéz zsibbadás elleni gyógyszer` 400, CPC $15) | 2 000+ | Termékvásárlási szándék; nem árulunk terméket, ajánlani forrás és érdekeltség-tisztázás nélkül tilos (uo. 7.4 — tulajdonosi döntés). |
| BNO-kód, „angolul" alakok | — | Adminisztratív/fordítási szándék, nem a vevőnk. Ads-ben negatív kulcsszó. |
| gyógytornász továbbképzés | 30 | SEO-ból eladhatatlan; a szakmai kurzus értékesítése nem cikk-feladat (`docs/kulcsszavak.md` 2.e). |
| lábfej ínhüvelygyulladás | 250 | Nem kéz; a szakmai fókusz (kéz-specialista pozíció) fontosabb, mint a volumen. |
| egérkéz, online gyógytorna, kézterápia | 0 | Nulla mért volumen (`docs/kulcsszavak.md` 1.); az „egérkéz" oksági képként ráadásul szembemegy az AAOS-konszenzussal (CTS2). |

---

## 9. Ütemezés, csapat, ellenőrzés

### 9.1 Javasolt csapat (a vezető állítja ki)

- **9 cikkíró ügynök** (Opus), cikkenként egy, a 4. szakasz sorrendjében
  indítva, ~2 párhuzamosan (a párhuzamossági korlát tervezési adat). Tiszta
  fájl-tulajdonlás: mindenki CSAK a saját
  `src/scripts/tudastar-cikkek/<slug>.ts` modulját írja.
- **1 integrátor ügynök** a cikk-modulok UTÁN: közös futtató
  (`seed-tudastar.ts`), `package.json` script, kategória- és szerző-feloldás,
  relatedPosts-kötés (két menetben: előbb minden cikk létrejön, aztán a
  kapcsolatok), idempotencia-teszt, tipográfiai őr (kvirtmínusz-tiltás a
  cikk-modulokra).
- **1 forráskutató ügynök** (F1) a 2. hullámhoz — az 1. hullámmal
  párhuzamosan indítható, mert más fájlt ír (`docs/orvosi-forrasbazis.md`).
- **1 ellenőr ügynök** a 9.2-es vezetői ellenőrzés előkészítésére (mérések
  futtatása, forrás-egyeztetés cikkről cikkre).

### 9.2 A vezetői átvétel mérései (cikkenként)

1. A hangnem-doksi függelék-parancsa a cikk szövegdarabjaira: átlagos
   mondathossz, 15 szó alatti arány, gondolatjel-sűrűség — a küszöbök az
   5.3-ból.
2. `grep -c '—'` a cikk-modulra = 0.
3. Tiltott fordulatok keresése: „meggyógyít", „garantál", „gyógyulási arány"
   (kivéve forrás-attribúcióval idézett lefolyás-adat), „diagnózis"
   önmagunkra vonatkoztatva.
4. Forrás-szúrópróba: cikkenként legalább 5 számszerű állítás visszakeresése
   a forrásbázisban, szó szerinti egyezésig.
5. `npm run typecheck` + `npm run lint` + a modul mellékhatás-mentes importja.
6. Az 5.2 szerkezeti elemek megléte (lektorálási sáv, vörös zászló, „mikor
   NE", forrásjegyzék, disclaimer, CTA).

### 9.3 Két függőség, ami NEM a cikkírók dolga, de a megjelenést érinti

- **Domain-átállás:** amíg a `www.kineticare.hu` a régi oldalt szolgálja ki,
  a cikkek SEO-hatása nem indul el (`docs/kampanyterv-mert-adatokbol.md` 9a).
  A cikkírás ettől NEM függ (a lektorálási átfutás miatt előre kell
  dolgozni), de a publikálás-tervezésnél számolni kell vele.
- **Tudástár-felület:** a `docs/tudastar-ux-terv.md` fejlesztései (forrás-
  megjelenítés, szerző-blokk, CTA-panel) külön kör. A cikkek a mai felületen
  is helyesen renderelődnek, mert a kiírás a mai serializer korlátaira épül.

---

## 10. Nyitott kérdések a vezetőnek és a tulajdonosnak

| # | Kérdés | Javaslat |
|---|---|---|
| N1 | **Van-e `users` rekord „Kocsis Kata" és „Kiss Kata" névvel élesben?** Az `author` mező és az Article JSON-LD `author.name` ezen múlik (E-E-A-T). | Ha nincs, a lektorálási kör elején létre kell hozni (staff szerep, kitöltött `name`); addig a seed author nélkül fut, és a jelentés jelzi. |
| N2 | **A seedből létező „Tudástár" kategória sorsa.** Cikk nem kerül bele, üresen noindex. | Lektorálás után az adminban törölhető; nem sürgős, kód nem függ tőle. |
| N3 | **Lektorálási mezők** (`reviewedBy`, `reviewedAt`) és szerzői bio-blokk — a `docs/tudastar-ux-terv.md` K2 kérdése, migrációt igényel. | Külön kör, külön PR; a cikkírást nem blokkolja. |
| N4 | **Videók.** A mérés két helyen mutat videó-keresletet (pattanó ujj videó 150; YouTube a SERP-en). | Ha a lányok forgatnak, az első videó a C4-hez készüljön; a beágyazás módja (Bunny vs YouTube) külön döntés. |
| N5 | **A „lelki okai" és a termék-kulcsszó (rögzítő/krém) kérdés** — mért kereslet, kiszolgálásához tulajdonosi és szakmai döntés kell (8. szakasz). | A monid-doksi 7.1 és 7.4 kérdéseit a lányok elé kell vinni; addig tilos. |
| N6 | **`fajakezem.hu`** — a pattanó ujj SERP-jén felbukkant, névre kéz-fókuszú domain; nem mértük. | A következő Monid-körben egy ~0,10 dolláros lekérdezés tisztázza, valódi versenytárs-e (`docs/monid-adatok-teljes.md` 7.3). |
| N7 | **A De Quervain-cikk 6. H2-jének olvasata** (sín önmagában elég-e) — három forrás részben ellentmond. | A cikk a bizonytalanságot mondja ki; a lektoráló Katák döntik el a hangsúlyt (forrásbázis 11.2/b). |
| N8 | **Az AAOS 2024-es kéztőalagút-megállapítás közlése** (a gyakorlatozás hosszú távú eredményt nem javít). | A terv szerint BEKERÜL a C2-be (őszinteség-blokk), a forrásbázis 11.2/a javaslatával egyezően. Ha a tulajdonos vagy a lányok másképp döntenek, a C2 kiírása módosítandó, mielőtt a cikkíró indul. |

---

## Karbantartás

A terv mért pillanatképre épül (2026-08-21). Fél év múlva, az újraméréskor
(`docs/kulcsszavak.md` 6., `docs/monid-adatok-teljes.md` 9.) a prioritási
sorrend és a 2. hullám összetétele felülvizsgálandó — a Search Console
tényadatai felülírják a becsléseket. A forrásbázis lejáró NHS-oldalait a
forrásbázis 12.3 naplója szerint kell frissíteni; a cikkekben a „Frissítve"
dátum követi.
