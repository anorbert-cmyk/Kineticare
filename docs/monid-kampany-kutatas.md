# Monid — kampány-kutatási terv

> **Cél:** minden adat, amiből teljes SEO + Ads + tartalom-kampányt lehet
> tervezni a Kineticare-nek. A felderítés (`discover`, `inspect`) INGYENES,
> csak a `run` kerül pénzbe. Ez a dokumentum a **futtatási terv** —
> végpontonként, sorszámmal, árral.
>
> **Pénztárca-egyenleg a terv írásakor: 2,89 USD.** Az alábbi csomagok ennél
> többet igényelnek — a feltöltendő összeg a 7. szakaszban.

## 1. A kiindulási helyzet — ez határozza meg az egész tervet

**Nincs saját adatunk.** Az oldal új: nincs forgalma, nincs rangsorolása,
nincs linkprofilja. Ezért a `site-explorer` a SAJÁT domainünkre üres — a teljes
kutatásnak **versenytárs- és piac-alapúnak** kell lennie. Nem azt vizsgáljuk,
„mink van", hanem azt, hogy **kinek van, amit el akarunk venni**.

Ebből következik a sorrend: előbb ki kell deríteni, KIK rangsorolnak a
célkifejezéseinkre, és csak utána lehet őket visszafejteni. A 0. fázis nem
kihagyható és nem párhuzamosítható — minden más rá épül.

## 2. Ártábla (mért, a `discover`/`inspect` válaszaiból)

| Szolgáltató | Végpont | Ár | Mértékegység |
|---|---|---:|---|
| Semrush | `/domain_rank` | $0,002 | hívás |
| Semrush | `/domain_organic_pages` | $0,002 | sor |
| Semrush | `/keyword_metrics` | $0,004 | hívás |
| Semrush | `/domain_adwords` | $0,004 | sor |
| Semrush | `/domain_ads_copies` | $0,008 | sor |
| Semrush | `/domain_organic_organic` | $0,008 | sor |
| Semrush | `/backlinks_refdomains` | $0,008 | sor |
| Semrush | `/domain_domains` | $0,016 | sor |
| Ahrefs | `/site-explorer/refdomains` | $0,018 | sor |
| Ahrefs | `/keywords-explorer/search-suggestions` | $0,036 | sor |
| Ahrefs | `/site-explorer/organic-competitors` | $0,042 | sor |
| Ahrefs | `/serp-overview/serp-overview` | $0,060 | sor |
| Ahrefs | `/keywords-explorer/related-terms` | $0,066 | sor |
| Ahrefs | `/keywords-explorer/matching-terms` | $0,066 | sor |
| Ahrefs | `/site-explorer/top-pages` | $0,069 | sor |
| Ahrefs | `/site-explorer/organic-keywords` | $0,072 | sor |
| Ahrefs | `/keywords-explorer/overview` | $0,126 | sor |
| Apify | `/compass/google-maps-reviews-scraper` | $0,000675 | sor |
| Apify | `/apify/instagram-search-scraper` | $0,00345 | sor |
| Apify | `/damilo/google-maps-scraper` | $0,0045 | sor |
| X402 Atlas | `google-trends/related-queries` | $0,033 | hívás |

**A legfontosabb költség-tanulság:** ugyanarra a kérdésre a **Semrush
30–60-szor olcsóbb**, mint az Ahrefs (pl. domain kulcsszavai: $0,004 vs
$0,072 / sor). Ahrefset csak ott használunk, ahol egyedi az adata
(SERP-áttekintés, forgalmi potenciál, kulcsszó-nehézség).

## 3. A futtatási terv fázisonként

### FÁZIS 0 — Kik a versenytársak? (kötelező első lépés)

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `ahrefs /serp-overview/serp-overview` | 10 célkifejezés, `country=hu` | ~100 | **$6,00** |

