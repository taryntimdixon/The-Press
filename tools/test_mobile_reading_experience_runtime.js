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

async function testFantasyEntryOpensReadingView(browser, origin) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      for (const [index, entry] of ILLUSTRATED_FICTION_ENTRIES.entries()) {
        const link = page.locator(`[data-illustrated-fiction-entry="${entry.id}"] a`);
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
        assert(await page.locator('.wordmark').count() === 1, 'Fantasy must share the new Press masthead');
        assert(await page.locator('.front-nav a[aria-current]').getAttribute('href') === 'index.html#fantasy', 'Fantasy navigation must identify its active section');
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
    await testFantasyEntryOpensReadingView(browser, server.origin);
    await require('./test_editorial_home_runtime.js')(browser, server.origin);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(`Mobile interaction runtime failure: ${error.stack || error.message}`);
  process.exitCode = 1;
});
