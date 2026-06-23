-- ═══════════════════════════════════════════════════════
-- Shylv Manager Bot — Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════

-- ─── Staff Table ───
-- Stores registered staff members and their current balance
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'staff')) NOT NULL DEFAULT 'staff',
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Chapter Logs Table ───
-- Records of completed chapters per staff member
CREATE TABLE IF NOT EXISTS chapter_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  chapters INTEGER[] NOT NULL,
  point NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_added NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  logged_by UUID REFERENCES staff(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Balance Logs Table ───
-- Full history of balance changes (additions from chapters + deductions)
CREATE TABLE IF NOT EXISTS balance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,          -- positive = addition, negative = deduction
  type TEXT CHECK (type IN ('chapter', 'deduct', 'bonus')) NOT NULL,
  reason TEXT,                             -- required for deductions/bonus, optional for chapters
  reference_id UUID,                       -- links to chapter_logs.id when type='chapter'
  logged_by UUID REFERENCES staff(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_staff_discord_id ON staff(discord_id);
CREATE INDEX IF NOT EXISTS idx_chapter_logs_staff_id ON chapter_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_chapter_logs_created_at ON chapter_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_logs_staff_id ON balance_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_balance_logs_created_at ON balance_logs(created_at DESC);

-- ─── Auto-update timestamp trigger ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Disable RLS for simplicity (bot uses anon key) ───
-- WARNING: This means anyone with the anon key can access data.
-- For a private bot this is acceptable. For production, use service_role key.
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (since bot is the only client)
DROP POLICY IF EXISTS "Allow all for anon" ON staff;
CREATE POLICY "Allow all for anon" ON staff FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON chapter_logs;
CREATE POLICY "Allow all for anon" ON chapter_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON balance_logs;
CREATE POLICY "Allow all for anon" ON balance_logs FOR ALL USING (true) WITH CHECK (true);
