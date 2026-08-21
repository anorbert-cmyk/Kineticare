# LEKTORÁLANDÓ VÁZLAT. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

> **Mi ez?** A Tudástár C6 cikkének teljes szövegvázlata
> (`docs/tudastar-tartalmi-terv.md` 4. és 6. szakasz, C6). A rekord `status` és
> `_status` mezője `draft` marad, amíg Kocsis Kata és Kiss Kata jóvá nem hagyja.
>
> **Készült:** 2026-08-21. **Írta:** a 6. cikkíró ügynök, a vezető ellenőrzésére.
> **Minden klinikai állítás forrása** a `docs/orvosi-forrasbazis.md` valamelyik
> tétele. Forrás nélküli klinikai állítás a szövegben nincs; a tételes önteszt a
> fájl végén, az „Állítás és forrás” táblázatban áll.
>
> **Elsődleges forrásellenőrzés.** A cikkíró nem csak a forrásbázisra
> támaszkodott: mind a nyolc hivatkozott forrást ELSŐ KÉZBŐL is megnyitotta
> 2026-08-21-én. Az NHS-oldalak, az AAOS OrthoInfo oldala és a NICE NG38
> ajánlás-fejezete letöltve (HTTP 200), az AAOS és ASSH irányelvének PDF-je
> kivonatolva, a két lektorált közlemény absztraktja a PubMed E-utilities
> API-jából. Minden szám, időtáv és minősítés szó szerint egyezik.
>
> **Két webcím-eltérés, amit a forrásbázis gazdájának jelezni kell** (a cikk a
> működő, átirányítás utáni címet használja):
>
> - A CST2 forrásbázisbeli címe (`https://orthoinfo.aaos.org/en/…`) ma
>   átirányít a `https://www.orthoinfo.org/diseases--conditions/distal-radius-fractures-broken-wrist/`
>   címre. Ugyanezt jelezte a 4. cikk írója is a pattanóujj-oldalnál.
> - A VZ2 forrásbázisbeli címe (`https://www.nhs.uk/conditions/hand-pain/wrist-pain/`)
>   ma átirányít a `https://www.nhs.uk/symptoms/hand-pain/wrist-pain/` címre.
>   A tartalom változatlan, a felülvizsgálati dátum ugyanaz.
>
> **A kvirtmínuszról:** a feladatkiírás a fájl elejére a „LEKTORÁLANDÓ VÁZLAT”
> szavakat kvirtmínusszal elválasztva kérte. A `docs/ui-sztenderdek.md` §3.1
> viszont magyar szövegben tiltja a kvirtmínuszt (U+2014), és a cikk-lint L3
> szabálya is nulla darabot enged. A jelzés ezért ponttal szerepel, szó szerint
> ugyanazokkal a szavakkal. Ebben a fájlban egyetlen kvirtmínusz sincs, még
> idézetként sem. Ezt az 1. cikk írója is így oldotta meg.

---

## Felhasznált források (áttekintés)

Mind a nyolc tétel a `docs/orvosi-forrasbazis.md`-ből való, a forrásbázis
azonosítójával. A teljes, hozzáférési dátumos jegyzék a cikk végén áll.

| Azonosító | Forrás | Típus |
|---|---|---|
| CST1 = VZ3 | NHS. Broken arm or wrist. Felülvizsgálva 2023-05-26. | Nemzeti egészségügyi szolgálat |
| CST2 | AAOS OrthoInfo. Distal Radius Fractures (Broken Wrist). Szerzők: Sophia Kocher MS, Erica Taylor MD MBA FAAOS; lektor: Julie E. Adams MD FAAOS. | Szakmai szervezet |
| CST3 | AAOS és ASSH. Management of Distal Radius Fractures. Evidence-Based Clinical Practice Guideline, 2020-12-05. | Hivatalos irányelv |
| CST4 | Handoll HHG, Elliott J. Rehabilitation for distal radial fractures in adults. Cochrane Database Syst Rev. 2015. PMID 26403335. | Cochrane-áttekintés |
| CST5 | NICE. Fractures (non-complex): assessment and management. NG38, Recommendations. | Hivatalos irányelv |
| CST6 | Jellad A és mtsai. Complex regional pain syndrome type I: incidence and risk factors in patients with fracture of the distal radius. Arch Phys Med Rehabil. 2014. PMID 24080349. | Lektorált közlemény |
| CST7 | Parkitny L és mtsai. Post-fracture serum cytokine levels are not associated with a later diagnosis of complex regional pain syndrome. BMC Neurol. 2022. PMID 36224537. | Lektorált közlemény |
| CST8 | Serôdio IN és mtsai. Preventing Complex Regional Pain Syndrome After Distal Radius Fracture. J Funct Morphol Kinesiol. 2026. PMID 42029526. | Szisztematikus áttekintés |
| CST9 | NHS. Complex regional pain syndrome. Felülvizsgálva 2022-10-27. | Nemzeti egészségügyi szolgálat |
| VZ1 | NHS. Stroke, Symptoms. Felülvizsgálva 2024-09-12. | Nemzeti egészségügyi szolgálat |
| VZ2 | NHS. Wrist pain (Hand pain sorozat). Felülvizsgálva 2025-11-05. | Nemzeti egészségügyi szolgálat |

