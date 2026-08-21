# Tudástár cikkoldal: akadálymentességi és UX-mérés

**Mit mér ez a dokumentum.** A `docs/tudastar-ux-terv.md` és a
`docs/tudastar-technikai-terv.md` ígéreteit veti össze azzal, amit a
megvalósítás ténylegesen csinál. Nem véleményt ad: minden sorban ott a **mért
szám**, a mérés módja és a WCAG 2.2 sikerkritérium száma.

**Készült:** 2026-08-21. **Ág:** `claude/course-interface-admin-ec326e`.
**A mérés eszköze:** Chromium 141 (headless, `/opt/pw-browsers/chromium-1194`),
Chrome DevTools Protocollal vezérelve, a repó VALÓDI CSS-láncával
(`tokens.css` → `fonts.css` → `base.css` → `motion.css` → `ui.css` →
`progress.css` → `layout.css` → `content.css` → `consent-banner.css` →
`blocks/faq.css` → `blocks/post-view.css` → `blocks/tudastar-lista.css` →
`blocks/knowledge.css`) és a repó valódi, self-hostolt betűivel
(`public/fonts/*.woff2`).

**A mért tartalom valódi.** A `PostArticle` a `docs/cikkek/1-miert-zsibbad-a-kezem.md`
lektorálandó vázlatának teljes szövegével renderelt: 2 827 szó, 1 h1, 17 h2,
8 h3, 100 bekezdés, 62 listaelem, 32 hivatkozás, 3 GYIK-tétel, 3 kapcsolódó
kártya, szerző- és lektor-blokk, kurzus-CTA. A magyar sorhossz tehát MAGYAR
szövegen, ékezetekkel mérve áll a táblákban, nem angol lorem ipsumon.

---

## 0. Összefoglaló

| | Darab |
|---|---|
| Mért elem-mérés (7 nézetablak) | **1 603** kontraszt-mérés, **245** érintőcél-mérés, **35** fókusz-állomás |
| WCAG 2.2 sikerkritérium ellenőrizve | **17** |
| Ebből mérve teljesül | **16 hiánytalanul**, 1 részben (2.4.10 AAA, lásd 3.2) |
| Repó saját, szigorúbb szabálya megsérül | **3** (Ü6 sorhossz, 44 px-es érintőcél, kártya-link neve) |
| A terv ígért, a megvalósítás NEM teljesíti | **2 súlyos**, 1 közepes |

**A lényeg egy mondatban:** a cikkoldal **minden ellenőrzött WCAG 2.2 AA-szintű
sikerkritériumot teljesít**, és az ellenőrzött AAA-szintűek közül egy kivétellel
mindet; a többi hiba a repó SAJÁT, szigorúbb szabályainál és a terv saját,
mérhető elfogadási feltételeinél jelentkezik, és mind a **kapcsolódó cikkek
kártyáin** vagy a fejléc kategória-címkéjén ül.

---

## 1. Ami teljesül, mért számmal

### 1.1 WCAG 2.2 sikerkritériumonként

