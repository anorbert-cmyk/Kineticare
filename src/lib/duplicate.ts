import type { CollectionBeforeValidateHook, FieldHook } from 'payload'

/**
 * Duplikálás-viselkedés (T-012) — a Payload beépített duplicate-folyamatának
 * hookpointjaira épül:
 *
 *  - A `beforeDuplicate` mezőhookok a forrásdokumentum másolatán futnak, még
 *    azelőtt, hogy az adat a create-műveletbe kerülne (payload.duplicate /
 *    admin „Duplicate" gomb → POST /api/{collection}/{id}/duplicate).
 *  - A slug mező beforeDuplicate hookja egyedi '<eredeti>-masodpeldany' slugot
 *    ad (foglalt esetén sorszámozva: '-2', '-3'…), így a másolat nem ütközik
 *    a unique slug-indexbe, és a mezőszintű unique-validáció is átengedi.
 *  - A `status` és `publishedAt` mezők beforeDuplicate hookja draft státuszt és
 *    üres publishedAt-et kényszerít a másolatra.
 *  - A forceDraftVersionOnDuplicate collection-hook a drafts `_status`-t is
 *    draftra állítja — a local API-s duplikálás (draft:false default) egyébként
 *    a forrás published állapotát örökölné.
 *
 * A slug-logika tiszta függvény (nextDuplicateSlug) — DB nélkül unit-tesztelhető.
 */

export const DUPLICATE_SUFFIX = 'masodpeldany'

const duplicateSuffixPattern = new RegExp(`-${DUPLICATE_SUFFIX}(-\d+)?$`)

/** Levágja a '-masodpeldany' / '-masodpeldany-N' végződést → az eredeti slug-gyökér. */
export const stripDuplicateSuffix = (slug: string): string => slug.replace(duplicateSuffixPattern, '')

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Pontos egyezés vagy '<gyökér>-masodpeldany(-N)' alakú slug? */
const matchesDuplicateFamily = (slug: string, root: string): boolean =>
  slug === root || new RegExp(`^${escapeRegExp(root)}-${DUPLICATE_SUFFIX}(-\d+)?$`).test(slug)

/**
 * A következő szabad duplikátum-slug: '<gyökér>-masodpeldany',
 * foglalt esetén '<gyökér>-masodpeldany-2', '-3'…
 *
 * @param baseSlug   a duplikálandó dokumentum slugja (lehet maga is duplikátum)
 * @param takenSlugs az adott collectionben már létező slugok
 */
export const nextDuplicateSlug = (baseSlug: string, takenSlugs: Iterable<string>): string => {
  const taken = new Set(takenSlugs)
  const root = stripDuplicateSuffix(baseSlug)
  const first = `${root}-${DUPLICATE_SUFFIX}`
  if (!taken.has(first)) return first
  let index = 2
  while (taken.has(`${first}-${index}`)) index += 1
  return `${first}-${index}`
}

/**
 * A slug mező beforeDuplicate hookja: a forrásdokumentum slugjából a következő
 * szabad duplikátum-slugot állítja elő. A beforeDuplicate kizárólag a beépített
 * duplicate-folyamatban fut, így a normál create/update út unique-ellenőrzése
 * (kettézés-védelem) érintetlen marad.
 */
export const duplicateSlugBeforeDuplicate: FieldHook = async ({ collection, req, value }) => {
  if (!collection || typeof value !== 'string' || value.trim().length === 0) return value

  const root = stripDuplicateSuffix(value)
  const existing = await req.payload.find({
    collection: collection.slug as 'pages' | 'posts',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    select: { slug: true },
    where: { slug: { contains: root } },
  })

  const takenSlugs = existing.docs
    .map((doc) => doc.slug)
    .filter((slug): slug is string => typeof slug === 'string' && matchesDuplicateFamily(slug, root))

  return nextDuplicateSlug(value, takenSlugs)
}

/** A duplikált dokumentum szerkesztői státusza mindig draft. */
export const draftStatusBeforeDuplicate: FieldHook = () => 'draft'

/** A duplikált dokumentum publishedAt mezője üres. */
export const clearPublishedAtBeforeDuplicate: FieldHook = () => null

/**
 * Collection beforeValidate guard: duplikálásnál a verziózás `_status`-a is
 * draft legyen. A duplicate-folyamat create-műveletként fut, és ilyenkor az
 * `originalDoc` a forrásdokumentum (normál create-nél üres objektum) — ez a
 * megbízható jelzés. A REST végpont alapból draft:true-val hív, a local API
 * viszont nem — ez a hook mindkét útvonalon determinisztikussá teszi.
 */
export const forceDraftVersionOnDuplicate: CollectionBeforeValidateHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation !== 'create' || !data) return data
  const isDuplicate = typeof (originalDoc as { slug?: unknown } | undefined)?.slug === 'string'
  if (isDuplicate) {
    data._status = 'draft'
  }
  return data
}