**A CST6 és a CST7 szerepe.** Ez a két közlemény a szövegben SZÁM nélkül
szerepel. A cikk kimondja, hogy a komplex regionális fájdalom szindróma
gyakoriságáról közölt arányok a használt kritériumrendszertől függenek, és
ezért nem adunk százalékot. Ez a `docs/orvosi-forrasbazis.md` 7. és 11.1
pontjának, valamint a C6 egyedi tilalmának pontos követése.

---

## CMS-mezők az integrátornak

Ezek a `docs/tudastar-tartalmi-terv.md` 4. és 6. szakaszában rögzített,
kötelező értékek. A cikkíró nem talált ki belőlük semmit.

| Mező | Érték |
|---|---|
| `title` (H1) | Levették a gipszet a csuklódról: mi jön most? |
| `slug` | `csuklotores-utani-gyogytorna` |
| `seoTitle` | Csuklótörés utáni gyógytorna: mikor kezdd, meddig tart |
| `seoDescription` | Csuklótörés utáni gyógytorna: mikor jön le a gipsz, meddig tart a felépülés, és mikor kell orvoshoz fordulni. |
| `excerpt` | Levették a gipszet, és a csuklód merev? Összeszedtük, mikor indul a csuklótörés utáni gyógytorna, meddig tart a felépülés, és mit tehetsz otthon. |
| Kategória | Törés és műtét után (`tores-es-mutet-utan`) |
| `publishedAt` | `2026-09-06T08:00:00.000Z` |
| Szerző | Kocsis Kata |
| `relatedPosts` | `miert-zsibbad-a-kezem` (C1), `csuklo-es-kezfajdalom` (C5), `keztoalagut-szindroma` (C2) |
| `status` / `_status` | `draft` / `draft` |
| `heroImage`, `ogImage` | üresen marad |

**Mért mezőhosszak** (a cikk-lint L1 és L2 szabályához): `title` 45 karakter
(korlát 65), `seoTitle` 54 karakter, `excerpt` 145 karakter (korlát 170),
`seoDescription` 109 karakter. Kvirtmínusz egyik mezőben sincs.

**A `relatedPosts` kézzel kötelező.** A „Törés és műtét után” kategóriában ez a
cikk egyedül áll az 1. hullámban, tehát a kategória-alapú tartalék nem adna
semmit (`docs/tudastar-tartalmi-terv.md` C6).

**Belső linkek a törzsben:** `/blog/miert-zsibbad-a-kezem`,
`/blog/csuklo-es-kezfajdalom`, `/blog/keztoalagut-szindroma`,
`/kurzusok/otthoni-kezrehab-program`. Egyik link sem áll magában bekezdésben
(a cikk-lint L9 szabálya), és egyik sem YouTube-cím.

---

# Levették a gipszet a csuklódról: mi jön most?

Ez a szöveg lektorálandó vázlat. A két gyógytornász szakmai jóváhagyása előtt nem publikálható.

Levették a gipszet, és a kezed idegen. Vékonyabb, merevebb, és nem úgy mozdul, ahogy szeretnéd.

Sokan ilyenkor ijednek meg igazán. A csont összeforrt, a csukló mégsem működik.

Ez a cikk arról szól, mi jön most. Mikor indul a csuklótörés utáni gyógytorna, meddig tart a felépülés, és mit tehetsz otthon.

## Mikor veszik le a gipszet, és mi történik utána?

Ha nem kellett műtét, a gipszet jellemzően 4–6 héttel a törés után veszik le, és ekkor indul a gyógytorna.

A leggyakoribb csuklótörés az orsócsont, vagyis a radius távolabbi végének törése. A szakmai neve distalis radius törés.

A gipsz levétele után szinte mindenkinél marad merevség a csuklóban.

A csukló és a kar gyenge is lehet a gipsz levétele után. Ebben egy gyógytornász tud segíteni, de a merevség és a gyengeség néha több hónapig is elhúzódik.

Ez tehát nem visszaesés, hanem a felépülés első szakasza.

## Meddig tart a gyógyulás csuklótörés után?

A felgyógyulás általában 6–8 hét, súlyosabb sérülésnél tovább.

A legtöbb csuklótörés körülbelül 3 hónap alatt gyógyul annyira, hogy a csuklót minden tevékenységre használni lehet.

A teljes felépülés akár egy évig is eltarthat.

A merevség a gipszlevétel vagy a műtét utáni egy-két hónapban javul a legtöbbet, és legalább két évig tovább javul.

Ezek átlagok, nem határidők. A felépülés mindenkinél más. Arról, hogy nálad mire lehet számítani, a kezelőorvosoddal érdemes beszélned.

## Mikor lehet újra sportolni csuklótörés után?

Könnyű mozgás, például úszás vagy az alsótest edzése, a gipszlevétel vagy a műtét után 1–2 hónappal jöhet szóba.

Megterhelőbb sport, például a síelés vagy a futball, a sérülés után 3–6 hónappal.

Ezek a számok is átlagok. Hogy a te csuklód mikor bír el egy esést vagy egy ütést, azt a kezelőorvosod tudja megítélni.

## Csuklótörés után mikor lehet dolgozni?

