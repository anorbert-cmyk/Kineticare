# UX-hierarchia-audit — jelenlegi kineticare.hu (2026-08)

> **Mandátum:** „a jelenlegi oldal nem fedi le tökéletesen a célját, és
> modulok vannak hangsúlyozva, amiknek nem kellene."
> **Módszer:** az élő oldal (/, /rolunk, /kapcsolat) strukturális átvilágítása
> üzleti cél szerint. Az audit az ÚJ platform kezdőlapjának (HomeView) cél-
> hierarchiáját is rögzíti — a javasolt sorrendet a meglévő tartalomra vetítve.
> **Mérték:** üzleti cél = (1) kurzus-ÉRTÉKESÍTÉS (Barion), (2) bizalom/
> szakmai hitel, (3) kapcsolatfelvétel. Másodlagos: tudástár (SEO, hosszútáv).

---

## 1. A jelenlegi kezdőlap szerkezete (felülről lefelé)

| # | Modul | Szerep a valóságban | Célszerep |
|---|---|---|---|
| 1 | Hero (cím + alcím) | Márka-pozicionálás | OK, de **nincs látható elsődleges CTA** |
| 2 | **INGYENES SOS Kézrelax villámkurzus** | A legnagyobb hangsúly az egész oldalon | **Túlhangsúlyozott** — lead-magnetként MÁSODLAGOSNAK kellene lennie |
| 3 | Fájdalom-agitáció („Tudjuk, milyen, amikor…") | Empátia-építés | OK — a vásárlási motiváció alapja |
| 4 | „Üdvözlünk!" — alapító-bemutatkozás | Bizalom-építés | OK |
| 5 | Vélemények (3 db, HOSSZÚ szövegek) | Bizalom-építés | **Túl hosszú / túl korai** — összesen ~3 képernyőnyi |
| 6 | — | (az oldal vége) | **HIÁNYZIK: a fizetős kurzusok modulja** |

**A kritikus, mérhető tény: a kezdőlapon sehol nem jelenik meg fizetős kurzus —
sem kártya, sem ár, sem „Kurzusok" szekció.** Az értékesítés egyetlen útja az
INGYENES villámkurzuson át vezet… sehová (a fizetős ajánlat az oldalon nem
létezik). A cél (kurzus-eladás) és a hangsúly (ingyen-lead) így fordított.

## 2. Megállapítások (súlyosság szerint)

### K1 (kritikus) — A fizetős kurzusok láthatatlanok a kezdőlapon
A teljes oldal egyetlen konverziós felülete az INGYENES SOS Kézrelax. Aki
„vásárolni jött", azt nem talál semmit: nincs kurzus-kártya, nincs ár, nincs
„Megveszem" gomb. **Ez a legnagyobb veszteségpont.** → Cél-hierarchia M3.

### K2 (kritikus) — Az INGYENES kurzus eluralja a hangsúlyt
A lead-magnet (SOS Kézrelax) a hero utáni első és legnagyobb modul — erősebb,
mint bármi, ami pénzt hoz. A lead-magnet szerepe a TÖLCSÉR-teteje, nem a csúcsa.
→ Cél-hierarchia M4 (a fizetős kurzusok UTÁN, vagy velük azonos blokkban,
de másodlagos vizuális súllyal).

### K3 (magas) — A hero-ban nincs elsődleges CTA
A hero cím + alcím, de nincs kézzelfogható „Megnézem a kurzusokat" /
„Kezdjük el" gomb. A látogatónak magának kell kitalálnia a következő lépést.
→ M1: hero-ban EGY elsődleges CTA (kurzusok) + EGY másodlagos (ingyenes SOS).

### K4 (magas) — A vélemények túl hosszan, túl korán
Három, több bekezdésnyi testimonial ~3 képernyőnyi helyen, még mielőtt a
látogató bármit megtudna a termékről. A bizalom jó, de a sorrend fordított:
előbb a mit, aztán a ki-mondta. → M6: max 2, rövid (1–2 mondatos) idézet,
a termék UTÁN.

### K5 (közepes) — A szakmai hitel a Rólunk-oldalra van zárva
Olimpikonok, sportolók, két szakmai egyesület tagsága, oktatás — ez a legerősebb
érv, és a kezdőlapon csak egy bekezdésnyi emlékeztető. → M2: „hitel-csík"
(condensed credentials) a hero alatt.

### K6 (közepes) — Nincs „hogyan működik az online kurzus" blokk
Egy videókurzus-terméknél a mechanizmus (megveszem → azonnal nézem →
gyakorlok otthon) a legfontosabb ellenérvek-csökkentő. Sehol nincs. → M5.

### K7 (közepes) — Nincs FAQ (ellenérv-kezelés)
Műtét után is? Fáj? Mennyi idő? Kell eszköz? — a vásárlási kételyek itt
kezelhetők. → M8 (későbbi hullám; a support-láncot most a kapcsolat űrlap viszi).

### K8 (rendben) — A kapcsolat-oldal
Elérhetőség, 2 munkanapos válaszígéret, címek, űrlap adatkezelési
hozzájárulással — ez jó, megtartjuk (a T-016 űrlap ezt valósítja meg).

## 3. Cél-hierarchia az ÚJ kezdőlaphoz (javaslat)

| # | Modul (új HomeView) | Szerep | Forrás |
|---|---|---|---|
| M1 | **Hero + EGY elsődleges CTA („Megnézem a kurzusokat")** + másodlagos („Ingyenes SOS") | azonnali irány a pénztárhoz | hero + hero-videó |
| M2 | **Hitel-csík** (gyógytornász + manuálterapeuta + sportolók/olimpikonok + egyesületi tagság, 1 sor) | bizalom-keret | a Rólunk oldal kondenzátuma |
| M3 | **Fizetős kurzus-kiemelés (kártyák, ÁR + CTA)** | az értékesítés motorja | products (ProductCard) |
| M4 | Ingyenes SOS Kézrelax (lead-magnet, másodlagos súly) | tölcsér-teteje | ingyenes termék-kártya |
| M5 | „Így működik az online kurzus" (3 lépés) | ellenérv-csökkentés | CMS-blokk |
| M6 | Vélemények (max 2, rövid) | bizalom-zárás | legacy-tartalom rövidítve |
| M7 | Tudástár (3 friss poszt) + „Összes bejegyzés" | SEO, hosszútáv | posts |
| M8 | Kapcsolat-sáv / FAQ (későbbi hullám) | ellenérv-kezelés | T-016 űrlap |

**A jelenlegi HomeView már most M1/M3/M7 sorrendet épít (hero → kurzus-kiemelés
→ tudástár) — ez az audit szerint JÓ irány.** A következő hullámok pótlása:
M2 (hitel-csík), M4 (ingyenes SOS-kártya), M5 (hogyan-működik blokk), M6 (rövid
vélemények) — mindegyik CMS-oldaltartalomként (a staff a Lexical-szerkesztőben
írja), NEM kód-módosításként.

## 4. Mit NEM változtatunk

- A márka-hang és a fotók (erős, emberi — megtartandó).
- A kapcsolat-oldal működése (K8).
- A fájdalom-agitációs blokk szövege (jó konverziós pszichológia — az új hero
  alcím/lead ebből építkezhet, CMS-ben).

## 5. Mérés (PostHog — ezzel zárul a kör)

A hierarchia-átrendezés hatása mérhető lesz a funnel-láncon:
**$pageview(/) → course_viewed → checkout_started → purchase_confirmed.**
Az M1/M3 cél: a course_viewed aránya a kezdőlapi látogatásokhoz képest nőjön;
az M4 cél: az ingyenes SOS-regisztrációsból fizetős-vásárlás konverzió mérhető
legyen (későbbi identify-lépéssel).
