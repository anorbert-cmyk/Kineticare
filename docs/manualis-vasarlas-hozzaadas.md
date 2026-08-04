# Manuális vásárlás-hozzáadás (kurzus-hozzáférés adása)

> **Mire való:** egy vevőnek kézzel, a normál checkout-folyamaton kívül adunk
> hozzáférést egy termékhez (kurzushoz) — a Payload LOCAL API-n keresztül,
> közvetlen adatbázis-írás nélkül.
>
> **Eszköz:** `src/scripts/grant-purchase.ts` (tsx-szel futtatható CLI-script).

---

## 1. Mikor kell használni

- **Elhibázott fizetés utáni jóváírás** — a vevő fizetett, de a Barion-folyamat
  valamiért nem írta be a jogosultságot (és a rendelés-oldali javítás nem
  járható út).
- **Ajándék kurzus** — promóciós / jóvátételi hozzáférés rendelés nélkül.
- **Migrációs esetek (T-061)** — a régi rendszerből áthozott jogosultságok
  pótlólagos rögzítése.

**Mikor NE használd:**

- Normál vásárláshoz — arra a checkout + Barion-jóváhagyás a helyes út.
- Ha a vevő még nem regisztrált — a script **nem hoz létre felhasználót**;
  előbb regisztráltasd a vevőt a felületen.
- Rendelés (orders rekord) létrehozására — a script kizárólag a
  `users.purchases` mezőt egészíti ki; számlázási/pénzügyi nyomot nem hoz létre.

## 2. Futtatás

```bash
npx tsx src/scripts/grant-purchase.ts --email=<vevő-email> --product=<sku-vagy-id> [--reason=<indoklás>]
```

| Argumentum  | Kötelező | Jelentés                                                                 |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `--email`   | igen     | A vevő regisztrált e-mail-címe (users kollekció).                        |
| `--product` | igen     | A termék **sku**-ja VAGY numerikus adatbázis-**id**-je. (A products kollekcióban nincs külön slug mező — az egyedi üzleti kulcs a sku.) |
| `--reason`  | nem      | Szabad szöveges indoklás — bekerül a strukturált (JSON) naplóba.         |

A script a Payload configon keresztül olvassa a `DATABASE_URI`-t /
`PAYLOAD_SECRET`-et a `.env`-ből — külön környezeti változót nem kell
megadni, de a futtatás abból a könyvtárból történjen, ahol a `.env` elérhető.

### Staging vs éles

- **Mindig előbb stagingen** futtasd le (a staging `.env`-jével), és ellenőrizd
  az eredményt a vevő fiókjában.
- **Élesben** a futtatás közvetlenül az éles adatbázist módosítja — csak
  jóváhagyott esetben, a `--reason` megadásával (audit-nyom a naplóban).

## 3. Idempotencia-magatartás

A script ugyanazt a **missing-only** beírást végzi, mint a fizetésjóváhagyás
(`src/lib/order-status/apply-barion-state.ts` → `grantPurchases`):

- Ha a vevő **már rendelkezik** a termékkel: „Már megvan…" üzenet,
  **0-s kilépési kód** (NEM hiba), az adatbázis változatlan.
- Ha még nincs meg: a meglévő `purchases`-lista **megőrzésével** fűzi hozzá az
  új terméket (sosem írja felül a korábbi jogosultságokat).
- Többszöri, akár párhuzamos újrafuttatás sem hoz létre dupla jogosultságot.

## 4. Példák

Hozzáférés adása sku-val, indoklással:

```bash
npx tsx src/scripts/grant-purchase.ts \
  --email=vevo@example.hu \
  --product=DEMO-KEZREHAB-001 \
  --reason="elhibázott fizetés jóváírása, Barion tranzakció: 123456"
```

Hozzáférés adása numerikus termék-id-vel:

```bash
npx tsx src/scripts/grant-purchase.ts --email=vevo@example.hu --product=42
```

Sikeres kimenet:

```text
Kész: vevo@example.hu hozzáférést kapott a(z) "DEMO-KEZREHAB-001" termékhez (felhasználó #7, termék #42).
```

Idempotens újrafuttatás kimenete:

```text
Már megvan: vevo@example.hu már rendelkezik a(z) "DEMO-KEZREHAB-001" termékkel — nincs teendő.
```

A strukturált napló (JSON-sorok a stdouton) minden esetben tartalmazza az
`email`, `userId`, `productId`, `sku` és (ha megadtad) a `reason` mezőket.

## 5. Hibakódok

| Kilépési kód | Jelentés                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `0`          | Siker: a hozzáférés beírásra került **vagy** már megvolt (idempotens no-op).                      |
| `1`          | Hiba: hiányzó/hibás argumentum (használati útmutatót ír ki), ismeretlen e-mail, ismeretlen sku/id, vagy adatbázis-hiba. A hibaüzenet magyarul, a stderr-re kerül. |

Tipikus hibák:

- `a --email és a --product argumentum kötelező` → hiányzó argumentum.
- `Nincs ilyen felhasználó: …` → az e-mail nem regisztrált; a script nem hoz
  létre felhasználót.
- `Nincs ilyen termék (sku: …)` / `(id: …)` → elgépelt sku vagy rossz id;
  ellenőrizd az admin felületen.
