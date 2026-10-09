const express = require('express');
const { db, list, save, remove, transaction } = require('./database');
const auth = require('./auth');
const router = express.Router();
auth.routes(router);
router.use(auth.authenticate, auth.csrf);
const collections = { promotions: 'promotions', branches: 'branches', knowledge: 'knowledge_entries' };
const text = (value, max = 5000) => String(value || '').trim().slice(0, max);
function validate(kind, body, id) {
  const item = { id, published: body.published === true || body.published === 'true' };
  if (kind === 'promotions') {
    item.model = text(body.model, 100);
    const vehicle = list('vehicles').find(v => v.id === item.model);
    if (!vehicle) throw new Error('Choose an existing vehicle.');
    item.name = vehicle.name;
    item.starts_at = text(body.starts_at, 10); item.ends_at = text(body.ends_at, 10); item.validUntil = item.ends_at;
    for (const date of [item.starts_at, item.ends_at]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('Enter a valid date.');
    if (item.starts_at && item.ends_at && item.starts_at > item.ends_at) throw new Error('End date must follow start date.');
    for (const key of ['discount', 'cashback']) {
      const value = body[key] || {}, amount = Number(value.amount || 0);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be zero or greater.');
      item[key] = { amount, type: text(value.type, 50), description: text(value.description) };
    }
    item.terms = text(body.terms);
  } else if (kind === 'branches') {
    for (const key of ['name', 'city', 'state', 'address', 'phone', 'hours', 'mapUrl']) item[key] = text(body[key]);
    if (!item.name || !item.address) throw new Error('Branch name and address are required.');
    if (item.mapUrl && !/^https?:\/\//i.test(item.mapUrl)) throw new Error('Map URL must start with https:// or http://.');
  } else {
    item.category = text(body.category, 50);
    if (!['warranty', 'charging', 'contact', 'test_drive', 'faq', 'service'].includes(item.category)) throw new Error('Choose a valid category.');
    item.title = text(body.title, 200); item.answer = text(body.answer); item.sort_order = Number(body.sort_order) || 0;
    if (!item.title || !item.answer) throw new Error('Title and answer are required.');
  }
  return item;
}
for (const [kind, table] of Object.entries(collections)) {
  router.get(`/${kind}`, (_, res) => res.json(list(table)));
  router.post(`/${kind}`, (req, res) => { try { res.status(201).json(transaction(() => save(table, validate(kind, req.body)))); } catch (e) { res.status(400).json({ error: e.message }); } });
  router.put(`/${kind}/:id`, (req, res) => {
    if (!list(table).some(x => x.id === req.params.id)) return res.status(404).json({ error: 'Record not found.' });
    try { res.json(transaction(() => save(table, validate(kind, req.body, req.params.id)))); } catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.delete(`/${kind}/:id`, (req, res) => res.status(remove(table, req.params.id) ? 204 : 404).end());
}
router.get('/conversations', (req, res) => {
  const clauses = [], args = [], q = req.query;
  if (q.search) { clauses.push('EXISTS(SELECT 1 FROM chat_messages m WHERE m.conversation_id=c.id AND instr(lower(m.content),lower(?))>0)'); args.push(String(q.search)); }
  for (const field of ['language', 'status', 'ip']) if (q[field]) { clauses.push(`c.${field}=?`); args.push(String(q[field])); }
  if (q.from) { clauses.push('c.updated_at>=?'); args.push(String(q.from) + 'T00:00:00.000Z'); }
  if (q.to) { clauses.push('c.updated_at<=?'); args.push(String(q.to) + 'T23:59:59.999Z'); }
  if (q.fallback === 'true' || q.fallback === 'false') clauses.push(`${q.fallback === 'false' ? 'NOT ' : ''}EXISTS(SELECT 1 FROM chat_messages m WHERE m.conversation_id=c.id AND m.fallback=1)`);
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const page = Math.max(1, Math.min(1000000, parseInt(q.page) || 1)), limit = 25;
  const total = db.prepare(`SELECT COUNT(*) count FROM chat_conversations c ${where}`).get(...args).count;
  const items = db.prepare(`SELECT c.id,c.ip,c.created_at,c.updated_at,c.language,c.status,(SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id=c.id) message_count FROM chat_conversations c ${where} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`).all(...args, limit, (page - 1) * limit);
  res.json({ items, total, page, limit });
});
router.get('/conversations/:id', (req, res) => {
  const row = db.prepare('SELECT id,ip,created_at,updated_at,language,status FROM chat_conversations WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Conversation not found.' });
  const messages = db.prepare('SELECT * FROM chat_messages WHERE conversation_id=? ORDER BY id').all(row.id).map(m => ({ ...m, sources: JSON.parse(m.sources), usage: m.usage ? JSON.parse(m.usage) : null }));
  res.json({ ...row, messages });
});
function deleteChats(req, res, ids, all = false) {
  const count = transaction(() => {
    let count = 0;
    if (all) count = db.prepare('DELETE FROM chat_conversations').run().changes;
    else for (const id of new Set(ids)) count += db.prepare('DELETE FROM chat_conversations WHERE id=?').run(id).changes;
    db.prepare('INSERT INTO admin_audit_log(admin_id,action,count,created_at) VALUES(?,?,?,?)').run(req.admin.admin_id, all ? 'delete_all_conversations' : 'delete_conversations', count, new Date().toISOString());
    return count;
  });
  res.json({ deleted: count });
}
router.delete('/conversations/:id', (req, res) => deleteChats(req, res, [req.params.id]));
router.post('/conversations/delete', (req, res) => {
  if (req.body.all === true) {
    if (req.body.confirmation !== 'DELETE ALL CONVERSATIONS') return res.status(400).json({ error: 'Confirmation does not match.' });
    return deleteChats(req, res, [], true);
  }
  if (!Array.isArray(req.body.ids) || !req.body.ids.length || req.body.ids.length > 1000 || req.body.ids.some(id => typeof id !== 'string')) return res.status(400).json({ error: 'Select between 1 and 1,000 conversations.' });
  deleteChats(req, res, req.body.ids);
});
module.exports = router;
