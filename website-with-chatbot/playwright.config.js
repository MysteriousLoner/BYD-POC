const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync(macChrome) ? macChrome : undefined);
module.exports = defineConfig({
  testDir:'./test/browser', workers:1, fullyParallel:false, timeout:30000,
  reporter:'list', use:{ baseURL:'http://127.0.0.1:4187', headless:true, launchOptions:{executablePath} },
  webServer:{command:'node test/preview-server.js',url:'http://127.0.0.1:4187/api/health',reuseExistingServer:false,env:{BYD_PREVIEW_PORT:'4187'},timeout:20000},
});
