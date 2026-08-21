# Tudástár: felhasználói séta a keresőből érkező látogatóval

**Mérés dátuma:** 2026-08-21. **Ág:** `claude/course-interface-admin-ec326e`,
`ed2de5d` (a kártya-javítás) utáni állapot.
**Amit csináltam:** kizárólag olvasás és mérés. Kódot nem módosítottam, űrlapot
nem küldtem be, fiókot nem hoztam létre, éles oldalra nem írtam.

Ez a dokumentum a `docs/felhasznaloi-seta.md` folytatása, ugyanazzal a
módszerrel és ugyanazzal a personával, de **más belépési ponttal**. Az a séta a
kezdőlapról indult. Ez a Google-ból, egy tünet-keresésből, egyenesen a
cikkoldalra.

A `docs/tudastar-a11y-meres.md` 4. fejezetének 4. pontja pontosan ezt a kört
kérte: *„Kognitív séta a keresőből érkező, a kezdőlapot soha nem látott
látogatóval."*

---

## 0. Hogyan olvasd ezt a dokumentumot

| Fejezet | Mire ad választ |
|---|---|
| 1. | A módszer, a persona és a mérés menete. |
| 2. | Belépés: mit lát az első három másodpercben? |
| 3. | Olvasás: hol veszítjük el? |
| 4. | A híd: a cikk végi kurzus-CTA. |
| 5. | A kurzusoldal: megkapja, amit a cikk ígért? |
| 6. | Visszaút és oldalsó utak: van-e zsákutca? |
| 7. | A riasztó eset: aki infarktustól fél. |
| 8. | Mobil, 320 px. |
| 9. | Súlyozott találati lista, fájllal és javaslattal. |
| 10. | A CTA-k szó szerinti szövege és a szótár-ellenőrzés. |
| 11. | Amit NEM szabad megváltoztatni. |
| 12. | Mérési napló és a mérés reprodukálása. |
| 13. | Nyitott kérdések a vezetőnek. |
| 14. | Források. |

### 0.1 Amit ez a dokumentum NEM

Nem akadálymentességi audit: azt a `docs/tudastar-a11y-meres.md` végezte el,
1 603 kontraszt-méréssel és 17 WCAG-sikerkritériummal. Itt csak azt ismétlem
meg, ami az ÚTVONAL szempontjából számít, és azt is saját méréssel.

Nem tartalmi lektorálás sem: a klinikai állítások ellenőrzése a
`docs/cikkek-tenyellenorzes.md` dolga. Ahol tartalmi kérdést érintek, ott a
felület felelősségéig megyek el: mit lát a látogató, mikor, és milyen sorrendben.

---

## 1. A módszer, a persona és a mérés

### 1.1 A módszer

Kognitív séta, ugyanazzal a négy kérdéssel, amit a `docs/felhasznaloi-seta.md`
1. fejezete rögzít (Wharton, Rieman, Lewis, Polson módszere, az NN/g
megfogalmazásában):

| # | Kérdés | Magyarul |
|---|---|---|
| **K1** | Megpróbálja-e a helyes eredményt elérni? | Eszébe jut-e egyáltalán ez a lépés? |
| **K2** | Észreveszi-e, hogy a helyes vezérlő elérhető? | Látja-e a képernyőn? |
| **K3** | Összekapcsolja-e a vezérlőt a céljával? | A feliratból rájön-e, hogy ez viszi a céljához? |
| **K4** | A visszajelzésből érti-e, hogy jó felé halad? | Kattintás után látja-e, hogy közelebb került? |

Súlyossági jelek, változatlanul a mintadokumentumból:

| Jel | Jelentés |
|---|---|
| 🔴 **elakad** | A feladat nem végezhető el, vagy rossz irányba visz. |
| 🟠 **bizonytalan** | Elvégezhető, de nem biztos benne, hogy jót csinál. |
| 🟡 **zavaró** | Elvégezhető, de kellemetlen vagy fölösleges lépés. |
| 🟢 **jó** | Ezt jól csináljuk, és nem szabad elrontani. |

### 1.2 A persona

Ugyanaz az ember, akivel a `docs/felhasznaloi-seta.md` dolgozott:

> **Kovácsné, 54 éves.** Irodában dolgozik, hétvégén kertészkedik. Fáj a
> csuklója és a hüvelykujja. Telefonon és laptopon is internetezik, de nem
> magabiztos. Az angol szavakat nem érti. Fél attól, hogy véletlenül fizet
> valamiért. Ha két kattintás után nem érti, hova jutott, bezárja az oldalt.

**Ami most más:** Kovácsné ezúttal nem a kineticare.hu címet gépeli be. Éjjel
felébredt a zsibbadástól, reggel beírja a Google-ba, hogy *kéz zsibbadás
éjszaka*, és a találati listából egy cikkre kattint. **A kezdőlapot soha nem
látta. A márkanevet most hallja először.**

Ez nem feltételezés, hanem a projekt saját mérése: a `docs/monid-masodik-kor.md`
3. fejezete szerint a versenytárs teljes organikus forgalmát tünet-cikkek adják,
és *„a kezdőlapjuk gyengébb, mint négy cikkük"*. Ugyanez a dokumentum méri, hogy
a `kéztőalagút szindróma` havi 3 600 keresés, a `kéz zsibbadás` 720, és hogy a
csúcs januárban van.

Az NN/g ugyanezt a belépési mintát írja le: a látogatók *„arrive directly at
your article from a search engine"* és *„dive directly into the article's text"*,
a navigációt és a cégnevet nem nézik meg (*Informational Articles Must Ask For
the Order*).

**A második persona, a 7. fejezethez.** A `docs/monid-masodik-kor.md` 6.
fejezete mérte, hogy a `bal kéz zsibbadás hányinger` valódi, keresett alak, és
kimondja: *„Aki így keres, jó eséllyel szívinfarktustól fél."* Ezt a látogatót
külön játszottam végig, mert nála a felület nem konverziós, hanem biztonsági
eszköz.

### 1.3 Hogyan mértem

A cikkoldalt a repó **valódi komponensével** (`PostArticle`) rendereltem
szerver-oldalon, a `docs/cikkek/1-miert-zsibbad-a-kezem.md` **valódi, mai
szövegével** (Lexical-dokumentummá alakítva), a repó **valódi CSS-láncával** és
**valódi, self-hostolt betűivel**. A lapot helyi HTTP-kiszolgáló adta, a mérést
Chromium 141 végezte (`/opt/pw-browsers/chromium-1194`, playwright-core).

Nézetablakok: **320×800, 390×844, 768×1024, 1440×900**, továbbá a rács-méréshez
592, 640, 840, 904, 1024, 1120, 1280, 1920 és 2560 px.

A sorhosszt `Range.getClientRects()` soronkénti valódi tördeléséből számoltam,
karakterenként, nem `ch`-egységből. A záró, részleges sor kimarad. A magyar
szöveg magyar szöveg: ékezetekkel, a repó saját cikkéből.

**Amit NEM tudtam mérni, és miért.** A fejléc (`Header`), a lábléc (`Footer`) és
a süti-sáv szerver-komponensek, amelyek adatbázisból olvasnak (`getNavTree`),
ezért ebben a harnesszben nem renderelhetők. A fejléc geometriáját a `tokens.css`
mért értékével szimuláltam (`position: sticky; top: 0; height: 72px;
z-index: 50`, `--kc-header-height: 4.5rem`). Ahol a fejléc tartalma számít, ott
ezt külön jelzem, és **feltételezésként** kezelem.

**A mérés reprodukálása:** 12. fejezet.

### 1.4 Figyelmeztetés: az ág mozgott mérés közben

A séta alatt két párhuzamos ügynök is dolgozott ugyanezen az ágon. Ez
mérhetően megváltoztatta a lapot:

- a `PostCard` átépült (`ed2de5d`): a kártya-link neve most a cikk címe,
  a cím címsor lett, és megszületett a `compact` változat;
- a `docs/cikkek/*.md` cikkek mind módosultak, és az 1. cikk kapott egy új,
  elöl álló „Előbb ezt: mikor kell azonnal mentőt hívni?" szakaszt.

**Minden szám ebben a dokumentumban a `ed2de5d` utáni, mai állapotra
vonatkozik**, és a mérést a változások után újrafuttattam. Ahol egy korábbi
mérésem elavult, azt nem hagytam benne.

---

## 2. Első lépés: a becsapódás

**Feladat:** „Rákattintottam egy találatra. Hol vagyok, és kik ezek?"

### 2.1 Amit mérve lát az első képernyőn

A `<main>` tartalma a 72 px-es ragadós fejléc alatt, 390×844-en, görgetés nélkül:

| Sorrend | Elem | y (px) | Szöveg |
|---|---|---|---|
| 1 | kategória-címke | 120 | „Kéz és csukló" |
| 2 | H1 | 165 | „Miért zsibbad a kezem?" |
| 3 | lead | 255 | „A kéz zsibbadás tünet, nem diagnózis…" |
| 4 | byline-sor | 378 | „Írta: Kiss Kata, gyógytornász, manuálterapeuta · 2026. szeptember 1. · kb. 12 perc olvasás" |
| 5 | tartalomjegyzék | 526 | „Ezen az oldalon" + az első 5 tétel |

