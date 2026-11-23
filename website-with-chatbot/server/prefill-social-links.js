const { createHash } = require('node:crypto');
const { SOCIAL_DOCUMENT, validateSocialLinks } = require('./public-dealership');
const verified = require('./data/social-links-verified-20261123.json');
const MARKER = 'social-links-prefill-20261123.json';
const desired = validateSocialLinks(verified.links);
function plan(store) {
  const current = store.readJson(SOCIAL_DOCUMENT, {}), completed = store.readJson(MARKER, null);
  return {
    currentFingerprint: createHash('sha256').update(JSON.stringify({ current, completed, desired })).digest('hex'),
    alreadyApplied: !!completed,
    fieldsToPrefill: completed ? [] : Object.keys(desired).filter(key => desired[key] && !current[key]),
    unresolvedFields: Object.keys(desired).filter(key => !desired[key] && !current[key])
  };
}
function apply(store, expected) {
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Provide the fingerprint from the social links preview.');
  return store.transaction(() => {
    const reviewed = plan(store);
    if (reviewed.currentFingerprint !== expected) throw new Error('Social links changed since preview. Run the preview again.');
    if (reviewed.alreadyApplied) return { ...reviewed, applied:false };
    const current = { ...store.readJson(SOCIAL_DOCUMENT, {}) };
    for (const key of reviewed.fieldsToPrefill) current[key] = desired[key];
    if (reviewed.fieldsToPrefill.length) store.writeJson(SOCIAL_DOCUMENT, current);
    store.writeJson(MARKER, { appliedAt:new Date().toISOString(), fields:reviewed.fieldsToPrefill, checkedOn:verified.checkedOn });
    return { ...reviewed, applied:true };
  });
}
if (require.main === module) {
  let store;
  try {
    const fs = require('node:fs'), path = require('node:path'), args = process.argv.slice(2);
    if (!process.env.DB_PATH || !fs.existsSync(process.env.DB_PATH)) throw new Error('Set DB_PATH explicitly to the existing target database.');
    const applying = args.length === 3 && args[0] === '--apply' && args[1] === '--expected' && /^[a-f0-9]{64}$/.test(args[2]);
    if (args.length && !applying) throw new Error('Use no arguments to preview, or --apply --expected <fingerprint>.');
    store = require('./database');
    const preview = plan(store);
    if (!applying) console.log(JSON.stringify({ ...preview, applied:false }));
    else {
      if (preview.currentFingerprint !== args[2]) throw new Error('Social links changed since preview. Run the preview again.');
      if (preview.alreadyApplied) console.log(JSON.stringify(apply(store, args[2])));
      else {
        const directory = path.join(path.dirname(store.dbPath), 'backups'); fs.mkdirSync(directory, { recursive:true, mode:0o700 });
        const backupPath = path.join(directory, 'social-links-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
        store.db.prepare('VACUUM INTO ?').run(backupPath); fs.chmodSync(backupPath, 0o600);
        console.log(JSON.stringify({ ...apply(store, args[2]), backupPath }));
      }
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { store?.db.close(); }
}
module.exports = { MARKER, plan, apply };
