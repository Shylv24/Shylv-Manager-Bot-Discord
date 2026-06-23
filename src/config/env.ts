// ─── Environment Configuration ─── Shylv Manager Bot ───

interface EnvConfig {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${name}`);
    console.error(`   Please check your .env file. See .env.example for reference.`);
    process.exit(1);
  }
  return value;
}

/** Validated environment configuration — fails fast if any required var is missing */
export const env: EnvConfig = {
  DISCORD_TOKEN: getEnvVar('DISCORD_TOKEN'),
  DISCORD_CLIENT_ID: getEnvVar('DISCORD_CLIENT_ID'),
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY'),
};
