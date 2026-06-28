// ─── SQLite Client ─── Shylv Manager Bot ───

import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

let db: Database | null = null;

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'shylv.db');

/**
 * Initialize the SQLite database.
 * Creates the data directory and database file if they don't exist.
 * Runs schema creation (CREATE IF NOT EXISTS) on every boot.
 */
export function initDatabase(): void {
  if (db) return;

  // Ensure data directory exists
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
    console.log(`📁 Created database directory: ${DB_DIR}`);
  }

  db = new Database(DB_PATH, { create: true });

  // Enable WAL mode for better concurrent read performance
  db.exec('PRAGMA journal_mode = WAL');
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  console.log(`📦 SQLite database opened: ${DB_PATH}`);

  // Run schema creation
  createSchema();
}

/** Get the singleton database instance */
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/** Close the database connection gracefully */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('📦 SQLite database closed.');
  }
}

/** Create tables if they don't exist */
function createSchema(): void {
  if (!db) return;

  db.exec(`
    -- ─── Staff Table ───
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT NOT NULL,
      role TEXT CHECK (role IN ('admin', 'staff')) NOT NULL DEFAULT 'staff',
      balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── Chapter Logs Table ───
    CREATE TABLE IF NOT EXISTS chapter_logs (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      chapters TEXT NOT NULL,
      point REAL NOT NULL DEFAULT 0,
      bonus REAL NOT NULL DEFAULT 0,
      total_added REAL NOT NULL DEFAULT 0,
      note TEXT,
      logged_by TEXT NOT NULL REFERENCES staff(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── Balance Logs Table ───
    CREATE TABLE IF NOT EXISTS balance_logs (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      type TEXT CHECK (type IN ('chapter', 'deduct', 'bonus')) NOT NULL,
      reason TEXT,
      reference_id TEXT,
      logged_by TEXT NOT NULL REFERENCES staff(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── Indexes ───
    CREATE INDEX IF NOT EXISTS idx_staff_discord_id ON staff(discord_id);
    CREATE INDEX IF NOT EXISTS idx_chapter_logs_staff_id ON chapter_logs(staff_id);
    CREATE INDEX IF NOT EXISTS idx_chapter_logs_created_at ON chapter_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_balance_logs_staff_id ON balance_logs(staff_id);
    CREATE INDEX IF NOT EXISTS idx_balance_logs_created_at ON balance_logs(created_at DESC);

    -- ─── Auto-update trigger ───
    CREATE TRIGGER IF NOT EXISTS staff_updated_at
      AFTER UPDATE ON staff
      FOR EACH ROW
    BEGIN
      UPDATE staff SET updated_at = datetime('now') WHERE id = OLD.id;
    END;
  `);

  console.log('✅ Database schema initialized.');
}
