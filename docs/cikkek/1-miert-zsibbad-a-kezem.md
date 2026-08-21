# LEKTORÁLANDÓ VÁZLAT. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

> **Mi ez?** A Tudástár C1 cikkének teljes szövegvázlata
> (`docs/tudastar-tartalmi-terv.md` 6. szakasz, C1). A rekord `status` és
> `_status` mezője `draft` marad, amíg Kocsis Kata és Kiss Kata jóvá nem hagyja.
>
> **Készült:** 2026-08-21. **Írta:** cikkíró ügynök, a vezető ellenőrzésére.
> **Minden klinikai állítás forrása** a `docs/orvosi-forrasbazis.md` valamelyik
> tétele. Forrás nélküli klinikai állítás a szövegben nincs (az öntesztet lásd
> az „Állítás és forrás” táblázatban).
>
> **Elsődleges forrásellenőrzés.** A cikkíró nem csak a forrásbázisra
> támaszkodott: mind a 12 hivatkozott forrást ELSŐ KÉZBŐL is megnyitotta
> 2026-08-21-én (NHS-oldalak és az AAOS-irányelv PDF-je letöltve, a lektorált
> közlemények absztraktjai a PubMed E-utilities API-jából). Minden szám, arány
> és megbízhatósági tartomány szó szerint egyezik. Egy eltérés derült ki: az
> NHS a sérülés utáni kar- és csuklózsibbadást a **mentőhívást** igénylő jelek
> közé sorolja, nem az aznapi ellátás közé. A cikk a szigorúbb, helyes
> besorolást követi.
>
> **A kvirtmínuszról:** a feladatkiírás a fájl elejére kvirtmínusszal elválasztott
> „LEKTORÁLANDÓ VÁZLAT” jelzést kért. A `docs/ui-sztenderdek.md` §3.1 viszont
> magyar szövegben tiltja a kvirtmínuszt (U+2014), és a cikk-lint L3 szabálya is
> nulla darabot enged. A jelzés ezért ponttal szerepel, szó szerint ugyanazokkal
> a szavakkal.
>
> **Javítás 2026-08-21-én** (tényellenőrző kör, `docs/cikkek-tenyellenorzes.md`):
> a mentőhívási szint a cikk elejére került (B1), a kurzus saját ellenjavallata
> bekerült az ajánlás mellé (B2), és hat forrás másik fele is a szövegbe került
> (J10, J11, J14, J15, J16, M1). A tételes lista: `docs/cikkek-javitas-naplo.md`.

---

## Felhasznált források (áttekintés)

Mind a nyolc tétel a `docs/orvosi-forrasbazis.md`-ből való, a forrásbázis
azonosítójával. A teljes, hozzáférési dátumos jegyzék a cikk végén áll.

| Azonosító | Forrás | Típus |
|---|---|---|
| ZS1 | NHS. Pins and needles. Felülvizsgálva 2024-01-04. | Nemzeti egészségügyi szolgálat |
| ZS3 | Iyer S, Kim HJ. Cervical radiculopathy. Curr Rev Musculoskelet Med. 2016. PMID 27250042. | Lektorált áttekintés |
| ZS5 | Graf A és mtsai. Modern Treatment of Cubital Tunnel Syndrome. J Hand Surg Glob Online. 2023. PMID 37521554. | Lektorált áttekintés |
| ZS6 | Bateman M és mtsai. Effectiveness of night splints for cubital tunnel syndrome. Hand Ther. 2025. PMID 40385935. | Szisztematikus áttekintés |
| CTS1 | NHS. Carpal tunnel syndrome. Felülvizsgálva 2024-04-17. | Nemzeti egészségügyi szolgálat |
| CTS2 | AAOS. Management of Carpal Tunnel Syndrome. Evidence-Based Clinical Practice Guideline, 2024-05-18. | Hivatalos irányelv |
| CTS3 | Karjalainen TV és mtsai. Splinting for carpal tunnel syndrome. Cochrane Database Syst Rev. 2023. PMID 36848651. | Cochrane-áttekintés |
| CTS9 | AAOS OrthoInfo. Carpal Tunnel Syndrome. Szerző: Tyler Steven Pidgeon MD; lektor: Thomas Ward Throckmorton MD. | Szakmai szervezet |
| CTS10 | Ballestero-Pérez R és mtsai. Effectiveness of Nerve Gliding Exercises on Carpal Tunnel Syndrome. J Manipulative Physiol Ther. 2017. PMID 27842937. | Szisztematikus áttekintés |
| VZ1 | NHS. Stroke, Symptoms. Felülvizsgálva 2024-09-12. | Nemzeti egészségügyi szolgálat |
| VZ2 | NHS. Wrist pain. Felülvizsgálva 2025-11-05. | Nemzeti egészségügyi szolgálat |
| VZ3 | NHS. Broken arm or wrist. Felülvizsgálva 2023-05-26. | Nemzeti egészségügyi szolgálat |

