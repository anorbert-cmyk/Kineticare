# Jelszópolitika (password policy)

OWASP A07 (Identification and Authentication Failures) keményítés: erős
jelszó-szabályok kikényszerítése szerveroldalon.

## Szabályok

A politika a `src/lib/security/password-policy.ts` fájlban él, tiszta,
framework-független függvényként (`validatePasswordStrength`), magyar
hibaüzenetekkel:

| Szabály | Hibaüzenet |
| --- | --- |
| Legalább 12 karakter (Unicode kódpontban mérve) | „A jelszónak legalább 12 karakter hosszúnak kell lennie.” |
| Legalább egy kisbetű (ékezetes is jó) | „A jelszónak tartalmaznia kell legalább egy kisbetűt.” |
| Legalább egy nagybetű (ékezetes is jó) | „A jelszónak tartalmaznia kell legalább egy nagybetűt.” |
| Legalább egy szám | „A jelszónak tartalmaznia kell legalább egy számot.” |
| Nem tartalmazhatja az e-mail-cím local-partját (a `@` előtti rész, kis-/nagybetű-érzéketlenül, min. 3 karakteres local-part esetén) | „A jelszó nem tartalmazhatja az e-mail-címedet.” |

## Hol érvényesül?

A `src/collections/Users.ts` collection **`beforeChange` hookja** hívja meg,
akkor is csak akkor, ha a mentendő adat tartalmaz `password` mezőt (új jelszó
beállítása vagy módosítása). Így lefedi:

- a nyilvános regisztrációt (`POST /api/users`),
- a profil jelszómódosítását (`PATCH /api/users/:id`),
- az adminfelületen történő jelszóadást.

Hiba esetén a hook `APIError`-t dob (HTTP 400) az összefűzött magyar
hibaüzenetekkel, így a felhasználó az űrlapon azonnal látja, mit kell
javítania.

**Ismert korlát:** a Payload 3.86 `reset-password` művelete a jelszót már
hash-elve adja át a collection-hookoknak, így az elfelejtett-jelszó folyamat
végén beállított új jelszót a beforeChange hook nem látja nyersen. Ezen a
ponton a kliensoldali validáció az első vonal; szerveroldali kikényszerítéshez
a reset-folyamat egyedi végpontára (vagy Payload-verziófrissítés esetén annak
új hookjára) lenne szükség — ez külön feladat.

## Miért hook?

A Payload 3.86 auth-konfigurációja nem ismeri a `passwordMinLength` vagy
hasonló natív beállítást; a komplexitási szabályok egyetlen szerveroldali
érvényesítési pontja a collection-hook. A `beforeChange` azért a megfelelő,
mert a create/update műveletekben a jelszó-hash-elés a collection-hookok
**után** történik — a hook még a nyers jelszót látja, és a mentés előtt
megakadályozhatja a gyenge jelszó perzisztálását.

## Hogyan bővíthető?

1. Új szabály felvétele a `validatePasswordStrength` függvénybe
   (`src/lib/security/password-policy.ts`), a magyar hibaüzenettel együtt —
   pl. szótári szavak szűrése, ismétlődő karakterek korlátozása, kiszivárgott
   jelszó-lista (haveibeenpwned) ellenőrzés.
2. A hozzá tartozó unit-teszt felvétele a
   `src/__tests__/security/password-policy.test.ts` fájlba (a függvény tiszta,
   mock nélkül tesztelhető).
3. A Users-hook és a hibaüzenet-összefűzés (`formatPasswordPolicyErrors`)
   változás nélkül működik tovább.

## Kapcsolódó naplózás

A sikertelen bejelentkezéseket (hibás jelszó, zárolt fiók) a Users collection
`afterError` hookja naplózza strukturáltan (`src/lib/logger.ts`): e-mail-cím,
IP-cím (ha a proxy továbbítja), és az ok. Jelszó sosem kerül a naplóba — a
logger redact-listája az érzékeny kulcsokat minden környezetben maszkolja.
(A Payload 3.86-ban nincs `afterFailedLogin` hook; a REST login-hibák a
`routeError` segédleten át az `afterError` hookban landolnak.)
