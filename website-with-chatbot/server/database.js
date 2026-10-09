const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'runtime', 'byd.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;');
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const value = fn(); db.exec('COMMIT'); return value; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
db.exec(`CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vehicle_images (vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE, position INTEGER, url TEXT NOT NULL, PRIMARY KEY(vehicle_id, position));
CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS branches (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS knowledge_entries (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hero_slides (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents (name TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat_conversations (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, ip TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, language TEXT NOT NULL, sources TEXT NOT NULL DEFAULT '[]', fallback INTEGER NOT NULL DEFAULT 0, model TEXT, usage TEXT, latency_ms INTEGER, status TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS chat_messages_conversation ON chat_messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS chat_conversations_activity ON chat_conversations(updated_at);
CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admin_users(id), csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin_audit_log (id INTEGER PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admin_users(id), action TEXT NOT NULL, count INTEGER NOT NULL, created_at TEXT NOT NULL);
`);
const tables = new Set(['vehicles', 'promotions', 'branches', 'knowledge_entries', 'hero_slides']);
function list(table) {
  if (!tables.has(table)) throw new Error('Invalid collection');
  return db.prepare(`SELECT data FROM ${table} ORDER BY rowid`).all().map(row => JSON.parse(row.data));
}
function save(table, value) {
  if (!tables.has(table)) throw new Error('Invalid collection');
  const item = { ...value, id: value.id || randomUUID() };
  if (table === 'promotions') {
    db.prepare('INSERT INTO promotions(id,vehicle_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET vehicle_id=excluded.vehicle_id,data=excluded.data').run(item.id, item.model, JSON.stringify(item));
  } else {
    db.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(item.id, JSON.stringify(item));
  }
  if (table === 'vehicles') {
    db.prepare('DELETE FROM vehicle_images WHERE vehicle_id=?').run(item.id);
    (item.images || [item.image].filter(Boolean)).forEach((url, position) => db.prepare('INSERT INTO vehicle_images VALUES(?,?,?)').run(item.id, position, url));
  }
  return item;
}
function remove(table, id) {
  if (!tables.has(table)) throw new Error('Invalid collection');
  return db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id).changes;
}
const seedDir = process.env.SEED_DIR || path.join(__dirname, 'data');
function seed(name, fallback = []) {
  const filename = path.join(seedDir, name);
  if (!fs.existsSync(filename)) return fallback;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
if (!db.prepare('SELECT 1 FROM migrations WHERE version=1').get()) transaction(() => {
  if (!list('vehicles').length) seed('models.json').forEach(v => save('vehicles', v));
  if (!list('promotions').length) seed('offers.json').forEach(p => {
    if (!list('vehicles').some(v => v.id === p.model)) save('vehicles', { id: p.model, name: p.name, published: false, description: '', price: '', type: '' });
    save('promotions', { ...p, id: `legacy-${p.model}`, starts_at: '', ends_at: p.validUntil || '', published: true });
  });
  const settings = seed('site-settings.json', {});
  if (!list('hero_slides').length) (settings.heroSlides || (settings.hero ? [{ ...settings.hero, id: 'legacy-hero', published: true, duration: 7000, priority: 1, buttons: [] }] : [])).forEach(s => save('hero_slides', s));
  for (const name of ['news.json', 'submissions/enquiries.json', 'submissions/careers.json']) {
    db.prepare('INSERT OR IGNORE INTO documents VALUES(?,?)').run(name, JSON.stringify(seed(name)));
  }
  db.prepare('INSERT INTO migrations VALUES(1,?)').run(new Date().toISOString());
});
// Recover accepted requests interrupted by a process restart without losing their log.
function recoverIncompleteConversations() { transaction(() => {
  for (const conversation of db.prepare("SELECT id,language FROM chat_conversations WHERE status='pending'").all()) {
    const reply = { en: 'The previous request was interrupted. Please send your question again.', ms: 'Permintaan sebelumnya terganggu. Sila hantar soalan anda semula.', zh: '上一条请求被中断，请重新发送您的问题。' }[conversation.language] || 'Please send your question again.';
    const now = new Date().toISOString();
    db.prepare('INSERT INTO chat_messages(conversation_id,role,content,created_at,language,fallback,status) VALUES(?,?,?,?,?,1,?)').run(conversation.id, 'assistant', reply, now, conversation.language, 'error');
    db.prepare("UPDATE chat_conversations SET status='error',updated_at=? WHERE id=?").run(now, conversation.id);
  }
}); }
const mapping = { 'models.json': 'vehicles', 'offers.json': 'promotions' };
function readJson(name, fallback = []) {
  if (mapping[name]) return list(mapping[name]);
  if (name === 'site-settings.json') return { heroSlides: list('hero_slides') };
  const row = db.prepare('SELECT data FROM documents WHERE name=?').get(name);
  return row ? JSON.parse(row.data) : fallback;
}
function writeJson(name, data) {
  const table = mapping[name] || (name === 'site-settings.json' ? 'hero_slides' : null);
  if (!table) return db.prepare('INSERT INTO documents VALUES(?,?) ON CONFLICT(name) DO UPDATE SET data=excluded.data').run(name, JSON.stringify(data));
  const items = name === 'site-settings.json' ? data.heroSlides : data;
  if (!Array.isArray(items)) throw new Error('Invalid data');
  transaction(() => {
    for (const old of list(table)) if (!items.some(item => item.id === old.id)) remove(table, old.id);
    items.forEach(item => save(table, item));
  });
}
function knowledgeSnapshot(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const vehicles = list('vehicles').filter(v => v.published === true);
  const promotions = list('promotions').filter(p => p.published === true && vehicles.some(v => v.id === p.model) && (!p.starts_at || p.starts_at <= today) && (!p.ends_at || p.ends_at >= today));
  return { today, vehicles, promotions, branches: list('branches').filter(b => b.published === true), knowledge: list('knowledge_entries').filter(k => k.published === true) };
}
module.exports = { db, dbPath, transaction, list, save, remove, readJson, writeJson, knowledgeSnapshot, recoverIncompleteConversations };
