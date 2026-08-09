import { getPayload } from 'payload'

import {
  createBarionCallbackHandler,
  registerBarionWebhookProcessor,
} from '../../../../../lib/barion-callback/route-handler'
import config from '../../../../../payload.config'

/**
 * Barion callback-végpont (T-022).
 *
 * - A handler AZONNAL dedupol (webhook-events, provider='barion') és 200-at
 *   válaszol — a Barion 15 mp-es elvárásán belül, a GetState-re sosem várva.
 * - Az aszinkron feldolgozás a next/server after()-folyamatában indul; a
 *   hibás/kimaradt eseményeket a T-014 webhook-retry job viszi tovább — ehhez
 *   kell a 'barion' processzor regisztrációja.
 *
 * A regisztráció DETERMINISZTIKUS helye a payload.config `onInit`-je (M-15):
 * az minden folyamatindulásnál lefut, függetlenül attól, hogy ez a route-modul
 * betöltődött-e már (a Next.js lustán tölti be, tehát a retry/poll útvonalon
 * önmagában nem garantált). Az itteni hívás megmarad, mert ugyanazt az értéket
 * írja be (Map.set, idempotens), és a route saját bekötését is dokumentálja.
 */
const getPayloadInstance = () => getPayload({ config })

registerBarionWebhookProcessor(getPayloadInstance)

export const POST = createBarionCallbackHandler({ getPayload: getPayloadInstance })
