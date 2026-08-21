# Ár-snapshot backfill (`orders.items[].priceHufSnapshot`)

> **Mire való:** a régi rendelés-tételeknél hiányzó „Ár a megrendeléskor”
> (`priceHufSnapshot`) érték pótlása — kizárólag a rendelés SAJÁT végösszegéből,
> a Payload LOCAL API-n keresztül.
>
> **Eszköz:** `src/scripts/backfill-price-snapshot.ts` → `npm run backfill:ar-snapshot`
>
> **Egyszeri, tulajdonos által jóváhagyott művelet.** Alapból próbafutás; írni
> csak külön környezeti változóval lehet.

---

## 1. Mi a baj, amit javít

A T-017 item-szintű snapshotot (`orders.items[].priceHufSnapshot`) az
`orderIntegrityBeforeChange` hook tölti — **kizárólag rendelés létrehozásakor**
(`src/lib/order-integrity.ts`). A hook bevezetése előtt keletkezett
rendeléseknél a mező ezért NULL maradt, és utólag semmi nem töltötte ki.

Két külön következménye van:

| Hol | Mi történik ma | Ez a backfill javítja? |
| --- | --- | --- |
| **Havi bevétel** (`buildMonthlyRevenue`) | **Rendben van.** Ha a tételekből számolt összeg 0, de a rendelés-szintű `totalHufSnapshot` pozitív, az utóbbi számít (F3-javítás, `src/lib/statistics/revenue.ts`). | Nem érintett — a szám már ma is helyes. |
| **Kurzus-bontás** (`aggregateCourseRevenue`) | **Hiányos.** A tartalékból nem gyártunk kurzus-sort, mert az kitalált adat lenne: a `totalHufSnapshot` nem tudja, melyik kurzusra jutott az összeg. Az érintett tétel 0 Ft-os sorként (`freeItemCount`) látszik. | **Igen, ezt zárja be.** |

Vagyis: a riport nem veszít pénzt, de a „melyik kurzus mennyit hozott” tábla
kevesebbet mutat, mint a havi összesen. A különbség pontosan a backfilleletlen
rendelések összege.

## 1a. Mely rendeléseket nézi meg

**Kizárólag a `paid` állapotúakat.** A backfill célja a kurzus-bontás
kiegészítése, az a tábla pedig csak fizetett rendelést számol — a többi státusz
megírása egyetlen megjelenített számot sem javítana.

A szűkítés nem kényelmi kérdés, hanem kockázatcsökkentés: a Payload
tömb-írása az adatbázisban **törlés + újraszúrás**, tehát minden megírt
rendelés egy-egy alkalom arra, hogy valami félresikerüljön az éles
tételsorokon. Amelyik rendelést nem kell megírni, azt nem írjuk meg.

Ez nem hagy hátra jövőbeli adósságot: a `priceHufSnapshot`-ot a
létrehozáskori hook tölti, tehát új rendelés már nem lesz hiányos, és egy régi,
nem fizetett rendelés sem fog utólag `paid`-dé válni.

## 2. Honnan veszi az árat — és mit NEM használ soha

**Egyetlen forrás: a rendelés saját `totalHufSnapshot` mezője.**

**SOHA nem a termék mai ára** (`products.priceInHUF`). Az ár azóta változhatott,
és a mai árral visszaírni a történelmet meghamisítaná a bevételt. Ezt a szabályt
a `src/__tests__/backfill-price-snapshot.test.ts` forrás-őre méri: a script
végrehajtható kódjában nem szerepelhet sem a `priceInHUF` mező, sem a
`products` collection olvasása.

A kiosztás szabálya (a `kiosztHianyzoArakat` tiszta függvényben, indoklással a
fejkommentjében):

1. **Egytételes rendelés, hiányzó árral** → ár = `totalHufSnapshot / quantity`
   (a hiányzó mennyiség 1 db, ahogy a `totalHufSnapshot` is képződött).
   Ha ez nem ad egész forintot: **kihagyás**, nincs kerekítés.
2. **Több tétel, PONTOSAN egynél hiányzik az ár** →
   maradék = `totalHufSnapshot` − Σ(a többi tétel ára × mennyisége).
   Ha a maradék pozitív ÉS osztható a hiányzó tétel mennyiségével, az lesz az
   ár; különben **kihagyás**.
3. **Több tételnél is hiányzik az ár** → **kihagyás**. A végösszeg szétosztása
   tételek között kitalált adat lenne.
