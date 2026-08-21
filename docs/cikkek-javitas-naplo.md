# Cikk-javítási napló: a tényellenőrzés lezárása

> **Mi ez?** A `docs/cikkek-tenyellenorzes.md` négy BLOKKOLÓ és tizenhat
> JAVÍTANDÓ tételének tételes átvezetése a hat Tudástár-cikken, plusz az
> AI-ízű írásmód kigyomlálása.
>
> **Készült:** 2026-08-21. **Végezte:** szakszöveg- és tényellenőrzés-ügynök,
> a vezető felülvizsgálatára. **Kódot nem módosít.**
>
> **A cikkek TOVÁBBRA IS LEKTORÁLÁSRA VÁRÓ MUNKAANYAGOK.** Ez a javítási kör
> nem helyettesíti Kocsis Kata és Kiss Kata szakmai jóváhagyását. Mind a hat
> fájl `status` és `_status` mezője `draft` marad, és mind a hat cikk első
> sorában ott a lektorálandó-vázlat jelzés. A javítás azt éri el, hogy a
> lektorálók már ne bizonyíthatatlan állításokat kapjanak kézhez.

---

## 0. Módszer

Egyetlen állítást sem fogadtam el a `docs/cikkek-tenyellenorzes.md`
összefoglalója alapján. Minden javításhoz visszamentem az **eredeti forráshoz**,
és onnan olvastam vissza a szöveget:

| Forrás | Hogyan ellenőriztem | Mit igazolt |
|---|---|---|
| Cochrane 2023, sín (PMID 36848651) | PubMed E-utilities, teljes absztrakt | J1: az AUTHORS' CONCLUSIONS első mondata tényleg *„There is insufficient evidence to conclude whether splinting benefits people with CTS.”* |
| NHS, Carpal tunnel syndrome | oldal letöltve, szövegre bontva | J2: a „You're more at risk of CTS if you:” lista **hat** pontból áll, az „arthritis or diabetes” egyetlen elem |
| Cochrane 2023, injekció (PMID 36722795) | PubMed E-utilities | J3: *„risk ratio 0.84 … 1 RCT, 111 participants, moderate-certainty evidence”* |
| Rheumatology 2023 (PMID 35394019) | PubMed E-utilities | J4: *„CSI was more costly [mean difference £68.59 (95% CI: -120.84, 291.24)]”*, és a következtetés: *„may not be cost-effective in the long-term”* |
| Lancet 2002, Smidt (PMID 11879861) | PubMed E-utilities | J5: *„Physiotherapy had better results than a wait-and-see policy, but differences were not significant.”* |
| AAOS OrthoInfo, Tennis Elbow | oldal letöltve | J6 és M4: *„successful in 80 to 90% … However, it is not uncommon to experience a loss of strength.”* és a szteroidra vonatkozó *„very sparingly”* mondat |
| J Hand Surg Glob Online 2026 (PMID 41362294) | PubMed E-utilities | J7: a PIP-sín fölénye, és hogy ez ajánlás, nem eldöntött tény |
| J Hand Ther 2019 (PMID 29290504) | PubMed E-utilities | J7: *„All authors reported similar results regardless of the joint immobilized”* |
| Arch Phys Med Rehabil 2025 (PMID 40449569) | PubMed E-utilities | J8: a kizárási kritériumok (`trigger thumb`, `>2 digits`, `grade 4`) és a `nighttime extension orthosis` |
| Hand Ther 2025, Bateman (PMID 40385935) | PubMed E-utilities | J15: *„only one randomised controlled trial … that compared night splints to a control arm”* plusz az „One additional RCT” mondat |
| Graf 2023 teljes szöveg (PMC10382899) | PMC, teljes szöveg | J10: *„The most common signs and symptoms of CuTS are intermittent numbness and tingling in the ulnar ring and small fingers.”* |
| AAOS és ASSH irányelv, 2020 (PDF, 20. o.) | PDF letöltve, szövegre bontva | B4: a teljes RATIONALE, a hét vizsgálat bontásával |
| AAOS 2024 CTS-irányelv (PDF) | PDF letöltve, szövegre bontva | M1: `Quality of Evidence: High`, `Strength of Option: Limited (Downgraded)`, és a leminősítés indoklása |
| NICE NG38, 1.6.10 | élő oldal letöltve | J13: a pont második fele, *„the likelihood of any permanent effects on quality of life”* |
| AAOS OrthoInfo, Distal Radius | oldal letöltve | J13: *„In some cases, the stiffness and aching can last forever.”* |
| NHS, Wrist pain | oldal letöltve | J14: *„you have a lump on your wrist”*, tehát csomó, nem duzzanat |
| NHS, Broken arm or wrist | oldal letöltve | M11: a 999-lista négy tétele, benne *„a bad cut that is bleeding heavily”* |
| NHS, Trigger finger | oldal letöltve | M12: az öngyógyító lista csak terhelés-csökkentés és fájdalomcsillapító; a sínezés a „Treatments” (háziorvos vagy szakorvos) alatt van |
| `src/scripts/restore-legacy-content.ts` | repóból olvasva (1811–1818. és 907. sor) | B2: a kurzus saját ellenjavallati listája; B3: mi igazolható az instruktori szerepből |
| `git show origin/docs/kampany-kutatas:docs/monid-masodik-kor.md` | git | B1 indoklása: a `bal kéz zsibbadás hányinger` mért keresési alak |

