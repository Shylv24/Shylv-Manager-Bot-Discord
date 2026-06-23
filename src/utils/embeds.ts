// ─── Discord Embed Builders ─── Shylv Manager Bot ───

import { EmbedBuilder } from 'discord.js';
import { formatChapters } from './parser.js';
import type { ChapterLogEmbedData, DeductEmbedData, StaffStats, BalanceLog } from '../types/index.js';

// ─── Color Palette ───
const COLORS = {
  SUCCESS: 0x2ecc71,    // Green — chapter logged
  DEDUCT: 0xf39c12,     // Orange — balance deducted
  INFO: 0x3498db,        // Blue — stats
  ERROR: 0xe74c3c,       // Red — errors
  HELP: 0x9b59b6,        // Purple — help
} as const;

// ─── Helpers ───
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatBalance(amount: number): string {
  return amount.toFixed(2);
}

// ─── Chapter Log Embed ───

/** Embed for successful /ch_done command */
export function createChapterLogEmbed(data: ChapterLogEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('✅ Chapter Logged Successfully')
    .addFields(
      { name: '👤 Staff', value: `<@${data.staffDiscordId}>`, inline: true },
      { name: '📖 Chapters', value: formatChapters(data.chapters), inline: true },
      { name: '\u200b', value: '\u200b', inline: true }, // spacer
      { name: '💎 Point', value: formatBalance(data.point), inline: true },
      { name: '🎁 Bonus', value: formatBalance(data.bonus), inline: true },
      { name: '💰 Added', value: `+${formatBalance(data.totalAdded)}`, inline: true },
      { name: '💳 New Balance', value: `**${formatBalance(data.newBalance)}**`, inline: false },
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  if (data.note) {
    embed.addFields({ name: '📝 Note', value: data.note, inline: false });
  }

  return embed;
}

// ─── Deduction Embed ───

/** Embed for successful /deduct command */
export function createDeductEmbed(data: DeductEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.DEDUCT)
    .setTitle('💸 Balance Deducted')
    .addFields(
      { name: '👤 Staff', value: `<@${data.staffDiscordId}>`, inline: true },
      { name: '💰 Deducted', value: `-${formatBalance(data.amount)}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true }, // spacer
      { name: '📝 Reason', value: data.reason, inline: false },
      { name: '💳 Remaining Balance', value: `**${formatBalance(data.remainingBalance)}**`, inline: false },
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  // Add warning if balance is negative
  if (data.remainingBalance < 0) {
    embed.addFields({
      name: '⚠️ Warning',
      value: 'Balance is now negative!',
      inline: false,
    });
  }

  return embed;
}

// ─── Staff Stats Embed ───

/** Embed for /staff_stat command */
export function createStaffStatEmbed(stats: StaffStats): EmbedBuilder {
  const { staff, totalChapters, totalChapterLogs, lastActive, recentChapterLogs, recentBalanceLogs } = stats;

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('📊 Staff Statistics')
    .addFields(
      { name: '👤 Name', value: `<@${staff.discord_id}> (${staff.discord_username})`, inline: true },
      { name: '🏷️ Role', value: staff.role.charAt(0).toUpperCase() + staff.role.slice(1), inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '💳 Balance', value: `**${formatBalance(Number(staff.balance))}**`, inline: true },
      { name: '📖 Total Chapters', value: `${totalChapters} chapters (${totalChapterLogs} entries)`, inline: true },
      { name: '🕐 Last Active', value: lastActive ? formatDate(lastActive) : 'No activity yet', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  // Recent chapter logs
  if (recentChapterLogs.length > 0) {
    const chapterLines = recentChapterLogs.slice(0, 5).map((log) => {
      const chapters = formatChapters(log.chapters);
      const total = formatBalance(Number(log.total_added));
      const date = formatDate(log.created_at);
      return `• Ch ${chapters} → +${total} — ${date}`;
    });
    embed.addFields({
      name: '📋 Recent Chapters',
      value: chapterLines.join('\n'),
      inline: false,
    });
  }

  // Recent balance logs
  if (recentBalanceLogs.length > 0) {
    const balanceLines = recentBalanceLogs.slice(0, 5).map((log: BalanceLog) => {
      const amount = Number(log.amount);
      const sign = amount >= 0 ? '+' : '';
      const label = log.type === 'chapter' ? 'chapter' : log.reason || 'deduction';
      const date = formatDate(log.created_at);
      return `• ${sign}${formatBalance(amount)} (${label}) — ${date}`;
    });
    embed.addFields({
      name: '💰 Recent Balance History',
      value: balanceLines.join('\n'),
      inline: false,
    });
  }

  return embed;
}

// ─── Error Embed ───

/** Embed for error messages */
export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle('❌ Error')
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });
}

// ─── Help Embed ───

/** Embed for /help command */
export function createHelpEmbed(isAdmin: boolean): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.HELP)
    .setTitle('📋 Shylv Manager Bot — Commands')
    .setDescription('Bot untuk manajemen scanlation — track chapters & balance.')
    .addFields(
      {
        name: '📖 `/staff_stat`',
        value: 'Lihat statistik dan riwayat balance kamu.\nAdmin bisa tambahkan `user:@staff` untuk lihat stats orang lain.',
        inline: false,
      },
      {
        name: '❓ `/help`',
        value: 'Menampilkan daftar commands ini.',
        inline: false,
      },
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  if (isAdmin) {
    embed.addFields(
      {
        name: '\u200b',
        value: '**── Admin Commands ──**',
        inline: false,
      },
      {
        name: '✅ `/ch_done`',
        value: [
          'Log chapter yang sudah dikerjakan staff.',
          '`user` — Pilih staff member',
          '`chapters` — Nomor chapter: `13`, `1-5`, `1,3,6`, `1-3,6,8-10`',
          '`point` — Point value (contoh: `1.5`)',
          '`bonus` — Bonus value (contoh: `0.5`)',
          '`note` — Catatan (opsional)',
        ].join('\n'),
        inline: false,
      },
      {
        name: '💸 `/deduct`',
        value: [
          'Kurangi balance staff.',
          '`user` — Pilih staff member',
          '`amount` — Jumlah dikurangi',
          '`reason` — Alasan (wajib)',
        ].join('\n'),
        inline: false,
      },
      {
        name: '➕ `/staff_add`',
        value: 'Daftarkan user Discord baru ke dalam sistem sebagai staff atau admin.',
        inline: false,
      },
      {
        name: '➖ `/staff_remove`',
        value: 'Cabut akses staff dari sistem.',
        inline: false,
      },
      {
        name: '🧹 `/clear_logs`',
        value: 'Hapus riwayat chapter/balance logs milik staff tertentu dan (opsional) reset saldo mereka.',
        inline: false,
      },
    );
  }

  return embed;
}

// ─── Success Embed ───

/** Embed for general success messages */
export function createSuccessEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });
}
