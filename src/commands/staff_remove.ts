// ─── /staff_remove Command ─── Shylv Manager Bot ───
//
// Admin-only command to deactivate a staff member.
// Usage: /staff_remove user:@User
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered, removeStaffCache } from '../utils/staff_cache.js';
import { deactivateStaff } from '../database/queries.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('staff_remove')
  .setDescription('Remove (deactivate) a staff member')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The staff member to remove')
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

  // 3. Prevent removing oneself
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      embeds: [createErrorEmbed('You cannot remove yourself.')],
      ephemeral: true,
    });
    return;
  }

  // 4. Validate user is registered
  if (!isRegistered(targetUser.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed(`<@${targetUser.id}> is not currently an active staff member.`)],
      ephemeral: true,
    });
    return;
  }

  // 5. Defer reply
  await interaction.deferReply();

  try {
    // 6. Deactivate in DB
    await deactivateStaff(targetUser.id);

    // 7. Remove from memory cache
    removeStaffCache(targetUser.id);

    // 8. Reply with success
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Staff Removed',
          `<@${targetUser.id}> has been deactivated and can no longer use bot commands.\n*(Their historical balance and chapter logs are kept safe).*`
        ),
      ],
    });
  } catch (error) {
    console.error('Error in /staff_remove:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while removing the staff member. Please try again.')],
    });
  }
}
