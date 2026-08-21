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
redirects to `/<code>/` (clean URL — see Pretty permalinks below). Codes
are prefix- and case-agnostic (see
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
  essay.html                  # long-form essay page shell (nested inside default): sidebar TOC, progress bar
_includes/
  page-overlay.html           # fade-from-black transition overlay (all pages)
  home-button.html            # "HOME" link back to index.html
  set-recording-button.html   # "SET RECORDING" link (event pages)
  essays/ai.md                 # markdown source for the /ai/ essay page (edit this to write the essay)
_data/
  access_codes.yml            # SINGLE SOURCE OF TRUTH for valid access codes (slug/file/title/sha256)
  supabase.yml                 # Supabase project url/anon_key for the account system (blank = disabled)
assets/
  css/event.css                # shared styles for audio-synced event pages
  css/essay.css                 # shared styles for essay pages (sidebar TOC, hover/tap footnotes, prose)
  css/tokens.css                # design tokens (--ts-* colors/fonts) all other CSS/pages reference
  js/event-engine.js           # shared JS engine (stars/typewriter/gradient/pulse/audio wiring)
  js/essay-nav.js               # essay engine: TOC, scrollspy, progress bar, footnote tooltips
  js/account.js                 # TelestaiAccount: Supabase-backed email-OTP accounts (index.html only)
  audio/, img/                 # page media
supabase/
  schema.sql                   # one-time SQL setup for the accounts backend (see "Accounts (Supabase)")
index.html                   # terminal landing page + access-code checker
about.html, ts-*.html        # access-code content pages (root-level, one per code)
ai.html                       # essay/writing access-code page (layout: essay)
.github/workflows/
  jekyll-gh-pages.yml          # build + deploy to GitHub Pages on push to main
```

**Every content page is a flat root-level `.html` source file** — this is
deliberate, not an oversight. Each carries a `permalink: /<slug>/` in its
front matter so Jekyll builds it to `<slug>/index.html` and it's served at
the clean URL `/<slug>/` (no `.html`). `index.html` redirects with
`location.href = "/" + slug + "/"`, and the source filename stem must still
equal the access-code slug. Keep the source files flat at the repo root
(the `permalink` handles the pretty output path); don't nest the sources
in subdirectories.

### Pretty permalinks / clean URLs

Pages are served at `/<slug>/` (e.g. `/ts-snst809/`), not `/<slug>.html`.
This is opt-in per page via a `permalink: /<slug>/` front-matter line —
there is no site-wide permalink default (that would send `index.html` to
`/index/`). GitHub Pages serves `/<slug>/` from the generated
`<slug>/index.html` and 301-redirects the bare `/<slug>` (no trailing
slash) to `/<slug>/`. Because pages now live one path segment deep, all
internal links use root-absolute paths: the shared `home-button.html`
points at `/`, asset references use `/assets/...` (via `relative_url`), and
`index.html`'s redirect/dropdown build `"/" + slug + "/"`. Old `<slug>.html`
URLs 404 after this change (there are no redirect stubs).

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

1. Create `<code>.html` at the repo root, starting with front matter (the
   `permalink` is what gives the page its clean `/<code>/` URL):
   ```yaml
   ---
   layout: default
   permalink: /<code>/
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
   For a long-form essay/writing page (sidebar table of contents, reading-
   progress bar, footnotes — modeled on Dario Amodei's "Machines of Loving
   Grace"), copy `ai.html` as a starting point instead: `layout: essay`
   plus
   ```yaml
   stylesheets:
     - /assets/css/essay.css
   head_scripts:
     - /assets/js/essay-nav.js
   ```
   The essay's actual prose is markdown, kept separately in
   `_includes/essays/<code>.md` and pulled into the page via
   `{%- capture essay_markdown -%}{% include essays/<code>.md %}{%- endcapture -%}{{ essay_markdown | markdownify }}`
   — edit that `.md` file to write the essay itself; `##` headings inside
   it become the numbered sidebar entries, and kramdown's native
   `word[^1]` / `[^1]: text` syntax gives footnotes; essay-nav.js shows
   those as hover/tap tooltips (the bottom-of-page list stays). See
   `_layouts/essay.html` for the full templating details.
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
redirect target (`/<slug>/`) and the history entry, since the raw input may
not be a valid slug on its own.

Client-side state used by the gate:
- Cookie `correctHistory` (365-day expiry) — remembers previously-entered
  valid codes (by canonical slug), and drives both the corner "accessed"
  dropdown (click an entry to jump to that page) and the `used/total`
  counter at the bottom of the terminal box.
- `sessionStorage` key `phraseIndex` — resumes the terminal's typewriter
  animation position across in-site navigation.

## Accounts (Supabase)

Real, email-verified accounts sit alongside (not instead of) the
cookie-based access-code history above: an account syncs which codes
you've unlocked across devices/browsers, and replaces the terminal
prompt's device/browser/IP text with a chosen username. This is the one
place in the codebase that talks to a backend — everything else stays a
static Jekyll build.

**Backend**: [Supabase](https://supabase.com) (hosted Postgres + Auth). No
Supabase MCP/CLI tooling is available in this repo's dev environment, so
the project itself is created and configured by hand:
1. Create a free Supabase project. Project Settings → API gives you the
   **Project URL** and **anon public** key (safe to put in client-side
   code — the anon key's access is enforced by Postgres Row Level
   Security, not by secrecy; never use the separate "service role" key
   here). Put both in `_data/supabase.yml`.
2. Authentication → Providers → Email: enabled, OTP method set to a
   6-digit code (not a magic link) — matches the terminal's typed-code UI.
3. Run `supabase/schema.sql` once in the Supabase SQL Editor. It creates
   `public.profiles` (`username`, `phone`, one row per account, RLS-scoped
   to its owner) and `public.unlocked_codes` (insert-only ledger of which
   `slug`s an account has unlocked, RLS-scoped to its owner) plus a trigger
   that creates the profile row on signup. See the file's own comments for
   why there's deliberately no public-read policy on `profiles` (Postgres
   RLS is row-level, not column-level, so "let anyone read the username"
   would actually mean "let anyone read the phone number too").

`_data/supabase.yml` ships with both values blank. Left blank,
`assets/js/account.js`'s `TelestaiAccount.init()` resolves `false` and
every other method becomes a no-op — `index.html`'s account UI never
renders, the prompt/corner-dropdown behave exactly as they do with no
accounts at all. This is the default for a fresh clone/fork; the account
system is opt-in infrastructure, not a hard dependency of the site.

**Frontend** (`index.html` only — no other page has account UI):
- `window.TelestaiAccount` (`assets/js/account.js`) is the only thing that
  talks to Supabase: `sendCode`/`verifyCode` (email OTP), `getSession`/
  `getProfile`, `setUsername`/`setPhone`, `syncUnlockedCode`/
  `fetchUnlockedCodes`. It lazy-loads the Supabase JS client from
  `esm.sh` via dynamic `import()` so it stays a plain `<script src>` like
  `event-engine.js`/`essay-nav.js` — no bundler.
- One shared account panel lives in `#account-section` (built by
  `renderAccountPanel()` and friends in `index.html`'s own script), sitting
  above the existing accessed-codes list inside the same `#history-list`
  corner dropdown. Three separate triggers open the same panel: the corner
  toggle (relabeled `sign in ▾` / `{username} ▾`), typing `signin`/`login`
  into the terminal input (intercepted at the top of `check()`), or
  clicking the `.prompt` tag itself (a `<button>`, `type="button"` so it
  can't accidentally submit the terminal's form).
- On a successful code entry, `check()` still writes to the
  `correctHistory` cookie exactly as before (so logged-out visitors are
  completely unaffected), and additionally fire-and-forgets
  `TelestaiAccount.syncUnlockedCode(slug)` when signed in. On page load,
  a signed-in session's `unlocked_codes` are merged into `correctHistory`
  (and the cookie re-saved), so `renderHistoryUI()` needs no changes of
  its own to show the merged result.

**Deliberately not built yet** (separate, explicitly scoped future work):
phone-number login (real phone OTP requires registering with an SMS
carrier gateway like Twilio and costs money per message, unlike email OTP
which is free), outbound SMS code delivery, and event sign-up/RSVP (no
mechanism for that exists on event pages at all yet).

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
