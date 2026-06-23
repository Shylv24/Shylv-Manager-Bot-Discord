// ─── /bonus Command ─── Shylv Manager Bot ───
//
// Admin-only command to add a bonus balance to a staff member.
// Usage: /bonus user:@Staff amount:5.00 reason:Good work
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { addBonusLog } from '../database/queries.js';
import { createBonusEmbed, createErrorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('bonus')
  .setDescription('Add a bonus to a staff member')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The staff member to give the bonus to')
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to add (e.g., 5.00)')
      .setRequired(true)
      .setMinValue(0.01)
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('Reason for the bonus (e.g., "Good work")')
      .setRequired(true)
  )
  .setDMPermission(true)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // 1. Check admin permission
  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You do not have administrative privileges to use this command.')],
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
      embeds: [createErrorEmbed('Cannot add bonus to bot accounts.')],
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
    // 5. Process bonus
    const updatedStaff = await addBonusLog({
      staffDiscordId: targetUser.id,
      amount,
      reason,
      loggedByDiscordId: interaction.user.id,
    });

    // 6. Reply with bonus embed
    await interaction.editReply({
      embeds: [
        createBonusEmbed({
          staffUsername: updatedStaff.discord_username,
          staffDiscordId: targetUser.id,
          amount,
          reason,
          newBalance: Number(updatedStaff.balance),
        }),
      ],
    });
  } catch (error) {
    console.error('Error in /bonus:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An internal error occurred while processing the bonus.')],
    });
  }
}
