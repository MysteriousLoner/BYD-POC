const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {snapshotPublicReads}=require('./public-read-snapshot');
const review=path.resolve(__dirname,'../../../.impeccable/review');
test.beforeEach(async({page,request})=>snapshotPublicReads(page,request));

test('news hover shows latest published stories and preserves direct navigation and keyboard controls',async({page})=>{
 const fixture=[
  {id:'hidden',title:'Hidden fixture',date:'2027-01-01',published:false},
  {id:'byd-year-end-deals-2026',title:'Fixture older',date:'2026-10-01',category:'Event',published:true},
  {id:'byd-coffee-rave-session',title:'Fixture middle',date:'2026-11-05',category:'News',published:true},
  {id:'byd-year-end-carnival-2026',title:'Fixture newest',date:'2026-11-10',category:'Event',image:'/assets/wordpress/d8888fcc8e26ec7d.webp',published:true},
  {id:'fourth',title:'Fixture excluded fourth',date:'2025-01-01',published:true}
 ];
 await page.route('**/api/content/news',r=>r.fulfill({json:fixture}));await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const nav=page.locator('#wpNavigation'),link=nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}),menu=page.locator('#wpNewsMenu');
 await link.hover();await expect(menu.locator('.wp-news-preview-link')).toHaveCount(3);await expect(menu.locator('.wp-news-preview-title')).toHaveText(['Fixture newest','Fixture middle','Fixture older']);await expect(menu).not.toContainText('Hidden fixture');await expect(menu).not.toContainText('Fixture excluded fourth');await expect(menu.locator('.wp-model-preview-price').first()).toContainText('Event');await expect(menu.locator('.wp-model-preview-price').first()).toContainText('2026');
 await menu.locator('.wp-news-preview-link').first().hover();await expect(menu).toBeVisible();await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();await expect(nav.getByRole('button',{name:'Toggle news and events'})).toBeFocused();
 await link.focus();await expect(menu).toBeVisible();await nav.getByRole('button',{name:'Toggle news and events'}).press('ArrowDown');await expect(menu.locator('.wp-news-preview-link').first()).toBeFocused();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/stories\/byd-year-end-carnival-2026$/);
 await page.goto('/');await link.hover();await expect(menu).toBeVisible();await menu.getByRole('link',{name:'View all news & events'}).click();await expect(page).toHaveURL(/\/events$/);await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/events$/);
});

test('desktop preview switching does not leave overlapping panels or close the newly opened panel',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');const nav=page.locator('#wpNavigation'),models=page.locator('#wpModelMenu'),news=page.locator('#wpNewsMenu');
 await nav.getByRole('link',{name:'MODEL',exact:true}).hover();await expect(models).toBeVisible();await nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}).hover();await expect(news.locator('.wp-news-preview-link')).toHaveCount(3);await expect(models).not.toBeVisible();
 await news.locator('.wp-news-preview-link').first().hover();await expect(news).toBeVisible();await news.locator('.wp-news-preview-link').first().press('Tab');await expect(news).toBeVisible();
 await nav.getByRole('link',{name:'MODEL',exact:true}).focus();await expect(models).toBeVisible();await expect(news).not.toBeVisible();await nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}).focus();await expect(news).toBeVisible();await expect(models).not.toBeVisible();
 await nav.getByRole('link',{name:'CONTACT US',exact:true}).focus();await expect(news).not.toBeVisible();await nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}).hover();await expect(news).toBeVisible();await page.locator('#main').click({position:{x:8,y:500}});await expect(news).not.toBeVisible();
});

test('news menu handles errors, empty/legacy data, missing images and long labels',async({page})=>{
 await page.setViewportSize({width:1265,height:536});await page.route('**/api/content/news',r=>r.fulfill({status:503,json:{error:'Fixture unavailable'}}));await page.goto('/');const nav=page.locator('#wpNavigation'),link=nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}),menu=page.locator('#wpNewsMenu');
 await link.hover();await expect(menu.getByRole('button',{name:'Retry news previews'})).toBeVisible();await expect(menu.getByRole('link',{name:'View all news & events'})).toBeVisible();
 await page.route('**/api/content/news',r=>r.fulfill({json:[]}));await menu.getByRole('button',{name:'Retry news previews'}).click();await expect(menu).toContainText('No news or events have been published yet.');await expect(menu.getByRole('link',{name:'View all news & events'})).toBeFocused();
 await page.route('**/api/content/news',r=>r.fulfill({json:[{id:'byd-year-end-carnival-2026',title:'A very long managed story title '.repeat(10),date:'2026-10-27',image:'/missing-news-image.jpg'}]}));await page.reload();await link.hover();await expect(menu.locator('.wp-news-preview-link')).toHaveCount(1);await expect(menu.locator('img')).toHaveAttribute('src','/assets/placeholder.svg');await expect(menu.locator('.wp-news-preview-title')).toHaveCSS('-webkit-line-clamp','2');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('news preview stays compact across desktop sizes and becomes a direct mobile link',async({page})=>{
 test.setTimeout(90000);fs.mkdirSync(review,{recursive:true});
 for(const [width,height]of [[1100,900],[1440,900],[1265,536],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto('/contact');await page.locator('#wpNavigation').getByRole('link',{name:'NEWS & EVENTS',exact:true}).hover();const menu=page.locator('#wpNewsMenu');await expect(menu.locator('.wp-news-preview-link')).toHaveCount(3);
  const rect=await menu.boundingBox(),first=await menu.locator('.wp-news-preview-link').nth(0).boundingBox(),last=await menu.locator('.wp-news-preview-link').nth(2).boundingBox();expect(rect.x).toBe(0);expect(Math.round(rect.width)).toBe(width);expect(rect.height).toBeLessThanOrEqual(Math.min(361,height*.55+1));expect(last.x+last.width-first.x).toBeLessThanOrEqual(809);
  await page.locator('#wpNewsMenu img').evaluateAll(items=>Promise.all(items.map(el=>el.decode().catch(()=>{}))));await page.evaluate(()=>document.fonts.ready);expect(await page.locator('#masthead .elementor-button-text').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return new Set([...range.getClientRects()].map(rect=>Math.round(rect.y))).size})).toBe(1);await page.screenshot({path:path.join(review,`news-preview-${width}.png`),animations:'disabled'});
 }
 let newsReads=0;page.on('request',request=>{if(request.url().endsWith('/api/content/news'))newsReads++});
 for(const width of [360,390,605,768,1024]){
  await page.setViewportSize({width,height:900});await page.goto('/');await page.getByRole('button',{name:'Open navigation'}).click();const nav=page.locator('#wpNavigation');await expect(nav.getByRole('button',{name:'Toggle news and events'})).not.toBeVisible();await expect(page.locator('#wpNewsMenu')).not.toBeVisible();await expect(nav.getByRole('button',{name:'Toggle model list'})).not.toBeVisible();
  if(width===390)await page.screenshot({path:path.join(review,'news-direct-mobile-390.png'),animations:'disabled'});
  await nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}).click();await expect(page).toHaveURL(/\/events$/);await page.waitForLoadState('load');await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`events overflow at ${width}px`).toBe(true);
 }
 expect(newsReads).toBe(0);
});