---

## CMS-mezők az integrátornak

Ezek a `docs/tudastar-tartalmi-terv.md` 4. és 6. szakaszában rögzített,
kötelező értékek. A cikkíró nem talált ki belőlük semmit.

| Mező | Érték |
|---|---|
| `title` (H1) | Miért zsibbad a kezem? |
| `slug` | `miert-zsibbad-a-kezem` |
| `seoTitle` | Kéz zsibbadás: okok, éjszakai zsibbadás, teendők otthon |
| `seoDescription` | Kéz zsibbadás okai: melyik ujjad zsibbad, miért éjszaka, mit tehetsz otthon, és mikor sürgős. Gyógytornászok forrásolt összefoglalója. |
| `excerpt` | A kéz zsibbadás tünet, nem diagnózis: sokféle ok állhat mögötte. Megmutatjuk, mit jelezhet a mintázat, mit tehetsz otthon, és mikor kell orvoshoz fordulni. |
| Kategória | Kéz és csukló (`kez-es-csuklo`) |
| `author` | Kiss Kata (gyógytornász, manuálterapeuta, sportrehabilitációs tréner) |
| `publishedAt` | `2026-09-01T08:00:00.000Z` |
| `status` / `_status` | `draft` / `draft` |
| `relatedPosts` | `keztoalagut-szindroma`, `csuklo-es-kezfajdalom`, `csuklotores-utani-gyogytorna` |
| `heroImage`, `ogImage` | üresen marad |

---
---

# Miért zsibbad a kezem?

Ez a szöveg lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása előtt
nem publikálható.

Felébredsz éjjel, mert elzsibbadt a kezed. Megrázod, és lassan visszatér az
érzés. Reggelre elmúlik, másnap éjjel újra kezdődik.

Zsibbadásnál könnyű halogatni a kivizsgálást, mert nem fáj annyira, hogy
sürgősnek érezd.

Végigmegyünk azon, mit jelezhet a zsibbadás, mit tehetsz otthon, és mikor kell
orvoshoz fordulni. Diagnózist nem adunk: azt vizsgálat nélkül nem lehet.

## Előbb ezt: mikor kell azonnal mentőt hívni?

Van néhány jel, aminél nem cikket kell olvasni, hanem a 112-t hívni. Ezért áll
ez a szakasz elöl, és nem a végén.

**Stroke jelei.** Lelóg az arc egyik fele, erőtlen vagy zsibbadt az egyik kar,
akadozik a beszéd. Ugyanígy sürgős a test egyik oldalára kiterjedő erőtlenség
vagy zsibbadás, a homályos látás, a hirtelen erős fejfájás és a szédülés.
Ilyenkor azonnal hívj mentőt, Magyarországon a 112-t.

Ezt külön ki kell emelni: ha a stroke jelei már el is múltak, de 24 órán belül
megvoltak, akkor is azonnali segítség kell.

**Sérülés után.** Négy jelnél kell mentőt hívni:

- a sérült kar vagy csukló zsibbad, bizsereg,
- erősen vérző seb van rajta,
- a csont kiáll a bőrből,
- a kar vagy a csukló alakja megváltozott.

**Ha megijedtél.** Amikor a zsibbadás mellett olyan tünet is jelentkezik, ami
megrémít, például mellkasi panasz vagy rosszullét, ne a keresőben keresd a
választ. Hívd a 112-t. Ezt telefonon percek alatt eldöntik. Egy cikkből nem
lehet.

Ez a szakasz a sürgős eseteket sorolja. Amikor nem sürgős, de orvos kell, azt a
„Mikor fordulj azonnal orvoshoz?” és a „Mikor kell kivizsgálás, ha nem sürgős?”
szakaszban szedtük össze.

## Mit jelent, ha zsibbad a kezed?

A zsibbadás tünet, nem diagnózis. Sokféle, egymástól nagyon távoli ok állhat
mögötte, és ezek nem ugyanazt a kezelést igénylik.

Lehetséges okként szóba jön a cukorbetegség, a Raynaud-jelenség, a
hiperventillációt, az isiászt és a sclerosis multiplexet is felsorolja. A
tartósan megmaradó zsibbadás okai között a nyakban vagy a hátban becsípődött
ideget is nevesíti.

Az okok egy részénél az ideg nyomás alá kerül. A kéztőalagút-szindróma például a
középideg nyomás okozta károsodása, és jellemzően a hüvelyk-, a mutató- és a
középső ujjban okoz fájdalmat, zsibbadást, bizsergést.