4. **Hiányzó, nem szám vagy nem pozitív `totalHufSnapshot`** → **kihagyás**.
   Nincs miből számolni.

**Meglévő értéket a script SOSEM ír felül** — a 0 Ft is érvényes ár (ingyenes
kurzus), azt sem bántja.

**Mennyiség (`quantity`):** a hiányzó mennyiség külön, jelentett műveletként kap
1-es értéket. A gyakorlatban ez védőháló: az `orders_items.quantity` oszlop
`numeric DEFAULT 1 NOT NULL`, tehát tényleg hiányzó érték nem fordulhat elő.
Jelen lévő, de **nem pozitív egész** mennyiségnél a script kihagy (a mező
`min: 1` validációja miatt az ilyen sort tartalmazó tömb visszaírása amúgy is
elbukna, a „javítása” pedig már kitalált adat lenne).

## 3. Mikor kell futtatni

- **Egyszer**, a régi rendelés-állomány rendezésére.
- Újra akkor, ha a statisztika kurzus-bontásában feltűnően sok a 0 Ft-os
  tételsor (`freeItemCount`), vagy ha a kurzus-tábla bevétel-összege jelentősen
  kevesebb, mint a havi összesen.
- **NEM kell** rutinszerűen: az új rendeléseknél a hook mindent kitölt.

## 4. ELŐTTE: mentés (kötelező)

A script ÉLES rendelés-adatot ír. Futtatás előtt **mindig** készíts mentést:

```bash
npm run backup:db
```

A parancs logikai dumpot készít, és **kötelező integritás-ellenőrzést** futtat
rajta (`pg_restore --list`); hiba esetén törli a fájlt, hogy ne maradjon hamis
biztonságot adó mentés. Részletek és a visszaállítás menete:
[`docs/adatbazis-mentes.md`](./adatbazis-mentes.md).

Ellenőrizd, hogy a mentés tényleg elkészült (a parancs 0-s kilépési kóddal ér
véget, és a fájl ott van a célkönyvtárban), és csak utána menj tovább.

## 5. Futtatás

### 5.1 Próbafutás (alapértelmezés — semmi nem íródik)

```bash
npm run backfill:ar-snapshot
```

Kiírja, mit **írna** és mit **hagyna ki**, de egyetlen adatbázis-írás sem
történik.

### 5.2 Éles futás

```bash
OWNER_BACKFILL_CONFIRM=igen npm run backfill:ar-snapshot
```

A kapu pontosan az `igen` értéket fogadja el (a mintája a tartalom-javító
script `OWNER_CONTENT_CONFIRM` kapuja). Siker esetén a napló végén ott a
`OWNER_BACKFILL_OK` sor — erre lehet rákeresni.

### 5.3 Kapcsolók

| Kapcsoló | Jelentés |
| --- | --- |
| `--max=<szám>` | A feldolgozott rendelések felső korlátja (alapértelmezés: 20 000). Akkor kell, ha a jelentés csonkolást jelez. |

```bash
npm run backfill:ar-snapshot -- --max=50000
```

A script a `DATABASE_URI`-t / `PAYLOAD_SECRET`-et a Payload configon keresztül
olvassa, tehát abból a könyvtárból futtasd, ahol a `.env` elérhető.

### 5.4 Kilépési kódok

| Kód | Jelentés |
| --- | --- |
| `0` | A futás végigment. A kihagyások **nem hibák** — azokat ember nézi meg. |
| `1` | Írási hiba történt, **vagy** a beolvasás a felső korlátnál csonkolt (tehát nem néztünk meg minden rendelést). |

## 6. Hogyan olvasd a jelentést

A futás végén magyar összesítés áll a naplóban:

```
Ár-snapshot backfill — PRÓBAFUTÁS összesítése
Megnézett rendelés: 412 db (felső korlát: 20000).
ÍRNA: 37 rendelés — 37 tétel-ár és 0 mennyiség.
Nincs teendő: 371 rendelés (már teljes az adata).
Kihagyva: 4 rendelés.
A kihagyott rendelések — ezeket EMBERNEK kell megnéznie:
  • tobb-hianyzo-ar (2 db) — egynél több tételnél hiányzik az ár …
      KH-2026-000042 [státusz: paid] — 2 tételnél hiányzik az ár (#1, #2), a tételek száma: 2
      …
```

Sorról sorra:

- **Megnézett rendelés** — hány rendelést olvasott be, és mi volt a felső korlát.
- **CSONKOLT BEOLVASÁS** (csak ha van) — a korlát miatt nem néztünk meg minden
  rendelést. **Futtasd újra magasabb `--max` értékkel**, különben a munka
  félkész marad.
