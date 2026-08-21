# Orvosi forrásbázis a Tudástár-cikkekhez

> **Mi ez?** Ellenőrizhető forrásgyűjtemény a nyolc tervezett Tudástár-cikkhez
> (`docs/kulcsszavak.md` 4. szakasz). Minden tétel mellett ott a szerző vagy kiadó,
> a cím, az URL, a kiadás dátuma, a hozzáférés dátuma, és egy magyar összefoglaló
> arról, hogy a forrás **pontosan mit állít**. A cikkíró erre hivatkozik.
>
> **Készült:** 2026-08-21. **Hozzáférés dátuma minden webes tételnél:** 2026-08-21.
> **Módszer:** NICE CKS zárva volt (HTTP 403), a Cochrane Library szintén (HTTP 403),
> ezért a Cochrane-áttekintések a PubMed hivatalos E-utilities API-jából származnak,
> teljes absztrakttal. Minden DOI, folyóirat, évfolyam és oldalszám a PubMed
> rekordból ellenőrizve. Minden URL letöltéssel visszaigazolva (HTTP 200).
>
> **Ez a dokumentum forrásgyűjtemény, nem cikk.** Nem tartalmaz kész mondatokat
> a vevőnek. Kódot nem módosít.

---

## 0. Használati szabályok

### 0.1 A hivatkozás alakja a cikkben

Minden klinikai állítás mellé forrás kell, ebben az alakban:

> A kéztőalagút-szindróma tünetei sokaknál éjszaka a legerősebbek.
> *(NHS, Carpal tunnel syndrome, 2024. április 17-i felülvizsgálat)*

A cikk végén pedig teljes forrásjegyzék: **kiadó vagy szerző · cím · év · URL ·
hozzáférés dátuma**. Lektorált közleménynél a **DOI és a PMID** is: a DOI a
hivatalos azonosító, a PubMed-cím pedig mindig megnyitható
(`https://pubmed.ncbi.nlm.nih.gov/<PMID>/`), akkor is, ha a kiadó zárja az oldalát.

### 0.2 Négy tilalom, ami ebből a dokumentumból következik

1. **Ami nincs benne ebben a fájlban, azt nem írod le klinikai állításként.**
   Ha új állítás kell, előbb ide kerül forrással, csak utána a cikkbe.
2. **A számot pontosan idézd.** Ha a forrás „80–95%”-ot mond, akkor a cikkben is
   80–95% szerepel, nem „szinte mindenki”. Ha a forrás bizonytalanságot jelöl
   (alacsony bizonyítékerősség, széles konfidencia-intervallum), azt is mondd ki.
3. **A bizonyíték erőssége is információ.** Egy „nagyon alacsony bizonyossági
   szintű” eredményt nem szabad úgy tálalni, mintha tény lenne.
4. **A forrás nem a szerző.** A továbbképzés, a konferencia és a médiamegjelenés
   a két gyógytornász hitelességét igazolja, nem a klinikai állítást
   (`docs/tudastar-hangnem-es-technika.md` 1.7 szakasz).

### 0.3 Bizonyítékerősség: fordítókulcs a magyar szöveghez

| Angol jelölés | Mit jelent | Magyarul így írd |
|---|---|---|
| Strong / High certainty | két vagy több magas minőségű vizsgálat, egyező eredménnyel | „megbízható vizsgálatok szerint” |
| Moderate certainty | valószínűleg így van, de a további kutatás módosíthatja | „a jelenlegi vizsgálatok szerint valószínűleg” |
| Low certainty | a hatás iránya bizonytalan | „a vizsgálatok bizonytalanok abban, hogy” |
| Very low certainty | gyakorlatilag nem tudjuk | ezt inkább **ne** használd állításnak |
| Consensus | nincs bizonyíték, szakértői vélemény | „a szakmai munkacsoport véleménye szerint” |

Az AAOS és az Egészségügyi Közlöny irányelvei is kiírják ezt minden ajánlásnál.
A magyar irányelvekben `LE: 1a`–`LE: 4` a bizonyítékszint, mellette „Erős ajánlás”
vagy „Gyenge ajánlás”.

---

## 1. Vörös zászlók: ez minden cikkbe kötelezően bekerül

Ez felelősségi kérdés. A cikk nem diagnosztizál, de **meg kell mondania, mikor
kell letenni a telefont és orvoshoz menni.**

### 1.1 Azonnal mentőt kell hívni

| Jel | Miért | Forrás |
|---|---|---|
| Az arc egyik fele lelóg, az egyik kar erőtlen vagy zsibbadt, akadozó beszéd | stroke gyanúja | NHS, Stroke symptoms |
| A test egyik oldalán erőtlenség vagy zsibbadás, homályos látás, hirtelen erős fejfájás, szédülés | stroke egyéb jelei | NHS, Stroke symptoms |
| Sérülés után a kar vagy csukló zsibbad, bizsereg; a csont kiáll a bőrből; a kar alakja megváltozott | idegsérülés, nyílt vagy elmozdult törés | NHS, Broken arm or wrist |

Az NHS kiemeli: **ha a stroke tünetei el is múltak, de 24 órán belül voltak,
akkor is azonnali segítség kell.** Magyar megfelelő: 112.

### 1.2 Aznap orvos vagy ügyelet

| Jel | Miért | Forrás |
|---|---|---|
| Erős csuklófájdalom; ájulásérzés, hányinger a fájdalomtól; láz, hidegrázás | törés vagy fertőzés | NHS, Wrist pain |
| Sérüléskor reccsenés, csikorgás vagy pattanás hallatszott | törés | NHS, Wrist pain |
| A csukló nem mozdítható, semmit nem lehet megfogni | törés, szakadt ín | NHS, Wrist pain |
| A csukló alakja vagy színe megváltozott | törés, keringési zavar | NHS, Wrist pain |
| A kéz egy részén vagy egészén megszűnt az érzés | idegkárosodás | NHS, Wrist pain |
| A csuklón lévő duzzanat nagyon fájdalmas, forró vagy piros | fertőzés | NHS, Wrist pain |
| Az ujj duzzadt, félig behajlítva tartja, nyújtásra nagyon fáj, az ínhüvely mentén nyomásérzékeny | gennyes ínhüvelygyulladás, a kéz legsúlyosabb fertőzése | Hyatt & Bagg 2017; Langer és mtsai 2021 |
| Gipsz alatt: erősödő fájdalom, zsibbadó vagy elkékülő ujjak, szoros vagy meglazult gipsz, rossz szag vagy váladék | keringési zavar, fertőzés | NHS, Broken arm or wrist |
| Váll: hirtelen nagyon erős fájdalom, a kar nem mozdítható, alakváltozás, meg nem szűnő zsibbadás, forró vagy hideg tapintat, láz | ficam, törés, ínszakadás, fertőzés | NHS, Shoulder pain |
| Váll: daganat gyanúja, ízületi fertőzés, nem helyretett ficam, akut trauma képalkotó nélkül, polyarthritis | a magyar irányelv nevesített „Vörös Zászlói” | BM szakmai irányelv 002327, Ajánlás9 |

A gennyes ínhüvelygyulladásról a szakirodalom egyértelmű: **ha a négy Kanavel-jel
megvan, azonnal műtéti indikáció, a konzervatív próbálkozás nehezen védhető**
(Langer és mtsai 2021). Cukorbetegségnél és érszűkületnél rosszabb a kimenetel,
merevség és amputáció is előfordul (Hyatt & Bagg 2017).

### 1.3 Napokon belül orvos

| Jel | Forrás |
|---|---|
| A csuklófájdalom két hét otthoni kezelés után sem javult | NHS, Wrist pain |
| Bármilyen bizsergés vagy érzéskiesés a kézen | NHS, Wrist pain |
| Cukorbetegség mellett kézpanasz („hand problems can be more serious if you have diabetes”) | NHS, Wrist pain |
| A könyökfájdalom két hét pihenés és otthoni kezelés után is megvan | NHS, Tennis elbow |
| A vállfájdalom két hét után sem javul, vagy romlik | NHS, Shoulder pain |
| A kéztőalagút tünetei romlanak vagy nem múlnak | NHS, Carpal tunnel syndrome |
| A pattanó ujj tünetei nem javulnak, vagy akadályozzák a mindennapokat | NHS, Trigger finger |

### 1.4 A vörös zászlók forrásai

| # | Forrás | URL | Dátum |
|---|---|---|---|
| VZ1 | NHS. **Stroke**, Symptoms aloldal. | https://www.nhs.uk/conditions/stroke/symptoms/ | felülvizsgálva 2024-09-12, következő 2027-09-12 |
| VZ2 | NHS. **Wrist pain** (Hand pain sorozat). | https://www.nhs.uk/conditions/hand-pain/wrist-pain/ | felülvizsgálva 2025-11-05, következő 2028-11-05 |
| VZ3 | NHS. **Broken arm or wrist.** | https://www.nhs.uk/conditions/broken-arm-or-wrist/ | felülvizsgálva 2023-05-26, következő 2026-05-26 |
| VZ4 | NHS. **Shoulder pain.** | https://www.nhs.uk/conditions/shoulder-pain/ | felülvizsgálva 2023-05-22, következő 2026-05-22 |
| VZ5 | Hyatt BT, Bagg MR. **Flexor Tenosynovitis.** Orthop Clin North Am. 2017;48(2):217–227. PMID 28336044. | https://doi.org/10.1016/j.ocl.2016.12.010 · https://pubmed.ncbi.nlm.nih.gov/28336044/ | 2017 |
| VZ6 | Langer MF és mtsai. **[Pyogenic Flexor Tenosynovitis].** Handchir Mikrochir Plast Chir. 2021;53(3):267–275. PMID 34134159. | https://doi.org/10.1055/a-1472-1689 · https://pubmed.ncbi.nlm.nih.gov/34134159/ | 2021 |
| VZ7 | Belügyminisztérium. **Egészségügyi szakmai irányelv a befagyott váll fizioterápiás vizsgálatáról és kezeléséről.** Azonosító: 002327. Egészségügyi Közlöny LXXVI/5., 562–590. o. | https://jog.gov.hu/files/AGAZATI_KOZLONY/EGESZSEGUGYI_KOZLONY/2026/5/EGK_2026_005.pdf | 2026-02-24, érvényes a megjelenést követő 3 évig |

> **Figyelem a VZ2-re.** Az NHS wrist pain oldala külön kiemeli:
> *„Do not try to diagnose the cause of the pain yourself.”* Ezt a szemléletet a
> cikknek is tükröznie kell: tünetlista igen, diagnózis nem.

---

## 2. Kéztőalagút-szindróma (carpal tunnel syndrome)

