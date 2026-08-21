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
    inline, then anywhere below it, `[^1]: the footnote text`. On the
    page, hovering (desktop) or tapping (phone) the superscript shows
    the note in a tooltip; the full list still appears at the bottom.
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
entries in the sidebar to the left, and the thin bar on the left edge of
the page fills in top-to-bottom as a reader scrolls through the essay.

Footnotes work too.[^example] Hover the number (or tap it, on a phone)
and the note appears in place, the way it does in Dario Amodei's
*Machines of Loving Grace*.

## A second section

More sections just mean more `##` headings. Standard markdown -- **bold**,
_italics_, [links](/), lists, code -- all renders normally.

A footnote can also hold a link, or run a little longer than a
sentence.[^linked]

> Blockquotes look like this, for pulling out a line worth sitting with.

[^example]: This is what a footnote looks like. You can still jump to the list at the bottom of the page, or click the little arrow there to return.

[^linked]: Richard Brautigan's poem, which Amodei takes his title from, is [All Watched Over by Machines of Loving Grace](https://allpoetry.com/All-Watched-Over-By-Machines-Of-Loving-Grace). Longer notes wrap inside the tooltip the same way they wrap in the list below.
