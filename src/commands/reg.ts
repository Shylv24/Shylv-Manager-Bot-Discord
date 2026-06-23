// ─── /reg Command ─── Shylv Manager Bot ───
//
// Public command for self-registration as a staff member.
// Usage: /reg
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isRegistered, updateStaffCache } from '../utils/staff_cache.js';
import { addStaff } from '../database/queries.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('reg')
  .setDescription('Register yourself as a staff member')
  .setDMPermission(true)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.user.id;
  const username = interaction.user.username;

  // 1. Check if already registered in active cache
  if (isRegistered(userId)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You are already registered as a staff member.')],
      ephemeral: true,
    });
    return;
  }

  // 2. Defer reply to handle DB operation (ephemeral for clean DM/guild interaction)
  await interaction.deferReply({ ephemeral: true });

  try {
    // 3. Add or reactivate in DB
    const staffRecord = await addStaff(userId, username, 'staff');

    // 4. Update memory cache
    updateStaffCache({
      discord_id: staffRecord.discord_id,
      discord_username: staffRecord.discord_username,
      role: staffRecord.role as 'admin' | 'staff',
    });

    // 5. Reply with success
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Registration Successful',
          `You have been registered as **${staffRecord.role}**.`
        ),
      ],
    });
  } catch (error) {
    console.error('Error in /reg command:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred during registration. Please try again later.')],
    });
  }
}