A mért SERP szerint ezt a találati listát **műtéti ajánlatok uralják**
(`docs/kampanyterv-mert-adatokbol.md` 5. szakasz), ezért a 2.2 szakasz, a
konzervatív lehetőségek, a teljes forrásbázis legfontosabb része.

### 2.1 Alapok

**Mi ez és mitől van.** A csukló belsejében lévő kéztőalagút beszűkül vagy a benne
futó inak környéki szövet megduzzad, ez nyomja a nervus medianust
(NHS; AAOS OrthoInfo). Az AAOS OrthoInfo szerint az esetek nagy részében több
tényező együtt áll a háttérben; a nők és az idősebbek gyakrabban érintettek.

**Kockázati tényezők, névvel:** túlsúly, terhesség, ismétlődő csuklóhajlítás vagy
erős markolás (például rezgő szerszám), ízületi gyulladás, cukorbetegség,
családi halmozódás, korábbi csuklósérülés (NHS). Az AAOS ehhez hozzáteszi az
örökletes alkati adottságot (szűkebb kéztőalagút), a szélsőséges csuklótartást,
a pajzsmirigy-egyensúlyzavart és a rheumatoid arthritist.

**Tünetek.** Fájdalom vagy sajgás az ujjakban, kézben, karban; zsibbadás;
bizsergés; gyenge hüvelykujj vagy nehéz markolás. A tünetek lassan indulnak,
jönnek-mennek, **és éjjel a legerősebbek** (NHS). Az AAOS részletezi: a zsibbadás
elsősorban a hüvelyk-, mutató-, középső és gyűrűsujjat érinti, gyakran felébreszti
az embert, a kéz rázogatása sokaknál enyhíti, és jellemző az ügyetlenség, a
tárgyak elejtése.

**Diagnózis.** Az AAOS 2024-es irányelve **erős ajánlással** mondja ki: a CTS-6
klinikai pontrendszer önmagában használható a diagnózishoz, a rutinszerű
ultrahang vagy ENG/EMG helyett. Ugyanez az irányelv **közepes erősségű
ajánlással** mondja, hogy az MRI és a felső végtagi neurodinamikai tesztelés
**ne** legyen diagnosztikus eszköz kéztőalagút-szindrómában.

> Ez a cikkben így hasznosítható: nem kell rögtön műszeres vizsgálatot
> követelni, de a diagnózis akkor is orvosi feladat, nem cikké.

### 2.2 Konzervatív, nem műtéti lehetőségek: mit mond a bizonyíték

**a) Éjszakai csuklósín.** Az NHS első lépésként ezt ajánlja, és kiírja a valós
időigényt: *„You may need to wear a splint for up to 6 weeks before it starts to
feel better.”* A Cochrane 2023-as áttekintése (29 vizsgálat, 1937 felnőtt)
árnyaltabb: kezelés nélküli összehasonlításban rövid távon (3 hónapon belül) a
tünetjavulás a Boston-kérdőív tünetskáláján 0,37 pont a sín javára
(95% CI: 0,82 ponttal jobb és 0,08 ponttal rosszabb között), ami **a klinikailag érdemi 1 pontos küszöb
alatt van**, alacsony bizonyossági szinttel. A funkció rövid távon 0,24 ponttal
jobb (95% CI 0,44–0,03; közepes bizonyosság), a klinikailag érdemi 0,7 pontos
küszöb alatt. Ugyanakkor: **az éjszakai sín viselése rövid távon nagyobb eséllyel
hoz általános javulást, mint a semmi** (RR 3,86; 95% CI 2,29–6,51; NNT 2;
alacsony bizonyosság). A szerzők záró mondata a legfontosabb:

> „As splinting is a relatively inexpensive intervention with no plausible
> long-term harms, small effects could justify its use, particularly when
> patients are not interested in having surgery or injections.”

Vagyis: olcsó, tartós ártalma nincs, és **pont annak való, aki még nem akar
műtétet vagy injekciót.** Ez a mi cikkünk üzenete, forrással.
A hat hét helyett hat hónapos viselés a Cochrane szerint jobb lehet, de ez is
alacsony bizonyossági szintű.

**b) Kortikoszteroid injekció.** A Cochrane 2023-as áttekintése (14 vizsgálat,
994 résztvevő) szerint placebóhoz képest **valószínűleg javítja a tüneteket
3 hónapon belül** (SMD -0,77; 95% CI: -0,94 és -0,59 között; közepes bizonyosság), és a
hatás **6 hónapig kimutatható** (SMD -0,58). A műtéti igény egy év alatt
valószínűleg valamelyest csökken (RR 0,84; 95% CI 0,72–0,98). Az AAOS 2024-es
irányelve viszont **erős ajánlással** rögzíti: az injekció **nem hoz hosszú távú
javulást**. A kettő nem mond ellent egymásnak: az injekció időt vesz, nem gyógyít.
Az NHS ugyanezt mondja a beteg nyelvén: *„Steroid injections are not always a
cure. CTS can come back after a few months.”*

**c) Sín kontra injekció: az INSTINCTS-vizsgálat.** 234 résztvevő,
alapellátásban, enyhe és közepes kéztőalagút-szindrómával. Hat hétnél az injekció
mérhetően jobb (Boston-összpontszám 2,02 vs 2,29; korrigált átlagkülönbség -0,32;
95% CI: -0,48 és -0,16 között; p=0,0001). **A 24 hónapos utánkövetés viszont eltünteti a
különbséget:** 12 és 24 hónapnál sem a Boston-pontszámban, sem a fájdalomban
nincs statisztikailag jelentős eltérés, és 24 hónapnál az injekciós csoportból
került többet műtétre (22% vs 16%), miközben az injekció drágább is volt.

**d) Idegsiklató (nerve gliding) gyakorlatok.** Az AAOS OrthoInfo a nem műtéti
lehetőségek közt sorolja fel: *„Some patients may benefit from exercises that help
the median nerve move more freely.”* Egy 13 klinikai vizsgálatot áttekintő munka
(Ballestero-Pérez és mtsai 2017) szerint az idegsiklatás önmagában
**korlátozott bizonyítékkal** bír: a fájdalomcsillapításra a szokásos konzervatív
ellátás tűnik a legjobb választásnak, az idegsiklatás inkább kiegészítő, amely
gyorsíthatja a funkció visszatérését. A 13 vizsgálatból 6 gyenge minőségű volt.

**e) Amiről az AAOS 2024 kimondja, hogy nem hoz hosszú távú javulást.**
Szó szerint ez a lista szerepel az irányelvben (magas minőségű bizonyítékból,
„Limited” erősségű opcióvá visszaminősítve): szájon át adott kortikoszteroid,
hialuronsav-injekció, hidrodisszekció, kineziotape, lézerterápia, peloidterápia,
perineurális injekciós terápia, helyi külsőleges készítmény, lökéshullám,
**gyakorlatozás (exercise)**, ózoninjekció, **masszázs**, **manuálterápia**,
pulzáló rádiófrekvencia. Ugyanez az irányelv azt is kimondja, hogy
**a konzervatív módszerek között nincs jelentős különbség** a betegek által
jelentett eredményekben, és hogy a terápiás ultrahang sem hoz hosszú távú javulást.

> **Ezt nem lehet elhallgatni, és nem is szabad.** Lásd a 11. szakaszt: ez a
> pont vezetői és szakmai döntést igényel, mielőtt bármelyik cikk megjelenik.

**f) Sebészet kontra konzervatív.** A Cochrane 2024-es áttekintése (14 vizsgálat,
1231 résztvevő, 84% nő) szerint a műtét hosszú távon **valószínűleg gyakrabban hoz
klinikai javulást**, mint a sín (RR 2,10; 95% CI 1,04–4,24; közepes bizonyosság),
de **klinikailag érdemi többletet a tünetekben és a kézfunkcióban valószínűleg
nem ad** (a Boston tünetskálán 0,26 pont a műtét javára, a klinikailag érdemi
küszöb 1 pont; a funkcionális skálán 0,36 pont, a küszöb 0,7).

**g) Mit mond a billentyűzetről az irányelv.** Az AAOS 2024 szakértői
konszenzusa: *„In the absence of reliable evidence, it is the opinion of the
workgroup that there is no association between high keyboard use and carpal tunnel
syndrome.”* Vagyis a sokat gépelés és a kéztőalagút-szindróma kapcsolata **nem
igazolt**. Ez szembemegy a magyar köznyelvi „egérkéz” képpel, tehát ezt a szót a
cikkben nem használjuk oksági állításként. (A `docs/kulcsszavak.md` szerint az
`egérkéz` kifejezésre amúgy sincs mért keresési volumen.)

### 2.3 Mit ne állítsunk

- Ne mondjuk, hogy a torna „meggyógyítja” a kéztőalagút-szindrómát. Az NHS is
  óvatos: *„There's a small amount of evidence to suggest hand exercises help ease
  the symptoms of CTS.”*
- Ne mondjuk, hogy a fájdalomcsillapító megoldja: *„there's little evidence to say
  they can treat the cause of CTS, so it's important not to rely on them”* (NHS).
- Ne bagatellizáljuk a késlekedést. Az AAOS OrthoInfo világos: *„In most patients,
  carpal tunnel syndrome gets worse over time. If untreated for too long, it can
  lead to permanent dysfunction of the hand.”* A cikk feladata nem a műtét
  lebeszélése, hanem annak bemutatása, mi történhet a műtét előtt.

### 2.4 Forrásjegyzék: kéztőalagút

