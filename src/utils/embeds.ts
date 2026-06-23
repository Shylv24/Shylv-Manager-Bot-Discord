// ─── Discord Embed Builders ─── Shylv Manager Bot ───

import { EmbedBuilder } from 'discord.js';
import { formatChapters } from './parser.js';
import type { ChapterLogEmbedData, DeductEmbedData, StaffStats, BalanceLog, BonusEmbedData, Staff } from '../types/index.js';

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

export function createChapterLogEmbed(data: ChapterLogEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('✅ Chapter Logged Successfully')
    .setDescription(
      `👤 **Staff:** <@${data.staffDiscordId}>\n` +
      `📖 **Chapters:** ${formatChapters(data.chapters)}\n` +
      `💎 **Point/Ch:** \`${formatBalance(data.point)}\` | 💰 **Total Added:** \`+${formatBalance(data.totalAdded)}\`\n` +
      `💳 **New Balance:** \`${formatBalance(data.newBalance)}\``
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  if (data.note) {
    embed.addFields({ name: '📝 Note', value: data.note, inline: false });
  }

  return embed;
}

// ─── Bonus Embed ───

export function createBonusEmbed(data: BonusEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS) // Bonus is positive, so SUCCESS color
    .setTitle('🎁 Bonus Added')
    .setDescription(
      `👤 **Staff:** <@${data.staffDiscordId}>\n` +
      `💰 **Bonus:** \`+${formatBalance(data.amount)}\` | 💳 **New Balance:** \`${formatBalance(data.newBalance)}\`\n` +
      `📝 **Reason:** ${data.reason}`
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  return embed;
}

// ─── Deduction Embed ───

/** Embed for successful /deduct command */
export function createDeductEmbed(data: DeductEmbedData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.DEDUCT)
    .setTitle('💸 Balance Deducted')
    .setDescription(
      `👤 **Staff:** <@${data.staffDiscordId}>\n` +
      `💰 **Deducted:** \`-${formatBalance(data.amount)}\` | 💳 **Remaining:** \`${formatBalance(data.remainingBalance)}\`\n` +
      `📝 **Reason:** ${data.reason}`
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
    .setDescription(
      `👤 **User:** <@${staff.discord_id}> (\`${staff.discord_username}\`) | 🏷️ **Role:** \`${staff.role.toUpperCase()}\`\n` +
      `💳 **Balance:** **\`${formatBalance(Number(staff.balance))}\`**\n` +
      `📖 **Chapters:** \`${totalChapters}\` (\`${totalChapterLogs}\` logs) | 🕐 **Active:** ${lastActive ? formatDate(lastActive) : '*No activity*'}`
    )
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  // Recent chapter logs
  if (recentChapterLogs.length > 0) {
    const chapterLines = recentChapterLogs.slice(0, 5).map((log) => {
      const chapters = formatChapters(log.chapters);
      const total = formatBalance(Number(log.total_added));
      const date = formatDate(log.created_at);
      return `• Ch **${chapters}** → \`+${total}\` — ${date}`;
    });
    embed.addFields({
      name: '📋 Recent Completed Chapters',
      value: chapterLines.join('\n'),
      inline: false,
    });
  }

  // Recent balance logs
  if (recentBalanceLogs.length > 0) {
    const balanceLines = recentBalanceLogs.slice(0, 5).map((log: BalanceLog) => {
      const amount = Number(log.amount);
      const sign = amount >= 0 ? '+' : '';
      const label = log.type === 'chapter' ? 'chapter log'
        : log.type === 'bonus' ? (log.reason || 'bonus')
        : (log.reason || 'deduction');
      const date = formatDate(log.created_at);
      return `• \`${sign}${formatBalance(amount)}\` (${label}) — ${date}`;
    });
    embed.addFields({
      name: '💰 Recent Balance History',
      value: balanceLines.join('\n'),
      inline: false,
    });
  }

  return embed;
}

// ─── Staff List Embed (Dashboard) ───

export function createStaffListEmbed(staffList: Staff[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('🏆 Staff Leaderboard & Dashboard')
    .setDescription('Overview of all active staff members and their current balances.')
    .setTimestamp()
    .setFooter({ text: 'Shylv Manager Bot' });

  if (staffList.length === 0) {
    embed.addFields({ name: 'No Active Staff', value: 'There are currently no active staff members.' });
    return embed;
  }

  // Format into chunks if there are many staff, but let's keep it simple first
  const lines = staffList.map((staff, index) => {
    const roleEmoji = staff.role === 'admin' ? '🛡️' : '👤';
    const balance = formatBalance(Number(staff.balance));
    return `**${index + 1}.** <@${staff.discord_id}> ${roleEmoji} — 💳 \`${balance}\``;
  });

  embed.addFields({
    name: 'Active Staff',
    value: lines.join('\n'),
    inline: false,
  });

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
    .setDescription('Discord bot for scanlation team management — track chapters & balance.')
    .addFields(
      {
        name: '✍️ `/reg`',
        value: 'Register yourself as a staff member.',
        inline: false,
      },
      {
        name: '📖 `/staff_stat`',
        value: 'View your statistics and balance history.\nAdmins can specify `user:@staff` to view others\' statistics.',
        inline: false,
      },
      {
        name: '❓ `/help`',
        value: 'Show this commands list.',
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
        name: '✅ `/point`',
        value: 'Log completed chapters.\n`user` (Staff), `chapters` (e.g. 1-5), `point` (Value per chapter), `note` (Optional)',
        inline: false,
      },
      {
        name: '🎁 `/bonus`',
        value: 'Add a bonus to a staff member.\n`user` (Staff), `amount` (Value), `reason` (Required)',
        inline: false,
      },
      {
        name: '💸 `/deduct`',
        value: 'Deduct balance.\n`user` (Staff), `amount` (Value), `reason` (Required)',
        inline: false,
      },
      {
        name: '➖ `/staff_remove`',
        value: 'Deactivate a staff member.',
        inline: false,
      },
      {
        name: '🏆 `/staff_list`',
        value: 'View leaderboard of all active staff balances.',
        inline: false,
      },
      {
        name: '🧹 `/clear_logs`',
        value: 'Wipe chapter/balance logs for a user.',
        inline: false,
      }
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
