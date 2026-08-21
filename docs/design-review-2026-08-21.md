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
megdöntötte. Ezért van külön mérve minden állítás.

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
| Kontraszt | számolt relatív luminancia, a tényleges (átlátszatlan ősig felkeresett) háttérrel | 4,5:1 / 3:1 |
| Sorhossz | **Range API**, karakterenként keresve az első sortörést | 45–85 kar/sor |
| Érintőcél | mért befoglaló doboz | 24×24 px (cél 44×44) |
| Reflow | `documentElement.scrollWidth > innerWidth` | nincs túlcsordulás 320 px-en |
| Réteg-átfedés | fix/sticky elemek befoglaló dobozainak metszete | nincs átfedés |
| Tördelés | computed `overflow-wrap` / `word-break` / `hyphens` | márkanév nem törik |

**Egy mérési műterméket külön ki kell mondani.** Az első futás minden oldalon,
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
| Kontraszt | 20,98:1 | 5,45:1 |

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
| fejléc-pill | 999 px | #10243e | 20,98:1 | minden oldal fejléce |
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

## 5. Akadálymentesség és reszponzivitás

### 5.1 Kontraszt: hibátlan

**Nulla** olyan mért címsor vagy törzsbekezdés, ami 4,5:1 alá esne, egyik
oldalon és egyik nézetben sem. Ez a storefront legerősebb mérhető
tulajdonsága, és a `docs/gomb-kontraszt-audit.md` munkáját igazolja.

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

### P2 — lappangó kockázat és tartalom-döntés

6. **A márkanév legyen törésvédett** a buyboxban (3.3). Ma NEM törik, de a
   szabály aktív; ez megelőzés, nem hibajavítás.
7. **A buybox H1-hasábja 350 px** 1024 és 1440 px-en, ezért négy szó három
   sorba fut (3.3). Vagy a hasáb szélesebb, vagy a cím rövidebb.
8. `/szakmai-kez-kurzus`: vagy héj készül rá, vagy a menü ne ígérje belső
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
