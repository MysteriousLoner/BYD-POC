// Isolated preview only. Never reads the workspace .env or production database.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'byd-browser-'));
const port = Number(process.env.BYD_PREVIEW_PORT || 4173);
Object.assign(process.env,{DB_PATH:path.join(dir,'preview.sqlite'),UPLOAD_DIR:path.join(dir,'uploads'),ADMIN_USERNAME:'browser-editor',ADMIN_PASSWORD:'browser-test-password-123',PUBLIC_ORIGIN:'http://127.0.0.1:'+port});
const { createApp } = require('../server/index');
const server = createApp().listen(port,'127.0.0.1',() => console.log('Isolated BYD preview: http://127.0.0.1:'+port));
function close(){server.close(() => {require('../server/database').db.close();fs.rmSync(dir,{recursive:true,force:true});process.exit(0);});}
process.on('SIGTERM',close);process.on('SIGINT',close);
