# LEKTORÁLANDÓ VÁZLAT. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

> Ez a fájl a Tudástár 2. cikkének szövegváltozata (`docs/tudastar-tartalmi-terv.md`
> 4. szakasz, C2). A rekord `status` és `_status` mezője egyaránt `draft` marad,
> amíg Kocsis Kata és Kiss Kata a klinikai tartalmat jóvá nem hagyja.
> A cikk törzse a „Kéztőalagút-szindróma: mit tehetsz, mielőtt műtétre kerül a sor?”
> H1-től a „Forrásjegyzék” szakaszig tart.

## Felhasznált források (azonosítóval, a `docs/orvosi-forrasbazis.md` szerint)

| Azonosító | Forrás | Hol használtuk |
|---|---|---|
| CTS1 | NHS. *Carpal tunnel syndrome.* https://www.nhs.uk/conditions/carpal-tunnel-syndrome/ · felülvizsgálva 2024-04-17 · hozzáférés 2026-08-21 | mi ez, tünetek, kockázati tényezők, terhesség, sín, injekció, kézgyakorlatok, fájdalomcsillapító, mikor orvoshoz, műtét utáni idők |
| CTS2 | American Academy of Orthopaedic Surgeons. *Management of Carpal Tunnel Syndrome. Evidence-Based Clinical Practice Guideline.* 2024-05-18. https://www.aaos.org/globalassets/quality-and-practice-resources/carpal-tunnel/carpal-tunnel-2024/cts-cpg.pdf · hozzáférés 2026-08-21 | billentyűzet-konszenzus, injekció hosszú távon, a hosszú távon nem javító módszerek listája, konzervatív módszerek közti különbség, CTS-6, MRI és neurodinamikai teszt |
| CTS3 | Karjalainen TV és mtsai. *Splinting for carpal tunnel syndrome.* Cochrane Database Syst Rev. 2023;2(2):CD010003. PMID 36848651. | az éjszakai sín minden száma és a szerzői zárómondat |
| CTS4 | Ashworth NL és mtsai. *Local corticosteroid injection versus placebo for carpal tunnel syndrome.* Cochrane Database Syst Rev. 2023;2(2):CD015148. PMID 36722795. | injekció placebóhoz képest, 3 és 6 hónap, műtéti igény |
| CTS6 | Lusa V és mtsai. *Surgical versus non-surgical treatment for carpal tunnel syndrome.* Cochrane Database Syst Rev. 2024;1(1):CD001552. PMID 38189479. | műtét kontra sín, Boston-pontok, küszöbök |
| CTS7 | Chesterton LS és mtsai. *INSTINCTS trial.* Lancet. 2018;392(10156):1423–1433. PMID 30343858. | 6 hetes eredmény, résztvevői szám, alapellátás |
| CTS8 | Burton C és mtsai. *24-month follow-up of a randomized trial.* Rheumatology (Oxford). 2023;62(2):546–554. PMID 35394019. | 12 és 24 hónapos eredmény, műtéti arányok, költség |
| CTS9 | AAOS OrthoInfo. *Carpal Tunnel Syndrome.* https://orthoinfo.aaos.org/en/diseases--conditions/carpal-tunnel-syndrome/ · hozzáférés 2026-08-21 | több tényező, nem és életkor, örökletes alkat, pajzsmirigy, rheumatoid arthritis, éjszakai ébredés, rázogatás, ügyetlenség, idegsiklatás, romlás kezeletlenül, műtét utáni idők |
| CTS10 | Ballestero-Pérez R és mtsai. *Effectiveness of Nerve Gliding Exercises on Carpal Tunnel Syndrome: A Systematic Review.* J Manipulative Physiol Ther. 2017;40(1):50–59. PMID 27842937. | idegsiklató gyakorlatok bizonyítéka, 13 vizsgálat, 6 gyenge minőségű |
| ZS1 | NHS. *Pins and needles.* https://www.nhs.uk/conditions/pins-and-needles/ · felülvizsgálva 2024-01-04 · hozzáférés 2026-08-21 | a zsibbadásnak más okai is lehetnek, ne diagnosztizáld magad |
| VZ1 | NHS. *Stroke, Symptoms.* https://www.nhs.uk/conditions/stroke/symptoms/ · felülvizsgálva 2024-09-12 · hozzáférés 2026-08-21 | stroke-jelek, 24 órán belül elmúlt tünet |
| VZ2 (= CSF1) | NHS. *Wrist pain.* https://www.nhs.uk/conditions/hand-pain/wrist-pain/ · felülvizsgálva 2025-11-05 · hozzáférés 2026-08-21 | megszűnt érzés, bizsergés, cukorbetegség, gyógyszerész szerepe |
| VZ3 | NHS. *Broken arm or wrist.* https://www.nhs.uk/conditions/broken-arm-or-wrist/ · felülvizsgálva 2023-05-26 · hozzáférés 2026-08-21 | sérülés utáni zsibbadás, kiálló csont, alakváltozás |

