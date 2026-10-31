const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byd-inbox-'));
Object.assign(process.env, { DB_PATH: path.join(dir, 'test.sqlite'), UPLOAD_DIR: path.join(dir, 'uploads'), ADMIN_USERNAME: 'inbox-editor', ADMIN_PASSWORD: 'inbox-test-password-123', PUBLIC_ORIGIN: 'http://localhost' });
process.env.SEED_DIR = path.join(__dirname, 'fixtures', 'legacy-seed');
const store = require('../server/database');
const { createApp } = require('../server/index');
let server, origin, cookie, csrf;
before(async () => {
  server = createApp().listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  const response = await fetch(origin + '/api/admin/login', { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'inbox-editor', password: 'inbox-test-password-123' }) });
  cookie = response.headers.get('set-cookie').split(';')[0]; csrf = (await response.json()).csrf;
});
after(async () => { await new Promise(resolve => server.close(resolve)); store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
const headers = () => ({ Cookie: cookie, Origin: 'http://localhost', 'X-CSRF-Token': csrf });
const get = url => fetch(origin + url, { headers: headers() });

test('submission lists require authentication, search saved fields and paginate without modifying legacy records', async () => {
  const entries = Array.from({ length: 28 }, (_, i) => ({ id: String(i), name: 'Applicant ' + i, email: `person${i}@example.test`, phone: '0123456789', model: 'BYD SEAL', branch: 'cheras', createdAt: new Date(Date.UTC(2026, 9, i + 1)).toISOString(), message: i === 2 ? 'Special legacy message' : '' }));
  entries.push({ name: 'Legacy without ID', branch: 'Old showroom' });
  store.writeJson('submissions/enquiries.json', entries);
  assert.equal((await fetch(origin + '/api/admin/submissions/enquiries')).status, 401);
  const first = await (await get('/api/admin/submissions/enquiries')).json(); assert.equal(first.total, 29); assert.equal(first.items.length, 25); assert.equal(first.items[0].id, '27'); assert.equal(first.items[0].branchName, 'BYD Cheras');
  const second = await (await get('/api/admin/submissions/enquiries?page=2')).json(); assert.equal(second.items.length, 4); assert.equal(second.items.at(-1).id, 'legacy-28');
  for (const query of ['Special legacy message', 'person2@', 'BYD Cheras', '0123456789']) assert((await (await get('/api/admin/submissions/enquiries?search=' + encodeURIComponent(query))).json()).total > 0);
  const empty = await (await get('/api/admin/submissions/enquiries?search=nonexistent')).json(); assert.equal(empty.total, 0); assert.equal(empty.page, 1);
  const detail = await (await get('/api/admin/submissions/enquiries/legacy-28')).json(); assert.equal(detail.name, 'Legacy without ID'); assert.equal(detail.branchName, 'Old showroom');
  assert.equal((await get('/api/admin/submissions/enquiries/missing')).status, 404);
  assert.equal((await get('/api/admin/submissions/unknown')).status, 404);
  assert.deepEqual(store.readJson('submissions/enquiries.json'), entries);
  assert.equal((await fetch(origin + '/api/admin/submissions/enquiries/2', { method: 'DELETE', headers: headers() })).status, 404);
  assert.equal((await fetch(origin + '/api/content/submissions/enquiries')).status, 404);
});
test('résumé download is authenticated and rejects missing files, traversal, symlinks and non-documents', async () => {
  fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.UPLOAD_DIR, 'accepted.pdf'), '%PDF-1.4 fixture');
  fs.writeFileSync(path.join(dir, 'outside.pdf'), 'private'); fs.symlinkSync(path.join(dir, 'outside.pdf'), path.join(process.env.UPLOAD_DIR, 'link.pdf'));
  const entries = [
    { id: 'ok', name: 'Candidate', branchId: 'deleted-branch', branchName: 'Branch when submitted', resume: '/uploads/accepted.pdf' },
    { id: 'missing', resume: '/uploads/missing.pdf' }, { id: 'traversal', resume: '/uploads/../outside.pdf' }, { id: 'symlink', resume: '/uploads/link.pdf' }, { id: 'source', resume: '/uploads/test.js' }, { id: 'legacy', name: 'No attachment' }
  ]; store.writeJson('submissions/careers.json', entries);
  const url = '/api/admin/submissions/careers/ok/resume'; assert.equal((await fetch(origin + url)).status, 401);
  const download = await get(url); assert.equal(download.status, 200); assert.match(download.headers.get('content-disposition'), /attachment; filename="resume-Candidate.pdf"/); assert.match(download.headers.get('cache-control'), /no-store/); assert.match(await download.text(), /%PDF/);
  assert.equal((await fetch(origin + '/uploads/accepted.pdf')).status, 404);
  const detail = await (await get('/api/admin/submissions/careers/ok')).json(); assert.equal(detail.branchName, 'Branch when submitted'); assert.equal(detail.hasResume, true); assert.equal(detail.resume, undefined); assert.equal(detail.resumeDownloadUrl, url);
  for (const id of ['missing', 'traversal', 'symlink', 'source', 'legacy']) assert.equal((await get(`/api/admin/submissions/careers/${id}/resume`)).status, 404, id);
  assert.equal((await (await get('/api/admin/submissions/careers/legacy')).json()).hasResume, false);
});
test('slide reordering preserves media and content, rejects stale lists and requires CSRF', async () => {
  const before = store.readJson('site-settings.json').heroSlides, ids = before.map(slide => slide.id).reverse();
  const body = JSON.stringify({ ids });
  const request = h => fetch(origin + '/api/admin/content/settings/hero-slides/reorder', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body });
  assert.equal((await request({})).status, 401); assert.equal((await request({ Cookie: cookie, Origin: 'http://localhost' })).status, 403);
  const reordered = await request(headers()); assert.equal(reordered.status, 200); const result = await reordered.json(); assert.deepEqual(result.map(slide => slide.id), ids);
  for (const [index, slide] of result.entries()) assert.deepEqual(slide, { ...before.find(old => old.id === slide.id), priority: index + 1 });
  const stale = await fetch(origin + '/api/admin/content/settings/hero-slides/reorder', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [ids[0], ids[0]] }) }); assert.equal(stale.status, 409);
});
