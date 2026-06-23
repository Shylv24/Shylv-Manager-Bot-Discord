// ─── Type Definitions ─── Shylv Manager Bot ───

/** Staff member stored in database */
export interface Staff {
  id: string;
  discord_id: string;
  discord_username: string;
  role: 'admin' | 'staff';
  balance: number;
  created_at: string;
  updated_at: string;
}

/** Staff config entry (hardcoded in config/staff.ts) */
export interface StaffConfig {
  discordId: string;
  username: string;
  role: 'admin' | 'staff';
}

/** Chapter log record */
export interface ChapterLog {
  id: string;
  staff_id: string;
  chapters: number[];
  point: number;
  bonus: number;
  total_added: number;
  note: string | null;
  logged_by: string;
  created_at: string;
}

/** Balance log record (additions and deductions) */
export interface BalanceLog {
  id: string;
  staff_id: string;
  amount: number;
  type: 'chapter' | 'deduct';
  reason: string | null;
  reference_id: string | null;
  logged_by: string;
  created_at: string;
}

/** Comprehensive staff statistics */
export interface StaffStats {
  staff: Staff;
  totalChapters: number;
  totalChapterLogs: number;
  lastActive: string | null;
  recentChapterLogs: ChapterLog[];
  recentBalanceLogs: BalanceLog[];
}

/** Data passed to chapter log embed builder */
export interface ChapterLogEmbedData {
  staffUsername: string;
  staffDiscordId: string;
  chapters: number[];
  point: number;
  bonus: number;
  totalAdded: number;
  newBalance: number;
  note: string | null;
}

/** Data passed to deduction embed builder */
export interface DeductEmbedData {
  staffUsername: string;
  staffDiscordId: string;
  amount: number;
  reason: string;
  remainingBalance: number;
}