**Karbantartási jelzés a lektorálóknak.** A VZ3 (NHS, Broken arm or wrist)
felülvizsgálati határideje 2026-05-26-án lejárt. A tartalma valószínűleg érvényes,
de a megjelenés előtt újra kell nyitni (`docs/orvosi-forrasbazis.md` 12.3).

**Nem használt, tiltott források:** NICE CKS (HTTP 403), egeszsegvonal.gov.hu
(HTTP 503), kezsebeszet.hu (parkolt domain). Lásd a forrásbázis 11.1 és 12.2 pontját.

## Cikk-metaadatok (az integrátornak)

| Mező | Érték |
|---|---|
| `title` | Kéztőalagút-szindróma: mit tehetsz, mielőtt műtétre kerül a sor? |
| `slug` | `keztoalagut-szindroma` |
| `seoTitle` | Kéztőalagút-szindróma: tünetek és nem műtéti lehetőségek |
| `seoDescription` | Kéztőalagút-szindróma: tünetek, kockázati tényezők és nem műtéti lehetőségek. Mit mond a bizonyíték a sínről, az injekcióról, a gyakorlatokról? |
| `excerpt` | A kéztőalagút-szindróma tünetei jellemzően éjjel a legerősebbek. Összeszedtük, mit mond a bizonyíték az éjszakai sínről, a kortikoszteroid injekcióról és a gyakorlatokról, mielőtt műtétre kerülne a sor. Azt is leírjuk, amit a 2024-es szakmai irányelv a gyakorlatozásról mond. |
| Kategória | Kéz és csukló (`kez-es-csuklo`) |
| `publishedAt` | `2026-09-02T08:00:00.000Z` |
| Szerző | Kocsis Kata |
| `relatedPosts` | `miert-zsibbad-a-kezem` (C1), `de-quervain-szindroma` (C9), `csuklotores-utani-gyogytorna` (C6) |
| `status` / `_status` | `draft` / `draft` |
| `heroImage`, `ogImage` | üresen marad |

**Belső linkek a törzsben:** `/blog/miert-zsibbad-a-kezem`,
`/blog/csuklotores-utani-gyogytorna`, `/kurzusok/otthoni-kezrehab-program`,
`/kurzusok/sos-kezrelax-villamkurzus`. Egyik link sem áll magában bekezdésben.

---

# Kéztőalagút-szindróma: mit tehetsz, mielőtt műtétre kerül a sor?

Ez a szöveg lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

Éjjel felébredsz, mert zsibbad a kezed. Rázogatod, és egy idő után enyhül. Reggel meg kicsúszik a kezedből a bögre.

Ha ez ismerős, jó eséllyel te is beírtad már a keresőbe: kéztőalagút szindróma. A magyar találati listát pedig műtéti ajánlatok uralják.

Kocsis Kata és Kiss Kata vagyunk, gyógytornászok, és évek óta elsősorban a kéz rehabilitációjával foglalkozunk. Most arról írunk, mi van a műtét előtt.

Egy dolgot előre leszögezünk. Ez a cikk nem mondja meg, mi bajod van. Azt szedtük össze, mit tudni ma erről a panaszról.

