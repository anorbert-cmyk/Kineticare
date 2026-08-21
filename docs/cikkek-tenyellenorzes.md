# Cikkek tényellenőrzése: adversariális forrásaudit

> **Mi ez?** A `docs/cikkek/` alatt elkészült hat Tudástár-cikk szkeptikus, ellenséges
> szemléletű tény- és forrásellenőrzése. A cél nem a dicséret, hanem a bizonyíthatatlan
> állítás megtalálása. A két gyógytornász szakmai renoméja a tét.
>
> **Készült:** 2026-08-21. **Ellenőrizte:** tényellenőrző ügynök, a vezető felülvizsgálatára.
>
> **Módszer.** Nem a `docs/orvosi-forrasbazis.md` összefoglalóit fogadtam el, és nem a
> cikkírók öntesztjeit. Minden számot és minősítést az EREDETI forrásból olvastam vissza:
> a 20 lektorált közleményt a PubMed hivatalos E-utilities felületéről (teljes absztrakt),
> a Graf 2023 teljes szövegét a PMC XML-ből, az öt NHS-oldalt és az öt AAOS OrthoInfo-oldalt
> letöltve és szövegre bontva, az AAOS 2024-es kéztőalagút-irányelvét (72 oldal) és az
> AAOS/ASSH 2020-as distalis radius irányelvét (38 oldal) PDF-ből kivonatolva, a NICE NG38
> ajánlás-fejezetét az élő oldalról. A termék- és szerzői állításokat a repó forráskódjából
> (`src/scripts/restore-legacy-content.ts`, `src/lib/home-seed.ts`) és a repó
> dokumentumaiból ellenőriztem.
>
> **Alapértelmezés.** Ha egy állításban bizonytalan maradtam, azt PROBLÉMÁS-ként jelentem.
> Inkább jelentek feleslegesen, mint hogy átengedjek egy megalapozatlan orvosi állítást.

---

## 0/A. ÁLLAPOT a javítási kör után (2026-08-21)

> **Ez a szakasz csak a státuszt vezeti át. A fenti megállapítások szövege
> változatlan: sem törölve, sem gyengítve nincsenek.** A tételes átvezetés
> (mit, hol, mire, milyen forrásra hivatkozva) a `docs/cikkek-javitas-naplo.md`
> fájlban áll. A cikkek **továbbra is lektorálásra váró munkaanyagok**: a
> javítás nem helyettesíti Kocsis Kata és Kiss Kata szakmai jóváhagyását.

| Tétel | Állapot | Egy mondatban |
|---|---|---|
| **B1** | **LEZÁRVA** | A 4. cikk elejére új „Előbb ezt: mikor kell azonnal mentőt hívni?” szakasz került (Kanavel-jelek + 112 + sürgősségi osztály + stroke-sor), és a 112 a cikk végi szakaszban is kimondva. Az 1. cikkben a mentőhívási szint ELŐRE került, a mért `bal kéz zsibbadás hányinger` keresési alak miatt. |
| **B2** | **LEZÁRVA** | A kurzus saját ellenjavallata (`restore-legacy-content.ts`, `kezrehabLongDescription`) bekerült az 1. és a 2. cikk CTA-szakaszába, és az egységesség miatt a 3., 4., 5. cikkébe is. |
| **B3** | **A KOCKÁZATOS ÁLLÍTÁS ELTÁVOLÍTVA, TULAJDONOSI DÖNTÉSRE VÁR** | Az SZTK-A-33553/2024 szám és a 12 kreditpont mind az öt cikkből KIKERÜLT. Helyette a repóból tételesen igazolható alak áll: „A ProBody Stúdió sportrehabilitációs tréner képzésén a … tantermi kurzus instruktorai vagyunk (2024, 2025, 2026, Budapest)” (`restore-legacy-content.ts` 907. sor). **Teendő: a tulajdonos vagy a két gyógytornász igazolja a 2026-os érvényességet; ha megvan, a szám visszatehető. Ha nem, a `/rolunk` és a `/szolgaltatasok` oldalt is át kell nézni (E17).** |
| **B4** | **LEZÁRVA** | A 6. cikkbe két helyre bekerült az irányelv teljes állítása: hét bevont vizsgálat (egy magas, hat közepes), az egyetlen magas minőségű a felügyelt terápia javára hat hétnél és hat hónapnál, egy közepes szintén a harmadik héten, egy az önálló gyakorlást hozta ki jobbnak, négy nem talált különbséget. A RATIONALE a PDF 20. oldaláról visszaolvasva. |
| **J1** | LEZÁRVA (1. és 2. cikk) | A Cochrane-következtetés fejmondata mindkét cikkben elöl áll. |
| **J2** | LEZÁRVA | „hat kockázati tényező”; az NHS-oldal letöltve, a lista megszámolva. |
| **J3** | LEZÁRVA | „egyetlen, 111 fős vizsgálatból, közepes bizonyossággal”. |
| **J4** | LEZÁRVA | A „drágább is volt” mondat kikerült; a nullát tartalmazó CI és a közlemény óvatosabb következtetése áll ott. |
| **J5** | LEZÁRVA | „a különbség nem volt statisztikailag jelentős”, plusz a szerzők „relative gain is small” zárógondolata. |
| **J6** | LEZÁRVA | Bekerült: „a műtét után nem ritka az erővesztés”. |
| **J7** | LEZÁRVA | A 4. cikk kimondja, hogy a két áttekintés nem ért egyet a sín típusáról, és hogy a kérdés nincs eldöntve. |
| **J8** | LEZÁRVA | Hatókör-jelzés: a vizsgálat kizárta a pattanó hüvelykujjat, a 4-es fokozatot és a kettőnél több érintett ujjat; a sín éjszakai nyújtósín volt. |
| **J9** | **NYITVA, indoklással** | A négy Kanavel-jel BENNE MARAD (kivétele biztonsági visszalépés lenne). Ellenőrizve: egyik közleménynek sincs szabadon hozzáférhető teljes szövege. **A forrásbázis gazdájára tartozik**, hogy tételesen felsoroló forrást emeljen az 1.2 táblázatba. A 4. cikk jelzése kiegészítve, és ugyanez a jelzés bekerült az 5. cikkbe is. |
| **J10** | **RÉSZBEN LEZÁRVA** | Az állítás a Graf 2023 teljes szövegéből (PMC10382899) visszaigazolva, a cikk hivatkozása pontosítva, a PMC-cím bekerült a forrásjegyzékbe. **A forrásbázis 3. szakaszának bővítése a fájl gazdájára tartozik.** |
| **J11** | LEZÁRVA | A négy praxis-mondatból három helyzetleírásra cserélve, egy pontosítva. **Ha a két gyógytornász vállalja őket szó szerint, bármelyik visszatehető.** |
| **J12** | LEZÁRVA a törzsben | A `/blog/de-quervain-szindroma` törzsbe ágyazott linkje a 4. és 5. cikkből kikerült, a `relatedPosts` marad. **A megjelenési sorrend vezetői döntés.** |
| **J13** | LEZÁRVA | A 6. cikkbe bekerült az AAOS „can last forever” fenntartása és a NICE NG38 1.6.10 második fele (maradandó hatás az életminőségre). |
| **J14** | LEZÁRVA | „csomó” az 1. cikkben és két helyen a 3. cikkben; az NHS „a lump on your wrist” mondata visszaolvasva. |
| **J15** | LEZÁRVA | „egyetlen olyan randomizált vizsgálatot, amely a sínt kontrollcsoporthoz hasonlította”, plusz a további RCT és a „kezeléstől vagy az időtől?” kérdés. |
| **J16** | LEZÁRVA a cikkek oldalán | Mind az öt SOS Kézrelax-link mellett ott a pontosítás: a bemutatott tesztek tájékozódásra valók, a diagnózist orvosi vizsgálat adja. **A termékszöveg pontosítása továbbra is tulajdonosi döntés.** |
| **M1** | átvezetve | Az AAOS „Limited (Downgraded)” ajánláserőssége és a leminősítés indoklása bekerült az 1. és a 2. cikkbe. |
| **M2, M3** | átvezetve | A 2. cikkbe bekerült a Cochrane 2024 fejmondata, a mellékhatás-arányok (61% vs 41%, nagyon alacsony bizonyosság) és az NHS „Surgery usually cures CTS” mondata. |
| **M4** | átvezetve | A 3. cikkbe bekerült az AAOS szteroid-fenntartása („very sparingly”). |
| **M5** | átvezetve | A 3. cikk vezetői jelzése pontosítva: az AAOS-oldal kapcsolódó anyagai között ott a golfer's elbow, de a szövegtörzs nem tárgyalja, ezért a tartalmi döntés áll. |
| **M7** | átvezetve a cikkekben | Az orthoinfo-címek a kanonikus, `/en/` nélküli alakra egységesítve. A forrásbázis 12.2 táblázata más gazdához tartozik. |
| **M8** | átvezetve | Mind a hat cikk H1-e azonos, ponttal; kvirtmínusz a cikkek törzsében 0. |
| **M9, M10** | átvezetve | A 6. cikkben a gipsz alatti jelek szintje kiírva (sürgős tanács, nem mentőhívás), és bekerült a stroke-sor is, a többi öt cikkel egységesen. |
| **M11** | átvezetve | Az erősen vérző seb bekerült az 1. és a 3. cikk mentőhívós listájába. |
| **M12** | átvezetve | A 4. cikk otthoni szakasza élesítve: az NHS öngyógyító listája csak terhelés-csökkentés és fájdalomcsillapító, a sínezés a háziorvosi vagy szakorvosi kezelések között van. |
| **M6** | NYITVA | Az NHS `/symptoms/` útvonalra költözése a forrásbázis 12.2 táblázatának gazdájára tartozik. |

