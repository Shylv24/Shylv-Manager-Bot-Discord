// ─── /help Command ─── Shylv Manager Bot ───

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin } from '../utils/staff_cache.js';
import { createHelpEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show available commands and how to use them')
  .setDMPermission(true)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const callerIsAdmin = isAdmin(interaction.user.id);

  await interaction.reply({
    embeds: [createHelpEmbed(callerIsAdmin)],
    ephemeral: true, // Only visible to the caller
  });
}
