const { test, expect } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path');
const review = path.resolve(__dirname, '../../../.impeccable/review');
test('managed homepage articles stay readable and link to the same published archive stories', async ({ page, request }) => {
  fs.mkdirSync(review, { recursive:true });
  const articles = (await (await request.get('/api/content/news')).json()).filter(post => post.category === 'Article' && post.published !== false);
  const errors=[]; page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height:900 }); await page.goto('/');
    const faq = page.locator('.wp-home-faq');
    await expect(faq.locator('.elementskit-post-image-card')).toHaveCount(3);
    await faq.scrollIntoViewIfNeeded();
    await faq.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(faq.locator('.meta-date-text').first()).toHaveCSS('color', 'rgb(89, 93, 97)');
    await expect(faq.locator('a.wp-action')).toHaveCSS('color', 'rgb(255, 255, 255)');
    const geometry = await faq.evaluate(section => ({ bottom:section.getBoundingClientRect().bottom, cards:[...section.querySelectorAll('.elementskit-post-image-card')].map(card => card.getBoundingClientRect().bottom) }));
    expect(Math.max(...geometry.cards)).toBeLessThan(geometry.bottom);
    const hrefs = await faq.locator('.entry-title a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    expect(new Set(hrefs)).toEqual(new Set(articles.map(post => '/stories/' + post.id)));
    for (const href of hrefs) expect((await request.get(href)).ok()).toBe(true);
    if (width !== 768) await faq.screenshot({ path:path.join(review, 'home-articles-' + width + '.png'), animations:'disabled', style:'#masthead{visibility:hidden!important}' });
  }
  expect(errors).toEqual([]);
});
test('article edits and publication update homepage and news archive together', async ({ page, request }) => {
  const origin = 'http://127.0.0.1:4187';
  const login = await request.post('/api/admin/login', { headers:{ Origin:origin }, data:{ username:'browser-editor', password:'browser-test-password-123' } });
  expect(login.ok()).toBe(true);
  const headers = { Origin:origin, 'X-CSRF-Token':(await login.json()).csrf };
  const created = await request.post('/api/admin/content/news', { headers, data:{ title:'Managed charging guide', summary:'Article fixture.', category:'Article', date:'2026-11-17', image:'/assets/wordpress/3b0e72b663ed5c2f.webp', published:true } });
  expect(created.ok()).toBe(true); const record = await created.json();
  try {
    for (const route of ['/', '/events/articles']) {
      await page.goto(route); await expect(page.locator('.entry-title').getByRole('link', { name:record.title, exact:true })).toBeVisible();
    }
    const updated = await request.put('/api/admin/content/news/' + record.id, { headers, data:{ ...record, title:'Edited guide', published:false } });
    expect(updated.ok()).toBe(true);
    for (const route of ['/', '/events/articles']) {
      await page.goto(route); await expect(page.locator('a[href="/stories/' + record.id + '"]')).toHaveCount(0);
    }
    expect((await request.get('/stories/' + record.id)).status()).toBe(404);
  } finally { await request.delete('/api/admin/content/news/' + record.id, { headers }); }
});