| # | Forrás | URL | Dátum |
|---|---|---|---|
| CTS1 | NHS. **Carpal tunnel syndrome.** | https://www.nhs.uk/conditions/carpal-tunnel-syndrome/ | felülvizsgálva 2024-04-17, következő 2027-04-17 |
| CTS2 | American Academy of Orthopaedic Surgeons. **Management of Carpal Tunnel Syndrome. Evidence-Based Clinical Practice Guideline.** Elfogadta az AAOS igazgatótanácsa 2024-05-18-án. | https://www.aaos.org/globalassets/quality-and-practice-resources/carpal-tunnel/carpal-tunnel-2024/cts-cpg.pdf | 2024-05-18 |
| CTS3 | Karjalainen TV, Lusa V, Page MJ, O'Connor D, Massy-Westropp N, Peters SE. **Splinting for carpal tunnel syndrome.** Cochrane Database Syst Rev. 2023;2(2):CD010003. PMID 36848651. | https://doi.org/10.1002/14651858.CD010003.pub2 · https://pubmed.ncbi.nlm.nih.gov/36848651/ | 2023 |
| CTS4 | Ashworth NL, Bland JDP, Chapman KM, Tardif G, Albarqouni L, Nagendran A. **Local corticosteroid injection versus placebo for carpal tunnel syndrome.** Cochrane Database Syst Rev. 2023;2(2):CD015148. PMID 36722795. | https://doi.org/10.1002/14651858.CD015148 · https://pubmed.ncbi.nlm.nih.gov/36722795/ | 2023 |
| CTS5 | Ashworth NL és mtsai. **Local corticosteroid injection versus surgery for carpal tunnel syndrome.** Cochrane Database Syst Rev. 2024;8(8):CD015101. PMID 39206746. | https://doi.org/10.1002/14651858.CD015101 · https://pubmed.ncbi.nlm.nih.gov/39206746/ | 2024 |
| CTS6 | Lusa V, Karjalainen TV, Pääkkönen M, Rajamäki TJ, Jaatinen K. **Surgical versus non-surgical treatment for carpal tunnel syndrome.** Cochrane Database Syst Rev. 2024;1(1):CD001552. PMID 38189479. | https://doi.org/10.1002/14651858.CD001552.pub3 · https://pubmed.ncbi.nlm.nih.gov/38189479/ | 2024 |
| CTS7 | Chesterton LS és mtsai. **The clinical and cost-effectiveness of corticosteroid injection versus night splints for carpal tunnel syndrome (INSTINCTS trial).** Lancet. 2018;392(10156):1423–1433. PMID 30343858. | https://doi.org/10.1016/S0140-6736(18)31572-1 · https://pubmed.ncbi.nlm.nih.gov/30343858/ | 2018 |
| CTS8 | Burton C és mtsai. **The effectiveness of corticosteroid injection versus night splints for carpal tunnel syndrome: 24-month follow-up of a randomized trial.** Rheumatology (Oxford). 2023;62(2):546–554. PMID 35394019. | https://doi.org/10.1093/rheumatology/keac219 · https://pubmed.ncbi.nlm.nih.gov/35394019/ | 2023 |
| CTS9 | AAOS OrthoInfo. **Carpal Tunnel Syndrome.** Szerző: Tyler Steven Pidgeon, MD, FAAOS; lektor: Thomas Ward Throckmorton, MD, FAAOS. | https://orthoinfo.aaos.org/en/diseases--conditions/carpal-tunnel-syndrome/ | hozzáférés 2026-08-21 |
| CTS10 | Ballestero-Pérez R és mtsai. **Effectiveness of Nerve Gliding Exercises on Carpal Tunnel Syndrome: A Systematic Review.** J Manipulative Physiol Ther. 2017;40(1):50–59. PMID 27842937. | https://doi.org/10.1016/j.jmpt.2016.10.004 · https://pubmed.ncbi.nlm.nih.gov/27842937/ | 2017 |

---

## 3. Kézzsibbadás: a differenciálás forrásai

A `docs/kulcsszavak.md` szerint ez a legnagyobb hozamú célpont (2 200 forgalmi
potenciál). A cikk kulcsa: **a zsibbadás tünet, nem diagnózis.**

**Amit az NHS felsorol lehetséges okként** (Pins and needles oldal):
cukorbetegség; Raynaud-jelenség, ha az ujjak színt is váltanak; hiperventilláció,
ha kapkodó légzés és remegő kéz kíséri; isiász, ha a hátból a lábba sugárzik;
sclerosis multiplex, ha a test több pontján jelentkezik. Tartós zsibbadást okozhat
még kemoterápia, egyes gyógyszerek (HIV-gyógyszer, görcsgátló, egyes
antibiotikumok), mérgező anyagok (ólom, sugárzás), rossz táplálkozás, **a hátban
vagy a nyakban becsípődött ideg**, sérülés vagy betegség utáni idegkárosodás,
és a túlzott alkoholfogyasztás. Az oldal figyelmeztetése szó szerint:
*„But do not self-diagnose – see a GP if you're worried.”*

**Nyaki eredet.** A gerincből kiinduló, karba sugárzó panasz (cervicalis
radiculopathia) a felső végtagi idegbecsípődések és a vállpanaszok
differenciáldiagnózisában is szerepel; Iyer és Kim áttekintése kifejezetten
kiemeli, hogy a perifériás idegbecsípődéseket és a vállpatológiát el kell
különíteni. Egy 6 randomizált vizsgálatot (464 résztvevő) összesítő metaanalízis
szerint a műtét gyorsabb fájdalomcsökkenést ad, mint a konzervatív kezelés, de
a mozgásterjedelemben és a mentális állapotban nincs különbség, és 12 hónapnál a
nyaki funkciópontszámban sem.

**Könyök szintjén becsípődött singideg (cubitalis alagút).** A felső végtag
második leggyakoribb perifériás idegbecsípődése (Graf és mtsai 2023). Az éjszakai
sín hatékonyságáról 2025-ös szisztematikus áttekintés készült: **egyetlen
randomizált vizsgálat** volt fellelhető, magas torzítási kockázattal, és a
bizonyosság szintje **nagyon alacsony**; a szerzők szerint jelenleg nem
eldönthető, hogy ajánlható-e (Bateman és mtsai 2025). Ezt a cikkben pontosan így,
a bizonytalanság kimondásával szabad idézni.

**Stroke.** A hirtelen induló, egyoldali zsibbadás mellett arclelógás,
karerőtlenség és beszédzavar esetén azonnal 112. Lásd az 1.1 szakaszt.

### Forrásjegyzék: kézzsibbadás

| # | Forrás | URL | Dátum |
|---|---|---|---|
| ZS1 | NHS. **Pins and needles.** | https://www.nhs.uk/conditions/pins-and-needles/ | felülvizsgálva 2024-01-04, következő 2027-01-04 |
| ZS2 | NHS. **Stroke**, Symptoms aloldal. | https://www.nhs.uk/conditions/stroke/symptoms/ | felülvizsgálva 2024-09-12 |
| ZS3 | Iyer S, Kim HJ. **Cervical radiculopathy.** Curr Rev Musculoskelet Med. 2016;9(3):272–280. PMID 27250042. | https://doi.org/10.1007/s12178-016-9349-4 · https://pubmed.ncbi.nlm.nih.gov/27250042/ | 2016 |
| ZS4 | Luyao H és mtsai. **Management of Cervical Spondylotic Radiculopathy: A Systematic review.** Global Spine J. 2022;12(8):1912–1924. PMID 35324370. | https://doi.org/10.1177/21925682221075290 · https://pubmed.ncbi.nlm.nih.gov/35324370/ | 2022 |
| ZS5 | Graf A, Ahmed AS, Roundy R, Gottschalk MB, Dempsey A. **Modern Treatment of Cubital Tunnel Syndrome: Evidence and Controversy.** J Hand Surg Glob Online. 2023;5(4):547–560. PMID 37521554. | https://doi.org/10.1016/j.jhsg.2022.07.008 · https://pubmed.ncbi.nlm.nih.gov/37521554/ | 2023 |
| ZS6 | Bateman M, Swaile H, Tambe A. **Effectiveness of night splints for cubital tunnel syndrome - A systematic review.** Hand Ther. 2025;30(3):105–112. PMID 40385935. | https://doi.org/10.1177/17589983251336157 · https://pubmed.ncbi.nlm.nih.gov/40385935/ | 2025 |

---

## 4. Teniszkönyök (epicondylitis lateralis, lateralis könyök-tendinopathia)

A `docs/kampanyterv-mert-adatokbol.md` 4. szakasza szerint a Google saját
kérdésdoboza itt a „mennyi idő alatt gyógyul” kérdést hozza. Az alábbi számok
erre adnak forrásolt választ.

**Elnevezés.** A szakirodalom ma inkább **tendinopathiának** hívja, nem
gyulladásnak: az AAOS OrthoInfo szerint az ínszövet elfajulásáról, illetve
mikroszakadásairól van szó, jellemzően az extensor carpi radialis brevis inában.
Ezt a cikkben érdemes kimondani, mert a „gyulladás” szó félrevisz a kezelésben.

**Kiket érint.** Az NHS szerint bárkinél előfordulhat, de 35 és 54 év között a
leggyakoribb. Az AAOS 30–50 évet ír. Nem csak sportolóknál: festők, vízvezeték-
szerelők, asztalosok, autóipari dolgozók, szakácsok és hentesek gyakrabban
kapják meg (AAOS). Az NHS okként a számítógépes munkát (gépelés, egérhasználat),
a kézműves feladatokat (varrás, csavarhúzó) és a szabadidős tevékenységeket
(tenisz, hangszer) sorolja.

**Mennyi idő alatt múlik el.** Az NHS mondata a legpontosabb rövid válasz:
*„It usually goes away with rest but can sometimes last over a year.”*
A számszerű válasz a két klasszikus randomizált vizsgálatból jön.

- **Smidt és mtsai, Lancet 2002** (185 beteg, háziorvosi ellátás, legalább
  6 hete tartó panasz). Sikerarány **6 hétnél**: injekció 92%, gyógytorna 47%,
  „várunk és figyelünk” 32%. Sikerarány **52 hétnél**: injekció 69%,
  gyógytorna 91%, várakozás 83%. Az injekciós csoportban magas volt a kiújulás.
- **Bisset és mtsai, BMJ 2006** (198 résztvevő). A kortikoszteroid 6 hétnél jobb,
  de **a sikeres esetek 65-ből 47-nél visszaesés** következett, és hosszú távon
  szignifikánsan rosszabb lett, mint a gyógytorna. A gyógytorna az első hat
  hétben jobb a várakozásnál, **52 hétnél viszont már nincs különbség: a
  résztvevők többsége mindkét csoportban sikeres kimenetelről számolt be.**

Ez a két vizsgálat együtt adja a cikk legfontosabb, forrásolt üzenetét: a
teniszkönyök **általában magától is rendeződik egy éven belül**, a gyógytorna
elsősorban azt hozza előre, hogy **hamarabb** legyen jobb, és **kevesebb egyéb
kezelésre** legyen szükség (a Bisset-vizsgálatban a gyógytornás csoport kért a
legkevesebb kiegészítő kezelést). A kortikoszteroid rövid távon látványos,
hosszú távon rontja az esélyt.

**Mennyit segít a torna, számokban.** A legnagyobb összesítés 30 randomizált
vizsgálatból, 2123 résztvevővel: a gyakorlatozás jobb, mint a passzív
kezelések, **de a hatás kicsi**, és a bizonyosság alacsony vagy nagyon alacsony
(Karanasios és mtsai 2021). A kortikoszteroid injekcióval szemben a fájdalommentes
szorítóerőben klinikailag érdemi különbséget találtak a torna javára: rövid távon
12,15, középtávon 22,45, hosszú távon 18,0 átlagos különbség. Az excentrikus
gyakorlatokról külön metaanalízis (6 vizsgálat, 429 résztvevő) azt találta, hogy
kiegészítő kezelés mellé adva javítja a fájdalmat (SMD -0,63; 95% CI: -0,90 és -0,36 között)
és az izomerőt (SMD 1,05; 95% CI 0,78–1,33).

