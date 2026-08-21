# Tudástár-kör: záró vezetői jelentés

**Készült:** 2026-08-21. **Ág:** `claude/course-interface-admin-ec326e`.
**Írta:** a záró szintetizáló ügynök, a vezető és a tulajdonos részére.

Ez a jelentés összegzi, mit adott le a Tudástár-csapat, mi blokkolja a
publikálást, mi maradt el, és mi a tulajdonos személyes teendője. Minden
állítás mögött vagy az elkészült dokumentum áll (fájlnév + szakasz), vagy
saját, most lefuttatott mérés.

**A jelentés készítőjének saját ellenőrzése** (nem az ügynökök beszámolóiból,
hanem újrafuttatva 2026-08-21-én):

| Ellenőrzés | Eredmény |
|---|---|
| `npm run typecheck` | hibátlan |
| `npm run lint` | 0 hiba, 3 figyelmeztetés – mindhárom e körben NEM érintett, korábbi fájlban (`consent-reopen.test.tsx`, `CoursePlayer.tsx`) |
| `npm run test` | **215 tesztfájl, 4 426 teszt zöld** (11 kihagyott), 69,8 s |
| Cikkek darabszáma | 6 fájl a `docs/cikkek/` alatt, mindegyik első sora a kötelező „LEKTORÁLANDÓ VÁZLAT" figyelmeztetés |
| Commit-állapot | a Tudástár-kör MINDEN fájlja commitolatlan a munkafán (a mai commitok a párhuzamos bevétel/Bunny-körhöz tartoznak) |

---

## 1. Mi készült el

### 1.1 Piaci mérés és kampány (docs/)

| Fájl | Egy mondatban |
|---|---|
| `docs/monid-kampany-kutatas.md` | A fizetős adatlekérések terve: mit, melyik végponton, mennyiért, milyen sorrendben. |
| `docs/kulcsszavak.md` | 22 kulcsszó mért volumene, nehézsége és forgalmi potenciálja (Ahrefs, HU), a nyolc cikkes oldalterv alapja; kimondja, hogy az akkreditált kurzusra nincs keresés (30/hó). |
| `docs/kampanyterv-mert-adatokbol.md` | SERP-ek, a fő versenytárs 50 fizetett kulcsszava és 25 hirdetésszövege visszafejtve; a fő hír: a piac üres, a kattintás 5–85 cent. |
| `docs/vevohang-es-hirdetesszoveg.md` | 362 valódi betegvélemény elemzése: a vevő „kezelést" keres és „alkalmakban" gondolkodik; a negatív vélemények mind a hozzáférést szidják, nem a szakmát. |
| `docs/monid-adatok-teljes.md` | A mély kulcsszó-kör: 81 kifejezés volumennel, 203 autocomplete-alak, versenytársak legjobb oldalai; öt új felismerés (pl. ínhüvelygyulladás 2 200/hó, befagyott váll 800/hó nulla nehézségen). |
| `docs/adwords-kampany.md` | Indításra kész Google Ads csomag: fiókszerkezet, kulcsszavak egyezési típussal, negatívok, RSA-szövegek, bővítmények, keret (5 000 Ft/nap = 152 000 Ft/hó, várható 210–360 kattintás/hó), konverziómérési terv és a 30 napos menetrend; három kimondott indulás-blokkolóval. |

Dokumentált adatköltség összesen kb. **14,3 USD** (kampánykör ~6,2 + vélemények
0,24 + mélykör 7,83; minden futás runId-vel visszakereshető, a pénztár-egyenleg
fillérre egyezik a `monid-adatok-teljes.md` 8. szakasza szerint).

### 1.2 Orvosi forrásbázis és tervek (docs/)