**Nyitva maradt, döntést igénylő tételek:** B3 (tulajdonos), J9 és J10 (a
forrásbázis gazdája), J11 (a két gyógytornász), J12 (megjelenési sorrend),
J16 termékszöveg-fele (tulajdonos), M6 (forrásbázis). Ezek a 6. szakaszban
felsorolt nyitott kérdésekkel egyeznek.

---

## 0. Összefoglaló a vezetőnek

**A hat cikk számszerű pontossága kiemelkedő.** Több mint 80 számot, arányt,
konfidencia-intervallumot és bizonyítékminősítést ellenőriztem egyesével az eredeti
forrásokból. **Egyetlen elrontott számot sem találtam.** Ez nem szokásos, és a
cikkírók munkáját dicséri.

**Gyógyulás-ígéretet nem találtam.** Sem gyógyulási arányt, sem gyógyulási időt, sem
diagnózist nem állít sajátként egyik cikk sem. A tiltott források (NICE CKS,
egeszsegvonal.gov.hu, kezsebeszet.hu, blogok) egyike sem szerepel hivatkozásként.
Mind a 48 külső hivatkozás él (HTTP 200, illetve a PubMed-címeknél 203).

**A hibák nem a számokban vannak, hanem a KIHAGYÁSOKBAN és a HÁZON BELÜLI
ellentmondásokban.** Négy blokkoló tételt találtam. Ezek közül kettő biztonsági
(hiányzó mentőhívási szint, a kurzus saját ellenjavallatával szembemenő ajánlás),
egy hitelesítési (nem ellenőrzött akkreditációs szám), egy pedig szelektív
forrásolvasat pont abban a pontban, amely a termék legfontosabb szakmai érve.

| Súly | Darab | Természet |
|---|---|---|
| **BLOKKOLÓ** | 4 | Megjelenés előtt kötelezően javítandó |
| **JAVÍTANDÓ** | 16 | Pontatlan, féloldalas vagy nem forrásbázisból való |
| **MEGJEGYZÉS** | 12 | Nem hiba, de a lektorálónak érdemes látnia |

---

## 1. BLOKKOLÓ tételek

### B1. A 4. cikkben (pattanó ujj) nincs mentőhívási szint, és a 112 sem szerepel

> **ÁLLAPOT (2026-08-21): LEZÁRVA.** A 4. cikk elejére új mentőhívási szakasz került (112 + sürgősségi osztály + stroke-sor), és a 112 a cikk végi szakaszban is kimondva. Az 1. cikkben a figyelmeztetés ELŐRE került. Részletek: `docs/cikkek-javitas-naplo.md` B1.

**Fájl:** `docs/cikkek/4-pattano-ujj.md`

**Mit mértem.** A cikk egyetlen karaktert sem tartalmaz a `112`, a `mentő` és a
`stroke` szavakból (`grep -c`, mind a három 0). Összehasonlításul: az 1. cikkben
ötször, a 3. és 5. cikkben egyszer-kétszer szerepel a 112.

**Miért baj.** Ugyanez a cikk írja le a gennyes ínhüvelygyulladást, és mellé teszi,
hogy a lehetséges következmények között „a merevség és az amputáció is szerepel”
(Hyatt és Bagg, 2017). A Langer és mtsai 2021 absztraktja, amit a cikk idéz,
szó szerint ezt mondja: *„If the typical cardinal signs of PFT according to Kanavel
exist, the indication for surgery should be made immediately.”* A cikk erre adott
legerősebb utasítása: **„Kérj sürgős orvosi ellátást”**. Se szám, se útvonal.
Egy amputációval fenyegető fertőzésnél ez kevés.

Ráadásul a `docs/orvosi-forrasbazis.md` 1. szakasza kimondja: *„Vörös zászlók: ez
minden cikkbe kötelezően bekerül”*, és az 1.1 pont címe „Azonnal mentőt kell hívni”.
A 3. cikk írója ezt fel is ismerte, és a vezetőnek szóló 4. jelzésében meg is
indokolta, miért emelte be a stroke-sort egy könyök-cikkbe. A 4. cikkben ez elmaradt.

**Konkrét javítás.**
1. A „Mikor fordulj azonnal orvoshoz?” szakaszban a Kanavel-bekezdés után kerüljön be:
   *„Ez nem várhat másnapig. Hívd a 112-t, vagy menj a legközelebbi sürgősségi
   osztályra.”*
2. Kerüljön be a forrásbázis 1.1 pontjának stroke-sora, ugyanúgy rövid bekezdésként,
   ahogy a 3. cikk megoldotta.

---

### B2. Az 1. és a 2. cikk olyan olvasónak ajánlja a kurzust, akit a kurzus SAJÁT ellenjavallata kizár

> **ÁLLAPOT (2026-08-21): LEZÁRVA.** A kurzus saját ellenjavallata bekerült az 1. és a 2. cikkbe, és az egységesség miatt a 3., 4., 5. cikkbe is. Részletek: `docs/cikkek-javitas-naplo.md` B2.

**Fájlok:** `docs/cikkek/1-miert-zsibbad-a-kezem.md`, `docs/cikkek/2-keztoalagut-szindroma.md`

**Mit mértem.** Az Otthoni KézRehab Program saját termékleírása
(`src/scripts/restore-legacy-content.ts`, `kezrehabLongDescription`, 1811-1818. sor,
„Nem javasoljuk a programot, ha…”) betűhíven ezt tartalmazza:

