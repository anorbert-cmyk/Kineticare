export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // A JSON-LD-t a szerver rendereli; a tartalom a saját SEO-segédjeinkből származik.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
