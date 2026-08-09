# Stornó-számla (Számlázz.hu) a refund-folyamatban

## Áttekintés

Teljes (100%-os) visszatérítés (refund) esetén a Kineticare automatikusan
stornó-számlát állít ki a Számlázz.hu Számla Agenten keresztül. A stornó az
eredeti számla teljes érvénytelenítése — a NAV-online adatszolgáltatásban az
eredeti és a stornó bizonylat együttesen zárja a tranzakciót.

**Részrefundnál NEM készül stornó** (a stornó a teljes számlát érvényteleníti);
részleges visszatérítéshez helyesbítő (módosító) számla kellene — az külön
fejlesztés, jelen dokumentum nem tartalmazza.

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

## Folyamat

1. `POST /api/admin/orders/[orderNumber]/refund` (owner-only) →
   `refundOrder()` (`src/lib/refund/refund-order.ts`).
2. A Barion-refund sikere után a rendelés `refunded` státuszba kerül,
   a refund-nyom és az audit-bejegyzés rögzül.
3. **Teljes refundnál** a folyamat végén `issueStornoForOrder(order, deps)`
   hívódik **best-effort** módon (`src/lib/szamlazz/storno.ts`):
   - kikapcsolt integráció (nincs `SZAMLAZZ_AGENT_KEY`) → `disabled` no-op;
   - a rendelésen már rögzített stornó (`stornoNumber` mező, vagy
     `stornoStatus: 'issued'`) → `already-storned` no-op;
   - hiányzó eredeti számlaszám (`invoiceNumber`) → `failed` (nem dob:
     emberi pótlás kell, az újrapróbálás nem segít);
   - siker → `storned` + a stornó-számla száma, strukturált naplózás;
   - retryable provider-hiba (timeout/hálózat/5xx/szlahu_down) → **dob**,
     hogy a hívó (jövőbeli job) újrapróbálhassa; a refund-bekötés ezt is
     elkapja és naplózza.
   A folyamat a rendelés `stornoStatus`/`stornoNumber` mezőit is írja
   (`pending` → `issued` + sorszám, illetve `failed`) — a `failed` állapot
   NEM zárja ki a későbbi újrapróbálást.
4. A stornó hibája **soha nem befolyásolja** a már sikeres refundot:
   a bekötés minden ágat try/catch-ben tart, strukturált loggal
   (`src/lib/logger.ts`).

## Idempotencia

- **Provider-oldali horgony:** `szamlaKulsoAzon = ${orderNumber}-STORNO`.
  Ismételt beküldésre a Számlázz.hu nem állít ki újabb stornót ugyanazzal a
  külső azonosítóval — a dupla stornó technikailag kizárt.
- **Alkalmazás-oldali no-op:** az `issueStornoForOrder` a rendelés
  `stornoNumber`/`stornoStatus` mezőit olvassa — rögzített stornó esetén
  `already-storned` no-op lép életbe.
- **DB-nyilvántartás:** az `orders` collection `stornoStatus`
  (`none|pending|issued|failed`) és `stornoNumber` mezői a folyamatot követik.
  A mezők a sémában már léteznek — a hozzájuk tartozó migrációt merge után
  `payload migrate:create`-vel kell legenerálni (élő DB kell hozzá).

## Hibakezelés

| Hibaág | Viselkedés |
|---|---|
| `SZAMLAZZ_AGENT_KEY` hiányzik | `disabled` no-op — a refund ettől teljes |
| Nincs `invoiceNumber` a rendelésen | `failed` + warn log (emberi pótlás) |
| Agent-elutasítás (`<sikeres>false</sikeres>`) | `failed` + warn log, nem retryable |
| Timeout / hálózat / HTTP 5xx / `szlahu_down` | `SzamlazzApiError` (retryable) dob — a refund-bekötés elkapja, error log; külön job-újrapróbálás javasolt |
| Bármely váratlan hiba | elkapva, error log — a refund HTTP-válasza változatlan |

A stornó HTTP-hívás (`postStornoXml`) a `postInvoiceXml`-lel azonos
hibaosztályokat használja (`SzamlazzApiError.kind`: timeout / network /
http / agent / invalid_response), a titok (agent-kulcs) csak az XML-bodyban
utazik, a napló titokmentes.

## Élesítéshez szükséges

1. **`SZAMLAZZ_AGENT_KEY`** környezeti változó beállítása (Számlázz.hu
   fiók → Beállítások → Számla Agent kulcs). Enélkül a stornó-kiállítás
   csendben kikapcsolt (`disabled`).
2. Opcionális: `SZAMLAZZ_API_URL`, `SZAMLAZZ_INVOICE_PREFIX`,
   `SZAMLAZZ_TIMEOUT_MS` (a számlakiállítással közös konfig-felület,
   `getSzamlazzConfig`).
3. **Migráció (blokkoló az éles DB-hez):** a `stornoStatus`/`stornoNumber`
   mezők a sémában már benne vannak — merge után `payload migrate:create`
   futtatandó, hogy az oszlopok létrejöjjenek. Migráció nélkül a
   storno-írás SQL-hibát dobna (a refund ettől best-effort marad, de a
   stornó-állapot nem rögzülne).
4. Javasolt (nem blokkoló): a retryable stornó-hibák újrapróbálására dedikált
   job (az `invoice-issue` task mintájára, `order-maintenance` queue) —
   jelenleg a best-effort inline hívás egyszer fut, a kimaradt stornót a
   napló (warn/error) jelzi.

## Hivatkozások

- Számla Agent sztornó XML-minta:
  https://docs.szamlazz.hu/hu/agent/reversing_invoice/xml
- XSD: https://www.szamlazz.hu/szamla/docs/xsds/agentst/xmlszamlast.xsd
- Mezőnév-tábla (melyik form-mező melyik művelet):
  https://docs.szamlazz.hu/hu/agent/basics/send-xml
