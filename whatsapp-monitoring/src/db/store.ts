import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function initDB(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Salesmen who have bound their WhatsApp accounts
    CREATE TABLE IF NOT EXISTS salesmen (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT    UNIQUE,           -- salesman's own phone number
      instance_id TEXT    UNIQUE NOT NULL,   -- unique ID for this WhatsApp instance
      connected   INTEGER NOT NULL DEFAULT 0, -- 0=disconnected, 1=connected
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    -- Contacts that salesmen communicate with (customers)
    CREATE TABLE IF NOT EXISTS contacts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      phone       TEXT    NOT NULL,          -- E.164 format
      name        TEXT,                      -- optional display name from WhatsApp
      is_customer INTEGER NOT NULL DEFAULT 1,-- 1=customer, 0=other
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

    -- All messages sent and received (core KPI data)
    CREATE TABLE IF NOT EXISTS messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      salesman_id  INTEGER NOT NULL REFERENCES salesmen(id),
      contact_id   INTEGER NOT NULL REFERENCES contacts(id),
      direction    TEXT    NOT NULL CHECK(direction IN ('sent', 'received')),
      message_type TEXT    NOT NULL DEFAULT 'text', -- text, image, video, document, etc.
      content      TEXT,                            -- message text (nullable for media)
      has_media    INTEGER NOT NULL DEFAULT 0,      -- 1 if message contains media
      wa_message_id TEXT,                           -- WhatsApp's internal message ID
      timestamp    INTEGER NOT NULL,                -- Unix timestamp ms
      created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_salesman ON messages(salesman_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
    CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(timestamp);

    -- Daily aggregated KPIs for fast dashboard queries
    CREATE TABLE IF NOT EXISTS daily_kpis (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      salesman_id INTEGER NOT NULL REFERENCES salesmen(id),
      date        TEXT    NOT NULL,           -- YYYY-MM-DD
      sent_count  INTEGER NOT NULL DEFAULT 0,
      recv_count  INTEGER NOT NULL DEFAULT 0,
      unique_contacts INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      UNIQUE(salesman_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_kpis_salesman ON daily_kpis(salesman_id);
    CREATE INDEX IF NOT EXISTS idx_daily_kpis_date ON daily_kpis(date);
  `);

  console.log('[db] Database initialized successfully');
}

// ─── Salesmen ───────────────────────────────────────────────────────────

export function createSalesman(name: string, phone: string | null, instanceId: string): number {
  const stmt = db.prepare(`
    INSERT INTO salesmen (name, phone, instance_id, connected)
    VALUES (?, ?, ?, 0)
  `);
  const result = stmt.run(name, phone, instanceId);
  return Number(result.lastInsertRowid);
}

export function getSalesmanByInstanceId(instanceId: string): any | undefined {
  return db.prepare('SELECT * FROM salesmen WHERE instance_id = ?').get(instanceId);
}

export function getAllSalesmen(): any[] {
  return db.prepare('SELECT * FROM salesmen ORDER BY name').all();
}

export function updateSalesmanConnection(instanceId: string, connected: boolean): void {
  db.prepare(`
    UPDATE salesmen SET connected = ?, updated_at = strftime('%s','now') * 1000
    WHERE instance_id = ?
  `).run(connected ? 1 : 0, instanceId);
}

export function deleteSalesman(instanceId: string): void {
  db.prepare('DELETE FROM salesmen WHERE instance_id = ?').run(instanceId);
}

// ─── Contacts ───────────────────────────────────────────────────────────

export function getOrCreateContact(phone: string, name?: string): number {
  const existing = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(phone) as any;
  if (existing) {
    if (name) {
      db.prepare('UPDATE contacts SET name = ? WHERE id = ?').run(name, existing.id);
    }
    return existing.id;
  }
  const result = db.prepare('INSERT INTO contacts (phone, name) VALUES (?, ?)').run(phone, name || null);
  return Number(result.lastInsertRowid);
}

export function getContact(phone: string): any | undefined {
  return db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phone);
}

// ─── Messages ───────────────────────────────────────────────────────────

export interface InsertMessage {
  salesmanId: number;
  contactId: number;
  direction: 'sent' | 'received';
  messageType: string;
  content: string | null;
  hasMedia: boolean;
  waMessageId: string | null;
  timestamp: number;
}

export function insertMessage(msg: InsertMessage): number {
  const stmt = db.prepare(`
    INSERT INTO messages (salesman_id, contact_id, direction, message_type, content, has_media, wa_message_id, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    msg.salesmanId, msg.contactId, msg.direction, msg.messageType,
    msg.content, msg.hasMedia ? 1 : 0, msg.waMessageId, msg.timestamp
  );
  return Number(result.lastInsertRowid);
}

// ─── KPIs ───────────────────────────────────────────────────────────────

export function upsertDailyKPI(salesmanId: number, date: string): void {
  const existing = db.prepare(
    'SELECT id FROM daily_kpis WHERE salesman_id = ? AND date = ?'
  ).get(salesmanId, date);

  if (existing) {
    const { id } = existing as { id: number };
    db.prepare(`
      UPDATE daily_kpis SET
        sent_count = (SELECT COUNT(*) FROM messages WHERE salesman_id = ? AND direction = 'sent' AND date(timestamp/1000, 'unixepoch') = ?),
        recv_count = (SELECT COUNT(*) FROM messages WHERE salesman_id = ? AND direction = 'received' AND date(timestamp/1000, 'unixepoch') = ?),
        unique_contacts = (SELECT COUNT(DISTINCT contact_id) FROM messages WHERE salesman_id = ? AND date(timestamp/1000, 'unixepoch') = ?)
      WHERE id = ?
    `).run(salesmanId, date, salesmanId, date, salesmanId, date, id);
  } else {
    db.prepare(`
      INSERT INTO daily_kpis (salesman_id, date, sent_count, recv_count, unique_contacts)
      VALUES (?, ?,
        (SELECT COUNT(*) FROM messages WHERE salesman_id = ? AND direction = 'sent' AND date(timestamp/1000, 'unixepoch') = ?),
        (SELECT COUNT(*) FROM messages WHERE salesman_id = ? AND direction = 'received' AND date(timestamp/1000, 'unixepoch') = ?),
        (SELECT COUNT(DISTINCT contact_id) FROM messages WHERE salesman_id = ? AND date(timestamp/1000, 'unixepoch') = ?)
      )
    `).run(salesmanId, date, salesmanId, date, salesmanId, date, salesmanId, date);
  }
}

// ─── Dashboard Queries ──────────────────────────────────────────────────

export function getDashboardStats(): any {
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
  const totalSent = db.prepare("SELECT COUNT(*) as count FROM messages WHERE direction = 'sent'").get() as any;
  const totalReceived = db.prepare("SELECT COUNT(*) as count FROM messages WHERE direction = 'received'").get() as any;
  const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE is_customer = 1').get() as any;
  const totalSalesmen = db.prepare('SELECT COUNT(*) as count FROM salesmen').get() as any;
  const connectedSalesmen = db.prepare('SELECT COUNT(*) as count FROM salesmen WHERE connected = 1').get() as any;

  return {
    totalMessages: totalMessages.count,
    totalSent: totalSent.count,
    totalReceived: totalReceived.count,
    totalContacts: totalContacts.count,
    totalSalesmen: totalSalesmen.count,
    connectedSalesmen: connectedSalesmen.count,
  };
}

export function getSalesmanKPIs(salesmanId: number, days: number = 30): any[] {
  const dateFilter = days > 0
    ? `AND date >= date('now', '-${days} days')`
    : '';

  return db.prepare(`
    SELECT date, sent_count, recv_count, unique_contacts,
           (sent_count + recv_count) as total_messages
    FROM daily_kpis
    WHERE salesman_id = ? ${dateFilter}
    ORDER BY date DESC
    LIMIT 365
  `).all(salesmanId);
}

export function getSalesmanContactStats(salesmanId: number): any[] {
  return db.prepare(`
    SELECT c.id, c.phone, c.name,
           SUM(CASE WHEN m.direction = 'sent' THEN 1 ELSE 0 END) as sent_count,
           SUM(CASE WHEN m.direction = 'received' THEN 1 ELSE 0 END) as received_count,
           COUNT(*) as total_messages,
           MAX(m.timestamp) as last_contact
    FROM messages m
    JOIN contacts c ON m.contact_id = c.id
    WHERE m.salesman_id = ?
    GROUP BY c.id
    ORDER BY total_messages DESC
  `).all(salesmanId);
}

export function getRecentMessages(salesmanId: number | null, limit: number = 50): any[] {
  if (salesmanId) {
    return db.prepare(`
      SELECT m.*, s.name as salesman_name, c.phone as contact_phone, c.name as contact_name
      FROM messages m
      JOIN salesmen s ON m.salesman_id = s.id
      JOIN contacts c ON m.contact_id = c.id
      WHERE m.salesman_id = ?
      ORDER BY m.timestamp DESC
      LIMIT ?
    `).all(salesmanId, limit);
  }
  return db.prepare(`
    SELECT m.*, s.name as salesman_name, c.phone as contact_phone, c.name as contact_name
    FROM messages m
    JOIN salesmen s ON m.salesman_id = s.id
    JOIN contacts c ON m.contact_id = c.id
    ORDER BY m.timestamp DESC
    LIMIT ?
  `).all(limit);
}

export function getTodayStats(): any {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT s.id, s.name, s.phone, s.connected,
           COALESCE(k.sent_count, 0) as sent_today,
           COALESCE(k.recv_count, 0) as received_today,
           COALESCE(k.unique_contacts, 0) as contacts_today
    FROM salesmen s
    LEFT JOIN daily_kpis k ON s.id = k.salesman_id AND k.date = ?
    ORDER BY s.name
  `).all(today);
}

export function closeDB(): void {
  if (db) {
    db.close();
    console.log('[db] Database connection closed');
  }
}
