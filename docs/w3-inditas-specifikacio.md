# W3 indítás — a megrendelői igény-specifikáció beépítve

**Dátum:** 2026-08-02 · **A W3-hullám vezető-briefjei az alábbi változásokkal frissülnek.**

A Katák igény-specifikációja (`docs/megrendeloi-igeny-specifikacio.txt` és `docs/igeny-valtozas-pontok.md`) a W3-hullámot az alábbi pontokkal módosítja/kalibrálja:

## A W3-briefekbe beépítendő változások

### 5D (auth + fiók + kurzusaim + lejátszó)
- **Ingyenes kurzus-hozzáférés:** az ingyenes (priceInHUFEnabled: false) kurzus a regisztráció után purchases-be kerül, Barion nélkül — a kurzusaim listában és a lejátszóban is megjelenjen (a stream-token paywall a purchases-t már kezeli).
- **Migrációs banner:** az első bejelentkezéskor egy „Átköltöztünk — a hozzáférésed ugyanazzal az e-mail-címeddel működik" banner (a T-061 migráció része, a W3-ban mint a fiók-áttekintés első eleme).
- **Hírlevél-feliratkozás:** a fiók-áttekintésbe egy egyszerű e-mail-feliratkozó mező (a láblécbe is kerülhet, de a fiók a természetes helye) — a feliratkozások a form-submissions-be vagy egy egyszerű gyűjtőbe (a 5F kapcsolat-űrlap mintájára, de külön típussal: `newsletter`).

### 5E (kosár/penztár + köszönő/sikertelen + waiver)
- **Ingyenes termék a kosárban:** az ingyenes termék NEM megy át a Barion checkouton — a kosár/penztár a `priceInHUFEnabled: false` terméket „Ingyenes — azonnal eléred" CTA-val kezeli (regisztráció után purchases-be, nincs fizetés, nincs waiver-checkbox). A resolveCourseCta `free` kind-ja itt is él.
- **Tematikus kurzusok a kosárban:** a kosár a tematikus al-kurzusokat (közös kategória, külön product) is támogatja — a terméklista a kategóriát is mutassa (pl. „Otthoni Kézrehab — Teniszkönyök").
- A jogszabály szerinti két waiver-checkbox és a „Megrendelés és fizetés" gomb változatlanul a fizetős termékekre vonatkozik.

## A W3-utáni backlog (a vezető nyilvántartja)
- T-0xx: a kurzus-struktúra seedje (laikusoknak/szakembereknek fő kategóriák + tematikus termékek + ingyenes SOS Kézrehab) — a kategória-hierarchia és a seed.
- T-0yy: owner-indítású purchases-hozzáadás az adminban (résztvevők manuális hozzáadása).
- T-061-bővítés: a meglévő vevők importja + kommunikációs csomag (e-mail + banner + GYIK).
- F3: products displayTitle + slug mező (SEO — a tematikus kurzusok slug-os útvonalai).

**A W3 briefek ezekkel a pontokkal küldendők a workereknek.**
