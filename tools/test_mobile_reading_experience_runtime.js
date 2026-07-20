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

async function openArticle(context, origin) {
  const page = await context.newPage();
  await page.goto(`${origin}${ARTICLE_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.dataset.pressInlineImageZoom === 'true',
    INLINE_SELECTOR,
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

async function imagePoint(page, selector, xRatio = 0.3, yRatio = 0.3) {
  await page.locator(selector).first().evaluate((image) => {
    image.scrollIntoView({ block: 'center', inline: 'center' });
  });
  await page.waitForTimeout(40);
  const rect = await page.locator(selector).first().evaluate((image) => {
    const box = image.getBoundingClientRect();
    const frame = image.closest('figure')?.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
      frame: frame ? {
        left: frame.left,
        top: frame.top,
        right: frame.right,
        bottom: frame.bottom,
        width: frame.width,
        height: frame.height,
      } : null,
    };
  });
  assert(rect.width > 0 && rect.height > 0, `${selector} has no rendered touch target`);
  return {
    rect,
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio,
  };
}

async function dispatchTouchPointer(page, selector, type, pointerId, x, y, isPrimary = false) {
  await page.locator(selector).first().evaluate((image, payload) => {
    image.dispatchEvent(new PointerEvent(payload.type, {
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

async function readInlineState(page, selector = INLINE_SELECTOR) {
  return page.locator(selector).first().evaluate((image) => {
    const transform = image.style.transform;
    const frame = image.closest('figure')?.getBoundingClientRect();
    const match = transform.match(
      /translate3d\(([-0-9.]+)px, ([-0-9.]+)px, 0(?:px)?\) scale\(([-0-9.]+)\)/,
    );
    return {
      active: image.closest('figure')?.classList.contains('is-active') || false,
      doneButtons: document.querySelectorAll('.press-inline-image-zoom__done').length,
      lightboxes: document.querySelectorAll('.press-image-lightbox').length,
      historyLength: window.history.length,
      historyMarked: Boolean(window.history.state?.pressImageLightbox),
      transform,
      panX: match ? Number(match[1]) : null,
      panY: match ? Number(match[2]) : null,
      zoom: match ? Number(match[3]) : null,
      frame: frame ? {
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
      } : null,
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

async function testBothIllustratedEditionsOptIntoInlineZoom(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const nycPage = await openArticle(context, origin);
  assert(await nycPage.locator(INLINE_SELECTOR).count() === 34, 'NYC did not expose all 34 inline sheets');
  await nycPage.close();

  const mobPage = await context.newPage();
  await mobPage.goto(`${origin}${MOB_ARTICLE_PATH}`, { waitUntil: 'domcontentloaded' });
  await mobPage.waitForFunction(
    (selector) => document.querySelector(selector)?.dataset.pressInlineImageZoom === 'true',
    MOB_INLINE_SELECTOR,
  );
  assert(await mobPage.locator(MOB_INLINE_SELECTOR).count() === 31, 'Mob Ties did not expose all 31 inline plates');
  const historyBefore = await mobPage.evaluate(() => window.history.length);
  const point = await imagePoint(mobPage, MOB_INLINE_SELECTOR, 0.62, 0.38);
  await mobPage.touchscreen.tap(point.x, point.y);
  await mobPage.waitForTimeout(35);
  await mobPage.touchscreen.tap(point.x, point.y);
  await mobPage.waitForTimeout(80);
  const state = await readInlineState(mobPage, MOB_INLINE_SELECTOR);
  assert(state.active && Math.abs(state.zoom - 2.8) < 0.001, 'Mob Ties double tap did not zoom inline');
  assert(state.lightboxes === 0 && state.historyLength === historyBefore, 'Mob Ties used the modal/history path');
  await context.close();
  console.log('✓ Runtime: all 34 NYC sheets and 31 Mob Ties plates opt into inline zoom');
}

async function testInlineDoubleTapPinchPanAndCleanup(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await openArticle(context, origin);
  const point = await imagePoint(page, INLINE_SELECTOR, 0.3, 0.3);
  const historyBefore = await page.evaluate(() => window.history.length);

  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(35);
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(80);

  const opened = await readInlineState(page);
  assert(opened.active, 'Double tap did not activate inline zoom');
  assert(opened.lightboxes === 0, 'Inline double tap incorrectly opened a modal lightbox');
  assert(opened.historyLength === historyBefore && !opened.historyMarked, 'Inline double tap changed browser history');
  assert(opened.doneButtons === 1, 'Inline double tap did not expose one Done control');
  assert(Math.abs(opened.zoom - 2.8) < 0.001, `Double tap zoom was ${opened.zoom}, expected 2.8`);

  const frameRect = opened.frame || point.rect.frame || point.rect;
  const centerX = frameRect.left + frameRect.width / 2;
  const centerY = frameRect.top + frameRect.height / 2;
  const localX = point.x - centerX;
  const localY = point.y - centerY;
  const maxPanX = Math.max(0, (point.rect.width * 2.8 - frameRect.width) / 2);
  const maxPanY = Math.max(0, (point.rect.height * 2.8 - frameRect.height) / 2);
  const expectedPanX = Math.min(Math.max(localX * (1 - 2.8), -maxPanX), maxPanX);
  const expectedPanY = Math.min(Math.max(localY * (1 - 2.8), -maxPanY), maxPanY);
  assert(Math.abs(opened.panX - expectedPanX) < 4, `Focal pan X was ${opened.panX}, expected ${expectedPanX}`);
  assert(Math.abs(opened.panY - expectedPanY) < 4, `Focal pan Y was ${opened.panY}, expected ${expectedPanY}`);

  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(35);
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(230);
  const resetAfterDoubleTap = await readInlineState(page);
  assert(!resetAfterDoubleTap.active && resetAfterDoubleTap.doneButtons === 0, 'Second double tap did not clean up inline zoom');

  const center = await imagePoint(page, INLINE_SELECTOR, 0.5, 0.5);
  const firstX = center.x - 20;
  const secondX = center.x + 20;
  await dispatchTouchPointer(page, INLINE_SELECTOR, 'pointerdown', 31, firstX, center.y, true);
  await dispatchTouchPointer(page, INLINE_SELECTOR, 'pointerdown', 32, secondX, center.y, false);
  await dispatchTouchPointer(page, INLINE_SELECTOR, 'pointermove', 32, center.x + 420, center.y, false);
  await page.waitForTimeout(40);
  const pinched = await readInlineState(page);
  assert(pinched.active, 'Pinch did not activate inline zoom');
  assert(pinched.zoom === 8, `Pinch zoom was ${pinched.zoom}, expected the 8x clamp`);
  assert(pinched.lightboxes === 0 && pinched.historyLength === historyBefore, 'Pinch used the modal/history path');

  await dispatchTouchPointer(page, INLINE_SELECTOR, 'pointerup', 32, center.x + 420, center.y, false);
  const beforePan = await readInlineState(page);
  await dispatchTouchPointer(page, INLINE_SELECTOR, 'pointermove', 31, firstX + 20, center.y + 10, true);
  await page.waitForTimeout(40);
  const afterPan = await readInlineState(page);
  assert(afterPan.panX > beforePan.panX + 20, 'One-finger pan did not apply the configured touch sensitivity');
  assert(afterPan.panY > beforePan.panY + 10, 'One-finger vertical pan did not apply the configured touch sensitivity');
  await dispatchTouchPointer(page, INLINE_SELECTOR, 'pointerup', 31, firstX + 20, center.y + 10, true);

  await page.locator('.press-inline-image-zoom__done').click();
  await page.waitForTimeout(230);
  const cleaned = await readInlineState(page);
  assert(!cleaned.active, 'Done did not clear the inline active state');
  assert(cleaned.doneButtons === 0, 'Done control was not removed during cleanup');
  assert(cleaned.transform === '', 'Cleanup left an inline image transform behind');
  assert(cleaned.lightboxes === 0 && cleaned.historyLength === historyBefore, 'Cleanup changed modal/history state');

  await context.close();
  console.log('✓ Runtime: inline double tap preserves focal point; pinch clamps at 8x; pan and cleanup execute');
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
  console.log('✓ Runtime: keyboard and fine-pointer mouse activation keep the accessible lightbox');
}

async function testAllMobileHomepageHeroesKeepOneScrim(browser, origin) {
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
    const state = await page.evaluate(() => {
      const active = document.querySelector('.lead-panel.is-active');
      const body = active?.querySelector('.lead-panel__body');
      const media = active?.querySelector('.lead-panel__media');
      const image = media?.querySelector('img');
      const imageRect = image?.getBoundingClientRect();
      return {
        activePanels: document.querySelectorAll('.lead-panel.is-active').length,
        bodyBackgroundImage: body ? getComputedStyle(body).backgroundImage : null,
        bodyBackgroundColor: body ? getComputedStyle(body).backgroundColor : null,
        mediaScrim: media ? getComputedStyle(media, '::after').backgroundImage : null,
        imageVisible: Boolean(imageRect?.width && imageRect?.height),
      };
    });
    assert(state.activePanels === 1 && state.imageVisible, `Homepage hero ${index + 1} did not render as the sole active panel`);
    assert(state.bodyBackgroundImage === 'none', `Homepage hero ${index + 1} retained the duplicate body gradient`);
    assert(state.bodyBackgroundColor === 'rgba(0, 0, 0, 0)', `Homepage hero ${index + 1} retained an opaque body scrim`);
    assert(state.mediaScrim && state.mediaScrim !== 'none', `Homepage hero ${index + 1} lost the single readability scrim`);
  }

  await context.close();
  console.log('✓ Runtime: all seven mobile homepage heroes render with one readability scrim');
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
    await testBothIllustratedEditionsOptIntoInlineZoom(browser, server.origin);
    await testInlineDoubleTapPinchPanAndCleanup(browser, server.origin);
    await testKeyboardAndMouseKeepAccessibleLightbox(browser, server.origin);
    await testAllMobileHomepageHeroesKeepOneScrim(browser, server.origin);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(`Mobile interaction runtime failure: ${error.stack || error.message}`);
  process.exitCode = 1;
});
