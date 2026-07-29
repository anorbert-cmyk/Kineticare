/**
 * Next.js instrumentation hook — a szerver példány indulásakor fut le
 * (build közben nem), így itt assertáljuk a kötelező környezeti változókat.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertRequiredEnv } = await import('./env')
    assertRequiredEnv()
  }
}
