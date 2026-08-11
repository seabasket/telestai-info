{%- comment -%}
  Temporary urgent message shown in a box above the terminal on index.html.

  Leave this file empty (or whitespace-only) and NO box renders at all.
  Put any text below the comment block and the box appears, centered above
  the terminal, with the text rendered as markdown (so **bold**, [links],
  multiple paragraphs etc. all work).

  This whole comment block is stripped by Liquid before the emptiness check
  runs, so it does not count as content -- it's safe to leave it here.

  Optional auto-expiry: make the FIRST line (right after this comment
  block) exactly:

    EXPIRES: MM/DD/YYYY HH:MM

  e.g. "EXPIRES: 08/15/2026 23:00" -- 24-hour clock, no seconds. Put a
  blank line and then your message after it. The box will hide itself
  automatically, live in each visitor's own browser, once their local
  clock passes that moment (it re-checks every 30s, so it can disappear
  while a tab is already open, not just on the next page load). A visitor
  whose local clock is already past the deadline when they load the page
  never sees the box at all. If the EXPIRES line itself is malformed
  (wrong format, unparseable date), that fails safe toward SHOWING the
  message rather than silently hiding it. Omit the EXPIRES line entirely
  for a message that never expires on its own (today's default behavior).
{%- endcomment -%}