Egy mondatot külön ki kell emelni: „ne diagnosztizáld magad,
menj háziorvoshoz, ha aggódsz”. Mi is így gondoljuk. Az alábbi mintázatok tájékozódásra valók,
nem öndiagnózisra.

## Melyik ujjad zsibbad? A mintázat sokat elárul

Az érintett ujjak mintázata szűkíti a lehetséges okok körét, de önmagában nem
elég a diagnózishoz.

**A hüvelyk, a mutató és a középső ujj.** A
kéztőalagút-szindróma zsibbadása elsősorban a hüvelyk-, a mutató-, a középső és
a gyűrűsujjat érinti. Erről az állapotról külön cikkben írtunk, ott a nem műtéti
lehetőségeket is végigvesszük a
[kéztőalagút-szindrómáról szóló összefoglalónkban](/blog/keztoalagut-szindroma).

**A gyűrűs- és a kisujj.** A könyöknél becsípődő singideg leggyakoribb tünete
éppen ez: időszakos zsibbadás és bizsergés a gyűrűs- és a kisujjban. Ez a felső
végtag második leggyakoribb perifériás idegbecsípődése.

**Az egész kar.** A nyaki gerincből kiinduló idegi panasz jellemzően nyak- vagy
karfájdalommal jelentkezik. Fontos kiemelni, hogy ezt el kell
különíteni a perifériás idegbecsípődésektől és a vállpanaszoktól.

Figyelj a gyűrűsujjra: a jellemző tünetek közt és a singideg panaszainál is szerepel.
Vagyis a mintázat nem döntési fa. Irányt ad, de a vizsgálatot nem pótolja.

## Miért zsibbad a kezed éjszaka?

Az éjszaka erősödő kézzsibbadás a kéztőalagút-szindróma jellegzetes mintázata.

A kéztőalagút-szindróma tünetei lassan indulnak, jönnek-mennek, és
éjjel a legerősebbek.

Ennél pontosabban: a tünetek gyakran felébresztik
az embert, és sokaknál a kéz mozgatása vagy rázogatása enyhíti őket. Ugyanitt
szerepel az ügyetlenség és a tárgyak elejtése is.

Ez ismerős lehet, de nem bizonyíték. Az éjszakai zsibbadásnak más oka is lehet,
és itt is óvatosnak kell lenni az öndiagnózissal. Ha a mintázat rád illik, a részleteket megtalálod a
[kéztőalagút-szindrómáról szóló cikkünkben](/blog/keztoalagut-szindroma).

## Számít, hogy a bal vagy a jobb kezed zsibbad?

Önmagában az oldal ritkán mondja meg az okot.

A lehetséges okok közül egyik sem az oldaltól függ. Cukorbetegség,
Raynaud-jelenség, becsípődött ideg, gyógyszermellékhatás: mindegyik
jelentkezhet a bal és a jobb kézen is.

Egy kivétel viszont van, és ez életmentő. Ha a zsibbadás hirtelen kezdődik a
test egyik oldalán, és mellette lelóg az arc egyik fele, erőtlen a kar vagy
akadozik a beszéd, az stroke gyanúja. Ilyenkor azonnal a 112-t kell hívni,
ahogy a cikk elején is írjuk.

## Mi okozhat még zsibbadást?

A zsibbadásnak sok oka lehet, és nem mind a kézben keresendő.

Lehetséges okok a következők.

- Cukorbetegség.
- Raynaud-jelenség, ha az ujjaid színt is váltanak.
- Hiperventilláció, ha kapkodó légzés és remegő kéz kíséri.
- Isiász, ha a hátból a lábba sugárzik.
- Sclerosis multiplex, ha a test több pontján jelentkezik.

A tartósan megmaradó zsibbadásnál ezek jöhetnek szóba.

- Kemoterápia.
- Egyes gyógyszerek: HIV-gyógyszer, görcsgátló, bizonyos antibiotikumok.
- Mérgező anyagok, például ólom és sugárzás.
- Rossz táplálkozás.
- A hátban vagy a nyakban becsípődött ideg.
- Sérülés vagy betegség utáni idegkárosodás.
- Túlzott alkoholfogyasztás.

A könyöknél becsípődő singideg is okozhat zsibbadást. Az éjszakai sín itt gyakori
javaslat, a bizonyíték viszont gyenge.

Az eddigi kutatás egyetlen olyan vizsgálatot
talált, amely a sínt kontrollcsoporthoz hasonlította. Ez a vizsgálat magas
torzítási kockázatú volt, és nem talált különbséget a csoportok között.

Egy további randomizált és három egykarú vizsgálat azt jelezte, hogy az enyhe
és közepes esetek többsége javul az éjszakai sín mellett. Ezek is magas, súlyos
vagy kritikus torzítási kockázatúak, és a szerzők kiírják: nem tudni, hogy a
javulás a kezeléstől vagy pusztán az idő múlásától volt-e.

