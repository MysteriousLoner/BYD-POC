// Run via the host's backup job. Produces a consistent SQLite snapshot, including WAL data.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const source = process.env.DB_PATH || '/app/runtime/byd.sqlite';
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) throw new Error('Pass an absolute backup destination');
fs.mkdirSync(path.dirname(destination), { recursive: true });
const db = new DatabaseSync(source);
db.prepare('VACUUM INTO ?').run(destination);
db.close();
console.log('Database snapshot complete');
