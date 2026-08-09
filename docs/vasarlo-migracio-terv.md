# Vásárló-átköltöztetés: systeme.io → Kineticare

> **Mire való:** a systeme.io-n vásárolt, meglévő ügyfelek zökkenőmentes
> átvitele az új Kineticare-platformra — úgy, hogy a vevő **ne veszítse el a
> hozzáférését**, **ne kelljen újra fizetnie**, és **pontosan tudja, mikor mi
> történik**.
>
> **Eszköz:** `src/scripts/import-customers.ts` (CSV-import) +
> `src/lib/customer-import/` (parser / terv / végrehajtás / aktiválási linkek).
>
> **Kapcsolódó:** `docs/manualis-vasarlas-hozzaadas.md` (egy-egy vevő kézi
> jóváírása), feladatlista **C8 / T-061**.

---

## 1. A kommunikáció öt alapelve

Ez a rész a „hogyan mondjuk el" kérdésre válaszol. A minta a nagy
szervezetek átállás-kommunikációja: **egyetlen igazságforrás, előre kiadott
idővonal, világos cselekvés, nyitott visszaút.**

1. **Egy hang, egy üzenet.** Minden levél ugyanabból a fiókból, ugyanazzal az
   aláírással és ugyanazzal a szóhasználattal megy ki. A vevő ne kelljen
   találgatnia, hogy valódi-e a levél — ezért nem használunk új feladó-címet
   az átállás közben.
2. **Előre bejelentett idővonal.** A vevő az első levélben megkapja a TELJES
   menetrendet (mikor mi történik, meddig mit tud használni). Semmi ne érje
   meglepetésként.
3. **Egyetlen kért cselekvés levelenként.** Egy levél = egy gomb. A bejelentő
   levélben nincs teendő; az aktiváló levélben pontosan egy: jelszót beállítani.
4. **A hozzáférés kimondva, nem sejtetve.** „A megvásárolt kurzusaid átkerültek,
   újra fizetni NEM kell." Ez a mondat szó szerint szerepeljen — ez a vevő
   legfőbb félelme.
5. **Visszaút biztosítva.** A régi rendszer addig marad élő, amíg az új
   bizonyítottan működik (lásd 7. — rollback-elv). Ezt is elmondjuk a vevőnek:
   „ha bármi nem sikerül, a régi felület még elérhető."

**Amit sosem írunk le:** hogy a rendszert most építjük, hogy mi mennyibe került,
hogy technikailag mi bonyolult. A vevőt a saját hozzáférése érdekli.

---

## 2. Idővonal

`T` = az átállás napja (a nap, amikor az új platform az egyetlen belépési pont).
Ajánlott: **kedd vagy szerda délelőtt** — így a hét maradékában van emberi
kapacitás a válaszokra. Ne péntek, ne ünnep előtt.

| Nap | Lépés | Ki csinálja | Kimenet |
| --- | --- | --- | --- |
| **T−14** | Adat-előkészítés: systeme.io-export letöltése, kurzusnév→SKU tábla összeállítása | technikai + Katák | `export.csv`, `--map` párok listája |
| **T−13** | **Próbafutás** (`--dry-run`) az éles adatbázis ellen, terv átnézése | technikai | terv-táblázat, nem leképezett kurzusnevek listája |
| **T−12** | A nem leképezett kurzusnevek tisztázása, `--map` kiegészítése, újabb próbafutás | Katák | tiszta próbafutás (0 ismeretlen kurzusnév) |
| **T−10** | **1. levél — Bejelentés** (teendő nincs) | Katák | minden meglévő vevő értesítve |
| **T−3** | Éles import futtatása (fiókok + hozzáférések létrejönnek), aktiválási linkek generálása | technikai | mérleg + `linkek.csv` |
| **T−3** | **2. levél — Aktiváló, személyre szóló linkkel** | Katák | mindenki tud jelszót állítani |
| **T−1** | **3. levél — Emlékeztető** csak azoknak, akik még nem léptek be | Katák | lemorzsolódás csökkentése |
| **T** | **Átállás napja:** a régi felület kezdőlapján/levélben átirányítás az újra | Katák | egyetlen belépési pont |
| **T+2** | Utókövetés: kik nem léptek be még → egyéni megkeresés | Katák | senki nem marad kint |
| **T+14** | Zárómérleg: belépési arány, hibalista lezárva | technikai + Katák | döntés a systeme.io lemondásáról |

