const PRESS_SITE_ASSET_BASE = (() => {
  const script = document.currentScript
    || Array.from(document.scripts).reverse().find((item) => /(?:^|\/)app\.js(?:\?|$)/.test(item.getAttribute('src') || ''));
  const scriptSrc = script?.src || script?.getAttribute('src') || 'app.js';
  return new URL('.', new URL(scriptSrc, document.baseURI || window.location.href)).href;
})();

const PRESS_SITE_APP_VERSION = (() => {
  const script = document.currentScript
    || Array.from(document.scripts).reverse().find((item) => /(?:^|\/)app\.js(?:\?|$)/.test(item.getAttribute('src') || ''));
  const scriptSrc = script?.src || script?.getAttribute('src') || '';
  try {
    return new URL(scriptSrc, document.baseURI || window.location.href).searchParams.get('v') || '';
  } catch (_) {
    return '';
  }
})();

function pressSiteAssetUrl(path) {
  const value = String(path || '').trim();
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(value)) return value;
  const resolved = new URL(value, PRESS_SITE_ASSET_BASE);
  if (/\.json$/i.test(resolved.pathname) && PRESS_SITE_APP_VERSION && !resolved.searchParams.has('v')) {
    resolved.searchParams.set('v', PRESS_SITE_APP_VERSION);
  }
  return resolved.href;
}

function pressIndexSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pressIndexPath(value) {
  return String(value ?? '')
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\.\//, '')
    .replace(/[?#].*$/, '')
    .toLowerCase();
}

function pressIsBelowFoldIndexItem(item = {}, urlOverride = '', sectionOverride = '', typeOverride = '') {
  const url = pressIndexPath(urlOverride || item.url || item.href || item.link || item.filename || item.permalink || '');
  const section = pressIndexSlug(sectionOverride || item.section || item.section_slug || item.sectionSlug || item.desk || item.category || '');
  const type = pressIndexSlug(typeOverride || item.type || item.kind || item.story_type || '');
  return item.newsstandOnly === true
    || item.excludeFromEdition === true
    || item.excludeFromArchive === true
    || item.excludeFromGallery === true
    || url === 'below-the-fold.html'
    || url.startsWith('below-the-fold/')
    || section === 'below-the-fold'
    || type === 'newsstand'
    || type === 'issue';
}

function pressIsCartoonIndexItem(item = {}, urlOverride = '', sectionOverride = '') {
  const url = pressIndexPath(urlOverride || item.url || item.href || item.link || item.filename || item.permalink || '');
  const section = pressIndexSlug(sectionOverride || item.section || item.section_slug || item.sectionSlug || item.desk || item.category || '');
  return section === 'cartoons' || url.startsWith('cartoons-') || url.includes('/cartoons-');
}

function pressNumericScrollTop(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function pressPageScrollTop() {
  return Math.max(
    pressNumericScrollTop(window.scrollY),
    pressNumericScrollTop(window.pageYOffset),
    pressNumericScrollTop(document.scrollingElement?.scrollTop),
    pressNumericScrollTop(document.documentElement?.scrollTop),
    pressNumericScrollTop(document.body?.scrollTop)
  );
}

function pressAddScrollListener(callback) {
  const targets = new Set([
    window,
    document,
    document.documentElement,
    document.body,
  ].filter(Boolean));
  targets.forEach((target) => target.addEventListener('scroll', callback, { passive: true }));
}

const PRESS_EDITABLE_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '[aria-multiline="true"]',
].join(', ');

function pressClosestElement(target) {
  if (target instanceof Element) return target;
  return target?.parentElement || null;
}

function pressIsEditableTarget(target) {
  return Boolean(pressClosestElement(target)?.closest?.(PRESS_EDITABLE_TARGET_SELECTOR));
}

function pressBootNyLovePageMenu() {
  document.querySelectorAll('[data-page-menu]').forEach((menu) => {
    const toggle = menu.querySelector('[data-page-menu-toggle]');
    const nav = menu.querySelector('[data-illustration-nav]');
    if (!(toggle instanceof HTMLButtonElement) || !nav) return;
    menu.setAttribute('data-page-menu-ready', 'true');
    const setOpen = (open) => {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    setOpen(false);
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    nav.querySelectorAll('a[href^="#page-"]').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', pressBootNyLovePageMenu, { once: true });
} else {
  pressBootNyLovePageMenu();
}

(() => {
  if (document.querySelector('[data-press-fonts]')) return;
  const script = document.createElement('script');
  script.src = pressSiteAssetUrl('assets/press-fonts.js?v=1779692200');
  script.defer = true;
  document.head.appendChild(script);
})();

(() => {
  const body = document.body;
  if (
    !body?.classList.contains('page-home') &&
    !body?.classList.contains('page-article') &&
    !body?.classList.contains('page-archive')
  ) return;

  const step = (amount) => {
    body.scrollTop = Math.max(0, Math.min(
      body.scrollHeight - body.clientHeight,
      body.scrollTop + amount
    ));
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (pressIsEditableTarget(event.target)) return;
    if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
      event.preventDefault();
      step(body.clientHeight * .86);
    } else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
      event.preventDefault();
      step(body.clientHeight * -.86);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      step(64);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      step(-64);
    } else if (event.key === 'Home') {
      event.preventDefault();
      body.scrollTop = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      body.scrollTop = body.scrollHeight;
    }
  });
})();

(() => {
  const flippers = Array.from(document.querySelectorAll('[data-below-fold-flipper]'));
  if (!flippers.length) return;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  function getScrollRoot() {
    return document.body?.scrollHeight > document.body?.clientHeight
      ? document.body
      : document.scrollingElement || document.documentElement;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function issueMeta(issue) {
    return [issue?.issueLabel, issue?.dateLabel].map(cleanText).filter(Boolean).join(' / ');
  }

  function readDeck(flipper) {
    const script = flipper.querySelector('[data-below-fold-issue-deck]');
    if (!script) return null;
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (!Array.isArray(data.issues) || !data.templates || typeof data.templates !== 'object') return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function setDisabled(control, disabled) {
    if (!control) return;
    control.classList.toggle('is-disabled', disabled);
    control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (disabled) {
      control.setAttribute('tabindex', '-1');
    } else {
      control.removeAttribute('tabindex');
    }
  }

  function initFlipper(flipper) {
    const deck = readDeck(flipper);
    const sheet = flipper.querySelector('[data-below-fold-sheet]');
    const paper = flipper.querySelector('[data-below-fold-paper]');
    if (!deck || !sheet || !paper) return;

    const issues = deck.issues
      .map((issue) => ({
        slug: cleanText(issue.slug),
        title: cleanText(issue.title || 'Below the Fold'),
        url: cleanText(issue.url || '#'),
        issueLabel: cleanText(issue.issueLabel),
        dateLabel: cleanText(issue.dateLabel),
        dek: cleanText(issue.dek),
      }))
      .filter((issue) => issue.slug && deck.templates[issue.slug]);

    if (!issues.length) return;

    const controls = {
      older: flipper.querySelector('[data-below-fold-flip="older"]'),
      newer: flipper.querySelector('[data-below-fold-flip="newer"]'),
    };
    const counter = flipper.querySelector('[data-below-fold-counter]');
    let activeIndex = issues.findIndex((issue) => issue.slug === deck.current);
    if (activeIndex < 0) activeIndex = 0;
    let turning = false;
    let turnVisibilityFrame = 0;

    function updateTurnVisibility() {
      turnVisibilityFrame = 0;
      flipper.classList.add('is-turns-ready');
    }

    function requestTurnVisibilityUpdate() {
      if (turnVisibilityFrame) return;
      turnVisibilityFrame = window.requestAnimationFrame
        ? window.requestAnimationFrame(updateTurnVisibility)
        : window.setTimeout(updateTurnVisibility, 16);
    }

    function updateTurnControl(kind, targetIssue) {
      const control = controls[kind];
      if (!control) return;
      const title = control.querySelector('[data-below-fold-turn-title]');
      const meta = control.querySelector('[data-below-fold-turn-meta]');
      const disabled = !targetIssue;
      setDisabled(control, disabled);
      control.href = targetIssue?.url || '#';
      if (title) title.textContent = targetIssue?.title || (kind === 'older' ? 'Oldest issue' : 'Newest issue');
      if (meta) {
        meta.textContent = targetIssue
          ? issueMeta(targetIssue)
          : kind === 'older'
            ? 'No older issue'
            : 'You are on the newest issue';
      }
      control.setAttribute(
        'aria-label',
        targetIssue
          ? `Flip to ${kind === 'older' ? 'older' : 'newer'} issue: ${targetIssue.title}`
          : kind === 'older'
            ? 'No older Below the Fold issue'
            : 'You are on the newest Below the Fold issue'
      );
    }

    function updateChrome() {
      const active = issues[activeIndex];
      const older = issues[activeIndex + 1];
      const newer = issues[activeIndex - 1];
      flipper.dataset.currentSlug = active.slug;
      if (counter) counter.textContent = issueMeta(active) || active.title;
      updateTurnControl('older', older);
      updateTurnControl('newer', newer);
    }

    function scrollToIssueTop() {
      const root = getScrollRoot();
      const currentTop = root.scrollTop || window.scrollY || window.pageYOffset || 0;
      const top = Math.max(0, paper.getBoundingClientRect().top + currentTop - 8);
      root.scrollTop = top;
      if (root !== document.documentElement) document.documentElement.scrollTop = top;
      window.scrollTo(0, top);
      requestTurnVisibilityUpdate();
    }

    function applyIssue(nextIndex) {
      const issue = issues[nextIndex];
      const html = deck.templates[issue.slug];
      if (!html) return false;
      sheet.innerHTML = html;
      activeIndex = nextIndex;
      updateChrome();
      return true;
    }

    function finishTurn() {
      turning = false;
      paper.removeAttribute('aria-busy');
      flipper.classList.remove('is-flipping', 'is-flipping-older', 'is-flipping-newer', 'is-flipping-out', 'is-flipping-in');
    }

    function flip(kind) {
      if (turning) return;
      const nextIndex = kind === 'older' ? activeIndex + 1 : activeIndex - 1;
      if (nextIndex < 0 || nextIndex >= issues.length) return;

      if (reduceMotion) {
        if (applyIssue(nextIndex)) scrollToIssueTop();
        return;
      }

      turning = true;
      paper.setAttribute('aria-busy', 'true');
      flipper.classList.remove('is-flipping-older', 'is-flipping-newer', 'is-flipping-out', 'is-flipping-in');
      flipper.classList.add('is-flipping', `is-flipping-${kind}`, 'is-flipping-out');

      window.setTimeout(() => {
        if (applyIssue(nextIndex)) scrollToIssueTop();
        flipper.classList.remove('is-flipping-out');
        flipper.classList.add('is-flipping-in');
      }, 210);

      window.setTimeout(finishTurn, 520);
    }

    Object.entries(controls).forEach(([kind, control]) => {
      control?.addEventListener('click', (event) => {
        if (control.getAttribute('aria-disabled') === 'true') return;
        event.preventDefault();
        flip(kind);
      });
    });

    flipper.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (pressIsEditableTarget(event.target)) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        flip('newer');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        flip('older');
      }
    });

    const scrollRoot = getScrollRoot();
    scrollRoot.addEventListener('scroll', requestTurnVisibilityUpdate, { passive: true });
    if (scrollRoot !== window) window.addEventListener('scroll', requestTurnVisibilityUpdate, { passive: true });
    window.addEventListener('resize', requestTurnVisibilityUpdate, { passive: true });

    updateChrome();
    flipper.classList.add('is-turns-ready');
    updateTurnVisibility();
  }

  flippers.forEach(initFlipper);
})();

(() => {
  const IMAGE_LINK_SELECTOR = '.drone-article-visual__media[href]';
  const ARTICLE_IMAGE_SELECTOR = [
    'body.page-article .article-hero .hero-figure img',
    'body.page-article .article-body figure > img',
    'body.page-article .article-body figure picture > img',
    'body.page-article .article-aside figure > img',
    'body.page-article .article-aside figure picture > img',
    'body.page-article .press-social-side figure > img',
    'body.page-article .press-social-side figure picture > img',
  ].join(',');
  const IMAGE_LIGHTBOX_MIN_ZOOM = 1;
  const IMAGE_LIGHTBOX_MAX_ZOOM = 6;
  const IMAGE_LIGHTBOX_ZOOM_STEP = 0.75;
  const IMAGE_LIGHTBOX_ZOOM_EPSILON = 0.01;
  let activeLightbox = null;

  function getImageLightboxSource(image) {
    if (!image) return '';
    return image.currentSrc || image.getAttribute('src') || '';
  }

  function clampImageLightboxValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getImageLightboxPanBounds(lightbox) {
    const frameRect = lightbox.frame.getBoundingClientRect();
    const imageWidth = lightbox.image.offsetWidth * lightbox.zoom;
    const imageHeight = lightbox.image.offsetHeight * lightbox.zoom;
    return {
      x: Math.max(0, (imageWidth - frameRect.width) / 2),
      y: Math.max(0, (imageHeight - frameRect.height) / 2),
    };
  }

  function getImageLightboxMaxZoom(lightbox) {
    const renderedWidth = lightbox?.image?.offsetWidth || 0;
    const renderedHeight = lightbox?.image?.offsetHeight || 0;
    const naturalWidth = lightbox?.image?.naturalWidth || 0;
    const naturalHeight = lightbox?.image?.naturalHeight || 0;
    if (!renderedWidth || !renderedHeight || !naturalWidth || !naturalHeight) return IMAGE_LIGHTBOX_MAX_ZOOM;
    const nativePixelZoom = Math.min(naturalWidth / renderedWidth, naturalHeight / renderedHeight);
    return Math.max(
      IMAGE_LIGHTBOX_MIN_ZOOM,
      Math.min(IMAGE_LIGHTBOX_MAX_ZOOM, nativePixelZoom),
    );
  }

  function updateImageLightboxTransform() {
    if (!activeLightbox) return;
    const lightbox = activeLightbox;
    const maxZoom = getImageLightboxMaxZoom(lightbox);
    if (lightbox.zoom > maxZoom) lightbox.zoom = maxZoom;
    if (lightbox.zoom <= IMAGE_LIGHTBOX_MIN_ZOOM) {
      lightbox.zoom = IMAGE_LIGHTBOX_MIN_ZOOM;
      lightbox.panX = 0;
      lightbox.panY = 0;
    } else {
      const bounds = getImageLightboxPanBounds(lightbox);
      lightbox.panX = clampImageLightboxValue(lightbox.panX, -bounds.x, bounds.x);
      lightbox.panY = clampImageLightboxValue(lightbox.panY, -bounds.y, bounds.y);
    }

    lightbox.image.style.transform = `translate3d(${lightbox.panX}px, ${lightbox.panY}px, 0) scale(${lightbox.zoom})`;
    lightbox.image.classList.toggle('is-zoomed', lightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM);
    lightbox.frame.classList.toggle('is-zoomed', lightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM);
    lightbox.zoomLevel.textContent = `${Math.round(lightbox.zoom * 100)}%`;
    lightbox.zoomOutButton.disabled = lightbox.zoom <= IMAGE_LIGHTBOX_MIN_ZOOM;
    lightbox.zoomResetButton.disabled = lightbox.zoom <= IMAGE_LIGHTBOX_MIN_ZOOM;
    lightbox.zoomInButton.disabled = lightbox.zoom >= maxZoom - IMAGE_LIGHTBOX_ZOOM_EPSILON;
  }

  function setImageLightboxZoom(nextZoom, event) {
    if (!activeLightbox) return;
    const lightbox = activeLightbox;
    const previousZoom = lightbox.zoom;
    lightbox.zoom = clampImageLightboxValue(nextZoom, IMAGE_LIGHTBOX_MIN_ZOOM, getImageLightboxMaxZoom(lightbox));

    if (event && lightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM && previousZoom > 0) {
      const frameRect = lightbox.frame.getBoundingClientRect();
      const offsetX = event.clientX - (frameRect.left + frameRect.width / 2);
      const offsetY = event.clientY - (frameRect.top + frameRect.height / 2);
      const zoomRatio = lightbox.zoom / previousZoom - 1;
      lightbox.panX -= offsetX * zoomRatio;
      lightbox.panY -= offsetY * zoomRatio;
    }

    updateImageLightboxTransform();
  }

  function getImageLightboxGesturePoints(lightbox) {
    return Array.from(lightbox?.gesturePointers?.values?.() || []);
  }

  function getImageLightboxGestureDistance(points) {
    if (!points || points.length < 2) return 0;
    return Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
  }

  function getImageLightboxGestureCenter(points) {
    if (!points || !points.length) return null;
    if (points.length === 1) return { clientX: points[0].clientX, clientY: points[0].clientY };
    return {
      clientX: (points[0].clientX + points[1].clientX) / 2,
      clientY: (points[0].clientY + points[1].clientY) / 2,
    };
  }

  function getImageLightboxTouchPoints(touches) {
    return Array.from(touches || []).map((touch) => ({
      clientX: touch.clientX,
      clientY: touch.clientY,
    }));
  }

  function startImageLightboxPinch(lightbox) {
    const points = getImageLightboxGesturePoints(lightbox);
    const distance = getImageLightboxGestureDistance(points);
    const center = getImageLightboxGestureCenter(points);
    if (!distance || !center) return;
    lightbox.pinch = {
      startDistance: distance,
      startZoom: lightbox.zoom,
      center,
    };
    lightbox.dragPointerId = null;
    lightbox.suppressClickUntil = Date.now() + 420;
    lightbox.image.classList.remove('is-dragging');
  }

  function updateImageLightboxPinch(lightbox) {
    if (!lightbox?.pinch) return false;
    const points = getImageLightboxGesturePoints(lightbox);
    if (points.length < 2) return false;
    const distance = getImageLightboxGestureDistance(points);
    const center = getImageLightboxGestureCenter(points);
    if (!distance || !center || !lightbox.pinch.startDistance) return false;
    const previousCenter = lightbox.pinch.center || center;
    if (lightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM) {
      lightbox.panX += center.clientX - previousCenter.clientX;
      lightbox.panY += center.clientY - previousCenter.clientY;
    }
    lightbox.pinch.center = center;
    setImageLightboxZoom(lightbox.pinch.startZoom * (distance / lightbox.pinch.startDistance), center);
    lightbox.suppressClickUntil = Date.now() + 420;
    return true;
  }

  function handleImageLightboxNaturalTap(event) {
    if (!activeLightbox || event.pointerType === 'mouse') return;
    const lightbox = activeLightbox;
    if (lightbox.pinch || lightbox.didDrag || lightbox.gesturePointers?.size) return;
    const now = Date.now();
    const previousTap = lightbox.lastTap;
    lightbox.lastTap = {
      at: now,
      x: event.clientX,
      y: event.clientY,
    };
    if (!previousTap) return;
    const elapsed = now - previousTap.at;
    const isSeededOpenTap = Boolean(previousTap.fromOpen);
    const distance = isSeededOpenTap
      ? 0
      : Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y);
    if (elapsed > (isSeededOpenTap ? 560 : 320) || distance > 42) return;
    event.preventDefault();
    lightbox.lastTap = null;
    lightbox.suppressClickUntil = now + 420;
    setImageLightboxZoom(lightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM ? IMAGE_LIGHTBOX_MIN_ZOOM : 2.6, event);
  }

  function captureImageLightboxPointer(frame, pointerId) {
    try {
      frame?.setPointerCapture?.(pointerId);
    } catch (_) {}
  }

  function resetImageLightboxZoom() {
    if (!activeLightbox) return;
    activeLightbox.zoom = IMAGE_LIGHTBOX_MIN_ZOOM;
    activeLightbox.panX = 0;
    activeLightbox.panY = 0;
    updateImageLightboxTransform();
  }

  function panImageLightbox(deltaX, deltaY) {
    if (!activeLightbox || activeLightbox.zoom <= IMAGE_LIGHTBOX_MIN_ZOOM) return;
    activeLightbox.panX += deltaX;
    activeLightbox.panY += deltaY;
    updateImageLightboxTransform();
  }

  function handleImageLightboxResize() {
    updateImageLightboxTransform();
  }

  function openImageLightbox(source, image, opener, event) {
    if (!source || !image) return;
    event?.preventDefault();

    closeImageLightbox({ restoreHistory: false, restoreFocus: false });

    const overlay = document.createElement('div');
    overlay.className = 'press-image-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', image.alt || 'Full image view');
    overlay.tabIndex = -1;

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'press-image-lightbox__back';
    backButton.textContent = 'Back to article';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'press-image-lightbox__close';
    closeButton.setAttribute('aria-label', 'Close full image view');
    closeButton.textContent = 'X';

    const zoomControls = document.createElement('div');
    zoomControls.className = 'press-image-lightbox__zoom';
    zoomControls.setAttribute('aria-label', 'Image zoom controls');

    const zoomOutButton = document.createElement('button');
    zoomOutButton.type = 'button';
    zoomOutButton.className = 'press-image-lightbox__zoom-button';
    zoomOutButton.setAttribute('aria-label', 'Zoom out');
    zoomOutButton.textContent = '-';

    const zoomResetButton = document.createElement('button');
    zoomResetButton.type = 'button';
    zoomResetButton.className = 'press-image-lightbox__zoom-reset';
    zoomResetButton.setAttribute('aria-label', 'Reset zoom');
    zoomResetButton.textContent = '100%';

    const zoomInButton = document.createElement('button');
    zoomInButton.type = 'button';
    zoomInButton.className = 'press-image-lightbox__zoom-button';
    zoomInButton.setAttribute('aria-label', 'Zoom in');
    zoomInButton.textContent = '+';

    const zoomLevel = document.createElement('span');
    zoomLevel.className = 'press-image-lightbox__zoom-level';
    zoomLevel.setAttribute('aria-live', 'polite');
    zoomLevel.textContent = '100%';

    zoomControls.append(zoomOutButton, zoomResetButton, zoomInButton, zoomLevel);

    const frame = document.createElement('div');
    frame.className = 'press-image-lightbox__frame';

    const fullImage = document.createElement('img');
    fullImage.className = 'press-image-lightbox__image';
    fullImage.src = source;
    fullImage.alt = image.alt || '';
    fullImage.decoding = 'async';
    fullImage.draggable = false;

    frame.appendChild(fullImage);
    overlay.append(backButton, closeButton, zoomControls, frame);
    document.body.appendChild(overlay);
    document.body.classList.add('press-image-lightbox-open');

    activeLightbox = {
      overlay,
      frame,
      image: fullImage,
      opener,
      zoomOutButton,
      zoomResetButton,
      zoomInButton,
      zoomLevel,
      zoom: IMAGE_LIGHTBOX_MIN_ZOOM,
      panX: 0,
      panY: 0,
      dragPointerId: null,
      dragX: 0,
      dragY: 0,
      didDrag: false,
      gesturePointers: new Map(),
      pinch: null,
      lastTap: null,
      suppressClickUntil: 0,
      historyPushed: false,
    };
    if (
      event
      && typeof event.clientX === 'number'
      && typeof event.clientY === 'number'
      && window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches
    ) {
      activeLightbox.lastTap = {
        at: Date.now(),
        x: event.clientX,
        y: event.clientY,
        fromOpen: true,
      };
    }

    try {
      window.history.pushState({ ...(window.history.state || {}), pressImageLightbox: true }, '', window.location.href);
      activeLightbox.historyPushed = true;
    } catch (_) {
      activeLightbox.historyPushed = false;
    }

    backButton.addEventListener('click', () => closeImageLightbox());
    closeButton.addEventListener('click', () => closeImageLightbox());
    zoomOutButton.addEventListener('click', () => setImageLightboxZoom(activeLightbox.zoom - IMAGE_LIGHTBOX_ZOOM_STEP));
    zoomResetButton.addEventListener('click', () => resetImageLightboxZoom());
    zoomInButton.addEventListener('click', () => setImageLightboxZoom(activeLightbox.zoom + IMAGE_LIGHTBOX_ZOOM_STEP));
    frame.addEventListener('wheel', (wheelEvent) => {
      wheelEvent.preventDefault();
      const direction = wheelEvent.deltaY < 0 ? 1 : -1;
      setImageLightboxZoom(activeLightbox.zoom + direction * IMAGE_LIGHTBOX_ZOOM_STEP, wheelEvent);
    }, { passive: false });
    fullImage.addEventListener('dblclick', (dblClickEvent) => {
      dblClickEvent.preventDefault();
      setImageLightboxZoom(activeLightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM ? IMAGE_LIGHTBOX_MIN_ZOOM : 2.5, dblClickEvent);
    });
    frame.addEventListener('pointerdown', (pointerEvent) => {
      if (!activeLightbox) return;
      if (pointerEvent.pointerType !== 'mouse') {
        activeLightbox.gesturePointers.set(pointerEvent.pointerId, {
          clientX: pointerEvent.clientX,
          clientY: pointerEvent.clientY,
        });
        captureImageLightboxPointer(frame, pointerEvent.pointerId);
        if (activeLightbox.gesturePointers.size >= 2) {
          pointerEvent.preventDefault();
          startImageLightboxPinch(activeLightbox);
          return;
        }
      }
      if (activeLightbox.zoom <= IMAGE_LIGHTBOX_MIN_ZOOM) return;
      pointerEvent.preventDefault();
      activeLightbox.dragPointerId = pointerEvent.pointerId;
      activeLightbox.dragX = pointerEvent.clientX;
      activeLightbox.dragY = pointerEvent.clientY;
      activeLightbox.didDrag = false;
      captureImageLightboxPointer(frame, pointerEvent.pointerId);
      fullImage.classList.add('is-dragging');
    });
    frame.addEventListener('pointermove', (pointerEvent) => {
      if (!activeLightbox) return;
      if (activeLightbox.gesturePointers.has(pointerEvent.pointerId)) {
        activeLightbox.gesturePointers.set(pointerEvent.pointerId, {
          clientX: pointerEvent.clientX,
          clientY: pointerEvent.clientY,
        });
        if (activeLightbox.pinch && updateImageLightboxPinch(activeLightbox)) {
          pointerEvent.preventDefault();
          return;
        }
      }
      if (activeLightbox.dragPointerId !== pointerEvent.pointerId) return;
      pointerEvent.preventDefault();
      if (Math.hypot(pointerEvent.clientX - activeLightbox.dragX, pointerEvent.clientY - activeLightbox.dragY) > 3) {
        activeLightbox.didDrag = true;
        activeLightbox.suppressClickUntil = Date.now() + 240;
      }
      panImageLightbox(pointerEvent.clientX - activeLightbox.dragX, pointerEvent.clientY - activeLightbox.dragY);
      activeLightbox.dragX = pointerEvent.clientX;
      activeLightbox.dragY = pointerEvent.clientY;
    });
    const stopDrag = (pointerEvent) => {
      if (!activeLightbox) return;
      activeLightbox.gesturePointers.delete(pointerEvent.pointerId);
      if (activeLightbox.gesturePointers.size < 2) activeLightbox.pinch = null;
      if (activeLightbox.dragPointerId === pointerEvent.pointerId) {
        activeLightbox.dragPointerId = null;
        fullImage.classList.remove('is-dragging');
      }
      if (pointerEvent.target === fullImage) handleImageLightboxNaturalTap(pointerEvent);
    };
    frame.addEventListener('pointerup', stopDrag);
    frame.addEventListener('pointercancel', stopDrag);
    frame.addEventListener('touchstart', (touchEvent) => {
      if (!activeLightbox || touchEvent.touches.length < 2) return;
      touchEvent.preventDefault();
      const points = getImageLightboxTouchPoints(touchEvent.touches);
      const distance = getImageLightboxGestureDistance(points);
      const center = getImageLightboxGestureCenter(points);
      if (!distance || !center) return;
      activeLightbox.pinch = {
        startDistance: distance,
        startZoom: activeLightbox.zoom,
        center,
      };
      activeLightbox.dragPointerId = null;
      activeLightbox.suppressClickUntil = Date.now() + 420;
      fullImage.classList.remove('is-dragging');
    }, { passive: false });
    frame.addEventListener('touchmove', (touchEvent) => {
      if (!activeLightbox?.pinch || touchEvent.touches.length < 2) return;
      touchEvent.preventDefault();
      const points = getImageLightboxTouchPoints(touchEvent.touches);
      const distance = getImageLightboxGestureDistance(points);
      const center = getImageLightboxGestureCenter(points);
      if (!distance || !center || !activeLightbox.pinch.startDistance) return;
      const previousCenter = activeLightbox.pinch.center || center;
      if (activeLightbox.zoom > IMAGE_LIGHTBOX_MIN_ZOOM) {
        activeLightbox.panX += center.clientX - previousCenter.clientX;
        activeLightbox.panY += center.clientY - previousCenter.clientY;
      }
      activeLightbox.pinch.center = center;
      setImageLightboxZoom(activeLightbox.pinch.startZoom * (distance / activeLightbox.pinch.startDistance), center);
      activeLightbox.suppressClickUntil = Date.now() + 420;
    }, { passive: false });
    frame.addEventListener('touchend', (touchEvent) => {
      if (!activeLightbox) return;
      const wasPinching = Boolean(activeLightbox.pinch);
      if (touchEvent.touches.length < 2) activeLightbox.pinch = null;
      if (wasPinching) {
        activeLightbox.suppressClickUntil = Date.now() + 420;
        return;
      }
      if (touchEvent.changedTouches.length !== 1 || touchEvent.touches.length) return;
      const touch = touchEvent.changedTouches[0];
      handleImageLightboxNaturalTap({
        pointerType: 'touch',
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => touchEvent.preventDefault(),
      });
    }, { passive: false });
    overlay.addEventListener('click', (clickEvent) => {
      if (Date.now() < (activeLightbox?.suppressClickUntil || 0)) {
        clickEvent.preventDefault();
        return;
      }
      if (
        clickEvent.target === overlay ||
        (clickEvent.target === frame && activeLightbox?.zoom <= IMAGE_LIGHTBOX_MIN_ZOOM)
      ) {
        closeImageLightbox();
      }
    });
    fullImage.addEventListener('load', () => updateImageLightboxTransform(), { once: true });
    window.addEventListener('resize', handleImageLightboxResize);
    updateImageLightboxTransform();
    overlay.focus({ preventScroll: true });
  }

  function openLinkedImageLightbox(link, event) {
    if (!link) return;
    const image = link.querySelector('img');
    if (!image) return;
    openImageLightbox(link.href, image, link, event);
  }

  function shouldEnhanceArticleImage(image) {
    if (!image || image.closest(IMAGE_LINK_SELECTOR)) return false;
    if (image.closest('a[href], button, [role="button"]')) return false;
    return Boolean(getImageLightboxSource(image));
  }

  function enhanceArticleImageZoom() {
    document.querySelectorAll(ARTICLE_IMAGE_SELECTOR).forEach((image) => {
      if (!shouldEnhanceArticleImage(image)) return;
      image.dataset.pressImageZoom = 'true';
      image.setAttribute('role', 'button');
      image.setAttribute('tabindex', image.getAttribute('tabindex') || '0');
      image.setAttribute('aria-label', image.alt ? `Open full-size image: ${image.alt}` : 'Open full-size image');
    });
  }

  function closeImageLightbox(options = {}) {
    const { restoreHistory = true, restoreFocus = true } = options;
    if (!activeLightbox) return;
    const { overlay, opener, historyPushed } = activeLightbox;
    activeLightbox = null;
    window.removeEventListener('resize', handleImageLightboxResize);
    overlay.remove();
    document.body.classList.remove('press-image-lightbox-open');
    if (restoreFocus) opener?.focus?.({ preventScroll: true });
    if (restoreHistory && historyPushed && window.history.state?.pressImageLightbox) {
      window.history.back();
    }
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.(IMAGE_LINK_SELECTOR);
    if (link) {
      openLinkedImageLightbox(link, event);
      return;
    }

    const image = event.target.closest?.(ARTICLE_IMAGE_SELECTOR);
    if (!image || image.dataset.pressImageZoom !== 'true') return;
    openImageLightbox(getImageLightboxSource(image), image, image, event);
  });

  document.addEventListener('keydown', (event) => {
    if (!activeLightbox) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const image = event.target?.matches?.(ARTICLE_IMAGE_SELECTOR) ? event.target : null;
      if (!image || image.dataset.pressImageZoom !== 'true') return;
      event.preventDefault();
      openImageLightbox(getImageLightboxSource(image), image, image, event);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeImageLightbox();
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setImageLightboxZoom(activeLightbox.zoom + IMAGE_LIGHTBOX_ZOOM_STEP);
      return;
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setImageLightboxZoom(activeLightbox.zoom - IMAGE_LIGHTBOX_ZOOM_STEP);
      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      resetImageLightboxZoom();
      return;
    }

    const panStep = event.shiftKey ? 120 : 48;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      panImageLightbox(panStep, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      panImageLightbox(-panStep, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      panImageLightbox(0, panStep);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      panImageLightbox(0, -panStep);
    }
  });

  window.addEventListener('resize', () => updateImageLightboxTransform());

  window.addEventListener('popstate', () => {
    if (activeLightbox) closeImageLightbox({ restoreHistory: false });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceArticleImageZoom, { once: true });
  } else {
    enhanceArticleImageZoom();
  }
})();

(() => {
  const CHART_EXPAND_SELECTOR = '[data-chart-expand]';
  let activeChartLightbox = null;

  function openChartLightbox(button, event) {
    const selector = button?.getAttribute('data-chart-expand');
    const figure = selector ? document.querySelector(selector) : null;
    const visual = figure?.querySelector('.drone-data-graphic__visual');
    if (!figure || !visual) return;
    event?.preventDefault();

    closeChartLightbox({ restoreFocus: false });

    const overlay = document.createElement('div');
    overlay.className = 'press-chart-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Expanded chart view');
    overlay.tabIndex = -1;

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'press-chart-lightbox__back';
    backButton.textContent = 'Back to article';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'press-chart-lightbox__close';
    closeButton.setAttribute('aria-label', 'Close expanded chart');
    closeButton.textContent = 'X';

    const frame = document.createElement('div');
    frame.className = 'press-chart-lightbox__frame';

    const expandedFigure = document.createElement('figure');
    expandedFigure.className = figure.className;
    expandedFigure.classList.add('press-chart-lightbox__figure');

    const visualClone = visual.cloneNode(true);
    visualClone.classList.add('press-chart-lightbox__visual');
    visualClone.removeAttribute('href');
    visualClone.removeAttribute('target');
    visualClone.removeAttribute('rel');
    visualClone.removeAttribute('aria-label');

    const caption = figure.querySelector('figcaption')?.cloneNode(true);
    caption?.querySelectorAll(CHART_EXPAND_SELECTOR).forEach((node) => node.remove());

    expandedFigure.appendChild(visualClone);
    if (caption) expandedFigure.appendChild(caption);
    frame.appendChild(expandedFigure);
    overlay.append(backButton, closeButton, frame);
    document.body.appendChild(overlay);
    document.body.classList.add('press-image-lightbox-open');

    activeChartLightbox = { overlay, opener: button };

    backButton.addEventListener('click', () => closeChartLightbox());
    closeButton.addEventListener('click', () => closeChartLightbox());
    overlay.addEventListener('click', (clickEvent) => {
      if (clickEvent.target === overlay) closeChartLightbox();
    });
    overlay.focus({ preventScroll: true });
  }

  function closeChartLightbox(options = {}) {
    const { restoreFocus = true } = options;
    if (!activeChartLightbox) return;
    const { overlay, opener } = activeChartLightbox;
    activeChartLightbox = null;
    overlay.remove();
    document.body.classList.remove('press-image-lightbox-open');
    if (restoreFocus) opener?.focus?.({ preventScroll: true });
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.(CHART_EXPAND_SELECTOR);
    if (!button) return;
    openChartLightbox(button, event);
  });

  document.addEventListener('keydown', (event) => {
    if (!activeChartLightbox) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeChartLightbox();
    }
  });
})();

(() => {
  const NOTE_LINK_SELECTOR = '.source-notes li[id] > a[href], .source-list li[id] > a[href]';
  const INLINE_SOURCE_SELECTOR = '.source-ref a[href^="#source-"]';
  const DIRECT_SOURCE_SELECTOR = [
    '.drone-source-chips a[href^="#source-"]',
    '.drone-data-graphic__visual[href^="#source-"]',
  ].join(', ');
  const SOURCE_RAIL_LINK_SELECTOR = [
    '.drone-social-feature .press-static-post > a[href]',
    '.article-rail-gallery__card[href]',
    '.press-static-post__source a[href^="#source-"]',
  ].join(', ');

  function isExternalSourceHref(href) {
    return /^https?:\/\//i.test(String(href || ''));
  }

  function applyExternalSourceLink(link, source, options = {}) {
    if (!link || !source?.href) return;
    link.setAttribute('href', source.href);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('data-source-external', 'true');
    if (source.label) link.setAttribute('aria-label', `Open source: ${source.label}`);
    if (options.relabel && !link.querySelector('img')) {
      link.textContent = 'Open source site';
    }
  }

  function enhanceArticleSourceLinks() {
    const sourceMap = new Map();

    document.querySelectorAll(NOTE_LINK_SELECTOR).forEach((link, index) => {
      const note = link.closest('li[id]');
      const href = link.getAttribute('href');
      if (!note?.id || !href || href.startsWith('#')) return;

      sourceMap.set(note.id, {
        href,
        label: link.textContent.trim(),
        number: index + 1,
      });

      applyExternalSourceLink(link, sourceMap.get(note.id));
    });

    document.querySelectorAll(INLINE_SOURCE_SELECTOR).forEach((link) => {
      const id = (link.getAttribute('href') || '').slice(1);
      const source = sourceMap.get(id);
      if (source?.number) {
        link.textContent = `[${source.number}]`;
        link.dataset.sourceNumber = String(source.number);
        link.title = source.label ? `Source ${source.number}: ${source.label}` : `Source ${source.number}`;
        link.setAttribute('aria-label', source.label ? `Source ${source.number}: ${source.label}` : `Source ${source.number}`);
      }
    });

    document.querySelectorAll(DIRECT_SOURCE_SELECTOR).forEach((link) => {
      const id = (link.getAttribute('href') || '').slice(1);
      const source = sourceMap.get(id);
      applyExternalSourceLink(link, source);
    });

    document.querySelectorAll(SOURCE_RAIL_LINK_SELECTOR).forEach((link) => {
      const href = link.getAttribute('href') || '';
      const source = href.startsWith('#source-')
        ? sourceMap.get(href.slice(1))
        : (isExternalSourceHref(href) ? { href, label: link.textContent.trim() } : null);
      const relabel = link.matches('.drone-social-feature .press-static-post > a[href], .article-rail-gallery__card[href]');
      applyExternalSourceLink(link, source, { relabel });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceArticleSourceLinks, { once: true });
  } else {
    enhanceArticleSourceLinks();
  }

})();

(() => {

  const BODY_CLASS = 'page-section';

  const GRID_SELECTOR = [

    '.page-section .cards-grid--archive',

    '.page-section .cards-grid',

    '.cards-grid--archive',

    '.cards-grid'

  ].join(', ');

  const CARD_SELECTOR = '.story-card, .archive-card';

  const DAILY_SECTION_SELECTOR = [

    '.daily-section-feed',

    '.daily-home-section',

    '[data-daily-section-feed]',

    '[data-daily-feed]',

    '[data-live-feed]'

  ].join(', ');

  let preservedCards = [];

  let preservedKeys = new Set();

  let observer = null;

  let restoreQueued = false;

  let isRestoring = false;

  function isSectionPage() {

    return document.body && document.body.classList.contains(BODY_CLASS);

  }

  function normalizeHref(href) {

    return String(href || '')

      .trim()

      .replace(/^https?:\/\/[^/]+\//i, '')

      .replace(/^\/+/, '')

      .replace(/[?#].*$/, '')

      .toLowerCase();

  }

  function normalizeText(text) {

    return String(text || '')

      .trim()

      .replace(/\s+/g, ' ')

      .toLowerCase();

  }

  function cardKey(card) {

    if (!card) return '';

    const link = card.querySelector('a[href]');

    const href = normalizeHref(link && link.getAttribute('href'));

    if (href) return `url:${href}`;

    const heading = card.querySelector('h1, h2, h3, .story-card__title, .archive-card__title');

    const title = normalizeText(heading ? heading.textContent : card.textContent);

    return title ? `title:${title}` : '';

  }

  function isDailyGrid(grid) {

    return Boolean(grid && grid.closest(DAILY_SECTION_SELECTOR));

  }

  function findBestCategoryGrid() {

    const grids = Array.from(document.querySelectorAll(GRID_SELECTOR));

    if (!grids.length) return null;

    const nonDailyWithCards = grids.find((grid) => {

      return !isDailyGrid(grid) && grid.querySelector(CARD_SELECTOR);

    });

    if (nonDailyWithCards) return nonDailyWithCards;

    const archiveGrid = grids.find((grid) => {

      return !isDailyGrid(grid) && grid.classList.contains('cards-grid--archive');

    });

    if (archiveGrid) return archiveGrid;

    return grids.find((grid) => !isDailyGrid(grid)) || null;

  }

  function saveOriginalCards() {

    if (!isSectionPage()) return;

    const grid = findBestCategoryGrid();

    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(CARD_SELECTOR));

    if (!cards.length) return;

    preservedCards = cards.map((card) => card.cloneNode(true));

    preservedKeys = new Set(

      preservedCards

        .map(cardKey)

        .filter(Boolean)

    );

    grid.setAttribute('data-press-preserved-category-grid', 'true');

  }

  function makeCardsClickableAgain(scope) {

    if (!scope) return;

    scope.querySelectorAll('.link-list__item, .related-card, .story-card, .archive-card, .river-item, .lead-panel').forEach((card) => {

      if (card.dataset.pressPreserveClickBound === 'true') return;

      const link = card.querySelector('a[href]');

      if (!link) return;

      card.dataset.pressPreserveClickBound = 'true';

      card.classList.add('is-clickable');

      card.setAttribute('tabindex', '0');

      card.setAttribute('role', 'link');

      card.addEventListener('click', (event) => {

        if (event.target.closest('a, button, label') || pressIsEditableTarget(event.target)) return;

        window.location.href = link.href;

      });

      card.addEventListener('keydown', (event) => {

        if (pressIsEditableTarget(event.target)) return;
        if (event.key === 'Enter' || event.key === ' ') {

          event.preventDefault();

          link.click();

        }

      });

    });

  }

  function bindImageFallbacksAgain(scope) {

    if (!scope) return;

    scope.querySelectorAll('img').forEach((img) => {

      if (img.dataset.pressPreserveFallbackBound === 'true') return;

      img.dataset.pressPreserveFallbackBound = 'true';

      img.addEventListener('error', () => {

        const holder = img.closest(

          '.story-card__image, .lead-panel__media, .river-item__media, .archive-card__image, figure, .card-media'

        );

        if (holder) {

          holder.classList.add('is-hidden');

        } else {

          img.style.display = 'none';

        }

      });

    });

  }

  function restoreMissingCards() {

    if (!isSectionPage()) return;

    if (!preservedCards.length) return;

    const grid = findBestCategoryGrid();

    if (!grid) return;

    isRestoring = true;

    const currentCards = Array.from(grid.querySelectorAll(CARD_SELECTOR));

    const currentKeys = new Set(

      currentCards

        .map(cardKey)

        .filter(Boolean)

    );

    const missingCards = preservedCards.filter((card) => {

      const key = cardKey(card);

      return key && !currentKeys.has(key);

    });

    if (missingCards.length) {

      const fragment = document.createDocumentFragment();

      missingCards.forEach((card) => {

        const clone = card.cloneNode(true);

        clone.setAttribute('data-press-restored-old-article', 'true');

        fragment.appendChild(clone);

      });

      grid.appendChild(fragment);

    }

    grid.setAttribute('data-press-preserved-category-grid', 'true');

    makeCardsClickableAgain(grid);

    bindImageFallbacksAgain(grid);

    const releaseRestore = () => {

      isRestoring = false;

    };

    if (window.queueMicrotask) {
      window.queueMicrotask(releaseRestore);
    } else {
      window.setTimeout(releaseRestore, 0);
    }

  }

  function queueRestore() {

    if (restoreQueued || isRestoring) return;

    restoreQueued = true;

    const runRestore = () => {

      restoreQueued = false;

      restoreMissingCards();

    };

    if (window.queueMicrotask) {
      window.queueMicrotask(runRestore);
    } else {
      window.requestAnimationFrame(runRestore);
    }

  }

  function startObserver() {

    if (!isSectionPage()) return;

    if (observer) return;

    const grid = findBestCategoryGrid();

    if (!grid) return;

    observer = new MutationObserver(() => {

      if (!isRestoring) queueRestore();

    });

    observer.observe(grid, {

      childList: true,

      subtree: true

    });

  }

  function bootPreservationGuard() {

    if (!isSectionPage()) return;

    saveOriginalCards();

    restoreMissingCards();

    startObserver();

    window.setTimeout(restoreMissingCards, 90);

  }

  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', bootPreservationGuard, { once: true });

  } else {

    bootPreservationGuard();

  }

})();
(() => {
  const AUTHOR_LABEL = 'By The Press';
  const SEARCH_EMPTY = '<div class="search-empty"><p>Start typing to search the full edition.</p></div>';
  const SEARCH_NONE = '<div class="search-empty"><p>No stories matched that search yet.</p></div>';
  let storyIndexPromise = null;

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-year]').forEach((node) => {
      node.textContent = new Date().getFullYear();
    });

    ensureHeaderControls();
    ensureMastheadTicker();
    ensureLiveClock();
    setupOnThisDayHistory();
    setupMenu();
    setupSearch();
    setupReadingProgress();
    setupLeadPanels();
    setupArchiveFilters();
    setupNewsletterForms();
    normalizeVisibleBylines(document);
    makeCardsClickable();
    makePressSocialCardsClickable(document);
    bindThumbnailFallbacks(document);
    rewriteAuthorsPage();
    relabelUtilityNav();
    prettifySourceLinks(document);
    addInlineSourceMarkers(document);
    setupArticleTrustTools();
    extendSectionNavigation();
    setupDarkMode();
    injectShareButtons();
    injectBelowFoldFlipperStoryButtons();
    setupShareButtonRefresh();
    bindSourceNoteExternalLinks(document);
    applyDailyCardHover();

    runWhenIdle(() => {
      loadStoryIndex().then((stories) => {
        enhanceBreakingStrip(stories);
        renderMastheadTicker(stories);
        injectEditionRadar(stories);
        if (!document.body.classList.contains('page-home')) {
          pressRefreshHomepageStoryBlocks(stories);
        }
        renderSectionPage(stories);
        renderDynamicCategoryPages(stories);
        const hasHomepageTargets =
    document.querySelector('.lead-switcher__panels') ||
    document.querySelector('.home-grid__main .cards-grid.cards-grid--three') ||
    document.querySelector('.latest-section .river');

  if (!hasHomepageTargets) {
    hydrateMissingCardImages();
  }
      });
    });
  });

  function runWhenIdle(callback) {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(callback, { timeout: 2500 });
    } else {
      window.setTimeout(callback, 900);
    }
  }

  function loadStoryIndex() {
  if (storyIndexPromise) return storyIndexPromise;
  if (window.__pressStoryIndexPromise) {
    storyIndexPromise = window.__pressStoryIndexPromise;
    return storyIndexPromise;
  }

  const normalizePayload = (data) => {
    if (Array.isArray(data)) return normalizeStoryArray(data);
    if (data && Array.isArray(data.stories)) return normalizeStoryArray(data.stories);
    if (data && Array.isArray(data.articles)) return normalizeStoryArray(data.articles);
    if (data && Array.isArray(data.items)) return normalizeStoryArray(data.items);
    return [];
  };

  const fetchJson = (url) =>
    fetch(pressSiteAssetUrl(url), { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error(`Could not load ${url}`);
      return response.json();
    });

  storyIndexPromise = fetchJson('live-index.json')
    .catch(() => fetchJson('content-index.json'))
    .catch(() => fetchJson('search-index.json'))
    .then(normalizePayload)
    .catch(() => {
      const embedded = document.getElementById('press-search-data');

      if (embedded) {
        try {
          return normalizePayload(JSON.parse(embedded.textContent));
        } catch (_) {
          return [];
        }
      }

      return [];
    });
  window.__pressStoryIndexPromise = storyIndexPromise;

  return storyIndexPromise;
}

  function normalizeStoryArray(data) {
    const items = Array.isArray(data) ? data.slice() : [];
    return items.filter((item) => !pressIsBelowFoldIndexItem(item)).map((item) => ({
      title: item.title || '',
      section: normalizeSectionLabel(item.section || ''),
      type: item.type || 'Report',
      dek: item.dek || item.summary || '',
      summary: item.summary || item.dek || '',
      url: item.url || '#',
      published: item.published || '',
      keywords: Array.isArray(item.keywords) ? item.keywords : [],
      image: item.image || item.thumbnail || item.photo || '',
      imageAlt: item.imageAlt || item.alt || item.photoAlt || '',
      sourceLabel: item.sourceLabel || '',
      sortValue: parsePublished(item.published || ''),
    })).sort((a, b) => b.sortValue - a.sortValue);
  }

  function parsePublished(value) {
    const text = String(value || '').replace(/•/g, ' ').replace(/\ba\.m\./gi, 'AM').replace(/\bp\.m\./gi, 'PM').replace(/\bEDT\b|\bEST\b|\bUTC\b/gi, '').trim();
    const time = Date.parse(text);
    return Number.isFinite(time) ? time : 0;
  }

  function setupMenu() {
    const siteHeader = document.querySelector('[data-site-header]');
    const menuToggle = document.querySelector('[data-menu-toggle]');
    function setMenu(open) {
      if (!siteHeader || !menuToggle) return;
      siteHeader.classList.toggle('is-menu-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.textContent = open ? 'Close' : 'Menu';
    }
    if (!menuToggle || !siteHeader) return;
    menuToggle.addEventListener('click', () => {
      setMenu(!siteHeader.classList.contains('is-menu-open'));
    });
    siteHeader.querySelectorAll('.utility-nav a, .section-nav a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 700) setMenu(false);
    });
  }

  function ensureHeaderControls() {
    const siteHeader = document.querySelector('[data-site-header]');
    const mastheadRow = siteHeader?.querySelector('.masthead-row');

    if (!siteHeader || !mastheadRow) return;

    let actions = mastheadRow.querySelector('.masthead-actions');
    const utilityNav = mastheadRow.querySelector('.utility-nav') || siteHeader.querySelector('.utility-nav');

    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'masthead-actions';
      mastheadRow.appendChild(actions);
    }

    if (utilityNav && utilityNav.parentElement !== actions) {
      actions.appendChild(utilityNav);
    }

    let controls = actions.querySelector('.header-controls');

    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'header-controls';
      actions.appendChild(controls);
    }

    const themeToggle = siteHeader.querySelector('[data-theme-toggle]') || document.createElement('button');
    themeToggle.classList.add('theme-toggle');
    themeToggle.type = 'button';
    themeToggle.setAttribute('data-theme-toggle', '');
    themeToggle.setAttribute('title', 'Toggle dark/light mode');
    if (!themeToggle.textContent.trim()) themeToggle.textContent = '☀︎';

    const searchButton = siteHeader.querySelector('[data-search-open]') || document.createElement('button');
    searchButton.classList.add('search-trigger');
    searchButton.type = 'button';
    searchButton.setAttribute('data-search-open', '');
    searchButton.setAttribute('aria-label', 'Search');
    searchButton.setAttribute('title', 'Search');
    searchButton.innerHTML = '<svg class="search-trigger__icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l5 5"></path></svg><span class="sr-only">Search</span>';

    const menuButton = siteHeader.querySelector('[data-menu-toggle]');

    controls.appendChild(themeToggle);
    controls.appendChild(searchButton);

    if (menuButton && menuButton.parentElement !== controls) {
      controls.appendChild(menuButton);
    }

    siteHeader.querySelectorAll('[data-reader-mode-toggle]').forEach((button) => button.remove());
    siteHeader.querySelector('.topbar')?.remove();
  }

  function ensureMastheadTicker() {
    const siteHeader = document.querySelector('[data-site-header]');
    const mastheadRow = siteHeader?.querySelector('.masthead-row');
    const wrap = mastheadRow?.querySelector('.masthead-wrap');

    if (!siteHeader || !mastheadRow || !wrap) return;

    siteHeader.querySelectorAll('.masthead-tagline').forEach((tagline) => tagline.remove());

    let ticker = mastheadRow.querySelector('.masthead-ticker');

    if (!ticker) {
      ticker = wrap.querySelector('.masthead-ticker') || document.createElement('div');
      ticker.className = 'masthead-ticker';
      ticker.setAttribute('aria-label', 'Latest headlines');
      ticker.innerHTML = '<div class="masthead-ticker__items" data-masthead-ticker></div>';
    }

    if (ticker.parentElement !== mastheadRow) {
      mastheadRow.appendChild(ticker);
    }
  }

  const HISTORY_PALETTES = {
    archive: {
      bg: '#f6efe2',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#9d3a2d',
      second: '#2f6f73',
      third: '#d89b37',
      muted: '#d8cbbb',
    },
    civic: {
      bg: '#edf1ea',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#9d3a2d',
      second: '#315f7c',
      third: '#d6a83d',
      muted: '#c9d2c5',
    },
    dispatch: {
      bg: '#f1eadf',
      paper: '#fff8ec',
      ink: '#1f1f1b',
      accent: '#8f2f28',
      second: '#596b5d',
      third: '#d79a33',
      muted: '#d5c2ad',
    },
    laboratory: {
      bg: '#eaf3f1',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#287c7a',
      second: '#8f3b47',
      third: '#d4a13b',
      muted: '#c8d8d4',
    },
    lunar: {
      bg: '#e9edf4',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#314f8f',
      second: '#9d3a2d',
      third: '#d3a23d',
      muted: '#c8d0de',
    },
    'public-square': {
      bg: '#f2eadb',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#8f3c2f',
      second: '#2f6d68',
      third: '#d39b3a',
      muted: '#d9c9b2',
    },
    stage: {
      bg: '#ece7f0',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#7a3f8f',
      second: '#9d3a2d',
      third: '#d6a33d',
      muted: '#d4c7da',
    },
    voyage: {
      bg: '#e9f0ed',
      paper: '#fffdf9',
      ink: '#1f1f1b',
      accent: '#2f6f73',
      second: '#405a90',
      third: '#d09235',
      muted: '#c6d2cd',
    },
  };
  function ensureLiveClock() {
    const siteHeader = document.querySelector('[data-site-header]');
    const mastheadRow = siteHeader?.querySelector('.masthead-row');
    const ticker = mastheadRow?.querySelector('.masthead-ticker');

    if (!siteHeader || !mastheadRow) return;

    let clock = siteHeader.querySelector('[data-live-clock]');

    if (!clock) {
      clock = document.createElement('aside');
      clock.className = 'press-live-clock';
      clock.setAttribute('data-live-clock', '');
      clock.setAttribute('aria-label', 'Current local date');
    }
    clock.dataset.clockStyle = 'date';

    if (!clock.querySelector('[data-live-clock-date]') || clock.querySelector('[data-live-clock-time]') || clock.querySelector('.press-live-clock__separator') || clock.querySelector('.press-live-clock__dial')) {
      clock.innerHTML = `
        <time class="press-live-clock__date" data-live-clock-date></time>
      `;
    }

    if (clock.parentElement !== mastheadRow || clock.nextElementSibling !== ticker) {
      mastheadRow.insertBefore(clock, ticker || null);
    }

    if (clock.dataset.liveClockReady === 'true') return;
    clock.dataset.liveClockReady = 'true';

    const dateNode = clock.querySelector('[data-live-clock-date]');
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    let currentDayKey = '';
    let rolloverTimer = 0;

    const refreshDate = () => {
      const now = new Date();
      const nextDayKey = localDateKey(now);

      if (dateNode) {
        dateNode.dateTime = nextDayKey;
        dateNode.textContent = dateFormatter.format(now);
      }

      if (currentDayKey && currentDayKey !== nextDayKey) {
        window.dispatchEvent(new CustomEvent('press:calendar-day-change', {
          detail: { date: now, dateKey: nextDayKey },
        }));
      }

      currentDayKey = nextDayKey;
      return now;
    };

    const scheduleDateRollover = () => {
      window.clearTimeout(rolloverTimer);
      const now = refreshDate();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      rolloverTimer = window.setTimeout(scheduleDateRollover, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };

    scheduleDateRollover();
    window.addEventListener('focus', refreshDate);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshDate();
    });
  }

  function setupOnThisDayHistory() {
    if (!document.body.classList.contains('page-home')) return;

    const section = ensureOnThisDaySection();
    if (!section || section.dataset.historyReady === 'true') return;

    section.dataset.historyReady = 'true';

    let rolloverTimer = 0;
    const render = (event) => renderOnThisDay(section, event?.detail?.date instanceof Date ? event.detail.date : new Date());
    const scheduleRollover = () => {
      window.clearTimeout(rolloverTimer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      rolloverTimer = window.setTimeout(() => {
        render();
        scheduleRollover();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };
    const renderAndReschedule = (event) => {
      render(event);
      scheduleRollover();
    };

    section.addEventListener('click', (event) => {
      const card = event.target.closest?.('[data-history-card-link]');
      if (!card || !section.contains(card) || event.target.closest?.('a, button, input, select, textarea')) return;
      openHistoryDetailCard(card);
    });
    section.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest?.('[data-history-card-link]');
      if (!card || !section.contains(card)) return;
      event.preventDefault();
      openHistoryDetailCard(card);
    });

    render();
    scheduleRollover();
    window.addEventListener('press:calendar-day-change', renderAndReschedule);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderAndReschedule();
    });
  }

  const historyExtraNotes = {
    '06-06': "More than 150,000 Allied troops crossed the English Channel that day, with airborne landings, naval bombardment, and beach assaults spread across five Normandy landing areas.",
    '01-16': "Carol Channing led the original Broadway cast, and Jerry Herman wrote the music and lyrics for the production.",
    '02-08': "Johnson fell one electoral vote short after Virginia's electors refused to support him, sending the decision to the Senate.",
    '02-14': "Its first video, \"Me at the zoo,\" was uploaded in April 2005, and Google bought the company the next year.",
    '02-19': "Officials later said prison staff had opened doors and helped cartel-linked inmates escape.",
    '02-22': "The game came during the medal round; the United States still had to beat Finland to win gold.",
    '03-02': "Chamberlain also made 28 free throws that night while playing every minute of the game.",
    '03-14': "W. S. Gilbert wrote the libretto, and Arthur Sullivan composed the music for the Savoy Theatre production.",
    '04-02': "The film was developed with Arthur C. Clarke, who also wrote the companion novel released after the premiere.",
    '04-13': "The Island Records release introduced the Wailers to a wider international rock audience.",
    '04-28': "Released in 1973, the record used studio effects, spoken-word fragments, and continuous transitions between tracks.",
    '05-03': "The images helped push the Kennedy administration toward federal civil rights legislation later that year.",
    '05-13': "Salvador Sobral's sister wrote the song, which won with a then-record Eurovision points total.",
    '05-21': "The flight lasted more than 33 hours and ended at Le Bourget, where a huge crowd met Lindbergh.",
    '05-26': "Between May 26 and June 4, Operation Dynamo evacuated more than 338,000 Allied troops from Dunkirk's beaches and harbor.",
    '06-04': "Troops and tanks moved into central Beijing after weeks of student-led demonstrations in Tiananmen Square.",
    '06-11': "Governor George Wallace stood at the schoolhouse door before federalized National Guard troops enforced enrollment.",
    '06-14': "The French government had already left Paris, and the city was declared open to avoid street fighting.",
    '06-16': "Valentina Tereshkova orbited Earth 48 times aboard Vostok 6 over nearly three days.",
    '06-17': "The arrests eventually led to Senate hearings, taped Oval Office evidence, and Richard Nixon's resignation.",
    '06-18': "The battle ended Napoleon's Hundred Days and sent him into final exile on Saint Helena.",
    '06-26': "Bloomsbury printed only about 500 hardback copies in the first United Kingdom run.",
    '07-02': "The law barred discrimination in public accommodations and employment and strengthened federal enforcement of school desegregation.",
    '07-05': "Scientists announced Dolly publicly in February 1997 after keeping the birth quiet for months while confirming the result.",
    '07-08': "Atlantis flew the STS-135 mission, carrying supplies to the International Space Station.",
    '07-12': "France beat Brazil 3-0 at Stade de France, with Zinedine Zidane scoring twice from headers.",
    '07-15': "Nintendo launched the console in Japan with Donkey Kong, Donkey Kong Jr., and Popeye as early cartridges.",
    '07-19': "Cassini photographed Saturn and Earth during an imaging campaign while the spacecraft was in Saturn's shadow.",
    '07-22': "Wiley Post circled the globe alone in the Lockheed Vega Winnie Mae in 7 days, 18 hours, and 49 minutes.",
    '07-29': "Allen & Unwin issued the book in Britain in 1954, followed by The Two Towers and The Return of the King.",
    '08-08': "The cover shoot took only minutes outside EMI Studios, later renamed Abbey Road Studios.",
    '08-10': "His death occurred while he was awaiting trial on federal sex-trafficking charges in New York.",
    '08-12': "Investigators traced the crash to a faulty repair of the aircraft's rear pressure bulkhead years earlier.",
    '08-18': "Tennessee's ratification supplied the final state approval needed for the amendment to become part of the Constitution.",
    '08-27': "Twin brothers Norris and Ross McWhirter compiled the early volumes after being commissioned by Guinness.",
    '09-15': "De Gouges addressed the text to Queen Marie Antoinette and modeled it against the 1789 rights declaration.",
    '10-02': "Before joining the Court, Marshall argued Brown v. Board of Education as NAACP chief counsel.",
    '10-10': "The group's motto was \"Deeds, not words,\" and its tactics brought arrests, hunger strikes, and force-feeding.",
    '10-16': "The book introduced Narnia, Aslan, and the Pevensie children before six more novels expanded the series.",
    '10-17': "The first tournament was a 36-hole event played over three rounds on Prestwick's 12-hole course.",
    '11-06': "The treaty created the Great Sioux Reservation and recognized Native rights to the Black Hills, promises later broken by the United States.",
    '11-09': "Jann Wenner and critic Ralph J. Gleason launched the magazine in San Francisco.",
    '11-16': "Riel's execution deepened divisions between French and English Canada and made him a lasting Metis symbol.",
    '11-25': "The release followed the concert film This Is Us and preceded the Where We Are stadium tour.",
    '12-06': "Georgia's ratification supplied the final state approval, and William H. Seward certified the amendment on December 18, 1865.",
    '12-29': "The killings took place near Wounded Knee Creek on the Pine Ridge Reservation in South Dakota.",
  };

  function ensureOnThisDaySection() {
    let section = document.querySelector('[data-on-this-day]');
    if (section) {
      if (!section.querySelector('[data-history-detail-link]') || !section.querySelector('[data-history-art]')) {
        section.innerHTML = historySectionMarkup();
      }
      return section;
    }

    const ticker = document.querySelector('[data-home-recency-ticker]');
    if (!ticker) return null;

    section = document.createElement('section');
    section.className = 'on-this-day';
    section.id = 'on-this-day';
    section.setAttribute('data-on-this-day', '');
    section.setAttribute('aria-live', 'polite');
    section.innerHTML = historySectionMarkup();
    ticker.insertAdjacentElement('afterend', section);
    return section;
  }

  function historySectionMarkup() {
    return `
      <div class="on-this-day__header">
        <div class="on-this-day__intro">
          <h2 class="section-heading">On This Day History</h2>
          <p class="section-copy" data-history-date>Loading today's historical moment.</p>
        </div>
        <a class="on-this-day__count" href="on-this-day-preview.html">Preview all 365</a>
      </div>
      <div class="on-this-day__layout">
        <div class="on-this-day__visuals">
          <figure class="on-this-day__art" data-history-art aria-label="Artwork for today's historical moment"></figure>
        </div>
        <article class="on-this-day__story" data-history-card-link tabindex="0">
          <p class="on-this-day__year" data-history-year></p>
          <h3 data-history-title>Checking the archive</h3>
          <p class="on-this-day__dek" data-history-dek></p>
          <p data-history-text></p>
          <div class="on-this-day__facts" data-history-facts></div>
          <a class="on-this-day__more" href="on-this-day-event.html" data-history-detail-link>Read more about this</a>
          <div class="on-this-day__meta">
            <span data-history-rollover>Changes at 12:00 AM local time.</span>
          </div>
        </article>
      </div>
    `;
  }

  function renderOnThisDay(section, date) {
    const moments = window.PRESS_ON_THIS_DAY_MOMENTS || {};
    const key = historyMomentKey(date, moments);
    const moment = moments[key];

    if (!moment) {
      section.querySelector('[data-history-date]')?.replaceChildren(document.createTextNode('The history archive is unavailable right now.'));
      return;
    }

    section.dataset.historyVisual = moment.visual || 'chronicle';
    section.dataset.historyDateKey = key;

    const dateNode = section.querySelector('[data-history-date]');
    const yearNode = section.querySelector('[data-history-year]');
    const titleNode = section.querySelector('[data-history-title]');
    const dekNode = section.querySelector('[data-history-dek]');
    const textNode = section.querySelector('[data-history-text]');
    const factsNode = section.querySelector('[data-history-facts]');
    const detailLinkNode = section.querySelector('[data-history-detail-link]');
    const storyNode = section.querySelector('[data-history-card-link]');
    const rolloverNode = section.querySelector('[data-history-rollover]');
    const artNode = section.querySelector('[data-history-art]');

    if (dateNode) {
      const displayDate = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
      const fallbackNote = key !== monthDayKey(date) ? ` using ${moment.displayDate}` : '';
      dateNode.textContent = `${displayDate}${fallbackNote}`;
    }

    const dekText = historyDisplayDek(moment);
    const support = historyDisplaySupport(moment, dekText);

    if (yearNode) yearNode.textContent = formatHistoryYear(moment.year);
    if (titleNode) titleNode.textContent = moment.title || moment.headline || 'Historical moment';
    if (dekNode) dekNode.textContent = dekText;
    if (textNode) {
      textNode.textContent = support.text || '';
      textNode.hidden = !support.text;
    }

    if (factsNode) {
      const facts = historyDisplayFacts(moment, dekText, support).slice(0, 5);
      factsNode.innerHTML = facts.map((fact) => `
        <div class="on-this-day__fact">
          <span>${escapeHtml(fact.label || '')}</span>
          <strong>${escapeHtml(fact.value || '')}</strong>
        </div>
      `).join('');
    }

    if (detailLinkNode) {
      detailLinkNode.href = historyDetailUrl(key);
      detailLinkNode.textContent = 'Read more about this';
    }

    if (storyNode) {
      storyNode.dataset.historyHref = historyDetailUrl(key);
      storyNode.setAttribute('aria-label', `Read more about ${moment.title || moment.headline || 'this historical moment'}`);
    }

    if (rolloverNode) {
      const count = window.PRESS_ON_THIS_DAY_ATTRIBUTION?.count || Object.keys(moments).length || 365;
      rolloverNode.textContent = `${count} moments. Synced to the live clock; changes at 12:00 AM local time.`;
    }

    if (artNode) {
      artNode.innerHTML = renderHistoryArt(moment, key);
    }
  }

  function openHistoryDetailCard(card) {
    const href = card?.dataset?.historyHref || card?.querySelector?.('[data-history-detail-link]')?.getAttribute('href');
    if (!href) return;
    window.location.href = href;
  }

  function localDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  function monthDayKey(date) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function historyMomentKey(date, moments) {
    const key = monthDayKey(date);
    if (moments[key]) return key;
    if (key === '02-29') return moments['02-28'] ? '02-28' : '03-01';
    return Object.keys(moments)[0] || '01-01';
  }

  function formatHistoryYear(year) {
    const value = Number(year);
    if (!Number.isFinite(value)) return '';
    return value < 0 ? `${Math.abs(value)} BCE` : String(value);
  }

  function historyPalette(name) {
    return HISTORY_PALETTES[name] || HISTORY_PALETTES.archive;
  }

  function renderHistoryArt(moment, key) {
    const artwork = historyArtworkFor(key);
    if (artwork?.src) {
      const alt = historyImageAltText(moment, key, artwork);
      const src = historyDisplayImageSrc(artwork.src);
      return `
        <img
          class="on-this-day__asset"
          src="${escapeAttribute(pressSiteAssetUrl(src))}"
          alt="${escapeAttribute(alt)}"
          loading="lazy"
          decoding="async"
        >
      `;
    }

    return renderHistoryPosterArt(moment, key);
  }

  function historyImageAltText(moment = {}, key = '', artwork = {}) {
    const cleanedArtAlt = cleanHistoryImageText(artwork.alt || artwork.caption || '');
    if (cleanedArtAlt) return cleanedArtAlt;

    const year = formatHistoryYear(moment.year);
    const title = cleanHistoryImageText(moment.title || moment.topic || 'Historical moment');
    const summary = firstHistoryImageSentence(moment.text || moment.headline || moment.dek || '');
    const opener = [year, title].filter(Boolean).join(': ');

    if (opener && summary && collapseWhitespace(summary).toLowerCase() !== collapseWhitespace(title).toLowerCase()) {
      return trimHistoryImageText(`${opener}. ${summary}`);
    }
    return trimHistoryImageText(opener || summary || `${moment.displayDate || key || 'Today'}: Historical moment`);
  }

  function firstHistoryImageSentence(value) {
    const cleaned = cleanHistoryImageText(value).replace(/\s+The deeper story is\b.*$/i, '');
    return trimHistoryImageText(sentenceFromHistoryText(cleaned) || cleaned);
  }

  function historyDisplayDek(moment = {}) {
    const event = firstHistoryDisplaySentence(moment.text || moment.headline || '');
    if (event) return event;
    return firstHistoryDisplaySentence(stripHistoryDekBoilerplate(moment.dek || '') || moment.title || '');
  }

  function historyDisplaySupport(moment = {}, dek = '') {
    const blockedKeys = new Set([
      comparableHistoryText(dek),
      comparableHistoryText(moment.text || ''),
      comparableHistoryText(moment.headline || ''),
      comparableHistoryText(stripHistoryDekBoilerplate(moment.dek || '')),
    ].filter(Boolean));
    const referenceTexts = [
      dek,
      moment.text || '',
    ].filter(Boolean);
    const candidates = [];

    addCandidate(historyHeadlineExtraSentence(moment, dek), 'headline');
    addCandidate(historyExtraNotes[moment.date], 'extraNote', true);
    addCandidate(historySourceDescriptionSentence(moment), 'sourceDescription');
    addCandidate(historyConnectedSubjectsSentence(moment), 'connected');
    (Array.isArray(moment.coolFacts) ? moment.coolFacts : []).forEach((fact) => {
      addCandidate(cleanHistorySupportLine(fact, moment), 'coolFacts');
    });
    if (!candidates.length) addCandidate(historyStakesSentence(moment), 'stakes');

    const picked = [];
    const hideFactLabels = new Set();
    for (const candidate of candidates) {
      if (!candidate.text) continue;
      if (picked.some((item) => historyIsRepeating(candidate.text, item.text))) continue;
      picked.push(candidate);
      if (candidate.factLabel) hideFactLabels.add(String(candidate.factLabel).toLowerCase());
      if (historyWordCount(picked.map((item) => item.text).join(' ')) >= 24) break;
    }

    return {
      text: picked.map((item) => item.text).join(' '),
      hideFactLabels,
    };

    function addCandidate(value, factLabel = '', allowNearRepeat = false) {
      const text = ensureHistorySentence(cleanHistorySupportLine(value, moment));
      const key = comparableHistoryText(text);
      if (!text || !key || blockedKeys.has(key)) return;
      if (!allowNearRepeat && referenceTexts.some((reference) => historyIsRepeating(text, reference))) return;
      if (!allowNearRepeat && candidates.some((candidate) => historyIsRepeating(text, candidate.text))) return;
      candidates.push({ text, factLabel });
    }
  }

  function historyDisplayFacts(moment = {}, dek = '', support = {}) {
    const hiddenLabels = support.hideFactLabels || new Set();
    const blockedValues = new Set([
      comparableHistoryText(dek),
      comparableHistoryText(support.text || ''),
      comparableHistoryText(moment.text || ''),
      comparableHistoryText(moment.headline || ''),
    ].filter(Boolean));

    return (Array.isArray(moment.facts) ? moment.facts : []).filter((fact) => {
      const label = String(fact.label || '');
      const value = String(fact.value || '');
      if (/^why\b/i.test(label)) return false;
      if (/^scene$/i.test(label)) return false;
      if (/^(?:context|source context|main subject|connected to|stakes)$/i.test(label)) return false;
      if (hiddenLabels.has(label.toLowerCase())) return false;
      if (blockedValues.has(comparableHistoryText(value))) return false;
      return true;
    });
  }

  function historySourceDescriptionSentence(moment = {}) {
    const description = collapseWhitespace(moment.sourceDescription || '');
    if (!description) return '';
    const subject = collapseWhitespace(moment.topic || moment.title || 'The event');
    if (!subject || comparableHistoryText(subject) === comparableHistoryText(description)) return '';
    return `${historyDisplaySubject(subject)} ${historyPastSubjectVerb(subject)} ${historyDescriptionPhrase(description)}.`;
  }

  function historyHeadlineExtraSentence(moment = {}, dek = '') {
    const headline = stripHistoryDekBoilerplate(moment.headline || '');
    if (!headline || comparableHistoryText(headline) === comparableHistoryText(dek)) return '';
    const clauses = headline.split(/[,;]\s+/).map((clause) => collapseWhitespace(clause)).filter(Boolean);
    for (const clause of clauses.slice(1)) {
      const sentence = historyClauseToSentence(clause, moment);
      if (sentence && comparableHistoryText(sentence) !== comparableHistoryText(dek)) return sentence;
    }
    return '';
  }

  function historyClauseToSentence(value, moment = {}) {
    const clause = collapseWhitespace(value).replace(/[.!?]$/, '');
    if (!clause) return '';
    const replacements = {
      opening: 'opened',
      beginning: 'began',
      creating: 'created',
      making: 'made',
      becoming: 'became',
      presenting: 'presented',
      introducing: 'introduced',
      establishing: 'established',
      resulting: 'resulted',
      marking: 'marked',
      giving: 'gave',
      hoping: 'hoped',
      exposing: 'exposed',
      changing: 'changed',
    };
    const match = clause.match(/^([a-z]+ing)\b\s*(.*)$/i);
    if (match) {
      const verb = replacements[match[1].toLowerCase()] || match[1];
      const subject = historyShortSubject(moment);
      return `${subject} ${verb} ${match[2]}.`;
    }
    return ensureHistorySentence(sentenceCaseHistory(clause));
  }

  function historyConnectedSubjectsSentence(moment = {}) {
    const subjects = historyConnectedSubjects(moment);
    if (!subjects.length) return '';
    return `The surrounding record also points to ${historyReadableList(subjects)}.`;
  }

  function historyConnectedSubjects(moment = {}) {
    const titleKey = comparableHistoryText(moment.title || '');
    const topicKey = comparableHistoryText(moment.topic || '');
    const descriptionKey = comparableHistoryText(moment.sourceDescription || '');
    const items = [];

    (Array.isArray(moment.facts) ? moment.facts : []).forEach((fact) => {
      if (!/^connected to$/i.test(fact.label || '')) return;
      String(fact.value || '').split(',').forEach((item) => add(item));
    });
    (Array.isArray(moment.related) ? moment.related : []).forEach((item) => add(item.title || item.name || ''));

    return items.slice(0, 4);

    function add(value) {
      const text = collapseWhitespace(value).replace(/[.!?]$/, '');
      const key = comparableHistoryText(text);
      if (!text || !key || key === titleKey || key === topicKey || key === descriptionKey) return;
      if (items.some((item) => comparableHistoryText(item) === key)) return;
      items.push(text);
    }
  }

  function historyStakesSentence(moment = {}) {
    const stakes = collapseWhitespace(moment.stakes || '');
    if (!stakes) return '';
    return /^it\b/i.test(stakes) ? ensureHistorySentence(stakes) : `It was ${lowercaseFirstHistory(stakes)}.`;
  }

  function cleanHistorySupportLine(value, moment = {}) {
    const text = stripHistoryDekBoilerplate(value)
      .replace(/^A useful starting source is\b.*$/i, '')
      .replace(/^\w+\s+\d+\s+places the reader\b.*$/i, '')
      .replace(/^\w+\s+\d{1,2},\s+\d{3,4}:\s+.*$/i, '')
      .replace(/^The deeper story\b.*$/i, '');
    if (/^(?:Why it mattered|The big historical pressure point):/i.test(text)) return '';
    if (/^(?:Context|Source context|Main subject|Connected subjects|Connected to|Stakes):/i.test(text)) return '';
    if (/^Scene:/i.test(text)) return '';
    if (/^The lasting meaning sits\b/i.test(text)) return '';
    if (/^(?:The lasting consequence|The practical result|The consequence was)\b/i.test(text)) return '';
    if (/^A calendar entry matters\b/i.test(text)) return '';
    return sentenceCaseHistory(text);
  }

  function sentenceCaseHistory(value) {
    const text = collapseWhitespace(value);
    if (!text || !/^[a-z]/.test(text)) return text;
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }

  function lowercaseFirstHistory(value) {
    const text = collapseWhitespace(value);
    if (!text || !/^[A-Z]/.test(text)) return text;
    return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }

  function historySubjectVerb(subject) {
    return /\b(?:landings|games|olympics|wars|rights|protests|treaties|forces|people)\b$/i.test(subject) ? 'are' : 'is';
  }

  function historyPastSubjectVerb(subject) {
    return /\b(?:landings|games|olympics|wars|rights|protests|treaties|forces|people)\b$/i.test(subject) ? 'were' : 'was';
  }

  function historyDisplaySubject(subject) {
    const text = collapseWhitespace(subject);
    if (!text || /^(?:a|an|the)\b/i.test(text) || /:/.test(text)) return text;
    if (/\b(?:act|battle|declaration|landings|massacre|revolution|treaty|war)\b/i.test(text)) return `The ${text}`;
    return text;
  }

  function historyShortSubject(moment = {}) {
    const title = collapseWhitespace(moment.title || moment.topic || 'The event');
    if (/^the\b/i.test(title)) return title;
    if (/\b(?:act|battle|declaration|landings|massacre|revolution|treaty|war)\b/i.test(title)) return `The ${title}`;
    return title;
  }

  function historyDescriptionPhrase(value) {
    const text = collapseWhitespace(value);
    if (!text) return '';
    if (/^(?:a|an|the)\b/i.test(text)) return text;
    if (/^allied invasion\b/i.test(text)) return `the ${text}`;
    if (/^\d/.test(text)) return `the ${text}`;
    return `${/^[aeiou]/i.test(text) ? 'an' : 'a'} ${text}`;
  }

  function historyReadableList(items) {
    const list = items.map((item) => collapseWhitespace(item)).filter(Boolean);
    if (list.length <= 1) return list[0] || '';
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
  }

  function comparableHistoryText(value) {
    return collapseWhitespace(value)
      .toLowerCase()
      .replace(/&amp;/g, '&')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function historyIsRepeating(value, reference) {
    const valueKey = comparableHistoryText(value);
    const referenceKey = comparableHistoryText(reference);
    if (!valueKey || !referenceKey) return false;
    if (valueKey === referenceKey) return true;
    if (valueKey.length > 24 && referenceKey.includes(valueKey)) return true;
    if (referenceKey.length > 24 && valueKey.includes(referenceKey)) return true;
    return historyTextOverlap(value, reference) >= 0.62;
  }

  function historyTextOverlap(value, reference) {
    const valueTokens = historyMeaningfulTokens(value);
    const referenceTokens = historyMeaningfulTokens(reference);
    if (valueTokens.length < 4 || referenceTokens.length < 4) return 0;
    const referenceSet = new Set(referenceTokens);
    const shared = valueTokens.filter((token) => referenceSet.has(token)).length;
    return shared / Math.min(valueTokens.length, referenceTokens.length);
  }

  function historyMeaningfulTokens(value) {
    const stopWords = new Set([
      'about', 'above', 'after', 'again', 'against', 'also', 'because', 'before', 'began', 'being',
      'could', 'during', 'each', 'event', 'first', 'from', 'have', 'history', 'into', 'itself',
      'made', 'more', 'most', 'other', 'over', 'same', 'some', 'story', 'than', 'that', 'their',
      'them', 'then', 'there', 'these', 'they', 'this', 'through', 'under', 'very', 'were', 'what',
      'when', 'where', 'which', 'while', 'with', 'world', 'would',
    ]);
    return comparableHistoryText(value)
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token));
  }

  function historyWordCount(value) {
    const text = collapseWhitespace(value);
    return text ? text.split(/\s+/).length : 0;
  }

  function firstHistoryDisplaySentence(value) {
    const text = stripHistoryDekBoilerplate(value);
    return ensureHistorySentence(sentenceFromHistoryText(text) || text);
  }

  function stripHistoryDekBoilerplate(value) {
    return collapseWhitespace(value)
      .replace(/\.\.\./g, '.')
      .replace(/\s+\bThe deeper story is\b.*$/i, '');
  }

  function ensureHistorySentence(value) {
    const text = collapseWhitespace(value);
    if (!text) return '';
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  function sentenceFromHistoryText(text) {
    for (let index = 0; index < text.length; index += 1) {
      if (!/[.!?]/.test(text[index])) continue;
      if (index < text.length - 1 && !/\s/.test(text[index + 1])) continue;
      if (isProtectedHistorySentencePeriod(text, index)) continue;
      return text.slice(0, index + 1);
    }
    return '';
  }

  function isProtectedHistorySentencePeriod(text, index) {
    const before = text.slice(0, index + 1);
    const token = before.match(/(?:^|\s)(\S+)$/)?.[1] || '';
    const next = text.slice(index + 1).trimStart();
    if (/^(?:[A-Z]\.)+$/.test(token)) return true;
    if (/^(?:Mr|Mrs|Ms|Dr|Prof|St|Sen|Rep|Gov|Gen|Col|Lt|Capt|Sgt|Jr|Sr|No|v|vs)\.$/i.test(token)) return true;
    if (next && /^[a-z]/.test(next)) return true;
    return false;
  }

  function cleanHistoryImageText(value) {
    let text = collapseWhitespace(value);
    if (!text) return '';

    text = text
      .replace(/^photorealistic\s+/i, '')
      .replace(/^(?:editorial|historical|science|cinematic|wide|dawn|night)\s+(?:scene|artwork|image)\s+(?:of\s+)?/i, '')
      .replace(/^scene\s+of\s+/i, '')
      .replace(/\s*,?\s+with\s+(?:period|historical|era-appropriate|marquee|press|crowd|crowds|cables|instruments|cars|uniforms|documents|machines|smoke|dust|lighting|props|visual|cinematic)\b.*$/i, '.')
      .replace(/\b(?:AI-generated|generated image|artwork prompt|image direction|production note)\b/gi, '')
      .replace(/\s+\./g, '.');

    return collapseWhitespace(text);
  }

  function trimHistoryImageText(value) {
    const text = collapseWhitespace(value);
    if (text.length <= 260) return text;
    return `${text.slice(0, 257).replace(/\s+\S*$/, '')}...`;
  }

  function historyArtworkFor(key) {
    const manifest = window.PRESS_ON_THIS_DAY_ARTWORK || {};
    return manifest[key] || null;
  }

  function historyDisplayImageSrc(path) {
    const value = String(path || '');
    return value.replace(/assets\/on-this-day-images\/([^?#]+?)\.(?:png|jpe?g)(?=$|[?#])/i, 'assets/on-this-day-display/$1.jpg');
  }

  function historyDetailUrl(key) {
    return `on-this-day-event.html?date=${encodeURIComponent(key || '')}`;
  }

  function renderHistoryPosterArt(moment, key) {
    const palette = historyPalette(moment.palette);
    const suffix = String(key || 'today').replace(/[^a-z0-9-]/gi, '');
    const safeSuffix = escapeAttribute(suffix || 'today');
    const label = `${moment.displayDate || 'Today'}: ${moment.title || 'Historical moment'}`;
    const year = formatHistoryYear(moment.year);
    const motif = historyArtMotif(moment, palette);
    const titleLines = historyArtTextLines(moment.title || moment.topic || 'Historical moment', 19, 2);
    const titleTspans = titleLines.map((line, index) => `
          <tspan x="332" dy="${index === 0 ? 0 : 38}">${escapeHtml(line)}</tspan>`).join('');
    const lane = historyArtLane(moment.visual);

    return `
      <svg class="on-this-day__svg" viewBox="0 0 920 560" role="img" aria-labelledby="history-art-title-${safeSuffix} history-art-desc-${safeSuffix}" preserveAspectRatio="xMidYMid meet">
        <title id="history-art-title-${safeSuffix}">${escapeHtml(label)}</title>
        <desc id="history-art-desc-${safeSuffix}">A static editorial poster illustration for ${escapeHtml(moment.title || 'the selected historical moment')}.</desc>
        <defs>
          <pattern id="history-grid-${safeSuffix}" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0 H0 V34" fill="none" stroke="${palette.ink}" stroke-width="1" opacity=".08"></path>
          </pattern>
          <pattern id="history-dot-${safeSuffix}" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2.6" cy="2.6" r="1.8" fill="${palette.ink}" opacity=".13"></circle>
          </pattern>
          <linearGradient id="history-wash-${safeSuffix}" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${palette.paper}"></stop>
            <stop offset="1" stop-color="${palette.muted}"></stop>
          </linearGradient>
        </defs>
        <rect width="920" height="560" rx="0" fill="${palette.bg}"></rect>
        <rect width="920" height="560" fill="url(#history-grid-${safeSuffix})"></rect>
        <path d="M0 405 C116 364 224 386 332 338 C484 270 600 314 742 248 C811 216 870 196 920 194 L920 560 L0 560 Z" fill="${palette.muted}" opacity=".82"></path>
        <rect x="32" y="32" width="856" height="496" fill="none" stroke="${palette.ink}" stroke-width="3" opacity=".9"></rect>
        <rect x="58" y="58" width="220" height="444" fill="${palette.ink}"></rect>
        <rect x="76" y="76" width="184" height="408" fill="none" stroke="${palette.paper}" stroke-width="2" opacity=".42"></rect>
        <text x="96" y="119" fill="${palette.paper}" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="900" letter-spacing="3">ON THIS DAY</text>
        <text x="96" y="251" fill="${palette.paper}" font-family="Georgia, serif" font-size="78" font-weight="800" letter-spacing="-1">${escapeHtml(year)}</text>
        <path d="M96 287 H240" stroke="${palette.third}" stroke-width="8"></path>
        <text x="96" y="330" fill="${palette.paper}" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="800">${escapeHtml(moment.displayDate || 'Today')}</text>
        <text x="96" y="366" fill="${palette.third}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="900" letter-spacing="2">${escapeHtml(lane)}</text>
        <path d="M96 430 H222" stroke="${palette.paper}" stroke-width="2" opacity=".52"></path>
        <circle cx="236" cy="430" r="9" fill="${palette.third}"></circle>
        <g transform="translate(316 58)">
          <rect x="0" y="0" width="546" height="344" fill="url(#history-wash-${safeSuffix})" stroke="${palette.ink}" stroke-width="3"></rect>
          <rect x="0" y="0" width="546" height="344" fill="url(#history-dot-${safeSuffix})" opacity=".44"></rect>
          ${motif}
        </g>
        <text x="332" y="454" fill="${palette.ink}" font-family="Georgia, serif" font-size="36" font-weight="800" letter-spacing="0">${titleTspans}
        </text>
        <path d="M332 505 H852" stroke="${palette.accent}" stroke-width="7"></path>
      </svg>
    `;
  }

  function historyArtTextLines(value, maxChars, maxLines) {
    const words = collapseWhitespace(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);

    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[.,;:]$/, '')}...`;
      return kept;
    }

    return lines.length ? lines : ['Historical moment'];
  }

  function historyArtLane(type) {
    return {
      space: 'SPACE',
      science: 'SCIENCE',
      rights: 'RIGHTS',
      civic: 'CIVIC',
      conflict: 'CONFLICT',
      culture: 'CULTURE',
      crime: 'CRIME',
      medicine: 'MEDICINE',
      music: 'MUSIC',
      protest: 'PROTEST',
      sports: 'SPORTS',
      tech: 'TECH',
      transport: 'MOTION',
      chronicle: 'ARCHIVE',
    }[type] || 'ARCHIVE';
  }

  function historyArtText(moment) {
    return [
      moment?.title,
      moment?.topic,
      moment?.headline,
      moment?.text,
      moment?.sourceDescription,
    ].map((value) => collapseWhitespace(value || '')).join(' ').toLowerCase();
  }

  function historyArtMotif(moment, palette) {
    const type = moment?.visual || 'chronicle';
    const text = historyArtText(moment);

    if (type === 'space') return `
      <circle cx="398" cy="98" r="54" fill="${palette.third}" opacity=".95"></circle>
      <path d="M0 255 C94 221 184 248 274 214 C382 174 465 198 546 156 V344 H0 Z" fill="${palette.muted}" opacity=".8"></path>
      <circle cx="178" cy="198" r="86" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"></circle>
      <circle cx="145" cy="174" r="13" fill="${palette.muted}"></circle>
      <circle cx="199" cy="221" r="20" fill="${palette.muted}"></circle>
      <path d="M294 244 C346 176 393 126 472 86" fill="none" stroke="${palette.accent}" stroke-width="7" stroke-linecap="round"></path>
      <path d="M398 102 L480 132 L418 188 L359 164 Z" fill="${palette.ink}"></path>
      <path d="M421 117 L454 132 L419 162 L390 151 Z" fill="${palette.paper}"></path>
      <path d="M373 174 L341 217 M435 177 L470 214" stroke="${palette.accent}" stroke-width="7" stroke-linecap="round"></path>
    `;

    if (type === 'science') return `
      <rect x="50" y="64" width="168" height="232" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"></rect>
      <path d="M96 111 H176 M96 153 H168 M96 195 H190" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round"></path>
      <path d="M320 75 H405 L389 156 L475 291 H250 L336 156 Z" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <path d="M291 250 C326 209 397 210 435 250 L461 291 H265 Z" fill="${palette.accent}" opacity=".9"></path>
      <ellipse cx="365" cy="178" rx="126" ry="42" fill="none" stroke="${palette.second}" stroke-width="6"></ellipse>
      <ellipse cx="365" cy="178" rx="126" ry="42" fill="none" stroke="${palette.third}" stroke-width="6" transform="rotate(60 365 178)"></ellipse>
      <circle cx="365" cy="178" r="17" fill="${palette.ink}"></circle>
      <path d="M72 304 H510" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round"></path>
    `;

    if (type === 'rights') return `
      <rect x="60" y="76" width="148" height="196" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"></rect>
      <rect x="338" y="64" width="156" height="208" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="5"></rect>
      <path d="M96 122 H176 M96 164 H166 M372 118 H462 M372 162 H452" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round"></path>
      <circle cx="120" cy="304" r="29" fill="${palette.third}" stroke="${palette.ink}" stroke-width="5"></circle>
      <circle cx="272" cy="290" r="40" fill="${palette.second}" stroke="${palette.ink}" stroke-width="5"></circle>
      <circle cx="430" cy="304" r="29" fill="${palette.third}" stroke="${palette.ink}" stroke-width="5"></circle>
      <path d="M74 342 C109 314 152 314 187 342 M211 342 C253 307 294 307 336 342 M382 342 C416 314 459 314 494 342" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"></path>
      <path d="M274 96 V220" stroke="${palette.ink}" stroke-width="8" stroke-linecap="round"></path>
      <path d="M234 137 H314" stroke="${palette.ink}" stroke-width="8" stroke-linecap="round"></path>
    `;

    if (type === 'civic') return `
      <path d="M273 64 L444 142 H102 Z" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <rect x="126" y="142" width="294" height="40" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6"></rect>
      <path d="M158 182 V292 M228 182 V292 M318 182 V292 M388 182 V292" stroke="${palette.ink}" stroke-width="11" stroke-linecap="round"></path>
      <rect x="94" y="292" width="358" height="45" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6"></rect>
      <path d="M86 82 H146 M410 86 H494 M70 326 H496" stroke="${palette.third}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M452 206 L520 246 L452 286 Z" fill="${palette.second}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
    `;

    if (type === 'conflict') return `
      <path d="M58 90 L178 61 L282 98 L444 66 L492 285 L348 321 L244 286 L89 326 Z" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <path d="M178 61 L244 286 M282 98 L348 321" stroke="${palette.ink}" stroke-width="4" opacity=".7"></path>
      <path d="M114 193 C176 150 223 164 266 204 C314 249 371 219 430 164" fill="none" stroke="${palette.accent}" stroke-width="9" stroke-linecap="round"></path>
      <circle cx="116" cy="193" r="18" fill="${palette.third}" stroke="${palette.ink}" stroke-width="5"></circle>
      <circle cx="430" cy="164" r="18" fill="${palette.second}" stroke="${palette.ink}" stroke-width="5"></circle>
      <path d="M384 232 L444 292 M444 232 L384 292" stroke="${palette.accent}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M38 316 H520" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round"></path>
    `;

    if (type === 'culture') return `
      <path d="M88 294 L462 294 L420 108 L128 108 Z" fill="${palette.ink}"></path>
      <path d="M142 108 C169 54 226 58 256 108 M300 108 C330 58 386 54 414 108" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6"></path>
      <path d="M126 137 H424" stroke="${palette.third}" stroke-width="11" stroke-linecap="round"></path>
      <circle cx="206" cy="214" r="54" fill="${palette.accent}" stroke="${palette.paper}" stroke-width="7"></circle>
      <circle cx="206" cy="214" r="15" fill="${palette.paper}"></circle>
      <rect x="315" y="174" width="92" height="72" fill="${palette.second}" stroke="${palette.paper}" stroke-width="6"></rect>
      <path d="M315 200 H407 M344 174 V246 M378 174 V246" stroke="${palette.paper}" stroke-width="4"></path>
      <path d="M62 318 H488" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round"></path>
    `;

    if (type === 'transport' && /\b(flight|aircraft|airplane|aviation|lindbergh|transatlantic|spirit of st\.? louis)\b/.test(text)) {
      return `
        <circle cx="440" cy="78" r="47" fill="${palette.third}" opacity=".95"></circle>
        <path d="M44 230 C151 126 306 88 498 114" fill="none" stroke="${palette.second}" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 16"></path>
        <path d="M88 248 C170 220 272 224 382 250 C442 264 488 264 526 250" fill="none" stroke="${palette.ink}" stroke-width="5" opacity=".38"></path>
        <path d="M76 178 C129 153 254 152 392 175 L499 193 C523 197 528 215 500 220 L380 230 L314 297 H254 L296 235 L168 231 L95 280 H44 L94 225 L59 219 C23 214 28 192 76 178 Z" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
        <path d="M242 169 L312 100 H363 L326 181" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
        <path d="M118 184 L76 118 H119 L179 176" fill="${palette.second}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
        <circle cx="458" cy="205" r="12" fill="${palette.third}" stroke="${palette.ink}" stroke-width="4"></circle>
        <path d="M90 306 H168 M376 306 H469" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round"></path>
        <text x="86" y="325" fill="${palette.ink}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="900" letter-spacing="2">ATLANTIC CROSSING</text>
      `;
    }

    if (type === 'transport') return `
      <path d="M46 246 C110 171 192 128 292 115 C377 103 450 120 511 168" fill="none" stroke="${palette.second}" stroke-width="7" stroke-linecap="round" stroke-dasharray="13 15"></path>
      <path d="M80 226 H408 C456 226 492 260 496 303 H72 C69 269 54 249 80 226 Z" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <path d="M126 226 L164 162 H310 L364 226" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <circle cx="150" cy="304" r="28" fill="${palette.third}" stroke="${palette.ink}" stroke-width="5"></circle>
      <circle cx="398" cy="304" r="28" fill="${palette.third}" stroke="${palette.ink}" stroke-width="5"></circle>
      <path d="M58 332 H512" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round"></path>
      <circle cx="464" cy="112" r="34" fill="${palette.third}" opacity=".95"></circle>
    `;

    return `
      <rect x="90" y="70" width="330" height="226" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="6"></rect>
      <path d="M128 121 H380 M128 164 H366 M128 207 H318" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round"></path>
      <rect x="142" y="242" width="92" height="42" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="5"></rect>
      <circle cx="362" cy="263" r="30" fill="${palette.third}" stroke="${palette.ink}" stroke-width="5"></circle>
      <path d="M52 102 L90 70 V296 L52 264 Z" fill="${palette.second}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <path d="M420 70 L476 104 V263 L420 296 Z" fill="${palette.muted}" stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round"></path>
      <path d="M74 320 H496" stroke="${palette.ink}" stroke-width="7" stroke-linecap="round"></path>
    `;
  }

  function renderMastheadTicker(stories) {
    const itemsBox = document.querySelector('[data-masthead-ticker]');
    if (!itemsBox || !Array.isArray(stories) || !stories.length) return;

    const seen = new Set();
    const headlines = rotateMastheadHeadlines(stories
      .filter((story) => story?.title && story?.url && !pressIsCartoonIndexItem(story, story.url, story.section))
      .filter((story) => {
        const key = `${story.title}|${story.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 14));

    if (!headlines.length) return;

    const links = headlines
      .map((story) => `<a href="${escapeAttribute(story.url)}"><span>${escapeHtml(story.section || 'News')}</span>${escapeHtml(story.title)}</a>`)
      .join('');
    const charBudget = headlines.reduce((sum, story) => sum + Math.min(110, story.title.length), 0);

    itemsBox.style.setProperty('--masthead-ticker-duration', `${Math.max(70, Math.min(150, Math.round(charBudget / 7)))}s`);
    itemsBox.innerHTML = `<div class="masthead-ticker__track">${links}${links}</div>`;
  }

  function rotateMastheadHeadlines(headlines) {
    if (!Array.isArray(headlines) || headlines.length < 2) return headlines || [];

    const storageKey = 'press-masthead-ticker-start-key';
    const keyFor = (story) => `${story?.title || ''}|${story?.url || ''}`;
    const previousKey = readStoredString(storageKey);
    const previousIndex = headlines.findIndex((story) => keyFor(story) === previousKey);
    const index = previousIndex >= 0 ? (previousIndex + 1) % headlines.length : 0;

    writeStoredString(storageKey, keyFor(headlines[index]));
    return headlines.slice(index).concat(headlines.slice(0, index));
  }

  function readStoredString(key) {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function writeStoredString(key, value) {
    try {
      sessionStorage.setItem(key, value || '');
    } catch (_) {}
    try {
      localStorage.setItem(key, value || '');
    } catch (_) {}
  }

  function normalizeVisibleBylines(root) {
    const replaceHouseByline = (text) =>
      text.replace(/^(?:By\s+)?(?:The Press|The Press Staff|Intelligent AI|Written and Researched by AI)(?=\s*[•·]|\s*$)/i, AUTHOR_LABEL);

    const selectors = [
      '.article-meta span:first-child',
      '.article-meta-row span:first-child',
      '.lead-panel__meta',
      '.story-card__meta',
      '.river-item__meta',
      '.link-list__meta',
      '.archive-card__meta',
      '.search-result__meta',
      '.latest-card__meta',
      '.story-meta',
      '.generated-story .byline',
    ];

    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => {
        const text = collapseWhitespace(node.textContent || '');
        if (!text) return;
        if (selector.endsWith('span:first-child')) {
          if (/^(?:Intelligent AI|Written and Researched by AI|AI)\b/i.test(text)) {
            node.textContent = AUTHOR_LABEL;
          } else if (!/^By\s+/i.test(text)) {
            node.textContent = `By ${text}`;
          }
          return;
        }
        if (/^(?:By\s+)?(?:The Press|Intelligent AI|Written and Researched by AI)\b/i.test(text)) {
          node.textContent = replaceHouseByline(text);
        } else if (/^By\b/i.test(text)) {
          node.textContent = text.replace(/^By\s+.*?(?=\s*[•·]|\s*$)/i, AUTHOR_LABEL);
        } else if (/^The Press Staff|^Intelligent AI|^Written and Researched by AI/i.test(text)) {
          node.textContent = AUTHOR_LABEL;
        }
      });
    });

    root.querySelectorAll('.author-panel').forEach((panel) => {
      panel.innerHTML = '<h2>Masthead</h2><p><strong>The Press</strong>. Source notes, dates, and corrections stay close to the work.</p>';
    });

    root.querySelectorAll('.figure-credit a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  function rewriteAuthorsPage() {
    if (!document.body.classList.contains('page-authors')) return;
    document.querySelectorAll('.staff-card').forEach((card) => card.remove());
  }

  function makeCardsClickable() {
    document.querySelectorAll('.link-list__item, .related-card, .story-card, .archive-card, .river-item, .lead-panel').forEach((card) => {
      const link = card.querySelector('a[href]');
      if (!link) return;
      card.classList.add('is-clickable');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');
      card.addEventListener('click', (event) => {
        if (event.target.closest('a, button, label') || pressIsEditableTarget(event.target)) return;
        window.location.href = link.href;
      });
      card.addEventListener('keydown', (event) => {
        if (pressIsEditableTarget(event.target)) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          link.click();
        }
      });
    });
  }

  function makePressSocialCardsClickable(root = document) {
    root.querySelectorAll('.press-static-post').forEach((card) => {
      if (card.dataset.pressSocialClickBound === 'true') return;
      const link = card.querySelector('a[href]');
      if (!link) return;

      card.dataset.pressSocialClickBound = 'true';
      card.classList.add('press-static-post--clickable');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');

      const labelParts = [
        card.querySelector('.press-static-post__name')?.textContent,
        card.querySelector('.press-static-post__visual strong')?.textContent,
        link.textContent,
      ].map((text) => collapseWhitespace(text || '')).filter(Boolean);
      if (labelParts.length) {
        card.setAttribute('aria-label', labelParts.join(': '));
      }

      link.setAttribute('rel', 'noopener noreferrer');
      link.removeAttribute('target');

      const openSource = () => {
        window.location.href = link.href;
      };

      card.addEventListener('click', (event) => {
        if (event.target.closest('a, button, label') || pressIsEditableTarget(event.target)) return;
        openSource();
      });

      card.addEventListener('keydown', (event) => {
        if (pressIsEditableTarget(event.target)) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openSource();
        }
      });
    });
  }

  function relabelUtilityNav() {
    document.querySelectorAll('a[href="authors.html"]').forEach((link) => {
      if (/authors/i.test(link.textContent || '')) {
        link.textContent = 'Masthead';
      }
    });
  }

  function setupArticleTrustTools() {
    const article = document.querySelector('body.page-article .article, body.page-article .article-shell, .page-article .article, .page-article .article-shell');
    const body = article?.querySelector('.article-body, [data-article-body]');
    if (!article || !body) return;

    injectArticleDisclosure(article);
    setupArticleSourceDrawer(article);
  }

  function injectArticleDisclosure(article) {
    article.querySelectorAll('[data-article-trust-card]').forEach((node) => node.remove());
    return;
    if (article.querySelector('[data-article-trust-card]')) return;

    const disclosure = document.createElement('section');
    disclosure.className = 'article-trust-card';
    disclosure.setAttribute('data-article-trust-card', '');
    disclosure.setAttribute('aria-label', 'Editorial and AI disclosure');
    disclosure.innerHTML = `
      <div class="article-trust-card__copy">
        <p class="article-trust-card__kicker">Editorial note</p>
        <p class="article-trust-card__text">Written and Researched by AI and checked through The Press editorial workflow for sourcing, clarity, and corrections. Inline markers connect claims to the source notes.</p>
        <div class="article-trust-card__badges" aria-label="Story review status">
          <span>AI assisted</span>
          <span>Human reviewed</span>
        </div>
      </div>
      <button class="article-trust-card__button" type="button" data-source-drawer-open>Source drawer</button>
    `;

    const figure = article.querySelector('.article-hero .hero-figure');
    const meta = article.querySelector('.article-meta');
    if (figure) {
      figure.insertAdjacentElement('afterend', disclosure);
    } else if (meta) {
      meta.insertAdjacentElement('afterend', disclosure);
    } else {
      (article.querySelector('.article-hero') || article).appendChild(disclosure);
    }
  }

  function setupArticleSourceDrawer(article) {
    if (document.querySelector('[data-article-source-drawer]')) {
      bindArticleSourceButtons();
      return;
    }

    const sources = collectArticleSources(article);
    const sourceItems = sources.length
      ? sources.map((source, index) => `
          <li${source.href ? ` data-source-drawer-url="${escapeAttribute(source.href)}"` : ''}>
            <span class="article-source-drawer__number">${index + 1}</span>
            <div>
              ${source.href ? `<a href="${escapeAttribute(source.href)}" rel="noopener noreferrer" data-source-drawer-link>${escapeHtml(source.label)}</a>` : `<strong>${escapeHtml(source.label)}</strong>`}
              ${source.detail ? `<p>${escapeHtml(source.detail)}</p>` : ''}
            </div>
          </li>
        `).join('')
      : '<li><span class="article-source-drawer__number">1</span><div><strong>Source notes</strong><p>No source list was found on this story yet.</p></div></li>';

    const drawer = document.createElement('aside');
    drawer.className = 'article-source-drawer';
    drawer.setAttribute('data-article-source-drawer', '');
    drawer.setAttribute('aria-label', 'Article source drawer');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('role', 'dialog');
    drawer.hidden = true;
    drawer.innerHTML = `
      <button class="article-source-drawer__scrim" type="button" data-source-drawer-close aria-label="Close source drawer"></button>
      <div class="article-source-drawer__panel" role="document">
        <div class="article-source-drawer__header">
          <div>
            <p class="article-source-drawer__kicker">Source trail</p>
            <h2>How this story is backed up</h2>
          </div>
          <button class="article-source-drawer__close" type="button" data-source-drawer-close aria-label="Close source drawer">Close</button>
        </div>
        <p class="article-source-drawer__intro">These are the source notes attached to the article. The numbered markers in the story point back to this record.</p>
        <ol class="article-source-drawer__list">
          ${sourceItems}
        </ol>
      </div>
    `;

    document.body.appendChild(drawer);
    bindArticleSourceButtons();
  }

  function collectArticleSources(article) {
    const selectors = [
      '#source-notes .source-list li',
      '#source-notes li',
      '.article-sources li',
      '.source-notes li',
      '.source-list li',
    ];
    const seen = new Set();
    const items = [];

    selectors.forEach((selector) => {
      article.querySelectorAll(selector).forEach((item) => {
        if (seen.has(item)) return;
        seen.add(item);

        const primaryLink = Array.from(item.querySelectorAll('a[href]')).find((link) => {
          const href = link.getAttribute('href') || '';
          return /^https?:\/\//i.test(href);
        }) || item.querySelector('a[href]');
        const sourceName = collapseWhitespace(item.querySelector('strong')?.textContent || '');
        const linkText = collapseWhitespace(primaryLink?.textContent || '');
        const fullText = collapseWhitespace(item.textContent || '');
        const label = sourceName || linkText || `Source ${items.length + 1}`;
        let detail = sourceName && linkText ? linkText : fullText;

        if (!detail || detail === label) {
          detail = fullText.replace(label, '');
        }
        detail = collapseWhitespace(detail.replace(/^[,.:;\-\s]+/, '').replace(/\.$/, ''));

        items.push({
          label,
          detail,
          href: primaryLink?.getAttribute('href') || '',
        });
      });
    });

    return items;
  }

  function bindArticleSourceButtons() {
    const drawer = document.querySelector('[data-article-source-drawer]');
    if (!drawer) return;

    let lastSourceDrawerFocus = null;

    const closeDrawer = () => {
      drawer.hidden = true;
      document.documentElement.classList.remove('source-drawer-open');
      if (lastSourceDrawerFocus && typeof lastSourceDrawerFocus.focus === 'function') {
        lastSourceDrawerFocus.focus({ preventScroll: true });
      }
    };

    const openDrawer = () => {
      lastSourceDrawerFocus = document.activeElement;
      drawer.hidden = false;
      document.documentElement.classList.add('source-drawer-open');
      drawer.querySelector('.article-source-drawer__close')?.focus({ preventScroll: true });
    };

    document.querySelectorAll('[data-source-drawer-open]').forEach((button) => {
      if (button.dataset.sourceDrawerBound === 'true') return;
      button.dataset.sourceDrawerBound = 'true';
      button.addEventListener('click', openDrawer);
    });

    drawer.querySelectorAll('[data-source-drawer-close]').forEach((button) => {
      if (button.dataset.sourceDrawerBound === 'true') return;
      button.dataset.sourceDrawerBound = 'true';
      button.addEventListener('click', closeDrawer);
    });

    if (drawer.dataset.sourceLinkBound !== 'true') {
      drawer.dataset.sourceLinkBound = 'true';
      drawer.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const sourceItem = target?.closest('[data-source-drawer-url]');
        const link = target?.closest('[data-source-drawer-link]') || sourceItem?.querySelector('[data-source-drawer-link]');
        if (!link || !drawer.contains(link)) return;

        const href = link.getAttribute('href') || '';
        const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
        if (!plainClick || !href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;

        event.preventDefault();
        closeDrawer();
        window.location.href = link.href;
      });
    }

    if (drawer.dataset.escapeBound !== 'true') {
      drawer.dataset.escapeBound = 'true';
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !drawer.hidden) closeDrawer();
      });
    }
  }

  function bindThumbnailFallbacks(root) {
    root.querySelectorAll('img').forEach((img) => {
      if (img.dataset.pressFallbackBound === 'true') return;
      img.dataset.pressFallbackBound = 'true';
      img.addEventListener('error', () => hideBrokenImage(img));
      if (img.complete && img.naturalWidth === 0) hideBrokenImage(img);
    });
  }

  function hideBrokenImage(img) {
    const holder = img.closest('.story-card__image, .lead-panel__media, .river-item__media, .archive-card__image, figure, .card-media');
    if (holder) holder.classList.add('is-hidden'); else img.style.display = 'none';
  }

  function setupSearch() {
    const body = document.body;
    const overlay = document.querySelector('[data-search-overlay]');
    const openButtons = document.querySelectorAll('[data-search-open], [data-open-search]');
    const closeButtons = document.querySelectorAll('[data-search-close], [data-close-search]');
    const searchInput = document.querySelector('[data-search-input]');
    const resultsBox = document.querySelector('[data-search-results]');
    let searchData = [];
    let searchDataPromise = null;

    function showOverlay(show) {
      if (!overlay) return;
      if ('hidden' in overlay) overlay.hidden = !show;
      overlay.classList.toggle('is-hidden', !show);
      overlay.setAttribute('aria-hidden', String(!show));
      body.style.overflow = show ? 'hidden' : '';
    }

    function openSearch() {
      showOverlay(true);
      window.setTimeout(() => searchInput && searchInput.focus(), 30);
      ensureSearchData().then(() => runSearch());
    }

    function closeSearch() {
      showOverlay(false);
      if (searchInput) searchInput.value = '';
      renderSearchResults([], '');
    }

    openButtons.forEach((btn) => btn.addEventListener('click', openSearch));
    closeButtons.forEach((btn) => btn.addEventListener('click', closeSearch));
    if (overlay) overlay.addEventListener('click', (event) => { if (event.target === overlay) closeSearch(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSearch();
    });

    function renderSearchResults(results, query = '') {
      if (!resultsBox) return;
      if (!query) {
        resultsBox.innerHTML = SEARCH_EMPTY;
        return;
      }
      if (!results.length) {
        resultsBox.innerHTML = SEARCH_NONE;
        return;
      }
      resultsBox.innerHTML = results.map((item) => `
        <article class="search-result">
          <p class="eyebrow eyebrow--tiny">${escapeHtml(item.section || '')} • ${escapeHtml(item.type || '')}</p>
          <h3><a href="${escapeAttribute(item.url || '#')}">${escapeHtml(item.title || '')}</a></h3>
          <p>${escapeHtml(item.dek || item.summary || '')}</p>
          <p class="search-result__meta">${AUTHOR_LABEL} • ${escapeHtml(item.published || '')}</p>
        </article>
      `).join('');
    }

    if (!searchInput) return;

    function ensureSearchData() {
      if (!searchDataPromise) {
        searchDataPromise = loadStoryIndex().then((stories) => {
          searchData = stories;
          return stories;
        });
      }
      return searchDataPromise;
    }

    function runSearch() {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return renderSearchResults([], '');
      if (!searchData.length) {
        ensureSearchData().then(runSearch);
        return;
      }
      const results = searchData.filter((item) => {
        const haystack = [item.title, item.section, item.type, item.dek, item.summary, ...(item.keywords || [])].join(' ').toLowerCase();
        return haystack.includes(query);
      }).slice(0, 12);
      renderSearchResults(results, query);
    }

    searchInput.addEventListener('input', runSearch);
  }

  function setupReadingProgress() {
    const progressBar = document.querySelector('[data-reading-progress], [data-progress]');
    if (!progressBar) return;
    const updateProgress = () => {
      const article = document.querySelector('.article, .article-body, [data-article-body]');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const scrollTop = pressPageScrollTop();
      const articleTop = scrollTop + rect.top;
      const articleHeight = article.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, (scrollTop - articleTop) / Math.max(articleHeight, 1)));
      progressBar.style.width = `${progress * 100}%`;
    };
    updateProgress();
    pressAddScrollListener(updateProgress);
    window.addEventListener('resize', updateProgress);
  }

  function setupLeadPanels() {
    const leadButtons = Array.from(document.querySelectorAll('[data-lead-button]'));
    const leadPanels = Array.from(document.querySelectorAll('[data-lead-panel]'));
    if (!leadButtons.length || !leadPanels.length) return;

    const buttonKey = (button) => button?.dataset?.storyKey || '';

    const setLead = (targetId) => {
      const activeButton = leadButtons.find((btn) => btn.dataset.target === targetId);
      leadButtons.forEach((btn) => {
        const active = btn.dataset.target === targetId;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      leadPanels.forEach((panel) => panel.classList.toggle('is-active', panel.id === targetId));
      if (document.body.classList.contains('page-home')) {
        const key = buttonKey(activeButton);
        if (key) window.PressHomepageLeadRotation?.rememberKey?.(key);
        if (activeButton?.parentElement && activeButton.parentElement.firstElementChild !== activeButton) {
          activeButton.parentElement.insertBefore(activeButton, activeButton.parentElement.firstElementChild);
        }
      }
    };
    leadButtons.forEach((btn) => btn.addEventListener('click', () => setLead(btn.dataset.target)));

    const chosenKey = document.body.classList.contains('page-home')
      ? window.PressHomepageLeadRotation?.chooseKey?.(leadButtons.map(buttonKey).filter(Boolean))
      : '';
    const chosenButton = (chosenKey && leadButtons.find((button) => buttonKey(button) === chosenKey))
      || leadButtons.find((button) => button.classList.contains('is-active'))
      || leadButtons[0];
    if (chosenButton) setLead(chosenButton.dataset.target);
  }

  window.PressHomepageLeadRotation = (() => {
    const storageKey = 'press-homepage-refresh-lead-key';
    let currentKey = '';

    function chooseKey(keys) {
      const candidates = Array.from(new Set((keys || []).filter(Boolean)));
      if (!document.body.classList.contains('page-home') || !candidates.length) return candidates[0] || '';
      if (currentKey && candidates.includes(currentKey)) return currentKey;

      const previousKey = readKey();
      const previousIndex = candidates.indexOf(previousKey);
      const index = previousIndex >= 0 ? (previousIndex + 1) % candidates.length : 0;

      rememberKey(candidates[index]);
      return currentKey;
    }

    function rememberKey(key) {
      currentKey = key || '';
      if (!currentKey) return;
      try {
        sessionStorage.setItem(storageKey, currentKey);
      } catch (_) {}
      try {
        localStorage.setItem(storageKey, currentKey);
      } catch (_) {}
    }

    function chooseTarget(targets) {
      return chooseKey(targets);
    }

    function rememberTarget(target) {
      rememberKey(target);
    }

    function readKey() {
      try {
        return sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey) || '';
      } catch (_) {
        return '';
      }
    }

    return { chooseKey, rememberKey, chooseTarget, rememberTarget };
  })();

  function setupArchiveFilters() {
    const filterButtons = document.querySelectorAll('[data-filter]');
    const archiveCards = document.querySelectorAll('.archive-card');
    if (!filterButtons.length || !archiveCards.length) return;
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filterValue = button.dataset.filter;
        filterButtons.forEach((btn) => {
          const active = btn === button;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
        archiveCards.forEach((card) => {
          if (filterValue === 'All') return card.hidden = false;
          const section = normalizeSectionLabel(card.dataset.section);
          const type = card.dataset.type;
          card.hidden = !(section === filterValue || type === filterValue);
        });
      });
    });
  }

  function setupNewsletterForms() {
    document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const status = form.querySelector('[data-newsletter-status]');
        if (status) status.textContent = 'Thanks — the signup form is wired as a prototype success state.';
        form.reset();
      });
    });
  }

  function extendSectionNavigation() {
    const extra = [
      { label: 'AI', href: 'section-ai.html' },
      { label: 'Geopolitics', href: 'section-geopolitics.html' },
      { label: 'Film', href: 'section-film.html' },
      { label: 'Pop Culture', href: 'section-pop-culture.html' },
      { label: 'Cartoons', href: 'section-cartoons.html' },
      { label: 'Niche', href: 'section-niche.html' },
    ];
    document.querySelectorAll('.section-nav__inner').forEach((nav) => {
      extra.forEach((item) => {
        if (nav.querySelector(`a[href="${item.href}"]`)) return;
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.href = item.href;
        a.textContent = item.label;
        nav.appendChild(a);
      });
    });
    document.querySelectorAll('.footer-list').forEach((list) => {
      if (!list.closest('section')?.querySelector('.footer-heading')?.textContent?.match(/Sections/i)) return;
      extra.forEach((item) => {
        if (list.querySelector(`a[href="${item.href}"]`)) return;
        const li = document.createElement('li');
        li.innerHTML = `<a href="${item.href}">${item.label}</a>`;
        list.appendChild(li);
      });
    });
  }


function enhanceBreakingStrip(stories) {
  const strip = document.querySelector('.breaking-strip');
  const itemsBox = strip?.querySelector('.breaking-strip__items');
  if (!strip || !itemsBox) return;
  const storySource = document.body.classList.contains('page-home')
    ? stories.filter((story) => !pressIsCartoonIndexItem(story, story.url, story.section))
    : stories;
  const existing = Array.from(itemsBox.querySelectorAll('a')).map((a) => ({ title: collapseWhitespace(a.textContent), url: a.getAttribute('href') }));
  const extra = storySource.slice(0, 12).map((story) => ({ title: story.title, url: story.url }));
  const seen = new Set();
  const merged = [...existing, ...extra].filter((item) => {
    const key = `${item.title}|${item.url}`;
    if (!item.title || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 14);
  if (!merged.length) return;
  const markup = merged.map((item) => `<a href="${escapeAttribute(item.url)}">${escapeHtml(item.title)}</a>`).join('');
  const charBudget = merged.reduce((sum, item) => sum + Math.min(96, (item.title || '').length), 0);
  const duration = Math.max(78, Math.min(138, Math.round(charBudget / 8)));
  itemsBox.style.setProperty('--press-ticker-duration', `${duration}s`);
  itemsBox.innerHTML = `<div class="breaking-strip__track">${markup}${markup}</div>`;
}

  function injectEditionRadar(stories) {
    if (!document.body.classList.contains('page-home')) return;
    const eligibleStories = stories.filter((story) => !pressIsCartoonIndexItem(story, story.url, story.section));
    if (!eligibleStories.length) return;
    const main = document.querySelector('.home-grid__main');
    const anchor = document.querySelector('.home-grid__main .cards-grid');
    if (!main || !anchor || document.querySelector('.edition-radar')) return;

    const used = new Set(Array.from(document.querySelectorAll('.home-grid a[href]')).map((a) => a.getAttribute('href')));
    const picks = eligibleStories.filter((story) => !used.has(story.url)).slice(0, 3);
    const desks = [...new Set(eligibleStories.slice(0, 10).map((story) => story.section))];
    const updated = eligibleStories[0]?.published || 'Updated recently';

    const block = document.createElement('section');
    block.className = 'edition-radar';
    block.innerHTML = `
      <div class="section-heading-row">
        <div>
          <p class="eyebrow eyebrow--tiny">Edition Radar</p>
          <h2 class="section-heading">More from the edition</h2>
        </div>
        <a class="section-link" href="ai-edition.html">Open latest issue</a>
      </div>
      <div class="edition-radar__grid">
        <div class="edition-radar__stack">
          ${(picks.length ? picks : eligibleStories.slice(0, 3)).map((story) => `
            <article class="edition-radar__item">
              <p class="eyebrow eyebrow--tiny">${escapeHtml(story.section)} • ${escapeHtml(story.type)}</p>
              <h3><a href="${escapeAttribute(story.url)}">${escapeHtml(story.title)}</a></h3>
              <p>${escapeHtml(story.dek || story.summary || '')}</p>
            </article>
          `).join('')}
        </div>
        <aside class="edition-radar__aside">
          <div class="edition-radar__stat"><span>Updated</span><strong>${escapeHtml(updated)}</strong></div>
          <div class="edition-radar__stat"><span>Stories tracked</span><strong>${eligibleStories.length}</strong></div>
          <div class="edition-radar__stat"><span>Desks in play</span><strong>${desks.length}</strong></div>
          <div class="edition-radar__desks">${desks.slice(0, 8).map((desk) => `<span>${escapeHtml(desk)}</span>`).join('')}</div>
        </aside>
      </div>
    `;
    anchor.insertAdjacentElement('afterend', block);
    normalizeVisibleBylines(block);
    makeCardsClickable();
  }

  function renderSectionPage(stories) {
    if (!document.body.classList.contains('page-section')) return;
    const heading = document.querySelector('.section-landing h1, .page-hero h1');
    const sectionName = normalizeSectionLabel(heading?.textContent || '');
    if (!sectionName) return;

    const grid = document.querySelector('.cards-grid--archive, .cards-grid');
    if (!grid) return;

    const aliases = sectionAliases(sectionName);
    const existingCards = Array.from(grid.querySelectorAll('.story-card, .archive-card'));
    const imageMap = new Map();
    existingCards.forEach((card) => {
      const link = card.querySelector('a[href]');
      const img = card.querySelector('img');
      if (!link || !img) return;
      imageMap.set(link.getAttribute('href'), { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' });
    });

    const matches = stories.filter((story) => aliases.includes(normalizeSectionLabel(story.section)));
    if (!matches.length) return;

    const deduped = [];
    const seen = new Set();
    matches.forEach((story) => {
      if (seen.has(story.url)) return;
      seen.add(story.url);
      deduped.push(story);
    });

    grid.innerHTML = deduped.map((story) => renderSectionCard(story, imageMap.get(story.url))).join('');
    normalizeVisibleBylines(grid);
    makeCardsClickable();
    bindThumbnailFallbacks(grid);
    hydrateMissingCardImages(grid);
  }

  function renderDynamicCategoryPages(stories) {
    const main = document.querySelector('.page-home .desk-directory .desk-grid');
    if (!main) return;
    const cards = Array.from(main.querySelectorAll('.desk-card'));
    const allSections = new Map();
    stories.forEach((story) => {
      const key = normalizeSectionLabel(story.section);
      if (!allSections.has(key)) allSections.set(key, []);
      allSections.get(key).push(story);
    });
    cards.forEach((card) => {
      const heading = card.querySelector('h3 a');
      if (!heading) return;
      const section = normalizeSectionLabel(heading.textContent);
      const pool = allSections.get(sectionAliases(section)[0]) || allSections.get(section) || [];
      const link = card.querySelector('.desk-card__story');
      if (pool.length && link) {
        link.textContent = pool[0].title;
        link.href = pool[0].url;
      }
    });
  }

  function renderSectionCard(story, existingImage) {
    const image = story.image || existingImage?.src || '';
    const imageAlt = story.imageAlt || existingImage?.alt || story.title;
    const imageHtml = image ? `
      <a class="story-card__image" href="${escapeAttribute(story.url)}" data-card-image-wrap>
        <img src="${escapeAttribute(image)}" alt="${escapeAttribute(imageAlt)}" loading="lazy" decoding="async" />
      </a>` : '';
    return `
      <article class="story-card archive-card" data-section="${escapeAttribute(story.section)}" data-type="${escapeAttribute(story.type)}" data-story-url="${escapeAttribute(story.url)}">
        ${imageHtml}
        <div class="story-card__body">
          <p class="eyebrow eyebrow--compact">${escapeHtml(story.section)} • ${escapeHtml(story.type)}</p>
          <h3 class="story-card__title"><a href="${escapeAttribute(story.url)}">${escapeHtml(story.title)}</a></h3>
          <p class="story-card__dek">${escapeHtml(story.dek || story.summary || '')}</p>
          <p class="story-card__meta">${AUTHOR_LABEL} • ${escapeHtml(story.published || '')}</p>
        </div>
      </article>
    `;
  }

  async function hydrateMissingCardImages(scope = document) {
    const cards = Array.from(scope.querySelectorAll('[data-story-url]')).filter((card) => !card.querySelector('img'));
    for (const card of cards.slice(0, 18)) {
      const url = card.getAttribute('data-story-url');
      if (!url || url === '#') continue;
      try {
        const response = await fetch(pressSiteAssetUrl(url), { cache: 'force-cache' });
        if (!response.ok) continue;
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const img = doc.querySelector('.article-hero img, .generated-story img, main img');
        if (!img) continue;
        const src = img.getAttribute('src') || '';
        const alt = collapseWhitespace(img.getAttribute('alt') || '');
        if (!src || isBadImageCandidate(src, alt)) continue;
        const wrap = document.createElement('a');
        wrap.className = 'story-card__image';
        wrap.href = url;
        wrap.setAttribute('data-card-image-wrap', '');
        wrap.innerHTML = `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt || card.querySelector('h3 a')?.textContent || 'Story image')}" loading="lazy" decoding="async" />`;
        card.insertBefore(wrap, card.firstChild);
        bindThumbnailFallbacks(card);
      } catch (_) {}
    }
  }

  function isBadImageCandidate(src, alt) {
    const joined = `${src} ${alt}`.toLowerCase();
    return ['no image', 'placeholder', 'fallback', 'default', 'blank.svg', 'no_image_available'].some((needle) => joined.includes(needle));
  }

  function prettifySourceLinks(root) {
    root.querySelectorAll('.source-notes a, .source-list a, .article-sources a, .article-source-notes a, .generated-story .source-notes a').forEach((a) => {
      const raw = collapseWhitespace(a.textContent || '');
      const href = a.getAttribute('href') || '';
      if (!raw || !/^https?:\/\//i.test(raw)) return;
      try {
        const url = new URL(href || raw);
        a.textContent = humanSourceLabel(url.hostname, url.pathname);
      } catch (_) {}
    });
  }

  function bindSourceNoteExternalLinks(root) {
    root.querySelectorAll('#source-notes a[href^="http"], .source-notes a[href^="http"], .article-sources a[href^="http"], .source-list a[href^="http"]').forEach((link) => {
      if (link.dataset.sourceNoteExternalBound === 'true') return;
      link.dataset.sourceNoteExternalBound = 'true';
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }

  function addInlineSourceMarkers(root) {
    const page = root.body || document.body;
    if (!page?.classList?.contains('page-article')) return;

    const article = root.querySelector('body.page-article .article, body.page-article .article-shell, .page-article .article, .page-article .article-shell');
    const body = article?.querySelector('.article-body, [data-article-body]');
    if (!article || !body || body.querySelector('.source-ref')) return;

    const sources = collectArticleSourcesForMarkers(article);
    if (!sources.length) return;

    const paragraphs = Array.from(body.querySelectorAll('p'))
      .filter((paragraph) => {
        if (paragraph.closest('.article-sources, #source-notes, .source-notes, .related-block, .share-row')) return false;
        if (paragraph.closest('.press-static-visual, .poker-static-visuals, .press-static-post')) return false;
        if (paragraph.querySelector('.source-ref')) return false;
        return collapseWhitespace(paragraph.textContent || '').length >= 90;
      });

    if (!paragraphs.length) return;

    sources.forEach((source, index) => {
      const targetIndex = Math.min(
        paragraphs.length - 1,
        Math.floor((index * paragraphs.length) / Math.max(sources.length, 1))
      );
      const target = paragraphs[targetIndex];
      const sup = document.createElement('sup');
      const link = document.createElement('a');

      sup.className = 'source-ref source-ref--auto';
      link.href = `#${source.id}`;
      link.textContent = `[${index + 1}]`;
      link.setAttribute('aria-label', `Source ${index + 1}`);
      sup.appendChild(link);
      target.appendChild(sup);
    });
  }

  function collectArticleSourcesForMarkers(article) {
    const selectors = [
      '#source-notes .source-list li',
      '#source-notes li',
      '.article-sources li',
      '.source-notes li',
      '.source-list li',
    ];
    const seen = new Set();
    const sources = [];

    selectors.forEach((selector) => {
      article.querySelectorAll(selector).forEach((item) => {
        if (seen.has(item)) return;
        seen.add(item);
        if (!collapseWhitespace(item.textContent || '')) return;

        const index = sources.length + 1;
        if (!item.id) item.id = `source-${index}`;
        sources.push({ id: item.id });
      });
    });

    return sources;
  }

  function humanSourceLabel(hostname, pathname) {
    const host = hostname.replace(/^www\./, '').toLowerCase();
    const nice = {
      'reuters.com': 'Reuters',
      'apnews.com': 'AP News',
      'nasa.gov': 'NASA',
      'census.gov': 'U.S. Census Bureau',
      'bls.gov': 'U.S. Bureau of Labor Statistics',
      'bea.gov': 'U.S. Bureau of Economic Analysis',
      'cdc.gov': 'CDC',
      'whitehouse.gov': 'The White House',
      'commons.wikimedia.org': 'Wikimedia Commons',
      'loc.gov': 'Library of Congress',
      'worldbank.org': 'World Bank',
      'imf.org': 'IMF',
      'oecd.org': 'OECD',
      'unesco.org': 'UNESCO',
      'nato.int': 'NATO',
      'europarl.europa.eu': 'European Parliament',
      'ec.europa.eu': 'European Commission',
    };
    if (nice[host]) return nice[host];
    const parts = host.split('.');
    const brand = parts.length >= 2 ? parts[parts.length - 2] : host;
    return brand.charAt(0).toUpperCase() + brand.slice(1).replace(/-/g, ' ');
  }

  function sectionAliases(sectionName) {
    const section = normalizeSectionLabel(sectionName);
    const aliases = {
      'Politics': ['Politics'],
      'Culture': ['Culture', 'Pop Culture', 'Film'],
      'Technology': ['Technology', 'AI'],
      'Economics': ['Economics'],
      'Education': ['Education'],
      'Health': ['Health'],
      'Philosophy': ['Philosophy'],
      'Science': ['Science'],
      'World': ['World', 'Geopolitics'],
      'Opinion': ['Opinion'],
      'AI': ['AI', 'Technology'],
      'Geopolitics': ['Geopolitics', 'World'],
      'Film': ['Film', 'Culture', 'Pop Culture'],
      'Pop Culture': ['Pop Culture', 'Culture', 'Film'],
      'Niche': ['Niche'],
    };
    return aliases[section] || [section];
  }

  function normalizeSectionLabel(section) {
    return collapseWhitespace(String(section || ''));
  }

  function collapseWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  /* ── Dark-mode toggle ──────────────────────────────────────────────── */
  function setupDarkMode() {
    const STORAGE_KEY = 'press-theme';
    const root = document.documentElement;

    // Restore saved preference immediately (before paint)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;

    function updateIcon() {
      const isDark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      toggle.textContent = isDark ? '☽' : '☀︎';
      toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    toggle.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
      updateIcon();
    });

    updateIcon();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateIcon);
  }

  /* ── Share buttons ────────────────────────────────────────────────── */
  const HOMEPAGE_SOCIAL_SHARE_PAGES = [
    'share-homepage-1.html',
    'share-homepage-2.html',
    'share-homepage-3.html',
    'share-homepage-4.html',
    'share-homepage-5.html',
    'share-homepage-6.html',
  ];
  const HOMEPAGE_SOCIAL_SHARE_STORAGE_PREFIX = 'press-homepage-social-share';
  const BELOW_FOLD_SCROLL_STORY_ASSET_CACHE = new Map();
  const ARTICLE_SCROLL_VIDEO_DURATION_MULTIPLIER = (1778 / 1125) / (1.05 * 1.10);
  const ARTICLE_SCROLL_STORY_PAGE_FILL_SCALE = 1.08;
  const ARTICLE_SCROLL_STORY_MOBILE_SHARE_LIMIT_BYTES = 180 * 1024 * 1024;
  const ARTICLE_SCROLL_READER_LIMITS = Object.freeze({
    maxSections: 14,
    maxFigureSections: 7,
    maxParagraphsPerSection: 4,
    stripScale: 2.5,
    maxCanvasHeight: 20000,
    heroImageMinHeight: 280,
    heroImageMaxHeight: 520,
    sectionImageMinHeight: 210,
    sectionImageMaxHeight: 470,
    paragraphExcerptCharacters: 320,
    captureScaleMin: 1.15,
    captureScaleMax: 1.45,
    captureAreaBudget: 14000000,
    minDurationSeconds: 15,
    maxDurationSeconds: 45,
    scrollPixelsPerSecond: 280,
    frameRate: 30,
    videoBitsPerSecond: 24000000,
  });
  const ARTICLE_CONTINUOUS_SCROLL_READER_LIMITS = Object.freeze({
    maxSections: 26,
    maxFigureSections: 26,
    maxParagraphsPerSection: 1,
    paragraphExcerptCharacters: 220,
    stripScale: 2.72,
    maxCanvasHeight: 30000,
    heroImageMinHeight: 250,
    heroImageMaxHeight: 500,
    sectionImageMinHeight: 300,
    sectionImageMaxHeight: 560,
    captureScaleMin: 1.45,
    captureScaleMax: 1.7,
    captureAreaBudget: 26000000,
    maxFlattenedCanvasArea: 24000000,
    maxFlattenedCanvasHeight: 32000,
    minDurationSeconds: 107,
    maxDurationSeconds: 127,
    scrollPixelsPerSecond: 269,
    frameRate: 30,
    videoBitsPerSecond: 16000000,
    mobileVideoBitsPerSecond: 8000000,
  });
  const BELOW_FOLD_SCROLL_STORY_CRITERIA = Object.freeze({
    maxCards: 12,
    maxStripHeight: 10800,
    baseStripHeight: 1450,
    perCardStripHeight: 690,
    stripEndPadding: 360,
    imageCardHeight: 710,
    textCardHeight: 520,
    cardImageHeight: 260,
    maxTextBlocks: 2,
    maxFactChips: 3,
    minDurationSeconds: 14,
    maxDurationSeconds: 44,
    scrollPixelsPerSecond: 305,
    frameRate: 60,
    videoBitsPerSecond: 52000000,
  });

  function injectShareButtons() {
    const belowFoldIssueHeader = document.querySelector('.page-below-fold-issue .below-fold-issue-page__masthead');
    const belowFoldIssueNav = document.querySelector('.page-below-fold-issue .below-fold-issue-nav');
    const articleHero = document.querySelector('.article-hero');
    const articleFolioShare = articleHero?.querySelector('[data-article-folio-share]');
    const articlePageShare = document.querySelector('[data-article-page-share]');
    const articleMeta = articleHero?.querySelector('.article-meta');
    const articleBody = document.querySelector('[data-article-body], .article-body, .generated-story');
    const articleHeadline = document.querySelector('.article-headline, .article-title, h1');
    const homeIntro = document.querySelector('.page-home .home-hero__intro');
    const contextType = belowFoldIssueHeader
      ? 'belowFoldIssue'
      : (articleHero || articleBody || articleHeadline) && !document.body.classList.contains('page-home')
      ? 'article'
      : (homeIntro ? 'site' : '');
    const target = belowFoldIssueNav || belowFoldIssueHeader || articlePageShare || articleFolioShare || articleMeta || articleBody || homeIntro;
    if (!contextType || !target) return;

    const context = buildShareContext(contextType);
    document.querySelectorAll('[data-press-share-row]').forEach((row) => {
      const staleType = row.getAttribute('data-press-share-row') !== contextType;
      const staleUrl = row.getAttribute('data-share-url') !== context.url;
      const staleTarget = !target.contains(row) && row.parentElement !== target.parentElement;
      if (staleType || staleUrl || staleTarget) row.remove();
    });
    if (document.querySelector('[data-press-share-row]')) return;

    const shareRow = document.createElement('nav');
    shareRow.className = `share-row share-row--${shareContextClassName(contextType)}`;
    shareRow.setAttribute('aria-label', context.ariaLabel);
    shareRow.setAttribute('data-press-share-row', contextType);
    shareRow.setAttribute('data-share-url', context.url);
    shareRow.innerHTML = buildShareRowMarkup(context);

    if (belowFoldIssueHeader || articlePageShare || articleFolioShare) {
      target.appendChild(shareRow);
    } else if (articleMeta) {
      articleMeta.insertAdjacentElement('afterend', shareRow);
    } else if (articleBody) {
      articleBody.insertAdjacentElement('afterend', shareRow);
    } else {
      homeIntro.appendChild(shareRow);
    }

    bindShareRow(shareRow, context);
  }

  function injectBelowFoldFlipperStoryButtons() {
    document.querySelectorAll('[data-below-fold-flipper]').forEach((flipper) => {
      if (flipper.querySelector('[data-below-fold-story-share]')) return;
      const toolbar = flipper.querySelector('.below-fold-flipper__toolbar');
      if (!toolbar) return;

      const shareBar = document.createElement('div');
      shareBar.className = 'below-fold-flipper__story-share';
      shareBar.setAttribute('data-below-fold-story-share', '');
      shareBar.innerHTML = `
        <span class="below-fold-flipper__story-label">Share scroll</span>
        <div class="below-fold-flipper__story-buttons">
          ${buildBelowFoldScrollStoryButtons('below-fold-flipper__story-button', 'data-below-fold-scroll-story')}
        </div>
      `;

      shareBar.querySelectorAll('[data-below-fold-scroll-story]').forEach((button) => button.addEventListener('click', (event) => {
        event.preventDefault();
        const context = buildBelowFoldFlipperShareContext(flipper);
        if (!context) return;
        openInstagramStoryStudio(shareBar, withScrollStoryPlatform(context, button.dataset.belowFoldScrollStory));
      }));

      toolbar.insertAdjacentElement('afterend', shareBar);
    });
  }

  function shareContextClassName(type) {
    return type === 'belowFoldIssue' ? 'below-fold-issue' : type;
  }

  function setupShareButtonRefresh() {
    let timer = 0;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        injectShareButtons();
        injectBelowFoldFlipperStoryButtons();
      }, 80);
    };
    window.addEventListener('pageshow', refresh);
    window.addEventListener('popstate', refresh);
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('a[href]');
      if (!link || link.target || link.origin !== window.location.origin) return;
      window.setTimeout(() => {
        injectShareButtons();
        injectBelowFoldFlipperStoryButtons();
      }, 180);
      window.setTimeout(() => {
        injectShareButtons();
        injectBelowFoldFlipperStoryButtons();
      }, 600);
    });
  }

  function buildShareContext(type) {
    const headline = (type === 'belowFoldIssue'
      ? document.querySelector('#below-fold-issue-page-title')?.textContent
      : '')
      || document.querySelector('.article-headline')?.textContent
      || document.querySelector('meta[property="og:title"]')?.content
      || document.title
      || 'The Press';
    const title = collapseWhitespace(headline.replace(/\s+[—-]\s+The Press.*$/i, '')) || 'The Press';
    const description = collapseWhitespace(document.querySelector('meta[name="description"]')?.content || '');
    const url = getCleanShareUrl();
    const issueMeta = collapseWhitespace(document.querySelector('.below-fold-issue-page__meta')?.textContent || '');
    return {
      type,
      title: type === 'site' ? 'The Press' : title,
      text: description || (type === 'site' ? 'AI powered news from The Press.' : title),
      url,
      imageUrl: getShareImageUrl(),
      externalImageUrl: getShareImageUrl({ preferPublic: true }),
      storyItems: type === 'site' ? getHomepageShareItems(4) : [],
      returnUrl: window.location.href,
      issueMeta,
      ariaLabel: type === 'site'
        ? 'Share this page'
        : (type === 'belowFoldIssue' ? 'Share this issue' : 'Share this article'),
    };
  }

  function buildBelowFoldFlipperShareContext(flipper) {
    const root = flipper?.querySelector('[data-below-fold-sheet] [data-below-fold-root]');
    if (!root) return null;
    const deck = readBelowFoldFlipperDeck(flipper);
    const currentSlug = collapseWhitespace(flipper.dataset.currentSlug || '');
    const activeIssue = deck?.issues?.find((issue) => issue.slug === currentSlug) || null;
    const title = collapseWhitespace(activeIssue?.title || root.querySelector('h2, h3')?.textContent || 'Below the Fold');
    const text = collapseWhitespace(
      activeIssue?.dek
      || root.querySelector('.below-fold-header p:not(.below-fold-kicker), header p:not(.below-fold-kicker)')?.textContent
      || 'A scrollable Below the Fold issue from The Press.'
    );
    const issueMeta = [activeIssue?.issueLabel, activeIssue?.dateLabel]
      .map(collapseWhitespace)
      .filter(Boolean)
      .join(' / ')
      || collapseWhitespace(flipper.querySelector('[data-below-fold-counter]')?.textContent || '');
    const issuePath = collapseWhitespace(activeIssue?.url || 'below-the-fold.html');
    const shareBase = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname)
      ? 'https://thepress.live/'
      : window.location.href;
    const url = new URL(issuePath, shareBase).href;
    const imageNode = root.querySelector('img');
    const imageUrl = normalizeShareAssetUrl(imageNode?.currentSrc || imageNode?.getAttribute('src') || '');

    return {
      type: 'belowFoldIssue',
      title,
      text,
      url,
      imageUrl,
      externalImageUrl: imageUrl,
      storyItems: [],
      returnUrl: window.location.href,
      issueMeta,
      belowFoldRoot: root.cloneNode(true),
      ariaLabel: 'Share this issue',
    };
  }

  function readBelowFoldFlipperDeck(flipper) {
    const script = flipper?.querySelector('[data-below-fold-issue-deck]');
    if (!script) return null;
    try {
      const data = JSON.parse(script.textContent || '{}');
      return Array.isArray(data.issues) ? data : null;
    } catch (_) {
      return null;
    }
  }

  function getCleanShareUrl() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (canonical) return canonical;
    const ogUrl = document.querySelector('meta[property="og:url"]')?.content
      || document.querySelector('meta[name="twitter:url"]')?.content;
    if (ogUrl) return ogUrl;
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.href;
  }

  function getShareImageUrl(options = {}) {
    const pageMetadataSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
    ];
    const visibleImageSelectors = [
      '.page-below-fold-issue [data-below-fold-root] img',
      '.page-below-fold-issue .below-fold-issue-page__paper img',
      '.article-hero .hero-figure img',
      '.article-hero img',
      '.lead-panel.is-active img',
      '.story-card img',
    ];
    const imageSelectors = options.preferPublic
      ? [...pageMetadataSelectors, ...visibleImageSelectors]
      : [...visibleImageSelectors, ...pageMetadataSelectors];

    for (const selector of imageSelectors) {
      const node = document.querySelector(selector);
      const raw = node?.tagName === 'META'
        ? node.getAttribute('content')
        : node?.currentSrc || node?.getAttribute('src');
      const url = normalizeShareAssetUrl(raw, options);
      if (url) return url;
    }

    return '';
  }

  function getHomepageShareItems(limit = 4) {
    if (!document.body.classList.contains('page-home')) return [];
    const candidates = [];
    const seen = new Set();
    document.querySelectorAll('.lead-panel, .story-card, .archive-card, .river-item, [data-story-url]').forEach((card) => {
      const titleNode = card.querySelector('.story-card__title, h1, h2, h3, strong');
      const link = titleNode?.querySelector('a[href]')
        || card.querySelector('a[href$=".html"], a[href*=".html?"]')
        || (card.matches('a[href]') ? card : null);
      const url = link?.href || card.dataset.storyUrl || '';
      const title = collapseWhitespace(titleNode?.textContent || link?.textContent || '');
      if (!url || !title || seen.has(url)) return;
      const img = card.querySelector('img');
      const imageUrl = normalizeShareAssetUrl(img?.currentSrc || img?.getAttribute('src') || '');
      if (!imageUrl) return;
      const section = collapseWhitespace(card.querySelector('.eyebrow, [data-section], .story-card__meta, .lead-panel__meta')?.textContent || '')
        .split(/[•/]/)[0]
        .trim();
      seen.add(url);
      candidates.push({
        title,
        section: section || 'Story',
        imageUrl,
      });
    });

    return shuffleShareItems(candidates).slice(0, limit);
  }

  function shuffleShareItems(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function normalizeShareAssetUrl(rawUrl, options = {}) {
    if (!rawUrl) return '';
    try {
      const parsed = new URL(rawUrl, document.baseURI || window.location.href);
      const isPressLiveAsset = /(^|\.)thepress\.live$/i.test(parsed.hostname);
      const isLocalPreview = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
      if (isPressLiveAsset && isLocalPreview && !options.preferPublic) {
        return new URL(`${parsed.pathname}${parsed.search}`, document.baseURI || window.location.href).href;
      }
      return parsed.href;
    } catch (_) {
      return '';
    }
  }

  function buildShareRowMarkup(context) {
    const intent = buildShareIntents(context);
    if (context.type === 'belowFoldIssue') return buildBelowFoldIssueShareRowMarkup();
    const instagramLabel = context.type === 'belowFoldIssue'
      ? 'Make an Instagram Story scroll video'
      : 'Make an Instagram Story image';
    const instagramTitle = context.type === 'belowFoldIssue' ? 'Instagram Story scroll' : 'Instagram Story';
    return `
      <div class="share-row__buttons">
        <button class="share-btn share-btn--x" type="button" data-share-platform="x" data-share-target="${escapeAttribute(intent.x)}" aria-label="Share on X" title="X">${sharePlatformIcon('x')}<span class="sr-only">X</span></button>
        <button class="share-btn share-btn--instagram" type="button" data-share-platform="instagram" aria-label="${escapeAttribute(instagramLabel)}" title="${escapeAttribute(instagramTitle)}">${sharePlatformIcon('instagram')}<span class="sr-only">${escapeHtml(instagramTitle)}</span></button>
        <button class="share-btn share-btn--facebook" type="button" data-share-platform="facebook" data-share-target="${escapeAttribute(intent.facebook)}" aria-label="Share on Facebook" title="Facebook">${sharePlatformIcon('facebook')}<span class="sr-only">Facebook</span></button>
        <button class="share-btn share-btn--whatsapp" type="button" data-share-platform="whatsapp" data-share-target="${escapeAttribute(intent.whatsapp)}" aria-label="Share on WhatsApp" title="WhatsApp">${sharePlatformIcon('whatsapp')}<span class="sr-only">WhatsApp</span></button>
        <button class="share-btn share-btn--sms" type="button" data-share-platform="sms" data-share-target="${escapeAttribute(intent.sms)}" aria-label="Share by message" title="Messages">${sharePlatformIcon('sms')}<span class="sr-only">Messages</span></button>
        <button class="share-btn share-btn--reddit" type="button" data-share-platform="reddit" data-share-target="${escapeAttribute(intent.reddit)}" aria-label="Share on Reddit" title="Reddit">${sharePlatformIcon('reddit')}<span class="sr-only">Reddit</span></button>
        <button class="share-btn share-btn--discord" type="button" data-share-platform="discord" data-share-target="${escapeAttribute(intent.discord)}" aria-label="Share on Discord" title="Discord">${sharePlatformIcon('discord')}<span class="sr-only">Discord</span></button>
        <button class="share-btn share-btn--copy" type="button" data-share-platform="copy" aria-label="Copy share link" title="Copy link">${sharePlatformIcon('copy')}<span class="sr-only">Copy link</span></button>
      </div>
      ${context.type === 'article' ? buildArticleScrollStoryChoiceMarkup() : ''}
      <p class="share-row__status" data-share-status aria-live="polite"></p>
    `;
  }

  function buildArticleScrollStoryChoiceMarkup() {
    return `
      <details class="share-row__scroll-choice" data-share-scroll-choice>
        <summary aria-label="Choose an article scroll video platform" title="Article scroll">
          ${sharePlatformIcon('scroll')}
          <span>Scroll</span>
        </summary>
        <div class="share-row__buttons share-row__buttons--scroll-video" aria-label="Share article scroll video">
          ${buildBelowFoldScrollStoryButtons('share-btn', 'data-share-scroll-story', 'article')}
        </div>
      </details>
    `;
  }

  function buildBelowFoldIssueShareRowMarkup() {
    return `
      <div class="share-row__buttons share-row__buttons--scroll-video" aria-label="Share scrolling issue video">
        ${buildBelowFoldScrollStoryButtons('share-btn', 'data-share-scroll-story')}
        <button class="share-btn share-btn--copy" type="button" data-share-platform="copy" aria-label="Copy issue link" title="Copy link">${sharePlatformIcon('copy')}<span class="sr-only">Copy link</span></button>
      </div>
      <p class="share-row__status" data-share-status aria-live="polite"></p>
    `;
  }

  function buildBelowFoldScrollStoryButtons(buttonClassName, dataAttributeName, subject = 'issue') {
    return getBelowFoldScrollStoryPlatforms(subject).map((item) => `
      <button class="${escapeAttribute(buttonClassName)} ${escapeAttribute(buttonClassName === 'share-btn' ? `share-btn--${item.platform}` : `${buttonClassName}--${item.platform}`)}" type="button" data-share-platform="${escapeAttribute(item.platform)}" ${dataAttributeName}="${escapeAttribute(item.platform)}" aria-label="${escapeAttribute(item.ariaLabel)}" title="${escapeAttribute(item.title)}">
        ${sharePlatformIcon(item.platform)}
        <span class="sr-only">${escapeHtml(item.title)}</span>
      </button>
    `).join('');
  }

  function getBelowFoldScrollStoryPlatforms(subject = 'issue') {
    const isArticle = subject === 'article';
    const titleNoun = 'scroll video';
    const ariaNoun = isArticle ? 'scrolling article video' : 'scrolling issue video';
    return [
      { platform: 'x', title: `X ${titleNoun}`, ariaLabel: `Make a ${ariaNoun} for X or Twitter` },
      { platform: 'instagram', title: `Instagram Story scroll`, ariaLabel: `Make a ${ariaNoun} for Instagram Stories` },
      { platform: 'facebook', title: `Facebook ${titleNoun}`, ariaLabel: `Make a ${ariaNoun} for Facebook` },
      { platform: 'sms', title: `Message ${titleNoun}`, ariaLabel: `Make a ${ariaNoun} for Messages` },
    ];
  }

  function withScrollStoryPlatform(context, platform) {
    return {
      ...context,
      scrollStoryPlatform: getScrollStoryPlatformMeta(platform).platform,
    };
  }

  function sharePlatformIcon(platform) {
    const icons = {
      x: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M18.24 2.25h3.31l-7.23 8.26 8.51 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.84L7.08 4.13H5.12l11.96 15.64Z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" focusable="false"><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.35" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.8" cy="7.35" r="1.05" fill="currentColor"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v6h4v-6h3.1l.9-4h-4V9c0-.6.4-1 1-1Z"/></svg>',
      whatsapp: '<svg viewBox="0 0 24 24" focusable="false"><path d="M20.5 11.8a8.3 8.3 0 0 1-12.3 7.3L4 20.3l1.3-4A8.3 8.3 0 1 1 20.5 11.8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path fill="currentColor" d="M8.9 7.6c.3-.3.7-.3 1 0l1 1.4c.2.3.2.6 0 .9l-.5.7c.7 1.4 1.8 2.4 3.2 3.1l.7-.5c.3-.2.7-.2.9 0l1.4 1c.3.2.4.7.1 1-.4.6-1.1 1-1.9.9-3.4-.3-6.4-3.3-6.8-6.7-.1-.8.3-1.5.9-1.8Z"/></svg>',
      reddit: '<svg viewBox="0 0 24 24" focusable="false"><path d="M18.8 10.2c.9 0 1.7.7 1.7 1.7 0 .6-.3 1.1-.8 1.4.1.4.2.7.2 1.1 0 2.8-3.5 5.1-7.9 5.1s-7.9-2.3-7.9-5.1c0-.4.1-.8.2-1.1-.5-.3-.8-.8-.8-1.4 0-.9.8-1.7 1.7-1.7.5 0 .9.2 1.2.5 1.3-.8 3.1-1.3 5-1.4l.9-4.2 3 .7c.2-.6.8-1.1 1.5-1.1.9 0 1.6.7 1.6 1.6S17.7 8 16.8 8c-.6 0-1.1-.3-1.4-.8l-2.1-.5-.6 2.7c1.9.1 3.6.6 4.9 1.4.3-.4.7-.6 1.2-.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9.2" cy="13.8" r="1" fill="currentColor"/><circle cx="14.8" cy="13.8" r="1" fill="currentColor"/><path d="M9.5 16.4c1.3.8 3.7.8 5 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      sms: '<svg viewBox="0 0 24 24" focusable="false"><path d="M5 5.5h14a2.5 2.5 0 0 1 2.5 2.5v6.6a2.5 2.5 0 0 1-2.5 2.5h-5.8L8.7 20v-2.9H5a2.5 2.5 0 0 1-2.5-2.5V8A2.5 2.5 0 0 1 5 5.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h10M7 13.5h6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      messenger: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 4C7.3 4 3.7 7.3 3.7 11.6c0 2.3 1 4.3 2.7 5.7v2.8l2.6-1.4c.9.3 1.9.5 3 .5 4.7 0 8.3-3.3 8.3-7.6S16.7 4 12 4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path fill="currentColor" d="m7.6 14 3.3-3.5 2.3 2.2 3.5-3.8-3.3 5.2-2.4-2.2L7.6 14Z"/></svg>',
      discord: '<svg viewBox="0 0 24 24" focusable="false"><path d="M7.4 7.9c2.9-1.1 6.3-1.1 9.2 0l1.1 7.4c-1.7 1.4-3.5 2.1-5.7 2.1s-4-.7-5.7-2.1l1.1-7.4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="9.9" cy="12.2" r="1.1" fill="currentColor"/><circle cx="14.1" cy="12.2" r="1.1" fill="currentColor"/><path d="M10 15c1.2.6 2.8.6 4 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      copy: '<svg viewBox="0 0 24 24" focusable="false"><rect x="8" y="8" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      scroll: '<svg viewBox="0 0 24 24" focusable="false"><path d="M7 4h10a2 2 0 0 1 2 2v10.5A3.5 3.5 0 0 1 15.5 20H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 17.5l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    return `<span class="share-btn__icon" aria-hidden="true">${icons[platform] || icons.copy}</span>`;
  }

  function buildShareIntents(context) {
    const xDestination = getSocialShareDestination(context, 'x');
    const facebookDestination = getSocialShareDestination(context, 'facebook');
    const encodedUrl = encodeURIComponent(context.url);
    const encodedXUrl = encodeURIComponent(xDestination);
    const encodedFacebookUrl = encodeURIComponent(facebookDestination);
    const encodedTitle = encodeURIComponent(context.title);
    const encodedText = encodeURIComponent(`${context.title} ${context.url}`);
    return {
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedXUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedFacebookUrl}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodedText}`,
      sms: `sms:?&body=${encodedText}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      discord: 'https://discord.com/channels/@me',
    };
  }

  function getSocialShareDestination(context, platform) {
    if (context.type !== 'site' || !['x', 'facebook'].includes(platform)) return context.url;
    const selection = getRotatingHomepageSocialShareSelection(platform);
    const url = new URL(selection.page, context.url);
    url.searchParams.set('share', buildHomepageShareCacheKey(platform, selection.index));
    return url.href;
  }

  function getRotatingHomepageSocialShareSelection(platform) {
    const pages = HOMEPAGE_SOCIAL_SHARE_PAGES;
    if (!pages.length) return { page: 'index.html', index: 0 };
    const storageKey = `${HOMEPAGE_SOCIAL_SHARE_STORAGE_PREFIX}:${platform}:last-index`;
    const lastIndex = getStoredShareIndex(storageKey);
    const index = lastIndex >= 0 ? (lastIndex + 1) % pages.length : 0;
    storeShareIndex(storageKey, index);
    return { page: pages[index], index };
  }

  function getStoredShareIndex(key) {
    try {
      const value = window.localStorage?.getItem(key) ?? window.sessionStorage?.getItem(key);
      const parsed = Number.parseInt(value || '', 10);
      return Number.isFinite(parsed) ? parsed : -1;
    } catch (_) {
      return -1;
    }
  }

  function storeShareIndex(key, index) {
    try {
      window.localStorage?.setItem(key, String(index));
    } catch (_) {}
    try {
      window.sessionStorage?.setItem(key, String(index));
    } catch (_) {}
  }

  function buildHomepageShareCacheKey(platform, index) {
    const nonce = getRandomShareIndex(0xffffffff).toString(36);
    return `${platform}-${index + 1}-${Date.now().toString(36)}-${nonce}`;
  }

  function getRandomShareIndex(max) {
    if (!max) return 0;
    try {
      const values = new Uint32Array(1);
      window.crypto?.getRandomValues(values);
      return values[0] % max;
    } catch (_) {
      return Math.floor(Math.random() * max);
    }
  }

  function bindShareRow(row, context) {
    row.querySelectorAll('[data-share-platform]').forEach((control) => {
      if (control.dataset.shareScrollStory) {
        const prewarm = () => scheduleBelowFoldScrollStoryPrewarm(withScrollStoryPlatform(context, control.dataset.shareScrollStory));
        control.addEventListener('pointerenter', prewarm, { once: true });
        control.addEventListener('focus', prewarm, { once: true });
        control.addEventListener('touchstart', prewarm, { once: true, passive: true });
      }
      control.addEventListener('click', async (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (control.dataset.shareScrollStory) {
          event.preventDefault();
          control.closest('[data-share-scroll-choice]')?.removeAttribute('open');
          openInstagramStoryStudio(row, withScrollStoryPlatform(context, control.dataset.shareScrollStory));
          return;
        }
        if (control.dataset.sharePlatform === 'copy') {
          event.preventDefault();
          const copied = await copyShareText(context);
          if (copied) {
            clearManualCopyText(row);
            setShareStatus(row, 'Link copied');
          } else {
            showManualCopyText(row, context);
            setShareStatus(row, 'Link selected. Press Ctrl+C or Command+C to copy.');
          }
          return;
        }
        if (control.dataset.sharePlatform === 'instagram') {
          event.preventDefault();
          openInstagramStoryStudio(row, context);
          return;
        }
        const shareTarget = control.dataset.shareTarget || control.getAttribute('href') || '';
        if (shareTarget) {
          const platform = control.dataset.sharePlatform;
          if (['x', 'facebook'].includes(platform)) {
            control.dataset.shareTarget = buildShareIntents(context)[platform] || control.dataset.shareTarget || shareTarget;
          }
          event.preventDefault();
          const label = getSharePlatformLabel(platform);
          let copiedForDiscord = false;
          if (platform === 'discord') {
            copiedForDiscord = copyShareTextImmediately(context);
          }
          const opened = openShareWindow(control.dataset.shareTarget || shareTarget);
          if (platform === 'discord') {
            const openingMessage = opened ? 'Discord opened in a new tab' : 'If nothing opened, this browser blocked the new tab.';
            const copiedMessage = copiedForDiscord ? `Link copied. ${openingMessage}` : openingMessage;
            setShareStatus(row, copiedMessage);
            copyShareText(context).then((asyncCopied) => {
              setShareStatus(row, asyncCopied || copiedForDiscord ? `Link copied. ${openingMessage}` : openingMessage);
            });
            return;
          }
          if (opened) {
            setShareStatus(row, `Opening ${label} in a new tab`);
          } else {
            const copied = await copyShareText(context);
            setShareStatus(row, copied ? `${label} blocked. Share text copied instead.` : 'If nothing opened, this browser blocked the new tab.');
          }
        }
      });
    });
    scheduleBelowFoldScrollStoryPrewarm(context);
  }

  function getSharePlatformLabel(platform) {
    const labels = {
      x: 'X',
      instagram: 'Instagram',
      facebook: 'Facebook',
      whatsapp: 'WhatsApp',
      sms: 'Messages',
      reddit: 'Reddit',
      discord: 'Discord',
    };
    return labels[platform] || 'share';
  }

  function openShareWindow(url) {
    try {
      const shareWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!shareWindow) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function openInstagramStoryStudio(row, context) {
    clearManualCopyText(row);
    let storyContext = context.type === 'site' ? buildShareContext('site') : context;
    const modal = ensureInstagramStoryStudio();
    const canvas = modal.querySelector('[data-instagram-story-canvas]');
    const video = modal.querySelector('[data-instagram-story-video]');
    const status = modal.querySelector('[data-instagram-story-status]');
    const scrollStoryMode = isBelowFoldScrollStoryContext(storyContext);
    configureInstagramStoryStudioMode(modal, storyContext);
    const initialStyleKey = getInstagramStorySelectedStyleKey(modal, storyContext);
    if (scrollStoryMode) storyContext = withBelowFoldScrollStoryColorway(storyContext, initialStyleKey);
    modal._pressInstagramStoryContext = storyContext;
    modal.hidden = false;
    document.documentElement.classList.add('press-instagram-story-open');
    modal.querySelector('[data-instagram-story-close]')?.focus({ preventScroll: true });
    if (scrollStoryMode) {
      renderBelowFoldScrollStoryPreview(modal, storyContext, canvas, video, status, initialStyleKey);
    } else {
      renderInstagramStoryPreview(modal, storyContext, canvas, status, initialStyleKey);
    }

    modal.querySelectorAll('[data-instagram-story-style]').forEach((button) => {
      button.onclick = () => {
        const styleKey = button.dataset.instagramStoryStyle || getInstagramStorySelectedStyleKey(modal, storyContext);
        if (isBelowFoldScrollStoryContext(storyContext)) {
          storyContext = withBelowFoldScrollStoryColorway(storyContext, styleKey);
          modal._pressInstagramStoryContext = storyContext;
          renderBelowFoldScrollStoryPreview(modal, storyContext, canvas, video, status, styleKey);
          return;
        }
        renderInstagramStoryPreview(modal, storyContext, canvas, status, styleKey);
      };
    });

    modal.querySelector('[data-instagram-story-download]').onclick = async () => {
      if (isBelowFoldScrollStoryContext(storyContext) && modal._pressInstagramStoryAsset?.kind === 'video') {
        await saveInstagramStoryStudioAsset(modal, canvas, storyContext, status);
        return;
      }
      await ensureInstagramStoryReady(modal, status);
      if (isBelowFoldScrollStoryContext(storyContext)) {
        await saveInstagramStoryStudioAsset(modal, canvas, storyContext, status);
        return;
      }
      await saveInstagramStoryCanvas(canvas, storyContext, status);
    };
    modal.querySelector('[data-instagram-story-native]').onclick = async () => {
      await ensureInstagramStoryReady(modal, status);
      if (isBelowFoldScrollStoryContext(storyContext)) {
        await nativeShareInstagramStoryStudioAsset(modal, canvas, storyContext, status);
        return;
      }
      await nativeShareInstagramStoryCanvas(canvas, storyContext, status);
    };
    modal.querySelector('[data-instagram-story-open]').onclick = async (event) => {
      event.preventDefault();
      await ensureInstagramStoryReady(modal, status);
      if (isBelowFoldScrollStoryContext(storyContext)) {
        await openInstagramStoryWithStudioAsset(modal, canvas, storyContext, status);
        return;
      }
      const isMobile = isMobileShareDevice();
      if (isMobile) {
        const shared = await shareInstagramStoryFile(canvas, storyContext, status);
        if (shared) return;
        const copied = await copyShareText(storyContext);
        window.location.href = 'instagram://story-camera';
        window.setTimeout(() => {
          if (!document.hidden) openShareWindow('https://www.instagram.com/');
        }, 900);
        setInstagramStoryStatus(status, copied
          ? 'Instagram Story opened. Link copied for a sticker.'
          : 'Instagram Story opened. Use Save image if the image is not attached.');
      } else {
        startInstagramStoryDownloadFromCanvas(canvas, getInstagramStoryFilename(storyContext), status, 'Story PNG download started. Instagram is opening.');
        const copied = await copyShareText(storyContext);
        openShareWindow('https://www.instagram.com/');
        setInstagramStoryStatus(status, copied
          ? 'Instagram opened. PNG downloaded and link copied for a sticker.'
          : 'Instagram opened. PNG downloaded; upload it from your device.');
      }
    };
  }

  function isBelowFoldScrollStoryContext(context) {
    return Boolean(context?.scrollStoryPlatform);
  }

  function withBelowFoldScrollStoryColorway(context, colorwayKey) {
    const colorway = getBelowFoldScrollStoryColorway(colorwayKey);
    return {
      ...context,
      scrollStoryColorway: colorway.key,
    };
  }

  function getScrollStoryPlatformMeta(platform) {
    const key = String(platform || 'instagram').toLowerCase();
    const platforms = {
      instagram: {
        platform: 'instagram',
        label: 'Instagram',
        kicker: 'Instagram scroll video',
        openLabel: 'Instagram Story',
        fallbackUrl: 'https://www.instagram.com/',
      },
      facebook: {
        platform: 'facebook',
        label: 'Facebook',
        kicker: 'Facebook scroll video',
        openLabel: 'Facebook',
        fallbackUrl: 'https://www.facebook.com/',
      },
      x: {
        platform: 'x',
        label: 'X / Twitter',
        kicker: 'X / Twitter scroll video',
        openLabel: 'X / Twitter',
        fallbackUrl: 'https://twitter.com/compose/tweet',
      },
      sms: {
        platform: 'sms',
        label: 'Messages',
        kicker: 'Message scroll video',
        openLabel: 'Messages',
        fallbackUrl: '',
      },
    };
    return platforms[key] || platforms.instagram;
  }

  function getBelowFoldScrollStoryAssetCacheKey(context) {
    const platform = getScrollStoryPlatformMeta(context?.scrollStoryPlatform).platform;
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    return [
      context?.url || window.location.href,
      context?.title || document.title || 'The Press',
      platform,
      colorway.key,
    ].join('::');
  }

  function getCachedBelowFoldScrollStoryAssetPromise(context) {
    const entry = BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.get(getBelowFoldScrollStoryAssetCacheKey(context));
    if (!entry) return null;
    if (entry.asset) return Promise.resolve(entry.asset);
    if (!entry.promise) return null;
    return Promise.race([
      entry.promise,
      new Promise((resolve) => window.setTimeout(() => resolve(null), 900)),
    ]);
  }

  function copyBelowFoldScrollStoryAssetForCache(asset) {
    if (!asset || asset.kind !== 'video' || !asset.blob?.size) return null;
    return {
      kind: 'video',
      blob: asset.blob,
      mimeType: asset.mimeType || asset.blob.type || 'video/webm',
      filename: asset.filename,
    };
  }

  function rememberBelowFoldScrollStoryAsset(context, asset) {
    if (isContinuousArticleScrollContext(context)) return;
    const cachedAsset = copyBelowFoldScrollStoryAssetForCache(asset);
    if (!cachedAsset) return;
    BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.set(getBelowFoldScrollStoryAssetCacheKey(context), { asset: cachedAsset });
  }

  function scheduleBelowFoldScrollStoryPrewarm(context) {
    if (!isBelowFoldScrollStoryContext(context)) return;
    if (isContinuousArticleScrollContext(context)) return;
    const platform = getScrollStoryPlatformMeta(context?.scrollStoryPlatform).platform;
    const colorContext = withBelowFoldScrollStoryColorway(
      withScrollStoryPlatform(context, platform),
      getDefaultBelowFoldScrollStoryColorwayKey()
    );
    const key = getBelowFoldScrollStoryAssetCacheKey(colorContext);
    if (BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.has(key)) return;

    const start = () => prewarmBelowFoldScrollStoryAsset(key, colorContext);
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 10000 });
    } else {
      window.setTimeout(start, 8000);
    }
  }

  function prewarmBelowFoldScrollStoryAsset(key, context) {
    if (BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.has(key)) return;
    const canvas = document.createElement('canvas');
    const promise = createBelowFoldScrollStoryAsset(null, context, canvas, null).then((asset) => {
      const cachedAsset = copyBelowFoldScrollStoryAssetForCache(asset);
      if (asset?.url) URL.revokeObjectURL(asset.url);
      if (cachedAsset) {
        BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.set(key, { asset: cachedAsset });
        return cachedAsset;
      }
      BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.delete(key);
      return null;
    }).catch((error) => {
      BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.delete(key);
      console.warn('Below the Fold scroll story prebuild unavailable.', error);
      return null;
    });
    BELOW_FOLD_SCROLL_STORY_ASSET_CACHE.set(key, { promise });
  }

  function configureInstagramStoryStudioMode(modal, context) {
    if (!modal) return;
    const scrollStoryMode = isBelowFoldScrollStoryContext(context);
    const platform = getScrollStoryPlatformMeta(context?.scrollStoryPlatform);
    const kicker = modal.querySelector('[data-instagram-story-kicker]');
    modal.classList.toggle('press-instagram-story--video', scrollStoryMode);
    modal.classList.toggle('press-instagram-story--still', !scrollStoryMode);
    modal.classList.toggle('press-instagram-story--issue-video', scrollStoryMode);
    const title = modal.querySelector('#instagram-story-title');
    const nativeButton = modal.querySelector('[data-instagram-story-native]');
    const downloadButton = modal.querySelector('[data-instagram-story-download]');
    const openButton = modal.querySelector('[data-instagram-story-open]');
    const canvas = modal.querySelector('[data-instagram-story-canvas]');
    const video = modal.querySelector('[data-instagram-story-video]');

    if (kicker) kicker.textContent = scrollStoryMode ? platform.kicker : 'Instagram Story';
    if (title) title.textContent = scrollStoryMode ? 'Scroll Video' : 'Story Preview';
    if (nativeButton) nativeButton.textContent = scrollStoryMode ? 'Share video' : 'Share image';
    if (downloadButton) downloadButton.textContent = scrollStoryMode ? 'Save video' : 'Save to device';
    if (openButton) openButton.textContent = scrollStoryMode ? platform.openLabel : 'Instagram Story';
    if (canvas) canvas.hidden = false;
    resetInstagramStoryPreviewVideo(video);

    if (modal._pressInstagramStoryVideoUrl) {
      URL.revokeObjectURL(modal._pressInstagramStoryVideoUrl);
      modal._pressInstagramStoryVideoUrl = '';
    }
    modal._pressInstagramStoryAsset = null;
    configureInstagramStoryStyleControls(modal, context);
  }

  function getBelowFoldScrollVideoProfile() {
    return {
      canvasWidth: 1080,
      canvasHeight: 1920,
      viewportWidth: 430,
      orientation: 'story',
    };
  }

  function ensureInstagramStoryStudio() {
    let modal = document.querySelector('[data-instagram-story-modal]');
    if (modal) return modal;

    modal = document.createElement('aside');
    modal.className = 'press-instagram-story';
    modal.setAttribute('data-instagram-story-modal', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'instagram-story-title');
    modal.hidden = true;
    modal.innerHTML = `
      <button class="press-instagram-story__scrim" type="button" data-instagram-story-close aria-label="Close Instagram Story maker"></button>
      <div class="press-instagram-story__panel" role="document">
        <div class="press-instagram-story__header">
          <div>
            <p data-instagram-story-kicker>Instagram Story</p>
            <h2 id="instagram-story-title">Story Preview</h2>
          </div>
          <button class="press-instagram-story__close" type="button" data-instagram-story-close>Close</button>
        </div>
        <div class="press-instagram-story__body">
          <div class="press-instagram-story__preview">
            <canvas width="1080" height="1920" data-instagram-story-canvas></canvas>
            <video controls autoplay playsinline muted hidden data-instagram-story-video></video>
          </div>
          <div class="press-instagram-story__side">
            <div class="press-instagram-story__styles" role="group" aria-label="Preview style" data-instagram-story-styles>
              ${buildInstagramStoryStyleButtons()}
            </div>
            <div class="press-instagram-story__actions">
              <button type="button" data-instagram-story-native>Share image</button>
              <button type="button" data-instagram-story-download>Save to device</button>
              <button type="button" data-instagram-story-open>Instagram Story</button>
              <p data-instagram-story-status aria-live="polite"></p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-instagram-story-close]').forEach((button) => {
      button.addEventListener('click', () => closeInstagramStoryStudio(modal));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeInstagramStoryStudio(modal);
    });

    return modal;
  }

  function closeInstagramStoryStudio(modal) {
    if (!modal) return;
    modal._pressInstagramStoryRenderId = (modal._pressInstagramStoryRenderId || 0) + 1;
    modal.hidden = true;
    hideBelowFoldLiveScrollPreview(modal);
    if (modal._pressInstagramStoryVideoUrl) {
      URL.revokeObjectURL(modal._pressInstagramStoryVideoUrl);
      modal._pressInstagramStoryVideoUrl = '';
    }
    resetInstagramStoryPreviewVideo(modal.querySelector('[data-instagram-story-video]'));
    modal._pressInstagramStoryAsset = null;
    modal._pressInstagramStoryReady = null;
    document.documentElement.classList.remove('press-instagram-story-open');
  }

  function configureInstagramStoryStyleControls(modal, context) {
    const group = modal?.querySelector('[data-instagram-story-styles]');
    if (!group) return;
    const scrollStoryMode = isBelowFoldScrollStoryContext(context);
    const styles = scrollStoryMode ? getBelowFoldScrollStoryColorways() : getInstagramStoryStyles();
    const selectedStyle = getInstagramStorySelectedStyleKey(modal, context);
    group.setAttribute('aria-label', scrollStoryMode ? 'Scroll video colorway' : 'Preview style');
    group.innerHTML = buildInstagramStoryStyleButtons(styles, selectedStyle, scrollStoryMode ? 'colorway' : 'style');
  }

  function getInstagramStorySelectedStyleKey(modal, context) {
    if (isBelowFoldScrollStoryContext(context)) {
      const colorway = getBelowFoldScrollStoryColorway(modal?._pressBelowFoldScrollStyle || context?.scrollStoryColorway);
      return colorway.key;
    }
    const style = getInstagramStoryStyle(modal?._pressInstagramStoryStyle || getDefaultInstagramStoryStyleKey());
    return style.key;
  }

  function buildInstagramStoryStyleButtons(styles = getInstagramStoryStyles(), selectedStyle = getDefaultInstagramStoryStyleKey(), labelSuffix = 'style') {
    return styles.map((style) => `
      <button class="press-instagram-story__style" type="button" data-instagram-story-style="${escapeAttribute(style.key)}" aria-label="${escapeAttribute(style.label)} ${escapeAttribute(labelSuffix)}" aria-pressed="${style.key === selectedStyle ? 'true' : 'false'}" title="${escapeAttribute(style.label)}">
        <span class="press-instagram-story__swatch press-instagram-story__swatch--${escapeAttribute(style.key)}" aria-hidden="true"></span>
        <span class="press-instagram-story__style-name">${escapeHtml(style.label)}</span>
      </button>
    `).join('');
  }

  function renderInstagramStoryPreview(modal, context, canvas, status, styleKey) {
    if (!modal || !canvas) return;
    const style = getInstagramStoryStyle(styleKey);
    const renderId = (modal._pressInstagramStoryRenderId || 0) + 1;
    modal._pressInstagramStoryRenderId = renderId;
    modal._pressInstagramStoryStyle = style.key;
    updateInstagramStoryStyleButtons(modal, style.key);
    setInstagramStoryStatus(status, 'Building story image...');
    setInstagramStoryActionsDisabled(modal, true);
    modal._pressInstagramStoryReady = drawInstagramStoryCanvas(context, canvas, style.key).then(() => {
      if (modal._pressInstagramStoryRenderId === renderId) setInstagramStoryStatus(status, 'Story image ready.');
      return true;
    }).catch(() => {
      if (modal._pressInstagramStoryRenderId === renderId) setInstagramStoryStatus(status, 'Story image ready with fallback art.');
      return false;
    }).finally(() => {
      if (modal._pressInstagramStoryRenderId === renderId) setInstagramStoryActionsDisabled(modal, false);
    });
  }

  function updateInstagramStoryStyleButtons(modal, styleKey) {
    modal.querySelectorAll('[data-instagram-story-style]').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.instagramStoryStyle === styleKey ? 'true' : 'false');
    });
  }

  function setInstagramStoryActionsDisabled(modal, disabled) {
    if (!modal) return;
    modal.querySelectorAll('.press-instagram-story__actions button').forEach((button) => {
      button.disabled = Boolean(disabled);
    });
  }

  function setInstagramStoryStyleControlsDisabled(modal, disabled) {
    if (!modal) return;
    modal.querySelectorAll('[data-instagram-story-style]').forEach((button) => {
      button.disabled = Boolean(disabled);
    });
  }

  async function ensureInstagramStoryReady(modal, status) {
    if (!modal?._pressInstagramStoryReady) return true;
    setInstagramStoryStatus(status, modal.classList.contains('press-instagram-story--video')
      ? 'Preparing scroll video...'
      : 'Preparing story image...');
    const ready = await modal._pressInstagramStoryReady;
    if (ready) {
      const asset = modal._pressInstagramStoryAsset;
      setInstagramStoryStatus(status, asset?.kind === 'video' ? 'Scroll video ready. Tap Save video.' : 'Story image ready.');
    }
    return ready;
  }

  function renderBelowFoldScrollStoryPreview(modal, context, canvas, video, status, styleKey) {
    if (!modal || !canvas) return;
    const colorContext = withBelowFoldScrollStoryColorway(context, styleKey || context?.scrollStoryColorway);
    const colorway = getBelowFoldScrollStoryColorway(colorContext.scrollStoryColorway);
    const renderId = (modal._pressInstagramStoryRenderId || 0) + 1;
    modal._pressInstagramStoryRenderId = renderId;
    modal._pressBelowFoldScrollStyle = colorway.key;
    modal._pressInstagramStoryContext = colorContext;
    updateInstagramStoryStyleButtons(modal, colorway.key);
    setInstagramStoryStatus(status, 'Building high-quality scroll video...');
    setInstagramStoryActionsDisabled(modal, true);
    setInstagramStoryStyleControlsDisabled(modal, true);
    canvas.hidden = true;
    if (modal._pressInstagramStoryVideoUrl) {
      URL.revokeObjectURL(modal._pressInstagramStoryVideoUrl);
      modal._pressInstagramStoryVideoUrl = '';
    }
    modal._pressInstagramStoryAsset = null;
    resetInstagramStoryPreviewVideo(video);
    showBelowFoldLiveScrollPreview(modal, colorContext);
    const cachedAssetPromise = getCachedBelowFoldScrollStoryAssetPromise(colorContext);
    const assetPromise = (cachedAssetPromise
      ? cachedAssetPromise.then((asset) => asset
        ? applyBelowFoldScrollStoryAssetToModal(modal, colorContext, canvas, video, asset)
        : createBelowFoldScrollStoryAsset(modal, colorContext, canvas, video))
      : createBelowFoldScrollStoryAsset(modal, colorContext, canvas, video));
    modal._pressInstagramStoryReady = assetPromise.then((asset) => {
      if (modal._pressInstagramStoryRenderId !== renderId) return true;
      hideBelowFoldLiveScrollPreview(modal);
      modal._pressInstagramStoryAsset = asset;
      rememberBelowFoldScrollStoryAsset(colorContext, asset);
      setInstagramStoryAssetActionLabels(modal, asset?.kind || 'image', colorContext);
      setInstagramStoryActionsDisabled(modal, false);
      setInstagramStoryStyleControlsDisabled(modal, false);
      setInstagramStoryStatus(status, asset?.kind === 'video'
        ? 'Scroll video ready. Tap Save video.'
        : 'Video unavailable here. Story image ready.');
      return true;
    }).catch(async (error) => {
      console.warn('Below the Fold scroll story recording fell back to a still image.', error);
      if (modal._pressInstagramStoryRenderId !== renderId) return false;
      hideBelowFoldLiveScrollPreview(modal);
      await drawInstagramStoryCanvas(colorContext, canvas, getInstagramFallbackStyleForScrollColorway(colorway.key));
      if (video) video.hidden = true;
      canvas.hidden = false;
      modal._pressInstagramStoryAsset = { kind: 'image', canvas };
      setInstagramStoryAssetActionLabels(modal, 'image', colorContext);
      setInstagramStoryStatus(status, 'Story image ready with fallback art.');
      return false;
    }).finally(() => {
      if (modal._pressInstagramStoryRenderId === renderId) {
        setInstagramStoryActionsDisabled(modal, false);
        setInstagramStoryStyleControlsDisabled(modal, false);
      }
    });
  }

  async function createBelowFoldScrollStoryAsset(modal, context, canvas, video) {
    const status = modal?.querySelector('[data-instagram-story-status]');
    const profile = getBelowFoldScrollVideoProfile(context);
    canvas.width = profile.canvasWidth;
    canvas.height = profile.canvasHeight;
    canvas.hidden = true;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resetInstagramStoryPreviewVideo(video);

    const continuousArticleScroll = isContinuousArticleScrollContext(context);
    setInstagramStoryStatus(status, continuousArticleScroll
      ? 'Building connected article scroll...'
      : 'Capturing live scroll layout...');
    const strip = await buildBelowFoldActualScrollStrip(context, {
      profile,
      onFirstFrame: (partialStrip) => {
        drawBelowFoldScrollFrame(ctx, partialStrip, 0);
      },
    });
    const timing = getBelowFoldScrollTiming(strip, canvas, context);
    drawBelowFoldScrollFrame(ctx, strip, 0);
    setInstagramStoryStatus(status, strip.source === 'article-canvas'
      ? 'Recording optimized article scroll...'
      : (strip.source === 'article-pages' ? 'Recording connected page roll...' : (strip.source === 'article-dom' ? 'Recording connected article scroll...' : (strip.kind === 'dom' ? 'Recording live page scroll...' : 'Recording scroll tour video...'))));

    const videoType = getSupportedInstagramStoryVideoType();
    if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
      hideBelowFoldLiveScrollPreview(modal);
      canvas.hidden = false;
      await animateBelowFoldScrollStrip(canvas, strip, timing);
      return { kind: 'image', canvas };
    }

    const streamFrameRate = Math.max(24, Math.min(60, timing.frameRate || 60));
    const stream = canvas.captureStream(streamFrameRate);
    const streamVideoTrack = stream.getVideoTracks?.()[0] || null;
    const chunks = [];
    const recorderOptions = {
      videoBitsPerSecond: getBelowFoldScrollVideoBitsPerSecond(context),
    };
    if (videoType) recorderOptions.mimeType = videoType;
    const recorder = new MediaRecorder(stream, recorderOptions);
    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onerror = (event) => reject(event.error || event);
      recorder.onstop = () => resolve();
    });

    if (continuousArticleScroll) updateBelowFoldLiveScrollPreviewProgress(modal, 0);
    recorder.start(1000);
    drawBelowFoldScrollFrame(ctx, strip, 0);
    streamVideoTrack?.requestFrame?.();
    await waitForNextScrollPreviewFrame();
    await animateBelowFoldScrollStrip(canvas, strip, {
      ...timing,
      onFrame: (progress) => {
        streamVideoTrack?.requestFrame?.();
        if (continuousArticleScroll) updateBelowFoldLiveScrollPreviewProgress(modal, progress);
      },
    });
    setInstagramStoryStatus(status, 'Finalizing scroll video...');
    recorder.requestData?.();
    if (recorder.state !== 'inactive') recorder.stop();
    await Promise.race([
      stopped,
      new Promise((resolve) => window.setTimeout(resolve, 1800)),
    ]);
    stream.getTracks().forEach((track) => track.stop());

    const mimeType = recorder.mimeType || videoType || 'video/webm';
    const blob = new Blob(chunks, { type: mimeType });
    chunks.length = 0;
    if (!blob.size) {
      hideBelowFoldLiveScrollPreview(modal);
      canvas.hidden = false;
      return { kind: 'image', canvas };
    }
    const asset = {
      kind: 'video',
      blob,
      mimeType,
      filename: getInstagramStoryVideoFilename(context, mimeType),
    };

    if (shouldSkipFinishedScrollVideoPlayback(context)) {
      hideBelowFoldLiveScrollPreview(modal);
      resetInstagramStoryPreviewVideo(video);
      canvas.hidden = false;
      setInstagramStoryStatus(status, 'Scroll video ready. Tap Save video.');
      return asset;
    }

    const url = URL.createObjectURL(blob);
    if (modal?._pressInstagramStoryVideoUrl) URL.revokeObjectURL(modal._pressInstagramStoryVideoUrl);
    if (modal) modal._pressInstagramStoryVideoUrl = url;

    if (video) {
      hideBelowFoldLiveScrollPreview(modal);
      video.src = url;
      video.hidden = false;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      canvas.hidden = true;
      try {
        video.currentTime = 0;
        await waitForBelowFoldVideoReady(video);
        await video.play();
      } catch (_) {}
    }

    return {
      ...asset,
      url,
    };
  }

  async function buildBelowFoldActualScrollStrip(context, callbacks = {}) {
    if (context?.type === 'article') {
      if (isContinuousArticleScrollContext(context)) {
        const pageStrip = await buildContinuousArticlePageImageScrollStrip(context, callbacks).catch((error) => {
          console.warn('Connected article page roll capture unavailable.', error);
          return null;
        });
        if (isUsableBelowFoldDomScrollStrip(pageStrip)) return pageStrip;
        try {
          const domStrip = await buildBelowFoldDomScrollStrip(context, callbacks);
          if (isUsableBelowFoldDomScrollStrip(domStrip)) return domStrip;
        } catch (error) {
          console.warn('Connected article scroll capture fell back to optimized canvas.', error);
        }
      }
      return buildArticleCanvasScrollStrip(context, callbacks);
    }
    try {
      const domStrip = await buildBelowFoldDomScrollStrip(context, callbacks);
      if (isUsableBelowFoldDomScrollStrip(domStrip)) return domStrip;
    } catch (error) {
      console.warn('Below the Fold live page capture fell back to generated cards.', error);
    }
    return buildBelowFoldScrollStrip(context, callbacks);
  }

  function isUsableBelowFoldDomScrollStrip(strip) {
    return strip?.kind === 'dom' && Boolean(strip.canvas || strip.chunks?.length || strip.pages?.length);
  }

  async function buildArticleCanvasScrollStrip(context, callbacks = {}) {
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    const model = await collectArticleCanvasScrollModel(context);
    await waitForShareFontsReady();

    const limits = getArticleScrollReaderLimits(context);
    const scale = limits.stripScale || ARTICLE_SCROLL_READER_LIMITS.stripScale;
    const cssWidth = getBelowFoldScrollVideoProfile(context).viewportWidth || 430;
    const canvas = document.createElement('canvas');
    canvas.width = cssWidth * scale;
    canvas.height = limits.maxCanvasHeight || ARTICLE_SCROLL_READER_LIMITS.maxCanvasHeight;
    const ctx = canvas.getContext('2d');
    const usedHeight = drawArticleCanvasScrollStrip(ctx, model, colorway, scale);
    const finalHeight = Math.max(canvas.width, Math.min(canvas.height, Math.ceil(usedHeight)));
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = finalHeight;
    finalCanvas.getContext('2d').drawImage(canvas, 0, 0);

    const strip = {
      chunks: [{ canvas: finalCanvas, y: 0, height: finalCanvas.height }],
      height: finalCanvas.height,
      width: finalCanvas.width,
      kind: 'dom',
      source: 'article-canvas',
      theme: colorway,
    };
    if (typeof callbacks.onFirstFrame === 'function') callbacks.onFirstFrame(strip);
    return strip;
  }

  async function buildContinuousArticlePageImageScrollStrip(context, callbacks = {}) {
    const pageNodes = collectContinuousArticlePageImageNodes();
    if (!pageNodes.length) return null;

    const profile = callbacks.profile || getBelowFoldScrollVideoProfile(context);
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    const limits = getArticleScrollReaderLimits(context);
    const scale = Math.max(1, limits.stripScale || ARTICLE_CONTINUOUS_SCROLL_READER_LIMITS.stripScale || 2);
    const viewportWidth = profile.viewportWidth || 430;
    const stripWidth = Math.round(viewportWidth * scale);
    const background = '#ece1cf';
    const pages = (await Promise.all(pageNodes.map(async (node, index) => {
      const src = normalizeShareAssetUrl(node.currentSrc || node.getAttribute('src') || '');
      if (!src) return null;
      const image = await loadContinuousArticleScrollImage(src, node).catch((error) => {
        console.warn(`NYC page ${index + 1} could not be loaded for scroll export.`, error);
        return null;
      });
      const naturalWidth = image?.naturalWidth || image?.width || 0;
      const naturalHeight = image?.naturalHeight || image?.height || 0;
      if (!image || !naturalWidth || !naturalHeight) return null;
      return {
        image,
        naturalWidth,
        naturalHeight,
      };
    }))).filter(Boolean);
    if (!pages.length) return null;

    let cursorY = 0;
    const pageLayouts = pages.map((page) => {
      const height = Math.max(1, Math.round(stripWidth * (page.naturalHeight / page.naturalWidth)));
      const layout = {
        ...page,
        y: cursorY,
        height,
      };
      cursorY += height;
      return layout;
    });
    const totalHeight = Math.ceil(cursorY);

    const strip = {
      chunks: [],
      pages: pageLayouts,
      height: totalHeight,
      width: stripWidth,
      kind: 'dom',
      source: 'article-pages',
      theme: {
        ...colorway,
        screen: background,
        paper: background,
      },
    };
    if (typeof callbacks.onFirstFrame === 'function') callbacks.onFirstFrame(strip);
    return strip;
  }

  function collectContinuousArticlePageImageNodes() {
    const body = document.querySelector('[data-article-body], .generated-story, .article-body');
    const source = body?.matches?.('.ny-love-letter-feature')
      ? body
      : body?.querySelector?.('.ny-love-letter-feature');
    if (!source) return [];
    const seen = new Set();
    return Array.from(source.querySelectorAll('.ny-love-page--newspaper-opener .ny-love-newspaper-sheet > img')).filter((image) => {
      const src = normalizeShareAssetUrl(image.currentSrc || image.getAttribute('src') || '');
      if (!src || seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  }

  function loadContinuousArticleScrollImage(src, existingImage = null) {
    if (existingImage?.complete && existingImage.naturalWidth && existingImage.naturalHeight) {
      return Promise.resolve(existingImage);
    }
    if (!src) return Promise.reject(new Error('Missing image source.'));
    return new Promise((resolve, reject) => {
      const image = new Image();
      let timeout = 0;
      const finish = (callback, value) => {
        window.clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        callback(value);
      };
      timeout = window.setTimeout(() => finish(reject, new Error('Article page image load timed out.')), 9000);
      image.onload = () => finish(resolve, image);
      image.onerror = () => finish(reject, new Error('Article page image failed to load.'));
      image.decoding = 'async';
      image.src = src;
    });
  }

  function drawContinuousArticleImageAcrossChunks(chunks, image, options) {
    const sourceWidth = options.sourceWidth || image?.naturalWidth || image?.width || 0;
    const sourceHeight = options.sourceHeight || image?.naturalHeight || image?.height || 0;
    const destTop = options.destTop || 0;
    const destWidth = options.destWidth || 0;
    const destHeight = options.destHeight || 0;
    if (!image || !sourceWidth || !sourceHeight || !destWidth || !destHeight) return;

    let drawnHeight = 0;
    while (drawnHeight < destHeight - 0.5) {
      const absoluteY = destTop + drawnHeight;
      const chunk = chunks.find((candidate) => absoluteY >= candidate.y && absoluteY < candidate.y + candidate.height);
      if (!chunk) break;
      const chunkOffsetY = absoluteY - chunk.y;
      const sliceHeight = Math.min(destHeight - drawnHeight, chunk.height - chunkOffsetY);
      if (sliceHeight <= 0) break;
      const sourceY = (drawnHeight / destHeight) * sourceHeight;
      const sourceSliceHeight = (sliceHeight / destHeight) * sourceHeight;
      chunk.canvas.getContext('2d').drawImage(
        image,
        0,
        sourceY,
        sourceWidth,
        sourceSliceHeight,
        0,
        chunkOffsetY,
        destWidth,
        sliceHeight
      );
      drawnHeight += sliceHeight;
    }
  }

  function buildContinuousArticleLogoPanel(options = {}) {
    const width = Math.max(1, options.width || 860);
    const height = Math.max(1, options.height || 640);
    const theme = options.theme || getBelowFoldScrollStoryColorway();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ece1cf';
    ctx.fillRect(0, 0, width, height);
    drawPaperGrain(ctx, width, height, theme.ink || '#1f1f1b', 0.018);

    const logoMaxWidth = width * 0.56;
    const logoMaxHeight = height * 0.22;
    const logoX = (width - logoMaxWidth) / 2;
    const logoY = height * 0.34;
    if (options.logoImage) {
      drawShareImageContain(ctx, options.logoImage, logoX, logoY, logoMaxWidth, logoMaxHeight);
    } else {
      ctx.fillStyle = theme.ink || '#1f1f1b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(width * 0.092)}px "Playfair Display", Georgia, "Times New Roman", serif`;
      ctx.fillText('The Press', width / 2, logoY + logoMaxHeight / 2);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    ctx.fillStyle = theme.muted || '#6f6255';
    ctx.textAlign = 'left';
    ctx.font = `800 ${Math.round(width * 0.026)}px Inter, ui-sans-serif, system-ui, sans-serif`;
    fillTrackedCanvasText(ctx, 'THEPRESS.LIVE', width / 2, height * 0.64, width * 0.004, 'center');
    ctx.textAlign = 'start';
    return canvas;
  }

  async function collectArticleCanvasScrollModel(context) {
    const heroUrl = normalizeShareAssetUrl(context?.imageUrl || getShareImageUrl());
    const logoUrl = normalizeShareAssetUrl('assets/the-press-logo.svg');
    const limits = getArticleScrollReaderLimits(context);
    const segments = collectArticleScrollSegments(limits).map((segment, index) => collectArticleCanvasScrollSection(segment, index, limits));
    const [heroImage, logoImage, loadedSections] = await Promise.all([
      heroUrl ? loadShareImage(heroUrl).catch(() => null) : Promise.resolve(null),
      logoUrl ? loadShareImage(logoUrl).catch(() => null) : Promise.resolve(null),
      Promise.all(segments.map(async (section) => {
        if (!section.imageUrl) return section;
        const image = await loadShareImage(section.imageUrl).catch(() => null);
        return { ...section, image };
      })),
    ]);
    return {
      title: collapseWhitespace(context?.title || document.querySelector('.article-headline')?.textContent || document.title || 'The Press'),
      dek: collapseWhitespace(context?.text || document.querySelector('.article-dek')?.textContent || ''),
      eyebrow: collapseWhitespace(document.querySelector('.article-hero .eyebrow, .eyebrow')?.textContent || 'The Press'),
      meta: collapseWhitespace(document.querySelector('.article-meta')?.textContent || ''),
      url: context?.url || window.location.href,
      heroImage,
      logoImage,
      limits,
      sections: loadedSections.filter((section) => section.heading || section.texts.length || section.image),
    };
  }

  function collectArticleCanvasScrollSection(segment, index, limits = ARTICLE_SCROLL_READER_LIMITS) {
    const image = index < (limits.maxFigureSections || ARTICLE_SCROLL_READER_LIMITS.maxFigureSections)
      ? segment.querySelector('figure img, img')
      : null;
    const imageUrl = normalizeShareAssetUrl(image?.currentSrc || image?.getAttribute('src') || '');
    return {
      number: `Section ${String(index + 1).padStart(2, '0')}`,
      heading: getArticleScrollCleanText(segment.querySelector('h2, h3, h4')) || collapseWhitespace(segment.getAttribute('aria-label') || ''),
      imageUrl,
      imageCaption: image ? getArticleScrollCleanText(image.closest('figure')?.querySelector('figcaption')) : '',
      texts: Array.from(segment.querySelectorAll('p'))
        .filter((paragraph) => !paragraph.closest('figcaption, .press-static-post, .source-list, .share-row'))
        .map((paragraph) => getArticleScrollCleanText(paragraph))
        .map((text) => getArticleScrollReadableExcerpt(text, limits.paragraphExcerptCharacters || ARTICLE_SCROLL_READER_LIMITS.paragraphExcerptCharacters))
        .filter((text) => text.length > 40)
        .slice(0, limits.maxParagraphsPerSection || ARTICLE_SCROLL_READER_LIMITS.maxParagraphsPerSection),
    };
  }

  function getArticleScrollReadableExcerpt(value, maxCharacters) {
    const text = collapseWhitespace(value || '');
    if (!text || text.length <= maxCharacters) return text;
    const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g) || [];
    let excerpt = '';
    sentences.some((sentence) => {
      const next = collapseWhitespace(`${excerpt} ${sentence}`);
      if (next.length > maxCharacters && excerpt) return true;
      excerpt = next;
      return excerpt.length >= maxCharacters * 0.72;
    });
    if (excerpt) return excerpt;
    const clipped = text.slice(0, maxCharacters);
    return collapseWhitespace(clipped.slice(0, Math.max(0, clipped.lastIndexOf(' '))).replace(/[-,:;]+$/g, ''));
  }

  function drawArticleCanvasScrollStrip(ctx, model, theme, scale) {
    const width = ctx.canvas.width;
    const maxHeight = ctx.canvas.height;
    const limits = model.limits || ARTICLE_SCROLL_READER_LIMITS;
    const pad = 18 * scale;
    const innerX = pad;
    const innerWidth = width - pad * 2;
    let y = 22 * scale;
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, width, maxHeight);
    drawPaperGrain(ctx, width, maxHeight, theme.ink, 0.018);

    ctx.fillStyle = theme.accent;
    ctx.font = `900 ${12 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
    fillTrackedCanvasText(ctx, (model.eyebrow || 'The Press').toUpperCase(), innerX, y + 12 * scale, 1.4 * scale);
    y += 35 * scale;

    ctx.fillStyle = theme.ink;
    ctx.font = `800 ${44 * scale}px "Playfair Display", Georgia, "Times New Roman", serif`;
    y = wrapArticleCanvasText(ctx, model.title || 'The Press', innerX, y + 44 * scale, innerWidth, 46 * scale, { minFontSize: 31 * scale, targetLines: 3 }) + 12 * scale;

    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${19 * scale}px "Playfair Display", Georgia, "Times New Roman", serif`;
    y = wrapArticleCanvasText(ctx, model.dek || '', innerX, y + 14 * scale, innerWidth, 26 * scale, { minFontSize: 15 * scale, targetLines: 5 }) + 18 * scale;

    if (model.meta) {
      ctx.font = `800 ${10 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = theme.muted;
      y = wrapArticleCanvasText(ctx, model.meta.toUpperCase(), innerX, y + 8 * scale, innerWidth, 15 * scale, { minFontSize: 8 * scale, targetLines: 3 }) + 18 * scale;
    }

    if (model.heroImage) {
      const heroHeight = getArticleCanvasScrollImageHeight(
        model.heroImage,
        innerWidth,
        (limits.heroImageMinHeight || ARTICLE_SCROLL_READER_LIMITS.heroImageMinHeight) * scale,
        (limits.heroImageMaxHeight || ARTICLE_SCROLL_READER_LIMITS.heroImageMaxHeight) * scale
      );
      y = drawArticleCanvasScrollImage(ctx, model.heroImage, innerX, y, innerWidth, heroHeight, theme) + 22 * scale;
    }
    y = drawArticleCanvasRule(ctx, innerX, y, innerWidth, theme) + 18 * scale;

    for (const section of model.sections) {
      if (y > maxHeight - 620 * scale) break;
      y = drawArticleCanvasScrollSection(ctx, section, y, innerX, innerWidth, theme, scale, limits);
    }

    y = drawArticleCanvasScrollClosingPanel(ctx, model, innerX, y + 12 * scale, innerWidth, theme, scale);
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, y, width, Math.max(0, maxHeight - y));
    return y;
  }

  function drawArticleCanvasScrollSection(ctx, section, y, x, width, theme, scale, limits = ARTICLE_SCROLL_READER_LIMITS) {
    ctx.fillStyle = theme.accent;
    ctx.font = `900 ${11 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
    fillTrackedCanvasText(ctx, (section.number || '').toUpperCase(), x, y + 12 * scale, 1.3 * scale);
    y += 34 * scale;

    if (section.heading) {
      ctx.fillStyle = theme.ink;
      ctx.font = `800 ${29 * scale}px "Playfair Display", Georgia, "Times New Roman", serif`;
      y = wrapArticleCanvasText(ctx, section.heading, x, y + 29 * scale, width, 32 * scale, { minFontSize: 22 * scale, targetLines: 3 }) + 8 * scale;
    }

    if (section.image) {
      const imageHeight = getArticleCanvasScrollImageHeight(
        section.image,
        width,
        (limits.sectionImageMinHeight || ARTICLE_SCROLL_READER_LIMITS.sectionImageMinHeight) * scale,
        (limits.sectionImageMaxHeight || ARTICLE_SCROLL_READER_LIMITS.sectionImageMaxHeight) * scale
      );
      y = drawArticleCanvasScrollImage(ctx, section.image, x, y, width, imageHeight, theme);
      if (section.imageCaption) {
        ctx.fillStyle = theme.muted;
        ctx.font = `700 ${10 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
        y = wrapArticleCanvasText(ctx, section.imageCaption, x + 8 * scale, y + 15 * scale, width - 16 * scale, 14 * scale, { minFontSize: 8 * scale, targetLines: 3 }) + 12 * scale;
      } else {
        y += 14 * scale;
      }
    }

    ctx.fillStyle = theme.ink;
    ctx.font = `400 ${15 * scale}px Georgia, "Times New Roman", serif`;
    section.texts.forEach((text) => {
      y = wrapArticleCanvasText(ctx, text, x, y + 15 * scale, width, 21 * scale, { minFontSize: 11.5 * scale, targetLines: 7 }) + 10 * scale;
    });
    return drawArticleCanvasRule(ctx, x, y + 10 * scale, width, theme) + 18 * scale;
  }

  function drawArticleCanvasScrollClosingPanel(ctx, model, x, y, width, theme, scale) {
    y += 8 * scale;
    ctx.fillStyle = theme.cardAlt;
    roundRectPath(ctx, x, y, width, 112 * scale, 10 * scale);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.font = `900 ${10.5 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
    fillTrackedCanvasText(ctx, 'READ THE FULL ARTICLE', x + 18 * scale, y + 35 * scale, 1.8 * scale);
    ctx.fillStyle = theme.ink;
    ctx.font = `700 ${14 * scale}px "Playfair Display", Georgia, "Times New Roman", serif`;
    wrapShareCanvasText(ctx, model.url || 'thepress.live', x + 18 * scale, y + 68 * scale, width - 36 * scale, 18 * scale, 2, { minFontSize: 10 * scale });
    y += 136 * scale;

    const logoPanelHeight = 238 * scale;
    const inset = 20 * scale;
    ctx.fillStyle = theme.paper;
    roundRectPath(ctx, x, y, width, logoPanelHeight, 14 * scale);
    ctx.fill();
    ctx.strokeStyle = theme.rule;
    ctx.lineWidth = Math.max(1, 1 * scale);
    roundRectPath(ctx, x, y, width, logoPanelHeight, 14 * scale);
    ctx.stroke();

    const logoBoxHeight = 116 * scale;
    if (model.logoImage) {
      drawShareImageContain(ctx, model.logoImage, x + inset, y + 42 * scale, width - inset * 2, logoBoxHeight);
    } else {
      ctx.fillStyle = theme.ink;
      ctx.font = `900 ${44 * scale}px "Playfair Display", Georgia, "Times New Roman", serif`;
      fillTrackedCanvasText(ctx, 'THE PRESS', x + width / 2, y + 94 * scale, 2.2 * scale, 'center');
      ctx.fillStyle = theme.accent;
      ctx.font = `900 ${11 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
      fillTrackedCanvasText(ctx, 'AI POWERED JOURNALISM', x + width / 2, y + 124 * scale, 2.2 * scale, 'center');
    }

    ctx.fillStyle = theme.muted;
    ctx.font = `800 ${10 * scale}px Inter, ui-sans-serif, system-ui, sans-serif`;
    fillTrackedCanvasText(ctx, 'SOURCE-FORWARD REPORTING', x + width / 2, y + 194 * scale, 1.8 * scale, 'center');
    return y + logoPanelHeight + 34 * scale;
  }

  function drawArticleCanvasScrollImage(ctx, image, x, y, width, height, theme) {
    ctx.save();
    ctx.fillStyle = theme.card;
    ctx.strokeStyle = theme.rule;
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.clip();
    drawShareImageCover(ctx, image, x + 1, y + 1, width - 2, height - 2);
    ctx.restore();
    ctx.strokeStyle = theme.rule;
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, width, height, 8);
    ctx.stroke();
    return y + height;
  }

  function getArticleCanvasScrollImageHeight(image, width, minHeight, maxHeight) {
    const naturalWidth = image?.naturalWidth || image?.width || 0;
    const naturalHeight = image?.naturalHeight || image?.height || 0;
    if (!naturalWidth || !naturalHeight) return Math.max(minHeight, Math.min(maxHeight, width * 0.62));
    return Math.max(minHeight, Math.min(maxHeight, width * (naturalHeight / naturalWidth)));
  }

  function wrapArticleCanvasText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    const originalFont = ctx.font;
    const originalSize = getShareCanvasFontSize(originalFont);
    const minFontSize = options.minFontSize || Math.max(18, Math.round(originalSize * 0.74));
    const targetLines = options.targetLines || 0;
    const step = options.step || 1;
    let fontSize = originalSize;
    let lines = [];

    while (fontSize >= minFontSize) {
      ctx.font = setShareCanvasFontSize(originalFont, fontSize);
      lines = getShareCanvasTextLines(ctx, text, maxWidth);
      if (!targetLines || lines.length <= targetLines) break;
      fontSize -= step;
    }

    if (fontSize < minFontSize) {
      fontSize = minFontSize;
      ctx.font = setShareCanvasFontSize(originalFont, fontSize);
      lines = getShareCanvasTextLines(ctx, text, maxWidth);
    }

    const fittedLineHeight = Math.max(14, Math.round(lineHeight * (fontSize / originalSize)));
    const endY = drawShareCanvasTextLines(ctx, lines, x, y, fittedLineHeight, ctx.font);
    ctx.font = originalFont;
    return endY;
  }

  function drawArticleCanvasRule(ctx, x, y, width, theme) {
    ctx.fillStyle = theme.rule;
    ctx.fillRect(x, y, width, 1);
    return y + 1;
  }

  async function applyBelowFoldScrollStoryAssetToModal(modal, context, canvas, video, asset) {
    if (!asset) return asset;
    if (asset.kind === 'video' && asset.blob?.size && video) {
      const mimeType = asset.mimeType || asset.blob.type || 'video/webm';
      if (shouldSkipFinishedScrollVideoPlayback(context)) {
        hideBelowFoldLiveScrollPreview(modal);
        resetInstagramStoryPreviewVideo(video);
        if (canvas) canvas.hidden = false;
        return {
          ...asset,
          mimeType,
          filename: asset.filename || getInstagramStoryVideoFilename(context, mimeType),
        };
      }
      const url = URL.createObjectURL(asset.blob);
      if (modal?._pressInstagramStoryVideoUrl) URL.revokeObjectURL(modal._pressInstagramStoryVideoUrl);
      if (modal) modal._pressInstagramStoryVideoUrl = url;
      hideBelowFoldLiveScrollPreview(modal);
      video.src = url;
      video.hidden = false;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      if (canvas) canvas.hidden = true;
      try {
        video.currentTime = 0;
        await waitForBelowFoldVideoReady(video);
        await video.play();
      } catch (_) {}
      return {
        ...asset,
        url,
        mimeType,
        filename: asset.filename || getInstagramStoryVideoFilename(context, mimeType),
      };
    }
    return asset;
  }

  function shouldSkipFinishedScrollVideoPlayback(context) {
    return isContinuousArticleScrollContext(context);
  }

  function resetInstagramStoryPreviewVideo(video) {
    if (!video) return;
    video.hidden = true;
    video.pause?.();
    video.removeAttribute('src');
    video.removeAttribute('autoplay');
    video.load?.();
  }

  async function buildBelowFoldScrollStrip(context, callbacks = {}) {
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    const model = collectBelowFoldScrollStoryModel(context);
    const loadedSections = await Promise.all(model.sections.map(async (section) => {
      if (!section.imageUrl) return section;
      try {
        return { ...section, image: await loadShareImage(section.imageUrl) };
      } catch (_) {
        return section;
      }
    }));
    let coverImage = null;
    if (model.coverImageUrl) {
      try {
        coverImage = await loadShareImage(model.coverImageUrl);
      } catch (_) {}
    }
    await waitForShareFontsReady();

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = Math.min(
      BELOW_FOLD_SCROLL_STORY_CRITERIA.maxStripHeight,
      BELOW_FOLD_SCROLL_STORY_CRITERIA.baseStripHeight
        + loadedSections.length * BELOW_FOLD_SCROLL_STORY_CRITERIA.perCardStripHeight
        + BELOW_FOLD_SCROLL_STORY_CRITERIA.stripEndPadding
    );
    const ctx = canvas.getContext('2d');
    const height = drawBelowFoldScrollStrip(ctx, { ...model, sections: loadedSections, coverImage, theme: colorway });
    return { canvas, height, kind: 'generated', width: canvas.width, theme: colorway };
  }

  function showBelowFoldLiveScrollPreview(modal, context) {
    const preview = modal?.querySelector('.press-instagram-story__preview');
    const sourceRoot = getBelowFoldScrollSourceRoot(context);
    if (!preview || !sourceRoot) return;
    hideBelowFoldLiveScrollPreview(modal);
    modal.classList.add('press-instagram-story--live-previewing');
    preview.querySelector('[data-instagram-story-canvas]')?.setAttribute('hidden', '');
    preview.querySelector('[data-instagram-story-video]')?.setAttribute('hidden', '');

    const profile = getBelowFoldScrollVideoProfile(context);
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    const continuousArticleScroll = isContinuousArticleScrollContext(context);
    const viewportWidth = profile.viewportWidth;
    const clone = sourceRoot.cloneNode(true);
    sanitizeBelowFoldScrollClone(clone);
    prepareBelowFoldLivePreviewMedia(clone);

    const livePreview = document.createElement('div');
    livePreview.className = 'press-instagram-story__live-preview';
    livePreview.setAttribute('data-below-fold-live-preview', '');
    livePreview.setAttribute('aria-hidden', 'true');
    livePreview.style.background = getBelowFoldColorwayBackdropCss(colorway);

    const livePhone = document.createElement('div');
    livePhone.className = 'press-instagram-story__live-phone';
    livePhone.style.background = colorway.screen;

    const liveScreen = document.createElement('div');
    liveScreen.className = 'press-instagram-story__live-screen';
    liveScreen.style.width = `${viewportWidth}px`;

    const captureStyle = document.createElement('style');
    captureStyle.textContent = getBelowFoldCaptureStyles(viewportWidth, colorway);

    const capturePage = document.createElement('div');
    capturePage.className = getScrollCaptureShellClass(context);
    capturePage.style.transform = 'translateY(0)';
    capturePage.style.transition = 'none';
    capturePage.appendChild(clone);

    liveScreen.appendChild(captureStyle);
    liveScreen.appendChild(capturePage);
    livePhone.appendChild(liveScreen);
    livePreview.appendChild(livePhone);
    preview.appendChild(livePreview);

    let liveScrollAnimation = null;
    let liveScrollStarted = false;
    let liveScrollStartAt = 0;
    let liveScrollDurationOverride = 0;
    let liveScrollStartPromise = null;
    let resolveLiveScrollStart = null;
    const getLiveScrollStartPromise = () => {
      if (!liveScrollStartPromise) {
        liveScrollStartPromise = new Promise((resolve) => {
          resolveLiveScrollStart = resolve;
        });
      }
      return liveScrollStartPromise;
    };
    const resolveLiveScrollStarted = (started) => {
      if (!resolveLiveScrollStart) return;
      resolveLiveScrollStart(Boolean(started));
      resolveLiveScrollStart = null;
    };
    const updateScale = () => {
      const phoneRect = livePhone.getBoundingClientRect();
      if (!phoneRect.width) return;
      const scale = phoneRect.width / viewportWidth;
      liveScreen.style.transform = `scale(${scale})`;
      liveScreen.style.height = `${Math.ceil(phoneRect.height / scale)}px`;
    };
    const armLiveScrollStart = (delayOverride = null) => {
      const startPromise = getLiveScrollStartPromise();
      if (!livePreview.isConnected) {
        resolveLiveScrollStarted(false);
        return startPromise;
      }
      if (liveScrollStartAt || liveScrollStarted) return startPromise;
      const startDelay = Number.isFinite(delayOverride)
        ? Math.max(0, delayOverride)
        : (continuousArticleScroll ? 120 : 2400);
      liveScrollStartAt = getBelowFoldPreviewNow() + startDelay;
      const mediaTimeout = continuousArticleScroll ? 500 : 1300;
      const fallbackDelay = startDelay + (continuousArticleScroll ? 520 : 2700);
      waitForBelowFoldLivePreviewMedia(capturePage, mediaTimeout).then(startLiveScroll);
      window.setTimeout(startLiveScroll, fallbackDelay);
      return startPromise;
    };
    const startLiveScroll = () => {
      if (liveScrollStarted) {
        resolveLiveScrollStarted(true);
        return;
      }
      if (!livePreview.isConnected) {
        resolveLiveScrollStarted(false);
        return;
      }
      if (!liveScrollStartAt) {
        armLiveScrollStart();
        return;
      }
      const delay = liveScrollStartAt - getBelowFoldPreviewNow();
      if (delay > 0) {
        window.setTimeout(startLiveScroll, delay);
        return;
      }
      updateScale();
      const phoneRect = livePhone.getBoundingClientRect();
      if (!phoneRect.width) return;
      const scale = phoneRect.width / viewportWidth;
      const visibleHeight = Math.max(1, phoneRect.height / scale);
      const maxScroll = Math.max(0, capturePage.scrollHeight - visibleHeight);
      if (maxScroll <= 8) {
        resolveLiveScrollStarted(false);
        return;
      }
      liveScrollStarted = true;
      liveScrollAnimation?.cancel?.();
      capturePage.style.transform = 'translate3d(0, 0, 0)';
      capturePage.style.transition = 'none';
      capturePage.style.backfaceVisibility = 'hidden';
      capturePage.style.transformStyle = 'preserve-3d';
      capturePage.style.willChange = 'transform';
      const duration = liveScrollDurationOverride || getBelowFoldLivePreviewScrollDuration(maxScroll, context);
      const runAnimation = () => {
        if (!livePreview.isConnected) return;
        liveScrollAnimation = animateBelowFoldLivePreviewScroll(capturePage, maxScroll, duration, livePreview);
        resolveLiveScrollStarted(true);
      };
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(runAnimation));
      } else {
        window.setTimeout(runAnimation, 34);
      }
    };
    const setLiveScrollProgress = (progress = 0) => {
      if (!livePreview.isConnected) return false;
      updateScale();
      const phoneRect = livePhone.getBoundingClientRect();
      if (!phoneRect.width) return false;
      const scale = phoneRect.width / viewportWidth;
      const visibleHeight = Math.max(1, phoneRect.height / scale);
      const maxScroll = Math.max(0, capturePage.scrollHeight - visibleHeight);
      if (maxScroll <= 8) return false;
      const clampedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
      liveScrollAnimation?.cancel?.();
      liveScrollStarted = true;
      liveScrollStartAt = 0;
      capturePage.style.transition = 'none';
      capturePage.style.backfaceVisibility = 'hidden';
      capturePage.style.transformStyle = 'preserve-3d';
      capturePage.style.willChange = 'transform';
      capturePage.style.transform = `translate3d(0, -${Math.round(maxScroll * clampedProgress)}px, 0)`;
      resolveLiveScrollStarted(true);
      return true;
    };
    livePreview._pressStartLiveScroll = (durationOverride = 0) => {
      const override = Number(durationOverride);
      if (Number.isFinite(override) && override > 0) liveScrollDurationOverride = Math.round(override);
      liveScrollAnimation?.cancel?.();
      liveScrollStarted = false;
      liveScrollStartAt = 0;
      liveScrollStartPromise = null;
      resolveLiveScrollStart = null;
      return armLiveScrollStart(0);
    };
    livePreview._pressSetLiveScrollProgress = setLiveScrollProgress;
    updateScale();
    window.requestAnimationFrame?.(updateScale);
    if (!continuousArticleScroll) {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => armLiveScrollStart()));
      } else {
        window.setTimeout(armLiveScrollStart, 80);
      }
      window.setTimeout(armLiveScrollStart, 1200);
    }
  }

  function startBelowFoldLiveScrollPreview(modal, duration) {
    const livePreview = modal?.querySelector('[data-below-fold-live-preview]');
    if (!livePreview || typeof livePreview._pressStartLiveScroll !== 'function') return Promise.resolve(false);
    return livePreview._pressStartLiveScroll(duration);
  }

  function waitForBelowFoldLiveScrollPreviewStart(modal, duration) {
    return Promise.race([
      startBelowFoldLiveScrollPreview(modal, duration),
      new Promise((resolve) => window.setTimeout(() => resolve(false), 1200)),
    ]).catch(() => false);
  }

  function updateBelowFoldLiveScrollPreviewProgress(modal, progress) {
    const livePreview = modal?.querySelector('[data-below-fold-live-preview]');
    if (!livePreview || typeof livePreview._pressSetLiveScrollProgress !== 'function') return false;
    return livePreview._pressSetLiveScrollProgress(progress);
  }

  function animateBelowFoldLivePreviewScroll(capturePage, maxScroll, duration, livePreview) {
    const scrollDistance = Math.round(Math.max(0, maxScroll || 0));
    const totalDuration = Math.max(1000, duration || 36000);
    const startedAt = getBelowFoldPreviewNow();
    let frameId = 0;
    let cancelled = false;

    const animation = {
      cancel() {
        cancelled = true;
        if (frameId && window.cancelAnimationFrame) window.cancelAnimationFrame(frameId);
      },
    };

    const tick = () => {
      if (cancelled || !livePreview?.isConnected) return;
      const elapsed = Math.max(0, getBelowFoldPreviewNow() - startedAt);
      const progress = Math.min(1, elapsed / totalDuration);
      capturePage.style.transform = `translate3d(0, -${Math.round(scrollDistance * progress)}px, 0)`;
      if (progress < 1) {
        if (window.requestAnimationFrame) {
          frameId = window.requestAnimationFrame(tick);
        } else {
          window.setTimeout(tick, 16);
        }
      }
    };

    tick();
    return animation;
  }

  function hideBelowFoldLiveScrollPreview(modal) {
    modal?.querySelectorAll('[data-below-fold-live-preview]').forEach((node) => {
      node.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
      node.remove();
    });
    modal?.classList.remove('press-instagram-story--live-previewing');
  }

  function getBelowFoldLivePreviewScrollDuration(maxScroll, context) {
    if (isContinuousArticleScrollContext(context)) {
      const limits = getArticleScrollReaderLimits(context);
      const seconds = Math.max(
        limits.minDurationSeconds,
        Math.min(limits.maxDurationSeconds, maxScroll / limits.scrollPixelsPerSecond)
      );
      return Math.round(seconds * ARTICLE_SCROLL_VIDEO_DURATION_MULTIPLIER * 1000);
    }
    return Math.round(Math.max(36000, Math.min(66000, maxScroll * 5.7)));
  }

  function getBelowFoldPreviewNow() {
    return window.performance?.now?.() || Date.now();
  }

  function waitForBelowFoldLivePreviewMedia(root, timeoutMs = 1200) {
    const images = Array.from(root?.querySelectorAll('img') || []);
    const pending = images.filter((img) => !img.complete || !img.naturalWidth);
    if (!pending.length) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      let remaining = pending.length;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        pending.forEach((img) => {
          img.removeEventListener('load', markDone);
          img.removeEventListener('error', markDone);
        });
        resolve();
      };
      const markDone = () => {
        remaining -= 1;
        if (remaining <= 0) finish();
      };
      const timeout = window.setTimeout(finish, timeoutMs);
      pending.forEach((img) => {
        img.addEventListener('load', markDone, { once: true });
        img.addEventListener('error', markDone, { once: true });
      });
    });
  }

  function getBelowFoldScrollSourceRoot(context) {
    if (context?.type === 'article') {
      return context.articleScrollRoot || buildArticleScrollSourceRoot(context);
    }
    return context?.belowFoldRoot
      || document.querySelector('.page-below-fold-issue [data-below-fold-root]')
      || document.querySelector('.page-below-fold-issue .below-fold-issue-page__paper [data-below-fold-root]');
  }

  function getScrollCaptureShellClass(context) {
    return context?.type === 'article'
      ? 'press-scroll-capture-shell page-article page-article--scroll-share'
      : 'press-scroll-capture-shell page-below-fold-issue';
  }

  function buildArticleScrollSourceRoot(context) {
    const root = document.createElement('article');
    root.className = 'press-article-scroll-reader';

    const title = collapseWhitespace(context?.title || document.querySelector('.article-headline')?.textContent || document.title || 'The Press');
    const dek = collapseWhitespace(context?.text || document.querySelector('.article-dek')?.textContent || '');
    const eyebrow = collapseWhitespace(document.querySelector('.article-hero .eyebrow, .eyebrow')?.textContent || 'The Press');
    const meta = collapseWhitespace(document.querySelector('.article-meta')?.textContent || '');
    const imageUrl = normalizeShareAssetUrl(context?.imageUrl || getShareImageUrl());

    const header = document.createElement('header');
    header.className = 'press-article-scroll-reader__header';
    appendArticleScrollText(header, 'p', 'press-article-scroll-reader__kicker', eyebrow);
    appendArticleScrollText(header, 'h1', '', title);
    appendArticleScrollText(header, 'p', 'press-article-scroll-reader__dek', dek);
    appendArticleScrollText(header, 'p', 'press-article-scroll-reader__meta', meta);
    if (imageUrl) {
      const figure = buildArticleScrollFigure(imageUrl, getShareImageAltText());
      figure.classList.add('press-article-scroll-reader__figure--hero');
      header.appendChild(figure);
    }
    const continuousFlow = buildContinuousArticleScrollFlow();
    if (continuousFlow) {
      root.classList.add('press-article-scroll-reader--ny-love');
      root.appendChild(continuousFlow);
      return root;
    } else {
      root.appendChild(header);
      collectArticleScrollSegments().forEach((segment, index) => {
        const section = buildArticleScrollSection(segment, index);
        if (section) root.appendChild(section);
      });
    }

    const footer = document.createElement('footer');
    footer.className = 'press-article-scroll-reader__footer';
    appendArticleScrollText(footer, 'strong', '', 'READ THE FULL ARTICLE');
    appendArticleScrollText(footer, 'p', '', context?.url || window.location.href);
    root.appendChild(footer);
    return root;
  }

  function isContinuousArticleScrollContext(context) {
    if (context?.type !== 'article') return false;
    const body = document.querySelector('[data-article-body], .generated-story, .article-body');
    return Boolean(body?.matches?.('.ny-love-letter-feature') || body?.querySelector?.('.ny-love-letter-feature, .ny-love-page--newspaper-opener'));
  }

  function buildContinuousArticleScrollFlow() {
    const body = document.querySelector('[data-article-body], .generated-story, .article-body');
    const source = body?.matches?.('.ny-love-letter-feature')
      ? body
      : body?.querySelector?.('.ny-love-letter-feature');
    if (!source?.querySelector?.('.ny-love-page--newspaper-opener')) return null;

    const clone = source.cloneNode(true);
    clone.classList.add('press-article-scroll-reader__ny-love-flow');
    clone.querySelectorAll([
      '.ny-love-page-menu',
      '[data-page-menu]',
      '[data-illustration-nav]',
      '.share-row',
      '[data-article-folio-share]',
      '.article-folio__share',
    ].join(', ')).forEach((node) => node.remove());
    prepareBelowFoldLivePreviewMedia(clone);
    return clone;
  }

  function collectArticleScrollSegments(limits = ARTICLE_SCROLL_READER_LIMITS) {
    const body = document.querySelector('[data-article-body], .generated-story, .article-body');
    if (!body) return [];
    const primarySelectors = '.press-feature-segment, .press-social-content';
    const fallbackSelectors = '.article-body > section:not(.press-social-feature), [data-article-body] > section:not(.press-social-feature)';
    const candidates = body.querySelectorAll(primarySelectors).length
      ? body.querySelectorAll(primarySelectors)
      : body.querySelectorAll(fallbackSelectors);
    const seen = new Set();
    return Array.from(candidates).filter((node) => {
      if (!node || seen.has(node)) return false;
      if (node.closest('.press-social-side, .share-row, [data-article-trust-card], .cartel-source-matrix, .article-sources, .source-notes, .related-block')) return false;
      if (Array.from(seen).some((usedNode) => usedNode.contains(node) || node.contains(usedNode))) return false;
      seen.add(node);
      return Boolean(node.querySelector('h2, h3, p, figure, img'));
    }).slice(0, limits.maxSections || ARTICLE_SCROLL_READER_LIMITS.maxSections);
  }

  function buildArticleScrollSection(segment, index) {
    const heading = getArticleScrollCleanText(segment.querySelector('h2, h3, h4')) || collapseWhitespace(segment.getAttribute('aria-label') || '');
    const section = document.createElement('section');
    section.className = 'press-article-scroll-reader__section';
    appendArticleScrollText(section, 'p', 'press-article-scroll-reader__section-number', `Section ${String(index + 1).padStart(2, '0')}`);
    appendArticleScrollText(section, 'h2', '', heading);

    const image = index < ARTICLE_SCROLL_READER_LIMITS.maxFigureSections
      ? segment.querySelector('figure img, img')
      : null;
    const imageUrl = normalizeShareAssetUrl(image?.currentSrc || image?.getAttribute('src') || '');
    if (imageUrl) {
      const figure = buildArticleScrollFigure(imageUrl, image?.getAttribute('alt') || '');
      const caption = getArticleScrollCleanText(image.closest('figure')?.querySelector('figcaption'));
      appendArticleScrollText(figure, 'figcaption', '', caption);
      section.appendChild(figure);
    }

    const usedText = new Set();
    Array.from(segment.querySelectorAll('p'))
      .filter((paragraph) => !paragraph.closest('figcaption, .press-static-post, .source-list, .share-row'))
      .map((paragraph) => getArticleScrollCleanText(paragraph))
      .filter((text) => text.length > 40 && !usedText.has(text) && usedText.add(text))
      .slice(0, ARTICLE_SCROLL_READER_LIMITS.maxParagraphsPerSection)
      .forEach((text) => appendArticleScrollText(section, 'p', '', text));

    if (!section.querySelector('h2, figure, p:not(.press-article-scroll-reader__section-number)')) return null;
    return section;
  }

  function buildArticleScrollFigure(imageUrl, altText = '') {
    const figure = document.createElement('figure');
    figure.className = 'press-article-scroll-reader__figure';
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = altText || '';
    image.loading = 'eager';
    image.decoding = 'sync';
    image.setAttribute('fetchpriority', 'high');
    figure.appendChild(image);
    return figure;
  }

  function getArticleScrollCleanText(node) {
    if (!node) return '';
    const clone = node.cloneNode(true);
    clone.querySelectorAll('sup, .source-ref, script, style').forEach((child) => child.remove());
    return collapseWhitespace(clone.textContent || '');
  }

  function appendArticleScrollText(parent, tagName, className, value) {
    const text = collapseWhitespace(value || '');
    if (!text) return null;
    const node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function getShareImageAltText() {
    return document.querySelector('.article-hero img, [data-article-body] img')?.getAttribute('alt') || '';
  }

  function sanitizeBelowFoldScrollClone(clone) {
    clone.querySelectorAll([
      'script',
      'style',
      'nav',
      '.share-row',
      '[data-below-fold-story-share]',
      '[data-article-folio-share]',
      '.article-folio__share',
      '[data-living-article-dock]',
      '[data-living-drawer]',
      '.article-source-drawer',
      '.related-block',
      '#related-stories',
      '.story-card--related',
      '.article-sources',
      '#source-notes',
      '.source-notes',
      '.source-list',
      '.reader-mode-toggle',
      '.theme-toggle',
      '.reading-progress',
      '.press-command',
    ].join(', ')).forEach((node) => node.remove());
    clone.querySelectorAll('[id]').forEach((node, index) => {
      node.id = `scroll-story-${index}-${node.id}`;
    });
  }

  function prepareBelowFoldLivePreviewMedia(root) {
    root.querySelectorAll('img').forEach((img) => {
      const raw = img.currentSrc || img.getAttribute('src') || '';
      const url = normalizeShareAssetUrl(raw);
      if (url) img.setAttribute('src', url);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'async');
    });
  }

  function getBelowFoldLayoutHeight(element) {
    if (!element) return 0;
    const rootRect = element.getBoundingClientRect?.();
    const rootTop = rootRect?.top || 0;
    let height = Math.max(
      Number(element.scrollHeight) || 0,
      Number(element.offsetHeight) || 0,
      Number(rootRect?.height) || 0
    );
    element.querySelectorAll?.('*').forEach((node) => {
      const rect = node.getBoundingClientRect?.();
      if (!rect) return;
      height = Math.max(height, rect.bottom - rootTop);
    });
    return Math.ceil(height);
  }

  async function buildBelowFoldDomScrollStrip(context, callbacks = {}) {
    const sourceRoot = getBelowFoldScrollSourceRoot(context);
    if (!sourceRoot) return null;
    const sourceMeasuredHeight = context?.type === 'article' ? 0 : getBelowFoldLayoutHeight(sourceRoot);

    const profile = callbacks.profile || getBelowFoldScrollVideoProfile(context);
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    const viewportWidth = profile.viewportWidth || 430;
    const captureBackground = context?.type === 'article' ? colorway.paper : colorway.screen;
    const clone = sourceRoot.cloneNode(true);
    sanitizeBelowFoldScrollClone(clone);
    await normalizeBelowFoldCaptureMedia(clone);

    const captureHost = document.createElement('div');
    captureHost.className = 'press-scroll-capture-host';
    captureHost.style.cssText = [
      'position:absolute',
      'left:-10000px',
      'top:0',
      `width:${viewportWidth}px`,
      'min-height:1px',
      'pointer-events:none',
      'z-index:-1',
      `background:${captureBackground}`,
    ].join(';');
    captureHost.setAttribute('aria-hidden', 'true');

    const captureStyle = document.createElement('style');
    captureStyle.textContent = getBelowFoldCaptureStyles(viewportWidth, colorway);

    const capturePage = document.createElement('div');
    capturePage.className = getScrollCaptureShellClass(context);
    capturePage.appendChild(clone);
    captureHost.appendChild(captureStyle);
    captureHost.appendChild(capturePage);
    document.body.appendChild(captureHost);

    try {
      await waitForShareFontsReady();
      await waitForBelowFoldCaptureAssets(captureHost);
      await waitForNextScrollPreviewFrame();
      await waitForNextScrollPreviewFrame();

      const measuredHeight = Math.ceil(Math.max(
        sourceMeasuredHeight,
        getBelowFoldLayoutHeight(clone),
        getBelowFoldLayoutHeight(capturePage),
        captureHost.scrollHeight,
        1200
      ));
      const captureScale = getBelowFoldCaptureScale(measuredHeight, viewportWidth, context);
      const html2canvas = await ensureHtml2Canvas();
      const chunks = await captureBelowFoldDomChunks(html2canvas, capturePage, {
        captureScale,
        measuredHeight,
        onFirstChunk: callbacks.onFirstFrame,
        subjectType: context?.type || '',
        theme: colorway,
        viewportWidth,
      });
      const strip = {
        chunks,
        height: Math.ceil(measuredHeight * captureScale),
        width: Math.round(viewportWidth * captureScale),
        kind: 'dom',
        source: context?.type === 'article' ? 'article-dom' : 'dom',
        theme: colorway,
      };
      return flattenContinuousArticleDomStrip(strip, context);
    } finally {
      captureHost.remove();
    }
  }

  function flattenContinuousArticleDomStrip(strip, context) {
    if (!isContinuousArticleScrollContext(context) || !Array.isArray(strip?.chunks) || !strip.chunks.length) return strip;
    const limits = getArticleScrollReaderLimits(context);
    const width = Math.ceil(strip.width || strip.chunks[0]?.canvas?.width || 0);
    const height = Math.ceil(strip.height || 0);
    if (!width || !height) return strip;
    if (height > limits.maxFlattenedCanvasHeight || width * height > limits.maxFlattenedCanvasArea) return strip;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const theme = strip.theme || getBelowFoldScrollStoryColorway();
      ctx.fillStyle = theme.screen || theme.paper || '#ece1cf';
      ctx.fillRect(0, 0, width, height);
      strip.chunks.forEach((chunk) => {
        if (!chunk?.canvas) return;
        ctx.drawImage(chunk.canvas, 0, Math.round(chunk.y || 0));
      });
      return {
        ...strip,
        canvas,
        chunks: [],
        height,
        width,
      };
    } catch (error) {
      console.warn('Continuous article strip flattening unavailable.', error);
      return strip;
    }
  }

  async function captureBelowFoldDomChunks(html2canvas, capturePage, options) {
    const viewportWidth = options.viewportWidth || 390;
    const measuredHeight = Math.max(1, options.measuredHeight || 1200);
    const captureScale = options.captureScale || 1;
    const colorway = options.theme || getBelowFoldScrollStoryColorway();
    const captureBackground = options.subjectType === 'article' ? colorway.paper : colorway.screen;
    const chunkCssHeight = Math.max(1100, Math.min(1800, Math.floor(2400 / captureScale)));
    const chunks = [];

    capturePage.style.willChange = 'transform';
    capturePage.parentElement.style.overflow = 'hidden';
    capturePage.parentElement.style.background = captureBackground;
    const fullCanvasArea = viewportWidth * measuredHeight * captureScale * captureScale;
    const canCaptureWholeIssue = viewportWidth >= 720
      && fullCanvasArea <= 30000000
      && measuredHeight * captureScale <= 26000;
    if (canCaptureWholeIssue) {
      try {
        capturePage.style.transform = '';
        capturePage.style.willChange = '';
        capturePage.parentElement.style.height = `${measuredHeight}px`;
        const canvas = await withBelowFoldTimeout(html2canvas(capturePage.parentElement, {
          allowTaint: false,
          backgroundColor: captureBackground,
          height: measuredHeight,
          logging: false,
          scale: captureScale,
          scrollX: 0,
          scrollY: 0,
          useCORS: true,
          width: viewportWidth,
          windowHeight: measuredHeight,
          windowWidth: viewportWidth,
        }), 28000, 'Full issue capture timed out');
        return [{
          canvas,
          y: 0,
          height: canvas.height,
        }];
      } catch (error) {
        console.warn('Full issue capture fell back to slices.', error);
        capturePage.style.willChange = 'transform';
      }
    }
    capturePage.parentElement.style.height = `${chunkCssHeight}px`;

    for (let offset = 0; offset < measuredHeight; offset += chunkCssHeight) {
      if (offset > 0 && chunks.length === 1) {
        await waitForBelowFoldCaptureAssets(capturePage.parentElement);
      }
      const height = Math.min(chunkCssHeight, measuredHeight - offset);
      capturePage.parentElement.style.height = `${height}px`;
      capturePage.style.transform = `translateY(-${offset}px)`;
      const canvas = await withBelowFoldTimeout(html2canvas(capturePage.parentElement, {
        allowTaint: false,
        backgroundColor: captureBackground,
        height,
        logging: false,
        scale: captureScale,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        width: viewportWidth,
        windowHeight: height,
        windowWidth: viewportWidth,
      }), 18000, 'Issue slice capture timed out');
      chunks.push({
        canvas,
        y: Math.round(offset * captureScale),
        height: canvas.height,
      });
      if (chunks.length === 1 && typeof options.onFirstChunk === 'function') {
        try {
          options.onFirstChunk({
            chunks: chunks.slice(),
            height: Math.ceil(measuredHeight * captureScale),
            width: Math.round(viewportWidth * captureScale),
            kind: 'dom',
            theme: colorway,
          });
        } catch (_) {}
        await waitForNextScrollPreviewFrame();
      }
    }

    capturePage.style.transform = '';
    capturePage.style.willChange = '';
    return chunks;
  }

  function withBelowFoldTimeout(promise, timeoutMs, message) {
    let timeoutId;
    const guarded = Promise.resolve(promise).finally(() => {
      window.clearTimeout(timeoutId);
    });
    guarded.catch(() => {});
    return Promise.race([
      guarded,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  }

  async function waitForShareFontsReady(timeoutMs = 1600) {
    const ready = document.fonts?.ready;
    if (!ready) return;
    try {
      await Promise.race([
        ready,
        new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
      ]);
    } catch (_) {}
  }

  function getBelowFoldCaptureScale(measuredHeight, viewportWidth, context) {
    const deviceScale = Number(window.devicePixelRatio) || 1;
    if (context?.type === 'article') {
      const limits = getArticleScrollReaderLimits(context);
      const height = Math.max(1, measuredHeight || 1);
      const areaScale = Math.sqrt(limits.captureAreaBudget / Math.max(1, viewportWidth * height));
      const heightScale = limits.maxFlattenedCanvasHeight
        ? limits.maxFlattenedCanvasHeight / height
        : Number.POSITIVE_INFINITY;
      const maxAllowedScale = Math.max(
        1,
        Math.min(limits.captureScaleMax, deviceScale, areaScale, heightScale)
      );
      return maxAllowedScale;
    }
    if ((viewportWidth || 0) >= 720) {
      const height = Math.max(1, measuredHeight || 1);
      const areaScale = Math.sqrt(30000000 / Math.max(1, viewportWidth * height));
      return Math.max(1.25, Math.min(1.55, deviceScale, areaScale));
    }
    return Math.min(2.6, Math.max(2.35, deviceScale));
  }

  function ensureHtml2Canvas() {
    const existing = getHtml2CanvasInstance();
    if (existing) return Promise.resolve(existing);
    if (window.__pressHtml2CanvasPromise) return window.__pressHtml2CanvasPromise;
    window.__pressHtml2CanvasPromise = new Promise((resolve, reject) => {
      const sources = [
        'assets/vendor/html2canvas.min.js?v=1.4.1',
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      ];
      const loadNext = () => {
        const src = sources.shift();
        if (!src) {
          reject(new Error('Could not load html2canvas'));
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
          const loaded = getHtml2CanvasInstance();
          if (loaded) {
            resolve(loaded);
          } else {
            loadNext();
          }
        };
        script.onerror = loadNext;
        document.head.appendChild(script);
      };
      loadNext();
    });
    return window.__pressHtml2CanvasPromise;
  }

  function getHtml2CanvasInstance() {
    const candidates = [
      window.html2canvas,
      window.module?.exports,
      window.exports?.html2canvas,
      window.exports,
    ];
    const found = candidates.find((candidate) => typeof candidate === 'function');
    if (found && !window.html2canvas) window.html2canvas = found;
    return found || null;
  }

  async function normalizeBelowFoldCaptureMedia(root) {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map(async (img) => {
      const raw = img.currentSrc || img.getAttribute('src') || '';
      const url = normalizeShareAssetUrl(raw);
      if (url) {
        const shouldEmbed = shouldEmbedBelowFoldCaptureImage(url);
        const embedded = shouldEmbed ? await loadImageAsDataUrl(url).catch(() => '') : '';
        img.setAttribute('src', embedded || url);
      }
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'sync');
    }));
  }

  function shouldEmbedBelowFoldCaptureImage(url) {
    try {
      const parsed = new URL(url, document.baseURI || window.location.href);
      if (/^(data|blob):$/i.test(parsed.protocol)) return false;
      return parsed.origin !== window.location.origin;
    } catch (_) {
      return false;
    }
  }

  async function loadImageAsDataUrl(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return '';
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  }

  async function waitForBelowFoldCaptureAssets(root) {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        let timeout = 0;
        const done = () => {
          window.clearTimeout(timeout);
          img.removeEventListener('error', done);
          img.removeEventListener('load', done);
          resolve();
        };
        timeout = window.setTimeout(done, 1800);
        img.addEventListener('error', done, { once: true });
        img.addEventListener('load', done, { once: true });
      });
    }));
    await Promise.all(images.map((img) => {
      const decode = img.decode?.().catch(() => {}) || Promise.resolve();
      return Promise.race([
        decode,
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);
    }));
  }

  function getBelowFoldCaptureStyles(viewportWidth, colorway = getBelowFoldScrollStoryColorway()) {
    return `
      .press-scroll-capture-shell{
        --scroll-paper:${colorway.paper};
        --scroll-paper-deep:${colorway.paperDeep};
        --scroll-rule:${colorway.rule};
        --scroll-ink:${colorway.ink};
        --scroll-muted:${colorway.muted};
        --scroll-accent:${colorway.accent};
        --scroll-card:${colorway.card};
        --scroll-card-alt:${colorway.cardAlt};
        --scroll-green:${colorway.green};
        --scroll-blue:${colorway.blue};
        width:${viewportWidth}px;
        min-height:100%;
        margin:0;
        background:var(--scroll-paper);
        color:var(--scroll-ink);
        overflow:hidden;
      }
      .press-scroll-capture-shell,
      .press-scroll-capture-shell *{
        box-sizing:border-box;
        border-color:var(--scroll-rule) !important;
        caret-color:var(--scroll-ink) !important;
        color:var(--scroll-ink) !important;
        column-rule-color:var(--scroll-rule) !important;
        outline-color:var(--scroll-rule) !important;
        text-decoration-color:var(--scroll-accent) !important;
      }
      .press-scroll-capture-shell *,
      .press-scroll-capture-shell *::before,
      .press-scroll-capture-shell *::after{
        background-color:transparent !important;
        background-image:none !important;
        box-shadow:none !important;
        fill:var(--scroll-ink) !important;
        stroke:var(--scroll-ink) !important;
        text-shadow:none !important;
      }
      .press-scroll-capture-shell .below-fold,
      .press-scroll-capture-shell .below-fold *{
        border-color:var(--scroll-rule) !important;
      }
      .press-scroll-capture-shell .below-fold{
        --fold-paper:var(--scroll-paper);
        --fold-paper-deep:var(--scroll-paper-deep);
        --fold-rule:var(--scroll-rule);
        --ink:var(--scroll-ink);
        --muted:var(--scroll-muted);
        --fold-red:var(--scroll-accent);
        --fold-green:var(--scroll-green);
        --fold-blue:var(--scroll-blue);
        width:${viewportWidth}px;
        max-width:none;
        margin:0;
        padding:18px 14px 24px;
        border-top:0;
        box-shadow:none;
        background:var(--scroll-paper) !important;
      }
      .press-scroll-capture-shell p,
      .press-scroll-capture-shell dd,
      .press-scroll-capture-shell li,
      .press-scroll-capture-shell figcaption{
        line-height:1.42 !important;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell h2,
      .press-scroll-capture-shell h3,
      .press-scroll-capture-shell h4{
        line-height:1.04 !important;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell .below-fold-kicker,
      .press-scroll-capture-shell .below-fold-place-card__state,
      .press-scroll-capture-shell .below-fold-makers-card__body > span,
      .press-scroll-capture-shell .below-fold-remote-signal span,
      .press-scroll-capture-shell .below-fold-artemis-note p,
      .press-scroll-capture-shell .below-fold-artemis-timeline-card span{
        white-space:normal !important;
        line-height:1.22 !important;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell .below-fold-spread,
      .press-scroll-capture-shell .below-fold-index,
      .press-scroll-capture-shell .below-fold-brief,
      .press-scroll-capture-shell .below-fold-letter,
      .press-scroll-capture-shell .below-fold-notice,
      .press-scroll-capture-shell .below-fold-service-panel,
      .press-scroll-capture-shell .below-fold-place-card,
      .press-scroll-capture-shell .below-fold-rank-cell,
      .press-scroll-capture-shell .below-fold-automation-field,
      .press-scroll-capture-shell .below-fold-automation-field-ledger,
      .press-scroll-capture-shell .below-fold-automation-field-ledger div,
      .press-scroll-capture-shell .below-fold-automation-stat-strip article,
      .press-scroll-capture-shell .below-fold-automation-humanoid-notes article,
      .press-scroll-capture-shell .below-fold-automation-stack-copy article,
      .press-scroll-capture-shell .below-fold-automation-labor-grid article,
      .press-scroll-capture-shell .below-fold-automation-stack-signal,
      .press-scroll-capture-shell .below-fold-automation-loop,
      .press-scroll-capture-shell .below-fold-automation-loop div,
      .press-scroll-capture-shell .below-fold-automation-fact-wall,
      .press-scroll-capture-shell .below-fold-automation-fact-wall div,
      .press-scroll-capture-shell .below-fold-automation-company-board,
      .press-scroll-capture-shell .below-fold-automation-company-board__grid article,
      .press-scroll-capture-shell .below-fold-remote-field-notes,
      .press-scroll-capture-shell .below-fold-remote-compass,
      .press-scroll-capture-shell .below-fold-remote-signal,
      .press-scroll-capture-shell .below-fold-remote-daybook article,
      .press-scroll-capture-shell .below-fold-makers-person,
      .press-scroll-capture-shell .below-fold-makers-card,
      .press-scroll-capture-shell .below-fold-artemis-index,
      .press-scroll-capture-shell .below-fold-artemis-note,
      .press-scroll-capture-shell .below-fold-artemis-crew-card,
      .press-scroll-capture-shell .below-fold-artemis-timeline-card{
        background:var(--scroll-card) !important;
      }
      .press-scroll-capture-shell .below-fold-folio,
      .press-scroll-capture-shell .below-fold-quote{
        grid-template-columns:1fr !important;
        gap:.4rem;
        font-size:9px;
        text-align:left !important;
      }
      .press-scroll-capture-shell .below-fold-folio strong,
      .press-scroll-capture-shell .below-fold-folio span,
      .press-scroll-capture-shell .below-fold-quote p,
      .press-scroll-capture-shell .below-fold-quote span{
        text-align:left !important;
      }
      .press-scroll-capture-shell .below-fold-header{
        padding:14px 0 8px;
      }
      .press-scroll-capture-shell .below-fold-header h2{
        font-size:clamp(42px,16vw,68px);
        line-height:.88;
      }
      .press-scroll-capture-shell .below-fold-header p:last-child{
        max-width:100%;
        font-size:16px;
      }
      .press-scroll-capture-shell .below-fold-section-head{
        display:block;
      }
      .press-scroll-capture-shell .below-fold-section-head h3{
        font-size:29px;
        line-height:1.02;
      }
      .press-scroll-capture-shell .below-fold-spread,
      .press-scroll-capture-shell .below-fold-spread--lead,
      .press-scroll-capture-shell .below-fold-automation-orbit,
      .press-scroll-capture-shell .below-fold-automation-humanoid-layout,
      .press-scroll-capture-shell .below-fold-automation-sort-layout,
      .press-scroll-capture-shell .below-fold-automation-stack-layout,
      .press-scroll-capture-shell .below-fold-makers-lead,
      .press-scroll-capture-shell .below-fold-makers-grid,
      .press-scroll-capture-shell .below-fold-artemis-lead,
      .press-scroll-capture-shell .below-fold-artemis-roadmap-grid,
      .press-scroll-capture-shell .below-fold-artemis-hardware-layout,
      .press-scroll-capture-shell .below-fold-spread--big-three,
      .press-scroll-capture-shell .below-fold-spread--ranking,
      .press-scroll-capture-shell .below-fold-spread--regional,
      .press-scroll-capture-shell .below-fold-spread--service,
      .press-scroll-capture-shell .below-fold-remote-field-notes{
        display:grid;
        grid-template-columns:1fr !important;
        gap:14px;
      }
      .press-scroll-capture-shell .below-fold-spread{
        padding:18px 0;
      }
      .press-scroll-capture-shell .below-fold-image-frame,
      .press-scroll-capture-shell .below-fold-automation-field,
      .press-scroll-capture-shell .below-fold-brief,
      .press-scroll-capture-shell .below-fold-letter,
      .press-scroll-capture-shell .below-fold-notice,
      .press-scroll-capture-shell .below-fold-service-panel,
      .press-scroll-capture-shell .below-fold-place-card,
      .press-scroll-capture-shell .below-fold-rank-cell,
      .press-scroll-capture-shell .below-fold-remote-signal,
      .press-scroll-capture-shell .below-fold-remote-daybook article,
      .press-scroll-capture-shell .below-fold-index,
      .press-scroll-capture-shell .below-fold-ledger,
      .press-scroll-capture-shell .below-fold-makers-person,
      .press-scroll-capture-shell .below-fold-makers-card,
      .press-scroll-capture-shell .below-fold-artemis-note,
      .press-scroll-capture-shell .below-fold-artemis-crew-card,
      .press-scroll-capture-shell .below-fold-artemis-timeline-card{
        break-inside:avoid;
      }
      .press-scroll-capture-shell img{
        max-width:100%;
        height:auto;
      }
      .press-scroll-capture-shell.page-article{
        width:${viewportWidth}px;
        max-width:none;
        min-height:100%;
        margin:0;
        background:var(--scroll-paper) !important;
        color:var(--scroll-ink) !important;
        font-family:Georgia, "Times New Roman", serif;
      }
      .press-scroll-capture-shell.page-article .article,
      .press-scroll-capture-shell.page-article .article--newspaper,
      .press-scroll-capture-shell.page-article .article--heritage{
        display:block !important;
        width:${viewportWidth}px !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        background:var(--scroll-paper) !important;
        color:var(--scroll-ink) !important;
        border:0 !important;
      }
      .press-scroll-capture-shell.page-article .article-hero{
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:12px !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:22px 18px 20px !important;
        background:var(--scroll-paper) !important;
        border:0 !important;
        border-bottom:2px solid var(--scroll-rule) !important;
        box-shadow:none !important;
      }
      .press-scroll-capture-shell.page-article .article-folio{
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:4px !important;
        width:100% !important;
        margin:0 0 4px !important;
        padding:0 0 10px !important;
        border-bottom:1px solid var(--scroll-rule) !important;
        background:transparent !important;
      }
      .press-scroll-capture-shell.page-article .article-folio :where(a,span){
        display:block !important;
        min-width:0 !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        color:var(--scroll-muted) !important;
        font:800 11px/1.22 Inter, ui-sans-serif, system-ui, sans-serif !important;
        letter-spacing:.08em !important;
        text-transform:uppercase !important;
        text-decoration:none !important;
        overflow-wrap:anywhere !important;
      }
      .press-scroll-capture-shell.page-article .article-folio__home,
      .press-scroll-capture-shell.page-article .article-hero > .eyebrow{
        color:var(--scroll-accent) !important;
      }
      .press-scroll-capture-shell.page-article .article-hero > .eyebrow{
        margin:0 !important;
        font:900 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif !important;
        letter-spacing:.11em !important;
        text-transform:uppercase !important;
      }
      .press-scroll-capture-shell.page-article .article-headline{
        max-width:none !important;
        margin:0 !important;
        color:var(--scroll-ink) !important;
        font:800 clamp(44px, 14vw, 72px)/.9 "Playfair Display", Georgia, "Times New Roman", serif !important;
        letter-spacing:0 !important;
        text-wrap:balance;
      }
      .press-scroll-capture-shell.page-article .article-dek{
        max-width:none !important;
        margin:0 !important;
        color:var(--scroll-muted) !important;
        font:500 20px/1.28 "Playfair Display", Georgia, "Times New Roman", serif !important;
      }
      .press-scroll-capture-shell.page-article .article-meta{
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:4px !important;
        margin:0 !important;
        color:var(--scroll-muted) !important;
        font:800 11px/1.22 Inter, ui-sans-serif, system-ui, sans-serif !important;
        letter-spacing:.06em !important;
        text-transform:uppercase !important;
      }
      .press-scroll-capture-shell.page-article .hero-figure,
      .press-scroll-capture-shell.page-article .article-body figure{
        display:grid !important;
        gap:7px !important;
        width:100% !important;
        max-width:none !important;
        margin:4px 0 0 !important;
        padding:0 !important;
        border:1px solid var(--scroll-rule) !important;
        background:var(--scroll-card) !important;
        overflow:hidden !important;
        break-inside:avoid !important;
      }
      .press-scroll-capture-shell.page-article .hero-figure img,
      .press-scroll-capture-shell.page-article .article-body figure img{
        display:block !important;
        width:100% !important;
        height:clamp(210px, 58vw, 470px) !important;
        max-height:none !important;
        object-fit:cover !important;
        object-position:center center !important;
        filter:none !important;
      }
      .press-scroll-capture-shell.page-article .hero-figure img{
        height:clamp(280px, 72vw, 520px) !important;
      }
      .press-scroll-capture-shell.page-article figcaption{
        margin:0 !important;
        padding:8px 10px 10px !important;
        color:var(--scroll-muted) !important;
        font:700 12px/1.28 Inter, ui-sans-serif, system-ui, sans-serif !important;
      }
      .press-scroll-capture-shell.page-article .article-shell,
      .press-scroll-capture-shell.page-article .article-body,
      .press-scroll-capture-shell.page-article .article-body--newspaper,
      .press-scroll-capture-shell.page-article .press-feature-body{
        display:block !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        background:var(--scroll-paper) !important;
        color:var(--scroll-ink) !important;
        border:0 !important;
        columns:auto !important;
        column-count:1 !important;
      }
      .press-scroll-capture-shell.page-article .article-shell{
        padding:0 18px 30px !important;
      }
      .press-scroll-capture-shell.page-article .press-social-feature{
        display:block !important;
        margin:0 !important;
        padding:0 !important;
        background:transparent !important;
        border:0 !important;
      }
      .press-scroll-capture-shell.page-article .press-social-row{
        display:grid !important;
        grid-template-columns:1fr !important;
        grid-template-areas:none !important;
        gap:12px !important;
        margin:0 !important;
        padding:18px 0 !important;
        border:0 !important;
        border-bottom:1px solid var(--scroll-rule) !important;
        background:transparent !important;
      }
      .press-scroll-capture-shell.page-article .press-social-content,
      .press-scroll-capture-shell.page-article .press-social-sources{
        display:block !important;
        order:1 !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        background:transparent !important;
        grid-area:auto !important;
      }
      .press-scroll-capture-shell.page-article .press-social-side{
        display:grid !important;
        order:2 !important;
        grid-template-columns:1fr !important;
        gap:10px !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        background:transparent !important;
        grid-area:auto !important;
      }
      .press-scroll-capture-shell.page-article .press-social-side--right{
        order:3 !important;
      }
      .press-scroll-capture-shell.page-article .press-social-content h2,
      .press-scroll-capture-shell.page-article .article-body h2,
      .press-scroll-capture-shell.page-article .article-body h3{
        margin:0 0 10px !important;
        color:var(--scroll-ink) !important;
        font:800 32px/1.02 "Playfair Display", Georgia, "Times New Roman", serif !important;
        letter-spacing:0 !important;
        text-wrap:balance;
      }
      .press-scroll-capture-shell.page-article .press-social-content p,
      .press-scroll-capture-shell.page-article .press-social-content li,
      .press-scroll-capture-shell.page-article .article-body > :where(p,ul,ol,blockquote),
      .press-scroll-capture-shell.page-article .article-body section > :where(p,ul,ol,blockquote){
        max-width:none !important;
        margin:0 0 12px !important;
        color:var(--scroll-ink) !important;
        font:400 17px/1.42 Georgia, "Times New Roman", serif !important;
      }
      .press-scroll-capture-shell.page-article .press-social-content p:last-child,
      .press-scroll-capture-shell.page-article .article-body section > p:last-child{
        margin-bottom:0 !important;
      }
      .press-scroll-capture-shell.page-article .source-ref,
      .press-scroll-capture-shell.page-article .source-ref a{
        color:var(--scroll-accent) !important;
        font-size:.72em !important;
        line-height:1 !important;
        text-decoration:none !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post,
      .press-scroll-capture-shell.page-article .cartel-rail-card,
      .press-scroll-capture-shell.page-article .data-center-grid-rail-card,
      .press-scroll-capture-shell.page-article .wildlife-rail-card,
      .press-scroll-capture-shell.page-article .aside-card,
      .press-scroll-capture-shell.page-article .story-aside-module,
      .press-scroll-capture-shell.page-article .info-box,
      .press-scroll-capture-shell.page-article .notice-panel{
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:8px !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:10px !important;
        border:1px solid var(--scroll-rule) !important;
        background:var(--scroll-card) !important;
        color:var(--scroll-ink) !important;
        break-inside:avoid !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__top{
        display:grid !important;
        grid-template-columns:auto minmax(0,1fr) !important;
        gap:8px !important;
        align-items:center !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__avatar{
        display:grid !important;
        place-items:center !important;
        width:34px !important;
        height:34px !important;
        border:1px solid var(--scroll-rule) !important;
        color:var(--scroll-accent) !important;
        font:900 10px/1 Inter, ui-sans-serif, system-ui, sans-serif !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__top strong,
      .press-scroll-capture-shell.page-article .press-static-post__visual strong,
      .press-scroll-capture-shell.page-article .press-static-post h3{
        margin:0 !important;
        color:var(--scroll-ink) !important;
        font:800 18px/1.08 "Playfair Display", Georgia, "Times New Roman", serif !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__top span,
      .press-scroll-capture-shell.page-article .press-static-post__kicker,
      .press-scroll-capture-shell.page-article .press-static-post__source{
        color:var(--scroll-accent) !important;
        font:900 10px/1.18 Inter, ui-sans-serif, system-ui, sans-serif !important;
        letter-spacing:.08em !important;
        text-transform:uppercase !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post p,
      .press-scroll-capture-shell.page-article .press-static-post em{
        margin:0 !important;
        color:var(--scroll-muted) !important;
        font:600 13px/1.32 Inter, ui-sans-serif, system-ui, sans-serif !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post a{
        color:var(--scroll-accent) !important;
        font:900 10px/1.2 Inter, ui-sans-serif, system-ui, sans-serif !important;
        letter-spacing:.08em !important;
        text-decoration:none !important;
        text-transform:uppercase !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__media,
      .press-scroll-capture-shell.page-article .press-static-post__media img,
      .press-scroll-capture-shell.page-article .press-static-post__visual{
        width:100% !important;
        max-width:none !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__media{
        display:block !important;
        margin:0 !important;
        border:1px solid var(--scroll-rule) !important;
        background:var(--scroll-paper-deep) !important;
        overflow:hidden !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__media img{
        display:block !important;
        height:auto !important;
        object-fit:cover !important;
        filter:none !important;
      }
      .press-scroll-capture-shell.page-article .press-static-post__visual{
        display:grid !important;
        gap:5px !important;
        padding:0 !important;
        background:transparent !important;
      }
      body.page-article--heritage .press-scroll-capture-shell.page-article,
      body.page-article--heritage .press-scroll-capture-shell.page-article .article,
      body.page-article--heritage .press-scroll-capture-shell.page-article .article-hero,
      body.page-article--heritage .press-scroll-capture-shell.page-article .article-shell,
      body.page-article--heritage .press-scroll-capture-shell.page-article .article-body,
      body.page-article--heritage .press-scroll-capture-shell.page-article .press-feature-body,
      body.page-article--heritage .press-scroll-capture-shell.page-article .press-social-feature,
      body.page-article--heritage .press-scroll-capture-shell.page-article .press-social-row,
      body.page-article--heritage .press-scroll-capture-shell.page-article .press-social-content,
      body.page-article--heritage .press-scroll-capture-shell.page-article .press-social-side{
        background:var(--scroll-paper) !important;
        background-image:none !important;
        border-color:var(--scroll-rule) !important;
        box-shadow:none !important;
        color:var(--scroll-ink) !important;
      }
      body.page-article--heritage .press-scroll-capture-shell.page-article .hero-figure,
      body.page-article--heritage .press-scroll-capture-shell.page-article .article-body figure,
      body.page-article--heritage .press-scroll-capture-shell.page-article .press-static-post,
      body.page-article--heritage .press-scroll-capture-shell.page-article .cartel-rail-card,
      body.page-article--heritage .press-scroll-capture-shell.page-article .data-center-grid-rail-card,
      body.page-article--heritage .press-scroll-capture-shell.page-article .wildlife-rail-card,
      body.page-article--heritage .press-scroll-capture-shell.page-article .aside-card,
      body.page-article--heritage .press-scroll-capture-shell.page-article .story-aside-module,
      body.page-article--heritage .press-scroll-capture-shell.page-article .info-box,
      body.page-article--heritage .press-scroll-capture-shell.page-article .notice-panel{
        background:var(--scroll-card) !important;
        background-image:none !important;
        border-color:var(--scroll-rule) !important;
        box-shadow:none !important;
        color:var(--scroll-ink) !important;
      }
      body.page-article--heritage .press-scroll-capture-shell.page-article *,
      body.page-article--heritage .press-scroll-capture-shell.page-article *::before,
      body.page-article--heritage .press-scroll-capture-shell.page-article *::after{
        border-color:var(--scroll-rule) !important;
        box-shadow:none !important;
        text-shadow:none !important;
      }
      body.page-article--heritage .press-scroll-capture-shell.page-article *::before,
      body.page-article--heritage .press-scroll-capture-shell.page-article *::after{
        background:transparent !important;
        background-image:none !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader{
        width:${viewportWidth}px;
        max-width:none;
        min-height:100%;
        margin:0;
        padding:22px 18px 32px;
        background:var(--scroll-paper) !important;
        color:var(--scroll-ink) !important;
        font-family:Georgia, "Times New Roman", serif;
        writing-mode:horizontal-tb !important;
        text-orientation:mixed !important;
        white-space:normal !important;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader.press-article-scroll-reader--ny-love{
        padding:0 !important;
        background:#ece1cf !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader,
      .press-scroll-capture-shell .press-article-scroll-reader *{
        direction:ltr !important;
        writing-mode:horizontal-tb !important;
        text-orientation:mixed !important;
        white-space:normal !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__header{
        display:grid;
        gap:12px;
        padding:0 0 18px;
        border-bottom:2px solid var(--scroll-rule);
        background:var(--scroll-paper) !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__kicker,
      .press-scroll-capture-shell .press-article-scroll-reader__meta,
      .press-scroll-capture-shell .press-article-scroll-reader__section-number{
        margin:0;
        color:var(--scroll-accent) !important;
        font:900 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        letter-spacing:.1em;
        text-transform:uppercase;
      }
      .press-scroll-capture-shell .press-article-scroll-reader h1{
        margin:0;
        color:var(--scroll-ink) !important;
        font:800 56px/.92 "Playfair Display", Georgia, "Times New Roman", serif;
        letter-spacing:0;
        overflow-wrap:break-word !important;
        text-wrap:balance;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__dek{
        margin:0;
        color:var(--scroll-muted) !important;
        font:500 20px/1.25 "Playfair Display", Georgia, "Times New Roman", serif;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__figure{
        display:block;
        margin:0;
        padding:0;
        border:1px solid var(--scroll-rule);
        background:var(--scroll-card) !important;
        overflow:hidden;
        break-inside:avoid;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__figure--hero{
        margin-top:4px;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__figure img{
        display:block;
        width:100%;
        height:clamp(210px, 58vw, 470px) !important;
        max-height:none !important;
        object-fit:cover !important;
        object-position:center center !important;
        filter:none !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__figure--hero img{
        height:clamp(280px, 72vw, 520px) !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__figure figcaption{
        margin:0;
        padding:8px 10px 10px;
        color:var(--scroll-muted) !important;
        font:700 12px/1.28 Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow{
        display:block !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        background:#ece1cf !important;
        color:var(--scroll-ink) !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow .ny-love-page-menu,
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow [data-page-menu],
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow [data-illustration-nav]{
        display:none !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow .ny-love-page,
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow .ny-love-page.ny-love-page--newspaper-opener{
        display:block !important;
        width:100% !important;
        max-width:none !important;
        min-height:0 !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        background:#ece1cf !important;
        box-shadow:none !important;
        break-inside:auto !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow .ny-love-newspaper-sheet,
      .press-scroll-capture-shell.page-article .press-article-scroll-reader__ny-love-flow .article-body figure,
      .press-scroll-capture-shell.page-article .press-article-scroll-reader__ny-love-flow figure{
        display:block !important;
        width:100% !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        background:#ece1cf !important;
        box-shadow:none !important;
        overflow:visible !important;
        break-inside:auto !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow .ny-love-newspaper-sheet img,
      .press-scroll-capture-shell.page-article .press-article-scroll-reader__ny-love-flow figure > img{
        display:block !important;
        width:100% !important;
        max-width:none !important;
        height:auto !important;
        max-height:none !important;
        margin:0 !important;
        object-fit:contain !important;
        object-position:center center !important;
        filter:none !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__ny-love-flow .sr-only{
        position:absolute !important;
        width:1px !important;
        height:1px !important;
        padding:0 !important;
        margin:-1px !important;
        overflow:hidden !important;
        clip:rect(0,0,0,0) !important;
        white-space:nowrap !important;
        border:0 !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__section{
        display:grid;
        gap:12px;
        padding:20px 0;
        background:var(--scroll-paper) !important;
        border-bottom:1px solid var(--scroll-rule);
        break-inside:avoid;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__section h2{
        margin:0;
        color:var(--scroll-ink) !important;
        font:800 32px/1.02 "Playfair Display", Georgia, "Times New Roman", serif;
        letter-spacing:0;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__section p:not(.press-article-scroll-reader__section-number){
        margin:0;
        color:var(--scroll-ink) !important;
        font:400 17px/1.42 Georgia, "Times New Roman", serif;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__footer{
        display:grid;
        gap:8px;
        margin:24px 0 0;
        padding:18px;
        background:var(--scroll-card-alt) !important;
        border:1px solid var(--scroll-rule);
      }
      .press-scroll-capture-shell .press-article-scroll-reader__footer strong{
        color:var(--scroll-accent) !important;
        font:900 13px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        letter-spacing:.12em;
      }
      .press-scroll-capture-shell .press-article-scroll-reader__footer p{
        margin:0;
        color:var(--scroll-ink) !important;
        font:700 16px/1.24 "Playfair Display", Georgia, "Times New Roman", serif;
        overflow-wrap:anywhere;
      }
      .press-scroll-capture-shell .below-fold-image-media{
        display:block;
        width:100%;
        height:auto !important;
        min-height:0 !important;
        aspect-ratio:auto !important;
        overflow:visible !important;
        background:var(--scroll-paper-deep) !important;
      }
      .press-scroll-capture-shell .below-fold-image-media img{
        display:block;
        width:100%;
        height:auto !important;
        object-fit:contain !important;
        filter:none !important;
      }
      .press-scroll-capture-shell .below-fold-automation-lead-art .below-fold-image-media{
        border-radius:8px !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field,
      .press-scroll-capture-shell .below-fold-automation-field--wide{
        display:grid !important;
        grid-template-columns:1fr !important;
        grid-template-rows:auto auto !important;
        grid-column:auto !important;
        grid-row:auto !important;
        gap:0 !important;
        overflow:visible !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field .below-fold-image-frame{
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:6px !important;
        margin:0 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field .below-fold-image-media,
      .press-scroll-capture-shell .below-fold-automation-field--wide .below-fold-image-media{
        aspect-ratio:4 / 3 !important;
        height:auto !important;
        min-height:0 !important;
        overflow:hidden !important;
        border-right:0 !important;
        border-bottom:1px solid var(--scroll-rule) !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field .below-fold-image-media img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field figcaption{
        padding:0 10px 8px !important;
        font-size:12px !important;
        line-height:1.24 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field > div{
        display:grid !important;
        grid-template-columns:1fr !important;
        align-content:start !important;
        gap:7px !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field-grid,
      .press-scroll-capture-shell .below-fold-automation-labor-grid,
      .press-scroll-capture-shell .below-fold-automation-fact-wall,
      .press-scroll-capture-shell .below-fold-automation-company-board,
      .press-scroll-capture-shell .below-fold-automation-company-board__grid,
      .press-scroll-capture-shell .below-fold-automation-stat-strip,
      .press-scroll-capture-shell .below-fold-automation-loop,
      .press-scroll-capture-shell .below-fold-brief-grid,
      .press-scroll-capture-shell .below-fold-dispatch-grid,
      .press-scroll-capture-shell .below-fold-ledger,
      .press-scroll-capture-shell .below-fold-photo-strip,
      .press-scroll-capture-shell .below-fold-big-three-grid,
      .press-scroll-capture-shell .below-fold-ranking-grid,
      .press-scroll-capture-shell .below-fold-regional-grid,
      .press-scroll-capture-shell .below-fold-service-grid,
      .press-scroll-capture-shell .below-fold-artemis-photo-grid,
      .press-scroll-capture-shell .below-fold-artemis-crew-grid,
      .press-scroll-capture-shell .below-fold-artemis-note-grid,
      .press-scroll-capture-shell .below-fold-makers-portraits,
      .press-scroll-capture-shell .below-fold-letter-grid,
      .press-scroll-capture-shell .below-fold-notice-grid,
      .press-scroll-capture-shell .below-fold-artemis-hardware-grid{
        display:grid;
        grid-template-columns:1fr !important;
        gap:10px;
      }
      .press-scroll-capture-shell .below-fold-automation-stat-strip article,
      .press-scroll-capture-shell .below-fold-automation-field > div,
      .press-scroll-capture-shell .below-fold-automation-humanoid-notes article,
      .press-scroll-capture-shell .below-fold-automation-stack-copy article,
      .press-scroll-capture-shell .below-fold-automation-labor-grid article,
      .press-scroll-capture-shell .below-fold-automation-loop div,
      .press-scroll-capture-shell .below-fold-automation-fact-wall div,
      .press-scroll-capture-shell .below-fold-automation-company-board__head,
      .press-scroll-capture-shell .below-fold-automation-company-board__grid article{
        padding:10px !important;
      }
      .press-scroll-capture-shell .below-fold-automation-stat-strip,
      .press-scroll-capture-shell .below-fold-automation-field-ledger,
      .press-scroll-capture-shell .below-fold-automation-loop,
      .press-scroll-capture-shell .below-fold-automation-fact-wall,
      .press-scroll-capture-shell .below-fold-automation-company-board__grid,
      .press-scroll-capture-shell .below-fold-automation-labor-grid{
        gap:8px !important;
      }
      .press-scroll-capture-shell .below-fold-automation-stat-strip strong,
      .press-scroll-capture-shell .below-fold-automation-fact-wall strong,
      .press-scroll-capture-shell .below-fold-automation-company-board__grid strong{
        font-size:30px !important;
        line-height:1 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field-ledger dt{
        font-size:20px !important;
        line-height:1 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-field-ledger dd,
      .press-scroll-capture-shell .below-fold-automation-loop p,
      .press-scroll-capture-shell .below-fold-automation-company-board__grid p{
        font-size:13px !important;
        line-height:1.3 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-stack-signal__head{
        display:grid !important;
        justify-items:start !important;
        align-items:start !important;
      }
      .press-scroll-capture-shell .below-fold-automation-stack-signal__head h4{
        max-width:none !important;
        font-size:25px !important;
        line-height:1.02 !important;
        text-align:left !important;
      }
      .press-scroll-capture-shell .below-fold-automation-orbit__copy h3,
      .press-scroll-capture-shell .below-fold-automation-field h4,
      .press-scroll-capture-shell .below-fold-automation-humanoid-notes h4,
      .press-scroll-capture-shell .below-fold-automation-stack-copy h4,
      .press-scroll-capture-shell .below-fold-automation-company-board__head h4{
        font-size:24px !important;
        line-height:1.04 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-stat-strip p,
      .press-scroll-capture-shell .below-fold-automation-orbit__copy p,
      .press-scroll-capture-shell .below-fold-automation-field p,
      .press-scroll-capture-shell .below-fold-automation-sort-copy p,
      .press-scroll-capture-shell .below-fold-automation-humanoid-notes p,
      .press-scroll-capture-shell .below-fold-automation-stack-copy p,
      .press-scroll-capture-shell .below-fold-automation-labor-grid p{
        font-size:15px !important;
        line-height:1.38 !important;
      }
      .press-scroll-capture-shell .below-fold-automation-lead-art,
      .press-scroll-capture-shell .below-fold-makers-grid > *,
      .press-scroll-capture-shell .below-fold-artemis-lead > *,
      .press-scroll-capture-shell .below-fold--remote .below-fold-spread--lead > *,
      .press-scroll-capture-shell .below-fold-place-card,
      .press-scroll-capture-shell .below-fold-place-card--major,
      .press-scroll-capture-shell .below-fold-service-panel,
      .press-scroll-capture-shell .below-fold-service-panel--wide,
      .press-scroll-capture-shell .below-fold-remote-field-notes,
      .press-scroll-capture-shell .below-fold-remote-compass,
      .press-scroll-capture-shell .below-fold-remote-signal-stack,
      .press-scroll-capture-shell .below-fold-remote-daybook{
        grid-column:auto !important;
        grid-row:auto !important;
      }
      .press-scroll-capture-shell .below-fold-automation-orbit__copy--left,
      .press-scroll-capture-shell .below-fold-automation-orbit__copy--right{
        padding-left:0;
        padding-right:0;
      }
      .press-scroll-capture-shell .below-fold-automation-orbit__copy--left::after,
      .press-scroll-capture-shell .below-fold-automation-orbit__copy--right::before{
        display:none;
      }
      .press-scroll-capture-shell .below-fold-automation-stack-signal::before,
      .press-scroll-capture-shell .below-fold-automation-loop div:not(:last-child)::after,
      .press-scroll-capture-shell .below-fold-remote-route-rule i::after,
      .press-scroll-capture-shell .below-fold-service-panel li::before{
        content:none !important;
        display:none !important;
      }
      .press-scroll-capture-shell .below-fold-automation-sort-copy p:first-child::first-letter{
        float:none;
        margin:0;
        font-size:inherit;
        line-height:inherit;
      }
      .press-scroll-capture-shell .below-fold-columns{
        columns:auto !important;
        column-count:1 !important;
        column-gap:0 !important;
        column-rule:0 !important;
        display:grid !important;
        gap:.7rem !important;
      }
      .press-scroll-capture-shell .below-fold-columns p{
        margin:0 !important;
      }
      .press-scroll-capture-shell .below-fold-index{
        padding-left:0;
        border-left:0;
        border-top:1px solid var(--fold-rule,var(--scroll-rule));
        padding-top:.75rem;
      }
      .press-scroll-capture-shell .below-fold-index div,
      .press-scroll-capture-shell .below-fold-artemis-index div{
        grid-template-columns:1fr !important;
        gap:.22rem !important;
      }
      .press-scroll-capture-shell .below-fold-index dt,
      .press-scroll-capture-shell .below-fold-artemis-index dt{
        white-space:normal !important;
        font-size:12px !important;
        line-height:1.18 !important;
      }
      .press-scroll-capture-shell .below-fold-index dd,
      .press-scroll-capture-shell .below-fold-artemis-index dd{
        font-size:18px !important;
        line-height:1.18 !important;
        overflow-wrap:break-word !important;
      }
      .press-scroll-capture-shell .below-fold-makers-person:first-child,
      .press-scroll-capture-shell .below-fold-makers-grid > *,
      .press-scroll-capture-shell .below-fold-artemis-lead > *,
      .press-scroll-capture-shell .below-fold--remote .below-fold-spread--lead > *{
        grid-column:auto !important;
        grid-row:auto !important;
      }
      .press-scroll-capture-shell .below-fold-makers-person figcaption,
      .press-scroll-capture-shell .below-fold-place-card figcaption{
        display:grid !important;
        grid-template-columns:auto minmax(0,1fr);
        align-items:start !important;
      }
      .press-scroll-capture-shell .below-fold-makers-card__number{
        position:static !important;
        justify-self:start !important;
        width:auto !important;
        min-width:2.05rem !important;
        height:auto !important;
        min-height:1.85rem !important;
        margin:0 0 .1rem !important;
        padding:.28rem .48rem !important;
        font-size:1rem !important;
      }
      .press-scroll-capture-shell .below-fold-makers-card h4{
        padding-right:0 !important;
        font-size:26px !important;
        line-height:1.06 !important;
      }
      .press-scroll-capture-shell .below-fold-makers-person h4,
      .press-scroll-capture-shell .below-fold-place-card h4,
      .press-scroll-capture-shell .below-fold-rank-cell h4,
      .press-scroll-capture-shell .below-fold-service-panel h4{
        font-size:24px !important;
        line-height:1.06 !important;
      }
      .press-scroll-capture-shell .below-fold-place-card__state,
      .press-scroll-capture-shell .below-fold-rank-cell span{
        font-size:13px !important;
        line-height:1.2 !important;
      }
      .press-scroll-capture-shell .below-fold-remote-signal > div:first-child{
        display:grid !important;
        grid-template-columns:minmax(0,1fr) auto !important;
        gap:.25rem .5rem !important;
        align-items:end !important;
      }
      .press-scroll-capture-shell .below-fold-remote-signal strong{
        font-size:28px !important;
        line-height:1 !important;
      }
      .press-scroll-capture-shell .below-fold-remote-route-rule,
      .press-scroll-capture-shell .below-fold-artemis-orbit-rule{
        grid-template-columns:1fr !important;
        justify-items:start !important;
        gap:6px !important;
      }
      .press-scroll-capture-shell .below-fold-remote-route-rule i,
      .press-scroll-capture-shell .below-fold-artemis-orbit-rule i{
        display:none !important;
      }
      .press-scroll-capture-shell .below-fold-artemis-timeline-card{
        grid-template-columns:1fr !important;
      }
      .press-scroll-capture-shell .below-fold-artemis-timeline-card span{
        grid-row:auto !important;
      }
      .press-scroll-capture-shell h3,
      .press-scroll-capture-shell h4{
        overflow-wrap:anywhere;
      }
    `;
  }

  function collectBelowFoldScrollStoryModel(context) {
    const isArticle = context?.type === 'article';
    const root = isArticle
      ? getBelowFoldScrollSourceRoot(context)
      : (context.belowFoldRoot
        || document.querySelector('.page-below-fold-issue [data-below-fold-root]')
        || document.querySelector('.page-below-fold-issue .below-fold-issue-page__paper'));
    const masthead = document.querySelector('.page-below-fold-issue .below-fold-issue-page__masthead');
    const title = collapseWhitespace(context.title || masthead?.querySelector('h1')?.textContent || (isArticle ? 'The Press' : 'Below the Fold'));
    const issueMeta = collapseWhitespace(context.issueMeta || masthead?.querySelector('.below-fold-issue-page__meta')?.textContent || (isArticle ? 'The Press Article' : 'Below the Fold'));
    const dek = collapseWhitespace(context.text || masthead?.querySelector('p:not(.eyebrow):not(.below-fold-issue-page__meta)')?.textContent || '');
    const sections = collectBelowFoldScrollStorySections(root).slice(0, BELOW_FOLD_SCROLL_STORY_CRITERIA.maxCards);

    return {
      type: isArticle ? 'article' : 'belowFoldIssue',
      title,
      issueMeta,
      dek,
      coverImageUrl: '',
      sections,
      readLabel: isArticle ? 'READ THE FULL ARTICLE' : 'READ THE FULL ISSUE',
      url: context.url,
    };
  }

  function collectBelowFoldScrollStorySections(root) {
    if (!root) return [];
    const sections = [];
    const usedNodes = new Set();

    getBelowFoldScrollStoryCandidateNodes(root).forEach((node) => {
      if (isBelowFoldScrollStoryNodeCovered(node, usedNodes)) return;
      const section = buildBelowFoldScrollStorySection(node, sections.length);
      if (!section.heading && !section.texts.length && !section.imageUrl) return;
      sections.push(section);
      usedNodes.add(node);
    });

    Array.from(root.querySelectorAll('.below-fold-spread')).forEach((spread) => {
      if (isBelowFoldScrollStoryNodeCovered(spread, usedNodes)) return;
      const section = buildBelowFoldScrollStorySection(spread, sections.length);
      if (section.heading || section.texts.length || section.imageUrl) sections.push(section);
    });

    return dedupeBelowFoldSectionImages(sections);
  }

  function getBelowFoldScrollStoryCandidateNodes(root) {
    const selectors = [
      '[data-below-fold-story-card]',
      '[data-below-fold-card]',
      '.below-fold-lead-copy',
      '[data-below-fold-slot="portrait-card"]',
      '[data-below-fold-slot="supporting-piece"]',
      '.below-fold-makers-person',
      '.below-fold-makers-card',
      '.below-fold-place-card',
      '.below-fold-service-panel',
      '.below-fold-brief',
      '.below-fold-letter',
      '.below-fold-notice',
      '.below-fold-dispatch-card',
      '.below-fold-ranking-card',
      '.below-fold-regional-card',
      '.below-fold-big-three-card',
      '.below-fold-artemis-crew-card',
      '.below-fold-artemis-hardware-card',
      '.below-fold-artemis-note-card',
      '.below-fold-artemis-timeline-card',
      '.below-fold-automation-field',
      '.below-fold-automation-stack-copy article',
      '.below-fold-automation-humanoid-notes article',
      '.below-fold-automation-labor-grid article',
      '.below-fold-automation-company-board__grid article',
      '.below-fold-automation-layer-grid article',
      '.below-fold-ledger',
      '.below-fold-spread article',
      '.below-fold-spread figure',
      '.below-fold-spread aside',
      '.press-feature-segment',
      '.press-social-content',
      '.article-body > section',
      '[data-article-body] > section',
      '.article-body figure',
      '.article-body blockquote',
      '.press-static-post',
      '.press-article-scroll-reader__section',
      '.press-article-scroll-reader__figure',
      'article[data-below-fold-hook]',
      'figure[data-below-fold-hook]',
      'aside[data-below-fold-hook]',
    ];
    const seen = new Set();
    const nodes = [];
    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => {
        if (seen.has(node) || !isBelowFoldScrollStoryCandidateNode(node)) return;
        seen.add(node);
        nodes.push(node);
      });
    });
    return nodes;
  }

  function isBelowFoldScrollStoryCandidateNode(node) {
    if (!node || node.matches?.('.below-fold-header, .below-fold-folio, .below-fold-quote, .below-fold-section-head, nav, script, style')) return false;
    if (node.closest?.('.share-row, [data-below-fold-story-share]')) return false;
    return Boolean(
      node.querySelector?.('img, h2, h3, h4, p, dt, dd, strong, figcaption')
      || node.matches?.('img, h2, h3, h4, p, dt, dd, strong, figcaption')
    );
  }

  function isBelowFoldScrollStoryNodeCovered(node, usedNodes) {
    return Array.from(usedNodes).some((usedNode) => usedNode.contains(node) || node.contains(usedNode));
  }

  function buildBelowFoldScrollStorySection(node, index) {
    const heading = collapseWhitespace(
      node.querySelector('.below-fold-section-head h3, h3, h4, h2, figcaption')?.textContent
      || node.getAttribute('aria-label')
      || ''
    );
    const kicker = collapseWhitespace(
      node.querySelector('.below-fold-kicker, .below-fold-place-card__state, .below-fold-rank-cell span')?.textContent
      || node.getAttribute('data-below-fold-hook')
      || node.getAttribute('data-below-fold-slot')
      || `Page ${index + 1}`
    );
    const texts = Array.from(node.querySelectorAll('p'))
      .filter((paragraph) => !paragraph.classList.contains('below-fold-kicker') && !paragraph.closest('figcaption'))
      .map((paragraph) => collapseWhitespace(paragraph.textContent || ''))
      .filter((text) => text.length > 28)
      .slice(0, BELOW_FOLD_SCROLL_STORY_CRITERIA.maxTextBlocks);
    const facts = Array.from(node.querySelectorAll('dt, strong, .below-fold-makers-card__body span, .below-fold-automation-stack-signal__note'))
      .map((factNode) => collapseWhitespace(factNode.textContent || ''))
      .filter((text) => text.length > 1 && text.length < 34)
      .slice(0, BELOW_FOLD_SCROLL_STORY_CRITERIA.maxFactChips);
    const img = node.querySelector('img');
    const imageUrl = normalizeShareAssetUrl(img?.currentSrc || img?.getAttribute('src') || '');
    return {
      kicker,
      heading,
      texts,
      facts,
      imageUrl,
    };
  }

  function dedupeBelowFoldSectionImages(sections) {
    const seen = new Set();
    return sections.map((section) => {
      const key = getShareAssetDedupeKey(section.imageUrl);
      if (!key) return section;
      if (seen.has(key)) return { ...section, imageUrl: '' };
      seen.add(key);
      return section;
    });
  }

  function getShareAssetDedupeKey(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url, window.location.href);
      return `${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch (_) {
      return String(url).split('?')[0].toLowerCase();
    }
  }

  function drawBelowFoldScrollStrip(ctx, model) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const theme = model.theme || getBelowFoldScrollStoryColorway();
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, width, height);
    drawPaperGrain(ctx, width, height, theme.ink, 0.025);

    let y = 92;
    drawPressCanvasBrand(ctx, 92, y, { scale: 0.88, ink: theme.ink, accent: theme.accent });
    y += 174;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(92, y, 896, 8);
    y += 68;
    ctx.fillStyle = theme.muted;
    ctx.font = '900 26px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, (model.issueMeta || 'Below the Fold').toUpperCase(), 92, y, 3);
    y += 100;
    ctx.fillStyle = theme.ink;
    ctx.font = '800 96px "Playfair Display", Georgia, "Times New Roman", serif';
    y = wrapShareCanvasText(ctx, model.title, 92, y, 896, 102, 3, { minFontSize: 72 }) + 28;
    ctx.fillStyle = theme.muted;
    ctx.font = '400 33px "Playfair Display", Georgia, "Times New Roman", serif';
    y = wrapShareCanvasText(ctx, model.dek, 92, y, 860, 45, 3, { minFontSize: 27 }) + 56;

    if (model.coverImage) {
      drawShadowedPanel(ctx, 70, y, 940, 590, 24, theme.card, theme.shadow, 0, 26, 46);
      drawInstagramStoryImage(ctx, model.coverImage, 102, y + 32, 876, 526, 18, theme.paperDeep, theme.accent);
      y += 654;
    }

    model.sections.forEach((section, index) => {
      y = drawBelowFoldScrollSection(ctx, section, y, index, theme);
    });

    drawShadowedPanel(ctx, 86, y + 6, 908, 250, 22, theme.footer, theme.shadow, 0, 22, 42);
    ctx.fillStyle = theme.footerInk;
    ctx.font = '900 30px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, model.readLabel || 'READ THE FULL ISSUE', 126, y + 82, 3);
    ctx.fillStyle = theme.footerMuted;
    ctx.font = '700 34px "Playfair Display", Georgia, "Times New Roman", serif';
    wrapShareCanvasText(ctx, model.url || 'thepress.live', 126, y + 145, 820, 42, 2, { minFontSize: 24 });
    return Math.min(ctx.canvas.height, y + 320);
  }

  function drawBelowFoldScrollSection(ctx, section, y, index, theme = getBelowFoldScrollStoryColorway()) {
    const x = 70;
    const width = 940;
    const hasImage = Boolean(section.image);
    const visibleTexts = section.texts.slice(0, BELOW_FOLD_SCROLL_STORY_CRITERIA.maxTextBlocks);
    const panelHeight = hasImage
      ? BELOW_FOLD_SCROLL_STORY_CRITERIA.imageCardHeight
      : BELOW_FOLD_SCROLL_STORY_CRITERIA.textCardHeight;
    drawShadowedPanel(ctx, x, y, width, panelHeight, 24, theme.card, theme.shadow, 0, 24, 42);

    let cursor = y + 42;
    if (hasImage) {
      drawBelowFoldScrollImage(ctx, section.image, x + 34, cursor, width - 68, BELOW_FOLD_SCROLL_STORY_CRITERIA.cardImageHeight, 18, theme.paperDeep, theme.accent);
      cursor += BELOW_FOLD_SCROLL_STORY_CRITERIA.cardImageHeight + 58;
    }

    ctx.fillStyle = theme.accent;
    ctx.font = '900 22px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, `${String(index + 1).padStart(2, '0')} / ${shortenShareCanvasText(section.kicker || 'Below the Fold', 34).toUpperCase()}`, x + 42, cursor, 2.4);
    cursor += 60;

    ctx.fillStyle = theme.ink;
    ctx.font = '800 56px "Playfair Display", Georgia, "Times New Roman", serif';
    cursor = wrapShareCanvasText(ctx, section.heading || 'The file continues', x + 42, cursor, width - 84, 62, 2, { minFontSize: 42 }) + 22;

    if (section.facts?.length) {
      cursor = drawBelowFoldFactChips(ctx, section.facts, x + 42, cursor, width - 84, theme) + 24;
    }

    ctx.fillStyle = theme.muted;
    ctx.font = '400 28px "Playfair Display", Georgia, "Times New Roman", serif';
    visibleTexts.forEach((text) => {
      cursor = wrapShareCanvasText(ctx, text, x + 42, cursor, width - 84, 38, 2, { minFontSize: 24 }) + 12;
    });

    return y + panelHeight + 44;
  }

  function drawBelowFoldScrollImage(ctx, image, x, y, width, height, radius, fallback, accent) {
    ctx.save();
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = fallback || '#d9d2c5';
    ctx.fillRect(x, y, width, height);
    if (image) {
      drawShareImageContain(ctx, image, x, y, width, height);
    } else {
      drawInstagramImageFallback(ctx, x, y, width, height, accent);
    }
    ctx.restore();
  }

  function drawBelowFoldFactChips(ctx, facts, x, y, maxWidth, theme = getBelowFoldScrollStoryColorway()) {
    let cursor = x;
    let rowY = y;
    let rows = 1;
    facts.forEach((fact) => {
      const label = shortenShareCanvasText(fact, 12).toUpperCase();
      ctx.font = '900 21px Inter, ui-sans-serif, system-ui, sans-serif';
      const chipWidth = Math.min(maxWidth, Math.max(96, ctx.measureText(label).width + 44));
      if (cursor + chipWidth > x + maxWidth) {
        if (rows >= 2) return;
        rows += 1;
        cursor = x;
        rowY += 52;
      }
      ctx.fillStyle = theme.cardAlt || theme.paperDeep || '#efe7d9';
      roundRectPath(ctx, cursor, rowY, chipWidth, 42, 21);
      ctx.fill();
      ctx.fillStyle = theme.ink || '#1f1f1b';
      fillTrackedCanvasText(ctx, label, cursor + 22, rowY + 28, 1.6);
      cursor += chipWidth + 12;
    });
    return y + rows * 52;
  }

  function drawBelowFoldScrollFrame(ctx, strip, progress) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const theme = strip.theme || getBelowFoldScrollStoryColorway();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (strip.kind === 'dom') {
      drawBelowFoldDomScrollFrame(ctx, strip, progress);
      return;
    }

    const stripHeight = strip.height || strip.canvas.height;
    const stripWidth = strip.width || strip.canvas.width || width;
    const scale = width / stripWidth;
    const sourceHeight = height / scale;
    const maxScroll = Math.max(0, stripHeight - sourceHeight);
    const scrollY = maxScroll * Math.max(0, Math.min(1, progress || 0));
    ctx.fillStyle = theme.frameStart;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(strip.canvas, 0, scrollY, stripWidth, Math.min(sourceHeight, stripHeight - scrollY), 0, 0, width, height);

    const topFade = ctx.createLinearGradient(0, 0, 0, 180);
    topFade.addColorStop(0, theme.fadeStart);
    topFade.addColorStop(1, theme.fadeEnd);
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, width, 180);

    const bottomFade = ctx.createLinearGradient(0, height - 220, 0, height);
    bottomFade.addColorStop(0, theme.fadeEnd);
    bottomFade.addColorStop(1, theme.fadeBottom);
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, height - 220, width, 220);

    ctx.fillStyle = theme.progressTrack;
    roundRectPath(ctx, 92, height - 86, 896, 8, 4);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    roundRectPath(ctx, 92, height - 86, 896 * Math.max(0.04, Math.min(1, progress || 0)), 8, 4);
    ctx.fill();
  }

  function getBelowFoldDomScrollGeometry(strip, canvas) {
    const phone = getBelowFoldScrollPhoneFrame(canvas, strip);
    const stripWidth = strip.width || strip.canvas.width || 390;
    const stripHeight = strip.height || strip.canvas.height || 2400;
    const fillScale = phone.fillScale || 1;
    const scale = (phone.width / stripWidth) * fillScale;
    const sourceHeight = phone.height / scale;
    const maxScroll = Math.max(0, stripHeight - sourceHeight);
    const destWidth = stripWidth * scale;
    const destX = phone.x + ((phone.width - destWidth) / 2);
    return {
      phone,
      stripWidth,
      stripHeight,
      scale,
      sourceHeight,
      maxScroll,
      destX,
      destWidth,
    };
  }

  function isArticleScrollFullBleedStrip(strip) {
    return typeof strip?.source === 'string' && strip.source.indexOf('article-') === 0;
  }

  function getBelowFoldScrollPhoneFrame(canvas, strip = null) {
    const canvasWidth = canvas?.width || 1080;
    const canvasHeight = canvas?.height || 1920;
    if (isArticleScrollFullBleedStrip(strip)) {
      return {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        radius: 0,
        fullBleed: true,
        fillScale: ARTICLE_SCROLL_STORY_PAGE_FILL_SCALE,
      };
    }
    if (canvasWidth >= canvasHeight) {
      return {
        x: 44,
        y: 42,
        width: canvasWidth - 88,
        height: canvasHeight - 84,
        radius: 24,
      };
    }
    return {
      x: 76,
      y: 64,
      width: 928,
      height: 1790,
      radius: 42,
    };
  }

  function drawBelowFoldDomScrollFrame(ctx, strip, progress) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const { phone, stripWidth, stripHeight, scale, sourceHeight, maxScroll, destX, destWidth } = getBelowFoldDomScrollGeometry(strip, ctx.canvas);
    const sourceY = maxScroll * Math.max(0, Math.min(1, progress || 0));

    const backdrop = getBelowFoldDomFrameBackdrop(strip, width, height, phone);
    ctx.drawImage(backdrop, 0, 0);

    ctx.save();
    if (phone.radius > 0) {
      roundRectPath(ctx, phone.x, phone.y, phone.width, phone.height, phone.radius);
    } else {
      ctx.beginPath();
      ctx.rect(phone.x, phone.y, phone.width, phone.height);
    }
    ctx.clip();
    drawBelowFoldDomStripSlice(ctx, strip, {
      sourceY,
      sourceHeight: Math.min(sourceHeight, stripHeight - sourceY),
      destX,
      destY: phone.y,
      destWidth,
      scale,
      stripWidth,
    });
    ctx.restore();
  }

  function getBelowFoldDomFrameBackdrop(strip, width, height, phone) {
    const theme = strip.theme || getBelowFoldScrollStoryColorway();
    const isFullBleed = Boolean(phone.fullBleed);
    const key = `${theme.key}:${width}x${height}:${phone.x},${phone.y},${phone.width},${phone.height},${phone.radius}:${phone.fillScale || 1}:${isFullBleed ? 'full' : 'frame'}`;
    if (strip._frameBackdrop?.key === key) return strip._frameBackdrop.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, theme.frameStart);
    bg.addColorStop(0.52, theme.frameMid);
    bg.addColorStop(1, theme.frameEnd);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    drawPaperGrain(ctx, width, height, theme.frameGrain, theme.frameGrainAlpha);

    if (isFullBleed) {
      strip._frameBackdrop = { key, canvas };
      return canvas;
    }

    ctx.save();
    ctx.shadowColor = theme.phoneShadow;
    ctx.shadowOffsetY = 26;
    ctx.shadowBlur = 48;
    roundRectPath(ctx, phone.x - 10, phone.y - 10, phone.width + 20, phone.height + 20, phone.radius + 12);
    ctx.fillStyle = theme.phoneFrame;
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, phone.x, phone.y, phone.width, phone.height, phone.radius);
    ctx.clip();
    ctx.fillStyle = theme.screen;
    ctx.fillRect(phone.x, phone.y, phone.width, phone.height);
    ctx.restore();
    strip._frameBackdrop = { key, canvas };
    return canvas;
  }

  function drawBelowFoldDomStripSlice(ctx, strip, options) {
    const sourceY = options.sourceY || 0;
    const sourceHeight = Math.max(0, options.sourceHeight || 0);
    const destX = options.destX || 0;
    const destY = options.destY || 0;
    const destWidth = options.destWidth || 0;
    const scale = options.scale || 1;
    const stripWidth = options.stripWidth || strip.width || strip.canvas?.width || 390;

    if (!sourceHeight) return;
    if (Array.isArray(strip.pages) && strip.pages.length) {
      drawContinuousArticlePageLayoutsSlice(ctx, strip.pages, {
        sourceY,
        sourceHeight,
        destX,
        destY,
        destWidth,
        scale,
      });
      return;
    }
    if (!Array.isArray(strip.chunks) || !strip.chunks.length) {
      ctx.drawImage(
        strip.canvas,
        0,
        sourceY,
        stripWidth,
        sourceHeight,
        destX,
        destY,
        destWidth,
        sourceHeight * scale
      );
      return;
    }

    const sourceEnd = sourceY + sourceHeight;
    const startIndex = getBelowFoldFirstVisibleChunkIndex(strip.chunks, sourceY);
    for (let index = startIndex; index < strip.chunks.length; index += 1) {
      const chunk = strip.chunks[index];
      const chunkY = chunk.y || 0;
      const chunkHeight = chunk.height || chunk.canvas?.height || 0;
      if (chunkY > sourceEnd) break;
      const overlapTop = Math.max(sourceY, chunkY);
      const overlapBottom = Math.min(sourceEnd, chunkY + chunkHeight);
      if (overlapBottom <= overlapTop) continue;

      const sliceY = overlapTop - chunkY;
      const sliceHeight = overlapBottom - overlapTop;
      ctx.drawImage(
        chunk.canvas,
        0,
        sliceY,
        stripWidth,
        sliceHeight,
        destX,
        destY + ((overlapTop - sourceY) * scale),
        destWidth,
        sliceHeight * scale
      );
    }
  }

  function drawContinuousArticlePageLayoutsSlice(ctx, pages, options) {
    const sourceY = options.sourceY || 0;
    const sourceHeight = Math.max(0, options.sourceHeight || 0);
    const sourceEnd = sourceY + sourceHeight;
    const destX = options.destX || 0;
    const destY = options.destY || 0;
    const destWidth = options.destWidth || 0;
    const scale = options.scale || 1;
    if (!sourceHeight || !destWidth) return;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const pageY = page.y || 0;
      const pageHeight = page.height || 0;
      if (pageY > sourceEnd) break;
      if (!page?.image || !pageHeight || pageY + pageHeight < sourceY) continue;

      const overlapTop = Math.max(sourceY, pageY);
      const overlapBottom = Math.min(sourceEnd, pageY + pageHeight);
      if (overlapBottom <= overlapTop) continue;

      const sliceY = overlapTop - pageY;
      const sliceHeight = overlapBottom - overlapTop;
      const naturalWidth = page.naturalWidth || page.image.naturalWidth || page.image.width || 0;
      const naturalHeight = page.naturalHeight || page.image.naturalHeight || page.image.height || 0;
      if (!naturalWidth || !naturalHeight) continue;

      const sourceSliceY = (sliceY / pageHeight) * naturalHeight;
      const sourceSliceHeight = Math.min(naturalHeight - sourceSliceY, (sliceHeight / pageHeight) * naturalHeight);
      if (sourceSliceHeight <= 0) continue;

      ctx.drawImage(
        page.image,
        0,
        sourceSliceY,
        naturalWidth,
        sourceSliceHeight,
        destX,
        destY + ((overlapTop - sourceY) * scale),
        destWidth,
        sliceHeight * scale
      );
    }
  }

  function getBelowFoldFirstVisibleChunkIndex(chunks, sourceY) {
    let low = 0;
    let high = chunks.length - 1;
    let result = chunks.length;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const chunk = chunks[mid];
      const chunkEnd = (chunk.y || 0) + (chunk.height || chunk.canvas?.height || 0);
      if (chunkEnd > sourceY) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return result;
  }

  function waitForNextScrollPreviewFrame() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(finish);
        window.setTimeout(finish, 120);
      } else {
        window.setTimeout(finish, 34);
      }
    });
  }

  function getBelowFoldScrollTiming(strip, canvas, context) {
    const metrics = getBelowFoldScrollMetrics(strip, canvas);
    const isArticle = context?.type === 'article';
    const continuousArticleScroll = isContinuousArticleScrollContext(context);
    const articleLimits = isArticle ? getArticleScrollReaderLimits(context) : null;
    const minDurationSeconds = isArticle
      ? articleLimits.minDurationSeconds
      : BELOW_FOLD_SCROLL_STORY_CRITERIA.minDurationSeconds;
    const maxDurationSeconds = isArticle
      ? articleLimits.maxDurationSeconds
      : BELOW_FOLD_SCROLL_STORY_CRITERIA.maxDurationSeconds;
    const scrollPixelsPerSecond = isArticle
      ? articleLimits.scrollPixelsPerSecond
      : BELOW_FOLD_SCROLL_STORY_CRITERIA.scrollPixelsPerSecond;
    const seconds = metrics.maxScroll > 0
      ? Math.max(
        minDurationSeconds,
        Math.min(
          maxDurationSeconds,
          metrics.maxScroll / scrollPixelsPerSecond
        )
      )
      : (isArticle ? minDurationSeconds : 6);
    const duration = Math.round(seconds * (isArticle ? ARTICLE_SCROLL_VIDEO_DURATION_MULTIPLIER : 1) * 1000);
    return {
      duration,
      holdStart: continuousArticleScroll ? 0 : 260,
      holdBottom: continuousArticleScroll ? 0 : 300,
      returnDuration: 0,
      holdEnd: continuousArticleScroll ? 0 : 260,
      frameRate: isArticle ? articleLimits.frameRate : BELOW_FOLD_SCROLL_STORY_CRITERIA.frameRate,
      smoothFramePacing: continuousArticleScroll,
    };
  }

  function getBelowFoldScrollVideoBitsPerSecond(context) {
    if (context?.type !== 'article') return BELOW_FOLD_SCROLL_STORY_CRITERIA.videoBitsPerSecond;
    const limits = getArticleScrollReaderLimits(context);
    if (isContinuousArticleScrollContext(context) && isMobileShareDevice()) {
      return limits.mobileVideoBitsPerSecond || limits.videoBitsPerSecond;
    }
    return limits.videoBitsPerSecond;
  }

  function getArticleScrollReaderLimits(context) {
    return isContinuousArticleScrollContext(context)
      ? ARTICLE_CONTINUOUS_SCROLL_READER_LIMITS
      : ARTICLE_SCROLL_READER_LIMITS;
  }

  function getBelowFoldScrollMetrics(strip, canvas) {
    if (strip?.kind === 'dom') {
      const geometry = getBelowFoldDomScrollGeometry(strip, canvas);
      return {
        maxScroll: geometry.maxScroll,
        viewportHeight: geometry.sourceHeight,
      };
    }
    const stripHeight = strip?.height || strip?.canvas?.height || 0;
    const viewportHeight = canvas?.height || 1920;
    return {
      maxScroll: Math.max(0, stripHeight - viewportHeight),
      viewportHeight,
    };
  }

  function animateBelowFoldScrollStrip(canvas, strip, options = {}) {
    const ctx = canvas.getContext('2d');
    const duration = options.duration || 7600;
    const holdStart = options.holdStart || 400;
    const holdBottom = options.holdBottom || 0;
    const returnDuration = options.returnDuration || 0;
    const holdEnd = options.holdEnd || 500;
    const total = holdStart + duration + holdBottom + returnDuration + holdEnd;
    const frameRate = Math.max(2, Math.min(60, options.frameRate || 60));
    const frameDelay = 1000 / frameRate;
    const startedAt = performance.now();

    if (options.smoothFramePacing) {
      return animateBelowFoldScrollStripFixedFrames(ctx, strip, {
        ...options,
        duration,
        frameDelay,
        frameRate,
        holdBottom,
        holdEnd,
        holdStart,
        returnDuration,
        total,
      });
    }

    return (async () => {
      let nextFrameAt = startedAt;
      while (true) {
        const now = performance.now();
        const elapsed = Math.min(total, now - startedAt);
        const progress = getBelowFoldScrollAnimationProgress(elapsed, {
          duration,
          holdStart,
          holdBottom,
          returnDuration,
        });
        drawBelowFoldScrollFrame(ctx, strip, progress);
        options.onFrame?.(progress);
        if (elapsed >= total) break;

        nextFrameAt += frameDelay;
        if (nextFrameAt < performance.now() - frameDelay) {
          nextFrameAt = performance.now() + frameDelay;
        }
        await waitForBelowFoldAnimationDelay(Math.max(0, nextFrameAt - performance.now()));
      }
      const finalProgress = returnDuration ? 0 : 1;
      drawBelowFoldScrollFrame(ctx, strip, finalProgress);
      options.onFrame?.(finalProgress);
    })();
  }

  function animateBelowFoldScrollStripFixedFrames(ctx, strip, options = {}) {
    const duration = options.duration || 7600;
    const holdStart = options.holdStart || 400;
    const holdBottom = options.holdBottom || 0;
    const returnDuration = options.returnDuration || 0;
    const holdEnd = options.holdEnd || 500;
    const total = options.total || (holdStart + duration + holdBottom + returnDuration + holdEnd);
    const frameDelay = options.frameDelay || (1000 / Math.max(2, Math.min(60, options.frameRate || 60)));
    const startedAt = performance.now();
    const totalFrames = Math.max(1, Math.ceil(total / frameDelay));

    return (async () => {
      for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex += 1) {
        const elapsed = Math.min(total, frameIndex * frameDelay);
        const progress = getBelowFoldScrollAnimationProgress(elapsed, {
          duration,
          holdStart,
          holdBottom,
          returnDuration,
        });
        drawBelowFoldScrollFrame(ctx, strip, progress);
        options.onFrame?.(progress);
        if (elapsed >= total || frameIndex >= totalFrames) break;

        const targetFrameAt = startedAt + ((frameIndex + 1) * frameDelay);
        await waitForBelowFoldAnimationDelay(Math.max(0, targetFrameAt - performance.now()));
      }
      const finalProgress = returnDuration ? 0 : 1;
      drawBelowFoldScrollFrame(ctx, strip, finalProgress);
      options.onFrame?.(finalProgress);
    })();
  }

  function waitForBelowFoldAnimationDelay(delay) {
    return new Promise((resolve) => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        window.setTimeout(resolve, Math.max(0, delay));
        return;
      }
      const done = () => {
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(resolve);
        } else {
          resolve();
        }
      };
      if (window.requestAnimationFrame && delay <= 20) {
        window.requestAnimationFrame(resolve);
        return;
      }
      window.setTimeout(done, Math.max(0, delay));
    });
  }

  function waitForBelowFoldVideoReady(video) {
    if (!video || video.readyState >= 2) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        video.removeEventListener('loadeddata', done);
        video.removeEventListener('canplay', done);
        window.clearTimeout(timeout);
        resolve();
      };
      const timeout = window.setTimeout(done, 900);
      video.addEventListener('loadeddata', done, { once: true });
      video.addEventListener('canplay', done, { once: true });
    });
  }

  function getBelowFoldScrollAnimationProgress(elapsed, options) {
    const holdStart = options.holdStart || 0;
    const duration = Math.max(1, options.duration || 1);
    const holdBottom = options.holdBottom || 0;
    const returnDuration = options.returnDuration || 0;
    if (elapsed < holdStart) return 0;
    if (elapsed < holdStart + duration) {
      return (elapsed - holdStart) / duration;
    }
    if (elapsed < holdStart + duration + holdBottom) return 1;
    if (!returnDuration) return 1;
    const returnElapsed = elapsed - holdStart - duration - holdBottom;
    if (returnElapsed < returnDuration) {
      return 1 - easeInOutCubic(returnElapsed / returnDuration);
    }
    return 0;
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
  }

  async function drawInstagramStoryCanvas(context, canvas, styleKey = getDefaultInstagramStoryStyleKey()) {
    if (!canvas) return;
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const theme = getInstagramStoryTheme(context, styleKey);
    const accent = theme.accent;
    const title = context.type === 'site' ? "Today's Front Page" : context.title;
    const label = context.type === 'site'
      ? 'Front Page'
      : (context.type === 'belowFoldIssue' ? 'Below the Fold' : 'Article');
    const dek = context.type === 'site'
      ? 'Four stories from the latest edition.'
      : (context.text || 'Source-forward reporting from The Press.');
    const imageSrc = context.imageUrl || context.externalImageUrl;
    let image = null;
    let storyItems = [];

    if (imageSrc) {
      try {
        image = await loadShareImage(imageSrc);
      } catch (_) {}
    }
    if (context.type === 'site' && Array.isArray(context.storyItems)) {
      storyItems = await loadHomepageStoryImages(context.storyItems);
      if (storyItems[0]?.image) image = storyItems[0].image;
    }
    await waitForShareFontsReady();

    drawInstagramStoryLayout(ctx, { width, height, theme, accent, title, label, dek, image, storyItems });
  }

  async function loadHomepageStoryImages(items) {
    const usable = items.slice(0, 4);
    return Promise.all(usable.map(async (item) => {
      try {
        return { ...item, image: await loadShareImage(item.imageUrl) };
      } catch (_) {
        return item;
      }
    }));
  }

  function drawInstagramStoryLayout(ctx, data) {
    const layouts = {
      frontpage: drawInstagramStoryFrontPage,
      gallery: drawInstagramStoryGallery,
      briefing: drawInstagramStoryBriefing,
      edition: drawInstagramStoryEdition,
      spotlight: drawInstagramStorySpotlight,
    };
    const draw = layouts[data.theme.layout] || drawInstagramStoryFrontPage;
    draw(ctx, data);
  }

  function drawInstagramStoryFrontPage(ctx, { width, height, theme, accent, title, label, dek, image, storyItems }) {
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
    drawPaperGrain(ctx, width, height, '#1f1f1b', 0.035);
    drawPressCanvasBrand(ctx, 126, 112, { scale: 1.04 });
    ctx.fillStyle = accent;
    ctx.fillRect(126, 286, 828, 8);
    ctx.fillStyle = '#1f1f1b';
    ctx.font = '800 25px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, label.toUpperCase(), 126, 342, 3);
    ctx.textAlign = 'right';
    ctx.fillText('STORY EDITION', 954, 342);
    ctx.textAlign = 'left';

    drawShadowedPanel(ctx, 96, 398, 888, 1234, 18, theme.paper, 'rgba(31,31,27,.18)', 0, 28, 52);
    drawStoryImageOrMosaic(ctx, { image, storyItems, x: 146, y: 448, width: 788, height: 560, radius: 14, fallback: theme.photoBase, accent });
    ctx.fillStyle = accent;
    ctx.fillRect(146, 1056, 138, 10);
    ctx.fillStyle = '#1f1f1b';
    ctx.font = '800 76px "Playfair Display", Georgia, "Times New Roman", serif';
    const titleEnd = wrapShareCanvasText(ctx, title, 146, 1158, 788, 84, 4);
    ctx.fillStyle = '#5f5a52';
    ctx.font = '400 31px "Playfair Display", Georgia, "Times New Roman", serif';
    wrapShareCanvasText(ctx, dek, 146, titleEnd + 30, 788, 43, 3);
    ctx.restore();
  }

  function drawInstagramStoryGallery(ctx, { width, height, theme, accent, title, label, dek, image, storyItems }) {
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
    drawInstagramStoryImage(ctx, image, 0, 0, width, height, 0, theme.photoBase, accent);
    ctx.fillStyle = 'rgba(12,13,14,.5)';
    ctx.fillRect(0, 0, width, height);
    const vignette = ctx.createRadialGradient(width / 2, height * 0.42, 180, width / 2, height * 0.42, 850);
    vignette.addColorStop(0, 'rgba(255,255,255,.18)');
    vignette.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    drawShadowedPanel(ctx, 86, 96, 672, 128, 36, '#fffdf9', 'rgba(0,0,0,.24)', 0, 18, 34);
    drawPressCanvasBrand(ctx, 124, 132, { scale: 0.64 });
    drawShadowedPanel(ctx, 112, 330, 856, 690, 24, '#fffdf9', 'rgba(0,0,0,.34)', 0, 24, 58);
    drawStoryImageOrMosaic(ctx, { image, storyItems, x: 152, y: 370, width: 776, height: 610, radius: 18, fallback: theme.photoBase, accent });

    drawShadowedPanel(ctx, 92, 1110, 896, 590, 26, '#fffdf9', 'rgba(0,0,0,.28)', 0, 26, 60);
    ctx.fillStyle = accent;
    ctx.fillRect(142, 1166, 114, 10);
    ctx.fillStyle = '#1f1f1b';
    ctx.font = '800 27px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, label.toUpperCase(), 142, 1227, 3);
    ctx.font = '800 72px "Playfair Display", Georgia, "Times New Roman", serif';
    const titleEnd = wrapShareCanvasText(ctx, title, 142, 1322, 796, 80, 4);
    ctx.fillStyle = '#5f5a52';
    ctx.font = '400 30px "Playfair Display", Georgia, "Times New Roman", serif';
    wrapShareCanvasText(ctx, dek, 142, titleEnd + 26, 796, 42, 3);
    ctx.restore();
  }

  function drawInstagramStoryBriefing(ctx, { width, height, theme, accent, title, label, dek, image, storyItems }) {
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#11110f';
    ctx.fillRect(0, 0, 168, height);
    ctx.fillStyle = accent;
    ctx.fillRect(168, 0, 10, height);
    drawPressCanvasBrandChip(ctx, 232, 80, 616, 122, 0.66);

    drawShadowedPanel(ctx, 232, 270, 760, 530, 20, theme.paper, 'rgba(0,0,0,.36)', 0, 24, 52);
    drawStoryImageOrMosaic(ctx, { image, storyItems, x: 262, y: 300, width: 700, height: 470, radius: 16, fallback: theme.photoBase, accent });
    ctx.fillStyle = '#fffdf9';
    ctx.font = '800 25px Inter, ui-sans-serif, system-ui, sans-serif';
    ctx.save();
    ctx.translate(102, 1556);
    ctx.rotate(-Math.PI / 2);
    fillTrackedCanvasText(ctx, 'STORY BRIEFING', 0, 0, 6);
    ctx.restore();

    ctx.fillStyle = '#fffdf9';
    ctx.font = '800 34px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, label.toUpperCase(), 232, 900, 4);
    ctx.fillStyle = '#fffdf9';
    ctx.font = '800 82px "Playfair Display", Georgia, "Times New Roman", serif';
    const titleEnd = wrapShareCanvasText(ctx, title, 232, 1012, 780, 90, 4);
    ctx.fillStyle = '#d8d0c3';
    ctx.font = '400 31px "Playfair Display", Georgia, "Times New Roman", serif';
    wrapShareCanvasText(ctx, dek, 232, titleEnd + 32, 770, 43, 4);
    ctx.fillStyle = accent;
    ctx.fillRect(232, 1690, 190, 12);
    ctx.fillStyle = '#fffdf9';
    ctx.font = '800 25px Inter, ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('AI POWERED JOURNALISM', 232, 1760);
    ctx.restore();
  }

  function drawInstagramStoryEdition(ctx, { width, height, theme, accent, title, label, dek, image, storyItems }) {
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
    drawPaperGrain(ctx, width, height, '#1f1f1b', 0.028);
    drawShadowedPanel(ctx, 146, 160, 788, 1310, 22, '#eee5d5', 'rgba(31,31,27,.12)', -14, 22, 40);
    drawShadowedPanel(ctx, 116, 210, 848, 1320, 22, '#fffdf9', 'rgba(31,31,27,.22)', 0, 28, 58);
    drawPressCanvasBrand(ctx, 168, 304, { scale: 0.82 });
    ctx.fillStyle = accent;
    ctx.fillRect(168, 444, 742, 7);
    drawStoryImageOrMosaic(ctx, { image, storyItems, x: 168, y: 506, width: 742, height: 486, radius: 18, fallback: theme.photoBase, accent });
    ctx.fillStyle = accent;
    roundRectPath(ctx, 168, 1038, 248, 58, 29);
    ctx.fill();
    ctx.fillStyle = '#fffdf9';
    ctx.font = '800 24px Inter, ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    fillTrackedCanvasText(ctx, label.toUpperCase(), 292, 1075, 2, 'center');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1f1f1b';
    ctx.font = '800 76px "Playfair Display", Georgia, "Times New Roman", serif';
    const titleEnd = wrapShareCanvasText(ctx, title, 168, 1170, 742, 84, 4);
    ctx.fillStyle = '#5f5a52';
    ctx.font = '400 30px "Playfair Display", Georgia, "Times New Roman", serif';
    wrapShareCanvasText(ctx, dek, 168, titleEnd + 28, 742, 42, 3);
    ctx.restore();
  }

  function drawInstagramStorySpotlight(ctx, { width, height, theme, accent, title, label, dek, image, storyItems }) {
    ctx.save();
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
    drawStoryImageOrMosaic(ctx, { image, storyItems, x: 80, y: 150, width: 920, height: 860, radius: 42, fallback: theme.photoBase, accent });
    const mask = ctx.createLinearGradient(0, 560, 0, 1080);
    mask.addColorStop(0, 'rgba(31,31,27,0)');
    mask.addColorStop(1, 'rgba(31,31,27,.78)');
    ctx.fillStyle = mask;
    roundRectPath(ctx, 80, 150, 920, 860, 42);
    ctx.fill();
    drawShadowedPanel(ctx, 118, 86, 570, 116, 34, '#fffdf9', 'rgba(0,0,0,.22)', 0, 18, 32);
    drawPressCanvasBrand(ctx, 150, 120, { scale: 0.58 });
    drawShadowedPanel(ctx, 84, 1040, 912, 660, 34, '#fffdf9', 'rgba(0,0,0,.28)', 0, 24, 58);
    ctx.fillStyle = accent;
    ctx.fillRect(136, 1098, 156, 11);
    ctx.fillStyle = '#1f1f1b';
    ctx.font = '800 26px Inter, ui-sans-serif, system-ui, sans-serif';
    fillTrackedCanvasText(ctx, label.toUpperCase(), 136, 1160, 3);
    ctx.font = '800 78px "Playfair Display", Georgia, "Times New Roman", serif';
    const titleEnd = wrapShareCanvasText(ctx, title, 136, 1262, 812, 86, 3);
    ctx.fillStyle = '#5f5a52';
    ctx.font = '400 31px "Playfair Display", Georgia, "Times New Roman", serif';
    wrapShareCanvasText(ctx, dek, 136, titleEnd + 26, 812, 43, 3);
    ctx.restore();
  }

  function drawStoryImageOrMosaic(ctx, options) {
    if (options.storyItems?.length >= 2) {
      drawHomepageStoryMosaic(ctx, options);
      return;
    }
    drawInstagramStoryImage(ctx, options.image, options.x, options.y, options.width, options.height, options.radius, options.fallback, options.accent);
  }

  function drawHomepageStoryMosaic(ctx, { storyItems, x, y, width, height, radius, fallback, accent }) {
    const items = storyItems.slice(0, 4);
    const gap = 14;
    const tileWidth = (width - gap) / 2;
    const tileHeight = (height - gap) / 2;
    ctx.save();
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = fallback || '#d9e0df';
    ctx.fillRect(x, y, width, height);

    items.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const tileX = x + col * (tileWidth + gap);
      const tileY = y + row * (tileHeight + gap);
      drawInstagramStoryImage(ctx, item.image, tileX, tileY, tileWidth, tileHeight, 12, fallback, accent);

      const shade = ctx.createLinearGradient(0, tileY + tileHeight * 0.38, 0, tileY + tileHeight);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,.74)');
      roundRectPath(ctx, tileX, tileY, tileWidth, tileHeight, 12);
      ctx.fillStyle = shade;
      ctx.fill();

      ctx.fillStyle = '#fffdf9';
      ctx.font = '800 28px "Playfair Display", Georgia, "Times New Roman", serif';
      drawBottomAlignedShareCanvasText(ctx, item.title, tileX + 22, tileY + tileHeight - 27, tileWidth - 44, 31, 3, {
        minFontSize: 18,
      });
    });
    ctx.restore();
  }

  function drawInstagramStoryImage(ctx, image, x, y, width, height, radius, fallback, accent) {
    ctx.save();
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = fallback || '#d9e0df';
    ctx.fillRect(x, y, width, height);
    if (image) {
      drawShareImageCover(ctx, image, x, y, width, height);
    } else {
      drawInstagramImageFallback(ctx, x, y, width, height, accent);
    }
    ctx.restore();
  }

  function drawShadowedPanel(ctx, x, y, width, height, radius, fill, shadow, offsetX, offsetY, blur) {
    ctx.save();
    ctx.shadowColor = shadow || 'rgba(0,0,0,.18)';
    ctx.shadowOffsetX = offsetX || 0;
    ctx.shadowOffsetY = offsetY || 0;
    ctx.shadowBlur = blur || 0;
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function drawPaperGrain(ctx, width, height, color, alpha) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 620; i += 1) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 24634.6345) % 1;
      ctx.fillRect(Math.abs(x) * width, Math.abs(y) * height, 1.2, 1.2);
    }
    ctx.restore();
  }

  function drawPressCanvasBrandChip(ctx, x, y, width, height, scale) {
    drawShadowedPanel(ctx, x, y, width, height, 34, '#fffdf9', 'rgba(31,31,27,.16)', 0, 14, 28);
    drawPressCanvasBrand(ctx, x + (width - 704 * scale) / 2, y + 34, { scale });
  }

  function drawPressCanvasBrand(ctx, x, y, options = {}) {
    const scale = options.scale || 1;
    const ink = options.ink || '#1f1f1b';
    const accent = options.accent || '#9d3a2d';
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = `800 ${Math.round(76 * scale)}px "Playfair Display", Georgia, "Times New Roman", serif`;
    fillTrackedCanvasText(ctx, 'THE PRESS', x, y + 72 * scale, 3.4 * scale);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4 * scale;
    ctx.lineCap = 'round';
    const ruleY = y + 103 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 4 * scale, ruleY);
    ctx.lineTo(x + 198 * scale, ruleY);
    ctx.moveTo(x + 580 * scale, ruleY);
    ctx.lineTo(x + 704 * scale, ruleY);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = `800 ${Math.round(18 * scale)}px Inter, ui-sans-serif, system-ui, sans-serif`;
    fillTrackedCanvasText(ctx, 'AI POWERED JOURNALISM', x + 242 * scale, y + 111 * scale, 3.2 * scale);
    ctx.restore();
  }

  function drawInstagramImageFallback(ctx, x, y, width, height, accent) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, '#26344a');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(x + 42, y + 42, width - 84, height - 84);
  }

  function getBelowFoldScrollStoryColorways() {
    return [
      {
        key: 'paper',
        label: 'Paper',
        frameStart: '#111820',
        frameMid: '#241726',
        frameEnd: '#10272a',
        phoneFrame: '#11110f',
        phoneShadow: 'rgba(0,0,0,.38)',
        screen: '#f4f0e8',
        paper: '#f4f0e8',
        paperDeep: '#e7dece',
        card: '#fffdf9',
        cardAlt: '#efe7d9',
        rule: '#c7bda9',
        ink: '#1f1f1b',
        muted: '#5f5a52',
        accent: '#9d3a2d',
        green: '#4a6155',
        blue: '#304f63',
        footer: '#1f1f1b',
        footerInk: '#fffdf9',
        footerMuted: '#e7dece',
        shadow: 'rgba(31,31,27,.18)',
        fadeStart: 'rgba(20,18,15,.34)',
        fadeBottom: 'rgba(20,18,15,.38)',
        fadeEnd: 'rgba(20,18,15,0)',
        progressTrack: 'rgba(255,253,249,.86)',
        frameGrain: '#fffdf9',
        frameGrainAlpha: 0.012,
      },
      {
        key: 'ink',
        label: 'Ink',
        frameStart: '#050607',
        frameMid: '#16100f',
        frameEnd: '#111b1d',
        phoneFrame: '#050607',
        phoneShadow: 'rgba(0,0,0,.52)',
        screen: '#14120f',
        paper: '#14120f',
        paperDeep: '#211d18',
        card: '#201c18',
        cardAlt: '#2d261f',
        rule: '#51473b',
        ink: '#fff4e2',
        muted: '#c9b9a2',
        accent: '#e06b5b',
        green: '#8bb39b',
        blue: '#8daec5',
        footer: '#fff4e2',
        footerInk: '#14120f',
        footerMuted: '#5f4f40',
        shadow: 'rgba(0,0,0,.32)',
        fadeStart: 'rgba(5,6,7,.38)',
        fadeBottom: 'rgba(5,6,7,.44)',
        fadeEnd: 'rgba(5,6,7,0)',
        progressTrack: 'rgba(255,244,226,.72)',
        frameGrain: '#fff4e2',
        frameGrainAlpha: 0.014,
      },
      {
        key: 'crimson',
        label: 'Crimson',
        frameStart: '#2b0f13',
        frameMid: '#4a161d',
        frameEnd: '#221112',
        phoneFrame: '#210b0f',
        phoneShadow: 'rgba(43,15,19,.46)',
        screen: '#f8eee6',
        paper: '#f8eee6',
        paperDeep: '#ead4c7',
        card: '#fffaf5',
        cardAlt: '#f1ded1',
        rule: '#d2a996',
        ink: '#271813',
        muted: '#6d4e43',
        accent: '#b33a32',
        green: '#5d7763',
        blue: '#506b80',
        footer: '#3a1115',
        footerInk: '#fffaf5',
        footerMuted: '#f1ded1',
        shadow: 'rgba(75,28,20,.2)',
        fadeStart: 'rgba(43,15,19,.32)',
        fadeBottom: 'rgba(43,15,19,.42)',
        fadeEnd: 'rgba(43,15,19,0)',
        progressTrack: 'rgba(255,250,245,.86)',
        frameGrain: '#fffaf5',
        frameGrainAlpha: 0.012,
      },
      {
        key: 'sage',
        label: 'Sage',
        frameStart: '#12231a',
        frameMid: '#25392a',
        frameEnd: '#102427',
        phoneFrame: '#101811',
        phoneShadow: 'rgba(16,24,17,.44)',
        screen: '#eff2ea',
        paper: '#eff2ea',
        paperDeep: '#dce5d5',
        card: '#fbfff8',
        cardAlt: '#e4eadc',
        rule: '#b7c5ad',
        ink: '#1d2820',
        muted: '#566559',
        accent: '#4f7d5a',
        green: '#3f6d4b',
        blue: '#386676',
        footer: '#1d2820',
        footerInk: '#fbfff8',
        footerMuted: '#dce5d5',
        shadow: 'rgba(29,40,32,.18)',
        fadeStart: 'rgba(18,35,26,.32)',
        fadeBottom: 'rgba(18,35,26,.42)',
        fadeEnd: 'rgba(18,35,26,0)',
        progressTrack: 'rgba(251,255,248,.86)',
        frameGrain: '#fbfff8',
        frameGrainAlpha: 0.012,
      },
      {
        key: 'blueprint',
        label: 'Blueprint',
        frameStart: '#071421',
        frameMid: '#15324b',
        frameEnd: '#0b2630',
        phoneFrame: '#071421',
        phoneShadow: 'rgba(7,20,33,.48)',
        screen: '#eaf1f6',
        paper: '#eaf1f6',
        paperDeep: '#d2e1eb',
        card: '#fbfdff',
        cardAlt: '#ddebf4',
        rule: '#a9bdcb',
        ink: '#172431',
        muted: '#506374',
        accent: '#2f6f9f',
        green: '#4d7b68',
        blue: '#2f6f9f',
        footer: '#0c263b',
        footerInk: '#fbfdff',
        footerMuted: '#d2e1eb',
        shadow: 'rgba(23,36,49,.2)',
        fadeStart: 'rgba(7,20,33,.34)',
        fadeBottom: 'rgba(7,20,33,.44)',
        fadeEnd: 'rgba(7,20,33,0)',
        progressTrack: 'rgba(251,253,255,.86)',
        frameGrain: '#fbfdff',
        frameGrainAlpha: 0.012,
      },
      {
        key: 'gold',
        label: 'Gold',
        frameStart: '#301d0d',
        frameMid: '#5a3514',
        frameEnd: '#262018',
        phoneFrame: '#20140a',
        phoneShadow: 'rgba(48,29,13,.45)',
        screen: '#f6edd8',
        paper: '#f6edd8',
        paperDeep: '#e8d6af',
        card: '#fffaf0',
        cardAlt: '#eee0bf',
        rule: '#ccb27a',
        ink: '#2d2418',
        muted: '#6f6048',
        accent: '#b36b27',
        green: '#62734c',
        blue: '#546c7b',
        footer: '#2d2418',
        footerInk: '#fffaf0',
        footerMuted: '#e8d6af',
        shadow: 'rgba(45,36,24,.2)',
        fadeStart: 'rgba(48,29,13,.32)',
        fadeBottom: 'rgba(48,29,13,.42)',
        fadeEnd: 'rgba(48,29,13,0)',
        progressTrack: 'rgba(255,250,240,.86)',
        frameGrain: '#fffaf0',
        frameGrainAlpha: 0.012,
      },
    ];
  }

  function getDefaultBelowFoldScrollStoryColorwayKey() {
    return getBelowFoldScrollStoryColorways()[0]?.key || 'paper';
  }

  function getBelowFoldScrollStoryColorway(colorwayKey = getDefaultBelowFoldScrollStoryColorwayKey()) {
    const key = String(colorwayKey || '').toLowerCase();
    return getBelowFoldScrollStoryColorways().find((colorway) => colorway.key === key)
      || getBelowFoldScrollStoryColorways()[0];
  }

  function getBelowFoldColorwayBackdropCss(colorway) {
    const theme = colorway || getBelowFoldScrollStoryColorway();
    return `linear-gradient(135deg, ${theme.frameStart}, ${theme.frameMid} 54%, ${theme.frameEnd})`;
  }

  function getInstagramFallbackStyleForScrollColorway(colorwayKey) {
    const fallbackStyles = {
      paper: 'edition',
      ink: 'briefing',
      crimson: 'gallery',
      sage: 'frontpage',
      blueprint: 'spotlight',
      gold: 'edition',
    };
    return fallbackStyles[getBelowFoldScrollStoryColorway(colorwayKey).key] || 'edition';
  }

  function getInstagramStoryStyles() {
    return [
      {
        key: 'frontpage',
        label: 'Front Page',
        layout: 'frontpage',
        accent: '#9d3a2d',
        bg: '#f4f0e8',
        paper: '#fffdf9',
        photoBase: '#d9e0df',
      },
      {
        key: 'gallery',
        label: 'Gallery',
        layout: 'gallery',
        accent: '#9d3a2d',
        bg: '#14120f',
        paper: '#fffdf9',
        photoBase: '#d8d0c3',
      },
      {
        key: 'briefing',
        label: 'Briefing',
        layout: 'briefing',
        accent: '#9d3a2d',
        bg: '#1f1f1b',
        paper: '#fffdf9',
        photoBase: '#d8d0c3',
      },
      {
        key: 'edition',
        label: 'Edition',
        layout: 'edition',
        accent: '#9d3a2d',
        bg: '#e7dece',
        paper: '#fffdf9',
        photoBase: '#d7cec0',
      },
      {
        key: 'spotlight',
        label: 'Spotlight',
        layout: 'spotlight',
        accent: '#9d3a2d',
        bg: '#1f1f1b',
        paper: '#fffdf9',
        photoBase: '#d9d2c5',
      },
    ];
  }

  function getDefaultInstagramStoryStyleKey() {
    return getInstagramStoryStyles()[0]?.key || 'frontpage';
  }

  function getInstagramStoryStyle(styleKey) {
    return getInstagramStoryStyles().find((style) => style.key === styleKey) || getInstagramStoryStyles()[0];
  }

  function getInstagramStoryTheme(context, styleKey) {
    const style = getInstagramStoryStyle(styleKey);
    return {
      ...style,
      accent: style.accent || instagramStoryAccent(context),
    };
  }

  function instagramStoryAccent(context) {
    const section = `${context.title} ${context.text}`.toLowerCase();
    if (/science|ocean|climate|health/.test(section)) return '#31a89a';
    if (/sport|world cup|poker|texas/.test(section)) return '#5f8ee8';
    if (/technology|ai|drone|battery/.test(section)) return '#8067f2';
    if (/culture|film|music|streaming/.test(section)) return '#e45086';
    return '#e16b4f';
  }

  function loadShareImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let timeout = 0;
      const finish = (callback, value) => {
        window.clearTimeout(timeout);
        img.onload = null;
        img.onerror = null;
        callback(value);
      };
      timeout = window.setTimeout(() => finish(reject, new Error('Share image load timed out.')), 2400);
      img.onload = () => finish(resolve, img);
      img.onerror = () => finish(reject, new Error('Share image failed to load.'));
      img.src = src;
    });
  }

  function drawShareImageCover(ctx, img, x, y, width, height) {
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return;
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawShareImageContain(ctx, img, x, y, width, height) {
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return;
    const scale = Math.min(width / naturalWidth, height / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function wrapShareCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines, options = {}) {
    const layout = layoutShareCanvasText(ctx, text, maxWidth, lineHeight, maxLines, options);
    return drawShareCanvasTextLines(ctx, layout.lines, x, y, layout.lineHeight, layout.font);
  }

  function drawBottomAlignedShareCanvasText(ctx, text, x, bottomY, maxWidth, lineHeight, maxLines, options = {}) {
    const layout = layoutShareCanvasText(ctx, text, maxWidth, lineHeight, maxLines, options);
    const startY = bottomY - Math.max(0, layout.lines.length - 1) * layout.lineHeight;
    drawShareCanvasTextLines(ctx, layout.lines, x, startY, layout.lineHeight, layout.font);
    return startY;
  }

  function drawShareCanvasTextLines(ctx, lines, x, y, lineHeight, font) {
    const originalFont = ctx.font;
    ctx.font = font || originalFont;
    let cursor = y;
    lines.forEach((line) => {
      ctx.fillText(line, x, cursor);
      cursor += lineHeight;
    });
    ctx.font = originalFont;
    return cursor;
  }

  function layoutShareCanvasText(ctx, text, maxWidth, lineHeight, maxLines, options = {}) {
    const originalFont = ctx.font;
    const originalSize = getShareCanvasFontSize(originalFont);
    const minFontSize = options.minFontSize || Math.max(18, Math.round(originalSize * 0.78));
    const step = options.step || 2;
    let fontSize = originalSize;
    let lines = [];

    while (fontSize >= minFontSize) {
      ctx.font = setShareCanvasFontSize(originalFont, fontSize);
      lines = getShareCanvasTextLines(ctx, text, maxWidth);
      if (lines.length <= maxLines) break;
      fontSize -= step;
    }

    if (fontSize < minFontSize) {
      fontSize = minFontSize;
      ctx.font = setShareCanvasFontSize(originalFont, fontSize);
      lines = getShareCanvasTextLines(ctx, text, maxWidth);
    }

    const fittedLineHeight = Math.max(18, Math.round(lineHeight * (fontSize / originalSize)));
    lines = clampShareCanvasTextLines(ctx, lines, maxLines, maxWidth);
    ctx.font = originalFont;

    return {
      font: setShareCanvasFontSize(originalFont, fontSize),
      lineHeight: fittedLineHeight,
      lines,
    };
  }

  function getShareCanvasTextLines(ctx, text, maxWidth) {
    const words = collapseWhitespace(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';

    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        return;
      }
      if (line) lines.push(line);
      line = ctx.measureText(word).width > maxWidth
        ? fitShareCanvasLine(ctx, word, maxWidth)
        : word;
    });

    if (line) lines.push(line);
    return lines;
  }

  function clampShareCanvasTextLines(ctx, lines, maxLines, maxWidth) {
    if (!maxLines || lines.length <= maxLines) return lines;
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = fitShareCanvasLine(ctx, [clipped[maxLines - 1], ...lines.slice(maxLines)].join(' '), maxWidth);
    return clipped;
  }

  function fitShareCanvasLine(ctx, text, maxWidth) {
    const value = collapseWhitespace(text);
    if (!value || ctx.measureText(value).width <= maxWidth) return value;
    const suffix = '...';
    let low = 0;
    let high = value.length;
    let best = suffix;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = `${value.slice(0, mid).trim()}${suffix}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        best = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return best;
  }

  function getShareCanvasFontSize(font) {
    const match = String(font || '').match(/(\d+(?:\.\d+)?)px/);
    return match ? Number(match[1]) : 16;
  }

  function setShareCanvasFontSize(font, size) {
    return String(font || '').replace(/(\d+(?:\.\d+)?)px/, `${Math.round(size)}px`);
  }

  function measureTrackedCanvasText(ctx, text, tracking) {
    return [...String(text || '')].reduce((width, char, index, chars) => (
      width + ctx.measureText(char).width + (index < chars.length - 1 ? tracking : 0)
    ), 0);
  }

  function fillTrackedCanvasText(ctx, text, x, y, tracking = 0, align = 'left') {
    const chars = [...String(text || '')];
    const totalWidth = measureTrackedCanvasText(ctx, text, tracking);
    let cursor = x;
    if (align === 'center') cursor -= totalWidth / 2;
    if (align === 'right') cursor -= totalWidth;
    chars.forEach((char, index) => {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + (index < chars.length - 1 ? tracking : 0);
    });
    return totalWidth;
  }

  function shortenShareCanvasText(value, max) {
    const text = collapseWhitespace(value);
    if (!max || text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
  }

  function roundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve) => {
      if (!canvas?.toBlob) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  function setInstagramStoryAssetActionLabels(modal, kind, context) {
    if (!modal) return;
    const isVideo = kind === 'video';
    const saveToPhotosMode = isVideo && isContinuousArticleScrollContext(context) && isMobileShareDevice();
    const nativeButton = modal.querySelector('[data-instagram-story-native]');
    const downloadButton = modal.querySelector('[data-instagram-story-download]');
    if (nativeButton) nativeButton.textContent = saveToPhotosMode ? 'Share / Save Video' : (isVideo ? 'Share video' : 'Share image');
    if (downloadButton) downloadButton.textContent = saveToPhotosMode ? 'Save Video to Photos' : (isVideo ? 'Save video' : 'Save to device');
  }

  async function saveInstagramStoryStudioAsset(modal, canvas, context, status) {
    const asset = modal?._pressInstagramStoryAsset;
    if (asset?.kind === 'video' && asset.blob) {
      if (isContinuousArticleScrollContext(context)) {
        if (isMobileShareDevice()) {
          setInstagramStoryStatus(status, 'Opening Save Video options...');
          const shared = await shareInstagramStoryBlob(asset.blob, asset.filename, context, status, {
            requirePhotosCompatibleVideo: true,
            fileOnly: true,
            successMessage: 'Choose Save Video to save it to Photos.',
            cancelMessage: 'Save Video did not open. Tap Share / Save Video and choose Save Video.',
          });
          if (shared) return true;
          return false;
        }
        return downloadInstagramStoryBlobAsset(asset, status, isMobileShareDevice()
          ? 'Device download started. If Photos did not appear, the video may be too large for iOS sharing.'
          : 'Video download started.');
      }
      if (isMobileShareDevice()) {
        setInstagramStoryStatus(status, 'Opening save options...');
        const shared = await shareInstagramStoryBlob(asset.blob, asset.filename, context, status, {
          successMessage: 'Choose Save Video to save it to Photos.',
          cancelMessage: 'Save sheet closed. Starting a device download.',
        });
        if (shared) return true;
      }
      if (!isMobileShareDevice() && typeof window.showSaveFilePicker === 'function') {
        const picked = await saveInstagramStoryBlobWithPicker(asset, status);
        if (picked) return true;
      }
      return downloadInstagramStoryBlobAsset(asset, status, isMobileShareDevice()
        ? 'Device download started. For Photos, use Share video and choose Save Video.'
        : 'Video download started.');
    }
    return saveInstagramStoryCanvas(canvas, context, status);
  }

  async function nativeShareInstagramStoryStudioAsset(modal, canvas, context, status) {
    const asset = modal?._pressInstagramStoryAsset;
    if (asset?.kind === 'video' && asset.blob) {
      const platform = getScrollStoryPlatformMeta(context.scrollStoryPlatform);
      const saveToPhotosMode = isContinuousArticleScrollContext(context) && isMobileShareDevice();
      const shared = await shareInstagramStoryBlob(asset.blob, asset.filename, context, status, {
        requirePhotosCompatibleVideo: saveToPhotosMode,
        fileOnly: saveToPhotosMode,
        successMessage: saveToPhotosMode
          ? 'Choose Save Video to save it to Photos.'
          : `Share sheet opened. Choose ${platform.label} if it appears.`,
        cancelMessage: saveToPhotosMode
          ? 'Save Video did not open. The phone may be blocking this file.'
          : 'Video share did not open. Starting download.',
      });
      if (shared) return true;
      if (saveToPhotosMode) return false;
      return downloadInstagramStoryBlobAsset(asset, status, 'Video sharing was blocked here, so the download started.');
    }
    return nativeShareInstagramStoryCanvas(canvas, context, status);
  }

  async function openInstagramStoryWithStudioAsset(modal, canvas, context, status) {
    if (isBelowFoldScrollStoryContext(context) && getScrollStoryPlatformMeta(context.scrollStoryPlatform).platform !== 'instagram') {
      return openScrollVideoPlatformWithStudioAsset(modal, canvas, context, status);
    }
    const asset = modal?._pressInstagramStoryAsset;
    if (asset?.kind === 'video' && asset.blob) {
      const isMobile = isMobileShareDevice();
      if (isMobile) {
        const shared = await shareInstagramStoryBlob(asset.blob, asset.filename, context, status);
        if (shared) return true;
        const copied = await copyShareText(context);
        downloadInstagramStoryBlobAsset(asset, status, 'Scroll video download started.');
        window.location.href = 'instagram://story-camera';
        window.setTimeout(() => {
          if (!document.hidden) openShareWindow('https://www.instagram.com/');
        }, 900);
        setInstagramStoryStatus(status, copied
          ? 'Instagram opened. Video saved and link copied for a sticker.'
          : 'Instagram opened. Upload the saved scroll video.');
        return true;
      }

      downloadInstagramStoryBlobAsset(asset, status, 'Scroll video download started. Instagram is opening.');
      const copied = await copyShareText(context);
      openShareWindow('https://www.instagram.com/');
      setInstagramStoryStatus(status, copied
        ? 'Instagram opened. Scroll video downloaded and link copied for a sticker.'
        : 'Instagram opened. Scroll video downloaded; upload it from your device.');
      return true;
    }

    const isMobile = isMobileShareDevice();
    if (isMobile) {
      const shared = await shareInstagramStoryFile(canvas, context, status);
      if (shared) return true;
      const copied = await copyShareText(context);
      window.location.href = 'instagram://story-camera';
      window.setTimeout(() => {
        if (!document.hidden) openShareWindow('https://www.instagram.com/');
      }, 900);
      setInstagramStoryStatus(status, copied
        ? 'Instagram Story opened. Link copied for a sticker.'
        : 'Instagram Story opened. Use Save image if the image is not attached.');
      return true;
    }

    startInstagramStoryDownloadFromCanvas(canvas, getInstagramStoryFilename(context), status, 'Story PNG download started. Instagram is opening.');
    const copied = await copyShareText(context);
    openShareWindow('https://www.instagram.com/');
    setInstagramStoryStatus(status, copied
      ? 'Instagram opened. PNG downloaded and link copied for a sticker.'
      : 'Instagram opened. PNG downloaded; upload it from your device.');
    return true;
  }

  async function openScrollVideoPlatformWithStudioAsset(modal, canvas, context, status) {
    const asset = modal?._pressInstagramStoryAsset;
    const platform = getScrollStoryPlatformMeta(context.scrollStoryPlatform);
    const isMobile = isMobileShareDevice();

    if (asset?.kind === 'video' && asset.blob && (isMobile || platform.platform === 'sms')) {
      const shared = await shareInstagramStoryBlob(asset.blob, asset.filename, context, status, {
        successMessage: `Share sheet opened. Choose ${platform.label} if it appears.`,
        cancelMessage: `${platform.label} share did not open. Preparing fallback.`,
      });
      if (shared) return true;
    }

    if (asset?.kind === 'video' && asset.blob) {
      downloadInstagramStoryBlobAsset(asset, status, `Scroll video downloaded for ${platform.label}.`);
    } else {
      await downloadInstagramStoryCanvas(canvas, context, status, {
        statusMessage: `Scroll image downloaded for ${platform.label}.`,
      });
    }

    const copied = await copyShareText(context);
    if (platform.platform === 'sms') {
      const opened = openSmsShare(context);
      setInstagramStoryStatus(status, opened
        ? (copied ? 'Messages opened. Link copied and scroll video downloaded.' : 'Messages opened. Scroll video downloaded.')
        : (copied ? 'Link copied. Scroll video downloaded for Messages.' : 'Scroll video downloaded for Messages.'));
      return opened;
    }

    const target = getScrollStoryPlatformShareUrl(platform.platform, context);
    const opened = target ? openShareWindow(target) : false;
    setInstagramStoryStatus(status, opened
      ? (copied ? `${platform.label} opened. Scroll video downloaded and link copied.` : `${platform.label} opened. Scroll video downloaded.`)
      : (copied ? `Link copied. Scroll video downloaded for ${platform.label}.` : `Scroll video downloaded for ${platform.label}.`));
    return opened;
  }

  function getScrollStoryPlatformShareUrl(platform, context) {
    const meta = getScrollStoryPlatformMeta(platform);
    const encodedTitle = encodeURIComponent(context.title || 'The Press');
    const encodedUrl = encodeURIComponent(context.url || window.location.href);
    if (meta.platform === 'x') return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    if (meta.platform === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    return meta.fallbackUrl;
  }

  function openSmsShare(context) {
    const url = `sms:?&body=${encodeURIComponent(`${context.title || 'The Press'} ${context.url || window.location.href}`)}`;
    try {
      if (isMobileShareDevice()) {
        window.location.href = url;
        return true;
      }
      return openShareWindow(url);
    } catch (_) {
      return false;
    }
  }

  async function shareInstagramStoryBlob(blob, filename, context, status, options = {}) {
    if (!blob || typeof File === 'undefined' || !navigator.share) return false;
    if (!options.allowLargeVideo && shouldAvoidMobileScrollVideoFileShare(blob, context)) {
      setInstagramStoryStatus(status, options.cancelMessage || 'Video is large, so starting a safer download.');
      return false;
    }
    const fileType = getInstagramStoryVideoFileMimeType(blob.type || filename || '');
    if (options.requirePhotosCompatibleVideo && !/mp4/i.test(fileType)) {
      setInstagramStoryStatus(status, options.cancelMessage || 'Photos save needs an MP4 video. Starting download.');
      return false;
    }
    let file;
    try {
      file = new File([blob], filename || `the-press-instagram-story${getInstagramStoryVideoFileExtension(fileType)}`, { type: fileType });
    } catch (error) {
      console.warn('Video file share preparation failed.', error);
      setInstagramStoryStatus(status, options.cancelMessage || 'Video share could not prepare. Starting download.');
      return false;
    }
    const shareData = { files: [file] };
    if (!options.fileOnly) {
      shareData.title = context.title;
      shareData.text = context.url;
    }

    const canAskForFileShare = !navigator.canShare || navigator.canShare({ files: [file] });
    if (!canAskForFileShare) return false;

    try {
      await navigator.share(shareData);
      setInstagramStoryStatus(status, options.successMessage || 'Share sheet opened. Choose Instagram Stories if it appears.');
      return true;
    } catch (_) {
      setInstagramStoryStatus(status, options.cancelMessage || 'Video share did not open. Starting download.');
      return false;
    }
  }

  function shouldAvoidMobileScrollVideoFileShare(blob, context) {
    return isMobileShareDevice()
      && isContinuousArticleScrollContext(context)
      && (blob?.size || 0) > ARTICLE_SCROLL_STORY_MOBILE_SHARE_LIMIT_BYTES;
  }

  async function saveInstagramStoryBlobWithPicker(asset, status) {
    if (!asset?.blob || typeof window.showSaveFilePicker !== 'function') return false;
    const filename = asset.filename || 'the-press-instagram-story.webm';
    const mimeType = getInstagramStoryVideoFileMimeType(asset.mimeType || asset.blob.type || filename);
    const extension = getInstagramStoryVideoFileExtension(mimeType);
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: extension === '.mp4' ? 'MP4 video' : 'WebM video',
          accept: { [mimeType]: [extension] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(asset.blob);
      await writable.close();
      setInstagramStoryStatus(status, 'Video saved.');
      return true;
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Video file picker save failed.', error);
      }
      return false;
    }
  }

  function downloadInstagramStoryBlobAsset(asset, status, message) {
    if (!asset?.blob) return false;
    try {
      const url = asset.url || URL.createObjectURL(asset.blob);
      const started = triggerTemporaryDownload(url, asset.filename || 'the-press-instagram-story.webm');
      if (!asset.url) window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setInstagramStoryStatus(status, started
        ? (message || 'Video download started.')
        : 'Save was blocked. Try Share video.');
      return started;
    } catch (error) {
      console.warn('Video download failed.', error);
      setInstagramStoryStatus(status, 'Save was blocked. Try Share video.');
      return false;
    }
  }

  function getSupportedInstagramStoryVideoType() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
    return [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function getInstagramStoryVideoFilename(context, mimeType) {
    const extension = getInstagramStoryVideoFileExtension(mimeType).slice(1);
    const platform = getScrollStoryPlatformMeta(context?.scrollStoryPlatform).platform;
    const colorway = getBelowFoldScrollStoryColorway(context?.scrollStoryColorway);
    const suffix = platform === 'instagram' ? 'instagram-scroll' : `${platform}-scroll-video`;
    return `${slugifyShareFilename(context.title || 'the-press')}-${suffix}-${colorway.key}.${extension}`;
  }

  function getInstagramStoryVideoFileMimeType(value) {
    return /mp4/i.test(String(value || '')) ? 'video/mp4' : 'video/webm';
  }

  function getInstagramStoryVideoFileExtension(mimeType) {
    return /mp4/i.test(String(mimeType || '')) ? '.mp4' : '.webm';
  }

  async function downloadInstagramStoryCanvas(canvas, context, status, options = {}) {
    const filename = getInstagramStoryFilename(context);
    return startInstagramStoryDownloadFromCanvas(canvas, filename, status, options.statusMessage);
  }

  async function saveInstagramStoryCanvas(canvas, context, status) {
    if (isMobileShareDevice()) {
      setInstagramStoryStatus(status, 'Opening save options...');
      const shared = await shareInstagramStoryFile(canvas, context, status, {
        successMessage: 'Choose Save Image to save it to Photos.',
        cancelMessage: 'Save sheet closed. Starting a device download.',
      });
      if (shared) return true;
    }

    return downloadInstagramStoryCanvas(canvas, context, status, {
      statusMessage: isMobileShareDevice()
        ? 'Device download started. For Photos, use Share image and choose Save Image.'
        : 'Image download started.',
    });
  }

  function startInstagramStoryDownloadFromCanvas(canvas, filename, status, statusMessage) {
    try {
      const started = triggerTemporaryDownload(canvas.toDataURL('image/png'), filename);
      setInstagramStoryStatus(status, started
        ? (statusMessage || 'Image save started.')
        : 'Save was blocked. Try Share image.');
      return started;
    } catch (_) {
      setInstagramStoryStatus(status, 'Save was blocked. Try Share image.');
      return false;
    }
  }

  async function nativeShareInstagramStoryCanvas(canvas, context, status) {
    const sharedFile = await shareInstagramStoryFile(canvas, context, status);
    if (sharedFile) return;

    await downloadInstagramStoryCanvas(canvas, context, status, {
      skipPicker: true,
      statusMessage: 'Image sharing was blocked here, so the PNG download started.',
    });
  }

  async function shareInstagramStoryFile(canvas, context, status, options = {}) {
    if (!isMobileShareDevice()) return false;
    const blob = await canvasToPngBlob(canvas);
    if (!blob || typeof File === 'undefined' || !navigator.share) return false;

    const file = new File([blob], getInstagramStoryFilename(context), { type: 'image/png' });
    const shareData = {
      files: [file],
      title: context.title,
      text: context.url,
    };

    const canAskForFileShare = !navigator.canShare || navigator.canShare({ files: [file] });
    if (!canAskForFileShare) return false;

    try {
      await navigator.share(shareData);
      setInstagramStoryStatus(status, options.successMessage || 'Share sheet opened. Choose Instagram Stories if it appears.');
      return true;
    } catch (_) {
      setInstagramStoryStatus(status, options.cancelMessage || 'Image share did not open. Starting PNG download.');
      return false;
    }
  }

  function getInstagramStoryFilename(context) {
    return `${slugifyShareFilename(context.title || 'the-press')}-instagram-story.png`;
  }

  function isMobileShareDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function slugifyShareFilename(value) {
    const slug = collapseWhitespace(value)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || 'the-press';
  }

  function triggerTemporaryDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    let started = false;
    try {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      started = true;
    } catch (_) {
      try {
        link.click();
        started = true;
      } catch (__) {
        started = false;
      }
    }
    window.setTimeout(() => link.remove(), 0);
    return started;
  }

  function setInstagramStoryStatus(status, message) {
    if (!status) return;
    status.textContent = message;
  }

  async function handleSmsShare(row, control, context) {
    const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isPhone && control.href) {
      window.location.href = control.href;
      return;
    }
    const copied = await copyShareText(context);
    setShareStatus(row, copied ? 'Message text copied' : 'Message text ready to copy');
  }

  async function copyShareText(context) {
    const text = getShareCopyText(context);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }
      return true;
    } catch (_) {
      try {
        fallbackCopyText(text);
        return true;
      } catch (__) {
        // Some browsers block clipboard writes on local pages; the platform still opens.
      }
    }
    return false;
  }

  function copyShareTextImmediately(context) {
    const text = getShareCopyText(context);
    let copied = false;
    try {
      fallbackCopyText(text);
      copied = true;
    } catch (_) {}
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    return copied;
  }

  function getShareCopyText(context) {
    return context.url;
  }

  function setShareStatus(row, message) {
    const status = row.querySelector('[data-share-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.add('is-visible');
    clearTimeout(status._pressTimer);
    status._pressTimer = setTimeout(() => {
      status.classList.remove('is-visible');
      status.textContent = '';
    }, 3200);
  }

  function showManualCopyText(row, context) {
    clearManualCopyText(row);
    const input = document.createElement('input');
    input.className = 'share-row__manual-copy';
    input.type = 'text';
    input.readOnly = true;
    input.value = getShareCopyText(context);
    input.setAttribute('aria-label', 'Selected share text');
    row.appendChild(input);
    input.focus({ preventScroll: true });
    input.select();
    input.setSelectionRange(0, input.value.length);
  }

  function clearManualCopyText(row) {
    row.querySelectorAll('.share-row__manual-copy').forEach((node) => node.remove());
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy command rejected');
  }

  /* ── Hover micro-animation for daily cards ────────────────────────── */
  function applyDailyCardHover() {
    document.querySelectorAll('.daily-card, .story-card--daily').forEach((card) => {
      const link = card.querySelector('a[href]');
      if (!link) return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        window.location.href = link.href;
      });
    });
  }

/* =========================
   HOMEPAGE ROTATION PATCH
   ========================= */

function pressEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pressEscapeAttribute(value) {
  return pressEscapeHtml(value);
}

function pressSectionHref(sectionName) {
  const slug = String(sectionName || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug ? `section-${slug}.html` : 'archive.html';
}

function pressNormalizeSectionLabel(value) {
  return String(value || 'front page')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pressNormalizeRotationUrl(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\.\//, '')
    .replace(/[?#].*$/, '');
}

function pressSortValue(story) {
  const direct = Number(story && story.sortValue);
  if (Number.isFinite(direct)) return direct;

  const maybeDates = [
    story && story.publishedAt,
    story && story.published,
    story && story.publishDate,
    story && story.date,
    story && story.updatedAt,
    story && story.timestamp
  ];

  for (const value of maybeDates) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

function pressNormalizeStory(story) {
  if (!story) return null;

  const url = story.url || story.href || story.link || story.permalink || '';
  const title = story.title || story.headline || story.name || '';
  if (!url || !title) return null;

  const summary = story.dek || story.summary || story.description || story.excerpt || '';
  const image = story.image || story.imageUrl || story.thumbnail || story.photo || '';

  return {
    ...story,
    url,
    title,
    image,
    imageAlt: story.imageAlt || story.alt || title,
    section: story.section || story.desk || story.category || 'News',
    type: story.type || story.kind || 'Story',
    dek: summary,
    summary,
    published: story.published || story.displayDate || story.date || '',
    byline: story.byline || story.author || story.authors || '',
    sortValue: pressSortValue(story),
  };
}

function pressMetaLabel(story) {
  return AUTHOR_LABEL;
}

function pressMetaLine(story) {
  const author = pressMetaLabel(story);
  const published = String((story && story.published) || '').trim();
  return published ? `${author} • ${published}` : author;
}

function pressBindThumbnailFallbacks(root = document) {
  const scope = root && root.querySelectorAll ? root : document;

  scope.querySelectorAll('img').forEach((img) => {
    if (img.dataset.pressFallbackBound === 'true') return;
    img.dataset.pressFallbackBound = 'true';

    img.addEventListener('error', () => {
      const wrapper = img.closest('.story-card__image, .river-item__thumb, .lead-panel__media');
      if (wrapper) {
        wrapper.style.display = 'none';
      } else {
        img.style.display = 'none';
      }
    });
  });
}

function pressNormalizeVisibleBylines(root = document) {
  const scope = root && root.querySelectorAll ? root : document;

  scope.querySelectorAll('.story-card__meta, .river-item__meta, .lead-panel__meta').forEach((el) => {
    const text = String(el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text === '•') el.remove();
  });
}

function pressHydrateMissingCardImages(root = document) {
  try {
    if (typeof hydrateMissingCardImages === 'function') {
      hydrateMissingCardImages(root);
    }
  } catch (error) {
    /* noop */
  }
}

function pressSetupLeadPanels() {
  const leadButtons = Array.from(document.querySelectorAll('[data-lead-button]'));
  const leadPanels = Array.from(document.querySelectorAll('[data-lead-panel]'));
  if (!leadButtons.length || !leadPanels.length) return;

  const setLead = (targetId) => {
    leadButtons.forEach((btn) => {
      const active = btn.dataset.target === targetId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    leadPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === targetId);
    });

    if (window.PressHeroStandard?.layoutLeadNav) {
      window.PressHeroStandard.layoutLeadNav();
    } else {
      pressLayoutLeadNav();
    }
  };

  leadButtons.forEach((btn) => {
    if (btn.dataset.pressLeadBound === 'true') return;
    btn.dataset.pressLeadBound = 'true';
    btn.addEventListener('click', () => setLead(btn.dataset.target));
  });

  const chosenButton = leadButtons.find((button) => button.classList.contains('is-active')) || leadButtons[0];
  if (chosenButton) setLead(chosenButton.dataset.target);
}

function pressLayoutLeadNav(navBox = document.querySelector('.lead-nav')) {
  if (!navBox) return;

  const buttons = Array.from(navBox.querySelectorAll('[data-lead-button]'));
  const sideButtons = buttons.filter((button) => !button.classList.contains('is-active')).slice(0, 6);
  const slots = ['left-1', 'left-2', 'left-3', 'right-1', 'right-2', 'right-3'];

  buttons.forEach((button) => {
    button.removeAttribute('data-side-slot');
  });

  sideButtons.forEach((button, index) => {
    button.setAttribute('data-side-slot', slots[index]);
  });

  navBox.dataset.sideLayout = 'split';
}

function pressShuffleArray(items) {
  return Array.isArray(items) ? items.slice() : [];
}

function pressRotateFromLastHero(source) {
  const candidates = Array.isArray(source) ? source.slice() : [];
  if (candidates.length < 2) return candidates;

  let previousUrl = '';
  try {
    previousUrl = sessionStorage.getItem('press-future-newsroom-hero-url') || '';
  } catch (_) {}

  const previousKey = pressNormalizeRotationUrl(previousUrl);
  const previousIndex = previousKey
    ? candidates.findIndex((story) => pressNormalizeRotationUrl(story && story.url) === previousKey)
    : -1;
  const startIndex = previousIndex >= 0 ? (previousIndex + 1) % candidates.length : 0;

  return candidates.slice(startIndex).concat(candidates.slice(0, startIndex));
}

function pressPickStorySet(source, count, used, uniqueSections = false) {
  const picked = [];
  const seenSections = new Set();
  const candidates = pressShuffleArray(Array.isArray(source) ? source : []);

  const tryTake = (story, enforceUniqueSections) => {
    if (!story || !story.url || used.has(story.url)) return false;

    const sectionKey = pressNormalizeSectionLabel(story.section);
    if (enforceUniqueSections && seenSections.has(sectionKey)) return false;

    used.add(story.url);
    seenSections.add(sectionKey);
    picked.push(story);

    return picked.length >= count;
  };

  for (const story of candidates) {
    if (tryTake(story, uniqueSections)) return picked;
  }

  for (const story of candidates) {
    if (tryTake(story, false)) return picked;
  }

  return picked;
}

function pressRenderLeadPanel(story, index) {
  const imageHtml = story.image
    ? `<img src="${pressEscapeAttribute(story.image)}" alt="${pressEscapeAttribute(story.imageAlt || story.title || '')}" loading="eager" decoding="async" />`
    : '';

  return `
    <div class="lead-panel${index === 0 ? ' is-active' : ''}" data-lead-panel id="lead-${index}">
      <div class="lead-panel__media">
        ${imageHtml}
      </div>
      <div class="lead-panel__body">
        <div>
          <p class="eyebrow">Front Page • ${pressEscapeHtml(story.section || 'News')} • ${pressEscapeHtml(story.type || 'Story')}</p>
          <h2><a href="${pressEscapeAttribute(story.url)}">${pressEscapeHtml(story.title || '')}</a></h2>
          <p class="lead-panel__dek">${pressEscapeHtml(story.dek || story.summary || '')}</p>
          <p class="lead-panel__meta">${pressEscapeHtml(pressMetaLine(story))}</p>
        </div>
        <div class="button-row">
          <a class="button" href="${pressEscapeAttribute(story.url)}">Read story</a>
          <a class="button button--ghost" href="${pressEscapeAttribute(pressSectionHref(story.section))}">More ${pressEscapeHtml(String(story.section || 'news').toLowerCase())}</a>
        </div>
      </div>
    </div>
  `;
}

function pressRenderLeadNavThumb(story) {
  if (story?.image) {
    return `
      <span class="lead-nav__thumb" aria-hidden="true">
        <img src="${pressEscapeAttribute(story.image)}" alt="" loading="lazy" decoding="async" />
      </span>
    `;
  }

  return `
    <span class="lead-nav__thumb lead-nav__thumb--fallback" aria-hidden="true">
      <span>${pressEscapeHtml(story?.section || 'Story')}</span>
    </span>
  `;
}

function pressRenderHomepageLeadStories(stories) {
  const panelBox = document.querySelector('.lead-switcher__panels');
  const navBox = document.querySelector('.lead-nav');

  if (!panelBox || !navBox || !stories.length) return;

  panelBox.innerHTML = stories.map((story, index) => pressRenderLeadPanel(story, index)).join('');
  navBox.innerHTML = stories.map((story, index) => `
    <button class="lead-nav__button${index === 0 ? ' is-active' : ''}" type="button" data-lead-button data-target="lead-${index}" aria-pressed="${String(index === 0)}">
      ${pressRenderLeadNavThumb(story)}
      <span class="lead-nav__kicker">${pressEscapeHtml(story.section || 'Front Page')}</span>
      <strong>${pressEscapeHtml(story.title || '')}</strong>
    </button>
  `).join('');

  pressBindThumbnailFallbacks(panelBox);
  pressSetupLeadPanels();
}

function pressRenderHomeStoryCard(story) {
  const imageHtml = story.image ? `
    <a class="story-card__image" href="${pressEscapeAttribute(story.url)}">
      <img alt="${pressEscapeAttribute(story.imageAlt || story.title || '')}" decoding="async" loading="lazy" src="${pressEscapeAttribute(story.image)}" />
    </a>
  ` : '';

  return `
    <article class="story-card" data-section="${pressEscapeAttribute(story.section || '')}" data-type="${pressEscapeAttribute(story.type || '')}" data-story-url="${pressEscapeAttribute(story.url)}">
      ${imageHtml}
      <div class="story-card__body">
        <p class="eyebrow eyebrow--compact">${pressEscapeHtml(story.section || '')} • ${pressEscapeHtml(story.type || '')}</p>
        <h3 class="story-card__title"><a href="${pressEscapeAttribute(story.url)}">${pressEscapeHtml(story.title || '')}</a></h3>
        <p class="story-card__dek">${pressEscapeHtml(story.dek || story.summary || '')}</p>
        <p class="story-card__meta">${pressEscapeHtml(pressMetaLine(story))}</p>
      </div>
    </article>
  `;
}

function pressRenderHomepageSecondaryStories(stories) {
  const grid = document.querySelector('.home-grid__main .cards-grid.cards-grid--three');
  if (!grid || !stories.length) return;

  grid.innerHTML = stories.map((story) => pressRenderHomeStoryCard(story)).join('');
  pressNormalizeVisibleBylines(grid);
  pressBindThumbnailFallbacks(grid);
  pressHydrateMissingCardImages(grid);
}

function pressRenderRiverStory(story) {
  const imageHtml = story.image ? `
    <a class="river-item__thumb" href="${pressEscapeAttribute(story.url)}">
      <img alt="${pressEscapeAttribute(story.imageAlt || story.title || '')}" decoding="async" loading="lazy" src="${pressEscapeAttribute(story.image)}" />
    </a>
  ` : '';

  return `
    <article class="river-item" data-story-url="${pressEscapeAttribute(story.url)}">
      ${imageHtml}
      <div class="river-item__body">
        <p class="eyebrow eyebrow--tiny">${pressEscapeHtml(story.section || '')} • ${pressEscapeHtml(story.type || '')}</p>
        <h3><a href="${pressEscapeAttribute(story.url)}">${pressEscapeHtml(story.title || '')}</a></h3>
        <p>${pressEscapeHtml(story.dek || story.summary || '')}</p>
        <p class="river-item__meta">${pressEscapeHtml(pressMetaLine(story))}</p>
      </div>
    </article>
  `;
}

function pressRenderHomepageRiverStories(stories) {
  const river = document.querySelector('.latest-section .river');
  if (!river || !stories.length) return;

  river.innerHTML = stories.map((story) => pressRenderRiverStory(story)).join('');
  pressNormalizeVisibleBylines(river);
  pressBindThumbnailFallbacks(river);
  pressHydrateMissingCardImages(river);
}

function pressMakeCardsClickable() {
  document.querySelectorAll('.link-list__item, .related-card, .story-card, .archive-card, .river-item, .lead-panel').forEach((card) => {
    if (card.dataset.pressClickableBound === 'true') return;
    card.dataset.pressClickableBound = 'true';

    const link = card.querySelector('a[href]');
    if (!link) return;

    card.classList.add('is-clickable');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'link');

    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button, label') || pressIsEditableTarget(event.target)) return;
      window.location.href = link.href;
    });

    card.addEventListener('keydown', (event) => {
      if (pressIsEditableTarget(event.target)) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        link.click();
      }
    });
  });
}

function pressRefreshHomepageStoryBlocks(stories) {
  const hasHomepageTargets =
    document.querySelector('.lead-switcher__panels') ||
    document.querySelector('.home-grid__main .cards-grid.cards-grid--three') ||
    document.querySelector('.latest-section .river');

  if (!hasHomepageTargets) return;

  const pool = Array.isArray(stories)
    ? stories.map(pressNormalizeStory).filter((story) => story && story.url && story.title)
    : [];

  if (!pool.length) return;

  const recent = pool.slice().sort((a, b) => b.sortValue - a.sortValue);
  const used = new Set();

  const leadPool = recent.filter((story) => story.image);
  const leadSource = leadPool.length ? leadPool : recent;
  const heroCount = window.PressHeroStandard?.heroSlotCount || 7;
  const leadStories = pressPickStorySet(
    pressRotateFromLastHero(leadSource),
    heroCount,
    used,
    true
  );

  pressRenderHomepageLeadStories(leadStories);

  pressRenderHomepageSecondaryStories(
    pressPickStorySet(recent.filter((story) => !used.has(story.url)), 4, used, true)
  );

  pressRenderHomepageRiverStories(
    pressPickStorySet(recent.filter((story) => !used.has(story.url)), 8, used, false)
  );

  pressMakeCardsClickable();
}
})();

/* PRESS_AI_BYLINE_PATCH_START */
document.addEventListener("DOMContentLoaded", () => {
  const selectors = [
    ".byline",
    ".story-card__meta",
    ".lead-panel__meta",
    ".link-list__meta",
    ".article-meta"
  ];

  document.querySelectorAll(selectors.join(",")).forEach((el) => {
    const text = (el.textContent || "").trim();
    if (!text) return;
    if (/^(?:By\s+)?The Press\b/i.test(text) || el.querySelector('a[href*="#the-press"]')) {
      el.textContent = text.replace(/^(?:By\s+)?(?:The Press(?:\s+Staff)?|Intelligent AI|Written and Researched by AI)(?=\s*[•·]|\s*$)/i, "By The Press");
      return;
    }

    if (text.startsWith("By ")) {
      el.textContent = text.replace(/^By\s+[^•]+/, "By The Press");
    } else if (/^(?:Intelligent AI|Written and Researched by AI)\b/i.test(text)) {
      el.textContent = text.replace(/^(?:Intelligent AI|Written and Researched by AI)\b/i, "By The Press");
    }
  });
});
/* PRESS_AI_BYLINE_PATCH_END */
/* PRESS_ECOSYSTEM_ENGINE_START
   Drop this entire block at the very bottom of app.js.
   It turns the homepage, section pages, archive, freshness chips, desk pulse,
   catch-up cards, and reading modes into a cleaner live article ecosystem.
*/
(() => {
  'use strict';

  const PRESS_AUTHOR = 'By The Press';
  const CACHE_PREFIX = 'press-ecosystem-cache:';
  const MODE_KEY = 'press-reader-mode';
  const FRESH_HOURS = 72;
  const LIVE_DAYS = 14;
  const HERO_TARGET = 7;
  const HERO_AUTO_SEED = 2;
  const HERO_ROTATION_KEY = 'press-future-newsroom-hero-url';
  const FETCH_TARGETS = {
    placements: 'placements.json',
    live: 'live-index.json',
    content: 'content-index.json',
    daily: 'daily-latest.json',
    edition: 'edition.json',
    search: 'search-index.json',
  };

  const SECTION_COPY = {
    ai: 'Model labs, compute, safety, infrastructure, and the business systems underneath artificial intelligence.',
    cartoons: 'Editorial cartoons, visual satire, and drawn commentary, clearly labeled.',
    culture: 'Institutions, labor, audiences, and the economics under the room.',
    economics: 'Indicators translated back into rent, wages, spending, and shelter.',
    education: 'Schools, campuses, attendance, learning, and public-system capacity.',
    film: 'Festivals, studios, directors, box office, and the machinery of screen culture.',
    geopolitics: 'War, diplomacy, alliances, borders, and the logistics behind power.',
    health: 'Public health, vaccination, surveillance, and the line between fear and evidence.',
    niche: 'Internet microcultures, collector obsessions, odd markets, and the small trends that explain big moods.',
    opinion: 'Arguments anchored in public facts, not hot air.',
    philosophy: 'Essays on judgment, ethics, institutions, and the words societies use to think.',
    politics: 'Power, administration, elections, and the law of democratic procedure.',
    popculture: 'Pop music, fandom, celebrity systems, festivals, and the internet’s cultural weather.',
    science: 'Research, engineering, and the physical systems required to turn ambition into evidence.',
    technology: 'Infrastructure, industry, and the machinery behind digital life.',
    world: 'Alliances, borders, defense industry, and how geopolitical language becomes logistics.',
  };

  const SECTION_ALIAS = {
    ai: ['ai', 'artificial intelligence', 'technology'],
    artificialintelligence: ['ai', 'artificial intelligence', 'technology'],
    film: ['film', 'culture'],
    geopolitics: ['geopolitics', 'world'],
    popculture: ['pop culture', 'popculture', 'culture'],
    niche: ['niche', 'culture'],
    world: ['world', 'geopolitics'],
    technology: ['technology', 'ai'],
    culture: ['culture', 'film', 'pop culture', 'niche'],
  };

  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'could', 'for', 'from', 'has', 'have', 'how', 'in', 'into', 'is',
    'it', 'its', 'new', 'not', 'now', 'of', 'on', 'or', 'over', 'that', 'the', 'their', 'this', 'to', 'with', 'without', 'why', 'will',
    'after', 'before', 'still', 'about', 'what', 'when', 'where', 'who', 'than', 'then', 'there', 'they', 'was', 'were', 'been', 'being',
  ]);

  let ecosystemState = null;
  let ecosystemPromise = null;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  ready(() => {
    document.documentElement.classList.add('press-ecosystem-booting');
    installReadingModes();
    installWhyTooltips();
    installSmartSearchHook();

    loadEcosystem().then((state) => {
      ecosystemState = state;
      document.documentElement.classList.remove('press-ecosystem-booting');
      document.documentElement.classList.add('press-ecosystem-ready');

      renderEverything(state);

      window.dispatchEvent(new CustomEvent('press:ecosystem-ready', { detail: state }));
    }).catch((error) => {
      document.documentElement.classList.remove('press-ecosystem-booting');
      console.warn('[The Press] Ecosystem engine could not initialize:', error);
    });
  });

  function loadEcosystem() {
    if (ecosystemPromise) return ecosystemPromise;

    ecosystemPromise = (async () => {
      const needsBroadIndex =
        document.body.classList.contains('page-archive') ||
        document.body.classList.contains('page-section');
      const needsDailyIndex = document.body.classList.contains('page-home') || needsBroadIndex;
      const [placementsRaw, liveRaw, contentRaw, dailyRaw, editionRaw, embeddedRaw] = await Promise.all([
        fetchOptionalJson(FETCH_TARGETS.placements),
        fetchOptionalJson(FETCH_TARGETS.live),
        needsBroadIndex ? fetchOptionalJson(FETCH_TARGETS.content) : Promise.resolve(null),
        needsDailyIndex ? fetchOptionalJson(FETCH_TARGETS.daily) : Promise.resolve(null),
        needsBroadIndex ? fetchOptionalJson(FETCH_TARGETS.edition) : Promise.resolve(null),
        Promise.resolve(readEmbeddedSearchJson()),
      ]);

      const sourceStories = mergeStories([
        extractStories(contentRaw, 'content-index'),
        extractStories(liveRaw, 'live-index'),
        extractStories(dailyRaw, 'daily-latest'),
        extractStories(editionRaw, 'edition'),
        extractStories(embeddedRaw, 'embedded-search'),
      ]);

      const stories = sourceStories
        .filter((story) => story.title && story.url && !pressIsBelowFoldIndexItem(story.raw || story, story.url, story.section, story.type))
        .sort((a, b) => b.sortValue - a.sortValue || a.title.localeCompare(b.title));

      const visibleStories = document.body.classList.contains('page-home')
        ? stories.filter((story) => !pressIsCartoonIndexItem(story.raw || story, story.url, story.section))
        : stories;
      const model = buildPlacementModel(visibleStories, normalizePlacementFile(placementsRaw));

      return {
        stories: visibleStories,
        model,
        generatedAt: new Date().toISOString(),
      };
    })();

    return ecosystemPromise;
  }

  async function fetchOptionalJson(url) {
    try {
      const response = await fetch(versionedJsonAssetUrl(url), { cache: 'no-cache' });
      if (!response.ok) return readCachedJson(url);

      const json = await response.json();
      writeCachedJson(url, json);
      return json;
    } catch (_) {
      return readCachedJson(url);
    }
  }

  function writeCachedJson(url, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({
        savedAt: Date.now(),
        data,
      }));
    } catch (_) {}
  }

  function readCachedJson(url) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + url);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return parsed && parsed.data ? parsed.data : null;
    } catch (_) {
      return null;
    }
  }

  function versionedJsonAssetUrl(url) {
    const resolved = new URL(pressSiteAssetUrl(url), window.location.href);
    const appVersion = new URL(document.querySelector('script[src*="app.js"]')?.src || window.location.href).searchParams.get('v');
    if (appVersion) resolved.searchParams.set('v', appVersion);
    return resolved.href;
  }

  function readEmbeddedSearchJson() {
    const node = document.getElementById('press-search-data');
    if (!node) return null;

    try {
      return JSON.parse(node.textContent || '[]');
    } catch (_) {
      return null;
    }
  }

  function extractStories(payload, sourceName) {
    if (!payload) return [];

    if (Array.isArray(payload)) {
      return payload.map((item) => normalizeStory(item, sourceName)).filter(Boolean);
    }

    if (Array.isArray(payload.stories)) {
      return payload.stories.map((item) => normalizeStory(item, sourceName)).filter(Boolean);
    }

    if (Array.isArray(payload.articles)) {
      return payload.articles.map((item) => normalizeStory(item, sourceName)).filter(Boolean);
    }

    if (Array.isArray(payload.items)) {
      return payload.items.map((item) => normalizeStory(item, sourceName)).filter(Boolean);
    }

    return [];
  }

  function normalizeStory(item, sourceName) {
    if (!item || typeof item !== 'object') return null;

    const title = clean(item.title || item.headline || item.name || '');
    const url = clean(item.url || item.href || item.link || item.filename || item.permalink || '');

    if (!title || !url || url === '#') return null;

    const section = titleCaseSection(item.section || item.desk || item.category || inferSectionFromUrl(url) || 'News');
    const type = clean(item.type || item.kind || item.story_type || (url.startsWith('daily/') ? 'Daily Issue' : 'Report'));
    if (pressIsBelowFoldIndexItem(item, url, section, type)) return null;
    const summary = clean(item.dek || item.summary || item.description || item.excerpt || '');
    const publishedLabel = clean(item.published || item.publishedLabel || item.published_label || item.displayDate || item.date || '');
    const updatedLabel = clean(item.updated || item.updatedLabel || item.updated_label || item.updatedAt || '');
    const publishedIso = clean(item.publishedIso || item.published_iso || item.publishedAt || item.published_at || '');
    const updatedIso = clean(item.updatedIso || item.updated_iso || item.updatedAt || item.updated_at || '');
    const sortValue = parsePressDate(publishedIso || publishedLabel || item.date || urlDateHint(url));
    const image = clean(item.image || item.imageUrl || item.image_url || item.thumbnail || item.photo || '');
    const imageAlt = clean(item.imageAlt || item.image_alt || item.alt || item.photoAlt || item.photo_alt || title);
    const keywords = Array.isArray(item.keywords) ? item.keywords.filter(Boolean).map(String) : [];
    const storyId = clean(item.story_id || item.storyId || item.id || slugFromUrl(url));
    const clusterId = clean(item.cluster_id || item.clusterId || makeClusterId(title, keywords, section));
    const readTime = clean(item.readTime || item.read_time || '');
    const wordCount = clean(item.wordCount || item.word_count || '');
    const author = clean(item.author || item.byline || item.authors || PRESS_AUTHOR).replace(/^By\s+/i, '');
    const byline = PRESS_AUTHOR;

    return {
      raw: item,
      sourceName,
      storyId,
      clusterId,
      title,
      section,
      sectionSlug: slugify(section),
      type,
      dek: summary,
      summary,
      url,
      image,
      imageAlt,
      author: author || PRESS_AUTHOR,
      byline,
      published: publishedLabel || formatDateLabel(sortValue),
      publishedIso: publishedIso || (sortValue ? new Date(sortValue).toISOString() : ''),
      updated: updatedLabel,
      updatedIso,
      sortValue,
      ageHours: sortValue ? Math.max(0, (Date.now() - sortValue) / 36e5) : 999999,
      keywords,
      readTime,
      wordCount,
      priority: Number(item.priority || item.editorial_priority || 0) || 0,
      heroEligible: item.hero_eligible !== false,
      status: clean(item.status || 'published'),
      isDaily: /daily\//i.test(url) || /daily/i.test(type),
    };
  }

  function mergeStories(groups) {
    const byUrl = new Map();
    const flat = groups.flat().filter(Boolean);

    flat.forEach((story) => {
      const key = normalizeUrlKey(story.url);
      const previous = byUrl.get(key);

      if (!previous) {
        byUrl.set(key, story);
        return;
      }

      byUrl.set(key, mergeStoryPair(previous, story));
    });

    return Array.from(byUrl.values())
      .filter((story) => !/draft|private|trash/i.test(story.status || ''));
  }

  function mergeStoryPair(a, b) {
    const newer = (b.sortValue || 0) >= (a.sortValue || 0) ? b : a;
    const older = newer === b ? a : b;

    return {
      ...older,
      ...newer,
      image: newer.image || older.image,
      imageAlt: newer.imageAlt || older.imageAlt,
      dek: longer(newer.dek, older.dek),
      summary: longer(newer.summary, older.summary),
      keywords: Array.from(new Set([...(older.keywords || []), ...(newer.keywords || [])])),
      readTime: newer.readTime || older.readTime,
      wordCount: newer.wordCount || older.wordCount,
      clusterId: newer.clusterId || older.clusterId,
      priority: Math.max(Number(older.priority || 0), Number(newer.priority || 0)),
    };
  }

  function longer(a, b) {
    return String(a || '').length >= String(b || '').length ? (a || b || '') : (b || a || '');
  }

  function buildPlacementModel(stories, placementFile) {
    const all = stories.slice().sort((a, b) => b.sortValue - a.sortValue);

    const byId = new Map();
    all.forEach((story) => {
      byId.set(story.storyId, story);
      byId.set(story.url, story);
      byId.set(normalizeUrlKey(story.url), story);
    });

    const liveCutoff = Date.now() - LIVE_DAYS * 24 * 36e5;
    const recentEnough = all.filter((story) => !story.sortValue || story.sortValue >= liveCutoff);
    const livePool = recentEnough.length >= 12 ? recentEnough : all.slice(0, Math.max(24, Math.min(all.length, 60)));
    const clusterFresh = freshestPerCluster(livePool);

    const usedClusters = new Set();
    const usedUrls = new Set();

    const heroTarget = Math.max(7, Number(placementFile?.home?.hero_slots || placementFile?.home?.heroSlots || HERO_TARGET) || HERO_TARGET);
    const resolvedHero = resolvePlacementList(placementFile?.home?.hero, byId, heroTarget)
      .filter(Boolean);
    const hasManualHero = resolvedHero.length > 0;
    const autoHero = hasManualHero ? [] : pickStories(clusterFresh.filter((story) => story.heroEligible && story.image), Math.min(HERO_AUTO_SEED, heroTarget), {
      usedClusters: new Set(),
      usedUrls: new Set(),
      uniqueSections: false,
    });
    const heroUsedClusters = new Set(autoHero.map((story) => story.clusterId));
    const heroUsedUrls = new Set(autoHero.map((story) => story.url));
    resolvedHero.forEach((story) => remember(story, heroUsedClusters, heroUsedUrls));
    const heroBase = resolvedHero
      .concat(autoHero)
      .concat(pickStories(clusterFresh.filter((story) => story.heroEligible && story.image), heroTarget - autoHero.length - resolvedHero.length, {
        usedClusters: heroUsedClusters,
        usedUrls: heroUsedUrls,
        uniqueSections: true,
      }))
      .concat(pickStories(clusterFresh, heroTarget, {
        usedClusters: heroUsedClusters,
        usedUrls: heroUsedUrls,
        uniqueSections: true,
      }))
      .slice(0, heroTarget);
    const hero = rotateHeroListFromStoredHero(heroBase);

    hero.forEach((story) => remember(story, usedClusters, usedUrls));

    const secondaryTarget = 4;
    const secondary = resolvePlacementList(placementFile?.home?.secondary, byId, secondaryTarget).slice(0, secondaryTarget);
    const secondaryFinal = secondary.slice();

    secondaryFinal.forEach((story) => remember(story, usedClusters, usedUrls));

    if (secondaryFinal.length < secondaryTarget) {
      secondaryFinal.push(...pickStories(clusterFresh, secondaryTarget - secondaryFinal.length, {
          usedClusters,
          usedUrls,
          uniqueSections: true,
        }));
    }

    const latestPool = uniqueByCluster(all);
    const latest = latestPool.slice(0, 15);
    const heroUrls = new Set(hero.map((story) => story.url));
    const recencyTicker = latestPool.filter((story) => !heroUrls.has(story.url)).slice(0, 15);
    const daily = all.filter((story) => story.isDaily).slice(0, 15);
    const railUsed = new Set([...hero, ...secondaryFinal].map((story) => story.clusterId));
    const railPool = clusterFresh.filter((story) => !railUsed.has(story.clusterId));

    const mostRead = resolvePlacementList(placementFile?.home?.most_read || placementFile?.home?.mostRead, byId, 5);
    const mostReadFinal = mostRead.length ? mostRead : scoreSort(railPool, 'mostRead').slice(0, 5);

    const pickUsed = new Set([...railUsed, ...mostReadFinal.map((story) => story.clusterId)]);
    const editorsPicks = resolvePlacementList(placementFile?.home?.editors_picks || placementFile?.home?.editorsPicks, byId, 4);
    const editorsFinal = editorsPicks.length
      ? editorsPicks
      : scoreSort(clusterFresh.filter((story) => !pickUsed.has(story.clusterId)), 'editors').slice(0, 4);

    const breaking = uniqueByCluster(all).slice(0, 14);
    const deskPulse = buildDeskPulse(livePool);

    return {
      all,
      livePool,
      hero,
      secondary: secondaryFinal,
      mostRead: mostReadFinal,
      editorsPicks: editorsFinal,
      latest,
      recencyTicker,
      daily: daily.length >= 5 ? daily : latest.slice(0, 15),
      breaking,
      deskPulse,
      updatedLabel: latest[0]?.published || 'Updated recently',
      storyCount: all.length,
      liveCount: livePool.length,
    };
  }

  function normalizePlacementFile(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.slots) return { home: payload.slots.home || payload.home || {} };
    if (payload.home) return payload;
    return null;
  }

  function resolvePlacementList(value, byId, limit) {
    const values = Array.isArray(value) ? value : value ? [value] : [];

    return values.map((entry) => {
      const key = typeof entry === 'string'
        ? entry
        : entry?.story_id || entry?.storyId || entry?.url || entry?.id;

      return byId.get(key) || byId.get(normalizeUrlKey(key || ''));
    }).filter(Boolean).slice(0, limit);
  }

  function freshestPerCluster(stories) {
    const map = new Map();

    stories.forEach((story) => {
      const key = story.clusterId || story.url;
      const previous = map.get(key);

      if (!previous || story.sortValue > previous.sortValue || (story.image && !previous.image)) {
        map.set(key, story);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.sortValue - a.sortValue);
  }

  function uniqueByCluster(stories) {
    const seen = new Set();

    return stories.filter((story) => {
      const key = story.clusterId || story.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function pickStories(source, count, options = {}) {
    const picked = [];
    const sectionSeen = new Set();
    const candidates = scoreSort(source, 'placement');

    for (const story of candidates) {
      if (!story || picked.length >= count) break;
      if (options.usedUrls?.has(story.url)) continue;
      if (options.usedClusters?.has(story.clusterId)) continue;

      const sectionKey = slugify(story.section);
      if (options.uniqueSections && sectionSeen.has(sectionKey)) continue;

      picked.push(story);
      sectionSeen.add(sectionKey);
      remember(story, options.usedClusters, options.usedUrls);
    }

    if (picked.length < count && options.uniqueSections) {
      picked.push(...pickStories(source, count - picked.length, {
        ...options,
        uniqueSections: false,
      }));
    }

    return uniqueByUrl(picked).slice(0, count);
  }

  function remember(story, usedClusters, usedUrls) {
    if (!story) return;
    usedClusters?.add(story.clusterId);
    usedUrls?.add(story.url);
  }

  function uniqueByUrl(stories) {
    const seen = new Set();

    return stories.filter((story) => {
      const key = normalizeUrlKey(story.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function rotateHeroListFromStoredHero(stories) {
    const items = uniqueByUrl(Array.isArray(stories) ? stories : []);
    return items;
  }

  function scoreSort(stories, mode = 'placement') {
    return stories.slice().sort((a, b) => storyScore(b, mode) - storyScore(a, mode));
  }

  function storyScore(story, mode) {
    const recency = story.sortValue ? story.sortValue / 1e10 : 0;
    const freshBoost = story.ageHours <= FRESH_HOURS ? 24 : story.ageHours <= 168 ? 8 : 0;
    const imageBoost = story.image ? 6 : 0;
    const dailyBoost = story.isDaily ? 4 : 0;
    const priorityBoost = Number(story.priority || 0) * 20;
    const summaryBoost = story.dek && story.dek.length > 90 ? 2 : 0;
    const modeBoost = mode === 'editors' && /analysis|essay|feature/i.test(story.type) ? 6 : 0;

    return recency + freshBoost + imageBoost + dailyBoost + priorityBoost + summaryBoost + modeBoost;
  }

  function buildDeskPulse(stories) {
    const map = new Map();

    stories.forEach((story) => {
      const slug = slugify(story.section);
      const current = map.get(slug) || {
        section: story.section,
        slug,
        count: 0,
        latest: story.sortValue,
        story,
      };

      current.count += 1;

      if (story.sortValue > current.latest) {
        current.latest = story.sortValue;
        current.story = story;
      }

      map.set(slug, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.latest - a.latest || b.count - a.count)
      .slice(0, 10);
  }

  function renderEverything(state) {
    if (!state?.model?.all?.length) return;

    renderGlobalFreshness(state.model);
    renderBreakingStrip(state.model.breaking);
    renderHomepage(state.model);
    renderSectionPage(state.model.all);
    renderArchivePage(state.model.all);
    renderSearchResultsFromState(state.model.all);
    bindCardInteractions();
    bindImageFallbacks(document);
  }

  function renderGlobalFreshness(model) {
    const note = document.querySelector('.edition-note');

    if (note) {
      note.textContent = `Live edition • ${model.liveCount} active stories • ${model.deskPulse.length} desks • Latest ${model.updatedLabel}`;
    }

    const banner = document.querySelector('.ai-edition-banner .section-copy');

    if (banner) {
      banner.textContent = 'New stories now replenish the live homepage slots automatically. Older pieces move into the archive instead of haunting the front page.';
    }
  }

  function renderBreakingStrip(stories) {
    const box = document.querySelector('.breaking-strip__items');
    if (!box || !stories.length) return;

    const links = stories.slice(0, 12)
      .map((story) => `<a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a>`)
      .join('');

    box.innerHTML = `<div class="breaking-strip__track">${links}${links}</div>`;
    box.style.setProperty('--press-ticker-duration', `${Math.max(72, Math.min(140, stories.length * 12))}s`);
  }

  function renderHomepage(model) {
    if (!document.body.classList.contains('page-home')) return;

    removeHomepagePulsePanels();
    updateHomeIntro(model);
    renderHero(model.hero);
    renderSecondary(model.recencyTicker || model.latest, model.hero);
    renderDailySection(model.daily);
    renderLatestRiver(model.latest);
    renderDeskDirectory(model.all);
  }

  function removeHomepagePulsePanels() {
    if (!document.body.classList.contains('page-home')) return;

    document.querySelectorAll([
      '.press-living-home',
      '[data-living-home-pulse]',
      '.desk-pulse',
      '.press-catchup',
      '.press-future-studio',
      '.press-topic-radar'
    ].join(',')).forEach((node) => {
      node.remove();
    });
  }

  function updateHomeIntro(model) {
    const intro = document.querySelector('.home-hero__intro');
    if (!intro) return;

    intro.querySelectorAll(':scope > .eyebrow, :scope > h1, :scope > .section-copy').forEach((node) => {
      node.remove();
    });
  }

  function renderDeskPulse(model) {
    const hero = document.querySelector('.home-hero');

    if (!hero || document.querySelector('.desk-pulse')) return;

    const pulse = document.createElement('section');
    pulse.className = 'desk-pulse';

    pulse.innerHTML = `
      <div class="desk-pulse__head">
        <p class="eyebrow eyebrow--tiny">Desk Pulse</p>
        <h2>What’s active right now</h2>
      </div>

      <div class="desk-pulse__rail">
        ${model.deskPulse.map((desk) => `
          <a class="desk-pulse__chip" href="${escapeAttr(sectionHref(desk.section))}">
            <span>${escapeHtml(desk.section)}</span>
            <strong>${desk.count}</strong>
          </a>
        `).join('')}
      </div>

      <button class="desk-pulse__catchup" type="button" data-press-catchup-toggle>Catch me up</button>
    `;

    hero.insertAdjacentElement('beforebegin', pulse);

    pulse.querySelector('[data-press-catchup-toggle]')?.addEventListener('click', () => {
      document.querySelector('.press-catchup')?.classList.toggle('is-open');
    });
  }

  function renderCatchUp(model) {
    const hero = document.querySelector('.home-hero');

    if (!hero || document.querySelector('.press-catchup')) return;

    const panel = document.createElement('section');
    panel.className = 'press-catchup';

    panel.innerHTML = `
      <div class="section-heading-row">
        <div>
          <p class="eyebrow eyebrow--tiny">Catch Me Up</p>
          <h2 class="section-heading">Five stories to understand the edition</h2>
        </div>
        <a class="section-link" href="archive.html">Full archive</a>
      </div>

      <div class="press-catchup__grid">
        ${model.latest.slice(0, 5).map((story, index) => `
          <article class="press-catchup__item">
            <span>${index + 1}</span>
            <div>
              <p class="eyebrow eyebrow--tiny">${escapeHtml(story.section)} • ${freshnessLabel(story)}</p>
              <h3><a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a></h3>
              <p>${escapeHtml(shorten(story.dek || story.summary, 145))}</p>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    hero.insertAdjacentElement('beforebegin', panel);
  }

  function renderHero(stories) {
    const panelBox = document.querySelector('.lead-switcher__panels');
    const navBox = document.querySelector('.lead-nav');

    if (!panelBox || !navBox || !stories?.length) return;
    const orderedStories = orderHomepageHeroStories(stories);
    const activeIndex = 0;
    rememberVisibleHero(orderedStories[0]);

    panelBox.innerHTML = orderedStories.map((story, index) => leadPanel(story, index, activeIndex)).join('');

    navBox.innerHTML = orderedStories.map((story, index) => `
      <button aria-pressed="${index === activeIndex}" class="lead-nav__button${index === activeIndex ? ' is-active' : ''}" data-lead-button data-story-key="${escapeAttr(homepageHeroStoryKey(story))}" data-target="lead-${index}" type="button">
        ${leadNavThumbnail(story)}
        <span class="lead-nav__kicker">${escapeHtml(story.section)}</span>
        <strong>${escapeHtml(story.title)}</strong>
      </button>
    `).join('');

    bindLeadSwitcher(navBox, panelBox);
  }

  function orderHomepageHeroStories(stories) {
    const items = Array.isArray(stories) ? stories.slice() : [];
    if (!document.body.classList.contains('page-home') || items.length < 2) return items;
    const keys = items.map(homepageHeroStoryKey);
    const chosenKey = window.PressHomepageLeadRotation?.chooseKey?.(keys);
    const chosenIndex = keys.indexOf(chosenKey);
    if (chosenIndex <= 0) return items;
    return items.slice(chosenIndex).concat(items.slice(0, chosenIndex));
  }

  function homepageHeroStoryKey(story) {
    return story?.url || story?.title || '';
  }

  function rememberVisibleHero(story) {
    if (!story?.url) return;
    try {
      sessionStorage.setItem(HERO_ROTATION_KEY, story.url);
    } catch (_) {}
  }

  function leadPanel(story, index, activeIndex = 0) {
    const active = index === activeIndex;
    const imageHtml = story.image
      ? `<img alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" fetchpriority="${active ? 'high' : 'low'}" loading="${active ? 'eager' : 'lazy'}" src="${escapeAttr(story.image)}" />`
      : `<div class="press-image-fallback"><span>${escapeHtml(story.section)}</span></div>`;

    return `
      <div class="lead-panel${active ? ' is-active' : ''}" data-lead-panel id="lead-${index}">
        <div class="lead-panel__media">
          ${imageHtml}
          <div class="lead-panel__media-note">
            <p class="eyebrow eyebrow--tiny">${escapeHtml(freshnessLabel(story))}</p>
            <p class="lead-panel__media-copy">${escapeHtml(shorten(story.dek || story.summary, 150))}</p>
            <p class="lead-panel__media-source">Live slot • Replenishes automatically</p>
          </div>
        </div>

        <div class="lead-panel__body">
          <div>
            <p class="eyebrow">Front Page • ${escapeHtml(story.section)} • ${escapeHtml(story.type)}</p>
            <h2><a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a></h2>
            <p class="lead-panel__dek">${escapeHtml(story.dek || story.summary)}</p>
            <p class="lead-panel__meta">${escapeHtml(metaLine(story))}</p>
            ${whyDetail('Hero slot', story, 'Selected for freshness, image readiness, and section variety.')}
          </div>

          <div class="button-row">
            <a class="button" href="${escapeAttr(story.url)}">Read story</a>
            <a class="button button--ghost" href="${escapeAttr(sectionHref(story.section))}">More ${escapeHtml(story.section.toLowerCase())}</a>
          </div>
        </div>
      </div>
    `;
  }

  function leadNavThumbnail(story) {
    if (story?.image) {
      return `
        <span class="lead-nav__thumb" aria-hidden="true">
          <img src="${escapeAttr(story.image)}" alt="" loading="lazy" decoding="async" />
        </span>
      `;
    }

    return `
      <span class="lead-nav__thumb lead-nav__thumb--fallback" aria-hidden="true">
        <span>${escapeHtml(story?.section || 'Story')}</span>
      </span>
    `;
  }

  function layoutLeadSideSlots(navBox) {
    if (!navBox) return;

    if (window.PressHeroStandard?.layoutLeadNav) {
      window.PressHeroStandard.layoutLeadNav(navBox);
      return;
    }

    const buttons = Array.from(navBox.querySelectorAll('[data-lead-button]'));
    const sideButtons = buttons.filter((button) => !button.classList.contains('is-active')).slice(0, 6);
    const slots = ['left-1', 'left-2', 'left-3', 'right-1', 'right-2', 'right-3'];

    buttons.forEach((button) => {
      button.removeAttribute('data-side-slot');
    });

    sideButtons.forEach((button, index) => {
      button.setAttribute('data-side-slot', slots[index]);
    });
  }

  function bindLeadSwitcher(navBox, panelBox) {
    layoutLeadSideSlots(navBox);

    if (typeof pressLayoutLeadNav === 'function') {
      pressLayoutLeadNav(navBox);
    }

    navBox.querySelectorAll('[data-lead-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.target;

        navBox.querySelectorAll('[data-lead-button]').forEach((btn) => {
          const active = btn === button;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-pressed', String(active));
        });

        panelBox.querySelectorAll('[data-lead-panel]').forEach((panel) => {
          panel.classList.toggle('is-active', panel.id === target);
        });

        window.PressHomepageLeadRotation?.rememberKey?.(button.dataset.storyKey || button.querySelector('strong')?.textContent?.trim() || target);
        layoutLeadSideSlots(navBox);

        if (typeof pressLayoutLeadNav === 'function') {
          pressLayoutLeadNav(navBox);
        }
      });
    });
  }

  function recencyTickerCard(story, duplicate = false) {
    const tabAttr = duplicate ? ' tabindex="-1"' : '';
    const imageHtml = story.image ? `
      <span class="home-recency-card__media">
        <img alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" loading="lazy" src="${escapeAttr(story.image)}" />
      </span>
    ` : '<span class="home-recency-card__media home-recency-card__media--empty"></span>';

    return `
      <a class="home-recency-card" href="${escapeAttr(story.url)}" aria-label="${escapeAttr(story.title)}"${tabAttr}>
        ${imageHtml}
        <span class="home-recency-card__body">
          <span class="home-recency-card__kicker">${escapeHtml(story.section)} • ${escapeHtml(story.type)}</span>
          <strong>${escapeHtml(story.title)}</strong>
          <span class="home-recency-card__meta">${escapeHtml(story.published || freshnessLabel(story))}</span>
        </span>
      </a>
    `;
  }

  function removeHeroStories(stories, heroStories, limit = 15) {
    if (!Array.isArray(stories)) return [];
    const heroUrls = new Set((heroStories || []).map((story) => story?.url).filter(Boolean));
    return stories.filter((story) => !heroUrls.has(story.url)).slice(0, limit);
  }

  function renderSecondary(stories, heroStories = []) {
    const ticker = document.querySelector('[data-home-recency-ticker]');
    const latest = removeHeroStories(stories, heroStories);

    if (ticker && latest.length) {
      const duration = Math.max(86, Math.min(150, latest.length * 8));
      ticker.style.setProperty('--home-recency-duration', `${duration}s`);
      ticker.innerHTML = `
        <div class="home-recency-ticker__track">
          <div class="home-recency-ticker__set">
            ${latest.map((story) => recencyTickerCard(story)).join('')}
          </div>
          <div class="home-recency-ticker__set" aria-hidden="true">
            ${latest.map((story) => recencyTickerCard(story, true)).join('')}
          </div>
        </div>
      `;
      bindImageFallbacks(ticker);
      return;
    }

    const grid = document.querySelector('.home-grid__main .cards-grid.cards-grid--three');

    if (!grid || !stories?.length) return;

    grid.innerHTML = stories.map((story) => storyCard(story, {
      reason: 'Fresh section-diverse secondary story.',
    })).join('');
  }

  function renderRail(selector, stories, options = {}) {
    const list = document.querySelector(selector);

    if (!list || !stories?.length) return;

    list.innerHTML = stories.map((story, index) => `
      <li class="link-list__item" data-story-url="${escapeAttr(story.url)}">
        ${options.ranked ? `<span class="rank-number">${index + 1}</span>` : ''}
        <div>
          <p class="eyebrow eyebrow--tiny">${escapeHtml(story.section)} • ${escapeHtml(story.type)}</p>
          <a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a>
          <p class="link-list__meta">${escapeHtml(metaLine(story))}</p>
          ${whyDetail(options.ranked ? `Rank ${index + 1}` : 'Editor pick', story, options.reason)}
        </div>
      </li>
    `).join('');
  }

  function renderDailySection(stories) {
    const section = document.querySelector('.daily-home-section');

    if (!section || !stories?.length) return;

    const heading = section.querySelector('.section-heading');

    if (heading) {
      heading.textContent = `${stories.length} newest live stories`;
    }

    const standfirst = section.querySelector('.section-standfirst');

    if (standfirst) {
      standfirst.textContent = 'This row is now replenished by the article ecosystem. Old daily stories age into archive instead of staying pinned.';
    }

    const grid = section.querySelector('.cards-grid--daily, .cards-grid');

    if (grid) {
      grid.innerHTML = stories.map((story) => storyCard(story, {
        daily: true,
        reason: 'Part of the newest generated daily batch.',
      })).join('');
    }
  }

  function renderLatestRiver(stories) {
    const river = document.querySelector('.latest-section .river');

    if (!river || !stories?.length) return;

    river.innerHTML = stories.slice(0, 8).map((story) => `
      <article class="river-item" data-story-url="${escapeAttr(story.url)}">
        ${story.image ? `<a class="river-item__thumb" href="${escapeAttr(story.url)}"><img alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" loading="lazy" src="${escapeAttr(story.image)}" /></a>` : ''}

        <div class="river-item__body">
          <p class="eyebrow eyebrow--tiny">${escapeHtml(story.section)} • ${escapeHtml(story.type)} <span class="freshness-chip">${escapeHtml(freshnessLabel(story))}</span></p>
          <h3><a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a></h3>
          <p>${escapeHtml(shorten(story.dek || story.summary, 180))}</p>
          <p class="river-item__meta">${escapeHtml(metaLine(story))}</p>
        </div>
      </article>
    `).join('');
  }

  function renderDeskDirectory(stories) {
    const cards = document.querySelectorAll('.page-home .desk-card');

    if (!cards.length) return;

    const bySection = new Map();

    stories.forEach((story) => {
      const slug = slugify(story.section);
      if (!bySection.has(slug)) bySection.set(slug, story);
    });

    cards.forEach((card) => {
      const heading = card.querySelector('h3 a');
      const link = card.querySelector('.desk-card__story');

      if (!heading || !link) return;

      const slug = slugify(heading.textContent || '');
      const story = bySection.get(slug) || findBySectionAlias(stories, slug);

      if (!story) return;

      link.textContent = story.title;
      link.href = story.url;
    });
  }

  function renderSectionPage(stories) {
    if (!document.body.classList.contains('page-section')) return;

    const sectionSlug = currentSectionSlug();

    if (!sectionSlug) return;

    const matches = stories.filter((story) => sectionMatches(story.section, sectionSlug));

    if (!matches.length) return;

    const h1 = document.querySelector('.section-landing h1, .page-hero h1');

    if (h1) {
      h1.textContent = titleForSlug(sectionSlug);
    }

    const copy = document.querySelector('.section-landing .section-copy, .page-hero .section-copy');

    if (copy) {
      copy.textContent = SECTION_COPY[sectionSlug] || `The latest ${titleForSlug(sectionSlug).toLowerCase()} stories from The Press.`;
    }

    const grid = document.querySelector('.page-section .cards-grid--archive, .page-section .cards-grid');

    if (!grid) return;

    grid.innerHTML = uniqueByCluster(matches)
      .slice(0, 36)
      .map((story) => storyCard(story, {
        archive: true,
        reason: `Newest ${titleForSlug(sectionSlug)} story.`,
      }))
      .join('');
  }

  function renderArchivePage(stories) {
    if (!document.body.classList.contains('page-archive')) return;

    const grid = document.querySelector('.page-archive .cards-grid--archive, .page-archive .cards-grid');

    if (!grid) return;

    const archiveStories = stories.filter((story) => (
      !pressIsBelowFoldIndexItem(story.raw || story, story.url, story.section, story.type)
      && !pressIsCartoonIndexItem(story.raw || story, story.url, story.section)
    ));

    grid.innerHTML = archiveStories.map((story) => storyCard(story, {
      archive: true,
      reason: 'Archive card sorted by publication date.',
    })).join('');

    const toolbar = document.querySelector('.filter-toolbar');

    if (toolbar && !toolbar.dataset.pressEcosystemBound) {
      toolbar.dataset.pressEcosystemBound = 'true';

      toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-filter]');
        if (!button) return;

        const value = button.dataset.filter || 'All';

        toolbar.querySelectorAll('[data-filter]').forEach((btn) => {
          btn.classList.toggle('is-active', btn === button);
        });

        grid.querySelectorAll('[data-section]').forEach((card) => {
          const show = value === 'All' || card.dataset.section === value || card.dataset.type === value;
          card.hidden = !show;
        });
      });
    }
  }

  function storyCard(story, options = {}) {
    const imageHtml = story.image ? `
      <a class="story-card__image" href="${escapeAttr(story.url)}">
        <img alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" loading="lazy" src="${escapeAttr(story.image)}" />
      </a>
    ` : '';

    const classes = ['story-card'];

    if (options.archive) classes.push('archive-card');
    if (options.daily) classes.push('story-card--daily');

    return `
      <article class="${classes.join(' ')}" data-section="${escapeAttr(story.section)}" data-type="${escapeAttr(story.type)}" data-story-url="${escapeAttr(story.url)}">
        ${imageHtml}

        <div class="story-card__body">
          <p class="eyebrow eyebrow--compact">${escapeHtml(story.section)} • ${escapeHtml(story.type)} <span class="freshness-chip">${escapeHtml(freshnessLabel(story))}</span></p>
          <h3 class="story-card__title"><a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a></h3>
          <p class="story-card__dek">${escapeHtml(shorten(story.dek || story.summary, 170))}</p>
          <p class="story-card__meta">${escapeHtml(metaLine(story))}</p>
          ${whyDetail('Placement', story, options.reason || 'Selected by the live article ecosystem.')}
          ${options.daily ? `<a class="story-card__cta" href="${escapeAttr(story.url)}">Read story</a>` : ''}
        </div>
      </article>
    `;
  }

  function whyDetail(label, story, reason) {
    return `
      <details class="press-why">
        <summary>${escapeHtml(label)} info</summary>
        <p>${escapeHtml(reason)} ${escapeHtml(freshnessLabel(story))}. Cluster: ${escapeHtml(story.clusterId || 'single story')}.</p>
      </details>
    `;
  }

  function installReadingModes() {
    const topbar = document.querySelector('.topbar__actions');

    if (!topbar) {
      setMode('standard');
      try {
        localStorage.removeItem(MODE_KEY);
      } catch (_) {}
      return;
    }

    applyStoredMode();

    if (!topbar || document.querySelector('[data-reader-mode-toggle]')) return;

    const button = document.createElement('button');
    button.className = 'reader-mode-toggle';
    button.type = 'button';
    button.setAttribute('data-reader-mode-toggle', '');
    button.textContent = modeButtonLabel(currentMode());

    button.addEventListener('click', () => {
      const next = nextMode(currentMode());
      setMode(next);
      button.textContent = modeButtonLabel(next);
    });

    topbar.insertBefore(button, topbar.firstChild);
  }

  function currentMode() {
    try {
      return localStorage.getItem(MODE_KEY) || 'standard';
    } catch (_) {
      return 'standard';
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (_) {}

    document.documentElement.dataset.readerMode = mode;
  }

  function applyStoredMode() {
    setMode(currentMode());
  }

  function nextMode(mode) {
    return mode === 'standard' ? 'quiet' : mode === 'quiet' ? 'edition' : 'standard';
  }

  function modeButtonLabel(mode) {
    return mode === 'quiet'
      ? 'Edition mode'
      : mode === 'edition'
        ? 'Standard mode'
        : 'Quiet mode';
  }

  function installWhyTooltips() {
    document.addEventListener('toggle', (event) => {
      const target = event.target;

      if (!target?.matches?.('.press-why') || !target.open) return;

      document.querySelectorAll('.press-why[open]').forEach((detail) => {
        if (detail !== target) detail.removeAttribute('open');
      });
    }, true);
  }

  function installSmartSearchHook() {
    document.addEventListener('input', (event) => {
      if (!event.target.matches('[data-search-input]')) return;
      if (!ecosystemState?.model?.all?.length) return;

      renderSearchResultsFromState(ecosystemState.model.all, event.target.value || '');
    }, true);
  }

  function renderSearchResultsFromState(stories, queryOverride) {
    const input = document.querySelector('[data-search-input]');
    const box = document.querySelector('[data-search-results]');

    if (!input || !box) return;

    const query = typeof queryOverride === 'string'
      ? queryOverride.trim().toLowerCase()
      : input.value.trim().toLowerCase();

    if (!query) return;

    const results = stories.filter((story) => {
      const haystack = [
        story.title,
        story.section,
        story.type,
        story.dek,
        story.summary,
        ...(story.keywords || []),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    }).slice(0, 12);

    if (!results.length) {
      box.innerHTML = '<div class="search-empty"><p>No stories matched that search yet.</p></div>';
      return;
    }

    box.innerHTML = results.map((story) => `
      <article class="search-result">
        <p class="eyebrow eyebrow--tiny">${escapeHtml(story.section)} • ${escapeHtml(story.type)} • ${escapeHtml(freshnessLabel(story))}</p>
        <h3><a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a></h3>
        <p>${escapeHtml(shorten(story.dek || story.summary, 180))}</p>
        <p class="search-result__meta">${escapeHtml(metaLine(story))}</p>
      </article>
    `).join('');
  }

  function bindCardInteractions() {
    document.querySelectorAll('.story-card, .archive-card, .river-item, .link-list__item, .lead-panel, .press-catchup__item').forEach((card) => {
      if (card.dataset.ecosystemClickable === 'true') return;

      const link = card.querySelector('a[href]');
      if (!link) return;

      card.dataset.ecosystemClickable = 'true';
      card.classList.add('is-clickable');

      card.addEventListener('click', (event) => {
        if (event.target.closest('a, button, summary, details, label') || pressIsEditableTarget(event.target)) return;
        window.location.href = link.href;
      });
    });
  }

  function bindImageFallbacks(root = document) {
    root.querySelectorAll('img').forEach((img) => {
      if (img.dataset.ecosystemFallbackBound === 'true') return;

      img.dataset.ecosystemFallbackBound = 'true';

      img.addEventListener('error', () => {
        const holder = img.closest('.story-card__image, .lead-panel__media, .river-item__thumb');

        if (holder) {
          holder.classList.add('is-hidden');
        } else {
          img.hidden = true;
        }
      });
    });
  }

  function sectionMatches(sectionName, wantedSlug) {
    const storySlug = slugify(sectionName);

    if (storySlug === wantedSlug) return true;

    const aliases = SECTION_ALIAS[wantedSlug] || [wantedSlug];

    return aliases.map(slugify).includes(storySlug);
  }

  function findBySectionAlias(stories, slug) {
    return stories.find((story) => sectionMatches(story.section, slug));
  }

  function currentSectionSlug() {
    const file = location.pathname.split('/').pop() || '';
    const match = file.match(/^section-(.+)\.html$/i);

    if (match) return slugify(match[1]);

    const heading = document.querySelector('.section-landing h1, .page-hero h1');

    return heading ? slugify(heading.textContent || '') : '';
  }

  function titleForSlug(slug) {
    const nice = {
      ai: 'AI',
      popculture: 'Pop Culture',
    };

    return nice[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function titleCaseSection(value) {
    const text = clean(value).replace(/[-_]+/g, ' ');
    const key = slugify(text);

    if (key === 'ai') return 'AI';
    if (key === 'popculture') return 'Pop Culture';

    return text.replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function sectionHref(sectionName) {
    const slug = slugify(sectionName);

    if (!slug) return 'archive.html';
    if (slug === 'popculture') return 'section-pop-culture.html';

    return `section-${slug}.html`;
  }

  function metaLine(story) {
    const parts = [story?.byline || PRESS_AUTHOR];

    if (story.published) parts.push(story.published);

    return parts.join(' • ');
  }

  function freshnessLabel(story) {
    if (!story?.sortValue) return 'Archive';

    const hours = Math.max(0, (Date.now() - story.sortValue) / 36e5);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return 'Yesterday';
    if (hours <= FRESH_HOURS) return `${Math.floor(hours / 24)}d ago`;
    if (hours < 168) return 'This week';

    return 'Archive';
  }

  function formatDateLabel(timestamp) {
    if (!timestamp) return '';

    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(timestamp));
    } catch (_) {
      return '';
    }
  }

  function parsePressDate(value) {
    const raw = clean(value);

    if (!raw) return 0;

    let text = raw
      .replace(/•/g, ' ')
      .replace(/\ba\.m\./gi, 'AM')
      .replace(/\bp\.m\./gi, 'PM')
      .replace(/\bEDT\b|\bEST\b|\bUTC\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    let parsed = Date.parse(text);

    if (Number.isFinite(parsed)) return parsed;

    parsed = Date.parse(text.replace(/(\d{4})-(\d{2})-(\d{2}).*/, '$1-$2-$3T12:00:00'));

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function urlDateHint(url) {
    const match = String(url || '').match(/(20\d{2})[-/](\d{2})[-/](\d{2})/);

    return match ? `${match[1]}-${match[2]}-${match[3]}T12:00:00` : '';
  }

  function inferSectionFromUrl(url) {
    const file = String(url || '').split('/').pop() || '';
    const first = file.split('-')[0];

    return first && !/^20\d{2}$/.test(first) ? first : '';
  }

  function makeClusterId(title, keywords = [], section = '') {
    const words = `${title} ${keywords.slice(0, 5).join(' ')}`
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    const core = Array.from(new Set(words)).slice(0, 6).join('-');

    return `${slugify(section)}-${core || slugify(title).slice(0, 48)}`;
  }

  function slugFromUrl(url) {
    const last = String(url || '').split('/').pop() || '';

    return last.replace(/\.html?$/i, '') || slugify(url);
  }

  function slugify(value) {
    return clean(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/^pop-culture$/, 'popculture');
  }

  function normalizeUrlKey(url) {
    return clean(url)
      .replace(/^https?:\/\/[^/]+\//i, '')
      .replace(/^\.\//, '')
      .replace(/\?.*$/, '')
      .replace(/#.*$/, '');
  }

  function shorten(value, max = 160) {
    const text = clean(value);

    if (text.length <= max) return text;

    const clipped = text.slice(0, max - 1);
    const lastSpace = clipped.lastIndexOf(' ');

    return `${clipped.slice(0, lastSpace > 80 ? lastSpace : clipped.length)}…`;
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
/* PRESS_ECOSYSTEM_ENGINE_END */
(() => {

  'use strict';

  const AUTHOR_LABEL = 'By The Press';

  const SECTION_ALIASES = {

    ai: ['ai', 'artificialintelligence', 'technology'],

    artificialintelligence: ['ai', 'artificialintelligence', 'technology'],

    technology: ['technology', 'ai', 'artificialintelligence'],

    culture: ['culture', 'film', 'popculture', 'pop-culture', 'niche'],

    film: ['film', 'culture'],

    popculture: ['popculture', 'pop-culture', 'culture'],

    'pop-culture': ['popculture', 'pop-culture', 'culture'],

    niche: ['niche', 'culture'],

    world: ['world', 'geopolitics'],

    geopolitics: ['geopolitics', 'world'],

    politics: ['politics'],

    economics: ['economics'],

    education: ['education'],

    health: ['health'],

    philosophy: ['philosophy'],

    science: ['science'],

    opinion: ['opinion']

  };

  function ready(fn) {

    if (document.readyState === 'loading') {

      document.addEventListener('DOMContentLoaded', fn, { once: true });

    } else {

      fn();

    }

  }

  function slugify(value) {

    return String(value || '')

      .toLowerCase()

      .replace(/&/g, 'and')

      .replace(/[^a-z0-9]+/g, '-')

      .replace(/^-+|-+$/g, '');

  }

  function compactSlug(value) {

    return slugify(value).replace(/-/g, '');

  }

  function escapeHtml(value) {

    return String(value || '')

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }

  function storyUrl(story) {

    return String(story.url || story.href || story.link || story.filename || '#').trim();

  }

  function normalizeStory(story) {

    if (!story) return null;

    const title = story.title || story.headline || story.name || '';

    const url = storyUrl(story);

    if (!title || !url || url === '#') return null;

    const section =

      story.section ||

      story.section_name ||

      story.desk ||

      story.category ||

      story.section_slug ||

      'News';

    const image =

      story.image ||

      story.imageUrl ||

      story.thumbnail ||

      story.photo ||

      '';

    const imageAlt =

      story.imageAlt ||

      story.image_alt ||

      story.alt ||

      title;

    const published =

      story.published ||

      story.publishedLabel ||

      story.displayDate ||

      story.date ||

      story.published_iso ||

      '';

    const type = story.type || story.kind || 'Story';
    if (pressIsBelowFoldIndexItem(story, url, section, type)) return null;

    const sortValue = Date.parse(

      story.published_iso ||

      story.publishedIso ||

      story.updated_iso ||

      story.updatedIso ||

      published ||

      ''

    );

    return {

      title,

      url,

      section,

      sectionSlug: story.section_slug || story.sectionSlug || slugify(section),

      type,

      dek: story.dek || story.summary || story.description || story.excerpt || '',

      image,

      imageAlt,

      published,

      readTime: story.read_time || story.readTime || '',

      isDaily: Boolean(story.is_daily || story.isDaily || url.startsWith('daily/')),

      sortValue: Number.isFinite(sortValue) ? sortValue : 0

    };

  }

  function getCurrentSectionSlug() {

    const fromUrl = location.pathname.match(/section-([a-z0-9-]+)\.html/i);

    if (fromUrl && fromUrl[1]) return slugify(fromUrl[1]);

    const heading = document.querySelector('.section-landing h1, .page-hero h1, h1');

    if (heading) return slugify(heading.textContent);

    return '';

  }

  function sectionMatches(story, pageSlug) {

    const pageCompact = compactSlug(pageSlug);

    const storySlug = slugify(story.sectionSlug || story.section);

    const storyCompact = compactSlug(storySlug);

    if (storyCompact === pageCompact) return true;

    const aliases = SECTION_ALIASES[pageSlug] || SECTION_ALIASES[pageCompact] || [];

    const compactAliases = aliases.map(compactSlug);

    return compactAliases.includes(storyCompact);

  }

  function getEmbeddedSearchStories() {

    const node = document.getElementById('press-search-data');

    if (!node) return [];

    try {

      const parsed = JSON.parse(node.textContent || '[]');

      return Array.isArray(parsed) ? parsed : [];

    } catch (_) {

      return [];

    }

  }

  async function fetchJson(url) {

    const response = await fetch(pressSiteAssetUrl(url), { cache: 'force-cache' });

    if (!response.ok) {

      throw new Error(`Could not load ${url}`);

    }

    return response.json();

  }

  async function loadAllKnownStories() {

    const buckets = [];

    buckets.push(getEmbeddedSearchStories());

    const files = [

      'live-index.json',

      'content-index.json',

      'archive-index.json',

      'daily-latest.json'

    ];

    for (const file of files) {

      try {

        const data = await fetchJson(file);

        if (Array.isArray(data)) {

          buckets.push(data);

        } else if (data && Array.isArray(data.stories)) {

          buckets.push(data.stories);

        } else if (data && Array.isArray(data.articles)) {

          buckets.push(data.articles);

        } else if (data && Array.isArray(data.items)) {

          buckets.push(data.items);

        }

      } catch (_) {

        /* Keep going. Some pages may not have every file available. */

      }

    }

    const seen = new Set();

    const stories = [];

    buckets

      .flat()

      .map(normalizeStory)

      .filter(Boolean)

      .forEach((story) => {

        const key = story.url.replace(/^\/+/, '').toLowerCase();

        if (seen.has(key)) return;

        seen.add(key);

        stories.push(story);

      });

    return stories.sort((a, b) => b.sortValue - a.sortValue);

  }

  function findOrCreateArchiveGrid() {

    let grid = document.querySelector('main .cards-section .cards-grid--archive');

    if (grid) return grid;

    let main = document.querySelector('main.page') || document.querySelector('main');

    if (!main) {

      main = document.createElement('main');

      main.className = 'page';

      document.body.insertBefore(main, document.querySelector('.site-footer') || null);

    }

    let section = main.querySelector('.cards-section');

    if (!section) {

      section = document.createElement('section');

      section.className = 'cards-section';

      main.appendChild(section);

    }

    grid = document.createElement('div');

    grid.className = 'cards-grid cards-grid--archive';

    section.appendChild(grid);

    return grid;

  }

  function urlsAlreadyShownInDailyFeed() {

    const urls = new Set();

    document.querySelectorAll('.daily-section-feed a[href], .daily-home-section a[href]').forEach((link) => {

      const href = link.getAttribute('href');

      if (href) urls.add(href.replace(/^\/+/, '').toLowerCase());

    });

    return urls;

  }

  function renderCard(story) {

    const imageHtml = story.image

      ? `

        <a class="story-card__image" href="${escapeHtml(story.url)}">

          <img

            alt="${escapeHtml(story.imageAlt || story.title)}"

            decoding="async"

            loading="lazy"

            src="${escapeHtml(story.image)}"

          />

        </a>`

      : '';

    const metaParts = [AUTHOR_LABEL];

    if (story.published) metaParts.push(story.published);

    return `

      <article

        class="story-card archive-card"

        data-section="${escapeHtml(story.section)}"

        data-type="${escapeHtml(story.type)}"

        data-story-url="${escapeHtml(story.url)}"

      >

        ${imageHtml}

        <div class="story-card__body">

          <p class="eyebrow eyebrow--compact">${escapeHtml(story.section)} • ${escapeHtml(story.type)}</p>

          <h3 class="story-card__title">

            <a href="${escapeHtml(story.url)}">${escapeHtml(story.title)}</a>

          </h3>

          ${story.dek ? `<p class="story-card__dek">${escapeHtml(story.dek)}</p>` : ''}

          <p class="story-card__meta">${escapeHtml(metaParts.join(' • '))}</p>

        </div>

      </article>

    `;

  }

  function makeCardsClickable(scope) {

    scope.querySelectorAll('.story-card, .archive-card').forEach((card) => {

      if (card.dataset.restoreClickBound === 'true') return;

      const link = card.querySelector('a[href]');

      if (!link) return;

      card.dataset.restoreClickBound = 'true';

      card.classList.add('is-clickable');

      card.setAttribute('tabindex', '0');

      card.setAttribute('role', 'link');

      card.addEventListener('click', (event) => {

        if (event.target.closest('a, button, label') || pressIsEditableTarget(event.target)) return;

        window.location.href = link.href;

      });

      card.addEventListener('keydown', (event) => {

        if (pressIsEditableTarget(event.target)) return;
        if (event.key === 'Enter' || event.key === ' ') {

          event.preventDefault();

          link.click();

        }

      });

    });

  }

  function clearOldAppCaches() {

    try {

      Object.keys(localStorage)

        .filter((key) => key.startsWith('press-ecosystem-cache:'))

        .forEach((key) => localStorage.removeItem(key));

    } catch (_) {

      /* localStorage may be blocked. Ignore safely. */

    }

  }

  async function restoreCategoryArticles() {

    if (!document.body.classList.contains('page-section')) return;

    const pageSlug = getCurrentSectionSlug();

    if (!pageSlug) return;

    clearOldAppCaches();

    const allStories = await loadAllKnownStories();

    const dailyUrls = urlsAlreadyShownInDailyFeed();

    let sectionStories = allStories.filter((story) => sectionMatches(story, pageSlug));

    sectionStories = sectionStories.filter((story) => {

      const cleanUrl = story.url.replace(/^\/+/, '').toLowerCase();

      return !dailyUrls.has(cleanUrl);

    });

    if (!sectionStories.length) {

      sectionStories = allStories.filter((story) => sectionMatches(story, pageSlug));

    }

    if (!sectionStories.length) return;

    const grid = findOrCreateArchiveGrid();

    grid.innerHTML = sectionStories.map(renderCard).join('');

    grid.setAttribute('data-restored-old-category-articles', 'true');

    makeCardsClickable(grid);

    grid.querySelectorAll('img').forEach((img) => {

      img.addEventListener('error', () => {

        const wrap = img.closest('.story-card__image');

        if (wrap) wrap.style.display = 'none';

      });

    });

  }

  function runRestoreSeveralTimes() {

    restoreCategoryArticles();

    window.setTimeout(restoreCategoryArticles, 120);

  }

  ready(runRestoreSeveralTimes);

})();

/* PRESS_DYNAMIC_INTERACTIONS_START
   Progressive dynamic UI layer: subtle tilt/lift, reveal-on-scroll, tactile ripples,
   smooth internal navigation, and a small back-to-top helper. Respects reduced motion.
*/
(() => {

  const root = document.documentElement;
  const CARD_SELECTOR = [
    '.story-card',
    '.archive-card',
    '.river-item',
    '.lead-panel',
    '.desk-card',
    '.link-list__item',
    '.related-card',
    '.edition-radar__item',
    '.press-catchup__item',
    '.daily-card'
  ].join(', ');

  const REVEAL_SELECTOR = [
    '.story-card',
    '.archive-card',
    '.river-item',
    '.lead-panel',
    '.desk-card',
    '.rail',
    '.newsletter-block',
    '.trust-card',
    '.article-body',
    '.article-sources',
    '.edition-radar',
    '.desk-pulse',
    '.press-catchup',
    '.daily-home-section',
    '.daily-archive-section',
    '.breaking-wire-section'
  ].join(', ');

  const RIPPLE_SELECTOR = [
    'button',
    '.button',
    '.theme-toggle',
    '.reader-mode-toggle',
    '.lead-nav__button',
    '.desk-pulse__catchup',
    '.press-micro-card',
    '.story-card__cta'
  ].join(', ');

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const useDynamicMotion = root.dataset.pressMotion === 'full';

  if (useDynamicMotion) root.classList.add('press-dynamic-page');

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const prefersReducedMotion = () => reducedMotionQuery.matches;

  function markPageReady() {
    root.classList.add('press-page-ready');
    window.addEventListener('pageshow', () => root.classList.remove('press-page-leaving'));
  }

  function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  }

  function findInternalNavigationTarget(event) {
    if (event.defaultPrevented || isModifiedClick(event)) return null;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return null;
    if (target.closest('button, label') || pressIsEditableTarget(target)) return null;

    const directLink = target.closest('a[href]');
    const cardLink = directLink ? null : target.closest(CARD_SELECTOR)?.querySelector('a[href]');
    const link = directLink || cardLink;
    if (!link) return null;

    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || /^(mailto|tel|javascript):/i.test(rawHref)) return null;
    if (link.hasAttribute('download')) return null;
    if (link.target && link.target !== '_self') return null;

    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch (_) {
      return null;
    }

    if (url.origin !== window.location.origin) return null;
    const sameDocument = url.pathname === window.location.pathname &&
      url.search === window.location.search &&
      Boolean(url.hash);
    if (sameDocument) return null;

    return { url: url.href, host: directLink || target.closest(CARD_SELECTOR) || link };
  }

  function setupSmoothNavigation() {
    return;
  }

  function enhanceCard(card) {
    if (!(card instanceof HTMLElement)) return;
    if (card.dataset.pressDynamicCard === 'true') return;
    card.dataset.pressDynamicCard = 'true';
    card.classList.add('press-micro-card');

    if (!finePointerQuery.matches || prefersReducedMotion()) return;

    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      const tiltX = (0.5 - y) * 2.4;
      const tiltY = (x - 0.5) * 2.4;
      card.style.setProperty('--press-mouse-x', `${(x * 100).toFixed(2)}%`);
      card.style.setProperty('--press-mouse-y', `${(y * 100).toFixed(2)}%`);
      card.style.setProperty('--press-tilt-x', `${tiltX.toFixed(2)}deg`);
      card.style.setProperty('--press-tilt-y', `${tiltY.toFixed(2)}deg`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--press-tilt-x');
      card.style.removeProperty('--press-tilt-y');
      card.style.setProperty('--press-mouse-x', '50%');
      card.style.setProperty('--press-mouse-y', '50%');
    });
  }

  function setupMicroInteractions(scope = document) {
    const nodes = [];
    if (scope instanceof Element && scope.matches(CARD_SELECTOR)) nodes.push(scope);
    nodes.push(...scope.querySelectorAll(CARD_SELECTOR));
    nodes.forEach(enhanceCard);
  }

  function setupRevealOnScroll(scope = document, observer) {
    const nodes = [];
    if (scope instanceof Element && scope.matches(REVEAL_SELECTOR)) nodes.push(scope);
    nodes.push(...scope.querySelectorAll(REVEAL_SELECTOR));

    nodes.forEach((node, index) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.pressRevealBound === 'true') return;
      node.dataset.pressRevealBound = 'true';
      node.setAttribute('data-press-reveal', '');
      node.style.setProperty('--press-reveal-delay', `${Math.min(index % 6, 5) * 45}ms`);

      if (!observer || prefersReducedMotion()) {
        node.classList.add('is-revealed');
        return;
      }

      observer.observe(node);
    });
  }

  function buildRevealObserver() {
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) return null;
    return new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
  }

  function createRipple(host, event) {
    if (!(host instanceof HTMLElement) || prefersReducedMotion()) return;
    if (host.matches('input, textarea, select')) return;

    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    host.classList.add('press-ripple-host');
    const ripple = document.createElement('span');
    ripple.className = 'press-ink-ripple';
    const size = Math.max(rect.width, rect.height) * 2.15;
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;

    ripple.style.setProperty('--press-ripple-size', `${size}px`);
    ripple.style.setProperty('--press-ripple-x', `${x}px`);
    ripple.style.setProperty('--press-ripple-y', `${y}px`);
    host.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  function setupRipples() {
    document.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('label') || pressIsEditableTarget(event.target)) return;
      const host = event.target.closest(RIPPLE_SELECTOR);
      if (!host) return;
      createRipple(host, event);
    });
  }

  function setupBackToTop() {
    if (document.querySelector('[data-press-back-to-top]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'press-back-to-top';
    button.setAttribute('data-press-back-to-top', '');
    button.setAttribute('aria-label', 'Back to top');
    button.innerHTML = '<span aria-hidden="true">↑</span> Top';
    document.body.appendChild(button);

    const scrollRoot = () => (
      document.body?.scrollHeight > document.body?.clientHeight
        ? document.body
        : document.scrollingElement || document.documentElement
    );
    const scrollTop = () => scrollRoot().scrollTop || window.scrollY || window.pageYOffset || 0;

    button.addEventListener('click', () => {
      const root = scrollRoot();
      if (typeof root.scrollTo === 'function') {
        root.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      } else {
        root.scrollTop = 0;
      }
      if (root !== document.documentElement) document.documentElement.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });

    let ticking = false;
    const update = () => {
      ticking = false;
      button.classList.toggle('is-visible', scrollTop() > Math.max(640, window.innerHeight * .9));
    };

    update();
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    document.body?.addEventListener('scroll', requestUpdate, { passive: true });
    document.documentElement?.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }

  function watchDynamicContent(revealObserver) {
    if (!('MutationObserver' in window) || !document.body) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          setupMicroInteractions(node);
          setupRevealOnScroll(node, revealObserver);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  ready(() => {
    markPageReady();
    setupBackToTop();
    if (!useDynamicMotion) return;

    const revealObserver = buildRevealObserver();
    setupMicroInteractions();
    setupRevealOnScroll(document, revealObserver);
    setupSmoothNavigation();
    setupRipples();
    watchDynamicContent(revealObserver);
  });

})();
/* PRESS_DYNAMIC_INTERACTIONS_END */

/* PRESS_CATEGORYLESS_START */
(() => {
  const SECTION_HREF = /^section-[^/?#]+\.html(?:[?#].*)?$/i;

  function looksLikeSectionLink(anchor) {
    const raw = (anchor.getAttribute('href') || '').trim();
    if (SECTION_HREF.test(raw)) return true;
    try {
      const url = new URL(anchor.href, window.location.href);
      return SECTION_HREF.test(url.pathname.split('/').pop() || '');
    } catch (_) {
      return false;
    }
  }

  function removeAccidentalOpenGraphText(root = document.documentElement) {
    if (!root || !document.createTreeWalker) return;
    const doomed = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.nodeValue || '';
      if (/open\s*graph/i.test(text) && /(<!--|&lt;|\\!--)/i.test(text)) {
        doomed.push(node);
      }
      node = walker.nextNode();
    }
    doomed.forEach((nodeToRemove) => nodeToRemove.remove());
  }

  function removeFooterSectionLists() {
    document.querySelectorAll('.site-footer section').forEach((section) => {
      const heading = section.querySelector('.footer-heading');
      if (!heading) return;
      if (/^sections$/i.test((heading.textContent || '').trim())) {
        section.remove();
      }
    });
  }

  function rerouteSectionLinksToArchive() {
    document.querySelectorAll('a[href]').forEach((anchor) => {
      if (anchor.hasAttribute('data-preserve-section-link')) return;
      if (!looksLikeSectionLink(anchor)) return;
      anchor.setAttribute('href', 'archive.html');
      if (/^\s*More\s+/i.test(anchor.textContent || '')) {
        anchor.textContent = 'Open archive';
      }
      anchor.removeAttribute('aria-current');
    });
  }

  function removeCategorySurfaces() {
    document.documentElement.classList.add('press-categoryless');
    removeAccidentalOpenGraphText();
    document.querySelectorAll('.section-nav, [data-menu-toggle], .menu-trigger, .desk-directory, .desk-pulse').forEach((node) => node.remove());
    removeFooterSectionLists();
    rerouteSectionLinksToArchive();
  }

  function bootCategorylessMode() {
    removeCategorySurfaces();
    let queued = false;
    const scheduleCleanup = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        removeCategorySurfaces();
      });
    };
    const target = document.body || document.documentElement;
    if (target && window.MutationObserver) {
      const observer = new MutationObserver(scheduleCleanup);
      observer.observe(target, { childList: true, subtree: true });
    }
    window.requestAnimationFrame(removeCategorySurfaces);
    window.setTimeout(removeCategorySurfaces, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCategorylessMode, { once: true });
  } else {
    bootCategorylessMode();
  }
})();
/* PRESS_CATEGORYLESS_END */


/* NEWS_FLOW_UI_IMPROVEMENT_REFRESH_FIX
   Stabilize refresh/render behavior on the home, press, and archive views.
   - Clear stale page-leaving classes after browser bfcache restores.
   - Pick a different active lead panel on reload when the markup includes lead panels.
*/
(function pressNewsFlowUiRefreshFix() {
  const storageKey = 'press:last-active-lead-panel';

  function clearTransitionState() {
    document.documentElement.classList.add('press-page-ready');
    document.documentElement.classList.remove('press-page-leaving');
    document.body.classList.remove('press-page-leaving');
  }

  function syncActiveLeadPanel() {
    const panels = Array.from(document.querySelectorAll('[data-press-lead-panel], .lead-panel, .daily-lead-panel'));
    if (panels.length < 2) return;

    const candidates = panels.map((panel, index) => ({
      panel,
      id: panel.getAttribute('data-slug') || panel.getAttribute('data-panel-id') || panel.id || String(index)
    }));

    const chosen = candidates.find((item) => item.panel.classList.contains('is-active')) || candidates[0];
    if (!chosen) return;

    candidates.forEach((item) => {
      const active = item === chosen;
      item.panel.classList.toggle('is-active', active);
      item.panel.toggleAttribute('hidden', !active && item.panel.hasAttribute('data-press-lead-panel'));
    });

    document.querySelectorAll('[data-press-lead-trigger], .lead-panel-trigger').forEach((button) => {
      const target = button.getAttribute('data-slug') || button.getAttribute('data-panel-id') || button.getAttribute('aria-controls') || '';
      const active = target && target === chosen.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    sessionStorage.setItem(storageKey, chosen.id);
  }

  function run() {
    clearTransitionState();
    syncActiveLeadPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
  window.addEventListener('pageshow', run);
  window.addEventListener('load', run);
})();

/* PRESS_FUTURE_NEWSROOM_START
   A progressive "living newsroom" layer for the static front page.
   It adds a cinematic live deck, topic radar, and command-palette search.
*/
(function pressFutureNewsroom() {
  'use strict';

  const DATA_URLS = [
    'content-index.json',
    'live-index.json',
    'daily-latest.json',
    'search-index.json',
    'edition.json'
  ];

  const SECTION_COLORS = {
    Politics: '#ff665c',
    Culture: '#f6c85f',
    Technology: '#5dd6ff',
    Economics: '#73e2a7',
    Education: '#b38cff',
    Health: '#ff8fb3',
    Philosophy: '#f4f0e8',
    Science: '#9bf06d',
    World: '#7aa2ff',
    Opinion: '#ffb86b',
    AI: '#68f4d4',
    Film: '#f08cff',
    Geopolitics: '#8fb4ff',
    Niche: '#ffd36e',
    'Pop Culture': '#ff7fbf'
  };

  const HERO_STORAGE_KEY = 'press-future-newsroom-hero-url';

  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'with', 'from', 'this', 'into', 'over', 'under', 'after', 'before', 'will',
    'have', 'has', 'are', 'was', 'were', 'not', 'now', 'new', 'why', 'how', 'what', 'when', 'where', 'who',
    'its', 'their', 'they', 'them', 'than', 'then', 'still', 'about', 'could', 'would', 'should', 'your',
    'our', 'out', 'off', 'more', 'less', 'again', 'only', 'most', 'just', 'can'
  ]);

  let futureState = null;
  let commandOpen = false;
  let activeFilter = 'All';
  let selectedIndex = 0;
  let currentRefreshHeroUrl = '';

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  ready(function initFutureNewsroom() {
    const hasFutureSurface = document.querySelector('.press-future-studio, .press-topic-radar, [data-future-command-open]');
    if (!document.body.classList.contains('page-home') || !hasFutureSurface) return;

    document.documentElement.classList.add('press-future-newsroom');
    installCommandPalette();
    bindGlobalCommands();

    hydrate().then(function onHydrated(state) {
      if (!state.stories.length) return;
      futureState = state;
      renderFutureHomepage(state);
      renderCommandResults('');
      document.documentElement.classList.add('press-future-ready');
    }).catch(function onError(error) {
      console.warn('[The Press] Future newsroom layer could not initialize:', error);
    });

    window.addEventListener('press:ecosystem-ready', function onEcosystemReady(event) {
      const stories = event.detail?.model?.all || event.detail?.stories || [];
      if (!Array.isArray(stories) || !stories.length) return;
      futureState = buildState(stories.map(normalizeStory).filter(Boolean));
      renderFutureHomepage(futureState);
      renderCommandResults('');
      document.documentElement.classList.add('press-future-ready');
    });
  });

  async function hydrate() {
    const payloads = await Promise.all(DATA_URLS.map(fetchOptionalJson));
    const embedded = readEmbeddedSearchJson();
    const stories = mergeStories(payloads.concat([embedded]).flatMap(extractStories))
      .filter(function keepEditionStory(story) {
        return !pressIsBelowFoldIndexItem(story, story.url, story.section, story.type);
      });
    return buildState(stories);
  }

  async function fetchOptionalJson(url) {
    try {
      const response = await fetch(pressSiteAssetUrl(url), { cache: 'force-cache' });
      if (!response.ok) return null;
      return response.json();
    } catch (_) {
      return null;
    }
  }

  function readEmbeddedSearchJson() {
    const node = document.getElementById('press-search-data');
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || '[]');
    } catch (_) {
      return null;
    }
  }

  function extractStories(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload.map(normalizeStory).filter(Boolean);
    if (Array.isArray(payload.stories)) return payload.stories.map(normalizeStory).filter(Boolean);
    if (Array.isArray(payload.articles)) return payload.articles.map(normalizeStory).filter(Boolean);
    if (Array.isArray(payload.items)) return payload.items.map(normalizeStory).filter(Boolean);
    return [];
  }

  function normalizeStory(item) {
    if (!item || typeof item !== 'object') return null;

    const title = clean(item.title || item.headline || item.name);
    const url = clean(item.url || item.href || item.link || item.filename || item.permalink);
    if (!title || !url || url === '#') return null;

    const section = titleCase(clean(item.section || item.desk || item.category || inferSection(url) || 'News'));
    const type = clean(item.type || item.kind || item.story_type || (url.includes('/daily/') || url.startsWith('daily/') ? 'Daily Issue' : 'Report'));
    if (pressIsBelowFoldIndexItem(item, url, section, type)) return null;
    const dek = clean(item.dek || item.summary || item.description || item.excerpt);
    const published = clean(item.published || item.publishedLabel || item.displayDate || item.date);
    const publishedIso = clean(item.publishedIso || item.published_iso || item.publishedAt || item.published_at);
    const image = clean(item.image || item.imageUrl || item.image_url || item.thumbnail || item.photo);
    const imageAlt = clean(item.imageAlt || item.image_alt || item.thumbnail_alt || item.thumbnailAlt || item.alt || title);
    const keywords = Array.isArray(item.keywords) ? item.keywords.filter(Boolean).map(String) : [];
    const sortValue = parseStoryDate(publishedIso || published || url);

    return {
      title,
      url: normalizeUrl(url),
      section,
      sectionSlug: slugify(section),
      type,
      dek,
      published,
      publishedIso,
      image: normalizeUrl(image),
      imageAlt,
      keywords,
      sortValue,
      clusterId: clean(item.cluster_id || item.clusterId || item.story_id || item.storyId || slugify(title)),
      readTime: clean(item.read_time || item.readTime),
      scoreText: [title, section, type, dek, keywords.join(' ')].join(' ').toLowerCase()
    };
  }

  function mergeStories(stories) {
    const byUrl = new Map();
    stories.filter(Boolean).forEach(function remember(story) {
      const key = normalizeUrl(story.url).replace(/^\.\//, '');
      const previous = byUrl.get(key);
      if (!previous) {
        byUrl.set(key, story);
        return;
      }

      byUrl.set(key, {
        ...previous,
        ...story,
        dek: story.dek && story.dek.length > (previous.dek || '').length ? story.dek : previous.dek,
        image: story.image || previous.image,
        imageAlt: story.imageAlt || previous.imageAlt,
        keywords: Array.from(new Set([...(previous.keywords || []), ...(story.keywords || [])])),
        sortValue: Math.max(previous.sortValue || 0, story.sortValue || 0)
      });
    });

    return Array.from(byUrl.values()).sort(function byFreshness(a, b) {
      return (b.sortValue || 0) - (a.sortValue || 0) || a.title.localeCompare(b.title);
    });
  }

  function buildState(stories) {
    const latest = stories.slice(0, 36);
    const hero = pickRefreshHero(latest, stories);
    const bySection = new Map();
    const keywordCounts = new Map();

    stories.forEach(function collect(story) {
      const section = story.section || 'News';
      const bucket = bySection.get(section) || [];
      bucket.push(story);
      bySection.set(section, bucket);

      const terms = story.keywords.length ? story.keywords : extractTerms(story.title + ' ' + story.dek);
      terms.slice(0, 7).forEach(function countKeyword(term) {
        const key = titleCase(term).slice(0, 34);
        if (key.length < 3) return;
        keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
      });
    });

    const topics = Array.from(bySection.entries()).map(function toTopic(entry) {
      const section = entry[0];
      const items = entry[1].sort(function byDate(a, b) { return (b.sortValue || 0) - (a.sortValue || 0); });
      return {
        section,
        color: SECTION_COLORS[section] || '#f4f0e8',
        count: items.length,
        latest: items[0],
        signal: topicSignal(items)
      };
    }).sort(function byCount(a, b) {
      return b.count - a.count || a.section.localeCompare(b.section);
    });

    const keywords = Array.from(keywordCounts.entries())
      .map(function toKeyword(entry) { return { label: entry[0], count: entry[1] }; })
      .sort(function byCount(a, b) { return b.count - a.count || a.label.localeCompare(b.label); })
      .slice(0, 12);

    return {
      stories,
      latest,
      hero,
      topics,
      keywords,
      storyCount: stories.length,
      deskCount: topics.length,
      latestLabel: hero ? (hero.published || formatDate(hero.sortValue)) : '',
      imageCount: stories.filter(function hasImage(story) { return story.image; }).length
    };
  }

  function pickRefreshHero(latest, stories) {
    const source = latest.length ? latest : stories;
    const imageCandidates = source.filter(function hasUsableImage(story) {
      return story && story.url && story.image;
    });
    const candidates = (imageCandidates.length >= 2 ? imageCandidates : source)
      .filter(function hasUrl(story) { return story && story.url; });

    if (!candidates.length) return source[0] || null;

    if (currentRefreshHeroUrl) {
      const alreadyChosen = candidates.find(function sameHero(story) {
        return story.url === currentRefreshHeroUrl;
      });
      if (alreadyChosen) return alreadyChosen;
    }

    const previousUrl = readSessionValue(HERO_STORAGE_KEY);
    const previousIndex = candidates.findIndex(function findPrevious(story) {
      return story.url === previousUrl;
    });
    const nextIndex = previousIndex >= 0 ? (previousIndex + 1) % candidates.length : 0;
    const hero = candidates[nextIndex] || candidates[0];

    return hero;
  }

  function readSessionValue(key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function writeSessionValue(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (_) {}
  }

  function renderFutureHomepage(state) {
    if (!document.body.classList.contains('page-home')) return;

    document.querySelectorAll([
      '.press-living-home',
      '[data-living-home-pulse]',
      '.desk-pulse',
      '.press-catchup',
      '.press-future-studio',
      '.press-topic-radar'
    ].join(',')).forEach(function removePanel(node) {
      node.remove();
    });
  }

  function renderStudioDeck(state) {
    const homeHero = document.querySelector('.home-hero');
    if (!homeHero || !state.hero) return;

    let deck = document.querySelector('.press-future-studio');
    if (!deck) {
      deck = document.createElement('section');
      deck.className = 'press-future-studio';
      deck.setAttribute('aria-label', 'Live newsroom command deck');
      homeHero.insertAdjacentElement('beforebegin', deck);
    }

    const hero = state.hero;
    const hot = state.latest.filter(function different(story) { return story.url !== hero.url; }).slice(0, 6);

    deck.innerHTML = `
      <div class="press-future-studio__inner">
        <article class="press-future-lead" data-story-url="${escapeAttr(hero.url)}">
          <div class="press-future-lead__body">
            <p class="press-future-kicker">Live editorial feature / ${escapeHtml(hero.section)} / ${escapeHtml(freshness(hero))}</p>
            <h2><a href="${escapeAttr(hero.url)}">${escapeHtml(hero.title)}</a></h2>
            <p class="press-future-lead__dek">${escapeHtml(shorten(hero.dek, 260))}</p>
            <div class="press-future-meta-row" aria-label="Edition metrics">
              <span>Rotates on refresh</span>
              <span>Thumbnail lead</span>
              <span>${escapeHtml(freshness(hero))}</span>
            </div>
            <div class="press-future-actions">
              <a class="button press-future-button" href="${escapeAttr(hero.url)}">Read lead</a>
              <button class="press-future-button press-future-button--ghost" type="button" data-future-command-open>Open command center</button>
            </div>
          </div>
          <a class="press-future-lead__media" href="${escapeAttr(hero.url)}">
            ${hero.image ? `<img alt="${escapeAttr(hero.imageAlt || hero.title)}" decoding="async" loading="eager" src="${escapeAttr(hero.image)}">` : `<span>${escapeHtml(hero.section)}</span>`}
          </a>
        </article>

        <aside class="press-signal-board" aria-label="Edition intelligence">
          <div class="press-signal-board__header">
            <p class="press-future-kicker">Edition intelligence</p>
            <h3>More stories in view</h3>
          </div>
          <div class="press-signal-board__visuals">
            ${hot.map(function railCard(story, index) {
              return `
                <a href="${escapeAttr(story.url)}" class="press-rail-card${index === 0 ? ' press-rail-card--feature' : ''}">
                  <span class="press-rail-card__media">
                    ${story.image ? `<img alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" loading="lazy" src="${escapeAttr(story.image)}">` : `<span>${escapeHtml(story.section)}</span>`}
                  </span>
                  <span class="press-rail-card__body">
                    <em>${escapeHtml(story.section)} / ${escapeHtml(freshness(story))}</em>
                    <strong>${escapeHtml(story.title)}</strong>
                  </span>
                </a>
              `;
            }).join('')}
          </div>
          <div class="press-signal-board__queue">
            <p class="press-signal-board__label">Next in the file</p>
            ${hot.slice(0, 3).map(function queueItem(story, index) {
              return `
                <a href="${escapeAttr(story.url)}" class="press-queue-item">
                  ${story.image ? `<img class="press-queue-item__thumb" alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" loading="lazy" src="${escapeAttr(story.image)}">` : `<span class="press-queue-item__number">${String(index + 1).padStart(2, '0')}</span>`}
                  <span class="press-queue-item__text">
                    <strong>${escapeHtml(story.title)}</strong>
                    <em>${escapeHtml(story.section)}</em>
                  </span>
                </a>
              `;
            }).join('')}
          </div>
        </aside>
      </div>
    `;
  }

  function renderTopicRadar(state) {
    const homeGrid = document.querySelector('.home-grid');
    const homeHero = document.querySelector('.home-hero');
    if (!homeHero && !homeGrid) return;

    let radar = document.querySelector('.press-topic-radar');
    if (!radar) {
      radar = document.createElement('section');
      radar.className = 'press-topic-radar';
      radar.setAttribute('aria-label', 'Topic radar');
      (homeGrid || homeHero).insertAdjacentElement('beforebegin', radar);
    }

    const topics = state.topics.slice(0, 10);
    const visualStories = state.latest
      .filter(function hasImage(story) { return story.image; })
      .concat(state.latest.filter(function noImage(story) { return !story.image; }))
      .slice(0, 18);

    radar.innerHTML = `
      <div class="press-topic-radar__inner">
        <div class="press-topic-radar__copy">
          <p class="press-future-kicker">Visual edition</p>
          <h2>See the stories, not just the sections.</h2>
          <p>Latest articles now lead with their thumbnails, with quiet desk shortcuts for jumping into the command center.</p>
          <div class="press-radar-keywords">
            ${topics.slice(0, 8).map(function topicButton(topic) {
              return `<button type="button" data-future-topic="${escapeAttr(topic.section)}">${escapeHtml(topic.section)} <span>${escapeHtml(topic.count)}</span></button>`;
            }).join('')}
          </div>
        </div>

        <div class="press-article-wall" aria-label="Latest article thumbnails">
          ${visualStories.map(function articleTile(story) {
            return `
              <article class="press-visual-story" data-section="${escapeAttr(story.section)}">
                <a class="press-visual-story__media" href="${escapeAttr(story.url)}">
                  ${story.image ? `<img alt="${escapeAttr(story.imageAlt || story.title)}" decoding="async" loading="lazy" src="${escapeAttr(story.image)}">` : `<span>${escapeHtml(story.section)}</span>`}
                </a>
                <div class="press-visual-story__body">
                  <p class="press-future-kicker">${escapeHtml(story.section)} / ${escapeHtml(freshness(story))}</p>
                  <h3><a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a></h3>
                  <p>${escapeHtml(shorten(story.dek, 118))}</p>
                </div>
              </article>
            `;
          }).join('')}
          <a class="press-visual-archive-link" href="archive.html">Open the full archive</a>
        </div>
      </div>
    `;

    radar.querySelectorAll('[data-future-topic]').forEach(function bindTopic(button) {
      button.addEventListener('click', function onTopicClick() {
        openCommand(button.getAttribute('data-future-topic') || '');
      });
    });

    radar.querySelectorAll('[data-future-keyword]').forEach(function bindKeyword(button) {
      button.addEventListener('click', function onKeywordClick() {
        openCommand(button.getAttribute('data-future-keyword') || '');
      });
    });
  }

  function enhanceLeadPanel() {
    document.querySelectorAll('.lead-panel').forEach(function enhance(panel) {
      if (panel.querySelector('.press-live-badge')) return;
      const body = panel.querySelector('.lead-panel__body > div') || panel.querySelector('.lead-panel__body');
      if (!body) return;
      body.insertAdjacentHTML('afterbegin', '<div class="press-live-badge"><span></span> Live editorial slot</div>');
    });
  }

  function installCommandPalette() {
    if (document.querySelector('.press-command')) return;

    const overlay = document.createElement('div');
    overlay.className = 'press-command';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="press-command__scrim" data-command-close></div>
      <section class="press-command__panel" role="dialog" aria-modal="true" aria-labelledby="press-command-title">
        <div class="press-command__top">
          <p class="press-future-kicker" id="press-command-title">Command center</p>
          <button type="button" class="press-command__close" data-command-close aria-label="Close command center">Close</button>
        </div>
        <div class="press-command__search">
          <input data-command-input type="search" autocomplete="off" placeholder="Search the live edition">
        </div>
        <div class="press-command__filters" data-command-filters></div>
        <div class="press-command__body">
          <div class="press-command__results" data-command-results></div>
          <aside class="press-command__preview" data-command-preview></aside>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('[data-command-close]').forEach(function bindClose(button) {
      button.addEventListener('click', closeCommand);
    });

    const input = overlay.querySelector('[data-command-input]');
    input.addEventListener('input', function onInput() {
      selectedIndex = 0;
      renderCommandResults(input.value);
    });

    input.addEventListener('keydown', function onKeydown(event) {
      const links = Array.from(overlay.querySelectorAll('[data-command-result]'));
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, Math.max(links.length - 1, 0));
        syncCommandSelection();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        syncCommandSelection();
      } else if (event.key === 'Enter' && links[selectedIndex]) {
        event.preventDefault();
        links[selectedIndex].click();
      } else if (event.key === 'Escape') {
        closeCommand();
      }
    });
  }

  function bindGlobalCommands() {
    document.addEventListener('click', function interceptSearch(event) {
      const opener = event.target.closest('[data-future-command-open], [data-search-open], .search-trigger');
      if (!opener) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openCommand('');
    }, true);

    document.addEventListener('keydown', function onGlobalKeydown(event) {
      const target = event.target;
      const typing = pressIsEditableTarget(target);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommand('');
        return;
      }

      if (!typing && event.key === '/') {
        event.preventDefault();
        openCommand('');
        return;
      }

      if (event.key === 'Escape' && commandOpen) {
        closeCommand();
      }
    });
  }

  function openCommand(seed) {
    const overlay = document.querySelector('.press-command');
    const input = overlay?.querySelector('[data-command-input]');
    if (!overlay || !input) return;

    commandOpen = true;
    overlay.hidden = false;
    document.documentElement.classList.add('press-command-open');
    buildCommandFilters();

    if (seed) {
      input.value = seed;
      activeFilter = 'All';
    }

    selectedIndex = 0;
    renderCommandResults(input.value);
    window.setTimeout(function focusInput() {
      input.focus();
      input.select();
    }, 20);
  }

  function closeCommand() {
    const overlay = document.querySelector('.press-command');
    if (!overlay) return;
    commandOpen = false;
    overlay.hidden = true;
    document.documentElement.classList.remove('press-command-open');
  }

  function buildCommandFilters() {
    const filters = document.querySelector('[data-command-filters]');
    if (!filters || !futureState) return;

    const sections = ['All'].concat(futureState.topics.slice(0, 8).map(function topicName(topic) { return topic.section; }));
    filters.innerHTML = sections.map(function filter(label) {
      const active = label === activeFilter ? ' is-active' : '';
      return `<button type="button" class="press-command-filter${active}" data-command-filter="${escapeAttr(label)}">${escapeHtml(label)}</button>`;
    }).join('');

    filters.querySelectorAll('[data-command-filter]').forEach(function bind(button) {
      button.addEventListener('click', function onFilterClick() {
        activeFilter = button.getAttribute('data-command-filter') || 'All';
        selectedIndex = 0;
        buildCommandFilters();
        const input = document.querySelector('[data-command-input]');
        renderCommandResults(input?.value || '');
      });
    });
  }

  function renderCommandResults(query) {
    const resultsBox = document.querySelector('[data-command-results]');
    const preview = document.querySelector('[data-command-preview]');
    if (!resultsBox || !preview) return;

    const state = futureState;
    if (!state) {
      resultsBox.innerHTML = '<div class="press-command-empty">Loading the live edition...</div>';
      preview.innerHTML = '';
      return;
    }

    const results = rankStories(state.stories, query || '', activeFilter).slice(0, 12);

    if (!results.length) {
      resultsBox.innerHTML = '<div class="press-command-empty">No matching stories yet.</div>';
      preview.innerHTML = '';
      return;
    }

    resultsBox.innerHTML = results.map(function resultItem(story, index) {
      return `
        <a class="press-command-result${index === selectedIndex ? ' is-selected' : ''}" href="${escapeAttr(story.url)}" data-command-result data-index="${index}">
          <span>${escapeHtml(story.section)}</span>
          <strong>${escapeHtml(story.title)}</strong>
          <em>${escapeHtml(freshness(story))}</em>
        </a>
      `;
    }).join('');

    resultsBox.querySelectorAll('[data-command-result]').forEach(function bindResult(link) {
      link.addEventListener('mouseenter', function onHover() {
        selectedIndex = Number(link.getAttribute('data-index') || 0);
        syncCommandSelection();
      });
    });

    syncCommandSelection();
  }

  function syncCommandSelection() {
    const links = Array.from(document.querySelectorAll('[data-command-result]'));
    const preview = document.querySelector('[data-command-preview]');
    links.forEach(function mark(link, index) {
      link.classList.toggle('is-selected', index === selectedIndex);
    });

    if (!preview || !futureState || !links[selectedIndex]) return;
    const href = links[selectedIndex].getAttribute('href');
    const story = futureState.stories.find(function byHref(item) { return item.url === href; });
    if (!story) return;

    preview.innerHTML = `
      ${story.image ? `<img alt="${escapeAttr(story.imageAlt || story.title)}" src="${escapeAttr(story.image)}" decoding="async" loading="lazy">` : ''}
      <p class="press-future-kicker">${escapeHtml(story.section)} / ${escapeHtml(story.type)}</p>
      <h3>${escapeHtml(story.title)}</h3>
      <p>${escapeHtml(shorten(story.dek, 220))}</p>
      <div class="press-command__meta">
        <span>${escapeHtml(story.published || formatDate(story.sortValue))}</span>
        <span>${escapeHtml(freshness(story))}</span>
      </div>
    `;
  }

  function rankStories(stories, query, filter) {
    const q = clean(query).toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);

    return stories.map(function score(story) {
      if (filter && filter !== 'All' && story.section !== filter) return null;

      let points = story.sortValue ? story.sortValue / 1e10 : 0;
      if (!terms.length) return { story, points };

      terms.forEach(function scoreTerm(term) {
        if (story.title.toLowerCase().includes(term)) points += 120;
        if (story.section.toLowerCase().includes(term)) points += 80;
        if (story.type.toLowerCase().includes(term)) points += 50;
        if ((story.dek || '').toLowerCase().includes(term)) points += 32;
        if ((story.keywords || []).join(' ').toLowerCase().includes(term)) points += 60;
        if (story.scoreText.includes(term)) points += 10;
      });

      return { story, points };
    }).filter(Boolean).sort(function byScore(a, b) {
      return b.points - a.points;
    }).map(function unwrap(item) {
      return item.story;
    });
  }

  function radarPoint(index, total) {
    const angle = (-90 + (360 / Math.max(total, 1)) * index) * Math.PI / 180;
    return {
      x: Math.round(50 + Math.cos(angle) * 38),
      y: Math.round(50 + Math.sin(angle) * 34)
    };
  }

  function topicSignal(items) {
    if (!items.length) return 'quiet';
    const newest = items[0]?.sortValue || 0;
    const ageHours = newest ? (Date.now() - newest) / 36e5 : 9999;
    if (items.length >= 30 || ageHours < 12) return 'surging';
    if (items.length >= 12 || ageHours < 48) return 'active';
    return 'steady';
  }

  function extractTerms(text) {
    return clean(text).toLowerCase().split(/[^a-z0-9]+/).filter(function term(word) {
      return word.length > 3 && !STOP_WORDS.has(word);
    });
  }

  function inferSection(url) {
    const file = String(url || '').split('/').pop() || '';
    const match = file.match(/^([a-z]+)-/i);
    if (!match) return '';
    const raw = match[1].replace(/ai/i, 'AI');
    return titleCase(raw);
  }

  function parseStoryDate(value) {
    const raw = String(value || '');
    const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}(?:T[^\s]+)?/);
    if (isoMatch) {
      const parsed = Date.parse(isoMatch[0]);
      if (!Number.isNaN(parsed)) return parsed;
    }

    const parsed = Date.parse(raw.replace(/•/g, ' '));
    if (!Number.isNaN(parsed)) return parsed;

    return 0;
  }

  function freshness(story) {
    if (!story?.sortValue) return 'in archive';
    const hours = Math.max(0, (Date.now() - story.sortValue) / 36e5);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 72) return `${Math.floor(hours / 24)}d ago`;
    return 'archive';
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
    } catch (_) {
      return '';
    }
  }

  function normalizeUrl(url) {
    const value = clean(url);
    if (!value) return '';
    if (/^(https?:|mailto:|tel:|#)/i.test(value) || value.startsWith('/')) return value;
    return value.replace(/^\.\//, '');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function shorten(value, max) {
    const text = clean(value);
    if (text.length <= max) return text;
    return text.slice(0, Math.max(0, max - 1)).trim().replace(/[,\s]+$/, '') + '...';
  }

  function titleCase(value) {
    const text = clean(value).replace(/[-_]+/g, ' ');
    if (!text) return '';
    if (/^ai$/i.test(text)) return 'AI';
    return text.split(' ').map(function titleWord(word) {
      return /^ai$/i.test(word) ? 'AI' : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  function slugify(value) {
    return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }
})();
/* PRESS_FUTURE_NEWSROOM_END */

/* PRESS_HOMEPAGE_HERO_STANDARD_START
   One permanent contract for the homepage hero:
   1 center lead, 3 side stories on the left, 3 on the right.
   Any renderer that replaces the hero nav is normalized back to this shape.
*/
(function pressHomepageHeroStandard() {
  'use strict';

  const HERO_SLOT_COUNT = 7;
  const SIDE_SLOTS = ['left-1', 'left-2', 'left-3', 'right-1', 'right-2', 'right-3'];

  function layoutLeadNav(navBox) {
    const nav = navBox || document.querySelector('.lead-nav');
    if (!nav || nav.dataset.pressHeroApplying === 'true') return;

    nav.dataset.pressHeroApplying = 'true';

    try {
      const buttons = Array.from(nav.querySelectorAll('[data-lead-button]'));
      const sideButtons = buttons
        .filter((button) => !button.classList.contains('is-active'))
        .slice(0, SIDE_SLOTS.length);

      buttons.forEach((button) => {
        button.removeAttribute('data-side-slot');
      });

      sideButtons.forEach((button, index) => {
        button.setAttribute('data-side-slot', SIDE_SLOTS[index]);
      });

      nav.dataset.sideLayout = 'split';
      nav.closest('.lead-switcher')?.setAttribute('data-press-hero-layout', 'split-rail');
      nav.closest('.lead-switcher')?.setAttribute('data-press-hero-slots', String(HERO_SLOT_COUNT));
    } finally {
      delete nav.dataset.pressHeroApplying;
    }
  }

  function installObserver(nav) {
    if (!nav || nav.dataset.pressHeroStandardBound === 'true') return;

    nav.dataset.pressHeroStandardBound = 'true';
    let queued = false;

    const schedule = () => {
      if (nav.dataset.pressHeroApplying === 'true' || queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        layoutLeadNav(nav);
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(nav, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed'],
    });
  }

  function run() {
    document.querySelectorAll('.lead-nav').forEach((nav) => {
      installObserver(nav);
      layoutLeadNav(nav);
    });
  }

  window.PressHeroStandard = {
    heroSlotCount: HERO_SLOT_COUNT,
    sideSlots: SIDE_SLOTS.slice(),
    layoutLeadNav,
    run,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  window.addEventListener('pageshow', run);
  window.addEventListener('load', run);
  window.addEventListener('press:ecosystem-ready', run);
})();
/* PRESS_HOMEPAGE_HERO_STANDARD_END */

/* PRESS_LIVING_ARTICLE_KIT_START
   Static-first premium layer: place lens, share studio, source constellation,
   entity cards, timelines, reader memory, and homepage pulse. No runtime APIs.
*/
(function pressLivingArticleKit() {
  'use strict';

  const STORAGE = {
    followedTopics: 'press-living-followed-topics',
    readerMode: 'press-living-reader-mode',
    sourceTrail: 'press-living-source-trail',
  };

  const railPhotoSequence = (slug, count) => Array.from(
    { length: count },
    (_, index) => `assets/rail-photoreal/${slug}/${slug}-${String(index + 1).padStart(2, '0')}.jpg`
  );
  const RAIL_PHOTO_ASSET_VERSION = '1779071223';

  const RAIL_PHOTO_SETS = [
    {
      selector: '.atla-social-feature',
      galleryLabel: 'ATLA NoHo',
      images: railPhotoSequence('atla', 52),
    },
    {
      selector: '.science-the-ocean-has-a-fever-and-the-thermometer-is-everywhere-social-feature',
      galleryLabel: 'The Ocean Has a Fever',
      images: railPhotoSequence('ocean-fever', 32),
    },
    {
      selector: '.climate-your-home-insurance-bill-is-the-new-climate-map-social-feature',
      galleryLabel: 'Home insurance climate map',
      images: railPhotoSequence('home-insurance', 32),
    },
    {
      selector: '.education-the-phone-free-school-day-is-a-live-experiment-social-feature',
      galleryLabel: 'Phone-free school day',
      images: railPhotoSequence('phone-free-school', 32),
    },
    {
      selector: '.poker-prime-time-feature',
      galleryLabel: 'Texas Holdem',
      images: railPhotoSequence('texas-holdem', 24),
    },
    {
      selector: '.defense-ai-social-feature',
      galleryLabel: 'Pentagon AI',
      images: railPhotoSequence('pentagon-ai', 32),
    },
  ];

  const RAIL_PHOTO_POSITIONS = [
    'center center',
    '50% 34%',
    '50% 66%',
    '35% center',
    '65% center',
    '44% 42%',
    '56% 58%',
  ];

  const PLACE_LIBRARY = [
    {
      id: 'atla-noho',
      label: 'ATLA NoHo',
      type: 'Restaurant',
      address: '372 Lafayette Street, New York, NY',
      names: ['ATLA NoHo', 'Atla', '372 Lafayette Street', 'Lafayette Street'],
      lat: 40.72717,
      lng: -73.99418,
      note: 'The Lafayette Street room anchors the closing story and the replacement concept that follows it.',
      scene: 'A NoHo restaurant block where food, design, social memory, and real estate all sit in the same room.',
    },
    {
      id: 'noho',
      label: 'NoHo, Manhattan',
      type: 'Neighborhood',
      address: 'NoHo, New York, NY',
      names: ['NoHo', 'NoHo NYC'],
      lat: 40.72755,
      lng: -73.99482,
      note: 'The neighborhood is not a backdrop in the Atla feature; it is part of why the room mattered.',
      scene: 'Cast-iron blocks, downtown dining, foot traffic, and a city that treats restaurant turnover as civic weather.',
    },
    {
      id: 'cosme',
      label: 'Cosme',
      type: 'Restaurant',
      address: '35 E 21st Street, New York, NY',
      names: ['Cosme'],
      lat: 40.74058,
      lng: -73.98913,
      note: 'Cosme is the higher-gloss sibling that helps explain the Casamata New York universe.',
      scene: 'A Flatiron dining room where modern Mexican cooking became part of New York power dining.',
    },
    {
      id: 'pujol',
      label: 'Pujol',
      type: 'Restaurant',
      address: 'Tennyson 133, Polanco, Mexico City',
      names: ['Pujol', 'Mexico City'],
      lat: 19.43071,
      lng: -99.19474,
      note: 'Pujol is the origin point for Enrique Olvera context in several restaurant stories.',
      scene: 'A Mexico City dining institution whose influence travels through cooks, concepts, and city-to-city adaptations.',
    },
    {
      id: 'venice-los-angeles',
      label: 'Venice, Los Angeles',
      type: 'Neighborhood',
      address: 'Venice, Los Angeles, CA',
      names: ['Venice', 'Los Angeles', 'L.A.', 'LA'],
      lat: 33.98505,
      lng: -118.46948,
      note: 'The Los Angeles branch gives the Atla story a second-city echo.',
      scene: 'A beachside restaurant market where Mexico City influence, California dining, and brand expansion meet.',
    },
    {
      id: 'horseshoe-paris-las-vegas',
      label: 'Horseshoe and Paris Las Vegas',
      type: 'Venue',
      address: 'Las Vegas Strip, Las Vegas, NV',
      names: ['Horseshoe', 'Paris Las Vegas', 'Las Vegas', 'WSOP'],
      lat: 36.11289,
      lng: -115.17185,
      note: 'The WSOP Main Event story lives physically inside the Las Vegas casino corridor.',
      scene: 'A televised poker room where tournament scale, camera grammar, and crowd pressure become one product.',
    },
    {
      id: 'espn-bristol',
      label: 'ESPN campus',
      type: 'Media hub',
      address: 'Bristol, CT',
      names: ['ESPN', 'Bristol'],
      lat: 41.64882,
      lng: -72.90078,
      note: 'ESPN matters in sports stories as distribution, memory, and a mainstream viewing room.',
      scene: 'A broadcast hub where sports become schedules, packages, highlight language, and shared national appointment viewing.',
    },
    {
      id: 'pentagon',
      label: 'The Pentagon',
      type: 'Government',
      address: 'Washington, DC area',
      names: ['Pentagon', 'Department of War', 'Department of Defense'],
      lat: 38.87186,
      lng: -77.05627,
      note: 'The classified AI story is about models entering secure defense infrastructure.',
      scene: 'A five-sided bureaucracy where procurement, cloud systems, secrecy, and military judgment converge.',
    },
    {
      id: 'washington-dc',
      label: 'Washington, DC',
      type: 'Capital',
      address: 'Washington, DC',
      names: ['Washington', 'White House', 'Capitol', 'D.C.', 'DC'],
      lat: 38.89768,
      lng: -77.03653,
      note: 'Many politics, courts, culture, and security stories route through Washington power.',
      scene: 'A symbolic city where paperwork, law, ceremony, and crisis often share the same stage.',
    },
    {
      id: 'washington-hilton',
      label: 'Washington Hilton',
      type: 'Hotel and event venue',
      address: '1919 Connecticut Avenue NW, Washington, DC',
      names: ['Washington Hilton', 'Terrace Level', 'Correspondents’ Dinner', 'Correspondents Dinner'],
      lat: 38.91697,
      lng: -77.04522,
      note: 'The ballroom and checkpoint make the security story a question of venue design, memory, and public ritual.',
      scene: 'A Washington hotel whose ballrooms can become a media room, a security perimeter, and a political symbol at once.',
    },
    {
      id: 'oakland-federal-court',
      label: 'Oakland federal courthouse area',
      type: 'Courthouse',
      address: 'Oakland, CA',
      names: ['Oakland'],
      lat: 37.80436,
      lng: -122.27111,
      note: 'The OpenAI trial becomes more concrete when the abstract governance fight has a courtroom on the map.',
      scene: 'A Bay Area courthouse setting where nonprofit promises, capital, and AI power are translated into exhibits and testimony.',
    },
    {
      id: 'nasa-kennedy',
      label: 'Kennedy Space Center',
      type: 'Spaceport',
      address: 'Merritt Island, FL',
      names: ['Kennedy Space Center', 'Artemis', 'Launch Complex 39B', 'NASA'],
      lat: 28.62717,
      lng: -80.62082,
      note: 'Artemis stories need a physical launch site, not just a space-program acronym.',
      scene: 'A coastal launch complex where engineering becomes public spectacle and telemetry becomes evidence.',
    },
    {
      id: 'the-hague',
      label: 'The Hague',
      type: 'Diplomatic city',
      address: 'The Hague, Netherlands',
      names: ['The Hague', 'NATO summit'],
      lat: 52.0705,
      lng: 4.3007,
      note: 'European defense stories often pass through summit language before becoming logistics.',
      scene: 'A diplomatic city where alliance photographs have to become production lines and movement plans.',
    },
    {
      id: 'strait-hormuz',
      label: 'Strait of Hormuz',
      type: 'Maritime chokepoint',
      address: 'Persian Gulf / Gulf of Oman',
      names: ['Strait of Hormuz', 'Hormuz'],
      lat: 26.5667,
      lng: 56.25,
      note: 'Energy and war-risk stories become legible when the chokepoint is visible.',
      scene: 'A narrow waterway where oil, shipping insurance, military signaling, and inflation meet.',
    },
    {
      id: 'el-fasher',
      label: 'El Fasher, Darfur',
      type: 'City',
      address: 'North Darfur, Sudan',
      names: ['El Fasher', 'Darfur', 'Sudan'],
      lat: 13.62793,
      lng: 25.34936,
      note: 'Darfur stories often turn on routes, burn scars, and the geography of food access.',
      scene: 'A city and surrounding region where satellite evidence, roads, markets, and survival are bound together.',
    },
    {
      id: 'nairobi',
      label: 'Nairobi',
      type: 'City',
      address: 'Nairobi, Kenya',
      names: ['Nairobi', 'Kenya'],
      lat: -1.28639,
      lng: 36.81722,
      note: 'Flood and infrastructure stories become sharper when the drainage geography is visible.',
      scene: 'A fast-growing city where roads, rivers, informal settlements, and rainfall all test the urban system.',
    },
    {
      id: 'burbank',
      label: 'Burbank studio district',
      type: 'Media place',
      address: 'Burbank, CA',
      names: ['Burbank', 'Warner Bros.', 'Paramount Skydance'],
      lat: 34.148,
      lng: -118.337,
      note: 'Hollywood consolidation stories become less abstract when tied to lots, gates, and workers.',
      scene: 'A studio city where streaming strategy eventually touches call sheets, back lots, and production labor.',
    },
    {
      id: 'richmond',
      label: 'Richmond',
      type: 'City',
      address: 'Richmond, VA',
      names: ['Richmond'],
      lat: 37.54072,
      lng: -77.43605,
      note: 'Cloud, power, and state-policy stories often land in local ratepayer math.',
      scene: 'A capital city where data-center growth can become a public utility argument.',
    },
    {
      id: 'wichita',
      label: 'Wichita',
      type: 'City',
      address: 'Wichita, KS',
      names: ['Wichita'],
      lat: 37.68718,
      lng: -97.33005,
      note: 'Local governance stories are often clearest when a strange new tool meets a public rulebook.',
      scene: 'A city hall test case where technology policy becomes an ordinary vote.',
    },
    {
      id: 'odesa',
      label: 'Odesa',
      type: 'Port city',
      address: 'Odesa, Ukraine',
      names: ['Odesa', 'Odessa'],
      lat: 46.48253,
      lng: 30.72331,
      note: 'Port stories tie war, food, shipping, and nuclear risk to one coastline.',
      scene: 'A Black Sea port where sirens, grain corridors, and European security overlap.',
    },
    {
      id: 'canary-islands',
      label: 'Canary Islands',
      type: 'Atlantic archipelago',
      address: 'Canary Islands, Spain',
      names: ['Canary Islands', 'Canaries'],
      lat: 28.2916,
      lng: -16.6291,
      note: 'The Arconian seizure made the Atlantic approach visible before the story moved inland.',
      scene: 'An Atlantic waypoint where maritime enforcement, island geography, and European demand intersect.',
    },
    {
      id: 'antwerp',
      label: 'Antwerp',
      type: 'Port city',
      address: 'Antwerp, Belgium',
      names: ['Antwerp', 'Port of Antwerp', 'Port of Antwerp-Bruges'],
      lat: 51.2194,
      lng: 4.4025,
      note: 'Antwerp is one of Europe’s central cocaine-trafficking pressure points.',
      scene: 'A North Sea logistics hub where containers, customs, corruption pressure, and urban violence meet.',
    },
    {
      id: 'rotterdam',
      label: 'Rotterdam',
      type: 'Port city',
      address: 'Rotterdam, Netherlands',
      names: ['Rotterdam', 'Port of Rotterdam'],
      lat: 51.9244,
      lng: 4.4777,
      note: 'Rotterdam keeps the story anchored in the North Sea port system.',
      scene: 'A massive port city where legitimate trade volume creates both prosperity and concealment risk.',
    },
    {
      id: 'algeciras',
      label: 'Algeciras',
      type: 'Port city',
      address: 'Algeciras, Spain',
      names: ['Algeciras'],
      lat: 36.1408,
      lng: -5.4562,
      note: 'The story cites Spain’s earlier 13-tonne banana-shipment seizure at Algeciras.',
      scene: 'A Strait of Gibraltar port where Spanish enforcement and global cargo lanes overlap.',
    },
    {
      id: 'hamburg',
      label: 'Hamburg',
      type: 'Port city',
      address: 'Hamburg, Germany',
      names: ['Hamburg', 'Port of Hamburg'],
      lat: 53.5511,
      lng: 9.9937,
      note: 'Hamburg appears in the story as a previous large European seizure point and a reminder that pressure shifts across ports.',
      scene: 'A major northern port where legitimate cargo volume creates the kind of scale traffickers try to hide inside.',
    },
    {
      id: 'le-havre',
      label: 'Le Havre',
      type: 'Port city',
      address: 'Le Havre, France',
      names: ['Le Havre'],
      lat: 49.4944,
      lng: 0.1079,
      note: 'Le Havre keeps France inside the broader port-pressure map described by the article.',
      scene: 'A Channel port where European logistics, customs pressure, and route displacement can meet.',
    },
    {
      id: 'marseille',
      label: 'Marseille',
      type: 'Port city',
      address: 'Marseille, France',
      names: ['Marseille'],
      lat: 43.2965,
      lng: 5.3698,
      note: 'The article cites Marseille as one of the cities forced to confront cocaine-linked violence and market pressure.',
      scene: 'A Mediterranean port city where trafficking pressure can spill from maritime routes into urban life.',
    },
    {
      id: 'united-kingdom',
      label: 'United Kingdom',
      type: 'Consumer market',
      address: 'United Kingdom',
      names: ['United Kingdom', 'UK', 'Britain', 'British', 'England and Wales'],
      lat: 54.7024,
      lng: -3.2766,
      note: 'The UK is central to the article’s consumer, public-health, wastewater and organised-crime lens.',
      scene: 'A consumer market where the cocaine story leaves ports and becomes mortality data, wastewater signals, street pressure, and ordinary public life.',
    },
    {
      id: 'ecuador',
      label: 'Ecuador',
      type: 'Transit country',
      address: 'Ecuador',
      names: ['Ecuador', 'Ecuadorian'],
      lat: -1.8312,
      lng: -78.1834,
      note: 'Ecuador appears in the story as part of the source and transit pressure connected to European demand.',
      scene: 'An Andean-Pacific pressure point where port violence, gangs, politics, and global cocaine demand intersect.',
    },
    {
      id: 'andean-region',
      label: 'Andean region',
      type: 'Source region',
      address: 'Colombia, Peru, Bolivia and Ecuador',
      names: ['Andean region', 'Andes', 'Colombia', 'Peru', 'Bolivia'],
      lat: -9.19,
      lng: -75.0152,
      note: 'The article connects European demand back to coca cultivation, production pressure, and source-country harm.',
      scene: 'A broad production geography where cultivation, processing, armed groups, rural pressure, and global demand become one supply chain.',
    },
  ];

  const ENTITY_LIBRARY = [
    {
      id: 'arconian',
      name: 'Arconian',
      type: 'Seized vessel',
      aliases: ['Arconian'],
      summary: 'The Comoros-flagged ship Spanish authorities tied to the May 2026 seizure of about 30 tonnes of cocaine near the Canary Islands.',
      why: 'It is the article’s news peg: one vessel that makes a much larger European cocaine market visible.',
    },
    {
      id: 'guardia-civil',
      name: 'Guardia Civil',
      type: 'Law-enforcement agency',
      aliases: ['Guardia Civil'],
      summary: 'Spain’s national police force with military status, central to maritime and drug-trafficking enforcement.',
      why: 'The Arconian case begins with Spanish enforcement and the intelligence that led to the interdiction.',
    },
    {
      id: 'euda',
      name: 'European Union Drugs Agency',
      type: 'Drug-monitoring agency',
      aliases: ['European Union Drugs Agency', 'EUDA', 'European Drug Agency'],
      summary: 'The EU agency that tracks drug use, seizures, wastewater, treatment demand, deaths, and market signals.',
      why: 'Its cocaine and wastewater data make the story more than a single spectacular seizure.',
    },
    {
      id: 'unodc',
      name: 'United Nations Office on Drugs and Crime',
      type: 'UN agency',
      aliases: ['United Nations Office on Drugs and Crime', 'UNODC'],
      summary: 'The UN agency whose global drug reports track cocaine production, trafficking routes, and market expansion.',
      why: 'It connects Europe’s demand to production pressure and source-country violence.',
    },
    {
      id: 'europol',
      name: 'Europol',
      type: 'Law-enforcement agency',
      aliases: ['Europol'],
      summary: 'The EU law-enforcement agency focused on serious and organised crime, including drug trafficking and criminal networks.',
      why: 'Europol frames cocaine as a logistics, corruption, violence, and organised-crime problem.',
    },
    {
      id: 'eurojust',
      name: 'Eurojust',
      type: 'Judicial cooperation agency',
      aliases: ['Eurojust'],
      summary: 'The EU agency that supports cross-border judicial cooperation in major crime cases.',
      why: 'Drug-trafficking investigations do not stop cleanly at national borders; prosecution has to travel too.',
    },
    {
      id: 'european-ports-alliance',
      name: 'European Ports Alliance',
      type: 'Port-security initiative',
      aliases: ['European Ports Alliance', 'Ports Alliance'],
      summary: 'An EU-backed public-private effort to harden ports against drug trafficking and organised-crime infiltration.',
      why: 'It shows that Europe sees ports as systems of economic importance and criminal vulnerability.',
    },
    {
      id: 'national-crime-agency',
      name: 'National Crime Agency',
      type: 'UK law-enforcement agency',
      aliases: ['National Crime Agency', 'NCA'],
      summary: 'The UK agency that assesses and investigates serious and organised crime, including Class A drug markets.',
      why: 'It gives the British angle an enforcement baseline rather than treating the UK as only a consumer market.',
    },
    {
      id: 'office-national-statistics',
      name: 'Office for National Statistics',
      type: 'Statistics agency',
      aliases: ['Office for National Statistics', 'ONS'],
      summary: 'The UK statistics office whose death registrations show cocaine appearing in mortality records.',
      why: 'It makes the consumer-impact side measurable through death-certificate data.',
    },
    {
      id: 'home-office',
      name: 'UK Home Office',
      type: 'Government department',
      aliases: ['Home Office', 'UK Home Office'],
      summary: 'The UK department whose wastewater and drug-misuse statistics help estimate cocaine demand.',
      why: 'Its data helps connect street-level use to city-scale consumption patterns.',
    },
    {
      id: 'port-antwerp-bruges',
      name: 'Port of Antwerp-Bruges',
      type: 'Port authority',
      aliases: ['Port of Antwerp-Bruges', 'Port of Antwerp'],
      summary: 'A major Belgian port authority at the center of Europe’s cocaine-trafficking pressure.',
      why: 'The article uses Antwerp to show how legitimate logistics infrastructure becomes a trafficking target.',
    },
    {
      id: 'port-rotterdam',
      name: 'Port of Rotterdam',
      type: 'Port authority',
      aliases: ['Port of Rotterdam'],
      summary: 'One of Europe’s largest ports and a central node in the North Sea logistics system.',
      why: 'Rotterdam broadens the port story beyond one country and shows the scale of the enforcement problem.',
    },
    {
      id: 'reuters',
      name: 'Reuters',
      type: 'News agency',
      aliases: ['Reuters'],
      summary: 'The news agency whose reporting supplied the central Arconian seizure account used in the article.',
      why: 'It anchors the breaking-news claim in a named reporting source rather than social reaction.',
    },
    {
      id: 'el-pais',
      name: 'El Pais',
      type: 'News organization',
      aliases: ['El Pais', 'El País'],
      summary: 'The Spanish newspaper whose reporting added court, valuation, and destination context around the Arconian case.',
      why: 'It gives the Spanish legal and enforcement story more local texture.',
    },
    {
      id: 'atla',
      name: 'Atla',
      type: 'Restaurant',
      aliases: ['Atla', 'ATLA'],
      summary: 'A NoHo restaurant whose closing turns one room into a story about memory, reinvention, and restaurant culture.',
      why: 'It gives the article a physical object: not just a business closure, but a place people ate, posted about, and remembered.',
    },
    {
      id: 'enrique-olvera',
      name: 'Enrique Olvera',
      type: 'Chef',
      aliases: ['Enrique Olvera', 'Olvera'],
      summary: 'The chef and restaurateur behind Pujol, Cosme, Atla, and the wider Casamata universe.',
      why: 'His reputation connects the local New York closing to a broader city-to-city restaurant system.',
    },
    {
      id: 'casamata',
      name: 'Casamata',
      type: 'Hospitality group',
      aliases: ['Casamata'],
      summary: 'The restaurant group around Olvera projects including Pujol, Cosme, Atla, and later concepts.',
      why: 'The group makes the closing read as conversion and succession, not only disappearance.',
    },
    {
      id: 'cosme',
      name: 'Cosme',
      type: 'Restaurant',
      aliases: ['Cosme'],
      summary: 'A New York restaurant that helps define the higher-end side of the Olvera/Casamata presence.',
      why: 'It gives readers a sibling reference for Atla and the group portfolio.',
    },
    {
      id: 'pujol',
      name: 'Pujol',
      type: 'Restaurant',
      aliases: ['Pujol'],
      summary: 'Olvera’s Mexico City flagship and a central reference point for his cooking reputation.',
      why: 'It explains why a casual downtown restaurant can still carry international culinary gravity.',
    },
    {
      id: 'wsop',
      name: 'World Series of Poker',
      type: 'Sports property',
      aliases: ['World Series of Poker', 'WSOP', 'Main Event'],
      summary: 'Poker’s most recognizable tournament brand and the anchor of the prime-time sports feature.',
      why: 'The story depends on the WSOP as both competition and television product.',
    },
    {
      id: 'espn',
      name: 'ESPN',
      type: 'Broadcaster',
      aliases: ['ESPN'],
      summary: 'The sports network whose distribution can make a poker final table feel mainstream again.',
      why: 'It turns the tournament into a scheduled shared room, not only a niche stream.',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'AI company',
      aliases: ['OpenAI'],
      summary: 'A frontier AI company central to stories about governance, infrastructure, military use, and trust.',
      why: 'In The Press stories, OpenAI often stands where mission language meets money, power, and deployment.',
    },
    {
      id: 'elon-musk',
      name: 'Elon Musk',
      type: 'Executive',
      aliases: ['Elon Musk', 'Musk'],
      summary: 'A founder, executive, and litigant whose public conflicts often turn private governance disputes into spectacle.',
      why: 'In the OpenAI court story, Musk is both messenger and interested competitor.',
    },
    {
      id: 'sam-altman',
      name: 'Sam Altman',
      type: 'Executive',
      aliases: ['Sam Altman', 'Altman'],
      summary: 'OpenAI’s chief executive and a recurring figure in stories about AI scale, governance, and commercial power.',
      why: 'He personifies the institutional question of whether mission language can survive market scale.',
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      type: 'Technology company',
      aliases: ['Microsoft'],
      summary: 'A cloud and AI giant whose partnership with OpenAI made compute, capital, and distribution inseparable.',
      why: 'It is the infrastructure and investment layer under several AI stories.',
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'AI company',
      aliases: ['Anthropic'],
      summary: 'An AI company often used as a comparison point in safety, enterprise, and defense AI stories.',
      why: 'Its presence or absence can reveal where the guardrail argument is moving.',
    },
    {
      id: 'google',
      name: 'Google',
      type: 'Technology company',
      aliases: ['Google'],
      summary: 'A cloud and AI company that appears in stories about infrastructure, enterprise deployment, and defense contracts.',
      why: 'It broadens the story beyond one AI vendor into a platform race.',
    },
    {
      id: 'oracle',
      name: 'Oracle',
      type: 'Technology company',
      aliases: ['Oracle'],
      summary: 'A cloud and database company that appears where AI deployment meets government infrastructure.',
      why: 'It helps show how AI is becoming a cloud-contract and classified-network story.',
    },
    {
      id: 'pentagon',
      name: 'The Pentagon',
      type: 'Institution',
      aliases: ['Pentagon', 'Department of Defense', 'Department of War'],
      summary: 'The U.S. military bureaucracy where procurement, classified systems, and AI deployment become policy.',
      why: 'It makes AI governance tangible: the model is entering rooms where mistakes are not abstract.',
    },
    {
      id: 'nasa',
      name: 'NASA',
      type: 'Space agency',
      aliases: ['NASA', 'Artemis'],
      summary: 'The U.S. space agency central to Artemis and science-infrastructure stories.',
      why: 'NASA stories let the site show engineering as a public evidence system, not just launch spectacle.',
    },
    {
      id: 'nato',
      name: 'NATO',
      type: 'Alliance',
      aliases: ['NATO'],
      summary: 'The military alliance at the center of European defense, readiness, logistics, and procurement stories.',
      why: 'It turns speeches about security into questions about budgets, factories, roads, and time.',
    },
    {
      id: 'cdc',
      name: 'CDC',
      type: 'Public health agency',
      aliases: ['CDC'],
      summary: 'The U.S. public health agency that appears in outbreak, vaccine, surveillance, and evidence-chain stories.',
      why: 'CDC references usually show whether health information is moving like infrastructure.',
    },
    {
      id: 'white-house',
      name: 'White House',
      type: 'Institution',
      aliases: ['White House'],
      summary: 'The presidential institution that turns ceremony, security, and public communication into national signals.',
      why: 'In Washington stories, it makes the room larger than the room: security choices become political architecture.',
    },
    {
      id: 'secret-service',
      name: 'Secret Service',
      type: 'Federal agency',
      aliases: ['Secret Service'],
      summary: 'The federal protective agency responsible for presidential security and high-risk event protocols.',
      why: 'Its response is the difference between a disrupted event and a much larger constitutional crisis.',
    },
    {
      id: 'department-of-justice',
      name: 'Department of Justice',
      type: 'Federal agency',
      aliases: ['Department of Justice', 'Justice Department', 'DOJ'],
      summary: 'The federal law-enforcement institution that turns alleged political violence into charges, affidavits, and court process.',
      why: 'It gives crisis reporting an official evidence trail beyond the immediate scene.',
    },
    {
      id: 'fbi',
      name: 'FBI',
      type: 'Federal agency',
      aliases: ['FBI'],
      summary: 'The federal investigative agency that appears when threats, affidavits, communications, and motive claims must be sorted into evidence.',
      why: 'It helps separate a fast-moving public narrative from what investigators can actually document.',
    },
    {
      id: 'donald-trump',
      name: 'Donald Trump',
      type: 'Public official',
      aliases: ['Donald Trump', 'President Trump', 'Trump'],
      summary: 'The president at the center of security, politics, courts, and institutional-power stories.',
      why: 'His presence changes an event from local disruption into a national security and political legitimacy story.',
    },
    {
      id: 'iran',
      name: 'Iran',
      type: 'State actor',
      aliases: ['Iran', 'Tehran'],
      summary: 'A state actor central to Gulf security, energy chokepoints, sanctions, and nuclear diplomacy.',
      why: 'In Hormuz stories, Iranian decisions can move from negotiation rooms into oil prices, shipping lanes, and household costs.',
    },
    {
      id: 'international-energy-agency',
      name: 'International Energy Agency',
      type: 'Energy body',
      aliases: ['International Energy Agency', 'IEA'],
      summary: 'An energy-policy organization whose chokepoint data helps turn maritime stress into economic scale.',
      why: 'Its numbers explain why one narrow waterway can become a global price story.',
    },
    {
      id: 'international-maritime-organization',
      name: 'International Maritime Organization',
      type: 'UN agency',
      aliases: ['International Maritime Organization', 'IMO'],
      summary: 'The U.N. maritime agency that frames chokepoint crises through vessel safety, crews, and shipping rules.',
      why: 'It keeps the human labor of seafarers visible inside an oil-market story.',
    },
    {
      id: 'world-food-programme',
      name: 'World Food Programme',
      type: 'Humanitarian agency',
      aliases: ['World Food Programme', 'WFP'],
      summary: 'A U.N. food agency whose market monitors and emergency operations make hunger measurable in war zones.',
      why: 'Its data connects prices, routes, access, and famine warnings to what families can actually eat.',
    },
    {
      id: 'rapid-support-forces',
      name: 'Rapid Support Forces',
      type: 'Armed group',
      aliases: ['Rapid Support Forces', 'RSF'],
      summary: 'A Sudanese paramilitary force central to the Darfur war, siege reporting, displacement, and rights investigations.',
      why: 'The Darfur food-map story depends on who controls roads, burns villages, and constrains civilian movement.',
    },
    {
      id: 'sudanese-armed-forces',
      name: 'Sudanese Armed Forces',
      type: 'Military',
      aliases: ['Sudanese Armed Forces', 'SAF'],
      summary: 'Sudan’s military force and one of the principal parties to the country’s war.',
      why: 'Naming both conflict parties helps the story track responsibility without flattening a complex war into one tactic.',
    },
    {
      id: 'ipc',
      name: 'Integrated Food Security Phase Classification',
      type: 'Food-security system',
      aliases: ['Integrated Food Security Phase Classification', 'IPC'],
      summary: 'The technical system used to classify acute food insecurity, catastrophe, and famine conditions.',
      why: 'It explains why famine warnings can be precise, late, disputed, and still morally urgent.',
    },
  ];

  const SOURCE_CLUSTER_ORDER = [
    'Official',
    'Reporting',
    'Social',
    'Guide',
    'Legal',
    'Public Data',
    'Place',
    'Background',
  ];

  const NUMBER_TOKEN_PATTERN = /(^|[^A-Za-z0-9$€£])((?:[$€£]\s?\d[\d,.]*(?:\.\d+)?(?:\s?(?:million|billion|trillion))?)|(?:\d[\d,.]*(?:\.\d+)?(?:\s|-)?(?:%|percent|million|billion|trillion|barrels?|vessels?|tankers?|ships?|crews?|kilometers?|miles?|tonnes?|tons?|gigawatts?|megawatts?|people|families|children|exports?|imports?|capacity|per day)))(?=$|[^A-Za-z0-9])/gi;
  const SOURCE_NOTE_REF_SELECTOR = '.source-ref a[href^="#source"], a[href^="#source"].source-label, a[data-source-id]:not([data-source-external="true"])';

  let activeArticleContext = null;
  let lastFocusedElement = null;
  let lastSourceClickAt = 0;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  ready(function initLivingArticleKit() {
    bindGlobalLivingActions();
    installRailPhotoGalleries();
    installArticleGalleryJumpLink();
    installRailPhotos();
    initArticlePage();
    initHomepagePulse();
  });

  function installRailPhotoGalleries() {
    RAIL_PHOTO_SETS.forEach((set) => {
      document.querySelectorAll(set.selector).forEach((feature) => {
        if (!set.images?.length || feature.querySelector('#article-gallery.article-rail-gallery')) return;

        const details = document.createElement('details');
        details.className = 'article-rail-gallery article-rail-gallery--top';
        details.id = 'article-gallery';

        const summary = document.createElement('summary');
        summary.textContent = 'Article Gallery';

        const grid = document.createElement('div');
        grid.className = 'article-rail-gallery__grid';

        const sourceCards = Array.from(feature.querySelectorAll('.press-static-post'));
        set.images.forEach((src, index) => {
          const imageUrl = railPhotoAssetUrl(src);
          const sourceHref = getRailCardSourceHref(sourceCards[index]);
          const card = document.createElement('a');
          card.className = 'article-rail-gallery__card';
          card.href = sourceHref || (document.getElementById('source-notes') ? '#source-notes' : window.location.href);
          if (sourceHref && /^https?:\/\//i.test(sourceHref)) {
            card.rel = 'noopener noreferrer';
          }
          card.setAttribute('aria-label', `${set.galleryLabel || 'Article'} source ${index + 1}`);

          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = `${set.galleryLabel || 'Article'} rail card photo ${index + 1}`;
          img.loading = 'lazy';
          img.decoding = 'async';

          card.appendChild(img);
          grid.appendChild(card);
        });

        details.append(summary, grid);
        feature.prepend(details);
        installArticleGalleryJumpLink();
      });
    });
  }

  function getRailCardSourceHref(card) {
    if (!card) return '';
    const dataUrl = card.getAttribute('data-source-url');
    if (dataUrl) return dataUrl;

    const ids = new Set();
    (card.getAttribute('data-source-ids') || '').split(/\s+/).forEach((id) => {
      if (id) ids.add(id);
    });

    Array.from(card.querySelectorAll('a[data-source-id]')).forEach((candidate) => {
      const id = candidate.getAttribute('data-source-id');
      if (id) ids.add(id);
    });

    for (const id of ids) {
      const resolved = getSourceNoteExternalHref(id);
      if (resolved) return resolved;
    }

    const links = Array.from(card.querySelectorAll('a[href]'));
    const link = links.find((candidate) => {
      const href = candidate.getAttribute('href') || '';
      return href && !href.startsWith('#') && !/\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(href);
    });
    if (link) return link.href || link.getAttribute('href') || '';

    for (const candidate of links) {
      const href = candidate.getAttribute('href') || '';
      if (!href.startsWith('#source-')) continue;
      const resolved = getSourceNoteExternalHref(href.slice(1));
      if (resolved) return resolved;
    }

    const internalSourceLink = links.find((candidate) => {
      const href = candidate.getAttribute('href') || '';
      return href && href.startsWith('#') && !href.includes('article-gallery');
    });

    return internalSourceLink?.getAttribute('href') || '';
  }

  function getSourceNoteExternalHref(id) {
    if (!id) return '';
    const sourceId = id.startsWith('source-') ? id : `source-${id}`;
    const sourceNote = document.getElementById(sourceId);
    const link = sourceNote?.querySelector('a[href^="http://"], a[href^="https://"]');
    return link?.href || link?.getAttribute('href') || '';
  }

  function installArticleGalleryJumpLink() {
    const gallery = document.getElementById('article-gallery');
    if (!gallery) return;

    const asideCards = Array.from(document.querySelectorAll('.article-aside .aside-card'));
    const onThisPage = asideCards.find((card) => {
      const heading = card.querySelector('h2, h3');
      return heading?.textContent?.trim().toLowerCase() === 'on this page';
    });
    const list = onThisPage?.querySelector('ol, ul');
    if (list && !list.querySelector('a[href="#article-gallery"]')) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#article-gallery';
      link.textContent = 'Article Gallery';
      link.setAttribute('data-open-gallery', '');
      item.appendChild(link);
      list.insertBefore(item, list.firstElementChild?.nextElementSibling || list.firstElementChild || null);
    }

    document.querySelectorAll('a[href="#article-gallery"]').forEach((link) => {
      if (gallery.dataset.galleryOpenMode === 'manual' && !link.hasAttribute('data-open-gallery')) return;
      if (link.dataset.galleryOpenBound === 'true') return;
      link.dataset.galleryOpenBound = 'true';
      link.addEventListener('click', () => {
        gallery.open = true;
      });
    });
  }

  function installRailPhotos() {
    RAIL_PHOTO_SETS.forEach((set) => {
      document.querySelectorAll(set.selector).forEach((feature) => {
        const cards = Array.from(feature.querySelectorAll('.press-static-post'));
        cards.forEach((card, index) => attachRailPhoto(card, set, index));
      });
    });
  }

  function attachRailPhoto(card, set, index) {
    if (!card || card.dataset.railPhotoBound === 'true' || !set.images?.length) return;

    card.querySelectorAll('.press-static-post__media--illustration, .press-static-post__media--real').forEach((node) => node.remove());
    const existingPhoto = card.querySelector('.press-static-post__media--rail-photo');
    if (existingPhoto) {
      card.dataset.railPhotoBound = 'true';
      return;
    }

    const src = set.images[index % set.images.length];
    const figure = document.createElement('figure');
    figure.className = 'press-static-post__media press-static-post__media--rail-photo';
    figure.setAttribute('aria-hidden', 'true');
    figure.style.setProperty('--rail-photo-position', RAIL_PHOTO_POSITIONS[index % RAIL_PHOTO_POSITIONS.length]);

    const img = document.createElement('img');
    img.src = railPhotoAssetUrl(src);
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => {
      figure.remove();
      card.classList.remove('press-static-post--with-rail-photo');
      card.dataset.railPhotoBound = 'false';
    };

    figure.appendChild(img);

    const insertBefore = card.querySelector('.press-static-post__visual') || card.querySelector('h3') || card.querySelector('.press-static-post__source') || card.firstElementChild;
    if (insertBefore) {
      card.insertBefore(figure, insertBefore);
    } else {
      card.appendChild(figure);
    }

    card.classList.remove('press-static-post--with-illustration', 'press-static-post--with-real-image', 'press-static-post--text-only');
    card.classList.add('press-static-post--with-rail-photo');
    card.dataset.railPhotoBound = 'true';
  }

  function railPhotoAssetUrl(src) {
    const url = new URL(pressSiteAssetUrl(src), window.location.href);
    url.searchParams.set('v', RAIL_PHOTO_ASSET_VERSION);
    return url.href;
  }

  function initArticlePage() {
    if (!document.body.classList.contains('page-article')) return;

    const article = document.querySelector('.page-article .article') || document.querySelector('.page-article .article-shell');
    const body = article?.querySelector('.article-body, [data-article-body]') || document.querySelector('.article-body, [data-article-body]');
    const hero = article?.querySelector('.article-hero') || document.querySelector('.article-hero');
    if (!article || !body) return;

    const story = getCurrentStoryData(article, hero, body);
    const text = collectReadableText(body, hero);
    const context = {
      article,
      body,
      hero,
      story,
      text,
      places: detectPlaces(text, story),
      sources: collectArticleSources(article),
      beats: collectTimelineBeats(body),
      entities: detectEntities(text),
      relatedStories: readEmbeddedStories(),
      key: normalizeUrlKey(window.location.pathname || story.url || story.title),
      evidence: [],
      relationships: { nodes: [], links: [] },
    };
    numberInlineSourceRefs(context);
    hydrateRailSourceLinks(context);
    try {
      context.evidence = collectEvidenceMoments(context);
    } catch (_) {
      context.evidence = [];
    }
    try {
      context.relationships = buildRelationshipWeb(context);
    } catch (_) {
      context.relationships = { nodes: context.entities.slice(0, 9), links: [] };
    }

    activeArticleContext = context;
    installArticleDock(context);
    installSocialRailEnhancements(context);
    installArticleAtmosphere(context);
    try {
      installArticleIntelligence(context);
    } catch (_) {}
    try {
      wrapEntityMentions(context);
    } catch (_) {}

    window.PressLivingArticle = {
      openPlaceLens: () => openPlaceLens(context),
      openShareStudio: () => openShareStudio(context),
      openSourceBoard: () => openSourceBoard(context),
      openTimeline: () => openTimeline(context),
      openEntities: () => openEntityDrawer(context),
      openRelationships: () => openRelationshipWeb(context),
      context,
    };
  }

  function initHomepagePulse() {
    if (!document.body.classList.contains('page-home')) return;

    document.querySelectorAll('.press-living-home, [data-living-home-pulse]').forEach((node) => {
      node.remove();
    });
  }

  function installArticleDock(context) {
    document.querySelectorAll('[data-living-article-dock]').forEach((node) => node.remove());
    return;
    const existingDock = document.querySelector('[data-living-article-dock]');
    const dock = existingDock || document.createElement('section');
    dock.className = 'press-living-dock';
    dock.setAttribute('data-living-article-dock', '');
    dock.setAttribute('aria-label', 'Living article tools');
    dock.innerHTML = `
      <div class="press-living-dock__intro">
        <p class="press-living-kicker">Living article kit</p>
        <strong>No API. Static story, live browser tools.</strong>
      </div>
      <div class="press-living-dock__actions">
        <button type="button" data-living-open="places">Place Lens <span>${context.places.length}</span></button>
        <button type="button" data-living-open="share">Share Studio</button>
        <button type="button" data-living-open="sources">Source Board <span>${context.sources.length}</span></button>
        <button type="button" data-living-open="timeline">Timeline <span>${context.beats.length}</span></button>
        <button type="button" data-living-open="entities">Entities <span>${context.entities.length}</span></button>
        <button type="button" data-living-open="relationships">Actor Web <span>${context.relationships.links.length}</span></button>
        <button type="button" data-living-action="source-trail">Source Trail</button>
        <button type="button" data-living-action="reader-mode">Focus</button>
        <button type="button" data-living-action="follow-topic">${isFollowingTopic(context.story.section) ? 'Following' : 'Follow Topic'}</button>
      </div>
    `;

    if (!existingDock) {
      const hero = context.hero || context.article;
      const anchor = hero.querySelector('[data-article-trust-card]')
        || hero.querySelector('.hero-figure')
        || hero.querySelector('.article-meta')
        || hero.lastElementChild;

      if (anchor && anchor.parentElement) {
        anchor.insertAdjacentElement('afterend', dock);
      } else {
        hero.appendChild(dock);
      }
    }

    bindLivingControls(dock, context);
    applyStoredSourceTrailMode();
    applyStoredReaderMode();
    updateSourceTrailButton();
    updateReaderButton();
  }

  function bindLivingControls(root, context) {
    root.querySelectorAll('[data-living-open]').forEach((button) => {
      if (button.dataset.livingDirectBound === 'true') return;
      button.dataset.livingDirectBound = 'true';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = button.getAttribute('data-living-open');
        if (target === 'places') openPlaceLens(context);
        if (target === 'share') openShareStudio(context);
        if (target === 'sources') openSourceBoard(context);
        if (target === 'timeline') openTimeline(context);
        if (target === 'entities') openEntityDrawer(context);
        if (target === 'relationships') openRelationshipWeb(context);
      });
    });

    root.querySelectorAll('[data-living-action]').forEach((button) => {
      if (button.dataset.livingDirectBound === 'true') return;
      button.dataset.livingDirectBound = 'true';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleLivingAction(button.getAttribute('data-living-action'));
      });
    });
  }

  function installSocialRailEnhancements(context) {
    document.querySelectorAll('[data-living-sidecar]').forEach((node) => node.remove());
    return;
    if (document.querySelector('.press-social-feature')) return;

    const asideStack = context.article.querySelector('.article-aside .sticky-stack') || context.article.querySelector('.article-aside');
    if (!asideStack || asideStack.querySelector('[data-living-sidecar]')) return;

    const sidecar = document.createElement('section');
    sidecar.className = 'info-box press-living-sidecar';
    sidecar.setAttribute('data-living-sidecar', '');
    sidecar.innerHTML = `
      <h2>Story rail</h2>
      <p>This rail is generated from the article on this page. It does not imitate a social platform.</p>
      <div class="press-living-sidecar__actions">
        <button type="button" data-living-open="sources">Source constellation</button>
        <button type="button" data-living-open="places">Map the places</button>
        <button type="button" data-living-open="relationships">Actor web</button>
        <button type="button" data-living-open="share">Make share card</button>
      </div>
    `;
    asideStack.appendChild(sidecar);
    bindLivingControls(sidecar, context);
  }

  function installArticleAtmosphere(context) {
    let beat = document.querySelector('[data-living-current-beat]');
    if (!beat) {
      beat = document.createElement('div');
      beat.className = 'press-current-beat';
      beat.setAttribute('data-living-current-beat', '');
      document.body.appendChild(beat);
    }

    beat.innerHTML = `
      <button class="press-current-beat__button" type="button" data-living-top aria-label="Back to top">
        <span class="press-current-beat__kicker">Reading</span>
        <strong>Opening</strong>
        <em data-living-progress-text>0%</em>
        <span class="press-current-beat__top" aria-hidden="true"><b>↑</b> Top</span>
      </button>
    `;
    document.body.classList.add('has-living-current-beat');
    bindCurrentBeatTop(beat);

    let queued = false;
    const update = () => {
      queued = false;
      updateCurrentBeat(context);
    };

    pressAddScrollListener(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    });

    document.addEventListener('mouseover', (event) => {
      const ref = event.target.closest(SOURCE_NOTE_REF_SELECTOR);
      const id = sourceAnchorId(ref);
      if (!id) return;
      highlightSource(id, { soft: true });
    });

    document.addEventListener('mouseout', (event) => {
      if (!event.target.closest(SOURCE_NOTE_REF_SELECTOR)) return;
      if (Date.now() - lastSourceClickAt < 900) return;
      clearSourceHighlights();
    });

    update();
  }

  function bindCurrentBeatTop(widget) {
    const button = widget.querySelector('[data-living-top]');
    if (!button || button.dataset.livingTopBound === 'true') return;

    button.dataset.livingTopBound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      scrollLivingArticleTop();
    });
  }

  function scrollLivingArticleTop() {
    const behavior = livingPrefersReducedMotion() ? 'auto' : 'smooth';
    const roots = [
      document.scrollingElement,
      document.documentElement,
      document.body,
    ].filter(Boolean);

    roots.forEach((root) => {
      if (typeof root.scrollTo === 'function') {
        try {
          root.scrollTo({ top: 0, behavior });
        } catch (_) {
          root.scrollTop = 0;
        }
      } else {
        root.scrollTop = 0;
      }
    });

    try {
      window.scrollTo({ top: 0, behavior });
    } catch (_) {
      window.scrollTo(0, 0);
    }

    window.requestAnimationFrame(() => {
      roots.forEach((root) => {
        root.scrollTop = 0;
      });
    });
  }

  function livingPrefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function bindGlobalLivingActions() {
    document.addEventListener('click', function onLivingClick(event) {
      const topButton = event.target.closest('[data-living-top]');
      if (topButton) {
        event.preventDefault();
        scrollLivingArticleTop();
        return;
      }

      const opener = event.target.closest('[data-living-open]');
      if (opener) {
        event.preventDefault();
        const context = activeArticleContext;
        const target = opener.getAttribute('data-living-open');
        if (!context) return;
        if (target === 'places') openPlaceLens(context);
        if (target === 'share') openShareStudio(context);
        if (target === 'sources') openSourceBoard(context);
        if (target === 'timeline') openTimeline(context);
        if (target === 'entities') openEntityDrawer(context);
        if (target === 'relationships') openRelationshipWeb(context);
        return;
      }

      const number = event.target.closest('[data-living-number-chip]');
      if (number) {
        event.preventDefault();
        if (activeArticleContext) openNumberLens(activeArticleContext, number);
        return;
      }

      const close = event.target.closest('[data-living-close], [data-living-drawer-scrim]');
      if (close) {
        event.preventDefault();
        closeLivingDrawer(close.closest('[data-living-drawer]'));
        return;
      }

      const action = event.target.closest('[data-living-action]');
      if (action) {
        event.preventDefault();
        handleLivingAction(action.getAttribute('data-living-action'));
        return;
      }

      const entity = event.target.closest('[data-living-entity-id]');
      if (entity) {
        event.preventDefault();
        if (activeArticleContext) openEntityDrawer(activeArticleContext, entity.getAttribute('data-living-entity-id'));
        return;
      }

      const inlineSource = event.target.closest(SOURCE_NOTE_REF_SELECTOR);
      const inlineSourceId = sourceAnchorId(inlineSource);
      if (inlineSourceId) {
        event.preventDefault();
        if (history?.replaceState) history.replaceState(null, '', `#${inlineSourceId}`);
        lastSourceClickAt = Date.now();
        highlightSource(inlineSourceId);
        return;
      }

      const source = event.target.closest('[data-living-source-id]');
      if (source) {
        event.preventDefault();
        lastSourceClickAt = Date.now();
        highlightSource(source.getAttribute('data-living-source-id'));
        return;
      }

      const scrollTarget = event.target.closest('[data-living-scroll-target]');
      if (scrollTarget) {
        event.preventDefault();
        scrollToAnchor(scrollTarget.getAttribute('data-living-scroll-target'));
      }
    });

    document.addEventListener('keydown', function onLivingKeydown(event) {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('[data-living-drawer]:not([hidden])').forEach(closeLivingDrawer);
    });
  }

  function handleLivingAction(action) {
    const context = activeArticleContext;
    if (!context) return;

    if (action === 'reader-mode') {
      cycleReaderMode();
      return;
    }

    if (action === 'source-trail') {
      toggleSourceTrailMode();
      return;
    }

    if (action === 'follow-topic') {
      toggleFollowTopic(context.story.section);
      const button = document.querySelector('[data-living-action="follow-topic"]');
      if (button) button.textContent = isFollowingTopic(context.story.section) ? 'Following' : 'Follow Topic';
    }
  }

  function installArticleIntelligence(context) {
    installEvidenceAnnotations(context);
    installNumberChips(context);
    applyStoredSourceTrailMode();
    updateSourceTrailButton();
  }

  function collectEvidenceMoments(context) {
    const nodes = collectStoryEvidenceNodes(context.body);

    return nodes.map((node, index) => {
      const id = ensureLivingNodeId(node, 'living-evidence', index + 1);
      const text = cleanText(node.textContent || '');
      const haystack = normalizeText(text);
      const sourceIds = sourceIdsForNode(node);
      const numbers = extractNumberTokens(text);
      const places = context.places.filter((place) => place.names.some((name) => phraseInText(haystack, name))).slice(0, 3);
      const entities = context.entities.filter((entity) => entity.aliases.some((alias) => phraseInText(haystack, alias))).slice(0, 4);
      const quoted = node.matches('blockquote') || /[“”"]/.test(text);
      const score = Math.min(100,
        (sourceIds.length * 26)
        + (numbers.length * 16)
        + (places.length * 13)
        + (entities.length * 8)
        + (quoted ? 10 : 0)
        + Math.min(10, Math.round(text.length / 220))
      );
      const type = primaryEvidenceType({ sourceIds, numbers, places, entities, quoted });

      return {
        id,
        node,
        index,
        score,
        heat: Math.max(.14, Math.min(1, score / 100)),
        type,
        sourceIds,
        numbers,
        places,
        entities,
        quoted,
        summary: shorten(text, 150),
      };
    }).filter((moment) => moment.score >= 18)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .sort((a, b) => a.index - b.index);
  }

  function installEvidenceAnnotations(context) {
    if (context.body.dataset.livingEvidenceAnnotated === 'true') return;
    context.body.dataset.livingEvidenceAnnotated = 'true';

    context.evidence.forEach((moment) => {
      moment.node.classList.add('press-evidence-node');
      moment.node.setAttribute('data-living-evidence-kind', moment.type.toLowerCase());
      moment.node.style.setProperty('--evidence-heat', moment.heat.toFixed(2));

      if (moment.node.querySelector(':scope > .press-evidence-tags')) return;
      const tags = document.createElement('span');
      tags.className = 'press-evidence-tags';
      tags.setAttribute('aria-label', 'Source trail tags');
      tags.innerHTML = renderEvidenceTags(moment);
      moment.node.appendChild(tags);
    });
  }

  function installNumberChips(context) {
    if (context.body.dataset.livingNumbersWrapped === 'true') return;
    context.body.dataset.livingNumbersWrapped = 'true';

    const walker = document.createTreeWalker(context.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !NUMBER_TOKEN_PATTERN.test(node.nodeValue)) {
          NUMBER_TOKEN_PATTERN.lastIndex = 0;
          return NodeFilter.FILTER_REJECT;
        }
        NUMBER_TOKEN_PATTERN.lastIndex = 0;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('a, button, sup, script, style, .press-evidence-tags, .press-static-post, .source-list, .source-notes, .article-sources, .related-block, .share-row, [data-living-article-dock], [data-living-drawer]')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!parent.closest('p, li, blockquote')) return NodeFilter.FILTER_REJECT;
        if (parent.closest('#source-notes, .source-notes, .article-sources, .related-block, [data-living-drawer]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    const state = { total: 0, max: 24 };
    for (const node of nodes) {
      if (state.total >= state.max) break;
      wrapTextNodeWithNumbers(node, context, state);
    }
  }

  function wrapTextNodeWithNumbers(textNode, context, state) {
    const text = textNode.nodeValue;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let matched = false;
    let local = 0;
    NUMBER_TOKEN_PATTERN.lastIndex = 0;

    for (const match of text.matchAll(NUMBER_TOKEN_PATTERN)) {
      if (state.total >= state.max || local >= 2) break;
      const prefix = match[1] || '';
      const value = cleanNumberLabel(match[2]);
      if (!value || isDullNumber(value)) continue;

      const start = match.index + prefix.length;
      const end = start + match[2].length;
      if (start < cursor) continue;

      fragment.appendChild(document.createTextNode(text.slice(cursor, start)));
      fragment.appendChild(buildNumberChip(value, text, textNode.parentElement, context, state.total + 1));
      cursor = end;
      matched = true;
      local += 1;
      state.total += 1;
    }

    if (!matched) return false;
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode.replaceChild(fragment, textNode);
    return true;
  }

  function buildNumberChip(value, contextText, parent, context, index) {
    const owner = parent?.closest('p, li, blockquote') || parent;
    const id = ensureLivingNodeId(owner, 'living-number', index);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'press-number-chip';
    chip.setAttribute('data-living-number-chip', '');
    chip.setAttribute('data-living-number', value);
    chip.setAttribute('data-living-number-kind', numberKind(value, contextText));
    chip.setAttribute('data-living-number-context', shorten(contextText, 190));
    chip.setAttribute('data-living-number-node', id);
    chip.setAttribute('aria-label', `Open number lens for ${value}`);
    chip.textContent = value;
    return chip;
  }

  function openRelationshipWeb(context) {
    const web = context.relationships?.nodes?.length ? context.relationships : buildRelationshipWeb(context);
    const body = web.nodes.length ? renderRelationshipWeb(web) : `
      <div class="press-empty-state">
        <h3>No actor web yet</h3>
        <p>Add more entity names to the article or the local entity library and this panel will draw relationships from paragraph proximity.</p>
      </div>
    `;

    openLivingDrawer('relationships', 'Actor Relationship Web', 'A static relationship map built from entities that appear near each other in this article.', body);
  }

  function openNumberLens(context, chip) {
    const value = chip.getAttribute('data-living-number') || chip.textContent || '';
    const kind = chip.getAttribute('data-living-number-kind') || 'Signal';
    const nodeId = chip.getAttribute('data-living-number-node') || '';
    const node = nodeId ? document.getElementById(nodeId) : null;
    const sourceIds = node ? sourceIdsForNode(node) : [];
    const nearby = cleanText(chip.getAttribute('data-living-number-context') || node?.textContent || '');
    const body = `
      <div class="press-number-lens">
        <article>
          <p class="press-living-kicker">${escapeHtml(kind)}</p>
          <h3>${escapeHtml(value)}</h3>
          <p>${escapeHtml(numberMeaning(value, kind, nearby))}</p>
        </article>
        <section>
          <h4>Where it appears</h4>
          <p>${escapeHtml(shorten(nearby, 260))}</p>
          <div class="press-number-lens__actions">
            ${nodeId ? `<button type="button" data-living-scroll-target="${escapeAttr(nodeId)}">Jump to paragraph</button>` : ''}
            ${sourceIds.length ? `<button type="button" data-living-source-id="${escapeAttr(sourceIds[0])}">${sourceIds.length === 1 ? 'Open source' : `${sourceIds.length} sources nearby`}</button>` : ''}
          </div>
        </section>
      </div>
    `;

    const drawer = openLivingDrawer('number', 'Number Lens', 'A local stat explainer generated from the sentence around the number.', body);
    drawer.querySelectorAll('[data-living-source-id]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        highlightSource(button.getAttribute('data-living-source-id'));
      });
    });
  }

  function buildRelationshipWeb(context) {
    const nodes = context.entities.slice(0, 9);
    const nodeById = new Map(nodes.map((entity) => [entity.id, entity]));
    const links = new Map();

    collectStoryEvidenceNodes(context.body).forEach((node, index) => {
      const id = ensureLivingNodeId(node, 'living-relationship', index + 1);
      const haystack = normalizeText(node.textContent || '');
      const present = nodes.filter((entity) => entity.aliases.some((alias) => phraseInText(haystack, alias))).slice(0, 5);
      for (let i = 0; i < present.length; i += 1) {
        for (let j = i + 1; j < present.length; j += 1) {
          const pair = [present[i].id, present[j].id].sort();
          const key = pair.join('|');
          const link = links.get(key) || {
            a: nodeById.get(pair[0]),
            b: nodeById.get(pair[1]),
            count: 0,
            ids: [],
            summary: '',
          };
          link.count += 1;
          link.ids.push(id);
          if (!link.summary) link.summary = shorten(cleanText(node.textContent), 155);
          links.set(key, link);
        }
      }
    });

    if (!links.size && nodes.length > 1) {
      nodes.slice(1).forEach((entity, index) => {
        const previous = nodes[index];
        links.set([previous.id, entity.id].sort().join('|'), {
          a: previous,
          b: entity,
          count: 1,
          ids: [],
          summary: 'These actors share the same article frame, even if they do not appear in the same paragraph.',
        });
      });
    }

    return {
      nodes,
      links: Array.from(links.values())
        .filter((link) => link.a && link.b)
        .sort((a, b) => b.count - a.count || a.a.name.localeCompare(b.a.name))
        .slice(0, 12),
    };
  }

  function renderRelationshipWeb(web) {
    const positions = relationshipPositions(web.nodes.length);
    return `
      <div class="press-relationship-web">
        <div class="press-relationship-map" aria-label="Actor relationship map">
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${web.links.map((link) => {
              const a = positions[web.nodes.findIndex((node) => node.id === link.a.id)];
              const b = positions[web.nodes.findIndex((node) => node.id === link.b.id)];
              if (!a || !b) return '';
              const strength = Math.min(1, .25 + link.count * .18);
              return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" style="--line-opacity:${strength.toFixed(2)};--stroke-width:${(.6 + (2 * strength)).toFixed(2)}px"></line>`;
            }).join('')}
          </svg>
          ${web.nodes.map((entity, index) => `
            <button type="button" class="press-relationship-node" data-living-entity-id="${escapeAttr(entity.id)}" style="--x:${positions[index].x}%;--y:${positions[index].y}%">
              <span>${escapeHtml(entity.type)}</span>
              <strong>${escapeHtml(entity.name)}</strong>
            </button>
          `).join('')}
        </div>
        <div class="press-relationship-links">
          ${web.links.map((link) => `
            <article>
              <p class="press-living-kicker">${escapeHtml(link.count > 1 ? `${link.count} shared beats` : 'Shared beat')}</p>
              <h3>${escapeHtml(link.a.name)} &harr; ${escapeHtml(link.b.name)}</h3>
              <p>${escapeHtml(link.summary)}</p>
              ${link.ids[0] ? `<button type="button" data-living-scroll-target="${escapeAttr(link.ids[0])}">Jump to evidence</button>` : ''}
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function collectStoryEvidenceNodes(body) {
    return Array.from(body.querySelectorAll('p, li, blockquote')).filter((node) => {
      if (node.closest('#source-notes, .source-notes, .article-sources, .related-block, [data-living-drawer], [data-living-article-dock]')) return false;
      const text = cleanText(node.textContent || '');
      return text.length >= 55;
    });
  }

  function sourceIdsForNode(node) {
    return Array.from(node.querySelectorAll('.source-ref a[href^="#"], a.source-label[href^="#"]'))
      .map((link) => (link.getAttribute('href') || '').replace(/^#/, ''))
      .filter(Boolean);
  }

  function ensureLivingNodeId(node, prefix, index = 1) {
    if (!node) return `${prefix}-${index}`;
    if (node.id) return node.id;

    const base = `${prefix}-${index}`;
    let candidate = base;
    let attempt = 2;
    while (document.getElementById(candidate)) {
      candidate = `${base}-${attempt}`;
      attempt += 1;
    }
    node.id = candidate;
    return candidate;
  }

  function extractNumberTokens(text) {
    const values = [];
    NUMBER_TOKEN_PATTERN.lastIndex = 0;
    for (const match of String(text || '').matchAll(NUMBER_TOKEN_PATTERN)) {
      const value = cleanNumberLabel(match[2]);
      if (value && !isDullNumber(value) && !values.includes(value)) values.push(value);
    }
    NUMBER_TOKEN_PATTERN.lastIndex = 0;
    return values.slice(0, 4);
  }

  function renderEvidenceTags(moment) {
    const tags = [];
    if (moment.sourceIds.length) tags.push(`<button type="button" data-living-source-id="${escapeAttr(moment.sourceIds[0])}">${moment.sourceIds.length} source${moment.sourceIds.length === 1 ? '' : 's'}</button>`);
    if (moment.numbers.length) tags.push(`<button type="button" data-living-scroll-target="${escapeAttr(moment.id)}">${moment.numbers.length} stat${moment.numbers.length === 1 ? '' : 's'}</button>`);
    if (moment.places.length) tags.push(`<button type="button" data-living-open="places">${moment.places.length} place${moment.places.length === 1 ? '' : 's'}</button>`);
    if (moment.entities.length) tags.push(`<button type="button" data-living-open="relationships">${moment.entities.length} actor${moment.entities.length === 1 ? '' : 's'}</button>`);
    if (moment.quoted) tags.push(`<button type="button" data-living-scroll-target="${escapeAttr(moment.id)}">context</button>`);
    return tags.join('');
  }

  function primaryEvidenceType(moment) {
    if (moment.sourceIds.length && moment.numbers.length) return 'Proof';
    if (moment.sourceIds.length) return 'Sources';
    if (moment.numbers.length) return 'Data';
    if (moment.places.length) return 'Places';
    if (moment.entities.length >= 2) return 'Actors';
    if (moment.quoted) return 'Context';
    return 'Signal';
  }

  function relationshipPositions(count) {
    const total = Math.max(1, count);
    return Array.from({ length: total }, (_, index) => {
      const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
      return {
        x: Number((50 + Math.cos(angle) * 37).toFixed(2)),
        y: Number((50 + Math.sin(angle) * 34).toFixed(2)),
      };
    });
  }

  function cleanNumberLabel(value) {
    return cleanText(value).replace(/\s+%/g, '%').replace(/\s+/g, ' ');
  }

  function isDullNumber(value) {
    const text = cleanText(value);
    if (!text) return true;
    if (/^\d{4}$/.test(text)) return true;
    if (/^\d{1,2}$/.test(text) && !/%|[$€£]|percent|million|billion|trillion|barrel|ship|vessel|tank|crew|people|famil|child|export|import|capacity|per day/i.test(text)) return true;
    return false;
  }

  function numberKind(value, contextText) {
    const text = `${value} ${contextText}`.toLowerCase();
    if (/[$€£]|price|cost|barrel|premium|bill/.test(text)) return 'Price signal';
    if (/%|percent|share|exports|imports/.test(text)) return 'Share';
    if (/barrel|tanker|vessel|ship|crew|per day/.test(text)) return 'Flow';
    if (/million|billion|trillion|people|famil|children/.test(text)) return 'Scale';
    if (/capacity|gigawatt|megawatt|kilometer|mile|ton/.test(text)) return 'Capacity';
    return 'Stat';
  }

  function numberMeaning(value, kind, nearby) {
    const lower = `${value} ${nearby}`.toLowerCase();
    if (kind === 'Price signal') return 'This number turns the story into a household or market signal: it shows where a geopolitical or institutional pressure becomes cost.';
    if (kind === 'Share') return 'This share tells you how much of a larger system depends on the fact in this sentence, which is why the paragraph carries extra weight.';
    if (kind === 'Flow') return 'This is a movement number: ships, energy, cargo, or capacity. Flow numbers are where the article becomes logistical instead of abstract.';
    if (kind === 'Scale') return 'This number establishes scale. It helps separate a vivid anecdote from a system large enough to change outcomes.';
    if (kind === 'Capacity') return 'This is a constraint number. It shows how much room the system has before pressure starts showing up somewhere else.';
    if (/days|weeks|months/.test(lower)) return 'This number is a clock. It tells you how long the story can stay unstable before the next consequence arrives.';
    return 'This stat is treated as a signal inside the article: tap back to the paragraph to see what claim it supports.';
  }

  function openPlaceLens(context) {
    const places = context.places;
    const first = places[0];
    const body = places.length ? `
      <div class="press-place-lens">
        <div class="press-place-lens__map">
          <iframe title="OpenStreetMap preview for ${escapeAttr(first.label)}" src="${escapeAttr(osmEmbedUrl(first))}" loading="lazy"></iframe>
        </div>
        <div class="press-place-lens__cards">
          ${places.map(renderPlaceCard).join('')}
        </div>
      </div>
    ` : `
      <div class="press-empty-state">
        <h3>No mapped places found yet</h3>
        <p>This article did not match the local place dictionary. Add a place name and coordinates to the static library to make this lens light up.</p>
      </div>
    `;

    openLivingDrawer('places', 'Place Lens', 'Mapped places mentioned by the article, with no key or API call.', body);
  }

  function openShareStudio(context) {
    const caption = buildShareCaption(context.story);
    const body = `
      <div class="press-share-studio">
        <div class="press-share-studio__canvas-wrap">
          <canvas width="1080" height="1080" data-living-share-canvas></canvas>
        </div>
        <div class="press-share-studio__controls">
          <div class="press-share-studio__formats" role="group" aria-label="Share card format">
            <button type="button" class="is-active" data-share-format="square">Square</button>
            <button type="button" data-share-format="story">Story</button>
            <button type="button" data-share-format="quote">Quote</button>
          </div>
          <label class="press-share-studio__caption">
            Caption
            <textarea data-share-caption rows="8">${escapeHtml(caption)}</textarea>
          </label>
          <div class="press-share-studio__buttons">
            <button type="button" data-share-copy>Copy caption</button>
            <button type="button" data-share-download>Download PNG</button>
          </div>
          <p class="press-share-studio__note">Generated in your browser from local article data. No network rendering service.</p>
        </div>
      </div>
    `;

    const drawer = openLivingDrawer('share', 'Article Share Studio', 'Generate square, story, and quote cards locally in the browser.', body);
    bindShareStudio(context, drawer);
  }

  function openSourceBoard(context) {
    const clusters = clusterSources(context.sources);
    const body = context.sources.length ? `
      <div class="press-source-constellation">
        <div class="press-source-constellation__summary">
          ${SOURCE_CLUSTER_ORDER.filter((name) => clusters[name]?.length).map((name) => `
            <div>
              <span>${escapeHtml(name)}</span>
              <strong>${clusters[name].length}</strong>
            </div>
          `).join('')}
        </div>
        <div class="press-source-constellation__grid">
          ${SOURCE_CLUSTER_ORDER.filter((name) => clusters[name]?.length).map((name) => `
            <section>
              <h3>${escapeHtml(name)}</h3>
              <div class="press-source-constellation__items">
                ${clusters[name].map(renderSourceButton).join('')}
              </div>
            </section>
          `).join('')}
        </div>
      </div>
    ` : `
      <div class="press-empty-state">
        <h3>No source notes found</h3>
        <p>The source board appears once the story has a source list or source notes.</p>
      </div>
    `;

    const drawer = openLivingDrawer('sources', 'Source Constellation', 'A local evidence board grouped from the article source notes.', body);
    drawer.querySelectorAll('[data-living-source-id]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        highlightSource(button.getAttribute('data-living-source-id'));
      });
    });
  }

  function openTimeline(context) {
    const body = context.beats.length ? `
      <div class="press-story-timeline">
        ${context.beats.map((beat, index) => `
          <button type="button" data-living-scroll-target="${escapeAttr(beat.id)}">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <strong>${escapeHtml(beat.title)}</strong>
            <em>${escapeHtml(beat.summary)}</em>
          </button>
        `).join('')}
      </div>
    ` : `
      <div class="press-empty-state">
        <h3>No timeline beats yet</h3>
        <p>Add article section headings and this timeline will turn them into a navigable story path.</p>
      </div>
    `;

    const drawer = openLivingDrawer('timeline', 'Story Timeline', 'A scrollable beat map generated from this article.', body);
    drawer.querySelectorAll('[data-living-scroll-target]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToAnchor(button.getAttribute('data-living-scroll-target'));
      });
    });
  }

  function openEntityDrawer(context, activeId = '') {
    const body = context.entities.length ? `
      <div class="press-entity-board">
        ${context.entities.map((entity) => {
          const related = relatedStoriesForEntity(entity, context.relatedStories, context.story.url);
          return `
            <article class="press-entity-card${entity.id === activeId ? ' is-active' : ''}" id="entity-card-${escapeAttr(entity.id)}">
              <p class="press-living-kicker">${escapeHtml(entity.type)}</p>
              <h3>${escapeHtml(entity.name)}</h3>
              <p>${escapeHtml(entity.summary)}</p>
              <strong>Why it matters here</strong>
              <p>${escapeHtml(entity.why)}</p>
              ${related.length ? `<div class="press-entity-card__related">${related.map((story) => `<a href="${escapeAttr(story.url)}">${escapeHtml(story.title)}</a>`).join('')}</div>` : ''}
            </article>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="press-empty-state">
        <h3>No entity cards matched</h3>
        <p>Add names to the local entity library and they will appear here with inline article chips.</p>
      </div>
    `;

    const drawer = openLivingDrawer('entities', 'Entity Cards', 'People, places, companies, institutions, and ideas detected from the article.', body);
    if (activeId) {
      const card = drawer.querySelector(`#entity-card-${cssEscape(activeId)}`);
      if (card) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function openLivingDrawer(id, title, intro, content) {
    let drawer = document.querySelector(`[data-living-drawer="${id}"]`);
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'press-living-drawer';
      drawer.setAttribute('data-living-drawer', id);
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.hidden = true;
      drawer.innerHTML = `
        <button class="press-living-drawer__scrim" type="button" data-living-drawer-scrim aria-label="Close panel"></button>
        <div class="press-living-drawer__panel" role="document">
          <div class="press-living-drawer__header">
            <div>
              <p class="press-living-kicker" data-living-drawer-kicker>Living article</p>
              <h2 data-living-drawer-title></h2>
              <p data-living-drawer-intro></p>
            </div>
            <button class="press-living-drawer__close" type="button" data-living-close>Close</button>
          </div>
          <div class="press-living-drawer__body" data-living-drawer-body></div>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    drawer.querySelector('[data-living-drawer-title]').textContent = title;
    drawer.querySelector('[data-living-drawer-intro]').textContent = intro;
    drawer.querySelector('[data-living-drawer-body]').innerHTML = content;
    drawer.querySelectorAll('[data-living-close], [data-living-drawer-scrim]').forEach((button) => {
      if (button.dataset.livingCloseBound === 'true') return;
      button.dataset.livingCloseBound = 'true';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        closeLivingDrawer(drawer);
      });
    });

    lastFocusedElement = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('press-living-drawer-open');
    drawer.querySelector('[data-living-close]')?.focus({ preventScroll: true });
    return drawer;
  }

  function closeLivingDrawer(drawer) {
    if (!drawer) return;
    drawer.hidden = true;
    document.documentElement.classList.remove('press-living-drawer-open');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function bindShareStudio(context, drawer) {
    const canvas = drawer.querySelector('[data-living-share-canvas]');
    const caption = drawer.querySelector('[data-share-caption]');
    let currentFormat = 'square';

    drawShareCanvas(context, canvas, currentFormat);

    drawer.querySelectorAll('[data-share-format]').forEach((button) => {
      button.addEventListener('click', () => {
        currentFormat = button.getAttribute('data-share-format') || 'square';
        drawer.querySelectorAll('[data-share-format]').forEach((item) => item.classList.toggle('is-active', item === button));
        drawShareCanvas(context, canvas, currentFormat);
      });
    });

    drawer.querySelector('[data-share-copy]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      try {
        await navigator.clipboard.writeText(caption.value);
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = 'Copy caption'; }, 1500);
      } catch (_) {
        caption.focus();
        caption.select();
        let copied = false;
        try {
          copied = document.execCommand && document.execCommand('copy');
        } catch (__) {
          copied = false;
        }
        button.textContent = copied ? 'Copied' : 'Caption selected';
        window.setTimeout(() => { button.textContent = 'Copy caption'; }, 1800);
      }
    });

    drawer.querySelector('[data-share-download]')?.addEventListener('click', () => {
      const filename = `${slugify(context.story.title || 'the-press-card')}-${currentFormat}.png`;
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          triggerDownload(url, filename);
          window.setTimeout(() => URL.revokeObjectURL(url), 2500);
        }, 'image/png');
      } else {
        triggerDownload(canvas.toDataURL('image/png'), filename);
      }
    });
  }

  async function drawShareCanvas(context, canvas, format) {
    if (!canvas) return;

    const story = context.story;
    const isStory = format === 'story';
    const isQuote = format === 'quote';
    const width = 1080;
    const height = isStory ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const accent = sectionAccent(story.section);
    const ink = '#1d232d';
    const paper = '#f7f1e5';

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);
    drawCardPattern(ctx, width, height, accent);

    const imageSrc = story.image || context.hero?.querySelector('img')?.getAttribute('src') || '';
    if (imageSrc && !isQuote) {
      try {
        const img = await loadImage(new URL(imageSrc, window.location.href).href);
        const imageHeight = isStory ? 760 : 430;
        drawImageCover(ctx, img, 0, 0, width, imageHeight);
        ctx.fillStyle = 'rgba(0,0,0,.34)';
        ctx.fillRect(0, 0, width, imageHeight);
      } catch (_) {
        drawImageFallback(ctx, width, isStory ? 760 : 430, accent);
      }
    }

    const margin = 86;
    const top = isQuote ? 112 : (isStory ? 835 : 500);
    ctx.fillStyle = isQuote ? accent : '#ffffff';
    ctx.font = '900 34px Arial, sans-serif';
    ctx.letterSpacing = '0px';
    ctx.fillText('THE PRESS', margin, isQuote ? 82 : 68);

    ctx.fillStyle = isQuote ? '#596273' : '#f7f1e5';
    ctx.font = '700 30px Arial, sans-serif';
    ctx.fillText(String(story.section || 'News').toUpperCase(), margin, top);

    if (isQuote) {
      const quote = bestQuote(context);
      ctx.fillStyle = ink;
      ctx.font = '900 72px Georgia, serif';
      wrapCanvasText(ctx, quote, margin, 240, width - margin * 2, 84, 8);
      ctx.fillStyle = '#667085';
      ctx.font = '700 30px Arial, sans-serif';
      wrapCanvasText(ctx, story.title, margin, height - 210, width - margin * 2, 38, 3);
    } else {
      ctx.fillStyle = ink;
      ctx.font = isStory ? '900 86px Georgia, serif' : '900 64px Georgia, serif';
      const titleBottom = wrapCanvasText(ctx, story.title, margin, top + 86, width - margin * 2, isStory ? 96 : 74, isStory ? 8 : 5);
      ctx.fillStyle = '#4f5a69';
      ctx.font = isStory ? '400 38px Georgia, serif' : '400 31px Georgia, serif';
      wrapCanvasText(ctx, story.dek || '', margin, titleBottom + 42, width - margin * 2, isStory ? 52 : 43, isStory ? 6 : 4);
    }

    ctx.fillStyle = accent;
    ctx.fillRect(margin, height - 138, 156, 8);
    ctx.fillStyle = '#3a4250';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText('thepress.live', margin, height - 82);
    ctx.textAlign = 'right';
    ctx.fillText(shorten(story.published || story.readTime || 'Static edition', 42), width - margin, height - 82);
    ctx.textAlign = 'left';
  }

  function drawCardPattern(ctx, width, height, accent) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(width - 140, 170, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#24706d';
    ctx.fillRect(0, height - 220, width, 220);
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#1d232d';
    ctx.lineWidth = 3;
    for (let x = -200; x < width + 300; x += 86) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 420, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawImageFallback(ctx, width, height, accent) {
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, '#25314a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(80, 80, width - 160, height - 160);
    ctx.restore();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawImageCover(ctx, img, x, y, width, height) {
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '';
    let lines = 0;
    let cursor = y;

    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        if (lines < maxLines) ctx.fillText(line, x, cursor);
        cursor += lineHeight;
        lines += 1;
        line = word;
      } else {
        line = test;
      }
    });

    if (line && lines < maxLines) {
      ctx.fillText(lines === maxLines - 1 && words.length ? shorten(line, 62) : line, x, cursor);
      cursor += lineHeight;
    }

    return cursor;
  }

  function detectPlaces(text, story) {
    const storyText = story.matchedCurrentStory ? `${story.title} ${story.dek} ${(story.keywords || []).join(' ')}` : `${story.title} ${story.dek}`;
    const haystack = normalizeText(`${storyText} ${text}`);
    const seen = new Set();
    return PLACE_LIBRARY.filter((place) => {
      if (seen.has(place.id)) return false;
      const matched = place.names.some((name) => phraseInText(haystack, name));
      if (matched) seen.add(place.id);
      return matched;
    }).slice(0, 8);
  }

  function detectEntities(text) {
    const haystack = normalizeText(text);
    return ENTITY_LIBRARY.filter((entity) => entity.aliases.some((alias) => phraseInText(haystack, alias))).slice(0, 14);
  }

  function wrapEntityMentions(context) {
    if (!context.entities.length || context.body.dataset.livingEntitiesWrapped === 'true') return;
    context.body.dataset.livingEntitiesWrapped = 'true';

    const entityByAlias = [];
    context.entities.forEach((entity) => {
      entity.aliases.forEach((alias) => {
        entityByAlias.push({ entity, alias });
      });
    });
    entityByAlias.sort((a, b) => b.alias.length - a.alias.length);

    const counts = new Map();
    let total = 0;
    const nodes = [];
    const walker = document.createTreeWalker(context.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('a, button, sup, script, style, .press-static-post, .source-list, .source-notes, .article-sources, .related-block, .share-row, [data-living-article-dock], [data-living-drawer]')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!parent.closest('p, li, blockquote')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      if (total >= 18) break;
      for (const item of entityByAlias) {
        if ((counts.get(item.entity.id) || 0) >= 2) continue;
        if (wrapTextNodeWithEntity(node, item.entity, item.alias)) {
          counts.set(item.entity.id, (counts.get(item.entity.id) || 0) + 1);
          total += 1;
          break;
        }
      }
    }
  }

  function wrapTextNodeWithEntity(textNode, entity, alias) {
    const text = textNode.nodeValue;
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(alias)})(?=$|[^A-Za-z0-9])`, 'i');
    const match = text.match(pattern);
    if (!match) return false;

    const start = match.index + match[1].length;
    const end = start + match[2].length;
    const fragment = document.createDocumentFragment();
    const before = text.slice(0, start);
    const exact = text.slice(start, end);
    const after = text.slice(end);

    if (before) fragment.appendChild(document.createTextNode(before));
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'press-entity-chip';
    chip.setAttribute('data-living-entity-id', entity.id);
    chip.setAttribute('aria-label', `Open entity card for ${entity.name}`);
    chip.textContent = exact;
    fragment.appendChild(chip);
    if (after) fragment.appendChild(document.createTextNode(after));

    textNode.parentNode.replaceChild(fragment, textNode);
    return true;
  }

  function collectArticleSources(article) {
    const selectors = [
      '#source-notes .source-list li',
      '#source-notes li',
      '.article-sources li',
      '.source-notes li',
      '.source-list li',
    ];
    const seenNodes = new Set();
    const seenKeys = new Set();
    const sources = [];

    selectors.forEach((selector) => {
      article.querySelectorAll(selector).forEach((item) => {
        if (seenNodes.has(item)) return;
        seenNodes.add(item);

        const text = cleanText(item.textContent);
        if (!text) return;
        const link = Array.from(item.querySelectorAll('a[href]')).find((candidate) => /^https?:\/\//i.test(candidate.getAttribute('href') || '')) || item.querySelector('a[href]');
        const href = link?.getAttribute('href') || '';
        const key = `${href}|${text}`.toLowerCase();
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        if (!item.id) item.id = `source-${sources.length + 1}`;
        const label = cleanText(link?.textContent || item.querySelector('strong')?.textContent || `Source ${sources.length + 1}`);
        sources.push({
          id: item.id,
          label,
          detail: cleanText(text.replace(label, '').replace(/^[,.:;\-\s]+/, '')),
          href,
          host: hostnameFromUrl(href),
          cluster: clusterSource({ href, label, detail: text }),
        });
      });
    });

    return sources;
  }

  function numberInlineSourceRefs(context) {
    if (!context?.body || !context.sources?.length) return;
    const sourceNumbers = new Map();
    context.sources.forEach((source, index) => {
      sourceNumbers.set(source.id, {
        label: source.label,
        number: index + 1,
      });
    });

    context.body.querySelectorAll('.source-ref a[href^="#source"]').forEach((link) => {
      const id = (link.getAttribute('href') || '').slice(1);
      const source = sourceNumbers.get(id);
      if (!source) return;
      link.textContent = `[${source.number}]`;
      link.dataset.sourceNumber = String(source.number);
      link.setAttribute('aria-label', `Source ${source.number}: ${source.label || 'source note'}`);
      link.title = `Source ${source.number}${source.label ? `: ${source.label}` : ''}`;
    });
  }

  function hydrateRailSourceLinks(context) {
    if (!context?.body || !context.sources?.length) return;
    const sourcesById = new Map();
    context.sources.forEach((source) => {
      if (!source?.href || !/^https?:\/\//i.test(source.href)) return;
      sourcesById.set(source.id, source);
      sourcesById.set(source.id.replace(/^source-/, ''), source);
    });

    context.body.querySelectorAll('.press-static-post__source a[data-source-id], .press-static-post__source a[href^="#source-"]').forEach((link) => {
      const sourceKey = link.getAttribute('data-source-id') || (link.getAttribute('href') || '').replace(/^#/, '');
      const source = sourcesById.get(sourceKey) || sourcesById.get(`source-${sourceKey}`);
      if (!source?.href) return;
      link.setAttribute('href', source.href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('data-source-external', 'true');
      link.setAttribute('aria-label', `Open external source: ${source.label || cleanText(link.textContent) || 'source'}`);
      link.title = source.label ? `Open ${source.label}` : 'Open external source';
    });
  }

  function collectTimelineBeats(body) {
    const headings = Array.from(body.querySelectorAll('h2, h3')).filter((heading) => {
      if (heading.closest('#source-notes, .source-notes, .article-sources, .related-block, [data-living-drawer]')) return false;
      return cleanText(heading.textContent).length > 2;
    });

    if (!headings.length) {
      return Array.from(body.querySelectorAll('p')).slice(0, 5).map((paragraph, index) => {
        if (!paragraph.id) paragraph.id = `living-beat-${index + 1}`;
        return {
          id: paragraph.id,
          node: paragraph,
          title: index === 0 ? 'Opening' : `Beat ${index + 1}`,
          summary: shorten(cleanText(paragraph.textContent), 135),
        };
      });
    }

    return headings.slice(0, 12).map((heading, index) => {
      if (!heading.id) heading.id = `living-beat-${index + 1}`;
      return {
        id: heading.id,
        node: heading,
        title: cleanText(heading.textContent),
        summary: shorten(cleanText(findNextParagraphText(heading)), 145),
      };
    });
  }

  function findNextParagraphText(heading) {
    let node = heading.nextElementSibling;
    while (node && !/^H[23]$/i.test(node.tagName || '')) {
      if (node.matches?.('p, blockquote, li')) return node.textContent || '';
      node = node.nextElementSibling;
    }
    return '';
  }

  function clusterSources(sources) {
    return sources.reduce((clusters, source) => {
      const cluster = source.cluster || 'Background';
      if (!clusters[cluster]) clusters[cluster] = [];
      clusters[cluster].push(source);
      return clusters;
    }, {});
  }

  function clusterSource(source) {
    const text = `${source.label || ''} ${source.detail || ''}`.toLowerCase();
    const host = hostnameFromUrl(source.href);
    if (/instagram|tiktok|x\.com|twitter|youtube|threads|facebook/.test(host)) return 'Social';
    if (/court|law|docket|supreme|justice|legal/.test(host + ' ' + text)) return 'Legal';
    if (/\.gov$|nasa\.gov|cdc\.gov|census\.gov|bls\.gov|bea\.gov|noaa\.gov|nih\.gov|imf\.org|worldbank\.org|oecd\.org/.test(host)) return 'Public Data';
    if (/michelin|infatuation|timeout|resy|opentable|50best|traveler|thrillist|grubstreet|guide|review/.test(host + ' ' + text)) return 'Guide';
    if (/official|whitehouse|nato\.int|espn|wsop|casamata|eatatla|company|pressroom/.test(host + ' ' + text)) return 'Official';
    if (/eater|reuters|apnews|latimes|nytimes|washingtonpost|guardian|whatnow|gothamist|bonappetit|newyorker|wired|verge|pokernews|reviewjournal/.test(host)) return 'Reporting';
    if (/map|place|neighborhood|location|address|venue/.test(text)) return 'Place';
    return 'Background';
  }

  function renderPlaceCard(place) {
    return `
      <article class="press-place-card">
        <p class="press-living-kicker">${escapeHtml(place.type)}</p>
        <h3>${escapeHtml(place.label)}</h3>
        <p>${escapeHtml(place.scene)}</p>
        <dl>
          <div><dt>Address</dt><dd>${escapeHtml(place.address)}</dd></div>
          <div><dt>Why here</dt><dd>${escapeHtml(place.note)}</dd></div>
        </dl>
        <div class="press-place-card__links">
          <a href="${escapeAttr(googleMapsUrl(place))}" rel="noopener noreferrer" target="_blank">Map</a>
          <a href="${escapeAttr(streetViewUrl(place))}" rel="noopener noreferrer" target="_blank">Street View</a>
          <a href="${escapeAttr(osmUrl(place))}" rel="noopener noreferrer" target="_blank">OpenStreetMap</a>
        </div>
      </article>
    `;
  }

  function renderSourceButton(source) {
    return `
      <button type="button" data-living-source-id="${escapeAttr(source.id)}">
        <span>${escapeHtml(source.host || source.cluster || 'source')}</span>
        <strong>${escapeHtml(shorten(source.label, 78))}</strong>
        ${source.detail ? `<em>${escapeHtml(shorten(source.detail, 110))}</em>` : ''}
      </button>
    `;
  }

  function renderSectionBar(item) {
    const percent = Math.max(8, Math.min(100, item.count * 8));
    return `
      <a href="${escapeAttr(sectionHref(item.section))}">
        <span>${escapeHtml(item.section)}</span>
        <strong>${item.count}</strong>
        <em style="--bar:${percent}%"></em>
      </a>
    `;
  }

  function highlightSource(id, options = {}) {
    clearSourceHighlights();
    if (!id) return;
    const source = document.getElementById(id);
    const sourceKey = id.replace(/^source-/, '');
    const refs = document.querySelectorAll(`.source-ref a[href="#${cssEscape(id)}"], a.source-label[href="#${cssEscape(id)}"], a[data-source-id="${cssEscape(sourceKey)}"], a[data-source-id="${cssEscape(id)}"]`);
    source?.classList.add('is-living-source-highlight');
    refs.forEach((ref) => ref.classList.add('is-living-source-highlight'));
    if (source && !options.soft) {
      source.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(clearSourceHighlights, 3600);
    }
  }

  function sourceAnchorId(link) {
    if (!link) return '';
    if (link.matches?.('[data-source-external="true"]')) return '';
    const href = link.getAttribute('href') || '';
    if (href.startsWith('#source')) return href.slice(1);
    if (/^https?:\/\//i.test(href)) return '';
    const sourceId = link.getAttribute('data-source-id') || '';
    if (!sourceId) return '';
    return sourceId.startsWith('source-') ? sourceId : `source-${sourceId}`;
  }

  function clearSourceHighlights() {
    document.querySelectorAll('.is-living-source-highlight').forEach((node) => node.classList.remove('is-living-source-highlight'));
  }

  function updateCurrentBeat(context) {
    const widget = document.querySelector('[data-living-current-beat]');
    if (!widget) return;
    const active = currentBeat(context);
    const progress = buildProgressSnapshot(context, active);
    const title = active?.title || 'Reading';
    const percent = Math.round(progress?.progress || 0);
    widget.querySelector('strong').textContent = title;
    widget.querySelector('em').textContent = `${percent}%`;
    widget.querySelector('[data-living-top]')?.setAttribute('aria-label', `Back to top. ${percent}% read. Current section: ${title}.`);
  }

  function currentBeat(context) {
    const offset = 140;
    let active = context.beats[0] || null;
    context.beats.forEach((beat) => {
      const node = beat.node || document.getElementById(beat.id);
      if (node && node.getBoundingClientRect().top <= offset) active = beat;
    });
    return active;
  }

  function buildProgressSnapshot(context, beat = currentBeat(context)) {
    const rect = context.article.getBoundingClientRect();
    const scrollY = pressPageScrollTop();
    const articleTop = scrollY + rect.top;
    const articleHeight = Math.max(1, context.article.scrollHeight - window.innerHeight * 0.65);
    const progress = Math.max(0, Math.min(100, ((scrollY - articleTop) / articleHeight) * 100));
    return {
      key: context.key,
      title: context.story.title,
      section: context.story.section,
      url: normalizeArticleUrl(context.story.url || window.location.pathname),
      image: context.story.image,
      progress,
      anchor: beat?.id || '',
      updatedAt: Date.now(),
    };
  }

  function cycleReaderMode() {
    const modes = ['standard', 'focus', 'wide'];
    const current = document.documentElement.getAttribute('data-living-reader') || 'standard';
    const next = modes[(modes.indexOf(current) + 1) % modes.length] || 'standard';
    setReaderMode(next);
    updateReaderButton();
  }

  function applyStoredReaderMode() {
    try {
      setReaderMode(localStorage.getItem(STORAGE.readerMode) || 'standard');
    } catch (_) {
      setReaderMode('standard');
    }
  }

  function setReaderMode(mode) {
    document.documentElement.setAttribute('data-living-reader', mode);
    try {
      localStorage.setItem(STORAGE.readerMode, mode);
    } catch (_) {}
  }

  function updateReaderButton() {
    const button = document.querySelector('[data-living-action="reader-mode"]');
    if (!button) return;
    const mode = document.documentElement.getAttribute('data-living-reader') || 'standard';
    button.textContent = mode === 'focus' ? 'Wide' : mode === 'wide' ? 'Standard' : 'Focus';
  }

  function applyStoredSourceTrailMode() {
    try {
      setSourceTrailMode(localStorage.getItem(STORAGE.sourceTrail) === 'on');
    } catch (_) {
      setSourceTrailMode(false);
    }
  }

  function toggleSourceTrailMode() {
    setSourceTrailMode(document.documentElement.getAttribute('data-living-source-trail') !== 'on');
  }

  function setSourceTrailMode(enabled) {
    if (enabled) {
      document.documentElement.setAttribute('data-living-source-trail', 'on');
    } else {
      document.documentElement.removeAttribute('data-living-source-trail');
    }

    try {
      localStorage.setItem(STORAGE.sourceTrail, enabled ? 'on' : 'off');
    } catch (_) {}

    updateSourceTrailButton();
  }

  function updateSourceTrailButton() {
    const enabled = document.documentElement.getAttribute('data-living-source-trail') === 'on';
    document.querySelectorAll('[data-living-action="source-trail"]').forEach((button) => {
      button.textContent = enabled ? 'Trail On' : 'Source Trail';
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    });
  }

  function readFollowedTopics() {
    try {
      const topics = JSON.parse(localStorage.getItem(STORAGE.followedTopics) || '[]');
      return Array.isArray(topics) ? topics : [];
    } catch (_) {
      return [];
    }
  }

  function isFollowingTopic(section) {
    return readFollowedTopics().includes(section || 'News');
  }

  function toggleFollowTopic(section) {
    const label = section || 'News';
    const current = readFollowedTopics();
    const next = current.includes(label) ? current.filter((item) => item !== label) : current.concat(label);
    try {
      localStorage.setItem(STORAGE.followedTopics, JSON.stringify(next));
    } catch (_) {}
  }

  function getCurrentStoryData(article, hero, body) {
    const embedded = readEmbeddedStories();
    const currentKey = normalizeUrlKey(window.location.pathname);
    const match = embedded.find((story) => normalizeUrlKey(story.url) === currentKey || normalizeUrlKey(story.url).endsWith(currentKey));
    const jsonLd = readArticleJsonLd();
    const headline = cleanText(hero?.querySelector('.article-headline, h1')?.textContent || article.querySelector('h1')?.textContent || jsonLd.headline || document.title.replace(/\s+—\s+The Press$/i, ''));
    const dek = cleanText(hero?.querySelector('.article-dek')?.textContent || document.querySelector('meta[name="description"]')?.content || jsonLd.description || match?.dek || '');
    const section = cleanText(match?.section || jsonLd.articleSection || hero?.querySelector('.eyebrow')?.textContent?.split('•')[0] || 'News');
    const image = cleanText(match?.image || hero?.querySelector('img')?.getAttribute('src') || jsonLd.image?.url || '');

    return {
      title: cleanText(match?.title || headline),
      dek: cleanText(match?.dek || dek),
      section,
      type: cleanText(match?.type || hero?.querySelector('.eyebrow')?.textContent?.split('•')[1] || 'Story'),
      url: cleanText(match?.url || window.location.pathname.split('/').pop() || ''),
      image,
      imageAlt: cleanText(match?.imageAlt || match?.image_alt || hero?.querySelector('img')?.alt || headline),
      published: cleanText(match?.published || match?.publishedLabel || jsonLd.datePublished || ''),
      keywords: Array.isArray(match?.keywords) ? match.keywords : [],
      readTime: cleanText(match?.readTime || match?.read_time || ''),
      bodyText: cleanText(body.textContent || ''),
      matchedCurrentStory: Boolean(match),
    };
  }

  function readArticleJsonLd() {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '{}');
        const article = Array.isArray(data) ? data.find((item) => /Article$/i.test(item['@type'] || '')) : data;
        if (article && /Article$/i.test(article['@type'] || '')) return article;
      } catch (_) {}
    }
    return {};
  }

  function readEmbeddedStories() {
    const node = document.getElementById('press-search-data');
    if (!node) return [];
    try {
      const data = JSON.parse(node.textContent || '[]');
      return Array.isArray(data) ? data.map(normalizeStory).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function normalizeStory(item) {
    if (!item || typeof item !== 'object') return null;
    const title = cleanText(item.title || item.headline);
    const url = cleanText(item.url || item.href || item.link);
    if (!title || !url) return null;
    return {
      title,
      url: normalizeArticleUrl(url),
      section: cleanText(item.section || item.section_slug || 'News'),
      type: cleanText(item.type || 'Story'),
      dek: cleanText(item.dek || item.description || item.summary || ''),
      image: cleanText(item.image || item.thumbnail || ''),
      imageAlt: cleanText(item.imageAlt || item.image_alt || title),
      published: cleanText(item.published || item.publishedLabel || item.date || ''),
      publishedIso: cleanText(item.publishedIso || item.published_iso || ''),
      keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : [],
      readTime: cleanText(item.readTime || item.read_time || ''),
    };
  }

  function relatedStoriesForEntity(entity, stories, currentUrl) {
    const aliases = entity.aliases.map((alias) => alias.toLowerCase());
    return stories.filter((story) => {
      if (normalizeUrlKey(story.url) === normalizeUrlKey(currentUrl)) return false;
      const haystack = normalizeText(`${story.title} ${story.dek} ${(story.keywords || []).join(' ')}`);
      return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
    }).slice(0, 4);
  }

  function summarizeSections(stories) {
    const counts = new Map();
    stories.forEach((story) => {
      const section = cleanText(story.section || 'News').split('/')[0].trim();
      counts.set(section, (counts.get(section) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([section, count]) => ({ section, count }))
      .sort((a, b) => b.count - a.count || a.section.localeCompare(b.section));
  }

  function bestQuote(context) {
    const quote = context.body.querySelector('blockquote')?.textContent;
    if (quote) return cleanText(quote);
    const paragraph = Array.from(context.body.querySelectorAll('p'))
      .map((node) => cleanText(node.textContent))
      .find((text) => text.length > 90 && text.length < 260);
    return paragraph || context.story.dek || context.story.title;
  }

  function buildShareCaption(story) {
    const url = new URL(story.url || window.location.href, window.location.href).href;
    return `${story.title}\n\n${story.dek}\n\nRead it on The Press: ${url}`;
  }

  function collectReadableText(root, hero) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll('script, style, nav, .share-row, [data-living-drawer], .related-block, #related-stories, .story-card--related, .article-sources, #source-notes, .source-notes, .source-list').forEach((node) => node.remove());
    const heroText = hero ? cleanText(hero.textContent || '') : '';
    return cleanText(`${heroText} ${clone.textContent || ''}`);
  }

  function scrollToAnchor(id) {
    if (!id) return;
    const target = document.getElementById(id.replace(/^#/, ''));
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function googleMapsUrl(place) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
  }

  function streetViewUrl(place) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
  }

  function osmUrl(place) {
    return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`;
  }

  function osmEmbedUrl(place) {
    const delta = 0.006;
    const bbox = [
      place.lng - delta,
      place.lat - delta,
      place.lng + delta,
      place.lat + delta,
    ].join('%2C');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${place.lat}%2C${place.lng}`;
  }

  function hostnameFromUrl(url) {
    try {
      return new URL(url, window.location.href).hostname.replace(/^www\./, '');
    } catch (_) {
      return '';
    }
  }

  function normalizeArticleUrl(url) {
    const value = cleanText(url);
    if (!value) return window.location.pathname.split('/').pop() || 'index.html';
    if (/^https?:\/\//i.test(value) || value.startsWith('/') || value.startsWith('../')) return value;
    return value.replace(/^\.\//, '');
  }

  function normalizeUrlKey(value) {
    let raw = String(value || '')
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^file:\/\/[^/]+/i, '')
      .replace(/^.*\/The-Press\//i, '')
      .replace(/[?#].*$/, '')
      .replace(/^\/+/, '')
      .replace(/^\.\.\//, '')
      .replace(/^\.\//, '');

    if (!raw || raw.endsWith('/')) raw += 'index.html';
    const parts = raw.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[parts.length - 2] === 'daily') return parts.slice(-2).join('/');
    return parts[parts.length - 1] || raw;
  }

  function sectionHref(section) {
    const slug = slugify(section);
    return slug ? `section-${slug}.html` : 'archive.html';
  }

  function sectionAccent(section) {
    const accents = {
      politics: '#b7473f',
      culture: '#2f6f73',
      technology: '#4158b7',
      economics: '#8a6425',
      education: '#5f579f',
      health: '#a23f66',
      philosophy: '#6a4c8f',
      science: '#22766d',
      sports: '#2f5f9e',
      world: '#5c6fb7',
      opinion: '#9f513b',
    };
    return accents[slugify(section)] || '#b7473f';
  }

  function parseStoryTime(story) {
    const parsed = Date.parse(story.publishedIso || story.published || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function phraseInText(haystack, phrase) {
    const normalizedPhrase = normalizeText(phrase);
    if (!normalizedPhrase) return false;
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedPhrase).replace(/\s+/g, '\\s+')}(?=$|[^a-z0-9])`, 'i');
    return pattern.test(haystack);
  }

  function normalizeText(value) {
    return cleanText(value).toLowerCase();
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function shorten(value, max) {
    const text = cleanText(value);
    if (text.length <= max) return text;
    return text.slice(0, Math.max(0, max - 1)).trim().replace(/[,\s]+$/, '') + '...';
  }

  function slugify(value) {
    return cleanText(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function triggerDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
})();
/* PRESS_LIVING_ARTICLE_KIT_END */
