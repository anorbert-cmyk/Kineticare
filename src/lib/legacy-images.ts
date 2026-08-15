/**
 * A régi (systeme.io-s) kineticare.hu archívumából átemelt képek listája.
 *
 * A lista KÉT helyről használatos, ezért él önálló modulban (a
 * `src/scripts/restore-legacy-content.ts` importálja a `payload.config`-ot, így
 * abból a `payload.config` nem importálhat vissza — kör lenne):
 *  - `src/scripts/restore-legacy-content.ts` — az első betöltés (alt-szövegekkel),
 *  - `src/lib/media-restore.ts` — az induláskori önjavítás, amely a hiányzó
 *    képfájlokat ezekből a repóban élő forrásokból tölti vissza.
 *
 * A fájlok a `src/scripts/legacy-content/kepek/` mappában élnek.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface LegacyImage {
  /** A fájl neve az archívumban — egyben az idempotencia-kulcs alapja. */
  file: string
  /** Kötelező magyar képleírás (Media.alt). */
  alt: string
}

export const LEGACY_IMAGES: readonly LegacyImage[] = [
  { file: '6790f4bfde577_kckeklogog.png', alt: 'Kineticare logó' },
  {
    file: '67b4bc17e0c78_katak-paravan.jpg',
    alt: 'Kiss Kata és Kocsis Kata gyógytornászok, a Kineticare alapítói',
  },
  {
    file: '67c07b094d012_SYL_9113.jpeg',
    alt: 'Gyógytornász kezelés a Kineticare rendelőben',
  },
  {
    file: '678fa5f84cd52_Katakeleganslaptoppal.jpeg',
    alt: 'A Kineticare gyógytornásza laptop előtt – online program',
  },
  { file: '67b3c6e9e315f_KocsisKatakozeli.png', alt: 'Kocsis Kata gyógytornász portré' },
  { file: '67c07def59ac2_KissKataelegans.png', alt: 'Kiss Kata gyógytornász portré' },
  /*
   * ALT-JAVÍTÁS (docs/grafikai-leltar-regi-oldal.md 3.3, 2. pont): a korábbi
   * „Kiss Kata és Kocsis Kata munka közben" HIBÁS volt — a képen EGYETLEN
   * személy, Kocsis Kata van. A képleírás a képernyőolvasónak a kép TÉNYLEGES
   * tartalmát mondja; két nevet említeni egy szóló portrén félrevezető.
   *
   * FIGYELEM: az `ensureMedia` (src/scripts/restore-legacy-content.ts) meglévő
   * médiát SOSEM ír felül, ezért ez a javítás csak FRISS betöltésre hat — a már
   * feltöltött éles rekord alt-ját a Médiatárban kell egyszer átírni.
   */
  {
    file: '682a121babe80_IMG_7573.jpeg',
    alt: 'Kocsis Kata gyógytornász, a Kineticare alapítója',
  },
  { file: '6883e93d26513_GaramiGabor.png', alt: 'Garami Gábor zenész, műsorvezető – vélemény' },
  { file: '682c8a154f5ba_IMG_0039.jpeg', alt: 'Páciens-vélemény portréfotó' },
  {
    file: '688b93e6ab76f_Programpackshot.png',
    alt: 'Otthoni KézRehab Program csomagkép',
  },
  { file: '678fcfac079a8_Gyakorlat.JPG', alt: 'Kézrehabilitációs gyakorlat bemutatása' },
  {
    file: '680a69d078306_Katakfeherbenhattal.png',
    alt: 'Kiss Kata és Kocsis Kata, a Kineticare alapítói',
  },
  {
    file: '688b873ad2a80_belepotermekpackshot1.png',
    alt: 'SOS Kézrelax villámkurzus csomagkép',
  },
  {
    file: '6884161138c15_puska.png',
    alt: 'Letölthető gyakorlat-összefoglaló (puska) a villámkurzushoz',
  },
  { file: '67b3bd06f3936_Rendelo.png', alt: 'Kineticare rendelő – személyes kezelések' },
  {
    file: '67b2668feae66_Kezeleskek.png',
    alt: 'Rendelői kezelések – gyógytorna és manuálterápia',
  },
]

/** Az archív képek gyökere a repóban (src/scripts/legacy-content/kepek). */
export const LEGACY_IMAGES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'scripts',
  'legacy-content',
  'kepek',
)
