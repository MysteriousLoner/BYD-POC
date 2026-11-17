// Explicit, fingerprint-checked replacement. Never runs during app startup.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const fingerprint = models => createHash('sha256').update(JSON.stringify(models)).digest('hex');

function validate(models) {
  const { vehicle } = require('./vehicle-content');
  if (!Array.isArray(models) || models.length !== 7) throw new Error('The official catalogue must contain exactly seven models.');
  const ids = new Set();
  for (const model of models) {
    if (!model.id || ids.has(model.id) || model.catalogueSource !== 'sime-motors-20261117' || model.published !== true) throw new Error('Invalid or duplicate official catalogue model.');
    ids.add(model.id);
    vehicle(model, model);
    if (!model.images.length || !model.colours.length || !model.specifications.length) throw new Error('Every model needs photographs, colours and specifications.');
    for (const url of new Set([...model.images, ...model.colours.flatMap(c => c.images)])) {
      if (!/^\/assets\/sime-motors\/[a-f0-9]{16}\.webp$/.test(url) || !fs.existsSync(path.join(__dirname, '..', url))) throw new Error('An official catalogue image is missing.');
    }
  }
  return models;
}

function plan(store, models) {
  const current = store.list('vehicles');
  const promotions = store.list('promotions');
  const ids = new Set(models.map(model => model.id));
  const retiredPromotions = promotions.filter(offer => !ids.has(offer.model));
  return { currentFingerprint: fingerprint({ models: current, promotions }), currentModels: current.length, replacementModels: models.length, retiredModelIds: current.filter(model => !ids.has(model.id)).map(model => model.id), archivedPromotions: retiredPromotions.length, names: models.map(model => model.name) };
}

function replace(store, models, expectedFingerprint) {
  if (!/^[a-f0-9]{64}$/.test(expectedFingerprint || '')) throw new Error('Pass the fingerprint returned by the catalogue plan.');
  return store.transaction(() => {
    const before = plan(store, models);
    if (before.currentFingerprint !== expectedFingerprint) throw new Error('The catalogue changed since review. Generate a fresh plan before applying.');
    const ids = new Set(models.map(model => model.id));
    const retiredModels = store.list('vehicles').filter(model => !ids.has(model.id));
    const retiredPromotions = store.list('promotions').filter(offer => !ids.has(offer.model));
    if (retiredModels.length) {
      store.writeJson('catalogue-archives/sime-motors-20261117-' + before.currentFingerprint + '.json', { archivedAt: new Date().toISOString(), models: retiredModels, promotions: retiredPromotions });
      retiredPromotions.forEach(offer => store.remove('promotions', offer.id));
    }
    // Upsert retained IDs before removing obsolete models to preserve current offer links.
    models.forEach(model => store.save('vehicles', model));
    for (const model of store.list('vehicles')) if (!ids.has(model.id)) store.remove('vehicles', model.id);
    if (store.db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Catalogue relationships failed validation.');
    return { ...before, applied: true };
  });
}

if (require.main === module) {
  let store;
  try {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    if (args.some(arg => !['--apply', '--expected'].includes(arg) && !/^[a-f0-9]{64}$/.test(arg))) throw new Error('Use --apply --expected <fingerprint>, or no arguments to preview.');
    const models = validate(JSON.parse(fs.readFileSync(path.join(__dirname, 'data/models.json'), 'utf8')));
    store = require('./database');
    const preview = plan(store, models);
    if (!apply) console.log(JSON.stringify({ ...preview, applied: false }));
    else {
      const expected = args[args.indexOf('--expected') + 1];
      if (preview.currentFingerprint !== expected) throw new Error('The catalogue changed since review. Generate a fresh plan before applying.');
      const backupDirectory = path.join(path.dirname(store.dbPath), 'backups');
      fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
      const backupPath = path.join(backupDirectory, 'catalogue-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
      store.db.prepare('VACUUM INTO ?').run(backupPath);
      fs.chmodSync(backupPath, 0o600);
      console.log(JSON.stringify({ ...replace(store, models, expected), backupPath }));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally { store?.db.close(); }
}

module.exports = { fingerprint, validate, plan, replace };