> - „már jelentkezett **érzéskiesés**, vagy régebb óta tart, észlelhető, jelentős
>   **gyengülés a szorítóerőben**, esetleg látható izomtömeg-vesztés a tenyéren,”
> - „már **műtétre vársz**, esetleg onkológiai kezelés alatt állsz, vagy folyamatban
>   lévő orvosi kezelésben részesülsz”

**Miért baj.** Az 1. cikk teljes témája a zsibbadás és az érzéskiesés. A 2. cikk
kimondja, hogy a kéztőalagút-szindróma tünete a „gyenge hüvelykujj vagy nehéz
markolás”, és hogy „elejted a tárgyakat”. Mindkét cikk címzettje tehát pontosan az a
kör, amelyet a termék saját oldala kizár. Egyik cikk sem mondja ezt ki a
CTA-szakaszban.

Ez nem elméleti kockázat: a vevő elolvassa a cikket, megveszi a programot, aztán a
kurzusoldalon szembejön vele, hogy ő nem is való rá. A 6. cikk pontosan ezt oldotta
meg jól, a traumás sérülésre vonatkozó ellenjavallattal, és a vezetőnek szóló 1.
jelzésében ki is emelte, hogy ez a legfontosabb jelzése.

**Konkrét javítás.** Az 1. cikk „Hogyan tovább…” és a 2. cikk „Mit ad ehhez egy
vezetett otthoni program?” szakaszába kerüljön be a 6. cikk mintája szerint:

> Egy dolgot vásárlás előtt tudnod kell. A program leírásában szerepel, hogy nem
> javasoljuk, ha már jelentkezett érzéskiesés, ha régebb óta tart jelentős gyengülés
> a szorítóerődben, vagy ha műtétre vársz. Ilyenkor előbb a kivizsgálás következik.

---

### B3. Az akkreditációs szám 2026-os érvényessége a repóban NYITOTT kérdés, mégis öt cikk jelen idejű hitelesítő adatként közli

> **ÁLLAPOT (2026-08-21): A SZÁM ELTÁVOLÍTVA, TULAJDONOSI DÖNTÉSRE VÁR.** Az SZTK-A-33553/2024 és a 12 kreditpont mind az öt cikkből kikerült; helyette a `restore-legacy-content.ts` 907. sorából igazolható instruktori szerep áll. A megállapítás érvényben marad, amíg a tulajdonos nem igazolja a 2026-os érvényességet. Részletek: `docs/cikkek-javitas-naplo.md` B3.

**Fájlok:** 2., 3., 4., 5. és 6. cikk, mindegyik „Kik írták ezt a cikket?” szakasza.

**Mit mértem.** Mind az öt cikk ezt írja: *„A »Bevezetés a kéz, a csukló- és
könyökízület rehabilitációs lehetőségeibe« akkreditált tantermi képzés instruktorai
vagyunk, 12 kreditpont, SZTK-A-33553/2024.”*

A repó saját leltára viszont ezt a tételt NYITOTT kérdésként tartja nyilván:

- `docs/tartalom-leltar-regi-oldal.md` 650. sor, **E17**: *„SZTK-A-33553/2024
  akkreditációs szám … 2024-es akkreditáció. **Ellenőrizni kell, 2026-ban is
  érvényes-e** — lejárt akkreditációra hivatkozni nem szabad.”*
- Ugyanott 663. sor, **Ny6**: *„Az akkreditáció (SZTK-A-33553/2024, 12 kredit)
  érvényes 2026-ban?”*

**Miért baj.** Ez az egyetlen olyan állítás a hat cikkben, amely közvetlenül a két
gyógytornász hitelességéről szól, és a repó maga jelöli meg ellenőrizetlenként.
Lejárt akkreditációra hivatkozni ötször, öt cikk alján, a szerzői doboznak abban a
pontjában, amely a szakmai hitelt hivatott igazolni, pontosan az a hiba, ami a
renomét viszi.

Amit ellenőrizni tudtam: a `docs/tudastar-hangnem-es-technika.md` 214. sora és a
`src/scripts/restore-legacy-content.ts` 907. sora szerint az instruktori szerep
2024, 2025 és 2026 évekre szól. Magának az akkreditációs számnak a 2026-os
érvényességéről a repóban nincs bizonyíték, és külső forrásból sem tudtam
visszaigazolni.

**Konkrét javítás.** Megjelenés előtt a tulajdonos vagy a két gyógytornász erősítse
meg a szám 2026-os érvényességét. Ha nem igazolható, a szám kerüljön ki, és maradjon
az akkreditált képzés ténye szám nélkül. A szerzői egyéb adatokat (Kate Thorn CHT,
Loren Szmiga CHT, Daphne Xuan MPT kurzusok, 2024) a repóból tételesen visszaigazoltam,
azok rendben vannak (`src/scripts/restore-legacy-content.ts` 861-868. sor).

---

### B4. A 6. cikk kihagyja, hogy az AAOS/ASSH irányelv EGYETLEN magas minőségű vizsgálata a FELÜGYELT terápia javára szólt

> **ÁLLAPOT (2026-08-21): LEZÁRVA.** A 6. cikkbe két helyre bekerült az irányelv teljes állítása, a hét bevont vizsgálat tételes bontásával (a RATIONALE a PDF 20. oldaláról visszaolvasva). Részletek: `docs/cikkek-javitas-naplo.md` B4.

**Fájl:** `docs/cikkek/6-csuklotores-utani-gyogytorna.md`, „Otthoni gyakorlás vagy
felügyelt gyógytorna?” szakasz.

**Mit mértem.** A cikk helyesen idézi az ajánlást és a „Limited” minősítést. Az
irányelv PDF-jének 20. oldalán viszont ott áll a RATIONALE, amit a cikk nem említ:

> „Current evidence is insufficient to answer the question… **One high (Gutierrez
> Espinoza et al, 2017) and six moderate quality studies** … were included and
> appraised. **One found a benefit to supervised therapy** 3 weeks after injury or
> surgery (Oken et al. 2011), **and one (Gutierrez Espinoza et al, 2017) at 6 weeks
> and at 6 months.** In contrast, one study (Krischak et al, 2009) favored independent
> exercises at 6 weeks, and 4 found no difference.”

**Miért baj.** A hét bevont vizsgálatból egyetlen volt magas minőségű, és **az a
felügyelt terápia javára döntött, két időpontban is.** A cikk ezt az ajánlást a
`docs/orvosi-forrasbazis.md` szerint is „a Kineticare üzenetének legjobban
forrásolható pontja”-ként használja. Pont ott, ahol a saját érdek a legerősebb,
kimarad a saját érdekkel szembemenő részlet. Ez a szelektív olvasat mintája, és
egy lektoráló gyógytornász azonnal észreveszi.

A cikk egyébként helyesen idézi az irányelv másik két mondatát, azokat betűhíven
visszaigazoltam: *„A rule prohibiting supervised therapy after distal radius
fractures might limit access for a subset of people who stand to benefit”* és
*„We might conclude that—to date—routine supervised hand therapy does not seem to
provide a benefit on average.”*

**Konkrét javítás.** A Cochrane-bekezdés elé kerüljön be egy mondat:

> Az irányelvbe hét vizsgálat került be. Ezek közül egy volt magas minőségű, és az a
> felügyelt terápia javára döntött hat hétnél és hat hónapnál is. Egy másik az
> önálló gyakorlást hozta ki jobbnak, négy pedig nem talált különbséget.
> *(AAOS és ASSH irányelv, 2020)*

---

## 2. JAVÍTANDÓ tételek

### J1. A Cochrane sín-áttekintés zárókövetkeztetésének ELSŐ mondata kimarad (1. és 2. cikk)

