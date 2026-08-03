export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // A < → \u003c escape: a JSON.stringify önmagában NEM véd a </script>
  // sorozattól — enélkül a CMS-tartalom kiválthatna a <script>-kontextusból
  // (tárolt XSS a staff által szerkesztett cím/leírásban).
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      // A JSON-LD-t a szerver rendereli; a tartalom a saját SEO-segédjeinkből származik.
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  )
}
