# LEKTORÁLANDÓ VÁZLAT. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

> Ez a fájl a Tudástár 5. cikkének szövegváltozata (`docs/tudastar-tartalmi-terv.md`
> 4. szakasz és 6. szakasz, C5). A rekord `status` és `_status` mezője egyaránt
> `draft` marad, amíg Kiss Kata és Kocsis Kata a klinikai tartalmat jóvá nem hagyja.
> A cikk törzse a „Csukló- és kézfájdalom: mi okozhatja, és mit tehetsz?” H1-től a
> „Fontos tudnivaló” szakaszig tart. A H1 fölötti rész és az utolsó két szakasz
> (önteszt, jelzések a vezetőnek) a lektorálónak és az integrátornak szól, nem
> kerül be a `content` mezőbe.

## Felhasznált források (azonosítóval, a `docs/orvosi-forrasbazis.md` szerint)

| Azonosító | Forrás | Hol használtuk |
|---|---|---|
| CSF1 (= VZ2, = DQ5) | NHS. *Wrist pain* (Hand pain sorozat). https://www.nhs.uk/conditions/hand-pain/wrist-pain/ · felülvizsgálva 2025-11-05 · következő felülvizsgálat 2028-11-05 · hozzáférés 2026-08-21 | a leggyakoribb ok a csukló megütése vagy sérülése, az öt tünet-ok párosítás (törés, rándulás, De Quervain vagy artrózis, kéztőalagút, ganglion), „ne diagnosztizáld magad”, a törésgyanú kezelésének tilalma, a teljes otthoni tanácslista, a „mit ne” lista, a gyógyszerész szerepe, a háziorvosi és a sürgős lista minden tétele |
| CSF2 | NHS. *Hand pain* (áttekintő oldal). https://www.nhs.uk/conditions/hand-pain/ · hozzáférés 2026-08-21 | a kézfájdalom területek szerinti bontása: csukló, ujj, hüvelykujj, tenyér, kézhát |
| CSF3 (= CTS2) | American Academy of Orthopaedic Surgeons. *Management of Carpal Tunnel Syndrome. Evidence-Based Clinical Practice Guideline.* 2024-05-18. https://www.aaos.org/globalassets/quality-and-practice-resources/carpal-tunnel/carpal-tunnel-2024/cts-cpg.pdf | a billentyűzethasználatról szóló konszenzus, a bizonyíték minősége (Very Low), az ajánlás erőssége (Consensus), és az indoklás (nem volt magas vagy közepes minőségű vizsgálat, egy alacsony minőségű talált összefüggést) |
| CST1 (= VZ3) | NHS. *Broken arm or wrist.* https://www.nhs.uk/conditions/broken-arm-or-wrist/ · felülvizsgálva 2023-05-26 · a jelzett következő felülvizsgálat (2026-05-26) lejárt · hozzáférés 2026-08-21 | a törés tünetei, a röntgen szükségessége, a sürgős és az azonnali lista, a 6–8 hetes felépülés, a gipsz levétele utáni merevség és gyengeség, a gyógytornász szerepe |
| CTS1 | NHS. *Carpal tunnel syndrome.* https://www.nhs.uk/conditions/carpal-tunnel-syndrome/ · felülvizsgálva 2024-04-17 · következő felülvizsgálat 2027-04-17 · hozzáférés 2026-08-21 | a terhesség mint kockázati tényező, és hogy a terhesség miatt kialakult panasz néha néhány hónap alatt magától rendeződik |
| DQ1 | AAOS OrthoInfo. *De Quervain's Tenosynovitis.* Szerzők: Sophia Kocher, MS; Erica Taylor, MD, MBA, FAAOS. Lektor: Julie E. Adams, MD, FAAOS. https://www.orthoinfo.org/diseases--conditions/de-quervains-tendinosis/ · hozzáférés 2026-08-21 | a hüvelykujj felőli csuklófájdalom, az alkarba húzódó fájdalom, a terhességgel és a szülés utáni időszakkal való összefüggés, a szülés utáni 4–6 hét, a gyermek felemelése mint fájdalmas mozdulat |
| TK1 | NHS. *Tennis elbow.* https://www.nhs.uk/conditions/tennis-elbow/ · felülvizsgálva 2024-05-31 · következő felülvizsgálat 2027-05-31 · hozzáférés 2026-08-21 | az alkarfájdalom mint a teniszkönyök tünete, és a markolás meg a csukló, alkar ismétlődő csavarása mint kiváltó mozdulat |
| VZ1 (= ZS2) | NHS. *Stroke*, Symptoms aloldal. https://www.nhs.uk/conditions/stroke/symptoms/ · felülvizsgálva 2024-09-12 · következő felülvizsgálat 2027-09-12 · hozzáférés 2026-08-21 | a féloldali arclelógás, a karerőtlenség vagy karzsibbadás és az akadozó beszéd, valamint a 24 órán belüli tünetekre vonatkozó szabály |
| VZ5 | Hyatt BT, Bagg MR. *Flexor Tenosynovitis.* Orthop Clin North Am. 2017;48(2):217–227. PMID 28336044. | a Kanavel-féle négy jel mint a vizsgálat vezérfonala, a cukorbetegség és az érszűkület rosszabb kimenetele, a merevség és az amputáció |
| VZ6 | Langer MF és mtsai. *[Pyogenic Flexor Tenosynovitis].* Handchir Mikrochir Plast Chir. 2021;53(3):267–275. PMID 34134159. | a kéz egyik legsúlyosabb fertőzése, a négy jel meglétekor azonnali műtéti indikáció, a gyors felismerés és a gyors cselekvés |

**Ellenőrzés a forrásokon (2026-08-21, ezen cikk írásakor).** Mind a tíz forrást
visszaolvastuk az eredetiből, nem a forrásbázis összefoglalójából: a hat NHS-oldalt
és az AAOS OrthoInfo De Quervain-oldalát letöltve és teljes szövegre bontva, az
AAOS 2024-es kéztőalagút-irányelvét a hivatalos PDF-ből (a keresett szakasz:
„RISK FACTORS: KEYBOARDING, CLERICAL WORK”), a VZ5 és VZ6 közleményt a PubMed
E-utilities API absztraktjából. Minden idézett tétel szó szerint egyezik.

