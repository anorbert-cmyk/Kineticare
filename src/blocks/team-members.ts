import type { Block } from 'payload'

import { linkGroup } from './link-fields'
import { sectionSettings } from './section-settings'

/**
 * Szakértő-kártyák — a két gyógytornász 50–50 arányú bemutatása.
 *
 * Forrás: `docs/tartalom-leltar-regi-oldal.md` B4 (`teamMembers` mezőlista) és
 * `docs/grafikai-leltar-regi-oldal.md` 3.3 (mi kell egy 50–50-es bemutatkozó
 * szekcióhoz). A régi `/rolunk` a két alapítót már ma is egymás mellett hozza,
 * nálunk viszont eddig NEM volt olyan blokk, ami két személyt EGYENRANGÚAN
 * mutatna: az `about` egyetlen `photo`-t, a `services` egyetlen `image`-et ismer.
 *
 * MIÉRT MAX 2 TAG (a leltár B4-e 4-et írt)? A szekció szerződése a 50–50-es,
 * egyenrangú páros — a rács fix két hasáb. Három taggal a rács vagy lyukat
 * hagyna, vagy a párost hármas kártyasorrá fokozná le (a belső-oldali kutatás
 * B3.5 szabálya: a rács ne hagyjon lyukat). Egy taggal a szekció teljes
 * szélességben, egy hasábban áll — az a szabályos degenerált eset. Ha valaha
 * 3–4 szakember kell, az külön blokk (kártyarács), nem ennek a tágítása.
 *
 * MIÉRT VAN CV-SZEKCIÓ A KÁRTYÁN? A `docs/ux-belso-oldalak-kutatas.md` 5.2
 * negyedik rétege: a két önéletrajz alszekciónként, HARMONIKÁBAN, a fejlécben
 * DARABSZÁMMAL — a rejtés önmagában eltüntetné a bizonyíték mennyiségét, ami
 * maga a bizalmi jelzés. A darabszámot ezért nem a szerkesztő írja külön mezőbe
 * (az elcsúszna a listától), hanem a renderelő számolja a sorokból.
 *
 * A tételek SORONKÉNT egy szövegdobozban élnek, nem beágyazott tömbben: a régi
 * oldal 38 tanfolyamos listáját így be lehet MÁSOLNI, míg 38 külön tömb-sor
 * felvétele a laikus szerkesztőnek használhatatlan lenne.
 */
export const teamMembers: Block = {
  slug: 'teamMembers',
  interfaceName: 'BlockTeamMembers',
  labels: {
    singular: 'Szakértő-kártyák',
    plural: 'Szakértő-kártya szekciók',
  },
  admin: {
    // A meglévő KÉT admin-csoport egyike (a másik a kezdőlapi sorrendé). A blokk
    // elsősorban a /rolunk oldalra készült, de nem kötődik kezdőlapi pozícióhoz,
    // ezért ide tartozik — új csoport-nevet szándékosan nem vezetünk be.
    group: 'Bárhol használható',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Kis felső felirat',
      admin: {
        description: 'A cím fölötti apró szöveg (pl. „A csapat"). Nem kötelező.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description: 'A két bemutatkozás fölötti cím (pl. „Kik vagyunk?").',
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      label: 'Bevezető szöveg',
      admin: {
        description: 'Egy-két mondat a nevek fölé. Nem kötelező.',
      },
    },
    {
      name: 'members',
      type: 'array',
      label: 'Szakemberek',
      minRows: 1,
      maxRows: 2,
      labels: { singular: 'Szakember', plural: 'Szakemberek' },
      admin: {
        description:
          'Pontosan két szakember fér ide, egymás mellett, egyenlő súllyal. A portrékat előbb töltsd fel a Tartalom → Képek közé; a legjobb, ha mindkét kép AZONOS képarányú és hasonló fejméretű (különben az egyik közelebbinek látszik).',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          label: 'Portré',
          admin: {
            description:
              'Álló (3:4 vagy 4:5) portré a legjobb. A képleírást (alt) a Képek közt add meg egyszer — ide nem kell újra beírni.',
          },
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Név',
          admin: { description: 'A szakember teljes neve (pl. „Kocsis Kata").' },
        },
        {
          name: 'role',
          type: 'text',
          label: 'Titulus',
          admin: {
            description:
              'Rövid szakmai megnevezés (pl. „Gyógytornász, manuálterapeuta, sportrehabilitációs tréner").',
          },
        },
        {
          name: 'bio',
          type: 'textarea',
          label: 'Rövid bemutatkozás',
          admin: {
            description:
              '2–4 mondat. A teljes szakmai életutat NE ide írd — arra valók lent a szakmai listák.',
          },
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Telefonszám',
          admin: {
            description:
              'Nem kötelező. Tagoltan írd (pl. „+36 30 169 2263") — mobilon kattintható hívás-linkké alakul.',
          },
        },
        {
          name: 'email',
          type: 'text',
          label: 'E-mail-cím',
          admin: {
            description: 'Nem kötelező. Kattintható levélírás-linkké alakul.',
          },
        },
        {
          name: 'cvSections',
          type: 'array',
          label: 'Szakmai listák',
          maxRows: 8,
          labels: { singular: 'Lista', plural: 'Listák' },
          admin: {
            description:
              'A szakmai háttér összecsukható listái (pl. Tanulmányok, Tanfolyamok, Publikációk, Konferenciák, Médiamegjelenések). Alapból zárva jelennek meg, a fejlécükben a tételek számával.',
            initCollapsed: true,
          },
          fields: [
            {
              name: 'heading',
              type: 'text',
              required: true,
              label: 'Lista címe',
              admin: { description: 'Pl. „Tanfolyamok, továbbképzések".' },
            },
            {
              name: 'items',
              type: 'textarea',
              required: true,
              label: 'Tételek',
              admin: {
                description:
                  'SORONKÉNT EGY tétel (pl. egy tanfolyam, egy előadás). Az üres sorok kimaradnak, a tételek számát a rendszer maga írja ki a lista címe mellé.',
              },
            },
          ],
        },
        linkGroup({
          name: 'link',
          label: 'Hivatkozás',
          description:
            'Nem kötelező. Pl. „Bővebben a szakmai hátterről" — a részletes önéletrajz horgonyára vagy egy aloldalra mutathat.',
          labelDescription: 'Ez a szöveg jelenik meg a linken (pl. „Bővebben a szakmai hátterről").',
        }),
      ],
    },
    sectionSettings(),
  ],
}
