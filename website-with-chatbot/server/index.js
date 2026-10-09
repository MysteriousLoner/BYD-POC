const express = require('express');
const path = require('node:path');
const { db, knowledgeSnapshot, recoverIncompleteConversations } = require('./database');
const auth = require('./auth');
const { createChatRouter, configured } = require('./ai-chat');
const root = path.join(__dirname, '..');
function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Explicit CIDRs/addresses only: do not trust arbitrary forwarded headers.
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(s => s.trim()));
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_, res) => {
    try { db.prepare('SELECT 1').get(); res.json({ status: 'ok', database: 'ok', aiConfigured: configured() }); }
    catch (_) { res.status(503).json({ status: 'error', database: 'unavailable' }); }
  });
  app.use('/api/admin', require('./admin-api'));
  app.use('/api/admin/content', auth.authenticate, auth.csrf, require('./routes/content'));
  app.use('/api/chat', createChatRouter(options.aiClient));
  app.get('/api/offers', (_, res) => res.json(knowledgeSnapshot().promotions));
  app.get('/api/offers/:model', (req, res) => {
    const offer = knowledgeSnapshot().promotions.find(p => p.model === req.params.model);
    res.status(offer ? 200 : 404).json(offer || { error: 'No current promotion.' });
  });
  app.use('/api/content', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && !['/enquiries', '/careers'].includes(req.path)) return res.status(405).json({ error: 'Use the authenticated admin API.' });
    next();
  }, auth.limiter(120, 60000, 'Please wait a minute and retry.'), require('./routes/content'));
  app.get('/admin/login', (req, res) => {
    if (auth.session(req)) return res.redirect('/admin');
    res.sendFile(path.join(root, 'admin-login.html'));
  });
  app.get(['/admin', '/admin-dashboard.html'], (req, res) => {
    if (!auth.session(req)) return res.redirect('/admin/login');
    res.sendFile(path.join(root, 'admin-dashboard.html'));
  });
  app.get(['/admin.html', '/admin-content.html'], (_, res) => res.redirect('/admin'));
  app.get('/', (_, res) => res.sendFile(path.join(root, 'index.html')));
  app.get('/index.html', (_, res) => res.sendFile(path.join(root, 'index.html')));
  // Serve only public assets, never application source, SQLite, or submissions.
  for (const directory of ['css', 'js']) app.use('/' + directory, express.static(path.join(root, directory), { dotfiles: 'deny' }));
  app.use('/uploads', (req, res, next) => {
    if (!/\.(jpe?g|png|webp|mp4|webm)$/i.test(req.path)) return res.sendStatus(404);
    next();
  }, express.static(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'), { dotfiles: 'deny' }));
  app.use((_, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.status === 413 ? 413 : 500).json({ error: 'Unable to complete the request. Please retry.', reply: 'Unable to complete the request. Please retry.' });
  });
  return app;
}
if (require.main === module) {
  recoverIncompleteConversations();
  createApp().listen(process.env.PORT || 3000, () => console.log('BYD website ready'));
}
module.exports = { createApp };
