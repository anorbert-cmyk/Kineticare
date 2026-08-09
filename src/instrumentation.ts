/**
 * Next.js instrumentation hook — a szerver példány indulásakor fut le
 * (build közben nem), így itt assertáljuk a kötelező környezeti változókat.
 *
 * A `server_start` sor a deploy-kanári: a Railway „SUCCESS" deployja
 * kihagyhatja a buildet és a RÉGI `.next/` artefaktot indíthatja el, ilyenkor
 * a build-log zöld, de nem az új kód fut. A `commitSha` mondja meg, MELYIK
 * kód indult el ténylegesen, a `nodeVersion` pedig azt, hogy a futásidő
 * tényleg a `package.json` engines-ében kért major-e — a railpack ugyanis a
 * `RAILPACK_NODE_VERSION` env-változóval FELÜLÍRHATÓ, és az erősebb az
 * engines-nél.
 *
 * A naplózás szándékosan az env-assert ELŐTT fut: ha hiányzik egy kötelező
 * változó, az `assertRequiredEnv()` dob, és épp abban a hibaesetben veszne el
 * a diagnosztika, amikor a legjobban kellene.
 *
 * A sor `info` szinten megy, tehát `LOG_LEVEL=warn` mellett eltűnik. Ha a
 * kanárit keresed és nem találod, előbb a `LOG_LEVEL`-t ellenőrizd — a hiánya
 * önmagában nem bizonyítja, hogy régi kód fut.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./lib/logger')
    logger.info('server_start', {
      nodeVersion: process.version,
      commitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'ismeretlen',
    })

    const { assertRequiredEnv } = await import('./env')
    assertRequiredEnv((message, context) => logger.warn(message, context))
  }
}