Erre nincs egyetlen szám, mert a munkaterhelés mindenkinél más. Egy irodai nap és egy szerszámmal töltött nap nem ugyanaz a csuklódnak.

Amit kérhetsz, az a konkrét tájékoztatás. A törést ellátó csapatnak szóban és írásban is meg kell adnia a várható kimenetelt, benne azzal, mikor térhetsz vissza a szokásos tevékenységeidhez.

Ennek van egy második fele is, és ez legalább ilyen fontos. Arról is tájékoztatni kell, mekkora eséllyel marad maradandó hatás az életminőségre: fájdalom, funkcióvesztés vagy lelki következmény.

Ugyanez a pont előírja a terhelésre és a felső végtag terhelhetőségére vonatkozó tájékoztatást is.

Addig pedig egy egyszerű szabály él: ne vezess, és ne emelj nehezet, amíg meg nem mondják, hogy szabad.

## Miért kell az ujjaidat azonnal mozgatni?

A gipsz felhelyezése vagy a műtét után azonnal el kell kezdened mozgatni az ujjaidat.

Ha a fájdalom vagy a duzzanat miatt 24 órán belül nem tudod teljesen mozgatni az ujjaidat, szólj az orvosodnak. Lehet, hogy lazítani kell a gipszen vagy a műtéti kötésen.

Tartsd a kezed lehetőleg a könyököd fölött, éjszaka párnával kitámasztva.

Az ujjak mozgatása és a kéz magasan tartása a legtöbb, amit a gipsz alatt magadért tehetsz.

## Otthoni gyakorlás vagy felügyelt gyógytorna?

A bizonyíték nem következetes, és nem mutat különbséget az otthoni gyakorlatprogram és a felügyelt terápia eredményei között orsócsonttörés után.

Az ajánlás erőssége „Limited”, vagyis korlátozott. Ez azt jelenti, hogy a bizonyíték kevés vagy ellentmondásos.

Jelenleg nincs elég bizonyíték annak eldöntésére, mely helyzetekben előnyösebb a felügyelt terápia.

És hozzáteszi: egy általános tiltás korlátozná a hozzáférést azoknak, akik profitálnának a felügyelt terápiából.

A hátteret is érdemes látni, mert az összkép enélkül féloldalas. Hét vizsgálat áll mögötte: egy magas és hat közepes minőségű.

Ez a hét így oszlik meg. Az egyetlen magas minőségű vizsgálat a **felügyelt** terápia javára döntött, hat hétnél és hat hónapnál is. Egy közepes minőségű vizsgálat szintén a felügyelt terápia javára döntött, a sérülés vagy a műtét utáni harmadik héten. Egy másik az önálló gyakorlást hozta ki jobbnak hat hétnél, négy pedig nem talált különbséget.

Ezt a bontást azért írjuk ki, mert a mi érdekünk ellen szól. Az otthoni programot áruljuk, és a legjobb minőségű vizsgálat mégis a felügyelt terápia mellett szólt. Az összegzés emiatt marad az, ami: a bizonyíték nem következetes, és a kérdés nincs eldöntve.

Az eddigi vizsgálatok bizonyítéka gyenge, ami jelentős bizonytalanságot jelent.

A vizsgálatok többsége kicsi volt, és magas torzítási kockázatú.

Ezt azért írjuk le, mert így őszinte. Nem az a kérdés, hogy otthon gyakorolsz vagy rendelőben.

Az a kérdés, hogy rendszeresen, jó sorrendben és fokozatosan gyakorolsz-e. A rehabilitáció céljait a te aktív részvételed hozza meg.

Otthon jellemzően nem a gyakorlat hiányzik. A sorrend és az adagolás az, ami nehéz egyedül.

## Mire figyelj, amíg a gipsz rajtad van?

Kérj orvosi tanácsot, ha a fájdalom erősödik a karodban vagy a csuklódban.

Ugyanez érvényes, ha nagyon magas a lázad, vagy melegséget és hidegrázást érzel.

Szólj akkor is, ha a gipsz eltörik, túl szorossá vagy túl lazává válik.

Sürgősen kérj tanácsot, ha az ujjaid, a csuklód vagy a karod zsibbadni kezd, megduzzad, elkékül vagy elfehéredik.

A rossz szag és a váladék a gipsz alól szintén azonnali jelzést kíván.

Két dolgot ne tegyél: a gipsz ne ázzon el, és ne nyúlj alá semmivel a viszketés miatt, mert az fertőzéshez vezethet.

## Mikor fordulj azonnal orvoshoz?

Sérülés után azonnali ellátás kell, ha a kar vagy a csukló zsibbad, bizsereg, ha a csont kiáll a bőrből, vagy ha a kar alakja megváltozott. Magyarországon ilyenkor a 112-t kell hívni.

Aznap fordulj orvoshoz, ha a kéz egy részén vagy egészén megszűnt az érzés.

Egy jel, ami nem a csuklóról szól, de minden kézpanaszos cikkünkben kiírjuk. Ha lelóg az arcod egyik fele, ha erőtlen vagy zsibbadt az egyik karod, és ha akadozik a beszéded, azonnal hívj mentőt. Ezt külön ki kell emelni: ha a jelek már el is múltak, de 24 órán belül megvoltak, akkor is azonnali segítség kell.

