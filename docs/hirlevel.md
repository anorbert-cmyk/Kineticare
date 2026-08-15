# Hírlevél-feliratkozás (C9)

A lábléc hírlevél-feliratkozó űrlapja: mit lát a szerkesztő, mit lát az
üzemeltető, és mi az, ami **szándékosan nincs bekötve**.

---

## 1. Szerkesztőknek (Kata, Kata)

### Hol jelennek meg a feliratkozások?

Az admin bal oldalsávján: **Űrlapok → Űrlapbeküldések**. Ugyanaz a lista, ahová a
kapcsolat-űrlap üzenetei is érkeznek, ezért az **Űrlap** oszlop mondja meg,
melyik miféle:

- `Kapcsolat` → valaki üzenetet írt a kapcsolat-oldalon,
- `Hírlevél` → valaki feliratkozott a láblécből.

Csak a `Hírlevél` sorokat a lista **Szűrők** gombjával kapod meg: *Űrlap* mező →
*Hírlevél*. A beküldés megnyitva két sort tartalmaz:

| Mező | Érték |
| --- | --- |
| `email` | a feliratkozó e-mail-címe |
| `consentNewsletter` | `true` — a megadott hozzájárulás |

A beküldés **ideje** a `createdAt` oszlopban látszik (a lista alapból az
Űrlap · Létrehozva · Azonosító oszlopokat mutatja). A lista **csak olvasásra**
való: a beküldéseket szerkeszteni nem érdemes, törölni viszont lehet (pl. ha
valaki leiratkozást kér — lásd lentebb).

> A beküldéseket **csak staff és owner** jogosultságú felhasználó láthatja
> (`formSubmissionOverrides.access.read: isAdmin`), a vásárlók nem.

### Hogyan lehet exportálni?

Kész, egykattintásos CSV-export **ma nincs** (a Payload import-export
plugin nincs telepítve, és új függőséget ez a feladat nem vezetett be). Két
járható út:

1. **Az admin listából kézzel.** A lista oldalanként megjeleníti a beküldéseket;
   a címeket ki lehet másolni. Néhány tucat feliratkozásig ez a leggyorsabb.
2. **Lekérdezés a bejelentkezett admin-munkamenettel** (ezt kérd a
   fejlesztőtől/üzemeltetőtől). A form-submissions REST-végpont ugyanazokat a
   sorokat adja JSON-ban, űrlapra szűrve és lapozva:

   ```
   GET /api/form-submissions?where[form][equals]=<a Hírlevél űrlap azonosítója>&limit=200&depth=0
   ```

   Az űrlap azonosítója az Űrlapok listán, a `Hírlevél` sor megnyitásakor az
   URL végén látszik. A válasz `submissionData` sorai tartalmazzák az
   e-mail-címeket; ebből néhány perc alatt készíthető CSV a Resend-importhoz.

**Nyitott kérdés a csapatnak:** ha a hírlevél tényleg elindul, érdemes lehet egy
gombos CSV-exportot kérni (ez vagy a hivatalos import-export plugin
telepítését, vagy egy saját, staff-jogosultságú export-végpontot jelent —
mindkettő külön feladat).

### A jogi szöveg — és hogy miért pont ez

A pipálandó szöveg a láblécben:

> Hozzájárulok, hogy a Kineticare hírlevelet küldjön a megadott
> e-mail-címemre, és hogy adataimat az **Adatkezelési és adatvédelmi
> szabályzat** szerint kezelje. A hozzájárulás bármikor visszavonható.

Amit a GDPR miatt egyben tartalmaz:

