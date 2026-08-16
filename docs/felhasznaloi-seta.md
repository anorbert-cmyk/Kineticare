# Felhasználói séta — kognitív séta az élő oldalon egy átlagos vásárló fejével

**Mérés dátuma:** 2026-08-16 · **Mért cím:** `https://kineticare-production.up.railway.app`
**Eszköz:** Chromium 141 (playwright-core), `hu-HU`, Europe/Budapest.
**Képernyők:** asztali 1440×900, mobil 390×844 (2× sűrűség), szűk mobil 320×800.
**Amit csináltam:** kizárólag olvasás. Nem vásároltam, nem küldtem be űrlapot, nem
regisztráltam. A fizetési gombig jutottam el, azt nem nyomtam meg.

---

## 0. Kinek szól ez a dokumentum, és mire jó

Ez nem szakmai audit, hanem **egy vásárló naplója**. Végigjátszottam nyolc valódi
feladatot úgy, ahogy egy hozzá nem értő látogató csinálná, és minden lépésnél
feljegyeztem: mit lát, mire kattintana, mi ijeszti meg, hol adná fel.

A persona, akinek a fejével végigmentem:

> **Kovácsné, 54 éves.** Irodában dolgozik, hétvégén kertészkedik. Fáj a csuklója
> és a hüvelykujja. Telefonon és laptopon is internetezik, de nem magabiztos.
> Nem tudja, mi az a „CTA”, az angol szavakat nem érti. Fél attól, hogy véletlenül
> fizet valamiért. A türelme véges: ha két kattintás után nem érti, hova jutott,
> bezárja az oldalt.

A dokumentum párja az `docs/informacios-architektura.md` (a szerkezet térképe) és
az `docs/ertekesitesi-ux-skill.md` (a felületi szabályrendszer). Ez a séta a
*megélt* oldal, azok a *szerkezeti* oldal.

### Néhány szó, ami előfordul a szövegben

| Szó | Mit jelent |
| --- | --- |
| **hajtás** | Az a képzeletbeli vonal, ameddig görgetés nélkül ellátsz. Ami alatta van, azt csak az látja, aki görget. |
| **hero** | Az oldal legfelső, nagy képes-nagybetűs sávja, az első benyomás. |
| **buybox / vásárlódoboz** | A kurzusoldal jobb oldali doboza, amiben az ár és a vásárlás gombja van. |
| **ragadós (sticky)** | Ami görgetés közben a helyén marad, például a fejléc vagy a mobil alsó vásárlósáv. |
| **CTA** | Cselekvésre hívó gomb, például a „Megveszem”. A dokumentumban inkább csak „gomb”-ot írok. |
| **px** | Képpont. A képernyő magassága asztali gépen jellemzően 900 px, telefonon 844 px, ezért ír a szöveg „képernyőnyi” távolságokat. |

---

## 1. A módszer: kognitív séta

A kognitív séta egy feladat-alapú vizsgálat: az értékelő végigmegy a feladat
minden egyes lépésén, és minden lépésnél ugyanazt a négy kérdést teszi fel egy
olyan felhasználó nevében, aki **először** használja a felületet, és menet közben
tanulja meg. A módszert Clayton Lewis és munkatársai dolgozták ki 1990-ben, a ma
használt, egyszerűsített változat Cathleen Wharton, John Rieman, Clayton Lewis és
Peter Polson nevéhez fűződik.

**A négy kérdés**, ahogy a Nielsen Norman Group megfogalmazza:

| # | Kérdés | Magyarul, a gyakorlatban |
| --- | --- | --- |
| **K1** | Megpróbálja-e a felhasználó a helyes eredményt elérni? | Egyáltalán eszébe jut-e, hogy ezt a lépést kell megtennie? |
| **K2** | Észreveszi-e, hogy a helyes vezérlő elérhető? | Látja-e a gombot vagy a linket a képernyőn? |
| **K3** | Összekapcsolja-e a vezérlőt a céljával? | A felirat alapján rájön-e, hogy *ez* viszi a céljához? |
| **K4** | A visszajelzésből érti-e, hogy jó felé halad? | A kattintás után látja-e, hogy közelebb került? |

