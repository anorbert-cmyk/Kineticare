# Kineticare — teljeskörű design review és audit

> **Forrás:** az ÉLES Railway storefront
> (`https://kineticare-production.up.railway.app`), 2026-08-21, saját méréssel:
> Chromium 141 headless, CDP-harnesz, öt nézetablak (320 / 390 / 768 / 1024 /
> 1440 px), tizenkét útvonal. A nyers adat a scratchpad `dr/` mappájában
> (`meres.json`, `cta.json`, `retegek.json`, `sorhossz.json`).
>
> **Minden szám ebben a dokumentumban MÉRT.** Ahol becslés, ott ki van írva.
> Ahol egy korábbi állítást a mérés cáfol, ott a mérés az érvényes, és a
> cáfolat is szerepel.

## 0. A legfontosabb: mit mond a mérés, és mit NEM

Ez a review egy korábbi, szemrevételezéses áttekintés ellenőrzése is. A mérés
három pontot **megerősített**, négyet **cáfolt**, egyről kimondta, hogy
**nem hiba**, egyet pedig **pontosított úgy, hogy a baj súlyosabb lett, mint
hitték**.

A cáfolatok közül kettő a SAJÁT első olvasatomat is érinti: a CSS-szabályból
és a doboz-méretekből levont következtetést a tényleges rendered állapot
megdöntötte.

**És egy hibát a saját MÉRÉSEMBEN is javítani kellett:** a színfelbontóm a
`color(srgb …)` jelölést 0–255-ösként kezelte a helyes 0–1 helyett, ezért a
fejléc-gombra 20,98:1-et adott a valódi 15,63:1 helyett. A verdiktet nem
forgatta meg, de a teljes kontraszt-mérés újra lefutott (5.1). Ezért van
külön mérve — és ahol kellett, kétszer mérve — minden állítás.

| Korábbi állítás | A mérés ítélete |
| --- | --- |
| A termék-H1 „KézRe-hab"-ra törik | **CÁFOLVA** — a tényleges sortörések szóhatáron állnak (3.3) |
| Két primary gomb él egymás mellett | **IGAZ**, számszerűsítve a 4.1-ben |
| `/szakmai-kez-kurzus` 404 | **IGAZ**, saját 404-sablonnal |
| A süti-sáv vágja az első képernyőt | **IGAZ**, és mérve 320 px-en a képernyő **32%-a** |
| „A süti-sáv a sticky Megveszem sávra ül" | **CÁFOLVA** — a két sáv pontosan illeszkedik, nem fed át (3.2) |
| „A Tudástár üres, »Hamarosan érkeznek«" | **CÁFOLVA** — mind a hat cikk él (6.1) |
| „A /kurzusok kártyáin enyhe árnyék látszott" | **CÁFOLVA** — `box-shadow: none`, 1 px hairline #d8e2eb |
| „A H1 = H2 hiba" | **NEM HIBA** — tulajdonosi döntés a lapos skálára (4.2) |

És a pontosítás, ami a legfontosabb találat:

> **A süti-sáv nem a sticky sávot takarja, hanem magát a VÁSÁRLÁS-GOMBOT, az
> első képernyőn, görgetés előtt.** 390 px-en (a leggyakoribb telefonszélesség)
> a „Megveszem a kurzust" gomb **teljes egészében** a sáv alatt van. Ez rosszabb,
> mint két egymásra csúszó sáv, mert nem néz ki hibának: a látogató egyszerűen
> nem látja, hogy meg lehet venni.

## 1. Ítélet

**Van design rendszer, és jobb, mint amilyennek a szemrevételezés mutatta.**
A mérés három olyan dolgot igazol, amit dicsérni kell:

- **Nulla kontraszthiba.** A mért címsorokon és törzsbekezdéseken egyetlen
  elem sem esik 4,5:1 alá, egyik nézetben sem (WCAG 2.2 **1.4.3**).
- **Nulla vízszintes túlcsordulás 320 px-en**, mind a tizenkét oldalon
  (WCAG 2.2 **1.4.10** Reflow).
- **A cikktörzs sorhossza tankönyvi**: 62–69 karakter/sor 768–1440 px között,
  valódi karakterszámlálással (Range API), nem becsléssel.