## Mi a kéztőalagút-szindróma, és mitől alakul ki?

A kéztőalagút-szindróma azt jelenti, hogy a csuklón átfutó középideg nyomás alá kerül.

A csuklóban van egy szűk járat, ez a kéztőalagút. Vagy maga a járat szűkül be, vagy a benne futó inak körüli szövet duzzad meg.

Az esetek nagy részében több tényező áll együtt a háttérben. A nők és az idősebbek gyakrabban érintettek.

Egyetlen okot tehát ritkán lehet megnevezni. Ez a magyarázata annak is, hogy miért nincs egyetlen, mindenkinél működő kezelés.

## Hol fáj, és mik a tünetei?

A zsibbadás elsősorban a hüvelyk-, a mutató-, a középső és a gyűrűsujjat érinti, és a tünetek éjjel a legerősebbek.

A jellemző tünetek: fájdalom vagy sajgás az ujjakban, a kézben és a karban, zsibbadás, bizsergés, gyenge hüvelykujj vagy nehéz markolás.

A lefolyás is jellegzetes: a tünetek lassan indulnak, és jönnek-mennek.

Ehhez három jellegzetes részlet tartozik. A zsibbadás gyakran felébreszt éjjel, és sokaknál a kéz rázogatása enyhíti.

A harmadik részlet a kézügyesség. Jellemző az ügyetlenség, és az, hogy elejted a tárgyakat.

A zsibbadásnak sok más oka is lehet, a cukorbetegségtől a nyakban becsípődött idegig. Egy dolog viszont egyértelmű: ne diagnosztizáld magad. A lehetséges okokat végigvettük [a kézzsibbadásról szóló cikkünkben](/blog/miert-zsibbad-a-kezem), ha tájékozódni szeretnél.

## Ki kapja meg gyakrabban?

Hat kockázati tényező ismert: túlsúly, terhesség, ismétlődő csuklóhajlítás vagy erős markolás, bizonyos egyéb betegségek, családi halmozódás, korábbi csuklósérülés.

A hatodik ponthoz két betegség tartozik együtt: az ízületi gyulladás és a cukorbetegség.

Erős markolás például a rezgő szerszám használata.

Ehhez még négy tényező társul: örökletesen szűkebb kéztőalagút, szélsőséges csuklótartás, pajzsmirigy-egyensúlyzavar, rheumatoid arthritis.

Terhességnél van egy fontos külön szempont: a panasz néha magától rendeződik néhány hónap alatt.

Ez nem azt jelenti, hogy csak várni kell: ha a tünetek romlanak vagy nem múlnak, orvoshoz kell fordulni.

## Tényleg a sok gépelés okozza?

A szakmai munkacsoport véleménye szerint a sok billentyűzethasználat és a kéztőalagút-szindróma között nincs igazolt összefüggés.

Ez szakmai konszenzus: megbízható bizonyíték nincs rá, a megállapítás szakértői vélemény.

Ezért a köznyelvi „egérkéz” képet mi nem használjuk okként. Nem tudjuk igazolni.

Az ismétlődő csuklóhajlítás és az erős markolás ugyanakkor a kockázati tényezők közé tartozik. A két állítás nem mond ellent egymásnak: a csukló terhelése és kifejezetten a billentyűzethasználat két külön kérdés.

## Mit tehetsz, mielőtt műtétre kerül a sor?

Három nem műtéti lehetőségről van értékelhető bizonyíték: az éjszakai csuklósínről, a kortikoszteroid injekcióról és az idegsiklató gyakorlatokról.

A kéztőalagút-szindróma kezelése tehát nem csak műtétet jelent. Sokan azt keresik, mit lehet otthon, házilag kipróbálni.

Egyik sem gyógyulási ígéret. Mindegyiknél kiírjuk, mit mond a bizonyíték, és mennyire biztos.

### Éjszakai csuklósín: az első lépés

Első lépésként az éjszakai csuklósín jön szóba.

A valós időigény sem titok: akár hat hét is kell, mire javulni kezd.

