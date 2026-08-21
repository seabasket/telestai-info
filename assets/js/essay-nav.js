/*
  Shared engine for long-form essay pages (layout: essay). Builds the
  sidebar table of contents from the essay's <h2> headings (kramdown
  already gives each one an id, so no slugify step is needed), highlights
  the current section as the reader scrolls, drives the reading-progress
  bar, and turns kramdown footnotes into hover/tap tooltips (Machines of
  Loving Grace–style). Defines window.TelestaiEssay; each essay page just
  calls TelestaiEssay.init() after its content is on the page (see
  _layouts/essay.html).

  Loaded in <head> (via the page's `head_scripts` front matter) so this
  definition exists before the layout's own inline <script> calls init().
*/
window.TelestaiEssay = (function () {
  function toRoman(num) {
    const table = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let result = '';
    table.forEach(([value, numeral]) => {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    });
    return result;
  }

  // Reads the <h2>s inside the content column, numbers them, and appends
  // matching links into the nav sidebar. Returns [{ heading, link }, ...]
  // so the caller can wire up scrollspy against the same pairs.
  function buildNav(contentSelector, navSelector) {
    const content = document.querySelector(contentSelector);
    const nav = document.querySelector(navSelector);
    if (!content || !nav) return [];

    const headings = Array.from(content.querySelectorAll('h2'));
    if (!headings.length) {
      nav.style.display = 'none';
      return [];
    }

    const list = document.createElement('ol');
    list.className = 'essay-nav-list';

    const links = headings.map((heading, i) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      const num = document.createElement('span');
      num.className = 'essay-nav-num';
      num.textContent = toRoman(i + 1);
      link.appendChild(num);
      link.appendChild(document.createTextNode(heading.textContent));
      item.appendChild(link);
      list.appendChild(item);
      return { heading, link };
    });

    nav.innerHTML = '';
    nav.appendChild(list);
    return links;
  }

  // Highlights the nav link for whichever heading is currently in the
  // "reading zone" (roughly the top third of the viewport).
  function watchScroll(links) {
    if (!links.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const match = links.find((l) => l.heading === entry.target);
        if (!match) return;
        links.forEach((l) => l.link.classList.remove('active'));
        match.link.classList.add('active');
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    links.forEach((l) => observer.observe(l.heading));
  }

  // Fills in .essay-progress based on how far through the content column
  // the reader has scrolled (0% at the top of the essay, 100% at the end).
  function watchProgress(barSelector, contentSelector) {
    const bar = document.querySelector(barSelector);
    const content = document.querySelector(contentSelector);
    if (!bar || !content) return;

    function update() {
      const liveBar = document.querySelector(barSelector);
      const liveContent = document.querySelector(contentSelector);
      if (!liveBar || !liveContent) return;
      const rect = liveContent.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
      liveBar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }

    if (!watchProgress.bound) {
      document.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      watchProgress.bound = true;
    }
    update();
  }

  // kramdown already emits <sup><a class="footnote" href="#fn:…">N</a></sup>
  // plus a .footnotes list at the bottom. Clone each note into a tooltip
  // sitting on the marker: hover on a fine pointer, tap on touch. The
  // bottom list stays as a fallback (print, no-JS, "see all notes").
  function initFootnotes(contentSelector) {
    const content = document.querySelector(contentSelector);
    if (!content) return;

    const refs = Array.from(content.querySelectorAll('a.footnote'));
    if (!refs.length) return;

    function closeAll(except) {
      content.querySelectorAll('sup.footnote-open').forEach((sup) => {
        if (sup === except) return;
        sup.classList.remove('footnote-open');
        const a = sup.querySelector('a.footnote');
        if (a) a.setAttribute('aria-expanded', 'false');
      });
    }

    function placeTooltip(sup) {
      const tooltip = sup.querySelector('.footnote-tooltip');
      if (!tooltip) return;
      tooltip.style.top = 'calc(100% + 0.5em)';
      tooltip.style.bottom = 'auto';
      tooltip.style.transform = 'translateX(-50%)';
      const rect = tooltip.getBoundingClientRect();
      const pad = 12;
      let dx = 0;
      if (rect.left < pad) dx = pad - rect.left;
      else if (rect.right > window.innerWidth - pad) {
        dx = window.innerWidth - pad - rect.right;
      }
      const marker = sup.getBoundingClientRect();
      const spaceBelow = window.innerHeight - marker.bottom;
      if (rect.height + 12 > spaceBelow && marker.top > spaceBelow) {
        tooltip.style.top = 'auto';
        tooltip.style.bottom = 'calc(100% + 0.5em)';
      }
      tooltip.style.transform = dx
        ? 'translateX(calc(-50% + ' + dx + 'px))'
        : 'translateX(-50%)';
    }

    function isCoarsePointer(event) {
      if (event && event.pointerType && event.pointerType !== 'mouse') return true;
      return window.matchMedia('(hover: none)').matches;
    }

    refs.forEach((link, i) => {
      const sup = link.closest('sup');
      if (!sup || sup.querySelector('.footnote-tooltip')) return;

      const href = link.getAttribute('href') || '';
      const id = decodeURIComponent(href.replace(/^#/, ''));
      const li = document.getElementById(id);
      if (!li) return;

      const clone = li.cloneNode(true);
      clone.querySelectorAll('.reversefootnote').forEach((el) => el.remove());
      const paragraphs = Array.from(clone.querySelectorAll('p'));
      const html = paragraphs.length
        ? paragraphs.map((p) => p.innerHTML.trim()).filter(Boolean).join('<br><br>')
        : clone.innerHTML.trim();
      if (!html) return;

      const number = (link.textContent || '').trim() || String(i + 1);
      const tooltipId = 'fn-tip-' + id.replace(/[^A-Za-z0-9:_-]/g, '');
      const tooltip = document.createElement('span');
      tooltip.className = 'footnote-tooltip';
      tooltip.id = tooltipId;
      tooltip.setAttribute('role', 'tooltip');
      tooltip.innerHTML =
        '<sup class="footnote-tooltip-num">' + number + '</sup> ' + html;

      link.classList.add('footnote-ref');
      link.setAttribute('aria-describedby', tooltipId);
      link.setAttribute('aria-expanded', 'false');
      sup.appendChild(tooltip);

      function open() {
        closeAll(sup);
        sup.classList.add('footnote-open');
        link.setAttribute('aria-expanded', 'true');
        placeTooltip(sup);
      }

      link.addEventListener('click', function (event) {
        // Touch / stylus: show the note in place instead of jumping to
        // the bottom. Mouse click still follows the href (MoLG does too).
        if (!isCoarsePointer(event)) return;
        event.preventDefault();
        if (sup.classList.contains('footnote-open')) closeAll();
        else open();
      });

      link.addEventListener('mouseenter', function () {
        if (!window.matchMedia('(hover: none)').matches) placeTooltip(sup);
      });

      link.addEventListener('focus', function () {
        placeTooltip(sup);
      });
    });

    if (!initFootnotes.docBound) {
      document.addEventListener('click', function (event) {
        const live = document.querySelector(contentSelector);
        if (!live) return;
        if (!event.target.closest || !event.target.closest('sup:has(.footnote-tooltip)')) {
          live.querySelectorAll('sup.footnote-open').forEach((sup) => {
            sup.classList.remove('footnote-open');
            const a = sup.querySelector('a.footnote');
            if (a) a.setAttribute('aria-expanded', 'false');
          });
        }
      });
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        const live = document.querySelector(contentSelector);
        if (!live) return;
        live.querySelectorAll('sup.footnote-open').forEach((sup) => {
          sup.classList.remove('footnote-open');
          const a = sup.querySelector('a.footnote');
          if (a) a.setAttribute('aria-expanded', 'false');
        });
      });
      window.addEventListener('resize', function () {
        const live = document.querySelector(contentSelector);
        if (!live) return;
        live.querySelectorAll('sup.footnote-open').forEach(placeTooltip);
      });
      initFootnotes.docBound = true;
    }
  }

  function init(options) {
    options = options || {};
    const contentSelector = options.content || '.essay-content';
    const links = buildNav(contentSelector, options.nav || '.essay-nav');
    watchScroll(links);
    watchProgress(options.progress || '.essay-progress', contentSelector);
    initFootnotes(contentSelector);
  }

  return { init: init };
})();