**Karbantartási jelzés a lektorálóknak.** Kettőt érdemes tudni a forrásokról.
A DQ1 forrásbázisbeli címe (`https://orthoinfo.aaos.org/en/…`) 2026-08-21-én
átirányít a `https://www.orthoinfo.org/diseases--conditions/de-quervains-tendinosis/`
címre; a cikk forrásjegyzékébe a működő, átirányítás utáni cím került. A CST1
(NHS, Broken arm or wrist) jelzett felülvizsgálati határideje 2026-05-26-án
lejárt, ezt a forrásjegyzékben ki is írjuk. A `docs/orvosi-forrasbazis.md`
javítása nem ennek a cikknek a fájl-tulajdona.

**Nem használt, tiltott tartalom.** A `csuklófájdalom lelki okai` és a
`kéz fájdalom lelki okai` kifejezésre van mért kereslet
(`docs/monid-adatok-teljes.md` 3.6 és 3.9), de a témára nincs forrásunk, ezért
egyetlen mondat sem szól róla. Öndiagnózis-fa nincs a szövegben. Gyógyszernév
csak annyiban szerepel, amennyiben az NHS-tanács része (paracetamol, ibuprofén
gél); adagolási tanács sehol. A magyar beutalórendet nem részletezzük, mert
arra nincs forrásunk. YouTube-link nincs a szövegben.

## Cikk-metaadatok (az integrátornak)

| Mező | Érték |
|---|---|
| `title` | Csukló- és kézfájdalom: mi okozhatja, és mit tehetsz? |
| `slug` | `csuklo-es-kezfajdalom` |
| `seoTitle` | Csukló fájdalom és kézfájdalom: okok, teendők otthon |
| `seoDescription` | Csukló fájdalom és kézfájdalom: mi állhat mögötte, mit tehetsz otthon az első napokban, és mikor kell orvoshoz fordulni. (120 karakter) |
| `excerpt` | Csukló fájdalom és kézfájdalom: sokféle ok állhat mögötte, a rándulástól a kéztőalagút-szindrómáig. Összeszedtük, mit sorol fel lehetséges okként az NHS, mit tehetsz otthon az első napokban, és mikor kell orvoshoz fordulni. Azt is leírjuk, mikor NE végezz gyakorlatokat. |
| Kategória | Kéz és csukló (`kez-es-csuklo`) |
| `publishedAt` | `2026-09-05T08:00:00.000Z` |
| Szerző | Kiss Kata |
| `relatedPosts` | `keztoalagut-szindroma` (C2), `pattano-ujj` (C4), `csuklotores-utani-gyogytorna` (C6) |
| `status` / `_status` | `draft` / `draft` |
| `heroImage`, `ogImage` | üresen marad |

**Belső linkek a törzsben:** `/blog/csuklotores-utani-gyogytorna`,
`/blog/de-quervain-szindroma`, `/blog/keztoalagut-szindroma`, `/blog/pattano-ujj`,
`/blog/miert-zsibbad-a-kezem`, `/blog/teniszkonyok`,
`/kurzusok/sos-kezrelax-villamkurzus`, `/kurzusok/otthoni-kezrehab-program`.
Egyik link sem áll magában bekezdésben, és egyik sem YouTube-cím.

---

# Csukló- és kézfájdalom: mi okozhatja, és mit tehetsz?

Ez a szöveg lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

Fáj a csuklód, amikor kinyitod az üveget. Este már a bögrét is óvatosan fogod meg.

Ha ez ismerős, jó eséllyel te is beírtad már a keresőbe, hogy csukló fájdalom vagy kéz fájdalom. Ebben a cikkben a csuklófájdalomról, a kézfájdalomról és az alkarfájdalomról is szó lesz.

Kiss Kata és Kocsis Kata vagyunk, gyógytornászok, és évek óta elsősorban a kéz rehabilitációjával foglalkozunk. Most azt szedtük össze, mi állhat a panasz mögött, és mit tehetsz otthon.

Egy dolgot előre tisztázunk. Ez a cikk nem mondja meg, mi bajod van. Azt írjuk le, mit állítanak a nemzetközi szakmai oldalak és irányelvek.

## Mi okozhat csukló- és kézfájdalmat?

A csuklófájdalomnak sokféle oka lehet, és a leggyakoribb a csukló megütése vagy sérülése. *(NHS, Wrist pain, 2025. november 5-i felülvizsgálat)*

Az NHS csuklófájdalom-oldala tünetek szerint sorolja fel a lehetséges okokat. Ez a lista tájékozódásra való, nem öndiagnózisra.

- Hirtelen, éles csuklófájdalom, duzzanat, és a sérüléskor hallott pattanó vagy roppanó hang: törött csukló lehet. *(NHS, Wrist pain)*
- Fájdalom, duzzanat és véraláfutás, nehéz mozgatni a csuklót vagy megfogni bármit: rándult csukló lehet. *(NHS, Wrist pain)*
- Tartós fájdalom, duzzanat és merevség a hüvelykujj tövénél, a csukló közelében, néha csomóval: ínhüvelygyulladás, vagyis De Quervain-szindróma vagy artrózis lehet. *(NHS, Wrist pain)*
- Éjjel erősödő sajgás, bizsergés vagy zsibbadás az ujjakban, a kézben és a karban, gyenge hüvelykujj: kéztőalagút-szindróma lehet. *(NHS, Wrist pain)*
- Sima tapintású, néha fájdalmas csomó a csukló tetején: ganglion lehet. *(NHS, Wrist pain)*

A hüvelykujj tövénél jelentkező panaszról külön is írtunk [a De Quervain-szindrómáról szóló cikkünkben](/blog/de-quervain-szindroma). Ha a fájdalom mellett éjszakai zsibbadás is van, akkor [a kéztőalagút-szindrómáról szóló cikkünk](/blog/keztoalagut-szindroma) áll közelebb hozzád.

