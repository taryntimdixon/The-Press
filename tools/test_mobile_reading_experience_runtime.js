#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ARTICLE_PATH = '/culture-a-love-letter-to-new-york.html';
const MOB_ARTICLE_PATH = '/memory-mob-ties-the-files.html';
const STANDARD_ARTICLE_PATH = '/culture-streaming-grew-up-and-became-tv-again.html';
const INLINE_SELECTOR = '.ny-love-letter-feature .ny-love-newspaper-sheet > img';
const MOB_INLINE_SELECTOR = '.press-image-edition .press-image-edition__sheet > img';
const STANDARD_SELECTOR = '.article-hero .hero-figure img';
const ILLUSTRATED_FICTION_ENTRIES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data/illustrated-fiction.json'), 'utf8'),
).entries;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolvePlaywrightCore() {
  const candidates = [
    process.env.PRESS_PLAYWRIGHT_CORE,
    path.join(ROOT, 'node_modules/playwright-core'),
    path.join(
      os.homedir(),
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core',
    ),
    '/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright-core',
  ].filter(Boolean);

  const pnpmRoot = path.join(
    os.homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm',
  );
  if (fs.existsSync(pnpmRoot)) {
    for (const entry of fs.readdirSync(pnpmRoot).sort().reverse()) {
      if (entry.startsWith('playwright-core@')) {
        candidates.push(path.join(pnpmRoot, entry, 'node_modules/playwright-core'));
      }
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
  }
  throw new Error(
    'Playwright Core is required for the mobile runtime test. '
      + 'Set PRESS_PLAYWRIGHT_CORE to its package directory.',
  );
}

function resolveChromeExecutable() {
  const candidates = [
    process.env.PRESS_CHROME_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    throw new Error(
      'Chrome or Chromium is required for the mobile runtime test. '
        + 'Set PRESS_CHROME_EXECUTABLE to its executable.',
    );
  }
  return executable;
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  }[extension] || 'application/octet-stream';
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const filePath = path.resolve(ROOT, relativePath);
      if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await fsp.readFile(filePath);
      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      response.end(body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function openArticle(context, origin, articlePath = ARTICLE_PATH, selector = INLINE_SELECTOR) {
  const page = await context.newPage();
  await page.goto(`${origin}${articlePath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.dataset.pressInlineImageZoom === 'true',
    selector,
  );
  return page;
}

async function openStandardArticle(context, origin) {
  const page = await context.newPage();
  await page.goto(`${origin}${STANDARD_ARTICLE_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.dataset.pressImageZoom === 'true',
    STANDARD_SELECTOR,
  );
  return page;
}

async function imagePoint(page, selector, xRatio = 0.3, yRatio = 0.3, index = 0) {
  const locator = page.locator(selector).nth(index);
  await locator.evaluate((image) => {
    image.scrollIntoView({ block: 'center', inline: 'center' });
  });
  await page.waitForTimeout(40);
  const rect = await locator.evaluate((image) => {
    const box = image.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    };
  });
  assert(rect.width > 0 && rect.height > 0, `${selector} has no rendered touch target`);
  return {
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio,
  };
}

async function dispatchTouchPointer(page, selector, type, pointerId, x, y, isPrimary = false, index = 0) {
  return page.locator(selector).nth(index).evaluate((image, payload) => {
    return image.dispatchEvent(new PointerEvent(payload.type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: payload.pointerId,
      pointerType: 'touch',
      isPrimary: payload.isPrimary,
      clientX: payload.x,
      clientY: payload.y,
      buttons: payload.type === 'pointerup' || payload.type === 'pointercancel' ? 0 : 1,
    }));
  }, { type, pointerId, x, y, isPrimary });
}

async function readInlineState(page, selector = INLINE_SELECTOR, index = 0) {
  return page.locator(selector).nth(index).evaluate((image) => {
    const transform = image.style.transform;
    return {
      active: image.closest('figure')?.classList.contains('is-active') || false,
      doneButtons: document.querySelectorAll('.press-inline-image-zoom__done').length,
      lightboxes: document.querySelectorAll('.press-image-lightbox').length,
      historyLength: window.history.length,
      historyMarked: Boolean(window.history.state?.pressImageLightbox),
      transform,
      touchAction: getComputedStyle(image).touchAction,
    };
  });
}

async function testStandardTouchImageKeepsLightbox(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await openStandardArticle(context, origin);
  const historyBefore = await page.evaluate(() => window.history.length);
  const point = await imagePoint(page, STANDARD_SELECTOR, 0.5, 0.5);
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForSelector('.press-image-lightbox');
  const state = await page.evaluate(() => ({
    historyLength: window.history.length,
    historyMarked: Boolean(window.history.state?.pressImageLightbox),
    inlineActive: Boolean(document.querySelector('.press-inline-image-zoom.is-active')),
  }));
  assert(state.historyLength === historyBefore + 1, 'Ordinary touch image did not keep the lightbox history path');
  assert(state.historyMarked, 'Ordinary touch image lightbox did not mark history state');
  assert(!state.inlineActive, 'Ordinary touch image incorrectly entered inline zoom');
  await context.close();
  console.log('✓ Runtime: ordinary touch images still open the lightbox/history path');
}

async function assertIllustratedEditionSupportsHybridZoom(
  page,
  selector,
  expectedCount,
  label,
  verifyViewportScale = false,
) {
  const count = await page.locator(selector).count();
  assert(count === expectedCount, `${label} exposed ${count} sheets instead of ${expectedCount}`);

  const index = Math.floor(count / 2);
  const point = await imagePoint(page, selector, 0.62, 0.38, index);
  const historyBefore = await page.evaluate(() => window.history.length);
  const viewportAllowsZoom = await page.evaluate(() => {
    const content = document.querySelector('meta[name="viewport"]')?.content || '';
    return !/user-scalable\s*=\s*no/i.test(content) && !/maximum-scale\s*=\s*1(?:\D|$)/i.test(content);
  });
  assert(viewportAllowsZoom, `${label} disables browser viewport zoom`);

  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(45);
  const afterSingleTap = await readInlineState(page, selector, index);
  assert(afterSingleTap.touchAction === 'auto', `${label} uses ${afterSingleTap.touchAction} instead of native touch gestures at rest`);
  assert(!afterSingleTap.active, `${label} single tap unexpectedly activated zoom`);
  assert(afterSingleTap.lightboxes === 0, `${label} single tap opened a modal lightbox`);

  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(100);

  const afterDoubleTap = await readInlineState(page, selector, index);
  assert(afterDoubleTap.touchAction === 'none', `${label} did not enable direct manipulation after inline zoom opened`);
  assert(afterDoubleTap.active, `${label} double tap did not activate inline zoom`);
  assert(afterDoubleTap.transform !== '', `${label} double tap did not magnify the selected sheet`);
  assert(afterDoubleTap.doneButtons === 1, `${label} double tap did not expose the inline Done control`);
  assert(afterDoubleTap.lightboxes === 0, `${label} double tap opened a modal lightbox`);
  assert(afterDoubleTap.historyLength === historyBefore && !afterDoubleTap.historyMarked, `${label} double tap changed browser history`);

  await page.locator('.press-inline-image-zoom__done').click();
  await page.waitForFunction(() => !document.querySelector('.press-inline-image-zoom.is-active'));

  const firstX = point.x - 20;
  const secondX = point.x + 20;
  const firstPointerUncancelled = await dispatchTouchPointer(
    page, selector, 'pointerdown', 31, firstX, point.y, true, index,
  );
  const secondPointerUncancelled = await dispatchTouchPointer(
    page, selector, 'pointerdown', 32, secondX, point.y, false, index,
  );
  assert(firstPointerUncancelled && secondPointerUncancelled, `${label} canceled the browser's pinch gesture`);
  await dispatchTouchPointer(page, selector, 'pointermove', 32, secondX + 120, point.y, false, index);
  await dispatchTouchPointer(page, selector, 'pointerup', 32, secondX + 120, point.y, false, index);
  await dispatchTouchPointer(page, selector, 'pointerup', 31, firstX, point.y, true, index);
  await page.waitForTimeout(40);

  const afterPinch = await readInlineState(page, selector, index);
  const neighborTransforms = await page.locator(selector).nth(index).evaluate((image, activeIndex) => {
    const images = Array.from(document.querySelectorAll(image.matches('.press-image-edition img')
      ? '.press-image-edition .press-image-edition__sheet > img'
      : '.ny-love-letter-feature .ny-love-newspaper-sheet > img'));
    return [images[activeIndex - 1], images[activeIndex], images[activeIndex + 1]]
      .map((item) => item?.style.transform || '');
  }, index);
  assert(!afterPinch.active && afterPinch.transform === '', `${label} native pinch fallback transformed only the selected sheet`);
  assert(neighborTransforms.every((transform) => transform === ''), `${label} left neighboring sheets in a different transform context`);
  assert(afterPinch.doneButtons === 0 && afterPinch.lightboxes === 0, `${label} pinch created custom zoom UI`);
  assert(afterPinch.historyLength === historyBefore, `${label} pinch changed browser history`);

  if (verifyViewportScale) {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    const nativePoint = await imagePoint(page, selector, 0.5, 0.5, index);
    await session.send('Input.synthesizePinchGesture', {
      x: Math.round(nativePoint.x),
      y: Math.round(nativePoint.y),
      scaleFactor: 2,
      relativeSpeed: 800,
      gestureSourceType: 'touch',
    });
    await page.waitForTimeout(450);
    const viewportScale = await page.evaluate(() => window.visualViewport?.scale || 1);
    const nativeState = await readInlineState(page, selector, index);
    assert(viewportScale >= 1.8, `${label} native pinch left the viewport at ${viewportScale}x`);
    assert(!nativeState.active && nativeState.transform === '', `${label} native pinch created a per-sheet transform`);
    assert(nativeState.doneButtons === 0 && nativeState.lightboxes === 0, `${label} native pinch created custom zoom UI`);
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await session.detach();
  }
}

async function testBothIllustratedEditionsSupportHybridZoom(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const nycPage = await openArticle(context, origin);
  await assertIllustratedEditionSupportsHybridZoom(nycPage, INLINE_SELECTOR, 34, 'NYC', true);
  await nycPage.close();

  const mobPage = await openArticle(context, origin, MOB_ARTICLE_PATH, MOB_INLINE_SELECTOR);
  await assertIllustratedEditionSupportsHybridZoom(mobPage, MOB_INLINE_SELECTOR, 31, 'Mob Ties', true);
  await context.close();
  console.log('✓ Runtime: NYC and Mob Ties support inline double-tap plus 2x native viewport pinch');
}

async function testHybridTouchDeviceAlsoDelegatesTouchGestures(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
  });
  await context.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = nativeMatchMedia(query);
      if (!query.includes('(hover: none)') && !query.includes('(pointer: coarse)')) return result;
      return {
        matches: false,
        media: result.media,
        onchange: null,
        addListener: (...args) => result.addListener(...args),
        removeListener: (...args) => result.removeListener(...args),
        addEventListener: (...args) => result.addEventListener(...args),
        removeEventListener: (...args) => result.removeEventListener(...args),
        dispatchEvent: (...args) => result.dispatchEvent(...args),
      };
    };
  });
  const page = await openArticle(context, origin);
  const reportsCoarsePointer = await page.evaluate(
    () => window.matchMedia('(hover: none), (pointer: coarse)').matches,
  );
  assert(!reportsCoarsePointer, 'Hybrid touch fixture did not expose a fine primary pointer');
  await assertIllustratedEditionSupportsHybridZoom(page, INLINE_SELECTOR, 34, 'Hybrid-touch NYC');
  await context.close();
  console.log('✓ Runtime: hybrid touch devices keep inline double-tap and native pinch behavior');
}

