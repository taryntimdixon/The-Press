'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/illustrated-fiction.json'))).entries;

module.exports = async function testEditorialHomepage(browser, origin) {
  for (const width of [320, 390, 768, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin);
    await page.waitForSelector('[data-edition-tools]:not([hidden])');
    assert.equal(await page.locator('[data-story]:visible').count(), 8);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      leadFit: getComputedStyle(document.querySelector('.cover-art img')).objectFit,
      leadLoaded: document.querySelector('.cover-art img').naturalWidth > 0,
      badImages: [...document.querySelectorAll('img')].filter((img) => img.complete && !img.naturalWidth).map((img) => img.src),
    }));
    assert.equal(layout.overflow, false, `Horizontal overflow at ${width}px`);
    assert.equal(layout.leadFit, 'contain');
    assert.equal(layout.leadLoaded, true);
    assert.deepEqual(layout.badImages, []);
    for (const id of ['more-from-edition', 'fantasy', 'below-the-fold', 'on-this-day', 'front-page']) {
      await page.locator(`.nav-links a[href="#${id}"]`).click();
      await page.waitForFunction((id) => document.querySelector('.nav-links [aria-current]')?.hash === `#${id}`, id);
      const geometry = await page.evaluate((id) => ({
        target: document.getElementById(id).getBoundingClientRect().top,
        nav: document.querySelector('.front-nav').getBoundingClientRect().bottom,
        atEnd: scrollY + innerHeight >= document.documentElement.scrollHeight - 2,
      }), id);
      assert(geometry.target >= geometry.nav - 2 && (geometry.target < 180 || geometry.atEnd), `Navigation obscures ${id} at ${width}: ${JSON.stringify(geometry)}`);
    }
    await page.locator('.nav-links a[href="#fantasy"]').click();
    for (const entry of registry) {
      const img = page.locator(`[data-illustrated-fiction-entry="${entry.id}"] img`);
      await img.scrollIntoViewIfNeeded();
      await img.evaluate((img) => img.decode());
      const geometry = await img.evaluate((img) => ({ width: img.clientWidth, height: img.clientHeight, fit: getComputedStyle(img).objectFit }));
      assert(Math.abs(geometry.width - geometry.height) < 1, `Non-square Fantasy art at ${width}`);
      assert.equal(geometry.fit, 'contain');
    }
    await page.locator('#on-this-day').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-history-image] img')?.naturalWidth > 0);
    assert.match(await page.locator('[data-history-link]').getAttribute('href'), /date=\d{2}-\d{2}/);
    assert.deepEqual(errors, [], `Runtime errors at ${width}px`);
    if (process.env.PRESS_QA_OUTPUT && [390, 1440].includes(width)) {
      fs.mkdirSync(process.env.PRESS_QA_OUTPUT, { recursive: true });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(process.env.PRESS_QA_OUTPUT, `frontpage-${width}.png`), fullPage: true });
      await page.screenshot({ path: path.join(process.env.PRESS_QA_OUTPUT, `frontpage-${width}-preview.png`) });
    }
    await context.close();
  }
  console.log('✓ Runtime: five responsive widths, section navigation, full Fantasy art, and daily history');

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(origin);
  await page.locator('[data-load-more]').click();
  assert.equal(await page.locator('[data-story]:visible').count(), 16);
  await page.locator('[data-filter="Technology"]').click();
  const filtered = await page.locator('[data-story]:visible').evaluateAll((cards) => cards.map((card) => card.dataset.section));
  assert(filtered.length > 0 && filtered.every((section) => section === 'Technology'));
  await page.locator('[data-filter="All"]').click();
  const button = page.locator('.cover-story [data-save]');
  await button.click();
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
  await page.reload();
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
  await page.locator('[data-show-saved]').click();
  assert.equal(await page.locator('[data-story]:visible').count(), 1);
  await page.locator('[data-story]:visible [data-save]').click();
  assert.equal(await page.locator('[data-empty]').isVisible(), true);
  await page.locator('[data-reset-filter]').click();
  assert.equal(await page.locator('[data-story]:visible').count(), 8);
  await page.locator('[data-theme]').click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  console.log('✓ Runtime: filtering, load more, saved stories across reloads, empty state, and persistent dark mode');

  await page.locator('[data-open-search]').focus();
  await page.keyboard.press('/');
  await page.waitForSelector('dialog[open]');
  await page.locator('#front-search').fill('New York');
  await page.waitForFunction(() => document.querySelector('[data-search-results]')?.textContent.includes('A Love Letter to New York'));
  await page.locator('#front-search').fill('Medusa');
  await page.waitForFunction(() => document.querySelector('[data-search-results]')?.textContent.includes('Medusa'));
  await page.locator('#front-search').fill('zzzznoresults');
  await page.waitForFunction(() => document.querySelector('[data-search-status]')?.textContent.startsWith('No stories found'));
  assert.equal(await page.locator('.search-result').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-open-search')), true);
  console.log('✓ Runtime: keyboard search, archive and Fantasy results, no results, Escape, and focus restoration');
  await context.close();

  const failure = await browser.newContext();
  const failurePage = await failure.newPage();
  let requests = 0;
  await failurePage.route('**/search-index.json', (route) => { requests++; return route.abort(); });
  await failurePage.goto(origin);
  assert.equal(requests, 0, 'Search index should load on demand');
  await failurePage.locator('[data-open-search]').click();
  await failurePage.locator('#front-search').fill('space');
  await failurePage.waitForFunction(() => document.querySelector('[data-search-status]').textContent.includes('could not load'));
  await failurePage.unroute('**/search-index.json');
  await failurePage.locator('#front-search').fill('New York');
  await failurePage.waitForFunction(() => document.querySelector('[data-search-results]').textContent.includes('A Love Letter to New York'));
  await failure.close();

  const blockedStorage = await browser.newContext();
  await blockedStorage.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  const storagePage = await blockedStorage.newPage();
  await storagePage.goto(origin);
  await storagePage.locator('.cover-story [data-save]').click();
  assert.match(await storagePage.locator('[data-save-status]').textContent(), /Storage is unavailable/);
  await blockedStorage.close();

  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noJS.newPage();
  await staticPage.goto(origin);
  assert((await staticPage.locator('[data-story]:visible').count()) >= 24);
  assert.equal(await staticPage.locator('.cover-story h2 a').getAttribute('href'), 'memory-mob-ties-the-files.html');
  assert.equal(await staticPage.locator('.fiction-card').count(), registry.length);
  await noJS.close();
  console.log('✓ Runtime: lazy search, network failure recovery, blocked storage, and useful content without JavaScript');
};
