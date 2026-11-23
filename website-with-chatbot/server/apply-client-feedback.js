const { createHash } = require('node:crypto');
const details = require('./data/branch-details.json');
const MARKER = 'client-feedback-20261123.json';
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function plan(store) {
  const slides = store.list('hero_slides'), news = store.readJson('news.json'), branches = store.list('branches');
  const completed = store.readJson(MARKER, null);
  if (!completed) {
    const story = news.find(item => item.id === '2');
    if (story && (story.title !== 'BYD Seal Performance Showcase' || story.date !== '2026-09-12')) throw new Error('Legacy story 2 does not match the reviewed title and date. Review it before applying this update.');
  }
  return {
    currentFingerprint: fingerprint({ slides, news, branches, completed }),
    alreadyApplied: !!completed,
    slidesToUnpublish: completed ? [] : slides.filter(slide => slide.published !== false).map(slide => slide.id),
    storyToUnpublish: !completed && news.some(item => item.id === '2' && item.published !== false) ? '2' : null,
    branchesToBackfill: completed ? [] : branches.filter(branch => Object.keys(details[branch.id] || {}).some(key => !branch[key])).map(branch => branch.id)
  };
}
function apply(store, expected) {
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Provide the fingerprint from the content preview.');
  return store.transaction(() => {
    const reviewed = plan(store);
    if (reviewed.currentFingerprint !== expected) throw new Error('Content changed since preview. Run the preview again.');
    if (reviewed.alreadyApplied) return { ...reviewed, applied: false };
    for (const slide of store.list('hero_slides')) store.save('hero_slides', { ...slide, published: false });
    const news = store.readJson('news.json');
    if (reviewed.storyToUnpublish) store.writeJson('news.json', news.map(item => item.id === '2' ? { ...item, published: false } : item));
    for (const branch of store.list('branches')) {
      const updated = { ...branch };
      for (const [key,value] of Object.entries(details[branch.id] || {})) if (!updated[key]) updated[key] = value;
      if (JSON.stringify(updated) !== JSON.stringify(branch)) store.save('branches', updated);
    }
    store.writeJson(MARKER, { appliedAt: new Date().toISOString(), slides: reviewed.slidesToUnpublish, story: reviewed.storyToUnpublish });
    return { ...reviewed, applied: true };
  });
}
if (require.main === module) {
  let store;
  try {
    if (!process.env.DB_PATH) throw new Error('Set DB_PATH explicitly to the database being reviewed.');
    const fs = require('node:fs'), path = require('node:path');
    const args = process.argv.slice(2);
    const applying = args.length === 3 && args[0] === '--apply' && args[1] === '--expected' && /^[a-f0-9]{64}$/.test(args[2]);
    if (args.length && !applying) throw new Error('Use no arguments to preview, or --apply --expected <fingerprint>.');
    if (!fs.existsSync(process.env.DB_PATH)) throw new Error('The target database must already exist.');
    store = require('./database');
    const preview = plan(store);
    if (!applying) console.log(JSON.stringify({ ...preview, applied: false }));
    else {
      if (preview.currentFingerprint !== args[2]) throw new Error('Content changed since preview. Run the preview again.');
      if (preview.alreadyApplied) console.log(JSON.stringify(apply(store, args[2])));
      else {
        const directory = path.join(path.dirname(store.dbPath), 'backups');
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        const backupPath = path.join(directory, 'client-feedback-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
        store.db.prepare('VACUUM INTO ?').run(backupPath); fs.chmodSync(backupPath, 0o600);
        console.log(JSON.stringify({ ...apply(store, args[2]), backupPath }));
      }
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { store?.db.close(); }
}
module.exports = { MARKER, plan, apply };
