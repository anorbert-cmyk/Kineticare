import type { Block } from 'payload'

import { sectionSettings } from './section-settings'

/**
 * Időpontkérő szekció — a RENDELŐI kezelések (gyógytorna, manuálterápia)
 * jelentkezési útja.
 *
 * MIÉRT LÉTEZIK: a /szolgaltatasok lapon az „Időpontot kérek" hivatkozás a
 * /kapcsolat oldalra visz, ahol csak egy ÁLTALÁNOS üzenetküldő űrlap várja a
 * látogatót (név, e-mail, tárgy, üzenet). A rendelői kezelés a szolgáltatás
 * egyik fő bevételi lába, mégsem volt hozzá saját, végigvezetett út: a
 * látogatónak magának kellett kitalálnia, mit írjon a „Tárgy" mezőbe, és semmi
 * nem mondta meg, mi történik a beküldés után.
 *
 * MIÉRT NEM ÚJ BEKÜLDÉSI ÚT: a beküldés a MEGLÉVŐ form-builder végpontra megy
 * (`POST /api/form-submissions`), a kapcsolat- és a hírlevél-űrlappal azonos
 * szerződéssel, ugyanazzal a Turnstile-ellenőrzéssel, kérés-korláttal és
 * honeypottal. Így egyetlen helyen kell karbantartani a spam- és
 * jogosultság-védelmet (lásd src/lib/appointment/submit.ts).
 *
 * MIÉRT NINCS NAPTÁR: naptár-integráció nincs a rendszerben, tehát foglalást
 * ÍGÉRNI hazugság lenne (a projekt szabálya: „a felirat legyen igaz"). A „mikor
 * érek rá" kérdést ezért durva SÁVOKKAL kérdezzük (a sávok feliratát a
 * szerkesztő adja meg), és a szekció szövege kimondja, hogy a pontos időpontot
 * telefonon egyeztetjük. A GOV.UK Design System checkbox-mintája szerint a
 * többszörös választásnál a „Jelöld be az összeset, ami megfelel" segédszöveg
 * kötelező, mert a jelölőnégyzet alakjából egyedül nem derül ki
 * (https://design-system.service.gov.uk/components/checkboxes/).
 *
 * EGÉSZSÉGÜGYI ADAT: a „mire kérsz időpontot" mező panaszleírást hordozhat, ami
 * a GDPR 9. cikk (1) szerinti különleges adat. Ezért a mező NEM kötelező
 * (adattakarékosság, 5. cikk (1) c)), és a hozzájárulás szövege külön nevesíti
 * az egészségügyi adatot (9. cikk (2) a) kifejezett hozzájárulás,
 * https://gdpr-info.eu/art-9-gdpr/). A mezőnkénti indoklás a
 * src/lib/appointment/validation.ts fejlécében áll.
 *
 * MEZŐNÉV-KONVENCIÓ: a szekció-fej mezői a többi blokkal AZONOS angol neveket
 * viselik (`eyebrow`, `title`, `lead`), hogy a renderelő közös szekció-fej
 * kezelése ne ágazzon el blokktípusonként; a szekció saját tételei magyarul
 * (`helyszinek`, `telefonszamok`, `idopontSavok`) — ugyanaz a kivétel, amit a
 * section-settings.ts és az accordion.ts már rögzít.
 */
