const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { readJson, list } = require('./database');
const router = express.Router();
const kinds = new Set(['enquiries', 'careers']);

function records(kind) {
  const branches = list('branches');
  const entries = readJson(`submissions/${kind}.json`, []);
  return (Array.isArray(entries) ? entries : []).map((record, index) => ({
    ...record,
    id: String(record.id ?? `legacy-${index}`),
    branchName: String(record.branchName || branches.find(b => b.id === (record.branchId || record.branch))?.name || record.branch || record.branchId || '')
  }));
}
function publicRecord(record, kind) {
  const { resume, ...fields } = record;
  return { ...fields, hasResume: kind === 'careers' && Boolean(resume), resumeDownloadUrl: kind === 'careers' && resume ? `/api/admin/submissions/careers/${encodeURIComponent(record.id)}/resume` : null };
}
router.param('kind', (req, res, next, kind) => kinds.has(kind) ? next() : res.status(404).json({ error: 'Submission collection not found.' }));
router.get('/:kind', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 500);
  const filtered = records(req.params.kind).filter(record => !search || Object.entries(record).some(([key, value]) => key !== 'resume' && ['string', 'number'].includes(typeof value) && String(value).toLowerCase().includes(search)));
  filtered.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  const limit = 25, total = filtered.length;
  const page = Math.max(1, Math.min(Math.ceil(total / limit) || 1, parseInt(req.query.page, 10) || 1));
  const items = filtered.slice((page - 1) * limit, page * limit).map(record => {
    const { id, name, email, phone, model, position, branchName, createdAt } = record;
    return { id, name, email, phone, model, position, branchName, createdAt };
  });
  res.json({ items, total, page, limit });
});
router.get('/:kind/:id', (req, res) => {
  const record = records(req.params.kind).find(item => item.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Submission not found. Return to the list and refresh.' });
  res.json(publicRecord(record, req.params.kind));
});
router.get('/careers/:id/resume', (req, res) => {
  const record = records('careers').find(item => item.id === req.params.id);
  const unavailable = () => res.status(404).json({ error: 'This résumé is unavailable. The rest of the application is still saved.' });
  if (!record || typeof record.resume !== 'string' || !record.resume.startsWith('/uploads/')) return unavailable();
  const relative = record.resume.slice('/uploads/'.length);
  if (!relative || relative.split(/[\\/]/).some(part => !part || part === '.' || part === '..') || !/\.(pdf|doc|docx)$/i.test(relative)) return unavailable();
  try {
    const root = fs.realpathSync(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
    const file = fs.realpathSync(path.resolve(root, relative));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) return unavailable();
    const name = String(record.name || 'applicant').replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 70);
    res.download(file, `resume-${name}${path.extname(file).toLowerCase()}`, error => { if (error && !res.headersSent) unavailable(); });
  } catch { return unavailable(); }
});
module.exports = router;
