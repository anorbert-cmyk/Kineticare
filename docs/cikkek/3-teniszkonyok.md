# LEKTORÁLANDÓ VÁZLAT. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

> Ez a fájl a Tudástár 3. cikkének szövegváltozata (`docs/tudastar-tartalmi-terv.md`
> 4. szakasz, C3). A rekord `status` és `_status` mezője egyaránt `draft` marad,
> amíg Kocsis Kata és Kiss Kata a klinikai tartalmat jóvá nem hagyja.
> A cikk törzse a „Teniszkönyök: mit tehetsz otthon, és mit kerülj?” H1-től
> a „Fontos tudnivaló” szakaszig tart. Ami az alatt van, az a cikkíró öntesztje
> és a vezetőnek szóló jelzés, nem a cikk része.

## Felhasznált források (áttekintés)

Klinikai állítás kizárólag ezekből származhat, a `docs/orvosi-forrasbazis.md`
azonosítóival. A cikkben szereplő minden szám ezekből van, szó szerint.

| Azonosító | Forrás | Hol használtuk |
|---|---|---|
| TK1 | NHS. *Tennis elbow.* https://www.nhs.uk/conditions/tennis-elbow/ · felülvizsgálva 2024-05-31 · következő felülvizsgálat 2027-05-31 · hozzáférés 2026-08-21 | mi ez, tünetek, a fájdalom helye és mértéke, okok, életkor, otthoni lista, hideg- és melegborogatás ideje, pánt és rögzítő, ibuprofén gél figyelmeztetése, háziorvos 2 hétnél, gyógytorna 6 hétnél, gyógytornás módszerek, műtét 6–12 hónapnál, „egy évnél tovább is eltarthat” |
| TK2 | AAOS OrthoInfo. *Tennis Elbow (Lateral Epicondylitis).* https://www.orthoinfo.org/diseases--conditions/tennis-elbow-lateral-epicondylitis/ · hozzáférés 2026-08-21 | elhasználódás és mikroszakadás, ECRB-ín és a lateralis epicondylus, 30–50 év, foglalkozások, égő érzés, gyenge szorítóerő, éjszakai fájdalom, rontó mozdulatok, 80–95% és 80–90% |
| TK3 | Smidt N és mtsai. *Corticosteroid injections, physiotherapy, or a wait-and-see policy for lateral epicondylitis: a randomised controlled trial.* Lancet. 2002;359(9307):657–662. PMID 11879861. | 185 beteg, háziorvosi ellátás, legalább 6 hete tartó panasz, 6 hetes és 52 hetes sikerarányok, magas kiújulás az injekciós csoportban |
| TK4 | Bisset L és mtsai. *Mobilisation with movement and exercise, corticosteroid injection, or wait and see for tennis elbow: randomised trial.* BMJ. 2006;333(7575):939. PMID 17012266. | 198 résztvevő, 18–65 év, 65-ből 47 visszaesés, 52 hétnél nincs különbség, kevesebb kiegészítő kezelés, a szerzők óvatosságra intő zárómondata |
| TK5 | Karanasios S és mtsai. *Exercise interventions in lateral elbow tendinopathy have better outcomes than passive interventions, but the effects are small.* Br J Sports Med. 2021;55(9):477–485. PMID 33148599. | 30 vizsgálat, 2123 résztvevő, kicsi hatás, alacsony és nagyon alacsony bizonyosság, fájdalommentes szorítóerő 12,15 / 22,45 / 18, a gyakorlatprogramok szórása |
| TK6 | Yoon SY és mtsai. *The Beneficial Effects of Eccentric Exercise in the Management of Lateral Elbow Tendinopathy: A Systematic Review and Meta-Analysis.* J Clin Med. 2021;10(17):3968. PMID 34501416. | 6 vizsgálat, 429 résztvevő, VAS és izomerő SMD-értékek, összevetés a koncentrikus gyakorlattal, a szerzők korlátozásai |
| VZ1 | NHS. *Stroke, Symptoms.* https://www.nhs.uk/conditions/stroke/symptoms/ · felülvizsgálva 2024-09-12 · hozzáférés 2026-08-21 | stroke-jelek, a 24 órán belül elmúlt tünet is sürgős |
| VZ2 | NHS. *Wrist pain.* https://www.nhs.uk/conditions/hand-pain/wrist-pain/ · felülvizsgálva 2025-11-05 · hozzáférés 2026-08-21 | ne diagnosztizáld magad, megszűnt érzés, erős fájdalom, alak- és színváltozás, forró piros duzzanat, bizsergés, láz, cukorbetegség, gyógyszerész tanácsa |
| VZ3 | NHS. *Broken arm or wrist.* https://www.nhs.uk/conditions/broken-arm-or-wrist/ · felülvizsgálva 2023-05-26 · hozzáférés 2026-08-21 | sérülés utáni zsibbadás, kiálló csont, alakváltozás |

**Amit a forrásokon első kézben ellenőriztünk 2026-08-21-én.** A TK1 és a TK2
oldalát teljes szövegében megnyitottuk, a TK3, TK4, TK5 és TK6 absztraktját a
PubMed hivatalos adatszolgáltatásán keresztül kértük le. Minden szám, ami a
cikkben szerepel, ezekben az eredeti szövegekben is így áll.

