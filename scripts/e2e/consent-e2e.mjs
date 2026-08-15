#!/usr/bin/env node
/**
 * Consent (süti-hozzájárulás) böngészős E2E-kör — Playwright, futásidőben feloldva.
 *
 * MIÉRT KELL: a `src/__tests__/analytics/consent.test.ts` és a
 * `consent-reopen.test.tsx` az állapotgépet és a láthatósági szabályt őrzi
 * node-környezetben, INJEKTÁLT tárolóval — vagyis a saját feltevéseit
 * hitelesíti. Amit egyik sem lát: valódi böngészőben, valódi localStorage-dzsal
 * és valódi hálózaton tényleg NEM megy-e ki mérés-kérés hozzájárulás előtt.
 * Ez a harness pontosan azt méri: minden kimenő kérést megfigyel
 * (`page.on('request')`), és a mérés-hosztokra irányulókat számolja.
 *
 * A VÉDETT SZABÁLY: mérés (PostHog / GA4) KIZÁRÓLAG megadott hozzájárulás után
 * indulhat; az elutasítás és a hozzájárulás perzisztens; a visszavonás működik.
 *
 * FÜGGŐSÉG: a Playwright SZÁNDÉKOSAN nincs a package.json-ben (a lockfile nem
 * szennyezhető egy fejlesztői eszközzel). A feloldás futásidőben történik:
 *   1. `import('playwright')` — ha a projektben vagy globálisan telepítve van,
 *   2. `E2E_PLAYWRIGHT_MODULE` — közvetlen útvonal a modulra (globális telepítés).
 * A böngésző-binárist az `E2E_CHROMIUM` env adja meg (opcionális: enélkül a
 * Playwright a saját letöltött böngészőjét használja).
 *
 * HASZNÁLAT:
 *   node scripts/e2e/consent-e2e.mjs [BASE_URL]
 *   node scripts/e2e/consent-e2e.mjs https://staging.example.hu
 *
 * Kimenet: forgatókönyvenkénti PASS/FAIL sorok + összegzés; bukásnál a
 * kilépési kód nem nulla. Részletek: docs/consent-e2e.md
 */

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

/* ─── Konfiguráció ────────────────────────────────────────────────────────── */

