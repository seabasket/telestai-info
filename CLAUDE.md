# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Overview

`telestai.info` is a small personal website. Per the README, it's "mostly a
playground for web dev and for using ai agents in coding" — the code is
intentionally not polished, and this repo has an established history of
AI-agent-authored branches and commits.

The site's core mechanic is an access-code-gated landing page: a visitor
types a code into a retro-terminal UI on `index.html`, the code is hashed
(SHA-256) and checked against a known list, and on a match the browser
redirects to `<code>.html`. Codes are prefix- and case-agnostic (see
Access-code / security model below), and the page shows a small corner
dropdown of the visitor's previously-unlocked pages plus a `used/total`
counter. Content pages include audio-synced "event" pages (starfield/
typewriter effects synced to music) and small one-off personal pages.

## Tech stack

- **Jekyll** (plain, no plugins) — no Gemfile is checked into the repo, so
  Jekyll/Ruby must be available on the machine running `jekyll` commands.
- **Vanilla HTML/CSS/JS** — no frontend framework, no bundler, no
  TypeScript, no build step beyond Jekyll's own Liquid templating.
- `package.json` exists only to provide one convenience script (see
  Dev workflow below); it declares no dependencies.

## Project structure

```
CNAME                        # custom domain: telestai.info
_config.yml                  # Jekyll site config (title, description, exclude list)
_layouts/
  default.html                # shared page shell: <head>, page-overlay include, {{ content }}
_includes/
  page-overlay.html           # fade-from-black transition overlay (all pages)
  home-button.html            # "HOME" link back to index.html
  set-recording-button.html   # "SET RECORDING" link (event pages)
_data/
  access_codes.yml            # SINGLE SOURCE OF TRUTH for valid access codes (slug/file/title/sha256)
assets/
  css/event.css                # shared styles for audio-synced event pages
  js/event-engine.js           # shared JS engine (stars/typewriter/gradient/pulse/audio wiring)
  audio/, img/                 # page media
index.html                   # terminal landing page + access-code checker
about.html, ts-*.html        # access-code content pages (root-level, one per code)
.github/workflows/
  jekyll-gh-pages.yml          # build + deploy to GitHub Pages on push to main
```

**Every content page is a flat root-level `.html` file** — this is
deliberate, not an oversight. `index.html` redirects with
`location.href = code + ".html"`, so a page's filename stem must equal its
access-code slug. Don't move pages into subdirectories.

`_layouts` and `_includes` are excluded from the built site automatically by
Jekyll; `_config.yml`'s `exclude:` list additionally keeps `README.md`,
`CLAUDE.md`, `package.json`, and Ruby/Node tooling files out of `_site`.
(`CLAUDE.md` **must** stay excluded — it contains Liquid-tag-looking text in
its prose that GitHub Pages' Jekyll would otherwise try to parse as real
Liquid, failing the build.)

## Dev workflow

Two ways to preview locally, and they are **not equivalent**:

- `jekyll serve` → `http://localhost:4000` — the real preview. Processes
  Liquid templating and `_data/access_codes.yml`, exactly like the
  production build.
- `npm start` → runs `npx browser-sync start --server --files '**/*.html, **/*.css, **/*.js' --no-notify`
  — a lightweight static server with live-reload. It does **not** run
  Jekyll, so changes to `_data`, layouts, or includes will not be reflected
  through this route. Use it only for iterating on raw HTML/CSS/JS in a
  single page.

There is no build, lint, or test script beyond `jekyll serve`/`jekyll build`
and the `npm start` live-reload helper.

## Adding a new access-code page

1. Create `<code>.html` at the repo root, starting with front matter:
   ```yaml
   ---
   layout: default
   ---
   ```
   For an audio/event page, copy `ts-0001.html` as a starting point and also
   add:
   ```yaml
   stylesheets:
     - /assets/css/event.css
   head_scripts:
     - /assets/js/event-engine.js
   ```
2. Compute the hash of the code's **suffix** — the part after the first
   `-` (or the whole slug if it has no dash), since the prefix is ignored
   at check time (see below):
   ```
   printf '%s' "your-suffix" | shasum -a 256
   ```
