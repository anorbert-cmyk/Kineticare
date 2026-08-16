import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * Nyitható-csukható szekció (harmonika) — hosszú, MÁSODLAGOS tartalomhoz.
 *
 * MIÉRT LÉTEZIK: a /rolunk „Részletes szakmai háttér" része két teljes szakmai
 * önéletrajz (tanulmányok, ~70 tanfolyam, publikációk, konferenciák,
 * médiamegjelenések) — egyetlen folyó szövegként több képernyőnyi görgetés,
 * ami a lap alsó felét olvashatatlanná teszi. A hiányát a blokk-katalógus már
 * előre jelezte (docs/tartalom-leltar-regi-oldal.md 4. szakasz és
 * src/scripts/restore-legacy-content.ts komment: „a ~70 tételes CV-hez való
 * `accordion` blokk … még nem létezik").
 *
 * MIÉRT NEM A `faq` BLOKK: abból FAQPage strukturált adat készül. Egy
 * tanfolyam-lista strukturált GYIK-ként hibás lenne (a keresők a látható
 * szövegtől eltérő vagy nem-kérdés jellegű FAQPage-et elvetik), ezért a
 * harmonika külön blokk, JSON-LD nélkül.
 *
 * MIÉRT NEM A `teamMembers` CV-listája: az a SZEMÉLYHEZ kötött, soronként egy
 * tételes szövegdoboz (a kártyán belül). Ez a blokk önálló szekció, és a
 * tartalma szabadon formázható richText — bekezdés, felsorolás, alcím, link is
 * lehet benne (a két önéletrajz alcímekkel tagolt).
 *
 * GOV.UK-SZABÁLY (értékesítési UX-skill): árat, garanciát és elsődleges CTA-t
 * SOHA nem rejtünk lenyitó mögé — a rejtett tartalmat sokan sosem nyitják ki.
 * Ez a blokk ezért kifejezetten MÁSODLAGOS, referencia-jellegű tartalomra való
 * (szakmai életút, jogi részletek, hosszú felsorolások). Az admin-leírás ezt a
 * szerkesztőnek is kimondja.
 *
 * MIÉRT VAN `osszefoglalo` MEZŐ: a rejtés önmagában eltüntetné a bizonyíték
 * MENNYISÉGÉT, ami maga a bizalmi jelzés (docs/ux-belso-oldalak-kutatas.md 5.2).
 * A cím melletti rövid kivonat (pl. „31 tanfolyam · 8 konferencia") ezt tartja
 * láthatóan, csukott állapotban is.
 *
 * MEZŐNÉV-KONVENCIÓ: a szekció-tételek mezői magyarul vannak (`cim`,
 * `osszefoglalo`, `tartalom`) — ugyanaz a kivétel, amit a section-settings.ts
 * rögzít (`hatter`, `felirat`, `ujAblakban`). A szekció-fej mezői viszont a
 * többi blokkal AZONOS angol neveket viselik (`eyebrow`, `title`, `lead`), hogy
 * a renderelő közös szekció-fej kezelése ne ágazzon el blokktípusonként.
 */
export const accordion: Block = {
  slug: 'accordion',
  interfaceName: 'BlockAccordion',
  labels: {
    singular: 'Nyitható szekció',
    plural: 'Nyitható szekciók',
  },
  admin: {
    // A blokk nem kötődik kezdőlapi pozícióhoz (elsősorban belső oldalak hosszú
    // referencia-tartalmához való), ezért a meglévő „bárhol" csoportba kerül —
    // új admin-csoportot szándékosan nem vezetünk be.
    group: 'Bárhol használható',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Kis felső felirat',
      admin: {
        description: 'A cím fölötti apró szöveg (pl. „Szakmai háttér"). Nem kötelező.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description: 'A nyitható sorok fölötti cím (pl. „Részletes szakmai háttér").',
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      label: 'Bevezető szöveg',
      admin: {
        description:
          'Egy-két mondat a nyitható sorok fölé — ez MINDIG látszik. Ide írd azt, amit senki nem hagyhat ki; a lenyitott részbe csak olyasmi kerüljön, ami elolvasás nélkül is érthetővé teszi az oldalt.',
      },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Nyitható sorok',
      minRows: 1,
      maxRows: 20,
      labels: { singular: 'Nyitható sor', plural: 'Nyitható sorok' },
      admin: {
        description:
          'Minden sor alapból ZÁRVA jelenik meg, a látogató kattintásra nyitja ki. Ezért ide csak MÁSODLAGOS, hosszú olvasnivaló való (pl. szakmai önéletrajz, médiamegjelenések). Árat, kedvezményt, garanciát és a fő gombot SOHA ne rejtsd lenyitó mögé — amit elrejtesz, azt sokan sosem olvassák el.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'cim',
          type: 'text',
          required: true,
          label: 'A sor címe',
          admin: {
            description:
              'Ez látszik csukott állapotban, erre kattint a látogató (pl. „Kocsis Kata — szakmai önéletrajz").',
          },
        },
        {
          name: 'osszefoglalo',
          type: 'text',
          label: 'Rövid kivonat a cím mellé',
          admin: {
            description:
              'Nem kötelező, de érdemes: csukott állapotban is megmutatja, mennyi és milyen tartalom van a sor mögött (pl. „31 tanfolyam · 8 konferencia"). Egy sornyi legyen.',
          },
        },
        {
          name: 'tartalom',
          type: 'richText',
          required: true,
          label: 'A sor tartalma',
          admin: {
            description:
              'A lenyitáskor megjelenő szöveg. A felső eszköztárral formázhatsz, alcímet, felsorolást és linket is beszúrhatsz.',
          },
        },
      ],
    },
    sectionSettings(),
  ],
}
