/* Rebuild the public copy from authenticated-browser DOM/asset captures. Never imports WordPress scripts or submissions. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { load } = require('../website-with-chatbot/node_modules/cheerio');
const sharp = require('../website-with-chatbot/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'wordpress-source');
const app = path.join(root, 'website-with-chatbot');
const assetsDir = path.join(app, 'assets/wordpress');
const outputDir = path.join(app, 'content/wordpress');
fs.mkdirSync(assetsDir, { recursive: true }); fs.mkdirSync(outputDir, { recursive: true });
const captures = fs.readdirSync(source).filter(name => name.endsWith('.json') && !['assets-index.json','posts-to-copy.json'].includes(name)).map(name => ({ name: name.slice(0,-5), ...JSON.parse(fs.readFileSync(path.join(source,name))) })).filter(capture=>typeof capture.html==='string'&&typeof capture.url==='string');
const capturedAssets = JSON.parse(fs.readFileSync(path.join(source,'assets-index.json')));
const assetByUrl = new Map(capturedAssets.map(asset => [asset.url,asset]));
const mapped = new Map(), failures = new Set(), provenance = [];
const postSources=JSON.parse(fs.readFileSync(path.join(source,'posts-to-copy.json')));const categoryByUrl=new Map(postSources.map(post=>[post.url,post.category]));
const normal = (url, base='https://millenniumautobyd.com.my/home/') => { try { return new URL(url,base).href; } catch { return url; } };
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modelNames = {sealion7:'byd-sea-lion',seal6ev:'seal6ev',atto3:'atto3',seal:'seal',atto2:'atto2',m6:'m6'};
const routeByName = {home:'/',about:'/about',contact:'/contact',careers:'/careers',events:'/events','events-archive':'/events/events','press-archive':'/events/press','articles-archive':'/events/articles'};
const routeBySource = new Map();
for (const capture of captures) {
 const route = modelNames[capture.name] ? '/models/'+modelNames[capture.name] : routeByName[capture.name] || '/stories/'+capture.name.replace(/^post-/,'');
 capture.route=route; routeBySource.set(new URL(capture.url).pathname.replace(/\/$/,''),route);
}
function routeHref(value) {
 if (!value || value === '#') return value || '#';
 const url = new URL(value,'https://millenniumautobyd.com.my/home/');
 if (url.hostname !== 'millenniumautobyd.com.my') return value;
 const key=url.pathname.replace(/\/$/,'');
 if (routeBySource.has(key)) return routeBySource.get(key)+url.search+url.hash;
 if (key==='/home' || key==='') return (value.endsWith('#') ? '/models' : '/'+url.search+url.hash);
 return value;
}
function sameImageFamily(url) { return new URL(url).pathname.replace(/-\d+x\d+(?=\.[^.]+$)/,''); }
async function localAsset(raw, base, fallback=true) {
 if (!raw || /^(data:|#|blob:)/i.test(raw)) return raw;
 const url=normal(raw,base); if(mapped.has(url)) return mapped.get(url);if(failures.has(url))return url;
 if(!/^https?:/.test(url)) return raw;
 const host=new URL(url).hostname;
 if(!['millenniumautobyd.com.my','fonts.googleapis.com','fonts.gstatic.com'].includes(host))return raw;
 let entry=assetByUrl.get(url), buffer;
 if(entry && fs.existsSync(entry.path)) buffer=fs.readFileSync(entry.path);
 else {
  // Browsers may have loaded a responsive derivative instead of the unrequested original.
  if(fallback && /\.(png|jpe?g|webp)(\?|$)/i.test(url)) {
   const family=capturedAssets.find(a=>a.kind==='image' && sameImageFamily(a.url)===sameImageFamily(url));
   if(family) { const local=await localAsset(family.url,base,false); mapped.set(url,local);return local; }
  }
  try { const response=await fetch(url,{signal:AbortSignal.timeout(12000)}); if(!response.ok)throw Error(String(response.status));buffer=Buffer.from(await response.arrayBuffer()); }
  catch {
   const font=capturedAssets.find(a=>a.kind==='font'&&path.basename(new URL(a.url).pathname)===path.basename(new URL(url).pathname));
   if(font){const local=await localAsset(font.url,base,false);mapped.set(url,local);return local;}
   failures.add(url);return url;
  }
 }
 const extension=path.extname(new URL(url).pathname).toLowerCase();
 const isCss=entry?.kind==='stylesheet'||extension==='.css'||host==='fonts.googleapis.com';
 const keepLogo=/cropped-cropped-IMG_9897/.test(url);
 const ext=isCss?'.css':!keepLogo&&/\.(png|jpe?g|webp|gif)$/i.test(extension)?'.webp':extension||'.bin';
 let payload=buffer;
 if(isCss) {
  let css=buffer.toString('utf8');
  const refs=[...css.matchAll(/url\((['"]?)(.*?)\1\)/g)].map(m=>m[2]).filter(ref=>ref&&!ref.startsWith('data:')&&!ref.startsWith('#'));
  for(const ref of new Set(refs)){const next=await localAsset(ref,url);css=css.split(ref).join(next);}
  css=css.replace(/url\((['"]?)(https?:)?\/\/millenniumautobyd\.com\.my[^)]*\)/g,'url(data:application/octet-stream;base64,)');payload=Buffer.from(css);
 } else if(ext==='.webp') payload=await sharp(buffer,{animated:extension==='.gif'}).rotate().resize({width:1920,withoutEnlargement:true}).webp({quality:85,effort:4}).toBuffer();
 else if(ext==='.svg') {
  const svg=load(buffer.toString('utf8'),{xmlMode:true});svg('script,foreignObject').remove();svg('*').each((i,e)=>{for(const key of Object.keys(e.attribs||{}))if(/^on/i.test(key))svg(e).removeAttr(key)});payload=Buffer.from(svg.xml());
 }
 const sha256=crypto.createHash('sha256').update(payload).digest('hex');
 const local='/assets/wordpress/'+sha256.slice(0,16)+ext;fs.writeFileSync(path.join(app,local),payload);mapped.set(url,local);
 provenance.push({url,local,kind:isCss?'stylesheet':entry?.kind||extension.slice(1),sha256});
 return local;
}
async function rewriteCss(css,base) {
 for(const match of [...css.matchAll(/url\((['"]?)(.*?)\1\)/g)]) {const raw=match[2];if(!raw||raw.startsWith('data:')||raw.startsWith('#'))continue;css=css.split(raw).join(await localAsset(raw,base));}
 return css;
}
const contactDoc=load(captures.find(c=>c.name==='contact').html);
const careerDoc=load(captures.find(c=>c.name==='careers').html);
const consents=contactDoc('.wpforms-field-checkbox label.wpforms-field-label-inline').map((i,e)=>contactDoc(e).text().trim()).get();
const privacyDescription=contactDoc('.wpforms-field-checkbox .wpforms-field-description').text().trim();
const positions=careerDoc('select').first().find('option').map((i,e)=>careerDoc(e).text().trim()).get().filter(Boolean);
function formMarkup(career,model='') {
 return `<form class="wp-public-form" id="${career?'careerForm':'enquiryForm'}" data-model="${esc(model)}" ${career?'enctype="multipart/form-data"':''}>
 <input type="hidden" name="formVersion" value="wordpress-copy-1">
 ${career?`<label>Position or role<select name="position" required><option value="">Choose a position</option>${positions.map(value=>`<option>${esc(value)}</option>`).join('')}</select></label>`:'<label>Model<select aria-label="Model" id="enquiryModel" name="model" required disabled><option value="">Loading models…</option></select></label>'}
 <div class="wp-form-names"><label>First name<input name="firstName" autocomplete="given-name" required maxlength="100"></label><label>Last name<input name="lastName" autocomplete="family-name" required maxlength="100"></label></div>
 <label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" required maxlength="50"></label>
 <label>${career?'Preferred work location':'Preferred branch'}<select class="branch-select" name="${career?'branchId':'branch'}" required disabled><option value="">Loading branches…</option></select></label>
 ${career?'<label>Résumé / supporting document<input name="resume" type="file" accept=".pdf,.doc,.docx" required><small>PDF, DOC or DOCX · maximum 8 MB. Shared only with the hiring team.</small></label>':'<label>Would you like to test drive?<select name="testDrive" required><option value="">Please choose</option><option value="Yes">Yes</option><option value="No">No</option></select></label>'}
 <label>${career?'A little about you':'Your message (optional)'}<textarea name="message" rows="4" maxlength="5000"></textarea></label>
 <fieldset class="wp-consents"><legend>Disclaimer</legend>${consents.map((text,i)=>`<label><input type="checkbox" name="${i?'consentPrivacy':'consentMarketing'}" required><span>${esc(text)}</span></label>`).join('')}<p>${esc(privacyDescription)}</p></fieldset>
 <button type="submit" class="wp-action">${career?'Submit application':'Submit enquiry'}</button><p class="form-status" role="status"></p></form>`;
}
function slideshowMarkup(){return '<section class="wp-home-slider" aria-roledescription="carousel" aria-label="BYD models and campaigns"><div class="wp-slide-media" id="wpSlideMedia"></div><div class="wp-slide-copy"><h1 id="wpSlideTitle">BYD MILLENNIUM MOTORS</h1><p id="wpSlidePrice"></p><p id="wpSlideDescription"></p><div id="wpSlideLinks"><a class="wp-action" href="/models">EXPLORE MODELS</a></div><p id="wpSlideStatus" role="status"></p></div><button class="wp-slide-arrow previous" id="wpPrevious" aria-label="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4-8 8 8 8"/></svg></button><button class="wp-slide-arrow next" id="wpNext" aria-label="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 8 8-8 8"/></svg></button><div class="wp-slide-controls" id="wpSlideControls"></div></section>'}
(async()=>{
 const index={pages:[],models:{},source:'https://millenniumautobyd.com.my/home/',capturedAt:new Date().toISOString()};
 for(const entry of capturedAssets) if(entry.kind!=='stylesheet')await localAsset(entry.url,entry.url);
 let featureBase;
 for(const capture of captures){
  const $=load(capture.html),modelId=modelNames[capture.name];
  $('script,noscript,base,link[rel="preconnect"],link[rel="dns-prefetch"],link[rel="pingback"],link[rel="alternate"],link[rel="EditURI"],link[rel="canonical"],link[rel="https://api.w.org/"]').remove();
  $('#mobile-fullscreen,#scroll-top,#searchform-overlay,#sidr,#wpadminbar,form#mfs-search,#comments,#codex-browser-sidebar-comments-root').remove();
  $('iframe').each((i,e)=>{const src=$(e).attr('src')||'';if(!/youtube(-nocookie)?\.com\/embed|google\.[^/]+\/maps/i.test(src))$(e).remove();else $(e).attr('loading','lazy')});
  $('*').each((i,e)=>{for(const key of Object.keys(e.attribs||{})){if(/^on/i.test(key)||['data-settings','data-elementor-settings','srcdoc','nonce'].includes(key))$(e).removeAttr(key)}$(e).removeClass('elementor-invisible');});
  function removeComments(node){for(const child of [...(node.children||[])]){if(child.type==='comment')$(child).remove();else removeComments(child)}}removeComments($.root()[0]);
  $('body').addClass('wp-copy');$('body meta').remove();$('head meta').not('[charset],[name="viewport"],[name="description"]').remove();
  $('meta[name="viewport"]').attr('content','width=device-width, initial-scale=1');$('head').append('<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#252728">');
  $('link[rel="stylesheet"]').each((i,e)=>{$(e).removeAttr('integrity').removeAttr('crossorigin')});
  for(const el of $('link[rel="stylesheet"]').toArray()){const raw=$(el).attr('href');if(raw){const local=await localAsset(raw,capture.url);if(/^https?:/.test(local))$(el).remove();else $(el).attr('href',local);}}
  for(const el of $('style').toArray())$(el).text(await rewriteCss($(el).text(),capture.url));
  for(const el of $('[style]').toArray())$(el).attr('style',await rewriteCss($(el).attr('style'),capture.url));
  for(const el of $('img').toArray()){
   const raw=$(el).attr('src');if(raw&&/facebook\.com|fbcdn\.net/.test(raw)){$(el).replaceWith(esc($(el).attr('alt')||''));continue;}if(raw)$(el).attr('src',await localAsset(raw,capture.url));$(el).removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('data-srcset');
   $(el).attr('decoding','async');if(!$(el).closest('#masthead').length)$(el).attr('loading','lazy');
  }
  for(const el of $('[href]').toArray()){
   let href=$(el).attr('href');if(!href)continue;
   if(/\.(pdf|png|jpe?g|webp|svg)(\?|$)/i.test(href))href=await localAsset(href,capture.url);else href=routeHref(href);
   if(/^(javascript:|data:)/i.test(href))href='#';$(el).attr('href',href);if($(el).attr('target')==='_blank')$(el).attr('rel','noopener noreferrer');
  }
  $('.wpforms-container').each((i,e)=>$(e).html(formMarkup(capture.name==='careers',modelId||'')));
  $('form').not('.wp-public-form').remove();
  // Retain the copied header and add only the catalogue/comparison destinations.
  const modelMenu=$('#masthead #menu-item-3415 > .sub-menu');modelMenu.prepend('<li class="menu-item"><a class="hfe-sub-menu-item" href="/compare">COMPARE MODELS</a></li>');modelMenu.prepend('<li class="menu-item"><a class="hfe-sub-menu-item" href="/models">EXPLORE ALL MODELS</a></li>');
  $('#masthead .hfe-nav-menu__toggle').attr('tabindex','0').attr('aria-controls','wpNavigation').attr('aria-label','Open navigation').html('<span>Menu</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>');$('#masthead nav').attr('id','wpNavigation').attr('aria-label','Main navigation');
  $('#masthead .hfe-site-logo-img').attr('alt','BYD Millennium Motors');$('#masthead a[href="#2"]').attr('href','#discover');
  $('#masthead a[href^="/models/"]').each((i,e)=>$(e).closest('li').attr('data-managed-model',$(e).attr('href').split('/').pop()));
  $('#masthead .current-menu-item,#masthead .current_page_item').removeClass('current-menu-item current_page_item');
  $('.color-button').each((i,e)=>{$(e).attr('role','button').attr('tabindex','0').attr('aria-label',$(e).find('.color-name').text().trim())});
  if(['events','events-archive','press-archive','articles-archive'].includes(capture.name))$('.post-items').each((i,e)=>{const href=$(e).find('a[href]').first().attr('href');const original=[...routeBySource.entries()].find(([key,route])=>route===href);const post=postSources.find(post=>new URL(post.url).pathname.replace(/\/$/,'')===original?.[0]);const category=post?.category||(capture.name.includes('press')?'News':capture.name.includes('article')?'Article':'Event');$(e).removeAttr('style').removeAttr('data-masonry-config').html('<!--WP_NEWS:'+category+':'+(capture.name==='events'?3:0)+':'+(capture.name==='events-archive'?3:4)+'-->')});
  const rawHome=capture.name==='home'?load(capture.html):null;
  if(rawHome){
   const slides=rawHome('.n2-ss-slide').map((i,e)=>{const id=rawHome(e).attr('data-slide-public-id');const parts=rawHome(e).find('.n2-ss-item-content').map((i,e)=>rawHome(e).text().trim()).get();const bg=rawHome(`.n2-ss-slide-background[data-public-id="${id}"]`).first();const paragraphs=(parts[1]||'').split(/\n/).map(s=>s.trim()).filter(Boolean);return {id:'wordpress-'+id,headline:parts[0],eyebrow:paragraphs[0]||'',description:paragraphs.slice(1).join(' '),mediaType:'image',mediaUrl:normal(bg.find('img').attr('src'),capture.url),mediaPosition:(bg.find('.n2-ss-slide-background-image').attr('data-x')||'50')+'% '+(bg.find('.n2-ss-slide-background-image').attr('data-y')||'50')+'%',priority:i+1,duration:7000,published:true,buttons:[{label:parts[2]||'REGISTER NOW',href:'/contact#register-section',style:'primary'}]}}).get();
   for(const slide of slides)slide.mediaUrl=await localAsset(slide.mediaUrl,capture.url);
   fs.writeFileSync(path.join(app,'server/data/site-settings.json'),JSON.stringify({heroSlides:slides},null,2));
   $('.n2-section-smartslider').first().replaceWith(slideshowMarkup());
  }
  if(modelId){
   const toolbar=`<section class="wp-model-toolbar" data-model="${modelId}"><label>Choose a model<select id="wpModelSwitcher" aria-label="Choose a model"><option>Loading models…</option></select></label><a class="wp-action outline" href="/compare">COMPARE MODELS</a><a class="wp-action" href="#register-section">REGISTER INTEREST</a></section>`;
   const first=$('#main .elementor-top-section').first();if(first.length)first.after(toolbar);else $('#main').prepend(toolbar);
   const specs='<section class="wp-managed-specs wp-feature" id="wpManagedSpecs" data-model="'+modelId+'"></section>';if($('#register-section').length)$('#register-section').before(specs);else $('#main').append(specs);
   index.models[modelId]={file:capture.name+'.html',source:capture.url};
  }
  $('head').append('<link rel="stylesheet" href="/css/wordpress.css?v=wp-1"><script src="/js/catalogue-data.js?v=wp-1" defer></script><script src="/js/wordpress.js?v=wp-1" defer></script>');
  $('body').append('<p class="wp-announcement" id="wpAnnouncement" role="status"></p><dialog class="wp-lightbox" id="wpLightbox"><button type="button" aria-label="Close image">Close</button></dialog>');
  const html='<!doctype html>\n'+$.html().replace(/[ \t]+$/gm,'');fs.writeFileSync(path.join(outputDir,capture.name+'.html'),html);
  index.pages.push({name:capture.name,file:capture.name+'.html',route:capture.route,source:capture.url,title:$('title').text()});
  if(capture.name==='home')featureBase=html;
 }
 for(const [view,title] of [['models','EXPLORE OUR MODELS'],['compare','COMPARE MODELS'],['detail','MODEL DETAILS'],['unavailable','PAGE NOT FOUND']]){
  const $=load(featureBase);$('title').text(title+' – BYD Millennium Motors');$('#main').html(`<section class="wp-feature" data-feature="${view}"><h1>${title}</h1><div id="wpFeatureContent" role="status">Loading…</div></section>`);fs.writeFileSync(path.join(outputDir,view+'.html'),'<!doctype html>\n'+$.html().replace(/[ \t]+$/gm,''));
 }
 fs.writeFileSync(path.join(outputDir,'index.json'),JSON.stringify(index,null,2));
 const used=new Set(provenance.map(item=>path.basename(item.local)));for(const file of fs.readdirSync(assetsDir)){if(/^[a-f0-9]{16}\./.test(file)&&!used.has(file))fs.unlinkSync(path.join(assetsDir,file))}
 fs.writeFileSync(path.join(assetsDir,'sources.json'),JSON.stringify(provenance,null,2));
 fs.writeFileSync(path.join(source,'missing-assets.json'),JSON.stringify([...failures],null,2));
 const posts=JSON.parse(fs.readFileSync(path.join(source,'posts-to-copy.json')));
 const news=posts.map(post=>{const capture=captures.find(c=>c.name===post.name),$=load(capture.html);const title=capture.title.replace(/ – BYD Millennium Autobeyond$/,'').trim();const segments=new URL(post.url).pathname.split('/');const body=$('#main .elementor-widget-text-editor').first().text().trim();const img=$('#main img').first().attr('src');return {id:post.name.replace(/^post-/,''),title,date:segments.slice(2,5).join('-'),category:post.category,summary:body.slice(0,500)||title,image:mapped.get(normal(img,capture.url))||'',published:true,url:capture.route,sourceUrl:post.url}});
 fs.writeFileSync(path.join(app,'server/data/news.json'),JSON.stringify(news,null,2));fs.writeFileSync(path.join(app,'server/data/offers.json'),'[]\n');
 // Populate the existing catalogue with previously verified WordPress facts and genuine colour photos.
 const catalogueRoot=path.join(root,'../BYD-POC/catalogue-import-20261027');const models=JSON.parse(fs.readFileSync(path.join(catalogueRoot,'models.json')));
 const catalogueDir=path.join(assetsDir,'catalogue');fs.mkdirSync(catalogueDir,{recursive:true});
 for(const model of models){const replace=value=>{if(typeof value==='string'&&value.startsWith('/uploads/wp-catalogue-20261027/')){const sourceName=path.basename(value),buffer=fs.readFileSync(path.join(catalogueRoot,'images',sourceName)),name=crypto.createHash('sha256').update(buffer).digest('hex').slice(0,16)+'.webp';fs.writeFileSync(path.join(catalogueDir,name),buffer);return '/assets/wordpress/catalogue/'+name}if(Array.isArray(value))return value.map(replace);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,value])=>[key,replace(value)]));return value};Object.assign(model,replace(model));}
 const catalogueSources=JSON.parse(fs.readFileSync(path.join(catalogueRoot,'sources.json')));const hashedSources=Object.fromEntries(Object.entries(catalogueSources).map(([name,url])=>{const buffer=fs.readFileSync(path.join(catalogueRoot,'images',name));return [crypto.createHash('sha256').update(buffer).digest('hex').slice(0,16)+'.webp',url]}));fs.writeFileSync(path.join(catalogueDir,'sources.json'),JSON.stringify(hashedSources,null,2));const catalogueUsed=new Set(models.flatMap(model=>[...model.images,...(model.colours||[]).flatMap(colour=>colour.images)]).map(value=>path.basename(value)));for(const file of fs.readdirSync(catalogueDir))if(file.endsWith('.webp')&&!catalogueUsed.has(file))fs.unlinkSync(path.join(catalogueDir,file));
 fs.writeFileSync(path.join(app,'server/data/models.json'),JSON.stringify(models,null,2));
 console.log(JSON.stringify({pages:index.pages.length,assets:provenance.length,missing:failures.size,models:models.length,posts:news.length}));
})().catch(error=>{console.error(error);process.exitCode=1});