Amit **nem** sikerült első kézből igazolni, azt nem javítottam „valami másra”:
a tétel vagy kikerült a szövegből, vagy nyitva maradt, és lentebb nevesítve van.

---

## 1. A négy BLOKKOLÓ

### B1 — hiányzó mentőhívási szint · **LEZÁRVA**

Két helyen kellett javítani, mert a tényellenőrzés a 4. cikket kifogásolta, a
mért keresési adat viszont az 1. cikket is érinti.

**4. cikk (`4-pattano-ujj.md`).** A cikkben korábban egyetlen `112`, `mentő`
vagy `stroke` szó sem volt. Bekerült:

1. **Új, ELÖL álló szakasz** közvetlenül a bevezető után: „Előbb ezt: mikor kell
   azonnal mentőt hívni?”. Ebben a gennyes ínhüvelygyulladás négy jele, majd
   szó szerint: *„Ez nem várhat másnapig. Hívd a 112-t, vagy menj a legközelebbi
   sürgősségi osztályra.”*
2. A forrásbázis 1.1 pontja szerinti **stroke-sor**, ugyanúgy rövid
   bekezdésként, ahogy a 3. cikk megoldotta.
3. Ugyanez a mondat bekerült a cikk végi „Mikor fordulj azonnal orvoshoz?”
   szakaszba is, a Kanavel-bekezdés után, félkövéren. A korábbi „Kérj sürgős
   orvosi ellátást” fordulat „Kérj azonnali orvosi ellátást”-ra változott.
4. A VZ1 (NHS, Stroke, Symptoms) bekerült a cikk forrástáblájába és a
   forrásjegyzékbe.

**1. cikk (`1-miert-zsibbad-a-kezem.md`).** A `git show
origin/docs/kampany-kutatas:docs/monid-masodik-kor.md` 121–126. sora szerint a
`bal kéz zsibbadás hányinger` és a `bal kéz zsibbadás fájdalom` valódi, mért
keresési alak, és a kutatás kimondja: *„A zsibbadás-cikkben a 112-szintű
figyelmeztetésnek elöl kell állnia.”* A stroke-figyelmeztetés eddig a negyedik
H2-ben volt. Bekerült egy **új, ELÖL álló szakasz** ugyanazzal a címmel, benne:

- a stroke-jelek és a 24 órás szabály (NHS, Stroke, Symptoms),
- a sérülés utáni négy jel, immár az erősen vérző sebbel együtt (NHS, Broken arm
  or wrist),
- egy **„Ha megijedtél”** bekezdés annak az olvasónak, aki infarktus-félelemmel
  érkezik.

A későbbi ismétlés visszametszve, hogy ne váljon ismétlődővé: a „Számít, hogy a
bal vagy a jobb kezed zsibbad?” szakasz most visszautal az elülső blokkra.

> **A „Ha megijedtél” bekezdés szándékosan NEM tartalmaz klinikai állítást.**
> Nem mondja meg, mit jelent a mellkasi panasz vagy a hányinger, mert erre nincs
> forrásunk a `docs/orvosi-forrasbazis.md`-ben. Csak útbaigazít: ezt telefonon
> percek alatt eldöntik, egy cikkből nem lehet. A cikk öntesztjében ez
> **nem klinikai állításként** van jelölve, és **külön lektori jóváhagyást kér.**

### B2 — a kurzus saját ellenjavallata · **LEZÁRVA**

A forrás a termékleírás betűhív szövege
(`src/scripts/restore-legacy-content.ts`, `kezrehabLongDescription`,
„Nem javasoljuk a programot, ha…”).

| Cikk | Hova került | Alak |
|---|---|---|
| 1. cikk | „Hogyan tovább, ha a kivizsgálás nem talált sürgős okot?” | félkövér felvezetés + négy pontos felsorolás (érzéskiesés, szorítóerő-gyengülés, izomtömeg-vesztés, műtétre vársz) |
| 2. cikk | „Mit ad ehhez egy vezetett otthoni program?” | ugyanaz, plusz a kifejezett visszakötés: „Ha a hüvelykujjad gyengül, vagy elejted a tárgyakat, előbb a kivizsgálás következik” |
| 3. cikk | „Mit ad ehhez egy vezetett otthoni program?” | felsorolás, a traumás sérüléssel kiegészítve |
| 4. cikk | „Mit ad egy vezetett otthoni program a pattanó ujj mellé?” | ugyanaz |
| 5. cikk | „Mit ad egy vezetett otthoni program a csuklófájdalom mellé?” | ugyanaz |
| 6. cikk | már benne volt (ez volt a minta) | változatlan |

