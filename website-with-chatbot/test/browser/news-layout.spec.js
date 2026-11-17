const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { newsPage } = require('../../server/news-pages');
const review = path.resolve(__dirname, '../../../.impeccable/review');
const sparse = [
  { id:'portrait', title:'A published event with a longer title that must remain readable on a narrow phone', category:'Event', date:'2026-11-15', image:'/uploads/news-portrait.svg', published:true },
  { id:'landscape', title:'Test drive weekend', category:'Event', date:'2026-11-01', image:'/assets/wordpress/3b0e72b663ed5c2f.webp', published:true },
  { id:'square', title:'Product showcase', category:'News', date:'2026-11-10', image:'/uploads/news-square.svg', published:true }
];
async function sparsePage(page, request) {
  const shell = await (await request.get('/events')).text();
  const names = { '/events':'events', '/events/events':'events-archive', '/events/press':'press-archive', '/events/articles':'articles-archive' };
  await page.route(/\/events(?:\/(?:events|press|articles))?$/, route => route.fulfill({ contentType:'text/html', body:shell.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,newsPage(names[new URL(route.request().url()).pathname], sparse)) }));
  await page.route('**/uploads/news-*.svg', route => {
    const portrait = route.request().url().includes('portrait');
    return route.fulfill({ contentType:'image/svg+xml', body:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${portrait ? 900 : 600}" viewBox="0 0 600 ${portrait ? 900 : 600}"><rect width="100%" height="100%" fill="#455e6c"/><text x="60" y="100" fill="white" font-size="32">News layout fixture</text></svg>` });
  });
}
test('news banner, sparse cards and complete portrait artwork fit phone, tablet and desktop layouts', async ({page,request}) => {
  test.setTimeout(60000); fs.mkdirSync(review,{recursive:true});
  await sparsePage(page,request);
  for (const width of [360,390,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900}); await page.goto('/events');
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode().catch(()=>{});}));});
    const hero=await page.locator('.wp-news-hero').boundingBox(), heading=await page.getByRole('heading',{name:'NEWS & EVENTS',exact:true}).boundingBox();
    expect(heading.x).toBeGreaterThanOrEqual(hero.x); expect(heading.x+heading.width).toBeLessThanOrEqual(hero.x+hero.width+1);
    expect(heading.y).toBeGreaterThanOrEqual(hero.y); expect(heading.y+heading.height).toBeLessThanOrEqual(hero.y+hero.height+1);
    expect(hero.height).toBeLessThan(width<640?350:700);
    await expect(page.locator('.elementskit-post-image-card')).toHaveCount(3);
    await expect(page.locator('.wp-empty')).toContainText('No stories here yet');
    const frames=await page.locator('.wp-news-grid .elementskit-entry-thumb img').evaluateAll(images=>images.map(image=>({fit:getComputedStyle(image).objectFit,width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,loaded:image.naturalWidth>0})));
    for(const frame of frames){expect(frame.fit).toBe('contain');expect(frame.loaded).toBe(true);expect(Math.abs(frame.width/frame.height-16/9)).toBeLessThan(.02);}
    const groups=await page.locator('.wp-news-section').evaluateAll(sections=>sections.map(section=>({top:section.getBoundingClientRect().top,bottom:section.getBoundingClientRect().bottom,cardBottom:Math.max(section.getBoundingClientRect().top,...[...section.querySelectorAll('.elementskit-post-image-card')].map(card=>card.getBoundingClientRect().bottom))})));
    for(let i=0;i<groups.length;i++){expect(groups[i].cardBottom).toBeLessThanOrEqual(groups[i].bottom+1);if(i)expect(groups[i].top).toBeGreaterThanOrEqual(groups[i-1].bottom-1);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if([390,1440].includes(width)) await page.screenshot({path:path.join(review,`news-fixed-${width}.png`),fullPage:true,animations:'disabled'});
  }
  for(const route of ['/events/events','/events/press','/events/articles']){await page.goto(route);await expect(page.locator('.wp-news-archive-heading h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('managed stories have their own title and a bounded complete image', async ({page,request}) => {
  const origin='http://127.0.0.1:4187';
  const login=await request.post('/api/admin/login',{headers:{Origin:origin},data:{username:'browser-editor',password:'browser-test-password-123'}});
  expect(login.ok()).toBe(true);
  const auth={headers:{Origin:origin,'X-CSRF-Token':(await login.json()).csrf}};
  // This server and its database are disposable test fixtures.
  const response=await request.post('/api/admin/content/news',{headers:auth.headers,data:{title:'A newly managed story with its own page title',summary:'Published fixture content.',category:'News',date:'2026-11-17',image:'/assets/wordpress/3b0e72b663ed5c2f.webp',published:true}});
  expect(response.ok()).toBe(true);const record=await response.json();
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto('/stories/'+record.id);await expect(page).toHaveTitle('A newly managed story with its own page title – BYD Millennium Autobeyond');await expect(page.locator('.wp-story-image')).toBeVisible();await expect(page.locator('.wp-story-image')).toHaveCSS('object-fit','contain');const image=await page.locator('.wp-story-image').boundingBox();expect(image.height).toBeLessThanOrEqual(640);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(review,`news-story-fixed-${width}.png`),fullPage:true,animations:'disabled'});}
  await request.delete('/api/admin/content/news/'+record.id,{headers:auth.headers});
});