**A hiba nem a rendszerben van, hanem a rendszer és az élő lap közti résekben.**
Három ilyen rés éri el az összes látogatót az első képernyőn, és mindhárom
számszerűsíthető. Ezek nélkül nem kész.

## 2. Mérési módszer

| Mit | Hogyan | Küszöb |
| --- | --- | --- |
| Kontraszt | számolt relatív luminancia, a tényleges (átlátszatlan ősig felkeresett) háttérrel; a `rgb()` és a `color(srgb …)` jelölés KÜLÖN kezelve | 4,5:1 (nagy szöveg 3:1) |
| Sorhossz | **Range API**, karakterenként keresve az első sortörést | 45–85 kar/sor |
| Érintőcél | mért befoglaló doboz | 24×24 px (cél 44×44) |
| Reflow | `documentElement.scrollWidth > innerWidth` | nincs túlcsordulás 320 px-en |
| Réteg-átfedés | fix/sticky elemek befoglaló dobozainak metszete | nincs átfedés |
| Tördelés | computed `overflow-wrap` / `word-break` / `hyphens` | márkanév nem törik |

**KÉT mérési műterméket külön ki kell mondani**, mert mindkettő hamis
következtetéshez vezetett volna.

**Az első: a színfelbontó.** Az `rgb(16, 36, 62)` komponensei 0–255-ösek, a
`color(srgb 0.06 0.14 0.24)` komponensei 0–1-esek. Az első szondám mindkettőt
0–255-nek vette. Részletek és a következmény az 5.1-ben.

**A második: a láthatóság.** Az első futás minden oldalon,
minden ≤768 px-es nézetben átfedést jelzett a `kc-nav-mobile__overlay` és a
süti-sáv között. Ellenőrizve: az overlay zárt állapotban
`visibility: hidden; opacity: 0`, tehát **nem takar semmit**. Az összes ilyen
találat hamis pozitív volt, és kikerült az eredményből. A tanulság általános:
a befoglaló doboz metszete önmagában nem bizonyít takarást, a láthatóságot is
mérni kell.

## 3. P0 — amit minden látogató az első képernyőn kap

### 3.1 A süti-sáv eltakarja a vásárlás-gombot (a legsúlyosabb)

Mérve a `/kurzusok/otthoni-kezrehab-program` oldalon, **görgetés előtt**:

| Nézet | Süti-sáv | „Megveszem a kurzust" | Állapot |
| --- | --- | --- | --- |
| 320 px | y=542–800 (258 px, a képernyő **32%-a**) | y=686–736 | **teljesen takarva** |
| 390 px | y=563–800 (237 px, **30%**) | y=614–665 | **teljesen takarva** |
| 768 px | y=763–900 (137 px, 15%) | y=455–506 | szabad |
| 1024 px | y=799–900 (101 px, 11%) | y=721–773 | szabad |
| 1440 px | y=818–900 (82 px, 9%) | y=770–823 | alsó **5 px** takarva |

A 390 px a leggyakoribb telefonszélesség. Ott a fizetős termék egyetlen
vásárlás-gombja **nem látszik**, amíg a látogató nem dönt a sütikről vagy nem
görget. A 320 px ugyanez, nagyobb sávval.

**Ez nem a consent-offset hibája** (lásd 3.2), hanem azé, hogy a sáv magassága
a mobil első képernyő harmadát viszi el, és a lap függőleges ritmusa erre nincs
felkészítve.

### 3.2 Amit a mérés CÁFOL: a két sáv nem ütközik

A `--kc-consent-offset` mechanizmus **működik**. Görgetés után, 320 px-en:

```
mobil vásárlósáv (.kc-course-buybar):  y = 444 … 542
süti-sáv        (.kc-consent-banner):  y = 542 … 800
```

A vásárlósáv alja **pontosan** a süti-sáv teteje. Nulla átfedés. Ugyanez
390 px-en (465–563 és 563–800) és 768 px-en (685–762 és 763–900).