**Mikor jön szóba műtét.** Az NHS szerint 6–12 hónapnyi eredménytelen kezelés
után. Az AAOS OrthoInfo két számot ad: **a betegek kb. 80–95%-a sikerrel jár a
nem műtéti kezeléssel**, és a teniszkönyök-műtét a betegek 80–90%-ánál sikeres.

**Mit ajánl az NHS otthonra.** A tüneteket rontó tevékenységek kerülése vagy
csökkentése; paracetamol vagy gyulladáscsökkentő gél; meleg vagy hideg borogatás
törölközőben, legfeljebb 20 percig, 2–3 óránként; egyszerű gyakorlatok, például
a kar hajlítása és nyújtása; alkarpánt vagy csukló-, illetve könyökrögzítő
patikából. Gyógytorna akkor, ha hat hét otthoni kezelés után sincs javulás.

### Forrásjegyzék: teniszkönyök

| # | Forrás | URL | Dátum |
|---|---|---|---|
| TK1 | NHS. **Tennis elbow.** | https://www.nhs.uk/conditions/tennis-elbow/ | felülvizsgálva 2024-05-31, következő 2027-05-31 |
| TK2 | AAOS OrthoInfo. **Tennis Elbow (Lateral Epicondylitis).** | https://orthoinfo.aaos.org/en/diseases--conditions/tennis-elbow-lateral-epicondylitis/ | hozzáférés 2026-08-21 |
| TK3 | Smidt N és mtsai. **Corticosteroid injections, physiotherapy, or a wait-and-see policy for lateral epicondylitis: a randomised controlled trial.** Lancet. 2002;359(9307):657–662. PMID 11879861. | https://doi.org/10.1016/S0140-6736(02)07811-X · https://pubmed.ncbi.nlm.nih.gov/11879861/ | 2002 |
| TK4 | Bisset L és mtsai. **Mobilisation with movement and exercise, corticosteroid injection, or wait and see for tennis elbow: randomised trial.** BMJ. 2006;333(7575):939. PMID 17012266. | https://doi.org/10.1136/bmj.38961.584653.AE · https://pubmed.ncbi.nlm.nih.gov/17012266/ | 2006 |
| TK5 | Karanasios S és mtsai. **Exercise interventions in lateral elbow tendinopathy have better outcomes than passive interventions, but the effects are small: a systematic review and meta-analysis of 2123 subjects in 30 trials.** Br J Sports Med. 2021;55(9):477–485. PMID 33148599. | https://doi.org/10.1136/bjsports-2020-102525 · https://pubmed.ncbi.nlm.nih.gov/33148599/ | 2021 |
| TK6 | Yoon SY és mtsai. **The Beneficial Effects of Eccentric Exercise in the Management of Lateral Elbow Tendinopathy: A Systematic Review and Meta-Analysis.** J Clin Med. 2021;10(17):3968. PMID 34501416. | https://doi.org/10.3390/jcm10173968 · https://pubmed.ncbi.nlm.nih.gov/34501416/ | 2021 |

---

## 5. Pattanó ujj (tendovaginitis stenosans, trigger finger)

**Mi történik.** Az ujj hajlítóinának és az A1-gyűrű (A1 pulley) méretének
egyensúlya borul fel: az ín megvastagszik vagy csomót képez, a gyűrű beszűkül,
így az ín nem tud simán átcsúszni. Ez adja az akadást, a pattanást és a
fájdalmat (AAOS OrthoInfo).

**Mennyire gyakori.** Az AAOS OrthoInfo szerint **a lakosság 2%-át érinti.**
Leggyakrabban a gyűrűsujjat és a hüvelykujjat. Gyakoribb 40 és 60 év közötti
nőknél, cukorbetegeknél, rheumatoid arthritisben és amyloidosisban, valamint
ismétlődő markoló vagy csippentő mozdulatot végzőknél. Az NHS a 40 év feletti
életkort, a cukorbetegséget és a rheumatoid arthritist emeli ki.

**Magától is elmúlhat.** Az NHS mondata: *„Trigger finger can sometimes get better
on its own without any treatment.”*

**A tünet napszakfüggő.** Az AAOS szerint a merevség és az akadás reggel, illetve
mozdulatlanság után a legrosszabb, és a nap folyamán, óvatos használat mellett
javulhat. Ez a cikkben jól használható, mert a vevő pontosan ezt éli meg.

**Sín.** Egy szisztematikus áttekintés (Lunsford és mtsai 2019) szerint a
sínviselés után a fájdalomcsökkenésre **közepestől nagyig terjedő hatásméretet**
(0,49–1,99) találtak, és a szerzők **egyetlen ízület rögzítését ajánlják 6–10
hétre.** Egy 2026-os, 13 vizsgálatot átnéző áttekintés szerint a sínezés rövid
távon (egy éven belül) következetesen csökkenti a fájdalmat, megszünteti az
akadást és javítja a funkciót, **akár 97%-os sikeraránnyal**, a kortikoszteroid
injekcióhoz hasonló mértékben, de a bőrsorvadás és a fertőzés kockázata nélkül;
a leghatékonyabb a napi 24 órás viselés, és a PIP-ízületet rögzítő sín jobban
teljesített, mint az MCP-t rögzítő.

**Sín kontra injekció: randomizált összehasonlítás.** 120 beteg, három csoport
(sín; szteroidinjekció; sín és injekció együtt), 52 hetes utánkövetés. A sín napi
legalább 8 órán át, 6 héten keresztül, MCP-ízületet semleges helyzetben rögzítve.
**Egyik időpontban sem volt klinikailag érdemi különbség a három csoport között**
sem a fájdalomban, sem a Michigan-kézfunkciós kérdőívben. A szerzők
következtetése: felnőtteknél **kezdő kezelésként a sín önmagában ajánlott**, és a
kettő kombinálása nem ad többletet (Atthakomol és mtsai 2023).

**Mennyire válik be a konzervatív út.** Egy háromkarú randomizált vizsgálat
(104 beteg, 122 pattanó ujj, átlagosan 29 hónapos utánkövetés) szerint a
konzervatív kezelés **68,9%-nál** hozott megszűnést vagy javulást. Enyhébb
(1-es és 2-es fokú) eseteknél ez **kb. 75%**, függetlenül attól, hogy sín,
injekció vagy mindkettő volt a kezelés; 3-as fokozatnál 60%. A 3-as fokozatúak
szignifikánsan gyakrabban jutottak műtétre (39,1% vs 22,4%).

**Cukorbetegeknél óvatosan.** Az AAOS OrthoInfo kimondja: a szteroidinjekció
kisebb eséllyel hat cukorbetegeknél, régóta fennálló akadásnál és pattanó
hüvelykujjnál; inzulinnal kezelt cukorbetegeknél a szteroid tipikusan 10–14 napig
megemeli a vércukrot, ezért szoros ellenőrzés kell.

### Forrásjegyzék: pattanó ujj

| # | Forrás | URL | Dátum |
|---|---|---|---|
| PU1 | NHS. **Trigger finger.** | https://www.nhs.uk/conditions/trigger-finger/ | felülvizsgálva 2025-11-17, következő 2028-11-17 |
| PU2 | AAOS OrthoInfo. **Trigger Finger.** | https://orthoinfo.aaos.org/en/diseases--conditions/trigger-finger/ | hozzáférés 2026-08-21 |
| PU3 | Lunsford D, Valdes K, Hengy S. **Conservative management of trigger finger: A systematic review.** J Hand Ther. 2019;32(2):212–221. PMID 29290504. | https://doi.org/10.1016/j.jht.2017.10.016 · https://pubmed.ncbi.nlm.nih.gov/29290504/ | 2019 |
| PU4 | Atthakomol P és mtsai. **Are There Differences in Pain Reduction and Functional Improvement Among Splint Alone, Steroid Alone, and Combination for the Treatment of Adults With Trigger Finger?** Clin Orthop Relat Res. 2023;481(11):2281–2294. PMID 37083487. | https://doi.org/10.1097/CORR.0000000000002662 · https://pubmed.ncbi.nlm.nih.gov/37083487/ | 2023 |
| PU5 | Minkhorst K, Munn A, MacDermid J, Grewal R. **Does Orthosis Improve Outcomes of Conservative Treatment in Trigger Fingers? A 3-Arm Prospective Randomized Controlled Trial.** Arch Phys Med Rehabil. 2025;106(12):1798–1806. PMID 40449569. | https://doi.org/10.1016/j.apmr.2025.05.015 · https://pubmed.ncbi.nlm.nih.gov/40449569/ | 2025 |
| PU6 | McKenna ES és mtsai. **Efficacy of Splinting in Managing Adult Trigger Finger: A Systematic Review of Short-Term Outcomes.** J Hand Surg Glob Online. 2026;8(1):100881. PMID 41362294. | https://doi.org/10.1016/j.jhsg.2025.100881 · https://pubmed.ncbi.nlm.nih.gov/41362294/ | 2026 |

---

## 6. De Quervain-szindróma (az „anyacsukló”)

**Mi ez.** A hüvelykujj mozgatásáért felelős két ín (APL és EPB) az első háti
rekeszben megvastagodott ínhüvelyben szorul; a súrlódás miatt fáj a csukló
hüvelykujj felőli oldala (AAOS OrthoInfo).

**Kiket érint.** Az AAOS OrthoInfo szerint leggyakrabban a 40-es és 50-es
éveikben járókat, nőket többször, mint férfiakat; összefüggésbe hozható a
terhességgel és a szülés utáni időszakkal, és **akiknél szülés után jelentkezik,
azok gyakran 4–6 héten belül veszik észre.** Rheumatoid arthritisben
hajlamosabbak rá. A pontos ok nem teljesen tisztázott, de a csukló és a hüvelykujj
mozdulatai (gépelés, telefonos írás, emelés) ronthatják.

> **Ez adja a magyar „anyacsukló” elnevezés forrásolt hátterét.** A cikkben így
> lehet írni: a köznyelvi „anyacsukló” arra utal, hogy a panasz gyakran szülés
> után jelentkezik, és a szakirodalom is összefüggésbe hozza a terhességgel és a
> szülés utáni időszakkal (AAOS OrthoInfo). Ennél többet ne állítsunk.

