import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sales-kpi.db'),
  waSessionsDir: process.env.WA_SESSIONS_DIR || path.join(__dirname, '..', 'auth', 'wa-sessions'),
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

export function validateConfig(): void {
  // No critical env vars required — all have defaults
  console.log('[config] Configuration loaded:');
  console.log(`  PORT=${config.port}`);
  console.log(`  DB_PATH=${config.dbPath}`);
  console.log(`  WA_SESSIONS_DIR=${config.waSessionsDir}`);
  console.log(`  LOG_LEVEL=${config.logLevel}`);
}