Ha a csuklód eltört, és már túl vagy a gipszen, akkor [a csuklótörés utáni időszakról szóló cikkünket](/blog/csuklotores-utani-gyogytorna) olvasd tovább.

A kézfájdalmat az NHS terület szerint bontja: csukló, ujj, hüvelykujj, tenyér és kézhát. *(NHS, Hand pain)* Vagyis az első kérdés mindig az, hol fáj pontosan.

Ha az ujjad hajlításkor beakad, majd pattanással ugrik ki, arról [a pattanó ujjról szóló cikkünkben](/blog/pattano-ujj) olvashatsz. Ha a panasz inkább zsibbadás, akkor [a kézzsibbadásról szóló cikkünk](/blog/miert-zsibbad-a-kezem) a következő lépés.

Egy kérést az NHS külön kiír a csuklófájdalom-oldalán: ne próbáld magad megállapítani a fájdalom okát. *(NHS, Wrist pain)*

Ez nem óvatoskodás. Az NHS listáján a fájdalom és a duzzanat több lehetséges oknál is szerepel.

## Sérülés után fáj a csuklód? Ezt figyeld

Sérülés után otthonról nem lehet eldönteni, hogy törés, ficam vagy erős rándulás történt. Az NHS szerint ehhez általában röntgen kell. *(NHS, Broken arm or wrist, 2023. május 26-i felülvizsgálat)*

Az NHS szerint a törött kar vagy csukló a sérülés után hirtelen fájdalmassá, duzzadttá, véraláfutásossá és nehezen mozgathatóvá válik. *(NHS, Broken arm or wrist)*

Ehhez társulhat szín- vagy alakváltozás, és a terület zsibbadhat is. *(NHS, Broken arm or wrist)*

Ha törésre gyanakszol, ne kezeld magad otthon. *(NHS, Wrist pain)*

Az NHS ilyenkor azt kéri, hogy minél előbb kérj orvosi tanácsot. Minden lehetséges törést a lehető leghamarabb el kell látni. *(NHS, Broken arm or wrist)*

Aznap kérj orvosi ellátást, ha a sérült csukló nagyon fájdalmas. Ugyanígy sürgős, ha nem tudod használni a fájdalomtól, vagy ha a fájdalom romlik. *(NHS, Broken arm or wrist)*

Sürgős az ellátás nagy duzzanat vagy véraláfutás esetén is. Szintén az, ha a terület nagyon merev, vagy ha magas lázad van és hidegrázósan érzed magad. *(NHS, Broken arm or wrist)*

A törés utáni felépülés az NHS szerint általában 6–8 hét, súlyosabb sérülésnél tovább tart. *(NHS, Broken arm or wrist)*

A gipsz levétele után a csukló merev és gyenge lehet. A gyógytornász ebben tud segíteni, és a panasz néha több hónapig is elhúzódik. *(NHS, Broken arm or wrist)*

Erről az időszakról részletesen írtunk [a gipsz levétele utáni teendőkről szóló cikkünkben](/blog/csuklotores-utani-gyogytorna).

## Sokat gépelsz, emelsz vagy hangszeren játszol?

Az NHS csuklófájdalom-oldala azt tanácsolja, hogy hagyd abba vagy csökkentsd azt a tevékenységet, amitől fáj. Példaként a gépelést, a rezgő szerszám használatát és a hangszeres játékot említi. *(NHS, Wrist pain, 2025. november 5-i felülvizsgálat)*

Ez a tanács arról szól, mit érdemes most csökkenteni. Attól még nem biztos, hogy a gépelés okozta a panaszt.

Az AAOS 2024-es kéztőalagút-irányelvének munkacsoportja ezt írja: megbízható bizonyíték hiányában az a véleményük, hogy nincs összefüggés a sok billentyűzethasználat és a kéztőalagút-szindróma között. *(AAOS, Management of Carpal Tunnel Syndrome, 2024)*

Ennek a megállapításnak a bizonyítékminősége „nagyon alacsony”, az ajánlás erőssége pedig „konszenzus”. Vagyis szakértői vélemény, nem bizonyított tény. *(AAOS, 2024)*

Az indoklás is szerepel az irányelvben. Magas vagy közepes minőségű vizsgálatot nem találtak a kérdésre, egyetlen alacsony minőségű vizsgálat pedig talált statisztikailag jelentős összefüggést. *(AAOS, 2024)*

Ezért nem írjuk le, hogy az „egérkéz” okozza a panaszodat. Azt viszont igen, hogy a fájdalmat kiváltó mozdulat csökkentése az NHS otthoni tanácsai között szerepel. *(NHS, Wrist pain)*

Az alkarfájdalom külön kérdés. Két olyan állapot is van a forrásainkban, amelynél a fájdalom az alkarban jelentkezik.