- **ÍRNA / ÍRT** — hány rendelést érint, ebből hány tétel-ár és hány mennyiség.
- **Nincs teendő** — ezeknél már minden tételnek van ára.
- **Kihagyva** — indokonként csoportosítva, rendelésszámmal, státusszal és a
  konkrét számokkal. **Ez a lista a lényeg.**
- **ÍRÁSI HIBA** (csak ha van) — a rendelés nem íródott be; a hibaüzenettel
  együtt szerepel.

## 7. Mit kell kézzel megnézni a kihagyottakból

Nyisd meg a rendelést az adminban (Webshop → Rendelések, keresés
rendelésszámra), és vesd össze a tételsorokat a végösszeggel. Indokonként:

| Indok | Mit jelent | Mit csinálj |
| --- | --- | --- |
| `tobb-hianyzo-ar` | Egynél több tételnél hiányzik az ár. | Nézd meg a rendeléshez tartozó **számlát** (`invoiceNumber` / `invoicePdfUrl`) vagy a Barion-tranzakciót: azokon tételenkénti bontás van. Az árakat abból lehet visszavezetni. |
| `hianyzo-vegosszeg` | A rendelésnek nincs (pozitív) `totalHufSnapshot` értéke. | Ellenőrizd, valódi rendelés-e egyáltalán (lehet félbehagyott `created` / `payment_failed` sor). Fizetett rendelésnél a számla a forrás. |
| `nincs-tetel` | Van végösszeg, de nulla tételsor. | Ebből kurzus-bontás sosem lesz. Nézd meg, mit vett a vevő (számla, `users.purchases`), és döntsd el, kell-e egyáltalán javítani. |
| `nem-egesz-egysegar` | A maradék nem osztható egész forintra a mennyiséggel. | Ellentmondó adat (kézi szerkesztés, import). A számla összegével vesd össze; a script szándékosan nem kerekít. |
| `nem-pozitiv-maradek` | A többi tétel ára már kiadja (vagy meghaladja) a végösszeget. | A meglévő tételárak valamelyike rossz, vagy a hiányzó tétel valóban 0 Ft volt. Emberi döntés kell. |
| `ervenytelen-mennyiseg` | Valamelyik tétel mennyisége nem pozitív egész. | Javítsd a mennyiséget az adminban a számla alapján, majd futtasd újra a scriptet. |
| `ervenytelen-ar` | Valamelyik meglévő tételár negatív. | Adatsérülés. Javítsd a számla alapján, majd futtasd újra. |

A javítás után a script **újrafuttatható**: csak hiányzó értéket tölt, tehát a
már rendezett rendeléseket nem bántja.

## 8. Mit NEM csinál a script

- **Nem** olvassa és nem használja a termékek mai árát.
- **Nem** ír `totalHufSnapshot`, `amount`, `orderNumber` vagy `status` mezőt —
  a rendelés pénzügyi összege és állapota érintetlen marad
  (`orderIntegrityBeforeChange` update-kor nem számol újra).
- **Nem** hoz létre és nem töröl rendelést vagy tételsort. A teljes `items`
  tömböt megtartott sor-azonosítókkal írja vissza, mert a Postgres-adapter
  update-kor törli és újra beszúrja a tömb sorait — részleges írás tételsorokat
  veszítene el.
- **Nem** ír audit-naplót: az audit-hook rendelés-update-nél csak a
  refund-mezők változására rögzít bejegyzést, azokhoz a script nem nyúl.
- **Nem** kér le tulajdonos-only mezőt (`refunds`, `customerSnapshot`,
  `ipAddress`, `invoiceNumber`, `barionPaymentId`).

Egyetlen mellékhatás, amit tudni kell: az érintett rendelések `updatedAt`
mezője frissül. Ez a Local API-n át nem kerülhető meg; adatot nem érint, de a
rendelés-lista rendezésében látszik.

## 9. Utána

1. Nézd meg a statisztika kurzus-bontását (admin → Statisztika): a 0 Ft-os
   tételsorok számának csökkennie kell, és a kurzus-tábla összegének közelítenie
   kell a havi összesenhez.
2. A maradék eltérés pontosan a kihagyott rendelések összege — azokat a
   7. szakasz szerint kell kézzel rendezni.
3. Ha a jelentés csonkolást jelzett, futtasd újra magasabb `--max` értékkel.