Az eddigi vizsgálatok összesítéséből a következő rajzolódik ki.

Kezelés nélküli összehasonlításban a sín rövid távon nagyobb eséllyel hoz általános javulást. A rövid táv itt három hónapon belüli időszakot jelent (RR 3,86; 95% CI 2,29 és 6,51 között; NNT 2; alacsony bizonyosság).

Az NNT 2 azt jelenti: átlagosan két emberből egynél jelent ez többletjavulást ahhoz képest, ha semmit nem tenne.

A tüneti skálán viszont kicsi a különbség. A Boston-kérdőív tünetskáláján 0,37 pont a sín javára, és ez a klinikailag érdemi 1 pontos küszöb alatt marad.

A konfidencia-intervallum 0,82 ponttal jobb és 0,08 ponttal rosszabb között húzódik. A bizonyosság szintje alacsony, vagyis a vizsgálatok bizonytalanok a hatás nagyságában.

A funkcióban 0,24 pont a különbség, közepes bizonyossággal (95% CI 0,44 és 0,03 között). Ez is a klinikailag érdemi 0,7 pontos küszöb alatt van.

A szerzői következtetés első mondatával kell kezdeni, mert az a fejmondat: nincs elég bizonyíték annak eldöntésére, használ-e a sín a kéztőalagút-szindrómában szenvedőknek.

Ugyanez a bekezdés folytatódik így: a korlátozott bizonyíték nem zárja ki a tünetek és a kézfunkció kis javulását, de ez a javulás lehet, hogy klinikailag nem érdemi.

És csak ezután jön a mondat, amit sokat idéznek. A sín viszonylag olcsó beavatkozás, és tartós ártalma nem valószínű. Ezért már kis hatás is indokolhatja a használatát, főleg akkor, ha valaki nem szeretne műtétet vagy injekciót.

A kettő együtt adja ki a valós képet. Nem tudjuk, hogy használ-e, de olcsó és ártalmatlan, tehát megpróbálható.

A hat hét helyett hat hónapos viselés jobb lehet. A bizonyosság itt is alacsony.

Magyarul ezt a sínt csuklórögzítőnek is hívják. Konkrét terméket nem ajánlunk. A sín és a fájdalomcsillapító kiválasztásában a gyógyszerész is tud segíteni.

### Kortikoszteroid injekció: időt vesz, nem gyógyít

Az injekció valószínűleg javítja a tüneteket három hónapon belül, de nem gyógyítja meg a panaszt.

Placebóhoz képest a hatás közepes bizonyosságú.

A hatás hat hónapig kimutatható (SMD -0,58). A műtéti igény egy év alatt valószínűleg valamelyest csökken (RR 0,84; 95% CI 0,72 és 0,98 között). Ez az utóbbi szám egyetlen, 111 fős vizsgálatból származik, közepes bizonyossággal.

Erős szakmai ajánlás rögzíti viszont: az injekció nem hoz hosszú távú javulást.

A kettő nem mond ellent egymásnak. Az injekció időt vesz, nem gyógyít.

A beteg nyelvén: a szteroid injekció nem mindig gyógyít, és a panasz néhány hónap múlva visszatérhet.

### Sín vagy injekció? Van rá egy 24 hónapig követett vizsgálat

Rövid távon az injekció bizonyult jobbnak, két év múlva viszont már nem volt köztük különbség.

Az INSTINCTS-vizsgálat 234 résztvevőt követett az alapellátásban, enyhe és közepes kéztőalagút-szindrómával.

Hat hétnél az injekció mérhetően jobb volt. A Boston-összpontszám 2,02 lett az injekciós és 2,29 a sínes csoportban (korrigált átlagkülönbség -0,32; 95% CI -0,48 és -0,16 között; p=0,0001).

A 24 hónapos utánkövetés eltüntette a különbséget. Sem 12, sem 24 hónapnál nem volt statisztikailag jelentős eltérés a Boston-pontszámban és a fájdalomban.

24 hónapnál az injekciós csoportból kerültek többen műtétre: 22%, míg a síncsoportból 16%.