> **ÁLLAPOT: LEZÁRVA** mindkét cikkben (a fejmondat elöl áll).

Az 1. és a 2. cikk is a kedvező zárómondattal érvel, a 2. cikk így vezeti fel:
*„A szerzők zárómondata a legfontosabb.”* A Cochrane 2023 (PMID 36848651)
AUTHORS' CONCLUSIONS szakasza viszont ezzel **kezdődik**:

> „There is insufficient evidence to conclude whether splinting benefits people with CTS.”

Ez a fejmondat, a kedvező rész csak utána jön. Az idézett mondat („As splinting is a
relatively inexpensive intervention…”) betűhíven pontos, de önmagában a
következtetés második feléből származik. **Javítás:** mindkét cikkben szerepeljen a
nyitó mondat is, mielőtt a kedvező rész jön. A forrásbázis 2.2/a pontja is csak a
kedvező felét idézi, ott is pótolni kell.

### J2. „Az NHS HÉT kockázati tényezőt nevez meg”, de az NHS-oldalon HAT pont van (2. cikk)

> **ÁLLAPOT: LEZÁRVA** („hat kockázati tényező”; az NHS-oldal letöltve, a lista megszámolva).

Az `nhs.uk/conditions/carpal-tunnel-syndrome/` oldal „You're more at risk of CTS if
you:” listája hat pontból áll. Az „arthritis or diabetes” egyetlen felsorolási elem,
a cikk kettőnek számolja. A tartalom így is pontos, a **szám** hibás.
**Javítás:** „hat” vagy a szám elhagyása. A forrásbázis 2.1 pontja is így bontja,
ott is érdemes jelezni.

### J3. Az RR 0,84 egyetlen, 111 fős vizsgálatból származik, ez nincs kiírva (2. cikk)

> **ÁLLAPOT: LEZÁRVA** („egyetlen, 111 fős vizsgálatból, közepes bizonyossággal”).

Ashworth 2023 (PMID 36722795): *„The requirement for surgery probably reduces slightly
in the LCI group at one year (risk ratio 0.84, 95% CI 0.72 to 0.98; **1 RCT, 111
participants**, moderate-certainty evidence).”* A cikk az RR-t és a CI-t pontosan adja,
a mintaméretet nem. Ugyanez a cikk máshol viszont kiírja („egyetlen, 80 fős
vizsgálatból”), tehát a mérce megvan, csak itt nem alkalmazza.

### J4. „Az injekció ráadásul drágább is volt”, pedig a különbség nem szignifikáns (2. cikk)

> **ÁLLAPOT: LEZÁRVA** (a „drágább is volt” mondat kikerült; a nullát tartalmazó CI és a közlemény saját következtetése áll ott).

Burton 2023 (PMID 35394019): *„CSI was more costly [mean difference £68.59
(95% CI: -120.84, 291.24)]”*. A megbízhatósági tartomány tehát a nullát is tartalmazza.
A közlemény saját megfogalmazása óvatosabb: *„initial treatment with CSI may not be
cost-effective in the long-term compared with NS.”*
**Javítás:** „Az injekció hosszú távon a vizsgálat szerint valószínűleg nem
költséghatékonyabb a sínnél.”

### J5. A Smidt-féle 91% és 83% mellől hiányzik, hogy a különbség NEM szignifikáns (3. cikk)

> **ÁLLAPOT: LEZÁRVA** (a „nem szignifikáns” minősítés és a szerzők zárógondolata is bekerült).

Smidt 2002 (PMID 11879861) FINDINGS: *„Physiotherapy had better results than a
wait-and-see policy, **but differences were not significant**.”* Az INTERPRETATION
pedig: *„…since the relative gain of physiotherapy is small.”* A cikk a 91%-ot és a
83%-ot egymás mellé teszi, mindkét minősítés nélkül. A számok betűhíven pontosak, a
kontextus hiányzik. **Javítás:** egy mondat a szám után: „A gyógytorna és a várakozás
közötti különbség ebben a vizsgálatban nem volt statisztikailag jelentős.”

### J6. A 80-90%-os műtéti sikerarány mellől kimarad az AAOS saját fenntartása (3. cikk)

> **ÁLLAPOT: LEZÁRVA** (bekerült: „a műtét után nem ritka az erővesztés”).

AAOS OrthoInfo, Tennis Elbow: *„Tennis elbow surgery is considered successful in 80 to
90% of patients. **However, it is not uncommon to experience a loss of strength.**”*
A cikk a százalékot adja, a második mondatot nem. **Javítás:** a fenntartás kerüljön be.

### J7. A sín-típusról két forrás mást mond, a cikk csak az egyiket hozza (4. cikk)

> **ÁLLAPOT: LEZÁRVA** (a 4. cikk kimondja, hogy a két forrás nem ért egyet, és hogy a kérdés nincs eldöntve).

- McKenna 2026 (PMID 41362294): a PIP-ízületet rögzítő sín jobban teljesített az
  MCP-nél, és a szerzők ezt ajánlják.
- Lunsford 2019 (PMID 29290504) viszont: *„**All authors reported similar results
  regardless of the joint immobilized**; therefore … we recommend a sole joint be
  immobilized for 6-10 weeks.”*

A cikk mindkét forrást használja, de a McKenna-féle fölényt eldöntött kérdésként
adja elő. A forrásbázis 6. szakasza a De Quervainnél megmutatja a helyes mintát:
kimondani, hogy a források nem értenek egyet. **Javítás:** ugyanez a minta ide is.

### J8. A 68,9%-os és a fokozat szerinti számok forrása KIZÁRTA a pattanó hüvelykujjat (4. cikk)

> **ÁLLAPOT: LEZÁRVA** (hatókör-jelzés a számok mellé, az éjszakai sín tényével együtt).

Minkhorst 2025 (PMID 40449569), Exclusion criteria: *„previous treatment with either a
splint or cortisone injection, **trigger thumb**, >2 digits involved, grade 4 trigger,
or an allergy to cortisone”*. A vizsgálat sínje ezen felül **éjszakai** nyújtósín volt
(„nighttime extension orthosis”), nem napi 24 órás.

A cikk pár bekezdéssel korábban ezt írja: „A pattanó hüvelykujj tehát nem ritka”,
majd a 68,9%-ot, a 75%-ot, a 60%-ot és a 39,1% vs 22,4% arányt hatókör-jelzés nélkül
közli. **Javítás:** egy mondat a számok mellé: „Ebbe a vizsgálatba nem került be a
pattanó hüvelykujj, a legsúlyosabb, 4-es fokozat és a kettőnél több érintett ujj.”

### J9. A Kanavel-féle négy jel felsorolására a hivatkozott absztraktok nem adnak fedezetet (4. és 5. cikk)

> **ÁLLAPOT: NYITVA, indoklással.** A négy jel BENNE MARAD, mert kivétele biztonsági visszalépés lenne. Ellenőrizve: egyik közleménynek sincs szabadon hozzáférhető teljes szövege. A tételesen felsoroló forrás beemelése az 1.2 táblázatba a forrásbázis gazdájára tartozik. A 4. cikk jelzése kiegészítve, és ugyanez a jelzés bekerült az 5. cikkbe is.

Sem a Hyatt és Bagg 2017 (PMID 28336044), sem a Langer 2021 (PMID 34134159)
absztraktja nem sorolja fel a négy jelet, csak névvel hivatkozik rájuk
(„Kanavel's four cardinal signs”). A cikkekben szereplő felsorolás (duzzadt ujj,
félig behajlított tartás, nyújtásra erős fájdalom, nyomásérzékenység az ínhüvely
mentén) szakmailag helyes, de az idézett, szabadon hozzáférhető szövegből nem
igazolható.

