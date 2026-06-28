-- ═══════════════════════════════════════════════════════
-- Shylv Manager Bot — Database Schema (SQLite)
-- This schema is auto-executed on bot startup via sqlite.ts
-- ═══════════════════════════════════════════════════════

-- ─── Staff Table ───
-- Stores registered staff members and their current balance
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
-- Records of completed chapters per staff member
-- Note: chapters stored as JSON array string (e.g., "[1,2,3]")
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
-- Full history of balance changes (additions from chapters + deductions)
CREATE TABLE IF NOT EXISTS balance_logs (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  amount REAL NOT NULL,          -- positive = addition, negative = deduction
  type TEXT CHECK (type IN ('chapter', 'deduct', 'bonus')) NOT NULL,
  reason TEXT,                   -- required for deductions/bonus, optional for chapters
  reference_id TEXT,             -- links to chapter_logs.id when type='chapter'
  logged_by TEXT NOT NULL REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_staff_discord_id ON staff(discord_id);
CREATE INDEX IF NOT EXISTS idx_chapter_logs_staff_id ON chapter_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_chapter_logs_created_at ON chapter_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_logs_staff_id ON balance_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_balance_logs_created_at ON balance_logs(created_at DESC);

-- ─── Auto-update timestamp trigger ───
CREATE TRIGGER IF NOT EXISTS staff_updated_at
  AFTER UPDATE ON staff
  FOR EACH ROW
BEGIN
  UPDATE staff SET updated_at = datetime('now') WHERE id = OLD.id;
END;
