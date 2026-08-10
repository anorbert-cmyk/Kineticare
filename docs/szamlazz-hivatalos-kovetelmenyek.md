# Számlázz.hu Számla Agent — hivatalos követelmény-dokumentum (szintézis)

**Projekt:** Kineticare — Barion-fizetés utáni automatikus számlázás (kiállítás, helyesbítő, stornó, PDF)
**Készült:** 2026-08-09, 4 kutatói jelentés szintéziseként, kizárólag hivatalos szamlazz.hu forrásokból (docs.szamlazz.hu, tudastar.szamlazz.hu, szamlazz.hu blog, élő XSD-k).
**Szintek:** KÖTELEZŐ = hivatalosan előírt vagy a működéshez elengedhetetlen · AJÁNLOTT = hivatalos jó gyakorlat · TISZTÁZANDÓ = hivatalos forrásból nem (teljesen) megerősített, teszt-fiókban ellenőrizendő.

---

## A) Agent-alapok (transzport, hitelesítés, séma, válasz, hibakezelés)

### A1. Végpont és kérésformátum — KÖTELEZŐ
- **Szabály:** Minden művelet HTTPS POST a `https://www.szamlazz.hu/szamla/` címre, `multipart/form-data` formában; az XML-t **fájlmellékletként** kell csatolni.
- **Részletek:** A funkciót a multipart **fájlmező neve** választja ki:
  - számlakiállítás (és helyesbítő is): `action-xmlagentxmlfile`
  - stornó: `action-szamla_agent_st`
  - jóváírás: `action-szamla_agent_kifiz`
  - PDF-lekérés: `action-szamla_agent_pdf`
  - számla-XML lekérés: `action-szamla_agent_xml`
  - díjbekérő törlés: `action-szamla_agent_dijbekero_torlese`
  - nyugta: `action-szamla_agent_nyugta_create/_storno/_get/_send`
  - adózó-lekérdezés: `action-szamla_agent_taxpayer`
  Ha az XML nem fájlfeltöltésként érkezik → **53-as hiba** („Hiányzó XML fájl"). Egy XML fájl = egy számla. E-mail-csatolmányok: `attachfile1…attachfile5`, fájlonként max. 2 MB.
- **Forrás:** https://docs.szamlazz.hu/agent/basics/send-xml , https://docs.szamlazz.hu/agent/generating_invoice/request

### A2. Hitelesítés Agent-kulccsal — KÖTELEZŐ
- **Szabály:** Hitelesítés a `beallitasok` blokk `<szamlaagentkulcs>` elemével (preferált); alternatíva a régi `<felhasznalo>`/`<jelszo>` páros (dedikált, csak-számlázás jogú, pontosan egy fiókhoz férő userrel).
- **Részletek:** A kulcsot a fiók tulajdonosa/adminja generálja a vezérlőpult „Számla Agent kulcsok" szekciójában. Nem jár le (kézi törlésig érvényes), fiókonként max. 17 kulcs, nincs per-kulcs jogosultság-szűkítés. A kulcs **kisbetűs** formában fogadott — nagybetűvel a hitelesítés elbukhat. A kulcs titok: repóba, logba nem kerülhet (összhangban a CLAUDE.md 1. tilos zónájával — `.env`-ben tartandó, a logger redact-listájára felveendő).
- **Forrás:** https://docs.szamlazz.hu/agent/basics/authentication

### A3. `xmlszamla` gyökér — kötött blokk-sorrend — KÖTELEZŐ
- **Szabály:** A blokkok sorrendje kötött, nem cserélhető fel: `beallitasok`(1) → `fejlec`(1) → `elado`(1) → `vevo`(1) → `fuvarlevel`(0) → `tetelek`(1). (Zárójelben a minOccurs.)
- **Részletek:** Namespace: `xmlns="http://www.szamlazz.hu/xmlszamla"`; hivatalos XSD: `https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd`. A doksi a beküldés előtti XSD-validálást ajánlja.
- **Forrás:** https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd

### A4. `beallitasok` blokk mezői és sorrendje — KÖTELEZŐ
- **Szabály:** Sorrend: `felhasznalo`(0), `jelszo`(0), `szamlaagentkulcs`(0), `eszamla`(**1**, boolean), `szamlaLetoltes`(**1**, boolean), `szamlaLetoltesPld`(0), `valaszVerzio`(0, int), `aggregator`(0), `guardian`(0), `cikkazoninvoice`(0), `szamlaKulsoAzon`(0).
- **Részletek:** Kötelező az `eszamla` (e-számla-e) és a `szamlaLetoltes` (kérjük-e a PDF-et a válaszban). A `szamlaKulsoAzon` a **beallitasok**-ban van, NEM a fejlécben. A `szamlaLetoltesPld` hivatalosan ELAVULT („rendszerünk már figyelmen kívül hagyja") — új kliensben kihagyandó.
- **Forrás:** https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd

### A5. `valaszVerzio=2` használata és a válasz feldolgozása — KÖTELEZŐ
- **Szabály:** `valaszVerzio=1` (vagy hiányzik): szöveges (`xmlagentresponse=DONE;…`) vagy nyers PDF válasz, hiba `[ERR]`-prefixszel. `valaszVerzio=2`: a válasz **mindig XML** (`<xmlszamlavalasz>`). A mi kliensünk kötelezően 2-t küld.
- **Részletek:** v2 siker: `<sikeres>true</sikeres>`, `<szamlaszam>`, `<szamlanetto>` (double), `<szamlabrutto>` (double), `<kintlevoseg>` (double), `<vevoifiokurl>` (opcionális), `<pdf type="base64Binary">` (ha `szamlaLetoltes=true`). Hiba: `<sikeres>false</sikeres>`, `<hibakod>`, `<hibauzenet>`.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/response

### A6. Válasz HTTP-fejlécek (`szlahu_*`) figyelése — AJÁNLOTT
- **Szabály:** A válasz HTTP-fejléceiben is megjelennek az adatok; hibadiagnosztikához a `szlahu_error_code` és `szlahu_error` fejléc is naplózandó.
- **Részletek:** `szlahu_szamlaszam` (URL-kódolt), `szlahu_nettovegosszeg`, `szlahu_bruttovegosszeg`, `szlahu_error` (URL-kódolt), `szlahu_error_code`, `szlahu_fizetesmod`, `szlahu_vevoifiokurl`. Hiba esetén a számla-/összegfejlécek hiányoznak. v2-nél elég az XML-t feldolgozni, a fejléc kiegészítő diagnosztika.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/response

### A7. `fejlec` kötelező mezői és teljes sorrendje — KÖTELEZŐ
- **Szabály:** Kötelező: `teljesitesDatum`(1), `fizetesiHataridoDatum`(1), `fizmod`(1), `penznem`(1), `szamlaNyelve`(1); a `keltDatum` opcionális (0).
- **Részletek:** Teljes fejléc-sorrend (kötött): `keltDatum`, `teljesitesDatum`, `fizetesiHataridoDatum`, `fizmod`, `penznem`, `szamlaNyelve`, `megjegyzes`, `arfolyamBank`, `arfolyam`, `rendelesSzam`, `dijbekeroSzamlaszam`, `elolegszamla`, `vegszamla`, `helyesbitoszamla`, `helyesbitettSzamlaszam`, `dijbekero`, `szallitolevel`, `logoExtra`, `szamlaszamElotag`, `fizetendoKorrekcio`, `fizetve`, `arresAfa`, `eusAfa`, `szamlaSablon`, `elonezetpdf`. Devizás (nem HUF/Ft) számlánál `arfolyam` + `arfolyamBank` kötelező.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/xml , https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd

### A8. `vevo` és `elado` blokk — KÖTELEZŐ
- **Szabály:** `vevo` kötelező mezői: `nev`(1), `irsz`(1), `telepules`(1), `cim`(1). Az `elado` blokk minden mezője opcionális (az eladó adatai a fiókból jönnek).
- **Részletek:** `vevo` opcionális: `orszag`, `email`, `sendEmail`, `adoalany`, `adoszam`, `adoszamEU`, `postazasi*`, `vevoFokonyv`, `azonosito`, `alairoNeve`, `telefonszam`, `megjegyzes`. `elado` opcionális: `bank`, `bankszamlaszam`, `emailReplyto`, `emailTargy`, `emailSzoveg`, `alairoNeve`. Figyelmeztetés: a vevő `azonosito` mezőjében nem szabad más vevőhöz már regisztrált azonosítót küldeni.
- **Forrás:** https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd , https://docs.szamlazz.hu/agent/generating_invoice/xml

### A9. `tetel` elem-sorrend és a „Számlázz.hu nem számol" szabály — KÖTELEZŐ
- **Szabály:** Tétel-sorrend: `megnevezes`(1), `azonosito`(0), `mennyiseg`(1), `mennyisegiEgyseg`(1), `nettoEgysegar`(1), `afakulcs`(1), `arresAfaAlap`(0), `nettoErtek`(1), `afaErtek`(1), `bruttoErtek`(1), `megjegyzes`(0), `tetelFokonyv`(0). **Minden összeget explicit meg kell adni — a Számlázz.hu semmit nem számol ki.**
- **Részletek:** Tételenként ellenőrzött egyenletek: `nettoEgysegar × mennyiseg = nettoErtek`; `nettoErtek × afakulcs/100 = afaErtek`; `nettoErtek + afaErtek = bruttoErtek`. Eltérés → 259–264 hibakód (a válasz megjelöli a hibás sort). Bruttóból visszafelé számolásnál a kerekítést úgy kell végezni, hogy az egyenletek fillérre kijöjjenek.
- **Forrás:** https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd , https://docs.szamlazz.hu/agent/generating_invoice/important-information

### A10. `fizmod` — szabad string, normalizált értékkészlettel — AJÁNLOTT
- **Szabály:** A `fizmod` tetszőleges string (nincs XSD-enum); a rendszer belül `fizmodunified` értékre normalizálja.
- **Részletek:** Normalizált értékek: bank transfer, cash, credit card, check, cash on delivery, gift voucher, **Barion**, barter, group collection, OTP Simple, compensation, coupon, PayPal, PayU, SZÉP card, voucher, other. Ami nem illeszthető → „other". Barion-kártyás fizetésünkhöz a `Bankkártya` vagy `Barion` string ajánlott a jó normalizálódásért.
- **Forrás:** https://docs.szamlazz.hu/penzugyi-adatkapcsolat/kimeno-szamlak

### A11. `penznem` és `szamlaNyelve` értékkészlet — KÖTELEZŐ
- **Szabály:** `penznem`: alapértelmezés HUF (vagy Ft); továbbá EUR, CHF, USD, AED, ALL, AUD, BAM, BGN, BRL, CAD, CNY, CZK, DKK, EEK, GBP, HKD, HRK, IDR, ILS, INR, ISK, JPY, KRW, KWD, KSH, KZT, LTL, LVL, MXN, MYR, NOK, NZD, PHP, PLN, RON, RSD, RUB, SEK, SGD, THB, TRY, TWD, UAH, VND, ZAR. `szamlaNyelve` (XSD-enum): hu, en, de, it, ro, sk, hr, fr, es, cz, pl, bg, nl, ru, si.
- **Részletek:** Mi HUF + hu kombinációt használunk → `arfolyam`/`arfolyamBank` nem kell. A `szamlaNyelve` az egyetlen fejléc-mező, amelyre az XSD tényleges enumerációt tartalmaz.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/currencies , https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd

### A12. `szamlaKulsoAzon` szemantika + idempotencia-stratégia — KÖTELEZŐ
- **Szabály:** A `szamlaKulsoAzon` a külső rendszer kulcsa, amellyel a számla **később lekérdezhető** — a számla CSAK akkor kap külső azonosítót, ha a mezőt már a **kiállító** kérésben elküldjük (utólag nem pótolható). A docs NEM ír `szamlaKulsoAzon`-alapú duplikátum-elutasításról — a duplikátum-védelmet a `rendelesSzam` adja.
- **Részletek:** Fiókbeállításban bekapcsolható a rendelésszám-ismétlés tiltása (bizonylattípusonként). Bekapcsolva: **azonos** ismételt kérésre (egyező vevőnév, bruttó végösszeg, minden dátum) **2 napon belül** az API hibajelzés helyett a korábban kiállított számlát adja vissza — ez a hivatalos idempotencia-mechanizmus. Eltérő adat vagy 2 napnál régebbi számla esetén 71/152 hibakód („Már létező rendelésszám"). Ajánlott minta: `rendelesSzam = orderNumber` (duplikátum-tiltás bekapcsolva) + `szamlaKulsoAzon = orderNumber` a visszakereséshez; kétes esetben (timeout) kiállítás megismétlése ELŐTT lekérdezés `szamlaKulsoAzon` alapján. A 71/152 hibát a kliens idempotencia-találatként (nem hibaként) kezelje.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/xml , https://docs.szamlazz.hu/agent/generating_invoice/important-information

### A13. Hibakód-lista — KÖTELEZŐ
- **Szabály:** A kliens a hivatalos hibakódokat típus szerint kezelje; ismeretlen kódnál a `hibauzenet`/`szlahu_error` szöveget naplózza (request ID-vel).
- **Részletek:** 1 = rendszerkarbantartás (pár perc múlva újrapróbálható); 3 = sikertelen bejelentkezés; 7 = ismeretlen számlaszám/rendelésszám/külső azonosító (PDF-lekérésnél, lásd C7); 53 = hiányzó XML fájl (nem fájlmellékletként ment); 54 = e-számla készítés nincs engedélyezve; 55 = e-számla aláírás sikertelen (tanúsítvány/időbélyeg); 57 = XML beolvasási hiba; 71/152 = már létező rendelésszám; 135 = a felhasználó böngészőből is be van lépve; 136 = bejelentkezési hiba (lejárt előfizetés/függő díj); 164 = csak egyetlen fiókhoz hozzáférő user használhatja; 202 = nem regisztrált számlaszám-előtag; 259/262 = tétel nettó érték hibás; 260/263 = tétel áfa érték hibás; 261/264 = tétel bruttó érték hibás; 537 = max. 400 törlőkód/tétel; 538 = adattörlő kód demo/tesztfiókban nem használható; 539 = adattörlőkód-használat nincs bekapcsolva.
- **Forrás:** https://docs.szamlazz.hu/agent/basics/error-handling

### A14. Újrapróbálási szabály: max. 5 kísérlet, retry-loop tilos — KÖTELEZŐ
- **Szabály:** Ugyanaz a kérés legfeljebb **ötször** küldhető be; utána emberi beavatkozás kell. Automatikus végtelen újrapróbálás tilos — ismételt megsértése a szolgáltatásból való **kitiltáshoz** vezethet.
- **Részletek:** Explicit újrapróbálhatóként csak az 1-es (karbantartás) dokumentált. Jelentésük alapján végleges (javítás nélkül NE próbáld újra): 3, 135, 136, 164 (auth/fiók); 53, 57 (kérésformátum); 54, 55 (e-számla-beállítás); 71, 152 (duplikált rendelésszám — idempotencia-találatként kezelendő); 202 (előtag); 259–264 (összeg-számítás); 537–539 (törlőkód). Ez a besorolás következtetés, nem szó szerinti hivatalos állítás (lásd Bizonytalanságok).
- **Forrás:** https://docs.szamlazz.hu/agent/basics/error-handling

### A15. HTTP-kliens: session cookie-k kezelése — AJÁNLOTT
- **Szabály:** A küldő rendszernek kezelnie kell a szamlazz.hu session cookie-jait.
- **Részletek:** Node-kliensben cookie-jar, vagy legalább a kapott `Set-Cookie` visszaküldése ugyanabban a folyamatban.
- **Forrás:** https://docs.szamlazz.hu/agent/basics/details

### A16. Infrastruktúra: fix IP-k, Let's Encrypt tanúsítvány — AJÁNLOTT
- **Szabály:** Kimenő tűzfal-szabályhoz a szamlazz.hu fogadó IP-i: 18.153.1.171, 3.73.114.72, 52.59.28.5; a Számlázz.hu partnert a 3.73.214.98, 3.76.149.232, 18.153.156.51 címekről hív. Tanúsítvány: Let's Encrypt, 3 havonta megújul (ellenőrzés: certtest.szamlazz.hu).
- **Részletek:** Railway-n valószínűleg nem kell IP-szűrés; a Node TLS trust store legyen naprakész. Válasz-timeoutot és általános kérésméret-limitet a doksi nem közöl.
- **Forrás:** https://docs.szamlazz.hu/hu/agent/basics/details

---

## B) Helyesbítő számla

### B1. A helyesbítő a normál számla-felületen készül (xmlszamla), nem a stornó-actionnel — KÖTELEZŐ
- **Szabály:** Helyesbítőhöz a normál `xmlszamla` XML-t kell küldeni az `action-xmlagentxmlfile` mezőnévvel, a fejlécben a helyesbítő mezőkkel. A stornónak külön XML-típusa és mezőneve van (`xmlszamlast` / `action-szamla_agent_st`).
- **Részletek:** Az Agent „Generating invoice" felülete állítja ki az összes dokumentumtípust: invoice, reverse/storno, prepayment, final, **corrective**, pro forma, delivery note. A `valaszVerzio=2` és a PDF-válasz ugyanúgy működik.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/other

### B2. Helyesbítő fejléc-mezők: `helyesbitoszamla=true` + `helyesbitettSzamlaszam` — KÖTELEZŐ
- **Szabály:** A fejlécben `helyesbitoszamla` (boolean) = true ÉS `helyesbitettSzamlaszam` (string) = az eredeti (helyesbítendő) számla száma. Az XSD-ben mindkettő minOccurs=0, de helyesbítőhöz funkcionálisan mindkettő szükséges.
- **Részletek:** Fejléc-sorrendbeli helyük: … `dijbekeroSzamlaszam`, `elolegszamla`, `vegszamla`, **`helyesbitoszamla`**, **`helyesbitettSzamlaszam`**, `dijbekero` … (teljes sorrend: A7). A kimenő-számla adatkapcsolatban a helyesbítő típuskódja `HS`, a `hivszamlaszam` mező tartalmazza a szülőszámla számát.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/xml , https://docs.szamlazz.hu/penzugyi-adatkapcsolat/kimeno-szamlak

### B3. Tételszabály: a KÜLÖNBÖZET kerül a helyesbítőre, negatív előjellel — KÖTELEZŐ
- **Szabály:** Az eredeti és a helyesbítő számla **együtt érvényes** — együtt kell leírniuk a valós gazdasági eseményt. A helyesbítőre a különbözetet kell tételként felvinni: a levonandó rész negatív előjellel.
- **Részletek:** Két hivatalos minta: (1) mennyiség-helyesbítés: a visszaadott mennyiség negatív előjellel egyetlen tételként (pl. `-1 db` részleges visszatérítésnél); (2) áfakulcs-helyesbítés: a hibás tétel negatívan + új tétel a helyes kulccsal. Tétel-szintű hivatkozás az eredetire nincs és nem is kell — a kapcsolat a `helyesbitettSzamlaszam` fejlécmezőn él. Az A9 konzisztencia-egyenletek a negatív sorra is érvényesek: pl. `mennyiseg = -1`, `nettoEgysegar` pozitív, `nettoErtek`/`afaErtek`/`bruttoErtek` negatív, hogy a szorzat-egyenlőség teljesüljön. (Előjel-megkötést az Agent-doksi külön nem rögzít — tesztben validálandó, lásd Bizonytalanságok.)
- **Forrás:** https://tudastar.szamlazz.hu/gyik/helyesbito-szamla-kiallitasa , https://www.szamlazz.hu/blog/2026/07/hogyan-allits-ki-helyesbito-szamlat , https://docs.szamlazz.hu/agent/generating_invoice/xml

### B4. Dátumszabály helyesbítőnél — KÖTELEZŐ
- **Szabály:** A helyesbítő teljesítési dátumának **naptári hónapja nem térhet el** az eredeti számla teljesítési dátumának hónapjától; a bevett gyakorlat az eredeti teljesítési dátum megismétlése. A `keltDatum` a tényleges kiállítás napja.
- **Részletek:** NAV-tájékoztatáson alapuló szabály; a Számlázz.hu figyelmeztet (de nem tilt), ha a hónap eltér. Ha az eredetin nem volt külön teljesítési dátum, az eredeti kiállítási napja számít. (Stornónál szigorúbb: azonos teljesítési dátum KELL — lásd C6.)
- **Forrás:** https://www.szamlazz.hu/blog/2026/07/szamla-teljesitesi-datuma-mikor-melyik-datumot-kell-feltuntetni/

### B5. Stornó vs. helyesbítő döntési szabály — KÖTELEZŐ
- **Szabály:** **Stornó** = az ügylet meghiúsult, VAGY olyan adat hibás, ami helyesbítővel nem módosítható. **Helyesbítő** = az ügylet megtörtént, de a számla tartalma módosul (pl. részleges visszatérítés).
- **Részletek:** Helyesbítővel NEM módosítható: vevő adatai (név, cím, adószám), pénznem, pénzforgalmi elszámolás jellege, számlatípus (papír vs. e-számla) — ezekhez stornó + új számla kell. Kiállított számlát törölni sosem lehet, csak stornózni/helyesbíteni. A mi leképezésünk: teljes visszatérítés → stornó (`xmlszamlast`); részleges visszatérítés → helyesbítő.
- **Forrás:** https://www.szamlazz.hu/blog/2018/07/segitseg-elrontottam-a-szamlamat/ , https://tudastar.szamlazz.hu/gyik/szamla-sztornozasa , https://tudastar.szamlazz.hu/gyik/helyesbito-szamla-kiallitasa

### B6. Többszöri helyesbítés és állapotgép-következmény — KÖTELEZŐ
- **Szabály:** Egy eredeti számlához **több** helyesbítő is készülhet; DE a **már helyesbített számla NEM stornózható** — újabb korrekció csak újabb helyesbítővel lehetséges.
- **Részletek:** A `helyesbitettSzamlaszam` a doksi szerint „a helyesbített számla száma" — a bemutatott folyamat alapján az **eredetire** hivatkozás az irányadó (láncolt helyesbítésnél tesztben ellenőrizendő). Állapotgép-következmény: ha egy rendeléshez már ment ki helyesbítő, a teljes érvénytelenítés útja is további (mindent lenullázó) helyesbítő, nem stornó.
- **Forrás:** https://www.szamlazz.hu/blog/2026/07/hogyan-allits-ki-helyesbito-szamlat , https://tudastar.szamlazz.hu/gyik/helyesbito-szamla-kiallitasa

### B7. Sorszámozás és előtag — AJÁNLOTT
- **Szabály:** A helyesbítő önálló számlaszámot kap; a sorszámokat a Számlázz.hu automatikusan, hézagmentesen osztja ELŐTAG-ÉV-SORSZÁM formátumban (pl. ABC-2026-123); az előtag a fejléc `szamlaszamElotag` mezőjével választható.
- **Részletek:** Nincs hivatalos kijelentés arról, hogy a helyesbítő külön sorszám-folyamot kapna — a rendelkezésre álló forrás alapján a normál (adott előtagú) folyamban kap számot. A kiosztott számlaszámot az Agent-válasz adja vissza — ezt kell eltárolni.
- **Forrás:** https://tudastar.szamlazz.hu/gyik/szamlaszam-formatumok-mikor-kell-megadni , https://docs.szamlazz.hu/penzugyi-adatkapcsolat/kimeno-szamlak

### B8. `fizetendoKorrekcio` mező — TISZTÁZANDÓ
- **Szabály:** A fejléc `fizetendoKorrekcio` (double, opcionális) mezője a helyesbítő fizetendő összegének korrekciójához kapcsolódhat, de hivatalos leírása hiányos (a PHP-doksi `correctionToPay` néven listázza, magyarázat nélkül).
- **Részletek:** Mielőtt részleges visszatérítésnél támaszkodnánk rá, teszt-fiókban ellenőrizendő a viselkedése.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/xml , https://docs.szamlazz.hu/php/szamla-generalas

### B9. `szamlaKulsoAzon` helyesbítőnél: az orderNumber-től ELTÉRŐ, egyedi kulcs — AJÁNLOTT
- **Szabály:** Mivel egy rendeléshez több bizonylat tartozhat (eredeti + több helyesbítő), a sima orderNumber ütközne — bizonylatonként egyedi külső kulcs kell (pl. `orderNumber-HS1`, `-HS2`), és csak a kiállító hívásban elküldve rögzül (A12).
- **Részletek:** A konkrét séma a mi döntésünk; a doksi csak az egyedi külső kulcs mechanizmusát rögzíti.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/xml

---

## C) Stornó (xmlszamlast) + PDF-lekérés (xmlszamlapdf) + e-számla/értesítő

### C1. Stornó transzport és séma — KÖTELEZŐ
- **Szabály:** POST `https://www.szamlazz.hu/szamla/`, multipart, fájlmező: `action-szamla_agent_st`; tartalma `xmlszamlast` XML (namespace `http://www.szamlazz.hu/xmlszamlast`, XSD: `https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd`). Mezősorrend kötött.
- **Részletek:** Gyökér-szerkezet sorrendben: `beallitasok`(**1**) → `fejlec`(**1**) → `elado`(0) → `vevo`(0).
- **Forrás:** https://docs.szamlazz.hu/hu/agent/reversing_invoice/request , https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd

### C2. Stornó `beallitasok` blokk — KÖTELEZŐ
- **Szabály:** Sorrend: `felhasznalo`(0), `jelszo`(0), `szamlaagentkulcs`(0), `eszamla`(**1**, boolean), `szamlaLetoltes`(**1**, boolean), `szamlaLetoltesPld`(0, ELAVULT), `aggregator`(0), `guardian`(0), `valaszVerzio`(0, int), `szamlaKulsoAzon`(0).
- **Részletek:** `eszamla=true` → e-sztornószámla készül. Az `eszamla` mezőt az **eredeti számla típusának megfelelően** kell beállítani (e-számlát e-sztornóval kell sztornózni). Agent-kulcsos auth-nál a `felhasznalo`/`jelszo` elhagyható.
- **Forrás:** https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd , https://www.szamlazz.hu/szamla/tudastar/eszamla

### C3. Stornó `fejlec`: a `szamlaszam` az egyetlen kötelező mező — KÖTELEZŐ
- **Szabály:** `szamlaszam`(**1**) = a sztornózandó számla száma; opcionális: `keltDatum`, `teljesitesDatum`, `megjegyzes` (= sztornózás oka, megjelenik a bizonylaton), `tipus`, `szamlaSablon`.
- **Részletek:** A minta XML-ben `tipus=SS` (értékkészlete nem dokumentált explicit). `szamlaSablon` értékei: `SzlaMost` | `SzlaAlap` | `SzlaNoEnv` | `Szla8cm` | `SzlaTomb` | `SzlaFuvarlevelesAlap`. A sztornózandó számla opcionálisan a `beallitasok`-beli `szamlaKulsoAzon`-nal is hivatkozható, ha kiállításkor be volt állítva. Stornó `elado`/`vevo` (mind opcionális): `elado.emailReplyto/emailTargy/emailSzoveg` (értesítő e-mail testreszabása), `vevo.email/adoszam/adoszamEU` (adószám csak akkor, ha az eredetiről hiányzik).
- **Forrás:** https://docs.szamlazz.hu/hu/agent/reversing_invoice/xml , https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd

### C4. Stornó válasz (valaszVerzio=2) — KÖTELEZŐ
- **Szabály:** `xmlszamlavalasz`: `sikeres`(**1**, boolean), `hibakod`(0), `hibauzenet`(0), `szamlaszam`(0) = a **létrehozott sztornószámla** száma, `szamlanetto`(0), `szamlabrutto`(0), `kintlevoseg`(0), `vevoifiokurl`(0), `pdf`(0, base64Binary).
- **Részletek:** A sztornószámla számát el kell tárolni az orderhez. HTTP-fejlécek ugyanúgy jönnek (`szlahu_szamlaszam` = sztornószámla száma stb.). v1-nél: `xmlagentresponse=DONE;{számlaszám}` szöveg vagy nyers PDF; hiba `[ERR]…`.
- **Forrás:** https://docs.szamlazz.hu/hu/agent/reversing_invoice/response

### C5. Stornó nem sztornózható; saját idempotencia-védelem kell — KÖTELEZŐ
- **Szabály:** A sztornószámla nem javítható újabb stornóval vagy helyesbítővel; téves sztornó után új (helyreállító) számla kell az eredeti adatokkal (kelte = az új számla kiállításának napja, megjegyzésben az eredeti és a hibás sztornó sorszámával).
- **Részletek:** Az Agent-doksi **nem ad meg hibakódot** a „már sztornózott számla ismételt sztornója" esetre — a kliensben saját idempotencia-védelem kell: a sztornó-számlaszám eltárolása az orderhez, ismételt kérés tiltása alkalmazás-szinten; nem listázott hibakódú válasz általános hibaként kezelendő. Ha könyvelésbe került, könyvelővel egyeztetendő.
- **Forrás:** https://tudastar.szamlazz.hu/gyik/teves-sztornozo

### C6. Stornó dátumszabály — KÖTELEZŐ
- **Szabály:** A sztornó számlán **azonos teljesítési dátumot kell feltüntetni, mint az eredetin**. A sztornózás időben nincs korlátozva. Ha az eredeti számlát elküldtük a vevőnek, a sztornót is el kell küldeni.
- **Részletek:** A `teljesitesDatum` mező az Agent-kérésben opcionális — ha nem adjuk meg, a rendszer tölti ki; explicit megadásnál az eredetivel egyezőnek kell lennie.
- **Forrás:** https://tudastar.szamlazz.hu/gyik/szamla-sztornozasa

### C7. PDF-lekérés (xmlszamlapdf) — KÖTELEZŐ
- **Szabály:** POST multipart, fájlmező: `action-szamla_agent_pdf`, tartalma `xmlszamlapdf` XML (namespace `http://www.szamlazz.hu/xmlszamlapdf`). Élő XSD szerinti mezősorrend: `felhasznalo`(0), `jelszo`(0), `szamlaagentkulcs`(0), `szamlaszam`(0), `rendelesSzam`(0), `valaszVerzio`(**1**, int), `szamlaKulsoAzon`(0).
- **Részletek:** A `valaszVerzio` az egyetlen kötelező mező. Azonosításhoz a három kulcs (`szamlaszam`, `rendelesSzam`, `szamlaKulsoAzon`) közül legalább egy kell; azonos rendelésszámú bizonylatokból a **legutolsó** jön vissza; a `szamlaKulsoAzon` csak akkor használható, ha kiállításkor be volt állítva (nálunk ez a preferált kulcs). **KONFLIKTUS:** a docs-oldalba ágyazott XSD-változat eltér az élő XSD-től (ott `szamlaszam` kötelező és a `valaszVerzio` a `rendelesSzam` előtt áll) — az élő, schemaLocation-ben hivatkozott XSD a mérvadó; a `rendelesSzam` kihagyásával a `szamlaagentkulcs→szamlaszam→valaszVerzio→szamlaKulsoAzon` sorrend mindkettőnek megfelel. Ismeretlen azonosító esetén **7-es hibakód** („Hiányzó adat: számla xml…") — erre a „nem található" ágat fel kell készíteni (pl. race a kiállítás és a PDF-lekérés közt). Válasz: v1 → nyers bináris PDF / `[ERR]…`; v2 → `xmlszamlavalasz` a `<pdf>`-ben base64 PDF-fel.
- **Forrás:** https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd , https://docs.szamlazz.hu/hu/agent/querying_pdf/response

### C8. E-számla szemantika — KÖTELEZŐ
- **Szabály:** `eszamla=true` → minősített aláírással és időbélyeggel ellátott e-számla készül; `false` → papír alapú (PDF-ként kézbesített) számla.
- **Részletek:** E-számlához saját tanúsítvány vagy a KBOSS.hu Kft. tanúsítványának elfogadása (alapértelmezett) kell; ha nincs engedélyezve → 54-es hiba, tanúsítvány/időbélyeg-hiba → 55-ös. Az e-számla kizárólag elektronikusan érvényes (kinyomtatva NEM), elektronikusan őrzendő és kézbesítendő; nincs eredeti-másolat megkülönböztetés — PDF-lekérésre mindig az eredeti jön vissza.
- **Forrás:** https://www.szamlazz.hu/szamla/tudastar/eszamla , https://docs.szamlazz.hu/agent/querying_pdf/response

### C9. Számlaértesítő e-mail — KÖTELEZŐ
- **Szabály:** Ha a `vevo.email` meg van adva, a rendszer **alapértelmezés szerint** elküldi a számlaértesítőt erre a címre; letiltás: `<sendEmail>false</sendEmail>` (közvetlenül az `email` mező után). Ha nincs email, nincs küldés.
- **Részletek:** Több címzett vesszővel elválasztva. Testreszabás az `elado` blokkban: `emailReplyto`, `emailTargy`, `emailSzoveg` — sztornónál is elérhetők. Teszt-fiókban a címzett NEM az XML-beli cím, hanem a fiók kapcsolattartási címe. Az értesítő és a vevői fiók a `szamlaNyelve` szerinti nyelven jelenik meg.
- **Forrás:** https://docs.szamlazz.hu/hu/agent/basics/details

### C10. `vevoifiokurl`: opcionális, fiókbeállítás-függő — KÖTELEZŐ (mint kliens-szabály)
- **Szabály:** A `vevoifiokurl` a vevői számlafiókra mutató link (`https://www.szamlazz.hu/szamla/?page=vevoifiokpay&partguid=…&szfejguid=…`), és **csak akkor jön vissza, ha a vevői fiók funkció be van kapcsolva** — a kliens NEM támaszkodhat a meglétére.
- **Részletek:** A vevői fiókban a vevő letöltheti a kiállítótól kapott számláit és (ha van) online fizetést indíthat. A #start/#digital/#profi csomagban kikapcsolható; kikapcsolt vevői fiók esetén a számla-PDF csatolmányként megy ki az értesítővel.
- **Forrás:** https://tudastar.szamlazz.hu/gyik/mi-az-a-vevoi-szamlafiok

---

## D) ÁFA-esetek + fiók-oldali beállítások, teszt-mód, korlátok

### D1. `afakulcs` értékkészlet — KÖTELEZŐ
- **Szabály:** Numerikus kulcsok: 0, 1, 2, 2.1, 3, 4, 4.8, 5, 5.5, 6, 7, 7.7, 8, 8.1, 9, 9.5, 10, 11, 12, 13, 13.5, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 25.5, 26, 27. Speciális kódok: TAM, AAM, EUT (régi 'EU' utódja), EUKT (régi 'EUK' utódja), F.AFA, K.AFA, HO, TAHK, ATK, EUE, EUFADE, EUFAD37, NAM, EAM, KBAUK, KBAET.
- **Részletek:** A mi két esetünk: 27%-os áfa → `afakulcs=27`; alanyi adómentes → `afakulcs=AAM`.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/vat-rates

### D2. AAM-nél kizárólag az AAM kulcs jogszerű — KÖTELEZŐ
- **Szabály:** Alanyi adómentes eladóként belföldi értékesítésnél **kizárólag** az `AAM` áfakulcs használható — a TAM és a 0% használata „nem jogszerű", hiába nulla az áfa.
- **Részletek:** AAM-nél: `afaErtek=0`, `bruttoErtek=nettoErtek` (az A9 tétel-validáció ekkor is fut). A kódban az adómentes ágon SOHA nem `0`, hanem az `'AAM'` string küldendő.
- **Forrás:** https://www.szamlazz.hu/blog/2017/06/hogyan-szamlazz-ha-afamentes-kisadozo-vagy/

### D3. AAM-záradék az Agent-kérésben — TISZTÁZANDÓ
- **Szabály:** Hivatalos forrás csak az AAM kulcs használatát írja elő; külön, kötelezően küldendő záradékszöveget („alanyi adómentes") a doksi nem követel meg — a jelölést vélhetően a rendszer kezeli a kulcs alapján.
- **Részletek:** Teszt-fiókban kiállított próbaszámla PDF-jén ellenőrizendő, megjelenik-e automatikusan az alanyi adómentes jelölés; ha nem, a megjegyzés mezőbe teendő.
- **Forrás:** https://www.szamlazz.hu/blog/2017/06/hogyan-szamlazz-ha-afamentes-kisadozo-vagy/

### D4. Kedvezmény = negatív tételsor — AJÁNLOTT
- **Szabály:** Nincs dedikált kedvezmény-mező; a kedvezmény külön `<tetel>` negatív `nettoEgysegar`-ral, az A9 egyenletek betartásával.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/important-information

### D5. `eusAfa` mezőt nem használjuk — AJÁNLOTT
- **Szabály:** Az `eusAfa` (opcionális boolean) csak OSS-regisztrált vagy nem magyar adószámú eladónál állítható true-ra — a Kineticare (magyar adószám, belföldi HUF-számlázás) esetében nem küldendő.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/vat-rates

### D6. `szamlaszamElotag` és előtag-szabályok — KÖTELEZŐ
- **Szabály:** A fejléc `szamlaszamElotag` mezője csak a fiókban (Beállítások / Előtagok) **előre felvett** előtagok egyike lehet; ismeretlen előtag → 202-es hiba. Ha nem küldjük, az alapértelmezett számlatömb érvényesül.
- **Részletek:** Az előtag max. 5 karakter, ékezet nélküli nagybetű és szám. Módosítható, amíg nem készült vele számla. Több webshop/üzletág külön előtaggal különíthető el.
- **Forrás:** https://docs.szamlazz.hu/agent/generating_invoice/xml , https://tudastar.szamlazz.hu/gyik/elotagok-beallitasa-uj-szamlatomb-hasznalatahoz

### D7. Teszt-mód: fiók-szintű, nincs kérés-szintű tesztflag — KÖTELEZŐ
- **Szabály:** Az Agent-kérésben nincs „teszt" kapcsoló; hivatalos út: a fiók teszt módba állítása VAGY dedikált tesztfiók (ugyanazzal az adószámmal is regisztrálható). Éles fiókban tesztelni tilos/kockázatos (Agent-díj, automatikus számlázás leállhat).
- **Részletek:** Feltétel: a fiókkal még nem számláztak és nincs NAV-összekötés. Teszt-fiók korlátai: a számlák **nem számviteli bizonylatok** és NEM mennek a NAV-hoz (NAV-kapcsolat nem is köthető be); az értesítő e-mail mindig a fiók kapcsolattartási címére megy; kibocsátói adat nem módosítható; nincs csomagváltás/online fizetés teszt/archívum. Élesre visszaálláskor a tesztszámlák törlődnek.
- **Forrás:** https://tudastar.szamlazz.hu/gyik/teszt-fiok-fejleszteshez , https://tudastar.szamlazz.hu/gyik/teszt-fiok-mukodese

### D8. Teszt-környezeti volumenkorlát — TISZTÁZANDÓ (hivatalos források ellentmondanak)
- **Szabály:** **KONFLIKTUS két hivatalos oldal közt:** az `agent/basics/details` szerint max. **100 számla/óra** a tesztkörnyezetben; az `agent/basics/error-handling` szerint max. **500 számla/10 perc**. Konzervatívan a szigorúbb 100/óra tartandó, a tényleges limit tisztázandó.
- **Forrás:** https://docs.szamlazz.hu/agent/basics/details , https://docs.szamlazz.hu/agent/basics/error-handling

### D9. NAV Online Számla adatszolgáltatás — KÖTELEZŐ (üzemeltetési előfeltétel)
- **Szabály:** Az adatszolgáltatás az összekötés után teljesen automatikus — az Agent-kérésben semmit nem kell hozzá küldeni. Előfeltétel: technikai felhasználó létrehozása a NAV Online Számla rendszerében és a kulcsok rögzítése a Számlázz.hu-fiókban (a mi feladatunk, fiók-oldalon).
- **Részletek:** A beküldés státusza a számla adatlapján ellenőrizhető. Teszt-fióknál a kapcsolat nem hozható létre.
- **Forrás:** https://tudastar.szamlazz.hu/gyik/nav-online-szamla-adatszolgaltatas

### D10. Agent-díjazás és csomagfüggő funkciók — AJÁNLOTT
- **Szabály:** A Számla Agent külön díjazású, használat-alapú szolgáltatás (bizonylatszám-sávos, előző havi forgalom alapján). Agentből csak azok a funkciók érhetők el, amiket a csomag manuálisan is biztosít — pl. ingyenes csomagban e-számla Agentből sem állítható ki (54-es hiba kockázata).
- **Forrás:** https://tudastar.szamlazz.hu/gyik/szamla-agent-a-szamlazz.hu-automatikus-szamlazasi-megoldasa

---

## Bizonytalanságok (hivatalos forrásból nem megerősített)

1. **Átmeneti vs. végleges hibakód-besorolás:** a doksi csak az 1-es (karbantartás) kódnál mondja ki explicit az újrapróbálást és általánosan az 5-kísérletes limitet; a többi kód „végleges" besorolása a jelentésükből levont következtetés (A14).
2. **`szamlaKulsoAzon` duplikátum-védelme:** nincs hivatalos állítás arról, hogy azonos `szamlaKulsoAzon`-nal ismételt kiállítást a rendszer elutasítana — az idempotencia a `rendelesSzam`-tiltás (71/152, 2 napos ablak) + `szamlaKulsoAzon`-visszakeresés kombinációja. Az, hogy a rendelésszám-ismétlés tiltása a fiókunkban be van-e kapcsolva, **fiókbeállításban ellenőrizendő**.
3. **Ismételt sztornó viselkedése:** nincs dokumentált hibakód a már sztornózott számla ismételt sztornójára — tesztfiókban kipróbálandó; a kliens-idempotenciát nem szabad a szerver hibakódjára alapozni (C5).
4. **`fizetendoKorrekcio` szemantikája:** csak típus (double, opcionális) dokumentált, magyarázat nincs (B8).
5. **Negatív tétel pontos Agent-viselkedése helyesbítőnél:** a negatív-különbözet szabály a tudástár/blog UI-leírásából származik, nem az Agent API-referenciából; a pontos előjel-kombináció (negatív mennyiség + pozitív egységár + negatív értékek) tesztben validálandó (B3).
6. **Láncolt helyesbítés hivatkozása:** a `helyesbitettSzamlaszam` mindig az eredetire mutasson-e, vagy az előző helyesbítőre — az eredetire hivatkozás az irányadó értelmezés, de tesztben ellenőrizendő (B6).
7. **Helyesbítő sorszám-folyama:** nincs explicit kijelentés külön folyamról; a „hézagmentes, automatikus" szabályból következtetve a normál folyamban kap számot (B7).
8. **Teszt-volumenlimit:** 100/óra vs. 500/10 perc — két hivatalos oldal ellentmond (D8); konzervatívan 100/óra.
9. **AAM-záradék:** nem megerősített, hogy a rendszer automatikusan ráírja-e a mentesség-jelölést a PDF-re (D3).
10. **`kintlevoseg` mező sztornó-kontextusban:** jelentése nem dokumentált (C4).
11. **Sztornó `tipus` mező értékkészlete:** a mintában `SS`, hivatalos felsorolás nincs (C3).
12. **Régi 'EU'/'EUK' áfakódok elfogadása:** nem dokumentált (minket nem érint); a 'MAA' és önálló 'TEHK' kód a jelenlegi hivatalos táblában nem szerepel — elavult dokumentációkból származhat.
13. **Éles rate limit:** éles környezetre számszerű limitet a doksi nem közöl — csak a max. 5 újraküldés + kitiltási szabály.
14. **Helyesbítő teljesítési dátum 2026-os szabályváltozás:** egy keresési kivonat 2026.01.01-i változást említett, de a hivatalos cikk ezt nem erősítette meg — implementáció előtt újraellenőrizendő.
15. **Dokumentáció-elérési hézagok:** néhány docs.szamlazz.hu-aloldal (pl. `/agent/basics/` főoldal, `/agent/generating_invoice/introduction`, `/agent/generating_invoice/payment-methods`, a `/hu/` útvonal egy része) 403-at adott a kutatóknak; a tartalom az elérhető aloldalakból és az élő XSD-kből lett rekonstruálva. A WebFetch-kivonatolás miatt az idézetek kis torzulást tartalmazhatnak; a kritikus számokat több lekérés is megerősítette.

---

## A mi kódunkra vonatkozó gyors megjegyzések (kód-audit NÉLKÜL, a kontextus alapján)

1. **Titokkezelés:** az Agent-kulcs a CLAUDE.md 1. tilos zónája alá esik — csak env-változóból jöhet (`.env.example`-be kulcsnév értékkel nélkül), és fel kell venni a `src/lib/logger.ts` redact-listájára, a `szlahu_*` fejlécekkel és a teljes kérés-XML-lel együtt (vevő-személyes adatot tartalmaz).
2. **Állapotgép-illeszkedés:** a Barion-callback-vezérelt saját rendelés-állapotgépbe (a `confirmOrder`-tilalom miatt ez amúgy is nálunk él) fel kell venni a számlázási állapotokat: kiállítva (számlaszám tárolva), stornózva (stornó-számlaszám tárolva), helyesbítve (helyesbítő-számlaszámok listája) — mert a stornó/helyesbítő döntés (B5, B6) és az idempotencia (A12, C5) mind tárolt számlaszámokra épül.
3. **Idempotencia timeout-nál:** a Railway privát hálózat ismert TCP-elvágási problémái (CLAUDE.md üzemeltetési tanulság 7.) miatt reális a „kérés elment, válasz elveszett" eset — a kiállítás-újrapróbálás ELŐTT kötelező a `szamlaKulsoAzon`-alapú lekérdezés, és a 71/152 hibát sikerként/lekérdezéssel kell kezelni, max. 5 kísérlettel (A14).
4. **Összegszámítás:** a tétel-egyenleteket (A9) fillérpontosan nálunk kell kiszámolni; AAM-ágon `afakulcs='AAM'` (string!), `afaErtek=0` — a mezőtípus tehát nem lehet szám-only (a 27 és az 'AAM' egyaránt beleférjen), de `any` nélkül (strict TS): pl. szűkített union típus.
5. **PDF-tárolás/-lekérés:** a v2-válasz base64 PDF-jét érdemes azonnal letárolni; a külön PDF-lekérő ágat a 7-es „nem található" hibakódra és a `vevoifiokurl` hiányára is fel kell készíteni (C7, C10).
6. **Hibaüzenetek nyelve:** a felhasználónak szóló hibaüzenetek magyarul (CLAUDE.md) — a szamlazz.hu `hibauzenet` mezője technikai naplóba (request ID-vel) megy, a vevő felé saját magyar üzenet jelenik meg.
7. **Fiók-oldali előfeltételek (nem kód, de blokkoló):** rendelésszám-ismétlés tiltásának bekapcsolása, előtag felvétele (ha kell), e-számla engedélyezés/csomag ellenőrzése, NAV technikai felhasználó bekötése, vevői fiók be/ki döntés, teszt-fiók létrehozása a fejlesztéshez (D6–D9).
8. **Kliens-transzport:** multipart fájlmelléklet (nem sima form-mező!), cookie-kezelés, naprakész TLS trust store (Let's Encrypt), korlátos (max. 5) retry emberi eszkalációs ponttal — retry-loop kitiltást kockáztat (A1, A14–A16).
