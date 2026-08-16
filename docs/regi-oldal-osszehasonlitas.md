# Régi kineticare.hu ↔ új platform: navigáció, gombok, vásárlási út

> **Mi ez?** A tulajdonos kérése: *„az eredeti weboldalt is nézzétek, hogy működnek a
> gombok, hogy navigál, mi navigál hova."* Ez a dokumentum a **régi, ma is élő**
> `www.kineticare.hu` és az **új platform**
> (`https://kineticare-production.up.railway.app`) navigációs, gomb- és
> folyamat-logikáját veti össze, és megmondja, mit érdemes a régiből visszahozni vagy
> megtartani.
>
> **Készült:** 2026-08-16 · **Módszer:** kizárólag olvasó (GET) HTTP-mérés mindkét
> oldalon. A régi oldal **mind a 25 sitemap-URL-jének státusza mérve**, ebből
> **20 teljes HTML-je elemezve** (az 5 idegen spam-poszt kihagyva); az új
> oldalon **22 lekérés**. Ehhez jön a repó olvasása. Minden állítás mögött nyers
> HTML-ből kinyert adat áll, a reprodukciós parancsok a 11. szakaszban.
>
> **Mi NEM ez?** Nem tartalom-leltár (`docs/tartalom-leltar-regi-oldal.md`), nem
> ténykutatás a régi oldalról (`docs/regi-oldal-valaszok.md`), nem grafikai leltár
> (`docs/grafikai-leltar-regi-oldal.md`), nem az ÚJ oldal belső IA-diagnózisa
> (`docs/informacios-architektura.md`), és **nem CTA-szótár**: a normatív szótár
> a `docs/ui-sztenderdek.md` §3.2, a mért gomb-leltár a `docs/gomb-inventar.md`.
> Ahol átfedés van, hivatkozom, nem ismétlem. Kódot nem módosít.
>
> **Kötelező háttér:** `docs/ertekesitesi-ux-skill.md` (M1–M8), `CLAUDE.md`
> (TILOS ZÓNÁK), `.claude/skills/termektervezes`.

---

## 1. Vezetői összefoglaló

**A nagy kép:** az új oldal **navigációként és információs architektúraként jobb**
a réginél (mélyebb, kereshető menüfa, beszédes URL-ek, valódi címsor-hierarchia,
konzisztens fejléc minden oldalon, látható ár már a kezdőlapon). A **gombok
nyelve** viszont két ponton rosszabb lett, a **tölcsér teteje pedig el van vágva**:
a régi oldal ingyenes lead-magnet útja (szórólap-QR → `/kezrelax` → e-mail →
ajánlat) az új oldalon **nem működik**, és a régi URL-ekre **egyetlen átirányítás
sincs**.

Három mérés, ami ezt bizonyítja:

1. `GET https://kineticare-production.up.railway.app/kezrelax` → **HTTP 404**.
   A szórólapokra nyomtatott QR-kód célja a domain-átállítás pillanatában
   halott linkké válik. Ugyanígy `/kezrehab` → 404 és `/rendeloi-kezelesek` → 404.
2. A `next.config.ts`-ben **nincs `redirects()` függvény** (a fájl 64 sor, csak
   `rewrites`, `headers`, `skipTrailingSlashRedirect`), és a `src/middleware.ts`
   (31 sor) sem tartalmaz legacy-szabályt. **Nulla 301-es átirányítás létezik ma.**
3. Az ingyenes kurzus oldalán a gomb felirata **„Megveszem"**, ár nélkül, és a
   `/penztar?termek=2` **számlázási címet kér összeg feltüntetése nélkül**. A
   `src/lib/checkout/start-checkout.ts:260-267` szerint a beküldés
   `„A termékhez nem tartozik érvényes ár, így nem vásárolható meg."` hibával
   400-zal elhasalna. (Ugyanez a hiba `docs/informacios-architektura.md` TOP-3.
   pontja; egymástól függetlenül mértük.)

### TOP 10 — mit érdemes a régiből visszahozni vagy megtartani

Sorrend: üzleti hatás × hány látogatót ér.

| # | Teendő | Régin hogy volt | Ma hogy van | Súly |
| --- | --- | --- | --- | --- |
| **1** | **Az ingyenes SOS útjának helyreállítása** (QR-lánc): 301 a `/kezrelax`-ról, a terméken az „ingyenes" jelölés, a gombon igaz felirat | Önálló landing, „KÉREM A VILLÁMKURZUST", e-mail-cím ellenében, ár és pénztár nélkül | `/kezrelax` → 404; a kurzuson „Megveszem", ár nélkül, számlázási űrlappal | **10** |
| **2** | **301-térkép a 25 régi URL-re** (8. szakasz), különösen a `/kezrehab`-ra és a `/kezrelax`-ra | Mind a 25 URL él (mérve: HTTP 200), indexelt | Nincs egyetlen átirányítás sem | **10** |
| **3** | **Vélemények és GYIK vissza a fizetős kurzusoldalra** | `/kezrehab`: 10 páciens-vélemény + 5 szakmai ajánló + 3 GYIK | `/kurzusok/otthoni-kezrehab-program`: **0 vélemény, 0 GYIK** (mérve: a „Vélemény" és a „Gyakori kérdések" sztring **0** előfordulás a HTML-ben; az ingyenes kurzuson ugyanez 2 és 2) | **9** |
| **4** | **A kezdőlapi ingyenes CTA konkrét célra mutasson** | „KÉREM A VILLÁMKURZUST" → `/kezrelax` (a konkrét ajánlat) | „Elindítom az ingyenes kurzust" → **`/kurzusok`** (általános lista) | **8** |
| **5** | **A Kapcsolat oldal elérhetőségei** | Telefon, 2 budapesti helyszín Google Maps-szel, „legkésőbb 2 munkanapon belül", Instagram + Facebook ikon | **Csak űrlap.** 0 telefonszám, 0 cím, 0 közösségi média, 0 válaszidő-ígéret (mérve) | **8** |
| **6** | **„Tovább a programra" mutasson a kurzusoldalra** | `/` → `/kezrehab` (1 kattintás a sales-oldalig) | `/` → `/kurzusok` (lista, +1 kattintás) | **7** |
| **7** | **Sajtólogó-sor vissza a hero alá** | A 6 médialogó a kezdőlap **2. eleme**, közvetlenül a hero alatt | A `pressLogos` az **5. szekció**, az ingyenes sáv után | **6** |
| **8** | **Rendelői árlista + lemondási szabályzat önálló, kereshető helyre** | Saját oldal (`/rendeloi-kezelesek`): árlista, 24 órás lemondás, 8 kiegészítő terápia tételesen, 10 technikai fotó | `/szolgaltatasok#rendeloi` horgony, folyó szövegben; a **24 órás lemondási szabály sehol nincs** | **6** |
| **9** | **Pénztár-bizalom** | A pénztár mellett termék-összefoglaló + 2 vélemény + orvosi kikötés + ÁSZF és adatvédelmi pipa | Csak űrlap. A **Barion neve nem szerepel** a pénztáron (mérve: 0 előfordulás), nincs ÁSZF-elfogadó pipa | **5** |
| **10** | **16 partnerlogó és a kezelési technikák fotótára** | `/rolunk`: 16 kattintható partnerlogó; `/rendeloi-kezelesek`: 10 saját technikai fotó | Mindkettő puszta szöveggé fokozva (részletek: `docs/grafikai-leltar-regi-oldal.md`) | **4** |

### Amit a régiből MEG KELL TARTANI (ma is jól van)