| SC | Szint | Küszöb | **Mért érték** | Ítélet |
|---|---|---|---|---|
| **1.3.1** Info and Relationships | A | a szerkezet programozottan is látszik | `<article>` gyökér; a jegyzék `<nav aria-labelledby>` + `<ol>`; a GYIK `<section aria-labelledby>` + natív `details/summary`; a források `<ol>` | teljesül |
| **1.4.3** Contrast (Minimum) | AA | szöveg ≥ 4,5:1, nagy szöveg ≥ 3:1 | **1 603 mérésből 0 bukó.** Legkisebb arány a lapon: **4,70:1** (dekoratív, `aria-hidden="true"` nyíl). A folyószöveg **14,79:1**, a fehér kártyán **15,63:1** | teljesül |
| **1.4.4** Resize Text | AA | 200%-os nagyítás információvesztés nélkül | 640 px-es nézetablak (= 1280 px @ 200%): `scrollWidth` **640**, túllógó elem **0** | teljesül |
| **1.4.8** Visual Presentation | AAA | ≤ 80 karakter/sor; sortáv ≥ 1,5; bekezdésköz ≥ 1,5 × sortáv | Leghosszabb folyószöveg-sor: **76** karakter (768 px). Sortáv: **1,67**. Bekezdésköz 1440 px-en **46,06 px**, a küszöb **45,09 px** | teljesül (2.4 pont: szűk tartalék) |
| **1.4.10** Reflow | AA | 320 px-en nincs kétirányú görgetés | 320 / 360 / 390 / 768 / 1024 / 1440 / 1920 px-en `scrollWidth == clientWidth`, **túllógó elem 0**. 320 px-en a legszélsőbb elem jobb éle **296 px** (24 px tartalék) | teljesül |
| **1.4.11** Non-text Contrast | AA | UI-jelölés ≥ 3:1 | Fókuszgyűrű **4,72 / 5,16 / 5,45:1** (tint / paper / fehér). GYIK `+` és `−` jele **8,80:1**. Elsődleges gomb felülete a tint sávon **5,45:1** | teljesül |
| **1.4.12** Text Spacing | AA | 1,5-ös sortáv, 0,12em betűköz, 0,16em szóköz, 2em bekezdésköz mellett sincs tartalomvesztés | A felülíró stíluslap után: dokumentum-szélesség **1440 → 1440 px** (nincs vízszintes görgetés), laphossz **18 202 → 21 956 px**, levágott vagy túlcsorduló elem **0** | teljesül |
| **2.1.1** Keyboard | A | minden működés billentyűvel | 35 fókusz-állomás, mind natív `a` / `summary` / gomb; egyedi JS-kezelő nincs | teljesül |
| **2.3.3** Animation from Interactions | AAA | a nem lényegi mozgás kikapcsolható | `prefers-reduced-motion: reduce` mellett minden `transition-duration` **0,00001 s**-re esik, és a `scroll-behavior` **`smooth` → `auto`** | teljesül |
| **2.4.1** Bypass Blocks | A | átugorható ismétlődő blokk | `.kc-skip-link` az első fókusz-állomás, doboza **187,2 × 54 px** | teljesül |
| **2.4.3** Focus Order | A | a fókusz sorrendje a vizuálisat követi | 35 állomás, DOM-sorrend = vizuális sorrend; sorrend-ugrás **0** | teljesül |
| **2.4.7** Focus Visible | AA | a fókusz látszik | mind a 35 állomáson `outline: solid 3px`, `outline-offset: 2px` | teljesül |
| **2.4.10** Section Headings | AAA | a szakaszoknak van címe | 26 címsor, minden lap-szekció H2-vel indul. **Kivétel:** a kapcsolódó kártyák címe `<span>`, nem címsor, tehát a három ajánlott cikk nem jelenik meg a címsor-listában (3.2) | részben |
| **2.4.11** Focus Not Obscured (Minimum) | AA | a fókuszált elem nem tűnhet el szerzői tartalom alatt | 72 px magas, `z-index: 50` ragadós fejléccel szimulálva 1440, 390 és 320 px-en: **0 takart fókusz-állomás**. Horgony-ugrásnál a cél címsor teteje **79,6–80,0 px**, a fejléc alja **72 px** → **7,6–8,0 px** tartalék, amit a `scroll-padding-top: 80px` ad | teljesül |
| **2.4.13** Focus Appearance | AAA | vastag, kontrasztos fókuszjel | **3 px** tömör gyűrű, **2 px** eltartás, kontraszt **4,72–5,45:1** | teljesül |
| **2.5.8** Target Size (Minimum) | AA | ≥ 24 × 24 CSS px | 23 nem-inline célból **0** esik 24 px alá; a 12 mondatba ágyazott forrás-hivatkozásra a normatív **Inline**-kivétel áll | teljesül (de lásd 3.3) |
| **3.1.1** Language of Page | A | a lap nyelve jelölt | `<html lang="hu">` | teljesül |

### 1.2 A három tipográfiai token

A skill 7. pontja új betűméretet tilt. **Mért:** a lapon nézetablakonként
PONTOSAN három különböző számított `font-size` fordul elő, sehol egy negyedik:

| Nézetablak | L | M | S |
|---|---|---|---|
| 320 px | 32,00 px | 16,00 px | 13,00 px |
| 390 px | 32,55 px | 16,06 px | 13,03 px |
| 768 px | 38,98 px | 16,82 px | 13,48 px |
| 1024 px | 43,33 px | 17,33 px | 13,79 px |
| 1440 px és felette | 46,40 px | 18,00 px | 14,00 px |

A clamp-lépcsők a `tokens.css` `--kc-font-l/m/s` értékeivel egyeznek. Új méret
bevezetése tehát nem történt.

### 1.3 Fejléc-hierarchia: hézagmentes

Mért címsor-fa (1440 px, a teljes lap):

```
h1  Miért zsibbad a kezem?                          46,40 px  Tenor Sans 400
  h2  Ezen az oldalon                               18,00 px  Nunito Sans 700
  h2  … a törzs 13 szakaszcíme …                    46,40 px  Tenor Sans 400
    h3  … 8 alszakasz …                             18,00 px  Nunito Sans 700
  h2  Források                                      46,40 px  Tenor Sans 400
  h2  Gyakori kérdések                              46,40 px  Tenor Sans 400
  h2  A cikket írta és ellenőrizte                  18,00 px  Nunito Sans 700
  h2  Hogyan tovább?                                18,00 px  Nunito Sans 700
  h2  További cikkek a témában: Kézzsibbadás        46,40 px  Tenor Sans 400
```

