# Szerkesztői útmutató — a Kineticare admin használata

> **Kinek szól?** Neked, aki a weboldal tartalmát írod és gondozod. Nem kell hozzá
> semmilyen informatikai előképzettség: ez az útmutató végigvezet azon, hogyan
> hozol létre blogbejegyzést, oldalt, kategóriát, menüpontot és véleményt, hogyan
> töltesz fel képet, és mihez jobb nem hozzányúlni.
>
> Az útmutató a jelenlegi admin felülethez készült: minden gombnév és mezőnév úgy
> szerepel benne, ahogy a képernyőn látod. Ha valami mást látsz, mint amit itt
> olvasol, az hiba — jelezd (lásd a legvégén: „Hibát látsz?").

---

## 1. Belépés

1. Nyisd meg a böngészőben a weboldal címét, és írj a végére `/admin`-t
   (például `https://kineticare.hu/admin`).
2. Add meg az e-mail-címed és a jelszavad, majd kattints a **Bejelentkezés** gombra.
3. Ha elfelejtetted a jelszavad, az **Elfelejtett jelszó** linkre kattints — e-mailben
   kapsz egy linket, amivel újat állíthatsz be.

Néhány dolog a jelszóról:

- legalább **12 karakter** legyen,
- ne az e-mail-címed részlete legyen,
- ne oszd meg senkivel — mindenkinek saját belépése van.

Kilépni jobbra fent, a fiókodnál található **Kijelentkezés** ponttal tudsz.

> **Új munkatárs felvételekor figyelj:** az újonnan létrehozott felhasználó
> szerepköre alapból „Vásárló", és így **nem tud belépni az adminba**. A szerepkört
> a tulajdonos tudja „Munkatárs"-ra állítani.

---

## 2. Az admin felépítése

Belépés után bal oldalon látod a menüt. A tételek csoportokba vannak rendezve,
felül a leggyakrabban használt, alul a legritkábban kellő dolgokkal:

| Csoport | Mi van benne | Kell-e neked? |
| --- | --- | --- |
| **Tartalom** | Képek, Oldalak, Blogbejegyzések, Kategóriák, Vélemények | Igen — ez a napi munkád. |
| **Navigáció** | Menüpontok | Igen — az oldal tetején látszó menü. |
| **Webshop** | Kurzusok, Rendelések, Kosarak, Tranzakciók | Csak nézegetni. Lásd a 11. pontot. |
| **Űrlapok** | Űrlapok, Űrlapbeküldések | A kapcsolati űrlap és a beérkezett üzenetek. |
| **Felhasználók** | Felhasználók | Csak óvatosan. Lásd a 11. pontot. |
| **Rendszer** | Rendszeresemények, Műveletnapló | Nem a tiéd — csak technikai napló. |

Egy csoportra kattintva megkapod a listát (pl. az összes blogbejegyzést). A lista
jobb felső sarkában van az **Új létrehozása** gomb, a listaelemre kattintva pedig
szerkeszthetsz.

---

## 3. Négy fogalom, amit érdemes érteni

### Piszkozat

A piszkozat olyan tartalom, amit **csak te látsz** az adminban. A weboldal
látogatói nem találkoznak vele. Nyugodtan írhatsz bele félkész mondatokat is.

### Automatikus mentés

Az Oldalak és a Blogbejegyzések **maguktól mentődnek**, piszkozatként, miközben
írsz — nem kell külön „Mentés" gombot keresned, és nincs is ilyen gomb. A
dokumentum tetején látod, mikor mentett utoljára a rendszer. Ha bezárod a fület,
a munkád megmarad.

(A Kategóriáknál, Menüpontoknál, Véleményeknél és Képeknél nincs piszkozat: ott
egy **Mentés** gomb van, és a mentés azonnal élesít.)

### Közzététel

Amikor kész vagy, a **Közzététel** gombbal teszed ki a tartalmat az élő oldalra.
Ha egy már közzétett tartalmon módosítasz, a gomb neve **Módosítások közzététele**
lesz — vagyis a látogatók addig a régi, közzétett változatot látják, amíg rá nem
nyomsz.

A dokumentum állapotát a szerkesztő tetején látod: **Piszkozat** vagy **Közzétett**.
A közzétételt vissza is lehet vonni: **Közzététel visszavonása** — ilyenkor a
tartalom azonnal eltűnik az oldalról, de nem vész el, piszkozatként megmarad.

### Előnézet

Az **Előnézet** gombbal megnézheted, hogyan fest a **piszkozatod** az éles oldal
kinézetében, mielőtt bárki más látná. A gomb akkor jelenik meg, ha a
dokumentumnak már van címe (és így webcíme is).

Az előnézet csak bejelentkezett munkatársnak/tulajdonosnak működik: ha valaki
másnak küldöd el a linket, ő nem fogja látni a piszkozatot.

### Webcím (slug)

A **Webcím (slug)** a cím webcímes alakja: ékezetek nélkül, kisbetűvel,
kötőjelekkel. **Magától kitöltődik** a címből — például
„Kézrehabilitáció otthon" → `kezrehabilitacio-otthon`.

Csak akkor írd át, ha tudod, mit csinálsz: a webcím a link része, és ha
megváltoztatod egy már közzétett tartalomnál, **a régi link megszűnik működni**
(aki elmentette vagy megosztotta, hibaüzenetet kap).

### Verziók (biztonsági háló)

Az Oldalaknál és a Blogbejegyzéseknél van egy **Verziók** fül. Itt a korábbi
mentések listáját látod, és bármelyiket vissza tudod állítani
(**A verzió visszaállítása**). Ha véletlenül kitörölsz egy bekezdést, innen
visszahozható.

---

## 4. Új blogbejegyzés lépésről lépésre

1. Bal oldalt: **Tartalom → Blogbejegyzések**, majd jobb fent **Új létrehozása**.
2. **Cím** — kötelező. Ez jelenik meg a bloglistán és a Google találatai közt.
3. **Webcím (slug)** — magától kitöltődik a címből, hagyd békén.
4. **Rövid bevezető** — 1–3 mondat. A bloglista kártyáin és a Google-ban is ez látszik.
5. **Tartalom** — ide írod a cikket. A szövegdoboz fölött **mindig ott van az
   eszköztár**: címsorok, félkövér, dőlt, felsorolás, számozott lista, link,
   idézet, kép beszúrása.
   - Ne csinálj a szövegben „óriás betűs" címsort: használd a felkínált
     címsorszinteket (a cikk fő címét már megadtad fent).
   - Linkeléshez jelöld ki a szöveget, és kattints a lánc ikonra.
6. **Borítókép** — a bloglistán és a cikk tetején jelenik meg. Feltöltésnél a
   képleírás kötelező (lásd a 9. pontot).
7. **SEO-cím** és **SEO-leírás** — ha üresen hagyod, a Google a fenti címet és
   bevezetőt használja. A leírás kb. 150 karakter legyen.
8. **Megosztási kép** — ez látszik, ha valaki Facebookon vagy Messengeren megosztja.
9. **Megjelenés dátuma** — az első közzétételkor magától kitöltődik; a bloglista
   ez alapján rendez (a legfrissebb elöl). Csak akkor írd át, ha szándékosan más
   dátumot akarsz mutatni.
10. **Szerző** — alapból te vagy. Csak akkor állítsd át, ha más nevében írod.
11. **Kategóriák** — több is választható. Ha még nincs megfelelő, előbb hozd létre
    (5. pont).
12. **Kapcsolódó bejegyzések** — legfeljebb 3 cikk, amit a bejegyzés alján ajánlunk.
13. Kattints az **Előnézet**re, nézd meg, jól fest-e.
14. Ha jó: **Közzététel**.

A kész cikk itt jelenik meg:

- a blog listaoldalán: `/blog`,
- saját címén: `/blog/<webcím>`,
- a kategóriaoldalán: `/blog/kategoria/<kategória webcíme>`,
- és a kezdőlap „Tudástár" blokkjában a 3 legfrissebb cikk.

---

## 5. Új kategória

A kategória a cikkek témakörökbe rendezésére való.

1. **Tartalom → Kategóriák → Új létrehozása**.
2. **Név** — ahogy az olvasó látja, pl. „Kézrehabilitáció".
3. **Webcím (slug)** — magától kitöltődik, ékezet nélkül (`kezrehabilitacio`).
4. **Mihez tartozik**:
   - *Blogbejegyzésekhez* — ez a blog témaköre; a blog csak ezeket mutatja,
   - *Kurzusokhoz* — a webshop termékeinek besorolása.
5. **Fölérendelt kategória** — csak akkor töltsd ki, ha ez egy nagyobb témakör
   alkategóriája. Ha bizonytalan vagy, hagyd üresen.
6. **Mentés**. A kategória azonnal él, saját oldala: `/blog/kategoria/<webcím>`.

Tipp: kevés, jól elkülönülő kategória hasznosabb, mint húsz, amiből mindegyikben
egy cikk van.

---

## 6. Új oldal

Az „oldal" az állandó tartalom (pl. Rólunk, Szolgáltatások) — szemben a
blogbejegyzéssel, ami idővel régivé válik.

1. **Tartalom → Oldalak → Új létrehozása**.
2. **Cím**, **Webcím (slug)**, **Rövid bevezető**, **Tartalom** — ugyanúgy, mint a
   blogbejegyzésnél (4. pont).
3. **Fejléckép** — az oldal tetején megjelenő nagy kép (nem kötelező).
4. **SEO-cím**, **SEO-leírás**, **Megosztási kép** — mint a bejegyzésnél.
5. **Előnézet**, majd **Közzététel**.

A kész oldal a webcímén él: pl. `/rolunk`.

Két dolog, amire figyelj:

- **A kezdőlap külön eset.** A kezdőlap több blokkból áll: a hero (nagy felső
  blokk), a kurzuskártyák, az ingyenes SOS-blokk, a „Így működik", a vélemények,
  a Tudástár és a GYIK **kódból** jönnek. A kezdőlap szerkeszthető szöveges
  blokkját a **`kezdolap`** webcímű Oldal tartalmazza — ha a kezdőlap szövegén
  akarsz módosítani, ezt az oldalt szerkeszd.
- **Az új oldal nem kerül automatikusan a menübe.** Ha szeretnéd, hogy a
  látogatók megtalálják, csinálj hozzá menüpontot (7. pont).

---

## 7. Új menüpont

A menü az oldal tetején látszó navigáció. Legfeljebb **2 szintű**: főmenüpontok,
és alattuk almenüpontok.

1. **Navigáció → Menüpontok → Új létrehozása**.
2. **Felirat** — ez a szöveg jelenik meg a menüben (pl. „Kurzusok").
3. **Hová mutat** — ettől függ a következő mező:

   | Típus | Mit válassz utána |
   | --- | --- |
   | **Oldal** | a **Cél** mezőben az oldalak közül választasz (pl. Rólunk) |
   | **Bejegyzés** | a **Cél** mezőben egy blogbejegyzést |
   | **Kurzus** | a **Cél** mezőben egy terméket a webshopból |
   | **Külső link** | a **Külső webcím** mezőbe teljes címet írsz, `https://`-sel kezdve |

4. **Fölérendelt menüpont** — csak akkor töltsd ki, ha ez almenüpont. Almenüpont
   alá már nem tehetsz továbbit (a menü 2 szintű).
5. **Sorrend** — kisebb szám = előrébb. Érdemes 1, 2, 3… számozást használni.
6. **Látható** — ha kiveszed a pipát, a menüpont eltűnik az oldalról, de nem vész
   el. Ez a helyes módja egy menüpont „elrejtésének" — törölni nem kell.
7. **Új lapon nyíljon** — külső linkeknél szokás bekapcsolni.
8. **Mentés**. A menü azonnal frissül az oldalon.

Ha valamit rosszul állítasz be (pl. „Oldal" típust választasz, de nem adsz meg
célt), a mentés magyar hibaüzenettel megáll — nem tudsz elrontani semmit.

---

## 8. Új vélemény

A vélemények a pácienseink visszajelzései. A kezdőlapon a **kiemelt** vélemények
jelennek meg.

> **A legfontosabb szabály:** ide **kizárólag valós, tényleg elhangzott vélemény**
> kerülhet, **betűhíven**. Kitalált, összeollózott vagy „megszépített"
> visszajelzés tilos.

1. **Tartalom → Vélemények → Új létrehozása**.
2. **Vélemény szövege (teljes)** — kötelező. A teljes, eredeti szöveg, pontosan
   úgy, ahogy elhangzott.
3. **Vélemény szövege (rövid)** — nem kötelező, de a kezdőlapra ez való: 1–2
   mondat, **legfeljebb 260 karakter**. Ha hosszabbat írsz, a mentés magyar
   hibaüzenettel figyelmeztet. A kezdőlapon ez a rövid szöveg jelenik meg; ha
   üresen hagyod, a teljes szöveg kerül ki.
4. **Név** — aki mondta (pl. „Garami Gábor" vagy „P. Benjámin", ha csak
   keresztnévvel vállalta).
5. **Titulus, foglalkozás** — nem kötelező, pl. „zenész / műsorvezető".
6. **Kiemelt** — ez a pipa jelenti azt, hogy **megjelenik a kezdőlapon**.
   A kezdőlapon **legfeljebb 3** vélemény látszik: a kiemeltek közül a
   **Sorrend** szerint első három. Ha többet pipálsz ki, attól nem lesz több
   a kezdőlapon, csak nem lesz kiszámítható, melyik három marad ki.
7. **Sorrend** — kisebb szám = előrébb (a kezdőlapon 1, 2, 3 a három kiemelt).
8. **Látható** — ha kiveszed a pipát, a vélemény sehol nem jelenik meg, de nem
   vész el.
9. **Mentés**. A vélemény azonnal él.

Ha új véleményt akarsz kitenni a kezdőlapra egy régi helyett: az újnál pipáld be a
**Kiemelt**et és adj neki 1–3 közötti sorszámot, a leváltottnál pedig **vedd ki a
Kiemelt pipát** (a vélemény megmarad, csak nem a kezdőlapon).

---

## 9. Kép feltöltése és a képleírás

Képet két helyről tölthetsz fel: a **Tartalom → Képek** listából (**Új
létrehozása**), vagy közvetlenül szerkesztés közben, amikor egy képmezőnél
(borítókép, fejléckép) vagy a szövegszerkesztőben képet szúrsz be.

Amit tudni érdemes:

- **A Képleírás (alt) kötelező.** Egy mondatban írd le, mi látszik a képen
  (pl. „Kiss Kata gyógytornász csuklókezelést végez").
- **Miért kötelező?** Egyrészt a vak és gyengénlátó látogatók képernyőolvasó
  programja ezt olvassa fel — enélkül számukra a kép nem létezik. Másrészt a
  Google is ebből érti meg, mi van a képen, tehát a keresésben is számít.
  Ne írj bele „kép", „fotó", „IMG_1234" típusú szöveget.
- **Formátumok:** jpg, png, webp, avif, gif. SVG nem tölthető fel.
- **Méret:** legfeljebb 10 MB fájlonként. A rendszer a feltöltött képet
  automatikusan optimalizálja és több méretben eltárolja, hogy gyorsan töltsön be
  mobilon is — neked nem kell méretezned.
- **Egy kép többször is használható:** ami egyszer fent van, azt bármelyik
  oldalról ki tudod választani, nem kell újra feltölteni.

---

## 10. Mi történik közzétételkor?

- A tartalom **azonnal élesedik**: a látogatók a következő oldalbetöltésnél már az
  új változatot látják. Nincs várakozás, nincs „gyorsítótár-ürítés".
- A Google-nak viszont **idő kell**, mire indexeli az új tartalmat — ez nem hiba,
  napokat is igénybe vehet.
- Ha meggondoltad magad: **Közzététel visszavonása**. A tartalom azonnal eltűnik
  az oldalról, és piszkozatként megmarad.
- Ha csak elgépeltél valamit: javítsd, majd **Módosítások közzététele**.
- Ha egy egész korábbi állapotot akarsz vissza: **Verziók** fül →
  **A verzió visszaállítása**.

---

## 11. Amihez ne nyúlj

Ezek nem tiltások a tiltás kedvéért: mindegyik mögött van valami, ami a
látogatóknak vagy a vásárlóknak fáj, ha elromlik.

**Webshop (Kurzusok, Rendelések, Kosarak, Tranzakciók)**

- A **Rendeléseket, Kosarakat, Tranzakciókat** ne írd át, ne töröld. Ezeket a
  fizetési folyamat tölti automatikusan, és ezekhez kötődik az, hogy a vásárló
  hozzáfér-e a megvett kurzushoz, illetve mi kerül a számlájára. Ha egy
  rendeléssel gond van, szólj — ne javítsd kézzel.
- A **Kurzusok** árát, státuszát csak egyeztetés után módosítsd.

**Felhasználók**

- A **Szerepkör** mezőt csak a tulajdonos tudja állítani (Tulajdonos / Munkatárs /
  Vásárló). Ha új kollégának kell hozzáférés, kérd meg a tulajdonost.
- Felhasználót **ne törölj** — vásárlói fiók törlésével a vásárlásai is
  értelmezhetetlenné válnak.

**Rendszer csoport (Rendszeresemények, Műveletnapló)**

- Ez technikai napló a hibakereséshez. Nézni szabad, írni/törölni nem kell benne
  semmit.

**Általános óvatosság**

- **Törlés helyett rejts el.** Menüpontnál és véleménynél vedd ki a *Látható*
  pipát, oldalnál/bejegyzésnél vond vissza a közzétételt. A törlés végleges.
- **Élő tartalom webcímét (slug) ne írd át** — a régi linkek elhalnak.
- Ha egy mentés hibaüzenettel áll meg, olvasd el az üzenetet: magyarul mondja meg,
  mi hiányzik. Nem rontottál el semmit, a hibás adat nem mentődött el.

---

## 12. Hibát látsz?

Előfordul. Ilyenkor a legtöbbet azzal segítesz, ha **pontosan** leírod, mi
történt. Küldd el ezt az öt dolgot:

1. **A pontos hibaüzenet** — szó szerint, vagy még jobb: képernyőkép az egész
   képernyőről (a böngésző címsorával együtt).
2. **Az időpont** — dátum és óra:perc. Ez a legfontosabb: a naplókban időpont
   alapján kereshető meg, mi történt a háttérben.
3. **Mit csináltál** — pl. „a Blogbejegyzések alatt a »Csuklófájdalom« cikknél a
   Közzététel gombra kattintottam".
4. **Melyik oldalon/dokumentumnál** — a böngésző címsorában látszó cím segít
   (`.../admin/collections/posts/123`).
5. **Böngésző és eszköz** — pl. „Chrome, laptop" vagy „Safari, iPhone".

Amit **ne** csinálj hiba után: ne nyomd meg ötször ugyanazt a gombot. Előbb
frissítsd az oldalt, és nézd meg a listában, létrejött-e mégis a dokumentum —
így elkerülhető, hogy ugyanaz a cikk háromszor szerepeljen.

Ha a hiba pénzt vagy vásárlót érint (rendelés, fizetés, hozzáférés), azt jelezd
azonnal és külön — az ilyet nem érdemes „majd holnap" alapon kezelni.