A bizonyosság szintje nagyon alacsony, és a
szerzők szerint jelenleg nem eldönthető, ajánlható-e az éjszakai sín ennél az
állapotnál.

### Tényleg a sok gépeléstől van?

A sok billentyűzethasználat és a kéztőalagút-szindróma összefüggése nem igazolt.

A mai szakmai álláspont: megbízható bizonyíték hiányában a
munkacsoport véleménye szerint nincs összefüggés a sok billentyűzethasználat és a
kéztőalagút-szindróma között. A bizonyíték minőségét itt nagyon alacsonynak
jelölik, az ajánlás pedig szakértői konszenzus.

Ez fontos különbség. Nem azt jelenti, hogy bizonyítottan nincs kapcsolat. Azt
jelenti, hogy megbízható vizsgálat egyik irányban sem áll rendelkezésre.

## Mit lehet tenni kézzsibbadás ellen otthon?

Az első lépés a terhelés csökkentése és a csukló kímélő tartása. A
kéztőalagút-eredetű zsibbadásnál pedig az éjszakai csuklósín az, amire a
legtöbb bizonyíték van.

### Az éjszakai csuklósín: erre van bizonyíték

Első lépésként a csuklósín jön szóba, és érdemes tudni a valós időigényt is:
akár 6 hetet is viselni kell, mire javulni kezd.

Az eddigi vizsgálatok összesítéséből a következő rajzolódik ki.
Az éjszakai sín viselése rövid távon nagyobb eséllyel hozott általános javulást,
mint a kezelés nélküli állapot. A kockázati arány 3,86, a 95%-os megbízhatósági
tartomány 2,29 és 6,51 között.

Ez az eredmény egyetlen, 80 fős vizsgálatból származik, és a bizonyosság szintje
alacsony.

A tünetskálán mért javulás viszont kicsi. A Boston-kérdőív tünetskáláján 0,37
pont a sín javára, a megbízhatósági tartomány 0,82 ponttal jobb és 0,08 ponttal
rosszabb között. Ez a klinikailag érdemi 1 pontos küszöb alatt marad, alacsony
bizonyossági szinttel.

A szerzői következtetés első mondatával kell kezdeni, mert az a fejmondat.
Nincs elég bizonyíték annak eldöntésére, használ-e a sín a
kéztőalagút-szindrómában szenvedőknek.

A korlátozott bizonyíték a tünetek és a kézfunkció kis javulását nem zárja ki, de
ez a javulás lehet, hogy klinikailag nem érdemi.

És csak ezután jön a mondat, amit sokat idéznek. A sín olcsó beavatkozás, tartós
ártalma nem ismert, ezért a kis hatás is indokolhatja a használatát, különösen
annál, aki nem szeretne műtétet vagy injekciót.

A kettő együtt adja ki a valós képet. Nem tudjuk, hogy használ-e, de olcsó és
ártalmatlan, tehát megpróbálható.

Egyet viszont nem ígérhetünk. Bizonytalan, hogy
a sín csökkenti-e a műtétre küldés arányát: a bizonyosság szintje itt nagyon
alacsony. A sín tehát nem műtét-elkerülő
eszköz, hanem egy megpróbálható lépés a döntés előtt.

### Idegsiklató gyakorlatok: kiegészítő, nem megoldás

Az idegsiklató gyakorlatok kiegészítőként jönnek szóba, korlátozott
bizonyítékkal.

A nem műtéti lehetőségek közé tartoznak: egyes pácienseknek
segíthetnek azok a gyakorlatok, amelyek a középideg szabadabb mozgását
támogatják.

Egy 13 klinikai vizsgálatot áttekintő munka óvatosabb. A szerzők szerint a
fájdalom csökkentésére a szokásos konzervatív ellátás tűnik a legmegfelelőbbnek.
Az idegsiklatás inkább kiegészítő, amely gyorsíthatja a funkció visszatérését.

A 13 vizsgálatból 6 gyenge minőségűnek bizonyult.

### Amit a gyakorlatokról őszintén el kell mondanunk

A gyakorlatozás a jelenlegi bizonyíték szerint nem javítja a
kéztőalagút-szindróma hosszú távú, páciens által jelentett eredményét.

Erős bizonyíték szól olyan
nem műtéti módszereket, amelyek nem javítják a páciens által jelentett hosszú
távú eredményt. Ezen a listán a gyakorlatozás, a masszázs és a manuálterápia is
szerepel.

Az érem másik oldalát is kiírjuk. Ez az ajánlás gyengébb lábakon áll, mert a
vizsgált kezelések, a módszerek minősége és az utánkövetési idők nagyon
eltérőek voltak.

Azt is fontos tudni, hogy a konzervatív módszerek között nincs
jelentős különbség a páciens által jelentett eredményekben.

