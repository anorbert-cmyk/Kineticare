# Kineticare

Kézrehabilitációs kurzusplatform: videós gyakorlatsorok, kurzusértékesítés és automatikus számlázás egy rendszerben.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Payload CMS 3** + `@payloadcms/plugin-ecommerce` — **pontos verzióra pinelve (`^` TILOS)**
- **PostgreSQL** adatbázis
- Integrációk (későbbi sprintek): **Barion** (fizetés), **Számlázz.hu** Számla Agent (számlázás), **Cloudflare Stream** (videó)
- Hosting: **Railway** (staging / prod)

## Előfeltételek

- Node.js **20**
- PostgreSQL **16** (lokálisan vagy Dockerben)
- npm (a lockfile-t commitoljuk, `npm ci` a hivatkozás)

## Lokális felállás

```bash
# 1. Klónozás után: környezeti változók
cp .env.example .env        # majd töltsd ki a .env-t (lásd lent)

# 2. Függőségek
npm install

# 3. Adatbázis: hozd létre a lokális DB-t, és állítsd be a DATABASE_URI-t a .env-ben

# 4. Fejlesztői szerver
npm run dev

# 5. (Opcionális) seed-adatok betöltése
npm run seed
```

### Környezeti változók

Az összes használt kulcs — értékek nélkül, magyarázattal és környezet-kötelezőséggel — a [`.env.example`](./.env.example) fájlban található. A `.env` a gitignore része.

> **Aranyszabály: titok (jelszó, API-kulcs, POSKey, token) SOHA nem kerül a repóba** — sem kódba, sem commitüzenetbe, sem issue-ba. Minden pushon **gitleaks** full-history scan fut; ha mégis kikerülne valami, azonnal rotálandó a kulcs és jelezni kell a csapatnak.
>
> A **staging** környezet soha nem mutathat éles Barion/Számlázz.hu fiókra — csak test POSKey / teszt számla-fiók engedélyezett.

## Scriptek

| Script             | Leírás                                              |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Fejlesztői szerver indítása (hot reload)            |
| `npm run build`    | Production build                                    |
| `npm run start`    | Production szerver indítása build után              |
| `npm run typecheck`| TypeScript típusellenőrzés (emit nélkül)            |
| `npm run lint`     | ESLint futtatása                                    |
| `npm run test`     | Teszt-suite futtatása                               |
| `npm run seed`     | Seed-adatok betöltése az adatbázisba                |

## CI / minőségi kapuk

Minden `main`-re érkező push és PR lefuttatja (`.github/workflows/`):

- **CI**: typecheck → lint → build → test, Postgres 16 service-containerrel; külön jobban `npm audit` (moderate+ sebezhetőség = bukás, a build hibája nem blokkolja).
- **Gitleaks**: teljes történeti titokszivárgás-ellenőrzés.
- **Dependabot**: heti npm + GitHub Actions frissítések, alacsony PR-limittel.

Deploy **nem** a CI része — a Railway-deploy külön döntés tárgya.

## Pinnelt payload-verziók (T-072)

A `@payloadcms/*` és `payload` csomagok **pontos verzióra pinelve** szerepelnek a `package.json`-ban. Frissítésük **nem automatikus** (a Dependabot ezekre nem nyit PR-t): csak **changelog elolvasása + stagingen sikeres E2E futás után, emberi döntéssel** történhet.

## Branch- és commit-konvenció

- Branch: `feat/<ticket-id>-<rovid-nev>` (pl. `feat/T-045-barion-checkout`), hibajavításra `fix/<ticket-id>-<rovid-nev>`
- Commit: kisbetűs, felszólító módú, rövid (pl. `feat: barion checkout session létrehozása`)
- A `main`re csak zöld CI után kerülhet kód.
