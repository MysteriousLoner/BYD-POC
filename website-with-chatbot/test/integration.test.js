const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byd-test-'));
process.env.DB_PATH = path.join(dir, 'test.sqlite');
process.env.UPLOAD_DIR = path.join(dir, 'uploads');
process.env.ADMIN_USERNAME = 'tester'; process.env.ADMIN_PASSWORD = 'testing-password-123';
process.env.PUBLIC_ORIGIN = 'http://localhost';
process.env.AI_PROVIDER = 'openai';
const store = require('../server/database');
const { createApp } = require('../server/index');
let mode = 'valid', lastRequest;
const aiClient = { responses: { create: async request => {
  lastRequest = request;
  if (['timeout', 'failure'].includes(mode)) throw new Error(mode);
  if (mode === 'refusal') return { status: 'completed', output_text: '' };
  if (mode === 'malformed') return { status: 'completed', output_text: '{broken' };
  const snapshot = JSON.parse(request.instructions.split('CURRENT_KNOWLEDGE=')[1]);
  const message = request.input.at(-1).content;
  const language = /中文/.test(message) ? 'zh' : /berapa/.test(message) ? 'ms' : 'en';
  const promo = snapshot.promotions.find(p => p.id === 'test-promo');
  const fallback = mode === 'missing';
  return { status: 'completed', output_text: JSON.stringify({ reply: fallback ? 'Information unavailable.' : promo?.discount.description || 'Hello', language, fallback, sources: mode === 'invalid-source' ? [{ type: 'vehicle', id: 'made-up', label: 'bad' }] : promo && !fallback ? [{ type: 'promotion', id: promo.id, label: 'Test' }] : [] }), usage: { total_tokens: 100 } };
} } };
let server, origin, adminCookie, csrf;
async function request(url, { method = 'GET', body, cookie, token, headers = {} } = {}) {
  const response = await fetch(origin + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(token ? { 'X-CSRF-Token': token } : {}), ...(method !== 'GET' ? { Origin: 'http://localhost' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const result = { status: response.status, headers: response.headers, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  const text = await response.text(); try { result.data = JSON.parse(text); } catch { result.text = text; } return result;
}
before(async () => { server = createApp({ aiClient }).listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); origin = 'http://127.0.0.1:' + server.address().port; });
after(async () => { await new Promise(resolve => server.close(resolve)); store.db.close(); fs.rmSync(dir, { recursive: true }); });
test('migration preserves relations, WAL, images and avoids reseeding empty tables', () => {
  assert.equal(store.db.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  assert.equal(store.db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(store.list('promotions').length, 6); assert.equal(store.list('vehicles').length, 6);
  assert.equal(store.list('vehicles').find(v => v.id === 'shark6').published, false);
  assert.equal(store.db.prepare('PRAGMA foreign_key_check').all().length, 0);
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', "const s=require('./server/database'); console.log(s.list('promotions').length);s.db.close()"], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0); assert.match(result.stdout, /6/);
});
test('private source, admin access and legacy mutation endpoints are blocked', async () => {
  assert.equal((await request('/admin')).status, 302);
  assert.equal((await request('/admin.html')).headers.get('location'), '/admin');
  for (const url of ['/server/data/offers.json', '/server/runtime/byd.sqlite', '/server/index.js', '/package.json']) assert.equal((await request(url)).status, 404);
  assert.equal((await request('/api/admin/conversations')).status, 401);
  assert.equal((await request('/api/content/models', { method: 'POST', body: {} })).status, 405);
  assert.equal((await request('/api/offers/seal', { method: 'PUT', body: {} })).status, 404);
  const publicModels = await request('/api/content/models'); assert(publicModels.data.every(v => v.published));
});
test('login, cookie attributes, CSRF and origin protection', async () => {
  let r = await request('/api/admin/login', { method: 'POST', body: { username: 'tester', password: 'testing-password-123' } });
  assert.equal(r.status, 200); adminCookie = r.cookie; csrf = r.data.csrf;
  assert.match(r.headers.get('set-cookie'), /HttpOnly/); assert.match(r.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await request('/api/admin/session', { cookie: adminCookie })).status, 200);
  assert.equal((await request('/api/admin/knowledge', { method: 'POST', cookie: adminCookie, body: {} })).status, 403);
  assert.equal((await request('/api/admin/knowledge', { method: 'POST', cookie: adminCookie, token: csrf, body: {}, headers: { Origin: 'http://evil.example' } })).status, 403);
});
test('admin CRUD and date/publication filtering feed current knowledge', async () => {
  const body = { id: 'ignored', model: 'dolphin', published: true, starts_at: '2020-01-01', ends_at: '2099-12-31', discount: { amount: 42, type: 'cash', description: 'RM 42 test rebate' }, cashback: { amount: 0, type: 'none' }, terms: 'Test terms' };
  const r = await request('/api/admin/promotions', { method: 'POST', cookie: adminCookie, token: csrf, body }); assert.equal(r.status, 201);
  store.remove('promotions', r.data.id); store.save('promotions', { ...r.data, id: 'test-promo' });
  for (const [id, change] of [['future', { starts_at: '2099-01-01' }], ['expired', { ends_at: '2001-01-01' }], ['hidden', { published: false }], ['hidden-car', { model: 'seal' }]]) store.save('promotions', { ...r.data, id, ...change });
  const snapshot = store.knowledgeSnapshot(); assert(snapshot.promotions.some(p => p.id === 'test-promo'));
  for (const id of ['future', 'expired', 'hidden', 'hidden-car']) assert(!snapshot.promotions.some(p => p.id === id));
  const knowledge = await request('/api/admin/knowledge', { method: 'POST', cookie: adminCookie, token: csrf, body: { category: 'warranty', title: 'Warranty', answer: 'Only approved warranty details.', published: true } }); assert.equal(knowledge.status, 201);
  assert(store.knowledgeSnapshot().knowledge.some(k => k.id === knowledge.data.id));
  const branch = await request('/api/admin/branches', { method: 'POST', cookie: adminCookie, token: csrf, body: { name: 'Test branch', address: 'Test address', published: true } }); assert.equal(branch.status, 201);
  assert.equal((await request('/api/admin/branches/' + branch.data.id, { method: 'DELETE', cookie: adminCookie, token: csrf })).status, 204);
});
test('vehicle and slide uploads persist through the authenticated content API', async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: 'Upload test vehicle', type: 'Electric', price: 'RM 100', description: 'Test only', published: 'true' })) form.set(key, value);
  form.set('imageFiles', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6z3sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png');
  const response = await fetch(origin + '/api/admin/content/models', { method: 'POST', headers: { Cookie: adminCookie, Origin: 'http://localhost', 'X-CSRF-Token': csrf }, body: form });
  assert.equal(response.status, 201); const vehicle = await response.json(); assert.equal(vehicle.images.length, 1);
  assert.equal((await fetch(origin + vehicle.images[0])).status, 200);
  const slide = new FormData();
  for (const [key, value] of Object.entries({ headline: 'Test slide', mediaType: 'image', mediaUrl: 'https://example.com/car.png', published: 'true', priority: '3', duration: '5000', buttonsJson: '[{"label":"Models","href":"#models"}]' })) slide.set(key, value);
  const r = await fetch(origin + '/api/admin/content/settings/hero-slides', { method: 'POST', headers: { Cookie: adminCookie, Origin: 'http://localhost', 'X-CSRF-Token': csrf }, body: slide }); assert.equal(r.status, 201);
  const savedSlide = await r.json(); assert(store.list('hero_slides').some(s => s.id === savedSlide.id));
  assert.equal((await request('/api/admin/content/settings/hero-slides/' + savedSlide.id, { method: 'DELETE', cookie: adminCookie, token: csrf })).status, 204);
  assert.equal((await request('/api/admin/content/models/' + vehicle.id, { method: 'DELETE', cookie: adminCookie, token: csrf })).status, 204);
});
let conversationId, chatCookie;
test('chat is grounded, stores messages and ignores forged IP headers', async () => {
  const r = await request('/api/chat', { method: 'POST', body: { message: 'Dolphin offers?' }, headers: { 'X-Forwarded-For': '203.0.113.9' } });
  assert.equal(r.status, 200); assert.equal(r.data.reply, 'RM 42 test rebate'); conversationId = r.data.conversationId; chatCookie = r.cookie;
  assert.equal(lastRequest.store, false);
  const log = store.db.prepare('SELECT * FROM chat_conversations WHERE id=?').get(conversationId); assert.equal(log.ip, '127.0.0.1');
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM chat_messages WHERE conversation_id=?').get(conversationId).n, 2);
  const promo = store.list('promotions').find(p => p.id === 'test-promo'); promo.discount.description = 'RM 99 updated rebate'; store.save('promotions', promo);
  const followup = await request('/api/chat', { method: 'POST', cookie: chatCookie, body: { message: 'And now?', conversationId } });
  assert.equal(followup.data.reply, 'RM 99 updated rebate'); assert.equal(followup.data.conversationId, conversationId);
  const forged = await request('/api/chat', { method: 'POST', body: { message: 'Hello', conversationId } }); assert.notEqual(forged.data.conversationId, conversationId);
});
test('multilingual answers, messages compatibility, and persisted AI failures', async () => {
  for (const [message, language] of [['berapa harga?', 'ms'], ['中文价格', 'zh']]) { const r = await request('/api/chat', { method: 'POST', body: { messages: [{ role: 'user', content: message }] } }); assert.equal(r.data.language, language); }
  for (const scenario of ['missing', 'timeout', 'failure', 'refusal', 'malformed', 'invalid-source']) {
    mode = scenario; const r = await request('/api/chat', { method: 'POST', body: { message: 'A question' } }); assert.equal(r.data.fallback, true);
    const rows = store.db.prepare('SELECT * FROM chat_messages WHERE conversation_id=? ORDER BY id').all(r.data.conversationId); assert.equal(rows.length, 2); assert.equal(rows[1].fallback, 1);
    assert.equal(rows[1].status, scenario === 'missing' ? 'completed' : 'error');
  }
  mode = 'valid';
  assert.equal((await request('/api/chat', { method: 'POST', body: { message: 'x'.repeat(1001) } })).status, 400);
});
test('admin log filters, transcripts, deletion and metadata-only audit', async () => {
  const headers = { cookie: adminCookie, token: csrf };
  const results = await request('/api/admin/conversations?search=updated&language=en&status=completed&ip=127.0.0.1&fallback=false', headers); assert(results.data.total > 0);
  assert.equal(results.data.limit, 25);
  const transcript = await request('/api/admin/conversations/' + conversationId, headers); assert.equal(transcript.data.messages.length, 4); assert(transcript.data.messages[1].usage.total_tokens);
  assert.equal((await request('/api/admin/conversations/' + conversationId, { ...headers, method: 'DELETE' })).data.deleted, 1);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM chat_messages WHERE conversation_id=?').get(conversationId).n, 0);
  const id = store.db.prepare('SELECT id FROM chat_conversations LIMIT 1').get().id;
  assert.equal((await request('/api/admin/conversations/delete', { ...headers, method: 'POST', body: { ids: [id] } })).data.deleted, 1);
  assert.equal((await request('/api/admin/conversations/delete', { ...headers, method: 'POST', body: { all: true, confirmation: 'wrong' } })).status, 400);
  assert.equal((await request('/api/admin/conversations/delete', { ...headers, method: 'POST', body: { all: true, confirmation: 'DELETE ALL CONVERSATIONS' } })).status, 200);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM chat_conversations').get().n, 0);
  const audit = store.db.prepare('SELECT * FROM admin_audit_log').all(); assert.equal(audit.length, 3); assert(!JSON.stringify(audit).includes('127.0.0.1'));
});
test('session expiry, logout and login throttling', async () => {
  store.db.prepare('UPDATE admin_sessions SET expires_at=0').run(); assert.equal((await request('/api/admin/session', { cookie: adminCookie })).status, 401);
  const login = await request('/api/admin/login', { method: 'POST', body: { username: 'tester', password: 'testing-password-123' } });
  assert.equal((await request('/api/admin/logout', { method: 'POST', cookie: login.cookie, token: login.data.csrf, body: {} })).status, 200);
  assert.equal((await request('/api/admin/session', { cookie: login.cookie })).status, 401);
  let r; for (let i = 0; i < 6; i++) r = await request('/api/admin/login', { method: 'POST', body: { username: 'tester', password: 'incorrect' } }); assert.equal(r.status, 429);
});
test('DeepSeek JSON adapter validates and persists replies', async () => {
  process.env.AI_PROVIDER = 'deepseek';
  let called;
  const deepseek = { chat: { completions: { create: async request => { called = request; return { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'Hello', language: 'en', sources: [], fallback: false }) } }], usage: { total_tokens: 9 } }; } } } };
  const srv = createApp({ aiClient: deepseek }).listen(0, '127.0.0.1'); await new Promise(resolve => srv.once('listening', resolve));
  try {
    const r = await fetch('http://127.0.0.1:' + srv.address().port + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hello' }) });
    assert.equal(r.status, 200); assert.equal((await r.json()).reply, 'Hello'); assert.equal(called.response_format.type, 'json_object'); assert.equal(called.model, 'deepseek-flash');
    let limited; for (let i = 0; i < 21; i++) limited = await fetch('http://127.0.0.1:' + srv.address().port + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(limited.status, 429);
  } finally { await new Promise(resolve => srv.close(resolve)); process.env.AI_PROVIDER = 'openai'; }
});