**Karbantartási jelzés a lektorálóknak.** A VZ3 (NHS, Broken arm or wrist)
felülvizsgálati határideje 2026-05-26-án lejárt. A tartalma valószínűleg
érvényes, de a megjelenés előtt újra kell nyitni
(`docs/orvosi-forrasbazis.md` 12.3).

**Címváltozás a TK2-nél.** Az `orthoinfo.aaos.org` cím 2026-08-21-én HTTP 301
átirányítást ad a `www.orthoinfo.org` címre. A forrásjegyzékben az új, élő cím
szerepel.

## CMS-mezők az integrátornak

Ezek a `docs/tudastar-tartalmi-terv.md` 3., 4. és 6. szakaszában rögzített
értékek. A cikkíró nem talált ki belőlük semmit.

| Mező | Érték |
|---|---|
| `title` (H1) | Teniszkönyök: mit tehetsz otthon, és mit kerülj? |
| `slug` | `teniszkonyok` |
| `seoTitle` | Teniszkönyök kezelése otthon: gyakorlatok, időtáv, tévhitek |
| `seoDescription` | Teniszkönyök: mit tehetsz otthon, mennyi idő alatt múlik el, és mikor kell orvos. Gyógytornászok forrásolt összefoglalója. |
| `excerpt` | A teniszkönyök a könyök külső oldala körüli fájdalommal járó állapot, és nem csak teniszezőknél fordul elő. Összeszedtük, mit ajánl otthonra az NHS, mit mutatnak a vizsgálatok a gyógytornáról és a szteroidinjekcióról, és mikor kell orvoshoz fordulnod. |
| Kategória | Váll és könyök (`vall-es-konyok`) |
| `author` | Kocsis Kata (gyógytornász, sportrehabilitációs tréner, gyógy- és sportmasszőr) |
| `publishedAt` | `2026-09-03T08:00:00.000Z` |
| `status` / `_status` | `draft` / `draft` |
| `relatedPosts` | üresen marad, a kategória-fallback adja a váll- és könyök-cikkeket |
| `heroImage`, `ogImage` | üresen marad |

**Belső linkek a törzsben:** `/kurzusok/sos-kezrelax-villamkurzus`,
`/kurzusok/otthoni-kezrehab-program`. Egyik link sem áll magában bekezdésben.

---
---

# Teniszkönyök: mit tehetsz otthon, és mit kerülj?

Ez a szöveg lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása előtt
nem publikálható.

Megfogod a bögrét, és belenyilall a könyöködbe. Lenyomod a kilincset, ugyanaz.
Este már a bevásárlószatyor is sok.

Ha ez ismerős, jó eséllyel te is rákerestél már: teniszkönyök. És jó eséllyel
soha életedben nem teniszeztél.

Kocsis Kata és Kiss Kata vagyunk, gyógytornászok. Évek óta elsősorban a kéz
rehabilitációjával foglalkozunk, és a könyök ugyanennek a láncnak a része.

Egy dolgot előre leszögezünk. Ez a cikk nem mondja meg, mi bajod van. Azt
szedtük össze, mit mondanak ma a nemzetközi ajánlások és az összesített
vizsgálatok.

## Mi a teniszkönyök, és mitől alakul ki?

A teniszkönyök a könyök külső oldalán tapadó ínszövet túlterheléses
elváltozása.

Az ín elhasználódásáról van szó, egyes
esetekben mikroszakadásairól.

Az érintett ín az alkar egyik izmához tartozik. A neve extensor carpi radialis
brevis, röviden ECRB, és a felkarcsont külső bütykén, a lateralis
epicondyluson tapad.

A szakmai leírások itt nem egységesek. Az egyik megfogalmazás gyulladást említ,
a másik elhasználódást és mikroszakadást.

Ezt a különbséget kiírjuk, mert a „gyulladás” szó könnyen félrevisz abban,
hogy mit várj a kezeléstől.

Bárkinél előfordulhat, de 35 és 54 éves kor között a leggyakoribb,
pedig a legtöbb érintett 30 és 50 év közötti.

Nem csak sportolóknál jelentkezik. A festők, a
vízvezeték-szerelők és az asztalosok különösen hajlamosak rá.

Ehhez hozzátartozik, hogy az autóipari dolgozók, a
szakácsok és a hentesek is gyakrabban kapják meg, mint az átlag.

Okként azok a tevékenységek jönnek szóba, amelyeknél megfogsz valamit, és
közben ismételten csavarod a csuklód és az alkarod.

Három csoport jellemző:

- **számítógépes munka**, például a gépelés és az egérhasználat;
- **kézműves feladat**, például a varrás és a csavarhúzózás;
- **szabadidős tevékenység**, például a tenisz és a hangszeres játék.

## Honnan tudod, hogy a könyökfájdalmad teniszkönyök?

A teniszkönyök fő tünete a fájdalom a könyök külső oldalán.

A fájdalom erőssége tág határok között mozog. Lehet enyhe kellemetlenség a kar
mozgatásakor, de lehet állandó fájdalom is, ami az alvást is zavarja.

