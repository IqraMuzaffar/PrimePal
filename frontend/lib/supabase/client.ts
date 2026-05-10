import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client.
 * Used in Client Components for teacher auth (signInWithPassword, signOut, etc.)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
