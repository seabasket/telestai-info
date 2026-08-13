{%- comment -%}
  Markdown source for the /ai/ essay page (ai.html). Edit this file to
  write the actual essay -- ai.html just includes + markdownifies it, so
  nothing here needs Liquid or HTML, just plain markdown.

  A few things worth knowing about how _layouts/essay.html renders this:
  - Every "## heading" becomes a numbered entry in the sidebar table of
    contents (auto-built + scroll-highlighted by assets/js/essay-nav.js),
    so keep top-level sections at "##", not "#" (the page's own title,
    from ai.html's front matter, is already the "#").
  - Footnotes work via kramdown's native syntax: write `a claim[^1]`
    inline, then anywhere below it, `[^1]: the footnote text`.
  - This file lives under _includes/ (not the repo root) specifically so
    Jekyll never builds it as a standalone page of its own -- only
    ai.html's include pulls it into the site.
  - If a paragraph here ever needs literal curly braces, wrap it in
    {% raw %}...{% endraw %} so Liquid doesn't try to parse them.
{%- endcomment -%}

This is a placeholder. Replace this paragraph -- and everything below
it -- with the real essay.

## A first section

Start writing here. Headings at this level (`##`) become numbered
entries in the sidebar to the left, and the thin bar at the very top of
the page fills in as a reader scrolls through the essay.

Footnotes work too.[^example]

## A second section

More sections just mean more `##` headings. Standard markdown -- **bold**,
_italics_, [links](/), lists, code -- all renders normally.

> Blockquotes look like this, for pulling out a line worth sitting with.

[^example]: This is what a footnote looks like. Click the little arrow to jump back up to where you were reading.