Ezt nem hallgatjuk el, mert a döntésed a tiéd. A rendezett otthoni gyakorlás
attól még segíthet a tünetek kezelésében és a terhelés átalakításában. Aki egy
rövid, vezetett kezdéssel indulna, annak belépő az ingyenes
[SOS Kézrelax villámkurzusunk](/kurzusok/sos-kezrelax-villamkurzus). A
villámkurzusban látod, mit vizsgálunk mi az egyes kórképeknél. Ezek tájékozódásra
valók: a diagnózist orvosi vizsgálat adja meg, nem egy otthon elvégzett teszt.

### Amit a terhelésen változtathatsz

A fájdalmat vagy zsibbadást kiváltó tevékenység csökkentése az egyik első
javasolt lépés.

Ezeket érdemes kipróbálni.

- Pihentesd a csuklódat.
- Mozgasd finoman a kezed és a csuklód.
- Hagyd abba vagy csökkentsd a panaszt okozó tevékenységet. Ilyen lehet a
 gépelés, a rezgő szerszám vagy a hangszeres játék.
- Viselj sínt, főleg éjszakára.

Azt is érdemes tudni, hogy a gyógyszerész tud segíteni a fájdalomcsillapító és a
sín kiválasztásában, és abban is, kell-e orvoshoz menned. Ez alacsony küszöbű, gyors lépés.

## Mikor NE végezd a gyakorlatokat?

Ne gyakorolj, ha az alábbi jelek bármelyike fennáll. Ilyenkor a vizsgálat az első.

- **Vörös zászlót látsz.** Stroke jeleinél, friss sérülés utáni zsibbadásnál vagy
 megszűnt érzésnél nem gyakorlat kell, hanem orvos vagy mentő.
- **Éles fájdalom kísér.** A gyakorlatok nem kell, hogy fájjanak. Éles fájdalom
 esetén hagyd abba, és kérj szakmai segítséget. Ez a saját kurzusaink
 ellenjavallati szabálya is.
- **Műtéted volt.** Műtét után mindig a kezelőorvosod vagy gyógytornászod
 jóváhagyásával kezdj bele.
- **Friss sérülés után vagy.** A sérülést követő első 2-3 napban kerülendő a
 melegítő pakolást és a forró fürdőt. Nehezet emelni és erősen szorítani sem
 szabad.

A sín sem mindenkinél kellemetlenségmentes. Az összesített vizsgálatok egyik
vizsgálatában a sínt viselő 40 résztvevőből 7 (18%) számolt be múló
mellékhatásról, a kezelés nélküli csoportban egy sem. A bizonyosság szintje itt
alacsony, és a megbízhatósági tartomány a hatás hiányát is magában foglalta.

## Mikor fordulj azonnal orvoshoz?

Hívj mentőt (112), ha a zsibbadás mellett stroke jelei mutatkoznak, vagy ha
sérülés után zsibbad a karod.

### Stroke jelei: azonnal 112

Stroke gyanújánál a mentőhívás nem várhat.

- Lelóg az arc egyik fele, erőtlen vagy zsibbadt az egyik kar, akadozik a beszéd.
- Erőtlenség vagy zsibbadás a test egyik oldalán, homályos látás, hirtelen erős
 fejfájás, szédülés.

Fontos: ha a stroke tünetei már elmúltak, de 24 órán belül megvoltak,
akkor is azonnali segítség kell.

### Sérülés után: ezeknél is mentő kell

Sérülés után az alábbi négy jelnél kell mentőt hívni.

- A sérült kar vagy csukló zsibbad, bizsereg.
- Erősen vérző seb van rajta.
- A csont kiáll a bőrből.
- A kar vagy a csukló alakja megváltozott, vagy szokatlan szögben áll.

### Aznap orvos vagy ügyelet

Ezeknél a jeleknél még aznap ellátás kell.

- A kéz egy részén vagy egészén megszűnt az érzés.
- Erős csuklófájdalom ájulásérzéssel, hányingerrel, lázzal vagy hidegrázással.
- A csukló alakja vagy színe megváltozott.
- A csuklódon lévő csomó nagyon fájdalmas, forró vagy piros.
- Reccsenő, csikorgó vagy pattanó hangot hallottál a sérüléskor.
- Nem tudod mozgatni a csuklód, vagy nem tudsz megfogni semmit.

## Mikor kell kivizsgálás, ha nem sürgős?

Bármilyen tartósan megmaradó bizsergés vagy érzéskiesés a kézen orvosi
kivizsgálást igényel.

Ezek a helyzetek jellemzőek.

- Bármilyen bizsergés vagy érzéskiesés a kézen.
- Két hét otthoni kezelés után sem javuló panasz.
- Cukorbetegség mellett jelentkező kézpanasz, mert ilyenkor a kézproblémák
 komolyabbak lehetnek.

