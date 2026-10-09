const crypto = require('node:crypto');
const { db } = require('./database');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(password, salt, 64).toString('hex');
}
function passwordMatches(password, stored) {
  const [salt, expected] = stored.split(':');
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
}
if (!db.prepare('SELECT 1 FROM admin_users LIMIT 1').get() && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
  if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  db.prepare('INSERT INTO admin_users(username,password_hash) VALUES(?,?)').run(process.env.ADMIN_USERNAME, passwordHash(process.env.ADMIN_PASSWORD));
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x.length === 2));
}
function session(req) {
  const token = cookies(req).byd_admin;
  if (!token) return null;
  return db.prepare('SELECT s.*, u.username FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id WHERE token_hash=? AND expires_at>?').get(hash(token), Date.now());
}
function authenticate(req, res, next) {
  req.admin = session(req);
  if (!req.admin) return res.status(401).json({ error: 'Please sign in.' });
  next();
}
function sameOrigin(req, res, next) {
  const expected = process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
  if (req.get('origin') !== expected) return res.status(403).json({ error: 'Invalid request origin.' });
  next();
}
function csrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  sameOrigin(req, res, () => {
    if (req.get('x-csrf-token') !== req.admin.csrf) return res.status(403).json({ error: 'Session token invalid. Refresh and retry.' });
    next();
  });
}
function limiter(limit, windowMs, message) {
  const entries = new Map();
  const timer = setInterval(() => { for (const [key, value] of entries) if (value.until <= Date.now()) entries.delete(key); }, windowMs);
  timer.unref();
  return (req, res, next) => {
    let entry = entries.get(req.ip);
    if (!entry || entry.until <= Date.now()) { entry = { count: 0, until: Date.now() + windowMs }; entries.set(req.ip, entry); }
    if (++entry.count > limit) { res.set('Retry-After', String(Math.ceil((entry.until - Date.now()) / 1000))); return res.status(429).json({ error: message, reply: message }); }
    next();
  };
}
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 12 * 60 * 60 * 1000 };
function routes(router) {
  router.post('/login', sameOrigin, limiter(5, 900000, 'Too many login attempts. Try again in 15 minutes.'), (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) return res.status(400).json({ error: 'Invalid credentials.' });
    const user = db.prepare('SELECT * FROM admin_users WHERE username=?').get(username);
    if (!user || !passwordMatches(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials.' });
    db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').run(Date.now());
    const token = crypto.randomBytes(32).toString('hex'), csrfToken = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO admin_sessions VALUES(?,?,?,?)').run(hash(token), user.id, csrfToken, Date.now() + cookieOptions.maxAge);
    res.cookie('byd_admin', token, cookieOptions).json({ username, csrf: csrfToken });
  });
  router.get('/session', authenticate, (req, res) => res.json({ username: req.admin.username, csrf: req.admin.csrf }));
  router.post('/logout', authenticate, csrf, (req, res) => {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(req.admin.token_hash);
    res.clearCookie('byd_admin', { path: '/' }).json({ ok: true });
  });
}
module.exports = { hash, cookies, passwordHash, passwordMatches, session, authenticate, sameOrigin, csrf, limiter, routes };
