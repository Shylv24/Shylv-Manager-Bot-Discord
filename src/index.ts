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
import { loadStaffCache } from './utils/staff_cache.js';

// Import command handlers
import * as chDoneCommand from './commands/ch_done.js';
import * as deductCommand from './commands/deduct.js';
import * as staffStatCommand from './commands/staff_stat.js';
import * as helpCommand from './commands/help.js';
import * as staffAddCommand from './commands/staff_add.js';
import * as staffRemoveCommand from './commands/staff_remove.js';
import * as clearLogsCommand from './commands/clear_logs.js';

// ─── Command Registry ───
const commands = new Map<string, {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}>();

commands.set('ch_done', chDoneCommand);
commands.set('deduct', deductCommand);
commands.set('staff_stat', staffStatCommand);
commands.set('help', helpCommand);
commands.set('staff_add', staffAddCommand);
commands.set('staff_remove', staffRemoveCommand);
commands.set('clear_logs', clearLogsCommand);

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

// ─── Event: Interaction (Slash Commands) ───
client.on('interactionCreate', async (interaction: Interaction) => {
  // Only handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.warn(`⚠️ Unknown command: /${interaction.commandName}`);
    return;
  }

  // Log command usage
  const isDM = !interaction.guild;
  const location = isDM ? 'DM' : `Server: ${interaction.guild?.name}`;
  console.log(`📨 /${interaction.commandName} — by ${interaction.user.tag} (${location})`);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing /${interaction.commandName}:`, error);

    // Try to reply with error if we haven't already
    const errorMessage = 'An unexpected error occurred. Please try again.';
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch {
      // Can't respond to the interaction, just log it
      console.error('   Could not send error response to user.');
    }
  }
});

// ─── Graceful Shutdown ───
function shutdown(signal: string) {
  console.log(`\n🔴 Received ${signal}. Shutting down gracefully...`);
  client.destroy();
  console.log('👋 Bot disconnected. Goodbye!');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Start Bot ───
console.log('🔄 Starting Shylv Manager Bot...');
client.login(env.DISCORD_TOKEN);
