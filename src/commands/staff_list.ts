// ─── /staff_list Command ─── Shylv Manager Bot ───
//
// Admin-only command to view all active staff members and their balances.
// Usage: /staff_list [public:true]
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin } from '../utils/staff_cache.js';
import { getAllActiveStaff } from '../database/queries.js';
import { createStaffListEmbed, createErrorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('staff_list')
  .setDescription('View a leaderboard/dashboard of all active staff members')
  .addBooleanOption((option) =>
    option
      .setName('public')
      .setDescription('Show the leaderboard publicly? (Default: False)')
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

  const isPublic = interaction.options.getBoolean('public') ?? false;

  // 2. Defer reply
  await interaction.deferReply({ ephemeral: !isPublic });

  try {
    // 3. Get all active staff
    const staffList = await getAllActiveStaff();

    // 4. Send embed
    await interaction.editReply({
      embeds: [createStaffListEmbed(staffList)],
    });
  } catch (error) {
    console.error('Error in /staff_list:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while fetching the staff list. Please try again.')],
    });
  }
}
