import { createClient } from "@supabase/supabase-js";

// Browser-safe client (anon key only)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
