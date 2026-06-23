// ─── Database Queries ─── Shylv Manager Bot ───

import { getSupabase } from './supabase.js';
import type { Staff, ChapterLog, BalanceLog, StaffStats, StaffConfig } from '../types/index.js';

// ─── Staff Queries ───

/** Find a staff member by their Discord ID */
export async function findStaffByDiscordId(discordId: string): Promise<Staff | null> {
  const { data, error } = await getSupabase()
    .from('staff')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" which is expected when user not found
    console.error('Error finding staff:', error);
    throw new Error('Database error while finding staff member.');
  }

  return data as Staff | null;
}

/** Get all active staff members, ordered by balance descending */
export async function getAllActiveStaff(): Promise<Staff[]> {
  const { data, error } = await getSupabase()
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .order('balance', { ascending: false });

  if (error) {
    console.error('Error fetching all active staff:', error);
    throw new Error('Database error while fetching staff list.');
  }

  return (data || []) as Staff[];
}

/**
 * Add or reactivate a staff member.
 * Called by /reg command.
 */
export async function addStaff(discordId: string, username: string, role: 'admin' | 'staff'): Promise<Staff> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('staff')
    .upsert(
      {
        discord_id: discordId,
        discord_username: username,
        role: role,
        is_active: true, // reactivate if they were deactivated
      },
      { onConflict: 'discord_id' }
    )
    .select()
    .single();

  if (error || !data) {
    console.error(`Error adding staff ${username}:`, error);
    throw new Error('Database error while adding staff member.');
  }

  return data as Staff;
}

/**
 * Deactivate a staff member (does not delete their records).
 * Called by /staff_remove command.
 */
export async function deactivateStaff(discordId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('discord_id', discordId);

  if (error) {
    console.error(`Error deactivating staff ${discordId}:`, error);
    throw new Error('Database error while deactivating staff member.');
  }
}

// ─── Chapter Log Queries ───

interface AddChapterLogParams {
  staffDiscordId: string;
  chapters: number[];
  point: number;
  note: string | null;
  loggedByDiscordId: string;
}

/**
 * Add a chapter log record, create balance log, and update staff balance.
 * Returns the updated staff record and the chapter log.
 */