Jellemzően akkor rosszabb, amikor emeled vagy hajlítod a karod,
amikor megfogsz valamit, és amikor mozgatod a csuklód.

További tünetek is előfordulhatnak. Ilyen a nyomásérzékenység vagy a duzzanat a
könyökben, a fájdalom az alkarban, és az, ha nehezen tudod teljesen kinyújtani
a karod.

A könyök külső részén jelentkező fájdalom vagy égő érzés
írja le. Emellett gyenge szorítóerőt említ, és azt, hogy a fájdalom éjszaka is
jelentkezhet.

Ugyanez a leírás azt mondja, hogy a tünetek alkar-tevékenységre erősödnek.
Példaként az ütő fogását, a csavarkulcs elfordítását és a kézfogást hozza.

A teniszkönyök tünetei tehát a könyök külső oldala és az alkar körül
jelentkeznek.

Ez a lista viszont tünetlista, nem diagnózis. A csuklófájdalomról szóló
oldalán külön kiírja: ne próbáld magad megállapítani a fájdalom okát.

A könyökfájdalom mögött más ok is állhat, különösen akkor, ha a fájdalom máshol
jelentkezik. Ezt szakember tudja megítélni.

## Mennyi idő alatt gyógyul a teniszkönyök?

Röviden: általában pihenéssel elmúlik, de néha egy évnél
tovább is eltarthat.

Ennél pontosabb számokat két randomizált vizsgálat ad. Egyik szám sem a mi
ígéretünk, hanem mért eredmény.

A Smidt és munkatársai által vezetett vizsgálatba 185 beteget vontak be,
háziorvosi ellátásból. Mindegyiküknél legalább 6 hete tartott a panasz.

Hat hétnél az injekciós csoport járt a legjobban. Ott 92% számolt be sikerről,
a gyógytornás csoportban 47%, a „várunk és figyelünk” csoportban 32%.

Egy évnél megfordult a sorrend. 52 hétnél a gyógytornás csoport 91%-a, a
várakozó csoport 83%-a és az injekciós csoport 69%-a számolt be sikeres
kimenetelről.

Ezt a két számot nem szabad egymás mellé tenni magyarázat nélkül. A gyógytorna
és a várakozás közötti különbség ebben a vizsgálatban nem volt statisztikailag
jelentős.

A szerzők zárógondolata is ezt tükrözi: a gyógytorna és a várakozás közötti
választás a rendelkezésre álló erőforrásoktól is függhet, mert a gyógytorna
viszonylagos többlete kicsi.

A vizsgálat azt is leírja, hogy az injekciós csoportban magas volt a kiújulás
aránya.

A másik vizsgálatot Bisset és munkatársai végezték, 198 résztvevővel. Ők 18 és
65 év közöttiek voltak, és náluk is legalább hat hete tartott a panasz.

Itt 52 hétnél már nem volt különbség a gyógytorna és a várakozás között.
Mindkét csoportban a résztvevők többsége sikeres kimenetelről számolt be.

Egy különbség viszont maradt. A gyógytornás csoport kért a legkevesebb
kiegészítő kezelést, például gyulladáscsökkentő gyógyszert.

Egy összefoglaló szám: a betegek körülbelül
80–95%-a sikerrel jár a nem műtéti kezeléssel.

Ezek a számok vizsgálati eredmények. Nem azt mondják meg, hogy nálad mi fog
történni, és mi sem ígérünk gyógyulást.

## Mit érdemes tudni a szteroidinjekcióról?

A szteroidinjekció rövid távon a legjobb eredményt adja, hosszú távon viszont
rosszabbat, mint a gyógytorna.

Smidt és munkatársai vizsgálatában hat hétnél a kortikoszteroid injekció minden
mért szempontból jobb volt a többinél. Egy évnél viszont a gyógytorna felé
billent a mérleg, statisztikailag is.

Bisset és munkatársai ugyanezt találták, és számot is adtak a visszaesésre. A
sikeres injekciós esetek közül 65-ből 47 később visszaesett.

A szerzők zárómondata óvatosságot kér. Szerintük a kortikoszteroid injekció
rövid távú előnye hat hét után megfordul, ezért ezt a kezelést óvatosan kell
alkalmazni.

Egy nagy összesítés a gyakorlatozást hasonlította az injekcióhoz. A
fájdalommentes szorítóerőben klinikailag érdemi különbséget talált a torna
javára.

A számok átlagos különbségek. Rövid távon 12,15 (95% CI 1,69 és 22,6 között),
középtávon 22,45 (95% CI 3,63 és 41,3 között), hosszú távon 18 (95% CI 11,17 és
24,84 között).

A megbízhatósági tartományok itt szélesek, és a bizonyosság szintje alacsony.
A mértékegység sem egyértelmű, ezért mi sem írunk oda semmit.

Egy külön fenntartás is tartozik ehhez: a
szteroidinjekciót teniszkönyöknél nagyon takarékosan kell használni, mert a
túlzott használat idővel gyengítheti a felkarcsont külső bütykét, ahol az ECRB
ina tapad.

