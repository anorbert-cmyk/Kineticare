# Stornó és helyesbítő számla (Számlázz.hu) a refund-folyamatban

## Áttekintés

Visszatérítéskor a Kineticare automatikusan bizonylatot állít ki a
Számlázz.hu Számla Agenten keresztül. A bizonylat típusát nem önmagában a
visszatérítés összege, hanem a **bizonylat-történet** dönti el:

| Refund | Bizonylat | Miért |
|---|---|---|
| **Teljes, és még nem volt korábbi refund** | **stornó** (`xmlszamlast`, `tipus=SS`) | az eredeti számla teljes érvénytelenítése |
| **Részleges** | **helyesbítő (módosító) számla** (`xmlszamla`, `helyesbitoszamla=true`) | az eredeti számla érvényben marad, csak a visszatérített összeg korrigálódik |
| **A maradékot lezáró teljes refund** (volt már részrefund) | **helyesbítő** | a korábbi részrefundhoz már készült helyesbítő; a teljes stornó a részösszeget másodszor is jóváírná. A már helyesbített számla amúgy sem stornózható. |

A döntés helye: `src/lib/refund/refund-order.ts` (10. lépés) — a feltétel
`type === 'full' && alreadyRefunded === 0`. A `type: 'full' | 'partial'`, amely a
rendelés státuszát és a purchases-levételt vezérli, ettől független (azt az összeg
adja).

## A Számla Agent sztornó interfésze (séma-tények)

A stornónak **dedikált XML-művelete** van — NEM a sima számla-XML
(`xmlszamla`) része (abban stornó-tag nincs; a
`helyesbitoszamla`/`helyesbitettSzamlaszam` a helyesbítő okirat, az nem
stornó).

| Elem | Érték |
|---|---|
| Végpont | `POST https://www.szamlazz.hu/szamla/` (multipart/form-data) |
| Form-mező | `action-szamla_agent_st` |
| XML-gyökér | `<xmlszamlast xmlns="http://www.szamlazz.hu/xmlszamlast">` |
| XSD | `https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd` |
| Hivatkozás az eredeti számlára | `<fejlec><szamlaszam>` (KÖTELEZŐ) |
| Bizonylattípus | `<fejlec><tipus>SS</tipus>` (sztornó) |
| Sztornó oka | `<fejlec><megjegyzes>` (szabad szöveg) |
| Dátumok | **nincsenek a kérésben** (sem `keltDatum`, sem `teljesitesDatum`) |
| Válasz | ugyanaz az `xmlszamlavalasz` (valaszVerzio=2), mint a számlakiállításnál |

A stornó XML-ben **nincs tétel-/összegblokk**: a Számlázz.hu az eredeti
számlából generálja a negatív bizonylatot.

**Dátumok szándékosan kihagyva.** A stornó számlán a teljesítési dátumnak az
EREDETI számláéval azonosnak kell lennie. A `keltDatum`/`teljesitesDatum` az
Agent-kérésben opcionális — kihagyva a Számlázz.hu tölti ki őket, a teljesítést
garantáltan az eredetivel egyezően; saját, esetleg eltérő dátum küldése csak
kockázat volna. (Ezért a `BuildStornoXmlInput`-nak nincs `issueDate` mezője.)

## A helyesbítő (módosító) számla séma-tényei

A helyesbítő **ugyanaz az `xmlszamla` művelet** (`action-xmlagentxmlfile`),
két eltéréssel:

| Elem | Érték |
|---|---|
| `<fejlec><helyesbitoszamla>` | `true` |
| `<fejlec><helyesbitettSzamlaszam>` | az EREDETI számla száma (`order.invoiceNumber`) |
| Tételek | EGY korrekciós tétel a visszatérített összegre, **negatív** `nettoEgysegar` / `nettoErtek` / `afaErtek` / `bruttoErtek` értékkel |
| `<fejlec><teljesitesDatum>` | az EREDETI számla teljesítési dátuma (`order.invoiceCompletionDate`) |
| `<beallitasok><szamlaKulsoAzon>` | `${orderNumber}-HELYESBITO-<refund-sorszám>` |

A tétel-matematikát a Számlázz.hu validálja (57, 259–264 hibakódok), ezért a
`computeLineAmounts` a korrekciós tételt az **abszolút értéken** számolja, és
utána vált előjelet — így a kerekítés pontosan tükrözi az eredeti számla
tételét (teljes összegű helyesbítés esetén a két bizonylat nullára összegződik).

**Dátumszabály (NAV).** A helyesbítő teljesítési dátumának naptári hónapja nem
térhet el az eredeti számláétól, ezért a kiállításkor küldött teljesítési
dátumot a rendszer rögzíti a rendelésen (`invoiceCompletionDate`), és a
helyesbítő ezt ismétli meg. Ha a mező üres (a bevezetése előtt kiállított
számla, vagy egy korábbi kísérletben kiállt és lekérdezéssel átvett bizonylat),
a helyesbítő figyelmeztetés mellett a saját kiállítási napjára esik vissza —
hónapforduló környékén ez kézi ellenőrzést kíván.

