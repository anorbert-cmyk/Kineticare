# Google Ads kampány-csomag — mért adatból, indításra kész

> **Mikor készült:** 2026-08-21.
> **Miből:** `docs/kulcsszavak.md`, `docs/monid-adatok-teljes.md`,
> `docs/kampanyterv-mert-adatokbol.md`, `docs/vevohang-es-hirdetesszoveg.md`
> mért adatai, valamint a repó saját tényei (termékárak, útvonalak,
> analitika-kód). Külső szabályok: a Google hivatalos súgója és
> hirdetési szabályzata, hivatkozásokkal a 12. fejezetben.
>
> **Minden karakterszám ebben a dokumentumban MÉRT**, nem becsült: a
> `docs/adwords-kampany.md` hirdetésszövegeit egy számláló szkript
> ellenőrizte, és a táblázatok abból generálódtak. A 30/90-es korlátot
> egyetlen sor sem lépi túl.
>
> **Ez nem orvosi tartalom.** A hirdetésszövegek egyetlen klinikai
> állítást sem tartalmaznak, és nem tesznek ígéretet gyógyulásra,
> gyógyulási időre vagy arányra. Ez nem stílus, hanem szabály: lásd az
> 1.3 és a 11. fejezetet.

---

## 0. Három dolog, ami nélkül a kampányt NEM szabad elindítani

Ezek nem javaslatok. Mindhárom mérhető, mindhárom blokkoló, és
mindhárom a hirdetési pénz elégetését jelenti, ha kimarad.

### 0.1 A domain még a régi oldalt szolgálja ki

A `docs/kampanyterv-mert-adatokbol.md` 9/a pontja mérte: amíg a
`www.kineticare.hu` a régi Systeme.io oldalt adja vissza, a hirdetés oda
viszi a fizetett forgalmat. Ott **nincs PostHog, nincs GA4, nincs
consent-sáv, és nincsenek a cikkek** sem. Az egész 9. fejezet
(konverziómérés) az új platformra épül.

**Amíg a domain nem áll át, egyetlen hirdetés sem indulhat.**

### 0.2 A Google Ads önmagában NEM fog konverziót mérni nálunk

Ez mért, kétszeresen:

1. A `src/lib/analytics/ga4.ts`-ben a hozzájárulás megadásakor kimenő
   jelzés szó szerint `CONSENT_MODE_GRANTED = { analytics_storage: 'granted' }`.
   A hirdetési tárolók (`ad_storage`, `ad_user_data`, `ad_personalization`)
   **sosem nyílnak meg** — a `docs/ga4.md` 3. pontja ezt kifejezett
   döntésként rögzíti. Vagyis egy Google Ads konverziócímke süti nélkül,
   csak modellezésre hagyatkozva futna.
2. A Google saját küszöbe a konverzió-modellezéshez **7 nap alatt 700
   hirdetéskattintás** domain × ország bontásban. A 8. fejezet mért
   keretéből 7 nap alatt **48–83 kattintás** jön össze. Ez egy
   nagyságrenddel kevesebb.

**Következtetés:** ezen a kereten a Google Ads felülete gyakorlatilag
nulla konverziót fog mutatni, akkor is, ha valójában születik vásárlás.
A mérés a MI oldalunkon történik (PostHog), a Google Ads pedig
kattintás- és költségadatot ad. A 9. fejezet ezt írja le részletesen.

### 0.3 A kurzusoldal jelenlegi szövege ígéretet tartalmaz

A `src/scripts/restore-legacy-content.ts` `kezrehabLongDescription`
szövege ma ezt mondja: „amivel **megszüntetheted vagy jelentősen
enyhítheted** a csukló-, ujj-, alkar- és könyökfájdalmakat, **akár hetek
alatt**".

Ez eredmény-ígéret konkrét időtávval. A Google „Unreliable claims"
szabálya éppen az ilyet tiltja: nem szabad olyan eredménnyel csábítani,
ami nem a tipikus kimenet. A szabály **a céloldalra is vonatkozik**, nem
csak a hirdetésre, és a `docs/vevohang-es-hirdetesszoveg.md` 4. pontja
mérte, hogy a versenytársnál pont az ilyen ígéret ütött vissza a
véleményekben.

**Teendő:** a mondat átírása felületi munka, tehát a
`.claude/skills/termektervezes` hatálya alá tartozik, és nem ebben a
körben történik. **De a hirdetés addig sem indulhat**, amíg ott van:
a hirdetésszöveg fegyelmezettsége hiába ép, ha a céloldal a szabályba
ütközik. Ez a 11. fejezet K1 kérdése.

---

## 1. Amit a mérés mond, és amit ebből építünk

### 1.1 A kattintás ára: a két forrás 20–40-szeresen eltér

Ez a legfontosabb szám az egész tervben, és a két meglévő dokumentum
**ellentmond egymásnak**:

| Kifejezés | Semrush CPC (versenytárs-fiókból) | Ahrefs CPC (kulcsszó-eszközből) | Arány |
|---|---:|---:|---:|
| pattanó ujj | $0,05 | $1 | **20×** |
| teniszkönyök gyógytorna | $0,17 | — | — |
| teniszkönyök | — | $1 | — |
| gyógytorna | $0,85 | — | — |
| kéz zsibbadás | — | $4 | — |
| kézfájdalom | — | $10 | — |

A `docs/kampanyterv-mert-adatokbol.md` 6/A pontja a Semrush-számokból
napi 100–300 kattintást ígér 10–15 dolláros keretből. **Ez a szám a mi
kulcsszavainkra nem áll meg.** A Semrush-adat egy MÁSIK hirdető (a
gyogytornaszom.hu) tényleges kulcsszavaira vonatkozik — az ő kifejezései
általános gyógytorna-témák, kicsi versennyel. A mi célkifejezéseink
(zsibbadás, kézfájdalom, kéztőalagút) az Ahrefs mérése szerint
**$1 és $10 között** vannak.

**Ez a terv az Ahrefs-számokkal tervez**, mert azok a MI kulcsszavainkra
mértek. A Semrush-számot alsó becslésként tartjuk meg: ha a valóság
afelé húz, a kattintásszám a tervezett többszöröse lesz, és az jó hír.
Fordítva viszont nem szabad tervezni.

> **Mértékegység.** Minden forintosított szám az MNB hivatalos
> devizaárfolyamával számol: **1 USD = 314,74 Ft (2026-08-19)**. A CPC-k
> a hirdetési eszközök BECSLÉSEI az átlagos kattintási árra, nem
> aukciós tények. A valódi CPC-t az első 30 nap méri meg.

### 1.2 Az ék, amit a mérés kiadott

A `docs/vevohang-es-hirdetesszoveg.md` 362 véleményből mérte: a nyolc
negatív értékelés közül **egy sem a szakmai munkát bírálja**. Mind a
hozzáférést, az árat és a szervezést. Ezek szó szerint a mi
hirdetésszövegünk állításai:

| Amire a beteg panaszkodott (mért) | A hirdetés állítása |
|---|---|
| „Elérhetetlenek telefonon… nem tudtak adni időpontot" | Nem kell időpontot kérned |
| „az időpontot lemondják előtte fél nappal" | Otthonról, utazás nélkül |
| „rendelkezésre állási díjat követelnek" · „5 alkalmas bérletet javasoltak" | Egyszer fizetsz, nincs bérlet |
| „nem teszik közzé az áraikat" | Az ár a kurzusoldalon ki van írva |
| „több hónapnyi, **hiábavaló otthoni kezelése** után" | Vezetett program, lépésről lépésre |

Az utolsó sor a legerősebb: az emberek **először otthon próbálkoznak, és
elbuknak**, mert nincs rendes programjuk. A hirdetés nem azt mondja,
hogy „tornázz otthon" (azt már megtették), hanem hogy **van egy
összeállított sorrend**.

### 1.3 Nyelvi és szabály-döntések, amiket itt rögzítünk