A 4. cikk ezt maga is felismerte, és nyitott forrás-kérdésként jelezte a
lektorálóknak, javasolva a StatPearls „Pyogenic Flexor Tenosynovitis” fejezetet
(NCBI Bookshelf, NBK576414). **Az 5. cikk viszont ugyanezt a felsorolást
figyelmeztetés nélkül közli.** Javítás: a forrásbázis 1.2 táblázatába kerüljön be egy
tételesen felsoroló forrás, és utána mindkét cikk arra hivatkozzon.

### J10. A gyűrűs- és kisujj-mintázat állítása nem a forrásbázisból való (1. cikk)

> **ÁLLAPOT: RÉSZBEN LEZÁRVA.** Az állítás a Graf 2023 teljes szövegéből (PMC10382899) visszaigazolva, a cikk hivatkozása pontosítva, a PMC-cím a forrásjegyzékben. A forrásbázis 3. szakaszának bővítése a fájl gazdájára tartozik.

A cikk: *„A könyöknél becsípődő singideg **leggyakoribb tünete** éppen ez: időszakos
zsibbadás és bizsergés a gyűrűs- és a kisujjban. (Graf és mtsai, 2023)”*

A `docs/orvosi-forrasbazis.md` 3. szakasza a Graf 2023-tól **csak** azt tartalmazza,
hogy ez a felső végtag második leggyakoribb perifériás idegbecsípődése. A tünet-állítás
nincs benne, tehát a forrásbázis 0.2/1. tilalma sérül („Ami nincs benne ebben a
fájlban, azt nem írod le klinikai állításként”).

**Az állítás maga viszont IGAZ.** Lehívtam a Graf 2023 teljes szövegét a PMC-ből
(PMC10382899), és betűhíven ott áll: *„The most common signs and symptoms of CuTS are
intermittent numbness and tingling in the ulnar ring and small fingers.”*
**Javítás:** a mondat kerüljön be a forrásbázis 3. szakaszába, és utána maradhat a
cikkben. Eljárási hiba, nem tartalmi.

### J11. Kitalált elsőszemélyű praxis-állítások három cikkben (1., 5., 6. cikk)

> **ÁLLAPOT: LEZÁRVA.** Három mondat helyzetleírásra cserélve, egy pontosítva. Ha a két gyógytornász vállalja őket szó szerint, bármelyik visszatehető.

A 3. cikk vezetőnek szóló 6. jelzése mondja ki a helyes szabályt: *„Praxis-tapasztalatot
nem írtunk a cikkbe. … Ilyen mondatot nem találtunk ki: azt csak a két gyógytornász
mondhatja ki a sajátjaként.”* A többi cikk ezt nem tartotta be:

| Fájl | Sor | Mondat |
|---|---|---|
| 1. cikk | 80 | „A kéz zsibbadás az egyik leggyakoribb panasz, amivel a praxisunkban találkozunk. Sokan hónapokig várnak vele, mert nem fáj eléggé.” |
| 1. cikk | 396 | „Azt látjuk, hogy a legtöbben nem a kitartással vannak bajban.” |
| 5. cikk | 270 | „Gyógytornászként ilyenkor azt nézzük meg, milyen terhelés éri a kezed…” |
| 6. cikk | 178 | „A praxisunkban azt látjuk, hogy sokan program nélkül kezdenek neki otthon.” |

Az 1. és az 5. cikk öntesztje jelzi ezeket nem klinikai állításként. **A 6. cikké nem**:
a 178. sor mondata sehol nem szerepel a nem klinikai állítások listájában.

Ezek a saját nevük alatt megjelenő, a saját praxisukról szóló kijelentések, amiket a
két gyógytornász soha nem mondott ki. **Javítás:** vagy a lektorálás során ők maguk
hagyják jóvá szó szerint, vagy a mondatok helyzetleírásra cserélendők, a 3. cikk
mintája szerint.

### J12. Négy belső link olyan cikkre mutat, ami ebben a hullámban nem jelenik meg

> **ÁLLAPOT: LEZÁRVA a törzsben.** A `/blog/de-quervain-szindroma` törzsbe ágyazott linkje a 4. és 5. cikkből kikerült, a `relatedPosts` marad. A megjelenési sorrend vezetői döntés.

`/blog/de-quervain-szindroma` négyszer szerepel a törzsszövegben (2., 4. és 5. cikk),
és a 2., 4., 5. cikk `relatedPosts` mezőjében is. A `docs/tudastar-tartalmi-terv.md`
181. és 187. sora szerint ez a C9 cikk, `publishedAt` 2026-09-09. A rá mutató cikkek
09-02, 09-04 és 09-05 dátummal jelennek meg, tehát **négytől hét napig 404-re
mutatnak.**

**Javítás:** vagy a C9 is elkészül és egyszerre jelenik meg, vagy a linkek első
körben kimaradnak. A `relatedPosts` hivatkozás önmagában nem baj (a CMS kihagyja a
nem létező rekordot), a törzsszövegbe ágyazott link viszont igen.

### J13. A 6. cikk csak a javuló idővonalat adja, a maradandó panasz lehetőségét nem

> **ÁLLAPOT: LEZÁRVA** (az AAOS „can last forever” fenntartása és a NICE NG38 1.6.10 második fele is bekerült).

Az AAOS OrthoInfo distalis radius oldala ezt is tartalmazza:
*„Some people can also have mild stiffness or aching for 2 years or longer. **In some
cases, the stiffness and aching can last forever.** This is more common after severe
injuries…, in people over age 50, or in people with osteoarthritis.”*

A cikk a „legalább két évig tovább javul” mondatot hozza, a maradandóságot nem.
Ugyanígy a NICE NG38 1.6.10 idézett pontjából kimarad a második fele: *„…and the
likelihood of any permanent effects on quality of life (such as pain, loss of function
or psychological effects)”*.

Egy frissen levett gipsz után álló olvasónak a kizárólag javuló idővonal hamis
elvárást ad. **Javítás:** a „Türelem” pontnál kerüljön be az AAOS fenntartása.

### J14. „Duzzanat” szerepel ott, ahol az NHS „csomót” ír (1. és 3. cikk)

> **ÁLLAPOT: LEZÁRVA** (az 1. cikkben és két helyen a 3. cikkben „csomó”).

Az NHS wrist pain oldal sürgős listája: *„you have **a lump** on your wrist that's very
painful, hot or red”*. Az 1. és a 3. cikk „duzzanatot” ír, az 5. cikk helyesen
„csomót”. A duzzanat tágabb fogalom, mint a csomó, tehát a fordítás felfelé tolja a
sürgősségi kört. Biztonságos irányú tévedés, de pontatlan. A forrásbázis 1.2
táblázata is „duzzanatot” ír, ott is javítandó.

### J15. „Mindössze egyetlen randomizált vizsgálatot talált”, valójában kettőt (1. cikk)

> **ÁLLAPOT: LEZÁRVA** (a pontos megfogalmazás plusz a további RCT és a „kezeléstől vagy az időtől?” kérdés).

Bateman 2025 (PMID 40385935) RESULTS: *„We identified only one randomised controlled
trial (RCT), with high overall risk of bias, **that compared night splints to a control
arm of advice only**. … **One additional RCT** and three single-arm studies, all at
high/serious/critical risk of bias, suggested the majority of patients with
mild/moderate CuTS improve with night splinting **but it is unclear whether the effect
was due to treatment or time**.”*

