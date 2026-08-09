# Számlázz.hu Számla Agent — megfelelőségi dokumentum

**Készült:** 2026-08-09
**Forrás:** a hivatalos szamlazz.hu-dokumentáció kutatásának szintézise (45 követelmény,
A1–A16 / B1–B9 / C1–C10 / D1–D10, `docs.szamlazz.hu`, `tudastar.szamlazz.hu`, élő XSD-k)
**+ kód-audit** a `9f771a7` állapoton (`af34826` + `a170bab` + `9f771a7` implementációs kör).

Ez a dokumentum azt rögzíti, hogy a Kineticare Számlázz.hu-integrációja a 45 hivatalos
követelmény mindegyikéhez hogyan viszonyul, mit fed le a kód, mi marad fiók-oldali
(üzemeltetői) teendő, és mit kell teszt-fiókban validálni. A státuszokat a **tényleges kód**
alapján állapítottuk meg — nem a követelmény-doksi feltételezései alapján.

Kapcsolódó: `docs/szamlazz-storno.md` (stornó/helyesbítő folyamat részletei).

## Jelmagyarázat

| Státusz | Jelentés |
|---|---|
| **megfelel** | a követelmény már teljesült, kód-hivatkozással |
| **ebben a körben javítva** | a mostani implementációs kör hozta meg a megfelelést |
| **fiók-oldali teendő** | nem kód: a Számlázz.hu-fiókban vagy a környezetben állítandó be |
| **tudatos eltérés** | szándékosan nem követjük, indoklással |
| **n.a.** | ránk nem alkalmazható, indoklással |

**Szintek:** KÖTELEZŐ = hivatalosan előírt vagy a működéshez elengedhetetlen ·
AJÁNLOTT = hivatalos jó gyakorlat · TISZTÁZANDÓ = hivatalos forrásból nem (teljesen)
megerősített, teszt-fiókban ellenőrizendő.

---

## A) Agent-alapok (transzport, hitelesítés, séma, válasz, hibakezelés)

