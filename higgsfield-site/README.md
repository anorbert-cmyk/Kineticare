# higgsfield-site — a Higgsfield-en futó KinetiCare landing tükre

Ez a mappa a Higgsfield **website-projekt** teljes forrásának másolata. Nem a
Kineticare Next.js/Payload alkalmazás része: külön stacken, külön hostingon fut,
és **nem a Railway-deploy része**. Azért van itt, hogy a landing forrása és a
hozzá tartozó nyers designanyag verziózva, a repóból is elérhető legyen.

## Honnan jött

| | |
| --- | --- |
| Higgsfield website slug | `kineticare` |
| Website ID | `1c27d55a-6e1d-45fb-89fd-d20802f7fb1e` |
| Élő URL | https://kineticare.higgsfield.app |
| Upstream repo | `https://apps-repos.higgsfield.ai/hfu-user3HXsS3zuk6lYIpoEEwSg6ZieYZ9/kineticare-1c27d55a-6e1d-45fb-89fd-d20802f7fb1e.git` (branch `main`) |
| Szinkronizált commit | `c45639d7c4a524a347eed50500014717c6a56c0f` — „Real kineticare.hu content, brand fonts (Tenor Sans + Nunito Sans), three-act hand film v3", 2026-08-07 17:21 UTC |

Az upstream git-előzmény (12 commit) az eredeti távoli repóban maradt; ide csak a
munkakönyvtár tartalma került át, `.git` nélkül.

## Adatbázis: nincs

A projekthez **nem tartozik adatbázis** — nem szándékos hiány, hanem a site
felépítése. Három egybevágó bizonyíték:

- `app/app.manifest.json` → `"db": false` (ahogy `r2`, `kv`, `durableObject` is ki van kapcsolva).
  A platform csak akkor provisionál D1-et, ha ez `true`.
- `app/migrations/0001_init.sql` érintetlen sablon: csak kommentek, egyetlen
  `CREATE TABLE` sincs benne.
- `app/wrangler.jsonc`-ben a `d1_databases` blokk ki van kommentezve, és a
  forrásban sehol nincs `env.DB` hivatkozás.

A Higgsfield DB-olvasó API ezért ad `409 Conflict`-ot erre a website-ra: nincs
mit olvasni. A landing statikus tartalomból és SSR-ből áll — a szövegek a
`app/src/landing-content.ts`-ben, a jelenetek a `app/src/scroll-scrub-scenes.ts`-ben
vannak kódban. Környezeti titok sincs beállítva a projekthez (üres a secret-lista).

Ha később mégis kell adatbázis: `app.manifest.json`-ban `"db": true`, a séma
additív migrációként a `app/migrations/000N_*.sql`-be — a preview és a prod
**ugyanazt** az egy adatbázist használja.

## Mi van a mappában

| Útvonal | Tartalom |
| --- | --- |
| `app/` | Maga az alkalmazás — TanStack Start SSR Cloudflare Workers-en, Vite 8, React 19, Tailwind 4, bun workspace |
| `app/src/landing-content.ts` | A landing teljes magyar szövege |
| `app/src/scroll-scrub-scenes.ts` | A scroll-vezérelt film jelenetdefiníciói |
| `app/public/assets/` | Élesben kiszolgált médiák: `world/scene-01*.mp4` (desktop + mobil scroll-film és posterek), `brand/` (SOS-art, kézállapotok, szolgáltatás-fotó) |
| `app/packages/` | Higgsfield belső workspace-csomagok: `quanta` (design system), `fnf`, `fnf-react`, `app-landing` |
| `app/migrations/` | D1-migrációk helye — jelenleg üres sablon |
| `app/tests/` | 3 teszt: landing-szerződés, security-headerek, history-performance |
| `tools/scroll-scrub-video.sh` | A scroll-film enkódoló szkriptje |
| `.scratch/` | Nyers munkaanyag: `film.mp4` (35 MB vágatlan kézfilm), `storyboard.png`, `services-board.png`, `sos-art.png` |
| `.github/workflows/ci.yml` | Az **upstream** CI-je. Itt inaktív: a GitHub csak a repógyökér `.github/workflows/`-ból futtat workflow-t, és a benne hivatkozott `arc-runners-frontend` runner sem létezik ebben a repóban. Referenciaként maradt bent. |

## Fejlesztés és deploy

A deploy **nem innen** történik. Az élesítés útja változatlanul a Higgsfield
oldalán van:

1. `website_repo_access` a Higgsfield MCP-n → repo URL + scoped token
   (a token sosem kerül a repóba, mindig a toolból kell kérni)
2. klónozás, szerkesztés, `git push origin main` az upstreamre
3. `deploy_website` — a build a felpusholt `main`-ről fut

Lokális futtatás a `app/` mappából: `bun install`, majd `bun run dev`.
Ellenőrzés: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

Ha ezt a tükröt frissíted, írd át fent a **szinkronizált commit** sorát, hogy
látszódjon, melyik upstream állapotot tartalmazza.
