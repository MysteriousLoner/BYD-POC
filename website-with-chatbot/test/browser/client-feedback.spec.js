const { test, expect } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path');
const { snapshotPublicReads } = require('./public-read-snapshot');
const review = path.resolve(__dirname,'../../../.impeccable/review');
test.beforeEach(async({page,request}) => snapshotPublicReads(page,request));
async function ready(page) {
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('img').evaluateAll(images=>{images.forEach(image=>image.loading='eager');return Promise.all(images.map(image=>image.decode().catch(()=>{})))});
  await expect(page.locator('.wp-page-transition')).not.toBeVisible();
}
test('Contact and About remain readable with uniform branch frames and no overflow at each breakpoint', async({page})=>{
  test.setTimeout(90000); fs.mkdirSync(review,{recursive:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/contact');await ready(page);
    const cards=page.locator('.wp-branch-card');await expect(cards).toHaveCount(4);
    const rects=await cards.evaluateAll(cards=>cards.map(card=>{const rect=card.getBoundingClientRect(),image=card.querySelector('img').getBoundingClientRect();return {x:rect.x,y:rect.y,height:rect.height,ratio:image.width/image.height}}));
    rects.forEach(rect=>expect(rect.ratio).toBeCloseTo(16/9,2));
    if(width>=768){expect(rects[0].y).toBe(rects[1].y);expect(rects[0].height).toBeCloseTo(rects[1].height,1)}else expect(rects[1].y).toBeGreaterThan(rects[0].y);
    await expect(cards.getByRole('link',{name:/Open Google Maps/})).toHaveCount(4);await expect(cards.getByRole('link',{name:/Open Waze/})).toHaveCount(4);
    for(const href of await cards.locator('.wp-branch-directions a').evaluateAll(links=>links.map(link=>link.href)))expect(new URL(href).protocol).toBe('https:');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('#enquiryForm')).toBeVisible();
    if(width!==768)await page.screenshot({path:path.join(review,width===1440?'desktop.png':'mobile.png'),fullPage:true,animations:'disabled'});
    await page.goto('/about');await ready(page);await expect(page.getByRole('heading',{name:'Our values',exact:true})).toBeVisible();await expect(page.locator('.wp-about-enquiry a')).toHaveAttribute('href','/contact#register-section');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width!==768)await page.screenshot({path:path.join(review,`feedback-about-${width}.png`),fullPage:true,animations:'disabled'});
    await page.goto('/');await ready(page);await expect(page.locator('.wp-home-slider')).toHaveCount(0);await expect(page.locator('#main iframe,#main video')).toHaveCount(0);
    const gap=await page.locator('#main img').first().evaluate(image=>image.getBoundingClientRect().top-document.querySelector('#masthead').getBoundingClientRect().bottom);expect(gap).toBeLessThan(10);
    if(width!==768)await page.screenshot({path:path.join(review,`feedback-home-${width}.png`),animations:'disabled'});
  }
  expect(errors).toEqual([]);
});
test('model dropdown fits two complete rows and scrolls accessibly on a short desktop',async({page})=>{
  await page.setViewportSize({width:1440,height:649});await page.goto('/');await ready(page);
  const modelLink=page.locator('#wpNavigation').getByRole('link',{name:'MODEL',exact:true}),menu=page.locator('#wpModelMenu');
  await modelLink.focus();await expect(menu.locator('.wp-model-preview-link')).toHaveCount(7);
  await page.evaluate(()=>document.fonts.ready);
  for(const height of [649,900]){
    await page.setViewportSize({width:1440,height});
    await expect.poll(()=>menu.evaluate(menu=>{
      const box=menu.getBoundingClientRect(),style=getComputedStyle(menu),links=[...menu.querySelectorAll('.wp-model-preview-link')];
      return links.slice(0,6).every(link=>[link,...link.querySelectorAll('img,.wp-model-preview-name,.wp-model-preview-price')].every(element=>{
        const rect=element.getBoundingClientRect();return rect.top>=box.top&&rect.bottom<=box.bottom-parseFloat(style.paddingBottom)+1;
      }));
    })).toBe(true);
    const geometry=await menu.evaluate(menu=>{const box=menu.getBoundingClientRect(),items=[...menu.querySelectorAll(':scope > li')],style=getComputedStyle(menu);return {bottom:box.bottom,sixth:items[5].getBoundingClientRect().bottom,third:items[6].getBoundingClientRect().top,padding:parseFloat(style.paddingBottom)}});
    expect(geometry.bottom-geometry.sixth).toBeCloseTo(geometry.padding,0);
    expect(geometry.third).toBeGreaterThanOrEqual(geometry.bottom-1);
    await page.screenshot({path:path.join(review,`feedback-model-menu-two-rows-${height}.png`),animations:'disabled'});
  }
  await page.setViewportSize({width:1265,height:536});await page.goto('/');await ready(page);
  await page.locator('#wpNavigation').getByRole('link',{name:'MODEL',exact:true}).focus();
  await expect(menu.locator('.wp-model-preview-link')).toHaveCount(7);
  await menu.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  for(const frame of await menu.locator('.wp-model-preview-media').evaluateAll(frames=>frames.map(frame=>{const r=frame.getBoundingClientRect(),image=frame.querySelector('img'),ir=image.getBoundingClientRect();return {ratio:r.width/r.height,imageWidth:ir.width,width:r.width,fit:getComputedStyle(image).objectFit}}))){expect(frame.ratio).toBeCloseTo(8/5,2);expect(frame.imageWidth).toBeCloseTo(frame.width,1);expect(frame.fit).toBe('cover')}
  const shortBox=await menu.boundingBox();expect(shortBox.y+shortBox.height).toBeLessThanOrEqual(536-32+1);
  await menu.locator('a').last().focus();const last=await menu.locator('a').last().boundingBox(),box=await menu.boundingBox();expect(last.y+last.height).toBeLessThanOrEqual(box.y+box.height+1);
  await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();
  await page.locator('#wpNavigation').getByRole('link',{name:'MODEL',exact:true}).focus();
  await menu.evaluate(menu=>menu.scrollTop=0);await page.screenshot({path:path.join(review,'feedback-model-menu-short.png'),animations:'disabled'});
  await page.setViewportSize({width:390,height:900});await page.reload();await page.getByRole('button',{name:'Open navigation'}).click();await expect(menu).not.toBeVisible();await page.locator('#wpNavigation').getByRole('link',{name:'MODEL',exact:true}).click();await expect(page).toHaveURL(/\/models$/);
});
test('staff can save and clear social links, edit branch details, and submit the retained enquiry form',async({page})=>{
  const request=page.request;
  const login=await request.post('/api/admin/login',{headers:{Origin:'http://127.0.0.1:4187'},data:{username:'browser-editor',password:'browser-test-password-123'}});expect(login.ok()).toBe(true);
  await page.goto('/admin');await page.getByRole('button',{name:'Social Links',exact:true}).click();await page.getByLabel('TikTok profile URL').fill('https://www.tiktok.com/@fixture');await page.getByLabel('XHS profile URL').fill('https://www.xiaohongshu.com/user/profile/fixture');await page.getByLabel('Google Review URL').fill('https://g.page/r/fixture/review');await page.getByRole('button',{name:'Save social links'}).click();await expect(page.locator('#salesPage [role=status]')).toContainText('Social links saved');
  try{
    await page.goto('/contact');await ready(page);await expect(page.locator('[data-social]')).toHaveCount(3);
    await page.goto('/admin');await page.getByRole('button',{name:'Branches',exact:true}).click();await page.locator('#salesPage .record-row').first().getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Email', {exact:true})).toHaveValue('Info@millenniumautobyd.com.my');await expect(page.getByLabel('Showroom photo URL or local image path')).not.toBeEmpty();await expect(page.locator('#salesPage')).toContainText('1600 × 900');
    await page.goto('/contact');await ready(page);const form=page.locator('#enquiryForm');await expect(form.locator('[name=model]')).toBeEnabled();await form.locator('[name=model]').selectOption({index:1});await form.getByLabel('First name').fill('Preview');await form.getByLabel('Last name').fill('Visitor');await form.getByLabel('Email address').fill('preview@example.test');await form.getByLabel('Phone number').fill('0123456789');await form.getByLabel('Preferred branch').selectOption('cheras');await form.getByLabel('Would you like to test drive?').selectOption('Yes');for(const checkbox of await form.locator('[type=checkbox]').all())await checkbox.check();
    const submitted=page.waitForResponse(response=>response.url().endsWith('/api/content/enquiries')&&response.request().method()==='POST');await form.getByRole('button',{name:'Submit enquiry'}).click();expect((await submitted).status()).toBe(201);await expect(form.locator('.form-status')).toHaveClass(/success/);
  }finally{
    const session=await(await request.get('/api/admin/session')).json();await request.put('/api/admin/social-links',{headers:{Origin:'http://127.0.0.1:4187','X-CSRF-Token':session.csrf},data:{}});
  }
  await page.goto('/about');await expect(page.locator('[data-social]')).toHaveCount(0);
});
test('logo transition follows keyboard navigation, releases cancelled navigation and clears on history',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await ready(page);
  await page.locator('body').evaluate(body=>{const link=document.createElement('a');link.href='/about';link.textContent='Visit about';link.id='transition-fixture';body.prepend(link);document.addEventListener('click',event=>event.preventDefault(),{once:true})});
  await page.locator('#transition-fixture').focus();await page.keyboard.press('Enter');
  await expect(page.locator('.wp-page-transition')).toBeVisible();
  await page.screenshot({path:path.join(review,'feedback-transition.png'),animations:'allow'});
  await expect(page.locator('html')).not.toHaveClass(/wp-page-leaving/,{timeout:3000});
  await page.locator('#transition-fixture').press('Enter');await expect(page).toHaveURL(/\/about$/);await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  await page.goBack();await expect(page.locator('.wp-page-transition')).not.toBeVisible();await page.goForward();await expect(page.locator('.wp-page-transition')).not.toBeVisible();
  const exclusions=await page.evaluate(()=>{
    return [{href:'#same-page'},{href:'https://example.test/'},{href:'/contact',target:'_blank'},{href:'/assets/placeholder.svg',download:''},{href:'/contact',ctrlKey:true},{href:'/contact',metaKey:true},{href:'/contact',shiftKey:true},{href:'/contact',altKey:true},{href:'/contact',button:1}].map(config=>{
      const link=document.createElement('a');link.href=config.href;if(config.target)link.target=config.target;if(config.download!==undefined)link.download=config.download;document.body.append(link);
      document.addEventListener('click',event=>event.preventDefault(),{once:true});link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,...config}));link.remove();return document.documentElement.classList.contains('wp-page-leaving');
    });
  });expect(exclusions).toEqual(Array(9).fill(false));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/contact');await page.locator('#main').evaluate(main=>{const link=document.createElement('a');link.href='#register-section';link.id='same-page-fixture';link.textContent='Enquire';main.prepend(link)});await page.locator('#same-page-fixture').click();await expect(page.locator('.wp-page-transition')).not.toBeVisible();
});
test('public page content and navigation remain usable without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});const page=await context.newPage();
  try{await page.goto('http://127.0.0.1:4187/contact');await expect(page.locator('.wp-branch-card')).toHaveCount(4);await expect(page.locator('.wp-page-transition')).not.toBeVisible();await expect(page.locator('.wp-footer-logo')).toBeVisible();await page.locator('.wp-footer-logo').click();await expect(page).toHaveURL('http://127.0.0.1:4187/');await expect(page.locator('.wp-home-slider')).toHaveCount(0)}finally{await context.close()}
});