A cikk mondata („mindössze egyetlen randomizált vizsgálatot talált”) az áttekintés
egészére vonatkozóan pontatlan, és kimarad az az adat is, hogy a betegek többsége
javult, csak nem lehet tudni, a kezeléstől-e. A „nagyon alacsony bizonyosság” és a
„nem eldönthető, ajánlható-e” minősítés viszont betűhíven pontos.
**Javítás:** „egyetlen olyan randomizált vizsgálatot talált, amely a sínt kontrollhoz
hasonlította”.

### J16. A cikkek „ne diagnosztizáld magad” mellé olyan kurzust linkelnek, ami öntesztet ígér

> **ÁLLAPOT: LEZÁRVA a cikkek oldalán.** Mind az öt link mellett ott a pontosítás. A termékszöveg pontosítása tulajdonosi döntés marad.

Az SOS Kézrelax villámkurzus saját leírása
(`src/scripts/restore-legacy-content.ts`, `kezrelaxLongDescription`, 1841. sor):

> „Honnan tudhatod, pontosan mivel van a baj? – megmutatjuk, mi hogyan teszteljük a
> különböző kórképeket; **ezeket azonnal kipróbálhatod magadon**”

Az 1., 3., 4. és 5. cikk mind idézi az NHS mondatát („ne próbáld magad megállapítani
a fájdalom okát”), és mind a négy linkeli ugyanezt a kurzust. A 2. cikk ugyanezt a
kurzust „rövid kóstolóként” ajánlja. Ez házon belüli ellentmondás.

**Javítás:** ez elsősorban a termékleírás dolga, nem a cikkeké, de a vezetőnek dönteni
kell. Vagy a kurzus szövege pontosul („megmutatjuk, mit vizsgál a gyógytornász”),
vagy a cikkek a linknél kiírják, hogy a kurzusban látott tesztek tájékozódásra
valók, nem diagnózisra. Tulajdonosi döntés.

---

## 3. MEGJEGYZÉSEK

**M1. Az AAOS 2024 „Limited (Downgraded)” minősítése nincs kiírva** (1. és 2. cikk).
A NON-OPERATIVE TREATMENTS: LONG-TERM ajánlásnál a PDF ezt írja: `Quality of Evidence:
High`, `Strength of Option: **Limited (Downgraded)**`. A cikkek a „magas minőségű
bizonyítékot” idézik, a leminősítést nem. **Ez a kihagyás a termék ELLEN dolgozik**,
tehát jóhiszemű, de a forrásbázis 0.2/3 és 0.3 pontja szerint a minősítést ki kell írni.

**M2. A Cochrane 2024 műtéti áttekintés fejmondata és a szövődményadat kimarad**
(2. cikk). Lusa 2024 (PMID 38189479) AUTHORS' CONCLUSIONS: *„Currently, the efficacy of
surgery in people with CTS is unclear.”* Ugyanitt: a mellékhatások aránya a műtéti
csoportban 61% (60/98), a sínes csoportban 41% (46/112), nagyon alacsony bizonyossággal.
Mindkettő ERŐSÍTENÉ a cikk mondanivalóját, mégis kimaradt.

**M3. „Surgery usually cures CTS”.** Az NHS kéztőalagút-oldala ezt kimondja. Sem az
1., sem a 2. cikk nem hozza. Nem hiba, de a „nem gyógyítunk meg” keretezés mellett az
őszinteséget erősítené.

**M4. Az AAOS teniszkönyök-oldalának szteroid-fenntartása kimarad** (3. cikk):
*„steroid injections should be used very sparingly for lateral epicondylitis, as
excessive use can weaken the lateral epicondyle … over time.”*

**M5. A 3. cikk vezetőnek szóló 1. jelzése pontatlan.** Azt állítja, az AAOS
teniszkönyök-oldalán „nem szerepel sem a golfer's elbow, sem a medial epicondylitis”.
Az oldal kapcsolódó cikkei között viszont ott van: *„Therapeutic Exercise Program for
Epicondylitis (Tennis Elbow / **Golfer's Elbow**)”*. A cikk tartalmi döntése (a
golfkönyök-összevetés kihagyása) így is védhető, csak az indoklás pontosítandó.

**M6. Az NHS átköltöztette a tünet-oldalakat a `/symptoms/` útvonalra.** Mérve
2026-08-21-én: `/conditions/hand-pain/wrist-pain/` → `/symptoms/hand-pain/wrist-pain/`,
`/conditions/pins-and-needles/` → `/symptoms/pins-and-needles/`,
`/conditions/hand-pain/` → `/symptoms/hand-pain/`. Mind 200-zal válaszol átirányítás
után. Csak a 6. cikk jelezte ezt, és csak a wrist-painre. A forrásbázis 12.2
táblázata is frissítendő.

**M7. Az orthoinfo-címek alakja cikkenként eltér.** Az 1., 3. és 4. cikk
`www.orthoinfo.org/**en/**diseases--conditions/…` alakot használ, az 5. és 6. cikk a
`/en/` nélkülit. Mindkettő 200-at ad, mert a `/en/` alak is átirányít a rövidebbre.
Egységesíteni kell, a kanonikus alak a `/en/` NÉLKÜLI.

**M8. A vázlat-figyelmeztetés alakja cikkenként eltér.** A 2. és a 4. cikk H1-e
kvirtmínuszt használ, az 1., 3., 5. és 6. pontot. Megmértem: **kvirtmínusz a cikkek
TÖRZSÉBEN egyikben sincs** (mind a hat találat fejléc- vagy meta-blokkban van), tehát
az L3 lint-szabály teljesül. Csak a stílus nem egységes.

**M9. A 6. cikk a gipsz alatti jeleket „azonnal orvoshoz” alá sorolja.** Az NHS ezeket
a `Get help from NHS 111` (sürgős tanács) szint alá teszi, nem a 999 alá. Felfelé
tévedés, tehát biztonságos. A cikk törzsszövege egyébként helyesen fogalmaz
(„kérj orvosi tanácsot”, „sürgősen kérj tanácsot”), csak a szakaszcím alá kerülés
tolja feljebb.

**M10. A 6. cikkben nincs stroke-sor.** A forrásbázis 1. szakasza minden cikkre
kötelezőnek mondja. Egy csuklótörés-cikkben ez védhetően kihagyható, de a 3. cikk
kifejezetten megindokolta, miért tette be. Döntsön egységesen a vezető.

**M11. A sérülés utáni mentőhívós lista négy tételes, a legtöbb cikkben három van.**
Az NHS Broken arm or wrist 999-listája: zsibbadás/bizsergés, **erősen vérző seb**,
kiálló csont, alak- vagy szögváltozás. Az 1., 2., 3. és 6. cikk a vérző sebet
kihagyja. Az 5. cikk mind a négyet hozza. Nem hiba, de az 5. cikk a helyes minta.

**M12. A 4. cikk a sínezést otthoni lehetőségként vezeti fel.** Az NHS a sínezést a
„Treatments for trigger finger” (háziorvos vagy szakorvos) alatt sorolja, az
öngyógyító lista nála csak a terhelés csökkentése és a fájdalomcsillapító. A cikk
mondata („Az NHS a sínezést a pattanó ujj kezelései között sorolja fel”) pontos, és a
cikk hozzáteszi, hogy a sín kiválasztása szakember dolga, de a H2 felütése
(„Otthon, házilag két dolog jön szóba…”) ennél megengedőbb. Élesíteni érdemes.

---

## 4. Amit tételesen VISSZAIGAZOLTAM az eredeti forrásból

Ez a lista a lektorálóknak szól: ezeket a számokat és minősítéseket egyesével
összevetettem az eredeti szöveggel, és **szó szerint egyeznek**.

