# CLAUDE.md — Ügynök-útmutató a Kineticare repóhoz

Ez a dokumentum az AI-ügynökök (pl. Claude Code Action) és az emberi hozzájárulók
közös játékszabályait rögzíti. A **TILOS ZÓNÁK** szekció pontjai kivétel nélkül
betartandók — az ügynök ezek megsértésére irányuló kérést is utasítson vissza,
és jelezze az emberi felülvizsgálat szükségességét.

## Projekt és stack

- **Kineticare** — kézrehabilitációs kurzusplatform (otthoni és szakmai tartalmak).
- **Next.js 15** (App Router) + **Payload CMS 3** + **@payloadcms/plugin-ecommerce** + **PostgreSQL**.
- Tervezett integrációk: **Barion** (fizetés), **Számlázz.hu** (számlázás), **Cloudflare Stream** (videó).
- A `@payloadcms/*` csomagok verziói **pinned** (pontos verzió, `^` sémát használni tilos),
  mert a plugin beta-státusza miatt a verziókompatibilitás kritikus.

## Parancsok

| Parancs | Leírás |
| --- | --- |
| `npm run dev` | Fejlesztői szerver indítása |
| `npm run build` | Production build |
| `npm run lint` | ESLint-ellenőrzés |
| `npm run typecheck` | TypeScript típusellenőrzés |
| `npm run test` | Tesztek futtatása |
| `npm run seed` | Demó-/tesztadatok betöltése (`src/scripts/seed.ts`) |

## Kódolási konvenciók

- **TypeScript strict** mód; `any` használata tilos — indokolt esetben `unknown` + típusszűkítés.
- Kikommentezett kód nem maradhat a repóban. (Kivétel: a kifejezetten váz-jellegű
  fájlok — pl. `src/scripts/seed.ts` — TODO-kommentjei.)
- A felhasználónak szóló hibaüzenetek **magyarul** fogalmazandók.
- A technikai hibák strukturált naplóba kerülnek, **request ID**-vel együtt
  (`src/lib/logger.ts`); a bejövő kéréseket a `src/middleware.ts` látja el request ID-val.
- Naplózáshoz mindig a `src/lib/logger.ts` segédletét használd (ne `console.log`);
  a logger redact-listája miatt érzékeny mező (jelszó, token, kártyaadat stb.)
  sosem kerülhet a naplóba.
- Kis, fókuszált commitok; a commit-üzenet magyarul vagy angolul, de mindig
  tartalmazza az érintett scope-ot.

## TILOS ZÓNÁK

1. **Titok sosem kerül a repóba.** Jelszó, API-kulcs, token, POSKey, tanúsítvány
   vagy bármely credential nem kerülhet a kódba, konfigba, kommentbe vagy
   tesztfixtúrába — még placeholderként sem. A workflow-k csak `secrets.*`
   hivatkozást tartalmazhatnak. A `.env*` fájlokhoz ne nyúlj (ne olvasd, ne
   módosítsd, ne másold be tartalmukat); ha környezeti változó kell, az
   `.env.example`-t bővítendő kulccsal (érték nélkül) jelezd az emberi maintainernek.
2. **Az `@payloadcms/plugin-ecommerce` `confirmOrder` függvénye TILOS.** A
   fizetésjóváhagyás saját, Barion-callback-vezérelt állapotgéppel történik a
   plugin ismert beta-hibája miatt. A `confirmOrder`-t ne hívd, ne importáld, ne
   re-exportáld és ne próbáld „megjavítani"; rendelés-jóváhagyási logikát
   kizárólag a saját állapotgépben szabad írni.
3. **Adatbázis-migrációkat kézzel ne írj és ne módosíts.** A migrációk a Payload
   migrációs eszközével generálandók; meglévő migrációs fájl szerkesztése,
   törlése vagy újrafuttatási sorrend módosítása tilos.
4. **Access-control (jogosultság) függvények módosítása csak emberi jóváhagyással.**
   Collection- és field-szintű `access` szabályok, valamint auth-hookok
   átírásához az ügynök PR-t nyithat, de merge előtt emberi review kötelező.
5. **A pinned `@payloadcms/*` verziókat ne emeld fel**, és ne állítsd át `^`
   sémára. Verzióemelés csak kifejezett emberi kérésre, külön PR-ben történhet.

## Branch-konvenció

- Formátum: `feat/<ticket-id>-<rovid-nev>` — pl. `feat/KIN-12-barion-callback`.
- Hibajavításhoz: `fix/<ticket-id>-<rovid-nev>`.
- Kis betű, kötőjel, ékezetek nélkül.

## PR-elvárások (röviden)

