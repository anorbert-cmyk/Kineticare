import { type NextRequest, NextResponse } from 'next/server'

import { REQUEST_ID_HEADER, resolveRequestId } from './lib/request-id'

/**
 * Request ID middleware: minden bejövő kéréshez egyedi azonosítót rendel.
 *
 * - A meglévő `x-request-id` headert tiszteletben tartja (ha formailag érvényes),
 *   így a CDN/edge (pl. Cloudflare) és a Barion-callback-hívások azonosítója
 *   végigkövethető a rendszeren.
 * - A request headerekbe is beírja, hogy a route handlerek és Payload-hookok a
 *   `getRequestId` segéddel kiolvashassák, és a logger contextébe köthessék.
 * - A response mindig visszaadja a headerben a kliens/naplózás felé.
 */
export function middleware(request: NextRequest): NextResponse {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER))

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export const config = {
  matcher: [
    // Statikus assetekre és meta-fájlokra nem fut le.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
