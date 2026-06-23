// ─── /deduct Command ─── Shylv Manager Bot ───
//
// Admin-only command to deduct balance from a staff member.
// Usage: /deduct user:@Staff amount:5.00 reason:Pembayaran Juni
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { addDeduction } from '../database/queries.js';
import { createDeductEmbed, createErrorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('deduct')
  .setDescription('Deduct balance from a staff member')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The staff member to deduct from')
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to deduct (e.g. 5.00)')
      .setRequired(true)
      .setMinValue(0.01)
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('Reason for the deduction (e.g. "Pembayaran Juni")')
      .setRequired(true)
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
  const amount = interaction.options.getNumber('amount', true);
  const reason = interaction.options.getString('reason', true);

  // 3. Validate target user
  if (targetUser.bot) {
    await interaction.reply({
      embeds: [createErrorEmbed('Cannot deduct balance from a bot.')],
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
    // 5. Process deduction
    const updatedStaff = await addDeduction({
      staffDiscordId: targetUser.id,
      amount,
      reason,
      loggedByDiscordId: interaction.user.id,
    });

    // 6. Reply with deduction embed
    await interaction.editReply({
      embeds: [
        createDeductEmbed({
          staffUsername: updatedStaff.discord_username,
          staffDiscordId: targetUser.id,
          amount,
          reason,
          remainingBalance: Number(updatedStaff.balance),
        }),
      ],
    });
  } catch (error) {
    console.error('Error in /deduct:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while processing the deduction. Please try again.')],
    });
  }
}