Egyetlen valódi átfedés van, és az **asztali gépen**: a sticky oldalhasáb
(`.kc-course-layout__aside`) alsó része a süti-sáv alá fut, 1024 px-en 101 px-en,
1440 px-en 82 px-en. A `kurzusok.css:1087` a `bottom: var(--kc-consent-offset)`
szabályt a **mobil sávra** alkalmazza, az asztali sticky hasábra nem.

### 3.3 A termék-H1 NEM töri a márkanevet (cáfolt állítás)

Ezt az állítást a mérés megdöntötte, és a cáfolat a saját első olvasatomat is
érinti: a CSS-szabályból és a doboz-méretekből arra következtettem, hogy a
törés megtörténik. **Nem történik meg.**

A `.kc-course-buybox__title` tényleges, karakterenként visszamért sortörései:

| Nézet | A H1 sorai |
| --- | --- |
| 320 px | „Otthoni" / „KézRehab" / „Program" |
| 390 px | „Otthoni" / „KézRehab" / „Program" |
| 768 px | „Otthoni KézRehab Program" (egy sor) |
| 1024 px | „Otthoni" / „KézRehab" / „Program" |
| 1440 px | „Otthoni" / „KézRehab" / „Program" |

Minden törés **szóhatáron** van, a „KézRehab" mindenhol egyben marad.

**Ami viszont IGAZ, és marad találat**, két külön dolog:

1. **Lappangó kockázat.** A szabály tényleg ott van (computed:
   `overflow-wrap: anywhere`, `hyphens: auto`, forrás
   `src/app/(frontend)/kurzusok/kurzusok.css:357–366`), és **aktiválódni fog**,
   ha a hasáb keskenyebb lesz vagy a cím hosszabb. Egy márkanév-törés nem
   fokozatosan romlik, hanem egyik napról a másikra jelenik meg egy
   tartalmi szerkesztés után. Olcsó védekezés: a márkanév maradjon egységben.
2. **Három sor négy szóra.** A H1 doboza 1024 és 1440 px-en egyaránt csak
   **350 px széles** (a sticky hasáb szabja meg), a betűméret viszont 43,3
   illetve 46,4 px. Ettől a négyszavas cím három sorba fut, és a buybox
   tetejét aránytalanul sok címsor tölti ki.

| Nézet | H1 betűméret | H1 doboz | Sorok (mérve) |
| --- | ---: | --- | ---: |
| 320 px | 32,0 px | 222×115 | 3 |
| 390 px | 32,5 px | 292×117 | 3 |
| 768 px | 39,0 px | 670×47 | **1** |
| 1024 px | 43,3 px | 350×156 | 3 |
| 1440 px | 46,4 px | 350×167 | 3 |

A 768 px az egyetlen nézet, ahol a hasáb teljes szélességű, és ott a cím
egy sorban áll. Vagyis nem a betűméret nagy, hanem a hasáb szűk.

### 3.4 Két elsődleges gomb, két külön vizuális nyelven

Mérve, minden oldalon jelen van mindkettő:

| | Fejléc „Kurzusok" | Törzs primary |
| --- | --- | --- |
| Sarok-kerekítés | **999 px** (tabletta) | **8 px** (`--kc-radius-md`) |
| Háttér | **#10243e** (`--kc-color-ink`) | **#2f6e9f** (`--kc-color-accent-deep`) |
| Magasság | **45 px** | **53 px** |
| Kontraszt | 15,63:1 | 5,45:1 |

Két különböző forma, két különböző kitöltés, két különböző magasság,
ugyanabban a szerepkörben (elsődleges cselekvés). A WCAG 2.2 **3.2.4**
(Consistent Identification) az azonos funkciójú komponensek következetes
azonosítását írja elő.

A 45 px éppen a 44 px-es érintőcél-cél fölött van, tehát önmagában nem
akadálymentességi hiba, de a 8 px-es különbség a törzs-gombhoz képest szemmel
is látszik.

### 3.5 `/szakmai-kez-kurzus` 404

Megerősítve: HTTP 404, saját 404-sablonnal. A `/kezrehab` és a `/kezrelax`
ezzel szemben 308-cal a kurzus-slugokra megy, tehát a rövid útvonalak
mintázata létezik, csak erre az egyre nincs cél.