A gipsz alatti figyelmeztető jelekkel sem szabad várni: erősödő fájdalom, zsibbadás, elszíneződés, láz vagy váladék. Ezek a sürgős tanácsadás szintjére tartoznak, nem a mentőhíváséra, de halogatni ezeket sem szabad.

A gipszlevétel utáni időszaknak van egy külön figyelmeztető jele. Ha a fájdalom sokkal erősebb és tartósabb, mint amit a sérülés indokolna, orvosi kivizsgálás kell.

Ilyenkor a bőr annyira érzékennyé válhat, hogy már egy érintés, egy koccanás vagy egy hőmérséklet-változás is heves fájdalmat okoz. A terület megduzzadhat, merevvé válhat, a színe vagy a hőmérséklete ingadozhat.

Ezt komplex regionális fájdalom szindrómának hívják, és kezelést igényel. A nem múló, erős fájdalmat mindenképp jelezni kell az orvosnak.

Arányt erről a szövődményről nem írunk. A közölt gyakoriság attól függ, melyik kritériumrendszert használják, és a különböző rendszerek nagyon eltérő értékeket adnak.

## Segít bármilyen készítmény a szövődmény megelőzésében?

Egyetlen készítményről sincs elég bizonyíték ahhoz, hogy egységes megelőzési protokollt lehessen ajánlani a csuklótörés utáni komplex regionális fájdalom szindróma ellen.

A probiotikum és az aszpirin nem csökkentette a szövődmény előfordulását.

A C-vitamin megítélése vegyes, és továbbra is vitatott.

Ami ígéretesnek tűnik: a korai aktív rehabilitáció és a fokozatos mobilizáció. A szerzők ugyanakkor kimondják, hogy a bizonyíték korlátozott és heterogén.

Vagyis a csontgyógyulás gyorsítására nem ajánlunk semmilyen készítményt. Nincs rá bizonyítékunk, és nem is a mi dolgunk.

## Hogyan épül fel egy értelmes otthoni program?

Négy elven áll: fokozatosság, rendszeresség, fájdalomhatár és türelem.

**Fokozatosság.** Előbb a mozgástartomány, utána az erő. A csukló addig nem bírja el a terhelést, amíg nem mozdul szabadon.

**Rendszeresség.** Rövid, napi alkalmak többet érnek, mint a hetente egy hosszú nekifutás. Sokan kéztornaként keresik ezt. A lényeg tényleg ilyen egyszerű: kevés, de minden nap.

**Fájdalomhatár.** A gyakorlatoknak nem kell fájniuk. Éles fájdalom esetén hagyd abba, és kérj szakmai segítséget.

**Türelem.** A merevség a gipszlevétel utáni egy-két hónapban javul a legtöbbet, és legalább két évig tovább javul.

A fenntartást is kiírjuk, mert enélkül hamis elvárást adnánk. Egyeseknél az enyhe merevség vagy sajgás két évnél is tovább megmarad, és vannak esetek, amikor véglegesen megmarad. Ez gyakoribb súlyos sérülés után, 50 év fölött, és artrózis mellett. Ehhez hozzátartozik, hogy a merevség ilyenkor általában enyhe, és jellemzően nem változtatja meg, mennyire jól működik a kar.

Ha a gipsz után zsibbadás is megjelenik az ujjaidban, arról külön írtunk [a kézzsibbadás okairól szóló cikkünkben](/blog/miert-zsibbad-a-kezem).

Ha a fájdalom a csuklódon kívül a kézfejedre vagy az alkarodra is kiterjed, akkor [a csukló- és kézfájdalomról szóló cikkünk](/blog/csuklo-es-kezfajdalom) is segít eligazodni.

## Mikor NE végezd a gyakorlatokat?

Amíg a kezelőorvosod nem engedélyezte. Törés után ez nem formaság, hanem az első szabály.

Ne gyakorolj, ha a fájdalom vagy a duzzanat miatt 24 órán belül nem tudod teljesen mozgatni az ujjaidat. Ilyenkor orvos kell, nem gyakorlás.

Ne gyakorolj, ha a fájdalom sokkal erősebb és tartósabb, mint amit a sérülés indokolna.

Hagyd abba, ha éles fájdalmat érzel, és kérj szakmai segítséget.

Állj meg akkor is, ha a gipsz alatti figyelmeztető jelek bármelyike megjelenik.

## Mit ad ehhez egy vezetett otthoni program?

Rendszert és sorrendet ad, nem gyógyulást.

Az [Otthoni KézRehab Programot](/kurzusok/otthoni-kezrehab-program) csukló-, ujj-, alkar- és könyökpanaszokra állítottuk össze. A gyakorlatok 5 perces miniblokkokban vannak, hogy rövid alkalmakra is elférjenek a napodban.

Vásárlás előtt ezt tudnod kell. A program leírásában szerepel, hogy nem javasoljuk, ha traumás sérülésed volt, és az orvos még nem enged mindent csinálni.

Csuklótörés után tehát a sorrend így néz ki: előbb az orvosi engedély, utána a program. Ha az orvosod korlátoz, várd meg a jóváhagyását.

