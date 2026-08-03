# Igény-változás pontok — a terv/tervezet leképezése

> A Katák legújabb e-mailének pontjai és az, hogy a végrehajtási terv
> melyik ticketje/rendszere fedi le őket. A legtöbb igény már a tervben szerepel —
> itt rögzítjük a leképezést, és jelöljük a külön munkasort, ami nem volt benne.

| Igény (megrendelő) | Terv/ticket | Leképezés |
|---|---|---|
| Vásárlólista (ki mit vett, mikor) | T-012 admin lista | ✅ admin orders/users nézet |
| Havi bevétel-statisztika, szakmai vs. otthoni bontás | T-013 statisztika/grafikon | ✅ orders-aggregáció + kategória-bontás |
| Aloldalak a főmenüpontok alá (max 2 szint) | T-009 menüfa | ✅ Menus collection (max 2 szint, validálva) |
| Blogposzt-duplikálás | T-010 duplicate | ✅ posts duplicate (slug-unikum, draft) |
| Kurzuskezelés: videó-feltöltés, leírás, képek, ár | T-005/T-008 products + Stream | ✅ products + Cloudflare Stream (tus upload) |
| Nagy, jó minőségű videók hostingja | T-006 Cloudflare Stream | ✅ HLS + signed URL (védett) |
| Online kártyás fizetés (Barion) | T-020–T-023 fizetési lánc | ✅ Barion Smart Gateway (callback v4-verifikáció) |
| Számlázz.hu automatikus számla | T-024 Számla Agent | ✅ invoice-issue job (szamlaKulsoAzon idempotencia) |
| Azonnali hozzáférés + elállási jog lemondása | T-021 waiver | ✅ kétlépcsős checkbox + rögzítés (rendelésen) |
| Kapcsolat-űrlap | T-016 form-builder | ✅ + staff-értesítő + Turnstile spam-védelem |
| Reszponzív, mobil-first | T-004 design system | ✅ tokens.css, kc-*, 900px breakpoint |
| IT-biztonság kiemelt | CLAUDE.md + access + titok-kezelés | ✅ tilos zónák, RBAC, logger-redact, consent |
| Claude/ChatGPT-vel szerkesztés (ügynök) | GitHub + CLAUDE.md + CI | ✅ repo + loop-governance + CI-kapuk |
| Poszt-hoc: PostHog termék-analitika | PostHog (új) | ✅ EU-cloud, /ingest proxy, funnel |
| Poszt-hoc: animált hero-videó a fejlécbe | Hero-videó (új) | ✅ Cloudflare Stream, docs/hero-video-feltoltes.md |
| Poszt-hoc: UX-hierarchia-audit | docs/ux-hierarchia-audit.md | ✅ M1–M8 cél-hierarchia az új kezdőlaphoz |