## Folyamat

1. `POST /api/admin/orders/[orderNumber]/refund` (owner-only) →
   `refundOrder()` (`src/lib/refund/refund-order.ts`).
2. A Barion-refund sikere után a rendelés státusza frissül (teljesnél
   `refunded`), a refund-nyom és az audit-bejegyzés rögzül.
3. **Első teljes refundnál** `issueStornoForOrder(order, deps)`
   (`src/lib/szamlazz/storno.ts`), **minden más esetben** (részleges refund,
   illetve a maradékot lezáró teljes refund) `issueCorrectiveInvoiceForOrder(order, deps)`
   (`src/lib/szamlazz/corrective.ts`) fut — mindkettő **best-effort**:
   - kikapcsolt integráció (nincs `SZAMLAZZ_AGENT_KEY`) → `disabled` no-op;
   - a rendelésen már rögzített bizonylat → `already-storned` /
     `already-issued` no-op;
   - hiányzó eredeti számlaszám (`invoiceNumber`), hiányos vevőadat,
     érvénytelen összeg → `failed` (nem dob: emberi pótlás kell);
   - siker → a bizonylat száma a rendelésre kerül, strukturált naplózással;
   - retryable provider-hiba (timeout/hálózat/5xx/`szlahu_down`) → **dob**.
4. A dobott, **újrapróbálható** hibát a refund-bekötés elkapja, és sorba
   állítja a megfelelő jobot az `order-maintenance` queue-ban:
   `storno-issue` (input: `orderId`), illetve `corrective-invoice-issue`
   (input: `orderId` + `refundSeq`). Mindkét task `retries: 3` — az
   `invoice-issue` mintája.
5. A bizonylat hibája **soha nem befolyásolja** a már sikeres refundot:
   a bekötés minden ágat try/catch-ben tart, strukturált loggal
   (`src/lib/logger.ts`).

## Állapot a rendelésen

Az `orders` collection (`src/plugins/ecommerce.ts`) mezői — mind a rendszer
írja (`overrideAccess`), az adminban readOnly/leíró:

| Mező | Érték |
|---|---|
| `stornoStatus` | `none` \| `pending` \| `storned` \| `failed` |
| `stornoNumber` | a kiállított stornó-számla száma (owner-only olvasás) |
| `stornoAttempts` | kísérletszámláló (`MAX_STORNO_ATTEMPTS` = 5) |
| `stornoLastError` | az utolsó sikertelen kísérlet hibaüzenete |
| `correctiveInvoiceStatus` | `none` \| `pending` \| `issued` \| `failed` |
| `correctiveInvoiceNumber` | a LEGUTÓBBI helyesbítő számla száma (owner-only olvasás) |
| `correctiveInvoiceSeq` | melyik refund-bejegyzéshez tartozik a legutóbbi helyesbítő |
| `correctiveInvoiceAttempts` | kísérletszámláló (`MAX_CORRECTIVE_ATTEMPTS` = 5) |
| `correctiveInvoiceLastError` | az utolsó sikertelen kísérlet hibaüzenete |

## Idempotencia

- **Provider-oldali horgony:** `szamlaKulsoAzon` — stornónál
  `${orderNumber}-STORNO`, helyesbítőnél
  `${orderNumber}-HELYESBITO-<refund-sorszám>`, bizonylatonként egyedi értékkel.
  A külső azonosító a **visszakeresés** kulcsa: a hivatalos dokumentáció NEM
  állítja, hogy azonos `szamlaKulsoAzon`-nal ismételt kérést a rendszer
  elutasítana. A tényleges duplikátum-védelem a `rendelesSzam`-ra épül, és a
  fiókban **bekapcsolt** „rendelésszám-ismétlés tiltása" beállítást igényli;
  ekkor az azonos ismételt kérés 2 napon belül a korábbi bizonylatot adja
  vissza, eltérő adatnál pedig 71/152-es kódot. Részletek és a fiók-oldali
  teendők: `docs/szamlazz-megfeleles.md`.
- **Beküldés előtti lekérdezés:** ha ez már nem az első kísérlet
  (`attempts > 0`), a kérés MEGISMÉTLÉSE ELŐTT lekérdezés fut a
  `szamlaKulsoAzon`-ra (`queryInvoiceByKulsoAzon`, `src/lib/szamlazz/pdf.ts`,
  `action-szamla_agent_pdf`). Találat esetén a meglévő bizonylat száma kerül a
  rendelésre, új beküldés nélkül — ez oldja fel a „kérés elment, válasz
  elveszett" esetet. A lekérdezés hibája szándékosan propagál: bizonytalan
  állapotban nem szabad vakon újra beküldeni.
