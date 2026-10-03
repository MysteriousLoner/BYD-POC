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
function normalizeSlide(body, current = {}) {
  let buttons = current.buttons || [];
  if (body.buttonsJson !== undefined) {
    try { buttons = JSON.parse(body.buttonsJson); }
    catch { throw new Error('Buttons are invalid') }
  }
  buttons = Array.isArray(buttons) ? buttons.slice(0, 4).map(button => ({
    label: String(button.label || '').trim(),
    href: String(button.href || '').trim(),
    style: button.style === 'outline' ? 'outline' : 'primary'
  })).filter(button => button.label && button.href) : [];
  return {
    ...current,
    id: current.id || safeName(body.id || body.headline || `slide-${Date.now()}`).toLowerCase(),
    eyebrow: String(body.eyebrow || ''),
    headline: String(body.headline || ''),
    description: String(body.description || ''),
    mediaType: body.mediaType === 'video' ? 'video' : 'image',
    mediaUrl: String(body.mediaUrl || current.mediaUrl || ''),
    priority: Math.max(1, Number(body.priority) || 1),
    duration: Math.max(3000, Math.min(30000, Number(body.duration) || 7000)),
    published: body.published !== 'false',
    buttons
  };
}
function validateSlide(slide) {
  if (!slide.headline) throw new Error('A slide headline is required');
  if (!slide.mediaUrl) throw new Error('Please upload media or enter a media URL');
  if (slide.mediaType === 'video' && !/(youtube\.com|youtu\.be|\.(mp4|webm)(\?.*)?$)/i.test(slide.mediaUrl)) {
    throw new Error('Video slides require a YouTube link, uploaded MP4/WEBM, or a direct video URL');
  }
}
router.post('/settings/hero-slides', heroUpload.single('mediaFile'), (req, res) => {
  try {
    const settings = readJson('site-settings.json', { heroSlides: [] });
    const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];
    const slide = normalizeSlide(req.body);
    if (slides.some(item => item.id === slide.id)) slide.id = `${slide.id}-${Date.now()}`;
    if (req.file) { slide.mediaUrl = `/uploads/${req.file.filename}`; slide.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image'; }
    validateSlide(slide); slides.push(slide); settings.heroSlides = slides;
    writeJson('site-settings.json', settings); res.status(201).json(slide);
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/settings/hero-slides/:id', heroUpload.single('mediaFile'), (req, res) => {
  try {
    const settings = readJson('site-settings.json', { heroSlides: [] });
    const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];
    const index = slides.findIndex(item => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Slide not found' });
    const slide = normalizeSlide(req.body, slides[index]);
    if (req.file) { slide.mediaUrl = `/uploads/${req.file.filename}`; slide.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image'; }
    validateSlide(slide); slides[index] = slide; settings.heroSlides = slides;
    writeJson('site-settings.json', settings); res.json(slide);
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.delete('/settings/hero-slides/:id', (req, res) => {
  const settings = readJson('site-settings.json', { heroSlides: [] });
  const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];
  if (!slides.some(item => item.id === req.params.id)) return res.status(404).json({ error: 'Slide not found' });
  settings.heroSlides = slides.filter(item => item.id !== req.params.id);
  writeJson('site-settings.json', settings); res.status(204).end();
});
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
