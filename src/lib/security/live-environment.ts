/**
 * ÉLES KÖRNYEZET FELISMERÉSE a publikus szerver-URL-ből.
 *
 * Adatot ÍRÓ scriptek (demó-feltöltés, seed) közös kapuja. A logika azért él
 * külön modulban, mert két, egymástól független script használja
 * (`src/scripts/demo-seed.ts`, `src/scripts/seed.ts`), és a másolás azt
 * kockáztatná, hogy az egyik példány csendben szétcsúszik a másiktól — a
 * CLAUDE.md 16. üzemeltetési tanulsága pontosan erről szól.
 *
 * A modul TISZTA: nem olvas `process.env`-et, nincs mellékhatása, így a kapuk
 * tesztből bizonyíthatók.
 */

/**
 * Az ÉLES publikus hosztok. Ha a `NEXT_PUBLIC_SERVER_URL` ezek valamelyikére
 * mutat, a demó-/tesztadatot író scriptek nem futhatnak le. (A demó-környezet
 * saját aldomaint vagy Railway-címet kap, lásd docs/demo-kornyezet.md.)
 */
export const PRODUCTION_HOSTS: readonly string[] = ['kineticare.hu', 'www.kineticare.hu']

/** A publikus szerver-URL hosztja kisbetűsen; érvénytelen/hiányzó értéknél null. */
export function serverUrlHost(rawValue: string | undefined | null): string | null {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return null
  }
  try {
    return new URL(rawValue.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Az ÉLES oldalra mutat-e a megadott publikus szerver-URL?
 *
 * Hiányzó vagy értelmezhetetlen URL esetén `false`: ilyenkor a hívó saját
 * (tartalmi vagy kapcsoló-alapú) kapuja dönt — a hoszt-ellenőrzés önmagában
 * sosem az egyetlen védelem.
 */
export function isProductionServerUrl(rawValue: string | undefined | null): boolean {
  const host = serverUrlHost(rawValue)
  return host !== null && PRODUCTION_HOSTS.includes(host)
}