**Hogyan vizsgálják.** Finkelstein-, illetve Eichhoff-teszt: a hüvelykujjat a
tenyérbe hajtjuk, a többi ujjal ráfogunk, majd a csuklót a kisujj felé döntjük.
Ha fáj, felmerül a De Quervain-szindróma. Röntgen és ultrahang általában nem kell
(AAOS OrthoInfo). **Ezt a tesztet a cikkben csak leírni szabad, öndiagnózisra
ajánlani nem.**

**Konzervatív kezelés.** Az AAOS OrthoInfo sorrendje: a fájdalmat kiváltó
tevékenységek kerülése; levehető sín, amely a csuklót egyenesen és a hüvelykujjat
kényelmes helyzetben tartja, különösen éjszakára; jegelés 15 percig, 4–6 óránként,
közvetlenül bőrre soha; gyulladáscsökkentő szájon át vagy külsőleg;
kortikoszteroid injekció. Műtét akkor jön szóba, ha a panasz súlyos, vagy
**hat hét konzervatív kezelés után sem javul.**

**Mit mond a bizonyíték.** Három egymást részben átfedő összesítés áll
rendelkezésre, és **nem mondanak teljesen ugyanazt**. Ezt a cikkben őszintén
jelezni kell.

- Cavaleri és mtsai (2016, metaanalízis): a kortikoszteroid injekció és a
  kézterápia is javítja a fájdalmat és a funkciót a kiindulási állapothoz képest,
  de a kettő között **nem volt szignifikáns különbség** (6 vizsgálat).
  A **sín és injekció együtt** viszont szignifikánsan több beteget gyógyított
  eredményesen, mint a sín önmagában (RR 0,53; 95% CI 0,35–0,80) vagy az injekció
  önmagában (RR 0,76; 95% CI 0,64–0,89).
- Cuenca-Zaldívar és mtsai (2025, hálózati metaanalízis, 21 vizsgálat,
  1178 felnőtt): **a teljes idejű sínviselés és a kortikoszteroid injekció
  együttese végzett az élen** fájdalomban és funkcióban; **minden aktív kezelés
  jobb volt, mint a várólistás kontroll.** A bizonyosság szintje viszont
  alacsonytól nagyon alacsonyig terjed, és a vizsgálatok többsége magas torzítási
  kockázatú.
- Chong és mtsai (2024, hálózati metaanalízis, 14 randomizált vizsgálat):
  rövid távon **a sín önmagában, az injekció önmagában, a PRP és az akupunktúra
  nem különbözött szignifikánsan a placebótól** a fájdalomskálán; a szerzők
  szerint a kortikoszteroid injekció rövid rögzítéssel marad az elsődleges
  kezelés, az extrakorporális lökéshullám másodlagos lehetőség.

> **Nyitott kérdés a lektoráló gyógytornászoknak:** a sín önmagában hatékony-e
> rövid távon. A 2025-ös és a 2016-os összesítés szerint hozzátesz, a 2024-es
> szerint önmagában nem különbözik a placebótól. A cikk ezt a bizonytalanságot
> mondja ki, ne válasszon oldalt helyettük.

### Forrásjegyzék: De Quervain

| # | Forrás | URL | Dátum |
|---|---|---|---|
| DQ1 | AAOS OrthoInfo. **De Quervain's Tenosynovitis.** Szerzők: Sophia Kocher, MS; Erica Taylor, MD, MBA, FAAOS; lektor: Julie E. Adams, MD, FAAOS. | https://orthoinfo.aaos.org/en/diseases--conditions/de-quervains-tendinosis/ | hozzáférés 2026-08-21 |
| DQ2 | Cavaleri R, Schabrun SM, Te M, Chipchase LS. **Hand therapy versus corticosteroid injections in the treatment of de Quervain's disease: A systematic review and meta-analysis.** J Hand Ther. 2016;29(1):3–11. PMID 26705671. | https://doi.org/10.1016/j.jht.2015.10.004 · https://pubmed.ncbi.nlm.nih.gov/26705671/ | 2016 |
| DQ3 | Cuenca-Zaldívar JN és mtsai. **Conservative treatments for De Quervain's tenosynovitis: A systematic review and network meta-analysis.** J Hand Ther. 2025 (online, kötetszám még nincs). PMID 41298159. | https://doi.org/10.1016/j.jht.2025.09.001 · https://pubmed.ncbi.nlm.nih.gov/41298159/ | 2025 |
| DQ4 | Chong HH és mtsai. **Advancements in de Quervain Tenosynovitis Management: A Comprehensive Network Meta-Analysis.** J Hand Surg Am. 2024;49(6):557–569. PMID 38613563. | https://doi.org/10.1016/j.jhsa.2024.03.003 · https://pubmed.ncbi.nlm.nih.gov/38613563/ | 2024 |
| DQ5 | NHS. **Wrist pain** (a De Quervain a csuklófájdalom lehetséges okai közt szerepel). | https://www.nhs.uk/conditions/hand-pain/wrist-pain/ | felülvizsgálva 2025-11-05 |

---

## 7. Csuklótörés utáni rehabilitáció (distalis radius törés)

Ez a cikk a termék közvetlen belépője (`docs/kulcsszavak.md` 4. szakasz, 6. sor),
ezért itt a legfontosabb a pontosság.

**Az időzítés, amit a beteg keres.**

| Kérdés | Forrásolt válasz | Forrás |
|---|---|---|
| Mikor jön le a gipsz? | Ha nem kell műtét, a gipszet **jellemzően 4–6 héttel a törés után** veszik le, és ekkor kezdődik a gyógytorna | AAOS OrthoInfo |
| Mennyi a felépülés? | **Kb. 6–8 hét** a felgyógyulás, súlyosabb sérülésnél tovább | NHS |
| Mikor használhatom mindenre a csuklót? | A legtöbb törés **kb. 3 hónap** alatt gyógyul annyira, hogy a csukló minden tevékenységre használható | AAOS OrthoInfo |
| Mikor leszek teljesen jól? | **A teljes felépülés akár egy évig is tarthat** | AAOS OrthoInfo |
| Meddig merev a csukló? | Szinte mindenkinél marad merevség; ez a gipszlevétel vagy a műtét utáni egy-két hónapban javul a leginkább, **és legalább két évig tovább javul** | AAOS OrthoInfo |
| Mikor sportolhatok? | Könnyű mozgás (úszás, alsótest edzése) a gipszlevétel vagy műtét után **1–2 hónappal**; megterhelőbb sport (síelés, futball) a sérülés után **3–6 hónappal** | AAOS OrthoInfo |
| Mit kezdjek rögtön? | A gipsz vagy a műtét után **azonnal mozgatni kell az ujjakat.** Ha 24 órán belül a fájdalom vagy a duzzanat miatt nem lehet teljesen mozgatni az ujjakat, szólni kell az orvosnak | AAOS OrthoInfo |
| Mit tegyek otthon? | A kezet lehetőleg a könyök fölé emelve tartani, éjszaka párnával; a kapott gyakorlatokat elvégezni; a gipszet szárazon tartani | NHS |

**Kell-e felügyelt gyógytorna, vagy elég az otthoni program?** Ez a legfontosabb
kérdés a Kineticare szempontjából, és a válasz **őszintén árnyalt**:

- **AAOS és ASSH közös irányelve (2020):** *„Inconsistent evidence suggests no
  difference in outcomes between a home exercise program and supervised therapy
  following treatment for distal radius fractures.”* Ajánláserősség: **Limited**
  (korlátozott). Az irányelv szövege hozzáteszi, hogy jelenleg nincs elég
  bizonyíték annak eldöntésére, mely helyzetekben előnyösebb a felügyelt terápia,
  és hogy egy általános tiltás korlátozná a hozzáférést azoknak, akik profitálnának
  belőle.
- **Cochrane-áttekintés (2015, 26 vizsgálat, 1269 beteg):** a szerzők
  mind a 23 összehasonlítás bizonyítékát **alacsony vagy nagyon alacsony
  minőségűnek** minősítették, ami „considerable uncertainty”-t, jelentős
  bizonytalanságot jelent. A vizsgálatok többsége kicsi volt és magas torzítási
  kockázatú.

> Ez a Kineticare üzenetének **legjobban forrásolható** pontja: a legmagasabb
> szintű nemzetközi irányelv szerint egy jól összeállított **otthoni
> gyakorlatprogram eredménye nem különbözik igazolhatóan a felügyelt terápiától**
> csuklótörés után. Ezt pontosan így, az „inconsistent evidence” és a „Limited”
> minősítés kimondásával szabad idézni. Ígéretet nem szabad rá építeni.

**Amit az irányelvek a kezelésről mondanak (háttérnek, nem tanácsként).**
A NICE NG38 szerint felnőtteknél a hátrafelé elmozdult distalis radius töréseknél
mérlegelendő a helyretétel és a gipsz; a distalis radius torus (zöldgally jellegű)
töréseinél **nem szabad merev gipszet** használni. Az AAOS és ASSH 2020-as
irányelve **erős bizonyítékkal** mondja ki, hogy **65 év felett a műtéti kezelés
nem hoz jobb hosszú távú, beteg által jelentett eredményt**, mint a nem műtéti;
65 alatt a műtét közepes bizonyítékkal indokolt, ha a helyretétel után a radius
rövidülése 3 mm-nél nagyobb, a hátradőlés 10 foknál több, vagy az ízületi felszín
elmozdulása 2 mm-nél nagyobb. A rögzítési technikák között erős bizonyíték szerint
nincs jelentős különbség, bár a volaris zárócsavaros lemez rövid távon (3 hónap)
korábbi funkcionális felépülést ad.

**A NICE tájékoztatási előírása** (NG38, 1.6.10) jó váz a cikkhez: a betegnek
szóban és írásban meg kell kapnia a várható kimenetelt, a szokásos
tevékenységekhez való visszatérés idejét, azt, hogy mit tehet önmagáért, a
rehabilitáció menetét és a kapcsolattartót, valamint a terhelésre vonatkozó
tudnivalókat, kiemelve **„the importance of active patient participation for
achieving goals”**.

**Komplex regionális fájdalom szindróma (CRPS): óvatosan a számokkal.**
A gyakoriságra közölt adatok **nagyságrendekkel eltérnek** attól függően, milyen
kritériumrendszert használnak:

- Jellad és mtsai (2014), 90 gipszelt beteg: **32,2%** kapott CRPS I-et, átlagosan
  21,7 nappal a gipszlevétel után; a szerzők szerint a harmadik-negyedik héten
  a leggyakoribb, főleg erős fájdalmat jelző nőknél.
- Parkitny és mtsai (2022), 702 csukló- és kéztöréses résztvevő, 16 hét:
  **2,2%** felelt meg a szigorúbb budapesti kritériumoknak, **9,8%** az IASP
  kritériumainak.