A kifogás betű szerint az 1. és a 2. cikkre vonatkozott. A többi négybe azért
került be, mert ugyanaz a termék ugyanazokkal az ellenjavallatokkal áll mögötte,
és a hat cikk így egységes. Ez nem kitalált tartalom: a termékoldal saját
szövege.

### B3 — nem igazolt akkreditációs szám · **A KOCKÁZATOS ÁLLÍTÁS ELTÁVOLÍTVA, TULAJDONOSI DÖNTÉSRE VÁR**

**Nem javítottam „egy másik számra”.** A `docs/tartalom-leltar-regi-oldal.md`
E17 és Ny6 pontja nyitottként tartja nyilván, érvényes-e 2026-ban az
SZTK-A-33553/2024 akkreditáció. Ami nem igazolható, az kikerül.

**Hol volt (mind az öt helyen a „Kik írták ezt a cikket?” szakaszban):**

| Cikk | Sor a javítás előtt | Mi állt ott |
|---|---|---|
| 2. cikk | 318 | „…akkreditált tantermi képzés instruktorai vagyunk, 12 kreditpont, SZTK-A-33553/2024.” |
| 3. cikk | 428–430 | ugyanaz, „A könyök a saját tananyagunkban is önálló téma” felvezetéssel |
| 4. cikk | 277 | ugyanaz |
| 5. cikk | 298 | ugyanaz |
| 6. cikk | 274 | ugyanaz |

**Mire cseréltem** (mind az öt helyen, azonos alakban):

> Oktatunk is. A ProBody Stúdió sportrehabilitációs tréner képzésén a „Bevezetés
> a kéz, a csukló- és könyökízület rehabilitációs lehetőségeibe” tantermi kurzus
> instruktorai vagyunk (2024, 2025, 2026, Budapest).

**Miért pontosan ez.** Ez az alak a `src/scripts/restore-legacy-content.ts`
907. sorából **tételesen igazolható**: az instruktori szerep, a ProBody Stúdió
mint partner, és a három évszám mind ott áll. Ami kikerült: az akkreditáció
ténye jelen időben, a 12 kreditpont, és a szám. Mind a három ugyanahhoz a
2024-es akkreditációhoz tartozik, amelynek 2026-os érvényessége nyitott.

**Amit a tulajdonosnak vagy a két gyógytornásznak meg kell tennie:**

1. Kérjenek megerősítést arról, hogy az **SZTK-A-33553/2024 akkreditáció
   2026-ban is érvényes-e** (a kiállító szervnél vagy a ProBody Stúdiónál).
2. **Ha igen** (és van róla írásos igazolás): a szám és a 12 kreditpont
   visszatehető mind az öt cikkbe, a korábbi alakban. Ekkor a
   `docs/tartalom-leltar-regi-oldal.md` E17 és Ny6 tétele is lezárható.
3. **Ha nem, vagy ha nem szerezhető be igazolás:** a mostani, szám nélküli alak
   marad. Ebben az esetben a `/rolunk` és a `/szolgaltatasok` oldal szövegét is
   át kell nézni, mert az E17 szerint a szám ott is szerepel. Az a két oldal
   **nem ennek a körnek a fájl-tulajdona.**

A többi szerzői adatot (Kate Thorn CHT, Loren Szmiga CHT, Daphne Xuan MPT
kurzusok, 2024) a tényellenőrzés a `restore-legacy-content.ts` 861–868. sorából
visszaigazolta, ezek érintetlenek maradtak.

### B4 — szelektív irányelv-olvasat a 6. cikkben · **LEZÁRVA**

Az AAOS és ASSH 2020-as irányelvének PDF-jét letöltöttem, és a 20. oldal
RATIONALE szakaszát szövegre bontva olvastam vissza. A teljes állítás bekerült,
két helyre:

**1. Az „Otthoni gyakorlás vagy felügyelt gyógytorna?” szakaszba**, a
Cochrane-bekezdés elé, két bekezdésben: az irányelvbe hét vizsgálat került be
(egy magas és hat közepes minőségű); az egyetlen magas minőségű a felügyelt
terápia javára döntött hat hétnél és hat hónapnál; egy közepes minőségű szintén
a felügyelt terápia javára a harmadik héten; egy az önálló gyakorlást hozta ki
jobbnak hat hétnél; négy nem talált különbséget. Ez az 1 + 1 + 1 + 4 = 7 bontás
hiánytalanul lefedi a bevont vizsgálatokat.

> A tényellenőrzés javasolt mondata csak három csoportot említett (egy magas, egy
> önálló-párti, négy különbség nélküli), ami hatot ad ki. Az eredeti RATIONALE
> szerint van egy hetedik is: **Oken és mtsai 2011**, közepes minőségű, szintén a
> felügyelt terápia javára, a sérülés vagy műtét utáni harmadik héten. Ezt is
> beírtam, mert a hiányos bontás megint féloldalas lett volna.