| Döntés | Miért |
|---|---|
| **Tegezés** minden hirdetésszövegben | A céloldalak tegeznek (`restore-legacy-content.ts`: „Ha nincs időd…"), és a `CLAUDE.md` nyelvi szabálya is ez. A `docs/vevohang-es-hirdetesszoveg.md` vázlatai magázódtak — az az eltérés itt fel van oldva, a céloldal javára. |
| **Nincs felkiáltójel** a címsorokban | A Google szerkesztői szabálya tiltja a figyelemfelkeltő célú írásjelet. Kérdőjel megengedett, és a mért vevőhang kérdés-alakban gondolkodik. |
| **„kezelés" és „alkalom" a vevő szava** | Mért: 209, illetve 91 előfordulás 312 véleményben. |
| **Nincs számszerű eredmény-ígéret** | A versenytárs formulája („5–8 alkalommal", „93%") bevált NEKIK, de klinikai állítás. Nálunk a `CLAUDE.md` és a Google „Unreliable claims" szabálya is tiltja. Helyette a mi számaink **termékadatok**: 50+ videós gyakorlat, egyszeri díj, korlátlan visszanézés. |
| **A váll kimarad az 1. hullámból** | A termék saját leírása szerint a program „csukló-, ujj-, alkar- és **könyök**fájdalmakra" szól. A váll nincs benne. Vállra hirdetni olyat ígérne, amit a termék nem ad. Lásd 3.8. |

---

## 2. Fiókszerkezet

### 2.1 A kampányok

Három kampány indul, kettő tartalékban marad. A bontás oka mindenütt a
**költségkeret**: a keret kampányszinten állítható, hirdetéscsoport-szinten
nem. Ha a 3 500 keresésű `teniszkönyök` egy kampányban lenne a kéz-témával,
felszívná a teljes keretet a nagyobb volumene miatt.

| Kód | Kampány | Napi keret | Max. CPC-korlát | Állapot |
|---|---|---:|---:|---|
| **K1** | Kéz és csukló (tünet szerint) | 3 000 Ft | 1 200 Ft | indul |
| **K2** | Teniszkönyök és könyök | 1 500 Ft | 500 Ft | indul |
| **M1** | Márka (Kineticare) | 500 Ft | 150 Ft | indul |
| T1 | Ínhüvelygyulladás | — | — | **vár a cikkre** (7.3) |
| T2 | Váll (befagyott váll, vállfájdalom) | — | — | **nem indul** (3.8) |

### 2.2 A hirdetéscsoportok — tünet szerint, ahogy a vevő keres

| Kampány | Kód | Hirdetéscsoport | Mért vezérkifejezés | Ker./hó |
|---|---|---|---|---:|
| K1 | H1 | Zsibbadás | kéz zsibbadás + bal/jobb | 1 300 |
| K1 | H2 | Kéztőalagút-szindróma | kéztőalagút szindróma | 1 510 |
| K1 | H3 | Pattanó ujj | pattanó ujj | 1 300 |
| K1 | H4 | Csukló- és kézfájdalom | csukló fájdalom | 1 750 |
| K1 | H5 | Törés és gipsz után | csuklótörés utáni gyógytorna | 400 |
| K2 | K2a | Teniszkönyök | teniszkönyök | 5 750 |
| M1 | M1a | Márka | kineticare | **nem mért** |

A „Ker./hó" oszlop a hirdetéscsoportba sorolt, mért volumenű kifejezések
összege (a 3. fejezet táblázataiból). A márkánál nincs mért érték: a
`docs/kulcsszavak.md` mérése a márkanévre nem terjedt ki, és a
`docs/monid-adatok-teljes.md` sem méri. **Ezt tudni kell, mielőtt bárki
számot vár tőle.**

### 2.3 Kampánybeállítások (mindhárom kampányra)

| Beállítás | Érték | Miért |
|---|---|---|
| Kampánytípus | Keresési (Search) | Csak keresés. A Display-partnerhálózat és a keresési partnerek KI. Kis kereten a partnerhálózat mérhetetlen minőségű forgalmat hoz. |
| Hely | Magyarország | A kurzus digitális, országosan szolgál ki. |
| Helycélzási mód | **Jelenlét** („in or regularly in"), nem érdeklődés | Az érdeklődés-alapú célzás külföldi keresőket is behoz, akiknek a forintos fizetés és a magyar szöveg nem való. |
| Nyelv | magyar | |
| Licitstratégia induláskor | **Kattintások maximalizálása**, max. CPC-korláttal | Konverziós előzmény nélkül a konverzió-alapú licit (tCPA, Max. konverzió) nem tud tanulni, és a 0.2 pont miatt konverziós jelet sem kapna. |
| Váltás | 30+ mért konverzió után Max. konverzió | Addig kattintás-optimalizálás. |
| Hirdetésrotáció | Optimalizálás | |
| Hirdetésütemezés | nincs korlátozás induláskor | Előbb mérni kell. A mért autocomplete-ben van „éjszaka" és „alvás közben" alak, tehát az éjszakai forgalom valós. |
| Eszközmódosítók | nincs induláskor | |
| Automatikus címkézés (gclid) | BE | Nem árt, és ha a hozzájárulási kérdés (11. K2) később megoldódik, visszamenőleg nem pótolható. |
| **UTM-paraméterek** | KÖTELEZŐ, minden végső URL-en | Ez a valódi attribúciónk. Lásd 9.3. |

---

## 3. Kulcsszavak — egyezési típussal, mért volumennel és CPC-vel

### 3.0 Miért nincs széles egyezés (broad match)

A széles egyezés a Google saját leírása szerint a konverziós jelre és az
okos licitre támaszkodik, hogy a rokon keresésekből a jókat válassza. A
0.2 pont szerint nálunk **konverziós jel nem lesz**. Széles egyezéssel
tehát vakon szórnánk. **Induláskor csak kifejezés- és pontos egyezés
megy.** A széles egyezés a 10. fejezet szerinti 30. nap után, kizárólag
akkor nyitható meg, ha a keresési kifejezések jelentése tiszta.

Jelölés: `[pontos]` · `"kifejezés"` · a CPC és a volumen forrása az
`Ahrefs Keywords Explorer, country=hu, 2026-08-21`, kivéve ahol
`Semrush` vagy `autocomplete` szerepel.

### 3.1 H1 — Zsibbadás

| Kulcsszó | Egyezés | Ker./hó | Nehézség | CPC ($) | CPC (Ft) |
|---|---|---:|---:|---:|---:|
| kéz zsibbadás | `[…]` + `"…"` | 450 | 17 | 4 | 1 259 |
| jobb kéz zsibbadás | `[…]` + `"…"` | 600 | 17 | 5 | 1 574 |
| bal kéz zsibbadás | `[…]` + `"…"` | 500 | 9 | nincs mért | — |
| bal kéz zsibbadás okai | `"…"` | 450 | 12 | nincs mért | — |
| kéz zsibbadás okai | `"…"` | 250 | 0 | 4 | 1 259 |
| kéz zsibbadás kezelése | `"…"` | autocomplete | — | — | — |
| kéz zsibbadás éjszaka | `"…"` | autocomplete | — | — | — |
| kéz zsibbadás alvás közben | `"…"` | autocomplete | — | — | — |
| ujj zsibbadás | `"…"` | autocomplete | — | — | — |
| ujj zsibbadás torna | `"…"` | autocomplete | — | — | — |
| hüvelykujj zsibbadás | `"…"` | autocomplete | — | — | — |
| kéztorna alagút szindróma | `"…"` | autocomplete | — | — | — |

**Volumen-súlyozott CPC (a mért sorokból): $4,46 = 1 404 Ft.**
Számítás: (450·4 + 600·5 + 250·4) ÷ 1 300.

A bal és jobb alak külön kulcsszó, mert a `docs/monid-adatok-teljes.md`
1.2 pontja mérte: **együtt 1 100 keresés, szemben az általános alak
450-ével.** Erre a bontásra ma senki nem hirdet.

### 3.2 H2 — Kéztőalagút-szindróma

| Kulcsszó | Egyezés | Ker./hó | Nehézség | CPC ($) | CPC (Ft) |
|---|---|---:|---:|---:|---:|
| kéztőalagút szindróma | `[…]` + `"…"` | 1 200 | 5 | 3 | 944 |
| kéztőalagút szindróma kezelése | `"…"` | 150 | 12 | 3 | 944 |
| kéztőalagút szindróma tünetei | `"…"` | 90 | 12 | 1 | 315 |
| **kéztőalagút szindróma torna** | `[…]` + `"…"` | 70 | **0** | **8** | **2 518** |
| kéztőalagút szindróma kezelése házilag | `"…"` | autocomplete | — | — | — |
| kéztőalagút szindróma mitől alakul ki | `"…"` | autocomplete | — | — | — |
| kéztőalagút szindróma hol fáj | `"…"` | autocomplete | — | — | — |
| alagút szindróma gyógytorna | `"…"` | autocomplete | — | — | — |

**Volumen-súlyozott CPC: $3,11 = 979 Ft.**
Számítás: (1 200·3 + 150·3 + 90·1 + 70·8) ÷ 1 510.

A `kéztőalagút szindróma torna` kicsi, de **nulla nehézség és 8 dolláros
kattintás**: pontosan a mi termékünkre keresnek, és a mérés szerint senki
nem válaszol rá. Ez a csoport legfontosabb kulcsszava, a volumene
ellenére.

**Amit tudni kell erről a csoportról:** a `docs/kampanyterv-mert-adatokbol.md`
5. pontja mérte, hogy ezt a találati listát **műtéti ajánlatok uralják**.
Aki ide kattint, gyakran épp a műtétet akarja elkerülni. A hirdetés ezért
a „mit tehetsz, mielőtt műtétre kerül sor" szögből szól, és a
`műtét ára` típusú keresések negatívként kizárva.

### 3.3 H3 — Pattanó ujj

| Kulcsszó | Egyezés | Ker./hó | Nehézség | CPC ($) | CPC (Ft) |
|---|---|---:|---:|---:|---:|
| pattanó ujj | `[…]` + `"…"` | 800 | **0** | 1 | 315 |
| **pattanó ujj kezelése házilag** | `[…]` + `"…"` | 350 | **0** | 1 | 315 |
| pattanó ujj szindróma | `"…"` | 150 | 0 | 4 | 1 259 |
| **pattanó ujj gyógytorna videó** | `[…]` + `"…"` | 150 | — | nincs mért | — |
| kéztorna pattanó ujjra | `"…"` | autocomplete | — | — | — |
| pattanó ujj gyakorlatok | `"…"` | autocomplete | — | — | — |

**Volumen-súlyozott CPC: $1,35 = 424 Ft.**
Számítás: (800·1 + 350·1 + 150·4) ÷ 1 300.

Két mért különlegesség: a `pattanó ujj gyógytorna videó` azt jelenti,
hogy **videót keresnek** (és nekünk videós kurzusunk van), a
`kezelése házilag` pedig szó szerint a mi pozíciónk.

A Semrush ugyanerre 1 900 keresést és **$0,05** CPC-t mért. Ha ez igaz, ez
a csoport nagyságrendekkel olcsóbb lesz a tervezettnél. Nem erre
tervezünk, de itt fog először kiderülni.

### 3.4 H4 — Csukló- és kézfájdalom

| Kulcsszó | Egyezés | Ker./hó | Nehézség | CPC ($) | CPC (Ft) |
|---|---|---:|---:|---:|---:|
| **csukló fájdalom** (két szó) | `[…]` + `"…"` | 800 | **0** | 2 | 629 |
| csuklófájdalom (egy szó) | `[…]` + `"…"` | 150 | 0 | 3 | 944 |
| alkar fájdalom | `[…]` + `"…"` | 250 | 0 | 9 | 2 833 |
| kézfájdalom | `[…]` + `"…"` | 150 | 0 | 10 | 3 147 |
| hüvelykujj fájdalom | `[…]` + `"…"` | 200 | 0 | 2 | 629 |
| jobb kéz középső ujj fájdalom | `"…"` | 200 | 0 | 5 | 1 574 |
| kéz csukló fájdalom | `"…"` | autocomplete | — | — | — |
| kéz alkar fájdalom | `"…"` | autocomplete | — | — | — |
| csuklófájdalom kezelése | `"…"` | autocomplete | — | — | — |
| kézerősítő gyakorlatok | `"…"` | 20 | — | — | — |

**Volumen-súlyozott CPC: $4,11 = 1 295 Ft.**
Számítás: (800·2 + 250·9 + 150·3 + 150·10 + 200·2 + 200·5) ÷ 1 750.

**Az egybe- és különírás külön kulcsszó.** A `docs/monid-adatok-teljes.md`
1.5 pontja mérte: `csukló fájdalom` 800, `csuklófájdalom` 150. A Google
itt nem vonja össze a két alakot, tehát mindkettőt vinni kell.

**Figyelem a 1 200 Ft-os CPC-korlátra:** a `kézfájdalom` (3 147 Ft) és az
`alkar fájdalom` (2 833 Ft) becsült ára a korlát fölött van, tehát ezekre
kevés megjelenést kapunk. Ez **szándékos**: a kis keretet nem érdemes a
két legdrágább kifejezésre költeni. Ha a 30. napi mérés azt mutatja, hogy
ezek konvertálnak, külön kampányba emelhetők saját kerettel.

### 3.5 H5 — Törés és gipsz után

| Kulcsszó | Egyezés | Ker./hó | Nehézség | CPC ($) | CPC (Ft) |
|---|---|---:|---:|---:|---:|
| csuklótörés utáni gyógytorna | `[…]` + `"…"` | 100 | 0 | 3 | 944 |
| csukló orsócsont törés gyógyulási ideje | `"…"` | 300 | 0 | **10** | **3 147** |
| csuklótörés utáni gyógytorna gyakorlatok | `"…"` | autocomplete | — | — | — |
| csuklótörés gyógyulási ideje | `"…"` | autocomplete | — | — | — |
| kéztorna törés után | `[…]` + `"…"` | autocomplete | — | — | — |
| kéztorna csuklótörés után | `"…"` | autocomplete | — | — | — |
| gipsz levétele után torna | `"…"` | autocomplete | — | — | — |
| ujj zsibbadás műtét után | `"…"` | autocomplete | — | — | — |
| pattanó ujj műtét utáni gyógyulási idő | `"…"` | 150 | 0 | 9 | 2 833 |

**Volumen-súlyozott CPC a két mért sorral: $8,25 = 2 597 Ft.**
**A drága `gyógyulási ideje` kulcsszó nélkül: $3,00 = 944 Ft.**

**Javaslat:** a `csukló orsócsont törés gyógyulási ideje` és a
`pattanó ujj műtét utáni gyógyulási idő` kulcsszó **szüneteltetve
induljon**. Két okból: a becsült 3 147, illetve 2 833 Ft-os kattintás a
kampány napi keretének a harmada, a keresési szándék pedig tisztán
információs („mennyi idő"). Ha a keret bővül, ezek az első jelöltek.

**Ez az egyetlen hirdetéscsoport, ahol a `műtét` szó NEM negatív.** A
`docs/monid-adatok-teljes.md` 3.10/5 pontja mérte a különbséget: a
`műtét` és a `műtét ára` nem a mi vevőnk, a **`műtét után`** viszont
igen — az a beteg túl van a beavatkozáson, és rehabilitációt keres.

### 3.6 K2a — Teniszkönyök

| Kulcsszó | Egyezés | Ker./hó | Nehézség | CPC ($) | CPC (Ft) |
|---|---|---:|---:|---:|---:|
| teniszkönyök | `[…]` + `"…"` | 3 500 | 13 | 1 | 315 |
| teniszkönyök kezelése | `[…]` + `"…"` | 800 | 21 | 1 | 315 |
| **teniszkönyök kezelése otthon** | `[…]` + `"…"` | 400 | **4** | 1 | 315 |
| teniszkönyök tünetei | `"…"` | 350 | 0 | 1 | 315 |
| könyökfájdalom | `[…]` + `"…"` | 700 | **0** | 1 | 315 |
| teniszkönyök gyógytorna | `[…]` + `"…"` | 210 (Semrush) | — | 0,17 (Semrush) | 54 |
| teniszkönyök kezelése házilag | `"…"` | autocomplete | — | — | — |
| teniszkönyök házi gyógymód | `"…"` | autocomplete | — | — | — |
| teniszkönyök gyakorlatok | `"…"` | autocomplete | — | — | — |
| teniszkönyök mitől alakul ki | `"…"` | autocomplete | — | — | — |

**Volumen-súlyozott CPC: $1,00 = 315 Ft.** Ez a legolcsóbb csoport, és
egyben a legnagyobb volumenű. **Ha a keret szűkös, ez a kampány az
utolsó, amit le szabad venni.**

A `teniszkönyök kezelése otthon` (400 keresés, 4-es nehézség) a
`docs/monid-adatok-teljes.md` 1.4 pontja szerint szó szerint a mi
pozíciónk. Ez a csoport súlypontja, nem a diagnózisnév.

**Figyelmeztetés:** a `docs/kulcsszavak.md` 5. pontja szerint a
`teniszkönyök` keresési szándéka **lokális is** — sokan „a közelemben"
jelleggel keresnek. Ezeket az első 30 nap keresési kifejezéseiből kell
kiszűrni, mert a kurzus nem helyi szolgáltatás. Lásd 4.4.

### 3.7 M1a — Márka

| Kulcsszó | Egyezés | Mért adat |
|---|---|---|
| kineticare | `[…]` + `"…"` | **nincs mérve** |
| kineticare kurzus | `"…"` | nincs mérve |
| kineticare kézrehab | `"…"` | nincs mérve |
| otthoni kézrehab program | `[…]` + `"…"` | nincs mérve |
| sos kézrelax | `[…]` + `"…"` | nincs mérve |
| kézrehab program | `"…"` | nincs mérve |

**Erre a hat kifejezésre nincs mért keresési volumen.** A kampány célja
nem a forgalomszerzés, hanem a védekezés: amint az első hirdetéseink
futnak, a versenytársak láthatják a márkanevet, és licitálhatnak rá. A
márkakattintás a legolcsóbb kattintás, amit venni lehet, és a napi 500
Ft-os keret ezt a kockázatot fedi le. Ha 30 nap után nulla megjelenés
van, a kampány kikapcsolható — akkor nem keres senki a névre, és ez is
mért információ.

### 3.8 Amit MÉRTÜNK, de NEM indítunk

| Klaszter | Mért volumen | Miért nem indul |
|---|---:|---|
| **Ínhüvelygyulladás** | 2 200 + 1 300 | **Nincs hozzá céloldal.** Ez a téma második legnagyobb kifejezése az egész mérésben, a cikk (Ú1) viszont még nem készült el. Amint él, ez az első bővítés. Lásd 7.3. |
| **Befagyott váll** | 800 + 350 + 250 | A termék leírása szerint a program csuklóra, ujjra, alkarra és könyökre szól. **A váll nincs benne.** |
| **Vállfájdalom** | 1 600 + 600 + 450 | Ugyanez. A `docs/tudastar-tartalmi-terv.md` 2.2 szerint a váll-CTA amúgy is időpontkérés, ami budapesti rendelőt jelent, nem országos terméket. |
| **Dupuytren-kontraktúra** | 600 + 200 | Nincs cikk, és a `docs/monid-adatok-teljes.md` sem vizsgálta, hogy a kurzus lefedi-e. Szakmai kérdés a két gyógytornásznak. |
| **„lelki okai" alakok** | 350 + 300 + 200 | A `docs/monid-adatok-teljes.md` 7.1 pontja nyitva hagyta: gyógytornász neve alatt forrásolhatatlan állítás lenne. Amíg nincs döntés, negatív kulcsszó. |
| **Termék-kulcsszavak** (krém, rögzítő, sín, pánt) | nagy volumen, $3–15 CPC | Nem árulunk terméket. `docs/monid-adatok-teljes.md` 7.4 — tulajdonosi döntés. Amíg nincs, negatív. |
| **`gyógytornász továbbképzés`** | 30 | A `docs/kulcsszavak.md` 2/e pontja mérte: ennyiből nem lehet szakmai kurzust eladni. Nem hirdetési célpont. |

---

## 4. Negatív kulcsszavak

### 4.1 Két szabály, ami nélkül a lista nem működik

**a) A negatív kulcsszó NEM illeszkedik a közeli változatokra.** Ez a
Google saját, kimondott szabálya, és a pozitív kulcsszavakkal
ellentétesen működik. A magyar nyelvben ez súlyos következménnyel jár:
a ragozott alakok **külön szavak**. Ha felveszed a `műtét` negatívot, az
NEM zárja ki a `műtétet`, `műtéthez`, `műtétre` alakokat. Ezért van a
lenti listában sok, egymáshoz hasonló sor. Ez nem redundancia, hanem a
magyar ragozás ára.

**b) A gépelési hibát és a kis-nagybetűt viszont automatikusan kezeli.**
Ezeket nem kell felvenni.

**c) A negatív kulcsszó a hierarchiában lefelé nem vonható vissza.** Amit
kampányszinten kizársz, azt egyetlen hirdetéscsoportban sem lehet
visszaengedni. Ezért van a `műtét` a **hirdetéscsoport** szintjén, nem a
kampányén: a H5 (Törés és gipsz után) csoportnak szüksége van a
„műtét után" keresésekre.

