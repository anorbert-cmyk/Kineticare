# Megfigyelések

Nyitott kérdések, eltérések és kockázatok, amiket a repó figyelése során
találtunk. Egy tétel akkor kerül **lezárva** státuszba, ha a repóban látható
változás megoldotta — a bejegyzést ilyenkor sem töröljük.

Státuszok: `nyitott` · `emberi döntésre vár` · `lezárva`

---

## M-01 — A README CI-workflow-kra hivatkozik, de nincsenek workflow-fájlok

**Státusz:** lezárva (2026-08-06) · **Felvéve:** 2026-07-31 · **Súly:** magas

> **Lezárás:** a `ci.yml`, `gitleaks.yml` és `claude.yml` workflow-k 2026-08-05/06-án
> bekerültek (`#5`, `#6` PR-ek), és a mainen zölden futnak — a „main-re csak zöld
> CI után" szabály így már kikényszerített. A felvételkor (f015bc3) a tétel
> pontos volt; az alábbi leírás a történeti állapotot őrzi.

A `README.md` szerint minden `main`-re érkező push és PR lefuttat egy CI-t
(typecheck → lint → build → test, Postgres 16 service-containerrel), egy
`npm audit` jobot és egy gitleaks full-history scant. A `.github/` mappában
azonban **csak `dependabot.yml` van**, és a GitHub Actions is egyetlen
workflow-t ismer: a Dependabot saját, dinamikusan generált futását.

Következmény: a „main-re csak zöld CI után kerülhet kód" szabály jelenleg
**nem kikényszerített**, és a titokszivárgás-ellenőrzés sem fut automatikusan —
holott a `CLAUDE.md` 1. tiltott zónája erre épít.

**Javaslat:** vagy készüljenek el a hivatkozott workflow-k
(`.github/workflows/ci.yml`, `gitleaks.yml`), vagy a README fogalmazza át
a szakaszt tervezettre. Előbbi a valós szándék — de a workflow-k létrehozása
külön ticket, nem a figyelés hatásköre.

---

## M-02 — A `payload-types.ts` kézi igazításai visszatérnek

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** közepes

A generált `src/payload-types.ts` fájlt három egymást követő commit igazította
kézzel (`342c85c` újragenerálás, `8e26140` fájlvégi newline, `2c88b04`
`CategoriesSelect.slug` sor pótlása), korábban pedig a `d328c97` egy
`TransactionsSelect.customer` mezőt tett vissza „byte-sync" címén.

Ha a generátor kimenete és a repóban lévő fájl rendszeresen eltér, az vagy
környezetfüggő generálást (Node-/formázó-verzió), vagy egy override-ot jelez,
amit a generátor nem lát. Mindkettő visszatérő, nehezen bizonyítható diff-zajt
okoz.

**Javaslat:** a következő `generate:types` futtatásnál érdemes rögzíteni, mi
tér el és miért; ha prettier-formázás a különbség, a generálás után futó
formázás megoldja.

---

## M-03 — A munka közvetlenül `main`-re megy, PR nélkül

**Státusz:** lezárva (2026-08-06) · **Felvéve:** 2026-07-31 · **Súly:** közepes

> **Lezárás:** 2026-08-05/06-tól a munka PR-eken keresztül megy (`#5`, `#8`–`#14`),
> és a CI-kapuk is élnek (lásd M-01). A tétel a felvételkori állapotot írja le.

