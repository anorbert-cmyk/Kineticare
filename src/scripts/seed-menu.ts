/**
 * Menü-seed script — a fejléc-navigáció alapstruktúráját tölti be, idempotens
 * módon (a szabályok és a cél-struktúra: src/lib/menu-seed.ts).
 *
 * Futtatás (DATABASE_URI és PAYLOAD_SECRET környezeti változókkal — lokálisan
 * vagy Railway shellben):
 *   npm run seed:menu
 *     → a HIÁNYZÓ menüpontok létrejönnek; a meglévőkhöz a script NEM nyúl.
 *   MENU_SEED_DRY_RUN=igen npm run seed:menu
 *     → próbafutás: csak kiírja, mit hozna létre, egyetlen írás nélkül.
 *
 * Miért NEM dry-run az alapértelmezés (szemben a seed:legacy scripttel)? Az a
 * script slug/sku-egyezésnél FELÜLÍR meglévő dokumentumokat, ezért ott a
 * megerősítés indokolt. Ez a script kizárólag HIÁNYZÓ sort hoz létre: meglévő
 * menüpontot sem felirat, sem sorrend, sem cél szintjén nem módosít, és nem is
 * töröl. A visszavonás egy admin-kattintás (a menüpont törlése vagy a „Látható"
 * pipa kivétele) — utóbbi esetben a seed újrafuttatása sem hozza vissza a
 * menübe, mert a dedup a rejtett sort is megtalálja.
 */

import { getPayload } from 'payload'

import { ensureNavigationMenu } from '../lib/menu-seed'
import config from '../payload.config'

const DRY_RUN = process.env.MENU_SEED_DRY_RUN?.trim().toLowerCase() === 'igen'

async function seedMenu(): Promise<void> {
  const payload = await getPayload({ config })
  const summary = await ensureNavigationMenu(payload, { dryRun: DRY_RUN })

  payload.logger.info(
    DRY_RUN
      ? `Menü-seed PRÓBAFUTÁS — összesítés: ${summary.created.length} létrehozandó, ${summary.skipped.length} érintetlen. Az adatbázisba SEMMI nem íródott.`
      : `Menü-seed kész — összesítés: ${summary.created.length} létrehozva, ${summary.skipped.length} érintetlenül hagyva.`,
  )
  if (DRY_RUN) {
    payload.logger.info('Menü-seed: tényleges futtatás → npm run seed:menu')
  }
}

seedMenu()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Menü-seed: hiba történt.', error)
    process.exit(1)
  })