**Kulcsszabály:** a **T−3**-as import és a **T−3**-as aktiváló levél KÖZÖTT ne
teljen el több nap. A generált link 30 napig érvényes, de a vevő fejében az
„épp most kaptam" a legerősebb cselekvésre ösztönző.

---

## 3. Mit tapasztal a vevő

| Kérdés | Mi történik a háttérben |
| --- | --- |
| Kap-e új fiókot? | Igen, az **eddigi e-mail-címével**. Ha már regisztrált az új oldalon, a meglévő fiókja marad — új nem jön létre. |
| Mi lesz a jelszavával? | A régi jelszó **nem költözik át** (nem is ismerjük). Az aktiváló levélben kap egy linket, amivel sajátot állít be. |
| Mi lesz a kurzusaival? | A megvásárolt kurzusok hozzáférésként (`purchases`) átkerülnek. A már meglévő hozzáféréseket az import **sosem törli** — csak kiegészíti. |
| Kell újra fizetnie? | Nem. Az import nem hoz létre rendelést és nem indít fizetést. |
| Mi van, ha kétszer futtatjuk az importot? | Semmi. A művelet idempotens: a második kör a kész sorokat kihagyja. |

---

## 4. Kész e-mail-szövegek

A `{{ }}` jelöléseket a levelezőrendszer körlevél-funkciója tölti ki.
**Az aktiváló levél linkje személyre szól** — csak körlevélként (mail merge)
küldhető ki, közös link NINCS.

### 4.1. Bejelentő levél (T−10) — teendő nincs

> **Tárgy:** Költözünk — a kurzusaid hamarosan új helyen várnak
>
> Kedves {{nev}}!
>
> Örömmel jelentjük be: a Kineticare kurzusai **új, saját platformra
> költöznek**. A cél egyszerű — gyorsabb videólejátszás, átláthatóbb
> kurzusoldalak és egy fiók, ahol minden megvásárolt anyagod egy helyen van.
>
> **A legfontosabb: a megvásárolt kurzusaid átkerülnek, újra fizetned NEM kell.**
>
> Mi vár rád, és mikor:
>
> - **{{datum_aktivalas}}** – kapsz tőlünk egy levelet egy személyes linkkel,
>   amivel beállíthatod a jelszavadat az új felületen.
> - **{{datum_atallas}}** – ettől a naptól az új oldalon éred el a kurzusaidat.
>
> **Most nincs teendőd.** Ezt a levelet elég elolvasni — a következő levél hozza
> majd a linket. Ha bármi kérdésed van, válaszolj erre a levélre, és emberi
> választ kapsz.
>
> Üdvözlettel:
> a Kineticare csapata

### 4.2. Aktiváló levél (T−3) — személyre szóló linkkel

> **Tárgy:** Itt a linked — állítsd be a jelszavad a Kineticare új felületén
>
> Kedves {{nev}}!
>
> Elkészült az új Kineticare-fiókod. Már minden megvásárolt kurzusod benne van —
> **újra fizetned nem kell**, csak egy jelszót kell beállítanod.
>
> **Jelszó beállítása:** {{aktivalasi_link}}
>
> Így indulj el:
>
> 1. Kattints a fenti linkre (csak neked szól, ne add tovább).
> 2. Adj meg egy jelszót — legalább 12 karakter, legyen benne kis- és nagybetű
>    és szám.
> 3. Belépés után a **Kurzusaim** oldalon találod az anyagaidat.
>
> A link **{{link_ervenyesseg}}**-ig érvényes. Ha lejárna, az „Elfelejtett
> jelszó" gombbal bármikor kérhetsz újat ugyanezzel az e-mail-címmel.
>
> Ha elakadsz, válaszolj erre a levélre — segítünk.
>
> Üdvözlettel:
> a Kineticare csapata