## 4. A design rendszer

### 4.1 Gomb-variánsok élesben

Mérve, a teljes storefronton négy vizuális gomb-alak fordul elő:

| Alak | radius | háttér | kontraszt | hol |
| --- | ---: | --- | ---: | --- |
| fejléc-pill | 999 px | #10243e | 15,63:1 | minden oldal fejléce |
| primary | 8 px | #2f6e9f | 5,45:1 | törzs, lábléc |
| fehér tömör | 8 px | #ffffff | 15,63:1 | kezdőlap hero (SOS) |
| átlátszó | 8 px | átlátszó | 5,45 / 14,79:1 | kezdőlap, 404 |

Az átlátszó változat **két különböző kontraszttal** fordul elő (5,45 a
kezdőlapon, 14,79 a 404-en), tehát nem egy variáns két helyen, hanem két
külön kirakás. Mindkettő megfelel a 4,5:1 küszöbnek.

### 4.2 Tipográfia: a lapos skála TULAJDONOSI DÖNTÉS, nem hiba

Mérve 1440 px-en: a H1 és az első szekció-H2 egyaránt **46,4 px**, hét
oldalon (kezdőlap, kurzusok, mindkét termékoldal, szolgáltatások, rólunk,
kapcsolat). A `base.css` mindkettőnek a `--kc-font-l` tokent adja.

Ez a **tulajdonos 2026-08-16-i döntése** a három méretre (L / M / S) és a
lapos olvasásra. **Nem javítandó hiba**, és a review nem is javasolja a
megváltoztatását.

Egy módszertani figyelmeztetés viszont ide tartozik: a fennmaradó öt oldalon a
mérés „H2 = 18 px"-et adott, ami elsőre lépcsőnek látszik. Ellenőrizve: azokon
az oldalakon a DOM-ban első H2 a **lábléc „Hírlevél" címe**, nem szekciócím.
Az összevetés ott almát hasonlított körtével. A lapos skála egységes.

| Oldal | első H2 szövege | méret |
| --- | --- | ---: |
| kezdőlap | „Kurzusaink" | 46,4 px |
| kurzusok | „Otthoni gyakorlóknak" | 46,4 px |
| termékoldalak | „A kurzusról" | 46,4 px |
| blog | „Levették a gipszet a csuklódról…" | 18 px |
| blog-cikk | „Ezen az oldalon" (tartalomjegyzék) | 18 px |
| kosár, belépés, 404 | „Hírlevél" (lábléc) | 18 px |

### 4.3 CTA-szótár: mit ír elő a §3.2, és mi van élesben

A normatív forrás a `docs/ui-sztenderdek.md` **§3.2** (38 számozott tétel), gépi
párja a `src/lib/cta-vocabulary.ts` (37 bejegyzés). Tizenhat élő gombfeliratot
vetettünk össze vele.

**Tizenhárom egyezik.** Három nem, és mindhárom eltérés **CMS-eredetű**, azaz
a kód már a helyes alakot tartalmazza, csak az élő adatbázis elavult:

| Hol | Éles felirat | §3.2 | Előírt felirat |
| --- | --- | ---: | --- |
| Kezdőlap hero, 2. gomb | „Ingyenes SOS gyakorlatok" | **#38** | `Nézd meg az SOS-kurzust` |
| `/rolunk` | „Megnézem a kurzusokat" | **#10** | `Nézd meg a kurzusokat` |
| `/szolgaltatasok` | „Megnézem a kurzusokat" | **#10** | `Nézd meg a kurzusokat` |

A #38 tétel indoklása szó szerint kimondja, miért: a mai alak *„főnévi, és nem
mondja meg, mi történik"*. Az „ingyenes" jelző szándékosan marad ki a gombból,
mert a sávon egy `success` jelvény mondja ki.

A #10-nél a nyelvtani kategória dönt: a kurzuslistára lépéskor a látogató
dolgaiban semmi nem változik (nincs rendelés, kosár, fiók), tehát **P-1b,
tegező E/2** alak jár — a „Megnézem" E/1-es alakja elkötelezést sugall, ami itt
nincs. Ugyanaz a cselekvés két néven sérti a WCAG 2.2 **3.2.4**-et.