### 4.2 Fiókszintű negatív lista — „KIN-alap"

Ez a lista MINDEN kampányra érvényes. Google Ads-ben egyszer kell
felvenni negatív kulcsszólistaként, és mindhárom kampányhoz hozzárendelni.

**A) Állás, képzés, tanulás** (a `docs/kampanyterv-mert-adatokbol.md` 6/A
kötelező listájából, kibontva a magyar ragozásra)

```
állás · állást · állások · munka · munkát · munkahely · fizetés · fizetése
bér · bére · tanfolyam · tanfolyamot · tanfolyamok · képzés · képzést
képzések · továbbképzés · továbbképzést · oktatás · iskola · egyetem
főiskola · diploma · szakképzés · okj · vizsga · vizsgára · jegyzet
tétel · tételek · beadandó · szakdolgozat · ppt · prezentáció
"gyógytornász továbbképzés" · "gyógytornász képzés" · "kézterapeuta képzés"
```

**B) Termékvásárlás** (mért: `docs/monid-adatok-teljes.md` 3.10/4 —
ezek a legdrágább kattintások, és nem árulunk terméket)

```
krém · krémet · kenőcs · kenőcsöt · gél · zselé · gyógyszer · gyógyszert
tabletta · vitamin · vitaminok · injekció · rögzítő · rögzítőt · sín
sínt · pánt · pántot · bandázs · tape · tapasz · kineziológiai
szorító · brace · kesztyű · labda · eszköz · eszközök · gép
bolt · boltban · webshop · webáruház · rendelés · szállítás
amazon · ebay · temu · alza · aliexpress · gyógyászati segédeszköz
"hol kapható" · "mennyibe kerül" · "hol vehetek"
```

**C) Adminisztratív, fordítási és lexikai szándék** (mért:
`docs/monid-adatok-teljes.md` 3.10/2–3)

```
bno · bnó · "bno kód" · "bnó kód" · angolul · angol · németül · latinul
fordítás · jelentése · wikipédia · wikipedia · wiki · idézet
táppénz · leszázalékolás · rokkantsági · orvosszakértő · beutaló
tb · neak · oep · közfinanszírozott · társadalombiztosítás
```

**D) Nem a mi testtájunk** (a termék saját leírása: csukló, ujj, alkar,
könyök)

```
láb · lábfej · lábujj · boka · sarok · talp · térd · csípő · comb
hát · háta · derék · nyak · gerinc · ülőideg · isiász · plantar
váll · vállfájdalom · "befagyott váll" · felkar · lapocka · kulcscsont
fej · arc · állkapocs · fül · szem
```

> **Figyelem a `váll` sorra.** Ez ma mért, valódi kereslet
> (`befagyott váll` 800 keresés, nulla nehézség), amit **szándékosan
> engedünk el**, mert a termék nem fedi le. Ha a két gyógytornász
> szakmailag kiterjeszti a programot a vállra, ez a négy sor törlendő, és
> a T2 kampány indítható. Lásd 11. K4.

**E) Nem a mi célcsoportunk** (mért: `docs/monid-adatok-teljes.md` 7.2 —
a kurzus profilján kívül eső, valós keresések)

```
stroke · agyvérzés · bénult · bénulás · béna · sclerosis · parkinson
gyerek · gyereknek · gyerekeknek · gyermek · baba · csecsemő · óvodás
kutya · macska · ló · állat · lovas
protézis · amputáció · műkéz
```

**F) Lélektani és alternatív irány** (mért kereslet, de
`docs/monid-adatok-teljes.md` 7.1 szerint eldöntetlen)

```
"lelki okai" · "lelki ok" · "lelki oka" · lelki · biologika · újmedicina
metafizika · energetikai · csakra · homeopátia · homeopátiás
akupunktúra · akupresszúra · csontkovács · reiki · bioenergetika
horoszkóp · asztrológia
```

**G) Letöltés és kalózkodás** (nem az ingyenesség kizárása)

