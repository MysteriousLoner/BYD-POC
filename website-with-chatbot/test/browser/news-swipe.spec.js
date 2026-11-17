const { test, expect } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path');
const { snapshotPublicReads } = require('./public-read-snapshot');
test('mobile news sections show one card and support independent horizontal and keyboard browsing', async ({ page, request }) => {
  await snapshotPublicReads(page, request);
  const review = path.resolve(__dirname, '../../../.impeccable/review');
  fs.mkdirSync(review, { recursive:true });
  for (const width of [320, 390, 605, 767]) {
    await page.setViewportSize({ width, height:900 }); await page.goto('/events');
    await expect(page.locator('.wp-news-hero>img')).not.toBeVisible();
    await expect(page.locator('.wp-news-grid')).toHaveCount(3);
    for (const track of await page.locator('.wp-news-grid').all()) {
      const geometry = await track.evaluate(el => ({ width:el.clientWidth, scrollWidth:el.scrollWidth, first:el.children[0].getBoundingClientRect(), second:el.children[1].getBoundingClientRect(), snap:getComputedStyle(el).scrollSnapType }));
      expect(geometry.scrollWidth).toBeGreaterThan(geometry.width * 2.9);
      expect(Math.abs(geometry.first.width-geometry.width)).toBeLessThan(2);
      expect(geometry.second.left).toBeGreaterThanOrEqual(geometry.first.right);
      expect(geometry.snap).toBe('x mandatory');
      await track.focus(); await page.keyboard.press('ArrowRight');
      await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(10);
      // Keyboard focus reveals offscreen content without requiring a swipe gesture.
      await track.locator('.entry-title a').last().focus();
      await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(geometry.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      await page.goto('/events');
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => { image.loading='eager'; return image.decode().catch(() => {}); })); });
      await page.screenshot({ path:path.join(review,'news-swipe-phone.png'), fullPage:true, animations:'disabled' });
    }
  }
  await page.setViewportSize({ width:1440, height:900 }); await page.goto('/events');
  const track=page.locator('.wp-news-grid').first();
  expect(await track.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('.wp-news-scroll-hint').first()).not.toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => { image.loading='eager'; return image.decode().catch(() => {}); })); });
  await page.screenshot({ path:path.join(review,'news-swipe-desktop.png'), fullPage:true, animations:'disabled' });
});