**Ami NEM eltérés, bár annak látszik:**

- **„Kérem a kurzust" vs „Kérd az ingyenes kurzust"** — a §3.2 **szándékosan**
  ad rá két sort (#26 és #27): az egyik az űrlap **beküldése** (E/1, primary),
  a másik **lapon belüli ugrás** ugyanahhoz az űrlaphoz (E/2, secondary). Két
  különböző eredmény, tehát a 3.2.4 nem sérül. A „rejtettség" is szándékos és
  mért: `display: none` 1024 px felett, ezért a Tab-sorrendből is kiesik.
- **Az „Elindítom ingyen →" nyila** — a nyíl **sehol nem része a
  felirat-stringnek**, külön `aria-hidden="true"` spanben áll, és a §2.5 I-2/I-3
  pontja pont ezt írja elő. Nincs itt találat.

**Ami viszont rendszer-szintű hiba, és a 3.4-hez tartozik:** a §2.2 **K-1**
szabálya *„oldalanként pontosan 1 primary gomb-példány"*. Élesben a fejléc-pill
(primary súlyú) és a lábléc „Feliratkozom" (`primary`, pedig a #13 `secondary`-t
ír elő) **minden oldalon együtt** jelen van, a lap saját elsődlegese mellett.
A 404-en ez három primary-súlyú gomb egyszerre.

