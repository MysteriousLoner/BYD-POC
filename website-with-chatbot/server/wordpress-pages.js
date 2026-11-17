const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { list, readJson } = require('./database');
const { newsPage, storyCard, publishedStories } = require('./news-pages');
const router = express.Router();
const directory = path.join(__dirname, '..', 'content', 'wordpress');
const index = JSON.parse(fs.readFileSync(path.join(directory, 'index.json'), 'utf8'));
const pages = new Map(index.pages.map(page => [page.route, page]));
const aliases = new Map();
for (const page of index.pages) {
  const pathname = new URL(page.source).pathname.replace(/\/$/, '') || '/';
  aliases.set(pathname, page.route);
  const short = pathname.replace(/^\/home/, '') || '/';
  if (short !== page.route) aliases.set(short, page.route);
}
const cache = new Map();
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
function template(name) { if (!cache.has(name)) cache.set(name, fs.readFileSync(path.join(directory, name + '.html'), 'utf8')); return cache.get(name); }
function send(req, res, name, status = 200, story = null) {
  const vehicles = list('vehicles').filter(model => model.published === true);
  let html = template(name);
  html = html.replace(/(\/(?:css\/(?:wordpress|model-showroom)\.css|js\/(?:wordpress|model-showroom)\.js))\?v=[^"\s]+/g, '$1?v=home-news-20261117');
  const news = newsPage(name, readJson('news.json'));
  if (news) html = html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/, news);
  if (story) {
    html = html.replace('data-feature="unavailable"', 'data-feature="story"').replace('class="wp-feature"', 'class="wp-feature wp-story-page"');
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(story.title)} – BYD Millennium Autobeyond</title>`).replace('<h1>PAGE NOT FOUND</h1>', `<h1>${escape(story.title)}</h1>`);
  }
  if (name === 'detail') {
    const id = escape(req.params.id);
    html = html.replace('<!--WP_MODEL_TOOLBAR-->', `<section class="wp-model-toolbar" data-model="${id}"><label>Choose a model<select id="wpModelSwitcher" aria-label="Choose a model"><option>Loading models…</option></select></label><a class="wp-action outline" href="/compare">COMPARE MODELS</a><a class="wp-action" href="#register-section">REGISTER INTEREST</a></section>`);
    html = html.replace('<!--WP_MODEL_ENQUIRY-->', template('catalogue-enquiry').replace('data-model=""', `data-model="${id}"`));
  }
  html = html.replace(/<li\b[^>]*data-managed-model="([^"]+)"[^>]*>[\s\S]*?<\/li>/g, (markup,id) => vehicles.some(model => model.id === id) ? markup : '');
  html = html.replace(/<!--WP_NEWS:([^:]+):(\d+):(\d+)-->/g, (_,category,limit,columns) => {
    const records = publishedStories(readJson('news.json'), category);
    return (Number(limit) ? records.slice(0,Number(limit)) : records).map(record=>storyCard(record,columns)).join('') || '<p class="wp-empty">No stories here yet. Please check back soon.</p>';
  });
  res.set('X-Robots-Tag','noindex, nofollow');
  res.status(status).type('html').send(html);
}
router.get(['/models','/compare'], (req,res) => send(req,res,req.path.slice(1)));
router.get('/models/:id', (req,res) => {
  const model = list('vehicles').find(model => model.id === req.params.id && model.published === true);
  if (!model) return send(req,res,'unavailable',404);
  // Official catalogue records use their current managed specs and photography.
  const managed = model.catalogueSource?.startsWith('sime-motors-');
  send(req,res,managed ? 'detail' : index.models[req.params.id]?.file.replace(/\.html$/,'') || 'detail');
});
router.get('/stories/:id', (req,res) => {
  const story = readJson('news.json').find(record => record.id === req.params.id && record.published !== false);
  if (!story) return send(req,res,'unavailable',404);
  const page = index.pages.find(page=>page.route === '/stories/' + req.params.id);
  if (page) return send(req,res,page.name);
  send(req,res,'unavailable',200,story);
});
router.get('*', (req,res,next) => {
  if (/^\/(api|admin|css|js|assets|uploads|server)(\/|\.|$)/.test(req.path)) return next();
  const pathname=req.path.replace(/\/$/,'') || '/';
  if (aliases.has(pathname) && aliases.get(pathname)!==pathname) return res.redirect(308,aliases.get(pathname)+(req.url.includes('?')?req.url.slice(req.url.indexOf('?')):''));
  const page=pages.get(pathname);
  if (page) return send(req,res,page.name);
  if (pathname === '/index.html') return res.redirect(308,'/');
  return send(req,res,'unavailable',404);
});
module.exports=router;