Fontos tudni, hogy a kéztőalagút-szindróma tüneteivel orvoshoz kell
fordulni, ha romlanak vagy nem múlnak.

Jó hír is van. A kéztőalagút-szindróma néha magától rendeződik
néhány hónap alatt, különösen akkor, ha terhesség miatt alakult ki.

Ha a fájdalom is társul a zsibbadáshoz, arról külön írtunk a
[csukló- és kézfájdalomról szóló cikkünkben](/blog/csuklo-es-kezfajdalom). Ha
pedig törés vagy gipsz után indulnál újra, a
[csuklótörés utáni gyógytornáról szóló összefoglalónk](/blog/csuklotores-utani-gyogytorna)
segít.

## Hogyan tovább, ha a kivizsgálás nem talált sürgős okot?

Ilyenkor a rendezett, fokozatosan felépített otthoni gyakorlás a következő lépés.

Kiss Kata és Kocsis Kata vagyunk, gyógytornászok és sportrehabilitációs trénerek.
Évek óta elsősorban a kéz rehabilitációjával foglalkozunk.

Otthon jellemzően nem a kitartás hiányzik. A sorrend és az adagolás az, ami
nehéz egyedül.

Az [Otthoni KézRehab Program](/kurzusok/otthoni-kezrehab-program) pontosan ezt a
hiányt tölti be. Csukló-, ujj-, alkar- és könyökpanaszokra állítottuk össze:
4 modulnyi videóanyag, 50+ videós gyakorlat, 5 perces miniblokkokban.

Ha nem tudsz rendelői alkalmakra járni, ezt otthon, a saját tempódban végezheted.
Nincs időpont, nincs bérlet, és bármikor visszanézheted.

**Vásárlás előtt ezt tudnod kell, és pont ennek a cikknek az olvasóira
tartozik.** A program leírásában szerepel, hogy nem javasoljuk, ha:

- már jelentkezett érzéskiesés,
- régebb óta tart jelentős gyengülés a szorítóerődben,
- izomtömeg-vesztés látszik a tenyereden,
- műtétre vársz.

Ilyenkor előbb a kivizsgálás következik, nem a gyakorlás.

Amit nem ígérünk: nem gyógyítunk meg, és nem váltjuk ki a műtéti döntést.
A kurzus nem helyettesíti a szakorvosi vizsgálatot és a kontrollt. Ha a
kivizsgálás sürgős okot talál, azt kell követni.

## Állítás és forrás: a cikkíró öntesztje

A `docs/tudastar-tartalmi-terv.md` 5.8/2. pontja tételes öntesztet ír elő. Minden
klinikai állítás egy sor. Forrás nélküli klinikai állítás: **0 darab**.