- **Duplikátum-feloldás:** a 71/152-es válasz nem hiba, hanem
  idempotencia-találat (`SzamlazzApiError.kind = 'duplicate'`) — a kód ilyenkor
  ugyanazzal a lekérdezéssel veszi át a meglévő bizonylat számát. Ha a
  lekérdezés mégsem talál semmit, a bizonylat `failed` marad, `RIASZTÁS:`
  naplóbejegyzéssel (kézi egyeztetés kell).
- **Alkalmazás-oldali no-op:** a stornó a `stornoNumber` /
  `stornoStatus='storned'` mezőt nézi; a helyesbítő **pontos** seq-egyezést
  (`correctiveInvoiceSeq === refundSeq`, a `refundSeq` a refunds-nyom 1-alapú
  sorszáma). A szigorítás szándékos: `correctiveInvoiceSeq > refundSeq` esetén
  egy KORÁBBI refund elmaradt bizonylatának újrapróbálása fut (a retry-queue
  megtöri a sorrendi kiállítást), ezért a kérést tovább kell engedni.
- **Kísérlet-korlát:** a Számlázz.hu hivatalos szabálya szerint ugyanaz a kérés
  legfeljebb **ötször** küldhető be, utána emberi beavatkozás kell (a
  retry-loop kitiltást kockáztat). Mindhárom ág perzisztens számlálót használ
  (`invoiceAttempts` / `stornoAttempts` / `correctiveInvoiceAttempts`), így a
  job-retry és az esetleges újrasorbaállítás **együttese** sem lépheti túl a
  plafont. Kimerüléskor a bizonylat `failed` marad — hálózati hívás nélkül —, és
  error-szintű owner-jelzés kerül a naplóba.

## Hibakezelés

| Hibaág | Viselkedés |
|---|---|
| `SZAMLAZZ_AGENT_KEY` hiányzik | `disabled` no-op — a refund ettől teljes |
| Nincs `invoiceNumber` a rendelésen | `failed` + warn log + `failed` státusz (emberi pótlás) |
| Hiányos vevő-számlázási adat (helyesbítő) | `failed` + warn log |
| Agent-elutasítás (`<sikeres>false</sikeres>`) | `failed` + warn log, nem retryable (a hivatalos kódok közül csak az `1` — karbantartás — retryable) |
| Duplikátum-jelzés (71/152) | NEM hiba: lekérdezés a `szamlaKulsoAzon`-ra, és a meglévő bizonylat átvétele |
| Timeout / hálózat / HTTP 5xx / `szlahu_down` | `SzamlazzApiError` (retryable) dob → a refund-bekötés jobot állít sorba |
| Kimerült kísérletszám (5) | `failed`, hálózati hívás nélkül, error-szintű owner-jelzés |
| Bármely váratlan hiba | elkapva, error log — a refund HTTP-válasza változatlan |

A stornó HTTP-hívás (`postStornoXml`) a `postInvoiceXml`-lel azonos
hibaosztályokat használja (`SzamlazzApiError.kind`: timeout / network /
http / agent / invalid_response), a titok (agent-kulcs) csak az XML-bodyban
utazik, a napló titokmentes.

## Élesítéshez szükséges

1. **`SZAMLAZZ_AGENT_KEY`** környezeti változó beállítása (Számlázz.hu
   fiók → Beállítások → Számla Agent kulcs). Enélkül a bizonylat-kiállítás
   csendben kikapcsolt (`disabled`).
2. Opcionális: `SZAMLAZZ_API_URL`, `SZAMLAZZ_INVOICE_PREFIX`,
   `SZAMLAZZ_AFAKULCS` (`27` vagy `AAM` — a cég adózási státusza szerint,
   könyvelővel egyeztetve), `SZAMLAZZ_TIMEOUT_MS` (a számlakiállítással közös
   konfig-felület, `getSzamlazzConfig`).
3. A job-workerek (`ENABLE_JOB_WORKERS=true`) futása szükséges ahhoz, hogy a
   sorba állított `storno-issue` / `corrective-invoice-issue` taskok
   ténylegesen lefussanak; enélkül a bizonylat a naplóból és a rendelés
   `stornoStatus`/`correctiveInvoiceStatus` mezőjéből pótolható kézzel.
4. Fiók-oldali előfeltételek (rendelésszám-ismétlés tiltása, előtag felvétele,
   e-számla engedélyezés, NAV-bekötés, vevői fiók be/ki):
   `docs/szamlazz-megfeleles.md` — „Fiók-oldali előfeltételek" checklist.

## Hivatkozások

- Teljes követelmény-audit (45 hivatalos követelmény, fiók-oldali checklist,
  teszt-fiókos validálási lista): `docs/szamlazz-megfeleles.md`
- Számla Agent sztornó XML-minta:
  https://docs.szamlazz.hu/hu/agent/reversing_invoice/xml
- XSD: https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd
- Bizonylat-lekérdezés XSD (idempotencia-feloldás):
  https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd
- Mezőnév-tábla (melyik form-mező melyik művelet):
  https://docs.szamlazz.hu/hu/agent/basics/send-xml
- Hibakódok: https://docs.szamlazz.hu/agent/basics/error-handling
