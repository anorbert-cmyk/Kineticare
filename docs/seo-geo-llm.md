# SEO / GEO / LLM-optimalizálás — Kineticare

**Utolsó frissítés:** 2026-08-06

Ez a dokumentum két részre bomlik:

1. **Technikai réteg** — kódban él, tesztek védik. Már kész, itt csak dokumentálva.
2. **Tartalmi réteg** — minden cikkhez és oldalhoz kézzel kell elvégezni. Ez a
   Katák szakmai munkája; a checklist végrehajtható formában adja a szabályokat.

> **Alapelv:** a hagyományos SEO és az AI-keresési optimalizálás **nem két külön
> diszciplína**. Ugyanarra az alapra épül — crawlelhetőség, E-E-A-T, tekintély,
> friss és eredeti tartalom. A különbség: a SEO linkekre és pozícióra optimalizál,
> a GEO **említésekre és idézetekre**.

---

## 1. Technikai réteg — mi van kész

| Elem | Hol | Mit ad |
|---|---|---|
| `robots.txt` | `src/app/robots.ts` | Privát útvonalak kizárása + **AI-crawlerek kifejezett engedélyezése** |
| `sitemap.xml` | `src/app/sitemap.ts` | Oldalak, posztok, kategóriák, kurzusok — kérésidőben, mindig friss |
| Metadata + canonical | `src/lib/seo.ts` | title/description/og fallbacklánc, canonical, `metadataBase` |
| SEO-mezők a CMS-ben | pages, posts **és products** | `seoTitle` / `seoDescription` / `ogImage` — azonos mezőnevek és helyek mindhárom collectionben |
| Organization JSON-LD | kezdőlap | Entitás-azonosítás, `inLanguage`, `knowsAbout` |
| **FAQPage** JSON-LD | kezdőlap | A GYIK közvetlenül kivonatolható AI-válaszba |
| **Course + Product** JSON-LD | kurzusoldalak | Egy entitás, kettős `@type` — név, leírás, kép, `sku`, márka, **Offer: ár HUF-ban**, elérhetőség, eladó/szolgáltató |
| **BreadcrumbList** JSON-LD | poszt- és kurzusoldalak | Struktúra gépi olvasónak |
| Article JSON-LD | blogposztok | `datePublished` / `dateModified` |

Védelem: `src/__tests__/seo-structured-data.test.ts` és
`src/__tests__/product-seo.test.ts` — ezek a hibák csendesek (nincs futásidejű
hiba, csak eltűnik a láthatóság hetekre), ezért tesztelt.

### Miért kettős `@type` a kurzusoldalon

A kurzusoldal egyetlen dolgot ír le, ami egyszerre online videókurzus (`Course`)
és megvásárolható termék (`Product`). Két külön JSON-LD blokk ugyanarról az
oldalról **két entitásnak** látszana a gépi olvasó szemében — ez ugyanaz a hiba,
amit a kezdőlapon a duplikált `Organization` okozott —, ezért a schema.org által
megengedett többszörös `@type`-ot használjuk, egyetlen `Offer`-rel.

A séma minden mezője a **látható** tartalomból jön: a név a H1, a leírás a hero
lead bekezdése (a `shortDescription`, **nem** a csak meta-tagben látszó
`seoDescription`), a kép a buybox borítóképe, az ár pedig a kiírt ár-címke
forrása. `aggregateRating` / `review` szándékosan nincs: értékelés-adat nem
létezik a kurzusokon, kitalált értékelés pedig tilos.

### Miért van külön ALLOW az AI-crawlereknek

A GEO-láthatóság **első** feltétele, hogy az AI-botok elérjék a tartalmat. Ezek
külön user-agentek, és sok sablon-`robots.txt` vagy bot-védelmi (WAF/CDN) szabály
alapból kizárja őket a rosszindulatú botokkal együtt. Engedélyezve:

- **OpenAI:** `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`
- **Anthropic:** `ClaudeBot`, `Claude-User`, `Claude-SearchBot`
- **Perplexity:** `PerplexityBot`, `Perplexity-User`
- **Egyéb:** `CCBot`, `Google-Extended`, `Google-Agent`, `Applebot-Extended`, `meta-externalagent`, `Bingbot`

Ha valaha az AI-**tréninget** korlátozni akarjuk, azt a `Google-Extended` és
`CCBot` eltávolításával kell megtenni. A **keresési/idézési** botokat
(`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`) érdemes engedni — ezek
adják az idézeteket és a hivatkozó forgalmat.

> **Fontos:** a Cloudflare/WAF bot-védelem külön réteg. Hiába enged a
> `robots.txt`, ha a tűzfal blokkol. Élesítés után ellenőrizni kell.

### Karbantartási szabály

**Minden ár-, csomag- vagy funkcióváltozás után a strukturált adat is frissül.**
A `Course` séma ára a `priceInHUF` mezőből származik, tehát automatikusan követi
— de ha új mező vagy új terméktípus jön, a sémát is bővíteni kell. Az elavult
strukturált adat gyorsan **téves árat terjeszt** az AI-válaszokban, és ez
nehezebben javítható, mint amilyen gyorsan terjed.

---

## 2. Tartalmi réteg — checklist MINDEN cikkhez és oldalhoz

### 2.1 Az alapelv: minden szakasz álljon meg önmagában