### 4.3. Emlékeztető (T−1) — csak azoknak, akik még nem léptek be

> **Tárgy:** Emlékeztető: még nem állítottad be a jelszavad
>
> Kedves {{nev}}!
>
> Azt látjuk, hogy még nem léptél be az új Kineticare-felületen. Semmi baj —
> a kurzusaid megvannak, és **holnaptól** az új oldalon éred el őket.
>
> **A jelszó beállítása 1 perc:** {{aktivalasi_link}}
>
> Ha a link nem működik, vagy nem emlékszel, melyik e-mail-címmel vásároltál,
> válaszolj erre a levélre — megkeressük, és megoldjuk.
>
> Üdvözlettel:
> a Kineticare csapata

### 4.4. „Segítségre van szükségem" — válasz-sablon

Erre a levélre a Katák válaszolnak; a `[ ]` részeket a helyzethez kell igazítani.

> **Tárgy:** Re: {{eredeti_targy}}
>
> Kedves {{nev}}!
>
> Köszönjük, hogy szóltál — megnéztük a fiókodat.
>
> [**HA a link lejárt vagy nem működik:**]
> Küldtem egy friss linket erre a címre — kérlek, azzal próbáld újra. Ha percek
> alatt sem érkezik meg, nézd meg a Spam/Levélszemét mappát is.
>
> [**HA másik e-mail-címmel vásárolt:**]
> A vásárlásodat a(z) {{masik_email}} címen találtuk meg. Két lehetőség van:
> ezzel a címmel lépsz be, vagy szólj, és átvezetjük a mostani címedre.
>
> [**HA hiányzik egy kurzus:**]
> Ellenőriztük, és igazad van: a(z) {{kurzus}} nem került át. Már javítottuk, a
> következő belépésnél látni fogod. Elnézést a kellemetlenségért.
>
> Ha bármi más nem stimmel, írj nyugodtan — végigmegyünk rajta együtt.
>
> Üdvözlettel:
> {{alairas}}

---

## 5. GYIK — a vevők kérdései és a válaszok

**„Mi lesz a hozzáférésemmel?"**
Minden korábban megvásárolt kurzusod átkerül az új fiókodba, ugyanarra az
e-mail-címre. A hozzáférés nem jár le az átállás miatt.

**„Kell újra fizetnem?"**
Nem. Az átköltöztetés nem hoz létre új rendelést és nem indít fizetést. Amit egyszer
megvettél, az a tiéd marad.

**„Nem kaptam linket, mit tegyek?"**
Először nézd meg a Spam/Levélszemét mappát, és keress rá a „Kineticare" szóra.
Ha így sincs meg, az oldalon az **Elfelejtett jelszó** gombbal bármikor kérhetsz
újat — ugyanazzal az e-mail-címmel, amivel vásároltál. Ha az sem érkezik meg,
írj nekünk: elképzelhető, hogy más címmel vásároltál.

**„Lejárt a linkem."**
Kérj újat az **Elfelejtett jelszó** gombbal. A régi link ilyenkor automatikusan
érvénytelenné válik — mindig a legfrissebb levélben lévő linket használd.

**„Két e-mail-címem is van, melyikkel lépjek be?"**
Azzal, amelyikkel vásároltál. Ha nem emlékszel, írj nekünk, és megkeressük.

**„Meddig érem el a régi felületet?"**
Az átállás napjáig biztosan. Utána is csak akkor mondjuk le a régi rendszert, ha
az új már mindenkinél működik.

**„Elveszik a haladásom / a jegyzeteim?"**
A kurzus-hozzáférés átkerül. A régi rendszerben tárolt megtekintési előzmény nem
költözik — a videók újranézhetők, korlátozás nélkül.