A költségekről óvatosan fogalmazunk, mert a vizsgálat is óvatosan fogalmaz. A mért különbség 68,59 font volt az injekció kárára, de a megbízhatósági tartomány a nullát is tartalmazza (95% CI -120,84 és 291,24 között). A szerzők ebből azt a következtetést vonják le, hogy az injekcióval kezdeni hosszú távon valószínűleg nem költséghatékonyabb a sínnél.

### Idegsiklató gyakorlatok: kiegészítőnek jó, önmagában kevés

Az idegsiklató gyakorlatok önmagukban korlátozott bizonyítékkal bírnak.

Ezek a nem műtéti lehetőségek közé tartoznak: egyes betegeknek segíthetnek azok a gyakorlatok, amelyek a középideg szabadabb mozgását segítik.

Egy 13 klinikai vizsgálatot áttekintő munka szerint a fájdalom csillapítására a szokásos konzervatív ellátás tűnik a legjobb választásnak.

Ugyanez a munka az idegsiklatást inkább kiegészítőnek látja, amely gyorsíthatja a funkció visszatérését. A 13 vizsgálatból 6 gyenge minőségű volt.

### Amit őszintén el kell mondanunk a gyakorlatokról

A konzervatív módszerek között nincs jelentős különbség a betegek által jelentett eredményekben.

Vannak olyan módszerek, amelyek a hosszú távú, beteg által jelentett eredményt nem javítják. A listán ott van a gyakorlatozás, a masszázs és a manuálterápia is.

A teljes lista ennél hosszabb. Ezek sem hoznak hosszú távú javulást:

- szájon át adott kortikoszteroid,
- hialuronsav-injekció,
- hidrodisszekció,
- kineziotape,
- lézerterápia,
- peloidterápia,
- perineurális injekciós terápia,
- helyi külsőleges készítmény,
- lökéshullám,
- ózoninjekció,
- pulzáló rádiófrekvencia.

A terápiás ultrahang sem hoz hosszú távú javulást.

Egy fontos részletet is kiírunk, mert enélkül féloldalas a kép. A bizonyíték itt erős, az ajánlás mégis gyengébb lábakon áll: a vizsgált kezelések, a módszerek minősége és az utánkövetési idők nagyon eltérőek voltak.

Ezt nem hallgatjuk el. A mi nevünk van a szövegen, és a szakmai hitelünk többet ér, mint egy szebb mondat.

Óvatosan kell fogalmazni: kevés bizonyíték szól amellett, hogy a kézgyakorlatok enyhítik a kéztőalagút-szindróma tüneteit.

Ezért nem írjuk le, hogy a torna meggyógyítja a kéztőalagút-szindrómát. Nem gyógyítja meg.

A fájdalomcsillapítóról hasonló a helyzet. Kevés bizonyíték szól amellett, hogy kezelnék a kéztőalagút-szindróma okát, ezért fontos, hogy ne hagyatkozz rájuk.

Mire jó akkor a rendezett, vezetett gyakorlás? Arra, hogy legyen napi rendszered addig, amíg a kezelésről születik döntés. Ennél többet nem állítunk.

## Meddig tart, míg javul?

Egyetlen válasz nincs, de három konkrét időtáv körvonalazható.

- Éjszakai sín: akár hat hét, mire javulni kezd.
- Magától: néha néhány hónap alatt rendeződik, különösen terhesség esetén.
- Kortikoszteroid injekció: a hatás három hónapig biztosan, hat hónapig kimutathatóan tart.

Ezek nem a mi ígéreteink, hanem a szokásos időtávok, és minden kéz más.

Amiben nem vagyunk biztosak, arra nem adunk időtartamot. Inkább hiányzik, mint hogy téves legyen.

## Mikor NE végezd a gyakorlatokat?

Azt javasoljuk, hogy gyakorlatba csak akkor kezdj bele, ha a kezedet orvos már megnézte.

A gyakorlatoknak nem kell fájniuk. Éles fájdalom esetén hagyd abba, és kérj szakmai segítséget.