const BASE_URL = (process.argv[2] ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

/**
 * A consent tárolókulcsa SZÁNDÉKOSAN itt is ki van írva (nem a forrásból
 * importálva): ha a `src/lib/analytics/consent.ts` kulcsa megváltozik, minden
 * korábbi látogató döntése elveszik — ezt a harnessnek észre KELL vennie.
 */
const CONSENT_KULCS = 'kc_analytics_consent'

/** A banner gyökere (role + aria-label a valódi DOM-ból mérve). */
const BANNER_SEL = '[role="region"][aria-label="Süti-hozzájárulás"]'
const ELFOGAD_SZOVEG = 'Elfogadom'
const ELUTASIT_SZOVEG = 'Elutasítom'
const BEALLITAS_SZOVEG = 'Süti-beállítások'

/** Bejárandó oldalak a perzisztencia-ellenőrzéshez (env-ből felülírható). */
const NAV_UTVONALAK = (process.env.E2E_CONSENT_PATHS ?? '/kurzusok,/kapcsolat,/belepes')
  .split(',')
  .map((p) => p.trim())
  .filter((p) => p.length > 0)

/**
 * Stagingen, VALÓDI PostHog-kulccsal az elfogadás után mérés-kérésnek KELL
 * indulnia — ilyenkor `E2E_EXPECT_ANALYTICS=1`-gyel fordul meg a 3. forgatókönyv
 * elvárása. Helyben (kulcs nélkül) a kliens no-op, ezért az alapértelmezés a
 * „nulla kérés, de 'granted' állapot" elvárás.
 */
const MERES_VARHATO = process.env.E2E_EXPECT_ANALYTICS === '1'

/** Képernyőképek helye — ha nincs megadva, nem készül kép (a repó nem szennyeződik). */
const KEP_KONYVTAR = process.env.E2E_SCREENSHOT_DIR ?? ''

/** Mennyit várunk a kérések „leülepedésére" egy-egy lépés után (ms). */
const ULEPEDES_MS = Number(process.env.E2E_SETTLE_MS ?? 2500)

/**
 * ISMERT, NEM TERMÉKHIBÁS konzol-zaj. Ezek INFO-ként jelennek meg, nem buktatják
 * a kört — de a számuk és az első előfordulásuk látszik, tehát nincs elrejtve.
 *
 * - React dev-mode `eval()` panasz: a CSP-nkből SZÁNDÉKOSAN hiányzik az
 *   `'unsafe-eval'` (src/lib/security/csp.ts, őrző teszt:
 *   src/__tests__/security/csp.test.ts), a React fejlesztői módja viszont
 *   debug-célra eval()-t próbálna. Production buildben ez a kód meg sem jelenik.
 * - „Failed to load resource" — a HTTP-státuszokat külön, a válasz-figyelő
 *   sorolja fel URL-lel együtt (ott diagnosztizálható, itt csak duplikátum).
 *
 * `E2E_STRICT_CONSOLE=1` mellett ezek is buktatnak (staging/production
 * futtatáshoz, ahol dev-mode zaj nem lehet).
 */
const DEV_ZAJ_MINTAK = [
  /eval\(\) is not supported in this environment/i,
  /React will never use eval\(\) in production mode/i,
  /Failed to load resource: the server responded with a status of/i,
]
const SZIGORU_KONZOL = process.env.E2E_STRICT_CONSOLE === '1'

/** E fölött a Tab-lépésszám fölött külön figyelmeztetés megy a jelentésbe. */
const FOKUSZ_KUSZOB = Number(process.env.E2E_FOCUS_LIMIT ?? 10)

/* ─── Mérés-hosztok felismerése ───────────────────────────────────────────── */

/**
 * Mérés-kérésnek számít minden, ami a PostHog elsőfél-proxyjára (/ingest), a
 * PostHog saját hosztjaira vagy a Google mérés-hosztjaira megy. A kérdés nem
 * az, hogy „a mi kliensünk küldte-e" — bármely úton kimenő mérés-forgalom a
 * hozzájárulás előtt szabálysértés.
 */
const MERES_SZABALYOK = [
  { cimke: '/ingest (PostHog elsőfél-proxy)', talal: (u) => u.pathname.startsWith('/ingest') },
  { cimke: 'posthog.com', talal: (u) => /(^|\.)posthog\.com$/.test(u.hostname) },
  { cimke: 'google-analytics.com', talal: (u) => /(^|\.)google-analytics\.com$/.test(u.hostname) },
  { cimke: 'googletagmanager.com', talal: (u) => /(^|\.)googletagmanager\.com$/.test(u.hostname) },
  { cimke: 'analytics.google.com', talal: (u) => u.hostname === 'analytics.google.com' },
  { cimke: 'doubleclick.net', talal: (u) => /(^|\.)doubleclick\.net$/.test(u.hostname) },
]

/** Egy kérés URL-je → a talált mérés-címke, vagy null. */
function meresCimke(nyersUrl) {
  let url
  try {
    url = new URL(nyersUrl)
  } catch {
    return null
  }
  for (const szabaly of MERES_SZABALYOK) {
    if (szabaly.talal(url)) {
      return szabaly.cimke
    }
  }
  return null
}

/* ─── Eredmény-gyűjtő ─────────────────────────────────────────────────────── */

const eredmenyek = []
let jelenlegiForgatokonyv = '(ismeretlen)'

function allit(allitas, feltetel, reszlet = '') {
  eredmenyek.push({
    forgatokonyv: jelenlegiForgatokonyv,
    allitas,
    allapot: feltetel ? 'PASS' : 'FAIL',
    reszlet,
  })
  const jel = feltetel ? 'PASS' : 'FAIL'
  console.log(`  [${jel}] ${allitas}${reszlet ? ` — ${reszlet}` : ''}`)
}

function megjegyzes(cimke, reszlet) {
  eredmenyek.push({
    forgatokonyv: jelenlegiForgatokonyv,
    allitas: cimke,
    allapot: 'INFO',
    reszlet,
  })
  console.log(`  [INFO] ${cimke}${reszlet ? ` — ${reszlet}` : ''}`)
}

/* ─── Playwright feloldása ────────────────────────────────────────────────── */

/**
 * A `chromium` névtér feloldása: elsőként a szokásos csomagfeloldás, utána az
 * `E2E_PLAYWRIGHT_MODULE` útvonal (globálisan telepített Playwright). A globális
 * csomag CJS-alakja miatt a névtér a `default` alatt is állhat — mindkettőt
 * kezeljük.
 */
async function playwrightBetoltes() {
  const jeloltek = []
  jeloltek.push({ cimke: "import('playwright')", betolt: () => import('playwright') })
  const kulsoUtvonal = process.env.E2E_PLAYWRIGHT_MODULE
  if (kulsoUtvonal) {
    jeloltek.push({
      cimke: `E2E_PLAYWRIGHT_MODULE=${kulsoUtvonal}`,
      betolt: () => import(kulsoUtvonal.startsWith('/') ? `file://${kulsoUtvonal}` : kulsoUtvonal),
    })
  }

  const hibak = []
  for (const jelolt of jeloltek) {
    try {
      const modul = await jelolt.betolt()
      const chromium = modul.chromium ?? modul.default?.chromium
      if (chromium) {
        console.log(`Playwright forrása: ${jelolt.cimke}`)
        return chromium
      }
      hibak.push(`${jelolt.cimke}: a modulban nincs 'chromium' névtér`)
    } catch (hiba) {
      hibak.push(`${jelolt.cimke}: ${hiba instanceof Error ? hiba.message : String(hiba)}`)
    }
  }
  throw new Error(
    `A Playwright nem oldható fel (a repó szándékosan nem függ tőle).\n` +
      hibak.map((sor) => `  - ${sor}`).join('\n') +
      `\nMegoldás: npm i -g playwright && npx playwright install chromium, majd` +
      ` E2E_PLAYWRIGHT_MODULE=<útvonal>/playwright/index.js (és opcionálisan E2E_CHROMIUM=<böngésző-bináris>).`,
  )
}

/* ─── Oldal-segédek ───────────────────────────────────────────────────────── */

/**
 * Friss profil (üres localStorage) + hálózat- és konzolfigyelés. Minden
 * forgatókönyv saját kontextusban fut, hogy a döntések ne szivárogjanak át.
 */
async function ujMunkamenet(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'hu-HU' })
  const page = await ctx.newPage()
  const meresek = []
  const konzolHibak = []
  const devZaj = []
  const hibasValaszok = []

  page.on('request', (keres) => {
    const cimke = meresCimke(keres.url())
    if (cimke) {
      meresek.push({ cimke, url: keres.url(), metodus: keres.method() })
    }
  })
  page.on('response', (valasz) => {
    if (valasz.status() >= 400) {
      hibasValaszok.push(`${valasz.status()} ${valasz.url()}`)
    }
  })
  page.on('console', (uzenet) => {
    if (uzenet.type() !== 'error') {
      return
    }
    const szoveg = uzenet.text()
    if (!SZIGORU_KONZOL && DEV_ZAJ_MINTAK.some((minta) => minta.test(szoveg))) {
      devZaj.push(szoveg)
      return
    }
    konzolHibak.push(szoveg)
  })
  page.on('pageerror', (hiba) => {
    konzolHibak.push(`pageerror: ${hiba.message}`)
  })

  return { ctx, page, meresek, konzolHibak, devZaj, hibasValaszok }
}