| Fájl | Egy mondatban |
|---|---|
| `docs/orvosi-forrasbazis.md` | 9 téma ellenőrzött forráskészlete (Cochrane, AAOS, NHS, NICE, lektorált közlemények) idézhető állításokkal, vörös-zászló-szabályokkal és azzal a listával, amit ebből a bázisból TILOS állítani. |
| `docs/tudastar-hangnem-es-technika.md` | A Kineticare hangja mérésekből visszafejtve (tegezés, ígéret-tilalmak, mondathossz) + a cikk-bevitel teljes technikája (Lexical-szerkezet, `status` ÉS `_status` csapda, másolható seed-példa). |
| `docs/tudastar-tartalmi-terv.md` | A 12 cikkes mesterterv: 9 cikk az 1. hullámban (teljes forrásfedéssel), 3 a 2.-ban (előbb forráskutatás), cikkenkénti kiírással, determinisztikus `publishedAt`-tal és a tudatosan kihagyott témák indoklásával. |
| `docs/tudastar-ux-terv.md` | A cikklista és a cikkoldal kutatás-alapú UX-terve mérhető elfogadási feltételekkel (kártya-változatok, 80 karakteres link-név, jegyzék-küszöb, CTA-távolság). |
| `docs/tudastar-technikai-terv.md` | A megvalósítás terve: komponensek, CSS, Schema.org-réteg, GEO/LLM-követelmények, adatmodell-bővítés (E-csomag) és őr-tesztek. |

### 1.3 Cikkek (docs/cikkek/ – MIND VÁZLAT)

| Fájl | Célkifejezés (mért volumen) |
|---|---|
| `1-miert-zsibbad-a-kezem.md` | kéz zsibbadás (450, forgalmi potenciál 2 200) |
| `2-keztoalagut-szindroma.md` | kéztőalagút szindróma (1 200, KD 5) |
| `3-teniszkonyok.md` | teniszkönyök (3 500, KD 13) |
| `4-pattano-ujj.md` | pattanó ujj (800, KD 0) |
| `5-csuklo-es-kezfajdalom.md` | csukló fájdalom (800, KD 0) |
| `6-csuklotores-utani-gyogytorna.md` | csuklótörés utáni gyógytorna (100, a termék belépője) |

Mind a hat cikkben: forrásjegyzék élő linkekkel, „Mikor NE végezd" szakasz,
záró óvatossági blokk, cikkírói önteszt („Állítás és forrás" táblázat), és a
fájl elején + a H1 alatt a lektorálási figyelmeztetés.

### 1.4 Ellenőrző körök (docs/)

| Fájl | Egy mondatban |
|---|---|
| `docs/cikkek-tenyellenorzes.md` | Adversariális forrásaudit: 80+ szám egyesével visszaolvasva az EREDETI forrásból (PubMed-absztraktok, két irányelv-PDF, NHS/AAOS-oldalak letöltve); eredménye 4 BLOKKOLÓ, 16 JAVÍTANDÓ, 12 MEGJEGYZÉS. |
| `docs/tudastar-a11y-meres.md` | A megvalósult cikkoldal mérése valódi Chromiummal, a repó valódi CSS-én és betűin, valódi cikkszöveggel: 1 603 kontraszt-, 245 érintőcél-mérés, 35 fókusz-állomás, 7 nézetablak; 17 WCAG-kritériumból 16 hiánytalanul teljesül, de a terv saját küszöbeiből 2 súlyos + 1 közepes bukik. |

### 1.5 Kód (src/ – commitolatlan)

| Fájl | Egy mondatban |
|---|---|
| `src/components/content/PostArticle.tsx` | Az új cikkoldal-gyökér: hero, jegyzék, törzs, források, GYIK, szerző-blokk, kurzus-CTA, kapcsolódó cikkek, Article + morzsa JSON-LD egy helyen. |
| `src/components/content/PostToc.tsx`, `PostBody.tsx`, `PostFaq.tsx`, `PostAuthorBox.tsx`, `PostCourseCta.tsx` | A cikkoldal részblokkjai (a GYIK natív `details/summary`, a látható listából épülő sémával). |
| `src/components/content/post-article.ts`, `post-outline.ts`, `post-list.ts` | DB-független szabály-modulok: mező-olvasók `unknown`+szűkítéssel (a jövőbeli séma-mezőkre előre felkészítve), horgony-generálás, jegyzék- és szűrő-küszöbök. |
| `src/lib/seo-cikk.ts` | Article-, FAQ- és morzsa-JSON-LD tisztán, a látható tartalomból. |
| `src/app/(frontend)/styles/blocks/post-view.css`, `tudastar-lista.css` | A cikkoldal és a kéthasábos lista stíluslapjai (mért track-korlátokkal). |
| `src/app/(frontend)/blog/page.tsx` (módosítás) | Kéthasábos rács, lead-bekezdés, a kategória-szűrő megjelenési küszöbe. |
| `src/app/(frontend)/blog/[slug]/page.tsx` (módosítás) | Átállt a `PostView`-ról a `PostArticle`-re. |
| `src/__tests__/tudastar-cikkoldal.test.tsx` (53 teszt) | Őr: horgony-konzisztencia, jegyzék-küszöb, CTA-szótár, kvirtmínusz-tilalom, mért CSS-küszöbök. |
| `src/__tests__/tudastar-strukturalt-adat.test.ts` (+43 teszt) | Őr: a JSON-LD érvényes és a látható tartalommal konzisztens. |

---

## 2. Mi a blokkoló – szépítés nélkül

### 2.1 A cikkek MOST NEM publikálhatók. Egyik sem.

Két, egymástól független kapu zárja őket:

**a) Mind a hat cikk lektorálandó vázlat.** A két gyógytornász (Kocsis Kata és
Kiss Kata) szakmai jóváhagyása nélkül a kiírás szerint semmi nem mehet ki. Ez
nem formalitás: a cikkek az ő nevük alatt, az ő szakmai renoméjukkal jelennek
meg.

