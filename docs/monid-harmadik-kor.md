# Monid, harmadik kör — a hirdetési táj, a valódi kérdések és a betegek szavai

> **Minden szám MÉRT**, 2026-08-21-én, a Monidon keresztül. A kör költsége
> **0,53 USD** — a Monid-egyenleg a kör előtt 5,82, utána **5,29 USD**
> (mindkettő a `monid_balance` élő leolvasása, nem számított érték). A
> futtatás-azonosítók és a tételes költség a 7. szakaszban.
>
> Ez a dokumentum a `docs/monid-masodik-kor.md` folytatása. Az ott mért
> organikus képet egészíti ki azzal, amit addig nem néztünk meg: **mit
> hirdetnek élőben a versenytársak**, **milyen kérdéseket ír be a felhasználó
> valójában**, és **milyen szavakkal beszélnek a betegek a saját panaszukról**.

## 1. A fizetett táj: 50 aktív magyar gyógytorna-hirdetés

A Facebook Ads Library-ből lekérdezett 50 aktív, magyarországi célzású
hirdetés megoszlása:

| Mit mértünk | Eredmény |
| --- | ---: |
| Online kurzust vagy otthoni programot hirdet | **0** |
| Rendelő-hirdetés (időpontfoglalás) | 31 |
| Étrend-kiegészítő, direct response | 16 |
| Egyéb (webáruház, állatorvosi rehab, bank) | 3 |
| Kéz, csukló, könyök vagy ujj szóba kerül a szövegben | 12 |
| Ebből **rendelő**-hirdetés | **2** |
| Kéz-specialista | **0** |

Formátum szerint 30 kép, 12 DCO, 4 karusszel, 3 videó, 1 dinamikus katalógus.
Platform szerint mind az 50 fut Facebookon, **49 Instagramon is**, 37 Threadsen
és Messengeren, 34 az Audience Networkön.