- Serôdio és mtsai (2026) szisztematikus áttekintése: **nincs elég bizonyíték egy
  egységes megelőzési protokollhoz**; a korai aktív rehabilitáció és a fokozatos
  mobilizáció ígéretesnek tűnik, de a bizonyíték korlátozott és heterogén; a
  C-vitamin megítélése vitatott, a probiotikum és az aszpirin nem csökkentette az
  előfordulást.

> **Ezért a CRPS-ről a cikkben nem adunk százalékot.** Csak azt mondjuk ki, mit
> kell észrevenni, és hogy azonnal orvoshoz kell fordulni. Az NHS leírása szerint
> a CRPS-ben a fájdalom sokkal erősebb és tartósabb, mint a sérülés indokolná,
> az érintett terület bőre annyira érzékennyé válhat, hogy már egy érintés vagy
> hőmérséklet-változás is heves fájdalmat okoz, és a terület megduzzadhat,
> merevvé válhat, színe vagy hőmérséklete ingadozhat.

### Forrásjegyzék: csuklótörés

| # | Forrás | URL | Dátum |
|---|---|---|---|
| CST1 | NHS. **Broken arm or wrist.** | https://www.nhs.uk/conditions/broken-arm-or-wrist/ | felülvizsgálva 2023-05-26, következő 2026-05-26 |
| CST2 | AAOS OrthoInfo. **Distal Radius Fractures (Broken Wrist).** | https://orthoinfo.aaos.org/en/diseases--conditions/distal-radius-fractures-broken-wrist/ | hozzáférés 2026-08-21 |
| CST3 | American Academy of Orthopaedic Surgeons és American Society for Surgery of the Hand. **Management of Distal Radius Fractures. Evidence-Based Clinical Practice Guideline.** Elfogadta az AAOS igazgatótanácsa 2020-12-05-én, az ASSH tanácsa 2021-05-22-én. | https://www.aaos.org/globalassets/quality-and-practice-resources/distal-radius/drfcpg.pdf | 2020-12-05 |
| CST4 | Handoll HHG, Elliott J. **Rehabilitation for distal radial fractures in adults.** Cochrane Database Syst Rev. 2015;2015(9):CD003324. PMID 26403335. | https://doi.org/10.1002/14651858.CD003324.pub3 · https://pubmed.ncbi.nlm.nih.gov/26403335/ | 2015 |
| CST5 | NICE. **Fractures (non-complex): assessment and management.** NICE guideline NG38, Recommendations. | https://www.nice.org.uk/guidance/ng38/chapter/Recommendations | hozzáférés 2026-08-21 |
| CST6 | Jellad A, Salah S, Ben Salah Frih Z. **Complex regional pain syndrome type I: incidence and risk factors in patients with fracture of the distal radius.** Arch Phys Med Rehabil. 2014;95(3):487–492. PMID 24080349. | https://doi.org/10.1016/j.apmr.2013.09.012 · https://pubmed.ncbi.nlm.nih.gov/24080349/ | 2014 |
| CST7 | Parkitny L és mtsai. **Post-fracture serum cytokine levels are not associated with a later diagnosis of complex regional pain syndrome.** BMC Neurol. 2022;22(1):385. PMID 36224537. | https://doi.org/10.1186/s12883-022-02910-z · https://pubmed.ncbi.nlm.nih.gov/36224537/ | 2022 |
| CST8 | Serôdio IN és mtsai. **Preventing Complex Regional Pain Syndrome After Distal Radius Fracture: A Systematic Review of Rehabilitation and Clinical Prophylaxis Strategies.** J Funct Morphol Kinesiol. 2026;11(2):158. PMID 42029526. | https://doi.org/10.3390/jfmk11020158 · https://pubmed.ncbi.nlm.nih.gov/42029526/ | 2026 |
| CST9 | NHS. **Complex regional pain syndrome.** | https://www.nhs.uk/conditions/complex-regional-pain-syndrome/ | felülvizsgálva 2022-10-27; a jelzett felülvizsgálati határidő (2025-10-27) lejárt, ezért ezt az oldalt csak leíró tartalomra használd |

---

## 8. Csuklófájdalom (gépelés, terhelés)

Ehhez a cikkhez nincs külön irányelv, ezért az NHS wrist pain oldala az alap, és
a `docs/kulcsszavak.md` szerinti rokon kifejezéseket (alkarfájdalom, kézfájdalom)
is ez fedi.

**Az NHS lehetséges okai, tünet szerint** (ez a tábla átemelhető a cikk
szerkezetének vázául, de magyarul újraírva):

| Tünet | Lehetséges ok az NHS szerint |
|---|---|
| Hirtelen, éles csuklófájdalom, duzzanat, pattanó vagy roppanó hang a sérüléskor | törött csukló |
| Fájdalom, duzzanat és véraláfutás, nehéz mozgatni vagy fogni | rándult csukló |
| Tartós fájdalom, duzzanat és merevség a hüvelykujj tövénél, esetleg csomó | ínhüvelygyulladás (De Quervain) vagy artrózis |
| Éjjel erősödő sajgás, bizsergés, zsibbadás, gyenge hüvelykujj | kéztőalagút-szindróma |
| Sima tapintatú csomó a csukló tetején, néha fájdalmas | ganglion |

**Amit az NHS otthonra ajánl:** a csukló pihentetése; jégpakolás törölközőben,
legfeljebb 20 percig, 2–3 óránként; a kéz és a csukló finom mozgatása;
paracetamol vagy ibuprofén gél; ékszer levétele, ha duzzad a kéz; a fájdalmat
okozó tevékenység abbahagyása vagy csökkentése (gépelés, rezgő szerszám,
hangszer); sín, különösen éjszakára, patikából; segédeszközök a nehéz
feladatokhoz, például üvegnyitáshoz vagy zöldségvágáshoz.

**Amit az NHS kifejezetten tilt:** sérülés után az első 2–3 napban ne használjunk
melegítő pakolást vagy forró fürdőt; ne emeljünk nehezet, és ne szorítsunk meg
semmit erősen.

**A gyógyszertár szerepe.** Az NHS külön kiemeli, hogy a gyógyszerész tud
segíteni a fájdalomcsillapító és a sín kiválasztásában, és abban is, hogy kell-e
orvoshoz menni. Ez a magyar olvasónak is releváns, alacsony küszöbű lépés.

### Forrásjegyzék: csuklófájdalom

| # | Forrás | URL | Dátum |
|---|---|---|---|
| CSF1 | NHS. **Wrist pain.** | https://www.nhs.uk/conditions/hand-pain/wrist-pain/ | felülvizsgálva 2025-11-05, következő 2028-11-05 |
| CSF2 | NHS. **Hand pain** (áttekintő oldal: csukló, ujj, hüvelykujj, tenyér, kézhát). | https://www.nhs.uk/conditions/hand-pain/ | hozzáférés 2026-08-21 |
| CSF3 | AAOS 2024 CTS irányelv, a billentyűzethasználatról szóló konszenzus (lásd CTS2). | https://www.aaos.org/globalassets/quality-and-practice-resources/carpal-tunnel/carpal-tunnel-2024/cts-cpg.pdf | 2024-05-18 |

---

## 9. Vállfájdalom (rotátorköpeny, befagyott váll)

Ez az egyetlen téma, amelyre **magyar, hivatalos szakmai irányelv** is van, ráadásul
kifejezetten **gyógytornászoknak** írva. Ezt kell a cikk gerincévé tenni.

### 9.1 A magyar irányelv

**Belügyminisztérium egészségügyi szakmai irányelve a befagyott váll fizioterápiás
vizsgálatáról és kezeléséről.** Azonosító: 002327. Megjelent az Egészségügyi
Közlöny LXXVI. évfolyam 5. számában, 2026. február 24-én, az 562–590. oldalon.
Érvényes a megjelenést követő 3 évig. Társszerző tagozatok: Mozgásterápia és
fizioterápia, Ortopédia, Reumatológia. Tanácskozási joggal részt vett a
**Magyar Gyógytornász-Fizioterapeuták Társasága (MGYFT)**, amelynek a
`docs/tudastar-hangnem-es-technika.md` szerint mindkét gyógytornász tagja.

**Számok az irányelvből, betűhíven:**

- A válltáji fájdalom **a harmadik leggyakoribb mozgásszervi fájdalom**, a
  derékfájdalom és a térdfájdalom után. Globális gyakoriságának átlaga **16%**
  (0,67–55,2%).
- A primer adhesiv capsulitis (befagyott váll) gyakorisága **2–5,3%** az általános
  populációban, incidenciája **3–5% a nők körében**, életkori csúcsa
  **40–60 év között**.
- Az Egyesült Királyságban a munkaképes korú férfiak **8,2%-át**, a nők
  **10,1%-át** érinti.
- Cukorbetegeknél a befagyott váll gyakorisága **39%**.
- A befagyott vállban szenvedők **több mint 80%-ánál** kimutatható társbetegség.
  A leggyakoribbak: cukorbetegség, agyérbetegségek, pajzsmirigybetegségek,
  koszorúér-betegség, autoimmun betegségek, Dupuytren-kontraktúra,
  magas vérzsírszint.
- **Lefolyás:** a tünetek fellépésétől átlagosan **1–3 év**.
  „Várhatóan az érintettek **59%-a maradéktalanul meggyógyul**. A betegek
  **35%-ánál** enyhe vagy mérsékelt tünetekkel zajlik le az elváltozás,
  a betegek **6%-a** számol be súlyos tünetekről.” Kiújulás nem jellemző, az
  ellentétes oldali vállon **6–17%-ban** jelenhet meg 5 éven belül.
- **Három stádium:** I. a 2–9. hónap (éles fájdalom a mozgáspálya végén, alvászavar,
  még nincs jelentős mozgáskorlátozottság), II. a 4–12. hónap (a „fagyás
  folyamata”, több irányban beszűkülő mozgás, kifejezett fájdalom),
  III. a 12–42. hónap (a mozgások jelentős elvesztése, hegesedés, minimális
  gyulladás).

**Ajánlások, amelyeket a cikk közvetlenül használhat:**

- **Ajánlás9 (Erős ajánlás).** A vörös zászlók: daganat; akut trauma, ha még nem
  történt képalkotó vizsgálat; ízületi fertőzés; nem helyretett, ficamodott váll;
  polyarthritis. „Súlyos neurológiai tünetek (gerincvelői kompresszió) gyanúja
  esetén azonnal orvoshoz kell irányítani a beteget.”