**2. A „Mit ad ehhez egy vezetett otthoni program?” CTA-szakaszba**, ahol a cikk
korábban csak a „nem mutatkozott különbség” felét idézte. Most ott áll a magas
minőségű vizsgálat eredménye is, és utána a mondat, ami ebből következik: ha van
mód felügyelt gyógytornára járni, a bizonyíték nem beszél le róla.

A cikk kimondja, hogy ez a saját érdekünk ellen szól. Ez nem stílus, hanem a
lektoráló gyógytornász miatt szükséges: ő az irányelvet ismeri.

---

## 2. A tizenhat JAVÍTANDÓ, egyenként

| # | Tétel | Állapot | Mi történt |
|---|---|---|---|
| **J1** | A Cochrane sín-áttekintés zárókövetkeztetésének első mondata kimarad (1., 2. cikk) | **LEZÁRVA mindkét cikkben** | Azonos szerkezettel: előbb a fejmondat („nincs elég bizonyíték annak eldöntésére, használ-e a sín a kéztőalagút-szindrómában szenvedőknek”), utána a korlátozott javulásról szóló mondat, és csak ezután a sokat idézett kedvező rész. Az 1. cikkben a „A szerzők záró következtetése **mégis** a sín mellett szól” mondat kikerült, mert éppen ez a fordulat tette féloldalassá az olvasatot. Mindkét cikkben ott a zárómondat: „Nem tudjuk, hogy használ-e, de olcsó és ártalmatlan, tehát megpróbálható.” |
| **J2** | „HÉT kockázati tényező”, valójában hat (2. cikk) | **LEZÁRVA** | „hat kockázati tényező”-re javítva, és külön bekezdés mondja ki, hogy az ízületi gyulladás és a cukorbetegség az NHS-nél egy felsorolási elem. Az oldal 2026-08-21-én letöltve, a lista tételesen megszámolva. |
| **J3** | Az RR 0,84 mintamérete nincs kiírva (2. cikk) | **LEZÁRVA** | Kiegészítve: „Ez az utóbbi szám egyetlen, 111 fős vizsgálatból származik, közepes bizonyossággal.” |
| **J4** | „Az injekció ráadásul drágább is volt”, pedig nem szignifikáns (2. cikk) | **LEZÁRVA** | A mondat kikerült. Helyette a mért különbség (68,59 font), a nullát is tartalmazó megbízhatósági tartomány, és a közlemény saját, óvatosabb következtetése áll. |
| **J5** | A 91% és a 83% mellől hiányzik, hogy a különbség nem szignifikáns (3. cikk) | **LEZÁRVA** | Két új bekezdés a számok után: a különbség nem volt statisztikailag jelentős, és a szerzők zárógondolata szerint a gyógytorna viszonylagos többlete kicsi. |
| **J6** | A 80–90%-os műtéti sikerarány mellől kimarad az AAOS fenntartása (3. cikk) | **LEZÁRVA** | Bekerült: „a műtét után nem ritka az erővesztés”. |
| **J7** | A sín-típusról két forrás mást mond, a cikk csak az egyiket hozza (4. cikk) | **LEZÁRVA** | A szakasz átírva a De Quervain-mintára: kimondja, hogy a két áttekintés nem ugyanazt mondja. Előbb a McKenna-féle PIP-fölény és az ajánlás, utána a Lunsford-féle „minden szerző hasonló eredményt közölt, függetlenül a rögzített ízülettől”, végül: „A kérdés tehát nincs eldöntve.” |
| **J8** | A 68,9% forrása kizárta a pattanó hüvelykujjat (4. cikk) | **LEZÁRVA** | Hatókör-jelzés a szakasz elejére, a 68,9% után: nem került be a pattanó hüvelykujj, a 4-es fokozat, és a kettőnél több érintett ujj; a vizsgálat sínje éjszakai nyújtósín volt, nem napi 24 órás. |
| **J9** | A Kanavel-féle négy jel felsorolására az absztraktok nem adnak fedezetet (4., 5. cikk) | **NYITVA, indoklással** | A felsorolás **benne maradt**, mert kivétele csökkentené az olvasó biztonságát: ez az egyetlen dolog, amiből felismerheti, hogy azonnali ellátás kell. Ellenőriztem, hogy egyik közleménynek sincs szabadon hozzáférhető teljes szövege (a PubMed sem a 28336044-hez, sem a 34134159-hez nem ad PMC-linket). Új forrást a `docs/orvosi-forrasbazis.md`-be nem írhatok (0.2/1. tilalom, és a fájl nem az enyém). **Amit tettem:** a 4. cikk meglévő lektori jelzését kiegészítettem a döntéssel, és ugyanezt a jelzést beírtam az 5. cikkbe is, hogy a két cikk kezelése egységes legyen. **A forrásbázis gazdájára tartozik**, hogy tételesen felsoroló forrást emeljen az 1.2 táblázatba (a tényellenőrzés a StatPearls NBK576414 fejezetét javasolja), és utána mindkét cikk arra hivatkozzon. |
| **J10** | A gyűrűs- és kisujj-mintázat nem a forrásbázisból való (1. cikk) | **RÉSZBEN LEZÁRVA** | Az állítást a Graf 2023 teljes szövegéből (PMC10382899) magam is visszaigazoltam, betűhíven. A cikkben a hivatkozás pontosítva („teljes szöveg: PMC10382899”), és a forrásjegyzékbe bekerült a PMC-cím, hogy az olvasó ellenőrizhesse. **A forrásbázis 3. szakaszának bővítése a fájl gazdájára tartozik** (eljárási hiba, nem tartalmi). |
| **J11** | Kitalált elsőszemélyű praxis-állítások (1., 5., 6. cikk) | **LEZÁRVA** | Négy mondatból három helyzetleírásra cserélve, egy pontosítva. Lásd a 3. szakasz táblázatát. |
| **J12** | Négy belső link olyan cikkre mutat, ami ebben a hullámban nem jelenik meg | **LEZÁRVA a törzsben, a megjelenési sorrend nyitva** | A `/blog/de-quervain-szindroma` **törzsbe ágyazott** linkje a 4. és az 5. cikkből kikerült; a mondat maradt, a link helyett „arról külön cikk készül”. A `relatedPosts` mező érintetlen, mert a CMS a nem létező rekordot kihagyja. Mindkét cikk meta-blokkjában ott a jelzés, hogy ha a C9 az első hullámmal jelenik meg, a link visszatehető. **A megjelenési sorrend vezetői döntés.** |
| **J13** | A 6. cikk csak a javuló idővonalat adja | **LEZÁRVA** | Két helyen. A „Türelem” pontnál az AAOS fenntartása: egyeseknél a merevség vagy sajgás két évnél is tovább tart, és véglegesen is megmaradhat (gyakoribb súlyos sérülés után, 50 év fölött, artrózis mellett), de általában enyhe. A „Csuklótörés után mikor lehet dolgozni?” szakaszban a NICE NG38 1.6.10 második fele: tájékoztatni kell arról is, mekkora eséllyel marad maradandó hatás az életminőségre. |
| **J14** | „Duzzanat” ott, ahol az NHS „csomót” ír (1., 3. cikk) | **LEZÁRVA mindkét cikkben** | Az NHS mondata letöltve és visszaolvasva: *„you have a lump on your wrist that's very painful, hot or red”*. Az 1. cikkben: „A csuklódon lévő csomó nagyon fájdalmas, forró vagy piros.” A 3. cikkben két helyen: a sürgős listában „a csuklón lévő nagyon fájdalmas, forró vagy piros csomó”, a „Mikor NE végezd” listában „forró, piros, nagyon fájdalmas csomónál”. Mindkét cikk öntesztje frissítve. **Nem nyúltam** a 3. cikk „nyomásérzékenység vagy a duzzanat a könyökben” mondatához, mert az a teniszkönyök NHS-tünetlistája, ahol a forrás valóban duzzanatot ír. |
| **J15** | „Mindössze egyetlen randomizált vizsgálatot talált”, valójában kettő (1. cikk) | **LEZÁRVA** | Átírva: „egyetlen olyan randomizált vizsgálatot talált, amely a sínt kontrollcsoporthoz hasonlította”. Új bekezdés a további RCT-ről és a három egykarú vizsgálatról, benne a kulcsmondat: nem tudni, a javulás a kezeléstől vagy az idő múlásától volt-e. A „nagyon alacsony bizonyosság” és a „nem eldönthető” minősítés külön bekezdésben marad. |
| **J16** | „Ne diagnosztizáld magad” mellé öntesztet ígérő kurzus linkelve | **LEZÁRVA a cikkek oldalán, a termékszöveg nyitva** | Mind az öt helyen, ahol az SOS Kézrelax linkje áll (1., 2., 3., 4., 5. cikk), a link mellé került: „Ebben megmutatjuk, mit vizsgálunk mi az egyes kórképeknél. Ezek tájékozódásra valók: a diagnózist orvosi vizsgálat adja meg, nem egy otthon elvégzett teszt.” **A termékleírás mondatának pontosítása („ezeket azonnal kipróbálhatod magadon”) tulajdonosi döntés, és nem ennek a körnek a fájl-tulajdona.** |