async function testKeyboardAndMouseKeepAccessibleLightbox(browser, origin) {
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobilePage = await openArticle(mobileContext, origin);
  await mobilePage.locator(INLINE_SELECTOR).first().focus();
  await mobilePage.keyboard.press('Enter');
  await mobilePage.waitForSelector('.press-image-lightbox');
  const mobileState = await mobilePage.evaluate(() => ({
    lightboxes: document.querySelectorAll('.press-image-lightbox').length,
    inlineActive: Boolean(document.querySelector('.press-inline-image-zoom.is-active')),
  }));
  assert(mobileState.lightboxes === 1 && !mobileState.inlineActive, 'Keyboard Enter did not keep the accessible lightbox path');
  await mobileContext.close();

  const assistiveContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const assistivePage = await openArticle(assistiveContext, origin);
  await assistivePage.locator(INLINE_SELECTOR).first().evaluate((image) => {
    image.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: 1,
    }));
  });
  await assistivePage.waitForSelector('.press-image-lightbox');
  const assistiveState = await assistivePage.evaluate(() => ({
    lightboxes: document.querySelectorAll('.press-image-lightbox').length,
    inlineActive: Boolean(document.querySelector('.press-inline-image-zoom.is-active')),
  }));
  assert(
    assistiveState.lightboxes === 1 && !assistiveState.inlineActive,
    'Assistive click activation did not keep the accessible lightbox path',
  );
  await assistiveContext.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktopPage = await openArticle(desktopContext, origin);
  await desktopPage.locator(INLINE_SELECTOR).first().click({ position: { x: 30, y: 30 } });
  await desktopPage.waitForSelector('.press-image-lightbox');
  const desktopState = await desktopPage.evaluate(() => ({
    lightboxes: document.querySelectorAll('.press-image-lightbox').length,
    inlineActive: Boolean(document.querySelector('.press-inline-image-zoom.is-active')),
  }));
  assert(desktopState.lightboxes === 1 && !desktopState.inlineActive, 'Fine-pointer mouse click did not keep the desktop lightbox path');
  await desktopContext.close();
  console.log('✓ Runtime: keyboard, assistive click, and fine-pointer mouse keep the accessible lightbox');
}