```
letöltés · letölthető · torrent · ingyen letöltés · pdf · doc · docx
crack · feltört · warez
```

> **Amit itt NEM zárunk ki: az `ingyen` és az `ingyenes` szót.** Aki
> ingyenes kézgyakorlatokat keres, a mi SOS Kézrelax villámkurzusunk
> tökéletes jelöltje, és a mért vevőhang szerint (3. szakasz) az emberek
> előbb kipróbálnák. Az `ingyen` kizárása a saját belépő termékünket
> lőné le.

### 4.3 Kampányszintű negatívok

**K1 (Kéz és csukló) és K2 (Teniszkönyök):**

```
"műtét ára" · "műtét árak" · "műtét költsége" · "műtét mennyibe kerül"
"műtét után mikor lehet dolgozni" · sebész · kézsebész · kézsebészet
sebészet · magánklinika · magánkórház · kórház · klinika · rendelőintézet
"műtéti technika" · "műtét menete"
```

**M1 (Márka):** a `docs/orokolt-url-atiranyitasok.md` szerint a régi
funnel-oldalak (`/kezrehab-akcio`, `/oto-kezrehab-akcio`) a **régi 39 700
Ft-os árral** futottak, ami már nem él. Ezért:

```
akció · akciós · kupon · kuponkód · kedvezménykód · "39700" · "39 700"
ingyen letöltés · crack
```

### 4.4 Hirdetéscsoport-szintű negatívok

| Hirdetéscsoport | Negatívok | Miért |
|---|---|---|
| H1, H2, H3, H4, K2a | `műtét` · `műtétet` · `műtétre` · `műtéti` · `operáció` · `megműtik` | Ezekben a csoportokban a műtét-szándék tisztán rossz jelölt. A H2-nél ez a legfontosabb: a mért találati listát műtéti ajánlatok uralják. |
| **H5** | **NINCS `műtét` negatív** | Itt a „műtét után" keresés a fő célközönség. |
| H1 | `szédülés` · `hányinger` · `mellkasi` · `szívroham` · `stroke` | Mért autocomplete-alakok (`kéz láb zsibbadás szédülés`, `bal kéz zsibbadás hányinger`). Ezek együttes tünetek, sürgős orvosi helyzetre utalhatnak. **Ilyen keresésre hirdetni felelőtlen lenne**, függetlenül attól, hogy megérné-e. |
| H1 | `terhesség` · `terhes` · `terhességi` | Mért alak (`kéz zsibbadás terhesség alatt`). A terhességi panasz külön szakmai megítélést kíván, a kurzus nem erre készült. |
| H4 | `terhesség` · `terhes` · `gyerekeknél` | Ugyanez (`csuklófájdalom terhesség alatt`, `csuklófájdalom gyerekeknél`). |
| K2a | `golfkönyök` · `bandázs` · `pánt` · `csontkinövés` | Mért autocomplete-alakok, termék- vagy más diagnózis-szándékkal. |

### 4.5 Helyfüggő keresések — döntés a 30. napon

