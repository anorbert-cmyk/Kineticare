import net from 'node:net'

/**
 * Elérhető-e TÉNYLEGESEN a teszt-adatbázis?
 *
 * A DB-függő tesztfájlok korábban csak a DATABASE_URI + PAYLOAD_SECRET env
 * MEGLÉTÉT nézték — a CI-kapu viszont álértékű DATABASE_URI-t exportál (a
 * production-buildhez kell), amely 127.0.0.1:5432-re mutat, ahol nem fut
 * Postgres. Az env-alapú kapcsoló így hamis pozitívot adott: a tesztek
 * elindultak, majd ECONNREFUSED-dal buktak.
 *
 * Ezért a kapcsoló egy gyors TCP-elérhetőségi próba: ha a host:port nem
 * fogad kapcsolatot (vagy 1,5 mp-en belül nem válaszol), a DB-tesztek
 * kihagyásra kerülnek — pontosan úgy, mint env nélkül. Elutasított kapcsolat
 * (ECONNREFUSED) azonnal visszatér, tehát a próba nem lassítja a futást.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const uri = process.env.DATABASE_URI
  if (!uri || !process.env.PAYLOAD_SECRET) {
    return false
  }

  let host: string
  let port: number
  try {
    const parsed = new URL(uri)
    host = parsed.hostname || '127.0.0.1'
    port = parsed.port ? Number(parsed.port) : 5432
  } catch {
    return false
  }

  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host, port })
    const finish = (result: boolean): void => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(1500, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}