---

## 3. A J11 négy mondata, tételesen

| Cikk | Mi állt ott | Mi áll ott most | Miért |
|---|---|---|---|
| 1. cikk | „A kéz zsibbadás az egyik leggyakoribb panasz, amivel a praxisunkban találkozunk. Sokan hónapokig várnak vele, mert nem fáj eléggé.” | „Zsibbadásnál könnyű halogatni a kivizsgálást, mert nem fáj annyira, hogy sürgősnek érezd.” | A régi változat két állítást tett: egy epidemiológiait („leggyakoribb panasz”) és egy praxisbelit. Egyikre sincs forrás. Az új mondat az olvasó helyzetét írja le, nem a pácienseinkről állít valamit. |
| 1. cikk | „Azt látjuk, hogy a legtöbben nem a kitartással vannak bajban. Azzal, hogy nincs sorrend, és nincs adagolás.” | „Otthon jellemzően nem a kitartás hiányzik. A sorrend és az adagolás az, ami nehéz egyedül.” | Ugyanaz a gondolat, a „mi ezt látjuk” állítás nélkül. Ez az 5. cikk már meglévő, önteszttel fedett alakja. |
| 5. cikk | „Gyógytornászként ilyenkor azt nézzük meg, milyen terhelés éri a kezed, és ehhez igazítjuk a gyakorlást.” | „Gyógytornászként ilyenkor az az első kérdés, milyen terhelés éri a kezed, és ehhez kell igazítani a gyakorlást.” | A szakmai keret marad, de már nem állít semmit arról, mit csinálnak ők ketten a rendelőben. |
| 6. cikk | „A praxisunkban azt látjuk, hogy sokan program nélkül kezdenek neki otthon. A gyakorlat önmagában kevés: a sorrend és az adagolás számít.” | „Otthon jellemzően nem a gyakorlat hiányzik. A sorrend és az adagolás az, ami nehéz egyedül.” | Ez volt az egyetlen olyan praxis-mondat, amit a saját cikke ÖNTESZTJE sem jelölt. |

