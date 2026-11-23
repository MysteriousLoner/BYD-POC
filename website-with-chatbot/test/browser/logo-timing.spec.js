const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const review=path.resolve(__dirname,'../../../.impeccable/review');
test('first visits show the logo for one second and restore access to the page',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/contact',{waitUntil:'domcontentloaded'});
  const overlay=page.locator('.wp-page-transition');
  await expect(overlay).toBeVisible();
  expect(await page.locator('#main').evaluate(el=>el.inert)).toBe(true);
  await page.waitForTimeout(500); // Observe the requested minimum, not an arbitrary readiness wait.
  await expect(overlay).toBeVisible();
  fs.mkdirSync(review,{recursive:true});await page.screenshot({path:path.join(review,'logo-one-second-hold.png'),animations:'disabled'});
  await expect(overlay).not.toBeVisible();
  const elapsed=await page.evaluate(()=>Date.now()-performance.timing.domContentLoadedEventStart);
  expect(elapsed).toBeGreaterThanOrEqual(950);expect(elapsed).toBeLessThan(1750);
  expect(await page.locator('#main').evaluate(el=>el.inert)).toBe(false);
  await expect(page.locator('html')).not.toHaveAttribute('aria-busy','true');
});
test('ordinary internal navigation shares a one-second interval across documents',async({page})=>{
  await page.goto('/');await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  const started=Date.now();
  await page.locator('#wpNavigation').getByRole('link',{name:'CONTACT US',exact:true}).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator('.wp-page-transition')).toBeVisible();
  await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  const elapsed=Date.now()-started;
  expect(elapsed).toBeGreaterThanOrEqual(950);expect(elapsed).toBeLessThan(1750);
  await page.goBack();await expect(page.locator('.wp-page-transition')).not.toBeVisible();
});
test('a slow destination does not add another second after it arrives',async({page})=>{
  await page.goto('/');await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  await page.route('**/contact',async route=>{await new Promise(resolve=>setTimeout(resolve,1400));await route.continue()});
  const started=Date.now();await page.locator('#wpNavigation').getByRole('link',{name:'CONTACT US',exact:true}).click();
  await expect(page).toHaveURL(/\/contact$/);await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  const elapsed=Date.now()-started;expect(elapsed).toBeGreaterThanOrEqual(1400);expect(elapsed).toBeLessThan(2200);
});
test('reduced motion keeps the static one second logo and unavailable storage remains usable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new Error('Storage is disabled')}}));
  await page.goto('/about',{waitUntil:'domcontentloaded'});await expect(page.locator('.wp-page-transition')).toBeVisible();
  await page.waitForTimeout(500);await expect(page.locator('.wp-page-transition')).toBeVisible();await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  await expect(page.getByRole('heading',{name:'ABOUT US',exact:true})).toBeVisible();
});
