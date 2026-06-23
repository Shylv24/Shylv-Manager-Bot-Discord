-- Run this command manually in Supabase SQL Editor to update an existing database:
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
