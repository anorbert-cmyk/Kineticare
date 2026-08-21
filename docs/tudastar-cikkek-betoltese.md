# A Tudástár cikkeinek betöltése

> **Mi ez?** A `docs/cikkek/` alatti hat markdown-cikk betöltése a Payload
> `posts` kollekciójába, hogy megjelenjenek a `/blog` listán és a saját
> cikkoldalukon.
>
> **Készült:** 2026-08-21.

## 1. Miért script, és miért nem kézi bemásolás

Hat cikk, egyenként 2 300–3 000 szavas törzzsel, 14–18 alcímmel és
felsorolásokkal. Kézzel a szerkezet elveszne, és minden szakmai javítás után
újra kellene csinálni. Így a markdown marad az **egyetlen igazság**, a
betöltés pedig visszajátszható és tesztelhető.

A fordítót a `src/lib/tudastar/markdown-to-lexical.ts` adja, a betöltést a
`src/scripts/import-tudastar-cikkek.ts`.

## 2. A legfontosabb szabály: némán semmi nem veszhet el

A storefront szerializálója (`src/components/lexical/serialize.tsx`) **véges**
csomópont-készletet ismer: `heading`, `paragraph`, `text`, `link`, `list`,
`listitem`, `quote`, `horizontalrule`, `linebreak`, `upload`. Ami nincs benne
— mindenekelőtt a **táblázat** —, azt nem rendereli ki.

Ez alattomos hibaforrás: egy táblázatot tartalmazó cikk az adatbázisban
hiánytalannak látszana, miközben a látogató nem látja a felét. Ezért a fordító
minden fel nem ismert szerkezetre **kivételt dob**, nem ugorja át.

**Mérve a betöltés írásakor:** mind a hat cikk törzsében **nulla** táblázat-sor
van. Az összes tábla a törzs UTÁNI, lektornak szóló szakaszokban áll, amiket a
kivágás amúgy is levág. A dobás tehát ma egyetlen cikket sem érint; az őr a
jövő szerkesztéseinek szól.

## 3. Mi kerül be a cikkből, és mi nem

A cikkfájlok felépítése kötött:

| Rész | Sorsa |
| --- | --- |
| A H1 fölötti fejléc (forrástáblák, cikkíró jegyzetei) | **kimarad** |
| A H1 | a bejegyzés **címe** lesz |
| A törzs a H1-től | a `content` mező |
| „Kik írták ezt a cikket?", „Forrásjegyzék", „Fontos tudnivaló" | **bent marad** (E-E-A-T és felelősség) |
| „Állítás és forrás: a cikkíró öntesztje" | **kimarad** |
| „A vezetőnek szóló jelzések", „A cikkíró javaslata a vezetőnek" | **kimarad** |

A rövid bevezetőt (`excerpt`) a törzs első bekezdéséből képezzük, mondathatáron
vágva, legfeljebb 200 karakter.

## 4. A slugok kötöttek

| Fájl | Slug |
| --- | --- |
| `1-miert-zsibbad-a-kezem.md` | `miert-zsibbad-a-kezem` |
| `2-keztoalagut-szindroma.md` | `keztoalagut-szindroma` |
| `3-teniszkonyok.md` | `teniszkonyok` |
| `4-pattano-ujj.md` | `pattano-ujj` |
| `5-csuklo-es-kezfajdalom.md` | `csuklo-es-kezfajdalom` |
| `6-csuklotores-utani-gyogytorna.md` | `csuklotores-utani-gyogytorna` |

Ezek a webcímek szerepelnek a `docs/adwords-kampany.md` céloldal-hozzárendelésében
(7.2). **Eltérni tilos** — a hirdetés különben 404-re vinne.

## 5. Két külön kapu

```
OWNER_TUDASTAR_CONFIRM=igen   # enélkül PRÓBAFUTÁS: semmi nem íródik
OWNER_TUDASTAR_PUBLISH=igen   # enélkül a bejegyzés PISZKOZAT marad
```

A két kapu azért külön, mert a betöltés és a nyilvánossá tétel **két külön
döntés**. A betöltés visszavonható (piszkozat, senki nem látja), a publikálás
viszont egészségügyi tartalmat tesz ki a nyílt internetre.

**Tartalmi állapot** (`docs/cikkek-javitas-naplo.md`): a négy blokkolóból három
lezárva (B1 mentőhívási szint, B2 ellenjavallat, B4 irányelv-olvasat), a B3
pedig úgy, hogy a nem igazolt akkreditációs szám kikerült a szövegekből. Ami
**nyitva maradt: a két gyógytornász szakmai átolvasása.** Ezért alapból
piszkozat.