**Ha a két gyógytornász vállalja ezeket a mondatokat szó szerint, bármelyik
visszatehető.** Ez az ő döntésük, nem az enyém: a nevük van a cikken.

---

## 4. Az AI-ízű írásmód kigyomlálása

### 4.1 Gondolatjel-számláló

Mérés: minden `—` (U+2014, kvirtmínusz) és minden `–` (U+2013) előfordulás,
fájlonként. A `–` esetében külön számolva, hogy **gondolatjelként** áll-e
(szóközzel legalább az egyik oldalán) vagy **nagykötőjelként** (szóköz nélkül,
számtartományban vagy szóösszetételben).

| Cikk | Kvirtmínusz előtte | Kvirtmínusz utána | Gondolatjel előtte | Gondolatjel utána | Nagykötőjel (marad) |
|---|---:|---:|---:|---:|---:|
| 1. Miért zsibbad a kezem? | 2 | **0** | 0 | **0** | 0 |
| 2. Kéztőalagút-szindróma | 1 | **0** | 0 | **0** | 8 |
| 3. Teniszkönyök | 0 | **0** | 0 | **0** | 18 |
| 4. Pattanó ujj | 1 | **0** | 0 | **0** | 18 |
| 5. Csukló- és kézfájdalom | 1 | **1** | 0 | **0** | 19 |
| 6. Csuklótörés utáni gyógytorna | 0 | **0** | 0 | **0** | 14 |
| **Összesen** | **5** | **1** | **0** | **0** | **77** |

**Négy kvirtmínusz vettem ki:**

1. **1. cikk, meta-blokk (2 db).** A blokk a feladatkiírás em-dashes alakját
   idézte szó szerint. Átfogalmaztam úgy, hogy a jel neve szerepeljen, ne a jel.
2. **2. cikk H1 (1 db).** `# LEKTORÁLANDÓ VÁZLAT — …` → `# LEKTORÁLANDÓ VÁZLAT.
   A …`. Ezzel mind a hat cikk H1-e egyforma lett (a tényellenőrzés M8 pontja).
3. **4. cikk H1 (1 db).** Ugyanaz.

**Az egyetlen megmaradó kvirtmínusz** az 5. cikk 480. sorában áll, ebben a
mondatban: *„Kvirtmínusz (—) 0 darab.”* Ez a cikkíró öntesztje, ahol a
karaktert **magát kell megnevezni** ahhoz, hogy a mérés értelmezhető legyen. Ez
a szakasz nem kerül a `content` mezőbe, tehát látogatói szövegben nem jelenik
meg. Ha a vezető így is zavarónak tartja, `U+2014` alakra írható át.

**Gondolatjel (szóközös en dash) egyik cikkben sincs, sem előtte, sem utána.**
A 77 megmaradó `–` mind **nagykötőjel**, szóköz nélkül, és mind a
`docs/ui-sztenderdek.md` §3.1.1 szerinti helyes használat:

- számtartomány: `4–6 hét`, `6–8 hét`, `2–3 óránként`, `10–14 nap`, `80–95%`,
  `1–2 hónap`, `3–6 hónap`, `40–60 közötti nők`, `0,49 és 1,99` melletti
  `6–10 hétre`;
- oldalszám a hivatkozásokban: `1423–1433`, `546–554`, `217–227`, `657–662`,
  `477–485`, `212–221`, `2281–2294`, `1798–1806`, `50–59`, `267–275`;
- szóösszetétel: `csukló- és könyökízület` típusú alakokban a kiskötőjel áll,
  ezek nem is számítanak bele.

Ez megfelel az AkH. 264. pontjának és a §3.1.1 táblázatnak: a nagykötőjelet
szóköz nem veszi körbe, és nem gondolatjel.

### 4.2 Sablonos fordulatok

