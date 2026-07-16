import path from 'path';
import fs from 'fs';
import pino from 'pino';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { config } from '../config.js';
import {
  getSalesmanByInstanceId,
  createSalesman,
  updateSalesmanConnection,
  deleteSalesman,
  getOrCreateContact,
  insertMessage,
  upsertDailyKPI,
} from '../db/store.js';

const logger = pino({ level: config.logLevel });

// ─── Types ──────────────────────────────────────────────────────────────

export interface SalesmanInstance {
  instanceId: string;
  name: string;
  phone: string | null;
  sock: WASocket | null;
  latestQr: string | null;
  connected: boolean;
  dbId: number;
}

// ─── Instance Store ─────────────────────────────────────────────────────

const instances = new Map<string, SalesmanInstance>();

// Exported QR code store so the HTTP server can serve QR pages
export const qrCodes = new Map<string, { qr: string; instanceId: string; name: string }>();

// ─── JID Helper ─────────────────────────────────────────────────────────

function phoneToJid(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

function jidToPhone(jid: string): string {
  return '+' + jid.replace(/@s\.whatsapp\.net$/, '');
}

// ─── Get WhatsApp Web Version ───────────────────────────────────────────

async function getWhatsAppVersion(): Promise<{ version: [number, number, number]; isLatest: boolean }> {
  try {
    const response = await fetch('https://web.whatsapp.com/sw.js');
    const text = await response.text();
    const match = text.match(/client_revision=(\d+)/);
    if (match) {
      const revision = parseInt(match[1], 10);
      logger.info(`[wa:version] Scraped WhatsApp Web version: ${revision}`);
      return { version: [revision, 0, 0] as [number, number, number], isLatest: true };
    }
  } catch (err) {
    logger.warn('[wa:version] Failed to scrape WhatsApp Web version, falling back');
  }

  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`[wa:version] Using Baileys version: ${version.join('.')}`);
  return { version, isLatest };
}

// ─── Message Handler ────────────────────────────────────────────────────

function handleMessageUpsert(salesman: SalesmanInstance, messages: any[]): void {
  for (const msg of messages) {
    // Only process notifications (not own messages echoed back)
    if (msg.key.fromMe) {
      // This is a message SENT by the salesman
      const remoteJid = msg.key.remoteJid || '';
      // Skip status broadcasts and group messages
      if (remoteJid.includes('@broadcast') || remoteJid.includes('@g.us')) continue;

      const contactPhone = jidToPhone(remoteJid);
      const contactId = getOrCreateContact(contactPhone);
      const content = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || msg.message?.videoMessage?.caption
        || '';

      const messageType = Object.keys(msg.message || {})[0] || 'text';
      const hasMedia = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage'].includes(messageType);

      insertMessage({
        salesmanId: salesman.dbId,
        contactId,
        direction: 'sent',
        messageType,
        content: content || null,
        hasMedia,
        waMessageId: msg.key.id || null,
        timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
      });

      // Update daily KPI
      const date = new Date().toISOString().split('T')[0];
      upsertDailyKPI(salesman.dbId, date);

      logger.debug(`[wa:${salesman.name}] SENT → ${contactPhone}: ${content?.substring(0, 50)}...`);
    } else if (msg.key.remoteJid) {
      // This is a message RECEIVED by the salesman
      const remoteJid = msg.key.remoteJid;
      if (remoteJid.includes('@broadcast') || remoteJid.includes('@g.us')) continue;

      const contactPhone = jidToPhone(remoteJid);
      // Try to get contact name from pushName if available
      const contactName = msg.pushName || undefined;
      const contactId = getOrCreateContact(contactPhone, contactName);

      const content = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || msg.message?.videoMessage?.caption
        || '';

      const messageType = Object.keys(msg.message || {})[0] || 'text';
      const hasMedia = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage'].includes(messageType);

      insertMessage({
        salesmanId: salesman.dbId,
        contactId,
        direction: 'received',
        messageType,
        content: content || null,
        hasMedia,
        waMessageId: msg.key.id || null,
        timestamp: msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
      });

      const date = new Date().toISOString().split('T')[0];
      upsertDailyKPI(salesman.dbId, date);

      logger.debug(`[wa:${salesman.name}] RECEIVED ← ${contactPhone}: ${content?.substring(0, 50)}...`);
    }
  }
}

// ─── Initialize WhatsApp for a Salesman ─────────────────────────────────

