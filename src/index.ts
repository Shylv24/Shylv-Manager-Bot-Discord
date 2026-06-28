// ─── Shylv Manager Bot ─── Entry Point ───
//
// Discord DM bot for scanlation team management.
// Tracks completed chapters and manages staff balance.
//
// Usage:
//   bun run dev       — Start with hot-reload (development)
//   bun run start     — Start in production mode
//   bun run register  — Register slash commands (run once)
//

import {
  Client,
  GatewayIntentBits,
  Partials,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';
import { env } from './config/env.js';
import { initDatabase, closeDatabase } from './database/sqlite.js';
import { loadStaffCache, isAdmin } from './utils/staff_cache.js';
import { parseChapters } from './utils/parser.js';
import { addChapterLog } from './database/queries.js';
import { createChapterLogEmbed, createErrorEmbed } from './utils/embeds.js';

import * as pointCommand from './commands/point.js';
import * as bonusCommand from './commands/bonus.js';
import * as deductCommand from './commands/deduct.js';
import * as staffStatCommand from './commands/staff_stat.js';
import * as helpCommand from './commands/help.js';
import * as staffAddCommand from './commands/staff_add.js';
import * as staffRemoveCommand from './commands/staff_remove.js';
import * as clearLogsCommand from './commands/clear_logs.js';
import * as contextLogCommand from './commands/context_log.js';
import * as staffListCommand from './commands/staff_list.js';

// ─── Command Registry ───
const commands = new Map<string, any>();

commands.set('point', pointCommand);
commands.set('bonus', bonusCommand);
commands.set('deduct', deductCommand);
commands.set('staff_stat', staffStatCommand);
commands.set('help', helpCommand);
commands.set('staff_add', staffAddCommand);
commands.set('staff_remove', staffRemoveCommand);
commands.set('clear_logs', clearLogsCommand);
commands.set('Log Points', contextLogCommand);
commands.set('staff_list', staffListCommand);

// ─── Discord Client ───
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [
    Partials.Channel,  // Required to receive DM events
    Partials.Message,
  ],
});

// ─── Event: Bot Ready ───
client.once('ready', async (readyClient) => {
  console.log('');
  console.log('========================================');
  console.log('  🤖 Shylv Manager Bot — Online!');
  console.log('========================================');
  console.log(`  Bot: ${readyClient.user.tag}`);
  console.log(`  ID:  ${readyClient.user.id}`);
  console.log(`  Servers: ${readyClient.guilds.cache.size}`);
  console.log('========================================');
  console.log('');

  // Initialize SQLite database
  try {
    initDatabase();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.error('   Bot cannot operate without a database. Shutting down.');
    process.exit(1);
  }

  // Load staff list from database to cache
  try {
    await loadStaffCache();
  } catch (error) {
    console.error('❌ Failed to load staff list:', error);
    console.error('   Bot will continue running, but permissions may fail until database is accessible.');
  }

  console.log('');
  console.log('🟢 Bot is ready! Waiting for commands...');
  console.log('   Users can DM the bot to use slash commands.');
  console.log('');
});

// ─── Event: Interaction ───
client.on('interactionCreate', async (interaction: Interaction) => {
  if (interaction.isChatInputCommand() || interaction.isUserContextMenuCommand()) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      console.warn(`⚠️ Unknown command: /${interaction.commandName}`);
      return;
    }

    const isDM = !interaction.guild;
    const location = isDM ? 'DM' : `Server: ${interaction.guild?.name}`;
    console.log(`📨 /${interaction.commandName} — by ${interaction.user.tag} (${location})`);

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing /${interaction.commandName}:`, error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      try {
        if (interaction.isRepliable()) {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage });
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
          }
        }
      } catch (e) {
        console.error('   Could not send error response to user.');
      }
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('log_points_modal_')) {
      // Verify admin permission (the context menu checks too, but this prevents crafted submissions)
      if (!isAdmin(interaction.user.id)) {
        await interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
        return;
      }

      const targetUserId = interaction.customId.replace('log_points_modal_', '');
      const chaptersInput = interaction.fields.getTextInputValue('chaptersInput');
      const pointInput = interaction.fields.getTextInputValue('pointInput');
      const noteInput = interaction.fields.getTextInputValue('noteInput') || null;

      const point = parseFloat(pointInput);

      if (isNaN(point) || point < 0) {
        await interaction.reply({ content: 'Invalid point value.', ephemeral: true });
        return;
      }

      // We handle the rest using the logic from point command
      const parseResult = parseChapters(chaptersInput);
      if (!parseResult.success) {
        await interaction.reply({ embeds: [createErrorEmbed(`Invalid chapter format: ${parseResult.error}`)], ephemeral: true });
        return;
      }

      await interaction.deferReply();

      try {
        const numChapters = parseResult.chapters.length;
        const totalPoint = point * numChapters;

        const result = await addChapterLog({
          staffDiscordId: targetUserId,
          chapters: parseResult.chapters,
          point: totalPoint,
          note: noteInput,
          loggedByDiscordId: interaction.user.id,
        });

        await interaction.editReply({
          embeds: [
            createChapterLogEmbed({
              staffUsername: result.staff.discord_username,
              staffDiscordId: targetUserId,
              chapters: parseResult.chapters,
              point: point, // Fix: show point per chapter
              totalAdded: totalPoint,
              newBalance: Number(result.staff.balance),
              note: noteInput,
            }),
          ],
        });
      } catch (error) {
        console.error('Error in ModalSubmit:', error);
        await interaction.editReply({ embeds: [createErrorEmbed('An internal error occurred.')] });
      }
    }
  }
});

// ─── Graceful Shutdown ───
function shutdown(signal: string) {
  console.log(`\n🔴 Received ${signal}. Shutting down gracefully...`);
  client.destroy();
  closeDatabase();
  console.log('👋 Bot disconnected. Goodbye!');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Start Bot ───
console.log('🔄 Starting Shylv Manager Bot...');
client.login(env.DISCORD_TOKEN);