A repóban a figyelő saját PR-jén (#1) kívül **nincs egyetlen pull request sem**,
és nincs issue sem — mind a 74 commit közvetlenül a `main`-en keletkezett. Ez
ellentmond a `README.md` és a `CLAUDE.md` PR-elvárásainak (zöld CI, leírás,
review az access-változásokhoz).

*2026-07-31 kiegészítés:* a T-022/T-025 kör is így ment be — pedig ez a
pénzügyi főlánc legérzékenyebb része (rendelés `paid`-re állítása, pénz
visszautalása), és a `CLAUDE.md` 4. pontja szerint az access-t érintő
változásokhoz emberi review kötelező. Az `ordersCollectionOverride` és a
`WebhookEvents` mezőbővítése formálisan ilyen változás volt.

Az M-01-gyel együtt ez azt jelenti, hogy jelenleg **egyik minőségi kapu sem
kényszerített**: se CI, se review.

**Javaslat:** ha a jelenlegi egyszemélyes tempó a szándék, a README-t érdemes
ehhez igazítani; ha nem, branch protection + a hiányzó workflow-k adják meg a
kapukat.

---

## M-04 — Kísérleti („probe"/„tmp") commitok a `main` történetében

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** alacsony

A történetben több, egymást oltó pár szerepel: `tmp: teszt` → `chore: tmp
marker törlése`, `test: binary base64 probe` → `chore: probe-fájlok
eltávolítása`, `probe: github MCP újracsatlakozás teszt (törlendő)` és társaik —
összesen kb. egy tucat commit, amely nem visz előre funkciót.

Tartalmi kockázatot nem hordoz (a fájlok törölve lettek), de zajossá teszi a
történetet, és megnehezíti a „mi változott érdemben" kérdés megválaszolását —
épp azt, amiért ez a napló készül.

**Javaslat:** eszköz-tesztelésre külön, eldobható branch; a `main` maradjon
funkcionális történet.

---

## M-05 — A minőségi kapuk lokálisan nem ellenőrizhetők ebben a környezetben

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** információ

A figyelő-környezetben a `node_modules` nincs telepítve, így a `npm run
typecheck` / `lint` / `test` nem futtatható a repó állapotának igazolására.
A napló ezért **a kód olvasásából és a git-történetből** dolgozik, nem futó
tesztekből.

**Javaslat:** ha az ellenőrzésnek tényleges zöld/piros státuszt is kell
adnia, az M-01 szerinti CI-workflow-k eredménye a természetes forrás — a
figyelés onnan olvasná ki, futtatás nélkül.

---

## M-06 — A `purchases` írása read-modify-write, tranzakció nélkül

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** közepes

A jogosultság-kezelés két helyen is beolvassa a felhasználó teljes `purchases`
listáját, majd a módosított teljes listát írja vissza:

- `src/lib/barion-callback/process-callback.ts` → `grantPurchases`
- `src/lib/refund/refund-order.ts` → `revokePurchases`

Mindkettő idempotens *önmagában*, de nem atomi. Ha ugyanahhoz a felhasználóhoz
két különböző fizetés callbackje egyszerre fut le (két kurzus egyidejű
vásárlása, vagy a `after()` és a retry-job egyidejű futása különböző
eseményeken), a két írás egymásra olvashat, és az egyik jogosultság elveszhet.

A dedup ezt nem zárja ki: az idempotencia **fizetésenként** véd, nem
felhasználónként.

**Megjegyzés a súlyról:** a hatás nem pénzügyi és javítható (a következő
callback vagy egy manuális pótlás visszaírja), de csendes — a vevő elveszíti a
hozzáférést anélkül, hogy bárhol hibaüzenet keletkezne.

**Javaslat:** a `purchases`-írás menjen tranzakcióban (Payload `req.transactionID`),
vagy a relationship-elem hozzáadása történjen sorszintű zárolással.
Ellenőrizendő, hogy a Payload postgres-adapter ad-e erre közvetlen eszközt.

> *2026-07-31, audit:* ez a tétel maga nem került külön ellenőrzésre, de a
> **M-10** ugyanezt a minta-hibát igazolta a `refunds` json-on, súlyosabb
> következménnyel. A kettőt érdemes együtt javítani — ugyanaz a
> read-modify-write séma, ugyanaz a hiányzó tranzakció.

---

## M-07 — A `payment_failed` rendelés-státusz egyetlen kódúton sem érhető el

**Státusz:** nyitott, **auditban megerősítve** · **Felvéve:** 2026-07-31 · **Súly:** közepes

> *2026-08-06 újraellenőrzés:* **változatlanul fennáll.** A
> `mapBarionPaymentStatus` `default` ága továbbra is `payment_pending`; a
> függvény fejlécdokumentációja időközben ki is mondja, hogy a `Failed` is ide
> fut („konzervatív default"). Az indoklás most már valós mentőhálóra épül (az
> `order-poll` job elkészült), de a `payment_failed` állapot továbbra sem áll be
> soha, és a véglegesen elbukott fizetés 24 órán át pollozódik, mielőtt árvának
> minősülne.

> A 2026-07-31-i mélyaudit független dimenzióban is megtalálta, és az
> adversarial ellenőrzés sem tudta megcáfolni. Kiegészítés: a `payment_failed`
> a `mapBarionPaymentStatus` visszatérési típusában (`OrderPaymentState`) meg
> sem jelenik, és a `PartiallySucceeded` is a `default` ágra fut. A státuszt a
> rendszerben kizárólag a checkout-start Barion-hibaága állítja be
> (`start-checkout.ts:279`) — a callback-út soha. Együtt olvasandó **M-09**-cel:
> a `pending_repoll`-lal lezárt esemény `processed` lesz, így az elbukott
> fizetés még egy későbbi callbackkel sem javítható ki.

Az `orders` állapotgép deklarál egy `payment_failed` értéket, de a
`src/lib/barion/state.ts` `mapBarionPaymentStatus` függvénye sosem képez rá:

```
Succeeded            → paid
Canceled, Expired    → cancelled
Prepared, Started    → payment_pending
minden más (default) → payment_pending
```

A Barion `Failed` (és a `Rejected`-jellegű) státuszok tehát a `default` ágon
`payment_pending`-ként jelennek meg. Következmény: a callback-feldolgozó
`pending_repoll` eredménnyel zárja az eseményt, a rendelés `payment_pending`-ben
marad, és a (még nem létező) poll-job végtelenül újrapollolná egy olyan
fizetést, amely már véglegesen elbukott.

**Javaslat:** a mapper egészüljön ki a `Failed` (és a Barion dokumentációja
szerint véglegesen sikertelen többi) státusszal → `payment_failed`, a
callback-feldolgozó pedig kapjon hozzá átmenet-ágat. A `default` maradhat
`payment_pending`, de érdemes naplózni az ismeretlen státuszt.

---

## M-08 — `as unknown as ...` castok a plugin-generált típusok körül

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** alacsony

A `CLAUDE.md` az `any`-t tiltja, és a repó ezt tartja is — helyette viszont
kezd terjedni a kétlépcsős cast:

- `refund-order.ts`: `as unknown as Parameters<Payload['find']>[0]` (kétszer),
  `as unknown as Record<string, unknown>` az `orders.update` adatára
- `payload.config.ts`: `'forms' as 'pages'` a form-builder slugjára
- `ecommerce.ts`: `as Field`, `as never` a mezőfa-bejárásban

Mindegyik indokolt ott, ahol a plugin generált típusai nem fedik a valóságot,
és a legtöbbjéhez magyarázó komment is tartozik. Együtt viszont ugyanazt a
típus-biztonságot oldják fel, amit az `any`-tilalom véd — csak láthatatlanabbul,
mert a lint nem jelzi őket.

**Javaslat:** nem sürgős. Amikor a `payload-types` és a plugin-típusok
összeérnek (lásd M-02), érdemes egy körben megnézni, melyik cast tűnhet el.

---

# Mélyaudit — 2026-07-31

Az alábbi tételek egy 5 dimenziós, ügynök-alapú mélyauditból származnak
(`f015bc3` alap-commit). Mindegyik átment egy **cáfolat-központú ellenőrzésen**:
a verifikátor feladata a találat megdöntése volt, és bizonytalanság esetén a
cáfolat nyert. Ami itt szerepel, azt az ellenőrzés sem tudta megcáfolni.

**Lefedettségi korlát:** dimenziónként csak a két legsúlyosabb találat került
ellenőrzésre; **13 további találat ellenőrizetlen maradt**, és szándékosan nem
került be. Ez a lista tehát nem teljes.

---

## M-09 — A dedup véglegesen elnyeli a fizetés későbbi, sikeres callbackjét

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/lib/barion-callback/route-handler.ts:130`

A webhook-dedup kulcsa kizárólag a `(provider='barion', externalId=PaymentId)`
pár — a Barion viszont **ugyanarra a PaymentId-ra több callbackot is küld**,
állapotváltásonként. A baj az, hogy a nem-végleges kimenetelek is `processed`
státuszba zárják az eseményt: a `payment_pending` ág
(`process-callback.ts:234`, `closeEvent(..., 'pending_repoll')`) és a
`rejected` ágak (261/270/284) után az `attemptProcessing` `processed`-re állít
(`idempotency.ts:151-156`).

**Forgatókönyv:** a vevő elindítja a fizetést, a Barion egy korai (InProgress /
Started / Authorized / Reserved) állapotról callbackot küld → az esemény
`pending_repoll` eredménnyel **véglegesen lezárul**. A vevő ezután **sikeresen
fizet**, a Barion újra POST-ol ugyanazzal a PaymentId-val → a handler
`duplicate` no-op 200-at ad. **A pénz levonódik, a rendelés örökre
`payment_pending` marad, a `purchases` sosem íródik be, a videó nem nézhető.**

Mentőháló nincs, és ez kettős zár: nem csak a route-handler 130-134. sora
dobja el, hanem a `processWebhook` `already-processed` ága is
(`idempotency.ts:201-209`) — így a retry-job sem tudná lefuttatni. A
`pending_repoll` értéket **egyetlen kódút sem olvassa**; a kommentekben ígért
poll-job nem létezik; a `webhook-retry` csak `received`/`failed` eseményeket
vesz fel (`webhook-retry.ts:59`); és nincs Barion-visszatérési (RedirectUrl)
reconcile-végpont sem.

**Javaslat:** a dedup kulcs ne csak a PaymentId legyen, vagy a nem-végleges
kimenetel (`pending_repoll`) ne zárja `processed`-re az eseményt. Amíg ez így
van, minden korai callback egy elveszett vásárlás kockázata.

> *2026-08-06 újraellenőrzés — a súly csökkent, a gyökérok megmaradt.*
> Elkészült az **`order-poll` szolgáltatás** (`src/lib/order-poll/service.ts` +
> `src/jobs/tasks/order-poll.ts`), amely **közvetlenül az `orders`
> collectionből** dolgozik (`where: { status: { equals: 'payment_pending' } }`),
> tehát **teljesen megkerüli a webhook-dedupot**. Ez az a második védővonal,
> aminek a hiányát a találat kimondta: az elnyelt callback után a rendelés így is
> lezárul.
>
> Két dolog viszont marad: (a) a callback-út gyökéroka változatlan — a
> `pending_repoll`-lal lezárt esemény továbbra is `processed`, és a későbbi
> sikeres callback továbbra is eldobódik; (b) a mentőháló az
> `ENABLE_JOB_WORKERS` mögötti job tényleges futásától függ, azaz a
> lezárás már nem eseményvezérelt, hanem poll-ciklus-késleltetésű.
>
> Érdemes megjegyezni: a szolgáltatás kommentje egy valós incidenst rögzít —
> az árva-rendelés türelmi ideje 2 óráról 24 órára nőtt, mert a 2 óra után
> befejeződő fizetés a `paid-not-allowed` állapotgép-védelembe ütközött,
> „pénz felvéve, kurzus nem". Ez ugyanannak a hibaosztálynak egy másik ága,
> élesben megtapasztalva.

---

## M-10 — Párhuzamos refundok elvesztik egymás nyomát

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/lib/refund/refund-order.ts:385`

A refund-folyamat végig **egyetlen, a legelején beolvasott order-pillanatképből**
dolgozik, és a `refunds` json-t teljes tömb-felülírással írja vissza —
zárolás, verzió-ellenőrzés és tranzakció nélkül.

**Forgatókönyv:** 10 000 Ft-os `paid` rendelésre két párhuzamos refund-hívás
érkezik, egyenként 5000 Ft-tal (duplán elküldött admin-kérés is elég). Mindkettő
üres `refunds`-ot olvas, mindkettő átmegy a validáción, **mindkettőt elfogadja a
Barion — összesen 10 000 Ft ténylegesen visszautalva**. A visszaírásnál viszont
mindkét szál az elavult, üres tömbből indul, így a `refunds` végül **egyetlen
5000-es bejegyzést** tartalmaz.

Súlyosbító részlet: a `type` (`partial`/`full`) döntés is az elavult
pillanatképből számolt `alreadyRefunded`-re épül (301. sor), ezért **mindkét szál
a `partial` ágra fut, és egyik sem hívja a `revokePurchases`-t**. Végállapot: a
teljes vételár visszautalva, a rendelés `paid`, a vevő korlátlanul streamel, a
könyvelés szerint pedig 5000 Ft térült vissza.

**Javaslat:** a refund menjen tranzakcióban, és a `refunds` írása olvassa újra a
rendelést a záráskor (vagy használjon append-szemantikát). Ugyanaz a
minta-hiba, mint M-06 — ott a `purchases`, itt a `refunds`.

---

## M-11 — A Barion tranzakció-szintű refund-státusz ellenőrizetlen

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/lib/refund/refund-order.ts:374`

A kód a `RefundedTransactions[0].Status` értékét **eltárolja, de sosem ágazik el
rá**. Bármilyen státusz mellett — beleértve a `RefundFailed`-et, amelyet a repó
saját típusdefiníciója is felsorol (`src/lib/barion/types.ts:156`) — a rendelést
`refunded`-re állítja, levonja a `purchases`-jogosultságot, és 200-zal tér
vissza. Hiányzó/üres `RefundedTransactions` esetén `'Unknown'` státusszal
ugyanígy „sikeres".

**Forgatókönyv:** a kártyakibocsátó elutasítja a jóváírást → HTTP 200, üres
`Errors`, de `Status: 'RefundFailed'`. **A vevő elveszíti a hozzáférést, a pénzét
viszont nem kapja vissza.**

És nem javítható az API-n: az újrapróbálás a 240-242. sori védelembe ütközik
(409, „már visszatérítésre került"), a `refunds` mező pedig
`create/update: () => false` + `admin.readOnly`, tehát **az admin felületről sem
korrigálható** — csak közvetlen adatbázis-beavatkozással. Részrefundnál is
károsít: a sikertelen összeg beszámít a „már visszatérített" keretbe, és
korlátozza a későbbi, valódi visszatérítést.

**Javaslat:** a sikeres refund feltétele legyen a tranzakció-szintű státusz
explicit ellenőrzése; ismeretlen vagy sikertelen státusznál a rendelés maradjon
érintetlen, és a hívó kapjon hibát.

> *2026-08-06 újraellenőrzés:* **változatlanul fennáll.** A
> `refundedTransactionStatus` továbbra is csak eltárolódik
> (`refund-order.ts:383-384`), egyetlen elágazás sem épül rá.

---

## M-12 — Staff bármely felhasználó (owner is) jelszavát és e-mail-címét átírhatja

**Státusz:** emberi döntésre vár · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/collections/Users.ts:23`

A `users` collection `update` access-e (`isSelfOrAdmin`) a **staff** szerepkörnek
where-szűkítés nélkül írásjogot ad **minden** felhasználói rekordra, a Payload
auth által hozzáadott `password` és `email` mezőkön pedig **nincs mezőszintű
védelem** — a gondos `role` és `purchases` védelem ezekre nem terjed ki.

**Forgatókönyv:** egy staff felhasználó `PATCH /api/users/<owner-id>` kérést küld
`{"password":"..."}` törzzsel. Ezután belép ownerként: refundot indíthat, árat és
publikálást módosíthat, olvashatja az owner-only pénzügyi mezőket és az
audit-logokat. **A `src/plugins/audit.ts` csak a `role` változását auditálja,
így erről a jogemelésről audit-bejegyzés sem keletkezik.** Ugyanígy bármely
vevő fiókjába belépve megkapja annak összes videójára a lejátszási tokent.

Pontosítás: ehhez érvényes staff-hitelesítés kell (belső visszaélés vagy
kompromittált fiók) — nyilvános regisztrációval nem érhető el, mert a `role`
owner-only field-access-e miatt minden regisztráló `customer` marad.

**Javaslat:** a `password` és `email` mező kapjon `isSelfOrAdmin`-nál szűkebb
field-access-t (saját rekord vagy owner), vagy a `users.update` szűküljön
staffra nézve saját rekordra. **A `CLAUDE.md` 4. pontja szerint ez
access-control módosítás — emberi jóváhagyás nélkül nem nyúlunk hozzá.**

> *2026-08-06 újraellenőrzés:* **változatlanul fennáll.** A `users.update`
> továbbra is `isSelfOrAdmin`, és a `password`/`email` mezőn nincs
> field-access. Időközben bekerült egy jelszó-politika hook
> (`src/lib/security/password-policy.ts`) — az viszont a jelszó *erősségét*
> szabályozza, nem azt, hogy **ki** írhatja felül. A tétel érintetlen.
> Megjegyzés: az OWASP-kódvizsgálat (`3c74335`) és a Users access-mátrix
> helyreállítása (`7d2be53`) is lefutott azóta, de ezt a rést nem zárta.

---

## M-13 — Az `accessDurationDays` (lejáró hozzáférés) sehol nincs kikényszerítve

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** közepes
**Hely:** `src/lib/stream/issue-stream-token.ts:131`

A paywall kizárólag **statikus** feltételeket néz: a `users.purchases` tagságot
és a termék `published`/`archived` státuszát. Időbeli feltétel egyik sem.

A termék `accessDurationDays` mezője — amelynek leírása szerint „hány napig
érvényes a hozzáférés vásárlás után" — a teljes `src/` fában **csak a
meződefinícióban és a generált típusokban szerepel, üzleti logikában sehol**.
Ráadásul a `purchases` sima relationship, vásárlási időbélyeg nélkül, így a
lejárat a jogosultsági bejegyzésből ki sem számítható — a rendelés dátumára
kellene visszanyúlni.

**Forgatókönyv:** 30 napra megvásárolt kurzus 2 évvel később is korlátlanul
nézhető. Lejáratkor semmilyen hook vagy job nem veszi le a jogosultságot; a
`purchases` egyetlen visszavonási útja a teljes refund.

**Javaslat:** vagy a token-kiállítás ellenőrizze a lejáratot (a rendelés
dátumából), vagy a mező kerüljön ki, amíg nincs mögötte logika — jelenleg egy
üzleti ígéretet dokumentál, amit a rendszer nem tart be.

---

## M-14 — A kimerült webhook-események véglegesen elzárják a retry-batchet

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/jobs/tasks/webhook-retry.ts:57`

A retry-job fix, `updatedAt` szerint **növekvő** sorrendű, 25 elemű lapot kér a
`received`/`failed` eseményekből — de nem szűri ki a véglegesen elakadt
rekordokat, és nem is írja át őket. Két ilyen „fejlap-foglaló" osztály van:

1. a `MAX_WEBHOOK_ATTEMPTS`-et elért események (78-88. sor: csak számláló +
   `logger.error`, majd `continue` — semmilyen `store.update`),
2. a regisztrálatlan providerű események (72-76. sor: `skipped`, szintén update
   nélkül).

Mivel a `WebhookEvents` collectionben **nincs terminális státusz**, az
`update`/`delete` access `() => false`, és nincs takarító job, ezeknek az
`updatedAt`-ja véglegesen befagy — így örökre a lap elején maradnak.

**Forgatókönyv:** 25 ilyen rekord összegyűlik → **a retry-job érdemben halott**.
Minden új sikertelen callback kiszorul a lapról. A vevő fizet, a Barion 5
kézbesítés után feladja, a rendelés `payment_pending` marad. A hiba egyetlen
jele: percenként ugyanaz a 25 error-sor (napi ~36 000 fals riasztás), amiben a
valódi új hibák láthatatlanok.

**Javaslat:** a lekérdezés zárja ki a kimerített rekordokat (terminális státusz
vagy `attempts` szűrő), és a kimerülés írjon státuszt, ne csak logot.

---

## M-15 — A retry-job feldolgozója csak a callback-route betöltése után létezik

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/app/(frontend)/api/barion/callback/route.ts:20`

A `'barion'` webhook-processzor regisztrációja **kizárólag a route-modul
import-mellékhatása**, és egy in-process `Map`-be kerül
(`idempotency.ts:251-264`). A `payload.config.ts` / `src/jobs/index.ts` /
`src/instrumentation.ts` útvonalon **semmi nem tölti be ezt a modult**, a
retry-job viszont a Payload-példányból fut.

**Forgatókönyv:** újraindítás után marad néhány `failed` esemény. A percenkénti
cron lefut, de amíg nem érkezik új callback **ugyanabba a Node-folyamatba**, a
`getWebhookProcessor('barion')` `undefined` → `skipped`, `continue`. Ez a
naplóban **megkülönböztethetetlen** a „még nem esedékes" esettől: mindkettő
ugyanabba a `skipped` számlálóba megy (72-76 és 89-92. sor).

Pontosítás: egyprocesszes `next start` deploynál ez nem véglegesen halott ág —
az első beérkező callback (a duplikátum-ágon is) betölti a modult, tehát
„önjavul". A valós kockázat az **újraindítás és az első callback közötti
ablak**, illetve az olyan futtatókörnyezet, ahol a cron-worker sosem szolgál ki
HTTP-kérést.

**Javaslat:** a regisztráció költözzön a `payload.config` / `instrumentation`
útvonalra, és a `skipped` számláló váljon szét (nincs processzor ≠ nem
esedékes).

> *2026-08-06 újraellenőrzés:* **változatlanul fennáll.** A
> `registerBarionWebhookProcessor` hívása továbbra is csak a callback-route
> modulban van; sem a `payload.config.ts`, sem a `src/jobs/index.ts`, sem az
> `src/instrumentation.ts` nem tölti be. Enyhítő körülmény, hogy az `order-poll`
> job (lásd M-09) már nem függ ettől a regisztrációtól.

---

## M-16 — Az ár-integritási hookot egyetlen futó teszt sem fedi le

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas
**Hely:** `src/__tests__/order-snapshots.test.ts:32`

Az `orderIntegrityBeforeChange` (`src/lib/order-integrity.ts`) — a szerver-oldali
ár-snapshot és végösszeg-számítás, a fizetési lánc integritásának alapja —
viselkedését **egyetlen alapértelmezésben futó teszt sem ellenőrzi**:

- az egyedüli viselkedési tesztek (`order-snapshots.test.ts`) DB-hez kötöttek és
  `describe.skipIf(!hasDb)` miatt kihagyódnak (a repóban nincs `.env`, nincs
  vitest `setupFile`, és nincs CI-workflow sem — lásd M-01),
- az `access.test.ts:318` csak azt nézi, hogy a hook **be van-e kötve**,
- a `checkout-start.test.ts` a `payload.create` mockjával **a hook kimenetét adja
  vissza fixtúraként**, így a `Total === 5000` assertek a fixtúrát ellenőrzik,
  nem a kódot.

**Forgatókönyv:** valaki elrontja a `totalHuf` összegzést (pl. kiesik a
`quantity`), vagy a snapshot a kliens által küldött árat tartja meg. **`npm run
test` teljesen zöld marad.** Élesben ez rossz végösszeggel indított
Barion-fizetés: a `start-checkout.ts:260-266` közvetlenül a hook által írt
`totalHufSnapshot`-ból veszi a fizetendő összeget, és **sem a callback, sem más
réteg nem ellenőrzi újra**.

**Javaslat:** a hook kapjon DB-független unit-tesztet (a Payload-hívások
mockolásával, de a hook valódi futtatásával). Ez az M-01-nél is konkrétabb ok
a CI beüzemelésére.