| Az. | Szint | Státusz | Hol a kódban |
|---|---|---|---|
| A1 | KÖTELEZŐ | **ebben a körben javítva** — a végpont **záró perjelet** kapott (`.../szamla` → `.../szamla/`); perjel nélkül egy 301/302 a POST-ot GET-té alakítaná, a multipart törzs elveszne (53-as hiba). Az XML mindhárom művelethez **fájlmellékletként** megy. | `src/lib/szamlazz/client.ts` → `SZAMLAZZ_DEFAULT_API_URL`, `getSzamlazzConfig()` (URL-normalizálás: `origin + pathname.replace(/\/*$/, '/')`); mezőnevek: `postInvoiceXml` (`action-xmlagentxmlfile`), `postStornoXml` (`action-szamla_agent_st`, `storno.ts`), `queryInvoiceByKulsoAzon` (`action-szamla_agent_pdf`, `pdf.ts`) |
| A2 | KÖTELEZŐ | **megfelel** — hitelesítés kizárólag `<szamlaagentkulcs>`-csal; `felhasznalo`/`jelszo` sosem megy. A kulcs env-ből jön, a repóban nincs; hiánya nem indulási hiba (`enabled=false`). | `getSzamlazzConfig()` (`client.ts`); `<szamlaagentkulcs>` a `buildInvoiceXml` / `buildStornoXml` / `buildInvoiceLookupXml` első `beallitasok`-mezője |
| A3 | KÖTELEZŐ | **megfelel** — a gyökér blokk-sorrend kötött és teljes: `beallitasok → fejlec → elado → vevo → fuvarlevel → tetelek`; namespace + `schemaLocation` kiírva. (Beküldés előtti XSD-validálás nincs — a hivatalos szöveg ezt csak ajánlja.) | `buildInvoiceXml()` (`src/lib/szamlazz/invoice.ts`) |
| A4 | KÖTELEZŐ | **megfelel** — `beallitasok`: `szamlaagentkulcs`, `eszamla`, `szamlaLetoltes`, `valaszVerzio`, `szamlaKulsoAzon` a hivatalos sorrendben. Az elavult `szamlaLetoltesPld` nincs kiírva. A `szamlaKulsoAzon` helyesen a `beallitasok`-ban (nem a fejlécben) van. | `buildInvoiceXml()` (`invoice.ts`), `buildStornoXml()` (`storno.ts`) |
| A5 | KÖTELEZŐ | **megfelel** — `<valaszVerzio>2</valaszVerzio>` mindhárom kérésben; a válasz feldolgozása egy közös XML-értelmezőn (siker: `sikeres`/`szamlaszam`/`vevoifiokurl`; hiba: `hibakod`/`hibauzenet`, `<hiba>`-blokkos és lapos formában is). | `parseAgentResponse()` (`client.ts`), `extractAgentErrors()` |
| A6 | AJÁNLOTT | **megfelel** — a `szlahu_down`, `szlahu_error`, `szlahu_error_code` fejlécek feldolgozva (a `szlahu_down` a body sikerét is felülírja, retryable hibára). Az összeg-/számlaszám-fejléceket szándékosan nem használjuk: v2-nél az XML a mérvadó. | `parseAgentResponse()` (`client.ts`) |
| A7 | KÖTELEZŐ | **megfelel** — a teljes fejléc-sorrend kiírva: `keltDatum, teljesitesDatum, fizetesiHataridoDatum, fizmod, penznem, szamlaNyelve, megjegyzes, arfolyamBank, arfolyam, rendelesSzam, dijbekeroSzamlaszam, elolegszamla, vegszamla, helyesbitoszamla, helyesbitettSzamlaszam, dijbekero, szamlaszamElotag`. HUF-nál `arfolyam`/`arfolyamBank` üres (nem devizás). Ebben a körben a `teljesitesDatum` inputból vezérelhető lett (lásd B4). | `buildInvoiceXml()` (`invoice.ts`) |
| A8 | KÖTELEZŐ | **megfelel** — a `vevo` négy kötelező mezője (`nev`, `irsz`, `telepules`, `cim`) nélkül a számla **nem megy ki**: a rendelés `invoiceStatus='failed'` lesz, emberi adatpótlásra várva. Az `elado` blokk minden mezője üresen megy (fiók-adatok érvényesek). A `<vevo><azonosito>` **mindig üres** — a doksi figyelmeztetése miatt (más vevőhöz rögzített azonosító adatfrissítést okozna). | `buyerFromOrder()` + `buildInvoiceXml()` (`invoice.ts`); a `failed`-ág az `issueInvoiceForOrder()`-ben |
| A9 | KÖTELEZŐ | **ebben a körben javítva** — a tételszámítás **egységár-alapú** lett: előbb az egy darabra eső nettó kerekedik (`round(bruttoUnit / 1,27)`), a tételösszegek ennek pontos többszörösei. Így `nettoEgysegar × mennyiseg = nettoErtek` **mennyiség > 1 esetén is fillérre** teljesül (a korábbi tétel-szintű kerekítés qty=3-nál 33,33 × 3 = 99,99 ≠ 100 eltérést adott volna → 259–264 hibakód). Tétel-sorrend a hivatalos. | `computeLineAmounts()` (`invoice.ts`) |
| A10 | AJÁNLOTT | **ebben a körben javítva** — `<fizmod>` `bankkártya` → **`Barion`**: a Számlázz.hu normalizált értékkészletében a `Barion` önálló elem, így a `fizmodunified` pontosan a valós fizetési módra áll (nem „other"-re). | `buildInvoiceXml()` (`invoice.ts`) |
| A11 | KÖTELEZŐ | **megfelel** — `penznem=HUF`, `szamlaNyelve=hu` (utóbbi az egyetlen XSD-enum fejlécmező); devizás mezők üresek. | `buildInvoiceXml()` (`invoice.ts`) |
| A12 | KÖTELEZŐ | **ebben a körben javítva** — teljes idempotencia-lánc: `rendelesSzam = orderNumber` (duplikátum-védelem alapja) + **bizonylatonként egyedi** `szamlaKulsoAzon` (számla: `orderNumber`, stornó: `-STORNO`, helyesbítő: `-HELYESBITO-<seq>`); **beküldés-ismétlés ELŐTT lekérdezés** a külső azonosítóra; a 71/152-es válasz **nem hiba**, hanem `kind: 'duplicate'` → lekérdezés → a meglévő bizonylat átvétele. | `client.ts` → `SZAMLAZZ_DUPLICATE_AGENT_CODES`, `isDuplicateOrderError()`; `pdf.ts` → `queryInvoiceByKulsoAzon()`; `invoice.ts` / `storno.ts` / `corrective.ts` → `adoptExisting()` + a `previousAttempts > 0` ágon futó lookup. **Fiók-oldali előfeltétel:** a rendelésszám-ismétlés tiltása (lásd checklist 3.) |
| A13 | KÖTELEZŐ | **ebben a körben javítva** — hivatalos hibakód-osztályozás: `1` = egyedüli explicit újrapróbálható (karbantartás); `71`/`152` = duplikátum (idempotencia-találat); `7` = „nincs ilyen bizonylat" a lekérdezésnél; minden más kód **végleges** `agent` hiba. A kód és az üzenet strukturáltan naplózódik (`agentErrorCodes`), request ID-vel. | `client.ts` → `SZAMLAZZ_RETRYABLE_AGENT_CODES`, `SZAMLAZZ_DUPLICATE_AGENT_CODES`, `agentErrorFromCodes()`; `pdf.ts` → `SZAMLAZZ_NOT_FOUND_CODE` |
| A14 | KÖTELEZŐ | **ebben a körben javítva** — max. 5 beküldés **perzisztens** számlálóval mindhárom ágon; a plafon felett hálózati hívás nélkül `failed` + error-szintű riasztás (emberi beavatkozás). Így a job-retry és az order-poll resweep **együttese** sem lépheti túl. | `MAX_INVOICE_ATTEMPTS` (`invoice.ts`), `MAX_STORNO_ATTEMPTS` (`storno.ts`), `MAX_CORRECTIVE_ATTEMPTS` (`corrective.ts`); mezők: `invoiceAttempts` / `stornoAttempts` / `correctiveInvoiceAttempts` (`src/plugins/ecommerce.ts`) |
| A15 | AJÁNLOTT | **tudatos eltérés** — nincs cookie-jar. Minden hívás önálló, állapotmentes multipart POST, a hitelesítés kérésenként az agent-kulccsal történik; nincs olyan több-lépéses folyamatunk, amely session-folytonosságot igényelne. Ha a szerver mégis session-cookie-t vár, az a teszt-fiókos körben derül ki. | `postInvoiceXml()` / `postStornoXml()` / `queryInvoiceByKulsoAzon()` — natív `fetch`, cookie-kezelés nélkül |
| A16 | AJÁNLOTT | **n.a.** — kimenő tűzfal-szabály nincs (Railway-n a kimenő forgalom nem IP-szűrt), a Let's Encrypt lánc a futtatókörnyezet TLS trust store-jából érvényesül. A kérés-timeout viszont explicit: `SZAMLAZZ_TIMEOUT_MS` (default 15 000 ms). | `getSzamlazzConfig()` → `timeoutMs`; `AbortSignal.timeout()` a három POST-ban |

---

## B) Helyesbítő számla

| Az. | Szint | Státusz | Hol a kódban |
|---|---|---|---|
| B1 | KÖTELEZŐ | **megfelel** — a helyesbítő a **normál** `xmlszamla` műveleten megy (`action-xmlagentxmlfile`), nem a stornó-interfészen; a stornónak külön XML-típusa és mezőneve van. | `buildCorrectiveInvoiceXml()` → `buildInvoiceXml()` + `postInvoiceXml()` (`src/lib/szamlazz/corrective.ts`) |
| B2 | KÖTELEZŐ | **megfelel** — `<helyesbitoszamla>true</helyesbitoszamla>` és `<helyesbitettSzamlaszam>` = az **eredeti** számla száma (`order.invoiceNumber`); a fejléc-sorrendben a hivatalos helyükön. | `buildInvoiceXml()` `corrective` ága (`invoice.ts`), `CorrectiveInvoiceRef` |
| B3 | KÖTELEZŐ | **megfelel** — a helyesbítőn **egyetlen korrekciós tétel** szerepel a visszatérített összegre, negatív értékekkel. A számítás abszolút értéken fut és utána vált előjelet, így az A9-egyenletek a negatív soron is teljesülnek, és a kerekítés pontosan tükrözi az eredeti tételt. Előjel-kombinációnk: `mennyiseg = 1` (pozitív), `nettoEgysegar` / `nettoErtek` / `afaErtek` / `bruttoErtek` negatív — ez a D4-ben hivatalosan rögzített „negatív `nettoEgysegar`" mintát követi. | `buildCorrectiveInvoiceXml()` (`corrective.ts`), `computeLineAmounts({ allowNegative: true })` (`invoice.ts`). Validálás: **T3** |
| B4 | KÖTELEZŐ | **ebben a körben javítva** — a kiállításkor küldött teljesítési dátum rögzül a rendelésen (`invoiceCompletionDate`), és a helyesbítő **ezt ismétli meg** `teljesitesDatum`-ként (NAV-szabály: a naptári hónap nem térhet el). A mező bevezetése előtti számláknál figyelmeztetés + visszaesés a kiállítás napjára. | `invoice.ts` → `writeOrderInvoicingState({ invoiceCompletionDate: issueDate })`; `corrective.ts` → `originalCompletionDate` + warn; mező: `invoiceCompletionDate` (`ecommerce.ts`) |
| B5 | KÖTELEZŐ | **megfelel** — a bizonylattípus döntése: **első** refundként teljes összeg → stornó; minden más (részleges, illetve a maradékot lezáró) → helyesbítő. | `src/lib/refund/refund-order.ts` (~860. sor): `type === 'full' && alreadyRefunded === 0` → `issueStornoBestEffort()`, egyébként `issueCorrectiveBestEffort()` |
| B6 | KÖTELEZŐ | **megfelel** — a „már helyesbített számla nem stornózható" szabály kikényszerítve: ha volt korábbi részrefund, a maradékot lezáró teljes refund is **helyesbítőt** kap (a stornó a részösszeget másodszor is jóváírná). Több helyesbítő megengedett; a `helyesbitettSzamlaszam` mindig az **eredetire** mutat. | `refund-order.ts` (`alreadyRefunded === 0` feltétel + a 833–848. sorok indoklása); `correctiveInvoiceSeq` a nyom (`ecommerce.ts`). Láncolt hivatkozás validálása: **T4** |
| B7 | AJÁNLOTT | **megfelel** — a sorszámot a Számlázz.hu osztja, mi csak az előtagot választjuk (`szamlaszamElotag`), és a válaszban kapott számot tároljuk (`invoiceNumber` / `stornoNumber` / `correctiveInvoiceNumber`). | `buildInvoiceXml()` (`invoice.ts`); tárolás: `writeOrderInvoicingState()` (`order-state.ts`) |
| B8 | TISZTÁZANDÓ | **tudatos eltérés** — a `fizetendoKorrekcio` mezőt **nem küldjük**: hivatalos leírása hiányos, a részleges visszatérítés bizonylatát a negatív korrekciós tétel önmagában leírja. Bevezetése előtt teszt-fiókos ellenőrzés kell. | nincs kiírva a `buildInvoiceXml()`-ben (`invoice.ts`). Validálás: **T2** |
| B9 | AJÁNLOTT | **megfelel** — a helyesbítő külső kulcsa eltér az eredetiétől és bizonylatonként egyedi: `${orderNumber}-HELYESBITO-<refund-sorszám>`; csak a kiállító kérésben megy el. | `correctiveKulsoAzon()`, `CORRECTIVE_KULSO_AZON_INFIX` (`corrective.ts`) |

---

## C) Stornó, PDF-lekérés, e-számla, értesítő

| Az. | Szint | Státusz | Hol a kódban |
|---|---|---|---|
| C1 | KÖTELEZŐ | **megfelel** — dedikált stornó-művelet: `action-szamla_agent_st` mezőnév, `xmlszamlast` gyökér a saját namespace-szel és XSD-hivatkozással; blokk-sorrend `beallitasok → fejlec → elado → vevo`. | `buildStornoXml()`, `postStornoXml()` (`src/lib/szamlazz/storno.ts`) |
| C2 | KÖTELEZŐ | **megfelel** — stornó `beallitasok`: `szamlaagentkulcs`, `eszamla=true`, `szamlaLetoltes=false`, `valaszVerzio=2`, `szamlaKulsoAzon` a hivatalos sorrendben; az elavult `szamlaLetoltesPld` nincs. Az `eszamla=true` egyezik az eredeti számla típusával (a kiállítás is e-számla). | `buildStornoXml()` (`storno.ts`) |
| C3 | KÖTELEZŐ | **megfelel** — `<szamlaszam>` = az eredeti számla száma (`order.invoiceNumber`), `<megjegyzes>` = a sztornózás oka (a refund indoka), `<tipus>SS</tipus>`; a `vevo.email` a stornó-értesítőhöz megy. | `buildStornoXml()` + `buyerEmailFromOrder()` (`storno.ts`) |
| C4 | KÖTELEZŐ | **megfelel** — a v2-válasz ugyanazon az értelmezőn fut, és a kapott **stornó-számlaszám** a rendelésre kerül. | `postStornoXml()` → `parseAgentResponse()`; `stornoNumber` mező (`ecommerce.ts`), írás: `order-state.ts` |
| C5 | KÖTELEZŐ | **megfelel** — az ismételt stornó ellen **saját, alkalmazás-szintű** védelem véd (nem a szerver hibakódja): rögzített `stornoNumber` vagy `stornoStatus='storned'` → `already-storned` no-op, hálózati hívás nélkül; plusz a retry előtti lekérdezés a `-STORNO` kulcsra. | `issueStornoForOrder()` (`storno.ts`). Validálás: **T1** |
| C6 | KÖTELEZŐ | **ebben a körben javítva** — a stornó-XML-ből **kikerült a `keltDatum` és a `teljesitesDatum`**. A mezők opcionálisak; kihagyva a Számlázz.hu tölti ki őket, a teljesítést garantáltan az eredetivel egyezően (a szabály: a stornón azonos teljesítési dátum kell). Saját, esetleg eltérő dátum küldése csak kockázat volt. | `buildStornoXml()` (`storno.ts`) — a `BuildStornoXmlInput`-ból az `issueDate` mező is megszűnt |
| C7 | KÖTELEZŐ | **ebben a körben javítva (új fájl)** — `xmlszamlapdf` lekérdezés `action-szamla_agent_pdf` mezőnévvel, az **élő XSD** sorrendjében (`szamlaagentkulcs → valaszVerzio → szamlaKulsoAzon`; a `szamlaszam`/`rendelesSzam` kihagyásával a docs-beli régebbi XSD-változattal is kompatibilis). A **7-es hibakód nem hiba**, hanem „nincs ilyen bizonylat" (`null`). A `<pdf>` base64 tartalmát nem tároljuk — a lekérdezés célja a bizonylat létének és számának megállapítása. | `src/lib/szamlazz/pdf.ts` → `buildInvoiceLookupXml()`, `queryInvoiceByKulsoAzon()`, `SZAMLAZZ_NOT_FOUND_CODE` |
| C8 | KÖTELEZŐ | **megfelel** — `<eszamla>true</eszamla>` a kiállításnál és a stornónál is; az 54-es (nincs engedélyezve) és 55-ös (aláírás/időbélyeg) kód végleges hibaként áll meg, nem generál újrapróbálást. | `buildInvoiceXml()`, `buildStornoXml()`; osztályozás: `agentErrorFromCodes()` (`client.ts`). **Fiók-oldali előfeltétel:** checklist 5. |
| C9 | KÖTELEZŐ | **megfelel** — `<sendEmail>` értéke a vevő e-mail-címének meglétéből számolódik; cím nélkül nincs kiküldés. Az `elado.emailReplyto` / `emailTargy` / `emailSzoveg` üresen megy (a fiók alapértelmezései érvényesek). Stornónál a `vevo.email` szintén kimegy. | `buildInvoiceXml()` (`invoice.ts`), `buildStornoXml()` (`storno.ts`) |
| C10 | KÖTELEZŐ | **megfelel** — a `<vevoifiokurl>` opcionálisként van kezelve: ha jön, **allowlisten** (kizárólag `https` + `szamlazz.hu` vagy aldomainje) átengedve kerül a rendelés `invoicePdfUrl` mezőjébe; ha nem jön vagy nem megbízható, a rendelés link nélkül marad (nem hiba), és figyelmeztetés kerül a naplóba — a teljes URL naplózása nélkül. | `parseAgentResponse()` (`client.ts`), `isTrustedInvoicePdfUrl()` + `safeUrlHost()` (`invoice.ts`) |

---

## D) ÁFA-esetek, fiók-oldali beállítások, teszt-mód, korlátok

| Az. | Szint | Státusz | Hol a kódban |
|---|---|---|---|
| D1 | KÖTELEZŐ | **ebben a körben javítva** — az áfakulcs beállíthatóvá vált a `SZAMLAZZ_AFAKULCS` env-változóval, szűkített unionnal (`'27' \| 'AAM'`), `any` nélkül. Ismeretlen érték **hangosan dob** (egy elgépelt kulcs minden számlát elrontana), nem esik csendben az alapértelmezésre. | `SzamlazzVatMode` (`src/lib/szamlazz/types.ts`), `getSzamlazzConfig()` (`client.ts`) |
| D2 | KÖTELEZŐ | **ebben a körben javítva** — AAM módban a kód az `'AAM'` **stringet** küldi `afakulcs`-ként (sosem `0`-t vagy `TAM`-ot), `afaErtek = 0` és `bruttoErtek = nettoErtek` mellett — így az A9 tétel-validáció is átmegy. | `computeLineAmounts()` (`vatMode === 'AAM'` ág) és `<afakulcs>${vatMode}</afakulcs>` a `buildInvoiceXml()`-ben (`invoice.ts`) |
| D3 | TISZTÁZANDÓ | **fiók-oldali teendő** — külön „alanyi adómentes" záradékszöveget nem küldünk (a hivatalos forrás sem követeli meg); a jelölést vélhetően a rendszer teszi rá a kulcs alapján. Ellenőrzés a teszt-fiókos próbaszámla PDF-jén. | nincs kód-ág. Validálás: **T5** |
| D4 | AJÁNLOTT | **n.a.** — a kosárban nincs kedvezmény-tétel (fix bruttó kurzusárak), ezért dedikált kedvezménysort nem építünk. A negatív tételsor mechanizmusát a helyesbítő számla használja (B3). | — |
| D5 | AJÁNLOTT | **megfelel** — az `eusAfa` mező nincs a kérésben (magyar adószám, belföldi HUF-számlázás). | `buildInvoiceXml()` (`invoice.ts`) — a mező nincs kiírva |
| D6 | KÖTELEZŐ | **megfelel (kód) + fiók-oldali teendő** — a `szamlaszamElotag` a `SZAMLAZZ_INVOICE_PREFIX` env-változóból jön, alapértelmezése `KIN`. Az előtagot a fiókban **fel kell venni**, különben 202-es hiba (végleges, nem retryable). | `SZAMLAZZ_DEFAULT_INVOICE_PREFIX`, `getSzamlazzConfig()` (`client.ts`); `buildInvoiceXml()`. **Fiók-oldali:** checklist 4. |
| D7 | KÖTELEZŐ | **fiók-oldali teendő** — kérés-szintű tesztflag nincs, és a kód sem tartalmaz ilyet: a teszt-mód a fiók szintjén él. Fejlesztéshez dedikált teszt-fiók kell. | nincs kód-ág (az `SZAMLAZZ_API_URL` átirányítható, de az nem teszt-mód). **Fiók-oldali:** checklist 1. |
| D8 | TISZTÁZANDÓ | **n.a. a kódban / üzemeltetési korlát** — a teszt-környezeti volumenkorlátról két hivatalos oldal ellentmond (100/óra vs. 500/10 perc). Kódbeli rate-limitünk nincs; a mi terhelésünk (rendelésenként 1–3 bizonylat) messze a szigorúbb határ alatt van, tesztfuttatásnál viszont figyelendő. | — . Validálás: **T6** |
| D9 | KÖTELEZŐ | **fiók-oldali teendő** — a NAV Online Számla adatszolgáltatás az összekötés után automatikus, az Agent-kérésben semmit nem kell hozzá küldeni (a kód sem küld). Előfeltétel: NAV technikai felhasználó + kulcsok a Számlázz.hu-fiókban. | nincs kód-ág. **Fiók-oldali:** checklist 6. |
| D10 | AJÁNLOTT | **fiók-oldali teendő** — a Számla Agent külön díjazású, és csak a csomagban elérhető funkciókat adja (ingyenes csomagban pl. e-számla sem → 54-es hiba). Csomag-ellenőrzés élesítés előtt. | nincs kód-ág. **Fiók-oldali:** checklist 5. |

---

## Teszt-fiókos validálási lista

A követelmény-kutatás 15 bizonytalansági tétele közül az alábbiak érintik közvetlenül a
kódunkat. Mindegyik **teszt-fiókban** futtatandó (D7), éles fiókban tilos.

| # | Mit validál | Teszt-forgatókönyv |
|---|---|---|
| **T1** | Ismételt stornó viselkedése (nincs dokumentált hibakód) — a C5 saját idempotenciáját erre nem szabad alapozni | Állíts ki egy számlát, stornózd, majd küldd be **ugyanazt** a stornó-kérést újra (ugyanazzal a `szamlaKulsoAzon`-nal). Jegyezd fel, milyen `hibakod`/`hibauzenet` jön (vagy hogy a rendszer a meglévő stornót adja-e vissza). Ha új, eddig ismeretlen kód jön, vedd fel a `client.ts` osztályozásába. |
| **T2** | `fizetendoKorrekcio` szemantikája (B8 — jelenleg nem küldjük) | Állíts ki egy számlát, majd két helyesbítőt: egyet a mezővel, egyet nélküle, azonos negatív tétellel. Hasonlítsd össze a két PDF „fizetendő" sorát és a `kintlevoseg` értékét — csak akkor vezessük be, ha bizonyítottan a részleges visszatérítés fizetendő-korrekcióját írja le. |
| **T3** | Negatív tétel előjel-kombinációja helyesbítőn (B3) | Küldj be egy helyesbítőt a jelenlegi kombinációval (`mennyiseg = 1`, negatív `nettoEgysegar` és negatív érték-mezők). Ha az Agent 259–264 kóddal elutasítja, próbáld a másik hivatalos mintát (`mennyiseg = -1`, pozitív `nettoEgysegar`, negatív értékek), és igazítsd a `computeLineAmounts()`-ot. |
| **T4** | Láncolt helyesbítés hivatkozása (B6) | Egy számlához állíts ki két egymást követő helyesbítőt, mindkettőben az **eredeti** számlaszámmal a `helyesbitettSzamlaszam`-ban. Ellenőrizd, hogy a második is átmegy-e, és hogy a PDF-eken a hivatkozás az eredetire mutat-e. Ha a rendszer az előző helyesbítőre való hivatkozást várja, a `corrective.ts` `originalInvoiceNumber` forrását kell átállítani. |
| **T5** | AAM-záradék megjelenése a PDF-en (D3) | `SZAMLAZZ_AFAKULCS=AAM` mellett állíts ki egy próbaszámlát, és nézd meg a PDF-en, megjelenik-e automatikusan az alanyi adómentességre utaló jelölés. Ha nem, a szöveget a fejléc `megjegyzes` mezőjébe kell tenni (`buildInvoiceXml`). |
| **T6** | Teszt-volumenlimit (D8 — 100/óra vs. 500/10 perc) | Egy tesztfuttatás során számold a kiállított bizonylatokat, és figyeld, jön-e limit-jelzés a 100. bizonylat körül. Konzervatívan a szigorúbb 100/óra tartandó; az e2e-forgatókönyveket eszerint kell ütemezni. |
| **T7** | Rendelésszám-ismétlés tiltása + 71/152 (a kutatás 2. bizonytalansága) — **ez az A12 idempotencia alapja** | A fiókbeállítás bekapcsolása UTÁN küldd be kétszer ugyanazt a számlakérést (azonos vevőnév, bruttó, dátumok). Elvárás: a második hívás a korábbi számlát adja vissza (2 napos ablakon belül), eltérő adatnál pedig 71/152. Ellenőrizd, hogy a `duplicate` ág + a `szamlaKulsoAzon`-lekérdezés valóban átveszi-e a meglévő számlaszámot. |
| **T8** | Hibakód-besorolás átmeneti/végleges volta (a kutatás 1. bizonytalansága) | A tesztkör során előforduló minden nem-nulla `hibakod`-ot naplózz ki (kód + üzenet + jöhet-e utána sikeres ismétlés). A `SZAMLAZZ_RETRYABLE_AGENT_CODES` jelenleg **csak** az `1`-est tartalmazza — ha a gyakorlat mást mutat, itt kell bővíteni. |

---

## Fiók-oldali előfeltételek (üzemeltetői checklist)

Sorrendben elvégzendő. A kódot ezek egyike sem érinti — a `docs/szamlazz-storno.md`
„Élesítéshez szükséges" pontjait egészítik ki.

1. **Teszt-fiók létrehozása fejlesztéshez.** Éles fiókban tesztelni tilos (Agent-díj, az
   automatikus számlázás leállhat). Feltétel: a fiókkal még nem számláztak és nincs
   NAV-összekötés; ugyanazzal az adószámmal is regisztrálható. A teszt-fiókban a számlák
   nem számviteli bizonylatok, nem mennek a NAV-hoz, és az értesítő e-mail **mindig a fiók
   kapcsolattartási címére** megy (nem az XML-ben megadott vevő-címre).
2. **Agent-kulcs generálása** (vezérlőpult → Számla Agent kulcsok), és beállítása
   `SZAMLAZZ_AGENT_KEY` környezeti változóként. **A kulcsot kisbetűs alakban add meg** —
   nagybetűvel a hitelesítés elbukhat, és a kód nem alakítja át. A kulcs nem jár le
   (kézi törlésig), fiókonként max. 17 lehet.
3. **Rendelésszám-ismétlés tiltásának BEKAPCSOLÁSA** (bizonylattípusonként).
   **Ez a hivatalos idempotencia-védelem alapja:** bekapcsolva az azonos, ismételt kérésre
   2 napon belül a korábban kiállított számla jön vissza, eltérő adatnál pedig 71/152-es
   kód — amit a kód duplikátum-találatként old fel. Kikapcsolva ez a védelem nem él, és
   csak a saját, alkalmazás-oldali no-opokra támaszkodhatunk.
4. **A `KIN` előtag felvétele** (Beállítások → Előtagok). Ismeretlen előtag → 202-es hiba,
   ami végleges (nem retryable), tehát a számla nem áll ki. Az előtag max. 5 karakter,
   ékezet nélküli nagybetű/szám, és csak addig módosítható, amíg nem készült vele számla.
   Ha más előtagot használunk, a `SZAMLAZZ_INVOICE_PREFIX` állítandó át.
5. **E-számla engedélyezése + csomag-ellenőrzés.** A kód mindenhol `eszamla=true`-t küld;
   ha a fiókban/csomagban az e-számla nincs engedélyezve, minden kiállítás **54-es hibával**
   bukik (tanúsítvány/időbélyeg-hiba esetén 55-össel). Agentből csak az a funkció érhető el,
   amit a csomag manuálisan is biztosít.
6. **NAV Online Számla technikai felhasználó bekötése** (a NAV-rendszerben létrehozva,
   a kulcsok a Számlázz.hu-fiókban rögzítve). Utána az adatszolgáltatás automatikus.
   Teszt-fióknál ez a kapcsolat nem hozható létre — csak az éles fiókon értelmezhető.
7. **Vevői fiók be/ki döntés.** Bekapcsolva a válasz `vevoifiokurl`-t is ad, amit a kód
   allowlist után a rendelés `invoicePdfUrl` mezőjébe ment, és a vásárló fiók-oldalán
   kattintható linkként jelenít meg. **Kikapcsolva ez a link nem jön** — a számla-PDF
   ilyenkor csatolmányként megy ki az értesítő e-maillel, a fiók-oldalon viszont nem lesz
   számlalink. A kód egyik esetben sem hibázik.
8. **`SZAMLAZZ_AFAKULCS` beállítása a cég adózási státusza szerint** — `27` (általános)
   vagy `AAM` (alanyi adómentes). **KÖNYVELŐVEL egyeztetendő!** Alanyi adómentes eladóként
   belföldön kizárólag az `AAM` kulcs jogszerű (a 0% és a TAM nem). Rossz érték esetén
   minden számla hibás áfakulccsal állna ki. Ismeretlen érték indulásnál hangos hibát ad.
   *Maintainer-teendő:* a `.env.example` jelenleg a `SZAMLAZZ_AGENT_KEY`,
   `SZAMLAZZ_INVOICE_PREFIX`, `SZAMLAZZ_API_URL`, `SZAMLAZZ_TIMEOUT_MS` kulcsokat sorolja
   — a `SZAMLAZZ_AFAKULCS` kulcsnevet (érték nélkül) fel kell venni mellé.

---

## Üzemeltetési jegyzet

### Max. 5 beküldés — hol látszik, mi a teendő

A Számlázz.hu hivatalos szabálya szerint ugyanaz a kérés legfeljebb ötször küldhető be;
utána emberi beavatkozás kell, mert az automatikus retry-loop **kitiltáshoz** vezethet.
A számlálók a **rendelésen perzisztensek**, tehát a Payload job-retry (`retries: 3`) és az
order-poll resweep együttese sem lépheti túl a plafont.

| Ág | Konstans | Számláló-mező | Utolsó hiba |
|---|---|---|---|
| Számlakiállítás | `MAX_INVOICE_ATTEMPTS` (`invoice.ts`) | `invoiceAttempts` | `invoiceLastError` |
| Stornó | `MAX_STORNO_ATTEMPTS` (`storno.ts`) | `stornoAttempts` | `stornoLastError` |
| Helyesbítő | `MAX_CORRECTIVE_ATTEMPTS` (`corrective.ts`) | `correctiveInvoiceAttempts` | `correctiveInvoiceLastError` |

**Kimerüléskor** a szolgáltatás hálózati hívás **nélkül** `failed` kimenetet ad, a státuszt
`failed`-re állítja, az okot a `*LastError` mezőbe írja, és `RIASZTÁS:` előtagú, error-szintű
bejegyzést naplóz. Ilyenkor a bizonylatot kézzel kell rendezni a Számlázz.hu-felületen,
majd a számot a rendelésre visszavezetni.

**Az adminban:** Webshop → Rendelések, a rendelés szerkesztőjében a *Számla állapota*,
*Számla-kísérletek száma*, *Számlázás utolsó hibája*, illetve a stornó/helyesbítő
megfelelői. Mindegyik **readOnly** — kizárólag a rendszer írja őket
(`writeOrderInvoicingState`, `overrideAccess: true`). A bizonylatszám-mezők
(`invoiceNumber`, `stornoNumber`, `correctiveInvoiceNumber`) mezőszintű olvasása
owner-only.

### Titokkezelés és naplózás

- Az agent-kulcs **kizárólag** a kérés XML-törzsében utazik — sosem URL-ben, sosem
  query-stringben.
- A logger redact-listáján (`src/lib/logger.ts`) a `szamlaagentkulcs`, `agentkey`,
  `agent_key`, `apikey` és az `email` kulcsnév is rajta van; az így nevezett mezők értéke
  `[REDACTED]`-ként jelenik meg.
- **Kérés- és válasz-body sosem kerül naplóba** — sem a számla-XML (vevő-személyes adatot
  hordoz), sem a válasz. Naplóba a művelet neve, az időtartam, a bizonylatszám, a
  hibakódok és a hiba szövege megy, request ID-vel.
- A `vevoifiokurl` teljes URL-je sem naplózódik (query-stringben tokent hordozhat) — hiba
  esetén csak a hoszt (`safeUrlHost()`).

### Környezeti változók (kulcsnevek, értékek NÉLKÜL)

| Kulcs | Szerep |
|---|---|
| `SZAMLAZZ_AGENT_KEY` | Számla Agent kulcs. **Titok.** Hiánya nem hiba: az integráció ilyenkor kikapcsolt (`enabled=false`), a fizetési lánc változatlanul működik. |
| `SZAMLAZZ_API_URL` | Agent-végpont felülírása (default: a hivatalos, **záró perjeles** cím). Nem https vagy érvénytelen URL esetén indulásnál hangos hiba. |
| `SZAMLAZZ_INVOICE_PREFIX` | Számlaszám-előtag (default: `KIN`) — a fiókban felvett előtagok egyike kell legyen. |
| `SZAMLAZZ_AFAKULCS` | Áfakulcs: `27` vagy `AAM`. Más érték indulásnál hangos hibát ad. |
| `SZAMLAZZ_TIMEOUT_MS` | Kérés-timeout ezredmásodpercben (default: 15 000). |

Feloldásuk egy helyen: `getSzamlazzConfig()` (`src/lib/szamlazz/client.ts`) — tiszta
függvény, env-paraméterrel tesztelhető.
