// ─── /staff_add Command ─── Shylv Manager Bot ───
//
// Admin-only command to add a new staff or admin member.
// Usage: /staff_add user:@User role:admin|staff
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered, updateStaffCache } from '../utils/staff_cache.js';
import { addStaff } from '../database/queries.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('staff_add')
  .setDescription('Add a new staff or admin member')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The Discord user to add as staff/admin')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('role')
      .setDescription('The role to assign to this user')
      .setRequired(true)
      .addChoices(
        { name: 'Admin', value: 'admin' },
        { name: 'Staff', value: 'staff' }
      )
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
  const role = interaction.options.getString('role', true) as 'admin' | 'staff';

  // 3. Prevent duplicate registration
  if (isRegistered(targetUser.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed(`<@${targetUser.id}> is already registered as an active staff member.`)],
      ephemeral: true,
    });
    return;
  }

  // 4. Defer reply
  await interaction.deferReply();

  try {
    // 5. Add to DB
    const staffRecord = await addStaff(targetUser.id, targetUser.username, role);

    // 6. Update memory cache
    updateStaffCache({
      discord_id: staffRecord.discord_id,
      discord_username: staffRecord.discord_username,
      role: staffRecord.role as 'admin' | 'staff',
    });

    // 7. Reply with success
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'User Added',
          `<@${targetUser.id}> has been successfully registered as **${role}**.`
        ),
      ],
    });
  } catch (error) {
    console.error('Error in /staff_add command:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while adding the user. Please try again later.')],
    });
  }
}