Forrás: [NN/g — Cognitive Walkthroughs](https://www.nngroup.com/articles/cognitive-walkthroughs/) ·
[Usability Body of Knowledge — Cognitive Walkthrough](https://www.usabilitybok.org/cognitive-walkthrough/) ·
Wharton, Rieman, Lewis, Polson: *The Cognitive Walkthrough Method*, in Nielsen & Mack (szerk.):
*Usability Inspection Methods*, 1994 ([ACM DL](https://dl.acm.org/doi/10.5555/189200.189214)).

### Súlyossági fokozatok

| Jel | Jelentés | Mi történik Kovácsnéval |
| --- | --- | --- |
| 🔴 **elakad** | A feladat nem végezhető el, vagy rossz irányba visz. | Feladja, vagy rosszat kattint. |
| 🟠 **bizonytalan** | Elvégezhető, de nem biztos benne, hogy jót csinál. | Megáll, tétovázik, esetleg kilép. |
| 🟡 **zavaró** | Elvégezhető, de kellemetlen vagy fölösleges lépés. | Bosszankodik, de továbbmegy. |

---

## 2. Feladat 1: „Fáj a csuklóm. Ez az oldal tud nekem segíteni?”

Belépés a kezdőlapról, az első tíz másodperc.

### Amit lát (asztali gép, első képernyő)

Nagy fotó egy ökölbe szorított kézről. Balra a főcím: **„Hatékony és biztonságos
módszerek a kéz és a kar fájdalmai ellen”**. Alatta három sor magyarázat, négy
kis címke (Kéz, Csukló, Könyök, Váll), majd két gomb: **„Kurzusok megtekintése”**
és **„Ingyenes SOS gyakorlatok”**. A képernyő alsó ötödét egy sötét süti-sáv
foglalja el az „Elfogadom” és „Elutasítom” gombokkal.

### A négy kérdés

| Kérdés | Válasz | Megjegyzés |
| --- | --- | --- |
| K1 | **Igen.** | „Csukló” szerepel a címben és a címkék között is. Azonnal érzi, hogy jó helyen jár. |
| K2 | **Részben.** | A gombokat látja, de előbb a süti-sávot kell elintéznie. |
| K3 | **Nem teljesen.** | A „Kurzusok megtekintése” nem mondja meg, hogy ez **online videós program**, se azt, hogy mibe kerül. |
| K4 | — | Még nem kattintott. |

### Akadályok

**1.1 🟡 A süti-sáv az első, amit el kell intézni.**
A sáv a hajtás alján ül (asztali gépen y≈834 px), és a mobilon **letakarja mindkét
hero-gombot** (a gombok y=667 és y=730, a sáv y≈727-től indul a 844 px magas
képernyőn). Kovácsné mobilon az első képernyőn a hero **egyik gombját sem tudja
megnyomni**, amíg nem intézte el a süti-sávot. (A fejléc „Kurzusok” gombja
látszik, de az nem a hero ígéretére válaszol.)
*Javaslat:* a süti-sáv maradjon, de a hero elsődleges gombja fölötte legyen
(alsó térköz a hero alá), vagy a sáv legyen keskenyebb, egysoros.

**1.2 🟠 Nem derül ki, hogy ez online videós program.**
Az első képernyőn nincs se ár, se az, hogy „online”, se az, hogy „videó”. Az első
árat a kezdőlapon **5001 px-nél** találja meg, ami az ötödik-hatodik képernyő.
Kovácsné ekkor még azt is hiheti, hogy ez egy rendelő, ahova el kell mennie.
*Javaslat (felirat):* a főcím alatti bevezető első mondata legyen konkrét:
„Online videós kézrehabilitációs program, otthon végezhető gyakorlatokkal.
Gyógytornászok állították össze.” A gombfelirat pedig: **„Megnézem az otthoni
programot”** a mostani „Kurzusok megtekintése” helyett.

**1.3 🔴 A kezdőlap teteje majdnem öt képernyőnyi mozgókép, tartalom nélkül.**
Mérve: a `film-hero` szakasz **0-tól 4140 px-ig** tart, a teljes kezdőlap
**14 173 px** (15,7 képernyő asztali gépen, 16 841 px = 20 képernyő mobilon).
Aki elkezd görgetni, a második, harmadik és negyedik képernyőn **ugyanazt a
kézfotót látja**, egy-egy apró felirattal („A terápia működik”, „Kezdd el még
ma”). Kurzus, ár, gomb sehol. Az első kurzuskártya csak **4576 px-nél** jelenik meg.

Ez azért súlyos, mert a NN/g görgetés-vizsgálata szerint a képernyő tetején lévő
tartalom kapja a nézési idő **57%-át**, a második képernyő ennek már csak a
harmadát (17%), a maradék 26% oszlik el az egész többi oldalon
([NN/g — Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)).
Kovácsné türelme itt fogy el.
*Javaslat:* a filmes hero rövidüljön a jelenlegi negyedére (kb. egy képernyő
plusz egy átmenet), és **a kurzusszekció kerüljön feljebb**, a második képernyőre.
A mozgás maradjon `prefers-reduced-motion` mögött.

### Ítélet

Kovácsné 10 másodperc után tudja, hogy „kézzel foglalkoznak”, de **nem tudja, hogy
mit vehet meg és mennyiért**. Ez a kezdőlap fő hiányossága.

---

## 3. Feladat 2: „Mennyibe kerül, és mit kapok?”

### Az út

Két út van, és nagyon nem mindegy, melyiket választja.

**A) Görgetéssel a kezdőlapon:** 4576 px-ig kell görgetnie (5 képernyő), akkor
látja a kártyát: „Otthoni KézRehab Program · 4 modulnyi videóanyag · 50+ videós
gyakorlat · 5 perces miniblokkok · **Ár: 79 500 Ft** · Megnézem a programot”.
Ez a kártya jó: elmondja, mi van benne, és kiírja az árat.

**B) A fejléc „Kurzusok” gombjával:** 1 kattintás, és a listaoldalon van.

### A négy kérdés a listaoldalon (`/kurzusok`)

| Kérdés | Válasz |
| --- | --- |
| K1 | Igen, árat keres. |
| K2 | Igen, az egyik kártyán ott a 79 500 Ft. |
| K3 | **Nem.** A másik kártyán **semmi nincs az ár helyén.** |
| K4 | Bizonytalan. |

### Akadályok

**2.1 🔴 Az ingyenes kurzus kártyáján nincs semmilyen ár-jelölés.**
Mérve: a fizetős kártyán ott a „79 500 Ft”, az „SOS Kézrelax villámkurzus”
kártyán **az ár helye üres**. Az „ingyenes” szó csak a leírás első szavaként
bújik meg („Ingyenes villámkurzus: a 3 legjobb gyakorlatunk…”).
Kovácsné, aki árakat pásztáz, nem szöveget olvas, ezt így fordítja le:
*„az egyiknél kiírták az árat, a másiknál elfelejtették, az biztos drága lesz”.*

A kód oldaláról ez nem véletlen: a kártya csak akkor ír árat, ha van beállított
összeg (`src/components/courses/CourseCard.tsx:52-56`). Az ingyenes esetre nincs ága.
*Javaslat (felirat):* a kártyán az ár helyén álljon egy jól látható,
zöld-semleges címke: **„Ingyenes”**. Ugyanaz a szó, ugyanazon a helyen, mint a
forintösszeg, ahogy a WCAG 2.2 3.2.4 (konzisztens azonosítás) elvárja
([W3C SC 3.2.4](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html)).

**2.2 🟡 A kártyákon nincs gomb, csak a cím kattintható.**
Mérve: a kattintható cím-link mérete **241×22 px** és **234×22 px**. Ez alacsonyabb,
mint a WCAG 2.2 2.5.8 által kért 24 CSS px
([W3C SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)),
és fájós hüvelykujjal telefonon nehéz eltalálni. (A borítókép is link, de azt nem
szokás linknek nézni.)
*Javaslat:* minden kártya kapjon a leírás alá egy valódi gombot:
**„Megnézem a programot”**, illetve az ingyenesnél **„Elkezdem ingyen”**.

**2.3 🟡 A szűrő fölöslegesen ott van.**
A listaoldal tetején két csip: „Összes” és „Kézrehabilitációs kurzusok”. Két
kurzus van, mindkettő ugyanabban a kategóriában. A szűrés nem szűr semmit.
*Javaslat:* amíg egy kategória van, a csipsor ne jelenjen meg.

### Ítélet

A fizetős program ára **jól látható és tisztességes** („egyszeri díj, további
költség nincs”). Az ingyenes kurzusé nem létezik a felületen. Kattintásszám az
árig: **1** (jó), ha a fejléc gombját használja.

---

## 4. Feladat 3: „Megveszem az otthoni programot.”

### Az út végigjátszva (asztali gép)

| # | Lépés | Kattintás | Mit lát |
| --- | --- | --- | --- |
| 0 | Kezdőlap | (süti-sáv elintézése) | — |
| 1 | Fejléc „Kurzusok” | 1 | Listaoldal, két kártya |
| 2 | „Otthoni KézRehab Program” cím | 2 | Kurzusoldal |
| 3 | „Megveszem” | 3 | Pénztár |
| 4 | Űrlap kitöltése, „Megrendelés és fizetés” | 4 | (itt megálltam) |

**Összesen 4 kattintás.** Ez rendben van.

### Amit a kurzusoldalon lát

A jobb oldali dobozban: két kategória-címke, a cím három sorban, a leírás, három
pipa, majd **„Ár: 79 500 Ft”**, alatta kis betűvel **„egyszeri díj, további
költség nincs”**, majd a nagy kék **„Megveszem”** gomb, alatta „Kinek való?”
szöveglink és **„● 30 napos kipróbálási garancia”**.

Ez a doboz jól van összerakva. Balra a tartalom hosszan, érthetően, szaknyelv
nélkül. A tetején négy ugrógomb: „Mi ez? / Hogyan működik? / Kinek való? / Garancia”.

### Akadályok

**3.1 🟠 Az ár és a gomb asztali gépen a hajtás alá esik.**
Mérve: a „Megveszem” **y=922 px**, a 900 px magas képernyőnél éppen lejjebb. A
képernyő tetején Kovácsné a két címkét, a háromsoros címet és a leírást látja,
de **sem árat, sem gombot**.
*Javaslat:* a doboz tetejéről el lehet hagyni a két kategória-címkét (nem
segítenek a vásárlásban), és a címet szűkebb sorközzel, két sorba tördelni. A cél
mérhető: **az ár és a „Megveszem” 900 px fölé kerüljön** 1440×900-on. A NN/g
görgetés-adata szerint ez a különbség a nézési idő 57%-a és 17%-a között van.

**3.2 🟡 A „bevezető ár” csak a lap alján derül ki.**
A garancia szövegében, 6143 px-nél: „A program eredeti ára 119 000 Ft, bevezető
áron most 79 500 Ft-ért érhető el.” Ez a legerősebb érv, és a lap legalján van.
*Javaslat:* az ár mellett, a gomb fölött: **„119 000 Ft helyett most 79 500 Ft”**,
az áthúzott eredeti árral. (Ha az akció valós és időben korlátos, azt is írjuk ki.)

**3.3 🟢 Amit jól csinál a pénztár:** a legelső mondat az űrlap fölött:
*„A vásárláshoz nem kell regisztrálni. A fizetés után erre a címre küldjük a
hozzáférést és egy linket, amivel jelszót állítasz be a fiókodhoz.”*
Ez pontosan az a mondat, ami kell. A Baymard mérése szerint a pénztárban a
kötelező regisztráció a kosárelhagyások **18%-áért** felel
([Baymard — Cart Abandonment Rate](https://baymard.com/lists/cart-abandonment-rate)),
és a vendégvásárlás megtalálhatósága a leggyakoribb hiba
([Baymard — Checkout Usability](https://baymard.com/research/checkout-usability)).
Itt ez jól van megoldva. **Kovácsné érti, hogy nem kell regisztrálnia.**

**3.4 🔴 A pénztár nem mondja meg, mi történik a gomb megnyomása után.**
A gomb felirata „Megrendelés és fizetés”, de az oldalon **sehol nincs leírva, hogy
átirányítjuk egy másik oldalra (Barion), és ott kell megadni a kártyaadatokat**.
Nincs kártyalogó, nincs lakat, nincs egy mondat sem a biztonságról. A kurzusoldalon
lejjebb ott van ugyan, hogy „Bankkártyás fizetés a Barionon keresztül. A bankkártya
adatait mi nem látjuk.”, de a pénztárban, ahol számít, nincs.

A Baymard mérése szerint a vásárlók **19%-a azért hagyja ott a pénztárt, mert nem
bízik meg az oldalban a kártyaadataival**. Kovácsné éppen ebbe a csoportba tartozik.
*Javaslat (felirat), közvetlenül a gomb fölé:*
> **Biztonságos fizetés.** A gombra kattintva a Barion fizetési oldalára viszünk,
> ott adod meg a kártyaadataidat. Ezeket mi nem látjuk és nem tároljuk.
> Ha meggondolod magad, a fizetés megszakítható.

És a gomb felirata legyen egyértelműen az, ami történik: **„Tovább a biztonságos
fizetéshez”**. Így az ige leírja a cselekvést, ahogy a GOV.UK tervezési rendszere
kéri („Write button text in sentence case, describing the action it performs”,
[GOV.UK Design System — Button](https://design-system.service.gov.uk/components/button/)).

**3.5 🟠 Nincs összegzés a gomb közelében.**
Az összeg (79 500 Ft) csak az oldal tetején szerepel, egyszer. Amíg Kovácsné a
hetedik mezőt tölti ki, az összeg már kigörgött a képernyőről. Nincs „Összesen”
sor, nincs áfa-mondat, és nincs visszaút a kurzusoldalra sem.
*Javaslat:* a gomb fölé egy rövid összegző blokk:
> Otthoni KézRehab Program · **79 500 Ft**
> Fizetendő összesen: **79 500 Ft** (az ár az áfát tartalmazza)

**3.6 🟠 A számlázási űrlap hosszabb, mint amit egy videótanfolyam indokol.**
Mérve: **7 kötelező mező** (e-mail, név, számlázási név, irányítószám, település,
cím, plusz az adószám opcionálisan) és **2 kötelező jelölőnégyzet**. Kovácsné, aki
csak videókat vesz, nem érti, minek a lakcíme.
*Javaslat:* egy mondat a „Számlázási adatok” cím alá: **„A számla kiállításához a
jogszabály kéri ezeket az adatokat. Postai küldemény nem lesz.”** (Ha jogilag
lehetséges, a cím-mezőket érdemes egyetlen mezőbe vonni.)

**3.7 🔴 Az elállási jelölőnégyzet szövege ellentmond magának.**
A pénztárban ez áll:

> ☐ Kifejezetten kérem, hogy a digitális tartalomhoz a hozzáférés azonnal megkezdődjön.
> *„Ha nem járulsz hozzá az azonnali hozzáféréshez, a kurzust 14 nap elteltével éred el.”*
> ☐ Tudomásul veszem, hogy a teljesítés megkezdésével elveszítem a 14 napos elállási jogomat.

A magyarázó mondat választást ígér. **A valóságban mindkét négyzet kötelező**
(mérve: `required` mindkettőn, `waiverStart` és `waiverLoss`), tehát a „nem járulok
hozzá” út nem létezik: pipa nélkül a megrendelés nem indul el.
Kovácsné vagy hiába keresi a „14 nap múlva kérem” lehetőséget, vagy pipál, és
utólag érzi becsapva magát.
*Javaslat:* vagy legyen valódi a választás (két rádiógomb: „Azonnal szeretném
elérni” / „Megvárom a 14 napot”), vagy tűnjön el a félrevezető mondat, és a szöveg
legyen őszinte: **„A kurzust a fizetés után azonnal eléred. Ezért a jogszabály
szerint az azonnali kezdéshez hozzá kell járulnod, és ezzel a 14 napos elállási
jog megszűnik. A 30 napos pénzvisszafizetési garanciánk ettől függetlenül él.”**

---

## 5. Feladat 4: „Van valami ingyenes?” (a legsúlyosabb szakasz)

Ez az a feladat, ahol a felület **következetesen az ellenkezőjét mondja annak,
ami igaz**. Végigjátszva, lépésről lépésre:

| # | Hol | Mit lát | Mit gondol Kovácsné |
| --- | --- | --- | --- |
| 1 | Kezdőlap, hero | gomb: **„Ingyenes SOS gyakorlatok”** | „Van ingyenes, jó.” |
| 2 | Kattint | Legörget az „Ingyenes” szalagra: *„SOS Kézrelax — ingyenes villámkurzus”*, gomb: **„Elindítom az ingyenes kurzust”** | „Most elindul.” |
| 3 | Kattint | **A kurzusok listaoldalára kerül.** Semmi nem indult el. | „Ez most mi volt? Hova jutottam?” |
| 4 | Listaoldal | Az SOS-kártyán **nincs ár, nincs „Ingyenes” felirat** | „Ez akkor most fizetős?” |
| 5 | Kattint a címre | Kurzusoldal. A dobozban: cím, leírás („Ingyenes villámkurzus: …”), három pipa, **nagy kék gomb: „Megveszem”**. Ár sehol, „Ingyenes” címke sehol. | „Mégis fizetni kell? Mennyit?” |
| 6 | Mobilon lejjebb görget | Az alsó ragadós sávon **egyetlen szó: „Megveszem”**, összeg nélkül (a fizetősnél ugyanitt „79 500 Ft Megveszem” áll) | „Nem írják ki az árat. Ez gyanús.” |
| 7 | Rákattint | **Pénztár.** A termék neve ott van, **összeg sehol**. Kéri az e-mailt, nevet, **számlázási nevet, irányítószámot, települést, címet**, és az elállási pipákat. A gomb: **„Megrendelés és fizetés”** | „Ingyenesnek mondták, most meg a lakcímemet kérik egy ár nélküli megrendelőlapon. **Bezárom.**” |

### A négy kérdés

| Kérdés | Válasz |
| --- | --- |
| K1 | Igen, keresi az ingyenes lehetőséget. |
| K2 | Igen, a kezdőlapon jól látható. |
| K3 | **Nem.** Az „Elindítom” nem indít el semmit, a „Megveszem” nem vásárlás. |
| K4 | **Nem.** Minden lépés után rosszabbul érti a helyzetet, mint előtte. |

### Amit a persona pontosan gondol a „Megveszem” gombról egy ingyenes terméken

Három reakció közül valamelyik, mindegyik rossz nekünk:

1. **„Akkor ez mégsem ingyenes.”** Becsapva érzi magát, és elmegy. Ez a
   legvalószínűbb: az „ingyenes” szó a leírás belsejében van, a **gomb** viszont
   nagy, kék és azt mondja, hogy megveszi.
2. **„Biztos elrontottak valamit.”** Ha ez elromlott, akkor mi romolhatott még el
   a fizetésnél? A bizalom elszáll.
3. **„Rákattintok, hátha kiderül az ár.”** Rákattint, és **ár nélküli, teljes
   számlázási űrlapot** kap. Ez a legrosszabb: úgy érzi, csapdába csalták.

Egyik esetben sem lesz belőle vevő. Márpedig **éppen ez a kurzus volna a
becsalogató**: az ingyenes próba, amiből később fizető vevő lesz.

### 5.1 🔴 A hiba oka és a javítás (mérve)

Ez **nem programozási hiba, hanem egy elrontott beállítás az adminban.**

A kód pontosan tudja, mit kellene tennie. Ha egy terméken az ár-pipa
(`priceInHUFEnabled`) **ki van kapcsolva**, akkor:

- a dobozban **„Ingyenes”** felirat jelenik meg (`CourseBuybox.tsx:84-86`),
- a gomb felirata **„Ingyenes — azonnal eléred”** lesz, és a Kurzusaim oldalra
  visz, nem a pénztárba (`src/lib/courses.ts` `resolveCourseCta`),
- belépéskor a rendszer **automatikusan hozzáadja** a felhasználó kurzusaihoz
  (`src/lib/free-course-grant.ts`).

Az élő SOS-terméken ez a pipa **nincs kikapcsolva** (be van kapcsolva vagy
beállítatlan), **az összeg pedig üres**. Ezt a mért viselkedésből lehet
egyértelműen visszafejteni: nincs ár, nincs „Ingyenes”, a gomb „Megveszem”, és a
pénztárba visz. A kód ezt az állapotot a saját kommentjében így nevezi: *„az
ár-pipa BE van kapcsolva, de az ár ÜRES (konfigurációs hiba)”*
(`src/lib/courses.ts:200-219`). Ilyenkor szándékosan nem ír „Ingyenes”-t, mert az
az ár hiányában megtévesztő lenne, viszont a gomb marad „Megveszem”.

> **A javítás:** az adminban az „SOS Kézrelax villámkurzus” terméken az ár-pipát
> **ki kell kapcsolni**. Egy kattintás, kódmódosítás nélkül. Ettől a kártya, a
> doboz, a gomb, a ragadós sáv és a hozzáférés-adás **egyszerre** helyreáll.

### 5.2 🟠 Ami a javítás után is hiányzik

A pipa átállítása után a gomb a `/kurzusaim` oldalra visz. Aki **nincs bejelentkezve**
(vagyis minden új látogató), azt a rendszer a **belépőoldalra dobja**, ahol ez áll:
*„Lépj be a fiókodba a kurzusaid, a rendeléseid és a lejátszásaid eléréséhez.”*
Egy szó sincs arról, hogy miért került oda, se arról, hogy az ingyenes kurzushoz
regisztrálnia kell.
*Javaslat:* a belépőoldal a `returnUrl` alapján írjon ki egy magyarázó sort, például:
**„Az ingyenes SOS Kézrelax kurzushoz készíts egy fiókot, vagy lépj be. A kurzus
azonnal megjelenik a Kurzusaim oldaladon.”** És a „Regisztrálj” legyen gomb, ne
apró szöveglink.

Egy apróság ugyanide: a kódban lévő gombfelirat jelenleg **„Ingyenes — azonnal
eléred”**. A gondolatjel itt töltelék-elválasztó, amit a projekt saját szabálya
tilt (`.claude/skills/termektervezes`, 2. pont). Javasolt alak: **„Elkezdem
ingyen”**, az „azonnal eléred” pedig a gomb alatti magyarázó sorba.

### 5.3 🟡 „Elindítom az ingyenes kurzust” rossz helyre visz

Mérve: a kezdőlapi szalag gombja a `/kurzusok` listaoldalra mutat, nem a kurzus
oldalára. A hero „Ingyenes SOS gyakorlatok” gombja pedig csak egy horgony, ami
ugyanerre a szalagra görget (ez viszont pontosan működik: a célszakasz a ragadós
fejléc alá kerül, nem alá csúszik).

Összesen **hat link mutat a `/kurzusok` oldalra a kezdőlapon, hat különböző
felirattal**: „Kurzusok” (fejléc), „Kurzusok megtekintése”, „Összes kurzus
megtekintése”, „Elindítom az ingyenes kurzust”, „Tovább a programra”, „Megnézem a
kurzusokat”. Kovácsné hat különböző ígéretet olvas, és mindig ugyanoda jut.
*Javaslat:* a szalag gombja mutasson a `/kurzusok/sos-kezrelax-villamkurzus`
címre, és a felirata legyen **„Elkezdem az ingyenes kurzust”**. Az azonos célra
mutató linkek kapjanak azonos feliratot (WCAG 2.2 3.2.4).

---

## 6. Feladat 5: „Megvettem, most hogyan kezdem el?”

Ez a második legsúlyosabb szakasz, és a mérés egyértelmű.

### A mérés

Végigmértem mind a 32 letöltött oldalváltozatot (asztali és mobil), és
megszámoltam, hány link mutat a belépésre, a fiókra és a kurzusaimra:

| Oldal | link a `/belepes`-re | link a `/kurzusaim`-ra |
| --- | --- | --- |
| Kezdőlap (asztali és mobil) | **0** | **0** |
| Kurzusok listaoldal | **0** | **0** |
| Mindkét kurzusoldal | **0** | **0** |
| Kapcsolat, Rólunk, Szolgáltatások, Tudástár | **0** | **0** |
| ÁSZF, Adatvédelem, Impresszum | **0** | **0** |
| Lábléc (minden oldalon) | **0** | **0** |
| Mobil hamburger menü | **0** | **0** |
| Pénztár | 1 (apró szöveglink a mondat belsejében: „be is jelentkezhetsz”, **120×19 px**) | 0 |

### 6.1 🔴 A site-kereten nincs belépés. Sehol.

A fejléc: logó, Szolgáltatások (almenüvel), Rólunk, Tudástár, Kapcsolat, és a
„Kurzusok” gomb. A mobil menü: Szolgáltatások (+ Rendelői kezelések, Szakmai
képzés, SOS KézRelax), Rólunk, Tudástár, Kapcsolat. **Belépés nincs. Fiók nincs.
Kurzusaim nincs. Kijelentkezés az egész oldalon nincs** (a `src`-ben egyetlen
felületi komponensben sincs kilépés-gomb).

Kovácsné forgatókönyve a vásárlás után: kap egy e-mailt a jelszóbeállító linkkel,
beállítja a jelszót, végignéz egy videót. **Másnap** újra elindul, beírja a
`kineticare.hu` címet, és **nem talál sehol egy „Belépés” gombot**. Végigolvassa
a fejlécet, a láblécet, megnyitja a hamburger menüt. Nincs.

Ekkor vagy előkeresi a régi e-mailt, vagy ír nekünk, hogy „elvesztettem a
tanfolyamot”, vagy azt hiszi, hogy becsapták.

*Javaslat, és ez a legfontosabb tétel az egész dokumentumban:*
a fejlécbe, a „Kurzusok” gomb mellé kerüljön egy **„Belépés”** szöveges link,
belépett állapotban pedig **„Kurzusaim”** (mellette a kilépés lehetőségével).
Mobilon a hamburger menü **első** eleme legyen ugyanez. A menü a CMS-ből jön
(Menus gyűjtemény), tehát ez részben tartalmi munka.

A felirat legyen mindenütt ugyanaz a szó („Belépés”, nem „Bejelentkezés”, nem
„Fiók”), a WCAG 2.2 3.2.4 konzisztencia-követelménye szerint.

### 6.2 🟡 A jelszó-beállítás és a fizetés utáni képernyők viszont rendben vannak

Igazságos vagyok: amit a séta során el tudtam olvasni, az jó.

- A **köszönőoldal** vendégvásárlónak ezt írja: „A fizetésed feldolgozzuk, és a
  visszaigazolót e-mailben küldjük. Ha vendégként vásároltál, a levélben egy
  **jelszó-beállító link** is lesz.” Ez pontos és megnyugtató.
- A **sikertelen fizetés** oldala kifejezetten jó: „A fizetésedet a bank
  elutasította vagy megszakította. **Semmi sem került levonásra**, bármikor
  újrapróbálhatod.” Pontosan azt mondja, amitől Kovácsné fél.
- A **Kurzusaim** képernyő (a kódból olvasva) állapot-kártyákat mutat, haladásjelzővel,
  és a gomb megnevezi a **következő leckét** („Folytatás: …”). Ez pont az, ami kell.
  Kár, hogy nem lehet odajutni.
- Az **elfelejtett jelszó** oldal szövege szintén rendben van.

### 6.3 🟠 A köszönőoldal rendelésszám nélkül technikai hibaüzenetet mond

Ha valaki a `/fizetes/koszonom` címre rendelésszám nélkül érkezik (például
könyvjelzőből vagy elrontott e-mail-linkről), ezt kapja: **„Hiányzik a
rendelésszám a hivatkozásból.”** Ez fejlesztői mondat.
*Javaslat:* **„Nem találjuk, melyik rendelésről van szó. Ha most fizettél, néhány
percen belül e-mailt küldünk a visszaigazolással. A megvásárolt kurzusaidat a
Kurzusaim oldalon éred el.”**

---

## 7. Feladat 6: „Kérdésem van, kit hívjak?”

### Az út

A fejlécben ott a **„Kapcsolat”** menüpont. **1 kattintás.** K1-K3 rendben.

### Amit talál

Egy űrlap: Név, E-mail-cím, Tárgy, Üzenet, egy kötelező adatvédelmi pipa, és az
„Üzenet küldése” gomb. Fölötte: *„Kérdésed van a kurzusainkkal, a rendeléseddel
vagy a rehabilitációs programmal kapcsolatban? Írj nekünk üzenetet, munkatársunk
hamarosan válaszol.”*

### Akadályok

**6.1 🔴 A kérdésre („kit hívjak?”) nincs válasz: az oldalon nincs telefonszám.**
Mérve (a sitemap összes oldala plusz a belépés, regisztráció, pénztár, kosár,
köszönő- és hibaoldalak): **egyetlen telefonszám** szerepel valahol, és az a
tárhelyszolgáltatóé (+36 1 789-2-789, az impresszumban). A Kineticare-nek nincs
telefonszáma sehol.
Kovácsné korosztálya és lelkiállapota (fáj a keze, 79 500 Ft-ot költene) telefont
keres. Ha nincs, azt gondolja: *„ezekkel nem lehet beszélni”*.
*Javaslat:* a Kapcsolat oldal tetejére, az űrlap **fölé**, egy „Így éred el
minket” doboz: telefonszám (ha van ügyfélfogadási idő, azzal együtt), e-mail-cím
kattinthatóan, és a válaszidő. Ha telefon nincs, akkor is legyen ott az e-mail és
az őszinte mondat: **„Munkanapokon 24 órán belül válaszolunk.”**

**6.2 🔴 Két különböző e-mail-cím szerepel az oldalon.**
Mérve: **minden oldal láblécében** az **info@kineticare.hu** áll, az **impresszum
és az ÁSZF** viszont az **egeszsegmozgastamogatas@gmail.com** címet adja meg
hivatalos elérhetőségként. Egy gmail-es cím egy 79 500 Ft-os terméket árusító
cégnél önmagában is riasztó, két különböző cím pedig azt sugallja, hogy az oldal
félkész.
*Javaslat:* egyetlen cím legyen mindenhol (`info@kineticare.hu`), az impresszumban
és az ÁSZF-ben is átvezetve.

**6.3 🟡 A „Tárgy” szabad szöveges és kötelező.**
Kovácsné nem tudja, mit írjon oda. Ez egy fölösleges gondolkodási lépés.
*Javaslat:* legördülő lista, előre megírt lehetőségekkel: „Kérdés a kurzusról”,
„Rendeléssel kapcsolatos ügy”, „Technikai probléma”, „Egyéb”.

**6.4 🟡 Nincs visszajelzés arról, mikorra várható válasz.**
A „hamarosan” semmit nem jelent.

---

## 8. Feladat 7: „Meggondoltam magam. Hogyan kérhetek vissza pénzt?”

### Az út

A lábléc három jogi linket kínál: **Adatkezelési és adatvédelmi szabályzat**,
**Általános szerződési feltételek**, **Impresszum**. Ezek minden oldalon ott vannak,
és a nevük érthető. **1 kattintás**, K1-K3 rendben.

Egy fenntartással: a kezdőlapon a lábléc **14 053 px-nél** van, ami a **15,6.
képernyő**. Aki a kezdőlapon áll, annak 15 képernyőt kell legörgetnie. (A rövidebb
oldalakról viszont gyorsan elérhető, és a kezdőlapon nincs „vissza a tetejére”
gomb sem.)

### 8.1 🔴 Az ÁSZF az ellenkezőjét mondja annak, amit a kurzusoldal ígér

A kurzusoldalon ez áll, kiemelt dobozban:

> **30 napos kipróbálási garancia.** Próbáld ki a programot 30 napig… Ha úgy érzed,
> hogy nem segített, **csak írj egy e-mailt, és kérdés nélkül visszafizetjük a
> program árát.** Semmit sem kockáztatsz.

Az ÁSZF „Vegyes rendelkezések” fejezetében pedig ez:

> **„Fizetés után a Vásárló pénzvisszafizetést nem kérhet, a szerződés
> teljesítettnek minősül.”**

Mérve: a **„garancia” szó nulla alkalommal fordul elő az ÁSZF-ben**, a 30 napos
garanciáról egy szó sincs benne. Van viszont egy külön fejezet **„Elállási jog
kizárása”** címmel.

Kovácsné, ha a nagyobb összeg előtt elolvassa az apró betűs részt (és sokan
elolvassák), pontosan az ellenkezőjét találja annak, amit a marketing ígért.
Ez nem apró következetlenség: ez az a pont, ahol a vásárló azt mondja, hogy
*„akkor ez át akar verni”*, és elmegy.
*Javaslat:* az ÁSZF kapjon egy **„Önkéntes 30 napos pénzvisszafizetési garancia”**
fejezetet, ami a jogszabályi elállási jogon **felül** vállalt kedvezményként írja
le a garanciát (kinek, meddig, hogyan, mennyi idő alatt utaljuk vissza), és a
„Vegyes rendelkezések” ellentmondó mondata ehhez legyen igazítva. Ez jogi
átnézést igényel, nem ügynöki feladat.

### 8.2 🔴 Az ÁSZF-ben kitöltetlen helykitöltő maradt

Mérve, szó szerint az élő oldalon:

> „Adatkezelési tájékoztatónkat az alábbi linken érheti el: **[xxx]**”

Egy `[xxx]` a szerződési feltételekben. Kovácsné ebből azt olvassa ki, hogy az
oldal nincs kész, és ezért a fizetés sem biztonságos.
*Javaslat:* a helykitöltő helyére a `/adatvedelem` oldal valódi linkje.

### 8.3 🟡 A jogi oldalak megtalálhatók, de nehezen olvashatók

Az ÁSZF **17 155 px** hosszú (19 képernyő), 15 fejezettel, tartalomjegyzék nélkül.
*Javaslat:* a lap tetejére ugrópontokkal ellátott tartalomjegyzék, és a
legkeresettebb kérdésre („visszakaphatom a pénzem?”) külön, jól látható fejezet.

---

## 9. Feladat 8: Mobilnézet (390 px)

Kovácsné leggyakrabban telefonon nézi meg az oldalt, ezért ez a szakasz nem
kiegészítés, hanem a fő eset.

### Amit jól csinál (mérve)

| Ellenőrzés | Küszöb | Mért érték | Ítélet |
| --- | --- | --- | --- |
| Vízszintes görgetés 320 px-en | nincs | 7 oldalon `scrollWidth` = 320 px = `innerWidth` | ✅ |
| Hamburger gomb mérete | ≥ 24, cél 44 | **44×44 px** | ✅ |
| Menüpontok magassága a fiókban | ≥ 24 | 44-51 px | ✅ |
| Gombok magassága (Megveszem, Feliratkozom) | ≥ 24 | 50-53 px | ✅ |
| Ragadós vásárlósáv a fizetős kurzuson | — | megjelenik: **„79 500 Ft · Megveszem”** | ✅ |
| Fejléc ragadós marad görgetéskor | — | igen, 72 px | ✅ |
| Betűméret a törzsszövegben | olvasható | 18 px | ✅ |

A ragadós vásárlósáv kifejezetten jó megoldás: hosszú oldalon bármikor kéznél van
az ár és a gomb.

### Akadályok mobilon

**8.1 🔴 A süti-sáv eltakarja a hero gombjait és a „Megveszem”-et is.**
Mérve: a hero két gombja **y=667** és **y=730** px-en van, a süti-sáv **y≈727-től**
a képernyő aljáig ér (a képernyő 844 px). A „Kurzusok megtekintése” éppen csak
kilátszik a sáv fölött, az „Ingyenes SOS gyakorlatok” **teljesen a sáv alatt van**.
Ugyanez a kurzusoldalon: a **„Megveszem” gomb y=828-nál**, vagyis **a süti-sáv
alatt**. Aki nem intézi el a sütiket, az nem tud vásárolni. (A fejléc „Kurzusok”
gombja végig elérhető marad, de az csak a listaoldalra visz.)

**8.2 🔴 A kezdőlap mobilon 16 841 px, azaz húsz képernyő.**
Az első kurzuskártya **4290 px**-nél (5. képernyő), a lábléc a 20. képernyőnél.
Kovácsné türelme ennek a töredékénél elfogy.

**8.3 🔴 A mobil menüben sincs Belépés.**
Lásd a 6.1 pontot. A hamburger menü hét eleméből egy sem vezet a fiókhoz.

**8.4 🟠 Az ingyenes kurzus ragadós sávja csak ennyi: „Megveszem”.**
A fizetős kurzuson ugyanez a sáv „79 500 Ft · Megveszem”. Az ingyenesen
**összeg nélkül**, csak a gomb. A képernyő alján, végig látható helyen áll egy
felirat, ami nem igaz. Ez a legrosszabb elhelyezésű változata az 5. szakasz hibájának.

**8.5 🟡 A morzsamenü apró.**
A kurzusoldalon a „Kurzusok” visszalépő link **53×18 px** (mobilon). A 24 px-es
küszöb alatt van; fájós hüvelykujjal nehéz eltalálni.

**8.6 🟡 A pénztár jelölőnégyzetei 20×20 px-esek.**
A WCAG 2.2 2.5.8 24×24 px-et kér. **Formailag megfelel**, mert a négyzetet egy
260×80 px-es, kattintható címke veszi körül (a szabvány „Equivalent”/„Spacing”
kivétele), de a látvány kicsi, és Kovácsné nem tudja, hogy a szövegre is
rákattinthat.
*Javaslat:* a négyzet vizuálisan is legyen 24 px, és a címke kapjon látható,
kattintható hatást (halvány keret vagy háttér).

---

## 10. Amit egy átlagos felhasználó biztosan félreért — a top 10

Ez a lista a séta legfontosabb terméke. Sorrend: mekkora kárt okoz.

| # | Amit a felület mond | Amit Kovácsné ért belőle | Az igazság |
| --- | --- | --- | --- |
| **1** | **„Megveszem”** az ingyenes SOS kurzuson, ár nélkül | „Mégis fizetni kell, csak nem írják ki, mennyit. Ez csapda.” | A kurzus ingyenes. Egy elrontott admin-beállítás miatt viselkedik fizetősként. |
| **2** | A fejlécben nincs **„Belépés”** | „Nincs itt fiók, ez csak egy szórólap-oldal.” Vásárlás után: „Elveszett a tanfolyamom.” | Van fiók, Kurzusaim oldal, haladásjelző. Csak nem vezet oda semmilyen link. |
| **3** | Az ingyenes kártyán **üres az ár helye** | „Elfelejtették kiírni. Biztos drága.” | Ingyenes. |
| **4** | **„Elindítom az ingyenes kurzust”** | „Most elindul a kurzus.” | A kurzusok listaoldalára visz, nem indul el semmi. |
| **5** | **„Megrendelés és fizetés”**, minden magyarázat nélkül | „Ha megnyomom, azonnal leveszik a pénzt a kártyámról. Melyik kártyámról?” | Átirányítás a Barion fizetési oldalára, ahol még megszakítható. |
| **6** | Pénztár: **„a kurzust 14 nap elteltével éred el”**, miközben a pipa kötelező | „Van egy másik, biztonságosabb út.” | Nincs. Pipa nélkül nem lehet megrendelni. |
| **7** | Kurzusoldal: **„30 napos kipróbálási garancia… kérdés nélkül visszafizetjük”**, ÁSZF: **„pénzvisszafizetést nem kérhet”** | „Hazudnak.” | A garancia valós szándék, de az ÁSZF-be nem került bele. |
| **8** | ÁSZF: **„…az alábbi linken érheti el: [xxx]”** | „Ez az oldal nincs kész. Akkor a fizetés sem az.” | Kitöltetlen helykitöltő. |
| **9** | Lábléc: **info@kineticare.hu**, impresszum: **…@gmail.com** | „Melyik az igazi? Van egyáltalán cégük?” | Ugyanaz a cég, két helyen két cím. |
| **10** | Kezdőlap: öt képernyőnyi kézfotó, tartalom nélkül | „Nem történik semmi. Rossz helyen járok.” | A tartalom lejjebb van, csak nagyon messze. |

---

## 11. Bizalom és félelem: mi tartja vissza a pénzköltéstől

Kovácsné nem azért nem vásárol, mert drágának tartja. Azért nem, mert **nem meri**.
A Baymard mérése szerint a pénztárban a legfőbb visszatartó okok: váratlan
költségek (40%), **bizalmatlanság a kártyaadatokkal szemben (19%)**, kötelező
regisztráció (18%) és bonyolult folyamat (17%)
([Baymard — Cart Abandonment Rate](https://baymard.com/lists/cart-abandonment-rate)).
Végigmentem ezeken a Kineticare-en:

### Ami megnyugtatja (ez már megvan, ne nyúljunk hozzá)

- **„Ár: 79 500 Ft · egyszeri díj, további költség nincs”** közvetlenül a gomb
  fölött. Ez a legjobb mondat az egész oldalon: kizárja a váratlan költséget.
- **„A vásárláshoz nem kell regisztrálni.”** A pénztár legelső mondata.
- **„30 napos kipróbálási garancia”** a gomb alatt, és részletesen kifejtve lejjebb.
- **„A bankkártya adatait mi nem látjuk.”** (a kurzusoldal „Hogyan működik?” részében)
- **„Semmi sem került levonásra, bármikor újrapróbálhatod.”** a sikertelen fizetés oldalán.
- A **„Kinek NEM való?”** lista a kurzusoldalon. Ez ellentmond a rámenős
  értékesítésnek, és éppen ezért hiteles: Kovácsné látja, hogy nem akarnak
  mindenáron eladni neki.
- Gyógytornász háttér, egyesületi tagság, sajtómegjelenések, három névvel és
  foglalkozással aláírt vélemény.

### Ami elbizonytalanítja

| Félelem | Mi váltja ki | Mi oldaná fel |
| --- | --- | --- |
| „Levonják a pénzt, mielőtt észbe kapnék.” | A „Megrendelés és fizetés” gomb minden magyarázat nélkül. | Egy mondat a gomb fölé a Barion-átirányításról és arról, hogy a fizetés megszakítható. |
| „Ki tudja, hova kerül a kártyaszámom.” | A pénztárban nincs se Barion-név, se kártyalogó, se lakat. | Fizetési logó és a „mi nem látjuk a kártyaadataidat” mondat átemelése a pénztárba. |
| „Minek a lakcímem egy videóhoz?” | 7 kötelező mező, köztük irányítószám, település, utca. | Egy mondat: „A számla kiállításához jogszabály kéri. Postai küldemény nem lesz.” |
| „Ha nem válik be, itt ragadok 79 500 Ft-tal.” | Az ÁSZF kizárja a pénzvisszafizetést, a kurzusoldal ígéri. | Az ÁSZF-be be kell írni a 30 napos garanciát. |
| „Ha baj van, nem tudok szólni senkinek.” | Nincs telefonszám, két különböző e-mail-cím, nincs válaszidő. | „Így éred el minket” doboz a Kapcsolat oldal tetején. |
| „Ez az oldal nincs kész.” | `[xxx]` az ÁSZF-ben, üres Tudástár, „Megveszem” egy ingyenes terméken. | Mind a három javítható tartalmi munkával. |
| „Kifizettem, de nem tudom, mi lesz most.” | A pénztár nem mondja el előre, mi történik a fizetés után. | Az „Így működik” három lépése (megveszed / azonnal eléred / otthon gyakorolsz) átemelhető a pénztárba, a gomb mellé. |

**Egy mondatban:** az oldal *tartalmilag* megbízható és szakmailag hiteles, de a
*vásárlás pillanatában* magára hagyja a vevőt. A javítások nagy része szöveg és
beállítás, nem fejlesztés.

---

## 12. Mérési napló (számok, amikre a fenti állítások épülnek)

**Oldalméretek (asztali 1440×900):**
kezdőlap 14 173 px (15,7 képernyő) · fizetős kurzusoldal 7256 px · ingyenes
kurzusoldal 5514 px · pénztár 2371 px · ÁSZF 17 155 px · adatvédelem 13 091 px.

**Kezdőlap kulcspontjai (px, oldal tetejétől):**
`film-hero` szakasz 0-4140 · H1 174 · hero gombok 672 · süti-sáv 834 ·
kurzusszakasz kezdete 4249 · első kurzuskártya 4576 · **első forintösszeg 5001** ·
ingyenes szalag 5252 · lábléc jogi linkek 14 053.

**Mobil (390×844):** kezdőlap 16 841 px (20 képernyő) · hero gombok 667 és 730 ·
süti-sáv kb. 727-828 · első kurzuskártya 4290 · „Megveszem” a kurzusoldalon 828.

**Érintőcélok:** hamburger 44×44 ✅ · fejléc-menüpontok 45-46 px ✅ · elsődleges
gombok 50-53 px ✅ · **kurzuskártya cím-link 22 px ⚠** · **morzsamenü 18-19 px ⚠** ·
jelölőnégyzet 20×20, de 260×80-as kattintható címkével ✅.

**Kontraszt (számolt arányok, nem szemre):**

| Elem | Mért | Kell | Ítélet |
| --- | --- | --- | --- |
| Fejléc „Kurzusok” gomb szövege | 20,98:1 | 4,5 | ✅ |
| Hero elsődleges gomb szövege | 5,45:1 | 4,5 | ✅ |
| „Megveszem” gomb szövege | 5,45:1 | 4,5 | ✅ |
| Ár a dobozban | 15,63:1 | 4,5 | ✅ |
| Ár alatti megjegyzés (14 px) | 9,30:1 | 4,5 | ✅ |
| Garancia-sor | 9,30:1 | 4,5 | ✅ |
| Kártya leírószöveg | 9,30:1 | 4,5 | ✅ |
| Gombfelület a lap hátteréhez | 5,16:1 | 3,0 | ✅ |
| Fehér másodlagos gomb kerete (2 px) | 14,79:1 | 3,0 | ✅ |
| Süti „Elfogadom” felülete a sávhoz | 15,63:1 | 3,0 | ✅ |
| Fókuszgyűrű (3 px) | 5,16:1 | 3,0 | ✅ |

**Nincs mért kontraszt- vagy fókuszhiba.** A színek és a betűk rendben vannak.
A gondok a feliratokban, a megtalálhatóságban és a folyamatban vannak.

**Egyéb mért értékek:** sorhossz a törzsszövegben 60 karakter (a 45-85 sávban ✅) ·
vízszintes görgetés 320 px-en egyik vizsgált oldalon sincs ✅ · a `#ingyenes`
horgony a ragadós fejléc alá görget, nem alá csúszik ✅ · a GYIK natív
`<details>` elemekkel készült, billentyűzettel működik ✅.

**Amit nem tudtam mérni:** a belépés utáni képernyőket (Kurzusaim, lejátszó, Fiók)
csak a forráskódból olvastam, mert nem regisztráltam és nem vásároltam.

---

## 13. Egy korábbi megállapítás, ami már nem igaz

Az `docs/informacios-architektura.md` első számú hibaként az üres 404-oldalt
jelölte meg. **Ez ma már nincs így.** Saját mérés (`GET /kurzsuok`, 2026-08-16):
HTTP 404, helyes oldalcím, teljes fejléc és lábléc, **15 link**, és értelmes
magyar szöveg: *„Az oldal nem található. A keresett oldal nem létezik, vagy
időközben átkerült más címre. Nézd meg a kezdőlapot, vagy használd a fenti
menüt.”* Van „Vissza a kezdőlapra” gomb is. **Javítva.**

Ugyanennek a dokumentumnak a 2. és 3. pontja (nincs belépési pont; az ingyenes
kurzus nem ingyenes) viszont **ma is reprodukálható**, a fenti mérésekkel.

---

## 14. Mit javítsunk, ebben a sorrendben

A sorrendet az adja, hogy mennyi vevőt veszítünk vele, osztva a ráfordítással.

| # | Teendő | Típus | Hol |
| --- | --- | --- | --- |
| 1 | Az SOS kurzuson az ár-pipa kikapcsolása | **admin-beállítás**, 1 kattintás | CMS, Products |
| 2 | „Belépés” a fejlécbe és a mobil menübe (belépve „Kurzusaim” és kilépés) | tartalom + kis fejlesztés | CMS Menus, `Header.tsx`, `MobileNav.tsx` |
| 3 | Az ÁSZF `[xxx]` helykitöltője és a pénzvisszafizetést kizáró mondat | **tartalom + jogi átnézés** | CMS, jogi oldalak |
| 4 | Biztonságos fizetés magyarázata és összegzés a pénztár gombja fölé | szöveg + kis fejlesztés | `CheckoutForm.tsx` |
| 5 | „Ingyenes” címke a kurzuskártyán, gomb a kártyákra | fejlesztés | `CourseCard.tsx` |
| 6 | Az elállási pipák szövegének őszintére írása | szöveg | `CheckoutForm.tsx` |
| 7 | „Így éred el minket” doboz a Kapcsolat oldal tetejére, egységes e-mail-cím | tartalom | CMS |
| 8 | A filmes hero rövidítése, a kurzusszakasz feljebb hozása | fejlesztés | kezdőlap-szekciók |
| 9 | Süti-sáv keskenyítése, hogy mobilon ne takarja a gombokat | fejlesztés | süti-komponens |
| 10 | Az azonos célra mutató linkek egységes feliratozása a kezdőlapon | tartalom | CMS, szekciók |

Az 1-3. pont **kódmódosítás nélkül vagy majdnem anélkül** elvégezhető, és a három
legsúlyosabb bizalmi problémát oldja meg.

---

## 15. Források

**Módszertan**
- NN/g: Cognitive Walkthroughs — https://www.nngroup.com/articles/cognitive-walkthroughs/
- Usability Body of Knowledge: Cognitive Walkthrough — https://www.usabilitybok.org/cognitive-walkthrough/
- Wharton, Rieman, Lewis, Polson: *The Cognitive Walkthrough Method: A Practitioner's Guide*, in Nielsen & Mack (szerk.): *Usability Inspection Methods*, Wiley, 1994 — https://dl.acm.org/doi/10.5555/189200.189214

**Figyelem, görgetés, oldalfelépítés**
- NN/g: Scrolling and Attention — https://www.nngroup.com/articles/scrolling-and-attention/
- NN/g: Scrolling and Attention (eredeti kutatás) — https://www.nngroup.com/articles/scrolling-and-attention-original-research/
- NN/g: UX Guidelines for Ecommerce Product Pages — https://www.nngroup.com/articles/ecommerce-product-pages/
- NN/g: How to Display Taxes, Fees, and Shipping Charges — https://www.nngroup.com/articles/ecommerce-taxes-fees/

**Pénztár és bizalom**
- Baymard Institute: Cart Abandonment Rate (70,22% átlag; a visszatartó okok százalékai) — https://baymard.com/lists/cart-abandonment-rate
- Baymard Institute: E-Commerce Cart & Checkout Usability Research — https://baymard.com/research/checkout-usability
- Baymard Institute: 6 Mobile Checkout Usability Considerations — https://baymard.com/blog/mobile-checkout
- Baymard Institute: „Free Shipping” Should Not Only Be in a Site-Wide Banner (a félrevezető „ingyenes” feliratokról) — https://baymard.com/blog/avoid-banners-only-free-shipping

**Feliratok és folyamat**
- GOV.UK Design System: Button — https://design-system.service.gov.uk/components/button/
- GOV.UK Design Notes: One thing per page — https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/

**Szabvány**
- WCAG 2.2, SC 2.5.8 Target Size (Minimum), AA, 24×24 CSS px — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2, SC 3.2.4 Consistent Identification, AA — https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
- WCAG 2.2, SC 1.4.3 Contrast (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2, SC 1.4.11 Non-text Contrast — https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

**A repó saját kutatásai**
- `docs/informacios-architektura.md` (szerkezeti térkép, hibalista)
- `docs/ertekesitesi-ux-skill.md` (felületi szabályrendszer, M1-M8)
- `docs/ux-hierarchia-audit.md`, `docs/ux-belso-oldalak-kutatas.md`