Ebből nem következik, hogy az injekció rossz döntés. Azt jelenti, hogy érdemes
megbeszélned a kezelőorvosoddal, mit vársz tőle, és mikor.

## Hogyan kezelheted a teniszkönyököt otthon?

A teniszkönyök kezelése otthon azzal kezdődik, hogy kerülöd vagy csökkented
azokat a tevékenységeket, amelyek rontják a tüneteidet. Ez az otthoni
listájának első pontja.

Az otthoni teendők öt pontból állnak:

- **Terhelés.** Kerüld vagy csökkentsd azokat a tevékenységeket, amelyek
 rontják a tüneteidet.
- **Fájdalomcsillapítás.** Paracetamol jöhet szóba, vagy gyulladáscsökkentő
 gél, amit a fájó területre kensz.
- **Borogatás.** Meleg vagy hideg borogatás, törölközőbe csavarva, legfeljebb
 20 percig, 2–3 óránként. Egy zacskó fagyasztott zöldborsó is megteszi.
- **Gyakorlatok.** Egyszerű gyakorlatok, például a kar hajlítása és nyújtása.
- **Rögzítés.** Alkarpánt, csuklórögzítő vagy könyökrögzítő, ami patikában
 kapható.

Egy fontos figyelmeztetés: ha ibuprofén gélt használsz, ne
dohányozz, és ne menj nyílt láng közelébe. A gél gyúlékony, és súlyos égés
kockázatával jár.

Gyógyszerről mi nem döntünk helyetted. A csuklófájdalomról szóló szakmai ajánlás
szerint a gyógyszerésztől is kérhetsz tanácsot arról, melyik fájdalomcsillapító
és melyik rögzítő való neked.

A gyakorlatokról a legnagyobb összesítés 30 randomizált vizsgálatot és 2123
résztvevőt dolgozott fel. Eszerint a gyakorlatozás jobb eredményt ad a passzív
kezeléseknél, de a hatás kicsi.

A szerzők a bizonyosság szintjét alacsonynak, illetve nagyon alacsonynak
jelölték. Ez azt jelenti, hogy a hatás iránya bizonytalan, és a további kutatás
módosíthatja a képet.

Ugyanez az összesítés a gyakorlatprogramok leírásában nagy szórást talált. Az
eszköz, a terhelés, az időtartam és a gyakoriság vizsgálatonként eltért.

Az excentrikus gyakorlatokról külön összesítés készült, hat vizsgálatból, 429
résztvevővel.

Kiegészítő kezelés mellé adva javította a fájdalmat és az izomerőt. A
fájdalomskálán az eltérés SMD -0,63 volt (95% CI -0,90 és -0,36 között), az
izomerőben SMD 1,05 (95% CI 0,78 és 1,33 között).

A koncentrikus vagy izotóniás gyakorlatokhoz képest a fájdalomban volt előnye
(SMD -0,30; 95% CI -0,58 és -0,02 között). Az izomerőben és a funkcióban a két
csoport között nem találtak különbséget.

A szerzők maguk jelzik a korlátokat. Kevés vizsgálat került be, és a
gyakorlatok paraméterei nagyon eltérőek voltak.

Ha egy rövid, vezetett kóstolót keresel, ingyenesen elérhető
[az SOS Kézrelax villámkurzus](/kurzusok/sos-kezrelax-villamkurzus), amelyben a
könyök tehermentesítése is szerepel. Ebben megmutatjuk, mit vizsgálunk mi az
egyes kórképeknél. Ezek tájékozódásra valók: a diagnózist orvosi vizsgálat adja
meg, nem egy otthon elvégzett teszt.

## Mikor menj gyógytornászhoz vagy orvoshoz?

A gyógytorna akkor segíthet, ha az otthoni kezelés hat hét után
sem hozott javulást.

Háziorvoshoz ennél hamarabb érdemes menni. Akkor keresd fel, ha
legalább két hét pihenés és otthoni kezelés után is fáj a könyököd.

A háziorvos gyulladáscsökkentő tablettát adhat.

A gyógytornán masszázs jöhet szóba. Emellett a csuklóra és az
alkarra irányuló nyújtó és erősítő gyakorlatok, valamint ultrahangkezelés.

A műtét akkor merül fel, ha 6–12 hónap után is megvan a
teniszkönyök.

Két szám tartozik ehhez. A betegek körülbelül 80–95%-a sikerrel
jár a nem műtéti kezeléssel, a teniszkönyök-műtét pedig a betegek 80–90%-ánál
sikeres.

A második számhoz rögtön tartozik egy fenntartás is: a
műtét után nem ritka az erővesztés.

A műtétről mindig orvos dönt. Mi nem beszélünk le róla, és azt sem ígérjük,
hogy elkerülhető.

## Mikor fordulj azonnal orvoshoz?

Van néhány jel, amelynél nem gyakorlat kell, hanem azonnali ellátás.

Sérülés után négy jelnél kell mentőt hívni:

- a kar vagy a csukló zsibbad és bizsereg,
- erősen vérző seb van rajta,
- a csont kiáll a bőrből,
- a kar alakja megváltozott.

Hívj 112-t, ha az arc egyik fele lelóg, az egyik kar erőtlen vagy zsibbadt, és
a beszéd akadozik. Ezek a stroke jelei.