Célkifejezések: kéz zsibbadás · kéztőalagút szindróma · teniszkönyök ·
pattanó ujj · vállfájdalom · csuklófájdalom · kézfájdalom · alkar fájdalom ·
csuklótörés utáni gyógytorna · de quervain.

**Amit ad:** ki áll az első 10-ben, milyen oldallal, mennyi linkkel és
becsült forgalommal. **Ez a fázis állítja elő a versenytárs-listát, amire
minden további fázis épül.**

**Amit eldönt:** reális-e egyáltalán az első oldal; melyik kifejezésnél áll
gyenge oldal az élen (ott lehet gyorsan nyerni); ki a valódi ellenfél
(orvosi portál? magánrendelő? gyógyszergyár?).

### FÁZIS 1 — A versenytársak visszafejtése

Feltételezve ~8 domaint a 0. fázisból.

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `semrush /domain_rank` | 8 domain, `database=hu` | 8 | $0,02 |
| `semrush /domain_organic_pages` | 8 × 50 legjobb oldal | 400 | $0,80 |
| `semrush /domain_organic` | 8 × 100 kulcsszó | 800 | $3,20 |
| `semrush /domain_organic_organic` | 3 fő domain × 20 | 60 | $0,48 |
| **Összesen** | | | **$4,50** |

**Amit ad:** pontosan mely CIKKEIKKEL hozzák a forgalmat, és mely
kulcsszavakon. Ez a leggyorsabb út a tartalomtervhez: amit náluk működik,
azt jobban megcsinálva átvehető.

### FÁZIS 2 — Kulcsszó-univerzum kiterjesztése

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `ahrefs /keywords-explorer/matching-terms` | 8 mag-kifejezés | 250 | $16,50 |
| `ahrefs /keywords-explorer/search-suggestions` | 8 mag (autocomplete) | 150 | $5,40 |
| `google-trends /related-queries` | 6 kifejezés | 6 | $0,20 |
| **Összesen** | | | **$22,10** |

Mag-kifejezések: kéz · csukló · alkar · könyök · váll · ujj ·
kézrehabilitáció · kéztorna.

