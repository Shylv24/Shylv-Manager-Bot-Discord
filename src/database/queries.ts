// ─── Database Queries ─── Shylv Manager Bot ───
//
// All database operations using bun:sqlite.
// Uses transactions for balance updates to ensure consistency.
// chapters field: stored as JSON string "[1,2,3]", parsed on read.
//

import { getDb } from './sqlite.js';
import type { Staff, ChapterLog, BalanceLog, StaffStats, StaffConfig } from '../types/index.js';

// ─── Helpers ───

/** Generate a UUID v4 string */
function uuid(): string {
  return crypto.randomUUID();
}

/** Parse chapters JSON string back to number array */
function parseChaptersJson(json: string): number[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/** Convert SQLite row to Staff interface */
function rowToStaff(row: Record<string, unknown>): Staff {
  return {
    id: row.id as string,
    discord_id: row.discord_id as string,
    discord_username: row.discord_username as string,
    role: row.role as 'admin' | 'staff',
    balance: row.balance as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Convert SQLite row to ChapterLog interface (parse chapters JSON) */
function rowToChapterLog(row: Record<string, unknown>): ChapterLog {
  return {
    id: row.id as string,
    staff_id: row.staff_id as string,
    chapters: parseChaptersJson(row.chapters as string),
    point: row.point as number,
    bonus: row.bonus as number,
    total_added: row.total_added as number,
    note: (row.note as string) || null,
    logged_by: row.logged_by as string,
    created_at: row.created_at as string,
  };
}

/** Convert SQLite row to BalanceLog interface */
function rowToBalanceLog(row: Record<string, unknown>): BalanceLog {
  return {
    id: row.id as string,
    staff_id: row.staff_id as string,
    amount: row.amount as number,
    type: row.type as 'chapter' | 'deduct' | 'bonus',
    reason: (row.reason as string) || null,
    reference_id: (row.reference_id as string) || null,
    logged_by: row.logged_by as string,
    created_at: row.created_at as string,
  };
}

// ─── Staff Queries ───

/** Find a staff member by their Discord ID */
export async function findStaffByDiscordId(discordId: string): Promise<Staff | null> {
  const db = getDb();
  const row = db.query('SELECT * FROM staff WHERE discord_id = ?').get(discordId) as Record<string, unknown> | null;

  if (!row) return null;
  return rowToStaff(row);
}

/** Get all active staff members, ordered by balance descending */
export async function getAllActiveStaff(): Promise<Staff[]> {
  const db = getDb();
  const rows = db.query('SELECT * FROM staff WHERE is_active = 1 ORDER BY balance DESC').all() as Record<string, unknown>[];

  return rows.map(rowToStaff);
}

/**
 * Add or reactivate a staff member.
 * Called by /reg command.
 */
export async function addStaff(discordId: string, username: string, role: 'admin' | 'staff'): Promise<Staff> {
  const db = getDb();
  const id = uuid();

  // Check if user exists
  const existing = db.query('SELECT * FROM staff WHERE discord_id = ?').get(discordId) as Record<string, unknown> | null;

  if (existing) {
    // Reactivate existing user
    db.query(
      'UPDATE staff SET discord_username = ?, role = ?, is_active = 1 WHERE discord_id = ?'
    ).run(username, role, discordId);
  } else {
    // Insert new user
    db.query(
      'INSERT INTO staff (id, discord_id, discord_username, role, is_active, balance) VALUES (?, ?, ?, ?, 1, 0)'
    ).run(id, discordId, username, role);
  }

  const row = db.query('SELECT * FROM staff WHERE discord_id = ?').get(discordId) as Record<string, unknown> | null;
  if (!row) throw new Error('Database error while adding staff member.');

  return rowToStaff(row);
}

/**
 * Deactivate a staff member (does not delete their records).
 * Called by /staff_remove command.
 */
export async function deactivateStaff(discordId: string): Promise<void> {
  const db = getDb();
  const result = db.query('UPDATE staff SET is_active = 0 WHERE discord_id = ?').run(discordId);

  if (result.changes === 0) {
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
 * All three operations wrapped in a transaction for atomicity.
 * Returns the updated staff record and the chapter log.
 */
export async function addChapterLog(params: AddChapterLogParams): Promise<{
  staff: Staff;
  chapterLog: ChapterLog;
}> {
  const db = getDb();
  const totalAdded = params.point;

  // Get staff and admin records
  const staff = await findStaffByDiscordId(params.staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const admin = await findStaffByDiscordId(params.loggedByDiscordId);
  if (!admin) throw new Error('Admin not found in database.');

  const chapterLogId = uuid();
  const balanceLogId = uuid();
  const newBalance = Number(staff.balance) + totalAdded;

  // Transaction: insert chapter_log + insert balance_log + update balance
  const transaction = db.transaction(() => {
    // 1. Insert chapter log
    db.query(
      `INSERT INTO chapter_logs (id, staff_id, chapters, point, total_added, note, logged_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      chapterLogId,
      staff.id,
      JSON.stringify(params.chapters),
      params.point,
      totalAdded,
      params.note,
      admin.id
    );

    // 2. Insert balance log
    db.query(
      `INSERT INTO balance_logs (id, staff_id, amount, type, reason, reference_id, logged_by)
       VALUES (?, ?, ?, 'chapter', NULL, ?, ?)`
    ).run(
      balanceLogId,
      staff.id,
      totalAdded,
      chapterLogId,
      admin.id
    );

    // 3. Update staff balance
    db.query('UPDATE staff SET balance = ? WHERE id = ?').run(newBalance, staff.id);
  });

  transaction();

  // Fetch updated records
  const updatedStaffRow = db.query('SELECT * FROM staff WHERE id = ?').get(staff.id) as Record<string, unknown> | null;
  const chapterLogRow = db.query('SELECT * FROM chapter_logs WHERE id = ?').get(chapterLogId) as Record<string, unknown> | null;

  if (!updatedStaffRow || !chapterLogRow) {
    throw new Error('Failed to retrieve records after chapter log insert.');
  }

  return {
    staff: rowToStaff(updatedStaffRow),
    chapterLog: rowToChapterLog(chapterLogRow),
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
  const db = getDb();

  const staff = await findStaffByDiscordId(params.staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const admin = await findStaffByDiscordId(params.loggedByDiscordId);
  if (!admin) throw new Error('Admin not found in database.');

  const balanceLogId = uuid();
  const newBalance = Number(staff.balance) + params.amount;

  // Transaction: insert balance_log + update balance
  const transaction = db.transaction(() => {
    db.query(
      `INSERT INTO balance_logs (id, staff_id, amount, type, reason, reference_id, logged_by)
       VALUES (?, ?, ?, 'bonus', ?, NULL, ?)`
    ).run(
      balanceLogId,
      staff.id,
      params.amount,
      params.reason,
      admin.id
    );

    db.query('UPDATE staff SET balance = ? WHERE id = ?').run(newBalance, staff.id);
  });

  transaction();

  const updatedRow = db.query('SELECT * FROM staff WHERE id = ?').get(staff.id) as Record<string, unknown> | null;
  if (!updatedRow) throw new Error('Failed to update staff balance.');

  return rowToStaff(updatedRow);
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
  const db = getDb();

  const staff = await findStaffByDiscordId(params.staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const admin = await findStaffByDiscordId(params.loggedByDiscordId);
  if (!admin) throw new Error('Admin not found in database.');

  const balanceLogId = uuid();
  const newBalance = Number(staff.balance) - params.amount;

  // Transaction: insert balance_log + update balance
  const transaction = db.transaction(() => {
    db.query(
      `INSERT INTO balance_logs (id, staff_id, amount, type, reason, reference_id, logged_by)
       VALUES (?, ?, ?, 'deduct', ?, NULL, ?)`
    ).run(
      balanceLogId,
      staff.id,
      -params.amount, // negative for deductions
      params.reason,
      admin.id
    );

    db.query('UPDATE staff SET balance = ? WHERE id = ?').run(newBalance, staff.id);
  });

  transaction();

  const updatedRow = db.query('SELECT * FROM staff WHERE id = ?').get(staff.id) as Record<string, unknown> | null;
  if (!updatedRow) throw new Error('Failed to update staff balance.');

  return rowToStaff(updatedRow);
}

// ─── Stats Queries ───

/** Get comprehensive stats for a staff member */
export async function getStaffStats(discordId: string): Promise<StaffStats> {
  const db = getDb();

  const staff = await findStaffByDiscordId(discordId);
  if (!staff) throw new Error('Staff member not found in database.');

  // Get all chapter logs for total count
  const chapterLogs = db.query(
    'SELECT chapters, created_at FROM chapter_logs WHERE staff_id = ? ORDER BY created_at DESC'
  ).all(staff.id) as Record<string, unknown>[];

  const allChapters = chapterLogs.flatMap((log) => parseChaptersJson(log.chapters as string));
  const totalChapters = new Set(allChapters).size; // unique chapters
  const totalChapterLogs = chapterLogs.length;
  const lastActive = chapterLogs.length > 0 ? (chapterLogs[0].created_at as string) : null;

  // Get recent chapter logs (last 10)
  const recentChapterRows = db.query(
    'SELECT * FROM chapter_logs WHERE staff_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(staff.id) as Record<string, unknown>[];

  // Get recent balance logs (last 10)
  const recentBalanceRows = db.query(
    'SELECT * FROM balance_logs WHERE staff_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(staff.id) as Record<string, unknown>[];

  return {
    staff,
    totalChapters,
    totalChapterLogs,
    lastActive,
    recentChapterLogs: recentChapterRows.map(rowToChapterLog),
    recentBalanceLogs: recentBalanceRows.map(rowToBalanceLog),
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
  const db = getDb();
  
  const staff = await findStaffByDiscordId(staffDiscordId);
  if (!staff) throw new Error('Staff member not found in database.');

  const transaction = db.transaction(() => {
    if (logType === 'chapter' || logType === 'all') {
      db.query('DELETE FROM chapter_logs WHERE staff_id = ?').run(staff.id);
    }

    if (logType === 'balance' || logType === 'all') {
      db.query('DELETE FROM balance_logs WHERE staff_id = ?').run(staff.id);
    }

    if (resetBalance) {
      db.query('UPDATE staff SET balance = 0 WHERE id = ?').run(staff.id);
    }
  });

  transaction();
}