## 6. Futtatás

### Helyben

```bash
npm run import:tudastar                                   # próbafutás
OWNER_TUDASTAR_CONFIRM=igen npm run import:tudastar       # betöltés piszkozatként
OWNER_TUDASTAR_CONFIRM=igen OWNER_TUDASTAR_PUBLISH=igen npm run import:tudastar
```

### Élesben (Railway)

Az éles adatbázis a Railway privát hálózatán van, kívülről nem érhető el, ezért
a betöltés egyszeri **job**-ként fut, a repóban bevált mintát követve
(`CLAUDE.md` 2. üzemeltetési tanulság: a config-as-code felülírja a
service-beállítást, ezért dedikált fájl kell):

1. Új service a Kineticare projektben, ugyanarra a repóra.
2. A service „Config file path" beállítása: `railway.tudastar-job.json`.
3. A `DATABASE_URI` és a `PAYLOAD_SECRET` ugyanaz, mint a fő service-en
   (referencia-változóval: `${{Postgres-c8Rg.DATABASE_URL}}`).
4. `OWNER_TUDASTAR_CONFIRM=igen`, és ha publikálni is kell,
   `OWNER_TUDASTAR_PUBLISH=igen`.
5. Deploy. A logban `TUDASTAR_JOB_START commit=<sha>` … `TUDASTAR_JOB_DONE` a
   siker jele.

   **A `commit=` NEM dísz.** A Railway `redeploy` a MEGLÉVŐ buildet futtatja
   újra, tehát a régi kódot — ugyanaz a csapda, mint a fő szolgáltatásnál
   (`CLAUDE.md` 1. üzemeltetési tanulság: a „SUCCESS" deploy nem jelenti, hogy
   az új kód fut). A kiírt SHA-t vesd össze a `main` fejével; ha nem egyezik,
   a job RÉGI kódot futtatott, és az eredménye nem fogadható el.

   Ezért figyeli a szolgáltatás a `railway.tudastar-job.json` mellett a
   betöltő és a fordító forrásait is: így egy importer-javítás magától friss
   buildet kap, nem kell kézzel kikényszeríteni.
6. **A job végeztével a service törlendő** — a `sleep` csak azért van benne,
   hogy a Railway ne indítsa újra és a log olvasható maradjon.

Alternatíva, ha nem akarsz külön service-t: a cikkek az adminban is
bemásolhatók, de akkor a markdown és az adatbázis kettéválik, és a következő
szakmai javításnál kézzel kell szinkronizálni.

## 7. Újrafuttatható

A párosítás **slug szerint** történik: meglévő bejegyzést frissít, nem
duplikál. A `publishedAt` az első publikáláskor áll be (a Posts collection
`setPublishedAtOnFirstPublish` hookja), ismételt futásnál nem csúszik el.

Ha egy cikk szövege változik, elég a markdownt javítani és újra lefuttatni.

## 8. Amit mértünk (2026-08-21, helyi Postgres 16 + friss migrációs lánc)

| Ellenőrzés | Eredmény |
| --- | --- |
| Próbafutás írás nélkül | 6 cikk lefordult, **0 sor** került az adatbázisba |
| Éles futás | 6 létrehozva, `status` és `_status` egyaránt `published` |
| `/blog` lista | HTTP 200, **6 kártya**, mind a hat cím a helyén |
| Cikkoldalak | mind a hat HTTP 200; 15–18 `<h2>`, 48–93 `<li>`, 95–119 `<p>`, 5 156–6 423 szó |
| Kereszthivatkozások | a cikkek egymásra mutató linkjei HTTP 200-at adnak |
| `sitemap.xml` | mind a hat cikk benne van |
| Szövegveszteség | **nulla** — őr-teszt méri cikkenként, szószámmal |

A szövegveszteség-őr mutációval igazolva: ha a fordító eldobja a
felsorolásokat, az arány 83–91%-ra esik, és a teszt bukik.

## 9. Kapcsolódó

- Fordító: `src/lib/tudastar/markdown-to-lexical.ts`
- Betöltő: `src/scripts/import-tudastar-cikkek.ts`
- Őrök: `src/__tests__/tudastar-markdown-lexical.test.ts`
- Job-konfiguráció: `railway.tudastar-job.json`
- Tartalmi állapot: `docs/cikkek-javitas-naplo.md`
- Céloldal-hozzárendelés: `docs/adwords-kampany.md` 7.2