async function testAllMobileHomepageHeroesKeepOneScrimAndTopAlignedArt(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.press-ecosystem-ready');
  const buttonCount = await page.locator('[data-lead-button]').count();
  assert(buttonCount === 7, `Homepage exposed ${buttonCount} hero controls instead of 7`);

  for (let index = 0; index < buttonCount; index += 1) {
    await page.locator('[data-lead-button]').nth(index).evaluate((button) => button.click());
    await page.waitForTimeout(35);
    await page.waitForFunction(() => {
      const image = document.querySelector('.lead-panel.is-active .lead-panel__media img');
      return Boolean(image?.complete && image.naturalWidth && image.naturalHeight);
    });
    const state = await page.evaluate(() => {
      const active = document.querySelector('.lead-panel.is-active');
      const body = active?.querySelector('.lead-panel__body');
      const media = active?.querySelector('.lead-panel__media');
      const image = media?.querySelector('img');
      const imageRect = image?.getBoundingClientRect();
      const mediaRect = media?.getBoundingClientRect();
      const imageStyle = image ? getComputedStyle(image) : null;
      const scale = image && mediaRect
        ? Math.min(mediaRect.width / image.naturalWidth, mediaRect.height / image.naturalHeight)
        : 0;
      const paintedHeight = image ? image.naturalHeight * scale : 0;
      const yPosition = imageStyle?.objectPosition?.trim().split(/\s+/)[1] || '50%';
      let yAnchor = 0.5;
      if (yPosition === 'top') {
        yAnchor = 0;
      } else if (yPosition === 'bottom') {
        yAnchor = 1;
      } else {
        const percentage = Number.parseFloat(yPosition);
        if (Number.isFinite(percentage)) yAnchor = percentage / 100;
      }
      return {
        activePanels: document.querySelectorAll('.lead-panel.is-active').length,
        bodyBackgroundImage: body ? getComputedStyle(body).backgroundImage : null,
        bodyBackgroundColor: body ? getComputedStyle(body).backgroundColor : null,
        mediaScrim: media ? getComputedStyle(media, '::after').backgroundImage : null,
        imageVisible: Boolean(imageRect?.width && imageRect?.height),
        objectFit: imageStyle?.objectFit,
        paintedTopGap: mediaRect ? Math.max(0, mediaRect.height - paintedHeight) * yAnchor : null,
      };
    });
    assert(state.activePanels === 1 && state.imageVisible, `Homepage hero ${index + 1} did not render as the sole active panel`);
    assert(state.bodyBackgroundImage === 'none', `Homepage hero ${index + 1} retained the duplicate body gradient`);
    assert(state.bodyBackgroundColor === 'rgba(0, 0, 0, 0)', `Homepage hero ${index + 1} retained an opaque body scrim`);
    assert(state.mediaScrim && state.mediaScrim !== 'none', `Homepage hero ${index + 1} lost the single readability scrim`);
    assert(state.objectFit === 'contain', `Homepage hero ${index + 1} no longer preserves the full artwork`);
    assert(state.paintedTopGap <= 12, `Homepage hero ${index + 1} has ${state.paintedTopGap}px unused space above its artwork`);
  }

  await context.close();
  console.log('✓ Runtime: all seven mobile heroes preserve full art without a large top gap');
}

