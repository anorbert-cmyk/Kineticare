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

## A csomag fejlesztői útmutatója (Dev guide.pdf) — visszafejtve

A ZIP `Dev guide.pdf` fájlja („Smart Payment Banner Developer Guidelines",
2025. október) beágyazott betűi **részhalmaz-kódoltak**, ezért a szöveg csak
betűtípusonként külön `ToUnicode`-táblával fejthető vissza; egy összevont
táblával kevert, olvashatatlan eredmény jön ki. A visszafejtett, szó szerinti
kikötések, amelyeket a felület betart (végrehajtható őr:
`src/__tests__/barion-fizetes-jelzes.test.tsx`, „A Barion fejlesztői
útmutatójának mért betartása" szakasz):

| Kikötés | Ahogy teljesül |
| --- | --- |
| „Place the banner in close proximity to the payment methods section" | A pénztárban közvetlenül a fizetőgomb előtt áll. |
| „Do not stretch, crop, or distort the logos." / „Maintain original aspect ratios." | `width: 100%` + `aspect-ratio: 567 / 108` + `height: auto`; `object-fit: cover`, `clip-path` és `transform: scale` tiltva. |
| „Do not add shadows, borders, or effects." | A logósor szabályában `box-shadow`, `border`, `outline`, `filter` nem lehet. |
| „Maintain clear spacing around the banner (at least 8px padding from other elements)." | Mindkét helyen `--kc-space-4` (16 px) rés, a kezdőlapi csík saját függőleges tere `--kc-space-6` (32 px). |
| „Optimize image files for web (use SVG or high-resolution PNG)." | SVG. |
| „Light mode banners: Use on white or light-colored backgrounds." | A `light` változat világos földön (`#f6f9fc` / `#ffffff`). |

**„On smaller screens, switch to the medium or small banner version."** — a
csomag három mérete (Large 1133×215, Medium 892×165, Small 602×108)
**kizárólag PNG-ként** létezik; az `svg/` mappában méretenkénti változat
nincs, csak `barion-smart-banner-light.svg` és `-dark.svg`. A kikötés tehát a
raszteres útra vonatkozik: az útmutató által kifejezetten ajánlott SVG-nél
ugyanezt az arányos kicsinyítés adja, veszteség nélkül. Ezt itt rögzítjük,
hogy egy későbbi „rakjuk be a PNG-ket is" kör ne látszódjon hibajavításnak.

**Nyitott pont a tulajdonosnak:** az útmutató azt is mondja, „Ensure it is
clearly visible **without scrolling** in the checkout page." A jelzés ma a
fizetőgomb közvetlen közelében áll (a Baymard mérése szerint ott hat a
legjobban a bizalomra), ami hosszabb űrlapon görgetést kíván. Ha a bírálat
emiatt kifogást emel, a jelzés az űrlap tetejére is felvihető — a döntés a
bizalmi hatás és a betű szerinti megfelelés között választ.

## Hol jelenik meg

`src/components/checkout/BarionFizetesJelzes.tsx` — a kezdőlapon (a lábléc
fölött) és a pénztárban (a fizetőgomb fölött). A méretezés arányos
(`width: 100%` + `aspect-ratio`), tehát a rajzolat nem torzul.
