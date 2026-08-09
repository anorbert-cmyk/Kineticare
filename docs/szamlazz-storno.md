# Stornó és helyesbítő számla (Számlázz.hu) a refund-folyamatban

## Áttekintés

Visszatérítéskor a Kineticare automatikusan bizonylatot állít ki a
Számlázz.hu Számla Agenten keresztül. A bizonylat típusát a **visszatérítés
összege** dönti el:

| Refund | Bizonylat | Miért |
|---|---|---|
| **Teljes** (a fizetett végösszeg 100%-a) | **stornó** (`xmlszamlast`, `tipus=SS`) | az eredeti számla teljes érvénytelenítése |
| **Részleges** | **helyesbítő (módosító) számla** (`xmlszamla`, `helyesbitoszamla=true`) | az eredeti számla érvényben marad, csak a visszatérített összeg korrigálódik |

A döntés helye: `src/lib/refund/refund-order.ts` (10. lépés) — ugyanaz a
`type: 'full' | 'partial'`, amely a rendelés státuszát és a purchases-levételt
is vezérli.

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
| Válasz | ugyanaz az `xmlszamlavalasz` (valaszVerzio=2), mint a számlakiállításnál |

A stornó XML-ben **nincs tétel-/összegblokk**: a Számlázz.hu az eredeti
számlából generálja a negatív bizonylatot.

## A helyesbítő (módosító) számla séma-tényei

A helyesbítő **ugyanaz az `xmlszamla` művelet** (`action-xmlagentxmlfile`),
két eltéréssel:

| Elem | Érték |
|---|---|
| `<fejlec><helyesbitoszamla>` | `true` |
| `<fejlec><helyesbitettSzamlaszam>` | az EREDETI számla száma (`order.invoiceNumber`) |
| Tételek | EGY korrekciós tétel a visszatérített összegre, **negatív** `nettoEgysegar` / `nettoErtek` / `afaErtek` / `bruttoErtek` értékkel |
| `<beallitasok><szamlaKulsoAzon>` | `${orderNumber}-HELYESBITO-<refund-sorszám>` |

A tétel-matematikát a Számlázz.hu validálja (57, 259–264 hibakódok), ezért a
`computeLineAmounts` a korrekciós tételt az **abszolút értéken** számolja, és
utána vált előjelet — így a kerekítés pontosan tükrözi az eredeti számla
tételét (teljes összegű helyesbítés esetén a két bizonylat nullára összegződik).

## Folyamat

1. `POST /api/admin/orders/[orderNumber]/refund` (owner-only) →
   `refundOrder()` (`src/lib/refund/refund-order.ts`).
2. A Barion-refund sikere után a rendelés státusza frissül (teljesnél
   `refunded`), a refund-nyom és az audit-bejegyzés rögzül.
3. **Teljes refundnál** `issueStornoForOrder(order, deps)`
   (`src/lib/szamlazz/storno.ts`), **részlegesnél**
   `issueCorrectiveInvoiceForOrder(order, deps)`
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

## Idempotencia

- **Provider-oldali horgony:** `szamlaKulsoAzon` —
  stornónál `${orderNumber}-STORNO`, helyesbítőnél
  `${orderNumber}-HELYESBITO-<refund-sorszám>`. Ismételt beküldésre a
  Számlázz.hu nem állít ki újabb bizonylatot ugyanazzal a külső
  azonosítóval — a duplikáció technikailag kizárt.
- **Alkalmazás-oldali no-op:** a stornó a `stornoNumber` /
  `stornoStatus='storned'` mezőt nézi; a helyesbítő a
  `correctiveInvoiceSeq >= refundSeq` feltételt (a `refundSeq` a refunds-nyom
  1-alapú sorszáma). Így a job-újrafuttatás hálózati hívás nélkül no-op.
- **Kísérség-korlát:** `MAX_STORNO_ATTEMPTS` felett a stornó `failed` marad,
  és error-szintű owner-jelzés kerül a naplóba (nincs végtelen próbálkozás).

## Hibakezelés

| Hibaág | Viselkedés |
|---|---|
| `SZAMLAZZ_AGENT_KEY` hiányzik | `disabled` no-op — a refund ettől teljes |
| Nincs `invoiceNumber` a rendelésen | `failed` + warn log + `failed` státusz (emberi pótlás) |
| Hiányos vevő-számlázási adat (helyesbítő) | `failed` + warn log |
| Agent-elutasítás (`<sikeres>false</sikeres>`) | `failed` + warn log, nem retryable |
| Timeout / hálózat / HTTP 5xx / `szlahu_down` | `SzamlazzApiError` (retryable) dob → a refund-bekötés jobot állít sorba |
| Kimerült kísérletszám | `failed`, hálózati hívás nélkül, error-szintű owner-jelzés |
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
   `SZAMLAZZ_TIMEOUT_MS` (a számlakiállítással közös konfig-felület,
   `getSzamlazzConfig`).
3. A job-workerek (`ENABLE_JOB_WORKERS=true`) futása szükséges ahhoz, hogy a
   sorba állított `storno-issue` / `corrective-invoice-issue` taskok
   ténylegesen lefussanak; enélkül a bizonylat a naplóból és a rendelés
   `stornoStatus`/`correctiveInvoiceStatus` mezőjéből pótolható kézzel.

## Hivatkozások

- Számla Agent sztornó XML-minta:
  https://docs.szamlazz.hu/hu/agent/reversing_invoice/xml
- XSD: https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd
- Mezőnév-tábla (melyik form-mező melyik művelet):
  https://docs.szamlazz.hu/hu/agent/basics/send-xml