| # | Állítás a cikkben | Forrás | Szám szó szerint egyezik? |
|---|---|---|---|
| 1 | A zsibbadás lehetséges okai: cukorbetegség, Raynaud, hiperventilláció, isiász, sclerosis multiplex | ZS1 | nincs szám |
| 2 | Tartós zsibbadás okai: kemoterápia, HIV-gyógyszer, görcsgátló, antibiotikum, ólom, sugárzás, rossz táplálkozás, becsípődött ideg, idegkárosodás, alkohol | ZS1 | nincs szám |
| 3 | „Ne diagnosztizáld magad, menj háziorvoshoz, ha aggódsz” | ZS1 | idézet, tartalmi fordítás |
| 4 | A kéztőalagút-szindróma a középideg nyomás okozta károsodása, jellemzően a hüvelyk-, mutató- és középső ujjban | CTS3 (háttérszakasz) | nincs szám |
| 5 | A CTS zsibbadása elsősorban a hüvelyk-, mutató-, középső és gyűrűsujjat érinti | CTS9 | nincs szám |
| 6 | A singideg-becsípődés leggyakoribb tünete időszakos zsibbadás a gyűrűs- és kisujjban | ZS5 | nincs szám |
| 7 | A singideg-becsípődés a felső végtag második leggyakoribb perifériás idegbecsípődése | ZS5 | „második” egyezik |
| 8 | A nyaki eredetű panasz nyak- vagy karfájdalommal jelentkezik, és el kell különíteni a perifériás becsípődésektől és a vállpanaszoktól | ZS3 | nincs szám |
| 9 | A CTS tünetei lassan indulnak, jönnek-mennek, éjjel a legerősebbek | CTS1 | nincs szám |
| 10 | A tünetek gyakran felébresztik az embert; a kéz rázogatása sokaknál enyhíti; ügyetlenség, tárgyak elejtése | CTS9 | nincs szám |
| 11 | Stroke-jelek: arclelógás, kar erőtlensége, akadozó beszéd; azonnal mentő | VZ1 | nincs szám |
| 12 | Ha a stroke tünetei 24 órán belül voltak, akkor is azonnali segítség kell | VZ1 | 24 óra egyezik |
| 13 | Stroke egyéb jelei: egyoldali erőtlenség vagy zsibbadás, homályos látás, hirtelen erős fejfájás, szédülés | VZ1 | nincs szám |
| 14 | Az éjszakai sín bizonyítéka a singideg-becsípődésnél: egyetlen RCT, magas torzítási kockázat, nagyon alacsony bizonyosság, nem eldönthető | ZS6 | „egyetlen” egyezik |
| 15 | A sok billentyűzethasználat és a CTS összefüggése nem igazolt; munkacsoporti konszenzus, nagyon alacsony bizonyítékminőség | CTS2 | „Very Low”, „Consensus” egyezik |
| 16 | A csuklósínt akár 6 hétig kell viselni, mire javulni kezd | CTS1 | 6 hét egyezik |
| 17 | Cochrane: 29 vizsgálat, 1937 felnőtt | CTS3 | 29 és 1937 egyezik |
| 18 | Éjszakai sín kontra semmi, általános javulás: RR 3,86 (95% CI 2,29 és 6,51 között), 1 vizsgálat, 80 fő, alacsony bizonyosság | CTS3 | mind egyezik |
| 19 | Boston tünetskála: 0,37 pont a sín javára (95% CI 0,82 jobb és 0,08 rosszabb között), az 1 pontos küszöb alatt, alacsony bizonyosság | CTS3 | mind egyezik |
| 20 | A szerzők következtetése: olcsó, tartós ártalom nélküli beavatkozás, a kis hatás is indokolhatja, főleg annál, aki nem akar műtétet vagy injekciót | CTS3 | idézet, tartalmi fordítás |
| 21 | Bizonytalan, hogy a sín csökkenti-e a műtétre küldést; nagyon alacsony bizonyosság | CTS3 | egyezik |
| 22 | Sín-mellékhatás: 40-ből 7 (18%) múló panasz, a kontrollcsoportban 0; alacsony bizonyosság, a CI a hatás hiányát is tartalmazta | CTS3 | 40, 7, 18%, 0 egyezik |
| 23 | Az AAOS OrthoInfo szerint egyes pácienseknek segíthetnek a középideg mozgását támogató gyakorlatok | CTS9 | nincs szám |
| 24 | Idegsiklatás: 13 vizsgálat, ebből 6 gyenge minőségű; a szokásos konzervatív ellátás tűnik a legjobbnak a fájdalomra; az idegsiklatás kiegészítő | CTS10 | 13 és 6 egyezik |
| 25 | Az AAOS 2024 magas minőségű bizonyítékra hivatkozva sorolja a gyakorlatozást, a masszázst és a manuálterápiát azok közé, amelyek nem javítják a hosszú távú, páciens által jelentett eredményt | CTS2 | „High” egyezik |
| 26 | Az AAOS 2024 szerint a konzervatív módszerek között nincs jelentős különbség a páciens által jelentett eredményekben | CTS2 | egyezik |
| 27 | NHS otthoni tanács: pihentetés, finom mozgatás, a panaszt okozó tevékenység csökkentése (gépelés, rezgő szerszám, hangszer), éjszakai sín | VZ2/CSF1 | nincs szám |
| 28 | A gyógyszerész segít a fájdalomcsillapító és a sín kiválasztásában, és abban, kell-e orvos | VZ2/CSF1 | nincs szám |
| 29 | Sérülés után az első 2-3 napban nincs melegítés és forró fürdő, nincs nehézemelés és erős szorítás | VZ2/CSF1 | 2-3 nap egyezik |
| 30 | Sérülés utáni zsibbadás vagy bizsergés, kiálló csont, alak- vagy szögváltozás: MENTŐHÍVÁS szintje | VZ3 | nincs szám |
| 31 | Megszűnt érzés a kézen; erős fájdalom ájulásérzéssel, hányingerrel, lázzal; alak- vagy színváltozás; nagyon fájdalmas, forró, piros csomó a csuklón; reccsenő hang a sérüléskor; mozgathatatlan csukló: aznapi ellátás | VZ2 | nincs szám |
| 32 | Bármilyen bizsergés vagy érzéskiesés a kézen orvosi kivizsgálást igényel | VZ2 | nincs szám |
| 33 | Két hét otthoni kezelés után sem javuló panasznál orvos kell | VZ2 | 2 hét egyezik |
| 34 | Cukorbetegség mellett a kézpanasz komolyabb lehet | VZ2 | nincs szám |
| 35 | A CTS tüneteivel orvoshoz kell fordulni, ha romlanak vagy nem múlnak | CTS1 | nincs szám |
| 36 | A CTS néha magától rendeződik néhány hónap alatt, különösen terhesség esetén | CTS1 | „néhány hónap” egyezik |

