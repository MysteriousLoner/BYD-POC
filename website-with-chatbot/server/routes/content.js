const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { randomUUID } = require('node:crypto');
const vehicleContent = require('../vehicle-content');

const router = express.Router();
const { readJson, writeJson, list } = require('../database');
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const safeName = value => String(value || '').replace(/[^a-zA-Z0-9._-]/g, '-');
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${randomUUID()}-${safeName(file.originalname)}`)
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

// All mutation routes in this router are mounted behind authentication and CSRF.
router.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method) && !['/careers', '/enquiries'].includes(req.path) && !req.admin) return res.sendStatus(401);
  next();
});
const imageUpload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024, files: 32, fields: 100 }, fileFilter: (_, file, cb) => {
  const valid = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) && (['imageFile', 'imageFiles'].includes(file.fieldname) || /^colourImage_[a-z0-9-]+$/.test(file.fieldname));
  cb(valid ? null : new Error('Use JPG, PNG or WEBP vehicle images.'), valid);
}}).any();
function cleanup(files) { for (const file of files || []) { try { fs.unlinkSync(file.path); } catch {} } }
function safeUrl(value, allowAnchor = false) {
  return !value || vehicleContent.safeUrl(value) || (allowAnchor && /^#[a-zA-Z0-9_-]+$/.test(value));
}
router.get('/models', (req, res) => res.json(readJson('models.json').filter(v => req.admin || v.published === true).map(vehicleContent.normalize)));
router.get('/models/:id', (req, res) => {
  const model = readJson('models.json').find(v => v.id === req.params.id && (req.admin || v.published === true));
  res.status(model ? 200 : 404).json(model ? vehicleContent.normalize(model) : { error: 'This model is unavailable. Please explore our current line-up.' });
});
for (const method of ['post', 'put']) router[method](method === 'post' ? '/models' : '/models/:id', imageUpload, (req, res) => {
  try {
    const models = readJson('models.json'), current = models.find(m => m.id === req.params.id);
    if (method === 'put' && !current) { cleanup(req.files); return res.status(404).json({ error: 'Model not found.' }); }
    const id = current?.id || safeName(req.body.id || req.body.name).toLowerCase();
    if (!id || (!current && models.some(m => m.id === id))) throw new Error('A unique model name is required.');
    const model = { ...vehicleContent.vehicle(req.body, current, req.files), id };
    if (current) models[models.indexOf(current)] = model; else models.push(model);
    writeJson('models.json', models); res.status(current ? 200 : 201).json(model);
  } catch (error) { cleanup(req.files); res.status(400).json({ error: error.message }); }
});
router.delete('/models/:id', (req, res) => {
  const models = readJson('models.json');
  if (!models.some(m => m.id === req.params.id)) return res.status(404).json({ error: 'Model not found.' });
  writeJson('models.json', models.filter(m => m.id !== req.params.id)); res.status(204).end();
});
router.get('/branches', (_, res) => res.json(list('branches').filter(b => b.published === true).map(b => ({ id: b.id, name: b.name, city: b.city }))));
router.get('/news', (req, res) => res.json(readJson('news.json').filter(n => req.admin || n.published !== false)));
const eventImage = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_, file, cb) => {
  const valid = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  cb(valid ? null : new Error('Use a JPG, PNG or WEBP event image.'), valid);
}}).single('imageFile');
for (const method of ['post', 'put']) router[method](method === 'post' ? '/news' : '/news/:id', eventImage, async (req, res, next) => {
  try {
    const items = readJson('news.json'), current = items.find(item => item.id === req.params.id);
    if (method === 'put' && !current) { cleanup([req.file].filter(Boolean)); return res.status(404).json({ error: 'Event not found.' }); }
    const title = String(req.body.title || '').trim(), summary = String(req.body.summary || '').trim(), date = String(req.body.date || '');
    if (!title || title.length > 200 || !summary || summary.length > 5000) throw new Error('Enter a title (up to 200 characters) and summary (up to 5,000).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Enter a valid event date.');
    const category = req.body.category || 'Event';
    if (!['Event', 'News', 'Article'].includes(category)) throw new Error('Choose Event, News or Article.');
    const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || current?.image;
    if (!image || !vehicleContent.safeUrl(image)) throw new Error('Upload an image or enter a valid image URL.');
    let imageDimensions = current?.image === image ? current.imageDimensions : null;
    if (req.file) {
      const meta = await sharp(req.file.path).metadata();
      const rotated = [5,6,7,8].includes(meta.orientation);
      imageDimensions = { width: rotated ? meta.height : meta.width, height: rotated ? meta.width : meta.height };
    }
    const item = { id: current?.id || randomUUID(), title, summary, date, category, image, imageDimensions, published: req.body.published !== false && req.body.published !== 'false' };
    const latest = readJson('news.json');
    if (current) {
      const index = latest.findIndex(entry => entry.id === current.id);
      if (index < 0) throw new Error('This story was deleted while saving. Reload the story list.');
      latest[index] = item;
    } else latest.push(item);
    writeJson('news.json', latest);
    res.status(current ? 200 : 201).json(item);
  } catch (error) { cleanup([req.file].filter(Boolean)); res.status(400).json({ error: error.message }); }
});
router.delete('/news/:id', (req, res) => {
  const items = readJson('news.json');
  if (!items.some(item => item.id === req.params.id)) return res.status(404).json({ error: 'Event not found.' });
  writeJson('news.json', items.filter(item => item.id !== req.params.id)); res.status(204).end();
});

router.get('/settings', (req, res) => {
  const settings = readJson('site-settings.json', { heroSlides: [] });
  res.json({ heroSlides: settings.heroSlides.filter(slide => req.admin || slide.published === true) });
});
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
  if (!safeUrl(slide.mediaUrl) || slide.buttons.some(b => !safeUrl(b.href, true))) throw new Error('Use safe HTTP(S) media URLs and HTTP(S) or section button links.');
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
router.post('/settings/hero-slides/reorder', express.json(), (req, res) => {
  const settings = readJson('site-settings.json', { heroSlides: [] });
  const slides = settings.heroSlides || [], ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length !== slides.length || new Set(ids).size !== slides.length || ids.some(id => typeof id !== 'string' || !slides.some(slide => slide.id === id))) {
    return res.status(409).json({ error: 'The slide list changed. Reload the page before reordering.' });
  }
  settings.heroSlides = ids.map((id, index) => ({ ...slides.find(slide => slide.id === id), priority: index + 1 }));
  writeJson('site-settings.json', settings);
  res.json(settings.heroSlides);
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
  const body=req.body||{}, branch=list('branches').find(item=>item.published===true&&(item.id===body.branch||item.name===body.branch));
  const fields=Object.fromEntries(['name','email','phone','model','message','firstName','lastName','testDrive'].map(key=>[key,String(body[key]||'').trim()]));
  if(!fields.name || !fields.phone || !fields.model || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || Object.values(fields).some(value=>value.length>5000))return res.status(400).json({error:'Enter your name, phone number, valid email and model of interest.'});
  if(!branch)return res.status(400).json({error:'Choose an available preferred branch. Reload the branch options and try again.'});
  const agreed=value=>value===true||value==='true'||value==='on';
  if(body.formVersion==='wordpress-copy-1'&&(!agreed(body.consentPrivacy)||!agreed(body.consentMarketing)))return res.status(400).json({error:'Review and accept both disclaimer statements before submitting.'});
  const records = readJson('submissions/enquiries.json');
  const record = { ...fields,id:randomUUID(),createdAt:new Date().toISOString(),branch:branch.id,branchId:branch.id,branchName:branch.name };
  if(body.formVersion==='wordpress-copy-1')Object.assign(record,{consentPrivacy:agreed(body.consentPrivacy),consentMarketing:agreed(body.consentMarketing),formVersion:'wordpress-copy-1'});
  records.push(record); writeJson('submissions/enquiries.json', records); res.status(201).json({ ok: true });
});

router.post('/careers', upload.single('resume'), (req, res) => {
  const branch = list('branches').find(b => b.id === req.body.branchId && b.published === true);
  const fail = message => { cleanup([req.file].filter(Boolean)); return res.status(400).json({ error: message }); };
  if (!branch) return fail('Choose an available preferred branch. Refresh the branch list and try again.');
  if (!req.file || !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(req.file.mimetype)) return fail('Please attach a PDF, DOC or DOCX résumé.');
  const fields = Object.fromEntries(['name', 'email', 'position', 'message', 'phone', 'firstName', 'lastName'].map(key => [key, String(req.body[key] || '').trim()]));
  if (!fields.name || !fields.position || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || Object.values(fields).some(v => v.length > 5000)) return fail('Enter your name, a valid email, and position of interest.');
  const agreed=value=>value===true||value==='true'||value==='on';
  if(req.body.formVersion==='wordpress-copy-1'){if(!fields.phone||!agreed(req.body.consentPrivacy)||!agreed(req.body.consentMarketing))return fail('Enter your phone number and accept both disclaimer statements.');Object.assign(fields,{consentPrivacy:true,consentMarketing:true,formVersion:'wordpress-copy-1'})}
  const records = readJson('submissions/careers.json');
  records.push({ ...fields, id: randomUUID(), createdAt: new Date().toISOString(), branchId: branch.id, branchName: branch.name, resume: `/uploads/${req.file.filename}` });
  writeJson('submissions/careers.json', records); res.status(201).json({ ok: true });
});

router.use((error, _, res, __) => res.status(400).json({ error: error.message }));
module.exports = router;