---

## 6. A CLI használata lépésről lépésre

### 6.0. Előkészítés

Kell hozzá:

- a systeme.io-export CSV-je (e-mail + név + megvásárolt kurzus/címke oszlop),
- a **kurzusnév → SKU** tábla (a Katáktól): melyik régi kurzusnév melyik
  Kineticare-terméknek felel meg. A SKU-t az adminban a **Kurzusok** listában
  látod („Kurzus neve (azonosító)").

> **Fontos:** a scriptet abból a könyvtárból futtasd, ahol a `.env` elérhető —
> a `DATABASE_URI`-t és a `PAYLOAD_SECRET`-et a Payload-config onnan olvassa.
> A `--out-links` használatához a `NEXT_PUBLIC_SERVER_URL` is kell.

### 6.1. Első lépés: PRÓBAFUTÁS (kötelező)

```bash
npx tsx src/scripts/import-customers.ts \
  --file=export.csv \
  --map "Kéz Rehab Alap=KEZ-ALAP" \
  --map "Kéz Rehab Haladó=KEZ-HALADO" \
  --dry-run
```

A próbafutás **egyetlen sort sem ír** az adatbázisba. Kiírja:

- a teljes tervet táblázatban (`ÚJ FIÓK` / `BŐVÍTÉS` / `KIHAGY` soronként),
- a **nem leképezett kurzusneveket** — ezekhez hiányzik a `--map` pár,
- az összesítőt (létrehozandó / bővítendő / kihagyva / hibás sor).

**Addig ne menj tovább, amíg a „nem leképezett kurzusnév" lista nem üres**
(vagy amíg tudatosan el nem döntöttétek, hogy az adott címke — pl. hírlevél-tag —
nem kurzus, tehát kimaradhat).

### 6.2. Oszlopnevek és elválasztó

Ha a fájl fejléce nem felismerhető nevű (a script az `email` / `név` / `kurzus`
jellegű neveket ismeri automatikusan), add meg kézzel:

```bash
npx tsx src/scripts/import-customers.ts \
  --file=export.csv --delimiter=';' \
  --email-col="E-mail cím" --name-col="Teljes név" --courses-col="Megvásárolt termékek" \
  --map "Kéz Rehab Alap=KEZ-ALAP" --dry-run
```

| Kapcsoló | Mire jó |
| --- | --- |
| `--delimiter=';'` | Magyar Excelből mentett fájl (pontosvessző). `--delimiter='\t'` = tabulátor. |
| `--email-col` / `--name-col` / `--courses-col` | Az oszlopok fejlécneve, ha az automatikus felismerés nem talál. |
| `--map "Név=SKU"` | Ismételhető. Egy kurzusnév → egy termék. |
| `--dry-run` | Próbafutás: nulla írás. |
| `--out-links=<út>` | Aktiválási linkek CSV-be (éles futásnál). |
| `--invite-all` | Link ne csak az új fiókoknak, hanem minden érintett vevőnek. |
| `--help` | Súgó. |

### 6.3. Éles futtatás

Ugyanaz a parancs, `--dry-run` **nélkül**, kiegészítve a linkek kimenetével:

```bash
npx tsx src/scripts/import-customers.ts \
  --file=export.csv \
  --map "Kéz Rehab Alap=KEZ-ALAP" \
  --map "Kéz Rehab Haladó=KEZ-HALADO" \
  --out-links="$HOME/kineticare-linkek.csv"
```

A futás soronként kiírja az eredményt, a végén pedig a **mérleget**:

```text
MÉRLEG — létrehozva: 128, bővítve: 14, kihagyva (már megvolt): 3, hibás sor: 0,
nem leképezett kurzusnév: 0.
```

### 6.4. Az aktiválási linkek fájlja

- Alapból csak az **újonnan létrehozott** fiókokhoz készül link; a
  `--invite-all` kapcsolóval minden érintett vevő kap.
- A fájl `email,aktivalasi_link` oszloppal, UTF-8 BOM-mal készül — az Excel
  ékezethelyesen, oszlopokra bontva nyitja meg. Ez a körlevél forrásfájlja.
- **A fájl titkot tartalmaz.** Aki megkapja a linket, jelszót állíthat az adott
  fiókhoz. Ezért:
  - a projekt könyvtárán **kívülre** írasd (`--out-links="$HOME/kineticare-linkek.csv"`),
  - a repóba **soha** ne kerüljön be,
  - a körlevél kiküldése után **töröld**.
- Új linkgenerálás felülírja a korábbi tokent: a régi link ilyenkor
  érvénytelen. Ne keverd a köröket — mindig a legfrissebb fájlból küldj.

### 6.5. Ellenőrzés az import után

1. Az adminban nézz meg **3 mintavevőt**: van fiókjuk, a „Megvásárolt kurzusok"
   mezőben ott a helyes kurzus, a szerepkörük `Vásárló`.
2. Egy tesztfiókkal (saját cím) menj végig a teljes úton: link → jelszó →
   belépés → **Kurzusaim** → videó elindul.
3. A mérleg számai stimmeljenek: `létrehozva + bővítve + kihagyva` = a fájlban
   szereplő **egyedi e-mail-címek** száma (a többször szereplő e-mail egynek
   számít — a script összefésüli), a hibás sorok pedig ezen felül vannak.

### 6.6. Újrafuttatás (megszakadt futás)

**Az import idempotens**, ezért a megszakadt futás (hálózat-hiba, Ctrl-C,
adatbázis-zár) **biztonságosan újraindítható ugyanazzal a paranccsal**:

- meglévő felhasználónál a jelszót, a szerepkört és a meglévő vásárlásokat
  **sosem** módosítja,
- csak a ténylegesen hiányzó hozzáférést fűzi hozzá,
- a már kész sorokat a második kör `KIHAGY`-ként jelenti.

Amire figyelj: ha a `--out-links` kapcsolót is megismétled, **új tokenek**
készülnek, és a korábban kiküldött linkek érvénytelenné válnak. Újrafuttatásnál
a linkgenerálást csak akkor kérd, ha a leveleket még nem küldtétek ki.

---

## 7. Hibaágak — mit jelentenek és mi a teendő

| Jelenség | Mit jelent | Teendő |
| --- | --- | --- |
| `Nem található a fájl: …` (exit 1) | Rossz útvonal | Ellenőrizd a `--file` értékét. |
| `Nincs importálható sor.` | Üres fájl vagy csak fejléc | Kérd újra az exportot. |
| `Nem található e-mail-oszlop…` | A fejléc neve ismeretlen | Add meg: `--email-col="…"`. |
| `Hiányzó vagy többlet oszlop: …` (sor kimarad) | A sor mezőszáma eltér a fejléctől — elcsúszott adat | Nézd meg az adott sort a fájlban; javítás után futtasd újra. |
| `Hibás e-mail-formátum` / `Üres e-mail-cím` | Rossz cella | A sor kimarad, a futás megy tovább. Javítsd, és futtasd újra. |
| `a --map olyan SKU-ra hivatkozik, ami nincs az adatbázisban` (exit 1) | Elgépelt SKU | **Írás nem történt.** Javítsd a `--map` értéket. |
| `Nem leképezett kurzusnevek (…)` | Hiányzó `--map` pár | Egészítsd ki, vagy tudatosan hagyd ki (pl. hírlevél-címke). |
| `a users kollekció üres…` (exit 1) | Nincs még admin-felhasználó | Előbb hozd létre az admint — az első user owner szerepkört kapna. |
| Egy soron `HIBA` | Adatbázis-hiba annál a sornál | A futás folytatódik; a végén exit-kód 1. **Futtasd újra** — az idempotencia miatt csak a hiányzó sorok készülnek el. |

**Kilépési kódok:** `0` = hibátlan futás; `1` = indítási hiba (fájl, argumentum,
ismeretlen SKU, üres users-kollekció) **vagy** legalább egy hibás sor a futásban.

---

## 8. Rollback-elv — a visszaút

**A systeme.io-előfizetést csak a SIKERES átállás UTÁN mondjátok le.** Amíg a
régi rendszer él, minden hiba visszafordítható: a vevő ott is eléri az anyagot.

A lemondás feltételei (mind teljesüljön, tipikusan **T+14** környékén):

1. Az import mérlege hibátlan (`hibás sor: 0`, `nem leképezett kurzusnév: 0`).
2. A vevők legalább **80%-a** belépett az új felületen.
3. A maradék vevőket egyenként megkerestétek (T+2-es utókövetés), és nincs
   megválaszolatlan „nem tudok belépni" levél.
4. Az exportfájl **és** a régi rendszer adatai archiválva vannak (a
   kurzus-hozzáférések listája a lemondás után is rekonstruálható legyen).
5. Az adatbázisról van mentés (feladatlista **C14** — élesítés előtti tétel).

Ha bármelyik feltétel nem teljesül: **ne mondjátok le**, hosszabbítsatok egy
hónapot. Egy hónapnyi előfizetés olcsóbb, mint egyetlen elveszett vevő.

**Ha az import félrement:** a script **nem töröl semmit**, tehát nincs mit
visszaállítani — a rossz hozzáférést az adminban lehet levenni, a felesleg
fiókot pedig tulajdonosi jogosultsággal törölni. Ezért is kötelező a
próbafutás: a terv átnézése olcsóbb, mint a takarítás.

---

## 9. Adatvédelem és titokkezelés

- Az **exportfájl** és a **linkfájl** személyes adatot (és tokent) tartalmaz:
  a repóba egyik sem kerülhet be, a kiküldés után törlendők.
- A script **nem naplóz** jelszót, tokent és aktiválási linket — a strukturált
  naplóba csak e-mail, felhasználó-azonosító, termék-azonosító és darabszám kerül.
- A generált kezdőjelszó véletlen, sehol nem jelenik meg, és a vevő úgysem
  használja: a jelszavát az aktiválási linkkel ő maga állítja be.
- Az import **nem küld e-mailt** — a kiküldés emberi, ellenőrzött lépés.

---

## 10. Mi kell még az éleshez

Ezek a nyitott pontok — nélkülük az eszköz kész, de az átállás nem indítható.

| # | Mi hiányzik | Kitől | Miért blokkoló |
| --- | --- | --- | --- |
| 1 | **A systeme.io-export pontos formátuma** — egy valódi (akár 3 soros, anonimizált) mintafájl a fejléccel | Katák | Ebből derül ki az elválasztó, az oszlopnevek, és hogy a kurzusok egy cellában vagy több sorban jönnek. A parser mindkettőt tudja, de a kapcsolókat előre be kell állítani. |
| 2 | **Kurzusnév → SKU tábla** — minden systeme.io-kurzusnévhez a Kineticare-termék azonosítója | Katák | Enélkül a kurzusnevek nem leképezettként kimaradnak (a vevő fiók nélkül nem, de kurzus nélkül maradna). |
| 3 | **E-mail-küldés döntése (SMTP/szolgáltató)** — a script csak linket állít elő | üzemeltetés | El kell dönteni, hogy a körlevél a Katák levelezőjéből, meglévő hírlevél-eszközből vagy beállított SMTP-ből megy-e ki. Ettől függ a feladó-cím és a kézbesíthetőség. |
| 4 | **Adatbázis-mentés** (feladatlista C14) | üzemeltetés | Tömeges írás előtt kötelező visszaállítási pont. |
| 5 | **Az átállás dátuma** és a levelek aláírása | Katák | A levélsablonok `{{datum_*}}` és aláírás-mezői. |
| 6 | **Kettős e-mail-címek listája** (aki más címmel vásárolt, mint amit használ) | Katák | Ezek kézi összevezetést igényelnek — az import e-mail-cím alapján dolgozik. |