/** Konzol- és HTTP-zárás: a valódi hibák buknak, az ismert zaj INFO-ba kerül. */
function konzolZaras(konzolHibak, devZaj, hibasValaszok) {
  allit(
    'nincs (ismeretlen eredetű) konzolhiba',
    konzolHibak.length === 0,
    konzolHibak.slice(0, 3).join(' | '),
  )
  if (devZaj.length > 0) {
    megjegyzes(
      'ismert dev-mode konzol-zaj (nem termékhiba)',
      `${devZaj.length} db; első: ${devZaj[0].split('\n')[0].slice(0, 120)}`,
    )
  }
  if (hibasValaszok.length > 0) {
    megjegyzes(
      'HTTP 4xx/5xx válaszok a kör alatt',
      [...new Set(hibasValaszok)].slice(0, 5).join(' | '),
    )
  }
}

async function nyit(page, utvonal) {
  await page.goto(`${BASE_URL}${utvonal}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(ULEPEDES_MS)
}

async function bannerLathato(page) {
  return (await page.locator(BANNER_SEL).count()) > 0 && (await page.locator(BANNER_SEL).isVisible())
}

async function consentAllapot(page) {
  return page.evaluate((kulcs) => window.localStorage.getItem(kulcs), CONSENT_KULCS)
}

async function kepMentes(page, nev) {
  if (!KEP_KONYVTAR) {
    return
  }
  await mkdir(KEP_KONYVTAR, { recursive: true })
  await page.screenshot({ path: path.join(KEP_KONYVTAR, `${nev}.png`), fullPage: false })
}

/** A gyűjtött mérés-kérések tömör összefoglalója a jelentéshez. */
function meresOsszegzes(meresek) {
  if (meresek.length === 0) {
    return '0 mérés-kérés'
  }
  const szamlalo = new Map()
  for (const m of meresek) {
    szamlalo.set(m.cimke, (szamlalo.get(m.cimke) ?? 0) + 1)
  }
  return [...szamlalo.entries()].map(([cimke, db]) => `${cimke}: ${db}`).join(', ')
}

/** A banner gombjai — a valódi, hozzáférhető névvel keresve (nem CSS-osztállyal). */
function gomb(page, nev) {
  return page.getByRole('button', { name: nev, exact: true })
}

/**
 * Hidratálás-bizonyíték: a footer „Süti-beállítások" gombja újranyitja a
 * bannert. Ha ez működik, a lap ÉL — vagyis a „nincs banner" megállapítás nem
 * egy halott oldalból származik (ez a negatív állítások leggyakoribb hamis
 * PASS-a). A banner utána bezárható a `zar` visszatérési függvénnyel.
 */
async function hidratalasProba(page) {
  const beallitasGomb = gomb(page, BEALLITAS_SZOVEG)
  if ((await beallitasGomb.count()) === 0) {
    return { el: false, ok: false }
  }
  await beallitasGomb.first().click()
  await page.waitForTimeout(300)
  return { el: true, ok: await bannerLathato(page) }
}

/* ─── 1. forgatókönyv: anonim, friss profil ───────────────────────────────── */

async function forgatokonyvAnonim(browser) {
  jelenlegiForgatokonyv = '1. ANONIM (friss profil, döntés előtt)'
  console.log(`\n▶ ${jelenlegiForgatokonyv}`)
  const { ctx, page, meresek, konzolHibak, devZaj, hibasValaszok } = await ujMunkamenet(browser)
  try {
    await nyit(page, '/')

    allit('a consent-banner megjelenik', await bannerLathato(page), BANNER_SEL)
    allit(
      'a tárolóban NINCS consent-kulcs (a látogató még nem döntött)',
      (await consentAllapot(page)) === null,
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )
    allit(
      'NULLA mérés-kérés megy ki a lap betöltése alatt',
      meresek.length === 0,
      meresOsszegzes(meresek),
    )

    // Globális névtér: a gtag.js snippet `dataLayer`-t hoz létre, a posthog-js
    // pedig `window.posthog`-ot tesz közzé az init során. Döntés előtt EGYIK
    // sem lehet aktív — ezt hálózat nélkül, magában a böngészőben méri.
    const globalisak = await page.evaluate(() => ({
      dataLayer: Array.isArray(window.dataLayer) ? window.dataLayer.length : null,
      gtag: typeof window.gtag,
      posthogInit: Boolean(window.posthog && window.posthog.__loaded),
    }))
    allit(
      'döntés előtt nincs GA-névtér (dataLayer/gtag)',
      globalisak.dataLayer === null && globalisak.gtag === 'undefined',
      `dataLayer=${String(globalisak.dataLayer)}, gtag=${globalisak.gtag}`,
    )
    allit('döntés előtt a PostHog-kliens nincs inicializálva', globalisak.posthogInit === false)

    // GDPR-tájékoztatási kötelezettség: a bannerből el kell érni az adatvédelmi
    // tájékoztatót. A cél elérhetőségét külön mérjük (helyben CMS-oldal híján
    // 404 lehet — ez seed-kérdés, de stagingen/élesben 200-nak KELL lennie).
    const adatvedelemLink = page.locator(`${BANNER_SEL} a[href="/adatvedelem"]`)
    allit(
      'a banner az adatvédelmi tájékoztatóra mutató linket tartalmaz',
      (await adatvedelemLink.count()) > 0,
    )
    const adatvedelemValasz = await page.request.get(`${BASE_URL}/adatvedelem`)
    megjegyzes(
      'az /adatvedelem oldal HTTP-státusza',
      `${adatvedelemValasz.status()}${adatvedelemValasz.status() >= 400 ? ' — FIGYELEM: a banner linkje törött ezen a környezeten' : ''}`,
    )

    konzolZaras(konzolHibak, devZaj, hibasValaszok)
    await kepMentes(page, '1-anonim-banner')
  } finally {
    await ctx.close()
  }
}

/* ─── 2. forgatókönyv: elutasítás + perzisztencia ─────────────────────────── */

async function forgatokonyvElutasitas(browser) {
  jelenlegiForgatokonyv = '2. ELUTASÍTÁS (perzisztens, több oldalon át)'
  console.log(`\n▶ ${jelenlegiForgatokonyv}`)
  const { ctx, page, meresek, konzolHibak, devZaj, hibasValaszok } = await ujMunkamenet(browser)
  try {
    await nyit(page, '/')
    allit('kiinduláskor látszik a banner', await bannerLathato(page))

    await gomb(page, ELUTASIT_SZOVEG).click()
    await page.waitForTimeout(500)

    allit('kattintás után a banner eltűnik', !(await bannerLathato(page)))
    allit(
      `a tárolt döntés 'denied'`,
      (await consentAllapot(page)) === 'denied',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )

    const dontesUtan = meresek.length
    for (const utvonal of NAV_UTVONALAK) {
      await nyit(page, utvonal)
      allit(
        `navigáció után sincs mérés-kérés (${utvonal})`,
        meresek.length === dontesUtan,
        meresOsszegzes(meresek.slice(dontesUtan)),
      )
      allit(`a banner nem jelenik meg újra (${utvonal})`, !(await bannerLathato(page)))
    }

    // Perzisztencia: teljes újratöltés friss oldalbetöltéssel.
    await nyit(page, '/')
    allit('reload után sincs banner (a döntés perzisztens)', !(await bannerLathato(page)))
    allit(
      `reload után is 'denied' a tárolt állapot`,
      (await consentAllapot(page)) === 'denied',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )
    allit(
      'a teljes forgatókönyv alatt NULLA mérés-kérés',
      meresek.length === 0,
      meresOsszegzes(meresek),
    )

    // Hamis-PASS elleni őr: a lap tényleg él-e (hidratált-e).
    const proba = await hidratalasProba(page)
    allit(
      'a „nincs banner" élő, hidratált oldalról származik (a footer-gomb újranyitja)',
      proba.el && proba.ok,
      proba.el ? '' : 'a „Süti-beállítások" gomb nem található',
    )
    konzolZaras(konzolHibak, devZaj, hibasValaszok)
    await kepMentes(page, '2-elutasitas')
  } finally {
    await ctx.close()
  }
}

/* ─── 3. forgatókönyv: elfogadás ──────────────────────────────────────────── */

async function forgatokonyvElfogadas(browser) {
  jelenlegiForgatokonyv = '3. ELFOGADÁS (friss profil)'
  console.log(`\n▶ ${jelenlegiForgatokonyv}`)
  const { ctx, page, meresek, konzolHibak, devZaj, hibasValaszok } = await ujMunkamenet(browser)
  try {
    await nyit(page, '/')
    allit('kiinduláskor látszik a banner', await bannerLathato(page))
    const dontesElott = meresek.length
    allit('a döntés ELŐTT nulla mérés-kérés', dontesElott === 0, meresOsszegzes(meresek))

    await gomb(page, ELFOGAD_SZOVEG).click()
    await page.waitForTimeout(ULEPEDES_MS)

    allit('kattintás után a banner eltűnik', !(await bannerLathato(page)))
    allit(
      `a tárolt döntés 'granted'`,
      (await consentAllapot(page)) === 'granted',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )

    await nyit(page, NAV_UTVONALAK[0] ?? '/')
    const dontesUtan = meresek.length - dontesElott

    if (MERES_VARHATO) {
      // Staging, valódi NEXT_PUBLIC_POSTHOG_KEY-jel: itt MEG KELL indulnia a
      // forgalomnak — enélkül a hozzájárulás hatástalan (néma mérés-kiesés).
      allit(
        'elfogadás UTÁN elindul a mérés-forgalom (E2E_EXPECT_ANALYTICS=1)',
        dontesUtan > 0,
        meresOsszegzes(meresek),
      )
    } else {
      // Helyben nincs PostHog-kulcs/GA-azonosító → a kliens no-op. Ezt mérjük,
      // nem feltételezzük: a helyes viselkedés a NULLA kérés + 'granted' állapot.
      allit(
        'mérés-kulcs nélkül elfogadás után SINCS kimenő mérés-kérés (no-op kliens)',
        dontesUtan === 0,
        meresOsszegzes(meresek),
      )
    }

    allit(
      `reload után is 'granted' a döntés (perzisztens)`,
      (await consentAllapot(page)) === 'granted',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )
    allit('reload után nem jelenik meg újra a banner', !(await bannerLathato(page)))
    konzolZaras(konzolHibak, devZaj, hibasValaszok)
    await kepMentes(page, '3-elfogadas')
  } finally {
    await ctx.close()
  }
}

/* ─── 4. forgatókönyv: visszavonás ────────────────────────────────────────── */

async function forgatokonyvVisszavonas(browser) {
  jelenlegiForgatokonyv = '4. VISSZAVONÁS (elfogadás → footer „Süti-beállítások" → elutasítás)'
  console.log(`\n▶ ${jelenlegiForgatokonyv}`)
  const { ctx, page, meresek, konzolHibak, devZaj, hibasValaszok } = await ujMunkamenet(browser)
  try {
    await nyit(page, '/')
    await gomb(page, ELFOGAD_SZOVEG).click()
    await page.waitForTimeout(500)
    allit(`kiindulás: 'granted' állapot`, (await consentAllapot(page)) === 'granted')

    const beallitasGomb = gomb(page, BEALLITAS_SZOVEG)
    const vanFelulet = (await beallitasGomb.count()) > 0
    allit(
      'létezik visszavonási felület (footer „Süti-beállítások")',
      vanFelulet,
      vanFelulet ? '' : 'GDPR-hiány: a hozzájárulás nem vonható vissza a felületről',
    )
    if (!vanFelulet) {
      return
    }

    await beallitasGomb.first().click()
    await page.waitForTimeout(500)
    allit('a banner döntés UTÁN is újranyílik', await bannerLathato(page))
    await kepMentes(page, '4-visszavonas-banner')

    await gomb(page, ELUTASIT_SZOVEG).click()
    await page.waitForTimeout(ULEPEDES_MS)
    allit('a visszavonás után a banner bezárul', !(await bannerLathato(page)))
    allit(
      `a visszavonás átírja a tárolt döntést 'denied'-re`,
      (await consentAllapot(page)) === 'denied',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )

    const visszavonasElott = meresek.length
    await nyit(page, NAV_UTVONALAK[0] ?? '/')
    allit(
      'visszavonás után nem indul új mérés-kérés',
      meresek.length === visszavonasElott,
      meresOsszegzes(meresek.slice(visszavonasElott)),
    )
    allit(
      `reload után is 'denied' (a visszavonás perzisztens)`,
      (await consentAllapot(page)) === 'denied',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )
    allit('reload után nincs banner', !(await bannerLathato(page)))
    konzolZaras(konzolHibak, devZaj, hibasValaszok)
  } finally {
    await ctx.close()
  }
}

/* ─── 5. forgatókönyv: akadálymentesség ───────────────────────────────────── */

async function forgatokonyvAkadalymentesseg(browser) {
  jelenlegiForgatokonyv = '5. AKADÁLYMENTESSÉG (fókusz, Escape, hozzáférhető nevek)'
  console.log(`\n▶ ${jelenlegiForgatokonyv}`)
  const { ctx, page, konzolHibak, devZaj, hibasValaszok } = await ujMunkamenet(browser)
  try {
    await nyit(page, '/')
    allit('a banner látható a méréshez', await bannerLathato(page))

    // Hozzáférhető nevek — a getByRole a hozzáférhetőségi fán keres.
    allit(
      `az „${ELFOGAD_SZOVEG}" gomb hozzáférhető névvel elérhető`,
      (await gomb(page, ELFOGAD_SZOVEG).count()) === 1,
    )
    allit(
      `az „${ELUTASIT_SZOVEG}" gomb hozzáférhető névvel elérhető`,
      (await gomb(page, ELUTASIT_SZOVEG).count()) === 1,
    )

    const szerep = await page.locator(BANNER_SEL).getAttribute('role')
    const cimke = await page.locator(BANNER_SEL).getAttribute('aria-label')
    megjegyzes('a banner konténerének szerepe/címkéje', `role=${szerep}, aria-label=${cimke}`)

    // Fókusz betöltéskor: hova kerül? (Mérés, nem feltevés.)
    const kezdoFokusz = await page.evaluate(() => {
      const el = document.activeElement
      return el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}` : 'nincs'
    })
    megjegyzes('a fókusz betöltéskor', kezdoFokusz)

    // Fókusz-sorrend: hány Tab kell a banner első gombjáig?
    const MAX_TAB = 80
    let tabokSzama = -1
    const utkozben = []
    for (let i = 1; i <= MAX_TAB; i += 1) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate((sel) => {
        const el = document.activeElement
        if (!el) {
          return { leiras: 'nincs', bannerben: false }
        }
        const szoveg = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
        return {
          leiras: `${el.tagName.toLowerCase()}:${szoveg}`,
          bannerben: Boolean(el.closest(sel)),
        }
      }, BANNER_SEL)
      if (info.bannerben) {
        tabokSzama = i
        break
      }
      utkozben.push(info.leiras)
    }
    if (tabokSzama > 0) {
      megjegyzes(
        'Tab-lépések a banner első vezérlőjéig',
        `${tabokSzama} lépés; előtte: ${utkozben.join(' → ') || '(semmi)'}`,
      )
      // Küszöb: a banner a body VÉGÉN van és nincs fókusz-kezelés, ezért a
      // billentyűzetes látogatónak az egész lapot végig kell tabolnia a
      // döntésig. Ez nem buktatja a kört (nem consent-szivárgás), de hangosan
      // jelentendő — a GDPR „ugyanolyan könnyű" elve billentyűzeten is él.
      if (tabokSzama > FOKUSZ_KUSZOB) {
        megjegyzes(
          'FIGYELEM — fókusz-sorrend',
          `a banner első gombja csak ${tabokSzama} Tab után érhető el (küszöb: ${FOKUSZ_KUSZOB}); a sáv a DOM végén ül, fókusz-kezelés nélkül`,
        )
      }
    }
    allit(
      `a banner vezérlői billentyűzetről elérhetők (max ${MAX_TAB} Tab)`,
      tabokSzama > 0,
      tabokSzama > 0 ? `${tabokSzama}. Tab-lépésre` : 'nem érhető el Tabbal',
    )

    // Escape: mit csinál? Mérjük — és a BIZTONSÁGI tulajdonságot állítjuk:
    // Escape SOSEM adhat hozzájárulást, és nem tüntetheti el a bannert döntés
    // nélkül (az „elutasításnak" számító néma bezárás GDPR-szempontból hibás).
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const escapeUtanLathato = await bannerLathato(page)
    const escapeUtanAllapot = await consentAllapot(page)
    megjegyzes(
      'Escape hatása',
      `banner látható: ${escapeUtanLathato ? 'igen' : 'nem'}, tárolt állapot: ${String(escapeUtanAllapot)}`,
    )
    allit('Escape NEM ad hozzájárulást', escapeUtanAllapot !== 'granted')
    allit(
      'Escape nem tünteti el a bannert döntés nélkül',
      escapeUtanLathato || escapeUtanAllapot !== null,
    )

    // Enter/Space a fókuszált gombon: a natív <button> viselkedés ellenőrzése.
    await gomb(page, ELUTASIT_SZOVEG).focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    allit(
      'a döntés billentyűzettel (Enter) is meghozható',
      (await consentAllapot(page)) === 'denied',
      `${CONSENT_KULCS} = ${String(await consentAllapot(page))}`,
    )

    konzolZaras(konzolHibak, devZaj, hibasValaszok)
    await kepMentes(page, '5-akadalymentesseg')
  } finally {
    await ctx.close()
  }
}

/* ─── Futtatás ────────────────────────────────────────────────────────────── */

async function fut() {
  console.log('═'.repeat(72))
  console.log(`Consent E2E — cél: ${BASE_URL}`)
  console.log(
    `Elvárás elfogadás után: ${MERES_VARHATO ? 'INDUL mérés-forgalom (staging)' : 'NINCS mérés-forgalom (helyi, kulcs nélkül)'}`,
  )
  console.log('═'.repeat(72))

  const chromium = await playwrightBetoltes()
  const inditas = {}
  if (process.env.E2E_CHROMIUM) {
    inditas.executablePath = process.env.E2E_CHROMIUM
  }
  const browser = await chromium.launch(inditas)

  try {
    await forgatokonyvAnonim(browser)
    await forgatokonyvElutasitas(browser)
    await forgatokonyvElfogadas(browser)
    await forgatokonyvVisszavonas(browser)
    await forgatokonyvAkadalymentesseg(browser)
  } finally {
    await browser.close()
  }

  const bukott = eredmenyek.filter((e) => e.allapot === 'FAIL')
  const atment = eredmenyek.filter((e) => e.allapot === 'PASS')
  const info = eredmenyek.filter((e) => e.allapot === 'INFO')

  console.log(`\n${'═'.repeat(72)}`)
  console.log(
    `ÖSSZEGZÉS — 5 forgatókönyv, ${atment.length} PASS, ${bukott.length} FAIL, ${info.length} INFO`,
  )
  if (bukott.length > 0) {
    console.log('\nBukott állítások:')
    for (const e of bukott) {
      console.log(`  ✗ [${e.forgatokonyv}] ${e.allitas}${e.reszlet ? ` — ${e.reszlet}` : ''}`)
    }
  }
  console.log('═'.repeat(72))

  return bukott.length === 0 ? 0 : 1
}

fut()
  .then((kod) => {
    process.exitCode = kod
  })
  .catch((hiba) => {
    console.error(`\nA harness futása megszakadt: ${hiba instanceof Error ? hiba.stack : hiba}`)
    process.exitCode = 2
  })