### Kéztőalagút

| Állítás | Forrás | Eredmény |
|---|---|---|
| 29 vizsgálat, 1937 felnőtt | Cochrane 2023, PMID 36848651 | egyezik |
| Boston SSS 0,37 (95% CI 0,82 jobb - 0,08 rosszabb), 6 vizsgálat, 306 fő, alacsony | ugyanaz | egyezik |
| Boston FSS 0,24 (95% CI 0,44-0,03), közepes bizonyosság | ugyanaz | egyezik |
| Éjszakai sín RR 3,86 (95% CI 2,29-6,51), 1 vizsgálat, 80 fő, NNTB 2 | ugyanaz | egyezik |
| Mellékhatás 7/40 (18%) vs 0/40 | ugyanaz | egyezik |
| Műtétre küldés: bizonytalan, nagyon alacsony bizonyosság | ugyanaz | egyezik |
| Hat hónapos viselés jobb lehet a hat hetesnél, alacsony bizonyosság | ugyanaz | egyezik |
| Injekció SMD -0,77 (95% CI -0,94 - -0,59), közepes | Cochrane 2023, PMID 36722795 | egyezik |
| Hat hónapnál SMD -0,58 | ugyanaz | egyezik |
| Műtéti igény RR 0,84 (95% CI 0,72-0,98) | ugyanaz | egyezik |
| 14 vizsgálat, 994 résztvevő | ugyanaz | egyezik |
| Műtét kontra sín RR 2,10 (95% CI 1,04-4,24), közepes | Cochrane 2024, PMID 38189479 | egyezik |
| Boston SSS 0,26 (küszöb 1), FSS 0,36 (küszöb 0,7) | ugyanaz | egyezik |
| 14 vizsgálat, 1231 résztvevő, 84% nő | ugyanaz | egyezik |
| INSTINCTS 234 fő, 6 hét: 2,02 vs 2,29, MD -0,32 (95% CI -0,48 - -0,16), p=0,0001 | Lancet 2018, PMID 30343858 | egyezik |
| 24 hónap: 22% vs 16% műtét, nincs szignifikáns különbség 12 és 24 hónapnál | Rheumatology 2023, PMID 35394019 | egyezik |
| Idegsiklatás: 13 vizsgálat, 6 gyenge minőségű (PEDro 5/11 vagy kevesebb) | PMID 27842937 | egyezik |
| Billentyűzet: „Very Low”, „Consensus”, egy alacsony minőségű vizsgálat talált összefüggést | AAOS 2024 CPG, 33. o. | betűhíven egyezik |
| A 14 elemű „nem javít hosszú távon” lista (benne exercise, massage, manual therapy) | AAOS 2024 CPG, 36. o. | hiánytalanul egyezik |
| CTS-6 erős ajánlás; MRI és neurodinamikai teszt közepes; injekció erős ajánlás | AAOS 2024 CPG, 7. o. | egyezik |
| Sín akár 6 hét; magától néhány hónap, főleg terhesség; „not always a cure”; „little evidence” fájdalomcsillapítóra; „small amount of evidence” kézgyakorlatra; műtét után kb. 1 hónap | NHS CTS-oldal | mind egyezik |
| Szorító- és csippentőerő 2-3 hónap, súlyos idegkárosodásnál 6-12 hónap; teljes felépülés akár 1 év; kezeletlenül romlik, tartós károsodás | AAOS OrthoInfo CTS | mind egyezik |

### Teniszkönyök

| Állítás | Forrás | Eredmény |
|---|---|---|
| 185 beteg, legalább 6 hete tartó panasz, háziorvosi ellátás | Lancet 2002, PMID 11879861 | egyezik |
| 6 hét: 92% / 47% / 32% | ugyanaz | egyezik |
| 52 hét: 69% injekció / 91% gyógytorna / 83% várakozás | ugyanaz | egyezik |
| Hosszú távon a gyógytorna javára szignifikáns az injekcióval szemben | ugyanaz | egyezik |
| 198 résztvevő, 18-65 év, legalább hat hét | BMJ 2006, PMID 17012266 | egyezik |
| 65-ből 47 visszaesés; 52 hétnél nincs különbség; kevesebb kiegészítő kezelés | ugyanaz | egyezik |
| 30 vizsgálat, 2123 résztvevő, alacsony és nagyon alacsony bizonyosság | BJSM 2021, PMID 33148599 | egyezik |
| PFGS 12,15 (95% CI 1,69-22,6), 22,45 (95% CI 3,63-41,3), 18 (95% CI 11,17-24,84) | ugyanaz | mind a hat érték egyezik |
| 6 vizsgálat, 429 fő; VAS SMD -0,63 (95% CI -0,90 - -0,36); erő SMD 1,05 (95% CI 0,78-1,33) | J Clin Med 2021, PMID 34501416 | egyezik |
| Koncentrikushoz képest VAS SMD -0,30 (95% CI -0,58 - -0,02), erőben és funkcióban nincs különbség | ugyanaz | egyezik |
| 35-54 év; „can sometimes last over a year”; ötelemű otthoni lista; 20 perc / 2-3 óra; ibuprofén gél gyúlékony; háziorvos 2 hét; gyógytorna 6 hét; műtét 6-12 hónap; gyógytornás módszerek | NHS Tennis elbow | mind egyezik |
| ECRB, lateralis epicondylus; elhasználódás és mikroszakadás; 30-50 év; festő, vízvezeték-szerelő, asztalos; autóipari dolgozó, szakács, hentes; égő érzés, gyenge szorítóerő, éjszakai fájdalom; 80-95% és 80-90% | AAOS OrthoInfo Tennis Elbow | mind egyezik |

### Pattanó ujj

| Állítás | Forrás | Eredmény |
|---|---|---|
| 13 vizsgálat; akár 97%; napi 24 óra a leghatékonyabb; PIP jobb az MCP-nél; ajánlás: PIP-sín folyamatosan legalább 6 hétig; III-as terápiás bizonyítékszint | J Hand Surg Glob Online 2026, PMID 41362294 | mind egyezik |
| 104 beteg, 122 ujj, 29 hónap átlagos utánkövetés; 68,9%; 1-2. fokozat kb. 75%, 3. fokozat 60%; 39,1% vs 22,4% (p=0,05); a sín nem ad többletet az injekció mellé | Arch Phys Med Rehabil 2025, PMID 40449569 | mind egyezik |
| 120 beteg három csoportban; MCP semleges helyzetben napi legalább 8 óra 6 héten át; 6, 12, 52 hét; nincs klinikailag érdemi különbség; a sín önmagában ajánlott; I-es bizonyítékszint | Clin Orthop Relat Res 2023, PMID 37083487 | mind egyezik |
| Hatásméret 0,49-1,99; egyetlen ízület rögzítése 6-10 hétre | J Hand Ther 2019, PMID 29290504 | egyezik |
| 2%; gyűrűs- és hüvelykujj; 40-60 közötti nők; cukorbetegség, RA, amyloidosis; ismétlődő markolás és csippentés; reggeli merevség és napközbeni javulás; injekció kisebb eséllyel hat; vércukor 10-14 nap; seb néhány hét, duzzanat és merevség 4-6 hónap, teljes felépülés érzete 6 hónap | AAOS OrthoInfo Trigger Finger | mind egyezik |
| Magától is rendbe jöhet; 40 év feletti, cukorbetegség, RA; háziorvos, ha nem javul vagy akadályoz; műtét, ha a többi nem segített | NHS Trigger finger | mind egyezik |

### Csuklótörés

