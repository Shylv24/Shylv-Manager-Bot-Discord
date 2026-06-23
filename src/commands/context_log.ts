// ─── Log Points Context Menu ─── Shylv Manager Bot ───
//
// Admin-only User Context Menu command to easily log points for a staff member.
// Opens a modal for chapter input.
//

import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  UserContextMenuCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { createErrorEmbed } from '../utils/embeds.js';

export const data = new ContextMenuCommandBuilder()
  .setName('Log Points')
  .setType(ApplicationCommandType.User)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: UserContextMenuCommandInteraction): Promise<void> {
  // 1. Check admin permission
  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You do not have administrative privileges to use this command.')],
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.targetUser;

  // 2. Validate target user
  if (targetUser.bot) {
    await interaction.reply({
      embeds: [createErrorEmbed('Cannot log points for bot accounts.')],
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

  // 3. Create the modal
  const modal = new ModalBuilder()
    .setCustomId(`log_points_modal_${targetUser.id}`)
    .setTitle(`Log Points for ${targetUser.username}`);

  // Create text input components
  const chaptersInput = new TextInputBuilder()
    .setCustomId('chaptersInput')
    .setLabel('Chapters (e.g., 1-5, 8, 10)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter chapter numbers')
    .setRequired(true);

  const pointInput = new TextInputBuilder()
    .setCustomId('pointInput')
    .setLabel('Point per Chapter (e.g., 1.5)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter point value')
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId('noteInput')
    .setLabel('Note (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter any optional context')
    .setRequired(false);

  // An action row only holds one text input, so you need one action row per input
  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(chaptersInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(pointInput);
  const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(noteInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  // 4. Show the modal
  await interaction.showModal(modal);
}