async function testMobileHomepageSectionsDoNotBecomeBlankRuns(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.press-ecosystem-ready');
  await page.locator('.below-fold-flipper').evaluate((section) => section.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(750);

  const state = await page.evaluate(() => {
    const history = document.querySelector('.on-this-day');
    const below = document.querySelector('.below-fold-flipper');
    const shelf = document.querySelector('.below-fold-shelf');
    const illustratedFiction = document.querySelector('.home-illustrated-fiction');
    const historyRect = history?.getBoundingClientRect();
    const belowRect = below?.getBoundingClientRect();
    const toolbarRect = below?.querySelector('.below-fold-flipper__toolbar')?.getBoundingClientRect();
    return {
      correctOrder: Boolean(
        history && below && shelf && illustratedFiction
        && (history.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING)
        && (below.compareDocumentPosition(shelf) & Node.DOCUMENT_POSITION_FOLLOWING)
        && (shelf.compareDocumentPosition(illustratedFiction) & Node.DOCUMENT_POSITION_FOLLOWING)
      ),
      oldCartoonSections: document.querySelectorAll('.home-cartoons').length,
      illustratedFictionSections: document.querySelectorAll('.home-illustrated-fiction').length,
      illustratedFictionSlots: illustratedFiction?.querySelectorAll('[data-illustrated-fiction-slot]').length ?? 0,
      illustratedFictionImages: illustratedFiction?.querySelectorAll('img').length ?? 0,
      illustratedFictionText: illustratedFiction?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      layoutGap: historyRect && belowRect ? belowRect.top - historyRect.bottom : null,
      revealHidden: below?.classList.contains('press-preview-reveal')
        && !below.classList.contains('is-visible'),
      opacity: below ? Number(getComputedStyle(below).opacity) : 0,
      toolbarVisible: Boolean(toolbarRect?.width && toolbarRect?.height),
    };
  });

  assert(state.correctOrder, 'Homepage section order is not On This Day → Below the Fold → shelf → Illustrated Fiction');
  assert(state.oldCartoonSections === 0, 'The retired homepage Cartoon Desk is still rendered');
  assert(state.illustratedFictionSections === 1, 'Homepage must render exactly one illustrated-fiction section');
  assert(state.illustratedFictionSlots === Math.max(0, 5 - ILLUSTRATED_FICTION_ENTRIES.length), 'Fantasy placeholder count does not match its archive registry');
  assert(state.illustratedFictionImages === ILLUSTRATED_FICTION_ENTRIES.length, 'Fantasy image count does not match its archive registry');
  if (!ILLUSTRATED_FICTION_ENTRIES.length) {
    assert(state.illustratedFictionText === 'Fantasy', 'Fantasy must be the section\'s only visible copy before content is supplied');
  }
  assert(state.layoutGap <= 32, `Homepage inserted a ${state.layoutGap}px spacer after On This Day`);
  assert(!state.revealHidden, 'Below the Fold is reserved in layout but stuck in its hidden reveal state');
  assert(state.opacity >= 0.95 && state.toolbarVisible, 'Below the Fold remained visually blank on mobile');
  await context.close();
  console.log('✓ Runtime: Below the Fold is visible immediately after On This Day on mobile');
}

async function testFantasyFramesStayUniform(browser, origin) {
  const inspectViewport = async (viewport) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fantasy .illustrated-fiction-slot__art');
    await page.locator('#fantasy .illustrated-fiction-entry__art').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('#fantasy img')].every((image) => image.complete && image.naturalWidth));

    const state = await page.evaluate(() => {
      const fantasy = document.querySelector('#fantasy');
      const grid = fantasy.querySelector('.home-illustrated-fiction__grid');
      const cards = [...fantasy.querySelectorAll('.illustrated-fiction-slot')];
      const frames = cards.map((card) => card.querySelector('.illustrated-fiction-slot__art'));
      const dimensions = (nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const images = [...fantasy.querySelectorAll('.illustrated-fiction-entry__art img')];
      return {
        cardWidths: dimensions(cards).map(({ width }) => width),
        frameDimensions: dimensions(frames),
        gridTrackCount: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        galleryHeight: grid.getBoundingClientRect().height,
        galleryText: grid.textContent.replace(/\s+/g, ' ').trim(),
        variantClasses: cards.flatMap((card) => [...card.classList].filter((name) => name.startsWith('illustrated-fiction-slot--'))),
        images: images.map((image) => {
          const imageRect = image.getBoundingClientRect();
          return {
            src: image.getAttribute('src'),
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            width: imageRect.width,
            height: imageRect.height,
            objectFit: getComputedStyle(image).objectFit,
            artOverflow: getComputedStyle(image.closest('.illustrated-fiction-entry__art')).overflow,
          };
        }),
        horizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
      };
    });
    await context.close();
    return state;
  };

  const desktop = await inspectViewport({ width: 1440, height: 1000 });
  const mobile = await inspectViewport({ width: 390, height: 844 });
  for (const [name, state] of Object.entries({ desktop, mobile })) {
    const framesEqual = state.frameDimensions.every((frame) => (
      Math.abs(frame.width - state.frameDimensions[0].width) < 1
      && Math.abs(frame.height - state.frameDimensions[0].height) < 1
    ));
    assert(framesEqual, `Fantasy illustration frames are not uniform on ${name}`);
    assert(state.cardWidths.every((width) => Math.abs(width - state.cardWidths[0]) < 1), `Fantasy entries do not share one gallery width on ${name}`);
    assert(state.frameDimensions.every((frame) => Math.abs((frame.width / frame.height) - 1) < 0.01), `Fantasy frames are not square on ${name}`);
    assert(state.gridTrackCount === (name === 'desktop' ? 3 : 2), `Fantasy is not a compact multi-column gallery on ${name}`);
    assert(state.variantClasses.length === 0, `Fantasy still renders variable layout classes on ${name}`);
    assert(state.images.length === ILLUSTRATED_FICTION_ENTRIES.length, `Fantasy image count diverges from the registry on ${name}`);
    for (const [index, entry] of ILLUSTRATED_FICTION_ENTRIES.entries()) {
      const image = state.images[index];
      assert(image?.src === entry.image, `${entry.title} image is missing on ${name}`);
      const dimensionsMatch = entry.imageWidth && entry.imageHeight
        ? image?.naturalWidth === entry.imageWidth && image?.naturalHeight === entry.imageHeight
        : image?.naturalWidth === image?.naturalHeight;
      assert(dimensionsMatch, `${entry.title} source does not match its registered square dimensions on ${name}`);
      assert(image?.objectFit === 'contain', `${entry.title} is cropped instead of contained on ${name}`);
      assert(image?.artOverflow === 'visible', `${entry.title} art is clipped on ${name}`);
      assert(Math.abs(image.width - state.frameDimensions[index].width) < 1.1 && Math.abs(image.height - state.frameDimensions[index].height) < 1.1, `${entry.title} image box does not match its contained frame on ${name}`);
      assert(!state.galleryText.includes(entry.story[0]), `Fantasy homepage leaks the full ${entry.title} story on ${name}`);
    }
    assert(!state.horizontalOverflow, `Fantasy gallery overflows horizontally on ${name}`);
  }
  assert(desktop.frameDimensions[0].width > 350 && desktop.galleryHeight < 1300, 'Fantasy desktop gallery is not compact enough for five entries');
  assert(mobile.frameDimensions[0].width > 150 && mobile.galleryHeight < 1200, 'Fantasy mobile gallery is not compact enough for five entries');
  console.log('✓ Runtime: Fantasy is a compact square gallery with full, uncropped art on desktop and mobile');
}