**h1 darabszám: 1. Szintugrás: 0.** A tartalomban álló markdown-h1 a
szerializáló lágyításával h2-ként jelenik meg, tehát a szerkesztő akkor sem tud
második h1-et becsempészni, ha a törzsbe másolja a címet.

A H1 és a H2 azonos méretét a pozíció és a felvezető sor különbözteti meg. Ez a
tervben kimondott, tudatos döntés, és mérve nem okoz hierarchia-hibát: a
képernyőolvasó a szintet a jelölésből olvassa, nem a méretből.

### 1.4 Sorhossz, magyar szöveggel mérve

A mérés a `Range.getClientRects()` soronkénti valódi tördeléséből számol
(karakterenként), nem `ch`-egységből. A záró, részleges sor kimarad.
Min / medián / max karakter/sor:

| Elem | 320 px | 390 px | 768 px | 1024 px | 1440 px | 1920 px |
|---|---|---|---|---|---|---|
| Folyószöveg (`.kc-richtext p`) | 18/34/43 | 25/44/53 | 45/68/**76** | 45/66/76 | 45/63/74 | 45/63/74 |
| Felsorolás (`.kc-richtext li`) | 20/29/34 | 28/39/44 | 37/56/71 | 37/55/65 | 37/55/65 | 37/55/65 |
| Lead (`.kc-page-hero__lead`) | 29/31/37 | 39/43/51 | 52/65/65 | 52/60/60 | 52/52/60 | 52/52/60 |
| GYIK-válasz (`.kc-faq__answer`) | 28/34/38 | 38/44/48 | 66/71/73 | 56/68/71 | 53/64/67 | 53/64/67 |
| CTA-panel szövege | 26/29/29 | 36/38/38 | 66/66/66 | 55/55/55 | 55/55/55 | 55/55/55 |
| Szerző-bemutatkozás | 19/23/24 | 24/42/42 | 66/66/66 | 66/66/66 | 66/66/66 | 66/66/66 |
| Tartalomjegyzék-tételek | 16/23/27 | 30/32/37 | 30/38/55 | 30/38/55 | 30/38/55 | 30/38/55 |
| **Kapcsolódó kártya kivonata** | 23/28/30 | 36/39/41 | 26/36/39 | 23/30/34 | **26/33/38** | 26/33/38 |

**A folyószöveg 768 px-től végig a 45–85-ös tűrésen belül van**
(`docs/ui-sztenderdek.md` Ü6), 1024 px felett a medián a **63–66**-os
cél-sávban (cél 50–75). A 390 px alatti értékek a kis kijelző adottságai: 45
karakterhez 16 px-es törzsméretnél 319,8 px szövegdoboz kellene, a 320 px-es
nézetablakban viszont csak 272 px áll rendelkezésre. Ez a terv 5.2 pontjában
kimondott, elfogadott korlát.

**A kapcsolódó kártya kivonata az egyetlen kivétel: lásd 3.1.**

### 1.5 Bekezdésköz (1.4.8 AAA)

| Nézetablak | Betű | Sortáv | Két bekezdés közti üres táv | Bekezdésköz | Küszöb (1,5 × sortáv) | Tartalék |
|---|---|---|---|---|---|---|
| 320 px | 16,00 | 26,72 | 16,00 | 42,72 | 40,08 | **+2,64** |
| 390 px | 16,06 | 26,82 | 16,00 | 42,82 | 40,23 | **+2,59** |
| 768 px | 16,82 | 28,08 | 16,00 | 44,08 | 42,12 | **+1,96** |
| 1024 px | 17,33 | 28,94 | 16,00 | 44,94 | 43,41 | **+1,53** |
| 1440 px | 18,00 | 30,06 | 16,00 | 46,06 | 45,09 | **+0,97** |

Teljesül, de a tartalék 1440 px-en **kevesebb, mint 1 pixel** (lásd 3.4).

### 1.6 A CTA és a kapcsolódó blokk közti hamis lapvég

A terv 5.8 pontja **72 px**-es küszöböt szabott a CTA-panel alja és a
kapcsolódó szekció címsora közti üres távra (NN/g *Related Content Boosts
Pageviews*: a nagy üres felület hamis lapvéget jelez). **Mért érték mind a hét
nézetablakon: 56,0 px.** A `post-view.css` kétosztályos szelektorai a szekció
alapértelmezett 48/88 px-es paddingjét felülírják, tehát a küszöb nézetablaktól
függetlenül tartja magát.

### 1.7 Nyomtatás

Nyomtatási médiában a `.kc-post-body a[href^='http']::after` kiírja a webcímet:
mérve `" (https://www.nhs.uk/conditions/pins-and-needles/)"`. Egyetlen szekció
sem esik ki (`.kc-post-toc`, `.kc-post-faq`, `.kc-post-author`,
`.kc-post-cta__panel`, `.kc-post-related` mind `display: block`). Papíron tehát
a forrásjegyzék ellenőrizhető marad, ami orvosi tartalomnál nem díszítés.

### 1.8 Mikroszöveg

A renderelt lapon **kvirtmínusz (U+2014): 0 db, nagykötőjel (U+2013): 0 db,
mínuszjel (U+2212): 0 db**. A meta-sor elválasztó karakter nélkül, flex-réssel
tagol (`content.css` `.kc-post-meta`, `gap: 8px 16px`), tehát a tiltott
töltelék-gondolatjel sem vizuálisan, sem a felolvasott szövegben nem jelenik meg.

---

## 2. Ahogy mértem

Reprodukálható lépések (a harness a scratchpadben áll, nem a repóban):

1. **Renderelés.** `PostArticle` szerver-oldali renderelése
   `renderToStaticMarkup`-pal, a valódi cikkvázlat Lexical-dokumentummá
   alakított szövegével. Ez pontosan az a kimenet, amit a JS nélküli látogató és
   a keresőrobot lát.
2. **Kiszolgálás.** Helyi HTTP-kiszolgáló adja a lapot, a repó valódi
   `woff2`-betűit, és a képek helyén arányhelyes (16:9, illetve portrénál 1:1)
   helyettesítőt. **Ez fontos:** az első körben 1:1-es helyettesítővel mértem, és
   a borító 1070 px magasnak látszott 1440 px-en; a `width`/`height`
   attribútumból jövő arányt a betöltött kép valódi aránya felülírja
   (`height: auto` mellett). A helyes aránnyal a borító **602 px**. A hibás
   mérést eldobtam, a táblákban a javított értékek állnak.
3. **Mérés.** CDP-n injektált mérőkönyvtár: WCAG relatív luminancia szerinti
   kontraszt (a háttér a gyökértől lefelé kompozitálva, alfával), elem-dobozok,
   soronkénti karakterszámlálás `Range`-dzsel, `Emulation.setDeviceMetricsOverride`
   a nézetablakokhoz, `Emulation.setEmulatedMedia` a `prefers-reduced-motion`
   és a nyomtatási nézet váltásához, `Input.dispatchKeyEvent` VALÓDI Tab-okkal
   a `:focus-visible` bejáráshoz.
4. **Amit NEM mértem, és miért.** A fejléc (`Header`) és a lábléc (`Footer`)
   szerver-komponensek adatbázisból olvasnak (`getNavTree`), ezért ebben a
   harnesszben nem renderelhetők. A 2.4.11-es takarás-mérésnél ezért a
   fejléc geometriáját szimuláltam: `position: sticky; top: 0; height: 72px;
   z-index: 50`, ami a `layout.css` és a `tokens.css`
   (`--kc-header-height: 4.5rem`) mért értéke. A süti-sáv (`--kc-consent-offset`)
   szintén kimaradt. **Ezt a két blokkot élő környezetben, böngészőből is végig
   kell járni**, mielőtt a kör késznek minősül.

**Egy hamis riasztás, amit itt rögzítek, hogy más se dőljön be neki.** A puszta
téglalap-összevetés szerint az „Ugrás a tartalomra" ugrólinket takarja a ragadós
fejléc. Nem takarja: `document.elementFromPoint` a link közepén és bal felső
sarkában is magát a linket adja vissza, mert a `.kc-skip-link` `z-index`-e
**100**, a fejlécé **50**. Doboza fókuszban 187,2 × 54 px, `y = 8`, teljesen
látható. A 2.4.11 tehát itt is teljesül, de csak a festési sorrend mérésével
látszik, a dobozokéból nem.

---

## 3. Ami NEM teljesül, és mit kell tenni

### 3.1 SÚLYOS: a kapcsolódó kártyák kivonata 24–38 karakter/sor

**A terv mit ígért.** A `docs/tudastar-ux-terv.md` 3.1 pontja a kártyának KÉT
változatot ír elő, és a `compact` változatból **kiveszi a kivonatot**. Szó
szerint: *„A hármas rácsban a kivonat sorhossza mérve 28,8–36,4 karakter, a
45-ös tűréshatár alatt. A kivonatot nem elrejteni kell (az továbbra is ott lenne
a DOM-ban, olvashatatlanul), hanem nem odatenni."* Ugyanez a 8. fejezet
fájl-táblájában: `PostCard.tsx` → *„két változat (`list` / `compact`)"*, és a
kapcsolódó blokk *„a kapcsolódó kártyák `compact` változata"*.

**Amit mértem.** A `PostCard` ma egyetlen változatban létezik, és mindig
kirendereli a kivonatot. A `PostArticle` a kapcsolódó blokkot a KÖZÖS
`.kc-card-grid` osztállyal építi (`PostArticle.tsx`), nem a Tudástárra
szabott `.kc-card-grid--posts` módosítóval, amit a `/blog` lista megkapott
(`blog/page.tsx` → `tudastar-lista.css:44`).

| Nézetablak | Rács-oszlopok | Kártya | Kivonat-doboz | **Kivonat karakter/sor (medián)** |
|---|---|---|---|---|
| 640 px | 284 + 284 px | 284 px | 234 px | **31** |
| 768 px | 348 + 348 px | 348 px | 298 px | **38** |
| 900 px | 268 × 3 | 268 px | 218 px | **24** |
| 1024 px | 309 × 3 | 309 px | 259 px | **32** |
| 1440 px | 341 × 3 | 341 px | 291 px | **33** |
| 1920 px | 341 × 3 | 341 px | 291 px | **33** |

A 900 px-es váltás a legrosszabb: ott a **három hasáb 24 karakteres sorokat**
ad, vagyis a nézetablak SZÉLESEDÉSE rontja az olvashatóságot (640 px-en 31,
768-on 38, 900-on 24). Egy 135 karakteres kivonat 1440 px-en **5 sorra** törik
(mért doboz-magasság 150,2 px, sortáv 30,06 px), noha a terv **legfeljebb 3
sort** engedett; sorkorlát nincs a CSS-ben (`-webkit-line-clamp: none`,
`overflow: visible`, `max-height: none`).

**Melyik szabályt sérti.** Nem WCAG-bukás: az 1.4.8 (AAA) csak felső, 80
karakteres plafont ad. A repó SAJÁT szabályát sérti: `docs/ui-sztenderdek.md`
Ü6, szó szerint *„tűrés 45–85, cél 50–75. A 85 feletti sor bukás; a 45 alatti
(túl keskeny hasáb) szintén, mert töredezi az olvasást."*

**Javítási javaslat (a legkisebb beavatkozás sorrendjében).**

1. `PostArticle.tsx`, a kapcsolódó blokk rácsa kapja meg a Tudástár
   módosítóját: `className="kc-card-grid kc-card-grid--posts"`. Ez a
   `tudastar-lista.css:44` `repeat(auto-fit, minmax(min(100%, 26rem), 34rem))`
   szabályát hozza be, ami a terv 3.1 mérése szerint 904 px-től két hasábot és
   **48,1–59,0** karakter/sort ad. Egy sor változás, új CSS nélkül.
2. Ha a hármas rács a kapcsolódó blokkban megmarad (mert a három ajánlás
   pontosan egy teli sor), akkor a terv eredeti megoldása kell:
   `PostCard`-nak `variant?: 'list' | 'compact'` propot adni, és a `compact`
   ágon a kivonatot **nem renderelni**. Ez a `PostCard.tsx` tulajdonosának
   feladata, és a kezdőlapi `KnowledgeSection`-t is érinti.

Az 1. és a 2. közti választás vezetői döntés. Mérésileg mindkettő megszünteti a
45 alatti sorokat; az 1. gyorsabb, a 2. felel meg szó szerint a tervnek.

### 3.2 SÚLYOS: a kártya-link hozzáférhető neve 206–227 karakter

**A terv mit ígért.** Az UX-terv 3.5 pontja ezt nevezi *„a terv legfontosabb
akadálymentességi javaslatának"*, és **mérhető elfogadási feltételt** ad: *„a
kártya `<a>` elemének hozzáférhető neve legyen azonos a cikk címével, és ne
haladja meg a 80 karaktert."* A megoldás is ki van írva: a `<a>` csak a címre
kerül, a kártya `<h2>`-je belsejébe, és a `::after` pszeudoelem
(`position: absolute; inset: 0`) tartja meg a teljes kártyát kattinthatónak.

**Amit mértem** a három kapcsolódó kártyán 1440 px-en:

| Kártya | Hozzáférhető név hossza | A név eleje |
|---|---|---|
| 1. | **206 karakter** | „KézzsibbadásKéztőalagút-szindróma: mit tehetsz otthon?A kéztőalagút-szindróma a leggyakoribb…" |
| 2. | **227 karakter** | „KézzsibbadásTeniszkönyök: miért fáj, és mennyi idő alatt javul?A teniszkönyök a legtöbb embernél…" |
| 3. | **212 karakter** | „KézzsibbadásPattanó ujj: mi történik az ínhüvelyben?Reggel beragad az ujjad, majd hangos kattanással…" |

`aria-label` egyiken sincs, tehát a név a link teljes szövegtartalma:
kategória-címke + cím + kivonat + dátum, szóköz nélkül összeragadva. A kártya
címe ráadásul `<span class="kc-post-card__title">`, **nem címsor**, ezért a
képernyőolvasó címsor-listájában a kapcsolódó cikkek egyáltalán nem jelennek
meg (`PostCard.tsx`).

**Melyik szabályt sérti.** A WCAG 2.4.4 (A, Link Purpose in Context) és 2.4.9
(AAA, Link Purpose Link Only) betűjét nem sérti, mert a cél a névből kiderül; a
terv saját, 80 karakteres elfogadási feltételét **2,6–2,8-szorosan** lépi túl,
és a 2.4.10 (AAA, Section Headings) sem teljesül a kártyákra.

**Külső forrás, ami ugyanezt mondja.** NHS digital service manual, *Card*:
*„For clickable cards, avoid wrapping the entire card in an anchor tag as this
can be a difficult experience for screen reader users."*
(https://service-manual.nhs.uk/design-system/components/card, hozzáférés:
2026-08-21). W3C WAI-ARIA APG, *Providing Accessible Names and Descriptions*:
minden azonos szerepű elemnek egyedi, önmagában érthető nevet kell adni
(https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/, hozzáférés:
2026-08-21). NN/g, *Writing Hyperlinks*: az emberek *„mostly look at the first 2
words of a link"* (https://www.nngroup.com/articles/writing-links/, hozzáférés:
2026-08-21). 206 karakteres névnél az első két szó a kategória neve, ami mind a
három kártyán AZONOS („Kézzsibbadás"), tehát a link-lista a rotorban
megkülönböztethetetlen.

**Javítási javaslat.** Pontosan a terv 3.5 pontja, változtatás nélkül:

```
<Card as="article" className="kc-post-card" interactive padded={false}>
  <span className="kc-post-card__cover">…</span>       ← a linken KÍVÜL
  <span className="kc-post-card__categories">…</span>  ← a linken KÍVÜL
  <h3 className="kc-post-card__title">
    <Link className="kc-post-card__link" href={…}>{post.title}</Link>
  </h3>
  <span className="kc-post-card__excerpt">…</span>     ← a linken KÍVÜL
  …
</Card>
```

plus a CSS-ben `.kc-post-card { position: relative }` és
`.kc-post-card__link::after { content: ''; position: absolute; inset: 0 }`.
A címsor szintje **h3** legyen, mert a kapcsolódó szekció címe már h2
(`kc-section-title`), így a hierarchia hézagmentes marad.

**Fájl-tulajdon.** `src/components/content/PostCard.tsx` és
`styles/blocks/knowledge.css`. A fájl ebben a körben nem módosult (utolsó
érintés: `a438641`, a #35-ös PR), tehát a terv 3.5 pontja **nem került
megvalósításra**. A javítás a `/blog` listát és a kezdőlapi Tudástár-szekciót is
érinti, ezért a vezetőnek egy külön, egy fájlt birtokló ügynökre érdemes bíznia.

### 3.3 KÖZEPES: a fejléc kategória-címkéje 28,8 × 105,3 px

**Amit mértem.** A cikkfejlécben a kategória-címke link
(`.kc-post-hero__categories a` → `.kc-badge--info`):

| Nézetablak | Link doboza | A címke doboza |
|---|---|---|
| 320 px | 105,3 × **28,8** px | 105,3 × 30,4 px |
| 768 px | 108,2 × **29,6** px | nem mérve |
| 1440 px | 111,6 × **32,4** px | 111,6 × 30,4 px |

**Melyik szabályt sérti.** A WCAG 2.2 **2.5.8** (AA) 24 × 24 CSS px-es küszöbét
**teljesíti** (28,8 > 24), és a normatív *Spacing*-kivétel is állna, mert a
címke egyedül áll a saját bekezdésében. A repó saját szabályát sérti:
`docs/ui-sztenderdek.md` 6. fejezete *„≥ 44 × 44 CSS px minden
gombra/menüpontra"*-t ír elő, és az UX-terv 6.1 pontja szó szerint azt állítja,
hogy *„a repó gyakorlata 44 × 44 (a 2.5.5 AAA szintje): a chipek, a gombok és a
tartalomjegyzék-linkek is"*. Ez a lap egyetlen olyan interaktív eleme, ahol ez
nem igaz: a tartalomjegyzék linkjei **44,0–80,2 px**, a GYIK-nyitók
**51,2–70,4 px**, az elsődleges gomb **72,8 px** magasak.

**Javítási javaslat.** A `.kc-badge` maradjon érintetlen (címkeként máshol nem
interaktív), és a **link** kapja a célfelületet:

```css
/* post-view.css: a kategória-címke a fejlécben LINK, tehát 44 px-es
   érintőcél jár neki (docs/ui-sztenderdek.md 6.; WCAG 2.2 2.5.5 AAA). */
