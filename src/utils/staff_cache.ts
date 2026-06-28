// ─── Staff Cache Service ─── Shylv Manager Bot ───
//
// Manages in-memory caching of staff members to avoid hitting
// the database on every command interaction.
//

import { getDb } from '../database/sqlite.js';
import { env } from '../config/env.js';
import type { StaffConfig } from '../types/index.js';

// In-memory cache
const staffCache = new Map<string, StaffConfig>();

export const MASTER_ADMIN_ID = env.MASTER_ADMIN_ID;

/**
 * Load active staff from SQLite into memory on boot.
 * Call this once during bot startup.
 */
export async function loadStaffCache(): Promise<void> {
  console.log('📋 Loading staff list from database...');
  
  const db = getDb();
  const rows = db.query(
    'SELECT discord_id, discord_username, role FROM staff WHERE is_active = 1'
  ).all() as { discord_id: string; discord_username: string; role: string }[];

  staffCache.clear();
  for (const row of rows) {
    staffCache.set(row.discord_id, {
      discord_id: row.discord_id,
      discord_username: row.discord_username,
      role: row.role as 'admin' | 'staff',
    });
  }

  // --- BOOTSTRAP INITIAL ADMIN ---
  // If the admin is not in the database yet, we insert them automatically.
  if (!staffCache.has(MASTER_ADMIN_ID)) {
    console.log('⚠️ Initial admin not found in DB. Bootstrapping...');

    const id = crypto.randomUUID();
    try {
      // Check if exists first (may be deactivated)
      const existing = db.query('SELECT * FROM staff WHERE discord_id = ?').get(MASTER_ADMIN_ID);

      if (existing) {
        db.query(
          "UPDATE staff SET role = 'admin', is_active = 1 WHERE discord_id = ?"
        ).run(MASTER_ADMIN_ID);
      } else {
        db.query(
          "INSERT INTO staff (id, discord_id, discord_username, role, is_active, balance) VALUES (?, ?, 'shylv24', 'admin', 1, 0)"
        ).run(id, MASTER_ADMIN_ID);
      }

      staffCache.set(MASTER_ADMIN_ID, {
        discord_id: MASTER_ADMIN_ID,
        discord_username: 'shylv24',
        role: 'admin',
      });
      console.log('✅ Initial admin bootstrapped successfully!');
    } catch (error) {
      console.error('❌ Failed to bootstrap initial admin:', error);
    }
  }

  console.log(`✅ Loaded ${staffCache.size} active staff member(s) into cache.`);
}

/** Check if a Discord user ID belongs to an active staff member */
export function isRegistered(discordId: string): boolean {
  return staffCache.has(discordId);
}

/** Check if a Discord user ID has the admin role */
export function isAdmin(discordId: string): boolean {
  const staff = staffCache.get(discordId);
  return staff?.role === 'admin';
}

/** Add or update a staff member in the cache (called after DB insert) */
export function updateStaffCache(staff: StaffConfig): void {
  staffCache.set(staff.discord_id, staff);
}

/** Remove a staff member from the cache (called after DB deactivate) */
export function removeStaffCache(discordId: string): void {
  staffCache.delete(discordId);
}
