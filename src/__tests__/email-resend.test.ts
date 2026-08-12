import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendViaResend } from '../lib/email/resend'
import { EmailSendError } from '../lib/email/types'

/**
 * A Resend e-mail-küldő tesztjei (a tranzakciós levelek éles provider-e).
 *
 * A globális fetch itt STUBBOLVA van — a tesztből valódi hálózati hívás
 * sosem mehet (CLAUDE.md 15. tanulság); a stub a beforeEach/afterEach
 * párral fájlon belül marad.
 */

const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

const DUMMY_API_KEY = 'DUMMY-RESEND-KEY-NEM-VALODI-TITOK'

const MESSAGE = {
  to: ['vevo@example.test'],
  subject: 'Teszt tárgy',
  html: '<p>Szia</p>',
  text: 'Szia',
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}

describe('sendViaResend', () => {
  it('boldog út: a kérés felépítése és az id visszaadása', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 'email-123' }))

    const result = await sendViaResend(DUMMY_API_KEY, 'Kineticare <noreply@example.test>', MESSAGE)

    expect(result).toEqual({ id: 'email-123' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${DUMMY_API_KEY}`)
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      from: 'Kineticare <noreply@example.test>',
      to: ['vevo@example.test'],
      subject: 'Teszt tárgy',
    })
  })

  it('429 és 5xx ÚJAPRÓBÁLHATÓ hiba', async () => {
    for (const status of [429, 500, 503]) {
      fetchMock.mockResolvedValueOnce(jsonResponse(status, 'rate limited'))
      const error = await sendViaResend(DUMMY_API_KEY, 'a@b.hu', MESSAGE).catch(
        (caught: unknown) => caught,
      )
      expect(error).toBeInstanceOf(EmailSendError)
      expect((error as EmailSendError).retryable).toBe(true)
    }
  })

  it('4xx (nem 429) VÉGLEGES hiba', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { message: 'invalid' }))
    const error = await sendViaResend(DUMMY_API_KEY, 'a@b.hu', MESSAGE).catch(
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(EmailSendError)
    expect((error as EmailSendError).retryable).toBe(false)
  })

  it('hálózati hiba / timeout → retryable EmailSendError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    const error = await sendViaResend(DUMMY_API_KEY, 'a@b.hu', MESSAGE).catch(
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(EmailSendError)
    expect((error as EmailSendError).retryable).toBe(true)
  })

  it('a hibaüzenet törzse 200 karakterre vágva', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, 'x'.repeat(500)))
    const error = (await sendViaResend(DUMMY_API_KEY, 'a@b.hu', MESSAGE).catch(
      (caught: unknown) => caught,
    )) as EmailSendError
    expect(error.message.length).toBeLessThan(260)
  })
})
