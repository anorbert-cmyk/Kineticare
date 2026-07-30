/**
 * Job-queue nevek egy helyen, induláskori asserttal.
 *
 * A queue-név a Payload jobs-táblákban is megjelenik — kisbetű, szám, kötőjel
 * engedélyezett; elgépelés ellen modul-szinten validáljuk.
 */
const QUEUE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/

export function assertQueueName(name: string): string {
  if (!QUEUE_NAME_PATTERN.test(name)) {
    throw new Error(`Érvénytelen job-queue név: "${name}" (megengedett: ${QUEUE_NAME_PATTERN})`)
  }
  return name
}

export const WEBHOOK_RETRY_QUEUE = assertQueueName('webhook-maintenance')
