import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// If running on the server and a service role key is provided, use it (bypasses RLS).
// Otherwise, fallback to the anon key.
let clientOpts = null;
if (supabaseUrl) {
    if (typeof window === 'undefined' && supabaseServiceRoleKey) {
        clientOpts = createClient(supabaseUrl, supabaseServiceRoleKey);
    } else if (supabaseAnonKey) {
        clientOpts = createClient(supabaseUrl, supabaseAnonKey);
    }
}
export const supabase = clientOpts as any;
