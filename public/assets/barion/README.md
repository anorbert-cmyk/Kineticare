# Barion logósor (Smart Payment Banner)

Ez a mappa a **Barion hivatalos, változtatás nélküli** logósorát tartalmazza.
Saját rajz, átszínezés, átvágás vagy újratördelés **tilos**: idegen márka
(Barion, Mastercard, VISA, Apple Pay, Google Pay) logóját közelítőleg
újrarajzolni védjegysértés, és a Barion elfogadóhely-jóváhagyását is
megbuktatja.

## Honnan jött

| | |
| --- | --- |
| Csomag | `barion-smart-payment-banner-EU.zip` (`barion-smart-banner-EU/svg/barion-smart-banner-light.svg`) |
| Letöltési URL | <https://download.barion.com/barion/barion-smart-payment-banner-EU.zip> |
| A letöltést előíró oldal | <https://www.barion.com/hu/ugyfelszolgalat/elfogadohely/elfogadohely-letrehozasa-es-kezelese/miert-kell-az-elfogadott-fizetesi-modok-logoit-feltuntetnem-a-webshop-fooldalan-es-fizetesi-oldalain/> |
| Letöltés dátuma | 2026-08-17 |
| SHA-256 | `5174575fe2da41b985688c67099e2cfe4260516af8c311b8dec8494a9ced48ec` |

A Barion szó szerinti kikötése ugyanerről az oldalról:

> A Barion által elfogadott fizetési módok logói egyértelműen tájékoztatják a
> vásárlóidat a lehetőségeikről, ezért előfeltétele az elfogadóhely
> jóváhagyásának, hogy a logósort **módosítás nélkül** feltüntesd a webshopod
> fő- és fizetési oldalán.

A csomag hivatkozott háttéranyagai (a kártyatársaságok saját előírásai a
logójuk megjelenítéséről):

- Visa Ecommerce Brand Standards —
  <https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/documents/visa-ecommerce-brand-standards-sept2025.pdf>
- Mastercard Branding Requirements —
  <https://www.mastercard.com/brandcenter/us/en/brand-requirements/mastercard.html>

## Melyik változat van itt

A csomagban `light` és `dark` változat van. A **`light`** való VILÁGOS
háttérre (ott a VISA sötétkék `#1434CB`, az Apple Pay fekete); a `dark`
változat sötét háttérre készült, világos rajzolattal. A Kineticare minden
felülete világos földön ül (`--kc-color-bg` = `#f6f9fc`, kártya `#ffffff`),
ezért a `light` változat került be. Ha valaha sötét sávra kerül a logósor, a
`dark` változatot kell ugyanebből a csomagból hozni, nem ezt átszínezni.

A PNG-k szándékosan maradtak ki: az SVG minden méretben éles, és 17 kB.

## Hol jelenik meg

`src/components/checkout/BarionFizetesJelzes.tsx` — a kezdőlapon (a lábléc
fölött) és a pénztárban (a fizetőgomb fölött). A méretezés arányos
(`width: 100%` + `aspect-ratio`), tehát a rajzolat nem torzul.