.kc-post-hero__categories a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
}
```

Ez a `post-view.css`-ben él, tehát nem nyúl közös lapba, és a mért doboz
28,8 → 44,0 px-re nő minden nézetablakon.

### 3.4 ALACSONY: a bekezdésköz tartaléka 1440 px-en 0,97 px

Ez a terv saját K4 nyitott kérdése, és a mérés megerősíti: a `--kc-space-4`
(16 px) bekezdés-margóval a 1.4.8 (AAA) elvárása 1440 px-en **45,09 px**, a
tényleges bekezdésköz **46,06 px**. A tartalék **kevesebb, mint egy pixel**.
A következő betűméret- vagy sortáv-hangolás észrevétlenül átbillenti.
`--kc-space-5`-tel (24 px) a tartalék **+8,97 px** lenne.

**Miért nem javítottam.** A `.kc-richtext` KÖZÖS lap (`content.css`): a
kurzus-leírásokat és a jogi oldalakat is rendereli, tehát nem az én fájlom, és a
`reflow-hasabmeres.test.ts` őrt újra kell futtatni utána. **Vezetői döntés
kell.**

### 3.5 ALACSONY: a 13 tételes tartalomjegyzék egy egész mobil-képernyő

**Amit mértem** a valódi, 13 szakaszos cikken:

| | 390 × 844 px | 1440 × 900 px |
|---|---|---|
| Tartalomjegyzék magassága | **697 px** (a nézetablak **82,6%-a**) | **652 px** (72,4%) |
| Az első bekezdés kezdete borítóval | 1 470 px = **1,74 képernyő** | 1 899 px = **2,11 képernyő** |
| Az első bekezdés kezdete borító nélkül | 1 277 px = **1,51 képernyő** | 1 295 px = **1,44 képernyő** |

A terv 5.4 pontja ALSÓ küszöböt ad (800 szó VAGY 5 szakaszcím), felsőt nem.
Az NN/g *In-Page Links for Content Navigation* vizsgálata a mintát támogatja
(11 résztvevőből 9 ismerte), és azt kéri, hogy a jegyzék a lap tetején álljon,
hogy az olvasó *„form a mental model of the page"*. Darabszám-plafont viszont
nem ad (https://www.nngroup.com/articles/in-page-links-content-navigation/,
hozzáférés: 2026-08-21). Ugyanez a cikk figyelmeztet: mobilon kerülendő, ha a
lap emiatt túl hosszúra nyúlik.

**Ez nem WCAG-bukás**, és a jegyzék hasznos. Amit mérni érdemes élesben:
a 320–390 px-es látogatók görgetés-mélységét az első bekezdésig. Ha ez fájni
fog, két olcsó, sztenderd megoldás áll rendelkezésre, mindkettő a repó meglévő
nyelvén:

1. A jegyzék `details/summary` harmonikába kerül, **mobilon alapból csukva**
   (a `.kc-faq` mintájával, ugyanaz a `+`/`−` jel, ugyanaz a 44 px-es nyitó).
   Asztali nézetben nyitva marad.
2. A borítókép mobilon kimarad vagy alacsonyabb vágást kap. Mérve: borító
   nélkül az első bekezdés 1,74 helyett **1,51 képernyőre** kerül 390 px-en.

Vezetői döntés kell, mert a jegyzék viselkedése a `PostToc` és a `post-view.css`
tulajdonosát érinti, a borító-kérdés pedig a terv K1 nyitott kérdése.

### 3.6 ALACSONY: a jegyzék doboza 128 px-szel szélesebb a szövegoszlopnál

Mért érték 1440 px-en: a `.kc-post-toc` doboza **672 px**, a folyószöveg
oszlopa `--kc-measure` miatt **544 px**. A jegyzék tehát **23,5%-kal**
túlnyúlik a szövegoszlopon, ami a bal szélen illeszkedő, jobb szélen elváló
peremet ad. Nem szabálysértés (a jegyzék sorhossza 30–55 karakter, a tűrésen
belül), de vizuális rendetlenség. Egyetlen sor javítja:

```css
.kc-post-toc { max-width: var(--kc-measure); }
```

### 3.7 TARTALMI MEGJEGYZÉS: a hosszú magyar cím 320 px-en öt sor

Egy 65 karakteres magyar cikkcímmel (az NHS ajánlásának felső határa) mérve:

| Nézetablak | H1 doboza | Betűméret | Sorok | Karakter/sor |
|---|---|---|---|---|
| 320 px | 272 px | 32,00 px | **5** | 12–15 |
| 390 px | 342 px | 32,55 px | 4 | 18–21 |
| 768 px | 672 px | 38,98 px | 2 | 34 |
| 1440 px | 672 px | 46,40 px | 3 | 24–27 |

Nem hiba, hanem szerkesztői korlát: **320 px-en a 65 karakteres cím öt sort,
192 px-t foglal**. A szerkesztői útmutatóban érdemes rögzíteni, hogy a magyar
cikkcím célhossza inkább **45–55 karakter**, mert a Tenor Sans verzálisai
szélesek, és a 65-ös NHS-plafon angol szövegre készült.

---

## 4. Amit még kézzel végig kell járni

A harness a lap TARTALMÁT méri; ezek a körök nélküle nem zárhatók le:

1. **Fejléces és süti-sávos fókusz-bejárás élő környezetben.** A 2.4.11-es
   mérés szimulált fejléccel készült. A `--kc-consent-offset` alsó sávval együtt
   kell újra végigtabolni, mobilon is.
2. **Képernyőolvasós link-lista** (NVDA elem-lista, VoiceOver rotor) a
   cikkoldalon. A 3.2 pont javítása után ellenőrizendő, hogy a kártya-linkek
   nevei a cikkcímek-e.
3. **200%-os nagyítás valódi böngésző-zoommal** 1280 px-es ablakban. A 640 px-es
   nézetablak matematikailag egyenértékű, de a böngésző-zoom a betűk
   raszterizálását is érinti.
4. **Kognitív séta** a keresőből érkező, a kezdőlapot soha nem látott
   látogatóval (`docs/felhasznaloi-seta.md` mintája).

---

## 5. Források

Külső, ellenőrizhető források, hozzáférés dátumával. Minden hivatkozott állítás
szó szerint szerepel a fenti pontokban.

- W3C, *Understanding SC 2.5.8: Target Size (Minimum)* (a normatív Inline- és
  Spacing-kivétel szövege):
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  (hozzáférés: 2026-08-21)
- W3C, *Understanding SC 2.4.11: Focus Not Obscured (Minimum)* (ragadós fejléc,
  `scroll-padding` mint megoldás):
  https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
  (hozzáférés: 2026-08-21)
- W3C, *WCAG 2.2, SC 1.4.10 Reflow*: https://www.w3.org/TR/WCAG22/#reflow
  (hozzáférés: 2026-08-21)
- W3C WAI-ARIA APG, *Providing Accessible Names and Descriptions*:
  https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
  (hozzáférés: 2026-08-21)
- NHS digital service manual, *Card* („avoid wrapping the entire card in an
  anchor tag"): https://service-manual.nhs.uk/design-system/components/card
  (hozzáférés: 2026-08-21)
- Nielsen Norman Group, *In-Page Links for Content Navigation*:
  https://www.nngroup.com/articles/in-page-links-content-navigation/
  (hozzáférés: 2026-08-21)
- Nielsen Norman Group, *Writing Hyperlinks: Salient, Descriptive, Start with
  Keyword*: https://www.nngroup.com/articles/writing-links/
  (hozzáférés: 2026-08-21)
- Nielsen Norman Group, *Related Content Boosts Pageviews, When Done Right*:
  https://www.nngroup.com/articles/related-content-pageviews/
  (hozzáférés: 2026-08-21)

Repón belüli, normatív hivatkozások:
`docs/ui-sztenderdek.md` (Ü6 sorhossz-tűrés, 6. fejezet érintőcél és
mérés-kötelezettség), `docs/tudastar-ux-terv.md` (3.1 kártya-változatok,
3.5 kártya-link, 5.2 sorhossz, 5.4 tartalomjegyzék, 5.8 CTA-küszöb, 6.1–6.3
akadálymentesség), `docs/tudastar-technikai-terv.md` (9. fejezet őr-tesztek),
`.claude/skills/termektervezes/SKILL.md` (3. pont: küszöbök és a
mérés-kötelezettség).