export const appointment: Block = {
  slug: 'appointment',
  interfaceName: 'BlockAppointment',
  labels: {
    singular: 'Időpontkérő szekció',
    plural: 'Időpontkérő szekciók',
  },
  admin: {
    // Nem kötődik kezdőlapi pozícióhoz (a kapcsolat- és a szolgáltatás-oldal a
    // helye), ezért a meglévő „bárhol" csoportba kerül.
    group: 'Bárhol használható',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Kis felső felirat',
      admin: {
        description: 'A cím fölötti apró szöveg (pl. „Rendelői kezelés"). Nem kötelező.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Szekció címe',
      admin: {
        description: 'A szekció címe (pl. „Kérj időpontot a rendelőbe").',
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      label: 'Bevezető szöveg',
      admin: {
        description:
          'Egy-két mondat a cím alá: kinek való, mire számítson. Ez az a szöveg, ami eldönti, kitölti-e valaki az űrlapot.',
      },
    },
    {
      name: 'magyarazat',
      type: 'textarea',
      label: 'Mi történik a beküldés után?',
      admin: {
        description:
          'Írd le, hogyan megy tovább a folyamat (pl. hogy telefonon egyeztetitek a pontos időpontot, és mennyi időn belül hívtok vissza). Fontos: naptár-foglalás NINCS a rendszerben, ezért itt se ígérj azonnali foglalást.',
      },
    },
    {
      name: 'urlapCim',
      type: 'text',
      label: 'Az űrlap címe',
      admin: {
        description: 'Az űrlapdoboz fölötti cím (pl. „Időpontkérés"). Nem kötelező.',
      },
    },
    {
      name: 'gombFelirat',
      type: 'text',
      label: 'A gomb felirata',
      admin: {
        description:
          'Az elküldő gomb felirata. Ige + tárgy alakban a legjobb (pl. „Időpontot kérek"). Üresen hagyva az alapértelmezett felirat jelenik meg.',
      },
    },
    {
      name: 'idopontSavok',
      type: 'array',
      label: 'Választható időpont-sávok',
      maxRows: 6,
      labels: { singular: 'Időpont-sáv', plural: 'Időpont-sávok' },
      admin: {
        description:
          'Ezek közül jelölhet be a látogató, hogy MIKOR alkalmas neki. Csak olyan sávot vegyél fel, amit tényleg tudtok tartani (pl. „Hétköznap délelőtt"). Ha üresen hagyod, a kérdés egyszerűen kimarad az űrlapból.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'felirat',
          type: 'text',
          required: true,
          label: 'A sáv felirata',
          admin: {
            description: 'Rövid, egysoros felirat (pl. „Hétköznap délelőtt").',
          },
        },
      ],
    },
    {
      name: 'helyszinekFelirat',
      type: 'text',
      label: 'A helyszínek felirata',
      admin: {
        description: 'A rendelő-címek fölötti szó (pl. „Rendelőink").',
      },
    },
    {
      name: 'helyszinek',
      type: 'array',
      label: 'Rendelők címe',
      maxRows: 6,
      labels: { singular: 'Rendelő', plural: 'Rendelők' },
      admin: {
        description:
          'A rendelők postai címe. A látogató itt látja, hova kell majd mennie; enélkül az időpontkérés vak ugrás lenne.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'cim',
          type: 'text',
          required: true,
          label: 'Cím',
          admin: { description: 'Teljes postai cím (pl. „1117 Budapest, Nádorliget u. 7/b").' },
        },
        {
          name: 'megjegyzes',
          type: 'text',
          label: 'Megjegyzés a címhez',
          admin: {
            description: 'Nem kötelező, egysoros kiegészítés (pl. „bejárat az udvar felől").',
          },
        },
      ],
    },
    {
      name: 'telefonFelirat',
      type: 'text',
      label: 'A telefonszámok felirata',
      admin: { description: 'A telefonszámok fölötti szó (pl. „Telefon").' },
    },
    {
      name: 'telefonszamok',
      type: 'array',
      label: 'Telefonszámok',
      maxRows: 4,
      labels: { singular: 'Telefonszám', plural: 'Telefonszámok' },
      admin: {
        description:
          'Akik időpontot tudnak adni. Mobilon kattintható hívás-linkké alakul, ezért ez a leggyorsabb út a türelmetlen látogatónak.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'nev',
          type: 'text',
          label: 'Kihez tartozik',
          admin: { description: 'Nem kötelező (pl. „Kocsis Kata").' },
        },
        {
          name: 'szam',
          type: 'text',
          required: true,
          label: 'Telefonszám',
          admin: {
            description: 'Tagoltan írd (pl. „+36 30 169 2263") — mobilon kattintható hívás-link lesz belőle.',
          },
        },
      ],
    },
    {
      name: 'emailFelirat',
      type: 'text',
      label: 'Az e-mail-cím felirata',
      admin: { description: 'Az e-mail-cím fölötti szó (pl. „E-mail").' },
    },
    {
      name: 'email',
      type: 'text',
      label: 'E-mail-cím',
      admin: {
        description: 'Nem kötelező. Ha megadod, kattintható levélíró-linkként jelenik meg.',
      },
    },
    {
      name: 'sikerCim',
      type: 'text',
      label: 'A sikeres beküldés címe',
      admin: {
        description:
          'Ez jelenik meg az űrlap helyén a sikeres beküldés után (pl. „Megkaptuk az időpontkérésed"). Üresen hagyva az alapértelmezett szöveg jelenik meg.',
      },
    },
    {
      name: 'sikerSzoveg',
      type: 'textarea',
      label: 'A sikeres beküldés szövege',
      admin: {
        description:
          'Mi történik most, és mikor keresitek vissza a látogatót. Konkrét határidőt írj (pl. „két munkanapon belül"), mert a bizonytalanság új üzenetet szül.',
      },
    },
    sectionSettings({ defaultBackground: 'tint' }),
  ],
}