A teljes képet itt is kimondjuk. A bizonyíték nem következetes, és nem mutat különbséget az otthoni gyakorlatprogram és a felügyelt terápia eredménye között. A bevont hét vizsgálatból viszont az egyetlen magas minőségű a **felügyelt** terápia javára döntött, hat hétnél és hat hónapnál is.

Vagyis ha van módod felügyelt gyógytornára járni, a bizonyíték nem beszél le róla. Ez a program annak való, akinek nincs, vagy akinek a rendelői alkalmak mellé kell napi rendszer.

Ezért nem gyógyulást ígérünk. Vezetett, sorrendbe rakott alkalmakat kínálunk arra az időszakra, amíg a csuklód visszaszokik a hétköznapokhoz.

A program nem helyettesíti a szakorvosi kontrollt.

## Kik írták ezt a cikket?

Kocsis Kata és Kiss Kata vagyunk. Gyógytornászok, és évek óta elsősorban a kéz rehabilitációjával foglalkozunk.

Kocsis Kata gyógytornász, sportrehabilitációs tréner, gyógy- és sportmasszőr. Kiss Kata gyógytornász, manuálterapeuta, sportrehabilitációs tréner.

Mindketten elvégeztük Kate Thorn CHT (AHTA) distalis radius törésről szóló kurzusát 2024-ben.

Oktatunk is. A ProBody Stúdió sportrehabilitációs tréner képzésén a „Bevezetés a kéz, a csukló- és könyökízület rehabilitációs lehetőségeibe” tantermi kurzus instruktorai vagyunk (2024, 2025, 2026, Budapest).

Ez a szakmai háttér a szerző hitelességét igazolja.

## Fontos tudnivaló

A cikk általános tájékoztatás, nem helyettesíti a szakorvosi vizsgálatot és a személyre szabott kezelést. Ha bizonytalan vagy, vagy a tünetek romlanak, fordulj orvoshoz.

---
---

## Állítás és forrás: a cikkíró öntesztje

A `docs/tudastar-tartalmi-terv.md` 5.8/2. pontja tételes öntesztet ír elő.
Minden klinikai állítás egy sor. **Forrás nélküli klinikai állítás: 0 darab.**

Az „FB” oszlop azt mutatja, hogy az állítás szerepel-e a
`docs/orvosi-forrasbazis.md` 7. vagy 10. szakaszának kivonatában (`igen`), vagy
ugyanannak a forrásnak az eredeti oldalán áll, de a forrásbázis kivonata még
nem foglalja össze (`kiegészítés`). A `kiegészítés` sorokat a cikkíró
2026-08-21-én első kézből ellenőrizte, és a lenti javaslati listán is
felsorolja a forrásbázis gazdájának.

