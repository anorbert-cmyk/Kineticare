/**
 * systeme.io → Kineticare vásárló-import: AKTIVÁLÁSI LINKEK előállítása.
 *
 * A migrációval áthozott vevőnek nincs jelszava (a kezdőjelszó véletlen és
 * eldobható), ezért a belépéshez egy jelszó-beállító linket kap. A linket a
 * Payload SAJÁT jelszó-visszaállító mechanizmusa adja
 * (`payload.forgotPassword`, `disableEmail: true`), tehát nincs külön,
 * párhuzamos token-rendszer — ugyanaz a token, ugyanaz a lejárat-kezelés,
 * ugyanaz a `/jelszo-visszaallitas` oldal, mint az „elfelejtett jelszó"
 * folyamatban.
 *
 * E-MAIL-KÜLDÉS ITT NINCS. A modul kizárólag LINKET állít elő és CSV-t rendereli
 * — a kiküldés (SMTP/szolgáltató) döntése nyitott, azt a lányok levelezőjéből
 * vagy egy külön, jóváhagyott lépésben kell megtenni.
 *
 * BIZTONSÁG. Az aktiválási link TITOK: aki megkapja, jelszót állíthat a fiókhoz.
 * Ezért a token és a link SOHA nem kerül naplóba (a logger csak darabszámot lát),
 * a kimeneti CSV pedig nem verziózható és nem maradhat a gépen a kiküldés után.
 *
 * ÚJRAGENERÁLÁS. Minden `forgotPassword`-hívás ÚJ tokent ír a felhasználóra, és
 * ezzel a korábbi linket érvényteleníti. Ha valakinek újra kell küldeni a
 * meghívót, a legutóbb generált linket használd, vagy generálj újat mindenkinek
 * — a kettőt keverni nem szabad.
 */

import type { Payload } from 'payload'

import type { Logger } from '../logger'
import { UTF8_BOM, type RowIssue } from './parse'

/** A vásárlói (nem admin) jelszó-beállító oldal útvonala. */
export const INVITE_RESET_PATH = '/jelszo-visszaallitas'

/**
 * Az aktiválási token élettartama ezredmásodpercben (30 nap).
 *
 * A Payload alapértelmezése 1 óra — az „elfelejtett jelszó" folyamathoz az
 * helyes, egy hetekig futó átállási kommunikációhoz viszont kevés lenne: a
 * bejelentés és az emlékeztető között a link lejárna. A Users collection nem ad
 * meg saját `forgotPassword.expiration` értéket, ezért ez az opció érvényesül.
 */
export const INVITE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface InviteLink {
  readonly email: string
  readonly url: string
}

export interface InviteResult {
  readonly links: readonly InviteLink[]
  readonly issues: readonly RowIssue[]
}

/**
 * A NEXT_PUBLIC_SERVER_URL feloldása (a `src/env.ts` ENV-assert mintájára).
 *
 * A linknek abszolútnak kell lennie, mert e-mailben megy ki — relatív úttal
 * használhatatlan. Hiányzó változónál érthető magyar hibaüzenet, nem crash.
 */
export function resolveServerUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const raw = env.NEXT_PUBLIC_SERVER_URL
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(
      'Hiányzó NEXT_PUBLIC_SERVER_URL környezeti változó — enélkül nem építhető abszolút aktiválási link. ' +
        'Állítsd be a környezetben, majd futtasd újra.',
    )
  }
  return raw.trim().replace(/\/+$/, '')
}

/** Abszolút aktiválási (jelszó-beállító) link a tokenből. */
export function buildInviteUrl(serverUrl: string, token: string): string {
  const base = serverUrl.replace(/\/+$/, '')
  return `${base}${INVITE_RESET_PATH}?token=${encodeURIComponent(token)}`
}

/** RFC 4180 szerinti mező-idézés a kimeneti CSV-hez. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * A linkek CSV-alakja: `email,aktivalasi_link`.
 *
 * UTF-8 BOM-mal és CRLF sorvéggel, hogy az Excel ékezethelyesen és
 * oszlopokra bontva nyissa meg (a lányok ebben dolgoznak).
 */
export function renderInviteCsv(links: readonly InviteLink[]): string {
  const rows = [
    ['email', 'aktivalasi_link'],
    ...links.map((link) => [link.email, link.url]),
  ]
  return `${UTF8_BOM}${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export interface InviteOptions {
  readonly serverUrl: string
  readonly log?: Logger
  /** Token-élettartam ms-ban (alap: 30 nap). */
  readonly expirationMs?: number
}

/**
 * Aktiválási linkek előállítása a megadott e-mail-címekhez.
 *
 * A nem létező e-mail nem hiba a Payload számára (a felhasználó-felderítés
 * elleni védelem miatt `null`-t ad vissza), ezért itt fordítjuk le
 * észrevehető hibává — a csendes kihagyás pont az a hiba, amit el akarunk
 * kerülni: a vevő e-mail nélkül maradna.
 */
export async function generateInviteLinks(
  payload: Payload,
  emails: readonly string[],
  options: InviteOptions,
): Promise<InviteResult> {
  const links: InviteLink[] = []
  const issues: RowIssue[] = []

  for (const email of emails) {
    try {
      // A visszatérési érték a Payload típusa szerint string, futásidőben
      // viszont ismeretlen e-mailnél `null` — ezért unknown + típusszűkítés.
      const token: unknown = await payload.forgotPassword({
        collection: 'users',
        data: { email },
        disableEmail: true,
        expiration: options.expirationMs ?? INVITE_TOKEN_TTL_MS,
      })
      if (typeof token !== 'string' || token === '') {
        issues.push({
          line: 0,
          email,
          reason: 'Nem sikerült aktiválási linket készíteni (nincs ilyen felhasználó).',
        })
        continue
      }
      links.push({ email, url: buildInviteUrl(options.serverUrl, token) })
    } catch (error) {
      issues.push({
        line: 0,
        email,
        reason: `Aktiválási link hiba: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  // Sem a token, sem a link nem kerülhet naplóba — csak darabszám.
  options.log?.info('vásárló-import: aktiválási linkek elkészültek', {
    keszLinkek: links.length,
    sikertelen: issues.length,
  })

  return { links, issues }
}
