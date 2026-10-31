const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { list, readJson } = require('./database');
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
function storyCard(record, columns) {
  const url = '/stories/' + encodeURIComponent(record.id);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(record.date) ? new Date(record.date + 'T12:00:00+08:00').toLocaleDateString('en-MY',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}) : record.date;
  return `<div class="col-lg-${columns} col-md-6"><div class="elementskit-post-image-card"><div class="elementskit-entry-header"><a href="${url}" class="elementskit-entry-thumb"><img src="${escape(record.image || '/assets/placeholder.svg')}" alt="${escape(record.title)}" loading="lazy" decoding="async"></a></div><div class="elementskit-post-body"><div class="post-meta-list"><span class="meta-date"><span class="meta-date-text">${escape(date)}</span></span></div><h2 class="entry-title"><a href="${url}">${escape(record.title)}</a></h2>${record.category === 'Article' ? `<p class="elementskit-post-excerpt">${escape(String(record.summary || '').slice(0,180))}</p>` : ''}<div class="btn-wraper"><a class="elementskit-btn whitespace--normal" href="${url}">Read more</a></div></div></div></div>`;
}
function send(req, res, name, status = 200) {
  const vehicles = list('vehicles').filter(model => model.published === true);
  let html = template(name);
  html = html.replace(/<li\b[^>]*data-managed-model="([^"]+)"[^>]*>[\s\S]*?<\/li>/g, (markup,id) => vehicles.some(model => model.id === id) ? markup : '');
  html = html.replace(/<!--WP_NEWS:([^:]+):(\d+):(\d+)-->/g, (_,category,limit,columns) => {
    const records = readJson('news.json').filter(record => record.published !== false && record.category === category).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return (Number(limit) ? records.slice(0,Number(limit)) : records).map(record=>storyCard(record,columns)).join('') || '<p class="wp-empty">No stories here yet. Please check back soon.</p>';
  });
  res.set('X-Robots-Tag','noindex, nofollow');
  res.status(status).type('html').send(html);
}
router.get(['/models','/compare'], (req,res) => send(req,res,req.path.slice(1)));
router.get('/models/:id', (req,res) => {
  if (!list('vehicles').some(model => model.id === req.params.id && model.published === true)) return send(req,res,'unavailable',404);
  send(req,res,index.models[req.params.id]?.file.replace(/\.html$/,'') || 'detail');
});
router.get('/stories/:id', (req,res) => {
  const story = readJson('news.json').find(record => record.id === req.params.id && record.published !== false);
  if (!story) return send(req,res,'unavailable',404);
  const page = index.pages.find(page=>page.route === '/stories/' + req.params.id);
  if (page) return send(req,res,page.name);
  let html=template('unavailable').replace('data-feature="unavailable"','data-feature="story"');
  res.set('X-Robots-Tag','noindex, nofollow').type('html').send(html);
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