export async function addChapterLog(params: AddChapterLogParams): Promise<{
  staff: Staff;
  chapterLog: ChapterLog;
}> {
  const supabase = getSupabase();
  const totalAdded = params.point;

  // Get staff and admin records
  const staff = await findStaffByDiscordId(params.staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const admin = await findStaffByDiscordId(params.loggedByDiscordId);
  if (!admin) throw new Error('Admin not found in database.');

  // 1. Insert chapter log
  const { data: chapterLog, error: chapterError } = await supabase
    .from('chapter_logs')
    .insert({
      staff_id: staff.id,
      chapters: params.chapters,
      point: params.point,
      total_added: totalAdded,
      note: params.note,
      logged_by: admin.id,
    })
    .select()
    .single();

  if (chapterError || !chapterLog) {
    console.error('Error inserting chapter log:', chapterError);
    throw new Error('Failed to insert chapter log.');
  }

  // 2. Insert balance log
  const { error: balanceLogError } = await supabase
    .from('balance_logs')
    .insert({
      staff_id: staff.id,
      amount: totalAdded,
      type: 'chapter',
      reason: null,
      reference_id: chapterLog.id,
      logged_by: admin.id,
    });

  if (balanceLogError) {
    console.error('Error inserting balance log:', balanceLogError);
    // Don't throw — chapter log was already created
  }

  // 3. Update staff balance
  const newBalance = Number(staff.balance) + totalAdded;
  const { data: updatedStaff, error: updateError } = await supabase
    .from('staff')
    .update({ balance: newBalance })
    .eq('id', staff.id)
    .select()
    .single();

  if (updateError || !updatedStaff) {
    console.error('Error updating balance:', updateError);
    throw new Error('Failed to update staff balance.');
  }

  return {
    staff: updatedStaff as Staff,
    chapterLog: chapterLog as ChapterLog,
  };
}

interface AddBonusParams {
  staffDiscordId: string;
  amount: number;
  reason: string;
  loggedByDiscordId: string;
}

/**
 * Add a bonus to a staff member.
 * Returns the updated staff record.
 */
export async function addBonusLog(params: AddBonusParams): Promise<Staff> {
  const supabase = getSupabase();

  const staff = await findStaffByDiscordId(params.staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const admin = await findStaffByDiscordId(params.loggedByDiscordId);
  if (!admin) throw new Error('Admin not found in database.');

  // 1. Insert balance log (positive amount)
  const { error: balanceLogError } = await supabase
    .from('balance_logs')
    .insert({
      staff_id: staff.id,
      amount: params.amount,
      type: 'bonus',
      reason: params.reason,
      reference_id: null,
      logged_by: admin.id,
    });

  if (balanceLogError) {
    console.error('Error inserting bonus log:', balanceLogError);
    throw new Error('Failed to log bonus.');
  }

  // 2. Update staff balance
  const newBalance = Number(staff.balance) + params.amount;
  const { data: updatedStaff, error: updateError } = await supabase
    .from('staff')
    .update({ balance: newBalance })
    .eq('id', staff.id)
    .select()
    .single();

  if (updateError || !updatedStaff) {
    console.error('Error updating balance:', updateError);
    throw new Error('Failed to update staff balance.');
  }

  return updatedStaff as Staff;
}

// ─── Deduction Queries ───

interface AddDeductionParams {
  staffDiscordId: string;
  amount: number;
  reason: string;
  loggedByDiscordId: string;
}

/**
 * Deduct balance from a staff member.
 * Returns the updated staff record.
 */
export async function addDeduction(params: AddDeductionParams): Promise<Staff> {
  const supabase = getSupabase();

  const staff = await findStaffByDiscordId(params.staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const admin = await findStaffByDiscordId(params.loggedByDiscordId);
  if (!admin) throw new Error('Admin not found in database.');

  // 1. Insert balance log (negative amount)
  const { error: balanceLogError } = await supabase
    .from('balance_logs')
    .insert({
      staff_id: staff.id,
      amount: -params.amount,
      type: 'deduct',
      reason: params.reason,
      reference_id: null,
      logged_by: admin.id,
    });

  if (balanceLogError) {
    console.error('Error inserting deduction log:', balanceLogError);
    throw new Error('Failed to log deduction.');
  }

  // 2. Update staff balance
  const newBalance = Number(staff.balance) - params.amount;
  const { data: updatedStaff, error: updateError } = await supabase
    .from('staff')
    .update({ balance: newBalance })
    .eq('id', staff.id)
    .select()
    .single();

  if (updateError || !updatedStaff) {
    console.error('Error updating balance:', updateError);
    throw new Error('Failed to update staff balance.');
  }

  return updatedStaff as Staff;
}

// ─── Stats Queries ───

/** Get comprehensive stats for a staff member */
export async function getStaffStats(discordId: string): Promise<StaffStats> {
  const supabase = getSupabase();

  const staff = await findStaffByDiscordId(discordId);
  if (!staff) throw new Error('Staff member not found in database.');

  // Get total chapters count (sum of all chapter arrays)
  const { data: chapterLogs, error: chapError } = await supabase
    .from('chapter_logs')
    .select('chapters, created_at')
    .eq('staff_id', staff.id)
    .order('created_at', { ascending: false });

  if (chapError) {
    console.error('Error fetching chapter logs:', chapError);
    throw new Error('Failed to fetch chapter logs.');
  }

  const allChapters = (chapterLogs || []).flatMap((log: { chapters: number[] }) => log.chapters);
  const totalChapters = new Set(allChapters).size; // unique chapters
  const totalChapterLogs = (chapterLogs || []).length;
  const lastActive = chapterLogs && chapterLogs.length > 0 ? chapterLogs[0].created_at : null;

  // Get recent chapter logs (last 10)
  const { data: recentChapters, error: recentChapError } = await supabase
    .from('chapter_logs')
    .select('*')
    .eq('staff_id', staff.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentChapError) {
    console.error('Error fetching recent chapter logs:', recentChapError);
  }

  // Get recent balance logs (last 10)
  const { data: recentBalance, error: recentBalError } = await supabase
    .from('balance_logs')
    .select('*')
    .eq('staff_id', staff.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentBalError) {
    console.error('Error fetching recent balance logs:', recentBalError);
  }

  return {
    staff,
    totalChapters,
    totalChapterLogs,
    lastActive,
    recentChapterLogs: (recentChapters || []) as ChapterLog[],
    recentBalanceLogs: (recentBalance || []) as BalanceLog[],
  };
}

// ─── Log Deletion Queries ───

/**
 * Clear chapter logs and/or balance logs for a specific user.
 * Optionally resets their balance to 0.
 */
export async function clearUserLogs(
  staffDiscordId: string,
  logType: 'chapter' | 'balance' | 'all',
  resetBalance: boolean
): Promise<void> {
  const supabase = getSupabase();
  
  const staff = await findStaffByDiscordId(staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  if (logType === 'chapter' || logType === 'all') {
    const { error } = await supabase
      .from('chapter_logs')
      .delete()
      .eq('staff_id', staff.id);
    if (error) {
      console.error('Error deleting chapter logs:', error);
      throw new Error('Failed to delete chapter logs.');
    }
  }

  if (logType === 'balance' || logType === 'all') {
    const { error } = await supabase
      .from('balance_logs')
      .delete()
      .eq('staff_id', staff.id);
    if (error) {
      console.error('Error deleting balance logs:', error);
      throw new Error('Failed to delete balance logs.');
    }
  }

  if (resetBalance) {
    const { error } = await supabase
      .from('staff')
      .update({ balance: 0 })
      .eq('id', staff.id);
    if (error) {
      console.error('Error resetting staff balance:', error);
      throw new Error('Failed to reset staff balance.');
    }
  }
}