Ezt külön ki kell emelni: ha a stroke tünetei 24 órán belül elmúltak, akkor is
azonnali segítség kell.

Aznap kérj orvosi ellátást, ha a kéz egy részén vagy egészén megszűnt az érzés.

Ugyanígy sürgős, ha a fájdalom nagyon erős, ha ájulásérzés vagy hányinger
kíséri, vagy ha a végtag alakja, illetve színe megváltozott. Sürgős a csuklón
lévő nagyon fájdalmas, forró vagy piros csomó is.

Napokon belül menj orvoshoz, ha bármilyen bizsergés vagy érzéskiesés van a
kezeden. Ugyanez érvényes akkor is, ha láz társul a panaszhoz.

Cukorbetegség mellett a kézpanasz komolyabb lehet. Ilyenkor hamarabb kérj
orvosi véleményt.

## Mit kerülj, amíg fáj?

Átmenetileg azokat a mozdulatokat kerüld, amelyek rontják a tüneteidet. A szakmai ajánlás
otthoni tanácsai is ezzel kezdődnek.

A tünetek jellemzően akkor rosszabbak, amikor emeled vagy
hajlítod a karod, amikor megfogsz valamit, és amikor mozgatod a csuklód.

Vannak olyan alkar-tevékenységek, amelyekre a fájdalom
erősödik. Ilyen az ütő fogása, a csavarkulcs elfordítása és a kézfogás.

Nem kell mindent abbahagynod. A csökkentés is opció a teljes kerülés
mellett, tehát a kettő között te választhatsz.

Ha ibuprofén gélt kensz a könyöködre, a dohányzást és a nyílt lángot kerüld. A
gél gyúlékony, és súlyos égés kockázatával jár.

## Mikor NE végezd a gyakorlatokat?

Ne gyakorolj, ha az alábbi jelek bármelyike fennáll. Ilyenkor a vizsgálat az
első.

- **Vörös zászlót látsz.** Friss sérülés utáni zsibbadásnál, alakváltozásnál
 vagy megszűnt érzésnél nem gyakorlat kell, hanem orvos vagy mentő.
- **Láz vagy fertőzésre utaló jel van.** Forró, piros, nagyon fájdalmas
 csomónál orvosi vizsgálat kell.
- **Éles fájdalom kísér.** A gyakorlatok nem kell, hogy fájjanak. Éles fájdalom
 esetén hagyd abba, és kérj szakmai segítséget. Ez a saját kurzusaink
 ellenjavallati szabálya is.
- **Műtéted volt.** Műtét után mindig a kezelőorvosod vagy gyógytornászod
 jóváhagyásával kezdj bele.
- **Két hét után sem javult.** Ilyenkor háziorvoshoz kell
 fordulni, nem egy újabb otthoni körhöz.

Ezt itt is kimondjuk. A gyakorlatok hatásáról szóló legnagyobb összesítés
szerint a hatás kicsi, és a bizonyosság alacsony.

Ezért nem ígérünk gyógyulást. És azt sem javasoljuk, hogy a gyakorlás miatt
halogasd a vizsgálatot.

## Mit ad ehhez egy vezetett otthoni program?

Rendszert, sorrendet és adagolást ad, nem gyógyulást.

Ha otthon már hónapok óta próbálkozol, és mégsem érzed jobban magad, nem a
szándékkal van a baj. A gyakorlat önmagában kevés. A sorrend és az adagolás az,
ami otthon, egyedül a legnehezebb.

Erre nincs kész recept. A 30 vizsgálatot feldolgozó
összesítés szerint az eszköz, a terhelés, az időtartam és a gyakoriság
vizsgálatonként nagyon eltért.

Az Otthoni KézRehab Programot csukló-, ujj-, alkar- és könyökpanaszokra
állítottuk össze. A részleteket
[az Otthoni KézRehab Program oldalán](/kurzusok/otthoni-kezrehab-program)
találod meg.

A program 5 perces miniblokkokból áll, hogy rövid alkalmakra is elférjen a
napodban.

Vásárlás előtt két dolgot tudnod kell.

Az egyik a saját ellenjavallatunk. A program leírásában szerepel, hogy nem javasoljuk, ha:

- traumás sérülésed volt, és az orvos még nem enged mindent csinálni,
- már jelentkezett érzéskiesés,
- régebb óta tart jelentős gyengülés a szorítóerődben,
- műtétre vársz.

Ilyenkor előbb a kivizsgálás következik.

A másik a bizonyíték. A gyakorlatozás hatása a mai összesítések szerint kicsi, és
a bizonyosság alacsony.

Ezért mi nem gyógyulást ígérünk. Vezetett alkalmakat kínálunk arra az
időszakra, amíg a kezelésről döntesz az orvosoddal.

A program nem helyettesíti a szakorvosi vizsgálatot, és a műtéti döntést sem
váltja ki.

## Kik írták ezt a cikket?

Kocsis Kata és Kiss Kata vagyunk. Gyógytornászok, és évek óta elsősorban a kéz
rehabilitációjával foglalkozunk.

