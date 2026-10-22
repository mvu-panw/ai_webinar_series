# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Static multi-page HTML/CSS/JS site for "Palo Alto Networks AI Security By Design" — a 5-page informational/demo microsite (Home, Agentic Endpoint Security, AI Gateway, AI Runtime Security, Frontier AI Defense). No build tools, no framework, no dependencies, no auth gate — every page is open. Open any `.html` file directly in a browser or serve with any static file server.

This site replaced an earlier "PANW Capture the Flags" event site (registration → menu → per-product CTF challenges → scoreboard); that flow, its `sessionStorage` auth guard, and its Apps Script-backed registration/scoring have all been removed. `ai_security_by_design.md` is the source spec this rebuild implements.

## Development
```bash
# Serve locally (pick any)
npx serve .
python3 -m http.server 8080
```

## File Map
| File | Purpose |
|---|---|
| `index.html` | Home page — page-header intro, an `<img>` of the animated `assets/ai_enterprise.gif` (1920×1080, ~8.6 MB), then a `.menu-grid` of 4 clickable "AI Security Layer" cards linking to the other pages |
| `aes.html` | Agentic Endpoint Security — one page, two `.card` sections: "AES Demo Page" (`launch.paloaltonetworks.com` embed) and "AES Sandbox" (cross-launch button, opens `launch.paloaltonetworks.com` sandbox in a new tab) |
| `ai-gateway.html` | AI Gateway — graphic + CTA linking out to `gateway.airs-demo.com/architecture/` |
| `ai-runtime-security.html` | AI Runtime Security — same pattern, links out to `www.airs-demo.com/#architecture-diagrams` |
| `frontier-ai-defense.html` | Frontier AI Defense ("Unit 42 Frontier AI Defense: Research and Incident Response") — placeholder card, content TBD per spec |
| `assets/css/styles.css` | All styles — Prisma AIRS color scheme (cyan/purple gradient on near-black, Inter font), reused unchanged from the CTF-era site. Defines shared classes (`.card`, `.embed-wrap`, `.graphic-link`, `.menu-grid`/`.menu-card`, `.btn`) that every page combines with per-page inline `style=""` attributes — expect to touch both when changing a page's look |
| `assets/images/` | `PAN-Color.png` is the active favicon/nav logo. `ai_gateway.gif` and `prisma_airs_preview.png` are the link-out graphics for `ai-gateway.html`/`ai-runtime-security.html`. `index.html`'s 4 menu cards use `Cortex-Cloud-Hybrid-dark.png` (AES), `Prisma-AIRS-Hybrid-dark.svg` (AI Gateway and AI Runtime Security) and `PAN-Color.png` (Frontier AI Defense) as their icons, via an inline-styled `.card-icon` override (`background:none;width:72px;height:72px`) carried over from the old CTF menu. The other Cortex/Prisma/Strata logos are unused leftovers |
| `assets/js/` | Empty — the CTF-era `registration.js`/`scoreboard.js` were deleted. No page has any `<script>` tag, inline or external — the site is pure HTML/CSS |
| `.github/workflows/pages.yml` | **Primary deploy** — GitHub Pages via Actions on push to `main` of the `webinar` remote (`github.com/mvu-panw/ai_webinar_series`). Copies only `*.html` + `assets/` into `_site` (stripping `.DS_Store`), so `.md` docs are not published. A new top-level page or asset folder outside `assets/` must be added to the "Assemble site" step. `origin` still points to the old `panw_ctf_portal` repo |
| `.gitlab-ci.yml` | Legacy GitLab Pages deploy from the old CTF site — on push to `main`, runs `cp -r * .public` and publishes it as `public/`. No build step, so every non-dot file in the repo root (including `CLAUDE.md`, `README.md`, the `.md` specs, and unused images) is publicly served. There is no `.gitignore`, and `.DS_Store` files are tracked |
| `ai_security_by_design.md` | The spec this site implements — 5 named pages, page content/embeds, and the site-wide title/favicon/color-scheme requirements |
| `storylane.md` | Vestigial reference doc about the Storylane demo platform — no page currently embeds Storylane (the old `ctf.html`/`ctf-challenge.html` Storylane embeds were removed with the CTF flow) |
| `README.md` | Unedited GitLab project-creation boilerplate (from the original "Capture the Flag Page" repo) — no actual project documentation; disregard it |

## Key Behaviors
- **No auth guard**: unlike the old CTF site, no page checks `sessionStorage` or redirects — every page is directly reachable.
- **No templating**: navbar/footer markup is duplicated in every HTML file. Edit all 5 files when updating shared layout.
- **Two embed styles in `assets/css/styles.css`** — only one is currently used: the `aspect-ratio` CSS property set directly on the embedded element (`aes.html`'s demo `<iframe>` and `index.html`'s GIF `<img>`, both inside `.embed-wrap`) avoids the flicker that the older Storylane `padding-bottom` percentage-hack technique caused. If a future page embeds iframe content, copy the `aspect-ratio` pattern from these, not a padding-bottom trick.
- **Static-graphic link-out pattern**: `ai-gateway.html` and `ai-runtime-security.html` each use the same `.graphic-link` pattern instead of an iframe — a static image (`aspect-ratio` set inline per-image to match its real dimensions) wrapped in an `<a target="_blank">`, plus a matching `.btn.btn-primary` CTA below it linking to the same external URL. Copy this pattern (not an iframe) for a future page that should link out via a static graphic rather than embed live content.
- **Stylesheet cache-busting**: every page links `assets/css/styles.css?v=3` with the same version query string. Bump `?v=N` in all 5 HTML files together when editing `styles.css`, or GitLab Pages/browser caching can serve stale CSS to some pages and not others.
- **"Cross launch" vs. "embed"**: per `ai_security_by_design.md`, AES's Demo Page is an inline `<iframe>` embed; its Sandbox section is instead a `target="_blank"` link-out button — that distinction is intentional, not an inconsistency.
- **Site-wide nav**: each page's `.nav-links` lists the other 4 pages (the current page omits a link to itself), and the nav `site-title` always links to `index.html`.
