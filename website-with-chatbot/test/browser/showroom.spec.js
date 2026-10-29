const { test, expect } = require('@playwright/test');
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs');
const reviewDir = path.resolve(__dirname,'../../../.impeccable/review');
async function settleImages(page) { await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); })); }); }
let authCookies;
async function login(page) {
  if (authCookies) { await page.context().addCookies(authCookies); await page.goto('/admin'); await expect(page.locator('#vehicleMetric')).not.toHaveText('—'); return; }
  await page.goto('/admin/login'); await page.getByLabel('Username').fill('browser-editor'); await page.getByLabel('Password').fill('browser-test-password-123'); await page.getByRole('button',{name:'Sign in'}).click(); await expect(page.locator('#vehicleMetric')).not.toHaveText('—'); authCookies=await page.context().cookies();
}
async function adminNav(page, selector) { if (await page.locator('#adminMenuToggle').isVisible()) await page.locator('#adminMenuToggle').click(); await page.locator(selector).first().click(); }
async function fixture(width,height,orientation) {
  let img = sharp({create:{width,height,channels:3,background:'#668cae'}}); if(orientation) img=img.withMetadata({orientation}); return img.jpeg().toBuffer();
}
test('catalogue colours change real images; details open and reload as independent pages',async ({page}) => {
  await page.goto('/models');
  const card = page.locator('[data-car=atto3]'); await expect(card).toBeVisible(); const image = card.locator('img'); await expect(image).toHaveAttribute('src','/assets/atto3-blue.webp');
  await card.getByRole('button',{name:'Ski White'}).click(); await expect(image).toHaveAttribute('src','/assets/atto3-white.webp'); await expect(card.locator('.colour-label')).toHaveText('Ski White');
  await card.getByRole('link',{name:'Explore model',exact:true}).click(); await expect(page).toHaveURL(/\/models\/atto3$/); await expect(page.getByRole('heading',{name:'BYD Atto 3',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Ski White'}).click(); await expect(page.locator('#detailImage')).toHaveAttribute('src','/assets/atto3-white.webp');
  await page.reload(); await expect(page.locator('#detailSpecs')).toContainText('480 km');
  await page.getByRole('link',{name:'Enquire about this model'}).click(); await expect(page.locator('#enquiryModel')).toHaveValue('BYD Atto 3');
  await page.goto('/models/seal'); await expect(page.getByRole('heading',{name:'Model unavailable.'})).toBeVisible();
});
test('dedicated comparison supports selection, replacement and navigation',async ({page}) => {
  await page.goto('/models'); await expect(page.locator('[data-compare], #comparisonTray')).toHaveCount(0);
  await page.getByRole('link',{name:'Compare models'}).click();
  await page.locator('[data-slot="0"]').selectOption('atto3'); await page.locator('[data-slot="1"]').selectOption('dolphin');
  await expect(page).toHaveURL(/models=atto3,dolphin/); await expect(page.locator('.compare-rows')).toContainText('480 km'); await expect(page.locator('.compare-rows')).toContainText('427 km');
  await expect(page.locator('[data-slot="1"] option[value=atto3]')).toHaveAttribute('disabled','');
  await page.locator('[data-slot="1"]').selectOption(''); await expect(page.locator('.compare-rows')).toContainText('Choose a second vehicle');
  await page.locator('[data-slot="1"]').selectOption('dolphin'); await page.goto('/'); await page.goto('/compare'); await expect(page.locator('[data-slot="1"]')).toHaveValue('dolphin');
  await page.goto('/compare?models=seal,atto3'); await expect(page.locator('.compare-heading')).toContainText('unavailable model was removed'); await expect(page.locator('[data-slot="0"]')).toHaveValue('atto3');
  await page.goto('/compare?models=atto3,atto3'); await expect(page.locator('.compare-rows')).toContainText('Choose a second vehicle');
});
test('mobile navigation and chatbot remain usable',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/'); await page.getByRole('button',{name:'Menu'}).click(); await expect(page.locator('#mainNav')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.locator('#mainNav')).not.toBeVisible();
  await page.getByRole('button',{name:'Menu',exact:true}).click(); await page.locator('#chatbotToggle').click();
  const panel = await page.locator('#chatbotPanel').boundingBox(); expect(panel.x).toBeGreaterThanOrEqual(0); expect(panel.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Escape'); await expect(page.locator('#chatbotWidget')).not.toHaveClass(/open/);
});
test('career branch is required, successful application clears form and errors preserve input',async ({page}) => {
  await page.goto('/careers'); const form = page.locator('#careerForm'); await expect(form.locator('[name=branchId]')).toBeEnabled();
  await form.getByLabel('Full name').fill('Browser Applicant'); await form.getByLabel('Email address').fill('browser@example.test'); await form.getByLabel('Position of interest').fill('Sales'); await form.getByLabel('Preferred branch').selectOption('cheras');
  await form.locator('input[type=file]').setInputFiles({name:'resume.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 Test only')});
  await page.route('**/api/content/careers',route => route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Please try again.'})}));
  await form.getByRole('button',{name:'Submit application'}).click(); await expect(form.locator('.form-status')).toContainText('Please try again.'); await expect(form.getByLabel('Full name')).toHaveValue('Browser Applicant'); await expect(form.getByLabel('Preferred branch')).toHaveValue('cheras');
  await page.unroute('**/api/content/careers'); await form.getByRole('button',{name:'Submit application'}).click(); await expect(form.locator('.form-status')).toContainText('Application received'); await expect(form.getByLabel('Full name')).toHaveValue('');
});
test('vehicle editor adds and persists ordered custom fields and colour photos on mobile',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await login(page); await adminNav(page, '[data-page=vehicles]'); await page.locator('.vehicle-card').filter({has:page.getByRole('heading',{name:'BYD Atto 3',exact:true})}).getByRole('button',{name:'Edit details'}).click();
  await expect(page.locator('#vehicleModal')).toBeVisible(); await expect(page.locator('#specificationRows .spec-editor-row')).toHaveCount(4);
  await page.getByRole('button',{name:'Add specification',exact:true}).click(); const row = page.locator('.spec-editor-row').last(); await row.getByLabel('Label',{exact:true}).fill('Browser test field'); await row.getByLabel('Value',{exact:true}).fill('Test fixture'); await row.getByLabel('Group (optional)').fill('Test only');
  await page.getByRole('button',{name:'Add colour',exact:true}).click(); const colour = page.locator('.colour-editor-row').last(); await colour.getByLabel('Colour name').fill('Fixture colour'); await colour.getByLabel('Image URLs (one per line)').fill('/assets/atto3-blue.webp');
  await page.getByRole('button',{name:'Save vehicle',exact:true}).click(); await expect(page.locator('#vehiclesPage')).toBeVisible();
  await page.locator('.vehicle-card').filter({has:page.getByRole('heading',{name:'BYD Atto 3',exact:true})}).getByRole('button',{name:'Edit details'}).click(); await expect(page.locator('.spec-editor-row')).toHaveCount(5); await expect(page.locator('.colour-editor-row')).toHaveCount(3);
  await page.locator('.spec-editor-row').last().getByRole('button',{name:'Remove',exact:true}).click(); await page.locator('.colour-editor-row').last().getByRole('button',{name:'Remove',exact:true}).click(); await page.getByRole('button',{name:'Save vehicle',exact:true}).click(); await expect(page.locator('#vehiclesPage')).toBeVisible();
});
test('event image warnings account for orientation and remain advisory when saving',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await login(page); await adminNav(page, '[data-editor=events]'); await page.getByRole('button',{name:'Add story',exact:true}).click(); await expect(page.locator('#eventForm [name=title]')).toBeFocused(); await expect(page.locator('#eventForm [name=title]')).toBeInViewport(); fs.mkdirSync(reviewDir,{recursive:true}); await page.screenshot({path:path.join(reviewDir,'add-story-mobile.png'),animations:'disabled'}); const form = page.locator('#eventForm'); await expect(form).toBeVisible();
  for (const [width,height,orientation,warning] of [[450,800,undefined,true],[500,500,undefined,true],[800,450,undefined,false],[800,450,6,true]]) {
    await form.locator('[name=imageFile]').setInputFiles({name:'orientation.jpg',mimeType:'image/jpeg',buffer:await fixture(width,height,orientation)});
    await expect(page.locator('#eventImageDimensions')).toContainText('px'); if (warning) await expect(page.locator('#eventOrientationWarning')).toBeVisible(); else await expect(page.locator('#eventOrientationWarning')).toBeHidden();
  }
  await form.getByLabel('Story title').fill('Browser orientation fixture'); await form.getByLabel('Summary').fill('Browser test only.'); await form.locator('[name=published]').uncheck(); await form.getByRole('button',{name:'Save story'}).click();
  await expect(page.locator('.event-admin-row').filter({hasText:'Browser orientation fixture'})).toBeVisible();
  await page.locator('.event-admin-row').filter({hasText:'Browser orientation fixture'}).getByRole('button',{name:'Edit',exact:true}).click(); await expect(page.locator('#eventOrientationWarning')).toBeVisible();
  page.once('dialog',dialog => dialog.accept()); await page.locator('.event-admin-row').filter({hasText:'Browser orientation fixture'}).getByRole('button',{name:'Delete',exact:true}).click(); await expect(page.locator('.event-admin-row').filter({hasText:'Browser orientation fixture'})).toHaveCount(0);
});
test('loading failures and empty states offer recovery without stale fabricated content',async ({page}) => {
  await page.route('**/api/content/models',route => route.fulfill({status:503,contentType:'application/json',body:'{"error":"Unavailable"}'})); await page.goto('/'); await expect(page.locator('#featuredGrid')).toContainText('couldn’t load'); await page.unroute('**/api/content/models'); await page.getByRole('button',{name:'Reload models'}).click(); await expect(page.locator('#featuredGrid .featured-card')).toHaveCount(2);
  await page.route('**/api/content/news',route => route.fulfill({contentType:'application/json',body:'[]'})); await page.goto('/events'); await expect(page.locator('#newsGrid')).toContainText('No stories here yet');
  await page.route('**/api/content/branches',route => route.fulfill({contentType:'application/json',body:'[]'})); await page.goto('/careers'); await expect(page.locator('#careerForm [name=branchId]')).toBeDisabled(); await expect(page.locator('#careerForm button[type=submit]')).toBeDisabled();
});
test('responsive route and editor captures across requested widths',async ({page}) => {
  test.setTimeout(180000); fs.mkdirSync(reviewDir,{recursive:true}); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  for (const width of [360,390,605,768,1440]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    for (const [route,name,ready] of [['/','home','#featuredGrid .featured-card'],['/models','models','[data-car=atto3]'],['/models/atto3','model','#detailSpecs'],['/compare?models=atto3,dolphin','compare','.comparison-row'],['/events','events','.event-card'],['/contact','contact','#enquiryModel'],['/careers','careers','[name=branchId]'],['/admin/login','login','#loginForm']]) {
      await page.goto(route); await expect(page.locator(ready).first()).toBeVisible(); await settleImages(page); if(route==='/') await page.getByRole('button',{name:'Pause homepage slideshow',exact:true}).click(); await page.mouse.move(0,0); await page.evaluate(()=>window.scrollTo(0,0));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflow ${width}`).toBe(true);
      await page.screenshot({path:path.join(reviewDir,`${name}-${width}.png`),fullPage:true,animations:'disabled'});
    }
    await login(page); await settleImages(page); await page.screenshot({path:path.join(reviewDir,`admin-${width}.png`),fullPage:true,animations:'disabled'});
    await adminNav(page,'[data-page=vehicles]'); await page.locator('.vehicle-card').filter({has:page.getByRole('heading',{name:'BYD Atto 3',exact:true})}).getByRole('button',{name:'Edit details'}).click(); await settleImages(page); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`editor overflow ${width}`).toBe(true); await page.screenshot({path:path.join(reviewDir,`vehicle-editor-${width}.png`),fullPage:true,animations:'disabled'});
    await adminNav(page,'[data-editor=events]'); await expect(page.locator('#eventForm')).toBeVisible(); await page.locator('#eventForm [name=imageFile]').setInputFiles({name:'portrait.jpg',mimeType:'image/jpeg',buffer:await fixture(450,800)}); await expect(page.locator('#eventOrientationWarning')).toBeVisible(); await settleImages(page); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`event editor overflow ${width}`).toBe(true); await page.screenshot({path:path.join(reviewDir,`events-editor-${width}.png`),fullPage:true,animations:'disabled'});
    await page.context().clearCookies();
  }
  fs.copyFileSync(path.join(reviewDir,'home-1440.png'),path.join(reviewDir,'desktop.png')); fs.copyFileSync(path.join(reviewDir,'home-390.png'),path.join(reviewDir,'mobile.png')); fs.copyFileSync(path.join(reviewDir,'home-605.png'),path.join(reviewDir,'user-605.png'));
  expect(errors).toEqual([]);
});
test('mobile admin drawer traps focus, closes on selection and restores the menu',async ({page})=>{
  await page.setViewportSize({width:360,height:844}); await login(page); await page.locator('#adminMenuToggle').click(); await expect(page.locator('#adminSidebar')).toHaveAttribute('aria-modal','true');
  await page.keyboard.press('Escape'); await expect(page.locator('#adminMenuToggle')).toBeFocused(); await page.locator('#adminMenuToggle').click(); await page.locator('[data-manager=branches]').click(); await expect(page.locator('#adminMenuToggle')).toHaveAttribute('aria-expanded','false'); await expect(page.locator('#salesPage')).toBeVisible();
});
test('campaigns respect order and duration with pause, intact portraits and video controls',async ({page})=>{
  await page.route('**/campaign-portrait.jpg',async route=>route.fulfill({contentType:'image/jpeg',body:await fixture(450,800)}));
  const slides=[{id:'portrait',published:true,priority:1,duration:3000,headline:'Portrait campaign fixture',mediaType:'image',mediaUrl:'/campaign-portrait.jpg',buttons:[{label:'Ask our team',href:'#contact'}]},{id:'video',published:true,priority:2,duration:3000,headline:'Video campaign fixture',mediaType:'video',mediaUrl:'https://youtu.be/OldTHqPji78',buttons:[]}];
  await page.route('**/api/content/settings',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({heroSlides:slides})})); await page.goto('/'); await expect(page.locator('#heroTitle')).toHaveText('Portrait campaign fixture'); await expect(page.getByRole('link',{name:'Ask our team'})).toHaveAttribute('href','/contact'); await page.setViewportSize({width:390,height:844}); await settleImages(page); expect(await page.locator('#heroBackground img').evaluate(img=>getComputedStyle(img).objectFit)).toBe('contain'); await page.screenshot({path:path.join(reviewDir,'campaign-portrait-390.png'),fullPage:false});
  await page.getByRole('button',{name:'Pause homepage slideshow',exact:true}).click(); await page.waitForTimeout(3200); await expect(page.locator('#heroTitle')).toHaveText('Portrait campaign fixture');
  await page.getByRole('button',{name:'Show slide 2: Video campaign fixture'}).click(); await page.getByRole('button',{name:'Play Video campaign fixture'}).click(); await expect(page.locator('#heroBackground iframe')).toHaveAttribute('src',/youtube-nocookie/); await page.screenshot({path:path.join(reviewDir,'campaign-video-390.png')});
  await page.getByRole('button',{name:'Show slide 1: Portrait campaign fixture'}).click(); await page.getByRole('button',{name:'Resume homepage slideshow',exact:true}).click(); await page.locator('.showroom-hero').scrollIntoViewIfNeeded(); await page.evaluate(() => document.activeElement.blur()); await page.mouse.move(0,0); await expect(page.locator('#heroTitle')).toHaveText('Video campaign fixture',{timeout:6000});
});
test('single, empty, missing media and long specification states remain usable',async ({page})=>{
  const records=await (await page.request.get('/api/content/models')).json(); records[0].image='/assets/missing.jpg'; records[0].images=['/assets/missing.jpg']; records[0].colours=[]; records[0].specifications=[{key:'long',label:'A specification label that wraps over several lines',value:'A very long specification value with details for mobile comparison',group:'Dimensions'}];
  await page.route('**/api/content/models',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([records[0]])})); await page.goto('/models'); await expect(page.locator('.single-model .model-card')).toHaveCount(1); await expect(page.locator('.car-photo img')).toHaveAttribute('src','/assets/placeholder.svg');
  await page.goto('/compare?models=atto3'); await expect(page.locator('.compare-rows')).toContainText('Two published models');
  await page.route('**/api/content/models',route=>route.fulfill({contentType:'application/json',body:'[]'})); await page.goto('/models'); await expect(page.locator('#modelsGrid')).toContainText('line-up is being updated');
});
test('legacy home anchors preserve model enquiry preselection',async ({page})=>{
  await page.goto('/?model=atto3#contact'); await expect(page).toHaveURL(/\/contact\?model=atto3$/); await expect(page.locator('#enquiryModel')).toHaveValue('BYD Atto 3');
  await page.goto('/#careers'); await expect(page).toHaveURL(/\/careers$/);
});

test('shared admin surfaces retain usable layouts',async ({page})=>{
  test.setTimeout(90000); await login(page);
  for(const width of [390,1440]) { await page.setViewportSize({width,height:1000});
    for(const selector of ['hero','promotions','branches','knowledge','conversations']) { await adminNav(page, selector==='hero'?'[data-page=hero]':`[data-manager=${selector}]`); await expect(page.locator('.page.active')).not.toContainText('Loading…'); if(selector==='hero') await page.locator('.slide-list-card').first().getByRole('button',{name:'Edit',exact:true}).click(); await settleImages(page); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),selector).toBe(true); await page.screenshot({path:path.join(reviewDir,`admin-${selector}-${width}.png`),fullPage:true,animations:'disabled'}); }
  }
});

test('campaign editor previews media changes without overlay or autoplay',async({page})=>{
 await login(page);await adminNav(page,'[data-page=hero]');const form=page.locator('#heroForm');await page.getByText('Preview slide',{exact:true}).click();await form.locator('[name=mediaUrl]').fill('/assets/dolphin-drive.webp');await expect(page.locator('#previewMedia>img')).toHaveAttribute('src','/assets/dolphin-drive.webp');
 await form.locator('[name=mediaType][value=video]').check();await form.locator('[name=mediaUrl]').fill('/uploads/fixture.mp4');await expect(page.locator('#previewMedia video')).toHaveAttribute('controls','');await expect(page.locator('#previewMedia video')).not.toHaveAttribute('autoplay');await expect(page.locator('#mediaGuidance')).toContainText('Videos start when visitors press play');
 await form.locator('[name=mediaUrl]').fill('https://youtu.be/OldTHqPji78');await expect(page.locator('#previewMedia .preview-video-play')).toBeVisible();await expect(page.locator('#previewMedia iframe')).toHaveCount(0);
});


test('homepage uses configured campaign order, destinations and fallback without duplicate sections',async ({page})=>{
  const slides=[{id:'two',headline:'Second slide',published:true,priority:2,mediaType:'image',mediaUrl:'/assets/atto-cabin.webp',duration:9000,buttons:[{label:'Discover more',href:'/models/atto3'}]},{id:'hidden',headline:'Hidden slide',published:false,priority:0,mediaType:'image',mediaUrl:'/assets/atto-cabin.webp'},{id:'one',headline:'First slide',published:true,priority:1,mediaType:'image',mediaUrl:'/assets/dolphin-drive.webp',duration:3000,buttons:[{label:'Discover more',href:'#contact'}]}];
  await page.route('**/api/content/settings',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({heroSlides:slides})}));
  await page.goto('/'); await expect(page.locator('#heroTitle')).toHaveText('First slide'); await expect(page.locator('#heroAction')).toHaveAttribute('href','/contact');
  await page.getByRole('button',{name:'Show slide 2: Second slide'}).click(); await expect(page.locator('#heroAction')).toHaveAttribute('href','/models/atto3');
  await expect(page.locator('.hero-controls .slide-dot')).toHaveCount(2); await expect(page.locator('.catalogue-section,.campaigns-section,.events-section,.contact-banner')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Explore and compare models',exact:true})).toHaveAttribute('href','/models');
  await page.unroute('**/api/content/settings');await page.route('**/api/content/settings',route=>route.fulfill({contentType:'application/json',body:'{"heroSlides":[]}'}));await page.reload();await expect(page.locator('#heroTitle')).toHaveText('Discover your next BYD.');await expect(page.locator('#heroControls')).toBeHidden();
  await page.unroute('**/api/content/settings');await page.route('**/api/content/settings',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.reload();await expect(page.getByRole('button',{name:'Retry slides'})).toBeVisible();
});
test('scroll motion respects reduced motion',async ({page})=>{
  await page.goto('/'); await page.evaluate(()=>window.scrollTo(0,300));
  await expect.poll(()=>page.locator('#heroBackground').evaluate(el=>el.style.getPropertyValue('--hero-shift'))).not.toBe('0px');
  await page.emulateMedia({reducedMotion:'reduce'}); await page.reload(); await page.evaluate(()=>window.scrollTo(0,300));
  await expect(page.locator('#heroBackground')).not.toHaveAttribute('style',/--hero-shift/);
  await expect(page.getByRole('button',{name:'Resume homepage slideshow'})).toBeVisible();
});

test('carousel retains keyboard focus when pointer leaves',async ({page})=>{
  const slides=[{id:'one',headline:'Focus one',published:true,duration:3000,priority:1,mediaType:'image',mediaUrl:'/assets/atto-cabin.webp'},{id:'two',headline:'Focus two',published:true,duration:3000,priority:2,mediaType:'image',mediaUrl:'/assets/atto-cabin.webp'}];
  await page.route('**/api/content/settings',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({heroSlides:slides})}));
  await page.goto('/'); const dot=page.getByRole('button',{name:'Show slide 1: Focus one'}); await dot.focus();
  await page.locator('.showroom-hero').dispatchEvent('mouseenter'); await page.locator('.showroom-hero').dispatchEvent('mouseleave');
  await page.waitForTimeout(3300); await expect(dot).toBeFocused(); await expect(page.locator('#heroTitle')).toHaveText('Focus one');
});

test('featured photography follows the managed model image',async ({page})=>{
 const records=await(await page.request.get('/api/content/models')).json();
 const atto=records.find(model=>model.id==='atto3'); atto.images=['/assets/dolphin-drive.webp'];
 await page.route('**/api/content/models',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([atto])}));
 await page.goto('/'); await expect(page.locator('#featuredGrid img')).toHaveAttribute('src','/assets/dolphin-drive.webp');
});


test('admin slide editing exposes labels, preserves hidden state and saves order on phones',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);await adminNav(page,'[data-page=hero]');
 const first=await page.locator('.slide-card-copy strong').first().textContent();await page.locator('.slide-list-card').first().getByRole('button',{name:'Move down: '+first,exact:true}).click();await expect(page.locator('#slideOrderMessage')).toHaveText('Slide order saved.');await expect(page.locator('.slide-card-copy strong').nth(1)).toHaveText(first);
 await page.locator('.slide-list-card').nth(1).getByRole('button',{name:'Edit',exact:true}).click();await expect(page.locator('#heroForm [name=headline]')).toBeFocused();await expect(page.locator('#heroForm [name=headline]')).toBeInViewport();
 const form=page.locator('#heroForm');await expect(form.getByLabel('Destination',{exact:true}).first()).toBeVisible();await form.locator('[name=published]').uncheck();await form.getByRole('button',{name:'Save slide',exact:true}).click();await expect(page.locator('#heroMessage')).toContainText('saved as hidden');
 await form.locator('[name=published]').check();await form.getByRole('button',{name:'Save slide',exact:true}).click();await expect(page.locator('#heroMessage')).toContainText('visible on the homepage');
 await page.locator('.slide-list-card').nth(1).getByRole('button',{name:'Move up: '+first,exact:true}).click();await expect(page.locator('.slide-card-copy strong').first()).toHaveText(first);
});

test('staff browse enquiries and applications, retain search results and privately download resumes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.request.post('/api/content/enquiries',{data:{name:'Inbox Visitor',email:'inbox@example.test',phone:'0123456789',branch:'cheras',model:'BYD Atto 3',message:'Please call after lunch.'}});
 await login(page);await page.getByRole('button',{name:'Browse enquiries',exact:true}).click();await page.getByLabel('Search name, contact details, model or branch').fill('Inbox Visitor');await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.locator('.submission-row').first().click();await expect(page.locator('.submission-fields')).toContainText('Please call after lunch.');await expect(page.locator('.submission-fields')).toContainText('BYD Cheras');await page.getByRole('button',{name:'Back to results'}).click();await expect(page.getByLabel('Search name, contact details, model or branch')).toHaveValue('Inbox Visitor');
 await adminNav(page,'[data-submissions=careers]');await expect(page.locator('.submission-results')).not.toContainText('Loading submissions');await page.getByLabel('Search name, email, position or branch').fill('Browser Applicant');await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.submission-row').first().click();await expect(page.locator('.submission-fields')).toContainText('BYD Cheras');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download résumé',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/resume-Browser-Applicant\.pdf/);await expect(page.locator('.submission-resume')).toContainText('Résumé downloaded');
 fs.mkdirSync(reviewDir,{recursive:true});await page.screenshot({path:path.join(reviewDir,'admin-application-390.png'),fullPage:true,animations:'disabled'});
 await adminNav(page,'[data-submissions=enquiries]');await expect(page.getByLabel('Search name, contact details, model or branch')).toHaveValue('Inbox Visitor');await page.screenshot({path:path.join(reviewDir,'admin-enquiries-390.png'),fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(reviewDir,'admin-enquiries-1440.png'),fullPage:true,animations:'disabled'});
});


test('native video pauses rotation, single slides hide dots and broken media retains its action',async({page})=>{
 await page.route('**/fixture.webm',route=>route.fulfill({contentType:'video/webm',body:fs.readFileSync(path.join(__dirname,'../fixtures/slide.webm'))}));
 let slides=[{id:'native',headline:'Native video',published:true,priority:1,duration:3000,mediaType:'video',mediaUrl:'/fixture.webm',buttons:[{label:'Discover more',href:'/careers'}]},{id:'still',headline:'Still image',published:true,priority:2,mediaType:'image',mediaUrl:'/assets/atto-cabin.webp'}];
 await page.route('**/api/content/settings',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({heroSlides:slides})}));await page.goto('/');const video=page.locator('#heroBackground video');await expect(video).toHaveAttribute('controls','');await expect(video).not.toHaveAttribute('autoplay');await video.evaluate(el=>el.play());await expect(page.getByRole('button',{name:'Resume homepage slideshow'})).toBeVisible();await page.waitForTimeout(3200);await expect(page.locator('#heroTitle')).toHaveText('Native video');
 slides=[{...slides[0],mediaType:'image',mediaUrl:'/missing-artwork.jpg'}];await page.reload();await expect(page.locator('#heroMediaStatus')).toContainText('media is unavailable');await expect(page.locator('#heroControls')).toBeHidden();await expect(page.locator('#heroAction')).toHaveAttribute('href','/careers');
});

test('submission layouts, legacy missing fields and retry states remain usable at each width',async({page})=>{
 await login(page);
 await page.route('**/api/admin/submissions/enquiries?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({items:[{id:'legacy',name:'A customer name that wraps on a narrow phone',email:'long-email-address-for-layout@example.test',model:'BYD SEALION 7',branchName:'A branch name retained from the original submission'}],total:26,page:1,limit:25})}));
 await page.route('**/api/admin/submissions/enquiries/legacy',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({id:'legacy',name:'Legacy customer',message:'A saved message that remains readable when it wraps across multiple lines.',branchName:'Original branch'})}));
 for(const width of [360,390,605,768,1440]){await page.setViewportSize({width,height:900});await adminNav(page,'[data-submissions=enquiries]');await expect(page.locator('.submission-row')).toBeVisible();await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(reviewDir,`submission-list-${width}.png`),fullPage:true,animations:'disabled'});await page.locator('.submission-row').click();await expect(page.locator('.submission-fields')).toContainText('Not provided');await expect(page.locator('.submission-detail-heading')).toContainText('Date unavailable');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(reviewDir,`submission-detail-${width}.png`),fullPage:true,animations:'disabled'});}
 await page.unroute('**/api/admin/submissions/enquiries?*');await page.route('**/api/admin/submissions/enquiries?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Please retry the list."}'}));await adminNav(page,'[data-submissions=enquiries]');await expect(page.getByRole('button',{name:'Retry submissions'})).toBeVisible();
});