async function testFantasyEntryOpensReadingView(browser, origin) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      for (const [index, entry] of ILLUSTRATED_FICTION_ENTRIES.entries()) {
        const link = page.locator(`[data-illustrated-fiction-entry="${entry.id}"] .illustrated-fiction-entry__link`);
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await page.waitForURL(`**/${entry.href}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
          const image = document.querySelector('.fantasy-reading__art img');
          return image?.complete && image.naturalWidth;
        });
        const state = await page.evaluate(() => {
          const art = document.querySelector('.fantasy-reading__art');
          const image = art.querySelector('img');
          const story = document.querySelector('.fantasy-reading__story');
          const artRect = art.getBoundingClientRect();
          const imageRect = image.getBoundingClientRect();
          const storyRect = story.getBoundingClientRect();
          return {
            title: document.querySelector('.fantasy-reading__header h1')?.textContent.trim(),
            introLabels: document.querySelectorAll('.fantasy-reading__header .eyebrow').length,
            art: {
              width: artRect.width,
              height: artRect.height,
              contentWidth: art.clientWidth,
              contentHeight: art.clientHeight,
              bottom: artRect.bottom,
            },
            image: {
              src: image.getAttribute('src'),
              width: imageRect.width,
              height: imageRect.height,
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              objectFit: getComputedStyle(image).objectFit,
            },
            storyTop: storyRect.top,
            storyBackground: getComputedStyle(story).backgroundImage,
            bodyBackground: getComputedStyle(document.body).backgroundImage,
            paragraphs: story.querySelectorAll('p').length,
            bodyOverflow: document.body.scrollWidth > document.body.clientWidth,
          };
        });
        assert(state.title === entry.title, `Fantasy reading view lost the literal ${entry.title} title`);
        assert(state.introLabels === 0, `${entry.title} retained an explanatory intro line`);
        assert(state.art.bottom < state.storyTop, `${entry.title} does not place the complete story below the artwork`);
        assert(Math.abs(state.art.width - state.art.height) < 1.1, `${entry.title} reading artwork is not square`);
        assert(Math.abs(state.image.width - state.art.contentWidth) < 1.1 && Math.abs(state.image.height - state.art.contentHeight) < 1.1, `${entry.title} does not fill the reading frame edge-to-edge`);
        assert(state.image.src === entry.image, `${entry.title} reading view uses the wrong image`);
        const dimensionsMatch = entry.imageWidth && entry.imageHeight
          ? state.image.naturalWidth === entry.imageWidth && state.image.naturalHeight === entry.imageHeight
          : state.image.naturalWidth === state.image.naturalHeight;
        assert(dimensionsMatch, `${entry.title} reading view does not use its registered square image`);
        assert(state.image.objectFit === 'contain', `${entry.title} reading view crops its image`);
        assert(state.paragraphs === entry.story.length, `${entry.title} reading view does not contain the complete story`);
        assert(state.storyBackground === 'none' && state.bodyBackground === 'none', `${entry.title} retained a ruled-paper background treatment`);
        assert(!state.bodyOverflow, `${entry.title} reading view overflows horizontally`);
        assert(state.art.width > (viewport.width > 1000 ? 900 : 340), `${entry.title} reading artwork is not large enough`);
        if (index < ILLUSTRATED_FICTION_ENTRIES.length - 1) {
          await page.goBack({ waitUntil: 'domcontentloaded' });
        }
      }
    } finally {
      await context.close();
    }
  }
  console.log('✓ Runtime: every Fantasy card opens a large-art reading view with its complete story below');
}

async function testFantasyReadingHeaderMatchesHomepage(browser, origin) {
  const profiles = [
    { label: 'desktop', viewport: { width: 1440, height: 1000 } },
    { label: 'mobile', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  ];

  for (const { label, ...contextOptions } of profiles) {
    const context = await browser.newContext(contextOptions);
    const inspect = async (pathname, readingPage) => {
      const page = await context.newPage();
      await page.goto(`${origin}${pathname}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.press-live-clock');
      await page.waitForSelector(readingPage ? '.fantasy-reading__nav' : '.home-section-nav');
      if (!readingPage) {
        await page.locator('.home-section-nav a[href="#fantasy"]').click();
        await page.waitForSelector('.home-section-nav a[href="#fantasy"][aria-current="location"]');
      }
      const state = await page.evaluate((isReadingPage) => {
        const style = (element, pseudo = null) => {
          const computed = getComputedStyle(element, pseudo);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            borderColor: computed.borderColor,
            boxShadow: computed.boxShadow,
            fontFamily: computed.fontFamily,
            fontWeight: computed.fontWeight,
            letterSpacing: computed.letterSpacing,
            textTransform: computed.textTransform,
          };
        };
        const header = document.querySelector('.site-header');
        const row = document.querySelector('.masthead-row');
        const logo = document.querySelector('.masthead-logo').getBoundingClientRect();
        const clock = document.querySelector('.press-live-clock');
        const control = document.querySelector('.search-trigger');
        const utility = document.querySelector('.utility-link');
        const ticker = document.querySelector('.masthead-ticker');
        const nav = document.querySelector('.home-section-nav');
        const active = nav.querySelector('[aria-current="location"]');
        const headline = document.querySelector(isReadingPage ? '.fantasy-reading__header h1' : '.lead-panel.is-active h2');
        const headerBox = header.getBoundingClientRect();
        const navBox = nav.getBoundingClientRect();
        const navStyle = getComputedStyle(nav);
        const headlineStyle = getComputedStyle(headline);
        const headerStripStyle = getComputedStyle(header, '::before');
        const readingHeaderStyle = isReadingPage
          ? getComputedStyle(document.querySelector('.fantasy-reading__header'))
          : null;
        const activeMarkerStyle = getComputedStyle(active, '::after');
        return {
          hasSharedClass: document.body.classList.contains('press-front-system'),
          header: style(header),
          headerStrip: {
            content: headerStripStyle.content,
            backgroundColor: headerStripStyle.backgroundColor,
            color: headerStripStyle.color,
            fontFamily: headerStripStyle.fontFamily,
          },
          headerBox: { width: headerBox.width, height: headerBox.height },
          rowAreas: getComputedStyle(row).gridTemplateAreas,
          logo: { width: logo.width, height: logo.height },
          clock: style(clock),
          control: style(control),
          utility: style(utility),
          ticker: style(ticker),
          nav: {
            position: navStyle.position,
            backgroundColor: navStyle.backgroundColor,
            borderLeftWidth: navStyle.borderLeftWidth,
            boxShadow: navStyle.boxShadow,
          },
          navBox: { x: navBox.x, width: navBox.width },
          active: style(active),
          activeMarker: {
            content: activeMarkerStyle.content,
            backgroundColor: activeMarkerStyle.backgroundColor,
            height: activeMarkerStyle.height,
            position: activeMarkerStyle.position,
          },
          headline: {
            fontFamily: headlineStyle.fontFamily,
          },
          readingHero: isReadingPage ? {
            borderTopWidth: readingHeaderStyle.borderTopWidth,
            borderBottomWidth: readingHeaderStyle.borderBottomWidth,
          } : null,
        };
      }, readingPage);
      await page.close();
      return state;
    };

    const homepage = await inspect('/', false);
    for (const entry of ILLUSTRATED_FICTION_ENTRIES) {
      const reading = await inspect(`/${entry.href}`, true);
      assert(homepage.hasSharedClass && reading.hasSharedClass, `${entry.title} and the homepage do not share the front-system class on ${label}`);
      for (const key of ['header', 'headerStrip', 'rowAreas', 'clock', 'control', 'utility', 'ticker', 'nav', 'active', 'activeMarker']) {
        const homepageTreatment = JSON.stringify(homepage[key]);
        const readingTreatment = JSON.stringify(reading[key]);
        assert(homepageTreatment === readingTreatment, `${entry.title} reading ${key} treatment diverges from the homepage on ${label}: homepage=${homepageTreatment}; reading=${readingTreatment}`);
      }
      assert(
        Math.abs(homepage.logo.width - reading.logo.width) < 1 && Math.abs(homepage.logo.height - reading.logo.height) < 1,
        `${entry.title} masthead logo scale diverges from the homepage on ${label}: homepage=${JSON.stringify(homepage.logo)}; reading=${JSON.stringify(reading.logo)}`,
      );
      for (const boxKey of ['headerBox', 'navBox']) {
        for (const property of Object.keys(homepage[boxKey])) {
          assert(
            Math.abs(homepage[boxKey][property] - reading[boxKey][property]) < 1,
            `${entry.title} reading ${boxKey}.${property} diverges from the homepage on ${label}: homepage=${homepage[boxKey][property]}; reading=${reading[boxKey][property]}`,
          );
        }
      }
      assert(homepage.headline.fontFamily === reading.headline.fontFamily, `${entry.title} reading title lost the homepage display typeface on ${label}`);
      assert(reading.readingHero.borderTopWidth === '7px' && reading.readingHero.borderBottomWidth === '1px', `${entry.title} reading hero lost the Press signal-rule treatment on ${label}`);
    }
    await context.close();
  }
  console.log('✓ Runtime: every Fantasy reading header, navigation, and hero language match the homepage on desktop and mobile');
}