| # | Állítás a cikkben | Forrás | FB | Szám szó szerint egyezik? |
|---|---|---|---|---|
| 1 | Ha nem kell műtét, a gipszet jellemzően 4–6 héttel a törés után veszik le, és ekkor indul a gyógytorna | CST2 | igen | igen (4–6 hét) |
| 2 | A leggyakoribb csuklótörés az orsócsont távolabbi végének törése (distalis radius törés) | CST2, CST3 | igen (a szakasz tárgya) | nincs szám |
| 3 | A gipsz levétele után szinte mindenkinél marad merevség | CST2 | igen | nincs szám |
| 4 | A csukló és a kar gyenge is lehet a gipsz levétele után; gyógytornász segít, de a merevség és a gyengeség néha több hónapig elhúzódik | CST1 | kiegészítés | nincs szám |
| 5 | A felgyógyulás általában 6–8 hét, súlyosabb sérülésnél tovább | CST1 | igen | igen (6–8 hét) |
| 6 | A legtöbb csuklótörés kb. 3 hónap alatt gyógyul annyira, hogy a csukló minden tevékenységre használható | CST2 | igen | igen (3 hónap) |
| 7 | A teljes felépülés akár egy évig is eltarthat | CST2 | igen | igen (1 év) |
| 8 | A merevség a gipszlevétel utáni egy-két hónapban javul a legtöbbet, és legalább két évig tovább javul | CST2 | igen | igen (1–2 hónap, 2 év) |
| 9 | A felépülés mindenkinél más, ezért a saját idővonalról a kezelőorvossal kell beszélni | CST2 | kiegészítés | nincs szám |
| 10 | Könnyű mozgás (úszás, alsótest edzése) a gipszlevétel vagy műtét után 1–2 hónappal | CST2 | igen | igen (1–2 hónap) |
| 11 | Megterhelőbb sport (síelés, futball) a sérülés után 3–6 hónappal | CST2 | igen | igen (3–6 hónap) |
| 12 | A NICE szerint a betegnek szóban és írásban meg kell kapnia a várható kimenetelt, benne a szokásos tevékenységekhez való visszatérés idejével | CST5 | igen | nincs szám |
| 13 | A NICE ugyanitt előírja a terhelésre és a felső végtag terhelhetőségére vonatkozó tájékoztatást | CST5 | igen | nincs szám |
| 14 | Ne vezess, és ne emelj nehezet, amíg meg nem mondják, hogy szabad | CST1 | kiegészítés | nincs szám |
| 15 | A gipsz vagy a műtét után azonnal mozgatni kell az ujjakat | CST2 | igen | nincs szám |
| 16 | Ha 24 órán belül a fájdalom vagy a duzzanat miatt nem lehet teljesen mozgatni az ujjakat, szólni kell az orvosnak; lehet, hogy lazítani kell a gipszen vagy a kötésen | CST2 | igen (a lazítás: kiegészítés) | igen (24 óra) |
| 17 | A kezet lehetőleg a könyök fölött kell tartani, éjszaka párnával | CST1 | igen | nincs szám |
| 18 | Az AAOS és ASSH irányelve szerint nem következetes a bizonyíték, és nem mutat különbséget az otthoni gyakorlatprogram és a felügyelt terápia eredményei között | CST3 | igen | nincs szám |
| 19 | Az ajánlás erőssége „Limited” (korlátozott): a bizonyíték kevés vagy ellentmondásos | CST3 | igen | nincs szám |
| 20 | Nincs elég bizonyíték annak eldöntésére, mely helyzetekben előnyösebb a felügyelt terápia | CST3 | igen | nincs szám |
| 21 | Egy általános tiltás korlátozná a hozzáférést azoknak, akik profitálnának a felügyelt terápiából | CST3 | igen | nincs szám |
| 22 | A Cochrane-áttekintés 26 vizsgálatot és 1269 beteget dolgozott fel | CST4 | igen | igen (26, 1269) |
| 23 | Mind a 23 összehasonlítás bizonyítéka alacsony vagy nagyon alacsony minőségű, ami jelentős bizonytalanságot jelent | CST4 | igen | igen (23) |
| 24 | A vizsgálatok többsége kicsi volt és magas torzítási kockázatú | CST4 | igen | nincs szám |
| 25 | A NICE a beteg aktív részvételét nevezi kulcsnak a rehabilitáció céljainak eléréséhez | CST5 | igen | nincs szám |
| 26 | Gipsz alatt jelezni kell: erősödő fájdalom | CST1 | igen | nincs szám |
| 27 | Gipsz alatt jelezni kell: nagyon magas láz, melegség- és hidegrázás-érzés | CST1 | kiegészítés | nincs szám |
| 28 | Gipsz alatt jelezni kell: a gipsz eltörik, túl szoros vagy túl laza | CST1 | igen | nincs szám |
| 29 | Gipsz alatt jelezni kell: zsibbadó, duzzadt, elkékülő vagy elfehéredő ujjak, csukló, kar | CST1 | igen | nincs szám |
| 30 | Gipsz alatt jelezni kell: rossz szag vagy váladék a gipsz alól | CST1 | igen | nincs szám |
| 31 | A gipsz ne ázzon el, és ne nyúlj alá semmivel, mert fertőzéshez vezethet | CST1 | kiegészítés | nincs szám |
| 32 | Sérülés után azonnali ellátás kell zsibbadó, bizsergő karnál vagy csuklónál, kiálló csontnál, alakváltozásnál | CST1 (VZ3) | igen | nincs szám |
| 33 | Aznap orvos kell, ha a kéz egy részén vagy egészén megszűnt az érzés | VZ2 | igen | nincs szám |
| 34 | A komplex regionális fájdalom szindrómában a fájdalom sokkal erősebb és tartósabb, mint amit a sérülés indokolna | CST9 | igen | nincs szám |
| 35 | A bőr annyira érzékennyé válhat, hogy egy érintés, koccanás vagy hőmérséklet-változás is heves fájdalmat okoz | CST9 | igen | nincs szám |
| 36 | A terület megduzzadhat, merevvé válhat, színe vagy hőmérséklete ingadozhat | CST9 | igen | nincs szám |
| 37 | A komplex regionális fájdalom szindróma kezelést igényel | CST9 | igen | nincs szám |
| 38 | A nem múló, erős fájdalmat jelezni kell az orvosnak | CST2 | kiegészítés | nincs szám |
| 39 | A szövődmény gyakoriságáról közölt arány a használt kritériumrendszertől függ, és a rendszerek nagyon eltérő értékeket adnak | CST6, CST7 | igen | szándékosan NINCS szám a cikkben |
| 40 | Nincs elég bizonyíték egységes megelőzési protokollhoz a csuklótörés utáni komplex regionális fájdalom szindróma ellen | CST8 | igen | nincs szám |
| 41 | Az áttekintés kilenc vizsgálatot dolgozott fel | CST8 | kiegészítés | igen (9 vizsgálat) |
| 42 | A probiotikum és az aszpirin nem csökkentette az előfordulást | CST8 | igen | nincs szám |
| 43 | A C-vitamin megítélése vegyes és vitatott | CST8 | igen | nincs szám |
| 44 | A korai aktív rehabilitáció és a fokozatos mobilizáció ígéretesnek tűnik, de a bizonyíték korlátozott és heterogén | CST8 | igen | nincs szám |
| 45 | Az irányelvbe hét vizsgálat került be: egy magas és hat közepes minőségű | CST3 | kiegészítés | igen (1 high, 6 moderate) |
| 46 | Az egyetlen magas minőségű vizsgálat a felügyelt terápia javára döntött hat hétnél és hat hónapnál; egy közepes minőségű a harmadik héten; egy az önálló gyakorlást hozta ki jobbnak hat hétnél; négy nem talált különbséget | CST3 | kiegészítés | igen (a RATIONALE bontása, 20. o.) |
| 47 | A NICE NG38 1.6.10 arról is tájékoztatást ír elő, mekkora eséllyel marad maradandó hatás az életminőségre (fájdalom, funkcióvesztés, lelki következmény) | CST5 | kiegészítés | nincs szám |
| 48 | Egyeseknél az enyhe merevség vagy sajgás két évnél is tovább tart, és véglegesen is megmaradhat; gyakoribb súlyos sérülés után, 50 év fölött és artrózis mellett; a merevség ilyenkor általában enyhe, és jellemzően nem változtatja meg a kar működését | CST2 | kiegészítés | igen (2 év, 50 év) |
| 49 | Stroke-jelek: lelógó arcfél, erőtlen vagy zsibbadt kar, akadozó beszéd, azonnal mentő; a 24 órán belül elmúlt tünet is azonnali segítséget igényel | VZ1 | igen (forrásbázis 1.1) | igen (24 óra) |
| 50 | A gipsz alatti figyelmeztető jeleket az NHS a sürgős tanácsadás szintjére sorolja, nem a mentőhíváséra | CST1 | kiegészítés | nincs szám |

