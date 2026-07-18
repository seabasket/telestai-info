# telestai-info
telestai website

this is mostly a playground for web dev and for using ai agents in coding. This code is NOT polished.

## structure

Built with plain [Jekyll](https://jekyllrb.com/) (no plugins) and deployed to
GitHub Pages by `.github/workflows/jekyll-gh-pages.yml`.

- `index.html` — the terminal landing page + access-code check
- `about.html`, `ts-*.html` — access-code pages (each lives at the site root)
- `_layouts/default.html` — shared page shell (head, fade-in overlay)
- `_includes/` — reusable bits: `page-overlay`, `home-button`, `set-recording-button`
- `_data/access_codes.yml` — the list of access codes + their SHA-256 hashes
- `assets/css/event.css`, `assets/js/event-engine.js` — shared styles/engine for the
  audio-synced event pages (ts-0001, ts-snri314)
- `assets/audio/`, `assets/img/` — page media

## adding a new access-code page

1. Create `<code>.html` at the repo root. Start it with front matter:
   ```
   ---
   layout: default
   ---
   ```
   For an audio/event page, copy `ts-0001.html` and also add:
   ```
   stylesheets:
     - /assets/css/event.css
   head_scripts:
     - /assets/js/event-engine.js
   ```
2. Get the code's hash:
   ```
   printf '%s' "your-code" | shasum -a 256
   ```
3. Add an entry to `_data/access_codes.yml` with that hash. `index.html` builds
   its `KNOWN_HASHES` allowlist from this file automatically.

## local preview

```
jekyll serve
# http://localhost:4000
```
