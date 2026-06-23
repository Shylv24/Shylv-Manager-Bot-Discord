// ─── /ch_done Command ─── Shylv Manager Bot ───
//
// Admin-only command to log completed chapters and add balance.
// Usage: /ch_done user:@Staff chapters:1-5 point:1.5 bonus:0.5 [note:optional]
//

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { isAdmin, isRegistered } from '../utils/staff_cache.js';
import { parseChapters } from '../utils/parser.js';
import { addChapterLog } from '../database/queries.js';
import { createChapterLogEmbed, createErrorEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('ch_done')
  .setDescription('Log completed chapters and add balance to a staff member')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The staff member who completed the chapters')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('chapters')
      .setDescription('Chapter numbers: "13", "1-5", "1,3,6", "1-3,6,8-10"')
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName('point')
      .setDescription('Point value for this work (e.g. 1.5)')
      .setRequired(true)
      .setMinValue(0)
  )
  .addNumberOption((option) =>
    option
      .setName('bonus')
      .setDescription('Bonus value (e.g. 0.5)')
      .setRequired(true)
      .setMinValue(0)
  )
  .addStringOption((option) =>
    option
      .setName('note')
      .setDescription('Optional note or context')
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

  // 2. Get options
  const targetUser = interaction.options.getUser('user', true);
  const chaptersInput = interaction.options.getString('chapters', true);
  const point = interaction.options.getNumber('point', true);
  const bonus = interaction.options.getNumber('bonus', true);
  const note = interaction.options.getString('note') || null;

  // 3. Validate target user is not a bot
  if (targetUser.bot) {
    await interaction.reply({
      embeds: [createErrorEmbed('Cannot log chapters for a bot.')],
      ephemeral: true,
    });
    return;
  }

  // 4. Validate target user is registered
  if (!isRegistered(targetUser.id)) {
    await interaction.reply({
      embeds: [createErrorEmbed(`<@${targetUser.id}> is not a registered staff member. Please add them to the staff config first.`)],
      ephemeral: true,
    });
    return;
  }

  // 5. Parse chapters
  const parseResult = parseChapters(chaptersInput);
  if (!parseResult.success) {
    await interaction.reply({
      embeds: [createErrorEmbed(`Invalid chapter format: ${parseResult.error}`)],
      ephemeral: true,
    });
    return;
  }

  // 6. Defer reply (database operations may take a moment)
  await interaction.deferReply();

  try {
    // 7. Calculate totals based on number of chapters
    const numChapters = parseResult.chapters.length;
    const totalPoint = point * numChapters;
    const totalBonus = bonus * numChapters;
    const totalAdded = totalPoint + totalBonus;

    // 8. Add chapter log and update balance
    const result = await addChapterLog({
      staffDiscordId: targetUser.id,
      chapters: parseResult.chapters,
      point: totalPoint,
      bonus: totalBonus,
      note,
      loggedByDiscordId: interaction.user.id,
    });

    // 9. Reply with success embed
    await interaction.editReply({
      embeds: [
        createChapterLogEmbed({
          staffUsername: result.staff.discord_username,
          staffDiscordId: targetUser.id,
          chapters: parseResult.chapters,
          point: totalPoint,
          bonus: totalBonus,
          totalAdded,
          newBalance: Number(result.staff.balance),
          note,
        }),
      ],
    });
  } catch (error) {
    console.error('Error in /ch_done:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while logging the chapters. Please try again.')],
    });
  }
}