| Állítás | Forrás | Eredmény |
|---|---|---|
| Gipsz 4-6 hét; kb. 3 hónap minden tevékenységre; teljes felépülés akár 1 év; merevség 1-2 hónapban javul a legtöbbet, legalább 2 évig tovább; könnyű mozgás 1-2 hónap, megterhelő sport 3-6 hónap; 24 órán belüli ujjmozgatás és a gipsz lazítása; nem múló erős fájdalom jelzendő | AAOS OrthoInfo Distal Radius | mind egyezik |
| 6-8 hét felépülés; merevség és gyengeség több hónapig; kéz a könyök fölött, éjszaka párnával; ne vezess, ne emelj nehezet; gipsz alatti figyelmeztető jelek; ne ázzon el, ne nyúlj alá | NHS Broken arm or wrist | mind egyezik |
| „Inconsistent evidence suggests no difference…”, „Strength of Recommendation: Limited”; „A rule prohibiting supervised therapy … might limit access for a subset of people who stand to benefit” | AAOS/ASSH 2020 CPG, 5. és 20-21. o. | betűhíven egyezik |
| 26 vizsgálat, 1269 beteg; mind a 23 összehasonlítás alacsony vagy nagyon alacsony minőségű, „considerable uncertainty”; a vizsgálatok többsége kicsi és magas torzítási kockázatú | Cochrane 2015, PMID 26403335 | egyezik |
| NG38 1.6.10 minden idézett eleme (szóban és írásban, várható kimenetel, visszatérés ideje, terhelés és felső végtagi terhelhetőség, aktív betegrészvétel) | NICE NG38 | egyezik |
| Kilenc vizsgálat; probiotikum és aszpirin nem csökkentette; C-vitamin vitatott; korai aktív rehabilitáció ígéretes, de korlátozott és heterogén; nincs egységes protokoll | J Funct Morphol Kinesiol 2026, PMID 42029526 | mind egyezik |
| CRPS-arányt szándékosan nem ad a cikk | Jellad 2014 / Parkitny 2022 | helyes döntés |

### Zsibbadás és csuklófájdalom

| Állítás | Forrás | Eredmény |
|---|---|---|
| Cukorbetegség, Raynaud (színt váltó ujjak), hiperventilláció (kapkodó légzés, remegő kéz), isiász (hátból a lábba), sclerosis multiplex (több ponton); kemoterápia, HIV-gyógyszer, görcsgátló, antibiotikum, ólom, sugárzás, rossz táplálkozás, becsípődött ideg, idegkárosodás, alkohol; „do not self-diagnose” | NHS Pins and needles | mind egyezik |
| Arclelógás, karerőtlenség vagy zsibbadás, akadozó beszéd; egyoldali erőtlenség, homályos látás, erős fejfájás, szédülés; 24 órán belül elmúlt tünetnél is 999 | NHS Stroke Symptoms | mind egyezik |
| Az öt tünet-ok párosítás; a teljes otthoni lista; a „mit ne” lista (2-3 nap melegítés, nehéz emelés, erős szorítás); gyógyszerész szerepe; a háziorvosi és a sürgős lista minden tétele | NHS Wrist pain | mind egyezik |
| A 999-lista négy eleme, benne az erősen vérző seb | NHS Broken arm or wrist | egyezik |
| Nyak- vagy karfájdalom; a perifériás becsípődésektől és a vállpanaszoktól el kell különíteni | Curr Rev Musculoskelet Med 2016, PMID 27250042 | egyezik |
| Kanavel négy jele mint vezérfonal; cukorbetegség és érszűkület rosszabb kimenetel, merevség és amputáció | Orthop Clin North Am 2017, PMID 28336044 | egyezik (a jelek felsorolása nélkül, lásd J9) |
| A kéz legsúlyosabb fertőzése; a jelek meglétekor azonnali műtéti indikáció; a konzervatív próbálkozás nehezen védhető; gyors felismerés és gyors cselekvés | Handchir Mikrochir Plast Chir 2021, PMID 34134159 | egyezik (a jelek felsorolása nélkül, lásd J9) |
| Terhesség és szülés utáni időszak, 4-6 hét; a fájdalom a csuklóból az alkarba húzódik; gyermek felemelése | AAOS OrthoInfo De Quervain | mind egyezik |

### Linkek és termékadatok

| Ellenőrzés | Eredmény |
|---|---|
| A cikkek 48 külső hivatkozása | mind él (NHS, AAOS, NICE, aaos.org PDF: 200; PubMed: 203) |
| `/kurzusok/otthoni-kezrehab-program` és `/kurzusok/sos-kezrelax-villamkurzus` | helyes, a `src/lib/slugify.ts` pontosan ezt a két slugot adja |
| 4 modul, 50+ videós gyakorlat, 5 perces miniblokkok, csukló-ujj-alkar-könyök | `restore-legacy-content.ts` 1772-1774. és 2660. sor, egyezik |
| „Éles fájdalom esetén hagyd abba, és kérj szakmai segítséget” | `src/lib/home-seed.ts` 606. sor és `Faq.tsx` 37. sor, egyezik |
| Kate Thorn CHT (AHTA), Loren Szmiga CHT, Daphne Xuan MPT kurzusok, 2024 | `restore-legacy-content.ts` 861-868. sor, egyezik |
| Tiltott forrás (NICE CKS, egeszsegvonal, kezsebeszet.hu, blog) hivatkozásként | egyik cikkben sincs |
| Gyógyulás-ígéret, gyógyulási arány, gyógyulási idő sajátként | egyik cikkben sincs |
| Kvirtmínusz a cikkek törzsében | 0 darab mind a hatban |
| „Lektorálandó vázlat” figyelmeztetés | mind a hat fájl első sorában és a H1 alatt is |
| Záró óvatossági fordulat | mind a hat cikkben |
| „Mikor NE végezd a gyakorlatokat?” szakasz | mind a hat cikkben |

---

## 5. Javasolt sorrend a vezetőnek

1. **B3** (akkreditációs szám) tulajdonosi megerősítést igényel, ez a leghosszabb átfutású.
2. **B1** és **B2** szövegjavítás, egy-egy bekezdés, azonnal elvégezhető.
3. **B4**, **J1**, **J5**, **J6**, **J8**, **J13** mind egy-egy pótlandó mondat: ezek adják
   vissza a forrás másik felét. Együtt kezelendők, mert ugyanaz a hiba mintája
   (a saját érdekkel szembemenő részlet kimaradása).
4. **J9** és **J10** a forrásbázis bővítését igényli, utána a cikkek maradhatnak.
5. **J11** a két gyógytornász jóváhagyását igényli szó szerint, vagy a mondatok cseréjét.
6. **J12** megjelenési sorrend kérdése, a tartalmi terv gazdájának szól.
7. **J16** tulajdonosi döntés (termékszöveg kontra cikkszöveg).

## 6. Nyitott kérdések, amikre nincs jogosultságom válaszolni

1. **Érvényes-e 2026-ban az SZTK-A-33553/2024 akkreditáció?** (B3) Külső forrásból nem
   tudtam visszaigazolni, a repó maga jelöli nyitottnak.
2. **Vállalják-e a két gyógytornász szó szerint a J11-ben felsorolt négy
   praxis-mondatot?** Ha igen, maradhatnak. Ha nem, cserélendők.
3. **A C9 (De Quervain) cikk megjelenik-e az első hullámmal?** Ettől függ, hogy a
   négy belső link maradhat-e (J12).
4. **Pontosuljon-e az SOS Kézrelax leírásának öntesztet ígérő mondata?** (J16)
   Ez termékszöveg, nem cikkszöveg, tehát tulajdonosi döntés.