Végigfuttattam a hat fájlon a tiltott alakokat. **Egyik sem szerepelt már a
kiinduló szövegben sem**, tehát ezekből nem kellett kivenni:

`A mai rohanó világban` · `Napjainkban` · `Összefoglalva` ·
`Összegzésképpen` · `Konklúzióként` · `Végezetül elmondható` ·
`Összességében elmondható` · `Fontos megjegyezni` · `Érdemes megjegyezni, hogy` ·
`Nem véletlen, hogy` · `rendkívül` · `hihetetlenül` · `kulcsfontosságú` ·
`elengedhetetlen` · `páratlan` · `felbecsülhetetlen` · `létfontosságú` ·
`Amikor arról van szó` · `A nap végén` · `Nem titok, hogy` ·
`Ahogy azt már említettük`

Ez a hat cikk írójának dicsérete, nem az enyém.

### 4.3 Amit viszont ki kellett venni: a saját formula-ismétlés

A `Egy dolgot…` felütés **12-szer** szerepelt a hat cikkben, a 4. cikkben
négyszer. Ez ugyanaz a hiba, mint a gondolatjel-halmozás: egy fordulat, ami
gépiessé teszi a szöveget. Hatot átírtam, mindegyiket másra:

| Hol | Előtte | Utána |
|---|---|---|
| 1. cikk, CTA | „**Egy dolgot** vásárlás előtt tudnod kell…” | „Vásárlás előtt ezt tudnod kell…” |
| 3. cikk, „Mikor NE végezd” | „**Egy dolgot** itt is kimondunk.” | „Ezt itt is kimondjuk.” |
| 4. cikk, sín-szakasz | „**Egy dolgot** itt is kiírunk. A sín kiválasztása…” | „A sín kiválasztása…” |
| 4. cikk, sürgős szakasz | „**Egy dolgot** az NHS kimondottan kér: ne próbáld…” | „Az NHS ezt kimondottan kéri: ne próbáld…” |
| 4. cikk, CTA | „**Egy dolgot** vásárlás előtt tudnod kell.” | „Vásárlás előtt ezt tudnod kell.” |
| 5. cikk, CTA | „**Egy dolgot** vásárlás előtt tudnod kell.” | „Vásárlás előtt ezt tudnod kell.” |
| 6. cikk, CTA | „**Egy dolgot** itt is kiírunk, mert vásárlás előtt tudnod kell.” | „Vásárlás előtt ezt tudnod kell.” |

Maradt 5 előfordulás, cikkenként legfeljebb kettő, és ezek a szöveg
jellegadó, tudatos felütései („Egy dolgot előre tisztázunk” a bevezetőben).

Az AAOS-idézetnél a `FELÜGYELT` csupa nagybetűs kiemelést félkövérre cseréltem
a 6. cikkben, két helyen: a csupa nagybetű kiabálásnak olvasódik, és a
`docs/ui-sztenderdek.md` sem használja folyószövegben.

### 4.4 Magyar idézőjel

Az 1. és a 2. cikkben az **egyenes idézőjel** (`"`, U+0022) záró párként
szerepelt a magyar `„` után: az 1. cikkben 23, a 2.-ban 2 helyen. Mind a
25 javítva `”`-re. Mérés a javítás után:

| Cikk | Nyitó `„` | Záró `”` | Egyenes `"` |
|---|---:|---:|---:|
| 1. | 24 | 24 | **0** |
| 2. | 6 | 6 | **0** |
| 3. | 35 | 35 | **0** |
| 4. | 10 | 10 | **0** |
| 5. | 27 | 27 | **0** |
| 6. | 24 | 24 | **0** |

### 4.5 Mondathossz: mért állapot a javítás után

A `docs/tudastar-hangnem-es-technika.md` 1.4 pontjának célértékei: átlag 12,9
szó körül, a mondatok kétharmada 15 szó alatt, 30 szó fölé gyakorlatilag ne
menjen. Mérés a cikkek TÖRZSÉN (a H1-től a forrásjegyzékig, felsorolások és
hivatkozás-zárójelek nélkül):

| Cikk | Mondat | Átlagos hossz | ≤ 15 szó | Leghosszabb | > 30 szó |
|---|---:|---:|---:|---:|---:|
| 1. | 151 | 11,3 szó | 77% | 26 | **0** |
| 2. | 198 | 11,5 szó | 79% | 27 | **0** |
| 3. | 177 | 10,9 szó | 81% | 29 | **0** |
| 4. | 174 | 10,5 szó | 91% | 24 | **0** |
| 5. | 160 | 11,4 szó | 84% | 24 | **0** |
| 6. | 130 | 12,3 szó | 73% | 29 | **0** |

A javítás előtt öt cikkben volt összesen **hét darab 30 szónál hosszabb
mondat** (a leghosszabb 35 szavas). Ezeket felbontottam, a leghosszabbakat
felsorolássá alakítottam. Ez nem csak stílus: a kurzus ellenjavallati listája
felsorolásként ugyanaz az alak, mint a termékoldalon, tehát könnyebben
összevethető vele.