async function testHomepageSectionNavigation(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.home-section-nav');

  const initial = await page.evaluate(() => {
    const nav = document.querySelector('.home-section-nav');
    return {
      hrefs: [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href')),
      position: getComputedStyle(nav).position,
      horizontalScroll: nav.querySelector('.home-section-nav__links').scrollWidth
        > nav.querySelector('.home-section-nav__links').clientWidth,
    };
  });
  const expectedHrefs = ['#front-page', '#more-from-edition', '#on-this-day', '#below-the-fold', '#fantasy'];
  assert(initial.hrefs.join('|') === expectedHrefs.join('|'), 'Homepage section navigation does not expose all five named sections');
  assert(initial.position === 'sticky', 'Homepage section navigation is not sticky');
  assert(initial.horizontalScroll, 'Homepage section navigation is not horizontally scrollable on mobile');

  for (const href of expectedHrefs) {
    await page.evaluate((targetHref) => {
      const body = document.body;
      body.scrollTop = targetHref === '#fantasy' ? 0 : body.scrollHeight;
    }, href);
    await page.waitForTimeout(80);
    const before = await page.evaluate(() => document.body.scrollTop);
    await page.locator(`.home-section-nav a[href="${href}"]`).click();
    await page.waitForFunction((targetHref) => {
      const target = document.querySelector(targetHref);
      const current = document.querySelector('.home-section-nav a[aria-current="location"]')?.getAttribute('href');
      const top = target?.getBoundingClientRect().top;
      return location.hash === targetHref && current === targetHref && Math.abs(top - 64) < 1.5;
    }, href);
    const jump = await page.evaluate(() => ({
      hash: location.hash,
      current: document.querySelector('.home-section-nav a[aria-current="location"]')?.getAttribute('href'),
      scrollTop: document.body.scrollTop,
      targetTop: document.querySelector(location.hash)?.getBoundingClientRect().top,
    }));
    assert(jump.hash === href && jump.current === href, `${href} jump did not update location and current state`);
    assert(Math.abs(jump.scrollTop - before) > 20, `${href} changed the hash without moving the page`);
    assert(jump.targetTop >= 0 && jump.targetTop < 90, `${href} did not finish at its real target`);
  }

  await page.locator('.home-section-nav a[href="#front-page"]').click();
  await page.waitForFunction(() => (
    document.querySelector('.home-section-nav a[aria-current="location"]')?.getAttribute('href') === '#front-page'
    && Math.abs(document.querySelector('#front-page').getBoundingClientRect().top - 64) < 1.5
  ));
  const fantasyTop = await page.locator('#fantasy').evaluate((target) => target.getBoundingClientRect().top + document.body.scrollTop);
  await page.locator('.home-section-nav a[href="#fantasy"]').click();
  await page.waitForTimeout(100);
  const animatedPosition = await page.evaluate(() => document.body.scrollTop);
  assert(animatedPosition > 0 && animatedPosition < fantasyTop - 50, 'Fantasy jump did not visibly animate through the page');
  await page.waitForFunction(() => (
    document.querySelector('.home-section-nav a[aria-current="location"]')?.getAttribute('href') === '#fantasy'
    && Math.abs(document.querySelector('#fantasy').getBoundingClientRect().top - 64) < 1.5
  ));
  await page.waitForTimeout(100);
  const animatedDestination = await page.evaluate(() => ({
    current: document.querySelector('.home-section-nav a[aria-current="location"]')?.getAttribute('href'),
    top: document.querySelector('#fantasy').getBoundingClientRect().top,
  }));
  assert(animatedDestination.current === '#fantasy' && animatedDestination.top < 90, 'Animated Fantasy jump did not finish at its target');

  for (const href of expectedHrefs) {
    await page.evaluate((targetHref) => {
      const body = document.body;
      const target = document.querySelector(targetHref);
      const absoluteTop = target.getBoundingClientRect().top + body.scrollTop;
      body.scrollTo({ top: Math.max(0, absoluteTop - 64), behavior: 'auto' });
    }, href);
    await page.waitForTimeout(200);
    const scrollState = await page.evaluate((targetHref) => ({
      current: document.querySelector('.home-section-nav a[aria-current="location"]')?.getAttribute('href'),
      scrollTop: document.body.scrollTop,
      targetTop: document.querySelector(targetHref).getBoundingClientRect().top,
      navBottom: document.querySelector('.home-section-nav').getBoundingClientRect().bottom,
    }), href);
    assert(scrollState.current === href, `${href} did not become current during position-based scrolling: ${JSON.stringify(scrollState)}`);
  }

  await context.close();
  console.log('✓ Runtime: sticky section navigation jumps to and tracks all five named homepage sections on mobile');
}

async function main() {
  const { chromium } = require(resolvePlaywrightCore());
  const server = await startStaticServer();
  let browser = null;
  try {
    browser = await chromium.launch({
      executablePath: resolveChromeExecutable(),
      headless: true,
    });
    await testStandardTouchImageKeepsLightbox(browser, server.origin);
    await testBothIllustratedEditionsSupportHybridZoom(browser, server.origin);
    await testHybridTouchDeviceAlsoDelegatesTouchGestures(browser, server.origin);
    await testKeyboardAndMouseKeepAccessibleLightbox(browser, server.origin);
    await testAllMobileHomepageHeroesKeepOneScrimAndTopAlignedArt(browser, server.origin);
    await testMobileHomepageSectionsDoNotBecomeBlankRuns(browser, server.origin);
    await testFantasyFramesStayUniform(browser, server.origin);
    await testFantasyEntryOpensReadingView(browser, server.origin);
    await testFantasyReadingHeaderMatchesHomepage(browser, server.origin);
    await testHomepageSectionNavigation(browser, server.origin);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(`Mobile interaction runtime failure: ${error.stack || error.message}`);
  process.exitCode = 1;
});
