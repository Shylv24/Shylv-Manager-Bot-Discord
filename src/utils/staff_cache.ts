// ─── Staff Cache Service ─── Shylv Manager Bot ───
//
// Manages in-memory caching of staff members to avoid hitting
// the database on every command interaction.
//

import { getSupabase } from '../database/supabase.js';
import type { StaffConfig } from '../types/index.js';

// In-memory cache: Discord ID// The in-memory cache
const staffCache = new Map<string, StaffConfig>();

export const MASTER_ADMIN_ID = '587958693908185108';

/**
 * Load active staff from Supabase into memory on boot.
 * Call this once during bot startup.
 */
export async function loadStaffCache(): Promise<void> {
  console.log('📋 Loading staff list from database...');
  
  const { data, error } = await getSupabase()
    .from('staff')
    .select('discord_id, discord_username, role')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Failed to load staff from database:', error);
    return;
  }

  staffCache.clear();
  for (const row of data) {
    staffCache.set(row.discord_id, {
      discordId: row.discord_id,
      username: row.discord_username,
      role: row.role as 'admin' | 'staff',
    });
  }

  // --- BOOTSTRAP INITIAL ADMIN ---
  // If the admin is not in the database yet, we insert them automatically.
  if (!staffCache.has(MASTER_ADMIN_ID)) {
    console.log('⚠️ Initial admin not found in DB. Bootstrapping...');
    const { data: newAdmin, error: insertError } = await getSupabase()
      .from('staff')
      .upsert({
        discord_id: MASTER_ADMIN_ID,
        discord_username: 'shylv24',
        role: 'admin',
        is_active: true
      }, { onConflict: 'discord_id' })
      .select()
      .single();

    if (!insertError && newAdmin) {
      staffCache.set(MASTER_ADMIN_ID, {
        discordId: MASTER_ADMIN_ID,
        username: 'shylv24',
        role: 'admin',
      });
      console.log('✅ Initial admin bootstrapped successfully!');
    } else {
      console.error('❌ Failed to bootstrap initial admin:', insertError);
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
  staffCache.set(staff.discordId, staff);
}

/** Remove a staff member from the cache (called after DB deactivate) */
export function removeStaffCache(discordId: string): void {
  staffCache.delete(discordId);
}
