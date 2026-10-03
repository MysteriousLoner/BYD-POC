const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');
const uploadDir = path.join(__dirname, '..', 'uploads');
const submissionsDir = path.join(dataDir, 'submissions');
[uploadDir, submissionsDir].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

const safeName = value => String(value || '').replace(/[^a-zA-Z0-9._-]/g, '-');
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${safeName(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Unsupported file type'), allowed.includes(file.mimetype));
  }
});
const heroUpload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Hero media must be JPG, PNG, WEBP, MP4 or WEBM'), allowed.includes(file.mimetype));
  }
});

function readJson(name, fallback = []) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')); }
  catch { return fallback; }
}
function writeJson(name, value) {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(value, null, 2));
}

router.get('/models', (_, res) => res.json(readJson('models.json')));
const vehicleImages = upload.fields([{ name: 'imageFiles', maxCount: 8 }, { name: 'imageFile', maxCount: 1 }]);

router.post('/models', vehicleImages, (req, res) => {
  const models = readJson('models.json');
  const id = safeName(req.body.id || req.body.name).toLowerCase();
  if (!id || models.some(model => model.id === id)) return res.status(400).json({ error: 'A unique model name is required' });
  const files = [...(req.files?.imageFiles || []), ...(req.files?.imageFile || [])];
  const uploadedImages = files.map(file => `/uploads/${file.filename}`);
  const images = [...new Set([req.body.image, ...uploadedImages].filter(Boolean))];
  const model = { ...req.body, id, image: images[0] || '', images, published: req.body.published !== 'false' };
  models.push(model); writeJson('models.json', models); res.status(201).json(model);
});
router.put('/models/:id', vehicleImages, (req, res) => {
  const models = readJson('models.json');
  const index = models.findIndex(model => model.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Model not found' });
  models[index] = { ...models[index], ...req.body, id: req.params.id, published: req.body.published !== 'false' };
  const files = [...(req.files?.imageFiles || []), ...(req.files?.imageFile || [])];
  const existingImages = Array.isArray(models[index].images) ? models[index].images : [models[index].image].filter(Boolean);
  const uploadedImages = files.map(file => `/uploads/${file.filename}`);
  const images = [...new Set([req.body.image, ...existingImages, ...uploadedImages].filter(Boolean))];
  models[index].images = images;
  models[index].image = images[0] || '';
  writeJson('models.json', models); res.json(models[index]);
});
router.delete('/models/:id', (req, res) => {
  const models = readJson('models.json');
  writeJson('models.json', models.filter(model => model.id !== req.params.id));
  res.status(204).end();
});

router.get('/news', (_, res) => res.json(readJson('news.json')));

router.get('/settings', (_, res) => res.json(readJson('site-settings.json', { hero: {} })));
router.put('/settings/hero', heroUpload.single('mediaFile'), (req, res) => {
  const settings = readJson('site-settings.json', { hero: {} });
  const hero = { ...settings.hero, ...req.body };
  if (req.file) {
    hero.mediaUrl = `/uploads/${req.file.filename}`;
    hero.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  }
  hero.mediaType = hero.mediaType === 'video' ? 'video' : 'image';
  if (hero.mediaType === 'video' && !req.file && !/(youtube\.com|youtu\.be|\.(mp4|webm)(\?.*)?$)/i.test(hero.mediaUrl || '')) {
    return res.status(400).json({ error: 'Video mode requires a YouTube link, uploaded MP4/WEBM, or a direct .mp4/.webm URL' });
  }
  settings.hero = hero;
  writeJson('site-settings.json', settings);
  res.json(hero);
});

router.post('/enquiries', express.json(), (req, res) => {
  const records = readJson('submissions/enquiries.json');
  const record = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...req.body };
  records.push(record); writeJson('submissions/enquiries.json', records); res.status(201).json({ ok: true });
});

router.post('/careers', upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please attach a resume' });
  const records = readJson('submissions/careers.json');
  records.push({ id: Date.now().toString(), createdAt: new Date().toISOString(), ...req.body, resume: `/uploads/${req.file.filename}` });
  writeJson('submissions/careers.json', records); res.status(201).json({ ok: true });
});

router.use((error, _, res, __) => res.status(400).json({ error: error.message }));
module.exports = router;