**b) A tényellenőrzés négy BLOKKOLÓ hibát talált** (`docs/cikkek-tenyellenorzes.md` 1. szakasz):

| # | Mi | Hol | Miért súlyos |
|---|---|---|---|
| B1 | Nincs mentőhívási szint és 112 a pattanó ujj cikkben, miközben ugyanez a cikk amputációval fenyegető fertőzést ír le | 4. cikk | biztonsági hiány; a forrásbázis 1. szakasza minden cikkre kötelezővé teszi |
| B2 | Az 1. és 2. cikk olyan olvasónak ajánlja a kurzust (zsibbadás, gyengülő szorítóerő), akit a kurzus SAJÁT ellenjavallata kizár | 1. és 2. cikk | a vevő a vásárlás után szembesülne vele; a 6. cikk mintája mutatja a jó megoldást |
| B3 | Az SZTK-A-33553/2024 akkreditációs szám 2026-os érvényessége a repóban nyitott kérdés, mégis öt cikk jelen idejű hitelesítő adatként közli | 2.–6. cikk | lejárt akkreditációra hivatkozni pont a renomét vinné; KÜLSŐ megerősítés kell |
| B4 | A 6. cikk elhallgatja, hogy az AAOS/ASSH-irányelv EGYETLEN magas minőségű vizsgálata a FELÜGYELT terápia javára szólt | 6. cikk | szelektív olvasat pont a termék legfontosabb szakmai érvénél; egy lektoráló azonnal kiszúrja |

B1, B2 és B4 egy-egy bekezdésnyi szövegjavítás, azonnal elvégezhető. B3 csak
tulajdonosi/szakmai megerősítéssel oldható fel.