Az AI nem egész oldalakat idéz, hanem **szövegdarabokat** („chunk"). Minden
bekezdésnek kontextus nélkül is érthetőnek kell lennie.

- [ ] **Kérdés-alapú alcímek.** „Meddig tart a felépülés csuklótörés után?" — nem
      „Felépülés".
- [ ] **Az alcím alatti ELSŐ mondat adja a teljes választ.** Ne vezess fel; a
      választ kezdd, aztán fejtsd ki.
- [ ] **Rövid bekezdések** — 2–4 mondat, egy gondolat.
- [ ] **Listák és táblázatok HTML-ben, SOHA képként.** A képbe zárt táblázatot
      sem a kereső, sem az AI nem tudja kivonatolni.
- [ ] **Nincs kereszthivatkozás** — „mint fentebb említettük" használhatatlan egy
      önállóan idézett bekezdésben.
- [ ] **Az implicit összefüggés legyen kimondva.** Amit a szakmabeli
      magától értetődőnek vesz, azt az AI nem tudja kikövetkeztetni.

### 2.2 Idézhetőség

- [ ] **Konkrét, forrásmegjelölt adat.** Nem „a betegek nagy része", hanem
      „a betegek X%-a [forrás, év]". Kutatás szerint az idézetek és statisztikák
      hozzáadása **akár 40%-kal** növelheti a láthatóságot AI-válaszokban.
- [ ] **Konkrét esetleírás** — „6 hét alatt a szorítóerő 12 kg-ról 21 kg-ra nőtt"
      sokkal idézhetőbb, mint „jelentős javulás".
- [ ] **Frissesség jelölve** — „Frissítve: [dátum]" a szövegben is, nem csak a
      `dateModified` schemában.

### 2.3 E-E-A-T — ez a Kineticare legnagyobb versenyelőnye

Egészségügyi témában a Google és az AI-rendszerek is szigorúbban mérik a
szakértelmet (YMYL-tartalom). Ez nálunk **valós előny**, ha látszik:

- [ ] **Szerzői bio minden cikknél** — név, végzettség, szakterület, praxis-évek.
- [ ] **Elsőszemélyű tapasztalat** — „a praxisunkban azt látjuk, hogy…".
- [ ] **Hiteles forrás megjelölve** — szakirodalom, protokoll, irányelv.
- [ ] **Orvosi felelősség egyértelmű** — a jelenlegi óvatos hangnem
      („mindig a kezelőorvosod jóváhagyásával") tartandó. Ez nem gyengeség:
      az E-E-A-T-ben **erősít**.

> A fiktív testimonial fogyasztóvédelmi okból tilos, és AI-láthatóságban is
> visszaüt: az ellentmondó információ rontja a márka megbízhatósági jelét.

### 2.4 Category Entry Point (CEP) — helyzetek, nem témák

Az AI-promptok **valós élethelyzeteket** írnak le, nem témákat. Ezért a cikk
címe a beteg saját szavaival megfogalmazott helyzet legyen:

| Gyenge (téma) | Erős (helyzet) |
|---|---|
| „Csuklórehabilitáció" | „Levették a gipszet a csuklómról, mit csináljak most?" |
| „Kézerősítő gyakorlatok" | „Nem tudom megfogni a bögrét a műtött kezemmel" |
| „Gyógytorna otthon" | „Nincs időm gyógytornára járni, otthon is lehet?" |

Munkamenet:
1. Gyűjtsd a **valódi beteg-kérdéseket** (kapcsolati űrlap, konzultáció, közösségi média).
2. Vonj le konkrét helyzeteket.
3. Szűrj azokra, ahol a Katáknak van tapasztalata és adata.
4. Cikk: cím = a helyzet; nyitás = a helyzet elismerése; H2-ek = al-kérdések.

### 2.5 Tartalmi hub

Pillér oldal (pl. „Kézrehabilitáció műtét után") + al-témás cikkek, egymásra
hivatkozva. Ez a belső linkelés adja az AI-nak a témabeli tekintély jelét.

---

## 3. Mérés

### Három szint

1. **Eligibility** — crawlelhető, indexelt, strukturáltan kivonatolható-e.
   Eszköz: Google Search Console (feladatlista **B8**).
2. **Megjelenés** — AI share of voice, idézetek, sentiment.
3. **Üzleti hatás** — márkás keresési volumen (GSC), közvetlen forgalom,
   AI-referral GA4-ben (**B9**), regex szűrő: `chatgpt.com`, `perplexity.ai`,
   `claude.ai`, `gemini.google.com`.

### Prompt-portfólió

Az AI-válaszok **nem determinisztikusak** — mintázatot kövess, ne pontos szöveget.
**25 jól választott prompt jobb, mint 500 véletlenszerű.** Négy típus:

1. **Bevétel** — „legjobb online kézrehabilitációs kurzus", „otthoni kéztorna program"
2. **Reputáció** — „mit tudni a Kineticare-ről"
3. **Versenytárs** — „X vs Kineticare"
4. **Rés** — „alternatíva a személyes gyógytornára kézsérülés után"

Rögzítsd havonta: hány promptnál jelenünk meg, forrásként idéznek-e, milyen
hangnemben.

### Reális időtáv

- Technikai SEO hatása: **2–8 hét**.
- AI-láthatóság és linképítés: **hónapok**.

---

## 4. Következő lépések

| Lépés | Feladatlista-hivatkozás |
|---|---|
| Search Console bekötés, sitemap beküldés | B8 |
| GA4 + AI-referral szegmens | B9, C12 |
| Kurzus-URL numerikus id → slug | C3 |
| Cikkek átírása a 2. fejezet checklistje szerint | tartalmi munka (Katák) |
| Prompt-portfólió felállítása, baseline-mérés | mérés indulása |

> **Amit NE csináljunk:** `llms.txt`-t elsődleges stratégiaként. Nem hivatalos
> szabvány, és nincs bizonyított összefüggés a magasabb idézési aránnyal. A
> schema, a FAQ és a jól strukturált tartalom sokkal többet ér.