A `docs/kulcsszavak.md` 5. pontja mérte, hogy a `teniszkönyök` szándéka
lokális is. Ezek a keresések („a közelemben", „Budapest", „II. kerület")
egy **rendelői** ajánlatot keresnek, nem online kurzust.

**Nem vesszük fel most negatívnak**, mert egy magyar városnév a
keresésben nem zárja ki, hogy az illető kurzust vegyen. Helyette: a 30.
napon a keresési kifejezések jelentésében meg kell nézni, hogy a
helynevet tartalmazó kattintások mit csináltak. Ha nem konvertálnak,
akkor mennek a negatív listára — **mérés után, nem előtte**.

### 4.6 A lista karbantartása

A negatív listát **nem lehet előre befejezni**. A fenti sorok abból
származnak, amit a Monid-mérés ténylegesen látott. A valódi lista a
Google Ads „Keresési kifejezések" jelentéséből épül:

- **Az első 7 napban naponta** nézd át, és negativáld, ami nyilvánvalóan
  nem a mi vevőnk.
- **Az első 30 nap után hetente.**
- Minden új negatívnál gondolj a 4.1/a szabályra: a ragozott alakot
  külön kell felvenni.

---

## 5. Reszponzív keresési hirdetések (RSA)

### 5.1 A formula, és hogy miben térünk el a versenytárstól

A `docs/kampanyterv-mert-adatokbol.md` 3. pontja visszafejtette a
gyogytornaszom.hu 25 élő hirdetéséből a bevált formulát:

> `<Panasz> gyógytorna: <5–8> alkalommal <konkrét eredmény>` + kapacitás
> + „várakozás nélkül akár holnap" + „120 féle panasz" + „93%".

Ebből **négy elemet átveszünk, kettőt nem**:

| A formula eleme | Nálunk |
|---|---|
| A panasz a címsor elején | **Átvéve.** Minden csoport 1–4. címsora a tünet. |
| Sürgősség | **Átvéve, erősebben.** Ők „akár holnap", mi „ma este el tudod kezdeni". |
| Konkrét szám | **Átvéve, de termékadatra cserélve.** Nem „93%", hanem „50+ videós gyakorlat". |
| Az akadály elhárítása | **Átvéve és kibővítve.** Náluk: nincs várakozás. Nálunk: nincs időpont, nincs utazás, nincs bérlet. |
| Számszerű alkalom-ígéret („5–8 alkalommal") | **NEM.** Klinikai állítás lenne. |
| Eredmény-arány („93%") | **NEM.** Klinikai állítás, és a mért vevőhang szerint épp ez ütött vissza a versenytársnál. |

### 5.2 Hogyan kell összerakni a hirdetést a Google felületén

- **Csoportonként két RSA.** Az elsőben rögzítés (pinning) nélkül,
  hogy a Google tanuljon; a másodikban az **1. címsor-pozícióra rögzítve**
  a tünet-címsor (az adott csoport 1. sora). A Google leírása szerint,
  ha minden pozíció rögzített, a rögzítetlen elemek nem jelennek meg —
  ezért csak EGY pozíciót rögzítünk, a többit szabadon hagyjuk.
- **Megjelenítési útvonal** (2×15 karakter): a `kezrehab` és a csoport
  tünetszava. Az 5.4 táblázatban minden csoportnál ott a javasolt érték.
- A címsorok között szándékosan van **három ismétlődő blokk** (a
  „nincs időpont", az „egyszer fizetsz" és a „korlátlanul újranézheted"
  változatok), mert ezek a mért vevőhang legerősebb ütőkártyái, és a
  Google rotációjában bármelyik kombinációban helyt kell állniuk.
- A 15. címsor mindenütt a **„Mikor fordulj orvoshoz?"**. Ez nem
  értékesítési sor, hanem szakmai fegyelem: a cikkek mindegyikében van
  ilyen szakasz, és a hirdetés is jelzi, hogy a program nem helyettesíti
  az orvosi ellátást.

### 5.3 A hirdetésszövegek karakterszámmal

A táblázatok gépi számlálásból készültek. A korlát: **címsor 30, leírás
90 karakter.** Az ékezetes magyar betű egy karakternek számít (a
kétszeres szélességű szabály csak a koreai, japán és kínai írásra
vonatkozik).

#### H1 — Zsibbadás

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Zsibbad a kezed éjszaka? | 24 |
| 2 | Kézzsibbadás: mit tehetsz | 25 |
| 3 | Zsibbadó kéz otthoni torna | 26 |
| 4 | Ujjzsibbadás: gyakorlatok | 25 |
| 5 | Gyógytornász gyakorlatai | 24 |
| 6 | Nem kell időpontot kérned | 25 |
| 7 | Otthonról, utazás nélkül | 24 |
| 8 | Kezdd el a saját tempódban | 26 |
| 9 | Egyszer fizetsz, nincs bérlet | 29 |
| 10 | Korlátlanul újranézheted | 24 |
| 11 | 50+ videós gyakorlat | 20 |
| 12 | Kézrehab gyógytornászoktól | 26 |
| 13 | Ingyenes kezdő gyakorlatok | 26 |
| 14 | Ma este el tudod kezdeni | 24 |
| 15 | Mikor fordulj orvoshoz? | 23 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | Nézd meg, mi okozhatja a kézzsibbadást, és mit érdemes otthon elkezdened. | 73 |
| 2 | Kézrehabilitációs gyógytornászok gyakorlatai. Nem kell időpont, nem kell utazni. | 80 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | 50+ videós gyakorlat, lépésről lépésre. Ingyenes résszel is kezdhetsz. | 70 |

#### H2 — Kéztőalagút

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Kéztőalagút: mit tehetsz | 24 |
| 2 | Kéztőalagút-szindróma torna | 27 |
| 3 | Otthoni torna műtét előtt | 25 |
| 4 | Alagút szindróma otthon | 23 |
| 5 | Gyakorlatok gyógytornásztól | 27 |
| 6 | Konzervatív kézgyakorlatok | 26 |
| 7 | Nem kell időpontot kérned | 25 |
| 8 | Otthonról, utazás nélkül | 24 |
| 9 | Kezdd el a saját tempódban | 26 |
| 10 | Egyszer fizetsz, nincs bérlet | 29 |
| 11 | Korlátlanul újranézheted | 24 |
| 12 | 50+ videós gyakorlat | 20 |
| 13 | Kézrehab gyógytornászoktól | 26 |
| 14 | Mikor fordulj orvoshoz? | 23 |
| 15 | Ingyenes kezdő gyakorlatok | 26 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | Mit mond a kutatás a sínről, a tornáról és a műtétről? Forrásokkal, érthetően. | 78 |
| 2 | Kézrehabilitációs gyógytornászok otthoni programja. Nincs időpont, nincs utazás. | 80 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | Nézd meg, mit tehetsz otthon, és mikor érdemes szakemberhez fordulnod. | 70 |

#### H3 — Pattanó ujj

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Pattanó ujj: mit tehetsz | 24 |
| 2 | Beakad reggel az ujjad? | 23 |
| 3 | Pattanó ujj otthoni torna | 25 |
| 4 | Gyakorlatok gyógytornásztól | 27 |
| 5 | Pattanó ujj: sín vagy torna | 27 |
| 6 | Kézrehab gyógytornászoktól | 26 |
| 7 | Nem kell időpontot kérned | 25 |
| 8 | Otthonról, utazás nélkül | 24 |
| 9 | Kezdd el a saját tempódban | 26 |
| 10 | Egyszer fizetsz, nincs bérlet | 29 |
| 11 | Korlátlanul újranézheted | 24 |
| 12 | 50+ videós gyakorlat | 20 |
| 13 | Ingyenes kezdő gyakorlatok | 26 |
| 14 | Mikor fordulj orvoshoz? | 23 |
| 15 | Ma este el tudod kezdeni | 24 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | Miért akad meg az ujjad, és mit mond a kutatás a sínről? Forrásokkal. | 69 |
| 2 | Kézrehabilitációs gyógytornászok otthoni programja. Nincs időpont, nincs utazás. | 80 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | 50+ videós gyakorlat, lépésről lépésre. Ingyenes résszel is kezdhetsz. | 70 |

#### H4 — Csukló- és kézfájdalom

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Fáj a csuklód gépelés közben? | 29 |
| 2 | Csuklófájdalom: mit tehetsz | 27 |
| 3 | Kézfájdalom otthoni torna | 25 |
| 4 | Alkarfájdalom: gyakorlatok | 26 |
| 5 | Gyakorlatok gyógytornásztól | 27 |
| 6 | Hüvelykujjfájdalom otthon | 25 |
| 7 | Nem kell időpontot kérned | 25 |
| 8 | Otthonról, utazás nélkül | 24 |
| 9 | Kezdd el a saját tempódban | 26 |
| 10 | Egyszer fizetsz, nincs bérlet | 29 |
| 11 | Korlátlanul újranézheted | 24 |
| 12 | 50+ videós gyakorlat | 20 |
| 13 | Kézrehab gyógytornászoktól | 26 |
| 14 | Ingyenes kezdő gyakorlatok | 26 |
| 15 | Mikor fordulj orvoshoz? | 23 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | Mi okozhatja a csukló- és kézfájdalmat, és mit tehetsz otthon az első napokban? | 79 |
| 2 | Kézrehabilitációs gyógytornászok otthoni programja. Nincs időpont, nincs utazás. | 80 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | 50+ videós gyakorlat csuklóra, ujjra, alkarra és könyökre. Otthon, a te tempódban. | 82 |

#### H5 — Törés és gipsz után

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Levették a gipszet a kezedről | 29 |
| 2 | Csuklótörés utáni gyógytorna | 28 |
| 3 | Gipsz után: mi jön most? | 24 |
| 4 | Kéztorna törés után | 19 |
| 5 | Gyakorlatok gyógytornásztól | 27 |
| 6 | Otthoni rehabilitáció | 21 |
| 7 | Nem kell időpontot kérned | 25 |
| 8 | Otthonról, utazás nélkül | 24 |
| 9 | Kezdd el a saját tempódban | 26 |
| 10 | Egyszer fizetsz, nincs bérlet | 29 |
| 11 | Korlátlanul újranézheted | 24 |
| 12 | 50+ videós gyakorlat | 20 |
| 13 | Kézrehab gyógytornászoktól | 26 |
| 14 | Ingyenes kezdő gyakorlatok | 26 |
| 15 | Mikor fordulj orvoshoz? | 23 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | Mi történik a gipsz levétele után, és mit érdemes elsőként elkezdened otthon? | 77 |
| 2 | Kézrehabilitációs gyógytornászok vezetett programja. Nincs időpont, nincs utazás. | 81 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | Csuklóra, ujjra, alkarra és könyökre, lépésről lépésre, a saját tempódban. | 74 |

#### K2 — Teniszkönyök

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Teniszkönyök: mit tehetsz | 25 |
| 2 | Teniszkönyök kezelése otthon | 28 |
| 3 | Fáj a könyököd emelésnél? | 25 |
| 4 | Teniszkönyök gyakorlatok | 24 |
| 5 | Gyakorlatok gyógytornásztól | 27 |
| 6 | Könyökfájdalom otthoni torna | 28 |
| 7 | Nem kell időpontot kérned | 25 |
| 8 | Otthonról, utazás nélkül | 24 |
| 9 | Kezdd el a saját tempódban | 26 |
| 10 | Egyszer fizetsz, nincs bérlet | 29 |
| 11 | Korlátlanul újranézheted | 24 |
| 12 | 50+ videós gyakorlat | 20 |
| 13 | Kézrehab gyógytornászoktól | 26 |
| 14 | Ingyenes kezdő gyakorlatok | 26 |
| 15 | Mikor fordulj orvoshoz? | 23 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | Mitől alakul ki a teniszkönyök, és mit érdemes otthon elkezdened? Forrásokkal. | 78 |
| 2 | Kézrehabilitációs gyógytornászok otthoni programja. Nincs időpont, nincs utazás. | 80 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | Alkarra, csuklóra és könyökre szóló videós gyakorlatok, a saját tempódban. | 74 |

#### M1 — Márka

| # | Címsor | Kar. |
|---:|---|---:|
| 1 | Kineticare kézrehabilitáció | 27 |
| 2 | Kineticare hivatalos oldal | 26 |
| 3 | Otthoni KézRehab Program | 24 |
| 4 | SOS Kézrelax villámkurzus | 25 |
| 5 | Kézrehab gyógytornászoktól | 26 |
| 6 | Belépés a kurzusodba | 20 |
| 7 | Nézd meg a kurzusainkat | 23 |
| 8 | Ingyenes villámkurzus | 21 |
| 9 | 50+ videós gyakorlat | 20 |
| 10 | Nem kell időpontot kérned | 25 |
| 11 | Otthonról, utazás nélkül | 24 |
| 12 | Egyszer fizetsz, nincs bérlet | 29 |
| 13 | Korlátlanul újranézheted | 24 |
| 14 | Ismerd meg a csapatot | 21 |
| 15 | Kérdésed van? Írj nekünk | 24 |

| # | Leírás | Kar. |
|---:|---|---:|
| 1 | A Kineticare hivatalos oldala. Kézrehabilitációs kurzusok gyógytornászoktól. | 76 |
| 2 | Otthoni videós gyakorlatok csuklóra, ujjra, alkarra és könyökre. Nincs időpont. | 79 |
| 3 | Egyszer fizetsz, és annyiszor nézed vissza, ahányszor akarod. Nincs bérlet. | 75 |
| 4 | Kezdd az ingyenes villámkurzussal, és nézd meg, hogy megy neked otthon. | 71 |


### 5.4 Megjelenítési útvonalak (2×15 karakter)

| Hirdetéscsoport | Útvonal 1 | Kar. | Útvonal 2 | Kar. |
|---|---|---:|---|---:|
| H1 — Zsibbadás | kezrehab | 8 | zsibbadas | 9 |
| H2 — Kéztőalagút | kezrehab | 8 | keztoalagut | 11 |
| H3 — Pattanó ujj | kezrehab | 8 | pattano-ujj | 11 |
| H4 — Csukló- és kézfájdalom | kezrehab | 8 | csuklofajdalom | 14 |
| H5 — Törés és gipsz után | kezrehab | 8 | gipsz-utan | 10 |
| K2a — Teniszkönyök | kezrehab | 8 | teniszkonyok | 12 |
| M1a — Márka | kurzusok | 8 | kezrehab | 8 |

A megjelenítési útvonalnak nem kell egyeznie a valódi webcímmel, de
relevánsnak kell lennie. Ékezet nélkül írjuk, mert a megjelenő webcím
így olvashatóbb, és a valódi útvonalaink is ékezet nélküliek.

---

## 6. Bővítmények (eszközök)

A Google leírása szerint az asztali hirdetés **legfeljebb hat**, a mobil
**legfeljebb nyolc** sitelinket mutathat, és a megjelenéshez legalább
**kettő** kell. Az alábbi hat mindegyike fiókszinten veendő fel, hogy
minden kampányra érvényes legyen.

Karakterkorlátok, amiket a táblázat betart: sitelink szöveg **25**,
mindkét leírássor **35**, kiemelés **25**, struktúrált kivonat értéke
**25**, értékenként 3–10 darab.

#### Sitelinkek

| Szöveg | Kar. | Leírás 1 | Kar. | Leírás 2 | Kar. | Cél |
|---|---:|---|---:|---|---:|---|
| Ingyenes villámkurzus | 21 | 3 gyakorlat, e-mailben | 22 | Nézd meg, hogy megy otthon | 26 | `/kurzusok/sos-kezrelax-villamkurzus` |
| Otthoni KézRehab | 16 | 50+ videós gyakorlat | 20 | Egyszer fizetsz, a tiéd marad | 29 | `/kurzusok/otthoni-kezrehab-program` |
| Mikor menj orvoshoz? | 20 | A figyelmeztető jelek | 21 | Forrásokkal, érthetően | 22 | `/blog/csuklo-es-kezfajdalom` |
| Kik a gyógytornászok? | 21 | Végzettség és szakterület | 25 | Ismerd meg a két szakembert | 27 | `/rolunk` |
| Cikkek a kézről | 15 | Zsibbadás, fájdalom, törés | 26 | Gyógytornászok írták | 20 | `/blog` |
| Kérdésed van? | 13 | Írj nekünk egy üzenetet | 23 | Munkanapokon válaszolunk | 24 | `/kapcsolat` |

#### Kiemelések

| Kiemelés | Kar. |
|---|---:|
| Nem kell időpont | 16 |
| Nem kell utazni | 15 |
| Egyszer fizetsz | 15 |
| Nincs bérlet | 12 |
| Korlátlan visszanézés | 21 |
| 50+ videós gyakorlat | 20 |
| Gyógytornászoktól | 17 |
| Saját tempóban | 14 |
| Bankkártyás fizetés | 19 |
| Magyar nyelvű | 13 |

#### Struktúrált kivonatok

**Fejléc: Szolgáltatáskínálat (Service catalog)**

| Érték | Kar. |
|---|---:|
| Kézrehabilitáció | 16 |
| Csuklótorna | 11 |
| Ujjtorna | 8 |
| Alkartorna | 10 |
| Könyöktorna | 11 |
| Otthoni gyakorlatok | 19 |

**Fejléc: Típusok (Types)**

| Érték | Kar. |
|---|---:|
| Videós gyakorlatok | 18 |
| Otthoni program | 15 |
| Ingyenes villámkurzus | 21 |
| Lépésről lépésre | 16 |
| Saját tempóban | 14 |

### 6.1 Amit a bővítményeknél NEM csinálunk

| Bővítmény | Döntés | Miért |
|---|---|---|
| **Hívásbővítmény (telefonszám)** | **NEM** | A mért vevőhang legerősebb negatívuma épp a telefonos elérhetetlenség volt („Elérhetetlenek telefonon"). Telefonszámot kitenni azt ígérné, hogy felveszik. A `/kapcsolat` írásos űrlapja a becsületes út. |
| **Helybővítmény (cím, térkép)** | **NEM az 1. hullámban** | A kurzus országos, digitális termék. A cím budapesti rendelőt sugallna, és a mért helyi keresők (`teniszkönyök` lokális szándék) félreértenék. |
| **Árbővítmény (price asset)** | **később** | A 79 500 Ft-os ár kiírása a hirdetésben szűrne, ami kis kereten hasznos lehet. **De előbb mérni kell**, mit csinál a kattintási aránnyal. A 30. napi kör dönthet róla. |
| **Promóciós bővítmény** | **NEM** | A `docs/orokolt-url-atiranyitasok.md` szerint a régi 39 700 Ft-os akciós ár nem él tovább. Akciót hirdetni, ami nincs, szabálysértés. |
| **Űrlapbővítmény (lead form)** | **NEM** | A hozzájárulási állapotgépünk a saját oldalon fut. A Google-nél kitöltött űrlap megkerülné a consent-sávot, és az adat útja jogilag tisztázatlan lenne. |

### 6.2 Struktúrált kivonat — nyelvi megjegyzés

A fejléceket a Google zárt listából adja (Szolgáltatáskínálat / Service
catalog, Típusok / Types, és további tizenegy). **A magyar
felületen a magyar fejlécnevet kell kiválasztani**, a fenti táblázat az
angol megfelelőt csak azonosításként hozza. Ha a magyar listában nem
találod pontosan ezt a két fejlécet, a legközelebbi jelentésűt válaszd,
és jegyezd fel — a fejléclista nyelvenként eltérhet, és ezt a
dokumentumot nem a magyar felületen ellenőriztük.

---

## 7. Landing-hozzárendelés

### 7.1 A vezérelv: a keresési szándék dönt, nem az, hogy mit akarunk eladni

A Google minőségi mutatójának három összetevője közül az egyik a
**céloldal-élmény**: mennyire releváns és hasznos az oldal annak, aki a
hirdetésre kattintott. Aki a `kéz zsibbadás` kifejezésre keres,
**információt** keres, nem 79 500 Ft-os terméket. Ha egyenesen a
kurzusoldalra visszük, három dolgot veszítünk egyszerre: a látogatót, a
minőségi mutatót és az aukciós pozíciót.

A mért vevőhang ugyanezt mondja a másik irányból: az emberek **először
otthon próbálkoznak** („több hónapnyi, hiábavaló otthoni kezelése után").
Vagyis a cikk nem kitérő, hanem maga az út: a cikk válaszol, a cikk
végén lévő kurzus-híd pedig felajánlja a rendszerezett folytatást.

### 7.2 A hozzárendelés

| Hirdetéscsoport | Végső URL | Az oldal állapota | Miért ez |
|---|---|---|---|
| H1 — Zsibbadás | `/blog/miert-zsibbad-a-kezem` | vázlat kész (`docs/cikkek/1-…`) | Információs szándék. A cikk mért forgalmi potenciálja 2 200. |
| H2 — Kéztőalagút | `/blog/keztoalagut-szindroma` | vázlat kész (`docs/cikkek/2-…`) | A találati listát műtéti ajánlatok uralják; a cikk a konzervatív válasz. |
| H3 — Pattanó ujj | `/blog/pattano-ujj` | vázlat kész (`docs/cikkek/4-…`) | Van benne „Mit tehetsz otthon" és „sín, injekció vagy műtét" szakasz. |
| H4 — Csukló- és kézfájdalom | `/blog/csuklo-es-kezfajdalom` | vázlat kész (`docs/cikkek/5-…`) | Több tünetet fed le egy oldalon (csukló, kéz, alkar, hüvelykujj). |
| H5 — Törés és gipsz után | `/blog/csuklotores-utani-gyogytorna` | vázlat kész (`docs/cikkek/6-…`) | A gipszlevétel a kurzus természetes belépője. |
| K2a — Teniszkönyök | `/blog/teniszkonyok` | vázlat kész (`docs/cikkek/3-…`) | A súlypont a „kezelése otthon" szakasz. |
| M1a — Márka | `/kurzusok` | **él** | Márkára keresőnek a kínálat a helyes válasz, nem egy cikk. |

**Sitelinkek** (minden csoportnál ugyanaz a hat, lásd 6.):
`/kurzusok/sos-kezrelax-villamkurzus` · `/kurzusok/otthoni-kezrehab-program` ·
`/blog/csuklo-es-kezfajdalom` · `/rolunk` · `/blog` · `/kapcsolat`

Így a **kurzusoldal egy kattintásra van** minden hirdetésből, anélkül,
hogy a fő céloldal kereskedelmi lenne. A gyors vásárló a sitelinkről
egyenesen a termékhez jut.

### 7.3 Ami blokkolja a bővítést

| Hirdetéscsoport | Hiányzó oldal | Mért veszteség |
|---|---|---|
| **Ínhüvelygyulladás** | nincs cikk (Ú1 a `docs/monid-adatok-teljes.md` 6. pontjából) | **2 200 + 1 300 keresés/hó.** Ez az egész téma második legnagyobb kifejezése. |
| Befagyott váll | nincs cikk, és a termék sem fedi | 800 + 350 + 250 |
| Vállfájdalom | nincs cikk (C7, 2. hullám) | 1 600 + 600 + 450 |
| De Quervain | nincs cikk (C8, 2. hullám) | 60 |
| Dupuytren | nincs cikk, szakmai kérdés | 600 + 200 |

**Az ínhüvelygyulladás-cikk a legnagyobb egyetlen hozamú hátralévő
tartalom-feladat.** Amíg nincs, a hozzá tartozó kampány nem indítható,
mert nincs hová vinni a kattintást.

### 7.4 Három technikai szabály a végső URL-ekre

1. **Soha ne az átirányítást hirdesd.** A `docs/orokolt-url-atiranyitasok.md`
   szerint a `/kezrehab` és a `/kezrelax` 308-cal átirányít. A hirdetés
   végső URL-je mindig a **kanonikus cím** legyen
   (`/kurzusok/otthoni-kezrehab-program`), mert az átirányítás lassítja a
   betöltést, és rontja a céloldal-élményt.
2. **A `/penztar` és a `/kosar` tiltott a `robots.ts`-ben.** Hirdetés
   soha nem mutathat rájuk.
3. **Minden végső URL kap UTM-paramétereket.** Lásd 9.3. A
   `src/lib/analytics/page-url.ts` mérve megőrzi az `utm_*`
   paramétereket (csak a `token` paramétert vágja ki), tehát az
   attribúció eljut a PostHogig.

---

## 8. Költségkeret és várható kattintásszám

### 8.1 Hogyan számoltunk

Minden szám az Ahrefs mért CPC-jéből jön, **1 USD = 314,74 Ft**
(MNB, 2026-08-19) árfolyammal. A hirdetéscsoport CPC-je a benne lévő,
mért CPC-vel bíró kulcsszavak **volumennel súlyozott átlaga** — vagyis
a nagyobb keresettségű kifejezés nagyobb súllyal esik latba, ahogy a
valóságban is.

A havi keret a Google saját szorzója szerint **a napi keret 30,4-szerese**
(365 ÷ 12). Egy adott napon a költés elérheti a napi keret kétszeresét,
de a hónap végén az átlag a beállított napi keret marad.

> **Kerekítés.** A dollárértékeket két tizedesre kerekítve közöljük, a
> forintot viszont a **kerekítetlen** súlyozott átlagból számoljuk.
> Ezért a kiírt dollárértékből visszaszorozva 1–2 forintos eltérés
> adódhat. Ez a kerekítés műve, nem hiba: a forint a pontos szám.

### 8.2 A mért kattintási árak hirdetéscsoportonként

| Hirdetéscsoport | Mért volumen | Súlyozott CPC ($) | Súlyozott CPC (Ft) |
|---|---:|---:|---:|
| H1 — Zsibbadás | 1 300 | 4,46 | **1 404** |
| H2 — Kéztőalagút | 1 510 | 3,11 | **979** |
| H3 — Pattanó ujj | 1 300 | 1,35 | **424** |
| H4 — Csukló- és kézfájdalom | 1 750 | 4,11 | **1 295** |
| H5 — Törés és gipsz után (a drága sor nélkül) | 100 | 3,00 | **944** |
| H5 — Törés és gipsz után (mindennel) | 400 | 8,25 | 2 597 |
| K2a — Teniszkönyök | 5 750 | 1,00 | **315** |
| *(T1 — Ínhüvelygyulladás, visszatartva)* | *3 500* | *1,23* | *387* |

**A K1 kampány CPC-sávja: 424–1 404 Ft.** Ez háromszoros szórás egyetlen
kampányon belül, és ezért van a max. CPC-korlát: e nélkül a legdrágább
kulcsszavak felszívnák a keretet.

### 8.3 A javasolt keret

| Kampány | Napi keret | Havi (×30,4) | Max. CPC | Várható kattintás/hó |
|---|---:|---:|---:|---:|
| K1 — Kéz és csukló | 3 000 Ft | 91 200 Ft | 1 200 Ft | **65–215** |
| K2 — Teniszkönyök | 1 500 Ft | 45 600 Ft | 500 Ft | **145** |
| M1 — Márka | 500 Ft | 15 200 Ft | 150 Ft | nem mért |
| **Összesen** | **5 000 Ft** | **152 000 Ft** | | **210–360** |

A K1 sávja onnan jön, hogy a keret a csoportok között az aukció szerint
oszlik el: ha a forgalom a drága zsibbadás-csoportba megy, 65 kattintás
lesz; ha az olcsó pattanóujj-csoportba, 215.

**Ez a szám nagyságrendekkel kisebb, mint a
`docs/kampanyterv-mert-adatokbol.md` 6/A pontjának „napi 100–300
kattintása".** Az a becslés a versenytárs Semrush-CPC-jéből (0,04–0,05
dollár) készült, a mi kulcsszavaink viszont az Ahrefs mérése szerint
1–10 dollárosak. **Ez a dokumentum az óvatosabb, saját kulcsszóra mért
számmal tervez.** Ha a valóság a Semrush felé húz, a kattintásszám a
többszöröse lesz, és ez lesz az első jó hír a 30. napi mérésből.

### 8.4 Mikor éri meg — a nullszaldó aritmetikája

Az „Otthoni KézRehab Program" ára a repóban mérve **79 500 Ft**
(`src/scripts/restore-legacy-content.ts`). Az áfa-kulcs a
`SZAMLAZZ_AFAKULCS` környezeti változóból jön, aminek két jogszerű
értéke van (`27` vagy `AAM`); **ezt a fájlt nem olvassuk**, ezért
mindkét esettel számolunk.

| | Bruttó bevétel eladásonként | Havi 152 000 Ft kerethez kell |
|---|---:|---:|
| AAM (alanyi adómentes) | 79 500 Ft | **1,91 eladás/hó** |
| 27% áfa mellett (nettó 62 598 Ft) | 62 598 Ft | **2,43 eladás/hó** |

A 210–360 kattintásból 2,43 eladás azt jelenti, hogy a nullszaldóhoz
**0,67–1,16%-os vásárlási arány** kell.

> **Ez küszöb, nem előrejelzés.** Nincs mért vásárlási arányunk: a
> PostHog most került be, a domain még nem állt át, és fizetett forgalom
> még sosem futott az új platformra. **Aki ebből előrejelzést csinál,
> az találgat.** A valódi arányt a 9. fejezet D1 tölcsére méri meg az
> első 30 napban, és a keretet CSAK azután szabad emelni.

### 8.5 Ha kevesebb a pénz — a leépítés sorrendje

Ha a havi 152 000 Ft sok, ebben a sorrendben kell csökkenteni:

1. **M1 (márka) marad utoljára** — a legolcsóbb kattintás, védekező célú.
2. **K2 (teniszkönyök) marad** — 315 Ft-os CPC-vel ez a legjobb
   forint/kattintás arány az egész fiókban.
3. **K1-ből először a H1 (zsibbadás, 1 404 Ft) és a H4 (1 295 Ft)
   csoportot vedd le**, a H3-at (424 Ft) hagyd meg.

**Minimális értelmes keret: napi 2 000 Ft** (K2 1 000 + K1/H3 700 + M1
300), havi 60 800 Ft. Ebből: a K2 napi 1 000 Ft-ja 315 Ft-os CPC-vel
kb. 96 kattintás/hó, a H3 napi 700 Ft-ja 424 Ft-tal kb. 50 kattintás/hó,
**összesen kb. 145 kattintás havonta** (a márkakampányt nem számolva,
mert arra nincs mért volumen). Ez alatt a mérés is értelmét veszti, mert
nem gyűlik össze elég adat.

---

## 9. Konverziómérés

### 9.1 Miből mérünk, és miből nem

| Rendszer | Mit tud MA (mérve a kódban) | Mit nem tud |
|---|---|---|
| **PostHog** | 13 esemény, köztük a teljes értékesítési és lead-tölcsér (`ANALYTICS_EVENTS`, `src/lib/analytics/posthog.ts`). Hozzájárulás után indul. | Nem ismeri a hirdetési költséget. |
| **GA4** | **Csak automatikus `page_view`** (Enhanced measurement). A `src/lib/analytics/ga4.ts`-ben egyetlen egyedi eseményküldés sincs. | Nincs `purchase`, nincs `generate_lead`. Google Adsbe ma nincs mit importálni belőle. |
| **Google Ads** | Kattintás, költség, megjelenés, keresési kifejezés. | **Konverziót gyakorlatilag nem fog mérni** — lásd 0.2. |

### 9.2 Miért nem lesz Google Ads konverzió, és mit teszünk helyette

Két mért ok, amit a 0.2 pont már kimondott: a hirdetési hozzájárulás
sosem nyílik meg, a modellezéshez szükséges 700 kattintás / 7 nap küszöb
pedig egy nagyságrenddel a tervezett forgalom felett van.

**A megoldás nem az, hogy ezt megkerüljük.** A megoldás az, hogy a mérés
a mi oldalunkon történik, és a számokat havonta kézzel vetjük össze.

> ### FIGYELEM — a PostHog vásárlásszáma NEM a teljes vásárlásszám
>
> A `docs/posthog.md` 4a pontja dokumentál egy ismert mérési lyukat: a
> `purchase_confirmed` esemény **kizárólag bejelentkezett vevőnél megy
> ki**, mert a státusz-végpont a saját rendelésre szűkít, és
> bejelentkezés nélkül 401-et ad. A vendég-vásárlás viszont **engedélyezett**
> (tulajdonosi döntés, 2026-08-15, `penztar/page.tsx` 63. sor).
>
> **A fizetett forgalom szinte definíció szerint kijelentkezett, első
> látogató.** Vagyis épp a kampány vásárlásainak jelentős része az, ami
> kimarad a PostHog számából.
>
> **Ha valaki a PostHog vásárlásszámával oszt, a CPA-t túl magasnak
> fogja látni, és le fog állítani egy nyereséges kampányt.** Ez a
> dokumentum legkomolyabb mérési csapdája.

**A helyes CPA-számítás ezért két forrásból dolgozik:**

```
Kampány CPA  =  Google Ads költség (Ft)  ÷  a hónap TÉNYLEGES fizetett
                                            rendeléseinek száma
                                            (Payload admin → Rendelések,
                                            paid státusz, dátumra szűrve)
```

A PostHog `purchase_confirmed` száma ehhez **alsó korlát és
attribúciós jel**, nem a nevező. Amit a PostHog ad hozzá: melyik
`utm_content` (hirdetéscsoport) felől jöttek a bejelentkezett vásárlók.
A vendégek arányát a két szám különbsége mutatja meg.

**Ami viszont a fizetett forgalomra IS megbízható:**

| Esemény | Kell hozzá belépés? | Használható a kampány mérésére? |
|---|---|---|
| `$pageview` | nem | **igen** |
| `course_viewed` | nem | **igen** |
| `checkout_started` | nem | **igen** — ez a legmélyebb megbízható lépés |
| `lead_submitted` / `lead_succeeded` | nem | **igen** |
| `purchase_confirmed` | **igen** | csak részlegesen (lásd fent) |

Ezért a kampány napi optimalizálásának mérőszáma a **`checkout_started`**
és a **`lead_succeeded`**, a vásárlás pedig havi, kézi egyeztetés a
rendeléslistával. Ez lassabb, mint az automatikus konverzió-import, de
**igaz**. Ezen a kereten amúgy sincs olyan automatizmus, ami elég adatot
kapna a tanuláshoz.

### 9.3 UTM-paraméterek — ez a valódi attribúciónk

Minden végső URL-re kötelező, kézzel beírva (a Google automatikus
címkézése a `gclid`-et adja, ami sütik nélkül nem hasznosul):

| Paraméter | Érték |
|---|---|
| `utm_source` | `google` |
| `utm_medium` | `cpc` |
| `utm_campaign` | `k1-kez-csuklo` · `k2-teniszkonyok` · `m1-marka` |
| `utm_content` | a hirdetéscsoport kódja: `h1-zsibbadas`, `h2-keztoalagut`, `h3-pattano-ujj`, `h4-csuklofajdalom`, `h5-gipsz-utan`, `k2a-teniszkonyok`, `m1a-marka` |
| `utm_term` | `{keyword}` (a Google helyettesíti be a kulcsszót) |

Példa a H2 csoport végső URL-jére:

```
/blog/keztoalagut-szindroma?utm_source=google&utm_medium=cpc
  &utm_campaign=k1-kez-csuklo&utm_content=h2-keztoalagut&utm_term={keyword}
```

**Miért működik ez nálunk (mérve).** A
`src/lib/analytics/page-url.ts` szelektíven maszkol: kizárólag a `token`
paramétert vágja ki, az `utm_*` paramétereket **szándékosan megőrzi** (a
fájl kommentje ezt üzleti követelményként rögzíti). A PostHog kliens
ezen felül a böngésző saját címsorából olvassa ki a kampány-paramétereket,
tehát az attribúció akkor is megvan, ha a kimenő `$current_url` tisztított.

> **Ezt az első fizetett kattintás előtt EMPIRIKUSAN ellenőrizni kell.**
> Nyisd meg a fenti példa-URL-t kézzel, adj hozzájárulást, és nézd meg a
> PostHog Activity nézetében, hogy a `$pageview` eseményen ott van-e az
> `utm_campaign`. Ha nincs, az egész attribúció vak, és a hirdetés nem
> indulhat.

### 9.4 Amit a PostHogban be kell állítani

A `docs/posthog.md` 5. fejezete hat dashboardot ír le. **A kampányhoz
három új, kampányra szűrt nézet kell**, a meglévők mellé:

**P1 — Fizetett tölcsér.** Tölcsér (funnel):
`$pageview` → `course_viewed` → **`checkout_started`**, szűrve
`utm_medium = cpc`-re, bontva `utm_content` szerint. **A tölcsér
szándékosan a `checkout_started` lépésnél zárul**, mert a 9.2 szerint ez
a legmélyebb lépés, ami vendégre is megbízhatóan mér.
**Ez válaszolja meg, melyik hirdetéscsoport visz embert a pénztárig.**

Mellé egy MÁSODIK, négylépcsős tölcsér ugyanezekkel a szűrőkkel, a
`purchase_confirmed` lépéssel a végén. Ennek a száma alsó korlát,
és a két tölcsér utolsó lépésének különbsége maga a vendég-arány
becslése.

**P2 — Fizetett lead-tölcsér.** Idősor a `lead_succeeded` eseményre,
`leadSource = ingyenes-kurzus` szűrővel, `utm_content` szerint bontva.
(A tulajdonságkulcs **`leadSource`**, angolul — a `docs/posthog.md` 4b
pontja szerint `forras` kulcsot a kód nem küld.)
Az ingyenes SOS Kézrelax villámkurzus a másodlagos konverzió: olcsóbb,
gyakoribb, és a mért vevőhang szerint az emberek előbb kipróbálnák.
**Kis kereten ez fog először számot mutatni, nem a vásárlás.**

**P3 — Céloldal-minőség kampányonként.** Az `utm_content` szerint
bontott `$pageview` és `course_viewed` aránya. Ha egy csoportnál sokan
érkeznek, de senki nem lép tovább a kurzusra, ott a cikk kurzus-hídja
gyenge, nem a hirdetés.

**Bevételi figyelmeztetés változatlanul érvényes:** a `docs/posthog.md`
D2 pontja szerint a bevétel-tulajdonság neve `value`, a formátum pedig
**„decimal amount"**, nem váltópénz. Rossz beállítással a bevétel
százszorosan téves lesz, és a CPA-számítás vele együtt.

### 9.5 Amit a GA4-ben nézni kell (és amit hiányolni)

**Ma nézhető:** Riportok → Felhasználószerzés, `session_source / medium`
= `google / cpc` bontásban. Ez a kattintás oldalról erősíti meg, amit a
Google Ads mond, és kiszűri, ha a mérés valahol elveszik.

**Ami hiányzik, és külön fejlesztési kör:** a GA4-ben ma nincs `purchase`
és nincs `generate_lead` esemény, tehát **nincs mit kulcsfontosságú
eseménnyé jelölni**, és nincs mit importálni a Google Adsbe. Ez a mai
kódállapot mért ténye, nem hiányosság-vád: a `docs/ga4.md` sosem ígért
egyedi eseményt.

Ha később mégis kell az automatikus konverzió-import (mert a keret
akkorára nő, hogy az okos licit tanulni tud), a sorrend ez:

1. GA4 `purchase` és `generate_lead` esemény küldése a meglévő
   PostHog-eseményekkel azonos pontokon.
2. GA4 → Google Ads fiókösszekapcsolás, a két esemény kulcsfontosságúvá
   jelölése és importja.
3. **A hirdetési hozzájárulás kérdésének rendezése** (11. K2) — enélkül
   a 2. lépés is csak modellezett adatot ad.

Mindhárom lépés kódot és jogi szöveget érint, tehát **külön kör**, nem
ennek a dokumentumnak a hatálya.

### 9.6 Konverziós műveletek a Google Ads oldalán

Akkor is fel kell venni őket, ha a 0.2 miatt keveset fognak mérni:
enélkül a felület nem tud oszlopot mutatni, és a későbbi átállás sem
lesz visszamenőleges.

| Művelet | Típus | Érték | Elsődleges? |
|---|---|---:|---|
| Kurzusvásárlás | Vásárlás | 79 500 Ft (dinamikus) | **igen** |
| Ingyenes villámkurzus igénylése | Lead beküldése | 0 Ft | nem (megfigyelt) |
| Kapcsolatfelvétel | Lead beküldése | 0 Ft | nem (megfigyelt) |

A „megfigyelt" (secondary) besorolás azt jelenti, hogy a licit nem
optimalizál rájuk, de a jelentésben látszanak. Kis kereten ez a helyes
beállítás: az ingyenes lead sokkal gyakoribb, és ha elsődleges lenne,
elnyomná a vásárlást.

---

## 10. Az első 30 nap

### Indulás előtt (mind kötelező)

- [ ] A domain az új platformot szolgálja ki (0.1).
- [ ] A kurzusoldal ígéret-mondata javítva vagy törölve (0.3).
- [ ] A hat cikk publikálva, a két gyógytornász jóváhagyásával.
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` és `NEXT_PUBLIC_GA_MEASUREMENT_ID`
      beállítva, és utána **teljes újraépítés** (mindkettő build-idejű).
- [ ] UTM-teszt kézzel: a `$pageview` eseményen látszik az
      `utm_campaign` (9.3).
- [ ] A negatív listák felvéve és a kampányokhoz rendelve (4.).
- [ ] Számlázási adat és fizetési mód beállítva a Google Ads fiókban.

### Naponta, az első 7 napban

- [ ] Keresési kifejezések jelentés átnézése, negatívok felvétele.
- [ ] Költés ellenőrzése (a napi keret kétszereséig felmehet).
- [ ] Elutasított hirdetés vagy bővítmény keresése (egészségügyi
      témában ez gyakori).

### A 7. napon

- [ ] Van-e olyan kulcsszó, aminek nulla megjelenése van a CPC-korlát
      miatt? Ha igen, döntés: korlát emelése vagy kulcsszó törlése.
- [ ] A tényleges CPC összevetése a 8.2 táblázat becslésével. **Ez az
      első valódi mérés**, ami felülírja az Ahrefs-becslést.

### A 30. napon

- [ ] Tényleges CPA számítása a 9.2 képlettel — **a nevező a Payload
      rendeléslistája, nem a PostHog eseményszáma**.
- [ ] Vásárlási arány mérése (a 8.4 küszöbhöz viszonyítva).
- [ ] A PostHog `purchase_confirmed` és a tényleges rendelésszám
      különbsége = a vendég-vásárlók aránya. Jegyezd fel: ez a szám
      mondja meg, mekkora a mérési vakfolt (9.2).
- [ ] Hirdetéscsoport-szintű döntés: mi marad, mi áll le.
- [ ] Ha van 30+ konverzió: átállás Max. konverzió licitre.
- [ ] Csak ezután szabad keretet emelni vagy széles egyezést nyitni.

---

## 11. Nyitott kérdések — döntést igényelnek, nem találgatást

| # | Kérdés | Kinek | Miért nem dönthető el itt |
|---|---|---|---|
| **K1** | A kurzusoldal „megszüntetheted… akár hetek alatt" mondata átírandó. Mi legyen helyette? | tulajdonos + a két gyógytornász | Eredmény-ígéret időtávval. Felületi szöveg, tehát a `.claude/skills/termektervezes` hatálya alá tartozik, és szakmai jóváhagyás is kell hozzá. **Blokkolja az indulást** (0.3). |
| **K2** | Kerüljön-e hirdetési kategória a hozzájárulási sávba (`ad_storage`, `ad_user_data`)? | tulajdonos + ügyvéd | A `docs/ga4.md` mai döntése szerint sosem nyílik meg. Enélkül a Google Ads konverziómérés vak marad (0.2). Jogi szöveg és felületi munka együtt. |
| **K3** | A `lelki okai` keresések (350 + 300 + 200) — hirdessünk rájuk? | a két gyógytornász | A `docs/monid-adatok-teljes.md` 7.1 hagyta nyitva. Amíg nincs döntés, negatív kulcsszó (4.2/F). |
| **K4** | Kiterjed-e a program a vállra? | a két gyógytornász | Ha igen, a `befagyott váll` (800 keresés, **nulla nehézség**) és a `vállfájdalom` (1 600) megnyílik, és a 4.2/D lista négy sora törlendő. Ha nem, a T2 kampány végleg lekerül. |
| **K5** | Termék-kulcsszavak (rögzítő, sín, krém, pánt): negatívok maradjanak, vagy épüljön rájuk ajánlás-tartalom? | tulajdonos | `docs/monid-adatok-teljes.md` 7.4. Nagy volumen és $3–15 CPC, de nem árulunk terméket. |
| **K6** | Az `SZAMLAZZ_AFAKULCS` értéke `27` vagy `AAM`? | tulajdonos / könyvelő | A nullszaldó 1,91 vagy 2,43 eladás/hó ettől függ (8.4). A `.env*` fájlokat az ügynök nem olvassa. |
| **K7** | Induljon-e külön kampány a rendelői (budapesti) kezelésre? | tulajdonos | A `teniszkönyök` szándéka mérve lokális is, és a mért helyi versenytársak 4,6+ csillagon állnak. Ez másik termék, másik céloldal és Google Cégprofil kell hozzá. |
| **K8** | Mekkora a valódi havi hirdetési keret? | tulajdonos | A 8.3 javaslata 152 000 Ft/hó. A 8.5 megadja a leépítés sorrendjét 60 800 Ft-ig. |
| **K9** | Kerüljön-e a kampány-azonosító (`utm_*`) a rendelés rekordjára a pénztárnál? | vezető | Enélkül a **vendég-vásárlást nem lehet hirdetéscsoporthoz kötni** (9.2). Ma a hirdetés hatását csak összesítve látjuk, csoportonként nem. Ez kódmunka a pénztár-úton, tehát külön kör — de e nélkül a 30. napi „mi maradjon, mi álljon le" döntés részben vak. |

### Amit tudatosan NEM tettünk bele

- **Semmilyen gyógyulási arány, gyógyulási idő vagy alkalomszám-ígéret.**
  A versenytárs formulájának ez a két eleme bevált NEKIK, de klinikai
  állítás, forrás nélkül. A `CLAUDE.md` szabálya és a Google
  „Unreliable claims" politikája is tiltja.
- **Semmilyen diagnózis-állítás.** A hirdetések kérdést tesznek fel
  („Zsibbad a kezed éjszaka?"), nem állapítanak meg semmit.
- **Telefonszám** (6.1).
- **A „100–300 kattintás/nap" szám** a korábbi tervből — a 8.3
  megmutatja, honnan jött és miért nem áll meg a mi kulcsszavainkra.

---

## 12. Források

### A repó mért adatai (minden szám innen jön)

- `docs/kulcsszavak.md` — Ahrefs Keywords Explorer, `country=hu`, 2026-08-21
- `docs/monid-adatok-teljes.md` — Ahrefs matching-terms és SERP, Semrush
  HU, Google Autocomplete; runId-k a 8. szakaszában
- `docs/kampanyterv-mert-adatokbol.md` — versenytárs fizetett kulcsszavak
  és hirdetésszövegek, SERP-ek, Google Maps
- `docs/vevohang-es-hirdetesszoveg.md` — 362 Google Maps-vélemény
  elemzése, runId `01M0HS7GTZK8P6YDGPRKYNJZD6`
- `docs/posthog.md`, `docs/ga4.md` — a mérési rendszer állapota
- `docs/orokolt-url-atiranyitasok.md` — a kanonikus webcímek
- `docs/tudastar-tartalmi-terv.md` — a cikkek slugja és kategóriája
- `src/scripts/restore-legacy-content.ts` — a termékek ára és leírása
- `src/lib/analytics/ga4.ts`, `posthog.ts`, `page-url.ts` — a mérés kódja

### Google — hivatalos szabályok és korlátok

Hozzáférés dátuma mindenütt: **2026-08-21.**

| Amit igazol | Forrás |
|---|---|
| RSA: 15 címsor × 30 karakter, 4 leírás × 90, útvonal 2×15; a kétszeres szélesség csak KO/JA/ZH | [About responsive search ads](https://support.google.com/google-ads/answer/7684791?hl=en) |
| Sitelink szöveg 25 karakter; asztalon 6, mobilon 8 mutatható, minimum 2 kell | [About sitelink assets](https://support.google.com/google-ads/answer/2375416?hl=en-GB) |
| Sitelink leírássor 1–35 karakter, és ha az egyik ki van töltve, a másik is kell | [SitelinkAsset, Google Ads API](https://developers.google.com/google-ads/api/reference/rpc/v21/SitelinkAsset) |
| Kiemelés 25 karakter, legfeljebb 10 jelenhet meg | [About callout assets](https://support.google.com/google-ads/answer/6079510?hl=en) |
| Struktúrált kivonat: érték 1–25 karakter, 3–10 érték, zárt fejléclista | [About structured snippet assets](https://support.google.com/google-ads/answer/6280012?hl=en) · [StructuredSnippetAsset, API](https://developers.google.com/google-ads/api/reference/rpc/v24/StructuredSnippetAsset) |
| A negatív kulcsszó NEM illeszkedik közeli változatra, de a gépelési hibát és a kis-nagybetűt kezeli | [About negative keywords](https://support.google.com/google-ads/answer/2453972?hl=en) |
| Napi keret: a napi kétszerese, havi a 30,4-szerese | [About average daily budgets](https://support.google.com/google-ads/answer/6385083?hl=en) · [About spending limits](https://support.google.com/google-ads/answer/10486637?hl=en) |
| Minőségi mutató három összetevője, köztük a céloldal-élmény | [About Quality Score](https://support.google.com/google-ads/answer/6167118?hl=en) |
| Konverzió-modellezés küszöbe: 700 kattintás / 7 nap, domain × ország | [About consent mode modeling](https://support.google.com/google-ads/answer/10548233?hl=en) |
| Hozzájárulási mód: `ad_storage` / `ad_user_data` megtagadva → süti nélküli mérés | [Consent mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode) |
| „Unreliable claims": tilos valószínűtlen eredménnyel csábítani; a szabály a céloldalra is vonatkozik | [Unreliable claims](https://support.google.com/adspolicy/answer/15936857?hl=en) · [Healthcare and medicines](https://support.google.com/adspolicy/answer/176031?hl=en) |
| Szerkesztői szabály: figyelemfelkeltő célú írásjel (felkiáltójel) nem használható | [Editorial](https://support.google.com/adspolicy/answer/6021546?hl=en) · [Punctuation and symbols](https://support.google.com/adspolicy/answer/14847994?hl=en) |

### Árfolyam

- **1 USD = 314,74 Ft**, MNB hivatalos devizaárfolyam, 2026-08-19.
  <https://www.mnb.hu/arfolyamok>

---

## 13. Karbantartás

Ez **mért pillanatkép 2026-08-21-ről**. Mi avul el, és mikor:

| Mi | Mikor nézd újra | Hogyan |
|---|---|---|
| Kulcsszó-volumen és CPC | fél évente | Ugyanaz a Monid-lekérdezés, ugyanazokkal a paraméterekkel (`docs/monid-adatok-teljes.md` 9.) |
| **A becsült CPC** | **a 7. napon** | A Google Ads tényleges átlagos CPC-je felülírja a becslést. Ekkortól a 8. fejezet számai a mértre cserélendők. |
| Negatív lista | hetente | Keresési kifejezések jelentéséből (4.6) |
| Árfolyam | havonta | MNB |
| A hirdetésszövegek | a 30. napon | A gyenge hirdetéserősségű csoportokban cserélni kell a leggyengébb címsorokat |
| Google karakterkorlátok | évente | A Google változtathat rajtuk; a 12. fejezet hivatkozásai a mérvadók, nem ez a dokumentum |