export async function initializeWhatsApp(
  instanceId: string,
  name: string,
  phone: string | null
): Promise<SalesmanInstance> {
  const sessionDir = path.join(config.waSessionsDir, instanceId);

  // Ensure session directory exists
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Load auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  // Get WhatsApp version
  const { version } = await getWhatsAppVersion();

  // Check if salesman exists in DB, create if not
  let salesman = getSalesmanByInstanceId(instanceId);
  if (!salesman) {
    const dbId = createSalesman(name, phone, instanceId);
    salesman = { id: dbId, name, phone, instance_id: instanceId, connected: 0 };
  }

  const salesmanInstance: SalesmanInstance = {
    instanceId,
    name,
    phone,
    sock: null,
    latestQr: null,
    connected: false,
    dbId: salesman.id,
  };

  return new Promise((resolve) => {
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger as any),
      },
      printQRInTerminal: false,
      browser: ['Chrome (macOS)', 'Chrome', '14.4.1'],
      connectTimeoutMs: 30_000,
      keepAliveIntervalMs: 30_000,
      qrTimeout: 120_000, // 2 minutes for QR scan
      markOnlineOnConnect: false,
      logger: logger as any,
    });

    salesmanInstance.sock = sock as unknown as WASocket;
    instances.set(instanceId, salesmanInstance);

    // ── Event: Credentials Update ─────────────────────────────────────
    sock.ev.on('creds.update', saveCreds);

    // ── Event: Connection Update ──────────────────────────────────────
    sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      // QR code received
      if (qr) {
        salesmanInstance.latestQr = qr;
        qrCodes.set(instanceId, { qr, instanceId, name });
        logger.info(`[wa:${name}] QR code ready — scan to bind`);
      }

      // Connection established
      if (connection === 'open') {
        salesmanInstance.connected = true;
        salesmanInstance.latestQr = null;
        qrCodes.delete(instanceId);
        updateSalesmanConnection(instanceId, true);
        logger.info(`[wa:${name}] ✅ Connected to WhatsApp`);

        // Save salesman's own phone number
        if (sock.user?.id) {
          const ownPhone = jidToPhone(sock.user.id);
          logger.info(`[wa:${name}] Logged in as ${ownPhone}`);
        }
      }

      // Connection closed
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        salesmanInstance.connected = false;
        updateSalesmanConnection(instanceId, false);
        qrCodes.delete(instanceId);

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== 401;

        if (statusCode === DisconnectReason.loggedOut) {
          logger.error(`[wa:${name}] ❌ Logged out — delete session folder and re-register`);
        } else if (statusCode === 515) {
          // Post-pairing restart — expected, reconnect after delay
          logger.info(`[wa:${name}] Post-pairing restart (515), reconnecting in 3s...`);
          setTimeout(() => {
            initializeWhatsApp(instanceId, name, phone).catch((err) =>
              logger.error(`[wa:${name}] Reconnect failed: ${err}`)
            );
          }, 3000);
          return;
        } else if (shouldReconnect) {
          logger.warn(`[wa:${name}] Connection closed (${statusCode}), reconnecting in 5s...`);
          setTimeout(() => {
            initializeWhatsApp(instanceId, name, phone).catch((err) =>
              logger.error(`[wa:${name}] Reconnect failed: ${err}`)
            );
          }, 5000);
        } else {
          logger.error(`[wa:${name}] Connection closed (${statusCode}), won't reconnect`);
        }
      }

      if (connection === 'open') {
        resolve(salesmanInstance);
      }
    });

    // ── Event: Messages Upsert ────────────────────────────────────────
    sock.ev.on('messages.upsert', (messages: any) => {
      // Only process new messages (not updates to existing ones)
      const newMessages = messages.messages.filter((m: any) => {
        // Check if this is a notification message (not an update)
        return !messages.type || messages.type === 'notify';
      });

      if (newMessages.length > 0) {
        handleMessageUpsert(salesmanInstance, newMessages);
      }
    });
  });
}

// ─── Public API ─────────────────────────────────────────────────────────

export function getInstance(instanceId: string): SalesmanInstance | undefined {
  return instances.get(instanceId);
}

export function getAllInstances(): SalesmanInstance[] {
  return Array.from(instances.values());
}

export function getQRCode(instanceId: string): { qr: string; instanceId: string; name: string } | undefined {
  return qrCodes.get(instanceId);
}

export function getAllQRCodes(): { qr: string; instanceId: string; name: string }[] {
  return Array.from(qrCodes.values());
}

export async function sendMessage(
  instanceId: string,
  toPhone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const instance = instances.get(instanceId);
  if (!instance || !instance.sock || !instance.connected) {
    return { success: false, error: 'WhatsApp not connected' };
  }

  try {
    const jid = phoneToJid(toPhone);
    await instance.sock.sendMessage(jid, { text });
    logger.info(`[wa:${instance.name}] Message sent to ${toPhone}`);
    return { success: true };
  } catch (err: any) {
    logger.error(`[wa:${instance.name}] Failed to send to ${toPhone}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export async function disconnectInstance(instanceId: string): Promise<void> {
  const instance = instances.get(instanceId);
  if (instance?.sock) {
    try {
      instance.sock.end(undefined);
    } catch (err) {
      logger.warn(`[wa:${instanceId}] Error disconnecting: ${err}`);
    }
  }
  instances.delete(instanceId);
  qrCodes.delete(instanceId);
  updateSalesmanConnection(instanceId, false);
}

export async function logoutInstance(instanceId: string): Promise<void> {
  const instance = instances.get(instanceId);
  if (instance?.sock) {
    try {
      await instance.sock.logout();
    } catch (err) {
      logger.warn(`[wa:${instanceId}] Error logging out: ${err}`);
    }
  }
  instances.delete(instanceId);
  qrCodes.delete(instanceId);
  deleteSalesman(instanceId);

  // Clean up session files
  const sessionDir = path.join(config.waSessionsDir, instanceId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

export function isConnected(instanceId: string): boolean {
  return instances.get(instanceId)?.connected ?? false;
}

export async function disconnectAll(): Promise<void> {
  for (const [id] of instances) {
    await disconnectInstance(id);
  }
}
