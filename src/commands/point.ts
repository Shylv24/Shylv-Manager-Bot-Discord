// ─── /point Command ─── Shylv Manager Bot ───
//
// Admin-only command to log completed chapters and add balance.
// Usage: /point user:@Staff chapters:1-5 point:1.5 [note:optional]
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { parseChapters } from '../utils/parser.js';
import { addChapterLog } from '../database/queries.js';
import { createChapterLogEmbed, createErrorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('point')
  .setDescription('Log completed chapters and reward a staff member.')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The staff member who completed the chapters')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('chapters')
      .setDescription('Chapter numbers (e.g., "13", "1-5", "1,3,6")')
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName('point')
      .setDescription('Point value per chapter (e.g., 1.5)')
      .setRequired(true)
      .setMinValue(0)
  )
  .addStringOption((option) =>
    option
      .setName('note')
      .setDescription('Optional context or notes')
      .setRequired(false)
  )
  .setDMPermission(true)
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You do not have administrative privileges to use this command.')],
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const chaptersInput = interaction.options.getString('chapters', true);
  const point = interaction.options.getNumber('point', true);
  const note = interaction.options.getString('note') || null;

  if (targetUser.bot) {
    await interaction.reply({
      embeds: [createErrorEmbed('Cannot log chapters for bot accounts.')],
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

  const parseResult = parseChapters(chaptersInput);
  if (!parseResult.success) {
    await interaction.reply({
      embeds: [createErrorEmbed(`Invalid chapter format provided: ${parseResult.error}`)],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const numChapters = parseResult.chapters.length;
    const totalPoint = point * numChapters;

    const result = await addChapterLog({
      staffDiscordId: targetUser.id,
      chapters: parseResult.chapters,
      point: totalPoint,
      note,
      loggedByDiscordId: interaction.user.id,
    });

    await interaction.editReply({
      embeds: [
        createChapterLogEmbed({
          staffUsername: result.staff.discord_username,
          staffDiscordId: targetUser.id,
          chapters: parseResult.chapters,
          point: point, // Fix: show point per chapter
          totalAdded: totalPoint,
          newBalance: Number(result.staff.balance),
          note,
        }),
      ],
    });
  } catch (error) {
    console.error('Error in /point:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An internal error occurred while processing the chapter log.')],
    });
  }
}
