---
name: termektervezes
description: Kutatás-alapú termék- és felülettervezés a Kineticare-hez. Használd MINDIG, amikor a vevői felület bármely elemét tervezed vagy módosítod — gomb, felirat, navigáció, szekció, űrlap, állapot, folyamat, tipográfia, szín, elrendezés —, és akkor is, ha „csak" egy szöveget vagy egy gombot írnál át. A tulajdonos 2026-08-16-i kikötése: memóriából dolgozni TILOS, minden döntést külső kutatás és sztenderd támaszt alá.
---

# Termék- és felülettervezés a Kineticare-ben

A tulajdonos szabálya, szó szerint: *„nem hibáztok… semmit nem jelentetek késznek, ha csak
memóriából dolgoztatok, mindenre kell több tanulmány, kutatás, tudományos legyen, valamint
világhírű terméktervező cégeknek a tanulmányait kell figyelembe venni minden tervezésnél."*

Ez a skill ezt fordítja munkamenetté.

## 1. Mielőtt bármit írnál: a három kötelező forráskör

Minden felületi döntéshez **legalább két független külső forrás** kell, és a kódba/doksiba
kerülő indoklásnak hivatkoznia kell rájuk (cím + URL). A körök:

1. **Kutatóintézetek**: Nielsen Norman Group (heurisztikák, gomb- és linkhasználat, olvasási
   minták), Baymard Institute (e-kereskedelmi checkout- és termékoldal-kutatás).
2. **Termékcégek nyilvános tervezési rendszerei**: GOV.UK Design System (közérthetőség,
   egy elsődleges cselekvés, hibakezelés), Apple HIG, Material Design 3, Shopify Polaris,
   IBM Carbon, Atlassian Design System.
3. **Szabvány**: WCAG 2.2 (a sikerkritérium *számával* hivatkozva, pl. 1.4.3, 2.4.11, 2.5.8,
   3.2.4), valamint a magyar helyesírás hivatalos forrásai a mikroszövegekhez.

A projekt saját, már meglévő kutatásai kötelező olvasmányok, és a hivatkozási lánc része:
`docs/ui-sztenderdek.md`, `docs/ertekesitesi-ux-skill.md`, `docs/ux-hierarchia-audit.md`,
`docs/informacios-architektura.md`, `docs/gomb-inventar.md`, `docs/gomb-kontraszt-audit.md`,
`docs/felhasznaloi-seta.md`, `docs/regi-oldal-osszehasonlitas.md`, `docs/seo-geo-llm.md`.

## 2. A vevői felület nyelve

- **Natív magyar, AI-szag nélkül.** Gondolatjelet (–, —) csak valódi közbevetésnél
  használunk; töltelék-elválasztóként soha. Helyette vessző, kettőspont, pont, zárójel.
  Ez a tulajdonos kifejezett, ismételt kérése.
- **A CTA cselekvést ír le, nem ígéretet**: ige + tárgy, egyes szám második személy.
- **Ugyanaz a cselekvés = ugyanaz a szó, mindenhol** (WCAG 3.2.4, konzisztens azonosítás).
  Új gombfelirat kitalálása előtt nézd meg a `docs/gomb-inventar.md` CTA-szótárát; ha nincs
  benne, oda is vedd fel.
- **A felirat legyen igaz.** Ingyenes terméken „Megveszem" felirat: hazugság és hiba. A
  „mit kap érte" és a „mibe kerül" kérdésre a gomb közelében kell válasz.

## 3. Amit minden felületi változtatás után igazolni kell

| Ellenőrzés | Küszöb | Hogyan |
| --- | --- | --- |
| Szövegkontraszt | ≥ 4,5:1 (nagy szöveg ≥ 3:1) | számolt arány, nem szemre |
| Nem-szöveges kontraszt (gombfelület, ikon, keret) | ≥ 3:1 | számolt arány |
| Fókuszjelölés | ≥ 3:1 és látható minden háttéren | billentyűzetes végigjárás |
| Érintőcél | ≥ 24×24 CSS px (cél: 44×44) | mért doboz |
| Sorhossz | 45–85 karakter (magyar szöveggel mérve) | mért |
| Vízszintes görgetés | nincs 320 px-en | mért dokumentum-szélesség |
| Mozgás | `prefers-reduced-motion` mögött | kód + teszt |
| Betűméret | kizárólag a három token (L/M/S) | `src/__tests__/tipografia-harom-meret.test.ts` |

Minden állítást **méréssel** kell alátámasztani (Chromium + playwright-core a mérőharnesszel,
lásd a scratchpad `ux/` mappáját), nem becsléssel. Ahol a szabály visszacsúszhat, **őr-teszt**
védje.

## 4. A gombok és állapotaik

Minden interaktív elemnek végig kell gondolni **mind a hét állapotát**: alap, hover,
focus-visible, active, disabled, folyamatban (küldés alatt), és — linknél — látogatott.
A „folyamatban" állapot nem díszítés: enélkül a felhasználó kétszer küldi be az űrlapot.
A disabled gomb mellett mindig legyen szöveges magyarázat, hogy miért nem használható.

Gomb vagy link? Ami **navigál**, az link (jobbklikk, új lap, billentyűzet elvárt módon
működik); ami **cselekvést hajt végre**, az gomb. A vizuális stílus ezt nem írhatja felül.

## 5. Folyamat- és navigáció-tervezés

- Minden felületi munka előtt nézd meg az **információs architektúra térképét**
  (`docs/informacios-architektura.md`): hol van az elem, honnan érhető el, hova visz.
- Zsákutca tilos: minden oldalról legyen értelmes továbblépés és visszaút.
- A felhasználónak három kérdésre kell választ kapnia bármelyik képernyőn: *hol vagyok,
  mit tehetek itt, hova jutok, ha rákattintok.*
- **Kognitív séta** kötelező minden új folyamatnál: játszd végig egy nem gyakorlott
  felhasználó fejével, lépésenként (`docs/felhasznaloi-seta.md` a minta és a persona).
- A régi kineticare.hu megszokott mintái számítanak (Jakob törvénye): ha egy megszokott
  útvonalat elveszünk, azt tudatosan és indokoltan tegyük
  (`docs/regi-oldal-osszehasonlitas.md`).

## 6. Munkamenet (ezt a sorrendet tartsd)

1. **Kutass** (2. és 1. pont) — jegyzeteld a forrásokat.
2. **Térképezz**: mit érint a változás az IA-ban, milyen más felületeken jelenik meg
   ugyanaz a minta (a konzisztencia miatt).
3. **Tervezz** a projekt tokenjeivel; idegen színt, betűt, méretet nem veszünk át.
4. **Építs**, és minden döntést kommentelj a *miért*-tel és a forrással.
5. **Mérj** (3. pont), őr-teszttel rögzítsd.
6. **Játszd végig** felhasználóként, mobilon és billentyűzettel is.
7. **Jelents**: mit, miért, milyen forrásra hivatkozva, mit mértél — a „kész" csak ezután
   mondható ki.

## 7. Tiltások

- Memóriából hivatkozni egy kutatásra vagy sztenderdre (forrás nélkül).
- Új betűméretet bevezetni a három tokenen kívül.
- Gondolatjeles, AI-ízű mikroszöveget írni a vevői felületre.
- „Szerintem szebb" alapon dönteni ott, ahol mérhető szabály van.
- Készként jelenteni bármit, ami nincs mérve és nincs végigjátszva.
