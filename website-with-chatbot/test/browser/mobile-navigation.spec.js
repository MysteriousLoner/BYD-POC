const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const review=path.resolve(__dirname,'../../../.impeccable/review');

const {snapshotPublicReads}=require('./public-read-snapshot');
test.beforeEach(async({page,request})=>snapshotPublicReads(page,request));

test('mobile menu stays compact, scrolls independently and keeps destinations reachable',async({page})=>{
 test.setTimeout(90000);fs.mkdirSync(review,{recursive:true});
 for(const [width,height] of [[360,800],[390,844],[605,804],[768,900],[844,390],[1024,768]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.evaluate(()=>scrollTo(0,500));
  const initial=await page.evaluate(()=>scrollY),header=page.locator('#masthead'),nav=page.locator('#wpNavigation');
  await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('button',{name:'Close navigation'})).toHaveText('Close');
  const bounds=await nav.boundingBox(),headerBounds=await header.boundingBox();expect(bounds.y).toBeGreaterThanOrEqual(headerBounds.y+headerBounds.height);expect(bounds.y+bounds.height).toBeLessThan(height);expect(bounds.height).toBeLessThanOrEqual(height*.65+1);expect(bounds.height).toBeGreaterThan(100);expect(bounds.width).toBeLessThan(width);
  await page.mouse.move(width/2,height-5);await page.mouse.wheel(0,300);expect(await page.evaluate(()=>scrollY)).toBe(initial);
  await expect(nav.getByRole('button',{name:'Toggle model list',exact:true})).not.toBeVisible();await expect(page.locator('#wpModelMenu')).not.toBeVisible();
  await page.getByRole('button',{name:'DISCOVER',exact:true}).click();
  const item=nav.getByRole('link',{name:'CAREER WITH US',exact:true});await item.scrollIntoViewIfNeeded();
  expect(await item.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
  if(height<500)expect(await nav.evaluate(el=>el.clientHeight<el.scrollHeight)).toBe(true);
  await nav.getByRole('link',{name:'CAREER WITH US',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(review,`menu-expanded-${width}.png`),animations:'disabled'});
  await page.getByRole('button',{name:'Close navigation'}).click();await expect(nav).not.toBeVisible();expect(await page.evaluate(()=>scrollY)).toBe(initial);await expect(page.locator('#main')).not.toHaveAttribute('inert','');
  await page.getByRole('button',{name:'Open navigation'}).click();await page.setViewportSize({width,height:height+20});await expect(nav).toBeVisible();
  await page.locator('.wp-nav-backdrop').click({position:{x:4,y:height-100}});await expect(nav).not.toBeVisible();await expect(page.getByRole('button',{name:'Open navigation'})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('menu works across public routes with keyboard focus and returns to desktop navigation',async({page})=>{
 test.setTimeout(60000);for(const url of ['/','/models','/compare','/contact','/careers','/events','/models/atto3']){
  await page.setViewportSize({width:390,height:844});await page.goto(url);const toggle=page.getByRole('button',{name:'Open navigation'}),nav=page.locator('#wpNavigation');
  await toggle.focus();await page.keyboard.press('Enter');await expect(nav.getByRole('link',{name:'MODEL',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Close navigation'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(nav.getByRole('button',{name:'DISCOVER',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close navigation'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(nav).not.toBeVisible();await toggle.click();await page.setViewportSize({width:1440,height:900});await expect(nav).toBeVisible();await expect(page.locator('body')).not.toHaveClass(/wp-nav-open/);await expect(nav).not.toHaveAttribute('inert','');
 }
 await page.screenshot({path:path.join(review,'menu-desktop-1440.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('button',{name:'DISCOVER',exact:true}).click();await expect(page.locator('#wpNavigation [role=button] .sub-arrow')).toHaveCSS('transition-duration','0s');
 await page.locator('#wpNavigation').getByRole('link',{name:'MODEL',exact:true}).click();await expect(page).toHaveURL(/\/models$/);await expect(page.locator('#wpNavigation')).not.toBeVisible();
});

test('MODEL opens catalogue directly on mobile and keeps its separate desktop arrow',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/');
  if(width<1025)await page.getByRole('button',{name:'Open navigation'}).click();
  const nav=page.locator('#wpNavigation'),link=nav.getByRole('link',{name:'MODEL',exact:true}),arrow=nav.getByRole('button',{name:'Toggle model list'});
  await expect(link).toHaveAttribute('href','/models');if(width<1025){await expect(arrow).not.toBeVisible();await link.click();await expect(page).toHaveURL(/\/models$/);continue;}await expect(arrow).toHaveAttribute('aria-controls','wpModelMenu');
  const bounds=await arrow.boundingBox();expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);
  await arrow.click();await expect(page).toHaveURL(/\/$/);await expect(arrow).toHaveAttribute('aria-expanded','true');await expect(nav.getByRole('link',{name:'BYD M6',exact:true})).toBeVisible();
  await page.screenshot({path:path.join(review,`menu-split-model-${width}.png`),animations:'disabled'});
  await arrow.focus();await page.keyboard.press('Escape');await expect(arrow).toHaveAttribute('aria-expanded','false');await arrow.focus();await page.keyboard.press('ArrowDown');await expect(nav.getByRole('link',{name:'BYD SEALION',exact:true})).toBeFocused();
  await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/models$/);await expect(page.locator('.wp-model-card').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
