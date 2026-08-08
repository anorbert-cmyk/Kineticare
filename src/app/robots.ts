import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/seo'

/**
 * robots.txt — a Next.js metadata-API generálja (`/robots.txt`).
 *
 * Két külön döntés van benne, és fontos, hogy ne keveredjenek:
 *
 * 1. **Mit NE indexeljen senki.** A privát és tranzakciós útvonalak (admin, API,
 *    fiók, kosár, pénztár, auth-oldalak) nem valók keresőbe: vagy bejelentkezést
 *    igényelnek, vagy egyszer használatos állapotot mutatnak. A `/kurzusaim` és
 *    a `/fiok` ráadásul felhasználóhoz kötött tartalom.
 *
 * 2. **AI-crawlerek kifejezett engedélyezése.** A GEO/AEO-láthatóság első
 *    feltétele, hogy az AI-botok egyáltalán elérjék a tartalmat. Ezek a botok
 *    külön user-agentek, és sok sablon-robots.txt vagy bot-védelem alapból
 *    kizárja őket — ezért soroljuk fel explicit ALLOW-val, hogy egy későbbi
 *    általános tiltás se zárja ki őket véletlenül.
 *
 * Ha valaha AI-tréninget korlátozni akarunk, azt a `Google-Extended` és `CCBot`
 * eltávolításával kell megtenni — a keresési/idézési botokat (`OAI-SearchBot`,
 * `Claude-SearchBot`, `PerplexityBot`) viszont érdemes engedni, mert ezek adják
 * az idézeteket és a hivatkozó forgalmat.
 */

/** Bejelentkezés mögötti, tranzakciós vagy egyszer használatos útvonalak. */
const DISALLOWED_PATHS = [
  '/admin',
  '/api/',
  '/graphql',
  '/fiok',
  '/kurzusaim',
  '/kosar',
  '/penztar',
  '/fizetes/',
  '/sikertelen',
  '/belepes',
  '/regisztracio',
  '/elfelejtett-jelszo',
  '/jelszo-visszaallitas',
  // Piszkozat-előnézet be-/kikapcsoló végpontok — a válaszaik amúgy is
  // noindexeltek, ez csak plusz védőháló a felesleges crawl ellen.
  '/next/',
]

/**
 * AI-crawlerek és -ágensek, amelyeket kifejezetten engedünk.
 * Forrás-kategóriák: OpenAI, Anthropic, Perplexity, Common Crawl, Google AI,
 * valamint a felhasználó megbízásából cselekvő ágens-fetcher (Google-Agent).
 */
const AI_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot',
  'Google-Extended',
  'Google-Agent',
  'Applebot-Extended',
  'Bingbot',
  'meta-externalagent',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOWED_PATHS,
      })),
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
