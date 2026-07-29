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
