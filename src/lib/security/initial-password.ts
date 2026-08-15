/**
 * Kriptográfiailag véletlen KEZDŐJELSZÓ a rendszer által létrehozott fiókokhoz.
 *
 * MIÉRT KELL EGYÁLTALÁN: a Payload auth-kollekciója jelszó NÉLKÜL nem hoz létre
 * felhasználót (`registerLocalStrategy` → `generatePasswordSaltHash`, ahol a
 * `password` validáció `required: true`). Két folyamatunk viszont éppen olyan
 * fiókot hoz létre, amelyhez a vevő MÉG NEM választott jelszót:
 *  - a systeme.io → Kineticare vásárló-import (src/lib/customer-import/execute.ts),
 *  - a vendég-vásárlás fizetés utáni fiók-feloldása
 *    (src/lib/order-status/resolve-order-customer.ts).
 *
 * A generált jelszó ezért ELDOBHATÓ: SOSEM kerül kiírásra, naplóba, fájlba vagy
 * e-mailbe (generált jelszót levélben küldeni tilos) — a vevő a jelszó-beállító
 * (aktiváló) linkkel állít be sajátot, a Payload saját reset-tokenjével.
 *
 * A modul SZÁNDÉKOSAN önálló: két, egymástól független folyamat használja, és a
 * másolás azt kockáztatná, hogy az egyik példány (pl. a jelszó-politikának való
 * megfelelés ellenőrzése nélkül) csendben szétcsúszik a másiktól.
 */

import { randomInt } from 'node:crypto'

import { validatePasswordStrength } from './password-policy'

/** A generált jelszó hossza — jóval a politika 12 karakteres minimuma felett. */
const GENERATED_PASSWORD_LENGTH = 32

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '-_.!?*+#'
const ALL = `${LOWER}${UPPER}${DIGITS}${SYMBOLS}`

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)]
}

/**
 * Kriptográfiailag véletlen kezdőjelszó (`node:crypto`).
 *
 * A karakterosztályok garantáltan képviselve vannak, mert a Users collection
 * `enforcePasswordPolicy` hookja (kis- és nagybetű + szám + 12 karakter) a 2.
 * felhasználótól kezdve minden create-re lefut — véletlen sztringnél ez ritkán,
 * de elbukhatna. A politikát a visszaadás ELŐTT ellenőrizzük is: csendben
 * gyenge jelszót sosem adunk vissza.
 */
export function generateInitialPassword(email?: string): string {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const characters = [pick(LOWER), pick(LOWER), pick(UPPER), pick(UPPER), pick(DIGITS), pick(DIGITS)]
    while (characters.length < GENERATED_PASSWORD_LENGTH) {
      characters.push(pick(ALL))
    }
    // Fisher–Yates keverés kriptográfiai véletlennel, hogy a garantált
    // karakterosztályok ne mindig ugyanazon a pozíción álljanak.
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swap = randomInt(index + 1)
      const temporary = characters[index]
      characters[index] = characters[swap]
      characters[swap] = temporary
    }
    const password = characters.join('')
    if (validatePasswordStrength({ password, email }).length === 0) {
      return password
    }
  }
  // Elvi ág: 8 próbálkozás után is politikasértő jelszó gyakorlatilag
  // lehetetlen — de csendben gyenge jelszót SOSEM adunk vissza.
  throw new Error('Nem sikerült a jelszó-politikának megfelelő kezdőjelszót generálni.')
}
