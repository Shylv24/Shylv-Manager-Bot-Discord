// ─── /clear_logs Command ─── Shylv Manager Bot ───
//
// Admin-only command to delete logs for a specific user and optionally reset balance.
// Usage: /clear_logs user:@User log_type:All reset_balance:True
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { clearUserLogs } from '../database/queries.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('clear_logs')
  .setDescription('Clear chapter or balance logs for a user and optionally reset their balance.')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The staff member whose logs will be cleared')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('log_type')
      .setDescription('Which logs to clear')
      .setRequired(true)
      .addChoices(
        { name: 'All Logs', value: 'all' },
        { name: 'Chapter Logs Only', value: 'chapter' },
        { name: 'Balance Logs Only', value: 'balance' }
      )
  )
  .addBooleanOption((option) =>
    option
      .setName('reset_balance')
      .setDescription('Set the user\'s balance to 0? (Default: True)')
      .setRequired(false)
  )
  .setDMPermission(true)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // 1. Check admin permission
  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You do not have permission to use this command. Admin only.')],
      ephemeral: true,
    });
    return;
  }

  // 2. Get options
  const targetUser = interaction.options.getUser('user', true);
  const logType = interaction.options.getString('log_type', true) as 'chapter' | 'balance' | 'all';
  // If not provided, default to true
  const resetBalance = interaction.options.getBoolean('reset_balance') ?? true;

  // 3. Validate user
  if (targetUser.bot) {
    await interaction.reply({
      embeds: [createErrorEmbed('Cannot clear logs for a bot.')],
      ephemeral: true,
    });
    return;
  }

  if (!isRegistered(targetUser.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed(`<@${targetUser.id}> is not a registered staff member.`)],
      ephemeral: true,
    });
    return;
  }

  // 4. Defer reply
  await interaction.deferReply();

  try {
    // 5. Delete logs and reset balance
    await clearUserLogs(targetUser.id, logType, resetBalance);

    // 6. Build success message
    let actionDesc = '';
    if (logType === 'all') actionDesc = 'All chapter and balance logs have been deleted.';
    else if (logType === 'chapter') actionDesc = 'All chapter logs have been deleted.';
    else if (logType === 'balance') actionDesc = 'All balance logs have been deleted.';

    if (resetBalance) {
      actionDesc += '\nTheir balance has been reset to **0.00**.';
    } else {
      actionDesc += '\nTheir current balance was **not** reset.';
    }

    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Logs Cleared Successfully',
          `<@${targetUser.id}>'s records have been wiped.\n\n${actionDesc}`
        ),
      ],
    });
  } catch (error) {
    console.error('Error in /clear_logs:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while clearing the logs. Please try again.')],
    });
  }
}