Kocsis Kata gyógytornász, sportrehabilitációs tréner, gyógy- és sportmasszőr.
Kiss Kata gyógytornász, manuálterapeuta, sportrehabilitációs tréner.

A könyök a saját tananyagunkban is önálló téma. A ProBody Stúdió
sportrehabilitációs tréner képzésén a „Bevezetés a kéz, a csukló- és
könyökízület rehabilitációs lehetőségeibe” tantermi kurzus instruktorai
vagyunk (2024, 2025, 2026, Budapest).

Ez a szakmai háttér a szerző hitelességét igazolja.

## Fontos tudnivaló

A cikk általános tájékoztatás, nem helyettesíti a szakorvosi vizsgálatot és a
személyre szabott kezelést. Ha bizonytalan vagy, vagy a tünetek romlanak,
fordulj orvoshoz.

---
---

## Állítás és forrás: a cikkíró öntesztje

A `docs/tudastar-tartalmi-terv.md` 5.8/2. pontja tételes öntesztet ír elő.
Minden klinikai állítás egy sor. **Forrás nélküli klinikai állítás: 0 darab.**

| # | Állítás a cikkben | Forrás | A szám szó szerint egyezik? |
|---|---|---|---|
| 1 | A teniszkönyök a könyök külső oldalán tapadó ínszövet elváltozása; elhasználódás, egyes esetekben mikroszakadás | TK2 | nincs szám |
| 2 | Az érintett ín az extensor carpi radialis brevishez (ECRB) tartozik, és a lateralis epicondyluson tapad | TK2 | nincs szám |
| 3 | Az NHS gyulladást említ, az AAOS elhasználódást és mikroszakadást (a két forrás eltérő fogalmazása) | TK1 + TK2 | nincs szám |
| 4 | 35 és 54 éves kor között a leggyakoribb | TK1 | igen: „35 and 54 years of age” |
| 5 | A legtöbb érintett 30 és 50 év közötti | TK2 | igen: „between the ages of 30 and 50” |
| 6 | Festők, vízvezeték-szerelők, asztalosok különösen hajlamosak | TK2 | nincs szám |
| 7 | Autóipari dolgozók, szakácsok, hentesek gyakrabban kapják meg az átlagnál | TK2 | nincs szám |
| 8 | Ok: megfogsz valamit, és ismételten csavarod a csuklód és az alkarod | TK1 | nincs szám |
| 9 | Kiváltó tevékenységek: gépelés, egérhasználat, varrás, csavarhúzó, tenisz, hangszer | TK1 | nincs szám |
| 10 | A fő tünet a fájdalom a könyök külső oldalán | TK1 | nincs szám |
| 11 | A fájdalom az enyhe kellemetlenségtől az alvást zavaró állandó fájdalomig terjedhet | TK1 | nincs szám |
| 12 | Rosszabb emelésre, karhajlításra, fogásra, csuklómozdulatra | TK1 | nincs szám |
| 13 | További tünet: nyomásérzékenység vagy duzzanat, alkarfájdalom, nehezen kinyújtható kar | TK1 | nincs szám |
| 14 | Fájdalom vagy égő érzés a könyök külső részén, gyenge szorítóerő, éjszakai fájdalom | TK2 | nincs szám |
| 15 | A tünetek alkar-tevékenységre erősödnek: ütő fogása, csavarkulcs, kézfogás | TK2 | nincs szám |
| 15b | A tünetek a könyök külső oldala és az alkar körül jelentkeznek (a 10-15. sorok forrásolt listáinak összegzése) | TK1 + TK2 | nincs szám |
| 16 | „Ne próbáld magad megállapítani a fájdalom okát” | VZ2 | idézet, tartalmi fordítás |
| 17 | Általában pihenéssel elmúlik, de néha egy évnél tovább is eltarthat | TK1 | igen: „can sometimes last over a year” |
| 18 | 185 beteg, háziorvosi ellátás, legalább 6 hete tartó panasz | TK3 | igen: 185, 6 weeks |
| 19 | 6 hétnél: injekció 92%, gyógytorna 47%, várakozás 32% | TK3 | igen: 92%, 47%, 32% |
| 20 | 52 hétnél: gyógytorna 91%, várakozás 83%, injekció 69% | TK3 | igen: 91%, 83%, 69% |
| 21 | Az injekciós csoportban magas volt a kiújulás | TK3 | nincs szám |
| 22 | 198 résztvevő, 18 és 65 év között, legalább hat hete tartó panasz | TK4 | igen: 198, 18 to 65, six weeks |
| 23 | 52 hétnél nincs különbség a gyógytorna és a várakozás között; a többség sikeres kimenetelt jelentett | TK4 | nincs szám |
| 24 | A gyógytornás csoport kérte a legkevesebb kiegészítő kezelést | TK4 | nincs szám |
| 25 | A betegek kb. 80–95%-a sikerrel jár a nem műtéti kezeléssel | TK2 | igen: „80 to 95%” |
| 26 | Hat hétnél az injekció minden mért szempontból jobb volt | TK3 | nincs szám |
| 27 | Hosszú távon a különbség a gyógytorna javára szignifikáns | TK3 | nincs szám |
| 28 | A sikeres injekciós esetek közül 65-ből 47 visszaesett | TK4 | igen: „47/65 of successes subsequently regressed” |
| 29 | A szerzők óvatos alkalmazást kérnek, mert a rövid távú előny hat hét után megfordul | TK4 | nincs szám |
| 30 | Fájdalommentes szorítóerő a torna javára: 12,15 · 22,45 · 18 átlagos különbség, alacsony bizonyosság | TK5 | igen: MD 12.15 / 22.45 / 18 |
| 31 | Az NHS otthoni listájának öt pontja (terhelés, fájdalomcsillapítás, borogatás, gyakorlatok, rögzítés) | TK1 | igen: 20 perc, 2–3 óra |
| 32 | Ibuprofén gélnél tilos a dohányzás és a nyílt láng, mert gyúlékony és súlyos égést okozhat | TK1 | nincs szám |
| 33 | A gyógyszerésztől kérhetsz tanácsot fájdalomcsillapítóról és rögzítőről | VZ2 | nincs szám |
| 34 | 30 vizsgálat, 2123 résztvevő; a gyakorlatozás jobb a passzív kezeléseknél, de a hatás kicsi | TK5 | igen: 30 trials, 2123 |
| 35 | A bizonyosság alacsony, illetve nagyon alacsony | TK5 | igen: low / very low certainty |
| 36 | A gyakorlatprogramok eszköze, terhelése, időtartama és gyakorisága vizsgálatonként eltért | TK5 | nincs szám |
| 37 | Hat vizsgálat, 429 résztvevő az excentrikus gyakorlatokról | TK6 | igen: six studies, 429 |
| 38 | Kiegészítő kezelés mellé adva: fájdalom SMD -0,63 (95% CI -0,90 és -0,36), izomerő SMD 1,05 (95% CI 0,78 és 1,33) | TK6 | igen, mind a négy érték |
| 39 | Koncentrikus vagy izotóniás gyakorlathoz képest fájdalomban SMD -0,30 (95% CI -0,58 és -0,02); erőben és funkcióban nincs különbség | TK6 | igen |
| 40 | A szerzők korlátai: kevés vizsgálat, nagyon eltérő gyakorlat-paraméterek | TK6 | nincs szám |
| 41 | Gyógytorna, ha az otthoni kezelés hat hét után sem hozott javulást | TK1 | igen: „6 weeks” |
| 42 | Háziorvos, ha legalább két hét pihenés és otthoni kezelés után is fáj | TK1 | igen: „at least 2 weeks” |
| 43 | A háziorvos gyulladáscsökkentő tablettát adhat | TK1 | nincs szám |
| 44 | Gyógytornás módszerek: masszázs, nyújtó és erősítő gyakorlatok a csuklóra és alkarra, ultrahangkezelés | TK1 | nincs szám |
| 45 | Műtét, ha 6–12 hónap után is megvan | TK1 | igen: „6 to 12 months” |
| 46 | A teniszkönyök-műtét a betegek 80–90%-ánál sikeres | TK2 | igen: „80 to 90%” |
| 47 | Sérülés után azonnali ellátás: zsibbadás, bizsergés, kiálló csont, alakváltozás | VZ3 | nincs szám |
| 48 | Stroke-jelek: lelógó arcfél, erőtlen vagy zsibbadt kar, akadozó beszéd; 112 | VZ1 | nincs szám |
| 49 | A 24 órán belül elmúlt stroke-tünet is azonnali segítséget igényel | VZ1 | igen: 24 óra |
| 50 | Aznap orvos: megszűnt érzés a kézen | VZ2 | nincs szám |
| 51 | Aznap orvos: nagyon erős fájdalom, ájulásérzés, hányinger, alak- vagy színváltozás, forró piros CSOMÓ a csuklón („a lump on your wrist”) | VZ2 | nincs szám |
| 52 | Napokon belül orvos: bizsergés, érzéskiesés, láz | VZ2 | nincs szám |
| 53 | Cukorbetegség mellett a kézpanasz komolyabb lehet | VZ2 | nincs szám |
| 54 | Az NHS a csökkentést is felsorolja a kerülés mellett | TK1 | nincs szám |

