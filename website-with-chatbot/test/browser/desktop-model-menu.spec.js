const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {snapshotPublicReads}=require('./public-read-snapshot');
const review=path.resolve(__dirname,'../../../.impeccable/review');
test.beforeEach(async({page,request})=>snapshotPublicReads(page,request));

test('desktop hover opens image previews and stays open while choosing a vehicle',async({page,request})=>{
 fs.mkdirSync(review,{recursive:true});const records=await(await request.get('/api/content/models')).json();
 for(const [width,height] of [[1100,900],[1440,900],[1265,536],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto('/contact');const nav=page.locator('#wpNavigation'),menu=page.locator('#wpModelMenu');
  await expect(nav.getByRole('link',{name:'HOME',exact:true})).toHaveCount(0);
  await nav.getByRole('link',{name:'MODEL',exact:true}).hover();await expect(menu.locator('.wp-model-preview-link')).toHaveCount(records.length);
  await expect(menu.locator('img').first()).toBeVisible();await expect(menu.locator('.wp-model-preview-price').first()).toHaveText(records[0].price);
  await expect(menu.locator('a').first()).toHaveAttribute('href','/models/'+records[0].id);
  await menu.locator('a').first().hover();await expect(menu).toBeVisible();
  const rect=await menu.boundingBox(),header=await page.locator('#masthead').boundingBox();expect(rect.x).toBeGreaterThan(20);expect(rect.width).toBeLessThanOrEqual(841);expect(Math.abs(rect.x+rect.width/2-width/2)).toBeLessThan(2);expect(Math.abs(rect.y-header.height-8)).toBeLessThan(2);expect(rect.height).toBeLessThanOrEqual(Math.min(361,height*.55+1));expect(rect.y+rect.height).toBeLessThan(height-60);expect(await menu.evaluate(el=>el.scrollHeight<=el.clientHeight+2)).toBe(true);
  await page.evaluate(()=>document.fonts.ready);await page.locator('#wpModelMenu img').evaluateAll(els=>Promise.all(els.map(el=>el.decode().catch(()=>{}))));
  await page.screenshot({path:path.join(review,`desktop-model-previews-${width}.png`),animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();await expect(nav.getByRole('button',{name:'Toggle model list'})).toBeFocused();
  await nav.getByRole('link',{name:'NEWS & EVENTS',exact:true}).hover();await nav.getByRole('link',{name:'MODEL',exact:true}).hover();await expect(menu).toBeVisible();
  await nav.getByRole('link',{name:'CONTACT US',exact:true}).hover();await expect(menu).not.toBeVisible();
  await nav.getByRole('link',{name:'MODEL',exact:true}).focus();await expect(menu).toBeVisible();await nav.getByRole('button',{name:'Toggle model list'}).press('ArrowDown');await expect(menu.locator('a').first()).toBeFocused();
  await menu.locator('a').first().click();await expect(page).toHaveURL(new RegExp('/models/'+records[0].id+'$'));
  await page.getByRole('link',{name:'BYD Millennium Motors home',exact:true}).click();await expect(page).toHaveURL(/\/$/);
 }
});

test('desktop previews handle publication, sparse media, empty data and retry',async({page})=>{
 await page.setViewportSize({width:1440,height:800});
 const fixture=[{id:'atto3',name:'BYD ATTO 3',price:'From RM 125,800',published:true,images:['/missing-preview.jpg']},{id:'secret',name:'Hidden fixture',published:false,images:[]}];
 await page.route('**/api/content/models',r=>r.fulfill({json:fixture}));await page.goto('/');const link=page.locator('#wpNavigation').getByRole('link',{name:'MODEL',exact:true}),menu=page.locator('#wpModelMenu');
 await link.hover();await expect(menu.locator('.wp-model-preview-link')).toHaveCount(1);await expect(menu).not.toContainText('Hidden fixture');await expect(menu.locator('img')).toHaveAttribute('src','/assets/placeholder.svg');
 await page.route('**/api/content/models',r=>r.fulfill({json:[]}));await page.reload();await link.hover();await expect(menu).toContainText('model range is being updated');await expect(menu.locator('a')).toHaveCount(0);
 await page.route('**/api/content/models',r=>r.fulfill({status:503,json:{error:'Unavailable'}}));await page.reload();await link.hover();await expect(menu.getByRole('button',{name:'Retry previews'})).toBeVisible();await expect(menu.getByRole('link',{name:'BYD M6',exact:true})).toBeVisible();
 await page.route('**/api/content/models',r=>r.fulfill({json:fixture.slice(0,1)}));await menu.getByRole('button',{name:'Retry previews'}).click();await expect(menu.locator('.wp-model-preview-link')).toHaveCount(1);
});

test('mobile keeps the compact text list and the logo returns home',async({page})=>{
 for(const width of [360,390,605,768]){
  await page.setViewportSize({width,height:900});await page.goto('/contact');await page.getByRole('button',{name:'Open navigation'}).click();const nav=page.locator('#wpNavigation');
  await expect(nav.getByRole('link',{name:'HOME',exact:true})).toHaveCount(0);await nav.getByRole('button',{name:'Toggle model list'}).click();await expect(nav.getByRole('link',{name:'BYD M6',exact:true})).toBeVisible();await expect(nav.locator('#wpModelMenu img')).toHaveCount(0);
  await page.getByRole('button',{name:'Close navigation'}).click();await page.getByRole('link',{name:'BYD Millennium Motors home',exact:true}).click();await expect(page).toHaveURL(/\/$/);
 }
});
