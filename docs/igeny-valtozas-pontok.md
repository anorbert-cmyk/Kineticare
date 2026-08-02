# Megrendelői igény-specifikáció → változási pontok a tervhez

**Forrás:** Katák e-mail (2026-08-02, szerdai egyeztetés után) — a teljes szöveg: `megrendeloi-igeny-specifikacio.txt`
**Állapot:** a meglévő terv 95%-a fedi; az alábbi 5 pont új vagy módosított követelmény.

## 1. Tematikus al-kurzusok (a nagy kurzus felbontása)
- **Igény:** az „Otthoni Kézrehab" több kisebb, tematikus kurzusra bontva: „Otthoni Kézrehab- Teniszkönyök", „- Kéztőalagút szindróma", „- Pattanó ujj" stb.
- **Leképezés:** külön `products` entitások, közös `category` („Otthoni Kézrehab") kapcsolattal; a kurzuslista kategória-szűrője és a kurzus-oldal ezt támogatja. A `sku` mint display-név a tematikus neveket hordozza (pl. `OTTHONI-KEZREHAB-TENISZKONYOK`).
- **Ticket:** T-0xx — a kurzus-struktúra seedje és a kategória-hierarchia (laikusoknak/szakembereknek fő kategóriák, alattuk a tematikus termékek).

## 2. Fő oldal → al-landingek („laikusoknak" / "szakembereknek")
- **Igény:** egy fő kurzusoldalról elérhető tematikus landingek (pl. „Laikusoknak kurzusok" → Ingyenes segítség, Otthoni Kézrehab teljes, Otthoni Kézrehab- Teniszkönyök stb.; „Szakembereknek" → Kézkurzus, Szakkönyv).
- **Leképezés:** a menüfa (2 szint) + a kurzuslista kategória-szűrője már támogatja; a „fő oldal" mint kategória-landing a `pages` CMS-oldal + a hozzá rendelt terméklista (a meglévő kurzuslista komponens újrafelhasználásával).

## 3. Ingyenes kurzus is legyen (SOS Kézrehab ingyenes)
- **Igény:** ingyenesen letölthető/elérhető kurzus (SOS Kézrehab).
- **Leképezés:** `priceInHUFEnabled: false` + CTA-állapot „Ingyenes — azonnal eléred" (regisztráció után purchases-be kerül, Barion NEM kell). A resolveCourseCta bővítése: `free` kind (priceInHUFEnabled false + published). A checkout-flow az ingyenes terméket kihagyja (nincs fizetés, csak hozzáférés).

## 4. Hírlevél-feliratkozás
- **Igény:** „Egyszerű kapcsolat hírlevélküldő rendszerrel" — a kérdés: mennyi értelme van?
- **Javaslat:** érdemes, de egyszerűen: egy e-mail-gyűjtő mező a láblécbe + a kapcsolat-űrlaphoz kapcsolódva. NEM kell külön hírlevél-rendszer (Mailchimp stb.) első körben — a feliratkozók a form-submissions-be vagy egy `newsletter-subscribers` egyszerű gyűjtőbe kerülnek, később exportálhatók. A kérdésre a válasz a megrendelőnek: „Igen, érdemes — a blog + az ingyenes kurzus a feliratkozó-feltétel, és a feliratkozók a legjobb vásárlók."

## 5. Meglévő vásárlók migrálása (hozzáférés + kommunikáció)
- **Igény:** a jelenlegi vásárlók hozzáférése az új rendszerben is, minimális érzékelhetőséggel; „CNN/NASA-s" kommunikáció.
- **Leképezés:** a T-061 tartalommigráció bővítése: (a) a meglévő vevők importja a users+purchases-be (e-mail-cím alapján, jelszó-reset-linkkel az első belépéshez); (b) kommunikációs csomag: személyes e-mail („költöztünk, a hozzáférésed ugyanazzal az e-mail-címeddel működik"), átmeneti banner az első bejelentkezéskor, és egy GYIK oldal. A „CNN/NASA" minta: nagy, nyugodt, emberi hangú átállás-üzenet, nem technikai.

## További pontok (már lefedve a tervben, de a specifikáció megerősíti)
- „Résztvevők manuális hozzáadása" → owner-indítású purchases-hozzáadás az adminban (T-0yy).
- „melyik kurzust végezte el" → a videos[].status + egy „completed" jelölés a purchases-en (Phase 2; most a lejátszás-tény elég).
- SEO („fáj a kezem", „teniszkönyök") → blog + JSON-LD + a products displayTitle+slug backlog-ticket (F3).
- Költség-optimalizálás → a Railway + Cloudflare Stream a jelenlegi ~127 e Ft/év alatt marad (a becslés a tanulmányban).
