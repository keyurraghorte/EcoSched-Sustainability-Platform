import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://tvhggpfpqzenwwcqwhuh.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_SeCGJyO8Y1YqbYoazoZmsQ_M9oWdEMV';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
