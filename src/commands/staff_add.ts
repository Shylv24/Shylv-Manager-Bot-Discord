// ─── /staff_add Command ─── Shylv Manager Bot ───
//
// Admin-only command to register a new staff member or promote to admin.
// Usage: /staff_add user:@User role:staff
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
  .setDescription('Register a new staff member or update their role')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The Discord user to register as staff')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('role')
      .setDescription('Role to assign (default: staff)')
      .setRequired(false)
      .addChoices(
        { name: 'Staff', value: 'staff' },
        { name: 'Admin', value: 'admin' }
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
  const role = (interaction.options.getString('role') || 'staff') as 'admin' | 'staff';

  // 3. Validate target user
  if (targetUser.bot) {
    await interaction.reply({
      embeds: [createErrorEmbed('Cannot register a bot as staff.')],
      ephemeral: true,
    });
    return;
  }

  // 4. Defer reply
  await interaction.deferReply();

  try {
    // 5. Add or reactivate in DB
    const staffRecord = await addStaff(targetUser.id, targetUser.username, role);

    // 6. Update memory cache
    updateStaffCache({
      discordId: staffRecord.discord_id,
      username: staffRecord.discord_username,
      role: staffRecord.role as 'admin' | 'staff',
    });

    // 7. Reply with success
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Staff Registered',
          `Successfully registered <@${targetUser.id}> as **${role}**.`
        ),
      ],
    });
  } catch (error) {
    console.error('Error in /staff_add:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while registering the staff member. Please try again.')],
    });
  }
}