- **cél** („hírlevelet küldjön") — a hozzájárulás csak arra a célra szól,
  amit megnevez; ezért NEM ugyanaz a jelölőnégyzet, mint a kapcsolat-űrlapé
  (ott a cél az üzenet megválaszolása). A két mezőnév is külön:
  `consentNewsletter` és `consentPrivacy`;
- **milyen adat** („a megadott e-mail-címemre");
- **tájékoztatás** — az `/adatvedelem` oldalra mutató link, hogy a látogató a
  pipálás ELŐTT egy kattintással elérje a részleteket;
- **visszavonhatóság** („bármikor visszavonható").

A négyzet **soha nincs előre bepipálva**, és kitöltése nélkül a feliratkozás
sem a böngészőben, sem a szerveren nem megy át (a szerveroldali ellenőrzés
azért kell, mert az űrlap-végpont nyilvános).

A szöveg egyetlen helyen él (`src/lib/newsletter/consent-text.ts`), és ugyanez
kerül az admin „Hírlevél" űrlapjának jelölőnégyzet-feliratába is — ha
változtatni kell rajta, **szóljatok a fejlesztőnek**, mert a két helyen
együtt kell módosulnia.

### Leiratkozás

Automatikus leiratkozó link **még nincs** (nincs kiküldő rendszer bekötve).
Amíg kézzel megy a küldés: ha valaki leiratkozást kér, a beküldését az
Űrlapbeküldések listán **töröljétek**, és a Resend-listáról is vegyétek ki.

### Hogyan kapcsolódik (majd) a Resend-hírlevélküldés?

Ma a Resend **csak tranzakciós** leveleket küld (rendelés-visszaigazolás,
jelszó-emlékeztető, staff-értesítő — `src/lib/email/resend.ts`). A hírlevél
(broadcast) küldése ettől külön világ: a Resendben *Audience* (címlista) +
*Broadcast* (kiküldött levél) kell hozzá.

A ma működő, kézi kör:

1. a feliratkozók címeit kiexportáljátok (2. pont),
2. a Resend felületén importáljátok az Audience-be,
3. ott állítjátok össze és küldítek a Broadcastot (a Resend a leiratkozó
   linket automatikusan kezeli az Audience-en).

Az automatikus kör (feliratkozáskor a cím azonnal a Resend Audience-be kerül)
**nincs bekötve**: kellene hozzá egy Audience-azonosító környezeti változó és
egy hook a beküldésre. Ez tudatos halasztás — előbb dőljön el, hogy melyik
Audience-be, milyen mezőkkel és kinek a jóváhagyásával kerülhet ki adat.

---

## 2. Üzemeltetőnek / fejlesztőnek

### Mi van bekötve

| Réteg | Hol |
| --- | --- |
| Az űrlap maga (form-builder **adat**, nem séma) | `src/lib/newsletter/form.ts` — `ensureNewsletterForm`, a seedből hívva |
| Seed (idempotens, meglévőt sosem ír felül) | `src/scripts/seed.ts` — a teljes seedben ÉS a `SEED_SCOPE=kezdolap` (éles) hatókörben |
| Lábléc-blokk (szerver) | `src/components/layout/NewsletterSignup.tsx` (űrlap-azonosító + Turnstile-kulcs feloldása) |
| Lábléc-űrlap (kliens) | `src/components/layout/NewsletterForm.tsx` |
| Validáció (kliens ÉS szerver, egy fájlban) | `src/lib/newsletter/validation.ts` |
| Beküldés | `src/lib/newsletter/submit.ts` → `POST /api/form-submissions` |
| Jogi szöveg | `src/lib/newsletter/consent-text.ts` |
| Megjelenés | `src/app/(frontend)/styles/layout.css` — `.kc-newsletter*` |
| Tesztek | `src/__tests__/newsletter.test.ts`, `src/__tests__/newsletter-ui.test.tsx` |

**Nincs séma-változás és nincs migráció.** A form-builder űrlapja a `forms`
collection egy SORA, a feliratkozás pedig egy `form-submissions` sor — mindkettő
adat. (CLAUDE.md 3. tilos zóna.)

**Nincs új npm-függőség.**

### A beküldés útja

1. A kliens validál (magyar hibaüzenetek, hozzájárulás kötelező) — hiba esetén
   **nem indul hálózati hívás**.
2. `POST /api/form-submissions` — a form-builder plugin nyilvános create-je,
   `{ form, submissionData: [{ field: 'email' }, { field: 'consentNewsletter' }] }`
   törzzsel. Saját route nincs, ahogy a kapcsolat-űrlapnál sem.
3. **Kérés-korlát:** az útvonal a `form-submission` osztályba esik —
   **5 kérés / 10 perc / IP** (`src/lib/security/rate-limit.ts`). Ez a keret a
   **kapcsolat-űrlappal KÖZÖS** (ugyanaz az útvonal, ugyanaz a vödör): aki
   üzenetet is írt és fel is iratkozik, ugyanabból az 5-ből fogyaszt. A
   korlátot ez a munka **nem módosította**.
4. **Spam-védelem:** honeypot (rejtett `website` mező) + Cloudflare Turnstile.
   A Turnstile ugyanúgy környezetfüggő, mint a kapcsolat-űrlapon: `TURNSTILE_SECRET_KEY`
   nélkül a szerver nem ellenőriz, `TURNSTILE_SITE_KEY` nélkül a widget meg sem
   jelenik. Eltérés: a láblécben a widget csak az űrlap **első érintésekor**
   töltődik be (a lábléc minden oldalon ott van — a Cloudflare-szkriptet nem
   akarjuk minden oldalletöltéskor behúzni).
5. **Szerveroldali ellenőrzés:** a `form-submissions` `beforeValidate` hookja
   (`src/payload.config.ts`) az űrlap CÍME alapján dönti el, melyik szerződés
   szerint ellenőrizzen — `Hírlevél` → e-mail + `consentNewsletter`, minden más
   → a kapcsolat-szerződés. Enélkül a feliratkozás a kapcsolat-űrlap kötelező
   mezőin bukna el. Ismeretlen/feloldhatatlan űrlapnál a **szigorúbb**
   (kapcsolat-) szabály fut.
6. **Staff-értesítő nem megy ki** feliratkozáskor (a `contact-staff` sablon a
   kapcsolat-üzenetre való, és minden feliratkozás levelet gyártana).

### Mi NINCS bekötve — és mi kellene hozzá

- **Dupla opt-in (double opt-in): NINCS.** A feliratkozás a beküldéssel azonnal
  „kész": nincs megerősítő e-mail, nincs megerősítő link, és nincs olyan
  állapot, ami megkülönböztetné a megerősített feliratkozót a nem
  megerősítettől. Gyakorlati következmény: idegen e-mail-cím is beírható
  (bárki feliratkoztathat mást), és a lista minősége az első kiküldésig nem
  ellenőrzött.
  Amit igényelne: (a) állapot + megerősítő token tárolása — ez a
  `form-submissions` collectionben **mezőt, tehát séma-változást és migrációt**
  jelentene, vagy egy külön `newsletter-subscribers` collectiont; (b) megerősítő
  e-mail-sablon (a meglévő `src/lib/email/templates` mintájára); (c) nyilvános
  megerősítő route a tokennel; (d) lejárat és újraküldés kezelése. Ez önálló
  feladat, emberi jóváhagyással — a séma-változás miatt **nem** fér bele egy
  „lábléc-űrlap" tikettbe.
- **Duplikátum-szűrés: NINCS.** Ha valaki kétszer iratkozik fel, két beküldés
  keletkezik; a szerkesztő a listán látja őket, és a Resend-importnál a
  duplikátumok úgyis összeolvadnak (a Resend Audience e-mail-címre egyedi).
  Elegáns, séma nélküli megoldás elvben van (a beküldés előtt lekérdezni,
  van-e már ugyanilyen című beküldés ugyanarra az űrlapra, és duplikátumnál
  hibát dobni) — ez viszont **elárulná, hogy egy cím szerepel-e már a
  listán** (cím-szondázás), ezért nem magától értetődő; döntést igényel.
- **Automatikus Resend-szinkron: NINCS** (lásd az 1. rész végét).
- **Leiratkozó link: NINCS** (kézi törlés az adminban).

### Üzemeltetési tudnivalók

- **Az űrlapnak léteznie kell**, különben a lábléc feliratkozó-blokkja NEM
  jelenik meg (a hiba nem néma: `warn` a strukturált naplóban). Új környezetben
  ezért a `npm run seed` — élesben `SEED_SCOPE=kezdolap npm run seed` — futtatása
  kötelező lépés. A seed idempotens: meglévő `Hírlevél` űrlapot **nem ír felül**,
  tehát a szerkesztői módosítások (mezőfelirat, gombfelirat) megmaradnak.
- **Az `/adatvedelem` oldalnak LÉTEZNIE kell.** A hozzájárulás szövege oda
  linkel, tehát a jogszerűség múlik rajta. A helyi fejlesztői adatbázisban a
  három jogi oldal (`/adatvedelem`, `/aszf`, `/impresszum`) ma **404** — ezek
  CMS-oldalak, a láblécből eddig is hivatkozva. Élesítés előtt ellenőrizni kell,
  hogy publikálva vannak-e.
- Az űrlapot az adminban átnevezni **nem szabad**: a szerveroldali szerződés-
  választás és a lábléc lekérdezése is a `Hírlevél` CÍMRE illeszt. A mezőnevek
  (`email`, `consentNewsletter`) ugyanígy a szerződés részei.
