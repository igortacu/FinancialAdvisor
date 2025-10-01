import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Set EXPO_PUBLIC_SUPABASE_URL in your environment.');
}
if (!supabaseAnonKey) {
  throw new Error('Missing Supabase anon key. Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
