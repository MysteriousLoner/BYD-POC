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
test('vehicle editor adds and persists ordered custom fields and colour photos on mobile',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await login(page); await adminNav(page, '[data-page=vehicles]'); await page.locator('.vehicle-card').filter({has:page.getByRole('heading',{name:/^BYD ATTO 3$/i})}).getByRole('button',{name:'Edit details'}).click();
  await expect(page.locator('#vehicleModal')).toBeVisible(); const oldSpecs=await page.locator('#specificationRows .spec-editor-row').count(),oldColours=await page.locator('.colour-editor-row').count();
  await page.getByRole('button',{name:'Add specification',exact:true}).click(); const row = page.locator('.spec-editor-row').last(); await row.getByLabel('Label',{exact:true}).fill('Browser test field'); await row.getByLabel('Value',{exact:true}).fill('Test fixture'); await row.getByLabel('Group (optional)').fill('Test only');
  await page.getByRole('button',{name:'Add colour',exact:true}).click(); const colour = page.locator('.colour-editor-row').last(); await colour.getByLabel('Colour name').fill('Fixture colour'); await colour.getByLabel('Image URLs (one per line)').fill('/assets/atto3-blue.webp');
  await page.getByRole('button',{name:'Save vehicle',exact:true}).click(); await expect(page.locator('#vehiclesPage')).toBeVisible();
  await page.locator('.vehicle-card').filter({has:page.getByRole('heading',{name:/^BYD ATTO 3$/i})}).getByRole('button',{name:'Edit details'}).click(); await expect(page.locator('.spec-editor-row')).toHaveCount(oldSpecs+1); await expect(page.locator('.colour-editor-row')).toHaveCount(oldColours+1);
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

test('mobile admin drawer traps focus, closes on selection and restores the menu',async ({page})=>{
  await page.setViewportSize({width:360,height:844}); await login(page); await page.locator('#adminMenuToggle').click(); await expect(page.locator('#adminSidebar')).toHaveAttribute('aria-modal','true');
  await page.keyboard.press('Escape'); await expect(page.locator('#adminMenuToggle')).toBeFocused(); await page.locator('#adminMenuToggle').click(); await page.locator('[data-manager=branches]').click(); await expect(page.locator('#adminMenuToggle')).toHaveAttribute('aria-expanded','false'); await expect(page.locator('#salesPage')).toBeVisible();
});

test('shared admin surfaces retain usable layouts',async ({page})=>{
  test.setTimeout(90000); await login(page);
  for(const width of [390,1440]) { await page.setViewportSize({width,height:1000});
    for(const selector of ['hero','promotions','branches','knowledge','conversations']) { await adminNav(page, selector==='hero'?'[data-page=hero]':`[data-manager=${selector}]`); await expect(page.locator('.page.active')).not.toContainText('Loading…'); if(selector==='hero') await page.locator('.slide-list-card').first().getByRole('button',{name:'Edit',exact:true}).click(); await settleImages(page); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),selector).toBe(true); await page.screenshot({path:path.join(reviewDir,`admin-${selector}-${width}.png`),fullPage:true,animations:'disabled'}); }
  }
});


test('campaign editor previews media changes without overlay or autoplay',async({page})=>{
 await login(page);await adminNav(page,'[data-page=hero]');const form=page.locator('#heroForm');await page.getByText('Preview slide',{exact:true}).click();await form.locator('[name=mediaUrl]').fill('/assets/dolphin-drive.webp');await expect(page.locator('#previewMedia>img')).toHaveAttribute('src','/assets/dolphin-drive.webp');
 await form.locator('[name=mediaType][value=video]').check();await form.locator('[name=mediaUrl]').fill('/uploads/fixture.mp4');await expect(page.locator('#previewMedia video')).toHaveAttribute('controls','');await expect(page.locator('#previewMedia video')).not.toHaveAttribute('autoplay');await expect(page.locator('#mediaGuidance')).toContainText('Videos start automatically, muted');
 await form.locator('[name=mediaUrl]').fill('https://youtu.be/OldTHqPji78');await expect(page.locator('#previewMedia .preview-video-play')).toBeVisible();await expect(page.locator('#previewMedia iframe')).toHaveCount(0);
});



test('staff browse enquiries and applications, retain search results and privately download resumes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.request.post('/api/content/enquiries',{data:{name:'Inbox Visitor',email:'inbox@example.test',phone:'0123456789',branch:'cheras',model:'BYD Atto 3',message:'Please call after lunch.'}});
 await page.request.post('/api/content/careers',{multipart:{name:'Browser Applicant',email:'browser@example.test',position:'Sales',branchId:'cheras',resume:{name:'resume.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 Test fixture')}}});await login(page);await page.getByRole('button',{name:'Browse enquiries',exact:true}).click();await page.getByLabel('Search name, contact details, model or branch').fill('Inbox Visitor');await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.locator('.submission-row').first().click();await expect(page.locator('.submission-fields')).toContainText('Please call after lunch.');await expect(page.locator('.submission-fields')).toContainText('BYD Cheras');await page.getByRole('button',{name:'Back to results'}).click();await expect(page.getByLabel('Search name, contact details, model or branch')).toHaveValue('Inbox Visitor');
 await adminNav(page,'[data-submissions=careers]');await expect(page.locator('.submission-results')).not.toContainText('Loading submissions');await page.getByLabel('Search name, email, position or branch').fill('Browser Applicant');await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.submission-row').first().click();await expect(page.locator('.submission-fields')).toContainText('BYD Cheras');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download résumé',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/resume-Browser-Applicant\.pdf/);await expect(page.locator('.submission-resume')).toContainText('Résumé downloaded');
 fs.mkdirSync(reviewDir,{recursive:true});await page.screenshot({path:path.join(reviewDir,'admin-application-390.png'),fullPage:true,animations:'disabled'});
 await adminNav(page,'[data-submissions=enquiries]');await expect(page.getByLabel('Search name, contact details, model or branch')).toHaveValue('Inbox Visitor');await page.screenshot({path:path.join(reviewDir,'admin-enquiries-390.png'),fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(reviewDir,'admin-enquiries-1440.png'),fullPage:true,animations:'disabled'});
});



test('submission layouts, legacy missing fields and retry states remain usable at each width',async({page})=>{
 await login(page);
 await page.route('**/api/admin/submissions/enquiries?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({items:[{id:'legacy',name:'A customer name that wraps on a narrow phone',email:'long-email-address-for-layout@example.test',model:'BYD SEALION 7',branchName:'A branch name retained from the original submission'}],total:26,page:1,limit:25})}));
 await page.route('**/api/admin/submissions/enquiries/legacy',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({id:'legacy',name:'Legacy customer',message:'A saved message that remains readable when it wraps across multiple lines.',branchName:'Original branch'})}));
 for(const width of [360,390,605,768,1440]){await page.setViewportSize({width,height:900});await adminNav(page,'[data-submissions=enquiries]');await expect(page.locator('.submission-row')).toBeVisible();await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(reviewDir,`submission-list-${width}.png`),fullPage:true,animations:'disabled'});await page.locator('.submission-row').click();await expect(page.locator('.submission-fields')).toContainText('Not provided');await expect(page.locator('.submission-detail-heading')).toContainText('Date unavailable');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(reviewDir,`submission-detail-${width}.png`),fullPage:true,animations:'disabled'});}
 await page.unroute('**/api/admin/submissions/enquiries?*');await page.route('**/api/admin/submissions/enquiries?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Please retry the list."}'}));await adminNav(page,'[data-submissions=enquiries]');await expect(page.getByRole('button',{name:'Retry submissions'})).toBeVisible();
});

