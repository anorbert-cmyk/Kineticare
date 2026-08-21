# Jegyzőkönyv — biztonsági és kódvizsgálat (2026-08-21)

> **Kinek szól:** tulajdonos, reviewer, a következő javító ügynök.
> **Önálló dokumentum:** a session mulandó állapotára nem támaszkodik.
> **A kódot ez a kör nem módosította.** A találatok javítása külön munka.

## 0. Egy percben

A 2026-08-20-i main-re került csomagot (admin Statisztika, Bunny Videótár,
Cloud Agent env, dependabot) 2026-08-21-én teljes ügynök-csapattal
vizsgáltuk: `/review-security` + `/code-review`.

**Biztonság:** nincs közepes, magas vagy kritikus sérülékenység. A staff/owner
kapu, a Bunny-kulcs kezelése, az `overrideAccess`, a titokhigiénia és a
lockfile áll.

**Kód:** egy **HIGH** adathelyességi hiba. Ha egy kurzus progress-sorai
túllépik az olvasási plafont, a Kurzus-hatás tábla kész diákokat „Nem kezdte
el”-nek mutat. A javítás már megvan a kurzuslap handlerében; az új query
elhagyta. Tíz **MEDIUM** találat (bevétel-lapozás, 0 Ft-os snapshot, dátum,
Bunny stale lista, N+1, refund-szöveg, Cloud Agent Postgres, rate limit).

**Határozat:** a jegyzőkönyv rögzít, javítás nem indult. Következő munka: a
HIGH engagement-vágás, utána a Bunny library-váltás és a bevétel `sort` /
snapshot / dátum.

---

## 1. Azonosítók

| Mező | Érték |
| --- | --- |
| Dátum | 2026-08-21 |
| Hatókör | `90f6bc8..9aa650e` (2026-08-20 squash-merge-ek a `main`-en) |
| Hatókör vége | `9aa650e` — `chore(deps-dev): bump vite from 8.2.0 to 8.2.1 (#89)` |
| Hatókörön kívül | `#127` (`8a17f93`, tick-őr) és `#128` (`499f1c5`, Payload 3.86 → 3.88). Ezek a vizsgálat alatt kerültek a `main`-re, **nem** voltak a körben. |
| Módszer | `/review-security` (egyetlen security-review ügynök, `branch changes` a `90f6bc8` bázissal) + `/code-review` (Bugbot, statisztika/Bunny kódvizsgálat, env/dependabot, adversariális tesztlyuk) |
| Vezető | Cursor Grok 4.6; a szakterületi munkát Opus-ügynökök végezték |
| Tilos zónák | titok, `confirmOrder`, kézi migráció, access-control átírás, `@payloadcms/*` bump a vizsgált tartományban |
| Eredmény a kódon | semmi: sem javítás, sem workaround, sem teszt-hozzáadás ebben a körben |

### 1.1 Átnézett commitok (időrend)

| SHA | PR | Téma |
| --- | --- | --- |
| `16f1677` | #122 | Cloud Agent környezet (`.cursor/install.sh`, `start.sh`, `environment.json`) |
| `3020e6e` | #123 | T-013: `/admin/statisztika`, Bunny Videótár, `budapest.ts` kiemelés |
| `35fb216` | #125 | Statisztika márka-design, komponens-bontás, Kurzus-hatás |
| `3bd5458` | #124 | Merge utáni CI/Railway-figyelés, modellkészlet |
| `07a6acf` | #126 | Statisztika méretek: px → rem (`--kc-as-px`) |
| `aa4414d` | #121 | dependabot: `tsx` |
| `8bd5376` | #90 | dependabot: `eslint-config-next` |
| `9aa650e` | #89 | dependabot: `vite` |

A `feat/kurzusoldal-velemenyek` ág **szándékosan kimaradt** (tartalmi döntésre
vár, nem mergelendő).

---

## 2. Biztonsági vizsgálat

**Összegzés: Security review found no issues** (nincs medium / high / critical
a vizsgált diffben).

A security-review ügynök a custom admin nézetek authját, a Bunny list/token
utat, az `overrideAccess` hívóhelyeket és a Cloud Agent bootstrap scripteket
járta végig. Nem talált realisztikus jogosultság-emelést, titokszivárgást,
injekciót vagy SSRF-et érdemi hatással.