A De Quervain-szindrómánál a fájdalom a csuklóban kezdődik, és felfelé, az alkar felé húzódhat. *(AAOS OrthoInfo, De Quervain's Tenosynovitis)*

A teniszkönyök tünetei között az NHS az alkar fájdalmát is felsorolja. Kiváltó mozdulatként a markolást és a csukló, illetve az alkar ismétlődő csavarását nevezi meg. *(NHS, Tennis elbow, 2024. május 31-i felülvizsgálat)*

Ha a fájdalom súlypontja a könyököd külső oldalán van, akkor [a teniszkönyökről szóló cikkünk](/blog/teniszkonyok) a következő olvasnivalód.

## Terhesség alatt vagy szülés után fáj a csuklód?

Terhesség alatt gyakoribb a kéztőalagút-szindróma: az NHS a terhességet a kockázati tényezők között sorolja fel. *(NHS, Carpal tunnel syndrome, 2024. április 17-i felülvizsgálat)*

Ugyanez az oldal azt is kimondja: a panasz néha néhány hónap alatt magától rendeződik. Ez különösen akkor igaz, ha a terhesség miatt alakult ki. *(NHS, Carpal tunnel syndrome)*

A hüvelykujj felőli csuklófájdalomnak is van szülés utáni mintázata. Az AAOS OrthoInfo szerint a De Quervain-szindróma összefüggésbe hozható a terhességgel és a szülés utáni időszakkal. *(AAOS OrthoInfo, De Quervain's Tenosynovitis)*

Akinél szülés után jelentkezik, az gyakran 4–6 héten belül veszi észre. *(AAOS OrthoInfo)*

Az AAOS OrthoInfo egy jellegzetes fájdalmas mozdulatot is megnevez. Magad elé nyújtott karral, felfelé néző hüvelykujjal emelsz valamit, például a gyermekedet. *(AAOS OrthoInfo)*

Ebből nem következik, hogy nálad is ez van. A kivizsgálás küszöbe terhesség alatt és szülés után is ugyanaz, amit az NHS a csuklófájdalomnál ír. *(NHS, Wrist pain)*

## Mit tehetsz otthon az első napokban?

A csuklófájdalom kezelése otthon az NHS listáján pihentetéssel, jegeléssel és a kéz kíméletes mozgatásával kezdődik. *(NHS, Wrist pain, 2025. november 5-i felülvizsgálat)*

Az NHS csuklófájdalom-oldala pontos otthoni listát ad. Ugyanezeket javasolja a háziorvos is enyhe csuklófájdalomnál vagy merevségnél. *(NHS, Wrist pain)*

- Pihentesd a csuklód, amikor tudod. *(NHS, Wrist pain)*
- Tegyél jégpakolást törölközőbe, és tartsd a csuklódon legfeljebb 20 percig, 2–3 óránként. *(NHS, Wrist pain)*
- Mozgasd a kezed és a csuklód kíméletesen: ez az NHS szerint enyhítheti az enyhe fájdalmat és merevséget. *(NHS, Wrist pain)*
- Fájdalomcsillapítóként az NHS a paracetamolt és az ibuprofén gélt említi. *(NHS, Wrist pain)*
- Vedd le az ékszereidet, ha duzzadtnak látod a kezed. *(NHS, Wrist pain)*
- Viselj sínt a csuklód megtámasztására, főleg éjszaka. Az NHS szerint sín a legtöbb gyógyszertárban kapható. *(NHS, Wrist pain)*
- Használj segédeszközt a nehéz feladatokhoz, például üvegnyitáshoz vagy zöldségvágáshoz. *(NHS, Wrist pain)*

Az NHS azt is kiírja, mit ne tegyél. Sérülés után az első 2–3 napban ne használj melegítő pakolást, és ne fürödj forró vízben. *(NHS, Wrist pain)*

Szintén kerülendő a nehéz emelés, és az, hogy bármit nagyon erősen megszoríts. *(NHS, Wrist pain)*

Gyógyszerről és adagolásról ebben a cikkben nem adunk tanácsot. Az NHS szerint a gyógyszerész tud segíteni abban, melyik fájdalomcsillapító a legjobb neked. *(NHS, Wrist pain)*

A sín kiválasztásában is a gyógyszerész az első segítség. Az NHS megemlíti a hajlékony gumisínt is arra az esetre, ha közben használnod kell a csuklód. *(NHS, Wrist pain)*

Ha egy rövid, vezetett kóstoló segítene a mozgatáshoz, ingyenesen elérhető [az SOS Kézrelax villámkurzus](/kurzusok/sos-kezrelax-villamkurzus). Ez a kézre, a csuklóra és a könyökre fókuszál.

## Milyen orvoshoz fordulj csuklófájdalommal, és mikor?

Az első lépés lehet a gyógyszertár. Az NHS szerint a gyógyszerész tud tanácsot adni a fájdalomcsillapítóról, a sínről, és arról is, kell-e orvoshoz menned. *(NHS, Wrist pain, 2025. november 5-i felülvizsgálat)*

Orvoshoz az NHS szerint akkor kell fordulni, ha a csuklófájdalom akadályoz a szokásos tevékenységeidben. *(NHS, Wrist pain)*

Ugyanígy akkor is, ha a fájdalom romlik, vagy újra és újra visszatér. *(NHS, Wrist pain)*

Menj orvoshoz, ha a fájdalom két hét otthoni kezelés után sem javult. *(NHS, Wrist pain)*

Bármilyen bizsergés vagy érzéskiesés esetén szintén orvosi vizsgálat kell. *(NHS, Wrist pain)*

Cukorbetegség mellett a kézpanasz komolyabb lehet, ezt az NHS külön kiemeli. *(NHS, Wrist pain)*

Orvoshoz kell menni akkor is, ha a csuklófájdalom mellett rosszul vagy és magas lázad van. Ugyanez érvényes, ha a csuklód fájdalmas, meleg, duzzadt és merev. *(NHS, Wrist pain)*

Melyik orvos? Nálunk a háziorvos az, aki megvizsgál, és ha kell, továbbküld a megfelelő szakrendelésre. Az ellátás pontos rendjéről az orvosod tud felvilágosítást adni.

A sorrendet mi is így kérjük. Előbb legyen kivizsgálás, és csak utána kezdődjön a rendszeres gyakorlás.

## Mikor NE végezd a gyakorlatokat?

Ne kezdj bele a gyakorlatokba, amíg a friss sérülés utáni csuklódat orvos meg nem nézte. Törésgyanú esetén az NHS szerint nem szabad otthon kezelni a csuklót. *(NHS, Wrist pain)*

Ne gyakorolj, ha a kezed egy részén vagy egészén megszűnt az érzés. Az NHS szerint ez sürgős ellátást igényel. *(NHS, Wrist pain)*

Sérülés után az első 2–3 napban ne melegítsd a területet, ne emelj nehezet, és ne szoríts meg semmit erősen. *(NHS, Wrist pain)*

Hagyd abba a gyakorlást, és menj orvoshoz, ha a fájdalom romlik, vagy ha két hét otthoni kezelés után sem javult. *(NHS, Wrist pain)*

A gyakorlatoknak nem kell fájniuk. Éles fájdalom esetén hagyd abba, és kérj szakmai segítséget.

Műtét után mindig a kezelőorvosod vagy a gyógytornászod jóváhagyásával kezdj bele. Egy mondatban: a kéztorna nem helyettesíti az orvosi kivizsgálást.

## Mikor menj azonnal orvoshoz?

Aznap kérj orvosi ellátást, ha a csuklófájdalom nagyon erős, ha a fájdalomtól rosszul vagy, vagy ha megszűnt az érzés a kezedben. *(NHS, Wrist pain, 2025. november 5-i felülvizsgálat)*

Az NHS csuklófájdalom-oldala tételesen felsorolja, mikor kell sürgős ellátás. *(NHS, Wrist pain)*

Sürgős az ellátás, ha a fájdalomtól ájulásérzésed, szédülésed vagy hányingered van. Ugyanez érvényes, ha rosszul, forrón, hidegen vagy hidegrázósan érzed magad. *(NHS, Wrist pain)*

Sürgős az ellátás akkor is, ha a sérüléskor reccsenő, csikorgó vagy pattanó hangot hallottál. *(NHS, Wrist pain)*

Szintén aznap kell orvoshoz menni, ha nem tudod mozgatni a csuklód, vagy ha nem tudsz megfogni semmit. *(NHS, Wrist pain)*

Ugyanígy sürgős, ha a csuklód alakja vagy színe megváltozott. *(NHS, Wrist pain)*

Sürgős ellátás kell, ha a csuklódon lévő csomó nagyon fájdalmas, forró vagy piros. A pirosság barna és fekete bőrön nehezebben látszik. *(NHS, Wrist pain)*

És sürgős akkor is, ha a kezed egy részén vagy egészén megszűnt az érzés. Az NHS szerint ezek törés vagy fertőzés jelei lehetnek. *(NHS, Wrist pain)*

Sérülés után négy jelnél azonnal mentőt kell hívni. Ezeket az NHS a mentőhívást igénylő jelek közé sorolja. *(NHS, Broken arm or wrist, 2023. május 26-i felülvizsgálat)*

- A kar vagy a csukló zsibbad, bizsereg. *(NHS, Broken arm or wrist)*
- A csont kiáll a bőrből. *(NHS, Broken arm or wrist)*
- A kar vagy a csukló alakja megváltozott, vagy furcsa szögben áll. *(NHS, Broken arm or wrist)*
- Erősen vérző seb van a területen. *(NHS, Broken arm or wrist)*

A magyar hívószám a 112.

Azonnali ellátás kell akkor is, ha az ujjad duzzadt, félig behajlítva áll, nyújtásra nagyon fáj, és az ínhüvely mentén nyomásérzékeny. Ez a négy jel gennyes ínhüvelygyulladásra utalhat. *(Hyatt és Bagg, 2017; Langer és mtsai, 2021)*

A gennyes ínhüvelygyulladás a kéz egyik legsúlyosabb fertőzése. A szakirodalom szerint a Kanavel-féle négy jel meglétekor azonnal fel kell állítani a műtéti indikációt. *(Langer és mtsai, 2021)*

Cukorbetegség és érszűkület mellett rosszabb a kimenetel. A lehetséges következmények között a merevség és az amputáció is szerepel. *(Hyatt és Bagg, 2017)*

Végül egy jel, ami nem a kézről szól. Ha az arcod egyik fele lelóg, az egyik karod erőtlen vagy zsibbadt, és akadozik a beszéded, azonnal hívj mentőt. *(NHS, Stroke, Symptoms, 2024. szeptember 12-i felülvizsgálat)*

Az NHS ehhez hozzáteszi: ha a tünetek elmúltak, de 24 órán belül jelen voltak, akkor is azonnali segítség kell. *(NHS, Stroke, Symptoms)*

## Két hét után sem jobb? Így tovább

Ha két hét otthoni kezelés után sem javult a csuklófájdalom, az NHS szerint orvoshoz kell fordulni. *(NHS, Wrist pain, 2025. november 5-i felülvizsgálat)*

Ez a két hét nem büntetés, hanem az NHS által megadott küszöb. Ugyanezen az oldalon szerepel az otthoni tanácsok listája is. *(NHS, Wrist pain)*

Ha a kivizsgálás nem talált sürgős okot, jöhet a fokozatos, rendszeres gyakorlás. Az NHS szerint a kéz és a csukló kíméletes mozgatása enyhítheti az enyhe fájdalmat és a merevséget. *(NHS, Wrist pain)*

A mozgatás módját, mértékét és ütemét viszont érdemes vezetve csinálni. Gyógytornászként ilyenkor azt nézzük meg, milyen terhelés éri a kezed, és ehhez igazítjuk a gyakorlást.

Otthon jellemzően nem a gyakorlat hiányzik. A sorrend és az adagolás az, ami nehéz egyedül.

## Mit ad egy vezetett otthoni program a csuklófájdalom mellé?

Rendszert és sorrendet ad a gyakorlásba, nem gyógyulást.

Az Otthoni KézRehab Programot csukló-, ujj-, alkar- és könyökpanaszokra állítottuk össze. 4 modulnyi videóanyagból áll, 50+ videós gyakorlattal.

A gyakorlatok 5 perces miniblokkokba vannak rendezve, hogy egy rövid alkalom is elférjen a napodban. A részleteket [az Otthoni KézRehab Program oldalán](/kurzusok/otthoni-kezrehab-program) találod.

Amit nem ígérünk: gyógyulást, gyógyulási arányt és gyógyulási időt. Erre nincs adatunk, és nem is állítunk ilyet.

Amit kínálunk: rendszerezett, vezetett alkalmakat arra az időszakra, amíg a kezelésről dönt az orvosod. A program nem helyettesíti a szakorvosi vizsgálatot.

Ha a panaszod zsibbadás is, akkor [a kéztőalagút-szindrómáról szóló cikkünk](/blog/keztoalagut-szindroma) a következő lépés. Ha az ujjad akad be, arról [a pattanó ujjról szóló cikkünkben](/blog/pattano-ujj) írtunk.

Ha nemrég vették le a gipszet a csuklódról, akkor [a csuklótörés utáni időszakról szóló cikkünk](/blog/csuklotores-utani-gyogytorna) való neked.

## Kik írták ezt a cikket?

Kiss Kata és Kocsis Kata vagyunk. Gyógytornászok, és évek óta elsősorban a kéz rehabilitációjával foglalkozunk.

Kiss Kata gyógytornász, manuálterapeuta, sportrehabilitációs tréner. Kocsis Kata gyógytornász, sportrehabilitációs tréner, gyógy- és sportmasszőr.

Mindketten elvégeztük 2024-ben Kate Thorn CHT distalis radius törés és De Quervain kurzusait. Ugyanebben az évben Daphne Xuan MPT „Functional Anatomy of the Hand” kurzusát is.

Oktatunk is. A „Bevezetés a kéz, a csukló- és könyökízület rehabilitációs lehetőségeibe” akkreditált tantermi képzés instruktorai vagyunk, 12 kreditpont, SZTK-A-33553/2024.

Ez a szakmai háttér a szerző hitelességét igazolja. A cikkben szereplő klinikai állítások mellett ettől függetlenül ott a forrás.

## Forrásjegyzék

- NHS. *Wrist pain.* https://www.nhs.uk/conditions/hand-pain/wrist-pain/ · felülvizsgálva 2025-11-05 · következő felülvizsgálat 2028-11-05 · hozzáférés: 2026-08-21.
- NHS. *Hand pain.* https://www.nhs.uk/conditions/hand-pain/ · hozzáférés: 2026-08-21.
- NHS. *Broken arm or wrist.* https://www.nhs.uk/conditions/broken-arm-or-wrist/ · felülvizsgálva 2023-05-26 · a jelzett következő felülvizsgálat (2026-05-26) lejárt · hozzáférés: 2026-08-21.
- NHS. *Carpal tunnel syndrome.* https://www.nhs.uk/conditions/carpal-tunnel-syndrome/ · felülvizsgálva 2024-04-17 · következő felülvizsgálat 2027-04-17 · hozzáférés: 2026-08-21.
- NHS. *Tennis elbow.* https://www.nhs.uk/conditions/tennis-elbow/ · felülvizsgálva 2024-05-31 · következő felülvizsgálat 2027-05-31 · hozzáférés: 2026-08-21.
- NHS. *Stroke: symptoms.* https://www.nhs.uk/conditions/stroke/symptoms/ · felülvizsgálva 2024-09-12 · következő felülvizsgálat 2027-09-12 · hozzáférés: 2026-08-21.
- American Academy of Orthopaedic Surgeons. *Management of Carpal Tunnel Syndrome. Evidence-Based Clinical Practice Guideline.* Elfogadta az AAOS igazgatótanácsa 2024. május 18-án. https://www.aaos.org/globalassets/quality-and-practice-resources/carpal-tunnel/carpal-tunnel-2024/cts-cpg.pdf · hozzáférés: 2026-08-21.
- AAOS OrthoInfo. *De Quervain's Tenosynovitis.* Szerzők: Sophia Kocher, MS; Erica Taylor, MD, MBA, FAAOS. Lektor: Julie E. Adams, MD, FAAOS. https://www.orthoinfo.org/diseases--conditions/de-quervains-tendinosis/ · hozzáférés: 2026-08-21.
- Hyatt BT, Bagg MR. *Flexor Tenosynovitis.* Orthopedic Clinics of North America. 2017;48(2):217–227. DOI: 10.1016/j.ocl.2016.12.010 · PMID 28336044 · https://pubmed.ncbi.nlm.nih.gov/28336044/ · hozzáférés: 2026-08-21.
- Langer MF, Grünert JG, Unglaub F, Ueberberg J, Glasbrenner J, Oeckenpöhler S. *Pyogene Beugesehnenscheideninfektion (Pyogenic Flexor Tenosynovitis).* Handchirurgie Mikrochirurgie Plastische Chirurgie. 2021;53(3):267–275. DOI: 10.1055/a-1472-1689 · PMID 34134159 · https://pubmed.ncbi.nlm.nih.gov/34134159/ · hozzáférés: 2026-08-21.

## Fontos tudnivaló

A cikk általános tájékoztatás, nem helyettesíti a szakorvosi vizsgálatot és a személyre szabott kezelést. Ha bizonytalan vagy, vagy a tünetek romlanak, fordulj orvoshoz.

---

## Állítás és forrás: a cikkíró öntesztje

> Ez a szakasz NEM része a cikknek, és nem kerül a `content` mezőbe. A
> `docs/tudastar-tartalmi-terv.md` 5.8 pontjának 2. elfogadási feltétele
> miatt készült: minden klinikai állítás mellett ott a forrás-azonosító, és
> minden szám szó szerint egyezik a forrással.

**Klinikai állítások, szakaszonként, forrás-azonosítóval.**

| # | Állítás | Forrás |
|---|---|---|
| 1 | A csuklófájdalomnak sokféle oka lehet, és a leggyakoribb a csukló megütése vagy sérülése | CSF1 |
| 2 | Hirtelen, éles fájdalom, duzzanat, a sérüléskor hallott pattanó vagy roppanó hang: törött csukló | CSF1 |
| 3 | Fájdalom, duzzanat, véraláfutás, nehéz mozgatás és fogás: rándult csukló | CSF1 |
| 4 | Tartós fájdalom, duzzanat, merevség a hüvelykujj tövénél, esetleg csomó: De Quervain vagy artrózis | CSF1 |
| 5 | Éjjel erősödő sajgás, bizsergés, zsibbadás, gyenge hüvelykujj: kéztőalagút-szindróma | CSF1 |
| 6 | Sima tapintású, néha fájdalmas csomó a csukló tetején: ganglion | CSF1 |
| 7 | Az NHS a kézfájdalmat terület szerint bontja: csukló, ujj, hüvelykujj, tenyér, kézhát | CSF2 |
| 8 | „Ne próbáld magad megállapítani a fájdalom okát” | CSF1 (= VZ2) |
| 9 | Sérülés után a törés, a ficam és az erős rándulás elkülönítéséhez általában röntgen kell | CST1 |
| 10 | A törött kar vagy csukló hirtelen fájdalmas, duzzadt, véraláfutásos és nehezen mozgatható lesz | CST1 |
| 11 | Ehhez szín- vagy alakváltozás és zsibbadás is társulhat | CST1 |
| 12 | Törésgyanúnál nem szabad otthon kezelni a csuklót | CSF1 |
| 13 | Törésgyanúnál minél előbb orvosi tanács kell; minden lehetséges törést a lehető leghamarabb el kell látni | CST1 |
| 14 | Sürgős ellátás: nagyon fájdalmas vagy használhatatlan végtag, romló fájdalom, nagy duzzanat vagy véraláfutás, nagyon merev terület, magas láz vagy hidegrázás | CST1 |
| 15 | A törés utáni felépülés általában 6–8 hét, súlyosabb sérülésnél tovább | CST1 |
| 16 | A gipsz levétele után a csukló merev és gyenge lehet; a gyógytornász segít; néha több hónapig is eltart | CST1 |
| 17 | Hagyd abba vagy csökkentsd a fájdalmat okozó tevékenységet: gépelés, rezgő szerszám, hangszer | CSF1 |
| 18 | A munkacsoport véleménye szerint, megbízható bizonyíték hiányában, nincs összefüggés a sok billentyűzethasználat és a kéztőalagút-szindróma között | CSF3 (= CTS2) |
| 19 | Ennek bizonyítékminősége „Very Low”, az ajánlás erőssége „Consensus” | CSF3 |
| 20 | Magas vagy közepes minőségű vizsgálat nem volt a kérdésre; egy alacsony minőségű vizsgálat talált statisztikailag jelentős összefüggést | CSF3 |
| 21 | De Quervain-szindrómánál a fájdalom a csuklóban kezdődik, és az alkar felé húzódhat | DQ1 |
| 22 | A teniszkönyök tünetei közt szerepel az alkarfájdalom; kiváltó a markolás és a csukló, alkar ismétlődő csavarása | TK1 |
| 23 | A terhesség a kéztőalagút-szindróma kockázati tényezői között szerepel | CTS1 |
| 24 | A panasz néha néhány hónap alatt magától rendeződik, különösen ha a terhesség miatt alakult ki | CTS1 |
| 25 | A De Quervain-szindróma összefüggésbe hozható a terhességgel és a szülés utáni időszakkal | DQ1 |
| 26 | Akinél szülés után jelentkezik, gyakran 4–6 héten belül veszi észre | DQ1 |
| 27 | Jellegzetes fájdalmas mozdulat: magad elé nyújtott kar, felfelé néző hüvelykujj, emelés (például a gyermek felemelése) | DQ1 |
| 28 | Otthoni tanács: pihentetés | CSF1 |
| 29 | Otthoni tanács: jégpakolás törölközőben, legfeljebb 20 perc, 2–3 óránként | CSF1 |
| 30 | Otthoni tanács: a kéz és a csukló kíméletes mozgatása enyhítheti az enyhe fájdalmat és merevséget | CSF1 |
| 31 | Otthoni tanács: paracetamol vagy ibuprofén gél mint fájdalomcsillapító | CSF1 |
| 32 | Otthoni tanács: ékszer levétele duzzadt kéznél | CSF1 |
| 33 | Otthoni tanács: sín a csukló megtámasztására, főleg éjszaka, a legtöbb gyógyszertárban kapható | CSF1 |
| 34 | Otthoni tanács: segédeszköz a nehéz feladatokhoz (üvegnyitás, zöldségvágás) | CSF1 |
| 35 | Tilalom: sérülés után az első 2–3 napban nincs melegítő pakolás és forró fürdő; nincs nehéz emelés és erős szorítás | CSF1 |
| 36 | A gyógyszerész tud segíteni a fájdalomcsillapító kiválasztásában | CSF1 |
| 37 | A gyógyszerész segít a sín kiválasztásában; van hajlékony gumisín is, ha használni kell a csuklót | CSF1 |
| 38 | Orvoshoz kell menni, ha a fájdalom akadályoz a szokásos tevékenységekben | CSF1 |
| 39 | Orvoshoz kell menni, ha a fájdalom romlik vagy újra és újra visszatér | CSF1 |
| 40 | Orvoshoz kell menni, ha a fájdalom két hét otthoni kezelés után sem javult | CSF1 |
| 41 | Orvoshoz kell menni bármilyen bizsergés vagy érzéskiesés esetén | CSF1 |
| 42 | Cukorbetegség mellett a kézpanasz komolyabb lehet | CSF1 |
| 43 | Orvoshoz kell menni, ha a fájdalom mellett rosszullét és magas láz van | CSF1 |
| 44 | Orvoshoz kell menni, ha a csukló fájdalmas, meleg, duzzadt és merev | CSF1 |
| 45 | Sürgős: nagyon erős csuklófájdalom | CSF1 |
| 46 | Sürgős: ájulásérzés, szédülés, hányinger a fájdalomtól, illetve rosszullét, forró vagy hideg érzés, hidegrázás | CSF1 |
| 47 | Sürgős: reccsenő, csikorgó vagy pattanó hang a sérüléskor | CSF1 |
| 48 | Sürgős: a csukló nem mozgatható, semmit nem lehet megfogni | CSF1 |
| 49 | Sürgős: a csukló alakja vagy színe megváltozott | CSF1 |
| 50 | Sürgős: nagyon fájdalmas, forró vagy piros csomó a csuklón; a pirosság barna és fekete bőrön nehezebben látszik | CSF1 |
| 51 | Sürgős: megszűnt érzés a kéz egy részén vagy egészén; ezek törés vagy fertőzés jelei lehetnek | CSF1 |
| 52 | Mentőhívás sérülés után: zsibbadó vagy bizsergő kar és csukló | CST1 |
| 53 | Mentőhívás sérülés után: a csont kiáll a bőrből | CST1 |
| 54 | Mentőhívás sérülés után: alakváltozás vagy furcsa szög | CST1 |
| 55 | Mentőhívás sérülés után: erősen vérző seb | CST1 |
| 56 | Azonnali ellátás: duzzadt, félig behajlítva tartott, nyújtásra nagyon fájó, az ínhüvely mentén nyomásérzékeny ujj | VZ5, VZ6 |
| 57 | A gennyes ínhüvelygyulladás a kéz egyik legsúlyosabb fertőzése; a Kanavel-féle négy jel meglétekor azonnali műtéti indikáció | VZ6 |
| 58 | Cukorbetegség és érszűkület mellett rosszabb a kimenetel; merevség és amputáció is előfordulhat | VZ5 |
| 59 | Féloldali arclelógás, karerőtlenség vagy karzsibbadás és akadozó beszéd esetén azonnal mentő | VZ1 |
| 60 | Ha a stroke tünetei elmúltak, de 24 órán belül jelen voltak, akkor is azonnali segítség kell | VZ1 |
| 61 | A két hetes küszöb az NHS csuklófájdalom-oldaláról származik, és ugyanott szerepel az otthoni tanácsok listája | CSF1 |
| 62 | A kéz és a csukló kíméletes mozgatása enyhítheti az enyhe fájdalmat és a merevséget | CSF1 |

**Klinikai állítás forrás nélkül: 0 darab.**

**Ami forrás nélkül szerepel a szövegben, és miért nem klinikai állítás.**

- A nyitókép (üvegnyitás, bögre) és a „ez a cikk nem mondja meg, mi bajod van”
  mondat: szerkesztői keret, nem állít semmit a betegségről.
- A belső linkeket bevezető mondatok: navigáció, nem klinikai tartalom.
- „Nálunk a háziorvos az, aki megvizsgál, és ha kell, továbbküld”: általános
  ellátási megfogalmazás. A C5 kiírás kifejezetten ezt kéri, és tiltja a magyar
  beutalórend részletezését, mert arra nincs forrás.
- „A sorrendet mi is így kérjük”, „Gyógytornászként ilyenkor azt nézzük meg”:
  a saját gyakorlatunk leírása, nem bizonyíték-állítás
  (`docs/seo-geo-llm.md` 2.3, elsőszemélyű tapasztalat).
- „Otthon jellemzően nem a gyakorlat hiányzik, a sorrend és az adagolás az, ami
  nehéz egyedül”: a mért vevőhangból származó megfigyelés
  (`docs/vevohang-es-hirdetesszoveg.md` 3.), nem klinikai állítás.
- „A gyakorlatoknak nem kell fájniuk”, „Műtét után mindig a kezelőorvosod vagy a
  gyógytornászod jóváhagyásával kezdj bele”: a repó meglévő óvatossági
  fordulatai (`src/scripts/restore-legacy-content.ts`).
- Kurzus-tények (4 modulnyi videóanyag, 50+ videós gyakorlat, 5 perces
  miniblokkok, csukló-, ujj-, alkar- és könyökpanaszok): a repóban élő
  termékleírásból, `src/scripts/restore-legacy-content.ts`.
- Szerzői hitelesítők (végzettség, Kate Thorn CHT és Daphne Xuan MPT kurzusai,
  akkreditált képzés, 12 kreditpont, SZTK-A-33553/2024):
  `docs/tudastar-hangnem-es-technika.md` 1.7. Ezek a szerző hitelességét
  igazolják, nem klinikai állítást.

## A vezetőnek szóló jelzések

> Ez a szakasz sem része a cikknek.

**1. Egy H2-vel több, mint a kiírásban.** A C5 kiírás hét H2-t ad. A cikkben
nyolc tartalmi H2 van: külön szakasz lett a „Terhesség alatt vagy szülés után
fáj a csuklód?” kérdés. Indok: a kiírás klaszterében szerepel a
`csuklófájdalom terhesség alatt` autocomplete-alak
(`docs/monid-adatok-teljes.md` 3.9), és a témára két forrásunk is van (CTS1 a
kéztőalagútra, DQ1 a De Quervainre). Egy önálló, kérdés-alakú H2 idézhetőbb,
mint egy bekezdés egy másik szakasz közepén (`docs/seo-geo-llm.md` 2.1).
A kiírás minden H2-je megvan, egyik sem maradt ki.

**2. A „Mikor NE végezd a gyakorlatokat?” a vörös zászlók elé került.** Ugyanaz
a sorrend, mint a C4 cikkben, hogy a két „mikor állj meg” szakasz egymás mellett
legyen.

**3. Forrás-karbantartás.** A DQ1 (AAOS OrthoInfo) címe átirányít a
`www.orthoinfo.org` domainre, a CST1 (NHS, Broken arm or wrist) jelzett
felülvizsgálati határideje 2026-05-26-án lejárt. Mindkettő jelölve a cikk
forrásjegyzékében. A `docs/orvosi-forrasbazis.md` frissítése más ügynök
fájl-tulajdona.

**4. Amit szándékosan nem írtunk le.** Gyógyulási arány, gyógyulási idő és
diagnózis nincs a szövegben. A csuklófájdalom „kezelése” szó a vevő szavaként
szerepel, de mindig otthoni kezelés vagy orvosi kezelés értelemben, ígéret
nélkül. A `lelki okai` keresésekre nincs mondat, mert nincs forrás. Az
öndiagnózis-fa helyett az NHS tünetlistája szerepel, kimondott
öndiagnózis-tilalommal.

**5. Mért nyelvi számok (a `docs/tudastar-hangnem-es-technika.md` függelékének
módszerével, a cikk törzsére, a forrásjegyzék nélkül).** 2 025 szó, 194 mondat,
átlagos mondathossz 10,4 szó, medián 10, a mondatok 88,1%-a legfeljebb 15 szó,
a leghosszabb mondat 21 szó, 30 szónál hosszabb mondat 0. Kvirtmínusz (—)
0 darab. Gondolatjelként használt nagykötőjel 0 darab: mind az 5 nagykötőjel
tartomány (6–8 hét, 4–6 hét, 2–3 óránként, és kétszer az első 2–3 nap).
Idézőjel: 5 nyitó „ és 5 záró ”, magyar alsó-felső pár. Magázó alak: 0.
A vevő szavai a törzsben: fájdalom 43, gyakorlat 6, kezelés 5, alkalom 1,
alkalmakat 1.