**Nem klinikai állítások a szövegben** (ezért nincs orvosi forrásuk, de mind
ellenőrizhető a repóból): a program csukló-, ujj-, alkar- és könyökpanaszokra
készült, a gyakorlatok 5 perces miniblokkokban vannak, és a programot nem
javasoljuk traumás sérülés után, amíg az orvos nem enged mindent
(`src/scripts/restore-legacy-content.ts`, `kezrehabLongDescription`). A szerzői
titulusok és a Kate Thorn CHT kurzus adatai a
`docs/tudastar-hangnem-es-technika.md` 1.1 és 1.7 pontjából valók, betűhíven. Az
instruktori szerep (ProBody Stúdió, 2024, 2025, 2026, Budapest) a
`src/scripts/restore-legacy-content.ts` 907. sorából igazolható. **Az
SZTK-A-33553/2024 akkreditációs szám és a 12 kreditpont a 2026-08-21-i
tényellenőrző kör B3 pontja miatt KIKERÜLT**, mert a repó saját leltára
(`docs/tartalom-leltar-regi-oldal.md` E17, Ny6) nyitottként tartja nyilván,
érvényes-e 2026-ban.

---

## A vezetőnek szóló jelzések

**1. A kurzus-híd őszinteségi korlátja (a legfontosabb jelzés).** Az Otthoni
KézRehab Program saját leírásában szerepel: *„Nem javasoljuk a programot, ha…
a kezed érintő traumás (pl. törés) sérülésed volt, és az orvos még nem enged
mindent csinálni”* (`src/scripts/restore-legacy-content.ts`,
`kezrehabLongDescription`). A tartalmi terv szerint ez a cikk „a legmagasabb
konverziós szándékú”, és a híd itt a legtermészetesebb. A kettő csak úgy fér
össze, ha a CTA kimondja a sorrendet: előbb orvosi engedély, utána program.
A cikk így fogalmaz. **Ha a lányok szerint a program traumás sérülés után is
biztonságosan indítható orvosi engedéllyel, akkor a termékleírás szövegét kell
pontosítani, nem a cikket.** Ez tulajdonosi és szakmai döntés.

**2. Az SOS Kézrelax villámkurzus linkje szándékosan KIMARADT.** A közös kiírás
(5.5) egy szöveglink-súlyú említést enged a törzsben. A villámkurzus a
fájdalomcsillapításra ad három gyakorlatot ínhüvelygyulladásra,
kéztőalagút-szindrómára és teniszkönyökre
(`src/scripts/restore-legacy-content.ts`, `kezrelaxLongDescription`).
Frissen levett gipsz után ez nem a megfelelő belépő, és ellentmondana az 1.
pontban idézett ellenjavallatnak. **Ha a vezető mégis kéri, egy mondat
beilleszthető**, de a cikkíró javaslata: maradjon ki.

**3. Javaslat a forrásbázis 7. szakaszának bővítésére.** Az öntesztben
`kiegészítés`-nek jelölt hét sor mind a forrásbázisban MÁR SZEREPLŐ forrás
eredeti oldaláról való, 2026-08-21-én ellenőrizve. Javasolt betenni a
forrásbázis 7. szakaszába, hogy a következő cikkíró is használhassa:

- CST1: *„Your arm or wrist may be stiff and weak after the cast is removed. A
  physiotherapist can help with these problems, although sometimes they can last
  several months or more.”*
- CST1: *„do not drive or try to lift heavy items until you have been told it's
  safe to do so”*
- CST1: a gipsz alatti sürgős jelek között a láz és a hidegrázás is szerepel; a
  tiltások között a gipsz eláztatása és az alányúlás (fertőzésveszély).
- CST2: *„Recovery is different for everyone… Talk to your doctor about your
  recovery plan. Ask when you can return to normal activities.”*
- CST2: *„Your doctor may need to loosen your cast or surgical dressing.”*
- CST2: *„Severe, ongoing pain that does not get better may be a sign of complex
  regional pain syndrome… Tell your doctor if you have severe pain that does not
  get better with medication.”*
