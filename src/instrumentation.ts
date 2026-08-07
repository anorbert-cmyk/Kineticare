/**
 * Next.js instrumentation hook — a szerver példány indulásakor fut le
 * (build közben nem), így itt assertáljuk a kötelező környezeti változókat.
 *
 * A futó Node-verziót is naplózzuk: ez az egyetlen jel, ami a TÉNYLEGESEN
 * futó processzről mond igazat. A Railway „SUCCESS" deployja kihagyhatja a
 * buildet és a régi artefaktot indíthatja el — a build-log ilyenkor hazudik,
 * ez a log-sor nem.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertRequiredEnv } = await import('./env')
    assertRequiredEnv()

    const { logger } = await import('./lib/logger')
    logger.info('server_start', { nodeVersion: process.version })
  }
}