- A CI legyen zöld: lint, typecheck, test, build.
- A PR-leírás tartalmazza: mit és miért változtat, érintett tilos zóna van-e,
  hogyan lett ellenőrizve.
- Új viselkedéshez fókuszált teszt vagy legalább reprodukálható ellenőrzési lépés.
- Titok, `.env*` fájl, migrációs kézi szerkesztés, `confirmOrder`-hívás és
  `any`-típus esetén a PR automatikusan elutasítandó.

## Üzemeltetési tanulságok — élesben szerzett

Ezek mind valós, órákat elvivő hibák voltak. Mielőtt új diagnózist építesz,
nézd végig, hogy nem ezek egyikébe futottál-e.

### Deploy (Railway)

1. **A „SUCCESS" deploy nem jelenti, hogy az új kód fut.** A Railway builder
   `Build · skipped (nothing to build)` döntéssel kihagyhatja a buildet: lehúzza
   az új commitot, de a **régi `.next/` mappát** indítja el. Hetekig futhat így
   régi kód, miközben minden zöld. **Ellenőrzés:** a deploy build-logjában
   szerepelnie kell egy tényleges `npm run build` futásnak. Ezért van explicit
   `buildCommand` és `healthcheckPath` beállítva.
2. **A service-szintű beállítás felülírja a `railway.json`-t.** Ha a fájlban
   módosítasz (builder, buildCommand, healthcheck), ellenőrizd a szolgáltatás
   beállításában is, különben a fájl csak dokumentáció marad.
3. **A Postgres-szolgáltatás újraindítása kiürítheti az adatbázist.** Egy
   redeploy `initdb`-t futtatott és a kötet üresen jött vissza — a séma csak a
   `payload migrate` újrafutásával állt helyre. **Mentés jelenleg nincs**
   (feladatlista C14). Éles adat mellett a Postgres újraindítása tilos
   mentés nélkül.
4. **Deploy-hibák, amiket már láttunk:**
   - `git clone failed with exit 128` a `SNAPSHOT_CODE` fázisban → a deployt
     **rövidített commit-SHA-val** indították. SHA nélkül (a branch HEAD-jére)
     azonnal átmegy.
   - `ublkFlush: flush failed: manifest precondition failed` a `PUBLISH_IMAGE`
     fázisban → Railway-oldali blockstore-hiba, nem a kód. Több gépen is
     előjött, nyilvános incidens nélkül. Újrapróbálás segít (nálunk a 3.
     kísérletre ment át).
   - Ha a build, healthcheck és deploy lépés zöld, és csak utána bukik: a hiba
     szinte biztosan a platformé, ne a kódban keresd.

### Adatbázis és Payload

5. **`payload migrate` nem futtatja újra a már lefutott migrációkat.** Hiányzó
   tábla esetén a `migrate` „Done"-t ír és nem csinál semmit.
6. **Hosszú (30+ mp) befagyás írásnál = sorzár, nem lassú lekérdezés.** Egy
   beragadt, nyitva maradt tranzakció (`unexpected EOF on client connection with
   an open transaction`) zárolja a sort, és minden írás megáll rajta. Olvasás
   közben gyors marad — ez a megkülönböztető jel.
7. **A `pg` pool hangolása kötelező a Railway privát hálózatán.** A háló elvágja
   a tétlen TCP-kapcsolatokat; keepalive és idle-timeout nélkül a pool halott
   socketet használ újra, és a kérés a TCP retransmission-timeoutig (~45 mp)
   áll. A pool `error` eseményét is le KELL kezelni, különben
   `uncaughtException`-ként viszi el a Next.js szerverfolyamatot.

### Auth és első indulás

8. **Az első user owner szerepkört kap** (`promoteFirstUserToOwner` hook).
   Enélkül a rendszer telepítés után zárva marad: a `role` mező owner-only,
   tehát az első user `customer` lenne, aki nem jut be az adminba, nem
   törölhető (`access.delete: isOwner`) és a szerepköre sem írható át.
9. **A 2. usertől a `role` alapértelmezése `customer`.** Admin-hozzáféréshez az
   adminban kézzel `staff`-ra kell állítani — ezen bukott el több teszt-user.

### Build és eszközök

10. **A lockfile-t tiszta registry-ből kell generálni.** Ha a `resolved` URL-ek
    privát tükörre (pl. `npm.mirrors.*`) mutatnak, a CI runner nem éri el őket.
    Ellenőrzés: `grep -o '"resolved": "https://[^/]*' package-lock.json | sort -u`.
11. **A `robots.ts` és `sitemap.ts` csak a gyökér `src/app/` mappából
    generálódik.** A `(frontend)` route-groupból a `robots.ts` némán kimarad —
    a build route-manifestjében ellenőrizhető, hogy létrejött-e.