**Amit ad:** a hosszú farok. A mai listánk 22 kifejezés; ez 300–400-ra
bővíti, tünet- és élethelyzet-alakokkal együtt („mitől zsibbad a kisujjam",
„meddig fáj a csukló gipsz után"). **Ezek adják a cikkek H2-címeit.**

*Takarékos változat:* csak `search-suggestions` (150 sor, $5,40), a
`matching-terms` elhagyásával — a lefedettség kisebb, de a fő alakokat viszi.

### FÁZIS 3 — A fizetett táj (Google Ads tervezéshez)

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `semrush /domain_adwords` | 8 domain × 50 vásárolt kulcsszó | 400 | $1,60 |
| `semrush /domain_ads_copies` | 8 × 30 hirdetésszöveg | 240 | $1,92 |
| `semrush /domain_adwords_adwords` | 3 × 20 fizetett versenytárs | 60 | $0,48 |
| **Összesen** | | | **$4,00** |

**Amit ad:** ki hirdet ma a témára, MILYEN SZÖVEGGEL, és mely kulcsszavakra
költ. A versenytársak hirdetésszövege a legjobb kiindulás a saját RSA-khoz —
amit évek óta futtatnak, az bevált.

**Amit eldönt:** van-e egyáltalán fizetett verseny (ha nincs, olcsó a
kattintás); mekkora a belépő; milyen ajánlattal lehet ellenük menni.

### FÁZIS 4 — Helyi verseny és VEVŐHANG (a legjobb ár/érték)

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `apify /damilo/google-maps-scraper` | 5 keresés (gyógytornász / kézterápia / kézsebészet — Budapest + vidék) | 300 | $1,35 |
| `apify /compass/google-maps-reviews-scraper` | 15 hely × 100 vélemény | 1 500 | **$1,01** |
| **Összesen** | | | **$2,36** |

**Ez a terv legjobb üzlete.** Másfél ezer VALÓDI magyar betegvélemény
körülbelül egy dollárért. Amit ad:

- **a betegek SAJÁT SZAVAI** — pontosan az a nyelv, amit a cikkekben és a
  hirdetésszövegben használni kell (a `docs/seo-geo-llm.md` „helyzet, nem
  téma" elve ebből tölthető fel valódi tartalommal);
- **a fájdalompontok** — mire panaszkodnak a meglévő szolgáltatóknál (várólista,
  ár, távolság). Ezek a mi érveink az otthoni kurzus mellett;
- **a helyi verseny térképe** — kik, hol, milyen értékeléssel.

### FÁZIS 5 — Közösségi és trend (opcionális)

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `apify /apify/instagram-search-scraper` | hashtagek + profilok | 200 | $0,69 |
| `google-trends /related-topics` | 6 kifejezés | 6 | $0,20 |
| **Összesen** | | | **$0,89** |

### FÁZIS 6 — Linkprofil (későbbre halasztható)

| Végpont | Bemenet | Sor | Költség |
|---|---|---:|---:|
| `semrush /backlinks_refdomains` | 8 domain × 50 | 400 | $3,20 |

**Amit ad:** honnan szereznek linket a versenytársak — ugyanazok a
szakmai oldalak, portálok, egyesületek nekünk is elérhetők. **Halasztható**,
mert linképítésnek csak akkor van értelme, ha már van mire linkelni.

## 4. Költség-összegzés

| Csomag | Fázisok | Költség |
|---|---|---:|
| **Minimum** — „kik ellen megyünk és mit mondanak a betegek" | 0, 1, 4 | **~$13** |
| **Ajánlott** — teljes kampánytervhez elég | 0, 1, 2-takarékos, 3, 4, 5 | **~$23** |
| **Teljes** — minden, mély lefedettséggel | 0–6 mind | **~$43** |

**Javaslat: 25–30 USD feltöltés.** Ez fedezi az ajánlott csomagot, és marad
tartalék a menet közben felmerülő ellenőrző lekérdezésekre (a 0. fázis
eredménye szinte biztosan hoz olyan versenytársat, akit külön érdemes
megnézni).

## 5. Miért ebben a sorrendben

A 0. fázis **kapuőr**: amíg nem tudjuk, kik rangsorolnak, addig a
versenytárs-alapú lekérdezéseknek nincs bemenete. A 2. fázis (kulcsszó-
bővítés) ettől független, tehát párhuzamosítható, de a 1./3./6. nem.

A 4. fázis szándékosan korán van: **a vevőhang nem SEO-adat, hanem
szövegírási alapanyag**, és a legolcsóbb tétel az egész tervben. Ha csak egy
fázisra van pénz, ez legyen a második a 0. után.

## 6. Amit a Monid NEM tud megadni

Fontos, hogy ne várjunk tőle olyat, amire nem való:

- **Saját forgalmi adat** — az a Search Console és a GA4 dolga, és csak a
  domain-átállás után lesz értelme.
- **Konverziós arány** — csak saját mérésből jön (PostHog, lásd
  `docs/posthog.md`).
- **A lányok szakmai tartalma** — az adat megmondja, MIRE keresnek; hogy MIT
  írunk rá, az a szakértelmükből jön. Ezt semmilyen API nem pótolja, és
  éppen ez az E-E-A-T versenyelőny.

## 7. Végrehajtás

A feltöltés után a fázisok sorban futtathatók. Minden fázis eredménye ide,
a `docs/` alá kerül külön fájlba (`monid-*.md`), hogy a nyers adat
visszakereshető maradjon, és fél év múlva legyen mihez mérni.

**Karbantartás:** az ártábla és a végpont-készlet a Monid oldalán változhat.
Futtatás előtt a `monid_inspect` MINDIG lefut (ingyenes) — a séma és az ár
onnan jön, nem ebből a dokumentumból.
