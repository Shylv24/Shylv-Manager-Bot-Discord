// ─── /staff_stat Command ─── Shylv Manager Bot ───
//
// View staff statistics and balance history.
// - Staff: shows own stats (no options needed)
// - Admin: can optionally specify a user to view their stats
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { getStaffStats } from '../database/queries.js';
import { createStaffStatEmbed, createErrorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('staff_stat')
  .setDescription('View your statistics, balance, and chapter history')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('(Admin only) View stats of another staff member')
      .setRequired(false)
  )
  .setDMPermission(true)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const callerIsAdmin = isAdmin(interaction.user.id);
  const targetUser = interaction.options.getUser('user');

  // Determine whose stats to show
  let targetDiscordId: string;

  if (targetUser) {
    // Admin viewing someone else's stats
    if (!callerIsAdmin) {
      await interaction.reply({
        embeds: [createErrorEmbed('Only admins can view stats of other staff members. Use `/staff_stat` without options to see your own stats.')],
        ephemeral: true,
      });
      return;
    }

    if (targetUser.bot) {
      await interaction.reply({
        embeds: [createErrorEmbed('Cannot view stats for a bot.')],
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

    targetDiscordId = targetUser.id;
  } else {
    // Viewing own stats
    if (!isRegistered(interaction.user.id)) {
      await interaction.reply({
        embeds: [createErrorEmbed('You are not a registered staff member. Please contact an admin.')],
        ephemeral: true,
      });
      return;
    }

    targetDiscordId = interaction.user.id;
  }

  // Defer reply
  await interaction.deferReply();

  try {
    const stats = await getStaffStats(targetDiscordId);
    await interaction.editReply({
      embeds: [createStaffStatEmbed(stats)],
    });
  } catch (error) {
    console.error('Error in /staff_stat:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while fetching stats. Please try again.')],
    });
  }
}