---

## 5. Amit NEM zártam le, és miért

| # | Tétel | Kinek szól | Mit kell eldönteni |
|---|---|---|---|
| **B3** | Akkreditációs szám | **tulajdonos / a két gyógytornász** | Érvényes-e 2026-ban az SZTK-A-33553/2024? A szám és a 12 kreditpont addig kivéve. Ha igazolható, visszatehető. Ha nem, a `/rolunk` és a `/szolgaltatasok` oldalt is át kell nézni. |
| **J9** | Kanavel-jelek forrása | **a `docs/orvosi-forrasbazis.md` gazdája** | Tételesen felsoroló forrás kell az 1.2 táblázatba (javaslat: StatPearls NBK576414). A felsorolás addig benne marad, mert kivétele biztonsági visszalépés lenne. |
| **J10** | Graf 2023 tünet-állítása | **a `docs/orvosi-forrasbazis.md` gazdája** | Az állítás igaz és ellenőrzött, de a forrásbázis 3. szakasza még nem tartalmazza. Eljárási, nem tartalmi hiány. |
| **J11** | Négy praxis-mondat | **a két gyógytornász** | Vállalják-e szó szerint? Ha igen, visszatehetők. Addig helyzetleírás áll a helyükön. |
| **J12** | A C9 (De Quervain) megjelenése | **vezető / tartalmi terv gazdája** | Az első hullámmal jelenik-e meg? A törzsbe ágyazott linkek addig kivéve, a `relatedPosts` marad. |
| **J16** | Az SOS Kézrelax leírásának öntesztet ígérő mondata | **tulajdonos** | A cikkek most kiírják, hogy a bemutatott tesztek tájékozódásra valók. A termékszöveg pontosítása („megmutatjuk, mit vizsgál a gyógytornász”) továbbra is tulajdonosi döntés. |
| **M6, M7** | Az NHS `/symptoms/` útvonalra költözött; az orthoinfo-címek alakja | **a forrásbázis gazdája** | A cikkekben egységesítettem a kanonikus, `/en/` nélküli orthoinfo-alakra. A `docs/orvosi-forrasbazis.md` 12.2 táblázata és a forrás-sorok frissítése nem ennek a körnek a fájl-tulajdona. |
| **„Ha megijedtél” bekezdés** | 1. cikk | **a két gyógytornász** | Ez a bekezdés az én szövegem, nem forrásolt klinikai állítás, hanem útbaigazítás. A mért keresési adat indokolja, de a nevük alatt jelenik meg, ezért külön jóváhagyást kér. |

---

## 6. Érintett fájlok

| Fájl | Mi változott |
|---|---|
| `docs/cikkek/1-miert-zsibbad-a-kezem.md` | B1 (elöl álló mentőhívás), B2, J1, J10, J11 (2 mondat), J14, J15, J16, M1, M11, M7; idézőjelek; mondathossz |
| `docs/cikkek/2-keztoalagut-szindroma.md` | J1, J2, J3, J4, B2, B3, J16, M1, M2, M3, M8; idézőjelek; mondathossz |
| `docs/cikkek/3-teniszkonyok.md` | J5, J6, J14, B2 elve, B3, J16, M4, M5 (a vezetői jelzés pontosítása), M11, M7; mondathossz |
| `docs/cikkek/4-pattano-ujj.md` | **B1** (elöl álló mentőhívás + 112 a Kanavel-résznél + stroke-sor), B2 elve, B3, J7, J8, J9 (jelzés), J12, J16, M8, M12, M7; új VZ1 forrássor; mondathossz |
| `docs/cikkek/5-csuklo-es-kezfajdalom.md` | B2 elve, B3, J9 (jelzés), J11, J12, J16; mondathossz |
| `docs/cikkek/6-csuklotores-utani-gyogytorna.md` | **B4** (két helyen), B3, J11, J13 (két helyen), M9, M10; új VZ1 forrássor és öntesztsorok; mondathossz |
| `docs/cikkek-tenyellenorzes.md` | csak a státusz jelölése, a megállapítások érintetlenül |
| `docs/cikkek-javitas-naplo.md` | ez a fájl (új) |

Kódot nem érintettem. A `src/**` fájlokat **csak olvastam** (a termékleírás és
a szerzői adatok ellenőrzéséhez).

---

## 7. Zárás

A cikkek a javítás után is **lektorálandó vázlatok**. Mind a hat fájl első
sorában és a H1 alatt is ott a jelzés, a `status` és a `_status` mező `draft`.

Ez a kör azt érte el, hogy a lektoráló gyógytornászok elé olyan szöveg kerüljön,
amelyben minden állítás mögött ott az eredeti forrás, a saját érdek ellen szóló
részletek is ki vannak írva, és ami nem igazolható, az nem szerepel benne.

A szakmai jóváhagyás továbbra is Kocsis Kata és Kiss Kata dolga. Nélküle egyik
cikk sem publikálható.
