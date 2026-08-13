# telestai-info
telestai website

this is mostly a playground for web dev and for using ai agents in coding. This code is NOT polished.

## structure

Built with plain [Jekyll](https://jekyllrb.com/) (no plugins) and deployed to
GitHub Pages by `.github/workflows/jekyll-gh-pages.yml`.

- `index.html` — the terminal landing page + access-code check
- `about.html`, `ts-*.html` — access-code pages (each lives at the site root)
- `ai.html` — essay/writing access-code page (`layout: essay`); prose lives in
  `_includes/essays/ai.md`
- `_layouts/default.html` — shared page shell (head, fade-in overlay)
- `_layouts/essay.html` — long-form essay page shell (sidebar table of
  contents, reading-progress bar, footnotes), nested inside `default.html`
- `_includes/` — reusable bits: `page-overlay`, `home-button`, `set-recording-button`
- `_data/access_codes.yml` — the list of access codes + their SHA-256 hashes
- `assets/css/event.css`, `assets/js/event-engine.js` — shared styles/engine for the
  audio-synced event pages (ts-0001, ts-snri314, ts-snst809)
- `assets/css/essay.css`, `assets/js/essay-nav.js` — shared styles/engine for essay pages
- `assets/css/tokens.css` — design tokens (colors/fonts) the rest of the CSS/pages reference
- `assets/audio/`, `assets/img/` — page media
- `assets/js/account.js`, `_data/supabase.yml`, `supabase/schema.sql` — the account system
  (email-OTP sign-in, synced unlocked-code history) on `index.html`; see CLAUDE.md's
  "Accounts (Supabase)" section for setup. Left unconfigured by default, it's fully inert.

## adding a new access-code page

1. Create `<code>.html` at the repo root. Start it with front matter (the
   `permalink` gives it a clean `/<code>/` URL — no `.html`):
   ```
   ---
   layout: default
   permalink: /<code>/
   ---
   ```
   For an audio/event page, copy `ts-0001.html` and also add:
   ```
   stylesheets:
     - /assets/css/event.css
   head_scripts:
     - /assets/js/event-engine.js
   ```
   For a long-form essay page, copy `ai.html` instead (`layout: essay`,
   `/assets/css/essay.css` + `/assets/js/essay-nav.js`), and write the
   actual essay as markdown in `_includes/essays/<code>.md`.
2. Get the hash of the code's suffix — the part after the first `-` (or
   the whole code if it has no dash), since the prefix is disregarded when
   checking codes:
   ```
   printf '%s' "your-suffix" | shasum -a 256
   ```
3. Add an entry to `_data/access_codes.yml` with that hash. `index.html` builds
   its `CODE_LOOKUP` map from this file automatically.

## local preview

```
jekyll serve
# http://localhost:4000
```
