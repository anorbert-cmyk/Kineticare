# Megfigyelések

Nyitott kérdések, eltérések és kockázatok, amiket a repó figyelése során
találtunk. Egy tétel akkor kerül **lezárva** státuszba, ha a repóban látható
változás megoldotta — a bejegyzést ilyenkor sem töröljük.

Státuszok: `nyitott` · `emberi döntésre vár` · `lezárva`

---

## M-01 — A README CI-workflow-kra hivatkozik, de nincsenek workflow-fájlok

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** magas

A `README.md` szerint minden `main`-re érkező push és PR lefuttat egy CI-t
(typecheck → lint → build → test, Postgres 16 service-containerrel), egy
`npm audit` jobot és egy gitleaks full-history scant. A `.github/` mappában
azonban **csak `dependabot.yml` van**, és a GitHub Actions is egyetlen
workflow-t ismer: a Dependabot saját, dinamikusan generált futását.

Következmény: a „main-re csak zöld CI után kerülhet kód" szabály jelenleg
**nem kikényszerített**, és a titokszivárgás-ellenőrzés sem fut automatikusan —
holott a `CLAUDE.md` 1. tiltott zónája erre épít.

**Javaslat:** vagy készüljenek el a hivatkozott workflow-k
(`.github/workflows/ci.yml`, `gitleaks.yml`), vagy a README fogalmazza át
a szakaszt tervezettre. Előbbi a valós szándék — de a workflow-k létrehozása
külön ticket, nem a figyelés hatásköre.

---

## M-02 — A `payload-types.ts` kézi igazításai visszatérnek

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** közepes

A generált `src/payload-types.ts` fájlt három egymást követő commit igazította
kézzel (`342c85c` újragenerálás, `8e26140` fájlvégi newline, `2c88b04`
`CategoriesSelect.slug` sor pótlása), korábban pedig a `d328c97` egy
`TransactionsSelect.customer` mezőt tett vissza „byte-sync" címén.

Ha a generátor kimenete és a repóban lévő fájl rendszeresen eltér, az vagy
környezetfüggő generálást (Node-/formázó-verzió), vagy egy override-ot jelez,
amit a generátor nem lát. Mindkettő visszatérő, nehezen bizonyítható diff-zajt
okoz.

**Javaslat:** a következő `generate:types` futtatásnál érdemes rögzíteni, mi
tér el és miért; ha prettier-formázás a különbség, a generálás után futó
formázás megoldja.

---

## M-03 — A munka közvetlenül `main`-re megy, PR nélkül

**Státusz:** emberi döntésre vár · **Felvéve:** 2026-07-31 · **Súly:** közepes

A repóban **nincs egyetlen pull request sem** (nyitott, zárt vagy merge-elt),
és nincs issue sem — az 50 commit közvetlenül a `main`-en keletkezett. Ez
ellentmond a `README.md` és a `CLAUDE.md` PR-elvárásainak (zöld CI, leírás,
review az access-változásokhoz).

Az M-01-gyel együtt ez azt jelenti, hogy jelenleg **egyik minőségi kapu sem
kényszerített**: se CI, se review.

**Javaslat:** ha a jelenlegi egyszemélyes tempó a szándék, a README-t érdemes
ehhez igazítani; ha nem, branch protection + a hiányzó workflow-k adják meg a
kapukat.

---

## M-04 — Kísérleti („probe"/„tmp") commitok a `main` történetében

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** alacsony

A történetben több, egymást oltó pár szerepel: `tmp: teszt` → `chore: tmp
marker törlése`, `test: binary base64 probe` → `chore: probe-fájlok
eltávolítása`, `probe: github MCP újracsatlakozás teszt (törlendő)` és társaik —
összesen kb. egy tucat commit, amely nem visz előre funkciót.

Tartalmi kockázatot nem hordoz (a fájlok törölve lettek), de zajossá teszi a
történetet, és megnehezíti a „mi változott érdemben" kérdés megválaszolását —
épp azt, amiért ez a napló készül.

**Javaslat:** eszköz-tesztelésre külön, eldobható branch; a `main` maradjon
funkcionális történet.

---

## M-05 — A minőségi kapuk lokálisan nem ellenőrizhetők ebben a környezetben

**Státusz:** nyitott · **Felvéve:** 2026-07-31 · **Súly:** információ

A figyelő-környezetben a `node_modules` nincs telepítve, így a `npm run
typecheck` / `lint` / `test` nem futtatható a repó állapotának igazolására.
A napló ezért **a kód olvasásából és a git-történetből** dolgozik, nem futó
tesztekből.

**Javaslat:** ha az ellenőrzésnek tényleges zöld/piros státuszt is kell
adnia, az M-01 szerinti CI-workflow-k eredménye a természetes forrás — a
figyelés onnan olvasná ki, futtatás nélkül.
