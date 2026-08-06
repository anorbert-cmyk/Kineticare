# Repo-figyelő

Ez a mappa a Kineticare repó **folyamatos követésének** munkaanyaga: mi a repó
jelenlegi állapota, mi változott az utolsó ellenőrzés óta, és mit tanultunk
belőle. Célja, hogy az ügynök (és bármely új közreműködő) egy fájlból meg tudja
mondani, hol tart a projekt — anélkül, hogy 61 commitot kellene visszaolvasnia.

## Fájlok

| Fájl | Tartalom |
| --- | --- |
| [`allapot.md`](./allapot.md) | Architektúra- és állapot-pillanatkép: stack, modulok, adatmodell, döntések. Minden ellenőrzésnél frissül, ha lényegi változás történt. |
| [`naplo.md`](./naplo.md) | Dátumozott tanulási napló: mi változott, miért, és mit jelent a további munkára. Append-only — korábbi bejegyzést nem írunk át. |
| [`megfigyelesek.md`](./megfigyelesek.md) | Nyitott kérdések, eltérések, kockázatok — amit érdemes emberi döntésre vinni. Tételenként státusszal. |
| [`utolso-ellenorzes.txt`](./utolso-ellenorzes.txt) | Az utoljára feldolgozott commit SHA-ja és időpontja. A digest-script ebből számol. |
| [`digest.sh`](./digest.sh) | Összefoglalót ad az utolsó feljegyzett állapot óta történt változásokról (commitok, érintett fájlok, függőség- és migrációváltozás). |

## Az ellenőrzés menete

```bash
# 1. Friss állapot lekérése
git fetch origin main

# 2. Mi történt az utolsó feljegyzés óta?
bash docs/repo-figyelo/digest.sh origin/main
```

Ezután, ha volt érdemi változás:

1. **`naplo.md`** — új dátumozott bejegyzés: mi változott, mi a jelentősége,
   mi következik belőle.
2. **`allapot.md`** — csak akkor módosul, ha az architektúra, az adatmodell,
   a függőségek vagy egy elvi döntés változott; apró javítás nem indokolja.
3. **`megfigyelesek.md`** — új eltérés/kockázat felvétele, illetve a megoldott
   tételek lezárása.
4. **`utolso-ellenorzes.txt`** — az újonnan feldolgozott SHA és időpont.

Ha nem volt változás, a naplóba nem kerül üres bejegyzés — csak az
`utolso-ellenorzes.txt` időbélyege frissülhet.

## Mire figyelünk külön

A [`CLAUDE.md`](../../CLAUDE.md) tiltott zónái miatt minden ellenőrzésnél
külön nézzük, nem sérült-e valamelyik:

- **Titok a repóban** — új `.env*` tartalom, kulcsnak látszó string kódban,
  configban vagy tesztfixtúrában.
- **`confirmOrder`** — a plugin rendelés-jóváhagyó függvényének hívása,
  importja vagy re-exportja bárhol a kódban.
- **Kézi migráció** — `src/migrations/` alatti fájl kézi szerkesztése,
  törlése vagy átsorszámozása.
- **Access-control változás** — `src/access/`, collection- vagy field-szintű
  `access` szabály, auth-hook módosítása (emberi review kötelező).
- **Pinnelt `@payloadcms/*` verziók** — verzióemelés vagy `^` sémára váltás.
- **`any` típus** és kikommentezett kód megjelenése.

Ezek bármelyike a naplóban **kiemelt** tételként szerepel, és
`megfigyelesek.md`-be is bekerül.

> A `digest.sh` gyanújelei **jelzések, nem ítéletek**: a `confirmOrder`-találatok
> nagy része például épp a tiltást kikényszerítő védelmi kódból és annak
> tesztjeiből jön. Minden találatot el kell olvasni, mielőtt tételként rögzülne.

## Automatizálás

**Állapot: még nincs bekapcsolva.** A napi ütemezés (Routine) létrehozása
jóváhagyáshoz kötött, ezt pedig csak interaktív munkamenetből lehet megadni —
addig a figyelés kézzel, a fenti menet szerint fut.

A tervezett ütemezés: **naponta egyszer, 05:07 UTC** (nyári időszámításban
07:07 budapesti idő), friss munkamenetben, push-értesítéssel. A Routine
promptja, hogy bekapcsoláskor ne kelljen újraírni:

> Napi repó-figyelés az `anorbert-cmyk/Kineticare` repóhoz. Magyarul válaszolj.
>
> A figyelés munkaanyaga a `docs/repo-figyelo/` mappa. Először olvasd el a
> `docs/repo-figyelo/README.md`-t — az írja le a menetet —, majd kövesd:
>
> 1. `git fetch origin main`, majd `bash docs/repo-figyelo/digest.sh origin/main`.
>    Ha 0 új commit van: ne írj naplóbejegyzést és ne nyiss PR-t, csak jelezd
>    röviden, hogy nem volt változás.
> 2. Ha volt változás, olvasd el az érintett diffeket — ne csak a
>    commitüzenetekből dolgozz. A digest gyanújelei jelzések, nem ítéletek.
> 3. Frissítsd a `naplo.md`-t (új bejegyzés felülre), szükség esetén az
>    `allapot.md`-t és a `megfigyelesek.md`-t, végül az `utolso-ellenorzes.txt`-t.
> 4. Nézd meg a nyitott PR-eket és issue-kat is; az érdemi újdonság kerüljön a naplóba.
> 5. Commitold és pushold a `claude/repo-monitoring-learning-wgr2ct` branchre;
>    ha nincs hozzá nyitott PR, nyiss egy drafteset.
>
> Ez **figyelés, nem fejlesztés**: alkalmazáskódot, migrációt, access-függvényt
> és függőséget ne módosíts — a talált problémákat a `megfigyelesek.md`-be vedd
> fel. A repó `CLAUDE.md`-jének tiltott zónái a figyelésre is vonatkoznak.
