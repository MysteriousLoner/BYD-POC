// Explicit one-time content import; never runs at startup or overwrites editor changes.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const QR_SLIDE_ID = 'old-klang-road';
const QR_IMAGE = '/uploads/1792047500918-https___forms.gle_m1weXED7gzxSG7QY8.png';
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sourceKey = record => record.sourceUrl ? new URL(record.sourceUrl).href.replace(/\/$/, '') : null;

function validate(records) {
  const pages = require('../content/wordpress/index.json').pages;
  const ids = new Set(), sources = new Set();
  if (!Array.isArray(records) || records.length !== 63) throw new Error('Expected the 63 verified WordPress posts.');
  for (const record of records) {
    const source = new URL(record.sourceUrl);
    if (!/^[a-z0-9-]+$/.test(record.id) || ids.has(record.id) || sources.has(sourceKey(record)) || source.origin !== 'https://millenniumautobyd.com.my' || !record.title || !['Event', 'News', 'Article'].includes(record.category) || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || record.published !== true) throw new Error('Invalid or duplicate WordPress post.');
    if (!/^\/assets\/wordpress\/[a-f0-9]{16}\.webp$/.test(record.image) || !fs.existsSync(path.join(__dirname, '..', record.image))) throw new Error('A WordPress post image is missing.');
    if (!pages.some(page => page.route === '/stories/' + record.id && page.source === record.sourceUrl && fs.existsSync(path.join(__dirname, '..', 'content/wordpress', page.file)))) throw new Error('A full WordPress story page is missing.');
    ids.add(record.id); sources.add(sourceKey(record));
  }
  return records;
}
function mergedNews(current, imported) {
  const merged = [...current];
  for (const post of imported) {
    const existing = merged.find(record => record.id === post.id);
    if (existing && sourceKey(existing) !== sourceKey(post)) throw new Error('A WordPress ID conflicts with an existing post.');
    // Keep local edits and publication choices, including a post imported under another ID.
    if (!existing && !merged.some(record => sourceKey(record) === sourceKey(post))) merged.push(post);
  }
  return merged;
}
function plan(store, imported) {
  const news = store.readJson('news.json'), slides = store.list('hero_slides');
  const qr = slides.find(slide => slide.id === QR_SLIDE_ID);
  if (qr && qr.mediaUrl !== QR_IMAGE) throw new Error('The reviewed QR slide has changed.');
  const merged = mergedNews(news, imported);
  return { currentFingerprint: fingerprint({ news, slides }), addedPosts: merged.length - news.length, preservedPosts: news.length, totalPosts: merged.length, unpublishQr: qr?.published === true, categories: Object.fromEntries(['Event', 'News', 'Article'].map(category => [category, merged.filter(post => post.category === category && post.published !== false).length])) };
}
function synchronize(store, imported, expected) {
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Pass the fingerprint returned by the content plan.');
  return store.transaction(() => {
    const preview = plan(store, imported);
    if (preview.currentFingerprint !== expected) throw new Error('Content changed since review. Generate a fresh plan.');
    if (preview.addedPosts) store.writeJson('news.json', mergedNews(store.readJson('news.json'), imported));
    if (preview.unpublishQr) store.save('hero_slides', { ...store.list('hero_slides').find(slide => slide.id === QR_SLIDE_ID), published: false });
    return { ...preview, applied: true };
  });
}
if (require.main === module) {
  let store;
  try {
    const args = process.argv.slice(2);
    const apply = args.length === 3 && args[0] === '--apply' && args[1] === '--expected' && /^[a-f0-9]{64}$/.test(args[2]);
    if (args.length && !apply) throw new Error('Use no arguments to preview, or --apply --expected <fingerprint>.');
    const imported = validate(JSON.parse(fs.readFileSync(path.join(__dirname, 'data/news.json'), 'utf8')));
    store = require('./database');
    const preview = plan(store, imported);
    if (!apply) console.log(JSON.stringify({ ...preview, applied: false }));
    else {
      if (preview.currentFingerprint !== args[2]) throw new Error('Content changed since review. Generate a fresh plan.');
      const directory = path.join(path.dirname(store.dbPath), 'backups');
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      const backupPath = path.join(directory, 'wordpress-content-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
      store.db.prepare('VACUUM INTO ?').run(backupPath);
      fs.chmodSync(backupPath, 0o600);
      console.log(JSON.stringify({ ...synchronize(store, imported, args[2]), backupPath }));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { store?.db.close(); }
}
module.exports = { QR_SLIDE_ID, QR_IMAGE, fingerprint, validate, mergedNews, plan, synchronize };