**Nem klinikai, tehát forrást nem igénylő állítások a cikkben:** a nyitás
élethelyzet-leírása, a szerzői bemutatkozás (a repó `restore-legacy-content.ts`
betűhív titulusai), a kurzus saját tulajdonságai (5 perces miniblokkok, a
program célterülete), a saját ellenjavallati szabályaink, és a
„nem ígérünk gyógyulást” típusú mondatok.

## A vezetőnek szóló jelzések

1. **A golfkönyök-összevetés kimaradt, szándékosan.** A C3 kiírás feltételhez
   kötötte: csak akkor írható meg, ha a TK2 oldalán a belső oldali forma szó
   szerint szerepel. **Az indoklás pontosítva 2026-08-21-én** (tényellenőrzés,
   M5): a TK2 oldal SZÖVEGTÖRZSE valóban nem tárgyalja a golfkönyököt és a
   medialis epicondylitist, de a kapcsolódó anyagok között szerepel a
   „Therapeutic Exercise Program for Epicondylitis (Tennis Elbow / Golfer's
   Elbow)” tétel. Egy puszta hivatkozás-cím viszont nem klinikai állítás, ezért
   a tartalmi döntés (a golfkönyök-összevetés kihagyása) érvényben marad. A
   mért autocomplete-ben ott a `golfkönyök vs teniszkönyök` alak
   (`docs/monid-adatok-teljes.md` 3.4). Ha ezt le akarjuk fedni, előbb forrás
   kell a forrásbázisba, utána bővíthető a szakasz.
