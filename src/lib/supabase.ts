import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function initSupabase() {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("Supabase credentials not configured - using localStorage only");
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

export function getSupabase() {
  return initSupabase();
}
