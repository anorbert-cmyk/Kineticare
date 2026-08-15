# UX-kutatás és audit — a BELSŐ oldalak elrendezése (2026-08)

> **Mandátum (tulajdonosi, szó szerinti szándék):** „A főoldal nekem nagyon
> tetszik" → a kezdőlap NEM alakul át. „A többi oldalon jobban szeretem a
> modernebb, de jól átlátható, olvasható, könnyen érthető layoutokat. Nem
> feltétlenül mindent egymás alá." „Fontos, hogy a felhasználói élmény KUTATÁS
> ALAPON BIZONYÍTHATÓ legyen, hogy úgy a legjobb."
>
> **Ezért ez a dokumentum nem ízlés-javaslat.** Minden szabály mögött vagy
> hivatkozott forrás áll, vagy a repóban reprodukálható saját mérés — és ahol a
> kutatás vitatott vagy nem találtam meggyőző bizonyítékot, ott ez KI VAN ÍRVA
> („NINCS ERŐS BIZONYÍTÉK"). Kitalált hivatkozás nincs benne.
>
> **Státusz:** kutatási anyag és javaslat. Kódot nem módosít, felületet nem
> alakít át. A 3. fejezet szándékosan úgy van megírva, hogy a vezető egy az
> egyben beemelhesse a `docs/ertekesitesi-ux-skill.md`-be új fejezetként — azt
> a fájlt ez a dokumentum NEM írja át.
>
> **Hatókör:** `/kurzusok`, `/kurzusok/[slug]`, `/rolunk`, `/szolgaltatasok`,
> `/kapcsolat`, `/blog`, `/belepes`, `/regisztracio`, `/kosar`, `/penztar`.
> A kezdőlap (`/`) csak REFERENCIA — az marad, ahogy van.
>
> **Kapcsolódó:** `docs/ertekesitesi-ux-skill.md` (kötelező, elsőbbséget élvez),
> `docs/ux-hierarchia-audit.md` (a kezdőlap háttérkutatása).

---

## 0. Módszertan — mit néztem és hogyan

**Élő oldal.** A `https://kineticare-production.up.railway.app` publikus HTML-jét
töltöttem le mind a 11 vizsgált útvonalról (2026-08-15), és a szerver által
kiadott DOM-ot elemeztem: címsor-szerkezet, elem-sorrend, szóhossz, CTA-k,
lista- és bekezdésszám. A találatokat a repó forrásához kötöttem
(`src/app/(frontend)/`, `src/components/`, `src/app/(frontend)/styles/`).

**Sorhossz-mérés (reprodukálható).** A sorhosszt nem becsültem: a
`public/fonts/nunito-sans-var-latin*.woff2` változó betűkészletet a `fontTools`
`instantiateVariableFont`-tal a **wght = 400** (törzsszöveg) példányra állítottam,
és a `hmtx` tábla tényleges előretolásaival mértem meg a SAJÁT magyar
szövegünket (n = 5 981 karakter a `/kurzusok/1` bekezdéseiből és listáiból).

**Mért alapadatok:**

| Mennyiség | Mért érték |
|---|---|
| Átlagos karakterszélesség, Nunito Sans 400, magyar szöveg | **0,4542 em** = 7,27 px @16 px |
| A CSS `ch` egység (a „0" glif szélessége) | **0,60 em** = 9,60 px |
| **1 CSS `ch` = hány tényleges magyar karakter** | **≈ 1,32** |
| Átlagos magyar szóhossz a saját tartalmunkon (n = 4 377 szó) | **6,60 betű** |
| 7+ betűs szavak aránya | 47,2 % |
| 10+ betűs szavak aránya | 22,3 % |

Ez a legfontosabb mérési következmény, és önmagában megmagyaráz több hibát:
**a `ch` egység SZISZTEMATIKUSAN alábecsüli a valódi sorhosszt.** Aki
`max-width: 68ch`-t ír abban a hitben, hogy az 68 karakter, valójában ~90
karakteres sort állít be. Átváltó tábla a mi betűnkkel és a mi nyelvünkön:

| CSS érték | px @16 px | **tényleges magyar karakter** | Minősítés |
|---|---|---|---|
| 34ch (≈ 21,3rem) | 326 | **45** | a 45–75 sáv alja |
| 45ch | 432 | **59** | ideális |
| 49ch (≈ 30rem) | 470 | **65** | ideális |
| 56ch | 538 | **74** | a sáv teteje |
| 57ch (≈ 34rem) | 547 | **75** | a sáv felső határa |
| 60ch | 576 | **79** | a WCAG 1.4.8 (AAA) 80-as plafonja alatt, épphogy |
| 68ch | 653 | **90** | **túl hosszú** |
| 72ch | 691 | **95** | **túl hosszú** |
| `--kc-container-narrow` (720 px − 2×24 px köz) | 672 | **92** | **túl hosszú** |
| `--kc-container-wide` (1120 px − 2×24 px köz) | 1072 | **148** | **kétszerese a szabálynak** |

**Mit NEM néztem.** Nem futtattam böngészős renderelést (nincs headless böngésző
a környezetben), ezért a 320 CSS px-es reflow-t és a fókusz-sorrendet nem
mértem, csak a CSS-ből következtettem — ezeket a 6. fejezet mérési terve
külön ellenőrzési lépésként tartalmazza, nem állítom bizonyítottnak.

---

## 1. Vezetői összefoglaló — az 5 legnagyobb élmény-probléma, súlyozva

### P1 (KRITIKUS, üzleti) — A pénzt hozó oldalon EGYETLEN vásárlási gomb van, a lap tetején

A `/kurzusok/1` (79 500 Ft-os termék) teljes HTML-jében **pontosan egy**
`kc-button` fut: a `Megveszem` a jobb oldali buyboxban, a lap tetején. Alatta 821
szónyi értékesítő szöveg következik (44 listaelem: tanterv, bónuszok,
„kinek jó / kinek nem", garancia) — és a szöveg végén **nincs újabb CTA**, nincs
mobil ragadós vásárlósáv, és a buybox `position: sticky`-je is csak a
`.kc-course-hero` rácson belül tud utazni, tehát a hero után a gomb végleg
eltűnik.

Az NN/g görgetés-kutatása szerint a nézési idő 57 %-a a hajtás felett, 74 %-a az
első két képernyőn, 81 %-a az első három képernyőn telik
([Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)).
Tehát a látogató a meggyőző érveket (garancia, bónuszok) épp abban a zónában
kapja meg, ahol már alig van szem — a döntési pillanatban pedig nincs mire
kattintania. **Ez a legnagyobb közvetlen pénzveszteség a belső oldalakon.**

### P2 (KRITIKUS, mérhető) — A sorhossz a saját skillünk szabályának a kétszerese a legfontosabb oldalon

A `docs/ertekesitesi-ux-skill.md` 4. pontja kimondja: „Sorhossz törzsnél 45–75
karakter". A `.kc-richtext` osztályra viszont **sehol nincs `max-width`**
(ellenőrizve: `src/app/(frontend)/styles/content.css` és
`src/app/(frontend)/kurzusok/kurzusok.css`), a kurzusoldal pedig alapértelmezett,
**széles** `Container`-t használ (`src/app/(frontend)/kurzusok/[slug]/page.tsx:238`).
Mérve: **148 karakter/sor** — a saját szabályunk felső határának kétszerese, és a
WCAG 1.4.8 (AAA) 80-as plafonjának 85 %-kal a fölötte.

A `/rolunk` és a `/szolgaltatasok` a szűk (720 px-es) konténert kapja, ott a mért
érték **92 karakter/sor** — szintén a szabály fölött.

### P3 (KRITIKUS, szerkezeti) — A szekció-rendszer (blokkok) LÉTEZIK, de a belső oldalak nem renderelik

A `Pages` gyűjteményben minden oldalnak van `layout` (Szekciók) blokk-mezője
16 blokktípussal (`src/blocks/index.ts`: hero, hitel-csík, kurzus-kártyák,
szolgáltatások, USP-k, állapotok, vélemények, GYIK, CTA-sáv…), és az admin
súgója azt ígéri, hogy ez „az oldal »építőkockás« része"
(`src/collections/Pages.ts:92–105`). **A `layout` mezőre viszont az egész
kódbázisban két hivatkozás van** (`src/components/content/HomeView.tsx:107` és
`src/lib/home-seed.ts:598`) — a `src/app/(frontend)/[slug]/page.tsx` **soha nem
rendereli**. Az a route csak a hero-t és a `page.content` Lexical-szövegét adja
ki, egyetlen 720 px-es hasábban.

**Ez a „minden egymás alatt van" gyökéroka**, és egyben néma tartalomvesztés: a
staff összerakhat egy többhasábos szekciósort a `/rolunk`-hoz, elmentheti, és
semmi nem jelenik meg belőle. A tulajdonosi kérés („nem feltétlenül mindent
egymás alá") tehát nem új komponenseket igényel — a komponensek megvannak és a
kezdőlapon bizonyítottan jól működnek —, hanem a meglévő renderelő
bekötését az aloldalakra.

### P4 (MAGAS, konverziós) — A vásárlás bejelentkezési falba fut, kontextus és indoklás nélkül

Kijelentkezve a `Megveszem` a `/penztar?termek=1`-re megy, ami **átirányít** a
`/belepes?returnUrl=…`-ra (`src/app/(frontend)/penztar/page.tsx:76–78`). Az így
kapott oldal (lekérve élőben) ennyit mond:

> **Belépés** — Lépj be a fiókodba a kurzusaid, a rendeléseid és a lejátszásaid
> eléréséhez. [e-mail] [jelszó] [Belépés] · Még nincs fiókod? Regisztrálj

Nincs benne a termék neve, az ára, összegzés, sem egy mondat arról, **miért**
kell fiók. A „Regisztrálj" sima szöveglink a lap alján, vizuálisan gyengébb, mint
a bejelentkezési űrlap — miközben az új vevő 100 %-a ezen az ágon jön.

A Baymard 4 384 fős, 2022-es felmérése szerint **az amerikai online vásárlók
24 %-a hagyott ott kosarat kizárólag a kötelező regisztráció miatt**, és a
guest-checkoutot kínáló oldalak **47 %-a nem teszi a legfeltűnőbb opcióvá**;
a tesztelésben a résztvevők a szöveglinkként megjelenő vendég-utat rendszeresen
átnézték, és inkább elhagyták a kosarat, mint hogy fiókot hozzanak létre
([Make „Guest Checkout" Prominent](https://baymard.com/blog/make-guest-checkout-prominent)).
A kosárelhagyási okok rangsorában a kötelező fiók 18 %-kal a negyedik
([Cart Abandonment Rate Statistics](https://baymard.com/lists/cart-abandonment-rate)).
Az NN/g hitelesség-kutatása pedig a bizalmat ROMBOLÓ elemek közé sorolja a
„login wall, amely az érték átadása előtt kér adatot"
([Trustworthiness in Web Design](https://www.nngroup.com/articles/trustworthy-design/)).

**Fontos árnyalás, hogy ne rossz javítás szülessen:** nálunk a termék egy
tartós hozzáférésű videókurzus, tehát a fiók FUNKCIONÁLISAN szükséges — ez nem
ugyanaz az eset, mint egy fizikai áru vendégvásárlása. A kutatásból ezért nem az
következik, hogy „legyen guest checkout", hanem hogy **a fal ne legyen néma**:
maradjon látható a termék és az ár, legyen ott egy mondatos indoklás, és a
regisztráció legyen az elsődleges, gombként megjelenített út.

### P5 (MAGAS, bizalmi) — A /rolunk a legerősebb bizalmi eszközünket olvashatatlan formában adja

A `/rolunk` **2 038 szó, 108 listaelem, 28 címsor, 1 kép** — mindez egyetlen
720 px-es hasábban, 92 karakteres sorokkal. A lap második fele két teljes
szakmai önéletrajz (Tanulmányok / Tanfolyamok / Publikációk / Konferenciák /
Média × 2 fő).

A hitelesítő adatok MENNYISÉGE maga a bizalmi jelzés — de nyers folyószövegként
kiöntve az NN/g „About Us" kutatása pontosan azt a mintát írja le, ami rontja az
elégedettséget: „walls of text without white space", nehezen megtalálható
kulcsinformáció
([„About Us" Information on Corporate Websites](https://www.nngroup.com/articles/about-us-information-on-websites/),
70+ felhasználó, 100+ oldal, 3 kutatási kör). Ugyanez a kutatás állítja fel a
javasolt 4 szintű hierarchiát is (tagline → 1–2 bekezdéses, szkennelhető
összefoglaló → alszekciók → lábléc), ami nálunk ma teljesen hiányzik.

---

## 2. Kutatási megállapítások — forrásokkal, és hogy MIT jelentenek nálunk

### 2.1 Sorhossz és olvashatóság

**K1 — A design-konszenzus 50–75 karakter, és ezt a WCAG felülről 80-nál zárja.**
A Baymard olvashatósági anyaga az „50–75 karakter" ajánlást adja, Emil Ruder
50–60-as tipográfiai hagyományára és a WCAG 1.4.8-ra hivatkozva; CSS-ben
`max-width: 70ch` / `34em` nagyságrendet javasol
([Readability: The Optimal Line Length](https://baymard.com/blog/line-length-readability)).
A GOV.UK Design System a „two-thirds" hasábot épp azzal indokolja, hogy „ez
általában legfeljebb 75 karaktert jelent soronként"
([Layout](https://design-system.service.gov.uk/styles/layout/)).
A WCAG 2.2 1.4.8 Visual Presentation (**AAA**) normatív szövege: „Width is no
more than 80 characters or glyphs (40 if CJK)"
([Understanding 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)).

**ŐSZINTE ÁRNYALÁS — a sorhossz-kutatás NEM egységes.** A tudományos bizonyíték
gyengébb, mint ahogy a szakmai közbeszéd sugallja:

- Dyson & Haselgrove (2001) azt találta, hogy **55 karakter/sor mellett jobb a
  megértés, mint 100 karakternél**, és nem volt sebesség–pontosság átváltás
  (*The influence of reading speed and line length on the effectiveness of
  reading from screen*, Int. J. Human-Computer Studies 54,
  [DOI/ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1071581901904586)).
- Shaikh & Chaparro (2005) viszont 20 fővel 35/55/75/95 cpl-t hasonlított össze,
  és a **95 cpl bizonyult a leggyorsabbnak**, miközben megértésben és
  elégedettségben NEM volt különbség
  (*The Effects of Line Length on Reading Performance of Online News Articles*,
  Proc. HFES 49,
  [SAGE](https://journals.sagepub.com/doi/abs/10.1177/154193120504900514)).
- Mary Dyson kutatási áttekintése kimondja, hogy a hagyományos
  sorhossz-korlátozás bizonyítéka **meglepően gyenge**, és Tinker & Paterson
  alapkutatásának belső validitása kifogásolható; több képernyős vizsgálat
  (Duchnicky & Kolers 1983, Dyson & Kipping 1998, Bernard et al. 2002–2003)
  hosszabb sorok mellett vagy gyorsabb olvasást, vagy semmilyen különbséget nem
  talált ([Line length revisited: following the research](https://designregression.com/article/line-length-revisited-following-the-research)).
- Ellenben Schneps et al. (2013) szerint a **küzdő/diszlexiás olvasóknak a
  rövidebb sor bizonyítottan segít** (ugyanott hivatkozva).

**Mit jelent ez NÁLUNK.** A becsületes megfogalmazás: a sorhossz-korlát elsődleges
indoka nem a sebesség, hanem **(a) a megértés** (Dyson & Haselgrove), **(b) az
akadálymentesség** (WCAG 1.4.8 AAA plafon; küzdő olvasók), és **(c) a saját
skillünk már meghozott döntése**. Ezért nem kell új szabály — a meglévőt kell
BETARTANI és HELYESEN MÉRNI. A 148 karakteres kurzusoldali sor még a
legmegengedőbb olvasatban (95 cpl) is 56 %-kal túllóg, tehát semmilyen forrás
nem védi meg.

**K2 — A magyar szöveg ugyanabban a pixelszélességben KEVESEBB szót jelent, de
ugyanannyi karaktert.** Saját mérésünk: átlagos magyar szóhossz a
Kineticare-tartalmon **6,60 betű**, a szavak 47 %-a legalább 7 betűs, 22 %-a
legalább 10 betűs (a leghosszabbak: *sportrehabilitációban*,
*fájdalomcsillapítókig*, *lágyrészmobilizáció*). A karakteralapú szabály (45–75
karakter) ezért nyelvfüggetlenül érvényes marad — a magyar sajátosság inkább
két másik helyen üt be:

- **Tördelés.** A 15–21 betűs agglutinált szavak keskeny hasábban (kártya,
  harmadoló rács, mobil) csúnya lyukakat vagy túlcsordulást okoznak. Ezért kell
  a keskeny hasábokban a `hyphens: auto` + `lang="hu"` és az
  `overflow-wrap: anywhere` — a szabályok között (B3.4) kiírva.
- **Ékezetek.** Az `Ő/Ű` felső jelei magas sorban „koccannak"; a skill 1,55–1,7-es
  törzs-sortávja (`--kc-leading-body: 1.67`) ezt már kezeli, ezt nem szabad
  visszavenni. Hozzátéve: a WCAG 1.4.8 amúgy is legalább 1,5-es sortávot ír elő
  (AAA), tehát a jelenlegi érték megfelelő.

> **NINCS ERŐS BIZONYÍTÉK** arra, hogy a magyar nyelvhez a nemzetközitől ELTÉRŐ
> optimális karakter/sor sáv tartozna. Magyar nyelvű, kontrollált
> sorhossz-olvashatósági kísérletet nem találtam. A fenti szóhossz-adat a saját
> korpuszunk mérése, nem publikált nyelvészeti forrás.

### 2.2 Szkennelhetőség: F-mintázat, réteges olvasás, alcímek

**K3 — A réteges („layer-cake") olvasás a hatékony minta; az F-mintázat a
formázatlan szöveg alapértelmezett kudarca.** Az NN/g szemmozgás-kutatása négy
olvasási mintát azonosít; a réteges olvasás (a szem a címsorokon és alcímeken
ugrál, és csak a megtalált fejezet alatt kezd olvasni) „by far the most effective
way to scan pages" — feltéve, hogy az alcímek beszédesek és vizuálisan
elkülönülnek
([The Layer-Cake Pattern of Scanning Content](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)).
Az F-mintázat ezzel szemben akkor lép fel, ha nincs vizuális hierarchia, és
következménye, hogy a felhasználó **pusztán a hasáb-folyás miatt** hagy ki
fontos tartalmat
([F-Shaped Pattern… Misunderstood, But Still Relevant](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)).
Az NN/g nyolc konkrét ellenszert nevez meg: fontos infó az első bekezdésbe,
kiemelt cím- és alcímek, információsűrű kezdőszavak, vizuális csoportosítás,
kulcskifejezések félkövérrel, beszédes linkszöveg, felsorolások, és a felesleges
tartalom kivágása.

**Mit jelent NÁLUNK.** Jó hír: a `/kurzusok/1` és a `/rolunk` címsor-szerkezete
már most rétegezhető (16 ill. 28 címsor, értelmes szöveggel). Rossz hír: a
címsorok egy 148, ill. 92 karakteres hasáb tetején ülnek, tehát az „ugrálás"
maga is drága — és a `.kc-richtext h2` (`--kc-text-2xl`) alig különül el a
környezetétől, mert a szekcióhatárokat csak margó jelöli, csoportosítás
(közös régió, keret, tint-sáv) nincs. Az NN/g „common region" ajánlása — kártya,
keret, üres terület a kapcsolódó tartalom köré — pontosan ez a hiányzó lépés.

**K4 — Az attention-eloszlás vertikálisan és horizontálisan is torzít.** A nézési
idő 57 %-a a hajtás felett, 74 %-a az első két képernyőn, 81 %-a az első három
képernyőn; ötödökre bontva a felső 20 %-ra esik a nézési idő 42 %-a, a felső
40 %-ra 65 %-a ([Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)).
Vízszintesen a figyelem balra dől
([Horizontal Attention Leans Left](https://www.nngroup.com/articles/horizontal-attention-leans-left/)).

**Mit jelent NÁLUNK.** Bármi, ami a döntéshez kell (ár, garancia, „kinek jó",
CTA), a felső 40 %-ba tartozik, vagy ismételve kell megjelennie. A garancia ma a
821 szavas oldal legalján van — a nézési idő maradék ~19 %-ának a zónájában.

### 2.3 Mikor jobb a többhasábos/rácsos elrendezés, és mikor rosszabb

**K5 — A rács előnye a KISZÁMÍTHATÓSÁG, nem a hasábok száma.** Az NN/g
rács-ajánlása szerint a rács „consistent reference point"-ot ad, ami javítja az
olvashatóságot és a szkennelhetőséget
([Using Grids in Interface Designs](https://www.nngroup.com/articles/using-grids-in-interface-designs/)).
Ezt a szemmozgás-adat is alátámasztja: két hasábos kép+szöveg elrendezésben a
**függőlegesen egy vonalba rendezett képek hatékonyabb szkennelést tesznek
lehetővé, mint a cikcakkban váltakozók** — a cikcakk „residual fixation"-öket
okoz, a felhasználók véletlenül „belebotlanak" a képekbe és vissza kell
irányítaniuk a tekintetüket. Fontos árnyalás ugyanabból a kutatásból: ha a kép
INFORMÁCIÓT hordoz, az elrendezés már nem számít — az információérték
fontosabb, mint az igazítás; a cikcakkot legfeljebb 2–3 sornyi tartalomra
érdemes fenntartani (~30–35 fő/variáns, 4 oldal,
[Zigzag Image–Text Layouts Make Scanning Less Efficient](https://www.nngroup.com/articles/zigzag-page-layout/)).

**K6 — Amikor a többhasábos ROSSZABB.** Két olyan eset van, ahol a hasábolás
mérhetően árt:

1. **Folyó olvasásnál.** Ha a felhasználónak végig kell olvasnia a szöveget,
   a hasáb-váltás a return sweep-et (sorvégi visszaugrást) rontja — ez a
   mechanizmus az egész sorhossz-kutatás alapja (Dyson-áttekintés, fent).
   Vagyis: **a hasábolás nem lehet válasz a hosszú folyószövegre.** Ott a
   mérték (max-width) és a rétegezés (alcímek) a válasz.
2. **Ha a rács olvasási sorrendje nem egyértelmű.** A GOV.UK ezért ír elő
   „two-thirds" fő hasábot: a fő tartalom EGY hasábban marad, a másodlagos
   megy a harmadolóba
   ([Layout](https://design-system.service.gov.uk/styles/layout/)).

**Mit jelent NÁLUNK — ez a tulajdonosi kérés kulcsa.** A „ne legyen minden
egymás alatt" NEM azt jelenti, hogy a folyószöveget hasábokra vágjuk. Azt
jelenti, hogy a **PÁRHUZAMOS, összehasonlítható elemeket** kell egymás mellé
tenni (három szolgáltatási ág, tanterv-modulok, bónuszok, árlista, „kinek jó /
kinek nem" párok), a **folyószöveget pedig szűk mértékre kell fogni**. A két
dolog nem ellentmond egymásnak: a lap SZÉLES lesz, a SOR marad rövid.

### 2.4 Kártyák: mikor segítenek, mikor okoznak kártya-vakságot

**K7 — A kártya HETEROGÉN tartalomra való, a lista HOMOGÉNRE.** Az NN/g
definíciós anyaga szerint a kártya „különböző tartalomtípusok összefoglalóira"
való; ott működik legjobban, ahol a tételek típusban is eltérnek (dashboard,
aggregátor, közösségi folyam). **Rosszabbul teljesít**, ha a felhasználó keres
(a kártya elnyomja a rangsort), ha ÖSSZEHASONLÍT (a szemmozgás-vizsgálatban a
résztvevők nehezen találták meg ugyanazt az információt kártyáról kártyára,
oda-vissza kellett járatniuk a tekintetüket), ha gyors szkennelés kell, és ha
kevés a hely. Homogén tételeknél a lista bizonyult jobbnak: a kiszámítható
elhelyezés miatt gyorsabb az ár és a részletek átfutása
([Cards: UI-Component Definition](https://www.nngroup.com/articles/cards-component/)).

**K8 — „Kártya-vakság" = hirdetés-vakság.** Az NN/g szemmozgás-kutatása szerint
az emberek kitakarják azt, ami hirdetésre HASONLÍT, és ez már nem csak a
bannerekre igaz: bármi, ami „irreleváns tartalmat" jelez, kiesik a látóterből —
sőt a felhasználók nagy képeket, kiugró grafikákat is hirdetésnek nézhetnek és
átgörgethetnek felettük
([Banner Blindness Revisited](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/)).

**K9 — Az „álpadló" (false floor) megállítja a görgetést.** Az NN/g külön
kutatása szerint a felhasználók akkor hiszik azt, hogy vége az oldalnak, ha
teljes szélességű, erős határvonalú vagy kontrasztos hátterű blokk zár, ha nagy
az üres terület, vagy ha a hero kitölti a képernyőt. Egy usability-vizsgálatban
**nyolc felhasználóból hat nem vette észre, hogy a lap görgethető**; a
résztvevők 75 %-a frusztrálódott, amikor a szolgáltatás lényegét nem találta meg
([The Illusion of Completeness](https://www.nngroup.com/articles/illusion-of-completeness/)).
Az ellenszer: a következő tartalom „kandikáljon be" a hajtás fölé, ne legyen
erős vizuális törés a szekciók között, és legyen kifelé mutató jel.

**Mit jelent NÁLUNK.** A `/kurzusok` ma HOMOGÉN tételeket (2 kurzus) tesz
kártyákba, 1024 px felett `repeat(3, 1fr)` rácsba — vagyis két kártya után egy
üres harmadik oszlop marad, és pont az NN/g által leírt összehasonlítási
nehézséget kapjuk (ár, hossz, célközönség kártyáról kártyára). Ez az az eset,
ahol a kutatás szerint a LISTA/összehasonlító nézet a jobb — vagy legalábbis a
kártyáknak azonos pozíciókban kell hozniuk ugyanazokat a mezőket. A `kc-board`
teljes szélességű, `100dvh` magas tábla-szekciók viszont pontosan az álpadló-
receptet követik: a kezdőlapon ez tudatos és bevált, de **belső oldalra
átemelni kockázatos** — ott a lap nem „élmény", hanem feladat.

### 2.5 Rejtett tartalom: harmonika, fülek, lépcsős feltárás

**K10 — A harmonika ÁRA a rejtés, és ezt minden forrás egyértelműen kimondja.**
Az NN/g asztali harmonika-ajánlása szerint akkor való, ha a felhasználónak csak
néhány információdarab kell, ha a szekciók önállóak, ha lépésenkénti a folyamat,
vagy ha szűkös a hely. **Kerülendő**, ha a felhasználónak a tartalom nagy része
kell, ha kevés a tartalom (üresnek látszik a lap), ha mély a hierarchia, vagy ha
folyamatos olvasás a cél. Nevesített hátrányok: megnőtt interakciós költség,
romló felfedezhetőség, akadálymentességi többletmunka, nyomtatási gond, és hogy
**a rejtett tartalmat a böngésző Ctrl+F keresője nem találja meg**
([Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/)).
A komplex tartalomról szóló társcikk hozzáteszi: az olvasók „valutaként" kezelik
a kattintást — nem baj, ha megéri, de a fölöslegeset megsínylik
([Accordions for Complex Website Content on Desktops](https://www.nngroup.com/articles/accordions-complex-content/)).

A GOV.UK szó szerint: „Accordions hide content from the user. Not all users will
notice them or understand how they work. For this reason, you should only use
them in specific situations **and if user research supports it**." És: „Do not
use an accordion for content that all users need to see." A javasolt alternatívák
sorrendje: egyszerűsítsd és csökkentsd a tartalmat → oszd szét több oldalra →
tartsd egy oldalon, címsorokkal tagolva → tegyél az elejére horgony-linkeket
([Accordion](https://design-system.service.gov.uk/components/accordion/)).

A Baymard a FÜL- és inline-harmonika-alapú ŰRLAPOKRA ad külön figyelmeztetést: a
tesztelt felhasználók nem tudták eldönteni, mely mezők kerülnek beküldésre, és
elvész-e a beírt adat váltáskor („Do I need to save changes before opening
another tab?"). A szekvenciális, összegzést mutató harmonika-checkout viszont
működik, mert ott egyértelmű a haladás
([Accordion UX: The Pitfalls of Inline Accordion and Tab Designs](https://baymard.com/blog/accordion-and-tab-design)).

**K11 — A lapon belüli horgony-linkek (tartalomjegyzék) bizonyítottan
használtak.** Az NN/g 11 fős vizsgálatában a résztvevők **9/11 aránya ismerte és
használta** a lapon belüli linkeket; jellemzően szabad böngészéskor átugrották
őket, de KONKRÉT információigény esetén azonnal odanyúltak. Két hasznot
neveztek meg: az irreleváns rész átugrását és azt, hogy a lista „kiadja a cikk
vázlatát". Kerülendő rövid oldalon és folyamatos narratívánál
([In-Page Links for Content Navigation](https://www.nngroup.com/articles/in-page-links-content-navigation/)).

**Mit jelent NÁLUNK — ez dönti el a két konkrét esetünket.**

- **GYIK:** a felhasználónak NEM kell mind a válasz, csak a sajátja; a tételek
  önállóak → **harmonika való**. Nálunk a `FaqBlock` már natív
  `<details>/<summary>`-vel készült (`src/components/blocks/FaqBlock.tsx`), ami
  JS nélkül is működik és a képernyőolvasónak is jelzi az állapotot — ez
  megfelel az NN/g és a GOV.UK elvárásainak. Egyetlen hiányossága, hogy csak a
  kezdőlapon jelenik meg (lásd P3).
- **Tanterv-lista (a kurzus 4 modulja):** ez viszont pont az ellenkező eset. Aki
  79 500 Ft-os kurzust mérlegel, **a teljes tantervet akarja látni** — ez a
  GOV.UK „content that all users need to see" tilalma alá esik. Ide **nem
  harmonika kell, hanem rács + horgony-navigáció** (K11).
- **Szakmai önéletrajzok a /rolunk-on:** a látogatók többségének nem kell mind a
  108 sor, de a MENNYISÉG maga a bizonyíték. Ez az a helyzet, amit a GOV.UK úgy
  ír le, hogy a felhasználó „choose to show and hide sections relevant to them"
  → **itt indokolt a harmonika**, egy látható összegző számmal a fejlécében
  (pl. „Publikációk (7)"), hogy a rejtés ne tüntesse el a bizonyítékot.

### 2.6 Hosszú értékesítő oldal vs. tömör oldal

> **NINCS ERŐS BIZONYÍTÉK.** Kifejezetten kerestem kontrollált, publikált
> bizonyítékot a „hosszú vs. rövid értékesítő oldal" kérdésre, és nem találtam
> elfogadható forrást. Amit a keresés hoz, az szinte kizárólag eszközgyártói
> blog és egyedi ügyfél-esettanulmány (pl. a sokat idézett „37signals rövidebb
> oldala +102,5 %" állítás), egymásnak ellentmondó irányokkal, közölt
> módszertan, mintaméret és szignifikancia nélkül. Ezeket a kiírás
> szabályai szerint NEM használom fel, és a vezetőnek sem javaslom.

**Amit viszont bizonyítottan tudunk, és ami helyettesíti ezt a kérdést:**

1. **A hossz nem a kérdés, a RELEVANCIA és a FORMÁZÁS az.** Az NN/g
   harmonika-anyaga expliciten így fogalmaz: a felhasználók akkor görgetnek, ha
   a tartalom releváns és jól formázott — a hosszú oldal nem eleve rossz
   ([Accordions for Complex Website Content](https://www.nngroup.com/articles/accordions-complex-content/)).
2. **A figyelem viszont mérhetően fogy** (57/74/81 % — K4). Tehát a hosszú
   oldal ára az, hogy a lentebbi tartalomból egyre kevesebb ér célba.
3. **A hiányzó információ konkrétan pénzbe kerül.** A Baymard kosárelhagyási
   rangsorában a „nem látta előre a teljes költséget" 12 %, a „nem megfelelő
   visszatérítési feltételek" 13 %
   ([Cart Abandonment Rate Statistics](https://baymard.com/lists/cart-abandonment-rate)).

**Ebből a mi levezetésünk (és így írom meg szabálynak is):** ne a hosszt
szabályozzuk, hanem azt, hogy **a döntéshez szükséges információk a felső 40 %-ban
ELÉRHETŐK legyenek** — akár összefoglalóként, akár horgony-linkkel —, és hogy a
CTA a hosszal ARÁNYOSAN ismétlődjön. Így a hosszú oldal megmarad (SEO és
meggyőzés miatt hasznos), de nem kerül a döntés a lap aljára.

### 2.7 Bizalmi elemek elhelyezése és hatása

**K12 — Négy hitelességi tényező, 1999 óta stabilan.** Az NN/g négy tényezője:
(1) design-minőség, (2) előzetes, nyílt tájékoztatás (ár, díjak, feltételek,
elérhetőség), (3) teljes, pontos, naprakész tartalom, (4) kapcsolódás a web
többi részéhez (külső vélemények, közösségi jelenlét). A bizalmat ROMBOLÓ elemek
között nevesítve: elgépelés és törött link, rejtett díj és homályos ár,
**login wall az érték átadása előtt**, általános vagy hiányzó képek, hiányzó
jelenlét a vélemény-oldalakon. A kutatás kiemeli: a **külső véleményt jobban
hiszik, mint az oldalon közölt testimonialt**
([Trustworthiness in Web Design: 4 Credibility Factors](https://www.nngroup.com/articles/trustworthy-design/)).
Ugyanezt erősíti az „About Us" kutatás: a 20 interjúban a „reviews" szó több mint
40-szer hangzott el, és a felhasználók rendszeresen kimentek Google/Yelp/
Glassdoor-ra ellenőrizni
([About Us Information](https://www.nngroup.com/articles/about-us-information-on-websites/)).

**K13 — A visszatérítési/garancia-információt a TERMÉKOLDALON keresik.** A
Baymard termékoldal-benchmarkja (155+ oldal, 30 000+ kézzel adott
teljesítménypont) szerint a desktop oldalak **52 %-a, a mobiloldalak 62 %-a
„mediocre vagy rosszabb"** termékoldal-UX-et nyújt, és a **44 % nem jeleníti meg
és nem is linkeli a visszaküldési feltételeket**, 67 % nem mutatja a teljes
rendelési költséget a vásárlógomb közelében
([Product Page UX Best Practices](https://baymard.com/blog/current-state-ecommerce-product-page-ux)).

**K14 — A social proofnál a MENNYISÉG visszaüthet.** Az NN/g social proof
anyaga szerint az alacsony adoptációs szám ronthat: egy tesztalany 1 000
Facebook-megosztást látva arra jutott, hogy „a cikk nem elég népszerű, talán nem
is jó"
([Social Proof in the User Experience](https://www.nngroup.com/articles/social-proof-ux/)).

> **NINCS ERŐS BIZONYÍTÉK** a vélemények OPTIMÁLIS DARABSZÁMÁRA és pontos
> ELHELYEZÉSÉRE. A meglévő skill M6 szabálya („max 2–3, rövid, a termék UTÁN")
> mögé nem találtam kutatást. A szabály nem MOND ELLENT semminek — a figyelem-
> eloszlásból (K4) logikusan következik, hogy a termék előbb legyen —, de
> „bizonyítottnak" nem nevezhető. Javaslom vélemény-alapú szabályként
> megtartani, és A/B-vel megmérni (6. fejezet).

### 2.8 Egészségügyi tartalom olvashatósága laikusoknak

**K15 — A betegtájékoztatók rendszeresen a célközönség szintje FÖLÖTT vannak.**
Egy 30 évet felölelő, szisztematikus áttekintéseket összegző munka és több
egyedi vizsgálat egybehangzóan azt találja, hogy a betegoktató anyagok átlagos
olvasási szintje 9–11. évfolyam körül van, miközben az ajánlás (Joint Commission,
AMA, NIH) 4–6. évfolyam, és a felnőttek átlagos szövegértése 7–8. évfolyam
környékén mozog; a vizsgált anyagok kb. 90 %-a a 8. évfolyam szintjén vagy
afölött íródott
([Readability and Comprehension of Printed Patient Education Materials, Frontiers in Public Health, 2021](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2021.725840/full);
[Readability of written information for patients across 30 years: A systematic review of systematic reviews, Patient Education and Counseling](https://www.sciencedirect.com/science/article/pii/S0738399125000230)).

**K16 — A közérthető („plain language") változat randomizált vizsgálatban javította
a megértést.** Sayfi S, Charide R, Elliott SA, Hartling L, Munan M, Stallwood L
és mtsai: *A multimethods randomized trial found that plain language versions
improved adults' understanding of health recommendations*, Journal of Clinical
Epidemiology, 165:111219 (PMID 38008266,
[DOI 10.1016/j.jclinepi.2023.11.009](https://doi.org/10.1016/j.jclinepi.2023.11.009)).
A vizsgálat közérthető nyelvű (PLR) és sztenderd nyelvű (SLV) egészségügyi
ajánlásokat hasonlított össze felnőtteknél, megértés, hozzáférhetőség,
elégedettség és szándék mentén — a következtetés szerint a közérthető változat
javította a megértést. Van egy testvér-vizsgálat szülőkre is (J Clin Epidemiol,
S0895-4356(23)00165-8).

> **ŐSZINTE KORLÁT:** a szakirodalmi ÖSSZEFOGLALÓKBAN keringő pontos hatásméret
> (kb. 19,8 százalékpontos különbség a helyes válaszok arányában) elsődleges
> forrásból NEM volt ellenőrizhető — a kiadói oldalak (ScienceDirect, jclinepi)
> 403-mal zárnak. Ezért a hatás IRÁNYÁT állítom bizonyítottnak (a közérthető
> változat jobb megértést ad), a konkrét számot NEM. Ha a vezető a számra is
> hivatkozni akar, az absztraktot intézményi hozzáféréssel kell ellenőrizni.

**Mit jelent NÁLUNK.** A tartalmunk jelentős része laikusnak szóló
kézrehabilitáció, tele szakszóval (*lágyrészmobilizáció*, *manuálterápia*,
*fasciakés*, *flossing*, *NRX® bandázs*, *eszközös lágyrész-mobilizáció*). A
`/szolgaltatasok` „Amiben segíteni tudunk" listája ilyen kifejezéseket sorol fel
magyarázat nélkül. Ez elrendezési szabállyá fordítható: **a szakkifejezés mellé
egy laikus félmondat kell ugyanabban a sorban** (nem lábjegyzetben, nem külön
szótárban) — a magyarázat elrejtése ugyanaz a hiba, mint a tartalom
harmonikába zárása (K10).

### 2.9 Akadálymentesség — a fentiekre vonatkozó WCAG 2.2 AA kritériumok

| SC | Szint | Követelmény (normatív) | Nálunk |
|---|---|---|---|
| **1.4.10 Reflow** | **AA** | „Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions for: Vertical scrolling content at a width equivalent to **320 CSS pixels**" — ez 1280 px-es nézetablak 400 %-os nagyításának felel meg ([Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)) | Nem mértem (nincs böngésző). A CSS mobil-first, a rácsok 640/900/1024 px-en törnek — kockázat nem látszik, de **ellenőrizendő**, különösen a hosszú magyar összetett szavaknál és a `/penztar` kétoszlopos űrlaprácsánál |
| **2.4.11 Focus Not Obscured (Minimum)** | **AA (új a 2.2-ben)** | „When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content." A megfelelési technikák között nevesítve a **scroll padding** használata, hogy a ragadós sáv ne takarja a fókuszált elemet ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)) | **Kezelve.** A `styles/base.css:17` `scroll-padding-top: calc(var(--kc-header-height) + var(--kc-space-2))` — épp az előírt technika. Új ragadós elem (pl. mobil vásárlósáv) bevezetésekor ezt újra kell méretezni |
| **2.5.8 Target Size (Minimum)** | **AA (új a 2.2-ben)** | „The size of the target for pointer inputs is at least **24 by 24 CSS pixels**", kivételek: térköz, soron belüli link, felhasználói ügynök, lényegi ([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)) | **Túlteljesítve.** A repó mindenütt 2,75rem = 44 px minimumot használ (gomb, navlink, chip, lábléc-link). Ez a 2.5.5 (AAA) szintje |
| **1.4.8 Visual Presentation** | AAA | Sorhossz ≤ 80 karakter; sortáv ≥ 1,5; a szöveg ne legyen sorkizárt ([Understanding 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)) | Sortáv OK (1,67). **Sorhossz megbukik** a `/kurzusok/[slug]`-on (148) és a szűk konténeres oldalakon (92) |

---

## 3. Szabály-javaslatok a BELSŐ oldalakra

> **Beemelési útmutató a vezetőnek:** ez a fejezet önállóan, változtatás nélkül
> beilleszthető a `docs/ertekesitesi-ux-skill.md`-be új, „7. Belső oldalak —
> elrendezési szabályok" fejezetként. A számozás `B` előtagot használ, hogy ne
> ütközzön a skill meglévő M1–M8 és 1–6. pontjaival. **A meglévő skill szabályai
> elsőbbséget élveznek**; ahol eltérés adódik, azt a 3.9 pont külön kiírja.

### B1 — Mérték (sorhossz)

**B1.1** — Folyószöveg (bekezdés, felsorolás, definíció) sorhossza soha nem
haladhatja meg a **75 tényleges karaktert**. Ehhez a repó betűjével a szöveg
mérete legfeljebb **34rem (≈ 545 px)**; a kényelmes cél **30rem (≈ 480 px ≈ 66
karakter)**.
*Forrás:* skill 4. pont; [Baymard — line length](https://baymard.com/blog/line-length-readability);
[GOV.UK Layout](https://design-system.service.gov.uk/styles/layout/);
megértési bizonyíték: Dyson & Haselgrove 2001.
*Ellenőrzés:* a mértéket vivő elem számított szélessége ≤ 545 px 1440 px-es
nézetablakon (DevTools).

**B1.2** — **A `ch` egység önmagában nem elfogadható bizonyíték a sorhosszra.**
A repó betűjén és magyar szövegen **1 `ch` ≈ 1,32 karakter**, tehát a `ch`-ban írt
érték ~32 %-kal hosszabb sort ad, mint amit a szám sugall. Az átváltó tábla a 0.
fejezetben van; a 75 karakteres plafon **57ch**, a WCAG 1.4.8 80-as plafonja
**≈ 60ch**.
*Forrás:* saját mérés (fontTools, `hmtx`, wght 400, n = 5 981 karakter) — a
módszer a 0. fejezetben, újrafuttatható.
*Ellenőrzés:* a meglévő `68ch`/`72ch` értékek (`blocks/faq.css:83`,
`blocks/states.css:47`, `blocks/usps.css:118`, `blocks/welcome.css:157`,
`layout.css:711`) mind 90–95 karaktert adnak — ezeket felül kell vizsgálni.

**B1.3** — A mérték **közös tokenből** jön (javaslat: `--kc-measure: 34rem` és
`--kc-measure-comfort: 30rem`), elemre írt egyedi érték tilos — ugyanaz a
logika, mint a skill 4. pontjának fontméret-szabálya.

**B1.4** — A sorhossz-korlát a **szövegre** vonatkozik, nem a lapra. A szekció
lehet teljes szélességű; a benne futó bekezdés nem.
*Forrás:* GOV.UK „two-thirds" logika; NN/g rács-ajánlás.

### B2 — Rétegezés és szkennelhetőség

**B2.1** — 400 szónál hosszabb oldalon **kötelező a réteges olvashatóság**:
legfeljebb 150 szavanként beszédes alcím, az alcím vizuálisan egyértelműen
elkülönül a törzstől (méret, súly vagy elválasztó), és a fejezet első
mondata információsűrű.
*Forrás:* [Layer-Cake Pattern](https://www.nngroup.com/articles/layer-cake-pattern-scanning/);
[F-Shaped Pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/).
*Ellenőrzés:* szó/címsor arány a renderelt DOM-ban.

**B2.2** — A kapcsolódó tartalmat **közös régió** jelöli (keret, tint-sáv,
kártya vagy határozott üres terület), nem csak margó.
*Forrás:* NN/g F-mintázat ellenszerei („visually cluster related material");
[The Principle of Common Region](https://www.nngroup.com/articles/common-region/).

**B2.3** — 800 szó fölött vagy 5-nél több fő szekciónál a lap tetejére
**horgony-navigáció** (tartalomjegyzék) kerül, „Ezen az oldalon" jellegű,
egyértelmű felirattal, a többi linktől vizuálisan elkülönítve.
*Forrás:* [In-Page Links for Content Navigation](https://www.nngroup.com/articles/in-page-links-content-navigation/)
(9/11 résztvevő ismerte és használta); GOV.UK a harmonika helyett is ezt
javasolja.
*Ellenőrzés:* a horgonyok a `scroll-padding-top` miatt nem csúsznak a ragadós
sáv alá (`base.css:17` — már megvan).

**B2.4** — **Álpadló tilalma belső oldalon.** Belső oldalon nem használható
teljes képernyős (`100dvh`), teljes szélességű, erős kontraszthatárral záruló
tábla-szekció úgy, hogy alatta még lényegi tartalom van; a következő szekciónak
be kell kandikálnia a hajtás fölé.
*Forrás:* [The Illusion of Completeness](https://www.nngroup.com/articles/illusion-of-completeness/)
(8-ból 6 felhasználó nem vette észre, hogy görgethető a lap).
*Megjegyzés:* a kezdőlapi `kc-board` viselkedést ez **nem** érinti — az marad.

### B3 — Rács és hasábok („ne legyen minden egymás alatt")

**B3.1** — **Többhasábos elrendezés csak PÁRHUZAMOS tartalomra.** Rácsba
(2–3 hasáb) az kerülhet, ami logikailag egyenrangú és összehasonlítható:
szolgáltatási ágak, kurzus-modulok, bónuszok, csomagok, lépések, árlista-sorok,
„kinek jó / kinek nem" párok. **Folyó, összefüggő szöveget hasábolni tilos.**
*Forrás:* [Using Grids in Interface Designs](https://www.nngroup.com/articles/using-grids-in-interface-designs/);
a folyószöveg-tilalom indoka a sorvégi visszaugrás (return sweep) — Dyson
kutatási áttekintése.

**B3.2** — A **fő tartalom egy hasábban marad**, a másodlagos (buybox, meta,
kapcsolódó) megy az oldalsó, keskenyebb hasábba — GOV.UK „two-thirds and
one-third" minta.
*Forrás:* [GOV.UK Layout](https://design-system.service.gov.uk/styles/layout/).

**B3.3** — **Nincs cikcakk.** Kép+szöveg sorokban a képek FÜGGŐLEGESEN egy
vonalba rendezve; váltakozó (cikcakk) elrendezés legfeljebb 2–3 sorig, és csak
akkor, ha a kép valódi információt hordoz (nem dísz).
*Forrás:* [Zigzag Image–Text Layouts Make Scanning Less Efficient](https://www.nngroup.com/articles/zigzag-page-layout/)
(~30–35 fő/variáns, 4 oldal, szemmozgás).

**B3.4** — **Magyar tördelés keskeny hasábban.** Minden 2-nél több hasábos
rácsban és minden kártyában kötelező a `lang="hu"` + `hyphens: auto` és
`overflow-wrap: anywhere`, mert a szavaink 22 %-a legalább 10 betűs.
*Forrás:* saját korpuszmérés (n = 4 377 szó, átlag 6,60 betű, 10+ betű: 22,3 %).
*Ellenőrzés:* 320 CSS px-en egyetlen szó sem csordul túl (lásd B7.1).

**B3.5** — A rács **ne hagyjon lyukat**: 3 oszlopos rácsba nem tehető 2 elem
fix `repeat(3, 1fr)`-rel. Használj `repeat(auto-fit, minmax(...))`-ot, vagy
igazítsd az oszlopszámot az elemszámhoz.
*Forrás:* NN/g rács-ajánlás (kiszámítható referenciapont);
[Cards](https://www.nngroup.com/articles/cards-component/) (a szabálytalan rács
nehezíti az összehasonlítást).

### B4 — Kártya vagy lista

**B4.1** — **Homogén tételeknél (kurzusok, árak, modulok) a kártya csak akkor
maradhat, ha minden kártya UGYANAZOKAT a mezőket UGYANABBAN a sorrendben,
UGYANAZON a magasságon hozza** (név, célközönség, hossz, ár, CTA). Ha ez nem
tartható, listás/táblázatos összehasonlító nézet való oda.
*Forrás:* [Cards: UI-Component Definition](https://www.nngroup.com/articles/cards-component/)
— a szemmozgás-vizsgálatban a kártyák nehezítették az összehasonlítást, a lista
gyorsabb ár- és részlet-átfutást adott.

**B4.2** — **Kártya-vakság elkerülése.** Nem lehet olyan kártya vagy sáv, ami
hirdetésre hasonlít (nagy, kontextus nélküli kép; a lap nyelvétől idegen színes
doboz; „reklám-arányú" bannersáv). A kártyának a saját oldal vizuális nyelvén
kell megszólalnia.
*Forrás:* [Banner Blindness Revisited](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/).

**B4.3** — Kettőnél kevesebb elemhez **nem jár szűrő**. Szűrő/kategória-chip
akkor kerül ki, ha legalább 5 tétel van, vagy legalább 3 valódi kategória.
*Indoklás:* interakciós költség kutatásból ([Accordions for Complex Content](https://www.nngroup.com/articles/accordions-complex-content/)),
de a konkrét 5/3-as küszöb **saját, gyakorlati javaslat — NINCS ERŐS
BIZONYÍTÉK a pontos számra.**

### B5 — Rejtett tartalom (harmonika, fül, lépcsős feltárás)

**B5.1** — **Harmonikába csak az kerülhet, amiből a felhasználónak jellemzően
CSAK EGY-KETTŐ kell**, és a szekciók önállóak. Tipikusan: GYIK, szakmai
önéletrajz-blokkok, jogi tájékoztatók, ritka esetek.
*Forrás:* [Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/);
[GOV.UK Accordion](https://design-system.service.gov.uk/components/accordion/).

**B5.2** — **Tilos harmonikába zárni azt, amit MINDENKINEK látnia kell.**
Nevesítve nálunk: ár, garancia/elállás, tanterv fő szerkezete, „kinek nem
javasoljuk", technikai előfeltételek.
*Forrás:* GOV.UK szó szerint: „Do not use an accordion for content that all
users need to see."

**B5.3** — Ha harmonika van: a fejléc önmagában is informatív (lehetőleg
darabszámmal, pl. „Publikációk (7)"), több szekció egyszerre nyitva tartható,
és van „Mindet kinyitom" vezérlő.
*Forrás:* [Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/)
— a rejtett tartalmat a Ctrl+F sem találja meg, ezért kell a kinyitó vezérlő.

**B5.4** — **Űrlapot fülbe vagy inline harmonikába tenni tilos**, kivéve a
szekvenciális, összegzést mutató checkout-harmonikát.
*Forrás:* [Baymard — Accordion and Tab Design](https://baymard.com/blog/accordion-and-tab-design)
(a tesztalanyok nem tudták, mely mezők kerülnek beküldésre).

**B5.5** — A harmonika **nem helyettesíti a rövidítést**. Előbb a GOV.UK
sorrendjét kell végigpróbálni: egyszerűsítés → külön oldal → egy oldal
címsorokkal → horgony-linkek → és csak utána harmonika.
*Forrás:* [GOV.UK Accordion](https://design-system.service.gov.uk/components/accordion/).

### B6 — Konverziós felület a belső oldalakon

**B6.1** — **Két képernyőnél hosszabb értékesítő oldalon a vásárlási CTA
ismétlődik**: a hajtás felett egyszer, és a döntést támogató fő érv (garancia,
tanterv, bónuszok) után legalább még egyszer. Mobilon a fizetős kurzusoldalon
ragadós vásárlósáv (ár + gomb) indokolt.
*Forrás:* [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)
— a nézési idő 57 %-a a hajtás felett, 81 %-a az első három képernyőn; a felső
20 %-ra esik a nézési idő 42 %-a.
*Ellenőrzés:* a renderelt DOM-ban a `kc-button--primary` vásárlási CTA-k száma
> 1 minden 400 szó fölötti kurzusoldalon.
*Kötelező korlát:* a skill 6. pontja szerint ez nem járhat dark patternnel
(nincs visszaszámláló, nincs kamu-készlet).

**B6.2** — **Az ár és a teljes fizetendő a vásárlógomb közelében látszik**, és
ugyanez az információ a döntési pontokon megismétlődik.
*Forrás:* [Baymard — Product Page UX](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
(a benchmarkolt oldalak 67 %-a nem mutatja a teljes költséget a gomb közelében);
[Cart Abandonment](https://baymard.com/lists/cart-abandonment-rate) (12 %:
„nem látta előre a teljes költséget").

**B6.3** — **A garancia / elállási feltétel a termékoldalon látható vagy
onnan egy kattintásra linkelt**, és nem csak a lap alján.
*Forrás:* Baymard termékoldal-benchmark (44 % nem jeleníti meg és nem is
linkeli); kosárelhagyás: 13 % a nem megfelelő visszatérítési feltételek miatt.

**B6.4** — **A fizetési út nem futhat néma falba.** Ha a vásárláshoz fiók kell,
a fiók-lépésen (a) látszik a termék neve és ára, (b) ott van egy mondat arról,
MIÉRT kell fiók, (c) az új vevő útja (regisztráció) az elsődleges, GOMBKÉNT
megjelenített opció, nem szöveglink.
*Forrás:* [Baymard — Make „Guest Checkout" Prominent](https://baymard.com/blog/make-guest-checkout-prominent)
(24 % hagyott ott kosarat kizárólag a kötelező regisztráció miatt, 4 384 fő,
2022; a guest-checkoutot kínáló oldalak 47 %-a nem teszi feltűnővé; a tesztben a
szöveglinket rendszeresen átnézték);
[Cart Abandonment](https://baymard.com/lists/cart-abandonment-rate) (18 %);
[Trustworthy Design](https://www.nngroup.com/articles/trustworthy-design/)
(a „login wall az érték átadása előtt" bizalomromboló).
*Fontos:* nálunk a fiók funkcionálisan szükséges (tartós hozzáférésű digitális
termék), ezért ez a szabály **nem** vendégvásárlást ír elő — csak azt, hogy a
lépés indokolt és kontextusban maradjon.

**B6.5** — **Egy oldalon egy elsődleges cél.** Belső oldalon legfeljebb EGY
`primary` CTA-típus versenyezhet; a többi (kapcsolat, külső link) másodlagos
vagy szöveglink-súlyt kap. Külső oldalra vivő link soha nem viheti a fizetős
kurzus CTA-jával azonos vizuális súlyt.
*Forrás:* a skill 1. és 2. pontja (üzleti cél-hierarchia, M1 „pontosan 1+1
CTA"); NN/g figyelem-eloszlás (a több egyenrangú cél szétosztja a figyelmet).

**B6.6** — **A bizalmi elem mutasson kifelé is.** Ahol vélemény van, ott
legyen ellenőrizhető is (külső vélemény-forrás, akkreditációs szám, egyesületi
tagság, kreditpont) — az oldalon közölt testimonialt önmagában kevésbé hiszik el.
*Forrás:* [Trustworthy Design — 4 Credibility Factors](https://www.nngroup.com/articles/trustworthy-design/);
[About Us Information](https://www.nngroup.com/articles/about-us-information-on-websites/)
(20 interjúban a „reviews" szó 40+ alkalommal).

### B7 — Akadálymentesség (a fentiek WCAG-vetülete)

**B7.1** — Minden új elrendezés **320 CSS px-en is működik** kétirányú görgetés
nélkül, információ- és funkcióvesztés nélkül.
*Forrás:* [WCAG 2.2 SC 1.4.10 Reflow (AA)](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
*Ellenőrzés:* 1280 px-es ablak 400 %-os nagyításon, vagy 320 px-es
nézetablak-emuláció; a vízszintes görgetősáv megjelenése bukás.

**B7.2** — Ragadós elem (fejléc, új mobil vásárlósáv) **nem takarhatja el
teljesen a fókuszált elemet**; a `scroll-padding` mérete minden ragadós sáv
összegére igazodik.
*Forrás:* [WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum), AA](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
*Ellenőrzés:* Tab-bal végigjárva a lapot egyetlen fókuszgyűrű sem tűnik el a
sáv alatt.

**B7.3** — Érintési célfelület **legalább 24×24 CSS px** (AA); a repó jelenlegi
44 px-es gyakorlata megtartandó, mert az a 2.5.5 (AAA) szintje.
*Forrás:* [WCAG 2.2 SC 2.5.8 (AA)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html);
a 44 px a meglévő skill 3. pontjából jön.

**B7.4** — A **DOM-sorrend = olvasási sorrend.** Rácsban a vizuális átrendezés
(`order`, `grid-area`) nem szakíthatja el a logikai sorrendtől; a fókusz-út
végigjárva értelmes marad.
*Forrás:* WCAG 2.4.3 Focus Order (A) — a rács-alapú átrendezés tipikus
bukópontja; NN/g rács-ajánlás (kiszámítható referenciapont).

**B7.5** — A rejtett tartalom **programozottan is rejtett** (natív
`<details>/<summary>` vagy helyes `aria-expanded` + `hidden`), a nyitott/zárt
állapot a képernyőolvasónak is szól.
*Forrás:* [Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/)
(akadálymentességi többletmunka); a repóban ezt a `FaqBlock` már helyesen csinálja.

### B8 — Nyelv és érthetőség (egészségügyi tartalom laikusnak)

**B8.1** — Laikusnak szóló oldalon **minden szakkifejezés mellett ugyanabban a
mondatban ott a köznyelvi megfelelője** (nem lábjegyzet, nem külön szótár, nem
harmonika).
*Forrás:* Sayfi et al., J Clin Epidemiol 165:111219 (a közérthető változat
javította a megértést);
[Frontiers, 2021](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2021.725840/full)
(a betegoktató anyagok rendszerint a célközönség szintje fölött vannak).

**B8.2** — Az orvosi/gyógyászati állítást **rövid mondat, aktív szerkezet,
konkrét alany** hordozza; a bekezdés legfeljebb 3–4 mondat.
*Forrás:* ugyanaz; illetve NN/g F-mintázat-ellenszerek (információsűrű kezdés).
*Megjegyzés:* **NINCS ERŐS BIZONYÍTÉK** magyar nyelvre validált olvashatósági
képletre (a Flesch–Kincaid-féle mutatók angolra kalibráltak). Ezért a szabály
szerkezeti, nem pontszám-alapú; méréshez emberi ellenőrzés kell.

**B8.3** — A **listásítás nem helyettesíti a magyarázatot**: 5-nél hosszabb
szakszó-felsorolás elé vagy után kell egy laikus összefoglaló mondat, ami
megmondja, mire jó az egész.
*Forrás:* [Layer-Cake Pattern](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)
(az alcím/összefoglaló vezeti a szemet); K15/K16.

### 3.9 — Viszony a meglévő UX-skillhez

**Nincs tartalmi ellentmondás.** A B-szabályok kiegészítik, nem írják felül a
`docs/ertekesitesi-ux-skill.md`-t. Két pontot azonban a vezetőnek látnia kell:

1. **A skill 4. pontja a sorhosszt „`max-width` ch-ban" méri.** Ez a mértékegység
   a repó betűjén és magyar szövegen ~32 %-kal hosszabb sort ad, mint amit a
   szám sugall (B1.2). Ez **nem a szabály hibája, hanem a mérőeszközé** — a
   szám (45–75 karakter) marad, a `ch`-ban kiírt jelenlegi értékeket kell
   újraszámolni. **Ezt tekintem a legfontosabb visszajelzésnek a meglévő
   skillre.**
2. **A skill M6 pontja („vélemények: max 2–3, rövid, a termék UTÁN") mögé nem
   találtam kutatást** (2.7, K14). A szabály nem mond ellent semminek, és a
   figyelem-eloszlásból logikusan következik, de „kutatással bizonyítottnak"
   nem nevezhető. Javaslom megtartani, de a doksiban vélemény-alapúként
   jelölni, vagy A/B-vel megmérni.

**Egy látszólagos ütközés feloldva:** a skill 3. pontja 44×44 px érintési célt
ír elő, a WCAG 2.2 AA (2.5.8) viszont csak 24×24-et. Ez nem ellentmondás — a
skill szigorúbb, és a WCAG 2.5.5 (AAA) szintjén van. **Maradjon a 44 px.**

---

## 4. Oldalankénti audit

Prioritás: **P0** = pénzt veszítünk vagy tartalom vész el · **P1** = mérhető
élményromlás a fő úton · **P2** = javítandó, de nem blokkoló.

| Oldal | Felhasználói feladat | Probléma (mért/ellenőrzött) | Sérült szabály | Javasolt elrendezés | Prio |
|---|---|---|---|---|---|
| `/kurzusok/[slug]` | „Megéri-e nekem 79 500 Ft-ért? Mit kapok? Van-e kockázat?" | **148 karakter/sor** a `.kc-richtext`-ben (nincs `max-width`, széles konténer). **Egyetlen** vásárlási gomb az egész oldalon, a lap tetején; a buybox sticky-je csak a hero rácsban tud utazni. 44 listaelem (tanterv, bónuszok, kizárások) egy hasábban. A **30 napos garancia a lap legalján**. Nincs GYIK. | B1.1, B1.2, B2.1, B3.1, B6.1, B6.3, WCAG 1.4.8 | Kétharmad/harmad rács: bal a szöveg **34rem mértékkel**, jobb a ragadós buybox (ár + CTA + garancia-jelvény + „mit kapsz" 4 pont). Tanterv-modulok **2 oszlopos rácsba**. Bónuszok **3 kártyás rácsba**. „Kinek jó / kinek nem" **egymás mellé, két hasábba**. Garancia külön, kiemelt sáv a CTA-ismétléssel. Lap alján GYIK (`FaqBlock`). Mobilon ragadós ár+gomb sáv | **P0** |
| `/penztar` (kijelentkezve) | „Kifizetem a kurzust" | A `Megveszem` **átirányít** a `/belepes`-re. Az érkező oldal h1-je „Belépés", a termék neve, ára és bármilyen indoklás **nincs sehol**; a „Regisztrálj" sima szöveglink a lap alján | B6.4, B6.2 | A fiók-lépés a pénztár RÉSZE maradjon: fejlécben a termék + ár, egy mondat („A kurzushoz fiók kell, mert ott éred el a videókat élethosszig"), a **regisztráció legyen az elsődleges gomb**, a belépés a másodlagos út | **P0** |
| `/rolunk` | „Kik ezek? Megbízhatók? Értenek ehhez?" | **2 038 szó, 108 listaelem, 28 címsor, 1 kép — egyetlen 720 px-es hasábban, 92 karakteres sorral.** A két teljes szakmai önéletrajz (5-5 alszekció) a lap alsó felében folyószövegként. Nincs szkennelhető összefoglaló a tetején | B1.1, B2.1, B2.3, B5.1, WCAG 1.4.8 | NN/g 4 szintű hierarchia: 1–2 bekezdéses, szkennelhető összefoglaló → **hitel-csík számokkal** (évek, olimpikonok, egyesületek, kreditpont) → két bemutatkozó **egymás mellett** (kép + 3 mondat + „Részletes önéletrajz") → **a CV-k harmonikába**, darabszámos fejlécekkel („Publikációk (7)") → vélemények. Szöveg mértéke 34rem | **P0** |
| `/szolgaltatasok` | „Melyik út való nekem: rendelő, otthoni kurzus vagy szakmai képzés?" | Három PÁRHUZAMOS, egymást kizáró ajánlat **egymás alatt**, folyószövegben (h3 + 3-5 bekezdés fejenként). Mindhárom **`primary` gombot** kap — köztük egy KÜLSŐ link (probodystudio.hu) ugyanazzal a súllyal, mint a fizetős kurzus. Az „Árlista" **felsorolás**, nem összehasonlítható tábla. Szakszavak laikus magyarázat nélkül | B3.1, B4.1, B6.5, B8.1, B8.3, B1.1 | A három ág **3 oszlopos összehasonlító rácsba**, azonos mezőkkel (kinek való · hol · mennyi idő · ár · CTA). Az online kurzus CTA-ja `primary`, a másik kettő `secondary`/szöveglink (skill 1. pont). Árlista **táblázatba**. Minden szakszó mellé fél mondat | **P0** |
| `/kurzusok` (lista) | „Mit kínálnak, mennyiért, melyik nekem való?" | 2 kurzus **`repeat(3, 1fr)` rácsban** → üres harmadik oszlop 1024 px felett. Szűrő 1 valódi kategóriával, 2 tételre. A második célközönség-sáv üres. A kártyák nem hozzák azonos helyen az összehasonlítási mezőket (hossz, célközönség, kinek való) | B3.5, B4.1, B4.3 | `repeat(auto-fit, minmax(...))` vagy elemszámhoz igazított oszlop. A szűrő elrejtése, amíg nincs 5 tétel / 3 kategória. A kártyákra azonos mezősor: célközönség · terjedelem · **ár** · CTA. 3-4 tételig **összehasonlító lista/tábla** is mérlegelendő | P1 |
| `/blog` | „Van-e hasznos anyaguk? (SEO-belépő)" | **Üres:** 0 poszt, összesen 7 szó. Az üres állapot a `kc-empty` osztályt viseli, amit **a CSS sehol nem definiál** (csak `.kc-empty-state` létezik) → formázatlan, csupasz bekezdés. Nincs lead, nincs kivezető út | B2.2; a kezdőlapi M7 (tudástár) nem tud teljesülni | Rövid távon: definiált, központozott üres állapot **kivezető CTA-val** a kurzusokra. Közép: 3-5 cikk, majd 2-3 oszlopos, azonos mezőrendű poszt-rács | P1 |
| `/kapcsolat` | „Kérdezek / időpontot kérek" | Csak 61 szó: h1 + egy bekezdés + űrlap. **Nincs kint a két rendelő címe, telefon, e-mail, válaszidő** — pedig a `/szolgaltatasok` szövegében ott vannak. Az NN/g szerint a felhasználók több csatornát várnak | B2.2, B6.6; K12 (2. tényező: elérhetőség) | Kétharmad/harmad: bal az űrlap, jobb egy „Elérhetőségek" kártya (2 cím, telefon, e-mail, válaszidő-ígéret, térkép-link). A `/szolgaltatasok`-on lévő tartalom ide is kell | P1 |
| `/belepes`, `/regisztracio` | „Bejutok a megvett kurzusomhoz" / „Fiókot nyitok, hogy vásárolhassak" | Az oldalak önmagukban rendben (36rem, 44 px-es célok, hibaüzenetek magyarul). A **kontextus** hiányzik: vásárlásból érkezve ugyanazt látja a felhasználó, mint egyszerű belépéskor | B6.4 | `returnUrl`-függő fejléc: ha a `returnUrl` a pénztárra mutat, a lap fejléce a vásárlás lépéseként mutatkozzon be (termék + ár + indoklás) | P1 |
| `/kosar` | „Mit veszek, mennyiért?" | Közvetlenül megnyitva üres („A kosarad jelenleg üres"), mert a kosár kliensoldali és a termék query-paraméterből jön. A vásárlási út a kurzusoldalról **kihagyja** a kosarat (`/penztar?termek=` közvetlenül) | B6.2 | Vagy egyértelműen jelezni, hogy egykurzusos vásárlás van (és a kosarat elrejteni a navigációból, ha üres), vagy a kosárba beépíteni a termék-összegzést. **Nyitott kérdés a vezetőnek** (7. fejezet) | P2 |
| `/` (kezdőlap) | REFERENCIA — nem alakítjuk át | A 24 címsoros, tábla-szekciós, többhasábos szerkezet **pontosan az, amit a belső oldalakról hiányolunk** (rács, kártya, GYIK-harmonika, hitel-csík). A `kc-board` teljes képernyős táblák viszont álpadló-kockázatot hordoznak — a kezdőlapon ez tudatos, belső oldalra **nem** viendő át (B2.4) | — | Nincs teendő. A kezdőlap a MINTA: a blokk-katalógus bizonyítottan működik, csak a belső oldalak nem érik el | — |

**Rendszerszintű megállapítás az egész táblázat fölé:** a fenti P0-k négyből
háromnál (`/rolunk`, `/szolgaltatasok`, és részben a `/blog`) **ugyanaz a
gyökérok** — a `Pages.layout` blokk-mezőt a `src/app/(frontend)/[slug]/page.tsx`
nem rendereli (P3). Ezt megjavítva a `/rolunk` és a `/szolgaltatasok`
átrendezése **CMS-munkává válik** (a staff a Lexical/blokk-szerkesztőben rakja
össze), nem kód-munkává — pontosan úgy, ahogy a `docs/ux-hierarchia-audit.md`
4. pontja a kezdőlapnál is előírja.

---

## 5. Konkrét elrendezési javaslatok (szövegesen, nem kód)

### 5.1 `/kurzusok/[slug]` — a kurzus-értékesítő oldal

**Váz.** Morzsamenü → kétharmad/harmad rács. **Bal (kétharmad, mérték 34rem):**
címsor, lead, előzetes videó, majd a szekciók. **Jobb (harmad, ragadós):**
borító, ár, `Megveszem`, alatta 3-4 pipa („azonnali hozzáférés",
„50+ videó", „30 napos garancia", „örökös hozzáférés"). A ragadós sávnak a
TELJES tartalom mellett kell utaznia, nem csak a hero magasságában.

*Miért:* a nézési idő 42 %-a a lap felső 20 %-ára esik, 81 %-a az első három
képernyőre ([Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/))
— tehát a döntési információnak fent kell lennie, és a gombnak végig elérhetőnek.
A fő tartalom egy hasábban maradása a GOV.UK „two-thirds and one-third" mintája
([Layout](https://design-system.service.gov.uk/styles/layout/)).

**Tanterv (4 modul).** **Kétoszlopos rács**, modulonként azonos szerkezettel
(sorszám, cím, 1 mondat, a videók száma/hossza), NEM harmonika.
*Miért:* párhuzamos, összehasonlítható tartalom (B3.1), és a vásárlás előtt álló
látogatónak a TELJES tanterv kell — a GOV.UK tiltja a „content that all users
need to see" elrejtését ([Accordion](https://design-system.service.gov.uk/components/accordion/)).

**Bónuszok (3 minikurzus).** **Háromkártyás rács**, azonos mezőrenddel (cím,
kinek szól, eredeti érték, „most ajándék").
*Miért:* homogén tételek egymás melletti összehasonlítása; a kártya csak akkor
jó, ha minden kártya ugyanott hozza ugyanazt ([Cards](https://www.nngroup.com/articles/cards-component/)).

**„Ez a program tökéletes neked, ha…" / „Nem javasoljuk, ha…".** **Egymás
mellé, két hasábba**, azonos magasságban, vizuálisan megkülönböztetve
(pipa/kereszt).
*Miért:* ez a kettő definíció szerint összehasonlítandó pár — egymás alatt a
felhasználónak fejben kell összevetnie őket, ami az NN/g kártya-kutatásában
mért „oda-vissza járó tekintet" problémája. A „kinek nem való" nyílt kimondása
egyben a hitelesség 2. tényezője (upfront disclosure,
[Trustworthy Design](https://www.nngroup.com/articles/trustworthy-design/)).

**Garancia.** Ne a lap alján legyen. Kerüljön (a) jelvényként a buyboxba és
(b) a lap alján saját, kiemelt sávba, **CTA-ismétléssel**.
*Miért:* a Baymard szerint az oldalak 44 %-a nem jeleníti meg és nem is linkeli
a visszaküldési feltételeket, és a kosárelhagyások 13 %-a ezen múlik
([Product Page UX](https://baymard.com/blog/current-state-ecommerce-product-page-ux);
[Cart Abandonment](https://baymard.com/lists/cart-abandonment-rate)).

**GYIK a lap aljára**, a meglévő `FaqBlock`-kal (natív `<details>`).
*Miért:* a GYIK az a tartalomtípus, ahol a harmonika bizonyítottan indokolt —
a felhasználónak csak a saját kérdése kell, a tételek önállóak
([Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/)).

**Mobil ragadós vásárlósáv (ár + gomb).** Bevezetésekor a `scroll-padding` a
fejléc ÉS a sáv összegére állítandó.
*Miért:* WCAG 2.2 SC 2.4.11 — a ragadós elem nem takarhatja teljesen a
fókuszált elemet ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).

### 5.2 `/rolunk` — a bizalmi oldal

**1. réteg: 1–2 bekezdéses, szkennelhető összefoglaló** a lap tetején — mit
csinálunk, kinek, hol.
**2. réteg: hitel-csík számokkal** (évek · kezelt esetek · olimpikonok/sportolók
· 2 szakmai egyesület · akkreditált képzés kreditpontszáma) — vízszintes,
3-5 elemű rács.
**3. réteg: a két szakember egymás mellett** (kép + 3 mondat + „Részletes
szakmai önéletrajz" horgony).
**4. réteg: a két önéletrajz HARMONIKÁBAN**, alszekciónként (Tanulmányok,
Tanfolyamok, Publikációk, Konferenciák, Média), a fejlécben **darabszámmal**.
**5. réteg: vélemények** (a skill M6 szerinti visszafogott formában).

*Miért:* pontosan az NN/g „About Us" kutatás 4 szintű hierarchiája
(tagline → szkennelhető összefoglaló → alszekciók → lábléc), és a nevesített
negatív minta („walls of text without white space") elkerülése
([About Us Information](https://www.nngroup.com/articles/about-us-information-on-websites/)).
A harmonika itt azért indokolt, mert a látogató „choose to show and hide
sections relevant to them" helyzetben van — a GOV.UK ezt kifejezetten a
harmonika érvényes esetének nevezi
([Accordion](https://design-system.service.gov.uk/components/accordion/)).
A darabszám a fejlécben azért kell, mert a rejtés önmagában eltüntetné a
bizonyíték MENNYISÉGÉT, ami maga a bizalmi jelzés.

**A CV-tételek sorhossza.** Ezek jellemzően rövid, egysoros bejegyzések —
listaként (nem folyószövegként) a 34rem mérték itt is tartható, és a hosszú
intézménynevekhez kell a `hyphens: auto` (B3.4).

### 5.3 `/szolgaltatasok` — a döntési oldal

**Háromoszlopos összehasonlító rács** a lap közepére: Rendelői kezelés · Otthoni
online program · Szakmai képzés. Minden oszlopban **azonos sorrendben, azonos
magasságon**: kinek való · hol/hogyan · mennyi idő · ár (vagy „ártól") · CTA.
Alatta oszloponként a részletek.

*Miért:* három párhuzamos, egymást kizáró opció — ez a rács-elrendezés
tankönyvi esete (B3.1); az egységes mezőrend pedig azért kell, mert az NN/g
szemmozgás-vizsgálatában a kártyák akkor nehezítik az összehasonlítást, ha az
információ nem kiszámítható helyen van
([Cards](https://www.nngroup.com/articles/cards-component/)).

**CTA-súlyozás.** A fizetős online kurzus gombja `primary`; az „Időpontot kérek"
(lead) és a külső probodystudio.hu link `secondary`, illetve szöveglink.
*Miért:* a skill 1. pontja szerint „ami pénzt hoz, az előrébb és
hangsúlyosabban, mint ami csak leadet" — ma három egyenrangú `primary` gomb
verseng, és a külső link kiviszi a látogatót az oldalról.

**Árlista táblázatba** (alkalom · időtartam · ár · mit tartalmaz), nem
felsorolásba.
*Miért:* összehasonlítandó, homogén adat — a lista/tábla itt bizonyítottan
gyorsabb átfutást ad, mint a szabad szöveg
([Cards vs. list findings](https://www.nngroup.com/articles/cards-component/)).
A táblázat a WCAG 1.4.10 reflow-kivétele alá esik ugyan, de a bevezető
szövegnek akkor is reflow-znia kell — és mobilon kártyás összecsukás javasolt.

**Szaknyelv.** Minden szakszó mellé fél mondat, ugyanabban a sorban („flossing —
gumiszalagos szorítás a keringés javítására"). A felsorolás elé egy laikus
összefoglaló mondat.
*Miért:* Sayfi et al. randomizált vizsgálata szerint a közérthető változat
javította a megértést; a betegoktató anyagok pedig rendszeresen a célközönség
szintje fölött vannak
([Frontiers, 2021](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2021.725840/full)).

### 5.4 `/kurzusok` — a listaoldal

**Az oszlopszám kövesse az elemszámot** (`auto-fit`/`minmax` vagy feltételes
oszlop), hogy ne maradjon üres harmadik hasáb. **A kártyák azonos mezősort
hozzanak** azonos sorrendben: célközönség-jelölő · terjedelem · **ár** · CTA.
**A szűrő maradjon rejtve**, amíg nincs legalább 5 tétel vagy 3 valódi
kategória.
*Miért:* a rács kiszámíthatósága ([Using Grids](https://www.nngroup.com/articles/using-grids-in-interface-designs/));
a homogén tételeknél a kártya csak akkor nem rontja az összehasonlítást, ha
minden mező kiszámítható helyen van ([Cards](https://www.nngroup.com/articles/cards-component/)).
*A szűrő-küszöb saját javaslat* — a pontos számra **NINCS ERŐS BIZONYÍTÉK**.

**Hosszabb távon (5+ kurzusnál):** kártyák helyett vagy mellett összehasonlító
lista/tábla is mérlegelendő, ugyanezen kutatás alapján.

### 5.5 `/kapcsolat`

**Kétharmad/harmad:** bal az űrlap, jobb egy „Elérhetőségek" kártya (a két
rendelő címe, telefon, e-mail, válaszidő-ígéret, térkép-link).
*Miért:* az NN/g „About Us" kutatásában az elérhetőség a harmadik legfontosabb
elvárt tartalom, több csatornán; a hitelesség 2. tényezője pedig kifejezetten
tartalmazza az elérhetőség nyílt közlését
([About Us](https://www.nngroup.com/articles/about-us-information-on-websites/);
[Trustworthy Design](https://www.nngroup.com/articles/trustworthy-design/)).
Ma ezek az adatok a `/szolgaltatasok` szövegtestében vannak elrejtve.

### 5.6 `/penztar` belépési lépése

A `/belepes?returnUrl=/penztar…` oldal **a pénztár lépéseként** mutatkozzon be:
fejlécben a termék neve + ár, egy mondatos indoklás, és a **regisztráció legyen
az elsődleges, gombként megjelenő út** (az új vevő ezen jön), a belépés a
másodlagos.
*Miért:* a Baymard tesztjeiben a szöveglinkként megjelenő út rendszeresen
elveszett a felhasználók számára, és a kötelező fiók önmagában a vásárlók 24 %-át
elvitte (4 384 fő, 2022) — a guest checkoutot kínáló oldalak 47 %-a hibázza el a
hangsúlyt ([Make „Guest Checkout" Prominent](https://baymard.com/blog/make-guest-checkout-prominent));
az NN/g pedig a „login wall az érték átadása előtt" mintát bizalomrombolóként
nevezi meg ([Trustworthy Design](https://www.nngroup.com/articles/trustworthy-design/)).

### 5.7 Mértékre fogás — hol pontosan

| Hol | Ma | Javasolt | Ellenőrzés |
|---|---|---|---|
| `.kc-richtext` (kurzus longDescription, CMS-oldalak) | nincs `max-width` → **148 kar** széles konténerben | `max-width: var(--kc-measure)` = 34rem (**75 kar**) | számított szélesség ≤ 545 px |
| `--kc-container-narrow` szövegtörzs (`/rolunk`, `/szolgaltatasok`) | 672 px → **92 kar** | a bekezdés kapja a mértéket, a konténer maradhat | ugyanaz |
| `blocks/faq.css:83`, `states.css:47`, `usps.css:118`, `welcome.css:157` | `68ch` → **90 kar** | ≤ 57ch (75 kar) vagy `--kc-measure` | ugyanaz |
| `layout.css:711` (hírlevél-hozzájárulás) | `72ch` → **95 kar** | ≤ 60ch | ugyanaz |
| `content.css:68` (`.kc-section-lead`) | `56ch` → **74 kar** | **megfelel** (a sáv teteje) | — |
| `content.css:392` (`.kc-testimonials__text`) | `60ch` → **79 kar** | határeset, ≤ 57ch javasolt | — |

> **Fontos hatókör-jelzés:** a fenti táblák közül több a KEZDŐLAP blokkjait
> érinti (`faq`, `states`, `usps`, `welcome`, `testimonials`). A tulajdonos a
> kezdőlapot nem akarja átalakítani — a sorhossz-korrekció viszont NEM
> layout-átalakítás, hanem a skill 4. pontjának betartása. **Vezetői döntés
> kell**, hogy ezek a kezdőlapi értékek ebben a körben hozzányúlhatók-e (lásd
> 7. fejezet, NY2).

---

## 6. Mérési terv — hogyan bizonyítjuk UTÓLAG, hogy jobb lett

A repóban PostHog van (`docs/posthog.md`), a meglévő tölcsér:
`$pageview → course_viewed → checkout_started → purchase_confirmed`
(a `course_viewed` a kurzusoldalon sül el —
`src/app/(frontend)/kurzusok/[slug]/page.tsx:216`).

### 6.1 Előmérés (kötelező, a változtatás ELŐTT)

Legalább **2 hét** alapvonal a jelenlegi felületen, hogy legyen mihez mérni. A
skill 5. pontja szerint a változást a PR-leírásban rögzíteni kell.

**Alapvonal-mutatók:**

| # | Mutató | Definíció |
|---|---|---|
| A1 | Kurzusoldal → pénztár arány | `checkout_started` / `course_viewed` |
| A2 | Pénztár → vásárlás arány | `purchase_confirmed` / `checkout_started` |
| A3 | **Belépési fal áteresztése** | `/belepes?returnUrl=/penztar…` megtekintés → `checkout_started` |
| A4 | Kurzusoldal görgetési mélység | 25/50/75/100 % (lásd 6.2) |
| A5 | Belépő oldalak visszafordulási aránya | `/rolunk`, `/szolgaltatasok`, `/kurzusok` |
| A6 | Eszközbontás | mobil vs. desktop minden fentire |

### 6.2 Új események (a jelenlegi láncba illesztve, a lánc törése nélkül)

A skill 5. pontja kifejezetten előírja, hogy új CTA/kártya bevezetésekor
ellenőrizni kell, beleesik-e a meglévő eseményláncba. A javasolt kiegészítések
**nem** helyettesítik a meglévő eseményeket, csak feloldják őket:

| Esemény | Property | Mit válaszol meg |
|---|---|---|
| `scroll_depth` | `path`, `percent` (25/50/75/100) | Eljut-e valaki a garanciáig? (P1, K4) |
| `cta_clicked` | `path`, `position` (`hero`\|`sticky`\|`bottom`), `courseId` | **Melyik CTA-pozíció hozza a vásárlást?** Ez méri közvetlenül a B6.1-et |
| `accordion_opened` | `path`, `section` | Megtalálják-e a rejtett tartalmat? (B5, GOV.UK aggálya) |
| `anchor_nav_used` | `path`, `target` | Használják-e a horgony-navigációt? (B2.3, NN/g 9/11) |
| `auth_gate_viewed` | `returnUrl`, `productId` | A belépési fal **áteresztő képessége** (P4) |
| `auth_gate_choice` | `choice` (`register`\|`login`) | Melyik utat választják a vásárlásból érkezők? |

### 6.3 A hat konkrét hipotézis, mérhető megfogalmazásban

| # | Változtatás | Hipotézis | Elsődleges mérőszám | Siker-küszöb |
|---|---|---|---|---|
| H1 | CTA-ismétlés + ragadós mobil vásárlósáv (B6.1) | Több látogató jut el a pénztárig | A1 (`checkout_started`/`course_viewed`) | **relatív +15 %**, statisztikailag szignifikáns |
| H2 | Sorhossz 148 → ≤75 karakter (B1.1) | Mélyebb görgetés, több elolvasott érv | A4 (75 %-os mélységet elérők aránya) | **relatív +20 %** |
| H3 | Belépési fal kontextussal + regisztráció mint elsődleges gomb (B6.4) | Kevesebben esnek ki a fiók-lépésnél | A3 (fal-áteresztés) | **relatív +20 %** |
| H4 | `/szolgaltatasok` 3 oszlopos összehasonlítás + CTA-súlyozás (5.3) | Több látogató megy a fizetős kurzus felé | `/szolgaltatasok` → `course_viewed` átkattintás | **relatív +25 %** |
| H5 | `/rolunk` rétegezve + CV harmonikába (5.2) | Kevesebb visszafordulás, több továbblépés a kurzusokra | A5 + `/rolunk` → `course_viewed` | visszafordulás **−10 %**, átkattintás **+15 %** |
| H6 | Garancia a buyboxba + kiemelt sávba (B6.3) | Nő a pénztár→vásárlás konverzió | A2 | **relatív +10 %** |

### 6.4 Módszertani előírások (enélkül a szám nem bizonyíték)

1. **Nem egyszerre.** Legfeljebb 2 hipotézis fusson egy időben, különben nem
   tudjuk, melyik hatott.
2. **A/B ott, ahol lehet.** A H1, H2 és H6 kártyaszinten A/B-zhető (PostHog
   feature flag). A H3–H5 oldal-szintű átalakítás, ott **előtte/utána**
   összevetés kell, azonos hosszúságú ablakkal, szezonalitást jelölve.
3. **Minimális mintaméret.** A jelenlegi forgalom mellett hetekben kell
   gondolkodni; kis mintán a százalékos ugrás zaj. **A futásidőt a
   kísérlet INDÍTÁSA előtt kell rögzíteni**, nem utólag megállítani, amikor
   „jól áll" (peeking).
4. **Eszközbontás kötelező.** A mobil és a desktop külön értékelendő — a
   sorhossz-hiba desktopon üt, a CTA-hiány mobilon.
5. **Egészség-ellenőrzés.** Minden körben ellenőrizendő, hogy a
   `course_viewed → checkout_started → purchase_confirmed` lánc nem tört el
   (a skill 5. pontja).
6. **Nem-mérhető, de kötelező ellenőrzések** minden változtatás után:
   320 CSS px-es reflow (B7.1), Tab-bejárás fókusz-takarásra (B7.2),
   `npm run lint` / `typecheck` / `test` / `build`.

### 6.5 Amit a mérés NEM tud eldönteni

Az érthetőség (B8) és a bizalmi hatás (B6.6) tölcsérrel csak közvetve mérhető.
Ezekhez **5-8 fős, moderált használhatósági teszt** javasolt, feladatokkal
(„Találd meg, mi történik, ha nem válik be a program", „Mondd el a saját
szavaiddal, mit kapsz 79 500 Ft-ért"). Ez a legolcsóbb módja annak, hogy a
K15/K16 (egészségügyi érthetőség) állítást a saját tartalmunkon is
ellenőrizzük — mert erre validált magyar olvashatósági képlet nincs (B8.2).

---

## 7. Nyitott kérdések a vezetőnek

**NY1 — A `Pages.layout` renderelése (P3).** Ez kód-változtatás a
`src/app/(frontend)/[slug]/page.tsx`-ben. A skill nem szól róla, a CLAUDE.md
tilos zónái közé nem esik. **Kérdés:** ebben a körben javítjuk (és utána a
`/rolunk` + `/szolgaltatasok` átrendezése CMS-munka lesz), vagy külön
ticketként megy? Ez dönti el a többi P0 becsült méretét.

**NY2 — A kezdőlapi blokkok sorhossz-értékei (5.7).** A `68ch`/`72ch` értékek
90-95 karakteres sort adnak, tehát sértik a skill 4. pontját — de a fájlok a
kezdőlapot is érintik, amihez a tulajdonos nem akar hozzányúlni. **Kérdés:**
a sorhossz-korrekció beleférjen-e a „kezdőlap marad" ígéretbe (szerintem igen,
mert nem elrendezést változtat, hanem szabályt tart be), vagy külön
jóváhagyást kér?

**NY3 — A `/kosar` szerepe.** A vásárlási út ma megkerüli (`/penztar?termek=`
közvetlenül a kurzusoldalról), a `/kosar` közvetlenül megnyitva üres. **Kérdés:**
megmarad-e a kosár mint önálló lépés (több kurzus egyszerre?), vagy egykurzusos
vásárlásra egyszerűsítjük és a navigációból is kivezetjük? Enélkül nem tudok
felelős elrendezést javasolni rá — ezért maradt P2.

**NY4 — A `--kc-measure` token bevezetése.** A B1.3 új tokent javasol
(`--kc-measure`, `--kc-measure-comfort`) a `tokens.css`-be. **Kérdés:** ez a
tokenkészlet bővítése — kell-e hozzá külön jóváhagyás, vagy a skill 4. pontja
(„méret csak a közös skáláról") már lefedi?

**NY5 — Az M6 (vélemények) szabály státusza (3.9/2).** Kutatást nem találtam
mögé. **Kérdés:** maradjon-e „szabály" a skillben, vagy jelöljük vélemény-alapú
konvencióként, és tegyük a H-lista végére mérésre?

**NY6 — A `/blog` üressége.** Ez tartalmi, nem elrendezési kérdés (0 poszt).
Az elrendezési javaslat csak akkor értelmezhető, ha lesz tartalom. **Kérdés:**
van-e tartalmi terv, vagy addig az üres állapotot kell konverziós kivezetővé
alakítani (és a `kc-empty` osztály-hibát javítani)?

---

## 8. Felhasznált források

**Nielsen Norman Group (11)**
1. [The Layer-Cake Pattern of Scanning Content on the Web](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)
2. [F-Shaped Pattern of Reading on the Web: Misunderstood, But Still Relevant](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)
3. [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)
4. [The Illusion of Completeness](https://www.nngroup.com/articles/illusion-of-completeness/)
5. [Accordions on Desktop: When and How to Use](https://www.nngroup.com/articles/accordions-on-desktop/)
6. [Accordions for Complex Website Content on Desktops](https://www.nngroup.com/articles/accordions-complex-content/)
7. [Cards: UI-Component Definition](https://www.nngroup.com/articles/cards-component/)
8. [In-Page Links for Content Navigation](https://www.nngroup.com/articles/in-page-links-content-navigation/)
9. [Zigzag Image–Text Layouts Make Scanning Less Efficient](https://www.nngroup.com/articles/zigzag-page-layout/)
10. [„About Us" Information on Corporate Websites](https://www.nngroup.com/articles/about-us-information-on-websites/)
11. [Trustworthiness in Web Design: 4 Credibility Factors](https://www.nngroup.com/articles/trustworthy-design/)

*(további NN/g anyagok, amelyekre a szöveg hivatkozik: [Banner Blindness
Revisited](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/),
[Using Grids in Interface Designs](https://www.nngroup.com/articles/using-grids-in-interface-designs/),
[Horizontal Attention Leans Left](https://www.nngroup.com/articles/horizontal-attention-leans-left/),
[The Principle of Common Region](https://www.nngroup.com/articles/common-region/),
[Social Proof in the User Experience](https://www.nngroup.com/articles/social-proof-ux/))*

**Baymard Institute (4)**
16. [Readability: The Optimal Line Length](https://baymard.com/blog/line-length-readability)
17. [Accordion UX: The Pitfalls of Inline Accordion and Tab Designs](https://baymard.com/blog/accordion-and-tab-design)
18. [Product Page UX Best Practices](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
19. [Make „Guest Checkout" Prominent](https://baymard.com/blog/make-guest-checkout-prominent) · [Cart Abandonment Rate Statistics](https://baymard.com/lists/cart-abandonment-rate)

**W3C / WCAG 2.2 (4)**
20. [SC 1.4.10 Reflow (AA)](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
21. [SC 2.4.11 Focus Not Obscured, Minimum (AA)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
22. [SC 2.5.8 Target Size, Minimum (AA)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
23. [SC 1.4.8 Visual Presentation (AAA)](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html)

**GOV.UK Design System (2)**
24. [Layout](https://design-system.service.gov.uk/styles/layout/)
25. [Accordion](https://design-system.service.gov.uk/components/accordion/)

**Publikált olvashatóság- és szemmozgás-kutatás (3)**
26. Dyson, M. C. & Haselgrove, M. (2001): *The influence of reading speed and
    line length on the effectiveness of reading from screen.* International
    Journal of Human-Computer Studies 54.
    [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1071581901904586)
27. Shaikh, A. D. & Chaparro, B. S. (2005): *The Effects of Line Length on
    Reading Performance of Online News Articles.* Proc. HFES 49, 701–705.
    [SAGE](https://journals.sagepub.com/doi/abs/10.1177/154193120504900514)
28. Dyson, M. C.: *Line length revisited: following the research* — kutatási
    áttekintés, amely a Tinker & Paterson (1929, 1940), Hartley et al. (1978),
    Duchnicky & Kolers (1983), Dyson & Kipping (1998), Bernard et al. (2002,
    2003), Schneps et al. (2013) és Slattery & Vasilev (2019) elsődleges
    munkákat összeveti.
    [designregression.com](https://designregression.com/article/line-length-revisited-following-the-research)

**Egészségügyi érthetőség (3)**
29. Sayfi S, Charide R, Elliott SA, Hartling L, Munan M, Stallwood L, et al.:
    *A multimethods randomized trial found that plain language versions improved
    adults' understanding of health recommendations.* J Clin Epidemiol
    165:111219. PMID 38008266. [DOI](https://doi.org/10.1016/j.jclinepi.2023.11.009)
30. *Readability and Comprehension of Printed Patient Education Materials.*
    Frontiers in Public Health, 2021.
    [Frontiers](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2021.725840/full)
31. *Readability of written information for patients across 30 years: A
    systematic review of systematic reviews.* Patient Education and Counseling.
    [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0738399125000230)

**Saját, reprodukálható mérés (1)**
32. Kineticare betűkészlet- és korpuszmérés (2026-08-15): `fontTools`,
    `instantiateVariableFont(wght=400)`, `hmtx`-előretolások a
    `public/fonts/nunito-sans-var-latin*.woff2`-n, magyar mintaszöveg az élő
    oldal HTML-jéből. Módszer és eredmények: 0. fejezet.

### Amihez NEM találtam elfogadható forrást (kimondva)

- **Hosszú vs. rövid értékesítő oldal konverziós hatása** (2.6) — csak
  eszközgyártói blogok és módszertan nélküli esettanulmányok. **NINCS ERŐS
  BIZONYÍTÉK.**
- **A vélemények optimális darabszáma és pontos elhelyezése** (2.7) — az NN/g
  social proof anyaga nem ad darabszám- vagy pozíció-ajánlást. **NINCS ERŐS
  BIZONYÍTÉK** (érinti a meglévő skill M6 pontját).
- **Magyar nyelvre specifikus optimális sorhossz** (2.1, K2) — magyar nyelvű,
  kontrollált olvashatósági kísérletet nem találtam. **NINCS ERŐS BIZONYÍTÉK.**
- **Magyar nyelvre validált olvashatósági képlet** (B8.2) — a bevett mutatók
  angolra kalibráltak. **NINCS ERŐS BIZONYÍTÉK.**
- **A szűrő/kategória-chip megjelenítési küszöbe** (B4.3, 5.4) — az 5 tétel /
  3 kategória saját, gyakorlati javaslat. **NINCS ERŐS BIZONYÍTÉK a pontos
  számra.**
- **A Sayfi et al. vizsgálat pontos hatásmérete** (K16) — a kiadói oldalak
  403-mal zárnak, az absztraktot elsődleges forrásból nem tudtam ellenőrizni.
  A hatás IRÁNYA bizonyított, a szám nem — ezért nem szerepel a dokumentumban.
- **A GOV.UK 75 karakteres ajánlásának kutatási háttere** (2.1) — a GOV.UK a
  layout-oldalán **nem hivatkozik kutatásra**; ez tervezési szabvány, nem
  kísérleti eredmény. Ezért támaszkodik a B1.1 a Dyson & Haselgrove
  megértés-adatra és a WCAG 1.4.8-ra is.
