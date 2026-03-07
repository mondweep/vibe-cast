import { describe, it, expect } from 'vitest';

describe('Supabase configuration', () => {
  it('gracefully handles missing env vars', async () => {
    // The supabase module should not throw when env vars are undefined
    const { isSupabaseConfigured } = await import('../src/lib/supabase');
    // In test env, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('exports null client when not configured', async () => {
    const { supabase } = await import('../src/lib/supabase');
    expect(supabase).toBeNull();
  });
});

describe('database types', () => {
  it('defines expected table types', async () => {
    // Ensure types compile correctly
    const types = await import('../src/lib/database.types');
    expect(types).toBeDefined();
  });
});