A négy blokkolón túl **16 JAVÍTANDÓ** tétel van (jellemzően a forrás
kedvezőtlen felének kihagyása: pl. a Cochrane-következtetés nyitó mondata, a
Smidt-vizsgálat „nem szignifikáns" minősítése, a 80–90%-os műtéti sikerarány
melletti AAOS-fenntartás), és **12 megjegyzés**. Külön kiemelendő a **J11**:
három cikkben négy kitalált, első személyű praxis-mondat áll („a praxisunkban
azt látjuk…"), amit a két gyógytornász sosem mondott; ezeket vagy ők hagyják
jóvá szó szerint, vagy cserélni kell.

**Ami viszont jó hír, és mérve az:** 80+ szám, arány és minősítés egyesével
visszaolvasva az eredeti forrásokból – **egyetlen elrontott szám sincs**; mind
a 48 külső hivatkozás él; gyógyulás-ígéret, saját diagnózis, tiltott forrás
egyik cikkben sincs.

### 2.2 Az a11y-mérés bukott küszöbei

A WCAG 2.2 AA-szint mérve hiánytalanul teljesül (1 603 kontraszt-mérésből 0
bukó, reflow 320 px-en 0 túllógó elem, 35 fókusz-állomás mind látható). A terv
SAJÁT, szigorúbb elfogadási feltételei buknak (`docs/tudastar-a11y-meres.md` 3. szakasz):

| Súly | Mi bukik | Mért érték | Küszöb |
|---|---|---|---|
| SÚLYOS | A kapcsolódó cikkek kártya-kivonatának sorhossza | 24–38 karakter/sor | min. 45 (Ü6) |
| SÚLYOS | A kártya-link hozzáférhető neve (kategória+cím+kivonat+dátum összeragadva); a kártya címe `<span>`, nem címsor | 206–227 karakter | max. 80 (a terv 3.5 elfogadási feltétele) |
| KÖZEPES | A fejléc kategória-címkéjének érintőcélja | 28,8 px | 44 px (repó-szabály; a WCAG 24 px-e teljesül) |
| ALACSONY | Bekezdésköz-tartalék 1440 px-en | +0,97 px | a következő hangolás átbillenti |

A két súlyos tétel oka azonos: a terv 3.5 pontja (a `PostCard` kétváltozatúvá
alakítása) **nem került megvalósításra** – a `PostCard.tsx` ebben a körben nem
módosult, és a `PostArticle` a kapcsolódó rácsot a közös `kc-card-grid`
osztállyal építi a Tudástár-módosító nélkül (`PostArticle.tsx` 206. sor). A
mérési doksi mindkettőre kész, mért javítást ad; az egyik egysoros, a másik a
`PostCard` átalakítása (a `/blog` listát és a kezdőlapi szekciót is érinti).

### 2.3 A hirdetési kampány indulás-blokkolói

Az `docs/adwords-kampany.md` 0. szakasza három feltételt mond ki, amelyek
nélkül **egyetlen hirdetés sem indulhat**:

1. **A domain még a régi Systeme.io-oldalt szolgálja ki** – a fizetett forgalom
   oda menne, ahol se mérés, se cikk, se pénztár nincs.
2. **Konverziót a Google Ads nálunk nem fog mérni**: az `ad_storage` a mai
   consent-döntés szerint sosem nyílik meg, és a modellezés 700 kattintás/7 nap
   küszöbéhez képest a keretünk 48–83 kattintást ad hetente. A mérés a mi
   oldalunkon (PostHog) történik; ezt a 9. fejezet írja le.
3. **A kurzusoldal mai szövege** („megszüntetheted… akár hetek alatt")
   eredmény-ígéret időtávval – a Google „Unreliable claims" szabályába ütközik,
   ami a CÉLOLDALRA is vonatkozik, és a mért vevőhang szerint az ilyen ígéret a
   véleményekben is visszaüt.

---

## 3. Mi hiányzik, és miért

| Mi | Miért maradt el |
|---|---|
| **C7 (befagyott váll), C8 (vállfájdalom), C9 (De Quervain) cikk** – az 1. hullám 9 cikkéből 6 készült el | A kör kapacitása hat cikkíróra volt méretezve; C7/C8-hoz ráadásul tulajdonosi döntés is kell (kiterjed-e a program a vállra – adwords K4). Következmény: a 2., 4., 5. cikk törzsében NÉGY link a nem létező C9-re mutat (tényellenőrzés J12) – vagy elkészül a C9 az első hullámmal, vagy a linkeket ki kell venni. |
| **2. hullám cikkei (ínhüvelygyulladás 2 200/hó, Dupuytren, hüvelykujj)** | Szándékos: a forrásbázis 12.3 szabálya szerint előbb forráskutatás (F1 kiírás a tartalmi terv 7. szakaszában), csak utána cikk. |
| **Adatmodell-bővítés (E-csomag): `faq`, `ctaCourse`, `reviewedBy`, `reviewedAt` a `posts`-on; `credentials`, `bioShort`, `portrait` a `users`-en** | Szándékosan külön kör: migráció-generálást igényel (tilos kézzel írni), külön PR-t és a G3/G4 őrök menetét. A frontend erre FEL VAN készítve: a mezőket `unknown`+szűkítéssel olvassa, ma némán elmaradnak, a séma-kör után kódváltozás nélkül megjelennek. Amíg nincs meg: nincs GYIK-blokk, nincs lektorálási sor, a szerző-blokk a szegényebb tartalékon fut. |
| **Cikk-lint (a technikai terv 8. szakaszának végrehajtható tartalom-őre)** | Nem készült el ebben a körben; a szerepét most részben a 96 őr-teszt, részben a kézi tényellenőrzés töltötte be. |
| **A cikkek betöltése a Payloadba (seed)** | A hat cikk markdown-vázlat; a bevitel másolható mintája kész (`tudastar-hangnem-es-technika.md` 2.9), de a betöltő szkript szándékosan nem futott le: lektorálatlan szöveg adatbázisba se kerüljön. A lektorált változatból kell seedelni, `draft` státusszal. |
| **`PostCard` kétváltozatúvá alakítása (UX-terv 3.5)** | Nem valósult meg; ez okozza a 2.2 mindkét súlyos tételét. |
| **Élő környezeti ellenőrzések**: fejléces+süti-sávos fókusz-bejárás, képernyőolvasós link-lista, valódi 200%-os böngésző-zoom, kognitív séta | A mérő-harness a DB-ből olvasó `Header`/`Footer`-t nem tudja renderelni; a fejléc geometriája szimulált volt. Deploy után böngészőből kötelező kör (a11y-doksi 4. szakasz). |
| **Domain-átállás, GSC-hitelesítés, Google Cégprofil** | Nem ügynök-hatáskör: tulajdonosi hozzáférést igényel. |

---

## 4. A TULAJDONOS TEENDŐI – ez a szakasz a legfontosabb

**A hat cikk LEKTORÁLANDÓ VÁZLAT. A két gyógytornász (Kocsis Kata és Kiss
Kata) tételes szakmai jóváhagyása nélkül EGYIK SEM publikálható, és nem is
kerül be a rendszerbe.** A lektoráláshoz a `docs/cikkek-tenyellenorzes.md` a
munkapéldány: szakaszonként felsorolja, mit kell javítani, és a 4. szakasza
tételesen igazolja, mely számok pontosak.

Döntést vagy cselekvést igénylő lista, fontossági sorrendben:

1. **Akkreditáció (B3, leghosszabb átfutás – azonnal indítandó):** erősítsd
   meg, hogy az SZTK-A-33553/2024 szám 2026-ban is érvényes. Ha nem
   igazolható, a szám kikerül az öt cikkből, és marad a képzés ténye szám
   nélkül.
2. **Praxis-mondatok (J11):** a két gyógytornász szó szerint vállalja-e a négy
   „praxisunkban azt látjuk" mondatot? Ha nem, cseréljük helyzetleírásra.
3. **Lektorálás:** a hat cikk átadása a két gyógytornásznak – de csak AZUTÁN,
   hogy a B1/B2/B4 és a 16 javítandó tétel szövegjavítása megtörtént (ne
   hibás szöveget lektoráljanak).
4. **Kurzusoldal-ígéret (adwords K1):** a „megszüntetheted… akár hetek alatt"
   mondat cseréjéről dönteni kell (termékszöveg + szakmai jóváhagyás). Amíg
   ott van, hirdetés nem indulhat.
5. **SOS Kézrelax önteszt-ígérete (J16):** a kurzusleírás „kipróbálhatod
   magadon" mondata ellentmond a cikkek „ne diagnosztizáld magad" üzenetének;
   dönteni kell, melyik szöveg pontosul.
6. **Váll-kérdés (K4):** kiterjed-e a program a vállra? Ettől függ a C7/C8
   cikk és a kampány T2 ága (befagyott váll: 800 keresés/hó, nulla verseny).
7. **Domain-átállás:** a `www.kineticare.hu` átirányítása az új platformra –
   e nélkül sem a SEO, sem a hirdetés nem ér semmit.
8. **`users` rekordok (N1):** Kocsis Kata és Kiss Kata felhasználó élesben,
   kitöltött névvel – e nélkül a cikkek szerző-jele és az Article-séma
   `author`-a gyengébb.
9. **Hirdetési keret (K8):** a javasolt 152 000 Ft/hó vagy a leépített
   60 800 Ft/hó; + ügyvéddel a consent-sáv hirdetési kategóriája (K2).
10. **Kisebb, de mért keresletű döntések:** „lelki okai" keresések (850/hó
    összesen) és termék-kulcsszavak (rögzítő, krém) – addig negatív kulcsszó
    mindkettő.

---

## 5. Következő lépések sorrendben

1. **Vezetői átvétel:** e kör diffjének átnézése és commit (most minden
   commitolatlan); a typecheck/lint/teszt zöldjét e jelentés 0. táblája
   igazolja, de a vezető maga is futtassa.
2. **A11y-javítások kódban:** a kapcsolódó rács módosítója vagy a `PostCard`
   `variant` átalakítás (vezetői döntés a kettő között, a mérési doksi 3.1
   pontja szerint), a kártya-link 80 karakteres neve + h3 cím (3.2), a
   kategória-címke 44 px-es érintőcélja (3.3). Egy fájl-tulajdonos ügynökre
   méretezett, méréssel záruló kör.
3. **Cikk-javítások szövegben:** B1, B2, B4 + a 16 javítandó tétel + a J12
   linkdöntés (C9 készül vagy linkek ki) a hat vázlatban; a forrásbázis
   J9/J10/M6 szerinti pótlása.
4. **Tulajdonosi kör:** a 4. szakasz 1–5. pontja (akkreditáció, praxis-mondatok,
   lektorálás indítása, kurzusoldal-ígéret, önteszt-szöveg).
5. **Séma-kör (külön PR):** E-csomag mezők generált migrációval + a
   `reflow-hasabmeres` és a többi őr újrafuttatása; utána a lektorált cikkek
   seedelése `draft` státusszal, majd admin-előnézetes átvétel.
6. **Hiányzó cikkek:** C9 (De Quervain – a linkek miatt első), majd K4-döntés
   után C7/C8; párhuzamosan az F1 forráskutatás a 2. hullámhoz.
7. **Élesítés utáni mérés:** böngészős fókusz-bejárás fejléccel és
   süti-sávval, képernyőolvasós link-lista, 200%-os zoom (a11y-doksi 4.
   szakasza), GSC-beküldés.
8. **Kampány:** CSAK a domain-átállás, a K1-szövegcsere és a mérési döntések
   után, az `adwords-kampany.md` 10. fejezetének 30 napos menetrendje szerint.

---

*A jelentés minden száma vagy a hivatkozott dokumentumból, vagy a 2026-08-21-én
újrafuttatott ellenőrzésekből származik. Ahol a csapat állítása és a mérés
eltért volna, a mérés az irányadó – ilyen eltérést a záró kör nem talált, de a
tényellenőrzés és az a11y-mérés bukott tételei pontosan azért vannak külön
szakaszban, hogy ne vesszenek el a részletekben.*
