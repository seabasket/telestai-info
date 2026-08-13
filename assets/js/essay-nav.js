/*
  Shared engine for long-form essay pages (layout: essay). Builds the
  sidebar table of contents from the essay's <h2> headings (kramdown
  already gives each one an id, so no slugify step is needed), highlights
  the current section as the reader scrolls, and drives the reading-
  progress bar. Defines window.TelestaiEssay; each essay page just calls
  TelestaiEssay.init() after its content is on the page (see
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
      const rect = content.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
      bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }

    document.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function init(options) {
    options = options || {};
    const contentSelector = options.content || '.essay-content';
    const links = buildNav(contentSelector, options.nav || '.essay-nav');
    watchScroll(links);
    watchProgress(options.progress || '.essay-progress', contentSelector);
  }

  return { init: init };
})();