**A következtetés:** a kéz-rehabilitációs otthoni program mint hirdetett
termék ma nincs jelen a magyar piacon. A 12 kéz-témájú hirdetésből **10 az
étrend-kiegészítőé**, ami az ujjakat csak egy tünetlista egyik sorában
említi („Az ujjaim merevek voltak"). Rendelő-hirdetés mindössze **kettő**
érinti a témát, az is mellékesen (a Galaxy Med a teniszkönyököt egy hét
panaszból álló felsorolásban). Kéz-specialista hirdető nincs a mintában.

### 1.1 Ami bizonyítottan fut hosszan

A leghosszabban aktív hirdetések (a futásidő a legjobb elérhető közelítése
annak, hogy egy hirdetés megéri-e a költést):

| Hirdető | Napja aktív |
| --- | ---: |
| Járomi Medical | 345 |
| Egészmás Egészségügyi Központ | 326 |
| CMed Magánkórház | 322 |
| Mozgásklinika | 316 |

Mind a négy **rendelő-hirdetés**, „Learn more" vagy „Book now" gombbal. Ebből
a mintából a mi termékünkre közvetlenül nem lehet másolni: a rendelő
időpontot ad el, mi tudást.

### 1.2 A direct-response formula, ami magyarul él

Három oldal (Finalide EU, Finalide HU és „Egészséges élet 40 felett")
**azonos szöveggel** futtat összesen 16 hirdetést, két változatban: az egyik
törzs 10, a másik 6 hirdetésben szerepel szó szerint. A szerkezet:

1. Élettani magyarázat a célcsoport nyelvén (ösztrogén-csökkenés, ízületi
   gyulladásos válasz).
2. Idézet a beteg tapasztalatáról, ami elismeri a mellőzöttséget:
   *„Amikor egy 50 év feletti nőnek fáj a csípője… azt mondják neki, hogy
   »csináljon egy kis jógát«."*
3. Nevesített, egyes szám első személyű történet („Andrea vagyok. 54 éves.").
4. Tünetlista, soronként egy tünet.
5. „Öt orvos egy év alatt. Öt különböző diagnózis."
6. Ajánlat: 50% kedvezmény, „Shop now".

A célközönség (45–55 éves nők, ízületi panasszal) **pontosan a mienk**. A
formula viszont étrend-kiegészítőé: olyat ígérhet, amit egy gyógytornász-
tartalom nem. A 3. és 5. pont az, ami átvehető — a mellőzöttség elismerése és
a diagnosztikai bizonytalanság kimondása —, a kedvezmény-vezérelt zárás nem.

## 2. A valódi kérdések: Google-autocomplete, cikkenként

A hat cikk elsődleges kifejezésére lekérdezett Google-autocomplete adta a
legnagyobb hozamú találatot. Összesen **147 kifejezés**.

**Fontos szolgáltatói hiba:** a Strale-végpont az ékezetes betűket hibás
kódolással adja vissza („k?zt?alag?t"). Magyarul visszafejthető, de gépiesen
nem megbízható — **kézi átnézés kötelező**, mielőtt bármi felhasználásra
kerül. A Google Trends végpont ugyanezt helyesen adja.

### 2.1 A visszatérő minta: öt kérdéstípus, amit MINDEN cikk kap

| Kérdéstípus | Hány cikknél jelent meg | Példa |
| --- | ---: | --- |
| „lelki okai" | 4 | bal kéz zsibbadás lelki okai |
| „krém" / kenőcs | 4 | kéztőalagút szindróma krém |
| „bno" / „bno kód" | 4 | csuklótörés bno kód |
| „angolul" | 5 | teniszkönyök angolul |
| „terhesség alatt" | 4 | pattanó ujj terhesség alatt |

Ez a lista a **legnagyobb tartalmi rés**. A „lelki okai" különösen: négy
cikknél is felbukkan, valódi keresési igényt jelez, és ma egyik cikkünk sem
foglalkozik vele. Áltudományos állítás leírása szóba sem jöhet, de a kérdés
felelős, szakmai megválaszolása (a fájdalom és a stressz mért összefüggése,
és ami NEM igaz) egyszerre szolgálná a keresőt és az olvasót.

### 2.2 Amire a cikk MA nem válaszol — a `2-keztoalagut-szindroma` példáján

A 24 mért kifejezésből a cikk ezekre nem tér ki: **műtét ára**, **B-vitamin**,
**krém**, **borogatás**, **akupunktúra**. Mind az öt „mit vegyek be, mit
kenjek rá" típusú kérdés, vagyis pontosan az, amire szakmai választ adni
érték, és amire a versenytárs sem válaszol.

Amire viszont válaszol (mérve, a cikk törzsében): sín (21 említés),
gyakorlatok (18), vizsgálat (14), műtét utáni időszak (6), terhesség (4).

## 3. Google Trends: ahol van elég adat

| Kifejezés | Top | Emelkedő |
| --- | --- | --- |
| teniszkönyök | kezelése 100, pánt 71, tünetei 45 | **pánt +120**, műtét +50, gyógytorna +40 |
| kéztőalagút szindróma | tünetei 100, kezelése 75, krém 69 | **tünetei +130** |
| kéz zsibbadás | bal kéz 100, okai 85, jobb kéz 69 | nincs |
| pattanó ujj | műtét 100, kezelése 80 | **kezelése házilag +50**, kezelése +40 |
| csuklófájdalom | — | — |
| csuklótörés | — | — |

Az utolsó kettőre a Trends **üres** választ adott: nincs elég magyar keresési
érdeklődés ahhoz, hogy trendet számoljon. A 0,066 USD ezen a két híváson
hozam nélkül ment el; a tanulság, hogy a Trends csak a nagyobb volumenű
kifejezéseknél használható (a mi esetünkben 800 keresés/hó felett).

Két megerősítés a második körhöz képest: a `pattanó ujj kezelése házilag`
**emelkedő** (+50), ami pontosan az Otthoni KézRehab Program ígérete; és a
`bal kéz zsibbadás` erősebb, mint a jobb (100 vs 69) — a cikknek külön ki
kell térnie arra, miért kérdezik ezt gyakrabban bal oldalra.

## 4. Ahogy a betegek beszélnek: Google Maps vélemények

**Adatvédelem előre:** a lekérdezés `personalData: false` beállítással futott,
tehát a véleményezők neve, azonosítója, profilja és fényképe **nem került
le** — ellenőrizve, mind a 30 rekordban `null`. A vélemények szövege a
scratchpadben marad; **a repóba egyetlen vélemény sem kerül be**, sem
idézetként, sem tesztfixtúrában. Csak az összesített nyelvi minta használható.

Három futás, egy módszertani tanulság:

- **Szűrő nélkül a végpont használhatatlan erre.** Egy szűretlen futás 25
  véleményt hozott, mind ugyanarról az EGY helyről, és **egy sem** érintett
  kéz-panaszt. 0,017 USD hozam nélkül.
- **Szűrővel működik.** A `reviewsFilterString`-gel futtatott két lekérdezés
  9 találatból 9 releváns véleményt adott, összesen 0,0061 USD-ért.

### 4.1 A legfontosabb találat: az ALVÁS a kimenet, amit a beteg megnevez

Egy kéztőalagút-beteg így írja le, mi változott: *„3 kezelésen vagyok túl az
Alagút szindrómám sokkal jobb, tudok aludni 8 órát egyben végre, és kevésbé
zsibbad a kezem."* Nem a fájdalom szűnését említi elsőként, hanem azt, hogy
**végre tud aludni**.

Ez **három független mérésből ugyanaz**:

| Forrás | Amit mutat |
| --- | --- |
| Autocomplete | `kéz zsibbadás éjszaka`, `alvás közben`, `alváskor`, `reggel`, `bal kéz zsibbadás éjszaka` |
| Google Trends | a `kéztőalagút szindróma tünetei` a legerősebben emelkedő (+130) |
| Maps-vélemény | „tudok aludni 8 órát egyben végre" |

**Következmény a szövegekre:** az éjszakai zsibbadás és az alvás helyreállása
nem egy tünet a sok közül, hanem az az ígéret, amit a beteg maga fogalmaz meg.
A kéztőalagút-cikk és a kurzus szövegének is ezzel kell kezdenie, nem az
anatómiával.

### 4.2 A beteg öt igéje

Egy vélemény szó szerint felsorolja, mi szűnt meg: a kézfeje *„nem zsibbad,
fáj, szúr, lüktet vagy nyilallik"*. Ez az öt ige a panasz teljes köznyelvi
szótára. A cikkeknek és a hirdetésszövegeknek ezeket a szavakat kell
használniuk, nem a „paresztézia" típusú szakszót.

### 4.3 További minták

1. **A zsibbadás nyakkal együtt jelenik meg.** Több vélemény is
   nyakfájás + kézzsibbadás párost ír le. A `miert-zsibbad-a-kezem` cikknek
   ezért a nyaki eredetet hangsúlyosan kell kezelnie, nem lábjegyzetben.
2. **Az orvosi bizonytalanság a fő frusztráció.** Visszatérő fordulat, hogy a
   beteg magyarázatot kapott arra, „amit az orvosok csak találgattak". Ez
   pontosan ugyanaz a fájdalompont, amit az 1.2 pont direct-response formulája
   is megcéloz („öt orvos, öt diagnózis") — két független forrásból ugyanaz.
3. **Ülőmunka és évek.** „Ülő munkát végzek. Évek óta fájdalmakkal éltem."
   A panasz nem akut, hanem hosszan tűrt.
4. **Egy betegnél több kéz-diagnózis is fut.** Egy vélemény alagút-szindrómát
   ÉS lezajlott tenisz- meg golfkönyök-műtétet említ ugyanannál a személynél.
   Ez a cikkek közti belső linkelést igazolja: aki az egyiket olvassa,
   nagy eséllyel a másikat is keresi.
5. **Az ujjak gyengesége külön panasz**, nem csak a fájdalom: konkrét ujjak
   ügyetlenebb mozgása.

## 5. Mit jelent ez a lányok oldalára

1. **A hirdetési rés valódi és nyitva áll.** Senki nem hirdet kéz-specialista
   otthoni programot Magyarországon. Ez nem elméleti következtetés, hanem 50
   aktív hirdetés átnézése.
2. **A cikkek bővítendők a mért kérdésekkel.** A „mit vegyek be, mit kenjek
   rá" blokk és a „lelki okai" kérdés a két legnagyobb, ma üresen álló rés.
3. **A GYIK-tételek a mért kérdésekből épülnek**, nem kitalált kérdésekből
   (`src/lib/tudastar/faq.ts`).
4. **A nyaki eredet a zsibbadás-cikkben feljebb való**, mert a beteg így éli
   meg és így is keres rá.
5. **Az alvás helyreállása a vezető ígéret** a kéztőalagút-vonalon (4.1), és
   a beteg saját igéivel kell leírni a panaszt (4.2).

## 6. Amit NEM javaslunk

A Facebook-csoportok scraperét (0,006 USD/poszt). Valódi betegek beszélnek
benne a saját egészségi állapotukról, ami különleges kategóriájú személyes
adat. A Maps-vélemények ugyanezt a hasznot adják nyilvános, üzleti
véleményekből, `personalData: false` mellett.

## 7. Futtatás-azonosítók és költség

| Végpont | Futtatás | Költség (USD) |
| --- | --- | ---: |
| `curious_coder/facebook-ads-library-scraper` | `01M0JZXDXGFKHFWZNTJE5C27TE` | 0,0563 |
| `strale /x402/keyword-suggest` × 6 | `01M0K0796W…`, `01M0K0CNJF…`, `01M0K0CSA4…`, `01M0K0CX65…`, `01M0K0D5A6…`, `01M0K0DKQK…` | 0,2138 |
| `strale` (túl hosszú kulcsszó, 2 találat) | `01M0K0D8P3…` | 0,0356 |
| `google-trends /related-queries` × 6 | `01M0K0DQM4…`, `01M0K0E2YM…`, `01M0K0E8PB…`, `01M0K0EE3Z…`, `01M0K0EQ7T…`, `01M0K0EW04…` | 0,1980 |
| `compass/google-maps-reviews-scraper` (szűrt: „kéz") | `01M0K0G4BE…` | 0,0034 |
| `compass/google-maps-reviews-scraper` (szűretlen) | `01M0K0PW2Q…` | 0,0169 |
| `compass/google-maps-reviews-scraper` (szűrt: „zsibbad") | `01M0K0XANH…` | 0,0027 |
| **Összesen** | | **0,5267** |

A táblázat összege és a `monid_balance` két leolvasása közti különbség
(0,52664) a kerekítésen belül egyezik — a költség tehát nem becsült.

**Két futás ment el hozam nélkül** (a túl hosszú kulcsszó és a szűretlen
vélemény-lekérdezés), összesen 0,0525 USD. Ezt azért írjuk le, mert a
mérésnek a kudarcot is mérnie kell.

## 8. Árazási tanulság a következő körre

| Végpont | Árazás | Mit jelent |
| --- | --- | --- |
| `ahrefs /keywords-explorer/search-suggestions` | 0,036 USD / **találat** | 24 találat = 0,86 USD |
| `strale /x402/keyword-suggest` | 0,036 USD / **hívás** | 24 találat = 0,036 USD |

**Ugyanarra a feladatra 24-szeres árkülönbség.** A per-hívás és a per-találat
árazás közti különbséget a `monid_inspect` (ingyenes) mindig megmutatja —
futtatás előtt meg kell nézni.

Két további szabály, mérve:

- **A rövid kulcsszó többet hoz.** A `csuklótörés utáni gyógytorna` seed 2
  találatot adott, a `csuklótörés` 13-at, ugyanazért a pénzért.
- **A Maps-véleményekhez szűrő kell**, különben a találatok generikus
  dicséretek egyetlen helyről.
