/* The Press front page: local reading list, edition filters, search, and daily history. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const savedKey = 'press:frontpage-saved';
  const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const writeStorage = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  const safeLink = (value) => {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && url.pathname.endsWith('.html') ? url.href : null;
    } catch { return null; }
  };
  $('.nav-actions').hidden = false;
  const updateDate = () => {
    const today = new Date();
    $('[data-today]').textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    $('[data-today]').dateTime = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    $('[data-year]').textContent = today.getFullYear();
  };
  updateDate();

  const themeButton = $('[data-theme]');
  const colorPreference = matchMedia('(prefers-color-scheme: dark)');
  const storedTheme = readStorage('press-theme');
  if (['dark', 'light'].includes(storedTheme)) document.documentElement.dataset.theme = storedTheme;
  const dark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && colorPreference.matches);
  const updateThemeLabel = () => themeButton.setAttribute('aria-label', `Switch to ${dark() ? 'light' : 'dark'} mode`);
  themeButton.addEventListener('click', () => {
    const next = dark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    writeStorage('press-theme', next);
    updateThemeLabel();
  });
  colorPreference.addEventListener('change', updateThemeLabel);
  updateThemeLabel();

  if ($('#more-from-edition')) {
    const readSaved = () => {
      try {
        const data = JSON.parse(readStorage(savedKey) || '[]');
        return new Set(Array.isArray(data) ? data.filter((url) => typeof url === 'string' && safeLink(url)) : []);
      } catch { return new Set(); }
    };
    let saved = readSaved();
    const cards = $$('[data-story]');
    const filters = $$('[data-filter]');
    const loadMore = $('[data-load-more]');
    const pageSize = 8;
    let activeFilter = 'All';
    let limit = pageSize;
    const matchingCards = () => cards.filter((card) => (activeFilter === 'All' && !card.hasAttribute('data-featured')) || (activeFilter === 'Saved' ? saved.has(card.dataset.url) : card.dataset.section === activeFilter));
    const renderEdition = () => {
      const matches = matchingCards();
      const visible = new Set(matches.slice(0, limit));
      cards.forEach((card) => { card.hidden = !visible.has(card); });
      filters.forEach((button) => {
        const selected = button.dataset.filter === activeFilter;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      loadMore.hidden = matches.length <= limit;
      $('[data-empty]').hidden = matches.length > 0;
      $('[data-result-status]').textContent = `${visible.size} of ${matches.length} ${activeFilter === 'Saved' ? 'saved ' : ''}stories shown.`;
    };
    const updateSaved = () => {
      $('[data-saved-count]').textContent = saved.size;
      $('[data-show-saved]').setAttribute('aria-label', `Show saved stories (${saved.size})`);
      $$('[data-save]').forEach((button) => {
        button.hidden = false;
        const selected = saved.has(button.dataset.save);
        button.setAttribute('aria-pressed', String(selected));
        const title = $('h2, h3', button.closest('article'))?.textContent || 'story';
        button.setAttribute('aria-label', `${selected ? 'Unsave' : 'Save'} ${title}`);
      });
    };
    $$('[data-save]').forEach((button) => button.addEventListener('click', () => {
      const url = button.dataset.save;
      if (saved.has(url)) saved.delete(url); else saved.add(url);
      const persisted = writeStorage(savedKey, JSON.stringify([...saved]));
      updateSaved();
      $('[data-save-status]').textContent = `${saved.has(url) ? 'Story saved.' : 'Story removed from saved stories.'}${persisted ? '' : ' Storage is unavailable; your list will last for this visit.'}`;
      // Move focus to a visible control if removing a card from the saved view.
      if (activeFilter === 'Saved' && !saved.has(url)) $('[data-filter="Saved"]').focus({ preventScroll: true });
      renderEdition();
    }));
    const selectFilter = (value) => { activeFilter = value; limit = pageSize; renderEdition(); };
    filters.forEach((button) => button.addEventListener('click', () => selectFilter(button.dataset.filter)));
    $('[data-reset-filter]').addEventListener('click', () => { selectFilter('All'); filters[0].focus({ preventScroll: true }); });
    $('[data-show-saved]').addEventListener('click', () => {
      selectFilter('Saved');
      $('#more-from-edition').scrollIntoView();
      $('[data-filter="Saved"]').focus({ preventScroll: true });
    });
    loadMore.addEventListener('click', () => {
      const nextCard = matchingCards()[limit];
      limit += pageSize;
      renderEdition();
      $('h3 a', nextCard)?.focus({ preventScroll: true });
    });
    addEventListener('storage', (event) => {
      if (event.key === savedKey || event.key === null) { saved = readSaved(); updateSaved(); renderEdition(); }
    });
    $('[data-edition-tools]').hidden = false;
    updateSaved();
    renderEdition();
  
  }

  // Search loads its index only when the reader opens the dialog.
  const dialog = $('.search-dialog');
  const searchInput = $('#front-search');
  const results = $('[data-search-results]');
  const status = $('[data-search-status]');
  let searchIndex;
  let searchPromise;
  let opener;
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const loadSearch = () => {
    if (searchPromise) return searchPromise;
    searchPromise = fetch('search-index.json').then((response) => {
      if (!response.ok) throw new Error('Search index unavailable');
      return response.json();
    }).then((data) => {
      const rows = Array.isArray(data) ? data : data.stories || [];
      const extras = JSON.parse($('#front-extra-search').textContent);
      const unique = new Map();
      [...rows, ...extras].forEach((story) => {
        const url = safeLink(story.url || story.filename);
        if (!url || !story.title || /cartoon/i.test(story.section || '') || /\/cartoons?-/.test(url)) return;
        if (!unique.has(url)) unique.set(url, { ...story, href: url, haystack: normalize([story.title, story.section, story.dek, ...(story.keywords || [])].join(' ')) });
      });
      searchIndex = [...unique.values()];
    }).catch((error) => { searchPromise = null; throw error; });
    return searchPromise;
  };
  const renderSearch = async () => {
    const query = normalize(searchInput.value).trim();
    results.replaceChildren();
    if (!query) { status.textContent = 'Search headlines, sections, and topics across the full archive.'; return; }
    status.textContent = 'Searching…';
    try { await loadSearch(); } catch {
      if (normalize(searchInput.value).trim() === query) status.textContent = 'Search could not load. Try again or browse the archive below.';
      return;
    }
    if (normalize(searchInput.value).trim() !== query) return;
    const words = query.split(/\s+/);
    const matches = searchIndex.filter((story) => words.every((word) => story.haystack.includes(word)))
      .sort((a, b) => Number(normalize(b.title).includes(query)) - Number(normalize(a.title).includes(query)));
    status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'story' : 'stories'} found${matches.length > 30 ? ' · Showing the first 30; refine your search to narrow the results' : ''}.` : 'No stories found. Try another topic or a shorter search.';
    const fragment = document.createDocumentFragment();
    matches.slice(0, 30).forEach((story) => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = story.href;
      const section = document.createElement('p'); section.className = 'kicker'; section.textContent = story.section;
      const title = document.createElement('h3'); title.textContent = story.title;
      const dek = document.createElement('p'); dek.textContent = story.dek || story.summary || '';
      link.append(section, title, dek); fragment.append(link);
    });
    results.replaceChildren(fragment);
  };
  const openSearch = () => {
    if (dialog.open) return;
    opener = document.activeElement;
    dialog.showModal();
    searchInput.focus();
    loadSearch().catch(() => { status.textContent = 'Search could not load. Type a topic to retry, or browse the archive below.'; });
  };
  $('[data-open-search]').addEventListener('click', openSearch);
  $('[data-close-search]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  });
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  let searchTimer;
  searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderSearch, 120); });
  addEventListener('keydown', (event) => {
    const editing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !editing)) { event.preventDefault(); openSearch(); }
  });

  // Native document scrolling keeps anchors, history, and keyboard navigation aligned.
  const navLinks = $$('.nav-links a[href^="#"]');
  const sections = navLinks.map((link) => ({ link, section: $(link.getAttribute('href')) }));
  let scrollFrame = 0;
  const updateNav = () => {
    scrollFrame = 0;
    const threshold = $('.front-nav').getBoundingClientRect().bottom + 120;
    let current = sections[0];
    sections.forEach((item) => { if (item.section.getBoundingClientRect().top <= threshold) current = item; });
    if (sections.length && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
    sections.forEach((item) => { if (item === current) item.link.setAttribute('aria-current', 'location'); else item.link.removeAttribute('aria-current'); });
  };
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNav); }, { passive: true });
  addEventListener('resize', updateNav);
  updateNav();

  // Only the visible day's compact summary is rendered. The full archive stays on its own page.
  let historyIndex;
  let historyRequest;
  const loadHistory = async () => {
    try {
      if (!historyIndex) {
        historyRequest ||= fetch('data/frontpage-history.json').then((response) => {
          if (!response.ok) throw new Error('History unavailable');
          return response.json();
        });
        historyIndex = await historyRequest;
      }
      const now = new Date();
      const key = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const moment = historyIndex[key];
      if (!moment) return;
      $('#history-title').textContent = `${moment.year} / ${moment.title}`;
      $('[data-history-date]').textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      $('[data-history-text]').textContent = moment.text;
      const link = $('[data-history-link]'); link.href = `on-this-day-event.html?date=${key}`;
      link.textContent = 'Read the story ↗';
      const holder = $('[data-history-image]');
      if (moment.image && holder.dataset.date !== key) {
        const img = document.createElement('img'); img.src = moment.image; img.alt = moment.alt || moment.title; img.loading = 'lazy'; img.decoding = 'async'; img.width = 1200; img.height = 800;
        holder.replaceChildren(img); holder.dataset.date = key;
      }
    } catch { historyRequest = null; /* The history archive link remains available offline. */ }
  };
  if ($('#on-this-day') && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { loadHistory(); observer.disconnect(); }
    }, { rootMargin: '400px' });
    observer.observe($('#on-this-day'));
  } else if ($('#on-this-day')) loadHistory();
  const scheduleMidnight = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    setTimeout(() => { updateDate(); if (historyIndex) loadHistory(); scheduleMidnight(); }, midnight - now + 1000);
  };
  scheduleMidnight();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateDate(); if (historyIndex) loadHistory(); } });
})();
