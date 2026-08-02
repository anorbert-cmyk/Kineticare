/**
 * PreviewVideo — a kurzus PUBLIKUS előzetes-videójának lejátszója
 * (previewVideoStreamId). Ha a termékhez nincs előzetes rendelve, a
 * szekció rejtve marad (a komponens null-t ad).
 *
 * A lejátszó a Cloudflare Stream publikus iframe-embedje — ez a platform
 * videó-szolgáltatója (a védett, tokenes lejátszás a W3-hullám feladata,
 * ez a komponens NEM hív stream-token végpontot). A beágyazott videó a
 * szolgáltató domainjéről töltődik; statikus asset-hotlink (kép/font/CSS)
 * továbbra is tilos.
 *
 * A Stream customer-subdomain a NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE
 * környezeti változóból jön (lazy, nem induláskori kötelező ENV): hiányában
 * az előzetes-szekció rejtve marad, az oldal ettől még teljes értékű.
 * TODO(W3): a védett lejátszóval közös, végleges stream-embed komponensre
 * cserélni, amint a W3 player-felület kész.
 */
/**
 * Van-e megjeleníthető előzetes: a streamId ÉS a customer-code ENV együtt
 * kell hozzá — a kurzus-oldal ezzel rejti el az egész szekciót.
 */
export function hasPreviewVideo(streamId: string | null | undefined): boolean {
  const id = typeof streamId === 'string' ? streamId.trim() : ''
  return id.length > 0 && Boolean(process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE?.trim())
}

export interface PreviewVideoProps {
  streamId: string | null | undefined
  /** Akadálymentes cím az iframe-hez (pl. „<kurzus címe> — előzetes"). */
  title: string
}

export function PreviewVideo({ streamId, title }: PreviewVideoProps) {
  if (!hasPreviewVideo(streamId)) {
    return null
  }
  const id = (streamId as string).trim()
  const customerCode = process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE!.trim()
  const src = `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(id)}/iframe`

  return (
    <div className="kc-course-preview">
      <iframe
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="kc-course-preview__frame"
        loading="lazy"
        src={src}
        title={title}
      />
    </div>
  )
}