- **Ajánlás16 (LE: 1b, Erős ajánlás).** A betegoktatás ajánlott a kórkép és a
  lefolyás természetéről, a vizsgálati eredményről, a tervezett kezelés
  módszereiről és ütemezéséről; a betegoktatás hozzájárulhat a sikeres terápiás
  eredményhez. Az irányelv nevesíti, mire terjedjen ki: a váll szöveti
  viszonyainak rövid bemutatása, a hajlamosító tényezők, a várható időtartam és
  kimenet, a megengedett mozgások, a váll kímélete és tehermentesítése, a tudatos
  testtartás, valamint **az otthon rendszeresen végzett mobilizáló és erősítő
  gyakorlatok jelentősége.**
- **Ajánlás12 (Erős ajánlás).** A vizsgálat után a beteget tájékoztatni kell a
  kezelés menetéről és a várható lefolyásról; cél, hogy a gyakorlatokat
  **otthoni torna (home exercises) formájában is** végezze, mert ezek rendszeres
  végzése hozzájárulhat a további ízületi mozgásfejlődéshez.
- **Ajánlás15 (LE: 3, Gyenge ajánlás).** A fizioterápia egyéni gyógytorna kezelés
  formájában ajánlott, hogy a beteg személyre szabott ellátást kapjon.
- **Ajánlás7 (LE: 1a, Erős ajánlás).** A speciális tesztek használata **nem
  ajánlott** a befagyott váll vizsgálatában; jelenleg nem ismert magasan
  megbízható speciális teszt erre a kórképre.
- **Ajánlás8 (LE: 1a, Erős ajánlás).** Validált, önbevallásos kérdőívek
  használata ajánlott: SPADI, valamint a DASH és a QuickDASH.
- **Első vonal.** „A betegellátás első vonalában a fizioterápia, a fizioterápia és
  kortikoszteroid injekció kombinációja alkalmazott”, a második vonalban az
  artroszkópos release, a hidrodilatáció és az altatásban végzett bemozgatás.
  Az irányelv bevezetője szerint a korai stádiumban a fizioterápia és a
  kortikoszteroid injekció kombinációja **„A” szintű terápiás evidencia.**

> **Ez a legerősebb magyar hivatkozásunk arra, hogy a betegoktatás és az otthoni
> gyakorlás szakmailag alátámasztott.** Erős ajánlás, 1b bizonyítékszinttel,
> magyar hatósági irányelvben, gyógytornászoknak írva.

### 9.2 A rotátorköpeny és a nemzetközi bizonyíték

- **Cochrane 2016 (Page és mtsai), manuálterápia és gyakorlatozás rotátorköpeny-
  betegségben:** 60 vizsgálat, 3620 résztvevő, de csak 10 érintette a fő
  összehasonlításokat, és **metaanalízist nem lehetett végezni** a klinikai
  sokféleség és a hiányos jelentés miatt. Az egyetlen magas minőségű,
  placebokontrollált vizsgálatban (120 résztvevő, krónikus rotátorköpeny-betegség)
  22 hétnél a fájdalom 100 pontos skálán a placebónál 17,3 ponttal, a
  manuálterápia és gyakorlatozás mellett 24,8 ponttal javult; a korrigált
  átlagkülönbség 6,8 pont (95% CI: -0,70 és 14,30 között), abszolút kockázatkülönbség 7%.
  Vagyis a különbség kicsi, és a konfidencia-intervallum a nullát is tartalmazza.
- **Cochrane 2016 (Page és mtsai), elektroterápiás módszerek:** 47 vizsgálat,
  2388 résztvevő; a vizsgálatoknak csak 23%-a volt alacsony torzítási kockázatú
  a fő szempontokban.
- **CSAW-vizsgálat (Beard és mtsai, Lancet 2018):** 313 beteg, 32 brit kórház.
  A szubakromiális dekompressziós műtét és a **placebo (csak artroszkópia)**
  között 6 hónapnál nem volt különbség az Oxford vállpontszámban (32,7 vs 34,2;
  átlagkülönbség -1,3; 95% CI: -3,9 és 1,3 között; p=0,3141). Mindkét sebészi csoport kicsi
  előnyt mutatott a kezelés nélküli csoporthoz képest, de a valódi és a
  látszatműtét között nem volt érdemi eltérés. **Fontos részlet a cikk számára:**
  a vizsgálatba csak olyanok kerültek be, akik már **végigcsináltak egy nem műtéti
  programot, benne gyakorlatterápiával és legalább egy szteroidinjekcióval.**
- Egy 31 Cochrane-áttekintést összegző munka (Franco és mtsai 2019) szerint az
  erősítő gyakorlatok, manuálterápiával vagy anélkül, közép- és hosszú távon a
  legnagyobb terápiás erejű beavatkozásnak bizonyultak vállfájdalomban.

**Amit az NHS mond a betegnek.** *„You usually need to do these things for 2 weeks
before shoulder pain starts to ease. It can take 6 months or longer to recover
from shoulder pain.”* Ajánlása: maradjon aktív, mozgassa finoman a vállát,
végezzen vállgyakorlatokat 6–8 héten át, hogy a fájdalom ne térjen vissza, és
**ne hagyja abba teljesen a váll használatát, mert az hátráltatja a gyógyulást.**

### Forrásjegyzék: váll

| # | Forrás | URL | Dátum |
|---|---|---|---|
| V1 | Belügyminisztérium. **Egészségügyi szakmai irányelv a befagyott váll fizioterápiás vizsgálatáról és kezeléséről.** Azonosító: 002327. Egészségügyi Közlöny LXXVI/5., 562–590. o. | https://jog.gov.hu/files/AGAZATI_KOZLONY/EGESZSEGUGYI_KOZLONY/2026/5/EGK_2026_005.pdf | 2026-02-24, 3 évig érvényes |
| V1b | Ugyanez a dokumentum az Egészségügyi Szakmai Kollégium portálján, Ortopédia Tagozat, külső publikus mappa. | https://kollegium.okfo.gov.hu/sites/eszk_portal/pfile/file?path=/tagozatok/44._Ortopedia/dokumentumok/kulso-publikus/a-befagyott-vall-fizioterapias-vizsgalatarol-es-kezeleserol | hozzáférés 2026-08-21 |
| V2 | NHS. **Shoulder pain.** | https://www.nhs.uk/conditions/shoulder-pain/ | felülvizsgálva 2023-05-22, következő 2026-05-22 |
| V3 | Page MJ, Green S, McBain B és mtsai. **Manual therapy and exercise for rotator cuff disease.** Cochrane Database Syst Rev. 2016;2016(6):CD012224. PMID 27283590. | https://doi.org/10.1002/14651858.CD012224 · https://pubmed.ncbi.nlm.nih.gov/27283590/ | 2016 |
| V4 | Page MJ és mtsai. **Electrotherapy modalities for rotator cuff disease.** Cochrane Database Syst Rev. 2016;2016(6):CD012225. PMID 27283591. | https://doi.org/10.1002/14651858.CD012225 · https://pubmed.ncbi.nlm.nih.gov/27283591/ | 2016 |
| V5 | Beard DJ és mtsai. **Arthroscopic subacromial decompression for subacromial shoulder pain (CSAW).** Lancet. 2018;391(10118):329–338. PMID 29169668. | https://doi.org/10.1016/S0140-6736(17)32457-1 · https://pubmed.ncbi.nlm.nih.gov/29169668/ | 2018 |
| V6 | Franco ESB és mtsai. **What do Cochrane Systematic Reviews say about conservative and surgical therapeutic interventions for treating rotator cuff disease?** Sao Paulo Med J. 2019;137(6):543–549. PMID 32159641. | https://doi.org/10.1590/1516-3180.2019.0275160919 · https://pubmed.ncbi.nlm.nih.gov/32159641/ | 2019 |
| V7 | Magyar Gyógytornász-Fizioterapeuták Társasága, hivatalos honlap. | https://mgyft.hu | hozzáférés 2026-08-21 |

---

## 10. „Mennyi idő alatt gyógyul?” Forrásolt válaszok egy táblázatban

Ez a Google saját kérdésdobozának kérdése, tehát a cikkekben H2-címként is
szerepelhet. **Minden sor forrásolt; ami nincs a táblázatban, arra nem adunk
időtartamot.**

| Panasz | Forrásolt időtartam | Forrás |
|---|---|---|
| Kéztőalagút-szindróma, sín | „akár 6 hét, mire javulni kezd” | NHS (CTS1) |
| Kéztőalagút-szindróma, magától | „néha magától rendeződik néhány hónap alatt, különösen terhesség esetén” | NHS (CTS1) |
| Kéztőalagút-szindróma, injekció | a hatás **3 hónapig biztosan, 6 hónapig kimutathatóan** tart | Cochrane 2023 (CTS4) |
| Kéztőalagút-szindróma, műtét után | a megszokott tevékenységekhez kb. **egy hónap**; szorító- és csippentőerő **2–3 hónap**, súlyos idegkárosodás után **6–12 hónap**; a teljes felépülés **akár egy év** | NHS (CTS1), AAOS OrthoInfo (CTS9) |
| Teniszkönyök | „általában pihenéssel elmúlik, de néha **egy évnél tovább** is eltarthat” | NHS (TK1) |
| Teniszkönyök, számokban | **52 hétnél** sikeres kimenetel: gyógytorna 91%, várakozás 83%, injekció 69% | Smidt 2002 (TK3) |
| Teniszkönyök, gyógytorna küszöbe | ha **6 hét** otthoni kezelés nem hozott javulást | NHS (TK1) |
| Teniszkönyök, műtét küszöbe | **6–12 hónap** eredménytelen kezelés után | NHS (TK1) |
| Teniszkönyök, nem műtéti siker | a betegek **kb. 80–95%-a** | AAOS OrthoInfo (TK2) |
| Pattanó ujj, sín | egyetlen ízület rögzítése **6–10 hétre** | Lunsford 2019 (PU3) |
| Pattanó ujj, konzervatív siker | összesen **68,9%**; enyhébb (1–2) fokozatnál **kb. 75%**, 3-as fokozatnál 60% | Minkhorst 2025 (PU5) |
| Pattanó ujj, műtét után | a seb néhány hét alatt gyógyul, a duzzanat és a merevség **4–6 hónap** alatt múlik el, a teljes felépülés érzete átlagosan **6 hónap** | AAOS OrthoInfo (PU2) |
| De Quervain, műtéti küszöb | ha **6 hét** konzervatív kezelés nem hozott javulást | AAOS OrthoInfo (DQ1) |
| De Quervain, szülés után | a panasz gyakran a szülést követő **4–6 héten belül** jelentkezik | AAOS OrthoInfo (DQ1) |
| Csuklótörés, gipsz | **4–6 hét**, ha nem kell műtét | AAOS OrthoInfo (CST2) |
| Csuklótörés, felépülés | **6–8 hét**, súlyosabb sérülésnél tovább | NHS (CST1) |
| Csuklótörés, teljes használat | **kb. 3 hónap**; a teljes felépülés **akár 1 év**; a merevség **legalább 2 évig** tovább javul | AAOS OrthoInfo (CST2) |
| Csuklótörés, sport | könnyű mozgás **1–2 hónap**, megterhelő sport **3–6 hónap** a sérülés után | AAOS OrthoInfo (CST2) |
| Vállfájdalom, általában | a javulás **2 hét** után indul, a felépülés **6 hónap vagy több** is lehet | NHS (V2) |
| Vállfájdalom, gyakorlatok | **6–8 hét** vállgyakorlat, hogy a fájdalom ne térjen vissza | NHS (V2) |
| Befagyott váll | a tünetek kezdetétől átlagosan **1–3 év**; az érintettek **59%-a** teljesen meggyógyul | BM irányelv 002327 (V1) |
| Befagyott váll, stádiumok | I.: 2–9. hónap, II.: 4–12. hónap, III.: 12–42. hónap | BM irányelv 002327 (V1) |