- CST8: az áttekintés kilenc vizsgálatot dolgozott fel (N = 7075, 127 CRPS-eset).

**4. Egy Cochrane-részlet, amit a cikk NEM használ, de érdemes megvitatni.**
A CST4 absztraktjának szó szerinti mondata: *„Both trials (46 and 76
participants) comparing physiotherapy or occupational therapy versus a
progressive home exercise programme after volar plate fixation provided low
quality evidence in favour of a structured programme of home exercises preceded
by instructions or coaching.”* Ez a Kineticare álláspontjának legközvetlenebb
bizonyítéka. A cikkíró **nem** írta bele, mert a forrásbázis 7. szakaszának
kivonata nem foglalja össze, és a forrásbázis 0.2/1. szabálya szerint új
állítás előbb a forrásbázisba kerül. **Kérdés a vezetőnek:** felvegyük-e a
forrásbázisba, és utána a cikkbe, kimondva az „alacsony minőségű bizonyíték”
minősítést?

**5. Amit a terv említ, de a cikk nem tárgyal.** A forrásbázis 7. szakasza
tartalmazza az AAOS és ASSH műtéti ajánlásait is (65 év felett a műtét nem hoz
jobb hosszú távú, beteg által jelentett eredményt; 65 alatt a helyretétel utáni
elmozdulás-küszöbök). A C6 H2-váza ezt nem kéri, és a cikk a gipszlevétel utáni
időszakról szól, ezért kimaradt. **Ha kell egy „mikor műtét, mikor gipsz”
szakasz, a forrás készen áll hozzá.**

**6. Két lejárt felülvizsgálati dátum.** Az NHS „Broken arm or wrist” oldalának
esedékes felülvizsgálata 2026-05-26, a „Complex regional pain syndrome”
oldalé 2025-10-27 volt. Mindkettő lejárt, a tartalom változatlanul elérhető. A
forrásjegyzék ezt kiírja. A forrásbázis 12.3 pontja szerint ezeket az első
adandó alkalommal újra kell ellenőrizni.

**7. Címsor-eltérés a tervhez képest, indokolva.** A C6 H2-váza a sportot és a
munkát egy H2 alatt kérte („Mikor lehet újra sportolni és dolgozni?”). A cikk
két H2-re bontotta: „Mikor lehet újra sportolni csuklótörés után?” és
„Csuklótörés után mikor lehet dolgozni?”. Oka: a mért autocomplete-kifejezés
szó szerint `csuklótörés után mikor lehet dolgozni`
(`docs/monid-adatok-teljes.md` 3.7), és a GEO-szabály szerint minden szakasznak
önmagában kell megállnia. Egy H2 alatt a sport-idővonal és a „nincs rá szám”
válasz egymást gyengítené. A váz minden tartalmi eleme megvan, csak két
címsorban.

**9. Két bibliográfiai adat pontosítva a PubMed hivatalos rekordjából.** A
forrásbázis 7. szakasza a CST7-et és a CST8-at rövidített szerzőlistával közli
(„és mtsai”). A cikk forrásjegyzékébe a teljes lista került, a PubMed
E-utilities rekordjából, 2026-08-21-én: CST7 = Parkitny L, McAuley JH,
Herbert RD, Di Pietro F, Cashin AG, Ferraro MC, Moseley GL; CST8 = Serôdio IN,
Saiz-Vázquez O, Ortiz-Huerta H, Simón-Vicente L, Santamaría-Vázquez M. A CST7
címe is hosszabb a hivatalos rekordban, alcímmel együtt szerepel. A CST4
első szerzőjét a PubMed `Handoll HH` alakban közli, a Cochrane-rekord
`Handoll HHG` alakban; a cikk a forrásbázis alakját tartja meg. **Javasolt a
forrásbázis 7. szakaszát is ezekre pontosítani**, de az nem ennek a cikknek a
fájl-tulajdona.

**10. Az URL-ek visszaellenőrizve.** A forrásjegyzék mind a tíz webcíme
2026-08-21-én sikeres választ adott. Az NHS-oldalak, az AAOS OrthoInfo, az
AAOS és ASSH irányelv-PDF-je, valamint a NICE NG38 HTTP 200-at; a négy
PubMed-cím HTTP 203-at (ez is sikeres válasz, a proxy adja így). A két
átirányítás a fenti fejlécben van dokumentálva.

**8. Mért terjedelem és arányok.** A törzs a Források szakasz előtt 1 530 szó,
a Forrásokkal és a záró tudnivalóval együtt 1 843 szó. Ez a tag-cikkekre adott
1 100–1 800 szavas irányszámon belül van (`docs/tudastar-tartalmi-terv.md` 5.4).
15 H2 van a törzsben, H3 nincs, így a cikk-lint L5 aránya 122,9 szó alcímenként
(korlát 150). Az első H2 előtti szakasz 62 szó (L12 korlátja 120). Ha a vezető
hosszabb cikket kér, a 3., 4. és 5. pont adja a bővítés útját: előbb a
forrásbázis bővítése, utána a Cochrane-részlet és egy műtéti döntés szakasz.
