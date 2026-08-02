# E2E-futtatási jegyzőkönyv — staging

> Futtatás előtt: a `docs/deploy-railway.md` 5. pontjának ellenőrzőlistája zöld,
> a seed lefutott, a Barion sandbox beállítva (`docs/barion-sandbox-setup.md`),
> és van külön **vevő** sandbox-fiók (a shop tulajdonosa nem fizethet a saját
> boltjában).
>
> Minden tesztnél rögzítsd: dátum, deploy-commit, tesztelő, eredmény,
> bizonyíték (screenshot / admin-URL / logrészlet).

---

## E2E-01 — Sikeres vásárlás (happy path)

1. Regisztrálj új ügyfelet a staging oldalon (valódi, általad olvasott e-mail).
2. Nyisd meg a demó-kurzust → **Megveszem** → pénztár.
3. Töltsd ki a számlázási adatokat; **mindkét** elállási-jog checkboxot pipáld
   (szövegük: „Kifejezetten kérem, hogy a digitális tartalomhoz a hozzáférés
   azonnal megkezdődjön.” + „Tudomásul veszem, hogy a teljesítés megkezdésével
   elveszítem a 14 napos elállási jogomat.”).
4. **Megrendelés és fizetés** → át kell irányítson a test.barion.com-ra.
5. Fizess a `4444 8888 8888 5559` kártyával (bármilyen jövőbeli lejárat, bármilyen CVC).
6. Visszairányítás a `/fizetes/koszonom` oldalra → max. néhány mp polling után
   **„Sikeres fizetés”** + rendelésszám + „Kurzusaim” gomb.

**Várható állapot (admin-ban ellenőrizendő):**
- Orders: `paid`, `consentWithdrawalWaiver = true` + időbélyeg, Barion PaymentId kitöltve
- Az ügyfél `purchases` mezője tartalmazza a terméket
- `/kurzusaim` oldalon a kurzus elérhető
- webhook-events: a callback dedup-rekordja létezik (provider=barion)

## E2E-03 — Paywall: illetéktelen hozzáférés 403

> Feltétel: a kurzushoz tartozik Stream-videó (`CF_STREAM_*` változók beállítva,
> demó-epizód feltöltve). Ha még nincs videó, ez a teszt SKIP — jelöld így is.

1. Lépj ki / használj inkognitóablakot.
2. Kérd le bejelentkezett, NEM vásárló felhasználóként a videó-token endpointot
   (a Kurzusaim oldalról másolt URL) → **403**.
3. Nem-vásárló accounttal a lejátszóoldal nem jeleníti meg az epizódot.

**Várható:** 403 / hozzáférés-megtagadó UI, token sosem szervernélküli kliensből.

## E2E-05 — Refund (visszatérítés)

1. E2E-01-gyel készíts egy `paid` rendelést.
2. Admin → Orders → a rendelés → Refund (teljes összeg).
3. Barion sandbox felületen is ellenőrizd: a tranzakció visszatérítve.

**Várható állapot:**
- Orders: `refunded`
- Az ügyfél `purchases` listájából a termék kikerül → `/kurzusaim` már nem mutatja,
  a paywall ismét zár (403)

## E2E-10 — Idempotencia (dupla callback)

1. E2E-01 happy path után a Barion sandboxból küldd újra ugyanazt a callbacket
   (vagy játszd le újra a fizetés-visszaigazolást ugyanazzal a PaymentId-vel).

**Várható állapot:**
- A második callbackre `{duplicate: true}` jellegű 200 válasz, hiba nélkül
- Az ügyfél `purchases` listájában **továbbra is 1 db** termék
- Orders státusz nem változik, nem jön létre új esemény

## E2E-12 — Késleltetett callback (polling-út)

1. Fizess tesztkártyával, de a thank-you oldalon figyeld a pollingot: ha a
   callback késik, 2 perc után **„A fizetésed feldolgozása folyamatban…”**
   állapot + „e-mailben értesítünk” szöveg.
2. Amikor a callback megérkezik (retry-ladder: 2/6/18/54/102 mp), az admin-ban
   `paid` lesz; az oldal frissítésével a siker-állapot is megjelenik.

**Várható:** sosem `payment_failed` tévesen; a rendszer a v4 GetPaymentState
alapján dönt, nem a callback payload alapján.

---

## Sikertelenség-kezelő kártyatesztek (kiegészítő)

| Kártya | Várható UI | Orders státusz |
|---|---|---|
| `4444 8888 8888 4446` | fizetési hiba, újrapróbálható | `payment_failed` |
| `4444 8888 8888 9999` | fedezethiány | `payment_failed` |
| `4444 8888 8888 1111` | elutasítva | `payment_failed` |

## Lezárás

Ha az 5 fő teszt zöld: a staging fizetési lánc **elfogadott** → jelöld a
végrehajtási tervben a kaput lezártnak, és a jegyzőkönyvet (screenshotokkal)
archiváld a `docs/` alá vagy a projekt-tárolóba.
