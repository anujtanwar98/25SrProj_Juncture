import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'url';
const SUPABASE_KEY = 'anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
