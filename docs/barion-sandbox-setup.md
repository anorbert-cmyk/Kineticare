# Barion sandbox (teszt) beállítása — lépésről lépésre

> **Mit kapunk a végén:** működő teszt-shop a `test.barion.com` rendszerben,
> POSKey-t és Payee e-mailt (ezek kerülnek a Railway staging változóiba),
> plusz tesztkártyákat az E2E-futtatásokhoz.
>
> **Időigény:** kb. 10–15 perc. A regisztráció e-mail-megerősítést igényel,
> ezért ezt a lépést ember végzi (ügynök nem tudja helyetted).

---

## 1. Sandbox-fiók regisztráció

1. Nyisd meg: <https://test.barion.com>
2. **Regisztráció** → add meg az e-mail-címedet (ez lesz egyben a
   **Payee e-mail** — jegyezd fel!), erős jelszó.
3. Erősítsd meg az e-mail-címet a kapott levéllel.
4. Belépés után a teszt-rendszerben vagy — a fejlécen látszik, hogy
   **Sandbox / Teszt** mód.

> **Megjegyzés:** a teszt-fiókhoz nem kell valódi cégadat. Később ugyanezzel
> a Barion-fiókkal hozható létre az éles shop is (külön regisztráció az éles
> oldalon), ezért érdemes olyan e-mailt használni, ami hosszú távon megmarad.

## 2. Shop létrehozása

1. Bal menü: **Boljaim / Manage my shops** → **Új bolt / Create new shop**.
2. Tölts ki **minden** kötelező mezőt, különben nem engedi jóváhagyásra:
   - Bolt neve: `Kineticare (staging)`
   - Bolt URL: ideiglenesen bármi (pl. `https://staging.kineticare.example`),
     később frissíthető a valódi Railway-domainre
   - Kategória / leírás: egészség, online kurzus
   - Valuta: **HUF**
   - Nyelv: **magyar**
3. Mentsd el, majd **küldd be jóváhagyásra**.
   A teszt környezetben a jóváhagyás **automatikus és azonnali** —
   nincs emberi review (ez az éles rendszertől különbözik).

## 3. POSKey lekérése

1. **Boljaim** → a shop sorában **Actions → Details**.
2. **Secret key / POSKey** mező → másold ki.
3. Ez kerül a Railway staging `BARION_POSKEY_TEST` változóba.

> ⚠️ Ha a felületen **Regenerate**-re kattintasz, a régi kulcs **azonnal
> érvénytelenül** — csak akkor generálj újat, ha frissíted is mindenhol.

## 4. Vevő tesztfiók (kötelező az E2E-hoz!)

A Barionban **a shop tulajdonosa nem fizethet a saját boltjában** — a
Payment/Start hibát ad. Ezért:

1. Regisztrálj egy **második** sandbox-fiókot **másik e-mail-címmel**
   (ugyanúgy a test.barion.com-on).
2. Ezzel a fiókkal fogsz fizetni a teszt-checkoutban (vendég-fizetés esetén
   a tesztkártya elég, de bejelentkezett Barion-fizetés teszteléséhez kell).

## 5. Tesztkártyák (E2E-forgatókönyvekhez)

| Forgatókönyv | Kártyaszám | Várható Barion-státusz |
|---|---|---|
| Sikeres fizetés | `4444 8888 8888 5559` | Succeeded |
| Kártyaprobléma (elutasítás) | `4444 8888 8888 4446` | sikertelen |
| Fedezethiány | `4444 8888 8888 9999` | sikertelen |
| Elveszett/ellopott kártya | `4444 8888 8888 1111` | sikertelen |

- **Lejárat:** bármilyen jövőbeli dátum.
- **CVC:** bármilyen 3 jegyű szám.
- **Kártyabirtokos neve:** bármi.

> **Forrás-megjegyzés:** a docs.barion.com teljes tesztkártya-táblázata
> jelenleg Cloudflare-botvédelem mögött van, gépi kiolvasásra nem elérhető.
> A fenti kártyák több, egymástól független keresési találatból megerősítettek.
> Ha a fizetés mégis váratlanul elutasul, a Barion sandbox felületén
> (Docs / Sandbox szekció) ellenőrizd az aktuális táblázatot.

## 6. Hova kerülnek az értékek (Railway staging)

| Railway változó | Érték |
|---|---|
| `BARION_ENVIRONMENT` | `test` |
| `BARION_API_URL` | `https://api.test.barion.com` |
| `BARION_POSKEY_TEST` | a 3. pontban lekért POSKey |
| `BARION_PAYEE_EMAIL` | az 1. pontban regisztrált sandbox e-mail |
| `BARION_POSKEY_PROD` | **SOHA ne legyen beállítva stagingen!** |

A callback-URL-t (`https://<staging-domain>/api/barion/callback`) a kód küldi
a Payment/Start hívásban — a Barion felületen **nem kell** külön beállítani.

## 7. Ellenőrzés

A beállítás akkor jó, ha a staging checkout:
1. átirányít a `test.barion.com` fizetőfelületére (nem hibaoldalra),
2. a `4444 8888 8888 5559` kártyával a fizetés sikeres,
3. a rendszerünk a callback után `paid` státuszba teszi a rendelést
   (ld. `docs/e2e-staging-runbook.md` → E2E-01).