- **A három felső menüpont neve és sorrendje** („Szolgáltatások", „Rólunk",
  „Kapcsolat") változatlan. Jakob törvénye szerint pontosan ezt kell csinálni:
  a visszatérő vevő ugyanott, ugyanazon a néven találja meg őket
  ([NN/g, Jakob's Law](https://www.nngroup.com/videos/jakobs-law-internet-ux/)).
- **Az egyes szám első személyű (E/1) gombnyelv** — de ez ma **vitatott**. A
  régi oldal **kivétel nélkül** E/1-ben beszélt („KÉREM A PROGRAMOT",
  „MEGRENDELEM", „MEGNÉZEM", „ELKÜLDÖM"), és a mai új oldal is („Megveszem",
  „Feliratkozom", „Időpontot kérek"). A `docs/ui-sztenderdek.md` §3.2 viszont
  **E/2-es** szótárt javasol („Vedd meg a kurzust"). A megszokás megtartása az
  E/1 mellett szól, a tervezési érvek az E/2 mellett; a döntés a vezetőé
  (K1 a 9. szakaszban). Részletek: 3.4.
- **A regisztráció-mentes vásárlás.** A régi pénztáron nem kellett fiókot
  létrehozni, és az új is ezt írja ki: *„A vásárláshoz nem kell regisztrálni."*
  Ez nem apróság: a Baymard mérése szerint **24%** a kényszerített
  regisztráció miatt hagyott ott kosarat az elmúlt negyedévben
  ([Baymard](https://baymard.com/blog/make-guest-checkout-prominent)).

---

## 2. Menüszerkezet

### 2.1 A régi fejléc (mérve)

A régi fejléc **négy elemből** állt, és minden oldalon betűre azonos volt:

| Elem | Cél |
| --- | --- |
| logó (kép) | `https://www.kineticare.hu` |
| `SZOLGÁLTATÁSOK` | `/szolgaltatasok` |
| `RÓLUNK` | `/rolunk` |
| `KAPCSOLAT` | `/kapcsolat` |

Nem volt lenyíló almenü, nem volt akciógomb a sávban, és **nem volt „Kurzusok"
vagy „Vásárlás" jellegű menüpont**. A fizetős termékhez a menüből csak kerülő úton
lehetett eljutni: `SZOLGÁLTATÁSOK` → „MEGNÉZEM" → `/kezrehab`.

### 2.2 A funnel-szabály: a régi oldal fele NEM kapott navigációt

Ez a régi oldal legfontosabb, eddig nem dokumentált navigációs döntése. A
systeme.io-funnel oldalain a fejlécben **csak a logó** áll, menüpont nélkül:

| Van fejléc-menü (6 oldal) | Nincs fejléc-menü, csak logó (14 oldal) |
| --- | --- |
| `/`, `/szolgaltatasok`, `/rolunk`, `/kapcsolat`, `/rendeloi-kezelesek`, `/search` | `/kezrehab`, `/kezrehab-akcio`, `/oto-kezrehab-akcio`, `/kezrelax`, `/hamarosan`, `/rendeloi-kezelesek-regi`, `/kezrehab-penztar`, `/kezrehab-akcio-penztar`, `/typ-kezrehab`, `/typ-kezrehab-akcio`, `/typ-hamarosan`, `/aszf`, `/impresszum`, `/adatvedelem` |

(Az 5 idegen spam-posztot nem mértem; azok mindenképp kikerülnek.)

Mérés: a `SZOLGÁLTATÁSOK` sztring előfordulása a nyers HTML-ben **3** az első
csoportnál (asztali lista + mobil lista + a beágyazott menü-konfiguráció), és
**0** a másodiknál.

Ez klasszikus tölcsér-technika: a sales- és pénztároldalról szándékosan elveszik
a kimeneti utakat. Az új oldalon **minden oldal teljes fejlécet kap**, a
kurzusoldal még morzsamenüt is (`Kurzusok →`). Ez tájékozódásban jobb, kilépési
lehetőségben viszont több. **Nem javaslom a régi minta visszahozását** (WCAG 2.2
**3.2.3 Consistent Navigation** ellen menne), az új oldal ezt már helyesen
kompenzálja a lapaljig ragadó vásárlósávval (`kc-course-buybar`, mérve mindkét
kurzusoldalon).

### 2.3 Az új fejléc (mérve)

| Elem | Cél | Megjegyzés |
| --- | --- | --- |
| „Kineticare" wordmark | `/` | szöveges, nem logókép |
| Szolgáltatások | `/szolgaltatasok` | **lenyílóval** |
| ↳ Rendelői kezelések | `/szolgaltatasok#rendeloi` | horgony, nem önálló oldal |
| ↳ Szakmai képzés (külső hivatkozás) | `probodystudio.hu/kez-workshop/` | külső |
| ↳ SOS KézRelax | `/kurzusok/sos-kezrelax-villamkurzus` | **kurzus a szolgáltatások alatt** |
| Rólunk | `/rolunk` | |
| Tudástár | `/blog` | ma **0 cikk** |
| Kapcsolat | `/kapcsolat` | |
| **„Kurzusok" akciógomb** | `/kurzusok` | kódba égetve (`Header.tsx:43`), nem a CMS-menüfából |

A menüfa a `menus` collectionből jön (`src/lib/menus.ts`), a „Kurzusok" gomb
szándékosan nem: az értékesítési UX-skill 3. pontja szerint az értékesítés fő
útja nem függhet a CMS-tartalomtól.

### 2.4 Menüpont-megfeleltetés

| Régi menüpont | Új megfelelő | Állapot | Megjegyzés a régi vevő szemszögéből |
| --- | --- | --- | --- |
| SZOLGÁLTATÁSOK | Szolgáltatások (+ lenyíló) | **megmaradt, bővült** | Ugyanott, ugyanazon a néven. Jó. |
| RÓLUNK | Rólunk | **megmaradt** | Jó. |
| KAPCSOLAT | Kapcsolat | **megmaradt** | A menüpont megvan, a mögötte lévő tartalom viszont elveszett (5. sor a TOP 10-ben). |
| — | **Kurzusok** (akciógomb) | **új** | A régin ilyen nem volt; helyes bővítés (M3). |
| — | **Tudástár** → `/blog` | **új, de üres** | A menü 25%-a ma semmire visz. |
| (nem menüpont: `/rendeloi-kezelesek` önálló oldal volt) | ↳ Rendelői kezelések → `#rendeloi` | **lefokozva** | Aki a rendelői kezelésre ment vissza, ma horgonyra érkezik egy hosszú oldal közepére. Bookmark, keresőtalálat, korábbi link: mind 404. |
| (nem menüpont: `/kezrelax` önálló landing) | ↳ SOS KézRelax → kurzusoldal | **átalakult** | A lead-magnetből webshop-termék lett. Taxonómiailag rossz helyen van (kurzus a „Szolgáltatások" alatt), lásd `docs/informacios-architektura.md` 8. hibapont. |

**Elveszett menüpont nincs.** Elveszett viszont **két megszokott önálló oldal**
(`/rendeloi-kezelesek`, `/kezrelax`) és **egy megszokott belépő** (a `/kezrehab`
sales-oldal saját címe).

### 2.5 Lábléc

| | Régi | Új |
| --- | --- | --- |
| Márka | logókép (sötét változat) | „Kineticare" wordmark + alcím |
| Kapcsolat | `info@kineticare.hu` | `info@kineticare.hu` |
| Jogi linkek | Adatkezelési… · ÁSZF · Impresszum | ugyanaz |
| Extra | — | **Hírlevél-űrlap**, **Süti-beállítások** |
| Évszám | © **2025** | © **2026** |
| Közösségi média | nincs | nincs |

Az új lábléc jobb. Egy hiány mindkettőben közös: **a közösségi média sehol nincs
a láblécben**, pedig a régi `/kapcsolat` oldalon élt egy Instagram- és egy
Facebook-hivatkozás.

---

## 3. Gomb- és CTA-nyelv

### 3.1 A régi oldal teljes CTA-leltára (mérve, nyers HTML-ből)

| Oldal | Gombfelirat | Cél | Típus |
| --- | --- | --- | --- |
| `/` | `KÉREM A VILLÁMKURZUST` (2×) | `/kezrelax` | link |
| `/` | `TOVÁBB A KEZELÉSEKRE` | `/rendeloi-kezelesek` | link |
| `/` | `TOVÁBB A PROGRAMRA` | `/kezrehab` | link |
| `/` | `TOVÁBB A KÉZ WORKSHOPRA` | ProBody (külső) | link |
| `/szolgaltatasok` | `TOVÁBB A KEZELÉSEKHEZ` | `/rendeloi-kezelesek` | link |
| `/szolgaltatasok` | `MEGNÉZEM` | `/kezrehab` | link |
| `/szolgaltatasok` | `TOVÁBB A SZAKMAI KÉPZÉSRE` | ProBody | link |
| `/szolgaltatasok` | `KÉREM A PROGRAMOT` | `/kezrelax` | link |
| `/rolunk` | `TOVÁBB` (**5×**) | 2 horgony + `/rendeloi-kezelesek` + `/kezrehab` + ProBody | link |
| `/rolunk` | `KÉREM A PROGRAMOT` | `/kezrelax` | link |
| `/rendeloi-kezelesek` | `TOVÁBB` (**3×**) | lapon belüli horgonyok | link |
| `/rendeloi-kezelesek` | `KÉREM A PROGRAMOT` | `/kezrelax` | link |
| `/kezrehab` | `KÉREM A PROGRAMOT` | `#section-aec79416` (horgony) | link |
| `/kezrehab` | `TOVÁBB A MEGRENDELÉSHEZ` | ugyanaz a horgony | link |
| `/kezrehab` | `MEGRENDELEM` (2×) | `/kezrehab-penztar` | link |
| `/kezrelax` | `KÉREM A VILLÁMKURZUST` (4×), `KÉREM A PROGRAMOT` (2×), `KÉREM A HOZZÁFÉRÉST` (2×) | popup megnyitása | **gomb** |
| `/kezrelax` | `KÉREM` | űrlap beküldése | **gomb** |
| `/hamarosan` | `KÉREM AZ ÉRTESÍTÉST`, `KÉREM` | űrlap beküldése | **gomb** |
| `/kapcsolat` | `ELKÜLDÖM` | űrlap beküldése | **gomb** |

Minden felirat **csupa nagybetűs**.

### 3.2 Az új oldal CTA-leltára (mérve)

| Hely | Felirat | Cél |
| --- | --- | --- |
| Hero, elsődleges | Kurzusok megtekintése | `/kurzusok` |
| Hero, másodlagos | Ingyenes SOS gyakorlatok | `#ingyenes` |
| Hitel-csík | Bővebben a szakmai hátterünkről → | `/rolunk` |
| Kurzuskártya | Megnézem a programot → | `/kurzusok/otthoni-kezrehab-program` |
| Kurzuskártyák alatt | Összes kurzus megtekintése → | `/kurzusok` |
| **Ingyenes SOS sáv** | **Elindítom az ingyenes kurzust →** | **`/kurzusok`** ⚠️ |
| Szolgáltatások 01 | Tovább a kezelésekre → | `/szolgaltatasok` ⚠️ |
| Szolgáltatások 02 | Tovább a programra → | **`/kurzusok`** ⚠️ |
| Szolgáltatások 03 | Tovább a kéz workshopra → | ProBody |
| Záró CTA-sáv | Megnézem a kurzusokat | `/kurzusok` |
| `/szolgaltatasok` | Időpontot kérek → | `/kapcsolat` |
| Kurzusoldal (buybox + ragadó sáv) | **Megveszem** | `/penztar?termek={id}` |
| `/penztar` | Megrendelés és fizetés | Barion-átirányítás |
| `/kapcsolat` | Üzenet küldése | űrlap |
| Lábléc | Feliratkozom | hírlevél |

### 3.3 Értékelés

**Amiben az új jobb:**

1. **Kisbetűs (mondat-) írásmód.** A régi csupa nagybetűs feliratai kb. **10%-kal
   rontják az olvashatóságot**, mert a verzál elveszti a szóalakot
   ([NN/g](https://www.nngroup.com/articles/glanceable-fonts/)). A GOV.UK
   Design System kimondja: *„Write button text in sentence case, describing the
   action it performs."*
   ([GOV.UK](https://design-system.service.gov.uk/components/button/))
2. **A „TOVÁBB" felszámolása.** A régi `/rolunk` oldalon **öt** gomb viselte
   ugyanazt a `TOVÁBB` feliratot, öt különböző célra. Ez pontosan az NN/g
   „4S" tesztjének két bukása: nem **specifikus** és nem **önmagában megálló
   (substantial)** ([NN/g, Better Link Labels](https://www.nngroup.com/articles/better-link-labels/)),
   és sérti a WCAG 2.2 **2.4.4 Link Purpose (In Context)** kritériumát. Az új
   oldalon minden CTA megnevez egy célt (hogy a cél tényleg az-e, arról az
   5. pont szól).
3. **Az ár láthatósága.** A régi kezdőlapon **egyetlen forintösszeg sem
   szerepelt**; az ár csak a `/kezrehab` oldalon bukkant fel. Az újon a
   kurzuskártyán ott a `79 500 Ft` (M3 teljesül).

**Amiben a régi jobb volt:**

4. **Az ingyenes ajánlat gombja igazat mondott.** `KÉREM A VILLÁMKURZUST` /
   `KÉREM A HOZZÁFÉRÉST`: nincs benne fizetés, nincs benne ár. Az új oldalon
   ugyanaz a termék **„Megveszem"** gombot kap, ár nélkül. Ez az NN/g 4S
   **„Sincere"** kritériumának bukása (az elvárást a kattintás nem teljesíti),
   és a `termektervezes` skill kifejezett tilalma: *„Ingyenes terméken
   »Megveszem« felirat: hazugság és hiba."*
5. **A CTA-k konkrét célra vittek.** A régi `TOVÁBB A PROGRAMRA` egyenesen a
   sales-oldalra ment; az új `Tovább a programra` a **listára**. Ugyanígy az
   `Elindítom az ingyenes kurzust` a listára, nem az ingyenes kurzusra. A
   kezdőlapon ma **hat különböző felirat mutat ugyanarra a `/kurzusok`
   címre** (`docs/informacios-architektura.md` 7. hibapont; a mérést
   megismételtem, egyezik).

**Miért mutat a `/kurzusok`-ra az ingyenes CTA, és mi javítja meg:**
a `FreeSos` komponens (`src/components/content/home/FreeSos.tsx`, a `const button: FreeSosCta = cta ?? {…}` sor) csak
akkor esik vissza a `/kurzusok`-ra, ha nincs CMS-beli gombfelülírás:

```
const button: FreeSosCta = cta ?? {
  label: 'Elindítom az ingyenes kurzust',
  href: freeProduct ? courseHref(freeProduct) : '/kurzusok',
}
```

A `RenderBlocks.tsx` `case 'freeSos'` ága viszont **átadja a CMS-értéket** (`cta={linkFrom(block.cta)}`),
a seed pedig `url: '/kurzusok'`-ot állít be (`src/lib/home-seed.ts:305`). Ezért
**a termék ingyenessé állítása önmagában NEM javítja meg ezt a gombot** — a
CMS-blokk `cta` mezőjét is ki kell üríteni vagy a kurzus címére állítani. (Ez
pontosítja a `docs/informacios-architektura.md` 8.1/3. javaslatát.)

### 3.4 Amit ez az összevetés a CTA-szótár vitájához hozzátesz

> **Itt szándékosan NEM javaslok saját szótárt.** A normatív szótár a
> `docs/ui-sztenderdek.md` §3.2, a mért leltár a `docs/gomb-inventar.md`, és a
> kettő között ma **élő ütközés** van (E/2 „Vedd meg a kurzust" vs E/1
> „Megveszem"), amit a vezető dönt el. Egy harmadik javaslat csak rontana a
> helyzeten. Amit ez a dokumentum egyedül tud hozzátenni, az a **régi oldal
> nyelvtani bizonyítéka** az E/1 ↔ E/2 kérdéshez.

**A mért tény: a régi oldal 100%-ban egyes szám első személyű volt.** A 3.1
leltár minden cselekvés-gombja E/1: `KÉREM A PROGRAMOT`, `KÉREM A
VILLÁMKURZUST`, `KÉREM A HOZZÁFÉRÉST`, `KÉREM AZ ÉRTESÍTÉST`, `MEGRENDELEM`,
`MEGNÉZEM`, `ELKÜLDÖM`. **Egyetlen E/2-es (felszólító) gombfelirat sincs a
teljes régi oldalon.** A navigációs linkek (`TOVÁBB…`) semlegesek, azok a
kérdést nem döntik el.

**Mit jelent ez a döntéshez:**

- Jakob törvénye szerint a visszatérő vevő azt a mintát várja, amit már ismer
  ([NN/g](https://www.nngroup.com/videos/jakobs-law-internet-ux/)). Ez a
  **megtartás** mellett szól: a mai új oldal is E/1-es, tehát a régi vevő
  számára a felület ebben a dimenzióban **nem változik**.
- Ez **nem** dönti el a kérdést önmagában: a `ui-sztenderdek.md` §3.2 E/2-es
  érvei (ige + tárgy, „a gomb cselekvést ír le, nem ígéretet") tervezési
  szempontból erősek, és a Jakob-érv csak a **megszokásra** vonatkozik, nem a
  minőségre.
- **Amiben viszont nincs vita:** bármelyik nyelvtan nyer, **egy cselekvés = egy
  felirat, mindenhol** (WCAG 2.2 **3.2.4**). Ma a „menj a kurzuslistára"
  cselekvésre a `gomb-inventar.md` mérése szerint **nyolc** felirat él; a régi
  oldalon ugyanerre a cselekvésre (a program megnézése) **kettő** volt
  (`TOVÁBB A PROGRAMRA`, `MEGNÉZEM`). Ebben a szűk metszetben tehát **a régi
  oldal is jobb volt**, mint a mai új.

**Két hiányzó eset, amit a szótárba fel kell venni** (a régi oldalon létezett,
az újon nincs megfelelője):

| Cselekvés | A régi felirata | Ma az újon |
| --- | --- | --- |
| Rendelői kezelésre navigálás | `TOVÁBB A KEZELÉSEKRE` / `TOVÁBB A KEZELÉSEKHEZ` (két változat egy cselekvésre) | „Tovább a kezelésekre" – de a `#rendeloi` horgony nélküli oldalra |
| Értesítés kérése induló kurzusról | `KÉREM AZ ÉRTESÍTÉST` | **nincs ilyen funkció** (K3 nyitott kérdés) |

## 4. Vásárlási út

### 4.1 A régi út (mérve)

```
/  ──„TOVÁBB A PROGRAMRA"──►  /kezrehab  ──„MEGRENDELEM"──►  /kezrehab-penztar  ──►  /typ-kezrehab
   (ár SEHOL)                  (119 000 → 79 500 Ft)          (adatok + KÁRTYA egy oldalon)   („a belépő e-mailben jön")
```

- **Lépések a kosártól a fizetésig:** 1 oldal. A számlázási adat és a
  kártyaadat **ugyanazon a képernyőn** volt; a beágyazott fizetés
  `["stripe:card","stripe:applepay"]` (mérve a pénztár beágyazott
  konfigurációjában), tehát **Apple Pay is elérhető volt**.
- **Regisztráció:** nem kellett. A fiókot utólag, e-mailben kapott belépővel
  kellett aktiválni.
- **Kötelező pipa:** kettő, az ÁSZF-re és az adatkezelési tájékoztatóra.
- **Bizalmi kíséret a pénztáron:** termék-összefoglaló („Ezt kapod a
  programban"), **2 vélemény** (Sándor, Anna) és orvosi kikötés.
- **Order bump / upsell:** nincs (`isOrderBumpChecked: false`, `offerBumps: ""`).

### 4.2 Az új út (mérve)

```
/  ──„Megnézem a programot"──►  /kurzusok/otthoni-kezrehab-program  ──„Megveszem"──►  /penztar?termek=1
   (79 500 Ft LÁTSZIK)           (79 500 Ft + ragadó vásárlósáv)                       (e-mail + név + számlázás + elállási nyilatkozat)
        └──„Megrendelés és fizetés"──►  Barion (külső domain)  ──►  /fizetes/koszonom  ──►  azonnali hozzáférés a /kurzusaim alatt
```

- **Lépések:** 2 belső oldal a pénztárig, majd **külső átirányítás** a Barionra.
- **Regisztráció:** nem kell. A pénztár szó szerint kiírja:
  *„A vásárláshoz nem kell regisztrálni. A fizetés után erre a címre küldjük a
  hozzáférést és egy linket, amivel jelszót állítasz be a fiókodhoz."*
  Ez megfelel a Baymard ajánlásának
  ([Baymard: Save Account Creation for the Confirmation Step](https://baymard.com/blog/delayed-account-creation)).
- **Kötelező pipa:** kettő, de **mindkettő az elállási jogról szól**
  (`waiverStart`, `waiverLoss`). **ÁSZF-elfogadó és adatkezelési pipa nincs**
  (mérve: 3 checkbox az oldalon, ebből egy a lábléc hírlevele).
- **Bizalmi kíséret a pénztáron:** nincs. A **Barion neve nem szerepel** a
  `/penztar` oldalon (0 előfordulás), sem kártyalogó, sem biztonsági utalás.
  A Barion csak a kurzusoldalon van megnevezve („Bankkártyás fizetés a Barionon
  keresztül. A bankkártya adatait mi nem látjuk.").

### 4.3 Összevetés

| Szempont | Régi | Új | Ítélet |
| --- | --- | --- | --- |
| Ár először hol látszik | a sales-oldalon (2. lépés) | **a kezdőlapon** (1. lépés) | **új jobb** |
| Kattintás a kezdőlapról a pénztárig | 2 | 2 | döntetlen |
| Kattintás a kezdőlapról a **konkrét programra** | 1 (`TOVÁBB A PROGRAMRA`) | 2 (a lista közbeiktatásával) | **régi jobb** |
| Kártyaadat helye | ugyanaz az oldal (Stripe beágyazva) | külső Barion-oldal | **régi folyamatosabb**, de a Barion Magyarországon ismertebb; a bizalmi kíséretet pótolni kell |
| Regisztrációs kényszer | nincs | nincs | döntetlen, mindkettő helyes |
| Hozzáférés a vásárlás után | **e-mailben küldött belépő** | **azonnal** a `/kurzusaim` alatt | **új jobb** |
| ÁSZF/adatkezelés elfogadása | 2 kötelező pipa | nincs külön pipa | **régi teljesebb** (ügyvédi kérdés, 9. szakasz) |
| Vélemény a pénztár mellett | 2 db | 0 db | **régi jobb** |
| Fizetési mód | Stripe kártya + Apple Pay | Barion (kártya) | tisztázandó, hogy az Apple/Google Pay elérhető-e |
| Számla | Számlázz.hu, e-mailben | Számlázz.hu, e-mailben | döntetlen |

### 4.4 Ami a fizetési szolgáltatóból ellentmondásban maradt

Az **élő új `/aszf` oldal a régi ÁSZF szó szerinti másolata**: a szövegben
*„A fizetés titkosított csatornán megy végbe, a Weboldaltól függetlenül, a
**STRIPE** fizetési felületén"* áll (`src/lib/legal-source/aszf.txt`, 49. sor),
és a „Barion" szó **egyszer sem** szerepel benne. Ugyanez a szöveg az elállási
jogot **kizárja** (ugyanezen fájl 29. és 70. sora: a vásárló „tudomásul vette
elállási jogának elvesztését", 45/2014. Korm. r. 29. § hivatkozással), miközben:

- az élő pénztár azt írja, hogy *„A 14 napos elállási jog szabályairól az
  Általános szerződési feltételek tájékoztat"*, és
- az élő kurzusoldalon ott a **30 napos kipróbálási garancia** („kérdés nélkül
  visszafizetjük a program árát").

Ez a régi oldal E2-es ellentmondása (`docs/tartalom-leltar-regi-oldal.md`),
**változatlanul átemelve az új oldalra**. Nem az én döntésem feloldani: ügyvédi
kérdés, de a vezetőnek jelezni kell, mert ma élesben fut.

---

## 5. Az ingyenes SOS KézRelax útja (a marketing-lánc)

### 5.1 A régi lánc (mérve, a beágyazott konfigurációból)

```
szórólap-QR  ──►  kineticare.hu/kezrelax
                   (menü NÉLKÜLI landing, ár NÉLKÜL, 8 témás lista, letölthető „puska", 4 vélemény, 4 GYIK)
                         │
                         ├─ „KÉREM A VILLÁMKURZUST" / „KÉREM A PROGRAMOT" / „KÉREM A HOZZÁFÉRÉST"
                         │        → action: showPopup
                         ▼
                   popup: Keresztnév + E-mail  ──„KÉREM"──►  action: sendForm
                         │
                         ▼
                   urlRedirect: /oto-kezrehab-akcio   (39 700 Ft-os ajánlat, visszaszámlálóval)
```

A mért kulcsadat: a `/kezrelax` oldalon **egyetlen `urlRedirect` van, és az a
`https://www.kineticare.hu/oto-kezrehab-akcio`**. Vagyis az ingyenes anyag nem
öncél volt: az e-mail megadása után a látogató azonnal egy kedvezményes
ajánlatot kapott. Ez a lánc üzleti lényege.

### 5.2 Az új lánc, és hol törik

| Lépés | Mért állapot |
| --- | --- |
| QR-cél `kineticare.hu/kezrelax` | Az új oldalon **404** (és a 404-oldal ma **teljesen üres**, lásd `docs/informacios-architektura.md` 1. hibapont). A domain átállításának pillanatában a szórólap-QR halott. |
| Kezdőlapi ingyenes sáv | Van (`#ingyenes`), de a gombja a **listára** visz. |
| Fejléc → Szolgáltatások → SOS KézRelax | Elvezet a kurzusoldalra. Rossz taxonómiai helyen, de működik. |
| Kurzusoldal (`/kurzusok/sos-kezrelax-villamkurzus`) | A leadben ott az „Ingyenes villámkurzus…", **a buyboxban nincs ár és nincs „Ingyenes" jelölés**, a gomb **„Megveszem"**. A JSON-LD-ben **nincs `offers`** (a fizetős kurzuson van, 79 500 Ft-tal). |
| „Megveszem" → `/penztar?termek=2` | HTTP 200, de **összeg sehol**; e-mailt és számlázási címet kér. |
| Beküldés | `start-checkout.ts:260-267` szerint 400: *„A termékhez nem tartozik érvényes ár, így nem vásárolható meg."* |
| Következő ajánlat (a régi OTO helye) | **Nincs.** Az ingyenes anyag után semmilyen továbblépés nincs beépítve. |

**A gyökérok egyetlen CMS-mező:** az SOS terméken a `priceInHUFEnabled` nincs
`false`-ra állítva, ezért a kód „fizetős, de ár nélküli" (`'none'`) állapotot lát
(`src/lib/courses.ts`, `coursePriceBadgeKind()`). Ez egyben magyarázza, miért `null` a
`freeProduct` a kezdőlapon.

### 5.3 Mit kell a QR-ról érkezőnek látnia (javaslat)

A QR-ról érkező **hideg** látogató, aki nem ismeri a márkát, és nem a
kezdőlapon száll be. Neki három kérdésre kell azonnal választ kapnia: hol van,
mit kap, mit tegyen.

1. **301: `/kezrelax` → `/kurzusok/sos-kezrelax-villamkurzus`.** Ez a
   legfontosabb egyetlen átirányítás az egész térképen.
2. **A terméken az „Ingyenes" jelölés** a gomb mellett, és a gombon igaz
   felirat („Elindítom a kurzust").
3. **Ne kérjünk számlázási címet ingyenes anyagért.** A régi modell egy
   keresztnevet és egy e-mail-címet kért. Ha marad a 0 Ft-os webshop-termék, a
   pénztárnak ingyenes terméknél el kell hagynia a számlázási blokkot; ha
   lead-magnet űrlap lesz, az a `leadMagnetForm` blokk
   (`docs/tartalom-leltar-regi-oldal.md` 4. szakasz). **Ez a vezető döntése**
   (Ny2), én a ténybeli következményt írom le.
4. **Legyen következő lépés az ingyenes anyag után** (a régi OTO helyén):
   nem visszaszámlálós ál-sürgetéssel, hanem egy őszinte „a teljes program itt
   folytatódik" ajánlattal. A régi visszaszámlálók látogatónként újrainduló,
   3 napos delay-típusúak voltak (`docs/regi-oldal-valaszok.md` 21. ellentmondás)
   — ez dark pattern, **nem hozzuk át** (UX-skill 6. pont).

---

## 6. Bizalomépítő elemek sorrendje

### 6.1 Kezdőlap, szekcióról szekcióra

| # | Régi kezdőlap | # | Új kezdőlap |
| --- | --- | --- | --- |
| 1 | Hero (cím + bevezető, **gomb nélkül**) | 1 | Film-hero + 1 elsődleges és 1 másodlagos gomb |
| **2** | **6 sajtólogó** (Nők Lapja, Karc FM, Házipatika, Képmás, iSPOR, MGYFT) | 2 | Hitel-csík (3 szöveges állítás) |
| 3 | **INGYENES SOS villámkurzus** + CTA | **3** | **Kurzuskártyák ÁRRAL** |
| 4 | Probléma-blokk | 4 | Ingyenes SOS sáv |
| 5 | Üdvözlünk / bemutatkozás | **5** | **6 sajtólogó** |
| **6** | **7 vélemény** (hosszú idézetek) | 6 | Probléma-blokk |
| 7 | „Erre számíthatsz" (3 ígéret) | 7 | „Erre számíthatsz" (3 ígéret) |
| 8 | Szolgáltatások (3 sor) | 8 | Három állapot |
| | | 9 | Szolgáltatások (3 sor) |
| | | 10 | Rólunk / alapítók |
| | | 11 | Így működik (3 lépés) |
| | | **12** | **3 vélemény** (rövidek) |
| | | 13 | GYIK (4 kérdés) |
| | | 14 | Záró CTA-sáv + hírlevél |

A sajtólogók pozícióját a régi oldalon a képek DOM-sorrendje adja: a hero fotó
(`katak-paravan.jpg`) után **közvetlenül** a hat logófájl következik
(`noklapja.png`, `karc.png`, `hazipatika.png`, `kepmas.png`, `ispor.png`,
`mgyft.png`), és csak utánuk jön az SOS-blokk packshotja. Ez **korrigálja** a
`docs/tartalom-leltar-regi-oldal.md` 3. táblázatának „Sajtólogó-sor · nincs a
kezdőlapon" sorát: **volt**, méghozzá a legerősebb helyen.

### 6.2 Értékelés

| Elem | Régi hely | Új hely | Ítélet |
| --- | --- | --- | --- |
| Vélemények | 6. szekció, **a termék említése előtt**, 7 db, hosszan | 12. szekció, **a termék után**, 3 db, rövid | **új jobb** (UX-skill M6) |
| Sajtólogók | **2. szekció** | 5. szekció | **régi jobb** — a harmadik féltől jövő bizonyíték a legdrágább bizalmi elem, ne kerüljön a hajtás alá |
| Szakmai háttér | csak a `/rolunk` mélyén | **hitel-csík a hero alatt** | **új jobb** (M2) |
| Alapítók bemutatása | 5. szekció | 10. szekció | régi előbb hozta, de az újban ott a hitel-csík; elfogadható |
| Garancia | csak a `/kezrehab`-on, kiemelt blokként | csak a kurzusoldalon, kiemelt blokként | döntetlen |
| Partnerlogók (16) | `/rolunk`, **kattintható logóként** | `/rolunk`, **puszta szövegként** | **régi jobb** |
| Páciensszám | „ezernél is több" | „1000+ elégedett páciens" | **rendben** (a korábbi „5000+" javítva) |

**Javaslat:** a sajtólogó-sor kerüljön a hitel-csík és a kurzuskártyák közé
(3. hely), vagy közvetlenül a kurzuskártyák után. A hatást a
`$pageview(/) → course_viewed` arányon kell mérni (UX-skill 5. pont), nem
szemre eldönteni.

### 6.3 A fizetős kurzusoldal bizalmi elemei

| Elem | Régi `/kezrehab` | Új kurzusoldal |
| --- | --- | --- |
| Modul-szerkezet | ✓ (4 modul) | ✓ (4 modul, címsorokkal) |
| Bónuszok értékkel | ✓ (3 db) | ✓ (3 db, 29 900 / 19 900 / 19 900 Ft) |
| „Kinek jó / kinek nem" | ✓ (9 + 6) | ✓ |
| Garancia-blokk | ✓ | ✓ (30 nap) |
| **Páciens-vélemények** | **10 db** | **0 db** |
| **Szakmai ajánlók** | **5 db** (fényképes) | **0 db** |
| **GYIK** | **3 kérdés** | **0 kérdés** |
| Ragadó vásárlósáv | nincs | ✓ |
| Morzsamenü | nincs | ✓ |

Ez a legnagyobb egyetlen tartalmi visszalépés az egész összevetésben: **a fő
bevételt hozó oldalról eltűnt minden társadalmi bizonyíték**. Az ingyenes
kurzusoldalon egyébként **van** 3 vélemény és 4 GYIK, tehát a képesség megvan,
csak a fizetős terméknél nincs kitöltve.

---

## 7. Elveszett tartalom és funkció, plusz az árazás kommunikációja

### 7.1 Ami a régin megvolt, most nincs, és van értelme visszahozni

| Elem | Hol volt | Miért kell | Méret |
| --- | --- | --- | --- |
| Telefonszám kattintható `tel:` linkkel | `/kapcsolat`, `/rolunk` | A rendelői szolgáltatás fő konverziója telefon. Mobilon `tel:` nélkül át kell gépelni. | S |
| Két budapesti helyszín + térkép-hivatkozás | `/kapcsolat` (2 Google Maps beágyazás) | Aki személyes kezelést keres, a címet keresi. | M |
| Válaszidő-ígéret („legkésőbb 2 munkanapon belül") | `/kapcsolat` | Csökkenti a bizonytalanságot az űrlap beküldése után. | S |
| Instagram + Facebook | `/kapcsolat` | A Facebook-csoport a program támogatási csatornája is. | S |
| 24 órás lemondási szabályzat | `/rendeloi-kezelesek` | Ma **sehol nincs**. Pénzügyi következménnyel járó szabály. | S |
| A 8 kiegészítő terápia tételes leírása | `/rendeloi-kezelesek` | Ma csak felsorolás. | S |
| Az ingyenes anyag utáni következő ajánlat | `/oto-kezrehab-akcio` | A tölcsér közepe hiányzik. | M |
| „Hamarosan / értesíts, ha elindul" | `/hamarosan` | Új kurzusok bevezetéséhez lista. **Vezetői döntés** (Ny8). | M |
| A pénztár melletti termék-összefoglaló + 2 vélemény | `/kezrehab-penztar` | Klasszikus kosárelhagyás-csökkentő. | S |

### 7.2 Amit tudatosan NEM hozunk vissza

- A funnel-oldalak menü nélküli fejléce (WCAG 3.2.3 ellen).
- A látogatónként újrainduló visszaszámlálók (dark pattern, UX-skill 6. pont).
- A csupa nagybetűs gombfeliratok.
- A `TOVÁBB` mint gombfelirat.
- A 39 700 Ft-os párhuzamos akciós ár és a duplikált landingek.
- Az 5 idegen spam blogposzt.

### 7.3 Az árazás kommunikációja (119 000 / 79 500 Ft)

| | Régi | Új |
| --- | --- | --- |
| Kezdőlap | **0 forintösszeg** | `79 500 Ft` a kurzuskártyán |
| Sales-oldal | „Értéke: 119.000 Ft, de most csak" 79 500 Ft; az akciós ágon `<s>`-sel áthúzva | „A program eredeti ára **119 000 Ft** – bevezető áron most **79 500 Ft**" |
| Párhuzamos ár | **igen**: 79 500 és 39 700 Ft egyszerre, két URL-en | nincs, egyetlen ár |
| Bónuszok értéke | 29 900 / 19 900 / 19 900 Ft + „közel 100 000 Ft" kuponérték | ugyanez, változatlanul |
| JSON-LD ár | nincs strukturált adat | `offers: { price: 79500, priceCurrency: HUF }` |

**Az új oldal jobb** abban, hogy egyetlen ár van, és az már a kezdőlapon látszik.
**Két örökölt kockázat viszont élesben fut:**

1. A **119 000 Ft-os „eredeti ár"** átkerült az új kurzusoldalra (mérve: 2
   előfordulás). A `docs/regi-oldal-valaszok.md` Ny4 lezáratlan: a régi
   pénztár-konfigokban **soha nem létezett 119 000-es árterv**, csak 79 500-as
   és 39 700-as. Amíg ez nincs igazolva, a hivatkozási ár Omnibus-kockázat.
2. A **bónuszok forintértéke** (E6) szintén átkerült, ugyanezzel a feltétellel:
   csak akkor tartható, ha a bónuszok külön is megvásárolhatók ezen az áron.

Ezek nem navigációs kérdések, de az árközlés a vásárlási út része, ezért itt
rögzítem: **mindkettő a tulajdonos válaszára vár**, és addig nem „kész".

**Mikroszöveg-megjegyzés:** az élő ármondat gondolatjelet használ
töltelék-elválasztóként („A program eredeti ára 119 000 Ft **–** bevezető áron
most 79 500 Ft-ért érhető el."). A `termektervezes` skill ezt tiltja a vevői
felületen; helyette vessző vagy külön mondat. Ugyanez a hiba a kódba égetett
ingyenes CTA-feliratban is („Ingyenes **—** azonnal eléred").

---

## 8. SEO-öröklés és a javasolt 301-térkép

### 8.1 A kiindulási helyzet (mérve 2026-08-16-án)

- A régi sitemapban **25 URL** van, négy részsitemapra bontva. **Mind a 25 él,
  HTTP 200-zal**, beleértve az elavult `/rendeloi-kezelesek-regi`-t és a két
  akciós ágat is.
- `https://kineticare.hu` → **301** → `https://www.kineticare.hu/` (az apex→www
  átirányítás már ma él; ezt az új hoszton is meg kell tartani).
- A régi oldalak SEO-alapja gyenge: **egyetlen oldalon sincs `<h1>`**, a
  `/kezrehab` és a `/kezrelax` oldalon **nincs canonical**, a `/kezrehab`-nak
  **nincs meta description**. Vagyis a link-érték nagyobbrészt a márkanévhez és
  a főoldalhoz kötődik, nem a funnel-oldalakhoz. Ez **csökkenti**, de nem szünteti
  meg az átirányítás szükségességét: a `/kezrehab` és a `/kezrelax` **nyomtatott
  és hirdetési anyagokban is szerepel**, ott a 301 nem SEO-, hanem
  ügyfélszolgálati kérdés.
- Az új oldalon **nincs `redirects()`** a `next.config.ts`-ben és nincs legacy
  szabály a `src/middleware.ts`-ben. A kurzusoknál viszont már működik egy
  DB-vezérelt tartós átirányítás (mérve: `/kurzusok/1` → **308** →
  `/kurzusok/otthoni-kezrehab-program`), tehát a minta ismert a repóban.

### 8.2 Javasolt 301-térkép

Google ajánlása: URL-térkép előre, szerveroldali tartós átirányítás, lánc nélkül,
és **legalább 1 évig tartsuk meg** őket
([Google: Site move with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes),
[Google: Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects)).

| # | Régi URL | Javasolt cél | Kód | Indoklás |
| --- | --- | --- | --- | --- |
| 1 | `/` | `/` | — | slug egyezik |
| 2 | `/szolgaltatasok` | `/szolgaltatasok` | — | slug egyezik |
| 3 | `/rolunk` | `/rolunk` | — | slug egyezik |
| 4 | `/kapcsolat` | `/kapcsolat` | — | slug egyezik |
| 5 | `/aszf` | `/aszf` | — | slug egyezik |
| 6 | `/adatvedelem` | `/adatvedelem` | — | slug egyezik |
| 7 | `/impresszum` | `/impresszum` | — | slug egyezik |
| **8** | **`/kezrelax`** | **`/kurzusok/sos-kezrelax-villamkurzus`** | **301** | **A szórólap-QR célja. A legfontosabb sor a táblázatban.** |
| **9** | **`/kezrehab`** | **`/kurzusok/otthoni-kezrehab-program`** | **301** | A fő értékesítő oldal; hirdetésekben és ajánlásokban is szerepel. |
| 10 | `/kezrehab-akcio` | `/kurzusok/otthoni-kezrehab-program` | 301 | Akciós duplikátum; a 39 700 Ft-os ár nem él tovább. |
| 11 | `/oto-kezrehab-akcio` | `/kurzusok/otthoni-kezrehab-program` | 301 | ua. |
| 12 | `/kezrehab-penztar` | `/kurzusok/otthoni-kezrehab-program` | 301 | **Nem** közvetlenül a pénztárra: a `/penztar` a `robots.txt`-ben tiltott, és termékparaméter nélkül üres. |
| 13 | `/kezrehab-akcio-penztar` | `/kurzusok/otthoni-kezrehab-program` | 301 | ua. |
| 14 | `/typ-kezrehab` | `/kurzusok/otthoni-kezrehab-program` | 301 | A köszönőoldal szövege elavult (E11: „a belépő e-mailben jön"). Vevőt nem szabad ide irányítani; a semleges cél a kurzusoldal. |
| 15 | `/typ-kezrehab-akcio` | `/kurzusok/otthoni-kezrehab-program` | 301 | ua. |
| **16** | **`/rendeloi-kezelesek`** | **`/szolgaltatasok#rendeloi`** | **301** | Az önálló oldal megszűnt, a horgony él (mérve: `id="rendeloi"` jelen van). |
| 17 | `/rendeloi-kezelesek-regi` | `/szolgaltatasok#rendeloi` | 301 | Elavult duplikátum (55/25 perc); élesben elérhető, le kell kapcsolni. |
| 18 | `/hamarosan` | `/kurzusok` | 301 | Nincs várólista-funkció. Ha készül, ez a sor a várólista-oldalra áll át. |
| 19 | `/typ-hamarosan` | `/kurzusok` | 301 | ua. |
| 20 | `/search` | `/` | 301 | Üres systeme.io-sablon, Kineticare-tartalom nélkül. |
| 21 | `/best-places-to-visit-in-asia` | — | **410** | Idegen spam-tartalom. A 410 gyorsabban kiveti az indexből, mint a 404. |
| 22 | `/best-time-to-visit-asia` | — | 410 | ua. |
| 23 | `/mehtab-bagh-itmad-ud-daula-taj-mahal` | — | 410 | ua. |
| 24 | `/top-places-in-china` | — | 410 | ua. |
| 25 | `/kathmandu-nepal` | — | 410 | ua. |

### 8.3 Megvalósítási megjegyzések

- A 8–20. sor **statikus szabály**, tehát a `next.config.ts` `redirects()`-ébe
  való (`permanent: true` → 308, amit a Google a 301-gyel azonosan kezel; a repó
  már ezzel az indoklással használ 308-at a kurzus-slugokra,
  `src/app/(frontend)/kurzusok/[slug]/page.tsx:230-244`).
- A `#rendeloi` horgony a `destination`-ben megadható; a böngésző viszi tovább.
- A 410-es válaszokhoz szabály kell (a `redirects()` erre nem való) — vagy
  middleware-ág, vagy dedikált route. Ha ez túl körülményes, a 404 is elfogadható,
  csak lassabb.
- **A `next.config.ts` `headers()`/`redirects()` build-időben sül bele a
  route-manifestbe** (a fájl saját figyelmeztetése a 34-37. sorban), tehát a
  szabályok bevezetése után **valódi újrabuildelés kell** — lásd a CLAUDE.md
  1. üzemeltetési tanulságát („a SUCCESS deploy nem jelenti, hogy az új kód fut").
- A domain átállításakor: apex → www (vagy fordítva, egységesen), új sitemap
  beküldése, és Search Console **Change of Address**.
- **Az átirányítás önmagában nem elég**, ha a 404-oldal üres marad: ami kimarad a
  térképből, az ma vak zsákutcába fut (`docs/informacios-architektura.md` 1. hiba).

---

## 9. Nyitott kérdések a vezetőnek

| # | Kérdés | Miért nem dönthetem el én |
| --- | --- | --- |
| **K1** | **Melyik legyen a CTA-nyelvtan: E/1 vagy E/2?** A `docs/ui-sztenderdek.md` §3.2 E/2-es szótárt hagyott jóvá („Vedd meg a kurzust"), a `docs/gomb-inventar.md` §5 E/1-eset, és a két doksi maga jelzi az ütközést. Az én mérésem ehhez annyit tesz hozzá: **a régi oldal 100%-ban E/1 volt**, tehát a visszatérő vevő megszokása az E/1 (Jakob törvénye). | Három doksi, két szótár; a döntés a vezetőé. Bármelyik lesz, **egyetlen** nyelvtan legyen mindenhol (WCAG 3.2.4), és a szótár egy helyen éljen. |
| **K2** | **Az ingyenes SOS marad 0 Ft-os webshop-termék, vagy e-mailes lead-magnet lesz?** (A leltár Ny2 kérdése.) Ettől függ, hogy a pénztárnak kell-e ingyenes ága, vagy `leadMagnetForm` blokk kell. | Üzleti modell-kérdés. A ténybeli oldal lezárva: a régi e-mailes opt-in volt. |
| **K3** | **Legyen-e az ingyenes anyag után következő ajánlat** (a régi OTO helyén)? Ha igen, milyen formában, mert visszaszámlálót nem használunk. | Marketing-döntés. |
| **K4** | **A pénztárra kell-e külön ÁSZF- és adatkezelés-elfogadó pipa?** A régin kettő volt, az újon nincs. | Ügyvédi kérdés, nem UX-kérdés. |
| **K5** | **Az élő `/aszf` a régi, Stripe-os szöveg.** Mikor és ki írja át Barionra, és belekerül-e a 30 napos garancia? | TILOS ZÓNA-közeli, ügyvédi felülvizsgálatot igényel. Ma élesben ellentmond a kurzusoldalnak és a pénztárnak. |
| **K6** | **A 119 000 Ft-os „eredeti ár" és a bónuszértékek maradnak?** | Csak a tulajdonos tudja, valaha kapható volt-e ezen az áron (Ny4, Ny5). |
| **K7** | **Elérhető-e Apple/Google Pay a Barionon?** A régin Apple Pay volt (`stripe:applepay`). Ha elvész, azt tudni kell. | Barion-fiókbeállítás, kívülről nem mérhető. |
| **K8** | **A `/rendeloi-kezelesek` visszakapja-e a saját oldalát**, vagy marad horgony a `/szolgaltatasok`-on? A régi vevők ezt önálló oldalként ismerik. | IA-döntés; a 301 mindkét esetben ugyanoda mutathat, de a hosszú távú cél más. |

---

## 10. Források

**Kutatóintézetek**

- Nielsen Norman Group: *Jakob's Law of Internet User Experience* —
  https://www.nngroup.com/videos/jakobs-law-internet-ux/
  („Users spend most of their time on other sites… users prefer your site to
  work the same way as all the other sites they already know.")
- Nielsen Norman Group: *Better Link Labels: 4Ss for Encouraging Clicks* —
  https://www.nngroup.com/articles/better-link-labels/
  (Specific, Sincere, Substantial, Succinct; a „Learn more" típusú felirat
  bukása.)
- Nielsen Norman Group: *Typography for Glanceable Reading: Bigger Is Better* —
  https://www.nngroup.com/articles/glanceable-fonts/
  (a csupa nagybetűs szöveg kb. 10%-kal rontja az olvashatóságot)
- Baymard Institute: *Make „Guest Checkout" Prominent* —
  https://baymard.com/blog/make-guest-checkout-prominent
  (24% hagyott ott kosarat kizárólag a kényszerített regisztráció miatt;
  a helyszínek 47%-a nem teszi a vendégvásárlást a legfeltűnőbb opcióvá)
- Baymard Institute: *Save Account Creation for the Confirmation Step* —
  https://baymard.com/blog/delayed-account-creation

**Tervezési rendszerek**

- GOV.UK Design System, *Button* —
  https://design-system.service.gov.uk/components/button/
  („Write button text in sentence case, describing the action it performs.")

**Szabvány**

- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2* —
  https://www.w3.org/TR/WCAG22/
  - **3.2.4 Consistent Identification** (A): *„Components that have the same
    functionality within a set of web pages are identified consistently."*
  - **3.2.3 Consistent Navigation** (A): *„Navigational mechanisms that are
    repeated on multiple web pages… occur in the same relative order each time
    they are repeated…"*
  - **2.4.4 Link Purpose (In Context)** (A)
  - **2.5.8 Target Size (Minimum)** (AA)

**Kereső-dokumentáció**

- Google Search Central: *Redirects and Google Search* —
  https://developers.google.com/search/docs/crawling-indexing/301-redirects
- Google Search Central: *Site move with URL changes* —
  https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
  („Prepare a URL mapping…", „Avoid chaining redirects", „Keep the redirects for
  as long as possible, generally at least 1 year.")

**Projekt-források**

- `docs/ertekesitesi-ux-skill.md` (M1–M8, sticky-nav, tiltások)
- `docs/tartalom-leltar-regi-oldal.md` (tartalmi leltár, E1–E17)
- `docs/regi-oldal-valaszok.md` (ténykutatás, ellentmondás-táblázat)
- `docs/grafikai-leltar-regi-oldal.md` (vizuális leltár)
- `docs/informacios-architektura.md` (az ÚJ oldal belső IA-diagnózisa)
- `docs/ui-sztenderdek.md` (**NORMATÍV** gomb- és mikroszöveg-szabályzat, §3.2 CTA-szótár)
- `docs/gomb-inventar.md` (a gombok mért leltára az ÚJ oldalon)

---

## 11. Függelék: a mérés reprodukálása

Minden lekérés olvasó (GET). A régi oldalon 22 URL, az újon 18 útvonal.

```bash
# 1. A régi oldal teljes URL-listája (4 részsitemap)
curl -s https://www.kineticare.hu/sitemap.xml
for s in blog/349095 funnel/5196791 funnel/5196787 funnel/5225778; do
  curl -s "https://www.kineticare.hu/sitemaps/$s/sitemap.xml" \
    | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g'
done

# 2. Melyik régi oldalon van fejléc-menü (3 = van, 0 = nincs)
#    3 = asztali lista + mobil lista + a beágyazott menü-konfiguráció
for u in "" szolgaltatasok rolunk kapcsolat rendeloi-kezelesek \
         kezrehab kezrelax hamarosan aszf impresszum adatvedelem; do
  n=$(curl -s "https://www.kineticare.hu/$u" | grep -o "SZOLGÁLTATÁSOK" | wc -l)
  echo "/$u -> $n"
done
# -> az első öt: 3 · a többi hat: 0

# 3. Az ingyenes lánc célja a régi oldalon
curl -s https://www.kineticare.hu/kezrelax | grep -o '"urlRedirect":"[^"]*"'
# -> "urlRedirect":"https://www.kineticare.hu/oto-kezrehab-akcio"

# 4. A régi URL-ek ma is élnek
for u in kezrehab kezrelax rendeloi-kezelesek rendeloi-kezelesek-regi \
         kezrehab-akcio oto-kezrehab-akcio search; do
  echo -n "/$u -> "; curl -s -o /dev/null -w "%{http_code}\n" "https://www.kineticare.hu/$u"
done   # mind 200

# 5. Ugyanezek az új oldalon
B=https://kineticare-production.up.railway.app
for u in kezrehab kezrelax rendeloi-kezelesek; do
  echo -n "/$u -> "; curl -s -o /dev/null -w "%{http_code}\n" "$B/$u"
done   # mind 404

# 6. A már működő kurzus-átirányítás mintája
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$B/kurzusok/1"
# -> 308 .../kurzusok/otthoni-kezrehab-program

# 7. Az ingyenes kurzus pénztára ár nélkül
#    (a HTML egyetlen sor, ezért grep -o | wc -l kell, nem grep -c;
#     az ár ezres elválasztója nem szóköz, hanem U+00A0, ezért a tr)
curl -s "$B/penztar?termek=2" | grep -o "Ft" | wc -l                      # -> 0
curl -s "$B/penztar?termek=1" | tr -d '\302\240' | grep -o "79500" | wc -l # -> 2

# 8. A Barion nincs megnevezve a pénztáron, csak a kurzusoldalon
curl -s  "$B/penztar?termek=1"                     | grep -oi barion | wc -l # -> 0
curl -sL "$B/kurzusok/otthoni-kezrehab-program"    | grep -oi barion | wc -l # -> 2

# 9. A fizetős kurzusoldalon nincs vélemény és GYIK, az ingyenesen van
curl -sL "$B/kurzusok/otthoni-kezrehab-program" | grep -o "Vélemény"         | wc -l # -> 0
curl -sL "$B/kurzusok/otthoni-kezrehab-program" | grep -o "Gyakori kérdések" | wc -l # -> 0
curl -sL "$B/kurzusok/sos-kezrelax-villamkurzus" | grep -o "Vélemények"       | wc -l # -> 2
curl -sL "$B/kurzusok/sos-kezrelax-villamkurzus" | grep -o "Gyakori kérdések" | wc -l # -> 2

# 10. Nincs redirects() a Next konfigban és nincs legacy szabály a middleware-ben
grep -c "redirects" next.config.ts                          # -> 0
grep -c "kezrehab\|kezrelax\|rendeloi" src/middleware.ts    # -> 0
```