3. Add an entry to `_data/access_codes.yml` (`slug`, `file`, `title`,
   `sha256`). `index.html` builds its `CODE_LOOKUP` (hash → slug) map from
   this file via a Liquid loop at build time — this file and the actual
   root-level `.html` files must stay in sync.

Access-code slugs are validated client-side against
`^([a-z]{2,}-)?[a-z0-9]{3,8}$` (e.g. `ts-0001`) purely to pick the right
"not found" hint message — matching itself is prefix-agnostic (see below).

## Access-code / security model

The access-code gate is **client-side obscurity, not real authentication**.
`index.html` hashes the typed code with `crypto.subtle` (SHA-256), falling
back to a pure-JS SHA-256 implementation for browsers that restrict
`crypto.subtle` (e.g. Instagram's in-app browser), and compares against
hashes baked into the page from `_data/access_codes.yml`. Anyone who can
view page source / the built `_site` can enumerate the hashes; treat these
pages as unlisted, not private.

Codes are **prefix- and case-agnostic**: input is lowercased, then
everything before the first `-` is stripped before hashing (or the whole
input is used if there's no `-`). So `ts-snst809`, `TS-SNST809`, and bare
`snst809` all resolve to the same page. This means the hashes in
`_data/access_codes.yml` are hashes of that suffix, not the full slug —
see "Adding a new access-code page" above. On a match, `index.html` looks
up the canonical slug from `CODE_LOOKUP` (not the raw input) to build the
redirect target and the history entry, since the raw input may not be a
valid filename stem on its own.

Client-side state used by the gate:
- Cookie `correctHistory` (365-day expiry) — remembers previously-entered
  valid codes (by canonical slug), and drives both the corner "accessed"
  dropdown (click an entry to jump to that page) and the `used/total`
  counter at the bottom of the terminal box.
- `sessionStorage` key `phraseIndex` — resumes the terminal's typewriter
  animation position across in-site navigation.

## Conventions

- **Color palette** (reused across pages for a consistent retro-terminal
  look): cream `#f5e6c8` (text/borders), brown `#230e02` (page background),
  black `#000000` (terminal background), green `#6ab95c` (prompt).
- **Shared includes** are parameterized via Liquid `include.xxx` params and
  documented inline with `{%- comment -%}` blocks:
  - `page-overlay.html` — customizable via the `overlay_transition`
    front-matter variable.
  - `home-button.html` — customizable `label`.
  - `set-recording-button.html` — customizable `href`.
- **Front matter variables** in use: `layout`, `title`, `viewport`,
  `overlay_transition`, `stylesheets`, `head_scripts`.
- No path aliases, no TypeScript, no CSS/JS framework conventions to follow
  beyond what's already in `event.css`/`event-engine.js`.

## Testing / QA

There is no automated test suite, linter, or formatter configured (no
ESLint/Prettier/RuboCop/etc.). The expected QA process, based on recent
commit history, is a manual/agent-driven smoke test after changes:

- `jekyll build` succeeds.
- All pages render without errors.
- `CODE_LOOKUP` in the built `index.html` has one entry per row in
  `_data/access_codes.yml`, and `TOTAL_CODES` matches that count.
- The shared event engine loads and runs without JS console errors on
  event pages.
- Asset paths (CSS/JS/audio/img) resolve correctly.

## CI/CD & deployment

`.github/workflows/jekyll-gh-pages.yml` builds and deploys automatically on
every push to `main` (and via manual `workflow_dispatch`):
build job uses `actions/jekyll-build-pages` (source `./`, destination
`./_site`), deploy job uses `actions/deploy-pages` to GitHub Pages. There
are no lint or test gates in this pipeline. The custom domain
(`telestai.info`) is served via the `CNAME` file; there is no
`url`/`baseurl` override in `_config.yml` since the site is served from the
domain root.

## Git / PR conventions

- Commit messages are casual and free-form (no conventional-commits
  format enforced); larger structural changes get multi-paragraph bodies
  explaining rationale and verification steps.
- Changes typically go through a PR and are merged into `main`.
- AI-agent branches follow the pattern `claude/<short-description>-<suffix>`.
- No `CONTRIBUTING.md` or PR/issue templates exist in this repo.