A jegyzék **első tétele** („Előbb ezt: mikor kell azonnal mentőt hívni?")
y=578-nál áll, tehát **a hajtás fölött** van mind a négy mért nézetablakon.

### 2.2 A négy kérdés

| Kérdés | Válasz | Megjegyzés |
|---|---|---|
| K1 | **Igen.** | A H1 pontosan az ő kérdése. |
| K2 | **Igen.** | A cikk azonnal olvasható. |
| K3 | **Részben.** | Megtudja, hogy egy cikkben van, és hogy gyógytornász írta. Azt nem, hogy ez egy Tudástár, sem azt, hogy van még hasonló. |
| K4 | **Nem alkalmazható.** | Még nem kattintott. |

### 2.3 🟢 Ami jól működik

**A byline a hajtás fölött van, végzettséggel.** Mérve: y=378 a 844 px magas
képernyőn. Ez a legfontosabb bizalmi elem egy egészségügyi cikken, és a helye
pontosan az, amit az NN/g byline-kutatása kér: a rövid, hitelesítő byline a lap
tetején, a bővebb bemutatkozás a lap alján (*Bylines for Web Articles*). A
`PostAuthorBox` a lap alján ténylegesen ott van, lektor-sorral és
ellenőrzés-dátummal.

**A lead megmondja, mi NEM lesz a cikkben.** „Diagnózist nem adunk." Ez az
NN/g négy hitelességi tényezője közül az „Upfront Disclosure" (*Trustworthiness
in Web Design: 4 Credibility Factors*: *„people appreciate when sites are
upfront with all information"*).

**A jegyzék első tétele a vörös zászló szakasz.** Ez a mai felület legjobb
egyetlen döntése a riadt látogató szempontjából, és nem szabad elrontani.

### 2.4 🟠 **S3** Nincs látható morzsamenü, és nincs út a Tudástár gyűjtőoldalára

**Mérve.** A cikkoldal `<main>` elemében **24 link** van, ebből **0 mutat a
`/blog` gyűjtőoldalra**. Látható morzsamenü nincs: a `PostArticle` csak
`breadcrumbJsonLd`-t rendel ki, ami strukturált adat, a látogató nem látja.

Ugyanezen az oldalon a **kurzusoldalnak VAN látható morzsamenüje**:
`src/app/(frontend)/kurzusok/[slug]/page.tsx:483`,
`<nav aria-label="Morzsamenü" className="kc-course-breadcrumb">` a „Kurzusok"
visszalinkkel.

**Melyik szabályt sérti.** Az NN/g breadcrumb-irányelve pontosan a mi belépési
esetünket nevesíti: *„when they skip some of these levels (for example, because
they arrived to the site by clicking on an external link such as a
search-engine result), breadcrumbs orient them and help them find their way"*
(*Breadcrumbs: 11 Design Guidelines*). A WCAG 2.2 **3.2.3** (Consistent
Navigation, AA) azt kéri, hogy az ismétlődő navigációs mechanizmusok
*„occur in the same relative order each time they are repeated"*: a
kurzusoldalon van morzsa, a cikkoldalon nincs, tehát a két laptípus más
navigációs szerkezetet mutat ugyanannak a látogatónak.

**Amit a kategória-címke helyette ad.** A címke link, és a
`/blog/kategoria/kez-es-csuklo` címre visz. Ez félút: elvisz egy témalistára,
de nem mondja meg, hogy fölötte van egy Tudástár, és nem is néz ki
navigációnak, hanem tag-nek.

*Javaslat:* a cikkoldal kapja meg ugyanazt a morzsa-komponenst, amit a
kurzusoldal használ, két szinttel: `Tudástár › Kéz és csukló`. A morzsa
szövege a §3.2 #15 mintázatába illeszkedik, új felirat nem kell.

### 2.5 🟡 Az első képernyőn semmi nem mondja meg, kik vagyunk (nem találat, megjegyzés)

**Mérve.** A `<main>`-ben az első képernyőn a „Kineticare" szó **nem szerepel**.
A márkajelzés kizárólag a fejléc wordmarkjában van (`Header.tsx`, `.kc-site-header__brand`).

Ez nem hiba: az NN/g ugyanazon cikke szerint a keresőből érkező látogatók
gyakran *„didn't notice that P&G sold a product"*, és éppen ezért kell a
termék-hivatkozásnak a cikk törzsébe és a végére kerülnie, nem a fejlécbe.
A byline (gyógytornász) részben pótolja a hiányt.

*Megjegyzés a mérés korlátjáról:* a fejlécet szimuláltam, tehát azt, hogy a
mobil fejléc pontosan mit mutat 390 px-en, **nem mértem**. A `Header.tsx`
kódjából olvasva: wordmark, „Kurzusok" pirula, hamburger; az `AccountNav` csak
900 px felett látszik a sávban. Ezt élő környezetben ellenőrizni kell.

---

## 3. Második lépés: az olvasás

**Feladat:** „Elolvasom, és megértem, mi bajom lehet."

### 3.1 Amit mérve kap

| Elem | 320×800 | 390×844 | 768×1024 | 1440×900 |
|---|---|---|---|---|
| Teljes laphossz | 21 360 px | 18 139 px | 14 031 px | 15 652 px |
| Laphossz képernyőben | **26,7** | **21,5** | 13,7 | 17,4 |
| Tartalomjegyzék magassága | 735,7 px | 663,0 px | 606,2 px | 607,6 px |
| A jegyzék a nézetablak %-ában | **92,0%** | **78,6%** | 59,2% | 67,5% |
| Az első törzs-H2 helye | 1 340 px (1,68 képernyő) | 1 221 px (1,45) | 1 081 px (1,06) | 1 221 px (1,36) |
| Az első törzs-bekezdés | 1 471 px | 1 354 px | 1 191 px | 1 349 px |
| Folyószöveg sorhossza (min/medián/max) | 39/39/39 | 48/49/49 | 69/69/69 | 69/69/69 |
| Vízszintes görgetés | nincs | nincs | nincs | nincs |

### 3.2 🟢 Ami jól működik

**A folyószöveg mértéke rendben van.** 390 px-től felfelé a mért sorhossz
48–69 karakter, vagyis végig a `docs/ui-sztenderdek.md` Ü6 szabályának 45–85-ös
tűrésén belül, 768 px felett a 50–75-ös cél-sávban. 320 px-en a 39 karakter a
kijelző adottsága: 45 karakterhez 16 px-es törzsméretnél 319,8 px szövegdoboz
kellene, a 320 px-es nézetablakban 272 px áll rendelkezésre. Ez a
`docs/tudastar-ux-terv.md` 5.2 pontjában kimondott, elfogadott korlát.

**Nincs vízszintes görgetés egyik nézetablakon sem** (WCAG 2.2 **1.4.10**
Reflow). Mérve mind a négy szélességen: `scrollWidth == clientWidth`.

**A címsor-fa hézagmentes.** Mérve 1440 px-en: 1 db H1, 16 db H2, 11 db H3,
szintugrás nélkül. A kapcsolódó kártyák címe ma már H3 (`ed2de5d`), tehát a
képernyőolvasó címsor-listájában is megjelennek.

### 3.3 🟠 **S4** A tartalomjegyzék egy egész mobilképernyőt elvesz a cikk elől

**Mérve.** 320 px-en a jegyzék **735,7 px magas**, ami a 800 px-es nézetablak
**92,0%-a**. A cikk első mondata csak **1 354 px**-nél, vagyis a **1,7. képernyőn**
kezdődik. 390 px-en a jegyzék 663 px, a nézetablak 78,6%-a.

A jegyzék ma **12 tételes**: a cikk törzsének 11 szakaszcíme, plusz a „Gyakori
kérdések", ami nem a Lexical-tartalomban él, hanem a `PostArticle` teszi a lista
végére. A `shouldShowToc` küszöbe alsó korlátot ad (800 szó vagy
5 szakaszcím), felsőt nem (`src/components/content/post-article.ts`).

**Melyik szabályt sérti.** Nem WCAG-bukás. Az NN/g *In-Page Links for Content
Navigation* vizsgálata a mintát támogatja (11 résztvevőből 9 ismerte), és azt
kéri, hogy a jegyzék a lap tetején álljon, hogy az olvasó *„form a mental model
of the page"*. Ugyanez a cikk viszont figyelmeztet: mobilon kerülendő, ha a lap
emiatt túl hosszúra nyúlik. Az NN/g *Scrolling and Attention* mérése szerint a
nézési idő **57%-a** az első képernyőre esik, a másodikra már csak **17%**: a
mai elrendezésben ez az 57% majdnem teljes egészében a jegyzékre megy el.

Ez ugyanaz a megállapítás, amit a `docs/tudastar-a11y-meres.md` 3.5 pontja
ALACSONY súllyal jelzett. **A mai, 12 tételes cikkel a szám rosszabb** (ott 697
px volt 390 px-en, most 663 px 390-en és 736 px 320-on, és közben a jegyzék a
vörös zászló szakaszt is maga elé tolta), ezért emeltem a súlyt.

*Javaslat, két lépcsőben:*
1. A jegyzék mobilon (`max-width: 47.9375rem`) `details`/`summary` harmonikába
   kerül, alapból **csukva**, a `.kc-faq` meglévő nyelvén (ugyanaz a `+`/`−`
   jel, ugyanaz a 44 px-es nyitó, ugyanaz a natív elem). Asztali nézetben
   nyitva marad. Ez a repó meglévő mintája, új komponens nélkül.
2. A `shouldShowToc` kapjon FELSŐ küszöböt is, vagy a jegyzék csak a H2-k első
   N tételét hozza „…és további M szakasz" zárósorral. Ez vezetői döntés,
   mert a küszöböt a `post-article.ts` tulajdonosa írja.

### 3.4 🟡 **A1** Két linkszöveg mutat ugyanarra a cikkre a törzsön belül

**Mérve** (1440 px, a `<main>` linkjei):

| y (px) | Linkszöveg | Cél |
|---|---|---|
| 3 244 | „kéztőalagút-szindrómáról szóló összefoglalónkban" | `/blog/keztoalagut-szindroma` |
| 4 297 | „kéztőalagút-szindrómáról szóló cikkünkben" | `/blog/keztoalagut-szindroma` |

Ugyanaz a cél, két felirat, egy lapon belül. Az NN/g *Better Link Labels*
„Specific" pontja szerint a link elsődleges dolga, hogy megmondja, mi lesz a
kattintás túloldalán; ha ugyanaz a túloldal kétszer más nevet kap, az olvasó
azt hiszi, két különböző anyagról van szó.

Ez **szerkesztői**, nem fejlesztői hiba: a `docs/szerkesztoi-utmutato.md`-ba
való szabály. A WCAG 2.2 **3.2.4** betűjét nem sérti (az lapkészletre
vonatkozik), de a saját §3.2 használati szabályunkat igen: *„ugyanaz a
cselekvés mindig ugyanezzel a szóval jelenik meg."*

---

## 4. Harmadik lépés: a híd (`PostCourseCta`)

Ez a legfontosabb átmenet: itt válik az olvasóból vevő, vagy itt vész el.

### 4.1 Hol van, mérve

| Nézetablak | A panel teteje | Ez hányadik képernyő | A lap hány %-a |
|---|---|---|---|
| 320×800 | 19 764 px | **24,7** | 92,5% |
| 390×844 | 16 687 px | **19,8** | 92,0% |
| 768×1024 | 12 996 px | 12,7 | 92,6% |
| 1440×900 | 14 873 px | **16,5** | 95,0% |

A gomb („Nyisd meg a kurzusoldalt") 390 px-en **y=16 916**, azaz a **20,0.
képernyőn**.

### 4.2 🟢 Ami jól működik, és amit ezért nem szabad elmozdítani

**A helye helyes.** Az NN/g *Informational Articles Must Ask For the Order*
kimondja: a termék-hivatkozás helye *„the page's body area and at the end of
the article"*, és hogy a hivatkozás nélküli cikk *„attracts tons of
freeloaders, but no business"*. A panel pontosan a cikk után áll, és a törzs is
tartalmaz kurzus-linkeket (mérve: `/kurzusok/sos-kezrelax-villamkurzus` és
`/kurzusok/otthoni-kezrehab-program`).

**Halk, ahogy kell.** Ugyanez a forrás: *„Turn down the volume on the sales
message. If you push too hard, you lose credibility."* A panel a lap saját
tokenjeivel készül, kép nélkül, új szín nélkül, és a kurzusos ágon a gomb
**másodlagos** súlyú, tehát a lapon marad egyetlen elsődleges cselekvés.

**Nincs hamis lapvég.** Mérve mind a négy nézetablakon: a CTA-panel alja és a
kapcsolódó szekció címsora közti üres táv **56,0 px**, a
`docs/tudastar-ux-terv.md` 5.8 pontjának küszöbe 72 px alatt. Az NN/g *Related
Content Boosts Pageviews, When Done Right* szerint a nagy üres felület hamis
lapvéget jelez; itt nem jelez.

**A gomb felirata igaz.** „Nyisd meg a kurzusoldalt", és tényleg a kurzus saját
oldalára visz (`courseHref(course)`). Nem ígér vásárlást, nem ígér indulást.

### 4.3 🟠 **K1** A panel címsora a termék neve, átvezető mondat nélkül

**Mérve, a mai kódból.** A `PostCourseCta` két ága szó szerint ezt rendereli:

**Kurzus nélkül:**
```
<h2>Hogyan tovább?</h2>
<p>A cikkek a tájékozódáshoz szólnak. Ha vezetett, videós gyakorlást keresel
   otthonra, azt a kurzusainkban találod meg.</p>
<a class="kc-button kc-button--primary" href="/kurzusok">Nézd meg a kurzusokat</a>
```

**Kapcsolt kurzussal:**
```
<h2>Otthoni KézRehab Program</h2>
<p>Csukló-, ujj-, alkar- és könyökpanaszokra: 4 modulnyi videóanyag,
   50+ videós gyakorlat, 5 perces miniblokkokban.</p>
<span class="kc-badge kc-badge--neutral">79 500 Ft</span>
<a class="kc-button kc-button--secondary" href="/kurzusok/otthoni-kezrehab-program">
   Nyisd meg a kurzusoldalt</a>
```

A kurzus nélküli ágnak van **átvezető mondata**: megmondja, miért áll ott a
panel. A kurzusos ágnak nincs: a címsor a termék neve, a bekezdés a termék
marketing-leírása. A képernyőolvasó címsor-listájában így a cikk szakaszcímei
között egyszer csak megjelenik egy terméknév, minden bevezetés nélkül:

```
H2  Hogyan tovább, ha a kivizsgálás nem talált sürgős okot?
H2  Gyakori kérdések
H2  A cikket írta és ellenőrizte
H2  Otthoni KézRehab Program        ← ez a CTA-panel
H2  További cikkek a témában: Kéz és csukló
```

**Melyik szabályt sérti.** Az NN/g *Better Link Labels* „Substantial" elve
szerint az elemnek a környezete nélkül is meg kell állnia. A GOV.UK *Add links*
és a WCAG 2.2 **2.4.6** (Headings and Labels) is azt kéri, hogy a címsor írja
le a szakaszt. Egy terméknév nem írja le, hogy ez egy ajánló.

*Javaslat:* a kurzusos ág is kapja meg a „Hogyan tovább?" címsort (egy fogalom,
egy felirat), a terméknév pedig a panel törzsének első, kiemelt sora legyen.
A `shortDescription` maradhat mögötte. Így a két ág **ugyanazon a hangon**
beszél, és a címsor-lista is olvasható marad.

### 4.4 🟠 **K2** Az ár puszta szám, a döntéshez szükséges tény nélkül

**Mérve.** A panelben ez áll: `79 500 Ft`, semmi más. A **kurzusoldalon**
ugyanez a szám így: „Ár: 79 500 Ft" és közvetlenül alatta **„egyszeri díj,
további költség nincs"** (a `docs/felhasznaloi-seta.md` 11. fejezete ezt nevezi
*„a legjobb mondatnak az egész oldalon"*).

A cikk végén álló panel tehát KEVESEBBET mond, mint a kurzusoldal, pedig ez az
első hely, ahol Kovácsné árat lát. A Baymard mérése szerint a pénztár-elhagyás
első számú oka a váratlan költség (40%), és a döntéshez szükséges ténynek a
cselekvés MELLETT kell állnia.

*Javaslat:* a panel ár-címkéje mellé ugyanaz az egy mondat, ami a
kurzusoldalon már él: **„egyszeri díj, további költség nincs"**. Nem új szöveg,
nem új ígéret, csak áthelyezés. Az „Ingyenes" ágon ez a sor nem kell.

### 4.5 🟡 **K4** Az ellenjavallat nem áll a CTA mellett

**Mérve.** Az Otthoni KézRehab Program saját leírása
(`src/scripts/restore-legacy-content.ts:1811-1818`) betűhíven ezt tartalmazza:

> „Nem javasoljuk a programot, ha… már jelentkezett **érzéskiesés**, vagy régebb
> óta tart, észlelhető, jelentős **gyengülés a szorítóerőben**…"

A cikk, amelyik ezt a programot ajánlja, a **zsibbadásról és az érzéskiesésről**
szól, vagyis pontosan ahhoz az olvasóhoz beszél, akit a termék saját leírása kizár. A cikk ezt korrektül kezeli: a „Mikor NE végezd a gyakorlatokat?" szakasz
kimondja, hogy *„megszűnt érzésnél nem gyakorlat kell, hanem orvos vagy mentő"*.
**Mérve viszont ez a szakasz a lap 62,6%-ánál áll (390 px-en y=11 352), a panel
pedig a 92,0%-ánál.** Aki a végére ugrik (és sokan a végére ugranak), a
figyelmeztetést nem látja, az ajánlatot igen.

Ugyanezt a kockázatot a `docs/cikkek-tenyellenorzes.md` **B2** pontja
BLOKKOLÓKÉNT jelezte, tartalmi oldalról. Felületi oldalról a következmény ez: a
panel az egyetlen felület, ami minden cikkoldalon ugyanott van, tehát ez a
helye a rövid, ismételhető korlátozásnak.

*Javaslat:* a panel a gomb ALATT kapjon egy állandó, egy mondatos sort, a
kurzusoldal saját szavaival: **„A kurzus nem helyettesíti a szakorvosi
vizsgálatot."** Ez a mondat már ma is szerepel a termékleírásban, tehát nem új
állítás, és a panel minden ágán igaz.

### 4.6 🟡 **K3** A hibás ár-beállítás némán ár nélküli panelt ad

**Mérve.** A `coursePriceBadgeKind` három állapotot ismer
(`src/lib/courses.ts:408`): `price`, `free` és `none`. A `none` az a
konfigurációs hiba, amikor az ár-pipa BE van kapcsolva, de az ár ÜRES. Ilyenkor
a panel szándékosan néma:

```
<h2>Rosszul beállított kurzus</h2>
<p>…</p>
<a class="kc-button kc-button--secondary" href="/kurzusok/x">Nyisd meg a kurzusoldalt</a>
```

Ez helyes döntés (az „Ingyenes" felirat ott hazugság lenne), de a látogató
oldaláról pontosan az a kép áll elő, amit a `docs/felhasznaloi-seta.md` a
top-10 lista **3. helyén** mért: *„Elfelejtették kiírni. Biztos drága."*

*Javaslat:* a `none` állapotban a panel NE a termék-ágat rendelje ki, hanem a
kurzus nélküli ágat („Hogyan tovább?" + `/kurzusok`). Így soha nem áll ki
ár nélküli termékajánló. A hibát az adminban kell javítani, de addig se
mutassunk fél terméket.

---

## 5. Negyedik lépés: a kurzusoldal

**Feladat:** „Rákattintottam. Megkapom, amit a cikk ígért?"

### 5.1 Mérve: az ígéret és a beváltás

| Amit a cikkoldali panel mond | Amit a kurzusoldal ad | Ítélet |
|---|---|---|
| „Otthoni KézRehab Program" | ugyanez a `displayTitle` | 🟢 |
| „4 modulnyi videóanyag, 50+ videós gyakorlat, 5 perces miniblokkokban" | ugyanez a `shortDescription`, plusz a hosszú leírás | 🟢 |
| „79 500 Ft" | „Ár: 79 500 Ft" + „egyszeri díj, további költség nincs" | 🟢 az összeg, 🟠 a panelben hiányzó kiegészítés (K2, 4.4. pont) |
| a gomb: „Nyisd meg a kurzusoldalt" | a kurzusoldal buyboxa: „Megveszem a kurzust" | 🟢 két lépés, két felirat, mindkettő a szótárból |
| (a panel nem mond garanciát) | „30 napos kipróbálási garancia" | 🟢 a kurzusoldalon többet kap, nem kevesebbet |

**Az ár nem tör meg.** Ez fontos: a `docs/felhasznaloi-seta.md` legsúlyosabb
találata az volt, hogy az ingyenes terméken „Megveszem" állt. A cikkoldali
panel ma az ár-pipa állapotát tiszteletben tartja, és a mért három ágból kettő
igazat mond, a harmadik hallgat (K3, 4.6. pont).

### 5.2 🟠 Hangnem-váltás: a cikk „mi", a kurzusoldal „te" (külön kör, lásd 13.6)

A cikk zárása így beszél: *„Kiss Kata és Kocsis Kata vagyunk, gyógytornászok…
Azt látjuk, hogy a legtöbben nem a kitartással vannak bajban."* Ez a
`docs/vevohang-es-hirdetesszoveg.md` 5. fejezetének mért követelménye
(nevesített szakember, kedvesség, 92 említés).

A kurzusoldal ehhez képest terméknyelvet beszél: modulok, gyakorlatszám,
ár, garancia. Ez nem hiba, hanem műfaj, de a **címe** terméknév-alapú
(„Otthoni KézRehab Program"), miközben a `docs/vevohang-es-hirdetesszoveg.md`
6. fejezete mérve azt írja: *„a mért vevőhang alapján a címnek a PANASZT kell
megszólítania, a terméknév maradhat alcímnek."*

Ez nem az én körömbe tartozó változás (a kurzusoldal más fájl), de a séta
szempontjából ez az a pont, ahol a látogató a „kezelést kereső" fejéből
(209 említés a 312 véleményben) átkerül a „terméket vásárló" fejébe.

*Javaslat a vezetőnek:* ezt külön, kutatás-alapú körben kell megcsinálni,
ahogy a vevőhang-dokumentum 6. fejezete is kéri. Ide csak azért írom, mert a
séta itt méri be a törést.

### 5.3 🟢 Ami a kurzusoldalon jól fogadja

Van látható morzsamenü („Kurzusok"), van négy ugrógomb, van „Kinek NEM való?"
lista, van ár a gomb mellett, és van 30 napos garancia. Ezek mind ott vannak,
és a séta szempontjából mind jó.

---

## 6. Ötödik lépés: a visszaút és az oldalsó utak

**Feladat:** „Ez nem az én bajom. Van itt más is?"

### 6.1 A cikkoldal kimenetei, mérve

A `<main>` **24 linkje** 1440 px-en, célok szerint:

| Cél | Darab | Hol |
|---|---|---|
| lapon belüli horgony (jegyzék) | 12 | tartalomjegyzék |
| másik cikk (`/blog/<slug>`) | 4 a törzsben + 3 a kapcsolódó blokkban | törzs, kapcsolódó |
| kategória-oldal (`/blog/kategoria/…`) | 1 | fejléc-címke |
| kurzus (`/kurzusok/…`) | 2 a törzsben + 1 a panelben | törzs, CTA |
| `/rolunk` | 1 | szerző-blokk |
| **`/blog` gyűjtőoldal** | **0** | sehol |
| külső forrás (`https://`) | **0** | (a források a törzsben szöveges hivatkozások) |

**Zsákutca nincs**: minden mért oldalról van értelmes továbblépés. A skill 5.
pontja teljesül. **Visszaút a Tudástár gyűjtőoldalára viszont a `<main>`-ből
nincs**, csak a fejléc-menün át (S3, 2.4. pont).

### 6.2 🔴 **S1** A `/blog` lista MINDEN szélességen egyhasábos, holott kéthasábosnak kellene lennie

Ez a séta legkonkrétabb, legjobban reprodukálható kód-találata.

**A terv mit ígért.** A `docs/tudastar-ux-terv.md` 2.2 pontja és a
`styles/blocks/tudastar-lista.css` fejkommentje egyaránt kimondja: a szabály
904 px-től **két hasábot** ad, és a kivonat sorhossza 48,1–60,6 karakter lesz.
A `blog/page.tsx` fejléc-kommentje ugyanezt ismétli.

**Amit mértem** (Chromium, a repó valódi CSS-ével, 6 kártyával):

| Nézetablak | Rács belső szélessége | `grid-template-columns` | Hasáb | Kivonat medián | Laphossz |
|---|---|---|---|---|---|
| 592 px | 544 px | `544px` | **1** | 67 kar. | 1 968 px |
| 640 px | 592 px | `544px` | **1** | 67 kar. | 1 974 px |
| 904 px | 856 px | `544px` | **1** | 66 kar. | 2 086 px |
| 1024 px | 976 px | `544px` | **1** | 59 kar. | 2 101 px |
| 1440 px | 1 072 px | `544px` | **1** | 59 kar. | 2 165 px |
| 1920 px | 1 072 px | `544px` | **1** | 59 kar. | 2 165 px |
| 2560 px | 1 072 px | `544px` | **1** | 59 kar. | 2 165 px |

**Miért.** A szabály:

```css
.kc-card-grid.kc-card-grid--posts {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 26rem), 34rem));
}
```

Az `auto-fit` ismétlésszámát a böngésző **nem** a track minimumával (26rem =
416 px) számolja, hanem a **maximumával**, ha az határozott. A CSS Grid Level 1
szó szerint: *„each track is treated as its max track sizing function if that
is definite or else its min track sizing function if that is definite"*
(§7.2.3.1, auto-repeat). Az MDN ugyanezt mondja: *„Treating each track as its
maximal track sizing function… if that is definite."*

Itt a maximum **34rem = 544 px**, ami határozott. Tehát:

```
ismétlés = floor((1072 + 24) / (544 + 24)) = floor(1096 / 568) = floor(1,93) = 1
```

Két hasábhoz `2 × 544 + 24 = 1112 px` tartalom-szélesség kellene, a
`--kc-container-wide` (1120 px) mínusz a két oldali 24 px-es gutter viszont
**1072 px**-et ad. **40 px hiányzik.** A terv számítása a track MINIMUMÁVAL
számolt, ezért jött ki a kéthasábos eredmény papíron.

**Mit veszítünk vele.** A sorhossz véletlenül jó lett (59–67 karakter, a
tűrésen és a cél-sávon belül is), tehát olvashatósági bukás NINCS. A veszteség
a **görgetési mélység**: 6 cikknél 1440 px-en 2 165 px helyett 1 329 px lenne a
lap. Húsz cikknél a különbség ötszörös. Az NN/g *Mobile Navigation: Image Grids
or Text Lists?* pontosan ezt méri: a több görgetést kérő elrendezésnél a
felhasználó idő előtt megáll, *„people often stop once they see an item that
looks close enough to what they want."*

**Két javítás, mindkettőt lemértem.**

| Változat | 904 px | 1024 px | 1440 px | Laphossz 1440-en | Kivonat 1440-en |
|---|---|---|---|---|---|
| MAI: `minmax(min(100%, 26rem), 34rem)` | 1 hasáb | 1 | 1 | 2 165 px | 56/59/59 |
| **A: `minmax(min(100%, 26rem), 1fr)`** | **2 hasáb** | **2** | **2** | **1 329 px** | 56/59/59 |
| B: `minmax(min(100%, 26rem), 32.75rem)` | 1 hasáb | 1 | **2** | 1 329 px | 56/59/59 |

**Az A változat az, amit a terv leírt.** A `1fr` maximum nem határozott, ezért
az ismétlésszám a minimummal (416 px) számol:
`floor((1072 + 24) / (416 + 24)) = 2`, és a két track utána 524 px-re nő.
Mérve 904 px-en a kivonat 42/47/47 karakter (a legalsó sor 42, tehát a 45-ös
tűrés alatt egy hajszállal; a medián 47 belül van), 1024-től felfelé 51–59.
Vízszintes görgetés egyik szélességen sem keletkezik.

A B változat (a felső korlát 32,75rem-re csökkentése) csak 1440 px-től ad két
hasábot, tehát a 904–1279 px-es tartományban nem oldja meg a problémát.

**Az őr-teszt a hibás állapotot védi.** Két helyen is, mérve a
`src/__tests__/tudastar-cikkoldal.test.tsx`-ben:

- a **596. sor** betűhíven a mai szabályt várja:
  `expect(szabaly).toContain('repeat(auto-fit, minmax(min(100%, 26rem), 34rem))')`;
- a **719-738. sor** („1440 px: a poszt-rács geometriája KIZÁRJA a harmadik
  hasábot") a hasábszámot az **alsó** trackkel számolja:
  `expect(2 * alsoTrack + rescek).toBeLessThanOrEqual(konteneri)`, vagyis
  pontosan azt a modellt használja, amit a böngésző NEM. A teszt ezért zöld,
  miközben a lap egyhasábos.

Ez pontosan az az eset, amit a `src/__tests__/helpers/css-geometria.ts`
fejkommentje maga is elismer: *„NINCS rács- és flex-sáv méretezés… Ahol ez
számít, azt a hívó teszt böngészős méréssel nevesíti."* A böngészős mérés itt
elmaradt.

*Javaslat:* az A változat a `styles/blocks/tudastar-lista.css`-ben, a
fejkomment számainak kijavításával; a 596. sor várt sztringjének frissítése; és
a 719. sor tesztje vagy a **max** trackkel számoljon, vagy váltson valódi
böngészős mérésre.

### 6.3 🟠 **S2** A kapcsolódó blokk kimaradt a kártya-javításból

**Mérve** (a mai kódon, 1440 px):

| Felület | Rács | `PostCard` változat | Kivonat sorhossza |
|---|---|---|---|
| kezdőlapi Tudástár-szekció | `kc-card-grid` (3 hasáb) | **`compact`** (nincs kivonat) | nem alkalmazható |
| `/blog` lista | `kc-card-grid--posts` (1 hasáb, lásd S1, 6.2. pont) | `list` | 56/59/59 |
| `/blog/kategoria/<slug>` | `kc-card-grid--posts` | `list` | 56/59/59 |
| **cikkoldal, kapcsolódó blokk** | **`kc-card-grid` (3 hasáb)** | **`list`** | **27/31/33** |

A `ed2de5d` commit a kezdőlapi szekciót és a két listaoldalt átállította, a
`PostArticle.tsx:206-209` viszont változatlan maradt:

```
<div className="kc-card-grid">
  {related.map((relatedPost) => (
    <PostCard key={relatedPost.id} post={relatedPost} />
  ))}
</div>
```

Mérve mind a négy nézetablakon: 320-on 23/29/31, 390-en 27/33/40, 768-on
27/36/37, 1440-en **27/31/33** karakter/sor. Ez a `docs/ui-sztenderdek.md` Ü6
szabályának 45-ös alsó tűréshatára alatt van mindenhol, és pontosan az a hiba,
amit a `docs/tudastar-a11y-meres.md` 3.1 pontja SÚLYOSKÉNT jelzett, és amit a
commit üzenete szerint a `compact` változat orvosolni hivatott.

*Javaslat:* egy sor: `<PostCard key={…} post={relatedPost} variant="compact" />`
a `PostArticle.tsx`-ben. A commit üzenete szó szerint ezt írja („ezt használja
a kezdőlapi szekció **és a kapcsolódó blokk**"), tehát ez a javítás
elmaradása, nem új döntés.

### 6.4 🟢 Amit ellenőriztem és NEM hiba (hamis riasztás)

**A kártya teljes felülete kattintható.** A puszta doboz-mérés félrevezet: a
cím-link SAJÁT doboza 205×44 px a kapcsolódó kártyán és 210×22 px a listán,
miközben a kártya 341×346, illetve 544×265 px. `document.elementFromPoint`
a kártya közepén, bal felső sarkában, jobb alsó sarkában és az alsó harmadában
is a `kc-post-card__link` elemet adja vissza, tehát a
`knowledge.css` `.kc-post-card .kc-post-card__link::after { position: absolute;
inset: 0 }` overlay-e működik, mindkét felületen. **Nem szabad „kicsi érintőcél"-ként jelenteni.**

**A kapcsolódó kártya-linkek hozzáférhető neve rendben.** Mérve a három
kártyán: **42, 42 és 28 karakter**, mind a terv 80-as felső határa alatt. A
korábbi 206–227 karakteres állapot javítva.

### 6.5 🟡 **A3** Nincs kereső a Tudástárban

**Mérve.** A `src/components/` alatt egyetlen vevői keresőmező sincs; a
Tudástárban a témák közti eligazodás eszközei: a fejléc-menü „Tudástár" pontja,
a `CategoryFilter` csip-sora, a kapcsolódó blokk és a cikken belüli
tartalomjegyzék.

**A WCAG 2.2 2.4.5** (Multiple Ways, AA) ezzel **teljesül**: a
sikerkritérium legalább két mechanizmust kér a felsoroltak közül
(navigációs linkek, oldaltérkép, tartalomjegyzék, kereső, linklista,
kezdőlap), és nálunk három is van.

Ez tehát nem szabálysértés, hanem növekedési korlát. A
`docs/monid-masodik-kor.md` 3. fejezete méri, hogy a forgalmat *„a sok cikk
hosszú farka adja, nem egy sláger"*, és hogy egy cikk átlagosan ötven
kulcsszót visz. Húsz-harminc cikknél a csip-sor már nem elég.

*Javaslat:* ne most. Amikor a cikkek száma eléri a tizet, mérni kell, és a
`getPosts` lapozási korlátja (`limit: 60`) is akkor válik élessé.

### 6.6 🟢 A szűrő és az üres állapot rendben, egy fenntartással

**Mérve** a csip-sor 3 kategóriával, 6 cikkel:

| Nézetablak | „Összes" | „Kéz és csukló" | „Könyök" | „Váll" |
|---|---|---|---|---|
| 320 px | 85,0×44,7 | 129,8×44,7 | 86,7×44,7 | 62,1×44,7 |
| 1440 px | 91,4×48,0 | 141,8×48,0 | 93,3×48,0 | 65,6×48,0 |

Mind a 44 px-es repó-küszöb fölött, tehát a WCAG 2.2 **2.5.8** (24 px) és a
szigorúbb 2.5.5 (AAA, 44 px) is teljesül.

Az üres állapot (`PostsEmptyState`) mérve három linket ad
(„Nézd meg a kurzusokat" 246,7×53,2, „Elindítom ingyen" 192,4×53,2, plusz az
„Írj nekünk" szöveglink), címsora állítás, nem panasz („Hamarosan érkeznek az
első cikkek"). Ez pontosan az IBM Carbon *Empty states* anatómiája (cím + törzs
+ elsődleges cselekvés) és az NN/g *Designing Empty States* három feladata.

**A fenntartás:** a szűrt, üres kategória-nézet visszaútja a „Vissza a
Tudástárba" gomb, ami a `/blog` listára visz. Ez helyes. Ugyanez a felirat a
cikkoldalról viszont **nem érhető el** (2.4), tehát a Tudástár gyűjtőoldalára
csak az üres állapotból és a fejlécből van út.

---

## 7. Hatodik lépés: a riasztó eset

**A látogató:** ugyanaz a Kovácsné, de most fél. `bal kéz zsibbadás hányinger`
kifejezésre keresett, mert azt hallotta, hogy a bal karba sugárzó tünet szívvel
függhet össze. Nem kurzust keres. Azt akarja tudni, hogy most mentőt kell-e hívnia.

Ez a mért kereslet: a `docs/monid-masodik-kor.md` 6. fejezete a Google
autocomplete-jéből olvasta ki ezt az alakot, és külön kiemeli:
*„Riasztó tünet-párosítás, ez BIZTONSÁGI kérdés… A zsibbadás-cikkben a
112-szintű figyelmeztetésnek elöl kell állnia, nem a cikk végén."*

Az NHS a szívinfarktus tünetei közé sorolja a karba sugárzó fájdalmat és a
rosszullétet is: *„chest pain… the pain may also spread to your arm, neck and
jaw"* és *„feeling sick (nausea) or being sick (vomiting)"*, és ezekre 999-et
(nálunk 112-t) kér.

### 7.1 A tartalom oldala: ez ma már jó, és ezt fenn kell tartani

**Mérve, a mai cikkszövegen.** Az 1. cikk első törzs-szakasza ma ez:

> **## Előbb ezt: mikor kell azonnal mentőt hívni?**
> Van néhány jel, aminél nem cikket kell olvasni, hanem a 112-t hívni. Ezért áll
> ez a szakasz elöl, és nem a végén.

és tartalmazza a „Ha megijedtél" bekezdést is, amely a **mellkasi panaszt és a
rosszullétet** nevesíti. Az első „112" a törzs **4,1%-ánál** áll.

Ez a séta közben, egy párhuzamos ügynök munkájaként került be. **Jó, és
megtartandó.**

### 7.2 🔴 **B1** BLOKKOLÓ: a vészhelyzeti szöveg vizuálisan semmiben nem különbözik a többitől

**Mérve.** Összehasonlítottam a „Stroke jelei." kezdetű bekezdés és egy
tetszőleges törzs-bekezdés számított stílusát, mind a négy nézetablakon:

| Tulajdonság | „Stroke jelei." bekezdés | Sima törzs-bekezdés |
|---|---|---|
| `background-color` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |
| `color` | `rgb(16, 36, 62)` | `rgb(16, 36, 62)` |
| `border-left-width` | `0px` | `0px` |
| `font-weight` | `400` | `400` |
| `font-size` @390 / @1440 | `16,06px` / `18px` | `16,06px` / `18px` |

**Bitre azonos.** A mentőhívást kérő mondat pontosan úgy néz ki, mint a
„Tényleg a sok gépeléstől van?" szakasz bármelyik mondata. Az egyetlen
megkülönböztető jel a szakaszcím és a bekezdéskezdő félkövér szó
(„**Stroke jelei.**"), ami a scannelő olvasónak kevés.

**És nincs is eszköz, amivel megkülönböztethető lenne.** Mérve a kódból:

1. `src/collections/Posts.ts:65` a `content` mezőt sima `richText`-ként
   definiálja, blokk-jellemző nélkül: a szerkesztő nem tud „vészhelyzet"
   típusú blokkot beszúrni.
2. A `serialize.tsx` az idézetet `<blockquote>`-ként rendereli, a `content.css`
   pedig **szándékosan** megfosztotta a figyelmeztetés-nyelvtől. Szó szerint,
   `content.css:739`: *„Az idézetet HÁTTÉR és belső térköz emeli ki, dekoratív
   BAL SZEGÉLY nélkül (2026-08-16, tulajdonosi visszajelzés): a bal vonal a lap
   egyetlen ilyen eleme volt, és a »figyelmeztetés«-kallout nyelvét idézte."*
   Tehát a legközelebbi meglévő elem tudatosan NEM vészjelzés.
3. A `styles/blocks/post-view.css`-ben nincs egyetlen `warning`, `alert`,
   `callout` vagy `figyelmeztetés` szelektor sem (`grep`, 0 találat).

**Melyik szabályt sérti.** Nem WCAG-bukás: a szöveg olvasható, a kontraszt
14,79:1. Amit sért, az a saját feladatunk: az információnak el kell jutnia egy
ijedt emberhez, aki nem olvas, hanem pásztáz.

Az **NHS digital service manual** erre épített külön komponenst (*Care cards*):
három típus, a legsúlyosabb piros-sötétszürke, a fejléce szó szerint
*„Call 999 or go to A&E now if:"*. A tesztelés eredménye a dokumentációban:
*„users scanning the page stopped to read the care cards and understood what
action to take"*, és ezt kifejezetten **hosszú tartalmi oldalakon** mérték,
egyetlen cselekvéssel. Ugyanez a forrás figyelmeztet: *„people with visual
disabilities may not be able to recognise care cards by their colour"*, ezért
a szöveges címsor kötelező, nem a szín hordozza az üzenetet (ez WCAG 2.2
**1.4.1** Use of Color is).

A **GOV.UK Design System** ugyanezt kisebben oldja meg (*Warning text*):
felkiáltójel-ikon, félkövér szöveg, és rejtett „Warning" szó a
képernyőolvasóknak, azzal a megjegyzéssel, hogy *„You might need to rewrite the
hidden text… to make it appropriate for your context."*

*Javaslat (a legkisebb beavatkozás sorrendjében):*

1. **Külön mező, nem szerkesztői szabadság.** A `Posts` kapjon egy
   `redFlags` (magyarul: „Vörös zászlók") mezőt: cím + felsorolás. A
   `PostArticle` ezt a **tartalomjegyzék FÖLÖTT**, a lead alatt rendelje ki,
   egy dedikált `kc-red-flag` panelben. Így a szerkesztő nem tudja
   elfelejteni, nem tudja rossz helyre tenni, és a strukturált adatba is
   bevihető.
2. **A panel nyelve: új szín NEM kell.** A `tokens.css` már ma tartalmazza a
   `--kc-color-danger` (#b3261e) és a `--kc-color-danger-surface` (#fdecea)
   tokent. Kiszámoltam a szükséges arányokat (WCAG relatív luminancia):

   | Pár | Arány | Küszöb | Ítélet |
   |---|---|---|---|
   | `danger` szöveg a `danger-surface`-en | **5,72:1** | 4,5 (1.4.3) | teljesül |
   | `ink` szöveg a `danger-surface`-en (a felsorolás törzse) | **13,66:1** | 4,5 | teljesül |
   | `danger` keret a `danger-surface`-en (nem-szöveg) | **5,72:1** | 3,0 (1.4.11) | teljesül |
   | `danger-surface` felület a `paper` laphátérhez | **1,08:1** | 3,0 | **nem elég önmagában** |

   Az utolsó sor a lényeg: a halvány piros felület a világos laphátéren
   **önmagában nem azonosítja a panelt**, tehát kell hozzá látható keret
   (`--kc-color-danger`, 5,72:1) ÉS szöveges címke. Ez WCAG 2.2 **1.4.1**
   (Use of Color): az információt nem hordozhatja egyedül a szín.
3. **A címke szövege:** „Mikor hívj azonnal mentőt" (a levezetés a 10.1
   pontban).
4. **Ami TILOS:** a `blockquote` erre a célra való visszaalakítása. A
   tulajdonos 2026-08-16-i döntése ezt kizárja, és a döntés indoka pont az
   volt, hogy az idézet ne beszéljen figyelmeztetés-nyelven.

**Ez a séta két BLOKKOLÓ találatának az első fele; a párja a 7.3 pont.**

### 7.3 🔴 **B2** BLOKKOLÓ: a vörös zászló szakasz csak hat cikkből kettőben áll elöl

**Mérve.** Minden cikk törzsében (a H1-től a „Források" H2-ig) megkerestem az
első „112" előfordulást, és kiszámoltam, a törzs hány százalékánál áll:

| Cikk | Törzs (sor) | Első „112" | A törzs %-ánál |
|---|---|---|---|
| `1-miert-zsibbad-a-kezem.md` | 386 | 16. sor | **4,1%** 🟢 |
| `4-pattano-ujj.md` | 246 | 18. sor | **7,3%** 🟢 |
| `5-csuklo-es-kezfajdalom.md` | 393 | 177. sor | **45,0%** 🔴 |
| `3-teniszkonyok.md` | 572 | 278. sor | **48,6%** 🔴 |
| `2-keztoalagut-szindroma.md` | 302 | 200. sor | **66,2%** 🔴 |
| `6-csuklotores-utani-gyogytorna.md` | 277 | 195. sor | **70,4%** 🔴 |

Az 1. és a 4. cikk kapott „Előbb ezt: mikor kell azonnal mentőt hívni?" nevű
első szakaszt; a másik négy nem.

**Miért baj a séta szempontjából.** A látogató nem választ cikket: a Google
választ helyette. Aki `csukló fájdalom` vagy `csuklótörés után` kifejezésre
keres, ugyanolyan joggal lehet ijedt, mint aki `kéz zsibbadás`-ra. Az NHS a
csuklófájdalomnál is sorol 999-es jeleket (a `docs/cikkek/1…` maga idézi:
*„Erős csuklófájdalom ájulásérzéssel, hányingerrel, lázzal vagy
hidegrázással"*). Az, hogy a látogató időben kapja-e meg a figyelmeztetést,
ma **attól függ, melyik URL-re esett**.

A `docs/orvosi-forrasbazis.md` 1. szakasza egyébként ki is mondja:
*„Vörös zászlók: ez minden cikkbe kötelezően bekerül."*

*Javaslat:* a 7.2. pontban javasolt `redFlags` mező ezt **szerkezetileg** oldja meg:
ha a mező kötelező (`required: true`), a cikk enélkül nem publikálható, és a
felület mindig ugyanoda teszi. Addig is: a 2., 3., 5. és 6. cikk kapja meg az
1. és a 4. cikk „Előbb ezt…" mintáját.

### 7.4 🟠 **B1 és S4 együtt** A vörös zászló szakasz a jegyzék alatt, a hajtás alatt kezdődik

**Mérve** a mai cikkszövegen:

| Nézetablak | Jegyzék magassága | A jegyzék 1. tétele | Az „Előbb ezt…" H2 | A „Stroke jelei." bekezdés | A „Ha megijedtél." bekezdés |
|---|---|---|---|---|---|
| 320×800 | 735,7 px (92,0%) | y=624 **hajtás fölött** | y=1 340 (**1,68** képernyő) | y=1 567 (1,96) | y=2 219 (2,77) |
| 390×844 | 663,0 px (78,6%) | y=578 **hajtás fölött** | y=1 221 (**1,45**) | y=1 450 (1,72) | y=2 001 (2,37) |
| 768×1024 | 606,2 px (59,2%) | y=496 **hajtás fölött** | y=1 081 (**1,06**) | y=1 263 (1,23) | y=1 692 (1,65) |
| 1440×900 | 607,6 px (67,5%) | y=636 **hajtás fölött** | y=1 221 (**1,36**) | y=1 425 (1,58) | y=1 879 (2,09) |

**A jó hír:** a jegyzék első tétele („Előbb ezt: mikor kell azonnal mentőt
hívni?") mind a négy nézetablakon a hajtás fölött van, tehát a riadt látogató
EGY kattintással odaugorhat. A `AnchorScroll` a `scroll-padding-top: 80px`
mellett a ragadós fejléc alá görget, és a fókuszt a cél címsorra teszi.

**A rossz hír:** aki nem a jegyzéket használja, hanem görget (és a legtöbben
görgetnek), annak **egy egész képernyőnyi tartalomjegyzéket** kell átgörgetnie,
mire a mentőhívásról szóló mondathoz ér. A „Ha megijedtél" bekezdés, ami a
mellkasi panaszt nevesíti, **2,1–2,8 képernyőre** van a laptetőtől.

Az NN/g *Scrolling and Attention* mérése szerint a nézési idő 57%-a az első
képernyőre esik, a másodikra 17%. A mai elrendezésben a vészhelyzeti tartalom
a 17%-os sávban kezdődik.

*Javaslat:* a 7.2. pontban javasolt `redFlags` panel a **jegyzék FÖLÉ** kerüljön, a
lead alá. Mérve ez 390 px-en a mai 1 221 px-ről kb. 560 px-re hozná a
vészhelyzeti tartalmat, vagyis a hajtás fölé. A jegyzék így is a lap tetején
marad, ahogy az NN/g kéri.

### 7.5 🟢 Amit itt jól csinálunk

**A cikk nem próbál eladni a figyelmeztetés előtt.** Mérve, 390 px-en:

| Elem | y (px) | Képernyő |
|---|---|---|
| első „112" említés | 578 (a jegyzék 1. tétele) | 0,68 |
| első vészhelyzeti bekezdés | 1 354 | 1,60 |
| **első kurzus-link a törzsben** (`/kurzusok/sos-kezrelax-villamkurzus`) | 10 573 | 12,5 |
| második kurzus-link (`/kurzusok/otthoni-kezrehab-program`) | 15 235 | 18,1 |
| **kurzus-CTA panel** | 16 687 | 19,8 |

**A vészhelyzeti tartalom 10,9 képernyővel előzi meg az első értékesítési
elemet.** Ez etikailag helyes sorrend, és nem szabad megbolygatni. Ha valaki
később „feljebb hozná a CTA-t", ez a szám a mérce.

---

## 8. Hetedik lépés: mobil, 320 px

### 8.1 Amit jól csinál, mérve

| Ellenőrzés | Küszöb | Mért érték (320×800) | Ítélet |
|---|---|---|---|
| Vízszintes görgetés | nincs | `scrollWidth` = `clientWidth` = 320 | 🟢 |
| Jegyzék-linkek magassága | ≥ 24, cél 44 | 53,4 px | 🟢 |
| GYIK-nyitó magassága | ≥ 24, cél 44 | 51,2 px | 🟢 |
| CTA-gomb | ≥ 24, cél 44 | 222×72,8 px | 🟢 |
| Kategória-csipek a listán | ≥ 24, cél 44 | 44,7 px | 🟢 |
| Törzsszöveg mérete | olvasható | 16,00 px | 🟢 |
| Betűméretek száma a lapon | pontosan 3 | 3 (32,00 / 16,00 / 13,00) | 🟢 |

### 8.2 🟠 A lap 26,7 képernyő hosszú (az S2 és az S4 következménye)

**Mérve:** a cikkoldal 320 px-en **21 360 px**, ami a 800 px-es nézetablakkal
**26,7 képernyő**. 390 px-en 18 139 px = 21,5 képernyő.

Ez nem önmagában hiba (a cikk hosszú, és a hossz szakmailag indokolt), de
együtt jár azzal, hogy a CTA a lap 92,5%-ánál, a **24,7. képernyőn** áll.
Aki nem olvassa végig, azt a cikk-vég soha nem éri el.

*Javaslat:* nem a CTA feljebb hozása (7.5). Ehelyett a jegyzék összecsukása
(S4) és a kapcsolódó blokk `compact` változata (S2) rövidít, mindkettő
mérhetően.

### 8.3 🟡 **K5** A kategória-címke érintőcélja a repó saját küszöbe alatt

**Mérve:** a cikkfejléc kategória-címkéje (`.kc-post-hero__categories a`):

| Nézetablak | Doboz |
|---|---|
| 320 px | 104,5 × **28,8** px |
| 390 px | 104,6 × **28,8** px |
| 768 px | 107,5 × **29,6** px |
| 1440 px | 110,7 × **32,4** px |

A WCAG 2.2 **2.5.8** (AA, 24×24) teljesül. A `docs/ui-sztenderdek.md` 6.
fejezetének 44×44-es szabálya nem. Ez ugyanaz, amit a
`docs/tudastar-a11y-meres.md` 3.3 pontja KÖZEPESKÉNT jelzett, és **még nincs
javítva**; a séta szempontjából azért számít, mert ez az egyetlen elem a
cikkoldalon, ami a témalistára visszavisz.

*Javaslat:* változatlanul az a11y-mérés 3.3 pontjának javaslata, a
`post-view.css`-ben, három sorban.

### 8.4 🟡 **A2** A CTA-panel szövege 320 px-en 19–31 karakter/sor

**Mérve:** a `.kc-post-cta__text` sorhossza (min/medián/max):

| Nézetablak | Sorhossz | Sorok |
|---|---|---|
| 320 px | **19/24/31** | 5 |
| 390 px | **22/31/36** | 4 |
| 768 px | 65/65/65 | 2 |
| 1440 px | 53/53/53 | 2 |

390 px alatt a 45-ös alsó tűrés nem érhető el (a 3.2. pontban leírt fizikai korlát),
de a panel belső padding-ja (`--kc-space-5`, 24 px oldalanként) tovább szűkíti
a dobozt a folyószöveghez képest. 320 px-en a folyószöveg 39 karakter, a panelé
24: **a különbség 15 karakter, a panel belső térköze miatt.**

*Javaslat:* a `.kc-post-cta__panel` mobilon kapjon kisebb vízszintes belső
térközt (`--kc-space-4`, 16 px). Nem új token, meglévő érték.

---

## 9. Súlyozott találati lista

A sorrend a kár és a ráfordítás hányadosa, ahogy a `docs/felhasznaloi-seta.md`
14. fejezete is csinálta.

### BLOKKOLÓ (2)

| # | Találat | Fájl | Javaslat |
|---|---|---|---|
| **B1** | A vészhelyzeti szöveg számított stílusa **bitre azonos** a törzsszövegével (háttér, szín, vastagság, méret), és nincs eszköz, amivel a szerkesztő megkülönböztethetné: a `content` sima `richText`, a `blockquote`-ot pedig tudatosan megfosztottuk a figyelmeztetés-nyelvtől. | `src/collections/Posts.ts:65` (mező), `src/components/content/PostArticle.tsx` (renderelés), `src/app/(frontend)/styles/blocks/post-view.css` (nyelv) | Külön `redFlags` mező + dedikált panel a jegyzék FÖLÖTT, szöveges címkével (nem csak színnel). Az NHS *care cards* mintája. **Új szín nem kell:** a `--kc-color-danger` / `--kc-color-danger-surface` már létezik, a szöveg-kontraszt rajta mérve 5,72:1 és 13,66:1. A `blockquote` erre nem használható (tulajdonosi döntés, `content.css:739`). |
| **B2** | A vörös zászló szakasz hat cikkből csak kettőben áll elöl (4,1% és 7,3%); a másik négyben a törzs **45,0–70,4%-ánál**. Hogy a látogató időben kapja-e a figyelmeztetést, ma attól függ, melyik URL-re esett. | `docs/cikkek/2,3,5,6-*.md` | Rövid távon: az 1. és 4. cikk „Előbb ezt…" mintájának átvétele. Tartósan: a B1 `redFlags` mezeje **kötelező**, enélkül a cikk nem publikálható. |

### SÚLYOS (4)

| # | Találat | Fájl | Javaslat |
|---|---|---|---|
| **S1** | A `/blog` rácsa **minden** szélességen (592–2560 px) egyhasábos, holott a terv és a kód kommentje kéthasábost állít. Ok: az `auto-fit` ismétlésszáma a **max** track-mérettel (544 px) számol, és `2×544+24 = 1112 > 1072`. Következmény: 6 cikknél 1440 px-en 2 165 px helyett 1 329 px lehetne a lap. | `src/app/(frontend)/styles/blocks/tudastar-lista.css:44` | `minmax(min(100%, 26rem), **1fr**)`. Mérve 904 px-től két hasábot ad, a sorhossz 42–59 karakter, vízszintes görgetés nincs. A fejkommentet és **két őr-tesztet** is javítani kell (`tudastar-cikkoldal.test.tsx` 596. és 719-738. sor): ma mindkettő a hibás állapotot védi. |
| **S2** | A cikkoldal kapcsolódó blokkja kimaradt a `ed2de5d` kártya-javításból: közös hármas rács + `list` változat, ezért a kivonat **23–40 karakter/sor** minden nézetablakon (1440-en 27/31/33), a 45-ös alsó tűrés alatt. A kezdőlapi szekció már `compact`. | `src/components/content/PostArticle.tsx:206-209` | `variant="compact"` a `PostCard`-nak. Egy sor; a commit üzenete maga is ezt írja elő. |
| **S3** | A cikkoldalon **nincs látható morzsamenü**, és a `<main>` **24 linkjéből 0** mutat a `/blog` gyűjtőoldalra. A kurzusoldalnak viszont van morzsamenüje: ugyanaz a látogató két laptípuson két navigációs szerkezetet kap. | `src/components/content/PostArticle.tsx` (hero-szakasz) | A kurzusoldal `kc-course-breadcrumb` mintája, két szinttel: `Tudástár › Kéz és csukló`. Új felirat nem kell (§3.2 #15 mintázat). |
| **S4** | A tartalomjegyzék 320 px-en **735,7 px**, a nézetablak **92,0%-a**; emiatt a cikk első törzs-H2-je (ma: a vörös zászló szakasz) **1,06–1,68 képernyőre** csúszik. | `src/components/content/PostToc.tsx`, `post-view.css`, a küszöb: `post-article.ts` `shouldShowToc` | Mobilon `details`/`summary` harmonika, alapból csukva, a `.kc-faq` meglévő nyelvén. Plusz felső küszöb a jegyzék tételszámára. |

### KÖZEPES (5)

| # | Találat | Fájl | Javaslat |
|---|---|---|---|
| **K1** | A CTA-panel kurzusos ágán a címsor a **termék neve**, átvezető mondat nélkül; a kurzus nélküli ágon „Hogyan tovább?" + magyarázat. Egy komponens, két hang. A címsor-listában így egy terméknév ül a cikk szakaszcímei közt. | `src/components/content/PostCourseCta.tsx` | Mindkét ág címsora „Hogyan tovább?"; a terméknév a panel törzsének első, kiemelt sora. |
| **K2** | A panelben az ár puszta szám (`79 500 Ft`); a kurzusoldalon ugyanez „egyszeri díj, további költség nincs" kiegészítéssel áll. A döntéshez szükséges tény nem teljes a cselekvés mellett. | `src/components/content/PostCourseCta.tsx` | A meglévő mondat átemelése az ár-címke mellé. Nem új szöveg. |
| **K3** | A `none` ár-állapotban (ár-pipa BE, ár ÜRES) a panel **ár nélküli termékajánlót** mutat. Ez a `docs/felhasznaloi-seta.md` top-10 listájának 3. bizalmi hibája. | `src/components/content/PostCourseCta.tsx` | `none` esetén a kurzus nélküli ág renderelése (`Hogyan tovább?` + `/kurzusok`). Fél terméket ne mutassunk. |
| **K4** | Az ellenjavallat nem áll a CTA mellett: a termék saját leírása kizárja azt, akinél már jelentkezett érzéskiesés; a cikk ezt a lap **62,6%-ánál** mondja ki, a panel a **92,0%-ánál** van, és nem ismétli. | `src/components/content/PostCourseCta.tsx` | Egy állandó sor a gomb alá, a termékleírás saját szavaival: „A kurzus nem helyettesíti a szakorvosi vizsgálatot." |
| **K5** | A kategória-címke érintőcélja **28,8–32,4 px**, a repó 44 px-es szabálya alatt. Ez a cikkoldal egyetlen témalistára visszavivő eleme. | `src/app/(frontend)/styles/blocks/post-view.css` | `docs/tudastar-a11y-meres.md` 3.3 javaslata, változatlanul. |

### ALACSONY (3)

| # | Találat | Fájl | Javaslat |
|---|---|---|---|
| **A1** | Két linkszöveg mutat ugyanarra a cikkre a törzsön belül („…összefoglalónkban" y=3 244 és „…cikkünkben" y=4 297). | `docs/cikkek/1-miert-zsibbad-a-kezem.md` | Szerkesztői szabály a `docs/szerkesztoi-utmutato.md`-ba: egy célra egy linkszöveg egy cikken belül. |
| **A2** | A CTA-panel szövege 320 px-en 19/24/31 karakter/sor, 15 karakterrel keskenyebb, mint ugyanott a folyószöveg, a panel belső térköze miatt. | `src/app/(frontend)/styles/blocks/post-view.css` | Mobilon `--kc-space-4` vízszintes belső térköz. Meglévő token. |
| **A3** | Nincs kereső a Tudástárban. A WCAG 2.2 **2.4.5** teljesül (nav + lista + jegyzék), de a hosszú farkú cikkkészletnél ez növekedési korlát; a `getPosts` `limit: 60` szintén. | `src/lib/cms.ts`, `/blog` | Ne most. Tíz cikk fölött mérni. |

---

## 10. A CTA-k szó szerinti szövege és a szótár-ellenőrzés

Minden felirat a **mai kódból** olvasva, 2026-08-21. A normatív szótár a
`docs/ui-sztenderdek.md` **§3.2**, a kódbeli igazságforrás a
`src/lib/cta-vocabulary.ts`.

| Hol | Szó szerinti felirat | §3.2 sor | P-1 | Súly | Igaz-e? |
|---|---|---|---|---|---|
| CTA-panel, kapcsolt kurzussal | `Nyisd meg a kurzusoldalt` | #28 | E/2 (P-1b) | `secondary` | 🟢 igen: `courseHref(course)`-ra visz, semmi nem változik a látogató dolgaiban |
| CTA-panel, kurzus nélkül | `Nézd meg a kurzusokat` | #10 | E/2 (P-1b) | `primary` | 🟢 igen |
| CTA-panel, ár-címke | `79 500 Ft`, illetve `Ingyenes` | #3 elve (az ingyenesség badge-ként) | – | `Badge` | 🟢 igen; a `none` állapotban néma (K3) |
| Szerző-blokk | `Ismerd meg a hátterünket` | #34 | E/2 | szöveglink | 🟢 igen: `/rolunk` |
| Üres állapot, hub | `Nézd meg a kurzusokat` + `Elindítom ingyen` | #10, #3 | E/2, E/1 | `primary`, `secondary` | 🟢 igen; az ingyenes gomb csak akkor jelenik meg, ha van tudatosan ingyenes termék |
| Üres állapot, kategória | `Vissza a Tudástárba` | #15 mintázat | E/2 | `primary` | 🟢 igen |
| Üres állapot, kapcsolat | `Írj nekünk` | #33 | E/2 | szöveglink | 🟢 igen |
| Kategória-szűrő | `Összes` + a kategórianevek | – | főnévi címke | csip | 🟢 igen |

**Nem-CTA feliratok, amiket ellenőriztem** (ezek nem cselekvések, hanem
címkék, tehát a szótár nem vonatkozik rájuk, de igaznak kell lenniük):

| Hol | Szó szerinti szöveg | Igaz-e? |
|---|---|---|
| tartalomjegyzék címe | `Ezen az oldalon` | 🟢 |
| GYIK címe | `Gyakori kérdések` | 🟢, és azonos a kezdőlapi és kurzusoldali GYIK címével (WCAG 3.2.4) |
| szerző-blokk címe | `A cikket írta és ellenőrizte` | 🟢, és csak akkor mondja az „ellenőrizte" felet, ha van lektor vagy dátum |
| kapcsolódó blokk címe | `További cikkek a témában: Kéz és csukló` | 🟢, és csak akkor nevezi meg a témát, ha MINDEN ajánlott cikk osztozik rajta |
| meta-sor | `Írta: Kiss Kata, gyógytornász, manuálterapeuta` · `2026. szeptember 1.` · `kb. 12 perc olvasás` | 🟢, a „kb." kimondja, hogy becslés |
| CTA-panel, kurzus nélkül | `Hogyan tovább?` | 🟢 |

**Mérve, a mikroszöveg-szabályra:** a renderelt lapon kvirtmínusz (U+2014),
nagykötőjel (U+2013) és mínuszjel (U+2212) **egy darab sincs**. A meta-sor
elválasztó karakter nélkül, flex-réssel tagol.

### 10.1 Az egyetlen új felirat, amit javaslok

A B1 vörös zászló panel címsorára. Mérlegelés a §3.2 szabályai szerint:

| Jelölt | Miért nem / miért igen |
|---|---|
| „Figyelem!" | Nem mond semmit arról, mit kell tenni. A GOV.UK kifejezetten kerülendőnek nevezi az általános szöveget. |
| „Vörös zászlók" | Szakzsargon. Kovácsné nem tudja, mit jelent. |
| „Sürgős esetek" | Főnévi, és nem mondja meg, mi a teendő. |
| **„Mikor hívj azonnal mentőt"** | Ez az, amit az NHS *care card* csinál: a címsor maga a döntési kérdés, és a válasz a felsorolás. E/2, tegező, ige-kezdetű, négy szó. A cikk saját szakaszcíme ma is ez („Előbb ezt: mikor kell azonnal mentőt hívni?"), tehát nem új fogalom. |

**Ez a felirat nem CTA** (nem kattintható), tehát a §3.2 táblázatba nem kell
felvenni. Ha a panel kap egy „Mit tegyek most?" jellegű LINKET, az már igen, és
akkor a szótárat kell először bővíteni.

---

## 11. Amit NEM szabad megváltoztatni

A Jakob-törvény (NN/g) szerint a látogatók az idejük nagy részét más oldalakon
töltik, és azt várják, hogy a miénk is úgy működjön. A meglévő vevőknél
ehhez hozzájön a régi kineticare.hu megszokása (`docs/regi-oldal-osszehasonlitas.md`).

| Amit meg kell tartani | Miért |
|---|---|
| **A CTA a cikk VÉGÉN marad.** Mérve: a vészhelyzeti tartalom 10,9 képernyővel megelőzi az első értékesítési elemet. | NN/g *Informational Articles Must Ask For the Order*: a hely a törzs és a cikk vége. Feljebb hozva a 7.5 sorrend borul, és a hitelesség vele. |
| **A CTA halk marad**, a kurzusos ágon `secondary` súllyal. | Ugyanaz a forrás: *„If you push too hard, you lose credibility."* A `docs/vevohang-es-hirdetesszoveg.md` mérve mutatja, hogy a versenytárs „80-20%-os gyógyulási információja" NEGATÍV véleményt hozott. |
| **A gombfeliratok E/1 vagy E/2 alakja a P-1 szabály szerint.** | A régi kineticare.hu mérve 100%-ban E/1-es gombfeliratokat használt (`KÉREM A PROGRAMOT`, `MEGRENDELEM`). Ezt angolból vett felszólító alakra cserélni fordítás-ízű hangot adna, amit a tulajdonos kifejezetten tiltott. |
| **A fejléc „Kurzusok" pirulája.** | Az értékesítés fő útja, kód-szinten mindig jelen (`Header.tsx`). A menücímke marad „Kurzusok", nem lesz belőle „Nézd meg a kurzusokat" (§3.2 #10 kivétele, N-3). |
| **A `blockquote` NEM lesz figyelmeztetés-kallout.** | Tulajdonosi döntés, 2026-08-16, `content.css:739`. A vörös zászló panel ÚJ elem, nem az idézet visszaalakítása. |
| **A 30 napos garancia és az „egyszeri díj, további költség nincs" mondat.** | A `docs/felhasznaloi-seta.md` 11. fejezete mérve ezeket nevezi a lap legjobb bizalmi elemeinek. |
| **A byline a lap tetején, a bemutatkozás a lap alján.** | NN/g *Bylines for Web Articles*. Ma mérve pontosan így van. |
| **A jegyzék első tétele a vörös zászló szakasz.** | Mérve mind a négy nézetablakon a hajtás fölött. Ez ma a riadt látogató egyetlen gyors útja. |
| **A kártya-overlay** (`knowledge.css`, `.kc-post-card .kc-post-card__link::after`). | A teljes kártya kattintható marad, miközben a link neve a cikk címe. Mérve `elementFromPoint`-tal, négy ponton. |
| **Az „Ingyenes" a badge-ben, nem a gombban.** | §3.2 #3. Ez az a szabály, ami a `docs/felhasznaloi-seta.md` legsúlyosabb hibáját (az „Megveszem" egy ingyenes terméken) megelőzi. |

---

## 12. Mérési napló és a mérés reprodukálása

### 12.1 A harness

1. **Renderelés.** `PostArticle` szerver-oldali renderelése
   `renderToStaticMarkup`-pal. A `post.content` a
   `docs/cikkek/1-miert-zsibbad-a-kezem.md` törzsének (a „## Előbb ezt…"
   szakasztól a „## Források" szakaszig) Lexical-dokumentummá alakított
   változata. A CSS-importokat a bundler üres modullá oldja
   (`esbuild --loader:.css=empty`), a stíluslapokat a lap `<style>`-ben kapja,
   a `styles.css` sorrendjében.
2. **Kiszolgálás.** Helyi HTTP-kiszolgáló adja a lapot és a repó valódi
   `public/fonts/*.woff2` betűit.
3. **Mérés.** Chromium 141
   (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, playwright-core),
   `--no-sandbox`, `locale: hu-HU`, `deviceScaleFactor: 1`,
   `await document.fonts.ready` minden mérés előtt.
4. **Sorhossz.** `Range.selectNodeContents` + `getClientRects()`, soronként:
   a sor karakterszáma a sor szélessége osztva az összes sor együttes
   szélességével, szorozva a normalizált szöveghosszal. A záró, részleges sor
   kimarad.
5. **Kontraszt.** WCAG relatív luminancia, a hátteret a szülőláncon felfelé
   keresve az első nem átlátszó értékig.
6. **Kattinthatóság.** `document.elementFromPoint` a doboz négy pontján, előtte
   `scrollBehavior = 'auto'` és `behavior: 'instant'` görgetés (enélkül a
   `scroll-behavior: smooth` miatt a hit-teszt a görgetés közben fut le, és
   hamis „nincs elem" választ ad; ez a mérés közben elő is fordult).

**Amit szimuláltam:** a ragadós fejléc geometriáját
(`position: sticky; top: 0; height: 72px; z-index: 50`), a `tokens.css`
`--kc-header-height: 4.5rem` értéke alapján. A fejléc TARTALMÁT és a süti-sávot
nem mértem: azok szerver-komponensek, adatbázis-olvasással.

### 12.2 A számok egy helyen

**Cikkoldal, laphossz:** 320 px: 21 360 · 390 px: 18 139 · 768 px: 14 031 ·
1440 px: 15 652 px.

**Cikkoldal kulcspontjai (390×844, px a laptetőtől):**
kategória-címke 120 · H1 165 · lead 255 · byline 378 · jegyzék 526 (663 px
magas) · jegyzék 1. tétele 578 · első törzs-H2 1 221 · első bekezdés 1 354 ·
„Stroke jelei." 1 450 · „Ha megijedtél." 2 001 · „Mikor NE végezd…" 11 352 ·
„Mikor fordulj azonnal orvoshoz?" 12 279 · „Hogyan tovább…" 14 837 · GYIK
15 945 · szerző-blokk 16 213 · **CTA-panel 16 687** · CTA-gomb 16 916 ·
kapcsolódó cím 17 047.

**Sorhossz (min/medián/max karakter):**

| Elem | 320 | 390 | 768 | 1440 |
|---|---|---|---|---|
| folyószöveg | 39/39/39 | 48/49/49 | 69/69/69 | 69/69/69 |
| CTA-panel szövege | 19/24/31 | 22/31/36 | 65/65/65 | 53/53/53 |
| kapcsolódó kártya kivonata | 23/29/31 | 27/33/40 | 27/36/37 | **27/31/33** |
| `/blog` kártya kivonata | 24/28/29 | 36/39/41 | – | 56/59/59 |

**Érintőcélok (szélesség × magasság, px):**

| Elem | 320 | 390 | 768 | 1440 |
|---|---|---|---|---|
| kategória-címke (link) | 104,5×**28,8** | 104,6×**28,8** | 107,5×**29,6** | 110,7×**32,4** |
| jegyzék első linkje | 198,0×53,4 | 217,9×44,0 | 228,1×44,0 | 244,4×44,0 |
| CTA-gomb | 222×72,8 | 241×50,5 | 249,8×51,5 | 264×53,2 |
| GYIK első nyitója | 272×51,2 | 342×51,3 | 672×52,2 | 672×53,6 |
| kategória-csip (`/blog`) | 85,0×44,7 | 85,2×44,8 | – | 91,4×48,0 |

**Kontraszt (számolt arány, 1440 px):** CTA-gomb szövege 15,63:1 · CTA-panel
szövege 9,30:1 · ár-címke 13,53:1 · kategória-címke 8,49:1 · folyószöveg
14,79:1 · törzs-link 14,79:1 · meta-sor 8,05:1 · kapcsolódó kivonat 9,30:1.
**Nincs bukó érték** (a küszöb 4,5:1).

**A javasolt vörös zászló panel kontrasztja (a `tokens.css` MEGLÉVŐ tokenjeivel,
számolva, nem renderelve):** `--kc-color-danger` (#b3261e) a
`--kc-color-danger-surface`-en (#fdecea) **5,72:1** · `--kc-color-ink` ugyanazon
**13,66:1** · `--kc-color-danger` fehéren 6,54:1, a `paper` laphátéren 6,19:1 ·
a `danger-surface` FELÜLET a `paper` laphátérhez **1,08:1**, tehát a felület
önmagában nem azonosít, keret és szöveges címke kell mellé.

**Rés-mérések (mind a négy nézetablakon):** CTA-panel alja → kapcsolódó címsor:
**56,0 px** (a küszöb 72 px alatt, nincs hamis lapvég). Szerző-blokk alja →
CTA-panel teteje: 96 px (320/390/768), 176 px (1440).

**Hozzáférhető nevek, kapcsolódó kártya-linkek:** 42, 42, 28 karakter (a terv
80-as felső határa alatt).

**Linkek a cikkoldal `<main>`-jében:** 24 összesen, ebből 12 lapon belüli
horgony, 7 másik cikk, 1 kategória-oldal, 3 kurzus, 1 `/rolunk`, **0** a `/blog`
gyűjtőoldalra, 0 külső.

**Vízszintes görgetés:** egyik mért lapon, egyik mért nézetablakon sincs.

**Betűméretek:** nézetablakonként pontosan három (320 px-en 32,00 / 16,00 /
13,00; 1440 px-en 46,40 / 18,00 / 14,00), tehát a három token megtartva.

---

## 13. Nyitott kérdések a vezetőnek

1. **A vörös zászló panel formája (B1).** Külön `redFlags` mező a `Posts`
   sémán (migrációval), vagy blokk-jellemző a `content` richTextben? A mező
   biztonságosabb (kötelezővé tehető, a felület mindig ugyanoda teszi), de
   séma-változás, tehát migrációt igényel. A blokk rugalmasabb, de a szerkesztő
   elfelejtheti. **Nekem a mező tűnik helyesnek, de ez a te döntésed.**
2. **A panel színe.** A repóban ma nincs `danger`/`figyelmeztetés` token. Új
   szín bevezetése a skill 3. pontja szerint mérést és jóváhagyást igényel.
   Meglévő tokennel (`--kc-color-surface-tint` + vastag keret + ikon +
   szöveges címke) is megoldható, csak halkabb. Melyiket?
3. **A `/blog` rács javítása (S1) és az őr-teszt.** A
   `tudastar-cikkoldal.test.tsx` G8 pontja ma a hibás track-korlátokat
   ellenőrzi. A javítással az őrt is át kell írni, és jó volna BÖNGÉSZŐS
   őrre cserélni (a mai számítás nem tudja modellezni az `auto-fit`
   ismétlésszámot). Ki a fájl gazdája ebben a körben?
4. **A tartalomjegyzék mobilon (S4).** Harmonika, vagy tételszám-korlát, vagy
   mindkettő? A harmonika a `PostToc` és a `post-view.css` tulajdonosát
   érinti, a küszöb a `post-article.ts`-t.
5. **A CTA-panel címsora (K1).** A „Hogyan tovább?" egységesítése azt jelenti,
   hogy a terméknév lekerül a címsorból. Ez SEO-szempontból is döntés
   (a `docs/seo-geo-llm.md` hatálya), nem csak UX.
6. **A kurzusoldal címe (5.2).** A `docs/vevohang-es-hirdetesszoveg.md` 6.
   fejezete panasz-alapú címet kér, terméknévvel alcímként. Ez külön kör,
   külön ügynökkel. Mikor?
7. **A 2., 3., 5. és 6. cikk vörös zászló szakasza (B2).** Ez tartalmi munka,
   a cikkíró ügynök hatásköre, de szakmai jóváhagyást igényel a két
   gyógytornásztól. Ki írja meg, és mikor megy lektorálásra?
8. **Élő ellenőrzés.** A fejléc, a lábléc és a süti-sáv nem volt mérhető ebben
   a harnesszben. A `docs/tudastar-a11y-meres.md` 4. fejezete ugyanezt kérte.
   Amíg nincs élő (Railway) környezetben egy Tudástár-cikk, ez a kör nem
   zárható le teljesen.

---

## 14. Források

Minden hivatkozott állítás szó szerint szerepel a fenti pontokban.
Hozzáférés dátuma mindenhol: **2026-08-21.**

**Módszertan**
- Nielsen Norman Group: *Cognitive Walkthroughs* —
  https://www.nngroup.com/articles/cognitive-walkthroughs/
- Wharton, Rieman, Lewis, Polson: *The Cognitive Walkthrough Method: A
  Practitioner's Guide*, in Nielsen & Mack (szerk.): *Usability Inspection
  Methods*, Wiley, 1994 — https://dl.acm.org/doi/10.5555/189200.189214

**Belépés, tájékozódás, bizalom**
- Nielsen Norman Group: *Breadcrumbs: 11 Design Guidelines for Desktop and
  Mobile* — https://www.nngroup.com/articles/breadcrumbs/
  („when they skip some of these levels… breadcrumbs orient them")
- Nielsen Norman Group: *Trustworthiness in Web Design: 4 Credibility Factors*
  — https://www.nngroup.com/articles/trustworthy-design/
- Nielsen Norman Group: *Bylines for Web Articles* —
  https://www.nngroup.com/articles/bylines/
- Nielsen Norman Group: *Information Scent: How Users Decide Where to Go Next*
  — https://www.nngroup.com/articles/information-scent/

**Olvasás, görgetés, elrendezés**
- Nielsen Norman Group: *Scrolling and Attention* —
  https://www.nngroup.com/articles/scrolling-and-attention/
  (57% az első képernyőn, 17% a másodikon; „Keep major CTAs above the fold")
- Nielsen Norman Group: *In-Page Links for Content Navigation* —
  https://www.nngroup.com/articles/in-page-links-content-navigation/
- Nielsen Norman Group: *Mobile Navigation: Image Grids or Text Lists?* —
  https://www.nngroup.com/articles/image-vs-list-mobile-navigation/
- Nielsen Norman Group: *Related Content Boosts Pageviews, When Done Right* —
  https://www.nngroup.com/articles/related-content-pageviews/

**A híd (cikk → termék)**
- Nielsen Norman Group: *Informational Articles Must Ask For the Order* —
  https://www.nngroup.com/articles/product-links-on-informational-pages/
  („the page's body area and at the end of the article"; „Turn down the volume
  on the sales message. If you push too hard, you lose credibility.";
  „arrive directly at your article from a search engine")
- Nielsen Norman Group: *Better Link Labels: 4 Ss for Encouraging Clicks* —
  https://www.nngroup.com/articles/better-link-labels/
- Baymard Institute: *Cart Abandonment Rate* (a váratlan költség 40%-os
  visszatartó szerepe) — https://baymard.com/lists/cart-abandonment-rate

**Vészhelyzeti tartalom**
- NHS digital service manual: *Care cards* —
  https://service-manual.nhs.uk/design-system/components/care-cards
  („Call 999 or go to A&E now if:"; „users scanning the page stopped to read
  the care cards and understood what action to take"; „people with visual
  disabilities may not be able to recognise care cards by their colour")
- GOV.UK Design System: *Warning text* —
  https://design-system.service.gov.uk/components/warning-text/
  („Use the warning text component when you need to warn users about something
  important"; a rejtett „Warning" szöveg a képernyőolvasóknak)
- NHS: *Heart attack* —
  https://www.nhs.uk/conditions/heart-attack/
  („the pain may also spread to your arm, neck and jaw";
  „feeling sick (nausea) or being sick (vomiting)")

**Feliratok**
- GOV.UK Design System: *Button* —
  https://design-system.service.gov.uk/components/button/
- GOV.UK: *Add links* (writing guidelines) —
  https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/add-links/

**Üres állapot**
- Nielsen Norman Group: *Designing Empty States in Complex Applications: 3
  Guidelines* — https://www.nngroup.com/articles/empty-state-interface-design/
- IBM Carbon Design System: *Empty states pattern* —
  https://carbondesignsystem.com/patterns/empty-states-pattern/

**Szabvány**
- W3C: *Understanding SC 3.2.3 Consistent Navigation* (AA) —
  https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html
  („Navigational mechanisms that are repeated on multiple web pages… occur in
  the same relative order each time they are repeated")
- W3C: *Understanding SC 2.4.5 Multiple Ways* (AA) —
  https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html
- W3C: *Understanding SC 2.5.8 Target Size (Minimum)* (AA) —
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C: *Understanding SC 3.2.4 Consistent Identification* (AA) —
  https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
- W3C: *Understanding SC 1.4.1 Use of Color* (A) —
  https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C: *WCAG 2.2, SC 1.4.10 Reflow* — https://www.w3.org/TR/WCAG22/#reflow
- W3C: *WCAG 2.2, SC 1.4.8 Visual Presentation* (AAA) —
  https://www.w3.org/TR/WCAG22/#visual-presentation

**A rács-hiba bizonyítékai (S1)**
- W3C: *CSS Grid Layout Module Level 1*, §7.2.3.1 auto-repeat —
  https://www.w3.org/TR/css-grid-1/#auto-repeat
  („each track is treated as its max track sizing function if that is definite
  or else its min track sizing function if that is definite")
- MDN Web Docs: *repeat()* —
  https://developer.mozilla.org/en-US/docs/Web/CSS/repeat
  („Treating each track as its maximal track sizing function… if that is
  definite")

**A repó saját, normatív kutatásai**
- `.claude/skills/termektervezes/SKILL.md` (a munka hatálya)
- `docs/felhasznaloi-seta.md` (a séta mintája és a persona)
- `docs/informacios-architektura.md` (útvonal- és gomb-gráf)
- `docs/ui-sztenderdek.md` (§3.1 magyar mikroszöveg, **§3.2 CTA-szótár**, Ü6
  sorhossz, 6. fejezet érintőcél)
- `docs/gomb-inventar.md` (leltár, nem szótár)
- `docs/ertekesitesi-ux-skill.md` (M1–M8 cél-hierarchia)
- `docs/ux-hierarchia-audit.md`, `docs/ux-belso-oldalak-kutatas.md`
- `docs/tudastar-ux-terv.md` (2.2 rács, 3.1 kártya-változatok, 5.2 sorhossz,
  5.4 jegyzék, 5.8 CTA-küszöb)
- `docs/tudastar-a11y-meres.md` (3.1, 3.3, 3.5 és a 4. fejezet 4. pontja, ami
  ezt a sétát kérte)
- `docs/tudastar-tartalmi-terv.md`, `docs/tudastar-hangnem-es-technika.md`
- `docs/cikkek-tenyellenorzes.md` (B1, B2)
- `docs/orvosi-forrasbazis.md` (1.1: „Azonnal mentőt kell hívni")
- `docs/regi-oldal-osszehasonlitas.md` (3.1 és 3.4: a régi oldal E/1-es
  gombfeliratai)
- `docs/seo-geo-llm.md`
- `docs/vevohang-es-hirdetesszoveg.md` (a `docs/kampany-kutatas` ágon:
  362 vélemény, „kezelés" 209, „alkalom" 91 említés)
- `docs/monid-masodik-kor.md` (a `docs/kampany-kutatas` ágon: a
  `bal kéz zsibbadás hányinger` keresési alak és a szezonalitás)