Műtét után mindig a kezelőorvosod vagy a gyógytornászod jóváhagyásával kezdj bele.

Hagyd abba a gyakorlást, és menj orvoshoz, ha a tünetek romlanak vagy nem múlnak.

Ne gyakorolj, ha a kezed egy részén vagy egészén megszűnt az érzés. Ez aznapi orvosi ellátást igényel.

Ha a hüvelykujjad gyengül, vagy egyre nehezebb megmarkolnod valamit, előbb orvoshoz menj. A legtöbb betegnél a kéztőalagút-szindróma idővel romlik, és ha túl sokáig marad kezeletlenül, tartós kézfunkció-károsodáshoz vezethet.

Egy mondatban: a torna nem helyettesíti az orvosi kivizsgálást.

## Mikor fordulj azonnal orvoshoz?

Van néhány jel, aminél nem gyakorlat kell, hanem azonnali orvosi ellátás.

Hívj 112-t, ha az arc egyik fele lelóg, az egyik kar erőtlen vagy zsibbadt, és a beszéd akadozik. Ezek a stroke jelei.

Ezt külön ki kell emelni: ha a tünetek 24 órán belül elmúltak, akkor is azonnali segítség kell.

Sérülés után is azonnali ellátás kell, ha a kar vagy a csukló zsibbad és bizsereg. Ugyanez érvényes, ha a csont kiáll a bőrből, vagy ha a kar alakja megváltozott.

Aznap menj orvoshoz, ha a kéz egy részén vagy egészén megszűnt az érzés.

Napokon belül menj orvoshoz, ha bármilyen bizsergés vagy érzéskiesés van a kezeden. Ugyanez érvényes akkor is, ha a kéztőalagút tünetei romlanak vagy nem múlnak.

Cukorbetegség mellett a kézpanasz komolyabb lehet. Ilyenkor hamarabb kérj orvosi véleményt.

## Mikor merül fel a műtét?

A műtétről mindig orvos dönt, és akkor kerül szóba, ha a tünetek romlanak vagy nem múlnak.

A legtöbb betegnél a kéztőalagút-szindróma idővel romlik. Ha túl sokáig marad kezeletlenül, tartós kézfunkció-károsodáshoz vezethet.

Ezért a cikkünk nem beszél le a műtétről. Azt mutatjuk meg, mi van előtte.

A műtétről a beteg nyelvén: általában meggyógyítja a kéztőalagút-szindrómát. Ezt is kiírjuk, mert a mi keretezésünk nem az, hogy a műtét rossz.

Az összesített vizsgálatok a műtétet és a nem műtéti kezelést is összehasonlították.

A szerzők következtetése ezzel a mondattal kezdődik: jelenleg nem tisztázott, mennyire hatékony a műtét a kéztőalagút-szindrómában szenvedőknél.

Az összesítés szerint a műtét hosszú távon valószínűleg gyakrabban hoz klinikai javulást, mint a sín (RR 2,10; 95% CI 1,04 és 4,24 között; közepes bizonyosság).

Klinikailag érdemi többletet a tünetekben és a kézfunkcióban viszont valószínűleg nem ad. A Boston tünetskálán 0,26 pont a műtét javára, miközben a klinikailag érdemi küszöb 1 pont. A funkcionális skálán 0,36 pont a különbség, a küszöb pedig 0,7.

A mellékhatásokról is van adat, és ez a műtéti döntéshez tartozik. A műtéti csoportban 98-ból 60 résztvevő (61%), a sínes csoportban 112-ből 46 (41%) számolt be mellékhatásról. A bizonyosság szintje itt nagyon alacsony, tehát ezt a különbséget nem lehet ténynek venni.

A diagnózisról is érdemes tudni egy fontos dolgot. Erős szakmai ajánlás mondja ki, hogy a CTS-6 klinikai pontrendszer önmagában használható a diagnózishoz, rutinszerű ultrahang vagy ENG és EMG helyett.

Közepes erősségű ajánlás mondja, hogy az MRI és a felső végtagi neurodinamikai tesztelés ne legyen diagnosztikus eszköz.