**Kiegészítés a 2026-08-21-i tényellenőrző kör után.** Négy sor változott vagy
került be, ezek forrása is ellenőrizve:

| # | Állítás a cikkben | Forrás | Szám szó szerint egyezik? |
|---|---|---|---|
| 14b | A Bateman-áttekintésben egy további RCT és három egykarú vizsgálat azt jelezte, hogy az enyhe és közepes esetek többsége javul, de nem tudni, a kezeléstől vagy az idő múlásától | ZS6 | „One additional RCT”, „three single-arm studies” egyezik |
| 25b | Az AAOS 2024 ugyanennél a pontnál „Limited (Downgraded)” ajánláserősséget ad, az indoklás a kezelések, a vizsgálatminőség, a kontrollcsoportok és az utánkövetési idők eltérése | CTS2 | „Limited (Downgraded)” egyezik |
| 30b | A sérülés utáni mentőhívós lista NÉGY tételes, benne az erősen vérző seb | VZ3 | „a bad cut that is bleeding heavily” egyezik |
| 31b | A csuklón lévő CSOMÓ (nem duzzanat) nagyon fájdalmas, forró vagy piros | VZ2 | „a lump on your wrist” egyezik |

**Nem klinikai állítások a szövegben** (a lektornak külön ellenőrizendők):
a nyitás „könnyű halogatni a kivizsgálást” mondata helyzetleírás, nem forrásolt
epidemiológiai adat (a korábbi, praxisra hivatkozó változatot a tényellenőrzés
J11 pontja miatt cseréltük). A „Ha megijedtél” bekezdés útbaigazítás, nem
klinikai állítás: nem mondja meg, mit jelent a mellkasi panasz, csak azt, hogy
hova kell fordulni vele. **Ezt a bekezdést a két gyógytornásznak külön jóvá kell
hagynia.** A kurzus leírása („csukló-, ujj-, alkar- és könyökpanaszokra”) és az
ellenjavallati felsorolás a meglévő termékleírásból való, betűhíven. Az „éles
fájdalom esetén hagyd abba” és a „műtét után a kezelőorvos jóváhagyásával” a
kurzusok saját ellenjavallati szövege.

## A cikkíró javaslata a vezetőnek: GYIK-blokk (NEM része a kiírásnak)

A mért adatban szerepel a `kéz zsibbadás éjszaka gyakori kérdések` kifejezés
(90 keresés/hó, KD 0, `docs/monid-adatok-teljes.md` 2.1), a technikai terv pedig
támogat `faq` mezőt FAQPage-sémával. A C1 kiírás GYIK-et nem kér, ezért ezt a
vezető döntésére bízom. Ha kell, ez a négy tétel a cikkből forrásolva áll össze,
és megfelel az L11 lint-szabálynak (2-6 tétel, kérdőjel, legfeljebb 500 karakter).

1. **Miért zsibbad a kezem éjszaka?** Az éjszaka erősödő kézzsibbadás a
   kéztőalagút-szindróma jellegzetes mintázata: az NHS szerint a tünetek éjjel a
   legerősebbek, az AAOS OrthoInfo szerint gyakran felébresztik az embert, és a
   kéz rázogatása sokaknál enyhíti őket. Ez azonban nem bizonyíték, más ok is
   állhat mögötte.
2. **Melyik ujj zsibbadása mit jelent?** A hüvelyk, a mutató, a középső és a
   gyűrűsujj zsibbadása leggyakrabban a kéztőalagút-szindrómához köthető (AAOS
   OrthoInfo), a gyűrűs- és a kisujjé a könyöknél becsípődő singideghez (Graf és
   mtsai, 2023). A gyűrűsujj mindkét mintázatban szerepel, ezért a mintázat
   irányt ad, de nem diagnózis.
3. **Segít az éjszakai csuklósín?** Az NHS első lépésként ajánlja, és akár 6 hét
   viselést ír. A Cochrane 2023-as áttekintése szerint rövid távon nagyobb
   eséllyel hoz általános javulást, mint a semmi (RR 3,86), de a tünetskálán mért
   különbség a klinikailag érdemi küszöb alatt marad, alacsony bizonyossággal.
4. **Mikor sürgős a kézzsibbadás?** Azonnal hívj mentőt (112), ha a zsibbadás
   mellett lelóg az arc egyik fele, erőtlen a kar vagy akadozik a beszéd. Az NHS
   szerint akkor is, ha a jelek már elmúltak, de 24 órán belül megvoltak.
   Sérülés utáni zsibbadásnál és megszűnt érzésnél aznap kell ellátás.