2. **Forrásütközés a „gyulladás” szó körül.** A TK1 (NHS) rövid oksági mondata
   szó szerint ezt írja: „Tennis elbow is where the tendons in your elbow become
   inflamed.” A TK2 (AAOS OrthoInfo) ezzel szemben elhasználódásról és
   mikroszakadásról ír. A C3 kiírás egyedi tilalma szerint a „gyulladás” szót
   okként nem használhatjuk, ezért az AAOS leírását írtuk le, és a két forrás
   eltérését kimondtuk. **Kérdés a lektorálóknak: maradjon-e benne ez az
   eltérést kimondó bekezdés, vagy csak az AAOS-változat?**
3. **A H2-váz két pontját kettébontottuk.** A kiírás 6. pontja
   („Mikor menj gyógytornászhoz vagy orvoshoz?”) és 7. pontja
   („Mit kerülj, amíg fáj?”) egyaránt két kötelező elemet tartalmazott. A
   `docs/tudastar-tartalmi-terv.md` 5.2 pontja külön „Mikor fordulj azonnal
   orvoshoz?” és külön „Mikor NE végezd a gyakorlatokat?” szakaszt ír elő minden
   cikkbe. Ezért a 6. pontból „Mikor menj gyógytornászhoz vagy orvoshoz?” és
   „Mikor fordulj azonnal orvoshoz?”, a 7. pontból „Mit kerülj, amíg fáj?” és
   „Mikor NE végezd a gyakorlatokat?” lett. A sorrend és a tartalom változatlan.
4. **A stroke-sor (VZ1) beemelése.** A C3 kiírás vörös zászlóként a VZ2 és a
   VZ3 sorait nevesíti. A VZ1 stroke-sora viszont kifejezetten kar-tünetet ír le
   („az egyik kar erőtlen vagy zsibbadt”), és a forrásbázis 1.1 pontjában áll,
   amit az 5.2/4. pont kötelezően előír. Ezért egy rövid bekezdésben bekerült.
   Ha a lektorálók feleslegesnek tartják egy könyök-cikkben, kivehető.
5. **A H2 5 címe finomítva.** A kiírásban „Mit tehetsz otthon?” szerepel, a
   `docs/monid-adatok-teljes.md` 6. szakasza viszont kimondja, hogy a
   `teniszkönyök kezelése otthon` „legyen a H2”. Ezért a cím
   „Hogyan kezelheted a teniszkönyököt otthon?” lett: kérdés-alakú marad, és
   tartalmazza a mért kifejezés mindhárom elemét.
6. **Praxis-tapasztalatot nem írtunk a cikkbe.** A `docs/seo-geo-llm.md` 2.3
   pontja elsőszemélyű tapasztalatot kér E-E-A-T-okból („a praxisunkban azt
   látjuk, hogy…”). Ilyen mondatot nem találtunk ki: azt csak a két gyógytornász
   mondhatja ki a sajátjaként. A CTA-szakasz nyitása ezért a helyzetet szólítja
   meg, nem a pácienseinkről állít valamit. **Ha a lektorálás során van saját,
   vállalható megfigyelésük a teniszkönyökről, annak itt a helye.**
7. **Az `orthoinfo.aaos.org` cím átirányít.** 2026-08-21-én HTTP 301 megy a
   `www.orthoinfo.org` címre. A forrásjegyzékben az új cím szerepel, de a
   `docs/orvosi-forrasbazis.md` 4. szakaszának TK2 sorában még a régi áll.
   Ennek javítása a forrásbázis gazdájának a dolga, nem a cikkíróé.

8. **Tényellenőrző kör, 2026-08-21.** A `docs/cikkek-tenyellenorzes.md` alapján
   ebbe a cikkbe bekerült a Smidt-vizsgálat „nem szignifikáns” minősítése (J5),
   az AAOS műtéti erővesztés-fenntartása (J6), a szteroidinjekció takarékos
   használatára intő AAOS-mondat (M4), a mentőhívós lista negyedik tétele, az
   erősen vérző seb (M11), a kurzus saját ellenjavallata a CTA elé (B2 elve), és
   az SOS Kézrelax melletti pontosítás, hogy a bemutatott tesztek tájékozódásra
   valók (J16). **Az SZTK-A-33553/2024 akkreditációs szám és a 12 kreditpont
   KIKERÜLT** a szerzői dobozból (B3), mert a repó saját leltára
   (`docs/tartalom-leltar-regi-oldal.md` E17, Ny6) nyitottként tartja nyilván,
   érvényes-e 2026-ban. Helyette a repóból tételesen igazolható instruktori
   szerep maradt. Tételes lista: `docs/cikkek-javitas-naplo.md`.