A CTS-6 az orvos eszköze. Öndiagnózisra nem való, és mi sem használjuk annak.

## Mi a helyzet a műtét után?

A megszokott tevékenységekhez a műtét után körülbelül egy hónap kell.

A szorító- és a csippentőerő 2–3 hónap alatt tér vissza. Súlyos idegkárosodás után ez 6–12 hónap is lehet.

A teljes felépülés akár egy évig is eltarthat.

Azt, hogy mikor mit szabad, a műtétet végző orvos és a gyógytornászod mondja meg. A gyakorlást ilyenkor is csak az ő jóváhagyásukkal kezdd el.

A gipsz- és műtét utáni fokozatos visszaterhelés elveiről külön írtunk, [a csuklótörés utáni időszakról szóló cikkünkben](/blog/csuklotores-utani-gyogytorna).

## Mit ad ehhez egy vezetett otthoni program?

Rendszert és sorrendet ad, nem gyógyulást.

A gyakorlat önmagában kevés. A sorrend és az adagolás az, ami nehéz otthon, egyedül.

A program 5 perces miniblokkokból áll, hogy rövid alkalmakra is elférjen a napodban.

Az Otthoni KézRehab Programot csukló-, ujj-, alkar- és könyökpanaszokra állítottuk össze. A részleteket [az Otthoni KézRehab Program oldalán](/kurzusok/otthoni-kezrehab-program) találod meg.

**Vásárlás előtt két dolgot tudnod kell.** Az egyik a saját ellenjavallatunk, és pont ennek a cikknek az olvasóira tartozik. A program leírásában szerepel, hogy nem javasoljuk, ha:

- már jelentkezett érzéskiesés,
- régebb óta tart jelentős gyengülés a szorítóerődben,
- izomtömeg-vesztés látszik a tenyereden,
- műtétre vársz.

A cikk elején leírt tünetek közül kettő pont ide tartozik. Ha a hüvelykujjad gyengül, vagy elejted a tárgyakat, előbb a kivizsgálás következik, nem a gyakorlás.

A másik a bizonyíték: a gyakorlatozás a hosszú távú, beteg által jelentett eredményt nem javítja.

Ezért mi nem gyógyulást ígérünk. Rövid, vezetett alkalmakat kínálunk arra az időszakra, amíg a kezelésről dönt az orvosod.

A program nem helyettesíti a szakorvosi vizsgálatot, és a műtéti döntést sem váltja ki.

Ha csak egy rövid kóstolót szeretnél, ingyenesen elérhető [az SOS Kézrelax villámkurzus](/kurzusok/sos-kezrelax-villamkurzus) is, amely a kézre, a csuklóra és a könyökre fókuszál. Ebben megmutatjuk, mit vizsgálunk mi az egyes kórképeknél. Ezek tájékozódásra valók: a diagnózist orvosi vizsgálat adja meg, nem egy otthon elvégzett teszt.

## Kik írták ezt a cikket?

Kocsis Kata és Kiss Kata vagyunk. Gyógytornászok, és évek óta elsősorban a kéz rehabilitációjával foglalkozunk.

Kocsis Kata gyógytornász, sportrehabilitációs tréner, gyógy- és sportmasszőr. Kiss Kata gyógytornász, manuálterapeuta, sportrehabilitációs tréner.

Mindketten elvégeztük Loren Szmiga CHT kéztőalagút- és pattanóujj-kurzusát 2024-ben.

Oktatunk is. A ProBody Stúdió sportrehabilitációs tréner képzésén a „Bevezetés a kéz, a csukló- és könyökízület rehabilitációs lehetőségeibe” tantermi kurzus instruktorai vagyunk (2024, 2025, 2026, Budapest).

Ez a szakmai háttér a szerző hitelességét igazolja.

## Fontos tudnivaló

A cikk általános tájékoztatás, nem helyettesíti a szakorvosi vizsgálatot és a személyre szabott kezelést. Ha bizonytalan vagy, vagy a tünetek romlanak, fordulj orvoshoz.