---

## 11. Amire nincs forrásunk, és a vezetőnek szóló nyitott kérdések

### 11.1 Amit ebből a forrásbázisból NEM lehet állítani

- **Gyógyulási arány a Kineticare kurzusára.** Nincs rá adat, és a mért vevőhang
  szerint pont az ilyen szám ütött vissza a versenytársnál
  (`docs/vevohang-es-hirdetesszoveg.md` 4. szakasz).
- **„A torna meggyógyítja a kéztőalagút-szindrómát.”** Az AAOS 2024-es irányelve
  ennek az ellenkezőjét sorolja fel a hosszú távú eredményekről (2.2/e pont).
- **„Az egérhasználat okozza a kéztőalagút-szindrómát.”** Az AAOS 2024 konszenzusa
  szerint a sok billentyűzethasználat és a kéztőalagút-szindróma között nincs
  igazolt összefüggés.
- **CRPS-százalék csuklótörés után.** A közölt gyakoriság 2,2% és 32,2% között
  szóródik a kritériumrendszertől függően (7. szakasz), ezért számot nem adunk.
- **Magyar kéz-specifikus szakmai irányelv.** Az Egészségügyi Szakmai Kollégium
  irányelvei között 2026-08-21-én kéz- vagy csuklóspecifikus fizioterápiás
  irányelvet nem találtunk; a befagyott váll irányelve (002327) az egyetlen
  közvetlenül releváns, gyógytornászoknak szóló magyar irányelv.
- **NICE CKS-idézet.** A NICE Clinical Knowledge Summaries oldalai
  (`cks.nice.org.uk`) 2026-08-21-én HTTP 403-mal válaszoltak, tehát nem tudtuk
  első kézből ellenőrizni a tartalmukat. **Ezért a cikkekben NICE CKS-re
  hivatkozni tilos, amíg valaki emberként meg nem nyitja és le nem ellenőrzi.**
  A NICE fő oldala (`nice.org.uk`) elérhető, onnan az NG38 ellenőrizve van.
- **egeszsegvonal.gov.hu.** Az NNGYK lakossági oldala 2026-08-21-én
  tanúsítványhibával, illetve HTTP 503-mal válaszolt, ezért tartalmát nem tudtuk
  ellenőrizni. Amíg ez így van, ne hivatkozzunk rá.
- **kezsebeszet.hu.** Parkolt domain, nem a Magyar Kézsebész Társaság oldala.
  A társaság élő oldala: http://www.kezsebesz.hu/ (ellenőrizve 2026-08-21).
  Klinikai állítás alátámasztására egyelőre nincs onnan idézhető dokumentumunk,
  a `docs/tudastar-hangnem-es-technika.md` 1.7 pontja szerinti szerzői
  hitelesítéshez (kongresszusi instruktori szerep) viszont használható.

### 11.2 Két pont, ami vezetői és szakmai döntést igényel

**a) Az AAOS 2024 kéztőalagút-irányelve a „gyakorlatozást”, a masszázst és a
manuálterápiát is felsorolja azok között, amelyek nem javítják a hosszú távú,
beteg által jelentett eredményt.** Ez a Kineticare fő terméke szempontjából
kényes, és nem lehet elhallgatni. Amit a forrás **nem** mond: hogy a strukturált
otthoni program rövid távon ne enyhítené a tüneteket, és azt sem, hogy bármelyik
konzervatív módszer jobb lenne a másiknál (ugyanez az irányelv mondja ki, hogy
**nincs jelentős különbség a konzervatív módszerek között**). A cikk hangneme
ezért nem lehet „ez meggyógyít”, hanem: rendezett, vezetett program, amíg a
műtéti döntés meg nem születik, és amíg a tünetek kezelhetők. **Kérdés a
vezetőnek és a két gyógytornásznak: elfogadjuk-e ezt a keretezést, és bekerül-e
maga az AAOS-megállapítás a cikkbe?** A javaslatom: **igen, kerüljön be**, mert
a szakmai renomé szempontjából az őszinteség többet ér, mint a hallgatás, és a
mért vevőhang szerint a túlígérés az, ami visszaüt.

**b) A De Quervain-szindrómánál a sín önmagában.** Három összesítés részben
ellentmond egymásnak (6. szakasz). A cikk ezt bizonytalanságként mondja ki, de
a lektoráló gyógytornászoknak érdemes dönteniük, melyik olvasatot tartják
helyesnek a saját gyakorlatuk alapján, és ezt jelezni a szövegben.

---

## 12. Forrásminősítés és karbantartás

### 12.1 Minőségi sorrend, amit ez a fájl követ

1. **Hivatalos irányelv.** BM/Egészségügyi Közlöny (002327), NICE NG38,
   AAOS és ASSH klinikai gyakorlati irányelvek, NHS.
2. **Szakmai szervezet.** AAOS OrthoInfo (AAOS-tagok írják és lektorálják, minden
   cikk alján ott a szerző és a lektor neve), MGYFT, Magyar Kézsebész Társaság.
3. **Lektorált közlemény.** Cochrane-áttekintések, Lancet, BMJ, British Journal
   of Sports Medicine, Journal of Hand Therapy, Journal of Hand Surgery,
   Clinical Orthopaedics and Related Research, Archives of Physical Medicine and
   Rehabilitation.

**Nem szerepel ebben a fájlban, és a cikkekben sem használható:** blog,
tartalommarketing-cikk, magánklinika saját oldala, gyártói vagy webshopoldal,
wikipédia önmagában. A 2026-08-21-i magyar keresés eredményének nagy része ilyen
volt, ezért maradt ki.

### 12.2 Elérhetőségi napló (2026-08-21)

| Domain | Állapot | Következmény |
|---|---|---|
| nhs.uk | HTTP 200, teljes szöveg | használható |
| orthoinfo.aaos.org | HTTP 200, teljes szöveg | használható |
| aaos.org (irányelv-PDF-ek) | HTTP 200, PDF letöltve és kivonatolva | használható |
| nice.org.uk (NG38) | HTTP 200 | használható |
| jog.gov.hu (Egészségügyi Közlöny) | HTTP 200, 3,3 MB PDF | használható |
| kollegium.okfo.gov.hu | HTTP 200, PDF letölthető | használható |
| pubmed.ncbi.nlm.nih.gov / eutils | HTTP 200, teljes absztraktok | használható |
| mgyft.hu | HTTP 200 | használható |
| kezsebesz.hu | HTTP 200 | használható (szerzői hitelesítéshez) |
| **cks.nice.org.uk** | **HTTP 403** | **nem idézhető** |
| **cochranelibrary.com** | **HTTP 403** | az áttekintések a PubMedről, teljes absztrakttal |
| **assh.org** | JavaScripttel töltődik, szöveg nem nyerhető ki | helyette AAOS OrthoInfo |
| **egeszsegvonal.gov.hu** | tanúsítványhiba, majd HTTP 503 | **nem idézhető** |
| **kezsebeszet.hu** | parkolt domain | **nem forrás** |
| doi.org → kiadói oldalak (Wiley, Oxford, LWW, BMJ, SAGE, SciELO, MDPI) | a DOI helyesen továbbirányít, de a kiadói oldal a mi gépünkről HTTP 403-at ad (bot-szűrés) | böngészőből működik; ezért minden lektorált közleménynél **PMID-et is megadtunk**, a `https://pubmed.ncbi.nlm.nih.gov/<PMID>/` cím mindig elérhető |

Minden DOI, folyóiratnév, évfolyam és oldalszám a PubMed hivatalos rekordjából
ellenőrizve, egyesével. A 403-as kiadói válaszok nem hibás hivatkozást jelentenek.

### 12.3 Karbantartás

- **Az NHS-oldalaknak lejárati dátumuk van.** A táblázatokban ott a „következő
  felülvizsgálat” dátuma. Amelyik lejár, azt újra kell nyitni, és a cikkben a
  dátumot frissíteni. **Már most lejárt:** NHS shoulder pain (2026-05-22),
  NHS broken arm or wrist (2026-05-26), NHS complex regional pain syndrome
  (2025-10-27). Ezek tartalma valószínűleg érvényes, de a hivatkozásnál ezt
  jelezni kell, és az első adandó alkalommal újra ellenőrizni.
- **A magyar irányelv (002327) 2029. február 24-ig érvényes.**
- **Az AAOS kéztőalagút-irányelve 2024-es, a distalis radius irányelv 2020-as.**
  Az AAOS jellemzően öt évente frissít, tehát a distalis radius irányelv
  frissülése hamarosan várható; érdemes fél évente ránézni.
- **Újramérés javasolt ütemezése:** fél évente, a `docs/kulcsszavak.md`
  6. szakaszának karbantartásával egy körben.
- Ha új téma kerül a tervbe, **előbb ide kerül a forrás**, csak utána születik meg
  a cikk.

---

## 13. Kötelező záró elem minden cikkben

A feladatkiírás szerint minden cikk tetején szerepelnie kell, hogy a szöveg
**lektorálandó vázlat**, és a két gyógytornász szakmai jóváhagyása előtt nem
publikálható. Technikailag ez azt jelenti, hogy a poszt `_status` mezője
**`draft`** marad (`docs/tudastar-hangnem-es-technika.md` 2.5 szakasz).

Emellett minden cikk aljára kerüljön a meglévő, a repóban már használt
óvatossági fordulat:

> A cikk általános tájékoztatás, nem helyettesíti a szakorvosi vizsgálatot és a
> személyre szabott kezelést. Ha bizonytalan vagy, vagy a tünetek romlanak,
> fordulj orvoshoz.

És a `docs/tudastar-hangnem-es-technika.md` 1.5 pontja szerinti szemlélet:
**mondd meg azt is, mikor NE csináld** a gyakorlatokat.
