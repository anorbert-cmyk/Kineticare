# KinetiCare — design brief

## Design read
For people living with hand, wrist, elbow and shoulder pain: a calm, medically
credible yet warm scroll experience that turns the new logo's symbolism (a hand
moving from a closed fist to a fully open palm) into the site's signature
interaction. Emotional register: reassurance, quiet mastery, human warmth.

## Concept spine
"A kéz újra megtanul nyílni" — journey/waypoints spine. ONE continuous macro
film of a hand opening, scrubbed by the visitor's scroll; each chapter is a
waypoint of recovery (closed → opening → open). The page's content sections
then deliver the proof (method, people, testimonials, contact).

## Delivery tier
cinema — scroll-scrub journey is the Tier-1 mechanic (the template engine owns
it); surrounding sections get motivated, transform-only micro-motion.

## Animation mode
animated-website — user explicitly asked for a scroll-driven hand-opening
header ("ha görgetem a weboldalt, úgy nyíljon a kéz"), confirmed Animated at
intake.

- **Journey shape:** `single-shot` — one continuous ~15s macro take of a
  single hand opening, generated in ONE call, then split locally into 3
  sequential clip segments (0–5s / 5–10s / 10–15s) so three chapters can read
  over the one continuous motion. Seam continuity is guaranteed because every
  segment boundary is an exact frame of the same film.
- **Journey (3 chapters):**
  1. `zart` — "Amikor a kéz bezárul" — the fist: pain, spasm, fear of load.
     Focal: closed hand, screen center. Tags: Csukló / Ujjak / Könyök / Váll.
  2. `nyilas` — "Közösen nyitjuk újra" — the half-open hand: therapy, guided
     work. Focal: fingers uncurling. CTA garment: underlined inline link.
  3. `nyitott` — "Újra a saját kezed" — the open palm: durable result, back to
     work/sport/life. Focal: fully open hand. CTA garment: framed block CTA.
- **World grammar (byte-identical preamble for every generation):** "macro
  cinematic study of ONE human hand on a seamless warm-white studio
  background, soft diffused daylight from camera-left, a gentle light-blue
  (#6FB1E0) rim light tracing the hand's contour, locked exposure and white
  balance, slow steady motion, no cuts, no camera shake, no on-screen text,
  calm medical-wellness mood".
- **Camera architecture:** single-shot; the camera holds a near-static macro
  frame and drifts only a few millimetres — the SUBJECT (the opening hand) is
  the motion, not the camera.
- **Mobile framing:** hand stays inside the center-safe 60% of frame at every
  keyframe; lighter mobile encodes (720p, CRF 23).
- **Delivery budget:** ≤32 MiB desktop total, ≤16 MiB mobile total.

## Locked palette (explicit user brand colors — overrides default bans)
- background: `#F6F9FC` (cool paper white, faintly blue)
- ink: `#10233A` (deep navy ink, never pure black)
- muted: `#54697F`
- accent: `#3D7FB8` (the KinetiCare wave blue, deepened for AA on white)
- tint surface: `#E3EEF8`
Defense: the brand's existing logo and site are light-blue on white; the
accent is the brand blue with enough contrast for text use.

## Locked type
Editorial serif + grotesk pairing, WITH written justification: the KinetiCare
logotype is a high-contrast Didone-style serif; the brand voice is
editorial-care premium (clinic + human warmth), so display type follows the
logo. Display: **Cormorant Garamond** (400/500/600). Body/UI: **Montserrat**
(400/500/600/700). Both families are self-hosted as Latin Extended WOFF2 so
Hungarian glyphs and font metrics remain deterministic. Never inject a serif
word into a sans headline; hierarchy comes from scale only.

## Section plan (after the journey)
Order: journey (hero) → fájdalomfelismerés → három értékígéret → három állapot
→ Szolgáltatások → Katák (about) → Vélemények → SOS KézRelax CTA +
Kapcsolat/footer. The four supplied 1440×810 boards are authoritative for the
services, about, testimonials and closing compositions. Desktop uses a fluid
1440×810 design canvas with minimum 100dvh chapters; mobile drops fixed-height
composition in favor of natural reading flow. Eyebrow budget: 3 across 8
post-journey sections.

## Asset plan
- The film: Seedance 2.0, 16:9, 1080p, ~15s, audio off; storyboard as style
  reference. Local split into 3 segments + desktop/mobile encodes + posters
  from the ENCODED clips.
- Storyboard: ONE 16:9 six-keyframe grid image (Phase 1).
- Boards: 4 section boards (services, about, testimonials, contact).
- About photo: real brand photo from kineticare.hu (Kiss Kata & Kocsis Kata),
  downloaded into assets. Logo: real brand PNG from kineticare.hu.
- Launch branding (cover + OG + favicon): generate_app_branding, submitted
  ONCE alongside the film.

## CTA inventory (each its own garment)
- "SOS KézRelax" — journey chapter 3 + banner: framed block CTA.
- "Írjon nekünk" (mailto:info@kineticare.hu) — nav: small solid pill;
  footer: oversized underlined link.
- "Tovább a workshopra" — services: underlined inline link with arrow.
One label per intent page-wide: contact intent is always "Írjon nekünk".
