import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { Posts } from '../collections/Posts'
import { Users } from '../collections/Users'

/**
 * ŐR: a Tudástár-cikkoldal MEZŐI léteznek a kollekció-konfigban.
 *
 * ═══ MIÉRT KELL ═══
 * A cikkoldal olvasó oldala (`src/components/content/post-article.ts`) az új
 * mezőket SZÁNDÉKOSAN `unknown`-ból, típusszűkítéssel olvassa, hogy a séma és
 * a felület egymástól függetlenül élesíthető legyen
 * (`docs/tudastar-technikai-terv.md` 2.1). Ennek az ára, hogy a hiányzó mező
 * NÉMA: nincs típushiba, nincs futásidejű kivétel, a GYIK-szekció, a
 * kurzus-CTA és a lektor-blokk egyszerűen elmarad minden cikkoldalról — pont
 * ez a hiba állt fenn a séma-kör előtt. A TypeScript ezt sosem fogja meg,
 * ezért kell végrehajtható őr.
 *
 * ═══ MIT ÁLLÍT ═══
 *  1. mind a nyolc mező LÉTEZIK, a `docs/tudastar-technikai-terv.md` 2.2/2.3
 *     táblázata szerinti típussal;
 *  2. a mezők a dokumentum GYÖKERÉN élnek (nem NEVES `group` alatt): az
 *     olvasók a `post.reviewedAt`, `post.faq`, `user.credentials` útvonalat
 *     nézik, egy neves csoport az adat-utat `csoport.mezo`-ra tolná, és a
 *     felület megint némán elnémulna. A `row`/`collapsible`/névtelen csoport
 *     ÁTLÁTSZÓ (nem mozdítja az adat-utat), ezért a bejáró átlép rajta — az
 *     admin-elrendezés szabadon átszervezhető, az adat-út nem;
 *  3. a `faq` korlátai: `maxRows: 6` (az NHS felsorolás-plafonja, ugyanaz a
 *     szám, amit a `postFaqItems` is vág), és mindkét almező kötelező —
 *     félig kitöltött kérdés-válaszból a GYIK-séma hiányos node-ot adna;
 *  4. a hivatkozás-célok: `ctaCourse` → `products`, `reviewedBy` → `users`,
 *     `portrait` → `media`;
 *  5. minden új mezőnek van nem üres, MAGYAR `admin.description`-je — a
 *     szerkesztő ebből tudja meg, mire való a mező és mikor NEM szabad
 *     kitölteni (az ellenőrzés-dátum ellenőrzés nélkül hazugság lenne).
 *
 * Az őr NEM rögzíti a leírások szó szerinti szövegét: a szerkesztői
 * mikroszöveg csiszolható, a mező LÉTE és ALAKJA nem.
 */

// ---------------------------------------------------------------------------
// Bejáró: a dokumentum gyökerén elérhető mezők
// ---------------------------------------------------------------------------

/**
 * A gyökér-szintű adat-utak mezői, név szerint.
 *
 * ÁTLÁTSZÓ konténereken átlép (`row`, `collapsible`, névtelen `group`,
 * névtelen tab) — ezek csak az admin-elrendezést befolyásolják. NEVES `group`,
 * `array`, `blocks` és neves tab gyerekeibe NEM néz bele: azok saját
 * adat-névteret nyitnak, tehát a bennük lévő mező nem gyökér-szintű.
 */
function rootFields(fields: Field[], acc = new Map<string, Field>()): Map<string, Field> {
  for (const field of fields) {
    if ('name' in field && typeof field.name === 'string') {
      acc.set(field.name, field)
      continue
    }
    if (field.type === 'row' || field.type === 'collapsible' || field.type === 'group') {
      rootFields(field.fields, acc)
      continue
    }
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        if (!('name' in tab)) {
          rootFields(tab.fields, acc)
        }
      }
    }
  }
  return acc
}

const postFields = rootFields(Posts.fields)
const userFields = rootFields(Users.fields)

/** Egy mező a gyökérről — hiányzó mezőnél beszédes hibaüzenettel bukik. */
function fieldOf(collection: 'posts' | 'users', name: string): Field {
  const source = collection === 'posts' ? postFields : userFields
  const field = source.get(name)
  if (!field) {
    throw new Error(
      `a(z) ${collection}.${name} mező HIÁNYZIK a kollekció-konfig gyökeréről — ` +
        'a cikkoldal a hozzá tartozó blokkot némán elhagyja ' +
        '(docs/tudastar-technikai-terv.md 2.2–2.3)',
    )
  }
  return field
}