| Felület | Következtetés |
| --- | --- |
| `/admin/statisztika` | A `StatisticsView` a `canAccessStatistics` → `hasStaffOrOwnerRole` kapu **után** kérdez. Anon/customer: tiltó UI, bevétel/engagement adat nélkül. A Payload 3.86 custom-view modellje szerint a path publikus admin-útvonal, ezért a view-szintű kapu a védelem — ez szándékos, és dokumentálva van. |
| `overrideAccess: true` (`query.ts`, `engagement-query.ts`) | Csak a kapuzott `StatisticsView`-ból. A select-listák kihagyják a `refunds`, `customerSnapshot`, `ipAddress` mezőket; a user-olvasás csak azonosítót kér. Az owner-only mezőket az aggregáció megkerüli anélkül, hogy a riport staffnak kiírná. |
| `/admin/videok`, `GET /api/admin/bunny-videos` | Ugyanaz a RBAC, mint a többi admin route: `payload.auth` + `hasStaffOrOwnerRole` (401/403). A library-id env-kötött, `/^\d{1,12}$/`; a kimenő fetch fix `https://video.bunnycdn.com`. A `search` 200 karakterre vágott. Az API-kulcs szerveroldalon marad; a logger redact-listája fedi az `accesskey` / `libraryapikey` alakokat. |
| Cloud env | Dev-only: credential runtime-generált, `$HOME/.kineticare-dev.env`, `umask 077`, nincs a repóban. A DB-jelszó hex. Nem éles, nem cross-tenant határ. |
| Env / lockfile | Új Bunny library kulcsok opcionálisak, szerveroldaliak, `.env.example` érték nélkül. A `tsx` / `eslint-config-next` / `vite` bump mind `registry.npmjs.org`. Nincs `@payloadcms/*` bump **ebben** a tartományban (a későbbi #128 már kívül esik). |
| XSS | A Statisztika és Bunny táblák React szövegcsomóponttal renderelnek; nincs nyers HTML-nyelő a változott komponensekben. |

**Pozitív kontrollok a diffben**

- RBAC-tesztek: `canAccessStatistics`, `createBunnyVideosHandler`
- Owner-only order mezők explicit kihagyása a statistics selectből
- Logger-redact kiterjesztése Bunny kulcs-nevekre
- Bunny library-id validáció (path-szerű érték, pl. `../evil`, elutasítva)

**Tervezési megjegyzések (nem sérülékenység)**

- A `queryRevenueReport` / `queryCourseEngagement` belül nem ellenőriz szerepkört. Ma csak a `StatisticsView` hívja őket. Jövőbeli kapu nélküli hívó karbantartási kockázat, nem exploitable path ebben a diffben.
- Az admin GET-útvonalak (az új Bunny endpoint is) követik a meglévő `/api/admin/course-progress` mintát: nincs rate limit. Authenticated staff kör, nem új, autentikálatlan erősítő vektor. A kódvizsgálat ezt **MEDIUM**-ként külön rögzíti (lásd F10).

**Tilos zónák:** titok a repóban nincs; `confirmOrder` csak doksi-prózában; migrációs fájl nem készült és nem módosult; `src/access/**` és a stream-token path érintetlen; a vizsgált tartományban a `@payloadcms/*` 3.86.0-on maradt.

---

## 3. Találatok (súlyosság csökkenő sorrendben)

A tábla a security, Bugbot, kódvizsgálat és tesztlyuk-ügynökök **egyeztetett**
listája. Az ismétlődő megállapításokat egy sorba vontuk.

| # | Severity | Location | Finding |
| --- | --- | --- | --- |
| F1 | HIGH | `src/lib/statistics/engagement-query.ts:184` | Progress-cap vágás nélkül: a cap mögötti diákok „Nem kezdte el”-nek látszanak. |
| F2 | MEDIUM | `src/lib/statistics/query.ts:255` | Paid/funnel order-lapozás `sort` nélkül: azonos `createdAt`-nál sor duplikálódhat vagy kieshet. |
| F3 | MEDIUM | `src/lib/statistics/query.ts:118` | Hiányzó `priceHufSnapshot` / `quantity` → 0 Ft, de `orderCount: 1`. |
| F4 | MEDIUM | `src/lib/date/budapest.ts:37` | Naptárilag érvénytelen `invoiceCompletionDate` kiveszi a fizetett rendelést a bevételből. |
| F5 | MEDIUM | `src/lib/stream/bunny-library.ts:308` | GUID nélküli tétel egy tele oldalon leállítja a lapozást, `truncated: false`. |
| F6 | MEDIUM | `src/components/admin/BunnyLibraryPanel.tsx:141` | Library-váltáskor a táblázat a előző tár GUID-jait mutatja újratöltésig. |
| F7 | MEDIUM | `src/lib/statistics/engagement-query.ts:167` | Kurzusonként szekvenciális `find` (N+1). |
| F8 | MEDIUM | `src/lib/statistics/query.ts:270` | A tölcsér akár 20 000 sort olvas hat számért, `payload.count` helyett. |
| F9 | MEDIUM | `src/components/admin/statistics/FunnelSection.tsx:43` | A szöveg szerint a visszatérítés nem számít; részleges refund `paid` marad, bruttón megy. |
| F10 | MEDIUM | `src/app/(frontend)/api/admin/bunny-videos/route.ts:10` | Nincs rate limit; staff hívásonként akár 5 Bunny-oldalt húz. |
| F11 | MEDIUM | `.cursor/install.sh:36` / `.cursor/start.sh:39` | `postgresql` meta-csomag vs. hardcode `pg_ctlcluster 16`; a hiba `\|\| true` miatt elnyelődik. |

### F1 — HIGH: kész diák „Nem kezdte el”

**Hely:** `src/lib/statistics/engagement-query.ts:184-202`, aggregátor:
`src/lib/statistics/engagement.ts:60-77`. UI-kiemelés:
`src/components/admin/statistics/CourseEngagementSection.tsx` (a nem-nulla
`notStarted` `--theme-error-500`).

**Mi történik.** A query a *csonkolt* progress-listát a *teljes*
beiratkozás-listával adja a `buildCourseProgressStats`-nak. Akinek a sorai a
`ENGAGEMENT_PROGRESS_MAX` (10 000) mögött esnek, annak nulla látható
progressze van, ezért az aggregátor „nem kezdte el”-nek számolja.

**Mért reprodukció** (injektált Payload-mock, egy kurzus, 800 diák, mind a 20
leckét megcsinálta = 16 000 sor a 10 000-es cap ellen):

| | Valóság | Riport |
| --- | --- | --- |
| Beiratkozott | 800 | 800 |
| Elkezdte | 800 | 500 |
| Befejezte | 800 | 500 |
| Nem kezdte el | 0 | **300** |
| Átlag % | 100 | 63 |
| `truncated` | — | `true` |

**Miért számít.** A `notStarted` oszlop a follow-up célja. A staff 300 már
kész diákot üldözne. A `truncated` banner alsó becslést ígér; ennél az
oszlopnál a torzítás **fölfelé** megy, az átlagnál **lefelé**. Ez a saját
invariánst is töri: a statisztika és a kurzuslap ugyanazt a számot kellene
mutassa.

**A javítás már a repóban van.** `src/lib/admin/course-progress-handler.ts:348-369`
eldobja a félig beolvasott utolsó usert, majd az enrollments-et
`userId < hianyosTolUserId` szerint szűri. Fejkomment: *„Inkább hiányozzon egy
sor, mint hogy rossz szám kerüljön elé.”* Javasolt út: közös helper, alkalmazás
a `queryCourseEngagement`-ben, a kihagyott diákok számának jelentése a
handler `:369` mintájára.

**Miért ment át a CI-n.** A truncation teszt csak az *enrollment*-capet
gyakorolja, üres progress-listával
(`src/__tests__/statistics-engagement.test.ts:247-261`). Pont ez a konfiguráció
nem tud félreosztályozni. Nincs teszt, ahol a progress vágódik egy teli
beiratkozás-lista ellen.

### F2 — MEDIUM: order-lapozás `sort` nélkül

**Hely:** `src/lib/statistics/query.ts:255-282` — sem a `paid`, sem a funnel
`find` nem ad `sort`-ot.

A Drizzle-adapter alapból `-createdAt`, tiebreaker nélkül. Azonos időbélyegű
rendeléseknél a 200/500-as oldalhatáron sor kétszer jöhet vagy kieshet —
bevétel fölé vagy alá. Ugyanebben a feature-ben a products/enrollments
`sort: 'id'`, a progress `sort: ['user', 'id']`. Javaslat: `sort: 'id'` vagy
`['-createdAt', 'id']` mindkét order-queryre.

### F3 — MEDIUM: hiányos item-snapshot → 0 Ft

**Hely:** `quantityOf` / `finiteOrZero` `query.ts:118-134`; fallback
`src/lib/statistics/revenue.ts` (order-szintű `totalHufSnapshot` csak akkor,
ha `items` **üres**).

Mért esetek:

1. Items megvannak, `priceHufSnapshot` NULL, `orders.totalHufSnapshot = 79500` →
   `totalHuf: 0`, `orderCount: 1`.
2. Ugyanaz az order `items: []`-lel → `totalHuf: 79500`. Kevesebb adat, helyesebb
   szám: a fallback inverz.
3. Van ár, nincs `quantity` → szintén 0 Ft. A checkout
   (`src/lib/checkout/start-checkout.ts`) `(item.quantity ?? 1)`-et számol.

A `price_huf_snapshot` oszlop backfill nélkül került be; az
`orderIntegrityBeforeChange` csak create-kor tölti. A pre-T-017 rendelések
élő kockázat. Javaslat: `quantityOf` igazítása a checkout `1` defaultjához;
ha az item-összeg 0, de a `totalHufSnapshot` pozitív, order-szintű fallback.

### F4 — MEDIUM: naptárilag érvénytelen számla-dátum elnyeli a bevételt

**Hely:** `isIsoDateString` `src/lib/date/budapest.ts:37` — csak alakot néz
(`YYYY-MM-DD`), naptárt nem. `'2026-13-45'` átmegy; `monthKeyFromInvoiceDate`
`'2026-13'`-at ad; az aggregátor nem talál ilyen vödröt, `continue`, a
rendelés bevételből **és** `orderCount`-ból kiesik. Mért: egyetlen ilyen paid
order → `sum of all months = 0, orderCount 0`. A mező szabad szöveg a DB-ben.
Tesztelve csak az alak-hibás `'2026/03/10'` van. Javaslat: naptári
érvényesség, különben `createdAt` fallback.

Ugyanebből a modulból: `budapestMonthKey` doksija `null`-t ígér érvénytelen
dátumra, a `Intl` `RangeError`-t dob. `listMonthKeys(now, months)` közvetlenül
hívja — érvénytelen `now` 500-ozhatja a nézetet. Saját tesztfájl nincs.

### F5 — MEDIUM: Bunny lapozás GUID nélküli tételnél hamis „teljes lista”

**Hely:** `src/lib/stream/bunny-library.ts:308`. A ciklus akkor áll le
`truncated = false`-szal, ha `parsed.videos.length < itemsPerPage`. A
`parseBunnyLibraryVideo` a GUID nélküli sort eldobja. Tele 100-as Bunny-oldal
egy GUID nélküli tétellel → 99 parsed videó → a 2–5. oldal soha nem jön,
csonka-figyelmeztetés nincs. GUID nélküli sor a gyakorlatban feltöltés
alatt / failed (status 0/6) — pont amikor leckét kötnek. Javaslat: a nyers
oldalméreten dönteni, ne a parseolt hosszon.

### F6 — MEDIUM: Videótár-váltás stale GUID-okat mutat

**Hely:** `src/components/admin/BunnyLibraryPanel.tsx:141-146`. A `<select>`
csak `setKind`-ot hív; `videos`, `truncated`, `loaded` marad. A táblázat a
előző library listáját mutatja, amíg a Betöltés gombot meg nem nyomják. A
panel célja a helyes GUID bemásolása a leckébe — félrecímkézés. A
`!response.ok` ág (`:98-101`) `videos: []`-t állít, `truncated`-et nem,
ezért a „A lista csonka” egy hibaüzenet mellett is megmarad. Komponens-teszt
nincs.

### F7 — MEDIUM: engagement N+1

**Hely:** `engagement-query.ts:167-199`. Enrollment + progress `find` a
termék-ciklusban, egymás után awaitelve. Mért hívásszám:

| Kurzusok | Diák/kurzus | `payload.find` |
| --- | --- | --- |
| 12 | 200 | 25 |
| 50 | 500 | 201 |
| 200 | 1000 | **1404** |

A plafon (`ENGAGEMENT_PRODUCT_MAX = 200`) egy szinkron, cache nélküli admin
oldal. A Railway privát hálózaton ez a több másodperces stall alakja.
Ráadásul nincs per-kurzus `try/catch`: egy rossz termék az egész Kurzus-hatás
szekciót elviszi (a revenue ettől még megmarad, a view fogja). Javaslat:
korlátos konkurencia, vagy egy grouped query collectionönként.

### F8 — MEDIUM: tölcsér 20 000 sor hat számért

**Hely:** `query.ts:270-281`. Minden order, 500/oldal, `STATISTICS_FUNNEL_MAX`
plafon = 40 kérés, plusz csonkolási kockázat. Hat `payload.count` státusz
szerint ugyanezt adná kerekítés és truncation nélkül.

### F9 — MEDIUM: refund-szöveg vs. részleges visszatérítés

**Hely:** `FunnelSection.tsx:43` — *„A visszatérített rendelések nem számítanak
bevételnek.”* `src/lib/refund/refund-order.ts` teljes refundnál `status:
'refunded'`, részlegesnél csak a `refunds` tömböt írja, a státusz `paid`
marad. A részleges tehát bruttón megy minden bevétel-összesítőbe. A `refunds`
owner-only, a staff nem tudja összenézni. Javaslat: részleges összeg levonása,
vagy a szöveg pontosítása (csak a teljes stornó esik ki).

### F10 — MEDIUM: `/api/admin/bunny-videos` rate limit nélkül

A route a Payload REST catch-allon kívül él, az IP-limiter nem fedi. A
sibling `/api/stream-token` visel per-user limitet. Authenticated staff
hívásonként `MAX_PAGES = 5` Bunny-kérést indíthat. Nincs
`Cache-Control: no-store` sem. Javaslat: a meglévő
`src/lib/security/rate-limit.ts` + no-store.

### F11 — MEDIUM: Cloud Agent Postgres 16 vs. meta-csomag

`.cursor/install.sh` a verziózatlan `postgresql` csomagot rakja;
`.cursor/start.sh:39` `sudo pg_ctlcluster 16 main start … || true`. Ma
(Ubuntu 24.04, cluster `16/main`) működik. Distro-bumpnál a meta 17/18-ra
válthat, a start 16-ot kér, a `|| true` elnyeli, a readiness 30 mp után
általános „PostgreSQL nem lett elérhető” hibát ad. Javaslat: `postgresql-16`
pin, vagy a verzió `pg_lsclusters`-ből.

**Folyamat-megjegyzés (nem kódhiba), `3020e6e`:** a T-013 feature commit a
`src/lib/szamlazz/xml.ts` dátumfüggvényeit is `budapest.ts`-be emelte. A
viselkedés byte-azonos, re-export megvan. A számla-dátum kritikus felület;
külön commit lett volna a kis, fókuszált commit konvenció szerint.

---

## 4. Alacsonyabb súlyú és információs tételek

Ezek nem blokkolják a merge-utólagos jegyzőkönyvet; a javító körben
érdemes végigvenni őket, miután az F1–F11 megvan.

| # | Severity | Location | Röviden |
| --- | --- | --- | --- |
| L1 | LOW | `.cursor/start.sh` | Dev DB-jelszó a `psql -c` argv-jén (`/proc`, statement log). Throwaway, `umask 077`. |
| L2 | LOW | `.cursor/install.sh` | `curl … setup_24.x \| sudo bash` — unpinned remote root script. |
| L3 | LOW | `.cursor/environment.json` | Ha a `start.sh` nem futott, a `.env` source bukása env-hiányként látszik, nem start-hibaként. |
| L4 | LOW | `src/app/(payload)/layout.tsx` | `custom.scss` import, `sass` nincs a `package.json`-ban; a `@payloadcms/next` hozza transitive. Lockfile-érintett, C2 regenerációs PR-be való. |
| L5 | LOW | `bunny-library-handler.ts:80` | Upstream Bunny-hiba 502/503, log nélkül; a váratlan ág logol. |
| L6 | LOW | `query.ts:111` + `normalizeAudience` | Törölt szakember-kurzus (`ON DELETE SET NULL`) historical bevétele az otthoni ágba csúszik. Totálok stimmelnek. |
| L7 | LOW | `BunnyLibraryPanel.tsx` | `fontSize: '0.9rem'` stb. a Payload 13 px rooton a statisztika-fix elé esik vissza; a rem-őr csak a `custom.scss` tokent nézi. |
| L8 | LOW | `gomb-kontraszt.test.ts` | A G-K2–G-K6 nem olvassa a `custom.scss`-t; a 23 kontraszt-pár ma kézzel stimmel, őr nincs. |
| L9 | LOW | `bunny-library-handler.ts` | `parseLibraryKind` csak exact `'public'`-ra vált; `?library=PUBLIC` a védett tárat adja. Staff-only. |
| L10 | LOW | `revenue.ts` `aggregateCourseRevenue` | Azonos `titleSnapshot`, eltérő audience: a kurzus-sor az első item ágát kapja, a havi chart itemenként bont. |
| L11 | INFO | `AGENTS.md` | Még „102 tesztfájl, 1653 teszt” (2026-08-10). A vizsgálatkor 208 / 4168. |
| L12 | INFO | `src/payload-types.ts` | A boot `npx payload migrate` JSDoc-leírásokat ír; a committed fájl driftel. A CI nem diffeli a `generate:types` kimenetét. Predates a tartományt (`2d54be4`). |
| L13 | INFO | `eslint-config-next` 16.3.1 vs `next` 16.3.0 | Dev-only ferdeség; a vizsgálatkor ártalmatlan. |

---

## 5. Ami áll (a kör pozitív kontrolljai)

- **Access control helyes és indokolt.** A `StatisticsView` kapuzik
  `req.user`-en, mielőtt query menne. Fejkomment: Payload 3.86 custom view
  path = publikus admin-útvonal, a Root auth-redirect nem fut. A Bunny handler
  rétegez: anon 401, customer 403 + warn, staff/owner 200.
- **Nincs tilos zóna-sértés** a vizsgált tartományban (lásd 2. szakasz).
- **`overrideAccess` védhető:** minden előfordulás a kapu mögött, a select
  szűk, a név/e-mail a kurzuslapon marad.
- **Nincs token-/titokszivárgás.** Új env kulcsok üres értékkel + TITOK
  annotáció. Library-id a válaszban lehet (embed-URL-ben is ott van); a
  lejátszás továbbra is a külön kapuzott `/api/stream-token`.
- **Bunny input:** search cap 200, `searchParams.set`, library-id
  `encodeURIComponent`.
- **Truncation flag** a revenue és engagement UI-ig ki van vezetve
  (alsó-becslés szöveg) — az F1 pont az, hogy egy származtatott oszlop
  megszegi a szerződést, nem az, hogy a mechanizmus hiányzik.
- **Közös aggregátor:** `engagement.ts` a `buildCourseProgressStats().totals`-t
  mapeli, nem számol második képletet.
- **Lockfile tiszta:** 903 `resolved` → `registry.npmjs.org`; nulla privát
  tükör; `@payloadcms/*` a tartományban 3.86.0, nincs `^`.
- **Nincs új migráció.** A `bunnyLibraryPanel` `type: 'ui'`, nem persistál.
  A deploy `payload migrate` ennél a release-nél jogos no-op.
- **`importMap.js`** tartalmazza az öt új komponenst (production 500
  custom view-on ennek hiányán szokott elbukni).
- **Tesztek a vizsgálatkor:** typecheck tiszta; lint 0 error (3 pre-existing
  warning a `CoursePlayer.tsx`-ben, kívül a tartományon); vitest 208 fájl /
  4168 teszt zöld. A `next build` a doksi-körben nem lett újrafuttatva
  (AGENTS.md nextjs-agent-rules blokkot írna).

---

## 6. Tesztlyukak (a HIGH-ot ezek engedték át)

A tartomány ~1295 teszt-sort adott öt fájlban; a 69 új teszt zöld. A lyuk
alakja magyarázza, miért ment át az F1.

Prioritás a javító kör tesztjeihez:

1. Progress truncation populated enrollment-listán: `notStarted` nem nőhet,
   `averagePercent` nem csökkenhet a valóság alá. Itt bukott volna az F1.
2. `sort` jelenléte minden lapozott statistics `find`-en.
3. NULL `priceHufSnapshot` items-szel; hiányzó `quantity` vs. checkout `?? 1`;
   `orderCount > 0` és `totalHuf === 0` tiltása.
4. Naptárilag érvénytelen `invoiceCompletionDate` → `createdAt` fallback.
5. Bunny: GUID nélküli tétel a tele oldalon; `MAX_PAGES` kimerülés;
   `truncated` törlése hibaágon; library-váltás üríti a sorokat.
6. Anon és `customer` a `StatisticsView` / `BunnyLibraryView` denial oldalán,
   **nulla** `payload.find`; staff a riportot kapja; engagement reject mellett
   a Havi bevétel megmarad.
7. Részleges `refunds` + `status: 'paid'` — mit mutat a total.
8. `budapestMonthKey` Invalid Date (`null` vs. `RangeError`).
9. `custom.scss` be a G-K3–G-K6-ba; inline `rem`/`px` scan az
   `src/components/admin/**` alatt.
10. `npm run generate:types` diff-őr a CI-ben (L12).

A view-kapu kötését a vizsgálat **utáni** `#127` részben pótolta
(`src/__tests__/admin-nezet-kapu-kotes.test.tsx`). Az F1-re és a fenti 2–5.,
7–9. pontokra a `#127` nem tér ki. A `#127`/`#128` magát a jegyzőkönyv **nem**
auditálta.

---

## 7. Railway / üzemeltetés (a vizsgált tartományra)

- Új migráció nincs; a start-logban `Migrating:` / `Migrated:` hiánya ennél a
  release-nél helyes, ne keverendő a CLAUDE.md 14. tanulsággal.
- A Videótárhoz staging+prod env: `BUNNY_STREAM_LIBRARY_API_KEY`,
  `BUNNY_STREAM_PUBLIC_LIBRARY_API_KEY`. Nélkülük az app elindul, a nézet
  503 magyar üzenettel degradál.
- Az admin layout új inputja a `custom.scss`. Ha a Railway `Build · skipped`,
  a régi `.next/` a `/admin/statisztika`-t töri (CLAUDE.md 1.).
- A `.cursor/*` nincs Railway-hatással; a `railway.json` a tartományban
  érintetlen.
- A 2026-08-20 ~15:21 UTC utáni prod kiesés (~15:20–17:00 UTC, #126 után)
  **nem** a CSS/komponens-diff logikai hibája a vizsgálat szerint; platform /
  build / migrate gyanú. A Railway MCP a vizsgálatkor nem volt használható.

---

## 8. Határozatok

1. **A vizsgálat lezárult.** A 2026-08-20-i `90f6bc8..9aa650e` tartomány
   biztonsági és kódoldali állapota ezzel a jegyzőkönyvvel rögzített.
2. **Kódot ez a kör nem változtat.** Sem workaround, sem részleges patch.
3. **Biztonsági remediation a vizsgált tartományra nem kell** (nincs
   medium+ sérülékenység). Az F10 rate limit védelem-mélyítés, nem
   exploitable unauth vektor.
4. **Access-controlt nem nyitunk.** A meglévő `hasStaffOrOwnerRole` kapuk
   helyesek; módosításuk emberi review-köteles zóna marad.
5. **Következő javító kör sorrendje**
   1. F1 (HIGH engagement-vágás, a `course-progress-handler` helperrel) + a
      truncation teszt, ami most hiányzik
   2. F6 (Bunny stale lista) + F5 (GUID-lapozás)
   3. F2, F3, F4 (bevétel: `sort`, snapshot-fallback, dátum)
   4. F7, F8, F9, F10, F11
6. **A `#127` és `#128` nincs ebben a jegyzőkönyvben.** Külön kör, ha a
   Payload 3.88 és a tick-őr is auditot kap.
7. **A `feat/kurzusoldal-velemenyek` továbbra sem mergelendő.**

---

## 9. Hivatkozások

- OWASP-kör (teljes repó, korábbi): `docs/owasp-security-review.md`
- Admin Statisztika / Kurzus-hatás: `src/lib/statistics/`,
  `src/components/admin/statistics/`, `src/components/admin/StatisticsView.tsx`
- Kurzuslap progress (a helyes vágás): `src/lib/admin/course-progress-handler.ts`
- Bunny: `src/lib/stream/bunny-library.ts`, `bunny-library-handler.ts`,
  `src/components/admin/BunnyLibraryPanel.tsx`
- Tilos zónák és üzemeltetés: `CLAUDE.md`, `AGENTS.md`
- Demo-kör statisztika-ígérete: `docs/demo-kornyezet.md` (a seed-lánc a
  tartományban nem kapott tesztet)
