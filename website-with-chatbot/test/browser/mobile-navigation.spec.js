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
  await page.getByRole('button',{name:'MODEL',exact:true}).click();await expect(page.getByRole('button',{name:'MODEL',exact:true})).toHaveAttribute('aria-expanded','true');
  const item=nav.getByRole('link',{name:'BYD M6',exact:true});await item.scrollIntoViewIfNeeded();
  expect(await item.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
  expect(await nav.evaluate(el=>el.clientHeight<el.scrollHeight)).toBe(true);
  await page.getByRole('button',{name:'DISCOVER',exact:true}).click();await expect(page.getByRole('button',{name:'MODEL',exact:true})).toHaveAttribute('aria-expanded','false');
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
  await toggle.focus();await page.keyboard.press('Enter');await expect(nav.getByRole('link',{name:'HOME',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Close navigation'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(nav.getByRole('button',{name:'DISCOVER',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close navigation'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(nav).not.toBeVisible();await toggle.click();await page.setViewportSize({width:1440,height:900});await expect(nav).toBeVisible();await expect(page.locator('body')).not.toHaveClass(/wp-nav-open/);await expect(nav).not.toHaveAttribute('inert','');
 }
 await page.screenshot({path:path.join(review,'menu-desktop-1440.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('button',{name:'MODEL',exact:true}).click();await expect(page.locator('#wpNavigation .sub-arrow').first()).toHaveCSS('transition-duration','0s');
 await page.getByRole('link',{name:'COMPARE MODELS',exact:true}).first().click();await expect(page).toHaveURL(/\/compare$/);await expect(page.locator('#wpNavigation')).not.toBeVisible();
});