/**
 * A mező admin-leírása, típusfeltevés nélkül.
 *
 * A Payload `admin` blokkja mezőtípusonként más alakú (a `collapsible` és a
 * `group` például `Omit<FieldAdmin, 'description'>`-t kap), ezért az értéket
 * `unknown`-ként olvassuk és szűkítjük — `any` nélkül (CLAUDE.md).
 */
function adminDescriptionOf(field: Field): unknown {
  if (!('admin' in field)) {
    return undefined
  }
  const admin: unknown = field.admin
  if (typeof admin !== 'object' || admin === null) {
    return undefined
  }
  return (admin as Record<string, unknown>).description
}

/** Magyar szöveg-jelenlét mérhető jele: legalább egy magyar ékezetes betű. */
const HUNGARIAN_LETTER = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

interface FieldSpec {
  /** A teszt-cím emberi azonosítója (a vitest `$collection.$name` alakot beágyazott útként olvasná). */
  id: string
  collection: 'posts' | 'users'
  name: string
  type: Field['type']
}

/** A `docs/tudastar-technikai-terv.md` 2.2 és 2.3 táblázata, végrehajtható alakban. */
const NEW_FIELDS: FieldSpec[] = [
  { id: 'posts.faq', collection: 'posts', name: 'faq', type: 'array' },
  { id: 'posts.ctaCourse', collection: 'posts', name: 'ctaCourse', type: 'relationship' },
  { id: 'posts.reviewedBy', collection: 'posts', name: 'reviewedBy', type: 'relationship' },
  { id: 'posts.reviewedAt', collection: 'posts', name: 'reviewedAt', type: 'date' },
  { id: 'posts.nextReviewAt', collection: 'posts', name: 'nextReviewAt', type: 'date' },
  { id: 'users.credentials', collection: 'users', name: 'credentials', type: 'text' },
  { id: 'users.bioShort', collection: 'users', name: 'bioShort', type: 'textarea' },
  { id: 'users.portrait', collection: 'users', name: 'portrait', type: 'upload' },
]

describe('Tudástár séma-mezők (E-csomag, D3 döntés)', () => {
  it.each(NEW_FIELDS)(
    'a(z) $id mező létezik a dokumentum gyökerén, típusa $type',
    ({ collection, name, type }) => {
      expect(fieldOf(collection, name).type).toBe(type)
    },
  )

  it.each(NEW_FIELDS)(
    'a(z) $id mezőnek van nem üres, magyar admin-leírása',
    ({ collection, name }) => {
      const field = fieldOf(collection, name)
      const description = adminDescriptionOf(field)
      expect(typeof description, `${collection}.${name}: az admin.description nem szöveg`).toBe(
        'string',
      )
      const text = String(description).trim()
      expect(text.length, `${collection}.${name}: üres admin.description`).toBeGreaterThan(0)
      expect(
        HUNGARIAN_LETTER.test(text),
        `${collection}.${name}: a leírás nem magyar szöveg (${text})`,
      ).toBe(true)
    },
  )

  it('a posts.faq array, hatos plafonnal, kötelező kérdés- és válasz-almezővel', () => {
    const faq = fieldOf('posts', 'faq')
    if (faq.type !== 'array') {
      throw new Error('a posts.faq nem array — a GYIK-tételek szerkeszthetetlenek lennének')
    }

    expect(faq.maxRows, 'a posts.faq maxRows értéke nem 6 (NHS felsorolás-plafon)').toBe(6)

    const rowFields = rootFields(faq.fields)
    const question = rowFields.get('question')
    const answer = rowFields.get('answer')

    expect(question?.type, 'a posts.faq.question nem text').toBe('text')
    expect(answer?.type, 'a posts.faq.answer nem textarea').toBe('textarea')

    expect(
      question && 'required' in question ? question.required : undefined,
      'a posts.faq.question nem kötelező — félig kitöltött tétel hiányos GYIK-sémát adna',
    ).toBe(true)
    expect(
      answer && 'required' in answer ? answer.required : undefined,
      'a posts.faq.answer nem kötelező — félig kitöltött tétel hiányos GYIK-sémát adna',
    ).toBe(true)
  })

  it.each([
    { id: 'posts.ctaCourse', collection: 'posts' as const, name: 'ctaCourse', target: 'products' },
    { id: 'posts.reviewedBy', collection: 'posts' as const, name: 'reviewedBy', target: 'users' },
    { id: 'users.portrait', collection: 'users' as const, name: 'portrait', target: 'media' },
  ])('a(z) $id a(z) $target kollekcióra hivatkozik', ({ id, collection, name, target }) => {
    const field = fieldOf(collection, name)
    if (field.type !== 'relationship' && field.type !== 'upload') {
      throw new Error(`a(z) ${id} nem hivatkozás-típusú mező`)
    }
    expect(field.relationTo, `${id}: rossz hivatkozás-cél`).toBe(target)
  })
})
