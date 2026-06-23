// ─── Supabase Client ─── Shylv Manager Bot ───

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let supabaseInstance: SupabaseClient | null = null;

/** Get the singleton Supabase client */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}
