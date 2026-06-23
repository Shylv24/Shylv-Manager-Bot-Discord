// ─── Slash Command Registration ─── Shylv Manager Bot ───
//
// Run this script ONCE to register slash commands with Discord:
//   bun run register
//
// Commands are registered GLOBALLY so they work in DMs.
// Note: Global commands can take up to 1 hour to propagate.
//

import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';

// Import command definitions
import { data as chDoneCommand } from './ch_done.js';
import { data as deductCommand } from './deduct.js';
import { data as staffStatCommand } from './staff_stat.js';
import { data as helpCommand } from './help.js';
import { data as staffAddCommand } from './staff_add.js';
import { data as staffRemoveCommand } from './staff_remove.js';
import { data as clearLogsCommand } from './clear_logs.js';

const commands = [
  chDoneCommand.toJSON(),
  deductCommand.toJSON(),
  staffStatCommand.toJSON(),
  helpCommand.toJSON(),
  staffAddCommand.toJSON(),
  staffRemoveCommand.toJSON(),
  clearLogsCommand.toJSON(),
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  try {
    console.log('🔄 Registering slash commands...');
    console.log(`   Commands: ${commands.map((c) => `/${c.name}`).join(', ')}`);

    await rest.put(
      Routes.applicationCommands(env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('✅ Successfully registered global slash commands!');
    console.log('');
    console.log('ℹ️  Note: Global commands can take up to 1 hour to appear in Discord.');
    console.log('   If they don\'t appear immediately, wait a bit and try again.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands();
