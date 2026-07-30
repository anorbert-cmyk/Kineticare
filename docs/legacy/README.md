# Kineticare legacy klón — a jelenlegi kineticare.hu referencia-másolata

**Letöltve:** 2026-07-30 · **Forrás:** https://www.kineticare.hu/ · **Cél:** a frontend-átstrukturálás referenciaanyaga a repóban (a képek NEM külső CDN-ről, hanem innen töltődnek be a jövőbeli fejlesztés során).

## Tartalom

- `html/` — az élő oldal 19 oldalának nyers HTML-másolata (a Systeme.io funnel-rendszerből generált markup, inline CSS/JS-sel). Referencia a tartalomhoz, szöveghez, oldalszerkezethez — NEM buildelhető kód.
- `assets/` — az oldalakon hivatkozott összes kép (111 fájl, ~20 MB), a CloudFront CDN-ről letölbtve, eredeti fájlnévvel.

## Oldalak (sitemap alapján)

Főoldalak: kezdolap, szolgaltatasok, rolunk, kapcsolat, rendeloi-kezelesek
Kurzus-funnel: kezrehab, kezrehab-penztar, typ-kezrehab (thank-you), hamarosan, typ-hamarosan, kezrelax, oto-kezrehab-akcio, kezrehab-akcio, kezrehab-akcio-penztar, typ-kezrehab-akcio, rendeloi-kezelesek-regi
Jogi: impresszum, adatvedelem, aszf

## Megjegyzések

- A blog-URL-ek (best-places-to-visit-in-asia stb.) idegen, feltehetően spam/SEO-szennyezés a jelenlegi rendszerben — a migráció során ezek NEM kerülnek át, és 301-térképnél sem kell rájuk figyelni (külön jelezve a vezetőnek).
- A képek nagy része JPEG/PNG Exif-fel; a frontend-fejlesztéskor a Media collection webp/imageSizes feldolgozása dolgozza fel őket.
- A HTML-ekben a CDN-linkek (d1yei2z3i6k35z.cloudfront.net) az eredeti állapotot őrzik; az új rendszerben a helyi assets/ vagy a Payload Media hivatkozásai lesznek.