**Két hiány a szótárban** (nem eltérés, hanem hiányzó sor): a
`/szolgaltatasok`-ra vivő navigáció (élő alak „Nézd meg a kezeléseket") és a
külső kézworkshopra vivő navigáció (élő alak „Nézd meg a kézworkshopot").

### 4.4 Miért nem fogta meg egyetlen őr sem

Ez a legfontosabb rendszer-tanulság, mert enélkül a javítás vissza fog csúszni.

1. **Az élő CMS-adatot egyik őr sem látja.** A meglévő őrök a doksi és a
   TypeScript-forrás egyezését mérik. A hero gombfelirata viszont futásidőben
   az adatbázisból jön, és a `FilmHero` a kapott feliratot **szűrés nélkül**
   rendereli. A `FreeSos` és az `AppointmentForm` ezzel szemben 2026-08-18 óta
   figyelmen kívül hagyja a CMS-feliratot a szótári cselekvéseknél, tehát ott a
   kód nyer. A `FilmHero`-n nincs ilyen kényszerítés — **ez a #38-as eltérés élő
   oka**, és amíg így marad, minden kódbeli javítás hatástalan a hero gombjain.
2. **A `src/scripts/**` kívül esik az őr bejárási körén.** A `/rolunk` és a
   `/szolgaltatasok` CMS-tartalmát seedelő script négy „Megnézem a kurzusokat"
   előfordulása így láthatatlan.
3. **A magyar `{ felirat, url }` alakú seed-objektumokat** az őr nem ismeri fel
   CTA-ként (csak az `label` kulcsot olvassa), ezért a kezdőlap-seed öt
   gombfelirata ellenőrizetlen.
4. **A meglévő CMS-javító script csak a kezdőlapra fut**, a `/rolunk` és a
   `/szolgaltatasok` nem szerepel benne — vagyis a két #10-es eltérésre ma
   **nincs futtatható javítási út**.

### 4.5 Gomb-variánsok: három deklarált, négy megjelenő

A `Button` primitív **három** variánst ismer (`primary`, `secondary`, `ghost`),
a `docs/ui-sztenderdek.md` §2.2 viszont **négyet** ír elő — a **`danger`**
hiányzik a kódból, és a doksi ezt A/8 megállapításként vezeti is. Ma a
visszatérítés-gomb `primary`-t használ.

A négy élesben MÉRT vizuális alak úgy áll elő, hogy három egymástól független
**lokális CSS-felülírás** ír át rendszer-tulajdonságokat:

| Mért alak | Rendszer-variáns | Mi írja felül |
| --- | --- | --- |
| fejléc-pill | `primary` | lap-szintű felülírás: kerekítés, kitöltés és betűsúly **egyszerre** |
| fehér tömör | `secondary` | blokk-szintű felülírás a hero-ban |
| átlátszó | `secondary` | változatlan |
| törzs primary | `primary` | változatlan |

**A rendszer-eltérés gyökere kimondva:** négy vizuális alak három deklarált
variánsból, három lokális felülírással. A fejléc-pill tehát nem „másik gomb",
hanem a `primary` háromszorosan átírt példánya — és épp ezért nem is látszik
a rendszerben, hogy létezik.

## 5. Akadálymentesség és reszponzivitás

### 5.1 Kontraszt: hibátlan, kétszer megmérve

**Nulla** olyan szövegelem, ami elbukna az 1.4.3 küszöbön. Ezt az állítást
**kétszer** kellett megmérni, és a második mérés a lényeg.

**Az első szonda hibás volt.** A színfelbontóm minden színt 0–255-ös
komponensekként értelmezett, holott a CSS `color(srgb 0.06 0.14 0.24)`
jelölésében a komponensek **0–1** tartományúak. Ezért az ilyen jelölésű
kitöltések majdnem feketének számítottak, és HAMISAN MAGAS arányt adtak: a
fejléc-gombra **20,98:1**-et a valódi **15,63:1** helyett. (Ellenőrizve
kézzel: fehér a `#10243e` alapon = 15,63:1.)

A verdiktet ez nem forgatta meg, mert az érintett elem így is, úgy is bőven a
küszöb fölött volt. **De ez szerencse, nem érdem**, ezért a teljes mérés újra
lefutott javított felbontóval, levélszintű szövegcsomópontokra, a nagy szöveg
(≥24 px, vagy ≥18,66 px félkövér) 3:1-es küszöbét külön kezelve.

**A javított mérés 24 találatot adott. Mind a 24 `aria-hidden="true"`:**

| Elem | Mi ez | Arány |
| --- | --- | ---: |
| `kc-usps__num` | dekoratív sorszám (1, 2, 3) az USP-listán | 1,74:1 |
| `kc-how__num` | dekoratív sorszám a „hogyan működik" sorokon | 1,74:1 |
| `kc-testimonials__mark` | dekoratív nyitó idézőjel a véleményeknél | 1,59:1 |

Mindhárom **tisztán dekoratív**: a sorrendet a DOM-sorrend és a szöveg
hordozza, az idézetet maga az idézet szövege. A WCAG 2.2 **1.4.3**
kifejezetten kiveszi a tisztán dekoratív szöveget („Incidental"), és
mindegyik elem explicit `aria-hidden="true"`-t visel, tehát a
képernyőolvasóhoz sem jut el.

**Következtetés: valódi kontraszt-bukás nincs, egyetlen oldalon és egyetlen
nézetben sem.** Ez a storefront legerősebb mérhető tulajdonsága, és a
`docs/gomb-kontraszt-audit.md` munkáját igazolja.

### 5.2 Reflow 320 px-en: hibátlan

**Nulla** vízszintes túlcsordulás mind a tizenkét oldalon (WCAG 2.2 **1.4.10**).

### 5.3 Érintőcél: egy valódi bukás

A `/belepes` oldalon egy **20×20 px**-es `INPUT` (jelölőnégyzet) áll, mind az
öt nézetben. A WCAG 2.2 **2.5.8** (Target Size, Minimum) 24×24 px-et ír elő, és
a jelölőnégyzetre nem áll a szövegközi kivétel. **Ez AA-bukás.**

A mérés emellett sok 18–22 px magas szöveglinket is jelzett („Elfelejtetted a
jelszavad?", „adatvédelmi tájékoztatóban", bloglista-címek). Ezek **nem
bukások**: a 2.5.8 kifejezetten kivételt ad a mondatba ágyazott, illetve a
környező szöveg sormagasságától korlátozott célokra. A szondám túljelez, ezt
ki kell mondani, nehogy valaki 30 nem létező hibát próbáljon javítani.

### 5.4 Sorhossz: a cikk kiváló, a lábléc nem

Valódi karakterszámlálás (Range API), nem becslés:

| Elem | 320 px | 390 px | 768 px | 1024 px | 1440 px |
| --- | ---: | ---: | ---: | ---: | ---: |
| cikktörzs (`.kc-post-body p`) | 34–41 | 34–47 | **62–69** | **62–69** | **62–69** |
| lábléc hírlevél (`.kc-newsletter p`) | 41 | 59 | **98** | **98** | **112** |

A cikktörzs 768 px felett a 45–85 sáv **közepén** van. Ez pontosan az, amit a
`docs/ui-sztenderdek.md` előír.

A lábléc hírlevél-szövege viszont 768 px-től kilóg, 1440 px-en **112
karakter/sor** — a küszöb 32%-kal túllépve. Mivel a lábléc **chrome**, ez a
hiba **minden oldalon** jelen van.

A 320 px-es 34–41 karakter **nem hiba**: 272 px-es hasábban, 16 px-es
betűvel fizikailag nem fér el 45 karakter. A szabvány a keskeny nézetre nem is
követeli meg.

### 5.5 A süti-sáv mérete mint akadály

| Nézet | Sáv magassága | A képernyő hányad része |
| --- | ---: | ---: |
| 320 px | 258 px | **32%** |
| 390 px | 237 px | **30%** |
| 768 px | 137 px | 15% |
| 1024 px | 101 px | 11% |
| 1440 px | 82 px | 9% |

Telefonon a hozzájárulás-kezelő a látható felület majdnem harmadát viszi. Ez
önmagában nem szabálysértés (a hozzájárulást kérni kell, és eltakarni tilos),
de ez a 3.1 pontban leírt takarás oka.

## 6. Útvonalak — mért állapot

| Útvonal | HTTP | Megjegyzés |
| --- | ---: | --- |
| `/` | 200 | |
| `/kurzusok` | 200 | |
| `/kurzusok/otthoni-kezrehab-program` | 200 | fizetős termék |
| `/kurzusok/sos-kezrelax-villamkurzus` | 200 | ingyenes |
| `/szolgaltatasok` | 200 | CMS |
| `/rolunk` | 200 | |
| `/kapcsolat` | 200 | |
| `/kosar` | 200 | |
| `/blog` | 200 | **hat cikk, lásd 5.9** |
| `/blog/keztoalagut-szindroma` | 200 | |
| `/belepes` | 200 | |
| `/kezrehab` | 308 | → `/kurzusok/otthoni-kezrehab-program` |
| `/kezrelax` | 308 | → `/kurzusok/sos-kezrelax-villamkurzus` |
| `/szakmai-kez-kurzus` | **404** | saját 404-sablon |

### 6.1 A Tudástár NEM üres

Egy korábbi állítás szerint a `/blog` a „Hamarosan érkeznek az első cikkek"
üres állapotot mutatja. **Mérve, ma: nem.** A „Hamarosan" szó előfordulása a
lapon **nulla**, és mind a hat cikk linkje jelen van:

```
/blog/miert-zsibbad-a-kezem          /blog/pattano-ujj
/blog/keztoalagut-szindroma          /blog/csuklo-es-kezfajdalom
/blog/teniszkonyok                   /blog/csuklotores-utani-gyogytorna
```

A cikkek 2026-08-21-én kerültek élesbe. A korábbi megfigyelés ennél régebbi
állapotot rögzített.

## 7. Javítási sorrend

A sorrend a MÉRT hatás szerint áll, nem érzés szerint: előbb az, ami a
legtöbb látogatót éri a legkorábban.

### P0 — az első képernyőn, minden látogatónál

1. **A vásárlás-gomb ne legyen a süti-sáv alatt az első képernyőn** (3.1).
   Mérhető elfogadási feltétel: 320 és 390 px-en, görgetés előtt, a
   „Megveszem a kurzust" doboza ne metssze a süti-sáv dobozát. Ez nem a
   consent-offset javítása (az működik), hanem a lap függőleges ritmusáé.
2. **Egy elsődleges gomb-nyelv** (3.4). A fejléc-pill és a törzs-primary közül
   az egyik legyen elsődleges, a másik másodlagos. Elfogadási feltétel:
   laponként legfeljebb egy olyan gomb, ami elsődlegesnek látszik.

### P1 — rendszer-szintű, mérhető

3. **Az asztali sticky hasáb kapja meg a consent-offsetet** (3.2). 1024 és
   1440 px-en ma 101, illetve 82 px-en fut a sáv alá.
4. **A lábléc hírlevél-szövegének sorhossza** menjen 85 alá (5.4). Ma 98–112
   karakter/sor, és mivel chrome, minden oldalt érint.
5. **A `/belepes` jelölőnégyzete legyen legalább 24×24 px** (5.3). Egyetlen
   valódi WCAG 2.2 AA-bukás a mérésben.
6. **A lábléc „Feliratkozom" gombja legyen `secondary`** (4.3). A §3.2 #13 ezt
   írja elő, ma `primary`, és a fejléc-pillel együtt minden oldalon két
   idegen elsődleges súlyt ad a lap sajátja mellé.
7. **A három CMS-eredetű felirat-eltérés javítása** (4.3): a hero SOS-gombja
   (#38) és a `/rolunk` + `/szolgaltatasok` „Megnézem a kurzusokat" (#10). A
   kód már a helyes alakot tartalmazza, az élő adatbázis elavult — **de a két
   utóbbira ma nincs futtatható javítási út** (4.4).
8. **A `FilmHero` kényszerítse a szótárt** a CMS-felirat fölé (4.4), ahogy a
   `FreeSos` és az `AppointmentForm` már teszi. Enélkül a 7. pont javítása
   bármikor visszacsúszhat egy szerkesztéssel.
9. **Az őr-kör terjedjen ki a `src/scripts/**`-ra és a magyar
   `{ felirat, url }` alakra** (4.4). Ma mindkettő vak folt.

### P2 — lappangó kockázat és tartalom-döntés

10. **A márkanév legyen törésvédett** a buyboxban (3.3). Ma NEM törik, de a
    szabály aktív; ez megelőzés, nem hibajavítás.
11. **A buybox H1-hasábja 350 px** 1024 és 1440 px-en, ezért négy szó három
    sorba fut (3.3). Vagy a hasáb szélesebb, vagy a cím rövidebb.
12. **Két hiányzó szótári sor** felvétele (4.3): a `/szolgaltatasok`-ra és a
    külső kézworkshopra vivő navigáció.
13. **A `danger` gombvariáns pótlása** (4.5). A doksi előírja, a kód nem
    ismeri, a visszatérítés ma `primary`-t használ.
14. `/szakmai-kez-kurzus`: vagy héj készül rá, vagy a menü ne ígérje belső
    oldalnak. Ma 404-re visz.

### Amit a mérés alapján NEM kell javítani

- **A H1 = H2 lapos skála** (4.2): tulajdonosi döntés.
- **A 320 px-es rövid sorok** (5.4): fizikai korlát, nem hiba.
- **A szövegközi linkek 18–22 px-es magassága** (5.3): a WCAG 2.2 kivétele áll rá.
- **A mobil nav-overlay „átfedései"** (2.): mérési műtermék, az overlay
  zárt állapotban láthatatlan.
- **A kurzuskártya „árnyéka"**: mérve `box-shadow: none`, a kártyát 1 px-es
  `#d8e2eb` hairline határolja, pontosan a token szerint. Nincs mit javítani.
- **A márkanév törése** (3.3): ma nem következik be. A szabály lappangó
  kockázat, P2, nem P0.

## 8. Amit ez a review NEM fed le

Kimondva, hogy senki ne olvassa többnek, mint ami:

- **Fókuszjelölés és billentyűzetes végigjárás**: nem mértem. A skill
  3. pontja szerint kötelező, de külön, interaktív körben.
- **A `prefers-reduced-motion` viselkedése** a kezdőlap film-heroján.
- **Nagyítás 200%-on** (WCAG 1.4.4).
- **Képernyőolvasós próba.**
- **A képek vizuális minősége** (a `/rolunk` kivágása, a sajtólogók élessége):
  ezek szemrevételezéses állítások, a harnesz nem méri őket.
- **Fizetési út és Barion-felület.**
- **A `ledcenter.hu`**: külön termék, külön rendszer, ide nem keverendő.
