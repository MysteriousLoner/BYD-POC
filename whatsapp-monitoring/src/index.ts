import http from 'http';
import { config, validateConfig } from './config.js';
import { initDB, closeDB, getAllSalesmen } from './db/store.js';
import { initializeWhatsApp, disconnectAll } from './whatsapp/baileys.js';
import { requestHandler } from './server.js';

// ─── Startup ────────────────────────────────────────────────────────────

async function startup(): Promise<void> {
  console.log('═'.repeat(50));
  console.log('  📊 Sales KPI Platform');
  console.log('  WhatsApp Activity Monitoring for Sales Teams');
  console.log('═'.repeat(50));

  // Validate configuration
  validateConfig();

  // Initialize database
  initDB(config.dbPath);

  // Start HTTP server
  const server = http.createServer(requestHandler);
  server.listen(config.port, () => {
    console.log(`\n[server] Dashboard running at http://localhost:${config.port}`);
    console.log(`[server] Health check at http://localhost:${config.port}/health`);
    console.log(`[server] API base at http://localhost:${config.port}/api`);
  });

  // Restore existing salesman connections
  const salesmen = getAllSalesmen();
  if (salesmen.length > 0) {
    console.log(`\n[server] Restoring ${salesmen.length} salesman connection(s)...`);
    for (const sm of salesmen) {
      initializeWhatsApp(sm.instance_id, sm.name, sm.phone).catch((err) => {
        console.error(`[server] Failed to restore ${sm.name}:`, err.message);
      });
    }
  } else {
    console.log('\n[server] No salesmen registered yet. Use the dashboard to add salesmen.');
  }

  // ─── Graceful Shutdown ────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[server] Received ${signal}, shutting down gracefully...`);
    await disconnectAll();
    closeDB();
    server.close(() => {
      console.log('[server] HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('[server] Forced exit after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ─── Run ────────────────────────────────────────────────────────────────

startup().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
